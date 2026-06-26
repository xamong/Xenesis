import assert from 'node:assert/strict';
import test from 'node:test';
import { DockEngine } from './engine';

test('prioritizeSideWindow notifies only when the side window order changes', () => {
  let updateCount = 0;
  const engine = new DockEngine(() => {
    updateCount += 1;
  });

  engine.addContent({ id: 'bottom-pane', title: 'Bottom', state: 'bottom', html: '' });
  engine.addContent({ id: 'right-pane', title: 'Right', state: 'right', html: '' });

  updateCount = 0;
  engine.prioritizeSideWindow('right');
  assert.deepEqual(engine.getDockSideOrder(), ['right', 'bottom']);
  assert.equal(updateCount, 1);

  updateCount = 0;
  engine.prioritizeSideWindow('right');
  assert.deepEqual(engine.getDockSideOrder(), ['right', 'bottom']);
  assert.equal(updateCount, 0);
});
