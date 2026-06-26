import type { ToolExecutionPolicy } from "./AgentRunner.js";

export interface DiagnosticFailedToolPattern {
  name: string;
  failures: number;
  calls: number;
  runCount: number;
  latestSessionId?: string;
  latestTraceId?: string;
}

export interface DiagnosticRepairStopPattern {
  reason: string;
  count: number;
  failedCommands: string[];
  latestSessionId?: string;
  latestTraceId?: string;
}

export interface DiagnosticHandoffBottleneckPattern {
  handoffId: string;
  title?: string;
  total: number;
  queued: number;
  running: number;
  blocked: number;
  failed?: number;
  completed?: number;
  cancelled?: number;
  active: number;
  labels: string[];
  blockedReasons?: string[];
}

export interface DiagnosticToolRecoveryPattern {
  kind: string;
  count: number;
  recoveredCount: number;
  unrecoveredCount: number;
  tools: string[];
  nextActions: string[];
  latestSessionId?: string;
  latestTraceId?: string;
}

export interface DiagnosticToolChoicePattern {
  missedTool: string;
  priorityReason: string;
  missedCount: number;
  priorityTools: string[];
  latestSessionId?: string;
  latestTraceId?: string;
}

export type DiagnosticCapabilityImpactEffectivenessStatus =
  | "improved"
  | "regressed"
  | "mixed"
  | "insufficient_data";

export interface DiagnosticCapabilityImpactEffectiveness {
  status: DiagnosticCapabilityImpactEffectivenessStatus;
  beforeRuns: number;
  afterRuns: number;
  qualityScoreDelta?: number;
  toolPriorityMissedCountDelta?: number;
  verificationPassRateDelta?: number;
  repairAttemptCountDelta?: number;
}

export interface DiagnosticCapabilityPolicyImpactPattern {
  area: string;
  count: number;
  taskIds: string[];
  targetFiles: string[];
  verification: string[];
  sourceScenarioIds: string[];
  latestResultAt?: string;
  effectiveness?: DiagnosticCapabilityImpactEffectiveness;
}

export interface DiagnosticFailurePatterns {
  topFailedTools: DiagnosticFailedToolPattern[];
  repairStopReasons: DiagnosticRepairStopPattern[];
  handoffBottlenecks: DiagnosticHandoffBottleneckPattern[];
  toolRecoveryPatterns?: DiagnosticToolRecoveryPattern[];
  toolChoicePatterns?: DiagnosticToolChoicePattern[];
  capabilityPolicyImpacts?: DiagnosticCapabilityPolicyImpactPattern[];
}

export interface AdaptiveExecutionPolicy {
  active: boolean;
  rules: string[];
  priorityTools: string[];
  cautionTools: string[];
  repairCommands: string[];
  handoffIds: string[];
  requiredBefore: Record<string, string[]>;
  recoveryActions: string[];
  longRunningStrategy: {
    mode: "handoff-first" | "recover-existing-handoff";
    priorityTools: string[];
    stopConditions: string[];
  };
  toolStrategy: {
    preferredTools: string[];
    cautionTools: string[];
    avoidDuplicateTools: string[];
  };
  contextStrategy: {
    injectionOrder: string[];
    memoryUse: string;
    staleContextPolicy: string;
  };
  subagentStrategy: {
    recommendedAgents: string[];
    routeWhen: string[];
  };
  providerStrategy: {
    retry: string;
    fallback: string;
    escalationSignals: string[];
  };
  externalStrategy: {
    statusFields: string[];
    channelGuidance: string;
  };
  detail: string;
}

const shellRecoveryTools = ["tree", "glob", "list", "read", "search", "code_symbols", "lsp", "diagnostics"];

function uniqueInOrder(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function commaListWithAnd(values: string[]) {
  if (values.length <= 1) return values.join("");
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function capabilityListWithAnd(values: string[]) {
  if (values.length <= 1) return values.join("");
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return commaListWithAnd(values);
}

function toolRecoveryRule(tool: DiagnosticFailedToolPattern) {
  return `Tool failure pattern detected: ${tool.name} failed ${tool.failures}/${tool.calls} times across ${tool.runCount} run(s).`;
}

function toolFollowupRule(tool: DiagnosticFailedToolPattern) {
  if (tool.name === "shell") {
    return `Before using shell, prefer ${commaListWithAnd(shellRecoveryTools)}.`;
  }
  return `Before using ${tool.name}, verify inputs and prefer a narrower or more structured tool when available.`;
}

function repairRules(pattern: DiagnosticRepairStopPattern) {
  return [
    `Repeated repair stop detected: ${pattern.reason}.`,
    ...(pattern.failedCommands.length > 0
      ? [`Inspect previous evidence before retrying: ${pattern.failedCommands.join(", ")}.`]
      : [])
  ];
}

function handoffRules(pattern: DiagnosticHandoffBottleneckPattern) {
  const title = pattern.title ?? pattern.handoffId;
  return [
    `Handoff bottleneck detected: ${title} has ${pattern.active} active task(s), including ${pattern.blocked} blocked.`,
    "Use agent_task to inspect, retry, cancel, or unblock existing tasks before queuing duplicate work."
  ];
}

function toolRecoveryPatternRules(pattern: DiagnosticToolRecoveryPattern) {
  const toolLabel = pattern.tools.length > 0 ? ` for ${commaListWithAnd(pattern.tools)}` : "";
  return [
    `Tool recovery pattern detected: ${pattern.kind}${toolLabel} has ${pattern.unrecoveredCount}/${pattern.count} unresolved item(s).`,
    ...(pattern.nextActions.length > 0 ? [`Next recovery hint: ${pattern.nextActions[0]}.`] : [])
  ];
}

function toolChoicePatternRules(pattern: DiagnosticToolChoicePattern) {
  return [
    `Tool choice pattern detected: ${pattern.missedTool} missed priority ${pattern.priorityReason} ${pattern.missedCount} time(s).`,
    ...(pattern.priorityTools.length > 0
      ? [`Before using ${pattern.missedTool} for similar requests, prefer ${commaListWithAnd(pattern.priorityTools)}.`]
      : [])
  ];
}

function capabilityPolicyImpactRules(pattern: DiagnosticCapabilityPolicyImpactPattern) {
  return [
    `Completed capability improvement impact: ${pattern.area} from ${pattern.count} completed task(s).`,
    ...(pattern.targetFiles.length > 0
      ? [`Preserve strengthened policy target files: ${capabilityListWithAnd(pattern.targetFiles)}.`]
      : []),
    ...(pattern.verification.length > 0
      ? [`Keep validating this improvement with: ${pattern.verification.join(", ")}.`]
      : [])
  ];
}

function signedFixed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function capabilityEffectivenessRule(pattern: DiagnosticCapabilityPolicyImpactPattern) {
  const effectiveness = pattern.effectiveness;
  if (!effectiveness) return [];
  if (effectiveness.status === "insufficient_data") {
    return [
      `Capability impact effectiveness: ${pattern.area} has insufficient before/after run report data (${effectiveness.beforeRuns} before, ${effectiveness.afterRuns} after).`
    ];
  }

  const metrics = [
    effectiveness.qualityScoreDelta !== undefined
      ? `qualityScore ${signedFixed(effectiveness.qualityScoreDelta)}`
      : undefined,
    effectiveness.toolPriorityMissedCountDelta !== undefined
      ? `toolPriorityMissedCount ${signedFixed(effectiveness.toolPriorityMissedCountDelta)}`
      : undefined,
    effectiveness.verificationPassRateDelta !== undefined
      ? `verificationPassRate ${signedFixed(effectiveness.verificationPassRateDelta)}`
      : undefined,
    effectiveness.repairAttemptCountDelta !== undefined
      ? `repairAttemptCount ${signedFixed(effectiveness.repairAttemptCountDelta)}`
      : undefined
  ].filter((value): value is string => Boolean(value));

  return [
    `Capability impact effectiveness: ${pattern.area} ${effectiveness.status} across ${effectiveness.afterRuns} post-impact run(s): ${metrics.join(", ")}.`
  ];
}

function capabilityPolicyImpactPriorityTools(pattern: DiagnosticCapabilityPolicyImpactPattern) {
  if (pattern.area === "tool-selection-policy") return ["read", "search", "code_symbols", "diagnostics"];
  if (pattern.area === "verify-repair-loop") return ["read", "search", "diagnostics"];
  if (pattern.area === "context-continuity") return ["list", "read", "search"];
  if (pattern.area === "runtime-observability") return ["diagnostics", "read", "search"];
  if (pattern.area === "self-execution-loop") return ["todo", "read", "search", "diagnostics"];
  return ["read", "search"];
}

function requiredBeforePolicy(input: {
  cautionTools: string[];
  repairStopReasons: DiagnosticRepairStopPattern[];
  handoffBottlenecks: DiagnosticHandoffBottleneckPattern[];
}) {
  const requiredBefore: Record<string, string[]> = {};
  if (input.cautionTools.includes("read")) requiredBefore.read = ["list"];
  if (input.repairStopReasons.length > 0) {
    requiredBefore.edit = ["read"];
    requiredBefore.write = ["read"];
    requiredBefore.patch = ["read"];
  }
  if (input.handoffBottlenecks.length > 0) {
    requiredBefore.task_handoff = ["agent_task"];
  }
  return requiredBefore;
}

function recoveryActions(input: {
  topFailedTools: DiagnosticFailedToolPattern[];
  repairStopReasons: DiagnosticRepairStopPattern[];
  handoffBottlenecks: DiagnosticHandoffBottleneckPattern[];
  toolRecoveryPatterns?: DiagnosticToolRecoveryPattern[];
  toolChoicePatterns?: DiagnosticToolChoicePattern[];
  capabilityPolicyImpacts?: DiagnosticCapabilityPolicyImpactPattern[];
}) {
  return uniqueInOrder([
    ...(input.topFailedTools.length > 0 ? ["inspect_failed_tool_inputs"] : []),
    ...((input.toolRecoveryPatterns ?? []).some((pattern) => pattern.unrecoveredCount > 0)
      ? ["resolve_tool_recovery_hints"]
      : []),
    ...((input.toolChoicePatterns ?? []).length > 0 ? ["strengthen_tool_choice_order"] : []),
    ...((input.capabilityPolicyImpacts ?? []).length > 0 ? ["apply_completed_capability_policy_impact"] : []),
    ...(input.repairStopReasons.length > 0 ? ["review_repair_evidence"] : []),
    ...(input.handoffBottlenecks.length > 0 ? ["recover_existing_handoff"] : []),
    ...(input.toolChoicePatterns?.some((pattern) => pattern.missedTool === "shell") ? ["prefer_structured_tools_before_shell"] : []),
    ...(input.capabilityPolicyImpacts?.some((pattern) => pattern.area === "tool-selection-policy") ? ["prioritize_structured_tools_before_generic_answers"] : [])
  ]);
}

function mergeRequiredBefore(
  base: Record<string, string[]> | undefined,
  adaptive: Record<string, string[]>
) {
  const merged: Record<string, string[]> = {};
  for (const [tool, required] of Object.entries(base ?? {})) {
    merged[tool] = uniqueInOrder(required);
  }
  for (const [tool, required] of Object.entries(adaptive)) {
    merged[tool] = uniqueInOrder([...(merged[tool] ?? []), ...required]);
  }
  return merged;
}

export function buildAdaptiveExecutionPolicy(patterns: DiagnosticFailurePatterns): AdaptiveExecutionPolicy {
  const topFailedTools = patterns.topFailedTools.slice(0, 3);
  const repairStopReasons = patterns.repairStopReasons.slice(0, 3);
  const handoffBottlenecks = patterns.handoffBottlenecks.slice(0, 3);
  const toolRecoveryPatterns = (patterns.toolRecoveryPatterns ?? []).slice(0, 3);
  const toolChoicePatterns = (patterns.toolChoicePatterns ?? []).slice(0, 3);
  const capabilityPolicyImpacts = (patterns.capabilityPolicyImpacts ?? []).slice(0, 3);

  const rules = [
    ...topFailedTools.flatMap((tool) => [toolRecoveryRule(tool), toolFollowupRule(tool)]),
    ...toolRecoveryPatterns.flatMap(toolRecoveryPatternRules),
    ...toolChoicePatterns.flatMap(toolChoicePatternRules),
    ...capabilityPolicyImpacts.flatMap(capabilityPolicyImpactRules),
    ...capabilityPolicyImpacts.flatMap(capabilityEffectivenessRule),
    ...repairStopReasons.flatMap(repairRules),
    ...handoffBottlenecks.flatMap(handoffRules)
  ];
  const cautionTools = uniqueInOrder([
    ...topFailedTools.map((tool) => tool.name),
    ...toolRecoveryPatterns
      .filter((pattern) => pattern.unrecoveredCount > 0)
      .flatMap((pattern) => pattern.tools),
    ...toolChoicePatterns.map((pattern) => pattern.missedTool)
  ]);
  const repairCommands = uniqueInOrder(repairStopReasons.flatMap((reason) => reason.failedCommands));
  const handoffIds = uniqueInOrder(handoffBottlenecks.map((handoff) => handoff.handoffId));
  const priorityTools = uniqueInOrder([
    ...(cautionTools.includes("shell") ? shellRecoveryTools : []),
    ...(toolRecoveryPatterns.length > 0 ? ["diagnostics", "search", "read"] : []),
    ...toolChoicePatterns.flatMap((pattern) => pattern.priorityTools),
    ...capabilityPolicyImpacts.flatMap(capabilityPolicyImpactPriorityTools),
    ...(repairStopReasons.length > 0 ? ["read", "search", "diagnostics"] : []),
    ...(handoffBottlenecks.length > 0 ? ["agent_task"] : [])
  ]);
  const requiredBefore = requiredBeforePolicy({ cautionTools, repairStopReasons, handoffBottlenecks });
  const active = rules.length > 0;

  return {
    active,
    rules,
    priorityTools,
    cautionTools,
    repairCommands,
    handoffIds,
    requiredBefore,
    recoveryActions: recoveryActions({
      topFailedTools,
      repairStopReasons,
      handoffBottlenecks,
      toolRecoveryPatterns,
      toolChoicePatterns,
      capabilityPolicyImpacts
    }),
    longRunningStrategy: {
      mode: handoffBottlenecks.length > 0 ? "recover-existing-handoff" : "handoff-first",
      priorityTools: ["todo", "agent_task", "task_handoff"],
      stopConditions: ["blocked_handoff", "repeated_repair_stop", "unchanged_failure_signature"]
    },
    toolStrategy: {
      preferredTools: priorityTools,
      cautionTools,
      avoidDuplicateTools: handoffBottlenecks.length > 0 ? ["task_handoff"] : []
    },
    contextStrategy: {
      injectionOrder: ["ide", "workspace_context", "background_task", "operational_failure", "skill", "memory"],
      memoryUse: "search-before-answering-preference-or-project-history",
      staleContextPolicy: "treat operational failures as hints, not facts"
    },
    subagentStrategy: {
      recommendedAgents: ["researcher", "implementer", "verifier"],
      routeWhen: ["broad_project_sweep", "parallel_research", "verification_repair"]
    },
    providerStrategy: {
      retry: "use-configured-providerRetries",
      fallback: "use-configured-providerFallbacks",
      escalationSignals: ["provider_retry", "provider_fallback", "context_recovery"]
    },
    externalStrategy: {
      statusFields: [
        "diagnostics.failurePatterns",
        "diagnostics.adaptivePolicy",
        "tasks",
        "traces",
        "observability"
      ],
      channelGuidance: "surface policy, traceId, task state, and next recovery action to external clients"
    },
    detail: active
      ? [
        cautionTools.length > 0 ? `cautionTools=${cautionTools.join(",")}` : "",
        toolRecoveryPatterns.length > 0 ? `toolRecovery=${toolRecoveryPatterns.map((pattern) => pattern.kind).join(",")}` : "",
        toolChoicePatterns.length > 0 ? `toolChoice=${toolChoicePatterns.map((pattern) => `${pattern.priorityReason}:${pattern.missedTool}`).join(",")}` : "",
        capabilityPolicyImpacts.length > 0 ? `capabilityImpact=${capabilityPolicyImpacts.map((pattern) => pattern.area).join(",")}` : "",
        capabilityPolicyImpacts.some((pattern) => pattern.effectiveness)
          ? `capabilityEffect=${capabilityPolicyImpacts
            .filter((pattern) => pattern.effectiveness)
            .map((pattern) => `${pattern.area}:${pattern.effectiveness?.status}`)
            .join(",")}`
          : "",
        repairCommands.length > 0 ? `repairCommands=${repairCommands.join(",")}` : "",
        handoffIds.length > 0 ? `handoffIds=${handoffIds.join(",")}` : ""
      ].filter(Boolean).join("; ")
      : "no adaptive execution policy"
  };
}

export function mergeAdaptiveToolExecutionPolicy(
  base: ToolExecutionPolicy | undefined,
  adaptive: AdaptiveExecutionPolicy | undefined
): ToolExecutionPolicy | undefined {
  if (!adaptive?.active) return base;
  const basePolicy = base?.snapshotOnly ? undefined : base;
  return {
    ...(basePolicy ?? {}),
    name: basePolicy?.name ? `${basePolicy.name}+adaptive` : "adaptive",
    priorityTools: uniqueInOrder([...(basePolicy?.priorityTools ?? []), ...adaptive.priorityTools]),
    requiredBefore: mergeRequiredBefore(basePolicy?.requiredBefore, adaptive.requiredBefore),
    ...(basePolicy?.handoffPriority ? { handoffPriority: basePolicy.handoffPriority } : {})
  };
}

export function adaptiveExecutionPolicySystemLines(policy: AdaptiveExecutionPolicy) {
  if (!policy.active) return [];
  return [
    "",
    "Adaptive execution policy:",
    ...policy.rules.map((rule) => `- ${rule}`)
  ];
}
