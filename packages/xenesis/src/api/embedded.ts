import type { CliConfigOverrides } from "../config/index.js";
import {
  runAgentPipeline,
  type AgentRunPipelineOptions,
  type AgentRunPipelineResult
} from "../core/AgentRunPipeline.js";
import type { AgentRunEvent } from "../core/events.js";
import type { AgentMessage, AgentMessageAttachment } from "../core/messages.js";
import type { RuntimeSurfaceDescriptor } from "../core/runtime/index.js";
import type { IdeContextInput } from "../ide/index.js";
import { resolveWorkflow, runResolvedWorkflow, type WorkflowSelection } from "../workflows/index.js";

export type EmbeddedRunPipeline = (options: AgentRunPipelineOptions) => Promise<AgentRunPipelineResult>;

export interface EmbeddedPromptOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  prompt: string;
  attachments?: AgentMessageAttachment[];
  workflow?: string;
  mode?: "chat" | "plan" | "work";
  configPath?: string;
  cli?: CliConfigOverrides;
  traceId?: string;
  source?: string;
  workspace?: string;
  context?: Record<string, unknown>;
  ideContext?: IdeContextInput;
  profile?: string;
  profilePolicy?: object;
  sessionId?: string;
  historyMessages?: AgentMessage[];
  abortSignal?: AbortSignal;
  stream?: boolean;
  runPipeline?: EmbeddedRunPipeline;
  onEvent?: (event: AgentRunEvent) => void | Promise<void>;
  onSession?: (sessionId: string) => void | Promise<void>;
  onMessages?: (messages: AgentMessage[]) => void | Promise<void>;
}

export interface EmbeddedPromptResult {
  ok: boolean;
  exitCode: number;
  surface: RuntimeSurfaceDescriptor;
  traceId?: string;
  sessionId?: string;
  output: string;
  errors: string;
  error?: string;
  doneContent?: string;
  events: AgentRunEvent[];
  profile?: string;
  profilePolicy?: object;
}

const embeddedSurface: RuntimeSurfaceDescriptor = {
  name: "embedded",
  outputMode: "stream-json",
  interactive: true
};

function embeddedIdeContext(options: EmbeddedPromptOptions): IdeContextInput | undefined {
  if (options.ideContext) return options.ideContext;
  if (!options.source && !options.workspace && !options.context) return undefined;
  return {
    source: options.source ?? "xenesis-embedded",
    workspace: options.workspace ?? options.cwd,
    context: options.context ?? {}
  };
}

function withModeOverride(
  workflow: WorkflowSelection,
  mode: EmbeddedPromptOptions["mode"]
): WorkflowSelection {
  if (!mode || mode === "chat") return workflow;
  return {
    ...workflow,
    pipeline: {
      ...workflow.pipeline,
      mode
    }
  };
}

export async function runEmbeddedPrompt(options: EmbeddedPromptOptions): Promise<EmbeddedPromptResult> {
  const runPipeline = options.runPipeline ?? runAgentPipeline;
  const traceId = options.traceId ?? `embedded-trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const stream = options.stream ?? true;

  try {
    const workflow = withModeOverride(await resolveWorkflow({
      body: {
        prompt: options.prompt,
        workflow: options.workflow ?? "xenis",
        configPath: options.configPath,
        ideContext: embeddedIdeContext(options)
      },
      stream,
      env: options.env
    }), options.mode);
    const result = await runResolvedWorkflow({
      workflow,
      cwd: options.cwd,
      configPath: options.configPath,
      env: options.env,
      cli: options.cli,
      traceId,
      sessionId: options.sessionId,
      historyMessages: options.historyMessages,
      attachments: options.attachments,
      abortSignal: options.abortSignal,
      stream,
      runPipeline,
      onEvent: options.onEvent,
      onSession: options.onSession,
      onMessages: options.onMessages
    });

    return {
      ok: result.exitCode === 0,
      exitCode: result.exitCode,
      surface: embeddedSurface,
      traceId,
      sessionId: result.sessionId,
      output: result.output,
      errors: "",
      ...(result.doneContent !== undefined ? { doneContent: result.doneContent } : {}),
      events: result.events,
      ...(options.profile ? { profile: options.profile } : {}),
      ...(options.profilePolicy ? { profilePolicy: options.profilePolicy } : {})
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      exitCode: 1,
      surface: embeddedSurface,
      traceId,
      output: "",
      errors: `error: ${message}`,
      error: message,
      events: [],
      ...(options.profile ? { profile: options.profile } : {}),
      ...(options.profilePolicy ? { profilePolicy: options.profilePolicy } : {})
    };
  }
}
