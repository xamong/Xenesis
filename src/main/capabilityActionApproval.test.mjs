import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCapabilityApprovalAllowKey,
  createCapabilityApprovalCommand,
  createCapabilityApprovalRequest,
  isCapabilityApprovalItem,
  parseCapabilityApprovalCommand,
} from './capabilityActionApproval.mjs';

const REQUEST = {
  path: 'xd.xenesis.connections.setupRequests.request',
  source: 'xenesis',
  args: {
    z: 2,
    a: {
      c: 3,
      b: 1,
    },
  },
};

test('capability approval command roundtrips with stable argument ordering', () => {
  const command = createCapabilityApprovalCommand(REQUEST);

  assert.equal(
    command,
    '{"type":"desk-capability-call","path":"xd.xenesis.connections.setupRequests.request","args":{"a":{"b":1,"c":3},"z":2},"source":"xenesis"}',
  );
  assert.deepEqual(parseCapabilityApprovalCommand(command), {
    type: 'desk-capability-call',
    path: 'xd.xenesis.connections.setupRequests.request',
    args: {
      a: {
        b: 1,
        c: 3,
      },
      z: 2,
    },
    source: 'xenesis',
  });
});

test('capability approval allow key is stable for equivalent args', () => {
  const left = createCapabilityApprovalAllowKey({
    path: REQUEST.path,
    source: REQUEST.source,
    args: { b: 2, a: 1 },
  });
  const right = createCapabilityApprovalAllowKey({
    path: REQUEST.path,
    source: REQUEST.source,
    args: { a: 1, b: 2 },
  });

  assert.equal(left, right);
  assert.match(left, /^capability-always:xenesis:xd\.xenesis\.connections\.setupRequests\.request:[a-f0-9]{32}$/);
});

test('capability approval request creates Action Inbox record shape', () => {
  const item = createCapabilityApprovalRequest({
    path: REQUEST.path,
    args: { id: 'notion' },
    source: 'xenesis',
    result: {
      permission: 'control',
      error: 'Capability requires approval: xd.xenesis.connections.setupRequests.request',
    },
  });

  assert.equal(item.id, 'capability-xenesis-xd.xenesis.connections.setupRequests.request');
  assert.equal(item.title, 'Approve Xenesis Desk capability: xd.xenesis.connections.setupRequests.request');
  assert.equal(item.kind, 'capability-approval');
  assert.equal(item.source, 'Xenesis Desk Capability Registry');
  assert.equal(item.sessionId, 'xenesis-capability');
  assert.equal(item.approvalSessionKey, 'capability:xenesis:xd.xenesis.connections.setupRequests.request');
  assert.equal(item.requester, 'xenesis');
  assert.equal(item.risk, 'control');
  assert.equal(item.approveText, 'Approve xd.xenesis.connections.setupRequests.request');
  assert.equal(item.rejectText, 'Reject xd.xenesis.connections.setupRequests.request');
  assert.equal(isCapabilityApprovalItem(item), true);
  assert.deepEqual(parseCapabilityApprovalCommand(item.command), {
    type: 'desk-capability-call',
    path: REQUEST.path,
    args: { id: 'notion' },
    source: 'xenesis',
  });
});

test('capability approval parser rejects non-capability commands', () => {
  assert.throws(
    () => parseCapabilityApprovalCommand('{"type":"other","path":"xd.xenesis.connections.setupRequests.request"}'),
    /not a capability approval command/,
  );
  assert.throws(() => parseCapabilityApprovalCommand('{"type":"desk-capability-call"}'), /missing path/);
});
