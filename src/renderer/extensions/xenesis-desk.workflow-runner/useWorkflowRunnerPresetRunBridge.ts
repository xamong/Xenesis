import type {
  WorkflowExecutionPreset,
  WorkflowRunOptions,
  WorkflowRunScope,
  WorkflowTargetMode,
} from './workflowRunnerTypes';

interface UseWorkflowRunnerPresetRunBridgeOptions {
  runWorkflowSource: (
    source: string,
    fixtureText: string,
    scope: WorkflowRunScope,
    options: WorkflowRunOptions,
  ) => Promise<void>;
}

export function useWorkflowRunnerPresetRunBridge({ runWorkflowSource }: UseWorkflowRunnerPresetRunBridgeOptions) {
  async function runPresetWorkflow(
    preset: WorkflowExecutionPreset,
    scope: WorkflowRunScope,
    targetMode: WorkflowTargetMode,
    nextCommandConcurrency: number,
  ) {
    await runWorkflowSource(preset.workflow, preset.fixture, scope, {
      simulateApi: preset.simulateApi,
      sequential: preset.sequential,
      actionId: preset.actionId,
      targetMode,
      targetGroupId: preset.targetGroupId,
      commandConcurrency: nextCommandConcurrency,
    });
  }

  return {
    runPresetWorkflow,
  };
}
