import type { TreeNode } from '../useMetaManagementData';

export interface MetaManagementTreeViewProps {
  apiUrl: string;
  connected: boolean | null;
  isLoading: boolean;
  treeData: TreeNode[];
  selectedUID?: number;
  onAddGroup: () => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  onReconnect: () => void | Promise<void>;
  onSyncCrMetadata: () => void | Promise<void>;
  onSelect: (node: TreeNode) => void;
  onToggle: (node: TreeNode) => void;
  t: (key: string, values?: Record<string, string>) => string;
}

export function MetaManagementTreeView({
  apiUrl,
  connected,
  isLoading,
  treeData,
  selectedUID,
  onAddGroup,
  onRefresh,
  onReconnect,
  onSyncCrMetadata,
  onSelect,
  onToggle,
  t,
}: MetaManagementTreeViewProps) {
  return (
    <aside className="mm-sidebar">
      <div className="mm-sidebar-header">
        <span className="mm-sidebar-title">{t('meta.title')}</span>
        {connected === false && <span className="mm-offline-badge">{t('meta.disconnected')}</span>}
        {connected === true && <span className="mm-online-badge">{t('meta.connected')}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button className="mm-icon-btn" title={t('meta.addGroupTitle')} onClick={onAddGroup}>
            +
          </button>
          <button className="mm-icon-btn" title={t('meta.refreshTitle')} onClick={onRefresh} disabled={isLoading}>
            <span className={isLoading ? 'mm-spin' : ''}>R</span>
          </button>
          <button
            className="mm-icon-btn"
            title={t('meta.syncCrMetadata')}
            onClick={onSyncCrMetadata}
            disabled={isLoading}
          >
            CR
          </button>
        </div>
      </div>
      <div className="mm-tree">
        {treeData.length === 0 ? (
          <div className="mm-tree-empty">
            <span>Folder</span>
            <p>{connected === false ? t('meta.serverError') : t('meta.selectNode')}</p>
            {connected === false && (
              <>
                <p className="mm-tree-hint">{t('meta.checkServer', { url: apiUrl })}</p>
                <button className="mm-retry-btn" onClick={onReconnect}>
                  {t('meta.reconnect')}
                </button>
              </>
            )}
          </div>
        ) : (
          treeData.map((node) => (
            <TreeNodeEl key={node.UID} node={node} selectedUID={selectedUID} onSelect={onSelect} onToggle={onToggle} />
          ))
        )}
      </div>
    </aside>
  );
}

function TreeNodeEl({
  node,
  depth = 0,
  selectedUID,
  onSelect,
  onToggle,
}: {
  node: TreeNode;
  depth?: number;
  selectedUID?: number;
  onSelect: (node: TreeNode) => void;
  onToggle: (node: TreeNode) => void;
}) {
  const hasKids = (node.children?.length ?? 0) > 0;
  const isSelected = selectedUID === node.UID;
  return (
    <>
      <div
        className={`mm-tree-row${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => onSelect(node)}
        onDoubleClick={(event) => {
          event.preventDefault();
          if (hasKids) onToggle(node);
        }}
      >
        <span
          className="mm-tree-toggle"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(node);
          }}
        >
          {hasKids ? (node.expanded ? '-' : '+') : ' '}
        </span>
        <span className="mm-tree-code">{node.CODE}</span>
        <span className="mm-tree-name">{node.NAME}</span>
      </div>
      {node.expanded &&
        node.children?.map((child) => (
          <TreeNodeEl
            key={child.UID}
            node={child}
            depth={depth + 1}
            selectedUID={selectedUID}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}
