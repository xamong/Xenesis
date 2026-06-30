import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExternalAppActionResult } from '../../shared/externalAppControl';
import { createInputControlService } from './inputControlService';

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
        allowedActions: ['launch', 'focus', 'resize', 'typeText', 'hotkey', 'close', 'status', 'find'],
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

test('targets exposes enabled registered app profiles with first-slice support metadata', async () => {
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
        supportedActions: ['type', 'hotkey', 'wait'],
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
    supportedActions: ['type', 'hotkey', 'wait'],
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

test('run stops on unsupported action unless continueOnError is true', async () => {
  const service = createInputControlService({ runExternalAppAction: async () => statusResult() });

  const stopped = await service.call('xd.input.run', {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad' },
    actions: [
      { type: 'wait', seconds: 0 },
      { type: 'click', x: 500, y: 500 },
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
      { type: 'click', x: 500, y: 500 },
      { type: 'wait', seconds: 0 },
    ],
    continueOnError: true,
  });

  assert.equal(continued.ok, false);
  assert.equal((continued.result as { failedIndex?: number }).failedIndex, 1);
  assert.equal((continued.result as { partialResults: unknown[] }).partialResults.length, 3);
});
