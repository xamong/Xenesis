import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAppMenuIcon } from './menuIcons';

test('resolveAppMenuIcon maps semantic menu icon keys and preserves extension fallbacks', () => {
  assert.equal(resolveAppMenuIcon('xenesis'), '◇');
  assert.equal(resolveAppMenuIcon('extension'), '⊞');
  assert.equal(resolveAppMenuIcon('vault'), '▤');
  assert.equal(resolveAppMenuIcon('developer'), '⌘');
  assert.equal(resolveAppMenuIcon('custom-plugin-icon'), 'custom-plugin-icon');
  assert.equal(resolveAppMenuIcon(undefined, '›'), '›');
});
