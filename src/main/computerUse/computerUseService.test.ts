import assert from 'node:assert/strict';
import test from 'node:test';
import { createComputerUseService } from './computerUseService';

test('service captures with metadata and stores a record', async () => {
  const service = createComputerUseService({
    adapter: {
      capture: async () => ({
        ok: true,
        text: 'Window',
        elements: [{ role: 'button', label: 'OK' }],
        screenshot: 'abc',
      }),
      listApps: async () => ({ ok: true, apps: [{ name: 'Notepad' }] }),
      act: async () => ({ ok: true, readback: 'done' }),
    },
  });

  const result = await service.call('xd.computer.capture', { mode: 'som' });

  assert.equal(result.ok, true);
  assert.equal(Array.isArray((result.result as { elements?: unknown[] }).elements), true);
  assert.equal((result.result as { elements: unknown[] }).elements.length, 1);
  assert.equal(typeof (result.result as { record?: { id?: unknown } }).record?.id, 'string');

  const actions = await service.call('xd.computer.actions.list', {});
  assert.equal((actions.result as { records: unknown[] }).records.length, 1);
});

test('service fails closed when native computer-use is unavailable', async () => {
  const service = createComputerUseService();
  const result = await service.call('xd.computer.capture', {});

  assert.equal(result.ok, false);
  assert.match(result.error || '', /not available/i);
});

test('service fails closed for risky actions when native computer-use is unavailable', async () => {
  const service = createComputerUseService();
  const result = await service.call('xd.computer.click', { element: 1 });

  assert.equal(result.ok, false);
  assert.equal(result.approvalRequired, undefined);
  assert.match(result.error || '', /not available/i);
});

test('service executes risky actions only after CR approval is satisfied', async () => {
  const actions: string[] = [];
  const service = createComputerUseService({
    adapter: {
      act: async (kind) => {
        actions.push(kind);
        return { ok: true, readback: 'clicked' };
      },
    },
  });

  const unapproved = await service.call('xd.computer.click', { element: 1 });
  assert.equal(unapproved.ok, false);
  assert.equal(unapproved.approvalRequired, true);
  assert.deepEqual(actions, []);

  const approved = await service.call('xd.computer.click', { element: 1 }, { approved: true });
  assert.equal(approved.ok, true);
  assert.equal((approved.result as { record?: { result?: unknown; readback?: unknown } }).record?.result, 'executed');
  assert.equal((approved.result as { record?: { result?: unknown; readback?: unknown } }).record?.readback, 'clicked');
  assert.deepEqual(actions, ['click']);
});

test('service stop prevents later computer-use actions and records the denial', async () => {
  const actions: string[] = [];
  const service = createComputerUseService({
    adapter: {
      act: async (kind) => {
        actions.push(kind);
        return { ok: true, readback: 'done' };
      },
    },
  });

  const stop = await service.call('xd.computer.stop', {});
  assert.equal(stop.ok, true);

  const click = await service.call('xd.computer.click', { element: 1 }, { approved: true });
  assert.equal(click.ok, false);
  assert.match(click.error || '', /stopped/i);
  assert.equal(
    (click.result as { record?: { policy?: { allowed?: unknown }; result?: unknown } }).record?.policy?.allowed,
    false,
  );
  assert.equal((click.result as { record?: { result?: unknown } }).record?.result, 'denied');
  assert.deepEqual(actions, []);
});

test('service records failed native actions with adapter readback errors', async () => {
  const service = createComputerUseService({
    adapter: {
      act: async () => ({ ok: false, error: 'native click failed' }),
    },
  });

  const result = await service.call('xd.computer.click', { element: 1 }, { approved: true });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'native click failed');
  assert.equal((result.result as { record?: { result?: unknown } }).record?.result, 'failed');
});
