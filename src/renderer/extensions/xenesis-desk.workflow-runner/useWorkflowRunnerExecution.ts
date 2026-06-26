import { type MutableRefObject, useRef, useState } from 'react';
import { terminalHost } from '../../terminal/terminalHost';
import type {
  WorkflowExecutionEvent,
  WorkflowRunControl,
  WorkflowRunResult,
  WorkflowTraceStep,
} from './workflowEngine';
import { runWorkflowText } from './workflowEngine';
import { createTerminalHostAdapter } from './workflowRunnerHostAdapter';
import {
  buildTerminalResultSummary,
  collectFailedTerminalIds,
  createActiveWorkflowRunProgress,
  createIdleWorkflowRunProgress,
  failWorkflowRunProgress,
  finishWorkflowRunProgress,
  updateWorkflowRunProgressSnapshot,
} from './workflowRunnerRuntimeUtils';
import type {
  ResultTab,
  WorkflowExecutionHistoryItem,
  WorkflowRunControlState,
  WorkflowRunOptions,
  WorkflowRunProgress,
  WorkflowRunScope,
  WorkflowTargetMode,
  WorkflowTerminalCommandStatus,
} from './workflowRunnerTypes';

interface UseWorkflowRunnerExecutionOptions {
  selectedTermIds: string[];
  commandStatusesRef: MutableRefObject<WorkflowTerminalCommandStatus[]>;
  setCommandStatuses: (statuses: WorkflowTerminalCommandStatus[]) => void;
  appendCommandLog: (entry: string) => void;
  upsertCommandStatuses: (updates: WorkflowTerminalCommandStatus[]) => void;
  onBeforeRun: () => void;
  onHistoryItem: (item: WorkflowExecutionHistoryItem) => void;
  onResultTabChange: (tab: ResultTab) => void;
}

export function useWorkflowRunnerExecution({
  selectedTermIds,
  commandStatusesRef,
  setCommandStatuses,
  appendCommandLog,
  upsertCommandStatuses,
  onBeforeRun,
  onHistoryItem,
  onResultTabChange,
}: UseWorkflowRunnerExecutionOptions) {
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<WorkflowRunResult | null>(null);
  const [failedTermIds, setFailedTermIds] = useState<string[]>([]);
  const [runProgress, setRunProgress] = useState<WorkflowRunProgress>(() => createIdleWorkflowRunProgress());
  const runControlRef = useRef<WorkflowRunControlState | null>(null);

  function createWorkflowRunControl(): WorkflowRunControl {
    const controlState: WorkflowRunControlState = {
      cancelled: false,
      paused: false,
      resumeWaiters: [],
    };
    runControlRef.current = controlState;
    setPaused(false);
    return {
      isCancelled: () => controlState.cancelled,
      waitIfPaused: () => {
        if (controlState.cancelled || !controlState.paused) return Promise.resolve();
        return new Promise((resolve) => {
          controlState.resumeWaiters.push(resolve);
        });
      },
    };
  }

  function releaseWorkflowRunWaiters(controlState: WorkflowRunControlState): void {
    const waiters = controlState.resumeWaiters.splice(0);
    for (const resolve of waiters) resolve();
  }

  function pauseWorkflowRun() {
    const controlState = runControlRef.current;
    if (!controlState || controlState.cancelled || controlState.paused) return;
    controlState.paused = true;
    setPaused(true);
    appendCommandLog('Workflow run paused.');
  }

  function resumeWorkflowRun() {
    const controlState = runControlRef.current;
    if (!controlState || controlState.cancelled || !controlState.paused) return;
    controlState.paused = false;
    setPaused(false);
    releaseWorkflowRunWaiters(controlState);
    appendCommandLog('Workflow run resumed.');
  }

  function cancelWorkflowRun() {
    const controlState = runControlRef.current;
    if (!controlState || controlState.cancelled) return;
    controlState.cancelled = true;
    controlState.paused = false;
    setPaused(false);
    releaseWorkflowRunWaiters(controlState);
    appendCommandLog('Workflow run cancel requested.');
  }

  function updateWorkflowRunProgress(event: WorkflowExecutionEvent, trace: WorkflowTraceStep[]) {
    setRunProgress((prev) => updateWorkflowRunProgressSnapshot(prev, event, trace));
  }

  async function runWorkflowSource(
    source: string,
    fixtureText: string,
    scope: WorkflowRunScope,
    options: WorkflowRunOptions,
  ) {
    setRunning(true);
    setError('');
    onBeforeRun();
    commandStatusesRef.current = [];
    setCommandStatuses([]);
    const startedAt = Date.now();
    setRunProgress(createActiveWorkflowRunProgress(new Date(startedAt).toISOString()));
    const targetTermIds = resolveTargetTermIdsForMode(
      options.targetMode,
      selectedTermIds,
      failedTermIds,
      options.targetGroupId,
    );
    try {
      const parsedFixture = fixtureText.trim() ? JSON.parse(fixtureText) : {};
      const output = await runWorkflowText(source, {
        fixture: parsedFixture,
        simulateApi: options.simulateApi,
        hostAdapter: createTerminalHostAdapter(appendCommandLog, upsertCommandStatuses, options.commandConcurrency),
        targetTermIds,
        sequentialCommands: options.sequential,
        runActionId: scope === 'selected' ? options.actionId : undefined,
        runUntilActionId: scope === 'until' ? options.actionId : undefined,
        maxSleepMs: 500,
        maxSchedulerIterations: 20,
        stopOnFailure: false,
        control: createWorkflowRunControl(),
        onExecutionEvent: updateWorkflowRunProgress,
      });
      setResult(output);
      setRunProgress((prev) => finishWorkflowRunProgress(prev, output.trace, output.success));
      const runCommandStatuses = commandStatusesRef.current;
      const historyItem: WorkflowExecutionHistoryItem = {
        id: `${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
        workflowName: output.workflow.name,
        workflowSource: source,
        fixture: fixtureText,
        success: output.success,
        scope,
        actionId: options.actionId,
        simulateApi: options.simulateApi,
        sequential: options.sequential,
        targetMode: options.targetMode,
        targetGroupId: options.targetGroupId,
        commandConcurrency: options.commandConcurrency,
        targetCount: targetTermIds.length,
        actionCount: output.trace.length,
        startedAt: new Date(startedAt).toISOString(),
        durationMs: Date.now() - startedAt,
        result: output,
        commandStatuses: runCommandStatuses,
        failedTargetIds: collectFailedTerminalIds(commandStatusesRef.current),
        terminalResultSummary: buildTerminalResultSummary(commandStatusesRef.current),
      };
      onHistoryItem(historyItem);
      setFailedTermIds(collectFailedTerminalIds(commandStatusesRef.current));
      onResultTabChange('summary');
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : String(runError);
      setError(message);
      setRunProgress((prev) => failWorkflowRunProgress(prev, message));
    } finally {
      if (runControlRef.current && runControlRef.current.cancelled) {
        appendCommandLog('Workflow run cancelled.');
      }
      runControlRef.current = null;
      setPaused(false);
      setRunning(false);
    }
  }

  return {
    running,
    paused,
    error,
    result,
    failedTermIds,
    runProgress,
    setError,
    setResult,
    runWorkflowSource,
    pauseWorkflowRun,
    resumeWorkflowRun,
    cancelWorkflowRun,
  };
}

function resolveTargetTermIdsForMode(
  mode: WorkflowTargetMode,
  selectedTermIds: string[],
  failedTermIds: string[],
  targetGroupId: string,
): string[] {
  const sessions = terminalHost.listSessions();
  if (mode === 'all') return sessions.map((session) => session.id);
  if (mode === 'active') {
    const active = sessions.find((session) => session.active);
    return active ? [active.id] : [];
  }
  if (mode === 'group') {
    const groupId = targetGroupId.trim();
    return groupId ? sessions.filter((session) => session.groupId === groupId).map((session) => session.id) : [];
  }
  if (mode === 'failed') {
    return failedTermIds.filter((termId) => terminalHost.has(termId));
  }
  return selectedTermIds.filter((termId) => terminalHost.has(termId));
}
