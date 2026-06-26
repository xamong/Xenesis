import { describe, it, expect } from "vitest";
import { compactedHistoryMessages } from "../../src/core/AgentRunner.js";
import type { AgentMessage } from "../../src/core/messages.js";

// Covers the SECOND compaction entry point: the history-seeded sentinel builder
// (compactedHistoryMessages -> compactHistoryMessages). It must carry the same
// REFERENCE-ONLY hardening as compactConversation's summaryMessage so resumed-from-
// history sessions also get the weak-model "do not resume summarized task" guard.
describe("history-seeded compaction hardening", () => {
  function manyMessages(count: number): AgentMessage[] {
    const out: AgentMessage[] = [];
    for (let i = 0; i < count; i += 1) {
      out.push({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` });
    }
    return out;
  }

  it("emits the REFERENCE-ONLY preamble and END OF CONTEXT SUMMARY marker", () => {
    const result = compactedHistoryMessages(manyMessages(20), 5, 4);
    const sentinel = result[0]!;
    expect(sentinel.role).toBe("system");
    const content = (sentinel as Extract<AgentMessage, { role: "system" }>).content;
    expect(content).toContain("REFERENCE ONLY");
    expect(content).toContain("--- END OF CONTEXT SUMMARY ---");
  });

  it("keeps the exact first line so isCompactSummaryMessage detection holds", () => {
    const result = compactedHistoryMessages(manyMessages(20), 5, 4);
    const content = (result[0] as Extract<AgentMessage, { role: "system" }>).content;
    expect(content.startsWith("Xenesis compacted session context:")).toBe(true);
  });

  it("does not compact (no sentinel) when history is at/below the threshold", () => {
    const msgs = manyMessages(3);
    const result = compactedHistoryMessages(msgs, 5, 4);
    expect(result.every((m) => m.role !== "system")).toBe(true);
    expect(result).toHaveLength(3);
  });
});
