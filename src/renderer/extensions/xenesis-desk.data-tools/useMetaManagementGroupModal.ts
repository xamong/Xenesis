import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback, useState } from 'react';
import type { MetaManagementProvider, MetaRecord } from './metaManagementProvider';
import type { TreeNode } from './useMetaManagementData';

export interface MetaManagementNewGroupData {
  pcode: string;
  code: string;
  name: string;
  aid: number;
  acode: string;
}

export interface UseMetaManagementGroupModalArgs {
  providerRef: MutableRefObject<MetaManagementProvider>;
  selectedNode: TreeNode | null;
  loadTree: () => Promise<void>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  showMsg: (msg: string, ok?: boolean) => void;
  t: (key: string, values?: Record<string, string>) => string;
}

export interface UseMetaManagementGroupModalResult {
  showNewGroupModal: boolean;
  newGroupData: MetaManagementNewGroupData;
  attrsList: MetaRecord[];
  setNewGroupData: Dispatch<SetStateAction<MetaManagementNewGroupData>>;
  openNewGroupModal: () => Promise<void>;
  closeNewGroupModal: () => void;
  createNewGroup: () => Promise<void>;
}

export function useMetaManagementGroupModal({
  providerRef,
  selectedNode,
  loadTree,
  setIsLoading,
  showMsg,
  t,
}: UseMetaManagementGroupModalArgs): UseMetaManagementGroupModalResult {
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupData, setNewGroupData] = useState<MetaManagementNewGroupData>({
    pcode: '',
    code: '',
    name: '',
    aid: 0,
    acode: '',
  });
  const [attrsList, setAttrsList] = useState<MetaRecord[]>([]);

  const openNewGroupModal = useCallback(async () => {
    if (!selectedNode) {
      showMsg(t('meta.selectTreeFirst'), false);
      return;
    }
    try {
      const data = await providerRef.current.listAttributes();
      setAttrsList(Array.isArray(data) ? data : []);
    } catch {
      setAttrsList([]);
    }
    setNewGroupData({
      pcode: selectedNode.CODE,
      code: '',
      name: '',
      aid: selectedNode.AID ?? 0,
      acode: selectedNode.ACODE ?? '',
    });
    setShowNewGroupModal(true);
  }, [providerRef, selectedNode, showMsg, t]);

  const closeNewGroupModal = useCallback(() => {
    setShowNewGroupModal(false);
  }, []);

  const createNewGroup = useCallback(async () => {
    if (!newGroupData.code || !newGroupData.name) {
      showMsg(t('meta.nameCodeRequired'), false);
      return;
    }
    if (!selectedNode) return;

    setIsLoading(true);
    try {
      const payload: MetaRecord = {
        PID: selectedNode.UID,
        PCODE: newGroupData.pcode,
        CODE: newGroupData.code,
        NAME: newGroupData.name,
        TYPE: 'GROUP',
        USE_YN: 'Y',
        DEL_YN: 'N',
      };
      if (newGroupData.acode && newGroupData.acode !== 'CodeMgmt') {
        payload.AID = newGroupData.aid;
        payload.ACODE = newGroupData.acode;
      }
      const created = await providerRef.current.createCode(payload);
      if (created?.UID) {
        await providerRef.current.updateCode(created.UID, {
          ...created,
          FORMORDER: String(Number(created.UID) + 1000000000),
        });
      }
      setShowNewGroupModal(false);
      await loadTree();
      showMsg(t('meta.groupCreated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showMsg(t('meta.groupCreateFailed', { e: message }), false);
    } finally {
      setIsLoading(false);
    }
  }, [loadTree, newGroupData, providerRef, selectedNode, setIsLoading, showMsg, t]);

  return {
    showNewGroupModal,
    newGroupData,
    attrsList,
    setNewGroupData,
    openNewGroupModal,
    closeNewGroupModal,
    createNewGroup,
  };
}
