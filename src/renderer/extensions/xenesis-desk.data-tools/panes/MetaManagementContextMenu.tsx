import { createPortal } from 'react-dom';
import type { MetaGridKind } from '../useMetaManagementData';

export interface MetaManagementGridContextMenuState {
  x: number;
  y: number;
  gridType: MetaGridKind;
  rowId: string | null;
}

export interface MetaManagementContextMenuProps {
  ctxMenu: MetaManagementGridContextMenuState | null;
  onClose: () => void;
  onAdd: () => void;
  onSave: () => void;
  onDelete: () => void;
  onAutoFit: () => void;
  t: (key: string, values?: Record<string, string>) => string;
}

export function MetaManagementContextMenu({
  ctxMenu,
  onClose,
  onAdd,
  onSave,
  onDelete,
  onAutoFit,
  t,
}: MetaManagementContextMenuProps) {
  if (!ctxMenu) return null;

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onMouseDown={onClose} />
      <div
        className="sg-ctx-menu"
        style={{ left: ctxMenu.x, top: ctxMenu.y }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="sg-ctx-item" onClick={onAdd}>
          <span className="sg-ctx-icon">+</span> {t('meta.newRow')}
        </button>
        <button className="sg-ctx-item" onClick={onSave}>
          <span className="sg-ctx-icon">Save</span> {t('meta.saveBtn')}
        </button>
        <button
          className={`sg-ctx-item${ctxMenu.rowId ? ' sg-ctx-danger' : ' sg-ctx-disabled'}`}
          onClick={ctxMenu.rowId ? onDelete : undefined}
        >
          <span className="sg-ctx-icon">Del</span> {t('meta.deleteSelected')}
        </button>
        <div className="sg-ctx-sep" />
        <button className="sg-ctx-item" onClick={onAutoFit}>
          <span className="sg-ctx-icon">Fit</span> {t('meta.autoFit')}
        </button>
      </div>
    </>,
    document.body,
  );
}
