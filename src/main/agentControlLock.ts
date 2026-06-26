/**
 * Agent control lock manager.
 *
 * Ensures only one agent controls the Desk at a time.
 * Read operations are always allowed regardless of lock state.
 *
 * Lock lifecycle:
 *   acquire(agentId, source) → { ok, lockId }
 *   release(lockId) → { ok }
 *   status() → { locked, holder, acquiredAt, ... }
 *
 * Auto-release after timeout (default 5 minutes of no activity).
 */

export interface ControlLockState {
  locked: boolean;
  lockId: string | null;
  agentId: string | null;
  source: string | null;
  acquiredAt: number | null;
  lastActivityAt: number | null;
  timeoutMs: number;
}

export interface ControlLockAcquireResult {
  ok: boolean;
  lockId?: string;
  error?: string;
  currentHolder?: string;
}

export interface ControlLockReleaseResult {
  ok: boolean;
  error?: string;
}

export interface AgentControlLockManager {
  acquire(agentId: string, source?: string): ControlLockAcquireResult;
  release(lockId: string): ControlLockReleaseResult;
  forceRelease(): ControlLockReleaseResult;
  status(): ControlLockState;
  touch(lockId: string): boolean;
  isAllowed(lockId: string | undefined, permission: string): boolean;
  setTimeoutMs(ms: number): void;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
let lockSeq = 0;

export function createAgentControlLockManager(timeoutMs = DEFAULT_TIMEOUT_MS): AgentControlLockManager {
  let state: ControlLockState = {
    locked: false,
    lockId: null,
    agentId: null,
    source: null,
    acquiredAt: null,
    lastActivityAt: null,
    timeoutMs,
  };

  let autoReleaseTimer: ReturnType<typeof setTimeout> | null = null;

  function isExpired(): boolean {
    if (!state.locked || !state.lastActivityAt) return false;
    return Date.now() - state.lastActivityAt > state.timeoutMs;
  }

  function checkAndAutoRelease(): void {
    if (isExpired()) {
      clearLock();
    }
  }

  function clearLock(): void {
    state = {
      locked: false,
      lockId: null,
      agentId: null,
      source: null,
      acquiredAt: null,
      lastActivityAt: null,
      timeoutMs: state.timeoutMs,
    };
    if (autoReleaseTimer) {
      clearTimeout(autoReleaseTimer);
      autoReleaseTimer = null;
    }
  }

  function scheduleAutoRelease(): void {
    if (autoReleaseTimer) clearTimeout(autoReleaseTimer);
    autoReleaseTimer = setTimeout(() => {
      if (isExpired()) clearLock();
    }, state.timeoutMs + 1000);
  }

  return {
    acquire(agentId, source = 'unknown'): ControlLockAcquireResult {
      checkAndAutoRelease();

      if (state.locked) {
        if (state.agentId === agentId) {
          state.lastActivityAt = Date.now();
          scheduleAutoRelease();
          return { ok: true, lockId: state.lockId! };
        }
        return {
          ok: false,
          error: `Desk is currently controlled by ${state.agentId} (${state.source}). Use forceRelease or wait for timeout.`,
          currentHolder: state.agentId!,
        };
      }

      const lockId = `lock-${Date.now()}-${++lockSeq}`;
      state = {
        locked: true,
        lockId,
        agentId,
        source,
        acquiredAt: Date.now(),
        lastActivityAt: Date.now(),
        timeoutMs: state.timeoutMs,
      };
      scheduleAutoRelease();
      return { ok: true, lockId };
    },

    release(lockId): ControlLockReleaseResult {
      if (!state.locked) return { ok: true };
      if (state.lockId !== lockId) {
        return { ok: false, error: 'Lock ID does not match.' };
      }
      clearLock();
      return { ok: true };
    },

    forceRelease(): ControlLockReleaseResult {
      clearLock();
      return { ok: true };
    },

    status(): ControlLockState {
      checkAndAutoRelease();
      return { ...state };
    },

    touch(lockId): boolean {
      if (!state.locked || state.lockId !== lockId) return false;
      state.lastActivityAt = Date.now();
      scheduleAutoRelease();
      return true;
    },

    isAllowed(lockId, permission): boolean {
      if (permission === 'read') return true;
      checkAndAutoRelease();
      if (!state.locked) return true;
      return state.lockId === lockId;
    },

    setTimeoutMs(ms): void {
      state.timeoutMs = ms;
    },
  };
}
