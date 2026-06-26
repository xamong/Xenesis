import type { DemoLabPlaybackSnapshot } from '../../useDemoLabPlayback';

export type GowooriMode = 'preview' | 'edit' | 'split';

export interface GowooriPaneSessionState {
  source: string;
  sourceLabel: string;
  loadedFilePath: string | null;
  loadError: string | null;
  isModified: boolean;
  mode: GowooriMode;
  zoom: number;
  selectedPresetId: string;
  splitRatio: number;
  playbackSnapshot: DemoLabPlaybackSnapshot | null;
  playbackDocumentSource: string | null;
  playbackFixture: Record<string, unknown> | null;
}

const DEFAULT_GOWOORI_PRESET_ID = 'built-in';
const DEFAULT_GOWOORI_SPLIT_RATIO = 0.48;
const MIN_GOWOORI_SPLIT_RATIO = 0.15;
const MAX_GOWOORI_SPLIT_RATIO = 0.85;

const gowooriPaneSessions = new Map<string, GowooriPaneSessionState>();

function normalizeGowooriSplitRatio(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_GOWOORI_SPLIT_RATIO;
  return Math.min(MAX_GOWOORI_SPLIT_RATIO, Math.max(MIN_GOWOORI_SPLIT_RATIO, value));
}

function cloneRecord(value: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!value) return null;
  return structuredClone(value);
}

function clonePlaybackSnapshot(snapshot: DemoLabPlaybackSnapshot | null): DemoLabPlaybackSnapshot | null {
  if (!snapshot) return null;
  return {
    ...snapshot,
    cursorPosition: { ...snapshot.cursorPosition },
    highlightRect: snapshot.highlightRect ? { ...snapshot.highlightRect } : null,
    calloutPosition: snapshot.calloutPosition ? { ...snapshot.calloutPosition } : null,
  };
}

function cloneGowooriPaneSessionState(state: GowooriPaneSessionState): GowooriPaneSessionState {
  return {
    ...state,
    splitRatio: normalizeGowooriSplitRatio(state.splitRatio),
    playbackSnapshot: clonePlaybackSnapshot(state.playbackSnapshot),
    playbackFixture: cloneRecord(state.playbackFixture),
  };
}

export function createDefaultGowooriPaneSessionState(source: string, sourceLabel: string): GowooriPaneSessionState {
  return {
    source,
    sourceLabel,
    loadedFilePath: null,
    loadError: null,
    isModified: false,
    mode: 'preview',
    zoom: 100,
    selectedPresetId: DEFAULT_GOWOORI_PRESET_ID,
    splitRatio: DEFAULT_GOWOORI_SPLIT_RATIO,
    playbackSnapshot: null,
    playbackDocumentSource: null,
    playbackFixture: null,
  };
}

export function readGowooriPaneSessionState(
  contentId: string,
  fallback: GowooriPaneSessionState,
): GowooriPaneSessionState {
  return cloneGowooriPaneSessionState(gowooriPaneSessions.get(contentId) ?? fallback);
}

export function writeGowooriPaneSessionState(contentId: string, state: GowooriPaneSessionState): void {
  gowooriPaneSessions.set(contentId, cloneGowooriPaneSessionState(state));
}

export function clearGowooriPaneSessionState(contentId: string): void {
  gowooriPaneSessions.delete(contentId);
}
