import { describe, expect, test, vi } from 'vitest';
import { createCliRuntimeTools } from '../../src/cli/main.js';
import { defaultConfig, type XenesisConfig } from '../../src/config/index.js';
import type { McpToolClient, RegisterMcpServerToolsOptions } from '../../src/extensions/mcp.js';

function makeConfig(): XenesisConfig {
  return {
    provider: 'mock',
    model: 'mock-model',
    providerRetries: defaultConfig.providerRetries,
    providerFallbacks: defaultConfig.providerFallbacks,
    context: defaultConfig.context,
    hooks: defaultConfig.hooks,
    verification: defaultConfig.verification,
    guard: defaultConfig.guard,
    workflow: defaultConfig.workflow,
    workflows: defaultConfig.workflows,
    worker: defaultConfig.worker,
    isolation: defaultConfig.isolation,
    channels: defaultConfig.channels,
    browser: defaultConfig.browser,
    shell: defaultConfig.shell,
    maxTurns: 8,
    xenesisHome: '.xenesis',
    workspace: '/workspace/root',
    approvalMode: 'safe',
    extensions: {
      ...defaultConfig.extensions,
      mcpServers: {},
      recommendedMcpServers: ['filesystem'],
    },
    permissions: defaultConfig.permissions,
    approval: defaultConfig.approval,
  };
}

function fakeClient(): McpToolClient {
  return {
    async listTools() {
      return [
        { name: 'read_file', inputSchema: { type: 'object' } },
        { name: 'write_file', inputSchema: { type: 'object' } },
      ];
    },
    async callTool() {
      return { content: [{ type: 'text', text: 'ok' }] };
    },
    async close() {},
  };
}

describe('recommended MCP CLI runtime tools', () => {
  test('CLI runtime builder registers opt-in recommended servers with their filters', async () => {
    const seen: Array<{ serverName: string; config: unknown }> = [];
    const clientFactory: NonNullable<RegisterMcpServerToolsOptions['clientFactory']> = (serverName, config) => {
      seen.push({ serverName, config });
      return fakeClient();
    };
    const clientFactorySpy = vi.fn(clientFactory);

    const registry = await createCliRuntimeTools(makeConfig(), {} as NodeJS.ProcessEnv, {
      mcpClientFactory: clientFactorySpy,
    });

    expect(clientFactorySpy).toHaveBeenCalledTimes(1);
    expect(seen[0]?.serverName).toBe('filesystem');
    expect(seen[0]?.config).toMatchObject({
      type: 'stdio',
      command: 'npx',
      args: expect.arrayContaining(['/workspace/root']),
      toolFilter: { include: expect.arrayContaining(['read_file']) },
    });
    expect(registry.has('mcp__filesystem__read_file')).toBe(true);
    expect(registry.has('mcp__filesystem__write_file')).toBe(false);
  });
});
