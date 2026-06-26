import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OpenFileResult } from '../../../../../shared/types';
import { useSplitter } from '../../../../hooks/useSplitter';
import { hasCompleteMarkdownXconFence } from '../../../../markdown/StreamingXconMarkdown';
import {
  getRendererPerformanceTraceDuration,
  getRendererPerformanceTraceNow,
  recordRendererPerformanceTrace,
} from '../../../../utils/performanceTrace';
import {
  BUILT_IN_DEMO,
  createDemoPreviewMarkdown,
  getSceneActions,
  hasRenderableDemoContent,
  isSupportedDemoFile,
  parseDemoManifest,
  validateDemoManifest,
} from '../../demoLabPreset';
import { useDemoLabPlayback } from '../../useDemoLabPlayback';
import {
  createDemoLabPresetLoadState,
  type DemoLabPresetLoadState,
  useDemoLabPresetRegistry,
} from '../../useDemoLabPresetRegistry';
import { normalizeGowooriArtifactSource } from '../agent/gowooriArtifactRepair';
import {
  dispatchGowooriInstance,
  dispatchGowooriOverlayShow,
  GOWOORI_APPLY_EVENT,
  GOWOORI_INSTANCE_REQUEST_EVENT,
  type GowooriApplyDetail,
  isGowooriApplyDetail,
  readPendingGowooriApply,
} from '../shared/gowooriEvents';
import { GowooriArtifactPreview } from './GowooriArtifactPreview';
import {
  createDefaultGowooriPaneSessionState,
  type GowooriMode,
  readGowooriPaneSessionState,
  writeGowooriPaneSessionState,
} from './gowooriPaneSessionStore';

const GOWOORI_MASCOT_SRC = 'assets/gowoori-mascot.png';

function getFirstFiveMinutePresetLabel(preset: { title: string; tags: string[]; recommendedFor?: string[] }): string {
  return preset.recommendedFor?.includes('first-5-demo') || preset.tags.includes('first-5-demo')
    ? `First 5 min - ${preset.title}`
    : preset.title;
}

function hasCompleteDemoPreviewXconFence(markdownText: string): boolean {
  return hasCompleteMarkdownXconFence(markdownText);
}

function useStableDemoPreviewMarkdown(markdownText: string, preserveRenderablePreview: boolean): string {
  const lastRenderablePreviewRef = useRef('');

  return useMemo(() => {
    const hasXconPreview = hasCompleteDemoPreviewXconFence(markdownText);
    if (hasXconPreview) {
      lastRenderablePreviewRef.current = markdownText;
      return markdownText;
    }
    if (preserveRenderablePreview && lastRenderablePreviewRef.current) {
      return lastRenderablePreviewRef.current;
    }
    lastRenderablePreviewRef.current = '';
    return markdownText;
  }, [markdownText, preserveRenderablePreview]);
}

function getDroppedFileExt(fileName: string): string {
  const ext = /\.([^.]+)$/.exec(fileName)?.[1];
  return ext ? ext.toLowerCase() : 'txt';
}

async function createDroppedTextFileResult(file: File): Promise<OpenFileResult> {
  return {
    filePath: file.name,
    fileName: file.name,
    content: await file.text(),
    ext: getDroppedFileExt(file.name),
    contentType: 'markdown',
  };
}

function formatDuration(ms: number): string {
  const safeMs = Math.max(0, Math.round(ms || 0));
  const seconds = safeMs / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  return `${Math.round(seconds)}s`;
}

export interface GowooriPaneProps {
  contentId?: string;
}

export function GowooriPane({ contentId }: GowooriPaneProps = {}) {
  const instanceIdRef = useRef(contentId || `gowoori-${crypto.randomUUID()}`);
  const initialSession = readGowooriPaneSessionState(
    instanceIdRef.current,
    createDefaultGowooriPaneSessionState(BUILT_IN_DEMO, 'Built-in demo preset'),
  );
  const [source, setSource] = useState(() => initialSession.source);
  const [sourceLabel, setSourceLabel] = useState(() => initialSession.sourceLabel);
  const [loadedFilePath, setLoadedFilePath] = useState<string | null>(() => initialSession.loadedFilePath);
  const [loadError, setLoadError] = useState<string | null>(() => initialSession.loadError);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isModified, setIsModified] = useState(() => initialSession.isModified);
  const [mode, setMode] = useState<GowooriMode>(() => initialSession.mode);
  const [zoom, setZoom] = useState(() => initialSession.zoom);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const renderStageRef = useRef<HTMLDivElement | null>(null);
  const [renderOverlayOrigin, setRenderOverlayOrigin] = useState({ x: 0, y: 0 });
  const { ratio: splitRatio, onSplitterMouseDown } = useSplitter(bodyRef, initialSession.splitRatio);
  const { presetOptions, selectedPresetId, setSelectedPresetId, loadPreset } = useDemoLabPresetRegistry(
    initialSession.selectedPresetId || undefined,
  );

  const editorExts = useMemo(
    () => [
      markdown(),
      EditorView.lineWrapping,
      EditorView.theme({
        '.cm-scroller': { fontFamily: 'var(--font-mono, "Cascadia Code", Consolas, monospace)' },
      }),
    ],
    [],
  );

  const manifest = useMemo(() => parseDemoManifest(source), [source]);
  const validationDiagnostics = useMemo(() => validateDemoManifest(manifest), [manifest]);
  const validationErrorCount = validationDiagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const validationWarningCount = validationDiagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;
  const {
    activeSceneIndex,
    activeActionIndex,
    cursorPosition,
    cursorLabel,
    clickPulseId,
    focusedTarget,
    highlightedTarget,
    highlightRect,
    highlightText,
    calloutText,
    calloutPosition,
    fixtureStatus,
    chainStatus,
    workflowEventStatus,
    actionLog,
    isPlaying,
    activeScene,
    activeAction,
    playbackSnapshot,
    playbackDocumentSource,
    playbackFixture,
    moveScene,
    playScenes,
    stopPlayback,
    resetPlayback,
  } = useDemoLabPlayback(manifest.scenes, {
    documentSource: source,
    initialSnapshot: initialSession.playbackSnapshot,
    initialPlaybackDocumentSource: initialSession.playbackDocumentSource,
    initialPlaybackFixture: initialSession.playbackFixture,
  });

  const previewMarkdown = useMemo(
    () => createDemoPreviewMarkdown(playbackDocumentSource ?? source, playbackFixture),
    [playbackDocumentSource, playbackFixture, source],
  );
  const stablePreviewMarkdown = useStableDemoPreviewMarkdown(
    previewMarkdown,
    isPlaying && playbackDocumentSource !== null,
  );
  const previewRenderTraceStartedAt = getRendererPerformanceTraceNow();

  useEffect(() => {
    writeGowooriPaneSessionState(instanceIdRef.current, {
      source,
      sourceLabel,
      loadedFilePath,
      loadError,
      isModified,
      mode,
      zoom,
      selectedPresetId,
      splitRatio,
      playbackSnapshot,
      playbackDocumentSource,
      playbackFixture,
    });
  }, [
    isModified,
    loadError,
    loadedFilePath,
    mode,
    playbackDocumentSource,
    playbackFixture,
    playbackSnapshot,
    selectedPresetId,
    source,
    sourceLabel,
    splitRatio,
    zoom,
  ]);

  useEffect(() => {
    recordRendererPerformanceTrace({
      scope: 'workflow-runner',
      action: 'demo-preview-rendered',
      durationMs: getRendererPerformanceTraceDuration(previewRenderTraceStartedAt),
      details: {
        pane: 'GowooriPane',
        isPlaying,
        activeSceneIndex,
        activeActionIndex,
        sceneCount: manifest.scenes.length,
        sourceChars: source.length,
        previewChars: stablePreviewMarkdown.length,
      },
    });
  }, [
    activeActionIndex,
    activeSceneIndex,
    isPlaying,
    manifest.scenes.length,
    previewRenderTraceStartedAt,
    source.length,
    stablePreviewMarkdown.length,
  ]);

  const offsetX = (value: number) => renderOverlayOrigin.x + value;
  const offsetY = (value: number) => renderOverlayOrigin.y + value;

  useEffect(() => {
    const stage = renderStageRef.current;
    if (!stage) return undefined;

    let animationFrame = 0;
    const measureOverlayOrigin = () => {
      const stageRect = stage.getBoundingClientRect();
      const xconBlock = stage.querySelector<HTMLElement>('.md-xcon-block');
      if (!xconBlock) {
        setRenderOverlayOrigin((current) => (current.x === 0 && current.y === 0 ? current : { x: 0, y: 0 }));
        return;
      }

      const xconRect = xconBlock.getBoundingClientRect();
      const nextOrigin = {
        x: Math.max(0, Math.round(xconRect.left - stageRect.left + stage.scrollLeft)),
        y: Math.max(0, Math.round(xconRect.top - stageRect.top + stage.scrollTop)),
      };
      setRenderOverlayOrigin((current) =>
        current.x === nextOrigin.x && current.y === nextOrigin.y ? current : nextOrigin,
      );
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measureOverlayOrigin);
    };

    scheduleMeasure();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasure);
    resizeObserver?.observe(stage);
    const markdownRoot = stage.querySelector<HTMLElement>('.wfr-demo-playback__markdown');
    if (markdownRoot) resizeObserver?.observe(markdownRoot);

    const mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(stage, { childList: true, subtree: true });
    const delayedMeasure = window.setTimeout(scheduleMeasure, 120);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(delayedMeasure);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
    };
  }, [stablePreviewMarkdown]);

  const applyPresetLoadState = (state: DemoLabPresetLoadState | null, presetId = selectedPresetId) => {
    if (!state) {
      setLoadError(`Demo Lab preset not found: ${presetId}`);
      return;
    }
    setSource(state.preset.content);
    setSourceLabel(state.sourceLabel);
    setLoadedFilePath(null);
    setLoadError(state.loadError);
    setSelectedPresetId(state.preset.id);
    setIsModified(false);
    resetPlayback();
  };

  const loadGowooriFile = async () => {
    setIsLoadingFile(true);
    setLoadError(null);
    try {
      const file = await window.fileAPI.openFile();
      if (!file) return;
      if (!isSupportedDemoFile(file)) {
        setLoadError('Choose a Markdown, XCON/SKETCH, or xcon-demo preset file.');
        return;
      }
      const repaired = normalizeGowooriArtifactSource(file.content);
      const nextSource = repaired.source || file.content;
      setSource(nextSource);
      setLoadedFilePath(file.filePath);
      setSourceLabel(file.fileName || file.filePath);
      setLoadError(
        hasRenderableDemoContent(nextSource) ? null : `Demo file has no renderable XCON content: ${file.fileName}`,
      );
      setIsModified(false);
      resetPlayback();
    } finally {
      setIsLoadingFile(false);
    }
  };

  const loadDroppedGowooriFile = async (file: File) => {
    const textFile = await createDroppedTextFileResult(file);
    if (!isSupportedDemoFile(textFile)) {
      setLoadError('Drop a Markdown, XCON/SKETCH, or xcon-demo preset file.');
      return;
    }
    const repaired = normalizeGowooriArtifactSource(textFile.content);
    const nextSource = repaired.source || textFile.content;
    setSource(nextSource);
    setSourceLabel(textFile.fileName || textFile.filePath);
    setLoadedFilePath(null);
    setLoadError(
      hasRenderableDemoContent(nextSource) ? null : `Demo file has no renderable XCON content: ${textFile.fileName}`,
    );
    setIsModified(false);
    resetPlayback();
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files.item(0);
    if (!file) {
      setLoadError('Drop a Markdown, XCON/SKETCH, or xcon-demo preset file.');
      return;
    }
    void loadDroppedGowooriFile(file);
  };

  const handleChange = useCallback(
    (value: string) => {
      setSource(value);
      setSourceLabel((current) => current || 'Untitled Gowoori document');
      setIsModified(true);
      resetPlayback();
    },
    [resetPlayback],
  );

  const insertText = useCallback((before: string, after = '') => {
    const view = editorRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    view.dispatch({
      changes: { from, to, insert: before + selected + after },
      selection: { anchor: from + before.length, head: from + before.length + selected.length },
    });
    view.focus();
  }, []);

  const currentActionCount = activeScene ? getSceneActions(activeScene).length : 0;
  const isLastScene = activeSceneIndex >= manifest.scenes.length - 1;
  const title = manifest.title || 'Gowoori / 거울이';

  const applyGowooriSource = useCallback(
    (detail: GowooriApplyDetail) => {
      const repaired = normalizeGowooriArtifactSource(detail.source, { allowPartial: true });
      const sourceToApply = repaired.source || detail.source;
      setSource((current) =>
        detail.mode === 'append' ? `${current.trimEnd()}\n\n${sourceToApply.trimStart()}` : sourceToApply,
      );
      setSourceLabel(detail.label || 'Gowoori generated document');
      setLoadedFilePath(null);
      setLoadError(
        hasRenderableDemoContent(sourceToApply) ? null : 'Applied response has no renderable XCON content yet.',
      );
      setIsModified(true);
      resetPlayback();
    },
    [resetPlayback],
  );

  useEffect(() => {
    dispatchGowooriInstance({
      id: instanceIdRef.current,
      title,
      label: sourceLabel,
      modified: isModified,
    });
  }, [isModified, sourceLabel, title]);

  useEffect(() => {
    const handleRequest = () => {
      dispatchGowooriInstance({
        id: instanceIdRef.current,
        title,
        label: sourceLabel,
        modified: isModified,
      });
    };
    window.addEventListener(GOWOORI_INSTANCE_REQUEST_EVENT, handleRequest);
    return () => window.removeEventListener(GOWOORI_INSTANCE_REQUEST_EVENT, handleRequest);
  }, [isModified, sourceLabel, title]);

  useEffect(() => {
    const handleApply = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isGowooriApplyDetail(detail)) return;
      if (detail.targetId !== 'all' && detail.targetId !== instanceIdRef.current) return;
      applyGowooriSource(detail);
    };
    window.addEventListener(GOWOORI_APPLY_EVENT, handleApply);
    return () => window.removeEventListener(GOWOORI_APPLY_EVENT, handleApply);
  }, [applyGowooriSource]);

  useEffect(() => {
    const pending = readPendingGowooriApply();
    if (pending) applyGowooriSource({ ...pending, targetId: instanceIdRef.current });
  }, [applyGowooriSource]);

  const showGlobalOverlay = useCallback(() => {
    dispatchGowooriOverlayShow({
      id: instanceIdRef.current,
      contentId,
      title,
      label: sourceLabel,
      source: stablePreviewMarkdown,
      zoom,
    });
  }, [contentId, sourceLabel, stablePreviewMarkdown, title, zoom]);

  return (
    <section
      className={`wfr-demo-playback wfr-gowoori${isDragOver ? ' is-drag-over' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={handleDrop}
    >
      {isDragOver && <div className="wfr-demo-playback__drop-hint">Drop a Gowoori Markdown or demo preset file</div>}
      <div className="md-toolbar wfr-demo-playback__toolbar">
        <div className="wfr-gowoori__brand" title={loadedFilePath ?? sourceLabel}>
          <img src={GOWOORI_MASCOT_SRC} alt="Gowoori mascot" />
          <div>
            <strong>
              {title}
              {isModified ? ' *' : ''}
            </strong>
            <span>Gowoori artifact viewer</span>
          </div>
        </div>
        <span className="wfr-demo-playback__meta">Gowoori / 거울이</span>
        <span className="wfr-demo-playback__meta">{sourceLabel}</span>
        <div className="md-toolbar-sep" />
        <label className="wfr-demo-playback__preset-picker">
          <span>Preset</span>
          <select
            value={selectedPresetId}
            onChange={(event) => {
              const nextPresetId = event.target.value;
              setSelectedPresetId(nextPresetId);
              applyPresetLoadState(loadPreset(nextPresetId), nextPresetId);
            }}
          >
            {presetOptions.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {getFirstFiveMinutePresetLabel(preset)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="md-fmt-btn" onClick={() => void loadGowooriFile()} disabled={isLoadingFile}>
          {isLoadingFile ? 'Loading...' : 'Open'}
        </button>
        <button
          type="button"
          className="md-fmt-btn"
          onClick={() => applyPresetLoadState(createDemoLabPresetLoadState(presetOptions[0]), presetOptions[0]?.id)}
        >
          First 5 min
        </button>
        <div className="md-toolbar-sep" />
        <div className="md-mode-btns">
          {(['preview', 'edit', 'split'] as GowooriMode[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`md-mode-btn${mode === item ? ' active' : ''}`}
              onClick={() => setMode(item)}
            >
              {item === 'preview' ? 'Preview' : item === 'edit' ? 'Edit' : 'Split'}
            </button>
          ))}
        </div>
        {mode !== 'preview' && (
          <>
            <div className="md-toolbar-sep" />
            <button type="button" className="md-fmt-btn" title="Bold" onClick={() => insertText('**', '**')}>
              B
            </button>
            <button type="button" className="md-fmt-btn" title="Italic" onClick={() => insertText('_', '_')}>
              I
            </button>
            <button type="button" className="md-fmt-btn" title="Heading 1" onClick={() => insertText('# ')}>
              H1
            </button>
            <button type="button" className="md-fmt-btn" title="Heading 2" onClick={() => insertText('## ')}>
              H2
            </button>
            <button type="button" className="md-fmt-btn" title="Inline code" onClick={() => insertText('`', '`')}>
              `
            </button>
            <button
              type="button"
              className="md-fmt-btn"
              title="XCON/SKETCH fence"
              onClick={() => insertText('\n```xcon-sketch\n', '\n```\n')}
            >
              SKETCH
            </button>
            <button
              type="button"
              className="md-fmt-btn"
              title="Demo fence"
              onClick={() => insertText('\n```xcon-demo\n', '\n```\n')}
            >
              DEMO
            </button>
          </>
        )}
        <div className="md-toolbar-sep" />
        <button
          type="button"
          className="md-fmt-btn"
          onClick={() => moveScene(-1)}
          disabled={activeSceneIndex === 0 || isPlaying}
        >
          Prev
        </button>
        <button
          type="button"
          className="wfr-demo-playback__primary"
          onClick={playScenes}
          disabled={isPlaying || manifest.scenes.length === 0}
        >
          {isPlaying ? 'Playing...' : 'Start'}
        </button>
        <button type="button" className="md-fmt-btn" onClick={stopPlayback} disabled={!isPlaying}>
          Stop
        </button>
        <button type="button" className="md-fmt-btn" onClick={() => moveScene(1)} disabled={isLastScene || isPlaying}>
          Next
        </button>
        <button type="button" className="md-fmt-btn" onClick={resetPlayback}>
          Reset
        </button>
        <button
          type="button"
          className="md-fmt-btn"
          title="Show artifact as Desk overlay"
          onClick={showGlobalOverlay}
          disabled={!stablePreviewMarkdown.trim()}
        >
          Overlay
        </button>
        <div className="md-toolbar-flex" />
        <div className="md-zoom-ctrl">
          <button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))}>
            -
          </button>
          <span>{zoom}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(200, value + 10))}>
            +
          </button>
        </div>
      </div>

      <div className="wfr-demo-playback__statusbar">
        <span>
          Scene{' '}
          <strong>
            {activeSceneIndex + 1}/{Math.max(manifest.scenes.length, 1)}
          </strong>
        </span>
        <span>
          Action{' '}
          <strong>
            {activeActionIndex + 1}/{Math.max(currentActionCount, 1)}
          </strong>
        </span>
        <span>
          Elapsed{' '}
          <strong>
            {formatDuration(playbackSnapshot.elapsedMs)} / {formatDuration(playbackSnapshot.durationMs)}
          </strong>
        </span>
        <span>
          Progress <strong>{Math.round(playbackSnapshot.progress * 100)}%</strong>
        </span>
        {validationDiagnostics.length > 0 && (
          <span className="wfr-demo-playback__diagnostic-pill">
            {validationErrorCount} error(s), {validationWarningCount} warning(s)
          </span>
        )}
      </div>

      <div ref={bodyRef} className={`wfr-demo-playback__body wfr-gowoori__body mode-${mode}`}>
        {(mode === 'edit' || mode === 'split') && (
          <section
            className="wfr-demo-playback__code wfr-gowoori__editor-pane"
            style={mode === 'split' ? { width: `${splitRatio * 100}%`, flex: 'none' } : undefined}
          >
            <div className="wfr-demo-playback__panel-head">
              <strong>Markdown + XCON/SKETCH</strong>
              <span>{source.length.toLocaleString()} chars</span>
            </div>
            <div className="md-editor wfr-gowoori__editor">
              <CodeMirror
                ref={editorRef}
                value={source}
                theme={oneDark}
                extensions={editorExts}
                onChange={handleChange}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  highlightActiveLineGutter: true,
                  highlightSpecialChars: true,
                  history: true,
                  drawSelection: true,
                  dropCursor: false,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  syntaxHighlighting: true,
                  bracketMatching: false,
                  closeBrackets: false,
                  autocompletion: false,
                  rectangularSelection: false,
                  crosshairCursor: false,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  searchKeymap: true,
                }}
              />
            </div>
          </section>
        )}
        {mode === 'split' && <div className="pane-splitter" onMouseDown={onSplitterMouseDown} />}
        {(mode === 'preview' || mode === 'split') && (
          <section className="wfr-demo-playback__preview">
            <div className="wfr-demo-playback__panel-head">
              <strong>Gowoori Preview</strong>
              <span>{isPlaying ? 'Live playback' : 'Ready'}</span>
            </div>
            <div className="wfr-demo-playback__render-stage" aria-label="Gowoori render stage" ref={renderStageRef}>
              <GowooriArtifactPreview content={stablePreviewMarkdown} zoom={zoom} deferRendering={isPlaying} />
              {highlightRect && (
                <span
                  className="wfr-demo-playback__rect-highlight"
                  data-demo-highlight="true"
                  style={{
                    left: `clamp(8px, ${offsetX(highlightRect.x)}px, calc(100% - 28px))`,
                    top: `clamp(8px, ${offsetY(highlightRect.y)}px, calc(100% - 28px))`,
                    width: highlightRect.width,
                    height: highlightRect.height,
                  }}
                >
                  {highlightText ? <span>{highlightText}</span> : null}
                </span>
              )}
              {calloutText && calloutPosition && (
                <span
                  className="wfr-demo-playback__floating-callout"
                  data-demo-callout="true"
                  style={{
                    left: `clamp(8px, ${offsetX(calloutPosition.x)}px, calc(100% - 42px))`,
                    top: `clamp(8px, ${offsetY(calloutPosition.y)}px, calc(100% - 22px))`,
                  }}
                >
                  {calloutText}
                </span>
              )}
              <span
                className={`wfr-demo-playback__cursor${activeAction?.type?.toLowerCase() === 'cursorclick' ? ' is-clicking' : ''}`}
                style={{
                  left: `clamp(8px, ${offsetX(cursorPosition.x)}px, calc(100% - 24px))`,
                  top: `clamp(8px, ${offsetY(cursorPosition.y)}px, calc(100% - 24px))`,
                }}
              >
                {cursorLabel ? <span>{cursorLabel}</span> : null}
              </span>
              {clickPulseId > 0 && (
                <span
                  key={clickPulseId}
                  className="wfr-demo-playback__click-pulse"
                  data-demo-click-pulse="true"
                  style={{
                    left: `clamp(8px, ${offsetX(cursorPosition.x)}px, calc(100% - 24px))`,
                    top: `clamp(8px, ${offsetY(cursorPosition.y)}px, calc(100% - 24px))`,
                  }}
                />
              )}
            </div>
          </section>
        )}
      </div>

      <div className="wfr-demo-playback__console">
        <div className="wfr-demo-playback__scene">
          <strong>{activeScene?.title ?? 'No scene'}</strong>
          <span>{activeScene?.caption ?? 'Edit Markdown, XCON/SKETCH, Chain, and Workflow, then press Start.'}</span>
        </div>
        <div className="wfr-demo-playback__runtime">
          <span>
            Action <strong>{activeAction?.type ?? activeScene?.action ?? 'render'}</strong>
          </span>
          <span>
            Focus <strong>{focusedTarget ?? highlightedTarget ?? 'none'}</strong>
          </span>
          <span>
            Fixture <strong>{fixtureStatus}</strong>
          </span>
          <span>
            Chain <strong>{chainStatus}</strong>
          </span>
          <span>
            Workflow <strong>{workflowEventStatus}</strong>
          </span>
        </div>
        {actionLog.length > 0 && (
          <ul className="wfr-demo-playback__event-log" aria-label="Recent Gowoori events">
            {actionLog.map((eventLabel, index) => (
              <li key={`${eventLabel}-${index}`}>{eventLabel}</li>
            ))}
          </ul>
        )}
        {loadError && <div className="wfr-demo-playback__load-error">{loadError}</div>}
        {validationDiagnostics.length > 0 && (
          <div className="wfr-demo-playback__validation-diagnostics" aria-label="Gowoori validation diagnostics">
            {validationDiagnostics.slice(0, 6).map((diagnostic) => (
              <span
                key={`${diagnostic.severity}-${diagnostic.path}-${diagnostic.message}`}
                className={`is-${diagnostic.severity}`}
              >
                {diagnostic.severity}: {diagnostic.path} - {diagnostic.message}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
