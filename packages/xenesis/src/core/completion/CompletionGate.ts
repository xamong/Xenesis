import { auditCompletionClaims, type ClaimAuditReport, type CompletionClaim } from './ClaimAuditor.js';
import type { CompletionReport } from './CompletionReport.js';
import type { EvidenceRecord } from './EvidenceLedger.js';

export interface CompletionGateInput {
  claims: CompletionClaim[];
  evidence: EvidenceRecord[];
  pendingApprovalCount?: number;
  unresolvedRequiredTaskCount?: number;
  runtimeError?: string;
}

export interface CompletionGateReport extends CompletionReport {
  claimAudit: ClaimAuditReport;
}

function emptyClaimAudit(input: CompletionGateInput): ClaimAuditReport {
  return auditCompletionClaims({
    claims: input.claims,
    evidence: input.evidence,
  });
}

function countReason(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function failedVerificationEvidence(evidence: EvidenceRecord[]): EvidenceRecord | undefined {
  return [...evidence]
    .reverse()
    .find(
      (record) =>
        record.freshAfterLastMutation &&
        record.evidenceKind === 'verification' &&
        (record.semanticResult === 'failed' || (record.commandExit !== undefined && record.commandExit !== 0)),
    );
}

export function evaluateCompletionGate(input: CompletionGateInput): CompletionGateReport {
  if (input.runtimeError) {
    return {
      status: 'failed_runtime_error',
      reasons: [input.runtimeError],
      claimAudit: emptyClaimAudit(input),
    };
  }

  const pendingApprovalCount = input.pendingApprovalCount ?? 0;
  if (pendingApprovalCount > 0) {
    return {
      status: 'stopped_user_input_required',
      reasons: [
        countReason(
          pendingApprovalCount,
          'pending approval requires user input',
          'pending approvals require user input',
        ),
      ],
      claimAudit: emptyClaimAudit(input),
    };
  }

  const unresolvedRequiredTaskCount = input.unresolvedRequiredTaskCount ?? 0;
  if (unresolvedRequiredTaskCount > 0) {
    return {
      status: 'blocked_external_dependency',
      reasons: [
        countReason(
          unresolvedRequiredTaskCount,
          'required durable task is unresolved',
          'required durable tasks are unresolved',
        ),
      ],
      claimAudit: emptyClaimAudit(input),
    };
  }

  const failedVerification = failedVerificationEvidence(input.evidence);
  if (failedVerification) {
    return {
      status: 'blocked_verification_failed',
      reasons: [`fresh verification evidence failed: ${failedVerification.id}`],
      claimAudit: emptyClaimAudit(input),
    };
  }

  const claimAudit = auditCompletionClaims({
    claims: input.claims,
    evidence: input.evidence,
  });
  if (!claimAudit.ok) {
    return {
      status: 'completed_unverified',
      reasons: [
        `unsupported completion claims: ${claimAudit.unsupportedClaims.map((claim) => claim.reason).join('; ')}`,
      ],
      claimAudit,
    };
  }

  if (input.claims.length === 0) {
    return {
      status: 'completed_unverified',
      reasons: ['no completion claims require verification'],
      claimAudit,
    };
  }

  return {
    status: 'completed_verified',
    reasons: ['all completion claims are supported by fresh evidence'],
    claimAudit,
  };
}
