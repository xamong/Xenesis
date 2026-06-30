import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../../src');

function read(rel: string): string {
  return readFileSync(resolve(srcDir, rel), 'utf8');
}

/**
 * Global constraint #6: executionBackend.ts imports the leaf utils/command.ts,
 * and command.ts must NOT import `core/isolation`. The loader-injection guard
 * lives in the true leaf `utils/dangerousEnv.ts`, which command.ts imports
 * instead — so no `command -> isolation -> ... -> command/executionBackend`
 * cycle can form.
 */
describe('execution backend import boundary', () => {
  it('command.ts does not import core/isolation', () => {
    const command = read('utils/command.ts');
    expect(command).not.toMatch(/from\s+["'][^"']*core\/isolation/);
  });

  it('the loader-injection guard leaf imports nothing from the project', () => {
    const guard = read('utils/dangerousEnv.ts');
    // Only Node built-ins / type-level globals are allowed; no project imports.
    const importLines = guard.split('\n').filter((line) => /^\s*import\b/.test(line));
    expect(importLines).toHaveLength(0);
  });

  it('executionBackend.ts imports the leaf utils/command, not isolation siblings for spawning', () => {
    const backend = read('core/isolation/executionBackend.ts');
    expect(backend).toMatch(/from\s+["']\.\.\/\.\.\/utils\/command\.js["']/);
  });
});
