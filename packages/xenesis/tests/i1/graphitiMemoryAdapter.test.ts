import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConfig, loadConfig } from "../../src/config/index.js";
import {
  buildGraphitiMemoryPayload,
  validateGraphitiMemoryConfig
} from "../../src/extensions/graphitiMemoryAdapter.js";
import type { MemoryEvidenceRecord, MemoryRecord } from "../../src/extensions/index.js";

const now = "2026-06-01T00:00:00.000Z";

async function tempWorkspace() {
  return mkdtemp(join(tmpdir(), "xenesis-graphiti-config-"));
}

function record(overrides: Partial<MemoryRecord> & Pick<MemoryRecord, "id" | "text">): MemoryRecord {
  return {
    tags: [],
    updatedAt: now,
    sensitivity: "low",
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

describe("Graphiti memory adapter", () => {
  it("keeps graph projection disabled by default with local-only allowlist defaults", async () => {
    const root = await tempWorkspace();

    const config = await loadConfig({ cwd: root, env: { XENESIS_HOME: join(root, "home") } });

    expect(defaultConfig.extensions.memory.graph.enabled).toBe(false);
    expect(config.extensions.memory.graph).toMatchObject({
      enabled: false,
      localOnly: true,
      allowedEndpoints: ["http://127.0.0.1:8000", "http://localhost:8000"]
    });
  });

  it("rejects enabled graph projection when endpoint is missing", async () => {
    const root = await tempWorkspace();
    const configPath = join(root, "xenesis.config.json");
    await writeFile(configPath, JSON.stringify({
      extensions: {
        memory: {
          enabled: true,
          path: ".xenesis/memory.json",
          graph: {
            enabled: true
          }
        }
      }
    }));

    await expect(loadConfig({ cwd: root, configPath, env: { XENESIS_HOME: join(root, "home") } }))
      .rejects.toThrow(/graph.*endpoint/i);
  });

  it("rejects non-allowlisted endpoints and remote endpoints in local-only mode", () => {
    expect(() => validateGraphitiMemoryConfig({
      enabled: true,
      endpoint: "http://127.0.0.1:9000",
      allowedEndpoints: ["http://127.0.0.1:8000"],
      localOnly: true,
      allowSensitiveProjection: false,
      redactEvidence: true,
      timeoutMs: 1000
    })).toThrow(/allowlist/i);

    expect(() => validateGraphitiMemoryConfig({
      enabled: true,
      endpoint: "https://graphiti.example.com",
      allowedEndpoints: ["https://graphiti.example.com"],
      localOnly: true,
      allowSensitiveProjection: false,
      redactEvidence: true,
      timeoutMs: 1000
    })).toThrow(/local-only/i);
  });

  it("builds payloads with ledger and evidence IDs while redacting restricted evidence details", () => {
    const payload = buildGraphitiMemoryPayload(
      record({
        id: "decision-memory",
        text: "A 프로젝트 MVP는 Graphiti 조합으로 진행하기로 결정했다",
        tags: ["project", "decision"],
        source: "file://private/memory-source.md",
        validFrom: now,
        evidenceIds: ["restricted-evidence"]
      }),
      [
        evidence({
          id: "restricted-evidence",
          sensitivity: "restricted",
          source: "file://private/source.md",
          uri: "file://private/source.md",
          summary: "private source excerpt that must not leave the ledger"
        })
      ],
      { redactEvidence: true }
    );

    const json = JSON.stringify(payload);
    expect(payload.memoryId).toBe("decision-memory");
    expect(json).toContain("restricted-evidence");
    expect(json).toContain("decision-memory");
    expect(json).not.toContain("private source excerpt");
    expect(json).not.toContain("sha256:0000000000000000000000000000000000000000000000000000000000000000");
    expect(json).not.toContain("file://private/source.md");
    expect(json).not.toContain("file://private/memory-source.md");
  });
});
