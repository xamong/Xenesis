export type McpActionInboxStatus = 'pending' | 'approved' | 'rejected' | 'failed' | 'expired';
export type McpActionInboxResolution = 'approve' | 'reject';

export interface McpActionInboxItem {
  id: string;
  title: string;
  kind: string;
  command: string;
  description: string;
  source: string;
  sessionId: string;
  approvalSessionKey: string;
  requester: string;
  risk: string;
  status: McpActionInboxStatus;
  callbackUrl: string;
  approveText: string;
  rejectText: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  resolvedAt: string;
  lastCallbackAt: string;
  result: string;
  error: string;
}

export interface McpActionInboxState {
  items: Map<string, McpActionInboxItem>;
}

export interface McpActionInboxResolveResult {
  ok: boolean;
  item?: McpActionInboxItem;
  error?: string;
}

export function normalizeMcpActionInboxRequest(
  raw: unknown,
  options?: { now?: string; expiresAt?: string; ttlMs?: number },
): McpActionInboxItem;
export function createMcpActionInboxState(): McpActionInboxState;
export function applyMcpActionInboxRequest(
  state: McpActionInboxState,
  raw: unknown,
  options?: { now?: string; expiresAt?: string; ttlMs?: number },
): McpActionInboxItem;
export function listMcpActionInboxItems(
  state: McpActionInboxState,
  options?: { includeResolved?: boolean; limit?: number },
): McpActionInboxItem[];
export function markExpiredMcpActionInboxItems(
  state: McpActionInboxState,
  options?: { now?: string },
): McpActionInboxItem[];
export function resolveMcpActionInboxItem(
  state: McpActionInboxState,
  raw: unknown,
  options?: { now?: string },
): McpActionInboxResolveResult;
export function clearResolvedMcpActionInboxItems(state: McpActionInboxState): McpActionInboxItem[];
export function persistMcpActionInboxState(
  state: McpActionInboxState,
  filePath: string,
  options?: { now?: string; limit?: number },
): { version: 1; savedAt: string; items: McpActionInboxItem[] };
export function loadMcpActionInboxStateFromFile(
  state: McpActionInboxState,
  filePath: string,
  options?: { now?: string; expiresAt?: string; ttlMs?: number },
): { loaded: boolean; count: number };
