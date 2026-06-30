import type { Dirent } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, extname, isAbsolute, join, parse, relative, resolve } from 'node:path';
import { isPathInside } from '../../../utils/workspace.js';
import type { ContextSourceAdapter } from '../ContextOrchestrator.js';
import { type ContextRecord, createContextRecord } from '../ContextRecord.js';

export type InstructionSourceType = 'managed' | 'user' | 'project' | 'local';
export type InstructionFormat = 'xenesis' | 'agents' | 'compat';

export interface InstructionFile {
  path: string;
  relativePath: string;
  sourceType: InstructionSourceType;
  format: InstructionFormat;
  content: string;
  globs?: string[];
  parent?: string;
  contentDiffersFromDisk: boolean;
}

interface InternalInstructionFile extends InstructionFile {
  baseDir: string;
}

export interface DiscoverInstructionFilesOptions {
  workspaceRoot: string;
  cwd: string;
  homeDir?: string;
  managedFiles?: string[];
  managedRulesDirs?: string[];
  userFiles?: string[];
  userRulesDirs?: string[];
  includeExternal?: boolean;
  targetPath?: string;
}

export interface InstructionContextAdapterOptions extends DiscoverInstructionFilesOptions {
  now?: Date;
  tokenPriorityBase?: number;
}

interface ProcessInstructionFileOptions {
  workspaceRoot: string;
  filePath: string;
  baseDir: string;
  sourceType: InstructionSourceType;
  format: InstructionFormat;
  processedPaths: Set<string>;
  includeExternal: boolean;
  homeDir: string;
  depth?: number;
  parent?: string;
}

interface ParsedInstructionContent {
  content: string;
  globs?: string[];
  contentDiffersFromDisk: boolean;
  includePaths: string[];
}

const maxIncludeDepth = 5;

const textFileExtensionGroups = {
  instructions: ['.md', '.mdx', '.txt', '.text', '.rst', '.adoc', '.asciidoc', '.org'],
  data: [
    '.json',
    '.jsonc',
    '.yaml',
    '.yml',
    '.toml',
    '.xml',
    '.csv',
    '.ini',
    '.cfg',
    '.conf',
    '.config',
    '.properties',
  ],
  web: [
    '.html',
    '.htm',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.vue',
    '.svelte',
    '.astro',
    '.ejs',
    '.hbs',
    '.pug',
    '.jade',
  ],
  javascript: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.mts', '.cts'],
  systems: [
    '.c',
    '.h',
    '.cc',
    '.cpp',
    '.cxx',
    '.hpp',
    '.hxx',
    '.cs',
    '.go',
    '.rs',
    '.swift',
    '.java',
    '.kt',
    '.kts',
    '.scala',
  ],
  scripts: ['.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd', '.py', '.pyi', '.pyw', '.rb', '.erb', '.rake'],
  runtimes: [
    '.php',
    '.pl',
    '.pm',
    '.lua',
    '.r',
    '.dart',
    '.ex',
    '.exs',
    '.erl',
    '.hrl',
    '.clj',
    '.cljs',
    '.cljc',
    '.edn',
  ],
  functional: ['.hs', '.lhs', '.elm', '.ml', '.mli', '.f', '.f90', '.f95', '.for'],
  buildAndQuery: ['.cmake', '.make', '.makefile', '.gradle', '.sbt', '.sql', '.graphql', '.gql', '.proto', '.env'],
  reviewArtifacts: ['.tex', '.latex', '.lock', '.log', '.diff', '.patch'],
} as const;

const textFileExtensions = new Set<string>(Object.values(textFileExtensionGroups).flat());

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, '/');
}

function normalizePathForComparison(value: string) {
  const resolved = resolve(value);
  return process.platform === 'win32' ? normalizeSlashes(resolved).toLowerCase() : normalizeSlashes(resolved);
}

function relativeInstructionPath(workspaceRoot: string, filePath: string) {
  const resolvedWorkspace = resolve(workspaceRoot);
  const resolvedFile = resolve(filePath);
  if (!isPathInside(resolvedWorkspace, resolvedFile)) return normalizeSlashes(resolvedFile);
  return normalizeSlashes(relative(resolvedWorkspace, resolvedFile)) || '.';
}

function isTextInstructionPath(filePath: string) {
  const ext = extname(filePath).toLowerCase();
  return ext.length === 0 || textFileExtensions.has(ext);
}

function isExpectedMissingOrUnreadable(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined;
  return code === 'ENOENT' || code === 'EISDIR' || code === 'ENOTDIR' || code === 'EACCES';
}

function parseFrontmatter(rawContent: string): { content: string; paths?: string[] } {
  const normalized = rawContent.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return { content: rawContent };

  const closingIndex = normalized.indexOf('\n---\n', 4);
  if (closingIndex === -1) return { content: rawContent };

  const frontmatter = normalized.slice(4, closingIndex);
  const content = normalized.slice(closingIndex + '\n---\n'.length);
  const paths = parseFrontmatterPaths(frontmatter);
  return paths ? { content, paths } : { content };
}

function parseFrontmatterPaths(frontmatter: string) {
  const lines = frontmatter.split('\n');
  const values: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const match = line.match(/^\s*paths\s*:\s*(.*)$/);
    if (!match) continue;

    const inline = match[1]?.trim() ?? '';
    if (inline.startsWith('[') && inline.endsWith(']')) {
      values.push(...inline.slice(1, -1).split(','));
      continue;
    }
    if (inline.length > 0) {
      values.push(...inline.split(','));
      continue;
    }

    for (let childIndex = index + 1; childIndex < lines.length; childIndex += 1) {
      const child = lines[childIndex] ?? '';
      if (!/^\s+[-]/.test(child)) break;
      values.push(child.replace(/^\s*-\s*/, ''));
      index = childIndex;
    }
  }

  const normalized = values
    .map((value) => value.trim().replace(/^["']|["']$/g, ''))
    .map((value) => (value.endsWith('/**') ? value.slice(0, -3) : value))
    .filter((value) => value.length > 0);

  if (normalized.length === 0 || normalized.every((value) => value === '**')) return undefined;
  return normalized;
}

function stripBlockHtmlComments(content: string) {
  if (!content.includes('<!--')) return { content, stripped: false };

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let inFence = false;
  let fenceMarker: string | undefined;
  let inComment = false;
  let stripped = false;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const fence = trimmed.match(/^(```+|~~~+)/)?.[1];
    if (!inComment && fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence.slice(0, 3);
      } else if (fenceMarker && fence.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = undefined;
      }
      output.push(line);
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    if (inComment) {
      stripped = true;
      const end = line.indexOf('-->');
      if (end === -1) continue;
      inComment = false;
      const residue = line.slice(end + 3);
      if (residue.trim().length > 0) output.push(residue);
      continue;
    }

    if (trimmed.startsWith('<!--')) {
      stripped = true;
      const end = line.indexOf('-->');
      if (end === -1) {
        inComment = true;
        continue;
      }
      const residue = line.replace(/<!--[\s\S]*?-->/g, '');
      if (residue.trim().length > 0) output.push(residue);
      continue;
    }

    output.push(line);
  }

  return { content: output.join('\n'), stripped };
}

function removeInlineCodeSpans(line: string) {
  return line.replace(/`[^`]*`/g, '');
}

function isWindowsAbsolutePath(value: string) {
  return /^[A-Za-z]:[\\/]/.test(value) || /^\\\\[^\\]/.test(value);
}

function isValidIncludePath(value: string) {
  return (
    value.startsWith('./') ||
    value.startsWith('../') ||
    value.startsWith('~/') ||
    (value.startsWith('/') && value !== '/') ||
    isWindowsAbsolutePath(value) ||
    (!value.startsWith('@') && !/^[#%^&*()]+/.test(value) && /^[a-zA-Z0-9._-]/.test(value))
  );
}

function resolveIncludePath(includePath: string, basePath: string, homeDir: string) {
  if (includePath.startsWith('~/')) return resolve(homeDir, includePath.slice(2));
  if (isWindowsAbsolutePath(includePath) || isAbsolute(includePath)) return resolve(includePath);
  return resolve(dirname(basePath), includePath);
}

function extractIncludePaths(content: string, basePath: string, homeDir: string) {
  const paths = new Set<string>();
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let inFence = false;
  let fenceMarker: string | undefined;
  const includeRegex = /(?:^|\s)@((?:[^\s]|\\ )+)/g;

  for (const line of lines) {
    const trimmed = line.trimStart();
    const fence = trimmed.match(/^(```+|~~~+)/)?.[1];
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence.slice(0, 3);
      } else if (fenceMarker && fence.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = undefined;
      }
      continue;
    }
    if (inFence) continue;

    const searchable = removeInlineCodeSpans(line);
    let match: RegExpExecArray | null;
    while ((match = includeRegex.exec(searchable)) !== null) {
      let includePath = match[1];
      if (!includePath) continue;

      const hashIndex = includePath.indexOf('#');
      if (hashIndex !== -1) includePath = includePath.slice(0, hashIndex);
      includePath = includePath.replace(/\\ /g, ' ');
      if (!includePath || !isValidIncludePath(includePath)) continue;
      paths.add(resolveIncludePath(includePath, basePath, homeDir));
    }
  }

  return [...paths];
}

function parseInstructionContent(rawContent: string, filePath: string, homeDir: string): ParsedInstructionContent {
  const parsed = parseFrontmatter(rawContent);
  const stripped = stripBlockHtmlComments(parsed.content);
  const includePaths = extractIncludePaths(stripped.content, filePath, homeDir);
  return {
    content: stripped.content,
    ...(parsed.paths ? { globs: parsed.paths } : {}),
    contentDiffersFromDisk: stripped.content !== rawContent,
    includePaths,
  };
}

function canIncludePath(workspaceRoot: string, includePath: string, includeExternal: boolean) {
  return includeExternal || isPathInside(workspaceRoot, includePath);
}

async function processInstructionFile(options: ProcessInstructionFileOptions): Promise<InternalInstructionFile[]> {
  const depth = options.depth ?? 0;
  const normalizedPath = normalizePathForComparison(options.filePath);
  if (options.processedPaths.has(normalizedPath) || depth >= maxIncludeDepth) return [];
  options.processedPaths.add(normalizedPath);

  if (!isTextInstructionPath(options.filePath)) return [];

  let rawContent: string;
  try {
    const stats = await stat(options.filePath);
    if (!stats.isFile()) return [];
    rawContent = await readFile(options.filePath, 'utf8');
  } catch (error) {
    if (isExpectedMissingOrUnreadable(error)) return [];
    throw error;
  }

  const parsed = parseInstructionContent(rawContent, options.filePath, options.homeDir);
  if (parsed.content.trim().length === 0) return [];

  const file: InternalInstructionFile = {
    path: resolve(options.filePath),
    relativePath: relativeInstructionPath(options.workspaceRoot, options.filePath),
    sourceType: options.sourceType,
    format: options.format,
    content: parsed.content,
    ...(parsed.globs ? { globs: parsed.globs } : {}),
    ...(options.parent ? { parent: options.parent } : {}),
    contentDiffersFromDisk: parsed.contentDiffersFromDisk,
    baseDir: options.baseDir,
  };
  const result: InternalInstructionFile[] = [file];

  for (const includePath of parsed.includePaths) {
    if (!canIncludePath(options.workspaceRoot, includePath, options.includeExternal)) continue;
    result.push(
      ...(await processInstructionFile({
        ...options,
        filePath: includePath,
        baseDir: dirname(includePath),
        depth: depth + 1,
        parent: options.filePath,
      })),
    );
  }

  return result;
}

function formatForPath(filePath: string): InstructionFormat {
  const normalized = normalizeSlashes(filePath).toLowerCase();
  if (normalized.endsWith('/agents.md')) return 'agents';
  if (
    normalized.includes('/.xenesis/') ||
    normalized.endsWith('/xenesis.md') ||
    normalized.endsWith('/xenesis.local.md')
  ) {
    return 'xenesis';
  }
  return 'compat';
}

function instructionPriorityOffset(file: InstructionFile, index: number) {
  const sourceOffset: Record<InstructionSourceType, number> = {
    managed: 0,
    project: 0,
    user: 0.6,
    local: 0.8,
  };
  const formatOffset: Record<InstructionFormat, number> = {
    compat: 0,
    xenesis: 0.3,
    agents: 0.4,
  };
  return sourceOffset[file.sourceType] + formatOffset[file.format] + index / 1_000_000;
}

async function processExplicitFile(
  result: InternalInstructionFile[],
  options: DiscoverInstructionFilesOptions,
  processedPaths: Set<string>,
  filePath: string,
  sourceType: InstructionSourceType,
  includeExternal: boolean,
  format = formatForPath(filePath),
  baseDir = dirname(filePath),
) {
  result.push(
    ...(await processInstructionFile({
      workspaceRoot: options.workspaceRoot,
      filePath,
      baseDir,
      sourceType,
      format,
      processedPaths,
      includeExternal,
      homeDir: options.homeDir ?? homedir(),
    })),
  );
}

async function processRulesDir(
  result: InternalInstructionFile[],
  options: DiscoverInstructionFilesOptions,
  processedPaths: Set<string>,
  rulesDir: string,
  sourceType: InstructionSourceType,
  includeExternal: boolean,
  format: InstructionFormat,
  baseDir: string,
  visitedDirs = new Set<string>(),
) {
  const normalizedRulesDir = normalizePathForComparison(rulesDir);
  if (visitedDirs.has(normalizedRulesDir)) return;
  visitedDirs.add(normalizedRulesDir);

  let entries: Dirent[];
  try {
    entries = await readdir(rulesDir, { withFileTypes: true });
  } catch (error) {
    if (isExpectedMissingOrUnreadable(error)) return;
    throw error;
  }

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(rulesDir, entry.name);
    if (entry.isDirectory()) {
      await processRulesDir(
        result,
        options,
        processedPaths,
        entryPath,
        sourceType,
        includeExternal,
        format,
        baseDir,
        visitedDirs,
      );
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      await processExplicitFile(
        result,
        options,
        processedPaths,
        entryPath,
        sourceType,
        includeExternal,
        format,
        baseDir,
      );
    }
  }
}

function directoriesFromWorkspaceToCwd(workspaceRoot: string, cwd: string) {
  const root = resolve(workspaceRoot);
  const current = resolve(cwd);
  if (!isPathInside(root, current)) {
    throw new Error(`Instruction cwd is outside the workspace: ${cwd}`);
  }

  const dirs: string[] = [];
  let cursor = current;
  while (true) {
    dirs.push(cursor);
    if (normalizePathForComparison(cursor) === normalizePathForComparison(root)) break;
    const next = dirname(cursor);
    if (next === cursor || cursor === parse(cursor).root) break;
    cursor = next;
  }
  return dirs.reverse();
}

function globPatternToRegExp(pattern: string) {
  const normalized = normalizeSlashes(pattern);
  let source = '^';
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    const afterNext = normalized[index + 2];
    if (char === '*' && next === '*' && afterNext === '/') {
      source += '(?:.*/)?';
      index += 2;
      continue;
    }
    if (char === '*' && next === '*') {
      source += '.*';
      index += 1;
      continue;
    }
    if (char === '*') {
      source += '[^/]*';
      continue;
    }
    if (char === '?') {
      source += '[^/]';
      continue;
    }
    source += char.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
  }
  source += '$';
  return new RegExp(source);
}

function patternMatches(pattern: string, relativeTarget: string) {
  const normalizedPattern = normalizeSlashes(pattern).replace(/^\.\/+/, '');
  const normalizedTarget = normalizeSlashes(relativeTarget).replace(/^\.\/+/, '');
  if (!normalizedPattern.includes('*') && !normalizedPattern.includes('?')) {
    return normalizedTarget === normalizedPattern || normalizedTarget.startsWith(`${normalizedPattern}/`);
  }
  return globPatternToRegExp(normalizedPattern).test(normalizedTarget);
}

function appliesToTarget(file: InternalInstructionFile, targetPath: string | undefined) {
  if (!file.globs || file.globs.length === 0) return true;
  if (!targetPath) return true;

  const relativeTarget = isAbsolute(targetPath) ? relative(file.baseDir, targetPath) : targetPath;
  if (!relativeTarget || relativeTarget.startsWith('..') || isAbsolute(relativeTarget)) return false;
  return file.globs.some((glob) => patternMatches(glob, relativeTarget));
}

function publicInstructionFile(file: InternalInstructionFile): InstructionFile {
  return {
    path: file.path,
    relativePath: file.relativePath,
    sourceType: file.sourceType,
    format: file.format,
    content: file.content,
    ...(file.globs ? { globs: file.globs } : {}),
    ...(file.parent ? { parent: file.parent } : {}),
    contentDiffersFromDisk: file.contentDiffersFromDisk,
  };
}

export async function discoverInstructionFiles(options: DiscoverInstructionFilesOptions): Promise<InstructionFile[]> {
  const result: InternalInstructionFile[] = [];
  const processedPaths = new Set<string>();
  const includeExternal = options.includeExternal ?? false;

  for (const file of options.managedFiles ?? []) {
    await processExplicitFile(result, options, processedPaths, file, 'managed', includeExternal);
  }
  for (const dir of options.managedRulesDirs ?? []) {
    await processRulesDir(
      result,
      options,
      processedPaths,
      dir,
      'managed',
      includeExternal,
      formatForPath(dir),
      dirname(dirname(dir)),
    );
  }

  for (const file of options.userFiles ?? []) {
    await processExplicitFile(result, options, processedPaths, file, 'user', true);
  }
  for (const dir of options.userRulesDirs ?? []) {
    await processRulesDir(
      result,
      options,
      processedPaths,
      dir,
      'user',
      true,
      formatForPath(dir),
      dirname(dirname(dir)),
    );
  }

  for (const dir of directoriesFromWorkspaceToCwd(options.workspaceRoot, options.cwd)) {
    await processExplicitFile(
      result,
      options,
      processedPaths,
      join(dir, 'AGENTS.md'),
      'project',
      includeExternal,
      'agents',
      dir,
    );
    await processExplicitFile(
      result,
      options,
      processedPaths,
      join(dir, 'XENESIS.md'),
      'project',
      includeExternal,
      'xenesis',
      dir,
    );
    await processExplicitFile(
      result,
      options,
      processedPaths,
      join(dir, '.xenesis', 'instructions.md'),
      'project',
      includeExternal,
      'xenesis',
      dir,
    );
    await processRulesDir(
      result,
      options,
      processedPaths,
      join(dir, '.xenesis', 'rules'),
      'project',
      includeExternal,
      'xenesis',
      dir,
    );

    await processExplicitFile(
      result,
      options,
      processedPaths,
      join(dir, 'CLAUDE.md'),
      'project',
      includeExternal,
      'compat',
      dir,
    );
    await processExplicitFile(
      result,
      options,
      processedPaths,
      join(dir, '.claude', 'CLAUDE.md'),
      'project',
      includeExternal,
      'compat',
      dir,
    );
    await processRulesDir(
      result,
      options,
      processedPaths,
      join(dir, '.claude', 'rules'),
      'project',
      includeExternal,
      'compat',
      dir,
    );
    await processExplicitFile(
      result,
      options,
      processedPaths,
      join(dir, 'XENESIS.local.md'),
      'local',
      includeExternal,
      'xenesis',
      dir,
    );
    await processExplicitFile(
      result,
      options,
      processedPaths,
      join(dir, 'CLAUDE.local.md'),
      'local',
      includeExternal,
      'compat',
      dir,
    );
  }

  return result.filter((file) => appliesToTarget(file, options.targetPath)).map(publicInstructionFile);
}

export function instructionFilesToContextRecords(
  files: readonly InstructionFile[],
  options: { now?: Date; tokenPriorityBase?: number } = {},
): ContextRecord[] {
  const now = options.now ?? new Date();
  const tokenPriorityBase = options.tokenPriorityBase ?? 0;
  return files.map((file, index) =>
    createContextRecord({
      id: `instruction:${index}:${file.relativePath}`,
      kind: 'workspace_context',
      authority: 'project_instruction',
      content: file.content,
      structured: {
        sourceType: file.sourceType,
        format: file.format,
        relativePath: file.relativePath,
        ...(file.parent ? { parent: file.parent } : {}),
        ...(file.globs ? { globs: file.globs } : {}),
        contentDiffersFromDisk: file.contentDiffersFromDisk,
      },
      sourcePath: file.path,
      ...(file.globs ? { appliesTo: file.globs } : {}),
      now,
      freshness: 'fresh',
      priority: tokenPriorityBase + instructionPriorityOffset(file, index),
      sensitive: false,
      cacheScope: file.sourceType === 'local' ? 'turn' : 'session',
      conflictKey: `instruction:${file.path}`,
    }),
  );
}

export function createInstructionContextAdapter(options: InstructionContextAdapterOptions): ContextSourceAdapter {
  return {
    id: 'instruction-discovery',
    async load() {
      const files = await discoverInstructionFiles(options);
      return instructionFilesToContextRecords(files, {
        now: options.now,
        tokenPriorityBase: options.tokenPriorityBase,
      });
    },
  };
}
