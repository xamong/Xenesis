import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback } from 'react';
import type { MetaManagementProvider, MetaRecord, MetaValidationResult } from './metaManagementProvider';
import type {
  AttrRow,
  ColDef,
  InstRow,
  MetaGridChanges,
  MetaGridDeletes,
  MetaGridKind,
  TplRow,
  TreeNode,
} from './useMetaManagementData';

export interface MetaPendingWarningSave {
  grid: MetaGridKind;
  validation: MetaValidationResult;
}

export interface UseMetaManagementGridSaveArgs {
  changed: MutableRefObject<MetaGridChanges>;
  deleted: MutableRefObject<MetaGridDeletes>;
  providerRef: MutableRefObject<MetaManagementProvider>;
  selectedNode: TreeNode | null;
  templates: TplRow[];
  attributes: AttrRow[];
  instances: InstRow[];
  rawAttrs: AttrRow[];
  visCols: ColDef[];
  loadGridData: (node: TreeNode) => Promise<void>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setValidationResult: Dispatch<SetStateAction<MetaValidationResult | null>>;
  setPendingWarningSave: Dispatch<SetStateAction<MetaPendingWarningSave | null>>;
  showMsg: (msg: string, ok?: boolean) => void;
  t: (key: string, values?: Record<string, string>) => string;
}

export interface UseMetaManagementGridSaveResult {
  saveGrid: (grid: MetaGridKind, options?: { allowWarnings?: boolean }) => Promise<void>;
}

export function useMetaManagementGridSave({
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
}: UseMetaManagementGridSaveArgs): UseMetaManagementGridSaveResult {
  const buildTplItems = useCallback((): MetaRecord[] => {
    const items: MetaRecord[] = [];
    changed.current.tpl.forEach((rowId) => {
      const row = templates.find((item) => item._rowId === rowId);
      if (!row) return;
      items.push(
        row._isNew
          ? {
              PID: row.PID,
              PCODE: row.PCODE,
              CODE: row.CODE,
              NAME: row.NAME,
              TYPE: row.TYPE || 'GROUP',
              FORMORDER: row.FORMORDER,
              USE_YN: row.USE_YN || 'Y',
            }
          : {
              UID: row.UID,
              PID: row.PID,
              PCODE: row.PCODE,
              CODE: row.CODE,
              NAME: row.NAME,
              TYPE: row.TYPE,
              FORMORDER: row.FORMORDER,
              SHOW_YN: row.SHOW_YN,
              USE_YN: row.USE_YN,
              DEL_YN: row.DEL_YN,
            },
      );
    });
    deleted.current.tpl.forEach((row) => {
      if (row.UID) items.push({ UID: row.UID, _deleted: true });
    });
    return items;
  }, [changed, deleted, templates]);

  const buildAttrItems = useCallback((): MetaRecord[] => {
    const items: MetaRecord[] = [];
    changed.current.attr.forEach((rowId) => {
      const row = attributes.find((item) => item._rowId === rowId);
      if (!row) return;
      items.push(
        row._isNew
          ? {
              PID: row.PID,
              PCODE: row.PCODE || 'CodeMgmt',
              CODE: row.CODE,
              NAME: row.NAME,
              TYPE: 'CODE',
              FORMORDER: row.FORMORDER,
              SHOW_YN: row.SHOW_YN || 'Y',
            }
          : {
              UID: row.UID,
              PID: row.PID,
              PCODE: row.PCODE,
              CODE: row.CODE,
              NAME: row.NAME,
              FORMORDER: row.FORMORDER,
              SHOW_YN: row.SHOW_YN,
              USE_YN: row.USE_YN,
              DEL_YN: row.DEL_YN,
            },
      );
    });
    deleted.current.attr.forEach((row) => {
      if (row.UID) items.push({ UID: row.UID, _deleted: true });
    });
    return items;
  }, [attributes, changed, deleted]);

  const buildInstItems = useCallback(async (): Promise<MetaRecord[]> => {
    if (!selectedNode) return [];

    const items: MetaRecord[] = [];
    const isMetaType = !!(selectedNode.ACODE && selectedNode.ACODE !== '' && selectedNode.ACODE !== 'CodeMgmt');

    if (isMetaType) {
      for (const rowId of changed.current.inst) {
        const row = instances.find((item) => item._rowId === rowId);
        if (!row) continue;

        const rowIdx = instances.findIndex((item) => item._rowId === rowId);
        const isNew = row._isNew || String(row.RID || '').startsWith('NEW_');
        const actualRid = isNew ? `GUID_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : row.RID;

        for (const col of visCols) {
          const val = row[col.field] ?? '';
          const attr = rawAttrs.find((item) => item.CODE === col.field);

          if (!isNew) {
            try {
              const existingRows = await providerRef.current.listCodes({
                PID: selectedNode.UID,
                CODE: col.field,
                RID: actualRid,
                TYPE: 'DATA',
              });
              if (Array.isArray(existingRows) && existingRows.length > 0) {
                items.push({ UID: existingRows[0].UID, ...existingRows[0], VALUE: val, RIX: rowIdx });
                continue;
              }
            } catch {
              // Existing behavior treats lookup failures as an insert path.
            }
          }

          items.push({
            PID: selectedNode.UID,
            PCODE: selectedNode.CODE,
            AID: selectedNode.AID,
            ACODE: selectedNode.ACODE,
            CODE: col.field,
            NAME: attr?.NAME ?? col.title,
            VALUE: val,
            TYPE: 'DATA',
            FORMORDER: attr?.FORMORDER ?? '',
            CID: attr?.UID ?? 0,
            RID: actualRid,
            RIX: rowIdx,
            SHOW_YN: 'N',
            USE_YN: 'Y',
          });
        }

        if (isNew) {
          const rowIdAttr = rawAttrs.find((item) => item.CODE === 'ROWID');
          items.push({
            PID: selectedNode.UID,
            PCODE: selectedNode.CODE,
            CODE: 'ROWID',
            NAME: 'ROWID',
            VALUE: actualRid,
            TYPE: 'DATA',
            FORMORDER: rowIdAttr?.FORMORDER ?? '',
            CID: rowIdAttr?.UID ?? 0,
            RID: actualRid,
            RIX: rowIdx,
            SHOW_YN: 'N',
            USE_YN: 'Y',
          });
        }
      }

      for (const [, row] of deleted.current.inst) {
        const rid = row.RID;
        if (!rid || String(rid).startsWith('NEW_')) continue;
        try {
          const rows = await providerRef.current.listCodes({ PID: selectedNode.UID, RID: rid, TYPE: 'DATA' });
          (Array.isArray(rows) ? rows : []).forEach((item: MetaRecord) =>
            items.push({ UID: item.UID, _deleted: true }),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to resolve instance rows for RID ${rid}: ${message}`);
        }
      }
    } else {
      changed.current.inst.forEach((rowId) => {
        const row = instances.find((item) => item._rowId === rowId);
        if (!row) return;
        items.push(
          row._isNew
            ? {
                PID: row.PID ?? selectedNode.UID,
                PCODE: row.PCODE ?? selectedNode.CODE,
                CODE: row.CODE,
                NAME: row.NAME,
                TYPE: row.TYPE || 'CODE',
                FORMORDER: row.FORMORDER,
                DESCRIPTION: row.DESCRIPTION,
                SHOW_YN: row.SHOW_YN,
                USE_YN: row.USE_YN,
                DEL_YN: row.DEL_YN,
              }
            : {
                UID: row.UID,
                PID: row.PID,
                PCODE: row.PCODE,
                CODE: row.CODE,
                NAME: row.NAME,
                TYPE: row.TYPE,
                FORMORDER: row.FORMORDER,
                DESCRIPTION: row.DESCRIPTION,
                SHOW_YN: row.SHOW_YN,
                USE_YN: row.USE_YN,
                DEL_YN: row.DEL_YN,
              },
        );
      });
      deleted.current.inst.forEach((row) => {
        if (row.UID) items.push({ UID: row.UID, _deleted: true });
      });
    }

    return items;
  }, [changed, deleted, instances, providerRef, rawAttrs, selectedNode, visCols]);

  const saveGrid = useCallback(
    async (grid: MetaGridKind, options?: { allowWarnings?: boolean }) => {
      setIsLoading(true);
      try {
        let items: MetaRecord[] = [];
        if (grid === 'tpl') items = buildTplItems();
        if (grid === 'attr') items = buildAttrItems();
        if (grid === 'inst') items = await buildInstItems();

        if (items.length > 0) {
          setPendingWarningSave(null);
          const validation = await providerRef.current.validateMeta({ scope: 'batch', target: selectedNode, items });
          setValidationResult(validation);

          if (validation.errorCount > 0) {
            showMsg(t('meta.saveFailed', { e: `${validation.errorCount} validation error(s)` }), false);
            return;
          }

          if (validation.warningCount > 0 && options?.allowWarnings !== true) {
            setPendingWarningSave({ grid, validation });
            return;
          }

          await providerRef.current.batchCodes(items, {
            allowWarnings: validation.warningCount > 0,
            requireWarningConfirmation: false,
            target: selectedNode,
          });
        }
        changed.current[grid].clear();
        if (grid === 'tpl') deleted.current.tpl.clear();
        if (grid === 'attr') deleted.current.attr.clear();
        if (grid === 'inst') deleted.current.inst.clear();
        if (selectedNode) {
          try {
            await loadGridData(selectedNode);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            showMsg(`Saved, but refresh failed: ${message}`, false);
            return;
          }
        }
        showMsg(t('meta.saved'));
      } catch (error: any) {
        showMsg(t('meta.saveFailed', { e: error.message }), false);
      } finally {
        setIsLoading(false);
      }
    },
    [
      buildAttrItems,
      buildInstItems,
      buildTplItems,
      changed,
      deleted,
      loadGridData,
      providerRef,
      selectedNode,
      setIsLoading,
      setPendingWarningSave,
      setValidationResult,
      showMsg,
      t,
    ],
  );

  return { saveGrid };
}
