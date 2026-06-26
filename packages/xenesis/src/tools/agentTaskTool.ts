import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { SqliteAgentTaskStore, type AgentTask, type AgentTaskStatus } from "../orchestration/index.js";
import type { Tool, ToolContext } from "./types.js";

const taskStatusInputSchema = z.enum([
  "queued",
  "running",
  "pending",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
  "blocked",
  "deleted"
]);

const agentTaskInput = z.object({
  action: z.enum(["create", "list", "show", "get", "update", "cancel", "stop", "retry", "output"]),
  id: z.string().min(1).nullable().optional(),
  taskId: z.string().min(1).nullable().optional(),
  task_id: z.string().min(1).nullable().optional(),
  prompt: z.string().min(1).nullable().optional(),
  subject: z.string().min(1).nullable().optional(),
  description: z.string().min(1).nullable().optional(),
  activeForm: z.string().min(1).nullable().optional(),
  owner: z.string().min(1).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  status: taskStatusInputSchema.nullable().optional(),
  sessionId: z.string().min(1).nullable().optional(),
  artifactId: z.string().min(1).nullable().optional(),
  addBlocks: z.array(z.string().min(1)).nullable().optional(),
  addBlockedBy: z.array(z.string().min(1)).nullable().optional(),
  dependsOn: z.array(z.string().min(1)).nullable().optional(),
  blockedBy: z.array(z.string().min(1)).nullable().optional(),
  blockedReason: z.string().nullable().optional(),
  output: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  block: z.boolean().nullable().optional(),
  timeout: z.number().int().min(0).max(600000).nullable().optional()
});

const agentTaskOpenAIInput = z.object({
  action: z.enum(["create", "list", "show", "get", "update", "cancel", "stop", "retry", "output"]),
  id: z.string().nullable(),
  taskId: z.string().nullable(),
  task_id: z.string().nullable(),
  prompt: z.string().nullable(),
  subject: z.string().nullable(),
  description: z.string().nullable(),
  activeForm: z.string().nullable(),
  owner: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  status: taskStatusInputSchema.nullable(),
  sessionId: z.string().nullable(),
  artifactId: z.string().nullable(),
  addBlocks: z.array(z.string()).nullable(),
  addBlockedBy: z.array(z.string()).nullable(),
  dependsOn: z.array(z.string()).nullable(),
  blockedBy: z.array(z.string()).nullable(),
  blockedReason: z.string().nullable(),
  output: z.string().nullable(),
  error: z.string().nullable(),
  block: z.boolean().nullable(),
  timeout: z.number().int().min(0).max(600000).nullable()
});

type AgentTaskInput = z.infer<typeof agentTaskInput>;

function requireXenesisHome(context: ToolContext) {
  if (!context.xenesisHome) {
    throw new Error("Xenesis home is required for durable agent task state.");
  }
  return context.xenesisHome;
}

function taskStore(context: ToolContext) {
  return new SqliteAgentTaskStore({ xenesisHome: requireXenesisHome(context) });
}

function requireId(input: AgentTaskInput) {
  const id = input.id ?? input.taskId ?? input.task_id;
  if (!id) throw new Error(`Action "${input.action}" requires id.`);
  return id;
}

function requirePrompt(input: AgentTaskInput) {
  const prompt = input.prompt ?? input.description ?? input.subject;
  if (!prompt) throw new Error('Action "create" requires prompt, subject, or description.');
  return prompt;
}

function taskSubject(task: AgentTask) {
  return task.subject ?? task.label ?? task.prompt;
}

function taskDescription(task: AgentTask) {
  return task.description ?? task.prompt;
}

function formatTaskLine(task: AgentTask) {
  const legacyLine = `${task.id} ${task.status} ${task.prompt}`;
  const subject = taskSubject(task);
  const owner = task.owner ? ` (${task.owner})` : "";
  const blocked = task.blockedBy?.length
    ? ` [blocked by ${task.blockedBy.map((id) => `#${id}`).join(", ")}]`
    : "";
  const referenceLine = `#${task.id} [${task.status}] ${subject}${owner}${blocked}`;
  return referenceLine === `#${task.id} [${task.status}] ${task.prompt}`
    ? legacyLine
    : `${legacyLine}\n${referenceLine}`;
}

function formatTaskDetails(task: AgentTask) {
  return [
    `Task #${task.id}: ${taskSubject(task)}`,
    `Status: ${task.status}`,
    `Description: ${taskDescription(task)}`,
    task.blockedBy?.length ? `Blocked by: ${task.blockedBy.map((id) => `#${id}`).join(", ")}` : undefined,
    task.blocks?.length ? `Blocks: ${task.blocks.map((id) => `#${id}`).join(", ")}` : undefined,
    `id: ${task.id}`,
    `status: ${task.status}`,
    `prompt: ${task.prompt}`,
    task.subject ? `subject: ${task.subject}` : undefined,
    task.description ? `description: ${task.description}` : undefined,
    task.activeForm ? `activeForm: ${task.activeForm}` : undefined,
    task.owner ? `owner: ${task.owner}` : undefined,
    task.metadata && Object.keys(task.metadata).length > 0 ? `metadata: ${JSON.stringify(task.metadata)}` : undefined,
    `sessionId: ${task.sessionId}`,
    task.parentSessionId ? `parentSessionId: ${task.parentSessionId}` : undefined,
    task.source ? `source: ${task.source}` : undefined,
    task.subagent ? `subagent: ${task.subagent}` : undefined,
    task.label ? `label: ${task.label}` : undefined,
    task.handoffId ? `handoffId: ${task.handoffId}` : undefined,
    task.handoffTitle ? `handoffTitle: ${task.handoffTitle}` : undefined,
    task.handoffOrder && task.handoffTotal ? `handoffStep: ${task.handoffOrder}/${task.handoffTotal}` : undefined,
    task.priority !== undefined ? `priority: ${task.priority}` : undefined,
    task.blocks?.length ? `blocks: ${task.blocks.join(", ")}` : undefined,
    task.dependsOn?.length ? `dependsOn: ${task.dependsOn.join(", ")}` : undefined,
    task.blockedBy?.length ? `blockedBy: ${task.blockedBy.join(", ")}` : undefined,
    task.blockedReason ? `blockedReason: ${task.blockedReason}` : undefined,
    task.artifactId ? `artifactId: ${task.artifactId}` : undefined,
    `attempts: ${task.attempts ?? 0}`,
    task.contextInjectedSessionIds?.length
      ? `contextInjectedSessionIds: ${task.contextInjectedSessionIds.join(", ")}`
      : undefined,
    task.contextInjectedAt ? `contextInjectedAt: ${task.contextInjectedAt}` : undefined,
    `createdAt: ${task.createdAt}`,
    `updatedAt: ${task.updatedAt}`,
    task.startedAt ? `startedAt: ${task.startedAt}` : undefined,
    task.finishedAt ? `finishedAt: ${task.finishedAt}` : undefined,
    task.output ? `output: ${task.output}` : undefined,
    task.error ? `error: ${task.error}` : undefined
  ].filter((line): line is string => line !== undefined).join("\n");
}

function toAgentTaskStatus(status: AgentTaskInput["status"]): AgentTaskStatus | "deleted" | undefined {
  if (!status) return undefined;
  if (status === "pending") return "queued";
  if (status === "in_progress") return "running";
  return status;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function mergeMetadata(existing: Record<string, unknown> | undefined, patch: Record<string, unknown>) {
  const merged = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function updatePayload(input: AgentTaskInput, existing: AgentTask) {
  const payload: {
    status?: AgentTaskStatus;
    prompt?: string;
    subject?: string;
    description?: string;
    activeForm?: string;
    owner?: string;
    metadata?: Record<string, unknown>;
    label?: string;
    sessionId?: string;
    artifactId?: string;
    blocks?: string[];
    dependsOn?: string[];
    blockedBy?: string[];
    blockedReason?: string;
    output?: string;
    error?: string;
  } = {};

  const status = toAgentTaskStatus(input.status);
  if (status && status !== "deleted") payload.status = status;
  if (input.subject) {
    payload.subject = input.subject;
    payload.label = input.subject;
  }
  if (input.description) {
    payload.description = input.description;
    payload.prompt = input.description;
  }
  if (input.activeForm) payload.activeForm = input.activeForm;
  if (input.owner) payload.owner = input.owner;
  if (input.metadata !== undefined && input.metadata !== null) {
    payload.metadata = mergeMetadata(existing.metadata, input.metadata);
  }
  if (input.sessionId) payload.sessionId = input.sessionId;
  if (input.artifactId) payload.artifactId = input.artifactId;
  if (input.addBlocks !== undefined && input.addBlocks !== null) {
    payload.blocks = unique([...(existing.blocks ?? []), ...input.addBlocks]);
  }
  if (input.addBlockedBy !== undefined && input.addBlockedBy !== null) {
    payload.blockedBy = unique([...(existing.blockedBy ?? []), ...input.addBlockedBy]);
  }
  if (input.dependsOn !== undefined && input.dependsOn !== null) payload.dependsOn = input.dependsOn;
  if (input.blockedBy !== undefined && input.blockedBy !== null) payload.blockedBy = input.blockedBy;
  if (input.blockedReason !== undefined && input.blockedReason !== null) payload.blockedReason = input.blockedReason;
  if (input.output !== undefined && input.output !== null) payload.output = input.output;
  if (input.error !== undefined && input.error !== null) payload.error = input.error;

  if (Object.keys(payload).length === 0) {
    throw new Error('Action "update" requires at least one supported task field.');
  }

  return payload;
}

function formatTaskOutput(task: AgentTask, retrievalStatus: "success" | "timeout" | "not_ready") {
  const parts = [
    `<retrieval_status>${retrievalStatus}</retrieval_status>`,
    `<task_id>${task.id}</task_id>`,
    "<task_type>agent_task</task_type>",
    `<status>${task.status}</status>`
  ];
  if (task.output?.trim()) {
    parts.push(`<output>\n${task.output.trimEnd()}\n</output>`);
  }
  if (task.error) {
    parts.push(`<error>${task.error}</error>`);
  }
  return parts.join("\n\n");
}

function outputStatus(task: AgentTask, block: boolean) {
  if (task.output?.trim() || task.status === "completed" || task.status === "failed" || task.status === "cancelled" || task.status === "blocked") {
    return "success" as const;
  }
  return block ? "timeout" as const : "not_ready" as const;
}

async function waitForTaskOutput(store: SqliteAgentTaskStore, id: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let latest = await store.get(id);
  while (latest && outputStatus(latest, false) === "not_ready" && Date.now() < deadline) {
    await delay(Math.min(100, Math.max(1, deadline - Date.now())));
    latest = await store.get(id);
  }
  return latest;
}

export const agentTaskTool: Tool<AgentTaskInput, AgentTask | AgentTask[]> = {
  name: "agent_task",
  description: "Create, inspect, update, cancel, and retry durable Xenesis agent tasks.",
  inputSchema: agentTaskInput,
  openaiInputSchema: agentTaskOpenAIInput,
  isReadOnly: (input) => input.action === "list" || input.action === "show" || input.action === "get" || input.action === "output",
  async run(input, context) {
    try {
      const store = taskStore(context);

      if (input.action === "create") {
        const subject = input.subject ?? input.prompt ?? input.description ?? "Untitled task";
        const description = input.description ?? input.prompt ?? subject;
        const task = await store.create({
          prompt: requirePrompt(input),
          subject,
          description,
          activeForm: input.activeForm ?? undefined,
          label: subject,
          owner: input.owner ?? undefined,
          metadata: input.metadata ?? undefined,
          dependsOn: input.dependsOn ?? undefined
        });
        return {
          ok: true,
          content: [
            `agent task created: ${task.id}`,
            `Task #${task.id} created successfully: ${subject}`
          ].join("\n"),
          data: task
        };
      }

      if (input.action === "list") {
        const tasks = await store.list();
        return {
          ok: true,
          content: tasks.length > 0
            ? tasks.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).map(formatTaskLine).join("\n")
            : "agent tasks: none",
          data: tasks
        };
      }

      const id = requireId(input);

      if (input.action === "show" || input.action === "get") {
        const task = await store.get(id);
        if (!task) {
          return { ok: false, content: input.action === "get" ? "Task not found" : `agent task not found: ${id}` };
        }
        return { ok: true, content: formatTaskDetails(task), data: task };
      }

      if (input.action === "update") {
        const existing = await store.get(id);
        if (!existing) return { ok: false, content: "Task not found" };
        const status = toAgentTaskStatus(input.status);
        if (status === "deleted") {
          const deleted = await store.delete(id);
          return {
            ok: deleted,
            content: deleted ? `Updated task #${id} deleted` : "Task not found"
          };
        }
        const task = await store.update(id, updatePayload(input, existing));
        return {
          ok: true,
          content: [
            `agent task updated: ${task.id} ${task.status}`,
            `Updated task #${task.id} ${input.status ? "status" : "fields"}`
          ].join("\n"),
          data: task
        };
      }

      if (input.action === "cancel") {
        const task = await store.cancel(id);
        return { ok: true, content: `agent task updated: ${task.id} ${task.status}`, data: task };
      }

      if (input.action === "stop") {
        const task = await store.get(id);
        if (!task) return { ok: false, content: `Task not found: ${id}` };
        if (task.status !== "running") {
          return { ok: false, content: `Task ${id} is not running (status: ${task.status})` };
        }
        const stopped = await store.cancel(id);
        return {
          ok: true,
          content: `Successfully stopped task: ${stopped.id} (${taskSubject(stopped)})`,
          data: stopped
        };
      }

      if (input.action === "output") {
        let task = await store.get(id);
        if (!task) return { ok: false, content: `No task found with ID: ${id}` };
        const block = input.block ?? true;
        if (block && outputStatus(task, false) === "not_ready") {
          task = await waitForTaskOutput(store, id, input.timeout ?? 30000);
          if (!task) return { ok: false, content: `No task found with ID: ${id}` };
        }
        return {
          ok: true,
          content: formatTaskOutput(task, outputStatus(task, block)),
          data: task
        };
      }

      const task = await store.retry(id);
      return { ok: true, content: `agent task updated: ${task.id} ${task.status}`, data: task };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, content: `Agent task tool failed: ${message}` };
    }
  }
};
