import { describe, expect, it } from 'vitest';
import {
  classifyProviderFailure,
  computeRetryDelayMs,
  extractRetryAfterMs,
} from '../../src/core/providerFailurePolicy.js';
import { ProviderHttpError, parseRetryAfter } from '../../src/providers/providerHttpError.js';

describe('parseRetryAfter', () => {
  it('parses delta-seconds into milliseconds', () => {
    expect(parseRetryAfter('3')).toBe(3000);
    expect(parseRetryAfter('0')).toBe(0);
  });
  it('parses an HTTP-date into a non-negative ms delay', () => {
    const future = new Date(Date.now() + 5000).toUTCString();
    const ms = parseRetryAfter(future);
    expect(ms).toBeGreaterThanOrEqual(3000);
    expect(ms).toBeLessThanOrEqual(7000);
  });
  it('returns undefined for null / empty / garbage', () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter('')).toBeUndefined();
    expect(parseRetryAfter('not-a-date')).toBeUndefined();
  });
});

describe('ProviderHttpError', () => {
  it('carries status and retryAfterMs and is an Error', () => {
    const e = new ProviderHttpError('HTTP 429: slow down', { status: 429, retryAfterMs: 2000 });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ProviderHttpError');
    expect(e.status).toBe(429);
    expect(e.retryAfterMs).toBe(2000);
  });
});

describe('classifyProviderFailure(ProviderHttpError)', () => {
  const cases: Array<[number, string, boolean]> = [
    [429, 'rate_limit', true],
    [529, 'overloaded', true],
    [503, 'overloaded', true],
    [408, 'timeout', false],
    [401, 'auth', false],
    [403, 'auth', false],
  ];
  for (const [status, kind, retryable] of cases) {
    it(`maps status ${status} -> ${kind} (retryable=${retryable})`, () => {
      const c = classifyProviderFailure(new ProviderHttpError(`HTTP ${status}`, { status }));
      expect(c.kind).toBe(kind);
      expect(c.retryable).toBe(retryable);
    });
  }
});

describe('computeRetryDelayMs', () => {
  it('honors retryAfterMs over backoff', () => {
    expect(computeRetryDelayMs({ attempt: 5, baseDelayMs: 100, retryAfterMs: 2000 })).toBe(2000);
  });
  it('uses exponential backoff when no retryAfter is given', () => {
    expect(computeRetryDelayMs({ attempt: 0, baseDelayMs: 100 })).toBe(100);
    expect(computeRetryDelayMs({ attempt: 2, baseDelayMs: 100 })).toBe(400);
  });
  it('caps at maxDelayMs when provided', () => {
    expect(computeRetryDelayMs({ attempt: 10, baseDelayMs: 100, maxDelayMs: 1000 })).toBe(1000);
  });
});

describe('extractRetryAfterMs', () => {
  it('returns retryAfterMs from a ProviderHttpError', () => {
    expect(extractRetryAfterMs(new ProviderHttpError('x', { status: 429, retryAfterMs: 2000 }))).toBe(2000);
  });
  it('returns undefined for a ProviderHttpError without retryAfter, and for plain errors', () => {
    expect(extractRetryAfterMs(new ProviderHttpError('x', { status: 429 }))).toBeUndefined();
    expect(extractRetryAfterMs(new Error('nope'))).toBeUndefined();
  });
});
