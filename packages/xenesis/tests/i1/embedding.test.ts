import { describe, it, expect } from "vitest";
import { DeterministicEmbedder, cosineSimilarity, createEmbedder, semanticSearch } from "../../src/extensions/embedding.js";
import { rankRecords } from "../../src/extensions/memory.js";
import type { MemoryRecord } from "../../src/extensions/types.js";

const rec = (id: string, text: string, embedding?: Float32Array): MemoryRecord =>
  ({ id, text, tags: [], updatedAt: "2026-01-01T00:00:00.000Z", ...(embedding ? { embedding } : {}) });

describe("DeterministicEmbedder", () => {
  const e = new DeterministicEmbedder();
  it("is deterministic + L2-normalized + correct dims", async () => {
    const a = await e.embed("the quick brown fox");
    const b = await e.embed("the quick brown fox");
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(a.length).toBe(e.dimensions);
    const mag = Math.sqrt(Array.from(a).reduce((s, x) => s + x * x, 0));
    expect(mag).toBeCloseTo(1, 5);
  });
  it("similar text scores higher than dissimilar", async () => {
    const q = await e.embed("database migration error");
    const near = await e.embed("error during database migration");
    const far = await e.embed("the weather is sunny today");
    expect(cosineSimilarity(q, near)).toBeGreaterThan(cosineSimilarity(q, far));
  });
});

describe("cosineSimilarity guards", () => {
  it("dim mismatch -> 0; zero vector -> 0", () => {
    expect(cosineSimilarity(new Float32Array([1, 0]), new Float32Array([1, 0, 0]))).toBe(0);
    expect(cosineSimilarity(new Float32Array([0, 0]), new Float32Array([1, 0]))).toBe(0);
  });
});

describe("createEmbedder", () => {
  it("returns a DeterministicEmbedder for provider 'deterministic', undefined otherwise", () => {
    expect(createEmbedder({ provider: "deterministic" })).toBeInstanceOf(DeterministicEmbedder);
    expect(createEmbedder(undefined)).toBeUndefined();
  });
});

describe("semanticSearch hybrid", () => {
  const e = new DeterministicEmbedder();
  it("ranks embedded cosine matches and falls back to keyword for unembedded rows", async () => {
    const close = rec("a", "database migration failed", await e.embed("database migration failed"));
    const unembedded = rec("b", "exact-keyword-token here"); // no embedding -> keyword fallback
    const noise = rec("c", "unrelated weather note", await e.embed("unrelated weather note"));
    const out = await semanticSearch([noise, unembedded, close], "database migration", e, 0.1);
    expect(out[0]!.id).toBe("a"); // cosine-closest first
    // unembedded keyword match for "exact-keyword-token" appears when queried by its token
    const out2 = await semanticSearch([noise, unembedded, close], "exact-keyword-token", e, 0.1);
    expect(out2.map((r) => r.id)).toContain("b");
  });

  // Adversarial: prove the cosine path is genuinely operative and NOT reducible to keyword scoring.
  // Query "migration error in the database" is NOT an exact substring of the target text, and the
  // decoy text literally contains the substring "migration error" -> keyword-only ranks the DECOY first.
  // Cosine (3-gram/token overlap, order-insensitive) ranks the semantically-closest target first.
  // If semanticSearch ever silently fell back to keyword scoring for embedded rows, this would fail.
  it("cosine beats keyword on a fuzzy query (non-vacuous: keyword-only ranks the decoy first)", async () => {
    const query = "migration error in the database";
    const targetText = "database migration failed at startup"; // shares db/migration tokens; query is NOT a substring
    const decoyText = "the migration error guide for travelers"; // contains literal "migration error" substring

    const target = rec("target", targetText, await e.embed(targetText));
    const decoy = rec("decoy", decoyText, await e.embed(decoyText));
    const noise = rec("noise", "unrelated weather note about sunshine", await e.embed("unrelated weather note about sunshine"));
    const records = [noise, decoy, target];

    // Establish that the keyword-only baseline ranks the DECOY first for this query.
    // This is what makes the cosine assertion below non-vacuous: the two paths disagree at #1.
    const keywordRanking = rankRecords(records, query);
    expect(keywordRanking[0]!.id).toBe("decoy");

    // The cosine path must rank the semantically-closest target first, overriding the keyword ordering.
    const out = await semanticSearch(records, query, e, 0.05);
    expect(out[0]!.id).toBe("target");
    expect(out.indexOf(out.find((r) => r.id === "target")!)).toBeLessThan(
      out.indexOf(out.find((r) => r.id === "decoy")!)
    );
  });
});
