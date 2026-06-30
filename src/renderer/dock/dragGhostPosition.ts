export interface DragGhostPositionInput {
  clientX: number;
  clientY: number;
  viewportWidth: number;
  viewportHeight: number;
  ghostWidth?: number;
  ghostHeight?: number;
  offset?: number;
  margin?: number;
}

export interface DragGhostPosition {
  left: number;
  top: number;
}

const DEFAULT_OFFSET = 12;
const DEFAULT_MARGIN = 8;

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function resolveDragGhostPosition(input: DragGhostPositionInput): DragGhostPosition {
  const margin = Math.max(0, finiteOr(input.margin, DEFAULT_MARGIN));
  const offset = finiteOr(input.offset, DEFAULT_OFFSET);
  const viewportWidth = Math.max(0, finiteOr(input.viewportWidth, 0));
  const viewportHeight = Math.max(0, finiteOr(input.viewportHeight, 0));
  const ghostWidth = Math.max(0, finiteOr(input.ghostWidth, 0));
  const ghostHeight = Math.max(0, finiteOr(input.ghostHeight, 0));

  return {
    left: clamp(finiteOr(input.clientX, 0) + offset, margin, viewportWidth - ghostWidth - margin),
    top: clamp(finiteOr(input.clientY, 0) + offset, margin, viewportHeight - ghostHeight - margin),
  };
}
