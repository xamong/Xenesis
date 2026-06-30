import type { ApprovalRequest } from '../events.js';

export class ApprovalPauseSignal extends Error {
  constructor(public readonly pendingApproval: ApprovalRequest) {
    super(`Run paused awaiting approval for tool "${pendingApproval.name}".`);
    this.name = 'ApprovalPauseSignal';
  }
}

export function isApprovalPauseSignal(error: unknown): error is ApprovalPauseSignal {
  return error instanceof ApprovalPauseSignal;
}
