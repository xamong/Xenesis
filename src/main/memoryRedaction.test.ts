import assert from 'node:assert/strict';
import test from 'node:test';

import {
  redactMemoryEvidenceForCr,
  redactMemoryLedgerEventForCr,
  redactMemoryProposalForCr,
  redactMemoryRecordForCr,
} from './memoryRedaction';

test('redacts low-labelled secret-looking memory records before CR reads return them', () => {
  const redacted = redactMemoryRecordForCr({
    id: 'mem-low-secret',
    text: 'Temporary API key is sk-live-secret-main-value.',
    tags: ['credential:sk-live-secret-main-value'],
    source: 'password vault sk-live-secret-main-value',
    sensitivity: 'low',
    updatedAt: '2026-06-27T10:00:00.000Z',
  });

  const serialized = JSON.stringify(redacted);
  assert.equal(redacted.text, '[redacted: restricted memory]');
  assert.equal(redacted.sensitivity, 'restricted');
  assert.deepEqual(redacted.tags, []);
  assert.equal('source' in redacted, false);
  assert.equal(serialized.includes('sk-live-secret-main-value'), false);
});

test('redacts low-labelled secret-looking proposals before CR reads return them', () => {
  const redacted = redactMemoryProposalForCr({
    id: 'memprop-low-secret',
    status: 'pending',
    input: {
      id: 'mem-low-secret-proposal',
      text: 'Store password=opensesame and token sk-test-secret-main-value.',
      tags: ['password=opensesame'],
      source: 'token sk-test-secret-main-value',
      sensitivity: 'low',
    },
    decision: {
      action: 'propose',
      sensitivity: 'low',
      requiresApproval: true,
      reason: 'explicit propose',
    },
    context: {
      actor: 'agent',
      externalTaint: false,
      intent: 'propose',
      reason: 'user pasted token sk-test-secret-main-value',
      runtime: 'test',
      sourceKind: 'conversation',
      trust: 'unknown',
    },
    createdAt: '2026-06-27T10:00:00.000Z',
    updatedAt: '2026-06-27T10:00:00.000Z',
  });

  const serialized = JSON.stringify(redacted);
  assert.equal(redacted.input.text, '[redacted: restricted memory proposal]');
  assert.equal(redacted.input.sensitivity, 'restricted');
  assert.equal(redacted.decision.sensitivity, 'restricted');
  assert.deepEqual(redacted.input.tags, []);
  assert.equal('source' in redacted.input, false);
  assert.equal(serialized.includes('opensesame'), false);
  assert.equal(serialized.includes('sk-test-secret-main-value'), false);
});

test('redacts low-labelled secret-looking evidence before CR reads return it', () => {
  const redacted = redactMemoryEvidenceForCr({
    id: 'ev-low-secret',
    kind: 'manual_note',
    source: 'password vault sk-live-evidence-secret',
    sensitivity: 'low',
    status: 'active',
    summary: 'API key sk-live-evidence-secret',
    contentHash: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    uri: 'file:///private/sk-live-evidence-secret',
    metadata: {
      token: 'sk-live-evidence-secret',
    },
    createdAt: '2026-06-27T10:00:00.000Z',
  });

  const serialized = JSON.stringify(redacted);
  assert.equal(redacted.source, '[redacted: restricted evidence source]');
  assert.equal(redacted.summary, '[redacted: restricted evidence summary]');
  assert.equal(redacted.sensitivity, 'restricted');
  assert.equal('contentHash' in redacted, false);
  assert.equal('uri' in redacted, false);
  assert.equal('metadata' in redacted, false);
  assert.equal(serialized.includes('sk-live-evidence-secret'), false);
});

test('redacts memory ledger events before CR history reads return them', () => {
  const redacted = redactMemoryLedgerEventForCr({
    id: 'event-1',
    type: 'proposal_accepted',
    targetType: 'proposal',
    targetId: 'proposal-secret',
    proposalId: 'proposal-secret',
    memoryId: 'mem-secret',
    evidenceId: 'evidence-secret',
    actor: 'agent',
    createdAt: '2026-06-27T10:00:00.000Z',
    reason: 'approved by user with token sk-live-history-secret',
    metadata: {
      approvalId: 'approval-secret-id',
      path: 'xd.memory.proposals.accept',
      argsHash: 'raw-args-hash',
      contentHash: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      source: 'password vault sk-live-history-secret',
    },
  });

  const serialized = JSON.stringify(redacted);
  assert.equal(serialized.includes('sk-live-history-secret'), false);
  assert.equal(serialized.includes('approval-secret-id'), false);
  assert.equal(serialized.includes('raw-args-hash'), false);
  assert.equal(serialized.includes('sha256:cccc'), false);
  assert.equal(serialized.includes('xd.memory.proposals.accept'), false);
  assert.equal(redacted.reason, '[redacted: ledger event reason]');
  assert.equal(redacted.metadata, undefined);
});
