import type { Dispatch, SetStateAction } from 'react';
import {
  createActionDraft,
  updateDesignerActionTree,
  type WorkflowDesignerAction,
  type WorkflowDesignerActionType,
  type WorkflowDesignerModel,
} from './workflowDesigner';

interface UseWorkflowRunnerDesignerActionsOptions {
  selectedActionId: string;
  setDesigner: Dispatch<SetStateAction<WorkflowDesignerModel>>;
  setSelectedActionId: Dispatch<SetStateAction<string>>;
}

export function useWorkflowRunnerDesignerActions({
  selectedActionId,
  setDesigner,
  setSelectedActionId,
}: UseWorkflowRunnerDesignerActionsOptions) {
  function patchDesigner(patch: Partial<WorkflowDesignerModel>) {
    setDesigner((prev) => ({ ...prev, ...patch }));
  }

  function addAction(type: WorkflowDesignerActionType) {
    setDesigner((prev) => {
      const action = createActionDraft(type, prev.actions.length + 1);
      setSelectedActionId(action.id);
      return { ...prev, actions: [...prev.actions, action] };
    });
  }

  function updateAction(actionId: string, patch: Partial<WorkflowDesignerAction>) {
    if (patch.id && actionId === selectedActionId) setSelectedActionId(patch.id);
    setDesigner((prev) => ({
      ...prev,
      actions: updateDesignerActionTree(prev.actions, actionId, (action) => ({ ...action, ...patch })),
    }));
  }

  function updateActionProp(actionId: string, key: string, value: string) {
    setDesigner((prev) => ({
      ...prev,
      actions: updateDesignerActionTree(prev.actions, actionId, (action) => ({
        ...action,
        props: { ...action.props, [key]: value },
      })),
    }));
  }

  function updateActionChildren(actionId: string, children: WorkflowDesignerAction[]) {
    setDesigner((prev) => ({
      ...prev,
      actions: updateDesignerActionTree(prev.actions, actionId, (action) => ({ ...action, children })),
    }));
  }

  function updateActionBranches(actionId: string, branches: WorkflowDesignerAction['branches']) {
    setDesigner((prev) => ({
      ...prev,
      actions: updateDesignerActionTree(prev.actions, actionId, (action) => ({ ...action, branches })),
    }));
  }

  function removeAction(actionId: string) {
    setDesigner((prev) => {
      const actions = prev.actions.filter((action) => action.id !== actionId);
      if (selectedActionId === actionId) setSelectedActionId(actions[0]?.id ?? '');
      return { ...prev, actions };
    });
  }

  function moveAction(actionId: string, direction: -1 | 1) {
    setDesigner((prev) => {
      const index = prev.actions.findIndex((action) => action.id === actionId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.actions.length) return prev;
      const actions = [...prev.actions];
      const [item] = actions.splice(index, 1);
      actions.splice(nextIndex, 0, item);
      return { ...prev, actions };
    });
  }

  function moveActionTo(actionId: string, targetActionId: string) {
    if (!actionId || !targetActionId || actionId === targetActionId) return;
    setDesigner((prev) => {
      const fromIndex = prev.actions.findIndex((action) => action.id === actionId);
      const targetIndex = prev.actions.findIndex((action) => action.id === targetActionId);
      if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return prev;
      const actions = [...prev.actions];
      const [item] = actions.splice(fromIndex, 1);
      const insertIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
      actions.splice(insertIndex, 0, item);
      setSelectedActionId(actionId);
      return { ...prev, actions };
    });
  }

  return {
    patchDesigner,
    addAction,
    updateAction,
    updateActionProp,
    updateActionChildren,
    updateActionBranches,
    removeAction,
    moveAction,
    moveActionTo,
  };
}
