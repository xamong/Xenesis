import type { RuntimeCompatRunResult } from "./RuntimeCompatFacade.js";
import type { AgentKernelRunResult } from "../kernel/AgentKernel.js";
import type { AgentRunEvent } from "../events.js";
import type { AgentRunUsage } from "../AgentRunner.js";
import type { LedgerEntry } from "../messages/index.js";
import { stableValuesDiffer } from "../../utils/stableValue.js";

export interface RuntimeShadowDiff {
  path:
    | "exitCode"
    | "traceId"
    | "events"
    | "doneContent"
    | "turns"
    | "usage"
    | "providerMessages"
    | "permissionDecisions"
    | "sessionRecords"
    | "finalStatus";
  expected: unknown;
  actual: unknown;
}

export interface RuntimeShadowComparison {
  ok: boolean;
  diffs: RuntimeShadowDiff[];
}

export interface CompareRuntimeShadowResultsOptions {
  oldRuntime: RuntimeCompatRunResult;
  newRuntime: RuntimeCompatRunResult;
}

export type RuntimeShadowObservationField =
  | "providerMessages"
  | "permissionDecisions"
  | "sessionRecords"
  | "finalStatus";

export interface RuntimeShadowObservation {
  result: RuntimeCompatRunResult;
  providerMessages?: unknown;
  permissionDecisions?: unknown;
  sessionRecords?: unknown;
  finalStatus?: unknown;
}

export interface CompareRuntimeShadowObservationsOptions {
  oldRuntime: RuntimeShadowObservation;
  newRuntime: RuntimeShadowObservation;
}

export interface RuntimeShadowObservationCompareOptions {
  requiredFields?: RuntimeShadowObservationField[];
}

export type AgentKernelToolResultOkLookup =
  | Record<string, boolean>
  | Map<string, boolean>
  | ((toolCallId: string) => boolean | undefined);

export interface ProjectAgentKernelRunResultOptions {
  result: AgentKernelRunResult;
  sessionId: string;
  traceId?: string;
  exitCode?: number;
  turns?: number;
  doneContent?: string;
  toolResultOkById?: AgentKernelToolResultOkLookup;
  usage?: AgentRunUsage;
}

export interface ProjectAgentKernelShadowObservationOptions extends ProjectAgentKernelRunResultOptions {
  providerMessages?: unknown;
  permissionDecisions?: unknown;
  sessionRecords?: unknown;
  finalStatus?: unknown;
}

function addDiff(
  diffs: RuntimeShadowDiff[],
  path: RuntimeShadowDiff["path"],
  expected: unknown,
  actual: unknown
) {
  if (stableValuesDiffer(expected, actual)) diffs.push({ path, expected, actual });
}

function terminalEvent(events: readonly AgentRunEvent[]) {
  return [...events].reverse().find((event) => (
    event.type === "done" ||
    event.type === "stopped" ||
    event.type === "incomplete_run"
  ));
}

function inferTurns(result: AgentKernelRunResult) {
  return result.ledger.snapshot().filter((entry) => entry.kind === "assistant_message").length;
}

function lastRunState(entries: readonly LedgerEntry[]) {
  return [...entries].reverse().find((entry): entry is Extract<LedgerEntry, { kind: "run_state" }> => (
    entry.kind === "run_state"
  ));
}

function inferFinalStatus(result: AgentKernelRunResult) {
  return result.completionReport?.status ?? lastRunState(result.ledger.snapshot())?.state;
}

function inferExitCode(result: AgentKernelRunResult) {
  const finalStatus = inferFinalStatus(result);
  if (finalStatus === "failed" || finalStatus === "blocked") return 1;
  if (result.events.some((event) => event.type === "error")) return 1;
  return 0;
}

function lookupToolResultOk(
  lookup: AgentKernelToolResultOkLookup | undefined,
  toolCallId: string
): boolean | undefined {
  if (!lookup) return undefined;
  if (lookup instanceof Map) return lookup.get(toolCallId);
  if (typeof lookup === "function") return lookup(toolCallId);
  return lookup[toolCallId];
}

function toolResultOk(
  lookup: AgentKernelToolResultOkLookup | undefined,
  toolCallId: string
): boolean {
  const ok = lookupToolResultOk(lookup, toolCallId);
  if (ok === undefined) {
    throw new Error(`projectAgentKernelRunResult requires toolResultOkById for tool result ${toolCallId}`);
  }
  return ok;
}

function terminalWithProjection(
  result: AgentKernelRunResult,
  turns: number,
  usage: AgentRunUsage | undefined
): AgentRunEvent | undefined {
  const terminal = terminalEvent(result.events);
  if (!terminal) return undefined;
  if (
    terminal.type !== "done" &&
    terminal.type !== "stopped" &&
    terminal.type !== "incomplete_run"
  ) {
    return terminal;
  }
  return {
    ...terminal,
    turns,
    ...(usage ? { usage } : {})
  };
}

function projectAgentKernelPublicEvents(
  result: AgentKernelRunResult,
  options: {
    toolResultOkById?: AgentKernelToolResultOkLookup;
    turns: number;
    usage?: AgentRunUsage;
  }
): AgentRunEvent[] {
  const events: AgentRunEvent[] = [];
  for (const entry of result.ledger.snapshot()) {
    if (entry.kind === "user_message") {
      events.push({
        type: "user_message",
        message: { role: "user", content: entry.content }
      });
      continue;
    }
    if (entry.kind === "assistant_message") {
      const assistantMessage: Extract<AgentRunEvent, { type: "assistant_message" }>["message"] = {
        role: "assistant",
        content: entry.content,
        ...(entry.toolCalls ? { toolCalls: entry.toolCalls } : {})
      };
      events.push({ type: "assistant_message", message: assistantMessage });
      for (const toolCall of entry.toolCalls ?? []) {
        events.push({ type: "tool_call", toolCall });
      }
      continue;
    }
    if (entry.kind === "tool_result") {
      events.push({
        type: "tool_result",
        ok: toolResultOk(options.toolResultOkById, entry.toolCallId),
        message: {
          role: "tool",
          toolCallId: entry.toolCallId,
          name: entry.name,
          content: entry.content
        }
      });
    }
  }

  const terminal = terminalWithProjection(result, options.turns, options.usage);
  if (terminal) events.push(terminal);
  return events;
}

function hasObservationField(
  observation: RuntimeShadowObservation,
  field: RuntimeShadowObservationField
): boolean {
  return Object.prototype.hasOwnProperty.call(observation, field);
}

function addObservationFieldDiff(
  diffs: RuntimeShadowDiff[],
  path: RuntimeShadowObservationField,
  options: {
    oldRuntime: RuntimeShadowObservation;
    newRuntime: RuntimeShadowObservation;
    required: boolean;
  }
) {
  const oldHas = hasObservationField(options.oldRuntime, path);
  const newHas = hasObservationField(options.newRuntime, path);
  if (options.required && (!oldHas || !newHas)) {
    diffs.push({
      path,
      expected: "present",
      actual: oldHas || newHas ? (oldHas ? "newRuntime missing" : "oldRuntime missing") : "missing"
    });
    return;
  }
  addDiff(diffs, path, options.oldRuntime[path], options.newRuntime[path]);
}

export function compareRuntimeShadowResults(
  options: CompareRuntimeShadowResultsOptions
): RuntimeShadowComparison {
  const diffs: RuntimeShadowDiff[] = [];
  addDiff(diffs, "exitCode", options.oldRuntime.exitCode, options.newRuntime.exitCode);
  addDiff(diffs, "traceId", options.oldRuntime.traceId, options.newRuntime.traceId);
  addDiff(diffs, "events", options.oldRuntime.events, options.newRuntime.events);
  addDiff(diffs, "doneContent", options.oldRuntime.doneContent, options.newRuntime.doneContent);
  addDiff(diffs, "turns", options.oldRuntime.turns, options.newRuntime.turns);
  addDiff(diffs, "usage", options.oldRuntime.usage, options.newRuntime.usage);
  return { ok: diffs.length === 0, diffs };
}

export function compareRuntimeShadowObservations(
  observations: CompareRuntimeShadowObservationsOptions,
  options: RuntimeShadowObservationCompareOptions = {}
): RuntimeShadowComparison {
  const base = compareRuntimeShadowResults({
    oldRuntime: observations.oldRuntime.result,
    newRuntime: observations.newRuntime.result
  });
  const diffs = [...base.diffs];
  const requiredFields = new Set(options.requiredFields ?? []);
  for (const field of ["providerMessages", "permissionDecisions", "sessionRecords", "finalStatus"] as const) {
    addObservationFieldDiff(diffs, field, {
      oldRuntime: observations.oldRuntime,
      newRuntime: observations.newRuntime,
      required: requiredFields.has(field)
    });
  }
  return { ok: diffs.length === 0, diffs };
}

export function projectAgentKernelRunResult(
  options: ProjectAgentKernelRunResultOptions
): RuntimeCompatRunResult {
  const exitCode = options.exitCode ?? inferExitCode(options.result);
  const turns = options.turns ?? inferTurns(options.result);
  const usage = options.usage ?? options.result.usage;
  const projected: RuntimeCompatRunResult = {
    exitCode,
    sessionId: options.sessionId,
    events: projectAgentKernelPublicEvents(options.result, {
      turns,
      usage,
      toolResultOkById: options.toolResultOkById
    }),
    doneContent: options.doneContent ?? options.result.content,
    turns
  };
  if (options.traceId !== undefined) projected.traceId = options.traceId;
  if (usage !== undefined) projected.usage = usage;
  return projected;
}

export function projectAgentKernelShadowObservation(
  options: ProjectAgentKernelShadowObservationOptions
): RuntimeShadowObservation {
  const ledgerEntries = options.result.ledger.snapshot();
  const inferredPermissionDecisions = ledgerEntries.filter((entry) => (
    entry.kind === "permission_audit"
  ));
  const observation: RuntimeShadowObservation = {
    result: projectAgentKernelRunResult(options),
    finalStatus: options.finalStatus ?? inferFinalStatus(options.result)
  };
  if (options.permissionDecisions !== undefined) {
    observation.permissionDecisions = options.permissionDecisions;
  } else if (inferredPermissionDecisions.length > 0) {
    observation.permissionDecisions = inferredPermissionDecisions;
  }
  if (options.providerMessages !== undefined) observation.providerMessages = options.providerMessages;
  if (options.sessionRecords !== undefined) observation.sessionRecords = options.sessionRecords;
  return observation;
}
