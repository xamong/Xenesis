import type { EmbedderConfig } from "../config/types.js";
import type { MemoryRecord } from "./types.js";
import { rankRecords, scoreRecord } from "./memory.js";

export interface Embedder {
  readonly dimensions: number;
  embed(text: string): Promise<Float32Array>;
}

// EmbedderConfig is canonically defined in ../config/types.ts (provider/dimensions/minScore).
// Re-exported here so consumers of the embedding module keep a single import surface and the
// shape can never silently diverge from the config schema.
export type { EmbedderConfig };

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i]! * b[i]!; ma += a[i]! * a[i]!; mb += b[i]! * b[i]!; }
  if (ma === 0 || mb === 0) return 0;
  return dot / (Math.sqrt(ma) * Math.sqrt(mb));
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function features(text: string): string[] {
  const norm = text.toLowerCase();
  const tokens = norm.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2);
  const out: string[] = [...tokens];
  for (const t of tokens) for (let i = 0; i + 3 <= t.length; i += 1) out.push("#" + t.slice(i, i + 3)); // 3-grams
  return out;
}

export class DeterministicEmbedder implements Embedder {
  readonly dimensions: number;
  constructor(dimensions = 256) { this.dimensions = dimensions; }
  async embed(text: string): Promise<Float32Array> {
    const v = new Float32Array(this.dimensions);
    for (const f of features(text)) {
      const h = fnv1a(f);
      const bucket = h % this.dimensions;
      const sign = (h >>> 31) & 1 ? -1 : 1;
      v[bucket] += sign;
    }
    let mag = 0; for (let i = 0; i < v.length; i += 1) mag += v[i]! * v[i]!;
    mag = Math.sqrt(mag);
    if (mag > 0) for (let i = 0; i < v.length; i += 1) v[i] = v[i]! / mag;
    return v;
  }
}

export function createEmbedder(config: EmbedderConfig | undefined): Embedder | undefined {
  if (!config) return undefined;
  if (config.provider === "deterministic") return new DeterministicEmbedder(config.dimensions);
  return undefined; // future providers
}

const KEYWORD_NORM = 30; // map keyword scoreRecord into [0, ~1) so embedded + unembedded rows share one scale

/**
 * Hybrid recall: cosine over rows with an embedding, normalized-keyword for rows without.
 * One comparable [0,1] scale; filter by minScore; sort desc (stable by updatedAt/id via rankRecords order for ties).
 */
export async function semanticSearch(
  records: MemoryRecord[],
  query: string,
  embedder: Embedder,
  minScore: number
): Promise<MemoryRecord[]> {
  const q = query.trim();
  if (!q) return records;
  const qvec = await embedder.embed(q);
  const scored = records.map((record) => {
    const emb = record.embedding;
    const score = emb
      ? Math.max(0, cosineSimilarity(qvec, emb))
      : Math.min(0.99, scoreRecord(record, query) / KEYWORD_NORM);
    return { record, score };
  });
  return scored
    .filter((c) => c.score >= minScore)
    .sort((l, r) => r.score - l.score || r.record.updatedAt.localeCompare(l.record.updatedAt) || l.record.id.localeCompare(r.record.id))
    .map((c) => c.record);
}

// Re-export rankRecords for use by stores that need to delegate to the legacy keyword path
export { rankRecords };
