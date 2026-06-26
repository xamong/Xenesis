import { parseWorkflow, workflowToMermaid } from '@xcon-workflow/core';
import mermaid from 'mermaid';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initMermaid } from '../../hooks/useMermaidTheme';
import { useAppTheme } from '../../ThemeContext';
import {
  type WorkflowDesignerAction,
  type WorkflowDesignerActionType,
  type WorkflowDesignerBranchKey,
} from './workflowDesigner';
import { WORKFLOW_DESIGNER_BRANCHES } from './workflowRunnerConstants';
import {
  branchActionTitle,
  catalogLabel,
  formatPropsSummary,
  hasBranchActionLists,
  primaryPropKeyForAction,
  summarizeBranchActions,
  summarizeDesignerBranches,
} from './workflowRunnerDesignerActionViews';
import type { WorkflowDesignerFlowMapNode } from './workflowRunnerTypes';

type WorkflowMermaidDirection = 'LR' | 'TD';

const WORKFLOW_MERMAID_DIRECTIONS: Array<{ id: WorkflowMermaidDirection; label: string; detail: string }> = [
  { id: 'LR', label: 'Horizontal', detail: 'Left to right' },
  { id: 'TD', label: 'Vertical', detail: 'Top down' },
];

let workflowMermaidSeq = 0;

export function QuickParameterPanel({
  action,
  flowNode,
  onUpdateAction,
  onUpdateProp,
}: {
  action: WorkflowDesignerAction | null;
  flowNode: WorkflowDesignerFlowMapNode | null;
  onUpdateAction: (id: string, patch: Partial<WorkflowDesignerAction>) => void;
  onUpdateProp: (id: string, key: string, value: string) => void;
}) {
  if (!action) {
    return (
      <section className="wfr-quick-params">
        <div className="wfr-empty-inline">Select an action to edit quick parameters.</div>
      </section>
    );
  }
  const primaryKey = primaryPropKeyForAction(action);
  return (
    <section className="wfr-quick-params">
      <div className="wfr-panel-title">Quick Parameters</div>
      <div className="wfr-quick-grid">
        <label>
          <span>Label</span>
          <input
            value={action.label}
            onChange={(event) => onUpdateAction(action.id, { label: event.currentTarget.value })}
          />
        </label>
        <label>
          <span>{primaryKey}</span>
          <input
            value={action.props[primaryKey] ?? ''}
            onChange={(event) => onUpdateProp(action.id, primaryKey, event.currentTarget.value)}
          />
        </label>
        <div>
          <span>Previous</span>
          <strong>{flowNode?.previousId ?? '-'}</strong>
        </div>
        <div>
          <span>Next</span>
          <strong>{flowNode?.nextId ?? '-'}</strong>
        </div>
      </div>
    </section>
  );
}

export function DesignerFlowMap({
  flowMap,
  selectedActionId,
  onSelectAction,
  workflowSource,
}: {
  flowMap: WorkflowDesignerFlowMapNode[];
  selectedActionId: string;
  onSelectAction: (id: string) => void;
  workflowSource: string;
}) {
  const [mermaidDirection, setMermaidDirection] = useState<WorkflowMermaidDirection>('LR');
  const mermaidSourceResult = useMemo(() => {
    try {
      return { source: workflowSourceToMermaid(workflowSource, mermaidDirection), error: '' };
    } catch (error) {
      return { source: '', error: error instanceof Error ? error.message : String(error) };
    }
  }, [mermaidDirection, workflowSource]);
  const actionIds = useMemo(() => flowMap.map((node) => node.id), [flowMap]);
  const rootFlowNodes = flowMap.filter((node) => !node.parentId);

  return (
    <section className="wfr-flow wfr-flow-map">
      <div className="wfr-panel-title">Mermaid Flow Map</div>
      <div className="wfr-mermaid-map-header">
        <div className="wfr-mermaid-map-status">
          <span>{flowMap.length} nodes</span>
          <span>{rootFlowNodes.length} roots</span>
          <span>Selected {selectedActionId || '-'}</span>
          <span>flowchart {mermaidDirection}</span>
        </div>
        <div className="wfr-mermaid-direction-toggle" role="group" aria-label="Mermaid flow direction">
          {WORKFLOW_MERMAID_DIRECTIONS.map((direction) => (
            <button
              key={direction.id}
              type="button"
              className={mermaidDirection === direction.id ? 'active' : ''}
              aria-pressed={mermaidDirection === direction.id}
              title={direction.detail}
              onClick={() => setMermaidDirection(direction.id)}
            >
              {direction.label}
            </button>
          ))}
        </div>
      </div>
      <div className="wfr-mermaid-map-body">
        {mermaidSourceResult.error ? (
          <div className="wfr-mermaid-error">
            <strong>Mermaid source error</strong>
            <pre>{mermaidSourceResult.error}</pre>
          </div>
        ) : (
          <WorkflowMermaidDiagram
            source={mermaidSourceResult.source}
            actionIds={actionIds}
            selectedActionId={selectedActionId}
            onNodeSelect={onSelectAction}
          />
        )}
      </div>
      <details className="wfr-mermaid-source">
        <summary>Mermaid source</summary>
        <pre>{mermaidSourceResult.source || mermaidSourceResult.error}</pre>
      </details>
    </section>
  );
}

export function workflowSourceToMermaid(workflowSource: string, direction: WorkflowMermaidDirection = 'LR'): string {
  const workflow = parseWorkflow(workflowSource);
  return sanitizeWorkflowMermaidSource(workflowToMermaid(workflow)).replace(
    /^flowchart\s+\w+\b/m,
    `flowchart ${direction}`,
  );
}

function sanitizeWorkflowMermaidSource(source: string): string {
  return source.replace(
    /^(\s+[^ \t\r\n[\]]+\[")([^\r\n]*?)("\]\s*)$/gm,
    (_match, prefix: string, rawLabel: string, suffix: string) =>
      `${prefix}${sanitizeWorkflowMermaidLabel(rawLabel)}${suffix}`,
  );
}

function sanitizeWorkflowMermaidLabel(label: string): string {
  return label.replace(/\\"/g, '&quot;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function applyWorkflowMermaidInteractions(
  container: HTMLDivElement,
  actionIds: string[],
  selectedActionId: string,
  onNodeSelect: (id: string) => void,
): void {
  const svgNodes = Array.from(container.querySelectorAll<SVGGElement>('g.node[id], g[id^="flowchart-"]'));
  svgNodes.forEach((svgNode) => {
    const actionId = resolveWorkflowMermaidActionId(svgNode.id, actionIds);
    if (!actionId) return;

    svgNode.classList.add('wfr-mermaid-node-clickable');
    svgNode.classList.toggle('wfr-mermaid-node-selected', actionId === selectedActionId);
    svgNode.setAttribute('role', 'button');
    svgNode.setAttribute('tabindex', '0');
    svgNode.setAttribute('aria-label', `Select workflow action ${actionId}`);
    svgNode.onclick = (event: MouseEvent) => {
      event.stopPropagation();
      onNodeSelect(actionId);
    };
    svgNode.onkeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        onNodeSelect(actionId);
      }
    };
  });
}

function resolveWorkflowMermaidActionId(svgNodeId: string, actionIds: string[]): string {
  const sortedActionIds = [...actionIds].sort((left, right) => right.length - left.length);
  return (
    sortedActionIds.find(
      (actionId) =>
        svgNodeId === actionId ||
        svgNodeId === `flowchart-${actionId}` ||
        svgNodeId.startsWith(`flowchart-${actionId}-`) ||
        svgNodeId.includes(`-flowchart-${actionId}-`),
    ) ?? ''
  );
}

function WorkflowMermaidDiagram({
  source,
  actionIds,
  selectedActionId,
  onNodeSelect,
}: {
  source: string;
  actionIds: string[];
  selectedActionId: string;
  onNodeSelect: (id: string) => void;
}) {
  const appTheme = useAppTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef({ actionIds, selectedActionId, onNodeSelect });
  const [error, setError] = useState('');

  useEffect(() => {
    interactionRef.current = { actionIds, selectedActionId, onNodeSelect };
    const container = containerRef.current;
    if (container) applyWorkflowMermaidInteractions(container, actionIds, selectedActionId, onNodeSelect);
  }, [actionIds, selectedActionId, onNodeSelect]);

  useEffect(() => {
    initMermaid(appTheme);
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    setError('');
    if (!source.trim()) return;

    const id = `wfr-mermaid-${++workflowMermaidSeq}`;
    let cancelled = false;
    mermaid
      .render(id, source)
      .then(({ svg }) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        const interactions = interactionRef.current;
        applyWorkflowMermaidInteractions(
          containerRef.current,
          interactions.actionIds,
          interactions.selectedActionId,
          interactions.onNodeSelect,
        );
      })
      .catch((renderError: unknown) => {
        if (cancelled) return;
        setError(renderError instanceof Error ? renderError.message : String(renderError));
      });

    return () => {
      cancelled = true;
    };
  }, [appTheme, source]);

  if (error) {
    return (
      <div className="wfr-mermaid-error">
        <strong>Mermaid render error</strong>
        <pre>{error}</pre>
      </div>
    );
  }

  return <div ref={containerRef} className="wfr-mermaid-diagram" />;
}

function renderDesignerFlowNode(
  node: WorkflowDesignerFlowMapNode,
  flowMap: WorkflowDesignerFlowMapNode[],
  selectedActionId: string,
  onSelectAction: (id: string) => void,
): React.ReactNode {
  const branchSummaryEntries = WORKFLOW_DESIGNER_BRANCHES.map(
    (branch) => [branch, node.branchSummaries?.[branch]] as const,
  ).filter((entry): entry is readonly [WorkflowDesignerBranchKey, string] => Boolean(entry[1]));
  const branchGroups = WORKFLOW_DESIGNER_BRANCHES.map(
    (branch) => [branch, branchFlowNodesForParent(flowMap, node.id, branch)] as const,
  ).filter(
    (entry): entry is readonly [WorkflowDesignerBranchKey, WorkflowDesignerFlowMapNode[]] => entry[1].length > 0,
  );
  const childFlowNodes = childFlowNodesForParent(flowMap, node.id);
  const flowNodeStyle = {
    '--wfr-flow-depth-offset': node.branchKey ? '0px' : `${node.depth * 42}px`,
  } as React.CSSProperties;
  const branchSplitStyle = {
    '--wfr-flow-branch-count': branchGroups.length,
  } as React.CSSProperties;

  return (
    <div key={node.id} className={`wfr-flow-subtree${branchGroups.length ? ' branching' : ''}`}>
      <div className="wfr-flow-node-stack">
        <div className={`wfr-flow-line${node.enabled ? '' : ' disabled'}`} />
        <button
          type="button"
          style={flowNodeStyle}
          className={`wfr-flow-node wfr-flow-map-node ${node.type === 'condition' ? 'condition' : ''}${selectedActionId === node.id ? ' active' : ''}${node.depth > 0 ? ' nested' : ''}${node.branchKey ? ' branch' : ''}${node.enabled ? '' : ' disabled'}`}
          onClick={() => onSelectAction(node.id)}
          title={node.summary}
        >
          <strong>
            {node.index + 1}. {catalogLabel(node.type)}
          </strong>
          <span>{node.label}</span>
        </button>
        {branchSummaryEntries.length ? (
          <div className="wfr-branch-row">
            {branchSummaryEntries.slice(0, 2).map(([branch, summary]) => (
              <span key={branch} title={summary}>
                {branch.toUpperCase()}
              </span>
            ))}
          </div>
        ) : null}
        {childFlowNodes.length ? (
          <div className="wfr-flow-child-stack">
            {childFlowNodes.map((childNode) =>
              renderDesignerFlowNode(childNode, flowMap, selectedActionId, onSelectAction),
            )}
          </div>
        ) : null}
      </div>
      {branchGroups.length ? (
        <div className="wfr-flow-branch-split" style={branchSplitStyle}>
          {branchGroups.map(([branch, nodes]) => (
            <div key={`${node.id}:${branch}`} className={`wfr-flow-branch-lane ${branch}`}>
              <div className="wfr-flow-branch-lane-label">
                <span className="wfr-flow-branch-label">{branch.toUpperCase()}</span>
              </div>
              <div className="wfr-flow-branch-sequence">
                {nodes.map((branchNode) =>
                  renderDesignerFlowNode(branchNode, flowMap, selectedActionId, onSelectAction),
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function branchFlowNodesForParent(
  flowMap: WorkflowDesignerFlowMapNode[],
  parentId: string,
  branch: WorkflowDesignerBranchKey,
): WorkflowDesignerFlowMapNode[] {
  return flowMap.filter((node) => node.parentId === parentId && node.branchKey === branch);
}

function childFlowNodesForParent(
  flowMap: WorkflowDesignerFlowMapNode[],
  parentId: string,
): WorkflowDesignerFlowMapNode[] {
  return flowMap.filter((node) => node.parentId === parentId && !node.branchKey);
}

export function DesignerBranchMap({
  action,
  flowNode,
  onSelectAction,
}: {
  action: WorkflowDesignerAction | null;
  flowNode: WorkflowDesignerFlowMapNode | null;
  onSelectAction: (id: string) => void;
}) {
  return (
    <section className="wfr-branch-map">
      <div className="wfr-panel-title">Branch Map</div>
      {action && flowNode ? (
        <div className="wfr-branch-map-body">
          <button
            type="button"
            disabled={!flowNode.previousId}
            onClick={() => flowNode.previousId && onSelectAction(flowNode.previousId)}
          >
            <span>Previous</span>
            <strong>{flowNode.previousId ?? '-'}</strong>
          </button>
          <div className={`wfr-branch-map-current ${action.type === 'condition' ? 'condition' : ''}`}>
            <span>{catalogLabel(action.type)}</span>
            <strong>{action.label}</strong>
            <small>{flowNode.summary}</small>
          </div>
          <button
            type="button"
            disabled={!flowNode.nextId}
            onClick={() => flowNode.nextId && onSelectAction(flowNode.nextId)}
          >
            <span>Next</span>
            <strong>{flowNode.nextId ?? '-'}</strong>
          </button>
          {hasBranchActionLists(action) ? (
            <div className="wfr-branch-map-list">
              {WORKFLOW_DESIGNER_BRANCHES.map((branch) => {
                const branchActions = action.branches?.[branch] ?? [];
                if (!branchActions.length) return null;
                return (
                  <div key={branch} className="wfr-branch-map-action">
                    <span>{branchActionTitle(branch)}</span>
                    <strong>{summarizeBranchActions(action, branch)}</strong>
                    <small>
                      {branchActions
                        .slice(0, 4)
                        .map(
                          (branchAction) =>
                            `${catalogLabel(branchAction.type)}:${branchAction.label || branchAction.id}`,
                        )
                        .join(' -> ')}
                    </small>
                  </div>
                );
              })}
            </div>
          ) : action.type === 'condition' ? (
            <div className="wfr-branch-map-branches">
              <div>
                <span>{action.props.successLabel || 'SUCCESS'}</span>
                <strong>{catalogLabel((action.props.successActionType as WorkflowDesignerActionType) || 'log')}</strong>
                <small>{action.props.successMessage || '-'}</small>
              </div>
              <div>
                <span>{action.props.failureLabel || 'FAILURE'}</span>
                <strong>{catalogLabel((action.props.failureActionType as WorkflowDesignerActionType) || 'log')}</strong>
                <small>{action.props.failureMessage || '-'}</small>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="wfr-empty-inline">Select an action to inspect branches.</div>
      )}
    </section>
  );
}

export function buildDesignerFlowMap(actions: WorkflowDesignerAction[]): WorkflowDesignerFlowMapNode[] {
  const nodes: WorkflowDesignerFlowMapNode[] = [];
  appendDesignerFlowMapNodes(nodes, actions, 0);
  return nodes.map((node, index) => ({
    ...node,
    index,
    previousId: nodes[index - 1]?.id,
    nextId: nodes[index + 1]?.id,
  }));
}

function appendDesignerFlowMapNodes(
  nodes: WorkflowDesignerFlowMapNode[],
  actions: WorkflowDesignerAction[],
  depth: number,
  parentId?: string,
  branchKey?: WorkflowDesignerBranchKey,
) {
  actions.forEach((action) => {
    nodes.push({
      id: action.id,
      type: action.type,
      label: action.label || action.id,
      enabled: action.enabled,
      index: nodes.length,
      depth,
      parentId,
      branchKey,
      summary: formatPropsSummary(action),
      branchSummaries: summarizeDesignerBranches(action),
      ...(action.type === 'condition'
        ? {
            successLabel: action.props.successLabel || 'SUCCESS',
            failureLabel: action.props.failureLabel || 'FAILURE',
          }
        : {}),
    });

    for (const branch of WORKFLOW_DESIGNER_BRANCHES) {
      const branchActions = action.branches?.[branch] ?? [];
      if (branchActions.length) appendDesignerFlowMapNodes(nodes, branchActions, depth + 1, action.id, branch);
    }

    if (action.children?.length) appendDesignerFlowMapNodes(nodes, action.children, depth + 1, action.id);
  });
}
