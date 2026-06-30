import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCommandHookHandler } from '../../src/hooks/CommandHookHandler.js';
import { createTempWorkspace } from '../helpers/tempWorkspace.js';

async function readJsonWithRetry(path: string): Promise<Record<string, string>> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return JSON.parse(await readFile(path, 'utf8'));
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`hook env dump not written: ${path}`);
}

describe('command hook child does not inherit secrets', () => {
  it('scrubs *_API_KEY secrets from the spawned hook command env', async () => {
    const workspace = await createTempWorkspace('xenesis-hook-env-');
    const hadPriorValue = 'FOO_API_KEY' in process.env;
    const priorValue = process.env.FOO_API_KEY;
    process.env.FOO_API_KEY = 'leak-me-please';
    try {
      const scriptPath = join(workspace.root, 'hook.mjs');
      const dumpPath = join(workspace.root, 'hook-env-dump.json');
      await mkdir(workspace.root, { recursive: true });
      await writeFile(
        scriptPath,
        [
          `import { writeFileSync } from "node:fs";`,
          // Dump the hook child's OWN env so the test can inspect what the spawn handed it.
          `writeFileSync(process.argv[2], JSON.stringify(process.env));`,
        ].join('\n'),
        'utf8',
      );

      const handler = createCommandHookHandler(
        { command: `node "${scriptPath}" "${dumpPath}"`, timeoutMs: 10000 },
        'pre_tool_use',
        { commandTimeoutMs: 10000 },
      );
      const decision = await handler({
        toolName: 'shell',
        toolInput: {},
        isReadOnly: true,
        isMutation: false,
      });
      // Empty hook stdout fails open to allow — the command still ran.
      expect(decision).toEqual({ decision: 'allow' });

      const childEnv = await readJsonWithRetry(dumpPath);
      expect(childEnv.FOO_API_KEY).toBeUndefined();
      // Sanity: a non-secret var still passes through (env populated, not empty).
      expect(childEnv.PATH ?? childEnv.Path).toBeDefined();
    } finally {
      if (hadPriorValue) process.env.FOO_API_KEY = priorValue;
      else delete process.env.FOO_API_KEY;
      await workspace.cleanup();
    }
  }, 20000);
});
