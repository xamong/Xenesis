import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, type XenesisConfig } from '../../src/config/index.js';
import { createProvider, createRuntimeTools } from '../../src/core/AgentRuntimeFactory.js';
import { getProviderFactory, resetProviderFactories } from '../../src/providers/providerFactory.js';
import type { ToolContext } from '../../src/tools/types.js';
import { createTempWorkspace } from '../helpers/tempWorkspace.js';

afterEach(() => resetProviderFactories());

// A provider entry whose factory returns a sentinel object so we can prove the
// resolved provider is the plugin-supplied one (not a built-in fallback).
const FACTORY_SRC = `export const factory = (opts) => ({ __pluginProvider: true, name: opts.name, model: opts.model });`;

const PROVIDER_MANIFEST = {
  name: 'provider-plugin',
  version: '0.1.0',
  providers: [
    {
      name: 'myllm',
      entry: './prov.mjs',
      exportName: 'factory',
      capabilities: {
        supportsTools: true,
        requiresApiKey: false,
        transport: 'http-streaming',
        streaming: true,
        persistentSession: false,
      },
    },
  ],
};

async function writeProviderPlugin(root: string, manifest: object = PROVIDER_MANIFEST, src = FACTORY_SRC) {
  const pluginDir = join(root, 'plugins', 'provider');
  await mkdir(pluginDir, { recursive: true });
  await writeFile(join(pluginDir, 'xenesis.plugin.json'), JSON.stringify(manifest), 'utf8');
  await writeFile(join(pluginDir, 'prov.mjs'), src, 'utf8');
  return pluginDir;
}

async function writeMockConfig(root: string, extra: Record<string, unknown> = {}) {
  const configPath = join(root, 'xenesis.config.json');
  await writeFile(
    configPath,
    JSON.stringify({ provider: 'mock', model: 'mock-model', workspace: '.', ...extra }),
    'utf8',
  );
  return configPath;
}

function toolContext(root: string): ToolContext {
  return {
    workspaceRoot: root,
    cwd: root,
    sessionId: 'integration-test',
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  };
}

describe('plugin provider integration (createRuntimeTools wiring)', () => {
  it('registers a manifest provider during createRuntimeTools so createProvider resolves it', async () => {
    const workspace = await createTempWorkspace();
    try {
      await writeProviderPlugin(workspace.root);
      const configPath = await writeMockConfig(workspace.root, {
        extensions: { plugins: { paths: ['plugins/provider'] } },
      });
      // env: {} (not XENESIS_HOME inside the workspace) so the plugin-state SQLite db
      // lives outside the temp dir — otherwise its open handle locks workspace cleanup
      // on Windows (mirrors tests/core/agentRuntimeFactory.subagents.test.ts).
      const config = await loadConfig({ cwd: workspace.root, configPath, env: {} });

      // Before runtime construction the plugin provider is NOT in the global registry.
      expect(getProviderFactory('myllm')).toBeUndefined();

      // createRuntimeTools loads plugin providers (tolerant policy) as a side effect.
      await createRuntimeTools(config, process.env);

      // The plugin-declared provider is now registered process-wide...
      expect(typeof getProviderFactory('myllm')).toBe('function');

      // ...and createProvider resolves the plugin-supplied factory (not a built-in).
      // config.provider is enum-validated, so override it via cast for the lookup —
      // the registry key is what matters here.
      const provider = createProvider(
        { ...config, provider: 'myllm' as XenesisConfig['provider'], model: 'm' },
        process.env,
      ) as unknown as { __pluginProvider?: boolean; name?: string };
      expect(provider.__pluginProvider).toBe(true);
      expect(provider.name).toBe('myllm');
    } finally {
      await workspace.cleanup();
    }
  });

  it('does not crash createRuntimeTools when a provider plugin throws (tolerant policy)', async () => {
    const workspace = await createTempWorkspace();
    try {
      // Entry whose export is not a function: loadProviderExport throws, but the
      // tolerant policy in createRuntimeTools must swallow it (no boot crash).
      await writeProviderPlugin(workspace.root, PROVIDER_MANIFEST, `export const factory = { not: "a function" };`);
      const configPath = await writeMockConfig(workspace.root, {
        extensions: { plugins: { paths: ['plugins/provider'] } },
      });
      // env: {} (not XENESIS_HOME inside the workspace) so the plugin-state SQLite db
      // lives outside the temp dir — otherwise its open handle locks workspace cleanup
      // on Windows (mirrors tests/core/agentRuntimeFactory.subagents.test.ts).
      const config = await loadConfig({ cwd: workspace.root, configPath, env: {} });

      // Must resolve (not reject): a faulty provider plugin is skipped under tolerant policy.
      await expect(createRuntimeTools(config, process.env)).resolves.toBeDefined();
      // The faulty provider was NOT registered.
      expect(getProviderFactory('myllm')).toBeUndefined();
    } finally {
      await workspace.cleanup();
    }
  });

  it('registers the memory tool with ledger-backed history support when memory is enabled', async () => {
    const workspace = await createTempWorkspace();
    try {
      const configPath = await writeMockConfig(workspace.root, {
        extensions: { memory: { enabled: true, path: '.xenesis/runtime-memory.json' } },
      });
      const config = await loadConfig({
        cwd: workspace.root,
        configPath,
        env: { XENESIS_HOME: join(workspace.root, '.xenesis-home') },
      });
      const registry = await createRuntimeTools(config, {});
      const memoryTool = registry.get('memory');
      expect(memoryTool).toBeDefined();

      const context = toolContext(workspace.root);
      const saved = await memoryTool!.run(
        {
          action: 'save',
          id: 'runtime-ledger-1',
          text: 'runtime ledger-backed memory',
          tags: ['runtime'],
        },
        context,
      );
      expect(saved.ok).toBe(true);
      expect(saved.content).toContain('saved runtime-ledger-1');

      const history = await memoryTool!.run({ action: 'history', id: 'runtime-ledger-1' }, context);
      expect(history.ok).toBe(true);
      expect(JSON.stringify(history.data)).toContain('memory_accepted');
    } finally {
      await workspace.cleanup();
    }
  });
});
