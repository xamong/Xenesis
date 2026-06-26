import { z } from "zod";
import { xenesisStatePath, type ApprovalMode } from "../config/index.js";
import { SqliteAgentTaskStore, type AgentTask } from "../orchestration/index.js";
import { formatTeamAgentId, registerTeamMember } from "./teamTools.js";
import type { Tool, ToolContext } from "./types.js";

const agentModelSchema = z.enum(["sonnet", "opus", "haiku"]);

const agentInputSchema = z.object({
  action: z.enum(["launch", "status"]).nullable().optional(),
  description: z.string().min(1).nullable().optional(),
  prompt: z.string().min(1).nullable().optional(),
  subagent_type: z.string().min(1).nullable().optional(),
  model: agentModelSchema.nullable().optional(),
  run_in_background: z.boolean().nullable().optional(),
  name: z.string().min(1).nullable().optional(),
  team_name: z.string().min(1).nullable().optional(),
  mode: z.string().min(1).nullable().optional(),
  isolation: z.enum(["worktree", "remote"]).nullable().optional(),
  cwd: z.string().min(1).nullable().optional(),
  agentId: z.string().min(1).nullable().optional(),
  taskId: z.string().min(1).nullable().optional(),
  task_id: z.string().min(1).nullable().optional(),
  id: z.string().min(1).nullable().optional()
});

const agentOpenAIInputSchema = z.object({
  action: z.enum(["launch", "status"]).nullable(),
  description: z.string().nullable(),
  prompt: z.string().nullable(),
  subagent_type: z.string().nullable(),
  model: agentModelSchema.nullable(),
  run_in_background: z.boolean().nullable(),
  name: z.string().nullable(),
  team_name: z.string().nullable(),
  mode: z.string().nullable(),
  isolation: z.enum(["worktree", "remote"]).nullable(),
  cwd: z.string().nullable(),
  agentId: z.string().nullable(),
  taskId: z.string().nullable(),
  task_id: z.string().nullable(),
  id: z.string().nullable()
});

type AgentToolInput = z.infer<typeof agentInputSchema>;

interface AsyncAgentLaunchOutput {
  isAsync: true;
  status: "async_launched";
  agentId: string;
  description: string;
  prompt: string;
  outputFile: string;
  canReadOutputFile: boolean;
}

interface TeammateSpawnOutput {
  status: "teammate_spawned";
  prompt: string;
  teammate_id: string;
  agent_id: string;
  agent_type: string;
  name: string;
  team_name: string;
  tmux_session_name: string;
  tmux_window_name: string;
  tmux_pane_id: string;
  plan_mode_required: boolean;
  task_id: string;
}

function requireXenesisHome(context: ToolContext) {
  if (!context.xenesisHome) {
    throw new Error("Xenesis home is required for durable agent state.");
  }
  return context.xenesisHome;
}

function agentTasksPath(context: ToolContext) {
  return xenesisStatePath(requireXenesisHome(context), "agent_tasks.json");
}

function agentTaskStore(context: ToolContext) {
  return new SqliteAgentTaskStore({ xenesisHome: requireXenesisHome(context) });
}

function requireLaunchText(input: AgentToolInput) {
  if (!input.description) throw new Error('Agent launch requires "description".');
  if (!input.prompt) throw new Error('Agent launch requires "prompt".');
  return {
    description: input.description,
    prompt: input.prompt
  };
}

function agentIdFromInput(input: AgentToolInput) {
  return input.agentId ?? input.taskId ?? input.task_id ?? input.id;
}

function requireAgentId(input: AgentToolInput) {
  const id = agentIdFromInput(input);
  if (!id) throw new Error('Agent status requires "agentId".');
  return id;
}

function approvalModeForAgent(input: AgentToolInput): ApprovalMode {
  if (input.mode === "auto") return "auto";
  if (input.mode === "plan" || input.mode === "readonly") return "readonly";
  return "safe";
}

function agentOutputFile(context: ToolContext, agentId: string) {
  return `${agentTasksPath(context)}#${agentId}`;
}

function metadataForAgent(input: AgentToolInput) {
  const teamAgentId = input.team_name && input.name
    ? formatTeamAgentId(input.name, input.team_name)
    : undefined;
  return {
    agentTool: true,
    ...(teamAgentId ? { agentId: teamAgentId, isActive: true } : {}),
    ...(input.model ? { model: input.model } : {}),
    runInBackground: input.run_in_background ?? false,
    ...(input.name ? { name: input.name } : {}),
    ...(input.team_name ? { teamName: input.team_name } : {}),
    ...(input.mode ? { mode: input.mode } : {}),
    ...(input.isolation ? { isolation: input.isolation } : {}),
    ...(input.cwd ? { cwd: input.cwd } : {})
  };
}

function renderStatus(task: AgentTask) {
  return [
    `agentId: ${task.id}`,
    `status: ${task.status}`,
    task.subagent ? `subagent: ${task.subagent}` : undefined,
    task.label ? `description: ${task.label}` : undefined,
    `prompt: ${task.prompt}`,
    task.startedAt ? `startedAt: ${task.startedAt}` : undefined,
    task.finishedAt ? `finishedAt: ${task.finishedAt}` : undefined,
    task.output ? `output: ${task.output}` : undefined,
    task.error ? `error: ${task.error}` : undefined
  ].filter((line): line is string => line !== undefined).join("\n");
}

async function launchAgent(input: AgentToolInput, context: ToolContext) {
  const { description, prompt } = requireLaunchText(input);
  const subagentType = input.subagent_type ?? "general-purpose";
  const teamAgentId = input.team_name && input.name
    ? formatTeamAgentId(input.name, input.team_name)
    : undefined;
  const task = await agentTaskStore(context).create({
    prompt,
    subject: description,
    description,
    parentSessionId: context.sessionId,
    source: "agent",
    subagent: subagentType,
    label: description,
    approvalMode: approvalModeForAgent(input),
    metadata: metadataForAgent(input)
  });
  if (teamAgentId && input.team_name && input.name) {
    await registerTeamMember(context, input.team_name, {
      name: input.name,
      agentId: teamAgentId,
      agentType: subagentType,
      model: input.model ?? undefined,
      cwd: input.cwd ?? context.cwd,
      isActive: true,
      mode: input.mode ?? undefined
    });
    const data: TeammateSpawnOutput = {
      status: "teammate_spawned",
      prompt,
      teammate_id: teamAgentId,
      agent_id: teamAgentId,
      agent_type: subagentType,
      name: input.name,
      team_name: input.team_name,
      tmux_session_name: "",
      tmux_window_name: input.name,
      tmux_pane_id: "",
      plan_mode_required: input.mode === "plan",
      task_id: task.id
    };
    return {
      ok: true,
      content: [
        `Teammate "${input.name}" spawned for team "${input.team_name}".`,
        `agent_id: ${teamAgentId}`,
        `task_id: ${task.id}`
      ].join("\n"),
      data
    };
  }
  const data: AsyncAgentLaunchOutput = {
    isAsync: true,
    status: "async_launched",
    agentId: task.id,
    description,
    prompt,
    outputFile: agentOutputFile(context, task.id),
    canReadOutputFile: true
  };

  return {
    ok: true,
    content: [
      "Async agent launched successfully.",
      `agentId: ${data.agentId}`,
      "The agent is working in the background.",
      `output_file: ${data.outputFile}`
    ].join("\n"),
    data
  };
}

async function agentStatus(input: AgentToolInput, context: ToolContext) {
  const id = requireAgentId(input);
  const task = await agentTaskStore(context).get(id);
  if (!task) {
    return {
      ok: false,
      content: `Agent not found: ${id}`
    };
  }
  return {
    ok: true,
    content: renderStatus(task),
    data: task
  };
}

export const agentTool: Tool<AgentToolInput, AsyncAgentLaunchOutput | TeammateSpawnOutput | AgentTask> = {
  name: "agent",
  description: "Launch and inspect durable Xenesis agents using the reference AgentTool input and async output contract.",
  inputSchema: agentInputSchema,
  openaiInputSchema: agentOpenAIInputSchema,
  isReadOnly: (input) => input.action === "status",
  isConcurrencySafe: () => true,
  async run(input, context) {
    try {
      return input.action === "status"
        ? await agentStatus(input, context)
        : await launchAgent(input, context);
    } catch (error) {
      return {
        ok: false,
        content: `Agent tool failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};
