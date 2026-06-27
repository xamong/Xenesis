type MemorySensitivity = 'low' | 'medium' | 'high' | 'restricted' | string;

export interface MemoryDashboardRecord {
  id: string;
  text?: string;
  displayText: string;
  tags: string[];
  kind?: string;
  source?: string;
  sensitivity?: MemorySensitivity;
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
  evidenceIds?: string[];
  conflictsWith?: string[];
  supersedes?: string[];
  validFrom?: string;
  validTo?: string;
  useCount: number;
  redacted?: boolean;
}

export interface MemoryDashboardProposal {
  id: string;
  status: string;
  input: Record<string, unknown>;
  decision: {
    action?: string;
    sensitivity?: MemorySensitivity;
    requiresApproval?: boolean;
    reason?: string;
  };
  context?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  displayText: string;
  redacted?: boolean;
}

export interface MemoryDashboardEvidence {
  id: string;
  kind?: string;
  source?: string;
  sensitivity?: MemorySensitivity;
  status?: string;
  summary?: string;
  createdAt?: string;
  updatedAt?: string;
  redacted?: boolean;
}

export interface MemoryDashboardGroup {
  key: string;
  count: number;
  records: MemoryDashboardRecord[];
}

export interface MemoryDashboardModelInput {
  records?: readonly Record<string, unknown>[];
  proposals?: readonly Record<string, unknown>[];
  evidence?: readonly Record<string, unknown>[];
  events?: readonly Record<string, unknown>[];
}

export interface MemoryDashboardModel {
  counts: {
    records: number;
    pendingProposals: number;
    sensitive: number;
    evidence: number;
    conflicts: number;
  };
  records: MemoryDashboardRecord[];
  recordsById: Record<string, MemoryDashboardRecord>;
  recent: MemoryDashboardRecord[];
  pendingProposals: MemoryDashboardProposal[];
  projects: MemoryDashboardGroup[];
  people: MemoryDashboardGroup[];
  decisions: MemoryDashboardRecord[];
  conflicts: MemoryDashboardRecord[];
  sensitive: MemoryDashboardRecord[];
  evidence: MemoryDashboardEvidence[];
  evidenceByMemory: Record<string, MemoryDashboardEvidence[]>;
  frequentUse: MemoryDashboardRecord[];
}

export interface MemoryCorrectionProposalArgsInput {
  base: MemoryDashboardRecord | Record<string, unknown>;
  correctedText: string;
  reason: string;
}

export interface MemoryCorrectionProposalArgs {
  input: {
    id: string;
    text: string;
    tags: string[];
    kind?: string;
    source?: string;
    sensitivity?: string;
    supersedes: string[];
    validFrom: string;
  };
  context: {
    actor: 'user';
    externalTaint: false;
    intent: 'propose';
    reason: string;
    runtime: 'desk-memory-dashboard';
    sourceKind: 'manual_note';
    trust: 'trusted';
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isSensitive(sensitivity: unknown): boolean {
  return sensitivity === 'high' || sensitivity === 'restricted';
}

function sensitivityRank(sensitivity: MemorySensitivity | undefined): number {
  if (sensitivity === 'restricted') return 3;
  if (sensitivity === 'high') return 2;
  if (sensitivity === 'medium') return 1;
  return 0;
}

function maxSensitivity(
  declared: MemorySensitivity | undefined,
  inferred: MemorySensitivity | undefined,
): MemorySensitivity | undefined {
  return sensitivityRank(inferred) > sensitivityRank(declared) ? inferred : declared;
}

function inferTextSensitivity(text: string, tags: readonly string[] = []): MemorySensitivity | undefined {
  const haystack = `${text}\n${tags.join('\n')}`.toLowerCase();
  if (
    /\b(api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|credential|password|private[_\s-]?key)\b/.test(
      haystack,
    ) ||
    /\b(sk|pk)-(?:live|test)-[a-z0-9_-]{8,}\b/i.test(text)
  ) {
    return 'restricted';
  }
  if (/\b(legal strategy|health|medical|diagnosis|ssn|social security|bank account)\b/.test(haystack)) {
    return 'high';
  }
  return undefined;
}

function sortByTimeDesc<T extends { updatedAt?: string; createdAt?: string; id: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const rightTime = Date.parse(right.updatedAt || right.createdAt || '');
    const leftTime = Date.parse(left.updatedAt || left.createdAt || '');
    const byTime = (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
    return byTime === 0 ? left.id.localeCompare(right.id) : byTime;
  });
}

function groupByTag(records: MemoryDashboardRecord[], prefix: string): MemoryDashboardGroup[] {
  const groups = new Map<string, MemoryDashboardRecord[]>();
  for (const record of records) {
    for (const tag of record.tags) {
      if (!tag.toLowerCase().startsWith(prefix)) continue;
      const key = tag.slice(prefix.length).trim();
      if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }
  }
  return [...groups.entries()]
    .map(([key, groupRecords]) => ({ key, count: groupRecords.length, records: groupRecords }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function eventUseCounts(events: readonly Record<string, unknown>[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    const memoryId = asString(event.memoryId);
    if (!memoryId) continue;
    counts.set(memoryId, (counts.get(memoryId) ?? 0) + 1);
  }
  return counts;
}

function normalizeRecord(record: Record<string, unknown>, useCount: number): MemoryDashboardRecord {
  const id = asString(record.id);
  const declaredSensitivity = asString(record.sensitivity) || undefined;
  const text = asString(record.text);
  const tags = asStringArray(record.tags);
  const source = asString(record.source);
  const sensitivity = maxSensitivity(declaredSensitivity, inferTextSensitivity([text, source].join(' '), tags));
  const redacted = isSensitive(sensitivity);
  const displayText = redacted ? redactDashboardMemoryText({ sensitivity }) : text;
  return {
    id,
    text: displayText,
    displayText,
    tags: redacted ? [] : tags,
    kind: asString(record.kind) || undefined,
    source: redacted ? undefined : source || undefined,
    sensitivity,
    priority: asNumber(record.priority),
    createdAt: asString(record.createdAt) || undefined,
    updatedAt: asString(record.updatedAt) || undefined,
    evidenceIds: asStringArray(record.evidenceIds),
    conflictsWith: asStringArray(record.conflictsWith),
    supersedes: asStringArray(record.supersedes),
    validFrom: asString(record.validFrom) || undefined,
    validTo: asString(record.validTo) || undefined,
    useCount,
    ...(redacted ? { redacted: true } : {})
  };
}

function normalizeProposal(proposal: Record<string, unknown>): MemoryDashboardProposal {
  const input = proposal.input && typeof proposal.input === 'object' ? (proposal.input as Record<string, unknown>) : {};
  const decision =
    proposal.decision && typeof proposal.decision === 'object' ? (proposal.decision as Record<string, unknown>) : {};
  const declaredSensitivity = asString(decision.sensitivity || input.sensitivity) || undefined;
  const sensitivity = maxSensitivity(
    declaredSensitivity,
    inferTextSensitivity(asString(input.text), asStringArray(input.tags)),
  );
  const redacted = isSensitive(sensitivity);
  const displayText = redacted ? `[redacted: ${sensitivity} memory proposal]` : asString(input.text);
  return {
    id: asString(proposal.id),
    status: asString(proposal.status),
    input: {
      ...input,
      text: displayText
    },
    decision: {
      action: asString(decision.action) || undefined,
      sensitivity,
      requiresApproval: decision.requiresApproval === true,
      reason: asString(decision.reason) || undefined
    },
    context: proposal.context && typeof proposal.context === 'object' ? (proposal.context as Record<string, unknown>) : {},
    createdAt: asString(proposal.createdAt) || undefined,
    updatedAt: asString(proposal.updatedAt) || undefined,
    displayText,
    ...(redacted ? { redacted: true } : {})
  };
}

function normalizeEvidence(evidence: Record<string, unknown>): MemoryDashboardEvidence {
  const declaredSensitivity = asString(evidence.sensitivity) || undefined;
  const sensitivity = maxSensitivity(
    declaredSensitivity,
    inferTextSensitivity([asString(evidence.source), asString(evidence.summary)].join(' ')),
  );
  const redacted = isSensitive(sensitivity);
  return {
    id: asString(evidence.id),
    kind: asString(evidence.kind) || undefined,
    source: redacted ? `[redacted: ${sensitivity} evidence]` : asString(evidence.source) || undefined,
    sensitivity,
    status: asString(evidence.status) || undefined,
    summary: redacted ? `[redacted: ${sensitivity} evidence summary]` : asString(evidence.summary) || undefined,
    createdAt: asString(evidence.createdAt) || undefined,
    updatedAt: asString(evidence.updatedAt) || undefined,
    ...(redacted ? { redacted: true } : {})
  };
}

export function redactDashboardMemoryText(record: Pick<MemoryDashboardRecord, 'sensitivity'>): string {
  return isSensitive(record.sensitivity) ? `[redacted: ${record.sensitivity} memory]` : '';
}

export function buildMemoryDashboardModel(input: MemoryDashboardModelInput): MemoryDashboardModel {
  const events = input.events ?? [];
  const counts = eventUseCounts(events);
  const records = (input.records ?? [])
    .map((record) => normalizeRecord(record, counts.get(asString(record.id)) ?? 0))
    .filter((record) => Boolean(record.id));
  const evidence = (input.evidence ?? [])
    .map(normalizeEvidence)
    .filter((item) => Boolean(item.id));
  const proposals = (input.proposals ?? [])
    .map(normalizeProposal)
    .filter((proposal) => Boolean(proposal.id));
  const pendingProposals = sortByTimeDesc(proposals.filter((proposal) => proposal.status === 'pending'));
  const recordsById = Object.fromEntries(records.map((record) => [record.id, record]));
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const evidenceByMemory: Record<string, MemoryDashboardEvidence[]> = {};
  for (const record of records) {
    const linked = (record.evidenceIds ?? []).map((id) => evidenceById.get(id)).filter(Boolean) as MemoryDashboardEvidence[];
    if (linked.length > 0) evidenceByMemory[record.id] = linked;
  }
  const conflicts = records.filter((record) => (record.conflictsWith ?? []).length > 0);
  const sensitive = records.filter((record) => isSensitive(record.sensitivity));
  return {
    counts: {
      records: records.length,
      pendingProposals: pendingProposals.length,
      sensitive: sensitive.length,
      evidence: evidence.length,
      conflicts: conflicts.length
    },
    records,
    recordsById,
    recent: sortByTimeDesc(records).slice(0, 20),
    pendingProposals,
    projects: groupByTag(records, 'project:'),
    people: groupByTag(records, 'person:'),
    decisions: records.filter((record) => record.kind === 'decision' || record.tags.includes('decision')),
    conflicts,
    sensitive,
    evidence,
    evidenceByMemory,
    frequentUse: [...records]
      .sort((left, right) => right.useCount - left.useCount || (right.priority ?? 0) - (left.priority ?? 0))
      .filter((record) => record.useCount > 0 || (record.priority ?? 0) > 0)
      .slice(0, 10)
  };
}

export function buildMemoryCorrectionProposalArgs(input: MemoryCorrectionProposalArgsInput): MemoryCorrectionProposalArgs {
  const baseId = asString(input.base.id);
  const tags = asStringArray(input.base.tags);
  const source = asString(input.base.source);
  const kind = asString(input.base.kind);
  const sensitivity = asString(input.base.sensitivity);
  return {
    input: {
      id: `${baseId}-correction`,
      text: input.correctedText.trim(),
      tags,
      ...(kind ? { kind } : {}),
      ...(source ? { source } : {}),
      ...(sensitivity ? { sensitivity } : {}),
      supersedes: [baseId],
      validFrom: new Date().toISOString()
    },
    context: {
      actor: 'user',
      externalTaint: false,
      intent: 'propose',
      reason: input.reason.trim() || `memory dashboard correction for ${baseId}`,
      runtime: 'desk-memory-dashboard',
      sourceKind: 'manual_note',
      trust: 'trusted'
    }
  };
}
