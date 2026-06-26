import { describe, it, expect } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../src/db/database.js";
import { SqliteMemoryStore } from "../../src/extensions/SqliteMemoryStore.js";
import { DeterministicEmbedder } from "../../src/extensions/embedding.js";

const tick = () => new Promise((r) => setTimeout(r, 50));

describe("lazy backfill", () => {
  it("embeds pre-existing NULL-embedding rows in the background", async () => {
    const home = await mkdtemp(join(tmpdir(), "i1b-"));
    const db = openDatabase(home);
    db.prepare("INSERT INTO memory (id, priority, updated_at, rev, data) VALUES (?,?,?,?,?)")
      .run("old", 0, "2026-01-01T00:00:00.000Z", 0, JSON.stringify({ id: "old", text: "pre-existing memory row", tags: [], updatedAt: "2026-01-01T00:00:00.000Z" }));
    // sanity: embedding is NULL before
    const before = db.prepare("SELECT embedding FROM memory WHERE id=?").get("old") as { embedding: unknown };
    expect(before.embedding).toBeNull();
    const s = new SqliteMemoryStore({ xenesisHome: home, embedder: new DeterministicEmbedder() } as any);
    await s.list(); // ensure ready
    for (let i = 0; i < 10 && (db.prepare("SELECT embedding FROM memory WHERE id=?").get("old") as { embedding: unknown }).embedding == null; i += 1) await tick();
    const after = db.prepare("SELECT embedding FROM memory WHERE id=?").get("old") as { embedding: unknown };
    expect(after.embedding).not.toBeNull();
  });
});

describe("lazy backfill termination on embedder failure", () => {
  it("does not re-select a persistently failing row in a tight loop (bounded embed calls)", async () => {
    const home = await mkdtemp(join(tmpdir(), "i1bfail-"));
    const db = openDatabase(home);
    // Two rows: one whose embed() always throws, one that succeeds. Distinct ids so the cursor pages past both.
    db.prepare("INSERT INTO memory (id, priority, updated_at, rev, data) VALUES (?,?,?,?,?)")
      .run("a-fails", 0, "2026-01-01T00:00:00.000Z", 0, JSON.stringify({ id: "a-fails", text: "boom row", tags: [], updatedAt: "2026-01-01T00:00:00.000Z" }));
    db.prepare("INSERT INTO memory (id, priority, updated_at, rev, data) VALUES (?,?,?,?,?)")
      .run("b-ok", 0, "2026-01-01T00:00:00.000Z", 0, JSON.stringify({ id: "b-ok", text: "good row", tags: [], updatedAt: "2026-01-01T00:00:00.000Z" }));

    let failCalls = 0;
    const okEmbedder = new DeterministicEmbedder();
    // Counting embedder: throws for the failing row's text, embeds otherwise. If the backfill re-selected
    // the NULL failing row forever, failCalls would climb without bound across ticks.
    const embedder = {
      dimensions: okEmbedder.dimensions,
      async embed(text: string): Promise<Float32Array> {
        if (text === "boom row") { failCalls += 1; throw new Error("embed failed"); }
        return okEmbedder.embed(text);
      },
    };

    const s = new SqliteMemoryStore({ xenesisHome: home, embedder } as any);
    await s.list(); // ensure ready
    // Wait until the succeeding row is embedded (proves the loop made forward progress past the failing row).
    for (let i = 0; i < 20 && (db.prepare("SELECT embedding FROM memory WHERE id=?").get("b-ok") as { embedding: unknown }).embedding == null; i += 1) await tick();
    // Give the loop ample extra ticks; a regressed loop would keep re-fetching "a-fails" and inflate failCalls.
    for (let i = 0; i < 20; i += 1) await tick();

    const okRow = db.prepare("SELECT embedding FROM memory WHERE id=?").get("b-ok") as { embedding: unknown };
    const failRow = db.prepare("SELECT embedding FROM memory WHERE id=?").get("a-fails") as { embedding: unknown };
    expect(okRow.embedding).not.toBeNull();      // forward progress: succeeding row got embedded
    expect(failRow.embedding).toBeNull();         // failing row stays on the keyword fallback (never throws out)
    expect(failCalls).toBe(1);                    // attempted exactly once — no infinite re-selection spin
  });
});
