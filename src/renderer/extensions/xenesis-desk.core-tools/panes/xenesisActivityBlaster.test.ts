import assert from 'node:assert/strict';
import test from 'node:test';

import { createXdBlasterEventsForDeskActionActivity, xdBlasterClassForDeskPath } from './xenesisActivityBlaster';

test('maps Desk action paths to stable XD Blaster colors by subsystem', () => {
  assert.equal(xdBlasterClassForDeskPath('xd.terminals.run'), 'bluecircle');
  assert.equal(xdBlasterClassForDeskPath('xd.dock.arrangeGrid'), 'fuchsiacircle');
  assert.equal(xdBlasterClassForDeskPath('xd.files.open'), 'yellowcircle');
  assert.equal(xdBlasterClassForDeskPath('xd.tools.core.xdBlaster.open'), 'greencircle');
  assert.equal(xdBlasterClassForDeskPath('xd.automation.workflow.run'), 'whitecircle');
  assert.equal(xdBlasterClassForDeskPath('xd.xenesis.runs.start'), 'limecircle');
});

test('creates start and completion XD Blaster messages for Desk action activity', () => {
  assert.deepEqual(
    createXdBlasterEventsForDeskActionActivity({
      phase: 'start',
      action: { id: 'open-terminal', path: 'xd.terminals.run', args: {}, approved: true },
    }),
    [
      {
        type: 'start',
        name: 'desk:open-terminal',
        className: 'bluecircle',
        source: 'xenesis-activity',
      },
    ],
  );

  assert.deepEqual(
    createXdBlasterEventsForDeskActionActivity({
      phase: 'success',
      action: { id: 'open-terminal', path: 'xd.terminals.run', args: {}, approved: true },
      result: { id: 'open-terminal', path: 'xd.terminals.run', args: {}, approved: true, ok: true },
    }),
    [
      {
        type: 'end',
        name: 'desk:open-terminal',
        source: 'xenesis-activity',
      },
    ],
  );
});

test('creates a red error pulse and hides the original bubble for failed Desk actions', () => {
  assert.deepEqual(
    createXdBlasterEventsForDeskActionActivity({
      phase: 'failure',
      action: { id: 'danger', path: 'xd.files.write', args: {}, approved: true },
      error: 'write failed',
    }),
    [
      {
        type: 'hide',
        name: 'desk:danger',
        source: 'xenesis-activity',
      },
      {
        type: 'start',
        name: 'desk:danger:error',
        className: 'redcircle',
        source: 'xenesis-activity',
      },
    ],
  );
});
