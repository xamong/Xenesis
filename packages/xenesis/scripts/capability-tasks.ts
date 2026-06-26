#!/usr/bin/env node
import { homedir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { xenesisStatePath, type ApprovalMode, type ProviderName } from "../src/config/index.js";
import { runAgentPrompt } from "../src/core/AgentRunService.js";
import {
  promoteCapabilityImprovementTask,
  readCapabilityImprovementTaskBacklog,
  readCapabilityImprovementTaskResults,
  recoverFailedCapabilityImprovementTasks,
  runCapabilityImprovementAgentTask,
  writeCapabilityImprovementTaskBacklog,
  writeCapabilityImprovementTaskResults,
  type CapabilityImprovementTaskRecoveryMode,
  type CapabilityImprovementTaskBacklog,
  type CapabilityImprovementTaskCandidate
} from "../src/evaluation/index.js";
import { SqliteAgentTaskStore } from "../src/orchestration/index.js";

type CapabilityTasksCommand = "list" | "show" | "promote" | "run" | "results" | "recover-failed";

interface ParsedArgs {
  command?: CapabilityTasksCommand;
  id?: string;
  tasks?: string;
  agentTasks?: string;
  results?: string;
  cwd?: string;
  config?: string;
  provider?: ProviderName;
  model?: string;
  approval?: ApprovalMode;
  mode?: CapabilityImprovementTaskRecoveryMode;
  json: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { json: false };
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Option ${arg} requires a value.`);
      index += 1;
      return value;
    };

    if (arg === "--tasks") parsed.tasks = next();
    else if (arg === "--agent-tasks") parsed.agentTasks = next();
    else if (arg === "--results") parsed.results = next();
    else if (arg === "--cwd") parsed.cwd = next();
    else if (arg === "--config") parsed.config = next();
    else if (arg === "--provider") parsed.provider = next() as ProviderName;
    else if (arg === "--model") parsed.model = next();
    else if (arg === "--approval") {
      const value = next();
      if (value !== "safe" && value !== "auto" && value !== "readonly") {
        throw new Error("--approval must be safe, auto, or readonly.");
      }
      parsed.approval = value;
    }
    else if (arg === "--mode") {
      const value = next();
      if (value !== "retry" && value !== "follow-up") {
        throw new Error("--mode must be retry or follow-up.");
      }
      parsed.mode = value;
    }
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option ${arg}. Run "npm run capability:tasks -- --help".`);
    } else {
      positionals.push(arg);
    }
  }

  const command = positionals[0];
  if (
    command === "list" ||
    command === "show" ||
    command === "promote" ||
    command === "run" ||
    command === "results" ||
    command === "recover-failed" ||
    command === "retry-failed"
  ) {
    parsed.command = command === "retry-failed" ? "recover-failed" : command;
    if (command === "retry-failed") parsed.mode = "retry";
    parsed.id = positionals[1];
  } else if (command) {
    throw new Error(`Unknown command ${command}. Run "npm run capability:tasks -- --help".`);
  }

  return parsed;
}

function printHelp() {
  console.log([
    "Usage: npm run capability:tasks -- <command> [id] [options]",
    "",
    "Commands:",
    "  list                 List capability improvement task candidates.",
    "  show <id>            Show one task candidate as JSON.",
    "  promote <id>         Queue one task candidate as a durable agent task.",
    "  run <id>             Execute a queued durable agent task and record the result.",
    "  results [id]         Show recorded capability improvement task results.",
    "  recover-failed [id]  Requeue failed work from the latest result log.",
    "  retry-failed [id]    Alias for recover-failed --mode retry.",
    "",
    "Options:",
    "  --tasks <path>       Candidate path. Default: $XENESIS_HOME/reports/capability-improvement-tasks.json",
    "  --agent-tasks <path> Agent task queue path. Default: $XENESIS_HOME/agent_tasks.json",
    "  --results <path>     Result log path. Default: $XENESIS_HOME/reports/capability-task-results.json",
    "  --cwd <path>         Workspace cwd for run. Default: current directory.",
    "  --config <path>      Config path for run.",
    "  --provider <name>    Provider override for run.",
    "  --model <name>       Model override for run.",
    "  --approval <mode>    Approval override for run: safe, auto, or readonly.",
    "  --mode <mode>        Recovery mode for recover-failed: retry or follow-up. Default: retry.",
    "  --json               Print JSON output."
  ].join("\n"));
}

function resolveXenesisHome() {
  return process.env.XENESIS_HOME?.trim()
    ? resolve(process.env.XENESIS_HOME)
    : resolve(homedir(), ".xenesis");
}

function defaultTasksPath() {
  return resolve(resolveXenesisHome(), "reports", "capability-improvement-tasks.json");
}

function defaultAgentTasksPath() {
  return xenesisStatePath(resolveXenesisHome(), "agent_tasks.json");
}

function createAgentTaskStore(agentTasksPath: string) {
  const xenesisHome = basename(agentTasksPath) === "agent_tasks.json"
    ? dirname(agentTasksPath)
    : agentTasksPath;
  return new SqliteAgentTaskStore({ xenesisHome });
}

function defaultResultsPath() {
  return resolve(resolveXenesisHome(), "reports", "capability-task-results.json");
}

async function requireBacklog(path: string): Promise<CapabilityImprovementTaskBacklog> {
  const backlog = await readCapabilityImprovementTaskBacklog(path);
  if (!backlog) throw new Error(`Capability improvement task backlog not found: ${path}`);
  return backlog;
}

function requireId(parsed: ParsedArgs) {
  if (!parsed.id) throw new Error(`Command "${parsed.command}" requires a task candidate id.`);
  return parsed.id;
}

function renderTaskLine(task: CapabilityImprovementTaskCandidate) {
  return [
    task.id,
    task.status,
    `priority=${task.priority}`,
    `area=${task.area}`,
    task.promotedAgentTaskId ? `agentTask=${task.promotedAgentTaskId}` : undefined,
    `scenarios=${task.sourceScenarioIds.join(",") || "none"}`
  ].filter((part): part is string => part !== undefined).join(" ");
}

function findTask(backlog: CapabilityImprovementTaskBacklog, id: string) {
  return backlog.tasks.find((task) => task.id === id);
}

function findTaskForAgentTask(backlog: CapabilityImprovementTaskBacklog, id: string) {
  return backlog.tasks.find((task) => task.promotedAgentTaskId === id || task.id === id);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const command = parsed.command ?? "list";
  const tasksPath = resolve(parsed.tasks ?? defaultTasksPath());
  const agentTasksPath = resolve(parsed.agentTasks ?? defaultAgentTasksPath());
  const resultsPath = resolve(parsed.results ?? defaultResultsPath());
  const backlog = command === "results"
    ? await readCapabilityImprovementTaskBacklog(tasksPath)
    : await requireBacklog(tasksPath);

  if (command === "list") {
    if (!backlog) throw new Error(`Capability improvement task backlog not found: ${tasksPath}`);
    if (parsed.json) console.log(JSON.stringify(backlog.tasks, null, 2));
    else if (backlog.tasks.length === 0) console.log("capability-tasks: no candidates");
    else for (const task of backlog.tasks) console.log(renderTaskLine(task));
    return;
  }

  if (command === "show") {
    const id = requireId(parsed);
    if (!backlog) throw new Error(`Capability improvement task backlog not found: ${tasksPath}`);
    const task = findTask(backlog, id);
    if (!task) throw new Error(`Capability improvement task candidate not found: ${id}`);
    console.log(JSON.stringify(task, null, 2));
    return;
  }

  if (command === "results") {
    const results = await readCapabilityImprovementTaskResults(resultsPath);
    const payload = parsed.id && results
      ? { ...results, results: results.results.filter((result) => result.taskId === parsed.id) }
      : results;
    if (parsed.json) console.log(JSON.stringify(payload ?? { kind: "capability-improvement-task-results", updatedAt: "", results: [] }, null, 2));
    else if (!payload || payload.results.length === 0) console.log("capability-tasks: no results");
    else for (const result of payload.results) {
      console.log(`${result.taskId} ${result.status} session=${result.sessionId} at=${result.resultAt}`);
      if (result.error) console.log(`  error: ${result.error}`);
    }
    return;
  }

  if (command === "recover-failed") {
    if (!backlog) throw new Error(`Capability improvement task backlog not found: ${tasksPath}`);
    const existingResults = await readCapabilityImprovementTaskResults(resultsPath);
    const recovered = await recoverFailedCapabilityImprovementTasks({
      backlog,
      results: existingResults,
      store: createAgentTaskStore(agentTasksPath),
      ids: parsed.id ? [parsed.id] : undefined,
      mode: parsed.mode ?? "retry"
    });
    await writeCapabilityImprovementTaskBacklog(tasksPath, recovered.backlog);
    if (parsed.json) {
      console.log(JSON.stringify({
        tasks: tasksPath,
        agentTasks: agentTasksPath,
        results: resultsPath,
        ...recovered
      }, null, 2));
    } else {
      if (recovered.recovered.length === 0) console.log("capability-tasks: no failed tasks recovered");
      for (const item of recovered.recovered) {
        console.log(`capability-tasks: recovered ${item.taskId} via ${item.mode} -> ${item.agentTaskId} ${item.status}`);
      }
      for (const item of recovered.skipped) {
        console.log(`capability-tasks: skipped ${item.taskId}: ${item.reason}`);
      }
      console.log(`capability-tasks: tasks ${tasksPath}`);
      console.log(`capability-tasks: queue ${agentTasksPath}`);
    }
    return;
  }

  const id = requireId(parsed);
  if (!backlog) throw new Error(`Capability improvement task backlog not found: ${tasksPath}`);

  if (command === "run") {
    const store = createAgentTaskStore(agentTasksPath);
    const existingResults = await readCapabilityImprovementTaskResults(resultsPath);
    const taskCandidate = findTaskForAgentTask(backlog, id);
    const run = await runCapabilityImprovementAgentTask({
      store,
      id,
      taskCandidate,
      results: existingResults,
      executor: async (task) => {
        const result = await runAgentPrompt({
          cwd: resolve(parsed.cwd ?? process.cwd()),
          configPath: parsed.config,
          env: process.env,
          prompt: task.prompt,
          mode: "work",
          sessionId: task.sessionId,
          cli: {
            ...(parsed.provider ? { provider: parsed.provider } : {}),
            ...(parsed.model ? { model: parsed.model } : {}),
            ...(parsed.approval ? { approvalMode: parsed.approval } : {})
          }
        });
        return {
          output: result.doneContent ?? "",
          sessionId: result.sessionId,
          usage: result.usage
        };
      }
    });
    await writeCapabilityImprovementTaskResults(resultsPath, run.results);
    if (parsed.json) {
      console.log(JSON.stringify({
        results: resultsPath,
        agentTasks: agentTasksPath,
        id,
        status: run.agentTask.status,
        sessionId: run.agentTask.sessionId
      }, null, 2));
    } else {
      console.log(`capability-tasks: ran ${id}`);
      console.log(`capability-tasks: status ${run.agentTask.status}`);
      console.log(`capability-tasks: results ${resultsPath}`);
    }
    if (run.agentTask.status !== "completed") process.exitCode = 1;
    return;
  }

  const result = await promoteCapabilityImprovementTask({
    backlog,
    id,
    store: createAgentTaskStore(agentTasksPath)
  });
  await writeCapabilityImprovementTaskBacklog(tasksPath, result.backlog);

  if (parsed.json) {
    console.log(JSON.stringify({
      tasks: tasksPath,
      agentTasks: agentTasksPath,
      id,
      agentTaskId: result.agentTask.id,
      status: result.agentTask.status
    }, null, 2));
  } else {
    console.log(`capability-tasks: promoted ${id}`);
    console.log(`capability-tasks: agent task ${result.agentTask.id} ${result.agentTask.status}`);
    console.log(`capability-tasks: queue ${agentTasksPath}`);
  }
}

main().catch((error) => {
  console.error(`capability-tasks: error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
