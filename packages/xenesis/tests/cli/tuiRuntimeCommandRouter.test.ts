import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { createTuiRuntimeCommandRouter } from '../../src/cli/tui/runtimeCommandRouter.js';
import { type ApprovalMode, loadConfig, type ProviderName } from '../../src/config/index.js';
import type { Tool, ToolRegistry } from '../../src/tools/index.js';
import { createTempWorkspace } from '../helpers/tempWorkspace.js';

describe('TUI runtime command router', () => {
  test('/status includes the runtime state facade fields', async () => {
    const workspace = await createTempWorkspace();
    try {
      const config = await loadConfig({
        cwd: workspace.root,
        env: { XENESIS_HOME: `${workspace.root}\\.xenesis` },
        cli: {
          provider: 'deepseek',
          model: 'deepseek-chat',
          approvalMode: 'safe',
        },
      });
      const notify = vi.fn();
      const router = createTuiRuntimeCommandRouter({
        parsed: {},
        env: { XENIS_MCP_BRIDGE_URL: 'http://127.0.0.1:3847' },
        chatSessionId: 'session-1',
        getState: () =>
          ({
            runtime: {},
            sessionContext: {},
            status: 'idle',
            turns: 0,
          }) as never,
        setRuntimeState: () => undefined,
        notify,
        setChatHistoryMessages: () => undefined,
        resetVisibleState: () => undefined,
        loadRuntimeConfig: async () => config,
        createRuntimeTools: async () => new Map(),
        selectTools: (_runtimeConfig, runtimeTools: ToolRegistry) => runtimeTools,
        isProviderName: (_value: string): _value is ProviderName => false,
        isApprovalMode: (_value: string): _value is ApprovalMode => false,
      });

      await router.handle('/status');

      expect(notify).toHaveBeenCalledWith(expect.stringContaining('provider=deepseek'));
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('contextPipeline=enabled'));
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('promptPipeline=enabled'));
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('completionGate=warn'));
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('kernel=disabled'));
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('storage=file'));
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('commitments=disabled'));
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('parity=not generated'));
    } finally {
      await workspace.cleanup();
    }
  });

  test('/tools renders manifest metadata instead of only comma-separated names', async () => {
    const workspace = await createTempWorkspace();
    try {
      const config = await loadConfig({
        cwd: workspace.root,
        env: { XENESIS_HOME: `${workspace.root}\\.xenesis` },
      });
      const notify = vi.fn();
      const manifestProbeTool: Tool = {
        name: 'manifest_probe',
        description: 'Probe manifest rendering.',
        inputSchema: z.object({}),
        isReadOnly: () => true,
        isConcurrencySafe: () => true,
        run: async () => ({ ok: true, content: 'ok' }),
      };
      const tools: ToolRegistry = new Map([[manifestProbeTool.name, manifestProbeTool]]);
      const router = createTuiRuntimeCommandRouter({
        parsed: {},
        env: {},
        chatSessionId: 'session-1',
        getState: () =>
          ({
            runtime: {},
            sessionContext: {},
            status: 'idle',
            turns: 0,
          }) as never,
        setRuntimeState: () => undefined,
        notify,
        setChatHistoryMessages: () => undefined,
        resetVisibleState: () => undefined,
        loadRuntimeConfig: async () => config,
        createRuntimeTools: async () => tools,
        selectTools: (_runtimeConfig, runtimeTools: ToolRegistry) => runtimeTools,
        isProviderName: (_value: string): _value is ProviderName => false,
        isApprovalMode: (_value: string): _value is ApprovalMode => false,
      });

      await router.handle('/tools');

      expect(notify).toHaveBeenCalledWith(expect.stringContaining('manifest_probe [tool/read]'));
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('concurrency=parallelRead'));
    } finally {
      await workspace.cleanup();
    }
  });

  test('/parity renders generated and missing parity report summaries', async () => {
    const workspace = await createTempWorkspace();
    try {
      const xenesisHome = join(workspace.root, '.xenesis');
      const config = await loadConfig({
        cwd: workspace.root,
        env: { XENESIS_HOME: xenesisHome },
      });
      const notify = vi.fn();
      const router = createTuiRuntimeCommandRouter({
        parsed: {},
        env: {},
        chatSessionId: 'session-1',
        getState: () =>
          ({
            runtime: {},
            sessionContext: {},
            status: 'idle',
            turns: 0,
          }) as never,
        setRuntimeState: () => undefined,
        notify,
        setChatHistoryMessages: () => undefined,
        resetVisibleState: () => undefined,
        loadRuntimeConfig: async () => config,
        createRuntimeTools: async () => new Map(),
        selectTools: (_runtimeConfig, runtimeTools: ToolRegistry) => runtimeTools,
        isProviderName: (_value: string): _value is ProviderName => false,
        isApprovalMode: (_value: string): _value is ApprovalMode => false,
      });

      await router.handle('/parity');
      expect(notify).toHaveBeenLastCalledWith(expect.stringContaining('parity: not generated'));

      await mkdir(join(xenesisHome, 'reports'), { recursive: true });
      await writeFile(
        join(xenesisHome, 'reports', 'agent-parity.json'),
        JSON.stringify({
          kind: 'xenesis-agent-parity-report',
          generatedAt: '2026-06-27T00:00:00.000Z',
          matrix: {
            summary: {
              matched: 2,
              adapted: 2,
              partial: 1,
              deferred: 0,
              notApplicable: 0,
              missing: 0,
            },
          },
          replay: { total: 5, passed: 4, failed: 1, results: [] },
        }),
        'utf8',
      );

      await router.handle('/parity');
      expect(notify).toHaveBeenLastCalledWith(expect.stringContaining('parity: 80%'));
      expect(notify).toHaveBeenLastCalledWith(expect.stringContaining('replay=4/5'));
    } finally {
      await workspace.cleanup();
    }
  });

  test('/commitments reports disabled feature state clearly', async () => {
    const workspace = await createTempWorkspace();
    try {
      const config = await loadConfig({
        cwd: workspace.root,
        env: { XENESIS_HOME: `${workspace.root}\\.xenesis` },
      });
      const notify = vi.fn();
      const router = createTuiRuntimeCommandRouter({
        parsed: {},
        env: {},
        chatSessionId: 'session-1',
        getState: () =>
          ({
            runtime: {},
            sessionContext: {},
            status: 'idle',
            turns: 0,
          }) as never,
        setRuntimeState: () => undefined,
        notify,
        setChatHistoryMessages: () => undefined,
        resetVisibleState: () => undefined,
        loadRuntimeConfig: async () => config,
        createRuntimeTools: async () => new Map(),
        selectTools: (_runtimeConfig, runtimeTools: ToolRegistry) => runtimeTools,
        isProviderName: (_value: string): _value is ProviderName => false,
        isApprovalMode: (_value: string): _value is ApprovalMode => false,
      });

      await router.handle('/commitments');

      expect(notify).toHaveBeenCalledWith(expect.stringContaining('commitments: disabled'));
      expect(notify).toHaveBeenCalledWith(expect.stringContaining('enable config.commitments.enabled'));
    } finally {
      await workspace.cleanup();
    }
  });

  test('runtime command router imports the runtime facade instead of private agent implementations', async () => {
    const source = await readFile(new URL('../../src/cli/tui/runtimeCommandRouter.ts', import.meta.url), 'utf8');

    expect(source).toContain('../../runtime/agentRuntimeState.js');
    expect(source).not.toMatch(/AgentRuntimeFactory|DeskContextPromptAdapter|DeskCompletionGateAdapter/);
  });
});
