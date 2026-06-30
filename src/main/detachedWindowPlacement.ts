import type { WindowBounds } from '../shared/types';

export type DetachedWindowSize = Pick<WindowBounds, 'width' | 'height'>;

export interface DisplayWorkArea {
  id?: number;
  workArea: WindowBounds;
}

export type DetachedWindowPlacement = Pick<WindowBounds, 'width' | 'height'> &
  Partial<Pick<WindowBounds, 'x' | 'y'>> & {
    minWidth: number;
    minHeight: number;
  };

export interface ResolveDetachedWindowPlacementOptions {
  requestedBounds?: WindowBounds | null;
  rememberedBounds?: WindowBounds | null;
  displays: DisplayWorkArea[];
}

export const DETACHED_WINDOW_DEFAULT_SIZE: DetachedWindowSize = {
  width: 960,
  height: 680,
};

export const DETACHED_WINDOW_MIN_SIZE: DetachedWindowSize = {
  width: 480,
  height: 320,
};

function readFiniteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function clampNumber(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

function normalizeDimension(value: unknown, min: number, fallback: number): number {
  const numeric = readFiniteNumber(value);
  if (numeric === null) return fallback;
  return Math.max(min, Math.round(numeric));
}

function normalizeSize(
  size: Partial<DetachedWindowSize> | null | undefined,
  fallback: DetachedWindowSize,
): DetachedWindowSize {
  return {
    width: normalizeDimension(size?.width, DETACHED_WINDOW_MIN_SIZE.width, fallback.width),
    height: normalizeDimension(size?.height, DETACHED_WINDOW_MIN_SIZE.height, fallback.height),
  };
}

export function normalizeDetachedWindowBounds(rawBounds: unknown): WindowBounds | null {
  if (!rawBounds || typeof rawBounds !== 'object' || Array.isArray(rawBounds)) return null;

  const bounds = rawBounds as Partial<WindowBounds>;
  const x = readFiniteNumber(bounds.x);
  const y = readFiniteNumber(bounds.y);
  const width = readFiniteNumber(bounds.width);
  const height = readFiniteNumber(bounds.height);

  if (x === null || y === null || width === null || height === null) return null;
  if (width < DETACHED_WINDOW_MIN_SIZE.width || height < DETACHED_WINDOW_MIN_SIZE.height) return null;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function getDisplayCenter(display: DisplayWorkArea): { x: number; y: number } {
  return {
    x: display.workArea.x + display.workArea.width / 2,
    y: display.workArea.y + display.workArea.height / 2,
  };
}

function distanceSquared(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function getNearestDisplay(displays: DisplayWorkArea[], point: { x: number; y: number }): DisplayWorkArea {
  if (displays.length === 0) {
    return {
      workArea: {
        x: 0,
        y: 0,
        width: DETACHED_WINDOW_DEFAULT_SIZE.width,
        height: DETACHED_WINDOW_DEFAULT_SIZE.height,
      },
    };
  }

  return displays.reduce((best, display) => {
    const bestDistance = distanceSquared(point, getDisplayCenter(best));
    const nextDistance = distanceSquared(point, getDisplayCenter(display));
    return nextDistance < bestDistance ? display : best;
  });
}

export function resolveDetachedWindowPlacement({
  requestedBounds,
  rememberedBounds,
  displays,
}: ResolveDetachedWindowPlacementOptions): DetachedWindowPlacement {
  const normalizedRequested = normalizeDetachedWindowBounds(requestedBounds);

  if (!normalizedRequested) {
    return {
      width: DETACHED_WINDOW_DEFAULT_SIZE.width,
      height: DETACHED_WINDOW_DEFAULT_SIZE.height,
      minWidth: DETACHED_WINDOW_MIN_SIZE.width,
      minHeight: DETACHED_WINDOW_MIN_SIZE.height,
    };
  }

  const requestedSize = normalizeSize(normalizedRequested, DETACHED_WINDOW_DEFAULT_SIZE);
  const size = rememberedBounds ? normalizeSize(rememberedBounds, requestedSize) : requestedSize;
  const display = getNearestDisplay(displays, { x: normalizedRequested.x, y: normalizedRequested.y });
  const area = display.workArea;
  const width = Math.min(size.width, Math.max(1, area.width));
  const height = Math.min(size.height, Math.max(1, area.height));

  return {
    x: clampNumber(normalizedRequested.x, area.x, area.x + Math.max(0, area.width - width)),
    y: clampNumber(normalizedRequested.y, area.y, area.y + Math.max(0, area.height - height)),
    width,
    height,
    minWidth: DETACHED_WINDOW_MIN_SIZE.width,
    minHeight: DETACHED_WINDOW_MIN_SIZE.height,
  };
}
