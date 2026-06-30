import type { CompletionClaimType, CompletionEvidenceKind } from './CompletionReport.js';
import type { EvidenceRecord } from './EvidenceLedger.js';

export interface CompletionClaim {
  claimType: CompletionClaimType;
  text?: string;
}

export type CompletionClaimAuditStatus = 'supported' | 'unsupported';

export interface CompletionClaimAuditResult {
  claimType: CompletionClaimType;
  text?: string;
  status: CompletionClaimAuditStatus;
  reason: string;
  evidenceId?: string;
}

export interface ClaimAuditReport {
  ok: boolean;
  results: CompletionClaimAuditResult[];
  unsupportedClaims: CompletionClaimAuditResult[];
}

export interface AuditCompletionClaimsOptions {
  claims: CompletionClaim[];
  evidence: EvidenceRecord[];
}

function successfulEvidence(record: EvidenceRecord): boolean {
  if (!record.freshAfterLastMutation) return false;
  if (record.isSyntheticRepairEvidence) return false;
  if (record.semanticResult !== 'passed') return false;
  if (record.commandExit !== undefined && record.commandExit !== 0) return false;
  return true;
}

function supportedReason(claimType: CompletionClaimType): string {
  return `fresh successful ${claimType} evidence found`;
}

function unsupportedReason(claimType: CompletionClaimType): string {
  return `missing fresh successful ${claimType} evidence`;
}

function requiredEvidenceKind(claimType: CompletionClaimType): CompletionEvidenceKind {
  switch (claimType) {
    case 'edit':
      return 'mutation';
    case 'test':
    case 'verification':
      return 'verification';
    case 'browse':
      return 'browsing';
    case 'task_completion':
      return 'task';
  }
}

function findEvidence(claimType: CompletionClaimType, evidence: EvidenceRecord[]): EvidenceRecord | undefined {
  const evidenceKind = requiredEvidenceKind(claimType);
  return [...evidence]
    .reverse()
    .find(
      (record) => record.claimType === claimType && record.evidenceKind === evidenceKind && successfulEvidence(record),
    );
}

export function auditCompletionClaims(options: AuditCompletionClaimsOptions): ClaimAuditReport {
  const results = options.claims.map((claim): CompletionClaimAuditResult => {
    const evidence = findEvidence(claim.claimType, options.evidence);
    if (!evidence) {
      return {
        claimType: claim.claimType,
        ...(claim.text ? { text: claim.text } : {}),
        status: 'unsupported',
        reason: unsupportedReason(claim.claimType),
      };
    }

    return {
      claimType: claim.claimType,
      ...(claim.text ? { text: claim.text } : {}),
      status: 'supported',
      reason: supportedReason(claim.claimType),
      evidenceId: evidence.id,
    };
  });
  const unsupportedClaims = results.filter((result) => result.status === 'unsupported');

  return {
    ok: unsupportedClaims.length === 0,
    results,
    unsupportedClaims,
  };
}
