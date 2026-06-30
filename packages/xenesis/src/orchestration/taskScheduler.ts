import type { AgentTask, AgentTaskStore } from './agentTasks.js';
import { type ScheduleStore, shouldFireSchedule, type TaskSchedule } from './schedules.js';

export interface TaskSchedulerOptions {
  scheduleStore: ScheduleStore;
  taskStore: AgentTaskStore;
  now?: () => Date;
}

export interface TaskSchedulerTickResult {
  fired: TaskSchedule[];
  created: AgentTask[];
  skipped: TaskSchedule[];
}

export const recurringCronMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

function hasActiveScheduleTask(tasks: AgentTask[], scheduleId: string) {
  return tasks.some(
    (task) => task.scheduleId === scheduleId && (task.status === 'queued' || task.status === 'running'),
  );
}

function scheduleDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function shouldRemoveCronAfterFire(schedule: TaskSchedule, at: Date) {
  if (schedule.trigger.type !== 'cron') return false;
  if (schedule.trigger.recurring === false) return true;
  const createdAt = scheduleDate(schedule.createdAt);
  return createdAt ? at.getTime() - createdAt.getTime() >= recurringCronMaxAgeMs : false;
}

export class TaskScheduler {
  constructor(private readonly options: TaskSchedulerOptions) {}

  async tick(): Promise<TaskSchedulerTickResult> {
    const at = this.options.now?.() ?? new Date();
    const schedules = await this.options.scheduleStore.list();
    const tasks = await this.options.taskStore.list();
    const fired: TaskSchedule[] = [];
    const created: AgentTask[] = [];
    const skipped: TaskSchedule[] = [];

    for (const schedule of schedules) {
      if (!shouldFireSchedule(schedule, at)) continue;

      if (hasActiveScheduleTask(tasks, schedule.id)) {
        skipped.push(schedule);
        continue;
      }

      const task = await this.options.taskStore.create({
        prompt: schedule.prompt,
        scheduleId: schedule.id,
        approvalMode: schedule.defaults?.approvalMode,
        maxTurns: schedule.defaults?.maxTurns,
        maxTokens: schedule.defaults?.maxTokens,
      });
      tasks.push(task);
      created.push(task);
      if (shouldRemoveCronAfterFire(schedule, at)) {
        await this.options.scheduleStore.remove(schedule.id);
        fired.push(schedule);
      } else {
        fired.push(
          await this.options.scheduleStore.update(schedule.id, {
            lastFiredAt: at.toISOString(),
          }),
        );
      }
    }

    return { fired, created, skipped };
  }
}
