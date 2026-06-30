import assert from 'node:assert/strict';
import test from 'node:test';
import { createTextSelectionState, replaceTextSelection, textSelectionHasSelection } from './nativeTextAdapter';

test('textSelectionHasSelection detects selected ranges', () => {
  assert.equal(textSelectionHasSelection({ value: 'abc', selectionStart: 0, selectionEnd: 0 }), false);
  assert.equal(textSelectionHasSelection({ value: 'abc', selectionStart: 0, selectionEnd: 2 }), true);
});

test('replaceTextSelection inserts text and returns the next caret range', () => {
  assert.deepEqual(replaceTextSelection({ value: 'abc', selectionStart: 1, selectionEnd: 2 }, 'X'), {
    value: 'aXc',
    selectionStart: 2,
    selectionEnd: 2,
  });
});

test('createTextSelectionState enables edit commands from text state', () => {
  assert.deepEqual(
    createTextSelectionState({
      value: 'abc',
      selectionStart: 1,
      selectionEnd: 2,
      readOnly: false,
      disabled: false,
      canSave: true,
    }),
    {
      undo: true,
      redo: true,
      cut: true,
      copy: true,
      paste: true,
      selectAll: true,
      save: true,
    },
  );

  assert.deepEqual(
    createTextSelectionState({
      value: 'abc',
      selectionStart: 0,
      selectionEnd: 0,
      readOnly: true,
      disabled: false,
      canSave: false,
    }),
    {
      undo: false,
      redo: false,
      cut: false,
      copy: false,
      paste: false,
      selectAll: true,
      save: false,
    },
  );
});
