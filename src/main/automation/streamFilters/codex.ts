import { cleanedAutomationStreamLines, normalizeAutomationStreamText } from './shared';
import type { AutomationStreamFilterAdapter, AutomationStreamFilterContext } from './types';

const CODEX_COMMAND_RE =
  /(?:^|[;&|]\s*)(?:(?:npx|pnpm\s+dlx|bunx)\s+)?(?:@openai\/)?codex(?:\.cmd|\.ps1|\.exe)?(?:\s|$)/i;
const CODEX_OUTPUT_RE = /\b(?:OpenAI\s+Codex|Codex\s+CLI|Would you like to run the following command\?)\b/i;

export const CODEX_INTERNAL_PREFIXES = [
  'Running',
  'Ran',
  'You ran',
  'Edited',
  'Exploring',
  'Explored',
  'Read',
  'List',
  'Search',
  'Run',
  'Interacted with',
  'Waited for',
  'Proposed Command',
  'Updated Plan',
];

const CODEX_INTERNAL_LINE_PATTERNS = [
  /^Using\s+superpowers:/i,
  /^Instructions\s+say\b/i,
  /^(?:L\s+)?execution error:/i,
  /^참고로\s+시작\s+스킬\s+파일은\b/i,
  /^Write tests for @filename$/i,
  /^Searching the web$/i,
  /^Searched the web\b/i,
  /^Worked for\b/i,
  /^No exceptions without your human partner's permission\.$/i,
  /^Output$/i,
  /^Implement\s+\{feature\}$/i,
  /^(?:ing|ning|nning)\s+(?:Get-|Set-|Select-|Where-|ForEach-|rg\b|node\b|python\b|npm\b|npx\b|tsx\b|git\b)/i,
  /^(?:ent|tent|ontent)\s+-Raw\b/i,
];

export function commandLooksLikeCodex(command: string | undefined): boolean {
  return CODEX_COMMAND_RE.test(String(command || '').trim());
}

function outputLooksLikeCodex(output: string | undefined): boolean {
  return CODEX_OUTPUT_RE.test(normalizeAutomationStreamText(String(output || '')));
}

export function automationStreamContextLooksLikeCodex(context: AutomationStreamFilterContext = {}): boolean {
  return commandLooksLikeCodex(context.lastCommand) || outputLooksLikeCodex(context.recentOutput);
}

function isInternalProgressLine(line: string): boolean {
  const normalized = normalizeCodexLineForClassification(line);
  if (isAttachedCodexCommandLine(normalized)) return true;
  return (
    CODEX_INTERNAL_PREFIXES.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix} `) || normalized.startsWith(`${prefix}:`),
    ) || CODEX_INTERNAL_LINE_PATTERNS.some((pattern) => pattern.test(normalized))
  );
}

function isCodexTerminalChromeLine(line: string): boolean {
  if (/^›\s*/.test(line.trim())) return true;
  const normalized = normalizeCodexLineForClassification(line);
  if (!normalized) return true;
  if (/^[•.\-·\d\s]+$/.test(normalized)) return true;
  if (/^[╭╮╰╯│─┬┴┼\-\s]+$/.test(normalized)) return true;
  if (/^[│└]\s*/.test(line.trim())) return true;
  if (/^[✔□]\s+/.test(line.trim())) return true;
  if (/^…\s+\+\d+\s+lines\b/i.test(normalized)) return true;
  if (/^>_?\s*OpenAI Codex\b/i.test(normalized)) return true;
  if (/^(?:model|directory|permissions):\s+/i.test(normalized)) return true;
  if (/^Tip:\s+Try the Codex App\b/i.test(normalized)) return true;
  if (/^•?\s*Working(?:\s*\([^)]*\))?$/i.test(normalized)) return true;
  if (/^(?:\d+m\s*)?\d+s\s*•\s*esc\s*to\s*interr?upt\)?$/i.test(normalized)) return true;
  if (/^•?\s*(?:W|Wo|Wor|Work|Worki|Workin|orking|rking|king|ing|ng|g)\d*$/i.test(normalized)) return true;
  if (/^(?:B|Bo|Boo|Boot|Booti|Bootin|Booting(?:\s+MCP\b.*)?|ing MCP\b.*)$/i.test(normalized)) return true;
  if (/^\d+$/.test(normalized)) return true;
  if (/^gpt-[\w.-]+\s+[\s\S]*\bleft\b/i.test(normalized)) return true;
  if (/·\s+[\s\S]*\bleft\b/i.test(normalized)) return true;
  return false;
}

function isAttachedCodexCommandLine(normalized: string): boolean {
  const match = /^(Running|Ran)(\S[\s\S]*)$/i.exec(normalized);
  if (!match) return false;
  return looksLikeCodexCommandText(match[2]);
}

function looksLikeCodexCommandText(text: string): boolean {
  const normalized = text.trim();
  return /^(?:if\b|\$|\(|\[|'|"|\.?\\|\/|[A-Z]:\\|Get-|Set-|Select-|Where-|ForEach-|Measure-|New-|Remove-|Copy-|Move-|rg\b|node\b|python\b|py\b|npm\b|npx\b|tsx\b|git\b|cat\b|ls\b|dir\b|type\b|curl\b|pwsh\b|powershell\b|cmd\b)/i.test(
    normalized,
  );
}

function normalizeCodexLineForClassification(line: string): string {
  return line
    .replace(/^[›>\s]+/, '')
    .replace(/^[─\-\s]+/, '')
    .replace(/^•\s*/, '')
    .trim();
}

function normalizeCodexClientLine(line: string): string {
  return stripAttachedCodexNarrativePrefix(line)
    .replace(/^[\s]+/, '')
    .replace(/^•\s*/, '')
    .trim();
}

function stripAttachedCodexNarrativePrefix(line: string): string {
  const normalized = line.trim();
  const match = /^(Running|Ran)([A-Z가-힣][\s\S]*)$/.exec(normalized);
  if (!match) return line;
  if (looksLikeCodexCommandText(match[2])) return line;
  return match[2];
}

function isInternalText(text: string): boolean {
  const lines = cleanedAutomationStreamLines(text);
  return lines.length > 0 && lines.every((line) => isInternalProgressLine(line) || isCodexTerminalChromeLine(line));
}

function startsToolOutputContext(text: string): boolean {
  return cleanedAutomationStreamLines(text).some(isCodexToolOutputContextLeader);
}

function startsEditBlockContext(text: string): boolean {
  return cleanedAutomationStreamLines(text).some(isCodexEditedBlockContextLeader);
}

function isToolOutputContinuation(text: string): boolean {
  const lines = cleanedAutomationStreamLines(text);
  return (
    lines.length > 0 &&
    lines.every(
      (line) =>
        isInternalProgressLine(line) ||
        isCodexTerminalChromeLine(line) ||
        isCodexToolOutputLine(line) ||
        isCodexEditedBlockLine(line),
    )
  );
}

function isNarrativeBoundary(text: string): boolean {
  const streamText = filterCodexStreamText(text);
  if (!streamText) return false;
  const line = streamText.split('\n').find(Boolean)?.trim() ?? '';
  if (!line || line.length < 10) return false;
  if (/^[-*•□✔\d]+(?:\s|[.:])/.test(line)) return false;
  if (
    isCodexToolOutputLine(line) ||
    isCodexEditedBlockLine(line) ||
    isCodexTerminalChromeLine(line) ||
    isInternalProgressLine(line)
  )
    return false;
  if (/[가-힣]/.test(line)) {
    return /(?:습니다|겠습니다|입니다|합니다|됩니다|보겠습니다|확인|정리|결과|현재|오늘|내일|서울|대전|제주|좋겠습니다|필요합니다|가능성이|중심으로)/.test(
      line,
    );
  }
  return /^[A-Z][A-Za-z0-9 ,'"()[\].:;/-]{12,}[.!?]$/.test(line);
}

function isCodexToolOutputLine(line: string): boolean {
  const normalized = normalizeCodexLineForClassification(line);
  if (!normalized) return true;
  if (
    /^(?:[A-Za-z0-9_.\\/-]+\.(?:html|js|ts|tsx|css|md|json|xconj):\d+:|\d{1,6}:)(?:\s|$|<|\{|\}|\(|\)|["'])/.test(
      normalized,
    )
  )
    return true;
  if (/^(?:\.\\|\.\/|[A-Za-z]:\\|[A-Za-z0-9_.-]+\\)[^\s]+/.test(normalized)) return true;
  if (/^(?:design|guitar|assets|xcon|src|packages|providers|docs|examples)[\\/][^\s]+/i.test(normalized)) return true;
  if (
    /^(?:-a---|d----|Count\s+Name\b|FullName\b|Lines\s+Words\s+Characters\b|Line\s*\||Name\s+Source\b|Path\s+Exists\b)/i.test(
      normalized,
    )
  )
    return true;
  if (/^\|[~\s]/.test(normalized)) return true;
  if (/^"[\w.-]+":\s*/.test(normalized)) return true;
  if (/^name:\s*[\w.-]+/i.test(normalized)) return true;
  if (/^(?:ERROR|WARNING)\s+[\w./\\-]+/i.test(normalized)) return true;
  if (/^\S+\s+@\S+/.test(normalized)) return true;
  return false;
}

function isCodexEditedBlockContextLeader(line: string): boolean {
  const normalized = normalizeCodexLineForClassification(line);
  return /^Edited(?:\s|:|$)/i.test(normalized) || isCodexEditedBlockLine(line);
}

function isCodexEditedBlockLine(line: string): boolean {
  const normalized = normalizeCodexLineForClassification(line);
  if (!normalized) return true;
  if (isCodexCodeFragmentLine(normalized)) return true;
  if (isCodexClippedNumericArtifactLine(normalized)) return true;
  if (/^⋮+$/.test(normalized)) return true;
  if (/^@@\s/.test(normalized)) return true;
  if (/^\d+\s+[+-]\s?/.test(normalized)) return true;
  if (
    /^[+-]\s+(?:import|export|const|let|var|function|class|interface|type|enum|if|else|for|while|switch|case|return|await|async|try|catch|finally|throw|describe\(|test\(|it\(|expect\(|beforeEach\(|afterEach\(|[}\])];,]|<\/?|\/\/|\/\*)/i.test(
      normalized,
    )
  )
    return true;
  return /^\d+\s{2,}(?:import|export|from\b|const|let|var|function|class|interface|type|enum|if|else|for|while|switch|case|return|await|async|try|catch|finally|throw|new\s+|describe\(|test\(|it\(|expect\(|beforeEach\(|afterEach\(|[}\])];,]|<\/?|\/\/|\/\*|[\w.]+\(|[\w$]+:\s*)/i.test(
    normalized,
  );
}

function isCodexCodeFragmentLine(normalized: string): boolean {
  if (
    /^(?:import|export|from\b|const|let|var|function|class|interface|type|enum|if|else|for|while|switch|case|return|await|async|try|catch|finally|throw)\b/i.test(
      normalized,
    )
  )
    return true;
  if (/^(?:[}\])];,]+|[});,\]]+)$/.test(normalized)) return true;
  if (/^<\/?[A-Za-z][\w:-]*(?:\s|>|$)/.test(normalized)) return true;
  if (/^[{([]?\s*[A-Za-z_$][\w$]*(?:[.?!]\.?[\w$]+|\([^)]*\)|\s*=>)/.test(normalized)) return true;
  if (/^[A-Za-z_$][\w$]*:\s*(?:[A-Za-z_$][\w$]*[.(]|\{|\[|'|"|`|true\b|false\b|null\b|undefined\b)/.test(normalized))
    return true;
  if (/^[A-Za-z_$][\w$]*(?:\|[A-Za-z_$][\w$]*)+\|?$/.test(normalized)) return true;
  if (/[{}<>`]/.test(normalized) && /(?:=>|className=|key=|\$\{|<\/|\/>|\?\.)/.test(normalized)) return true;
  return false;
}

function isCodexClippedNumericArtifactLine(normalized: string): boolean {
  if (/^\d{1,6}[+-](?!\d)(?:\s|$|[A-Za-z_$()[\]{}"'`])/.test(normalized)) return true;
  if (!/^\d{1,4}[a-z][A-Za-z0-9_.-]*/.test(normalized) || /[가-힣]/.test(normalized)) return false;
  return /(?:connection-refused|signature|elapsedms|tool:|server|app_|guards|worki|readiness|failed|error|timeout|result|content|context|workspace)/i.test(
    normalized,
  );
}

function isCodexToolOutputContextLeader(line: string): boolean {
  const normalized = normalizeCodexLineForClassification(line);
  const attached = /^(Running|Ran)(\S[\s\S]*)$/i.exec(normalized);
  if (attached && looksLikeCodexCommandText(attached[2])) return true;
  const ran = /^Ran(?:\s|:)+([\s\S]+)$/i.exec(normalized);
  if (ran && looksLikeCodexCommandText(ran[1])) return true;
  return /^Runningif\b/i.test(normalized);
}

function extractUserInputEcho(text: string): string {
  const prompts = cleanedAutomationStreamLines(text)
    .map((line) => /^›\s*([\s\S]+)$/.exec(line)?.[1]?.trim() ?? '')
    .filter((line) => line && !isCodexPromptPlaceholder(line))
    .filter(Boolean);
  return prompts.join('\n');
}

function isCodexPromptPlaceholder(line: string): boolean {
  return /^Write tests for @filename$/i.test(line.trim());
}

function filterCodexStreamText(text: string): string {
  return cleanedAutomationStreamLines(text)
    .filter(
      (line) =>
        !isInternalProgressLine(line) &&
        !isCodexTerminalChromeLine(line) &&
        !isCodexToolOutputLine(line) &&
        !isCodexEditedBlockLine(line),
    )
    .map(normalizeCodexClientLine)
    .filter((line) => line.length > 0)
    .join('\n');
}

export function createCodexAutomationStreamFilterAdapter(): AutomationStreamFilterAdapter {
  return {
    id: 'codex',
    label: 'Codex',
    detect: automationStreamContextLooksLikeCodex,
    filterText: filterCodexStreamText,
    isInternalText,
    startsToolOutputContext,
    startsEditBlockContext,
    isToolOutputContinuation,
    isNarrativeBoundary,
    extractUserInputEcho,
  };
}

export const createAutomationStreamFilterAdapter = createCodexAutomationStreamFilterAdapter;
