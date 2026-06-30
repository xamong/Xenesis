import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CodexAppServerProvider, deskMcpSystemMessage } from './cliProvider.js';

const providersDir = dirname(fileURLToPath(import.meta.url));

describe('deskMcpSystemMessage lean', () => {
  it('uses a family pointer, not the full catalog dump or hard chat-only imperative', () => {
    const msg = deskMcpSystemMessage('codex-cli');
    expect(msg.content).not.toContain('Capability family intent catalog:');
    expect(msg.content).not.toContain('Do not answer with chat-only approval text');
    expect(msg.content).toContain('xenesis_desk_capabilities');
    expect(msg.content.toLowerCase()).toContain('explorer');
    expect(msg.content.toLowerCase()).toContain('terminal');
    expect(msg.content).toContain('When the user explicitly asks for CR, MCP, Capability Registry, or xd.* readback');
    expect(msg.content).toContain('Do not use shell, commandExecution, webSearch, web_search, web_fetch');
  });

  it('does not ship or export a deterministic Desk natural intent catalog', () => {
    expect(existsSync(join(providersDir, 'deskNaturalIntentCatalog.ts'))).toBe(false);
    expect(readFileSync(join(providersDir, 'index.ts'), 'utf8')).not.toContain('deskNaturalIntentCatalog');
  });

  it('passes the Desk MCP contract as Codex app-server developer instructions', async () => {
    let threadStartRequest: Record<string, unknown> | undefined;
    let turnStartInput = '';
    const provider = new CodexAppServerProvider({
      args: [
        'app-server',
        '--stdio',
        '-c',
        "mcp_servers.xenesis_dev.tools.xenesis_desk_call_capability.approval_mode='approve'",
      ],
      env: {} as NodeJS.ProcessEnv,
      session: {},
      client: {
        initialize: async () => undefined,
        startThread: async (request: Record<string, unknown>) => {
          threadStartRequest = request;
          return { threadId: 'thread-1' };
        },
        startTurn: async (request) => {
          turnStartInput = request.inputText;
          return { content: 'provider-routing-readback-ok', turnId: 'turn-1', raw: {} };
        },
        dispose: () => undefined,
      },
    });

    const response = await provider.complete({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: 'runtime recovery: call Desk CR before the final answer' },
        { role: 'user', content: '프로바이더 라우팅 상태를 CR로 확인해줘' },
      ],
      tools: [],
    });

    expect(String(threadStartRequest?.developerInstructions ?? '')).toContain(
      'Private execution interface: Xenesis Desk CR MCP tools are configured for this provider run.',
    );
    expect(String(threadStartRequest?.developerInstructions ?? '')).toContain(
      'Saying you cannot directly check is invalid while these tools are configured.',
    );
    expect(String(threadStartRequest?.developerInstructions ?? '')).toContain(
      'Do not use shell, commandExecution, webSearch, web_search, web_fetch',
    );
    expect(threadStartRequest).not.toHaveProperty('config');
    expect(response.message.providerMetadata?.cli?.args).toEqual(
      expect.arrayContaining([
        '-c',
        'tools.web_search=false',
        '-c',
        'tools.web_search.enabled=false',
        '--disable',
        'apps',
        '--disable',
        'plugins',
        '--disable',
        'tool_suggest',
        '--disable',
        'multi_agent',
        '--disable',
        'standalone_web_search',
        '--disable',
        'web_search_request',
        '--disable',
        'web_search_cached',
        '--disable',
        'search_tool',
        '--disable',
        'browser_use',
        '--disable',
        'browser_use_external',
        '--disable',
        'browser_use_full_cdp_access',
        '--disable',
        'in_app_browser',
        '--disable',
        'shell_tool',
        '--disable',
        'shell_snapshot',
        '--disable',
        'unified_exec',
      ]),
    );
    expect(String(threadStartRequest?.developerInstructions ?? '')).toContain(
      'Assistant output contract for this turn:',
    );
    expect(String(threadStartRequest?.developerInstructions ?? '')).toContain('상태를 확인 중입니다.');
    expect(turnStartInput).toContain('프로바이더 라우팅 상태를 CR로 확인해줘');
    expect(turnStartInput).toContain('runtime recovery: call Desk CR before the final answer');
    expect(turnStartInput).not.toContain('Private execution interface: Xenesis Desk CR MCP tools are configured');
    expect(turnStartInput).not.toContain('Assistant output contract for this turn:');
  });
});
