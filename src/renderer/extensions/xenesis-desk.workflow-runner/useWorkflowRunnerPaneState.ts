import { useState } from 'react';
import {
  createDefaultDesignerModel,
  designerModelToWorkflowText,
  type WorkflowDesignerModel,
} from './workflowDesigner';
import { DEFAULT_FIXTURE } from './workflowRunnerConstants';
import type { ResultTab, WorkspaceTab } from './workflowRunnerTypes';

export function useWorkflowRunnerPaneState() {
  const [designer, setDesigner] = useState<WorkflowDesignerModel>(() => createDefaultDesignerModel());
  const [selectedActionId, setSelectedActionId] = useState(() => createDefaultDesignerModel().actions[0]?.id ?? '');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('designer');
  const [workflow, setWorkflow] = useState(() => designerModelToWorkflowText(createDefaultDesignerModel()));
  const [fixture, setFixture] = useState(JSON.stringify(DEFAULT_FIXTURE, null, 2));
  const [simulateApi, setSimulateApi] = useState(true);
  const [tab, setTab] = useState<ResultTab>('summary');
  const [exportStatus, setExportStatus] = useState('');

  return {
    designer,
    setDesigner,
    selectedActionId,
    setSelectedActionId,
    workspaceTab,
    setWorkspaceTab,
    workflow,
    setWorkflow,
    fixture,
    setFixture,
    simulateApi,
    setSimulateApi,
    tab,
    setTab,
    exportStatus,
    setExportStatus,
  };
}
