import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { loadConfig } from '../../src/config/loadConfig.js';
import { createTempWorkspace } from '../helpers/tempWorkspace.js';

const examplePath = fileURLToPath(new URL('../../xenesis.mcp.example.config.json', import.meta.url));

describe('recommended MCP config', () => {
  test('loadConfig preserves recommendedMcpServers from file config', async () => {
    const workspace = await createTempWorkspace();
    try {
      await writeFile(
        join(workspace.root, 'xenesis.config.json'),
        JSON.stringify({
          provider: 'mock',
          model: 'mock-model',
          extensions: {
            recommendedMcpServers: ['filesystem', 'fetch'],
          },
        }),
        'utf8',
      );

      const config = await loadConfig({ cwd: workspace.root, env: {} });

      expect(config.extensions.recommendedMcpServers).toEqual(['filesystem', 'fetch']);
      expect(config.extensions.mcpServers).toEqual({});
    } finally {
      await workspace.cleanup();
    }
  });

  test('loadConfig preserves recommendedMcpServers from active profile', async () => {
    const workspace = await createTempWorkspace();
    try {
      const xenesisHome = join(workspace.root, '.xenesis');
      await mkdir(xenesisHome, { recursive: true });
      await writeFile(
        join(xenesisHome, 'profiles.json'),
        JSON.stringify({
          active: 'work',
          profiles: {
            work: {
              extensions: {
                recommendedMcpServers: ['linear'],
              },
            },
          },
        }),
        'utf8',
      );

      const config = await loadConfig({
        cwd: workspace.root,
        env: { XENESIS_HOME: xenesisHome },
      });

      expect(config.extensions.recommendedMcpServers).toEqual(['linear']);
    } finally {
      await workspace.cleanup();
    }
  });

  test('MCP example config is valid and preserves recommended connectors', async () => {
    const raw = JSON.parse(await readFile(examplePath, 'utf8')) as {
      extensions?: {
        recommendedMcpServers?: string[];
        mcpServers?: Record<string, { url?: string; enabled?: boolean }>;
      };
    };

    expect(raw.extensions?.recommendedMcpServers).toEqual(expect.arrayContaining(['filesystem', 'fetch']));
    expect(raw.extensions?.mcpServers?.linear?.url).toBe('https://mcp.linear.app/mcp');
    expect(raw.extensions?.mcpServers?.disabledExample?.enabled).toBe(false);

    const config = await loadConfig({
      cwd: process.cwd(),
      configPath: examplePath,
      env: { GITHUB_TOKEN: 'ghp_x', NOTION_TOKEN: 'secret_x' },
    });

    expect(config.extensions.recommendedMcpServers).toEqual(expect.arrayContaining(['filesystem', 'fetch']));
    expect(config.extensions.mcpServers.linear).toMatchObject({
      type: 'http',
      transport: 'http',
      auth: 'oauth',
    });
  });
});
