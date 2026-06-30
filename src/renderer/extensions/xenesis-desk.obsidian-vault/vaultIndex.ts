import {
  basenameWithoutMarkdownExtension,
  isVaultInternalRelativePath,
  normalizeLookupKey,
  normalizeVaultPath,
  notePathWithoutExtension,
  slugHeading,
} from './vaultPath';
import type {
  VaultAttachmentRef,
  VaultDiagnostic,
  VaultFileRecord,
  VaultHeading,
  VaultIndex,
  VaultNote,
  VaultRef,
  VaultResolvedLink,
  VaultUnresolvedLink,
  VaultWikiLink,
} from './vaultTypes';

type LookupResult = { status: 'ok'; noteId: string } | { status: 'missing' | 'ambiguous' };

export function createVaultIndex(vault: VaultRef, files: VaultFileRecord[]): VaultIndex {
  const diagnostics: VaultDiagnostic[] = [];
  const notes = new Map<string, VaultNote>();
  const titleIndex = new Map<string, string[]>();
  const aliasIndex = new Map<string, string[]>();
  const pathIndex = new Map<string, string[]>();

  for (const file of files) {
    const note = parseVaultNote(vault, file, diagnostics);
    notes.set(note.id, note);
    addIndex(pathIndex, normalizeLookupKey(note.id), note.id);
    addIndex(pathIndex, normalizeLookupKey(notePathWithoutExtension(note.id)), note.id);
    addIndex(titleIndex, normalizeLookupKey(note.title), note.id);
    addIndex(titleIndex, normalizeLookupKey(basenameWithoutMarkdownExtension(note.id)), note.id);
    for (const alias of note.aliases) addIndex(aliasIndex, normalizeLookupKey(alias), note.id);
  }

  recordDuplicateDiagnostics(titleIndex, diagnostics, 'duplicate-title');
  recordDuplicateDiagnostics(aliasIndex, diagnostics, 'duplicate-alias');

  const links: VaultResolvedLink[] = [];
  const unresolvedLinks: VaultUnresolvedLink[] = [];
  const backlinks = new Map<string, VaultResolvedLink[]>(Array.from(notes.keys(), (id) => [id, []]));
  const tags = new Map<string, string[]>();

  for (const note of notes.values()) {
    for (const tag of note.tags) {
      const key = tag.toLowerCase();
      tags.set(key, [...(tags.get(key) || []), note.id]);
    }

    for (const link of note.links) {
      const resolved = resolveWikiTarget(link.target, pathIndex, titleIndex, aliasIndex);
      if (resolved.status === 'ok') {
        const item: VaultResolvedLink = {
          source: note.id,
          target: resolved.noteId,
          rawTarget: link.target,
          label: link.label,
          heading: link.heading,
          resolved: true,
          type: 'wiki',
        };
        links.push(item);
        backlinks.get(resolved.noteId)?.push(item);
      } else {
        unresolvedLinks.push({
          source: note.id,
          rawTarget: link.target,
          label: link.label,
          heading: link.heading,
          reason: resolved.status,
        });
        if (resolved.status === 'ambiguous') {
          diagnostics.push({
            code: 'ambiguous-link',
            severity: 'warning',
            path: note.id,
            value: link.target,
            message: `Ambiguous wikilink: ${link.target}`,
          });
        }
      }
    }
  }

  const connected = new Set<string>();
  for (const link of links) {
    connected.add(link.source);
    connected.add(link.target);
  }
  const orphanNoteIds = new Set(Array.from(notes.keys()).filter((id) => !connected.has(id)));

  return { vault, notes, links, backlinks, tags, unresolvedLinks, orphanNoteIds, diagnostics };
}

function parseVaultNote(vault: VaultRef, file: VaultFileRecord, diagnostics: VaultDiagnostic[]): VaultNote {
  const path = normalizeVaultPath(file.path);
  const parsed = parseFrontmatter(file.content);
  for (const warning of parsed.warnings) {
    diagnostics.push({ code: 'frontmatter-warning', severity: 'warning', path, message: warning });
  }
  const headings = extractHeadings(parsed.body);
  const title = headings[0]?.text || basenameWithoutMarkdownExtension(path);
  const aliases = normalizeStringArray(parsed.frontmatter.aliases || parsed.frontmatter.alias);
  const frontmatterTags = normalizeStringArray(parsed.frontmatter.tags || parsed.frontmatter.tag);
  const bodyTags = extractBodyTags(parsed.body);
  const tags = uniqueStrings([...frontmatterTags, ...bodyTags]);

  return {
    id: path,
    vaultId: vault.id,
    path,
    absolutePath: file.absolutePath,
    title,
    body: parsed.body,
    frontmatter: parsed.frontmatter,
    aliases,
    tags,
    headings,
    links: extractWikiLinks(parsed.body),
    attachments: extractAttachments(parsed.body, diagnostics, path),
    modifiedAt: file.modifiedAt,
    sizeBytes: file.sizeBytes,
    warnings: parsed.warnings,
  };
}

function parseFrontmatter(content: string): {
  body: string;
  frontmatter: Record<string, unknown>;
  warnings: string[];
} {
  const source = String(content || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n');
  if (!source.startsWith('---\n')) return { body: source, frontmatter: {}, warnings: [] };
  const close = source.indexOf('\n---', 4);
  if (close < 0) return { body: source, frontmatter: {}, warnings: ['Frontmatter block is not closed.'] };
  const block = source.slice(4, close).trim();
  const frontmatter: Record<string, unknown> = {};
  const warnings: string[] = [];
  for (const line of block.split('\n')) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) {
      warnings.push(`Ignored frontmatter line: ${line}`);
      continue;
    }
    frontmatter[match[1]] = parseFrontmatterValue(match[2]);
  }
  const bodyStart = source.indexOf('\n', close + 1);
  return { body: bodyStart >= 0 ? source.slice(bodyStart + 1) : '', frontmatter, warnings };
}

function parseFrontmatterValue(raw: string): unknown {
  const value = raw.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return value.replace(/^["']|["']$/g, '');
}

function extractWikiLinks(body: string): VaultWikiLink[] {
  const links: VaultWikiLink[] = [];
  const pattern = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
  for (const match of String(body || '').matchAll(pattern)) {
    const target = match[1].trim();
    const heading = match[2]?.trim();
    links.push({
      target,
      heading,
      label: (match[3] || match[1]).trim(),
      index: match.index || 0,
    });
  }
  return links;
}

function extractAttachments(body: string, diagnostics: VaultDiagnostic[], notePath: string): VaultAttachmentRef[] {
  const result: VaultAttachmentRef[] = [];
  for (const match of String(body || '').matchAll(/!\[\[([^\]]+)\]\]/g)) {
    result.push(toAttachment('embed', match[1], undefined, diagnostics, notePath));
  }
  for (const match of String(body || '').matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)) {
    result.push(toAttachment('image', match[2], match[1], diagnostics, notePath));
  }
  for (const match of String(body || '').matchAll(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g)) {
    result.push(toAttachment('file', match[2], match[1], diagnostics, notePath));
  }
  return result;
}

function toAttachment(
  kind: VaultAttachmentRef['kind'],
  rawTarget: string,
  label: string | undefined,
  diagnostics: VaultDiagnostic[],
  notePath: string,
): VaultAttachmentRef {
  const target = String(rawTarget || '')
    .trim()
    .replace(/^<|>$/g, '');
  const safe = isVaultInternalRelativePath(target);
  if (!safe) {
    diagnostics.push({
      code: 'unsafe-attachment',
      severity: 'warning',
      path: notePath,
      value: target,
      message: `Attachment path is outside the vault boundary: ${target}`,
    });
  }
  return { kind, target, label, resolvedPath: safe ? normalizeVaultPath(target) : '', safe };
}

function extractBodyTags(body: string): string[] {
  return Array.from(String(body || '').matchAll(/(^|[\s(])#([A-Za-z][A-Za-z0-9/_-]*)/g), (match) => match[2]);
}

function extractHeadings(body: string): VaultHeading[] {
  return String(body || '')
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = /^(#{1,6})\s+(.+)$/.exec(line);
      return match ? [{ depth: match[1].length, text: match[2].trim(), slug: slugHeading(match[2]) }] : [];
    });
}

function addIndex(index: Map<string, string[]>, key: string, id: string): void {
  if (!key) return;
  const existing = index.get(key);
  if (existing) {
    if (!existing.includes(id)) existing.push(id);
  } else {
    index.set(key, [id]);
  }
}

function recordDuplicateDiagnostics(
  index: Map<string, string[]>,
  diagnostics: VaultDiagnostic[],
  code: 'duplicate-title' | 'duplicate-alias',
): void {
  for (const [value, ids] of index) {
    if (ids.length < 2) continue;
    diagnostics.push({
      code,
      severity: 'warning',
      value,
      message: `${code === 'duplicate-title' ? 'Duplicate title' : 'Duplicate alias'}: ${value}`,
    });
  }
}

function resolveWikiTarget(
  target: string,
  pathIndex: Map<string, string[]>,
  titleIndex: Map<string, string[]>,
  aliasIndex: Map<string, string[]>,
): LookupResult {
  const key = normalizeLookupKey(target.split('#')[0]);
  const matches = uniqueStrings([...(pathIndex.get(key) || []), ...(titleIndex.get(key) || []), ...(aliasIndex.get(key) || [])]);
  if (matches.length === 1) return { status: 'ok', noteId: matches[0] };
  if (matches.length > 1) return { status: 'ambiguous' };
  return { status: 'missing' };
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return uniqueStrings(value.map((item) => String(item).trim()).filter(Boolean));
  if (typeof value === 'string') {
    return uniqueStrings(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }
  return [];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
