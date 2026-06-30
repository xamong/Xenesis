import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyMcpActionInboxRequest,
  createMcpActionInboxState,
  listMcpActionInboxItems,
  resolveMcpActionInboxItem,
} from './mcpActionInbox.mjs';

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

test('resolveMcpActionInboxItem approves pending capability records and hides resolved items by default filter', () => {
  const state = createMcpActionInboxState();
  applyMcpActionInboxRequest(
    state,
    capabilityApprovalRequest({
      createdAt: '2026-06-28T00:10:00.000Z',
      updatedAt: '2026-06-28T00:10:00.000Z',
      expiresAt: '2026-06-28T00:15:00.000Z',
    }),
  );

  const resolved = resolveMcpActionInboxItem(state, {
    id: CAPABILITY_APPROVAL_ID,
    resolution: 'approve',
    at: '2026-06-28T00:11:00.000Z',
    result: 'Capability call approved and executed: xd.xenesis.connections.setupRequests.request',
  });

  assert.equal(resolved.ok, true);
  assert.equal(resolved.item.status, 'approved');
  assert.equal(resolved.item.resolvedAt, '2026-06-28T00:11:00.000Z');
  assert.equal(resolved.item.lastCallbackAt, '2026-06-28T00:11:00.000Z');
  assert.match(resolved.item.result, /approved and executed/);
  assert.deepEqual(listMcpActionInboxItems(state, { includeResolved: false }), []);
  assert.equal(listMcpActionInboxItems(state, { includeResolved: true })[0].status, 'approved');
});

test('resolveMcpActionInboxItem rejects pending capability records with readback error text', () => {
  const state = createMcpActionInboxState();
  applyMcpActionInboxRequest(
    state,
    capabilityApprovalRequest({
      createdAt: '2026-06-28T00:20:00.000Z',
      updatedAt: '2026-06-28T00:20:00.000Z',
      expiresAt: '2026-06-28T00:25:00.000Z',
    }),
  );

  const resolved = resolveMcpActionInboxItem(state, {
    id: CAPABILITY_APPROVAL_ID,
    resolution: 'reject',
    at: '2026-06-28T00:21:00.000Z',
    error: 'User rejected Desk capability approval.',
  });

  assert.equal(resolved.ok, true);
  assert.equal(resolved.item.status, 'rejected');
  assert.equal(resolved.item.resolvedAt, '2026-06-28T00:21:00.000Z');
  assert.equal(resolved.item.error, 'User rejected Desk capability approval.');
  assert.equal(listMcpActionInboxItems(state, { includeResolved: true })[0].status, 'rejected');
});
