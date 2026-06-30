import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRequestedDetachedWindowBounds,
  DETACHED_WINDOW_DEFAULT_SIZE,
  DETACHED_WINDOW_MIN_SIZE,
  normalizeDetachedWindowSize,
} from './detachBounds';

test('drop point plus remembered size yields requested bounds near the pointer', () => {
  const result = buildRequestedDetachedWindowBounds(
    { screenX: 1200, screenY: 700 },
    { width: 1100, height: 750 },
  );

  assert.deepEqual(result, {
    x: 1216,
    y: 716,
    width: 1100,
    height: 750,
  });
});

test('missing remembered size falls back to the default detached window size', () => {
  assert.deepEqual(buildRequestedDetachedWindowBounds({ screenX: 10, screenY: 20 }), {
    x: 26,
    y: 36,
    width: DETACHED_WINDOW_DEFAULT_SIZE.width,
    height: DETACHED_WINDOW_DEFAULT_SIZE.height,
  });
});

test('invalid or too-small remembered size is normalized to safe dimensions', () => {
  assert.deepEqual(normalizeDetachedWindowSize({ width: 120, height: Number.NaN }), {
    width: DETACHED_WINDOW_MIN_SIZE.width,
    height: DETACHED_WINDOW_DEFAULT_SIZE.height,
  });
});

test('missing drop point omits requested bounds for non-pointer detach callers', () => {
  assert.equal(buildRequestedDetachedWindowBounds(null, { width: 800, height: 600 }), undefined);
});
