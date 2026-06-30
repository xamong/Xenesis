import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
  listDeskBridgeCapabilities,
} from './deskBridgeCapabilities';

test('external app capabilities are registered with approval metadata', () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));

  for (const path of [
    'xd.apps',
    'xd.apps.launch',
    'xd.apps.find',
    'xd.apps.focus',
    'xd.apps.resize',
    'xd.apps.typeText',
    'xd.apps.hotkey',
    'xd.apps.close',
    'xd.apps.status',
  ]) {
    assert.equal(paths.has(path), true, `${path} should be registered`);
  }

  assert.equal(findDeskBridgeCapability('xd.apps.status')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.apps.launch')?.approval, 'when-external');
  assert.equal(findDeskBridgeCapability('xd.apps.close')?.approval, 'when-external');
  assert.equal(findDeskBridgeCapability('xd.apps.typeText')?.permission, 'execute');
});

test('external app capabilities dispatch to the adapter with normalized action names', async () => {
  const calls: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    runExternalAppAction: (args) => {
      calls.push(args);
      return {
        ok: true,
        action: (args as { action: string }).action,
        appId: (args as { appId?: string }).appId,
        approvalLevel: 'low',
        windows: [],
        message: 'ok',
      };
    },
  };

  const blocked = await callDeskBridgeCapability(api, {
    path: 'xd.apps.launch',
    args: { appId: 'notepad' },
    source: 'xenesis',
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.approvalRequired, true);
  assert.equal(calls.length, 0);

  const launched = await callDeskBridgeCapability(api, {
    path: 'xd.apps.launch',
    args: { appId: 'notepad' },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(launched.ok, true);
  assert.deepEqual(calls[0], { appId: 'notepad', action: 'launch' });

  const closeBlocked = await callDeskBridgeCapability(api, {
    path: 'xd.apps.close',
    args: { appId: 'notepad' },
    source: 'xenesis',
  });

  assert.equal(closeBlocked.ok, false);
  assert.equal(closeBlocked.approvalRequired, true);
  assert.equal(calls.length, 1);

  const typeBlocked = await callDeskBridgeCapability(api, {
    path: 'xd.apps.typeText',
    args: { appId: 'notepad', text: 'hello' },
    source: 'xenesis',
  });

  assert.equal(typeBlocked.ok, false);
  assert.equal(typeBlocked.approvalRequired, true);
  assert.equal(calls.length, 1);

  const hotkeyBlocked = await callDeskBridgeCapability(api, {
    path: 'xd.apps.hotkey',
    args: { appId: 'notepad', keys: ['Control', 'S'] },
    source: 'xenesis',
  });

  assert.equal(hotkeyBlocked.ok, false);
  assert.equal(hotkeyBlocked.approvalRequired, true);
  assert.equal(calls.length, 1);

  const status = await callDeskBridgeCapability(api, {
    path: 'xd.apps.status',
    args: { appId: 'notepad' },
    source: 'xenesis',
  });

  assert.equal(status.ok, true);
  assert.deepEqual(calls[1], { appId: 'notepad', action: 'status' });
});

test('external app profile status remains read-only', () => {
  const status = findDeskBridgeCapability('xd.apps.status');

  assert.equal(status?.permission, 'read');
  assert.equal(status?.approval, 'never');
  assert.match(status?.description || '', /profile readback/i);
  assert.deepEqual(Object.keys((status?.schema?.properties as Record<string, unknown>) || {}).sort(), [
    'appId',
    'path',
    'processName',
    'titleContains',
    'windowId',
  ]);
});
