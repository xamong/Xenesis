import {
  loadConfig,
  type CliConfigOverrides,
  type ToolGuardConfig,
  type XenesisConfig
} from "../config/index.js";
import type { IdeContextInput } from "../ide/index.js";
import { JsonlSessionWriter } from "../sessions/index.js";
import {
  eventsToMessages,
  hasApprovalResolved,
  lastUserMessage,
  latestRunSnapshot,
  readSessionLog
} from "../sessions/history.js";
import { executeAgentRun } from "./AgentRunExecutor.js";
import { finalizeAgentRun, type AgentRunNoticeHandler } from "./AgentRunReporter.js";
import { type AgentRunUsage, type ApprovalHandler, type ToolExecutionPolicy } from "./AgentRunner.js";
import { buildAgentRunner } from "./AgentRunnerBuilder.js";
import { saveLatestPlan, type AgentRunMode } from "./AgentRuntimeFactory.js";
import { mergeToolExecutionPolicies } from "./agentCapabilityPolicy.js";
import type { AgentRunEvent, ApprovalDecision, ApprovalRequest, RunStageEvent, WorkflowRunSummary, WorkflowStepSummary } from "./events.js";
import { classifyPromptIntent } from "./intentRouter.js";
import { repairToolResultPairing, type AgentMessage, type AgentMessageAttachment } from "./messages.js";
import type { ResumableRunState } from "./resume/ResumableRunState.js";
import {
  buildOperationalRepairPreflightDecision,
  collectOperationalFailureContext
} from "./operationalFailureContext.js";
import { runVerifyFixLoop } from "./verifyFix.js";
import { runVerificationCommands } from "../verification/index.js";
import {
  SqliteAgentMessageStore,
  SqliteAgentTaskStore,
  markAgentTasksContextInjected
} from "../orchestration/index.js";
import type { RunReport, RunReportSelfReview } from "../runReports/index.js";
import {
  configuredWorkflowHandlers,
  resolveWorkflow,
  type WorkflowSelection
} from "../workflows/index.js";

export interface AgentRunPipelineWorkflowStep {
  workflow: WorkflowRunSummary;
  step: WorkflowStepSummary;
  index: number;
  total: number;
  startedAt?: string;
}

export interface AgentRunPipelineOptions {
  cwd: string;
  workspaceRoot?: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  cli?: CliConfigOverrides;
  prompt: string;
  attachments?: AgentMessageAttachment[];
  mode?: AgentRunMode;
  savePlan?: boolean;
  fromPlan?: boolean;
  systemMessages?: Extract<AgentMessage, { role: "system" }>[];
  historyMessages?: AgentMessage[];
  /**
   * S7 — event-sourced resume. A restored per-run snapshot; when present the
   * runner restores its counters and does not re-append the triggering user
   * message. Supplied by `resumeAgentPipeline`.
   */
  resumeState?: ResumableRunState;
  /**
   * S7 — event-sourced resume flag. Set by `resumeAgentPipeline` whenever the
   * triggering user message is already present in `historyMessages` (rehydrated
   * from the log). When `true` the runner does not re-append / re-record it, even
   * on the message-only degrade path where no `run_snapshot` (and thus no
   * `resumeState`) was recovered. Without this, a pre-S7 log would duplicate the
   * last user message on resume.
   */
  resuming?: boolean;
  /**
   * S7 — event-sourced resume. The starting envelope `seq` for the session
   * writer (set to the number of existing records on resume so `seq` stays
   * monotonic across the resume boundary). Defaults to 0.
   */
  initialSeq?: number;
  sessionId?: string;
  taskId?: string;
  traceId?: string;
  ideContext?: IdeContextInput;
  abortSignal?: AbortSignal;
  maxTokensBudget?: number;
  approvalHandler?: ApprovalHandler;
  approvalHandlerFactory?: (config: XenesisConfig) => ApprovalHandler | undefined;
  /**
   * S6 — durable HITL resume. A human approval decision for the exact stored
   * tool call, applied once at the runner's approval gate (or directly at run()
   * init on resume) for exactly-once execution. Set by {@link resumeAgentPipeline}.
   */
  injectedApprovalDecision?: ApprovalDecision;
  stream?: boolean;
  onEvent?: (event: AgentRunEvent) => void | Promise<void>;
  onMessages?: (messages: AgentMessage[]) => void | Promise<void>;
  onSessionWriter?: (writer: JsonlSessionWriter, sessionId: string) => void;
  onNotice?: AgentRunNoticeHandler;
  workflowStep?: AgentRunPipelineWorkflowStep;
  guard?: ToolGuardConfig;
  toolExecutionPolicy?: ToolExecutionPolicy;
  allowedTools?: string[];
  applyConfiguredWorkflow?: boolean;
}

export interface AgentRunPipelineResult {
  exitCode: number;
  sessionId: string;
  traceId?: string;
  events: AgentRunEvent[];
  doneContent?: string;
  turns: number;
  usage?: AgentRunUsage;
  runReport?: RunReport;
  selfReview?: RunReportSelfReview;
  /**
   * S6 — durable HITL. `"paused"` when the run halted at the approval gate with
   * no resolver (background/headless): the run is resumable via
   * {@link resumeAgentPipeline} + an injected decision. `"done"` otherwise.
   * `pendingApproval` carries the durable request so the task store can record
   * what is awaiting a human decision.
   */
  status?: "done" | "paused";
  pendingApproval?: ApprovalRequest;
}

/**
 * S7 — options for {@link resumeAgentPipeline}. Parallel to
 * {@link AgentRunPipelineOptions} but the `prompt`, `historyMessages`,
 * `resumeState`, and `initialSeq` are recovered from the existing JSONL session
 * log rather than supplied by the caller. `sessionId` is REQUIRED (the run
 * appends to the same log).
 */
export type ResumeAgentPipelineOptions =
  & Omit<AgentRunPipelineOptions, "prompt" | "historyMessages" | "resumeState" | "resuming" | "initialSeq" | "sessionId" | "cwd" | "injectedApprovalDecision">
  & {
    sessionId: string;
    cwd?: string;
    xenesisHome?: string;
    /**
     * S6 — durable HITL resume. The human decision for the run's pending approval
     * (recovered from the latest `run_snapshot.pendingApproval`). Applied exactly
     * once: if the log already has an `approval_resolved` for that toolCallId, the
     * decision is ignored (idempotent). When absent and a pending approval exists,
     * the run stays paused (nothing to apply).
     */
    approvalDecision?: ApprovalDecision;
  };

function shouldWriteSessionEvent(event: AgentRunEvent) {
  return event.type !== "assistant_delta";
}

function isPublicPipelineEvent(event: AgentRunEvent) {
  return (
    event.type !== "intent_route" &&
    event.type !== "context_source" &&
    event.type !== "run_stage" &&
    event.type !== "repair_decision" &&
    // S7 — run_snapshot is JSONL-only (persisted but excluded from the public
    // pipeline event stream, like assistant_delta). The runner never yields it,
    // but this guards any path that could route it to onEvent / result.events.
    event.type !== "run_snapshot"
  );
}

function withIntentCliOverride(
  cli: CliConfigOverrides | undefined,
  approvalMode: CliConfigOverrides["approvalMode"] | undefined
): CliConfigOverrides | undefined {
  if (!approvalMode || cli?.approvalMode !== undefined) return cli;
  return {
    ...(cli ?? {}),
    approvalMode
  };
}

function mergeOptionalGuard(
  workflowGuard: ToolGuardConfig | undefined,
  overrideGuard: ToolGuardConfig | undefined
) {
  if (!workflowGuard) return overrideGuard;
  if (!overrideGuard) return workflowGuard;
  return {
    enabled: overrideGuard.enabled ?? workflowGuard.enabled,
    useDefault: overrideGuard.useDefault ?? workflowGuard.useDefault,
    priorityTools: Array.from(new Set([
      ...(workflowGuard.priorityTools ?? []),
      ...(overrideGuard.priorityTools ?? [])
    ])),
    requiredBefore: {
      ...(workflowGuard.requiredBefore ?? {}),
      ...(overrideGuard.requiredBefore ?? {})
    },
    requiredBeforeAny: {
      ...(workflowGuard.requiredBeforeAny ?? {}),
      ...(overrideGuard.requiredBeforeAny ?? {})
    }
  };
}

function workflowSystemMessages(workflow: WorkflowSelection | undefined) {
  return workflow?.pipeline.systemMessages ?? [];
}

function workflowContext(workflow: WorkflowSelection | undefined) {
  if (!workflow || workflowSystemMessages(workflow).length === 0) return undefined;
  return {
    name: workflow.name,
    ...(workflow.description ? { description: workflow.description } : {})
  };
}

async function emitPipelineEvent(
  writer: JsonlSessionWriter,
  event: AgentRunEvent,
  onEvent?: (event: AgentRunEvent) => void | Promise<void>
) {
  if (shouldWriteSessionEvent(event)) await writer.write(event);
  if (isPublicPipelineEvent(event)) await onEvent?.(event);
}

async function runPipelineStage<T>(
  writer: JsonlSessionWriter,
  stage: RunStageEvent["stage"],
  onEvent: ((event: AgentRunEvent) => void | Promise<void>) | undefined,
  run: () => Promise<T>
) {
  const startedAt = new Date().toISOString();
  await emitPipelineEvent(writer, { type: "run_stage", stage, status: "started", startedAt }, onEvent);
  try {
    const result = await run();
    const endedAt = new Date().toISOString();
    await emitPipelineEvent(writer, {
      type: "run_stage",
      stage,
      status: "completed",
      startedAt,
      endedAt,
      durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt))
    }, onEvent);
    return result;
  } catch (error) {
    const endedAt = new Date().toISOString();
    await emitPipelineEvent(writer, {
      type: "run_stage",
      stage,
      status: "failed",
      startedAt,
      endedAt,
      durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
      reason: error instanceof Error ? error.message : String(error)
    }, onEvent);
    throw error;
  }
}

async function markInjectedBackgroundTaskContext(
  config: XenesisConfig,
  taskIds: string[],
  sessionId: string
) {
  if (taskIds.length === 0) return;
  await markAgentTasksContextInjected(
    new SqliteAgentTaskStore({ xenesisHome: config.xenesisHome }),
    taskIds,
    sessionId
  );
}

async function markInjectedAgentMessagesRead(
  config: XenesisConfig,
  messageIds: string[],
  sessionId: string
) {
  if (messageIds.length === 0) return;
  await new SqliteAgentMessageStore({ xenesisHome: config.xenesisHome })
    .markRead(messageIds, sessionId);
}

async function releaseInjectedAgentMessageClaims(
  config: XenesisConfig,
  messageIds: string[],
  sessionId: string
) {
  if (messageIds.length === 0) return;
  await new SqliteAgentMessageStore({ xenesisHome: config.xenesisHome })
    .releaseClaims(messageIds, sessionId);
}

export async function runAgentPipeline(options: AgentRunPipelineOptions): Promise<AgentRunPipelineResult> {
  const env = options.env ?? process.env;
  const intentRoute = classifyPromptIntent(options.prompt, options.mode);
  const effectiveCli = withIntentCliOverride(options.cli, options.mode ? undefined : intentRoute.approvalMode);
  const loadedConfig = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env,
    cli: effectiveCli
  });
  const config = options.workspaceRoot
    ? { ...loadedConfig, workspace: options.workspaceRoot }
    : loadedConfig;
  const configuredWorkflow = options.applyConfiguredWorkflow === false
    ? undefined
    : await resolveWorkflow({
      body: {
        prompt: options.prompt,
        workflow: config.workflow
      },
      stream: Boolean(options.stream),
      env
    }, configuredWorkflowHandlers(config.workflows));
  const prompt = configuredWorkflow?.prompt ?? options.prompt;
  const effectiveMode = options.mode ?? configuredWorkflow?.pipeline.mode ?? intentRoute.mode;
  const systemMessages = [
    ...workflowSystemMessages(configuredWorkflow),
    ...(options.systemMessages ?? [])
  ];
  const guard = mergeOptionalGuard(configuredWorkflow?.pipeline.guard, options.guard);
  const toolExecutionPolicy = mergeToolExecutionPolicies(
    configuredWorkflow?.pipeline.toolExecutionPolicy,
    options.toolExecutionPolicy
  );
  const sessionId = options.sessionId ?? `session-${globalThis.crypto.randomUUID()}`;
  const built = await buildAgentRunner({
    config,
    env,
    prompt,
    sessionId,
    taskId: options.taskId,
    traceId: options.traceId,
    mode: effectiveMode,
    fromPlan: options.fromPlan,
    systemMessages,
    workflowContext: workflowContext(configuredWorkflow),
    historyMessages: options.historyMessages,
    resumeState: options.resumeState,
    ...(options.resuming !== undefined ? { resuming: options.resuming } : {}),
    ...(options.initialSeq !== undefined ? { initialSeq: options.initialSeq } : {}),
    ideContext: options.ideContext,
    abortSignal: options.abortSignal,
    maxTokensBudget: options.maxTokensBudget,
    approvalHandler: options.approvalHandler,
    approvalHandlerFactory: options.approvalHandlerFactory,
    ...(options.injectedApprovalDecision !== undefined
      ? { injectedApprovalDecision: options.injectedApprovalDecision }
      : {}),
    stream: options.stream,
    guard,
    toolExecutionPolicy,
    allowedTools: options.allowedTools,
    onNotice: options.onNotice
  });
  options.onSessionWriter?.(built.sessionWriter, built.sessionId);
  await emitPipelineEvent(built.sessionWriter, {
    type: "intent_route",
    intent: intentRoute.intent,
    ...(intentRoute.mode ? { mode: intentRoute.mode } : {}),
    ...(intentRoute.approvalMode ? { approvalMode: intentRoute.approvalMode } : {}),
    reason: intentRoute.reason
  }, options.onEvent);
  const workflowStepStartedAt = options.workflowStep?.startedAt ?? new Date().toISOString();

  if (options.workflowStep) {
    await built.sessionWriter.write({
      type: "workflow_step",
      workflow: options.workflowStep.workflow,
      step: options.workflowStep.step,
      index: options.workflowStep.index,
      total: options.workflowStep.total,
      status: "running",
      startedAt: workflowStepStartedAt
    });
  }

  let agentMessagesAcknowledged = false;
  try {
    let capturedMessages: AgentMessage[] = [];
    let execution: Awaited<ReturnType<typeof executeAgentRun>>;
    try {
      execution = await runPipelineStage(built.sessionWriter, "run", options.onEvent, () => executeAgentRun({
        runner: built.runner,
        prompt,
        attachments: options.attachments,
        sessionWriter: built.sessionWriter,
        onEvent: options.onEvent,
        onMessages: async (messages) => {
          capturedMessages = messages;
          await options.onMessages?.(messages);
        }
      }));
    } catch (error) {
      await releaseInjectedAgentMessageClaims(config, built.agentMessageContextIds, built.sessionId);
      agentMessagesAcknowledged = true;
      throw error;
    }
    await markInjectedBackgroundTaskContext(config, built.backgroundTaskContextIds, built.sessionId);
    await markInjectedAgentMessagesRead(config, built.agentMessageContextIds, built.sessionId);
    agentMessagesAcknowledged = true;
    let finalEvents = execution.events;
    let finalDoneContent = execution.doneContent;
    let finalTurns = execution.turns;
    let finalUsage = execution.usage;
    // S6 — a durably paused run (background/headless ask with no resolver) did not
    // complete; skip verify/fix and surface the paused status + pendingApproval so
    // the task store records a resumable paused state instead of a false success.
    const runPaused = execution.status === "paused";

    if (
      !runPaused &&
      config.verification.autoFix &&
      config.verification.commands.length > 0 &&
      effectiveMode !== "plan"
    ) {
      const outcome = await runVerifyFixLoop({
        initial: {
          events: execution.events,
          ...(execution.doneContent !== undefined ? { doneContent: execution.doneContent } : {}),
          turns: execution.turns,
          messages: capturedMessages
        },
        maxAttempts: config.verification.maxRepairAttempts,
        maxOutputChars: config.verification.maxOutputChars,
        runVerification: () => runVerificationCommands({
          commands: config.verification.commands,
          cwd: config.workspace,
          env,
          timeoutMs: config.verification.timeoutMs,
          maxOutputChars: config.verification.maxOutputChars
        }),
        repairPreflight: async ({ verification }) => buildOperationalRepairPreflightDecision(
          await collectOperationalFailureContext(config),
          verification
        ),
        onEvent: async (event) => {
          await emitPipelineEvent(built.sessionWriter, event, options.onEvent);
        },
        runFix: async (prompt, history) => {
          const fixBuilt = await buildAgentRunner({
            config,
            env,
            prompt,
            sessionId,
            traceId: options.traceId,
            systemMessages,
            workflowContext: workflowContext(configuredWorkflow),
            historyMessages: history,
            ideContext: options.ideContext,
            abortSignal: options.abortSignal,
            maxTokensBudget: options.maxTokensBudget,
            approvalHandler: options.approvalHandler,
            approvalHandlerFactory: options.approvalHandlerFactory,
            stream: options.stream,
            guard,
            toolExecutionPolicy,
            allowedTools: options.allowedTools,
            onNotice: options.onNotice
          });
          let fixMessages: AgentMessage[] = [];
          const fixExecution = await executeAgentRun({
            runner: fixBuilt.runner,
            prompt,
            sessionWriter: fixBuilt.sessionWriter,
            onEvent: options.onEvent,
            onMessages: async (messages) => {
              fixMessages = messages;
              await options.onMessages?.(messages);
            }
          });
          return {
            events: fixExecution.events,
            ...(fixExecution.doneContent !== undefined ? { doneContent: fixExecution.doneContent } : {}),
            turns: fixExecution.turns,
            messages: fixMessages
          };
        }
      });
      finalEvents = outcome.allEvents;
      finalDoneContent = outcome.final.doneContent;
      finalTurns = outcome.totalTurns;
    } else if (config.verification.autoFix && config.verification.commands.length > 0) {
      await emitPipelineEvent(built.sessionWriter, {
        type: "run_stage",
        stage: "repair",
        status: "skipped",
        reason: effectiveMode === "plan" ? "plan_mode" : "verification_disabled"
      }, options.onEvent);
    }

    if (effectiveMode === "plan" && options.savePlan && finalDoneContent !== undefined) {
      await saveLatestPlan(config, finalDoneContent, options.onNotice);
    }

    if (options.workflowStep) {
      const endedAt = new Date().toISOString();
      await built.sessionWriter.write({
        type: "workflow_step",
        workflow: options.workflowStep.workflow,
        step: options.workflowStep.step,
        index: options.workflowStep.index,
        total: options.workflowStep.total,
        status: "completed",
        startedAt: workflowStepStartedAt,
        endedAt,
        durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(workflowStepStartedAt)),
        exitCode: 0
      });
    }

    const runReport = await runPipelineStage(built.sessionWriter, "report", options.onEvent, () => finalizeAgentRun({
      config,
      sessionWriter: built.sessionWriter,
      sessionId: built.sessionId,
      doneContent: finalDoneContent,
      env,
      onNotice: options.onNotice
    }));

    return {
      exitCode: 0,
      sessionId: built.sessionId,
      ...(options.traceId ? { traceId: options.traceId } : {}),
      events: finalEvents.filter(isPublicPipelineEvent),
      ...(finalDoneContent !== undefined ? { doneContent: finalDoneContent } : {}),
      turns: finalTurns,
      ...(finalUsage ? { usage: finalUsage } : {}),
      runReport,
      selfReview: runReport.selfReview,
      status: runPaused ? "paused" : "done",
      ...(execution.pendingApproval ? { pendingApproval: execution.pendingApproval } : {})
    };
  } catch (error) {
    if (options.workflowStep) {
      const endedAt = new Date().toISOString();
      await built.sessionWriter.write({
        type: "workflow_step",
        workflow: options.workflowStep.workflow,
        step: options.workflowStep.step,
        index: options.workflowStep.index,
        total: options.workflowStep.total,
        status: "failed",
        startedAt: workflowStepStartedAt,
        endedAt,
        durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(workflowStepStartedAt)),
        error: error instanceof Error ? error.message : String(error)
      });
    }
    if (!agentMessagesAcknowledged) {
      await releaseInjectedAgentMessageClaims(config, built.agentMessageContextIds, built.sessionId);
    }
    throw error;
  }
}

/**
 * S7 — event-sourced session resume entry, parallel to {@link runAgentPipeline}.
 *
 * Rehydrates the conversation + per-run state from the existing JSONL session log
 * and continues the run at the last turn boundary using **seed-state, never
 * replay**: past events are NOT re-executed (no duplicate LLM calls / tool side
 * effects). Steps:
 *   1. read the session log (truncation-tolerant) for `sessionId`;
 *   2. rebuild `historyMessages` (ids backfilled) and repair any dangling
 *      `tool_call` from a mid-tool-call crash (`repairToolResultPairing`);
 *   3. recover the last `run_snapshot` (validated) — if absent, degrade to a
 *      message-only resume (a fresh run starting at turn 0 over the rehydrated
 *      history);
 *   4. recover the triggering user message (required) for constraint derivation;
 *   5. delegate to {@link runAgentPipeline} with the SAME `sessionId` (appending
 *      to the same log), `initialSeq` continuing the monotonic envelope `seq`,
 *      the rehydrated `historyMessages`, and the restored `resumeState`.
 */
export async function resumeAgentPipeline(
  options: ResumeAgentPipelineOptions
): Promise<AgentRunPipelineResult> {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? options.cli?.workspace ?? options.workspaceRoot ?? process.cwd();
  // Resolve the effective xenesisHome the same way the run will, so the log we
  // read and the log the writer appends to are the same file.
  const cli = options.xenesisHome
    ? { ...(options.cli ?? {}), xenesisHome: options.xenesisHome }
    : options.cli;
  const resolvedConfig = await loadConfig({
    cwd,
    configPath: options.configPath,
    env,
    cli
  });
  const xenesisHome = resolvedConfig.xenesisHome;

  const records = await readSessionLog(xenesisHome, options.sessionId);
  const userMessage = lastUserMessage(records);
  if (!userMessage) {
    throw new Error(`Cannot resume session ${options.sessionId}: no user message in the log.`);
  }
  const resumeState = latestRunSnapshot(records);

  // S6 — durable HITL resume. A `run_snapshot.pendingApproval` marks a paused
  // approval gate. Apply the human decision exactly once:
  //  - if the log already has an `approval_resolved` for that toolCallId, the
  //    decision was already applied on a prior resume → do NOT re-apply
  //    (idempotent; Global Constraint #1);
  //  - otherwise pass the injected decision into the runner AND exclude the
  //    pending toolCallId from synthetic-result repair so its `tool_call` stays
  //    un-paired for the runner to resolve by executing/denying (Constraint #2).
  const pendingApproval = resumeState?.pendingApproval;
  const pendingUnresolved = pendingApproval !== undefined &&
    !hasApprovalResolved(records, pendingApproval.toolCallId);
  const injectedApprovalDecision = pendingUnresolved ? options.approvalDecision : undefined;
  const excludeToolCallIds = pendingUnresolved
    ? new Set<string>([pendingApproval.toolCallId])
    : undefined;
  const historyMessages = repairToolResultPairing(
    eventsToMessages(records),
    excludeToolCallIds ? { excludeToolCallIds } : {}
  );

  // `approvalDecision` is a resume-only option; strip it before delegating to
  // runAgentPipeline (which carries `injectedApprovalDecision` instead).
  const { approvalDecision: _approvalDecision, ...pipelineOptions } = options;

  return await runAgentPipeline({
    ...pipelineOptions,
    cwd,
    cli: { ...(cli ?? {}), xenesisHome },
    sessionId: options.sessionId,
    prompt: userMessage.content,
    historyMessages,
    // The triggering user message is already in `historyMessages` (rehydrated
    // above), so flag the run as a resume so the runner does not re-append /
    // re-record it. This holds even on the degrade path where no `run_snapshot`
    // was recovered (`resumeState` undefined) — the prior message-only resume
    // would otherwise duplicate the last user turn (spec §4, Global Constraint #4).
    resuming: true,
    initialSeq: records.length,
    // Resume continues the recovered run; do not re-resolve a configured
    // workflow against the recovered prompt (avoids re-running workflow setup).
    applyConfiguredWorkflow: false,
    ...(resumeState ? { resumeState } : {}),
    ...(injectedApprovalDecision ? { injectedApprovalDecision } : {})
  });
}
