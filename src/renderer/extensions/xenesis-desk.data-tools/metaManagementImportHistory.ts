import type { MetaImportConflictPolicy, MetaRecord } from './metaManagementProvider';

export type ImportHistoryPolicyFilter = 'all' | MetaImportConflictPolicy;

export interface ImportHistoryEntry {
  id: string;
  appliedAt: string;
  targetLabel: string;
  policy: MetaImportConflictPolicy;
  message: string;
  warnings: number;
  result: MetaRecord;
  summary: {
    inserted: number;
    templates: number;
    attributes: number;
    instances: number;
    reused: number;
    updated: number;
    changedRows: number;
    changedFields: number;
    skipped: number;
  };
}

export const MAX_IMPORT_HISTORY = 5;
export const IMPORT_HISTORY_STORAGE_KEY = 'xenesis:meta-management:import-history';

function importHistoryConflicts(entry: ImportHistoryEntry): MetaRecord[] {
  return Array.isArray(entry.result?.conflicts) ? (entry.result.conflicts as MetaRecord[]) : [];
}

function importHistoryWarnings(entry: ImportHistoryEntry): string[] {
  return Array.isArray(entry.result?.warnings) ? (entry.result.warnings as string[]) : [];
}

export function metaImportConflictResolutionLabel(conflict: MetaRecord): string {
  if (conflict.resolved !== true) return 'Blocked';
  return conflict.resolution === 'update' ? 'Update Existing' : 'Merge Existing';
}

export function buildImportHistoryAuditSummary(entry: ImportHistoryEntry): MetaRecord {
  const conflicts = importHistoryConflicts(entry);
  const warnings = importHistoryWarnings(entry);
  const changedConflicts = conflicts.filter((conflict) => Number(conflict.changedFields ?? 0) > 0);
  return {
    changedRows: entry.summary.changedRows,
    changedFields: entry.summary.changedFields,
    warningCount: warnings.length,
    warnings,
    conflictCount: conflicts.length,
    resolvedConflictCount: conflicts.filter((conflict) => conflict.resolved === true).length,
    blockedConflictCount: conflicts.filter((conflict) => conflict.resolved !== true).length,
    changedRowCount: changedConflicts.length,
    changedRowsDetail: changedConflicts.map((conflict) => ({
      type: conflict.TYPE ?? '',
      code: conflict.CODE ?? '',
      existingUID: conflict.existingUID ?? '',
      sourceUID: conflict.sourceUID ?? '',
      changedFields: conflict.changedFields ?? 0,
      changes: Array.isArray(conflict.changes) ? conflict.changes : [],
    })),
    conflictResolutions: conflicts.map((conflict) => ({
      type: conflict.TYPE ?? '',
      code: conflict.CODE ?? '',
      resolution: metaImportConflictResolutionLabel(conflict),
      resolved: conflict.resolved === true,
      existingUID: conflict.existingUID ?? '',
      sourceUID: conflict.sourceUID ?? '',
      changedFields: conflict.changedFields ?? 0,
      message: conflict.message ?? '',
    })),
  };
}

export function buildImportHistoryExportEntry(entry: ImportHistoryEntry): MetaRecord {
  return {
    id: entry.id,
    appliedAt: entry.appliedAt,
    target: entry.targetLabel,
    policy: entry.policy,
    message: entry.message,
    summary: entry.summary,
    warnings: entry.warnings,
    auditSummary: buildImportHistoryAuditSummary(entry),
    result: entry.result,
  };
}

export function isImportHistoryEntry(value: unknown): value is ImportHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ImportHistoryEntry>;
  return (
    typeof record.id === 'string' &&
    typeof record.appliedAt === 'string' &&
    typeof record.targetLabel === 'string' &&
    ['insert', 'merge', 'update'].includes(String(record.policy)) &&
    typeof record.message === 'string' &&
    typeof record.summary === 'object'
  );
}
