// ─── Xenesis Desk — Core Dock Engine ───────────────────────────────────────

import type {
  DockContentType,
  McpBridgeBotChannelName,
  ObsidianVaultContentState,
  RemoteFileProfile,
  RenderOptions,
  TerminalSessionSnapshot,
} from '../../shared/types';

export type DockState = 'document' | 'left' | 'right' | 'top' | 'bottom' | 'float' | 'hidden';
export type WindowState = 'top' | 'left' | 'document' | 'right' | 'bottom';
export type SideState = 'left' | 'right' | 'top' | 'bottom';
export type DockContentPlacement = 'tab' | 'left' | 'right' | 'top' | 'bottom';

export const DOCK_STATES = new Set<string>(['document', 'left', 'right', 'top', 'bottom', 'float', 'hidden']);
export const WINDOW_STATES: WindowState[] = ['top', 'left', 'document', 'right', 'bottom'];
export const SIDE_STATES: SideState[] = ['left', 'right', 'top', 'bottom'];
export const DEFAULT_SIDE_WINDOW_ORDER: SideState[] = ['top', 'bottom', 'left', 'right'];
export const DOCK_CONTENT_PLACEMENTS = new Set<string>(['tab', 'left', 'right', 'top', 'bottom']);
export const STORAGE_KEY = 'vanilla-js-docking-layout';
export const EXTENSION_PANEL_CONTENT_TYPE = 'extension-panel';
export const MIN_SIDE = 120;
export const MIN_BOTTOM = 90;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PaneLayout {
  left: string;
  top: string;
  width: string;
  height: string;
}

export interface Sizes {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const DEFAULT_SIZES: Sizes = { left: 240, right: 260, top: 0, bottom: 170 };

export function assertDockState(state: string): asserts state is DockState {
  if (!DOCK_STATES.has(state)) throw new Error(`Invalid dock state: ${state}`);
}

export function normalizeDockContentPlacement(value: unknown): DockContentPlacement {
  const placement = String(value || 'tab').trim();
  return DOCK_CONTENT_PLACEMENTS.has(placement) ? (placement as DockContentPlacement) : 'tab';
}

export function isSideState(state: string): state is SideState {
  return SIDE_STATES.includes(state as SideState);
}

export function cloneSizes(sizes: Partial<Sizes>): Sizes {
  return {
    left: Number(sizes.left) || DEFAULT_SIZES.left,
    right: Number(sizes.right) || DEFAULT_SIZES.right,
    top: Number(sizes.top) || DEFAULT_SIZES.top,
    bottom: Number(sizes.bottom) || DEFAULT_SIZES.bottom,
  };
}

export interface DockContentOptions {
  id: string | number;
  title?: string;
  /** i18n key — DockPaneView가 t(titleKey, titleVars)로 런타임 재번역 */
  titleKey?: string;
  titleVars?: Record<string, string | number>;
  html?: string;
  hideOnClose?: boolean;
  state?: string;
  previousState?: string;
  hiddenRestorePlacement?: HiddenRestorePlacement;
  group?: string | null;
  contentType?: DockContentType;
  termId?: string;
  terminalRestore?: TerminalSessionSnapshot;
  url?: string;
  filePath?: string;
  fileName?: string;
  fileContent?: string;
  fileExt?: string;
  fileOrigin?: 'local' | 'remote';
  remoteFileProfile?: RemoteFileProfile;
  remoteFilePath?: string;
  renderOptions?: RenderOptions;
  botSessionId?: string;
  botInputUrl?: string;
  botSource?: string;
  botChannel?: McpBridgeBotChannelName;
  obsidianVault?: ObsidianVaultContentState;
  /** hex 뷰어 전용 — 원본 파일 전체 크기 (bytes) */
  totalBytes?: number;
}

export class DockContent {
  id: string;
  title: string;
  /** i18n key — DockPaneView가 t(titleKey, titleVars)로 런타임 재번역 */
  titleKey?: string;
  titleVars?: Record<string, string | number>;
  html: string;
  hideOnClose: boolean;
  state: DockState;
  previousState: DockState;
  hiddenRestorePlacement?: HiddenRestorePlacement;
  group: string | null;
  contentType: DockContentType;
  termId?: string;
  terminalRestore?: TerminalSessionSnapshot;
  url?: string;
  totalBytes?: number;
  filePath?: string;
  fileName?: string;
  fileContent?: string;
  fileExt?: string;
  fileOrigin?: 'local' | 'remote';
  remoteFileProfile?: RemoteFileProfile;
  remoteFilePath?: string;
  renderOptions?: RenderOptions;
  botSessionId?: string;
  botInputUrl?: string;
  botSource?: string;
  botChannel?: McpBridgeBotChannelName;
  obsidianVault?: ObsidianVaultContentState;

  constructor(options: DockContentOptions) {
    if (!options || !options.id) throw new Error('DockContent requires an id');
    this.id = String(options.id);
    this.title = options.title ?? this.id;
    this.titleKey = options.titleKey;
    this.titleVars = options.titleVars;
    this.html = options.html ?? '';
    this.hideOnClose = Boolean(options.hideOnClose);
    const state = options.state ?? 'document';
    assertDockState(state);
    this.state = state;
    const prevState = options.previousState ?? (this.state === 'hidden' ? 'document' : this.state);
    assertDockState(prevState);
    this.previousState = prevState;
    this.hiddenRestorePlacement = options.hiddenRestorePlacement;
    this.group = options.group ?? null;
    this.contentType = options.contentType ?? 'html';
    this.termId = options.termId;
    this.terminalRestore = options.terminalRestore;
    this.url = options.url;
    this.filePath = options.filePath;
    this.fileName = options.fileName;
    this.fileContent = options.fileContent;
    this.fileExt = options.fileExt;
    this.fileOrigin = options.fileOrigin ?? (options.remoteFileProfile ? 'remote' : 'local');
    this.remoteFileProfile = options.remoteFileProfile;
    this.remoteFilePath = options.remoteFilePath;
    this.renderOptions = options.renderOptions;
    this.botSessionId = options.botSessionId;
    this.botInputUrl = options.botInputUrl;
    this.botSource = options.botSource;
    this.botChannel = options.botChannel;
    this.obsidianVault = options.obsidianVault;
  }
}

export interface DockPaneOptions {
  id?: string;
  group?: string | null;
  bounds?: Bounds;
  activeContentHistory?: string[];
}

export class DockPane {
  id: string;
  state: DockState;
  group: string | null;
  contents: string[];
  activeContentId: string | null;
  activeContentHistory: string[];
  bounds: Bounds;
  layout: PaneLayout;

  constructor(state: DockState, _contents: string[] = [], options: DockPaneOptions = {}, nextPaneId?: number) {
    assertDockState(state);
    this.id = options.id ?? `pane-${nextPaneId}`;
    this.state = state;
    this.group = options.group ?? null;
    this.contents = [];
    this.activeContentId = null;
    this.activeContentHistory = this.normalizeContentHistory(options.activeContentHistory ?? []);
    this.bounds = options.bounds ?? { x: 90, y: 70, width: 360, height: 260 };
    this.layout = { left: '0', top: '0', width: '100%', height: '100%' };
  }

  normalizeContentHistory(value: unknown = this.activeContentHistory): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    const source = Array.isArray(value) ? value : [];
    for (const rawId of source) {
      const id = String(rawId);
      if (!this.contents.includes(id) || seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
    for (const id of this.contents) {
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
    return result;
  }

  recentContentId(): string | null {
    this.activeContentHistory = this.normalizeContentHistory();
    return this.activeContentHistory[0] ?? null;
  }

  activateContent(contentId: string): void {
    if (!this.contents.includes(contentId)) return;
    this.activeContentId = contentId;
    this.activeContentHistory = [contentId, ...this.normalizeContentHistory().filter((id) => id !== contentId)];
  }

  addContent(content: DockContent, index = -1): void {
    if (!content) throw new Error('Cannot add empty content');
    this.removeContent(content.id);
    if (index >= 0 && index < this.contents.length) this.contents.splice(index, 0, content.id);
    else this.contents.push(content.id);
    content.state = this.state;
    if (this.state !== 'hidden') content.previousState = this.state;
    content.group = content.group ?? this.group;
    this.activateContent(content.id);
  }

  moveContentWithinPane(contentId: string, targetIndex: number): void {
    const fromIndex = this.contents.indexOf(contentId);
    if (fromIndex < 0) return;
    const boundedTargetIndex = Math.max(0, Math.min(targetIndex, this.contents.length - 1));
    this.contents.splice(fromIndex, 1);
    const nextIndex = Math.max(0, Math.min(boundedTargetIndex, this.contents.length));
    this.contents.splice(nextIndex, 0, contentId);
    this.activateContent(contentId);
  }

  removeContent(contentId: string): void {
    this.contents = this.contents.filter((id) => id !== contentId);
    this.activeContentHistory = this.activeContentHistory.filter((id) => id !== contentId);
    if (this.activeContentId === contentId || !this.contents.includes(this.activeContentId ?? '')) {
      this.activeContentId = this.recentContentId();
    } else {
      this.activeContentHistory = this.normalizeContentHistory();
    }
  }
}

export type LayoutLeaf = { type: 'pane'; paneId: string };
export type LayoutSplit = {
  type: 'split';
  direction: 'row' | 'column';
  first: LayoutNode | null;
  second: LayoutNode | null;
  ratio?: number; // first 영역의 비율 (0.05~0.95), 기본값 0.5
};
export type LayoutNode = LayoutLeaf | LayoutSplit;

export interface HiddenRestorePlacement {
  paneId: string;
  windowState: WindowState;
  windowTree: LayoutNode | null;
  group: string | null;
  bounds: Bounds;
  contentIndex: number;
  activeContentId: string | null;
  activeContentHistory?: string[];
}

export interface DockWindow {
  state: WindowState;
  panes: string[];
  layoutRoot: LayoutNode | null;
}

export type DropPayload =
  | { type: 'pane'; paneId: string; label: string }
  | { type: 'content'; paneId: string; contentId: string; label: string };

export interface PaneDropTarget {
  scope: 'pane';
  targetPaneId: string;
  zone: string | null;
  fillDisabled: boolean;
  rect: { left: number; top: number; width: number; height: number };
}

/**
 * 윈도우 내 LayoutSplit 노드 하나의 분할선 정보.
 * DockHost 가 이를 읽어 드래그 가능한 핸들 요소를 렌더링한다.
 */
export interface SplitSeamInfo {
  /** 직접 참조 — ratio 를 변경하면 트리에 즉시 반영됨 */
  node: LayoutSplit;
  windowState: WindowState;
  /** 컨테이너 영역 (윈도우 기준 %) */
  containerLeft: number;
  containerTop: number;
  containerWidth: number;
  containerHeight: number;
}

export interface DockPaneGroupSizeResult {
  ok: boolean;
  message: string;
  paneId: string;
  paneIds: string[];
  widthPercent?: number;
  heightPercent?: number;
}

export interface RootDropTarget {
  scope: 'root';
  zone: string;
}

export type DropTarget = PaneDropTarget | RootDropTarget;

interface SavedContent {
  id: string;
  title: string;
  titleKey?: string;
  titleVars?: Record<string, string | number>;
  html: string;
  hideOnClose: boolean;
  state: DockState;
  previousState: DockState;
  hiddenRestorePlacement?: HiddenRestorePlacement;
  group: string | null;
  contentType?: string;
  termId?: string;
  terminalRestore?: TerminalSessionSnapshot;
  url?: string;
  filePath?: string;
  fileName?: string;
  fileContent?: string;
  fileExt?: string;
  fileOrigin?: 'local' | 'remote';
  remoteFileProfile?: RemoteFileProfile;
  remoteFilePath?: string;
  renderOptions?: RenderOptions;
  botSessionId?: string;
  botInputUrl?: string;
  botSource?: string;
  botChannel?: McpBridgeBotChannelName;
  obsidianVault?: ObsidianVaultContentState;
}

interface SavedPane {
  id: string;
  state: DockState;
  group: string | null;
  contents: string[];
  activeContentId: string | null;
  activeContentHistory?: string[];
  bounds: Bounds;
}

export interface SavedLayout {
  sizes: Sizes;
  nextPaneId: number;
  activePaneId?: string | null;
  artifactPaneId?: string | null;
  sideWindowOrder?: SideState[];
  contents: SavedContent[];
  panes: SavedPane[];
  windows: Record<string, string[]>;
  windowTrees?: Record<string, LayoutNode | null>;
}

// ─── Core Engine (imperative, drives React via callback) ───────────────────────
export class DockEngine {
  onUpdate: (() => void) | null;
  contents: Map<string, DockContent>;
  panes: Map<string, DockPane>;
  windows: Map<WindowState, DockWindow>;
  sideWindowOrder: SideState[];
  nextPaneId: number;
  sizes: Sizes;
  currentDropZone: string | null;
  currentDropTarget: DropTarget | null;

  /** 현재 사용자가 포커스한 패인 ID. 새 탭은 이 패인에 우선 배치된다. */
  activePaneId: string | null;
  artifactPaneId: string | null;

  // Dynamically attached by useDragManager
  beginPaneDrag?: (pane: DockPane, event: PointerEvent) => void;
  beginContentDrag?: (pane: DockPane, contentId: string, event: PointerEvent) => void;

  /**
   * computeLayouts() 호출 시 갱신되는 윈도우 내부 분할선 목록.
   * DockHost 가 드래그 핸들을 렌더링하는 데 사용한다.
   */
  splitSeams: SplitSeamInfo[];

  constructor(onUpdate: () => void) {
    this.onUpdate = onUpdate;
    this.contents = new Map();
    this.panes = new Map();
    this.windows = new Map();
    this.sideWindowOrder = [];
    this.nextPaneId = 1;
    this.sizes = { ...DEFAULT_SIZES };
    this.currentDropZone = null;
    this.currentDropTarget = null;
    this.activePaneId = null;
    this.artifactPaneId = null;
    this.splitSeams = [];

    WINDOW_STATES.forEach((state) => {
      this.windows.set(state, { state, panes: [], layoutRoot: null });
    });
  }

  // ─── Notify React ───────────────────────────────────────────────────────────
  notify(): void {
    if (this.onUpdate) this.onUpdate();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  effectiveSize(state: SideState): number {
    if (!this.hasPanes(state)) return 0;
    if (state === 'top' && this.sizes.top <= 0) return 150;
    return this.sizes[state] || 0;
  }

  getSizes(): Sizes {
    return { ...this.sizes };
  }

  setSizes(sizes: Partial<Sizes>): Sizes {
    const next = { ...this.sizes };
    const clampSide = (value: unknown, current: number): number => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? Math.max(MIN_SIDE, Math.round(numeric)) : current;
    };
    const clampTop = (value: unknown, current: number): number => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return current;
      if (numeric <= 0) return 0;
      return Math.max(80, Math.round(numeric));
    };
    const clampBottom = (value: unknown, current: number): number => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return current;
      if (numeric <= 0) return 0;
      return Math.max(MIN_BOTTOM, Math.round(numeric));
    };

    next.left = clampSide(sizes.left, next.left);
    next.right = clampSide(sizes.right, next.right);
    next.top = clampTop(sizes.top, next.top);
    next.bottom = clampBottom(sizes.bottom, next.bottom);
    this.sizes = next;
    this.notify();
    return this.getSizes();
  }

  hasPanes(state: string): boolean {
    const win = this.windows.get(state as WindowState);
    return !!(win && win.panes.length > 0);
  }

  private pruneSideWindowOrder(): void {
    this.sideWindowOrder = this.sideWindowOrder.filter((state) => this.hasPanes(state));
  }

  private ensureSideWindowOrder(state: DockState): void {
    if (!isSideState(state)) return;
    if (!this.sideWindowOrder.includes(state)) this.sideWindowOrder.push(state);
  }

  getDockSideOrder(): SideState[] {
    const active = new Set(SIDE_STATES.filter((state) => this.hasPanes(state)));
    const ordered = this.sideWindowOrder.filter((state) => active.has(state));
    for (const state of DEFAULT_SIDE_WINDOW_ORDER) {
      if (active.has(state) && !ordered.includes(state)) ordered.push(state);
    }
    return ordered;
  }

  prioritizeSideWindow(state: SideState): void {
    if (!this.hasPanes(state)) return;
    const active = new Set(SIDE_STATES.filter((item) => this.hasPanes(item)));
    const previousOrder = this.getDockSideOrder();
    const nextOrder = [state, ...this.sideWindowOrder.filter((item) => item !== state && active.has(item))];
    for (const fallbackState of DEFAULT_SIDE_WINDOW_ORDER) {
      if (active.has(fallbackState) && !nextOrder.includes(fallbackState)) {
        nextOrder.push(fallbackState);
      }
    }
    this.sideWindowOrder = nextOrder;
    if (previousOrder.length !== nextOrder.length || previousOrder.some((item, index) => item !== nextOrder[index])) {
      this.notify();
    }
  }

  getCSSVars(): Record<string, string> {
    return {
      '--dock-left': `${this.effectiveSize('left')}px`,
      '--dock-right': `${this.effectiveSize('right')}px`,
      '--dock-top': `${this.effectiveSize('top')}px`,
      '--dock-bottom': `${this.effectiveSize('bottom')}px`,
    };
  }

  // ─── Content management ─────────────────────────────────────────────────────
  addContent(options: DockContentOptions): DockContent {
    const content = new DockContent(options);
    if (this.contents.has(content.id)) throw new Error(`Duplicate content id: ${content.id}`);
    this.contents.set(content.id, content);
    this.showContent(content.id, content.state, { group: content.group });
    return content;
  }

  setArtifactPane(paneId: string | null): void {
    this.artifactPaneId = paneId && this.panes.has(paneId) ? paneId : null;
    this.notify();
  }

  resolveTargetPane(targetPaneId?: string | null): DockPane | null {
    const explicitPaneId = String(targetPaneId || '').trim();
    if (explicitPaneId) return this.panes.get(explicitPaneId) ?? null;
    return this.artifactPaneId ? (this.panes.get(this.artifactPaneId) ?? null) : null;
  }

  addContentToPane(options: DockContentOptions, pane: DockPane): DockContent {
    const content = new DockContent({
      ...options,
      state: pane.state,
      group: options.group ?? pane.group,
    });
    if (this.contents.has(content.id)) throw new Error(`Duplicate content id: ${content.id}`);
    this.contents.set(content.id, content);
    pane.addContent(content);
    this.setPaneState(pane, pane.state);
    this.notify();
    return content;
  }

  addContentWithPlacement(
    options: DockContentOptions,
    placementValue: unknown = 'tab',
    targetPaneId?: string | null,
  ): DockContent {
    const placement = normalizeDockContentPlacement(placementValue);
    const explicitTargetRequested = targetPaneId !== undefined;
    const targetedPane = explicitTargetRequested ? this.resolveTargetPane(targetPaneId) : null;
    const activePane = this.activePaneId ? (this.panes.get(this.activePaneId) ?? null) : null;
    const targetPane = targetedPane ?? activePane;
    const targetWindow = targetPane ? this.findWindowByPane(targetPane.id) : null;
    if (placement === 'tab') {
      if (targetedPane && targetWindow) return this.addContentToPane(options, targetedPane);
      if (targetPane && targetWindow && targetPane.state === 'document')
        return this.addContentToPane(options, targetPane);
      return this.addContent(options);
    }

    if (!explicitTargetRequested) {
      return this.addContent({
        ...options,
        state: placement,
      });
    }

    if (!targetPane || !targetWindow) {
      return this.addContent({
        ...options,
        state: placement,
      });
    }

    const content = new DockContent({
      ...options,
      state: targetPane.state,
      group: options.group ?? targetPane.group,
    });
    if (this.contents.has(content.id)) throw new Error(`Duplicate content id: ${content.id}`);
    this.contents.set(content.id, content);
    const splitPane = new DockPane(
      targetPane.state,
      [],
      { group: content.group ?? targetPane.group },
      this.nextPaneId++,
    );
    this.panes.set(splitPane.id, splitPane);
    splitPane.addContent(content);
    this.insertPaneRelative(targetPane.id, splitPane.id, placement);
    if (!targetedPane) this.activePaneId = splitPane.id;
    this.notify();
    return content;
  }

  showContent(
    contentId: string,
    state: DockState = 'document',
    options: { group?: string | null } = {},
  ): DockPane | null {
    assertDockState(state);
    const content = this.contents.get(contentId);
    if (!content) throw new Error(`Missing content: ${contentId}`);
    if (state === 'hidden') {
      this.hideContent(contentId);
      return null;
    }

    let pane = this.findPaneByContent(contentId);
    if (pane) {
      pane.state = state;
      if (!this.panes.has(pane.id)) this.panes.set(pane.id, pane);
    } else {
      pane = this.findTargetPane(state, options.group ?? null);
    }
    if (!pane) {
      pane = new DockPane(state, [], { group: options.group ?? content.group }, this.nextPaneId++);
      this.panes.set(pane.id, pane);
    }

    const attachedWindow = this.findWindowByPane(pane.id);
    const keepPlacement = !!(attachedWindow && attachedWindow.state === state);
    pane.state = state;
    pane.addContent(content);
    // 새 콘텐츠가 추가된 패인을 활성 패인으로 기록
    if (state === 'document') this.activePaneId = pane.id;
    if (keepPlacement) this.setPaneState(pane, state);
    else this.attachPaneToState(pane, state);
    this.notify();
    return pane;
  }

  restoreHiddenContent(contentId: string): DockPane | null {
    const content = this.contents.get(contentId);
    if (!content) throw new Error(`Missing content: ${contentId}`);

    const restoredPane = this.restoreHiddenPlacement(content);
    if (restoredPane) {
      this.notify();
      return restoredPane;
    }

    const prev = content.previousState;
    const fallbackState: DockState = prev && prev !== 'hidden' && prev !== 'float' ? prev : 'document';
    return this.showContent(content.id, fallbackState, { group: content.group });
  }

  findTargetPane(state: DockState, group: string | null = null): DockPane | null {
    if (state === 'document') {
      // 현재 활성 패인이 document 윈도우에 있으면 우선 사용
      if (this.activePaneId) {
        const active = this.panes.get(this.activePaneId);
        const docWin = this.windows.get('document');
        if (
          active &&
          docWin &&
          (docWin.panes.includes(this.activePaneId) || this.treeHasPane(docWin.layoutRoot, this.activePaneId))
        ) {
          return active;
        }
      }
      // 활성 패인이 없거나 document 윈도우 밖이면 첫 번째 패인 사용
      const docWin = this.windows.get('document');
      if (docWin) {
        const docPane = docWin.panes.map((id) => this.panes.get(id)).find((p): p is DockPane => !!p);
        if (docPane) return docPane;
      }
    }
    if (group) {
      for (const pane of this.panes.values()) {
        if (pane.group === group && pane.state === state) return pane;
      }
    }
    return null;
  }

  findPaneByContent(contentId: string): DockPane | null {
    for (const pane of this.panes.values()) {
      if (pane.contents.includes(contentId)) return pane;
    }
    return null;
  }

  // ─── Layout tree helpers ────────────────────────────────────────────────────
  defaultSplitDirection(state: string): 'row' | 'column' {
    return state === 'left' || state === 'right' ? 'column' : 'row';
  }

  makeLeaf(paneId: string): LayoutLeaf {
    return { type: 'pane', paneId };
  }

  makeSplit(
    direction: 'row' | 'column',
    first: LayoutNode | null,
    second: LayoutNode | null,
    ratio?: number,
  ): LayoutSplit {
    const split: LayoutSplit = { type: 'split', direction, first, second };
    if (ratio !== undefined) split.ratio = Math.max(0.05, Math.min(0.95, ratio));
    return split;
  }

  cloneLayoutNode(node: LayoutNode | null): LayoutNode | null {
    if (!node) return null;
    if (node.type === 'pane') return this.makeLeaf(node.paneId);
    if (node.type === 'split')
      return this.makeSplit(
        node.direction,
        this.cloneLayoutNode(node.first),
        this.cloneLayoutNode(node.second),
        node.ratio,
      );
    return null;
  }

  cloneHiddenRestorePlacement(placement?: HiddenRestorePlacement): HiddenRestorePlacement | undefined {
    if (!placement) return undefined;
    return {
      ...placement,
      bounds: { ...placement.bounds },
      activeContentHistory: placement.activeContentHistory ? [...placement.activeContentHistory] : undefined,
      windowTree: this.cloneLayoutNode(placement.windowTree),
    };
  }

  normalizeLayoutNode(node: unknown, allowedIds: Set<string>): LayoutNode | null {
    if (!node || typeof node !== 'object') return null;
    const n = node as Record<string, unknown>;
    if (n['type'] === 'pane') {
      const paneId = n['paneId'] as string;
      return allowedIds.has(paneId) ? this.makeLeaf(paneId) : null;
    }
    if (n['type'] !== 'split') return null;
    const first = this.normalizeLayoutNode(n['first'], allowedIds);
    const second = this.normalizeLayoutNode(n['second'], allowedIds);
    const ratio = typeof n['ratio'] === 'number' && isFinite(n['ratio'] as number) ? (n['ratio'] as number) : undefined;
    if (first && second) return this.makeSplit(n['direction'] === 'column' ? 'column' : 'row', first, second, ratio);
    return first ?? second ?? null;
  }

  buildTreeFromPaneIds(ids: string[], state: string): LayoutNode | null {
    const direction = this.defaultSplitDirection(state);
    return ids.reduce<LayoutNode | null>((root, paneId) => {
      const leaf = this.makeLeaf(paneId);
      return root ? this.makeSplit(direction, root, leaf) : leaf;
    }, null);
  }

  treeHasPane(node: LayoutNode | null, paneId: string): boolean {
    if (!node) return false;
    if (node.type === 'pane') return node.paneId === paneId;
    return this.treeHasPane(node.first, paneId) || this.treeHasPane(node.second, paneId);
  }

  collectTreePanes(node: LayoutNode | null, out: string[] = []): string[] {
    if (!node) return out;
    if (node.type === 'pane') {
      if (this.panes.has(node.paneId)) out.push(node.paneId);
      return out;
    }
    this.collectTreePanes(node.first, out);
    this.collectTreePanes(node.second, out);
    return out;
  }

  removePaneFromTree(node: LayoutNode | null, paneId: string): LayoutNode | null {
    if (!node) return null;
    if (node.type === 'pane') return node.paneId === paneId ? null : node;
    const first = this.removePaneFromTree(node.first, paneId);
    const second = this.removePaneFromTree(node.second, paneId);
    if (first && second) return this.makeSplit(node.direction, first, second, node.ratio); // ratio 보존
    return first ?? second ?? null;
  }

  replacePaneInTree(node: LayoutNode | null, paneId: string, replacement: LayoutNode | null): LayoutNode | null {
    if (!node) return null;
    if (node.type === 'pane') return node.paneId === paneId ? replacement : node;
    return this.makeSplit(
      node.direction,
      this.replacePaneInTree(node.first, paneId, replacement),
      this.replacePaneInTree(node.second, paneId, replacement),
      node.ratio, // ratio 보존
    );
  }

  replacePaneSetInTree(
    node: LayoutNode | null,
    paneIds: Set<string>,
    replacement: LayoutNode | null,
    inserted: { value: boolean } = { value: false },
  ): LayoutNode | null {
    if (!node) return null;
    if (node.type === 'pane') {
      if (!paneIds.has(node.paneId)) return node;
      if (inserted.value) return null;
      inserted.value = true;
      return replacement;
    }
    const first = this.replacePaneSetInTree(node.first, paneIds, replacement, inserted);
    const second = this.replacePaneSetInTree(node.second, paneIds, replacement, inserted);
    if (first && second) return this.makeSplit(node.direction, first, second, node.ratio);
    return first ?? second ?? null;
  }

  private treeHasExactPaneSetSubtree(node: LayoutNode | null, paneIds: Set<string>): boolean {
    if (!node || paneIds.size === 0) return false;
    const nodePaneIds = this.collectTreePanes(node, []);
    if (nodePaneIds.length === paneIds.size && nodePaneIds.every((id) => paneIds.has(id))) return true;
    if (node.type === 'pane') return false;
    return (
      this.treeHasExactPaneSetSubtree(node.first, paneIds) || this.treeHasExactPaneSetSubtree(node.second, paneIds)
    );
  }

  private treeMatchesExactPaneSet(node: LayoutNode | null, paneIds: Set<string>): boolean {
    if (!node || paneIds.size === 0) return false;
    const nodePaneIds = this.collectTreePanes(node, []);
    return nodePaneIds.length === paneIds.size && nodePaneIds.every((id) => paneIds.has(id));
  }

  private setExactPaneSetSplitRatio(
    node: LayoutNode | null,
    paneIds: Set<string>,
    direction: 'row' | 'column',
    targetPercent: number,
  ): boolean {
    if (!node || node.type !== 'split') return false;
    if (node.direction === direction) {
      if (this.treeMatchesExactPaneSet(node.first, paneIds)) {
        node.ratio = Math.max(0.05, Math.min(0.95, targetPercent / 100));
        return true;
      }
      if (this.treeMatchesExactPaneSet(node.second, paneIds)) {
        node.ratio = Math.max(0.05, Math.min(0.95, 1 - targetPercent / 100));
        return true;
      }
    }
    return (
      this.setExactPaneSetSplitRatio(node.first, paneIds, direction, targetPercent) ||
      this.setExactPaneSetSplitRatio(node.second, paneIds, direction, targetPercent)
    );
  }

  private replaceExactPaneSetSubtree(
    node: LayoutNode | null,
    paneIds: Set<string>,
    replacement: LayoutNode | null,
    inserted: { value: boolean } = { value: false },
  ): LayoutNode | null {
    if (!node) return null;
    const nodePaneIds = this.collectTreePanes(node, []);
    if (nodePaneIds.length === paneIds.size && nodePaneIds.every((id) => paneIds.has(id))) {
      if (inserted.value) return node;
      inserted.value = true;
      return replacement;
    }
    if (node.type === 'pane') return node;
    const first = this.replaceExactPaneSetSubtree(node.first, paneIds, replacement, inserted);
    const second = this.replaceExactPaneSetSubtree(node.second, paneIds, replacement, inserted);
    if (first && second) return this.makeSplit(node.direction, first, second, node.ratio);
    return first ?? second ?? null;
  }

  findWindowByPane(paneId: string): DockWindow | null {
    for (const win of this.windows.values()) {
      if (this.treeHasPane(win.layoutRoot, paneId) || win.panes.includes(paneId)) return win;
    }
    return null;
  }

  detachPaneFromWindows(paneId: string): void {
    for (const win of this.windows.values()) {
      const existing = win.panes.filter((id) => id !== paneId);
      win.layoutRoot = this.removePaneFromTree(win.layoutRoot, paneId);
      win.panes = win.layoutRoot ? this.collectTreePanes(win.layoutRoot) : existing;
    }
  }

  addPaneToWindow(win: DockWindow, paneId: string): void {
    if (!win || !this.panes.has(paneId)) return;
    if (!this.treeHasPane(win.layoutRoot, paneId)) {
      const leaf = this.makeLeaf(paneId);
      win.layoutRoot = win.layoutRoot
        ? this.makeSplit(this.defaultSplitDirection(win.state), win.layoutRoot, leaf)
        : leaf;
    }
    win.panes = this.collectTreePanes(win.layoutRoot);
  }

  captureHiddenRestorePlacement(content: DockContent, pane: DockPane | null): void {
    if (!pane || pane.state === 'hidden' || pane.state === 'float') {
      content.hiddenRestorePlacement = undefined;
      return;
    }
    const win = this.findWindowByPane(pane.id);
    if (!win) {
      content.hiddenRestorePlacement = undefined;
      return;
    }
    content.hiddenRestorePlacement = {
      paneId: pane.id,
      windowState: win.state,
      windowTree: this.cloneLayoutNode(win.layoutRoot ?? this.buildTreeFromPaneIds(win.panes, win.state)),
      group: pane.group,
      bounds: { ...pane.bounds },
      contentIndex: Math.max(0, pane.contents.indexOf(content.id)),
      activeContentId: pane.activeContentId,
      activeContentHistory: [...pane.activeContentHistory],
    };
  }

  restoreHiddenPlacement(content: DockContent): DockPane | null {
    const placement = content.hiddenRestorePlacement;
    if (!placement) return null;

    const existingPane = this.panes.get(placement.paneId);
    if (existingPane) {
      existingPane.addContent(content, placement.contentIndex);
      this.setPaneState(existingPane, existingPane.state);
      content.hiddenRestorePlacement = undefined;
      return existingPane;
    }

    const win = this.windows.get(placement.windowState);
    if (!win) return null;

    const pane = new DockPane(
      placement.windowState,
      [],
      {
        id: placement.paneId,
        group: placement.group ?? content.group,
        bounds: { ...placement.bounds },
        activeContentHistory: placement.activeContentHistory,
      },
      this.nextPaneId,
    );
    this.panes.set(pane.id, pane);
    pane.addContent(content, placement.contentIndex);
    this.setPaneState(pane, placement.windowState);

    const currentPaneIds = win.panes.filter((id) => this.panes.has(id) && id !== pane.id);
    const allowedIds = new Set([...currentPaneIds, pane.id]);
    const restoredTree = placement.windowTree ? this.normalizeLayoutNode(placement.windowTree, allowedIds) : null;

    if (restoredTree && this.treeHasPane(restoredTree, pane.id)) {
      win.layoutRoot = restoredTree;
      win.panes = this.collectTreePanes(win.layoutRoot);
      const seen = new Set(win.panes);
      currentPaneIds.filter((id) => !seen.has(id)).forEach((id) => this.addPaneToWindow(win, id));
    } else {
      this.addPaneToWindow(win, pane.id);
    }

    this.ensureSideWindowOrder(placement.windowState);
    if (placement.windowState === 'top' && this.sizes.top <= 0) this.sizes.top = 150;
    if (placement.windowState === 'bottom' && this.sizes.bottom <= 0) this.sizes.bottom = DEFAULT_SIZES.bottom;
    if (placement.windowState === 'left' && this.sizes.left <= 0) this.sizes.left = DEFAULT_SIZES.left;
    if (placement.windowState === 'right' && this.sizes.right <= 0) this.sizes.right = DEFAULT_SIZES.right;
    content.hiddenRestorePlacement = undefined;
    return pane;
  }

  setPaneState(pane: DockPane, state: DockState): void {
    pane.state = state;
    pane.contents.forEach((id) => {
      const content = this.contents.get(id);
      if (!content) return;
      content.state = state;
      if (state !== 'hidden' && state !== 'float') content.previousState = state;
    });
  }

  insertPaneRelative(targetPaneId: string, paneId: string, edge: string): DockWindow | null {
    const targetPane = this.panes.get(targetPaneId);
    const pane = this.panes.get(paneId);
    if (!targetPane || !pane || targetPane.id === pane.id) return null;
    const win = this.findWindowByPane(targetPane.id);
    if (!win) return null;
    if (!this.treeHasPane(win.layoutRoot, targetPane.id))
      win.layoutRoot = this.buildTreeFromPaneIds(win.panes, win.state);
    if (!this.treeHasPane(win.layoutRoot, targetPane.id)) return null;

    this.detachPaneFromWindows(pane.id);
    this.setPaneState(pane, win.state);
    const direction: 'row' | 'column' = edge === 'left' || edge === 'right' ? 'row' : 'column';
    const targetLeaf = this.makeLeaf(targetPane.id);
    const movedLeaf = this.makeLeaf(pane.id);
    const replacement =
      edge === 'left' || edge === 'top'
        ? this.makeSplit(direction, movedLeaf, targetLeaf)
        : this.makeSplit(direction, targetLeaf, movedLeaf);
    win.layoutRoot = this.replacePaneInTree(win.layoutRoot, targetPane.id, replacement);
    win.panes = this.collectTreePanes(win.layoutRoot);
    return win;
  }

  removeContentFromCurrentPane(contentId: string): void {
    const pane = this.findPaneByContent(contentId);
    if (!pane) return;
    pane.removeContent(contentId);
    if (pane.contents.length === 0) this.removePane(pane.id);
  }

  attachPaneToState(pane: DockPane, state: DockState): void {
    assertDockState(state);
    const previousWindow = this.findWindowByPane(pane.id);
    const previousSide = previousWindow && isSideState(previousWindow.state) ? previousWindow.state : null;
    this.detachPaneFromWindows(pane.id);
    if (previousSide && previousSide !== state) this.pruneSideWindowOrder();
    this.setPaneState(pane, state);
    if (state !== 'float' && state !== 'hidden') {
      const win = this.windows.get(state as WindowState);
      if (win) {
        this.addPaneToWindow(win, pane.id);
        this.ensureSideWindowOrder(state);
        if (state === 'top' && this.sizes.top <= 0) this.sizes.top = 150;
        if (state === 'bottom' && this.sizes.bottom <= 0) this.sizes.bottom = DEFAULT_SIZES.bottom;
        if (state === 'left' && this.sizes.left <= 0) this.sizes.left = DEFAULT_SIZES.left;
        if (state === 'right' && this.sizes.right <= 0) this.sizes.right = DEFAULT_SIZES.right;
      }
    }
  }

  removePane(paneId: string): void {
    if (this.artifactPaneId === paneId) this.artifactPaneId = null;
    this.detachPaneFromWindows(paneId);
    this.panes.delete(paneId);
    this.pruneSideWindowOrder();
  }

  closeContent(contentId: string): string | undefined {
    const content = this.contents.get(contentId);
    if (!content) throw new Error(`Missing content: ${contentId}`);
    if (content.hideOnClose) {
      this.hideContent(contentId);
      return;
    }
    this.removeContentFromCurrentPane(contentId);
    this.contents.delete(contentId);
    this.notify();
    return `Closed ${content.title}`;
  }

  hideContent(contentId: string): string {
    const content = this.contents.get(contentId);
    if (!content) throw new Error(`Missing content: ${contentId}`);
    const previousPane = this.findPaneByContent(contentId);
    if (previousPane && previousPane.state !== 'hidden') content.previousState = previousPane.state;
    this.captureHiddenRestorePlacement(content, previousPane);
    this.removeContentFromCurrentPane(contentId);
    content.state = 'hidden';
    this.notify();
    return `Hidden ${content.title}`;
  }

  moveContentToState(contentId: string, state: DockState): DockPane {
    assertDockState(state);
    const content = this.contents.get(contentId);
    if (!content) throw new Error(`Missing content: ${contentId}`);
    const sourcePane = this.findPaneByContent(contentId);
    if (!sourcePane) return this.showContent(contentId, state) as DockPane;
    sourcePane.removeContent(contentId);
    if (sourcePane.contents.length === 0) this.removePane(sourcePane.id);

    let targetPane = state === 'document' ? this.findTargetPane('document') : null;
    const keepPlacement = !!(targetPane && this.findWindowByPane(targetPane.id)?.state === state);
    if (!targetPane) {
      targetPane = new DockPane(state, [], { group: content.group }, this.nextPaneId++);
      this.panes.set(targetPane.id, targetPane);
    }
    targetPane.state = state;
    targetPane.addContent(content);
    if (keepPlacement) this.setPaneState(targetPane, state);
    else this.attachPaneToState(targetPane, state);
    this.notify();
    return targetPane;
  }

  floatPane(paneId: string, rootRect: DOMRect | null): string {
    const pane = this.panes.get(paneId);
    if (!pane) throw new Error(`Missing pane: ${paneId}`);
    pane.bounds = pane.bounds ?? { x: 90, y: 70, width: 360, height: 260 };
    if (rootRect) {
      pane.bounds.x = Math.max(12, Math.min(pane.bounds.x, Math.max(12, rootRect.width - 220)));
      pane.bounds.y = Math.max(12, Math.min(pane.bounds.y, Math.max(12, rootRect.height - 180)));
    }
    this.attachPaneToState(pane, 'float');
    this.notify();
    return `Floated ${this.contents.get(pane.activeContentId ?? '')?.title ?? pane.id}`;
  }

  dockPane(paneId: string, state: DockState): DockPane {
    assertDockState(state);
    if (state === 'float' || state === 'hidden') throw new Error(`Cannot dock pane to ${state}`);
    const pane = this.panes.get(paneId);
    if (!pane) throw new Error(`Missing pane: ${paneId}`);

    if (state === 'document') {
      const target = this.findTargetPane('document');
      if (target && target.id !== pane.id) {
        const contentIds = [...pane.contents];
        contentIds.forEach((id) => {
          const content = this.contents.get(id);
          if (content) target.addContent(content);
        });
        this.removePane(pane.id);
        this.setPaneState(target, 'document');
        this.notify();
        return target;
      }
    }

    this.attachPaneToState(pane, state);
    this.notify();
    return pane;
  }

  moveContentToPane(contentId: string, targetPaneId: string): DockPane {
    const content = this.contents.get(contentId);
    const target = this.panes.get(targetPaneId);
    if (!content) throw new Error(`Missing content: ${contentId}`);
    if (!target) throw new Error(`Missing pane: ${targetPaneId}`);

    const source = this.findPaneByContent(contentId);
    if (source && source.id === target.id) {
      target.activateContent(contentId);
      this.notify();
      return target;
    }

    if (source) {
      source.removeContent(contentId);
      if (source.contents.length === 0) this.removePane(source.id);
    }
    target.addContent(content);
    this.setPaneState(target, target.state);
    this.notify();
    return target;
  }

  splitContentToPane(contentId: string, targetPaneId: string, edge: string): DockPane {
    const content = this.contents.get(contentId);
    const target = this.panes.get(targetPaneId);
    if (!content) throw new Error(`Missing content: ${contentId}`);
    if (!target) throw new Error(`Missing pane: ${targetPaneId}`);
    const source = this.findPaneByContent(contentId);
    if (!source) return this.moveContentToPane(contentId, targetPaneId);
    if (source.id === target.id && source.contents.length <= 1) {
      target.activateContent(contentId);
      this.notify();
      return target;
    }

    source.removeContent(contentId);
    if (source.contents.length === 0 && source.id !== target.id) this.removePane(source.id);

    const splitPane = new DockPane(target.state, [], { group: content.group ?? target.group }, this.nextPaneId++);
    this.panes.set(splitPane.id, splitPane);
    splitPane.addContent(content);
    this.insertPaneRelative(target.id, splitPane.id, edge);
    this.notify();
    return splitPane;
  }

  mergePaneIntoPane(sourcePaneId: string, targetPaneId: string): DockPane {
    const source = this.panes.get(sourcePaneId);
    const target = this.panes.get(targetPaneId);
    if (!source) throw new Error(`Missing pane: ${sourcePaneId}`);
    if (!target) throw new Error(`Missing pane: ${targetPaneId}`);
    if (source.id === target.id) return target;

    [...source.contents].forEach((id) => {
      const content = this.contents.get(id);
      if (content) target.addContent(content);
    });
    this.removePane(source.id);
    this.setPaneState(target, target.state);
    this.notify();
    return target;
  }

  splitPaneToPane(sourcePaneId: string, targetPaneId: string, edge: string): DockPane {
    const source = this.panes.get(sourcePaneId);
    const target = this.panes.get(targetPaneId);
    if (!source) throw new Error(`Missing pane: ${sourcePaneId}`);
    if (!target) throw new Error(`Missing pane: ${targetPaneId}`);
    if (source.id === target.id) return target;

    this.insertPaneRelative(target.id, source.id, edge);
    this.notify();
    return source;
  }

  performDrop(payload: DropPayload, target: DropTarget): DockPane | null {
    if (!target.zone) return null;
    let droppedPane: DockPane | null = null;
    if (target.scope === 'root') {
      const state = target.zone as DockState;
      droppedPane =
        payload.type === 'content'
          ? this.moveContentToState(payload.contentId, state)
          : this.dockPane(payload.paneId, state);
      if (droppedPane) this.activePaneId = droppedPane.id;
      return droppedPane;
    }
    // scope === "pane"
    const zone = target.zone;
    if (payload.type === 'content') {
      droppedPane =
        zone === 'fill'
          ? this.moveContentToPane(payload.contentId, target.targetPaneId)
          : this.splitContentToPane(payload.contentId, target.targetPaneId, zone);
    } else {
      droppedPane =
        zone === 'fill'
          ? this.mergePaneIntoPane(payload.paneId, target.targetPaneId)
          : this.splitPaneToPane(payload.paneId, target.targetPaneId, zone);
    }
    if (droppedPane) this.activePaneId = droppedPane.id;
    return droppedPane;
  }

  shouldUseRootDropZone(zone: string | null, payload: DropPayload): boolean {
    if (!zone || zone === 'document') return false;
    const sourcePane = this.panes.get(payload.paneId);
    return !sourcePane || sourcePane.state !== zone;
  }

  // ─── Layout computation ─────────────────────────────────────────────────────
  layoutWindow(win: DockWindow): void {
    if (!win.layoutRoot && win.panes.length) win.layoutRoot = this.buildTreeFromPaneIds(win.panes, win.state);
    win.panes = this.collectTreePanes(win.layoutRoot);
    this.layoutNode(win.layoutRoot, { left: 0, top: 0, width: 100, height: 100 }, win.state);
  }

  layoutNode(
    node: LayoutNode | null,
    rect: { left: number; top: number; width: number; height: number },
    windowState: WindowState,
  ): void {
    if (!node) return;
    if (node.type === 'pane') {
      const pane = this.panes.get(node.paneId);
      if (!pane) return;
      pane.layout = {
        left: `${rect.left}%`,
        top: `${rect.top}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
      };
      return;
    }
    // split — 분할선 정보를 기록
    this.splitSeams.push({
      node,
      windowState,
      containerLeft: rect.left,
      containerTop: rect.top,
      containerWidth: rect.width,
      containerHeight: rect.height,
    });
    if (node.direction === 'column') {
      const firstH = rect.height * (typeof node.ratio === 'number' ? node.ratio : 0.5);
      this.layoutNode(node.first, { left: rect.left, top: rect.top, width: rect.width, height: firstH }, windowState);
      this.layoutNode(
        node.second,
        { left: rect.left, top: rect.top + firstH, width: rect.width, height: rect.height - firstH },
        windowState,
      );
    } else {
      const firstW = rect.width * (typeof node.ratio === 'number' ? node.ratio : 0.5);
      this.layoutNode(node.first, { left: rect.left, top: rect.top, width: firstW, height: rect.height }, windowState);
      this.layoutNode(
        node.second,
        { left: rect.left + firstW, top: rect.top, width: rect.width - firstW, height: rect.height },
        windowState,
      );
    }
  }

  computeLayouts(): void {
    this.splitSeams = []; // 매 렌더 전에 초기화
    for (const win of this.windows.values()) {
      this.layoutWindow(win);
    }
  }

  // ─── Resize ─────────────────────────────────────────────────────────────────
  beginResize(edge: SideState, event: PointerEvent): void {
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, sizes: { ...this.sizes } };
    const move = (mv: PointerEvent) => {
      const dx = mv.clientX - start.x;
      const dy = mv.clientY - start.y;
      if (edge === 'left') this.sizes.left = Math.max(MIN_SIDE, start.sizes.left + dx);
      if (edge === 'right') this.sizes.right = Math.max(MIN_SIDE, start.sizes.right - dx);
      if (edge === 'top') this.sizes.top = Math.max(80, start.sizes.top + dy);
      if (edge === 'bottom') this.sizes.bottom = Math.max(MIN_BOTTOM, start.sizes.bottom - dy);
      this.notify();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  }

  /**
   * 윈도우 내부 pane 분할선 드래그 리사이즈.
   * @param seam      분할선 정보 (node.ratio 를 직접 변경)
   * @param windowEl  분할선이 속한 .dock-window DOM 요소 (픽셀 크기 계산용)
   * @param event     pointerdown 이벤트
   */
  beginSplitResize(seam: SplitSeamInfo, windowEl: HTMLElement | null, event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const startRatio = seam.node.ratio ?? 0.5;
    const startX = event.clientX;
    const startY = event.clientY;

    const move = (mv: PointerEvent) => {
      const winRect = windowEl?.getBoundingClientRect();
      if (!winRect) return;
      if (seam.node.direction === 'row') {
        const containerPx = (winRect.width * seam.containerWidth) / 100;
        if (containerPx <= 0) return;
        seam.node.ratio = Math.max(0.05, Math.min(0.95, startRatio + (mv.clientX - startX) / containerPx));
      } else {
        const containerPx = (winRect.height * seam.containerHeight) / 100;
        if (containerPx <= 0) return;
        seam.node.ratio = Math.max(0.05, Math.min(0.95, startRatio + (mv.clientY - startY) / containerPx));
      }
      this.notify();
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  }

  // ─── Float bounds sync ──────────────────────────────────────────────────────
  syncFloatBoundsFromMap(boundsMap: Map<string, Bounds>): void {
    for (const [paneId, bounds] of boundsMap.entries()) {
      const pane = this.panes.get(paneId);
      if (pane) pane.bounds = bounds;
    }
  }

  // ─── Persistence ────────────────────────────────────────────────────────────
  saveLayout(floatBoundsMap: Map<string, Bounds> | null): SavedLayout {
    if (floatBoundsMap) this.syncFloatBoundsFromMap(floatBoundsMap);
    return {
      sizes: { ...this.sizes },
      nextPaneId: this.nextPaneId,
      activePaneId: this.activePaneId,
      artifactPaneId: this.artifactPaneId,
      sideWindowOrder: this.getDockSideOrder(),
      contents: [...this.contents.values()].map((content) => ({
        id: content.id,
        title: content.title,
        titleKey: content.titleKey,
        titleVars: content.titleVars,
        html: content.html,
        hideOnClose: content.hideOnClose,
        state: content.state,
        previousState: content.previousState,
        hiddenRestorePlacement: this.cloneHiddenRestorePlacement(content.hiddenRestorePlacement),
        group: content.group,
        contentType: content.contentType,
        termId: content.termId,
        terminalRestore: content.terminalRestore,
        url: content.url,
        filePath: content.filePath,
        fileName: content.fileName,
        fileContent:
          content.contentType !== 'image' && content.contentType !== 'document-preview'
            ? content.fileContent
            : undefined,
        fileExt: content.fileExt,
        fileOrigin: content.fileOrigin,
        remoteFileProfile: content.remoteFileProfile,
        remoteFilePath: content.remoteFilePath,
        renderOptions: content.renderOptions,
        botSessionId: content.botSessionId,
        botInputUrl: content.botInputUrl,
        botSource: content.botSource,
        botChannel: content.botChannel,
        obsidianVault: content.obsidianVault,
      })),
      panes: [...this.panes.values()].map((pane) => ({
        id: pane.id,
        state: pane.state,
        group: pane.group,
        contents: [...pane.contents],
        activeContentId: pane.activeContentId,
        activeContentHistory: [...pane.activeContentHistory],
        bounds: { ...pane.bounds },
      })),
      windows: Object.fromEntries([...this.windows.entries()].map(([state, win]) => [state, [...win.panes]])),
      windowTrees: Object.fromEntries(
        [...this.windows.entries()].map(([state, win]) => [state, this.cloneLayoutNode(win.layoutRoot)]),
      ),
    };
  }

  restoreLayout(layout: SavedLayout): void {
    if (!layout || !Array.isArray(layout.contents) || !Array.isArray(layout.panes) || !layout.windows) {
      throw new Error('Invalid layout shape');
    }

    const nextContents = new Map<string, DockContent>();
    const nextPanes = new Map<string, DockPane>();
    const nextWindows = new Map<string, string[]>(WINDOW_STATES.map((state) => [state, []]));

    layout.contents.forEach((item) => {
      nextContents.set(
        item.id,
        new DockContent({
          ...item,
          contentType: item.contentType as DockContentOptions['contentType'],
        }),
      );
    });

    layout.panes.forEach((item) => {
      assertDockState(item.state);
      const pane = new DockPane(
        item.state,
        [],
        { id: item.id, group: item.group ?? null, bounds: item.bounds },
        this.nextPaneId,
      );
      pane.contents = Array.isArray(item.contents) ? item.contents.filter((id) => nextContents.has(id)) : [];
      pane.activeContentHistory = pane.normalizeContentHistory([
        ...(item.activeContentId ? [item.activeContentId] : []),
        ...(Array.isArray(item.activeContentHistory) ? item.activeContentHistory : []),
      ]);
      pane.activeContentId = pane.activeContentHistory[0] ?? null;
      nextPanes.set(pane.id, pane);
    });

    for (const [state, ids] of Object.entries(layout.windows)) {
      if (!nextWindows.has(state)) continue;
      nextWindows.set(state, Array.isArray(ids) ? ids.filter((id) => nextPanes.has(id)) : []);
    }

    this.contents = nextContents;
    this.panes = nextPanes;
    for (const [state, ids] of nextWindows.entries()) {
      const win = this.windows.get(state as WindowState);
      if (!win) continue;
      const validIds = ids.filter((id) => nextPanes.has(id));
      const allowedIds = new Set(validIds);
      win.layoutRoot = layout.windowTrees?.[state]
        ? this.normalizeLayoutNode(layout.windowTrees[state], allowedIds)
        : null;
      if (!win.layoutRoot) win.layoutRoot = this.buildTreeFromPaneIds(validIds, state);
      win.panes = this.collectTreePanes(win.layoutRoot);
      const seen = new Set(win.panes);
      validIds.filter((id) => !seen.has(id)).forEach((id) => this.addPaneToWindow(win, id));
    }
    for (const pane of this.panes.values()) {
      pane.contents.forEach((id) => {
        const content = this.contents.get(id);
        if (content) content.state = pane.state;
      });
    }
    this.sideWindowOrder = [];
    const restoredSideWindowOrder = Array.isArray(layout.sideWindowOrder) ? layout.sideWindowOrder : [];
    for (const state of restoredSideWindowOrder) {
      if (isSideState(state) && this.hasPanes(state) && !this.sideWindowOrder.includes(state)) {
        this.sideWindowOrder.push(state);
      }
    }
    for (const state of DEFAULT_SIDE_WINDOW_ORDER) {
      if (this.hasPanes(state) && !this.sideWindowOrder.includes(state)) this.sideWindowOrder.push(state);
    }
    this.sizes = cloneSizes({ ...DEFAULT_SIZES, ...(layout.sizes ?? {}) });
    this.activePaneId =
      layout.activePaneId && this.panes.has(layout.activePaneId)
        ? layout.activePaneId
        : (this.windows.get('document')?.panes[0] ?? [...this.panes.keys()][0] ?? null);
    this.artifactPaneId = layout.artifactPaneId ?? null;
    if (!this.artifactPaneId || !this.panes.has(this.artifactPaneId)) this.artifactPaneId = null;
    this.nextPaneId = Math.max(
      Number(layout.nextPaneId) || 1,
      1 + Math.max(0, ...[...this.panes.keys()].map((id) => Number(String(id).replace('pane-', '')) || 0)),
    );
    this.notify();
  }

  resetLayout(createDemoFn?: (engine: DockEngine) => void): void {
    this.contents.clear();
    this.panes.clear();
    this.activePaneId = null;
    this.artifactPaneId = null;
    this.sideWindowOrder = [];
    this.nextPaneId = 1;
    this.sizes = { ...DEFAULT_SIZES };
    for (const win of this.windows.values()) {
      win.panes = [];
      win.layoutRoot = null;
    }
    if (createDemoFn) createDemoFn(this);
    this.notify();
  }

  // ─── 일괄 닫기 (탭 컨텍스트 메뉴용) ────────────────────────────────────────────

  /**
   * 여러 콘텐츠를 한 번에 닫는다. notify()를 한 번만 호출해 불필요한 리렌더를 방지.
   * 터미널 콘텐츠는 PTY kill이 필요하므로 termId 목록을 반환한다.
   * 반환된 termId를 호출자(DockPaneView)에서 terminalHost.kill()로 처리해야 한다.
   */
  batchCloseContents(contentIds: string[]): string[] {
    const termIds: string[] = [];
    for (const contentId of contentIds) {
      const content = this.contents.get(contentId);
      if (!content) continue;
      if (content.contentType === 'terminal' && content.termId) {
        termIds.push(content.termId);
      }
      if (content.hideOnClose) {
        const pane = this.findPaneByContent(contentId);
        if (pane && pane.state !== 'hidden') content.previousState = pane.state;
        this.captureHiddenRestorePlacement(content, pane);
        this.removeContentFromCurrentPane(contentId);
        content.state = 'hidden';
      } else {
        this.removeContentFromCurrentPane(contentId);
        this.contents.delete(contentId);
      }
    }
    this.notify();
    return termIds;
  }

  /** 패인 내에서 특정 콘텐츠 하나만 남기고 나머지를 닫는다 */
  closeOtherContentsInPane(paneId: string, keepContentId: string): string[] {
    const pane = this.panes.get(paneId);
    if (!pane) return [];
    const toClose = pane.contents.filter((id) => id !== keepContentId);
    const termIds = this.batchCloseContents(toClose);
    // keepContentId가 남아 있으면 활성으로 설정
    const updatedPane = this.panes.get(paneId);
    if (updatedPane && updatedPane.contents.includes(keepContentId)) {
      updatedPane.activateContent(keepContentId);
      this.notify();
    }
    return termIds;
  }

  /** 패인 내에서 특정 콘텐츠의 오른쪽(이후)에 있는 콘텐츠를 모두 닫는다 */
  closeContentsToRightInPane(paneId: string, afterContentId: string): string[] {
    const pane = this.panes.get(paneId);
    if (!pane) return [];
    const idx = pane.contents.indexOf(afterContentId);
    if (idx < 0) return [];
    const toClose = pane.contents.slice(idx + 1);
    return this.batchCloseContents(toClose);
  }

  /** 패인 내 모든 콘텐츠를 닫는다 */
  closeAllContentsInPane(paneId: string): string[] {
    const pane = this.panes.get(paneId);
    if (!pane) return [];
    const toClose = [...pane.contents];
    return this.batchCloseContents(toClose);
  }

  // ─── Hidden content helpers ─────────────────────────────────────────────────
  getHiddenContents(): DockContent[] {
    return [...this.contents.values()].filter((c) => c.state === 'hidden');
  }

  // ─── Content data update (no React re-render) ────────────────────────────────
  updateContentPayload(
    contentId: string,
    fields: {
      fileContent?: string;
      obsidianVault?: ObsidianVaultContentState;
      url?: string;
      totalBytes?: number;
    },
  ): void {
    const content = this.contents.get(contentId);
    if (!content) return;
    if (fields.fileContent !== undefined) content.fileContent = fields.fileContent;
    if (fields.obsidianVault !== undefined) content.obsidianVault = fields.obsidianVault;
    if (fields.url !== undefined) content.url = fields.url;
    if (fields.totalBytes !== undefined) content.totalBytes = fields.totalBytes;
  }

  // ─── 탭 정렬 (Tab Arrangement) ───────────────────────────────────────────────

  /** Document 윈도우 내 모든 콘텐츠 ID를 순서대로 수집 */
  private collectAllDocumentContentIds(): string[] {
    const win = this.windows.get('document');
    if (!win) return [];
    const result: string[] = [];
    for (const paneId of win.panes) {
      const pane = this.panes.get(paneId);
      if (pane) result.push(...pane.contents);
    }
    return result;
  }

  /**
   * ratio를 이용해 n개 노드를 균등 분할하는 right-deep 트리를 생성.
   * ratio = 1/n 이면 각 노드가 전체의 1/n을 차지.
   */
  buildEvenLinearTree(paneIds: string[], direction: 'row' | 'column'): LayoutNode | null {
    const n = paneIds.length;
    if (n === 0) return null;
    if (n === 1) return this.makeLeaf(paneIds[0]);
    // split(1/n, first, rest_split(1/(n-1), ...))
    const first = this.makeLeaf(paneIds[0]);
    const rest = this.buildEvenLinearTree(paneIds.slice(1), direction);
    return this.makeSplit(direction, first, rest, 1 / n);
  }

  private buildEvenLinearTreeFromNodes(nodes: LayoutNode[], direction: 'row' | 'column'): LayoutNode | null {
    const n = nodes.length;
    if (n === 0) return null;
    if (n === 1) return nodes[0];
    const rest = this.buildEvenLinearTreeFromNodes(nodes.slice(1), direction);
    return this.makeSplit(direction, nodes[0], rest, 1 / n);
  }

  /** √n 열로 바둑판 배열 */
  buildGridTree(paneIds: string[]): LayoutNode | null {
    const n = paneIds.length;
    if (n === 0) return null;
    if (n === 1) return this.makeLeaf(paneIds[0]);

    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);

    const rowNodes: LayoutNode[] = [];
    for (let r = 0; r < rows; r++) {
      const slice = paneIds.slice(r * cols, (r + 1) * cols);
      const rowNode = this.buildEvenLinearTree(slice, 'row');
      if (rowNode) rowNodes.push(rowNode);
    }
    return this.buildEvenLinearTreeFromNodes(rowNodes, 'column');
  }

  private collectPaneGroupPaneIds(
    paneId: string,
  ): { win: DockWindow; pane: DockPane; paneIds: string[]; group: string } | null {
    const pane = this.panes.get(paneId);
    if (!pane || pane.state === 'float' || pane.state === 'hidden') return null;

    const win = this.findWindowByPane(pane.id);
    if (!win) return null;
    if (!win.layoutRoot) win.layoutRoot = this.buildTreeFromPaneIds(win.panes, win.state);
    win.panes = win.layoutRoot ? this.collectTreePanes(win.layoutRoot) : win.panes.filter((id) => this.panes.has(id));

    const group = pane.group ?? `dock-group-${pane.id}`;
    if (pane.contents.length > 1) return { win, pane, paneIds: [pane.id], group };

    const groupedPaneIds = pane.group ? win.panes.filter((id) => this.panes.get(id)?.group === pane.group) : [];
    const groupedPaneIdSet = new Set(groupedPaneIds);
    const paneIds =
      groupedPaneIds.length > 1 && this.treeHasExactPaneSetSubtree(win.layoutRoot, groupedPaneIdSet)
        ? groupedPaneIds
        : [pane.id];

    return { win, pane, paneIds: paneIds.length ? paneIds : [pane.id], group };
  }

  private collectContentIdsFromPaneIds(paneIds: string[]): string[] {
    const result: string[] = [];
    for (const paneId of paneIds) {
      const pane = this.panes.get(paneId);
      if (pane) result.push(...pane.contents.filter((id) => this.contents.has(id)));
    }
    return result;
  }

  /**
   * 우클릭한 탭이 속한 패인 그룹만 가로/세로/바둑판으로 분할 정렬한다.
   * 첫 정렬에서는 현재 패인의 탭들을 임시 그룹으로 묶고, 이후 같은 그룹만 재정렬한다.
   */
  arrangePaneGroup(paneId: string, mode: 'row' | 'column' | 'grid', preferredContentId?: string): string {
    const scope = this.collectPaneGroupPaneIds(paneId);
    if (!scope) return 'This pane cannot be arranged as a dock group.';

    const contentIds = this.collectContentIdsFromPaneIds(scope.paneIds);
    if (contentIds.length <= 1) return 'This group has only one tab.';

    const preferredActiveContentId = contentIds.includes(preferredContentId ?? '')
      ? preferredContentId
      : contentIds.includes(scope.pane.activeContentId ?? '')
        ? scope.pane.activeContentId
        : contentIds[0];
    const oldHadArtifactPane = scope.paneIds.includes(this.artifactPaneId ?? '');

    const newPaneIds: string[] = [];
    let activePaneId: string | null = null;
    for (const contentId of contentIds) {
      const content = this.contents.get(contentId);
      if (!content) continue;
      const pane = new DockPane(scope.win.state, [], { group: scope.group }, this.nextPaneId++);
      this.panes.set(pane.id, pane);
      pane.addContent(content);
      newPaneIds.push(pane.id);
      if (contentId === preferredActiveContentId) activePaneId = pane.id;
    }
    if (newPaneIds.length <= 1) return 'This group has only one tab.';

    const newRoot =
      mode === 'row'
        ? this.buildEvenLinearTree(newPaneIds, 'row')
        : mode === 'column'
          ? this.buildEvenLinearTree(newPaneIds, 'column')
          : this.buildGridTree(newPaneIds);
    const inserted = { value: false };
    const nextRoot = this.replaceExactPaneSetSubtree(scope.win.layoutRoot, new Set(scope.paneIds), newRoot, inserted);
    if (!inserted.value || !nextRoot) {
      for (const newPaneId of newPaneIds) this.panes.delete(newPaneId);
      return 'This group cannot be arranged because it is no longer a contiguous dock group.';
    }
    scope.win.layoutRoot = nextRoot;

    for (const oldPaneId of scope.paneIds) this.panes.delete(oldPaneId);
    scope.win.panes = this.collectTreePanes(scope.win.layoutRoot);
    this.activePaneId = activePaneId ?? newPaneIds[0] ?? this.activePaneId;
    if (oldHadArtifactPane) this.artifactPaneId = this.activePaneId;
    this.notify();
    return mode === 'row'
      ? 'Group arranged horizontally.'
      : mode === 'column'
        ? 'Group arranged vertically.'
        : 'Group arranged as a grid.';
  }

  /** 우클릭한 탭이 속한 패인 그룹만 하나의 탭 그룹으로 다시 합친다. */
  mergePaneGroup(paneId: string, preferredContentId?: string): string {
    const scope = this.collectPaneGroupPaneIds(paneId);
    if (!scope) return 'This pane cannot be merged as a dock group.';

    const contentIds = this.collectContentIdsFromPaneIds(scope.paneIds);
    if (contentIds.length === 0) return 'This group has no tabs.';
    if (scope.paneIds.length === 1 && contentIds.length <= 1) return 'This group has only one tab.';

    const preferredActiveContentId = contentIds.includes(preferredContentId ?? '')
      ? preferredContentId
      : contentIds.includes(scope.pane.activeContentId ?? '')
        ? scope.pane.activeContentId
        : contentIds[0];
    const oldHadArtifactPane = scope.paneIds.includes(this.artifactPaneId ?? '');

    const merged = new DockPane(scope.win.state, [], { group: scope.group }, this.nextPaneId++);
    this.panes.set(merged.id, merged);
    for (const contentId of contentIds) {
      const content = this.contents.get(contentId);
      if (content) merged.addContent(content);
    }
    merged.activeContentHistory = merged.normalizeContentHistory([
      ...(preferredActiveContentId ? [preferredActiveContentId] : []),
      ...contentIds,
    ]);
    merged.activeContentId = merged.activeContentHistory[0] ?? null;

    const inserted = { value: false };
    const nextRoot = this.replaceExactPaneSetSubtree(
      scope.win.layoutRoot,
      new Set(scope.paneIds),
      this.makeLeaf(merged.id),
      inserted,
    );
    if (!inserted.value || !nextRoot) {
      this.panes.delete(merged.id);
      return 'This group cannot be merged because it is no longer a contiguous dock group.';
    }
    scope.win.layoutRoot = nextRoot;

    for (const oldPaneId of scope.paneIds) this.panes.delete(oldPaneId);
    scope.win.panes = this.collectTreePanes(scope.win.layoutRoot);
    this.activePaneId = merged.id;
    if (oldHadArtifactPane) this.artifactPaneId = merged.id;
    this.notify();
    return 'Group merged into one tab group.';
  }

  setPaneGroupSize(
    paneId: string,
    options: { widthPercent?: number; heightPercent?: number },
  ): DockPaneGroupSizeResult {
    const scope = this.collectPaneGroupPaneIds(paneId);
    if (!scope) {
      return {
        ok: false,
        message: 'This pane cannot be resized as a dock group.',
        paneId,
        paneIds: [],
      };
    }

    const paneIds = new Set(scope.paneIds);
    const normalizePercent = (value: unknown): number | null => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return null;
      return Math.max(5, Math.min(95, Math.round(numeric)));
    };

    const requestedWidth = options.widthPercent !== undefined;
    const requestedHeight = options.heightPercent !== undefined;
    if (!requestedWidth && !requestedHeight) {
      return {
        ok: false,
        message: 'No pane group size was requested.',
        paneId: scope.pane.id,
        paneIds: scope.paneIds,
      };
    }

    const normalizedWidthPercent = requestedWidth ? normalizePercent(options.widthPercent) : undefined;
    const normalizedHeightPercent = requestedHeight ? normalizePercent(options.heightPercent) : undefined;
    if (requestedWidth && normalizedWidthPercent == null) {
      return {
        ok: false,
        message: 'Invalid pane group width percentage.',
        paneId: scope.pane.id,
        paneIds: scope.paneIds,
      };
    }
    if (requestedHeight && normalizedHeightPercent == null) {
      return {
        ok: false,
        message: 'Invalid pane group height percentage.',
        paneId: scope.pane.id,
        paneIds: scope.paneIds,
      };
    }

    const widthPercent = normalizedWidthPercent ?? undefined;
    const heightPercent = normalizedHeightPercent ?? undefined;

    if (
      widthPercent !== undefined &&
      !this.setExactPaneSetSplitRatio(scope.win.layoutRoot, paneIds, 'row', widthPercent)
    ) {
      return {
        ok: false,
        message: 'This pane group cannot be resized horizontally because it is not an exact split branch.',
        paneId: scope.pane.id,
        paneIds: scope.paneIds,
      };
    }
    if (
      heightPercent !== undefined &&
      !this.setExactPaneSetSplitRatio(scope.win.layoutRoot, paneIds, 'column', heightPercent)
    ) {
      return {
        ok: false,
        message: 'This pane group cannot be resized vertically because it is not an exact split branch.',
        paneId: scope.pane.id,
        paneIds: scope.paneIds,
        widthPercent,
      };
    }

    this.notify();
    const parts = [
      widthPercent !== undefined ? `width=${widthPercent}%` : '',
      heightPercent !== undefined ? `height=${heightPercent}%` : '',
    ].filter(Boolean);
    return {
      ok: true,
      message: `Pane group size updated: ${parts.join(', ')}`,
      paneId: scope.pane.id,
      paneIds: scope.paneIds,
      widthPercent,
      heightPercent,
    };
  }

  arrangeWindowTabs(windowState: WindowState, mode: 'row' | 'column' | 'grid'): string {
    const win = this.windows.get(windowState);
    if (!win) return `Window ${windowState} is not available.`;
    if (!win.layoutRoot) win.layoutRoot = this.buildTreeFromPaneIds(win.panes, win.state);
    win.panes = win.layoutRoot ? this.collectTreePanes(win.layoutRoot) : win.panes.filter((id) => this.panes.has(id));

    const contentIds = this.collectContentIdsFromPaneIds(win.panes);
    if (contentIds.length <= 1) return `Window ${windowState} has only one tab.`;

    const activePane = this.activePaneId ? (this.panes.get(this.activePaneId) ?? null) : null;
    const preferredActiveContentId = contentIds.includes(activePane?.activeContentId ?? '')
      ? activePane?.activeContentId
      : contentIds[0];
    const oldHadArtifactPane = win.panes.includes(this.artifactPaneId ?? '');

    for (const paneId of [...win.panes]) this.panes.delete(paneId);
    win.panes = [];
    win.layoutRoot = null;

    const newPaneIds: string[] = [];
    let activePaneId: string | null = null;
    for (const contentId of contentIds) {
      const content = this.contents.get(contentId);
      if (!content) continue;
      const pane = new DockPane(windowState, [], { group: content.group }, this.nextPaneId++);
      this.panes.set(pane.id, pane);
      pane.addContent(content);
      newPaneIds.push(pane.id);
      if (contentId === preferredActiveContentId) activePaneId = pane.id;
    }
    if (newPaneIds.length <= 1) return `Window ${windowState} has only one tab.`;

    const newRoot =
      mode === 'row'
        ? this.buildEvenLinearTree(newPaneIds, 'row')
        : mode === 'column'
          ? this.buildEvenLinearTree(newPaneIds, 'column')
          : this.buildGridTree(newPaneIds);
    win.layoutRoot = newRoot;
    win.panes = this.collectTreePanes(newRoot);
    this.activePaneId = activePaneId ?? newPaneIds[0] ?? this.activePaneId;
    if (oldHadArtifactPane) this.artifactPaneId = this.activePaneId;
    this.notify();
    return mode === 'row'
      ? `Window ${windowState} arranged horizontally.`
      : mode === 'column'
        ? `Window ${windowState} arranged vertically.`
        : `Window ${windowState} arranged as a grid.`;
  }

  mergeWindowTabs(windowState: WindowState, preferredContentId?: string): string {
    const win = this.windows.get(windowState);
    if (!win) return `Window ${windowState} is not available.`;
    if (!win.layoutRoot) win.layoutRoot = this.buildTreeFromPaneIds(win.panes, win.state);
    win.panes = win.layoutRoot ? this.collectTreePanes(win.layoutRoot) : win.panes.filter((id) => this.panes.has(id));

    const contentIds = this.collectContentIdsFromPaneIds(win.panes);
    if (contentIds.length === 0) return `Window ${windowState} has no tabs.`;
    if (win.panes.length === 1 && contentIds.length <= 1) return `Window ${windowState} has only one tab.`;

    const activePane = this.activePaneId ? (this.panes.get(this.activePaneId) ?? null) : null;
    const preferredActiveContentId = contentIds.includes(preferredContentId ?? '')
      ? preferredContentId
      : contentIds.includes(activePane?.activeContentId ?? '')
        ? activePane?.activeContentId
        : contentIds[0];
    const oldHadArtifactPane = win.panes.includes(this.artifactPaneId ?? '');

    for (const paneId of [...win.panes]) this.panes.delete(paneId);
    win.panes = [];
    win.layoutRoot = null;

    const merged = new DockPane(windowState, [], {}, this.nextPaneId++);
    this.panes.set(merged.id, merged);
    for (const contentId of contentIds) {
      const content = this.contents.get(contentId);
      if (content) merged.addContent(content);
    }
    merged.activeContentHistory = merged.normalizeContentHistory([
      ...(preferredActiveContentId ? [preferredActiveContentId] : []),
      ...contentIds,
    ]);
    merged.activeContentId = merged.activeContentHistory[0] ?? null;
    this.activePaneId = merged.id;

    win.layoutRoot = this.makeLeaf(merged.id);
    win.panes = [merged.id];
    if (oldHadArtifactPane) this.artifactPaneId = merged.id;
    this.notify();
    return `Window ${windowState} merged into one tab group.`;
  }

  /**
   * Document 탭을 가로/세로/바둑판으로 분할 정렬.
   * 탭이 1개 이하면 no-op.
   */
  arrangeDocumentTabs(mode: 'row' | 'column' | 'grid'): void {
    this.arrangeWindowTabs('document', mode);
  }

  /** Document 내 모든 패인을 하나로 합치기 (탭 형태) */
  mergeAllDocumentTabs(): void {
    this.mergeWindowTabs('document');
  }
}
