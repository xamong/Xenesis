import assert from 'node:assert/strict';
import test from 'node:test';
import { createTurnLedger, type XenesisTurnLedger } from '../../packages/xenesis/src/core/turnLedger';
import { createAgentTurnLedgerReadbackApi } from '../main/agentTurnLedgerService';
import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
} from './deskBridgeCapabilities';

const AGENT_TURN_PATHS = [
  'xd.agent.turns.list',
  'xd.agent.turns.current',
  'xd.agent.turns.get',
  'xd.agent.turns.events',
] as const;

test('agent turn ledger capabilities are registered as read-only CR calls', () => {
  for (const path of AGENT_TURN_PATHS) {
    const node = findDeskBridgeCapability(path);
    assert.ok(node, `${path} should be registered`);
    assert.equal(node.callable, true, `${path} should be callable`);
    assert.equal(node.permission, 'read', `${path} should be read-only`);
    assert.equal(node.approval, 'never', `${path} should not require approval`);
  }
});

test('agent turn ledger capabilities dispatch through adapter coverage', async () => {
  const calls: Array<{ method: string; args: unknown }> = [];
  const adapter = {
    agentTurnsList: (args: unknown) => {
      calls.push({ method: 'agentTurnsList', args });
      return { turns: [] };
    },
    agentTurnsCurrent: (args: unknown) => {
      calls.push({ method: 'agentTurnsCurrent', args });
      return { turn: null };
    },
    agentTurnsGet: (args: unknown) => {
      calls.push({ method: 'agentTurnsGet', args });
      return { id: (args as { id?: string }).id };
    },
    agentTurnEvents: (args: unknown) => {
      calls.push({ method: 'agentTurnEvents', args });
      return { events: [], id: (args as { id?: string }).id };
    },
  } as unknown as DeskBridgeCapabilityAdapter;

  const list = await callDeskBridgeCapability(adapter, {
    path: 'xd.agent.turns.list',
    source: 'mcp',
  });
  assert.equal(list.ok, true);

  const current = await callDeskBridgeCapability(adapter, {
    path: 'xd.agent.turns.current',
    source: 'mcp',
  });
  assert.equal(current.ok, true);

  const get = await callDeskBridgeCapability(adapter, {
    path: 'xd.agent.turns.get',
    args: { id: 'turn-1' },
    source: 'mcp',
  });
  assert.equal(get.ok, true);

  const events = await callDeskBridgeCapability(adapter, {
    path: 'xd.agent.turns.events',
    args: { id: 'turn-1' },
    source: 'mcp',
  });
  assert.equal(events.ok, true);

  assert.deepEqual(
    calls.map((call) => call.method),
    ['agentTurnsList', 'agentTurnsCurrent', 'agentTurnsGet', 'agentTurnEvents'],
  );
  assert.equal(calls[0]?.args, undefined);
  assert.equal(calls[1]?.args, undefined);
  assert.deepEqual(calls[2]?.args, { id: 'turn-1' });
  assert.deepEqual(calls[3]?.args, { id: 'turn-1' });
});

test('agent turn ledger readback api returns safe list/current/get/events payloads', () => {
  const ledger = createTurnLedger({
    now: () => '2026-06-28T00:00:00.000Z',
    idFactory: () => 'turn-readback-1',
  });
  const turn = ledger.startTurn({
    sessionId: 'session-readback',
    prompt: 'Desk 상태 확인',
    providerRequested: 'codex',
    providerResolved: 'codex',
    providerSource: 'profile',
  });
  ledger.markProviderStarting(turn.id);

  const api = createAgentTurnLedgerReadbackApi(ledger);

  const list = api.agentTurnsList();
  const current = api.agentTurnsCurrent();
  const get = api.agentTurnsGet({ id: turn.id });
  const events = api.agentTurnEvents({ id: turn.id });

  assert.equal(list.ok, true);
  assert.equal(list.turns.length, 1);
  assert.equal(current.ok, true);
  assert.equal((current.turn as { id?: string } | null)?.id, turn.id);
  assert.equal(get.ok, true);
  assert.equal((get.turn as { id?: string } | null)?.id, turn.id);
  assert.equal(events.ok, true);
  assert.equal(events.events.length, ledger.events(turn.id).length);
});

test('agent turn ledger readback api handles missing or non-string ids safely', () => {
  const ledger = createTurnLedger();
  const api = createAgentTurnLedgerReadbackApi(ledger);

  assert.deepEqual(api.agentTurnsGet(undefined), { ok: true, turn: null });
  assert.deepEqual(api.agentTurnsGet({ id: 123 }), { ok: true, turn: null });
  assert.deepEqual(api.agentTurnEvents(undefined), { ok: true, events: [] });
  assert.deepEqual(api.agentTurnEvents({ id: 123 }), { ok: true, events: [] });
});

test('agent turn ledger readback api redacts internal approval ids and secret-looking text', () => {
  const approvalUuid = '123e4567-e89b-42d3-a456-426614174000';
  const ledger = createTurnLedger({
    now: () => '2026-06-28T00:00:00.000Z',
    idFactory: () => 'turn-redacted-1',
  });
  const turn = ledger.startTurn({
    sessionId: 'session-redacted-secret',
    paneId: 'pane-secret-1',
    prompt: `OPENAI_API_KEY=sk-secret123 password: hunter2 token:"abc123456789" client_secret=clientsecret123 access_token=accesstoken123 refresh_token: refreshtoken123 ghp_abcdefghijklmnopqrstuvwxyz Authorization: Bearer bearerabcdefghijklmnop approvalId=apr_12345 actionInboxItem.id=ain_12345 approval ${approvalUuid}`,
    providerRequested: 'codex',
    providerResolved: 'codex',
    providerSource: 'profile',
  });
  ledger.markWaitingForApproval(turn.id, {
    approvalId: approvalUuid,
    actionInboxItemId: 'inbox-secret-1',
    capabilityPath: `xd.apps.launch/${approvalUuid}?actionInboxItem.id=ain_67890`,
    summary: `launch ${approvalUuid} with token Bearer abcdefghijklmnop approvalId=apr_67890 actionInboxItem.id=ain_99999`,
  });
  ledger.addToolCall(turn.id, {
    id: 'tool-secret-1',
    name: 'desk_call_capability',
    path: 'xd.agent.turns.get?approvalId=apr_24680',
    status: 'running',
    summary: 'Authorization: Bearer toolabcdefghijklmnop',
  });
  ledger.addEvidence(turn.id, {
    kind: 'cr-capability-called',
    id: 'evidence-secret-1',
    path: 'xd.agent.turns.events?actionInboxItem.id=ain_24680',
    summary: 'Authorization: Bearer evidenceabcdefghijklmnop',
    verified: true,
  });

  const api = createAgentTurnLedgerReadbackApi(ledger);
  const getJson = JSON.stringify(api.agentTurnsGet({ id: turn.id }));
  const eventsJson = JSON.stringify(api.agentTurnEvents({ id: turn.id }));

  for (const value of [
    approvalUuid,
    'inbox-secret-1',
    'sk-secret123',
    'hunter2',
    'abc123456789',
    'abcdefghijklmnopqrstuvwxyz',
    'abcdefghijklmnop',
    'bearerabcdefghijklmnop',
    'toolabcdefghijklmnop',
    'evidenceabcdefghijklmnop',
    'session-redacted-secret',
    'pane-secret-1',
    'clientsecret123',
    'accesstoken123',
    'refreshtoken123',
    'apr_12345',
    'ain_12345',
    'apr_67890',
    'ain_67890',
    'ain_99999',
    'apr_24680',
    'ain_24680',
    'tool-secret-1',
    'evidence-secret-1',
  ]) {
    assert.equal(getJson.includes(value), false, `${value} should not appear in get payload`);
    assert.equal(eventsJson.includes(value), false, `${value} should not appear in events payload`);
  }
  assert.match(getJson, /\[redacted/);
  assert.match(eventsJson, /\[redacted/);
});

test('agent turn ledger readback api redacts nested keyed secrets across public payloads', () => {
  const publicTurnId = 'turn-public-safe';
  const nestedApprovalUuid = '456e7890-e12b-42d3-a456-426614174999';
  const unsafeTurn = {
    id: publicTurnId,
    sessionId: 'session-nested-secret',
    paneId: 'pane-nested-secret',
    status: 'running',
    userPromptPreview: 'nested redaction probe',
    provider: {
      requested: 'codex',
      resolved: 'codex',
      source: 'runtime',
    },
    approvals: [],
    toolCalls: [
      {
        id: 'tool-nested-secret',
        name: 'desk_call_capability',
        status: 'completed',
        metadata: {
          id: nestedApprovalUuid,
          client_secret: 'nestedClientSecretValue',
          password: 'nested password tailsecret',
          tokens: ['gho_abcdefghijklmnopqrstuvwxyz', 'ghu_abcdefghijklmnopqrstuvwxyz'],
        },
      },
    ],
    evidence: [
      {
        id: 'evidence-nested-secret',
        kind: 'cr-capability-called',
        at: '2026-06-28T00:00:00.000Z',
        summary: 'password: "quoted password tailsecret" ghs_abcdefghijklmnopqrstuvwxyz',
        verified: true,
        metadata: {
          id: nestedApprovalUuid,
          access_token: 'nestedAccessTokenValue',
          refresh_token: 'nestedRefreshTokenValue',
          inner: {
            turnId: nestedApprovalUuid,
            github: 'ghr_abcdefghijklmnopqrstuvwxyz',
          },
        },
      },
    ],
    diagnostics: [],
    createdAt: '2026-06-28T00:00:00.000Z',
    updatedAt: '2026-06-28T00:00:00.000Z',
  };
  const fakeLedger = {
    list: () => [unsafeTurn],
    current: () => unsafeTurn,
    getTurn: () => unsafeTurn,
    events: () => unsafeTurn.evidence,
  } as unknown as XenesisTurnLedger;

  const api = createAgentTurnLedgerReadbackApi(fakeLedger);
  const turnPayloads = [api.agentTurnsList(), api.agentTurnsCurrent(), api.agentTurnsGet({ id: publicTurnId })].map(
    (payload) => JSON.stringify(payload),
  );
  const publicPayloads = [...turnPayloads, JSON.stringify(api.agentTurnEvents({ id: publicTurnId }))];

  for (const payload of turnPayloads) {
    assert.equal(payload.includes(publicTurnId), true, 'public turn id should remain usable');
  }

  for (const payload of publicPayloads) {
    for (const value of [
      'session-nested-secret',
      'pane-nested-secret',
      'tool-nested-secret',
      'evidence-nested-secret',
      nestedApprovalUuid,
      'nestedClientSecretValue',
      'nestedAccessTokenValue',
      'nestedRefreshTokenValue',
      'tailsecret',
      'gho_abcdefghijklmnopqrstuvwxyz',
      'ghu_abcdefghijklmnopqrstuvwxyz',
      'ghs_abcdefghijklmnopqrstuvwxyz',
      'ghr_abcdefghijklmnopqrstuvwxyz',
    ]) {
      assert.equal(payload.includes(value), false, `${value} should not appear in public payload`);
    }
  }
});
