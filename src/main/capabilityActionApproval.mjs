import crypto from 'node:crypto';

const CAPABILITY_APPROVAL_KIND = 'capability-approval';
const CAPABILITY_APPROVAL_COMMAND_TYPE = 'desk-capability-call';

function cleanText(value, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort()
    .reduce((next, key) => {
      next[key] = stableJson(value[key]);
      return next;
    }, {});
}

export function createCapabilityApprovalCommand({ path, args, source } = {}) {
  return JSON.stringify({
    type: CAPABILITY_APPROVAL_COMMAND_TYPE,
    path: cleanText(path, 300),
    args: args === undefined ? undefined : stableJson(args),
    source: cleanText(source, 80) || 'mcp',
  });
}

export function createCapabilityApprovalAllowKey({ path, args, source } = {}) {
  const normalizedPath = cleanText(path, 300);
  const normalizedSource = cleanText(source, 80) || 'mcp';
  const stablePayload = JSON.stringify({
    source: normalizedSource,
    path: normalizedPath,
    args: args === undefined ? undefined : stableJson(args),
  });
  const digest = crypto.createHash('sha256').update(stablePayload).digest('hex').slice(0, 32);
  return `capability-always:${normalizedSource}:${normalizedPath}:${digest}`;
}

export function parseCapabilityApprovalCommand(command) {
  const parsed = JSON.parse(String(command || ''));
  const record = asRecord(parsed);
  if (record.type !== CAPABILITY_APPROVAL_COMMAND_TYPE) {
    throw new Error('Action inbox item is not a capability approval command.');
  }
  const path = cleanText(record.path, 300);
  if (!path) throw new Error('Capability approval command is missing path.');
  return {
    type: CAPABILITY_APPROVAL_COMMAND_TYPE,
    path,
    args: record.args,
    source: cleanText(record.source, 80) || 'mcp',
  };
}

export function createCapabilityApprovalRequest({ path, args, source, result } = {}) {
  const normalizedPath = cleanText(path || result?.path, 300);
  const normalizedSource = cleanText(source || result?.source, 80) || 'mcp';
  const permission = cleanText(result?.permission, 80) || 'control';
  const error = cleanText(result?.error, 1000) || `Capability requires approval: ${normalizedPath}`;
  return {
    id: `capability-${normalizedSource}-${normalizedPath}`.replace(/[^a-zA-Z0-9_.:-]+/g, '-'),
    title: `Approve Xenesis Desk capability: ${normalizedPath}`,
    kind: CAPABILITY_APPROVAL_KIND,
    command: createCapabilityApprovalCommand({ path: normalizedPath, args, source: normalizedSource }),
    description: error,
    source: 'Xenesis Desk Capability Registry',
    sessionId: 'xenesis-capability',
    approvalSessionKey: `capability:${normalizedSource}:${normalizedPath}`,
    requester: normalizedSource,
    risk: permission,
    callbackUrl: '',
    approveText: `Approve ${normalizedPath}`,
    rejectText: `Reject ${normalizedPath}`,
  };
}

export function isCapabilityApprovalItem(item) {
  return asRecord(item).kind === CAPABILITY_APPROVAL_KIND;
}
