import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMemoryCorrectionProposalArgs,
  buildMemoryDashboardModel,
  redactDashboardMemoryText,
} from './memoryDashboardModel';

const records = [
  {
    id: 'mem-project-decision',
    text: 'Project Atlas decision: ship dashboard before dream mode.',
    tags: ['project:atlas', 'decision'],
    kind: 'decision',
    source: 'manual_note',
    sensitivity: 'low',
    priority: 8,
    createdAt: '2026-06-27T01:00:00.000Z',
    updatedAt: '2026-06-27T04:00:00.000Z',
    evidenceIds: ['ev-low'],
  },
  {
    id: 'mem-person-pref',
    text: 'CEO prefers terse action-first answers.',
    tags: ['person:ceo', 'preference'],
    kind: 'preference',
    source: 'conversation',
    sensitivity: 'medium',
    priority: 6,
    createdAt: '2026-06-27T02:00:00.000Z',
    updatedAt: '2026-06-27T02:00:00.000Z',
    evidenceIds: [],
  },
  {
    id: 'mem-secret',
    text: 'The production credential is sk-test-123456.',
    tags: ['person:ceo', 'credential:sk-test-123456'],
    source: 'conversation sk-test-123456',
    sensitivity: 'restricted',
    priority: 3,
    createdAt: '2026-06-27T03:00:00.000Z',
    updatedAt: '2026-06-27T03:00:00.000Z',
  },
  {
    id: 'mem-conflict',
    text: 'Conflicting preference candidate.',
    tags: ['preference'],
    source: 'conversation',
    sensitivity: 'low',
    conflictsWith: ['mem-person-pref'],
    createdAt: '2026-06-27T03:30:00.000Z',
    updatedAt: '2026-06-27T03:30:00.000Z',
  },
];

const proposals = [
  {
    id: 'memprop-1',
    status: 'pending',
    input: {
      id: 'mem-sensitive-proposal',
      text: 'Legal strategy should be remembered.',
      tags: ['sensitive'],
      sensitivity: 'high',
    },
    decision: {
      action: 'propose',
      sensitivity: 'high',
      requiresApproval: true,
      reason: 'sensitive memory requires approval',
    },
    context: {
      actor: 'agent',
      externalTaint: false,
      runtime: 'test',
      sourceKind: 'conversation',
      trust: 'unknown',
    },
    createdAt: '2026-06-27T05:00:00.000Z',
    updatedAt: '2026-06-27T05:00:00.000Z',
  },
  {
    id: 'memprop-2',
    status: 'accepted',
    input: {
      id: 'already-accepted',
      text: 'Accepted proposal.',
    },
    decision: {
      action: 'accept',
      sensitivity: 'low',
      requiresApproval: false,
      reason: 'accepted',
    },
    context: {
      actor: 'user',
      externalTaint: false,
      runtime: 'test',
      sourceKind: 'manual_note',
      trust: 'trusted',
    },
    createdAt: '2026-06-27T00:00:00.000Z',
    updatedAt: '2026-06-27T00:00:00.000Z',
  },
];

const evidence = [
  {
    id: 'ev-low',
    kind: 'manual_note',
    source: 'meeting note',
    sensitivity: 'low',
    status: 'active',
    summary: 'Decision evidence',
    createdAt: '2026-06-27T01:05:00.000Z',
  },
  {
    id: 'ev-low-secret',
    kind: 'manual_note',
    source: 'password vault sk-live-dashboard-evidence',
    sensitivity: 'low',
    status: 'active',
    summary: 'API key sk-live-dashboard-evidence',
    createdAt: '2026-06-27T01:06:00.000Z',
  },
];

const events = [
  {
    id: 'mevt-1',
    type: 'memory_accepted',
    targetType: 'memory',
    targetId: 'mem-project-decision',
    memoryId: 'mem-project-decision',
    actor: 'user',
    createdAt: '2026-06-27T01:10:00.000Z',
  },
  {
    id: 'mevt-2',
    type: 'memory_accepted',
    targetType: 'memory',
    targetId: 'mem-project-decision',
    memoryId: 'mem-project-decision',
    actor: 'user',
    createdAt: '2026-06-27T02:10:00.000Z',
  },
  {
    id: 'mevt-3',
    type: 'conflict_detected',
    targetType: 'proposal',
    targetId: 'memprop-1',
    proposalId: 'memprop-1',
    actor: 'agent',
    createdAt: '2026-06-27T05:10:00.000Z',
  },
];

test('builds grouped memory dashboard sections from governed CR payloads', () => {
  const model = buildMemoryDashboardModel({ records, proposals, evidence, events });

  assert.equal(model.counts.records, 4);
  assert.equal(model.counts.pendingProposals, 1);
  assert.equal(model.recent[0].id, 'mem-project-decision');
  assert.equal(model.pendingProposals.map((proposal) => proposal.id).join(','), 'memprop-1');
  assert.deepEqual(model.projects.map((project) => [project.key, project.count]), [['atlas', 1]]);
  assert.deepEqual(model.people.map((person) => [person.key, person.count]), [
    ['ceo', 1],
  ]);
  assert.deepEqual(model.decisions.map((record) => record.id), ['mem-project-decision']);
  assert.deepEqual(model.conflicts.map((record) => record.id), ['mem-conflict']);
  assert.deepEqual(model.sensitive.map((record) => record.id), ['mem-secret']);
  assert.equal(model.evidenceByMemory['mem-project-decision'][0].id, 'ev-low');
  assert.equal(model.frequentUse[0].id, 'mem-project-decision');
});

test('redacts sensitive memory and proposal text for dashboard display', () => {
  const model = buildMemoryDashboardModel({
    records: [
      ...records,
      {
        id: 'mem-mislabeled-secret',
        text: 'Temporary API key: sk-live-secret-dashboard-value',
        tags: ['credential:sk-live-secret-dashboard-value'],
        source: 'conversation sk-live-secret-dashboard-value',
        sensitivity: 'low',
        createdAt: '2026-06-27T06:00:00.000Z',
        updatedAt: '2026-06-27T06:00:00.000Z',
      },
    ],
    proposals,
    evidence,
    events,
  });
  const secret = model.recordsById['mem-secret'];
  const mislabeledSecret = model.recordsById['mem-mislabeled-secret'];
  const proposal = model.pendingProposals[0];

  assert.equal(redactDashboardMemoryText(secret), '[redacted: restricted memory]');
  assert.equal(secret.displayText, '[redacted: restricted memory]');
  assert.deepEqual(secret.tags, []);
  assert.equal(secret.source, undefined);
  assert.equal(mislabeledSecret.displayText, '[redacted: restricted memory]');
  assert.deepEqual(mislabeledSecret.tags, []);
  assert.equal(mislabeledSecret.source, undefined);
  assert.equal(model.evidence.find((item) => item.id === 'ev-low-secret')?.source, '[redacted: restricted evidence]');
  assert.equal(proposal.displayText, '[redacted: high memory proposal]');
  assert.equal(JSON.stringify(model), JSON.stringify(model).replace('sk-test-123456', ''));
  assert.equal(JSON.stringify(model).includes('sk-live-secret-dashboard-value'), false);
  assert.equal(JSON.stringify(model).includes('sk-live-dashboard-evidence'), false);
  assert.equal(JSON.stringify(model).includes('Legal strategy'), false);
});

test('builds correction payloads that create proposals instead of mutating memory directly', () => {
  const args = buildMemoryCorrectionProposalArgs({
    base: records[0],
    correctedText: 'Project Atlas decision corrected by user.',
    reason: 'user correction from memory dashboard',
  });

  assert.equal(args.input.id, 'mem-project-decision-correction');
  assert.equal(args.input.text, 'Project Atlas decision corrected by user.');
  assert.deepEqual(args.input.supersedes, ['mem-project-decision']);
  assert.equal(args.context.intent, 'propose');
  assert.equal(args.context.actor, 'user');
  assert.equal(args.context.sourceKind, 'manual_note');
  assert.equal(args.context.trust, 'trusted');
  assert.match(args.context.reason, /user correction/);
});
