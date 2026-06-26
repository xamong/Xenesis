import { type RefObject, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';

export type SgCellType = 'ro' | 'text' | 'chk' | 'del';

export interface SgColSpec {
  key: string;
  label: string;
  width: number;
  type: SgCellType;
}

export interface SGGridHandle {
  autoFit: () => void;
}

function getSG(): any {
  return (window as any).SpanGrid ?? null;
}

const DK = {
  hdrBg: '#1e3050',
  hdrFg: '#93c5fd',
  hdrFont: 'bold 11px system-ui, sans-serif',
  bgEven: '#1c2333',
  bgOdd: '#1f2840',
  fg: '#c8d3e0',
  font: '11px system-ui, sans-serif',
  selBg: '#1e3a6e',
  newBg: '#0f2e14',
  modBg: '#2e2410',
  chkYFg: '#60a5fa',
  chkNFg: '#3a4a5c',
  delBg: '#3a1010',
  delFg: '#f87171',
  roFg: '#4e6070',
  ROW_H: 26,
  HDR_H: 28,
};

export function useMetaManagementSpanGrid(
  containerRef: RefObject<HTMLDivElement | null>,
  columns: SgColSpec[],
  rows: Record<string, any>[],
  selectedRowId: string | null,
  onEdit: (rowId: string, key: string, val: string) => void,
  onToggle: (rowId: string, key: string) => void,
  onDelete: (rowId: string) => void,
  onSelectRow: (rowId: string) => void,
  onContextMenu?: (x: number, y: number, rowId: string | null) => void,
): SGGridHandle {
  const { t } = useI18n();
  const sgCtrl = useRef<any>(null);
  const sgView = useRef<any>(null);

  const columnsRef = useRef(columns);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const cbEdit = useRef(onEdit);
  const cbToggle = useRef(onToggle);
  const cbDelete = useRef(onDelete);
  const cbSelect = useRef(onSelectRow);
  const cbContextMenu = useRef(onContextMenu);
  useEffect(() => {
    cbEdit.current = onEdit;
  }, [onEdit]);
  useEffect(() => {
    cbToggle.current = onToggle;
  }, [onToggle]);
  useEffect(() => {
    cbDelete.current = onDelete;
  }, [onDelete]);
  useEffect(() => {
    cbSelect.current = onSelectRow;
  }, [onSelectRow]);
  useEffect(() => {
    cbContextMenu.current = onContextMenu;
  }, [onContextMenu]);

  const rebuildGrid = useCallback(() => {
    const grid = sgCtrl.current;
    const view = sgView.current;
    const SG = getSG();
    if (!grid || !view || !SG) return;

    grid.rows = [];
    grid.cols = [];
    grid.merges = [];
    grid.fixed = new SG.SpanGridFixed();

    columns.forEach((col) => grid.addCol(new SG.SpanGridCol({ width: col.width })));

    grid.addRow(new SG.SpanGridRow({ height: DK.HDR_H }));
    columns.forEach((col, ci) => {
      const cell = grid.getCell(0, ci);
      cell.text = col.label;
      cell.backColor = DK.hdrBg;
      cell.foreColor = DK.hdrFg;
      cell.font = DK.hdrFont;
      cell.textAlign = 'MiddleCenter';
      cell.tag = { type: 'header', editable: false };
    });

    if (rows.length === 0) {
      grid.addRow(new SG.SpanGridRow({ height: 60 }));
      const cell = grid.getCell(1, 0);
      cell.text = t('meta.noData');
      cell.foreColor = DK.roFg;
      cell.textAlign = 'MiddleCenter';
      cell.backColor = DK.bgEven;
      if (columns.length > 1) grid.mergeCells(1, 0, 1, columns.length - 1);
    } else {
      rows.forEach((row, ri) => {
        grid.addRow(new SG.SpanGridRow({ height: DK.ROW_H }));
        const rowIndex = ri + 1;
        const isSelected = row._rowId === selectedRowId;
        const rowBg = isSelected
          ? DK.selBg
          : row._isNew
            ? DK.newBg
            : row._isModified
              ? DK.modBg
              : ri % 2 === 0
                ? DK.bgEven
                : DK.bgOdd;

        columns.forEach((col, ci) => {
          const cell = grid.getCell(rowIndex, ci);
          cell.backColor = rowBg;

          if (col.type === 'del') {
            cell.text = '×';
            cell.foreColor = DK.delFg;
            cell.font = 'bold 10px system-ui';
            cell.textAlign = 'MiddleCenter';
            cell.tag = { type: 'del', editable: false, rowId: row._rowId };
          } else if (col.type === 'chk') {
            const isY = row[col.key] === 'Y';
            cell.text = isY ? 'Y' : 'N';
            cell.foreColor = isY ? DK.chkYFg : DK.chkNFg;
            cell.font = 'bold 13px system-ui';
            cell.textAlign = 'MiddleCenter';
            cell.tag = { type: 'chk', editable: false, rowId: row._rowId, key: col.key };
          } else if (col.type === 'ro') {
            cell.text = String(row[col.key] ?? '');
            cell.foreColor = DK.roFg;
            cell.font = DK.font;
            cell.textAlign = 'MiddleLeft';
            cell.tag = { type: 'ro', editable: false, rowId: row._rowId, key: col.key };
          } else {
            cell.text = String(row[col.key] ?? '');
            cell.foreColor = DK.fg;
            cell.font = DK.font;
            cell.textAlign = 'MiddleLeft';
            cell.tag = { type: 'text', editable: true, rowId: row._rowId, key: col.key };
          }
        });
      });
    }

    grid.fixed = new SG.SpanGridFixed(grid.rows[0], null);

    const SGB = SG.SpanGridBorder;
    const BD = SG.BorderDirection;
    if (SGB && BD) {
      const hdrLine = new SGB({ color: '#3b5070', borderDirection: BD.Bottom, lineWidth: 2 });
      columns.forEach((_, ci) => {
        const cell = grid.getCell(0, ci);
        if (cell) cell.border = hdrLine;
      });
    }

    try {
      const fixedCols: Record<number, number> = {};
      columns.forEach((col, ci) => {
        if (col.type === 'chk' || col.type === 'del' || col.type === 'ro') {
          fixedCols[ci] = col.width;
        }
      });
      grid.autoFitCols({ padding: 20, minWidth: 38, maxWidth: 260, fill: true, fixedCols });
    } catch {
      grid.layout();
    }
    view.resize();
    view.draw();
  }, [columns, rows, selectedRowId, t]);

  useEffect(() => {
    const container = containerRef.current;
    const SG = getSG();
    if (!container || !SG) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 200;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const grid = new SG.SpanGridControl({
      width,
      height,
      backColor: '#1c2333',
      borderStyle: 'None',
      lineColor: '#2d3f52',
      lineWidth: 1,
      focusColor: '#6366f1',
    });
    sgCtrl.current = grid;

    const view = new SG.SpanGridCanvasView(canvas, grid);
    sgView.current = view;

    const origCommit = view.commitCellEdit.bind(view);
    view.commitCellEdit = (moveAction?: any) => {
      const cell = view.editingCell;
      const result = origCommit(moveAction);
      if (result && cell?.tag?.type === 'text') {
        cbEdit.current(cell.tag.rowId, cell.tag.key, cell.text);
      }
      return result;
    };

    grid.onCellClick(({ cell }: any) => {
      if (!cell?.tag) return;
      const { type, rowId, key } = cell.tag;
      if (type === 'del') cbDelete.current(rowId);
      else if (type === 'chk') cbToggle.current(rowId, key);
      else if (type === 'text' || type === 'ro') cbSelect.current(rowId);
    });

    const onCtxMenu = (event: MouseEvent) => {
      const cell = grid.selectedCell as any;
      const rowId: string | null = cell?.tag?.rowId ?? null;
      cbContextMenu.current?.(event.clientX, event.clientY, rowId);
    };
    canvas.addEventListener('contextmenu', onCtxMenu);

    const resizeObserver = new ResizeObserver(() => {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;
      if (nextWidth > 10 && nextHeight > 10) {
        grid.width = nextWidth;
        grid.height = nextHeight;
        grid.layout();
        view.resize();
        view.draw();
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener('contextmenu', onCtxMenu);
      try {
        view.unbind();
      } catch {
        /* ignore */
      }
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
      sgCtrl.current = null;
      sgView.current = null;
    };
  }, [containerRef]);

  useEffect(() => {
    rebuildGrid();
  }, [rebuildGrid]);

  return {
    autoFit: () => {
      try {
        const fixedCols: Record<number, number> = {};
        columnsRef.current.forEach((col, ci) => {
          if (col.type === 'chk' || col.type === 'del' || col.type === 'ro') {
            fixedCols[ci] = col.width;
          }
        });
        sgView.current?.autoFit({ padding: 20, minWidth: 38, maxWidth: 260, fill: true, fixedCols });
      } catch {
        /* ignore */
      }
    },
  };
}
