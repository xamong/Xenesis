export type AgentKernelRunState =
  | 'created'
  | 'composing_prompt'
  | 'provider_request'
  | 'assistant_received'
  | 'tool_scheduling'
  | 'tool_running'
  | 'tool_results_committed'
  | 'recovery_decision'
  | 'completed'
  | 'stopped'
  | 'blocked'
  | 'failed';
