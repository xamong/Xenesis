import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AgentRunner } from '../../src/core/AgentRunner.js';
import type { AgentProvider, ProviderRequest } from '../../src/providers/types.js';
import type { Tool, ToolRegistry } from '../../src/tools/types.js';

const inputSchema = z.object({});

function noopTool(name: string): Tool<Record<string, never>, Record<string, never>> {
  return {
    name,
    description: `${name} test tool`,
    inputSchema,
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    async run() {
      return { ok: true, content: 'ok', data: {} };
    },
  };
}

describe('AgentRunner provider tool list', () => {
  it('deduplicates alias registry entries before sending tools to providers', async () => {
    const tool = noopTool('canonical_tool');
    const registry: ToolRegistry = new Map([
      [tool.name, tool],
      ['legacy_alias', tool],
    ]);
    let capturedRequest: ProviderRequest | undefined;
    const provider: AgentProvider = {
      name: 'capture-provider',
      model: 'test-model',
      async complete(request) {
        capturedRequest = request;
        return { message: { role: 'assistant', content: 'done' } };
      },
    };

    const runner = new AgentRunner({
      provider,
      model: 'test-model',
      workspaceRoot: process.cwd(),
      sessionId: 'session-tool-dedupe',
      tools: registry,
      maxTurns: 1,
    });

    await runner.runToCompletion('hello');

    expect(capturedRequest?.tools.map((item) => item.name)).toEqual(['canonical_tool']);
  });
});
