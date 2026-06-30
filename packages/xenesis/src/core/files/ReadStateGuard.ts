import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { assertExistingPathInsideWorkspace } from '../../utils/workspace.js';

export type ReadSnapshotLineEndings = 'lf' | 'crlf' | 'mixed' | 'none';

export interface ReadSnapshot {
  path: string;
  absolutePath: string;
  contentHash: string;
  mtimeMs: number;
  size: number;
  encoding: 'utf8';
  lineEndings: ReadSnapshotLineEndings;
  offset?: number;
  limit?: number;
  isPartialView: boolean;
}

export interface CreateReadSnapshotOptions {
  workspaceRoot: string;
  path: string;
  isPartialView: boolean;
  offset?: number;
  limit?: number;
}

export interface CreateReadSnapshotFromContentOptions extends CreateReadSnapshotOptions {
  content: string;
}

export interface AssertReadStateFreshOptions {
  workspaceRoot: string;
  path: string;
  readState: ReadSnapshot;
}

export interface FreshTextForMutation {
  absolutePath: string;
  content: string;
  snapshot: ReadSnapshot;
}

export interface ReadTextWithSnapshot extends FreshTextForMutation {}

export interface WriteTextIfReadStateFreshOptions extends AssertReadStateFreshOptions {
  content: string;
}

function contentHash(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

function detectLineEndings(content: string): ReadSnapshotLineEndings {
  const hasCrLf = content.includes('\r\n');
  const withoutCrLf = content.replace(/\r\n/g, '');
  const hasLf = withoutCrLf.includes('\n');
  if (hasCrLf && hasLf) return 'mixed';
  if (hasCrLf) return 'crlf';
  if (hasLf) return 'lf';
  return 'none';
}

function createReadSnapshotForAbsolutePath(
  options: CreateReadSnapshotFromContentOptions,
  absolutePath: string,
  stats: Stats,
): ReadSnapshot {
  return {
    path: options.path,
    absolutePath,
    contentHash: contentHash(options.content),
    mtimeMs: stats.mtimeMs,
    size: Buffer.byteLength(options.content, 'utf8'),
    encoding: 'utf8',
    lineEndings: detectLineEndings(options.content),
    ...(options.offset !== undefined ? { offset: options.offset } : {}),
    ...(options.limit !== undefined ? { limit: options.limit } : {}),
    isPartialView: options.isPartialView,
  };
}

export async function createReadSnapshotFromContent(
  options: CreateReadSnapshotFromContentOptions,
): Promise<ReadSnapshot> {
  const absolutePath = await assertExistingPathInsideWorkspace(options.workspaceRoot, options.path);
  const stats = await stat(absolutePath);
  return createReadSnapshotForAbsolutePath(options, absolutePath, stats);
}

export async function readTextWithSnapshot(options: CreateReadSnapshotOptions): Promise<ReadTextWithSnapshot> {
  const absolutePath = await assertExistingPathInsideWorkspace(options.workspaceRoot, options.path);
  const handle = await open(absolutePath, 'r');
  try {
    const content = await handle.readFile({ encoding: 'utf8' });
    const stats = await handle.stat();
    const snapshot = createReadSnapshotForAbsolutePath(
      {
        ...options,
        content,
      },
      absolutePath,
      stats,
    );
    return { absolutePath, content, snapshot };
  } finally {
    await handle.close();
  }
}

export async function createReadSnapshot(options: CreateReadSnapshotOptions): Promise<ReadSnapshot> {
  return (await readTextWithSnapshot(options)).snapshot;
}

function assertSnapshotMatches(path: string, expected: ReadSnapshot, current: ReadSnapshot): void {
  if (expected.absolutePath !== current.absolutePath) {
    throw new Error(`Read state mismatch for ${path}: absolute path changed.`);
  }
  if (expected.contentHash !== current.contentHash) {
    throw new Error(`Read state mismatch for ${path}: content hash changed.`);
  }
  if (expected.mtimeMs !== current.mtimeMs) {
    throw new Error(`Read state mismatch for ${path}: mtime changed.`);
  }
  if (expected.size !== current.size) {
    throw new Error(`Read state mismatch for ${path}: size changed.`);
  }
}

function assertReadStateCanAuthorizePath(options: AssertReadStateFreshOptions): void {
  if (options.readState.isPartialView) {
    throw new Error('Partial read state cannot authorize mutation.');
  }
  if (options.readState.path !== options.path) {
    throw new Error(`Read state mismatch for ${options.path}: snapshot path is ${options.readState.path}.`);
  }
}

export async function readFreshTextForMutation(options: AssertReadStateFreshOptions): Promise<FreshTextForMutation> {
  assertReadStateCanAuthorizePath(options);

  const fresh = await readTextWithSnapshot({
    workspaceRoot: options.workspaceRoot,
    path: options.path,
    isPartialView: false,
  });

  assertSnapshotMatches(options.path, options.readState, fresh.snapshot);
  return fresh;
}

export async function assertReadStateFresh(options: AssertReadStateFreshOptions): Promise<void> {
  await readFreshTextForMutation(options);
}

export async function writeTextIfReadStateFresh(options: WriteTextIfReadStateFreshOptions): Promise<void> {
  assertReadStateCanAuthorizePath(options);

  const absolutePath = await assertExistingPathInsideWorkspace(options.workspaceRoot, options.path);
  const handle = await open(absolutePath, 'r+');
  try {
    const currentContent = await handle.readFile({ encoding: 'utf8' });
    const currentStats = await handle.stat();
    const currentSnapshot = createReadSnapshotForAbsolutePath(
      {
        workspaceRoot: options.workspaceRoot,
        path: options.path,
        content: currentContent,
        isPartialView: false,
      },
      absolutePath,
      currentStats,
    );
    assertSnapshotMatches(options.path, options.readState, currentSnapshot);

    const output = Buffer.from(options.content, 'utf8');
    await handle.write(output, 0, output.length, 0);
    await handle.truncate(output.length);
  } finally {
    await handle.close();
  }
}
