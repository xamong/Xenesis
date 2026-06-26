import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePaneRefresh } from '../hooks/usePaneRefresh';
import { useI18n } from '../i18n';

// ── 상수 ──────────────────────────────────────────────────────────────────────

const BYTES_PER_ROW = 16;
const ROW_HEIGHT = 20; // px (CSS와 동기화 필요)
const OVERSCAN = 30; // 위아래로 미리 렌더할 추가 행 수
const HEX_MAX_BYTES = 1024 * 1024; // 1 MiB

// ── 유틸 ──────────────────────────────────────────────────────────────────────

/** Base64 문자열 → Uint8Array */
function base64ToBytes(b64: string): Uint8Array {
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes;
}

function toHex2(n: number): string {
  return n.toString(16).toUpperCase().padStart(2, '0');
}

function toOffsetStr(offset: number): string {
  return offset.toString(16).toUpperCase().padStart(8, '0');
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** 파일 시그니처로 포맷 추측 */
function guessFormat(bytes: Uint8Array): string {
  if (bytes.length < 4) return '';
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'PNG';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'JPEG';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'GIF';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'RIFF (WAV/AVI)';
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'PDF';
  if (b[0] === 0x4d && b[1] === 0x5a) return 'PE (EXE/DLL)';
  if (b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) return 'ELF';
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return 'ZIP / Office / EPUB';
  if (b[0] === 0x1f && b[1] === 0x8b) return 'GZIP';
  if (b[0] === 0x42 && b[1] === 0x4d) return 'BMP';
  if (b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) return 'TTF';
  if (b[0] === 0x53 && b[1] === 0x51 && b[2] === 0x4c && b[3] === 0x69) return 'SQLite';
  return '';
}

// ── 단일 행 컴포넌트 ─────────────────────────────────────────────────────────

interface HexRowProps {
  offset: number;
  bytes: Uint8Array;
  hoverByte: number | null;
  selectedByte: number | null;
  onHover: (abs: number | null) => void;
  onSelect: (abs: number) => void;
}

const HexRow = React.memo(function HexRow({ offset, bytes, hoverByte, selectedByte, onHover, onSelect }: HexRowProps) {
  const hexCells: React.ReactNode[] = [];
  const asciiCells: React.ReactNode[] = [];

  for (let i = 0; i < BYTES_PER_ROW; i++) {
    const absIdx = offset + i;
    const b = bytes[i];
    const isHover = hoverByte === absIdx;
    const isSelected = selectedByte === absIdx;
    const isEmpty = b === undefined;

    if (i === 8)
      hexCells.push(
        <span key="gap" className="hex-gap">
          {' '}
        </span>,
      );

    hexCells.push(
      <span
        key={i}
        className={`hex-cell${isHover ? ' is-hover' : ''}${isSelected ? ' is-selected' : ''}${isEmpty ? ' is-empty' : ''}`}
        onMouseEnter={() => !isEmpty && onHover(absIdx)}
        onMouseLeave={() => onHover(null)}
        onClick={() => !isEmpty && onSelect(absIdx)}
      >
        {isEmpty ? '  ' : toHex2(b)}
      </span>,
    );

    if (isEmpty) {
      asciiCells.push(
        <span key={i} className="hex-ascii-cell is-empty">
          {' '}
        </span>,
      );
    } else {
      const isPrintable = b >= 0x20 && b < 0x7f;
      asciiCells.push(
        <span
          key={i}
          className={`hex-ascii-cell${isHover ? ' is-hover' : ''}${isSelected ? ' is-selected' : ''}${isPrintable ? '' : ' is-ctrl'}`}
          onMouseEnter={() => onHover(absIdx)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(absIdx)}
        >
          {isPrintable ? String.fromCharCode(b) : '·'}
        </span>,
      );
    }
  }

  return (
    <div className="hex-row" style={{ height: ROW_HEIGHT }}>
      <span className="hex-offset">{toOffsetStr(offset)}</span>
      <span className="hex-bytes">{hexCells}</span>
      <span className="hex-sep">│</span>
      <span className="hex-ascii">{asciiCells}</span>
    </div>
  );
});

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export interface HexPaneProps {
  fileName: string;
  filePath: string;
  /** Base64 인코딩된 바이너리 데이터 */
  content: string;
  /** 원본 전체 파일 크기 (bytes) — 잘린 경우 content보다 클 수 있음 */
  totalBytes?: number;
}

export function HexPane({ fileName, filePath, content, totalBytes }: HexPaneProps) {
  const { t } = useI18n();
  const [bytes, setBytes] = useState<Uint8Array>(() => new Uint8Array(0));
  const [format, setFormat] = useState('');
  const [hoverByte, setHoverByte] = useState<number | null>(null);
  const [selectedByte, setSelectedByte] = useState<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH, setContainerH] = useState(400);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<string>('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    const result = await window.fileAPI.readFile(filePath);
    if (!result?.content) return;
    try {
      const arr = base64ToBytes(result.content);
      setBytes(arr);
      setFormat(guessFormat(arr));
      setSelectedByte(null);
      setHoverByte(null);
    } catch {
      /* 디코딩 실패 시 무시 */
    }
  }, [filePath]);

  const { isRefreshing, refresh } = usePaneRefresh({ onRefresh: handleRefresh });

  // Base64 디코딩
  useEffect(() => {
    if (!content) {
      setBytes(new Uint8Array(0));
      return;
    }
    try {
      const arr = base64ToBytes(content);
      setBytes(arr);
      setFormat(guessFormat(arr));
      setSelectedByte(null);
      setHoverByte(null);
    } catch {
      setBytes(new Uint8Array(0));
    }
  }, [content]);

  // 컨테이너 높이 측정
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerH(entries[0].contentRect.height);
    });
    ro.observe(el);
    setContainerH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const totalRows = Math.ceil(bytes.length / BYTES_PER_ROW);
  const totalH = totalRows * ROW_HEIGHT;
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + containerH) / ROW_HEIGHT) + OVERSCAN);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // ── 검색 (Hex 또는 ASCII) ────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (!q || bytes.length === 0) {
      setSearchResult('');
      return;
    }

    // Hex 패턴인지 확인 (공백으로 분리된 2자리 hex)
    const hexPat = /^([0-9a-fA-F]{2}\s*)+$/.test(q);
    let needle: number[];

    if (hexPat) {
      needle = q
        .replace(/\s+/g, '')
        .match(/.{2}/g)!
        .map((h) => parseInt(h, 16));
    } else {
      needle = Array.from(new TextEncoder().encode(q));
    }

    // 단순 선형 검색
    let found = -1;
    const start = selectedByte !== null ? selectedByte + 1 : 0;
    for (let i = start; i <= bytes.length - needle.length; i++) {
      let match = true;
      for (let j = 0; j < needle.length; j++) {
        if (bytes[i + j] !== needle[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        found = i;
        break;
      }
    }

    if (found === -1) {
      setSearchResult(t('hex.notFound', { q }));
    } else {
      setSelectedByte(found);
      setSearchResult(`offset 0x${toOffsetStr(found)} (${found})`);
      // 해당 행으로 스크롤
      const row = Math.floor(found / BYTES_PER_ROW);
      const targetScrollTop = Math.max(0, row * ROW_HEIGHT - containerH / 2);
      scrollRef.current?.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  }, [searchQuery, bytes, selectedByte, containerH, t]);

  // ── 선택 바이트 정보 ─────────────────────────────────────────────────────
  const selInfo =
    selectedByte !== null && bytes[selectedByte] !== undefined
      ? (() => {
          const b = bytes[selectedByte];
          const i8 = b > 127 ? b - 256 : b;
          const u16 = selectedByte + 1 < bytes.length ? (b | (bytes[selectedByte + 1] << 8)) >>> 0 : null;
          return { b, i8, u16, ascii: b >= 32 && b < 127 ? String.fromCharCode(b) : null };
        })()
      : null;

  const fileSizeStr = formatBytes(bytes.length);
  const totalStr = totalBytes !== undefined ? formatBytes(totalBytes) : fileSizeStr;
  const truncated = totalBytes !== undefined && bytes.length < totalBytes;

  // ── 렌더 ────────────────────────────────────────────────────────────────
  const rows: React.ReactNode[] = [];
  for (let r = startRow; r < endRow; r++) {
    const off = r * BYTES_PER_ROW;
    const rowSlice = bytes.slice(off, off + BYTES_PER_ROW);
    // 마지막 행 패딩 (빈 슬롯 표시용)
    const padded =
      rowSlice.length < BYTES_PER_ROW
        ? new Uint8Array(BYTES_PER_ROW) // zeros — handled by isEmpty check
        : rowSlice;
    rows.push(
      <HexRow
        key={r}
        offset={off}
        bytes={rowSlice.length < BYTES_PER_ROW ? padded : rowSlice}
        hoverByte={hoverByte}
        selectedByte={selectedByte}
        onHover={setHoverByte}
        onSelect={setSelectedByte}
      />,
    );
  }

  // 마지막 행에서 슬라이스 길이 패딩 보정 필요 — 별도 처리 없이 isEmpty 클래스로 처리
  // (rowSlice.length === BYTES_PER_ROW 이 아닌 경우 빈 슬롯 표시)
  // 재렌더 시 행별로 정확하게 처리하려면 rows 교체
  if (endRow > startRow) {
    const lastRowIdx = endRow - 1;
    const lastOff = lastRowIdx * BYTES_PER_ROW;
    const lastSlice = bytes.slice(lastOff, lastOff + BYTES_PER_ROW);
    if (lastSlice.length < BYTES_PER_ROW && rows.length > 0) {
      rows[rows.length - 1] = (
        <HexRow
          key={lastRowIdx}
          offset={lastOff}
          bytes={lastSlice}
          hoverByte={hoverByte}
          selectedByte={selectedByte}
          onHover={setHoverByte}
          onSelect={setSelectedByte}
        />
      );
    }
  }

  return (
    <div className="hex-pane">
      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div className="hex-toolbar">
        <span className="hex-filename" title={filePath}>
          {fileName}
        </span>
        {format && <span className="hex-format-badge">{format}</span>}
        <span className="hex-size-badge">
          {fileSizeStr}
          {truncated && ` / ${totalStr} (first 1MiB)`}
        </span>
        {truncated && <span className="hex-truncate-warn">{t('hex.truncated')}</span>}
        <div style={{ flex: 1 }} />
        <button
          className={`pane-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
          onClick={refresh}
          disabled={isRefreshing}
          title={t('common.reloadFromDisk')}
        >
          ↺
        </button>
      </div>

      {/* ── 검색 바 ───────────────────────────────────────────────────────── */}
      <div className="hex-searchbar">
        <span className="hex-searchbar-label">🔍</span>
        <input
          className="hex-search-input"
          placeholder={t('hex.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchResult('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          spellCheck={false}
        />
        <button className="hex-search-btn" onClick={handleSearch}>
          {t('hex.searchBtn')}
        </button>
        {searchResult && <span className="hex-search-result">{searchResult}</span>}
      </div>

      {/* ── 컬럼 헤더 ─────────────────────────────────────────────────────── */}
      <div className="hex-col-header">
        <span className="hex-offset">Offset</span>
        <span className="hex-bytes">
          {Array.from({ length: 16 }, (_, i) => (
            <React.Fragment key={i}>
              {i === 8 && <span className="hex-gap"> </span>}
              <span className={`hex-col-idx${i === (hoverByte !== null ? hoverByte % 16 : -1) ? ' is-hover' : ''}`}>
                {toHex2(i)}
              </span>
            </React.Fragment>
          ))}
        </span>
        <span className="hex-sep">│</span>
        <span className="hex-ascii-header">0123456789ABCDEF</span>
      </div>

      {/* ── 가상 스크롤 뷰포트 ────────────────────────────────────────────── */}
      <div className="hex-scroll-wrapper" ref={containerRef}>
        <div
          ref={scrollRef}
          className="hex-scroll"
          onScroll={handleScroll}
          tabIndex={0}
          aria-label={t('hex.hexViewer')}
        >
          <div className="hex-total-spacer" style={{ height: totalH }}>
            <div className="hex-rows-window" style={{ transform: `translateY(${startRow * ROW_HEIGHT}px)` }}>
              {rows}
            </div>
          </div>
        </div>
      </div>

      {/* ── 상태 바 ───────────────────────────────────────────────────────── */}
      <div className="hex-statusbar">
        {selInfo ? (
          <>
            <span>
              offset: <b>0x{toOffsetStr(selectedByte!)}</b> ({selectedByte!})
            </span>
            <span>
              uint8: <b>{selInfo.b}</b>
            </span>
            <span>
              int8: <b>{selInfo.i8}</b>
            </span>
            {selInfo.u16 !== null && (
              <span>
                uint16‑LE: <b>{selInfo.u16}</b>
              </span>
            )}
            {selInfo.ascii && (
              <span>
                ascii: <b>'{selInfo.ascii}'</b>
              </span>
            )}
          </>
        ) : (
          <span>{t('hex.clickByte')}</span>
        )}
        <span className="hex-statusbar-right">
          {bytes.length.toLocaleString()} bytes · {totalRows} rows
        </span>
      </div>
    </div>
  );
}
