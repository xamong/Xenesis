import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDockDragGhostOverlayBounds } from './dockDragGhost';

test('positions the native drag ghost from global screen coordinates', () => {
  assert.deepEqual(
    resolveDockDragGhostOverlayBounds({
      screenX: 2200,
      screenY: 640,
      workArea: { x: 1920, y: 0, width: 1920, height: 1040 },
      overlayWidth: 280,
      overlayHeight: 36,
    }),
    { x: 2212, y: 652, width: 280, height: 36 },
  );
});

test('keeps the native drag ghost inside the selected display work area', () => {
  assert.deepEqual(
    resolveDockDragGhostOverlayBounds({
      screenX: 3830,
      screenY: 1035,
      workArea: { x: 1920, y: 0, width: 1920, height: 1040 },
      overlayWidth: 280,
      overlayHeight: 36,
    }),
    { x: 3552, y: 996, width: 280, height: 36 },
  );
});
