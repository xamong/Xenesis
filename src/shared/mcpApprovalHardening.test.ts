import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callDeskBridgeCapability,
  createDeskBridgeCapabilityApprovalArgsHash,
  type DeskBridgeCapabilityAdapter,
  findDeskBridgeCapability,
  normalizeDeskBridgeCapabilityTransportSource,
  shouldTrustDeskBridgeCallerApproval,
  verifyDeskBridgeCapabilityApprovalProof,
} from './deskBridgeCapabilities';

function approvalProof(path: string, args: unknown) {
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

test('MCP caller-supplied approved flag cannot authorize approval-required capabilities', async () => {
  let calls = 0;
  const api: DeskBridgeCapabilityAdapter = {
    runExternalAppAction: () => {
      calls += 1;
      return { ok: true, windows: [], message: 'launched' };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.apps.launch',
    args: { appId: 'notepad' },
    source: 'mcp',
    approved: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.approvalRequired, true);
  assert.match(result.error || '', /requires approval/i);
  assert.equal(calls, 0);
});

test('MCP action inbox resolve is not externally self-resolvable', async () => {
  const node = findDeskBridgeCapability('xd.mcp.actionInbox.resolve');
  assert.equal(node?.approval, 'when-external');

  let calls = 0;
  const result = await callDeskBridgeCapability(
    {
      resolveMcpActionInbox: () => {
        calls += 1;
        return { ok: true };
      },
    },
    {
      path: 'xd.mcp.actionInbox.resolve',
      args: { id: 'approval-1', resolution: 'approve' },
      source: 'mcp',
      approved: true,
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.approvalRequired, true);
  assert.match(result.error || '', /requires approval/i);
  assert.equal(calls, 0);
});

test('internal action inbox resolution remains callable without external approval', async () => {
  let calls = 0;
  const result = await callDeskBridgeCapability(
    {
      resolveMcpActionInbox: () => {
        calls += 1;
        return { ok: true };
      },
    },
    {
      path: 'xd.mcp.actionInbox.resolve',
      args: { id: 'approval-1', resolution: 'approve' },
      source: 'internal',
    },
  );

  assert.equal(result.ok, true);
  assert.equal(calls, 1);
});

test('MCP approval proof authorizes the matching approved capability', async () => {
  let calls = 0;
  const api: DeskBridgeCapabilityAdapter = {
    runExternalAppAction: () => {
      calls += 1;
      return { ok: true, windows: [], message: 'launched' };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.apps.launch',
    args: { appId: 'notepad' },
    source: 'mcp',
    approved: true,
    approvalProof: approvalProof('xd.apps.launch', { appId: 'notepad' }),
  });

  assert.equal(result.ok, true);
  assert.equal(calls, 1);
});

test('MCP approval proof must match the capability path and source', async () => {
  let calls = 0;
  const api: DeskBridgeCapabilityAdapter = {
    runExternalAppAction: () => {
      calls += 1;
      return { ok: true, windows: [], message: 'launched' };
    },
  };

  const result = await callDeskBridgeCapability(api, {
    path: 'xd.apps.launch',
    args: { appId: 'notepad' },
    source: 'mcp',
    approved: true,
    approvalProof: approvalProof('xd.apps.close', { appId: 'notepad' }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.approvalRequired, true);
  assert.equal(calls, 0);
});

test('MCP approval proof object is rejected when it was not verified by Desk', async () => {
  let calls = 0;
  const api: DeskBridgeCapabilityAdapter = {
    runExternalAppAction: () => {
      calls += 1;
      return { ok: true, windows: [], message: 'launched' };
    },
  };

  const args = { appId: 'notepad' };
  const result = await callDeskBridgeCapability(api, {
    path: 'xd.apps.launch',
    args,
    source: 'mcp',
    approved: true,
    approvalProof: {
      kind: 'action-inbox',
      path: 'xd.apps.launch',
      source: 'mcp',
      approvalId: 'forged',
      argsHash: createDeskBridgeCapabilityApprovalArgsHash(args),
      resolvedBy: 'user',
      resolution: 'approve',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2999-01-01T00:00:00.000Z',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.approvalRequired, true);
  assert.equal(calls, 0);
});

test('MCP transport cannot spoof capability source or caller approval', () => {
  assert.equal(normalizeDeskBridgeCapabilityTransportSource('xenesis', 'mcp'), 'mcp');
  assert.equal(normalizeDeskBridgeCapabilityTransportSource('internal', 'mcp'), 'mcp');
  assert.equal(shouldTrustDeskBridgeCallerApproval('mcp'), false);
});

test('non-MCP internal transports can preserve existing source and approval behavior', () => {
  assert.equal(normalizeDeskBridgeCapabilityTransportSource('xenesis', 'workflow'), 'xenesis');
  assert.equal(normalizeDeskBridgeCapabilityTransportSource('mcp', 'workflow'), 'mcp');
  assert.equal(shouldTrustDeskBridgeCallerApproval('workflow'), true);
});
