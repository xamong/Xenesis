export interface StateMachineDecision {
  source: 'state-machine';
  state: string;
  input: string;
  reason: string;
}

type MachineState =
  | 'idle'
  | 'codex_running'
  | 'approved_once'
  | 'working'
  | 'error_seen'
  | 'repair_requested'
  | 'completed';

export class StateMachineEngine {
  private state: MachineState = 'idle';
  private lastActionAt = 0;

  decide(text: string): StateMachineDecision | null {
    const lower = text.toLowerCase();

    // 상태 전이
    if (/(codex|openai codex)/i.test(text) && this.state === 'idle') {
      this.state = 'codex_running';
    }
    if (/(task complete|completed|finished|done)/i.test(text)) {
      this.state = 'completed';
      return null;
    }
    if (/(error|failed|exception|traceback)/i.test(text)) {
      this.state = 'error_seen';
    }

    if (this.state === 'codex_running') {
      if (/(continue|proceed|approve).{0,80}(y\/n|yes\/no|\[y\/n\])/i.test(text)) {
        if (!this.cooldown(5000)) return null;
        this.state = 'approved_once';
        return {
          source: 'state-machine',
          state: this.state,
          input: 'y\r',
          reason: 'Codex is waiting for a known confirmation prompt.',
        };
      }
    }

    if (this.state === 'approved_once') {
      if (/press enter|return to continue/i.test(lower)) {
        if (!this.cooldown(3000)) return null;
        this.state = 'working';
        return {
          source: 'state-machine',
          state: this.state,
          input: '\r',
          reason: 'Continuation prompt detected after approval.',
        };
      }
    }

    if (this.state === 'error_seen') {
      if (/(fix|repair|try again|retry)/i.test(text)) {
        if (!this.cooldown(12000)) return null;
        this.state = 'repair_requested';
        return {
          source: 'state-machine',
          state: this.state,
          input: 'Analyze the error, apply the smallest safe fix, and run tests again.\r',
          reason: 'Error state detected and retry/fix prompt is available.',
        };
      }
    }

    return null;
  }

  reset(): void {
    this.state = 'idle';
    this.lastActionAt = 0;
  }

  private cooldown(ms: number): boolean {
    const now = Date.now();
    if (now - this.lastActionAt < ms) return false;
    this.lastActionAt = now;
    return true;
  }
}
