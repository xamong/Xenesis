import { describe, expect, it } from 'vitest';
import type { MemoryApprovalProof, MemoryInput, MemoryWriteContext } from '../../src/extensions/index.js';
import { InMemoryMemoryLedgerStore, MemoryLedger } from '../../src/extensions/MemoryLedger.js';
import { InMemoryMemoryStore } from '../../src/extensions/memory.js';

const trusted: MemoryWriteContext = {
  sourceKind: 'conversation',
  trust: 'trusted',
  externalTaint: false,
  actor: 'agent',
  runtime: 'test',
  now: () => new Date('2026-01-01T00:00:00.000Z'),
};

const unknown: MemoryWriteContext = {
  ...trusted,
  sourceKind: 'unknown',
  trust: 'unknown',
};

const input: MemoryInput = {
  id: 'mem-short',
  text: '대표님은 짧고 실행 중심의 답변을 선호한다',
  tags: ['preference'],
};

const approvalProof: MemoryApprovalProof = {
  kind: 'approval-proof',
  approvedBy: 'user',
  approvalId: 'approval-1',
  action: 'approve',
  path: 'xd.memory.proposals.accept',
  source: 'mcp',
  argsHash: 'test-hash',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2999-01-01T00:10:00.000Z',
};

describe('MemoryLedger', () => {
  it('accepts low-risk trusted writes and records an event', async () => {
    const memoryStore = new InMemoryMemoryStore({ now: () => new Date('2026-01-01T00:00:00.000Z') });
    const ledger = new MemoryLedger({ memoryStore, ledgerStore: new InMemoryMemoryLedgerStore() });

    const result = await ledger.write(input, trusted);

    expect(result.status).toBe('accepted');
    expect(result.record?.id).toBe(input.id);
    expect(await ledger.getRecord(input.id)).toMatchObject({ id: input.id, status: 'active' });
    expect((await ledger.history({ memoryId: input.id })).map((event) => event.type)).toContain('memory_accepted');
  });

  it('creates proposals for unknown provenance without writing active memory', async () => {
    const memoryStore = new InMemoryMemoryStore();
    const ledger = new MemoryLedger({ memoryStore, ledgerStore: new InMemoryMemoryLedgerStore() });

    const result = await ledger.write(input, unknown);

    expect(result.status).toBe('proposed');
    expect(result.proposal?.status).toBe('pending');
    expect(await ledger.getRecord(input.id)).toBeUndefined();
    expect(await ledger.listProposals({ status: 'pending' })).toHaveLength(1);
  });

  it('rejects ordinary same-id rewrites instead of destructively overwriting memory history', async () => {
    const ledger = new MemoryLedger({
      memoryStore: new InMemoryMemoryStore({ now: () => new Date('2026-01-01T00:00:00.000Z') }),
      ledgerStore: new InMemoryMemoryLedgerStore(),
    });
    await ledger.write(input, trusted);

    await expect(
      ledger.write(
        {
          ...input,
          text: '대표님은 장황한 설명을 선호한다',
        },
        {
          ...trusted,
          now: () => new Date('2026-02-01T00:00:00.000Z'),
        },
      ),
    ).rejects.toThrow(/temporal supersede|already exists|same id/i);

    expect(await ledger.getRecord(input.id)).toMatchObject({
      id: input.id,
      text: input.text,
    });
    expect(
      (await ledger.history({ memoryId: input.id })).filter((event) => event.type === 'memory_accepted'),
    ).toHaveLength(1);
  });

  it('explicit propose always creates a proposal', async () => {
    const ledger = new MemoryLedger({
      memoryStore: new InMemoryMemoryStore(),
      ledgerStore: new InMemoryMemoryLedgerStore(),
    });

    const proposal = await ledger.propose(input, trusted);

    expect(proposal.status).toBe('pending');
    expect(proposal.decision.requiresApproval).toBe(true);
    expect(await ledger.getRecord(input.id)).toBeUndefined();
  });

  it('archives instead of hard-deleting and keeps audit history', async () => {
    const ledger = new MemoryLedger({
      memoryStore: new InMemoryMemoryStore({ now: () => new Date('2026-01-01T00:00:00.000Z') }),
      ledgerStore: new InMemoryMemoryLedgerStore(),
    });
    await ledger.write(input, trusted);

    const event = await ledger.archive(input.id, trusted);

    expect(event.type).toBe('memory_archived');
    expect(await ledger.getRecord(input.id)).toMatchObject({ id: input.id, status: 'archived' });
    expect((await ledger.listRecords()).map((record) => record.id)).not.toContain(input.id);
    expect((await ledger.history({ memoryId: input.id })).map((entry) => entry.type)).toEqual([
      'memory_accepted',
      'memory_archived',
    ]);
  });

  it('decision methods require approval proof', async () => {
    const ledger = new MemoryLedger({
      memoryStore: new InMemoryMemoryStore(),
      ledgerStore: new InMemoryMemoryLedgerStore(),
    });

    await expect(ledger.acceptProposal('proposal-1', undefined as never)).rejects.toThrow(/approval_proof_required/);
    await expect(ledger.rejectProposal('proposal-1', undefined as never)).rejects.toThrow(/approval_proof_required/);
  });

  it('accepts a pending proposal only with a valid approval proof', async () => {
    const ledger = new MemoryLedger({
      memoryStore: new InMemoryMemoryStore({ now: () => new Date('2026-01-01T00:00:00.000Z') }),
      ledgerStore: new InMemoryMemoryLedgerStore(),
    });
    const proposal = await ledger.propose(input, unknown);

    const result = await ledger.acceptProposal(proposal.id, approvalProof);

    expect(result.status).toBe('accepted');
    expect(result.record).toMatchObject({ id: input.id, text: input.text, status: 'active' });
    expect(await ledger.getProposal(proposal.id)).toMatchObject({
      id: proposal.id,
      status: 'accepted',
      memoryId: input.id,
    });
    expect((await ledger.history({ proposalId: proposal.id })).map((event) => event.type)).toEqual([
      'proposal_created',
      'proposal_accepted',
      'memory_accepted',
    ]);
  });

  it('rejects expired or incomplete approval proofs', async () => {
    const ledger = new MemoryLedger({
      memoryStore: new InMemoryMemoryStore(),
      ledgerStore: new InMemoryMemoryLedgerStore(),
    });
    const proposal = await ledger.propose(input, unknown);

    await expect(
      ledger.acceptProposal(proposal.id, {
        ...approvalProof,
        expiresAt: '2026-01-01T00:10:00.000Z',
      }),
    ).rejects.toThrow(/approval_proof_expired/);
    await expect(
      ledger.acceptProposal(proposal.id, {
        kind: 'approval-proof',
        approvedBy: 'user',
        approvalId: 'minimal',
        createdAt: '2999-01-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(/approval_proof_required/);
  });

  it('rejects a pending proposal only with a valid rejection proof', async () => {
    const ledger = new MemoryLedger({
      memoryStore: new InMemoryMemoryStore(),
      ledgerStore: new InMemoryMemoryLedgerStore(),
    });
    const proposal = await ledger.propose(input, unknown);

    const rejected = await ledger.rejectProposal(proposal.id, {
      ...approvalProof,
      action: 'reject',
      path: 'xd.memory.proposals.reject',
      approvalId: 'approval-reject-1',
    });

    expect(rejected).toMatchObject({ id: proposal.id, status: 'rejected' });
    expect(await ledger.getRecord(input.id)).toBeUndefined();
    expect((await ledger.history({ proposalId: proposal.id })).map((event) => event.type)).toEqual([
      'proposal_created',
      'proposal_rejected',
    ]);
  });

  it('serializes concurrent proposal decisions so only one terminal state wins', async () => {
    const ledger = new MemoryLedger({
      memoryStore: new InMemoryMemoryStore(),
      ledgerStore: new InMemoryMemoryLedgerStore(),
    });
    const proposal = await ledger.propose(input, unknown);

    const results = await Promise.allSettled([
      ledger.acceptProposal(proposal.id, approvalProof),
      ledger.rejectProposal(proposal.id, {
        ...approvalProof,
        action: 'reject',
        path: 'xd.memory.proposals.reject',
        approvalId: 'approval-reject-2',
      }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const stored = await ledger.getProposal(proposal.id);
    expect(stored?.status === 'accepted' || stored?.status === 'rejected').toBe(true);
    const terminalEvents = (await ledger.history({ proposalId: proposal.id }))
      .map((event) => event.type)
      .filter((eventType) => eventType === 'proposal_accepted' || eventType === 'proposal_rejected');
    expect(terminalEvents).toHaveLength(1);
  });
});
