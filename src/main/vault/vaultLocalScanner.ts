import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { VaultScanFile, VaultScanRequest, VaultScanResult, VaultScanWarning } from '../../shared/types';

const DEFAULT_MAX_FILES = 5000;
const DEFAULT_MAX_FILE_BYTES = 2 * 1024 * 1024;
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
const EXCLUDED_DIR_NAMES = new Set([
  '.git',
  '.hg',
  '.svn',
  '.obsidian',
  '.trash',
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.vite',
]);

export async function scanLocalVault(request: VaultScanRequest): Promise<VaultScanResult> {
  const rootPath = String(request?.rootPath || '').trim();
  const maxFiles = positiveInteger(request?.maxFiles, DEFAULT_MAX_FILES);
  const maxFileBytes = positiveInteger(request?.maxFileBytes, DEFAULT_MAX_FILE_BYTES);
  const warnings: VaultScanWarning[] = [];

  if (!rootPath) return failedVaultScan(rootPath, 'Vault root path is required.');

  let rootRealPath = '';
  try {
    const stat = await fs.stat(rootPath);
    if (!stat.isDirectory()) return failedVaultScan(rootPath, 'Vault root path is not a directory.');
    rootRealPath = await fs.realpath(rootPath);
  } catch (error) {
    return failedVaultScan(rootPath, error instanceof Error ? error.message : String(error));
  }

  const files: VaultScanFile[] = [];
  await scanDirectory({
    rootPath,
    rootRealPath,
    dirPath: rootPath,
    maxFiles,
    maxFileBytes,
    files,
    warnings,
  });

  return {
    ok: true,
    vaultId: `local:${rootRealPath}`,
    rootPath,
    displayName: path.basename(rootPath) || rootPath,
    files,
    warnings,
  };
}

function failedVaultScan(rootPath: string, error: string): VaultScanResult {
  return {
    ok: false,
    vaultId: rootPath ? `local:${rootPath}` : 'local:',
    rootPath,
    displayName: rootPath ? path.basename(rootPath) || rootPath : '',
    files: [],
    warnings: [],
    error,
  };
}

async function scanDirectory({
  rootPath,
  rootRealPath,
  dirPath,
  maxFiles,
  maxFileBytes,
  files,
  warnings,
}: {
  rootPath: string;
  rootRealPath: string;
  dirPath: string;
  maxFiles: number;
  maxFileBytes: number;
  files: VaultScanFile[];
  warnings: VaultScanWarning[];
}): Promise<void> {
  if (files.length >= maxFiles) return;

  let entries: Dirent[];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    warnings.push({ path: relativeVaultPath(rootPath, dirPath), message: readErrorMessage(error) });
    return;
  }

  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name, 'ko');
  });

  for (const entry of entries) {
    if (files.length >= maxFiles) {
      warnings.push({ message: `Vault scan stopped after ${maxFiles} Markdown files.` });
      return;
    }

    const entryPath = path.join(dirPath, entry.name);
    if (entry.isSymbolicLink()) {
      warnings.push({ path: relativeVaultPath(rootPath, entryPath), message: 'Skipped symbolic link.' });
      continue;
    }

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) continue;
      const realPath = await safeRealPath(entryPath);
      if (!realPath || !isInsideRoot(rootRealPath, realPath)) {
        warnings.push({
          path: relativeVaultPath(rootPath, entryPath),
          message: 'Skipped directory outside vault root.',
        });
        continue;
      }
      await scanDirectory({ rootPath, rootRealPath, dirPath: entryPath, maxFiles, maxFileBytes, files, warnings });
      continue;
    }

    if (!entry.isFile() || !MARKDOWN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    await readMarkdownFile({ rootPath, rootRealPath, filePath: entryPath, maxFileBytes, files, warnings });
  }
}

async function readMarkdownFile({
  rootPath,
  rootRealPath,
  filePath,
  maxFileBytes,
  files,
  warnings,
}: {
  rootPath: string;
  rootRealPath: string;
  filePath: string;
  maxFileBytes: number;
  files: VaultScanFile[];
  warnings: VaultScanWarning[];
}): Promise<void> {
  const relativePath = relativeVaultPath(rootPath, filePath);
  try {
    const realPath = await fs.realpath(filePath);
    if (!isInsideRoot(rootRealPath, realPath)) {
      warnings.push({ path: relativePath, message: 'Skipped file outside vault root.' });
      return;
    }

    const stat = await fs.stat(filePath);
    if (stat.size > maxFileBytes) {
      warnings.push({ path: relativePath, message: `Skipped file larger than ${maxFileBytes} bytes.` });
      return;
    }

    files.push({
      vaultId: `local:${rootRealPath}`,
      path: relativePath,
      absolutePath: filePath,
      content: await fs.readFile(filePath, 'utf8'),
      modifiedAt: stat.mtimeMs,
      sizeBytes: stat.size,
    });
  } catch (error) {
    warnings.push({ path: relativePath, message: readErrorMessage(error) });
  }
}

function shouldSkipDirectory(name: string): boolean {
  if (EXCLUDED_DIR_NAMES.has(name)) return true;
  return name.startsWith('.') && name !== '.';
}

function relativeVaultPath(rootPath: string, filePath: string): string {
  return path.relative(rootPath, filePath).replace(/\\/g, '/');
}

function isInsideRoot(rootRealPath: string, candidateRealPath: string): boolean {
  const relative = path.relative(rootRealPath, candidateRealPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function safeRealPath(filePath: string): Promise<string | null> {
  try {
    return await fs.realpath(filePath);
  } catch {
    return null;
  }
}

function positiveInteger(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : fallback;
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
