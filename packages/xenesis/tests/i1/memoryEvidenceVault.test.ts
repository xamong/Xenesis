import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { MemoryWriteContext } from "../../src/extensions/index.js";
import { InMemoryMemoryLedgerStore, MemoryLedger } from "../../src/extensions/MemoryLedger.js";
import { InMemoryMemoryStore } from "../../src/extensions/memory.js";
import {
  hashMemoryEvidenceContent,
  readMemoryEvidenceSnapshot,
  resolveMemoryEvidenceSnapshotPath,
  writeMemoryEvidenceSnapshot
} from "../../src/extensions/memoryEvidenceVault.js";

let homes: string[] = [];

afterEach(async () => {
  for (const home of homes) await rm(home, { recursive: true, force: true });
  homes = [];
});

async function tempHome() {
  const home = await mkdtemp(join(tmpdir(), "memory-evidence-vault-"));
  homes.push(home);
  return home;
}

function trustedAt(iso = "2026-06-01T00:00:00.000Z"): MemoryWriteContext {
  return {
    sourceKind: "conversation",
    trust: "trusted",
    externalTaint: false,
    actor: "agent",
    runtime: "test",
    now: () => new Date(iso)
  };
}

function ledger() {
  return new MemoryLedger({
    memoryStore: new InMemoryMemoryStore({ now: () => new Date("2026-06-01T00:00:00.000Z") }),
    ledgerStore: new InMemoryMemoryLedgerStore()
  });
}

function ledgerWithEvidenceVault(xenesisHome: string) {
  return new MemoryLedger({
    memoryStore: new InMemoryMemoryStore({ now: () => new Date("2026-06-01T00:00:00.000Z") }),
    ledgerStore: new InMemoryMemoryLedgerStore(),
    evidenceVault: { xenesisHome }
  });
}

describe("memory evidence vault", () => {
  it("stores and reads hash-addressed snapshots under Xenesis home", async () => {
    const xenesisHome = await tempHome();
    const content = "external source says: 대표님은 회의록 근거를 선호한다";

    const snapshot = await writeMemoryEvidenceSnapshot({ xenesisHome, content });

    expect(snapshot.contentHash).toBe(hashMemoryEvidenceContent(content));
    expect(snapshot.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(relative(xenesisHome, snapshot.absolutePath)).not.toMatch(/^\.\./);
    expect(snapshot.relativePath).toMatch(/^memory-evidence\//);
    await expect(readMemoryEvidenceSnapshot({ xenesisHome, contentHash: snapshot.contentHash })).resolves.toBe(content);
  });

  it("rejects invalid or traversal-like snapshot hashes before resolving paths", async () => {
    const xenesisHome = await tempHome();

    expect(() => resolveMemoryEvidenceSnapshotPath({ xenesisHome, contentHash: "sha256:../bad" })).toThrow(
      /invalid evidence content hash/i
    );
    expect(() => resolveMemoryEvidenceSnapshotPath({ xenesisHome, contentHash: "not-a-hash" })).toThrow(
      /invalid evidence content hash/i
    );
  });

  it("records evidence metadata and appends evidence_recorded events", async () => {
    const memoryLedger = ledger();
    const contentHash = hashMemoryEvidenceContent("source text");

    const evidence = await memoryLedger.recordEvidence(
      {
        id: "evidence-1",
        kind: "external_document",
        source: "https://example.test/source",
        sensitivity: "low",
        contentHash,
        summary: "External source summary"
      },
      trustedAt()
    );

    expect(evidence).toMatchObject({ id: "evidence-1", contentHash, status: "active" });
    expect(await memoryLedger.getEvidence("evidence-1")).toMatchObject({ contentHash, status: "active" });
    expect((await memoryLedger.history({ evidenceId: "evidence-1" })).map((event) => event.type)).toEqual([
      "evidence_recorded"
    ]);
  });

  it("rejects durable evidence records without content hashes and duplicate evidence ids", async () => {
    const memoryLedger = ledger();
    const contentHash = hashMemoryEvidenceContent("source text");

    await expect(
      memoryLedger.recordEvidence(
        {
          id: "evidence-missing-hash",
          kind: "conversation",
          source: "chat",
          sensitivity: "low"
        },
        trustedAt()
      )
    ).rejects.toThrow(/contentHash required/i);
    expect(await memoryLedger.getEvidence("evidence-missing-hash")).toBeUndefined();
    expect(await memoryLedger.history({ evidenceId: "evidence-missing-hash" })).toEqual([]);

    await memoryLedger.recordEvidence(
      {
        id: "evidence-immutable",
        kind: "conversation",
        source: "chat",
        sensitivity: "low",
        contentHash
      },
      trustedAt()
    );
    await expect(
      memoryLedger.recordEvidence(
        {
          id: "evidence-immutable",
          kind: "conversation",
          source: "mutated source",
          sensitivity: "low",
          contentHash: hashMemoryEvidenceContent("different source text")
        },
        trustedAt()
      )
    ).rejects.toThrow(/already exists/i);
    expect(await memoryLedger.getEvidence("evidence-immutable")).toMatchObject({
      source: "chat",
      contentHash
    });
  });

  it("masks and deletes evidence through auditable ledger events", async () => {
    const memoryLedger = ledger();
    const contentHash = hashMemoryEvidenceContent("private source text");
    await memoryLedger.recordEvidence(
      {
        id: "evidence-sensitive",
        kind: "manual_note",
        source: "manual",
        sensitivity: "high",
        contentHash,
        summary: "Private source text"
      },
      trustedAt()
    );

    const masked = await memoryLedger.maskEvidence("evidence-sensitive", {
      ...trustedAt("2026-06-01T01:00:00.000Z"),
      reason: "privacy masking"
    });
    const deleted = await memoryLedger.deleteEvidence("evidence-sensitive", {
      ...trustedAt("2026-06-01T02:00:00.000Z"),
      reason: "user deletion"
    });

    expect(masked).toMatchObject({ id: "evidence-sensitive", status: "masked", summary: "[masked]" });
    expect(deleted).toMatchObject({ id: "evidence-sensitive", status: "deleted", contentHash: undefined });
    const events = await memoryLedger.history({ evidenceId: "evidence-sensitive" });
    expect(events.map((event) => event.type)).toEqual(["evidence_recorded", "evidence_masked", "evidence_deleted"]);
    expect(events[1]).toMatchObject({
      actor: "agent",
      evidenceId: "evidence-sensitive",
      reason: "privacy masking",
      metadata: {
        before: { status: "active", contentHash },
        after: { status: "masked", contentHash }
      }
    });
    expect(events[2]).toMatchObject({
      evidenceId: "evidence-sensitive",
      reason: "user deletion",
      metadata: {
        before: { status: "masked", contentHash },
        after: { status: "deleted", contentHash: null }
      }
    });
  });

  it("requires accepted memory to carry evidence ids or an explicit no-evidence reason", async () => {
    const memoryLedger = ledger();

    const withoutEvidence = await memoryLedger.write(
      {
        id: "mem-no-evidence",
        text: "대표님은 짧은 답변을 선호한다",
        tags: ["preference"]
      },
      trustedAt()
    );

    expect(withoutEvidence.status).toBe("accepted");
    expect(withoutEvidence.record).toMatchObject({
      id: "mem-no-evidence",
      noEvidenceReason: expect.stringMatching(/trusted conversation/i)
    });
    expect(withoutEvidence.record?.evidenceIds).toBeUndefined();
    expect(withoutEvidence.event?.metadata).toMatchObject({
      noEvidenceReason: expect.stringMatching(/trusted conversation/i)
    });

    await memoryLedger.recordEvidence(
      {
        id: "evidence-conversation-1",
        kind: "conversation",
        source: "chat",
        sensitivity: "low",
        contentHash: hashMemoryEvidenceContent("chat source")
      },
      trustedAt()
    );
    const withEvidence = await memoryLedger.write(
      {
        id: "mem-with-evidence",
        text: "대표님은 근거 있는 답변을 선호한다",
        tags: ["preference"]
      },
      { ...trustedAt(), evidenceIds: ["evidence-conversation-1"] }
    );

    expect(withEvidence.record).toMatchObject({
      id: "mem-with-evidence",
      evidenceIds: ["evidence-conversation-1"]
    });
    expect(withEvidence.record?.noEvidenceReason).toBeUndefined();
  });

  it("rejects evidence metadata whose snapshot is missing from the configured evidence vault", async () => {
    const xenesisHome = await tempHome();
    const memoryLedger = ledgerWithEvidenceVault(xenesisHome);

    await expect(
      memoryLedger.recordEvidence(
        {
          id: "phantom-evidence",
          kind: "external_document",
          source: "https://example.test/phantom",
          sensitivity: "low",
          contentHash: hashMemoryEvidenceContent("not actually stored")
        },
        trustedAt()
      )
    ).rejects.toThrow(/snapshot|ENOENT|no such file/i);
    expect(await memoryLedger.getEvidence("phantom-evidence")).toBeUndefined();
  });

  it("rejects same-id rewrites that would otherwise clear evidence history", async () => {
    const memoryLedger = ledger();
    await memoryLedger.recordEvidence(
      {
        id: "evidence-original",
        kind: "conversation",
        source: "chat",
        sensitivity: "low",
        contentHash: hashMemoryEvidenceContent("original source")
      },
      trustedAt()
    );
    await memoryLedger.write(
      {
        id: "same-id-memory",
        text: "대표님은 근거 있는 답변을 선호한다",
        tags: ["preference"],
        evidenceIds: ["evidence-original"]
      },
      trustedAt()
    );

    await expect(
      memoryLedger.write(
        {
          id: "same-id-memory",
          text: "대표님은 아주 짧은 답변을 선호한다",
          tags: ["preference"]
        },
        trustedAt("2026-06-02T00:00:00.000Z")
      )
    ).rejects.toThrow(/temporal supersede|already exists|same id/i);

    expect(await memoryLedger.getRecord("same-id-memory")).toMatchObject({
      id: "same-id-memory",
      text: "대표님은 근거 있는 답변을 선호한다",
      evidenceIds: ["evidence-original"]
    });
  });
});
