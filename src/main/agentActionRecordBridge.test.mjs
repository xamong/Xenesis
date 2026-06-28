import assert from 'node:assert/strict';
import test from 'node:test';
import { createLinkedApprovalActionNeeded, createLinkedApprovalReceipt } from './agentActionRecordBridge.mjs';

test('linked approval action-needed records keep internals in refs only', () => {
  const item = {
    id: 'capability-mcp-xd.apps.launch-secret',
    title: 'Approve Xenesis Desk capability: xd.apps.launch',
    kind: 'capability-approval',
    command: JSON.stringify({
      type: 'desk-capability-call',
      path: 'xd.apps.launch',
      args: { path: 'E:\\secret' },
      source: 'mcp',
    }),
    description: 'Capability requires approval for mcp: xd.apps.launch approvalRequired=true actionInboxItem.id=ain_secret',
    source: 'Xenesis Desk Capability Registry',
    sessionId: 'xenesis-capability',
    approvalSessionKey: 'capability-always:mcp:xd.apps.launch:secret',
    requester: 'mcp',
    risk: 'execute',
  };

  const actionNeeded = createLinkedApprovalActionNeeded({ turnId: 'turn-1', item });

  assert.equal(actionNeeded.turnId, 'turn-1');
  assert.equal(actionNeeded.kind, 'approval');
  assert.equal(actionNeeded.refs.actionInboxItemId, item.id);
  assert.equal(actionNeeded.refs.approvalId, item.id);
  assert.equal(actionNeeded.refs.approvalSessionKey, item.approvalSessionKey);
  assert.equal(actionNeeded.refs.capabilityPath, 'xd.apps.launch');

  for (const internal of ['xd.apps.launch', 'E:\\secret', 'approvalRequired', 'actionInboxItem', 'ain_secret', item.id]) {
    assert.equal(actionNeeded.productMessage.includes(internal), false, `${internal} should not be in product text`);
    assert.equal(actionNeeded.title.includes(internal), false, `${internal} should not be in title`);
  }
});

test('linked approval receipts summarize approval stops without leaking CR internals', () => {
  const item = {
    id: 'capability-mcp-xd.apps.launch-secret',
    title: 'Approve Xenesis Desk capability: xd.apps.launch',
    command: JSON.stringify({ type: 'desk-capability-call', path: 'xd.apps.launch', source: 'mcp' }),
    approvalSessionKey: 'capability-always:mcp:xd.apps.launch:secret',
    requester: 'mcp',
  };

  const receipt = createLinkedApprovalReceipt({
    turnId: 'turn-1',
    actionNeededId: 'action-needed-1',
    item,
  });

  assert.equal(receipt.turnId, 'turn-1');
  assert.equal(receipt.kind, 'workflow-receipt');
  assert.equal(receipt.refs.actionNeededId, 'action-needed-1');
  assert.equal(receipt.refs.actionInboxItemId, item.id);
  assert.equal(receipt.refs.capabilityPath, 'xd.apps.launch');
  assert.equal(receipt.summary.includes('xd.apps.launch'), false);
  assert.equal(receipt.summary.includes(item.id), false);
});
