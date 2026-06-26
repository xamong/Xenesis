import { cleanedAutomationStreamLines, normalizeAutomationStreamText } from './shared';
import type { AutomationStreamFilterAdapter, AutomationStreamFilterContext } from './types';

const WINDSURF_COMMAND_RE = /(?:^|[;&|]\s*)(?:windsurf|codeium)(?:\.exe)?(?:\s|$)/i;
const WINDSURF_OUTPUT_RE = /\b(?:Windsurf|Codeium|Cascade)\b/i;

const WINDSURF_INTERNAL_LINE_PATTERNS = [
  /^Windsurf\b/i,
  /^Codeium\b/i,
  /^Cascade\b/i,
  /^Thinking\.\.\./i,
  /^Searching\s+codebase/i,
  /^Reading\s+file/i,
  /^Writing\s+to\s+file/i,
  /^Running\s+command/i,
  /^Executing/i,
  /^Analyzing/i,
  /^Processing/i,
  /^Loading\b/i,
  /^⠋|^⠙|^⠹|^⠸|^⠼|^⠴|^⠦|^⠧|^⠇|^⠏/,
  /^\[[\d:]+\]\s*$/,
  /^─{3,}/,
];

const WINDSURF_TOOL_OUTPUT_STARTERS = [
  /^Reading\s+file/i,
  /^Writing\s+to/i,
  /^Running\s+command/i,
  /^Created\s+file/i,
  /^Modified\s+file/i,
  /^Deleted\s+file/i,
];

const WINDSURF_EDIT_BLOCK_STARTERS = [/^```\w*$/, /^diff\s+--git/i, /^---\s+a\//, /^\+\+\+\s+b\//];

function isInternalLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return WINDSURF_INTERNAL_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function createWindsurfAutomationStreamFilterAdapter(): AutomationStreamFilterAdapter {
  return windsurfStreamFilter;
}

export const createAutomationStreamFilterAdapter = createWindsurfAutomationStreamFilterAdapter;

export const windsurfStreamFilter: AutomationStreamFilterAdapter = {
  id: 'windsurf',
  label: 'Windsurf',

  detect(context?: AutomationStreamFilterContext): boolean {
    const cmd = String(context?.lastCommand || '');
    const out = normalizeAutomationStreamText(String(context?.recentOutput || ''));
    return WINDSURF_COMMAND_RE.test(cmd) || WINDSURF_OUTPUT_RE.test(out);
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
    return WINDSURF_TOOL_OUTPUT_STARTERS.some((p) => p.test(trimmed));
  },

  startsEditBlockContext(text: string): boolean {
    const trimmed = text.trim();
    return WINDSURF_EDIT_BLOCK_STARTERS.some((p) => p.test(trimmed));
  },

  isToolOutputContinuation(text: string): boolean {
    const trimmed = text.trim();
    return /^[│|]\s/.test(trimmed) || /^[+-]\s/.test(trimmed);
  },

  isNarrativeBoundary(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (isInternalLine(trimmed)) return false;
    return !this.startsToolOutputContext(trimmed) && !this.startsEditBlockContext(trimmed);
  },

  extractUserInputEcho(text: string): string {
    const match = text.match(/^>\s*(.+)/);
    return match ? match[1].trim() : '';
  },
};
