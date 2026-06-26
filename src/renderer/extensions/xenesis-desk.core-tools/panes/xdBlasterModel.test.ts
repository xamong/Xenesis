import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyXdBlasterEvent,
  createXdBlasterState,
  parseXdBlasterMessage,
  tickXdBlasterState,
  XD_BLASTER_CLASS_STYLES,
  XD_BLASTER_STARTERS,
} from './xdBlasterModel';

test('uses Xenesis activity starter chips instead of legacy XaBlaster labels', () => {
  assert.deepEqual(
    XD_BLASTER_STARTERS.map((starter) => starter.label),
    ['XG', 'CR', 'TERM', 'DOCK', 'FILE', 'ERR'],
  );
  assert.equal(
    XD_BLASTER_STARTERS.some((starter) => ['KIS', 'SER', 'LNK', 'GET', 'SQL', 'DDL'].includes(starter.label)),
    false,
  );
});

test('parses Xenesis JSON blaster messages', () => {
  assert.deepEqual(
    parseXdBlasterMessage(JSON.stringify({ type: 'xd.blaster.start', name: 'order-api', className: 'greencircle' })),
    {
      type: 'start',
      name: 'order-api',
      className: 'greencircle',
      source: 'xenesis-json',
    },
  );

  assert.deepEqual(parseXdBlasterMessage(JSON.stringify({ type: 'xd.blaster.end', name: 'order-api' })), {
    type: 'end',
    name: 'order-api',
    source: 'xenesis-json',
  });
});

test('parses Xenesis text blaster messages', () => {
  assert.deepEqual(parseXdBlasterMessage('xd.blaster.init payment-worker redcircle'), {
    type: 'init',
    name: 'payment-worker',
    className: 'redcircle',
    source: 'xenesis-text',
  });

  assert.deepEqual(parseXdBlasterMessage('xd.blaster.hide payment-worker'), {
    type: 'hide',
    name: 'payment-worker',
    source: 'xenesis-text',
  });
});

test('keeps MONITOR format compatibility for legacy XaBlaster streams', () => {
  assert.deepEqual(parseXdBlasterMessage('MONITOR:KIS_START:task-1'), {
    type: 'start',
    name: 'task-1',
    className: 'greencircle',
    source: 'legacy-monitor',
  });
  assert.deepEqual(parseXdBlasterMessage('MONITOR:SER_END:task-1'), {
    type: 'end',
    name: 'task-1',
    source: 'legacy-monitor',
  });
  assert.deepEqual(parseXdBlasterMessage('MONITOR:BUBBLE_INIT:job-7:fuchsiacircle'), {
    type: 'init',
    name: 'job-7',
    className: 'fuchsiacircle',
    source: 'legacy-monitor',
  });
});

test('allocates a bubble from the right edge and moves it left', () => {
  const state = createXdBlasterState({ width: 320, height: 180, poolSize: 2, random: () => 0.5 });
  const next = applyXdBlasterEvent(state, { type: 'start', name: 'job-1', className: 'greencircle' });
  const bubble = next.bubbles.find((entry) => entry.name === 'job-1');

  assert.ok(bubble);
  assert.equal(bubble.state, 'active');
  assert.equal(bubble.className, 'greencircle');
  assert.equal(bubble.style.fill, XD_BLASTER_CLASS_STYLES.greencircle.fill);
  assert.equal(bubble.x, 280);
  assert.equal(bubble.y, 80);

  const moved = tickXdBlasterState(next);
  const movedBubble = moved.bubbles.find((entry) => entry.name === 'job-1');
  assert.equal(movedBubble?.x, 265);
});

test('hide/end marks a named bubble as hiding and shrinks it until idle', () => {
  const state = applyXdBlasterEvent(createXdBlasterState({ width: 320, height: 180, poolSize: 1, random: () => 0.5 }), {
    type: 'start',
    name: 'job-1',
    className: 'redcircle',
  });
  const hiding = applyXdBlasterEvent(state, { type: 'end', name: 'job-1' });
  assert.equal(hiding.bubbles[0]?.state, 'hiding');

  let ticked = hiding;
  for (let index = 0; index < 20; index += 1) ticked = tickXdBlasterState(ticked);

  assert.equal(ticked.bubbles[0]?.state, 'idle');
  assert.equal(ticked.bubbles[0]?.name, '');
  assert.equal(ticked.bubbles[0]?.radius, 0);
});

test('active bubbles become idle after they leave the visible area', () => {
  let state = applyXdBlasterEvent(createXdBlasterState({ width: 60, height: 80, poolSize: 1, random: () => 0.5 }), {
    type: 'start',
    name: 'short-job',
    className: 'greencircle',
  });

  for (let index = 0; index < 8; index += 1) state = tickXdBlasterState(state);

  assert.equal(state.bubbles[0]?.state, 'idle');
  assert.equal(state.activeCount, 0);
});

test('reset clears all allocated bubbles', () => {
  const state = applyXdBlasterEvent(createXdBlasterState({ width: 320, height: 180, poolSize: 2, random: () => 0.5 }), {
    type: 'start',
    name: 'job-1',
    className: 'bluecircle',
  });

  const reset = applyXdBlasterEvent(state, { type: 'reset' });

  assert.equal(
    reset.bubbles.every((bubble) => bubble.state === 'idle'),
    true,
  );
  assert.equal(reset.activeCount, 0);
});
