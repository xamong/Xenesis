import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { z } from 'zod';
import { assertExistingPathInsideWorkspace } from '../utils/workspace.js';
import type { Tool } from './types.js';

const symbolName = z
  .string()
  .min(1)
  .regex(/^[A-Za-z_$][\w$]*$/);

const documentSymbolsInput = z.object({
  action: z.literal('document_symbols'),
  path: z.string().min(1),
});

const definitionInput = z.object({
  action: z.literal('definition'),
  symbol: symbolName,
  path: z.string().min(1).nullable().optional(),
});

const referencesInput = z.object({
  action: z.literal('references'),
  symbol: symbolName,
  path: z.string().min(1).nullable().optional(),
  maxResults: z.number().int().positive().max(200).nullable().optional(),
});

const lspInput = z.discriminatedUnion('action', [documentSymbolsInput, definitionInput, referencesInput]);

const lspOpenAIInput = z.object({
  action: z.enum(['document_symbols', 'definition', 'references']),
  path: z.string().nullable(),
  symbol: z.string().nullable(),
  maxResults: z.number().int().positive().max(200).nullable(),
});

type LspInput = z.infer<typeof lspInput>;

interface LspPosition {
  line: number;
  character: number;
}

interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

interface LspSymbolRecord {
  path: string;
  name: string;
  kind: string;
  range: LspRange;
}

interface LspReferenceRecord {
  path: string;
  range: LspRange;
  text: string;
}

const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const ignoredDirectories = new Set(['.git', '.xenesis', 'dist', 'node_modules']);
const maxCodeFiles = 500;

const declarationPatterns: Array<{ kind: string; pattern: RegExp }> = [
  { kind: 'class', pattern: /^\s*(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'function', pattern: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'interface', pattern: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'type', pattern: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'enum', pattern: /^\s*(?:export\s+)?enum\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'const', pattern: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/ },
];

function isCodeFile(path: string) {
  return codeExtensions.has(extname(path));
}

async function collectCodeFiles(workspaceRoot: string, requestedPath?: string): Promise<string[]> {
  const root =
    requestedPath === undefined
      ? await assertExistingPathInsideWorkspace(workspaceRoot, '.')
      : await assertExistingPathInsideWorkspace(workspaceRoot, requestedPath);
  const rootStat = await stat(root);

  if (rootStat.isFile()) return isCodeFile(root) ? [root] : [];
  if (!rootStat.isDirectory()) return [];

  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    if (files.length >= maxCodeFiles) return;

    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (files.length >= maxCodeFiles) return;
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) await visit(absolutePath);
        continue;
      }
      if (!entry.isFile() || !isCodeFile(absolutePath)) continue;

      try {
        files.push(await assertExistingPathInsideWorkspace(workspaceRoot, absolutePath));
      } catch {
        // Skip symlink escapes or files that cannot be safely resolved inside the workspace.
      }
    }
  }

  await visit(root);
  return files;
}

function relativePath(workspaceRoot: string, absolutePath: string) {
  return relative(workspaceRoot, absolutePath).replace(/\\/g, '/') || '.';
}

function rangeForName(lineIndex: number, line: string, name: string): LspRange {
  const character = Math.max(0, line.indexOf(name));
  return {
    start: { line: lineIndex, character },
    end: { line: lineIndex, character: character + name.length },
  };
}

function extractDocumentSymbols(content: string, path: string): LspSymbolRecord[] {
  const lines = content.split(/\r?\n/);
  const records: LspSymbolRecord[] = [];

  lines.forEach((line, lineIndex) => {
    for (const declaration of declarationPatterns) {
      const match = line.match(declaration.pattern);
      if (!match) continue;
      const name = match[1];
      records.push({
        path,
        name,
        kind: declaration.kind,
        range: rangeForName(lineIndex, line, name),
      });
      break;
    }
  });

  return records;
}

function wordRegex(symbol: string) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_$])(${escaped})(?![A-Za-z0-9_$])`, 'g');
}

function extractReferences(content: string, path: string, symbol: string): LspReferenceRecord[] {
  const lines = content.split(/\r?\n/);
  const records: LspReferenceRecord[] = [];

  lines.forEach((line, lineIndex) => {
    const pattern = wordRegex(symbol);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const character = match.index + match[1].length;
      records.push({
        path,
        range: {
          start: { line: lineIndex, character },
          end: { line: lineIndex, character: character + symbol.length },
        },
        text: line.trim(),
      });
    }
  });

  return records;
}

function formatLocation(record: { path: string; range: LspRange }) {
  return `${record.path}:${record.range.start.line + 1}:${record.range.start.character + 1}`;
}

function formatSymbol(record: LspSymbolRecord) {
  return `${formatLocation(record)} ${record.kind} ${record.name}`;
}

function formatReference(record: LspReferenceRecord) {
  return `${formatLocation(record)} ${record.text}`;
}

async function documentSymbols(workspaceRoot: string, path: string) {
  const absolutePath = await assertExistingPathInsideWorkspace(workspaceRoot, path);
  const relative = relativePath(workspaceRoot, absolutePath);
  const symbols = extractDocumentSymbols(await readFile(absolutePath, 'utf8'), relative);
  return {
    ok: true,
    content: symbols.length > 0 ? symbols.map(formatSymbol).join('\n') : 'No symbols.',
    data: symbols,
  };
}

async function definitions(workspaceRoot: string, input: Extract<LspInput, { action: 'definition' }>) {
  const files = await collectCodeFiles(workspaceRoot, input.path ?? undefined);
  const symbols = (
    await Promise.all(
      files.map(async (file) => {
        const path = relativePath(workspaceRoot, file);
        return extractDocumentSymbols(await readFile(file, 'utf8'), path);
      }),
    )
  )
    .flat()
    .filter((symbol) => symbol.name === input.symbol);

  return {
    ok: true,
    content: symbols.length > 0 ? symbols.map(formatSymbol).join('\n') : `No definition found for ${input.symbol}.`,
    data: symbols,
  };
}

async function references(workspaceRoot: string, input: Extract<LspInput, { action: 'references' }>) {
  const files = await collectCodeFiles(workspaceRoot, input.path ?? undefined);
  const references = (
    await Promise.all(
      files.map(async (file) => {
        const path = relativePath(workspaceRoot, file);
        return extractReferences(await readFile(file, 'utf8'), path, input.symbol);
      }),
    )
  )
    .flat()
    .slice(0, input.maxResults ?? 50);

  return {
    ok: true,
    content:
      references.length > 0 ? references.map(formatReference).join('\n') : `No references found for ${input.symbol}.`,
    data: references,
  };
}

export const lspTool: Tool<LspInput, LspSymbolRecord[] | LspReferenceRecord[]> = {
  name: 'lsp',
  description: 'Inspect workspace code with LSP-style read-only actions: document_symbols, definition, and references.',
  inputSchema: lspInput,
  openaiInputSchema: lspOpenAIInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    try {
      if (input.action === 'document_symbols') return await documentSymbols(context.workspaceRoot, input.path);
      if (input.action === 'definition') return await definitions(context.workspaceRoot, input);
      return await references(context.workspaceRoot, input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, content: `LSP tool failed: ${message}` };
    }
  },
};
