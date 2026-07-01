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
    'xd.apps.status',
    'xd.apps.inspect',
    'xd.apps.elementFromPoint',
    'xd.apps.tree',
    'xd.apps.menuExplore',
    'xd.apps.highlight',
    'xd.apps.captureElement',
    'xd.apps.launch',
    'xd.apps.find',
    'xd.apps.focus',
    'xd.apps.resize',
    'xd.apps.typeText',
    'xd.apps.hotkey',
    'xd.apps.click',
    'xd.apps.doubleClick',
    'xd.apps.tripleClick',
    'xd.apps.middleClick',
    'xd.apps.rightClick',
    'xd.apps.move',
    'xd.apps.mouseDown',
    'xd.apps.mouseUp',
    'xd.apps.dragAndDrop',
    'xd.apps.screenshot',
    'xd.apps.close',
  ]) {
    assert.equal(paths.has(path), true, `${path} should be registered`);
  }

  assert.equal(findDeskBridgeCapability('xd.apps.status')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.apps.inspect')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.apps.captureElement')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.apps.launch')?.approval, 'when-external');
  assert.equal(findDeskBridgeCapability('xd.apps.close')?.approval, 'when-external');
  assert.equal(findDeskBridgeCapability('xd.apps.typeText')?.permission, 'execute');
  assert.equal(findDeskBridgeCapability('xd.apps.click')?.permission, 'execute');
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

test('extended external app capabilities dispatch with action names', async () => {
  const calls: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    runExternalAppAction: (args) => {
      calls.push(args);
      return {
        ok: true,
        action: (args as { action: string }).action,
        approvalLevel: 'low',
        windows: [],
        message: 'ok',
      };
    },
  };

  assert.equal(
    (await callDeskBridgeCapability(api, { path: 'xd.apps.inspect', args: { appId: 'notepad' } })).ok,
    true,
  );
  assert.equal(
    (await callDeskBridgeCapability(api, { path: 'xd.apps.tree', args: { appId: 'notepad', depth: 3 } })).ok,
    true,
  );
  assert.equal(
    (await callDeskBridgeCapability(api, { path: 'xd.apps.captureElement', args: { elementRef: 'uia:test' } })).ok,
    true,
  );
  assert.equal(
    (
      await callDeskBridgeCapability(api, {
        path: 'xd.apps.click',
        args: { appId: 'notepad', x: 10, y: 20 },
        source: 'xenesis',
        approved: true,
      })
    ).ok,
    true,
  );

  assert.deepEqual(calls.map((call) => (call as { action: string }).action), [
    'inspect',
    'tree',
    'captureElement',
    'click',
  ]);
});

test('path-based observation and custom capture destinations require approval', async () => {
  const calls: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    runExternalAppAction: (args) => {
      calls.push(args);
      return {
        ok: true,
        action: (args as { action: string }).action,
        approvalLevel: 'low',
        windows: [],
        message: 'ok',
      };
    },
  };

  const blockedInspect = await callDeskBridgeCapability(api, {
    path: 'xd.apps.inspect',
    args: { path: 'C:\\Tools\\custom.exe' },
    source: 'xenesis',
  });
  const blockedCapture = await callDeskBridgeCapability(api, {
    path: 'xd.apps.captureElement',
    args: { appId: 'notepad', screenshotPath: 'C:\\Temp\\capture.png' },
    source: 'xenesis',
  });

  assert.equal(blockedInspect.ok, false);
  assert.equal(blockedInspect.approvalRequired, true);
  assert.equal(blockedCapture.ok, false);
  assert.equal(blockedCapture.approvalRequired, true);
  assert.equal(calls.length, 0);
});

test('unknown external app capability paths do not dispatch through the generic adapter', async () => {
  let called = false;
  const api: DeskBridgeCapabilityAdapter = {
    runExternalAppAction: () => {
      called = true;
      return { ok: true, action: 'status', approvalLevel: 'low', windows: [], message: 'ok' };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.apps.unregisteredAction',
    args: { appId: 'notepad' },
    source: 'xenesis',
    approved: true,
  });

  assert.equal(result.ok, false);
  assert.equal(called, false);
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

test('external app launch schema exposes optional placement', () => {
  const launch = findDeskBridgeCapability('xd.apps.launch');
  const properties = (launch?.schema?.properties as Record<string, unknown>) || {};
  const placement = properties.placement as { type?: string; properties?: Record<string, unknown> } | undefined;

  assert.equal(placement?.type, 'object');
  assert.deepEqual(Object.keys(placement?.properties || {}).sort(), ['height', 'width', 'x', 'y']);
});

test('App Control Lab is exposed as a core tool capability', () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));

  assert.equal(paths.has('xd.tools.core.appControlLab.open'), true);
  assert.equal(findDeskBridgeCapability('xd.tools.core.appControlLab.open')?.permission, 'control');
});
