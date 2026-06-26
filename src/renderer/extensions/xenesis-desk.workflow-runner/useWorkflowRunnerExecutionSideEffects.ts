import { useEffect, useRef } from 'react';
import type { ResultTab, WorkflowExecutionHistoryItem } from './workflowRunnerTypes';

interface WorkflowRunnerExecutionSideEffectBindings {
  setWorkflowFileStatus: (status: string) => void;
  pushRunHistoryItem: (historyItem: WorkflowExecutionHistoryItem) => void;
  persistRunHistoryItem: (historyItem: WorkflowExecutionHistoryItem) => Promise<void>;
}

interface UseWorkflowRunnerExecutionSideEffectsOptions {
  setExportStatus: (status: string) => void;
  setTab: (tab: ResultTab) => void;
}

interface UseWorkflowRunnerExecutionSideEffectBindingsOptions extends WorkflowRunnerExecutionSideEffectBindings {
  bindExecutionSideEffects: (bindings: WorkflowRunnerExecutionSideEffectBindings) => void;
}

const emptySideEffectBindings: WorkflowRunnerExecutionSideEffectBindings = {
  setWorkflowFileStatus: () => undefined,
  pushRunHistoryItem: () => undefined,
  persistRunHistoryItem: async () => undefined,
};

export function useWorkflowRunnerExecutionSideEffects({
  setExportStatus,
  setTab,
}: UseWorkflowRunnerExecutionSideEffectsOptions) {
  const bindingsRef = useRef<WorkflowRunnerExecutionSideEffectBindings>(emptySideEffectBindings);

  function bindExecutionSideEffects(bindings: WorkflowRunnerExecutionSideEffectBindings) {
    bindingsRef.current = bindings;
  }

  function prepareWorkflowRun() {
    setExportStatus('');
    bindingsRef.current.setWorkflowFileStatus('');
  }

  function recordWorkflowRun(historyItem: WorkflowExecutionHistoryItem) {
    bindingsRef.current.pushRunHistoryItem(historyItem);
    void bindingsRef.current.persistRunHistoryItem(historyItem);
  }

  return {
    bindExecutionSideEffects,
    prepareWorkflowRun,
    recordWorkflowRun,
    setResultTab: setTab,
  };
}

export function useWorkflowRunnerExecutionSideEffectBindings({
  bindExecutionSideEffects,
  setWorkflowFileStatus,
  pushRunHistoryItem,
  persistRunHistoryItem,
}: UseWorkflowRunnerExecutionSideEffectBindingsOptions) {
  useEffect(() => {
    bindExecutionSideEffects({
      setWorkflowFileStatus,
      pushRunHistoryItem,
      persistRunHistoryItem,
    });
  }, [bindExecutionSideEffects, setWorkflowFileStatus, pushRunHistoryItem, persistRunHistoryItem]);
}
