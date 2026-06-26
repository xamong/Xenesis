export type ContextRecordKind =
  | "prompt_base"
  | "conversation"
  | "tool_result"
  | "tool_result_summary"
  | "compact_summary"
  | "microcompact"
  | "session_memory"
  | "workspace_context"
  | "ide_context"
  | "desk_context"
  | "recovery_overlay";

export type ContextAuthority =
  | "explicit_user"
  | "live_evidence"
  | "active_surface"
  | "project_instruction"
  | "session_state"
  | "workspace_index"
  | "durable_memory"
  | "session_memory"
  | "historical_hint";

export type ContextFreshness = "live" | "fresh" | "stale" | "expired";
export type ContextCacheScope = "global" | "session" | "turn" | "none";

export interface ContextRecord {
  id: string;
  kind: ContextRecordKind;
  authority: ContextAuthority;
  content: string;
  structured?: unknown;
  sourcePath?: string;
  appliesTo?: string[];
  createdAt: string;
  observedAt: string;
  expiresAt?: string;
  freshness: ContextFreshness;
  priority: number;
  tokenEstimate: number;
  sensitive: boolean;
  cacheScope: ContextCacheScope;
  conflictKey?: string;
  evidenceRefs: string[];
}

export interface CreateContextRecordInput {
  id: string;
  kind: ContextRecordKind;
  authority: ContextAuthority;
  content: string;
  structured?: unknown;
  sourcePath?: string;
  appliesTo?: string[];
  createdAt?: string;
  observedAt?: string;
  expiresAt?: string;
  freshness?: ContextFreshness;
  priority?: number;
  tokenEstimate?: number;
  sensitive?: boolean;
  cacheScope?: ContextCacheScope;
  conflictKey?: string;
  evidenceRefs?: string[];
  now?: Date;
}

export const contextAuthorityRank: Record<ContextAuthority, number> = {
  explicit_user: 90,
  live_evidence: 80,
  active_surface: 70,
  project_instruction: 60,
  session_state: 50,
  workspace_index: 40,
  durable_memory: 30,
  session_memory: 20,
  historical_hint: 10
};

const freshnessRank: Record<ContextFreshness, number> = {
  live: 40,
  fresh: 30,
  stale: 20,
  expired: 10
};

export function estimateContextTokens(content: string) {
  const trimmed = content.trim();
  if (trimmed.length === 0) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function isContextRecordExpired(record: Pick<ContextRecord, "expiresAt">, now = new Date()) {
  return record.expiresAt !== undefined && new Date(record.expiresAt).getTime() <= now.getTime();
}

function defaultFreshness(input: CreateContextRecordInput, now: Date): ContextFreshness {
  if (input.freshness) return input.freshness;
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= now.getTime()) return "expired";
  return "fresh";
}

export function createContextRecord(input: CreateContextRecordInput): ContextRecord {
  const now = input.now ?? new Date();
  const createdAt = input.createdAt ?? now.toISOString();
  const observedAt = input.observedAt ?? createdAt;

  return {
    id: input.id,
    kind: input.kind,
    authority: input.authority,
    content: input.content,
    ...(input.structured !== undefined ? { structured: input.structured } : {}),
    ...(input.sourcePath !== undefined ? { sourcePath: input.sourcePath } : {}),
    ...(input.appliesTo !== undefined ? { appliesTo: [...input.appliesTo] } : {}),
    createdAt,
    observedAt,
    ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
    freshness: defaultFreshness(input, now),
    priority: input.priority ?? 0,
    tokenEstimate: input.tokenEstimate ?? estimateContextTokens(input.content),
    sensitive: input.sensitive ?? false,
    cacheScope: input.cacheScope ?? "turn",
    ...(input.conflictKey !== undefined ? { conflictKey: input.conflictKey } : {}),
    evidenceRefs: [...(input.evidenceRefs ?? [])]
  };
}

function compareDesc(left: number, right: number) {
  return right - left;
}

export function compareContextRecords(left: ContextRecord, right: ContextRecord) {
  const authority = compareDesc(contextAuthorityRank[left.authority], contextAuthorityRank[right.authority]);
  if (authority !== 0) return authority;

  const freshness = compareDesc(freshnessRank[left.freshness], freshnessRank[right.freshness]);
  if (freshness !== 0) return freshness;

  const priority = compareDesc(left.priority, right.priority);
  if (priority !== 0) return priority;

  const observed = compareDesc(new Date(left.observedAt).getTime(), new Date(right.observedAt).getTime());
  if (observed !== 0) return observed;

  return left.id.localeCompare(right.id);
}
