import type { XenesisAgentState, XenesisChatMessage, XenesisRawStreamEntry } from './xenesisAgentTypes';

export interface XenesisAgentBridgeSummary {
  agentId: string;
  id: string;
  title: string;
  workspace?: string;
  provider?: string;
  status?: string;
  running?: boolean;
  lastActivityAt?: string;
}

export interface XenesisAgentBridgeEvent {
  id: string;
  agentId: string;
  kind: 'assistant_final' | 'error' | 'status';
  text: string;
  externalSafe: boolean;
  at: string;
}

export interface XenesisAgentBridgeRawEvent {
  id: string;
  agentId: string;
  kind: string;
  summary: string;
  detail?: string;
  error?: boolean;
  externalSafe: false;
  at: string;
}

export interface XenesisAgentBridgeRegistration {
  agentId: string;
  title?: string;
  provider?: string;
  getSnapshot(): XenesisAgentState;
  submitMessage(text: string): Promise<unknown> | unknown;
  listEvents?(options?: {
    sinceEventId?: string;
    limit?: number;
  }): Promise<XenesisAgentBridgeEvent[]> | XenesisAgentBridgeEvent[];
}

export interface XenesisDeskAgentBridge {
  listAgents(): XenesisAgentBridgeSummary[];
  list(): XenesisAgentBridgeSummary[];
  getAgentStatus(agentId: string): XenesisAgentBridgeSummary | { ok: false; error: string };
  status(agentId: string): XenesisAgentBridgeSummary | { ok: false; error: string };
  submitAgentMessage(
    agentId: string,
    text: string,
  ): Promise<{ ok: boolean; event?: XenesisAgentBridgeEvent; error?: string }>;
  submitMessage(
    agentId: string,
    text: string,
  ): Promise<{ ok: boolean; event?: XenesisAgentBridgeEvent; error?: string }>;
  listAgentEvents(
    agentId: string,
    options?: { sinceEventId?: string; limit?: number },
  ): Promise<{ ok: boolean; events: XenesisAgentBridgeEvent[]; error?: string }>;
  listEvents(
    agentId: string,
    options?: { sinceEventId?: string; limit?: number },
  ): Promise<{ ok: boolean; events: XenesisAgentBridgeEvent[]; error?: string }>;
  listAgentRawEvents(
    agentId: string,
    options?: { sinceEventId?: string; limit?: number },
  ): { ok: boolean; events: XenesisAgentBridgeRawEvent[]; error?: string };
  listRawEvents(
    agentId: string,
    options?: { sinceEventId?: string; limit?: number },
  ): { ok: boolean; events: XenesisAgentBridgeRawEvent[]; error?: string };
}

declare global {
  interface Window {
    __xenesisDeskAgentBridge?: XenesisDeskAgentBridge;
  }
}

const registrations = new Map<string, XenesisAgentBridgeRegistration>();

export function createXenesisPaneAgentId(contentId?: string): string {
  const source = (contentId || 'xenesis-agent').trim() || 'xenesis-agent';
  const safe =
    source
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'xenesis-agent';
  return safe.startsWith('xenis-') ? safe : `xenis-${safe}`;
}

export function registerXenesisAgentBridgeAgent(registration: XenesisAgentBridgeRegistration): () => void {
  registrations.set(registration.agentId, registration);
  if (typeof window !== 'undefined') installXenesisDeskAgentBridge();
  return () => {
    const current = registrations.get(registration.agentId);
    if (current === registration) registrations.delete(registration.agentId);
  };
}

export function installXenesisDeskAgentBridge(
  target: Pick<Window, '__xenesisDeskAgentBridge'> = window,
): XenesisDeskAgentBridge {
  const bridge = createXenesisDeskAgentBridge();
  target.__xenesisDeskAgentBridge = bridge;
  return bridge;
}

function createXenesisDeskAgentBridge(): XenesisDeskAgentBridge {
  return {
    listAgents: () => listAgentSummaries(),
    list: () => listAgentSummaries(),
    getAgentStatus: (agentId: string) => getAgentStatus(agentId),
    status: (agentId: string) => getAgentStatus(agentId),
    submitAgentMessage: (agentId: string, text: string) => submitAgentMessage(agentId, text),
    submitMessage: (agentId: string, text: string) => submitAgentMessage(agentId, text),
    listAgentEvents: (agentId: string, options?: { sinceEventId?: string; limit?: number }) =>
      listAgentEvents(agentId, options),
    listEvents: (agentId: string, options?: { sinceEventId?: string; limit?: number }) =>
      listAgentEvents(agentId, options),
    listAgentRawEvents: (agentId: string, options?: { sinceEventId?: string; limit?: number }) =>
      listAgentRawEvents(agentId, options),
    listRawEvents: (agentId: string, options?: { sinceEventId?: string; limit?: number }) =>
      listAgentRawEvents(agentId, options),
  };
}

function listAgentSummaries(): XenesisAgentBridgeSummary[] {
  return [...registrations.values()].map(summaryFromRegistration);
}

function getAgentStatus(agentId: string): XenesisAgentBridgeSummary | { ok: false; error: string } {
  const registration = registrations.get(agentId);
  if (!registration) return { ok: false, error: `Xenesis Agent not found: ${agentId}` };
  return summaryFromRegistration(registration);
}

async function submitAgentMessage(
  agentId: string,
  text: string,
): Promise<{ ok: boolean; event?: XenesisAgentBridgeEvent; error?: string }> {
  const registration = registrations.get(agentId);
  if (!registration) return { ok: false, error: `Xenesis Agent not found: ${agentId}` };
  const trimmed = String(text || '').trim();
  if (!trimmed) return { ok: false, error: 'text is required' };
  try {
    await registration.submitMessage(trimmed);
    return {
      ok: true,
      event: {
        id: `external-submit-${Date.now()}`,
        agentId,
        kind: 'status',
        text: `Submitted external message to ${agentId}.`,
        externalSafe: false,
        at: new Date().toISOString(),
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function listAgentEvents(
  agentId: string,
  options: { sinceEventId?: string; limit?: number } = {},
): Promise<{ ok: boolean; events: XenesisAgentBridgeEvent[]; error?: string }> {
  const registration = registrations.get(agentId);
  if (!registration) return { ok: false, events: [], error: `Xenesis Agent not found: ${agentId}` };
  try {
    const events = registration.listEvents
      ? await registration.listEvents(options)
      : defaultAgentEvents(registration, options);
    return { ok: true, events };
  } catch (error) {
    return {
      ok: false,
      events: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function summaryFromRegistration(registration: XenesisAgentBridgeRegistration): XenesisAgentBridgeSummary {
  const snapshot = registration.getSnapshot();
  const status = snapshot.status;
  const latestMessage = snapshot.messages[0];
  return {
    agentId: registration.agentId,
    id: registration.agentId,
    title: registration.title || 'Xenesis Agent',
    workspace: status?.workspace,
    provider: registration.provider,
    status: snapshot.running ? 'Running' : statusTextFromSnapshot(snapshot),
    running: snapshot.running,
    lastActivityAt: latestMessage?.at,
  };
}

function statusTextFromSnapshot(snapshot: XenesisAgentState): string {
  if (snapshot.error) return 'Error';
  if (snapshot.loading) return 'Loading';
  if (snapshot.status?.ok) return 'Ready';
  if (snapshot.status?.running) return 'Starting';
  if (snapshot.status?.enabled === false) return 'Disabled';
  return 'Idle';
}

function defaultAgentEvents(
  registration: XenesisAgentBridgeRegistration,
  options: { sinceEventId?: string; limit?: number },
): XenesisAgentBridgeEvent[] {
  const snapshot = registration.getSnapshot();
  const assistantMessages = snapshot.messages
    .filter(isFinalAssistantMessage)
    .slice()
    .reverse()
    .map((message) => messageToAgentEvent(registration.agentId, message));
  const sinceIndex = options.sinceEventId
    ? assistantMessages.findIndex((event) => event.id === options.sinceEventId)
    : -1;
  const start = sinceIndex >= 0 ? sinceIndex + 1 : 0;
  const limit =
    Number.isInteger(options.limit) && options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 50;
  return assistantMessages.slice(start).slice(-limit);
}

function listAgentRawEvents(
  agentId: string,
  options: { sinceEventId?: string; limit?: number } = {},
): { ok: boolean; events: XenesisAgentBridgeRawEvent[]; error?: string } {
  const registration = registrations.get(agentId);
  if (!registration) return { ok: false, events: [], error: `Xenesis Agent not found: ${agentId}` };
  const snapshot = registration.getSnapshot();
  const rawEvents = snapshot.rawStream.map((entry) => rawStreamEntryToBridgeEvent(agentId, entry)).reverse();
  const sinceIndex = options.sinceEventId ? rawEvents.findIndex((event) => event.id === options.sinceEventId) : -1;
  const start = sinceIndex >= 0 ? sinceIndex + 1 : 0;
  const limit =
    Number.isInteger(options.limit) && options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 50;
  return { ok: true, events: rawEvents.slice(start).slice(-limit) };
}

function isFinalAssistantMessage(message: XenesisChatMessage): boolean {
  return message.role === 'assistant' && !message.streaming && !message.error && Boolean(message.content.trim());
}

function rawStreamEntryToBridgeEvent(agentId: string, entry: XenesisRawStreamEntry): XenesisAgentBridgeRawEvent {
  return {
    id: entry.id,
    agentId,
    kind: entry.kind,
    summary: entry.summary,
    ...(entry.detail ? { detail: entry.detail } : {}),
    ...(entry.error !== undefined ? { error: entry.error } : {}),
    externalSafe: false,
    at: entry.at,
  };
}

function messageToAgentEvent(agentId: string, message: XenesisChatMessage): XenesisAgentBridgeEvent {
  return {
    id: message.id,
    agentId,
    kind: 'assistant_final',
    text: message.content,
    externalSafe: true,
    at: message.at,
  };
}
