/**
 * P6 (e): Commitments runtime config defaults + resolver.
 *
 * OPT-IN, default OFF. When disabled (the default), no turns are enqueued, no extraction
 * runs, and no commitment tasks are created. The extractor runs on an AUX/cheap model with
 * tools DISABLED. The `care` confidence floor is deliberately HIGHER than the routine floor.
 *
 * Ported/adapted from OpenClaw `src/commitments/config.ts` (no heartbeat coupling here).
 */
import type {
  CommitmentsConfig,
  CommitmentsExtractionConfig,
  XenesisConfig,
} from "../../config/types.js";

export const DEFAULT_COMMITMENT_EXTRACTION_DEBOUNCE_MS = 15_000;
export const DEFAULT_COMMITMENT_BATCH_MAX_ITEMS = 8;
export const DEFAULT_COMMITMENT_EXTRACTION_QUEUE_MAX_ITEMS = 64;
export const DEFAULT_COMMITMENT_CONFIDENCE_THRESHOLD = 0.72;
/** Higher floor for care_check_in / care-sensitivity — gentle, rare, high-confidence only. */
export const DEFAULT_COMMITMENT_CARE_CONFIDENCE_THRESHOLD = 0.86;
export const DEFAULT_COMMITMENT_EXTRACTION_TIMEOUT_SECONDS = 45;
export const DEFAULT_COMMITMENT_MAX_PER_DAY = 3;
export const DEFAULT_COMMITMENT_EXPIRE_AFTER_HOURS = 72;
export const DEFAULT_COMMITMENT_MAX_PER_SURFACE = 3;

export const DEFAULT_COMMITMENTS_EXTRACTION_CONFIG: CommitmentsExtractionConfig = {
  debounceMs: DEFAULT_COMMITMENT_EXTRACTION_DEBOUNCE_MS,
  batchMaxItems: DEFAULT_COMMITMENT_BATCH_MAX_ITEMS,
  queueMaxItems: DEFAULT_COMMITMENT_EXTRACTION_QUEUE_MAX_ITEMS,
  confidenceThreshold: DEFAULT_COMMITMENT_CONFIDENCE_THRESHOLD,
  careConfidenceThreshold: DEFAULT_COMMITMENT_CARE_CONFIDENCE_THRESHOLD,
  timeoutSeconds: DEFAULT_COMMITMENT_EXTRACTION_TIMEOUT_SECONDS,
};

/** Conservative, OPT-IN defaults: the whole subsystem is OFF unless enabled is set true. */
export const DEFAULT_COMMITMENTS_CONFIG: CommitmentsConfig = {
  enabled: false,
  maxPerDay: DEFAULT_COMMITMENT_MAX_PER_DAY,
  expireAfterHours: DEFAULT_COMMITMENT_EXPIRE_AFTER_HOURS,
  extraction: { ...DEFAULT_COMMITMENTS_EXTRACTION_CONFIG },
};

function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function confidence(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 1
    ? value
    : fallback;
}

export interface ResolvedCommitmentsConfig {
  enabled: boolean;
  maxPerDay: number;
  expireAfterHours: number;
  extraction: {
    provider?: string;
    model?: string;
    debounceMs: number;
    batchMaxItems: number;
    queueMaxItems: number;
    confidenceThreshold: number;
    careConfidenceThreshold: number;
    timeoutSeconds: number;
  };
}

/**
 * Resolves commitment extraction config with conservative defaults. Accepts a partial config
 * (tolerant of test fixtures / older config files); `enabled` is true ONLY when explicitly set.
 */
export function resolveCommitmentsConfig(
  cfg?: Pick<XenesisConfig, "commitments"> | { commitments?: Partial<CommitmentsConfig> },
): ResolvedCommitmentsConfig {
  const raw = cfg?.commitments;
  const extraction = raw?.extraction;
  return {
    enabled: raw?.enabled === true,
    maxPerDay: positiveInt(raw?.maxPerDay, DEFAULT_COMMITMENT_MAX_PER_DAY),
    expireAfterHours: positiveInt(raw?.expireAfterHours, DEFAULT_COMMITMENT_EXPIRE_AFTER_HOURS),
    extraction: {
      ...(extraction?.provider ? { provider: extraction.provider } : {}),
      ...(extraction?.model ? { model: extraction.model } : {}),
      debounceMs: positiveInt(extraction?.debounceMs, DEFAULT_COMMITMENT_EXTRACTION_DEBOUNCE_MS),
      batchMaxItems: positiveInt(extraction?.batchMaxItems, DEFAULT_COMMITMENT_BATCH_MAX_ITEMS),
      queueMaxItems: positiveInt(
        extraction?.queueMaxItems,
        DEFAULT_COMMITMENT_EXTRACTION_QUEUE_MAX_ITEMS,
      ),
      confidenceThreshold: confidence(
        extraction?.confidenceThreshold,
        DEFAULT_COMMITMENT_CONFIDENCE_THRESHOLD,
      ),
      careConfidenceThreshold: confidence(
        extraction?.careConfidenceThreshold,
        DEFAULT_COMMITMENT_CARE_CONFIDENCE_THRESHOLD,
      ),
      timeoutSeconds: positiveInt(
        extraction?.timeoutSeconds,
        DEFAULT_COMMITMENT_EXTRACTION_TIMEOUT_SECONDS,
      ),
    },
  };
}

/** Resolves the timezone used when interpreting inferred commitment dates. */
export function resolveCommitmentTimezone(timezone?: string): string {
  const trimmed = timezone?.trim();
  if (trimmed) return trimmed;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
