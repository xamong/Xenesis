import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findOpenMarkdownCodeFence, getMarkdownCodeFenceInfo } from '../../markdown/markdownCodeFences';
import {
  applyDemoHostUpdateToFixture,
  applyDemoWorkflowEventToFixture,
  cloneDemoFixture,
  type DemoScene,
  type DemoSceneAction,
  extractDemoDocument,
  getSceneActions,
  setDemoFixturePath,
  updateDemoWorkflowFixture,
  withoutDemoFence,
} from './demoLabPreset';
import { runWorkflowText, type WorkflowExecutionEvent } from './workflowEngine';

export const DEFAULT_DEMO_LAB_CURSOR_POSITION = { x: 28, y: 28 };
const DEFAULT_DEMO_LAB_STREAM_STEP = 32;
const DEFAULT_DEMO_LAB_SKETCH_STREAM_STEP = 7;
const MIN_DEMO_LAB_STREAM_FRAME_MS = 18;
const MIN_DEMO_LAB_FIXTURE_PUBLISH_MS = 140;
const MIN_DEMO_LAB_WORKFLOW_EVENT_MS = 36;
const MAX_DEMO_LAB_WORKFLOW_EVENT_MS = 140;

export interface DemoLabPlaybackRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DemoLabPlaybackSnapshot {
  activeSceneIndex: number;
  activeActionIndex: number;
  sceneCount: number;
  actionCount: number;
  activeSceneId: string | null;
  activeSceneTitle: string | null;
  activeActionType: string | null;
  activeActionTarget: string | null;
  isPlaying: boolean;
  typedText: string;
  cursorPosition: { x: number; y: number };
  cursorLabel: string;
  clickPulseId: number;
  focusedTarget: string | null;
  highlightedTarget: string | null;
  highlightRect: DemoLabPlaybackRect | null;
  highlightText: string;
  calloutText: string;
  calloutPosition: { x: number; y: number } | null;
  fixtureStatus: string;
  chainStatus: string;
  workflowEventStatus: string;
  progress: number;
  elapsedMs: number;
  durationMs: number;
}

export interface DemoLabPlaybackOptions {
  onPlaybackSnapshot?: (snapshot: DemoLabPlaybackSnapshot) => void;
  documentSource?: string;
  initialSnapshot?: DemoLabPlaybackSnapshot | null;
  initialPlaybackDocumentSource?: string | null;
  initialPlaybackFixture?: Record<string, unknown> | null;
}

interface ApplySceneActionOptions {
  deferCursorPosition?: boolean;
  deferTypedText?: boolean;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function getDemoLabSceneActionCount(scene: DemoScene): number {
  return getSceneActions(scene).length;
}

function getDemoLabActionDuration(scene: DemoScene, action: DemoSceneAction, actions: DemoSceneAction[]): number {
  return action.duration ?? Math.max(120, Math.floor(scene.duration / Math.max(actions.length, 1)));
}

function getDemoLabActionHold(action: DemoSceneAction): number {
  const value = Number(action.hold ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getDemoLabSceneDuration(scene: DemoScene): number {
  const actions = getSceneActions(scene);
  const actionDuration = actions.reduce((sum, action) => sum + getDemoLabActionDuration(scene, action, actions), 0);
  return Math.max(200, Math.round(scene.duration || 700), actionDuration);
}

function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0));
}

function clampProgress(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function readFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readPlaybackPoint(value: unknown, fallback: { x: number; y: number }): { x: number; y: number } {
  if (!isRecord(value)) return fallback;
  const x = readFiniteNumber(value.x, fallback.x);
  const y = readFiniteNumber(value.y, fallback.y);
  return { x, y };
}

function readPlaybackRect(value: unknown): DemoLabPlaybackRect | null {
  if (!isRecord(value)) return null;
  const x = readFiniteNumber(value.x, Number.NaN);
  const y = readFiniteNumber(value.y, Number.NaN);
  const width = readFiniteNumber(value.width, Number.NaN);
  const height = readFiniteNumber(value.height, Number.NaN);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

function readPlaybackText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function displayActionValue(value: DemoSceneAction['value']): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function readPoint(action: DemoSceneAction): { x: number; y: number } | null {
  const value = isRecord(action.value) ? action.value : null;
  const x =
    typeof action.x === 'number'
      ? action.x
      : typeof action.left === 'number'
        ? action.left
        : Number(value?.x ?? value?.left);
  const y =
    typeof action.y === 'number'
      ? action.y
      : typeof action.top === 'number'
        ? action.top
        : Number(value?.y ?? value?.top);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function readRect(action: DemoSceneAction): DemoLabPlaybackRect | null {
  const value = isRecord(action.value) ? action.value : null;
  const x =
    typeof action.x === 'number'
      ? action.x
      : typeof action.left === 'number'
        ? action.left
        : Number(value?.x ?? value?.left ?? 0);
  const y =
    typeof action.y === 'number'
      ? action.y
      : typeof action.top === 'number'
        ? action.top
        : Number(value?.y ?? value?.top ?? 0);
  const width =
    typeof action.width === 'number'
      ? action.width
      : typeof action.w === 'number'
        ? action.w
        : Number(value?.width ?? value?.w);
  const height =
    typeof action.height === 'number'
      ? action.height
      : typeof action.h === 'number'
        ? action.h
        : Number(value?.height ?? value?.h);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

function readWorkflowEventValue(action: DemoSceneAction): Record<string, unknown> {
  const value = isRecord(action.value) ? action.value : {};
  const data = isRecord(action.data) ? action.data : {};
  return {
    ...value,
    ...data,
    ...(action.status ? { status: action.status, kind: action.status } : {}),
    ...(action.target ? { actionId: action.target } : {}),
    ...(action.label ? { name: action.label } : {}),
  };
}

function getWorkflowEventPlaybackStatus(action: DemoSceneAction): string {
  if (action.status) return action.status;
  const event = readWorkflowEventValue(action);
  const kind = String(event.kind || event.type || event.status || '').toLowerCase();
  if (
    kind === 'scheduler:end' ||
    kind === 'queue:end' ||
    kind === 'action:end' ||
    kind === 'completed' ||
    kind === 'done'
  ) {
    return 'completed';
  }
  if (kind === 'action:fail' || kind === 'action:error' || kind === 'failed' || kind === 'error') {
    return 'failed';
  }
  if (
    kind === 'scheduler:start' ||
    kind === 'scheduler:tick:start' ||
    kind === 'scheduler:tick:end' ||
    kind === 'queue:start' ||
    kind === 'queue:item:start' ||
    kind === 'queue:item:end' ||
    kind === 'action:start' ||
    kind === 'running' ||
    kind === 'queued'
  ) {
    return 'running';
  }
  return action.text ?? (kind || 'received');
}

function makeDocumentStreamFrames(source: string, duration: number): string[] {
  const body = withoutDemoFence(source).trim();
  if (!body) return [''];
  const frames: string[] = [];
  let cursor = 0;
  while (cursor < body.length) {
    const step = isInsideSketchFence(body, cursor) ? DEFAULT_DEMO_LAB_SKETCH_STREAM_STEP : DEFAULT_DEMO_LAB_STREAM_STEP;
    cursor = Math.min(body.length, cursor + step);
    frames.push(body.slice(0, cursor));
  }
  if (frames.at(-1) !== body) frames.push(body);
  return coalesceStreamFrames(frames, duration);
}

function isInsideSketchFence(source: string, cursor: number): boolean {
  const openFence = findOpenMarkdownCodeFence(source.slice(0, cursor));
  if (!openFence) return false;
  const { lang } = getMarkdownCodeFenceInfo(openFence.info);
  return ['xcon-sketch', 'xcon', 'sketch'].includes(lang);
}

function makeTextStreamFrames(text: string, duration: number): string[] {
  if (!text) return [''];
  const frames: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    cursor = Math.min(text.length, cursor + DEFAULT_DEMO_LAB_STREAM_STEP);
    frames.push(text.slice(0, cursor));
  }
  if (frames.at(-1) !== text) frames.push(text);
  return coalesceStreamFrames(frames, duration);
}

function coalesceStreamFrames(frames: string[], duration: number): string[] {
  const maxFrames = Math.max(1, Math.floor(Math.max(1, duration) / MIN_DEMO_LAB_STREAM_FRAME_MS));
  if (frames.length <= maxFrames) return frames;
  const stride = Math.ceil(frames.length / maxFrames);
  const coalesced = frames.filter((_, index) => index % stride === 0);
  const lastFrame = frames.at(-1);
  if (lastFrame !== undefined && coalesced.at(-1) !== lastFrame) coalesced.push(lastFrame);
  return coalesced;
}

function isDocumentStreamTarget(action: DemoSceneAction): boolean {
  const target = String(action.target || '')
    .trim()
    .toLowerCase();
  return target === 'stream' || target === 'document' || target === 'artifact-preview';
}

function getDemoLabStreamFrameDelay(duration: number, frameCount: number): number {
  return Math.max(MIN_DEMO_LAB_STREAM_FRAME_MS, Math.floor(Math.max(1, duration) / Math.max(1, frameCount)));
}

function getDemoLabWorkflowEventDelay(duration: number, eventCount: number): number {
  return Math.min(
    MAX_DEMO_LAB_WORKFLOW_EVENT_MS,
    Math.max(MIN_DEMO_LAB_WORKFLOW_EVENT_MS, Math.floor(Math.max(1, duration) / Math.max(1, eventCount))),
  );
}

function workflowEventLabel(event: WorkflowExecutionEvent): string {
  const kind = String(event.kind || event.type || 'event');
  const id = String(event.actionId || event.id || event.name || 'workflow');
  if (kind === 'scheduler:tick:start' || kind === 'scheduler:tick:end') {
    return `${kind} / ${id} / tick ${event.tick || event.index || 1}`;
  }
  if (kind === 'queue:item:start' || kind === 'queue:item:end') {
    return `${kind} / ${id} / item ${Number(event.index || 0) + 1}`;
  }
  return `${kind} / ${id}`;
}

function eventStatus(event: WorkflowExecutionEvent): string {
  return getWorkflowEventPlaybackStatus({
    type: 'workflowEvent',
    value: event,
  });
}

function hasPrimitiveWorkflowEvents(events: WorkflowExecutionEvent[]): boolean {
  return events.some((event) => /^(scheduler|queue):/.test(String(event.kind || event.type || '')));
}

function selectWorkflowReplayEvents(
  runtimeEvents: WorkflowExecutionEvent[],
  fallbackEvents: WorkflowExecutionEvent[],
): WorkflowExecutionEvent[] {
  if (fallbackEvents.length > 0) return fallbackEvents;
  return runtimeEvents;
}

function createFallbackWorkflowEvents(
  workflowText: string,
  fixture: Record<string, unknown>,
): WorkflowExecutionEvent[] {
  const events: WorkflowExecutionEvent[] = [];
  const source = String(workflowText || '');
  const blockPattern =
    /^\s*([A-Za-z_][\w-]*)\s*:\s*(scheduler|schedule|workqueue|queue)\b([\s\S]*?)(?=^\s*[A-Za-z_][\w-]*\s*:\s*[A-Za-z]|\s*$)/gim;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(source))) {
    const actionId = match[1];
    const actionType = match[2].toLowerCase();
    const body = match[3] || '';
    if (actionType === 'scheduler' || actionType === 'schedule') {
      const tail = source.slice(match.index || 0);
      const iterations = Math.max(
        1,
        readWorkflowBlockNumber(body, ['iterations', 'count', 'repeat'], 0) ||
          readWorkflowBlockNumber(tail, ['iterations', 'count', 'repeat'], 0) ||
          1,
      );
      events.push(createWorkflowEvent('scheduler:start', actionId, { iterations }));
      for (let tick = 1; tick <= iterations; tick += 1) {
        events.push(createWorkflowEvent('scheduler:tick:start', actionId, { tick }));
        events.push(createWorkflowEvent('scheduler:tick:end', actionId, { tick }));
      }
      events.push(createWorkflowEvent('scheduler:end', actionId, { runs: iterations, iterations }));
    } else {
      const count = inferWorkflowQueueCount(body, fixture);
      events.push(createWorkflowEvent('queue:start', actionId, { count, total: count }));
      for (let index = 0; index < count; index += 1) {
        events.push(createWorkflowEvent('queue:item:start', actionId, { index, count, total: count }));
        events.push(createWorkflowEvent('queue:item:end', actionId, { index, count, total: count }));
      }
      events.push(createWorkflowEvent('queue:end', actionId, { count, total: count }));
    }
  }

  return events;
}

function createWorkflowEvent(
  kind: string,
  actionId: string,
  extras: Record<string, unknown> = {},
): WorkflowExecutionEvent {
  return {
    at: new Date().toISOString(),
    kind,
    actionId,
    ...extras,
  };
}

function readWorkflowBlockNumber(body: string, names: string[], fallback: number): number {
  for (const name of names) {
    const match = new RegExp(`\\b${name}\\s+(-?\\d+(?:\\.\\d+)?)`, 'i').exec(body);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return Math.max(0, Math.floor(value));
    }
  }
  return fallback;
}

function inferWorkflowQueueCount(body: string, fixture: Record<string, unknown>): number {
  const explicitCount = readWorkflowBlockNumber(body, ['count', 'items'], 0);
  if (explicitCount > 0) return explicitCount;
  const dataPath = /data\s+["'`]?=\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)/i.exec(body)?.[1];
  const data = dataPath ? readFixturePath(fixture, dataPath) : null;
  return Array.isArray(data) && data.length > 0 ? data.length : 3;
}

function readFixturePath(fixture: Record<string, unknown>, path: string): unknown {
  let cursor: unknown = fixture;
  for (const part of String(path || '')
    .split('.')
    .filter(Boolean)) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

export function createDemoLabPlaybackSnapshot(input: {
  scenes: DemoScene[];
  activeSceneIndex: number;
  activeActionIndex: number;
  isPlaying: boolean;
  typedText: string;
  cursorPosition: { x: number; y: number };
  cursorLabel: string;
  clickPulseId: number;
  focusedTarget: string | null;
  highlightedTarget: string | null;
  highlightRect: DemoLabPlaybackRect | null;
  highlightText: string;
  calloutText: string;
  calloutPosition: { x: number; y: number } | null;
  fixtureStatus: string;
  chainStatus: string;
  workflowEventStatus: string;
  elapsedMs?: number;
}): DemoLabPlaybackSnapshot {
  const scene = input.scenes[input.activeSceneIndex] ?? input.scenes[0] ?? null;
  const actions = scene ? getSceneActions(scene) : [];
  const action = actions[input.activeActionIndex] ?? actions[0] ?? null;
  const durationMs = input.scenes.reduce((sum, item) => sum + getDemoLabSceneDuration(item), 0);
  const elapsedScenesMs = input.scenes
    .slice(0, input.activeSceneIndex)
    .reduce((sum, item) => sum + getDemoLabSceneDuration(item), 0);
  const elapsedActionsMs = scene
    ? actions
        .slice(0, input.activeActionIndex)
        .reduce((sum, item) => sum + getDemoLabActionDuration(scene, item, actions), 0)
    : 0;
  const computedElapsedMs = elapsedScenesMs + elapsedActionsMs;
  const elapsedMs = Math.min(durationMs, Math.max(0, input.elapsedMs ?? computedElapsedMs));
  const actionCount = input.scenes.reduce((sum, item) => sum + getDemoLabSceneActionCount(item), 0);

  return {
    activeSceneIndex: input.activeSceneIndex,
    activeActionIndex: input.activeActionIndex,
    sceneCount: input.scenes.length,
    actionCount,
    activeSceneId: scene?.id ?? null,
    activeSceneTitle: scene?.title ?? null,
    activeActionType: action?.type ?? null,
    activeActionTarget: action?.target ?? displayActionValue(action?.value) ?? null,
    isPlaying: input.isPlaying,
    typedText: input.typedText,
    cursorPosition: input.cursorPosition,
    cursorLabel: input.cursorLabel,
    clickPulseId: input.clickPulseId,
    focusedTarget: input.focusedTarget,
    highlightedTarget: input.highlightedTarget,
    highlightRect: input.highlightRect,
    highlightText: input.highlightText,
    calloutText: input.calloutText,
    calloutPosition: input.calloutPosition,
    fixtureStatus: input.fixtureStatus,
    chainStatus: input.chainStatus,
    workflowEventStatus: input.workflowEventStatus,
    progress: durationMs > 0 ? clampProgress(elapsedMs / durationMs) : 0,
    elapsedMs,
    durationMs,
  };
}

export function createDemoLabPlaybackInitialSnapshot(
  scenes: DemoScene[],
  snapshot?: DemoLabPlaybackSnapshot | null,
): DemoLabPlaybackSnapshot {
  const activeSceneIndex = clampIndex(readFiniteNumber(snapshot?.activeSceneIndex, 0), scenes.length);
  const scene = scenes[activeSceneIndex] ?? scenes[0] ?? null;
  const actions = scene ? getSceneActions(scene) : [];
  const activeActionIndex = clampIndex(readFiniteNumber(snapshot?.activeActionIndex, 0), actions.length);

  return createDemoLabPlaybackSnapshot({
    scenes,
    activeSceneIndex,
    activeActionIndex,
    isPlaying: false,
    typedText: readPlaybackText(snapshot?.typedText),
    cursorPosition: readPlaybackPoint(snapshot?.cursorPosition, DEFAULT_DEMO_LAB_CURSOR_POSITION),
    cursorLabel: readPlaybackText(snapshot?.cursorLabel),
    clickPulseId: Math.max(0, Math.floor(readFiniteNumber(snapshot?.clickPulseId, 0))),
    focusedTarget: snapshot?.focusedTarget ?? null,
    highlightedTarget: snapshot?.highlightedTarget ?? null,
    highlightRect: readPlaybackRect(snapshot?.highlightRect),
    highlightText: readPlaybackText(snapshot?.highlightText),
    calloutText: readPlaybackText(snapshot?.calloutText),
    calloutPosition: snapshot?.calloutPosition
      ? readPlaybackPoint(snapshot.calloutPosition, DEFAULT_DEMO_LAB_CURSOR_POSITION)
      : null,
    fixtureStatus: readPlaybackText(snapshot?.fixtureStatus, 'idle'),
    chainStatus: readPlaybackText(snapshot?.chainStatus, 'idle'),
    workflowEventStatus: readPlaybackText(snapshot?.workflowEventStatus, 'idle'),
    elapsedMs: readFiniteNumber(snapshot?.elapsedMs, 0),
  });
}

function cloneInitialPlaybackFixture(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  return value ? cloneDemoFixture(value) : null;
}

export function useDemoLabPlayback(scenes: DemoScene[], options: DemoLabPlaybackOptions = {}) {
  const initialPlaybackSnapshot = createDemoLabPlaybackInitialSnapshot(scenes, options.initialSnapshot);
  const [activeSceneIndex, setActiveSceneIndex] = useState(() => initialPlaybackSnapshot.activeSceneIndex);
  const [activeActionIndex, setActiveActionIndex] = useState(() => initialPlaybackSnapshot.activeActionIndex);
  const [typedText, setTypedText] = useState(() => initialPlaybackSnapshot.typedText);
  const [cursorPosition, setCursorPosition] = useState(() => initialPlaybackSnapshot.cursorPosition);
  const [cursorLabel, setCursorLabel] = useState(() => initialPlaybackSnapshot.cursorLabel);
  const [clickPulseId, setClickPulseId] = useState(() => initialPlaybackSnapshot.clickPulseId);
  const [focusedTarget, setFocusedTarget] = useState<string | null>(() => initialPlaybackSnapshot.focusedTarget);
  const [highlightedTarget, setHighlightedTarget] = useState<string | null>(
    () => initialPlaybackSnapshot.highlightedTarget,
  );
  const [highlightRect, setHighlightRect] = useState<DemoLabPlaybackRect | null>(
    () => initialPlaybackSnapshot.highlightRect,
  );
  const [highlightText, setHighlightText] = useState(() => initialPlaybackSnapshot.highlightText);
  const [calloutText, setCalloutText] = useState(() => initialPlaybackSnapshot.calloutText);
  const [calloutPosition, setCalloutPosition] = useState<{ x: number; y: number } | null>(
    () => initialPlaybackSnapshot.calloutPosition,
  );
  const [fixtureStatus, setFixtureStatus] = useState(() => initialPlaybackSnapshot.fixtureStatus);
  const [chainStatus, setChainStatus] = useState(() => initialPlaybackSnapshot.chainStatus);
  const [workflowEventStatus, setWorkflowEventStatus] = useState(() => initialPlaybackSnapshot.workflowEventStatus);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackElapsedMs, setPlaybackElapsedMs] = useState(() => initialPlaybackSnapshot.elapsedMs);
  const [playbackDocumentSource, setPlaybackDocumentSource] = useState<string | null>(
    () => options.initialPlaybackDocumentSource ?? null,
  );
  const { onPlaybackSnapshot } = options;
  const documentSource = options.documentSource ?? '';
  const previousDocumentSourceRef = useRef(documentSource);
  const initialDocumentFixture = useMemo(() => extractDemoDocument(documentSource).fixture, [documentSource]);
  const [playbackFixture, setPlaybackFixture] = useState<Record<string, unknown> | null>(() =>
    cloneInitialPlaybackFixture(options.initialPlaybackFixture),
  );

  const activeScene = scenes[activeSceneIndex] ?? scenes[0] ?? null;
  const activeSceneActions = useMemo(() => (activeScene ? getSceneActions(activeScene) : []), [activeScene]);
  const activeAction = activeSceneActions[activeActionIndex] ?? activeSceneActions[0] ?? null;

  const resetSceneActionState = useCallback(() => {
    setActiveActionIndex(0);
    setTypedText('');
    setCursorPosition(DEFAULT_DEMO_LAB_CURSOR_POSITION);
    setCursorLabel('');
    setClickPulseId(0);
    setFocusedTarget(null);
    setHighlightedTarget(null);
    setHighlightRect(null);
    setHighlightText('');
    setCalloutText('');
    setCalloutPosition(null);
    setFixtureStatus('idle');
    setChainStatus('idle');
    setWorkflowEventStatus('idle');
    setActionLog([]);
  }, []);

  useEffect(() => {
    if (previousDocumentSourceRef.current === documentSource) return;
    previousDocumentSourceRef.current = documentSource;
    setPlaybackFixture(null);
  }, [documentSource]);

  const applySceneAction = useCallback(
    (action: DemoSceneAction | null | undefined, sceneTitle = '', applyOptions: ApplySceneActionOptions = {}) => {
      if (!action) return;
      const actionType = action.type.toLowerCase();
      const valueText = displayActionValue(action.value);
      const target = action.target ?? valueText ?? null;

      if (
        [
          'focus',
          'highlight',
          'render',
          'stream',
          'workflow',
          'typetext',
          'cursormove',
          'cursorclick',
          'callout',
          'fixture',
          'chain',
          'workflowevent',
        ].includes(actionType)
      ) {
        setFocusedTarget(target);
      }
      if (actionType === 'highlight') {
        setHighlightedTarget(target);
        setHighlightRect(readRect(action));
        setHighlightText(action.text ?? action.label ?? valueText ?? target ?? '');
      }
      if (actionType === 'callout') {
        setCalloutText(action.text ?? valueText ?? target ?? sceneTitle);
        setCalloutPosition(readPoint(action));
      }
      if (actionType === 'fixture') {
        setFixtureStatus(action.status ?? action.text ?? valueText ?? 'updated');
      }
      if (actionType === 'chain') {
        setChainStatus(action.status ?? action.text ?? valueText ?? 'updated');
      }
      if (actionType === 'workflowevent') {
        setWorkflowEventStatus(getWorkflowEventPlaybackStatus(action));
      }
      if (actionType === 'wait') {
        setCalloutText(action.text ?? valueText ?? 'Waiting before the next scene action.');
      }
      if (actionType === 'caption') {
        setTypedText(action.text ?? valueText ?? sceneTitle);
      }
      if (actionType === 'typetext' && !applyOptions.deferTypedText) {
        if (action.clear || action.replace) {
          setTypedText('');
        } else if (action.append) {
          setTypedText((current) => `${current}${action.text ?? valueText ?? ''}`);
        } else {
          setTypedText(action.text ?? valueText ?? '');
        }
      }
      if ((actionType === 'cursormove' || actionType === 'cursorclick') && !applyOptions.deferCursorPosition) {
        setCursorPosition(readPoint(action) ?? DEFAULT_DEMO_LAB_CURSOR_POSITION);
        setCursorLabel(action.label ?? action.text ?? '');
        if (actionType === 'cursorclick') setClickPulseId((current) => current + 1);
      }

      setActionLog((current) => {
        const label = [action.type, target, action.text ?? valueText].filter(Boolean).join(' / ');
        return [label || action.type, ...current].slice(0, 4);
      });
    },
    [],
  );

  useEffect(() => {
    if (!isPlaying) return;
    let cancelled = false;

    async function play() {
      let elapsedMs = 0;
      let liveCursor = DEFAULT_DEMO_LAB_CURSOR_POSITION;
      let liveFixture = cloneDemoFixture(initialDocumentFixture);
      let liveTypedText = '';
      let liveStreamSource = '';
      let lastFixturePublishAt = 0;
      const updateLiveFixture = (
        nextFixture: Record<string, unknown>,
        options: { publish?: 'immediate' | 'throttled' } = {},
      ) => {
        liveFixture = cloneDemoFixture(nextFixture);
        const now = performance.now();
        const shouldPublish =
          options.publish === 'immediate' ||
          !lastFixturePublishAt ||
          now - lastFixturePublishAt >= MIN_DEMO_LAB_FIXTURE_PUBLISH_MS;
        if (!shouldPublish) return;
        lastFixturePublishAt = now;
        setPlaybackFixture(liveFixture);
      };

      setPlaybackElapsedMs(0);
      setPlaybackFixture(liveFixture);
      lastFixturePublishAt = performance.now();

      const holdActionDuration = async (duration: number, baseElapsedMs: number) => {
        const safeDuration = Math.max(0, duration);
        if (safeDuration <= 0) return;
        const startedAt = performance.now();
        while (!cancelled) {
          const progress = Math.min(1, (performance.now() - startedAt) / safeDuration);
          setPlaybackElapsedMs(baseElapsedMs + Math.round(safeDuration * progress));
          if (progress >= 1) break;
          await wait(Math.min(50, Math.max(8, safeDuration - Math.round(safeDuration * progress))));
        }
      };

      const animateCursorAction = async (action: DemoSceneAction, duration: number, baseElapsedMs: number) => {
        const point = readPoint(action);
        if (!point) {
          await holdActionDuration(duration, baseElapsedMs);
          return;
        }
        const start = liveCursor;
        const safeDuration = Math.max(1, duration);
        const startedAt = performance.now();
        while (!cancelled) {
          const progress = Math.min(1, (performance.now() - startedAt) / safeDuration);
          const nextPoint = {
            x: Math.round(start.x + (point.x - start.x) * progress),
            y: Math.round(start.y + (point.y - start.y) * progress),
          };
          setCursorPosition(nextPoint);
          setPlaybackElapsedMs(baseElapsedMs + Math.round(safeDuration * progress));
          if (progress >= 1) {
            liveCursor = point;
            setCursorPosition(point);
            break;
          }
          await wait(Math.min(40, Math.max(8, safeDuration - Math.round(safeDuration * progress))));
        }
      };

      for (let index = 0; index < scenes.length; index += 1) {
        if (cancelled) return;
        const scene = scenes[index];
        if (!scene) continue;
        const actions = getSceneActions(scene);
        const sceneStartedAt = elapsedMs;
        let sceneActionElapsedMs = 0;
        setActiveSceneIndex(index);
        setPlaybackElapsedMs(sceneStartedAt);

        for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
          if (cancelled) return;
          const action = actions[actionIndex];
          if (!action) continue;
          const actionDuration = getDemoLabActionDuration(scene, action, actions);
          setActiveActionIndex(actionIndex);
          setPlaybackElapsedMs(sceneStartedAt + sceneActionElapsedMs);
          const actionType = action.type.toLowerCase();
          applySceneAction(action, scene.title, {
            deferCursorPosition: actionType === 'cursormove' || actionType === 'cursorclick',
            deferTypedText: actionType === 'typetext',
          });

          if (actionType === 'stream') {
            const frames = makeDocumentStreamFrames(documentSource, actionDuration);
            const frameDelay = getDemoLabStreamFrameDelay(actionDuration, frames.length);
            for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
              if (cancelled) return;
              const frameSource = frames[frameIndex];
              liveStreamSource = frameSource;
              setPlaybackDocumentSource(frameSource);
              const frameDocument = extractDemoDocument(frameSource);
              if (frameDocument.fixtureText && !('fixtureError' in frameDocument.fixture)) {
                updateLiveFixture(frameDocument.fixture, { publish: 'throttled' });
              }
              setPlaybackElapsedMs(
                sceneStartedAt + sceneActionElapsedMs + Math.round(actionDuration * ((frameIndex + 1) / frames.length)),
              );
              await wait(frameDelay);
            }
          } else if (actionType === 'render') {
            liveStreamSource = withoutDemoFence(documentSource).trim();
            setPlaybackDocumentSource(liveStreamSource);
            updateLiveFixture(extractDemoDocument(liveStreamSource || documentSource).fixture, {
              publish: 'immediate',
            });
            await holdActionDuration(actionDuration, sceneStartedAt + sceneActionElapsedMs);
          } else if (actionType === 'setfixture') {
            const path = action.path ?? action.target ?? '';
            updateLiveFixture(
              setDemoFixturePath(
                liveFixture,
                path,
                action.value ?? action.data ?? action.text ?? action.status ?? null,
              ),
              { publish: 'immediate' },
            );
            await holdActionDuration(actionDuration, sceneStartedAt + sceneActionElapsedMs);
          } else if (actionType === 'workflowevent') {
            setWorkflowEventStatus(getWorkflowEventPlaybackStatus(action));
            updateLiveFixture(applyDemoWorkflowEventToFixture(liveFixture, readWorkflowEventValue(action)), {
              publish: 'immediate',
            });
            await holdActionDuration(actionDuration, sceneStartedAt + sceneActionElapsedMs);
          } else if (actionType === 'workflow' || actionType === 'runworkflow') {
            setWorkflowEventStatus(action.status ?? 'running');
            updateLiveFixture(updateDemoWorkflowFixture(liveFixture, 'running'), { publish: 'immediate' });
            const workflowDocument = extractDemoDocument(liveStreamSource || documentSource);
            if (!workflowDocument.workflowText.trim()) {
              await holdActionDuration(actionDuration, sceneStartedAt + sceneActionElapsedMs);
              if (cancelled) return;
              setWorkflowEventStatus(action.status && action.status !== 'running' ? action.status : 'completed');
              updateLiveFixture(updateDemoWorkflowFixture(liveFixture, 'completed'), { publish: 'immediate' });
            } else {
              let replayElapsedMs = 0;
              try {
                const output = await runWorkflowText(workflowDocument.workflowText, {
                  fixture: liveFixture,
                  simulateApi: true,
                  maxSleepMs: Math.min(120, Math.max(24, Math.floor(actionDuration / 8))),
                  maxSchedulerIterations: 20,
                  stopOnFailure: false,
                });
                const events = selectWorkflowReplayEvents(
                  output.executionEvents,
                  createFallbackWorkflowEvents(workflowDocument.workflowText, liveFixture),
                );
                const eventDelay = getDemoLabWorkflowEventDelay(actionDuration, events.length);
                for (const event of events) {
                  if (cancelled) return;
                  setWorkflowEventStatus(eventStatus(event));
                  updateLiveFixture(applyDemoWorkflowEventToFixture(liveFixture, event), { publish: 'throttled' });
                  setActionLog((current) => [workflowEventLabel(event), ...current].slice(0, 4));
                  await holdActionDuration(eventDelay, sceneStartedAt + sceneActionElapsedMs + replayElapsedMs);
                  replayElapsedMs += eventDelay;
                }
                for (const update of output.hostUpdates) {
                  if (cancelled || !isRecord(update)) continue;
                  updateLiveFixture(applyDemoHostUpdateToFixture(liveFixture, update), { publish: 'immediate' });
                }
                const remainingDuration = Math.max(0, actionDuration - replayElapsedMs);
                if (remainingDuration > 0) {
                  await holdActionDuration(remainingDuration, sceneStartedAt + sceneActionElapsedMs + replayElapsedMs);
                }
                if (cancelled) return;
                setWorkflowEventStatus(output.success ? 'completed' : 'completed with warnings');
                updateLiveFixture(updateDemoWorkflowFixture(liveFixture, 'completed'), { publish: 'immediate' });
              } catch (error) {
                if (cancelled) return;
                const message = error instanceof Error ? error.message : String(error);
                setWorkflowEventStatus(`failed: ${message}`);
                updateLiveFixture(
                  setDemoFixturePath(
                    updateDemoWorkflowFixture(liveFixture, 'running'),
                    'record.workflow.lastEvent',
                    `Workflow failed: ${message}`,
                  ),
                  { publish: 'immediate' },
                );
                await holdActionDuration(actionDuration, sceneStartedAt + sceneActionElapsedMs);
              }
            }
          } else if (actionType === 'cursormove' || actionType === 'cursorclick') {
            await animateCursorAction(action, actionDuration, sceneStartedAt + sceneActionElapsedMs);
            setCursorLabel(action.label ?? action.text ?? '');
            if (actionType === 'cursorclick') setClickPulseId((current) => current + 1);
            const hold = getDemoLabActionHold(action);
            if (hold > 0) await holdActionDuration(hold, sceneStartedAt + sceneActionElapsedMs + actionDuration);
          } else if (actionType === 'highlight') {
            await holdActionDuration(actionDuration, sceneStartedAt + sceneActionElapsedMs);
            if (!action.keep) {
              const hold = getDemoLabActionHold(action);
              if (hold > 0) await holdActionDuration(hold, sceneStartedAt + sceneActionElapsedMs + actionDuration);
              setHighlightRect(null);
              setHighlightText('');
              setHighlightedTarget(null);
            }
          } else if (actionType === 'callout') {
            await holdActionDuration(actionDuration, sceneStartedAt + sceneActionElapsedMs);
            if (!action.keep) {
              const hold = getDemoLabActionHold(action);
              if (hold > 0) await holdActionDuration(hold, sceneStartedAt + sceneActionElapsedMs + actionDuration);
              setCalloutText('');
              setCalloutPosition(null);
            }
          } else if (actionType === 'typetext') {
            const text = action.text ?? displayActionValue(action.value) ?? '';
            const baseText = action.clear || action.replace ? '' : action.append ? liveTypedText : '';
            if (action.clear || action.replace || !action.append) setTypedText(baseText);
            const textFrames = makeTextStreamFrames(text, actionDuration);
            const stepDelay = getDemoLabStreamFrameDelay(actionDuration, textFrames.length);
            const typedStartedAt = performance.now();
            for (const frame of textFrames) {
              if (cancelled) return;
              liveTypedText = `${baseText}${frame}`;
              setTypedText(liveTypedText);
              if (isDocumentStreamTarget(action)) {
                liveStreamSource = liveTypedText;
                setPlaybackDocumentSource(liveStreamSource);
                const frameDocument = extractDemoDocument(liveStreamSource);
                if (frameDocument.fixtureText && !('fixtureError' in frameDocument.fixture)) {
                  updateLiveFixture(frameDocument.fixture, { publish: 'throttled' });
                }
              }
              const typedProgress = Math.min(1, (performance.now() - typedStartedAt) / Math.max(1, actionDuration));
              setPlaybackElapsedMs(sceneStartedAt + sceneActionElapsedMs + Math.round(actionDuration * typedProgress));
              await wait(stepDelay);
            }
            liveTypedText = `${baseText}${text}`;
            setTypedText(liveTypedText);
            if (isDocumentStreamTarget(action)) {
              liveStreamSource = liveTypedText;
              setPlaybackDocumentSource(liveStreamSource);
              const frameDocument = extractDemoDocument(liveStreamSource);
              if (frameDocument.fixtureText && !('fixtureError' in frameDocument.fixture)) {
                updateLiveFixture(frameDocument.fixture, { publish: 'immediate' });
              }
            }
          } else {
            await holdActionDuration(actionDuration, sceneStartedAt + sceneActionElapsedMs);
          }
          sceneActionElapsedMs += actionDuration;
        }

        const remainingSceneDuration = Math.max(0, getDemoLabSceneDuration(scene) - sceneActionElapsedMs);
        if (remainingSceneDuration > 0) {
          await holdActionDuration(remainingSceneDuration, sceneStartedAt + sceneActionElapsedMs);
        }
        elapsedMs = sceneStartedAt + getDemoLabSceneDuration(scene);
      }
      if (!cancelled) {
        setPlaybackElapsedMs(scenes.reduce((sum, scene) => sum + getDemoLabSceneDuration(scene), 0));
        setIsPlaying(false);
      }
    }

    void play();
    return () => {
      cancelled = true;
    };
  }, [applySceneAction, documentSource, initialDocumentFixture, isPlaying, scenes]);

  const resetPlayback = useCallback(() => {
    setIsPlaying(false);
    setActiveSceneIndex(0);
    setPlaybackElapsedMs(0);
    setPlaybackDocumentSource(null);
    setPlaybackFixture(null);
    resetSceneActionState();
  }, [resetSceneActionState]);

  const seekSceneAction = useCallback(
    (sceneIndex: number, actionIndex = 0) => {
      const nextIndex = clampIndex(sceneIndex, scenes.length);
      const scene = scenes[nextIndex];
      const actions = scene ? getSceneActions(scene) : [];
      const nextActionIndex = clampIndex(actionIndex, actions.length);
      setIsPlaying(false);
      setActiveSceneIndex(nextIndex);
      const nextElapsedMs =
        scenes.slice(0, nextIndex).reduce((sum, scene) => sum + getDemoLabSceneDuration(scene), 0) +
        (scene
          ? getSceneActions(scene)
              .slice(0, nextActionIndex)
              .reduce((sum, action) => sum + getDemoLabActionDuration(scene, action, actions), 0)
          : 0);
      setPlaybackElapsedMs(nextElapsedMs);
      setPlaybackDocumentSource(null);
      setPlaybackFixture(null);
      resetSceneActionState();
      setActiveActionIndex(nextActionIndex);
      applySceneAction(actions[nextActionIndex], scene?.title);
    },
    [applySceneAction, resetSceneActionState, scenes],
  );

  const activateSceneIndex = useCallback(
    (index: number) => {
      seekSceneAction(index, 0);
    },
    [seekSceneAction],
  );

  const moveScene = useCallback(
    (offset: number) => {
      seekSceneAction(activeSceneIndex + offset, 0);
    },
    [activeSceneIndex, seekSceneAction],
  );

  const playScenes = useCallback(() => {
    setActiveSceneIndex(0);
    setPlaybackElapsedMs(0);
    setPlaybackDocumentSource('');
    setPlaybackFixture(cloneDemoFixture(initialDocumentFixture));
    resetSceneActionState();
    setIsPlaying(true);
  }, [initialDocumentFixture, resetSceneActionState]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const playbackSnapshot = useMemo(
    () =>
      createDemoLabPlaybackSnapshot({
        scenes,
        activeSceneIndex,
        activeActionIndex,
        isPlaying,
        typedText,
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
        elapsedMs: playbackElapsedMs,
      }),
    [
      activeActionIndex,
      activeSceneIndex,
      calloutText,
      calloutPosition,
      chainStatus,
      clickPulseId,
      cursorPosition,
      cursorLabel,
      fixtureStatus,
      focusedTarget,
      highlightRect,
      highlightText,
      highlightedTarget,
      isPlaying,
      playbackElapsedMs,
      scenes,
      typedText,
      workflowEventStatus,
    ],
  );

  useEffect(() => {
    onPlaybackSnapshot?.(playbackSnapshot);
  }, [onPlaybackSnapshot, playbackSnapshot]);

  return {
    activeSceneIndex,
    activeActionIndex,
    typedText,
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
    activeSceneActions,
    activeAction,
    playbackSnapshot,
    playbackDocumentSource,
    playbackFixture: playbackFixture ?? initialDocumentFixture,
    resetSceneActionState,
    applySceneAction,
    seekSceneAction,
    activateSceneIndex,
    moveScene,
    playScenes,
    stopPlayback,
    resetPlayback,
  };
}
