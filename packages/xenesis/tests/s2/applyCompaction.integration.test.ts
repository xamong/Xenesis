import { describe, it, expect } from "vitest";
import { compactConversation } from "../../src/core/context/compaction/compactConversation.js";
import { pruneOlderMessages } from "../../src/core/context/compaction/pruneToolResults.js";
import { createLlmSummarizer } from "../../src/core/context/compaction/llmSummarizer.js";
import type { AgentMessage } from "../../src/core/messages.js";

it("end-to-end: prune + injected llm summarizer + reference-only sentinel", async () => {
  const big = "W".repeat(6000);
  const msgs: AgentMessage[] = [
    { role: "user", content: "task" },
    { role: "tool", toolCallId: "a", name: "read", content: big },
    { role: "tool", toolCallId: "b", name: "read", content: big },
    { role: "assistant", content: "ok" },
    { role: "user", content: "go on" }
  ];
  let prevSeen: string | undefined = "PRIOR";
  const summarize = createLlmSummarizer({
    complete: async (m) => `SUMMARY(${m.length} msgs)`
  });
  const result = await compactConversation({
    messages: msgs,
    keepRecentTokens: 5,
    estimateTokens: (m) => m.reduce((n, x) => n + Math.ceil(((x as any).content?.length ?? 0) / 4), 0),
    pruneOlder: (older) => pruneOlderMessages(older, { threshold: 2000 }).messages,
    summarize: (older) => summarize(older, prevSeen)
  });
  const sentinel = result.messages[0] as any;
  expect(sentinel.role).toBe("system");
  expect(sentinel.content).toContain("Xenesis compacted session context:");
  expect(sentinel.content).toContain("REFERENCE ONLY");
  expect(sentinel.content).toContain("--- END OF CONTEXT SUMMARY ---");
  expect(sentinel.content).toContain("SUMMARY(");
  expect(result.summary).toContain("SUMMARY(");
});
