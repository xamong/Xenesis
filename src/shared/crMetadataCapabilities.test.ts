import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityAdapter,
  listDeskBridgeCapabilities,
} from './deskBridgeCapabilities';

describe('CR metadata capability registration', () => {
  it('registers and dispatches CR metadata paths', async () => {
    const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));
    assert.equal(paths.has('xd.cr.metadata.sync'), true);
    assert.equal(paths.has('xd.cr.metadata.capabilities'), true);
    assert.equal(paths.has('xd.cr.metadata.snapshots'), true);
    assert.equal(paths.has('xd.cr.metadata.runs'), true);

    const calls: string[] = [];
    const api: DeskBridgeCapabilityAdapter = {
      syncCrMetadata: () => {
        calls.push('sync');
        return { capabilities: 4 };
      },
      listCrMetadataCapabilities: () => {
        calls.push('capabilities');
        return [{ path: 'xd.meta.tree.load' }];
      },
      listCrMetadataSnapshots: () => {
        calls.push('snapshots');
        return [{ snapshotId: 'crsnap_test' }];
      },
      listCrMetadataRuns: () => {
        calls.push('runs');
        return [{ runId: 'crrun_test' }];
      },
    };

    assert.equal(
      (await callDeskBridgeCapability(api, { path: 'xd.cr.metadata.sync', source: 'internal', approved: true })).ok,
      true,
    );
    assert.equal((await callDeskBridgeCapability(api, { path: 'xd.cr.metadata.capabilities' })).ok, true);
    assert.equal((await callDeskBridgeCapability(api, { path: 'xd.cr.metadata.snapshots' })).ok, true);
    assert.equal((await callDeskBridgeCapability(api, { path: 'xd.cr.metadata.runs' })).ok, true);
    assert.deepEqual(calls, ['sync', 'capabilities', 'snapshots', 'runs']);
  });
});
