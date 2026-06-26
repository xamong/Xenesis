import assert from 'node:assert/strict';
import test from 'node:test';

import { MAIN_OBSERVABILITY_IPC_CHANNEL } from '../shared/observabilityEvents';
import {
  emitMainInstantOperation,
  emitMainObservabilityOperation,
  observeMainAsyncOperation,
  summarizeMainObservabilityPayload,
} from './observabilityBridge';

function createFakeWindow() {
  const sent: { channel: string; payload: unknown }[] = [];
  return {
    sent,
    window: {
      isDestroyed: () => false,
      webContents: {
        send(channel: string, payload: unknown) {
          sent.push({ channel, payload });
        },
      },
    },
  };
}

function sentPayload(sent: { payload: unknown }[], index: number): Record<string, unknown> {
  return sent[index].payload as Record<string, unknown>;
}

test('emitMainObservabilityOperation sends renderer observability payloads through IPC', () => {
  const { sent, window } = createFakeWindow();

  emitMainObservabilityOperation(window, {
    id: 'main-test-1',
    phase: 'start',
    activity: { source: 'terminal', label: 'terminal.exit' },
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].channel, MAIN_OBSERVABILITY_IPC_CHANNEL);
  assert.deepEqual(sent[0].payload, {
    id: 'main-test-1',
    phase: 'start',
    activity: { source: 'terminal', label: 'terminal.exit' },
  });
});

test('observeMainAsyncOperation emits start and complete events', async () => {
  const { sent, window } = createFakeWindow();

  const result = await observeMainAsyncOperation(
    window,
    {
      activity: { source: 'mcp', label: 'mcp.bridge.request', detail: '/state' },
      network: { source: 'mcp', method: 'POST', url: 'http://127.0.0.1:3848/state' },
    },
    async () => ({ ok: true, value: 'done' }),
  );

  assert.deepEqual(result, { ok: true, value: 'done' });
  assert.equal(sent.length, 2);
  assert.equal(sentPayload(sent, 0).phase, 'start');
  assert.equal(sentPayload(sent, 1).phase, 'complete');
  assert.equal(sentPayload(sent, 1).ok, true);
  assert.equal(sentPayload(sent, 1).status, 200);
});

test('emitMainInstantOperation emits a completed operation pair', () => {
  const { sent, window } = createFakeWindow();

  emitMainInstantOperation(
    window,
    {
      activity: { source: 'terminal', label: 'terminal.exit', detail: 'id=abc' },
    },
    {
      ok: true,
      responseBody: { exitCode: 0 },
    },
  );

  assert.equal(sent.length, 2);
  assert.equal(sentPayload(sent, 0).phase, 'start');
  assert.equal(sentPayload(sent, 1).phase, 'complete');
  assert.equal(sentPayload(sent, 1).ok, true);
  assert.match(String(sentPayload(sent, 1).responseBody), /exitCode/);
});

test('summarizeMainObservabilityPayload redacts secrets and truncates long payloads', () => {
  const summary = summarizeMainObservabilityPayload({
    Authorization: 'Bearer secret-token',
    apiKey: 'sk-secret',
    nested: { bridgeToken: 'bridge-secret', value: 'visible' },
    long: 'x'.repeat(1000),
  });

  assert.match(summary, /"Authorization":"\[redacted\]"/);
  assert.match(summary, /"apiKey":"\[redacted\]"/);
  assert.match(summary, /"bridgeToken":"\[redacted\]"/);
  assert.match(summary, /visible/);
  assert.ok(summary.length <= 700);
});
