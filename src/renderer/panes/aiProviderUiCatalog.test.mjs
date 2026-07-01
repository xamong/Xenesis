import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const settingsPane = readFileSync(new URL('./SettingsPane.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('SettingsPane BYOK provider controls use API provider order only', () => {
  assert.match(settingsPane, /AI_PROVIDER_API_ORDER/);
  assert.match(settingsPane, /coerceApiAiProviderKind/);
  assert.match(settingsPane, /AI_PROVIDER_API_ORDER\.map\(\(provider\) =>/);
  assert.doesNotMatch(settingsPane, /PROVIDER_ORDER\.map\(\(provider\) =>/);
});

test('compact App settings provider select uses API provider order only', () => {
  assert.match(app, /AI_PROVIDER_API_ORDER/);
  assert.match(app, /coerceApiAiProviderKind/);
  assert.match(app, /AI_PROVIDER_API_ORDER\.map\(\(p\) =>/);
  assert.doesNotMatch(app, /Object\.keys\(AI_PROVIDERS\) as AiProviderKind\[\]/);
});
