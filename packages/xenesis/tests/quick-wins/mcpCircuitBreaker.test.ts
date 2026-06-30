import { describe, expect, it } from 'vitest';
import { CircuitBreaker } from '../../src/extensions/mcpCircuitBreaker.js';

describe('CircuitBreaker', () => {
  it('opens after threshold consecutive failures', () => {
    const cb = new CircuitBreaker({ threshold: 3, cooldownMs: 1000, now: () => 0 });
    expect(cb.canAttempt()).toBe(true);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.state).toBe('open');
    expect(cb.canAttempt()).toBe(false);
  });
  it('half-opens after cooldown, closes on success', () => {
    let t = 0;
    const cb = new CircuitBreaker({ threshold: 1, cooldownMs: 100, now: () => t });
    cb.recordFailure();
    expect(cb.canAttempt()).toBe(false);
    t = 200;
    expect(cb.canAttempt()).toBe(true); // half-open probe allowed
    cb.recordSuccess();
    expect(cb.state).toBe('closed');
  });
  it('re-opens for another full cooldown when the half-open probe fails', () => {
    let t = 0;
    const cb = new CircuitBreaker({ threshold: 1, cooldownMs: 100, now: () => t });
    cb.recordFailure();
    t = 200;
    expect(cb.canAttempt()).toBe(true); // half-open probe allowed
    expect(cb.state).toBe('half-open');
    cb.recordFailure(); // probe failed -> re-open, openedAt = 200
    expect(cb.state).toBe('open');
    expect(cb.canAttempt()).toBe(false);
    t = 250; // only 50ms since re-open: still within new cooldown
    expect(cb.canAttempt()).toBe(false);
    t = 300; // 100ms since re-open: cooldown re-elapsed
    expect(cb.canAttempt()).toBe(true);
    expect(cb.state).toBe('half-open');
  });
});
