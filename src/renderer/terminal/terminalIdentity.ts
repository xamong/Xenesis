export function shortTerminalId(termId: string, length = 8): string {
  const normalized = String(termId || '').trim();
  return normalized ? normalized.slice(0, length) : '';
}

export function terminalIdentityTitle(title: string, termId: string): string {
  const normalizedTitle = String(title || '').trim() || 'Terminal';
  const normalizedTermId = String(termId || '').trim();
  return normalizedTermId ? `${normalizedTitle}\ntermId: ${normalizedTermId}` : normalizedTitle;
}
