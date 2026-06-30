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

  const status = await callDeskBridgeCapability(api, {
    path: 'xd.apps.status',
    args: { appId: 'notepad' },
    source: 'xenesis',
  });

  assert.equal(status.ok, true);
  assert.deepEqual(calls[1], { appId: 'notepad', action: 'status' });
});
