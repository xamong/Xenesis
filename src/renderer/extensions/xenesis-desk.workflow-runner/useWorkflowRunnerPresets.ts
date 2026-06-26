import { type Dispatch, type SetStateAction, useState } from 'react';
import {
  designerModelToWorkflowText,
  type WorkflowDesignerModel,
  workflowTextToDesignerModel,
} from './workflowDesigner';
import type {
  WorkflowExecutionPreset,
  WorkflowRunScope,
  WorkflowTargetMode,
  WorkspaceTab,
} from './workflowRunnerTypes';
import {
  loadExecutionPresets,
  normalizeCommandConcurrency,
  normalizeRunScope,
  normalizeTargetMode,
  persistExecutionPresets,
} from './workflowRunnerUtils';

interface UseWorkflowRunnerPresetsOptions {
  designer: WorkflowDesignerModel;
  workflow: string;
  fixture: string;
  workspaceTab: WorkspaceTab;
  selectedActionId: string;
  simulateApi: boolean;
  terminalSequential: boolean;
  setWorkflow: Dispatch<SetStateAction<string>>;
  setFixture: Dispatch<SetStateAction<string>>;
  setDesigner: Dispatch<SetStateAction<WorkflowDesignerModel>>;
  setWorkspaceTab: Dispatch<SetStateAction<WorkspaceTab>>;
  setSelectedActionId: Dispatch<SetStateAction<string>>;
  setSimulateApi: Dispatch<SetStateAction<boolean>>;
  setTerminalSequential: Dispatch<SetStateAction<boolean>>;
  runPresetWorkflow: (
    preset: WorkflowExecutionPreset,
    scope: WorkflowRunScope,
    targetMode: WorkflowTargetMode,
    commandConcurrency: number,
  ) => Promise<void>;
}

export function useWorkflowRunnerPresets({
  designer,
  workflow,
  fixture,
  workspaceTab,
  selectedActionId,
  simulateApi,
  terminalSequential,
  setWorkflow,
  setFixture,
  setDesigner,
  setWorkspaceTab,
  setSelectedActionId,
  setSimulateApi,
  setTerminalSequential,
  runPresetWorkflow,
}: UseWorkflowRunnerPresetsOptions) {
  const [executionPresets, setExecutionPresets] = useState<WorkflowExecutionPreset[]>(() => loadExecutionPresets());
  const [selectedPresetId, setSelectedPresetId] = useState(() => loadExecutionPresets()[0]?.id ?? '');
  const [presetTargetMode, setPresetTargetMode] = useState<WorkflowTargetMode>('selected');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [commandConcurrency, setCommandConcurrency] = useState(4);

  async function runPreset() {
    const preset = executionPresets.find((item) => item.id === selectedPresetId);
    if (!preset) return;
    const nextTargetMode = normalizeTargetMode(preset.targetMode);
    const nextScope = normalizeRunScope(preset.scope);
    const nextCommandConcurrency = normalizeCommandConcurrency(preset.commandConcurrency);
    setWorkflow(preset.workflow);
    setFixture(preset.fixture);
    setSimulateApi(preset.simulateApi);
    setTerminalSequential(preset.sequential);
    setPresetTargetMode(nextTargetMode);
    setTargetGroupId(preset.targetGroupId);
    setCommandConcurrency(nextCommandConcurrency);
    setWorkspaceTab('code');
    const nextDesigner = workflowTextToDesignerModel(preset.workflow);
    setDesigner(nextDesigner);
    setSelectedActionId(preset.actionId ?? nextDesigner.actions[0]?.id ?? '');
    await runPresetWorkflow(preset, nextScope, nextTargetMode, nextCommandConcurrency);
  }

  function selectExecutionPreset(nextPresetId: string) {
    setSelectedPresetId(nextPresetId);
    const nextPreset = executionPresets.find((preset) => preset.id === nextPresetId);
    if (!nextPreset) return;
    setPresetTargetMode(normalizeTargetMode(nextPreset.targetMode));
    setTargetGroupId(nextPreset.targetGroupId);
    setCommandConcurrency(normalizeCommandConcurrency(nextPreset.commandConcurrency));
  }

  function saveCurrentAsPreset() {
    const source = workspaceTab === 'code' ? workflow : designerModelToWorkflowText(designer);
    const nextPreset: WorkflowExecutionPreset = {
      id: `user-${Date.now()}`,
      label: `${designer.name || 'Workflow'} ${new Date().toLocaleTimeString()}`,
      source: 'user',
      workflow: source,
      fixture,
      scope: 'all',
      actionId: selectedActionId || undefined,
      simulateApi,
      sequential: terminalSequential,
      targetMode: presetTargetMode,
      targetGroupId,
      commandConcurrency,
    };
    setExecutionPresets((prev) => {
      const next = [...prev, nextPreset];
      persistExecutionPresets(next);
      return next;
    });
    setSelectedPresetId(nextPreset.id);
  }

  function deleteSelectedPreset() {
    const preset = executionPresets.find((item) => item.id === selectedPresetId);
    if (!preset || preset.source === 'builtin') return;
    setExecutionPresets((prev) => {
      const next = prev.filter((item) => item.id !== preset.id);
      persistExecutionPresets(next);
      setSelectedPresetId(next[0]?.id ?? '');
      return next;
    });
  }

  function setCommandConcurrencyValue(value: unknown) {
    setCommandConcurrency(normalizeCommandConcurrency(value));
  }

  return {
    executionPresets,
    selectedPresetId,
    presetTargetMode,
    setPresetTargetMode,
    targetGroupId,
    setTargetGroupId,
    commandConcurrency,
    setCommandConcurrency,
    setCommandConcurrencyValue,
    runPreset,
    selectExecutionPreset,
    saveCurrentAsPreset,
    deleteSelectedPreset,
  };
}
