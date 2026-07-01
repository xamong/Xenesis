import assert from 'node:assert/strict';
import test from 'node:test';

import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
  listDeskBridgeCapabilities,
} from './deskBridgeCapabilities';

test('Workbench subagent controls are listed with CR-first registry paths', () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));

  for (const path of [
    'xd.workbench',
    'xd.workbench.subagents',
    'xd.workbench.subagents.status',
    'xd.workbench.subagents.attachActiveTerminal',
    'xd.workbench.subagents.startManaged',
    'xd.workbench.subagents.plan',
    'xd.workbench.subagents.dispatch',
    'xd.workbench.subagents.stop',
    'xd.workbench.subagents.resolveApproval',
  ]) {
    assert.equal(paths.has(path), true, `${path} should be registered`);
  }

  assert.equal(findDeskBridgeCapability('xd.workbench.subagents.status')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.workbench.subagents.status')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.workbench.subagents.attachActiveTerminal')?.permission, 'control');
  assert.equal(findDeskBridgeCapability('xd.workbench.subagents.startManaged')?.permission, 'execute');
  assert.equal(findDeskBridgeCapability('xd.workbench.subagents.plan')?.permission, 'control');
  assert.equal(findDeskBridgeCapability('xd.workbench.subagents.dispatch')?.permission, 'execute');
  assert.equal(findDeskBridgeCapability('xd.workbench.subagents.stop')?.permission, 'control');
  assert.equal(findDeskBridgeCapability('xd.workbench.subagents.resolveApproval')?.permission, 'control');
});

test('Workbench subagent controls dispatch normalized actions through the adapter', async () => {
  const calls: unknown[] = [];
  const api = {
    workbenchSubagentAction: (args: unknown) => {
      calls.push(args);
      return { ok: true, args };
    },
  } as DeskBridgeCapabilityAdapter & {
    workbenchSubagentAction: (args: unknown) => unknown;
  };

  assert.equal((await callDeskBridgeCapability(api, { path: 'xd.workbench.subagents.status' })).ok, true);
  assert.equal(
    (
      await callDeskBridgeCapability(api, {
        path: 'xd.workbench.subagents.attachActiveTerminal',
        args: { profileName: 'researcher' },
      })
    ).ok,
    true,
  );
  assert.equal(
    (
      await callDeskBridgeCapability(api, {
        path: 'xd.workbench.subagents.dispatch',
        args: { prompt: 'Smoke assignment' },
        approved: true,
      })
    ).ok,
    true,
  );

  assert.deepEqual(calls, [
    { action: 'status' },
    { action: 'attachActiveTerminal', profileName: 'researcher' },
    { action: 'dispatch', prompt: 'Smoke assignment' },
  ]);
});
