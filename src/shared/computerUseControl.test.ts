import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createComputerUseState,
  normalizeComputerUseAction,
  recordComputerUseAction,
  shouldBlockComputerUseText,
} from './computerUseControl';

test('computer use blocks secret-shaped typing', () => {
  assert.equal(shouldBlockComputerUseText('OPENAI_API_KEY=sk-test123'), true);
  assert.equal(shouldBlockComputerUseText('Bearer abcdefghijk'), true);
  assert.equal(shouldBlockComputerUseText('hello world'), false);
});

test('computer use stop state blocks later actions', () => {
  const state = createComputerUseState();

  recordComputerUseAction(state, normalizeComputerUseAction({ action: 'stop' }));
  const blocked = recordComputerUseAction(state, normalizeComputerUseAction({ action: 'type', text: 'hello' }));

  assert.equal(blocked.result, 'denied');
  assert.equal(blocked.policy.reason, 'Computer use is stopped.');
});
