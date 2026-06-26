import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback } from 'react';
import type { AttrRow, InstRow, MetaGridChanges, MetaGridDeletes, MetaGridKind, TplRow } from './useMetaManagementData';

type MetaGridRow = TplRow | AttrRow | InstRow;
type MetaGridSetter<Row extends MetaGridRow> = Dispatch<SetStateAction<Row[]>>;

export interface UseMetaManagementGridEditingArgs {
  changed: MutableRefObject<MetaGridChanges>;
  deleted: MutableRefObject<MetaGridDeletes>;
  setTemplates: MetaGridSetter<TplRow>;
  setAttributes: MetaGridSetter<AttrRow>;
  setInstances: MetaGridSetter<InstRow>;
  confirmDelete: (message: string) => boolean;
  confirmDeleteMessage: string;
}

export interface UseMetaManagementGridEditingResult {
  handleTplEdit: (rowId: string, key: string, val: string) => void;
  handleAttrEdit: (rowId: string, key: string, val: string) => void;
  handleInstEdit: (rowId: string, key: string, val: string) => void;
  handleTplToggle: (rowId: string, key: string) => void;
  handleAttrToggle: (rowId: string, key: string) => void;
  handleInstToggle: (rowId: string, key: string) => void;
  handleTplDelete: (rowId: string) => void;
  handleAttrDelete: (rowId: string) => void;
  handleInstDelete: (rowId: string) => void;
}

export function useMetaManagementGridEditing({
  changed,
  deleted,
  setTemplates,
  setAttributes,
  setInstances,
  confirmDelete,
  confirmDeleteMessage,
}: UseMetaManagementGridEditingArgs): UseMetaManagementGridEditingResult {
  const handleTplEdit = useCallback(
    (rowId: string, key: string, val: string) => {
      setTemplates((prev) =>
        prev.map((row) =>
          row._rowId === rowId ? (changed.current.tpl.add(rowId), { ...row, [key]: val, _isModified: true }) : row,
        ),
      );
    },
    [changed, setTemplates],
  );

  const handleAttrEdit = useCallback(
    (rowId: string, key: string, val: string) => {
      setAttributes((prev) =>
        prev.map((row) =>
          row._rowId === rowId ? (changed.current.attr.add(rowId), { ...row, [key]: val, _isModified: true }) : row,
        ),
      );
    },
    [changed, setAttributes],
  );

  const handleInstEdit = useCallback(
    (rowId: string, key: string, val: string) => {
      setInstances((prev) =>
        prev.map((row) =>
          row._rowId === rowId ? (changed.current.inst.add(rowId), { ...row, [key]: val, _isModified: true }) : row,
        ),
      );
    },
    [changed, setInstances],
  );

  const handleTplToggle = useCallback(
    (rowId: string, key: string) => {
      setTemplates((prev) =>
        prev.map((row) =>
          row._rowId === rowId
            ? (changed.current.tpl.add(rowId), { ...row, [key]: row[key] === 'Y' ? 'N' : 'Y', _isModified: true })
            : row,
        ),
      );
    },
    [changed, setTemplates],
  );

  const handleAttrToggle = useCallback(
    (rowId: string, key: string) => {
      setAttributes((prev) =>
        prev.map((row) =>
          row._rowId === rowId
            ? (changed.current.attr.add(rowId), { ...row, [key]: row[key] === 'Y' ? 'N' : 'Y', _isModified: true })
            : row,
        ),
      );
    },
    [changed, setAttributes],
  );

  const handleInstToggle = useCallback(
    (rowId: string, key: string) => {
      setInstances((prev) =>
        prev.map((row) =>
          row._rowId === rowId
            ? (changed.current.inst.add(rowId), { ...row, [key]: row[key] === 'Y' ? 'N' : 'Y', _isModified: true })
            : row,
        ),
      );
    },
    [changed, setInstances],
  );

  const makeDeleteHandler = useCallback(
    <Row extends MetaGridRow>(grid: MetaGridKind, setter: MetaGridSetter<Row>) =>
      (rowId: string) => {
        if (!confirmDelete(confirmDeleteMessage)) return;

        setter((prev) => {
          const row = prev.find((item) => item._rowId === rowId);
          if (!row) return prev;

          if (row._isNew) {
            changed.current[grid].delete(rowId);
          } else {
            (deleted.current[grid] as Map<string, Row>).set(rowId, { ...row });
          }
          return prev.filter((item) => item._rowId !== rowId);
        });
      },
    [changed, confirmDelete, confirmDeleteMessage, deleted],
  );

  const handleTplDelete = useCallback(
    (rowId: string) => {
      makeDeleteHandler('tpl', setTemplates)(rowId);
    },
    [makeDeleteHandler, setTemplates],
  );

  const handleAttrDelete = useCallback(
    (rowId: string) => {
      makeDeleteHandler('attr', setAttributes)(rowId);
    },
    [makeDeleteHandler, setAttributes],
  );

  const handleInstDelete = useCallback(
    (rowId: string) => {
      makeDeleteHandler('inst', setInstances)(rowId);
    },
    [makeDeleteHandler, setInstances],
  );

  return {
    handleTplEdit,
    handleAttrEdit,
    handleInstEdit,
    handleTplToggle,
    handleAttrToggle,
    handleInstToggle,
    handleTplDelete,
    handleAttrDelete,
    handleInstDelete,
  };
}
