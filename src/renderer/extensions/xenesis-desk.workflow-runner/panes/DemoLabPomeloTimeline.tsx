import React from 'react';
import '@pomelo-suite/timeline';
import {
  createDemoLabPomeloTimelineModel,
  DEMO_LAB_TIMELINE_FRAME_MS,
  type DemoLabTimelineClip,
  type DemoLabTimelineScene,
  type DemoLabTimelineTrack,
  durationToTimelineFrames,
  getDemoSceneTimelineDuration,
  getSceneActionsForTimeline,
  getTimelineActionDuration,
  getTimelineActionInsertIndexFromFrame,
  getTimelineSceneInsertIndexFromFrame,
} from '../demoLabTimelineModel';
import type { DemoLabPlaybackSnapshot } from '../useDemoLabPlayback';

interface TimelineEditorClipEvent {
  clip?: DemoLabTimelineClip;
  track?: DemoLabTimelineTrack;
  oldStart?: number;
  start?: number;
  oldLength?: number;
  length?: number;
}

interface TimelineEditorInstance {
  tracks: DemoLabTimelineTrack[];
  selectedClip?: DemoLabTimelineClip | null;
  frameCount: number;
  frameWidth: number;
  trackHeaderWidth: number;
  currentFrame: number;
  render: () => void;
  addEventListener: (
    eventName: 'clipSelected' | 'clipMoveEnd' | 'clipResizeEnd',
    handler: (sender: TimelineEditorInstance, args: TimelineEditorClipEvent) => void,
  ) => void;
}

interface TimelineContextMenuState {
  x: number;
  y: number;
  target: DemoLabTimelineContextTarget;
}

type TimelineEditorConstructor = new (
  canvas: HTMLCanvasElement,
  options?: Record<string, unknown>,
) => TimelineEditorInstance;

function getTimelineEditorConstructor(): TimelineEditorConstructor {
  const globalConstructor = (globalThis as { TimelineEditor?: TimelineEditorConstructor }).TimelineEditor;
  const TimelineEditor = globalConstructor;
  if (!TimelineEditor) {
    throw new Error('Pomelo TimelineEditor is not available.');
  }
  return TimelineEditor;
}

export interface DemoLabPomeloTimelineProps {
  scenes: DemoLabTimelineScene[];
  playbackSnapshot: DemoLabPlaybackSnapshot;
  seekSceneAction: (sceneIndex: number, actionIndex?: number) => void;
  selectedSceneIndex?: number;
  selectedActionIndex?: number;
  insertPreview?: DemoLabTimelineInsertPreview | null;
  activeInsertDrag?: DemoLabTimelineInsertDrag | null;
  onPreviewInsertDrop?: (target: DemoLabTimelineDropTarget) => void;
  onCommitInsertDrop?: (target: DemoLabTimelineDropTarget) => void;
  onClearInsertDropPreview?: () => void;
  onMoveScene?: (fromSceneIndex: number, toSceneIndex: number) => void;
  onMoveAction?: (fromSceneIndex: number, fromActionIndex: number, toSceneIndex: number, toActionIndex: number) => void;
  onUpdateActionDuration?: (sceneIndex: number, actionIndex: number, duration: number) => void;
  onDuplicateScene?: (sceneIndex: number) => void;
  onDeleteScene?: (sceneIndex: number) => void;
  onDuplicateAction?: (sceneIndex: number, actionIndex: number) => void;
  onDeleteAction?: (sceneIndex: number, actionIndex: number) => void;
}

export interface DemoLabTimelineInsertPreview {
  kind: 'scene' | 'action';
  sceneIndex: number;
  actionIndex?: number;
  label: string;
  positionLabel: string;
  durationMs: number;
  durationLabel: string;
}

export interface DemoLabTimelineInsertDrag {
  kind: 'scene' | 'action';
}

export interface DemoLabTimelineDropTarget {
  kind: 'scene' | 'action';
  sceneIndex: number;
  actionIndex?: number;
  positionLabel: string;
}

export interface DemoLabTimelineContextTarget {
  kind: 'scene' | 'action';
  sceneIndex: number;
  actionIndex?: number;
  label: string;
}

const TIMELINE_TRACK_HEADER_WIDTH = 128;
const TIMELINE_FRAME_WIDTH = 10;
const TIMELINE_RULER_HEIGHT = 28;
const TIMELINE_SCENE_TRACK_HEIGHT = 30;
const TIMELINE_ACTION_TRACK_HEIGHT = 34;

function getSceneStartFrame(scenes: DemoLabTimelineScene[], sceneIndex: number): number {
  return scenes
    .slice(0, Math.max(0, sceneIndex))
    .reduce((frame, scene) => frame + durationToTimelineFrames(getDemoSceneTimelineDuration(scene)), 0);
}

function getActionStartFrame(scenes: DemoLabTimelineScene[], sceneIndex: number, actionIndex: number): number {
  const scene = scenes[sceneIndex];
  if (!scene) return getSceneStartFrame(scenes, sceneIndex);
  const actions = getSceneActionsForTimeline(scene);
  return (
    getSceneStartFrame(scenes, sceneIndex) +
    actions
      .slice(0, Math.max(0, actionIndex))
      .reduce(
        (frame, action) => frame + durationToTimelineFrames(getTimelineActionDuration(scene, action, actions.length)),
        0,
      )
  );
}

function getTimelineFrameFromEvent(
  event: React.DragEvent<HTMLElement>,
  timeline: TimelineEditorInstance | null,
): number {
  return getTimelineFrameFromPoint(event.currentTarget, event.clientX, timeline);
}

function getTimelineFrameFromPoint(
  element: HTMLElement,
  clientX: number,
  timeline: TimelineEditorInstance | null,
): number {
  const rect = element.getBoundingClientRect();
  const scrollLeft = element.scrollLeft;
  const frameWidth = timeline?.frameWidth ?? TIMELINE_FRAME_WIDTH;
  const trackHeaderWidth = timeline?.trackHeaderWidth ?? TIMELINE_TRACK_HEADER_WIDTH;
  const x = clientX - rect.left + scrollLeft - trackHeaderWidth;
  return Math.max(0, Math.round(x / frameWidth));
}

function formatSceneInsertPosition(sceneIndex: number, sceneCount: number): string {
  if (sceneCount <= 0) return 'Before scene 1';
  if (sceneIndex <= 0) return 'Before scene 1';
  if (sceneIndex >= sceneCount) return `After scene ${sceneCount}`;
  return `Before scene ${sceneIndex + 1}`;
}

function formatActionInsertPosition(actionIndex: number, actionCount: number): string {
  if (actionCount <= 0) return 'Before action 1';
  if (actionIndex <= 0) return 'Before action 1';
  if (actionIndex >= actionCount) return `After action ${actionCount}`;
  return `Before action ${actionIndex + 1}`;
}

function getTimelineDropTarget(
  event: React.DragEvent<HTMLElement>,
  scenes: DemoLabTimelineScene[],
  activeInsertDrag: DemoLabTimelineInsertDrag,
  timeline: TimelineEditorInstance | null,
): DemoLabTimelineDropTarget {
  const frame = getTimelineFrameFromEvent(event, timeline);
  if (activeInsertDrag.kind === 'scene') {
    const sceneIndex = getTimelineSceneInsertIndexFromFrame(scenes, frame);
    return {
      kind: 'scene',
      sceneIndex,
      positionLabel: formatSceneInsertPosition(sceneIndex, scenes.length),
    };
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const actionTrackTop = TIMELINE_RULER_HEIGHT + TIMELINE_SCENE_TRACK_HEIGHT;
  const sceneIndex = Math.max(
    0,
    Math.min(
      scenes.length - 1,
      Math.floor((Math.max(actionTrackTop, y) - actionTrackTop) / TIMELINE_ACTION_TRACK_HEIGHT),
    ),
  );
  const actions = getSceneActionsForTimeline(
    scenes[sceneIndex] ?? {
      id: '',
      title: '',
      caption: '',
      action: 'render',
      duration: 700,
    },
  );
  const actionIndex = getTimelineActionInsertIndexFromFrame(scenes, sceneIndex, frame);
  return {
    kind: 'action',
    sceneIndex,
    actionIndex,
    positionLabel: formatActionInsertPosition(actionIndex, actions.length),
  };
}

function getSceneIndexAtTimelineFrame(scenes: DemoLabTimelineScene[], frame: number): number {
  let sceneStartFrame = 0;
  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex += 1) {
    const sceneFrameLength = durationToTimelineFrames(getDemoSceneTimelineDuration(scenes[sceneIndex]));
    if (frame >= sceneStartFrame && frame <= sceneStartFrame + sceneFrameLength) {
      return sceneIndex;
    }
    sceneStartFrame += sceneFrameLength;
  }
  return -1;
}

function getActionIndexAtTimelineFrame(scenes: DemoLabTimelineScene[], sceneIndex: number, frame: number): number {
  const scene = scenes[sceneIndex];
  if (!scene) return -1;
  const actions = getSceneActionsForTimeline(scene);
  for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
    const actionStartFrame = getActionStartFrame(scenes, sceneIndex, actionIndex);
    const actionFrameLength = durationToTimelineFrames(
      getTimelineActionDuration(scene, actions[actionIndex], actions.length),
    );
    if (frame >= actionStartFrame && frame <= actionStartFrame + actionFrameLength) {
      return actionIndex;
    }
  }
  return -1;
}

function getTimelineContextTarget(
  event: React.MouseEvent<HTMLElement>,
  scenes: DemoLabTimelineScene[],
  timeline: TimelineEditorInstance | null,
): DemoLabTimelineContextTarget | null {
  const frame = getTimelineFrameFromPoint(event.currentTarget, event.clientX, timeline);
  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;

  if (y >= TIMELINE_RULER_HEIGHT && y < TIMELINE_RULER_HEIGHT + TIMELINE_SCENE_TRACK_HEIGHT) {
    const sceneIndex = getSceneIndexAtTimelineFrame(scenes, frame);
    const scene = scenes[sceneIndex];
    if (!scene) return null;
    return {
      kind: 'scene',
      sceneIndex,
      label: scene.title || scene.id || `Scene ${sceneIndex + 1}`,
    };
  }

  const actionTrackTop = TIMELINE_RULER_HEIGHT + TIMELINE_SCENE_TRACK_HEIGHT;
  if (y < actionTrackTop) return null;
  const sceneIndex = Math.max(
    0,
    Math.min(scenes.length - 1, Math.floor((y - actionTrackTop) / TIMELINE_ACTION_TRACK_HEIGHT)),
  );
  const scene = scenes[sceneIndex];
  if (!scene) return null;
  const actions = getSceneActionsForTimeline(scene);
  const actionIndex = getActionIndexAtTimelineFrame(scenes, sceneIndex, frame);
  const action = actions[actionIndex];
  if (!action) return null;
  return {
    kind: 'action',
    sceneIndex,
    actionIndex,
    label: action.type || `Action ${actionIndex + 1}`,
  };
}

export function DemoLabPomeloTimeline({
  scenes,
  playbackSnapshot,
  seekSceneAction,
  selectedSceneIndex,
  selectedActionIndex,
  insertPreview,
  activeInsertDrag,
  onPreviewInsertDrop,
  onCommitInsertDrop,
  onClearInsertDropPreview,
  onMoveScene,
  onMoveAction,
  onUpdateActionDuration,
  onDuplicateScene,
  onDeleteScene,
  onDuplicateAction,
  onDeleteAction,
}: DemoLabPomeloTimelineProps) {
  const containerRef = React.useRef<HTMLElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const timelineRef = React.useRef<TimelineEditorInstance | null>(null);
  const [contextMenu, setContextMenu] = React.useState<TimelineContextMenuState | null>(null);
  const callbackRef = React.useRef({
    seekSceneAction,
    onMoveScene,
    onMoveAction,
    onUpdateActionDuration,
    scenes,
  });

  callbackRef.current = {
    seekSceneAction,
    onMoveScene,
    onMoveAction,
    onUpdateActionDuration,
    scenes,
  };

  const model = React.useMemo(() => createDemoLabPomeloTimelineModel(scenes), [scenes]);
  const selectedClipLayout = React.useMemo<{
    className: string;
    style: React.CSSProperties;
    kindLabel: string;
    label: string;
  } | null>(() => {
    if (selectedSceneIndex === undefined || scenes.length === 0) return null;
    const sceneIndex = Math.max(0, Math.min(selectedSceneIndex, scenes.length - 1));
    const scene = scenes[sceneIndex];
    if (!scene) return null;
    const timeline = timelineRef.current;
    const frameWidth = timeline?.frameWidth ?? TIMELINE_FRAME_WIDTH;
    const trackHeaderWidth = timeline?.trackHeaderWidth ?? TIMELINE_TRACK_HEADER_WIDTH;
    const actions = getSceneActionsForTimeline(scene);
    const actionIndex = Math.max(0, Math.min(selectedActionIndex ?? 0, actions.length - 1));
    const selectedAction = actions[actionIndex];

    if (selectedAction) {
      const frame = getActionStartFrame(scenes, sceneIndex, actionIndex);
      const duration = getTimelineActionDuration(scene, selectedAction, actions.length);
      return {
        className: 'is-action',
        kindLabel: 'Selected action',
        label: selectedAction.type || 'action',
        style: {
          left: `${trackHeaderWidth + frame * frameWidth}px`,
          top: `${TIMELINE_RULER_HEIGHT + TIMELINE_SCENE_TRACK_HEIGHT + sceneIndex * TIMELINE_ACTION_TRACK_HEIGHT}px`,
          width: `${Math.max(30, durationToTimelineFrames(duration) * frameWidth)}px`,
          height: `${TIMELINE_ACTION_TRACK_HEIGHT}px`,
        },
      };
    }

    const frame = getSceneStartFrame(scenes, sceneIndex);
    return {
      className: 'is-scene',
      kindLabel: 'Selected scene',
      label: scene.title || scene.id || `Scene ${sceneIndex + 1}`,
      style: {
        left: `${trackHeaderWidth + frame * frameWidth}px`,
        top: `${TIMELINE_RULER_HEIGHT}px`,
        width: `${Math.max(30, durationToTimelineFrames(getDemoSceneTimelineDuration(scene)) * frameWidth)}px`,
        height: `${TIMELINE_SCENE_TRACK_HEIGHT}px`,
      },
    };
  }, [scenes, selectedActionIndex, selectedSceneIndex]);

  const insertPreviewLayout = React.useMemo<{
    markerStyle: React.CSSProperties;
    ghostStyle: React.CSSProperties;
    hintStyle: React.CSSProperties;
  } | null>(() => {
    if (!insertPreview) return null;
    const timeline = timelineRef.current;
    const frameWidth = timeline?.frameWidth ?? TIMELINE_FRAME_WIDTH;
    const trackHeaderWidth = timeline?.trackHeaderWidth ?? TIMELINE_TRACK_HEADER_WIDTH;
    const frame =
      insertPreview.kind === 'scene'
        ? getSceneStartFrame(scenes, insertPreview.sceneIndex)
        : getActionStartFrame(scenes, insertPreview.sceneIndex, insertPreview.actionIndex ?? 0);
    const top =
      insertPreview.kind === 'scene'
        ? TIMELINE_RULER_HEIGHT
        : TIMELINE_RULER_HEIGHT + TIMELINE_SCENE_TRACK_HEIGHT + insertPreview.sceneIndex * TIMELINE_ACTION_TRACK_HEIGHT;
    const height = insertPreview.kind === 'scene' ? TIMELINE_SCENE_TRACK_HEIGHT : TIMELINE_ACTION_TRACK_HEIGHT;
    const left = trackHeaderWidth + frame * frameWidth;
    const width = Math.max(24, durationToTimelineFrames(insertPreview.durationMs) * frameWidth);

    return {
      markerStyle: {
        left: `${left}px`,
        top: `${top}px`,
        height: `${height}px`,
      },
      ghostStyle: {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      },
      hintStyle: {
        left: `${Math.max(trackHeaderWidth + 8, left + 8)}px`,
        top: `${top + 3}px`,
        height: `${Math.max(20, height - 6)}px`,
      },
    };
  }, [insertPreview, scenes]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const syncCanvasSize = () => {
      const width = Math.max(860, Math.floor(container.clientWidth || 0));
      if (canvas.width !== width) {
        canvas.width = width;
        timelineRef.current?.render();
      }
    };

    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || timelineRef.current) return;

    const TimelineEditor = getTimelineEditorConstructor();
    const timeline = new TimelineEditor(canvas, {
      rulerMode: 'time',
      msPerFrame: DEMO_LAB_TIMELINE_FRAME_MS,
      majorTickMs: 1000,
      minorTickMs: 250,
    }) as TimelineEditorInstance;
    timeline.frameWidth = 10;
    timeline.trackHeaderWidth = 128;

    timeline.addEventListener('clipSelected', (sender, args) => {
      const clip = args.clip ?? sender.selectedClip;
      if (!clip?.tag) return;
      callbackRef.current.seekSceneAction(clip.tag.sceneIndex, clip.tag.actionIndex);
    });

    timeline.addEventListener('clipMoveEnd', (_sender, args) => {
      const clip = args.clip;
      const track = args.track;
      if (!clip?.tag || !track?.tag) return;
      if (clip.tag.kind === 'scene') {
        const toSceneIndex = getTimelineSceneInsertIndexFromFrame(callbackRef.current.scenes, clip.start);
        callbackRef.current.onMoveScene?.(clip.tag.sceneIndex, toSceneIndex);
        return;
      }
      const toSceneIndex = track.tag.sceneIndex;
      const toActionIndex = getTimelineActionInsertIndexFromFrame(callbackRef.current.scenes, toSceneIndex, clip.start);
      callbackRef.current.onMoveAction?.(clip.tag.sceneIndex, clip.tag.actionIndex, toSceneIndex, toActionIndex);
    });

    timeline.addEventListener('clipResizeEnd', (_sender, args) => {
      const clip = args.clip;
      if (!clip?.tag || clip.tag.kind !== 'action') return;
      const duration = Math.max(80, (args.length ?? clip.length) * DEMO_LAB_TIMELINE_FRAME_MS);
      callbackRef.current.onUpdateActionDuration?.(clip.tag.sceneIndex, clip.tag.actionIndex, duration);
    });

    timelineRef.current = timeline;
  }, [scenes.length, seekSceneAction]);

  React.useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    timeline.tracks = model.tracks;
    timeline.frameCount = model.frameCount;
    timeline.currentFrame = playbackSnapshot.elapsedMs
      ? Math.round(playbackSnapshot.elapsedMs / DEMO_LAB_TIMELINE_FRAME_MS)
      : 0;
    timeline.render();
  }, [model, playbackSnapshot.elapsedMs]);

  const handleInsertDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!activeInsertDrag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    onPreviewInsertDrop?.(getTimelineDropTarget(event, scenes, activeInsertDrag, timelineRef.current));
  };

  const handleInsertDrop = (event: React.DragEvent<HTMLElement>) => {
    if (!activeInsertDrag) return;
    event.preventDefault();
    onCommitInsertDrop?.(getTimelineDropTarget(event, scenes, activeInsertDrag, timelineRef.current));
  };

  const handleInsertDragLeave = (event: React.DragEvent<HTMLElement>) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
    onClearInsertDropPreview?.();
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    const target = getTimelineContextTarget(event, scenes, timelineRef.current);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    seekSceneAction(target.sceneIndex, target.kind === 'action' ? (target.actionIndex ?? 0) : 0);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      target,
    });
  };

  React.useEffect(() => {
    if (!contextMenu) return undefined;
    const closeMenu = () => setContextMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [contextMenu]);

  const runContextAction = (action: () => void) => {
    action();
    setContextMenu(null);
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    const { target } = contextMenu;
    const actionIndex = target.actionIndex ?? 0;
    const scene = scenes[target.sceneIndex];
    const actionCount = scene ? getSceneActionsForTimeline(scene).length : 0;
    const isScene = target.kind === 'scene';
    return (
      <div
        className="wfr-demo-pomelo-timeline__context-menu"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        aria-label="Timeline context menu"
        onMouseDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="wfr-demo-pomelo-timeline__context-menu-title">
          <span>{isScene ? 'Scene clip' : 'Action clip'}</span>
          <strong>{target.label}</strong>
        </div>
        <button
          type="button"
          onMouseDown={() => runContextAction(() => seekSceneAction(target.sceneIndex, isScene ? 0 : actionIndex))}
        >
          Focus inspector
        </button>
        <div className="wfr-demo-pomelo-timeline__context-menu-divider" />
        {isScene ? (
          <>
            <button
              type="button"
              disabled={!onDuplicateScene}
              onMouseDown={() => runContextAction(() => onDuplicateScene?.(target.sceneIndex))}
            >
              Duplicate scene
            </button>
            <button
              type="button"
              disabled={!onDeleteScene || scenes.length <= 1}
              onMouseDown={() => runContextAction(() => onDeleteScene?.(target.sceneIndex))}
            >
              Delete scene
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!onDuplicateAction}
              onMouseDown={() => runContextAction(() => onDuplicateAction?.(target.sceneIndex, actionIndex))}
            >
              Duplicate action
            </button>
            <button
              type="button"
              disabled={!onDeleteAction || actionCount <= 1}
              onMouseDown={() => runContextAction(() => onDeleteAction?.(target.sceneIndex, actionIndex))}
            >
              Delete action
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <section
      ref={containerRef}
      className="wfr-demo-pomelo-timeline"
      aria-label="Pomelo Studio timeline editor"
      onDragOver={handleInsertDragOver}
      onDrop={handleInsertDrop}
      onDragLeave={handleInsertDragLeave}
      onContextMenu={handleContextMenu}
    >
      <canvas ref={canvasRef} width={860} height={172} />
      {selectedClipLayout && (
        <div
          className={`wfr-demo-pomelo-timeline__selection ${selectedClipLayout.className}`}
          style={selectedClipLayout.style}
          aria-label="Timeline selected clip"
        >
          <span>{selectedClipLayout.kindLabel}</span>
          <strong>{selectedClipLayout.label}</strong>
        </div>
      )}
      {insertPreview && insertPreviewLayout && (
        <>
          <div
            className={`wfr-demo-pomelo-timeline__insert-ghost is-${insertPreview.kind}`}
            style={insertPreviewLayout.ghostStyle}
            aria-label="Timeline insert ghost clip"
          >
            <span>{insertPreview.durationLabel} ghost</span>
          </div>
          <div
            className={`wfr-demo-pomelo-timeline__insert-preview is-${insertPreview.kind}`}
            style={insertPreviewLayout.markerStyle}
            role="status"
            aria-label="Timeline insert preview"
          >
            <span>{insertPreview.positionLabel}</span>
            <strong>{insertPreview.label}</strong>
          </div>
          {activeInsertDrag && (
            <div
              className={`wfr-demo-pomelo-timeline__drop-hint is-${insertPreview.kind}`}
              style={insertPreviewLayout.hintStyle}
              aria-label="Timeline drop target hint"
            >
              <strong>{insertPreview.kind === 'scene' ? 'Drop scene here' : 'Drop action here'}</strong>
              <span>{insertPreview.positionLabel}</span>
            </div>
          )}
        </>
      )}
      {renderContextMenu()}
    </section>
  );
}
