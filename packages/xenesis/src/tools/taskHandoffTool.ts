import { z } from 'zod';
import type { ApprovalMode } from '../config/index.js';
import {
  type AgentTask,
  type HandoffPriorityPolicy,
  type HandoffSummary,
  isHandoffPriorityPolicy,
  resolveHandoffPriority,
  SqliteAgentTaskStore,
  summarizeHandoffs,
} from '../orchestration/index.js';
import type { Tool, ToolContext } from './types.js';

const approvalModeSchema = z.enum(['safe', 'auto', 'readonly']);
const handoffActionSchema = z.enum(['queue', 'status', 'prioritize']);

const handoffTaskItem = z.object({
  label: z.string().min(1).nullable().optional(),
  prompt: z.string().min(1),
  agent: z.string().min(1).nullable().optional(),
  approvalMode: approvalModeSchema.nullable().optional(),
  maxTurns: z.number().int().positive().nullable().optional(),
  maxTokens: z.number().int().positive().nullable().optional(),
  priority: z.number().int().nullable().optional(),
  dependsOn: z.array(z.string().min(1)).max(12).nullable().optional(),
  dependsOnLabels: z.array(z.string().min(1)).max(12).nullable().optional(),
});

const taskHandoffInput = z.object({
  action: handoffActionSchema.nullable().optional(),
  title: z.string().min(1).nullable().optional(),
  plan: z.string().nullable().optional(),
  tasks: z.array(handoffTaskItem).max(12).nullable().optional(),
  handoffId: z.string().min(1).nullable().optional(),
  priority: z.number().int().nullable().optional(),
});

const taskHandoffOpenAIInput = z.object({
  action: handoffActionSchema.nullable(),
  title: z.string().nullable(),
  plan: z.string().nullable(),
  tasks: z
    .array(
      z.object({
        label: z.string().nullable(),
        prompt: z.string(),
        agent: z.string().nullable(),
        approvalMode: approvalModeSchema.nullable(),
        maxTurns: z.number().int().positive().nullable(),
        maxTokens: z.number().int().positive().nullable(),
        priority: z.number().int().nullable(),
        dependsOn: z.array(z.string()).nullable(),
        dependsOnLabels: z.array(z.string()).nullable(),
      }),
    )
    .nullable(),
  handoffId: z.string().nullable(),
  priority: z.number().int().nullable(),
});

type TaskHandoffInput = z.infer<typeof taskHandoffInput>;
type HandoffTaskItem = z.infer<typeof handoffTaskItem>;

function requireXenesisHome(context: ToolContext) {
  if (!context.xenesisHome) throw new Error('Xenesis home is required for task handoff state.');
  return context.xenesisHome;
}

function createHandoffId() {
  return `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createHandoffTaskId() {
  return `agent-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimStepText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function parsePlanLine(line: string): HandoffTaskItem | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return undefined;

  const checked = trimmed.match(/^[-*]\s+\[[xX]\]\s+(.+)$/);
  if (checked) return undefined;

  const unchecked = trimmed.match(/^[-*]\s+\[\s\]\s+(.+)$/);
  if (unchecked) {
    const prompt = trimStepText(unchecked[1] ?? '');
    return prompt ? { label: prompt, prompt } : undefined;
  }

  const bullet = trimmed.match(/^[-*]\s+(.+)$/);
  if (bullet) {
    const prompt = trimStepText(bullet[1] ?? '');
    return prompt ? { label: prompt, prompt } : undefined;
  }

  const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
  if (numbered) {
    const prompt = trimStepText(numbered[1] ?? '');
    return prompt ? { label: prompt, prompt } : undefined;
  }

  return undefined;
}

function parsePlanTasks(plan: string | undefined | null) {
  if (!plan) return [];
  return plan
    .split(/\r?\n/)
    .map(parsePlanLine)
    .filter((task): task is HandoffTaskItem => Boolean(task))
    .slice(0, 12);
}

function normalizedTasks(input: TaskHandoffInput) {
  if (input.tasks && input.tasks.length > 0) return input.tasks;
  return parsePlanTasks(input.plan);
}

function taskPrompt(
  title: string,
  task: HandoffTaskItem,
  index: number,
  total: number,
  plan: string | null | undefined,
) {
  const sourcePlan = plan?.trim();
  return [
    `Task handoff: ${title}`,
    `Step ${index + 1}/${total}${task.label ? ` - ${task.label}` : ''}`,
    '',
    task.prompt,
    sourcePlan ? ['', 'Source plan:', sourcePlan].join('\n') : undefined,
  ]
    .filter((part): part is string => part !== undefined)
    .join('\n');
}

function preview(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= 90 ? normalized : `${normalized.slice(0, 87)}...`;
}

function taskLabel(task: HandoffTaskItem) {
  return task.label ?? preview(task.prompt);
}

function requireHandoffId(input: TaskHandoffInput) {
  if (!input.handoffId) throw new Error(`Task handoff action "${input.action ?? 'queue'}" requires handoffId.`);
  return input.handoffId;
}

function renderSummary(summary: HandoffSummary) {
  const labelById = new Map(summary.tasks.map((task) => [task.id, task.label ?? task.id]));
  const labels = (tasks: HandoffSummary['tasks']) => tasks.map((task) => task.label ?? task.id).join(', ') || 'none';
  const dependencyText = (task: HandoffSummary['tasks'][number]) => {
    if (!task.dependsOn?.length) return '';
    return ` dependsOn=${task.dependsOn.map((id) => labelById.get(id) ?? id).join(',')}`;
  };
  const blockedText = (task: HandoffSummary['tasks'][number]) => {
    if (!task.blockedBy?.length && !task.blockedReason) return '';
    const by = task.blockedBy?.length
      ? ` blockedBy=${task.blockedBy.map((id) => labelById.get(id) ?? id).join(',')}`
      : '';
    const reason = task.blockedReason ? ` reason=${task.blockedReason}` : '';
    return `${by}${reason}`;
  };
  return [
    `handoff: ${summary.title}`,
    `handoffId: ${summary.handoffId}`,
    summary.parentSessionId ? `parentSessionId: ${summary.parentSessionId}` : undefined,
    `status: ${summary.status}`,
    `progress: ${summary.completed}/${summary.total} (${summary.progressPercent}%)`,
    `queued: ${summary.queued}`,
    `running: ${summary.running}`,
    `blocked: ${summary.blocked}`,
    `ready: ${summary.ready}`,
    `waiting: ${summary.waiting}`,
    summary.nextTask ? `next: ${summary.nextTask.label ?? summary.nextTask.id}` : 'next: none',
    `ready: ${labels(summary.readyTasks)}`,
    `waiting: ${labels(summary.waitingTasks)}`,
    summary.criticalPath.length > 0
      ? `criticalPath: ${summary.criticalPath.map((task) => task.label ?? task.id).join(' -> ')}`
      : 'criticalPath: none',
    ...summary.failedTasks.map(
      (task) =>
        `${task.status === 'blocked' ? 'blocked' : 'failed'}: ${task.label ?? task.id}${task.error || task.blockedReason ? ` - ${task.error ?? task.blockedReason}` : ''}`,
    ),
    'tasks:',
    ...summary.tasks.map(
      (task) =>
        `- ${task.order ?? '?'}. ${task.label ?? task.id} [${task.status}] priority=${task.priority}${dependencyText(task)}${blockedText(task)}`,
    ),
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

function handoffPriorityPolicy(context: ToolContext): { name?: string; policy?: HandoffPriorityPolicy } {
  const executionPolicy = context.toolExecutionPolicy;
  if (typeof executionPolicy !== 'object' || executionPolicy === null) return {};
  const record = executionPolicy as { name?: unknown; handoffPriority?: unknown };
  return {
    ...(typeof record.name === 'string' ? { name: record.name } : {}),
    ...(isHandoffPriorityPolicy(record.handoffPriority) ? { policy: record.handoffPriority } : {}),
  };
}

function duplicateLabels(tasks: HandoffTaskItem[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const task of tasks) {
    const label = taskLabel(task);
    if (seen.has(label)) duplicates.add(label);
    seen.add(label);
  }
  return Array.from(duplicates).sort();
}

function validateDependencyLabels(tasks: HandoffTaskItem[]) {
  const duplicates = duplicateLabels(tasks);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate task labels cannot be used for dependencies: ${duplicates.join(', ')}`);
  }
  const labels = new Set(tasks.map(taskLabel));
  for (const task of tasks) {
    for (const label of task.dependsOnLabels ?? []) {
      if (!labels.has(label)) throw new Error(`Unknown dependency label "${label}" for task "${taskLabel(task)}".`);
    }
  }
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

export const taskHandoffTool: Tool<TaskHandoffInput, AgentTask[]> = {
  name: 'task_handoff',
  description: [
    'Convert a multi-step plan or explicit task list into durable queued agent tasks, summarize handoff progress, or reprioritize queued handoff work.',
    'Use this for long work that should survive the current run and be picked up by the background worker.',
  ].join(' '),
  inputSchema: taskHandoffInput,
  openaiInputSchema: taskHandoffOpenAIInput,
  isReadOnly: (input) => (input.action ?? 'queue') === 'status',
  async run(input, context) {
    try {
      const action = input.action ?? 'queue';
      const store = new SqliteAgentTaskStore({ xenesisHome: requireXenesisHome(context) });

      if (action === 'status') {
        const handoffId = requireHandoffId(input);
        const summaries = await summarizeHandoffs(store, { handoffId });
        if (summaries.length === 0)
          return { ok: false, content: `Task handoff failed: handoff not found: ${handoffId}` };
        return { ok: true, content: summaries.map(renderSummary).join('\n\n'), data: [] };
      }

      if (action === 'prioritize') {
        const handoffId = requireHandoffId(input);
        if (input.priority === undefined || input.priority === null) {
          return { ok: false, content: 'Task handoff failed: action "prioritize" requires priority.' };
        }
        const tasks = await store.list();
        const targets = tasks.filter((task) => task.handoffId === handoffId && task.status === 'queued');
        for (const task of targets) {
          await store.update(task.id, { priority: input.priority });
        }
        return {
          ok: true,
          content: [
            `task handoff: priority updated ${targets.length} queued task(s)`,
            `handoffId: ${handoffId}`,
            `priority: ${input.priority}`,
          ].join('\n'),
          data: targets,
        };
      }

      const tasks = normalizedTasks(input);
      if (tasks.length === 0) {
        return { ok: false, content: 'Task handoff failed: no handoff tasks found in tasks or plan.' };
      }
      validateDependencyLabels(tasks);

      const title = input.title?.trim() || 'Untitled handoff';
      const handoffId = createHandoffId();
      const queued: AgentTask[] = [];
      const priorityPolicy = handoffPriorityPolicy(context);
      const prepared = tasks.map((task, index) => {
        const label = taskLabel(task);
        const resolvedPriority = resolveHandoffPriority({
          label: task.label,
          prompt: task.prompt,
          explicitPriority: task.priority,
          policy: priorityPolicy.policy,
        });

        return {
          id: createHandoffTaskId(),
          index,
          task,
          label,
          resolvedPriority,
          externalDependencies: task.dependsOn ?? [],
          labelDependencies: task.dependsOnLabels ?? [],
        };
      });
      const idByLabel = new Map(prepared.map((item) => [item.label, item.id]));

      for (const item of prepared) {
        const dependsOn = uniqueIds([
          ...item.externalDependencies,
          ...item.labelDependencies.map((dependencyLabel) => idByLabel.get(dependencyLabel) ?? ''),
        ]);

        queued.push(
          await store.create({
            id: item.id,
            prompt: taskPrompt(title, item.task, item.index, tasks.length, input.plan),
            parentSessionId: context.sessionId,
            source: 'handoff',
            subagent: item.task.agent ?? undefined,
            label: item.label,
            handoffId,
            handoffTitle: title,
            handoffOrder: item.index + 1,
            handoffTotal: tasks.length,
            priority: item.resolvedPriority.priority,
            dependsOn: dependsOn.length > 0 ? dependsOn : undefined,
            approvalMode: item.task.approvalMode as ApprovalMode | undefined,
            maxTurns: item.task.maxTurns ?? undefined,
            maxTokens: item.task.maxTokens ?? undefined,
          }),
        );
      }

      return {
        ok: true,
        content: [
          `task handoff: queued ${queued.length} task(s)`,
          `handoffId: ${handoffId}`,
          `parentSessionId: ${context.sessionId}`,
          priorityPolicy.policy ? `policy=${priorityPolicy.name ?? 'unnamed'}` : undefined,
          ...queued.map((task) => {
            const item = prepared.find((candidate) => candidate.id === task.id);
            const label = item?.label ?? task.label ?? preview(task.prompt);
            const displayDependencies = item
              ? [...item.externalDependencies, ...item.labelDependencies]
              : (task.dependsOn ?? []);
            return `${task.handoffOrder ?? '?'}/${task.handoffTotal ?? queued.length} ${task.id} ${label}${task.priority !== undefined ? ` priority=${task.priority}` : ''}${displayDependencies.length > 0 ? ` dependsOn=${displayDependencies.join(',')}` : ''}`;
          }),
        ]
          .filter((line): line is string => line !== undefined)
          .join('\n'),
        data: queued,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, content: `Task handoff failed: ${message}` };
    }
  },
};
