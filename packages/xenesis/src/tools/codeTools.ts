import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { z } from 'zod';
import { assertExistingPathInsideWorkspace } from '../utils/workspace.js';
import type { Tool } from './types.js';

const symbolsInput = z.object({
  path: z.string().min(1),
});

interface SymbolRecord {
  path?: string;
  line: number;
  kind: string;
  name: string;
}

const patterns: Array<{ kind: string; pattern: RegExp }> = [
  { kind: 'class', pattern: /^(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'function', pattern: /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'interface', pattern: /^(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'type', pattern: /^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/ },
  { kind: 'const', pattern: /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)/ },
];

function extractSymbols(content: string): SymbolRecord[] {
  return content.split(/\r?\n/).flatMap((line, index) => {
    for (const entry of patterns) {
      const match = line.match(entry.pattern);
      if (match) return [{ line: index + 1, kind: entry.kind, name: match[1] }];
    }
    return [];
  });
}

const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const ignoredDirectories = new Set(['.git', '.xenesis', 'dist', 'node_modules']);
const MAX_SYMBOL_FILES = 200;

async function collectCodeFiles(workspaceRoot: string, root: string, current: string, files: string[]): Promise<void> {
  if (files.length >= MAX_SYMBOL_FILES) return;

  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (files.length >= MAX_SYMBOL_FILES) return;
    const absolutePath = join(current, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await collectCodeFiles(workspaceRoot, root, absolutePath, files);
      }
      continue;
    }
    if (!entry.isFile() || !codeExtensions.has(extname(entry.name))) continue;

    try {
      await assertExistingPathInsideWorkspace(workspaceRoot, absolutePath);
      files.push(absolutePath);
    } catch {
      // Skip symlink escapes or files that cannot be safely resolved inside the workspace.
    }
  }
}

function formatSymbol(symbol: SymbolRecord) {
  const prefix = symbol.path ? `${symbol.path}:` : '';
  return `${prefix}${symbol.line}: ${symbol.kind} ${symbol.name}`;
}

export const codeSymbolsTool: Tool<z.infer<typeof symbolsInput>, SymbolRecord[]> = {
  name: 'code_symbols',
  description: 'List top-level code symbols in a workspace file or directory with line numbers.',
  inputSchema: symbolsInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const path = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path);
    const pathStat = await stat(path);
    let symbols: SymbolRecord[];

    if (pathStat.isDirectory()) {
      const files: string[] = [];
      await collectCodeFiles(context.workspaceRoot, path, path, files);
      symbols = (
        await Promise.all(
          files.map(async (file) => {
            const relativePath = relative(context.workspaceRoot, file).replace(/\\/g, '/');
            return extractSymbols(await readFile(file, 'utf8')).map((symbol) => ({
              ...symbol,
              path: relativePath,
            }));
          }),
        )
      ).flat();
    } else {
      symbols = extractSymbols(await readFile(path, 'utf8'));
    }

    return {
      ok: true,
      content: symbols.length > 0 ? symbols.map(formatSymbol).join('\n') : 'No symbols.',
      data: symbols,
    };
  },
};
