import { z } from "zod";
import { SqliteAgentMessageStore, SqliteAgentTaskStore, type AgentTask } from "../orchestration/index.js";
import type { Tool, ToolContext } from "./types.js";

const structuredMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("shutdown_request"),
    reason: z.string().nullable().optional()
  }),
  z.object({
    type: z.literal("shutdown_response"),
    request_id: z.string().min(1),
    approve: z.boolean(),
    reason: z.string().nullable().optional()
  }),
  z.object({
    type: z.literal("plan_approval_response"),
    request_id: z.string().min(1),
    approve: z.boolean(),
    feedback: z.string().nullable().optional()
  })
]);

const sendMessageInputSchema = z.object({
  to: z.string(),
  summary: z.string().nullable().optional(),
  message: z.union([z.string(), structuredMessageSchema])
});

const sendMessageOpenAIInputSchema = z.object({
  to: z.string(),
  summary: z.string().nullable(),
  message: z.union([z.string(), structuredMessageSchema])
});

type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

interface SendMessageOutput {
  success: boolean;
  message: string;
  recipients?: string[];
  routing?: {
    sender: string;
    target: string;
    summary?: string;
    content?: string;
  };
}

const terminalStatuses = new Set<AgentTask["status"]>(["completed", "failed", "cancelled", "blocked"]);

function requireXenesisHome(context: ToolContext) {
  if (!context.xenesisHome) {
    throw new Error("Xenesis home is required for durable agent messages.");
  }
  return context.xenesisHome;
}

function taskStore(context: ToolContext) {
  return new SqliteAgentTaskStore({ xenesisHome: requireXenesisHome(context) });
}

function messageStore(context: ToolContext) {
  return new SqliteAgentMessageStore({ xenesisHome: requireXenesisHome(context) });
}

function missingText(value: string | null | undefined) {
  return typeof value !== "string" || value.trim() === "";
}

function validateInput(input: SendMessageInput): string | undefined {
  if (input.to.trim().length === 0) return "to must not be empty";
  if (input.to.includes("@")) return 'to must be a bare agent name, agent id, or "*"';
  if (typeof input.message === "string" && missingText(input.summary)) {
    return "summary is required when message is a string";
  }
  if (input.to === "*" && typeof input.message !== "string") {
    return 'structured messages cannot be broadcast (to: "*")';
  }
  if (
    typeof input.message !== "string" &&
    input.message.type === "shutdown_response" &&
    !input.message.approve &&
    missingText(input.message.reason)
  ) {
    return "reason is required when rejecting a shutdown request";
  }
  return undefined;
}

function metadataName(task: AgentTask) {
  const name = task.metadata?.name;
  return typeof name === "string" ? name : undefined;
}

function matchesRecipient(task: AgentTask, to: string) {
  return (
    task.id === to ||
    metadataName(task) === to ||
    task.label === to ||
    task.subagent === to
  );
}

function compareNewest(left: AgentTask, right: AgentTask) {
  return right.updatedAt.localeCompare(left.updatedAt) || right.id.localeCompare(left.id);
}

function isAgentAddressable(task: AgentTask) {
  return task.source === "agent" || task.source === "agent_message" || task.source === "subagent";
}

function messageText(message: SendMessageInput["message"]) {
  return typeof message === "string" ? message : JSON.stringify(message);
}

async function resolveTarget(store: SqliteAgentTaskStore, to: string) {
  const tasks = (await store.list())
    .filter(isAgentAddressable)
    .filter((task) => matchesRecipient(task, to))
    .sort(compareNewest);
  return tasks[0];
}

function activeRecipients(tasks: AgentTask[]) {
  return tasks
    .filter(isAgentAddressable)
    .filter((task) => !terminalStatuses.has(task.status))
    .sort(compareNewest);
}

function targetName(task: AgentTask, fallback: string) {
  return metadataName(task) ?? task.label ?? task.subagent ?? fallback;
}

async function queueToActiveAgent(
  target: AgentTask,
  input: SendMessageInput,
  context: ToolContext
) {
  const name = targetName(target, input.to);
  await messageStore(context).enqueue({
    fromSessionId: context.sessionId,
    toTaskId: target.id,
    toAgentName: name,
    ...(input.summary ? { summary: input.summary } : {}),
    message: messageText(input.message),
    messageType: typeof input.message === "string" ? "message" : "structured"
  });
  const text = `Message queued for delivery to ${name} at its next tool round.`;
  return {
    ok: true,
    content: text,
    data: {
      success: true,
      message: text,
      routing: {
        sender: context.sessionId,
        target: name,
        ...(input.summary ? { summary: input.summary } : {}),
        ...(typeof input.message === "string" ? { content: input.message } : {})
      }
    }
  };
}

async function resumeStoppedAgent(
  store: SqliteAgentTaskStore,
  target: AgentTask,
  input: SendMessageInput,
  context: ToolContext
) {
  const label = input.summary?.trim() || `Message to ${targetName(target, input.to)}`;
  const followUp = await store.create({
    prompt: messageText(input.message),
    parentSessionId: context.sessionId,
    source: "agent_message",
    subagent: target.subagent,
    label,
    subject: label,
    description: label,
    dependsOn: [target.id],
    approvalMode: target.approvalMode,
    maxTurns: target.maxTurns,
    maxTokens: target.maxTokens,
    metadata: {
      messageFrom: context.sessionId,
      messageTo: input.to,
      resumedFromAgentId: target.id,
      ...(input.summary ? { summary: input.summary } : {}),
      originalMessage: input.message
    }
  });
  const text = [
    `Agent "${input.to}" was stopped (${target.status}); resumed it in the background with your message.`,
    `agentId: ${followUp.id}`
  ].join(" ");
  return {
    ok: true,
    content: text,
    data: {
      success: true,
      message: text,
      routing: {
        sender: context.sessionId,
        target: input.to,
        ...(input.summary ? { summary: input.summary } : {}),
        ...(typeof input.message === "string" ? { content: input.message } : {})
      }
    }
  };
}

async function broadcastMessage(
  store: SqliteAgentTaskStore,
  input: SendMessageInput,
  context: ToolContext
) {
  const recipients = activeRecipients(await store.list());
  if (recipients.length === 0) {
    return {
      ok: false,
      content: "No active agents to broadcast to.",
      data: {
        success: false,
        message: "No active agents to broadcast to.",
        recipients: []
      }
    };
  }
  for (const task of recipients) {
    const name = targetName(task, task.id);
    await messageStore(context).enqueue({
      fromSessionId: context.sessionId,
      toTaskId: task.id,
      toAgentName: name,
      ...(input.summary ? { summary: input.summary } : {}),
      message: messageText(input.message),
      messageType: "message"
    });
  }
  const recipientNames = recipients.map((task) => targetName(task, task.id));
  const text = `Message broadcast to ${recipientNames.length} agent(s): ${recipientNames.join(", ")}`;
  return {
    ok: true,
    content: text,
    data: {
      success: true,
      message: text,
      recipients: recipientNames
    }
  };
}

export const sendMessageTool: Tool<SendMessageInput, SendMessageOutput> = {
  name: "send_message",
  description: "Send a message to another durable Xenesis agent.",
  inputSchema: sendMessageInputSchema,
  openaiInputSchema: sendMessageOpenAIInputSchema,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  async run(input, context) {
    try {
      const validationError = validateInput(input);
      if (validationError) return { ok: false, content: validationError };
      const store = taskStore(context);
      if (input.to === "*") return await broadcastMessage(store, input, context);
      const target = await resolveTarget(store, input.to);
      if (!target) return { ok: false, content: `Agent not found: ${input.to}` };
      return terminalStatuses.has(target.status)
        ? await resumeStoppedAgent(store, target, input, context)
        : await queueToActiveAgent(target, input, context);
    } catch (error) {
      return {
        ok: false,
        content: `SendMessage tool failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};
