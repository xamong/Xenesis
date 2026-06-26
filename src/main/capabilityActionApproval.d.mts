export interface CapabilityApprovalCommand {
  type: 'desk-capability-call';
  path: string;
  args?: unknown;
  source: string;
}

export interface CapabilityApprovalRequestInput {
  path?: string;
  args?: unknown;
  source?: string;
  result?: {
    path?: string;
    source?: string;
    permission?: string;
    error?: string;
  };
}

export interface CapabilityApprovalAllowKeyInput {
  path?: string;
  args?: unknown;
  source?: string;
}

export function createCapabilityApprovalCommand(input?: CapabilityApprovalRequestInput): string;
export function createCapabilityApprovalAllowKey(input?: CapabilityApprovalAllowKeyInput): string;
export function parseCapabilityApprovalCommand(command: string): CapabilityApprovalCommand;
export function createCapabilityApprovalRequest(input?: CapabilityApprovalRequestInput): Record<string, unknown>;
export function isCapabilityApprovalItem(item: unknown): boolean;
