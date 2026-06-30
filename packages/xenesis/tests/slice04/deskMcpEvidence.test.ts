import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AgentRunner, type AgentRunnerOptions } from '../../src/core/AgentRunner.js';
import type { AgentRunEvent } from '../../src/core/events.js';
import type { AgentProvider, ProviderRequest, ProviderResponse } from '../../src/providers/types.js';

function workspaceTmp(): string {
  return mkdtempSync(join(tmpdir(), 'slice04-desk-mcp-evidence-'));
}

function baseOptions(provider: AgentProvider): AgentRunnerOptions {
  const workspaceRoot = workspaceTmp();
  return {
    provider,
    model: 'mock-model',
    workspaceRoot,
    xenesisHome: join(workspaceRoot, '.xenesis'),
    approvalMode: 'auto',
    maxTurns: 4,
    tools: [],
  } as AgentRunnerOptions;
}

async function drain(runner: AgentRunner, input: string): Promise<AgentRunEvent[]> {
  const events: AgentRunEvent[] = [];
  const iterator = runner.run(input);
  while (true) {
    const step = await iterator.next();
    if (step.done) break;
    events.push(step.value);
  }
  return events;
}

function providerWithCompletedTurnItemEvidence(): {
  provider: AgentProvider;
  completeSpy: ReturnType<typeof vi.fn>;
} {
  const completeSpy = vi.fn(
    async (_request: ProviderRequest): Promise<ProviderResponse> => ({
      message: {
        role: 'assistant',
        content: 'channel-routing-readback-ok',
        providerMetadata: {
          cli: {
            provider: 'codex-app-server',
            command: 'codex',
            xenesisDeskMcpConfigured: true,
            raw: {
              records: [],
              completed: {
                turn: {
                  id: 'turn-1',
                  status: 'completed',
                  items: [
                    {
                      id: 'mcp-1',
                      type: 'mcpToolCall',
                      server: 'xenesis_dev',
                      tool: 'xenesis_desk_call_capability',
                      status: 'completed',
                      arguments: {
                        path: 'xd.xenesis.channels.routing.status',
                        args: { channel: 'telegram' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      stopReason: 'stop',
    }),
  );
  return {
    provider: { name: 'codex-app-server', model: 'mock-model', complete: completeSpy as AgentProvider['complete'] },
    completeSpy,
  };
}

function idleStreamProvider(delayMs: number): AgentProvider {
  return {
    name: 'codex-app-server',
    model: 'mock-model',
    async complete(): Promise<ProviderResponse> {
      return { message: { role: 'assistant', content: 'unused' } };
    },
    async *stream(): AsyncIterable<{ type: 'response'; response: ProviderResponse }> {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      yield { type: 'response', response: { message: { role: 'assistant', content: 'late' } } };
    },
  };
}

describe('Desk MCP provider evidence', () => {
  it('accepts Codex app-server completed turn items and does not force recovery', async () => {
    const { provider, completeSpy } = providerWithCompletedTurnItemEvidence();
    const runner = new AgentRunner(baseOptions(provider));
    const events = await drain(runner, 'Capability Registry로 텔레그램 channel routing status readback을 확인해줘.');

    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect(
      events.some(
        (event) =>
          event.type === 'run_state' &&
          event.status === 'provider_request' &&
          /requesting Desk CR MCP tool-call evidence before final answer/i.test(event.summary),
      ),
    ).toBe(false);
    expect(events.some((event) => event.type === 'done' && event.content.includes('channel-routing-readback-ok'))).toBe(
      true,
    );
  });

  it('uses runner env for the provider stream idle watchdog', async () => {
    const runner = new AgentRunner({
      ...baseOptions(idleStreamProvider(30)),
      stream: true,
      env: { XENESIS_STREAM_IDLE_MS: '5' } as NodeJS.ProcessEnv,
    });

    await expect(drain(runner, 'Capability Registry 상태를 확인해줘.')).rejects.toThrow(
      /Provider "codex-app-server" stream idle for 5ms/,
    );
  });
});
