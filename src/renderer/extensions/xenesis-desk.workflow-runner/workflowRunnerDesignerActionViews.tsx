import React, { useRef, useState } from 'react';
import {
  ACTION_CATALOG,
  createActionDraft,
  type WorkflowDesignerAction,
  type WorkflowDesignerActionType,
  type WorkflowDesignerBranchKey,
} from './workflowDesigner';
import { WORKFLOW_DESIGNER_BRANCHES } from './workflowRunnerConstants';
import { clampNumber } from './workflowRunnerRuntimeUtils';

const BRANCH_EDITOR_DEFAULT_HEIGHT = 320;
const BRANCH_EDITOR_MIN_HEIGHT = 160;
const BRANCH_EDITOR_MAX_HEIGHT = 760;
const PROPERTY_EDITOR_MIN_HEIGHT = 120;
const PROPERTY_SPLITTER_SIZE = 7;

export function ActionProperties({
  action,
  onUpdateAction,
  onUpdateProp,
  onUpdateChildren,
  onUpdateBranches,
}: {
  action: WorkflowDesignerAction | null;
  onUpdateAction: (id: string, patch: Partial<WorkflowDesignerAction>) => void;
  onUpdateProp: (id: string, key: string, value: string) => void;
  onUpdateChildren: (id: string, children: WorkflowDesignerAction[]) => void;
  onUpdateBranches: (id: string, branches: WorkflowDesignerAction['branches']) => void;
}) {
  const [branchEditorHeight, setBranchEditorHeight] = useState(BRANCH_EDITOR_DEFAULT_HEIGHT);
  const propertiesRef = useRef<HTMLElement | null>(null);
  const propertiesStyle = {
    '--wfr-designer-branch-editor-height': `${branchEditorHeight}px`,
  } as React.CSSProperties;

  function startBranchEditorResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = branchEditorHeight;
    const propertiesHeight = propertiesRef.current?.getBoundingClientRect().height ?? 0;
    const maxHeight = Math.max(
      BRANCH_EDITOR_MIN_HEIGHT,
      Math.min(BRANCH_EDITOR_MAX_HEIGHT, propertiesHeight - PROPERTY_EDITOR_MIN_HEIGHT - PROPERTY_SPLITTER_SIZE),
    );

    function handlePointerMove(moveEvent: PointerEvent) {
      const deltaY = moveEvent.clientY - startY;
      setBranchEditorHeight(clampNumber(startHeight - deltaY, BRANCH_EDITOR_MIN_HEIGHT, maxHeight));
    }

    function cleanupResize() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', cleanupResize);
      window.removeEventListener('pointercancel', cleanupResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', cleanupResize, { once: true });
    window.addEventListener('pointercancel', cleanupResize, { once: true });
  }

  if (!action) {
    return (
      <section className="wfr-properties" ref={propertiesRef} style={propertiesStyle}>
        <div className="wfr-empty-inline">Select or add an action.</div>
      </section>
    );
  }
  return (
    <section className="wfr-properties" ref={propertiesRef} style={propertiesStyle}>
      <div className="wfr-property-editor-scroll">
        <div className="wfr-panel-title">Parameter - {catalogLabel(action.type)}</div>
        <div className="wfr-prop-grid">
          <label>
            <span>ID</span>
            <input
              value={action.id}
              onChange={(event) => onUpdateAction(action.id, { id: event.currentTarget.value })}
            />
          </label>
          <label>
            <span>Label</span>
            <input
              value={action.label}
              onChange={(event) => onUpdateAction(action.id, { label: event.currentTarget.value })}
            />
          </label>
          <label className="wfr-prop-wide">
            <span>Comment</span>
            <input
              value={action.comment}
              onChange={(event) => onUpdateAction(action.id, { comment: event.currentTarget.value })}
            />
          </label>
        </div>
        <div className="wfr-param-table">
          <div className="wfr-param-row wfr-param-head">
            <span>Name</span>
            <span>Value</span>
          </div>
          {Object.entries(action.props)
            .filter(([key]) => !isConditionBranchProp(key))
            .map(([key, value]) => (
              <label key={key} className="wfr-param-row">
                <span>{key}</span>
                {isLongProp(key, value) ? (
                  <textarea
                    value={value}
                    spellCheck={false}
                    onChange={(event) => onUpdateProp(action.id, key, event.currentTarget.value)}
                  />
                ) : (
                  <input value={value} onChange={(event) => onUpdateProp(action.id, key, event.currentTarget.value)} />
                )}
              </label>
            ))}
        </div>
        {action.type === 'condition' ? <ConditionBranchEditor action={action} onUpdateProp={onUpdateProp} /> : null}
      </div>
      <div
        className="wfr-action-property-splitter"
        role="separator"
        aria-label="Resize workflow designer branch actions"
        aria-orientation="horizontal"
        tabIndex={0}
        onPointerDown={startBranchEditorResize}
      />
      <div className="wfr-branch-editor-scroll">
        <BranchActionsEditor action={action} onUpdateBranches={onUpdateBranches} />
        <NestedActionsEditor action={action} onUpdateChildren={onUpdateChildren} />
      </div>
    </section>
  );
}

function NestedActionsEditor({
  action,
  onUpdateChildren,
  depth = 0,
}: {
  action: WorkflowDesignerAction;
  onUpdateChildren: (id: string, children: WorkflowDesignerAction[]) => void;
  depth?: number;
}) {
  if (!isContainerDesignerAction(action)) return null;

  function addChildAction(type: WorkflowDesignerActionType) {
    const draft = createActionDraft(type, (action.children?.length ?? 0) + 1);
    const child = { ...draft, id: `${action.id}_${draft.id}` };
    onUpdateChildren(action.id, [...(action.children ?? []), child]);
  }

  function updateChildAction(childId: string, patch: Partial<WorkflowDesignerAction>) {
    onUpdateChildren(
      action.id,
      (action.children ?? []).map((child) => (child.id === childId ? { ...child, ...patch } : child)),
    );
  }

  function updateChildProp(childId: string, key: string, value: string) {
    onUpdateChildren(
      action.id,
      (action.children ?? []).map((child) =>
        child.id === childId ? { ...child, props: { ...child.props, [key]: value } } : child,
      ),
    );
  }

  function removeChildAction(childId: string) {
    onUpdateChildren(
      action.id,
      (action.children ?? []).filter((child) => child.id !== childId),
    );
  }

  function moveChildAction(childId: string, direction: -1 | 1) {
    const children = [...(action.children ?? [])];
    const index = children.findIndex((child) => child.id === childId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= children.length) return;
    const [child] = children.splice(index, 1);
    children.splice(nextIndex, 0, child);
    onUpdateChildren(action.id, children);
  }

  return (
    <section className={`wfr-nested-actions ${depth > 0 ? 'nested' : ''}`}>
      <div className="wfr-panel-title">Child Actions</div>
      <div className="wfr-nested-toolbar">
        <span>Add Child</span>
        <select
          defaultValue=""
          onChange={(event) => {
            const type = event.currentTarget.value as WorkflowDesignerActionType;
            if (type) addChildAction(type);
            event.currentTarget.value = '';
          }}
        >
          <option value="" disabled>
            Action type
          </option>
          {ACTION_CATALOG.map((item) => (
            <option key={item.type} value={item.type}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {(action.children ?? []).length ? (
        <div className="wfr-nested-action-list">
          {(action.children ?? []).map((child, index) => {
            const primaryKey = primaryPropKeyForAction(child);
            return (
              <div key={child.id} className="wfr-nested-action-item">
                <div className="wfr-nested-action-main wfr-nested-action-row">
                  <input
                    value={child.id}
                    onChange={(event) => updateChildAction(child.id, { id: event.currentTarget.value })}
                  />
                  <select
                    value={child.type}
                    onChange={(event) => {
                      const nextType = event.currentTarget.value as WorkflowDesignerActionType;
                      updateChildAction(child.id, {
                        type: nextType,
                        label: catalogLabel(nextType),
                        props: { ...child.props, ...createActionDraft(nextType, 1).props },
                      });
                    }}
                  >
                    {ACTION_CATALOG.map((item) => (
                      <option key={item.type} value={item.type}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={child.label}
                    onChange={(event) => updateChildAction(child.id, { label: event.currentTarget.value })}
                  />
                  <input
                    value={child.props[primaryKey] ?? ''}
                    onChange={(event) => updateChildProp(child.id, primaryKey, event.currentTarget.value)}
                  />
                  <button type="button" disabled={index === 0} onClick={() => moveChildAction(child.id, -1)}>
                    Move Child Up
                  </button>
                  <button
                    type="button"
                    disabled={index === (action.children ?? []).length - 1}
                    onClick={() => moveChildAction(child.id, 1)}
                  >
                    Move Child Down
                  </button>
                  <button type="button" onClick={() => removeChildAction(child.id)}>
                    Remove Child
                  </button>
                </div>
                {isContainerDesignerAction(child) ? (
                  <NestedActionsEditor
                    action={child}
                    onUpdateChildren={(childActionId, children) => updateChildAction(childActionId, { children })}
                    depth={depth + 1}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="wfr-empty-inline">No child actions.</div>
      )}
    </section>
  );
}

function BranchActionsEditor({
  action,
  onUpdateBranches,
}: {
  action: WorkflowDesignerAction;
  onUpdateBranches: (id: string, branches: WorkflowDesignerAction['branches']) => void;
}) {
  function branchActions(branch: WorkflowDesignerBranchKey): WorkflowDesignerAction[] {
    return action.branches?.[branch] ?? [];
  }

  function setBranchActions(branch: WorkflowDesignerBranchKey, actions: WorkflowDesignerAction[]) {
    const branches: WorkflowDesignerAction['branches'] = { ...(action.branches ?? {}) };
    if (actions.length) {
      branches[branch] = actions;
    } else {
      delete branches[branch];
    }
    onUpdateBranches(action.id, branches);
  }

  function addBranchAction(branch: WorkflowDesignerBranchKey, type: WorkflowDesignerActionType) {
    const actions = branchActions(branch);
    const draft = createActionDraft(type, actions.length + 1);
    const branchAction = { ...draft, id: `${action.id}_${branch}_${draft.id}` };
    setBranchActions(branch, [...actions, branchAction]);
  }

  function updateBranchAction(
    branch: WorkflowDesignerBranchKey,
    branchActionId: string,
    patch: Partial<WorkflowDesignerAction>,
  ) {
    setBranchActions(
      branch,
      branchActions(branch).map((branchAction) =>
        branchAction.id === branchActionId ? { ...branchAction, ...patch } : branchAction,
      ),
    );
  }

  function updateBranchProp(branch: WorkflowDesignerBranchKey, branchActionId: string, key: string, value: string) {
    setBranchActions(
      branch,
      branchActions(branch).map((branchAction) =>
        branchAction.id === branchActionId
          ? { ...branchAction, props: { ...branchAction.props, [key]: value } }
          : branchAction,
      ),
    );
  }

  function removeBranchAction(branch: WorkflowDesignerBranchKey, branchActionId: string) {
    setBranchActions(
      branch,
      branchActions(branch).filter((branchAction) => branchAction.id !== branchActionId),
    );
  }

  function moveBranchAction(branch: WorkflowDesignerBranchKey, branchActionId: string, direction: -1 | 1) {
    const actions = [...branchActions(branch)];
    const index = actions.findIndex((branchAction) => branchAction.id === branchActionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= actions.length) return;
    const [branchAction] = actions.splice(index, 1);
    actions.splice(nextIndex, 0, branchAction);
    setBranchActions(branch, actions);
  }

  return (
    <section className="wfr-branch-actions">
      <div className="wfr-panel-title">Branch Action Lists</div>
      {WORKFLOW_DESIGNER_BRANCHES.map((branch) => {
        const actions = branchActions(branch);
        return (
          <div key={branch} className={`wfr-branch-action-group ${branch}`}>
            <div className="wfr-branch-action-header">
              <strong className={`wfr-action-branch-marker ${branch}`}>{branchActionShortTitle(branch)}</strong>
              <select
                defaultValue=""
                onChange={(event) => {
                  const type = event.currentTarget.value as WorkflowDesignerActionType;
                  if (type) addBranchAction(branch, type);
                  event.currentTarget.value = '';
                }}
              >
                <option value="" disabled>
                  Add Branch Action
                </option>
                {ACTION_CATALOG.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {actions.length ? (
              <div className="wfr-branch-action-list">
                {actions.map((branchAction, index) => {
                  const primaryKey = primaryPropKeyForAction(branchAction);
                  return (
                    <div key={branchAction.id} className="wfr-branch-action-item">
                      <div className="wfr-branch-action-row">
                        <input
                          value={branchAction.id}
                          onChange={(event) =>
                            updateBranchAction(branch, branchAction.id, { id: event.currentTarget.value })
                          }
                        />
                        <select
                          value={branchAction.type}
                          onChange={(event) => {
                            const nextType = event.currentTarget.value as WorkflowDesignerActionType;
                            updateBranchAction(branch, branchAction.id, {
                              type: nextType,
                              label: catalogLabel(nextType),
                              props: { ...branchAction.props, ...createActionDraft(nextType, 1).props },
                              children: createActionDraft(nextType, 1).children,
                            });
                          }}
                        >
                          {ACTION_CATALOG.map((item) => (
                            <option key={item.type} value={item.type}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        <input
                          value={branchAction.label}
                          onChange={(event) =>
                            updateBranchAction(branch, branchAction.id, { label: event.currentTarget.value })
                          }
                        />
                        <input
                          value={branchAction.props[primaryKey] ?? ''}
                          onChange={(event) =>
                            updateBranchProp(branch, branchAction.id, primaryKey, event.currentTarget.value)
                          }
                        />
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveBranchAction(branch, branchAction.id, -1)}
                        >
                          Move Branch Action Up
                        </button>
                        <button
                          type="button"
                          disabled={index === actions.length - 1}
                          onClick={() => moveBranchAction(branch, branchAction.id, 1)}
                        >
                          Move Branch Action Down
                        </button>
                        <button type="button" onClick={() => removeBranchAction(branch, branchAction.id)}>
                          Remove Branch Action
                        </button>
                      </div>
                      {isContainerDesignerAction(branchAction) ? (
                        <NestedActionsEditor
                          action={branchAction}
                          onUpdateChildren={(branchActionId, children) =>
                            updateBranchAction(branch, branchActionId, { children })
                          }
                          depth={1}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="wfr-empty-inline">No branch actions.</div>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function branchActionTitle(branch: WorkflowDesignerBranchKey): string {
  switch (branch) {
    case 'success':
      return 'SUCCESS Actions';
    case 'failure':
      return 'FAILURE Actions';
    case 'catch':
      return 'CATCH Actions';
    case 'finally':
      return 'FINALLY Actions';
    default:
      return `${branch} Actions`;
  }
}

function branchActionShortTitle(branch: WorkflowDesignerBranchKey): string {
  return branchActionTitle(branch).replace(/\s+Actions$/i, '');
}

function ConditionBranchEditor({
  action,
  onUpdateProp,
}: {
  action: WorkflowDesignerAction;
  onUpdateProp: (id: string, key: string, value: string) => void;
}) {
  return (
    <section className="wfr-condition-branches">
      <div className="wfr-panel-title">Condition Branches</div>
      <ConditionBranchFields title="Success branch" action={action} prefix="success" onUpdateProp={onUpdateProp} />
      <ConditionBranchFields title="Failure branch" action={action} prefix="failure" onUpdateProp={onUpdateProp} />
    </section>
  );
}

function ConditionBranchFields({
  title,
  action,
  prefix,
  onUpdateProp,
}: {
  title: string;
  action: WorkflowDesignerAction;
  prefix: 'success' | 'failure';
  onUpdateProp: (id: string, key: string, value: string) => void;
}) {
  const labelKey = `${prefix}Label`;
  const actionTypeKey = `${prefix}ActionType`;
  const messageKey = `${prefix}Message`;
  return (
    <div className={`wfr-condition-branch ${prefix}`}>
      <strong>{title}</strong>
      <label>
        <span>Label</span>
        <input
          value={action.props[labelKey] ?? (prefix === 'success' ? 'SUCCESS' : 'FAILURE')}
          onChange={(event) => onUpdateProp(action.id, labelKey, event.currentTarget.value)}
        />
      </label>
      <label>
        <span>Action</span>
        <select
          value={action.props[actionTypeKey] ?? 'log'}
          onChange={(event) => onUpdateProp(action.id, actionTypeKey, event.currentTarget.value)}
        >
          <option value="log">Log</option>
          <option value="command">SendCommand</option>
          <option value="shell">RunShell</option>
          <option value="playwrightSnapshot">PlaywrightSnapshot</option>
          <option value="playwrightRun">PlaywrightRun</option>
          <option value="formula">Formula</option>
          <option value="saveData">SaveData</option>
          <option value="toast">Toast</option>
          <option value="alert">Alert</option>
          <option value="note">Note</option>
        </select>
      </label>
      <label className="wfr-condition-message">
        <span>Message / Command</span>
        <textarea
          value={action.props[messageKey] ?? action.props[labelKey] ?? ''}
          spellCheck={false}
          onChange={(event) => onUpdateProp(action.id, messageKey, event.currentTarget.value)}
        />
      </label>
    </div>
  );
}

export function summarizeDesignerBranches(
  action: WorkflowDesignerAction,
): Partial<Record<WorkflowDesignerBranchKey, string>> {
  const summaries: Partial<Record<WorkflowDesignerBranchKey, string>> = {};
  for (const branch of WORKFLOW_DESIGNER_BRANCHES) {
    const summary = summarizeBranchActions(action, branch);
    if (summary) summaries[branch] = summary;
  }
  return summaries;
}

export function summarizeBranchActions(action: WorkflowDesignerAction, branch: WorkflowDesignerBranchKey): string {
  const branchActions = action.branches?.[branch] ?? [];
  if (branchActions.length) {
    const labels = branchActions
      .filter((branchAction) => branchAction.enabled)
      .slice(0, 3)
      .map((branchAction) => `${catalogLabel(branchAction.type)}:${branchAction.label || branchAction.id}`);
    const suffix = branchActions.length > labels.length ? ` +${branchActions.length - labels.length}` : '';
    return `${branchActions.length} actions: ${labels.join(', ')}${suffix}`;
  }
  if (action.type !== 'condition' || (branch !== 'success' && branch !== 'failure')) return '';
  const label = action.props[`${branch}Label`] || (branch === 'success' ? 'SUCCESS' : 'FAILURE');
  const type = (action.props[`${branch}ActionType`] as WorkflowDesignerActionType) || 'log';
  const message = action.props[`${branch}Message`] || label;
  return `${label}: ${catalogLabel(type)} ${message}`;
}

export function hasBranchActionLists(action: WorkflowDesignerAction): boolean {
  return WORKFLOW_DESIGNER_BRANCHES.some((branch) => (action.branches?.[branch] ?? []).length > 0);
}

export function primaryPropKeyForAction(action: WorkflowDesignerAction): string {
  switch (action.type) {
    case 'batch':
      return 'mode';
    case 'workqueue':
      return 'items';
    case 'scheduler':
      return 'mode';
    case 'command':
    case 'shell':
      return 'command';
    case 'fileTransfer':
      return action.props.localPath !== undefined ? 'localPath' : 'sourcePath';
    case 'playwrightSnapshot':
      return 'url';
    case 'playwrightRun':
      return 'actions';
    case 'formula':
      return 'expr';
    case 'condition':
      return 'test';
    case 'loop':
      return 'data';
    case 'saveData':
      return 'key';
    case 'sleep':
      return 'duration';
    case 'callApi':
      return 'url';
    case 'note':
    case 'toast':
    case 'alert':
      return 'message';
    case 'log':
      return 'message';
    default:
      return Object.keys(action.props)[0] ?? 'value';
  }
}

function isContainerDesignerAction(action: WorkflowDesignerAction): boolean {
  return (
    action.type === 'batch' || action.type === 'workqueue' || action.type === 'scheduler' || action.type === 'loop'
  );
}

export function catalogLabel(type: WorkflowDesignerActionType): string {
  return ACTION_CATALOG.find((item) => item.type === type)?.label ?? type;
}

export function formatPropsSummary(action: WorkflowDesignerAction): string {
  const keys = Object.keys(action.props);
  if (!keys.length) return '-';
  return keys
    .slice(0, 4)
    .map((key) => (action.props[key] ? 'Y' : '?'))
    .join(', ');
}

export function isConditionBranchProp(key: string): boolean {
  return [
    'successLabel',
    'failureLabel',
    'successActionType',
    'failureActionType',
    'successMessage',
    'failureMessage',
  ].includes(key);
}

function isLongProp(key: string, value: string): boolean {
  return (
    [
      'command',
      'expr',
      'test',
      'message',
      'data',
      'parameter',
      'payload',
      'url',
      'actions',
      'selector',
      'allowedHosts',
      'sourcePath',
      'targetPath',
      'localPath',
      'remotePath',
    ].includes(key) || value.length > 72
  );
}
