import assert from 'node:assert/strict';
import test from 'node:test';
import { MAIN_OBSERVABILITY_IPC_CHANNEL, RENDERER_OBSERVABILITY_EVENT } from '../shared/observabilityEvents';
import { installMainObservabilityForwarder, observeAsyncMethod, observeSyncMethod } from './observability';

test('observeAsyncMethod dispatches start and complete events', async () => {
  const target = new EventTarget();
  const events: unknown[] = [];
  target.addEventListener(RENDERER_OBSERVABILITY_EVENT, (event) => {
    events.push((event as CustomEvent).detail);
  });
  const api = {
    async start(name: string) {
      return { name };
    },
  };

  observeAsyncMethod(target, api, 'start', (name) => ({
    activity: { source: 'gateway', label: 'gateway.start', detail: String(name) },
    network: { source: 'gateway', method: 'POST', url: 'ipc://xenesis/gatewayStart' },
  }));

  assert.deepEqual(await api.start('dev'), { name: 'dev' });
  assert.equal(events.length, 2);
  assert.equal((events[0] as any).phase, 'start');
  assert.equal((events[0] as any).activity.label, 'gateway.start');
  assert.equal((events[1] as any).phase, 'complete');
  assert.equal((events[1] as any).ok, true);
});

test('observeSyncMethod dispatches failure completion events', () => {
  const target = new EventTarget();
  const events: unknown[] = [];
  target.addEventListener(RENDERER_OBSERVABILITY_EVENT, (event) => {
    events.push((event as CustomEvent).detail);
  });
  const api = {
    write() {
      throw new Error('write failed');
    },
  };

  observeSyncMethod(target, api, 'write', () => ({
    activity: { source: 'terminal', label: 'terminal.write' },
  }));

  assert.throws(() => api.write(), /write failed/);
  assert.equal(events.length, 2);
  assert.equal((events[0] as any).phase, 'start');
  assert.equal((events[1] as any).phase, 'complete');
  assert.equal((events[1] as any).ok, false);
  assert.equal((events[1] as any).error, 'write failed');
});

test('installMainObservabilityForwarder republishes main IPC events as DOM events', () => {
  const target = new EventTarget();
  const events: unknown[] = [];
  const listeners = new Map<string, Function>();
  const ipc = {
    on(channel: string, listener: Function) {
      listeners.set(channel, listener);
    },
    removeListener(channel: string, listener: Function) {
      if (listeners.get(channel) === listener) listeners.delete(channel);
    },
  };
  target.addEventListener(RENDERER_OBSERVABILITY_EVENT, (event) => {
    events.push((event as CustomEvent).detail);
  });

  const cleanup = installMainObservabilityForwarder(target, ipc);
  listeners.get(MAIN_OBSERVABILITY_IPC_CHANNEL)?.(
    {},
    {
      id: 'main-preload-test',
      phase: 'complete',
      ok: true,
      activity: { source: 'mcp', label: 'mcp.bridge.request' },
    },
  );
  listeners.get(MAIN_OBSERVABILITY_IPC_CHANNEL)?.({}, { id: 'invalid' });

  assert.deepEqual(events, [
    {
      id: 'main-preload-test',
      phase: 'complete',
      ok: true,
      activity: { source: 'mcp', label: 'mcp.bridge.request' },
    },
  ]);

  cleanup();
  assert.equal(listeners.has(MAIN_OBSERVABILITY_IPC_CHANNEL), false);
});
