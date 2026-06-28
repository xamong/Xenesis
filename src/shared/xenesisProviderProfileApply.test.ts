import assert from 'node:assert/strict';
import test from 'node:test';
import type { AiProviderSettings } from './types';
import {
  buildXenesisProviderProfileDraftApplySettings,
  redactXenesisProviderProfileDraftApplySettings,
} from './xenesisProviderProfileApply';

const currentSettings: AiProviderSettings = {
  provider: 'auto',
  model: '',
  apiKey: 'existing-secret',
  baseUrl: '',
  xcAgentApiUrl: '',
  xcApiUrl: '',
  labApiUrl: 'http://127.0.0.1:3845',
  reasoningEffort: 'medium',
};

test('buildXenesisProviderProfileDraftApplySettings merges non-secret provider profile fields', () => {
  const result = buildXenesisProviderProfileDraftApplySettings({
    current: currentSettings,
    args: {
      provider: 'auto',
      model: 'gpt-5-codex',
      baseUrl: 'https://example.invalid/v1',
      reasoningEffort: 'high',
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.provider, 'auto');
  assert.deepEqual(result.appliedFields, ['provider', 'model', 'baseUrl', 'reasoningEffort']);
  assert.equal(result.settings.provider, 'auto');
  assert.equal(result.settings.model, 'gpt-5-codex');
  assert.equal(result.settings.baseUrl, 'https://example.invalid/v1');
  assert.equal(result.settings.reasoningEffort, 'high');
  assert.equal(result.settings.apiKey, 'existing-secret');

  assert.deepEqual(redactXenesisProviderProfileDraftApplySettings(result.settings), {
    provider: 'auto',
    model: 'gpt-5-codex',
    baseUrlState: 'configured',
    xcAgentApiUrlState: 'missing',
    xcApiUrlState: 'missing',
    labApiUrlState: 'configured',
    reasoningEffort: 'high',
    apiKeyState: 'configured',
  });
});

test('buildXenesisProviderProfileDraftApplySettings rejects unsupported providers and raw secrets', () => {
  assert.deepEqual(buildXenesisProviderProfileDraftApplySettings({ current: currentSettings, args: {} }), {
    ok: false,
    error: 'Provider is required.',
  });

  const unsupported = buildXenesisProviderProfileDraftApplySettings({
    current: currentSettings,
    args: { provider: 'mock' },
  });
  assert.equal(unsupported.ok, false);
  assert.match(unsupported.error, /Unsupported Xenesis provider: mock/);

  for (const key of ['apiKey', 'secret', 'token']) {
    const result = buildXenesisProviderProfileDraftApplySettings({
      current: currentSettings,
      args: { provider: 'auto', [key]: 'raw-secret-value' },
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /Raw provider secrets are not accepted/);
  }
});
