import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { assertInsideWorkspace } from "../utils/workspace.js";

export type WorkspaceChangeAction = "create" | "modify" | "delete";

export interface WorkspaceChangeRecord {
  id: string;
  action: WorkspaceChangeAction;
  path: string;
  toolName: string;
  toolCallId: string;
  sessionId: string;
  createdAt: string;
  beforeExists: boolean;
  afterExists: boolean;
  beforeBytes: number;
  afterBytes: number;
  beforeSnapshotPath?: string;
  afterSnapshotPath?: string;
  revertedAt?: string;
  acceptedAt?: string;
}

export interface WorkspaceCheckpoint {
  id: string;
  changeCount: number;
  pendingChangeCount: number;
  acceptedChangeCount: number;
  paths: string[];
  firstChangeAt: string;
  lastChangeAt: string;
}

export interface RecordWorkspaceChangeInput {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  path: string;
  beforeContent?: string;
  afterContent?: string;
}

export interface FileWorkspaceChangeStoreOptions {
  workspaceRoot: string;
  xenesisHome: string;
  now?: () => Date;
}

function normalizePath(value: string) {
  return value.replace(/\\/g, "/");
}

function timestampId(date: Date) {
  return date.toISOString().replace(/[-:.]/g, "");
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "change";
}

function byteLength(value: string | undefined) {
  return value === undefined ? 0 : Buffer.byteLength(value, "utf8");
}

function actionFor(input: RecordWorkspaceChangeInput): WorkspaceChangeAction {
  if (input.beforeContent === undefined && input.afterContent !== undefined) return "create";
  if (input.beforeContent !== undefined && input.afterContent === undefined) return "delete";
  return "modify";
}

function compareCreatedDesc(left: WorkspaceChangeRecord, right: WorkspaceChangeRecord) {
  return right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id);
}

function compareCreatedAsc(left: WorkspaceChangeRecord, right: WorkspaceChangeRecord) {
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

function splitLines(content: string) {
  return content.replace(/\r\n/g, "\n").split("\n");
}

function simpleDiff(path: string, before: string, after: string) {
  if (before === after) return "No changes.";
  const beforeLines = splitLines(before);
  const afterLines = splitLines(after);
  const lines = [`--- ${path}`, `+++ ${path}`];
  const max = Math.max(beforeLines.length, afterLines.length);
  for (let index = 0; index < max; index += 1) {
    const beforeLine = beforeLines[index];
    const afterLine = afterLines[index];
    if (beforeLine === afterLine) {
      if (beforeLine !== undefined && beforeLine !== "") lines.push(` ${beforeLine}`);
      continue;
    }
    if (beforeLine !== undefined && beforeLine !== "") lines.push(`-${beforeLine}`);
    if (afterLine !== undefined && afterLine !== "") lines.push(`+${afterLine}`);
  }
  return lines.join("\n");
}

function checkpointFromRecords(sessionId: string, records: WorkspaceChangeRecord[]): WorkspaceCheckpoint {
  const sortedAsc = [...records].sort(compareCreatedAsc);
  return {
    id: sessionId,
    changeCount: records.length,
    pendingChangeCount: records.filter((record) => !record.revertedAt && !record.acceptedAt).length,
    acceptedChangeCount: records.filter((record) => record.acceptedAt).length,
    paths: Array.from(new Set(sortedAsc.map((record) => record.path))).sort((left, right) => left.localeCompare(right)),
    firstChangeAt: sortedAsc[0]?.createdAt ?? "",
    lastChangeAt: sortedAsc.at(-1)?.createdAt ?? ""
  };
}

export class FileWorkspaceChangeStore {
  private readonly workspaceRoot: string;
  private readonly root: string;
  private readonly indexPath: string;
  private readonly now: () => Date;

  constructor(options: FileWorkspaceChangeStoreOptions) {
    this.workspaceRoot = resolve(options.workspaceRoot);
    this.root = resolve(options.xenesisHome, "changes");
    this.indexPath = resolve(this.root, "index.json");
    this.now = options.now ?? (() => new Date());
  }

  async list(): Promise<WorkspaceChangeRecord[]> {
    try {
      return JSON.parse(await readFile(this.indexPath, "utf8")) as WorkspaceChangeRecord[];
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
      throw error;
    }
  }

  async get(id: string) {
    return (await this.list()).find((record) => record.id === id);
  }

  async listCheckpoints(): Promise<WorkspaceCheckpoint[]> {
    const groups = new Map<string, WorkspaceChangeRecord[]>();
    for (const record of await this.list()) {
      groups.set(record.sessionId, [...(groups.get(record.sessionId) ?? []), record]);
    }

    return Array.from(groups.entries())
      .map(([sessionId, records]) => checkpointFromRecords(sessionId, records))
      .sort((left, right) => right.lastChangeAt.localeCompare(left.lastChangeAt) || left.id.localeCompare(right.id));
  }

  async getCheckpoint(id: string): Promise<WorkspaceCheckpoint | undefined> {
    const records = (await this.list()).filter((record) => record.sessionId === id);
    return records.length === 0 ? undefined : checkpointFromRecords(id, records);
  }

  async checkpointChanges(id: string): Promise<WorkspaceChangeRecord[]> {
    return (await this.list())
      .filter((record) => record.sessionId === id)
      .sort(compareCreatedDesc);
  }

  async record(input: RecordWorkspaceChangeInput): Promise<WorkspaceChangeRecord> {
    const records = await this.list();
    const createdAt = this.now().toISOString();
    const absolutePath = assertInsideWorkspace(this.workspaceRoot, input.path);
    const normalizedPath = normalizePath(relative(this.workspaceRoot, absolutePath) || ".");
    const baseId = `${timestampId(new Date(createdAt))}-${slugify(input.toolName)}-${slugify(normalizedPath)}`;
    let id = baseId;
    let suffix = 2;
    while (records.some((record) => record.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const beforeSnapshotPath = input.beforeContent === undefined ? undefined : `snapshots/${id}.before.txt`;
    const afterSnapshotPath = input.afterContent === undefined ? undefined : `snapshots/${id}.after.txt`;
    const record: WorkspaceChangeRecord = {
      id,
      action: actionFor(input),
      path: normalizedPath,
      toolName: input.toolName,
      toolCallId: input.toolCallId,
      sessionId: input.sessionId,
      createdAt,
      beforeExists: input.beforeContent !== undefined,
      afterExists: input.afterContent !== undefined,
      beforeBytes: byteLength(input.beforeContent),
      afterBytes: byteLength(input.afterContent),
      ...(beforeSnapshotPath ? { beforeSnapshotPath } : {}),
      ...(afterSnapshotPath ? { afterSnapshotPath } : {})
    };

    if (beforeSnapshotPath) await this.writeSnapshot(beforeSnapshotPath, input.beforeContent ?? "");
    if (afterSnapshotPath) await this.writeSnapshot(afterSnapshotPath, input.afterContent ?? "");
    await this.writeIndex([record, ...records]);
    return record;
  }

  async revert(id: string): Promise<WorkspaceChangeRecord> {
    const records = await this.list();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) throw new Error(`Workspace change not found: ${id}`);
    const record = records[index];
    if (record.revertedAt) throw new Error(`Workspace change already reverted: ${id}`);
    if (record.acceptedAt) throw new Error(`Workspace change already accepted: ${id}`);

    const absolutePath = assertInsideWorkspace(this.workspaceRoot, record.path);
    if (record.afterExists) {
      const expectedAfter = await this.readSnapshot(record.afterSnapshotPath);
      let current: string;
      try {
        current = await readFile(absolutePath, "utf8");
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          throw new Error(`Cannot revert ${id}: current file is missing: ${record.path}`);
        }
        throw error;
      }
      if (current !== expectedAfter) {
        throw new Error(`Cannot revert ${id}: current file differs from recorded after snapshot: ${record.path}`);
      }
    }

    if (record.beforeExists) {
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, await this.readSnapshot(record.beforeSnapshotPath), "utf8");
    } else {
      await rm(absolutePath, { force: true });
    }

    const updated: WorkspaceChangeRecord = {
      ...record,
      revertedAt: this.now().toISOString()
    };
    records[index] = updated;
    await this.writeIndex(records);
    return updated;
  }

  async revertCheckpoint(id: string): Promise<WorkspaceChangeRecord[]> {
    const records = await this.checkpointChanges(id);
    if (records.length === 0) throw new Error(`Workspace checkpoint not found: ${id}`);

    const pending = records.filter((record) => !record.revertedAt && !record.acceptedAt);
    if (pending.length === 0) throw new Error(`Workspace checkpoint has no pending changes: ${id}`);

    const reverted: WorkspaceChangeRecord[] = [];
    for (const record of pending) {
      reverted.push(await this.revert(record.id));
    }
    return reverted;
  }

  async accept(id: string): Promise<WorkspaceChangeRecord> {
    const records = await this.list();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) throw new Error(`Workspace change not found: ${id}`);
    const record = records[index];
    if (record.revertedAt) throw new Error(`Workspace change already reverted: ${id}`);
    if (record.acceptedAt) throw new Error(`Workspace change already accepted: ${id}`);

    const updated: WorkspaceChangeRecord = {
      ...record,
      acceptedAt: this.now().toISOString()
    };
    records[index] = updated;
    await this.writeIndex(records);
    return updated;
  }

  async acceptCheckpoint(id: string): Promise<WorkspaceChangeRecord[]> {
    const records = await this.checkpointChanges(id);
    if (records.length === 0) throw new Error(`Workspace checkpoint not found: ${id}`);

    const pending = records.filter((record) => !record.revertedAt && !record.acceptedAt);
    if (pending.length === 0) throw new Error(`Workspace checkpoint has no pending changes: ${id}`);

    const accepted: WorkspaceChangeRecord[] = [];
    for (const record of [...pending].sort(compareCreatedAsc)) {
      accepted.push(await this.accept(record.id));
    }
    return accepted;
  }

  async diff(id: string): Promise<string> {
    const record = await this.get(id);
    if (!record) throw new Error(`Workspace change not found: ${id}`);
    const before = record.beforeExists ? await this.readSnapshot(record.beforeSnapshotPath) : "";
    const after = record.afterExists ? await this.readSnapshot(record.afterSnapshotPath) : "";
    return simpleDiff(record.path, before, after);
  }

  async diffCheckpoint(id: string): Promise<string> {
    const records = await this.checkpointChanges(id);
    if (records.length === 0) throw new Error(`Workspace checkpoint not found: ${id}`);
    return (await Promise.all(
      [...records].sort(compareCreatedAsc).map(async (record) => [
        `# ${record.id} ${record.action} ${record.path}`,
        await this.diff(record.id)
      ].join("\n"))
    )).join("\n\n");
  }

  private async writeSnapshot(path: string, content: string) {
    const absolutePath = resolve(this.root, path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }

  private async readSnapshot(path: string | undefined) {
    if (!path) return "";
    return await readFile(resolve(this.root, path), "utf8");
  }

  private async writeIndex(records: WorkspaceChangeRecord[]) {
    await mkdir(dirname(this.indexPath), { recursive: true });
    await writeFile(this.indexPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  }
}
