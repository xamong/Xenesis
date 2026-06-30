import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runConnectionCheck } from '../../src/connect/report.js';

async function tempWorkspace() {
  return await mkdtemp(join(tmpdir(), 'xenesis-connect-readiness-'));
}

describe('connect provider readiness', () => {
  it('fails mock provider checks without the explicit test gate', async () => {
    const workspace = await tempWorkspace();

    const result = await runConnectionCheck({
      cwd: workspace,
      env: {},
      cli: {
        provider: 'mock',
        model: 'mock-model',
        workspace,
        xenesisHome: workspace,
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.checks[0]).toMatchObject({
      name: 'provider:mock',
      status: 'failed',
    });
    expect(result.report.checks[0]?.message).toMatch(/mock provider is blocked|provider mock is blocked/i);
  });

  it('fails auto provider checks cleanly when no provider credentials are present', async () => {
    const workspace = await tempWorkspace();

    const result = await runConnectionCheck({
      cwd: workspace,
      env: {},
      providerResolution: {
        existsSync: () => false,
        homeDir: join(tmpdir(), 'xenesis-no-provider-auth'),
      },
      cli: {
        provider: 'auto',
        model: 'gpt-test',
        workspace,
        xenesisHome: workspace,
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.checks[0]).toMatchObject({
      name: 'provider:auto',
      status: 'failed',
    });
    expect(result.report.checks[0]?.message).toMatch(/missing provider credentials|missing credentials/i);
  });

  it('fails openai-compatible provider checks when no baseURL is configured', async () => {
    const workspace = await tempWorkspace();

    const result = await runConnectionCheck({
      cwd: workspace,
      env: { XENESIS_API_KEY: 'secret-value' },
      cli: {
        provider: 'openai-compatible',
        model: 'gateway-model',
        workspace,
        xenesisHome: workspace,
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.checks[0]).toMatchObject({
      name: 'provider:openai-compatible',
      status: 'failed',
    });
    expect(result.report.checks[0]?.message).toMatch(/baseURL/i);
  });
});
