import fs from 'node:fs';
import path from 'node:path';

const BOT_MESSAGE_ROLES = new Set(['user', 'assistant', 'system']);
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
const BOT_CHANNELS = new Set(['hermes', 'telegram', 'slack', 'discord', 'webhook', 'agent', 'server', 'external']);
const MAX_PERSISTED_BOT_SESSIONS = 50;
const MAX_PERSISTED_BOT_MESSAGES = 200;

function cleanText(value, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanRole(value) {
  const role = cleanText(value, 40).toLowerCase();
  return BOT_MESSAGE_ROLES.has(role) ? role : 'assistant';
}

function cleanBoolean(value) {
  return value === true;
}

function cleanBotChannel(value) {
  const text = cleanText(value, 200).toLowerCase();
  if (!text) return '';
  const compact = text.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (BOT_CHANNELS.has(text)) return text;
  if (BOT_CHANNELS.has(compact)) return compact;
  if (/\bhermes\b/.test(text)) return 'hermes';
  if (/\btelegram\b|\btg\b/.test(text)) return 'telegram';
  if (/\bslack\b/.test(text)) return 'slack';
  if (/\bdiscord\b/.test(text)) return 'discord';
  if (/\bwebhook\b|\bweb-hook\b/.test(text)) return 'webhook';
  if (/\bagent\b|\bcli\b/.test(text)) return 'agent';
  if (/\bserver\b|\bgateway\b/.test(text)) return 'server';
  return 'external';
}

function basenameFromPath(value) {
  const text = cleanText(value);
  if (!text) return '';
  const parts = text.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) || text;
}

function cleanStringArray(value, maxLength = 200) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(item, maxLength)).filter(Boolean);
}

function cleanStringMap(value, maxLength = 200) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    const cleanKey = cleanText(key, maxLength);
    const cleanValue = cleanText(item, maxLength);
    if (cleanKey && cleanValue) output[cleanKey] = cleanValue;
  }
  return output;
}

function cleanApprovalUi(value) {
  const input = asRecord(value);
  const title = cleanText(input.title, 200);
  const subjectLabel = cleanText(input.subjectLabel || input.subject_label, 200);
  const reasonLabel = cleanText(input.reasonLabel || input.reason_label, 200);
  const choices = cleanStringArray(input.choices);
  const buttonLabels = cleanStringMap(input.buttonLabels || input.button_labels);
  const approvalUi = {};
  if (title) approvalUi.title = title;
  if (subjectLabel) approvalUi.subjectLabel = subjectLabel;
  if (reasonLabel) approvalUi.reasonLabel = reasonLabel;
  if (choices.length) approvalUi.choices = choices;
  if (Object.keys(buttonLabels).length) approvalUi.buttonLabels = buttonLabels;
  return Object.keys(approvalUi).length ? approvalUi : undefined;
}

function cleanBotArtifacts(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const input = asRecord(item);
      const title = cleanText(input.title || input.name || input.fileName || input.file_name, 300);
      const kind = cleanText(input.kind || input.type || input.format, 100);
      const filePath = cleanText(input.filePath || input.file_path || input.path, 1000);
      const openCommand = cleanText(input.openCommand || input.open_command || input.command, 1000);
      const focusCommand = cleanText(input.focusCommand || input.focus_command, 1000);
      if (!filePath && !openCommand) return null;
      return {
        title: title || basenameFromPath(filePath) || kind || 'Artifact',
        ...(kind ? { kind } : {}),
        ...(filePath ? { filePath } : {}),
        ...(openCommand ? { openCommand } : {}),
        ...(focusCommand ? { focusCommand } : {}),
      };
    })
    .filter(Boolean);
}

function cleanXenisMetadata(value) {
  const input = asRecord(value);
  const output = {};
  for (const key of [
    'surface',
    'mode',
    'sourceMessageId',
    'packetCommand',
    'artifactAction',
    'artifactTitle',
    'artifactPath',
  ]) {
    const cleanValue = cleanText(input[key], 1000);
    if (cleanValue) output[key] = cleanValue;
  }
  const rawCount = Number(input.workPacketItemCount);
  if (Number.isFinite(rawCount) && rawCount >= 0) {
    output.workPacketItemCount = Math.trunc(rawCount);
  }
  const artifactFormats = cleanStringArray(input.artifactFormats || input.artifact_formats);
  if (artifactFormats.length) output.artifactFormats = artifactFormats;
  return Object.keys(output).length ? output : undefined;
}

function defaultMessageId(sessionId, role, at, index) {
  const stamp = Date.parse(at);
  return `${sessionId}-${role}-${Number.isFinite(stamp) ? stamp : Date.now()}-${index}`;
}

function normalizeBotMessage(raw, sessionId, index, fallbackAt) {
  const input = asRecord(raw);
  const at = cleanText(input.updatedAt || input.createdAt || fallbackAt, 80) || new Date().toISOString();
  const role = cleanRole(input.role);
  const id = cleanText(input.id || input.messageId, 200) || defaultMessageId(sessionId, role, at, index);
  const message = {
    id,
    role,
    content: cleanText(input.content, 20000),
    streaming: cleanBoolean(input.streaming),
    createdAt: cleanText(input.createdAt || at, 80) || at,
    updatedAt: at,
  };
  const approvalUi = cleanApprovalUi(input.approvalUi || input.approval_ui);
  if (approvalUi) message.approvalUi = approvalUi;
  const artifacts = cleanBotArtifacts(input.artifacts);
  if (artifacts.length) message.artifacts = artifacts;
  const xenesisDesk = cleanXenisMetadata(input.xenesis_desk || input.xd || input.xenis);
  if (xenesisDesk) message.xenesis_desk = xenesisDesk;
  return message;
}

function isActiveBotStatus(status) {
  return ACTIVE_BOT_STATUSES.has(cleanText(status, 80).toLowerCase());
}

function clearStreamingMessages(messages) {
  for (const message of messages) {
    if (message.streaming) message.streaming = false;
  }
}

export function normalizeMcpBotSession(raw, options = {}) {
  const input = asRecord(raw);
  const updatedAt = cleanText(input.updatedAt || options.now, 80) || new Date().toISOString();
  const id = cleanText(input.id || input.sessionId, 200) || 'xenesis-bot';
  const rawMessages = Array.isArray(input.messages) ? input.messages : [];
  const messages = rawMessages
    .map((message, index) => normalizeBotMessage(message, id, index, updatedAt))
    .filter((message) => message.content || message.approvalUi || message.artifacts?.length)
    .slice(-MAX_PERSISTED_BOT_MESSAGES);
  const status = cleanText(input.status, 80) || 'ready';
  const source = cleanText(input.source, 200);
  const channel = cleanBotChannel(input.channel || input.channelName || input.channel_name || source);
  if (!isActiveBotStatus(status)) {
    clearStreamingMessages(messages);
  }
  return {
    id,
    title: cleanText(input.title, 300) || 'Xenesis Bot',
    source,
    ...(channel ? { channel } : {}),
    status,
    inputUrl: cleanText(input.inputUrl || input.callbackUrl, 1000),
    updatedAt,
    messages,
  };
}

function cloneSession(session) {
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
      xenesis_desk: message.xenesis_desk
        ? {
            ...message.xenesis_desk,
            artifactFormats: message.xenesis_desk.artifactFormats
              ? [...message.xenesis_desk.artifactFormats]
              : undefined,
          }
        : undefined,
    })),
  };
}

export function createMcpBotSessionsState() {
  return {
    sessions: new Map(),
  };
}

export function applyMcpBotSession(state, raw, options = {}) {
  if (!state || typeof state !== 'object') {
    throw new Error('Bot sessions state is required');
  }
  if (!(state.sessions instanceof Map)) {
    state.sessions = new Map();
  }
  const session = normalizeMcpBotSession(raw, options);
  state.sessions.set(session.id, session);
  return cloneSession(session);
}

export function listMcpBotSessions(state, options = {}) {
  if (!state || !(state.sessions instanceof Map)) return [];
  const rawLimit = Number(options.limit);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.trunc(rawLimit), MAX_PERSISTED_BOT_SESSIONS)
      : MAX_PERSISTED_BOT_SESSIONS;
  return [...state.sessions.values()]
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, limit)
    .map(cloneSession);
}

export function persistMcpBotSessionsState(state, filePath, options = {}) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Bot sessions store path is required');
  }
  const sessions = listMcpBotSessions(state, { limit: options.limit || MAX_PERSISTED_BOT_SESSIONS });
  const payload = {
    version: 1,
    savedAt: cleanText(options.now, 80) || new Date().toISOString(),
    sessions,
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

export function loadMcpBotSessionsStateFromFile(state, filePath, options = {}) {
  if (!state || typeof state !== 'object') {
    throw new Error('Bot sessions state is required');
  }
  if (!(state.sessions instanceof Map)) {
    state.sessions = new Map();
  }
  if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) {
    return { loaded: false, count: 0 };
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const rawSessions = Array.isArray(parsed) ? parsed : parsed?.sessions;
  if (!Array.isArray(rawSessions)) {
    return { loaded: false, count: 0 };
  }
  let count = 0;
  for (const rawSession of rawSessions) {
    applyMcpBotSession(state, rawSession, options);
    count += 1;
  }
  return { loaded: true, count };
}
