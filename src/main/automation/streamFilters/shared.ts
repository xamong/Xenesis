const ANSI_RE = /\x1b(?:\][^\x07]*(?:\x07|\x1b\\)|\[[0-?]*[ -/]*[@-~]|[@-Z\\-_])/g;

export function stripTerminalControlSequences(text: string): string {
  return text.replace(ANSI_RE, '').replace(/\x1b/g, '').replace(/\r/g, '\n');
}

export function normalizeAutomationStreamText(text: string): string {
  return stripTerminalControlSequences(String(text || ''));
}

export function cleanedAutomationStreamLines(text: string): string[] {
  return normalizeAutomationStreamText(String(text || ''))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function extractGenericPromptEchoLine(line: string): string {
  return /^[>›]\s*([\s\S]+)$/.exec(line.trim())?.[1]?.trim() ?? '';
}

export function isDecorativeOnlyLine(line: string): boolean {
  const normalized = line.trim();
  if (!normalized) return true;
  if (/^[•.\-·\d\s]+$/.test(normalized)) return true;
  if (/^[╭╮╰╯│─┬┴┼\-\s]+$/.test(normalized)) return true;
  return false;
}
