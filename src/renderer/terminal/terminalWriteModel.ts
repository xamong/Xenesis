export const TERMINAL_COMMAND_WRITE_CHUNK_BYTES = 20;
export const TERMINAL_COMMAND_PART_DELAY_MS = 35;
export const TERMINAL_COMMAND_SUBMIT_DELAY_MS = 120;

export type TerminalCommandInputMode = 'event' | 'paste' | 'direct' | 'typed';
type TerminalCommandInputPartTiming = { delayBeforeMs?: number };
export type TerminalCommandInputPart =
  | ({ kind: 'input'; data: string } & TerminalCommandInputPartTiming)
  | ({ kind: 'paste'; data: string } & TerminalCommandInputPartTiming)
  | ({ kind: 'direct'; data: string } & TerminalCommandInputPartTiming)
  | ({ kind: 'textInput'; data: string } & TerminalCommandInputPartTiming)
  | ({ kind: 'enterKey' } & TerminalCommandInputPartTiming);

export interface TerminalCommandInputDispatcher {
  input(data: string): void;
  paste(data: string): void;
  direct(data: string): void;
  textInput(data: string): void;
  enterKey(): void;
  setTimeout(callback: () => void, delay: number): void;
}

const textEncoder = new TextEncoder();

export function buildTerminalCommandWrites(command: string, lineEnding: string): string[] {
  const writes: string[] = command ? splitUtf8SafeChunks(command, TERMINAL_COMMAND_WRITE_CHUNK_BYTES) : [];
  if (lineEnding) writes.push(lineEnding);
  return writes;
}

export function buildTerminalCommandInputParts(
  command: string,
  lineEnding: string,
  mode: TerminalCommandInputMode = 'typed',
): TerminalCommandInputPart[] {
  const hasCommand = command.length > 0;
  if (mode === 'event') {
    const parts: TerminalCommandInputPart[] = [];
    for (const char of command) {
      parts.push({ kind: 'textInput', data: char });
    }
    parts.push(...buildSubmitEventParts(lineEnding, hasCommand));
    return parts;
  }
  if (mode === 'paste') {
    const parts: TerminalCommandInputPart[] = [];
    if (command) parts.push({ kind: 'paste', data: command });
    if (lineEnding) parts.push(withSubmitDelay({ kind: 'input', data: lineEnding }, hasCommand));
    return parts;
  }
  if (mode === 'direct') {
    return buildTerminalCommandWriteParts(command, lineEnding, 'direct');
  }
  return buildTerminalCommandWriteParts(command, lineEnding, 'input');
}

export function dispatchTerminalCommandInputParts(
  parts: TerminalCommandInputPart[],
  dispatcher: TerminalCommandInputDispatcher,
): void {
  if (parts.length === 0) return;
  dispatchTerminalCommandInputPart(parts[0], dispatcher);
  let delay = 0;
  for (const part of parts.slice(1)) {
    delay += part.delayBeforeMs ?? TERMINAL_COMMAND_PART_DELAY_MS;
    dispatcher.setTimeout(() => {
      dispatchTerminalCommandInputPart(part, dispatcher);
    }, delay);
  }
}

function dispatchTerminalCommandInputPart(
  part: TerminalCommandInputPart,
  dispatcher: TerminalCommandInputDispatcher,
): void {
  if (part.kind === 'paste') {
    dispatcher.paste(part.data);
    return;
  }
  if (part.kind === 'direct') {
    dispatcher.direct(part.data);
    return;
  }
  if (part.kind === 'textInput') {
    dispatcher.textInput(part.data);
    return;
  }
  if (part.kind === 'enterKey') {
    dispatcher.enterKey();
    return;
  }
  dispatcher.input(part.data);
}

function buildTerminalCommandWriteParts(
  command: string,
  lineEnding: string,
  kind: 'input' | 'direct',
): TerminalCommandInputPart[] {
  const commandParts = command
    ? splitUtf8SafeChunks(command, TERMINAL_COMMAND_WRITE_CHUNK_BYTES).map((data) => ({ kind, data }))
    : [];
  if (!lineEnding) return commandParts;
  return [...commandParts, withSubmitDelay({ kind, data: lineEnding }, commandParts.length > 0)];
}

function buildSubmitEventParts(lineEnding: string, hasCommand: boolean): TerminalCommandInputPart[] {
  const parts: TerminalCommandInputPart[] = [];
  for (const char of lineEnding) {
    if (char === '\r') {
      parts.push({ kind: 'enterKey' });
    } else if (char) {
      parts.push({ kind: 'input', data: char });
    }
  }
  if (parts.length > 0) parts[0] = withSubmitDelay(parts[0], hasCommand);
  return parts;
}

function withSubmitDelay<T extends TerminalCommandInputPart>(part: T, shouldDelay: boolean): T {
  return shouldDelay ? { ...part, delayBeforeMs: TERMINAL_COMMAND_SUBMIT_DELAY_MS } : part;
}

function splitUtf8SafeChunks(value: string, maxBytes: number): string[] {
  if (!value) return [];
  if (maxBytes <= 0) return [value];

  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const char of value) {
    const charBytes = utf8Bytes(char);
    if (current && currentBytes + charBytes > maxBytes) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += charBytes;
  }

  if (current) chunks.push(current);
  return chunks;
}

function utf8Bytes(value: string): number {
  return textEncoder.encode(value).length;
}
