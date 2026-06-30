// src/orchestration/SqliteAgentTaskStore.ts
import { openDatabase } from '../db/database.js';
import { runStartupImports } from '../db/startupImports.js';
import { TableStore } from '../db/tableStore.js';
import {
  type AgentTask,
  type AgentTaskStore,
  type CreateAgentTaskInput,
  createTaskId,
  now,
  type UpdateAgentTaskInput,
  validateTaskId,
} from './agentTasks.js';

const INDEX_COLUMNS = [
  'status',
  'source',
  'handoff_id',
  'parent_session_id',
  'schedule_id',
  'priority',
  'handoff_order',
  'created_at',
  'updated_at',
];

export class SqliteAgentTaskStore implements AgentTaskStore {
  private readonly table: TableStore<AgentTask>;
  private readonly ready: Promise<void>;
  constructor(options: { xenesisHome: string }) {
    this.table = new TableStore<AgentTask>(openDatabase(options.xenesisHome), {
      table: 'agent_tasks',
      id: (t) => t.id,
      indexColumns: INDEX_COLUMNS,
      derive: (t) => ({
        status: t.status,
        source: t.source ?? null,
        handoff_id: t.handoffId ?? null,
        parent_session_id: t.parentSessionId ?? null,
        schedule_id: t.scheduleId ?? null,
        priority: t.priority ?? 0,
        handoff_order: t.handoffOrder ?? null,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      }),
    });
    this.ready = runStartupImports(options.xenesisHome);
  }

  async create(input: CreateAgentTaskInput): Promise<AgentTask> {
    await this.ready;
    const timestamp = now();
    const id = input.id ?? createTaskId();
    validateTaskId(id);
    const task: AgentTask = {
      id,
      prompt: input.prompt,
      status: 'queued',
      sessionId: id,
      subject: input.subject,
      description: input.description,
      activeForm: input.activeForm,
      owner: input.owner,
      metadata: input.metadata,
      parentSessionId: input.parentSessionId,
      source: input.source,
      subagent: input.subagent,
      label: input.label,
      handoffId: input.handoffId,
      handoffTitle: input.handoffTitle,
      handoffOrder: input.handoffOrder,
      handoffTotal: input.handoffTotal,
      priority: input.priority,
      blocks: input.blocks,
      dependsOn: input.dependsOn,
      blockedBy: input.blockedBy,
      blockedReason: input.blockedReason,
      approvalMode: input.approvalMode,
      maxTurns: input.maxTurns,
      maxTokens: input.maxTokens,
      scheduleId: input.scheduleId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    try {
      this.table.insert(task);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE') || msg.includes('SQLITE_CONSTRAINT')) {
        throw new Error(`Agent task already exists: ${id}`);
      }
      throw err;
    }
    return task;
  }

  async update(id: string, input: UpdateAgentTaskInput): Promise<AgentTask> {
    await this.ready;
    return this.table.updateOptimistic(id, (current) => ({ ...current, ...input, updatedAt: now() }));
  }

  async get(id: string): Promise<AgentTask | undefined> {
    await this.ready;
    return this.table.get(id);
  }
  async list(): Promise<AgentTask[]> {
    await this.ready;
    return this.table.list();
  }
  async delete(id: string): Promise<boolean> {
    await this.ready;
    return this.table.delete(id);
  }

  async cancel(id: string): Promise<AgentTask> {
    await this.ready;
    return this.table.updateOptimistic(id, (current) => {
      if (current.status === 'completed' || current.status === 'failed') {
        throw new Error(`Agent task cannot be cancelled from status ${current.status}: ${id}`);
      }
      const t = now();
      return { ...current, status: 'cancelled', finishedAt: t, updatedAt: t };
    });
  }

  async retry(id: string): Promise<AgentTask> {
    await this.ready;
    return this.table.updateOptimistic(id, (current) => {
      if (current.status === 'running') throw new Error(`Agent task cannot be retried while running: ${id}`);
      return {
        ...current,
        status: 'queued',
        error: undefined,
        blockedBy: undefined,
        blockedReason: undefined,
        finishedAt: undefined,
        updatedAt: now(),
      };
    });
  }
}
