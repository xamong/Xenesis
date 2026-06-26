import { type Dispatch, type SetStateAction, useState } from 'react';
import {
  createDefaultDesignerModel,
  designerModelToWorkflowText,
  type WorkflowDesignerModel,
  workflowTextToDesignerModel,
} from './workflowDesigner';
import { diagramToWorkflowSketch } from './workflowDiagram';
import type { WorkflowRunResult } from './workflowEngine';
import { SAMPLE_DIAGRAM, SAMPLES } from './workflowRunnerConstants';
import { createWorkflowFileName, inferWorkflowNameFromText } from './workflowRunnerRuntimeUtils';
import type { WorkspaceTab } from './workflowRunnerTypes';

interface UseWorkflowRunnerFilesOptions {
  designer: WorkflowDesignerModel;
  workflow: string;
  workspaceTab: WorkspaceTab;
  setWorkflow: Dispatch<SetStateAction<string>>;
  setDesigner: Dispatch<SetStateAction<WorkflowDesignerModel>>;
  setWorkspaceTab: Dispatch<SetStateAction<WorkspaceTab>>;
  setSelectedActionId: Dispatch<SetStateAction<string>>;
  setResult: Dispatch<SetStateAction<WorkflowRunResult | null>>;
  setError: Dispatch<SetStateAction<string>>;
  setExportStatus: Dispatch<SetStateAction<string>>;
}

export function useWorkflowRunnerFiles({
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
}: UseWorkflowRunnerFilesOptions) {
  const [workflowFileStatus, setWorkflowFileStatus] = useState('');

  async function openWorkflowFile() {
    setWorkflowFileStatus('');
    try {
      const file = await window.fileAPI.openFile();
      if (!file) {
        setWorkflowFileStatus('Open canceled');
        return;
      }
      const nextWorkflow = file.content;
      const nextDesigner = workflowTextToDesignerModel(nextWorkflow);
      setWorkflow(nextWorkflow);
      setDesigner(nextDesigner);
      setSelectedActionId(nextDesigner.actions[0]?.id ?? '');
      setResult(null);
      setError('');
      setExportStatus('');
      setWorkspaceTab('code');
      setWorkflowFileStatus(`Opened: ${file.fileName}`);
    } catch (openError) {
      setWorkflowFileStatus(`Open failed: ${openError instanceof Error ? openError.message : String(openError)}`);
    }
  }

  async function exportWorkflowFile() {
    const source = workspaceTab === 'code' ? workflow : designerModelToWorkflowText(designer);
    const workflowName = workspaceTab === 'code' ? inferWorkflowNameFromText(source, designer.name) : designer.name;
    setWorkflow(source);
    setWorkflowFileStatus('');
    try {
      const saveResult = await window.fileAPI.saveTextAs({
        defaultName: createWorkflowFileName(workflowName),
        content: source,
        filters: [
          { name: 'XCON Workflow', extensions: ['xcon-workflow'] },
          { name: 'XCON / SKETCH', extensions: ['xcon', 'workflow', 'txt'] },
          { name: 'All files', extensions: ['*'] },
        ],
      });
      setWorkflowFileStatus(saveResult.saved ? `Exported: ${saveResult.path ?? 'workflow file'}` : 'Export canceled');
    } catch (saveError) {
      setWorkflowFileStatus(`Export failed: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
    }
  }

  function loadSample(id: string) {
    const sample = SAMPLES.find((item) => item.id === id);
    if (!sample) return;
    setWorkflow(sample.workflow);
    const nextDesigner = workflowTextToDesignerModel(sample.workflow);
    setDesigner(nextDesigner);
    setSelectedActionId(nextDesigner.actions[0]?.id ?? '');
    setResult(null);
    setError('');
    setExportStatus('');
    setWorkflowFileStatus('');
  }

  function loadDesignerSample() {
    const nextDesigner = createDefaultDesignerModel();
    setDesigner(nextDesigner);
    setSelectedActionId(nextDesigner.actions[0]?.id ?? '');
    setWorkflow(designerModelToWorkflowText(nextDesigner));
    setResult(null);
    setError('');
    setExportStatus('');
    setWorkflowFileStatus('');
  }

  function loadDiagramSample() {
    const nextWorkflow = diagramToWorkflowSketch(SAMPLE_DIAGRAM);
    setWorkflow(nextWorkflow);
    const nextDesigner = workflowTextToDesignerModel(nextWorkflow);
    setDesigner(nextDesigner);
    setSelectedActionId(nextDesigner.actions[0]?.id ?? '');
    setResult(null);
    setError('');
    setExportStatus('');
    setWorkflowFileStatus('');
  }

  function applyDesignerToSketch() {
    setWorkflow(designerModelToWorkflowText(designer));
    setWorkspaceTab('code');
  }

  function loadDesignerFromSketch() {
    const nextDesigner = workflowTextToDesignerModel(workflow);
    setDesigner(nextDesigner);
    setSelectedActionId(nextDesigner.actions[0]?.id ?? '');
    setWorkspaceTab('designer');
  }

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
  };
}
