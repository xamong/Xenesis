import type { WindowBounds } from '../../shared/types';

export interface DetachScreenPoint {
  screenX: number;
  screenY: number;
}

export type DetachedWindowSize = Pick<WindowBounds, 'width' | 'height'>;

export const DETACHED_WINDOW_DEFAULT_SIZE: DetachedWindowSize = {
  width: 960,
  height: 680,
};

export const DETACHED_WINDOW_MIN_SIZE: DetachedWindowSize = {
  width: 480,
  height: 320,
};

const POINTER_OFFSET = 16;

function readFiniteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeDimension(value: unknown, min: number, fallback: number): number {
  const numeric = readFiniteNumber(value);
  if (numeric === null) return fallback;
  return Math.max(min, Math.round(numeric));
}

export function normalizeDetachedWindowSize(size?: Partial<DetachedWindowSize> | null): DetachedWindowSize {
  return {
    width: normalizeDimension(size?.width, DETACHED_WINDOW_MIN_SIZE.width, DETACHED_WINDOW_DEFAULT_SIZE.width),
    height: normalizeDimension(size?.height, DETACHED_WINDOW_MIN_SIZE.height, DETACHED_WINDOW_DEFAULT_SIZE.height),
  };
}

export function buildRequestedDetachedWindowBounds(
  dropPoint: DetachScreenPoint | null | undefined,
  rememberedSize?: Partial<DetachedWindowSize> | null,
): WindowBounds | undefined {
  const screenX = readFiniteNumber(dropPoint?.screenX);
  const screenY = readFiniteNumber(dropPoint?.screenY);
  if (screenX === null || screenY === null) return undefined;

  const size = normalizeDetachedWindowSize(rememberedSize);
  return {
    x: Math.round(screenX) + POINTER_OFFSET,
    y: Math.round(screenY) + POINTER_OFFSET,
    width: size.width,
    height: size.height,
  };
}
