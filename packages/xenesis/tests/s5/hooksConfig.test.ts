import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/loadConfig.js';
import { defaultConfig } from '../../src/config/types.js';

async function loadFromObject(obj: unknown, env: Record<string, string> = {}) {
  const root = await mkdtemp(resolve(tmpdir(), 'xenesis-s5-cfg-'));
  try {
    await writeFile(resolve(root, 'xenesis.config.json'), JSON.stringify(obj), 'utf8');
    return await loadConfig({ cwd: root, env });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('S5 HooksConfig', () => {
  it('defaults are present and safe', () => {
    expect(defaultConfig.hooks.enabled).toBe(true);
    expect(defaultConfig.hooks.preToolUse).toEqual([]);
    expect(defaultConfig.hooks.stop).toEqual([]);
    expect(defaultConfig.hooks.maxStopHookContinuations).toBe(3);
    expect(defaultConfig.hooks.commandTimeoutMs).toBe(5000);
  });

  it('parses hook specs through zod', async () => {
    const cfg = await loadFromObject({
      hooks: {
        preToolUse: [{ command: 'node guard.js', toolPattern: '^shell$', timeoutMs: 2000 }],
        maxStopHookContinuations: 1,
      },
    });
    expect(cfg.hooks.preToolUse[0].command).toBe('node guard.js');
    expect(cfg.hooks.preToolUse[0].toolPattern).toBe('^shell$');
    expect(cfg.hooks.maxStopHookContinuations).toBe(1);
    expect(cfg.hooks.enabled).toBe(true); // default preserved
  });

  it('XENESIS_HOOKS_ENABLED env override', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'xenesis-s5-env-'));
    try {
      const cfg = await loadConfig({ cwd: root, env: { XENESIS_HOOKS_ENABLED: 'false' } });
      expect(cfg.hooks.enabled).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('XENESIS_HOOKS_ENABLED env override preserves file-configured hook arrays', async () => {
    const cfg = await loadFromObject(
      {
        hooks: {
          preToolUse: [{ command: 'node guard.js', toolPattern: '^shell$' }],
          stop: [{ command: 'node stop.js' }],
          maxStopHookContinuations: 2,
        },
      },
      { XENESIS_HOOKS_ENABLED: 'false' },
    );
    expect(cfg.hooks.enabled).toBe(false); // env override applied
    expect(cfg.hooks.preToolUse).toEqual([{ command: 'node guard.js', toolPattern: '^shell$' }]);
    expect(cfg.hooks.stop).toEqual([{ command: 'node stop.js' }]);
    expect(cfg.hooks.maxStopHookContinuations).toBe(2); // file value preserved
  });
});
