import assert from 'node:assert/strict';
import test from 'node:test';

import { shortTerminalId, terminalIdentityTitle } from './terminalIdentity';

test('shortTerminalId returns a stable prefix for long terminal ids', () => {
  assert.equal(shortTerminalId('b47cedc8-9a6c-4774-bb55-bd4c0ea5d196'), 'b47cedc8');
});

test('shortTerminalId trims missing terminal ids to an empty string', () => {
  assert.equal(shortTerminalId('   '), '');
});

test('terminalIdentityTitle includes the full termId for hover inspection', () => {
  assert.equal(
    terminalIdentityTitle('mongna', 'b47cedc8-9a6c-4774-bb55-bd4c0ea5d196'),
    'mongna\ntermId: b47cedc8-9a6c-4774-bb55-bd4c0ea5d196',
  );
});
