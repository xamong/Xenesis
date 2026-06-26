import { describe, it, expect } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryMemoryStore, rankRecords } from "../../src/extensions/memory.js";
import { SqliteMemoryStore } from "../../src/extensions/SqliteMemoryStore.js";
import { DeterministicEmbedder } from "../../src/extensions/embedding.js";
import type { MemoryRecord } from "../../src/extensions/types.js";

const MINSCORE = 0.05;

// Discriminating fixture: the legacy keyword scorer ranks the OFF-TOPIC record ("b") first
// because it shares the exact substrings "deploying"/"cluster"; the semantic embedder ranks the
// on-topic record ("a") first via shared "kubernetes" + deploy/cluster ngrams. This makes the
// test NON-VACUOUS: it can only pass once the embedder path is actually wired into the store.
const QUERY = "deploying the kubernetes cluster";
const ON_TOPIC = "kubernetes clusters deployment and deploys"; // id "a" — semantic match
const OFF_TOPIC = "deploying the parachute saved the cluster of skydivers"; // id "b" — keyword decoy

function bareRecords(): MemoryRecord[] {
  return [
    { id: "a", text: ON_TOPIC, tags: [], updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "b", text: OFF_TOPIC, tags: [], updatedAt: "2026-01-01T00:00:00.000Z" }
  ];
}

describe("InMemoryMemoryStore with embedder", () => {
  it("semantic search ranks the fuzzily-closer record first (and diverges from keyword)", async () => {
    // Sanity: the legacy keyword path would rank the decoy "b" first, so a passing test below
    // proves the embedder is engaged rather than the keyword scorer coincidentally agreeing.
    expect(rankRecords(bareRecords(), QUERY).map((r) => r.id)).toEqual(["b", "a"]);

    const s = new InMemoryMemoryStore({ embedder: new DeterministicEmbedder(), minScore: MINSCORE });
    await s.upsert({ id: "a", text: ON_TOPIC });
    await s.upsert({ id: "b", text: OFF_TOPIC });
    const out = await s.search(QUERY);
    expect(out[0]!.id).toBe("a");
  });
  it("with NO embedder, search == legacy rankRecords (parity)", async () => {
    const s = new InMemoryMemoryStore();
    await s.upsert({ id: "a", text: "alpha token" });
    await s.upsert({ id: "b", text: "beta token" });
    const out = await s.search("alpha");
    expect(out.map((r) => r.id)).toEqual(rankRecords(await s.list(), "alpha").map((r) => r.id));
  });
});

describe("SqliteMemoryStore with embedder", () => {
  it("embeds on upsert (BLOB persisted) and cosine-searches (diverges from keyword)", async () => {
    const home = await mkdtemp(join(tmpdir(), "i1s-"));
    const s = new SqliteMemoryStore({ xenesisHome: home, embedder: new DeterministicEmbedder(), minScore: MINSCORE });
    await s.upsert({ id: "a", text: ON_TOPIC });
    await s.upsert({ id: "b", text: OFF_TOPIC });
    // Keyword path would rank "b" first; the embedder must flip it to "a".
    expect(rankRecords(await s.list(), QUERY).map((r) => r.id)).toEqual(["b", "a"]);
    const out = await s.search(QUERY);
    expect(out[0]!.id).toBe("a");
  });
  it("with NO embedder, search == legacy rankRecords (parity)", async () => {
    const home = await mkdtemp(join(tmpdir(), "i1s-noemb-"));
    const s = new SqliteMemoryStore({ xenesisHome: home });
    await s.upsert({ id: "a", text: "alpha token" });
    await s.upsert({ id: "b", text: "beta token" });
    const out = await s.search("alpha");
    expect(out.map((r) => r.id)).toEqual(rankRecords(await s.list(), "alpha").map((r) => r.id));
  });
});
