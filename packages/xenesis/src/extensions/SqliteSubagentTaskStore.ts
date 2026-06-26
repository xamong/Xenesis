// src/extensions/SqliteSubagentTaskStore.ts
import { openDatabase } from "../db/database.js";
import { runStartupImports } from "../db/startupImports.js";
import { TableStore } from "../db/tableStore.js";
import { createTaskId, now } from "../orchestration/agentTasks.js";
import type { TaskStore, SubagentTask, CreateTaskInput, UpdateTaskInput } from "./tasks.js";

export class SqliteSubagentTaskStore implements TaskStore {
  private readonly table: TableStore<SubagentTask>;
  private readonly ready: Promise<void>;
  constructor(options: { xenesisHome: string }) {
    this.table = new TableStore<SubagentTask>(openDatabase(options.xenesisHome), {
      table: "subagent_tasks",
      id: (t) => t.id,
      indexColumns: ["status", "subagent", "created_at", "updated_at"],
      derive: (t) => ({ status: t.status, subagent: t.subagent, created_at: t.createdAt, updated_at: t.updatedAt }),
    });
    this.ready = runStartupImports(options.xenesisHome);
  }
  async create(input: CreateTaskInput): Promise<SubagentTask> {
    await this.ready;
    const ts = now();
    const task: SubagentTask = { id: createTaskId(), subagent: input.subagent, prompt: input.prompt, status: "queued", createdAt: ts, updatedAt: ts };
    this.table.insert(task);
    return task;
  }
  async update(id: string, input: UpdateTaskInput): Promise<SubagentTask> {
    await this.ready;
    return this.table.updateOptimistic(id, (c) => ({ ...c, ...input, updatedAt: now() }));
  }
  async get(id: string) { await this.ready; return this.table.get(id); }
  async list() { await this.ready; return this.table.list(); }
}
