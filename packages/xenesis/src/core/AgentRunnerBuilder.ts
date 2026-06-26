import type { ToolGuardConfig, XenesisConfig } from "../config/index.js";
import type { IdeContextInput } from "../ide/index.js";
import { JsonlSessionWriter } from "../sessions/index.js";
import { SqliteAgentMessageStore } from "../orchestration/index.js";
import { AgentRunner, type ApprovalHandler, type ToolExecutionPolicy } from "./AgentRunner.js";
import type { ExecutionBackend } from "./isolation/executionBackend.js";
import type { ApprovalDecision } from "./events.js";
import type { ResumableRunState } from "./resume/ResumableRunState.js";
import { mergeAdaptiveToolExecutionPolicy } from "./adaptiveExecutionPolicy.js";
import {
  createConfiguredCapabilityGuardToolExecutionPolicy,
  hasCustomToolGuardConfig,
  mergeToolGuardConfigs,
  mergeToolExecutionPolicies
} from "./agentCapabilityPolicy.js";
import {
  createProvider,
  createRunSystemContext,
  createRuntimeTools,
  resolveFallbackChainWithDiagnostics,
  selectTools,
  type AgentRunMode,
  type RuntimeNoticeHandler
} from "./AgentRuntimeFactory.js";
import type { AgentMessage } from "./messages.js";
import type { ToolRegistry } from "../tools/index.js";
import { modelContextWindow } from "./context/modelMetadata.js";
import { createLlmSummarizer, SUMMARIZER_MIN_CONTEXT } from "./context/compaction/llmSummarizer.js";
import { buildProviderQueryConfig } from "../providers/queryConfig.js";
import { HookRegistry } from "../hooks/HookRegistry.js";
import { createCommandHookHandler } from "../hooks/CommandHookHandler.js";
import type { BlockingHookRegistration } from "../hooks/blocking.js";

export interface BuildAgentRunnerOptions {
  config: XenesisConfig;
  env: NodeJS.ProcessEnv;
  prompt: string;
  sessionId: string;
  taskId?: string;
  traceId?: string;
  mode?: AgentRunMode;
  fromPlan?: boolean;
  systemMessages?: Extract<AgentMessage, { role: "system" }>[];
  workflowContext?: {
    name: string;
    description?: string;
  };
  historyMessages?: AgentMessage[];
  /**
   * S7 — event-sourced resume. When supplied (by `resumeAgentPipeline`), the
   * constructed runner restores its per-run state from this snapshot and does
   * not re-append the triggering user message.
   */
  resumeState?: ResumableRunState;
  /**
   * S7 — event-sourced resume flag. Set whenever the triggering user message is
   * already in `historyMessages` (rehydrated from the log), so the runner does
   * not re-append / re-record it. Required for the message-only degrade path
   * (no `run_snapshot`, so `resumeState` is undefined) which would otherwise
   * duplicate the last user message.
   */
  resuming?: boolean;
  /**
   * S7 — event-sourced resume. The starting envelope `seq` for the session
   * writer. On resume this is set to the number of existing records so the
   * monotonic `seq` continues across the resume boundary (appending to the same
   * JSONL log). Defaults to 0 for a fresh run.
   */
  initialSeq?: number;
  ideContext?: IdeContextInput;
  abortSignal?: AbortSignal;
  maxTokensBudget?: number;
  approvalHandler?: ApprovalHandler;
  approvalHandlerFactory?: (config: XenesisConfig) => ApprovalHandler | undefined;
  /**
   * S6 — durable HITL resume. A human approval decision injected by
   * `resumeAgentPipeline` for the exact stored tool call; applied once at the
   * approval gate for exactly-once resume (Task 6 wires the caller).
   */
  injectedApprovalDecision?: ApprovalDecision;
  stream?: boolean;
  guard?: ToolGuardConfig;
  toolExecutionPolicy?: ToolExecutionPolicy;
  allowedTools?: string[];
  onNotice?: RuntimeNoticeHandler;
  /** Programmatic in-process blocking hook registrations merged with config-driven command hooks. */
  blockingHooks?: BlockingHookRegistration[];
  /**
   * I3 — execution backend seam. When absent, AgentRunner defaults to
   * LOCAL_BACKEND (byte-for-byte today). Inject for Docker / remote exec.
   */
  executionBackend?: ExecutionBackend;
}

interface SimpleLogger {
  warn(message: string): void;
}

/**
 * Construct a HookRegistry from a XenesisConfig + optional programmatic registrations.
 *
 * Config-driven command hooks (config.hooks.preToolUse / config.hooks.stop) are only
 * registered when config.hooks.enabled === true. Programmatic registrations are always
 * added regardless of the enabled flag (they are under the caller's direct control).
 *
 * This function is exported so tests can assert registry state without running a full
 * agent pipeline (Task 7 integration gate requirement: no dead wiring).
 */
export function buildHookRegistry(
  config: XenesisConfig,
  programmatic: BlockingHookRegistration[] = [],
  logger?: SimpleLogger
): HookRegistry {
  const registry = new HookRegistry(logger);
  const hooks = config.hooks;
  if (hooks?.enabled) {
    for (const spec of hooks.preToolUse ?? []) {
      registry.register({
        event: "pre_tool_use",
        toolNamePattern: spec.toolPattern,
        // createCommandHookHandler returns a typed handler; the cast is localized
        // here because the registry's register() accepts per-event registrations
        // and TypeScript cannot narrow the event-string discriminant through the
        // generic overloads in a loop. The runtime dispatch is correct by construction.
        handler: createCommandHookHandler(spec, "pre_tool_use", { commandTimeoutMs: hooks.commandTimeoutMs }, logger) as BlockingHookRegistration["handler"]
      } as Extract<BlockingHookRegistration, { event: "pre_tool_use" }>);
    }
    for (const spec of hooks.stop ?? []) {
      registry.register({
        event: "stop",
        handler: createCommandHookHandler(spec, "stop", { commandTimeoutMs: hooks.commandTimeoutMs }, logger) as BlockingHookRegistration["handler"]
      } as Extract<BlockingHookRegistration, { event: "stop" }>);
    }
  }
  for (const reg of programmatic) {
    registry.register(reg);
  }
  return registry;
}

export interface BuiltAgentRunner {
  runner: AgentRunner;
  sessionWriter: JsonlSessionWriter;
  sessionId: string;
  backgroundTaskContextIds: string[];
  agentMessageContextIds: string[];
}

export interface EffectiveAgentMaxTurnsInput {
  maxTurns: number;
  prompt: string;
  mode?: AgentRunMode;
}

function promptRequiresExtendedWorkLoop(prompt: string) {
  const asksForWork = /구현|수정|추가|갱신|실행|시작|띄워|구동|올려|완료|끝까지|implement|fix|update|add|build|create|run|start|launch/i.test(prompt);
  const asksForServer = /\bserver\b/i.test(prompt) || /서버/i.test(prompt);
  const asksForVisualVerification =
    /\b(?:browser|app_e2e_check)\b/i.test(prompt) ||
    /브라우저|화면\s*(?:확인|검증)|렌더링\s*(?:확인|검증)/i.test(prompt);
  const asksForVerification = /검증|확인|test|verify|check/i.test(prompt);
  return asksForWork && asksForServer && asksForVerification && asksForVisualVerification;
}

export function effectiveAgentMaxTurns(input: EffectiveAgentMaxTurnsInput) {
  if (input.mode !== "work") return input.maxTurns;
  if (!promptRequiresExtendedWorkLoop(input.prompt)) return input.maxTurns;
  return Math.max(input.maxTurns, 32);
}

async function releaseBuilderAgentMessageClaims(options: BuildAgentRunnerOptions, messageIds: readonly string[]) {
  if (!options.taskId || messageIds.length === 0) return;
  await new SqliteAgentMessageStore({ xenesisHome: options.config.xenesisHome })
    .releaseClaims([...messageIds], options.sessionId);
}

const mockNoopToolExecutionPolicy: ToolExecutionPolicy = {
  name: "xenesis:mock-noop",
  snapshotOnly: true
};

function filterAllowedTools(tools: ToolRegistry, allowedTools: string[] | undefined): ToolRegistry {
  if (!allowedTools) return tools;
  const allowlist = new Set(allowedTools.map((tool) => tool.trim()).filter(Boolean));
  if (allowlist.size === 0) return new Map();
  return new Map(Array.from(tools).filter(([name]) => allowlist.has(name)));
}

/**
 * Build the LLM aux-model summarizer for compaction, or return undefined to fall back to the
 * deterministic summary. Feasibility: the aux model window must clear SUMMARIZER_MIN_CONTEXT (64K).
 * The glue performs a one-shot non-streaming completion against the aux provider and returns its text.
 */
function buildLlmSummarize(
  options: BuildAgentRunnerOptions
): ((older: AgentMessage[], previousSummary?: string) => Promise<string>) | undefined {
  const context = options.config.context;
  if (!context.llmSummary) return undefined;

  const summarizationModel = context.summarizationModel;
  const auxOk = modelContextWindow(summarizationModel).contextWindow >= SUMMARIZER_MIN_CONTEXT;
  if (!auxOk) {
    const line = `compaction: llmSummary requested but aux model "${summarizationModel}" window < ${SUMMARIZER_MIN_CONTEXT}; falling back to deterministic summary`;
    if (options.onNotice) {
      void options.onNotice(line);
    } else {
      process.emitWarning(line);
    }
    return undefined;
  }

  const summarizationProvider = (context.summarizationProvider ?? options.config.provider) as XenesisConfig["provider"];
  const auxConfig: XenesisConfig = {
    ...options.config,
    provider: summarizationProvider,
    model: summarizationModel
  };
  const auxProvider = createProvider(auxConfig, options.env);

  const complete = async (messages: AgentMessage[], maxTokens: number): Promise<string> => {
    const response = await auxProvider.complete({
      model: summarizationModel,
      messages,
      tools: [],
      signal: options.abortSignal,
      queryConfig: buildProviderQueryConfig({
        sessionId: options.sessionId,
        model: summarizationModel,
        providers: [{ name: summarizationProvider, model: summarizationModel }],
        maxTokensBudget: maxTokens,
        stream: false,
        env: options.env
      })
    });
    return response.message.content ?? "";
  };

  return createLlmSummarizer({ complete, maxTokens: 4096 });
}

export async function buildAgentRunner(options: BuildAgentRunnerOptions): Promise<BuiltAgentRunner> {
  const approvalHandler = options.approvalHandler ?? options.approvalHandlerFactory?.(options.config);
  const allTools = await createRuntimeTools(options.config, options.env, { approvalHandler });
  const systemContext = await createRunSystemContext(options.config, {
    mode: options.mode,
    fromPlan: options.fromPlan,
    prompt: options.prompt,
    model: options.config.model,
    cwd: options.config.workspace,
    sessionId: options.sessionId,
    taskId: options.taskId,
    claimAgentMessages: Boolean(options.taskId),
    ideContext: options.ideContext,
    systemMessages: options.systemMessages,
    workflowContext: options.workflowContext
  });
  try {
    const guardConfig = mergeToolGuardConfigs(options.config.guard, options.guard);
    const capabilityGuardPolicy = options.config.provider === "mock" && !hasCustomToolGuardConfig(guardConfig)
      ? mockNoopToolExecutionPolicy
      : createConfiguredCapabilityGuardToolExecutionPolicy(guardConfig);
    const toolExecutionPolicy = mergeAdaptiveToolExecutionPolicy(
      mergeToolExecutionPolicies(capabilityGuardPolicy, options.toolExecutionPolicy),
      systemContext.adaptivePolicy
    );
    const sessionWriter = new JsonlSessionWriter({
      workspaceRoot: options.config.workspace,
      xenesisHome: options.config.xenesisHome,
      sessionId: options.sessionId,
      traceId: options.traceId,
      ...(options.initialSeq !== undefined ? { initialSeq: options.initialSeq } : {})
    });
    for (const source of systemContext.sources) {
      await sessionWriter.write({
        type: "context_source",
        ...source
      });
    }

    const tools = filterAllowedTools(selectTools(options.config, allTools), options.allowedTools);

    const llmSummarize = buildLlmSummarize(options);

    const fallbackResolution = resolveFallbackChainWithDiagnostics(options.config, options.env);
    for (const skipped of fallbackResolution.skipped) {
      const line = `provider-fallback: skipped ${skipped.label} (${skipped.reason})`;
      if (options.onNotice) {
        await options.onNotice(line);
      } else {
        process.emitWarning(line);
      }
    }

    const hookRegistry = buildHookRegistry(options.config, options.blockingHooks ?? []);

    return {
      sessionId: options.sessionId,
      sessionWriter,
      backgroundTaskContextIds: systemContext.backgroundTaskIds ?? [],
      agentMessageContextIds: systemContext.agentMessageIds ?? [],
      runner: new AgentRunner({
        provider: createProvider(options.config, options.env),
        fallbackProviders: fallbackResolution.chain.map((fallback) => fallback.provider),
        supportsTools: true,
        fallbackSupportsTools: fallbackResolution.chain.map((fallback) => fallback.supportsTools),
        model: options.config.model,
        env: options.env,
        skillPaths: options.config.extensions.skills.paths,
        workspaceRoot: options.config.workspace,
        xenesisHome: options.config.xenesisHome,
        cwd: options.config.workspace,
        sessionId: options.sessionId,
        approvalMode: options.config.approvalMode,
        maxTurns: effectiveAgentMaxTurns({
          maxTurns: options.config.maxTurns,
          prompt: options.prompt,
          mode: options.mode
        }),
        maxTokensBudget: options.maxTokensBudget,
        tools,
        sessionWriter,
        approvalHandler,
        // S6 — durable HITL gate wiring.
        approvalTimeoutMs: options.config.approval.timeoutMs,
        approvalTimeoutBehavior: options.config.approval.timeoutBehavior,
        ...(options.injectedApprovalDecision !== undefined
          ? { injectedApprovalDecision: options.injectedApprovalDecision }
          : {}),
        ...(options.resumeState?.alwaysAllowedTools !== undefined
          ? { alwaysAllowedTools: options.resumeState.alwaysAllowedTools }
          : {}),
        systemMessages: systemContext.messages,
        historyMessages: options.historyMessages ?? [],
        resumeState: options.resumeState,
        ...(options.resuming !== undefined ? { resuming: options.resuming } : {}),
        permissions: options.config.permissions,
        toolExecutionPolicy,
        stream: options.stream ?? false,
        abortSignal: options.abortSignal,
        providerMaxRetries: options.config.providerRetries,
        autoCompact: options.config.context.autoCompact,
        compactHistoryAfterMessages: options.config.context.compactAfterMessages,
        compactHistoryKeepMessages: options.config.context.compactKeepMessages,
        maxToolResultChars: options.config.context.maxToolResultChars,
        pruneOlderEnabled: options.config.context.pruneToolResults,
        pruneToolResultThreshold: options.config.context.pruneToolResultThreshold,
        stripOldImagesEnabled: options.config.context.stripOldImages,
        compactTokenThresholdRatio: options.config.context.compactTokenThresholdRatio,
        llmSummarize,
        recordLifecycle: true,
        hookRegistry,
        maxStopHookContinuations: options.config.hooks?.maxStopHookContinuations ?? 3,
        ...(options.executionBackend !== undefined ? { executionBackend: options.executionBackend } : {})
      })
    };
  } catch (error) {
    await releaseBuilderAgentMessageClaims(options, systemContext.agentMessageIds ?? []);
    throw error;
  }
}
