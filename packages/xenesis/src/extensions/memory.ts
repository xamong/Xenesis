import type { AgentMessage } from "../core/messages.js";
import { wrapExternalContent } from "../core/prompt/ExternalContentPolicy.js";
import type { Embedder } from "./embedding.js";
import { semanticSearch } from "./embedding.js";
import { memoryRunbookSearchText, validateMemoryRunbookInput } from "./memoryRunbook.js";
import type { MemoryInput, MemoryRecord, MemoryStore } from "./types.js";

const DEFAULT_MIN_SCORE = 0.25;

type SystemMessage = Extract<AgentMessage, { role: "system" }>;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function tokenize(value: string) {
  return normalizeText(value).match(/[a-z0-9가-힣_-]+/gi) ?? [];
}

function uniqueTokens(value: string) {
  return Array.from(new Set(tokenize(value).filter((token) => token.length >= 2)));
}

function compareUpdatedAt(left: MemoryRecord, right: MemoryRecord) {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

function hasOwn<T extends object>(value: T, key: keyof T): boolean {
  return Object.hasOwn(value, key);
}

function optionalRecordField<K extends keyof MemoryRecord>(
  input: MemoryInput,
  existing: MemoryRecord | undefined,
  key: K,
): Pick<MemoryRecord, K> | Record<string, never> {
  if (hasOwn(input, key as keyof MemoryInput)) {
    const value = input[key as keyof MemoryInput] as MemoryRecord[K] | undefined;
    return value !== undefined ? { [key]: value } as Pick<MemoryRecord, K> : {};
  }
  const value = existing?.[key];
  return value !== undefined ? { [key]: value } as Pick<MemoryRecord, K> : {};
}

function evidenceFields(
  input: MemoryInput,
  existing: MemoryRecord | undefined,
): Pick<MemoryRecord, "evidenceIds" | "noEvidenceReason"> | Record<string, never> {
  if (hasOwn(input, "evidenceIds")) {
    return input.evidenceIds !== undefined ? { evidenceIds: input.evidenceIds } : {};
  }
  if (hasOwn(input, "noEvidenceReason")) {
    return input.noEvidenceReason !== undefined ? { noEvidenceReason: input.noEvidenceReason } : {};
  }
  return {
    ...(existing?.evidenceIds ? { evidenceIds: existing.evidenceIds } : {}),
    ...(existing?.noEvidenceReason ? { noEvidenceReason: existing.noEvidenceReason } : {})
  };
}

function escapeMemoryAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function scoreRecord(record: MemoryRecord, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 1;

  const queryTokens = uniqueTokens(query);
  const id = normalizeText(record.id);
  const text = normalizeText(record.text);
  const runbookText = normalizeText(memoryRunbookSearchText(record));
  const tags = record.tags.map(normalizeText);
  const source = normalizeText(record.source ?? "");
  const haystack = [id, text, runbookText, source, ...tags].join(" ");
  let score = 0;

  score += record.priority ?? 0;
  if (haystack.includes(normalized)) score += 20;
  if (text.includes(normalized)) score += 10;
  if (id === normalized) score += 8;
  if (tags.includes(normalized)) score += 8;
  if (source === normalized) score += 5;

  let matchedTokens = 0;
  for (const token of queryTokens) {
    let matched = false;
    if (tags.includes(token)) {
      score += 8;
      matched = true;
    }
    if (text.includes(token)) {
      score += 4;
      matched = true;
    }
    if (runbookText.includes(token)) {
      score += 5;
      matched = true;
    }
    if (id.includes(token)) {
      score += 3;
      matched = true;
    }
    if (source.includes(token)) {
      score += 2;
      matched = true;
    }
    if (matched) matchedTokens += 1;
  }

  if (queryTokens.length > 1 && matchedTokens === queryTokens.length) score += 6;
  return score;
}

export function rankRecords(records: MemoryRecord[], query: string) {
  const normalized = query.trim();
  if (!normalized) return records;

  return records
    .map((record) => ({ record, score: scoreRecord(record, query) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return compareUpdatedAt(left.record, right.record) || left.record.id.localeCompare(right.record.id);
    })
    .map((candidate) => candidate.record);
}

export class InMemoryMemoryStore implements MemoryStore {
  private readonly records = new Map<string, MemoryRecord>();
  private readonly now: () => Date;
  private readonly embedder?: Embedder;
  private readonly minScore: number;

  constructor(options: { now?: () => Date; embedder?: Embedder; minScore?: number } = {}) {
    this.now = options.now ?? (() => new Date());
    this.embedder = options.embedder;
    this.minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  }

  async upsert(input: MemoryInput): Promise<MemoryRecord> {
    const normalizedInput = validateMemoryRunbookInput(input);
    const existing = this.records.get(normalizedInput.id);
    const record: MemoryRecord = {
      id: normalizedInput.id,
      text: normalizedInput.text,
      tags: normalizedInput.tags ?? [],
      ...optionalRecordField(normalizedInput, existing, "kind"),
      ...optionalRecordField(normalizedInput, existing, "runbook"),
      ...optionalRecordField(normalizedInput, existing, "source"),
      ...optionalRecordField(normalizedInput, existing, "priority"),
      updatedAt: this.now().toISOString(),
      createdAt: normalizedInput.createdAt ?? existing?.createdAt ?? this.now().toISOString(),
      ...(normalizedInput.status ? { status: normalizedInput.status } : existing?.status ? { status: existing.status } : { status: "active" }),
      ...optionalRecordField(normalizedInput, existing, "pinned"),
      ...optionalRecordField(normalizedInput, existing, "lastAccessedAt"),
      ...optionalRecordField(normalizedInput, existing, "sensitivity"),
      ...optionalRecordField(normalizedInput, existing, "conflictsWith"),
      ...optionalRecordField(normalizedInput, existing, "validFrom"),
      ...optionalRecordField(normalizedInput, existing, "validTo"),
      ...optionalRecordField(normalizedInput, existing, "supersedes"),
      ...optionalRecordField(normalizedInput, existing, "supersededBy"),
      ...optionalRecordField(normalizedInput, existing, "partialSupersededBy"),
      ...optionalRecordField(normalizedInput, existing, "supersedeMode"),
      ...evidenceFields(normalizedInput, existing),
      ...optionalRecordField(normalizedInput, existing, "archivedAt")
    };
    if (this.embedder) record.embedding = await this.embedder.embed(record.text);
    this.records.set(record.id, record);
    return record;
  }

  async get(id: string): Promise<MemoryRecord | undefined> {
    return this.records.get(id);
  }

  async remove(id: string): Promise<void> {
    if (!this.records.delete(id)) throw new Error(`Memory record not found: ${id}`);
  }

  async list(): Promise<MemoryRecord[]> {
    return Array.from(this.records.values()).sort((left, right) => left.id.localeCompare(right.id));
  }

  async search(query: string): Promise<MemoryRecord[]> {
    const records = await this.list();
    if (!this.embedder) return rankRecords(records, query);
    return semanticSearch(records, query, this.embedder, this.minScore);
  }
}

export function buildMemorySystemMessage(records: MemoryRecord[]): SystemMessage | undefined {
  if (records.length === 0) return undefined;

  const sections = records.map((record) => {
    const wrapped = wrapExternalContent({
      kind: "memory",
      source: record.source ?? "memory",
      authority: "untrusted",
      content: record.text
    });
    const tags = record.tags.map(escapeMemoryAttribute).join(",");
    return [
      `<memory id="${escapeMemoryAttribute(record.id)}" tags="${tags}"${record.source ? ` source="${escapeMemoryAttribute(record.source)}"` : ""}${record.priority !== undefined ? ` priority="${record.priority}"` : ""} updatedAt="${escapeMemoryAttribute(record.updatedAt)}">`,
      wrapped.content,
      "</memory>"
    ].join("\n");
  });

  return {
    role: "system",
    content: ["Xenesis relevant memory:", "", sections.join("\n\n")].join("\n")
  };
}
