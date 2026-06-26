import { useMemo } from 'react';
import { inspectWorkflowPreflightText, type WorkflowRunResult } from './workflowEngine';
import type { WorkflowDiagnosticItem, WorkflowRunScope } from './workflowRunnerTypes';

interface UseWorkflowRunnerRunControlsOptions {
  activeWorkflowSource: string;
  result: WorkflowRunResult | null;
  runCurrentWorkflow: (scope?: WorkflowRunScope) => Promise<void>;
  runFailedTargets: () => Promise<void>;
}

export function useWorkflowRunnerRunControls({
  activeWorkflowSource,
  result,
  runCurrentWorkflow,
  runFailedTargets,
}: UseWorkflowRunnerRunControlsOptions) {
  const preflightDiagnostics = useMemo<WorkflowDiagnosticItem[]>(() => {
    try {
      return inspectWorkflowPreflightText(activeWorkflowSource);
    } catch (preflightError) {
      return [
        {
          severity: 'error',
          path: 'workflow',
          code: 'preflight.parse',
          message: preflightError instanceof Error ? preflightError.message : String(preflightError),
        },
      ];
    }
  }, [activeWorkflowSource]);

  const stats = useMemo(() => {
    const completed = result?.trace.filter((step) => step.status === 'completed').length ?? 0;
    const failed = result?.trace.filter((step) => step.status === 'failed').length ?? 0;
    return {
      actions: result?.trace.length ?? 0,
      completed,
      failed,
      events: result?.executionEvents.length ?? 0,
      updates: result?.hostUpdates.length ?? 0,
    };
  }, [result]);

  async function run(scope: WorkflowRunScope = 'all') {
    await runCurrentWorkflow(scope);
  }

  async function rerunFailedTargets() {
    await runFailedTargets();
  }

  return {
    activeWorkflowSource,
    preflightDiagnostics,
    stats,
    run,
    rerunFailedTargets,
  };
}
