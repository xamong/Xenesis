import type { GraphitiMemorySearchResult } from './graphitiMemoryAdapter.js';
import type { MemoryLedger } from './MemoryLedger.js';
import { scoreRecord } from './memory.js';
import {
  buildMemoryEvidencePack,
  classifyMemoryQueryIntent,
  type MemoryEvidencePack,
  type MemoryQueryIntent,
} from './memoryEvidencePack.js';
import { isMemoryValidAt } from './memoryTemporal.js';
import type { MemoryConflict, MemoryEvidenceRecord, MemoryProposal } from './memoryTypes.js';
import type { MemoryRecord } from './types.js';

export interface MemoryRetrievalPlannerInput {
  query: string;
  intent?: MemoryQueryIntent;
  at?: string;
  limit?: number;
  allowSensitive?: boolean;
}

export interface MemoryRetrievalGraphHook {
  enabled: boolean;
  search(
    query: string,
    options: { intent: MemoryQueryIntent; at: string; limit: number },
  ): Promise<GraphitiMemorySearchResult[]>;
}

export interface MemoryRetrievalPlannerOptions {
  ledger: MemoryLedger;
  graph?: MemoryRetrievalGraphHook;
}

function proposalRecord(proposal: MemoryProposal): MemoryRecord {
  return {
    id: proposal.input.id,
    text: proposal.input.text,
    tags: proposal.input.tags ?? [],
    source: proposal.context.sourceKind,
    priority: proposal.input.priority,
    updatedAt: proposal.updatedAt,
    createdAt: proposal.createdAt,
    sensitivity: proposal.decision.sensitivity,
  };
}

function matchesProposal(proposal: MemoryProposal, query: string): boolean {
  return scoreRecord(proposalRecord(proposal), query) > 0;
}

function includeHistoricalFor(intent: MemoryQueryIntent): boolean {
  return intent === 'temporal_change' || intent === 'project_history' || intent === 'decision';
}

function conflictsFromRecords(records: MemoryRecord[], at: string): MemoryConflict[] {
  return records.flatMap((record) =>
    (record.conflictsWith ?? []).map((existingId) => ({
      candidateId: record.id,
      existingId,
      severity: 'declared' as const,
      reason: 'record conflictsWith',
      at: record.validFrom ?? record.updatedAt ?? at,
    })),
  );
}

export class MemoryRetrievalPlanner {
  private readonly ledger: MemoryLedger;
  private readonly graph?: MemoryRetrievalGraphHook;

  constructor(ledgerOrOptions: MemoryLedger | MemoryRetrievalPlannerOptions) {
    if ('ledger' in ledgerOrOptions) {
      this.ledger = ledgerOrOptions.ledger;
      this.graph = ledgerOrOptions.graph;
    } else {
      this.ledger = ledgerOrOptions;
    }
  }

  async retrieve(input: MemoryRetrievalPlannerInput): Promise<MemoryEvidencePack> {
    const intent = input.intent ?? classifyMemoryQueryIntent(input.query);
    const at = input.at ?? new Date().toISOString();
    const limit = input.limit ?? 8;
    const initialRecords = await this.ledger.searchRecords({
      query: input.query,
      at,
      includeHistorical: includeHistoricalFor(intent),
      limit,
    });
    const graphRecords = await this.retrieveGraphRecords(input.query, { intent, at, limit });
    const mergedRecords = this.mergeRecords(initialRecords, graphRecords);
    const records = (
      includeHistoricalFor(intent) ? await this.expandTemporalRelations(mergedRecords) : mergedRecords
    ).slice(0, Math.max(1, limit));
    const evidence = await this.collectEvidence(records);
    const proposals = (await this.ledger.listProposals({ status: 'pending' }))
      .filter((proposal) => matchesProposal(proposal, input.query))
      .slice(0, Math.max(1, limit));

    return buildMemoryEvidencePack({
      intent,
      query: input.query,
      records,
      evidence,
      conflicts: conflictsFromRecords(records, at),
      proposals,
      at,
      allowSensitive: input.allowSensitive ?? false,
    });
  }

  private mergeRecords(left: MemoryRecord[], right: MemoryRecord[]): MemoryRecord[] {
    const byId = new Map<string, MemoryRecord>();
    for (const record of [...left, ...right]) byId.set(record.id, record);
    return Array.from(byId.values());
  }

  private async retrieveGraphRecords(
    query: string,
    options: { intent: MemoryQueryIntent; at: string; limit: number },
  ): Promise<MemoryRecord[]> {
    if (!this.graph?.enabled) return [];
    try {
      const results = await this.graph.search(query, options);
      const records: MemoryRecord[] = [];
      const seen = new Set<string>();
      for (const result of results.slice(0, Math.max(1, options.limit))) {
        if (seen.has(result.memoryId)) continue;
        seen.add(result.memoryId);
        const record = await this.ledger.getRecord(result.memoryId);
        if (!record || (record.status ?? 'active') === 'archived') continue;
        if (!includeHistoricalFor(options.intent) && !isMemoryValidAt(record, options.at)) continue;
        records.push(record);
      }
      return records;
    } catch {
      return [];
    }
  }

  private async collectEvidence(records: MemoryRecord[]): Promise<MemoryEvidenceRecord[]> {
    const seen = new Set<string>();
    const evidence: MemoryEvidenceRecord[] = [];
    for (const record of records) {
      for (const evidenceId of record.evidenceIds ?? []) {
        if (seen.has(evidenceId)) continue;
        seen.add(evidenceId);
        const found = await this.ledger.getEvidence(evidenceId);
        if (!found || (found.status ?? 'active') !== 'active') continue;
        evidence.push(found);
      }
    }
    return evidence;
  }

  private async expandTemporalRelations(records: MemoryRecord[]): Promise<MemoryRecord[]> {
    const byId = new Map(records.map((record) => [record.id, record]));
    for (const record of records) {
      const relatedIds = [
        ...(record.supersedes ?? []),
        ...(record.partialSupersededBy ?? []),
        ...(record.supersededBy ? [record.supersededBy] : []),
      ];
      for (const id of relatedIds) {
        if (byId.has(id)) continue;
        const related = await this.ledger.getRecord(id);
        if (related) byId.set(id, related);
      }
    }
    return Array.from(byId.values());
  }
}
