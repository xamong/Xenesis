import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../../i18n';

// ─── SpanGrid global ──────────────────────────────────────────────────────────

function getSG() {
  return (window as any).SpanGrid ?? null;
}

// ─── 다크 테마 상수 ───────────────────────────────────────────────────────────

const DK = {
  hdrBg: '#1a253a',
  hdrFg: '#8da0b8',
  hdrFgSort: '#818cf8',
  hdrBgSort: '#212f47',
  bgEven: '#1c2333',
  bgOdd: '#18202f',
  numBg: '#111827',
  numFg: '#4d6075',
  textFg: '#c8d6e5',
  nullFg: '#475569',
  font: '11px system-ui, sans-serif',
  hdrFont: 'bold 11px system-ui, sans-serif',
  monoFont: '11px Consolas, Menlo, monospace',
  HDR_H: 26,
  ROW_H: 22,
  NUM_W: 40,
} as const;

// ─── API helper ───────────────────────────────────────────────────────────────

const DEFAULT_API_URL = 'https://ai.xamong.com';

function makeApiFetch(base: string) {
  return async function apiFetch(path: string, opts?: RequestInit) {
    const res = await fetch(`${base}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success === false) throw new Error(json.error ?? 'API error');
    return json;
  };
}

// ─── 샘플 쿼리 (모듈 레벨 SQL 만 유지, label/cat 은 컴포넌트 내부에서 t() 사용) ─
const SAMPLE_QUERY_SQLS = [
  {
    catKey: 'query.schemaCat',
    labelKey: 'query.tableList',
    sql: "SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name",
  },
  {
    catKey: 'query.schemaCat',
    labelKey: 'query.viewList',
    sql: "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name",
  },
  {
    catKey: 'query.schemaCat',
    labelKey: 'query.indexList',
    sql: "SELECT name, tbl_name FROM sqlite_master WHERE type='index' ORDER BY tbl_name",
  },
  {
    catKey: 'query.metaCat',
    labelKey: 'query.allCodes50',
    sql: "SELECT * FROM TB_CODE_INFO_NEW WHERE DEL_YN='N' LIMIT 50",
  },
  {
    catKey: 'query.metaCat',
    labelKey: 'query.groupType',
    sql: "SELECT * FROM TB_CODE_INFO_NEW WHERE TYPE='GROUP' AND DEL_YN='N' ORDER BY PCODE",
  },
  {
    catKey: 'query.metaCat',
    labelKey: 'query.rootNodes',
    sql: "SELECT * FROM TB_CODE_INFO_NEW WHERE PID=0 AND DEL_YN='N'",
  },
  {
    catKey: 'query.metaCat',
    labelKey: 'query.typeCount',
    sql: "SELECT TYPE, COUNT(*) AS CNT FROM TB_CODE_INFO_NEW WHERE DEL_YN='N' GROUP BY TYPE",
  },
  { catKey: 'query.statsCat', labelKey: 'query.sqliteVersion', sql: 'SELECT sqlite_version()' },
  { catKey: 'query.statsCat', labelKey: 'query.dbPageInfo', sql: 'PRAGMA page_count; PRAGMA page_size;' },
];

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface QResult {
  columns: string[];
  rows: (string | number | null)[][];
  rowCount: number;
  type: string;
  message?: string;
}

interface TableInfo {
  name: string;
}

// 그리드 액션 핸들 (컨텍스트 메뉴 및 단축키와 공유)
interface ResultGridHandle {
  copy(): Promise<void>;
  copyAll(): Promise<void>;
  paste(): Promise<void>;
  selDown(): void;
  selRight(): void;
  selAll(): void;
  delCell(): void;
  fillDown(): void;
  fillRight(): void;
  autoFit(): void;
}

// ─── SpanGrid 결과 그리드 훅 ──────────────────────────────────────────────────

function useResultGrid(
  containerRef: React.RefObject<HTMLDivElement | null>,
  columns: string[],
  rows: (string | number | null)[][],
  sortCol: number | null,
  sortAsc: boolean,
  onSortCol: (ci: number) => void,
  onCellEdit?: (ri: number, ci: number, val: string) => void,
  onCtxMenu?: (x: number, y: number, hasData: boolean) => void,
): ResultGridHandle {
  const { t } = useI18n();
  const sgCtrl = useRef<any>(null);
  const sgView = useRef<any>(null);
  const columnsRef = useRef(columns);
  const rowsRef = useRef(rows);
  const cbSort = useRef(onSortCol);
  const cbEdit = useRef(onCellEdit);
  const cbCtx = useRef(onCtxMenu);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => {
    cbSort.current = onSortCol;
  }, [onSortCol]);
  useEffect(() => {
    cbEdit.current = onCellEdit;
  }, [onCellEdit]);
  useEffect(() => {
    cbCtx.current = onCtxMenu;
  }, [onCtxMenu]);

  // ── 액션 핸들 (ref로 안정적 참조 유지) ────────────────────────────────────
  const handle = useRef<ResultGridHandle>({
    // 선택 셀(들) 복사 — SpanGrid 내장 copySelectionToTsv 활용
    copy: async () => {
      const grid = sgCtrl.current;
      if (!grid) return;
      const text = (grid.copySelectionToTsv?.() as string) ?? grid.selectedCell?.text ?? '';
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    },

    // 전체 데이터 TSV 복사 (헤더 포함)
    copyAll: async () => {
      const cols = columnsRef.current;
      const rows = rowsRef.current;
      const lines = [cols.join('\t'), ...rows.map((r) => r.map((v) => (v === null ? '' : String(v))).join('\t'))];
      try {
        await navigator.clipboard.writeText(lines.join('\n'));
      } catch {
        /* ignore */
      }
    },

    // 클립보드 내용을 현재 셀에 붙여넣기
    paste: async () => {
      const grid = sgCtrl.current;
      const view = sgView.current;
      if (!grid || !view) return;
      const cell = grid.selectedCell;
      if (!cell || cell.tag?.editable === false) return;
      try {
        const text = await navigator.clipboard.readText();
        cell.text = text;
        cbEdit.current?.(cell.tag?.rowIdx, cell.tag?.colIdx, text);
        view.draw();
      } catch {
        /* ignore */
      }
    },

    // 현재 셀 기준 행 인덱스 / 열 인덱스 반환 헬퍼
    // - grid.selectedCell 이 없으면 selectedCells[0] 사용
    // - 데이터 셀(tag.type === 'data')이 아니면 null 반환

    // 아래쪽 선택: 현재 셀부터 같은 열의 마지막 데이터 행까지 일괄 선택
    selDown: () => {
      const grid = sgCtrl.current;
      const view = sgView.current;
      if (!grid || !view) return;
      const cur: any = grid.selectedCell ?? grid.selectedCells?.[0];
      if (!cur || cur.tag?.type !== 'data') return;
      const ri = grid.rows.indexOf(cur.row) as number;
      const ci = (cur.row?.cells.indexOf(cur) ?? -1) as number;
      if (ri < 1 || ci < 1) return;
      const cells: any[] = [];
      for (let r = ri; r < grid.rows.length; r++) {
        const cell = grid.rows[r]?.cells?.[ci];
        if (cell && cell.tag?.type === 'data') cells.push(cell);
      }
      if (cells.length > 0) {
        grid.selectCells(cells);
        view.draw();
      }
    },

    // 오른쪽 선택: 현재 셀부터 같은 행의 마지막 데이터 열까지 일괄 선택
    selRight: () => {
      const grid = sgCtrl.current;
      const view = sgView.current;
      if (!grid || !view) return;
      const cur: any = grid.selectedCell ?? grid.selectedCells?.[0];
      if (!cur || cur.tag?.type !== 'data') return;
      const ri = grid.rows.indexOf(cur.row) as number;
      const ci = (cur.row?.cells.indexOf(cur) ?? -1) as number;
      if (ri < 1 || ci < 1) return;
      const row = grid.rows[ri];
      const cells: any[] = [];
      for (let c = ci; c < row.cells.length; c++) {
        const cell = row.cells[c];
        if (cell && cell.tag?.type === 'data') cells.push(cell);
      }
      if (cells.length > 0) {
        grid.selectCells(cells);
        view.draw();
      }
    },

    // 전체 선택: 헤더(행 0)·열번호(열 0) 제외, 데이터 셀만 일괄 선택
    selAll: () => {
      const grid = sgCtrl.current;
      const view = sgView.current;
      if (!grid || !view) return;
      const cells: any[] = [];
      for (let ri = 1; ri < grid.rows.length; ri++) {
        const row = grid.rows[ri];
        for (let ci = 1; ci < row.cells.length; ci++) {
          const cell = row.cells[ci];
          if (cell && cell.tag?.type === 'data') cells.push(cell);
        }
      }
      if (cells.length > 0) {
        grid.selectCells(cells);
        view.draw();
      }
    },

    // 선택 셀 삭제 (빈 문자열로 교체)
    delCell: () => {
      const grid = sgCtrl.current;
      const view = sgView.current;
      if (!grid || !view) return;
      const cells: any[] = grid.selectedCells?.length
        ? grid.selectedCells
        : grid.selectedCell
          ? [grid.selectedCell]
          : [];
      for (const c of cells) {
        if (c.tag?.editable !== false) {
          c.text = '';
          cbEdit.current?.(c.tag?.rowIdx, c.tag?.colIdx, '');
        }
      }
      view.draw();
    },

    // 채우기 — 현재 셀 값을 같은 열의 아래쪽 끝까지 복사
    fillDown: () => {
      const grid = sgCtrl.current;
      const view = sgView.current;
      if (!grid || !view) return;
      const cell = grid.selectedCell;
      if (!cell || cell.tag?.editable === false) return;
      const ri = grid.rows.indexOf(cell.row);
      const ci = cell.row?.cells.indexOf(cell) ?? -1;
      if (ri <= 0 || ci <= 0) return;
      const value = cell.text;
      for (let r = ri + 1; r < grid.rows.length; r++) {
        const c = grid.getCell(r, ci);
        if (c && c.tag?.editable !== false) {
          c.text = value;
          cbEdit.current?.(c.tag?.rowIdx, c.tag?.colIdx, value);
        }
      }
      view.draw();
    },

    // 채우기 — 현재 셀 값을 같은 행의 오른쪽 끝까지 복사
    fillRight: () => {
      const grid = sgCtrl.current;
      const view = sgView.current;
      if (!grid || !view) return;
      const cell = grid.selectedCell;
      if (!cell || cell.tag?.editable === false) return;
      const ri = grid.rows.indexOf(cell.row);
      const ci = cell.row?.cells.indexOf(cell) ?? -1;
      if (ri <= 0 || ci <= 0) return;
      const value = cell.text;
      for (let c = ci + 1; c < grid.cols.length; c++) {
        const nc = grid.getCell(ri, c);
        if (nc && nc.tag?.editable !== false) {
          nc.text = value;
          cbEdit.current?.(nc.tag?.rowIdx, nc.tag?.colIdx, value);
        }
      }
      view.draw();
    },

    // 자동맞춤 (# 열 40px 고정)
    autoFit: () => {
      try {
        sgView.current?.autoFit({
          padding: 16,
          minWidth: 50,
          maxWidth: 320,
          fill: true,
          fixedCols: { 0: DK.NUM_W },
        });
      } catch {
        /* ignore */
      }
    },
  });

  // ── 그리드 재빌드 ──────────────────────────────────────────────────────────
  const rebuild = useCallback(() => {
    const grid = sgCtrl.current;
    const view = sgView.current;
    const SG = getSG();
    if (!grid || !view || !SG) return;

    grid.rows = [];
    grid.cols = [];
    grid.merges = [];
    grid.fixed = new SG.SpanGridFixed();

    const N = columns.length + 1;

    // 컬럼 추가
    grid.addCol(new SG.SpanGridCol({ width: DK.NUM_W }));
    columns.forEach(() => grid.addCol(new SG.SpanGridCol({ width: 100 })));

    // 헤더 행
    grid.addRow(new SG.SpanGridRow({ height: DK.HDR_H }));

    const hNum = grid.getCell(0, 0);
    hNum.text = '#';
    hNum.backColor = DK.hdrBg;
    hNum.foreColor = DK.numFg;
    hNum.font = DK.hdrFont;
    hNum.textAlign = 'MiddleCenter';
    hNum.tag = { type: 'hdr-num', editable: false };

    columns.forEach((col, ci) => {
      const isSorted = sortCol === ci;
      const cell = grid.getCell(0, ci + 1);
      cell.text = isSorted ? `${col}  ${sortAsc ? '▲' : '▼'}` : col;
      cell.backColor = isSorted ? DK.hdrBgSort : DK.hdrBg;
      cell.foreColor = isSorted ? DK.hdrFgSort : DK.hdrFg;
      cell.font = DK.hdrFont;
      cell.textAlign = 'MiddleLeft';
      cell.tag = { type: 'header', editable: false, colIdx: ci };
    });

    // 헤더 하단 2px 구분선
    if (SG.SpanGridBorder && SG.BorderDirection) {
      const hdrLine = new SG.SpanGridBorder({
        color: '#3b5070',
        borderDirection: SG.BorderDirection.Bottom,
        lineWidth: 2,
      });
      for (let ci = 0; ci < N; ci++) {
        const c = grid.getCell(0, ci);
        if (c) c.border = hdrLine;
      }
    }

    // 데이터 행
    if (rows.length === 0) {
      grid.addRow(new SG.SpanGridRow({ height: 48 }));
      const empty = grid.getCell(1, 0);
      empty.text = columns.length > 0 ? t('query.noResults') : t('query.runToSeeResults');
      empty.foreColor = '#475569';
      empty.backColor = DK.bgEven;
      empty.textAlign = 'MiddleCenter';
      if (N > 1) grid.mergeCells(1, 0, 1, N - 1);
    } else {
      rows.forEach((row, ri) => {
        grid.addRow(new SG.SpanGridRow({ height: DK.ROW_H }));
        const ri1 = ri + 1;
        const bg = ri % 2 === 0 ? DK.bgEven : DK.bgOdd;

        const numCell = grid.getCell(ri1, 0);
        numCell.text = String(ri + 1);
        numCell.backColor = DK.numBg;
        numCell.foreColor = DK.numFg;
        numCell.font = DK.font;
        numCell.textAlign = 'MiddleRight';
        numCell.tag = { type: 'rownum', editable: false };

        row.forEach((val, ci) => {
          const cell = grid.getCell(ri1, ci + 1);
          const isNull = val === null;
          cell.text = isNull ? 'NULL' : String(val);
          cell.backColor = bg;
          cell.foreColor = isNull ? DK.nullFg : DK.textFg;
          cell.font = DK.monoFont;
          cell.textAlign = 'MiddleLeft';
          cell.tag = { type: 'data', editable: true, isNull, rowIdx: ri, colIdx: ci };
        });
      });
    }

    // AutoFit — # 열 40px 고정, 나머지 자동 + fill
    try {
      grid.autoFitCols({
        padding: 16,
        minWidth: 50,
        maxWidth: 320,
        fill: true,
        fixedCols: { 0: DK.NUM_W },
      });
    } catch {
      grid.layout();
    }

    view.resize();
    view.draw();
  }, [columns, rows, sortCol, sortAsc, t]);

  // ── 마운트: canvas + SpanGrid 생성 ────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const SG = getSG();
    if (!container || !SG) return;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const w = container.clientWidth || 600;
    const h = container.clientHeight || 300;

    const grid = new SG.SpanGridControl({
      width: w,
      height: h,
      backColor: '#1c2333',
      borderStyle: 'None',
      lineColor: '#2d3f52',
      lineWidth: 1,
      focusColor: '#6366f1',
    });
    sgCtrl.current = grid;

    const view = new SG.SpanGridCanvasView(canvas, grid);
    sgView.current = view;

    // commitCellEdit 패치: React 상태 동기화
    const origCommit = view.commitCellEdit.bind(view);
    view.commitCellEdit = (moveAction?: any) => {
      const cell = view.editingCell;
      const result = origCommit(moveAction);
      if (result && cell?.tag?.type === 'data') {
        cbEdit.current?.(cell.tag.rowIdx, cell.tag.colIdx, cell.text);
      }
      return result;
    };

    // 헤더 클릭 → 정렬
    grid.onCellClick(({ cell }: any) => {
      if (cell?.tag?.type === 'header') cbSort.current(cell.tag.colIdx);
    });

    // 컨텍스트 메뉴 — 마우스 오른쪽 버튼
    const onCtxMenu = (e: MouseEvent) => {
      const cell = grid.selectedCell as any;
      const hasData = cell?.tag?.type === 'data';
      cbCtx.current?.(e.clientX, e.clientY, hasData);
    };
    canvas.addEventListener('contextmenu', onCtxMenu);

    // 키보드 단축키 (SpanGrid가 Ctrl 조합을 무시하므로 직접 처리)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!view.editingCell) {
          e.preventDefault();
          handle.current.delCell();
        }
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      switch (e.key.toLowerCase()) {
        case 'v':
          e.preventDefault();
          handle.current.paste();
          break;
        case 'a':
          e.preventDefault();
          handle.current.selAll();
          break;
        case 'd':
          e.preventDefault();
          handle.current.fillDown();
          break;
        case 'r':
          e.preventDefault();
          handle.current.fillRight();
          break;
      }
    };
    canvas.addEventListener('keydown', onKeyDown);

    // ResizeObserver
    const ro = new ResizeObserver(() => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw > 10 && ch > 10) {
        grid.width = cw;
        grid.height = ch;
        grid.layout();
        view.resize();
        view.draw();
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      canvas.removeEventListener('contextmenu', onCtxMenu);
      canvas.removeEventListener('keydown', onKeyDown);
      try {
        view.unbind();
      } catch {
        /* ignore */
      }
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
      sgCtrl.current = null;
      sgView.current = null;
    };
  }, [containerRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    rebuild();
  }, [rebuild]);

  return handle.current;
}

// ─── 컨텍스트 메뉴 타입 ──────────────────────────────────────────────────────

interface SubMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  action: () => void;
}
interface MenuItem {
  id: string;
  label?: string;
  shortcut?: string;
  disabled?: boolean;
  action?: () => void;
  sub?: SubMenuItem[];
  sep?: true;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

interface QueryAnalyzerPaneProps {
  /** apiUrl을 직접 지정하면 설정에서 읽지 않고 해당 URL을 사용한다. (OD 전용) */
  apiUrl?: string;
}

export default function QueryAnalyzerPane({ apiUrl: fixedApiUrl }: QueryAnalyzerPaneProps = {}) {
  const { t } = useI18n();
  const [apiUrl, setApiUrl] = useState(fixedApiUrl ?? DEFAULT_API_URL);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selTable, setSelTable] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showSamples, setShowSamples] = useState(false);
  const [sampleCat, setSampleCat] = useState(() => t('query.schemaCat'));
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // ── 번역된 샘플 쿼리 목록 ─────────────────────────────────────────────────
  const SAMPLE_QUERIES = useMemo(
    () =>
      SAMPLE_QUERY_SQLS.map((s) => ({
        cat: t(s.catKey),
        label: t(s.labelKey),
        sql: s.sql,
      })),
    [t],
  );

  // ── 컨텍스트 메뉴 상태 ────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; hasData: boolean } | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sampBtnRef = useRef<HTMLButtonElement>(null);
  const resultGridRef = useRef<HTMLDivElement>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiFetch = useRef(makeApiFetch(fixedApiUrl ?? DEFAULT_API_URL));

  // ── 설정에서 API URL 로드 + 변경 감지 (fixedApiUrl이 없을 때만) ────────────
  useEffect(() => {
    if (fixedApiUrl) return; // 고정 URL이 있으면 설정 무시

    window.terminalAPI
      .getSettings()
      .then((s) => {
        const url = s.apiUrl || DEFAULT_API_URL;
        setApiUrl(url);
        apiFetch.current = makeApiFetch(url);
      })
      .catch(() => {});

    const onChanged = (e: Event) => {
      // detail.apiUrl 이 명시적으로 있을 때만 갱신.
      // AI 설정 모달 등 apiUrl 을 포함하지 않는 이벤트에서 DEFAULT_API_URL 로
      // 덮어쓰는 버그를 방지한다.
      const newUrl = (e as CustomEvent).detail?.apiUrl;
      if (newUrl !== undefined) {
        const url = newUrl || DEFAULT_API_URL;
        setApiUrl(url);
        apiFetch.current = makeApiFetch(url);
        setConnected(null); // 재연결 유도
      }
    };
    window.addEventListener('app-settings-changed', onChanged);
    return () => window.removeEventListener('app-settings-changed', onChanged);
  }, [fixedApiUrl]);

  // ── 정렬된 행 (메모이제이션) ───────────────────────────────────────────────
  const sortedRows = useMemo(() => {
    if (!result) return [];
    if (sortCol === null) return result.rows;
    return [...result.rows].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === null) return sortAsc ? 1 : -1;
      if (bv === null) return sortAsc ? -1 : 1;
      const n = Number(av) - Number(bv);
      if (!isNaN(n)) return sortAsc ? n : -n;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [result, sortCol, sortAsc]);

  // ── 정렬 핸들러 ────────────────────────────────────────────────────────────
  const handleSortCol = useCallback(
    (ci: number) => {
      if (sortCol === ci) setSortAsc((a) => !a);
      else {
        setSortCol(ci);
        setSortAsc(true);
      }
    },
    [sortCol],
  );

  // ── SpanGrid 결과 그리드 훅 ─────────────────────────────────────────────────
  const gridHandle = useResultGrid(
    resultGridRef,
    result?.columns ?? [],
    sortedRows,
    sortCol,
    sortAsc,
    handleSortCol,
    undefined,
    (x, y, hasData) => {
      setCtxMenu({ x, y, hasData });
      setActiveSub(null);
    },
  );

  // ── 컨텍스트 메뉴 닫기 ────────────────────────────────────────────────────
  const closeCtxMenu = useCallback(() => {
    setCtxMenu(null);
    setActiveSub(null);
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => closeCtxMenu();
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [ctxMenu, closeCtxMenu]);

  // ── status helper ──────────────────────────────────────────────────────────
  const showStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatusMsg(''), 5000);
  }, []);

  // ── 연결 확인 ──────────────────────────────────────────────────────────────
  const checkConn = useCallback(async () => {
    try {
      const r = await fetch(`${apiUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
      setConnected(r.ok);
      return r.ok;
    } catch {
      setConnected(false);
      return false;
    }
  }, [apiUrl]);

  // ── 테이블 목록 로드 ───────────────────────────────────────────────────────
  const loadTables = useCallback(async () => {
    try {
      const { data } = await apiFetch.current('/api/database/query', {
        method: 'POST',
        body: JSON.stringify({ sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" }),
      });
      setTables((data?.rows ?? []).map((r: any) => ({ name: r.name ?? String(Object.values(r)[0]) })));
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  // ── 쿼리 실행 ──────────────────────────────────────────────────────────────
  const runQuery = useCallback(
    async (sql: string) => {
      const q = sql.trim();
      if (!q) return;
      setIsLoading(true);
      setError(null);
      setResult(null);
      setSortCol(null);
      setSortAsc(true);
      const t0 = Date.now();
      try {
        const { data } = await apiFetch.current('/api/database/query', {
          method: 'POST',
          body: JSON.stringify({ sql: q }),
        });
        if (data?.type === 'SELECT') {
          const rowData = data.rows ?? [];
          const cols: string[] = rowData.length > 0 ? Object.keys(rowData[0]) : (data.columns ?? []);
          setResult({
            columns: cols,
            rows: rowData.map((r: any) => cols.map((c: string) => r[c] ?? null)),
            rowCount: data.rowCount ?? rowData.length,
            type: 'SELECT',
          });
          showStatus(
            t('query.rowsReturned', { n: String(data.rowCount ?? rowData.length), ms: String(Date.now() - t0) }),
          );
        } else {
          const msg =
            data?.changes !== undefined
              ? t('query.rowsChanged', { n: String(data.changes) })
              : (data?.message ?? t('query.runComplete'));
          setResult({
            columns: [t('query.resultCol')],
            rows: [[msg]],
            rowCount: 1,
            type: data?.type ?? 'DML',
            message: msg,
          });
          showStatus(`✓ ${msg} (${Date.now() - t0}ms)`);
          loadTables();
        }
      } catch (e: any) {
        setError(e.message);
        showStatus(`⚠ ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [showStatus, loadTables],
  );

  const handleTableClick = useCallback((name: string) => {
    setSelTable(name);
    setQuery(`SELECT * FROM ${name} LIMIT 100`);
    textareaRef.current?.focus();
  }, []);

  const handleTableDblClick = useCallback(
    (name: string) => {
      setSelTable(name);
      const sql = `SELECT * FROM ${name} LIMIT 100`;
      setQuery(sql);
      runQuery(sql);
    },
    [runQuery],
  );

  // ── 샘플 메뉴 닫기 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showSamples) return;
    const close = (e: MouseEvent) => {
      if (!sampBtnRef.current?.closest('.qa-sample-wrap')?.contains(e.target as Node)) setShowSamples(false);
    };
    document.addEventListener('mousedown', close, true);
    return () => document.removeEventListener('mousedown', close, true);
  }, [showSamples]);

  // ── 초기화 ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    checkConn().then((ok) => {
      if (ok && !cancelled) loadTables();
    });
    return () => {
      cancelled = true;
    };
  }, [checkConn, loadTables]);

  const cats = [...new Set(SAMPLE_QUERIES.map((s) => s.cat))];
  const hasResult = !!result && result.columns.length > 0;
  const showOverlay = isLoading || !hasResult;
  const hasData = ctxMenu?.hasData ?? false;

  // ── 컨텍스트 메뉴 정의 ────────────────────────────────────────────────────
  const menuItems: MenuItem[] = [
    {
      id: 'copy',
      label: t('query.copy'),
      sub: [
        {
          id: 'copy-sel',
          label: t('query.copy'),
          shortcut: 'Ctrl+C',
          action: () => {
            gridHandle.copy();
            closeCtxMenu();
          },
        },
        {
          id: 'copy-all',
          label: t('query.copyAll'),
          action: () => {
            gridHandle.copyAll();
            closeCtxMenu();
          },
        },
      ],
    },
    {
      id: 'paste',
      label: t('query.paste'),
      shortcut: 'Ctrl+V',
      disabled: !hasData,
      action: () => {
        gridHandle.paste();
        closeCtxMenu();
      },
    },
    { id: 's1', sep: true },
    {
      id: 'select',
      label: t('query.selectBelow'),
      sub: [
        {
          id: 'sel-down',
          label: t('query.above'),
          action: () => {
            gridHandle.selDown();
            closeCtxMenu();
          },
        },
        {
          id: 'sel-right',
          label: t('query.selectRight'),
          action: () => {
            gridHandle.selRight();
            closeCtxMenu();
          },
        },
        {
          id: 'sel-all',
          label: t('query.selectAll'),
          shortcut: 'Ctrl+A',
          action: () => {
            gridHandle.selAll();
            closeCtxMenu();
          },
        },
      ],
    },
    { id: 's2', sep: true },
    {
      id: 'delete',
      label: t('query.delete'),
      disabled: !hasData,
      action: () => {
        gridHandle.delCell();
        closeCtxMenu();
      },
    },
    { id: 's3', sep: true },
    {
      id: 'fill',
      label: t('query.fill'),
      sub: [
        {
          id: 'fill-down',
          label: t('query.above'),
          shortcut: 'Ctrl+D',
          disabled: !hasData,
          action: () => {
            gridHandle.fillDown();
            closeCtxMenu();
          },
        },
        {
          id: 'fill-right',
          label: t('query.selectRight'),
          shortcut: 'Ctrl+R',
          disabled: !hasData,
          action: () => {
            gridHandle.fillRight();
            closeCtxMenu();
          },
        },
      ],
    },
    { id: 's4', sep: true },
    {
      id: 'autofit',
      label: t('query.autoFit'),
      action: () => {
        gridHandle.autoFit();
        closeCtxMenu();
      },
    },
  ];

  return (
    <div className="qa-pane">
      {/* ════════════ 좌측: 테이블 사이드바 ════════════ */}
      <aside className="qa-sidebar">
        <div className="qa-sidebar-header">
          <span className="qa-sidebar-icon">🗂</span>
          <span className="qa-sidebar-title">{t('query.tableListTitle')}</span>
          {connected === true && (
            <span className="mm-online-badge" title={t('query.connectedTitle')}>
              ●
            </span>
          )}
          {connected === false && <span className="mm-offline-badge">{t('query.offline')}</span>}
          <button
            className="mm-icon-btn"
            title={t('query.refreshTitle')}
            onClick={loadTables}
            disabled={isLoading}
            style={{ marginLeft: 'auto' }}
          >
            <span className={isLoading ? 'mm-spin' : ''}>↻</span>
          </button>
        </div>

        <div className="qa-table-list">
          {connected === false ? (
            <div className="mm-tree-empty">
              <span>🔌</span>
              <p>{t('query.serverError')}</p>
              <p className="mm-tree-hint">{t('query.localhostHint')}</p>
              <button
                className="mm-retry-btn"
                onClick={() =>
                  checkConn().then((ok) => {
                    if (ok) loadTables();
                  })
                }
              >
                {t('query.reconnect')}
              </button>
            </div>
          ) : tables.length === 0 ? (
            <div className="mm-tree-empty">
              <span style={{ fontSize: 20, opacity: 0.4 }}>📭</span>
              <p style={{ fontSize: 11, color: 'var(--text-mute)' }}>{t('query.noTables')}</p>
            </div>
          ) : (
            tables.map((t) => (
              <div
                key={t.name}
                className={`qa-table-row${selTable === t.name ? ' selected' : ''}`}
                onClick={() => handleTableClick(t.name)}
                onDoubleClick={() => handleTableDblClick(t.name)}
                title={`더블클릭: SELECT * FROM ${t.name} LIMIT 100`}
              >
                <span className="qa-table-icon">▤</span>
                <span className="qa-table-name">{t.name}</span>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ════════════ 우측: 에디터 + 결과 ════════════ */}
      <main className="qa-main">
        {/* ── 쿼리 에디터 ────────────────────────────────────────────────── */}
        <div className="qa-editor-section">
          <textarea
            ref={textareaRef}
            className="qa-editor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('query.shortcutHint')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                runQuery(query);
              }
            }}
            spellCheck={false}
          />
          <div className="qa-editor-toolbar">
            <button className="qa-btn qa-btn-run" onClick={() => runQuery(query)} disabled={isLoading || !query.trim()}>
              {isLoading ? t('query.running') : t('query.runBtn')}
            </button>
            <button
              className="qa-btn"
              onClick={() => {
                setQuery('');
                setResult(null);
                setError(null);
                setSortCol(null);
                textareaRef.current?.focus();
              }}
            >
              {t('query.clearBtn')}
            </button>

            <div className="qa-sample-wrap" style={{ position: 'relative' }}>
              <button ref={sampBtnRef} className="qa-btn" onClick={() => setShowSamples((v) => !v)}>
                {t('query.sampleBtn')}
              </button>
              {showSamples && (
                <div className="qa-sample-menu">
                  <div className="qa-sample-cats">
                    {cats.map((c) => (
                      <button
                        key={c}
                        className={`qa-sample-cat-btn${sampleCat === c ? ' active' : ''}`}
                        onClick={() => setSampleCat(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="qa-sample-items">
                    {SAMPLE_QUERIES.filter((s) => s.cat === sampleCat).map((s, i) => (
                      <button
                        key={i}
                        className="qa-sample-item"
                        onClick={() => {
                          setQuery(s.sql);
                          setShowSamples(false);
                          textareaRef.current?.focus();
                        }}
                      >
                        <div className="qa-sample-label">{s.label}</div>
                        <div className="qa-sample-sql">{s.sql}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="qa-hint">{t('query.shortcutHint')}</span>
          </div>
        </div>

        {/* ── 결과 영역 ─────────────────────────────────────────────────── */}
        <div className="qa-results-section">
          <div className="qa-results-header">
            <span className="qa-results-title">{t('query.resultTitle')}</span>
            {result && (
              <span className="qa-results-meta">
                {result.type === 'SELECT'
                  ? t('query.rowColInfo', {
                      rows: String(result.rowCount.toLocaleString()),
                      cols: String(result.columns.length),
                    })
                  : result.message}
              </span>
            )}
            {statusMsg && <span className={`qa-status${statusMsg.startsWith('⚠') ? ' error' : ''}`}>{statusMsg}</span>}
            {result && sortCol !== null && (
              <button
                className="qa-btn qa-btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setSortCol(null);
                  setSortAsc(true);
                }}
                title={t('query.resetSortTitle')}
              >
                {t('query.resetSortBtn')}
              </button>
            )}
          </div>

          {error && (
            <div className="qa-error">
              <span style={{ marginRight: 6 }}>⚠</span>
              {error}
            </div>
          )}

          <div className="qa-grid-area">
            <div ref={resultGridRef} className="qa-grid-container" />
            {showOverlay && (
              <div className="qa-grid-overlay">
                {isLoading ? (
                  <>
                    <span className="mm-spin" style={{ fontSize: 22 }}>
                      ↻
                    </span>
                    <span style={{ marginLeft: 8, color: 'var(--text-dim)', fontSize: 12 }}>
                      {t('query.runningMsg')}
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 28, opacity: 0.22 }}>📊</span>
                    <p style={{ margin: '7px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>{t('query.runToSee')}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-mute)' }}>
                      {t('query.doubleClickHint')}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ════════════ 컨텍스트 메뉴 Portal ════════════ */}
      {ctxMenu &&
        createPortal(
          <div className="qa-ctx-backdrop" onMouseDown={closeCtxMenu}>
            <div
              className="sg-ctx-menu qa-ctx-menu"
              style={{ top: ctxMenu.y, left: ctxMenu.x }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {menuItems.map((item) => {
                if (item.sep) return <div key={item.id} className="sg-ctx-sep" />;

                // 서브메뉴가 있는 항목
                if (item.sub) {
                  return (
                    <div
                      key={item.id}
                      className={`sg-ctx-item qa-ctx-has-sub${item.disabled ? ' sg-ctx-disabled' : ''}${activeSub === item.id ? ' active' : ''}`}
                      onMouseEnter={() => setActiveSub(item.id)}
                      onMouseLeave={(e) => {
                        // 마우스가 서브메뉴로 이동했는지 확인
                        if (!(e.relatedTarget as Element)?.closest('.qa-ctx-submenu')) {
                          setActiveSub(null);
                        }
                      }}
                    >
                      <span className="qa-ctx-label">{item.label}</span>
                      <span className="qa-ctx-arrow">▸</span>

                      {activeSub === item.id && (
                        <div
                          className="sg-ctx-menu qa-ctx-submenu"
                          onMouseEnter={() => setActiveSub(item.id)}
                          onMouseLeave={() => setActiveSub(null)}
                        >
                          {item.sub.map((sub) => (
                            <button
                              key={sub.id}
                              className={`sg-ctx-item${sub.disabled ? ' sg-ctx-disabled' : ''}`}
                              onClick={sub.disabled ? undefined : sub.action}
                            >
                              <span className="qa-ctx-label">{sub.label}</span>
                              {sub.shortcut && <span className="qa-ctx-shortcut">{sub.shortcut}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // 일반 항목
                return (
                  <button
                    key={item.id}
                    className={`sg-ctx-item${item.disabled ? ' sg-ctx-disabled' : ''}`}
                    onClick={item.disabled ? undefined : item.action}
                    onMouseEnter={() => setActiveSub(null)}
                  >
                    <span className="qa-ctx-label">{item.label}</span>
                    {item.shortcut && <span className="qa-ctx-shortcut">{item.shortcut}</span>}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
