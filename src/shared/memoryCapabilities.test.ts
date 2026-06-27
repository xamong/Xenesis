import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callDeskBridgeCapability,
  createDeskBridgeCapabilityApprovalArgsHash,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
  verifyDeskBridgeCapabilityApprovalProof,
} from './deskBridgeCapabilities';

const MEMORY_PATHS = [
  'xd.memory.ledger.list',
  'xd.memory.ledger.search',
  'xd.memory.ledger.get',
  'xd.memory.ledger.history',
  'xd.memory.proposals.create',
  'xd.memory.proposals.list',
  'xd.memory.proposals.get',
  'xd.memory.proposals.accept',
  'xd.memory.proposals.reject',
  'xd.memory.evidence.list',
  'xd.memory.evidence.get',
  'xd.memory.obsidian.project',
  'xd.memory.policy.classify',
] as const;

function proof(path: string, args: unknown) {
  return verifyDeskBridgeCapabilityApprovalProof({
    kind: 'action-inbox' as const,
    path,
    source: 'mcp' as const,
    approvalId: 'approval-1',
    argsHash: createDeskBridgeCapabilityApprovalArgsHash(args),
    resolvedBy: 'user' as const,
    resolution: 'approve' as const,
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2999-01-01T00:00:00.000Z',
  });
}

test('memory governance capabilities are registered in CR', () => {
  for (const path of MEMORY_PATHS) {
    const node = findDeskBridgeCapability(path);
    assert.ok(node, `${path} should be registered`);
    assert.equal(node.callable, true, `${path} should be callable`);
  }
  assert.equal(findDeskBridgeCapability('xd.memory.proposals.accept')?.approval, 'always');
  assert.equal(findDeskBridgeCapability('xd.memory.proposals.reject')?.approval, 'always');
});

test('memory governance capabilities dispatch through adapter coverage', async () => {
  const calls: string[] = [];
  const adapter: DeskBridgeCapabilityAdapter = {
    memoryLedgerList: () => calls.push('memoryLedgerList'),
    memoryLedgerSearch: () => calls.push('memoryLedgerSearch'),
    memoryLedgerGet: () => calls.push('memoryLedgerGet'),
    memoryLedgerHistory: () => calls.push('memoryLedgerHistory'),
    memoryProposalCreate: () => calls.push('memoryProposalCreate'),
    memoryProposalList: () => calls.push('memoryProposalList'),
    memoryProposalGet: () => calls.push('memoryProposalGet'),
    memoryProposalAccept: () => calls.push('memoryProposalAccept'),
    memoryProposalReject: () => calls.push('memoryProposalReject'),
    memoryEvidenceList: () => calls.push('memoryEvidenceList'),
    memoryEvidenceGet: () => calls.push('memoryEvidenceGet'),
    memoryObsidianProject: () => calls.push('memoryObsidianProject'),
    memoryPolicyClassify: () => calls.push('memoryPolicyClassify'),
  };

  for (const path of MEMORY_PATHS) {
    const args =
      path.endsWith('.accept') || path.endsWith('.reject')
        ? { id: 'proposal-1' }
        : path === 'xd.memory.obsidian.project'
          ? { area: 'outputs', fileName: 'memory-dashboard.md' }
          : {};
    const result = await callDeskBridgeCapability(adapter, {
      path,
      args,
      source: 'mcp',
      approved: path.endsWith('.accept') || path.endsWith('.reject') || path === 'xd.memory.obsidian.project',
      approvalProof:
        path.endsWith('.accept') || path.endsWith('.reject') || path === 'xd.memory.obsidian.project'
          ? proof(path, args)
          : undefined,
    });
    assert.equal(result.ok, true, `${path} should dispatch`);
  }

  assert.deepEqual(calls, [
    'memoryLedgerList',
    'memoryLedgerSearch',
    'memoryLedgerGet',
    'memoryLedgerHistory',
    'memoryProposalCreate',
    'memoryProposalList',
    'memoryProposalGet',
    'memoryProposalAccept',
    'memoryProposalReject',
    'memoryEvidenceList',
    'memoryEvidenceGet',
    'memoryObsidianProject',
    'memoryPolicyClassify',
  ]);
});

test('memory dashboard and projection capabilities are registered and routed', async () => {
  assert.equal(findDeskBridgeCapability('xd.tools.core.memoryDashboard.open')?.callable, true);
  assert.equal(findDeskBridgeCapability('xd.tools.core.memoryDashboard.open')?.permission, 'control');
  assert.equal(findDeskBridgeCapability('xd.memory.obsidian.project')?.permission, 'write');
  assert.equal(findDeskBridgeCapability('xd.memory.obsidian.project')?.approval, 'when-external');

  const calls: unknown[] = [];
  const openResult = await callDeskBridgeCapability(
    {
      runExtensionCommand: (args) => {
        calls.push(args);
        return { ok: true };
      },
    },
    {
      path: 'xd.tools.core.memoryDashboard.open',
      source: 'mcp',
    },
  );

  assert.equal(openResult.ok, true);
  assert.deepEqual(calls, [{ commandId: 'xenesis-desk.core-tools.openMemoryDashboard' }]);
});

test('memory proposal decisions reject caller-supplied approval without proof', async () => {
  let calls = 0;
  const result = await callDeskBridgeCapability(
    {
      memoryProposalAccept: () => {
        calls += 1;
        return { ok: true };
      },
    },
    {
      path: 'xd.memory.proposals.accept',
      args: { id: 'proposal-1' },
      source: 'mcp',
      approved: true,
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.approvalRequired, true);
  assert.equal(calls, 0);
});

test('memory proposal decisions reject proof with mismatched arguments', async () => {
  let calls = 0;
  const args = { id: 'proposal-1' };
  const result = await callDeskBridgeCapability(
    {
      memoryProposalReject: () => {
        calls += 1;
        return { ok: true };
      },
    },
    {
      path: 'xd.memory.proposals.reject',
      args,
      source: 'mcp',
      approved: true,
      approvalProof: { ...proof('xd.memory.proposals.reject', { id: 'other' }), argsHash: 'wrong-hash' },
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.approvalRequired, true);
  assert.equal(calls, 0);
});

test('memory capability audit redacts memory text arguments', async () => {
  let auditArgs: unknown;
  const result = await callDeskBridgeCapability(
    {
      memoryProposalCreate: () => ({ ok: true, proposal: { id: 'proposal-1' } }),
      recordAudit: (record) => {
        auditArgs = record.args;
        return { ok: true };
      },
    },
    {
      path: 'xd.memory.proposals.create',
      args: {
        id: 'secret-1',
        text: '내 API key는 sk-test-123456 이다',
        input: { claim: '민감한 본문', content: 'hidden text' },
      },
      source: 'mcp',
    },
  );

  assert.equal(result.ok, true);
  const serialized = JSON.stringify(auditArgs);
  assert.ok(!serialized.includes('sk-test-123456'), serialized);
  assert.ok(!serialized.includes('민감한 본문'), serialized);
  assert.ok(serialized.includes('[redacted: memory audit]'), serialized);
});
