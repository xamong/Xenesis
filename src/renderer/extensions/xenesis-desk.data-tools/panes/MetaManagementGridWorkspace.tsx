import type { RefObject } from 'react';
import {
  hasMetaGridPendingWork,
  type MetaGridPendingCount,
  type MetaGridPendingSummary,
} from '../metaManagementGridStatus';
import type { MetaGridKind, TreeNode } from '../useMetaManagementData';

export interface MetaManagementGridWorkspaceProps {
  tplContainerRef: RefObject<HTMLDivElement | null>;
  attrContainerRef: RefObject<HTMLDivElement | null>;
  instContainerRef: RefObject<HTMLDivElement | null>;
  selectedNode: TreeNode | null;
  templatesCount: number;
  attributesCount: number;
  instancesCount: number;
  pendingSummary: MetaGridPendingSummary;
  isLoading: boolean;
  onAddRow: (grid: MetaGridKind) => void;
  onSaveGrid: (grid: MetaGridKind) => void | Promise<void>;
  t: (key: string, values?: Record<string, string>) => string;
}

function pendingLabel(pending: MetaGridPendingCount): string {
  if (pending.total === 0) return 'clean';
  const parts = [];
  if (pending.changed) parts.push(`${pending.changed} changed`);
  if (pending.deleted) parts.push(`${pending.deleted} deleted`);
  return parts.join(' / ');
}

function GridHeader({
  grid,
  title,
  count,
  pendingSummary,
  isLoading,
  onAddRow,
  onSaveGrid,
  t,
}: {
  grid: MetaGridKind;
  title: string;
  count: number;
  pendingSummary: MetaGridPendingSummary;
  isLoading: boolean;
  onAddRow: (grid: MetaGridKind) => void;
  onSaveGrid: (grid: MetaGridKind) => void | Promise<void>;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const pending = pendingSummary[grid];
  const hasPending = hasMetaGridPendingWork(pendingSummary, grid);
  return (
    <div className="mm-grid-header">
      <span className="mm-grid-title">{title}</span>
      <span className="mm-grid-count">{t('xconViewer.colorsCount', { count: String(count) })}</span>
      <span className={hasPending ? 'mm-grid-pending' : 'mm-grid-pending-idle'}>{pendingLabel(pending)}</span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
        <button className="mm-btn-sm green" onClick={() => onAddRow(grid)}>
          {t('meta.newRow')}
        </button>
        <button className="mm-btn-sm blue" onClick={() => onSaveGrid(grid)} disabled={isLoading || !hasPending}>
          {t('meta.saveBtn')}
        </button>
      </div>
    </div>
  );
}

export function MetaManagementGridWorkspace({
  tplContainerRef,
  attrContainerRef,
  instContainerRef,
  selectedNode,
  templatesCount,
  attributesCount,
  instancesCount,
  pendingSummary,
  isLoading,
  onAddRow,
  onSaveGrid,
  t,
}: MetaManagementGridWorkspaceProps) {
  return (
    <div className="mm-grid-workspace">
      <div className="mm-grid-row">
        <div className="mm-grid-pane with-border">
          <GridHeader
            grid="tpl"
            title="TEMPLATES"
            count={templatesCount}
            pendingSummary={pendingSummary}
            isLoading={isLoading}
            onAddRow={onAddRow}
            onSaveGrid={onSaveGrid}
            t={t}
          />
          <div ref={tplContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }} />
        </div>

        <div className="mm-grid-pane">
          <GridHeader
            grid="attr"
            title={`ATTRIBUTES ${selectedNode?.ACODE ? `(${selectedNode.ACODE})` : '(CodeMgmt)'}`}
            count={attributesCount}
            pendingSummary={pendingSummary}
            isLoading={isLoading}
            onAddRow={onAddRow}
            onSaveGrid={onSaveGrid}
            t={t}
          />
          <div ref={attrContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }} />
        </div>
      </div>

      <div className="mm-grid-pane">
        <GridHeader
          grid="inst"
          title="INSTANCES"
          count={instancesCount}
          pendingSummary={pendingSummary}
          isLoading={isLoading}
          onAddRow={onAddRow}
          onSaveGrid={onSaveGrid}
          t={t}
        />
        <div ref={instContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }} />
      </div>
    </div>
  );
}
