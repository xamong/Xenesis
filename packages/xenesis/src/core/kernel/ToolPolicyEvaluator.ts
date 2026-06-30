import type { ToolExecutionPolicy } from '../AgentRunner.js';
import type { ToolCall } from '../messages.js';

export type KernelToolPolicyStatus = 'allow' | 'deny';

export interface EvaluateToolExecutionPolicyOptions {
  policy?: ToolExecutionPolicy;
  toolCall: ToolCall;
  successfulToolNames: ReadonlySet<string>;
}

export interface KernelToolPolicyDecision {
  status: KernelToolPolicyStatus;
  policyName: string;
  toolCallId: string;
  name: string;
  reason: string;
  nextAction?: string;
  requiredBefore: string[];
  missingBefore: string[];
  requiredBeforeAny: string[];
  missingBeforeAny: string[];
  priorityTools: string[];
}

function effectivePolicyMissingTools(
  toolName: string,
  requiredBefore: string[],
  requiredBeforeAny: string[],
  successfulToolNames: ReadonlySet<string>,
) {
  const oneOfRequirementSatisfied =
    requiredBeforeAny.length > 0 && requiredBeforeAny.some((name) => successfulToolNames.has(name));
  const interchangeableRequired =
    toolName === 'task_handoff' && oneOfRequirementSatisfied ? new Set(requiredBeforeAny) : new Set<string>();
  const effectiveRequiredBefore = requiredBefore.filter((name) => !interchangeableRequired.has(name));
  const missingBefore = effectiveRequiredBefore.filter((name) => !successfulToolNames.has(name));
  const missingBeforeAny = requiredBeforeAny.length > 0 && !oneOfRequirementSatisfied ? requiredBeforeAny : [];
  return {
    requiredBefore: effectiveRequiredBefore,
    missingBefore,
    requiredBeforeAny,
    missingBeforeAny,
  };
}

function denyNextAction(missingBefore: readonly string[], missingBeforeAny: readonly string[]) {
  if (missingBefore.length > 0) return `Run these tools first: ${missingBefore.join(', ')}`;
  if (missingBeforeAny.length > 0) return `Run one of these tools first: ${missingBeforeAny.join(', ')}`;
  return undefined;
}

export function evaluateToolExecutionPolicy(options: EvaluateToolExecutionPolicyOptions): KernelToolPolicyDecision {
  const policyName = options.policy?.name ?? 'unnamed';
  const requiredBefore = options.policy?.requiredBefore?.[options.toolCall.name] ?? [];
  const requiredBeforeAny = options.policy?.requiredBeforeAny?.[options.toolCall.name] ?? [];
  const missing = effectivePolicyMissingTools(
    options.toolCall.name,
    requiredBefore,
    requiredBeforeAny,
    options.successfulToolNames,
  );
  const missingTools = [...missing.missingBefore, ...missing.missingBeforeAny];
  const status: KernelToolPolicyStatus = missingTools.length > 0 ? 'deny' : 'allow';
  const nextAction = status === 'deny' ? denyNextAction(missing.missingBefore, missing.missingBeforeAny) : undefined;

  return {
    status,
    policyName,
    toolCallId: options.toolCall.id,
    name: options.toolCall.name,
    requiredBefore: missing.requiredBefore,
    missingBefore: missing.missingBefore,
    requiredBeforeAny: missing.requiredBeforeAny,
    missingBeforeAny: missing.missingBeforeAny,
    priorityTools: options.policy?.priorityTools ?? [],
    reason:
      status === 'deny'
        ? `requires successful prior tool call(s): ${missingTools.join(', ')}`
        : 'policy requirements satisfied',
    ...(nextAction ? { nextAction } : {}),
  };
}
