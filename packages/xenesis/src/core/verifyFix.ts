import type { VerificationReport, VerificationStatus } from "../verification/index.js";
import type { AgentRunEvent, VerificationResultEvent, WorkspaceChangeEvent } from "./events.js";
import type { AgentMessage } from "./messages.js";

export interface VerifyFixRunResult {
  events: AgentRunEvent[];
  doneContent?: string;
  turns: number;
  messages: AgentMessage[];
}

export interface VerifyFixLoopOptions {
  initial: VerifyFixRunResult;
  maxAttempts: number;
  maxOutputChars?: number;
  runVerification: () => Promise<VerificationReport>;
  repairPreflight?: (input: RepairPreflightInput) => Promise<RepairPreflightResult>;
  runFix: (prompt: string, history: AgentMessage[]) => Promise<VerifyFixRunResult>;
  onEvent: (event: AgentRunEvent) => Promise<void>;
}

export interface RepairPreflightInput {
  verification: VerificationReport;
  attempt: number;
  maxAttempts: number;
}

export interface RepairPreflightDecision {
  context?: string;
  shouldRepair?: boolean;
  blockReason?: string;
}

export type RepairPreflightResult = string | RepairPreflightDecision | undefined;

export interface VerifyFixLoopOutcome {
  final: VerifyFixRunResult;
  allEvents: AgentRunEvent[];
  totalTurns: number;
  attempts: number;
  verification?: VerificationReport;
  stopReason?: string;
}

function hasWorkspaceChange(result: VerifyFixRunResult) {
  return result.events.some((event) => event.type === "workspace_change");
}

function truncate(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n[output truncated]`;
}

function verificationEventStatus(status: VerificationStatus) {
  return status;
}

function failedCommands(verification: VerificationReport) {
  return verification.results.filter((result) => !result.ok).map((result) => result.command);
}

function workspaceChanges(events: AgentRunEvent[]): WorkspaceChangeEvent[] {
  const changes = events.filter((event): event is WorkspaceChangeEvent => event.type === "workspace_change");
  const seen = new Set<string>();
  const result: WorkspaceChangeEvent[] = [];
  for (const change of changes) {
    const key = `${change.action}:${change.path}:${change.toolName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(change);
  }
  return result.slice(-8);
}

function verificationFailureSignature(verification: VerificationReport) {
  return verification.results
    .filter((result) => !result.ok)
    .map((result) => [
      result.command,
      result.exitCode ?? "null",
      truncate([result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n"), 1200)
    ].join("\n"))
    .join("\n---\n");
}

function normalizeRepairPreflight(result: RepairPreflightResult): RepairPreflightDecision {
  if (typeof result === "string") return { context: result };
  return result ?? {};
}

function verificationEvent(
  verification: VerificationReport,
  attempt: number,
  maxAttempts: number
): VerificationResultEvent {
  return {
    type: "verification_result",
    status: verificationEventStatus(verification.status),
    attempt,
    maxAttempts,
    failedCommands: failedCommands(verification)
  };
}

async function emitVerificationEvent(
  verification: VerificationReport,
  attempt: number,
  maxAttempts: number,
  allEvents: AgentRunEvent[],
  onEvent: (event: AgentRunEvent) => Promise<void>
) {
  const event = verificationEvent(verification, attempt, maxAttempts);
  allEvents.push(event);
  await onEvent(event);
}

async function emitRepairDecision(
  status: "continue" | "completed" | "skipped" | "blocked",
  reason: string,
  attempt: number,
  maxAttempts: number,
  verification: VerificationReport | undefined,
  allEvents: AgentRunEvent[],
  onEvent: (event: AgentRunEvent) => Promise<void>
) {
  const event: AgentRunEvent = {
    type: "repair_decision",
    status,
    reason,
    attempt,
    maxAttempts,
    failedCommands: verification ? failedCommands(verification) : []
  };
  allEvents.push(event);
  await onEvent(event);
}

async function runStage<T>(
  stage: "verify" | "repair",
  allEvents: AgentRunEvent[],
  onEvent: (event: AgentRunEvent) => Promise<void>,
  run: () => Promise<T>
) {
  const startedAt = new Date().toISOString();
  const started: AgentRunEvent = { type: "run_stage", stage, status: "started", startedAt };
  allEvents.push(started);
  await onEvent(started);
  try {
    const result = await run();
    const endedAt = new Date().toISOString();
    const completed: AgentRunEvent = {
      type: "run_stage",
      stage,
      status: "completed",
      startedAt,
      endedAt,
      durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt))
    };
    allEvents.push(completed);
    await onEvent(completed);
    return result;
  } catch (error) {
    const endedAt = new Date().toISOString();
    const failed: AgentRunEvent = {
      type: "run_stage",
      stage,
      status: "failed",
      startedAt,
      endedAt,
      durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
      reason: error instanceof Error ? error.message : String(error)
    };
    allEvents.push(failed);
    await onEvent(failed);
    throw error;
  }
}

export function buildVerificationFixPrompt(
  verification: VerificationReport,
  attempt: number,
  maxAttempts: number,
  maxOutputChars = 8000,
  repairPreflightContext?: string,
  recentWorkspaceChanges: Pick<WorkspaceChangeEvent, "action" | "path" | "toolName">[] = [],
  repeatedFailure = false
): string {
  const failedBlocks = verification.results
    .filter((result) => !result.ok)
    .map((result) => {
      const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join("\n");
      return [
        `$ ${result.command} (exit ${result.exitCode ?? "null"})`,
        truncate(output || "<no output>", maxOutputChars)
      ].join("\n");
    });

  return [
    `Xenesis verification failed (attempt ${attempt}/${maxAttempts}).`,
    ...(repeatedFailure
      ? [
          "Previous repair attempt did not clear this same verification failure.",
          "Try a different, smaller fix based on the failing output and changed files.",
          ""
        ]
      : []),
    ...(repairPreflightContext?.trim()
      ? [
          "Xenesis repair preflight context:",
          repairPreflightContext.trim(),
          ""
        ]
      : []),
    ...(recentWorkspaceChanges.length > 0
      ? [
          "Recent workspace changes:",
          ...recentWorkspaceChanges.map((change) => `- ${change.action} ${change.path} via ${change.toolName}`),
          ""
        ]
      : []),
    "Failed commands:",
    "",
    failedBlocks.join("\n\n"),
    "",
    "Repair protocol:",
    "- Inspect the failing files or recently changed files before editing.",
    "- Run only the minimal fix needed for the failed commands.",
    "- Prefer focused read/search/diagnostics plus edit/patch/json over broad rewrites.",
    "- Keep verification commands and tests unchanged unless they are themselves wrong."
  ].join("\n");
}

export async function runVerifyFixLoop(options: VerifyFixLoopOptions): Promise<VerifyFixLoopOutcome> {
  const maxAttempts = Math.max(0, Math.min(options.maxAttempts, 5));
  let current = options.initial;
  const allEvents = [...current.events];
  let totalTurns = current.turns;
  let attempts = 0;
  let verification: VerificationReport | undefined;
  const conversation: AgentMessage[] = [...current.messages];
  let lastFailureSignature: string | undefined;
  let repairPreflightDecision: RepairPreflightDecision | undefined;

  if (!hasWorkspaceChange(current)) {
    await emitRepairDecision(
      "skipped",
      "no_workspace_changes",
      attempts,
      maxAttempts,
      verification,
      allEvents,
      options.onEvent
    );
    return { final: current, allEvents, totalTurns, attempts, verification, stopReason: "no_workspace_changes" };
  }

  while (true) {
    verification = await runStage("verify", allEvents, options.onEvent, options.runVerification);
    await emitVerificationEvent(verification, attempts, maxAttempts, allEvents, options.onEvent);

    if (verification.status !== "failed") {
      await emitRepairDecision(
        "completed",
        "verification_passed",
        attempts,
        maxAttempts,
        verification,
        allEvents,
        options.onEvent
      );
      return { final: current, allEvents, totalTurns, attempts, verification, stopReason: "verification_passed" };
    }
    const signature = verificationFailureSignature(verification);
    const repeatedFailure = lastFailureSignature !== undefined && signature === lastFailureSignature;
    lastFailureSignature = signature;

    if (attempts >= maxAttempts) {
      await emitRepairDecision(
        "blocked",
        "max_attempts",
        attempts,
        maxAttempts,
        verification,
        allEvents,
        options.onEvent
      );
      return { final: current, allEvents, totalTurns, attempts, verification, stopReason: "max_attempts" };
    }

    repairPreflightDecision ??= normalizeRepairPreflight(await options.repairPreflight?.({
      verification,
      attempt: attempts,
      maxAttempts
    }));
    if (repairPreflightDecision.shouldRepair === false) {
      const reason = `repair_preflight_blocked:${repairPreflightDecision.blockReason ?? "blocked"}`;
      await emitRepairDecision(
        "blocked",
        reason,
        attempts,
        maxAttempts,
        verification,
        allEvents,
        options.onEvent
      );
      return { final: current, allEvents, totalTurns, attempts, verification, stopReason: reason };
    }

    attempts += 1;
    await emitRepairDecision(
      "continue",
      "verification_failed",
      attempts,
      maxAttempts,
      verification,
      allEvents,
      options.onEvent
    );
    const prompt = buildVerificationFixPrompt(
      verification,
      attempts,
      maxAttempts,
      options.maxOutputChars,
      repairPreflightDecision.context,
      workspaceChanges(current.events),
      repeatedFailure
    );
    current = await runStage("repair", allEvents, options.onEvent, () => options.runFix(prompt, [...conversation]));
    allEvents.push(...current.events);
    totalTurns += current.turns;
    conversation.splice(0, conversation.length, ...current.messages);

    if (!hasWorkspaceChange(current)) {
      verification = await runStage("verify", allEvents, options.onEvent, options.runVerification);
      await emitVerificationEvent(verification, attempts, maxAttempts, allEvents, options.onEvent);
      if (verification.status !== "failed") {
        await emitRepairDecision(
          "completed",
          "verification_passed",
          attempts,
          maxAttempts,
          verification,
          allEvents,
          options.onEvent
        );
        return { final: current, allEvents, totalTurns, attempts, verification, stopReason: "verification_passed" };
      }
      await emitRepairDecision(
        "blocked",
        "no_workspace_change_after_repair",
        attempts,
        maxAttempts,
        verification,
        allEvents,
        options.onEvent
      );
      return {
        final: current,
        allEvents,
        totalTurns,
        attempts,
        verification,
        stopReason: "no_workspace_change_after_repair"
      };
    }
  }
}
