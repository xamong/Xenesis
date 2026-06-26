import type {
  McpBridgeBotApprovalUi,
  McpBridgeBotArtifact,
  McpBridgeBotChannelName,
  McpBridgeBotEvent,
  McpBridgeBotRole,
  McpBridgeBotSession,
  McpBridgeBotXenisMetadata,
} from '../../../shared/types';
import { recordRendererPerformanceTrace } from '../../utils/performanceTrace';

export interface XenisBotMessage {
  id: string;
  role: McpBridgeBotRole;
  content: string;
  approvalUi?: McpBridgeBotApprovalUi;
  artifacts?: McpBridgeBotArtifact[];
  xenesis_desk?: McpBridgeBotXenisMetadata;
  streaming: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface XenisBotSession {
  id: string;
  title: string;
  source: string;
  channel?: McpBridgeBotChannelName;
  status: string;
  inputUrl: string;
  updatedAt: string;
  messages: XenisBotMessage[];
}

type SessionListener = (session: XenisBotSession) => void;
type SessionsListener = (sessions: XenisBotSession[]) => void;

const DEFAULT_SESSION_ID = 'xenesis-bot';
const DEFAULT_INPUT_URL = 'http://127.0.0.1:3859/message';
const ACTIVE_BOT_STATUSES = new Set([
  'sent',
  'queued',
  'pending',
  'running',
  'thinking',
  'working',
  'streaming',
  'typing',
]);
const BOT_CHANNELS = new Set<McpBridgeBotChannelName>([
  'hermes',
  'telegram',
  'slack',
  'discord',
  'webhook',
  'agent',
  'server',
  'external',
]);
const sessions = new Map<string, XenisBotSession>();
const listeners = new Map<string, Set<SessionListener>>();
const allSessionsListeners = new Set<SessionsListener>();
const persistTimers = new Map<string, number>();
const BOT_STREAM_EMIT_INTERVAL_MS = 120;
const queuedStreamEvents = new Map<string, McpBridgeBotEvent>();
const queuedStreamEventTimers = new Map<string, number>();
let hydrationPromise: Promise<XenisBotSession[]> | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function cleanBotChannel(value?: string): McpBridgeBotChannelName | undefined {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!text) return undefined;
  const compact = text.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (BOT_CHANNELS.has(text as McpBridgeBotChannelName)) return text as McpBridgeBotChannelName;
  if (BOT_CHANNELS.has(compact as McpBridgeBotChannelName)) return compact as McpBridgeBotChannelName;
  if (/\bhermes\b/.test(text)) return 'hermes';
  if (/\btelegram\b|\btg\b/.test(text)) return 'telegram';
  if (/\bslack\b/.test(text)) return 'slack';
  if (/\bdiscord\b/.test(text)) return 'discord';
  if (/\bwebhook\b|\bweb-hook\b/.test(text)) return 'webhook';
  if (/\bagent\b|\bcli\b/.test(text)) return 'agent';
  if (/\bserver\b|\bgateway\b/.test(text)) return 'server';
  return 'external';
}

function nextId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneXenisMetadata(metadata?: McpBridgeBotXenisMetadata): McpBridgeBotXenisMetadata | undefined {
  if (!metadata) return undefined;
  const clone: McpBridgeBotXenisMetadata = { ...metadata };
  if (metadata.artifactFormats) {
    clone.artifactFormats = [...metadata.artifactFormats];
  } else {
    delete clone.artifactFormats;
  }
  return clone;
}

function cloneSession(session: XenisBotSession): XenisBotSession {
  return {
    ...session,
    messages: session.messages.map((message) => ({
      ...message,
      approvalUi: message.approvalUi
        ? {
            ...message.approvalUi,
            choices: message.approvalUi.choices ? [...message.approvalUi.choices] : undefined,
            buttonLabels: message.approvalUi.buttonLabels ? { ...message.approvalUi.buttonLabels } : undefined,
          }
        : undefined,
      artifacts: message.artifacts?.map((artifact) => ({ ...artifact })),
      xenesis_desk: cloneXenisMetadata(message.xenesis_desk),
    })),
  };
}

function isActiveBotStatus(status: string): boolean {
  return ACTIVE_BOT_STATUSES.has(status.trim().toLowerCase());
}

function sameBotValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

type XenisBotSessionTextField = 'title' | 'source' | 'channel' | 'status' | 'inputUrl';

function setChangedSessionField<K extends XenisBotSessionTextField>(
  session: XenisBotSession,
  key: K,
  value: NonNullable<XenisBotSession[K]>,
): boolean {
  if (sameBotValue(session[key], value)) return false;
  session[key] = value as XenisBotSession[K];
  return true;
}

function setChangedNonEmptySessionField<K extends XenisBotSessionTextField>(
  session: XenisBotSession,
  key: K,
  value?: NonNullable<XenisBotSession[K]>,
): boolean {
  return value ? setChangedSessionField(session, key, value) : false;
}

function hasMessageFieldChanges(message: XenisBotMessage, fields: Partial<XenisBotMessage>): boolean {
  return Object.entries(fields).some(([key, value]) => !sameBotValue(message[key as keyof XenisBotMessage], value));
}

function clearStreamingMessages(session: XenisBotSession): boolean {
  let changed = false;
  for (const message of session.messages) {
    if (message.streaming) {
      message.streaming = false;
      changed = true;
    }
  }
  return changed;
}

function finishRecordXenisBotEvent(session: XenisBotSession, at: string, changed: boolean): XenisBotSession {
  if (!changed) return cloneSession(session);
  session.updatedAt = at;
  emitSession(session);
  return cloneSession(session);
}

function streamEventKey(sessionId: string, messageId: string): string {
  return `${sessionId.trim() || DEFAULT_SESSION_ID}\n${messageId.trim()}`;
}

function mergeQueuedStreamEvent(previous: McpBridgeBotEvent | undefined, next: McpBridgeBotEvent): McpBridgeBotEvent {
  if (!previous) return next;
  const mergedDelta = previous.delta && next.delta ? `${previous.delta}${next.delta}` : next.delta || previous.delta;
  return {
    ...previous,
    ...next,
    delta: mergedDelta,
    content: next.content || (next.delta ? previous.content : '') || previous.content,
    approvalUi: next.approvalUi ?? previous.approvalUi,
    artifacts: next.artifacts?.length ? next.artifacts : previous.artifacts,
    xenesis_desk: next.xenesis_desk ?? previous.xenesis_desk,
  };
}

function queueXenisBotStreamEvent(event: McpBridgeBotEvent): XenisBotSession {
  if (typeof window === 'undefined') {
    return applyXenisBotEventNow(event);
  }

  const id = event.sessionId.trim() || DEFAULT_SESSION_ID;
  const key = streamEventKey(id, event.messageId);
  queuedStreamEvents.set(key, mergeQueuedStreamEvent(queuedStreamEvents.get(key), event));
  recordRendererPerformanceTrace({
    scope: 'xdbot',
    action: 'stream-queued',
    details: {
      sessionId: id,
      messageId: event.messageId,
      deltaChars: event.delta?.length ?? 0,
      contentChars: event.content?.length ?? 0,
      queuedStreams: queuedStreamEvents.size,
    },
  });

  if (!queuedStreamEventTimers.has(key)) {
    const timer = window.setTimeout(() => {
      flushQueuedXenisBotStreamEvents(id, event.messageId);
    }, BOT_STREAM_EMIT_INTERVAL_MS);
    queuedStreamEventTimers.set(key, timer);
  }

  return getXenisBotSession(id);
}

export function flushQueuedXenisBotStreamEvents(sessionId?: string, messageId?: string): void {
  const normalizedSessionId = sessionId?.trim();
  const normalizedMessageId = messageId?.trim();
  const keys = [...queuedStreamEvents.keys()].filter((key) => {
    const [queuedSessionId, queuedMessageId] = key.split('\n');
    return (
      (!normalizedSessionId || queuedSessionId === normalizedSessionId) &&
      (!normalizedMessageId || queuedMessageId === normalizedMessageId)
    );
  });

  for (const key of keys) {
    const timer = queuedStreamEventTimers.get(key);
    if (timer !== undefined && typeof window !== 'undefined') {
      window.clearTimeout(timer);
    }
    queuedStreamEventTimers.delete(key);
    const event = queuedStreamEvents.get(key);
    queuedStreamEvents.delete(key);
    if (event) {
      recordRendererPerformanceTrace({
        scope: 'xdbot',
        action: 'stream-flushed',
        details: {
          sessionId: event.sessionId.trim() || DEFAULT_SESSION_ID,
          messageId: event.messageId,
          deltaChars: event.delta?.length ?? 0,
          contentChars: event.content?.length ?? 0,
          queuedStreams: queuedStreamEvents.size,
        },
      });
      applyXenisBotEventNow(event);
    }
  }
}

function normalizeLoadedSession(session: McpBridgeBotSession): XenisBotSession | null {
  const id = typeof session.id === 'string' && session.id.trim() ? session.id.trim() : '';
  if (!id) return null;
  const updatedAt =
    typeof session.updatedAt === 'string' && session.updatedAt.trim() ? session.updatedAt.trim() : nowIso();
  const restoredSession: XenisBotSession = {
    id,
    title: typeof session.title === 'string' && session.title.trim() ? session.title.trim() : 'Xenesis Bot',
    source: typeof session.source === 'string' ? session.source : '',
    ...(cleanBotChannel(session.channel || session.source)
      ? { channel: cleanBotChannel(session.channel || session.source) }
      : {}),
    status: typeof session.status === 'string' && session.status.trim() ? session.status.trim() : 'ready',
    inputUrl:
      typeof session.inputUrl === 'string' && session.inputUrl.trim() ? session.inputUrl.trim() : DEFAULT_INPUT_URL,
    updatedAt,
    messages: Array.isArray(session.messages)
      ? session.messages.map((message) => ({
          id: typeof message.id === 'string' && message.id.trim() ? message.id.trim() : nextId('restored'),
          role: message.role,
          content: typeof message.content === 'string' ? message.content : '',
          ...(message.approvalUi ? { approvalUi: message.approvalUi } : {}),
          ...(message.artifacts?.length ? { artifacts: message.artifacts } : {}),
          ...(message.xenesis_desk ? { xenesis_desk: cloneXenisMetadata(message.xenesis_desk) } : {}),
          streaming: message.streaming === true,
          createdAt:
            typeof message.createdAt === 'string' && message.createdAt.trim() ? message.createdAt.trim() : updatedAt,
          updatedAt:
            typeof message.updatedAt === 'string' && message.updatedAt.trim() ? message.updatedAt.trim() : updatedAt,
        }))
      : [],
  };
  if (!isActiveBotStatus(restoredSession.status)) {
    clearStreamingMessages(restoredSession);
  }
  return restoredSession;
}

export function getXenisBotSession(sessionId = DEFAULT_SESSION_ID): XenisBotSession {
  const id = sessionId.trim() || DEFAULT_SESSION_ID;
  const existing = sessions.get(id);
  if (existing) return cloneSession(existing);
  const createdAt = nowIso();
  const session: XenisBotSession = {
    id,
    title: 'Xenesis Bot',
    source: '',
    status: 'ready',
    inputUrl: DEFAULT_INPUT_URL,
    updatedAt: createdAt,
    messages: [],
  };
  sessions.set(id, session);
  return cloneSession(session);
}

function getMutableSession(sessionId: string): XenisBotSession {
  getXenisBotSession(sessionId);
  return sessions.get(sessionId.trim() || DEFAULT_SESSION_ID)!;
}

export function persistXenisBotSession(session: XenisBotSession): void {
  if (typeof window === 'undefined' || !window.mcpBridgeAPI?.saveBotSession) return;
  const snapshot = cloneSession(session) as McpBridgeBotSession;
  const existingTimer = persistTimers.get(snapshot.id);
  if (existingTimer !== undefined) window.clearTimeout(existingTimer);
  const timer = window.setTimeout(() => {
    persistTimers.delete(snapshot.id);
    void window.mcpBridgeAPI?.saveBotSession(snapshot).catch(() => undefined);
  }, 150);
  persistTimers.set(snapshot.id, timer);
}

function emitSession(session: XenisBotSession, options: { persist?: boolean } = {}): void {
  const snapshot = cloneSession(session);
  listeners.get(session.id)?.forEach((listener) => listener(snapshot));
  const allSessionsSnapshot = getXenisBotSessionsSnapshot();
  allSessionsListeners.forEach((listener) => listener(allSessionsSnapshot));
  if (options.persist !== false) persistXenisBotSession(session);
}

function upsertMessage(
  session: XenisBotSession,
  messageId: string,
  fields: Partial<XenisBotMessage> & Pick<XenisBotMessage, 'role'>,
  at: string,
): { message: XenisBotMessage; changed: boolean } {
  let message = session.messages.find((item) => item.id === messageId);
  let changed = false;
  if (!message) {
    message = {
      id: messageId,
      role: fields.role,
      content: '',
      streaming: false,
      createdAt: at,
      updatedAt: at,
    };
    session.messages.push(message);
    changed = true;
  }
  if (hasMessageFieldChanges(message, fields)) {
    Object.assign(message, fields, { updatedAt: at });
    changed = true;
  } else if (changed) {
    Object.assign(message, fields);
  }
  return { message, changed };
}

export function subscribeXenisBotSession(sessionId: string, listener: SessionListener): () => void {
  const id = sessionId.trim() || DEFAULT_SESSION_ID;
  const set = listeners.get(id) ?? new Set<SessionListener>();
  set.add(listener);
  listeners.set(id, set);
  listener(getXenisBotSession(id));
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(id);
  };
}

export function getXenisBotSessionsSnapshot(): XenisBotSession[] {
  return [...sessions.values()].map(cloneSession).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function subscribeXenisBotSessions(listener: SessionsListener): () => void {
  allSessionsListeners.add(listener);
  listener(getXenisBotSessionsSnapshot());
  return () => {
    allSessionsListeners.delete(listener);
  };
}

export function hydrateXenisBotSessions(): Promise<XenisBotSession[]> {
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    if (typeof window === 'undefined' || !window.mcpBridgeAPI?.listBotSessions) {
      return getXenisBotSessionsSnapshot();
    }
    const loadedSessions = await window.mcpBridgeAPI.listBotSessions();
    for (const loaded of loadedSessions) {
      const session = normalizeLoadedSession(loaded);
      if (!session) continue;
      const existing = sessions.get(session.id);
      if (existing && existing.messages.length && existing.updatedAt.localeCompare(session.updatedAt) > 0) {
        continue;
      }
      sessions.set(session.id, cloneSession(session));
      emitSession(sessions.get(session.id)!, { persist: false });
    }
    return getXenisBotSessionsSnapshot();
  })().catch(() => getXenisBotSessionsSnapshot());
  return hydrationPromise;
}

export function recordXenisBotEvent(event: McpBridgeBotEvent): XenisBotSession {
  const id = event.sessionId.trim() || DEFAULT_SESSION_ID;
  if (event.type === 'stream') {
    return queueXenisBotStreamEvent(event);
  }
  if (event.type === 'final') {
    flushQueuedXenisBotStreamEvents(id, event.messageId);
  }
  if (event.type === 'error') {
    flushQueuedXenisBotStreamEvents(id);
  }
  if (event.type === 'status' && !isActiveBotStatus(event.status || event.content)) {
    flushQueuedXenisBotStreamEvents(id);
  }
  return applyXenisBotEventNow(event);
}

function applyXenisBotEventNow(event: McpBridgeBotEvent): XenisBotSession {
  const id = event.sessionId.trim() || DEFAULT_SESSION_ID;
  const isNewSession = !sessions.has(id);
  const session = getMutableSession(id);
  let changed = isNewSession;
  changed = setChangedNonEmptySessionField(session, 'title', event.title) || changed;
  changed = setChangedNonEmptySessionField(session, 'source', event.source) || changed;
  changed =
    setChangedNonEmptySessionField(session, 'channel', event.channel || cleanBotChannel(event.source)) || changed;
  changed = setChangedNonEmptySessionField(session, 'inputUrl', event.inputUrl) || changed;

  if (event.type === 'session') {
    changed = setChangedNonEmptySessionField(session, 'status', event.status) || changed;
    return finishRecordXenisBotEvent(session, event.at, changed);
  }

  if (event.type === 'status') {
    changed = setChangedSessionField(session, 'status', event.status || event.content || 'ready') || changed;
    if (!isActiveBotStatus(session.status)) {
      changed = clearStreamingMessages(session) || changed;
    }
    return finishRecordXenisBotEvent(session, event.at, changed);
  }

  if (event.type === 'error') {
    changed = setChangedSessionField(session, 'status', 'error') || changed;
    changed = clearStreamingMessages(session) || changed;
    const result = upsertMessage(
      session,
      event.messageId,
      {
        role: 'system',
        content: event.content || event.delta || 'Xenesis Bot bridge error',
        ...(event.xenesis_desk ? { xenesis_desk: cloneXenisMetadata(event.xenesis_desk) } : {}),
        streaming: false,
      },
      event.at,
    );
    changed = result.changed || changed;
    return finishRecordXenisBotEvent(session, event.at, changed);
  }

  if (event.type === 'stream') {
    const current = session.messages.find((item) => item.id === event.messageId);
    const content = event.delta
      ? `${current?.content || event.content || ''}${event.delta}`
      : event.content || current?.content || '';
    const result = upsertMessage(
      session,
      event.messageId,
      {
        role: 'assistant',
        content,
        ...(event.approvalUi ? { approvalUi: event.approvalUi } : {}),
        ...(event.artifacts?.length ? { artifacts: event.artifacts } : {}),
        ...(event.xenesis_desk ? { xenesis_desk: cloneXenisMetadata(event.xenesis_desk) } : {}),
        streaming: true,
      },
      event.at,
    );
    changed = result.changed || changed;
    changed = setChangedSessionField(session, 'status', event.status || 'streaming') || changed;
    return finishRecordXenisBotEvent(session, event.at, changed);
  }

  if (event.type === 'final') {
    const current = session.messages.find((item) => item.id === event.messageId);
    changed = clearStreamingMessages(session) || changed;
    const result = upsertMessage(
      session,
      event.messageId,
      {
        role: event.role,
        content: event.content || `${current?.content || ''}${event.delta}`,
        ...(event.approvalUi ? { approvalUi: event.approvalUi } : {}),
        ...(event.artifacts?.length ? { artifacts: event.artifacts } : {}),
        ...(event.xenesis_desk ? { xenesis_desk: cloneXenisMetadata(event.xenesis_desk) } : {}),
        streaming: false,
      },
      event.at,
    );
    changed = result.changed || changed;
    changed = setChangedSessionField(session, 'status', event.status || 'completed') || changed;
    return finishRecordXenisBotEvent(session, event.at, changed);
  }

  const result = upsertMessage(
    session,
    event.messageId,
    {
      role: event.role,
      content: event.content || event.delta,
      ...(event.approvalUi ? { approvalUi: event.approvalUi } : {}),
      ...(event.artifacts?.length ? { artifacts: event.artifacts } : {}),
      ...(event.xenesis_desk ? { xenesis_desk: cloneXenisMetadata(event.xenesis_desk) } : {}),
      streaming: false,
    },
    event.at,
  );
  changed = result.changed || changed;
  if (event.status) {
    changed = setChangedSessionField(session, 'status', event.status) || changed;
    if (!isActiveBotStatus(session.status)) {
      changed = clearStreamingMessages(session) || changed;
    }
  } else if (event.type === 'message' && result.message.role === 'assistant') {
    changed = clearStreamingMessages(session) || changed;
    if (result.message.streaming) {
      result.message.streaming = false;
      changed = true;
    }
    changed = setChangedSessionField(session, 'status', 'completed') || changed;
  }
  return finishRecordXenisBotEvent(session, event.at, changed);
}

export function recordXenisBotLocalMessage(
  sessionId: string,
  content: string,
  xenesisDesk?: McpBridgeBotXenisMetadata,
): XenisBotMessage {
  const at = nowIso();
  const session = getMutableSession(sessionId);
  const result = upsertMessage(
    session,
    nextId('user'),
    {
      role: 'user',
      content,
      ...(xenesisDesk ? { xenesis_desk: cloneXenisMetadata(xenesisDesk) } : {}),
      streaming: false,
    },
    at,
  );
  session.status = 'sent';
  session.updatedAt = at;
  emitSession(session);
  return { ...result.message };
}
