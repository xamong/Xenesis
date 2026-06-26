import type { MetaGridChanges, MetaGridDeletes, MetaGridKind } from './useMetaManagementData';

export interface MetaGridPendingCount {
  changed: number;
  deleted: number;
  total: number;
}

export interface MetaGridPendingSummary {
  tpl: MetaGridPendingCount;
  attr: MetaGridPendingCount;
  inst: MetaGridPendingCount;
  total: number;
}

export function countMetaGridPendingChanges(
  changed: MetaGridChanges,
  deleted: MetaGridDeletes,
  grid: MetaGridKind,
): MetaGridPendingCount {
  const changedCount = changed[grid].size;
  const deletedCount = deleted[grid].size;
  return {
    changed: changedCount,
    deleted: deletedCount,
    total: changedCount + deletedCount,
  };
}

export function buildMetaGridPendingSummary(args: {
  changed: MetaGridChanges;
  deleted: MetaGridDeletes;
}): MetaGridPendingSummary {
  const tpl = countMetaGridPendingChanges(args.changed, args.deleted, 'tpl');
  const attr = countMetaGridPendingChanges(args.changed, args.deleted, 'attr');
  const inst = countMetaGridPendingChanges(args.changed, args.deleted, 'inst');
  return {
    tpl,
    attr,
    inst,
    total: tpl.total + attr.total + inst.total,
  };
}

export function hasMetaGridPendingWork(summary: MetaGridPendingSummary, grid: MetaGridKind): boolean {
  return summary[grid].total > 0;
}
