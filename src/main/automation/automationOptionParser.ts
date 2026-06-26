import type { AutomationOption } from '../../shared/types';

const ANSI_RE = /\x1b(?:\][^\x07]*(?:\x07|\x1b\\)|\[[0-?]*[ -/]*[@-~]|[@-Z\\-_])/g;
const OPTION_LINE_RE = /^\s*(?:[›>]\s*)?[[(]?(\d{1,2})[.\]):]\s+(.{2,180})\s*$/;
const INLINE_OPTION_RE = /[[(](\d{1,2})[\])]\s*([^[\]()\r\n]{2,120}?)(?=\s+[[(]\d{1,2}[\])]|\s{2,}|$)/g;

export function stripTerminalControlSequences(text: string): string {
  return text
    .replace(ANSI_RE, '')
    .replace(/\x1b/g, '')
    .replace(/\r/g, '\n')
    .replace(/\u001b/g, '');
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function inputFromOptionLabel(num: string, label: string): string {
  const hotkey = /\(([^()]{1,12})\)\s*$/.exec(label)?.[1]?.trim();
  const normalizedHotkey = hotkey?.toLowerCase();
  if (normalizedHotkey === 'esc' || normalizedHotkey === 'escape') return '\x1b';
  if (normalizedHotkey === 'enter' || normalizedHotkey === 'return') return '\r';
  if (hotkey && /^[a-z0-9]$/i.test(hotkey)) return hotkey;
  return `${num}\r`;
}

function addOption(found: Map<string, AutomationOption>, num: string, rawLabel: string): void {
  const label = normalizeWhitespace(rawLabel);
  if (label.length < 2 || found.has(num)) return;
  found.set(num, {
    label: `${num}. ${label}`,
    input: inputFromOptionLabel(num, label),
  });
}

export function parseAutomationOptions(text: string): AutomationOption[] {
  const tail = stripTerminalControlSequences(text.slice(-4000));
  const found = new Map<string, AutomationOption>();

  for (const line of tail.split('\n')) {
    const match = OPTION_LINE_RE.exec(line);
    if (!match) continue;
    addOption(found, match[1], match[2]);
  }

  if (found.size === 0) {
    INLINE_OPTION_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = INLINE_OPTION_RE.exec(tail)) !== null) {
      addOption(found, match[1], match[2]);
    }
  }

  return [...found.values()].sort((left, right) => {
    const leftNumber = parseInt(left.label, 10);
    const rightNumber = parseInt(right.label, 10);
    return leftNumber - rightNumber;
  });
}
