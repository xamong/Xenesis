import { describe, expect, it, vi } from 'vitest';
import {
  type CodexAppServerClient,
  CodexAppServerProvider,
  type CodexAppServerTurnRequest,
} from '../../src/providers/cliProvider.js';
import type { AgentProvider, ProviderRequest } from '../../src/providers/types.js';

function request(): ProviderRequest {
  return {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'hello' }],
    tools: [],
  };
}

describe('CodexAppServerProvider failure handling', () => {
  it('does not treat failed app-server turns as empty successful assistant replies', async () => {
    const client: CodexAppServerClient = {
      initialize: vi.fn(async () => {}),
      startThread: vi.fn(async () => ({ threadId: 'thread-1' })),
      startTurn: vi.fn(async (_request: CodexAppServerTurnRequest) => ({
        content: '',
        turnId: 'turn-1',
        raw: {
          completed: {
            turn: {
              id: 'turn-1',
              status: 'failed',
              error: {
                message: 'The gpt-4o model is not supported when using Codex with a ChatGPT account.',
              },
            },
          },
        },
      })),
      dispose: vi.fn(),
    };
    const fallbackComplete = vi.fn(async () => {
      throw new Error('fallback failed after app-server failure');
    });
    const fallbackProvider: AgentProvider = {
      name: 'codex-cli',
      complete: fallbackComplete,
    };
    const provider = new CodexAppServerProvider({
      client,
      session: {},
      fallbackProvider,
      preflightRunner: () => ({
        stdout: 'codex-cli 0.0.0',
        stderr: '',
        status: 0,
      }),
    });

    await expect(provider.complete(request())).rejects.toThrow('fallback failed after app-server failure');
    expect(fallbackComplete).toHaveBeenCalledTimes(1);
  });
});
