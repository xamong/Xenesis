import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { deskBridge } from '../../../deskBridge';
import { useI18n } from '../../../i18n';
import {
  buildAttributeGridColumns,
  buildInstanceGridColumns,
  buildTemplateGridColumns,
} from '../metaManagementGridColumns';
import { buildMetaGridPendingSummary } from '../metaManagementGridStatus';
import {
  type MetaActivityItem,
  type MetaImportSnapshotOptions,
  type MetaRecord,
  type MetaSummary,
  type MetaValidationResult,
} from '../metaManagementProvider';
import { type MetaGridKind, type TreeNode, useMetaManagementData } from '../useMetaManagementData';
import { useMetaManagementGridEditing } from '../useMetaManagementGridEditing';
import { useMetaManagementGridRows } from '../useMetaManagementGridRows';
import { type MetaPendingWarningSave, useMetaManagementGridSave } from '../useMetaManagementGridSave';
import { useMetaManagementGridTracking } from '../useMetaManagementGridTracking';
import { useMetaManagementGroupModal } from '../useMetaManagementGroupModal';
import { useMetaManagementProvider } from '../useMetaManagementProvider';
import { useMetaManagementQuery } from '../useMetaManagementQuery';
import { useMetaManagementSpanGrid } from '../useMetaManagementSpanGrid';
import MetaManagementAssistPanel from './MetaManagementAssistPanel';
import { MetaManagementContextMenu, type MetaManagementGridContextMenuState } from './MetaManagementContextMenu';
import { MetaManagementGridWorkspace } from './MetaManagementGridWorkspace';
import { MetaManagementNewGroupModal } from './MetaManagementNewGroupModal';
import { MetaManagementQueryPanel } from './MetaManagementQueryPanel';
import { MetaManagementStatusBar } from './MetaManagementStatusBar';
import { MetaManagementTreeView } from './MetaManagementTreeView';
import { MetaManagementValidationModal } from './MetaManagementValidationModal';

export default function MetaManagementPane() {
  const { t } = useI18n();
  const { apiUrl, providerRef, connected, setConnected } = useMetaManagementProvider();

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<MetaManagementGridContextMenuState | null>(null);
  const [validationResult, setValidationResult] = useState<MetaValidationResult | null>(null);
  const [pendingWarningSave, setPendingWarningSave] = useState<MetaPendingWarningSave | null>(null);
  const [metaSummary, setMetaSummary] = useState<MetaSummary | null>(null);
  const [activityItems, setActivityItems] = useState<MetaActivityItem[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metaSummaryRequestSeq = useRef(0);
  const metaActivityRequestSeq = useRef(0);
  const tplContainerRef = useRef<HTMLDivElement>(null);
  const attrContainerRef = useRef<HTMLDivElement>(null);
  const instContainerRef = useRef<HTMLDivElement>(null);

  const showMsg = useCallback((msg: string, ok = true) => {
    setStatus({ msg, ok });
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    },
    [],
  );

  const { changed, deleted, resetGridTracking } = useMetaManagementGridTracking();
  const gridPendingSummary = buildMetaGridPendingSummary({ changed: changed.current, deleted: deleted.current });

  const {
    treeData,
    selectedNode,
    templates,
    attributes,
    instances,
    colDefs,
    rawAttrs,
    selTplId,
    selAttrId,
    selInstId,
    setSelectedNode,
    setTemplates,
    setAttributes,
    setInstances,
    setSelTplId,
    setSelAttrId,
    setSelInstId,
    loadTree,
    toggleNode,
    loadGridData,
  } = useMetaManagementData({
    providerRef,
    setConnected,
    setIsLoading,
    showMsg,
    t,
    resetGridTracking,
  });

  const queryTools = useMetaManagementQuery({
    providerRef,
    setIsLoading,
    showMsg,
    t,
  });

  const {
    showNewGroupModal,
    newGroupData,
    attrsList,
    setNewGroupData,
    openNewGroupModal,
    closeNewGroupModal,
    createNewGroup,
  } = useMetaManagementGroupModal({
    providerRef,
    selectedNode,
    loadTree,
    setIsLoading,
    showMsg,
    t,
  });

  const loadMetaSummary = useCallback(async () => {
    const requestSeq = ++metaSummaryRequestSeq.current;
    try {
      const summary = await providerRef.current.loadMetaSummary();
      if (requestSeq === metaSummaryRequestSeq.current) setMetaSummary(summary);
    } catch {
      if (requestSeq === metaSummaryRequestSeq.current) setMetaSummary(null);
    }
  }, [providerRef]);

  const loadMetaActivity = useCallback(async () => {
    const requestSeq = ++metaActivityRequestSeq.current;
    setIsActivityLoading(true);
    try {
      const activity = await providerRef.current.listMetaActivity();
      if (requestSeq === metaActivityRequestSeq.current) setActivityItems(Array.isArray(activity) ? activity : []);
    } catch {
      if (requestSeq === metaActivityRequestSeq.current) setActivityItems([]);
    } finally {
      if (requestSeq === metaActivityRequestSeq.current) setIsActivityLoading(false);
    }
  }, [providerRef]);

  const refreshMetaStatus = useCallback(async () => {
    await Promise.all([loadMetaSummary(), loadMetaActivity()]);
  }, [loadMetaActivity, loadMetaSummary]);

  const confirmGridDelete = useCallback((message: string) => window.confirm(message), []);

  const {
    handleTplEdit,
    handleAttrEdit,
    handleInstEdit,
    handleTplToggle,
    handleAttrToggle,
    handleInstToggle,
    handleTplDelete,
    handleAttrDelete,
    handleInstDelete,
  } = useMetaManagementGridEditing({
    changed,
    deleted,
    setTemplates,
    setAttributes,
    setInstances,
    confirmDelete: confirmGridDelete,
    confirmDeleteMessage: t('meta.confirmDelete'),
  });

  const handleCtxTpl = useCallback(
    (x: number, y: number, rowId: string | null) => setCtxMenu({ x, y, gridType: 'tpl', rowId }),
    [],
  );
  const handleCtxAttr = useCallback(
    (x: number, y: number, rowId: string | null) => setCtxMenu({ x, y, gridType: 'attr', rowId }),
    [],
  );
  const handleCtxInst = useCallback(
    (x: number, y: number, rowId: string | null) => setCtxMenu({ x, y, gridType: 'inst', rowId }),
    [],
  );

  const deleteLabel = t('meta.delete');
  const tplCols = useMemo(() => buildTemplateGridColumns(deleteLabel), [deleteLabel]);
  const attrCols = useMemo(() => buildAttributeGridColumns(deleteLabel), [deleteLabel]);
  const visCols = useMemo(() => colDefs.filter((col) => col.visible), [colDefs]);
  const instSgCols = useMemo(() => buildInstanceGridColumns(visCols, deleteLabel), [visCols, deleteLabel]);

  const { saveGrid } = useMetaManagementGridSave({
    changed,
    deleted,
    providerRef,
    selectedNode,
    templates,
    attributes,
    instances,
    rawAttrs,
    visCols,
    loadGridData,
    setIsLoading,
    setValidationResult,
    setPendingWarningSave,
    showMsg,
    t,
  });

  const { addRow } = useMetaManagementGridRows({
    changed,
    selectedNode,
    visCols,
    setTemplates,
    setAttributes,
    setInstances,
    showMsg,
    t,
  });

  const saveGridAndRefresh = useCallback(
    async (grid: MetaGridKind) => {
      await saveGrid(grid);
      await refreshMetaStatus();
    },
    [refreshMetaStatus, saveGrid],
  );

  const confirmWarningSave = useCallback(
    async (grid: MetaGridKind) => {
      setPendingWarningSave(null);
      await saveGrid(grid, { allowWarnings: true });
      await refreshMetaStatus();
    },
    [refreshMetaStatus, saveGrid],
  );

  const tplHandle = useMetaManagementSpanGrid(
    tplContainerRef,
    tplCols,
    templates,
    selTplId,
    handleTplEdit,
    handleTplToggle,
    handleTplDelete,
    setSelTplId,
    handleCtxTpl,
  );
  const attrHandle = useMetaManagementSpanGrid(
    attrContainerRef,
    attrCols,
    attributes,
    selAttrId,
    handleAttrEdit,
    handleAttrToggle,
    handleAttrDelete,
    setSelAttrId,
    handleCtxAttr,
  );
  const instHandle = useMetaManagementSpanGrid(
    instContainerRef,
    instSgCols,
    instances,
    selInstId,
    handleInstEdit,
    handleInstToggle,
    handleInstDelete,
    setSelInstId,
    handleCtxInst,
  );

  const checkConn = useCallback(async (): Promise<boolean> => {
    try {
      const ok = await providerRef.current.health(AbortSignal.timeout(5000));
      setConnected(ok);
      return ok;
    } catch {
      setConnected(false);
      return false;
    }
  }, [apiUrl, providerRef, setConnected]);

  const syncCrMetadata = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await deskBridge.call('xd.cr.metadata.sync', { reason: 'manual' }, { approved: true });
      if (!result.ok) throw new Error(result.error ?? 'CR metadata sync failed.');
      const data = result.result && typeof result.result === 'object' ? (result.result as MetaRecord) : {};
      showMsg(t('meta.crMetadataSynced', { n: String(data.capabilities ?? 0) }));
      await loadTree();
      await refreshMetaStatus();
    } catch (error) {
      showMsg(t('meta.crMetadataSyncFailed', { e: error instanceof Error ? error.message : String(error) }), false);
    } finally {
      setIsLoading(false);
    }
  }, [loadTree, refreshMetaStatus, showMsg, t]);

  const handleNodeSelect = useCallback(
    (node: TreeNode) => {
      setSelectedNode(node);
      queryTools.setQueryResult(null);
      queryTools.setQueryError(null);
      loadGridData(node);
    },
    [loadGridData, queryTools, setSelectedNode],
  );

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', close, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('scroll', close, true);
    };
  }, [ctxMenu]);

  const handleCtxAdd = useCallback(() => {
    if (!ctxMenu) return;
    setCtxMenu(null);
    addRow(ctxMenu.gridType);
  }, [addRow, ctxMenu]);

  const handleCtxSave = useCallback(() => {
    if (!ctxMenu) return;
    setCtxMenu(null);
    saveGridAndRefresh(ctxMenu.gridType);
  }, [ctxMenu, saveGridAndRefresh]);

  const handleCtxDelete = useCallback(() => {
    if (!ctxMenu?.rowId) return;
    const { gridType, rowId } = ctxMenu;
    setCtxMenu(null);
    if (gridType === 'tpl') handleTplDelete(rowId);
    else if (gridType === 'attr') handleAttrDelete(rowId);
    else handleInstDelete(rowId);
  }, [ctxMenu, handleTplDelete, handleAttrDelete, handleInstDelete]);

  const handleCtxAutoFit = useCallback(() => {
    if (!ctxMenu) return;
    const handle = ctxMenu.gridType === 'tpl' ? tplHandle : ctxMenu.gridType === 'attr' ? attrHandle : instHandle;
    setCtxMenu(null);
    handle.autoFit();
  }, [attrHandle, ctxMenu, instHandle, tplHandle]);

  const handlePreviewImportSnapshot = useCallback(
    async (snapshot: any, options?: MetaImportSnapshotOptions) => {
      if (!selectedNode) throw new Error('Select a target node before running the import dry run.');
      setIsLoading(true);
      try {
        const result = await providerRef.current.previewImportSnapshot(
          snapshot,
          {
            PID: selectedNode.UID,
            PCODE: selectedNode.CODE,
          },
          options,
        );
        const inserted = result.inserted ?? 0;
        const conflicts = Array.isArray(result.conflicts) ? result.conflicts : [];
        const unresolvedConflicts = conflicts.filter((conflict: any) => conflict.resolved !== true);
        const conflictPolicy = options?.conflictPolicy ?? 'insert';
        showMsg(
          `Import dry run (${conflictPolicy}): ${inserted} rows planned${conflicts.length ? `, ${conflicts.length} conflicts` : ''}.`,
          unresolvedConflicts.length === 0,
        );
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showMsg(`Import dry run failed: ${message}`, false);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [providerRef, selectedNode, showMsg],
  );

  const handleImportSnapshot = useCallback(
    async (snapshot: any, options?: MetaImportSnapshotOptions) => {
      if (!selectedNode) throw new Error('Select a target node before applying the import.');
      setIsLoading(true);
      try {
        const result = await providerRef.current.importSnapshot(
          snapshot,
          {
            PID: selectedNode.UID,
            PCODE: selectedNode.CODE,
          },
          options,
        );
        await loadTree();
        await loadGridData(selectedNode);
        const inserted = result.inserted ?? 0;
        const conflictPolicy = options?.conflictPolicy ?? 'insert';
        showMsg(`Import applied (${conflictPolicy}): ${inserted} rows inserted.`);
        await refreshMetaStatus();
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        showMsg(`Import failed: ${message}`, false);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [providerRef, selectedNode, loadTree, loadGridData, refreshMetaStatus, showMsg],
  );

  const getNodePath = useCallback(
    (node: TreeNode | null): string => {
      if (!node) return t('meta.root');
      const find = (nodes: TreeNode[], uid: number): TreeNode | null => {
        for (const item of nodes) {
          if (item.UID === uid) return item;
          if (item.children) {
            const found = find(item.children, uid);
            if (found) return found;
          }
        }
        return null;
      };

      const parts: string[] = [];
      let current: TreeNode | null = node;
      while (current) {
        parts.unshift(current.CODE || `UID:${current.UID}`);
        if (!current.PID || current.PID === current.UID) break;
        current = find(treeData, current.PID);
      }
      return parts.join('.');
    },
    [t, treeData],
  );

  useEffect(() => {
    refreshMetaStatus();
  }, [refreshMetaStatus]);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    const tryConn = async () => {
      const ok = await checkConn();
      if (cancelled) return;
      if (ok) {
        loadTree();
        refreshMetaStatus();
      } else if (retries++ < 3) {
        setTimeout(tryConn, 5000);
      }
    };
    tryConn();
    return () => {
      cancelled = true;
    };
  }, [checkConn, loadTree, refreshMetaStatus]);

  return (
    <div className="mm-pane">
      <MetaManagementTreeView
        apiUrl={apiUrl}
        connected={connected}
        isLoading={isLoading}
        treeData={treeData}
        selectedUID={selectedNode?.UID}
        onAddGroup={openNewGroupModal}
        onRefresh={loadTree}
        onReconnect={() =>
          checkConn().then((ok) => {
            if (ok) {
              loadTree();
              refreshMetaStatus();
            }
          })
        }
        onSyncCrMetadata={syncCrMetadata}
        onSelect={handleNodeSelect}
        onToggle={toggleNode}
        t={t}
      />

      <main className="mm-main" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {status && (
          <div className={`mm-status-bar${status.ok ? ' ok' : ' error'}`}>
            <span className="mm-status-icon">{status.ok ? 'OK' : 'ERR'}</span>
            {status.msg}
          </div>
        )}

        <MetaManagementQueryPanel queryTools={queryTools} isLoading={isLoading} t={t} />

        <MetaManagementAssistPanel
          selectedNode={selectedNode as any}
          templates={templates}
          attributes={attributes}
          rawAttrs={rawAttrs}
          instances={instances}
          colDefs={colDefs as any}
          activityItems={activityItems}
          isActivityLoading={isActivityLoading}
          onPreviewImportSnapshot={handlePreviewImportSnapshot}
          onImportSnapshot={handleImportSnapshot}
          onRefreshActivity={loadMetaActivity}
        />

        <MetaManagementGridWorkspace
          tplContainerRef={tplContainerRef}
          attrContainerRef={attrContainerRef}
          instContainerRef={instContainerRef}
          selectedNode={selectedNode}
          templatesCount={templates.length}
          attributesCount={attributes.length}
          instancesCount={instances.length}
          pendingSummary={gridPendingSummary}
          isLoading={isLoading}
          onAddRow={addRow}
          onSaveGrid={saveGridAndRefresh}
          t={t}
        />

        <MetaManagementStatusBar
          selectedPath={getNodePath(selectedNode)}
          templatesCount={templates.length}
          pendingSummary={gridPendingSummary}
          connected={connected}
          summary={metaSummary}
          validationStatus={validationResult?.status ?? null}
          t={t}
        />
      </main>

      <MetaManagementNewGroupModal
        visible={showNewGroupModal}
        data={newGroupData}
        attrsList={attrsList}
        isLoading={isLoading}
        onClose={closeNewGroupModal}
        onDataChange={setNewGroupData}
        onCreate={createNewGroup}
        t={t}
      />

      <MetaManagementContextMenu
        ctxMenu={ctxMenu}
        onClose={() => setCtxMenu(null)}
        onAdd={handleCtxAdd}
        onSave={handleCtxSave}
        onDelete={handleCtxDelete}
        onAutoFit={handleCtxAutoFit}
        t={t}
      />

      <MetaManagementValidationModal
        pending={pendingWarningSave}
        onCancel={() => setPendingWarningSave(null)}
        onConfirm={confirmWarningSave}
      />
    </div>
  );
}
