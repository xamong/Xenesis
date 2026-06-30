const PERSISTENCE_TOOL_PATTERN = /(?:write|edit|patch|delete|remove|move|rename|mkdir|rmdir|create|save|apply)/i;

function cleanText(value, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function parseJsonRecord(value) {
  const text = cleanText(value, 8000);
  if (!text) return {};
  try {
    return asRecord(JSON.parse(text));
  } catch {
    return {};
  }
}

function normalizeRisk(value) {
  const risk = cleanText(value, 40).toLowerCase();
  if (risk === 'low' || risk === 'medium' || risk === 'high' || risk === 'critical') return risk;
  return 'unknown';
}

function normalizePermission(value, fallback = 'control') {
  return cleanText(value, 40).toLowerCase() || fallback;
}

function normalizeStatus(value) {
  const status = cleanText(value, 40).toLowerCase();
  return ['pending', 'approved', 'rejected', 'failed', 'expired'].includes(status) ? status : 'pending';
}

function runtimeCommandPayload(request) {
  return JSON.stringify({
    type: 'xenesis-runtime-tool',
    toolCallId: cleanText(request?.toolCallId, 160),
    approvalId: cleanText(request?.approvalId, 160),
    name: cleanText(request?.name, 200),
    input: request?.input ?? null,
    reason: cleanText(request?.reason, 1000),
    summary: cleanText(request?.summary, 1000),
    riskLevel: cleanText(request?.riskLevel, 80),
  });
}

function approvalIdFromRuntimeRequest(request, now) {
  const explicit = cleanText(request?.approvalId, 160) || cleanText(request?.toolCallId, 160);
  if (explicit) return `xenesis-runtime-${explicit}`;
  return `xenesis-runtime-${Date.parse(now) || Date.now()}`;
}

function shouldAutoDenyPersistence(request, context) {
  const source = cleanText(context?.source, 160);
  const runContext = asRecord(context?.context);
  if (source !== 'xenesis-agent-workbench') return false;
  if (runContext.persistencePolicy !== 'explicit-user-request-only') return false;
  if (runContext.allowPersistence === true) return false;
  return PERSISTENCE_TOOL_PATTERN.test(cleanText(request?.name, 200));
}

export function projectXenesisApprovalRequest(item) {
  const raw = asRecord(item);
  const legacy = parseJsonRecord(raw.command);
  const kind = cleanText(raw.kind, 80) || cleanText(legacy.kind, 80) || 'approval';
  const isRuntimeTool = kind === 'runtime-tool' || legacy.type === 'xenesis-runtime-tool';
  const isCapabilityApproval = kind === 'capability' || kind === 'capability-approval' || legacy.type === 'desk-capability-call';
  const sourceAgent =
    cleanText(raw.sourceAgent, 160) ||
    cleanText(raw.requester, 160) ||
    cleanText(legacy.sourceAgent, 160) ||
    cleanText(legacy.source, 160) ||
    (isRuntimeTool ? 'xenesis-agent-workbench' : '');
  const capabilityPath = isCapabilityApproval ? cleanText(legacy.path, 300) : '';

  return {
    id: cleanText(raw.id, 160),
    title: cleanText(raw.title, 300) || (isRuntimeTool ? 'Approve Xenesis runtime tool' : 'Approve Xenesis action'),
    kind,
    permission: normalizePermission(raw.permission, isRuntimeTool ? 'execute' : 'control'),
    risk: normalizeRisk(raw.risk || legacy.riskLevel),
    command: cleanText(raw.command, 4000),
    description: cleanText(raw.description, 4000),
    source: cleanText(raw.source, 160),
    sourceChannel: cleanText(raw.sourceChannel, 160),
    sourceAgent,
    sessionId: cleanText(raw.sessionId, 160),
    approvalSessionKey: cleanText(raw.approvalSessionKey, 300),
    requester: cleanText(raw.requester, 160),
    capabilityPath,
    ...(isCapabilityApproval && Object.hasOwn(legacy, 'args') ? { capabilityArgs: legacy.args } : {}),
    status: normalizeStatus(raw.status),
    callbackUrl: cleanText(raw.callbackUrl, 1000),
    approveText: cleanText(raw.approveText, 1000) || 'Approve',
    rejectText: cleanText(raw.rejectText, 1000) || 'Reject',
    createdAt: cleanText(raw.createdAt, 80),
    updatedAt: cleanText(raw.updatedAt, 80),
    expiresAt: cleanText(raw.expiresAt, 80),
    resolvedAt: cleanText(raw.resolvedAt, 80),
    lastCallbackAt: cleanText(raw.lastCallbackAt, 80),
    result: cleanText(raw.result, 4000),
    error: cleanText(raw.error, 4000),
    migratedFrom: 'action-inbox',
    legacy,
  };
}

export function projectXenesisApprovalRequests(items) {
  return (Array.isArray(items) ? items : []).map(projectXenesisApprovalRequest);
}

export function createXenesisWorkbenchApprovalController(options) {
  const pending = new Map();
  const applyActionInboxRequest = options?.applyActionInboxRequest;
  const resolveActionInboxRequest = options?.resolveActionInboxRequest;
  const listActionInboxItems = options?.listActionInboxItems;
  const emitChanged = typeof options?.emitChanged === 'function' ? options.emitChanged : () => {};
  const now = typeof options?.now === 'function' ? options.now : () => new Date().toISOString();

  function listApprovals() {
    return projectXenesisApprovalRequests(listActionInboxItems?.() ?? []);
  }

  function requestApproval(request, context = {}) {
    if (shouldAutoDenyPersistence(request, context)) {
      return Promise.resolve(false);
    }
    const at = now();
    const id = approvalIdFromRuntimeRequest(request, at);
    const item = applyActionInboxRequest({
      id,
      title: cleanText(request?.summary, 300) || `Approve Xenesis tool: ${cleanText(request?.name, 200) || 'runtime tool'}`,
      kind: 'runtime-tool',
      command: runtimeCommandPayload(request),
      description: cleanText(request?.reason, 4000) || cleanText(request?.summary, 4000),
      source: 'Xenesis Runtime',
      sessionId: cleanText(context?.sessionId, 160) || cleanText(request?.sessionId, 160) || 'xenesis-runtime',
      approvalSessionKey: cleanText(request?.toolCallId, 300) || cleanText(request?.approvalId, 300),
      requester: cleanText(context?.source, 160) || 'xenesis-agent-workbench',
      risk: cleanText(request?.riskLevel, 80) || 'medium',
      approveText: 'Approve',
      rejectText: 'Reject',
      createdAt: at,
      updatedAt: at,
    });
    emitChanged();
    return new Promise((resolve) => {
      pending.set(item.id, resolve);
    });
  }

  async function resolveApproval(request) {
    const result =
      (await resolveActionInboxRequest?.(request)) ?? { ok: false, error: 'Action Inbox resolver is not available' };
    const item = result?.item;
    if (result?.ok && item?.id && pending.has(item.id)) {
      const resolve = pending.get(item.id);
      pending.delete(item.id);
      resolve(request?.resolution === 'approve');
    }
    emitChanged();
    return {
      ok: Boolean(result?.ok),
      ...(item ? { item: projectXenesisApprovalRequest(item) } : {}),
      ...(result?.error ? { error: String(result.error) } : {}),
    };
  }

  return {
    listApprovals,
    requestApproval,
    resolveApproval,
  };
}
