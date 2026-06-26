import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {
  SafeFileApplyRequest,
  SafeFileApplyResult,
  SafeFilePreviewRequest,
  SafeFilePreviewResult,
  SafeFileRestoreRequest,
  SafeFileRestoreResult,
} from '../shared/types';

const MAX_TEXT_FILE_BYTES = 200 * 1024;

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

function safeTimestamp(value = new Date()): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
}

function safeDateDir(value = new Date()): string {
  return value.toISOString().slice(0, 10);
}

function sanitizeBaseName(value: string): string {
  const base = path
    .basename(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .trim();
  return base || 'file.txt';
}

function defaultBackupRoot(): string {
  return path.join(process.env.XENIS_HOME || path.join(os.homedir(), '.xenis'), 'bot-backups');
}

function normalizeAbsolutePath(filePath: string, label = 'filePath'): string {
  const text = cleanString(filePath).trim();
  if (!text) throw new Error(`${label} is required`);
  if (!path.isAbsolute(text)) throw new Error(`${label} must be an absolute path: ${text}`);
  return path.resolve(text);
}

function hasBinaryData(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 0x09) return true;
    if (byte > 0x0d && byte < 0x20) return true;
  }
  return false;
}

function maxBytesFrom(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : MAX_TEXT_FILE_BYTES;
}

async function statParentDirectory(filePath: string): Promise<void> {
  const parent = path.dirname(filePath);
  try {
    const info = await fsp.stat(parent);
    if (!info.isDirectory()) throw new Error(`parent path is not a directory: ${parent}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}

async function readExistingTextFile(
  filePath: string,
  maxBytes: number,
): Promise<{ exists: boolean; text: string; size: number }> {
  let info: fs.Stats;
  try {
    info = await fsp.lstat(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { exists: false, text: '', size: 0 };
    throw error;
  }

  if (info.isSymbolicLink()) throw new Error(`refusing to write through a symbolic link: ${filePath}`);
  if (info.isDirectory()) throw new Error(`path is a directory: ${filePath}`);
  if (!info.isFile()) throw new Error(`path is not a regular file: ${filePath}`);
  if (info.size > maxBytes)
    throw new Error(`file is too large (${info.size} bytes, max ${maxBytes} bytes): ${filePath}`);

  const buffer = await fsp.readFile(filePath);
  if (hasBinaryData(buffer)) throw new Error(`existing file appears to contain binary data: ${filePath}`);
  return { exists: true, text: buffer.toString('utf8'), size: buffer.length };
}

function validateNewContent(content: string, maxBytes: number): { text: string; size: number } {
  const text = cleanString(content);
  const buffer = Buffer.from(text, 'utf8');
  if (buffer.length > maxBytes) throw new Error(`content is too large (${buffer.length} bytes, max ${maxBytes} bytes)`);
  if (hasBinaryData(buffer)) throw new Error('content appears to contain binary data');
  return { text, size: buffer.length };
}

function splitLines(value: string): string[] {
  const lines = cleanString(value).split(/\r?\n/);
  if (lines.length && lines.at(-1) === '') lines.pop();
  return lines;
}

function createUnifiedDiff(original: string, modified: string, originalName: string, modifiedName: string): string {
  const left = splitLines(original);
  const right = splitLines(modified);
  const output = [`--- ${originalName}`, `+++ ${modifiedName}`];
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === b) {
      if (a !== undefined) output.push(` ${a}`);
      continue;
    }
    if (a !== undefined) output.push(`-${a}`);
    if (b !== undefined) output.push(`+${b}`);
  }
  if (output.length === 2) output.push(' No changes.');
  return output.join('\n');
}

async function createBackup(
  filePath: string,
  backupRoot?: string,
): Promise<{ backupPath: string; metadataPath: string }> {
  const now = new Date();
  const backupDir = path.resolve(backupRoot || defaultBackupRoot(), safeDateDir(now));
  await fsp.mkdir(backupDir, { recursive: true, mode: 0o700 });
  const dirHash = crypto.createHash('sha256').update(path.dirname(filePath)).digest('hex').slice(0, 8);
  const backupPath = path.join(
    backupDir,
    `${sanitizeBaseName(filePath)}.${dirHash}.${safeTimestamp(now)}.${crypto.randomUUID()}.bak`,
  );
  const metadataPath = `${backupPath}.json`;
  const data = await fsp.readFile(filePath);
  const stat = await fsp.stat(filePath);
  await fsp.writeFile(backupPath, data, { mode: 0o600 });
  await fsp.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        originalFilePath: filePath,
        backupPath,
        createdAt: now.toISOString(),
        mode: stat.mode & 0o777,
        size: stat.size,
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  return { backupPath, metadataPath };
}

export async function previewSafeTextFileWrite(request: SafeFilePreviewRequest): Promise<SafeFilePreviewResult> {
  const maxBytes = maxBytesFrom(request.maxBytes);
  const filePath = normalizeAbsolutePath(request.filePath);
  const next = validateNewContent(request.content, maxBytes);
  await statParentDirectory(filePath);
  const current = await readExistingTextFile(filePath, maxBytes);
  const wouldChange = current.text !== next.text;
  return {
    ok: true,
    filePath,
    existed: current.exists,
    originalBytes: current.size,
    modifiedBytes: next.size,
    wouldChange,
    backupRequired: current.exists && wouldChange,
    diff: createUnifiedDiff(current.text, next.text, current.exists ? filePath : `${filePath} (new file)`, filePath),
  };
}

export async function applySafeTextFileWrite(request: SafeFileApplyRequest): Promise<SafeFileApplyResult> {
  const preview = await previewSafeTextFileWrite(request);
  const backup = preview.backupRequired ? await createBackup(preview.filePath, request.backupRoot) : undefined;
  await fsp.mkdir(path.dirname(preview.filePath), { recursive: true });
  await fsp.writeFile(preview.filePath, cleanString(request.content), 'utf8');
  return {
    ...preview,
    written: true,
    backupCreated: Boolean(backup),
    ...(backup ?? {}),
  };
}

export async function restoreSafeTextFileBackup(request: SafeFileRestoreRequest): Promise<SafeFileRestoreResult> {
  const backupPath = normalizeAbsolutePath(request.backupPath, 'backupPath');
  const metadataPath = `${backupPath}.json`;
  const metadata = JSON.parse(await fsp.readFile(metadataPath, 'utf8')) as {
    originalFilePath?: string;
    mode?: number;
  };
  const targetPath = request.filePath
    ? normalizeAbsolutePath(request.filePath)
    : normalizeAbsolutePath(cleanString(metadata.originalFilePath));
  if (path.resolve(cleanString(metadata.originalFilePath)) !== targetPath) {
    throw new Error(`backup metadata mismatch: ${metadata.originalFilePath} != ${targetPath}`);
  }
  const backupInfo = await fsp.lstat(backupPath);
  if (backupInfo.isSymbolicLink() || !backupInfo.isFile()) {
    throw new Error(`backup path is not a regular file: ${backupPath}`);
  }
  const data = await fsp.readFile(backupPath);
  if (hasBinaryData(data)) throw new Error(`backup file appears to contain binary data: ${backupPath}`);
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.writeFile(targetPath, data, { mode: Number(metadata.mode) || 0o644 });
  if (Number.isFinite(Number(metadata.mode))) {
    await fsp.chmod(targetPath, Number(metadata.mode));
  }
  return {
    ok: true,
    filePath: targetPath,
    backupPath,
    restoredBytes: data.length,
  };
}
