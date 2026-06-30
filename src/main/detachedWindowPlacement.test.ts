import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DETACHED_WINDOW_DEFAULT_SIZE,
  DETACHED_WINDOW_MIN_SIZE,
  normalizeDetachedWindowBounds,
  resolveDetachedWindowPlacement,
} from './detachedWindowPlacement';

const displays = [
  { id: 1, workArea: { x: 0, y: 0, width: 1000, height: 800 } },
  { id: 2, workArea: { x: 1000, y: 0, width: 800, height: 600 } },
];

test('requested bounds outside the selected work area are clamped', () => {
  const placement = resolveDetachedWindowPlacement({
    requestedBounds: { x: 1750, y: 550, width: 960, height: 680 },
    rememberedBounds: { x: 32, y: 40, width: 700, height: 500 },
    displays,
  });

  assert.deepEqual(placement, {
    x: 1100,
    y: 100,
    width: 700,
    height: 500,
    minWidth: DETACHED_WINDOW_MIN_SIZE.width,
    minHeight: DETACHED_WINDOW_MIN_SIZE.height,
  });
});

test('multi-display placement chooses the display nearest the requested point', () => {
  const placement = resolveDetachedWindowPlacement({
    requestedBounds: { x: 1040, y: 40, width: 500, height: 400 },
    displays,
  });

  assert.deepEqual(placement, {
    x: 1040,
    y: 40,
    width: 500,
    height: 400,
    minWidth: DETACHED_WINDOW_MIN_SIZE.width,
    minHeight: DETACHED_WINDOW_MIN_SIZE.height,
  });
});

test('remembered bounds contribute size without forcing stale position', () => {
  const placement = resolveDetachedWindowPlacement({
    requestedBounds: { x: 120, y: 150, width: 960, height: 680 },
    rememberedBounds: { x: 2000, y: 900, width: 640, height: 480 },
    displays,
  });

  assert.deepEqual(placement, {
    x: 120,
    y: 150,
    width: 640,
    height: 480,
    minWidth: DETACHED_WINDOW_MIN_SIZE.width,
    minHeight: DETACHED_WINDOW_MIN_SIZE.height,
  });
});

test('missing requested bounds preserves default Electron placement semantics', () => {
  const placement = resolveDetachedWindowPlacement({
    rememberedBounds: { x: 200, y: 200, width: 640, height: 480 },
    displays,
  });

  assert.deepEqual(placement, {
    width: DETACHED_WINDOW_DEFAULT_SIZE.width,
    height: DETACHED_WINDOW_DEFAULT_SIZE.height,
    minWidth: DETACHED_WINDOW_MIN_SIZE.width,
    minHeight: DETACHED_WINDOW_MIN_SIZE.height,
  });
});

test('invalid detached bounds are rejected before they are remembered', () => {
  assert.equal(normalizeDetachedWindowBounds({ x: 0, y: 0, width: 40, height: Number.NaN }), null);
  assert.deepEqual(normalizeDetachedWindowBounds({ x: 5.4, y: 9.6, width: 960.4, height: 680.6 }), {
    x: 5,
    y: 10,
    width: 960,
    height: 681,
  });
});
