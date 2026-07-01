import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mainSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const sharedCatalogSource = readFileSync(new URL('../shared/aiProviderCatalog.ts', import.meta.url), 'utf8');

test('main provider validation uses the shared AI provider catalog', () => {
  assert.match(mainSource, /AI_PROVIDER_KINDS as SHARED_AI_PROVIDER_KINDS/);
  assert.match(mainSource, /new Set<AiProviderKind>\(SHARED_AI_PROVIDER_KINDS\)/);
  assert.doesNotMatch(mainSource, /const AI_PROVIDER_KINDS = new Set<AiProviderKind>\(\[\s*'auto'/);
});

test('shared AI provider catalog includes API providers that main previously omitted', () => {
  assert.match(sharedCatalogSource, /openrouter/);
  assert.match(sharedCatalogSource, /mistral/);
  assert.match(sharedCatalogSource, /xai/);
});
