import assert from 'node:assert/strict';
import test from 'node:test';

import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
  listDeskBridgeCapabilities,
} from './deskBridgeCapabilities';

test('agent session capabilities are registered with approval metadata', () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));

  for (const path of [
    'xd.agentSessions',
    'xd.agentSessions.status',
    'xd.agentSessions.scan',
    'xd.agentSessions.list',
    'xd.agentSessions.search',
    'xd.agentSessions.resume',
    'xd.agentSessions.attachTerminal',
    'xd.agentSessions.pin',
    'xd.agentSessions.hide',
    'xd.tools.core.agentSessions.open',
  ]) {
    assert.equal(paths.has(path), true, `${path} should be registered`);
  }

  assert.equal(findDeskBridgeCapability('xd.agentSessions.status')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.agentSessions.scan')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.agentSessions.resume')?.permission, 'execute');
  assert.equal(findDeskBridgeCapability('xd.agentSessions.resume')?.approval, 'when-external');
  assert.equal(findDeskBridgeCapability('xd.agentSessions.attachTerminal')?.permission, 'control');
  assert.equal(findDeskBridgeCapability('xd.agentSessions.pin')?.permission, 'write');
  assert.equal(findDeskBridgeCapability('xd.agentSessions.hide')?.permission, 'write');
  assert.equal(findDeskBridgeCapability('xd.tools.core.agentSessions.open')?.permission, 'control');
});

test('agent session read capabilities dispatch to adapter without approval', async () => {
  const api: DeskBridgeCapabilityAdapter = {
    agentSessionsStatus: () => ({ ok: true, counts: { total: 1 } }),
    agentSessionsList: () => [{ id: 'codex:a' }],
    agentSessionsSearch: (args) => [{ id: 'codex:a', args }],
  };

  const status = await callDeskBridgeCapability(api, { path: 'xd.agentSessions.status', source: 'xenesis' });
  const list = await callDeskBridgeCapability(api, { path: 'xd.agentSessions.list', source: 'xenesis' });
  const search = await callDeskBridgeCapability(api, {
    path: 'xd.agentSessions.search',
    source: 'xenesis',
    args: { query: 'terminal' },
  });

  assert.equal(status.ok, true);
  assert.equal(list.ok, true);
  assert.equal(search.ok, true);
  assert.deepEqual(status.result, { ok: true, counts: { total: 1 } });
});

test('agent session execute and write capabilities require approval for xenesis source', async () => {
  const calls: string[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    agentSessionsResume: () => {
      calls.push('resume');
      return { ok: true };
    },
    agentSessionsPin: () => {
      calls.push('pin');
      return [];
    },
  };

  const blockedResume = await callDeskBridgeCapability(api, {
    path: 'xd.agentSessions.resume',
    source: 'xenesis',
    args: { sessionId: 'codex:a' },
  });
  assert.equal(blockedResume.ok, false);
  assert.equal(blockedResume.approvalRequired, true);

  const resumed = await callDeskBridgeCapability(api, {
    path: 'xd.agentSessions.resume',
    source: 'xenesis',
    approved: true,
    args: { sessionId: 'codex:a' },
  });
  assert.equal(resumed.ok, true);

  const blockedPin = await callDeskBridgeCapability(api, {
    path: 'xd.agentSessions.pin',
    source: 'xenesis',
    args: { sessionId: 'codex:a', pinned: true },
  });
  assert.equal(blockedPin.ok, false);
  assert.equal(blockedPin.approvalRequired, true);
  assert.equal(calls.includes('resume'), true);
  assert.equal(calls.includes('pin'), false);
});

test('agent sessions tool open dispatches to extension command host', async () => {
  const calls: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    runExtensionCommand: (args) => {
      calls.push(args);
      return { ok: true, args };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.tools.core.agentSessions.open',
    source: 'xenesis',
    approved: true,
    args: { placement: 'tab' },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ placement: 'tab', commandId: 'xenesis-desk.core-tools.openAgentSessions' }]);
});
