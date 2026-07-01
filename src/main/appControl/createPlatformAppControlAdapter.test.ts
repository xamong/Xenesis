import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExternalAppActionResult } from '../../shared/externalAppControl';
import type { AppControlAdapter } from './appControlAdapter';
import { createPlatformAppControlAdapter } from './createPlatformAppControlAdapter';

function okResult(action: ExternalAppActionResult['action']): ExternalAppActionResult {
  return {
    ok: true,
    action,
    approvalLevel: 'medium',
    windows: [],
    message: `${action} ok`,
  };
}

function createStubAdapter(): AppControlAdapter {
  return {
    launch: async () => okResult('launch'),
    find: async () => okResult('find'),
    status: async () => okResult('status'),
    focus: async () => okResult('focus'),
    resize: async () => okResult('resize'),
    typeText: async () => okResult('typeText'),
    hotkey: async () => okResult('hotkey'),
    close: async () => okResult('close'),
    click: async () => okResult('click'),
    doubleClick: async () => okResult('doubleClick'),
    tripleClick: async () => okResult('tripleClick'),
    middleClick: async () => okResult('middleClick'),
    rightClick: async () => okResult('rightClick'),
    move: async () => okResult('move'),
    mouseDown: async () => okResult('mouseDown'),
    mouseUp: async () => okResult('mouseUp'),
    dragAndDrop: async () => okResult('dragAndDrop'),
    screenshot: async () => okResult('screenshot'),
    inspect: async () => okResult('inspect'),
    elementFromPoint: async () => okResult('elementFromPoint'),
    tree: async () => okResult('tree'),
    menuExplore: async () => okResult('menuExplore'),
    highlight: async () => okResult('highlight'),
    captureElement: async () => okResult('captureElement'),
  };
}

test('platform app-control factory uses the Windows adapter on win32', async () => {
  const adapter = createPlatformAppControlAdapter({
    platform: 'win32',
    createWindowsAdapter: createStubAdapter,
  });

  const result = await adapter.status({ executable: 'notepad.exe' });

  assert.equal(result.ok, true);
  assert.equal(result.action, 'status');
});

test('platform app-control factory returns stable provider_unavailable responses on unsupported platforms', async () => {
  const adapter = createPlatformAppControlAdapter({
    platform: 'linux',
    createWindowsAdapter: createStubAdapter,
  });

  const result = await adapter.status({ executable: 'gedit' });

  assert.equal(result.ok, false);
  assert.equal(result.action, 'status');
  assert.equal(result.code, 'provider_unavailable');
  assert.match(result.error || '', /not available on linux/i);
});

test('platform app-control factory routes darwin through the macOS adapter', async () => {
  const adapter = createPlatformAppControlAdapter({
    platform: 'darwin',
    createWindowsAdapter: createStubAdapter,
  });

  const result = await adapter.inspect({ executable: '/Applications/TextEdit.app' });

  assert.equal(result.ok, false);
  assert.equal(result.action, 'inspect');
  assert.equal(result.code, 'host_not_found');
  assert.match(result.error || '', /macOS control host executable was not found/i);
});
