import {
  createMemoryLedgerEventId,
  createMemoryProposalId,
  defaultMemoryWriteContext,
  normalizeMemoryInput,
  nowIso
} from "./memoryDefaults.js";
import {
  assertMemoryEvidenceContentHash,
  hashMemoryEvidenceContent,
  readMemoryEvidenceSnapshot
} from "./memoryEvidenceVault.js";
import { classifyMemoryWrite } from "./memoryPolicy.js";
import { isProcedureMemoryInput, runbooksEquivalent, validateMemoryRunbookInput } from "./memoryRunbook.js";
import {
  buildPartialSupersede,
  findTemporalConflicts,
  isMemoryValidAt,
  sortCurrentBeforeHistorical
} from "./memoryTemporal.js";
import type {
  MemoryApprovalProof,
  MemoryArchiveResult,
  MemoryActor,
  MemoryEvidenceFilter,
  MemoryEvidenceRecord,
  MemoryLedgerEvent,
  MemoryLedgerEventFilter,
  MemoryLedgerListFilter,
  MemoryLedgerSearchQuery,
  MemoryLedgerStore,
  MemoryProposal,
  MemoryProposalFilter,
  MemorySupersedeResult,
  MemoryWriteContext,
  MemoryWriteDecision,
  MemoryWriteResult
} from "./memoryTypes.js";
import type { MemoryInput, MemoryRecord, MemoryStore } from "./types.js";

function activeByDefault(record: MemoryRecord): boolean {
  return (record.status ?? "active") !== "archived";
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function validAtFilter(record: MemoryRecord, at: string | undefined, includeHistorical: boolean | undefined): boolean {
  if (!at) return true;
  if (includeHistorical) {
    const timestamp = Date.parse(at);
    if (!Number.isFinite(timestamp)) return false;
    const validFrom = Date.parse(record.validFrom ?? record.createdAt ?? record.updatedAt);
    return Number.isFinite(validFrom) ? validFrom <= timestamp : true;
  }
  return isMemoryValidAt(record, at);
}

function assertTransitionBaseIsValid(base: MemoryRecord, effectiveAt: string): void {
  if (!isMemoryValidAt(base, effectiveAt)) {
    throw new Error(`Base memory is not valid at transition time: ${base.id}`);
  }
}

function sortEvents(events: MemoryLedgerEvent[]): MemoryLedgerEvent[] {
  return [...events].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

function normalizeGovernedMemoryInput(input: MemoryInput): MemoryInput {
  return validateMemoryRunbookInput(normalizeMemoryInput(input));
}

function assertNoSameIdRunbookOverwrite(existing: MemoryRecord | undefined, next: MemoryInput): void {
  if (!existing || !isProcedureMemoryInput(next)) return;
  if ((existing.kind === "procedure" || existing.runbook) && !runbooksEquivalent(existing.runbook, next.runbook)) {
    throw new Error(`Runbook update requires temporal supersede: ${next.id}`);
  }
}

function assertNoSameIdOverwrite(existing: MemoryRecord | undefined, next: MemoryInput): void {
  if (!existing) return;
  assertNoSameIdRunbookOverwrite(existing, next);
  throw new Error(`Memory already exists; use temporal supersede instead: ${next.id}`);
}

function evidenceEventSnapshot(record: MemoryEvidenceRecord): Record<string, unknown> {
  return {
    status: record.status ?? "active",
    contentHash: record.contentHash ?? null,
    sensitivity: record.sensitivity
  };
}

function sanitizedLedgerReason(reason: string | undefined, fallback: string): string {
  const value = (reason ?? fallback).replace(/\s+/g, " ").trim();
  const redacted = value
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\bsk-[a-z0-9_-]{6,}\b/gi, "[secret]")
    .replace(/\b(api[_ -]?key|secret|password|credential|token)\s*[:=]\s*\S+/gi, "$1=[redacted]");
  return redacted.slice(0, 160) || fallback;
}

function assertValidMemoryApprovalProof(
  proof: MemoryApprovalProof | undefined,
  expectedAction: "approve" | "reject",
  expectedPath: "xd.memory.proposals.accept" | "xd.memory.proposals.reject",
): MemoryApprovalProof {
  if (!proof) throw new Error("approval_proof_required");
  if (proof.kind !== "approval-proof") throw new Error("approval_proof_required");
  if (!proof.approvalId.trim() || !proof.approvedBy.trim()) throw new Error("approval_proof_required");
  const actionMatches =
    expectedAction === "approve"
      ? proof.action === "approve" || proof.action === "approve_always"
      : proof.action === "reject";
  if (!actionMatches) throw new Error("approval_proof_required");
  if (proof.path !== expectedPath) throw new Error("approval_proof_required");
  if (!proof.source?.trim()) throw new Error("approval_proof_required");
  if (!proof.argsHash?.trim()) throw new Error("approval_proof_required");
  if (!Number.isFinite(Date.parse(proof.createdAt))) throw new Error("approval_proof_required");
  if (!proof.expiresAt) throw new Error("approval_proof_required");
  const expiry = Date.parse(proof.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) {
    throw new Error("approval_proof_expired");
  }
  return proof;
}

export class InMemoryMemoryLedgerStore implements MemoryLedgerStore {
  private readonly proposals = new Map<string, MemoryProposal>();
  private readonly evidence = new Map<string, MemoryEvidenceRecord>();
  private readonly events: MemoryLedgerEvent[] = [];

  async saveProposal(proposal: MemoryProposal): Promise<MemoryProposal> {
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  async updateProposal(id: string, mutate: (current: MemoryProposal) => MemoryProposal): Promise<MemoryProposal> {
    const current = this.proposals.get(id);
    if (!current) throw new Error(`Memory proposal not found: ${id}`);
    const next = mutate(current);
    this.proposals.set(id, next);
    return next;
  }

  async getProposal(id: string): Promise<MemoryProposal | undefined> {
    return this.proposals.get(id);
  }

  async listProposals(filter: MemoryProposalFilter = {}): Promise<MemoryProposal[]> {
    return Array.from(this.proposals.values())
      .filter((proposal) => !filter.status || proposal.status === filter.status)
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  }

  async saveEvidence(evidence: MemoryEvidenceRecord): Promise<MemoryEvidenceRecord> {
    if (this.evidence.has(evidence.id)) throw new Error(`Memory evidence already exists: ${evidence.id}`);
    this.evidence.set(evidence.id, evidence);
    return evidence;
  }

  async updateEvidence(
    id: string,
    mutate: (current: MemoryEvidenceRecord) => MemoryEvidenceRecord,
  ): Promise<MemoryEvidenceRecord> {
    const current = this.evidence.get(id);
    if (!current) throw new Error(`Memory evidence not found: ${id}`);
    const next = mutate(current);
    this.evidence.set(id, next);
    return next;
  }

  async getEvidence(id: string): Promise<MemoryEvidenceRecord | undefined> {
    return this.evidence.get(id);
  }

  async listEvidence(filter: MemoryEvidenceFilter = {}): Promise<MemoryEvidenceRecord[]> {
    return Array.from(this.evidence.values())
      .filter((record) => !filter.kind || record.kind === filter.kind)
      .filter((record) => !filter.sensitivity || record.sensitivity === filter.sensitivity)
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  }

  async appendEvent(event: MemoryLedgerEvent): Promise<MemoryLedgerEvent> {
    this.events.push(event);
    return event;
  }

  async listEvents(filter: MemoryLedgerEventFilter = {}): Promise<MemoryLedgerEvent[]> {
    return sortEvents(
      this.events
        .filter((event) => !filter.memoryId || event.memoryId === filter.memoryId)
        .filter((event) => !filter.proposalId || event.proposalId === filter.proposalId)
        .filter((event) => !filter.evidenceId || event.evidenceId === filter.evidenceId)
    );
  }
}

export class MemoryLedger {
  private readonly proposalDecisionLocks = new Map<string, Promise<void>>();

  constructor(
    private readonly options: {
      memoryStore: MemoryStore;
      ledgerStore: MemoryLedgerStore;
      evidenceVault?: {
        xenesisHome: string;
      };
    }
  ) {}

  async listRecords(filter: MemoryLedgerListFilter = {}): Promise<MemoryRecord[]> {
    const at = filter.at ?? new Date().toISOString();
    const records = (await this.options.memoryStore.list())
      .filter((record) => (filter.includeArchived ? true : activeByDefault(record)))
      .filter((record) => validAtFilter(record, at, filter.includeHistorical))
      .filter((record) => !filter.status || (record.status ?? "active") === filter.status)
      .filter((record) => !filter.tag || record.tags.includes(filter.tag))
      .filter((record) => !filter.source || record.source === filter.source);
    return sortCurrentBeforeHistorical(records, at);
  }

  async searchRecords(query: MemoryLedgerSearchQuery): Promise<MemoryRecord[]> {
    const limit = query.limit ?? 10;
    const at = query.at ?? new Date().toISOString();
    return sortCurrentBeforeHistorical(
      (await this.options.memoryStore.search(query.query))
      .filter((record) => (query.includeArchived ? true : activeByDefault(record)))
        .filter((record) => validAtFilter(record, at, query.includeHistorical)),
      at
    ).slice(0, limit);
  }

  async getRecord(id: string): Promise<MemoryRecord | undefined> {
    return this.options.memoryStore.get(id);
  }

  async history(target: MemoryLedgerEventFilter): Promise<MemoryLedgerEvent[]> {
    return this.options.ledgerStore.listEvents(target);
  }

  async createProposal(
    input: MemoryInput,
    context: MemoryWriteContext,
    decisionOverride?: MemoryWriteDecision,
  ): Promise<MemoryProposal> {
    const proposalContext = defaultMemoryWriteContext(context);
    const timestamp = nowIso(proposalContext);
    const normalizedInput = normalizeGovernedMemoryInput(input);
    const decision = decisionOverride ?? classifyMemoryWrite(normalizedInput, { ...proposalContext, intent: proposalContext.intent ?? "propose" });
    const proposal: MemoryProposal = {
      id: createMemoryProposalId(),
      status: "pending",
      input: normalizedInput,
      decision: { ...decision, requiresApproval: true },
      context: proposalContext,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await this.options.ledgerStore.saveProposal(proposal);
    await this.options.ledgerStore.appendEvent({
      id: createMemoryLedgerEventId(),
      type: "proposal_created",
      targetType: "proposal",
      targetId: proposal.id,
      proposalId: proposal.id,
      actor: proposalContext.actor,
      createdAt: timestamp,
      reason: proposal.decision.reason
    });
    return proposal;
  }

  async listProposals(filter: MemoryProposalFilter = {}): Promise<MemoryProposal[]> {
    return this.options.ledgerStore.listProposals(filter);
  }

  async getProposal(id: string): Promise<MemoryProposal | undefined> {
    return this.options.ledgerStore.getProposal(id);
  }

  async listEvidence(filter: MemoryEvidenceFilter = {}): Promise<MemoryEvidenceRecord[]> {
    return this.options.ledgerStore.listEvidence(filter);
  }

  async getEvidence(id: string): Promise<MemoryEvidenceRecord | undefined> {
    return this.options.ledgerStore.getEvidence(id);
  }

  async recordEvidence(
    input: Omit<MemoryEvidenceRecord, "createdAt"> & Partial<Pick<MemoryEvidenceRecord, "createdAt" | "updatedAt" | "status">>,
    context: MemoryWriteContext,
  ): Promise<MemoryEvidenceRecord> {
    if (!input.contentHash) throw new Error("evidence contentHash required");
    assertMemoryEvidenceContentHash(input.contentHash);
    const normalizedContext = defaultMemoryWriteContext(context);
    const timestamp = nowIso(normalizedContext);
    const evidence: MemoryEvidenceRecord = {
      ...input,
      status: input.status ?? "active",
      createdAt: input.createdAt ?? timestamp,
      updatedAt: input.updatedAt ?? timestamp
    };
    await this.verifyEvidenceSnapshot(evidence);
    await this.options.ledgerStore.saveEvidence(evidence);
    await this.options.ledgerStore.appendEvent({
      id: createMemoryLedgerEventId(),
      type: "evidence_recorded",
      targetType: "evidence",
      targetId: evidence.id,
      evidenceId: evidence.id,
      actor: normalizedContext.actor,
      createdAt: timestamp,
      reason: sanitizedLedgerReason(normalizedContext.reason, "evidence recorded"),
      metadata: { after: evidenceEventSnapshot(evidence) }
    });
    return evidence;
  }

  async maskEvidence(id: string, context: MemoryWriteContext): Promise<MemoryEvidenceRecord> {
    const normalizedContext = defaultMemoryWriteContext(context);
    const timestamp = nowIso(normalizedContext);
    const before = await this.options.ledgerStore.getEvidence(id);
    if (!before) throw new Error(`Memory evidence not found: ${id}`);
    if ((before.status ?? "active") === "deleted") throw new Error(`Memory evidence is deleted: ${id}`);
    const masked = await this.options.ledgerStore.updateEvidence(id, (current) => ({
      ...current,
      status: "masked",
      updatedAt: timestamp,
      source: "[masked]",
      summary: "[masked]",
      uri: undefined,
      metadata: { masked: true }
    }));
    await this.options.ledgerStore.appendEvent({
      id: createMemoryLedgerEventId(),
      type: "evidence_masked",
      targetType: "evidence",
      targetId: id,
      evidenceId: id,
      actor: normalizedContext.actor,
      createdAt: timestamp,
      reason: sanitizedLedgerReason(normalizedContext.reason, "evidence masked"),
      metadata: { before: evidenceEventSnapshot(before), after: evidenceEventSnapshot(masked) }
    });
    return masked;
  }

  async deleteEvidence(id: string, context: MemoryWriteContext): Promise<MemoryEvidenceRecord> {
    const normalizedContext = defaultMemoryWriteContext(context);
    const timestamp = nowIso(normalizedContext);
    const before = await this.options.ledgerStore.getEvidence(id);
    if (!before) throw new Error(`Memory evidence not found: ${id}`);
    const deleted = await this.options.ledgerStore.updateEvidence(id, (current) => ({
      ...current,
      status: "deleted",
      updatedAt: timestamp,
      source: "[deleted]",
      summary: "[deleted]",
      contentHash: undefined,
      uri: undefined,
      metadata: { deleted: true }
    }));
    await this.options.ledgerStore.appendEvent({
      id: createMemoryLedgerEventId(),
      type: "evidence_deleted",
      targetType: "evidence",
      targetId: id,
      evidenceId: id,
      actor: normalizedContext.actor,
      createdAt: timestamp,
      reason: sanitizedLedgerReason(normalizedContext.reason, "evidence deleted"),
      metadata: { before: evidenceEventSnapshot(before), after: evidenceEventSnapshot(deleted) }
    });
    return deleted;
  }

  classifyMemoryWrite(input: MemoryInput, context: MemoryWriteContext): MemoryWriteDecision {
    return classifyMemoryWrite(input, defaultMemoryWriteContext(context));
  }

  async write(input: MemoryInput, context: MemoryWriteContext): Promise<MemoryWriteResult> {
    const normalizedContext = defaultMemoryWriteContext(context);
    const timestamp = nowIso(normalizedContext);
    const normalizedInput = normalizeGovernedMemoryInput(input);
    const conflictAt = normalizedInput.validFrom ?? timestamp;
    const conflicts = findTemporalConflicts(normalizedInput, await this.listRecords({ at: conflictAt }), conflictAt);
    const conflictIds = unique([...(normalizedInput.conflictsWith ?? []), ...conflicts.map((conflict) => conflict.existingId)]);
    const inputWithConflicts = conflictIds.length > 0 ? { ...normalizedInput, conflictsWith: conflictIds } : normalizedInput;
    const decision = classifyMemoryWrite(inputWithConflicts, normalizedContext);
    if (decision.action === "propose") {
      const proposal = await this.createProposal(inputWithConflicts, normalizedContext, decision);
      if (conflicts.length > 0) {
        await this.options.ledgerStore.appendEvent({
          id: createMemoryLedgerEventId(),
          type: "conflict_detected",
          targetType: "proposal",
          targetId: proposal.id,
          proposalId: proposal.id,
          actor: normalizedContext.actor,
          createdAt: timestamp,
          reason: "temporal conflict detected",
          metadata: { conflicts }
        });
      }
      return { status: "proposed", proposal, decision };
    }

    const evidenceAttachment = await this.resolveMemoryEvidenceAttachment(inputWithConflicts, normalizedContext);
    assertNoSameIdOverwrite(await this.options.memoryStore.get(inputWithConflicts.id), inputWithConflicts);
    const record = await this.options.memoryStore.upsert({
      ...inputWithConflicts,
      ...evidenceAttachment,
      status: "active",
      sensitivity: decision.sensitivity,
      createdAt: inputWithConflicts.createdAt ?? timestamp,
      source: inputWithConflicts.source ?? normalizedContext.sourceKind
    });
    const event = await this.options.ledgerStore.appendEvent({
      id: createMemoryLedgerEventId(),
      type: "memory_accepted",
      targetType: "memory",
      targetId: record.id,
      memoryId: record.id,
      actor: normalizedContext.actor,
      createdAt: timestamp,
      reason: decision.reason,
      metadata: { sourceKind: normalizedContext.sourceKind, runtime: normalizedContext.runtime, ...evidenceAttachment }
    });
    return { status: "accepted", record, event, decision };
  }

  async supersedeRecord(
    baseId: string,
    replacement: MemoryInput,
    context: MemoryWriteContext,
  ): Promise<MemorySupersedeResult> {
    const normalizedContext = defaultMemoryWriteContext(context);
    const timestamp = nowIso(normalizedContext);
    const base = await this.options.memoryStore.get(baseId);
    if (!base) throw new Error(`Memory record not found: ${baseId}`);
    if ((base.status ?? "active") === "archived") throw new Error(`Cannot supersede archived memory: ${baseId}`);
    if (base.supersededBy) throw new Error(`Memory record is already superseded: ${baseId}`);
    if (replacement.id === baseId) throw new Error("memory_cannot_supersede_itself");
    const effectiveAt = replacement.validFrom ?? timestamp;
    if (!Number.isFinite(Date.parse(effectiveAt))) throw new Error("invalid_valid_from");

    const normalizedReplacement = normalizeGovernedMemoryInput({
      ...replacement,
      validFrom: effectiveAt,
      supersedes: unique([...(replacement.supersedes ?? []), baseId]),
      supersedeMode: "full"
    });
    const previousNext = await this.options.memoryStore.get(normalizedReplacement.id);
    if (previousNext) throw new Error(`Replacement memory already exists: ${normalizedReplacement.id}`);
    assertTransitionBaseIsValid(base, effectiveAt);
    const decision = classifyMemoryWrite(normalizedReplacement, normalizedContext);
    if (decision.action === "propose") {
      const proposal = await this.createProposal(normalizedReplacement, normalizedContext, decision);
      return { status: "proposed", proposal, decision };
    }
    let next: MemoryRecord | undefined;
    try {
      const updatedBase = await this.options.memoryStore.upsert({
        ...base,
        validTo: effectiveAt,
        supersededBy: normalizedReplacement.id
      });
      const evidenceAttachment = await this.resolveMemoryEvidenceAttachment(normalizedReplacement, normalizedContext);
      next = await this.options.memoryStore.upsert({
        ...normalizedReplacement,
        ...evidenceAttachment,
        status: "active",
        sensitivity: decision.sensitivity,
        createdAt: normalizedReplacement.createdAt ?? timestamp,
        source: normalizedReplacement.source ?? normalizedContext.sourceKind
      });
      const event = await this.options.ledgerStore.appendEvent({
        id: createMemoryLedgerEventId(),
        type: "superseded",
        targetType: "memory",
        targetId: baseId,
        memoryId: baseId,
        actor: normalizedContext.actor,
        createdAt: timestamp,
        reason: normalizedContext.reason ?? "memory superseded",
        metadata: { supersededBy: next.id, validTo: effectiveAt }
      });
      await this.options.ledgerStore.appendEvent({
        id: createMemoryLedgerEventId(),
        type: "memory_accepted",
        targetType: "memory",
        targetId: next.id,
        memoryId: next.id,
        actor: normalizedContext.actor,
        createdAt: timestamp,
        reason: "superseding memory accepted",
        metadata: { supersedes: [baseId], supersedeMode: "full", ...evidenceAttachment }
      });
      return { status: "accepted", base: updatedBase, next, event, decision };
    } catch (error) {
      await this.rollbackTemporalTransition(base, normalizedReplacement.id, previousNext);
      throw error;
    }
  }

  async partiallySupersedeRecord(
    baseId: string,
    exception: MemoryInput,
    context: MemoryWriteContext,
  ): Promise<MemorySupersedeResult> {
    const normalizedContext = defaultMemoryWriteContext(context);
    const timestamp = nowIso(normalizedContext);
    const base = await this.options.memoryStore.get(baseId);
    if (!base) throw new Error(`Memory record not found: ${baseId}`);
    if ((base.status ?? "active") === "archived") throw new Error(`Cannot partially supersede archived memory: ${baseId}`);
    if (base.supersededBy) throw new Error(`Memory record is already superseded: ${baseId}`);
    if (exception.id === baseId) throw new Error("memory_cannot_supersede_itself");
    const effectiveAt = exception.validFrom ?? timestamp;
    if (!Number.isFinite(Date.parse(effectiveAt))) throw new Error("invalid_valid_from");

    const patch = buildPartialSupersede(base, { ...exception, validFrom: effectiveAt });
    const previousNext = await this.options.memoryStore.get(patch.nextInput.id);
    if (previousNext) throw new Error(`Partial supersede memory already exists: ${patch.nextInput.id}`);
    assertTransitionBaseIsValid(base, effectiveAt);
    const nextInput = normalizeGovernedMemoryInput(patch.nextInput);
    const decision = classifyMemoryWrite(nextInput, normalizedContext);
    if (decision.action === "propose") {
      const proposal = await this.createProposal(nextInput, normalizedContext, decision);
      return { status: "proposed", proposal, decision };
    }
    let next: MemoryRecord | undefined;
    try {
      const updatedBase = await this.options.memoryStore.upsert({
        ...base,
        ...patch.basePatch
      });
      const evidenceAttachment = await this.resolveMemoryEvidenceAttachment(nextInput, normalizedContext);
      next = await this.options.memoryStore.upsert({
        ...nextInput,
        ...evidenceAttachment,
        status: "active",
        sensitivity: decision.sensitivity,
        createdAt: nextInput.createdAt ?? timestamp,
        source: nextInput.source ?? normalizedContext.sourceKind
      });
      const event = await this.options.ledgerStore.appendEvent({
        id: createMemoryLedgerEventId(),
        type: "partially_superseded",
        targetType: "memory",
        targetId: baseId,
        memoryId: baseId,
        actor: normalizedContext.actor,
        createdAt: timestamp,
        reason: normalizedContext.reason ?? "memory partially superseded",
        metadata: { partialSupersededBy: next.id, validFrom: effectiveAt }
      });
      await this.options.ledgerStore.appendEvent({
        id: createMemoryLedgerEventId(),
        type: "memory_accepted",
        targetType: "memory",
        targetId: next.id,
        memoryId: next.id,
        actor: normalizedContext.actor,
        createdAt: timestamp,
        reason: "partial superseding memory accepted",
        metadata: { supersedes: [baseId], supersedeMode: "partial", ...evidenceAttachment }
      });
      return { status: "accepted", base: updatedBase, next, event, decision };
    } catch (error) {
      await this.rollbackTemporalTransition(base, nextInput.id, previousNext);
      throw error;
    }
  }

  async propose(input: MemoryInput, context: MemoryWriteContext): Promise<MemoryProposal> {
    return this.createProposal(input, { ...defaultMemoryWriteContext(context), intent: "propose" });
  }

  async archive(id: string, context: MemoryWriteContext): Promise<MemoryLedgerEvent> {
    const normalizedContext = defaultMemoryWriteContext(context);
    const existing = await this.options.memoryStore.get(id);
    if (!existing) throw new Error(`Memory record not found: ${id}`);
    const timestamp = nowIso(normalizedContext);
    await this.options.memoryStore.upsert({
      ...existing,
      status: "archived",
      archivedAt: timestamp
    });
    return this.options.ledgerStore.appendEvent({
      id: createMemoryLedgerEventId(),
      type: "memory_archived",
      targetType: "memory",
      targetId: id,
      memoryId: id,
      actor: normalizedContext.actor,
      createdAt: timestamp,
      reason: normalizedContext.reason ?? "archive"
    });
  }

  async archiveRecord(id: string, context: MemoryWriteContext): Promise<MemoryArchiveResult> {
    const event = await this.archive(id, context);
    const record = await this.options.memoryStore.get(id);
    if (!record) throw new Error(`Memory record not found after archive: ${id}`);
    return { event, record };
  }

  async recordGraphProjection(input: {
    memoryId: string;
    projectionId: string;
    endpoint: string;
    evidenceIds?: string[];
    createdAt?: string;
  }): Promise<MemoryLedgerEvent> {
    const record = await this.options.memoryStore.get(input.memoryId);
    if (!record) throw new Error(`Memory record not found: ${input.memoryId}`);
    const createdAt = input.createdAt ?? new Date().toISOString();
    return this.options.ledgerStore.appendEvent({
      id: createMemoryLedgerEventId(),
      type: "graph_projected",
      targetType: "memory",
      targetId: input.memoryId,
      memoryId: input.memoryId,
      actor: "system",
      createdAt,
      reason: "memory graph projected",
      metadata: {
        projectionId: input.projectionId,
        endpoint: input.endpoint,
        evidenceIds: input.evidenceIds ?? []
      }
    });
  }

  async acceptProposal(id: string, proof: MemoryApprovalProof): Promise<MemoryWriteResult> {
    return this.withProposalDecisionLock(id, () => this.acceptProposalLocked(id, proof));
  }

  async rejectProposal(id: string, proof: MemoryApprovalProof): Promise<MemoryProposal> {
    return this.withProposalDecisionLock(id, () => this.rejectProposalLocked(id, proof));
  }

  private async withProposalDecisionLock<T>(id: string, task: () => Promise<T>): Promise<T> {
    const previous = this.proposalDecisionLocks.get(id) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.catch(() => undefined).then(() => gate);
    this.proposalDecisionLocks.set(id, tail);
    await previous.catch(() => undefined);
    try {
      return await task();
    } finally {
      release();
      if (this.proposalDecisionLocks.get(id) === tail) this.proposalDecisionLocks.delete(id);
    }
  }

  private async acceptProposalLocked(id: string, proof: MemoryApprovalProof): Promise<MemoryWriteResult> {
    if (!proof) throw new Error("approval_proof_required");
    const approvalProof = assertValidMemoryApprovalProof(proof, "approve", "xd.memory.proposals.accept");
    const proposal = await this.options.ledgerStore.getProposal(id);
    if (!proposal) throw new Error(`Memory proposal not found: ${id}`);
    if (proposal.status !== "pending") throw new Error(`Memory proposal is already ${proposal.status}: ${id}`);
    if (proposal.operation && proposal.operation !== "write") {
      throw new Error(`unsupported_memory_proposal_operation: ${proposal.operation}`);
    }

    const normalizedContext = defaultMemoryWriteContext({ ...proposal.context, intent: "save" });
    const timestamp = nowIso(normalizedContext);
    const normalizedInput = normalizeGovernedMemoryInput(proposal.input);
    const classified = classifyMemoryWrite(normalizedInput, normalizedContext);
    if (/poison|quarantine/i.test(classified.reason)) {
      throw new Error(`poisoning_quarantine_cannot_be_accepted: ${classified.reason}`);
    }
    const decision: MemoryWriteDecision = {
      ...classified,
      action: "accept",
      requiresApproval: false,
      reason: `approved proposal: ${classified.reason}`
    };
    const previousRecord = await this.options.memoryStore.get(normalizedInput.id);
    assertNoSameIdOverwrite(previousRecord, normalizedInput);
    const temporalBaseId = normalizedInput.supersedes?.[0];
    const previousBase = temporalBaseId ? await this.options.memoryStore.get(temporalBaseId) : undefined;
    let record: MemoryRecord | undefined;
    try {
      const temporalEvent = temporalBaseId
        ? await this.applyAcceptedProposalTemporalTransition({
          baseId: temporalBaseId,
          input: normalizedInput,
          timestamp,
          actor: normalizedContext.actor
        })
        : undefined;
      const evidenceAttachment = await this.resolveMemoryEvidenceAttachment(normalizedInput, normalizedContext);
      record = await this.options.memoryStore.upsert({
        ...normalizedInput,
        ...evidenceAttachment,
        status: "active",
        sensitivity: decision.sensitivity,
        createdAt: normalizedInput.createdAt ?? proposal.createdAt,
        source: normalizedInput.source ?? normalizedContext.sourceKind
      });
      if (temporalEvent) {
        await this.options.ledgerStore.appendEvent(temporalEvent);
      }
      const acceptedProposal = await this.options.ledgerStore.updateProposal(proposal.id, (current) => {
        if (current.status !== "pending") throw new Error(`Memory proposal is already ${current.status}: ${proposal.id}`);
        return {
          ...current,
          status: "accepted",
          decision,
          memoryId: record!.id,
          resolvedAt: timestamp,
          updatedAt: timestamp,
          reason: approvalProof.approvalId
        };
      });
      await this.options.ledgerStore.appendEvent({
        id: createMemoryLedgerEventId(),
        type: "proposal_accepted",
        targetType: "proposal",
        targetId: proposal.id,
        proposalId: proposal.id,
        memoryId: record.id,
        actor: normalizedContext.actor,
        createdAt: timestamp,
        reason: `approved by ${approvalProof.approvedBy}`,
        metadata: { approvalId: approvalProof.approvalId, path: approvalProof.path, argsHash: approvalProof.argsHash }
      });
      const event = await this.options.ledgerStore.appendEvent({
        id: createMemoryLedgerEventId(),
        type: "memory_accepted",
        targetType: "memory",
        targetId: record.id,
        memoryId: record.id,
        proposalId: proposal.id,
        actor: normalizedContext.actor,
        createdAt: timestamp,
        reason: decision.reason,
        metadata: {
          sourceKind: normalizedContext.sourceKind,
          runtime: normalizedContext.runtime,
          approvalId: approvalProof.approvalId,
          ...evidenceAttachment
        }
      });
      return { status: "accepted", record, proposal: acceptedProposal, event, decision };
    } catch (error) {
      if (previousBase) {
        await this.options.memoryStore.upsert(previousBase).catch(() => undefined);
      }
      await this.rollbackAcceptedMemory(normalizedInput.id, previousRecord);
      throw error;
    }
  }

  private async rejectProposalLocked(id: string, proof: MemoryApprovalProof): Promise<MemoryProposal> {
    if (!proof) throw new Error("approval_proof_required");
    const approvalProof = assertValidMemoryApprovalProof(proof, "reject", "xd.memory.proposals.reject");
    const proposal = await this.options.ledgerStore.getProposal(id);
    if (!proposal) throw new Error(`Memory proposal not found: ${id}`);
    if (proposal.status !== "pending") throw new Error(`Memory proposal is already ${proposal.status}: ${id}`);

    const timestamp = nowIso(proposal.context);
    const rejectedProposal = await this.options.ledgerStore.updateProposal(proposal.id, (current) => {
      if (current.status !== "pending") throw new Error(`Memory proposal is already ${current.status}: ${proposal.id}`);
      return {
        ...current,
        status: "rejected",
        resolvedAt: timestamp,
        updatedAt: timestamp,
        reason: approvalProof.approvalId
      };
    });
    await this.options.ledgerStore.appendEvent({
      id: createMemoryLedgerEventId(),
      type: "proposal_rejected",
      targetType: "proposal",
      targetId: proposal.id,
      proposalId: proposal.id,
      actor: proposal.context.actor,
      createdAt: timestamp,
      reason: `rejected by ${approvalProof.approvedBy}`,
      metadata: { approvalId: approvalProof.approvalId, path: approvalProof.path, argsHash: approvalProof.argsHash }
    });
    return rejectedProposal;
  }

  private async resolveMemoryEvidenceAttachment(
    input: MemoryInput,
    context: MemoryWriteContext,
  ): Promise<Pick<MemoryRecord, "evidenceIds"> | Pick<MemoryRecord, "noEvidenceReason">> {
    const evidenceIds = unique([...(input.evidenceIds ?? []), ...(context.evidenceIds ?? [])].filter((id) => id.trim()));
    if (evidenceIds.length > 0) {
      for (const evidenceId of evidenceIds) {
        const evidence = await this.options.ledgerStore.getEvidence(evidenceId);
        if (!evidence) throw new Error(`Memory evidence not found: ${evidenceId}`);
        if ((evidence.status ?? "active") !== "active") {
          throw new Error(`Memory evidence is not active: ${evidenceId}`);
        }
        await this.verifyEvidenceSnapshot(evidence);
      }
      return { evidenceIds };
    }
    return {
      noEvidenceReason:
        input.noEvidenceReason?.trim() || `trusted ${context.sourceKind} without durable evidence`
    };
  }

  private async rollbackAcceptedMemory(id: string, previousRecord: MemoryRecord | undefined): Promise<void> {
    try {
      if (previousRecord) {
        await this.options.memoryStore.upsert(previousRecord);
      } else {
        await this.options.memoryStore.remove(id);
      }
    } catch {
      // Best-effort compensation: preserve the original failure.
    }
  }

  private async applyAcceptedProposalTemporalTransition(input: {
    baseId: string;
    input: MemoryInput;
    timestamp: string;
    actor: MemoryActor;
  }): Promise<MemoryLedgerEvent | undefined> {
    const base = await this.options.memoryStore.get(input.baseId);
    if (!base) throw new Error(`Memory record not found: ${input.baseId}`);
    if ((base.status ?? "active") === "archived") throw new Error(`Cannot supersede archived memory: ${input.baseId}`);
    if (base.supersededBy) throw new Error(`Memory record is already superseded: ${input.baseId}`);
    const effectiveAt = input.input.validFrom ?? input.timestamp;
    assertTransitionBaseIsValid(base, effectiveAt);

    if (input.input.supersedeMode === "full") {
      await this.options.memoryStore.upsert({
        ...base,
        validTo: effectiveAt,
        supersededBy: input.input.id
      });
      return {
        id: createMemoryLedgerEventId(),
        type: "superseded",
        targetType: "memory",
        targetId: input.baseId,
        memoryId: input.baseId,
        actor: input.actor,
        createdAt: input.timestamp,
        reason: "approved proposal superseded memory",
        metadata: { supersededBy: input.input.id, validTo: effectiveAt }
      };
    }

    if (input.input.supersedeMode === "partial") {
      const partialSupersededBy = unique([...(base.partialSupersededBy ?? []), input.input.id]);
      await this.options.memoryStore.upsert({
        ...base,
        partialSupersededBy
      });
      return {
        id: createMemoryLedgerEventId(),
        type: "partially_superseded",
        targetType: "memory",
        targetId: input.baseId,
        memoryId: input.baseId,
        actor: input.actor,
        createdAt: input.timestamp,
        reason: "approved proposal partially superseded memory",
        metadata: { partialSupersededBy: input.input.id, validFrom: effectiveAt }
      };
    }

    return undefined;
  }

  private async verifyEvidenceSnapshot(evidence: MemoryEvidenceRecord): Promise<void> {
    if (!this.options.evidenceVault || !evidence.contentHash) return;
    const content = await readMemoryEvidenceSnapshot({
      xenesisHome: this.options.evidenceVault.xenesisHome,
      contentHash: evidence.contentHash
    });
    const actualHash = hashMemoryEvidenceContent(content);
    if (actualHash !== evidence.contentHash) {
      throw new Error(`Memory evidence snapshot hash mismatch: ${evidence.id}`);
    }
  }

  private async rollbackTemporalTransition(
    previousBase: MemoryRecord,
    nextId: string,
    previousNext: MemoryRecord | undefined,
  ): Promise<void> {
    try {
      await this.options.memoryStore.upsert({
        ...previousBase,
        validTo: previousBase.validTo,
        supersededBy: previousBase.supersededBy,
        partialSupersededBy: previousBase.partialSupersededBy,
        supersedes: previousBase.supersedes,
        supersedeMode: previousBase.supersedeMode
      });
      if (previousNext) {
        await this.options.memoryStore.upsert(previousNext);
      } else {
        await this.options.memoryStore.remove(nextId);
      }
    } catch {
      // Best-effort compensation: preserve the original failure.
    }
  }
}
