import { type Dispatch, type SetStateAction, useMemo } from 'react';
import { designerModelToWorkflowText, type WorkflowDesignerModel } from './workflowDesigner';
import type { WorkflowRunOptions, WorkflowRunScope, WorkflowTargetMode, WorkspaceTab } from './workflowRunnerTypes';

interface UseWorkflowRunnerRunSourceBridgeOptions {
  designer: WorkflowDesignerModel;
  workflow: string;
  fixture: string;
  workspaceTab: WorkspaceTab;
  simulateApi: boolean;
  terminalSequential: boolean;
  selectedActionId: string;
  presetTargetMode: WorkflowTargetMode;
  targetGroupId: string;
  commandConcurrency: number;
  setWorkflow: Dispatch<SetStateAction<string>>;
  runWorkflowSource: (
    source: string,
    fixtureText: string,
    scope: WorkflowRunScope,
    options: WorkflowRunOptions,
  ) => Promise<void>;
}

export function useWorkflowRunnerRunSourceBridge({
  designer,
  workflow,
  fixture,
  workspaceTab,
  simulateApi,
  terminalSequential,
  selectedActionId,
  presetTargetMode,
  targetGroupId,
  commandConcurrency,
  setWorkflow,
  runWorkflowSource,
}: UseWorkflowRunnerRunSourceBridgeOptions) {
  const activeWorkflowSource = useMemo(
    () => (workspaceTab === 'code' ? workflow : designerModelToWorkflowText(designer)),
    [designer, workflow, workspaceTab],
  );

  function syncDesignerSourceToCode() {
    if (workspaceTab !== 'code') setWorkflow(activeWorkflowSource);
  }

  async function runCurrentWorkflow(scope: WorkflowRunScope = 'all') {
    syncDesignerSourceToCode();
    await runWorkflowSource(activeWorkflowSource, fixture, scope, {
      simulateApi,
      sequential: terminalSequential,
      actionId: selectedActionId,
      targetMode: presetTargetMode,
      targetGroupId,
      commandConcurrency,
    });
  }

  async function runFailedTargets() {
    syncDesignerSourceToCode();
    await runWorkflowSource(activeWorkflowSource, fixture, 'all', {
      simulateApi,
      sequential: terminalSequential,
      actionId: selectedActionId,
      targetMode: 'failed',
      targetGroupId,
      commandConcurrency,
    });
  }

  return {
    activeWorkflowSource,
    runCurrentWorkflow,
    runFailedTargets,
  };
}
