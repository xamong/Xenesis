import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";

export interface WorkspaceContextFile {
  path: string;
  name: string;
  extension: string;
  size: number;
  modifiedAt: string;
  text: boolean;
  preview?: string;
}

export interface WorkspaceContextIndex {
  workspaceRoot: string;
  indexedAt: string;
  fileCount: number;
  totalSize: number;
  ignoredDirectories: string[];
  files: WorkspaceContextFile[];
}

export interface WorkspaceContextIndexOptions {
  maxFiles?: number;
  previewBytes?: number;
  ignoreDirectories?: string[];
}

export interface FileWorkspaceContextIndexStoreOptions {
  workspaceRoot: string;
  xenesisHome: string;
  now?: () => Date;
}

const defaultIgnoredDirectories = [".git", ".xenesis", "dist", "node_modules"];
const defaultMaxFiles = 1000;
const defaultPreviewBytes = 600;
const maxPreviewSourceBytes = 1024 * 1024;

function normalizePath(path: string) {
  return path.replace(/\\/g, "/");
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

async function readPreview(path: string, size: number, previewBytes: number) {
  if (size > maxPreviewSourceBytes || previewBytes <= 0) return undefined;
  try {
    const content = await readFile(path, "utf8");
    if (content.includes("\0")) return undefined;
    return content.replace(/\r\n/g, "\n").slice(0, previewBytes);
  } catch {
    return undefined;
  }
}

async function collectFiles(
  workspaceRoot: string,
  current: string,
  ignored: Set<string>,
  maxFiles: number,
  previewBytes: number,
  files: WorkspaceContextFile[]
) {
  if (files.length >= maxFiles) return;
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (files.length >= maxFiles) return;
    const absolutePath = join(current, entry.name);
    if (entry.isDirectory()) {
      if (ignored.has(entry.name)) continue;
      await collectFiles(workspaceRoot, absolutePath, ignored, maxFiles, previewBytes, files);
      continue;
    }
    if (!entry.isFile()) continue;

    const stats = await stat(absolutePath);
    const preview = await readPreview(absolutePath, stats.size, previewBytes);
    files.push({
      path: normalizePath(relative(workspaceRoot, absolutePath)),
      name: basename(absolutePath),
      extension: extname(absolutePath),
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      text: preview !== undefined,
      ...(preview !== undefined ? { preview } : {})
    });
  }
}

function scoreFile(file: WorkspaceContextFile, query: string) {
  const haystacks = [
    { value: file.path.toLowerCase(), weight: 5 },
    { value: file.name.toLowerCase(), weight: 4 },
    { value: file.extension.toLowerCase(), weight: 2 },
    { value: file.preview?.toLowerCase() ?? "", weight: 1 }
  ];
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => score + haystacks.reduce((part, haystack) => (
      haystack.value.includes(token) ? part + haystack.weight : part
    ), 0), 0);
}

export class FileWorkspaceContextIndexStore {
  private readonly workspaceRoot: string;
  private readonly indexPath: string;
  private readonly now: () => Date;

  constructor(options: FileWorkspaceContextIndexStoreOptions) {
    this.workspaceRoot = resolve(options.workspaceRoot);
    this.indexPath = resolve(options.xenesisHome, "context", "index.json");
    this.now = options.now ?? (() => new Date());
  }

  async rebuild(options: WorkspaceContextIndexOptions = {}): Promise<WorkspaceContextIndex> {
    const ignoredDirectories = uniqueSorted([
      ...defaultIgnoredDirectories,
      ...(options.ignoreDirectories ?? [])
    ]);
    const files: WorkspaceContextFile[] = [];
    await collectFiles(
      this.workspaceRoot,
      this.workspaceRoot,
      new Set(ignoredDirectories),
      options.maxFiles ?? defaultMaxFiles,
      options.previewBytes ?? defaultPreviewBytes,
      files
    );

    const index: WorkspaceContextIndex = {
      workspaceRoot: this.workspaceRoot,
      indexedAt: this.now().toISOString(),
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      ignoredDirectories,
      files
    };
    await mkdir(resolve(this.indexPath, ".."), { recursive: true });
    await writeFile(this.indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
    return index;
  }

  async read(): Promise<WorkspaceContextIndex | undefined> {
    try {
      return JSON.parse(await readFile(this.indexPath, "utf8")) as WorkspaceContextIndex;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
      throw error;
    }
  }

  async search(query: string, limit = 20): Promise<WorkspaceContextFile[]> {
    const index = await this.read();
    if (!index) return [];
    return index.files
      .map((file) => ({ file, score: scoreFile(file, query) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.file.path.localeCompare(right.file.path))
      .slice(0, limit)
      .map((entry) => entry.file);
  }
}
