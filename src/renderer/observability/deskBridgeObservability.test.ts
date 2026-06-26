import assert from 'node:assert/strict';
import test from 'node:test';
import { activityTimelineStore } from './activityTimelineStore';
import { startDeskBridgeCapabilityObservation } from './deskBridgeObservability';
import { networkMonitorStore } from './networkMonitorStore';

test('desk bridge observability records successful capability calls', () => {
  activityTimelineStore.clear();
  networkMonitorStore.clear();

  const observation = startDeskBridgeCapabilityObservation({
    path: 'xd.terminals.list',
    args: { apiKey: 'secret-value', maxBytes: 4096 },
    source: 'mcp',
  });

  assert.equal(activityTimelineStore.size(), 1);
  assert.equal(networkMonitorStore.size(), 1);

  observation.complete({ ok: true, path: 'xd.terminals.list', result: { ok: true } });

  const [event] = activityTimelineStore.getEvents({ limit: 1 });
  assert.equal(event.source, 'terminal');
  assert.equal(event.status, 'completed');
  assert.match(event.detail ?? '', /\[REDACTED\]/);
  assert.doesNotMatch(event.detail ?? '', /secret-value/);

  const [entry] = networkMonitorStore.getEntries({ limit: 1 });
  assert.equal(entry.source, 'mcp');
  assert.equal(entry.method, 'POST');
  assert.equal(entry.url, 'cr://xd.terminals.list');
  assert.equal(entry.status, 200);
  assert.match(entry.requestBody ?? '', /\[REDACTED\]/);
  assert.doesNotMatch(entry.requestBody ?? '', /secret-value/);
});

test('desk bridge observability records failed capability calls', () => {
  activityTimelineStore.clear();
  networkMonitorStore.clear();

  const observation = startDeskBridgeCapabilityObservation({
    path: 'xd.gateway.status',
    source: 'xenesis',
  });

  observation.complete({ ok: false, path: 'xd.gateway.status', error: 'Gateway offline' });

  const [event] = activityTimelineStore.getEvents({ limit: 1 });
  assert.equal(event.source, 'gateway');
  assert.equal(event.status, 'failed');

  const [entry] = networkMonitorStore.getEntries({ limit: 1 });
  assert.equal(entry.source, 'gateway');
  assert.equal(entry.status, 500);
  assert.equal(entry.error, 'Gateway offline');
});
