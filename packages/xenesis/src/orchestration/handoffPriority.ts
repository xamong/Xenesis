export interface HandoffPriorityPolicy {
  defaultPriority?: number;
}

export interface HandoffPriorityInput {
  label?: string | null;
  prompt: string;
  explicitPriority?: number | null;
  policy?: HandoffPriorityPolicy;
}

export interface ResolvedHandoffPriority {
  priority?: number;
  reason?: string;
}

function priorityCandidate(priority: number | undefined, reason: string): ResolvedHandoffPriority | undefined {
  return priority === undefined ? undefined : { priority, reason };
}

export function resolveHandoffPriority(input: HandoffPriorityInput): ResolvedHandoffPriority {
  if (input.explicitPriority !== undefined && input.explicitPriority !== null) {
    return { priority: input.explicitPriority, reason: 'explicit' };
  }
  if (!input.policy) return {};
  return priorityCandidate(input.policy.defaultPriority, 'default') ?? {};
}

export function isHandoffPriorityPolicy(value: unknown): value is HandoffPriorityPolicy {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const validNumber = (item: unknown) => item === undefined || Number.isInteger(item);
  if (!validNumber(record.defaultPriority)) return false;
  return Object.keys(record).every((key) => key === 'defaultPriority');
}
