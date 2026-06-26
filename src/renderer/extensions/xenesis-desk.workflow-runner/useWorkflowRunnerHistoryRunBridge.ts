import type { Dispatch, SetStateAction } from 'react';
import { type WorkflowDesignerModel, workflowTextToDesignerModel } from './workflowDesigner';
import type {
  WorkflowExecutionHistoryItem,
  WorkflowRunOptions,
  WorkflowRunScope,
  WorkflowTargetMode,
  WorkspaceTab,
} from './workflowRunnerTypes';
import { normalizeCommandConcurrency } from './workflowRunnerUtils';

interface UseWorkflowRunnerHistoryRunBridgeOptions {
  setWorkflow: Dispatch<SetStateAction<string>>;
  setFixture: Dispatch<SetStateAction<string>>;
  setDesigner: Dispatch<SetStateAction<WorkflowDesignerModel>>;
  setWorkspaceTab: Dispatch<SetStateAction<WorkspaceTab>>;
  setSelectedActionId: Dispatch<SetStateAction<string>>;
  setSimulateApi: Dispatch<SetStateAction<boolean>>;
  setTerminalSequential: Dispatch<SetStateAction<boolean>>;
  setPresetTargetMode: Dispatch<SetStateAction<WorkflowTargetMode>>;
  setTargetGroupId: Dispatch<SetStateAction<string>>;
  setCommandConcurrency: Dispatch<SetStateAction<number>>;
  simulateApi: boolean;
  terminalSequential: boolean;
  runWorkflowSource: (
    source: string,
    fixtureText: string,
    scope: WorkflowRunScope,
    options: WorkflowRunOptions,
  ) => Promise<void>;
}

export function useWorkflowRunnerHistoryRunBridge({
  setWorkflow,
  setFixture,
  setDesigner,
  setWorkspaceTab,
  setSelectedActionId,
  setSimulateApi,
  setTerminalSequential,
  setPresetTargetMode,
  setTargetGroupId,
  setCommandConcurrency,
  simulateApi,
  terminalSequential,
  runWorkflowSource,
}: UseWorkflowRunnerHistoryRunBridgeOptions) {
  async function rerunHistoryWorkflow(item: WorkflowExecutionHistoryItem) {
    const workflowSource = item.workflowSource ?? '';
    const nextDesigner = workflowTextToDesignerModel(workflowSource);
    const nextSimulateApi = item.simulateApi ?? simulateApi;
    const nextSequential = item.sequential ?? terminalSequential;
    const nextCommandConcurrency = normalizeCommandConcurrency(item.commandConcurrency);

    setWorkflow(workflowSource);
    setFixture(item.fixture ?? '');
    setDesigner(nextDesigner);
    setWorkspaceTab('code');
    setSelectedActionId(item.actionId ?? nextDesigner.actions[0]?.id ?? '');
    setSimulateApi(nextSimulateApi);
    setTerminalSequential(nextSequential);
    setPresetTargetMode(item.targetMode);
    setTargetGroupId(item.targetGroupId ?? '');
    setCommandConcurrency(nextCommandConcurrency);

    await runWorkflowSource(workflowSource, item.fixture ?? '', item.scope, {
      simulateApi: nextSimulateApi,
      sequential: nextSequential,
      actionId: item.actionId,
      targetMode: item.targetMode,
      targetGroupId: item.targetGroupId ?? '',
      commandConcurrency: nextCommandConcurrency,
    });
  }

  return {
    rerunHistoryWorkflow,
  };
}
