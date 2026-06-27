import {
  buildGraphitiMemoryPayload,
  classifyGraphitiMemoryRecordSensitivity,
  type GraphitiMemoryClient,
  type GraphitiMemoryConfig,
  validateGraphitiMemoryConfig
} from "./graphitiMemoryAdapter.js";
import type { MemoryLedger } from "./MemoryLedger.js";
import type { MemoryEvidenceRecord } from "./memoryTypes.js";
import type { MemoryRecord } from "./types.js";

export type MemoryGraphProjectionConfig = GraphitiMemoryConfig;

export interface MemoryGraphProjectionItem {
  memoryId: string;
  projectionId?: string;
}

export interface MemoryGraphProjectionSkip {
  memoryId: string;
  reason: "disabled" | "archived" | "sensitive";
}

export interface MemoryGraphProjectionFailure {
  memoryId: string;
  error: string;
}

export interface ProjectAcceptedMemoryRecordsInput {
  ledger: MemoryLedger;
  client: GraphitiMemoryClient;
  config: MemoryGraphProjectionConfig;
  at?: string;
  limit?: number;
}

export interface ProjectAcceptedMemoryRecordsResult {
  projected: MemoryGraphProjectionItem[];
  skipped: MemoryGraphProjectionSkip[];
  failed: MemoryGraphProjectionFailure[];
}

function isSensitive(value: ReturnType<typeof classifyGraphitiMemoryRecordSensitivity>): boolean {
  return value === "high" || value === "restricted";
}

function skippedReason(
  record: MemoryRecord,
  config: MemoryGraphProjectionConfig,
): MemoryGraphProjectionSkip["reason"] | undefined {
  if (!config.enabled) return "disabled";
  if ((record.status ?? "active") === "archived") return "archived";
  if (!config.allowSensitiveProjection && isSensitive(classifyGraphitiMemoryRecordSensitivity(record))) return "sensitive";
  return undefined;
}

async function collectRecordEvidence(
  ledger: MemoryLedger,
  record: MemoryRecord,
): Promise<MemoryEvidenceRecord[]> {
  const evidence: MemoryEvidenceRecord[] = [];
  for (const evidenceId of record.evidenceIds ?? []) {
    const found = await ledger.getEvidence(evidenceId);
    if (!found || (found.status ?? "active") !== "active") continue;
    evidence.push(found);
  }
  return evidence;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function projectAcceptedMemoryRecords(
  input: ProjectAcceptedMemoryRecordsInput,
): Promise<ProjectAcceptedMemoryRecordsResult> {
  const config = validateGraphitiMemoryConfig(input.config);
  const result: ProjectAcceptedMemoryRecordsResult = {
    projected: [],
    skipped: [],
    failed: []
  };
  if (!config.enabled) return result;
  const records = (await input.ledger.listRecords({
    includeHistorical: true,
    at: input.at ?? new Date().toISOString()
  })).slice(0, input.limit ?? Number.POSITIVE_INFINITY);

  for (const record of records) {
    const skip = skippedReason(record, config);
    if (skip) {
      result.skipped.push({ memoryId: record.id, reason: skip });
      continue;
    }
    try {
      const evidence = await collectRecordEvidence(input.ledger, record);
      const payload = buildGraphitiMemoryPayload(record, evidence, {
        redactEvidence: config.redactEvidence
      });
      const response = await input.client.projectMemory(payload);
      await input.ledger.recordGraphProjection({
        memoryId: record.id,
        projectionId: response.projectionId,
        endpoint: config.endpoint ?? "",
        evidenceIds: record.evidenceIds ?? [],
        ...(input.at ? { createdAt: input.at } : {})
      });
      result.projected.push({ memoryId: record.id, projectionId: response.projectionId });
    } catch (error) {
      result.failed.push({ memoryId: record.id, error: errorMessage(error) });
    }
  }

  return result;
}
