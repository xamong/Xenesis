import { openDatabase } from '../db/database.js';
import { TableStore } from '../db/tableStore.js';
import type {
  MemoryEvidenceFilter,
  MemoryEvidenceRecord,
  MemoryLedgerEvent,
  MemoryLedgerEventFilter,
  MemoryLedgerStore,
  MemoryProposal,
  MemoryProposalFilter,
} from './memoryTypes.js';

export class SqliteMemoryLedgerStore implements MemoryLedgerStore {
  private readonly proposals: TableStore<MemoryProposal>;
  private readonly evidence: TableStore<MemoryEvidenceRecord>;
  private readonly events: TableStore<MemoryLedgerEvent>;

  constructor(options: { xenesisHome: string }) {
    const db = openDatabase(options.xenesisHome);
    this.proposals = new TableStore<MemoryProposal>(db, {
      table: 'memory_proposals',
      id: (record) => record.id,
      indexColumns: ['status', 'created_at', 'updated_at'],
      derive: (record) => ({
        status: record.status,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      }),
    });
    this.evidence = new TableStore<MemoryEvidenceRecord>(db, {
      table: 'memory_evidence',
      id: (record) => record.id,
      indexColumns: ['kind', 'sensitivity', 'created_at'],
      derive: (record) => ({
        kind: record.kind,
        sensitivity: record.sensitivity,
        created_at: record.createdAt,
      }),
    });
    this.events = new TableStore<MemoryLedgerEvent>(db, {
      table: 'memory_ledger_events',
      id: (record) => record.id,
      indexColumns: ['target_id', 'memory_id', 'proposal_id', 'evidence_id', 'created_at'],
      derive: (record) => ({
        target_id: record.targetId,
        memory_id: record.memoryId ?? null,
        proposal_id: record.proposalId ?? null,
        evidence_id: record.evidenceId ?? null,
        created_at: record.createdAt,
      }),
    });
  }

  async saveProposal(proposal: MemoryProposal): Promise<MemoryProposal> {
    this.proposals.upsert(proposal);
    return proposal;
  }

  async updateProposal(id: string, mutate: (current: MemoryProposal) => MemoryProposal): Promise<MemoryProposal> {
    return this.proposals.updateOptimistic(id, mutate);
  }

  async getProposal(id: string): Promise<MemoryProposal | undefined> {
    return this.proposals.get(id);
  }

  async listProposals(filter: MemoryProposalFilter = {}): Promise<MemoryProposal[]> {
    const rows = filter.status ? this.proposals.list('status = ?', [filter.status]) : this.proposals.list();
    return rows.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  }

  async saveEvidence(evidence: MemoryEvidenceRecord): Promise<MemoryEvidenceRecord> {
    if (this.evidence.get(evidence.id)) throw new Error(`Memory evidence already exists: ${evidence.id}`);
    this.evidence.insert(evidence);
    return evidence;
  }

  async updateEvidence(
    id: string,
    mutate: (current: MemoryEvidenceRecord) => MemoryEvidenceRecord,
  ): Promise<MemoryEvidenceRecord> {
    return this.evidence.updateOptimistic(id, mutate);
  }

  async getEvidence(id: string): Promise<MemoryEvidenceRecord | undefined> {
    return this.evidence.get(id);
  }

  async listEvidence(filter: MemoryEvidenceFilter = {}): Promise<MemoryEvidenceRecord[]> {
    const clauses: string[] = [];
    const params: string[] = [];
    if (filter.kind) {
      clauses.push('kind = ?');
      params.push(filter.kind);
    }
    if (filter.sensitivity) {
      clauses.push('sensitivity = ?');
      params.push(filter.sensitivity);
    }
    const rows = this.evidence.list(clauses.join(' AND '), params);
    return rows.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  }

  async appendEvent(event: MemoryLedgerEvent): Promise<MemoryLedgerEvent> {
    this.events.insert(event);
    return event;
  }

  async listEvents(filter: MemoryLedgerEventFilter = {}): Promise<MemoryLedgerEvent[]> {
    const clauses: string[] = [];
    const params: string[] = [];
    if (filter.memoryId) {
      clauses.push('memory_id = ?');
      params.push(filter.memoryId);
    }
    if (filter.proposalId) {
      clauses.push('proposal_id = ?');
      params.push(filter.proposalId);
    }
    if (filter.evidenceId) {
      clauses.push('evidence_id = ?');
      params.push(filter.evidenceId);
    }
    const rows = this.events.list(clauses.join(' AND '), params);
    return rows.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  }
}
