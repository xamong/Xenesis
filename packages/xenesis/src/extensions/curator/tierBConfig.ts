// src/extensions/curator/tierBConfig.ts
// P5c: Curator Tier-B (LLM umbrella consolidation) config defaults + resolver.
//
// AUTONOMOUS-RISK. Two independent safety inversions baked into resolution:
//   - `enabled` is true ONLY when explicitly set true (default OFF — mirrors commitments/config.ts).
//   - `dryRun` is false ONLY when explicitly set false (default DRY-RUN ON). Absence / garbage ⇒
//     dry-run. This guarantees a misconfiguration can never silently mutate the memory library.
//
// Mirrors src/orchestration/commitments/config.ts (positiveInt helper, partial-tolerant resolver).
import type { CuratorTierBConfig, ProviderName, XenesisConfig } from "../../config/types.js";

export const DEFAULT_CURATOR_TIERB_INTERVAL_HOURS = 168; // 7 days, mirrors Hermes curator cadence
export const DEFAULT_CURATOR_TIERB_TIMEOUT_SECONDS = 60;
export const DEFAULT_CURATOR_TIERB_MIN_CLUSTER_SIZE = 2;
export const DEFAULT_CURATOR_TIERB_MAX_CLUSTERS = 25; // Hermes "expect 10-25 clusters"

// FIX #2 (aux-model enforcement): Tier-B must NEVER run on the main agent model (cost + isolation).
// When provider/model are unset, resolve a CONCRETE cheap/aux model. A haiku-class id is the cheap
// default; it is intentionally DISTINCT from the typical main agent model (e.g. an Opus/GPT class).
// The resolver always yields a non-empty auxProvider/auxModel so the runtime can assert it before
// calling the model — a misconfiguration can never silently route Tier-B through the main loop.
export const DEFAULT_CURATOR_TIERB_AUX_PROVIDER: ProviderName = "anthropic";
export const DEFAULT_CURATOR_TIERB_AUX_MODEL = "claude-haiku-4-5";

/** Conservative, OPT-IN defaults: enabled OFF + dryRun ON. */
export const DEFAULT_CURATOR_TIERB_CONFIG: CuratorTierBConfig = {
  enabled: false,
  dryRun: true,
  intervalHours: DEFAULT_CURATOR_TIERB_INTERVAL_HOURS,
  timeoutSeconds: DEFAULT_CURATOR_TIERB_TIMEOUT_SECONDS,
  minClusterSize: DEFAULT_CURATOR_TIERB_MIN_CLUSTER_SIZE,
  maxClusters: DEFAULT_CURATOR_TIERB_MAX_CLUSTERS,
};

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

export interface ResolvedCuratorTierBConfig {
  enabled: boolean;
  dryRun: boolean;
  /**
   * FIX #2: the CONCRETE aux model Tier-B runs on. NON-optional — always resolved (config override
   * or the cheap haiku-class default). The runtime passes these explicitly to runModel and asserts
   * auxModel is non-empty, so Tier-B can never silently fall back to the main agent model.
   */
  auxProvider: ProviderName;
  auxModel: string;
  intervalHours: number;
  timeoutSeconds: number;
  minClusterSize: number;
  maxClusters: number;
}

/**
 * Resolves Tier-B config with safety-first defaults. Accepts a partial config (tolerant of test
 * fixtures / older config files).
 *
 *  - `enabled` true ONLY when explicitly true.
 *  - `dryRun` false ONLY when explicitly false (so absence/garbage ⇒ dry-run, the safe state).
 */
export function resolveCuratorTierBConfig(
  cfg?: { curator?: { tierB?: Partial<CuratorTierBConfig> } } | Pick<XenesisConfig, "curator">,
): ResolvedCuratorTierBConfig {
  const raw = cfg?.curator?.tierB;
  return {
    enabled: raw?.enabled === true,
    // SAFETY INVERSION: dry-run unless the caller EXPLICITLY opts into a live run.
    dryRun: raw?.dryRun !== false,
    // FIX #2: resolve a CONCRETE aux provider/model; cheap haiku-class default when unset.
    auxProvider: raw?.provider ?? DEFAULT_CURATOR_TIERB_AUX_PROVIDER,
    auxModel: raw?.model?.trim() ? raw.model.trim() : DEFAULT_CURATOR_TIERB_AUX_MODEL,
    intervalHours: positiveInt(raw?.intervalHours, DEFAULT_CURATOR_TIERB_INTERVAL_HOURS),
    timeoutSeconds: positiveInt(raw?.timeoutSeconds, DEFAULT_CURATOR_TIERB_TIMEOUT_SECONDS),
    minClusterSize: positiveInt(raw?.minClusterSize, DEFAULT_CURATOR_TIERB_MIN_CLUSTER_SIZE),
    maxClusters: positiveInt(raw?.maxClusters, DEFAULT_CURATOR_TIERB_MAX_CLUSTERS),
  };
}
