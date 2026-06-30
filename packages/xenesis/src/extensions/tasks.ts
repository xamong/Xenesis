import { z } from 'zod';
import type { ApprovalMode } from '../config/index.js';
import { AgentRunner, type AgentRunUsage, type ApprovalHandler } from '../core/AgentRunner.js';
import type { AgentMessage } from '../core/messages.js';
import { SqliteAgentTaskStore } from '../orchestration/index.js';
import type { AgentProvider } from '../providers/index.js';
import type { Tool, ToolContext, ToolRegistry } from '../tools/index.js';

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface SubagentTask {
  id: string;
  subagent: string;
  prompt: string;
  status: TaskStatus;
  output?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  subagent: string;
  prompt: string;
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  output?: string;
}

export interface TaskStore {
  create(input: CreateTaskInput): Promise<SubagentTask>;
  update(id: string, input: UpdateTaskInput): Promise<SubagentTask>;
  get(id: string): Promise<SubagentTask | undefined>;
  list(): Promise<SubagentTask[]>;
}

export interface SubagentRunOutput {
  output: string;
  usage?: AgentRunUsage;
}

export type SubagentTaskExecutor = (task: SubagentTask, context: ToolContext) => Promise<SubagentRunOutput>;

export interface AgentRunnerSubagentExecutorOptions {
  provider: AgentProvider | ((task: SubagentTask) => AgentProvider);
  model: string | ((task: SubagentTask) => string);
  workspaceRoot: string;
  cwd?: string;
  tools?: Tool[] | ToolRegistry;
  approvalMode?: ApprovalMode;
  maxTurns?: number;
  systemMessages?: Extract<AgentMessage, { role: 'system' }>[];
  blockedTools?: string[];
  approvalHandler?: ApprovalHandler;
}

const subagentTaskItem = z.object({
  prompt: z.string().min(1),
  label: z.string().min(1).nullable().optional(),
});

const taskInputSchema = z.object({
  agent: z.string().min(1).default('researcher'),
  mode: z.enum(['wait', 'background']).default('wait'),
  tasks: z.array(subagentTaskItem).min(1).max(4),
});

const taskOpenAIInputSchema = z.object({
  agent: z.string(),
  mode: z.enum(['wait', 'background']),
  tasks: z.array(
    z.object({
      prompt: z.string(),
      label: z.string().nullable(),
    }),
  ),
});

const approvalModeRank: Record<ApprovalMode, number> = { readonly: 0, safe: 1, auto: 2 };

export function clampApprovalMode(parent: ApprovalMode, child: ApprovalMode): ApprovalMode {
  return approvalModeRank[child] <= approvalModeRank[parent] ? child : parent;
}

function toolArray(tools: Tool[] | ToolRegistry | undefined) {
  if (!tools) return [];
  return Array.isArray(tools) ? tools : Array.from(tools.values());
}

function resolveOption<T>(value: T | ((task: SubagentTask) => T), task: SubagentTask) {
  return typeof value === 'function' ? (value as (task: SubagentTask) => T)(task) : value;
}

export function createAgentRunnerSubagentExecutor(options: AgentRunnerSubagentExecutorOptions): SubagentTaskExecutor {
  return async (task, context) => {
    const subagentTools = toolArray(options.tools).filter((tool) => tool.name !== 'subagent');
    const runner = new AgentRunner({
      provider: resolveOption(options.provider, task),
      model: resolveOption(options.model, task),
      workspaceRoot: options.workspaceRoot,
      cwd: options.cwd ?? context.cwd,
      sessionId: `${context.sessionId}-${task.id}`,
      approvalMode: options.approvalMode ?? 'readonly',
      maxTurns: options.maxTurns ?? 4,
      tools: subagentTools,
      approvalHandler: options.approvalHandler,
      systemMessages: [
        {
          role: 'system',
          content: [`Xenesis subagent: ${task.subagent}`, 'Run the delegated task and return a concise result.'].join(
            '\n',
          ),
        },
        ...(options.systemMessages ?? []),
      ],
      blockedTools: options.blockedTools,
    });
    const result = await runner.runToCompletion(task.prompt);
    return { output: result.content, usage: result.usage };
  };
}

export interface SubagentToolOptions {
  maxConcurrent: number;
  backgroundDefaults?: {
    approvalMode?: ApprovalMode;
    maxTurns?: number;
    maxTokens?: number;
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  run: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await run(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function createSubagentTaskTool(
  store: TaskStore,
  executors: Record<string, SubagentTaskExecutor>,
  options: SubagentToolOptions,
): Tool<z.infer<typeof taskInputSchema>, SubagentTask[]> {
  return {
    name: 'subagent',
    description: [
      'Delegate work to named subagents. mode=wait runs up to 4 tasks in parallel and returns merged results;',
      `mode=background queues each task for the gateway worker. Available agents: ${Object.keys(executors).join(', ') || 'none'}.`,
    ].join(' '),
    inputSchema: taskInputSchema,
    openaiInputSchema: taskOpenAIInputSchema,
    isReadOnly: () => false,
    async run(input, context) {
      const executor = executors[input.agent];
      if (!executor) {
        return {
          ok: false,
          content: `Unknown subagent: ${input.agent}. Available: ${Object.keys(executors).join(', ') || 'none'}.`,
        };
      }

      if (input.mode === 'background') {
        if (!context.xenesisHome) {
          return { ok: false, content: 'Background subagent tasks require xenesisHome for durable state.' };
        }
        const agentTaskStore = new SqliteAgentTaskStore({ xenesisHome: context.xenesisHome });
        const queued: string[] = [];
        for (const item of input.tasks) {
          const task = await agentTaskStore.create({
            prompt: `[subagent:${input.agent}] ${item.prompt}`,
            parentSessionId: context.sessionId,
            source: 'subagent',
            subagent: input.agent,
            label: item.label ?? undefined,
            ...(options.backgroundDefaults ?? {}),
          });
          queued.push(item.label ? `${task.id} label=${item.label}` : task.id);
        }
        return {
          ok: true,
          content: [
            `subagent: queued ${queued.length} background task(s) for "${input.agent}" - requires a running gateway worker.`,
            ...queued.map((id) => `queued: ${id}`),
          ].join('\n'),
        };
      }

      const records: SubagentTask[] = new Array(input.tasks.length);
      const lines = await runWithConcurrency(input.tasks, options.maxConcurrent, async (item, index) => {
        const task = await store.create({ subagent: input.agent, prompt: item.prompt });
        records[index] = task;
        await store.update(task.id, { status: 'running' });
        const label = item.label ?? task.id;
        try {
          const result = await executor(task, context);
          const completed = await store.update(task.id, { status: 'completed', output: result.output });
          records[index] = completed;
          if (result.usage) {
            context.recordUsage?.({
              inputTokens: result.usage.inputTokens,
              outputTokens: result.usage.outputTokens,
            });
          }
          return [
            `${label}: ${result.output}`,
            `taskId: ${completed.id}`,
            `agent: ${completed.subagent}`,
            `status: ${completed.status}`,
          ].join('\n');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const failed = await store.update(task.id, { status: 'failed', output: message });
          records[index] = failed;
          return [
            `${label}: FAILED ${message}`,
            `taskId: ${failed.id}`,
            `agent: ${failed.subagent}`,
            `status: ${failed.status}`,
          ].join('\n');
        }
      });
      const anyFailed = lines.some((line) => line.includes(': FAILED '));
      return { ok: !anyFailed, content: lines.join('\n\n'), data: records };
    },
  };
}
