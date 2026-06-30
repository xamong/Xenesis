import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDragGhostPosition } from './dragGhostPosition';

test('keeps the drag ghost inside the viewport when the pointer leaves the window', () => {
  assert.deepEqual(
    resolveDragGhostPosition({
      clientX: 900,
      clientY: -30,
      viewportWidth: 800,
      viewportHeight: 600,
      ghostWidth: 180,
      ghostHeight: 32,
    }),
    { left: 612, top: 8 },
  );

  assert.deepEqual(
    resolveDragGhostPosition({
      clientX: -50,
      clientY: 620,
      viewportWidth: 800,
      viewportHeight: 600,
      ghostWidth: 120,
      ghostHeight: 28,
    }),
    { left: 8, top: 564 },
  );
});
