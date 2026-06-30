export type PreToolUseDecision =
  | { decision: 'allow' }
  | { decision: 'block'; reason: string; content?: string }
  | { decision: 'modify'; modifiedArgs: Record<string, unknown>; reason?: string }
  | {
      decision: 'ask';
      reason?: string;
      title?: string;
      description?: string;
      severity?: 'info' | 'warning' | 'critical';
      timeoutMs?: number;
      timeoutBehavior?: 'allow' | 'deny';
      allowedDecisions?: Array<'approve' | 'deny' | 'always-allow'>;
    };

export type StopDecision =
  | { decision: 'allow-stop' }
  | { decision: 'block-stop'; continuePrompt: string; reason?: string };

export interface PreToolUsePayload {
  toolName: string;
  toolInput: Record<string, unknown>;
  isReadOnly: boolean;
  isMutation: boolean;
  inputPath?: string;
}

export interface StopPayload {
  stopHookActive: boolean;
  continuationCount: number;
}

export type BlockingHookHandler<P, D> = (payload: P) => D | undefined | Promise<D | undefined>;

export type PreToolUseRegistration = {
  event: 'pre_tool_use';
  toolNamePattern?: string;
  handler: BlockingHookHandler<PreToolUsePayload, PreToolUseDecision>;
};
export type StopRegistration = {
  event: 'stop';
  handler: BlockingHookHandler<StopPayload, StopDecision>;
};
export type BlockingHookRegistration = PreToolUseRegistration | StopRegistration;
