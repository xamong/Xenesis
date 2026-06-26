import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { type WorkflowDesignerModel, workflowTextToDesignerModel } from './workflowDesigner';
import type { WorkflowRunResult } from './workflowEngine';
import { WORKFLOW_RUN_HISTORY_LIMIT } from './workflowRunnerConstants';
import {
  filterWorkflowRunHistory,
  fromWorkflowRunHistoryRecord,
  isWorkflowTerminalCommandStatus,
  isWorkflowTerminalResultSummary,
  mergeWorkflowRunHistory,
  toWorkflowRunHistoryRecord,
} from './workflowRunnerRuntimeUtils';
import type {
  ResultTab,
  WorkflowExecutionHistoryItem,
  WorkflowHistoryStatusFilter,
  WorkflowTerminalCommandStatus,
  WorkflowTerminalResultFilter,
} from './workflowRunnerTypes';

interface UseWorkflowRunnerHistoryOptions {
  result: WorkflowRunResult | null;
  commandStatusesRef: MutableRefObject<WorkflowTerminalCommandStatus[]>;
  setResult: (result: WorkflowRunResult | null) => void;
  setWorkflow: Dispatch<SetStateAction<string>>;
  setFixture: Dispatch<SetStateAction<string>>;
  setDesigner: Dispatch<SetStateAction<WorkflowDesignerModel>>;
  setSelectedActionId: Dispatch<SetStateAction<string>>;
  setCommandStatuses: Dispatch<SetStateAction<WorkflowTerminalCommandStatus[]>>;
  setExportStatus: Dispatch<SetStateAction<string>>;
  setSummaryQuery: Dispatch<SetStateAction<string>>;
  setSummaryStatusFilter: Dispatch<SetStateAction<WorkflowTerminalResultFilter>>;
  setTab: Dispatch<SetStateAction<ResultTab>>;
  rerunHistoryWorkflow: (item: WorkflowExecutionHistoryItem) => Promise<void>;
}

export function useWorkflowRunnerHistory({
  result,
  commandStatusesRef,
  setResult,
  setWorkflow,
  setFixture,
  setDesigner,
  setSelectedActionId,
  setCommandStatuses,
  setExportStatus,
  setSummaryQuery,
  setSummaryStatusFilter,
  setTab,
  rerunHistoryWorkflow,
}: UseWorkflowRunnerHistoryOptions) {
  const [runHistory, setRunHistory] = useState<WorkflowExecutionHistoryItem[]>([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<WorkflowHistoryStatusFilter>('all');
  const [historyStorageStatus, setHistoryStorageStatus] = useState('');

  const visibleHistoryItem = useMemo(() => {
    if (!result) return undefined;
    return runHistory.find((item) => item.result === result);
  }, [result, runHistory]);

  const filteredRunHistory = useMemo(
    () => filterWorkflowRunHistory(runHistory, historyQuery, historyStatusFilter),
    [historyQuery, historyStatusFilter, runHistory],
  );

  useEffect(() => {
    let canceled = false;
    window.workflowRunsAPI
      .list({ limit: WORKFLOW_RUN_HISTORY_LIMIT })
      .then((records) => {
        if (canceled) return;
        const persisted = records
          .map(fromWorkflowRunHistoryRecord)
          .filter((item): item is WorkflowExecutionHistoryItem => Boolean(item));
        setRunHistory((prev) => mergeWorkflowRunHistory([...prev, ...persisted]));
        setHistoryStorageStatus(persisted.length ? `Loaded ${persisted.length} saved runs` : 'No saved runs');
      })
      .catch((loadError) => {
        if (!canceled) {
          setHistoryStorageStatus(
            `History load failed: ${loadError instanceof Error ? loadError.message : String(loadError)}`,
          );
        }
      });
    return () => {
      canceled = true;
    };
  }, []);

  function pushRunHistory(item: WorkflowExecutionHistoryItem) {
    setRunHistory((prev) => mergeWorkflowRunHistory([item, ...prev]));
  }

  async function persistRunHistoryItem(item: WorkflowExecutionHistoryItem) {
    try {
      const saveResult = await window.workflowRunsAPI.save(
        toWorkflowRunHistoryRecord(item, commandStatusesRef.current),
      );
      setRunHistory((prev) =>
        mergeWorkflowRunHistory(
          prev.map((historyItem) =>
            historyItem.id === item.id
              ? {
                  ...historyItem,
                  persisted: true,
                  savedAt: saveResult.record.savedAt,
                  filePath: saveResult.path,
                  commandStatuses:
                    saveResult.record.commandStatuses?.filter(isWorkflowTerminalCommandStatus) ??
                    historyItem.commandStatuses,
                  failedTargetIds: saveResult.record.failedTargetIds ?? historyItem.failedTargetIds,
                  terminalResultSummary:
                    saveResult.record.terminalResultSummary?.filter(isWorkflowTerminalResultSummary) ??
                    historyItem.terminalResultSummary,
                }
              : historyItem,
          ),
        ),
      );
      setHistoryStorageStatus(`Saved run: ${saveResult.record.workflowName}`);
    } catch (saveError) {
      setHistoryStorageStatus(
        `History save failed: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
      );
    }
  }

  function openHistoryItem(itemId: string) {
    const item = runHistory.find((historyItem) => historyItem.id === itemId);
    if (!item) return;
    setResult(item.result);
    if (item.workflowSource) {
      setWorkflow(item.workflowSource);
      setFixture(item.fixture ?? '');
      const nextDesigner = workflowTextToDesignerModel(item.workflowSource);
      setDesigner(nextDesigner);
      setSelectedActionId(item.actionId ?? nextDesigner.actions[0]?.id ?? '');
    }
    if (item.commandStatuses) {
      commandStatusesRef.current = item.commandStatuses;
      setCommandStatuses(item.commandStatuses);
    }
    setExportStatus('');
    setSummaryQuery('');
    setSummaryStatusFilter('all');
    setTab('summary');
  }

  async function rerunHistoryItem(itemId: string) {
    const item = runHistory.find((historyItem) => historyItem.id === itemId);
    if (!item?.workflowSource?.trim()) {
      setHistoryStorageStatus('History item cannot be rerun because the workflow source was not saved.');
      return;
    }
    await rerunHistoryWorkflow(item);
  }

  async function deleteHistoryItem(itemId: string) {
    setHistoryStorageStatus('');
    const deletingItem = runHistory.find((historyItem) => historyItem.id === itemId);
    try {
      const records = await window.workflowRunsAPI.delete(itemId);
      const nextHistory = records
        .map(fromWorkflowRunHistoryRecord)
        .filter((item): item is WorkflowExecutionHistoryItem => Boolean(item));
      setRunHistory(nextHistory);
      if (deletingItem?.result === result) setResult(null);
      setHistoryStorageStatus(
        deletingItem ? `Deleted run: ${deletingItem.workflowName}` : 'History item was not found.',
      );
    } catch (deleteError) {
      setHistoryStorageStatus(
        `History delete failed: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
      );
    }
  }

  async function clearRunHistory() {
    setHistoryStorageStatus('');
    try {
      await window.workflowRunsAPI.clear();
      setRunHistory([]);
      setTab('summary');
      setHistoryStorageStatus('History cleared');
    } catch (clearError) {
      setHistoryStorageStatus(
        `History clear failed: ${clearError instanceof Error ? clearError.message : String(clearError)}`,
      );
    }
  }

  return {
    runHistory,
    filteredRunHistory,
    historyQuery,
    setHistoryQuery,
    historyStatusFilter,
    setHistoryStatusFilter,
    historyStorageStatus,
    visibleHistoryItem,
    pushRunHistory,
    persistRunHistoryItem,
    openHistoryItem,
    rerunHistoryItem,
    deleteHistoryItem,
    clearRunHistory,
  };
}
