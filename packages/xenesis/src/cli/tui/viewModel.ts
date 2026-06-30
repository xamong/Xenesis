import { getTuiCommandFooter, renderTuiSuggestionDetailLines } from './commandCatalog.js';
import { measureTerminalCellWidth } from './inputBuffer.js';
import { getTuiSlashCommandSuggestions, type TuiSlashCommandSuggestion } from './slashCommandSuggestions.js';
import type { TuiApprovalRequest, TuiCommandOutput, TuiNotice, TuiState, TuiToolActivity } from './state.js';

export interface TuiViewport {
  width: number;
  height: number;
}

export interface TuiTranscriptRow {
  role: 'user' | 'assistant';
  content: string;
}

export interface TuiToolRow {
  name: string;
  status: TuiToolActivity['status'];
  detail: string;
}

export interface TuiCommandOutputView {
  command: string;
  kind: TuiCommandOutput['kind'];
  lines: string[];
  totalLines: number;
  offset: number;
  endOffset: number;
  expanded: boolean;
  range: string;
  savedPath?: string;
}

export interface TuiScrollbackRow {
  text: string;
  tone: 'normal' | 'user' | 'assistant' | 'tool' | 'notice' | 'warning' | 'error' | 'muted';
  bold?: boolean;
}

export interface TuiApprovalView {
  name: string;
  riskLevel: TuiApprovalRequest['riskLevel'];
  summary: string;
  reason: string;
  preview?: string;
  help: string;
  restored?: boolean;
}

export interface TuiHeaderRow {
  label: 'runtime' | 'state' | 'session';
  items: string[];
  tone: 'normal' | 'active' | 'warning' | 'error' | 'muted';
}

export interface TuiViewModel {
  title: string;
  statusItems: string[];
  headerRows: TuiHeaderRow[];
  transcriptRows: TuiTranscriptRow[];
  transcriptRange: string;
  transcriptOffset: number;
  totalTranscriptRows: number;
  toolRows: TuiToolRow[];
  commandOutput?: TuiCommandOutputView;
  noticeRows: TuiNotice[];
  suggestionRows: TuiSlashCommandSuggestion[];
  approval?: TuiApprovalView;
  footer: string;
  maxTranscriptRows: number;
  scrollbackRows: TuiScrollbackRow[];
  scrollbackRange: string;
  scrollbackOffset: number;
  totalScrollbackRows: number;
  maxScrollbackRows: number;
}

export function createTuiViewModel(
  state: TuiState,
  viewport: TuiViewport,
  options: { inputValue?: string; transcriptOffset?: number; scrollbackOffset?: number } = {},
): TuiViewModel {
  const footer = getTuiCommandFooter();
  const suggestionRows = getTuiSlashCommandSuggestions(options.inputValue ?? '', 5, state.suggestionContext);
  const layout = createTuiLayoutMetrics(viewport, footer, suggestionRows);
  const maxTranscriptRows = Math.max(1, Math.min(10, layout.maxTranscriptRows));
  const allTranscriptRows = [
    ...state.messages.map(
      (message): TuiTranscriptRow => ({
        role: message.role,
        content: message.content,
      }),
    ),
    ...(state.assistantDraft ? [{ role: 'assistant' as const, content: state.assistantDraft }] : []),
  ];
  const transcriptWindow = createTranscriptWindow(allTranscriptRows, maxTranscriptRows, options.transcriptOffset ?? 0);
  const commandOutput = state.commandOutput ? createCommandOutputView(state.commandOutput, layout) : undefined;
  const allScrollbackRows = createScrollbackRows(state, commandOutput, layout.scrollbackTextWidth);
  const scrollbackWindow = createScrollbackWindow(
    allScrollbackRows,
    layout.maxScrollbackRows,
    options.scrollbackOffset ?? options.transcriptOffset ?? 0,
  );
  const sessionStatusItems = [
    `session ${state.sessionContext.activeSessionId ?? 'none'}`,
    `context ${state.sessionContext.historyMessageCount}`,
    ...(state.sessionContext.lastSessionId ? [`latest ${state.sessionContext.lastSessionId}`] : []),
    ...(state.sessionContext.resumedFromSessionId ? [`resumed ${state.sessionContext.resumedFromSessionId}`] : []),
  ];
  const runtimeStatusItems = [
    `provider ${state.runtime.provider}`,
    `model ${state.runtime.model}`,
    `approval ${state.runtime.approvalMode}`,
    ...(state.runtime.deskBridgeStatus ? [`bridge ${state.runtime.deskBridgeStatus}`] : []),
  ];
  const runStatusItems = [state.status, `turns ${state.turns}`];

  return {
    title: 'Xenesis TUI',
    statusItems: [...runtimeStatusItems, `status ${state.status}`, `turns ${state.turns}`, ...sessionStatusItems],
    headerRows: [
      {
        label: 'runtime',
        items: runtimeStatusItems,
        tone: 'normal',
      },
      {
        label: 'state',
        items: runStatusItems,
        tone: getRunStatusTone(state.status),
      },
      {
        label: 'session',
        items: sessionStatusItems,
        tone: 'muted',
      },
    ],
    transcriptRows: transcriptWindow.rows,
    transcriptRange: transcriptWindow.range,
    transcriptOffset: transcriptWindow.offset,
    totalTranscriptRows: allTranscriptRows.length,
    toolRows: state.tools.slice(-6).map((tool) => ({
      name: tool.name,
      status: tool.status,
      detail: tool.summary ?? '',
    })),
    commandOutput,
    noticeRows: state.notices.slice(-4),
    suggestionRows,
    approval: state.pendingApproval
      ? {
          name: state.pendingApproval.name,
          riskLevel: state.pendingApproval.riskLevel,
          summary: state.pendingApproval.summary,
          reason: state.pendingApproval.reason,
          preview: state.pendingApproval.preview,
          help: approvalHelp(state.pendingApproval),
          restored: state.pendingApproval.restored,
        }
      : undefined,
    footer,
    maxTranscriptRows,
    scrollbackRows: scrollbackWindow.rows,
    scrollbackRange: scrollbackWindow.range,
    scrollbackOffset: scrollbackWindow.offset,
    totalScrollbackRows: allScrollbackRows.length,
    maxScrollbackRows: layout.maxScrollbackRows,
  };
}

interface TuiLayoutMetrics {
  maxTranscriptRows: number;
  maxScrollbackRows: number;
  scrollbackTextWidth: number;
  compactOutputRows: number;
  expandedOutputRows: number;
}

function createTuiLayoutMetrics(
  viewport: TuiViewport,
  footer: string,
  suggestions: TuiSlashCommandSuggestion[],
): TuiLayoutMetrics {
  const headerRows = 6;
  const footerRows = estimateFooterRows(viewport.width, footer, suggestions);
  const transcriptChromeRows = 3;
  const scrollbackChromeRows = 3;
  const expandedOutputChromeRows = 4;
  const compactOutputAvailableRows = Math.floor((viewport.height - headerRows - footerRows - 2) / 2);

  return {
    maxTranscriptRows: viewport.height - headerRows - footerRows - transcriptChromeRows,
    maxScrollbackRows: Math.max(2, viewport.height - headerRows - footerRows - scrollbackChromeRows),
    scrollbackTextWidth: Math.max(1, viewport.width - 4),
    compactOutputRows: compactOutputAvailableRows,
    expandedOutputRows: viewport.height - headerRows - footerRows - expandedOutputChromeRows,
  };
}

function estimateFooterRows(width: number, footer: string, suggestions: TuiSlashCommandSuggestion[]) {
  const innerWidth = Math.max(1, width - 4);
  const commandRows = estimateWrappedRows(footer, innerWidth);
  const inputRows = 1;
  const borderRows = 2;
  const suggestionRows =
    suggestions.length === 0
      ? 0
      : 1 +
        Math.min(3, Math.max(0, ...suggestions.map((suggestion) => renderTuiSuggestionDetailLines(suggestion).length)));

  return borderRows + commandRows + suggestionRows + inputRows;
}

function estimateWrappedRows(value: string, width: number) {
  return Math.max(1, Math.ceil(measureTerminalCellWidth(value) / Math.max(1, width)));
}

function getRunStatusTone(status: TuiState['status']): TuiHeaderRow['tone'] {
  if (status === 'error' || status === 'incomplete') return 'error';
  if (status === 'awaiting_approval' || status === 'stopped') return 'warning';
  if (status === 'started' || status === 'provider_request' || status === 'tool_call' || status === 'tool_result')
    return 'active';
  return 'muted';
}

function createTranscriptWindow(rows: TuiTranscriptRow[], visibleLimit: number, requestedOffset: number) {
  const totalRows = rows.length;
  if (totalRows === 0) {
    return {
      rows: [],
      offset: 0,
      range: '0/0',
    };
  }
  const maxOffset = Math.max(0, totalRows - visibleLimit);
  const offset = clampNumber(requestedOffset, 0, maxOffset);
  const start = Math.max(0, totalRows - visibleLimit - offset);
  const end = Math.min(totalRows, start + visibleLimit);
  return {
    rows: rows.slice(start, end),
    offset,
    range: `${start + 1}-${end}/${totalRows}`,
  };
}

function createScrollbackRows(
  state: TuiState,
  commandOutput: TuiCommandOutputView | undefined,
  width: number,
): TuiScrollbackRow[] {
  const rows: TuiScrollbackRow[] = [];
  for (const message of state.messages) {
    appendWrappedRows(rows, `${message.role}> ${message.content}`, width, message.role);
  }
  if (state.assistantDraft) {
    appendWrappedRows(rows, `assistant> ${state.assistantDraft}`, width, 'assistant');
  }
  for (const tool of state.tools) {
    appendWrappedRows(
      rows,
      `tool> ${tool.name} ${tool.status}${tool.summary ? ` - ${tool.summary}` : ''}`,
      width,
      tool.status === 'failed' ? 'error' : 'tool',
    );
  }
  if (commandOutput) {
    appendWrappedRows(rows, `output> ${commandOutput.command} (${commandOutput.range})`, width, 'tool', true);
    if (commandOutput.lines.length === 0) {
      appendWrappedRows(rows, 'output> No output.', width, 'muted');
    } else {
      for (const line of commandOutput.lines) {
        appendWrappedRows(rows, `output> ${line}`, width, commandOutput.kind === 'error' ? 'error' : 'normal');
      }
    }
    if (commandOutput.savedPath) {
      appendWrappedRows(rows, `output> saved ${commandOutput.savedPath}`, width, 'muted');
    }
  }
  for (const notice of state.notices) {
    appendWrappedRows(
      rows,
      `notice> ${notice.message}`,
      width,
      notice.kind === 'error' ? 'error' : notice.kind === 'warning' ? 'warning' : 'notice',
    );
  }
  if (state.pendingApproval) {
    appendWrappedRows(
      rows,
      `approval> ${state.pendingApproval.name} (${state.pendingApproval.riskLevel})`,
      width,
      'warning',
      true,
    );
    appendWrappedRows(rows, `approval> ${state.pendingApproval.summary}`, width, 'warning');
    appendWrappedRows(rows, `approval> ${state.pendingApproval.reason}`, width, 'muted');
    if (state.pendingApproval.preview) {
      appendWrappedRows(rows, `approval> ${state.pendingApproval.preview}`, width, 'muted');
    }
    appendWrappedRows(rows, `approval> ${approvalHelp(state.pendingApproval)}`, width, 'tool');
  }
  return rows.length > 0 ? rows : [{ text: 'Type a prompt below.', tone: 'muted' }];
}

function approvalHelp(approval: TuiApprovalRequest) {
  if (approval.restored) {
    return 'Restored approval is not attached to a live run. Use /resume <sessionId> <prompt> to continue.';
  }
  return 'Press y to approve, n to deny.';
}

function appendWrappedRows(
  rows: TuiScrollbackRow[],
  value: string,
  width: number,
  tone: TuiScrollbackRow['tone'],
  bold = false,
) {
  for (const line of value.split(/\r?\n/)) {
    for (const wrapped of wrapTerminalLine(line, width)) {
      rows.push({ text: wrapped, tone, bold });
    }
  }
}

function wrapTerminalLine(value: string, width: number) {
  const lines: string[] = [];
  let current = '';
  let currentWidth = 0;
  for (const char of value) {
    const charWidth = measureTerminalCellWidth(char);
    if (current && currentWidth + charWidth > width) {
      lines.push(current);
      current = char;
      currentWidth = charWidth;
      continue;
    }
    current += char;
    currentWidth += charWidth;
  }
  lines.push(current);
  return lines;
}

function createScrollbackWindow(rows: TuiScrollbackRow[], visibleLimit: number, requestedOffset: number) {
  const totalRows = rows.length;
  if (totalRows === 0) {
    return {
      rows: [],
      offset: 0,
      range: '0/0',
    };
  }
  const maxOffset = Math.max(0, totalRows - visibleLimit);
  const offset = clampNumber(requestedOffset, 0, maxOffset);
  const start = Math.max(0, totalRows - visibleLimit - offset);
  const end = Math.min(totalRows, start + visibleLimit);
  return {
    rows: rows.slice(start, end),
    offset,
    range: `${start + 1}-${end}/${totalRows}`,
  };
}

function createCommandOutputView(output: TuiCommandOutput, layout: TuiLayoutMetrics): TuiCommandOutputView {
  const totalLines = output.lines.length;
  const visibleLimit = output.expanded
    ? Math.max(1, Math.min(20, layout.expandedOutputRows))
    : Math.max(1, Math.min(6, layout.compactOutputRows));
  const offset = Math.max(0, Math.min(output.offset, Math.max(0, totalLines - 1)));
  const endOffset = Math.min(totalLines, offset + visibleLimit);
  const lines = output.lines.slice(offset, endOffset);
  return {
    command: output.command,
    kind: output.kind,
    lines,
    totalLines,
    offset,
    endOffset,
    expanded: output.expanded,
    range: totalLines === 0 ? '0/0' : `${offset + 1}-${endOffset}/${totalLines}`,
    savedPath: output.savedPath,
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
