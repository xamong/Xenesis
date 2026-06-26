import { type CSSProperties, useState } from 'react';
import {
  ACTION_CATALOG,
  createActionDraft,
  type WorkflowDesignerAction,
  type WorkflowDesignerActionType,
  type WorkflowDesignerBranchKey,
} from './workflowDesigner';
import { WORKFLOW_DESIGNER_BRANCHES } from './workflowRunnerConstants';
import { branchActionTitle, catalogLabel, formatPropsSummary } from './workflowRunnerDesignerActionViews';

interface WorkflowActionOutlineItem {
  id: string;
  kind: 'action' | 'branch';
  depth: number;
  action?: WorkflowDesignerAction;
  branch?: WorkflowDesignerBranchKey;
  parentId?: string;
  rootIndex?: number;
}

const CONDITION_BRANCH_ADD_TARGETS: Array<{ branch: WorkflowDesignerBranchKey; label: string }> = [
  { branch: 'success', label: 'Add Success Action' },
  { branch: 'failure', label: 'Add Failure Action' },
  { branch: 'finally', label: 'Add Finally Action' },
];

export function buildWorkflowActionOutline(actions: WorkflowDesignerAction[]): WorkflowActionOutlineItem[] {
  const items: WorkflowActionOutlineItem[] = [];
  actions.forEach((action, index) => appendWorkflowActionOutlineItems(items, action, 0, index));
  return items;
}

function appendWorkflowActionOutlineItems(
  items: WorkflowActionOutlineItem[],
  action: WorkflowDesignerAction,
  depth: number,
  rootIndex?: number,
  parentId?: string,
  branch?: WorkflowDesignerBranchKey,
) {
  items.push({
    id: action.id,
    kind: 'action',
    depth,
    action,
    parentId,
    branch,
    rootIndex,
  });

  for (const branchKey of WORKFLOW_DESIGNER_BRANCHES) {
    const branchActions = action.branches?.[branchKey] ?? [];
    if (!branchActions.length) continue;
    items.push({
      id: `${action.id}:${branchKey}`,
      kind: 'branch',
      depth: depth + 1,
      branch: branchKey,
      parentId: action.id,
    });
    branchActions.forEach((branchAction) => {
      appendWorkflowActionOutlineItems(items, branchAction, depth + 2, undefined, action.id, branchKey);
    });
  }

  for (const child of action.children ?? []) {
    appendWorkflowActionOutlineItems(items, child, depth + 1, undefined, action.id);
  }
}

function outlineStyle(depth: number): CSSProperties {
  return { '--wfr-outline-offset': `${Math.max(0, depth) * 22}px` } as CSSProperties;
}

function branchMarkerLabel(branch?: WorkflowDesignerBranchKey): string {
  return branch ? branchActionTitle(branch).replace(/\s+Actions$/i, '') : 'Branch';
}

function addConditionBranchAction(
  action: WorkflowDesignerAction,
  branch: WorkflowDesignerBranchKey,
  type: WorkflowDesignerActionType,
  onUpdateBranches: (id: string, branches: WorkflowDesignerAction['branches']) => void,
): string {
  const branchActions = action.branches?.[branch] ?? [];
  const draft = createActionDraft(type, branchActions.length + 1);
  const branchAction = { ...draft, id: `${action.id}_${branch}_${draft.id}` };
  const branches: WorkflowDesignerAction['branches'] = { ...(action.branches ?? {}) };
  branches[branch] = [...branchActions, branchAction];
  onUpdateBranches(action.id, branches);
  return branchAction.id;
}

export function ActionTable({
  actions,
  selectedActionId,
  onSelectAction,
  onUpdateAction,
  onUpdateBranches,
  onRemoveAction,
  onMoveAction,
  onReorderAction,
}: {
  actions: WorkflowDesignerAction[];
  selectedActionId: string;
  onSelectAction: (id: string) => void;
  onUpdateAction: (id: string, patch: Partial<WorkflowDesignerAction>) => void;
  onUpdateBranches: (id: string, branches: WorkflowDesignerAction['branches']) => void;
  onRemoveAction: (id: string) => void;
  onMoveAction: (id: string, direction: -1 | 1) => void;
  onReorderAction: (id: string, targetId: string) => void;
}) {
  const [draggedActionId, setDraggedActionId] = useState('');
  const [dragOverActionId, setDragOverActionId] = useState('');
  const outlineItems = buildWorkflowActionOutline(actions);

  return (
    <section className="wfr-action-list">
      <div className="wfr-action-toolbar">
        <span>Action Sequence</span>
        <span>
          {actions.filter((action) => action.enabled).length}/{actions.length} enabled
        </span>
      </div>
      <div className="wfr-action-table">
        <div className="wfr-action-row wfr-action-row-head">
          <span>On</span>
          <span>Action</span>
          <span>Parameter</span>
          <span>ID</span>
          <span>Comment</span>
          <span>Order</span>
        </div>
        {outlineItems.map((item) => {
          if (item.kind === 'branch') {
            return (
              <div key={item.id} className="wfr-action-branch-row" style={outlineStyle(item.depth)}>
                <span className="wfr-action-branch-line" />
                <span className={`wfr-action-branch-marker ${item.branch ?? ''}`}>
                  {branchMarkerLabel(item.branch)}
                </span>
                <small>{item.parentId}</small>
              </div>
            );
          }
          const action = item.action;
          if (!action) return null;
          const isRootAction = item.depth === 0;
          const branchTools =
            action.type === 'condition' ? (
              <span className="wfr-condition-branch-tools" aria-label={`Add branch action under ${action.id}`}>
                {CONDITION_BRANCH_ADD_TARGETS.map(({ branch, label }) => (
                  <select
                    key={branch}
                    aria-label={label}
                    defaultValue=""
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      const type = event.currentTarget.value as WorkflowDesignerActionType;
                      if (type) {
                        const branchActionId = addConditionBranchAction(action, branch, type, onUpdateBranches);
                        onSelectAction(branchActionId);
                      }
                      event.currentTarget.value = '';
                    }}
                  >
                    <option value="" disabled>
                      {label}
                    </option>
                    {ACTION_CATALOG.map((item) => (
                      <option key={item.type} value={item.type}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                ))}
              </span>
            ) : null;
          return (
            <div
              key={action.id}
              role="button"
              tabIndex={0}
              draggable={isRootAction}
              style={outlineStyle(item.depth)}
              className={`wfr-action-row${selectedActionId === action.id ? ' active' : ''}${item.depth > 0 ? ' nested' : ''}${draggedActionId === action.id ? ' dragging' : ''}${dragOverActionId === action.id && draggedActionId !== action.id ? ' drag-over' : ''}`}
              onClick={() => onSelectAction(action.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectAction(action.id);
                }
              }}
              onDragStart={
                isRootAction
                  ? (event) => {
                      setDraggedActionId(action.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', action.id);
                    }
                  : undefined
              }
              onDragOver={
                isRootAction
                  ? (event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setDragOverActionId(action.id);
                    }
                  : undefined
              }
              onDragLeave={
                isRootAction
                  ? () => {
                      if (dragOverActionId === action.id) setDragOverActionId('');
                    }
                  : undefined
              }
              onDrop={
                isRootAction
                  ? (event) => {
                      event.preventDefault();
                      const draggedId = event.dataTransfer.getData('text/plain') || draggedActionId;
                      if (draggedId) onReorderAction(draggedId, action.id);
                      setDraggedActionId('');
                      setDragOverActionId('');
                    }
                  : undefined
              }
              onDragEnd={
                isRootAction
                  ? () => {
                      setDraggedActionId('');
                      setDragOverActionId('');
                    }
                  : undefined
              }
            >
              <span>
                <input
                  type="checkbox"
                  checked={action.enabled}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onUpdateAction(action.id, { enabled: event.currentTarget.checked })}
                />
              </span>
              <span>{catalogLabel(action.type)}</span>
              <span title={formatPropsSummary(action)}>{formatPropsSummary(action)}</span>
              <span>{action.id}</span>
              <span className="wfr-action-comment-cell">
                {action.comment ? <span>{action.comment}</span> : null}
                {branchTools}
              </span>
              <span className="wfr-row-actions">
                {isRootAction ? (
                  <>
                    <button
                      type="button"
                      disabled={item.rootIndex === 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onMoveAction(action.id, -1);
                      }}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={item.rootIndex === actions.length - 1}
                      onClick={(event) => {
                        event.stopPropagation();
                        onMoveAction(action.id, 1);
                      }}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveAction(action.id);
                      }}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <span className="wfr-row-badge">{item.branch ? item.branch.toUpperCase() : 'Nested'}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ActionNavigator({
  actions,
  selectedActionId,
  onSelectAction,
}: {
  actions: WorkflowDesignerAction[];
  selectedActionId: string;
  onSelectAction: (id: string) => void;
}) {
  const outlineItems = buildWorkflowActionOutline(actions);

  return (
    <section className="wfr-action-navigator">
      <div className="wfr-action-toolbar">
        <span>Actions</span>
        <span>
          {actions.filter((action) => action.enabled).length}/{actions.length} enabled
        </span>
      </div>
      <div className="wfr-action-nav-list">
        {outlineItems.length ? (
          outlineItems.map((item, index) => {
            if (item.kind === 'branch') {
              return (
                <div key={item.id} className="wfr-action-nav-branch" style={outlineStyle(item.depth)}>
                  <span className="wfr-action-branch-line" />
                  <span className={`wfr-action-branch-marker ${item.branch ?? ''}`}>
                    {branchMarkerLabel(item.branch)}
                  </span>
                </div>
              );
            }
            const action = item.action;
            if (!action) return null;
            return (
              <button
                key={action.id}
                type="button"
                style={outlineStyle(item.depth)}
                className={`wfr-action-nav-item${selectedActionId === action.id ? ' active' : ''}${item.depth > 0 ? ' nested' : ''}${action.enabled ? '' : ' disabled'}`}
                onClick={() => onSelectAction(action.id)}
                title={formatPropsSummary(action)}
              >
                <span className="wfr-action-nav-index">{item.depth === 0 ? (item.rootIndex ?? index) + 1 : ''}</span>
                <span className="wfr-action-nav-main">
                  <strong>{catalogLabel(action.type)}</strong>
                  <span>{action.label || action.id}</span>
                  <small>{formatPropsSummary(action)}</small>
                </span>
              </button>
            );
          })
        ) : (
          <div className="wfr-empty-inline">No actions.</div>
        )}
      </div>
    </section>
  );
}
