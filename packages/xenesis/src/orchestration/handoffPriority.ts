export interface HandoffPriorityPolicy {
  defaultPriority?: number;
  urgentPriority?: number;
  taskTypePriorities?: Record<string, number>;
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

const taskTypeKeywords: Record<string, string[]> = {
  verify: ["verify", "verification", "test", "typecheck", "diagnostic", "검증", "테스트", "진단", "확인"],
  repair: ["repair", "fix", "failure", "failed", "error", "bug", "broken", "복구", "수정", "고쳐", "실패", "오류", "에러", "버그"],
  review: ["review", "inspect", "audit", "검토", "리뷰", "점검"],
  research: ["research", "investigate", "analyze", "분석", "조사", "확인"],
  implement: ["implement", "build", "change", "apply", "구현", "작업", "반영", "개발"]
};

const urgentKeywords = [
  "urgent",
  "critical",
  "blocker",
  "blocking",
  "production",
  "prod",
  "asap",
  "immediately",
  "긴급",
  "중요",
  "치명",
  "막혀",
  "블로커",
  "배포",
  "운영"
];

function normalized(value: string) {
  return value.toLowerCase();
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function priorityCandidate(priority: number | undefined, reason: string): ResolvedHandoffPriority | undefined {
  return priority === undefined ? undefined : { priority, reason };
}

export function resolveHandoffPriority(input: HandoffPriorityInput): ResolvedHandoffPriority {
  if (input.explicitPriority !== undefined && input.explicitPriority !== null) {
    return { priority: input.explicitPriority, reason: "explicit" };
  }
  if (!input.policy) return {};

  const text = normalized(`${input.label ?? ""}\n${input.prompt}`);
  const candidates: ResolvedHandoffPriority[] = [];

  if (includesAny(text, urgentKeywords)) {
    const candidate = priorityCandidate(input.policy.urgentPriority, "urgent");
    if (candidate) candidates.push(candidate);
  }

  for (const [type, keywords] of Object.entries(taskTypeKeywords)) {
    if (!includesAny(text, keywords)) continue;
    const candidate = priorityCandidate(input.policy.taskTypePriorities?.[type], `type:${type}`);
    if (candidate) candidates.push(candidate);
  }

  const defaultCandidate = priorityCandidate(input.policy.defaultPriority, "default");
  if (defaultCandidate) candidates.push(defaultCandidate);
  return candidates.sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))[0] ?? {};
}

export function isHandoffPriorityPolicy(value: unknown): value is HandoffPriorityPolicy {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const validNumber = (item: unknown) => item === undefined || Number.isInteger(item);
  if (!validNumber(record.defaultPriority) || !validNumber(record.urgentPriority)) return false;
  if (record.taskTypePriorities === undefined) return true;
  if (typeof record.taskTypePriorities !== "object" || record.taskTypePriorities === null || Array.isArray(record.taskTypePriorities)) {
    return false;
  }
  return Object.values(record.taskTypePriorities).every((item) => Number.isInteger(item));
}
