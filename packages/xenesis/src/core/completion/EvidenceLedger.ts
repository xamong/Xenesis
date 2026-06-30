import type { CompletionClaimType, CompletionEvidenceKind, CompletionSemanticResult } from './CompletionReport.js';

export interface AppendEvidenceRecord {
  claimType: CompletionClaimType;
  evidenceKind: CompletionEvidenceKind;
  commandExit?: number;
  semanticResult?: CompletionSemanticResult;
  coveredPaths?: string[];
  sourceToolCallId?: string;
  isSyntheticRepairEvidence?: boolean;
}

export interface EvidenceRecord extends Required<Pick<AppendEvidenceRecord, 'isSyntheticRepairEvidence'>> {
  id: string;
  claimType: CompletionClaimType;
  evidenceKind: CompletionEvidenceKind;
  commandExit?: number;
  semanticResult: CompletionSemanticResult;
  coveredPaths: string[];
  mutationSeq: number;
  verificationSeq: number;
  freshAfterLastMutation: boolean;
  sourceToolCallId?: string;
}

function successfulEvidence(record: EvidenceRecord): boolean {
  if (record.isSyntheticRepairEvidence) return false;
  if (record.semanticResult !== 'passed') return false;
  if (record.commandExit !== undefined && record.commandExit !== 0) return false;
  return record.freshAfterLastMutation;
}

export class EvidenceLedger {
  private readonly records: EvidenceRecord[] = [];
  private mutationSeq = 0;
  private verificationSeq = 0;

  append(record: AppendEvidenceRecord): EvidenceRecord {
    if (record.evidenceKind === 'mutation') this.mutationSeq += 1;
    if (record.evidenceKind === 'verification') this.verificationSeq += 1;

    const next: EvidenceRecord = {
      id: `evidence:${this.records.length + 1}`,
      claimType: record.claimType,
      evidenceKind: record.evidenceKind,
      ...(record.commandExit !== undefined ? { commandExit: record.commandExit } : {}),
      semanticResult: record.semanticResult ?? 'passed',
      coveredPaths: [...(record.coveredPaths ?? [])],
      mutationSeq: this.mutationSeq,
      verificationSeq: this.verificationSeq,
      freshAfterLastMutation: true,
      ...(record.sourceToolCallId ? { sourceToolCallId: record.sourceToolCallId } : {}),
      isSyntheticRepairEvidence: record.isSyntheticRepairEvidence ?? false,
    };
    this.records.push(next);
    return structuredClone(next);
  }

  appendMutation(record: Omit<AppendEvidenceRecord, 'evidenceKind'> & { evidenceKind?: 'mutation' }): EvidenceRecord {
    return this.append({ ...record, evidenceKind: 'mutation' });
  }

  appendVerification(
    record: Omit<AppendEvidenceRecord, 'evidenceKind'> & { evidenceKind?: 'verification' },
  ): EvidenceRecord {
    return this.append({ ...record, evidenceKind: 'verification' });
  }

  snapshot(): EvidenceRecord[] {
    const latestMutationSeq = this.mutationSeq;
    return this.records.map((record) => ({
      ...structuredClone(record),
      freshAfterLastMutation: record.evidenceKind === 'mutation' || record.mutationSeq === latestMutationSeq,
    }));
  }

  latestSuccessfulEvidenceFor(claimType: CompletionClaimType): EvidenceRecord | undefined {
    return this.snapshot()
      .filter((record) => record.claimType === claimType)
      .reverse()
      .find(successfulEvidence);
  }
}
