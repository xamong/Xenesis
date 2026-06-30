import { type ContextDropAudit, selectContextWithinBudget } from './ContextBudget.js';
import { type ContextRecord, compareContextRecords, isContextRecordExpired } from './ContextRecord.js';

export interface ContextArbitratorInput {
  records: readonly ContextRecord[];
  tokenBudget: number;
  now?: Date;
}

export interface ContextArbitrationAudit {
  inputCount: number;
  selectedCount: number;
  usedTokens: number;
  tokenBudget: number;
  dropped: ContextDropAudit[];
}

export interface ContextArbitrationResult {
  selected: ContextRecord[];
  audit: ContextArbitrationAudit;
}

function pruneExpired(records: readonly ContextRecord[], now: Date) {
  const selected: ContextRecord[] = [];
  const dropped: ContextDropAudit[] = [];

  for (const record of records) {
    if (isContextRecordExpired(record, now) || record.freshness === 'expired') {
      dropped.push({ id: record.id, reason: 'expired' });
      continue;
    }
    selected.push(record);
  }

  return { selected, dropped };
}

function pruneConflicts(records: readonly ContextRecord[]) {
  const selected: ContextRecord[] = [];
  const dropped: ContextDropAudit[] = [];
  const winnerByConflictKey = new Map<string, ContextRecord>();

  for (const record of [...records].sort(compareContextRecords)) {
    if (!record.conflictKey) {
      selected.push(record);
      continue;
    }

    const winner = winnerByConflictKey.get(record.conflictKey);
    if (winner) {
      dropped.push({ id: record.id, reason: 'conflict_replaced', replacedBy: winner.id });
      continue;
    }

    winnerByConflictKey.set(record.conflictKey, record);
    selected.push(record);
  }

  return { selected, dropped };
}

export function arbitrateContextRecords(input: ContextArbitratorInput): ContextArbitrationResult {
  const now = input.now ?? new Date();
  const expired = pruneExpired(input.records, now);
  const conflicts = pruneConflicts(expired.selected);
  const budget = selectContextWithinBudget([...conflicts.selected].sort(compareContextRecords), input.tokenBudget);
  const dropped = [...expired.dropped, ...conflicts.dropped, ...budget.dropped];

  return {
    selected: budget.selected,
    audit: {
      inputCount: input.records.length,
      selectedCount: budget.selected.length,
      usedTokens: budget.usedTokens,
      tokenBudget: input.tokenBudget,
      dropped,
    },
  };
}
