import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readPluginManifest } from '../../src/extensions/plugins.js';
import { resetProviderFactories } from '../../src/providers/providerFactory.js';

// Process-global provider registry: reset after every test so no i5 test leaks
// a registered factory into another (binding global constraint for all i5 tests).
afterEach(() => resetProviderFactories());

async function manifestDir(obj: object) {
  const d = await mkdtemp(join(tmpdir(), 'i5m-'));
  await writeFile(join(d, 'xenesis.plugin.json'), JSON.stringify(obj), 'utf8');
  return d;
}

describe('plugin manifest providers slot', () => {
  it('parses a providers entry', async () => {
    const d = await manifestDir({
      name: 'p',
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
    });
    const m = await readPluginManifest(d);
    expect(m.providers[0].name).toBe('myllm');
    expect(m.providers[0].capabilities.supportsTools).toBe(true);
  });
  it('defaults providers to [] (back-compat)', async () => {
    const d = await manifestDir({ name: 'p' });
    const m = await readPluginManifest(d);
    expect(m.providers).toEqual([]);
  });
  it('rejects a malformed capabilities shape', async () => {
    const d = await manifestDir({
      name: 'p',
      providers: [{ name: 'x', entry: './e.mjs', exportName: 'f', capabilities: { supportsTools: 'yes' } }],
    });
    await expect(readPluginManifest(d)).rejects.toThrow();
  });
});
