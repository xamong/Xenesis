import {
  Box,
  type RenderOptions,
  render,
  Text,
  useApp,
  useCursor,
  useInput,
  useStdin,
  useStdout,
  useWindowSize,
} from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import { renderTuiSuggestionDetailLines } from './commandCatalog.js';
import {
  commitTuiInputHistory,
  createTuiInputBuffer,
  getTuiInputCursorCellOffset,
  reduceTuiInputBuffer,
  renderTuiInputValue,
} from './inputBuffer.js';
import { completeTuiSlashCommandSuggestion } from './slashCommandSuggestions.js';
import type { TuiState } from './state.js';
import { createTuiViewModel, type TuiApprovalView, type TuiViewModel } from './viewModel.js';

export interface InkTuiController {
  getState(): TuiState;
  subscribe(listener: (state: TuiState) => void): () => void;
  submit(input: string): Promise<void> | void;
  cancel(): void;
  resolveApproval(approved: boolean): void;
  navigateCommandOutput?(action: 'pageUp' | 'pageDown' | 'top' | 'bottom', visibleLineCount: number): void;
}

export interface InkTuiAppProps {
  controller: InkTuiController;
  inputHistory?: string[];
}

export function createTuiAppElement(props: InkTuiAppProps) {
  return React.createElement(TuiApp, props);
}

export async function runInkTui(props: InkTuiAppProps, options: RenderOptions = {}) {
  const instance = render(createTuiAppElement(props), {
    ...options,
    alternateScreen: true,
    exitOnCtrlC: false,
    incrementalRendering: options.incrementalRendering ?? true,
    interactive: true,
  });
  await instance.waitUntilExit();
}

function TuiApp({ controller, inputHistory = [] }: InkTuiAppProps) {
  const app = useApp();
  const { setCursorPosition } = useCursor();
  const { stdin } = useStdin();
  const { stdout } = useStdout();
  const size = useWindowSize();
  const rows = getRenderableRows(size.rows || 24);
  const [state, setState] = useState(() => controller.getState());
  const [input, setInput] = useState(() => createTuiInputBuffer(inputHistory));
  const [busy, setBusy] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionsHidden, setSuggestionsHidden] = useState(false);
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const rawInput = renderTuiInputValue(input);
  const view = useMemo(
    () =>
      createTuiViewModel(
        state,
        {
          width: size.columns || 80,
          height: rows,
        },
        { inputValue: rawInput, transcriptOffset },
      ),
    [state, size.columns, rows, rawInput, transcriptOffset],
  );
  const visibleSuggestions = suggestionsHidden ? [] : view.suggestionRows;
  const selectedSuggestionIndex =
    visibleSuggestions.length === 0 ? 0 : Math.min(suggestionIndex, visibleSuggestions.length - 1);
  const selectedSuggestionDetails = renderTuiSuggestionDetailLines(visibleSuggestions[selectedSuggestionIndex]).slice(
    0,
    3,
  );
  const prompt = `${busy ? 'running' : 'tui'}> `;
  setCursorPosition({
    x: getFooterInputCursorColumn(prompt, input),
    y: getFooterInputCursorRow(rows),
  });

  useEffect(() => controller.subscribe(setState), [controller]);
  useEffect(() => {
    setSuggestionIndex(0);
    setSuggestionsHidden(false);
  }, [rawInput]);
  useEffect(() => {
    setSuggestionIndex((current) =>
      visibleSuggestions.length === 0 ? 0 : Math.min(current, visibleSuggestions.length - 1),
    );
  }, [visibleSuggestions.length]);
  useEffect(() => {
    setTranscriptOffset((current) => Math.min(current, getMaxScrollbackOffset(view)));
  }, [view.totalScrollbackRows, view.maxScrollbackRows]);
  useEffect(() => {
    stdout.write('\u001B[?1000h\u001B[?1006h');
    return () => {
      stdout.write('\u001B[?1000l\u001B[?1006l');
    };
  }, [stdout]);
  useEffect(() => {
    const onData = (chunk: Buffer | string) => {
      const wheelDirection = getMouseWheelDirection(String(chunk));
      if (wheelDirection === 'up') {
        setTranscriptOffset((current) => Math.min(getMaxScrollbackOffset(view), current + getScrollStep(view)));
      }
      if (wheelDirection === 'down') {
        setTranscriptOffset((current) => Math.max(0, current - getScrollStep(view)));
      }
    };
    stdin.on('data', onData);
    return () => {
      stdin.off('data', onData);
    };
  }, [stdin, view]);

  useInput((value, key) => {
    const wheelDirection = getMouseWheelDirection(value);
    if (wheelDirection === 'up') {
      setTranscriptOffset((current) => Math.min(getMaxScrollbackOffset(view), current + getScrollStep(view)));
      return;
    }
    if (wheelDirection === 'down') {
      setTranscriptOffset((current) => Math.max(0, current - getScrollStep(view)));
      return;
    }

    const completeSelectedSuggestion = () => {
      const completion = completeTuiSlashCommandSuggestion(visibleSuggestions[selectedSuggestionIndex]);
      if (!completion) return false;
      if (completion.trim() === rawInput.trim() && !completion.endsWith(' ')) return false;
      setInput((current) => reduceTuiInputBuffer(current, { type: 'replaceValue', value: completion }));
      return true;
    };

    if (view.approval && !view.approval.restored) {
      if (key.ctrl && value === 'c') {
        controller.resolveApproval(false);
        return;
      }
      if (key.escape) {
        controller.resolveApproval(false);
        return;
      }
      const normalizedValue = value.toLowerCase();
      if (normalizedValue === 'y') {
        controller.resolveApproval(true);
        return;
      }
      if (normalizedValue === 'n') {
        controller.resolveApproval(false);
        return;
      }
      return;
    }
    if (key.ctrl && value === 'c') {
      if (busy) {
        controller.cancel();
        return;
      }
      app.exit();
      return;
    }
    if (key.pageUp) {
      setTranscriptOffset((current) => Math.min(getMaxScrollbackOffset(view), current + getScrollStep(view)));
      return;
    }
    if (key.pageDown) {
      setTranscriptOffset((current) => Math.max(0, current - getScrollStep(view)));
      return;
    }
    if (key.home && rawInput.length === 0) {
      setTranscriptOffset(getMaxScrollbackOffset(view));
      return;
    }
    if (key.end && rawInput.length === 0) {
      setTranscriptOffset(0);
      return;
    }
    if (key.return) {
      if (busy) return;
      if (visibleSuggestions.length > 0 && completeSelectedSuggestion()) return;
      const nextInput = reduceTuiInputBuffer(input, { type: 'submit' });
      const submitted = nextInput.submitted;
      setInput(nextInput);
      if (!submitted) return;
      if (submitted === '/exit' || submitted === '/quit') {
        app.exit();
        return;
      }
      setTranscriptOffset(0);
      setInput((current) => commitTuiInputHistory(current, submitted));
      setBusy(true);
      Promise.resolve(controller.submit(submitted)).finally(() => setBusy(false));
      return;
    }
    if (key.upArrow) {
      setInput((current) => reduceTuiInputBuffer(current, { type: 'historyPrevious' }));
      return;
    }
    if (key.downArrow) {
      setInput((current) => reduceTuiInputBuffer(current, { type: 'historyNext' }));
      return;
    }
    if (key.tab || value === '\t') {
      if (visibleSuggestions.length > 1) {
        setSuggestionIndex((current) => {
          const next = key.shift ? current - 1 : current + 1;
          return (next + visibleSuggestions.length) % visibleSuggestions.length;
        });
        return;
      }
      completeSelectedSuggestion();
      return;
    }
    if (key.leftArrow) {
      setInput((current) => reduceTuiInputBuffer(current, { type: 'moveLeft' }));
      return;
    }
    if (key.rightArrow) {
      setInput((current) => reduceTuiInputBuffer(current, { type: 'moveRight' }));
      return;
    }
    if (key.home || (key.ctrl && value === 'a')) {
      setInput((current) => reduceTuiInputBuffer(current, { type: 'moveHome' }));
      return;
    }
    if (key.end || (key.ctrl && value === 'e')) {
      setInput((current) => reduceTuiInputBuffer(current, { type: 'moveEnd' }));
      return;
    }
    if (key.ctrl && value === 'u') {
      setInput((current) => reduceTuiInputBuffer(current, { type: 'clear' }));
      return;
    }
    if (key.backspace) {
      setInput((current) => reduceTuiInputBuffer(current, { type: 'backspace' }));
      return;
    }
    if (key.delete) {
      setInput((current) => reduceTuiInputBuffer(current, { type: 'delete' }));
      return;
    }
    if (key.escape) {
      if (visibleSuggestions.length > 0) {
        setSuggestionsHidden(true);
        setSuggestionIndex(0);
        return;
      }
      setInput((current) => reduceTuiInputBuffer(current, { type: 'clear' }));
      return;
    }
    if (!key.ctrl && value) {
      setInput((current) => reduceTuiInputBuffer(current, { type: 'insert', value }));
    }
  });

  return React.createElement(
    Box,
    { flexDirection: 'column', height: rows, width: size.columns || 80 },
    React.createElement(Header, { title: view.title, headerRows: view.headerRows }),
    React.createElement(ScrollbackPanel, {
      rows: view.scrollbackRows,
      range: view.scrollbackRange,
      totalRows: view.totalScrollbackRows,
    }),
    React.createElement(Footer, {
      footer: view.footer,
      input: rawInput,
      prompt,
      rawInput,
      busy,
      suggestions: visibleSuggestions,
      selectedSuggestionIndex,
      selectedSuggestionDetails,
    }),
  );
}

function ScrollbackPanel({
  rows,
  range,
  totalRows,
}: {
  rows: TuiViewModel['scrollbackRows'];
  range: string;
  totalRows: number;
}) {
  return React.createElement(
    Box,
    { flexDirection: 'column', flexGrow: 1, minHeight: 0, borderStyle: 'single', borderColor: 'gray', paddingX: 1 },
    React.createElement(Text, { bold: true }, totalRows > rows.length ? `Scrollback ${range}` : 'Scrollback'),
    ...rows.map((row, index) =>
      React.createElement(
        Text,
        { key: `scrollback-${index}`, color: scrollbackToneColor(row.tone), bold: row.bold, wrap: 'truncate-end' },
        row.text,
      ),
    ),
  );
}

function Header({ title, headerRows }: { title: string; headerRows: TuiViewModel['headerRows'] }) {
  return React.createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'single', borderColor: 'cyan', paddingX: 1, flexShrink: 0 },
    React.createElement(Text, { bold: true, color: 'cyan' }, title),
    ...headerRows.map((row) =>
      React.createElement(
        Text,
        { key: row.label, color: headerToneColor(row.tone), wrap: 'truncate-end' },
        `${row.label} ${row.items.join(' | ')}`,
      ),
    ),
  );
}

function TranscriptPanel({
  rows,
  range,
  totalRows,
}: {
  rows: Array<{ role: 'user' | 'assistant'; content: string }>;
  range: string;
  totalRows: number;
}) {
  return React.createElement(
    Box,
    { flexDirection: 'column', flexGrow: 1, borderStyle: 'single', borderColor: 'gray', paddingX: 1 },
    React.createElement(Text, { bold: true }, totalRows > rows.length ? `Transcript ${range}` : 'Transcript'),
    ...(rows.length === 0
      ? [React.createElement(Text, { key: 'empty', color: 'gray' }, 'Type a prompt below.')]
      : rows.map((row, index) =>
          React.createElement(
            Text,
            { key: `${row.role}-${index}`, color: row.role === 'user' ? 'green' : 'white', wrap: 'wrap' },
            `${row.role}> ${row.content}`,
          ),
        )),
  );
}

function CommandOutputPanel({ output }: { output: NonNullable<TuiViewModel['commandOutput']> }) {
  return React.createElement(
    Box,
    { flexDirection: 'column', flexGrow: 1, borderStyle: 'single', borderColor: 'cyan', paddingX: 1 },
    React.createElement(Text, { bold: true }, `Output ${output.range}`),
    React.createElement(
      Text,
      { color: output.kind === 'error' ? 'red' : 'cyan', wrap: 'wrap' },
      `${output.command} (${output.range})`,
    ),
    ...(output.lines.length === 0
      ? [React.createElement(Text, { key: 'output-empty', color: 'gray' }, 'No output.')]
      : output.lines.map((line, index) =>
          React.createElement(
            Text,
            { key: `expanded-output-${index}`, color: output.kind === 'error' ? 'red' : 'white', wrap: 'wrap' },
            line,
          ),
        )),
    ...(output.savedPath
      ? [React.createElement(Text, { key: 'output-saved', color: 'gray', wrap: 'wrap' }, `saved ${output.savedPath}`)]
      : []),
  );
}

function SidePanel({
  tools,
  commandOutput,
  notices,
  approval,
}: {
  tools: Array<{ name: string; status: string; detail: string }>;
  commandOutput: TuiViewModel['commandOutput'];
  notices: Array<{ kind: string; message: string }>;
  approval?: TuiApprovalView;
}) {
  return React.createElement(
    Box,
    { flexDirection: 'column', width: 34, borderStyle: 'single', borderColor: 'gray', paddingX: 1 },
    React.createElement(Text, { bold: true }, 'Tools'),
    ...(tools.length === 0
      ? [React.createElement(Text, { key: 'tools-empty', color: 'gray' }, 'No tool calls yet.')]
      : tools.map((tool, index) =>
          React.createElement(
            Text,
            {
              key: `tool-${index}`,
              color: tool.status === 'failed' ? 'red' : tool.status === 'completed' ? 'green' : 'yellow',
              wrap: 'wrap',
            },
            `${tool.name} ${tool.status}${tool.detail ? ` - ${tool.detail}` : ''}`,
          ),
        )),
    ...(commandOutput
      ? [
          React.createElement(Text, { key: 'command-output-title', bold: true }, `Output ${commandOutput.range}`),
          React.createElement(
            Text,
            { key: 'command-output-command', color: commandOutput.kind === 'error' ? 'red' : 'cyan', wrap: 'wrap' },
            `${commandOutput.command} (${commandOutput.range})`,
          ),
          ...commandOutput.lines.map((line, index) =>
            React.createElement(
              Text,
              { key: `command-output-${index}`, color: commandOutput.kind === 'error' ? 'red' : 'gray', wrap: 'wrap' },
              line,
            ),
          ),
          ...(commandOutput.savedPath
            ? [
                React.createElement(
                  Text,
                  { key: 'command-output-saved', color: 'gray', wrap: 'wrap' },
                  `saved ${commandOutput.savedPath}`,
                ),
              ]
            : []),
        ]
      : []),
    ...(approval
      ? [
          React.createElement(Text, { key: 'approval-title', bold: true }, 'Approval'),
          React.createElement(
            Text,
            { key: 'approval-name', color: 'yellow', wrap: 'wrap' },
            `${approval.name} (${approval.riskLevel})`,
          ),
          React.createElement(Text, { key: 'approval-summary', wrap: 'wrap' }, approval.summary),
          React.createElement(Text, { key: 'approval-reason', color: 'gray', wrap: 'wrap' }, approval.reason),
          ...(approval.preview
            ? [React.createElement(Text, { key: 'approval-preview', color: 'gray', wrap: 'wrap' }, approval.preview)]
            : []),
          React.createElement(Text, { key: 'approval-help', color: 'cyan' }, approval.help),
        ]
      : []),
    React.createElement(Text, { bold: true }, 'Notices'),
    ...(notices.length === 0
      ? [React.createElement(Text, { key: 'notices-empty', color: 'gray' }, 'None.')]
      : notices.map((notice, index) =>
          React.createElement(
            Text,
            {
              key: `notice-${index}`,
              color: notice.kind === 'error' ? 'red' : notice.kind === 'warning' ? 'yellow' : 'gray',
              wrap: 'wrap',
            },
            notice.message,
          ),
        )),
  );
}

function Footer({
  footer,
  input,
  prompt,
  rawInput,
  busy,
  suggestions,
  selectedSuggestionIndex,
  selectedSuggestionDetails,
}: {
  footer: string;
  input: string;
  prompt: string;
  rawInput: string;
  busy: boolean;
  suggestions: TuiViewModel['suggestionRows'];
  selectedSuggestionIndex: number;
  selectedSuggestionDetails: string[];
}) {
  return React.createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'single', borderColor: 'cyan', paddingX: 1, flexShrink: 0 },
    React.createElement(Text, { color: 'gray' }, footer),
    ...(suggestions.length > 0
      ? [
          React.createElement(
            Text,
            { key: 'suggestions', color: suggestions[0]?.command ? 'cyan' : 'yellow', wrap: 'truncate-end' },
            `Suggestions ${selectedSuggestionIndex + 1}/${suggestions.length}: ${suggestions
              .map((suggestion, index) => {
                const prefix = index === selectedSuggestionIndex ? '> ' : '';
                return suggestion.command
                  ? `${prefix}${suggestion.usage} - ${suggestion.description}`
                  : `${prefix}${suggestion.description}`;
              })
              .join('  |  ')}`,
          ),
        ]
      : []),
    ...selectedSuggestionDetails.map((detail, index) =>
      React.createElement(Text, { key: `suggestion-detail-${index}`, color: 'gray', wrap: 'truncate-end' }, detail),
    ),
    React.createElement(Text, { color: busy ? 'yellow' : 'white' }, `${prompt}${rawInput ? input : ''}`),
  );
}

function getFooterInputCursorColumn(prompt: string, input: ReturnType<typeof createTuiInputBuffer>) {
  return 2 + prompt.length + getTuiInputCursorCellOffset(input);
}

function getRenderableRows(rows: number) {
  return Math.max(1, rows - 1);
}

function getFooterInputCursorRow(rows: number) {
  return Math.max(0, rows - 2);
}

function getMouseWheelDirection(input: string) {
  if (/\u001B\[<64;\d+;\d+[mM]/.test(input)) return 'up';
  if (/\u001B\[<65;\d+;\d+[mM]/.test(input)) return 'down';
  return undefined;
}

function getScrollStep(view: TuiViewModel) {
  return Math.max(1, view.maxScrollbackRows);
}

function getMaxScrollbackOffset(view: TuiViewModel) {
  return Math.max(0, view.totalScrollbackRows - view.maxScrollbackRows);
}

function getMaxTranscriptOffset(view: TuiViewModel) {
  return Math.max(0, view.totalTranscriptRows - view.maxTranscriptRows);
}

function scrollbackToneColor(tone: TuiViewModel['scrollbackRows'][number]['tone']) {
  if (tone === 'user') return 'green';
  if (tone === 'assistant') return 'white';
  if (tone === 'tool') return 'green';
  if (tone === 'notice') return 'cyan';
  if (tone === 'warning') return 'yellow';
  if (tone === 'error') return 'red';
  if (tone === 'muted') return 'gray';
  return 'white';
}

function headerToneColor(tone: TuiViewModel['headerRows'][number]['tone']) {
  if (tone === 'active') return 'green';
  if (tone === 'warning') return 'yellow';
  if (tone === 'error') return 'red';
  if (tone === 'normal') return 'white';
  return 'gray';
}
