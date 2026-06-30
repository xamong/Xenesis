import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
  listDeskBridgeCapabilities,
} from './deskBridgeCapabilities';

test('input control capabilities are registered with expected metadata', () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));

  for (const path of ['xd.input', 'xd.input.targets', 'xd.input.describe', 'xd.input.screenshot', 'xd.input.run']) {
    assert.equal(paths.has(path), true, `${path} should be registered`);
  }

  assert.equal(findDeskBridgeCapability('xd.input.targets')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.input.targets')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.input.describe')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.input.screenshot')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.input.run')?.permission, 'execute');
  assert.equal(findDeskBridgeCapability('xd.input.run')?.approval, 'when-external');
});

test('input run is approval-gated for external sources before adapter dispatch', async () => {
  const calls: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    inputControlCall: (path, args) => {
      calls.push({ path, args });
      return { ok: true, path, result: { accepted: true } };
    },
  };

  const blocked = await callDeskBridgeCapability(api, {
    path: 'xd.input.run',
    source: 'xenesis',
    args: {
      environment: 'desktop',
      target: { kind: 'app', appId: 'notepad' },
      actions: [{ type: 'type', text: 'hello' }],
    },
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.approvalRequired, true);
  assert.equal(calls.length, 0);

  const approved = await callDeskBridgeCapability(api, {
    path: 'xd.input.run',
    source: 'xenesis',
    approved: true,
    args: {
      environment: 'desktop',
      target: { kind: 'app', appId: 'notepad' },
      actions: [{ type: 'type', text: 'hello' }],
    },
  });

  assert.equal(approved.ok, true);
  assert.deepEqual(calls, [
    {
      path: 'xd.input.run',
      args: {
        environment: 'desktop',
        target: { kind: 'app', appId: 'notepad' },
        actions: [{ type: 'type', text: 'hello' }],
      },
    },
  ]);
});

test('input read capabilities dispatch without approval', async () => {
  const calls: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    inputControlCall: (path, args) => {
      calls.push({ path, args });
      return { ok: true, path, result: { ok: true } };
    },
  };

  const targets = await callDeskBridgeCapability(api, { path: 'xd.input.targets', source: 'xenesis', args: {} });

  assert.equal(targets.ok, true);
  assert.deepEqual(calls, [{ path: 'xd.input.targets', args: {} }]);
});

test('input audit redacts action text, value, and keys', async () => {
  const audits: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    inputControlCall: (path) => ({ ok: true, path, result: { ok: true } }),
    recordAudit: (record) => {
      audits.push(record);
      return { ok: true };
    },
  };

  await callDeskBridgeCapability(api, {
    path: 'xd.input.run',
    source: 'internal',
    args: {
      environment: 'desktop',
      target: { kind: 'app', appId: 'notepad' },
      actions: [
        { type: 'type', text: 'secret' },
        { type: 'hotkey', keys: ['CTRL', 'S'] },
      ],
      value: 'hidden',
    },
  });

  const audit = audits[0] as { args?: unknown };
  assert.deepEqual(audit.args, {
    environment: 'desktop',
    target: { kind: 'app', appId: 'notepad' },
    actions: [
      { type: 'type', text: '[redacted: input-control audit]' },
      { type: 'hotkey', keys: '[redacted: input-control audit]' },
    ],
    value: '[redacted: input-control audit]',
  });
});
