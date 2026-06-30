import { describe, expect, test } from 'vitest';

import {
  buildProviderAcceptanceRecord,
  evaluateAcceptanceChecks,
  type ProviderAcceptanceInput,
} from '../../src/evaluation/providerAcceptance.js';

describe('provider acceptance', () => {
  test('passes only when provider, process model, CR path, and readback match', () => {
    const input: ProviderAcceptanceInput = {
      scenarioId: 'desk-read',
      prompt: '현재 Desk 상태 알려줘',
      expected: {
        provider: 'codex-app-server',
        processModel: 'persistent-process',
        capabilityPaths: ['xd.app.status'],
        readbacks: ['xd.app.status'],
      },
      observed: {
        provider: 'codex-app-server',
        profileSource: 'profile:auto',
        processModel: 'persistent-process',
        toolCalls: ['xenesis_desk_call_capability'],
        capabilityPaths: ['xd.app.status'],
        readbacks: ['xd.app.status'],
        approvalRecords: [],
        text: 'Desk 상태입니다.',
      },
    };

    const record = buildProviderAcceptanceRecord(input);

    expect(record.status).toBe('passed');
    expect(record.crChecks.every((check) => check.passed)).toBe(true);
    expect(record.readbackChecks.every((check) => check.passed)).toBe(true);
  });

  test('fails when final text exists but required CR evidence is absent', () => {
    const record = buildProviderAcceptanceRecord({
      scenarioId: 'desk-read',
      prompt: '현재 Desk 상태 알려줘',
      expected: {
        provider: 'codex-app-server',
        capabilityPaths: ['xd.app.status'],
        readbacks: ['xd.app.status'],
      },
      observed: {
        provider: 'codex-app-server',
        profileSource: 'profile:auto',
        toolCalls: [],
        capabilityPaths: [],
        readbacks: [],
        approvalRecords: [],
        text: '상태가 정상입니다.',
      },
    });

    expect(record.status).toBe('failed');
    expect(record.errors).toContain('missing capability path: xd.app.status');
    expect(record.errors).toContain('missing readback: xd.app.status');
  });

  test('detects raw approval internals in user-facing text', () => {
    const checks = evaluateAcceptanceChecks({
      scenarioId: 'approval-stop',
      prompt: '외부 폴더 열어줘',
      expected: { forbidsInternalLeak: true },
      observed: {
        provider: 'codex-cli',
        profileSource: 'profile:codex',
        toolCalls: [],
        capabilityPaths: [],
        readbacks: [],
        approvalRecords: ['approval-1'],
        text: 'approvalRequired=true actionInboxItem.id=abc',
      },
    });

    expect(checks.internalLeakChecks[0]?.passed).toBe(false);
  });

  test('detects common internal ids and secrets in user-facing text', () => {
    const record = buildProviderAcceptanceRecord({
      scenarioId: 'approval-stop',
      prompt: '외부 폴더 열어줘',
      expected: { forbidsInternalLeak: true },
      observed: {
        provider: 'codex-cli',
        profileSource: 'profile:codex',
        toolCalls: [],
        capabilityPaths: [],
        readbacks: [],
        approvalRecords: ['approval-1'],
        text: 'approvalId=ap1 sessionId=s1 paneId=p1 args={"access_token":"tok"} Authorization: Bearer secret',
      },
    });

    expect(record.status).toBe('failed');
    expect(record.errors).toContain('failed acceptance check: forbid-internal-approval-text');
  });

  test('detects snake case approval internals, raw args, and named environment secrets', () => {
    const record = buildProviderAcceptanceRecord({
      scenarioId: 'approval-stop',
      prompt: '외부 폴더 열어줘',
      expected: { forbidsInternalLeak: true },
      observed: {
        provider: 'codex-cli',
        profileSource: 'profile:codex',
        toolCalls: [],
        capabilityPaths: [],
        readbacks: [],
        approvalRecords: ['approval-1'],
        text: 'approval_id=ap1 session_id=s1 pane_id=p1 rawArgs={} args: {"OPENAI_API_KEY":"sk-secret"} XENIS_MCP_BRIDGE_TOKEN=bridge-secret',
      },
    });

    expect(record.status).toBe('failed');
    expect(record.errors).toContain('failed acceptance check: forbid-internal-approval-text');
  });

  test.each(['args: {"path":"C:/secret"}', 'args={"path":"C:/secret"}'])('detects bare raw args marker %s', (text) => {
    const record = buildProviderAcceptanceRecord({
      scenarioId: 'approval-stop',
      prompt: '외부 폴더 열어줘',
      expected: { forbidsInternalLeak: true },
      observed: {
        provider: 'codex-cli',
        profileSource: 'profile:codex',
        toolCalls: [],
        capabilityPaths: [],
        readbacks: [],
        approvalRecords: ['approval-1'],
        text,
      },
    });

    expect(record.status).toBe('failed');
    expect(record.errors).toContain('failed acceptance check: forbid-internal-approval-text');
  });

  test('fails keyed provider runs that silently fall back to mock', () => {
    const record = buildProviderAcceptanceRecord({
      scenarioId: 'provider-identity',
      prompt: 'provider 확인',
      expected: {
        provider: 'openai',
        forbidsMockFallback: true,
      },
      observed: {
        provider: 'mock',
        profileSource: 'profile:openai',
        toolCalls: [],
        capabilityPaths: [],
        readbacks: [],
        approvalRecords: [],
        text: 'mock response',
      },
    });

    expect(record.status).toBe('failed');
    expect(record.errors).toContain('provider mismatch: mock !== openai');
    expect(record.errors).toContain('failed acceptance check: forbid-mock-fallback');
  });
});
