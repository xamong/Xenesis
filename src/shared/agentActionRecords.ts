export type AgentActionNeededKind = 'approval' | 'user_input' | 'external_unblocker' | 'workflow_blocked';
export type AgentActionNeededStatus = 'open' | 'resolved' | 'dismissed';
export type AgentWorkflowReceiptKind =
  | 'action-needed-created'
  | 'action-needed-replied'
  | 'action-needed-dismissed'
  | 'workflow-receipt';

export interface AgentActionNeededReply {
  text: string;
  repliedBy: string;
  repliedAt: string;
}

export interface AgentActionNeededDismissal {
  reason: string;
  dismissedBy: string;
  dismissedAt: string;
}

export interface AgentActionNeeded {
  id: string;
  turnId: string;
  kind: AgentActionNeededKind;
  status: AgentActionNeededStatus;
  title: string;
  productMessage: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  dismissedAt?: string;
  refs?: Record<string, unknown>;
  reply?: AgentActionNeededReply;
  dismissal?: AgentActionNeededDismissal;
}

export interface AgentWorkflowReceipt {
  id: string;
  turnId: string;
  kind: AgentWorkflowReceiptKind;
  summary: string;
  createdAt: string;
  refs?: Record<string, unknown>;
}

export interface CreateAgentActionNeededInput {
  turnId: string;
  kind: AgentActionNeededKind;
  title: string;
  productMessage: string;
  refs?: Record<string, unknown>;
}

export interface AgentActionNeededListFilter {
  status?: AgentActionNeededStatus;
  turnId?: string;
}

export interface AgentWorkflowReceiptListFilter {
  turnId?: string;
  kind?: AgentWorkflowReceiptKind;
}

export interface AgentActionNeededReplyInput {
  text: string;
  repliedBy: string;
}

export interface AgentActionNeededDismissInput {
  reason?: string;
  dismissedBy?: string;
}

export interface AgentActionRecordMutationResult {
  ok: boolean;
  actionNeeded?: AgentActionNeeded;
  receipt?: AgentWorkflowReceipt;
  error?: string;
}

export interface CreateAgentWorkflowReceiptInput {
  turnId: string;
  kind?: AgentWorkflowReceiptKind;
  summary: string;
  refs?: Record<string, unknown>;
}

export interface AgentActionRecordStore {
  createActionNeeded(input: CreateAgentActionNeededInput): AgentActionNeeded;
  listActionNeeded(filter?: AgentActionNeededListFilter): AgentActionNeeded[];
  getActionNeeded(id: string): AgentActionNeeded | null;
  replyActionNeeded(id: string, input: AgentActionNeededReplyInput): AgentActionRecordMutationResult;
  dismissActionNeeded(id: string, input?: AgentActionNeededDismissInput): AgentActionRecordMutationResult;
  appendReceipt(input: CreateAgentWorkflowReceiptInput): AgentWorkflowReceipt;
  listReceipts(filter?: AgentWorkflowReceiptListFilter): AgentWorkflowReceipt[];
  getReceipt(id: string): AgentWorkflowReceipt | null;
}

export interface AgentActionRecordStoreOptions {
  now?: () => string;
  idFactory?: (prefix: 'action-needed' | 'receipt') => string;
}

export function sanitizeAgentProductMessage(value: unknown): string {
  const message = typeof value === 'string' ? value : String(value ?? '');
  return message
    .replace(/\bapprovalRequired\s*[:=]\s*(true|false)\b/gi, '')
    .replace(/\bactionInboxItem(?:\.id)?\s*[:=]\s*(?:"[^"]*"|'[^']*'|\{[^}]*\}|\S+)/gi, '')
    .replace(/\bapprovalId\s*[:=]\s*(?:"[^"]*"|'[^']*'|\S+)/gi, '')
    .replace(/\bapprovalProof\s*[:=]\s*(?:"[^"]*"|'[^']*'|\{[^}]*\}|\S+)/gi, '')
    .replace(/\bpath\s*[:=]\s*xd\.[^\s]+/gi, '')
    .replace(/\bargs\s*[:=]\s*(?:"[^"]*"|'[^']*'|\{[^}]*\}|\[[^\]]*\]|\S+)/gi, '')
    .replace(/\bxd\.[a-z0-9_.-]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createAgentActionRecordStore(options: AgentActionRecordStoreOptions = {}): AgentActionRecordStore {
  const now = options.now ?? (() => new Date().toISOString());
  const idFactory = options.idFactory ?? createDefaultIdFactory();
  const actionNeededRecords: AgentActionNeeded[] = [];
  const receipts: AgentWorkflowReceipt[] = [];

  function createActionNeeded(input: CreateAgentActionNeededInput): AgentActionNeeded {
    const timestamp = now();
    const record: AgentActionNeeded = {
      id: idFactory('action-needed'),
      turnId: String(input.turnId || ''),
      kind: input.kind,
      status: 'open',
      title: String(input.title || '').trim() || 'Action needed',
      productMessage: sanitizeAgentProductMessage(input.productMessage),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(input.refs ? { refs: clonePlain(input.refs) } : {}),
    };
    actionNeededRecords.push(record);
    return clonePlain(record);
  }

  function listActionNeeded(filter: AgentActionNeededListFilter = {}): AgentActionNeeded[] {
    return actionNeededRecords
      .filter((record) => !filter.status || record.status === filter.status)
      .filter((record) => !filter.turnId || record.turnId === filter.turnId)
      .map((record) => clonePlain(record));
  }

  function getActionNeeded(id: string): AgentActionNeeded | null {
    const record = actionNeededRecords.find((item) => item.id === id);
    return record ? clonePlain(record) : null;
  }

  function replyActionNeeded(id: string, input: AgentActionNeededReplyInput): AgentActionRecordMutationResult {
    const record = actionNeededRecords.find((item) => item.id === id);
    if (!record) return { ok: false, error: `Action-needed record not found: ${id}` };
    if (record.status !== 'open') return { ok: false, error: `Action-needed record is not open: ${id}` };
    if (record.kind === 'approval') {
      return {
        ok: false,
        error: 'Approval action-needed records must be resolved through the Desk approval flow.',
      };
    }

    const timestamp = now();
    record.status = 'resolved';
    record.updatedAt = timestamp;
    record.resolvedAt = timestamp;
    record.reply = {
      text: String(input.text || ''),
      repliedBy: String(input.repliedBy || 'user'),
      repliedAt: timestamp,
    };
    const receipt = appendReceipt({
      turnId: record.turnId,
      kind: 'action-needed-replied',
      summary: `Action-needed replied: ${record.title}`,
      refs: { actionNeededId: record.id },
    });
    return { ok: true, actionNeeded: clonePlain(record), receipt };
  }

  function dismissActionNeeded(id: string, input: AgentActionNeededDismissInput = {}): AgentActionRecordMutationResult {
    const record = actionNeededRecords.find((item) => item.id === id);
    if (!record) return { ok: false, error: `Action-needed record not found: ${id}` };
    if (record.status !== 'open') return { ok: false, error: `Action-needed record is not open: ${id}` };
    if (record.kind === 'approval') {
      return {
        ok: false,
        error: 'Approval action-needed records must be resolved through the Desk approval flow.',
      };
    }

    const timestamp = now();
    record.status = 'dismissed';
    record.updatedAt = timestamp;
    record.dismissedAt = timestamp;
    record.dismissal = {
      reason: String(input.reason || 'Dismissed by user'),
      dismissedBy: String(input.dismissedBy || 'user'),
      dismissedAt: timestamp,
    };
    const receipt = appendReceipt({
      turnId: record.turnId,
      kind: 'action-needed-dismissed',
      summary: `Action-needed dismissed: ${record.title}`,
      refs: { actionNeededId: record.id },
    });
    return { ok: true, actionNeeded: clonePlain(record), receipt };
  }

  function appendReceipt(input: CreateAgentWorkflowReceiptInput): AgentWorkflowReceipt {
    const receipt: AgentWorkflowReceipt = {
      id: idFactory('receipt'),
      turnId: String(input.turnId || ''),
      kind: input.kind ?? 'workflow-receipt',
      summary: sanitizeAgentProductMessage(input.summary),
      createdAt: now(),
      ...(input.refs ? { refs: clonePlain(input.refs) } : {}),
    };
    receipts.push(receipt);
    return clonePlain(receipt);
  }

  function listReceipts(filter: AgentWorkflowReceiptListFilter = {}): AgentWorkflowReceipt[] {
    return receipts
      .filter((receipt) => !filter.turnId || receipt.turnId === filter.turnId)
      .filter((receipt) => !filter.kind || receipt.kind === filter.kind)
      .map((receipt) => clonePlain(receipt));
  }

  function getReceipt(id: string): AgentWorkflowReceipt | null {
    const receipt = receipts.find((item) => item.id === id);
    return receipt ? clonePlain(receipt) : null;
  }

  return {
    createActionNeeded,
    listActionNeeded,
    getActionNeeded,
    replyActionNeeded,
    dismissActionNeeded,
    appendReceipt,
    listReceipts,
    getReceipt,
  };
}

function createDefaultIdFactory(): (prefix: 'action-needed' | 'receipt') => string {
  let sequence = 0;
  return (prefix) => {
    sequence += 1;
    return `${prefix}-${sequence}`;
  };
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
