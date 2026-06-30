import { createScrollbackRows, createScrollbackWindow, type TuiScrollbackRow } from './scrollback.js';
import { getTuiSlashCommandSuggestions, type TuiSlashCommandSuggestion } from './slashCommandSuggestions.js';
import type { TuiApprovalRequest, TuiCommandOutput, TuiNotice, TuiState, TuiToolActivity } from './state.js';

export type { TuiScrollbackRow } from './scrollback.js';

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

export interface TuiApprovalView {
  name: string;
  riskLevel: TuiApprovalRequest['riskLevel'];
  summary: string;
  reason: string;
  preview?: string;
  help: string;
}

export interface TuiViewModel {
  title: string;
  statusItems: string[];
  transcriptRows: TuiTranscriptRow[];
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
  options: { inputValue?: string; scrollbackOffset?: number } = {},
): TuiViewModel {
  const maxTranscriptRows = Math.max(2, Math.min(12, viewport.height - 10));
  const transcriptRows = [
    ...state.messages.map(
      (message): TuiTranscriptRow => ({
        role: message.role,
        content: message.content,
      }),
    ),
    ...(state.assistantDraft ? [{ role: 'assistant' as const, content: state.assistantDraft }] : []),
  ].slice(-maxTranscriptRows);
  const sessionStatusItems = [
    `session ${state.sessionContext.activeSessionId ?? 'none'}`,
    `context ${state.sessionContext.historyMessageCount}`,
    ...(state.sessionContext.lastSessionId ? [`latest ${state.sessionContext.lastSessionId}`] : []),
    ...(state.sessionContext.resumedFromSessionId ? [`resumed ${state.sessionContext.resumedFromSessionId}`] : []),
  ];
  const commandOutput = state.commandOutput ? createCommandOutputView(state.commandOutput, viewport) : undefined;
  const maxScrollbackRows = Math.max(1, viewport.height - 10);
  const scrollbackTextWidth = Math.max(1, viewport.width - 4);
  const allScrollbackRows = createScrollbackRows(state, commandOutput, scrollbackTextWidth);
  const scrollbackWindow = createScrollbackWindow(allScrollbackRows, maxScrollbackRows, options.scrollbackOffset ?? 0);

  return {
    title: 'Xenesis TUI',
    statusItems: [
      `provider ${state.runtime.provider}`,
      `model ${state.runtime.model}`,
      `approval ${state.runtime.approvalMode}`,
      `status ${state.status}`,
      `turns ${state.turns}`,
      ...sessionStatusItems,
    ],
    transcriptRows,
    toolRows: state.tools.slice(-6).map((tool) => ({
      name: tool.name,
      status: tool.status,
      detail: tool.summary ?? '',
    })),
    commandOutput,
    noticeRows: state.notices.slice(-4),
    suggestionRows: getTuiSlashCommandSuggestions(options.inputValue ?? '', 5, state.suggestionContext),
    approval: state.pendingApproval
      ? {
          name: state.pendingApproval.name,
          riskLevel: state.pendingApproval.riskLevel,
          summary: state.pendingApproval.summary,
          reason: state.pendingApproval.reason,
          preview: state.pendingApproval.preview,
          help: 'Press y to approve, n to deny.',
        }
      : undefined,
    footer:
      '/help /commands /status /provider /workspace /tools /memory /skills /plugins /sessions /compact /output /plan /work /resume /exit',
    maxTranscriptRows,
    scrollbackRows: scrollbackWindow.rows,
    scrollbackRange: scrollbackWindow.range,
    scrollbackOffset: scrollbackWindow.offset,
    totalScrollbackRows: allScrollbackRows.length,
    maxScrollbackRows,
  };
}

function createCommandOutputView(output: TuiCommandOutput, viewport: TuiViewport): TuiCommandOutputView {
  const totalLines = output.lines.length;
  const visibleLimit = output.expanded
    ? Math.max(4, Math.min(20, viewport.height - 10))
    : Math.max(2, Math.min(6, Math.floor((viewport.height - 8) / 2)));
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
