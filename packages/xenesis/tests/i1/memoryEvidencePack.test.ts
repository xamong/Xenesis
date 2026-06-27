import { describe, expect, it } from "vitest";
import type { MemoryEvidenceRecord, MemoryRecord } from "../../src/extensions/index.js";
import {
  buildMemoryEvidencePack,
  buildMemoryEvidencePackSystemMessage,
  classifyMemoryQueryIntent,
  memoryReadAuthority
} from "../../src/extensions/memoryEvidencePack.js";

const now = "2026-06-01T00:00:00.000Z";

function record(overrides: Partial<MemoryRecord> & Pick<MemoryRecord, "id" | "text">): MemoryRecord {
  return {
    tags: [],
    updatedAt: now,
    ...overrides
  };
}

function evidence(overrides: Partial<MemoryEvidenceRecord> & Pick<MemoryEvidenceRecord, "id">): MemoryEvidenceRecord {
  return {
    kind: "conversation",
    source: "chat",
    sensitivity: "low",
    createdAt: now,
    contentHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    ...overrides
  };
}

describe("memory evidence pack", () => {
  it("classifies deterministic memory query intents", () => {
    expect(classifyMemoryQueryIntent("내 오전 미팅 선호가 뭐야?")).toBe("preference");
    expect(classifyMemoryQueryIntent("A 프로젝트 히스토리 정리해줘")).toBe("project_history");
    expect(classifyMemoryQueryIntent("지난번 결정이 뭐였지?")).toBe("decision");
    expect(classifyMemoryQueryIntent("내 생각이 어떻게 바뀌었어?")).toBe("temporal_change");
    expect(classifyMemoryQueryIntent("투자 검토 절차 알려줘")).toBe("procedure");
    expect(classifyMemoryQueryIntent("그 기억의 근거 보여줘")).toBe("evidence");
    expect(classifyMemoryQueryIntent("무작위 질문")).toBe("unknown");
  });

  it("orders accepted memory by evidence authority before no-evidence and historical memory", () => {
    const backed = record({
      id: "backed",
      text: "evidence backed current memory",
      evidenceIds: ["evidence-1"],
      validFrom: "2026-05-01T00:00:00.000Z"
    });
    const noEvidence = record({
      id: "no-evidence",
      text: "current memory without durable evidence",
      noEvidenceReason: "trusted conversation without durable evidence",
      validFrom: "2026-05-02T00:00:00.000Z"
    });
    const historical = record({
      id: "historical",
      text: "historical memory",
      evidenceIds: ["evidence-2"],
      validFrom: "2026-01-01T00:00:00.000Z",
      validTo: "2026-02-01T00:00:00.000Z"
    });

    expect(memoryReadAuthority(backed, now)).toBe("ledger_memory_evidence");
    expect(memoryReadAuthority(noEvidence, now)).toBe("ledger_memory_no_evidence");
    expect(memoryReadAuthority(historical, now)).toBe("historical_memory");

    const pack = buildMemoryEvidencePack({
      intent: "preference",
      query: "memory",
      records: [historical, noEvidence, backed],
      evidence: [evidence({ id: "evidence-1" }), evidence({ id: "evidence-2" })],
      at: now
    });

    expect(pack.records.map((item) => item.id)).toEqual(["backed", "no-evidence", "historical"]);
    expect(pack.confidence).toBeGreaterThan(0.8);
    expect(pack.recency).toBe("mixed");
  });

  it("abstains instead of inventing memory when the pack is empty", () => {
    const pack = buildMemoryEvidencePack({
      intent: "unknown",
      query: "없는 기억",
      records: [],
      evidence: [],
      at: now
    });

    expect(pack.records).toEqual([]);
    expect(pack.confidence).toBe(0);
    expect(pack.recency).toBe("unknown");
    expect(pack.abstainReason).toMatch(/no accepted memory/i);
  });

  it("omits sensitive records when caller lacks proof", () => {
    const pack = buildMemoryEvidencePack({
      intent: "preference",
      query: "건강",
      records: [
        record({
          id: "sensitive",
          text: "민감한 건강 관련 기억",
          sensitivity: "high"
        })
      ],
      evidence: [],
      at: now,
      allowSensitive: false
    });

    expect(pack.records).toEqual([]);
    expect(pack.sensitivity).toBe("high");
    expect(pack.abstainReason).toMatch(/sensitive/i);
  });

  it("is safe by default and does not expose sensitive proposals", () => {
    const pack = buildMemoryEvidencePack({
      intent: "preference",
      query: "api key",
      records: [],
      evidence: [],
      proposals: [{
        id: "proposal-secret",
        status: "pending",
        input: {
          id: "secret-proposal-memory",
          text: "API_KEY=sk-test-secret should never be exposed",
          tags: ["preference"]
        },
        decision: {
          action: "propose",
          sensitivity: "restricted",
          requiresApproval: true,
          reason: "sensitive memory requires approval"
        },
        context: {
          sourceKind: "conversation",
          trust: "trusted",
          externalTaint: false,
          actor: "agent",
          runtime: "test"
        },
        createdAt: now,
        updatedAt: now
      }]
    });

    expect(JSON.stringify(pack)).not.toContain("sk-test-secret");
    expect(pack.proposals[0]?.input.text).toBe("[redacted: restricted memory proposal]");
    expect(pack.abstainReason).toMatch(/pending proposal/i);
  });

  it("filters evidence through visible records and does not claim hidden evidence authority", () => {
    const pack = buildMemoryEvidencePack({
      intent: "preference",
      query: "private",
      records: [
        record({
          id: "hidden-sensitive",
          text: "민감한 재무 선호",
          sensitivity: "high",
          evidenceIds: ["evidence-sensitive"]
        })
      ],
      evidence: [
        evidence({
          id: "evidence-sensitive",
          sensitivity: "low",
          summary: "low label but belongs to hidden sensitive record"
        })
      ],
      at: now
    });

    expect(pack.records).toEqual([]);
    expect(pack.evidence).toEqual([]);
    expect(pack.abstainReason).toMatch(/sensitive/i);
  });

  it("reclassifies low-labelled secret-looking records and evidence before provider context rendering", () => {
    const pack = buildMemoryEvidencePack({
      intent: "evidence",
      query: "api key",
      records: [
        record({
          id: "legacy-low-secret",
          text: "Temporary API key is sk-live-pack-secret.",
          tags: ["credential"],
          sensitivity: "low",
          evidenceIds: ["evidence-low-secret"]
        })
      ],
      evidence: [
        evidence({
          id: "evidence-low-secret",
          sensitivity: "low",
          summary: "API key sk-live-evidence-secret",
          source: "password vault sk-live-evidence-secret"
        })
      ],
      at: now,
      allowSensitive: false
    });

    const message = buildMemoryEvidencePackSystemMessage(pack);
    const serialized = JSON.stringify({ pack, message });

    expect(pack.records).toEqual([]);
    expect(pack.evidence).toEqual([]);
    expect(pack.sensitivity).toBe("restricted");
    expect(serialized).not.toContain("sk-live-pack-secret");
    expect(serialized).not.toContain("sk-live-evidence-secret");
    expect(pack.abstainReason).toMatch(/sensitive/i);
  });

  it("renders abstention and pending-proposal-only packs into system context", () => {
    const pack = buildMemoryEvidencePack({
      intent: "unknown",
      query: "없는 기억",
      records: [],
      evidence: [],
      proposals: []
    });

    const message = buildMemoryEvidencePackSystemMessage(pack);

    expect(message?.content).toContain("Xenesis evidence-governed memory pack");
    expect(message?.content).toContain("abstainReason=");
    expect(message?.content).toContain("no accepted memory");
  });
});
