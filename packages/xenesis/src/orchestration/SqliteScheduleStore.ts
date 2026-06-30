// src/orchestration/SqliteScheduleStore.ts
import { openDatabase } from '../db/database.js';
import { runStartupImports } from '../db/startupImports.js';
import { TableStore } from '../db/tableStore.js';
import { now } from './agentTasks.js';
import {
  type CreateScheduleInput,
  createScheduleId,
  type ScheduleStore,
  type TaskSchedule,
  type UpdateScheduleInput,
  validateTrigger,
} from './schedules.js';

export class SqliteScheduleStore implements ScheduleStore {
  private readonly table: TableStore<TaskSchedule>;
  private readonly ready: Promise<void>;

  constructor(options: { xenesisHome: string }) {
    this.table = new TableStore<TaskSchedule>(openDatabase(options.xenesisHome), {
      table: 'schedules',
      id: (s) => s.id,
      indexColumns: ['enabled', 'kind', 'created_at', 'updated_at'],
      derive: (s) => ({
        enabled: s.enabled ? 1 : 0,
        kind: s.trigger.type,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      }),
    });
    this.ready = runStartupImports(options.xenesisHome);
  }

  async create(input: CreateScheduleInput): Promise<TaskSchedule> {
    await this.ready;
    validateTrigger(input.trigger);
    const ts = now();
    const id = createScheduleId();
    const schedule: TaskSchedule = {
      id,
      prompt: input.prompt,
      enabled: input.enabled ?? true,
      trigger: input.trigger,
      defaults: input.defaults,
      createdAt: ts,
      updatedAt: ts,
    };
    this.table.insert(schedule);
    return schedule;
  }

  async update(id: string, input: UpdateScheduleInput): Promise<TaskSchedule> {
    await this.ready;
    return this.table.updateOptimistic(id, (current) => ({
      ...current,
      ...input,
      updatedAt: now(),
    }));
  }

  async get(id: string): Promise<TaskSchedule | undefined> {
    await this.ready;
    return this.table.get(id);
  }

  async list(): Promise<TaskSchedule[]> {
    await this.ready;
    return this.table.list();
  }

  async remove(id: string): Promise<void> {
    await this.ready;
    this.table.delete(id);
  }
}
