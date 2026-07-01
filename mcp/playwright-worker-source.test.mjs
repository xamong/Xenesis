import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./playwright-worker.mjs', import.meta.url), 'utf8');

test('playwright worker reports the final page URL and title after actions', () => {
  assert.match(source, /finalUrl:\s*page\.url\(\)/);
  assert.match(source, /title:\s*await page\.title\(\)/);
});
