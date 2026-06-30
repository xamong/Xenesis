import type { ToolExecutionPolicy } from '../AgentRunner.js';
import type { ToolCall } from '../messages.js';

export type KernelToolChoiceAuditStatus = 'followed_priority' | 'missed_priority';

export interface EvaluateToolChoicePriorityOptions {
  policy?: ToolExecutionPolicy;
  toolCall: ToolCall;
  successfulToolNames: ReadonlySet<string>;
}

export interface KernelToolChoiceAudit {
  toolCallId: string;
  name: string;
  status: KernelToolChoiceAuditStatus;
  reason: string;
  priorityReasons: string[];
  priorityTools: string[];
  unmetPriorityTools: string[];
}

function unique(values: readonly string[]) {
  return Array.from(new Set(values));
}

export function evaluateToolChoicePriority(
  options: EvaluateToolChoicePriorityOptions,
): KernelToolChoiceAudit | undefined {
  const priorityTools = unique(options.policy?.priorityTools ?? []);
  const unmetPriorityTools = priorityTools.filter((name) => !options.successfulToolNames.has(name));
  if (priorityTools.length === 0 || unmetPriorityTools.length === 0) return undefined;

  const followed = priorityTools.includes(options.toolCall.name);
  return {
    toolCallId: options.toolCall.id,
    name: options.toolCall.name,
    status: followed ? 'followed_priority' : 'missed_priority',
    reason: followed
      ? `called priority tool ${options.toolCall.name}`
      : `called ${options.toolCall.name} while higher-priority tools were available`,
    priorityReasons: [`execution_policy:${options.policy?.name ?? 'unnamed'}`],
    priorityTools,
    unmetPriorityTools,
  };
}
