import { describe, it, expect } from "vitest";
import { estimateMessagesTokens } from "../../src/core/AgentRunner.js";
import { computeContextTokenBudget } from "../../src/core/context/modelMetadata.js";
import { compactConversation, shouldThrash } from "../../src/core/context/compaction/compactConversation.js";
import type { AgentMessage } from "../../src/core/messages.js";

// Mirrors the preflight condition in compactActiveMessages:
//   estimateMessagesTokens(compactable) > computeContextTokenBudget(...) * ratio
function preflightTriggered(compactable: AgentMessage[], model: string, scaffoldTokens: number, ratio: number) {
  const budget = computeContextTokenBudget({ modelId: model, scaffoldTokens });
  return estimateMessagesTokens(compactable) > budget * ratio;
}

// Mirrors applyStructuredCompaction's guard (AgentRunner.ts):
//   if (!options.force && shouldThrash(recentSavedRatios)) return undefined;
// i.e. once a trigger has fired, the thrash guard still decides whether compaction proceeds.
function compactionSuppressedByThrash(recentSavedRatios: number[], force = false) {
  return !force && shouldThrash(recentSavedRatios);
}

describe("preflight token trigger", () => {
  it("fires when estimated tokens exceed budget*ratio", () => {
    // haiku window 200k - maxOut 64k - reserve 16384 - scaffold 0 = 119616 budget; ratio .8 => ~95692 token gate => ~382768 chars
    const huge: AgentMessage[] = [{ role: "user", content: "Z".repeat(400_000) }];
    expect(preflightTriggered(huge, "claude-haiku-4-5", 0, 0.8)).toBe(true);
  });

  it("does not fire for a small history", () => {
    const small: AgentMessage[] = [{ role: "user", content: "hello" }];
    expect(preflightTriggered(small, "claude-haiku-4-5", 0, 0.8)).toBe(false);
  });

  it("thrash guard still suppresses compaction even when the preflight trigger fired", () => {
    // Preflight trigger fires: a huge history is well over budget*ratio.
    const huge: AgentMessage[] = [{ role: "user", content: "Z".repeat(400_000) }];
    expect(preflightTriggered(huge, "claude-haiku-4-5", 0, 0.8)).toBe(true);

    // ...but the last two compactions each saved < 10% (thrash state). applyStructuredCompaction
    // gates on `shouldThrash` *after* the trigger, so the non-forced path must bail out (undefined).
    const thrashingRatios = [0.05, 0.02];
    expect(shouldThrash(thrashingRatios)).toBe(true);
    expect(compactionSuppressedByThrash(thrashingRatios, /* force */ false)).toBe(true);

    // The force path (provider context-limit error) is the documented escape and ignores the guard.
    expect(compactionSuppressedByThrash(thrashingRatios, /* force */ true)).toBe(false);
  });

  it("does not suppress when recent saved ratios show healthy savings (preflight proceeds)", () => {
    const huge: AgentMessage[] = [{ role: "user", content: "Z".repeat(400_000) }];
    expect(preflightTriggered(huge, "claude-haiku-4-5", 0, 0.8)).toBe(true);

    const healthyRatios = [0.05, 0.42]; // most recent compaction saved plenty
    expect(shouldThrash(healthyRatios)).toBe(false);
    expect(compactionSuppressedByThrash(healthyRatios, false)).toBe(false);
  });

  it("integration: thrash-state savedRatios drive shouldThrash from real compactConversation output", async () => {
    // Build a recentSavedRatios history the way the runner does: push each compaction's savedRatio.
    // When compaction barely shrinks the transcript, savedRatio stays < 0.10 and two such runs trip the guard.
    const estimateTokens = (m: AgentMessage[]) =>
      m.reduce((n, x) => n + Math.ceil((((x as any).content ?? "").length) / 4), 0);

    const buildLowSavingsRun = async (): Promise<number> => {
      // Older slice IS summarized (so the runner would push its savedRatio), but the summary text is
      // almost as large as the slice it replaces → savedRatio < 0.10 → a "thrash" data point.
      const olderBlob = "o".repeat(4000); // ~1000 tokens of summarized-away history
      const msgs: AgentMessage[] = [
        { role: "user", content: olderBlob },
        { role: "user", content: "recent".repeat(50) }
      ];
      const result = await compactConversation({
        messages: msgs,
        keepRecentTokens: 100, // small → first message becomes the older slice and is summarized
        estimateTokens,
        summarize: async () => "S".repeat(3950) // replacement nearly as big as the original older slice
      });
      expect(result.summarized).toBe(true); // the runner only records savedRatio for summarized runs
      return result.savedRatio;
    };

    const recentSavedRatios = [await buildLowSavingsRun(), await buildLowSavingsRun()];
    expect(recentSavedRatios.every((r) => r < 0.1)).toBe(true);
    expect(shouldThrash(recentSavedRatios)).toBe(true);
    // Therefore, even with the preflight trigger asserting true, the non-forced compaction is suppressed.
    expect(compactionSuppressedByThrash(recentSavedRatios, false)).toBe(true);
  });
});
