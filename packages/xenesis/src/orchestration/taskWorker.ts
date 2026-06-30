import {
  type AgentTask,
  type AgentTaskExecutor,
  type AgentTaskStatus,
  type AgentTaskStore,
  runAgentTask,
} from './agentTasks.js';

export interface WorkerTaskExecutionContext {
  signal: AbortSignal;
}

export type WorkerTaskExecutor = (
  task: AgentTask,
  context: WorkerTaskExecutionContext,
) => ReturnType<AgentTaskExecutor>;

export type TaskWorkerEventPhase = 'started' | 'retry' | 'completed' | 'failed' | 'blocked' | 'cancelled';

export interface TaskWorkerEvent {
  phase: TaskWorkerEventPhase;
  task: AgentTask;
  status: AgentTaskStatus;
  attempt?: number;
  maxAttempts: number;
  blockedBy?: string[];
  blockedReason?: string;
  error?: string;
  timestamp: string;
}

export type TaskWorkerEventHandler = (event: TaskWorkerEvent) => Promise<void> | void;

export interface TaskWorkerOptions {
  taskStore: AgentTaskStore;
  executor: WorkerTaskExecutor;
  concurrency?: number;
  pollIntervalMs?: number;
  errorBackoffMs?: number;
  maxAttempts?: number;
  onTick?: () => Promise<void> | void;
  onTaskEvent?: TaskWorkerEventHandler;
}

export interface TaskWorkerTickResult {
  started: AgentTask[];
  running: number;
}

function compareTaskAge(left: AgentTask, right: AgentTask) {
  const priorityDiff = (right.priority ?? 0) - (left.priority ?? 0);
  if (priorityDiff !== 0) return priorityDiff;
  const createdDiff = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return left.id.localeCompare(right.id);
}

function dependenciesOf(task: AgentTask) {
  return task.dependsOn ?? [];
}

function dependencyFailureReason(task: AgentTask | undefined, id: string) {
  if (!task) return `dependency missing: ${id}`;
  if (task.status === 'failed') return `dependency failed: ${id}`;
  if (task.status === 'cancelled') return `dependency cancelled: ${id}`;
  if (task.status === 'blocked') return `dependency blocked: ${id}`;
  return undefined;
}

function dependencyState(task: AgentTask, tasksById: Map<string, AgentTask>) {
  const dependencies = dependenciesOf(task);
  const blocked: string[] = [];
  const waiting: string[] = [];
  const reasons: string[] = [];

  for (const dependencyId of dependencies) {
    const dependency = tasksById.get(dependencyId);
    const reason = dependencyFailureReason(dependency, dependencyId);
    if (reason) {
      blocked.push(dependencyId);
      reasons.push(reason);
      continue;
    }
    if (dependency?.status !== 'completed') waiting.push(dependencyId);
  }

  return {
    ready: blocked.length === 0 && waiting.length === 0,
    blocked,
    waiting,
    blockedReason: reasons.join('; '),
  };
}

export class TaskWorker {
  private readonly concurrency: number;
  private readonly pollIntervalMs: number;
  private readonly errorBackoffMs: number;
  private readonly maxAttempts: number;
  private readonly running = new Map<string, AbortController>();
  private readonly runningTasks = new Map<string, Promise<void>>();
  private timer: NodeJS.Timeout | undefined;
  private started = false;
  private ticking = false;

  constructor(private readonly options: TaskWorkerOptions) {
    this.concurrency = Math.max(1, options.concurrency ?? 1);
    this.pollIntervalMs = Math.max(1, options.pollIntervalMs ?? 3000);
    this.errorBackoffMs = Math.max(1, options.errorBackoffMs ?? this.pollIntervalMs * 2);
    this.maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  }

  async start() {
    if (this.started) return;
    this.started = true;
    await this.recoverInterruptedTasks();
    this.schedule(0);
  }

  async stop() {
    this.started = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    for (const controller of this.running.values()) {
      controller.abort();
    }
    await Promise.allSettled([...this.runningTasks.values()]);
  }

  runningCount() {
    return this.running.size;
  }

  async tick(): Promise<TaskWorkerTickResult> {
    if (this.ticking) return { started: [], running: this.running.size };
    this.ticking = true;
    try {
      await this.options.onTick?.();
      await this.abortCancelledTasks();
      await this.requeueRetryableFailedTasks();
      await this.unblockReadyTasks();
      await this.blockTerminalDependentTasks();

      const tasks = await this.options.taskStore.list();
      const tasksById = new Map(tasks.map((task) => [task.id, task]));
      const queued = tasks
        .filter((task) => task.status === 'queued' && !this.running.has(task.id))
        .filter((task) => dependencyState(task, tasksById).ready)
        .sort(compareTaskAge);
      const started: AgentTask[] = [];

      for (const task of queued) {
        if (this.running.size >= this.concurrency) break;
        this.startTask(task);
        started.push(task);
      }

      return { started, running: this.running.size };
    } finally {
      this.ticking = false;
    }
  }

  private async recoverInterruptedTasks() {
    const tasks = await this.options.taskStore.list();
    for (const task of tasks) {
      if (task.status === 'running') {
        if ((task.attempts ?? 0) >= this.maxAttempts) {
          const failed = await this.options.taskStore.update(task.id, {
            status: 'failed',
            error: `Task interrupted after ${task.attempts ?? 0} attempts during worker recovery.`,
            finishedAt: new Date().toISOString(),
          });
          await this.emitTaskEvent('failed', failed, {
            attempt: failed.attempts,
            error: failed.error,
          });
          continue;
        }
        const queued = await this.options.taskStore.update(task.id, {
          status: 'queued',
          error: undefined,
          finishedAt: undefined,
        });
        await this.emitTaskEvent('retry', queued, {
          attempt: (task.attempts ?? 0) + 1,
        });
      }
    }
  }

  private async requeueRetryableFailedTasks() {
    const tasks = await this.options.taskStore.list();
    for (const task of tasks) {
      if (task.status !== 'failed') continue;
      if ((task.attempts ?? 0) >= this.maxAttempts) continue;
      const queued = await this.options.taskStore.update(task.id, {
        status: 'queued',
        error: undefined,
        finishedAt: undefined,
      });
      await this.emitTaskEvent('retry', queued, {
        attempt: (task.attempts ?? 0) + 1,
        error: task.error,
      });
    }
  }

  private async unblockReadyTasks() {
    const tasks = await this.options.taskStore.list();
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    for (const task of tasks) {
      if (task.status !== 'blocked') continue;
      if (!dependenciesOf(task).length) continue;
      const state = dependencyState(task, tasksById);
      if (!state.ready) continue;
      await this.options.taskStore.update(task.id, {
        status: 'queued',
        blockedBy: undefined,
        blockedReason: undefined,
        error: undefined,
        finishedAt: undefined,
      });
    }
  }

  private async blockTerminalDependentTasks() {
    const tasks = await this.options.taskStore.list();
    const tasksById = new Map(tasks.map((task) => [task.id, task]));
    for (const task of tasks) {
      if (task.status !== 'queued') continue;
      const state = dependencyState(task, tasksById);
      if (state.blocked.length === 0) continue;
      const blocked = await this.options.taskStore.update(task.id, {
        status: 'blocked',
        blockedBy: state.blocked,
        blockedReason: state.blockedReason,
        error: state.blockedReason,
        finishedAt: new Date().toISOString(),
      });
      await this.emitTaskEvent('blocked', blocked, {
        blockedBy: state.blocked,
        blockedReason: state.blockedReason,
        error: state.blockedReason,
      });
    }
  }

  private async abortCancelledTasks() {
    for (const [taskId, controller] of this.running) {
      const task = await this.options.taskStore.get(taskId);
      if (!task || task.status === 'cancelled') controller.abort();
    }
  }

  private startTask(task: AgentTask) {
    const controller = new AbortController();
    this.running.set(task.id, controller);
    const run = this.executeTask(task, controller).finally(() => {
      this.running.delete(task.id);
      this.runningTasks.delete(task.id);
    });
    this.runningTasks.set(task.id, run);
    void run;
  }

  private async executeTask(task: AgentTask, controller: AbortController) {
    await this.emitTaskEvent('started', task, {
      status: 'running',
      attempt: (task.attempts ?? 0) + 1,
    });
    try {
      const result = await runAgentTask(this.options.taskStore, task.id, (current) =>
        this.options.executor(current, { signal: controller.signal }),
      );
      if (result.status === 'completed') {
        await this.emitTaskEvent('completed', result, {
          attempt: result.attempts,
        });
      } else if (result.status === 'cancelled') {
        await this.emitTaskEvent('cancelled', result, {
          attempt: result.attempts,
          error: result.error,
        });
      } else if (result.status === 'failed' || result.status === 'blocked') {
        await this.emitTaskEvent(result.status, result, {
          attempt: result.attempts,
          blockedBy: result.blockedBy,
          blockedReason: result.blockedReason,
          error: result.error,
        });
      }
    } catch (error) {
      // runAgentTask persists the failure. The worker loop should keep polling.
      const latest = (await this.options.taskStore.get(task.id)) ?? task;
      await this.emitTaskEvent(latest.status === 'cancelled' ? 'cancelled' : 'failed', latest, {
        attempt: latest.attempts,
        error: latest.error ?? errorMessage(error),
      });
    }
  }

  private async emitTaskEvent(
    phase: TaskWorkerEventPhase,
    task: AgentTask,
    details: Partial<Omit<TaskWorkerEvent, 'phase' | 'task' | 'maxAttempts' | 'timestamp'>> = {},
  ) {
    try {
      await this.options.onTaskEvent?.({
        phase,
        task,
        status: details.status ?? task.status,
        attempt: details.attempt ?? task.attempts,
        maxAttempts: this.maxAttempts,
        blockedBy: details.blockedBy,
        blockedReason: details.blockedReason,
        error: details.error,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Worker lifecycle observers are best-effort and should not affect task execution.
    }
  }

  private schedule(delayMs: number) {
    if (!this.started) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.loop();
    }, delayMs);
  }

  private async loop() {
    if (!this.started) return;
    try {
      await this.tick();
      this.schedule(this.pollIntervalMs);
    } catch {
      this.schedule(this.errorBackoffMs);
    }
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
