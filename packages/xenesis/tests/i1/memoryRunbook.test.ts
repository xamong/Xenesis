import { describe, expect, it } from 'vitest';
import type { MemoryWriteContext } from '../../src/extensions/index.js';
import { InMemoryMemoryLedgerStore, MemoryLedger } from '../../src/extensions/MemoryLedger.js';
import { InMemoryMemoryStore } from '../../src/extensions/memory.js';
import { buildMemoryEvidencePackSystemMessage } from '../../src/extensions/memoryEvidencePack.js';
import { MemoryRetrievalPlanner } from '../../src/extensions/memoryRetrievalPlanner.js';
import {
  canRunbookExecuteWithoutApproval,
  createRunbookMemoryInput,
  normalizeMemoryRunbook,
} from '../../src/extensions/memoryRunbook.js';
import { createMemoryTool } from '../../src/tools/memoryTool.js';
import type { ToolContext } from '../../src/tools/types.js';

const now = '2026-06-01T00:00:00.000Z';

function userTrustedAt(iso = now): MemoryWriteContext {
  return {
    sourceKind: 'manual_note',
    trust: 'trusted',
    externalTaint: false,
    actor: 'user',
    runtime: 'test',
    now: () => new Date(iso),
  };
}

function agentTrustedAt(iso = now): MemoryWriteContext {
  return {
    ...userTrustedAt(iso),
    sourceKind: 'agent',
    actor: 'agent',
  };
}

function createLedger(iso = now) {
  const memoryStore = new InMemoryMemoryStore({ now: () => new Date(iso) });
  const ledgerStore = new InMemoryMemoryLedgerStore();
  const ledger = new MemoryLedger({ memoryStore, ledgerStore });
  return { ledger, memoryStore, ledgerStore };
}

function toolContext(): ToolContext {
  return {
    workspaceRoot: 'E:/tmp',
    cwd: 'E:/tmp',
    sessionId: 'runbook-test-session',
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  };
}

describe('procedural runbook memory', () => {
  it('accepts manual low-risk draft runbooks as active procedure memory', async () => {
    const { ledger } = createLedger();
    const runbook = normalizeMemoryRunbook({
      trigger: '새 스타트업 검토해줘',
      steps: ['회사 개요 추출', '시장 규모 확인', '리스크 5개 도출'],
      preferredFormat: ['한 페이지 요약', '마지막에 내 판단 섹션'],
      evidenceRequired: ['출처 3개 이상'],
      permissionLevel: 'draft',
    });

    const result = await ledger.write(
      createRunbookMemoryInput({
        id: 'runbook-investment-review',
        runbook,
        tags: ['procedure', 'investment'],
      }),
      userTrustedAt(),
    );

    expect(result.status).toBe('accepted');
    expect(result.record).toMatchObject({
      id: 'runbook-investment-review',
      kind: 'procedure',
      status: 'active',
      runbook,
    });
  });

  it('creates proposals for agent-inferred runbooks', async () => {
    const { ledger } = createLedger();

    const result = await ledger.write(
      createRunbookMemoryInput({
        id: 'runbook-agent-inferred',
        runbook: normalizeMemoryRunbook({
          trigger: '회의록 정리해줘',
          steps: ['결정사항 추출', '액션아이템 추출'],
          preferredFormat: ['bullet list'],
          evidenceRequired: ['회의 원문'],
        }),
      }),
      agentTrustedAt(),
    );

    expect(result.status).toBe('proposed');
    expect(result.proposal).toMatchObject({
      status: 'pending',
      input: {
        id: 'runbook-agent-inferred',
        kind: 'procedure',
      },
    });
    expect(await ledger.getRecord('runbook-agent-inferred')).toBeUndefined();
  });

  it('updates runbooks through temporal supersede history', async () => {
    const { ledger } = createLedger();
    await ledger.write(
      createRunbookMemoryInput({
        id: 'runbook-research-v1',
        runbook: normalizeMemoryRunbook({
          trigger: '기술 리서치 해줘',
          steps: ['논문 검색', '요약'],
          preferredFormat: ['짧은 요약'],
          evidenceRequired: ['출처'],
        }),
        validFrom: '2026-01-01T00:00:00.000Z',
      }),
      userTrustedAt('2026-01-01T00:00:00.000Z'),
    );

    const supersede = await ledger.supersedeRecord(
      'runbook-research-v1',
      createRunbookMemoryInput({
        id: 'runbook-research-v2',
        runbook: normalizeMemoryRunbook({
          trigger: '기술 리서치 해줘',
          steps: ['논문 검색', '벤치마크 확인', '요약'],
          preferredFormat: ['짧은 요약'],
          evidenceRequired: ['출처', '벤치마크 링크'],
        }),
        validFrom: '2026-05-01T00:00:00.000Z',
      }),
      userTrustedAt('2026-05-01T00:00:00.000Z'),
    );

    expect(supersede.status).toBe('accepted');
    expect(await ledger.getRecord('runbook-research-v1')).toMatchObject({
      validTo: '2026-05-01T00:00:00.000Z',
      supersededBy: 'runbook-research-v2',
    });
    expect((await ledger.history({ memoryId: 'runbook-research-v1' })).map((event) => event.type)).toContain(
      'superseded',
    );
  });

  it('does not allow same-id runbook updates to overwrite temporal history', async () => {
    const { ledger } = createLedger();
    await ledger.write(
      createRunbookMemoryInput({
        id: 'runbook-same-id',
        runbook: normalizeMemoryRunbook({
          trigger: '리서치',
          steps: ['논문 검색'],
          preferredFormat: ['summary'],
          evidenceRequired: ['source'],
        }),
      }),
      userTrustedAt('2026-01-01T00:00:00.000Z'),
    );

    await expect(
      ledger.write(
        createRunbookMemoryInput({
          id: 'runbook-same-id',
          runbook: normalizeMemoryRunbook({
            trigger: '리서치',
            steps: ['논문 검색', '벤치마크 확인'],
            preferredFormat: ['summary'],
            evidenceRequired: ['source'],
          }),
        }),
        userTrustedAt('2026-05-01T00:00:00.000Z'),
      ),
    ).rejects.toThrow(/supersede/i);

    expect(await ledger.getRecord('runbook-same-id')).toMatchObject({
      id: 'runbook-same-id',
      runbook: { steps: ['논문 검색'] },
    });
  });

  it('retrieves procedure runbooks without granting external tool execution', async () => {
    const { ledger } = createLedger();
    await ledger.write(
      createRunbookMemoryInput({
        id: 'runbook-investment-review',
        runbook: normalizeMemoryRunbook({
          trigger: '투자 검토 메모 작성',
          steps: ['시장 규모 확인', '경쟁사 비교', '리스크 도출'],
          preferredFormat: ['one-page memo'],
          evidenceRequired: ['최신 출처'],
        }),
      }),
      userTrustedAt(),
    );

    const pack = await new MemoryRetrievalPlanner(ledger).retrieve({
      query: '투자 검토 절차 알려줘',
      at: now,
    });

    expect(pack.intent).toBe('procedure');
    expect(pack.records.map((record) => record.id)).toEqual(['runbook-investment-review']);
    expect(pack.records[0]?.runbook?.steps).toContain('경쟁사 비교');
    expect(canRunbookExecuteWithoutApproval(pack.records[0]?.runbook)).toBe(false);
  });

  it('indexes and renders structured runbook fields even with custom text', async () => {
    const { ledger } = createLedger();
    await ledger.write(
      createRunbookMemoryInput({
        id: 'runbook-custom-text',
        text: 'procedure metadata',
        runbook: normalizeMemoryRunbook({
          trigger: '후보자 비교표',
          steps: ['이력 확인', '레퍼런스 확인'],
          preferredFormat: ['comparison table'],
          evidenceRequired: ['resume', 'interview notes'],
        }),
      }),
      userTrustedAt(),
    );

    const pack = await new MemoryRetrievalPlanner(ledger).retrieve({
      query: '레퍼런스 확인 절차',
      at: now,
    });
    const message = buildMemoryEvidencePackSystemMessage(pack);

    expect(pack.records.map((record) => record.id)).toEqual(['runbook-custom-text']);
    expect(message?.content).toContain('레퍼런스 확인');
    expect(message?.content).toContain('후보자 비교표');
  });

  it('preserves execute_requires_approval as a normal approval requirement', async () => {
    const { ledger } = createLedger();
    const result = await ledger.write(
      createRunbookMemoryInput({
        id: 'runbook-email-draft',
        runbook: normalizeMemoryRunbook({
          trigger: '고객에게 팔로업 보내줘',
          steps: ['이전 대화 확인', '이메일 초안 작성', '발송 전 승인 요청'],
          preferredFormat: ['email draft'],
          evidenceRequired: ['이전 이메일'],
          permissionLevel: 'execute_requires_approval',
        }),
      }),
      userTrustedAt(),
    );

    expect(result.status).toBe('accepted');
    expect(result.record?.runbook?.permissionLevel).toBe('execute_requires_approval');
    expect(canRunbookExecuteWithoutApproval(result.record?.runbook)).toBe(false);
  });

  it('classifies sensitive runbook fields even when custom text is benign', async () => {
    const { ledger } = createLedger();

    const result = await ledger.write(
      createRunbookMemoryInput({
        id: 'runbook-sensitive-step',
        text: 'maintenance procedure',
        runbook: normalizeMemoryRunbook({
          trigger: 'credential rotation',
          steps: ['read API_KEY=sk-runbook-secret before drafting'],
          preferredFormat: ['checklist'],
          evidenceRequired: ['vault reference'],
        }),
      }),
      userTrustedAt(),
    );

    expect(result.status).toBe('proposed');
    expect(result.proposal?.decision.sensitivity).toBe('restricted');
    expect(await ledger.getRecord('runbook-sensitive-step')).toBeUndefined();
  });

  it('rejects invalid runbooks before persistence', async () => {
    const { ledger } = createLedger();

    await expect(
      ledger.write(
        {
          id: 'runbook-invalid',
          kind: 'procedure',
          text: 'invalid procedure',
          tags: ['procedure'],
          runbook: {
            trigger: '',
            steps: [],
            preferredFormat: [],
            evidenceRequired: [],
            permissionLevel: 'draft',
          },
        },
        userTrustedAt(),
      ),
    ).rejects.toThrow(/runbook/i);

    expect(await ledger.getRecord('runbook-invalid')).toBeUndefined();
  });

  it('raw memory stores reject invalid procedure runbooks before persistence', async () => {
    const store = new InMemoryMemoryStore();

    await expect(
      store.upsert({
        id: 'raw-invalid-runbook',
        kind: 'procedure',
        text: 'invalid',
        tags: [],
        runbook: {
          trigger: '',
          steps: [],
          preferredFormat: [],
          evidenceRequired: [],
          permissionLevel: 'draft',
        },
      }),
    ).rejects.toThrow(/runbook/i);

    expect(await store.get('raw-invalid-runbook')).toBeUndefined();
  });

  it('memory tool can propose model-facing runbooks but cannot execute them', async () => {
    const { ledger } = createLedger();
    const memoryTool = createMemoryTool(ledger, { writeContext: () => agentTrustedAt() });

    const result = await memoryTool.run(
      {
        action: 'save',
        id: 'runbook-tool',
        runbook: {
          trigger: '월간 보고서 작성',
          steps: ['데이터 수집', '요약 작성'],
          preferredFormat: ['report draft'],
          evidenceRequired: ['원본 데이터'],
        },
      },
      toolContext(),
    );

    expect(result.ok).toBe(true);
    expect(result.content).toContain('proposed');
    expect(await ledger.getRecord('runbook-tool')).toBeUndefined();
    expect(memoryTool.inputSchema.safeParse({ action: 'execute', id: 'runbook-tool' }).success).toBe(false);
  });
});
