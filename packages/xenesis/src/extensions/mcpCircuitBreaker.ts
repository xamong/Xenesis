export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private _state: "closed" | "open" | "half-open" = "closed";
  private readonly threshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(opts?: { threshold?: number; cooldownMs?: number; now?: () => number }) {
    this.threshold = opts?.threshold ?? 3;
    this.cooldownMs = opts?.cooldownMs ?? 30_000;
    this.now = opts?.now ?? Date.now;
  }
  get state() { return this._state; }
  canAttempt(): boolean {
    if (this._state === "open" && this.now() - this.openedAt >= this.cooldownMs) {
      this._state = "half-open";
    }
    return this._state !== "open";
  }
  recordSuccess(): void { this.failures = 0; this._state = "closed"; }
  recordFailure(): void {
    this.failures += 1;
    if (this._state === "half-open" || this.failures >= this.threshold) {
      this._state = "open";
      this.openedAt = this.now();
    }
  }
}
