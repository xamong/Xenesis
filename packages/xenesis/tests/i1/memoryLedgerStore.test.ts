import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { closeAllDatabases, openDatabase } from '../../src/db/database.js';
import type { MemoryEvidenceRecord, MemoryLedgerEvent, MemoryProposal } from '../../src/extensions/index.js';
import { SqliteMemoryLedgerStore } from '../../src/extensions/SqliteMemoryLedgerStore.js';

let homes: string[] = [];

afterEach(async () => {
  closeAllDatabases();
  for (const home of homes) await rm(home, { recursive: true, force: true });
  homes = [];
});

async function tempHome() {
  const home = await mkdtemp(join(tmpdir(), 'memory-ledger-store-'));
  homes.push(home);
  return home;
}

describe('SqliteMemoryLedgerStore', () => {
  it('migration creates TableStore-compatible sidecar tables with rev columns', async () => {
    const home = await tempHome();
    const db = openDatabase(home);

    for (const table of ['memory_proposals', 'memory_evidence', 'memory_ledger_events']) {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
      expect(columns.map((column) => column.name)).toContain('rev');
    }
  });

  it('persists proposals, evidence, and events', async () => {
    const home = await tempHome();
    const store = new SqliteMemoryLedgerStore({ xenesisHome: home });
    const proposal: MemoryProposal = {
      id: 'proposal-1',
      status: 'pending',
      input: { id: 'mem-1', text: 'prefers concise answers' },
      decision: { action: 'propose', sensitivity: 'low', requiresApproval: false, reason: 'test' },
      context: { sourceKind: 'unknown', trust: 'unknown', externalTaint: false, actor: 'agent', runtime: 'test' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const evidence: MemoryEvidenceRecord = {
      id: 'evidence-1',
      kind: 'conversation',
      source: 'test',
      sensitivity: 'low',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: { turn: 1 },
    };
    const event: MemoryLedgerEvent = {
      id: 'event-1',
      type: 'proposal_created',
      targetType: 'proposal',
      targetId: proposal.id,
      proposalId: proposal.id,
      createdAt: '2026-01-01T00:00:00.000Z',
      actor: 'agent',
      reason: 'test',
    };

    await store.saveProposal(proposal);
    await store.saveEvidence(evidence);
    await store.appendEvent(event);

    expect(await store.getProposal(proposal.id)).toEqual(proposal);
    expect(await store.getEvidence(evidence.id)).toEqual(evidence);
    expect(await store.listEvents({ proposalId: proposal.id })).toEqual([event]);
  });
});
