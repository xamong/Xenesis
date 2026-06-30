import { measureTerminalCellWidth } from './inputBuffer.js';
import type { TuiCommandOutput, TuiNotice, TuiState, TuiToolActivity } from './state.js';

export interface TuiScrollbackRow {
  text: string;
  tone: 'normal' | 'user' | 'assistant' | 'tool' | 'notice' | 'warning' | 'error' | 'muted';
  bold?: boolean;
}

interface TuiCommandOutputRows {
  command: string;
  kind: TuiCommandOutput['kind'];
  lines: string[];
}

export function wrapTerminalLine(value: string, width: number): string[] {
  const limit = Math.max(1, width);
  const rows: string[] = [];
  let current = '';
  let currentWidth = 0;

  for (const char of value) {
    const charWidth = measureTerminalCellWidth(char);
    if (current && currentWidth + charWidth > limit) {
      rows.push(current);
      current = '';
      currentWidth = 0;
    }
    current += char;
    currentWidth += charWidth;
  }

  rows.push(current);
  return rows;
}

function appendWrappedRows(
  rows: TuiScrollbackRow[],
  prefix: string,
  text: string,
  tone: TuiScrollbackRow['tone'],
  width: number,
  bold = false,
) {
  const wrapped = wrapTerminalLine(`${prefix}${text}`, width);
  for (const row of wrapped) rows.push({ text: row, tone, ...(bold ? { bold } : {}) });
}

function toolTone(tool: TuiToolActivity): TuiScrollbackRow['tone'] {
  if (tool.status === 'failed') return 'error';
  if (tool.status === 'completed') return 'tool';
  return 'warning';
}

function noticeTone(notice: TuiNotice): TuiScrollbackRow['tone'] {
  if (notice.kind === 'error') return 'error';
  if (notice.kind === 'warning') return 'warning';
  return 'notice';
}

function outputTone(output: TuiCommandOutputRows): TuiScrollbackRow['tone'] {
  if (output.kind === 'error') return 'error';
  return 'muted';
}

export function createScrollbackRows(
  state: TuiState,
  commandOutput?: TuiCommandOutputRows,
  width = 80,
): TuiScrollbackRow[] {
  const rows: TuiScrollbackRow[] = [];
  for (const message of state.messages) {
    appendWrappedRows(rows, `${message.role}> `, message.content, message.role, width);
  }
  for (const tool of state.tools) {
    appendWrappedRows(
      rows,
      'tool> ',
      `${tool.name}: ${tool.status}${tool.summary ? ` - ${tool.summary}` : ''}`,
      toolTone(tool),
      width,
    );
  }
  const output = commandOutput ?? state.commandOutput;
  if (output) {
    appendWrappedRows(rows, 'output> ', output.command, outputTone(output), width, true);
    for (const line of output.lines) appendWrappedRows(rows, 'output> ', line, outputTone(output), width);
  }
  for (const notice of state.notices) {
    appendWrappedRows(rows, 'notice> ', notice.message, noticeTone(notice), width);
  }
  if (state.pendingApproval) {
    appendWrappedRows(rows, 'approval> ', `${state.pendingApproval.name}: ${state.pendingApproval.summary}`, 'warning', width, true);
    appendWrappedRows(rows, 'approval> ', 'Press y to approve, n to deny.', 'warning', width);
  }
  if (rows.length === 0) rows.push({ text: 'Type a prompt below.', tone: 'muted' });
  return rows;
}

export function createScrollbackWindow(rows: TuiScrollbackRow[], visibleLimit: number, requestedOffset: number) {
  const limit = Math.max(0, visibleLimit);
  if (rows.length === 0 || limit === 0) {
    return { rows: [] as TuiScrollbackRow[], offset: 0, range: '0/0' };
  }
  const maxOffset = Math.max(0, rows.length - limit);
  const offset = Math.max(0, Math.min(maxOffset, requestedOffset));
  const end = rows.length - offset;
  const start = Math.max(0, end - limit);
  return {
    rows: rows.slice(start, end),
    offset,
    range: `${start + 1}-${end}/${rows.length}`,
  };
}
