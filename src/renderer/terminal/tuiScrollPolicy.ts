export type TuiMouseTrackingMode = 'none' | 'x10' | 'vt200' | 'drag' | 'any';

export type TuiWheelAction = { kind: 'native' } | { kind: 'key'; sequence: string; repeat: number };

export type AppManagedNormalBufferPageDirection = 'previous' | 'next';

interface TuiWheelInput {
  isAltBuffer: boolean;
  mouseTrackingMode: TuiMouseTrackingMode;
  deltaY: number;
  deltaMode: number;
  shiftKey: boolean;
}

interface PtyResizeInput {
  isAltBuffer: boolean;
  prevRows: number;
  prevCols: number;
  newRows: number;
  newCols: number;
}

interface ScrollbackCorrectionInput {
  isAltBuffer: boolean;
  lastSentCommand?: string;
}

interface TerminalInputCommandLineResult {
  pendingLine: string;
  command?: string;
}

interface HistoryPagingInput {
  action: 'previous' | 'next' | 'latest';
  currentExpandedHeight: number;
  viewportHeight: number;
  maxPages?: number;
}

interface HistoryPageDepthInput {
  action: 'previous' | 'next' | 'latest';
  currentPageDepth: number;
  maxPages?: number;
}

interface WheelProbeScrollInput {
  deltaY: number;
  deltaMode: number;
  maxLines?: number;
}

interface HistoryWheelPagingInput {
  currentExpandedHeight: number;
  viewportHeight: number;
  deltaY: number;
  deltaMode: number;
  maxPages?: number;
  linePixels?: number;
}

interface HistoryWheelDeltaPixelsInput {
  deltaY: number;
  deltaMode: number;
  viewportHeight: number;
  linePixels?: number;
}

interface HistoryWheelFrameDeltaInput {
  pendingDeltaPixels: number;
  viewportHeight: number;
  maxFramePixels?: number;
}

interface HistoryWheelFrameDeltaResult {
  appliedDeltaPixels: number;
  remainingDeltaPixels: number;
}

interface AppManagedNormalBufferWheelInput {
  deltaY: number;
  deltaMode: number;
}

const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;
const DEFAULT_HISTORY_MAX_PAGES = 20;
const DEFAULT_WHEEL_PROBE_MAX_LINES = 80;
const DEFAULT_WHEEL_LINE_PIXELS = 40;
const DEFAULT_HISTORY_WHEEL_FRAME_MAX_PIXELS = 220;

const DIRECT_CLAUDE_COMMANDS = new Set(['claude', 'claude-code', '@anthropic-ai/claude-code']);

const DIRECT_CODEX_COMMANDS = new Set(['codex', '@openai/codex']);

const RUNNER_COMMANDS = new Set(['npx', 'bunx']);
const PACKAGE_MANAGER_EXEC_COMMANDS = new Set(['npm', 'pnpm', 'yarn']);

function splitCommandWords(command: string): string[] {
  return (
    command
      .match(/"[^"]*"|'[^']*'|\S+/g)
      ?.map((part) => part.replace(/^["']|["']$/g, ''))
      .filter(Boolean) ?? []
  );
}

function normalizeCommandToken(token: string): string {
  const normalizedPath = token.replace(/\\/g, '/').toLowerCase();
  const fileName = normalizedPath.split('/').pop() ?? normalizedPath;
  return fileName.replace(/\.(cmd|exe|ps1|bat)$/i, '');
}

function firstNonOption(words: string[], startIndex: number): string {
  for (let i = startIndex; i < words.length; i += 1) {
    const word = words[i];
    if (!word.startsWith('-')) return word;
  }
  return '';
}

function isClaudeCommandToken(token: string): boolean {
  return DIRECT_CLAUDE_COMMANDS.has(normalizeCommandToken(token));
}

function isCodexCommandToken(token: string): boolean {
  return DIRECT_CODEX_COMMANDS.has(normalizeCommandToken(token));
}

function stripInputEscapeSequences(data: string): string {
  return data.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\x1b[ -/]*[@-~]/g, '');
}

function wheelLineCount(deltaY: number, deltaMode: number): number {
  if (deltaMode === DOM_DELTA_LINE) {
    return Math.max(1, Math.abs(Math.round(deltaY)));
  }
  if (deltaMode === DOM_DELTA_PAGE) {
    return 999;
  }
  return Math.max(1, Math.abs(Math.round(deltaY / 40)));
}

export function resolveTuiWheelAction(input: TuiWheelInput): TuiWheelAction {
  if (!input.isAltBuffer) {
    return { kind: 'native' };
  }

  if (input.mouseTrackingMode !== 'none' && !input.shiftKey) {
    return { kind: 'native' };
  }

  const lines = wheelLineCount(input.deltaY, input.deltaMode);
  if (lines >= 3) {
    return {
      kind: 'key',
      sequence: input.deltaY > 0 ? '\x1b[6~' : '\x1b[5~',
      repeat: 1,
    };
  }

  return {
    kind: 'key',
    sequence: input.deltaY > 0 ? '\x1b[B' : '\x1b[A',
    repeat: lines,
  };
}

export function resolveAppManagedNormalBufferPageSequence(direction: AppManagedNormalBufferPageDirection): string {
  return direction === 'previous' ? '\x1b[5~' : '\x1b[6~';
}

export function resolveAppManagedNormalBufferWheelAction(input: AppManagedNormalBufferWheelInput): TuiWheelAction {
  if (!Number.isFinite(input.deltaY) || input.deltaY === 0) {
    return { kind: 'native' };
  }

  const lines = wheelLineCount(input.deltaY, input.deltaMode);
  if (lines >= 3) {
    return {
      kind: 'key',
      sequence: resolveAppManagedNormalBufferPageSequence(input.deltaY > 0 ? 'next' : 'previous'),
      repeat: 1,
    };
  }

  return {
    kind: 'key',
    sequence: input.deltaY > 0 ? '\x1b[B' : '\x1b[A',
    repeat: lines,
  };
}

export function shouldResizePtyAfterFit(input: PtyResizeInput): boolean {
  if (input.isAltBuffer) {
    return false;
  }
  return (
    (input.newRows !== input.prevRows || input.newCols !== input.prevCols) && input.newRows > 0 && input.newCols > 0
  );
}

function isKnownNormalBufferCommandByToken(command: string, isManagedToken: (token: string) => boolean): boolean {
  const words = splitCommandWords(command);
  if (words.length === 0) return false;

  const first = words[0];
  if (isManagedToken(first)) return true;

  const normalizedFirst = normalizeCommandToken(first);
  if (RUNNER_COMMANDS.has(normalizedFirst)) {
    return isManagedToken(firstNonOption(words, 1));
  }

  if (PACKAGE_MANAGER_EXEC_COMMANDS.has(normalizedFirst)) {
    const subcommand = normalizeCommandToken(words[1] ?? '');
    if (subcommand === 'dlx' || subcommand === 'exec' || subcommand === 'x') {
      return isManagedToken(firstNonOption(words, 2));
    }
  }

  return false;
}

function isAppManagedCommandToken(token: string): boolean {
  return isClaudeCommandToken(token) || isCodexCommandToken(token);
}

export function isKnownAppManagedNormalBufferCommand(command: string): boolean {
  return isKnownNormalBufferCommandByToken(command, isAppManagedCommandToken);
}

export function isKnownAppManagedNormalBufferPageControlCommand(command: string): boolean {
  return isKnownNormalBufferCommandByToken(command, isClaudeCommandToken);
}

export function findKnownAppManagedNormalBufferCommand(input: string): string {
  const candidates = String(input || '')
    .split(/\r?\n|[;&]/g)
    .map((candidate) => candidate.trim())
    .filter(Boolean);

  return candidates.find((candidate) => isKnownAppManagedNormalBufferCommand(candidate)) ?? '';
}

export function isKnownAppManagedNormalBufferTranscript(input: string): boolean {
  const text = String(input || '');
  return /\bOpenAI\s+Codex\b/i.test(text) || /\bCodex\s+CLI\b/i.test(text) || /\bClaude\s+Code\b/i.test(text);
}

export function isKnownAppManagedNormalBufferPageControlTranscript(input: string): boolean {
  return /\bClaude\s+Code\b/i.test(String(input || ''));
}

export function shouldApplyScrollbackCorrectionAfterShrink(input: ScrollbackCorrectionInput): boolean {
  if (input.isAltBuffer) return false;
  return !isKnownAppManagedNormalBufferPageControlCommand(input.lastSentCommand ?? '');
}

export function resolveHistoryPagingHeight(input: HistoryPagingInput): number {
  const page = Math.max(1, Math.floor(input.viewportHeight || 0));
  const current = Math.max(0, Math.floor(input.currentExpandedHeight || 0));
  const maxPages = Math.max(1, Math.floor(input.maxPages ?? DEFAULT_HISTORY_MAX_PAGES));
  const maxHeight = page * maxPages;

  if (input.action === 'latest') return 0;
  if (input.action === 'previous') return Math.min(current + page, maxHeight);
  return Math.max(current - page, 0);
}

export function resolveHistoryPageDepth(input: HistoryPageDepthInput): number {
  const current = Math.max(0, Math.floor(input.currentPageDepth || 0));
  const maxPages = Math.max(1, Math.floor(input.maxPages ?? DEFAULT_HISTORY_MAX_PAGES));

  if (input.action === 'latest') return 0;
  if (input.action === 'previous') return Math.min(current + 1, maxPages);
  return Math.max(current - 1, 0);
}

export function resolveWheelProbeScrollLines(input: WheelProbeScrollInput): number {
  if (!Number.isFinite(input.deltaY) || input.deltaY === 0) return 0;
  const direction = input.deltaY > 0 ? 1 : -1;
  const maxLines = Math.max(1, Math.floor(input.maxLines ?? DEFAULT_WHEEL_PROBE_MAX_LINES));
  let lines: number;
  if (input.deltaMode === DOM_DELTA_LINE) {
    lines = Math.abs(Math.round(input.deltaY));
  } else if (input.deltaMode === DOM_DELTA_PAGE) {
    lines = maxLines;
  } else {
    lines = Math.abs(Math.round(input.deltaY / 40));
  }
  return direction * Math.min(maxLines, Math.max(1, lines));
}

export function resolveHistoryWheelDeltaPixels(input: HistoryWheelDeltaPixelsInput): number {
  if (!Number.isFinite(input.deltaY) || input.deltaY === 0) return 0;

  const page = Math.max(1, Math.floor(input.viewportHeight || 0));
  const linePixels = Math.max(1, Math.floor(input.linePixels ?? DEFAULT_WHEEL_LINE_PIXELS));

  if (input.deltaMode === DOM_DELTA_LINE) {
    return Math.round(input.deltaY) * linePixels;
  }
  if (input.deltaMode === DOM_DELTA_PAGE) {
    return Math.round(input.deltaY) * page;
  }
  return Math.round(input.deltaY);
}

export function resolveHistoryWheelFrameDelta(input: HistoryWheelFrameDeltaInput): HistoryWheelFrameDeltaResult {
  const pending = Number.isFinite(input.pendingDeltaPixels) ? Math.round(input.pendingDeltaPixels) : 0;
  if (pending === 0) {
    return { appliedDeltaPixels: 0, remainingDeltaPixels: 0 };
  }

  const page = Math.max(1, Math.floor(input.viewportHeight || 0));
  const defaultMaxFrame = Math.min(DEFAULT_HISTORY_WHEEL_FRAME_MAX_PIXELS, Math.max(80, Math.floor(page * 0.45)));
  const maxFrame = Math.max(1, Math.floor(input.maxFramePixels ?? defaultMaxFrame));
  const appliedMagnitude = Math.min(Math.abs(pending), maxFrame);
  const appliedDeltaPixels = pending < 0 ? -appliedMagnitude : appliedMagnitude;

  return {
    appliedDeltaPixels,
    remainingDeltaPixels: pending - appliedDeltaPixels,
  };
}

export function resolveHistoryWheelPagingHeight(input: HistoryWheelPagingInput): number {
  const deltaPixels = resolveHistoryWheelDeltaPixels({
    deltaY: input.deltaY,
    deltaMode: input.deltaMode,
    viewportHeight: input.viewportHeight,
    linePixels: input.linePixels,
  });

  if (deltaPixels === 0) {
    return Math.max(0, Math.floor(input.currentExpandedHeight || 0));
  }

  const page = Math.max(1, Math.floor(input.viewportHeight || 0));
  const current = Math.max(0, Math.floor(input.currentExpandedHeight || 0));
  const maxPages = Math.max(1, Math.floor(input.maxPages ?? DEFAULT_HISTORY_MAX_PAGES));
  const maxHeight = page * maxPages;

  if (deltaPixels < 0) {
    return Math.min(current + Math.max(1, Math.abs(deltaPixels)), maxHeight);
  }
  return Math.max(current - Math.max(1, Math.abs(deltaPixels)), 0);
}

export function reduceTerminalInputCommandLine(pendingLine: string, data: string): TerminalInputCommandLineResult {
  const cleanData = stripInputEscapeSequences(data);
  let nextLine = pendingLine;
  let command: string | undefined;

  for (const char of cleanData) {
    if (char === '\x03' || char === '\x15') {
      nextLine = '';
      continue;
    }
    if (char === '\x08' || char === '\x7f') {
      nextLine = nextLine.slice(0, -1);
      continue;
    }
    if (char === '\r' || char === '\n') {
      const trimmed = nextLine.trim();
      if (trimmed) command = trimmed;
      nextLine = '';
      continue;
    }
    if (char >= ' ' && char !== '\x7f') {
      nextLine += char;
    }
  }

  return { pendingLine: nextLine, command };
}
