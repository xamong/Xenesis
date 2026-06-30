export type DockDragGhostMode = 'default' | 'detach' | 'reattach' | 'merge';

export interface DockDragGhostOverlayPayload {
  label: string;
  mode: DockDragGhostMode;
  screenX: number;
  screenY: number;
}

export interface DockDragGhostWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DockDragGhostOverlayBoundsInput {
  screenX: number;
  screenY: number;
  workArea: DockDragGhostWorkArea;
  overlayWidth?: number;
  overlayHeight?: number;
  offset?: number;
  margin?: number;
}

export interface DockDragGhostOverlayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DOCK_DRAG_GHOST_OVERLAY_SIZE = {
  width: 280,
  height: 36,
} as const;

const DEFAULT_OFFSET = 12;
const DEFAULT_MARGIN = 8;

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function normalizeDockDragGhostMode(mode: unknown): DockDragGhostMode {
  return mode === 'detach' || mode === 'reattach' || mode === 'merge' ? mode : 'default';
}

export function resolveDockDragGhostOverlayBounds(input: DockDragGhostOverlayBoundsInput): DockDragGhostOverlayBounds {
  const width = Math.max(1, finiteOr(input.overlayWidth, DOCK_DRAG_GHOST_OVERLAY_SIZE.width));
  const height = Math.max(1, finiteOr(input.overlayHeight, DOCK_DRAG_GHOST_OVERLAY_SIZE.height));
  const offset = finiteOr(input.offset, DEFAULT_OFFSET);
  const margin = Math.max(0, finiteOr(input.margin, DEFAULT_MARGIN));
  const workArea = input.workArea;

  const minX = workArea.x + margin;
  const minY = workArea.y + margin;
  const maxX = workArea.x + workArea.width - width - margin;
  const maxY = workArea.y + workArea.height - height - margin;

  return {
    x: Math.round(clamp(finiteOr(input.screenX, workArea.x) + offset, minX, maxX)),
    y: Math.round(clamp(finiteOr(input.screenY, workArea.y) + offset, minY, maxY)),
    width,
    height,
  };
}
