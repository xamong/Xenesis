import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildXenesisProviderRuntimeOptions, buildXenesisProviderRuntimeStatus } from './xenesisService.mjs';

function tempCodexHome(withAuth) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-home-'));
  if (withAuth) fs.writeFileSync(path.join(dir, 'auth.json'), '{"tokens":{}}', 'utf8');
  return dir;
}

function tempHomeWithClaudeCredentials() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xenesis-home-'));
  const claudeDir = path.join(dir, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, '.credentials.json'), '{"accessToken":"redacted"}', 'utf8');
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
  assert.equal(result.requestedProvider, 'auto');
  assert.equal(result.source, 'auto-detect');
  assert.equal(result.credentialSource, 'codex-auth-json');
  assert.equal(result.processModel, 'persistent-process');
  assert.equal(result.safeForReasoning, true);
});

test("'auto' with Claude credentials resolves to claude-interactive", () => {
  const home = tempHomeWithClaudeCredentials();
  const result = buildXenesisProviderRuntimeOptions({
    aiProvider: { provider: 'auto', model: '', apiKey: '', baseUrl: '' },
    env: { USERPROFILE: home },
  });
  assert.equal(result.provider, 'claude-interactive');
  assert.equal(result.credentialSource, 'claude-credentials-json');
  assert.equal(result.processModel, 'persistent-process');
  assert.equal(result.safeForReasoning, true);
});

test("'auto' without credentials reports missing credentials without falling back to codex-cli", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xenesis-home-empty-'));
  const result = buildXenesisProviderRuntimeOptions({
    aiProvider: { provider: 'auto', model: '', apiKey: '', baseUrl: '' },
    env: { USERPROFILE: home },
  });
  assert.equal(result.provider, 'auto');
  assert.equal(result.credentialState, 'missing');
  assert.equal(result.safeForReasoning, false);
  assert.notEqual(result.provider, 'codex-cli');
  assert.match(result.diagnostics.join('\n'), /No provider credentials/i);
});

test("explicit 'codex-cli' is respected and NOT upgraded to app-server", () => {
  const result = buildXenesisProviderRuntimeOptions({
    aiProvider: { provider: 'codex-cli' },
    env: {},
  });
  assert.equal(result.provider, 'codex-cli');
  assert.equal(result.source, 'user-settings-profile');
});

test("explicit 'codex-app-server' passes straight through", () => {
  const result = buildXenesisProviderRuntimeOptions({
    aiProvider: { provider: 'codex-app-server' },
    env: {},
  });
  assert.equal(result.provider, 'codex-app-server');
  assert.equal(result.apiKeyEnv, '');
});

test('explicit keyed provider with no key is not silently switched (honest auth error downstream)', () => {
  const result = buildXenesisProviderRuntimeOptions({
    aiProvider: { provider: 'openai' },
    env: {},
  });
  assert.equal(result.provider, 'openai');
  assert.equal(result.credentialState, 'missing');
  assert.equal(result.safeForReasoning, false);
});

test('explicit unknown provider is blocked instead of falling back to codex-cli', () => {
  const result = buildXenesisProviderRuntimeOptions({
    aiProvider: { provider: 'not-a-provider' },
    env: {},
  });
  assert.equal(result.provider, 'not-a-provider');
  assert.equal(result.credentialState, 'missing');
  assert.equal(result.safeForReasoning, false);
  assert.notEqual(result.provider, 'codex-cli');
  assert.match(result.diagnostics.join('\n'), /Unknown provider/i);
});

for (const [provider, apiKeyEnv] of [
  ['openrouter', 'OPENROUTER_API_KEY'],
  ['mistral', 'MISTRAL_API_KEY'],
  ['xai', 'XAI_API_KEY'],
]) {
  test(`explicit '${provider}' provider uses ${apiKeyEnv} without leaking the secret`, () => {
    const result = buildXenesisProviderRuntimeOptions({
      aiProvider: { provider, model: 'desk-model', apiKey: '', baseUrl: '' },
      env: { [apiKeyEnv]: 'secret-value' },
    });

    assert.equal(result.provider, provider);
    assert.equal(result.model, 'desk-model');
    assert.equal(result.apiKeyEnv, apiKeyEnv);
    assert.equal(result.credentialState, 'configured');
    assert.equal(result.credentialSource, `env:${apiKeyEnv}`);
    assert.equal(result.processModel, 'http-streaming');
    assert.equal(result.safeForReasoning, true);
    assert.equal(JSON.stringify(result).includes('secret-value'), false);
  });
}

test('provider runtime status preserves redacted resolution metadata for CR readback', () => {
  const codexHome = tempCodexHome(true);
  const result = buildXenesisProviderRuntimeStatus({
    xenesisSettings: { profile: 'desk', model: '' },
    aiProvider: { provider: 'auto', model: 'gpt-5.4-mini', apiKey: 'secret-value', baseUrl: '' },
    env: { CODEX_HOME: codexHome },
  });

  assert.deepEqual(result, {
    provider: 'codex-app-server',
    model: 'gpt-5.4-mini',
    profile: 'desk',
    baseURL: '',
    apiKeyEnv: '',
    requestedProvider: 'auto',
    source: 'auto-detect',
    authMode: 'auto-detect',
    credentialState: 'not-required',
    credentialSource: 'codex-auth-json',
    processModel: 'persistent-process',
    fallbackProvider: 'codex-cli',
    safeForReasoning: true,
    diagnostics: [],
    localCliBoundary: 'provider identity is separate from local CLI integration',
  });
  assert.equal(JSON.stringify(result).includes('secret-value'), false);
});
