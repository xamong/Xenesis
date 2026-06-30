import type { MemoryInput, MemoryRecord } from './types.js';

export type MemoryKind = 'fact' | 'preference' | 'event' | 'decision' | 'procedure';
export type MemorySourceKind =
  | 'conversation'
  | 'workspace_file'
  | 'tool_result'
  | 'external_document'
  | 'manual_note'
  | 'legacy'
  | 'agent'
  | 'unknown';

export type MemoryTrustLevel = 'trusted' | 'unknown' | 'external_untrusted';
export type MemoryActor = 'user' | 'agent' | 'system';
export type MemorySensitivity = 'low' | 'medium' | 'high' | 'restricted';
export type MemoryWriteIntent = 'save' | 'propose' | 'delete';
export type MemoryWriteAction = 'accept' | 'propose';
export type MemoryProposalStatus = 'pending' | 'accepted' | 'rejected';
export type MemoryProposalOperation =
  | 'write'
  | 'archive'
  | 'merge'
  | 'demote'
  | 'conflict_resolution'
  | 'preference_extraction';
export type MemoryEvidenceStatus = 'active' | 'masked' | 'deleted';
export type MemoryEvidenceKind =
  | 'conversation'
  | 'workspace_file'
  | 'tool_result'
  | 'external_document'
  | 'manual_note';
export type MemoryLedgerEventType =
  | 'memory_accepted'
  | 'memory_archived'
  | 'memory_updated'
  | 'memory_accessed'
  | 'proposal_created'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'evidence_recorded'
  | 'evidence_masked'
  | 'evidence_deleted'
  | 'proposal_decision_blocked'
  | 'superseded'
  | 'partially_superseded'
  | 'conflict_detected'
  | 'validity_changed'
  | 'graph_projected';

export type MemoryRunbookPermissionLevel = 'read' | 'draft' | 'suggest' | 'execute_requires_approval';

export interface MemoryRunbook {
  trigger: string;
  steps: string[];
  preferredFormat: string[];
  evidenceRequired: string[];
  permissionLevel: MemoryRunbookPermissionLevel;
  lastUsedAt?: string;
  validFrom?: string;
  validTo?: string;
}

export interface MemoryWriteContext {
  sourceKind: MemorySourceKind;
  trust: MemoryTrustLevel;
  externalTaint: boolean;
  actor: MemoryActor;
  runtime: string;
  intent?: MemoryWriteIntent;
  sourceId?: string;
  evidenceIds?: string[];
  reason?: string;
  now?: () => Date;
}

export interface MemoryWriteDecision {
  action: MemoryWriteAction;
  sensitivity: MemorySensitivity;
  requiresApproval: boolean;
  reason: string;
}

export interface MemoryProposal {
  id: string;
  status: MemoryProposalStatus;
  input: MemoryInput;
  decision: MemoryWriteDecision;
  context: MemoryWriteContext;
  operation?: MemoryProposalOperation;
  createdAt: string;
  updatedAt: string;
  memoryId?: string;
  resolvedAt?: string;
  reason?: string;
}

export interface MemoryEvidenceRecord {
  id: string;
  kind: MemoryEvidenceKind;
  source: string;
  sensitivity: MemorySensitivity;
  createdAt: string;
  updatedAt?: string;
  status?: MemoryEvidenceStatus;
  summary?: string;
  contentHash?: string;
  uri?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryLedgerEvent {
  id: string;
  type: MemoryLedgerEventType;
  targetType: 'memory' | 'proposal' | 'evidence';
  targetId: string;
  createdAt: string;
  actor?: MemoryActor;
  memoryId?: string;
  proposalId?: string;
  evidenceId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryLedgerListFilter {
  includeArchived?: boolean;
  includeHistorical?: boolean;
  at?: string;
  status?: MemoryRecord['status'];
  tag?: string;
  source?: string;
}

export interface MemoryLedgerSearchQuery {
  query: string;
  includeArchived?: boolean;
  includeHistorical?: boolean;
  at?: string;
  limit?: number;
}

export interface MemoryProposalFilter {
  status?: MemoryProposalStatus;
}

export interface MemoryEvidenceFilter {
  kind?: MemoryEvidenceKind;
  sensitivity?: MemorySensitivity;
}

export interface MemoryLedgerEventFilter {
  memoryId?: string;
  proposalId?: string;
  evidenceId?: string;
}

export interface MemoryApprovalProof {
  kind: 'approval-proof';
  approvedBy: string;
  approvalId: string;
  action?: 'approve' | 'approve_always' | 'reject';
  path?: string;
  source?: string;
  argsHash?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface MemoryWriteResult {
  status: 'accepted' | 'proposed';
  record?: MemoryRecord;
  proposal?: MemoryProposal;
  event?: MemoryLedgerEvent;
  decision: MemoryWriteDecision;
}

export type MemorySupersedeResult =
  | {
      status: 'accepted';
      base: MemoryRecord;
      next: MemoryRecord;
      event: MemoryLedgerEvent;
      decision: MemoryWriteDecision;
    }
  | {
      status: 'proposed';
      proposal: MemoryProposal;
      decision: MemoryWriteDecision;
    };

export interface MemoryArchiveResult {
  event: MemoryLedgerEvent;
  record: MemoryRecord;
}

export interface MemoryLedgerStore {
  saveProposal(proposal: MemoryProposal): Promise<MemoryProposal>;
  updateProposal(id: string, mutate: (current: MemoryProposal) => MemoryProposal): Promise<MemoryProposal>;
  getProposal(id: string): Promise<MemoryProposal | undefined>;
  listProposals(filter?: MemoryProposalFilter): Promise<MemoryProposal[]>;
  saveEvidence(evidence: MemoryEvidenceRecord): Promise<MemoryEvidenceRecord>;
  updateEvidence(
    id: string,
    mutate: (current: MemoryEvidenceRecord) => MemoryEvidenceRecord,
  ): Promise<MemoryEvidenceRecord>;
  getEvidence(id: string): Promise<MemoryEvidenceRecord | undefined>;
  listEvidence(filter?: MemoryEvidenceFilter): Promise<MemoryEvidenceRecord[]>;
  appendEvent(event: MemoryLedgerEvent): Promise<MemoryLedgerEvent>;
  listEvents(filter?: MemoryLedgerEventFilter): Promise<MemoryLedgerEvent[]>;
}

export interface MemoryConflict {
  candidateId: string;
  existingId: string;
  severity: 'declared' | 'inferred';
  reason: string;
  at: string;
}

export interface MemorySupersedePatch {
  mode: 'full' | 'partial';
  basePatch: Partial<MemoryRecord> & { id: string };
  nextInput: MemoryInput;
}
