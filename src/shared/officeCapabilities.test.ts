import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
  listDeskBridgeCapabilities,
} from './deskBridgeCapabilities';

test('office capabilities are registered with approval metadata', () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));
  for (const path of [
    'xd.office',
    'xd.office.status',
    'xd.office.excel.createWorkbook',
    'xd.office.excel.inspectWorkbook',
    'xd.office.excel.openWorkbook',
    'xd.office.excel.readRange',
    'xd.office.excel.writeRange',
    'xd.office.excel.saveWorkbook',
    'xd.office.excel.closeWorkbook',
    'xd.office.excel.exportPdf',
  ]) {
    assert.equal(paths.has(path), true, `${path} should be registered`);
  }

  assert.equal(findDeskBridgeCapability('xd.office.status')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.office.status')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.office.excel.createWorkbook')?.permission, 'write');
  assert.equal(findDeskBridgeCapability('xd.office.excel.createWorkbook')?.approval, 'when-external');
  assert.equal(findDeskBridgeCapability('xd.office.excel.readRange')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.office.excel.writeRange')?.permission, 'write');
  assert.equal(findDeskBridgeCapability('xd.office.excel.writeRange')?.approval, 'when-external');
  assert.equal(findDeskBridgeCapability('xd.office.excel.saveWorkbook')?.approval, 'always');
  assert.equal(findDeskBridgeCapability('xd.office.excel.exportPdf')?.approval, 'always');
});

test('office capabilities dispatch normalized actions to the adapter', async () => {
  const calls: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    runOfficeAction: (path, args) => {
      calls.push({ path, args });
      if (path === 'xd.office.status') {
        return {
          ok: true,
          action: 'status',
          providers: [{ id: 'file', available: true, apps: ['excel'] }],
          message: 'ok',
        };
      }
      if (path === 'xd.office.excel.createWorkbook') {
        return { ok: true, action: 'excel.createWorkbook', path: 'C:/work/generated.xlsx', message: 'ok' };
      }
      return { ok: true, action: path, message: 'ok' };
    },
  };

  const blocked = await callDeskBridgeCapability(api, {
    path: 'xd.office.excel.createWorkbook',
    args: { sheets: [{ name: 'Summary', rows: [['A']] }] },
    source: 'xenesis',
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.approvalRequired, true);
  assert.equal(calls.length, 0);

  const created = await callDeskBridgeCapability(api, {
    path: 'xd.office.excel.createWorkbook',
    args: { sheets: [{ name: 'Summary', rows: [['A']] }] },
    source: 'xenesis',
    approved: true,
  });
  assert.equal(created.ok, true);
  assert.equal(created.path, 'xd.office.excel.createWorkbook');
  assert.deepEqual(created.result, {
    ok: true,
    action: 'excel.createWorkbook',
    path: 'C:/work/generated.xlsx',
    message: 'ok',
  });
  assert.equal(calls.length, 1);
  assert.equal((calls[0] as { path: string }).path, 'xd.office.excel.createWorkbook');

  const status = await callDeskBridgeCapability(api, {
    path: 'xd.office.status',
    source: 'xenesis',
  });
  assert.equal(status.ok, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(status.result, {
    ok: true,
    action: 'status',
    providers: [{ id: 'file', available: true, apps: ['excel'] }],
    message: 'ok',
  });

  const exportBlocked = await callDeskBridgeCapability(api, {
    path: 'xd.office.excel.exportPdf',
    args: { path: 'C:/work/report.xlsx', outputPath: 'C:/work/report.pdf' },
    source: 'xenesis',
  });
  assert.equal(exportBlocked.ok, false);
  assert.equal(exportBlocked.approvalRequired, true);
});
