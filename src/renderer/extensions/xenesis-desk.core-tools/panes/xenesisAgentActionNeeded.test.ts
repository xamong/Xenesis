import assert from 'node:assert/strict';
import test from 'node:test';
import type { McpBridgeActionInboxItem } from '../../../../shared/types';
import {
  collectAgentActionNeededFromCapabilityResult,
  filterAgentActionNeededForInboxItems,
  mergeXenesisAgentActionNeeded,
  summarizeAgentActionNeededForCard,
} from './xenesisAgentActionNeeded';

const inboxItem = {
  id: 'action-inbox-secret',
  status: 'pending',
} as McpBridgeActionInboxItem;

test('collectAgentActionNeededFromCapabilityResult extracts valid records from CR payloads', () => {
  const records = collectAgentActionNeededFromCapabilityResult({
    ok: true,
    result: {
      actionNeeded: [
        {
          id: 'action-needed-1',
          turnId: 'turn-1',
          kind: 'approval',
          status: 'open',
          title: 'Desk approval required',
          productMessage: '이 작업을 계속하려면 데스크 승인이 필요합니다.',
          createdAt: '2026-06-28T00:00:00.000Z',
          updatedAt: '2026-06-28T00:00:00.000Z',
          refs: {
            actionInboxItemId: inboxItem.id,
            capabilityPath: 'xd.apps.launch',
          },
        },
        { id: 123 },
      ],
    },
  });

  assert.equal(records.length, 1);
  assert.equal(records[0]?.id, 'action-needed-1');
});

test('filterAgentActionNeededForInboxItems matches records through refs without leaking refs into card text', () => {
  const records = collectAgentActionNeededFromCapabilityResult({
    result: {
      actionNeeded: [
        {
          id: 'action-needed-1',
          turnId: 'turn-1',
          kind: 'approval',
          status: 'open',
          title: 'Desk approval required',
          productMessage: '이 작업을 계속하려면 데스크 승인이 필요합니다.',
          createdAt: '2026-06-28T00:00:00.000Z',
          updatedAt: '2026-06-28T00:00:00.000Z',
          refs: {
            actionInboxItemId: inboxItem.id,
            capabilityPath: 'xd.apps.launch',
            approvalId: 'approval-secret',
          },
        },
      ],
    },
  });

  const matched = filterAgentActionNeededForInboxItems(records, [inboxItem]);
  const summary = summarizeAgentActionNeededForCard(matched);

  assert.equal(matched.length, 1);
  assert.equal(summary.includes('Desk approval required'), true);
  for (const internal of [inboxItem.id, 'xd.apps.launch', 'approval-secret']) {
    assert.equal(summary.includes(internal), false, `${internal} should not appear in card summary`);
  }
});

test('summarizeAgentActionNeededForCard strips raw CR and approval diagnostics from card text', () => {
  const summary = summarizeAgentActionNeededForCard([
    {
      id: 'action-needed-1',
      turnId: 'turn-1',
      kind: 'approval',
      status: 'open',
      title: 'Approve Xenesis Desk capability: xd.apps.launch',
      productMessage:
        'approvalRequired=true actionInboxItem.id=ain_secret approvalId=approval-secret path=xd.apps.launch args={"path":"E:\\secret"}',
      createdAt: '2026-06-28T00:00:00.000Z',
      updatedAt: '2026-06-28T00:00:00.000Z',
      refs: {
        actionInboxItemId: 'ain_secret',
        approvalId: 'approval-secret',
        capabilityPath: 'xd.apps.launch',
      },
    },
  ]);

  assert.equal(summary.includes('approvalRequired'), false);
  assert.equal(summary.includes('actionInboxItem'), false);
  assert.equal(summary.includes('approval-secret'), false);
  assert.equal(summary.includes('xd.apps.launch'), false);
  assert.equal(summary.includes('E:\\secret'), false);
});

test('mergeXenesisAgentActionNeeded keeps the newest record per id', () => {
  const merged = mergeXenesisAgentActionNeeded(
    [
      {
        id: 'action-needed-1',
        turnId: 'turn-1',
        kind: 'user_input',
        status: 'open',
        title: 'Need input',
        productMessage: 'Choose one',
        createdAt: '2026-06-28T00:00:00.000Z',
        updatedAt: '2026-06-28T00:00:00.000Z',
      },
    ],
    [
      {
        id: 'action-needed-1',
        turnId: 'turn-1',
        kind: 'user_input',
        status: 'resolved',
        title: 'Need input',
        productMessage: 'Choose one',
        createdAt: '2026-06-28T00:00:00.000Z',
        updatedAt: '2026-06-28T00:01:00.000Z',
      },
    ],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.status, 'resolved');
});
