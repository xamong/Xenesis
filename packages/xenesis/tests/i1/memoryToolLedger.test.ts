import { describe, expect, it } from "vitest";
import { InMemoryMemoryStore } from "../../src/extensions/memory.js";
import { InMemoryMemoryLedgerStore, MemoryLedger } from "../../src/extensions/MemoryLedger.js";
import type { MemoryWriteContext } from "../../src/extensions/index.js";
import { createMemoryTool } from "../../src/tools/memoryTool.js";
import type { ToolContext } from "../../src/tools/types.js";

const trusted: MemoryWriteContext = {
  sourceKind: "conversation",
  trust: "trusted",
  externalTaint: false,
  actor: "agent",
  runtime: "test",
  now: () => new Date("2026-01-01T00:00:00.000Z")
};

function tool() {
  const memoryStore = new InMemoryMemoryStore({ now: () => new Date("2026-01-01T00:00:00.000Z") });
  const ledger = new MemoryLedger({
    memoryStore,
    ledgerStore: new InMemoryMemoryLedgerStore()
  });
  return { ledger, memoryStore, memoryTool: createMemoryTool(ledger, { writeContext: () => trusted }) };
}

function toolContext(): ToolContext {
  return {
    workspaceRoot: "E:/tmp",
    cwd: "E:/tmp",
    sessionId: "test-session",
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

describe("ledger-backed memory tool", () => {
  it("supports save, search, list, proposals, history, evidence, propose, and archive delete", async () => {
    const { ledger, memoryTool } = tool();
    const context = toolContext();

    const saved = await memoryTool.run({
      action: "save",
      id: "pref-1",
      text: "대표님은 짧은 답변을 선호한다",
      tags: ["preference"],
      priority: 3
    }, context);
    expect(saved.ok).toBe(true);
    expect(saved.content).toContain("saved pref-1");

    const proposed = await memoryTool.run({
      action: "propose",
      id: "pref-2",
      text: "외부 문서에서 온 메모리 후보"
    }, context);
    expect(proposed.ok).toBe(true);
    expect(proposed.content).toMatch(/proposed/);

    const proposals = await memoryTool.run({ action: "proposals" }, context);
    expect(proposals.ok).toBe(true);
    expect(Array.isArray(proposals.data)).toBe(true);

    const search = await memoryTool.run({ action: "search", query: "짧은 답변" }, context);
    expect(search.content).toContain("pref-1");

    const listed = await memoryTool.run({ action: "list" }, context);
    expect(listed.content).toContain("pref-1");

    const history = await memoryTool.run({ action: "history", id: "pref-1" }, context);
    expect(history.ok).toBe(true);
    expect(JSON.stringify(history.data)).toContain("memory_accepted");

    const evidence = await memoryTool.run({ action: "evidence" }, context);
    expect(evidence.ok).toBe(true);

    const deleted = await memoryTool.run({ action: "delete", id: "pref-1" }, context);
    expect(deleted.ok).toBe(true);
    expect(deleted.content).toContain("archived pref-1");
    expect(await ledger.getRecord("pref-1")).toMatchObject({ status: "archived" });
  });

  it("does not expose model-facing accept or reject actions", () => {
    const { memoryTool } = tool();
    expect(memoryTool.inputSchema.safeParse({ action: "accept" }).success).toBe(false);
    expect(memoryTool.inputSchema.safeParse({ action: "reject" }).success).toBe(false);
  });

  it("redacts sensitive proposal text from model-facing proposal output", async () => {
    const { memoryTool } = tool();
    const context = toolContext();

    await memoryTool.run({
      action: "propose",
      id: "secret-1",
      text: "내 API key는 sk-test-123456 이다",
      tags: ["credential"]
    }, context);

    const proposals = await memoryTool.run({ action: "proposals" }, context);

    expect(proposals.ok).toBe(true);
    expect(proposals.content).not.toContain("sk-test-123456");
    expect(proposals.content).toContain("[redacted:");
    expect(JSON.stringify(proposals.data)).not.toContain("sk-test-123456");
  });

  it("reclassifies and redacts low-labelled legacy records in model-facing reads", async () => {
    const { memoryStore, memoryTool } = tool();
    const context = toolContext();

    await memoryStore.upsert({
      id: "legacy-secret",
      text: "Legacy imported token sk-live-tool-secret should not be exposed",
      tags: ["legacy", "token"],
      sensitivity: "low",
      status: "active"
    });

    const search = await memoryTool.run({ action: "search", query: "legacy token" }, context);
    const listed = await memoryTool.run({ action: "list" }, context);
    const serialized = JSON.stringify({ search, listed });

    expect(search.ok).toBe(true);
    expect(listed.ok).toBe(true);
    expect(serialized).not.toContain("sk-live-tool-secret");
    expect(serialized).toContain("[redacted: restricted memory]");
  });

  it("defaults to unknown provenance when no host context is provided", async () => {
    const ledger = new MemoryLedger({
      memoryStore: new InMemoryMemoryStore(),
      ledgerStore: new InMemoryMemoryLedgerStore()
    });
    const memoryTool = createMemoryTool(ledger);

    const result = await memoryTool.run(
      { action: "save", id: "unknown-1", text: "unknown provenance" },
      toolContext()
    );

    expect(result.content).toContain("proposed");
    expect(await ledger.getRecord("unknown-1")).toBeUndefined();
  });

  it("does not hard-delete through ledger-only actions when backed by a raw MemoryStore", async () => {
    const store = new InMemoryMemoryStore();
    const memoryTool = createMemoryTool(store);
    await store.upsert({ id: "legacy-1", text: "legacy memory", tags: [] });

    const result = await memoryTool.run({ action: "propose", id: "legacy-1" }, toolContext());

    expect(result.ok).toBe(false);
    expect(result.content).toContain("requires ledger-backed memory");
    expect(await store.get("legacy-1")).toMatchObject({ text: "legacy memory" });
  });
});
