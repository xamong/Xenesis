import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMcpActionInboxRequest, createMcpActionInboxState, resolveMcpActionInboxItem } from './mcpActionInbox.mjs';
import {
  createXenesisWorkbenchApprovalController,
  projectXenesisApprovalRequest,
  projectXenesisApprovalRequests,
} from './xenesisWorkbenchApprovals.mjs';

test('projectXenesisApprovalRequest maps Action Inbox runtime-tool records to approval requests', () => {
  const item = {
    id: 'runtime-1',
    title: 'Approve shell command',
    kind: 'runtime-tool',
    command: '{"type":"xenesis-runtime-tool","toolCallId":"tool-1","name":"shell_command","input":{"command":"npm test"}}',
    description: 'Allow shell command',
    source: 'Xenesis Runtime',
    sessionId: 'session-1',
    approvalSessionKey: 'tool-1',
    requester: 'xenesis-agent-workbench',
    risk: 'medium',
    status: 'pending',
    callbackUrl: '',
    approveText: 'Approve',
    rejectText: 'Reject',
    createdAt: '2026-06-30T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z',
    expiresAt: '',
    resolvedAt: '',
    lastCallbackAt: '',
    result: '',
    error: '',
  };

  const approval = projectXenesisApprovalRequest(item);

  assert.equal(approval.id, 'runtime-1');
  assert.equal(approval.kind, 'runtime-tool');
  assert.equal(approval.sourceAgent, 'xenesis-agent-workbench');
  assert.equal(approval.sessionId, 'session-1');
  assert.equal(approval.status, 'pending');
  assert.equal(approval.legacy.toolCallId, 'tool-1');
  assert.equal(approval.legacy.name, 'shell_command');
});

test('approval controller records runtime approval requests and resolves the waiting promise', async () => {
  const state = createMcpActionInboxState();
  const controller = createXenesisWorkbenchApprovalController({
    applyActionInboxRequest: (raw) => applyMcpActionInboxRequest(state, raw),
    resolveActionInboxRequest: (request) => resolveMcpActionInboxItem(state, request),
    listActionInboxItems: () => [...state.items.values()],
    emitChanged: () => {},
    now: () => '2026-06-30T00:00:00.000Z',
  });

  const pending = controller.requestApproval(
    {
      approvalId: 'approval-1',
      toolCallId: 'tool-1',
      name: 'shell_command',
      input: { command: 'npm test' },
      reason: 'Needs shell access',
      riskLevel: 'medium',
      summary: 'Run tests',
    },
    {
      source: 'xenesis-agent-workbench',
      sessionId: 'session-1',
      runId: 'run-1',
    },
  );

  const approvals = projectXenesisApprovalRequests([...state.items.values()]);
  assert.equal(approvals.length, 1);
  assert.equal(approvals[0].kind, 'runtime-tool');
  assert.equal(approvals[0].sourceAgent, 'xenesis-agent-workbench');

  const resolved = await controller.resolveApproval({
    id: approvals[0].id,
    resolution: 'approve',
    scope: 'once',
  });
  assert.equal(resolved.ok, true);
  await assert.doesNotReject(async () => {
    assert.equal(await pending, true);
  });
});

test('approval controller auto-denies Workbench persistence tools unless context explicitly allows persistence', async () => {
  const state = createMcpActionInboxState();
  const controller = createXenesisWorkbenchApprovalController({
    applyActionInboxRequest: (raw) => applyMcpActionInboxRequest(state, raw),
    resolveActionInboxRequest: () => ({ ok: false, error: 'should not be called' }),
    listActionInboxItems: () => [...state.items.values()],
    emitChanged: () => {},
    now: () => '2026-06-30T00:00:00.000Z',
  });

  const approved = await controller.requestApproval(
    {
      approvalId: 'approval-1',
      toolCallId: 'tool-1',
      name: 'write_file',
      input: { path: 'D:\\Workspace\\Demo\\screen.md' },
      reason: 'Write file',
      riskLevel: 'medium',
      summary: 'Write markdown',
    },
    {
      source: 'xenesis-agent-workbench',
      sessionId: 'session-1',
      context: {
        persistencePolicy: 'explicit-user-request-only',
        allowPersistence: false,
      },
    },
  );

  assert.equal(approved, false);
  assert.equal([...state.items.values()].length, 0);
});
