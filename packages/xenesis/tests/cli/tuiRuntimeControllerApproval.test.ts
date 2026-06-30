import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { createTuiRuntimeController } from '../../src/cli/tui/runtimeController.js';
import { defaultConfig, type XenesisConfig } from '../../src/config/index.js';
import type { ApprovalRequest } from '../../src/core/events.js';

function createTestConfig(): XenesisConfig {
  return {
    ...defaultConfig,
    provider: 'mock',
    model: 'mock-model',
    workspace: '/repo',
    xenesisHome: '/repo/.xenesis',
  };
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for test condition.');
}

describe('TUI runtime controller approval handling', () => {
  test('does not reopen a resolved approval when the duplicate permission event arrives late', async () => {
    const config = createTestConfig();
    const request: ApprovalRequest = {
      toolCallId: 'call-tree',
      approvalId: 'approval-tree',
      name: 'tree',
      input: { path: '/outside/project' },
      reason: 'Path is outside the workspace and requires approval.',
      riskLevel: 'low',
      summary: 'tree /outside/project',
    };
    const controllerRuntime = createTuiRuntimeController({
      parsed: { provider: 'mock', model: 'mock-model', approvalMode: 'safe' },
      cwd: '/repo',
      env: {},
      io: {},
      config,
      setSessionWriter: () => undefined,
      loadRuntimeConfig: async () => config,
      createRuntimeTools: async () => new Map(),
      selectTools: (_config, tools) => tools,
      runPrompt: async (_parsed, _cwd, _env, _io, _prompt, _setSessionWriter, _history, options) => {
        const approved = await options.approvalHandler?.(request);
        expect(approved).toBe(true);
        options.onEvent?.({ type: 'permission_request', request });
        return 0;
      },
      runCapturedSlashCommand: async () => undefined,
      loadInputHistory: async () => [],
      appendInputHistory: async () => undefined,
      statePath: (...parts) => parts.join('/'),
      sessionDir: () => '/repo/.xenesis/sessions',
      resolveDeskBridgeStatus: () => 'configured',
      createTerminalImageRequest: async () => {
        throw new Error('not used');
      },
      friendlyImageError: (error) => String(error),
      bridgeCallFailed: () => undefined,
      isProviderName: (value): value is 'mock' => value === 'mock',
      isApprovalMode: (value): value is 'safe' => value === 'safe',
      isSupportedImageFileName: () => true,
      quoteCommandArg: (value) => value,
    });

    const submit = controllerRuntime.controller.submit('inspect outside');
    await waitFor(() => controllerRuntime.getState().pendingApproval?.toolCallId === 'call-tree');
    controllerRuntime.controller.resolveApproval(true);
    await submit;

    const state = controllerRuntime.getState();
    expect(state.pendingApproval).toBeUndefined();
    expect(state.notices).toContainEqual({ kind: 'info', message: 'Approved tree: tree /outside/project' });
    expect(state.notices.filter((notice) => notice.message.startsWith('Approval required'))).toHaveLength(1);
  });

  test('shows a repeated live approval id in a later run', async () => {
    const config = createTestConfig();
    const request: ApprovalRequest = {
      toolCallId: 'mock-call-1',
      approvalId: 'approval-mock-call-1',
      name: 'tree',
      input: { path: '/outside/project' },
      reason: 'Path is outside the workspace and requires approval.',
      riskLevel: 'low',
      summary: 'tree /outside/project',
    };
    const controllerRuntime = createTuiRuntimeController({
      parsed: { provider: 'mock', model: 'mock-model', approvalMode: 'safe' },
      cwd: '/repo',
      env: {},
      io: {},
      config,
      setSessionWriter: () => undefined,
      loadRuntimeConfig: async () => config,
      createRuntimeTools: async () => new Map(),
      selectTools: (_config, tools) => tools,
      runPrompt: async (_parsed, _cwd, _env, _io, _prompt, _setSessionWriter, _history, options) => {
        const approved = await options.approvalHandler?.(request);
        expect(approved).toBe(true);
        return 0;
      },
      runCapturedSlashCommand: async () => undefined,
      loadInputHistory: async () => [],
      appendInputHistory: async () => undefined,
      statePath: (...parts) => parts.join('/'),
      sessionDir: () => '/repo/.xenesis/sessions',
      resolveDeskBridgeStatus: () => 'configured',
      createTerminalImageRequest: async () => {
        throw new Error('not used');
      },
      friendlyImageError: (error) => String(error),
      bridgeCallFailed: () => undefined,
      isProviderName: (value): value is 'mock' => value === 'mock',
      isApprovalMode: (value): value is 'safe' => value === 'safe',
      isSupportedImageFileName: () => true,
      quoteCommandArg: (value) => value,
    });

    const firstRun = controllerRuntime.controller.submit('inspect outside');
    await waitFor(() => controllerRuntime.getState().pendingApproval?.toolCallId === 'mock-call-1');
    controllerRuntime.controller.resolveApproval(true);
    await firstRun;
    expect(controllerRuntime.getState().pendingApproval).toBeUndefined();

    const secondRun = controllerRuntime.controller.submit('inspect outside again');
    await waitFor(
      () =>
        controllerRuntime.getState().pendingApproval?.toolCallId === 'mock-call-1' &&
        controllerRuntime.getState().pendingApproval?.restored !== true,
    );
    controllerRuntime.controller.resolveApproval(true);
    await secondRun;

    const state = controllerRuntime.getState();
    expect(state.pendingApproval).toBeUndefined();
    expect(state.notices.filter((notice) => notice.message === 'Approved tree: tree /outside/project')).toHaveLength(2);
  });

  test('restores a pending durable approval from resume without a prompt', async () => {
    const home = await mkdtemp(join(tmpdir(), 'xenesis-durable-approval-'));
    try {
      const sessionId = 'session-approval';
      const sessionsDir = join(home, 'sessions');
      await mkdir(sessionsDir, { recursive: true });
      const request: ApprovalRequest = {
        toolCallId: 'call-tree',
        approvalId: 'approval-tree',
        name: 'tree',
        input: { path: '/outside/project' },
        reason: 'Path is outside the workspace and requires approval.',
        riskLevel: 'low',
        summary: 'tree /outside/project',
      };
      await writeFile(
        join(sessionsDir, `${sessionId}.jsonl`),
        `${[
          {
            type: 'user_message',
            message: { role: 'user', content: 'inspect external path' },
            sessionId,
            timestamp: new Date(0).toISOString(),
          },
          {
            type: 'assistant_message',
            message: { role: 'assistant', content: 'I need approval.' },
            sessionId,
            timestamp: new Date(1).toISOString(),
          },
          {
            type: 'durable_approval_pending',
            request,
            sessionId,
            timestamp: new Date(2).toISOString(),
          },
        ]
          .map((record) => JSON.stringify(record))
          .join('\n')}\n`,
        'utf8',
      );
      const config = {
        ...createTestConfig(),
        xenesisHome: home,
      };
      let promptRuns = 0;
      const controllerRuntime = createTuiRuntimeController({
        parsed: { provider: 'mock', model: 'mock-model', approvalMode: 'safe' },
        cwd: '/repo',
        env: {},
        io: {},
        config,
        setSessionWriter: () => undefined,
        loadRuntimeConfig: async () => config,
        createRuntimeTools: async () => new Map(),
        selectTools: (_config, tools) => tools,
        runPrompt: async () => {
          promptRuns += 1;
          return 0;
        },
        runCapturedSlashCommand: async () => undefined,
        loadInputHistory: async () => [],
        appendInputHistory: async () => undefined,
        statePath: (...parts) => parts.join('/'),
        sessionDir: () => sessionsDir,
        resolveDeskBridgeStatus: () => 'configured',
        createTerminalImageRequest: async () => {
          throw new Error('not used');
        },
        friendlyImageError: (error) => String(error),
        bridgeCallFailed: () => undefined,
        isProviderName: (value): value is 'mock' => value === 'mock',
        isApprovalMode: (value): value is 'safe' => value === 'safe',
        isSupportedImageFileName: () => true,
        quoteCommandArg: (value) => value,
      });

      await controllerRuntime.controller.submit(`/resume ${sessionId}`);

      expect(promptRuns).toBe(0);
      expect(controllerRuntime.getState().status).toBe('awaiting_approval');
      expect(controllerRuntime.getState().sessionContext).toMatchObject({
        resumedFromSessionId: sessionId,
        historyMessageCount: 2,
      });
      expect(controllerRuntime.getState().pendingApproval).toMatchObject({
        toolCallId: 'call-tree',
        name: 'tree',
        summary: 'tree /outside/project',
        restored: true,
      });
      expect(controllerRuntime.getState().notices.at(-1)).toMatchObject({
        kind: 'warning',
        message: expect.stringContaining('Restored approval required'),
      });

      controllerRuntime.controller.resolveApproval(true);

      expect(controllerRuntime.getState().notices.at(-1)).toMatchObject({
        kind: 'warning',
        message: expect.stringContaining('not attached to a live run'),
      });
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  });

  test('replaces restored approval context when the resumed live run requests the same approval', async () => {
    const home = await mkdtemp(join(tmpdir(), 'xenesis-durable-approval-'));
    try {
      const sessionId = 'session-approval';
      const sessionsDir = join(home, 'sessions');
      await mkdir(sessionsDir, { recursive: true });
      const request: ApprovalRequest = {
        toolCallId: 'call-tree',
        approvalId: 'approval-tree',
        name: 'tree',
        input: { path: '/outside/project' },
        reason: 'Path is outside the workspace and requires approval.',
        riskLevel: 'low',
        summary: 'tree /outside/project',
      };
      await writeFile(
        join(sessionsDir, `${sessionId}.jsonl`),
        `${[
          {
            type: 'user_message',
            message: { role: 'user', content: 'inspect external path' },
            sessionId,
            timestamp: new Date(0).toISOString(),
          },
          {
            type: 'durable_approval_pending',
            request,
            sessionId,
            timestamp: new Date(1).toISOString(),
          },
        ]
          .map((record) => JSON.stringify(record))
          .join('\n')}\n`,
        'utf8',
      );
      const config = {
        ...createTestConfig(),
        xenesisHome: home,
      };
      const controllerRuntime = createTuiRuntimeController({
        parsed: { provider: 'mock', model: 'mock-model', approvalMode: 'safe' },
        cwd: '/repo',
        env: {},
        io: {},
        config,
        setSessionWriter: () => undefined,
        loadRuntimeConfig: async () => config,
        createRuntimeTools: async () => new Map(),
        selectTools: (_config, tools) => tools,
        runPrompt: async (_parsed, _cwd, _env, _io, _prompt, _setSessionWriter, _history, options) => {
          const approved = await options.approvalHandler?.(request);
          expect(approved).toBe(true);
          return 0;
        },
        runCapturedSlashCommand: async () => undefined,
        loadInputHistory: async () => [],
        appendInputHistory: async () => undefined,
        statePath: (...parts) => parts.join('/'),
        sessionDir: () => sessionsDir,
        resolveDeskBridgeStatus: () => 'configured',
        createTerminalImageRequest: async () => {
          throw new Error('not used');
        },
        friendlyImageError: (error) => String(error),
        bridgeCallFailed: () => undefined,
        isProviderName: (value): value is 'mock' => value === 'mock',
        isApprovalMode: (value): value is 'safe' => value === 'safe',
        isSupportedImageFileName: () => true,
        quoteCommandArg: (value) => value,
      });

      await controllerRuntime.controller.submit(`/resume ${sessionId}`);
      expect(controllerRuntime.getState().pendingApproval).toMatchObject({
        toolCallId: 'call-tree',
        restored: true,
      });

      const resumed = controllerRuntime.controller.submit(`/resume ${sessionId} continue`);
      await waitFor(
        () =>
          controllerRuntime.getState().pendingApproval?.toolCallId === 'call-tree' &&
          controllerRuntime.getState().pendingApproval?.restored !== true,
      );

      controllerRuntime.controller.resolveApproval(true);
      await resumed;

      expect(controllerRuntime.getState().pendingApproval).toBeUndefined();
      expect(controllerRuntime.getState().notices).toContainEqual({
        kind: 'info',
        message: 'Approved tree: tree /outside/project',
      });
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  });

  test('replaces restored approval context even when the same approval id was resolved earlier', async () => {
    const home = await mkdtemp(join(tmpdir(), 'xenesis-durable-approval-'));
    try {
      const sessionId = 'session-approval';
      const sessionsDir = join(home, 'sessions');
      await mkdir(sessionsDir, { recursive: true });
      const request: ApprovalRequest = {
        toolCallId: 'call-x',
        approvalId: 'approval-x',
        name: 'tree',
        input: { path: '/outside/project' },
        reason: 'Path is outside the workspace and requires approval.',
        riskLevel: 'low',
        summary: 'tree /outside/project',
      };
      await writeFile(
        join(sessionsDir, `${sessionId}.jsonl`),
        `${[
          {
            type: 'user_message',
            message: { role: 'user', content: 'inspect external path' },
            sessionId,
            timestamp: new Date(0).toISOString(),
          },
          {
            type: 'durable_approval_pending',
            request,
            sessionId,
            timestamp: new Date(1).toISOString(),
          },
        ]
          .map((record) => JSON.stringify(record))
          .join('\n')}\n`,
        'utf8',
      );
      const config = {
        ...createTestConfig(),
        xenesisHome: home,
      };
      const controllerRuntime = createTuiRuntimeController({
        parsed: { provider: 'mock', model: 'mock-model', approvalMode: 'safe' },
        cwd: '/repo',
        env: {},
        io: {},
        config,
        setSessionWriter: () => undefined,
        loadRuntimeConfig: async () => config,
        createRuntimeTools: async () => new Map(),
        selectTools: (_config, tools) => tools,
        runPrompt: async (_parsed, _cwd, _env, _io, _prompt, _setSessionWriter, _history, options) => {
          const approved = await options.approvalHandler?.(request);
          expect(approved).toBe(true);
          return 0;
        },
        runCapturedSlashCommand: async () => undefined,
        loadInputHistory: async () => [],
        appendInputHistory: async () => undefined,
        statePath: (...parts) => parts.join('/'),
        sessionDir: () => sessionsDir,
        resolveDeskBridgeStatus: () => 'configured',
        createTerminalImageRequest: async () => {
          throw new Error('not used');
        },
        friendlyImageError: (error) => String(error),
        bridgeCallFailed: () => undefined,
        isProviderName: (value): value is 'mock' => value === 'mock',
        isApprovalMode: (value): value is 'safe' => value === 'safe',
        isSupportedImageFileName: () => true,
        quoteCommandArg: (value) => value,
      });

      const firstLiveRun = controllerRuntime.controller.submit('inspect outside');
      await waitFor(() => controllerRuntime.getState().pendingApproval?.toolCallId === 'call-x');
      controllerRuntime.controller.resolveApproval(true);
      await firstLiveRun;
      expect(controllerRuntime.getState().pendingApproval).toBeUndefined();

      await controllerRuntime.controller.submit(`/resume ${sessionId}`);
      expect(controllerRuntime.getState().pendingApproval).toMatchObject({
        toolCallId: 'call-x',
        restored: true,
      });

      const resumed = controllerRuntime.controller.submit(`/resume ${sessionId} continue`);
      await waitFor(
        () =>
          controllerRuntime.getState().pendingApproval?.toolCallId === 'call-x' &&
          controllerRuntime.getState().pendingApproval?.restored !== true,
      );

      controllerRuntime.controller.resolveApproval(true);
      await resumed;

      expect(controllerRuntime.getState().pendingApproval).toBeUndefined();
    } finally {
      await rm(home, { recursive: true, force: true });
    }
  });
});
