export class ProviderHttpError extends Error {
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(message: string, opts: { status: number; retryAfterMs?: number }) {
    super(message);
    this.name = 'ProviderHttpError';
    this.status = opts.status;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

export function parseRetryAfter(headerValue: string | null | undefined): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number(headerValue.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const parsed = Date.parse(headerValue);
  if (!Number.isNaN(parsed)) {
    const ms = parsed - Date.now();
    return Math.max(0, ms);
  }
  return undefined;
}
