import { computeMemoryTransitions, type TierAThresholds } from "./curator/tierA.js";
import type { TierBAction, TierBPlan } from "./curator/tierB.js";
import type { MemoryLedger } from "./MemoryLedger.js";
import {
  createMemoryLedgerEventId,
  createMemoryProposalId,
  defaultMemoryWriteContext,
  normalizeMemoryInput
} from "./memoryDefaults.js";
import { classifyMemoryWrite } from "./memoryPolicy.js";
import type {
  MemoryLedgerEvent,
  MemoryProposalOperation,
  MemoryWriteContext,
  MemoryWriteDecision
} from "./memoryTypes.js";
import type { MemoryInput, MemoryRecord } from "./types.js";

export interface MemoryPriorityDecayOptions {
  enabled: boolean;
  amount?: number;
  minimumPriority?: number;
}

export interface MemoryConsolidationTierAOptions {
  thresholds?: TierAThresholds;
  priorityDecay?: MemoryPriorityDecayOptions;
}

export interface MemoryConsolidationDryRunInput {
  ledger: MemoryLedger;
  at?: string;
  tierA?: MemoryConsolidationTierAOptions;
  tierBPlan?: TierBPlan;
  context?: Partial<MemoryWriteContext>;
}

export interface MemoryConsolidationDryRunResult {
  kind: "memory-consolidation-dry-run";
  at: string;
  events: MemoryLedgerEvent[];
  proposals: MemoryConsolidationProposalPreview[];
  tierBPlan?: TierBPlan;
}

export interface MemoryConsolidationProposalPreview {
  id: string;
  status: "preview";
  operation: MemoryProposalOperation;
  input: MemoryInput;
  decision: MemoryWriteDecision;
  context: MemoryWriteContext;
  createdAt: string;
  updatedAt: string;
  reason?: string;
}

export interface MemoryAccessEventPreviewOptions {
  allowReadMutation: boolean;
  actor?: MemoryWriteContext["actor"];
  reason?: string;
}

function contextAt(at: string, overrides: Partial<MemoryWriteContext> = {}): MemoryWriteContext {
  return defaultMemoryWriteContext({
    sourceKind: "agent",
    trust: "unknown",
    externalTaint: false,
    actor: "agent",
    runtime: "memory-consolidation",
    intent: "propose",
    now: () => new Date(at),
    ...overrides
  });
}

function eventPreview(
  input: Omit<MemoryLedgerEvent, "id" | "createdAt"> & { createdAt?: string },
  at: string,
): MemoryLedgerEvent {
  return {
    id: createMemoryLedgerEventId(),
    createdAt: input.createdAt ?? at,
    ...input
  };
}

function buildTransitionEvent(record: MemoryRecord, at: string, transition: { from: string; to: string; reason?: string }): MemoryLedgerEvent {
  if (transition.to === "archived") {
    return eventPreview({
      type: "memory_archived",
      targetType: "memory",
      targetId: record.id,
      memoryId: record.id,
      actor: "system",
      reason: transition.reason ?? "tier-a archive recommendation",
      metadata: {
        before: { status: transition.from },
        after: { status: "archived", archivedAt: at }
      }
    }, at);
  }
  return eventPreview({
    type: "memory_updated",
    targetType: "memory",
    targetId: record.id,
    memoryId: record.id,
    actor: "system",
    reason: transition.reason ?? `tier-a lifecycle transition: ${transition.from} -> ${transition.to}`,
    metadata: {
      before: { status: transition.from },
      after: { status: transition.to }
    }
  }, at);
}

function buildPriorityDecayEvents(
  records: MemoryRecord[],
  at: string,
  options: MemoryPriorityDecayOptions | undefined,
  staleTransitionIds: ReadonlySet<string> = new Set(),
): MemoryLedgerEvent[] {
  if (!options?.enabled) return [];
  const amount = Math.max(1, options.amount ?? 1);
  const minimum = options.minimumPriority ?? 0;
  return records
    .filter((record) => (record.status ?? "active") === "stale" || staleTransitionIds.has(record.id))
    .filter((record) => (record.priority ?? 0) > minimum)
    .map((record) => {
      const beforePriority = record.priority ?? 0;
      const afterPriority = Math.max(minimum, beforePriority - amount);
      return eventPreview({
        type: "memory_updated",
        targetType: "memory",
        targetId: record.id,
        memoryId: record.id,
        actor: "system",
        reason: "tier-a priority decay recommendation",
        metadata: {
          before: { priority: beforePriority },
          after: { priority: afterPriority }
        }
      }, at);
    });
}

export function buildMemoryAccessEventPreview(
  record: MemoryRecord,
  at: string,
  options: MemoryAccessEventPreviewOptions,
): MemoryLedgerEvent | undefined {
  if (!options.allowReadMutation) return undefined;
  return eventPreview({
    type: "memory_accessed",
    targetType: "memory",
    targetId: record.id,
    memoryId: record.id,
    actor: options.actor ?? "system",
    reason: options.reason ?? "read path access timestamp update",
    metadata: {
      before: { lastAccessedAt: record.lastAccessedAt },
      after: { lastAccessedAt: at }
    }
  }, at);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function proposalOperation(action: TierBAction): MemoryProposalOperation {
  if (action.op === "demote") return "demote";
  return "merge";
}

function tierBProposalInput(action: TierBAction, recordsById: ReadonlyMap<string, MemoryRecord>): MemoryInput {
  if (action.op === "create_umbrella") {
    return normalizeMemoryInput({
      id: action.id,
      text: action.text,
      tags: ["consolidation", "tier-b", "umbrella"],
      source: "tier-b"
    });
  }
  if (action.op === "merge") {
    const existing = recordsById.get(action.into);
    return normalizeMemoryInput({
      id: action.into,
      text: action.umbrellaText ?? existing?.text ?? `Consolidate memory rows into ${action.into}`,
      tags: unique(["consolidation", "tier-b", "merge", ...(existing?.tags ?? [])]),
      source: "tier-b"
    });
  }
  const existing = recordsById.get(action.id);
  return normalizeMemoryInput({
    id: `consolidate-demote-${action.id}`,
    text: `Demote obsolete memory ${action.id} into ${action.into}`,
    tags: unique(["consolidation", "tier-b", "obsolete", ...(existing?.tags ?? [])]),
    source: "tier-b",
    noEvidenceReason: "tier-b consolidation dry-run proposal"
  });
}

function forceProposalDecision(decision: MemoryWriteDecision): MemoryWriteDecision {
  return {
    ...decision,
    action: "propose",
    requiresApproval: true
  };
}

export function buildTierBProposalPreviews(input: {
  plan: TierBPlan;
  records: MemoryRecord[];
  at: string;
  context?: Partial<MemoryWriteContext>;
}): MemoryConsolidationProposalPreview[] {
  const recordsById = new Map(input.records.map((record) => [record.id, record]));
  const context = contextAt(input.at, input.context);
  return input.plan.actions.map((action) => {
    const proposalInput = tierBProposalInput(action, recordsById);
    const decision = forceProposalDecision(classifyMemoryWrite(proposalInput, context));
    return {
      id: createMemoryProposalId(),
      status: "preview",
      operation: proposalOperation(action),
      input: proposalInput,
      decision,
      context,
      createdAt: input.at,
      updatedAt: input.at,
      reason: action.reason ?? "tier-b consolidation suggestion"
    };
  });
}

export async function runMemoryConsolidationDryRun(
  input: MemoryConsolidationDryRunInput,
): Promise<MemoryConsolidationDryRunResult> {
  const at = input.at ?? new Date().toISOString();
  const records = await input.ledger.listRecords({
    includeArchived: true,
    includeHistorical: true,
    at
  });
  const transitions = computeMemoryTransitions(records, new Date(at), input.tierA?.thresholds);
  const transitionEvents = transitions.flatMap((transition) => {
    const record = records.find((candidate) => candidate.id === transition.id);
    return record ? [buildTransitionEvent(record, at, transition)] : [];
  });
  const staleTransitionIds = new Set(transitions.filter((transition) => transition.to === "stale").map((transition) => transition.id));
  const priorityEvents = buildPriorityDecayEvents(records, at, input.tierA?.priorityDecay, staleTransitionIds);
  const proposals = input.tierBPlan
    ? buildTierBProposalPreviews({
      plan: input.tierBPlan,
      records,
      at,
      context: input.context
    })
    : [];

  return {
    kind: "memory-consolidation-dry-run",
    at,
    events: [...transitionEvents, ...priorityEvents],
    proposals,
    ...(input.tierBPlan ? { tierBPlan: input.tierBPlan } : {})
  };
}
