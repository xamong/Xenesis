export interface LinkedApprovalActionNeededInput {
  turnId?: string;
  item?: unknown;
}

export interface LinkedApprovalReceiptInput extends LinkedApprovalActionNeededInput {
  actionNeededId?: string;
}

export function createLinkedApprovalActionNeeded(input?: LinkedApprovalActionNeededInput): {
  turnId: string;
  kind: 'approval';
  title: string;
  productMessage: string;
  refs: Record<string, unknown>;
};

export function createLinkedApprovalReceipt(input?: LinkedApprovalReceiptInput): {
  turnId: string;
  kind: 'workflow-receipt';
  summary: string;
  refs: Record<string, unknown>;
};
