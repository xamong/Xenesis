import {
  cleanedAutomationStreamLines,
  extractGenericPromptEchoLine,
  isDecorativeOnlyLine,
  normalizeAutomationStreamText,
} from './shared';
import type { AutomationStreamFilterAdapter, AutomationStreamFilterContext } from './types';

const GEMINI_COMMAND_RE =
  /(?:^|[;&|]\s*)(?:(?:npx|pnpm\s+dlx|bunx)\s+)?(?:@google\/gemini-cli|gemini)(?:\.cmd|\.ps1|\.exe)?(?:\s|$)/i;
const GEMINI_OUTPUT_RE = /\bGemini CLI\b|\bUsing model:\s*gemini/i;

function commandLooksLikeGemini(command: string | undefined): boolean {
  return GEMINI_COMMAND_RE.test(String(command || '').trim());
}

function outputLooksLikeGemini(output: string | undefined): boolean {
  return GEMINI_OUTPUT_RE.test(normalizeAutomationStreamText(String(output || '')));
}

function contextLooksLikeGemini(context: AutomationStreamFilterContext = {}): boolean {
  return commandLooksLikeGemini(context.lastCommand) || outputLooksLikeGemini(context.recentOutput);
}

function normalizeGeminiLine(line: string): string {
  return line.trim().replace(/^•\s*/, '').trim();
}

function isGeminiInternalLine(line: string): boolean {
  const normalized = normalizeGeminiLine(line);
  if (!normalized) return true;
  if (isDecorativeOnlyLine(normalized)) return true;
  if (/^[>›]\s*/.test(normalized)) return true;
  if (/^Gemini CLI\b/i.test(normalized)) return true;
  if (/^(?:Using model|Model|Provider):\s+/i.test(normalized)) return true;
  if (/^(?:Tool call|Tool result|Function call|Function response):/i.test(normalized)) return true;
  if (/^(?:Loaded cached credentials|Authenticated|Logged in|Connecting|Connected)\b/i.test(normalized)) return true;
  if (/^(?:✔|✓)\s+(?:Done|Completed|Updated|Read|Wrote|Edited)\b/i.test(normalized)) return true;
  if (/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]\s*/.test(normalized)) return true;
  if (/^(?:\d+m\s*)?\d+s\s*[·•]\s*(?:esc|ctrl-c)\b/i.test(normalized)) return true;
  return false;
}

function filterGeminiText(text: string): string {
  return cleanedAutomationStreamLines(text)
    .filter((line) => !extractGenericPromptEchoLine(line))
    .filter((line) => !isGeminiInternalLine(line))
    .map(normalizeGeminiLine)
    .filter(Boolean)
    .join('\n');
}

function extractUserInputEcho(text: string): string {
  return cleanedAutomationStreamLines(text).map(extractGenericPromptEchoLine).filter(Boolean).join('\n');
}

function isNarrativeBoundary(text: string): boolean {
  const filtered = filterGeminiText(text);
  if (!filtered) return false;
  const line = filtered.split('\n').find(Boolean)?.trim() ?? '';
  return line.length >= 8 && !isGeminiInternalLine(line);
}

export function createGeminiAutomationStreamFilterAdapter(): AutomationStreamFilterAdapter {
  return {
    id: 'gemini',
    label: 'Gemini CLI',
    detect: contextLooksLikeGemini,
    filterText: filterGeminiText,
    isInternalText(text) {
      const lines = cleanedAutomationStreamLines(text);
      return lines.length > 0 && lines.every(isGeminiInternalLine);
    },
    startsToolOutputContext(text) {
      return cleanedAutomationStreamLines(text).some((line) =>
        /^(?:Tool call|Tool result|Function call|Function response):/i.test(normalizeGeminiLine(line)),
      );
    },
    startsEditBlockContext(text) {
      return cleanedAutomationStreamLines(text).some((line) =>
        /^(?:Tool call:\s*)?(?:edit|write|replace|patch)/i.test(normalizeGeminiLine(line)),
      );
    },
    isToolOutputContinuation(text) {
      const lines = cleanedAutomationStreamLines(text);
      return lines.length > 0 && lines.every(isGeminiInternalLine);
    },
    isNarrativeBoundary,
    extractUserInputEcho,
  };
}

export const createAutomationStreamFilterAdapter = createGeminiAutomationStreamFilterAdapter;
