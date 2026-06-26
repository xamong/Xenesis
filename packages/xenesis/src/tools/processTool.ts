import { z } from "zod";
import { shellProcessRegistry } from "./shellProcessRegistry.js";
import type { Tool, ToolContext } from "./types.js";

// Lifecycle management for background shell sessions started by shell(background:true).
// write/submit/close are intentionally deferred — they require a live stdin/PTY which
// the no-node-pty backend does not provide.
const processInput = z.object({
  action: z.enum(["list", "poll", "log", "wait", "kill"]),
  session_id: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().max(600000).default(30000),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().positive().max(5000).default(200)
});

// OpenAI strict structured-outputs requires every property be required OR `.nullable()`
// (it rejects `.optional()`/`.default()` on their own). This mirror schema keeps the same
// keys but makes every non-`action` field required-but-nullable so zodResponsesFunction
// accepts it. The `run` handler still reads from the ergonomic `processInput` shape, so the
// runtime continues to apply the defaults below for any null the model sends.
const processOpenAIInput = z.object({
  action: z.enum(["list", "poll", "log", "wait", "kill"]),
  session_id: z.string().min(1).nullable(),
  timeoutMs: z.number().int().positive().max(600000).nullable(),
  offset: z.number().int().min(0).nullable(),
  limit: z.number().int().positive().max(5000).nullable()
});

type ProcessInput = z.infer<typeof processInput>;

const READ_ONLY_ACTIONS = new Set<ProcessInput["action"]>(["list", "poll", "log", "wait"]);

function ownedSession(sessionId: string, id: string) {
  // Scope check: poll/log/wait/kill must only ever touch a process owned by the
  // calling agent session. A foreign or unknown id is reported as not_found so an
  // agent cannot enumerate or kill another session's processes.
  const poll = shellProcessRegistry.poll(id);
  if (!poll || poll.sessionId !== sessionId) return undefined;
  return poll;
}

function notFound(id: string) {
  return { ok: false as const, content: `not_found: no background process ${id} in this session` };
}

export const processTool: Tool<ProcessInput> = {
  name: "process",
  description: [
    "Manage background shell processes started with shell(background:true), scoped to your own session.",
    "Actions: 'list' (your running/finished sessions), 'poll' (status + recent output), 'log' (paginated output via offset/limit), 'wait' (block until exit or timeoutMs), 'kill' (terminate).",
    "session_id is required for every action except 'list'. You cannot poll, wait on, or kill processes owned by another session.",
    "write/submit/close (interactive stdin) are not available because the optional PTY backend is not installed."
  ].join("\n"),
  inputSchema: processInput,
  openaiInputSchema: processOpenAIInput,
  isReadOnly: (input) => READ_ONLY_ACTIONS.has(input.action),
  async cleanupSession(sessionId) {
    await shellProcessRegistry.killAllForSession(sessionId);
  },
  async run(input, context: ToolContext) {
    if (input.action === "list") {
      const sessions = shellProcessRegistry.list(context.sessionId).map((s) => ({
        sessionId: s.id,
        command: s.command,
        cwd: s.cwd,
        pid: s.pid,
        startedAt: new Date(s.startedAt).toISOString(),
        uptimeMs: Date.now() - s.startedAt,
        status: s.exited ? "exited" : "running",
        exitCode: s.exited ? s.exitCode : undefined,
        reason: s.reason,
        outputPreview: s.outputBuffer.slice(-200)
      }));
      return {
        ok: true,
        content: `${sessions.length} background session(s) for this agent session.`,
        data: { processes: sessions }
      };
    }

    if (!input.session_id) {
      return { ok: false, content: `session_id is required for action '${input.action}'.` };
    }
    const id = input.session_id;

    // Ownership gate for every non-list action.
    if (!ownedSession(context.sessionId, id)) return notFound(id);

    if (input.action === "poll") {
      const poll = shellProcessRegistry.poll(id);
      if (!poll) return notFound(id);
      return {
        ok: true,
        content: `Process ${id} is ${poll.status}${poll.exited ? ` (exit ${poll.exitCode ?? "?"}, ${poll.reason ?? "exited"})` : ""}.`,
        data: poll
      };
    }

    if (input.action === "log") {
      const log = shellProcessRegistry.readLog(id, input.offset, input.limit);
      if (!log) return notFound(id);
      return { ok: true, content: log.output || "(no output)", data: log };
    }

    if (input.action === "wait") {
      const waited = await shellProcessRegistry.wait(id, input.timeoutMs);
      if (!waited) return notFound(id);
      return {
        ok: true,
        content:
          waited.status === "exited"
            ? `Process ${id} exited (exit ${waited.exitCode ?? "?"}, ${waited.reason ?? "exited"}).`
            : `Process ${id} still running after wait (timeout).`,
        data: waited
      };
    }

    // action === "kill"
    const killed = await shellProcessRegistry.kill(id);
    if (!killed) return notFound(id);
    return { ok: true, content: `Process ${id} kill requested.`, data: { sessionId: id, killed: true } };
  }
};
