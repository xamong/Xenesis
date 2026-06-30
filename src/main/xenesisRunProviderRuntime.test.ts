import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeXenesisRunProviderRuntimeRequest } from './xenesisRunProviderRuntime';

test('normalizes nested providerRuntime overrides from Xenesis run requests', () => {
  assert.deepEqual(
    normalizeXenesisRunProviderRuntimeRequest({
      providerRuntime: {
        provider: 'codex-cli',
        model: 'gpt-5.5',
        providerProfile: 'desk',
        baseUrl: 'https://example.invalid/v1',
        apiKeyEnv: 'OPENAI_API_KEY',
      },
    }),
    {
      provider: 'codex-cli',
      model: 'gpt-5.5',
      profile: 'desk',
      baseURL: 'https://example.invalid/v1',
      apiKeyEnv: 'OPENAI_API_KEY',
    },
  );
});

test('keeps top-level provider override compatibility for older callers', () => {
  assert.deepEqual(
    normalizeXenesisRunProviderRuntimeRequest({
      provider: 'deepseek',
      model: 'deepseek-chat',
      profile: 'desk',
    }),
    {
      provider: 'deepseek',
      model: 'deepseek-chat',
      profile: 'desk',
    },
  );
});
