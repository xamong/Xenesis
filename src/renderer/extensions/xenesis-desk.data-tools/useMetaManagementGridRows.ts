import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback } from 'react';
import {
  type AttrRow,
  type ColDef,
  genMetaRowId,
  type InstRow,
  type MetaGridChanges,
  type MetaGridKind,
  type TplRow,
  type TreeNode,
} from './useMetaManagementData';

export interface UseMetaManagementGridRowsArgs {
  changed: MutableRefObject<MetaGridChanges>;
  selectedNode: TreeNode | null;
  visCols: ColDef[];
  setTemplates: Dispatch<SetStateAction<TplRow[]>>;
  setAttributes: Dispatch<SetStateAction<AttrRow[]>>;
  setInstances: Dispatch<SetStateAction<InstRow[]>>;
  showMsg: (msg: string, ok?: boolean) => void;
  t: (key: string, values?: Record<string, string>) => string;
}

export interface UseMetaManagementGridRowsResult {
  addRow: (grid: MetaGridKind) => void;
}

export function useMetaManagementGridRows({
  changed,
  selectedNode,
  visCols,
  setTemplates,
  setAttributes,
  setInstances,
  showMsg,
  t,
}: UseMetaManagementGridRowsArgs): UseMetaManagementGridRowsResult {
  const addRow = useCallback(
    (grid: MetaGridKind) => {
      if (!selectedNode) {
        showMsg(t('meta.selectNodeFirst'), false);
        return;
      }

      const rowId = genMetaRowId();
      if (grid === 'tpl') {
        const row: TplRow = {
          _rowId: rowId,
          _isNew: true,
          UID: 0,
          PID: selectedNode.UID,
          PCODE: selectedNode.CODE,
          CODE: '',
          NAME: '',
          TYPE: 'GROUP',
          FORMORDER: '',
          SHOW_YN: 'N',
          USE_YN: 'Y',
          DEL_YN: 'N',
        };
        setTemplates((prev) => [...prev, row]);
        changed.current.tpl.add(rowId);
      } else if (grid === 'attr') {
        const row: AttrRow = {
          _rowId: rowId,
          _isNew: true,
          UID: 0,
          PID: selectedNode.AID ?? selectedNode.UID,
          PCODE: selectedNode.ACODE || 'CodeMgmt',
          CODE: '',
          NAME: '',
          TYPE: 'CODE',
          FORMORDER: '',
          SHOW_YN: 'Y',
          USE_YN: 'Y',
          DEL_YN: 'N',
        };
        setAttributes((prev) => [...prev, row]);
        changed.current.attr.add(rowId);
      } else {
        const isMetaType = !!(selectedNode.ACODE && selectedNode.ACODE !== '' && selectedNode.ACODE !== 'CodeMgmt');
        const row: InstRow = { _rowId: rowId, _isNew: true };
        if (isMetaType) {
          row.RID = `NEW_${Date.now()}`;
          row.RIX = 0;
          visCols.forEach((col) => {
            row[col.field] = '';
          });
        } else {
          Object.assign(row, {
            PID: selectedNode.UID,
            PCODE: selectedNode.CODE,
            CODE: '',
            NAME: '',
            TYPE: 'CODE',
            SHOW_YN: 'N',
            USE_YN: 'Y',
            DEL_YN: 'N',
          });
        }
        setInstances((prev) => [...prev, row]);
        changed.current.inst.add(rowId);
      }

      showMsg(t('meta.rowAdded'));
    },
    [changed, selectedNode, setAttributes, setInstances, setTemplates, showMsg, t, visCols],
  );

  return { addRow };
}
