import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildMemoryObsidianProjectionMarkdown,
  resolveMemoryObsidianProjectionPath,
  writeMemoryObsidianProjection
} from "../../src/extensions/memoryObsidianProjection.js";
import type {
  MemoryEvidenceRecord,
  MemoryLedgerEvent,
  MemoryProposal
} from "../../src/extensions/memoryTypes.js";
import type { MemoryRecord } from "../../src/extensions/types.js";

const LOW_RECORD: MemoryRecord = {
  id: "mem-project-decision",
  text: "Project Atlas decided to ship the memory dashboard before dream mode.",
  tags: ["project:atlas", "decision"],
  kind: "decision",
  source: "manual_note",
  sensitivity: "low",
  priority: 8,
  createdAt: "2026-06-27T01:00:00.000Z",
  updatedAt: "2026-06-27T01:00:00.000Z",
  evidenceIds: ["ev-low"]
};

const SENSITIVE_RECORD: MemoryRecord = {
  id: "mem-secret",
  text: "The production credential is sk-test-123456.",
  tags: ["person:ceo", "credential:sk-test-123456"],
  source: "conversation",
  sensitivity: "restricted",
  createdAt: "2026-06-27T02:00:00.000Z",
  updatedAt: "2026-06-27T02:00:00.000Z"
};

const PENDING_PROPOSAL: MemoryProposal = {
  id: "memprop-1",
  status: "pending",
  input: {
    id: "mem-sensitive-proposal",
    text: "User legal strategy should be remembered.",
    tags: ["sensitive"],
    sensitivity: "high"
  },
  decision: {
    action: "propose",
    sensitivity: "high",
    requiresApproval: true,
    reason: "sensitive memory requires approval"
  },
  context: {
    actor: "agent",
    externalTaint: false,
    runtime: "test",
    sourceKind: "conversation",
    trust: "unknown"
  },
  createdAt: "2026-06-27T03:00:00.000Z",
  updatedAt: "2026-06-27T03:00:00.000Z"
};

const LOW_EVIDENCE: MemoryEvidenceRecord = {
  id: "ev-low",
  kind: "manual_note",
  source: "meeting note",
  sensitivity: "low",
  status: "active",
  summary: "Decision source",
  contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  createdAt: "2026-06-27T01:05:00.000Z",
  updatedAt: "2026-06-27T01:05:00.000Z"
};

const SECRET_LOOKING_LOW_RECORD: MemoryRecord = {
  id: "mem-low-secret-looking",
  text: "The API key is sk-test-abcdef and password=opensesame.",
  tags: ["ops"],
  source: "manual_note",
  sensitivity: "low",
  createdAt: "2026-06-27T06:00:00.000Z",
  updatedAt: "2026-06-27T06:00:00.000Z"
};

const HIGH_EVIDENCE: MemoryEvidenceRecord = {
  id: "ev-high",
  kind: "external_document",
  source: "https://example.com/private-source",
  sensitivity: "high",
  status: "active",
  summary: "Private acquisition details",
  contentHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  uri: "https://example.com/private-doc",
  createdAt: "2026-06-27T06:05:00.000Z",
  updatedAt: "2026-06-27T06:05:00.000Z"
};

const EVENTS: MemoryLedgerEvent[] = [
  {
    id: "mevt-1",
    type: "memory_accepted",
    targetType: "memory",
    targetId: "mem-project-decision",
    memoryId: "mem-project-decision",
    actor: "user",
    createdAt: "2026-06-27T01:10:00.000Z",
    reason: "accepted"
  },
  {
    id: "mevt-2",
    type: "proposal_created",
    targetType: "proposal",
    targetId: "memprop-1",
    proposalId: "memprop-1",
    actor: "agent",
    createdAt: "2026-06-27T03:10:00.000Z",
    reason: "proposal"
  }
];

describe("memory Obsidian projection", () => {
  it("builds deterministic Markdown with sensitive memory and proposal text redacted", () => {
    const markdown = buildMemoryObsidianProjectionMarkdown({
      generatedAt: "2026-06-27T04:00:00.000Z",
      records: [SENSITIVE_RECORD, LOW_RECORD],
      proposals: [PENDING_PROPOSAL],
      evidence: [LOW_EVIDENCE],
      events: EVENTS
    });

    expect(markdown).toContain("generated_at: 2026-06-27T04:00:00.000Z");
    expect(markdown).toContain("mem-project-decision");
    expect(markdown).toContain("Project Atlas decided to ship the memory dashboard");
    expect(markdown).toContain("ev-low");
    expect(markdown).toContain("[redacted: restricted memory]");
    expect(markdown).toContain("[redacted: high memory proposal]");
    expect(markdown).not.toContain("sk-test-123456");
    expect(markdown).not.toContain("person:ceo");
    expect(markdown).not.toContain("User legal strategy");
    expect(markdown).toBe(buildMemoryObsidianProjectionMarkdown({
      generatedAt: "2026-06-27T04:00:00.000Z",
      records: [SENSITIVE_RECORD, LOW_RECORD],
      proposals: [PENDING_PROPOSAL],
      evidence: [LOW_EVIDENCE],
      events: EVENTS
    }));
  });

  it("resolves only repo-local allowed Obsidian projection paths", async () => {
    const repoRoot = await mkdtemp(path.join(tmpdir(), "xenesis-projection-"));

    const target = resolveMemoryObsidianProjectionPath({
      repoRoot,
      area: "outputs",
      fileName: "memory-dashboard.md"
    });

    expect(target).toBe(
      path.join(repoRoot, "docs", "obsidian", "Xenesis-desk", "80_AI", "Outputs", "memory-dashboard.md")
    );
    expect(() =>
      resolveMemoryObsidianProjectionPath({
        repoRoot,
        area: "outputs",
        fileName: "../escape.md"
      })
    ).toThrow(/outside allowed Obsidian projection area/i);
    expect(() =>
      resolveMemoryObsidianProjectionPath({
        repoRoot,
        area: "external",
        fileName: "memory-dashboard.md",
        requestedPath: path.join(tmpdir(), "Obsidian Vault", "Xenesis-desk", "80_AI", "Outputs", "external.md")
      })
    ).toThrow(/repo-local docs\/obsidian/i);
  });

  it("writes the projection to the allowed repo-local vault output area", async () => {
    const repoRoot = await mkdtemp(path.join(tmpdir(), "xenesis-projection-"));
    const result = await writeMemoryObsidianProjection({
      repoRoot,
      area: "outputs",
      fileName: "memory-dashboard.md",
      generatedAt: "2026-06-27T04:00:00.000Z",
      records: [LOW_RECORD],
      proposals: [],
      evidence: [LOW_EVIDENCE],
      events: EVENTS
    });

    expect(result.path).toBe(
      path.join(repoRoot, "docs", "obsidian", "Xenesis-desk", "80_AI", "Outputs", "memory-dashboard.md")
    );
    expect(result.counts).toEqual({ records: 1, proposals: 0, evidence: 1, events: 2 });
    const written = await readFile(result.path, "utf8");
    expect(written).toContain("Memory Projection");
    expect(written).toContain("mem-project-decision");
  });

  it("reclassifies secret-looking low-labelled records and hides sensitive evidence source/hash fields", () => {
    const markdown = buildMemoryObsidianProjectionMarkdown({
      generatedAt: "2026-06-27T07:00:00.000Z",
      records: [SECRET_LOOKING_LOW_RECORD],
      proposals: [],
      evidence: [HIGH_EVIDENCE],
      events: [
        {
          id: "mevt-secret",
          type: "proposal_created",
          targetType: "proposal",
          targetId: "memprop-secret",
          proposalId: "memprop-secret",
          actor: "agent",
          createdAt: "2026-06-27T07:05:00.000Z",
          reason: "contains token sk-test-event-secret"
        }
      ]
    });

    expect(markdown).toContain("[redacted: restricted memory]");
    expect(markdown).toContain("[redacted: restricted event reason]");
    expect(markdown).toContain("[redacted: high evidence]");
    expect(markdown).toContain("[redacted: high evidence summary]");
    expect(markdown).not.toContain("sk-test-abcdef");
    expect(markdown).not.toContain("opensesame");
    expect(markdown).not.toContain("sk-test-event-secret");
    expect(markdown).not.toContain("bbbbbbbb");
    expect(markdown).not.toContain("private-doc");
    expect(markdown).not.toContain("private-source");
  });

  it("emits the same Markdown for the same snapshot regardless of input ordering", () => {
    const left = buildMemoryObsidianProjectionMarkdown({
      generatedAt: "2026-06-27T07:00:00.000Z",
      records: [SENSITIVE_RECORD, LOW_RECORD, SECRET_LOOKING_LOW_RECORD],
      proposals: [PENDING_PROPOSAL],
      evidence: [HIGH_EVIDENCE, LOW_EVIDENCE],
      events: [...EVENTS].reverse()
    });
    const right = buildMemoryObsidianProjectionMarkdown({
      generatedAt: "2026-06-27T07:00:00.000Z",
      records: [LOW_RECORD, SECRET_LOOKING_LOW_RECORD, SENSITIVE_RECORD],
      proposals: [PENDING_PROPOSAL],
      evidence: [LOW_EVIDENCE, HIGH_EVIDENCE],
      events: EVENTS
    });

    expect(left).toBe(right);
  });
});
