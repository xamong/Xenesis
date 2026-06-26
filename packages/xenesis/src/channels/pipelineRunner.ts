import type { ApprovalMode, CliConfigOverrides } from "../config/index.js";
import {
  runAgentPipeline,
  type AgentRunPipelineOptions,
  type AgentRunPipelineResult
} from "../core/AgentRunPipeline.js";
import type { AgentMessage } from "../core/messages.js";
import { eventsToMessages, readSessionLog } from "../sessions/index.js";
import type { ChannelRunPrompt } from "./manager.js";

export interface ChannelGuardrails {
  approvalMode: ApprovalMode;
  maxTurns: number;
  maxTokens: number;
}

export interface ChannelPipelineRunnerOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  configPath?: string;
  cli?: CliConfigOverrides;
  channel: ChannelGuardrails;
  xenesisHome?: string;
  loadHistory?: (sessionId: string) => Promise<AgentMessage[]>;
  runPipeline?: (options: AgentRunPipelineOptions) => Promise<AgentRunPipelineResult>;
}

function isNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export function createChannelPipelineRunner(options: ChannelPipelineRunnerOptions): ChannelRunPrompt {
  const run = options.runPipeline ?? runAgentPipeline;
  const loadHistory = options.loadHistory ?? (async (sessionId: string) => {
    if (!options.xenesisHome) return [];
    return eventsToMessages(await readSessionLog(options.xenesisHome, sessionId));
  });

  return async (request) => {
    let historyMessages: AgentMessage[] = [];
    try {
      historyMessages = await loadHistory(request.sessionId);
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }

    const result = await run({
      cwd: options.cwd,
      ...(options.env ? { env: options.env } : {}),
      ...(options.configPath ? { configPath: options.configPath } : {}),
      cli: {
        ...options.cli,
        approvalMode: options.channel.approvalMode,
        maxTurns: options.channel.maxTurns
      },
      prompt: request.prompt,
      sessionId: request.sessionId,
      historyMessages,
      // S6 — INTENTIONAL auto-deny, NOT the background-pause path that
      // taskExecutor.ts uses. Channel runs (Slack/Discord via gateway/server.ts)
      // are cross-process: the requester is a chat user, not an in-process human,
      // and ChannelRunPrompt can only return `{ content: string }` — it has no way
      // to surface or resume a `status: "paused"` run. Until cross-process channel
      // approval resolution lands (spec S6 section 8, deferred to a future slice),
      // an `ask` here MUST resolve deterministically rather than durably pause a
      // run no one can resume. The global "background no-handler PAUSES" constraint
      // therefore holds for the taskExecutor path; this call site is the documented
      // exception until channel resolution is implemented. Hard policy denies
      // (readonly/blocked tools) are unaffected — they never reach this handler.
      approvalHandler: () => false,
      maxTokensBudget: options.channel.maxTokens,
      stream: false
    });
    if (result.exitCode !== 0) {
      throw new Error(`channel run exited with code ${result.exitCode}`);
    }
    return { content: result.doneContent ?? "" };
  };
}
