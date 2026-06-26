import type { ContextRecord } from "./ContextRecord.js";

export type ContextDropReason = "expired" | "conflict_replaced" | "token_budget";

export interface ContextDropAudit {
  id: string;
  reason: ContextDropReason;
  replacedBy?: string;
}

export interface ContextBudgetSelection {
  selected: ContextRecord[];
  dropped: ContextDropAudit[];
  usedTokens: number;
  tokenBudget: number;
}

export function selectContextWithinBudget(
  records: readonly ContextRecord[],
  tokenBudget: number
): ContextBudgetSelection {
  const selected: ContextRecord[] = [];
  const dropped: ContextDropAudit[] = [];
  let usedTokens = 0;

  for (const record of records) {
    if (usedTokens + record.tokenEstimate > tokenBudget) {
      dropped.push({ id: record.id, reason: "token_budget" });
      continue;
    }

    selected.push(record);
    usedTokens += record.tokenEstimate;
  }

  return {
    selected,
    dropped,
    usedTokens,
    tokenBudget
  };
}
