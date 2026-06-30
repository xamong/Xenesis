import { ProviderHttpError } from '../providers/providerHttpError.js';

export type ProviderFailureKind =
  | 'rate_limit'
  | 'overloaded'
  | 'timeout'
  | 'context_limit'
  | 'max_output_tokens'
  | 'auth'
  | 'cancelled'
  | 'unknown';

export interface ProviderFailureClassification {
  kind: ProviderFailureKind;
  message: string;
  retryable: boolean;
  fallbackRecommended: boolean;
}

export type ProviderAttemptDecision =
  | { kind: 'retry' }
  | { kind: 'fallback'; toIndex: number }
  | { kind: 'stop' }
  | { kind: 'fail-closed' };

export interface ProviderAttemptDecisionInput {
  failure: ProviderFailureClassification;
  attempt: number;
  maxRetries: number;
  nextProviderIndex: number;
  remainingProviderSupportsTools: readonly boolean[];
  toolsRequired: boolean;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function classifyProviderFailure(error: unknown): ProviderFailureClassification {
  const message = errorMessage(error);
  const normalized = message.toLowerCase();

  if (error instanceof ProviderHttpError) {
    if (error.status === 429)
      return { kind: 'rate_limit', message: error.message, retryable: true, fallbackRecommended: true };
    if (error.status === 529 || error.status === 503)
      return { kind: 'overloaded', message: error.message, retryable: true, fallbackRecommended: true };
    if (error.status === 408)
      return { kind: 'timeout', message: error.message, retryable: false, fallbackRecommended: true };
    if (error.status === 401 || error.status === 403)
      return { kind: 'auth', message: error.message, retryable: false, fallbackRecommended: false };
  }

  if (error instanceof Error && (error.name === 'AbortError' || normalized.includes('aborted'))) {
    return { kind: 'cancelled', message, retryable: false, fallbackRecommended: false };
  }
  if (normalized.includes('timed out') || normalized.includes('timeout') || normalized.includes('time out')) {
    return { kind: 'timeout', message, retryable: false, fallbackRecommended: true };
  }
  if (
    normalized.includes('context_length_exceeded') ||
    normalized.includes('maximum context') ||
    normalized.includes('context window') ||
    normalized.includes('prompt is too long') ||
    normalized.includes('too many tokens') ||
    normalized.includes('token limit')
  ) {
    return { kind: 'context_limit', message, retryable: false, fallbackRecommended: false };
  }
  if (normalized.includes('max_output_tokens') || normalized.includes('maximum output')) {
    return { kind: 'max_output_tokens', message, retryable: false, fallbackRecommended: false };
  }
  if (
    normalized.includes('401') ||
    normalized.includes('403') ||
    normalized.includes('api key') ||
    normalized.includes('unauthorized') ||
    normalized.includes('forbidden') ||
    normalized.includes('authentication')
  ) {
    return { kind: 'auth', message, retryable: false, fallbackRecommended: false };
  }
  if (normalized.includes('429') || normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return { kind: 'rate_limit', message, retryable: true, fallbackRecommended: true };
  }
  if (
    normalized.includes('529') ||
    normalized.includes('overloaded') ||
    normalized.includes('high demand') ||
    normalized.includes('capacity')
  ) {
    return { kind: 'overloaded', message, retryable: true, fallbackRecommended: true };
  }

  return { kind: 'unknown', message, retryable: true, fallbackRecommended: true };
}

export function decideProviderAttempt(input: ProviderAttemptDecisionInput): ProviderAttemptDecision {
  if (input.attempt < input.maxRetries && input.failure.retryable) return { kind: 'retry' };
  if (!input.failure.fallbackRecommended) return { kind: 'stop' };

  const eligibleOffset = input.remainingProviderSupportsTools.findIndex(
    (supportsTools) => !input.toolsRequired || supportsTools,
  );
  if (eligibleOffset >= 0) {
    return { kind: 'fallback', toIndex: input.nextProviderIndex + eligibleOffset };
  }

  if (input.toolsRequired && input.remainingProviderSupportsTools.length > 0) {
    return { kind: 'fail-closed' };
  }

  return { kind: 'stop' };
}

export function computeRetryDelayMs(input: {
  attempt: number;
  baseDelayMs: number;
  retryAfterMs?: number;
  maxDelayMs?: number;
}): number {
  if (input.retryAfterMs !== undefined) return input.retryAfterMs;
  const exponential = input.baseDelayMs * 2 ** input.attempt;
  return input.maxDelayMs !== undefined ? Math.min(exponential, input.maxDelayMs) : exponential;
}

export function extractRetryAfterMs(error: unknown): number | undefined {
  if (error instanceof ProviderHttpError) return error.retryAfterMs;
  return undefined;
}
