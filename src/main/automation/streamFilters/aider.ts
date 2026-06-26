import { cleanedAutomationStreamLines, normalizeAutomationStreamText } from './shared';
import type { AutomationStreamFilterAdapter, AutomationStreamFilterContext } from './types';

const AIDER_COMMAND_RE = /(?:^|[;&|]\s*)(?:(?:pipx?\s+run|uvx)\s+)?aider(?:\.exe)?(?:\s|$)/i;
const AIDER_OUTPUT_RE = /\b(?:Aider\s+v\d|aider>|─{3,}\s*aider)\b/i;

const AIDER_INTERNAL_LINE_PATTERNS = [
  /^Aider\s+v\d/i,
  /^Model:\s+/i,
  /^Git repo:\s+/i,
  /^Repo-map:\s+/i,
  /^Use \/help\b/i,
  /^─{3,}/,
  /^>\s*$/,
  /^Tokens:\s+/i,
  /^Cost:\s+/i,
  /^Applied edit to\b/i,
  /^Commit [0-9a-f]{7,}\b/i,
  /^Added\s+\S+\s+to the chat/i,
  /^Dropped\s+\S+\s+from the chat/i,
  /^Run\s+.*\?\s*\(Y\)es/i,
  /^Searching\b/i,
  /^Loading\b/i,
];

const AIDER_TOOL_OUTPUT_STARTERS = [/^Applied edit to\b/i, /^Commit [0-9a-f]{7,}\b/i, /^>\s+.*\$\s/];

const AIDER_EDIT_BLOCK_STARTERS = [/^<<<<<<</, /^={7}/, /^>>>>>>>/, /^```\w*$/];

function isInternalLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return AIDER_INTERNAL_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function createAiderAutomationStreamFilterAdapter(): AutomationStreamFilterAdapter {
  return aiderStreamFilter;
}

export const createAutomationStreamFilterAdapter = createAiderAutomationStreamFilterAdapter;

export const aiderStreamFilter: AutomationStreamFilterAdapter = {
  id: 'aider',
  label: 'Aider',

  detect(context?: AutomationStreamFilterContext): boolean {
    const cmd = String(context?.lastCommand || '');
    const out = normalizeAutomationStreamText(String(context?.recentOutput || ''));
    return AIDER_COMMAND_RE.test(cmd) || AIDER_OUTPUT_RE.test(out);
  },

  filterText(text: string): string {
    return cleanedAutomationStreamLines(text)
      .filter((line) => !isInternalLine(line))
      .join('\n');
  },

  isInternalText(text: string): boolean {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    return lines.length > 0 && lines.every(isInternalLine);
  },

  startsToolOutputContext(text: string): boolean {
    const trimmed = text.trim();
    return AIDER_TOOL_OUTPUT_STARTERS.some((p) => p.test(trimmed));
  },

  startsEditBlockContext(text: string): boolean {
    const trimmed = text.trim();
    return AIDER_EDIT_BLOCK_STARTERS.some((p) => p.test(trimmed));
  },

  isToolOutputContinuation(text: string): boolean {
    const trimmed = text.trim();
    return /^[│|]\s/.test(trimmed) || /^>\s/.test(trimmed);
  },

  isNarrativeBoundary(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (isInternalLine(trimmed)) return false;
    return !this.startsToolOutputContext(trimmed) && !this.startsEditBlockContext(trimmed);
  },

  extractUserInputEcho(text: string): string {
    const match = text.match(/^aider>\s*(.+)/i);
    return match ? match[1].trim() : '';
  },
};
