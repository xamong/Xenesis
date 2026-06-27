import { afterEach, describe, expect, it, vi } from 'vitest';
import { deskCallCapabilityTool, deskXvCommandTool } from '../../src/tools/deskBridgeTools.js';
import { createDeskOperationTool } from '../../src/tools/deskOperationTool.js';
import type { ToolContext } from '../../src/tools/types.js';

function toolContext(): ToolContext {
  return {
    workspaceRoot: 'E:/tmp',
    cwd: 'E:/tmp',
    sessionId: 'approval-output-test',
    env: {
      XENIS_MCP_BRIDGE_URL: 'http://bridge.test',
    } as NodeJS.ProcessEnv,
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  };
}

function approvalPayload(path = 'xd.memory.proposals.accept') {
  return {
    ok: false,
    approvalRequired: true,
    path,
    actionInboxItem: {
      id: 'approval-secret-id',
      title: 'Approve hidden memory write',
      kind: 'capability',
      command: path,
      status: 'pending',
    },
  };
}

function mockBridge(payload: Record<string, unknown>) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

function expectGenericApprovalText(content: string) {
  expect(content).toMatch(/Desk approval/i);
  expect(content).not.toContain('approval-secret-id');
  expect(content).not.toContain('Approval request');
  expect(content).not.toContain('actionInboxItem');
  expect(content).not.toContain('approvalRequired');
  expect(content).not.toMatch(/xd\.[a-z.]+/);
}

describe('Desk approval output redaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps desk_call_capability approval text generic', async () => {
    mockBridge(approvalPayload('xd.memory.proposals.accept'));

    const result = await deskCallCapabilityTool.run(
      {
        path: 'xd.memory.proposals.accept',
        args: { proposalId: 'proposal-secret' },
        approved: false,
        timeoutMs: 5000,
      },
      toolContext(),
    );

    expect(result.ok).toBe(true);
    expectGenericApprovalText(result.content);
  });

  it('keeps /xd approval text generic', async () => {
    mockBridge(approvalPayload('xd.files.open'));

    const result = await deskXvCommandTool.run(
      {
        command: '/xd call xd.files.open {"filePath":"E:/secret.txt"}',
        approved: false,
        timeoutMs: 5000,
      },
      toolContext(),
    );

    expect(result.ok).toBe(true);
    expectGenericApprovalText(result.content);
  });

  it('keeps desk_operation approval text generic', async () => {
    mockBridge(approvalPayload('xd.ops.run'));

    const operationTool = createDeskOperationTool();
    const result = await operationTool.run(
      {
        mode: 'run',
        operation: {
          workflow: 'approval-output',
          steps: [{ type: 'generateDocument', args: { outPath: 'E:/secret.docx' } }],
        },
        approved: false,
        timeoutMs: 5000,
      },
      toolContext(),
    );

    expect(result.ok).toBe(true);
    expectGenericApprovalText(result.content);
  });
});
