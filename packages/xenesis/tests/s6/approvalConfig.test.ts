import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/loadConfig.js';
import { defaultConfig } from '../../src/config/types.js';

async function loadFromObject(obj: unknown, env: Record<string, string> = {}) {
  const root = await mkdtemp(resolve(tmpdir(), 'xenesis-s6-cfg-'));
  try {
    await writeFile(resolve(root, 'xenesis.config.json'), JSON.stringify(obj), 'utf8');
    return await loadConfig({ cwd: root, env });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('S6 ApprovalConfig', () => {
  it('defaults', () => {
    expect(defaultConfig.approval.timeoutMs).toBe(300000);
    expect(defaultConfig.approval.timeoutBehavior).toBe('deny');
  });
  it('parses overrides', async () => {
    const cfg = await loadFromObject({ approval: { timeoutMs: 60000, timeoutBehavior: 'allow' } });
    expect(cfg.approval.timeoutMs).toBe(60000);
    expect(cfg.approval.timeoutBehavior).toBe('allow');
  });
  it('applies CLI approval overrides', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'xenesis-s6-cfg-cli-'));
    try {
      const cfg = await loadConfig({
        cwd: root,
        env: {},
        cli: { approval: { timeoutMs: 12000, timeoutBehavior: 'allow' } },
      });
      expect(cfg.approval.timeoutMs).toBe(12000);
      expect(cfg.approval.timeoutBehavior).toBe('allow');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it('merges a partial CLI approval override with defaults', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'xenesis-s6-cfg-cli-partial-'));
    try {
      const cfg = await loadConfig({
        cwd: root,
        env: {},
        cli: { approval: { timeoutMs: 45000 } },
      });
      expect(cfg.approval.timeoutMs).toBe(45000);
      // timeoutBehavior was not overridden -> falls back to default "deny"
      expect(cfg.approval.timeoutBehavior).toBe('deny');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it('CLI approval override beats file config', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'xenesis-s6-cfg-cli-precedence-'));
    try {
      await writeFile(
        resolve(root, 'xenesis.config.json'),
        JSON.stringify({ approval: { timeoutMs: 60000, timeoutBehavior: 'deny' } }),
        'utf8',
      );
      const cfg = await loadConfig({
        cwd: root,
        env: {},
        cli: { approval: { timeoutBehavior: 'allow' } },
      });
      // file-provided timeoutMs is preserved; CLI overrides only timeoutBehavior
      expect(cfg.approval.timeoutMs).toBe(60000);
      expect(cfg.approval.timeoutBehavior).toBe('allow');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
