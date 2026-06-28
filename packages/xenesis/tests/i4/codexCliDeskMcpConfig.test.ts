import { describe, expect, test } from 'vitest';
import { type CliRunRequest, CodexCliProvider } from '../../src/providers/cliProvider.js';

describe('Codex CLI Desk MCP auto-config', () => {
  test('configures Desk MCP from bridge URL and server path without a state file', async () => {
    const captured: CliRunRequest[] = [];
    const provider = new CodexCliProvider({
      command: 'codex',
      env: {
        XENIS_MCP_BRIDGE_URL: 'http://127.0.0.1:4567',
        XENIS_MCP_SERVER_PATH: 'E:\\xenesis-original\\xenesis-desk\\mcp\\xenesis-desk-mcp-server.mjs',
        XENESIS_CLI_PREFLIGHT: 'false',
      },
      run: async (request) => {
        captured.push(request);
        return {
          stdout: 'codex\nDesk state checked.\n',
          stderr: '',
          exitCode: 0,
        };
      },
    });

    const response = await provider.complete({
      model: 'gpt-5.5',
      messages: [{ role: 'user', content: '현재 Desk active context를 확인해줘.' }],
      tools: [],
    });

    const args = captured[0]?.args.join('\n') ?? '';
    expect(args).toContain('mcp_servers.xenesis_dev.enabled=true');
    expect(args).toContain("mcp_servers.xenesis_dev.env.XENIS_MCP_BRIDGE_URL='http://127.0.0.1:4567'");
    expect(args).toContain('xenesis_desk_active_context');
    expect(args).toContain(
      "mcp_servers.xenesis_dev.args=['E:\\xenesis-original\\xenesis-desk\\mcp\\xenesis-desk-mcp-server.mjs']",
    );
    expect(captured[0]?.stdin).toContain('xenesis_dev.xenesis_desk_active_context');
    expect(captured[0]?.stdin).toContain('Xenesis Desk CR MCP tools are configured');
    expect(response.message.providerMetadata?.cli?.xenesisDeskMcpConfigured).toBe(true);
  });
});
