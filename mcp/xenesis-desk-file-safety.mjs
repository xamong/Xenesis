import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const MAX_TEXT_FILE_BYTES = 200 * 1024;

function cleanString(value) {
  return typeof value === 'string' ? value : String(value ?? '');
}

function normalizeNow(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function safeTimestamp(value) {
  return normalizeNow(value).toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
}

function safeDateDir(value) {
  return normalizeNow(value).toISOString().slice(0, 10);
}

function sanitizeBaseName(value) {
  const base = path
    .basename(cleanString(value))
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .trim();
  return base || 'file.txt';
}

function defaultXenisHome() {
  return process.env.XENIS_HOME || path.join(os.homedir(), '.xenis');
}

function defaultBackupRoot() {
  return path.join(defaultXenisHome(), 'bot-backups');
}

function hasBinaryData(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 0x09) return true;
    if (byte > 0x0d && byte < 0x20) return true;
  }
  return false;
}

function normalizeAbsolutePath(filePath, label = 'filePath') {
  const text = cleanString(filePath).trim();
  if (!text) throw new Error(`${label} is required`);
  if (!path.isAbsolute(text)) throw new Error(`${label} must be an absolute path: ${text}`);
  return path.resolve(text);
}

async function statParentDirectory(filePath) {
  const parent = path.dirname(filePath);
  try {
    const info = await fs.stat(parent);
    if (!info.isDirectory()) throw new Error(`parent path is not a directory: ${parent}`);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
}

async function readExistingTextFile(filePath, maxBytes) {
  let info;
  try {
    info = await fs.lstat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, text: '', size: 0 };
    throw error;
  }

  if (info.isSymbolicLink()) {
    throw new Error(`refusing to write through a symbolic link: ${filePath}`);
  }
  if (info.isDirectory()) {
    throw new Error(`path is a directory: ${filePath}`);
  }
  if (!info.isFile()) {
    throw new Error(`path is not a regular file: ${filePath}`);
  }
  if (info.size > maxBytes) {
    throw new Error(`file is too large (${info.size} bytes, max ${maxBytes} bytes): ${filePath}`);
  }

  const buffer = await fs.readFile(filePath);
  if (hasBinaryData(buffer)) {
    throw new Error(`existing file appears to contain binary data: ${filePath}`);
  }
  return { exists: true, text: buffer.toString('utf8'), size: buffer.length };
}

function validateNewContent(content, maxBytes) {
  const text = cleanString(content);
  const buffer = Buffer.from(text, 'utf8');
  if (buffer.length > maxBytes) {
    throw new Error(`content is too large (${buffer.length} bytes, max ${maxBytes} bytes)`);
  }
  if (hasBinaryData(buffer)) {
    throw new Error('content appears to contain binary data');
  }
  return { text, size: buffer.length };
}

function splitLines(value) {
  const text = cleanString(value);
  const lines = text.split(/\r?\n/);
  if (lines.length && lines.at(-1) === '') lines.pop();
  return lines;
}

export function createUnifiedDiff(original, modified, options = {}) {
  const originalName = options.originalName || 'original';
  const modifiedName = options.modifiedName || 'modified';
  const a = splitLines(original);
  const b = splitLines(modified);
  const output = [`--- ${originalName}`, `+++ ${modifiedName}`];
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const left = a[index];
    const right = b[index];
    if (left === right) {
      if (left !== undefined) output.push(` ${left}`);
      continue;
    }
    if (left !== undefined) output.push(`-${left}`);
    if (right !== undefined) output.push(`+${right}`);
  }
  if (output.length === 2) output.push(' No changes.');
  return output.join('\n');
}

export async function previewTextFileWrite(args = {}) {
  const maxBytes =
    Number.isFinite(Number(args.maxBytes)) && Number(args.maxBytes) > 0
      ? Math.trunc(Number(args.maxBytes))
      : MAX_TEXT_FILE_BYTES;
  const filePath = normalizeAbsolutePath(args.filePath);
  const next = validateNewContent(args.content, maxBytes);
  await statParentDirectory(filePath);
  const current = await readExistingTextFile(filePath, maxBytes);
  const wouldChange = current.text !== next.text;
  const diff = createUnifiedDiff(current.text, next.text, {
    originalName: current.exists ? filePath : `${filePath} (new file)`,
    modifiedName: filePath,
  });
  return {
    ok: true,
    filePath,
    existed: current.exists,
    originalBytes: current.size,
    modifiedBytes: next.size,
    wouldChange,
    backupRequired: current.exists && wouldChange,
    diff,
  };
}

async function createBackup(filePath, backupRoot, now) {
  const dateDir = safeDateDir(now);
  const backupDir = path.resolve(backupRoot || defaultBackupRoot(), dateDir);
  await fs.mkdir(backupDir, { recursive: true, mode: 0o700 });
  const dirHash = crypto.createHash('sha256').update(path.dirname(filePath)).digest('hex').slice(0, 8);
  const baseName = sanitizeBaseName(filePath);
  const stamp = safeTimestamp(now);
  const nonce = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
  const backupPath = path.join(backupDir, `${baseName}.${dirHash}.${stamp}.${nonce}.bak`);
  const metadataPath = `${backupPath}.json`;
  const data = await fs.readFile(filePath);
  const stat = await fs.stat(filePath);
  await fs.writeFile(backupPath, data, { mode: 0o600 });
  await fs.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        originalFilePath: filePath,
        backupPath,
        createdAt: normalizeNow(now).toISOString(),
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

export async function applyTextFileWrite(args = {}) {
  const preview = await previewTextFileWrite(args);
  const backup = preview.backupRequired ? await createBackup(preview.filePath, args.backupRoot, args.now) : undefined;
  await fs.mkdir(path.dirname(preview.filePath), { recursive: true });
  await fs.writeFile(preview.filePath, cleanString(args.content), 'utf8');
  return {
    ...preview,
    ok: true,
    written: true,
    backupCreated: Boolean(backup),
    ...(backup ? backup : {}),
  };
}

export async function restoreTextFileBackup(args = {}) {
  const backupPath = normalizeAbsolutePath(args.backupPath, 'backupPath');
  const metadataPath = `${backupPath}.json`;
  const metadataRaw = await fs.readFile(metadataPath, 'utf8');
  const metadata = JSON.parse(metadataRaw);
  const targetPath = args.filePath
    ? normalizeAbsolutePath(args.filePath)
    : normalizeAbsolutePath(metadata.originalFilePath);
  if (path.resolve(metadata.originalFilePath) !== targetPath) {
    throw new Error(`backup metadata mismatch: ${metadata.originalFilePath} != ${targetPath}`);
  }
  const backupInfo = await fs.lstat(backupPath);
  if (backupInfo.isSymbolicLink() || !backupInfo.isFile()) {
    throw new Error(`backup path is not a regular file: ${backupPath}`);
  }
  const data = await fs.readFile(backupPath);
  if (hasBinaryData(data)) {
    throw new Error(`backup file appears to contain binary data: ${backupPath}`);
  }
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, data, { mode: Number(metadata.mode) || 0o644 });
  if (fsSync.existsSync(targetPath) && Number.isFinite(Number(metadata.mode))) {
    await fs.chmod(targetPath, Number(metadata.mode));
  }
  return {
    ok: true,
    filePath: targetPath,
    backupPath,
    restoredBytes: data.length,
  };
}
