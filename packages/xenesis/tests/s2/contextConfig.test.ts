import { describe, it, expect } from "vitest";
import { defaultConfig, type ContextConfig } from "../../src/config/types.js";
import { contextSchema } from "../../src/config/loadConfig.js";
import { loadConfig } from "../../src/config/loadConfig.js";
import { configTool } from "../../src/tools/configTool.js";
import type { ToolContext } from "../../src/tools/types.js";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

function makeContext(root: string): ToolContext {
  return {
    workspaceRoot: root,
    cwd: root,
    env: {},
    sessionId: "test",
    todos: [],
    emit() {},
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

describe("S2 ContextConfig keys", () => {
  it("defaults the new compaction knobs", () => {
    const ctx: ContextConfig = defaultConfig.context;
    expect(ctx.llmSummary).toBe(true);
    expect(ctx.summarizationModel).toBe("claude-haiku-4-5");
    expect(ctx.summarizationProvider).toBeUndefined();
    expect(ctx.pruneToolResults).toBe(true);
    expect(ctx.pruneToolResultThreshold).toBe(2000);
    expect(ctx.stripOldImages).toBe(true);
    expect(ctx.compactTokenThresholdRatio).toBe(0.8);
  });

  it("parses overrides through the zod schema", () => {
    const ctx = contextSchema.parse({
      llmSummary: false,
      summarizationModel: "claude-sonnet-4-6",
      pruneToolResultThreshold: 1500,
      compactTokenThresholdRatio: 0.7
    });
    expect(ctx.llmSummary).toBe(false);
    expect(ctx.summarizationModel).toBe("claude-sonnet-4-6");
    expect(ctx.pruneToolResultThreshold).toBe(1500);
    expect(ctx.compactTokenThresholdRatio).toBe(0.7);
    // untouched keys keep defaults
    expect(ctx.stripOldImages).toBe(true);
  });

  it("honors env overrides for boolean/string knobs", async () => {
    // Use a temp directory that has no config file so file config is empty
    const cfg = await loadConfig({
      cwd: resolve(tmpdir()),
      env: { XENESIS_LLM_SUMMARY: "false", XENESIS_SUMMARIZATION_MODEL: "claude-sonnet-4-6" }
    });
    expect(cfg.context.llmSummary).toBe(false);
    // Non-default model id so the assertion fails if the env wiring is removed.
    expect(cfg.context.summarizationModel).toBe("claude-sonnet-4-6");
  });

  it("persists compactTokenThresholdRatio as a number that survives reload", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "xenesis-s2-cfg-"));
    try {
      const context = makeContext(root);
      const result = await configTool.run(
        { setting: "context.compactTokenThresholdRatio", value: "0.7" },
        context
      );
      expect(result.ok).toBe(true);
      // Stored value must be the parsed number, not the literal string.
      expect(result.data?.newValue).toBe(0.7);

      // The persisted JSON holds a number, not "0.7".
      const raw = await readFile(resolve(root, "xenesis.config.json"), "utf8");
      expect(JSON.parse(raw).context.compactTokenThresholdRatio).toBe(0.7);

      // A fresh loadConfig must not throw and must read back the number.
      const reloaded = await loadConfig({ cwd: root, env: {} });
      expect(reloaded.context.compactTokenThresholdRatio).toBe(0.7);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects an out-of-range compactTokenThresholdRatio without writing", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "xenesis-s2-cfg-"));
    try {
      const context = makeContext(root);
      const result = await configTool.run(
        { setting: "context.compactTokenThresholdRatio", value: "5" },
        context
      );
      expect(result.ok).toBe(false);
      // No config file should have been written for the rejected value.
      await expect(readFile(resolve(root, "xenesis.config.json"), "utf8")).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
