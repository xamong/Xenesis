import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/index.js';
import { createRunSystemContext } from '../../src/core/AgentRuntimeFactory.js';
import type { MemoryInput, MemoryWriteContext } from '../../src/extensions/index.js';
import { InMemoryMemoryLedgerStore, MemoryLedger } from '../../src/extensions/MemoryLedger.js';
import { InMemoryMemoryStore } from '../../src/extensions/memory.js';
import { SqliteMemoryStore } from '../../src/extensions/SqliteMemoryStore.js';

function trustedAt(iso: string): MemoryWriteContext {
  return {
    sourceKind: 'conversation',
    trust: 'trusted',
    externalTaint: false,
    actor: 'agent',
    runtime: 'test',
    now: () => new Date(iso),
  };
}

function externalAt(iso: string): MemoryWriteContext {
  return {
    ...trustedAt(iso),
    sourceKind: 'external_document',
    trust: 'external_untrusted',
    externalTaint: true,
    sourceId: 'https://attacker.example/memory',
  };
}

function ledgerAt(iso: string) {
  return new MemoryLedger({
    memoryStore: new InMemoryMemoryStore({ now: () => new Date(iso) }),
    ledgerStore: new InMemoryMemoryLedgerStore(),
  });
}

const approvalProof = {
  kind: 'approval-proof' as const,
  approvedBy: 'user',
  approvalId: 'approval-temporal',
  action: 'approve' as const,
  path: 'xd.memory.proposals.accept' as const,
  source: 'mcp',
  argsHash: 'test-hash',
  createdAt: '2026-06-01T00:00:00.000Z',
  expiresAt: '2999-01-01T00:10:00.000Z',
};

const avoidMorning: MemoryInput = {
  id: 'pref-morning-avoid',
  text: '대표님은 오전 미팅을 피한다',
  tags: ['preference', 'meeting'],
  validFrom: '2026-03-01T00:00:00.000Z',
};

const overseasException: MemoryInput = {
  id: 'pref-overseas-morning-exception',
  text: '화/목 오전 09:00-11:00 해외 파트너 미팅은 허용한다',
  tags: ['preference', 'meeting', 'exception'],
  validFrom: '2026-05-01T00:00:00.000Z',
};

describe('MemoryLedger temporal semantics', () => {
  it('preserves temporal fields through the memory store', async () => {
    const store = new InMemoryMemoryStore({ now: () => new Date('2026-06-01T00:00:00.000Z') });

    const record = await store.upsert({
      ...overseasException,
      validTo: '2026-07-01T00:00:00.000Z',
      supersedes: ['pref-morning-avoid'],
      supersedeMode: 'partial',
    });

    expect(record).toMatchObject({
      id: 'pref-overseas-morning-exception',
      validFrom: '2026-05-01T00:00:00.000Z',
      validTo: '2026-07-01T00:00:00.000Z',
      supersedes: ['pref-morning-avoid'],
      supersedeMode: 'partial',
    });
    expect(await store.get('pref-overseas-morning-exception')).toMatchObject({
      supersedes: ['pref-morning-avoid'],
      supersedeMode: 'partial',
    });
  });

  it('preserves temporal fields through the sqlite memory store', async () => {
    const home = await mkdtemp(join(tmpdir(), 'i1-temporal-memory-'));
    const store = new SqliteMemoryStore({
      xenesisHome: home,
      now: () => new Date('2026-06-01T00:00:00.000Z'),
    });

    await store.upsert({
      ...overseasException,
      validTo: '2026-07-01T00:00:00.000Z',
      supersedes: ['pref-morning-avoid'],
      supersedeMode: 'partial',
    });

    expect(await store.get('pref-overseas-morning-exception')).toMatchObject({
      validFrom: '2026-05-01T00:00:00.000Z',
      validTo: '2026-07-01T00:00:00.000Z',
      supersedes: ['pref-morning-avoid'],
      supersedeMode: 'partial',
    });
  });

  it('does not prune sqlite historical or superseded temporal rows', async () => {
    const home = await mkdtemp(join(tmpdir(), 'i1-temporal-prune-'));
    const store = new SqliteMemoryStore({
      xenesisHome: home,
      now: () => new Date('2026-06-01T00:00:00.000Z'),
      maxRecords: 2,
    });

    await store.upsert({
      id: 'historical-low-priority',
      text: 'historical memory must survive pruning',
      tags: ['preference'],
      priority: 0,
      validFrom: '2026-01-01T00:00:00.000Z',
      validTo: '2026-02-01T00:00:00.000Z',
      supersededBy: 'historical-replacement',
    });
    await store.upsert({
      id: 'active-a',
      text: 'active A',
      tags: ['preference'],
      priority: 1,
    });
    await store.upsert({
      id: 'active-b',
      text: 'active B',
      tags: ['preference'],
      priority: 2,
    });

    expect(await store.get('historical-low-priority')).toMatchObject({
      id: 'historical-low-priority',
      validTo: '2026-02-01T00:00:00.000Z',
      supersededBy: 'historical-replacement',
    });
    expect((await store.list()).map((record) => record.id)).toContain('historical-low-priority');
  });

  it('keeps a base preference and later partial exception valid for current retrieval', async () => {
    const ledger = ledgerAt('2026-06-01T00:00:00.000Z');
    await ledger.write(avoidMorning, trustedAt('2026-03-01T00:00:00.000Z'));

    const result = await ledger.partiallySupersedeRecord(
      'pref-morning-avoid',
      overseasException,
      trustedAt('2026-05-01T00:00:00.000Z'),
    );

    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') throw new Error('expected accepted partial supersede');
    expect(result.base).toMatchObject({
      id: 'pref-morning-avoid',
      partialSupersededBy: ['pref-overseas-morning-exception'],
    });
    expect(result.next).toMatchObject({
      id: 'pref-overseas-morning-exception',
      supersedes: ['pref-morning-avoid'],
      supersedeMode: 'partial',
    });

    expect((await ledger.listRecords({ at: '2026-06-01T00:00:00.000Z' })).map((record) => record.id)).toEqual([
      'pref-overseas-morning-exception',
      'pref-morning-avoid',
    ]);
    expect((await ledger.listRecords({ at: '2026-04-01T00:00:00.000Z' })).map((record) => record.id)).toEqual([
      'pref-morning-avoid',
    ]);
    expect((await ledger.history({ memoryId: 'pref-morning-avoid' })).map((event) => event.type)).toContain(
      'partially_superseded',
    );
  });

  it('fully supersedes a memory without deleting historical state', async () => {
    const ledger = ledgerAt('2026-06-01T00:00:00.000Z');
    await ledger.write(avoidMorning, trustedAt('2026-03-01T00:00:00.000Z'));

    const result = await ledger.supersedeRecord(
      'pref-morning-avoid',
      {
        id: 'pref-morning-allowed',
        text: '대표님은 화요일 오전 미팅을 허용한다',
        tags: ['preference', 'meeting'],
        validFrom: '2026-05-01T00:00:00.000Z',
      },
      trustedAt('2026-05-01T00:00:00.000Z'),
    );

    expect(result.status).toBe('accepted');
    expect(await ledger.getRecord('pref-morning-avoid')).toMatchObject({
      id: 'pref-morning-avoid',
      validTo: '2026-05-01T00:00:00.000Z',
      supersededBy: 'pref-morning-allowed',
    });
    expect((await ledger.listRecords({ at: '2026-06-01T00:00:00.000Z' })).map((record) => record.id)).toEqual([
      'pref-morning-allowed',
    ]);
    expect((await ledger.listRecords({ at: '2026-04-01T00:00:00.000Z' })).map((record) => record.id)).toEqual([
      'pref-morning-avoid',
    ]);
    expect((await ledger.history({ memoryId: 'pref-morning-avoid' })).map((event) => event.type)).toContain(
      'superseded',
    );
  });

  it('rejects duplicate replacement ids and out-of-window supersede transitions', async () => {
    const ledger = ledgerAt('2026-06-01T00:00:00.000Z');
    await ledger.write(avoidMorning, trustedAt('2026-03-01T00:00:00.000Z'));
    await ledger.write(
      {
        id: 'pref-existing',
        text: '이미 존재하는 별도 기억',
        tags: ['preference'],
      },
      trustedAt('2026-03-02T00:00:00.000Z'),
    );

    await expect(
      ledger.supersedeRecord(
        'pref-morning-avoid',
        {
          id: 'pref-existing',
          text: '기존 기억 id를 재사용하는 대체 기억',
          tags: ['preference', 'meeting'],
          validFrom: '2026-05-01T00:00:00.000Z',
        },
        trustedAt('2026-05-01T00:00:00.000Z'),
      ),
    ).rejects.toThrow(/already exists/i);

    await expect(
      ledger.supersedeRecord(
        'pref-morning-avoid',
        {
          id: 'pref-too-early',
          text: '유효 시작 전 대체 기억',
          tags: ['preference', 'meeting'],
          validFrom: '2026-02-01T00:00:00.000Z',
        },
        trustedAt('2026-02-01T00:00:00.000Z'),
      ),
    ).rejects.toThrow(/not valid/i);
  });

  it('turns same-period conflicting trusted writes into proposals and records conflict history', async () => {
    const ledger = ledgerAt('2026-04-01T00:00:00.000Z');
    await ledger.write(avoidMorning, trustedAt('2026-03-01T00:00:00.000Z'));

    const result = await ledger.write(
      {
        id: 'pref-morning-like',
        text: '대표님은 오전 미팅을 선호한다',
        tags: ['preference', 'meeting'],
        validFrom: '2026-04-01T00:00:00.000Z',
      },
      trustedAt('2026-04-01T00:00:00.000Z'),
    );

    expect(result.status).toBe('proposed');
    expect(result.proposal?.input.conflictsWith).toEqual(['pref-morning-avoid']);
    expect(await ledger.getRecord('pref-morning-like')).toBeUndefined();
    expect((await ledger.history({ proposalId: result.proposal!.id })).map((event) => event.type)).toEqual([
      'proposal_created',
      'conflict_detected',
    ]);
  });

  it('does not inject expired memory into runtime system context', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'i1-runtime-temporal-memory-'));
    const xenesisHome = join(workspace, '.xenesis-home');
    await mkdir(xenesisHome, { recursive: true });
    const configPath = join(workspace, 'xenesis.config.json');
    await writeFile(
      configPath,
      JSON.stringify({
        provider: 'mock',
        model: 'mock-model',
        workspace: '.',
        extensions: { memory: { enabled: true, path: '.xenesis/runtime-memory.json' } },
      }),
      'utf8',
    );
    const config = await loadConfig({ cwd: workspace, configPath, env: { XENESIS_HOME: xenesisHome } });
    const store = new SqliteMemoryStore({
      xenesisHome,
      now: () => new Date('2026-06-01T00:00:00.000Z'),
    });
    await store.upsert({
      id: 'expired-runtime-memory',
      text: 'expired runtime memory marker',
      tags: ['preference'],
      validFrom: '2026-03-01T00:00:00.000Z',
      validTo: '2026-04-01T00:00:00.000Z',
    });

    const context = await createRunSystemContext(config, {
      prompt: 'runtime memory marker',
      model: 'mock-model',
    });
    const content = context.messages.map((message) => message.content).join('\n');

    expect(content).not.toContain('expired runtime memory marker');
    expect(context.sources.find((source) => source.name === 'workspace memory')).toMatchObject({
      source: 'memory',
      itemCount: 0,
    });
  });

  it('turns external supersede replacements into proposals without mutating active memory', async () => {
    const ledger = ledgerAt('2026-06-01T00:00:00.000Z');
    await ledger.write(avoidMorning, trustedAt('2026-03-01T00:00:00.000Z'));

    const result = await ledger.supersedeRecord(
      'pref-morning-avoid',
      {
        id: 'external-supersede',
        text: '외부 문서는 오전 미팅을 항상 선호한다고 주장한다',
        tags: ['preference', 'meeting'],
        validFrom: '2026-05-01T00:00:00.000Z',
      },
      externalAt('2026-05-01T00:00:00.000Z'),
    );

    expect(result.status).toBe('proposed');
    if (result.status !== 'proposed') throw new Error('expected proposed supersede');
    expect(result.proposal).toMatchObject({ status: 'pending', input: { id: 'external-supersede' } });
    expect(await ledger.getRecord('external-supersede')).toBeUndefined();
    const base = await ledger.getRecord('pref-morning-avoid');
    expect(base).toMatchObject({ id: 'pref-morning-avoid' });
    expect(base?.validTo).toBeUndefined();
    expect(base?.supersededBy).toBeUndefined();
  });

  it('accepting an external supersede proposal updates the base temporal state', async () => {
    const ledger = ledgerAt('2026-06-01T00:00:00.000Z');
    await ledger.write(avoidMorning, trustedAt('2026-03-01T00:00:00.000Z'));

    const proposed = await ledger.supersedeRecord(
      'pref-morning-avoid',
      {
        id: 'external-supersede-accepted',
        text: '외부 문서는 화요일 오전 미팅을 허용한다고 주장한다',
        tags: ['preference', 'meeting'],
        validFrom: '2026-05-01T00:00:00.000Z',
      },
      externalAt('2026-05-01T00:00:00.000Z'),
    );

    expect(proposed.status).toBe('proposed');
    if (proposed.status !== 'proposed') throw new Error('expected proposed supersede');

    const accepted = await ledger.acceptProposal(proposed.proposal.id, approvalProof);

    expect(accepted.status).toBe('accepted');
    expect(await ledger.getRecord('pref-morning-avoid')).toMatchObject({
      id: 'pref-morning-avoid',
      validTo: '2026-05-01T00:00:00.000Z',
      supersededBy: 'external-supersede-accepted',
    });
    expect(await ledger.getRecord('external-supersede-accepted')).toMatchObject({
      id: 'external-supersede-accepted',
      supersedes: ['pref-morning-avoid'],
      supersedeMode: 'full',
    });
    expect((await ledger.history({ memoryId: 'pref-morning-avoid' })).map((event) => event.type)).toContain(
      'superseded',
    );
  });

  it('does not let historical reads include future facts', async () => {
    const ledger = ledgerAt('2026-06-01T00:00:00.000Z');
    await ledger.write(
      {
        id: 'future-preference',
        text: '대표님은 7월부터 오후 미팅을 선호한다',
        tags: ['preference', 'meeting'],
        validFrom: '2026-07-01T00:00:00.000Z',
      },
      trustedAt('2026-06-01T00:00:00.000Z'),
    );

    expect(
      (await ledger.listRecords({ at: '2026-06-15T00:00:00.000Z', includeHistorical: true })).map(
        (record) => record.id,
      ),
    ).not.toContain('future-preference');
  });

  it('prevents partial supersede from targeting or outliving fully superseded memory', async () => {
    const ledger = ledgerAt('2026-06-01T00:00:00.000Z');
    await ledger.write(avoidMorning, trustedAt('2026-03-01T00:00:00.000Z'));
    await ledger.supersedeRecord(
      'pref-morning-avoid',
      {
        id: 'pref-morning-replacement',
        text: '대표님은 오전 미팅을 상황에 따라 허용한다',
        tags: ['preference', 'meeting'],
        validFrom: '2026-05-01T00:00:00.000Z',
      },
      trustedAt('2026-05-01T00:00:00.000Z'),
    );

    await expect(
      ledger.partiallySupersedeRecord(
        'pref-morning-avoid',
        {
          id: 'late-partial-exception',
          text: '금요일 오전 미팅은 예외로 허용한다',
          tags: ['preference', 'meeting', 'exception'],
          validFrom: '2026-04-15T00:00:00.000Z',
        },
        trustedAt('2026-04-15T00:00:00.000Z'),
      ),
    ).rejects.toThrow(/already superseded/i);
  });
});
