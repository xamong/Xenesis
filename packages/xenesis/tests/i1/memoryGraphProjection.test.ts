import { describe, expect, it } from "vitest";
import type {
  GraphitiMemoryClient,
  GraphitiMemoryProjectionPayload,
  GraphitiMemoryProjectionResponse
} from "../../src/extensions/graphitiMemoryAdapter.js";
import type { MemoryWriteContext } from "../../src/extensions/index.js";
import { InMemoryMemoryLedgerStore, MemoryLedger } from "../../src/extensions/MemoryLedger.js";
import { InMemoryMemoryStore } from "../../src/extensions/memory.js";
import { hashMemoryEvidenceContent } from "../../src/extensions/memoryEvidenceVault.js";
import {
  type MemoryGraphProjectionConfig,
  projectAcceptedMemoryRecords
} from "../../src/extensions/memoryGraphProjection.js";
import { MemoryRetrievalPlanner } from "../../src/extensions/memoryRetrievalPlanner.js";

const now = "2026-06-01T00:00:00.000Z";

function trustedAt(iso = now): MemoryWriteContext {
  return {
    sourceKind: "conversation",
    trust: "trusted",
    externalTaint: false,
    actor: "agent",
    runtime: "test",
    now: () => new Date(iso)
  };
}

function externalAt(iso = now): MemoryWriteContext {
  return {
    ...trustedAt(iso),
    sourceKind: "external_document",
    trust: "external_untrusted",
    externalTaint: true,
    sourceId: "https://example.test/source"
  };
}

function createLedger() {
  const memoryStore = new InMemoryMemoryStore({ now: () => new Date(now) });
  const ledgerStore = new InMemoryMemoryLedgerStore();
  const ledger = new MemoryLedger({ memoryStore, ledgerStore });
  return { ledger, memoryStore, ledgerStore };
}

function graphConfig(overrides: Partial<MemoryGraphProjectionConfig> = {}): MemoryGraphProjectionConfig {
  return {
    enabled: true,
    endpoint: "http://127.0.0.1:8000",
    allowedEndpoints: ["http://127.0.0.1:8000"],
    localOnly: true,
    allowSensitiveProjection: false,
    redactEvidence: true,
    timeoutMs: 1000,
    ...overrides
  };
}

class FakeGraphitiClient implements GraphitiMemoryClient {
  readonly payloads: GraphitiMemoryProjectionPayload[] = [];
  readonly failMemoryIds = new Set<string>();

  async projectMemory(payload: GraphitiMemoryProjectionPayload): Promise<GraphitiMemoryProjectionResponse> {
    this.payloads.push(payload);
    if (this.failMemoryIds.has(payload.memoryId)) {
      throw new Error(`projection failed for ${payload.memoryId}`);
    }
    return { projectionId: `graph-${payload.memoryId}` };
  }
}

describe("memory graph projection", () => {
  it("projects only accepted policy-allowed ledger records and stores projection IDs in ledger events", async () => {
    const { ledger, memoryStore } = createLedger();
    await ledger.recordEvidence(
      {
        id: "evidence-decision",
        kind: "conversation",
        source: "chat",
        sensitivity: "low",
        contentHash: hashMemoryEvidenceContent("A 프로젝트 Graphiti projection decision")
      },
      trustedAt()
    );
    await ledger.write(
      {
        id: "decision-low",
        text: "A 프로젝트는 Graphiti projection을 사용하기로 결정했다",
        tags: ["project", "decision"],
        evidenceIds: ["evidence-decision"]
      },
      trustedAt()
    );
    await ledger.write(
      {
        id: "pending-external",
        text: "외부 문서에서 온 제안은 pending이어야 한다",
        tags: ["project"]
      },
      externalAt()
    );
    await memoryStore.upsert({
      id: "high-accepted",
      text: "건강 관련 민감 기록은 graph projection으로 나가면 안 된다",
      tags: ["health"],
      sensitivity: "high",
      status: "active"
    });
    const client = new FakeGraphitiClient();

    const result = await projectAcceptedMemoryRecords({
      ledger,
      client,
      config: graphConfig(),
      at: now
    });

    expect(result.projected.map((item) => item.memoryId)).toEqual(["decision-low"]);
    expect(result.skipped.map((item) => item.memoryId)).toEqual(expect.arrayContaining(["high-accepted"]));
    expect(client.payloads.map((payload) => payload.memoryId)).toEqual(["decision-low"]);
    expect(client.payloads[0]?.evidence.map((item) => item.id)).toEqual(["evidence-decision"]);

    const events = await ledger.history({ memoryId: "decision-low" });
    expect(events.some((event) =>
      event.type === "graph_projected" &&
      event.metadata?.projectionId === "graph-decision-low" &&
      event.metadata?.endpoint === "http://127.0.0.1:8000"
    )).toBe(true);
  });

  it("isolates projection failures without corrupting accepted memory", async () => {
    const { ledger } = createLedger();
    await ledger.write(
      { id: "project-ok", text: "project ok memory", tags: ["project"] },
      trustedAt()
    );
    await ledger.write(
      { id: "project-fails", text: "project fails memory", tags: ["project"] },
      trustedAt()
    );
    const client = new FakeGraphitiClient();
    client.failMemoryIds.add("project-fails");

    const result = await projectAcceptedMemoryRecords({
      ledger,
      client,
      config: graphConfig(),
      at: now
    });

    expect(result.projected.map((item) => item.memoryId)).toEqual(["project-ok"]);
    expect(result.failed.map((item) => item.memoryId)).toEqual(["project-fails"]);
    expect(await ledger.getRecord("project-fails")).toMatchObject({
      id: "project-fails",
      status: "active"
    });
  });

  it("reclassifies unlabelled direct memory rows before projection", async () => {
    const { ledger, memoryStore } = createLedger();
    await memoryStore.upsert({
      id: "legacy-secret",
      text: "API_KEY=sk-legacy-secret was imported before governance labels existed",
      tags: ["legacy"],
      status: "active"
    });
    const client = new FakeGraphitiClient();

    const result = await projectAcceptedMemoryRecords({
      ledger,
      client,
      config: graphConfig(),
      at: now
    });

    expect(result.projected).toEqual([]);
    expect(result.skipped).toContainEqual({ memoryId: "legacy-secret", reason: "sensitive" });
    expect(client.payloads).toEqual([]);
  });

  it("reclassifies low-labelled sensitive evidence before sending Graphiti payloads", async () => {
    const { ledger } = createLedger();
    await ledger.recordEvidence(
      {
        id: "evidence-secret",
        kind: "manual_note",
        source: "password vault sk-live-graph-secret",
        sensitivity: "low",
        contentHash: hashMemoryEvidenceContent("non-secret snapshot body"),
        summary: "API key sk-live-graph-secret"
      },
      trustedAt()
    );
    await ledger.write(
      {
        id: "project-safe",
        text: "A 프로젝트는 Graphiti projection을 사용한다",
        tags: ["project"],
        evidenceIds: ["evidence-secret"]
      },
      trustedAt()
    );
    const client = new FakeGraphitiClient();

    const result = await projectAcceptedMemoryRecords({
      ledger,
      client,
      config: graphConfig(),
      at: now
    });

    expect(result.projected.map((item) => item.memoryId)).toEqual(["project-safe"]);
    expect(client.payloads).toHaveLength(1);
    expect(JSON.stringify(client.payloads[0])).not.toContain("sk-live-graph-secret");
    expect(client.payloads[0]?.evidence[0]).toMatchObject({
      id: "evidence-secret",
      sensitivity: "restricted"
    });
    expect(client.payloads[0]?.evidence[0]?.summary).toBe("[redacted]");
    expect(client.payloads[0]?.evidence[0]?.contentHash).toBeUndefined();
  });


  it("leaves ledger retrieval working when graph projection is disabled", async () => {
    const { ledger } = createLedger();
    await ledger.write(
      { id: "project-memory", text: "A 프로젝트 현재 상태는 진행 중이다", tags: ["project"] },
      trustedAt()
    );
    const client = new FakeGraphitiClient();

    const projection = await projectAcceptedMemoryRecords({
      ledger,
      client,
      config: graphConfig({ enabled: false }),
      at: now
    });
    const pack = await new MemoryRetrievalPlanner({
      ledger,
      graph: {
        enabled: false,
        search: async () => [{ memoryId: "project-memory", projectionId: "graph-project-memory" }]
      }
    }).retrieve({
      query: "A 프로젝트 현재 상태",
      at: now
    });

    expect(projection.projected).toEqual([]);
    expect(client.payloads).toEqual([]);
    expect(pack.records.map((record) => record.id)).toEqual(["project-memory"]);
  });

  it("uses graph search hits only as ledger readback pointers in retrieval planning", async () => {
    const { ledger } = createLedger();
    await ledger.write(
      {
        id: "relation-memory",
        text: "김OO은 A 프로젝트 backend prototype owner다",
        tags: ["person", "project"]
      },
      trustedAt()
    );

    const pack = await new MemoryRetrievalPlanner({
      ledger,
      graph: {
        enabled: true,
        search: async () => [{
          memoryId: "relation-memory",
          projectionId: "graph-relation-memory",
          fact: "김OO --owns--> A 프로젝트 backend prototype"
        }]
      }
    }).retrieve({
      query: "owner 관계 그래프로 찾아줘",
      at: now
    });

    expect(pack.records.map((record) => record.id)).toEqual(["relation-memory"]);
    expect(JSON.stringify(pack)).not.toContain("김OO --owns-->");
  });

  it("filters graph readback through temporal validity for current queries", async () => {
    const { ledger } = createLedger();
    await ledger.write(
      {
        id: "pref-old",
        text: "대표님은 오전 미팅을 피한다",
        tags: ["preference", "meeting"],
        validFrom: "2026-01-01T00:00:00.000Z"
      },
      trustedAt("2026-01-01T00:00:00.000Z")
    );
    await ledger.supersedeRecord(
      "pref-old",
      {
        id: "pref-current",
        text: "대표님은 화요일 오전 미팅을 허용한다",
        tags: ["preference", "meeting"],
        validFrom: "2026-05-01T00:00:00.000Z"
      },
      trustedAt("2026-05-01T00:00:00.000Z")
    );

    const pack = await new MemoryRetrievalPlanner({
      ledger,
      graph: {
        enabled: true,
        search: async () => [{ memoryId: "pref-old", projectionId: "graph-pref-old" }]
      }
    }).retrieve({
      query: "오전 미팅 선호",
      at: now
    });

    expect(pack.records.map((record) => record.id)).toEqual(["pref-current"]);
  });
});
