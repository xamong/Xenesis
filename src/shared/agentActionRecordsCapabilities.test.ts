import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
} from './deskBridgeCapabilities';

const READ_PATHS = [
  'xd.agent.actionNeeded.list',
  'xd.agent.actionNeeded.get',
  'xd.agent.receipts.list',
  'xd.agent.receipts.get',
] as const;

const WRITE_PATHS = ['xd.agent.actionNeeded.reply', 'xd.agent.actionNeeded.dismiss'] as const;

test('agent action-needed and receipt capabilities are registered with safe permissions', () => {
  assert.ok(findDeskBridgeCapability('xd.agent.actionNeeded'));
  assert.ok(findDeskBridgeCapability('xd.agent.receipts'));

  for (const path of READ_PATHS) {
    const node = findDeskBridgeCapability(path);
    assert.ok(node, `${path} should be registered`);
    assert.equal(node.callable, true, `${path} should be callable`);
    assert.equal(node.permission, 'read', `${path} should be read-only`);
    assert.equal(node.approval, 'never', `${path} should not require approval`);
  }

  for (const path of WRITE_PATHS) {
    const node = findDeskBridgeCapability(path);
    assert.ok(node, `${path} should be registered`);
    assert.equal(node.callable, true, `${path} should be callable`);
    assert.equal(node.permission, 'write', `${path} should write action state`);
    assert.equal(node.approval, 'when-external', `${path} should require approval for external callers`);
  }
});

test('agent action-needed and receipt capabilities dispatch through adapter coverage', async () => {
  const calls: Array<{ method: string; args: unknown }> = [];
  const adapter = {
    agentActionNeededList: (args: unknown) => {
      calls.push({ method: 'agentActionNeededList', args });
      return { actionNeeded: [] };
    },
    agentActionNeededGet: (args: unknown) => {
      calls.push({ method: 'agentActionNeededGet', args });
      return { actionNeeded: { id: (args as { id?: string }).id } };
    },
    agentActionNeededReply: (args: unknown) => {
      calls.push({ method: 'agentActionNeededReply', args });
      return { ok: true };
    },
    agentActionNeededDismiss: (args: unknown) => {
      calls.push({ method: 'agentActionNeededDismiss', args });
      return { ok: true };
    },
    agentReceiptsList: (args: unknown) => {
      calls.push({ method: 'agentReceiptsList', args });
      return { receipts: [] };
    },
    agentReceiptsGet: (args: unknown) => {
      calls.push({ method: 'agentReceiptsGet', args });
      return { receipt: { id: (args as { id?: string }).id } };
    },
  } as unknown as DeskBridgeCapabilityAdapter;

  for (const request of [
    { path: 'xd.agent.actionNeeded.list', args: { status: 'open' } },
    { path: 'xd.agent.actionNeeded.get', args: { id: 'action-needed-1' } },
    { path: 'xd.agent.actionNeeded.reply', args: { id: 'action-needed-1', text: 'answer' } },
    { path: 'xd.agent.actionNeeded.dismiss', args: { id: 'action-needed-2', reason: 'done' } },
    { path: 'xd.agent.receipts.list', args: { turnId: 'turn-1' } },
    { path: 'xd.agent.receipts.get', args: { id: 'receipt-1' } },
  ] as const) {
    const result = await callDeskBridgeCapability(adapter, { ...request, source: 'internal' });
    assert.equal(result.ok, true, request.path);
  }

  assert.deepEqual(
    calls.map((call) => call.method),
    [
      'agentActionNeededList',
      'agentActionNeededGet',
      'agentActionNeededReply',
      'agentActionNeededDismiss',
      'agentReceiptsList',
      'agentReceiptsGet',
    ],
  );
});

test('external callers cannot self-resolve action-needed records without approval', async () => {
  const adapter = {
    agentActionNeededReply: () => ({ ok: true }),
  } as unknown as DeskBridgeCapabilityAdapter;

  const result = await callDeskBridgeCapability(adapter, {
    path: 'xd.agent.actionNeeded.reply',
    args: { id: 'action-needed-1', text: 'fake user answer' },
    source: 'mcp',
  });

  assert.equal(result.ok, false);
  assert.equal(result.approvalRequired, true);
});

test('external action-needed readbacks redact internal refs while internal reads keep them', async () => {
  const record = {
    id: 'action-needed-1',
    turnId: 'turn-1',
    kind: 'approval',
    status: 'open',
    title: 'Desk approval required',
    productMessage: '승인이 필요합니다.',
    createdAt: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-28T00:00:00.000Z',
    refs: {
      actionInboxItemId: 'ain-secret',
      approvalId: 'approval-secret',
      capabilityPath: 'xd.apps.launch',
    },
  };
  const adapter = {
    agentActionNeededList: () => ({ actionNeeded: [record] }),
    agentActionNeededGet: () => ({ actionNeeded: record }),
  } as unknown as DeskBridgeCapabilityAdapter;

  const externalList = await callDeskBridgeCapability(adapter, {
    path: 'xd.agent.actionNeeded.list',
    args: {},
    source: 'mcp',
  });
  const externalGet = await callDeskBridgeCapability(adapter, {
    path: 'xd.agent.actionNeeded.get',
    args: { id: 'action-needed-1' },
    source: 'mcp',
  });
  const internalList = await callDeskBridgeCapability(adapter, {
    path: 'xd.agent.actionNeeded.list',
    args: {},
    source: 'internal',
  });

  assert.equal((externalList.result as { actionNeeded: Array<{ refs?: unknown }> }).actionNeeded[0]?.refs, undefined);
  assert.equal((externalGet.result as { actionNeeded: { refs?: unknown } }).actionNeeded.refs, undefined);
  assert.deepEqual(
    (internalList.result as { actionNeeded: Array<{ refs?: unknown }> }).actionNeeded[0]?.refs,
    record.refs,
  );
});
