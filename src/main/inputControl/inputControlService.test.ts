import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExternalAppActionResult } from '../../shared/externalAppControl';
import { createInputControlService } from './inputControlService';

const DESKTOP_APP_SUPPORTED_ACTIONS = [
  'click',
  'double_click',
  'triple_click',
  'middle_click',
  'right_click',
  'move',
  'mouse_down',
  'mouse_up',
  'drag_and_drop',
  'type',
  'hotkey',
  'wait',
  'take_screenshot',
];

function statusResult(): ExternalAppActionResult {
  return {
    ok: true,
    action: 'status',
    approvalLevel: 'low',
    controlEnabled: true,
    profiles: [
      {
        id: 'notepad',
        label: 'Notepad',
        enabled: true,
        approvalLevel: 'medium',
        allowedActions: [
          'launch',
          'focus',
          'resize',
          'typeText',
          'hotkey',
          'close',
          'status',
          'find',
          'click',
          'doubleClick',
          'tripleClick',
          'middleClick',
          'rightClick',
          'move',
          'mouseDown',
          'mouseUp',
          'dragAndDrop',
          'screenshot',
        ],
      },
      {
        id: 'disabled',
        label: 'Disabled App',
        enabled: false,
        approvalLevel: 'high',
        allowedActions: ['status', 'find'],
      },
    ],
    windows: [],
    message: 'status ok',
  };
}

test('targets exposes enabled registered app profiles with desktop support metadata', async () => {
  const service = createInputControlService({
    runExternalAppAction: async (args) => {
      assert.deepEqual(args, { action: 'status' });
      return statusResult();
    },
  });

  const result = await service.call('xd.input.targets', {});

  assert.equal(result.ok, true);
  assert.deepEqual(result.result, {
    targets: [
      {
        environment: 'desktop',
        target: { kind: 'app', appId: 'notepad' },
        label: 'Notepad',
        runSupport: 'partial',
        supportedActions: DESKTOP_APP_SUPPORTED_ACTIONS,
      },
    ],
  });
});

test('describe returns registered app profile and window readback', async () => {
  const calls: unknown[] = [];
  const service = createInputControlService({
    runExternalAppAction: async (args) => {
      calls.push(args);
      if ((args as { action?: string }).action === 'status' && (args as { appId?: string }).appId === 'notepad') {
        return {
          ok: true,
          action: 'status',
          approvalLevel: 'low',
          windows: [
            {
              windowId: '1001',
              title: 'Untitled - Notepad',
              bounds: { x: 10, y: 20, width: 640, height: 480 },
              isForeground: true,
            },
          ],
          message: 'status ok',
        };
      }
      return statusResult();
    },
  });

  const result = await service.call('xd.input.describe', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad' },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ action: 'status', appId: 'notepad' }]);
  assert.deepEqual(result.result, {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad' },
    runSupport: 'partial',
    supportedActions: DESKTOP_APP_SUPPORTED_ACTIONS,
    windows: [
      {
        windowId: '1001',
        title: 'Untitled - Notepad',
        bounds: { x: 10, y: 20, width: 640, height: 480 },
        isForeground: true,
      },
    ],
  });
});

test('screenshot returns honest unsupported result', async () => {
  const service = createInputControlService({ runExternalAppAction: async () => statusResult() });
  const result = await service.call('xd.input.screenshot', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Input screenshot is not available for this target.');
  assert.deepEqual(result.result, { unsupported: true });
});

test('run maps type, hotkey, and wait for registered app targets', async () => {
  const calls: unknown[] = [];
  const waits: number[] = [];
  const service = createInputControlService({
    runExternalAppAction: async (args) => {
      calls.push(args);
      if ((args as { action?: string }).action === 'status') return statusResult();
      return {
        ok: true,
        action: (args as { action: ExternalAppActionResult['action'] }).action,
        approvalLevel: 'medium',
        windows: [],
        message: 'ok',
      };
    },
    wait: async (ms) => {
      waits.push(ms);
    },
  });

  const result = await service.call('xd.input.run', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad' },
    actions: [
      { type: 'type', text: 'hello', intent: 'write' },
      { type: 'hotkey', keys: ['CTRL', 'A'], intent: 'select' },
      { type: 'wait', seconds: 0.25 },
    ],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    { action: 'status' },
    { action: 'typeText', appId: 'notepad', text: 'hello' },
    { action: 'hotkey', appId: 'notepad', keys: ['CTRL', 'A'] },
  ]);
  assert.deepEqual(waits, [250]);
  assert.deepEqual((result.result as { actions: unknown[] }).actions, [
    { index: 0, type: 'type', ok: true, intent: 'write', adapterPath: 'xd.apps.typeText' },
    { index: 1, type: 'hotkey', ok: true, intent: 'select', adapterPath: 'xd.apps.hotkey' },
    { index: 2, type: 'wait', ok: true },
  ]);
});

test('run maps desktop pointer, drag, and screenshot actions through registered app adapter', async () => {
  const calls: unknown[] = [];
  const service = createInputControlService({
    runExternalAppAction: async (args) => {
      calls.push(args);
      const action = (args as { action?: ExternalAppActionResult['action'] }).action || 'status';
      if (action === 'status' && (args as { appId?: string }).appId === 'notepad') {
        return {
          ok: true,
          action,
          approvalLevel: 'low',
          windows: [
            {
              windowId: '1001',
              title: 'Untitled - Notepad',
              bounds: { x: 10, y: 20, width: 800, height: 600 },
            },
          ],
          message: 'status ok',
        };
      }
      if (action === 'status') return statusResult();
      return {
        ok: true,
        action,
        approvalLevel: 'medium',
        windows: [],
        message: `${action} ok`,
      };
    },
  });

  const result = await service.call('xd.input.run', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad', windowId: '1001' },
    actions: [
      { type: 'click', x: 500, y: 500, intent: 'click editor' },
      { type: 'double_click', x: 0, y: 0, intent: 'double click top-left' },
      { type: 'triple_click', x: 250, y: 250, intent: 'triple click upper-left quarter' },
      { type: 'middle_click', x: 750, y: 750, intent: 'middle click lower-right quarter' },
      { type: 'right_click', x: 999, y: 999, intent: 'right click bottom-right' },
      { type: 'move', x: 250, y: 250, intent: 'move pointer' },
      { type: 'mouse_down', x: 100, y: 200, intent: 'press mouse' },
      { type: 'mouse_up', x: 101, y: 201, intent: 'release mouse' },
      { type: 'drag_and_drop', start_x: 0, start_y: 0, end_x: 999, end_y: 999, intent: 'drag window content' },
      { type: 'take_screenshot', intent: 'capture window' },
    ],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    { action: 'status' },
    { action: 'status', appId: 'notepad', windowId: '1001' },
    { action: 'click', appId: 'notepad', windowId: '1001', x: 410, y: 320 },
    { action: 'doubleClick', appId: 'notepad', windowId: '1001', x: 10, y: 20 },
    { action: 'tripleClick', appId: 'notepad', windowId: '1001', x: 210, y: 170 },
    { action: 'middleClick', appId: 'notepad', windowId: '1001', x: 610, y: 470 },
    { action: 'rightClick', appId: 'notepad', windowId: '1001', x: 809, y: 619 },
    { action: 'move', appId: 'notepad', windowId: '1001', x: 210, y: 170 },
    { action: 'mouseDown', appId: 'notepad', windowId: '1001', x: 90, y: 140 },
    { action: 'mouseUp', appId: 'notepad', windowId: '1001', x: 91, y: 141 },
    {
      action: 'dragAndDrop',
      appId: 'notepad',
      windowId: '1001',
      startX: 10,
      startY: 20,
      endX: 809,
      endY: 619,
    },
    { action: 'screenshot', appId: 'notepad', windowId: '1001' },
  ]);
  assert.deepEqual((result.result as { actions: unknown[] }).actions, [
    { index: 0, type: 'click', ok: true, intent: 'click editor', adapterPath: 'xd.apps.click' },
    { index: 1, type: 'double_click', ok: true, intent: 'double click top-left', adapterPath: 'xd.apps.doubleClick' },
    {
      index: 2,
      type: 'triple_click',
      ok: true,
      intent: 'triple click upper-left quarter',
      adapterPath: 'xd.apps.tripleClick',
    },
    {
      index: 3,
      type: 'middle_click',
      ok: true,
      intent: 'middle click lower-right quarter',
      adapterPath: 'xd.apps.middleClick',
    },
    { index: 4, type: 'right_click', ok: true, intent: 'right click bottom-right', adapterPath: 'xd.apps.rightClick' },
    { index: 5, type: 'move', ok: true, intent: 'move pointer', adapterPath: 'xd.apps.move' },
    { index: 6, type: 'mouse_down', ok: true, intent: 'press mouse', adapterPath: 'xd.apps.mouseDown' },
    { index: 7, type: 'mouse_up', ok: true, intent: 'release mouse', adapterPath: 'xd.apps.mouseUp' },
    { index: 8, type: 'drag_and_drop', ok: true, intent: 'drag window content', adapterPath: 'xd.apps.dragAndDrop' },
    { index: 9, type: 'take_screenshot', ok: true, intent: 'capture window', adapterPath: 'xd.apps.screenshot' },
  ]);
});

test('run rejects desktop pointer actions when target window bounds are unavailable', async () => {
  const calls: unknown[] = [];
  const service = createInputControlService({
    runExternalAppAction: async (args) => {
      calls.push(args);
      if ((args as { action?: string }).action === 'status' && (args as { appId?: string }).appId === 'notepad') {
        return {
          ok: true,
          action: 'status',
          approvalLevel: 'low',
          windows: [{ windowId: '1001', title: 'Untitled - Notepad' }],
          message: 'status ok',
        };
      }
      return statusResult();
    },
  });

  const result = await service.call('xd.input.run', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad', windowId: '1001' },
    actions: [{ type: 'click', x: 500, y: 500, intent: 'click editor' }],
  });

  assert.equal(result.ok, false);
  assert.match(result.error || '', /Desktop pointer input requires target window bounds/i);
  assert.deepEqual(calls, [{ action: 'status' }, { action: 'status', appId: 'notepad', windowId: '1001' }]);
});

test('run rejects unregistered app targets before adapter action execution', async () => {
  const calls: unknown[] = [];
  const service = createInputControlService({
    runExternalAppAction: async (args) => {
      calls.push(args);
      return statusResult();
    },
  });

  const result = await service.call('xd.input.run', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'missing' },
    actions: [{ type: 'type', text: 'hello' }],
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'Registered app target is not available: missing');
  assert.deepEqual(calls, [{ action: 'status' }]);
});

test('run blocks secret-shaped text and dangerous hotkeys', async () => {
  const service = createInputControlService({ runExternalAppAction: async () => statusResult() });

  const secret = await service.call('xd.input.run', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad' },
    actions: [{ type: 'type', text: 'OPENAI_API_KEY=sk-secret' }],
  });
  assert.equal(secret.ok, false);
  assert.equal(secret.error, 'Input text looks like a secret and was not sent.');

  const hotkey = await service.call('xd.input.run', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad' },
    actions: [{ type: 'hotkey', keys: ['Win', 'L'] }],
  });
  assert.equal(hotkey.ok, false);
  assert.equal(hotkey.error, 'Input hotkey is blocked by policy.');
});

test('run stops on unsupported desktop app action unless continueOnError is true', async () => {
  const service = createInputControlService({ runExternalAppAction: async () => statusResult() });

  const stopped = await service.call('xd.input.run', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad' },
    actions: [
      { type: 'wait', seconds: 0 },
      { type: 'press_key', key: 'Enter' },
      { type: 'wait', seconds: 0 },
    ],
  });

  assert.equal(stopped.ok, false);
  assert.equal(stopped.error, 'Input action is not supported for this target.');
  assert.equal((stopped.result as { failedIndex?: number }).failedIndex, 1);
  assert.equal((stopped.result as { partialResults: unknown[] }).partialResults.length, 2);

  const continued = await service.call('xd.input.run', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad' },
    actions: [
      { type: 'wait', seconds: 0 },
      { type: 'press_key', key: 'Enter' },
      { type: 'wait', seconds: 0 },
    ],
    continueOnError: true,
  });

  assert.equal(continued.ok, false);
  assert.equal((continued.result as { failedIndex?: number }).failedIndex, 1);
  assert.equal((continued.result as { partialResults: unknown[] }).partialResults.length, 3);
});
