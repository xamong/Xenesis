function cleanText(value, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function parseCapabilityCommand(command) {
  try {
    const parsed = JSON.parse(String(command || ''));
    const record = asRecord(parsed);
    return {
      path: cleanText(record.path, 300),
      source: cleanText(record.source, 80),
      args: record.args,
    };
  } catch {
    return { path: '', source: '', args: undefined };
  }
}

function sanitizeApprovalProductText(value) {
  return cleanText(value, 4000)
    .replace(/\bapprovalRequired\s*[:=]\s*(true|false)\b/gi, '')
    .replace(/\bactionInboxItem(?:\.id)?\s*[:=]\s*(?:"[^"]*"|'[^']*'|\{[^}]*\}|\S+)/gi, '')
    .replace(/\bapprovalId\s*[:=]\s*(?:"[^"]*"|'[^']*'|\S+)/gi, '')
    .replace(/\bapprovalSessionKey\s*[:=]\s*(?:"[^"]*"|'[^']*'|\S+)/gi, '')
    .replace(/\bpath\s*[:=]\s*xd\.[^\s]+/gi, '')
    .replace(/\bargs\s*[:=]\s*(?:"[^"]*"|'[^']*'|\{[^}]*\}|\[[^\]]*\]|\S+)/gi, '')
    .replace(/\bxd\.[a-z0-9_.-]+/gi, '')
    .replace(/capability-[a-z0-9_.:-]+/gi, '')
    .replace(/[A-Z]:\\[^\s"]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createLinkedApprovalActionNeeded({ turnId, item } = {}) {
  const record = asRecord(item);
  const command = parseCapabilityCommand(record.command);
  const actionInboxItemId = cleanText(record.id, 160);
  const approvalId = cleanText(record.approvalId, 160) || actionInboxItemId;
  const rawTitle = sanitizeApprovalProductText(record.title);
  const title = rawTitle && rawTitle !== 'Approve Xenesis Desk capability:' ? rawTitle : 'Desk approval required';
  const description = sanitizeApprovalProductText(record.description);
  const source = sanitizeApprovalProductText(record.source);
  const productMessage = [description || '이 작업을 계속하려면 데스크 승인이 필요합니다.', source ? `Source: ${source}` : '']
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    turnId: cleanText(turnId, 160) || 'unknown-turn',
    kind: 'approval',
    title,
    productMessage: productMessage || '이 작업을 계속하려면 데스크 승인이 필요합니다.',
    refs: {
      actionInboxItemId,
      approvalId,
      approvalSessionKey: cleanText(record.approvalSessionKey, 300),
      capabilityPath: command.path,
      capabilitySource: command.source || cleanText(record.requester, 80),
    },
  };
}

export function createLinkedApprovalReceipt({ turnId, actionNeededId, item } = {}) {
  const record = asRecord(item);
  const command = parseCapabilityCommand(record.command);
  return {
    turnId: cleanText(turnId, 160) || 'unknown-turn',
    kind: 'workflow-receipt',
    summary: 'Desk approval requested.',
    refs: {
      actionNeededId: cleanText(actionNeededId, 160),
      actionInboxItemId: cleanText(record.id, 160),
      approvalId: cleanText(record.approvalId, 160) || cleanText(record.id, 160),
      approvalSessionKey: cleanText(record.approvalSessionKey, 300),
      capabilityPath: command.path,
      capabilitySource: command.source || cleanText(record.requester, 80),
    },
  };
}
