import {
  cleanedAutomationStreamLines,
  extractGenericPromptEchoLine,
  isDecorativeOnlyLine,
  normalizeAutomationStreamText,
} from './shared';
import type { AutomationStreamFilterAdapter, AutomationStreamFilterContext } from './types';

const CLAUDE_COMMAND_RE =
  /(?:^|[;&|]\s*)(?:(?:npx|pnpm\s+dlx|bunx)\s+)?(?:@anthropic-ai\/claude-code|claude-code|claude)(?:\.cmd|\.ps1|\.exe)?(?:\s|$)/i;
const CLAUDE_OUTPUT_RE = /\bClaude\s+Code\b|✻\s+Welcome to Claude Code/i;

const CLAUDE_TOOL_PREFIX_RE =
  /^(?:Bash|Read|Edit|MultiEdit|Write|Grep|Glob|LS|List|TodoWrite|Task|WebFetch|WebSearch|NotebookEdit)\(/i;

function commandLooksLikeClaude(command: string | undefined): boolean {
  return CLAUDE_COMMAND_RE.test(String(command || '').trim());
}

function outputLooksLikeClaude(output: string | undefined): boolean {
  return CLAUDE_OUTPUT_RE.test(normalizeAutomationStreamText(String(output || '')));
}

function contextLooksLikeClaude(context: AutomationStreamFilterContext = {}): boolean {
  return commandLooksLikeClaude(context.lastCommand) || outputLooksLikeClaude(context.recentOutput);
}

function normalizeClaudeLine(line: string): string {
  return line.trim().replace(/^•\s*/, '').trim();
}

function isClaudePromptPlaceholder(line: string): boolean {
  return /^(?:try|ask|type)\s+/i.test(line.trim()) || /^\/help\b/i.test(line.trim());
}

function isClaudeInternalLine(line: string): boolean {
  const normalized = normalizeClaudeLine(line);
  if (!normalized) return true;
  if (isDecorativeOnlyLine(normalized)) return true;
  if (/^[>›]\s*/.test(normalized)) return true;
  if (/^(?:✻|✢|✳)\s*Welcome to Claude Code!?/i.test(normalized)) return true;
  if (/^Claude Code\b/i.test(normalized)) return true;
  if (/^(?:⏺|⎿|●|○|◇|◆)\s*/.test(normalized)) return true;
  if (CLAUDE_TOOL_PREFIX_RE.test(normalized)) return true;
  if (/^(?:Tool use|Tool result|Tool call|Running tool|Reading|Writing|Editing)\b/i.test(normalized)) return true;
  if (/^(?:✔|✓)\s+(?:Done|Completed|Updated|Read|Wrote|Edited)\b/i.test(normalized)) return true;
  if (/^(?:\d+m\s*)?\d+s\s*[·•]\s*(?:esc|ctrl-c)\b/i.test(normalized)) return true;
  if (/^(?:Tokens|Context|Model):\s+/i.test(normalized)) return true;
  return false;
}

function filterClaudeText(text: string): string {
  return cleanedAutomationStreamLines(text)
    .filter((line) => !extractGenericPromptEchoLine(line))
    .filter((line) => !isClaudeInternalLine(line))
    .map(normalizeClaudeLine)
    .filter(Boolean)
    .join('\n');
}

function extractUserInputEcho(text: string): string {
  return cleanedAutomationStreamLines(text)
    .map(extractGenericPromptEchoLine)
    .filter((line) => line && !isClaudePromptPlaceholder(line))
    .join('\n');
}

function isNarrativeBoundary(text: string): boolean {
  const filtered = filterClaudeText(text);
  if (!filtered) return false;
  const line = filtered.split('\n').find(Boolean)?.trim() ?? '';
  return line.length >= 8 && !isClaudeInternalLine(line);
}

export function createClaudeAutomationStreamFilterAdapter(): AutomationStreamFilterAdapter {
  return {
    id: 'claude',
    label: 'Claude Code',
    detect: contextLooksLikeClaude,
    filterText: filterClaudeText,
    isInternalText(text) {
      const lines = cleanedAutomationStreamLines(text);
      return lines.length > 0 && lines.every(isClaudeInternalLine);
    },
    startsToolOutputContext(text) {
      return cleanedAutomationStreamLines(text).some(
        (line) =>
          CLAUDE_TOOL_PREFIX_RE.test(normalizeClaudeLine(line)) || /^(?:⏺|⎿)\s*/.test(normalizeClaudeLine(line)),
      );
    },
    startsEditBlockContext(text) {
      return cleanedAutomationStreamLines(text).some((line) =>
        /^(?:Edit|MultiEdit|Write)\(/i.test(normalizeClaudeLine(line)),
      );
    },
    isToolOutputContinuation(text) {
      const lines = cleanedAutomationStreamLines(text);
      return lines.length > 0 && lines.every(isClaudeInternalLine);
    },
    isNarrativeBoundary,
    extractUserInputEcho,
  };
}

export const createAutomationStreamFilterAdapter = createClaudeAutomationStreamFilterAdapter;
