import type { ApprovalMode } from '../config/types.js';
import type { AgentRunUsage } from '../core/AgentRunner.js';
import type { IsolationOutcome } from '../core/isolation/index.js';
import type { HookEmitter, HookName } from '../hooks/index.js';

export type AgentTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'blocked';

export interface AgentTaskAttempt {
  attempt: number;
  status: 'running' | 'completed' | 'failed' | 'blocked' | 'cancelled';
  startedAt: string;
  finishedAt?: string;
  sessionId?: string;
  outputChars?: number;
  error?: string;
}

export interface AgentTask {
  id: string;
  prompt: string;
  status: AgentTaskStatus;
  sessionId: string;
  subject?: string;
  description?: string;
  activeForm?: string;
  owner?: string;
  metadata?: Record<string, unknown>;
  parentSessionId?: string;
  source?: string;
  subagent?: string;
  label?: string;
  handoffId?: string;
  handoffTitle?: string;
  handoffOrder?: number;
  handoffTotal?: number;
  priority?: number;
  blocks?: string[];
  dependsOn?: string[];
  blockedBy?: string[];
  blockedReason?: string;
  approvalMode?: ApprovalMode;
  maxTurns?: number;
  maxTokens?: number;
  scheduleId?: string;
  usage?: AgentTaskUsage;
  artifactId?: string;
  attempts?: number;
  attemptHistory?: AgentTaskAttempt[];
  contextInjectedSessionIds?: string[];
  contextInjectedAt?: string;
  output?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  workspaceIsolation?: IsolationOutcome;
}

export type AgentTaskUsage = AgentRunUsage;

export interface CreateAgentTaskInput {
  id?: string;
  prompt: string;
  subject?: string;
  description?: string;
  activeForm?: string;
  owner?: string;
  metadata?: Record<string, unknown>;
  parentSessionId?: string;
  source?: string;
  subagent?: string;
  label?: string;
  handoffId?: string;
  handoffTitle?: string;
  handoffOrder?: number;
  handoffTotal?: number;
  priority?: number;
  blocks?: string[];
  dependsOn?: string[];
  blockedBy?: string[];
  blockedReason?: string;
  approvalMode?: ApprovalMode;
  maxTurns?: number;
  maxTokens?: number;
  scheduleId?: string;
}

export interface UpdateAgentTaskInput {
  status?: AgentTaskStatus;
  prompt?: string;
  sessionId?: string;
  subject?: string;
  description?: string;
  activeForm?: string;
  owner?: string;
  metadata?: Record<string, unknown>;
  parentSessionId?: string;
  source?: string;
  subagent?: string;
  label?: string;
  handoffId?: string;
  handoffTitle?: string;
  handoffOrder?: number;
  handoffTotal?: number;
  priority?: number;
  blocks?: string[];
  dependsOn?: string[];
  blockedBy?: string[];
  blockedReason?: string;
  approvalMode?: ApprovalMode;
  maxTurns?: number;
  maxTokens?: number;
  scheduleId?: string;
  usage?: AgentTaskUsage;
  artifactId?: string;
  attempts?: number;
  attemptHistory?: AgentTaskAttempt[];
  contextInjectedSessionIds?: string[];
  contextInjectedAt?: string;
  output?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  workspaceIsolation?: IsolationOutcome;
}

export interface AgentTaskStore {
  create(input: CreateAgentTaskInput): Promise<AgentTask>;
  update(id: string, input: UpdateAgentTaskInput): Promise<AgentTask>;
  get(id: string): Promise<AgentTask | undefined>;
  list(): Promise<AgentTask[]>;
  delete(id: string): Promise<boolean>;
  cancel(id: string): Promise<AgentTask>;
  retry(id: string): Promise<AgentTask>;
}

export type AgentTaskExecutor = (task: AgentTask) => Promise<{
  status?: 'completed' | 'failed' | 'blocked';
  output: string;
  sessionId?: string;
  artifactId?: string;
  usage?: AgentTaskUsage;
  error?: string;
  isolation?: IsolationOutcome;
}>;

export interface AgentTaskContextOptions {
  maxTasks?: number;
  maxOutputChars?: number;
  maxTotalChars?: number;
}

export interface AgentTaskContextSummary {
  taskIds: string[];
  content?: string;
}

export interface HandoffTaskSummary {
  id: string;
  label?: string;
  status: AgentTaskStatus;
  order?: number;
  priority: number;
  dependsOn?: string[];
  blockedBy?: string[];
  blockedReason?: string;
  error?: string;
}

export interface HandoffSummary {
  handoffId: string;
  title: string;
  parentSessionId?: string;
  total: number;
  completed: number;
  failed: number;
  cancelled: number;
  running: number;
  queued: number;
  blocked: number;
  ready: number;
  waiting: number;
  progressPercent: number;
  status: 'queued' | 'running' | 'blocked' | 'completed' | 'cancelled';
  nextTask?: HandoffTaskSummary;
  readyTasks: HandoffTaskSummary[];
  waitingTasks: HandoffTaskSummary[];
  failedTasks: HandoffTaskSummary[];
  criticalPath: HandoffTaskSummary[];
  tasks: HandoffTaskSummary[];
}

export interface HandoffSummaryOptions {
  handoffId?: string;
  parentSessionId?: string;
}

export interface RunAgentTaskOptions {
  hooks?: HookEmitter;
}

export function now() {
  return new Date().toISOString();
}

export function createTaskId() {
  return `agent-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function validateTaskId(id: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(id)) {
    throw new Error(`Invalid agent task id: ${id}`);
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 14)).trimEnd()}\n[truncated]`;
}

function appendStartedAttempt(task: AgentTask, attempt: number, startedAt: string): AgentTaskAttempt[] {
  return [
    ...(task.attemptHistory ?? []),
    {
      attempt,
      status: 'running',
      startedAt,
    },
  ];
}

function updateLatestAttempt(
  task: AgentTask,
  patch: Partial<Omit<AgentTaskAttempt, 'attempt' | 'startedAt'>>,
): AgentTaskAttempt[] {
  const history = [...(task.attemptHistory ?? [])];
  if (history.length === 0) return history;
  const index = history.length - 1;
  history[index] = {
    ...history[index]!,
    ...patch,
  };
  return history;
}

function completedAt(task: AgentTask) {
  return task.finishedAt ?? task.updatedAt;
}

function compareNewestTask(left: AgentTask, right: AgentTask) {
  const dateDiff = Date.parse(completedAt(right)) - Date.parse(completedAt(left));
  if (dateDiff !== 0) return dateDiff;
  return right.id.localeCompare(left.id);
}

function shouldInjectTaskContext(task: AgentTask, sessionId: string) {
  return (
    task.status === 'completed' &&
    task.parentSessionId === sessionId &&
    Boolean(task.output?.trim()) &&
    !(task.contextInjectedSessionIds ?? []).includes(sessionId)
  );
}

function taskOrder(task: AgentTask) {
  return task.handoffOrder ?? Number.MAX_SAFE_INTEGER;
}

function taskPriority(task: AgentTask) {
  return task.priority ?? 0;
}

function compareHandoffTask(left: AgentTask, right: AgentTask) {
  const orderDiff = taskOrder(left) - taskOrder(right);
  if (orderDiff !== 0) return orderDiff;
  const priorityDiff = taskPriority(right) - taskPriority(left);
  if (priorityDiff !== 0) return priorityDiff;
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

function handoffStatus(
  total: number,
  completed: number,
  blocked: number,
  running: number,
  queued: number,
  cancelled: number,
): HandoffSummary['status'] {
  if (total > 0 && completed === total) return 'completed';
  if (blocked > 0) return 'blocked';
  if (running > 0) return 'running';
  if (queued > 0) return 'queued';
  if (cancelled > 0) return 'cancelled';
  return 'queued';
}

function toHandoffTaskSummary(task: AgentTask): HandoffTaskSummary {
  return {
    id: task.id,
    label: task.label,
    status: task.status,
    order: task.handoffOrder,
    priority: taskPriority(task),
    dependsOn: task.dependsOn,
    blockedBy: task.blockedBy,
    blockedReason: task.blockedReason,
    error: task.error,
  };
}

function dependenciesOf(task: AgentTask) {
  return task.dependsOn ?? [];
}

function isDependencyBlocked(task: AgentTask | undefined) {
  return !task || task.status === 'failed' || task.status === 'cancelled' || task.status === 'blocked';
}

function taskDependencyState(task: AgentTask, taskById: Map<string, AgentTask>) {
  const dependencies = dependenciesOf(task);
  const blockedBy = dependencies.filter((id) => isDependencyBlocked(taskById.get(id)));
  const waitingFor = dependencies.filter((id) => {
    const dependency = taskById.get(id);
    return dependency !== undefined && dependency.status !== 'completed' && !isDependencyBlocked(dependency);
  });
  return {
    blockedBy,
    waitingFor,
    ready: dependencies.length === 0 || (blockedBy.length === 0 && waitingFor.length === 0),
  };
}

function isCompletedTask(task: AgentTask) {
  return task.status === 'completed';
}

function nonCompletedTasks(tasks: AgentTask[]) {
  return tasks.filter((task) => !isCompletedTask(task));
}

function comparePathCandidate(left: AgentTask, right: AgentTask) {
  const priorityDiff = taskPriority(right) - taskPriority(left);
  if (priorityDiff !== 0) return priorityDiff;
  return compareHandoffTask(left, right);
}

function criticalPath(tasks: AgentTask[]) {
  const remaining = nonCompletedTasks(tasks);
  if (remaining.length === 0) return [];
  const remainingIds = new Set(remaining.map((task) => task.id));
  const dependents = new Map<string, AgentTask[]>();
  for (const task of remaining) {
    for (const dependencyId of dependenciesOf(task)) {
      if (!remainingIds.has(dependencyId)) continue;
      dependents.set(dependencyId, [...(dependents.get(dependencyId) ?? []), task]);
    }
  }

  const memo = new Map<string, AgentTask[]>();
  const pathFrom = (task: AgentTask, visiting = new Set<string>()): AgentTask[] => {
    if (memo.has(task.id)) return memo.get(task.id)!;
    if (visiting.has(task.id)) return [task];
    const nextVisiting = new Set(visiting);
    nextVisiting.add(task.id);
    const children = (dependents.get(task.id) ?? []).sort(comparePathCandidate);
    const childPaths = children.map((child) => pathFrom(child, nextVisiting));
    const bestChildPath = childPaths.sort((left, right) => right.length - left.length)[0] ?? [];
    const path = [task, ...bestChildPath];
    memo.set(task.id, path);
    return path;
  };

  const roots = remaining
    .filter((task) => dependenciesOf(task).every((id) => !remainingIds.has(id)))
    .sort(comparePathCandidate);
  const candidates = (roots.length > 0 ? roots : remaining.sort(comparePathCandidate)).map((task) => pathFrom(task));
  return candidates.sort((left, right) => right.length - left.length)[0] ?? [];
}

export async function summarizeHandoffs(
  store: AgentTaskStore,
  options: HandoffSummaryOptions = {},
): Promise<HandoffSummary[]> {
  const tasks = (await store.list())
    .filter((task) => task.handoffId)
    .filter((task) => !options.handoffId || task.handoffId === options.handoffId)
    .filter((task) => !options.parentSessionId || task.parentSessionId === options.parentSessionId);
  const groups = new Map<string, AgentTask[]>();
  for (const task of tasks) {
    const handoffId = task.handoffId!;
    groups.set(handoffId, [...(groups.get(handoffId) ?? []), task]);
  }

  return Array.from(groups.entries())
    .map(([handoffId, group]) => {
      const ordered = group.sort(compareHandoffTask);
      const completed = ordered.filter((task) => task.status === 'completed').length;
      const failed = ordered.filter((task) => task.status === 'failed').length;
      const cancelled = ordered.filter((task) => task.status === 'cancelled').length;
      const running = ordered.filter((task) => task.status === 'running').length;
      const queued = ordered.filter((task) => task.status === 'queued').length;
      const taskById = new Map(ordered.map((task) => [task.id, task]));
      const blocked = failed + cancelled + ordered.filter((task) => task.status === 'blocked').length;
      const readyTasks = ordered.filter(
        (task) => task.status === 'queued' && taskDependencyState(task, taskById).ready,
      );
      const waitingTasks = ordered.filter(
        (task) => task.status === 'queued' && taskDependencyState(task, taskById).waitingFor.length > 0,
      );
      const total = ordered.length;
      const active = [...ordered.filter((task) => task.status === 'running'), ...readyTasks];
      const nextTask =
        active.length > 0
          ? active.sort((left, right) => taskPriority(right) - taskPriority(left) || compareHandoffTask(left, right))[0]
          : undefined;
      return {
        handoffId,
        title: ordered.find((task) => task.handoffTitle)?.handoffTitle ?? handoffId,
        parentSessionId: ordered.find((task) => task.parentSessionId)?.parentSessionId,
        total,
        completed,
        failed,
        cancelled,
        running,
        queued,
        blocked,
        ready: readyTasks.length,
        waiting: waitingTasks.length,
        progressPercent: total > 0 ? Math.floor((completed / total) * 100) : 0,
        status: handoffStatus(total, completed, blocked, running, queued, cancelled),
        nextTask: nextTask ? toHandoffTaskSummary(nextTask) : undefined,
        readyTasks: readyTasks.map(toHandoffTaskSummary),
        waitingTasks: waitingTasks.map(toHandoffTaskSummary),
        failedTasks: ordered
          .filter((task) => task.status === 'failed' || task.status === 'cancelled' || task.status === 'blocked')
          .map(toHandoffTaskSummary),
        criticalPath: criticalPath(ordered).map(toHandoffTaskSummary),
        tasks: ordered.map(toHandoffTaskSummary),
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title) || left.handoffId.localeCompare(right.handoffId));
}

export async function collectAgentTaskContext(
  store: AgentTaskStore,
  sessionId: string,
  options: AgentTaskContextOptions = {},
): Promise<AgentTaskContextSummary> {
  const maxTasks = Math.max(1, options.maxTasks ?? 4);
  const maxOutputChars = Math.max(120, options.maxOutputChars ?? 1200);
  const maxTotalChars = Math.max(maxOutputChars, options.maxTotalChars ?? 5000);
  const tasks = (await store.list())
    .filter((task) => shouldInjectTaskContext(task, sessionId))
    .sort(compareNewestTask)
    .slice(0, maxTasks);

  if (tasks.length === 0) return { taskIds: [] };

  const lines: string[] = [
    'Xenesis background task results:',
    'Use these completed delegated/background task results before repeating the same work. Refer to taskId when useful.',
  ];
  for (const [index, task] of tasks.entries()) {
    const header = [
      `${index + 1}. taskId: ${task.id}`,
      task.label ? `label: ${task.label}` : undefined,
      task.subagent ? `agent: ${task.subagent}` : undefined,
      `completedAt: ${completedAt(task)}`,
    ]
      .filter((part): part is string => Boolean(part))
      .join(' | ');
    lines.push(header);
    lines.push(`prompt: ${truncateText(task.prompt, 260)}`);
    lines.push(`output:\n${truncateText(task.output ?? '', maxOutputChars)}`);
  }

  return {
    taskIds: tasks.map((task) => task.id),
    content: truncateText(lines.join('\n'), maxTotalChars),
  };
}

export async function markAgentTasksContextInjected(store: AgentTaskStore, taskIds: string[], sessionId: string) {
  const timestamp = now();
  for (const taskId of taskIds) {
    const task = await store.get(taskId);
    if (!task) continue;
    const sessionIds = new Set(task.contextInjectedSessionIds ?? []);
    sessionIds.add(sessionId);
    await store.update(taskId, {
      contextInjectedSessionIds: Array.from(sessionIds).sort(),
      contextInjectedAt: timestamp,
    });
  }
}

async function emitTaskHook(
  hooks: HookEmitter | undefined,
  name: HookName,
  task: AgentTask,
  payload: Record<string, unknown>,
) {
  if (!hooks) return;
  try {
    await hooks.emit({
      name,
      taskId: task.id,
      sessionId: task.sessionId,
      payload,
    });
  } catch {
    // Hook failures must not change durable task state.
  }
}

export async function runAgentTask(
  store: AgentTaskStore,
  id: string,
  executor: AgentTaskExecutor,
  options: RunAgentTaskOptions = {},
) {
  const task = await store.get(id);
  if (!task) throw new Error(`Agent task not found: ${id}`);
  if (task.status === 'cancelled') {
    await emitTaskHook(options.hooks, 'task_cancelled', task, { status: task.status });
    throw new Error(`Agent task is cancelled: ${id}`);
  }
  if (task.status === 'completed') return task;

  const attemptStartedAt = now();
  const attempt = (task.attempts ?? 0) + 1;
  const started = await store.update(id, {
    status: 'running',
    startedAt: task.startedAt ?? attemptStartedAt,
    attempts: attempt,
    attemptHistory: appendStartedAttempt(task, attempt, attemptStartedAt),
    error: undefined,
  });
  await emitTaskHook(options.hooks, 'task_started', started, {
    prompt: started.prompt,
    status: started.status,
  });

  try {
    const result = await executor(started);
    const finishedAt = now();
    const latest = (await store.get(id)) ?? started;
    const resultStatus = result.status ?? 'completed';
    if (resultStatus !== 'completed') {
      const failedOrBlocked = await store.update(id, {
        status: resultStatus,
        output: result.output,
        error: result.error ?? `task ${resultStatus}`,
        sessionId: result.sessionId ?? started.sessionId,
        artifactId: result.artifactId,
        usage: result.usage,
        ...(result.isolation ? { workspaceIsolation: result.isolation } : {}),
        finishedAt,
        attemptHistory: updateLatestAttempt(latest, {
          status: resultStatus,
          finishedAt,
          sessionId: result.sessionId ?? started.sessionId,
          outputChars: result.output.length,
          error: result.error ?? `task ${resultStatus}`,
        }),
      });
      await emitTaskHook(options.hooks, 'task_failed', failedOrBlocked, {
        error: failedOrBlocked.error ?? `task ${resultStatus}`,
        status: failedOrBlocked.status,
      });
      return failedOrBlocked;
    }
    const completed = await store.update(id, {
      status: 'completed',
      output: result.output,
      sessionId: result.sessionId ?? started.sessionId,
      artifactId: result.artifactId,
      usage: result.usage,
      ...(result.isolation ? { workspaceIsolation: result.isolation } : {}),
      finishedAt,
      attemptHistory: updateLatestAttempt(latest, {
        status: 'completed',
        finishedAt,
        sessionId: result.sessionId ?? started.sessionId,
        outputChars: result.output.length,
      }),
    });
    await emitTaskHook(options.hooks, 'task_completed', completed, {
      outputLength: result.output.length,
      status: completed.status,
    });
    return completed;
  } catch (error) {
    const finishedAt = now();
    const latest = await store.get(id);
    if (latest?.status === 'cancelled') {
      const cancelled = await store.update(id, {
        finishedAt: latest.finishedAt ?? finishedAt,
        attemptHistory: updateLatestAttempt(latest, {
          status: 'cancelled',
          finishedAt,
          error: errorMessage(error),
        }),
      });
      await emitTaskHook(options.hooks, 'task_cancelled', cancelled, { status: cancelled.status });
      return cancelled;
    }

    const failedBase = latest ?? started;
    const failed = await store.update(id, {
      status: 'failed',
      error: errorMessage(error),
      finishedAt,
      attemptHistory: updateLatestAttempt(failedBase, {
        status: 'failed',
        finishedAt,
        error: errorMessage(error),
      }),
    });
    await emitTaskHook(options.hooks, 'task_failed', failed, {
      error: failed.error ?? errorMessage(error),
      status: failed.status,
    });
    throw error;
  }
}
