import assert from 'node:assert/strict';
import test from 'node:test';
import { createAgentActionRecordStore, sanitizeAgentProductMessage } from './agentActionRecords';

test('agent action record store creates and lists open action-needed records safely', () => {
  const store = createAgentActionRecordStore({
    now: () => '2026-06-28T12:00:00.000Z',
    idFactory: (prefix) => `${prefix}-1`,
  });

  const record = store.createActionNeeded({
    turnId: 'turn-1',
    kind: 'user_input',
    title: '필요한 정보를 알려주세요',
    productMessage: 'answer needed approvalRequired=true actionInboxItem.id=ain_secret raw args',
    refs: { capabilityPath: 'xd.agent.actionNeeded.reply' },
  });

  assert.equal(record.id, 'action-needed-1');
  assert.equal(record.status, 'open');
  assert.equal(record.createdAt, '2026-06-28T12:00:00.000Z');
  assert.equal(record.productMessage.includes('approvalRequired=true'), false);
  assert.equal(record.productMessage.includes('ain_secret'), false);

  const listed = store.listActionNeeded();
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, record.id);
  listed[0]!.status = 'dismissed';
  assert.equal(store.getActionNeeded(record.id)?.status, 'open');
});

test('agent action record store resolves user-input records with reply receipts', () => {
  const store = createAgentActionRecordStore({
    now: () => '2026-06-28T12:00:00.000Z',
    idFactory: (prefix) => `${prefix}-1`,
  });
  const record = store.createActionNeeded({
    turnId: 'turn-1',
    kind: 'user_input',
    title: 'Need a reply',
    productMessage: 'Which workspace should I open?',
  });

  const result = store.replyActionNeeded(record.id, { text: 'Use E:\\Workspace\\plane', repliedBy: 'user' });

  assert.equal(result.ok, true);
  assert.equal(result.actionNeeded?.status, 'resolved');
  assert.equal(result.actionNeeded?.reply?.text, 'Use E:\\Workspace\\plane');
  assert.equal(result.receipt?.kind, 'action-needed-replied');
  assert.equal(result.receipt?.turnId, 'turn-1');
  assert.equal(store.getReceipt(result.receipt!.id)?.id, result.receipt!.id);
});

test('agent action record store dismisses open records and lists receipts by turn', () => {
  const store = createAgentActionRecordStore({
    now: () => '2026-06-28T12:00:00.000Z',
    idFactory: (prefix) => `${prefix}-1`,
  });
  const record = store.createActionNeeded({
    turnId: 'turn-2',
    kind: 'external_unblocker',
    title: 'Open external workspace',
    productMessage: '데스크 승인이 필요합니다.',
  });

  const result = store.dismissActionNeeded(record.id, { reason: 'Not needed anymore', dismissedBy: 'user' });

  assert.equal(result.ok, true);
  assert.equal(result.actionNeeded?.status, 'dismissed');
  assert.equal(result.receipt?.kind, 'action-needed-dismissed');
  assert.deepEqual(
    store.listReceipts({ turnId: 'turn-2' }).map((receipt) => receipt.id),
    [result.receipt?.id],
  );
});

test('agent action record store rejects replies to approval records', () => {
  const store = createAgentActionRecordStore();
  const record = store.createActionNeeded({
    turnId: 'turn-approval',
    kind: 'approval',
    title: 'Approval required',
    productMessage: '파일 트리를 열려면 데스크 승인이 필요합니다.',
  });

  const result = store.replyActionNeeded(record.id, { text: 'approved', repliedBy: 'user' });

  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /approval/i);
  assert.equal(store.getActionNeeded(record.id)?.status, 'open');
});

test('agent action record store rejects dismissals of approval records', () => {
  const store = createAgentActionRecordStore();
  const record = store.createActionNeeded({
    turnId: 'turn-approval',
    kind: 'approval',
    title: 'Approval required',
    productMessage: '파일 트리를 열려면 데스크 승인이 필요합니다.',
    refs: { approvalId: 'approval-secret', actionInboxItemId: 'ain-secret' },
  });

  const result = store.dismissActionNeeded(record.id, { reason: 'hide it', dismissedBy: 'user' });

  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /approval/i);
  assert.equal(store.getActionNeeded(record.id)?.status, 'open');
});

test('sanitizeAgentProductMessage removes internal approval and CR diagnostics', () => {
  const sanitized = sanitizeAgentProductMessage(
    'approvalRequired=true actionInboxItem.id=ain_secret actionInboxItem={"id":"ain_json"} path=xd.apps.launch args={"path":"E:\\secret"}',
  );

  assert.equal(sanitized.includes('approvalRequired'), false);
  assert.equal(sanitized.includes('actionInboxItem'), false);
  assert.equal(sanitized.includes('ain_secret'), false);
  assert.equal(sanitized.includes('ain_json'), false);
  assert.equal(sanitized.includes('xd.apps.launch'), false);
});
