import {
  classifyMemoryEvidenceSensitivity,
  classifyMemorySensitivity
} from "./memoryPolicy.js";
import type { MemoryEvidenceRecord, MemorySensitivity } from "./memoryTypes.js";
import type { MemoryRecord } from "./types.js";

export interface GraphitiMemoryConfig {
  enabled: boolean;
  endpoint?: string;
  allowedEndpoints: string[];
  localOnly: boolean;
  allowSensitiveProjection: boolean;
  redactEvidence: boolean;
  timeoutMs: number;
}

export interface GraphitiMemoryEvidencePayload {
  id: string;
  kind: MemoryEvidenceRecord["kind"];
  sensitivity: MemoryEvidenceRecord["sensitivity"];
  status: MemoryEvidenceRecord["status"];
  contentHash?: string;
  summary?: string;
}

export interface GraphitiMemoryProjectionPayload {
  memoryId: string;
  text: string;
  tags: string[];
  sensitivity: MemorySensitivity;
  updatedAt: string;
  validFrom?: string;
  validTo?: string;
  supersedes?: string[];
  supersededBy?: string;
  supersedeMode?: MemoryRecord["supersedeMode"];
  evidenceIds: string[];
  evidence: GraphitiMemoryEvidencePayload[];
}

export interface GraphitiMemoryProjectionResponse {
  projectionId: string;
  metadata?: Record<string, unknown>;
}

export interface GraphitiMemorySearchResult {
  memoryId: string;
  projectionId?: string;
  evidenceIds?: string[];
  fact?: string;
  score?: number;
}

export interface GraphitiMemoryClient {
  projectMemory(payload: GraphitiMemoryProjectionPayload): Promise<GraphitiMemoryProjectionResponse>;
  searchMemory?(
    query: string,
    options?: { limit?: number; at?: string }
  ): Promise<GraphitiMemorySearchResult[]>;
}

export interface BuildGraphitiMemoryPayloadOptions {
  redactEvidence?: boolean;
}

function normalizeEndpoint(value: string): string {
  return value.replace(/\/+$/u, "");
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function isSensitive(value: MemorySensitivity | undefined): boolean {
  return value === "high" || value === "restricted";
}

const SENSITIVITY_RANK: Record<MemorySensitivity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  restricted: 3
};

function maxSensitivity(left: MemorySensitivity, right: MemorySensitivity): MemorySensitivity {
  return SENSITIVITY_RANK[right] > SENSITIVITY_RANK[left] ? right : left;
}

export function classifyGraphitiMemoryRecordSensitivity(record: MemoryRecord): MemorySensitivity {
  return maxSensitivity(record.sensitivity ?? "low", classifyMemorySensitivity(record));
}

export function validateGraphitiMemoryConfig(config: GraphitiMemoryConfig): GraphitiMemoryConfig {
  if (!config.enabled) return config;
  if (!config.endpoint) throw new Error("graph endpoint required when graph projection is enabled");
  const endpoint = normalizeEndpoint(config.endpoint);
  const allowedEndpoints = config.allowedEndpoints.map(normalizeEndpoint);
  if (!allowedEndpoints.includes(endpoint)) {
    throw new Error(`Graphiti endpoint is not in the allowlist: ${config.endpoint}`);
  }
  const parsed = new URL(endpoint);
  if (config.localOnly && !isLocalHost(parsed.hostname)) {
    throw new Error(`Graphiti endpoint rejected by local-only mode: ${config.endpoint}`);
  }
  return {
    ...config,
    endpoint,
    allowedEndpoints
  };
}

function visibleEvidenceSummary(
  evidence: MemoryEvidenceRecord,
  options: BuildGraphitiMemoryPayloadOptions,
): string | undefined {
  if (!evidence.summary) return undefined;
  if (options.redactEvidence !== false && isSensitive(classifyMemoryEvidenceSensitivity(evidence))) return "[redacted]";
  return evidence.summary;
}

function visibleEvidenceContentHash(
  evidence: MemoryEvidenceRecord,
  options: BuildGraphitiMemoryPayloadOptions,
): string | undefined {
  if (!evidence.contentHash) return undefined;
  if (options.redactEvidence !== false && isSensitive(classifyMemoryEvidenceSensitivity(evidence))) return undefined;
  return evidence.contentHash;
}

export function buildGraphitiMemoryPayload(
  record: MemoryRecord,
  evidence: MemoryEvidenceRecord[],
  options: BuildGraphitiMemoryPayloadOptions = {},
): GraphitiMemoryProjectionPayload {
  const evidenceIds = record.evidenceIds ?? [];
  const allowedEvidenceIds = new Set(evidenceIds);
  const sensitivity = classifyGraphitiMemoryRecordSensitivity(record);
  return {
    memoryId: record.id,
    text: record.text,
    tags: record.tags,
    sensitivity,
    updatedAt: record.updatedAt,
    ...(record.validFrom ? { validFrom: record.validFrom } : {}),
    ...(record.validTo ? { validTo: record.validTo } : {}),
    ...(record.supersedes ? { supersedes: record.supersedes } : {}),
    ...(record.supersededBy ? { supersededBy: record.supersededBy } : {}),
    ...(record.supersedeMode ? { supersedeMode: record.supersedeMode } : {}),
    evidenceIds,
    evidence: evidence
      .filter((item) => allowedEvidenceIds.has(item.id))
      .map((item) => {
        const evidenceSensitivity = classifyMemoryEvidenceSensitivity(item);
        return {
          id: item.id,
          kind: item.kind,
          sensitivity: evidenceSensitivity,
          status: item.status ?? "active",
          ...(visibleEvidenceContentHash(item, options) ? { contentHash: visibleEvidenceContentHash(item, options) } : {}),
          ...(visibleEvidenceSummary(item, options) ? { summary: visibleEvidenceSummary(item, options) } : {})
        };
      })
  };
}

export class GraphitiHttpMemoryClient implements GraphitiMemoryClient {
  private readonly config: GraphitiMemoryConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(config: GraphitiMemoryConfig, fetchImpl: typeof fetch = globalThis.fetch) {
    this.config = validateGraphitiMemoryConfig(config);
    this.fetchImpl = fetchImpl;
  }

  async projectMemory(payload: GraphitiMemoryProjectionPayload): Promise<GraphitiMemoryProjectionResponse> {
    if (!this.config.endpoint) throw new Error("graph endpoint required when graph projection is enabled");
    const response = await this.fetchImpl(`${this.config.endpoint}/memory`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeoutMs)
    });
    if (!response.ok) {
      throw new Error(`Graphiti projection failed: ${response.status} ${response.statusText}`);
    }
    const parsed = await response.json() as Partial<GraphitiMemoryProjectionResponse>;
    if (!parsed.projectionId) throw new Error("Graphiti projection response missing projectionId");
    return { projectionId: parsed.projectionId, metadata: parsed.metadata };
  }

  async searchMemory(query: string, options: { limit?: number; at?: string } = {}): Promise<GraphitiMemorySearchResult[]> {
    if (!this.config.endpoint) throw new Error("graph endpoint required when graph projection is enabled");
    const response = await this.fetchImpl(`${this.config.endpoint}/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, ...options }),
      signal: AbortSignal.timeout(this.config.timeoutMs)
    });
    if (!response.ok) {
      throw new Error(`Graphiti search failed: ${response.status} ${response.statusText}`);
    }
    const parsed = await response.json() as { results?: GraphitiMemorySearchResult[] };
    return parsed.results ?? [];
  }
}
