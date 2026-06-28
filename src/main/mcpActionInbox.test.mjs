import assert from 'node:assert/strict';
import test from 'node:test';

import { applyMcpActionInboxRequest, createMcpActionInboxState, listMcpActionInboxItems } from './mcpActionInbox.mjs';

const CAPABILITY_APPROVAL_KEY = 'capability:xenesis:xd.xenesis.connections.setupRequests.request';
const CAPABILITY_APPROVAL_ID = 'capability-xenesis-xd.xenesis.connections.setupRequests.request';

function capabilityApprovalRequest(overrides = {}) {
  return {
    id: CAPABILITY_APPROVAL_ID,
    title: 'Approve Xenesis Desk capability: xd.xenesis.connections.setupRequests.request',
    kind: 'capability-approval',
    command:
      '{"type":"desk-capability-call","path":"xd.xenesis.connections.setupRequests.request","args":{"id":"notion"},"source":"xenesis"}',
    description: 'Capability requires approval: xd.xenesis.connections.setupRequests.request',
    source: 'Xenesis Desk Capability Registry',
    sessionId: 'xenesis-capability',
    approvalSessionKey: CAPABILITY_APPROVAL_KEY,
    requester: 'xenesis',
    risk: 'control',
    callbackUrl: '',
    approveText: 'Approve xd.xenesis.connections.setupRequests.request',
    rejectText: 'Reject xd.xenesis.connections.setupRequests.request',
    ...overrides,
  };
}

test('applyMcpActionInboxRequest refreshes expired same-session approval requests as pending', () => {
  const state = createMcpActionInboxState();

  applyMcpActionInboxRequest(
    state,
    capabilityApprovalRequest({
      status: 'expired',
      createdAt: '2026-06-28T00:00:00.000Z',
      updatedAt: '2026-06-28T00:05:00.000Z',
      expiresAt: '2026-06-28T00:05:00.000Z',
      resolvedAt: '2026-06-28T00:05:00.000Z',
      lastCallbackAt: '2026-06-28T00:05:00.000Z',
      result: 'old approval result',
      error: 'Approval request expired before it was resolved.',
    }),
  );

  const refreshed = applyMcpActionInboxRequest(
    state,
    capabilityApprovalRequest({
      description: 'Fresh approval request for Notion setup review.',
      createdAt: '2026-06-28T00:10:00.000Z',
      updatedAt: '2026-06-28T00:10:00.000Z',
      expiresAt: '2026-06-28T00:15:00.000Z',
    }),
  );

  assert.equal(refreshed.id, CAPABILITY_APPROVAL_ID);
  assert.equal(refreshed.status, 'pending');
  assert.equal(refreshed.createdAt, '2026-06-28T00:10:00.000Z');
  assert.equal(refreshed.updatedAt, '2026-06-28T00:10:00.000Z');
  assert.equal(refreshed.expiresAt, '2026-06-28T00:15:00.000Z');
  assert.equal(refreshed.resolvedAt, '');
  assert.equal(refreshed.lastCallbackAt, '');
  assert.equal(refreshed.result, '');
  assert.equal(refreshed.error, '');
  assert.equal(refreshed.description, 'Fresh approval request for Notion setup review.');

  const [latest] = listMcpActionInboxItems(state);
  assert.equal(latest.id, CAPABILITY_APPROVAL_ID);
  assert.equal(latest.status, 'pending');
  assert.equal(latest.error, '');
});
