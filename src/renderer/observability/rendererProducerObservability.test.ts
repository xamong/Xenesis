import assert from 'node:assert/strict';
import test from 'node:test';
import { RENDERER_OBSERVABILITY_EVENT } from '../../shared/observabilityEvents';
import { activityTimelineStore } from './activityTimelineStore';
import { networkMonitorStore } from './networkMonitorStore';
import {
  installRendererProducerObservability,
  uninstallRendererProducerObservability,
} from './rendererProducerObservability';

test('renderer producer observability records preload operation events', () => {
  activityTimelineStore.clear();
  networkMonitorStore.clear();
  const target = new EventTarget() as EventTarget & typeof globalThis;

  installRendererProducerObservability(target);
  target.dispatchEvent(
    new CustomEvent(RENDERER_OBSERVABILITY_EVENT, {
      detail: {
        id: 'operation-1',
        phase: 'start',
        activity: {
          source: 'terminal',
          label: 'terminal.spawn',
          detail: '{"shell":"pwsh"}',
        },
        network: {
          source: 'mcp',
          method: 'POST',
          url: 'ipc://terminal/spawn',
          requestBody: '{"shell":"pwsh"}',
        },
      },
    }),
  );
  target.dispatchEvent(
    new CustomEvent(RENDERER_OBSERVABILITY_EVENT, {
      detail: {
        id: 'operation-1',
        phase: 'complete',
        ok: true,
        status: 200,
        responseBody: '{"id":"term-1"}',
      },
    }),
  );

  const [event] = activityTimelineStore.getEvents({ limit: 1 });
  assert.equal(event.source, 'terminal');
  assert.equal(event.label, 'terminal.spawn');
  assert.equal(event.status, 'completed');

  const [entry] = networkMonitorStore.getEntries({ limit: 1 });
  assert.equal(entry.source, 'mcp');
  assert.equal(entry.url, 'ipc://terminal/spawn');
  assert.equal(entry.status, 200);

  uninstallRendererProducerObservability(target);
});

test('renderer producer observability preserves connector source events', () => {
  activityTimelineStore.clear();
  networkMonitorStore.clear();
  const target = new EventTarget() as EventTarget & typeof globalThis;

  installRendererProducerObservability(target);
  target.dispatchEvent(
    new CustomEvent(RENDERER_OBSERVABILITY_EVENT, {
      detail: {
        id: 'connector-operation-1',
        phase: 'start',
        activity: {
          source: 'connector',
          label: 'connector.graphql.crm.query',
        },
        network: {
          source: 'connector',
          method: 'POST',
          url: 'https://crm.example/graphql',
        },
      },
    }),
  );
  target.dispatchEvent(
    new CustomEvent(RENDERER_OBSERVABILITY_EVENT, {
      detail: {
        id: 'connector-operation-1',
        phase: 'complete',
        ok: true,
        status: 200,
      },
    }),
  );

  const [event] = activityTimelineStore.getEvents({ limit: 1 });
  assert.equal(event.source, 'connector');
  assert.equal(event.label, 'connector.graphql.crm.query');

  const [entry] = networkMonitorStore.getEntries({ limit: 1 });
  assert.equal(entry.source, 'connector');
  assert.equal(entry.url, 'https://crm.example/graphql');

  uninstallRendererProducerObservability(target);
});

test('renderer producer observability preserves xenesis and terminal semantic sources', () => {
  activityTimelineStore.clear();
  networkMonitorStore.clear();
  const target = new EventTarget() as EventTarget & typeof globalThis;

  installRendererProducerObservability(target);
  target.dispatchEvent(
    new CustomEvent(RENDERER_OBSERVABILITY_EVENT, {
      detail: {
        id: 'xenesis-worker-1',
        phase: 'start',
        activity: {
          source: 'xenesis',
          label: 'xenesis.worker.completed',
        },
        network: {
          source: 'xenesis',
          method: 'POST',
          url: 'xenesis://task-worker/completed',
        },
      },
    }),
  );
  target.dispatchEvent(
    new CustomEvent(RENDERER_OBSERVABILITY_EVENT, {
      detail: {
        id: 'xenesis-worker-1',
        phase: 'complete',
        ok: true,
        status: 200,
      },
    }),
  );
  target.dispatchEvent(
    new CustomEvent(RENDERER_OBSERVABILITY_EVENT, {
      detail: {
        id: 'terminal-semantic-1',
        phase: 'start',
        activity: {
          source: 'terminal',
          label: 'terminal.output.semantic.assistant',
        },
        network: {
          source: 'terminal',
          method: 'POST',
          url: 'terminal://automation/term-1/stream/assistant',
        },
      },
    }),
  );
  target.dispatchEvent(
    new CustomEvent(RENDERER_OBSERVABILITY_EVENT, {
      detail: {
        id: 'terminal-semantic-1',
        phase: 'complete',
        ok: true,
        status: 200,
      },
    }),
  );

  const events = activityTimelineStore.getEvents({ limit: 2 });
  assert.deepEqual(
    events.map((event) => event.source),
    ['xenesis', 'terminal'],
  );
  assert.deepEqual(
    events.map((event) => event.label),
    ['xenesis.worker.completed', 'terminal.output.semantic.assistant'],
  );

  const entries = networkMonitorStore.getEntries({ limit: 2 });
  assert.deepEqual(
    entries.map((entry) => entry.source),
    ['xenesis', 'terminal'],
  );
  assert.deepEqual(
    entries.map((entry) => entry.url),
    ['xenesis://task-worker/completed', 'terminal://automation/term-1/stream/assistant'],
  );

  uninstallRendererProducerObservability(target);
});

test('renderer producer observability records fetch requests', async () => {
  activityTimelineStore.clear();
  networkMonitorStore.clear();
  const target = new EventTarget() as EventTarget & typeof globalThis;
  const response = new Response('ok', { status: 200, statusText: 'OK' });
  target.fetch = async () => response;

  installRendererProducerObservability(target);
  const result = await target.fetch('http://127.0.0.1:3338/status', {
    method: 'GET',
    headers: { Authorization: 'Bearer secret-token' },
  });

  assert.equal(result.status, 200);
  const [entry] = networkMonitorStore.getEntries({ limit: 1 });
  assert.equal(entry.source, 'gateway');
  assert.equal(entry.method, 'GET');
  assert.equal(entry.url, 'http://127.0.0.1:3338/status');
  assert.equal(entry.status, 200);
  assert.doesNotMatch(entry.requestBody ?? '', /secret-token/);

  uninstallRendererProducerObservability(target);
});
