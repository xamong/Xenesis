import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { type CliIo, runCli } from '../../src/cli/main.js';
import type { McpAuthStore, RunMcpOAuthLoginOptions } from '../../src/extensions/mcp.js';
import { createTempWorkspace } from '../helpers/tempWorkspace.js';

function createIo(cwd: string, extra: Partial<CliIo> = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    XENESIS_HOME: join(cwd, '.xenesis'),
  };
  return {
    stdout,
    stderr,
    io: {
      cwd,
      env,
      stdout: (line) => stdout.push(line),
      stderr: (line) => stderr.push(line),
      ...extra,
    } satisfies CliIo,
  };
}

async function writeConfig(root: string, extra: Record<string, unknown> = {}) {
  const configPath = join(root, 'xenesis.config.json');
  await writeFile(
    configPath,
    JSON.stringify({ provider: 'mock', model: 'mock-model', workspace: '.', ...extra }),
    'utf8',
  );
  return configPath;
}

describe('mcp login CLI', () => {
  it('documents list, serve, and login in MCP help', async () => {
    const workspace = await createTempWorkspace();
    try {
      const { io, stdout, stderr } = createIo(workspace.root);

      const exitCode = await runCli(['node', 'xenesis', 'mcp', '--help'], io);

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout.join('\n')).toContain('Usage: xenesis mcp <list|serve|login>');
      expect(stdout.join('\n')).toContain('login <server>');
    } finally {
      await workspace.cleanup();
    }
  });

  it('lists remote MCP server auth mode', async () => {
    const workspace = await createTempWorkspace();
    try {
      const configPath = await writeConfig(workspace.root, {
        extensions: {
          mcpServers: {
            linear: { type: 'http', url: 'https://mcp.linear.app/mcp', auth: 'oauth' },
          },
        },
      });
      const { io, stdout, stderr } = createIo(workspace.root);

      const exitCode = await runCli(
        ['node', 'xenesis', 'mcp', 'list', '--config', configPath, '--cwd', workspace.root],
        io,
      );

      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      expect(stdout).toContain('mcp: linear transport=http url=https://mcp.linear.app/mcp auth=oauth');
    } finally {
      await workspace.cleanup();
    }
  });

  it('runs OAuth login for a configured remote MCP server and reports authorized', async () => {
    const workspace = await createTempWorkspace();
    try {
      const configPath = await writeConfig(workspace.root, {
        extensions: {
          mcpServers: {
            linear: {
              type: 'http',
              url: 'https://mcp.linear.app/mcp',
              auth: 'oauth',
              oauth: { clientId: 'client-id', scope: 'read' },
            },
          },
        },
      });
      let seenOptions: RunMcpOAuthLoginOptions | undefined;
      let seenStore: McpAuthStore | undefined;
      const mcpOAuthLogin = vi.fn(async (options: RunMcpOAuthLoginOptions) => {
        seenOptions = options;
        seenStore = options.store;
        return 'authorized' as const;
      });
      const { io, stdout, stderr } = createIo(workspace.root, { mcpOAuthLogin });

      const exitCode = await runCli(
        ['node', 'xenesis', 'mcp', 'login', 'linear', '--config', configPath, '--cwd', workspace.root],
        io,
      );

      expect(exitCode).toBe(0);
      expect(stdout).toEqual([]);
      expect(stderr).toContain('mcp login: linear authorized');
      expect(mcpOAuthLogin).toHaveBeenCalledTimes(1);
      expect(seenOptions?.serverName).toBe('linear');
      expect(seenOptions?.serverConfig.url).toBe('https://mcp.linear.app/mcp');
      expect(seenOptions?.serverConfig.oauth?.clientId).toBe('client-id');
      expect(seenOptions?.env?.XENESIS_HOME).toBe(join(workspace.root, '.xenesis'));
      expect(seenStore?.read()).toBeUndefined();
    } finally {
      await workspace.cleanup();
    }
  });

  it('prints authorization URLs and exits non-zero when login redirects', async () => {
    const workspace = await createTempWorkspace();
    try {
      const configPath = await writeConfig(workspace.root, {
        extensions: {
          mcpServers: {
            linear: { type: 'sse', url: 'https://mcp.linear.app/sse', auth: 'oauth' },
          },
        },
      });
      const mcpOAuthLogin = vi.fn(async (options: RunMcpOAuthLoginOptions) => {
        options.onAuthorizationUrl?.('https://auth.example.test/authorize?state=abc');
        return 'redirect' as const;
      });
      const { io, stdout, stderr } = createIo(workspace.root, { mcpOAuthLogin });

      const exitCode = await runCli(
        ['node', 'xenesis', 'mcp', 'login', 'linear', '--config', configPath, '--cwd', workspace.root],
        io,
      );

      expect(exitCode).toBe(1);
      expect(stdout).toEqual([]);
      expect(stderr).toContain('Open: https://auth.example.test/authorize?state=abc');
      expect(stderr).toContain('mcp login: linear redirect');
    } finally {
      await workspace.cleanup();
    }
  });

  it('rejects missing, unknown, and non-remote MCP login targets', async () => {
    const workspace = await createTempWorkspace();
    try {
      const configPath = await writeConfig(workspace.root, {
        extensions: {
          mcpServers: {
            local: { type: 'stdio', command: 'node', args: ['server.js'], env: {} },
          },
        },
      });

      const missingName = createIo(workspace.root);
      expect(
        await runCli(
          ['node', 'xenesis', 'mcp', 'login', '--config', configPath, '--cwd', workspace.root],
          missingName.io,
        ),
      ).toBe(1);
      expect(missingName.stderr.join('\n')).toMatch(/mcp login.*server name/i);

      const unknown = createIo(workspace.root);
      expect(
        await runCli(
          ['node', 'xenesis', 'mcp', 'login', 'missing', '--config', configPath, '--cwd', workspace.root],
          unknown.io,
        ),
      ).toBe(1);
      expect(unknown.stderr.join('\n')).toMatch(/MCP server "missing" not found/i);

      const local = createIo(workspace.root);
      expect(
        await runCli(
          ['node', 'xenesis', 'mcp', 'login', 'local', '--config', configPath, '--cwd', workspace.root],
          local.io,
        ),
      ).toBe(1);
      expect(local.stderr.join('\n')).toMatch(/MCP server "local" has no URL configured/i);
    } finally {
      await workspace.cleanup();
    }
  });
});
