import { describe, expect, test } from 'vitest';
import { createTurnLedger, type XenesisTurnEvidenceKind, type XenesisTurnRecord } from '../../src/core/turnLedger.js';

describe('turn ledger', () => {
  test('creates a queued turn and transitions to completed only with readback evidence', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });

    const created = ledger.startTurn({
      sessionId: 'session-1',
      paneId: 'pane-1',
      prompt: '현재 Desk 상태 알려줘',
      providerRequested: 'auto',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    expect(created.status).toBe('queued');
    expect(created.userPromptPreview).toBe('현재 Desk 상태 알려줘');

    ledger.markProviderStarting(created.id);
    expect(ledger.getTurn(created.id)?.evidence.map((item) => item.kind)).toContain('provider-started');

    ledger.markRunning(created.id);
    ledger.addEvidence(created.id, {
      kind: 'cr-capability-called',
      summary: 'xd.app.status called',
      path: 'xd.app.status',
      verified: true,
    });
    ledger.completeTurn(created.id, 'state read');
    expect(ledger.getTurn(created.id)?.status).toBe('blocked');
    expect(ledger.getTurn(created.id)?.result?.finishReason).toBe('readback_missing');

    ledger.addEvidence(created.id, {
      kind: 'readback',
      summary: 'xd.app.status readback returned ok',
      path: 'xd.app.status',
      verified: true,
    });
    ledger.completeTurn(created.id, 'state read');

    const completed = ledger.getTurn(created.id) as XenesisTurnRecord;
    expect(completed.status).toBe('completed');
    expect(completed.provider.resolved).toBe('codex-app-server');
    expect(completed.provider.processModel).toBe('persistent-process');
    expect(completed.evidence.map((item) => item.kind)).toContain('final-response');
    expect(ledger.current()?.id).toBe(created.id);
    expect(ledger.current()?.status).toBe('completed');
  });

  test('redacts long prompt previews and links approvals', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const created = ledger.startTurn({
      sessionId: 'session-2',
      prompt: 'x'.repeat(700),
      providerRequested: 'claude',
      providerResolved: 'claude-cli',
      providerSource: 'runtime',
      processModel: 'process-per-turn',
    });

    ledger.markWaitingForApproval(created.id, {
      approvalId: 'approval-1',
      actionInboxItemId: 'inbox-1',
      capabilityPath: 'xd.apps.launch',
      summary: 'Open Notepad requires approval',
    });

    const record = ledger.getTurn(created.id) as XenesisTurnRecord;
    expect(record.status).toBe('waiting_for_approval');
    expect(record.userPromptPreview.length).toBeLessThanOrEqual(240);
    expect(record.approvals[0]).toMatchObject({
      approvalId: 'approval-1',
      capabilityPath: 'xd.apps.launch',
    });
    expect(record.approvals[0].at).toBe('2026-06-28T00:00:00.000Z');
    expect(record.evidence.map((item) => item.kind)).toContain('approval-created');
  });

  test('caps prompt preview overrides at 240 characters', () => {
    const ledger = createTurnLedger({
      now: () => '2026-06-28T00:00:00.000Z',
      promptPreviewMaxChars: 500,
    });

    const created = ledger.startTurn({
      sessionId: 'session-override',
      prompt: 'x'.repeat(700),
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    expect(created.userPromptPreview.length).toBeLessThanOrEqual(240);
  });

  test('caps response preview overrides at the hard maximum', () => {
    const ledger = createTurnLedger({
      now: () => '2026-06-28T00:00:00.000Z',
      responsePreviewMaxChars: 5000,
    });

    const created = ledger.startTurn({
      sessionId: 'session-response-override',
      prompt: 'status',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    const completed = ledger.completeTurn(created.id, 'x'.repeat(5000));

    expect(completed.responsePreview?.length).toBeLessThanOrEqual(1000);
    expect(ledger.current()?.id).toBe(created.id);
  });

  test('keeps provider process model optional for unknown providers', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });

    const created = ledger.startTurn({
      sessionId: 'session-unknown-provider',
      prompt: 'status',
      providerRequested: 'test-provider',
      providerResolved: 'test-provider',
      providerSource: 'runtime',
    });

    expect(created.provider.processModel).toBeUndefined();
  });

  test('records failure diagnostics with an error class and keeps current turn', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const created = ledger.startTurn({
      sessionId: 'session-failure',
      prompt: 'status',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    const failed = ledger.failTurn(created.id, 'ProviderError', 'provider exploded');

    expect(failed.status).toBe('failed');
    expect(failed.diagnostics[0]).toMatchObject({
      level: 'error',
      errorClass: 'ProviderError',
      message: 'provider exploded',
    });
    expect(failed.result?.errorClass).toBe('ProviderError');
    expect(ledger.current()?.id).toBe(created.id);
    expect(ledger.current()?.status).toBe('failed');
  });

  test('records stopped terminal states for cancelled and blocked turns', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const cancelled = ledger.startTurn({
      sessionId: 'session-cancelled',
      prompt: 'stop',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });
    const cancelledTurn = ledger.stopTurn(cancelled.id, 'cancelled', 'run cancelled');

    expect(cancelledTurn.status).toBe('cancelled');
    expect(cancelledTurn.result?.finishReason).toBe('cancelled');
    expect(cancelledTurn.diagnostics[0]).toMatchObject({ level: 'info', message: 'run cancelled' });

    const blocked = ledger.startTurn({
      sessionId: 'session-blocked',
      prompt: 'budget',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });
    const blockedTurn = ledger.stopTurn(blocked.id, 'blocked', 'run stopped: budget');

    expect(blockedTurn.status).toBe('blocked');
    expect(blockedTurn.result?.finishReason).toBe('blocked');
    expect(blockedTurn.diagnostics[0]).toMatchObject({ level: 'warning', message: 'run stopped: budget' });
  });

  test('updates tool call status after recording a result', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const turn = ledger.startTurn({
      sessionId: 'session-tool-status',
      prompt: 'status',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    ledger.addToolCall(turn.id, {
      id: 'tool-1',
      name: 'desk_call_capability',
      path: 'xd.app.status',
      status: 'running',
    });
    const updated = ledger.updateToolCall(turn.id, {
      id: 'tool-1',
      name: 'desk_call_capability',
      path: 'xd.app.status',
      status: 'completed',
    });

    expect(updated.toolCalls[0]).toMatchObject({ id: 'tool-1', status: 'completed' });
  });

  test('limits retained turns to the configured capacity', () => {
    let sequence = 0;
    const ledger = createTurnLedger({
      now: () => '2026-06-28T00:00:00.000Z',
      idFactory: () => `turn-capacity-${++sequence}`,
      maxTurns: 2,
    });

    for (let index = 0; index < 3; index += 1) {
      const turn = ledger.startTurn({
        sessionId: `session-${index}`,
        prompt: `prompt ${index}`,
        providerRequested: 'codex',
        providerResolved: 'codex-app-server',
        providerSource: 'profile',
        processModel: 'persistent-process',
      });
      ledger.stopTurn(turn.id, 'blocked', 'turn ended');
    }

    expect(ledger.list().map((turn) => turn.id)).toEqual(['turn-capacity-2', 'turn-capacity-3']);
    expect(ledger.getTurn('turn-capacity-1')).toBeUndefined();
    expect(ledger.current()?.id).toBe('turn-capacity-3');
  });

  test('deduplicates repeated evidence by kind, path, and id', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const turn = ledger.startTurn({
      sessionId: 'session-3',
      prompt: 'status',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    const evidence = {
      kind: 'readback' as XenesisTurnEvidenceKind,
      path: 'xd.app.status',
      id: 'readback-1',
      summary: 'status readback',
      verified: true,
    };
    ledger.addEvidence(turn.id, evidence);
    ledger.addEvidence(turn.id, evidence);

    expect(ledger.events(turn.id).filter((item) => item.kind === 'readback')).toHaveLength(1);
    expect(ledger.events(turn.id)[0].at).toBe('2026-06-28T00:00:00.000Z');
    expect(ledger.events(turn.id)[0].verified).toBe(true);
  });

  test('requires readback before completing MCP tool turns', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const turn = ledger.startTurn({
      sessionId: 'session-mcp-gated',
      prompt: 'status',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    ledger.markRunning(turn.id);
    ledger.addEvidence(turn.id, {
      kind: 'mcp-tool-called',
      id: 'mcp-call-1',
      path: 'mcp__xenesis-dev__xenesis_desk_call_capability',
      summary: 'MCP Desk tool called',
      verified: true,
    });
    ledger.completeTurn(turn.id, 'done');

    expect(ledger.getTurn(turn.id)?.status).toBe('blocked');
    expect(ledger.getTurn(turn.id)?.result?.finishReason).toBe('readback_missing');

    ledger.addEvidence(turn.id, {
      kind: 'readback',
      id: 'mcp-call-1',
      path: 'mcp__xenesis-dev__xenesis_desk_call_capability',
      summary: 'MCP readback returned status',
      verified: true,
    });
    const completed = ledger.completeTurn(turn.id, 'done');

    expect(completed.status).toBe('completed');
  });

  test('requires matching readback for every gated call before completion', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const turn = ledger.startTurn({
      sessionId: 'session-multi-gated',
      prompt: 'status then launch',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    ledger.markRunning(turn.id);
    ledger.addEvidence(turn.id, {
      kind: 'cr-capability-called',
      id: 'read-call',
      path: 'xd.app.status',
      summary: 'status called',
      verified: true,
    });
    ledger.addEvidence(turn.id, {
      kind: 'readback',
      id: 'read-call',
      path: 'xd.app.status',
      summary: 'status readback',
      verified: true,
    });
    ledger.addEvidence(turn.id, {
      kind: 'cr-capability-called',
      id: 'mutate-call',
      path: 'xd.apps.launch',
      summary: 'launch called',
      verified: true,
    });

    const notCompleted = ledger.completeTurn(turn.id, 'done');

    expect(notCompleted.status).toBe('blocked');
    expect(notCompleted.result?.finishReason).toBe('readback_missing');
    expect(notCompleted.evidence.map((item) => item.kind)).not.toContain('final-response');
  });

  test('does not evict active turns when trimming retained history', () => {
    let sequence = 0;
    const ledger = createTurnLedger({
      now: () => '2026-06-28T00:00:00.000Z',
      idFactory: () => `turn-active-${++sequence}`,
      maxTurns: 1,
    });

    const active = ledger.startTurn({
      sessionId: 'session-active',
      prompt: 'active',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });
    ledger.markRunning(active.id);

    const next = ledger.startTurn({
      sessionId: 'session-next',
      prompt: 'next',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });
    ledger.markRunning(next.id);

    expect(ledger.getTurn(active.id)?.status).toBe('running');
    expect(ledger.getTurn(next.id)?.status).toBe('running');

    ledger.stopTurn(active.id, 'blocked', 'active run stopped');

    expect(ledger.getTurn(active.id)).toBeUndefined();
    expect(ledger.getTurn(next.id)?.status).toBe('running');
  });

  test('bounds retained non-terminal overflow while preserving the current turn', () => {
    let sequence = 0;
    const ledger = createTurnLedger({
      now: () => '2026-06-28T00:00:00.000Z',
      idFactory: () => `turn-active-hard-${++sequence}`,
      maxTurns: 1,
    });

    for (let index = 0; index < 5; index += 1) {
      const turn = ledger.startTurn({
        sessionId: `session-active-hard-${index}`,
        prompt: `active ${index}`,
        providerRequested: 'codex',
        providerResolved: 'codex-app-server',
        providerSource: 'profile',
        processModel: 'persistent-process',
      });
      ledger.markRunning(turn.id);
    }

    expect(ledger.list().map((turn) => turn.id)).toEqual(['turn-active-hard-4', 'turn-active-hard-5']);
    expect(ledger.current()?.id).toBe('turn-active-hard-5');
    expect(ledger.getTurn('turn-active-hard-5')?.status).toBe('running');
  });

  test('records approval resolution evidence and updates approval status', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const turn = ledger.startTurn({
      sessionId: 'session-approval-resolved',
      prompt: 'launch app',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    ledger.markWaitingForApproval(turn.id, {
      approvalId: 'approval-1',
      capabilityPath: 'xd.apps.launch',
      summary: 'Launch requires approval',
    });
    const resolved = ledger.resolveApproval(turn.id, {
      approvalId: 'approval-1',
      status: 'approved',
      capabilityPath: 'xd.apps.launch',
      summary: 'Launch approved',
    });

    expect(resolved.approvals[0]).toMatchObject({
      approvalId: 'approval-1',
      capabilityPath: 'xd.apps.launch',
      status: 'approved',
    });
    expect(resolved.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'approval-resolved',
          id: 'approval-1',
          path: 'xd.apps.launch',
          verified: true,
        }),
      ]),
    );
  });

  test('stores a boolean verified flag when evidence input omits it', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const turn = ledger.startTurn({
      sessionId: 'session-unverified-evidence',
      prompt: 'status',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    ledger.addEvidence(turn.id, {
      kind: 'mcp-tool-called',
      summary: 'mcp tool called',
    });

    expect(ledger.events(turn.id)[0].verified).toBe(false);
  });

  test('exposes failure message in the result', () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const turn = ledger.startTurn({
      sessionId: 'session-result-message',
      prompt: 'status',
      providerRequested: 'codex',
      providerResolved: 'codex-app-server',
      providerSource: 'profile',
      processModel: 'persistent-process',
    });

    const failed = ledger.failTurn(turn.id, 'ProviderError', 'x'.repeat(5000));

    expect(failed.result?.message?.length).toBeLessThanOrEqual(1000);
    expect(failed.result?.message).toBe(failed.diagnostics[0].message);
  });
});
