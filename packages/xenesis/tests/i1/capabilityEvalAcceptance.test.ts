import { describe, expect, test } from 'vitest';

import { defaultCapabilityScenarios, evaluateCapabilityRun } from '../../src/evaluation/capabilityEval.js';

describe('capability eval acceptance checks', () => {
  test('fails a Desk scenario without required CR path and readback', () => {
    const result = evaluateCapabilityRun({
      scenario: {
        id: 'desk-readback',
        category: 'desk',
        prompt: 'Desk 상태',
        requiredCapabilityPaths: ['xd.app.status'],
        requiredReadbacks: ['xd.app.status'],
        requiredProvider: 'codex-app-server',
      },
      exitCode: 0,
      stdout: 'provider: codex-app-server\n상태 정상',
      stderr: '',
      durationMs: 100,
    });

    expect(result.status).toBe('failed');
    expect(result.failures).toContain('missing capability path: xd.app.status');
    expect(result.failures).toContain('missing readback: xd.app.status');
  });

  test('does not accept raw stdout markers as CR path and readback evidence', () => {
    const result = evaluateCapabilityRun({
      scenario: {
        id: 'desk-readback',
        category: 'desk',
        prompt: 'Desk 상태',
        requiredCapabilityPaths: ['xd.app.status'],
        requiredReadbacks: ['xd.app.status'],
        requiredProvider: 'codex-app-server',
        requiredProcessModel: 'persistent-process',
      },
      exitCode: 0,
      stdout: [
        'provider: codex-app-server',
        'process model: persistent-process',
        'capability: xd.app.status',
        'readback: xd.app.status',
      ].join('\n'),
      stderr: '',
      durationMs: 100,
    });

    expect(result.status).toBe('failed');
    expect(result.failures).toContain('missing capability path: xd.app.status');
    expect(result.failures).toContain('missing readback: xd.app.status');
  });

  test('passes when structured evidence contains provider, CR path, and readback markers', () => {
    const result = evaluateCapabilityRun({
      scenario: {
        id: 'desk-readback',
        category: 'desk',
        prompt: 'Desk 상태',
        requiredCapabilityPaths: ['xd.app.status'],
        requiredReadbacks: ['xd.app.status'],
        requiredProvider: 'codex-app-server',
        requiredProcessModel: 'persistent-process',
      },
      exitCode: 0,
      stdout: [
        'Desk 상태 확인 완료',
      ].join('\n'),
      stderr: '',
      durationMs: 100,
      acceptanceEvidence: {
        provider: 'codex-app-server',
        profileSource: 'profile:auto',
        processModel: 'persistent-process',
        capabilityPaths: ['xd.app.status'],
        readbacks: ['xd.app.status'],
      },
    });

    expect(result.status).toBe('passed');
  });

  test('fails when required acceptance tool call evidence is missing', () => {
    const result = evaluateCapabilityRun({
      scenario: {
        id: 'desk-readback',
        category: 'desk',
        prompt: 'Desk 상태',
        requiredAcceptanceToolCalls: ['xenesis_desk_call_capability'],
        requiredCapabilityPaths: ['xd.app.status'],
        requiredReadbacks: ['xd.app.status'],
      },
      exitCode: 0,
      stdout: 'Desk 상태 확인 완료',
      stderr: '',
      durationMs: 100,
      acceptanceEvidence: {
        provider: 'codex-app-server',
        profileSource: 'profile:auto',
        processModel: 'persistent-process',
        capabilityPaths: ['xd.app.status'],
        readbacks: ['xd.app.status'],
      },
    });

    expect(result.status).toBe('failed');
    expect(result.failures).toContain('missing tool call: xenesis_desk_call_capability');
  });

  test('fails when approval-required scenario leaks internal approval fields', () => {
    const result = evaluateCapabilityRun({
      scenario: {
        id: 'approval-stop',
        category: 'desk',
        prompt: '외부 작업공간 열어줘',
        requiresApprovalRecord: true,
        forbidsInternalLeak: true,
      },
      exitCode: 0,
      stdout: [
        'provider: codex-cli',
        'approval record: approval-1',
        'approvalRequired=true actionInboxItem.id=abc',
      ].join('\n'),
      stderr: '',
      durationMs: 100,
    });

    expect(result.status).toBe('failed');
    expect(result.failures).toContain('failed acceptance check: forbid-internal-approval-text');
  });

  test('default Desk active-context scenario does not pass with injected stdout tool text only', () => {
    const scenario = defaultCapabilityScenarios.find((candidate) => candidate.id === 'desk-active-context');
    expect(scenario).toBeDefined();

    const result = evaluateCapabilityRun({
      scenario: scenario!,
      exitCode: 0,
      stdout: ['tool: desk_active_context', 'capability-note.md active context 현재'].join('\n'),
      stderr: '',
      durationMs: 100,
    });

    expect(result.status).toBe('failed');
    expect(result.failures).toContain('missing tool call: desk_active_context');
    expect(result.failures).toContain('missing capability path: xd.context.active');
    expect(result.failures).toContain('missing readback: xd.context.active');
  });
});
