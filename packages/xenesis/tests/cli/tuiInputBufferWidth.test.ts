import { describe, expect, it } from 'vitest';
import {
  createTuiInputBuffer,
  getTuiInputCursorCellOffset,
  measureTerminalCellWidth,
  reduceTuiInputBuffer,
} from '../../src/cli/tui/inputBuffer.js';

describe('measureTerminalCellWidth', () => {
  it('counts ASCII as width one', () => {
    expect(measureTerminalCellWidth('hello')).toBe(5);
  });

  it('counts CJK characters as width two', () => {
    expect(measureTerminalCellWidth('안녕')).toBe(4);
    expect(measureTerminalCellWidth('가')).toBe(2);
    expect(measureTerminalCellWidth('漢字')).toBe(4);
  });

  it('counts combining marks as width zero', () => {
    // 'e' + combining acute accent (U+0301) renders in a single cell.
    expect(measureTerminalCellWidth('é')).toBe(1);
  });

  it('handles mixed ASCII and CJK', () => {
    expect(measureTerminalCellWidth('a안b')).toBe(4);
  });
});

describe('getTuiInputCursorCellOffset', () => {
  it('tracks the display-cell cursor position across CJK edits', () => {
    let buffer = createTuiInputBuffer();
    buffer = reduceTuiInputBuffer(buffer, { type: 'insert', value: '안녕' });
    expect(getTuiInputCursorCellOffset(buffer)).toBe(4);
    buffer = reduceTuiInputBuffer(buffer, { type: 'moveLeft' });
    expect(getTuiInputCursorCellOffset(buffer)).toBe(2);
    buffer = reduceTuiInputBuffer(buffer, { type: 'moveHome' });
    expect(getTuiInputCursorCellOffset(buffer)).toBe(0);
  });
});
