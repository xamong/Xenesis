import assert from 'node:assert/strict';
import test from 'node:test';

import type { McpBridgeActionInboxItem } from '../../../../shared/types';
import {
  buildXenesisMcpActionInboxPendingMessage,
  collectXenesisMcpActionInboxItems,
  xenesisMcpActionInboxStatus,
} from './xenesisAgentActionInbox';

function actionItem(id: string, status: McpBridgeActionInboxItem['status'] = 'pending'): McpBridgeActionInboxItem {
  return {
    id,
    title: `Approve ${id}`,
    kind: 'capability-approval',
    command: JSON.stringify({ type: 'desk-capability-call', path: 'xd.memory.proposals.accept', args: { id } }),
    description: 'Needs user approval.',
    source: 'xenesis',
    sessionId: 'xenesis-agent',
    approvalSessionKey: `key:${id}`,
    requester: 'xenesis',
    risk: 'write',
    status,
    callbackUrl: '',
    approveText: 'approve',
    rejectText: 'reject',
    createdAt: '2026-06-27T00:00:00.000Z',
    updatedAt: '2026-06-27T00:00:00.000Z',
    expiresAt: '2026-06-27T00:05:00.000Z',
    resolvedAt: '',
    lastCallbackAt: '',
    result: '',
    error: '',
  };
}

test('collectXenesisMcpActionInboxItems extracts nested approval items and deduplicates them', () => {
  const first = actionItem('approval-1');
  const second = actionItem('approval-2');

  const items = collectXenesisMcpActionInboxItems({
    event: 'tool_result',
    data: {
      ok: false,
      approvalRequired: true,
      actionInboxItem: first,
      nested: [{ actionInboxItem: first }, { payload: { actionInboxItem: second } }],
    },
  });

  assert.deepEqual(
    items.map((item) => item.id),
    ['approval-1', 'approval-2'],
  );
});

test('collectXenesisMcpActionInboxItems extracts approval items from run result event arrays', () => {
  const item = actionItem('from-event');

  const items = collectXenesisMcpActionInboxItems({
    ok: false,
    events: [
      {
        event: 'tool_result',
        data: {
          result: {
            approvalRequired: true,
            actionInboxItem: item,
          },
        },
      },
    ],
  });

  assert.deepEqual(
    items.map((entry) => entry.id),
    ['from-event'],
  );
});

test('xenesisMcpActionInboxStatus preserves pending until every item reaches a terminal state', () => {
  assert.equal(xenesisMcpActionInboxStatus([actionItem('a', 'approved'), actionItem('b', 'pending')]), 'pending');
  assert.equal(xenesisMcpActionInboxStatus([actionItem('a', 'approved'), actionItem('b', 'rejected')]), 'rejected');
  assert.equal(xenesisMcpActionInboxStatus([actionItem('a', 'approved')]), 'approved');
  assert.equal(xenesisMcpActionInboxStatus([actionItem('a', 'failed')]), 'failed');
});

test('buildXenesisMcpActionInboxPendingMessage uses product language and hides internal ids', () => {
  const message = buildXenesisMcpActionInboxPendingMessage([actionItem('secret-id')]);

  assert.match(message, /데스크 승인이 필요합니다/);
  assert.doesNotMatch(message, /Approve secret-id|secret-id|xd\.memory\.proposals\.accept/);
  assert.doesNotMatch(message, /approvalSessionKey|actionInboxItem|approvalRequired/);
});
