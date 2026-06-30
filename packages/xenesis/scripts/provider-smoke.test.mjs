import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  buildAgentPaneLiveSmokeAcceptanceRecord,
  buildApprovalStopSmokeAcceptanceRecord,
  buildCrReadSmokeAcceptanceRecord,
  buildSmokeAcceptanceRecord,
  buildSmokeSummary,
  parseProviderExecutionEvidence,
  parseProviderStatusOutput,
  parseSmokeArgs,
  resolveRuntimeSmokeEvidence,
  resolveSmokeGatewayToken,
  smokeGatewayHeaders,
} from './provider-smoke.mjs';

test('provider smoke acceptance fails without readback evidence', () => {
  const record = buildSmokeAcceptanceRecord({
    scenarioId: 'cr-read',
    expectedProvider: 'codex-app-server',
    expectedCapabilityPath: 'xd.app.status',
    expectedReadback: 'xd.app.status',
    observedProvider: 'codex-app-server',
    observedProcessModel: 'persistent-process',
  });

  assert.equal(record.status, 'failed');
  assert.ok(record.errors.includes('missing readback: xd.app.status'));
});

test('provider smoke acceptance does not trust manually seeded transcript markers as readback evidence', () => {
  const record = buildSmokeAcceptanceRecord({
    scenarioId: 'cr-read',
    expectedProvider: 'codex-app-server',
    expectedProcessModel: 'persistent-process',
    expectedCapabilityPath: 'xd.app.status',
    expectedReadback: 'xd.app.status',
    observedProvider: 'codex-app-server',
    observedProcessModel: 'persistent-process',
    transcript: [
      'provider: codex-app-server',
      'process model: persistent-process',
      'capability: xd.app.status',
      'readback: xd.app.status',
    ].join('\n'),
  });

  assert.equal(record.status, 'failed');
  assert.ok(record.errors.includes('missing capability path: xd.app.status'));
  assert.ok(record.errors.includes('missing readback: xd.app.status'));
});

test('provider smoke acceptance passes with observed capability and readback evidence', () => {
  const record = buildSmokeAcceptanceRecord({
    scenarioId: 'cr-read',
    expectedProvider: 'codex-app-server',
    expectedProcessModel: 'persistent-process',
    expectedCapabilityPath: 'xd.app.status',
    expectedReadback: 'xd.app.status',
    observedProvider: 'codex-app-server',
    observedProcessModel: 'persistent-process',
    observedCapabilityPaths: ['xd.app.status'],
    observedReadbacks: ['xd.app.status'],
  });

  assert.equal(record.status, 'passed');
  assert.deepEqual(record.errors, []);
});

test('provider smoke acceptance allows auto to resolve to a concrete provider', () => {
  const record = buildSmokeAcceptanceRecord({
    scenarioId: 'provider-identity',
    expectedProvider: 'auto',
    observedProvider: 'codex-app-server',
    observedProcessModel: 'persistent-process',
  });

  assert.equal(record.status, 'passed');
  assert.deepEqual(record.errors, []);
});

test('provider smoke acceptance fails auto when runtime provider stays unresolved', () => {
  const record = buildSmokeAcceptanceRecord({
    scenarioId: 'provider-identity',
    expectedProvider: 'auto',
    observedProvider: 'auto',
  });

  assert.equal(record.status, 'failed');
  assert.ok(record.errors.includes('auto provider did not resolve to a concrete provider'));
});

test('provider smoke acceptance can require a real approval record', () => {
  const record = buildSmokeAcceptanceRecord({
    scenarioId: 'approval-stop',
    expectedProvider: 'codex-cli',
    requiresApprovalRecord: true,
    observedProvider: 'codex-cli',
    observedApprovalRecords: [],
  });

  assert.equal(record.status, 'failed');
  assert.ok(record.errors.includes('missing approval record'));
});

test('provider smoke args accept positional mode forwarded by npm', () => {
  assert.equal(parseSmokeArgs(['cr-read']).mode, 'cr-read');
});

test('provider smoke gateway uses a stable bearer token for protected routes', () => {
  assert.equal(resolveSmokeGatewayToken({ XENESIS_GATEWAY_TOKEN: 'configured-token' }, 'report-1'), 'configured-token');
  assert.equal(resolveSmokeGatewayToken({}, 'report-1'), 'provider-smoke-report-1');
  assert.deepEqual(smokeGatewayHeaders('provider-smoke-report-1', { 'content-type': 'application/json' }), {
    'content-type': 'application/json',
    authorization: 'Bearer provider-smoke-report-1',
  });
});

test('provider smoke parses observed provider from status json', () => {
  assert.deepEqual(
    parseProviderStatusOutput('{"provider":"codex-cli","model":"gpt-test","processModel":"process-per-turn"}'),
    {
      provider: 'codex-cli',
      model: 'gpt-test',
      processModel: 'process-per-turn',
    },
  );
});

test('provider smoke parses actual provider runtime from assistant json event metadata', () => {
  const output = [
    JSON.stringify({
      type: 'assistant_message',
      message: {
        role: 'assistant',
        content: 'xenesis-provider-live-ok',
        providerMetadata: {
          cli: {
            provider: 'codex-cli',
            processModel: 'process-per-turn',
            transport: 'cli-oneshot',
          },
        },
      },
    }),
  ].join('\n');

  assert.deepEqual(parseProviderExecutionEvidence(output), {
    provider: 'codex-cli',
    processModel: 'process-per-turn',
  });
});

test('provider smoke parses non-cli provider runtime from assistant metadata namespaces', () => {
  const output = [
    JSON.stringify({
      type: 'assistant_message',
      message: {
        role: 'assistant',
        content: 'xenesis-provider-live-ok',
        providerMetadata: {
          openai: {
            output: [{ role: 'assistant', content: 'xenesis-provider-live-ok' }],
          },
        },
      },
    }),
  ].join('\n');

  assert.deepEqual(parseProviderExecutionEvidence(output), {
    provider: 'openai',
  });
});

test('provider smoke does not use status json as runtime acceptance evidence', () => {
  const runtimeEvidence = resolveRuntimeSmokeEvidence({
    executionEvidence: {},
    statusEvidence: {
      provider: 'codex-app-server',
      processModel: 'persistent-process',
    },
  });
  const record = buildSmokeAcceptanceRecord({
    scenarioId: 'provider-identity',
    expectedProvider: 'codex-app-server',
    expectedProcessModel: 'persistent-process',
    observedProvider: runtimeEvidence.provider,
    observedProcessModel: runtimeEvidence.processModel,
  });

  assert.deepEqual(runtimeEvidence, {});
  assert.equal(record.status, 'failed');
  assert.ok(record.errors.includes('provider mismatch: undefined !== codex-app-server'));
  assert.ok(record.errors.includes('process model mismatch: undefined !== persistent-process'));
});

test('provider smoke keeps execution-derived runtime evidence for acceptance', () => {
  const runtimeEvidence = resolveRuntimeSmokeEvidence({
    executionEvidence: {
      provider: 'codex-app-server',
      processModel: 'persistent-process',
    },
    statusEvidence: {
      provider: 'codex-cli',
      processModel: 'process-per-turn',
    },
  });

  assert.deepEqual(runtimeEvidence, {
    provider: 'codex-app-server',
    processModel: 'persistent-process',
  });
});

test('provider smoke summary exits non-zero when any check failed', () => {
  assert.deepEqual(
    buildSmokeSummary([
      { name: 'connect-probe', status: 'passed' },
      { name: 'acceptance-cr-read', status: 'failed' },
    ]),
    { total: 2, passed: 1, failed: 1, exitCode: 1 },
  );
});

test('agent-pane-live smoke fails closed without structured live evidence', () => {
  const record = buildAgentPaneLiveSmokeAcceptanceRecord({
    providerName: 'codex-cli',
    processModel: 'process-per-turn',
  });

  assert.equal(record.status, 'failed');
  assert.match(record.errors.join('\n'), /requires structured Electron Agent-pane evidence/);
});

test('cr-read smoke calls the bridge and records readback evidence', async () => {
  const calls = [];
  const record = await buildCrReadSmokeAcceptanceRecord({
    providerName: 'codex-cli',
    expectedProcessModel: 'process-per-turn',
    observedProvider: 'codex-cli',
    observedProcessModel: 'process-per-turn',
    env: { XENIS_MCP_BRIDGE_URL: 'http://bridge.local' },
    fetchImpl: async (_url, init) => {
      calls.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ ok: true, path: 'xd.app.status', result: { status: 'ok' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(record.status, 'passed');
  assert.equal(calls[0].path, 'xd.app.status');
  assert.equal(calls[0].approved, false);
  assert.deepEqual(record.capabilityPaths, ['xd.app.status']);
  assert.deepEqual(record.readbacks, ['xd.app.status']);
});

test('cr-read smoke fails on shallow ok payload without returned CR path', async () => {
  const record = await buildCrReadSmokeAcceptanceRecord({
    providerName: 'codex-cli',
    observedProvider: 'codex-cli',
    env: { XENIS_MCP_BRIDGE_URL: 'http://bridge.local' },
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: true, result: { status: 'ok' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });

  assert.equal(record.status, 'failed');
  assert.ok(record.errors.includes('missing capability path: xd.app.status'));
  assert.ok(record.errors.includes('missing readback: xd.app.status'));
});

test('cr-read smoke fails when bridge response has no result payload', async () => {
  const record = await buildCrReadSmokeAcceptanceRecord({
    providerName: 'codex-cli',
    observedProvider: 'codex-cli',
    env: { XENIS_MCP_BRIDGE_URL: 'http://bridge.local' },
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: true, path: 'xd.app.status' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });

  assert.equal(record.status, 'failed');
  assert.ok(record.errors.includes('missing readback: xd.app.status'));
});

test('cr-read smoke fails when observed process model is missing', async () => {
  const record = await buildCrReadSmokeAcceptanceRecord({
    providerName: 'codex-app-server',
    expectedProcessModel: 'persistent-process',
    observedProvider: 'codex-app-server',
    observedProcessModel: undefined,
    env: { XENIS_MCP_BRIDGE_URL: 'http://bridge.local' },
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: true, path: 'xd.app.status', result: { status: 'ok' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  });

  assert.equal(record.status, 'failed');
  assert.ok(record.errors.includes('process model mismatch: undefined !== persistent-process'));
});

test('approval-stop smoke calls the bridge with approved false and requires approval record', async () => {
  const calls = [];
  const record = await buildApprovalStopSmokeAcceptanceRecord({
    providerName: 'codex-cli',
    observedProvider: 'codex-cli',
    env: { XENIS_MCP_BRIDGE_URL: 'http://bridge.local' },
    fetchImpl: async (_url, init) => {
      calls.push(JSON.parse(String(init.body)));
      if (calls.length === 2) {
        return new Response(JSON.stringify({ ok: true, result: [{ id: 'approval-record-1', status: 'pending' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          ok: false,
          approvalRequired: true,
          actionInboxItem: { id: 'approval-record-1' },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    },
  });

  assert.equal(record.status, 'passed');
  assert.equal(calls[0].approved, false);
  assert.equal(calls[1].path, 'xd.mcp.actionInbox.list');
  assert.deepEqual(record.approvalRecords, ['approval-record-1']);
  assert.deepEqual(record.readbacks, ['xd.mcp.actionInbox.list']);
});

test('approval-stop smoke fails when approval record is not inspectable', async () => {
  const record = await buildApprovalStopSmokeAcceptanceRecord({
    providerName: 'codex-cli',
    observedProvider: 'codex-cli',
    env: { XENIS_MCP_BRIDGE_URL: 'http://bridge.local' },
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init.body));
      if (body.path === 'xd.mcp.actionInbox.list') {
        return new Response(JSON.stringify({ ok: true, result: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: false, approvalRequired: true, actionInboxItem: { id: 'missing' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(record.status, 'failed');
  assert.ok(record.errors.includes('missing approval record'));
});

test('approval-stop smoke fails when approval readback payload is not ok', async () => {
  const record = await buildApprovalStopSmokeAcceptanceRecord({
    providerName: 'codex-cli',
    observedProvider: 'codex-cli',
    env: { XENIS_MCP_BRIDGE_URL: 'http://bridge.local' },
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init.body));
      if (body.path === 'xd.mcp.actionInbox.list') {
        return new Response(JSON.stringify({ ok: false, error: 'readback failed', result: [{ id: 'approval-1' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({ ok: false, approvalRequired: true, actionInboxItem: { id: 'approval-1' } }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      );
    },
  });

  assert.equal(record.status, 'failed');
  assert.ok(record.errors.includes('missing approval record'));
});
