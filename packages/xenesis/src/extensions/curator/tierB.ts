// src/extensions/curator/tierB.ts
// P5c: Curator Tier-B — LLM umbrella consolidation (AUTONOMOUS-RISK).
//
// Tier-B does NOT recompute lifecycle (that is Tier-A's pure GC). It clusters related memory rows,
// asks an AUX/cheap model (TOOLS DISABLED) to propose an umbrella-consolidation PLAN, and — only
// under two independent safety locks — applies that plan by merging/demoting narrow siblings into
// umbrellas and ARCHIVING (never deleting) the absorbed originals.
//
// HARD SAFETY CONSTRAINTS (mirror Hermes agent/curator.py):
//   1. default DRY-RUN ON + enabled default-OFF  (tierBConfig.ts resolver inversions).
//   2. NEVER mutate without explicit approval     (run({approved}) gate below + store apply).
//   3. archive-NEVER-delete                        (SqliteMemoryStore.applyTierBConsolidation).
//   4. pin-protect                                 (excluded at clustering + re-checked at apply).
//   5. AUX model, TOOLS DISABLED, out of loop      (CuratorModelRunner contract; scheduler wiring).
//   6. first-run deferral                          (run() reads/seeds tierB.lastRunAt).
//
// The pure exports (cluster / buildPrompt / parse) have NO I/O and are unit-tested directly.
import type { MemoryRecord } from "../types.js";
import {
  resolveCuratorTierBConfig,
  type ResolvedCuratorTierBConfig,
} from "./tierBConfig.js";

// ── Plan shape ───────────────────────────────────────────────────────────────

export type TierBOp = "merge" | "create_umbrella" | "demote";

export interface TierBMergeAction {
  op: "merge";
  /** Existing umbrella id that absorbs the `from` rows. */
  into: string;
  from: string[];
  umbrellaText?: string;
  reason?: string;
}
export interface TierBCreateUmbrellaAction {
  op: "create_umbrella";
  id: string;
  text: string;
  from: string[];
  reason?: string;
}
export interface TierBDemoteAction {
  op: "demote";
  id: string;
  into: string;
  reason?: string;
}
export type TierBAction = TierBMergeAction | TierBCreateUmbrellaAction | TierBDemoteAction;

export interface TierBPlan {
  actions: TierBAction[];
}

export interface MemoryCluster {
  domain: string;
  members: MemoryRecord[];
}

// ── 1. Clustering (pure) ─────────────────────────────────────────────────────

export interface ClusterOptions {
  minClusterSize?: number;
  maxClusters?: number;
}

/** Normalize `-`↔`_` and lowercase (mirrors Hermes _needle_in_path_component). */
function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[-_]+/g, "-");
}

/** Derive a domain key: first tag, else id-prefix before :/-/_, else first significant word. */
function domainKey(record: MemoryRecord): string | undefined {
  const firstTag = record.tags.find((t) => t.trim().length > 0);
  if (firstTag) return normalizeKey(firstTag);
  const idPrefix = record.id.split(/[:/_-]/, 1)[0]?.trim();
  if (idPrefix && idPrefix !== record.id) return normalizeKey(idPrefix);
  const firstWord = (record.text ?? "").trim().split(/\s+/)[0];
  if (firstWord) return normalizeKey(firstWord);
  return undefined;
}

/**
 * Groups memory rows into domain clusters for review. PURE — no I/O.
 *  - excludes PINNED rows entirely (pin-protect: they can never be a merge source/target),
 *  - excludes already-archived rows,
 *  - drops singleton/under-`minClusterSize` groups,
 *  - sorts clusters by size desc, takes at most `maxClusters` (cost bound).
 */
export function clusterByDomain(
  records: MemoryRecord[],
  opts: ClusterOptions = {},
): MemoryCluster[] {
  const minClusterSize = opts.minClusterSize ?? 2;
  const maxClusters = opts.maxClusters ?? 25;
  const groups = new Map<string, MemoryRecord[]>();
  for (const record of records) {
    if (record.pinned) continue; // pin-protect
    if ((record.status ?? "active") === "archived") continue;
    const key = domainKey(record);
    if (!key) continue;
    const bucket = groups.get(key);
    if (bucket) bucket.push(record);
    else groups.set(key, [record]);
  }
  const clusters: MemoryCluster[] = [];
  for (const [domain, members] of groups) {
    if (members.length < minClusterSize) continue;
    clusters.push({ domain, members });
  }
  clusters.sort((a, b) => b.members.length - a.members.length || a.domain.localeCompare(b.domain));
  return clusters.slice(0, Math.max(0, maxClusters));
}

// ── 2. Prompt build (pure) ───────────────────────────────────────────────────

const DRY_RUN_BANNER = [
  "=== DRY-RUN PREVIEW ===",
  "This is a PREVIEW. Describe what you WOULD do; the PLAN is the deliverable.",
  "You have NO tools and CANNOT mutate anything. A human reviewer approves any live run.",
  "=======================",
  "",
].join("\n");

/**
 * Builds the Tier-B consolidation prompt. Re-authored from Hermes CURATOR_REVIEW_PROMPT for memory
 * ROWS + structured-only output (no tool calls; a machine must parse the result).
 *
 * Hard rules embedded: never delete (archive is the max destructive action), never touch pinned
 * (already excluded — restated), judge on CONTENT not counters, prefer no action over weak merges.
 */
export function buildTierBConsolidationPrompt(params: {
  clusters: MemoryCluster[];
  dryRun: boolean;
}): string {
  const clusters = params.clusters.map((cluster) => ({
    domain: cluster.domain,
    members: cluster.members.map((m) => ({
      id: m.id,
      text: m.text,
      tags: m.tags,
      ...(m.priority !== undefined ? { priority: m.priority } : {}),
    })),
  }));
  const banner = params.dryRun ? DRY_RUN_BANNER : "";
  return `${banner}You are Xenesis's internal memory curator (Tier-B). This is a hidden background consolidation run. Do not address the user.

Each cluster below is a group of memory rows sharing a domain. For EACH cluster ask: would a careful maintainer keep N separate narrow rows, or write ONE umbrella row with N labeled subsections that says the same thing more clearly? Consolidate ONLY when the umbrella is genuinely clearer; prefer NO action over a weak merge.

Hard rules:
- NEVER delete. The most destructive action you may propose is archiving an absorbed row (the host does this for you).
- NEVER touch pinned rows. (Pinned rows are already excluded from the clusters below.)
- Judge on CONTENT, not on counters, recency, or row count.
- The output is a STRUCTURED PLAN ONLY. You have no tools; you cannot mutate anything.

Output JSON only, with a top-level {"actions":[...]}. Each action is one of:
- {"op":"merge","into":"<existing-umbrella-id>","from":["<id>",...],"umbrellaText":"...","reason":"..."}
- {"op":"create_umbrella","id":"<new-id>","text":"...","from":["<id>",...],"reason":"..."}
- {"op":"demote","id":"<id>","into":"<umbrella-id>","reason":"..."}

Every id in "into"/"from"/"id" must reference a real row id from the clusters (except a create_umbrella's new "id", which must be new). If a cluster needs no change, emit no action for it. Empty {"actions":[]} is a valid, common answer.

Clusters:
${JSON.stringify(clusters, null, 2)}`;
}

// ── 3. Plan parse (pure, tolerant) ───────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const s = asString(item);
    if (s) out.push(s);
  }
  return out;
}

/** Scans for top-level balanced `{...}` JSON objects, ignoring braces inside strings. */
function extractJsonObjectCandidates(raw: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let idx = 0; idx < raw.length; idx += 1) {
    const char = raw[idx] ?? "";
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      if (inString) escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") {
      if (depth === 0) start = idx;
      depth += 1;
      continue;
    }
    if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        out.push(raw.slice(start, idx + 1));
        start = -1;
      }
    }
  }
  return out;
}

function parseAction(raw: unknown): TierBAction | undefined {
  if (!isRecord(raw)) return undefined;
  const op = asString(raw.op);
  if (op === "merge") {
    const into = asString(raw.into);
    const from = asIdArray(raw.from);
    if (!into || from.length === 0) return undefined;
    return {
      op: "merge",
      into,
      from,
      ...(asString(raw.umbrellaText) ? { umbrellaText: asString(raw.umbrellaText)! } : {}),
      ...(asString(raw.reason) ? { reason: asString(raw.reason)! } : {}),
    };
  }
  if (op === "create_umbrella") {
    const id = asString(raw.id);
    const text = asString(raw.text);
    const from = asIdArray(raw.from);
    if (!id || !text || from.length === 0) return undefined;
    return {
      op: "create_umbrella",
      id,
      text,
      from,
      ...(asString(raw.reason) ? { reason: asString(raw.reason)! } : {}),
    };
  }
  if (op === "demote") {
    const id = asString(raw.id);
    const into = asString(raw.into);
    if (!id || !into) return undefined;
    return {
      op: "demote",
      id,
      into,
      ...(asString(raw.reason) ? { reason: asString(raw.reason)! } : {}),
    };
  }
  return undefined;
}

/**
 * Tolerant plan parser: accepts a clean JSON object, or recovers `{...}` fragments from
 * prose/fences. Unknown/malformed actions are DROPPED — never throws.
 */
export function parseTierBPlan(raw: string): TierBPlan {
  const actions: TierBAction[] = [];
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { actions };
  const records: Record<string, unknown>[] = [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (isRecord(parsed)) records.push(parsed);
  } catch {
    for (const fragment of extractJsonObjectCandidates(trimmed)) {
      try {
        const parsed = JSON.parse(fragment) as unknown;
        if (isRecord(parsed)) records.push(parsed);
      } catch {
        // Ignore malformed fragments.
      }
    }
  }
  for (const record of records) {
    const rawActions = Array.isArray(record.actions) ? record.actions : [];
    for (const action of rawActions) {
      const parsed = parseAction(action);
      if (parsed) actions.push(parsed);
    }
  }
  return { actions };
}

// ── 4. Runtime (seam holder + safety gates) ──────────────────────────────────

const CURATOR_TIERB_LAST_RUN_KEY = "tierB.lastRunAt";

/** Runs the Tier-B consolidation prompt on an aux/cheap model with TOOLS DISABLED → raw text. */
export type CuratorModelRunner = (params: {
  prompt: string;
  provider?: string;
  model?: string;
  timeoutMs: number;
}) => Promise<string>;

/** The subset of the memory store Tier-B needs. SqliteMemoryStore satisfies this. */
export interface CuratorTierBStore {
  list(): Promise<MemoryRecord[]>;
  getCuratorState(key: string): string | undefined;
  setCuratorState(key: string, value: string): void;
  // Caveat #1: the apply step REQUIRES an explicit live/approved token to mutate anything.
  applyTierBConsolidation(plan: TierBPlan, now?: Date, options?: { live: boolean }): TierBAppliedAction[];
}

export interface TierBAppliedAction {
  op: TierBOp;
  umbrellaId: string;
  archived: string[];
  skipped: string[];
}

export type TierBRunStatus =
  | "disabled"
  | "deferred-first-run"
  | "not-due"
  | "no-clusters"
  | "dry-run"
  | "awaiting-approval"
  | "applied"
  | "error";

export interface TierBRunResult {
  status: TierBRunStatus;
  actions: TierBAction[];
  plan?: TierBPlan;
  applied?: TierBAppliedAction[];
  error?: string;
}

export interface CuratorTierBRuntimeConfig {
  curator?: { tierB?: Partial<import("../../config/types.js").CuratorTierBConfig> };
}

export interface CuratorTierBRuntimeOptions {
  store: CuratorTierBStore;
  /** Aux/cheap model runner. Tools MUST be disabled by the implementation. */
  runModel: CuratorModelRunner;
  config?: CuratorTierBRuntimeConfig;
  now?: () => Date;
  logger?: (message: string) => void;
}

export interface TierBRunArgs {
  at?: Date;
  /** Second safety lock: a live apply requires approved===true even when dryRun:false. */
  approved?: boolean;
}

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Curator Tier-B runtime. Holds the aux-model seam + store; enforces the safety gates. One instance
 * per process (the wiring layer constructs it with a real model runner + store). Runs OUT of the
 * interactive loop — only the scheduler tick (idle-gated) invokes it.
 */
export class CuratorTierBRuntime {
  constructor(private readonly options: CuratorTierBRuntimeOptions) {}

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  /**
   * Runs one Tier-B pass. Returns a status + (when produced) the plan. NEVER throws.
   *
   * Gates, in order: enabled → first-run deferral → interval → cluster → aux model → parse →
   * dry-run lock → approval lock → apply. dry-run does NOT bump lastRunAt (so the next live run
   * still sees a fresh plan); applied/no-clusters live passes DO bump it.
   */
  async run(args: TierBRunArgs = {}): Promise<TierBRunResult> {
    const at = args.at ?? this.now();
    const cfg = resolveCuratorTierBConfig(this.options.config);

    // (1) default-OFF early return — zero aux calls, zero mutation.
    if (!cfg.enabled) return { status: "disabled", actions: [] };

    // (6) first-run deferral: seed the anchor and no-op on the FIRST observed tick.
    const lastRunRaw = this.options.store.getCuratorState(CURATOR_TIERB_LAST_RUN_KEY);
    if (!lastRunRaw) {
      this.options.store.setCuratorState(CURATOR_TIERB_LAST_RUN_KEY, at.toISOString());
      return { status: "deferred-first-run", actions: [] };
    }
    const lastRunMs = Date.parse(lastRunRaw);
    if (Number.isFinite(lastRunMs) && at.getTime() - lastRunMs < cfg.intervalHours * MS_PER_HOUR) {
      return { status: "not-due", actions: [] };
    }

    try {
      const records = await this.options.store.list();
      const clusters = clusterByDomain(records, {
        minClusterSize: cfg.minClusterSize,
        maxClusters: cfg.maxClusters,
      });
      if (clusters.length === 0) {
        // A real (non-dry, no-work) pass advances the interval so we don't re-cluster every tick.
        if (!cfg.dryRun) this.bumpLastRun(at);
        return { status: "no-clusters", actions: [] };
      }

      // (5) AUX model, tools disabled by the runModel contract. FIX #2: pass the resolved aux
      // provider/model EXPLICITLY and assert the model is non-empty — Tier-B must never run on the
      // main agent model. The resolver always yields a concrete auxModel, so this guards a future
      // regression / a hand-built config object that bypassed the resolver.
      if (!cfg.auxModel || !cfg.auxModel.trim()) {
        return { status: "error", actions: [], error: "curator tier-B: aux model not resolved" };
      }
      const raw = await this.options.runModel({
        prompt: buildTierBConsolidationPrompt({ clusters, dryRun: cfg.dryRun }),
        provider: cfg.auxProvider,
        model: cfg.auxModel,
        timeoutMs: cfg.timeoutSeconds * 1000,
      });
      const plan = parseTierBPlan(raw);

      // (2a) DRY-RUN lock: mutate NOTHING, do NOT bump lastRunAt. The plan IS the deliverable.
      if (cfg.dryRun) return { status: "dry-run", plan, actions: plan.actions };

      // (2b) APPROVAL lock: even with dryRun:false, refuse autonomous apply without explicit OK.
      if (args.approved !== true) {
        return { status: "awaiting-approval", plan, actions: plan.actions };
      }

      // (3)+(4) apply: archive-never-delete + pin-protect re-check live in the store. Caveat #1:
      // pass the explicit { live: true } token — only reached after the dry-run + approval gates.
      const applied = this.options.store.applyTierBConsolidation(plan, at, { live: true });
      this.bumpLastRun(at);
      return { status: "applied", plan, actions: plan.actions, applied };
    } catch (error) {
      this.options.logger?.(`curator tier-B run failed: ${String(error)}`);
      return { status: "error", actions: [], error: String(error) };
    }
  }

  private bumpLastRun(at: Date): void {
    this.options.store.setCuratorState(CURATOR_TIERB_LAST_RUN_KEY, at.toISOString());
  }
}
