import { useEffect } from 'react';
import {
  consumeStoredWorkflowDraftHandoff,
  parseWorkflowDraftHandoff,
  WORKFLOW_DRAFT_HANDOFF_EVENT,
  WORKFLOW_DRAFT_HANDOFF_STORAGE_KEY,
  type WorkflowDraftHandoff,
} from '../../utils/workflowDraftHandoff';
import { type WorkflowDesignerModel, workflowTextToDesignerModel } from './workflowDesigner';
import type { WorkspaceTab } from './workflowRunnerTypes';

interface UseWorkflowRunnerDraftHandoffOptions {
  setWorkflow: (value: string) => void;
  setDesigner: (value: WorkflowDesignerModel) => void;
  setSelectedActionId: (value: string) => void;
  setWorkspaceTab: (value: WorkspaceTab) => void;
  setWorkflowFileStatus: (value: string) => void;
}

export function useWorkflowRunnerDraftHandoff({
  setWorkflow,
  setDesigner,
  setSelectedActionId,
  setWorkspaceTab,
  setWorkflowFileStatus,
}: UseWorkflowRunnerDraftHandoffOptions): void {
  function applyWorkflowDraftHandoff(handoff: WorkflowDraftHandoff | null): void {
    if (!handoff?.workflow.trim()) return;
    const nextDesigner = workflowTextToDesignerModel(handoff.workflow);
    setWorkflow(handoff.workflow);
    setDesigner(nextDesigner);
    setSelectedActionId(handoff.selectedActionId || nextDesigner.actions[0]?.id || '');
    setWorkspaceTab('designer');
    setWorkflowFileStatus(
      `Workflow draft loaded: ${handoff.label} (${handoff.commandCount} command${handoff.commandCount === 1 ? '' : 's'}).`,
    );
  }

  useEffect(() => {
    const storedHandoff = consumeStoredWorkflowDraftHandoff();
    if (storedHandoff) {
      window.localStorage.removeItem(WORKFLOW_DRAFT_HANDOFF_STORAGE_KEY);
      applyWorkflowDraftHandoff(storedHandoff);
    }
    const handleWorkflowDraftHandoff = (event: Event) => {
      const handoff = parseWorkflowDraftHandoff((event as CustomEvent).detail);
      window.localStorage.removeItem(WORKFLOW_DRAFT_HANDOFF_STORAGE_KEY);
      applyWorkflowDraftHandoff(handoff);
    };
    window.addEventListener(WORKFLOW_DRAFT_HANDOFF_EVENT, handleWorkflowDraftHandoff);
    return () => window.removeEventListener(WORKFLOW_DRAFT_HANDOFF_EVENT, handleWorkflowDraftHandoff);
  }, []);
}
