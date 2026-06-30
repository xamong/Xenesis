import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INPUT_ACTION_TYPES,
  looksDangerousInputHotkey,
  looksSecretShapedInputText,
  normalizeInputAction,
  normalizeInputRunRequest,
  normalizeInputTarget,
  normalizedPointToPixel,
  redactInputAuditValue,
  supportedInputActionsForTarget,
} from './inputControl';

test('input action list keeps the approved first-slice DSL names', () => {
  assert.deepEqual(INPUT_ACTION_TYPES, [
    'click',
    'double_click',
    'right_click',
    'move',
    'mouse_down',
    'mouse_up',
    'drag_and_drop',
    'type',
    'press_key',
    'key_down',
    'key_up',
    'hotkey',
    'scroll',
    'wait',
    'take_screenshot',
    'navigate',
    'go_back',
    'go_forward',
  ]);
});

test('normalizes registered app targets and rejects unregistered path targets', () => {
  assert.deepEqual(normalizeInputTarget({ kind: 'app', appId: ' notepad ' }), {
    kind: 'app',
    appId: 'notepad',
  });

  assert.throws(
    () => normalizeInputTarget({ kind: 'app', path: 'C:\\Tools\\tool.exe' }),
    /appId is required for app input targets/i,
  );
});

test('validates normalized coordinates as integers in 0..999', () => {
  assert.deepEqual(normalizeInputAction({ type: 'click', x: 0, y: 999 }), {
    type: 'click',
    x: 0,
    y: 999,
  });

  assert.throws(() => normalizeInputAction({ type: 'click', x: -1, y: 10 }), /x must be an integer from 0 to 999/i);
  assert.throws(() => normalizeInputAction({ type: 'click', x: 12.5, y: 10 }), /x must be an integer from 0 to 999/i);
  assert.throws(() => normalizeInputAction({ type: 'click', x: 10 }), /y is required for click/i);
});

test('normalizes type, hotkey, wait, and run request fields', () => {
  assert.deepEqual(normalizeInputAction({ type: 'type', text: 'hello', pressEnter: true, intent: 'write' }), {
    type: 'type',
    text: 'hello',
    pressEnter: true,
    intent: 'write',
  });

  assert.deepEqual(normalizeInputAction({ type: 'hotkey', keys: 'CTRL+A' }), {
    type: 'hotkey',
    keys: ['CTRL', 'A'],
  });

  assert.deepEqual(normalizeInputAction({ type: 'wait', seconds: 2 }), {
    type: 'wait',
    seconds: 2,
  });

  assert.deepEqual(
    normalizeInputRunRequest({
      environment: 'desktop',
      target: { kind: 'app', appId: 'notepad' },
      actions: [{ type: 'wait', seconds: 1 }],
      continueOnError: true,
    }),
    {
      environment: 'desktop',
      target: { kind: 'app', appId: 'notepad' },
      actions: [{ type: 'wait', seconds: 1 }],
      continueOnError: true,
    },
  );
});

test('converts normalized coordinates to target-local pixels', () => {
  assert.deepEqual(normalizedPointToPixel({ x: 0, y: 0 }, { x: 10, y: 20, width: 1000, height: 500 }), {
    x: 10,
    y: 20,
  });
  assert.deepEqual(normalizedPointToPixel({ x: 999, y: 999 }, { x: 10, y: 20, width: 1000, height: 500 }), {
    x: 1009,
    y: 519,
  });
  assert.deepEqual(normalizedPointToPixel({ x: 500, y: 500 }, { width: 100, height: 100 }), {
    x: 50,
    y: 50,
  });
});

test('classifies first-slice target action support', () => {
  assert.deepEqual(supportedInputActionsForTarget('desktop', { kind: 'app', appId: 'notepad' }), [
    'type',
    'hotkey',
    'wait',
  ]);
  assert.deepEqual(supportedInputActionsForTarget('browser', { kind: 'browser' }), []);
  assert.deepEqual(supportedInputActionsForTarget('desktop', { kind: 'desktop' }), []);
});

test('detects secret-shaped text and dangerous hotkeys', () => {
  assert.equal(looksSecretShapedInputText('OPENAI_API_KEY=sk-secret'), true);
  assert.equal(looksSecretShapedInputText('plain text'), false);
  assert.equal(looksDangerousInputHotkey(['Win', 'L']), true);
  assert.equal(looksDangerousInputHotkey(['Ctrl', 'Alt', 'Delete']), true);
  assert.equal(looksDangerousInputHotkey(['CTRL', 'A']), false);
});

test('redacts input text, value, and keys in audit payloads', () => {
  assert.deepEqual(
    redactInputAuditValue({
      environment: 'desktop',
      target: { kind: 'app', appId: 'notepad' },
      actions: [
        { type: 'type', text: 'secret' },
        { type: 'hotkey', keys: ['CTRL', 'S'] },
      ],
      nested: { value: 'hidden' },
    }),
    {
      environment: 'desktop',
      target: { kind: 'app', appId: 'notepad' },
      actions: [
        { type: 'type', text: '[redacted: input-control audit]' },
        { type: 'hotkey', keys: '[redacted: input-control audit]' },
      ],
      nested: { value: '[redacted: input-control audit]' },
    },
  );
});
