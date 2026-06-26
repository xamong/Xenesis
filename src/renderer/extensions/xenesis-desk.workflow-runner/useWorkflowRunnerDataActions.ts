import type { Dispatch, SetStateAction } from 'react';
import { useWorkflowRunnerFiles } from './useWorkflowRunnerFiles';
import { useWorkflowRunnerReports } from './useWorkflowRunnerReports';
import { useWorkflowRunnerTemplates } from './useWorkflowRunnerTemplates';
import type { WorkflowDesignerModel } from './workflowDesigner';
import type { WorkflowRunResult } from './workflowEngine';
import type { WorkflowExecutionHistoryItem, WorkflowTerminalCommandStatus, WorkspaceTab } from './workflowRunnerTypes';

interface UseWorkflowRunnerDataActionsOptions {
  designer: WorkflowDesignerModel;
  workflow: string;
  fixture: string;
  workspaceTab: WorkspaceTab;
  result: WorkflowRunResult | null;
  visibleHistoryItem?: WorkflowExecutionHistoryItem;
  commandStatuses: WorkflowTerminalCommandStatus[];
  setWorkflow: Dispatch<SetStateAction<string>>;
  setFixture: Dispatch<SetStateAction<string>>;
  setDesigner: Dispatch<SetStateAction<WorkflowDesignerModel>>;
  setWorkspaceTab: Dispatch<SetStateAction<WorkspaceTab>>;
  setSelectedActionId: Dispatch<SetStateAction<string>>;
  setResult: Dispatch<SetStateAction<WorkflowRunResult | null>>;
  setError: Dispatch<SetStateAction<string>>;
  setExportStatus: Dispatch<SetStateAction<string>>;
}

export function useWorkflowRunnerDataActions({
  designer,
  workflow,
  fixture,
  workspaceTab,
  result,
  visibleHistoryItem,
  commandStatuses,
  setWorkflow,
  setFixture,
  setDesigner,
  setWorkspaceTab,
  setSelectedActionId,
  setResult,
  setError,
  setExportStatus,
}: UseWorkflowRunnerDataActionsOptions) {
  const {
    workflowFileStatus,
    setWorkflowFileStatus,
    openWorkflowFile,
    exportWorkflowFile,
    loadSample,
    loadDesignerSample,
    loadDiagramSample,
    applyDesignerToSketch,
    loadDesignerFromSketch,
  } = useWorkflowRunnerFiles({
    designer,
    workflow,
    workspaceTab,
    setWorkflow,
    setDesigner,
    setWorkspaceTab,
    setSelectedActionId,
    setResult,
    setError,
    setExportStatus,
  });
  const { saveVisibleResultLog, saveVisibleResultReport } = useWorkflowRunnerReports({
    result,
    visibleHistoryItem,
    commandStatuses,
    setExportStatus,
  });
  const {
    workflowTemplates,
    templateStatus,
    saveCurrentAsTemplate,
    applyWorkflowTemplate,
    toggleWorkflowTemplateFavorite,
    deleteWorkflowTemplate,
  } = useWorkflowRunnerTemplates({
    designer,
    workflow,
    fixture,
    workspaceTab,
    setWorkflow,
    setFixture,
    setDesigner,
    setSelectedActionId,
    setResult,
    setError,
    setExportStatus,
    setWorkflowFileStatus,
    setWorkspaceTab,
  });

  return {
    workflowFileStatus,
    setWorkflowFileStatus,
    openWorkflowFile,
    exportWorkflowFile,
    loadSample,
    loadDesignerSample,
    loadDiagramSample,
    applyDesignerToSketch,
    loadDesignerFromSketch,
    saveVisibleResultLog,
    saveVisibleResultReport,
    workflowTemplates,
    templateStatus,
    saveCurrentAsTemplate,
    applyWorkflowTemplate,
    toggleWorkflowTemplateFavorite,
    deleteWorkflowTemplate,
  };
}
