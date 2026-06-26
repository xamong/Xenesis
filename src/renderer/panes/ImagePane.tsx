import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePaneRefresh } from '../hooks/usePaneRefresh';
import { useI18n } from '../i18n';

interface ImagePaneProps {
  fileName: string;
  filePath: string;
  imageUrl: string; // data URL from IPC
}

/** ext → MIME 타입 변환 */
function extToMime(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'svg') return 'image/svg+xml';
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  return `image/${e}`;
}

const SCALE_MIN = 0.05; // 5%
const SCALE_MAX = 10; // 1000%

function clamp(s: number) {
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));
}

export function ImagePane({ fileName, filePath, imageUrl }: ImagePaneProps) {
  const { t } = useI18n();
  const [localImageUrl, setLocalImageUrl] = useState(imageUrl);
  const [error, setError] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  /**
   * null  → 화면 맞춤(fit) 모드: CSS max-width/max-height로 뷰포트에 맞춤
   * number → 명시적 배율 모드 (1.0 = 100% = 원래 크기)
   */
  const [scale, setScale] = useState<number | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);

  // 이미지 URL 변경 시 초기화
  useEffect(() => {
    setLocalImageUrl(imageUrl);
    setError(false);
    setScale(null);
    setNaturalSize({ w: 0, h: 0 });
  }, [imageUrl]);

  // ── 뷰포트 기준 fit 배율 계산 ──────────────────────────────────────────────
  const getFitScale = useCallback((): number => {
    const vp = viewportRef.current;
    if (!vp || !naturalSize.w || !naturalSize.h) return 1;
    const pad = 40;
    const availW = Math.max(1, vp.clientWidth - pad);
    const availH = Math.max(1, vp.clientHeight - pad);
    return Math.min(1, availW / naturalSize.w, availH / naturalSize.h);
  }, [naturalSize]);

  /** fit 모드이거나 naturalSize가 아직 없으면 CSS가 처리 → is-fit 클래스 적용 */
  const isFitMode = scale === null || naturalSize.w === 0;

  /** 실제 표시 배율 (상태바·툴바 표시용) */
  const effectiveScale = isFitMode ? getFitScale() : scale!;
  const displayPct = Math.round(effectiveScale * 100);

  // ── Ctrl+휠 확대/축소 ──────────────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const cur = isFitMode ? getFitScale() : scale!;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setScale(clamp(cur * factor));
    },
    [scale, isFitMode, getFitScale],
  );

  // ── 새로고침 ──────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    const result = await window.fileAPI.readFile(filePath);
    if (!result?.content) return;
    const mime = extToMime(result.ext);
    setLocalImageUrl(`data:${mime};base64,${result.content}`);
    setError(false);
  }, [filePath]);

  const { isRefreshing, refresh } = usePaneRefresh({ onRefresh: handleRefresh });

  // ── 다운로드 ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const a = document.createElement('a');
    a.href = localImageUrl;
    a.download = fileName;
    a.click();
  }, [localImageUrl, fileName]);

  // ── 버튼 핸들러 ───────────────────────────────────────────────────────────
  const handleZoomIn = () => setScale((s) => clamp((s === null ? getFitScale() : s) * 1.25));
  const handleZoomOut = () => setScale((s) => clamp((s === null ? getFitScale() : s) / 1.25));
  const handleFit = () => setScale(null); // 화면 맞춤
  const handleOriginal = () => setScale(1.0); // 원래 크기 100%

  // ── 더블클릭: fit ↔ 원래 크기 토글 ──────────────────────────────────────
  const handleDblClick = () => (scale === null ? handleOriginal() : handleFit());

  // ── 이미지 자연 크기 수집 ─────────────────────────────────────────────────
  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  // ── 이미지 인라인 스타일 결정 ─────────────────────────────────────────────
  // fit 모드(isFitMode): 빈 스타일 → CSS .img-viewport.is-fit .img-content 에서 처리
  // scale 모드: naturalSize × scale 픽셀 크기로 명시 (max-width 제한 해제)
  const imgStyle: React.CSSProperties = !isFitMode
    ? {
        width: Math.round(naturalSize.w * scale!),
        height: Math.round(naturalSize.h * scale!),
        maxWidth: 'none',
        maxHeight: 'none',
        flexShrink: 0,
      }
    : {};

  return (
    <div className="img-pane">
      {/* ── 툴바 ──────────────────────────────────────────────────────────── */}
      <div className="img-toolbar">
        <span className="img-filename" title={filePath}>
          {fileName}
        </span>
        {naturalSize.w > 0 && (
          <span className="img-natural-size">
            {naturalSize.w} × {naturalSize.h}px
          </span>
        )}
        <div className="img-toolbar-flex" />

        <div className="img-zoom-ctrl">
          {/* 축소 */}
          <button onClick={handleZoomOut} title={t('image.zoomOut')}>
            −
          </button>

          {/* 현재 배율 — 클릭 시 100%로 */}
          <button className="img-zoom-label img-zoom-label--btn" onClick={handleOriginal} title={t('image.resetZoom')}>
            {displayPct}%
          </button>

          {/* 확대 */}
          <button onClick={handleZoomIn} title={t('image.zoomIn')}>
            +
          </button>

          {/* 화면 맞춤 ⊡ */}
          <button
            className={`img-fit-btn${isFitMode ? ' is-active' : ''}`}
            onClick={handleFit}
            title={t('image.fitScreen')}
            style={{ fontSize: 16 }}
          >
            ⊡
          </button>

          {/* 원래 크기 1:1 */}
          <button
            className={`img-orig-btn${!isFitMode && scale === 1 ? ' is-active' : ''}`}
            onClick={handleOriginal}
            title={t('image.originalSize')}
          >
            1:1
          </button>
        </div>

        <button
          className={`pane-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
          onClick={refresh}
          disabled={isRefreshing}
          title={t('common.reloadFromDisk')}
        >
          ↺
        </button>
        <button className="img-download-btn" onClick={handleDownload} title={t('common.download')}>
          ↓
        </button>
      </div>

      {/* ── 뷰포트 ────────────────────────────────────────────────────────── */}
      <div ref={viewportRef} className={`img-viewport${isFitMode ? ' is-fit' : ''}`} onWheel={handleWheel}>
        {error ? (
          <div className="img-error">
            <span>⚠</span>
            <p>{t('image.loadError')}</p>
            <p className="img-error-path">{fileName}</p>
          </div>
        ) : (
          <img
            src={localImageUrl}
            alt={fileName}
            className="img-content"
            style={imgStyle}
            onLoad={handleImgLoad}
            onError={() => setError(true)}
            onDoubleClick={handleDblClick}
            draggable={false}
          />
        )}
      </div>

      {/* ── 상태 바 ───────────────────────────────────────────────────────── */}
      <div className="img-statusbar">
        <span>{t('image.zoomHint')}</span>
        <button className="img-zoom-reset" onClick={isFitMode ? handleOriginal : handleFit}>
          {isFitMode
            ? t('image.zoomToOriginal', { pct: String(displayPct) })
            : t('image.zoomToFit', { pct: String(displayPct) })}
        </button>
      </div>
    </div>
  );
}
