import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback, useState } from 'react';
import type { MetaManagementProvider } from './metaManagementProvider';

export interface TreeNode {
  UID: number;
  PID: number;
  PCODE: string;
  CODE: string;
  NAME: string;
  TYPE: string;
  FORMORDER: string;
  USE_YN: string;
  AID?: number;
  ACODE?: string;
  expanded?: boolean;
  children?: TreeNode[];
}

export interface TplRow {
  _rowId: string;
  _isNew?: boolean;
  _isModified?: boolean;
  [k: string]: any;
}
export interface AttrRow {
  _rowId: string;
  _isNew?: boolean;
  _isModified?: boolean;
  [k: string]: any;
}
export interface InstRow {
  _rowId: string;
  _isNew?: boolean;
  _isModified?: boolean;
  [k: string]: any;
}
export interface ColDef {
  field: string;
  title: string;
  visible: boolean;
}

export type MetaGridKind = 'tpl' | 'attr' | 'inst';

export interface MetaGridChanges {
  tpl: Set<string>;
  attr: Set<string>;
  inst: Set<string>;
}

export interface MetaGridDeletes {
  tpl: Map<string, TplRow>;
  attr: Map<string, AttrRow>;
  inst: Map<string, InstRow>;
}

export interface UseMetaManagementDataArgs {
  providerRef: MutableRefObject<MetaManagementProvider>;
  setConnected: Dispatch<SetStateAction<boolean | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  showMsg: (msg: string, ok?: boolean) => void;
  t: (key: string, values?: Record<string, string>) => string;
  resetGridTracking: () => void;
}

export interface UseMetaManagementDataResult {
  treeData: TreeNode[];
  selectedNode: TreeNode | null;
  templates: TplRow[];
  attributes: AttrRow[];
  instances: InstRow[];
  colDefs: ColDef[];
  rawAttrs: AttrRow[];
  selTplId: string | null;
  selAttrId: string | null;
  selInstId: string | null;
  setSelectedNode: Dispatch<SetStateAction<TreeNode | null>>;
  setTemplates: Dispatch<SetStateAction<TplRow[]>>;
  setAttributes: Dispatch<SetStateAction<AttrRow[]>>;
  setInstances: Dispatch<SetStateAction<InstRow[]>>;
  setSelTplId: Dispatch<SetStateAction<string | null>>;
  setSelAttrId: Dispatch<SetStateAction<string | null>>;
  setSelInstId: Dispatch<SetStateAction<string | null>>;
  loadTree: () => Promise<void>;
  toggleNode: (node: TreeNode) => void;
  loadGridData: (node: TreeNode) => Promise<void>;
}

let rowIdSeq = 0;

export function genMetaRowId(): string {
  return `r${Date.now()}_${++rowIdSeq}`;
}

export function createEmptyMetaGridChanges(): MetaGridChanges {
  return { tpl: new Set(), attr: new Set(), inst: new Set() };
}

export function createEmptyMetaGridDeletes(): MetaGridDeletes {
  return { tpl: new Map(), attr: new Map(), inst: new Map() };
}

export function useMetaManagementData({
  providerRef,
  setConnected,
  setIsLoading,
  showMsg,
  t,
  resetGridTracking,
}: UseMetaManagementDataArgs): UseMetaManagementDataResult {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const [templates, setTemplates] = useState<TplRow[]>([]);
  const [attributes, setAttributes] = useState<AttrRow[]>([]);
  const [instances, setInstances] = useState<InstRow[]>([]);
  const [colDefs, setColDefs] = useState<ColDef[]>([]);
  const [rawAttrs, setRawAttrs] = useState<AttrRow[]>([]);

  const [selTplId, setSelTplId] = useState<string | null>(null);
  const [selAttrId, setSelAttrId] = useState<string | null>(null);
  const [selInstId, setSelInstId] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await providerRef.current.loadTree();
      setTreeData(Array.isArray(data) ? (data as TreeNode[]) : []);
      setConnected(true);
    } catch {
      setConnected(false);
      showMsg(t('meta.treeLoadFailed'), false);
    } finally {
      setIsLoading(false);
    }
  }, [providerRef, setConnected, setIsLoading, showMsg, t]);

  const toggleNode = useCallback((node: TreeNode) => {
    const toggle = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((n) =>
        n.UID === node.UID
          ? { ...n, expanded: !n.expanded }
          : { ...n, children: n.children ? toggle(n.children) : n.children },
      );
    setTreeData(toggle);
  }, []);

  const loadGridData = useCallback(
    async (node: TreeNode) => {
      setIsLoading(true);
      resetGridTracking();
      setSelTplId(null);
      setSelAttrId(null);
      setSelInstId(null);

      try {
        const childrenRaw = await providerRef.current.listCodes({ PID: node.UID, TYPE: 'GROUP,TABLE' });
        const childRows = (Array.isArray(childrenRaw) ? childrenRaw : []).map((row: any) => ({
          ...row,
          _rowId: genMetaRowId(),
        }));
        setTemplates([{ ...node, _rowId: genMetaRowId() }, ...childRows]);

        let attrRaw: any[];
        if (!node.ACODE || node.ACODE === '' || node.ACODE === 'CodeMgmt') {
          const data = await providerRef.current.listCodes({ PCODE: 'CodeMgmt' });
          attrRaw = Array.isArray(data) ? data : [];
        } else {
          const data = await providerRef.current.listCodes({ PID: node.AID });
          attrRaw = Array.isArray(data) ? data : [];
        }
        const attrRows = attrRaw.map((row: any) => ({ ...row, _rowId: genMetaRowId() }));
        setAttributes(attrRows);
        setRawAttrs(attrRows);

        const cols: ColDef[] = [...attrRows]
          .sort((a, b) => parseInt(a.FORMORDER || '0') - parseInt(b.FORMORDER || '0'))
          .map((a) => ({ field: a.CODE, title: a.NAME || a.CODE, visible: a.SHOW_YN === 'Y' }));
        setColDefs(cols);

        const isMetaType = !!(node.ACODE && node.ACODE !== '' && node.ACODE !== 'CodeMgmt');
        if (isMetaType) {
          const dataRecs = await providerRef.current.listCodes({ PID: node.UID, TYPE: 'DATA' });
          const recs: any[] = Array.isArray(dataRecs) ? dataRecs : [];
          const byRid: Record<string, any> = {};
          recs.forEach((row) => {
            if (!row.RID) return;
            if (!byRid[row.RID]) byRid[row.RID] = { RID: row.RID, RIX: row.RIX || 0 };
            if (row.CODE !== 'ROWID') byRid[row.RID][row.CODE] = row.VALUE;
          });
          const instRows = Object.values(byRid)
            .sort((a: any, b: any) => (a.RIX || 0) - (b.RIX || 0))
            .map((row: any) => ({ ...row, _rowId: genMetaRowId() }));
          setInstances(instRows);
        } else {
          const codeRecs = await providerRef.current.listCodes({ PID: node.UID, TYPE: 'CODE' });
          setInstances(
            (Array.isArray(codeRecs) ? codeRecs : []).map((row: any) => ({ ...row, _rowId: genMetaRowId() })),
          );
        }
      } catch (error: any) {
        showMsg(t('meta.dataLoadError', { e: error.message }), false);
      } finally {
        setIsLoading(false);
      }
    },
    [providerRef, resetGridTracking, setIsLoading, showMsg, t],
  );

  return {
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
  };
}
