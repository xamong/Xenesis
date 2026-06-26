import { useMemo, useState } from 'react';
import {
  designerModelToWorkflowText,
  findDesignerActionById,
  type WorkflowDesignerAction,
  type WorkflowDesignerActionType,
  type WorkflowDesignerModel,
} from './workflowDesigner';
import { ActionProperties, isConditionBranchProp, primaryPropKeyForAction } from './workflowRunnerDesignerActionViews';
import {
  buildDesignerFlowMap,
  DesignerBranchMap,
  DesignerFlowMap,
  QuickParameterPanel,
} from './workflowRunnerDesignerFlowViews';
import { DesignerMeta } from './workflowRunnerDesignerMetaViews';
import { ActionPalette } from './workflowRunnerDesignerPaletteViews';
import { ActionNavigator, ActionTable } from './workflowRunnerDesignerTableViews';
import { VariablePanel } from './workflowRunnerDesignerVariableViews';

type WorkflowDesignerMode = 'build' | 'configure' | 'map' | 'variables';

const DESIGNER_MODES: Array<{ id: WorkflowDesignerMode; label: string; detail: string }> = [
  { id: 'build', label: 'Build', detail: 'Actions' },
  { id: 'configure', label: 'Configure', detail: 'Selected action' },
  { id: 'map', label: 'Map', detail: 'Flow and branches' },
  { id: 'variables', label: 'Variables', detail: 'Profiles and tokens' },
];

export function WorkflowDesignerView({
  model,
  selectedActionId,
  onSelectAction,
  onMetaChange,
  onAddAction,
  onUpdateAction,
  onUpdateActionProp,
  onUpdateChildren,
  onUpdateBranches,
  onRemoveAction,
  onMoveAction,
  onReorderAction,
}: {
  model: WorkflowDesignerModel;
  selectedActionId: string;
  onSelectAction: (id: string) => void;
  onMetaChange: (patch: Partial<WorkflowDesignerModel>) => void;
  onAddAction: (type: WorkflowDesignerActionType) => void;
  onUpdateAction: (id: string, patch: Partial<WorkflowDesignerAction>) => void;
  onUpdateActionProp: (id: string, key: string, value: string) => void;
  onUpdateChildren: (id: string, children: WorkflowDesignerAction[]) => void;
  onUpdateBranches: (id: string, branches: WorkflowDesignerAction['branches']) => void;
  onRemoveAction: (id: string) => void;
  onMoveAction: (id: string, direction: -1 | 1) => void;
  onReorderAction: (id: string, targetId: string) => void;
}) {
  const [designerMode, setDesignerMode] = useState<WorkflowDesignerMode>('build');
  const selectedAction = findDesignerActionById(model.actions, selectedActionId) ?? model.actions[0] ?? null;
  const flowMap = useMemo(() => buildDesignerFlowMap(model.actions), [model.actions]);
  const workflowSource = useMemo(() => designerModelToWorkflowText(model), [model]);
  const selectedFlowMapNode = flowMap.find((node) => node.id === selectedAction?.id) ?? null;

  return (
    <div className="wfr-designer">
      <div className="wfr-designer-modebar">
        <div className="wfr-designer-mode-tabs" role="tablist" aria-label="Workflow designer workspaces">
          {DESIGNER_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={designerMode === mode.id}
              className={designerMode === mode.id ? 'active' : ''}
              onClick={() => setDesignerMode(mode.id)}
            >
              <span>{mode.label}</span>
              <small>{mode.detail}</small>
            </button>
          ))}
        </div>
        <div className="wfr-designer-context">
          <span>Selected</span>
          <strong>{selectedAction ? `${selectedAction.id} - ${selectedAction.label}` : 'No action selected'}</strong>
          <small>
            {model.actions.filter((action) => action.enabled).length}/{model.actions.length} enabled
          </small>
          {designerMode !== 'configure' ? (
            <button type="button" disabled={!selectedAction} onClick={() => setDesignerMode('configure')}>
              Edit Selected
            </button>
          ) : null}
        </div>
      </div>

      <div className="wfr-designer-workspace">
        {designerMode === 'build' ? (
          <div className="wfr-designer-build">
            <ActionPalette onAddAction={onAddAction} />
            <div className="wfr-designer-build-main">
              <DesignerMeta model={model} onChange={onMetaChange} />
              <ActionTable
                actions={model.actions}
                selectedActionId={selectedAction?.id ?? ''}
                onSelectAction={onSelectAction}
                onUpdateAction={onUpdateAction}
                onUpdateBranches={onUpdateBranches}
                onRemoveAction={onRemoveAction}
                onMoveAction={onMoveAction}
                onReorderAction={onReorderAction}
              />
              <QuickParameterPanel
                action={selectedAction}
                flowNode={selectedFlowMapNode}
                onUpdateAction={onUpdateAction}
                onUpdateProp={onUpdateActionProp}
              />
            </div>
          </div>
        ) : designerMode === 'configure' ? (
          <div className="wfr-designer-configure">
            <ActionNavigator
              actions={model.actions}
              selectedActionId={selectedAction?.id ?? ''}
              onSelectAction={onSelectAction}
            />
            <div className="wfr-designer-configure-main">
              <QuickParameterPanel
                action={selectedAction}
                flowNode={selectedFlowMapNode}
                onUpdateAction={onUpdateAction}
                onUpdateProp={onUpdateActionProp}
              />
              <ActionProperties
                action={selectedAction}
                onUpdateAction={onUpdateAction}
                onUpdateProp={onUpdateActionProp}
                onUpdateChildren={onUpdateChildren}
                onUpdateBranches={onUpdateBranches}
              />
            </div>
          </div>
        ) : designerMode === 'map' ? (
          <div className="wfr-designer-map">
            <DesignerFlowMap
              flowMap={flowMap}
              selectedActionId={selectedAction?.id ?? ''}
              onSelectAction={onSelectAction}
              workflowSource={workflowSource}
            />
            <DesignerBranchMap action={selectedAction} flowNode={selectedFlowMapNode} onSelectAction={onSelectAction} />
          </div>
        ) : designerMode === 'variables' ? (
          <div className="wfr-designer-variables">
            <VariablePanel
              model={model}
              selectedAction={selectedAction}
              onChange={onMetaChange}
              onInsertVariableToken={onUpdateActionProp}
              getPrimaryPropKey={primaryPropKeyForAction}
              isConditionBranchProp={isConditionBranchProp}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
