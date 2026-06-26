import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendCommandLineEnding,
  commandLineEndingSequence,
  formatCommandCenterTerminalLabel,
  syncCommandCenterSelectedTerminalIds,
} from './commandCenterModel';

test('commandLineEndingSequence maps visible control choices to terminal bytes', () => {
  assert.equal(commandLineEndingSequence('cr'), '\r');
  assert.equal(commandLineEndingSequence('lf'), '\n');
  assert.equal(commandLineEndingSequence('crlf'), '\r\n');
});

test('appendCommandLineEnding appends the selected control sequence without trimming command text', () => {
  assert.equal(appendCommandLineEnding('node -v', 'cr'), 'node -v\r');
  assert.equal(appendCommandLineEnding('node -v', 'lf'), 'node -v\n');
  assert.equal(appendCommandLineEnding('node -v', 'crlf'), 'node -v\r\n');
});

test('formatCommandCenterTerminalLabel prefers current folder and short terminal id', () => {
  assert.equal(
    formatCommandCenterTerminalLabel({
      id: '54aa0e8b-9a6c-4774-bb55-bd4c0ea5d196',
      label: 'pwsh',
      cwd: 'C:\\Projects\\xenesis-desk',
    }),
    'xenesis-desk 54aa0e8b',
  );
});

test('formatCommandCenterTerminalLabel falls back to the session label when cwd is missing', () => {
  assert.equal(
    formatCommandCenterTerminalLabel({
      id: '54aa0e8b-9a6c-4774-bb55-bd4c0ea5d196',
      label: 'pwsh',
    }),
    'pwsh 54aa0e8b',
  );
});

test('syncCommandCenterSelectedTerminalIds follows active terminal when the selection was tracking active', () => {
  assert.deepEqual(
    syncCommandCenterSelectedTerminalIds({
      targetMode: 'selected',
      selectedTerminalIds: ['old-active'],
      activeTermId: 'new-active',
      previousActiveTermId: 'old-active',
      availableTerminalIds: ['old-active', 'new-active'],
    }),
    ['new-active'],
  );
});

test('syncCommandCenterSelectedTerminalIds preserves an explicit manual selection', () => {
  assert.deepEqual(
    syncCommandCenterSelectedTerminalIds({
      targetMode: 'selected',
      selectedTerminalIds: ['manual-target'],
      activeTermId: 'new-active',
      previousActiveTermId: 'old-active',
      availableTerminalIds: ['manual-target', 'new-active'],
    }),
    ['manual-target'],
  );
});

test('syncCommandCenterSelectedTerminalIds removes stale terminal ids', () => {
  assert.deepEqual(
    syncCommandCenterSelectedTerminalIds({
      targetMode: 'selected',
      selectedTerminalIds: ['closed-terminal', 'live-terminal'],
      activeTermId: 'live-terminal',
      previousActiveTermId: 'closed-terminal',
      availableTerminalIds: ['live-terminal'],
    }),
    ['live-terminal'],
  );
});
