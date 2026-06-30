import type {
  McpBridgeActionInboxItem,
  McpBridgeActionInboxResolveRequest,
  McpBridgeActionInboxResolveResult,
  XenesisApprovalRequest,
  XenesisApprovalResolveRequest,
  XenesisApprovalResolveResult,
} from '../shared/types';

export interface XenesisWorkbenchApprovalContext {
  source?: string;
  sessionId?: string;
  runId?: string;
  context?: Record<string, unknown>;
}

export interface XenesisRuntimeApprovalRequest {
  approvalId?: string;
  toolCallId?: string;
  name?: string;
  input?: unknown;
  reason?: string;
  riskLevel?: string;
  summary?: string;
  sessionId?: string;
}

export interface XenesisWorkbenchApprovalControllerOptions {
  applyActionInboxRequest(raw: unknown): McpBridgeActionInboxItem;
  resolveActionInboxRequest(request: McpBridgeActionInboxResolveRequest): Promise<McpBridgeActionInboxResolveResult>;
  listActionInboxItems(): readonly McpBridgeActionInboxItem[];
  emitChanged?(): void;
  now?(): string;
}

export interface XenesisWorkbenchApprovalController {
  listApprovals(): XenesisApprovalRequest[];
  requestApproval(
    request: XenesisRuntimeApprovalRequest,
    context?: XenesisWorkbenchApprovalContext,
  ): Promise<boolean>;
  resolveApproval(request: XenesisApprovalResolveRequest): Promise<XenesisApprovalResolveResult>;
}

export function projectXenesisApprovalRequest(item: unknown): XenesisApprovalRequest;
export function projectXenesisApprovalRequests(items: readonly unknown[]): XenesisApprovalRequest[];
export function createXenesisWorkbenchApprovalController(
  options: XenesisWorkbenchApprovalControllerOptions,
): XenesisWorkbenchApprovalController;
