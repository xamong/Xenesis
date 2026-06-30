export function normalizeVaultPath(value: string): string {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
}

export function notePathWithoutExtension(value: string): string {
  return normalizeVaultPath(value).replace(/\.(?:md|markdown)$/i, '');
}

export function basenameWithoutMarkdownExtension(value: string): string {
  const path = notePathWithoutExtension(value);
  return path.split('/').pop() || path;
}

export function normalizeLookupKey(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\.(?:md|markdown)$/i, '')
    .toLowerCase();
}

export function slugHeading(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

export function isVaultInternalRelativePath(value: string): boolean {
  const text = String(value || '')
    .trim()
    .replace(/\\/g, '/');
  if (!text || /^[a-z]+:/i.test(text) || text.startsWith('/') || text.includes('\0')) return false;
  const parts = text.split('/').filter(Boolean);
  return !parts.includes('..');
}
