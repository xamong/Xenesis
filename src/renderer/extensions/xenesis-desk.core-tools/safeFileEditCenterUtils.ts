import type { SafeFileApplyResult, SafeFilePreviewResult, SafeFileRestoreResult } from '../../../shared/types';

export interface DiffLineCounts {
  additions: number;
  deletions: number;
}

export interface SafeFileEditHandoff {
  filePath: string;
  label: string;
  source: string;
  at: string;
}

export const SAFE_FILE_EDIT_HANDOFF_STORAGE_KEY = 'xenesis-safe-file-edit-handoff';

export function countDiffLines(diff: string): DiffLineCounts {
  const counts: DiffLineCounts = { additions: 0, deletions: 0 };
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) counts.additions += 1;
    if (line.startsWith('-')) counts.deletions += 1;
  }
  return counts;
}

export function formatBackupSummary(result: SafeFileApplyResult | SafeFileRestoreResult | null): string {
  if (!result) return 'No backup action has run yet.';
  if ('backupCreated' in result) {
    if (!result.backupCreated) return 'No backup was needed.';
    return result.backupPath ? `Backup created: ${result.backupPath}` : 'Backup created.';
  }
  return `Restored ${result.restoredBytes} bytes from ${result.backupPath}`;
}

export function buildSafeFileEditHandoff(
  filePath: string,
  label = '',
  source = 'artifact-library',
): SafeFileEditHandoff {
  return {
    filePath: filePath.trim(),
    label: label.trim(),
    source: source.trim() || 'artifact-library',
    at: new Date().toISOString(),
  };
}

function isSafeFileEditHandoff(value: unknown): value is SafeFileEditHandoff {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SafeFileEditHandoff>;
  return (
    typeof candidate.filePath === 'string' &&
    candidate.filePath.trim().length > 0 &&
    typeof candidate.label === 'string' &&
    typeof candidate.source === 'string' &&
    typeof candidate.at === 'string'
  );
}

export function parseSafeFileEditHandoff(raw: string | null | undefined): SafeFileEditHandoff | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isSafeFileEditHandoff(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function serializeSafeFileEditHandoff(handoff: SafeFileEditHandoff): string {
  return JSON.stringify(handoff);
}

export function buildSafeFileBotPrompt(
  filePath: string,
  draftContent: string,
  preview: SafeFilePreviewResult | null,
  applyResult: SafeFileApplyResult | null,
): string {
  const diffCounts = preview ? countDiffLines(preview.diff) : { additions: 0, deletions: 0 };
  return [
    'Review this Xenesis Desk Safe File Edit Center change.',
    '',
    'Use the same safety model as these MCP tools:',
    '- xenesis_desk_preview_text_file_write',
    '- xenesis_desk_apply_text_file_write',
    '- xenesis_desk_restore_text_file_backup',
    '',
    `File: ${filePath || '-'}`,
    `Would change: ${preview?.wouldChange ?? '-'}`,
    `Backup required: ${preview?.backupRequired ?? '-'}`,
    `Diff: +${diffCounts.additions} / -${diffCounts.deletions}`,
    `Backup: ${formatBackupSummary(applyResult)}`,
    '',
    'Draft content:',
    draftContent.slice(0, 12000) || '(empty)',
    '',
    'Please review risk, summarize the changes, and recommend whether to apply or restore.',
  ].join('\n');
}
