import fs from 'node:fs';
import path from 'node:path';

const ACTION_INBOX_STATUSES = new Set(['pending', 'approved', 'rejected', 'failed', 'expired']);
const ACTION_INBOX_RESOLUTIONS = new Set(['approve', 'reject']);
const ACTION_INBOX_RESOLVED_STATUSES = new Set(['approved', 'rejected', 'failed', 'expired']);
const DEFAULT_ACTION_INBOX_TTL_MS = 5 * 60 * 1000;
const MAX_PERSISTED_ACTION_INBOX_ITEMS = 100;
const EXPIRED_MESSAGE = 'Approval request expired before it was resolved.';

function cleanText(value, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanStatus(value) {
  const status = cleanText(value, 40).toLowerCase();
  return ACTION_INBOX_STATUSES.has(status) ? status : 'pending';
}

function cleanResolution(value) {
  const resolution = cleanText(value, 40).toLowerCase();
  return ACTION_INBOX_RESOLUTIONS.has(resolution) ? resolution : '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstClean(input, names, maxLength = 1000) {
  for (const name of names) {
    const value = cleanText(input[name], maxLength);
    if (value) return value;
  }
  return '';
}

function hasAny(input, names) {
  return names.some((name) => Object.hasOwn(input, name));
}

function isoFromMillis(millis) {
  return Number.isFinite(millis) ? new Date(millis).toISOString() : '';
}

function defaultExpiresAt(createdAt, ttlMs) {
  const ttl = Number(ttlMs);
  if (!Number.isFinite(ttl) || ttl <= 0) return '';
  const createdMillis = Date.parse(createdAt);
  return isoFromMillis((Number.isFinite(createdMillis) ? createdMillis : Date.now()) + ttl);
}

function defaultId(command, at) {
  const seed = `${command || 'action'}-${at || new Date().toISOString()}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  return `xd-action-${Math.abs(hash).toString(16)}-${Date.parse(at) || Date.now()}`;
}

function cloneItem(item) {
  return { ...item };
}

function findExistingByApprovalSessionKey(state, approvalSessionKey) {
  if (!approvalSessionKey || !(state.items instanceof Map)) return undefined;
  return [...state.items.values()]
    .filter((item) => item.approvalSessionKey === approvalSessionKey)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];
}

export function normalizeMcpActionInboxRequest(raw, options = {}) {
  const input = asRecord(raw);
  const at = cleanText(input.at || input.updatedAt || input.createdAt || options.now, 80) || new Date().toISOString();
  const createdAt = cleanText(input.createdAt || at, 80) || at;
  const command = cleanText(input.command || input.subject, 4000);
  const id = cleanText(input.id || input.requestId || input.messageId, 160) || defaultId(command, at);
  const explicitExpiresAt = cleanText(input.expiresAt || input.expires_at || options.expiresAt, 80);
  const expiresAt = explicitExpiresAt || defaultExpiresAt(createdAt, options.ttlMs ?? DEFAULT_ACTION_INBOX_TTL_MS);
  return {
    id,
    title: cleanText(input.title, 300) || 'Hermes Action Request',
    kind: cleanText(input.kind || input.type, 80) || 'approval',
    command,
    description: cleanText(input.description || input.reason, 4000),
    source: cleanText(input.source, 160) || 'Hermes Gateway',
    sessionId: cleanText(input.sessionId || input.chatId, 160) || 'xenesis-bot',
    approvalSessionKey: cleanText(input.approvalSessionKey || input.approval_session_key, 300),
    requester: cleanText(input.requester || input.userName || input.userId, 160),
    risk: cleanText(input.risk, 80),
    status: cleanStatus(input.status),
    callbackUrl: cleanText(input.callbackUrl || input.inputUrl || input.callback_url, 1000),
    approveText: cleanText(input.approveText || input.approveCommand || input.approve_text, 1000) || '/approve once',
    rejectText: cleanText(input.rejectText || input.rejectCommand || input.reject_text, 1000) || '/deny',
    createdAt,
    updatedAt: at,
    expiresAt,
    resolvedAt: cleanText(input.resolvedAt, 80),
    lastCallbackAt: cleanText(input.lastCallbackAt || input.callbackAt || input.callback_at, 80),
    result: cleanText(input.result, 4000),
    error: cleanText(input.error, 4000),
  };
}

export function createMcpActionInboxState() {
  return {
    items: new Map(),
  };
}

export function applyMcpActionInboxRequest(state, raw, options = {}) {
  if (!state || typeof state !== 'object') {
    throw new Error('Action inbox state is required');
  }
  if (!(state.items instanceof Map)) {
    state.items = new Map();
  }
  const input = asRecord(raw);
  const item = normalizeMcpActionInboxRequest(raw, options);
  const explicitId = firstClean(input, ['id', 'requestId', 'messageId'], 160);
  const existing = state.items.get(item.id) || findExistingByApprovalSessionKey(state, item.approvalSessionKey);
  const statusWasProvided = hasAny(input, ['status']);
  const nextStatus = statusWasProvided ? item.status : existing?.status || item.status;
  const resolvedAt = nextStatus === 'pending' ? '' : item.resolvedAt || existing?.resolvedAt || item.updatedAt;
  const incomingExpiresAt = firstClean(input, ['expiresAt', 'expires_at'], 80) || cleanText(options.expiresAt, 80);
  const stored = {
    id: explicitId || existing?.id || item.id,
    title: firstClean(input, ['title'], 300) || existing?.title || item.title,
    kind: firstClean(input, ['kind', 'type'], 80) || existing?.kind || item.kind,
    command: firstClean(input, ['command', 'subject'], 4000) || existing?.command || item.command,
    description: firstClean(input, ['description', 'reason'], 4000) || existing?.description || item.description,
    source: firstClean(input, ['source'], 160) || existing?.source || item.source,
    sessionId: firstClean(input, ['sessionId', 'chatId'], 160) || existing?.sessionId || item.sessionId,
    approvalSessionKey:
      firstClean(input, ['approvalSessionKey', 'approval_session_key'], 300) ||
      existing?.approvalSessionKey ||
      item.approvalSessionKey,
    requester: firstClean(input, ['requester', 'userName', 'userId'], 160) || existing?.requester || item.requester,
    risk: firstClean(input, ['risk'], 80) || existing?.risk || item.risk,
    status: nextStatus,
    callbackUrl:
      firstClean(input, ['callbackUrl', 'inputUrl', 'callback_url'], 1000) || existing?.callbackUrl || item.callbackUrl,
    approveText:
      firstClean(input, ['approveText', 'approveCommand', 'approve_text'], 1000) ||
      existing?.approveText ||
      item.approveText,
    rejectText:
      firstClean(input, ['rejectText', 'rejectCommand', 'reject_text'], 1000) ||
      existing?.rejectText ||
      item.rejectText,
    createdAt: existing?.createdAt || item.createdAt,
    updatedAt: item.updatedAt,
    expiresAt: incomingExpiresAt || existing?.expiresAt || item.expiresAt,
    resolvedAt,
    lastCallbackAt:
      firstClean(input, ['lastCallbackAt', 'callbackAt', 'callback_at'], 80) ||
      existing?.lastCallbackAt ||
      item.lastCallbackAt,
    result: firstClean(input, ['result'], 4000) || existing?.result || item.result,
    error:
      firstClean(input, ['error'], 4000) ||
      (nextStatus === 'expired' ? existing?.error || EXPIRED_MESSAGE : existing?.error || item.error),
  };
  state.items.set(stored.id, stored);
  return cloneItem(stored);
}

export function listMcpActionInboxItems(state, options = {}) {
  if (!state || !(state.items instanceof Map)) return [];
  const includeResolved = options.includeResolved !== false;
  const rawLimit = Number(options.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.trunc(rawLimit), 100) : 50;
  return [...state.items.values()]
    .filter((item) => includeResolved || item.status === 'pending')
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, limit)
    .map(cloneItem);
}

export function markExpiredMcpActionInboxItems(state, options = {}) {
  if (!state || !(state.items instanceof Map)) return [];
  const now = cleanText(options.now, 80) || new Date().toISOString();
  const nowMillis = Date.parse(now);
  if (!Number.isFinite(nowMillis)) return [];
  const expired = [];
  for (const [id, item] of state.items) {
    if (item.status !== 'pending') continue;
    const expiresMillis = Date.parse(item.expiresAt || '');
    if (!Number.isFinite(expiresMillis) || expiresMillis > nowMillis) continue;
    const updated = {
      ...item,
      status: 'expired',
      updatedAt: now,
      resolvedAt: now,
      error: item.error || EXPIRED_MESSAGE,
    };
    state.items.set(id, updated);
    expired.push(cloneItem(updated));
  }
  return expired;
}

export function resolveMcpActionInboxItem(state, raw, options = {}) {
  if (!state || !(state.items instanceof Map)) {
    return { ok: false, error: 'Action inbox state is not available' };
  }
  const input = asRecord(raw);
  const id = cleanText(input.id, 160);
  if (!id) return { ok: false, error: 'id is required' };
  const item = state.items.get(id);
  if (!item) return { ok: false, error: `Action request not found: ${id}` };
  if (item.status !== 'pending') {
    return { ok: false, item: cloneItem(item), error: `Action request is ${item.status}` };
  }

  const resolution = cleanResolution(input.resolution);
  if (!resolution) return { ok: false, error: 'resolution must be approve or reject' };
  const at = cleanText(input.at || options.now, 80) || new Date().toISOString();
  const status = resolution === 'approve' ? 'approved' : 'rejected';
  const updated = {
    ...item,
    status,
    updatedAt: at,
    resolvedAt: at,
    lastCallbackAt:
      cleanText(input.lastCallbackAt || input.callbackAt || input.callback_at, 80) || item.lastCallbackAt || at,
    result: cleanText(input.result, 4000) || item.result || '',
    error: cleanText(input.error, 4000) || '',
  };
  state.items.set(id, updated);
  return { ok: true, item: cloneItem(updated) };
}

export function clearResolvedMcpActionInboxItems(state) {
  if (!state || !(state.items instanceof Map)) return [];
  for (const [id, item] of state.items) {
    if (item.status !== 'pending') state.items.delete(id);
  }
  return listMcpActionInboxItems(state);
}

export function persistMcpActionInboxState(state, filePath, options = {}) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Action inbox store path is required');
  }
  const items = listMcpActionInboxItems(state, {
    includeResolved: true,
    limit: options.limit || MAX_PERSISTED_ACTION_INBOX_ITEMS,
  });
  const payload = {
    version: 1,
    savedAt: cleanText(options.now, 80) || new Date().toISOString(),
    items,
  };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

export function loadMcpActionInboxStateFromFile(state, filePath, options = {}) {
  if (!state || typeof state !== 'object') {
    throw new Error('Action inbox state is required');
  }
  if (!(state.items instanceof Map)) {
    state.items = new Map();
  }
  if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) {
    return { loaded: false, count: 0 };
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const rawItems = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(rawItems)) {
    return { loaded: false, count: 0 };
  }
  let count = 0;
  for (const rawItem of rawItems) {
    applyMcpActionInboxRequest(state, rawItem, options);
    count += 1;
  }
  return { loaded: true, count };
}
