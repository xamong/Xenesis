const BOT_EVENT_TYPES = new Set(['session', 'message', 'stream', 'final', 'status', 'error']);
const BOT_MESSAGE_ROLES = new Set(['user', 'assistant', 'system']);
const BOT_PANEL_PLACEMENTS = new Set(['tab', 'left', 'right', 'top', 'bottom']);
const BOT_CHANNELS = new Set(['hermes', 'telegram', 'slack', 'discord', 'webhook', 'agent', 'server', 'external']);
const BOT_ARTIFACT_MARKER_RE = /<!--\s*xenesis-artifacts:([A-Za-z0-9+/=]+)\s*-->/g;
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

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanEventType(value) {
  const type = cleanString(value).toLowerCase();
  return BOT_EVENT_TYPES.has(type) ? type : 'message';
}

function cleanRole(value, type) {
  const role = cleanString(value).toLowerCase();
  if (BOT_MESSAGE_ROLES.has(role)) return role;
  if (type === 'error' || type === 'status') return 'system';
  if (type === 'message') return 'assistant';
  return 'assistant';
}

function cleanPlacement(value) {
  const placement = cleanString(value);
  return BOT_PANEL_PLACEMENTS.has(placement) ? placement : undefined;
}

function cleanBotChannel(value) {
  const text = cleanString(value).toLowerCase();
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

function cleanStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(cleanString).filter(Boolean);
}

function cleanStringMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    const cleanKey = cleanString(key);
    const cleanValue = cleanString(item);
    if (cleanKey && cleanValue) output[cleanKey] = cleanValue;
  }
  return output;
}

function cleanApprovalUi(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const title = cleanString(value.title);
  const subjectLabel = cleanString(value.subjectLabel || value.subject_label);
  const reasonLabel = cleanString(value.reasonLabel || value.reason_label);
  const choices = cleanStringArray(value.choices);
  const buttonLabels = cleanStringMap(value.buttonLabels || value.button_labels);
  const approvalUi = {};
  if (title) approvalUi.title = title;
  if (subjectLabel) approvalUi.subjectLabel = subjectLabel;
  if (reasonLabel) approvalUi.reasonLabel = reasonLabel;
  if (choices.length) approvalUi.choices = choices;
  if (Object.keys(buttonLabels).length) approvalUi.buttonLabels = buttonLabels;
  return Object.keys(approvalUi).length ? approvalUi : undefined;
}

function basenameFromPath(value) {
  const text = cleanString(value);
  if (!text) return '';
  const parts = text.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) || text;
}

function cleanBotArtifacts(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const title = cleanString(item.title || item.name || item.fileName || item.file_name);
      const kind = cleanString(item.kind || item.type || item.format);
      const filePath = cleanString(item.filePath || item.file_path || item.path);
      const openCommand = cleanString(item.openCommand || item.open_command || item.command);
      const focusCommand = cleanString(item.focusCommand || item.focus_command);
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
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
    const cleanValue = cleanString(value[key]);
    if (cleanValue) output[key] = cleanValue;
  }
  const rawCount = Number(value.workPacketItemCount);
  if (Number.isFinite(rawCount) && rawCount >= 0) {
    output.workPacketItemCount = Math.trunc(rawCount);
  }
  const artifactFormats = cleanStringArray(value.artifactFormats || value.artifact_formats);
  if (artifactFormats.length) output.artifactFormats = artifactFormats;
  return Object.keys(output).length ? output : undefined;
}

function decodeArtifactMarker(value) {
  try {
    const decoded = Buffer.from(String(value || ''), 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return cleanBotArtifacts(parsed);
  } catch {
    return [];
  }
}

function extractBotArtifactMarkers(value) {
  if (typeof value !== 'string' || !value.includes('xenesis-artifacts:')) {
    return { text: typeof value === 'string' ? value : '', artifacts: [] };
  }
  const artifacts = [];
  const text = value
    .replace(BOT_ARTIFACT_MARKER_RE, (_match, encoded) => {
      artifacts.push(...decodeArtifactMarker(encoded));
      return '';
    })
    .trimEnd();
  return { text, artifacts };
}

function botMessageMetadata(event) {
  return {
    ...(event.approvalUi ? { approvalUi: event.approvalUi } : {}),
    ...(event.artifacts?.length ? { artifacts: event.artifacts } : {}),
    ...(event.xenesis_desk ? { xenesis_desk: event.xenesis_desk } : {}),
  };
}

function defaultMessageId(sessionId, type, role, at) {
  const millis = Date.parse(at);
  const stamp = Number.isFinite(millis) ? String(millis) : String(Date.now());
  return `${sessionId}-${type}-${role}-${stamp}`;
}

export function normalizeBotBridgeEvent(raw, options = {}) {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const type = cleanEventType(input.type);
  const at = cleanString(input.at) || cleanString(options.now) || new Date().toISOString();
  const sessionId = cleanString(input.sessionId) || 'xenesis-bot';
  const role = cleanRole(input.role, type);
  const messageId = cleanString(input.messageId) || defaultMessageId(sessionId, type, role, at);
  const source = cleanString(input.source);
  const channel = cleanBotChannel(input.channel || input.channelName || input.channel_name || source);
  const content = extractBotArtifactMarkers(input.content);
  const delta = extractBotArtifactMarkers(input.delta);
  const event = {
    type,
    sessionId,
    messageId,
    role,
    delta: delta.text,
    content: content.text,
    title: cleanString(input.title),
    source,
    status: cleanString(input.status),
    inputUrl: cleanString(input.inputUrl),
    at,
  };
  if (channel) event.channel = channel;
  const placement = cleanPlacement(input.placement);
  if (placement) event.placement = placement;
  const approvalUi = cleanApprovalUi(input.approvalUi || input.approval_ui);
  if (approvalUi) event.approvalUi = approvalUi;
  const artifacts = cleanBotArtifacts([
    ...cleanBotArtifacts(input.artifacts),
    ...content.artifacts,
    ...delta.artifacts,
  ]);
  if (artifacts.length) event.artifacts = artifacts;
  const xenesisDesk = cleanXenisMetadata(input.xenesis_desk || input.xd || input.xenis);
  if (xenesisDesk) event.xenesis_desk = xenesisDesk;
  return event;
}

export function createBotBridgeState() {
  return {
    sessions: new Map(),
  };
}

function ensureSession(state, event) {
  if (!state || typeof state !== 'object') {
    throw new Error('Bot bridge state is required');
  }
  if (!(state.sessions instanceof Map)) {
    state.sessions = new Map();
  }
  const existing = state.sessions.get(event.sessionId);
  if (existing) return existing;
  const session = {
    id: event.sessionId,
    title: event.title || 'Xenesis Bot',
    source: event.source || '',
    channel: event.channel || '',
    status: 'ready',
    inputUrl: event.inputUrl || '',
    placement: event.placement,
    updatedAt: event.at,
    messages: [],
  };
  state.sessions.set(event.sessionId, session);
  return session;
}

function sameBotValue(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function setChangedField(target, key, value) {
  if (value === undefined || sameBotValue(target[key], value)) return false;
  target[key] = value;
  return true;
}

function setChangedNonEmptyField(target, key, value) {
  return value ? setChangedField(target, key, value) : false;
}

function hasMessageFieldChanges(message, fields) {
  return Object.entries(fields).some(([key, value]) => !sameBotValue(message[key], value));
}

function upsertMessage(session, event, fields) {
  let message = session.messages.find((item) => item.id === event.messageId);
  let changed = false;
  if (!message) {
    message = {
      id: event.messageId,
      role: fields.role || event.role,
      content: '',
      streaming: false,
      createdAt: event.at,
      updatedAt: event.at,
    };
    session.messages.push(message);
    changed = true;
  }
  if (hasMessageFieldChanges(message, fields)) {
    Object.assign(message, fields, { updatedAt: event.at });
    changed = true;
  } else if (changed) {
    Object.assign(message, fields);
  }
  return { message, changed };
}

function isActiveBotStatus(status) {
  return ACTIVE_BOT_STATUSES.has(cleanString(status).toLowerCase());
}

function clearStreamingMessages(session) {
  let changed = false;
  for (const message of session.messages) {
    if (message.streaming) {
      message.streaming = false;
      changed = true;
    }
  }
  return changed;
}

function finishBotBridgeEvent(session, event, changed) {
  if (changed) session.updatedAt = event.at;
  return session;
}

export function applyBotBridgeEvent(state, event) {
  const normalized = normalizeBotBridgeEvent(event);
  const sessionExists = state?.sessions instanceof Map && state.sessions.has(normalized.sessionId);
  const session = ensureSession(state, normalized);
  let changed = !sessionExists;
  changed = setChangedNonEmptyField(session, 'title', normalized.title) || changed;
  changed = setChangedNonEmptyField(session, 'source', normalized.source) || changed;
  changed = setChangedNonEmptyField(session, 'channel', normalized.channel) || changed;
  changed = setChangedNonEmptyField(session, 'inputUrl', normalized.inputUrl) || changed;
  changed = setChangedNonEmptyField(session, 'placement', normalized.placement) || changed;

  if (normalized.type === 'session') {
    changed = setChangedNonEmptyField(session, 'status', normalized.status) || changed;
    return finishBotBridgeEvent(session, normalized, changed);
  }

  if (normalized.type === 'status') {
    changed = setChangedField(session, 'status', normalized.status || normalized.content || 'ready') || changed;
    if (!isActiveBotStatus(session.status)) {
      changed = clearStreamingMessages(session) || changed;
    }
    return finishBotBridgeEvent(session, normalized, changed);
  }

  if (normalized.type === 'error') {
    changed = setChangedField(session, 'status', 'error') || changed;
    changed = clearStreamingMessages(session) || changed;
    const result = upsertMessage(session, normalized, {
      role: 'system',
      content: normalized.content || normalized.delta || 'Xenesis Bot bridge error',
      streaming: false,
    });
    changed = result.changed || changed;
    return finishBotBridgeEvent(session, normalized, changed);
  }

  if (normalized.type === 'stream') {
    const current = session.messages.find((item) => item.id === normalized.messageId);
    const content = normalized.delta
      ? `${current?.content || normalized.content || ''}${normalized.delta}`
      : normalized.content || current?.content || '';
    const result = upsertMessage(session, normalized, {
      role: 'assistant',
      content,
      streaming: true,
      ...botMessageMetadata(normalized),
    });
    changed = result.changed || changed;
    changed = setChangedField(session, 'status', normalized.status || 'streaming') || changed;
    return finishBotBridgeEvent(session, normalized, changed);
  }

  if (normalized.type === 'final') {
    const current = session.messages.find((item) => item.id === normalized.messageId);
    changed = clearStreamingMessages(session) || changed;
    const result = upsertMessage(session, normalized, {
      role: normalized.role,
      content: normalized.content || `${current?.content || ''}${normalized.delta}`,
      streaming: false,
      ...botMessageMetadata(normalized),
    });
    changed = result.changed || changed;
    const finalStatus = normalized.status && !isActiveBotStatus(normalized.status) ? normalized.status : 'completed';
    changed = setChangedField(session, 'status', finalStatus) || changed;
    return finishBotBridgeEvent(session, normalized, changed);
  }

  const result = upsertMessage(session, normalized, {
    role: normalized.role,
    content: normalized.content || normalized.delta,
    streaming: false,
    ...botMessageMetadata(normalized),
  });
  changed = result.changed || changed;
  if (normalized.status) {
    changed = setChangedField(session, 'status', normalized.status) || changed;
    if (!isActiveBotStatus(session.status)) {
      changed = clearStreamingMessages(session) || changed;
    }
  } else if (normalized.type === 'message' && result.message.role === 'assistant') {
    changed = clearStreamingMessages(session) || changed;
    changed = setChangedField(result.message, 'streaming', false) || changed;
    changed = setChangedField(session, 'status', 'completed') || changed;
  }
  return finishBotBridgeEvent(session, normalized, changed);
}
