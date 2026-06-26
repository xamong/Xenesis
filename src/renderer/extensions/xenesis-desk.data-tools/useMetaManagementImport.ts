import { useEffect, useMemo, useState } from 'react';
import {
  buildMetaImportConflictSummary,
  buildMetaImportContextSummary,
  buildMetaImportPlan,
  previewMetaImportPayload,
} from './metaManagementCmdbAssist';
import type { ImportHistoryEntry, ImportHistoryPolicyFilter } from './metaManagementImportHistory';
import {
  buildImportHistoryExportEntry,
  IMPORT_HISTORY_STORAGE_KEY,
  isImportHistoryEntry,
  MAX_IMPORT_HISTORY,
} from './metaManagementImportHistory';
import type { MetaImportConflictPolicy, MetaImportSnapshotOptions, MetaRecord } from './metaManagementProvider';

export type ServerPreviewPhase = 'idle' | 'dryRun' | 'applied';

export interface UseMetaManagementImportArgs {
  selectedNode: MetaRecord | null;
  onPreviewImportSnapshot?: (snapshot: MetaRecord, options?: MetaImportSnapshotOptions) => Promise<MetaRecord>;
  onImportSnapshot?: (snapshot: MetaRecord, options?: MetaImportSnapshotOptions) => Promise<MetaRecord>;
  setCopyStatus: (status: string) => void;
}

function targetLabel(node: MetaRecord | null): string {
  if (!node) return 'No target';
  return String(node.CODE ?? node.UID ?? node.NAME ?? 'Target node');
}

export function useMetaManagementImport({
  selectedNode,
  onPreviewImportSnapshot,
  onImportSnapshot,
  setCopyStatus,
}: UseMetaManagementImportArgs) {
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [serverPreview, setServerPreview] = useState<MetaRecord | null>(null);
  const [serverPreviewPhase, setServerPreviewPhase] = useState<ServerPreviewPhase>('idle');
  const [conflictPolicy, setConflictPolicy] = useState<MetaImportConflictPolicy>('insert');
  const [lastDryRunFingerprint, setLastDryRunFingerprint] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([]);
  const [importHistoryLoaded, setImportHistoryLoaded] = useState(false);
  const [importHistoryPolicyFilter, setImportHistoryPolicyFilter] = useState<ImportHistoryPolicyFilter>('all');
  const [importHistoryTargetFilter, setImportHistoryTargetFilter] = useState('all');

  const importPreview = useMemo(() => previewMetaImportPayload(importText), [importText]);
  const importPlan = useMemo(() => buildMetaImportPlan(importText), [importText]);
  const importContextSummary = useMemo(
    () => buildMetaImportContextSummary(importText, selectedNode),
    [importText, selectedNode],
  );
  const batchJson = useMemo(() => JSON.stringify(importPlan.items, null, 2), [importPlan.items]);
  const serverWarnings = useMemo(
    () => (Array.isArray(serverPreview?.warnings) ? (serverPreview.warnings as string[]) : []),
    [serverPreview],
  );
  const serverConflicts = useMemo(
    () => (Array.isArray(serverPreview?.conflicts) ? (serverPreview.conflicts as MetaRecord[]) : []),
    [serverPreview],
  );
  const conflictSummary = useMemo(() => buildMetaImportConflictSummary(serverConflicts), [serverConflicts]);
  const unresolvedConflicts = useMemo(
    () => serverConflicts.filter((conflict: MetaRecord) => conflict.resolved !== true),
    [serverConflicts],
  );
  const importOptions = useMemo<MetaImportSnapshotOptions>(() => ({ conflictPolicy }), [conflictPolicy]);
  const importFingerprint = useMemo(
    () =>
      JSON.stringify({
        text: importText,
        conflictPolicy,
        targetUid: selectedNode?.UID ?? '',
        targetCode: selectedNode?.CODE ?? '',
      }),
    [importText, conflictPolicy, selectedNode],
  );
  const hasFreshDryRun = Boolean(serverPreview) && lastDryRunFingerprint === importFingerprint;
  const hasBlockingConflicts = hasFreshDryRun && unresolvedConflicts.length > 0;
  const importHistoryTargetOptions = useMemo(
    () => Array.from(new Set(importHistory.map((entry) => entry.targetLabel))).filter(Boolean),
    [importHistory],
  );
  const visibleImportHistory = useMemo(
    () =>
      importHistory.filter((entry) => {
        const targetMatches = importHistoryTargetFilter === 'all' || entry.targetLabel === importHistoryTargetFilter;
        const policyMatches = importHistoryPolicyFilter === 'all' || entry.policy === importHistoryPolicyFilter;
        return targetMatches && policyMatches;
      }),
    [importHistory, importHistoryPolicyFilter, importHistoryTargetFilter],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(IMPORT_HISTORY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setImportHistory(parsed.filter(isImportHistoryEntry).slice(0, MAX_IMPORT_HISTORY));
      }
    } catch {
      setImportHistory([]);
    } finally {
      setImportHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!importHistoryLoaded) return;
    try {
      window.localStorage.setItem(
        IMPORT_HISTORY_STORAGE_KEY,
        JSON.stringify(importHistory.slice(0, MAX_IMPORT_HISTORY)),
      );
    } catch {
      // Import history is an operator convenience; failed persistence should not block imports.
    }
  }, [importHistory, importHistoryLoaded]);

  useEffect(() => {
    if (importHistoryTargetFilter !== 'all' && !importHistoryTargetOptions.includes(importHistoryTargetFilter)) {
      setImportHistoryTargetFilter('all');
    }
  }, [importHistoryTargetFilter, importHistoryTargetOptions]);

  function resetServerPreviewState() {
    setServerPreview(null);
    setServerPreviewPhase('idle');
    setLastDryRunFingerprint('');
    setImportStatus('');
  }

  function changeImportText(value: string) {
    setImportText(value);
    resetServerPreviewState();
  }

  function changeConflictPolicy(value: MetaImportConflictPolicy) {
    setConflictPolicy(value);
    resetServerPreviewState();
  }

  async function copyBatchItems() {
    try {
      await navigator.clipboard?.writeText(batchJson);
      setCopyStatus('Batch items copied');
    } catch {
      setCopyStatus('Copy failed');
    }
  }

  async function copyImportHistoryEntry(entry: ImportHistoryEntry) {
    try {
      await navigator.clipboard?.writeText(JSON.stringify(buildImportHistoryExportEntry(entry), null, 2));
      setCopyStatus('Import result copied');
    } catch {
      setCopyStatus('Copy failed');
    }
  }

  function clearImportHistory() {
    setImportHistory([]);
    setImportHistoryTargetFilter('all');
    setImportHistoryPolicyFilter('all');
  }

  async function previewImportSnapshot() {
    if (!onPreviewImportSnapshot || !importPlan.ok) return;
    setIsPreviewing(true);
    setImportStatus('');
    setServerPreview(null);
    setServerPreviewPhase('idle');
    setLastDryRunFingerprint('');
    try {
      const result = await onPreviewImportSnapshot(JSON.parse(importText) as MetaRecord, importOptions);
      const inserted = result.inserted ?? result.insertedInstances ?? importPlan.summary.totalItems;
      const warnings = Array.isArray(result.warnings) ? result.warnings.length : 0;
      const conflicts = Array.isArray(result.conflicts) ? result.conflicts.length : 0;
      const reused = result.reusedConflicts ?? 0;
      const updated = result.updatedConflicts ?? 0;
      const changedRows = result.changedRows ?? 0;
      const changedFields = result.changedFields ?? 0;
      setServerPreview(result);
      setServerPreviewPhase('dryRun');
      setLastDryRunFingerprint(importFingerprint);
      setImportStatus(
        `Dry run planned ${inserted} rows${reused ? `, reusing ${reused} existing rows` : ''}${updated ? `, updating ${updated}` : ''}${changedFields ? `, changing ${changedFields} fields across ${changedRows} rows` : ''}${warnings ? ` with ${warnings} warnings` : ''}${conflicts ? ` and ${conflicts} conflicts` : ''}.`,
      );
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : 'Import dry run failed.');
    } finally {
      setIsPreviewing(false);
    }
  }

  async function applyImportSnapshot() {
    if (!onImportSnapshot || !importPlan.ok) return;
    setIsApplying(true);
    setImportStatus('');
    try {
      const result = await onImportSnapshot(JSON.parse(importText) as MetaRecord, importOptions);
      const inserted = result.inserted ?? result.insertedInstances ?? importPlan.summary.totalItems;
      const warningCount = Array.isArray(result.warnings) ? result.warnings.length : 0;
      const reused = result.reusedConflicts ?? 0;
      const updated = result.updatedConflicts ?? 0;
      const changedRows = result.changedRows ?? 0;
      const changedFields = result.changedFields ?? 0;
      const status = `Applied ${inserted} rows${reused ? ` and reused ${reused} existing rows` : ''}${updated ? ` and updated ${updated}` : ''}${changedFields ? `, changing ${changedFields} fields across ${changedRows} rows` : ''}${warningCount ? ` with ${warningCount} warnings` : ''}. Run dry run again before another apply.`;
      setServerPreview(result);
      setServerPreviewPhase('applied');
      setLastDryRunFingerprint('');
      setImportStatus(status);
      setImportHistory((current) =>
        [
          {
            id: `${Date.now()}-${current.length}`,
            appliedAt: new Date().toLocaleString(),
            targetLabel: targetLabel(selectedNode),
            policy: conflictPolicy,
            message: status,
            warnings: warningCount,
            result,
            summary: {
              inserted,
              templates: result.insertedTemplates ?? 0,
              attributes: result.insertedAttributes ?? 0,
              instances: result.insertedInstances ?? 0,
              reused,
              updated,
              changedRows,
              changedFields,
              skipped: result.skippedAttributes ?? 0,
            },
          },
          ...current,
        ].slice(0, MAX_IMPORT_HISTORY),
      );
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setIsApplying(false);
    }
  }

  function downloadImportHistory() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            filters: {
              target: importHistoryTargetFilter,
              policy: importHistoryPolicyFilter,
            },
            count: visibleImportHistory.length,
            entries: visibleImportHistory.map(buildImportHistoryExportEntry),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'xmdb-import-history.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return {
    importText,
    importStatus,
    importPreview,
    importPlan,
    importContextSummary,
    batchJson,
    serverPreview,
    serverPreviewPhase,
    serverWarnings,
    serverConflicts,
    conflictSummary,
    unresolvedConflicts,
    conflictPolicy,
    hasFreshDryRun,
    hasBlockingConflicts,
    isPreviewing,
    isApplying,
    importHistory,
    importHistoryPolicyFilter,
    importHistoryTargetFilter,
    importHistoryTargetOptions,
    visibleImportHistory,
    setImportHistoryPolicyFilter,
    setImportHistoryTargetFilter,
    changeImportText,
    changeConflictPolicy,
    copyBatchItems,
    copyImportHistoryEntry,
    clearImportHistory,
    previewImportSnapshot,
    applyImportSnapshot,
    downloadImportHistory,
  };
}

export type MetaManagementImportTools = ReturnType<typeof useMetaManagementImport>;
