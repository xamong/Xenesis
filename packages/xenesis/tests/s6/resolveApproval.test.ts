import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { AgentRunnerOptions, AgentRunResult } from '../../src/core/AgentRunner.js';
import { AgentRunner } from '../../src/core/AgentRunner.js';
import type { AgentRunEvent } from '../../src/core/events.js';
import type { ToolCall } from '../../src/core/messages.js';
import type { BlockingHookRegistration } from '../../src/hooks/blocking.js';
import { HookRegistry } from '../../src/hooks/HookRegistry.js';
import type { AgentProvider, ProviderRequest, ProviderResponse } from '../../src/providers/types.js';
import type { Tool } from '../../src/tools/types.js';

// A mock provider that issues exactly one tool call on the first turn, then a
// plain-text final answer with NO tool calls on every subsequent turn.
function singleToolCallProvider(toolCall: ToolCall): AgentProvider {
  let turn = 0;
  return {
    name: 'mock',
    model: 'mock-model',
    async complete(_request: ProviderRequest): Promise<ProviderResponse> {
      turn += 1;
      if (turn === 1) {
        return {
          message: { role: 'assistant', content: '', toolCalls: [toolCall] },
          stopReason: 'tool_use',
        };
      }
      return { message: { role: 'assistant', content: 'done.' }, stopReason: 'stop' };
    },
  };
}

interface EchoRunArgs {
  cmd: string;
}

// A stub "echo" tool whose run() is a spy; mutating (not read-only) so it traverses
// the same gates a real mutation would.
function makeEchoTool() {
  const runSpy = vi.fn(async (input: EchoRunArgs) => ({
    ok: true,
    content: `ran: ${input.cmd}`,
  }));
  const tool: Tool<EchoRunArgs> = {
    name: 'echo',
    description: 'echoes a command',
    inputSchema: z.object({ cmd: z.string() }),
    isReadOnly: () => false,
    run: runSpy as unknown as Tool<EchoRunArgs>['run'],
  };
  return { tool, runSpy };
}

function workspaceTmp(): string {
  return mkdtempSync(join(tmpdir(), 's6-resolveapproval-'));
}

// Registry whose PreToolUse hook always asks (routes the tool through the gate).
function askRegistry(): HookRegistry {
  const registry = new HookRegistry();
  registry.register({
    event: 'pre_tool_use',
    handler: () => ({
      decision: 'ask',
      title: 'Confirm echo',
      reason: 'needs approval',
      severity: 'warning',
    }),
  } satisfies BlockingHookRegistration);
  return registry;
}

function baseOptions(tool: Tool, provider: AgentProvider, extra: Partial<AgentRunnerOptions> = {}): AgentRunnerOptions {
  const workspaceRoot = workspaceTmp();
  return {
    provider,
    model: 'mock-model',
    workspaceRoot,
    xenesisHome: join(workspaceRoot, '.xenesis'),
    // "auto" so the permission gate never asks on its own; the ask comes from the hook.
    approvalMode: 'auto',
    maxTurns: 4,
    tools: [tool],
    ...extra,
  } as AgentRunnerOptions;
}

async function runToResult(
  runner: AgentRunner,
  input: string,
): Promise<{ events: AgentRunEvent[]; result: AgentRunResult }> {
  const events: AgentRunEvent[] = [];
  const iterator = runner.run(input);
  while (true) {
    const step = await iterator.next();
    if (step.done) return { events, result: step.value };
    events.push(step.value);
  }
}

function eventsOfType<T extends AgentRunEvent['type']>(
  events: AgentRunEvent[],
  type: T,
): Array<Extract<AgentRunEvent, { type: T }>> {
  return events.filter((e): e is Extract<AgentRunEvent, { type: T }> => e.type === type);
}

const echoCall: ToolCall = { id: 'call-1', name: 'echo', input: { cmd: 'ls' } };

describe('resolveApproval gate (S6)', () => {
  it('alwaysAllowedTools short-circuits (no ask, no permission_request, tool runs)', async () => {
    const { tool, runSpy } = makeEchoTool();
    const runner = new AgentRunner(
      baseOptions(tool, singleToolCallProvider(echoCall), {
        hookRegistry: askRegistry(),
        alwaysAllowedTools: ['echo'],
      } as Partial<AgentRunnerOptions>),
    );
    const { events, result } = await runToResult(runner, 'please echo ls');
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('done');
    expect(eventsOfType(events, 'permission_request').length).toBe(0);
    expect(eventsOfType(events, 'approval_resolved').length).toBe(0);
  });

  it('fast-lane approvalHandler approve -> tool runs, permission_request + approval_resolved written', async () => {
    const { tool, runSpy } = makeEchoTool();
    const runner = new AgentRunner(
      baseOptions(tool, singleToolCallProvider(echoCall), {
        hookRegistry: askRegistry(),
        approvalHandler: () => true,
      }),
    );
    const { events, result } = await runToResult(runner, 'please echo ls');
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('done');
    expect(eventsOfType(events, 'permission_request').length).toBe(1);
    const resolved = eventsOfType(events, 'approval_resolved');
    expect(resolved.length).toBe(1);
    expect(resolved[0].approved).toBe(true);
    expect(resolved[0].decision).toBe('approve');
    expect(resolved[0].toolCallId).toBe('call-1');
    // approvalId pairs the request with the resolution.
    expect(resolved[0].approvalId).toBe(eventsOfType(events, 'permission_request')[0].request.approvalId);
  });

  it('fast-lane approvalHandler deny -> deny tool_result, tool not run', async () => {
    const { tool, runSpy } = makeEchoTool();
    const runner = new AgentRunner(
      baseOptions(tool, singleToolCallProvider(echoCall), {
        hookRegistry: askRegistry(),
        approvalHandler: () => false,
      }),
    );
    const { events, result } = await runToResult(runner, 'please echo ls');
    expect(runSpy).not.toHaveBeenCalled();
    expect(result.status).toBe('done');
    const results = eventsOfType(events, 'tool_result');
    expect(results.length).toBe(1);
    expect(results[0].ok).toBe(false);
    expect(results[0].message.toolCallId).toBe('call-1');
    const resolved = eventsOfType(events, 'approval_resolved');
    expect(resolved.length).toBe(1);
    expect(resolved[0].approved).toBe(false);
    expect(resolved[0].decision).toBe('deny');
  });

  it('fast-lane timeout -> deny (timeoutBehavior deny), tool not run', async () => {
    const { tool, runSpy } = makeEchoTool();
    const runner = new AgentRunner(
      baseOptions(tool, singleToolCallProvider(echoCall), {
        hookRegistry: askRegistry(),
        // never resolves -> times out
        approvalHandler: () => new Promise<boolean>(() => undefined),
        approvalTimeoutMs: 20,
        approvalTimeoutBehavior: 'deny',
      } as Partial<AgentRunnerOptions>),
    );
    const { events, result } = await runToResult(runner, 'please echo ls');
    expect(runSpy).not.toHaveBeenCalled();
    expect(result.status).toBe('done');
    const resolved = eventsOfType(events, 'approval_resolved');
    expect(resolved.length).toBe(1);
    expect(resolved[0].decision).toBe('timeout');
    expect(resolved[0].approved).toBe(false);
    const results = eventsOfType(events, 'tool_result');
    expect(results[0].ok).toBe(false);
  });

  it('fast-lane timeout with timeoutBehavior allow -> tool runs', async () => {
    const { tool, runSpy } = makeEchoTool();
    const runner = new AgentRunner(
      baseOptions(tool, singleToolCallProvider(echoCall), {
        hookRegistry: askRegistry(),
        approvalHandler: () => new Promise<boolean>(() => undefined),
        approvalTimeoutMs: 20,
        approvalTimeoutBehavior: 'allow',
      } as Partial<AgentRunnerOptions>),
    );
    const { events, result } = await runToResult(runner, 'please echo ls');
    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('done');
    const resolved = eventsOfType(events, 'approval_resolved');
    expect(resolved[0].decision).toBe('timeout');
    expect(resolved[0].approved).toBe(true);
  });

  it('no handler -> run pauses (status paused + pendingApproval), tool_call left unpaired, permission_request + run_snapshot(pendingApproval) written, NO tool_result', async () => {
    const { tool, runSpy } = makeEchoTool();
    const runner = new AgentRunner(
      baseOptions(tool, singleToolCallProvider(echoCall), {
        hookRegistry: askRegistry(),
        // no approvalHandler -> durable pause path
      }),
    );
    const { events, result } = await runToResult(runner, 'please echo ls');

    // Non-vacuous: this MUST fail if the runner auto-denied instead of pausing.
    expect(runSpy).not.toHaveBeenCalled();
    expect(result.status).toBe('paused');
    if (result.status !== 'paused') throw new Error('not paused');
    expect(result.reason).toBe('awaiting_approval');
    expect(result.pendingApproval.toolCallId).toBe('call-1');
    expect(result.pendingApproval.name).toBe('echo');

    // permission_request written.
    expect(eventsOfType(events, 'permission_request').length).toBe(1);
    // NO approval_resolved, NO tool_result for the paused call.
    expect(eventsOfType(events, 'approval_resolved').length).toBe(0);
    expect(eventsOfType(events, 'tool_result').length).toBe(0);

    // the dangling tool_call assistant message is present in messages, un-paired.
    const assistantWithCall = result.messages.find(
      (m) => m.role === 'assistant' && (m as { toolCalls?: ToolCall[] }).toolCalls?.some((c) => c.id === 'call-1'),
    );
    expect(assistantWithCall).toBeDefined();
    const toolResultMsg = result.messages.find(
      (m) => m.role === 'tool' && (m as { toolCallId?: string }).toolCallId === 'call-1',
    );
    expect(toolResultMsg).toBeUndefined();
  });
});
