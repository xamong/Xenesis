import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AgentRunner, type AgentRunnerOptions } from '../../src/core/AgentRunner.js';
import type { AgentRunEvent } from '../../src/core/events.js';
import { assertProviderMessagesReady, unresolvedToolCallIds } from '../../src/core/messageIntegrity.js';
import type { AgentMessage } from '../../src/core/messages.js';
import { repairToolResultPairing, SYNTHETIC_TOOL_RESULT_PLACEHOLDER } from '../../src/core/messages.js';
import type { AgentProvider, ProviderRequest, ProviderResponse } from '../../src/providers/types.js';

type AgentRunnerInternals = {
  messagesForProvider(messages: AgentMessage[], activeEffort?: string): AgentMessage[];
  completeProvider(request: ProviderRequest): AsyncGenerator<AgentRunEvent, ProviderResponse, void>;
};

function userMessage(content = 'run echo'): AgentMessage {
  return { role: 'user', content };
}

function assistantToolCall(id = 'call-1'): AgentMessage {
  return {
    role: 'assistant',
    content: '',
    toolCalls: [{ id, name: 'echo', input: { value: 'hello' } }],
  };
}

function toolResult(id = 'call-1', content = 'ok'): AgentMessage {
  return {
    role: 'tool',
    toolCallId: id,
    name: 'echo',
    content,
  };
}

function workspaceTmp(): string {
  return mkdtempSync(join(tmpdir(), 'provider-message-integrity-'));
}

function makeProvider() {
  const completeSpy = vi.fn(async (_request: ProviderRequest): Promise<ProviderResponse> => {
    return {
      message: { role: 'assistant', content: 'ok' },
      stopReason: 'stop',
    };
  });
  const provider: AgentProvider = {
    name: 'mock',
    model: 'mock-model',
    complete: completeSpy as AgentProvider['complete'],
  };
  return { provider, completeSpy };
}

function baseOptions(provider: AgentProvider, extra: Partial<AgentRunnerOptions> = {}): AgentRunnerOptions {
  const workspaceRoot = workspaceTmp();
  return {
    provider,
    model: 'mock-model',
    workspaceRoot,
    xenesisHome: join(workspaceRoot, '.xenesis'),
    approvalMode: 'auto',
    maxTurns: 4,
    tools: [],
    ...extra,
  } as AgentRunnerOptions;
}

function internals(runner: AgentRunner): AgentRunnerInternals {
  return runner as unknown as AgentRunnerInternals;
}

async function drainProvider(generator: AsyncGenerator<AgentRunEvent, ProviderResponse, void>): Promise<ProviderResponse> {
  while (true) {
    const next = await generator.next();
    if (next.done) return next.value;
  }
}

describe('AgentRunner provider message integrity boundary', () => {
  it('stops malformed provider-bound messages before invoking the provider', async () => {
    const { provider, completeSpy } = makeProvider();
    const runner = internals(new AgentRunner(baseOptions(provider)));
    const malformed: AgentMessage[] = [userMessage(), toolResult('missing-call', 'orphan')];

    await expect(
      drainProvider(
        runner.completeProvider({
          model: 'mock-model',
          messages: malformed,
          tools: [],
        }),
      ),
    ).rejects.toThrow('Provider request contains orphan tool results: missing-call');
    expect(completeSpy).not.toHaveBeenCalled();
  });

  it('repairs provider-bound messages before the provider is invoked', async () => {
    const { provider, completeSpy } = makeProvider();
    const runner = internals(new AgentRunner(baseOptions(provider)));
    const rawMessages: AgentMessage[] = [
      userMessage(),
      toolResult('orphan-call', 'orphan'),
      assistantToolCall('call-1'),
    ];

    const providerReadyMessages = runner.messagesForProvider(rawMessages);
    expect(() => assertProviderMessagesReady(providerReadyMessages)).not.toThrow();

    const response = await drainProvider(
      runner.completeProvider({
        model: 'mock-model',
        messages: providerReadyMessages,
        tools: [],
      }),
    );

    expect(response.message.content).toBe('ok');
    expect(completeSpy).toHaveBeenCalledTimes(1);
    const request = completeSpy.mock.calls[0]?.[0];
    expect(request?.messages.some((message) => message.role === 'tool' && message.toolCallId === 'orphan-call')).toBe(
      false,
    );
    const synthesized = request?.messages.find(
      (message): message is Extract<AgentMessage, { role: 'tool' }> =>
        message.role === 'tool' && message.toolCallId === 'call-1',
    );
    expect(synthesized).toBeDefined();
    expect(synthesized!.content).toBe(SYNTHETIC_TOOL_RESULT_PLACEHOLDER);
  });

  it('keeps pending approval exclusion detectable until messages become provider-bound', () => {
    const { provider } = makeProvider();
    const runner = internals(new AgentRunner(baseOptions(provider)));
    const pending = repairToolResultPairing([userMessage(), assistantToolCall('pending-call')], {
      excludeToolCallIds: new Set(['pending-call']),
    });

    expect(unresolvedToolCallIds(pending)).toEqual(['pending-call']);

    const providerReadyMessages = runner.messagesForProvider(pending);
    expect(() => assertProviderMessagesReady(providerReadyMessages)).not.toThrow();
    const synthesized = providerReadyMessages.find(
      (message): message is Extract<AgentMessage, { role: 'tool' }> =>
        message.role === 'tool' && message.toolCallId === 'pending-call',
    );
    expect(synthesized).toBeDefined();
    expect(synthesized!.content).toBe(SYNTHETIC_TOOL_RESULT_PLACEHOLDER);
  });
});
