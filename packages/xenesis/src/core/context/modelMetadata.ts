export interface ModelContextLimits {
  contextWindow: number;
  maxOutputTokens: number;
}

const RESERVE_TOKENS = 16_384;
const DEFAULT_LIMITS: ModelContextLimits = {
  contextWindow: 200_000,
  maxOutputTokens: 8_192,
};

const PREFIX_LIMITS: Array<{ prefix: string; limits: ModelContextLimits }> = [
  { prefix: "claude-opus-4", limits: { contextWindow: 1_000_000, maxOutputTokens: 128_000 } },
  { prefix: "claude-fable-5", limits: { contextWindow: 1_000_000, maxOutputTokens: 128_000 } },
  { prefix: "claude-mythos-5", limits: { contextWindow: 1_000_000, maxOutputTokens: 128_000 } },
  { prefix: "claude-sonnet-4", limits: { contextWindow: 1_000_000, maxOutputTokens: 64_000 } },
  { prefix: "claude-haiku-4-5", limits: { contextWindow: 200_000, maxOutputTokens: 64_000 } },
];

export function modelContextWindow(modelId: string): ModelContextLimits {
  const id = (modelId ?? "").toLowerCase();
  for (const entry of PREFIX_LIMITS) {
    if (id.startsWith(entry.prefix)) return entry.limits;
  }
  return DEFAULT_LIMITS;
}

export function computeContextTokenBudget(input: {
  modelId: string;
  reserveTokens?: number;
  scaffoldTokens?: number;
}): number {
  const limits = modelContextWindow(input.modelId);
  const reserve = input.reserveTokens ?? RESERVE_TOKENS;
  const scaffold = input.scaffoldTokens ?? 0;
  return Math.max(0, limits.contextWindow - limits.maxOutputTokens - reserve - scaffold);
}
