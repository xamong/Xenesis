import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentProvider, ProviderRequest, ProviderResponse } from '../../src/providers/types.js';

const { createProviderMock } = vi.hoisted(() => ({
  createProviderMock: vi.fn(),
}));

vi.mock('../../src/core/AgentRuntimeFactory.js', () => ({
  createProvider: createProviderMock,
}));

import { runConnectionCheck } from '../../src/connect/report.js';

function response(content: string): ProviderResponse {
  return {
    message: {
      role: 'assistant',
      content,
    },
  };
}

describe('runConnectionCheck provider probe lifecycle', () => {
  beforeEach(() => {
    createProviderMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('disposes a disposable provider after a probe so persistent CLI children do not keep connect check alive', async () => {
    const complete = vi.fn(async (_request: ProviderRequest) => response('ok'));
    const dispose = vi.fn();
    const provider = {
      name: 'codex-app-server',
      complete,
      dispose,
    } as AgentProvider & { dispose(): void };
    createProviderMock.mockReturnValue(provider);
    const cwd = await mkdtemp(join(tmpdir(), 'xenesis-connect-probe-'));
    const xenesisHome = await mkdtemp(join(tmpdir(), 'xenesis-connect-home-'));

    const result = await runConnectionCheck({
      cwd,
      env: { ...process.env, XENESIS_HOME: xenesisHome },
      cli: {
        provider: 'codex-app-server',
        model: 'test-model',
      },
      probe: true,
    });

    expect(result.exitCode).toBe(0);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('honors XENESIS_CONNECT_PROBE_TIMEOUT_MS for slow persistent providers', async () => {
    let markCompleteStarted!: () => void;
    const completeStarted = new Promise<void>((resolve) => {
      markCompleteStarted = resolve;
    });
    const complete = vi.fn(
      (request: ProviderRequest) =>
        new Promise<ProviderResponse>((resolve, reject) => {
          markCompleteStarted();
          request.signal?.addEventListener('abort', () => reject(new Error('probe aborted')));
          setTimeout(() => resolve(response('slow ok')), 31_000);
        }),
    );
    const dispose = vi.fn();
    createProviderMock.mockReturnValue({
      name: 'codex-app-server',
      complete,
      dispose,
    } as AgentProvider & { dispose(): void });
    const cwd = await mkdtemp(join(tmpdir(), 'xenesis-connect-probe-'));
    const xenesisHome = await mkdtemp(join(tmpdir(), 'xenesis-connect-home-'));
    vi.useFakeTimers();

    const pending = runConnectionCheck({
      cwd,
      env: {
        ...process.env,
        XENESIS_HOME: xenesisHome,
        XENESIS_CONNECT_PROBE_TIMEOUT_MS: '60000',
      },
      cli: {
        provider: 'codex-app-server',
        model: 'test-model',
      },
      probe: true,
      now: () => new Date('2026-06-28T13:45:00.000Z'),
    });

    await completeStarted;
    await vi.advanceTimersByTimeAsync(31_000);
    const result = await pending;

    expect(result.exitCode).toBe(0);
    expect(result.report.checks[0]?.message).toBe('probe ok: slow ok');
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
