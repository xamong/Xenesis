import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { type CliIo, runCli } from '../../src/cli/main.js';
import type { RunMcpOAuthLoginOptions } from '../../src/extensions/mcp.js';
import { createTempWorkspace } from '../helpers/tempWorkspace.js';

function createIo(cwd: string, extra: Partial<CliIo> = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      cwd,
      env: {
        ...process.env,
        XENESIS_HOME: join(cwd, '.xenesis'),
      },
      stdout: (line) => stdout.push(line),
      stderr: (line) => stderr.push(line),
      ...extra,
    } satisfies CliIo,
  };
}

describe('recommended MCP CLI', () => {
  test('mcp list includes opt-in recommended servers', async () => {
    const workspace = await createTempWorkspace();
    try {
      await writeFile(
        join(workspace.root, 'xenesis.config.json'),
        JSON.stringify({
          provider: 'mock',
          model: 'mock-model',
          extensions: {
            recommendedMcpServers: ['filesystem', 'linear'],
            mcpServers: {
              disabledExample: {
                type: 'stdio',
                command: 'node',
                args: ['disabled.js'],
                env: {},
                enabled: false,
              },
            },
          },
        }),
        'utf8',
      );
      const { io, stdout, stderr } = createIo(workspace.root);

      const exitCode = await runCli(['node', 'xenesis', 'mcp', 'list', '--cwd', workspace.root], io);

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout).toContain('mcp: disabledExample [disabled] command=node');
      expect(stdout.join('\n')).toContain('mcp: filesystem command=npx');
      expect(stdout).toContain('mcp: linear transport=http url=https://mcp.linear.app/mcp auth=oauth');
    } finally {
      await workspace.cleanup();
    }
  });

  test('mcp login can target an opt-in recommended remote server', async () => {
    const workspace = await createTempWorkspace();
    try {
      await writeFile(
        join(workspace.root, 'xenesis.config.json'),
        JSON.stringify({
          provider: 'mock',
          model: 'mock-model',
          extensions: {
            recommendedMcpServers: ['linear'],
          },
        }),
        'utf8',
      );
      let seenOptions: RunMcpOAuthLoginOptions | undefined;
      const mcpOAuthLogin = vi.fn(async (options: RunMcpOAuthLoginOptions) => {
        seenOptions = options;
        return 'authorized' as const;
      });
      const { io, stdout, stderr } = createIo(workspace.root, { mcpOAuthLogin });

      const exitCode = await runCli(['node', 'xenesis', 'mcp', 'login', 'linear', '--cwd', workspace.root], io);

      expect(exitCode).toBe(0);
      expect(stdout).toEqual([]);
      expect(stderr).toContain('mcp login: linear authorized');
      expect(seenOptions?.serverName).toBe('linear');
      expect(seenOptions?.serverConfig.url).toBe('https://mcp.linear.app/mcp');
    } finally {
      await workspace.cleanup();
    }
  });
});
