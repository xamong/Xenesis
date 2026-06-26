import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  McpBridgeDemoLabPlaybackControlAction,
  McpBridgeDemoLabPlaybackControlPayload,
  McpBridgeDemoLabPlaybackControlResult,
  OpenFileResult,
} from '../../../../shared/types';
import type { DockContent } from '../../../dock/engine';
import { useSplitter } from '../../../hooks/useSplitter';
import { hasCompleteMarkdownXconFence, StreamingXconMarkdown } from '../../../markdown/StreamingXconMarkdown';
import {
  getRendererPerformanceTraceDuration,
  getRendererPerformanceTraceNow,
  recordRendererPerformanceTrace,
} from '../../../utils/performanceTrace';
import {
  BUILT_IN_DEMO,
  createDemoPreviewMarkdown,
  getSceneActions,
  hasRenderableDemoContent,
  isSupportedDemoFile,
  parseDemoManifest,
  validateDemoManifest,
} from '../demoLabPreset';
import { useDemoLabPlayback } from '../useDemoLabPlayback';
import {
  createDemoLabPresetLoadState,
  type DemoLabPresetLoadState,
  useDemoLabPresetRegistry,
} from '../useDemoLabPresetRegistry';

type DemoPlaybackMode = 'preview' | 'code' | 'split';

interface DemoLabPlaybackPaneProps {
  content?: DockContent;
}

const StableStreamingXconMarkdown = React.memo(StreamingXconMarkdown);

function getFirstFiveMinutePresetLabel(preset: { title: string; tags: string[]; recommendedFor?: string[] }): string {
  return preset.recommendedFor?.includes('first-5-demo') || preset.tags.includes('first-5-demo')
    ? `First 5 min - ${preset.title}`
    : preset.title;
}

function hasCompleteDemoPreviewXconFence(markdown: string): boolean {
  return hasCompleteMarkdownXconFence(markdown);
}

function useStableDemoPreviewMarkdown(markdown: string, preserveRenderablePreview: boolean): string {
  const lastRenderablePreviewRef = useRef('');

  return useMemo(() => {
    const hasXconPreview = hasCompleteDemoPreviewXconFence(markdown);
    if (hasXconPreview) {
      lastRenderablePreviewRef.current = markdown;
      return markdown;
    }
    if (preserveRenderablePreview && lastRenderablePreviewRef.current) {
      return lastRenderablePreviewRef.current;
    }
    lastRenderablePreviewRef.current = '';
    return markdown;
  }, [markdown, preserveRenderablePreview]);
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

function getInitialDemoLabSource(content: DockContent | undefined): string {
  return content?.contentType === 'demo-lab-playback' && content.fileContent ? content.fileContent : BUILT_IN_DEMO;
}

function getInitialDemoLabSourceLabel(content: DockContent | undefined): string {
  return content?.contentType === 'demo-lab-playback' && (content.fileName || content.filePath)
    ? content.fileName || content.filePath || 'Demo Lab preset'
    : 'Built-in demo preset';
}

export function DemoLabPlaybackPane({ content }: DemoLabPlaybackPaneProps = {}) {
  const [source, setSource] = useState(() => getInitialDemoLabSource(content));
  const [sourceLabel, setSourceLabel] = useState(() => getInitialDemoLabSourceLabel(content));
  const [loadedFilePath, setLoadedFilePath] = useState<string | null>(() =>
    content?.contentType === 'demo-lab-playback' ? (content.filePath ?? null) : null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mode, setMode] = useState<DemoPlaybackMode>('preview');
  const [zoom, setZoom] = useState(100);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const renderStageRef = useRef<HTMLDivElement | null>(null);
  const loadedInitialContentKeyRef = useRef('');
  const [renderOverlayOrigin, setRenderOverlayOrigin] = useState({ x: 0, y: 0 });
  const { ratio: splitRatio, onSplitterMouseDown } = useSplitter(bodyRef, 0.46);
  const { presetOptions, selectedPresetId, setSelectedPresetId, loadPreset } = useDemoLabPresetRegistry();

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
  } = useDemoLabPlayback(manifest.scenes, { documentSource: source });

  useEffect(() => {
    if (content?.contentType !== 'demo-lab-playback' || !content.fileContent) return;
    const contentKey = `${content.id}:${content.filePath || ''}:${content.fileContent.length}`;
    if (loadedInitialContentKeyRef.current === contentKey) return;
    loadedInitialContentKeyRef.current = contentKey;
    setSource(content.fileContent);
    setSourceLabel(content.fileName || content.filePath || 'Demo Lab preset');
    setLoadedFilePath(content.filePath ?? null);
    setLoadError(
      hasRenderableDemoContent(content.fileContent)
        ? null
        : `Demo file has no renderable XCON content: ${content.fileName || content.filePath || content.id}`,
    );
    resetPlayback();
  }, [content?.contentType, content?.fileContent, content?.fileName, content?.filePath, content?.id, resetPlayback]);

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
    recordRendererPerformanceTrace({
      scope: 'workflow-runner',
      action: 'demo-preview-rendered',
      durationMs: getRendererPerformanceTraceDuration(previewRenderTraceStartedAt),
      details: {
        pane: 'DemoLabPlaybackPane',
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
    resetPlayback();
  };

  const loadDemoLabFile = async () => {
    setIsLoadingFile(true);
    setLoadError(null);
    try {
      const file = await window.fileAPI.openFile();
      if (!file) return;
      if (!isSupportedDemoFile(file)) {
        setLoadError('Choose a Markdown, XCON/SKETCH, or xcon-demo preset file.');
        return;
      }
      setSource(file.content);
      setLoadedFilePath(file.filePath);
      setSourceLabel(file.fileName || file.filePath);
      setLoadError(
        hasRenderableDemoContent(file.content) ? null : `Demo file has no renderable XCON content: ${file.fileName}`,
      );
      resetPlayback();
    } finally {
      setIsLoadingFile(false);
    }
  };

  const loadDroppedDemoLabFile = async (file: File) => {
    const textFile = await createDroppedTextFileResult(file);
    if (!isSupportedDemoFile(textFile)) {
      setLoadError('Drop a Markdown, XCON/SKETCH, or xcon-demo preset file.');
      return;
    }
    setSource(textFile.content);
    setSourceLabel(textFile.fileName || textFile.filePath);
    setLoadedFilePath(null);
    setLoadError(
      hasRenderableDemoContent(textFile.content)
        ? null
        : `Demo file has no renderable XCON content: ${textFile.fileName}`,
    );
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
    void loadDroppedDemoLabFile(file);
  };

  const currentActionCount = activeScene ? getSceneActions(activeScene).length : 0;
  const isLastScene = activeSceneIndex >= manifest.scenes.length - 1;
  const buildControlResult = useCallback(
    (
      requestId: string,
      action: McpBridgeDemoLabPlaybackControlAction,
      options: Partial<McpBridgeDemoLabPlaybackControlResult> = {},
    ): McpBridgeDemoLabPlaybackControlResult => ({
      requestId,
      action,
      ok: options.ok ?? true,
      contentId: content?.id,
      title: manifest.title || 'Demo Lab Player',
      sourceLabel,
      filePath: loadedFilePath ?? content?.filePath,
      mode: options.mode ?? mode,
      isPlaying: options.isPlaying ?? isPlaying,
      sceneIndex: options.sceneIndex ?? activeSceneIndex,
      sceneCount: manifest.scenes.length,
      actionIndex: options.actionIndex ?? activeActionIndex,
      actionCount: options.actionCount ?? currentActionCount,
      activeSceneTitle: options.activeSceneTitle ?? activeScene?.title ?? null,
      activeActionType: options.activeActionType ?? activeAction?.type ?? activeScene?.action ?? null,
      progress: options.progress ?? playbackSnapshot.progress,
      elapsedMs: options.elapsedMs ?? playbackSnapshot.elapsedMs,
      durationMs: options.durationMs ?? playbackSnapshot.durationMs,
      error: options.error,
    }),
    [
      activeAction?.type,
      activeActionIndex,
      activeScene?.action,
      activeScene?.title,
      activeSceneIndex,
      content?.filePath,
      content?.id,
      currentActionCount,
      isPlaying,
      loadedFilePath,
      manifest.scenes.length,
      manifest.title,
      mode,
      playbackSnapshot.durationMs,
      playbackSnapshot.elapsedMs,
      playbackSnapshot.progress,
      sourceLabel,
    ],
  );

  const buildSceneControlOptions = useCallback(
    (sceneIndex: number): Partial<McpBridgeDemoLabPlaybackControlResult> => {
      const sceneCount = manifest.scenes.length;
      const clampedSceneIndex = sceneCount > 0 ? Math.max(0, Math.min(sceneIndex, sceneCount - 1)) : 0;
      const scene = manifest.scenes[clampedSceneIndex] ?? null;
      const sceneActions = scene ? getSceneActions(scene) : [];
      const firstAction = sceneActions[0] ?? null;
      const progress = sceneCount > 0 ? clampedSceneIndex / sceneCount : 0;
      return {
        sceneIndex: clampedSceneIndex,
        actionIndex: 0,
        actionCount: sceneActions.length,
        activeSceneTitle: scene?.title ?? null,
        activeActionType: firstAction?.type ?? scene?.action ?? null,
        progress,
        elapsedMs: Math.round(playbackSnapshot.durationMs * progress),
      };
    },
    [manifest.scenes, playbackSnapshot.durationMs],
  );

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<McpBridgeDemoLabPlaybackControlPayload>).detail;
      const requestId = String(detail?.requestId || '').trim();
      if (!requestId) return;

      const targetContentId = String(detail?.contentId || '').trim();
      const ownContentId = String(content?.id || '').trim();
      if (targetContentId && targetContentId !== ownContentId) return;

      const action = detail?.action || 'status';
      let result: McpBridgeDemoLabPlaybackControlResult;
      if (action === 'start') {
        playScenes();
        result = buildControlResult(requestId, action, { isPlaying: true });
      } else if (action === 'stop') {
        stopPlayback();
        result = buildControlResult(requestId, action, { isPlaying: false });
      } else if (action === 'next') {
        const nextSceneIndex = activeSceneIndex + 1;
        moveScene(1);
        result = buildControlResult(requestId, action, buildSceneControlOptions(nextSceneIndex));
      } else if (action === 'prev') {
        const previousSceneIndex = activeSceneIndex - 1;
        moveScene(-1);
        result = buildControlResult(requestId, action, buildSceneControlOptions(previousSceneIndex));
      } else if (action === 'reset') {
        resetPlayback();
        result = buildControlResult(requestId, action, {
          ...buildSceneControlOptions(0),
          isPlaying: false,
          progress: 0,
          elapsedMs: 0,
        });
      } else if (action === 'mode') {
        if (!detail?.mode) {
          result = buildControlResult(requestId, action, {
            ok: false,
            error: 'mode is required for Demo Lab playback mode control',
          });
        } else {
          setMode(detail.mode);
          result = buildControlResult(requestId, action, { mode: detail.mode });
        }
      } else {
        result = buildControlResult(requestId, 'status');
      }

      window.dispatchEvent(new CustomEvent('demo-lab-playback-control-result', { detail: result }));
    };
    window.addEventListener('demo-lab-playback-control-request', listener);
    return () => window.removeEventListener('demo-lab-playback-control-request', listener);
  }, [
    activeSceneIndex,
    buildControlResult,
    buildSceneControlOptions,
    content?.id,
    moveScene,
    playScenes,
    resetPlayback,
    stopPlayback,
  ]);

  return (
    <section
      className={`wfr-demo-playback${isDragOver ? ' is-drag-over' : ''}`}
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
      {isDragOver && <div className="wfr-demo-playback__drop-hint">Drop a demo preset or XCON Markdown file</div>}
      <div className="md-toolbar wfr-demo-playback__toolbar">
        <span className="md-filename" title={loadedFilePath ?? sourceLabel}>
          {manifest.title || 'Demo Lab Player'}
        </span>
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
        <button type="button" className="md-fmt-btn" onClick={() => void loadDemoLabFile()} disabled={isLoadingFile}>
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
          {(['preview', 'code', 'split'] as DemoPlaybackMode[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`md-mode-btn${mode === item ? ' active' : ''}`}
              onClick={() => setMode(item)}
            >
              {item === 'preview' ? 'Preview' : item === 'code' ? 'Code' : 'Split'}
            </button>
          ))}
        </div>
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

      <div ref={bodyRef} className={`wfr-demo-playback__body mode-${mode}`}>
        {(mode === 'code' || mode === 'split') && (
          <section
            className="wfr-demo-playback__code"
            style={mode === 'split' ? { width: `${splitRatio * 100}%`, flex: 'none' } : undefined}
          >
            <div className="wfr-demo-playback__panel-head">
              <strong>Code</strong>
              <span>{source.length.toLocaleString()} chars</span>
            </div>
            <pre>{source}</pre>
          </section>
        )}
        {mode === 'split' && <div className="pane-splitter" onMouseDown={onSplitterMouseDown} />}
        {(mode === 'preview' || mode === 'split') && (
          <section className="wfr-demo-playback__preview">
            <div className="wfr-demo-playback__panel-head">
              <strong>Preview</strong>
              <span>{isPlaying ? 'Live playback' : 'Ready'}</span>
            </div>
            <div className="wfr-demo-playback__render-stage" aria-label="Demo render stage" ref={renderStageRef}>
              <div style={{ zoom: `${zoom}%` }}>
                <StableStreamingXconMarkdown
                  content={stablePreviewMarkdown}
                  className="wfr-demo-playback__markdown"
                  deferRendering={isPlaying}
                />
              </div>
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
          <span>{activeScene?.caption ?? 'Load a demo preset and press Start.'}</span>
        </div>
        <div className="wfr-demo-playback__runtime">
          <span>
            Action <strong>{activeAction?.type ?? activeScene?.action ?? 'render'}</strong>
          </span>
          <span>
            Focus <strong>{focusedTarget ?? 'none'}</strong>
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
          <ul className="wfr-demo-playback__event-log" aria-label="Recent demo action events">
            {actionLog.map((eventLabel, index) => (
              <li key={`${eventLabel}-${index}`}>{eventLabel}</li>
            ))}
          </ul>
        )}
        {loadError && <div className="wfr-demo-playback__load-error">{loadError}</div>}
        {validationDiagnostics.length > 0 && (
          <div className="wfr-demo-playback__validation-diagnostics" aria-label="Demo preset validation diagnostics">
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
