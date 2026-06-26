import { measureTerminalCellWidth } from "./inputBuffer.js";
import type { TuiCommandOutputView } from "./viewModel.js";
import type { TuiState } from "./state.js";

export type TuiScrollbackTone =
  | "normal"
  | "user"
  | "assistant"
  | "tool"
  | "notice"
  | "warning"
  | "error"
  | "muted";

export interface TuiScrollbackRow {
  text: string;
  tone: TuiScrollbackTone;
  bold?: boolean;
}

export interface TuiScrollbackWindow {
  rows: TuiScrollbackRow[];
  offset: number;
  range: string;
}

/**
 * Wrap a single logical line into display-width-bounded segments, counting CJK
 * and other wide characters as width 2 (via measureTerminalCellWidth). A single
 * wide character that exceeds the available width still emits on its own row so
 * the wrapper never loops forever on a 1-cell viewport.
 */
export function wrapTerminalLine(value: string, width: number): string[] {
  const limit = Math.max(1, width);
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;
  for (const char of value) {
    const charWidth = measureTerminalCellWidth(char);
    if (current && currentWidth + charWidth > limit) {
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

function appendWrappedRows(
  rows: TuiScrollbackRow[],
  value: string,
  width: number,
  tone: TuiScrollbackTone,
  bold = false
) {
  for (const line of value.split(/\r?\n/)) {
    for (const wrapped of wrapTerminalLine(line, width)) {
      rows.push({ text: wrapped, tone, bold });
    }
  }
}

/**
 * Build the unified scrollback row list from the current TUI state: visible
 * messages, the streaming assistant draft, tool activity, command output,
 * notices, and any pending approval. Each logical entry is CJK-aware wrapped to
 * the available text width so long lines never clip into the footer.
 */
export function createScrollbackRows(
  state: TuiState,
  commandOutput: TuiCommandOutputView | undefined,
  width: number
): TuiScrollbackRow[] {
  const rows: TuiScrollbackRow[] = [];
  for (const message of state.messages) {
    appendWrappedRows(rows, `${message.role}> ${message.content}`, width, message.role);
  }
  if (state.assistantDraft) {
    appendWrappedRows(rows, `assistant> ${state.assistantDraft}`, width, "assistant");
  }
  for (const tool of state.tools) {
    appendWrappedRows(
      rows,
      `tool> ${tool.name} ${tool.status}${tool.summary ? ` - ${tool.summary}` : ""}`,
      width,
      tool.status === "failed" ? "error" : "tool"
    );
  }
  if (commandOutput) {
    appendWrappedRows(rows, `output> ${commandOutput.command} (${commandOutput.range})`, width, "tool", true);
    if (commandOutput.lines.length === 0) {
      appendWrappedRows(rows, "output> No output.", width, "muted");
    } else {
      for (const line of commandOutput.lines) {
        appendWrappedRows(rows, `output> ${line}`, width, commandOutput.kind === "error" ? "error" : "normal");
      }
    }
    if (commandOutput.savedPath) {
      appendWrappedRows(rows, `output> saved ${commandOutput.savedPath}`, width, "muted");
    }
  }
  for (const notice of state.notices) {
    appendWrappedRows(
      rows,
      `notice> ${notice.message}`,
      width,
      notice.kind === "error" ? "error" : notice.kind === "warning" ? "warning" : "notice"
    );
  }
  if (state.pendingApproval) {
    appendWrappedRows(
      rows,
      `approval> ${state.pendingApproval.name} (${state.pendingApproval.riskLevel})`,
      width,
      "warning",
      true
    );
    appendWrappedRows(rows, `approval> ${state.pendingApproval.summary}`, width, "warning");
    appendWrappedRows(rows, `approval> ${state.pendingApproval.reason}`, width, "muted");
    if (state.pendingApproval.preview) {
      appendWrappedRows(rows, `approval> ${state.pendingApproval.preview}`, width, "muted");
    }
    appendWrappedRows(rows, "approval> Press y to approve, n to deny.", width, "tool");
  }
  return rows.length > 0 ? rows : [{ text: "Type a prompt below.", tone: "muted" }];
}

/**
 * Slice the scrollback rows to a visible window. offset 0 is the live tail
 * (latest rows). Increasing the offset scrolls back through history. The range
 * label is 1-based "start-end/total".
 */
export function createScrollbackWindow(
  rows: TuiScrollbackRow[],
  visibleLimit: number,
  requestedOffset: number
): TuiScrollbackWindow {
  const totalRows = rows.length;
  const limit = Math.max(1, visibleLimit);
  if (totalRows === 0) {
    return { rows: [], offset: 0, range: "0/0" };
  }
  const maxOffset = Math.max(0, totalRows - limit);
  const offset = clampNumber(requestedOffset, 0, maxOffset);
  const start = Math.max(0, totalRows - limit - offset);
  const end = Math.min(totalRows, start + limit);
  return {
    rows: rows.slice(start, end),
    offset,
    range: `${start + 1}-${end}/${totalRows}`
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
