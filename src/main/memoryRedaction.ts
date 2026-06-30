import {
  classifyMemorySensitivity,
  type MemoryEvidenceRecord,
  type MemoryInput,
  type MemoryLedgerEvent,
  type MemoryProposal,
  type MemoryRecord,
  type MemorySensitivity,
} from '../../packages/xenesis/src/extensions/index';

const SENSITIVITY_RANK: Record<MemorySensitivity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  restricted: 3,
};

function maxSensitivity(left: MemorySensitivity | undefined, right: MemorySensitivity | undefined): MemorySensitivity {
  const leftValue = left ?? 'low';
  const rightValue = right ?? 'low';
  return SENSITIVITY_RANK[rightValue] > SENSITIVITY_RANK[leftValue] ? rightValue : leftValue;
}

function isSensitiveMemory(sensitivity: unknown): boolean {
  return sensitivity === 'high' || sensitivity === 'restricted';
}

function classifyText(id: string, text: string, tags: string[] = []): MemorySensitivity {
  return classifyMemorySensitivity({ id, text, tags });
}

export function effectiveMemoryRecordSensitivity(record: MemoryRecord): MemorySensitivity {
  return maxSensitivity(
    record.sensitivity,
    classifyMemorySensitivity({
      id: record.id,
      text: [record.text, record.source ?? ''].join(' '),
      tags: record.tags,
      kind: record.kind,
      runbook: record.runbook,
    }),
  );
}

export function effectiveMemoryProposalSensitivity(proposal: MemoryProposal): MemorySensitivity {
  return maxSensitivity(
    maxSensitivity(proposal.decision.sensitivity, proposal.input.sensitivity),
    classifyMemorySensitivity({
      ...proposal.input,
      text: [proposal.input.text, proposal.input.source ?? ''].join(' '),
    }),
  );
}

export function effectiveMemoryEvidenceSensitivity(record: MemoryEvidenceRecord): MemorySensitivity {
  return maxSensitivity(
    record.sensitivity,
    classifyText(
      record.id,
      [
        record.source,
        record.summary ?? '',
        record.uri ?? '',
        record.contentHash ?? '',
        record.metadata ? JSON.stringify(record.metadata) : '',
      ].join(' '),
    ),
  );
}

export function redactMemoryRecordForCr(record: MemoryRecord): Record<string, unknown> {
  const { embedding: _embedding, ...safeRecord } = record;
  const sensitivity = effectiveMemoryRecordSensitivity(record);
  if (!isSensitiveMemory(sensitivity)) return { ...safeRecord, sensitivity };
  const { source: _source, runbook: _runbook, noEvidenceReason: _noEvidenceReason, ...redactedRecord } = safeRecord;
  return {
    ...redactedRecord,
    text: `[redacted: ${sensitivity} memory]`,
    tags: [],
    sensitivity,
    redacted: true,
  };
}

export function redactMemoryProposalForCr(proposal: MemoryProposal): MemoryProposal & { redacted?: boolean } {
  const sensitivity = effectiveMemoryProposalSensitivity(proposal);
  if (!isSensitiveMemory(sensitivity)) {
    return {
      ...proposal,
      decision: {
        ...proposal.decision,
        sensitivity,
      },
      input: {
        ...proposal.input,
        sensitivity,
      },
    };
  }
  const { source: _source, runbook: _runbook, noEvidenceReason: _noEvidenceReason, ...safeInput } = proposal.input;
  const input: MemoryInput = {
    ...safeInput,
    text: `[redacted: ${sensitivity} memory proposal]`,
    tags: [],
    sensitivity,
  };
  const { sourceId: _sourceId, reason: contextReason, ...safeContext } = proposal.context;
  return {
    ...proposal,
    input,
    decision: {
      ...proposal.decision,
      sensitivity,
    },
    context: {
      ...safeContext,
      ...(contextReason ? { reason: `[redacted: ${sensitivity} context reason]` } : {}),
    },
    redacted: true,
  };
}

export function redactMemoryEvidenceForCr(record: MemoryEvidenceRecord): MemoryEvidenceRecord & { redacted?: boolean } {
  const sensitivity = effectiveMemoryEvidenceSensitivity(record);
  if (!isSensitiveMemory(sensitivity)) {
    return {
      ...record,
      sensitivity,
    };
  }
  const { contentHash: _contentHash, uri: _uri, metadata: _metadata, ...safeRecord } = record;
  return {
    ...safeRecord,
    source: `[redacted: ${sensitivity} evidence source]`,
    summary: record.summary ? `[redacted: ${sensitivity} evidence summary]` : undefined,
    sensitivity,
    redacted: true,
  };
}

export function redactMemoryLedgerEventForCr(event: MemoryLedgerEvent): MemoryLedgerEvent {
  const { metadata: _metadata, reason: _reason, ...safeEvent } = event;
  return {
    ...safeEvent,
    ...(event.reason ? { reason: '[redacted: ledger event reason]' } : {}),
  };
}
