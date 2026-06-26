import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildXenesisProviderRuntimeOptions } from './xenesisService.mjs';

function tempCodexHome(withAuth) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-home-'));
  if (withAuth) fs.writeFileSync(path.join(dir, 'auth.json'), '{"tokens":{}}', 'utf8');
  return dir;
}

test("'auto' with a Codex ChatGPT login resolves to codex-app-server (persistent process, sandbox set up once)", () => {
  const codexHome = tempCodexHome(true);
  const result = buildXenesisProviderRuntimeOptions({
    aiProvider: { provider: 'auto', model: '', apiKey: '', baseUrl: '' },
    env: { CODEX_HOME: codexHome },
  });
  assert.equal(result.provider, 'codex-app-server');
  assert.equal(result.apiKeyEnv, ''); // local CLI auth, no API key needed
});

test("explicit 'codex-cli' is respected and NOT upgraded to app-server", () => {
  const result = buildXenesisProviderRuntimeOptions({
    aiProvider: { provider: 'codex-cli' },
    env: {},
  });
  assert.equal(result.provider, 'codex-cli');
});

test("explicit 'codex-app-server' passes straight through", () => {
  const result = buildXenesisProviderRuntimeOptions({
    aiProvider: { provider: 'codex-app-server' },
    env: {},
  });
  assert.equal(result.provider, 'codex-app-server');
  assert.equal(result.apiKeyEnv, '');
});

test("explicit keyed provider with no key is not silently switched (honest auth error downstream)", () => {
  const result = buildXenesisProviderRuntimeOptions({
    aiProvider: { provider: 'openai' },
    env: {},
  });
  assert.equal(result.provider, 'openai');
});
