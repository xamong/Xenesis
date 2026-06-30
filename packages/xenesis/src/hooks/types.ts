export const availableHookNames = [
  'run_started',
  'run_completed',
  'run_cancelled',
  'provider_request',
  'provider_response',
  'provider_retry',
  'provider_fallback',
  'context_recovery',
  'context_compact',
  'tool_call',
  'tool_result',
  'task_started',
  'task_completed',
  'task_failed',
  'task_cancelled',
] as const;

export type HookName = (typeof availableHookNames)[number];
export type HookSubscription = HookName | '*';

export interface HookEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  name: HookName;
  timestamp: string;
  sessionId?: string;
  taskId?: string;
  payload: TPayload;
}

export interface HookResult {
  name: HookName;
  timestamp: string;
  handler?: string;
  ok: boolean;
  error?: string;
}

export type HookHandler = (event: HookEvent) => void | Promise<void>;

export interface HookEmitter {
  emit(event: Omit<HookEvent, 'timestamp'>): Promise<HookResult[]>;
}
