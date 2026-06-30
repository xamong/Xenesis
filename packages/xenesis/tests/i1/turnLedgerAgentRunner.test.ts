import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { runEmbeddedPrompt } from '../../src/api/embedded.js';
import { AgentRunner } from '../../src/core/AgentRunner.js';
import type { AgentRunPipelineOptions } from '../../src/core/AgentRunPipeline.js';
import type { ToolCall } from '../../src/core/messages.js';
import type { ResumableRunState } from '../../src/core/resume/ResumableRunState.js';
import { createTurnLedger } from '../../src/core/turnLedger.js';
import type { AgentProvider } from '../../src/providers/types.js';
import type { Tool } from '../../src/tools/types.js';

describe('AgentRunner turn ledger integration', () => {
  test('records provider start and completion evidence', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider: AgentProvider = {
      name: 'test-provider',
      model: 'test-model',
      async complete() {
        return {
          message: { role: 'assistant', content: 'done' },
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        };
      },
    };

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-ledger',
      tools: [],
      maxTurns: 1,
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk 상태 알려줘');

    const current = ledger.current();
    expect(current?.provider.resolved).toBe('test-provider');
    expect(current?.provider.processModel).toBeUndefined();
    expect(current?.status).toBe('completed');
    expect(current?.evidence.map((item) => item.kind)).toContain('provider-started');
  });

  test('marks the ledger cancelled when a run is aborted before provider execution', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const abortController = new AbortController();
    abortController.abort();

    const runner = new AgentRunner({
      provider: providerThatShouldNotRun(),
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-ledger-cancelled-before-provider',
      tools: [],
      maxTurns: 1,
      abortSignal: abortController.signal,
      turnLedger: ledger,
    });

    const result = await runner.runToCompletion('중단해줘');

    expect(result).toMatchObject({ status: 'stopped', reason: 'cancelled' });
    expect(ledger.current()?.status).toBe('cancelled');
    expect(ledger.current()?.result?.finishReason).toBe('cancelled');
  });

  test('marks the ledger cancelled when provider execution is aborted', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider: AgentProvider = {
      name: 'aborting-provider',
      model: 'test-model',
      async complete() {
        const error = new Error('provider aborted');
        error.name = 'AbortError';
        throw error;
      },
    };

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-ledger-cancelled-provider',
      tools: [],
      maxTurns: 1,
      turnLedger: ledger,
    });

    const result = await runner.runToCompletion('중단해줘');

    expect(result).toMatchObject({ status: 'stopped', reason: 'cancelled' });
    expect(ledger.current()?.status).toBe('cancelled');
    expect(ledger.current()?.result?.finishReason).toBe('cancelled');
  });

  test('marks the ledger blocked when token budget stops the run', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const runner = new AgentRunner({
      provider: providerThatShouldNotRun(),
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-ledger-budget-blocked',
      tools: [],
      maxTurns: 1,
      maxTokensBudget: 0,
      turnLedger: ledger,
    });

    const result = await runner.runToCompletion('예산 확인');

    expect(result).toMatchObject({ status: 'stopped', reason: 'budget' });
    expect(ledger.current()?.status).toBe('blocked');
    expect(ledger.current()?.result?.finishReason).toBe('blocked');
  });

  test('marks the ledger blocked when max turns stops the run', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const runner = new AgentRunner({
      provider: providerThatShouldNotRun(),
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-ledger-max-turns-blocked',
      tools: [],
      maxTurns: 0,
      turnLedger: ledger,
    });

    const result = await runner.runToCompletion('턴 제한 확인');

    expect(result).toMatchObject({ status: 'stopped', reason: 'max_turns' });
    expect(ledger.current()?.status).toBe('blocked');
    expect(ledger.current()?.result?.finishReason).toBe('blocked');
  });

  test('records CR read call and readback evidence before completion', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider = toolThenFinalProvider({
      id: 'call-read',
      name: 'desk_call_capability',
      input: { path: 'xd.app.status' },
    });
    const tool = deskCapabilityTool({
      readOnly: true,
      data: {
        structuredContent: {
          ok: true,
          path: 'xd.app.status',
          permission: 'read',
          approvalRequired: false,
        },
      },
    });

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-cr-read',
      tools: [tool],
      maxTurns: 2,
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk 상태 알려줘');

    const current = ledger.current();
    expect(current?.status).toBe('completed');
    expect(current?.toolCalls[0]).toMatchObject({
      id: 'call-read',
      status: 'completed',
    });
    expect(current?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mcp-tool-called',
          path: 'xd.app.status',
          id: 'call-read',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'cr-capability-called',
          path: 'xd.app.status',
          id: 'call-read',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'readback',
          path: 'xd.app.status',
          id: 'call-read',
          verified: true,
        }),
      ]),
    );
  });

  test('marks a failed tool call in the ledger', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider = toolThenFinalProvider({
      id: 'call-failed-tool',
      name: 'failing_read',
      input: { path: 'xd.app.status' },
    });
    const tool: Tool<{ path: string }> = {
      name: 'failing_read',
      description: 'fake failing read tool',
      inputSchema: z.object({ path: z.string() }),
      isMcp: true,
      isReadOnly: () => true,
      async run(input) {
        return { ok: false, content: `failed ${input.path}` };
      },
    };

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-ledger-failed-tool',
      tools: [tool],
      maxTurns: 1,
      turnLedger: ledger,
    });

    const result = await runner.runToCompletion('Desk 상태 알려줘');

    expect(result).toMatchObject({ status: 'stopped', reason: 'max_turns' });
    expect(ledger.current()?.toolCalls[0]).toMatchObject({
      id: 'call-failed-tool',
      status: 'failed',
    });
  });

  test('blocks a mutating CR call final response without readback evidence', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider = toolThenFinalProvider({
      id: 'call-mutate',
      name: 'desk_call_capability',
      input: { path: 'xd.apps.launch' },
    });
    const tool = deskCapabilityTool({ readOnly: false });

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-cr-mutation',
      tools: [tool],
      maxTurns: 2,
      approvalMode: 'auto',
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk에서 앱 열어줘');

    const current = ledger.current();
    expect(current?.status).toBe('blocked');
    expect(current?.result?.finishReason).toBe('readback_missing');
    expect(current?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'cr-capability-called',
          path: 'xd.apps.launch',
          id: 'call-mutate',
          verified: true,
        }),
      ]),
    );
    expect(current?.evidence.map((item) => item.kind)).not.toContain('readback');
    expect(current?.evidence.map((item) => item.kind)).not.toContain('final-response');
  });

  test('classifies sanitized Xenesis Desk MCP call tools as CR calls', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const toolName = 'mcp__xenesis-dev__xenesis_desk_call_capability';
    const provider = toolThenFinalProvider({
      id: 'call-mcp-cr',
      name: toolName,
      input: { path: 'xd.app.status' },
    });
    const tool = deskCapabilityTool({
      name: toolName,
      readOnly: true,
      data: {
        structuredContent: {
          ok: true,
          path: 'xd.app.status',
          permission: 'read',
          approvalRequired: false,
        },
      },
    });

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-mcp-cr-tool-name',
      tools: [tool],
      maxTurns: 2,
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk 상태 알려줘');

    expect(ledger.current()?.status).toBe('completed');
    expect(ledger.current()?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mcp-tool-called',
          id: 'call-mcp-cr',
          path: 'xd.app.status',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'cr-capability-called',
          id: 'call-mcp-cr',
          path: 'xd.app.status',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'readback',
          id: 'call-mcp-cr',
          path: 'xd.app.status',
          verified: true,
        }),
      ]),
    );
  });

  test('records CLI provider Desk MCP transcript calls without inferring readback', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider: AgentProvider = {
      name: 'codex-cli',
      model: 'test-model',
      capabilities: {
        transport: 'cli-oneshot',
        streaming: true,
        persistentSession: false,
      },
      async complete() {
        return {
          message: {
            role: 'assistant',
            content: 'live-turn-ledger-cr-ok',
            providerMetadata: {
              cli: {
                provider: 'codex-cli',
                command: 'codex',
                xenesisDeskMcpConfigured: true,
                stderr: [
                  'mcp: xenesis_dev/xenesis_desk_call_capability started',
                  'mcp: xenesis_dev/xenesis_desk_call_capability (completed)',
                ].join('\n'),
              },
            },
          },
        };
      },
    };

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-cli-mcp-transcript',
      tools: [],
      maxTurns: 1,
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk 상태 알려줘');

    expect(ledger.current()?.status).toBe('blocked');
    expect(ledger.current()?.result?.finishReason).toBe('readback_missing');
    expect(ledger.current()?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mcp-tool-called',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'cr-capability-called',
          verified: true,
        }),
      ]),
    );
    expect(ledger.current()?.evidence.map((item) => item.kind)).not.toContain('readback');
    expect(ledger.current()?.toolCalls).toEqual([
      expect.objectContaining({
        name: 'xenesis_desk_call_capability',
        status: 'completed',
      }),
    ]);
  });

  test('preserves repeated CLI provider Desk MCP transcript calls as separate ledger tool calls', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider: AgentProvider = {
      name: 'codex-cli',
      model: 'test-model',
      capabilities: {
        transport: 'cli-oneshot',
        streaming: true,
        persistentSession: false,
      },
      async complete() {
        return {
          message: {
            role: 'assistant',
            content: 'live-turn-ledger-cr-ok',
            providerMetadata: {
              cli: {
                provider: 'codex-cli',
                command: 'codex',
                xenesisDeskMcpConfigured: true,
                stderr: [
                  'mcp: xenesis_dev/xenesis_desk_call_capability started',
                  'mcp: xenesis_dev/xenesis_desk_call_capability (completed)',
                  'mcp: xenesis_dev/xenesis_desk_call_capability started',
                  'mcp: xenesis_dev/xenesis_desk_call_capability (completed)',
                ].join('\n'),
              },
            },
          },
        };
      },
    };

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-cli-mcp-transcript-repeated',
      tools: [],
      maxTurns: 1,
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk 상태 알려줘');

    const transcriptToolCalls = ledger
      .current()
      ?.toolCalls.filter((item) => item.name === 'xenesis_desk_call_capability');
    expect(transcriptToolCalls).toHaveLength(2);
    expect(new Set(transcriptToolCalls?.map((item) => item.id)).size).toBe(2);
  });

  test('records CLI provider Desk MCP discovery transcript calls without inferring readback', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider: AgentProvider = {
      name: 'codex-cli',
      model: 'test-model',
      capabilities: {
        transport: 'cli-oneshot',
        streaming: true,
        persistentSession: false,
      },
      async complete() {
        return {
          message: {
            role: 'assistant',
            content: 'listed and described Desk capabilities',
            providerMetadata: {
              cli: {
                provider: 'codex-cli',
                command: 'codex',
                xenesisDeskMcpConfigured: true,
                stderr: [
                  'mcp: xenesis_dev/xenesis_desk_capabilities started',
                  'mcp: xenesis_dev/xenesis_desk_capabilities (completed)',
                  'mcp: xenesis_dev/xenesis_desk_capability started',
                  'mcp: xenesis_dev/xenesis_desk_capability (completed)',
                ].join('\n'),
              },
            },
          },
        };
      },
    };

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-cli-mcp-discovery-transcript',
      tools: [],
      maxTurns: 1,
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk 기능 목록과 상태 경로를 확인해줘');

    expect(ledger.current()?.status).toBe('blocked');
    expect(ledger.current()?.result?.finishReason).toBe('readback_missing');
    expect(ledger.current()?.evidence.map((item) => item.kind)).not.toContain('readback');
    expect(ledger.current()?.toolCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'xenesis_desk_capabilities',
          status: 'completed',
        }),
        expect.objectContaining({
          name: 'xenesis_desk_capability',
          status: 'completed',
        }),
      ]),
    );
    expect(ledger.current()?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'mcp-tool-called',
          summary: expect.stringContaining('xenesis_desk_capabilities'),
        }),
        expect.objectContaining({
          kind: 'cr-capability-called',
          summary: expect.stringContaining('xenesis_desk_capability'),
        }),
      ]),
    );
  });

  test('blocks call_capability marked read-only without structured readback metadata', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider = toolThenFinalProvider({
      id: 'call-readonly-no-metadata',
      name: 'xenesis_desk_call_capability',
      input: { path: 'xd.app.status' },
    });
    const tool = deskCapabilityTool({
      name: 'xenesis_desk_call_capability',
      readOnly: true,
      isMcp: true,
    });

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-call-capability-readonly-no-metadata',
      tools: [tool],
      maxTurns: 2,
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk 상태 알려줘');

    expect(ledger.current()?.status).toBe('blocked');
    expect(ledger.current()?.result?.finishReason).toBe('readback_missing');
    expect(ledger.current()?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'cr-capability-called',
          id: 'call-readonly-no-metadata',
          path: 'xd.app.status',
          verified: true,
        }),
      ]),
    );
    expect(ledger.current()?.evidence.map((item) => item.kind)).not.toContain('readback');
    expect(ledger.current()?.evidence.map((item) => item.kind)).not.toContain('final-response');
  });

  test('records readback for Xenesis Desk MCP capabilities tools even when not marked read-only', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const toolName = 'xenesis_dev.xenesis_desk_capabilities';
    const provider = toolThenFinalProvider({
      id: 'call-capabilities',
      name: toolName,
      input: { path: 'xd.app.status' },
    });
    const tool = deskCapabilityTool({ name: toolName, readOnly: false, isMcp: true });

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-mcp-capabilities-readback',
      tools: [tool],
      maxTurns: 2,
      approvalMode: 'auto',
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk capabilities 알려줘');

    expect(ledger.current()?.status).toBe('completed');
    expect(ledger.current()?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'cr-capability-called',
          id: 'call-capabilities',
          path: 'xd.app.status',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'readback',
          id: 'call-capabilities',
          path: 'xd.app.status',
          verified: true,
        }),
      ]),
    );
  });

  test('classifies native Xenesis Desk capability describe tools as CR readback', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider = toolThenFinalProvider({
      id: 'call-capability-describe',
      name: 'xenesis_desk_capability',
      input: { path: 'xd.app.status' },
    });
    const tool = deskCapabilityTool({ name: 'xenesis_desk_capability', readOnly: false });

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-native-capability-readback',
      tools: [tool],
      maxTurns: 2,
      approvalMode: 'auto',
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk capability 설명해줘');

    expect(ledger.current()?.status).toBe('completed');
    expect(ledger.current()?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'cr-capability-called',
          id: 'call-capability-describe',
          path: 'xd.app.status',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'readback',
          id: 'call-capability-describe',
          path: 'xd.app.status',
          verified: true,
        }),
      ]),
    );
  });

  test('records readback for call_capability when structured result metadata is read-only', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider = toolThenFinalProvider({
      id: 'call-structured-read',
      name: 'xenesis_desk_call_capability',
      input: { path: 'xd.app.status' },
    });
    const tool = deskCapabilityTool({
      name: 'xenesis_desk_call_capability',
      readOnly: false,
      isMcp: true,
      data: {
        structuredContent: {
          ok: true,
          path: 'xd.app.status',
          permission: 'read',
          approvalRequired: false,
        },
      },
    });

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-call-capability-structured-read',
      tools: [tool],
      maxTurns: 2,
      approvalMode: 'auto',
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk 상태 알려줘');

    expect(ledger.current()?.status).toBe('completed');
    expect(ledger.current()?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'cr-capability-called',
          id: 'call-structured-read',
          path: 'xd.app.status',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'readback',
          id: 'call-structured-read',
          path: 'xd.app.status',
          verified: true,
        }),
      ]),
    );
  });

  test('blocks call_capability execute metadata without readback evidence', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider = toolThenFinalProvider({
      id: 'call-structured-execute',
      name: 'xenesis_desk_call_capability',
      input: { path: 'xd.apps.launch' },
    });
    const tool = deskCapabilityTool({
      name: 'xenesis_desk_call_capability',
      readOnly: false,
      isMcp: true,
      data: {
        structuredContent: {
          ok: true,
          path: 'xd.apps.launch',
          permission: 'execute',
          approvalRequired: true,
        },
      },
    });

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-call-capability-structured-execute',
      tools: [tool],
      maxTurns: 2,
      approvalMode: 'auto',
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk 앱 열어줘');

    expect(ledger.current()?.status).toBe('blocked');
    expect(ledger.current()?.result?.finishReason).toBe('readback_missing');
    expect(ledger.current()?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'cr-capability-called',
          id: 'call-structured-execute',
          path: 'xd.apps.launch',
          verified: true,
        }),
      ]),
    );
    expect(ledger.current()?.evidence.map((item) => item.kind)).not.toContain('readback');
    expect(ledger.current()?.evidence.map((item) => item.kind)).not.toContain('final-response');
  });

  test('records approval path from CR input when approval pauses', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider = toolThenFinalProvider({
      id: 'call-approval-path',
      name: 'desk_call_capability',
      input: { path: 'xd.apps.launch' },
    });
    const tool = deskCapabilityTool({ readOnly: false });

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-approval-path',
      tools: [tool],
      maxTurns: 2,
      turnLedger: ledger,
    });

    const result = await runner.runToCompletion('Desk 앱 열어줘');

    expect(result.status).toBe('paused');
    expect(ledger.current()?.approvals[0]?.capabilityPath).toBe('xd.apps.launch');
    expect(ledger.current()?.toolCalls[0]).toMatchObject({
      id: 'call-approval-path',
      status: 'waiting_for_approval',
    });
    expect(ledger.current()?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'approval-created',
          path: 'xd.apps.launch',
          verified: true,
        }),
      ]),
    );
    expect(ledger.current()?.evidence).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'approval-created',
          path: 'desk_call_capability',
        }),
      ]),
    );
  });

  test('records approval resolution evidence for approval handler decisions', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider = toolThenFinalProvider({
      id: 'call-approval-handler',
      name: 'desk_call_capability',
      input: { path: 'xd.apps.launch' },
    });
    const tool = deskCapabilityTool({ readOnly: false });

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-approval-handler',
      tools: [tool],
      maxTurns: 2,
      approvalHandler: () => true,
      turnLedger: ledger,
    });

    await runner.runToCompletion('Desk 앱 열어줘');

    const current = ledger.current();
    expect(current?.approvals[0]?.status).toBe('approved');
    expect(current?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'approval-resolved',
          id: current?.approvals[0]?.approvalId,
          path: 'xd.apps.launch',
          verified: true,
        }),
      ]),
    );
  });

  test('records resumed pending approval tool evidence before execution', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const pendingToolCall: ToolCall = {
      id: 'resume-call',
      name: 'xenesis_desk_call_capability',
      input: { path: 'xd.app.status' },
    };
    const tool = deskCapabilityTool({
      name: 'xenesis_desk_call_capability',
      readOnly: false,
      isMcp: true,
      data: {
        structuredContent: {
          ok: true,
          path: 'xd.app.status',
          permission: 'read',
          approvalRequired: false,
        },
      },
    });

    const runner = new AgentRunner({
      provider: finalProvider(),
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-resumed-approval',
      tools: [tool],
      maxTurns: 1,
      turnLedger: ledger,
      historyMessages: [
        { role: 'user', content: 'Desk 상태 알려줘' },
        { role: 'assistant', content: '', toolCalls: [pendingToolCall] },
      ],
      resumeState: resumeStateWithPendingApproval(pendingToolCall),
      injectedApprovalDecision: {
        toolCallId: pendingToolCall.id,
        approvalId: 'approval-resume',
        approved: true,
        decision: 'approve',
        resolvedAt: '2026-06-28T00:00:00.000Z',
      },
    });

    await runner.runToCompletion('Desk 상태 알려줘');

    expect(ledger.current()?.status).toBe('completed');
    expect(ledger.current()?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'approval-resolved',
          id: 'approval-resume',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'cr-capability-called',
          id: 'resume-call',
          path: 'xd.app.status',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'readback',
          id: 'resume-call',
          path: 'xd.app.status',
          verified: true,
        }),
      ]),
    );
  });

  test('derives process model from provider capabilities', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider: AgentProvider = {
      name: 'capability-provider',
      model: 'test-model',
      capabilities: {
        transport: 'local-server',
        streaming: false,
        persistentSession: true,
      },
      async complete() {
        return { message: { role: 'assistant', content: 'done' } };
      },
    };

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-capability-process',
      tools: [],
      maxTurns: 1,
      turnLedger: ledger,
    });

    await runner.runToCompletion('상태 알려줘');

    expect(ledger.current()?.provider.processModel).toBe('persistent-process');
  });

  test('records embedded process model for mcp-agent providers', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider: AgentProvider = {
      name: 'mcp-agent-provider',
      model: 'test-model',
      capabilities: {
        transport: 'mcp-agent',
        streaming: false,
        persistentSession: true,
      },
      async complete() {
        return { message: { role: 'assistant', content: 'done' } };
      },
    };

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-embedded-process',
      tools: [],
      maxTurns: 1,
      turnLedger: ledger,
    });

    await runner.runToCompletion('상태 알려줘');

    expect(ledger.current()?.provider.processModel).toBe('embedded');
  });

  test('updates resolved provider when a fallback provider succeeds', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const primary: AgentProvider = {
      name: 'primary-provider',
      model: 'primary-model',
      async complete() {
        throw new Error('primary unavailable');
      },
    };
    const fallback: AgentProvider = {
      name: 'fallback-provider',
      model: 'fallback-model',
      capabilities: {
        transport: 'cli-oneshot',
        streaming: false,
        persistentSession: false,
      },
      async complete() {
        return { message: { role: 'assistant', content: 'fallback done' } };
      },
    };

    const runner = new AgentRunner({
      provider: primary,
      fallbackProviders: [fallback],
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-provider-fallback',
      tools: [],
      maxTurns: 1,
      turnLedger: ledger,
    });

    await runner.runToCompletion('상태 알려줘');

    const current = ledger.current();
    expect(current?.provider.requested).toBe('primary-provider');
    expect(current?.provider.resolved).toBe('fallback-provider');
    expect(current?.provider.processModel).toBe('process-per-turn');
    expect(current?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'provider-started',
          id: 'primary-provider',
          verified: true,
        }),
        expect.objectContaining({
          kind: 'provider-started',
          id: 'fallback-provider',
          verified: true,
        }),
      ]),
    );
  });

  test('marks the ledger failed when the tool loop throws unexpectedly', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const provider = toolThenFinalProvider({
      id: 'call-throw',
      name: 'throwing_validate',
      input: {},
    });
    const tool: Tool<Record<string, never>> = {
      name: 'throwing_validate',
      description: 'throws during validation',
      inputSchema: z.object({}),
      isReadOnly: () => true,
      async validateInput() {
        throw new Error('validate exploded');
      },
      async run() {
        return { ok: true, content: 'unreachable' };
      },
    };

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-tool-loop-error',
      tools: [tool],
      maxTurns: 2,
      turnLedger: ledger,
    });

    await expect(runner.runToCompletion('도구 실행')).rejects.toThrow('validate exploded');

    expect(ledger.current()?.status).toBe('failed');
    expect(ledger.current()?.diagnostics[0]).toMatchObject({
      errorClass: 'Error',
      message: 'validate exploded',
    });
  });

  test('marks the ledger blocked when repeated verification repair stops the run', async () => {
    const ledger = createTurnLedger({ now: () => '2026-06-28T00:00:00.000Z' });
    const turn = ledger.startTurn({
      sessionId: 'session-repeated-verification-block',
      prompt: '검증 실패를 처리해줘',
      providerRequested: 'test-provider',
      providerResolved: 'test-provider',
      providerSource: 'runtime',
    });
    ledger.markRunning(turn.id);

    const runner = new AgentRunner({
      provider: finalProvider(),
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-repeated-verification-block',
      tools: [],
      maxTurns: 1,
      turnLedger: ledger,
    });
    const internal = runner as unknown as {
      currentTurnLedgerId?: string;
      verificationRepairGuard?: unknown;
      stopForRepeatedVerificationRepairFailure: (
        messages: Array<{ role: 'assistant'; content: string }>,
        turns: number,
        usage: { inputTokens: number; outputTokens: number; totalTokens: number },
      ) => AsyncGenerator<unknown, { status: 'done' } | undefined, void>;
    };
    internal.currentTurnLedgerId = turn.id;
    internal.verificationRepairGuard = {
      repeatedFailureAfterPatch: {
        toolName: 'app_e2e_check',
        evidence: 'same failure repeated',
      },
    };

    const generator = internal.stopForRepeatedVerificationRepairFailure([], 1, {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
    let next = await generator.next();
    while (!next.done) {
      next = await generator.next();
    }

    expect(next.value?.status).toBe('done');
    expect(ledger.current()?.status).toBe('blocked');
    expect(ledger.current()?.result?.finishReason).toBe('blocked');
  });

  test('passes turn ledger through embedded prompt workflow pipeline options', async () => {
    const ledger = createTurnLedger();
    let captured: AgentRunPipelineOptions | undefined;

    await runEmbeddedPrompt({
      cwd: process.cwd(),
      prompt: 'Desk 상태 알려줘',
      turnLedger: ledger,
      runPipeline: async (options) => {
        captured = options;
        return {
          exitCode: 0,
          sessionId: options.sessionId ?? 'session-embedded-ledger',
          events: [],
          doneContent: 'done',
          turns: 0,
          status: 'done',
        };
      },
    } as Parameters<typeof runEmbeddedPrompt>[0] & { turnLedger: typeof ledger });

    expect((captured as (AgentRunPipelineOptions & { turnLedger?: unknown }) | undefined)?.turnLedger).toBe(ledger);
  });
});

function toolThenFinalProvider(toolCall: ToolCall): AgentProvider {
  let calls = 0;
  return {
    name: 'test-provider',
    model: 'test-model',
    async complete() {
      calls += 1;
      if (calls === 1) {
        return {
          message: {
            role: 'assistant',
            content: '',
            toolCalls: [toolCall],
          },
          stopReason: 'tool_use',
        };
      }
      return {
        message: { role: 'assistant', content: 'done' },
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      };
    },
  };
}

function finalProvider(): AgentProvider {
  return {
    name: 'test-provider',
    model: 'test-model',
    async complete() {
      return {
        message: { role: 'assistant', content: 'done' },
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      };
    },
  };
}

function providerThatShouldNotRun(): AgentProvider {
  return {
    name: 'unexpected-provider',
    model: 'test-model',
    async complete() {
      throw new Error('provider should not have been called');
    },
  };
}

function resumeStateWithPendingApproval(toolCall: ToolCall): ResumableRunState {
  return {
    turns: 0,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    recovery: {
      projectAnalysisEvidenceRecoveryCount: 0,
      explicitToolCompletionRecoveryCount: 0,
      fileMutationRequiredRecoveryCount: 0,
      maxOutputTokensRecoveryCount: 0,
      toolRecoveryFinalizationRecoveryCount: 0,
      repositoryRecommendationRecoveryUsed: false,
      falseUnavailableToolRecoveryUsed: false,
    },
    successfulToolNames: [],
    attemptedToolNames: [],
    successfulEvidencePaths: [],
    successfulEvidenceToolCount: 0,
    successfulMutationCount: 0,
    mutationSinceLastRead: false,
    verificationRecoveryCounts: [],
    autoVerificationRepairSignatures: [],
    verificationRepairExtensionActive: false,
    recentCompactionSavedRatios: [],
    stopHookContinuationCount: 0,
    messageSeq: 1,
    alwaysAllowedTools: [],
    pendingApproval: {
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      toolInput: toolCall.input,
      approvalId: 'approval-resume',
      reason: 'User approval required for modifying tool.',
      riskLevel: 'medium',
      summary: 'Resume pending approval',
    },
  };
}

function deskCapabilityTool(options: {
  readOnly: boolean;
  name?: string;
  isMcp?: boolean;
  data?: unknown;
}): Tool<{ path: string }> {
  return {
    name: options.name ?? 'desk_call_capability',
    description: 'fake CR capability caller',
    inputSchema: z.object({ path: z.string() }),
    isMcp: options.isMcp ?? true,
    isReadOnly: () => options.readOnly,
    async run(input) {
      return {
        ok: true,
        content: `called ${input.path}`,
        ...(options.data !== undefined ? { data: options.data } : {}),
      };
    },
  };
}
