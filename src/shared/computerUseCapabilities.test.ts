import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
} from './deskBridgeCapabilities';

test('computer use capabilities are registered', () => {
  for (const path of [
    'xd.computer',
    'xd.computer.capture',
    'xd.computer.list_apps',
    'xd.computer.focus_app',
    'xd.computer.click',
    'xd.computer.type',
    'xd.computer.key',
    'xd.computer.scroll',
    'xd.computer.drag',
    'xd.computer.set_value',
    'xd.computer.stop',
    'xd.computer.actions.list',
    'xd.computer.actions.get',
  ]) {
    assert.ok(findDeskBridgeCapability(path), path);
  }

  assert.equal(findDeskBridgeCapability('xd.computer.capture')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.computer.click')?.approval, 'when-external');
});

test('computer use dispatch calls bridge adapter', async () => {
  const calls: Array<{ path: string; args: unknown }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    computerUseCall: (path, args) => {
      calls.push({ path, args });
      return { ok: true, path, result: { records: [] } };
    },
  };

  const result = await callDeskBridgeCapability(api, { path: 'xd.computer.actions.list', args: {} });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ path: 'xd.computer.actions.list', args: {} }]);
});

test('computer use policy runs before external approval is requested', async () => {
  const calls: Array<{ path: string; args: unknown; approved?: boolean }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    computerUseCall: (path, args, options) => {
      calls.push({ path, args, approved: options?.approved });
      return { ok: false, path, error: 'Computer use refused secret-shaped text.' };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.computer.type',
    args: { text: 'OPENAI_API_KEY=sk-secret' },
    source: 'mcp',
    approved: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.approvalRequired, undefined);
  assert.match(result.error || '', /secret-shaped/i);
  assert.deepEqual(calls, [{ path: 'xd.computer.type', args: { text: 'OPENAI_API_KEY=sk-secret' }, approved: false }]);
});

test('computer use set_value secret-shaped text is denied without creating approval work', async () => {
  const calls: Array<{ path: string; args: unknown; approved?: boolean }> = [];
  const api: DeskBridgeCapabilityAdapter = {
    computerUseCall: (path, args, options) => {
      calls.push({ path, args, approved: options?.approved });
      return { ok: false, path, error: 'Computer use refused secret-shaped text.' };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.computer.set_value',
    args: { element: 3, text: 'password=hunter2' },
    source: 'mcp',
    approved: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.approvalRequired, undefined);
  assert.match(result.error || '', /secret-shaped/i);
  assert.deepEqual(calls, [
    { path: 'xd.computer.set_value', args: { element: 3, text: 'password=hunter2' }, approved: false },
  ]);
});
