import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AI_PROVIDER_API_ORDER,
  AI_PROVIDER_KINDS,
  AI_PROVIDERS,
  coerceApiAiProviderKind,
  isApiAiProviderKind,
} from './aiProviderCatalog';

test('BYOK API provider order excludes runtime-only CLI providers', () => {
  assert.deepEqual(AI_PROVIDER_API_ORDER, [
    'openai',
    'anthropic',
    'gemini',
    'openrouter',
    'azure',
    'groq',
    'deepseek',
    'qwen',
    'mistral',
    'xai',
    'ollama',
    'lmstudio',
    'together',
    'fireworks',
  ]);

  for (const provider of ['auto', 'codex-cli', 'codex-app-server', 'claude-cli', 'claude-interactive'] as const) {
    assert.equal(isApiAiProviderKind(provider), false);
  }

  assert.equal(coerceApiAiProviderKind('auto'), 'openai');
  assert.equal(coerceApiAiProviderKind('codex-cli'), 'openai');
  assert.equal(coerceApiAiProviderKind('deepseek'), 'deepseek');
});

test('provider catalog contains every provider kind and refreshed model defaults', () => {
  assert.equal(AI_PROVIDER_KINDS.length, Object.keys(AI_PROVIDERS).length);
  assert.equal(AI_PROVIDERS.openai.defaultModel, 'gpt-5.5');
  assert.deepEqual(AI_PROVIDERS.deepseek.models, ['deepseek-v4-flash', 'deepseek-v4-pro']);
  assert.ok(AI_PROVIDERS.anthropic.models.includes('claude-sonnet-5'));
  assert.ok(AI_PROVIDERS.gemini.models.includes('gemini-3.5-flash'));
  assert.ok(AI_PROVIDERS.qwen.models.includes('qwen3.7-plus'));
  assert.ok(AI_PROVIDERS.xai.models.includes('grok-4.3'));
  assert.ok(AI_PROVIDERS.together.models.includes('deepseek-ai/DeepSeek-V4-Pro'));
  assert.ok(AI_PROVIDERS.fireworks.models.includes('accounts/fireworks/models/deepseek-v4-pro'));
  assert.equal(AI_PROVIDERS.openai.models.includes('gpt-3.5-turbo'), false);
  assert.equal(AI_PROVIDERS.deepseek.models.includes('deepseek-chat'), false);
});
