import { createBuiltInTools } from "../../tools/index.js";
import type { ToolContext, ToolResult } from "../../tools/types.js";
import { SqliteAgentTaskStore, type AgentTask } from "../../orchestration/index.js";
import type { OracleObservation } from "./GoldenReplay.js";

export interface ToolAgentTaskReplayInput {
  agent: {
    description: string;
    prompt: string;
    subagent_type: string;
    model: "sonnet" | "opus" | "haiku";
    run_in_background: boolean;
    mode: string;
    isolation: "worktree" | "remote";
  };
  task: {
    subject: string;
    description: string;
    activeForm: string;
    metadata: Record<string, unknown>;
    update: {
      subject: string;
      description: string;
      status: "in_progress";
      addBlocks: string[];
      addBlockedBy: string[];
      metadata: Record<string, unknown>;
    };
    output: string;
  };
}

export interface ToolAgentTaskReplayOptions {
  workspaceRoot: string;
  xenesisHome: string;
  input: ToolAgentTaskReplayInput;
}

function context(options: Pick<ToolAgentTaskReplayOptions, "workspaceRoot" | "xenesisHome">): ToolContext {
  return {
    workspaceRoot: options.workspaceRoot,
    xenesisHome: options.xenesisHome,
    cwd: options.workspaceRoot,
    sessionId: "agent-task-oracle-session",
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

function dataRecord(result: ToolResult): Record<string, unknown> {
  return result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
}

function taskData(result: ToolResult): AgentTask {
  const data = dataRecord(result);
  if (typeof data.id !== "string") {
    throw new Error("Expected tool result data to include a task id");
  }
  return data as unknown as AgentTask;
}

function stringData(result: ToolResult, key: string): string {
  const value = dataRecord(result)[key];
  return typeof value === "string" ? value : "";
}

function contentIncludes(content: string, expected: string): string {
  return content.includes(expected) ? expected : "";
}

function projectOutputBlock(content: string): string {
  return content
    .split(/\r?\n/)
    .filter((line) => !/^<task_id>.+<\/task_id>$/u.test(line))
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n");
}

export async function collectToolAgentTaskObservation(options: ToolAgentTaskReplayOptions): Promise<OracleObservation> {
  const tools = createBuiltInTools();
  const agent = tools.get("agent");
  const agentTask = tools.get("agent_task");
  if (!agent || !agentTask) {
    throw new Error("Expected built-in agent and agent_task tools");
  }

  const toolContext = context(options);
  const store = new SqliteAgentTaskStore({ xenesisHome: options.xenesisHome });

  const launch = await agent.run(options.input.agent, toolContext);
  const agentId = stringData(launch, "agentId");
  const launchedTask = await store.get(agentId);
  if (!launchedTask) {
    throw new Error(`Expected launched agent task to exist: ${agentId}`);
  }
  await store.update(agentId, {
    status: "completed",
    output: "agent launch complete"
  });
  const agentStatus = await agent.run({ action: "status", agentId }, toolContext);

  const created = await agentTask.run({
    action: "create",
    subject: options.input.task.subject,
    description: options.input.task.description,
    activeForm: options.input.task.activeForm,
    metadata: options.input.task.metadata
  }, toolContext);
  const createdTask = taskData(created);
  const taskId = createdTask.id;
  const listed = await agentTask.run({ action: "list" }, toolContext);
  const fetched = await agentTask.run({ action: "get", taskId }, toolContext);
  const updated = await agentTask.run({
    action: "update",
    taskId,
    subject: options.input.task.update.subject,
    description: options.input.task.update.description,
    status: options.input.task.update.status,
    addBlocks: options.input.task.update.addBlocks,
    addBlockedBy: options.input.task.update.addBlockedBy,
    metadata: options.input.task.update.metadata
  }, toolContext);
  const stopped = await agentTask.run({ action: "stop", task_id: taskId }, toolContext);
  await store.update(taskId, {
    status: "completed",
    output: options.input.task.output
  });
  const output = await agentTask.run({ action: "output", task_id: taskId, block: false }, toolContext);

  const launchOutputFile = stringData(launch, "outputFile");
  const launchedMetadata = launchedTask.metadata ?? {};
  const updatedTask = taskData(updated);
  const stoppedTask = taskData(stopped);

  return {
    ledgerEntries: [
      {
        type: "tool.agent_launch_status",
        launch: {
          ok: launch.ok,
          contentIncludes: contentIncludes(launch.content, "Async agent launched successfully."),
          data: {
            status: stringData(launch, "status"),
            agentIdPrefix: agentId.startsWith("agent-task-") ? "agent-task-" : "",
            description: stringData(launch, "description"),
            prompt: stringData(launch, "prompt"),
            canReadOutputFile: dataRecord(launch).canReadOutputFile === true,
            outputFileIncludes: launchOutputFile.includes("agent_tasks.json#agent-task-")
              ? "agent_tasks.json#agent-task-"
              : ""
          },
          stored: {
            status: launchedTask.status,
            prompt: launchedTask.prompt,
            parentSessionId: launchedTask.parentSessionId,
            source: launchedTask.source,
            subagent: launchedTask.subagent,
            approvalMode: launchedTask.approvalMode,
            metadata: {
              agentTool: launchedMetadata.agentTool,
              model: launchedMetadata.model,
              runInBackground: launchedMetadata.runInBackground,
              mode: launchedMetadata.mode,
              isolation: launchedMetadata.isolation
            }
          }
        },
        status: {
          ok: agentStatus.ok,
          contentIncludes: [
            contentIncludes(agentStatus.content, "status: completed"),
            contentIncludes(agentStatus.content, "output: agent launch complete")
          ],
          data: {
            status: taskData(agentStatus).status,
            output: taskData(agentStatus).output
          }
        }
      },
      {
        type: "tool.agent_task_lifecycle",
        created: {
          ok: created.ok,
          contentIncludes: contentIncludes(created.content, `created successfully: ${options.input.task.subject}`),
          data: {
            idPrefix: createdTask.id.startsWith("agent-task-") ? "agent-task-" : "",
            status: createdTask.status,
            subject: createdTask.subject,
            description: createdTask.description,
            activeForm: createdTask.activeForm
          }
        },
        listed: {
          ok: listed.ok,
          contentIncludes: contentIncludes(listed.content, `[queued] ${options.input.task.subject}`)
        },
        fetched: {
          ok: fetched.ok,
          contentIncludes: [
            contentIncludes(fetched.content, "Task #"),
            contentIncludes(fetched.content, `Description: ${options.input.task.description}`)
          ]
        },
        updated: {
          ok: updated.ok,
          data: {
            status: updatedTask.status,
            subject: updatedTask.subject,
            description: updatedTask.description,
            blocks: updatedTask.blocks,
            blockedBy: updatedTask.blockedBy,
            metadata: updatedTask.metadata
          }
        },
        stopped: {
          ok: stopped.ok,
          data: {
            status: stoppedTask.status
          }
        },
        output: {
          ok: output.ok,
          content: projectOutputBlock(output.content)
        }
      }
    ],
    finalStatus: "tool_agent_task_lifecycle_oracle_ready",
    visibleResult: "agent launch and agent task lifecycle tools create durable tasks, expose status, update dependencies and metadata, stop running tasks, and render completed task output"
  };
}
