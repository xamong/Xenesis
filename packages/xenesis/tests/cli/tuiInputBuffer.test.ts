import { describe, expect, test } from 'vitest';
import {
  commitTuiInputHistory,
  createTuiInputBuffer,
  getTuiInputCursorCellOffset,
  reduceTuiInputBuffer,
  renderTuiInputValue,
} from '../../src/cli/tui/inputBuffer.js';

describe('TUI input buffer', () => {
  test('edits text at the cursor and handles Korean characters safely', () => {
    let buffer = createTuiInputBuffer();

    buffer = reduceTuiInputBuffer(buffer, { type: 'insert', value: '안녕' });
    expect(getTuiInputCursorCellOffset(buffer)).toBe(4);
    buffer = reduceTuiInputBuffer(buffer, { type: 'moveLeft' });
    expect(getTuiInputCursorCellOffset(buffer)).toBe(2);
    buffer = reduceTuiInputBuffer(buffer, { type: 'insert', value: '하' });
    expect(getTuiInputCursorCellOffset(buffer)).toBe(4);
    expect(renderTuiInputValue(buffer)).toBe('안하녕');

    buffer = reduceTuiInputBuffer(buffer, { type: 'backspace' });
    expect(renderTuiInputValue(buffer)).toBe('안녕');

    buffer = reduceTuiInputBuffer(buffer, { type: 'moveHome' });
    buffer = reduceTuiInputBuffer(buffer, { type: 'delete' });
    expect(renderTuiInputValue(buffer)).toBe('녕');
  });

  test('submits, clears, and navigates history', () => {
    let buffer = createTuiInputBuffer();
    buffer = reduceTuiInputBuffer(buffer, { type: 'insert', value: 'first' });
    const first = reduceTuiInputBuffer(buffer, { type: 'submit' });
    expect(first.submitted).toBe('first');
    buffer = commitTuiInputHistory(first, first.submitted!);

    buffer = reduceTuiInputBuffer(buffer, { type: 'insert', value: 'second' });
    const second = reduceTuiInputBuffer(buffer, { type: 'submit' });
    expect(second.submitted).toBe('second');
    buffer = commitTuiInputHistory(second, second.submitted!);

    buffer = reduceTuiInputBuffer(buffer, { type: 'historyPrevious' });
    expect(renderTuiInputValue(buffer)).toBe('second');
    buffer = reduceTuiInputBuffer(buffer, { type: 'historyPrevious' });
    expect(renderTuiInputValue(buffer)).toBe('first');
    buffer = reduceTuiInputBuffer(buffer, { type: 'historyNext' });
    expect(renderTuiInputValue(buffer)).toBe('second');
    buffer = reduceTuiInputBuffer(buffer, { type: 'historyNext' });
    expect(renderTuiInputValue(buffer)).toBe('');
  });

  test('replaces the current input when completing a slash command suggestion', () => {
    let buffer = createTuiInputBuffer();
    buffer = reduceTuiInputBuffer(buffer, { type: 'insert', value: '/a' });
    buffer = reduceTuiInputBuffer(buffer, { type: 'replaceValue', value: '/approval ' });

    expect(renderTuiInputValue(buffer)).toBe('/approval ');
    expect(buffer.cursor).toBe('/approval '.length);
  });
});
