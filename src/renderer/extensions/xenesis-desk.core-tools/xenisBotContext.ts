import type { TerminalHostSessionInfo } from '../../terminal/terminalHost';

const MAX_CONTEXT_CHARS = 12000;

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function clipText(value: unknown, maxChars = MAX_CONTEXT_CHARS): string {
  const text = typeof value === 'string' ? value : String(value ?? '');
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[... clipped ${text.length - maxChars} chars ...]`;
}

function jsonBlock(value: Record<string, unknown>): string {
  return ['```xenesis-context', JSON.stringify(value, null, 2), '```'].join('\n');
}

export interface TerminalBotContextInput {
  termId: string;
  label?: string;
  kind?: string;
  detail?: string;
  cwd?: string;
  selectedText?: string;
  recentOutput?: string;
  mode?: 'selection' | 'recent-output';
}

export interface FileBotContextInput {
  filePath?: string;
  fileName?: string;
  title?: string;
  contentType?: string;
  fileOrigin?: 'local' | 'remote' | string;
  remoteFilePath?: string;
  note?: string;
}

export function buildTerminalBotContextMessage(input: TerminalBotContextInput): string {
  const mode = input.mode === 'selection' ? 'selection' : 'recent-output';
  const body = mode === 'selection' ? cleanText(input.selectedText) : cleanText(input.recentOutput);
  const sessionKind = cleanText(input.kind) || 'terminal';
  const reconnectGuidance =
    sessionKind === 'ssh' || sessionKind === 'telnet'
      ? 'Reconnect guidance: this is a remote terminal. If the session is stale, ask before restarting or reconnecting.'
      : 'Reconnect guidance: this is a local terminal. Do not restart it unless the user asks.';

  return [
    `Use this Xenesis Desk terminal ${mode === 'selection' ? 'selection' : 'recent output'} as context.`,
    '',
    jsonBlock({
      surface: 'terminal',
      termId: input.termId,
      label: cleanText(input.label),
      kind: sessionKind,
      detail: cleanText(input.detail),
      cwd: cleanText(input.cwd),
      mode,
    }),
    '',
    reconnectGuidance,
    '',
    '```terminal-output',
    clipText(body || '(empty terminal context)'),
    '```',
  ].join('\n');
}

export function buildTerminalBotContextMessageFromSession(
  session: TerminalHostSessionInfo | undefined,
  context: Pick<TerminalBotContextInput, 'selectedText' | 'recentOutput' | 'mode'>,
): string {
  return buildTerminalBotContextMessage({
    termId: session?.id || '',
    label: session?.label || '',
    kind: session?.kind || 'terminal',
    detail: session?.detail || '',
    cwd: session?.cwd || '',
    ...context,
  });
}

export function buildFileBotContextMessage(input: FileBotContextInput): string {
  const title = cleanText(input.title) || cleanText(input.fileName) || cleanText(input.filePath) || 'file';
  return [
    `Use this Xenesis Desk file reference as context: ${title}`,
    '',
    jsonBlock({
      surface: 'file',
      title,
      filePath: cleanText(input.filePath),
      fileName: cleanText(input.fileName),
      contentType: cleanText(input.contentType),
      fileOrigin: cleanText(input.fileOrigin),
      remoteFilePath: cleanText(input.remoteFilePath),
    }),
    '',
    cleanText(input.note) ||
      'Read or modify the file only through Xenesis Desk safe file tools when a write is needed.',
  ].join('\n');
}

export function buildCurrentDeskBotContextMessage(): string {
  return [
    'Inspect the current Xenesis Desk state and summarize the active workspace.',
    '',
    'Use `xenesis_desk_active_context` first. If terminal output is needed, use `xenesis_desk_terminal_list` and `xenesis_desk_terminal_tail`.',
    'When file changes are needed, preview with `xenesis_desk_preview_text_file_write`, ask for approval, then apply with `xenesis_desk_apply_text_file_write`.',
  ].join('\n');
}
