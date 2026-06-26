import mermaid from 'mermaid';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { RemoteFileProfile } from '../../shared/types';
import { initMermaid } from '../hooks/useMermaidTheme';
import { usePaneRefresh } from '../hooks/usePaneRefresh';
import { useI18n } from '../i18n';
import { useAppTheme } from '../ThemeContext';
import { readEditableText, saveEditableText } from '../utils/editableFileIo';

interface MermaidPaneProps {
  filePath: string;
  fileName: string;
  initialContent: string;
  remoteFileProfile?: RemoteFileProfile;
  remoteFilePath?: string;
  onContentUpdate?: (content: string) => void;
}

type ViewMode = 'preview' | 'edit' | 'split';

const MIN_SCALE = 0.1;
const MAX_SCALE = 100;
const ZOOM_STEP = 0.15;
const PAD = 32; // 맞춤 여백 (px)

let diagramSeq = 0;

function parseDim(val: string | null): number {
  return val ? parseFloat(val) || 0 : 0;
}

// ── MermaidDiagram ──────────────────────────────────────────────────────────

interface DiagramProps {
  source: string;
  scale: number;
  onScaleChange: (s: number) => void;
  /** 이 값이 바뀔 때마다 fit 실행 */
  fitTrigger: number;
  theme: 'dark' | 'light';
}

function MermaidDiagram({ source, scale, onScaleChange, fitTrigger, theme }: DiagramProps) {
  const { t } = useI18n();
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 자연 크기(scale=1 기준) — SVG 렌더 후 저장
  const naturalSize = useRef<{ w: number; h: number } | null>(null);

  // 이벤트 핸들러 클로저 stale 방지용 refs
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // ── SVG render ────────────────────────────────────────────────────────────
  useEffect(() => {
    initMermaid(theme);
    const wrap = svgWrapRef.current;
    if (!wrap) return;

    wrap.innerHTML = '';
    setError(null);
    naturalSize.current = null;

    if (!source.trim()) return;

    const id = `mmd-svg-${++diagramSeq}`;
    let cancelled = false;

    mermaid
      .render(id, source)
      .then(({ svg }) => {
        if (cancelled || !svgWrapRef.current) return;
        svgWrapRef.current.innerHTML = svg;

        const svgEl = svgWrapRef.current.querySelector('svg');
        const vp = viewportRef.current;
        if (!svgEl) return;

        // 자연 크기 저장 (attribute → 없으면 getBoundingClientRect 백폴백)
        let sw = parseDim(svgEl.getAttribute('width'));
        let sh = parseDim(svgEl.getAttribute('height'));
        if (!sw || !sh) {
          const r = svgEl.getBoundingClientRect();
          sw = r.width / scaleRef.current || r.width;
          sh = r.height / scaleRef.current || r.height;
        }
        if (sw > 0 && sh > 0) naturalSize.current = { w: sw, h: sh };

        // 최초 렌더 시 뷰포트 중앙에 배치
        if (vp) {
          const { width: vw, height: vh } = vp.getBoundingClientRect();
          if (vw > 0 && vh > 0) {
            setOffset({
              x: Math.max(16, (vw - sw * scaleRef.current) / 2),
              y: Math.max(16, (vh - sh * scaleRef.current) / 2),
            });
          }
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [source, theme]);

  // ── Fit to viewport ───────────────────────────────────────────────────────
  useEffect(() => {
    if (fitTrigger === 0) return; // 초기값(0)에서는 실행 안 함

    const ns = naturalSize.current;
    const vp = viewportRef.current;
    if (!ns || !vp) return;

    const { width: vw, height: vh } = vp.getBoundingClientRect();
    if (!vw || !vh) return;

    const fitScale = Math.min((vw - PAD * 2) / ns.w, (vh - PAD * 2) / ns.h);
    const clamped = Math.min(Math.max(fitScale, MIN_SCALE), MAX_SCALE);
    onScaleChange(clamped);
    setOffset({
      x: (vw - ns.w * clamped) / 2,
      y: (vh - ns.h * clamped) / 2,
    });
  }, [fitTrigger, onScaleChange]);

  // ── Mouse-wheel zoom centered on cursor ──────────────────────────────────
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const s = scaleRef.current;
      const factor = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP;
      const ns = Math.min(Math.max(s * factor, MIN_SCALE), MAX_SCALE);
      const { x: ox, y: oy } = offsetRef.current;
      onScaleChange(ns);
      setOffset({
        x: px - (px - ox) * (ns / s),
        y: py - (py - oy) * (ns / s),
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onScaleChange]);

  // ── Drag to pan ───────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      ox: offsetRef.current.x,
      oy: offsetRef.current.y,
    };
    setIsDragging(true);
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const { mx, my, ox, oy } = dragStart.current;
      setOffset({ x: ox + (e.clientX - mx), y: oy + (e.clientY - my) });
    },
    [isDragging],
  );

  const stopDrag = useCallback(() => setIsDragging(false), []);

  // ── Double-click → 100% 중앙 ─────────────────────────────────────────────
  const onDoubleClick = useCallback(() => {
    onScaleChange(1);
    const ns = naturalSize.current;
    const vp = viewportRef.current;
    if (ns && vp) {
      const { width: vw, height: vh } = vp.getBoundingClientRect();
      setOffset({
        x: Math.max(16, (vw - ns.w) / 2),
        y: Math.max(16, (vh - ns.h) / 2),
      });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }, [onScaleChange]);

  const wrapStyle: React.CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    transformOrigin: '0 0',
  };

  return (
    <div
      ref={viewportRef}
      className={`mmd-viewport${isDragging ? ' is-dragging' : ''}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onDoubleClick={onDoubleClick}
    >
      <div ref={svgWrapRef} className="mmd-svg-wrap" style={wrapStyle} />

      {error && (
        <div className="mmd-error-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <span className="mmd-error-title">{t('mermaid.diagramError')}</span>
          <pre className="mmd-error-msg">{error}</pre>
          <span className="mmd-error-hint">{t('mermaid.autoRerender')}</span>
        </div>
      )}

      {!error && !source.trim() && (
        <div className="mmd-empty-hint">
          {t('mermaid.editorHint')}
          <br />
          {t('mermaid.snippetHint')}
        </div>
      )}
    </div>
  );
}

// ── MermaidPane ─────────────────────────────────────────────────────────────

export function MermaidPane({
  filePath,
  fileName,
  initialContent,
  remoteFileProfile,
  remoteFilePath,
  onContentUpdate,
}: MermaidPaneProps) {
  const appTheme = useAppTheme();
  const { t } = useI18n();
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<ViewMode>('preview');
  const [scale, setScale] = useState(1);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => onContentUpdate?.(content), 500);
    return () => clearTimeout(timer);
  }, [content, onContentUpdate]);

  const handleChange = useCallback((val: string) => {
    setContent(val);
    setIsModified(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!isModified || isSaving) return;
    try {
      setIsSaving(true);
      const result = await saveEditableText({ filePath, remoteFileProfile, remoteFilePath }, content);
      setSaveMsg(result.saved ? t('common.saved') : t('common.saveFailed'));
      if (result.saved) setIsModified(false);
    } catch {
      setSaveMsg(t('common.saveError'));
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(null), 2000);
    }
  }, [content, filePath, isModified, isSaving, remoteFilePath, remoteFileProfile, t]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  const handleRefresh = useCallback(async () => {
    const result = await readEditableText({ filePath, remoteFileProfile, remoteFilePath });
    if (result?.content !== undefined) {
      setContent(result.content);
      setIsModified(false);
    }
  }, [filePath, remoteFilePath, remoteFileProfile]);

  const { isRefreshing, refresh } = usePaneRefresh({ onRefresh: handleRefresh });

  const insertSnippet = useCallback(
    (snippet: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.slice(0, start) + snippet + content.slice(end);
      setContent(newContent);
      setIsModified(true);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + snippet.length, start + snippet.length);
      });
    },
    [content],
  );

  const zoomBy = useCallback((factor: number) => {
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s * factor).toFixed(4))));
  }, []);

  const snippets = [
    { label: 'flowchart', title: 'Flowchart', code: 'flowchart TD\n    A[Start] --> B[Process]\n    B --> C[End]' },
    {
      label: 'sequence',
      title: 'Sequence',
      code: 'sequenceDiagram\n    Alice->>Bob: Hello!\n    Bob-->>Alice: Hi there!',
    },
    {
      label: 'class',
      title: 'Class',
      code: 'classDiagram\n    class Animal {\n        +String name\n        +sound()\n    }',
    },
    {
      label: 'er',
      title: 'ER Diagram',
      code: 'erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains',
    },
    {
      label: 'gantt',
      title: 'Gantt',
      code: 'gantt\n    title Project Plan\n    section Plan\n    Analysis :a1, 2024-01-01, 7d',
    },
    { label: 'pie', title: 'Pie', code: 'pie title Share\n    "A" : 40\n    "B" : 35\n    "C" : 25' },
    {
      label: 'state',
      title: 'State',
      code: 'stateDiagram-v2\n    [*] --> Idle\n    Idle --> Processing : Start\n    Processing --> [*] : Done',
    },
    { label: 'mindmap', title: 'Mind Map', code: 'mindmap\n  root((Center))\n    GroupA\n      Item1\n    GroupB' },
  ];

  return (
    <div className="mmd-pane">
      <div className="mmd-toolbar">
        <span className="mmd-filename" title={filePath}>
          {fileName}
          {isModified ? ' •' : ''}
        </span>
        <div className="mmd-toolbar-sep" />
        <div className="mmd-mode-btns">
          {(['preview', 'edit', 'split'] as ViewMode[]).map((m) => (
            <button key={m} className={`mmd-mode-btn${mode === m ? ' active' : ''}`} onClick={() => setMode(m)}>
              {m === 'preview' ? t('mermaid.preview') : m === 'edit' ? t('mermaid.edit') : t('mermaid.split')}
            </button>
          ))}
        </div>
        <div className="mmd-toolbar-sep" />
        {mode !== 'preview' && (
          <div className="mmd-snippets">
            {snippets.map((s) => (
              <button
                key={s.label}
                className="mmd-snippet-btn"
                title={t('mermaid.insertSnippet', { title: s.title })}
                onClick={() => insertSnippet(s.code)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="mmd-toolbar-flex" />
        <div className="mmd-zoom-ctrl">
          <button title={t('mermaid.zoomOut')} onClick={() => zoomBy(1 - ZOOM_STEP)}>
            −
          </button>
          <button className="mmd-zoom-reset" title={t('mermaid.zoomHint')} onClick={() => setScale(1)}>
            {Math.round(scale * 100)}%
          </button>
          <button title={t('mermaid.zoomIn')} onClick={() => zoomBy(1 + ZOOM_STEP)}>
            +
          </button>
          <div className="mmd-toolbar-sep" style={{ margin: '0 2px' }} />
          <button className="mmd-fit-btn" title={t('mermaid.fitScreen')} onClick={() => setFitTrigger((t2) => t2 + 1)}>
            {t('mermaid.fitLabel')}
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
        <button
          className={`mmd-save-btn${isModified ? ' modified' : ''}`}
          onClick={handleSave}
          disabled={isSaving || !isModified}
          title={t('common.saveCtrlS')}
        >
          {isSaving ? t('common.saving') : (saveMsg ?? t('common.save'))}
        </button>
      </div>

      <div className={`mmd-body mode-${mode}`}>
        {(mode === 'edit' || mode === 'split') && (
          <textarea
            ref={textareaRef}
            className="mmd-editor"
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
            placeholder={t('mermaid.editorPlaceholder')}
          />
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div className="mmd-preview">
            <MermaidDiagram
              source={content}
              scale={scale}
              onScaleChange={setScale}
              fitTrigger={fitTrigger}
              theme={appTheme}
            />
          </div>
        )}
      </div>
    </div>
  );
}
