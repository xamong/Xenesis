import { describe, it, expect } from "vitest";
import { pruneOlderMessages } from "../../src/core/context/compaction/pruneToolResults.js";
import type { AgentMessage } from "../../src/core/messages.js";

const tool = (toolCallId: string, name: string, content: string, attachments?: any): AgentMessage =>
  ({ role: "tool", toolCallId, name, content, ...(attachments ? { attachments } : {}) });

describe("pruneOlderMessages", () => {
  it("dedupes identical tool results, clearing the earlier copy", () => {
    const big = "X".repeat(50);
    const msgs: AgentMessage[] = [tool("a", "read", big), tool("b", "read", big)];
    const { messages, prunedCount } = pruneOlderMessages(msgs, { threshold: 10000 });
    expect((messages[0] as any).content).toContain("duplicate tool output cleared");
    expect((messages[1] as any).content).toBe(big); // most recent identical copy retained verbatim
    expect(prunedCount).toBe(1);
  });

  it("replaces an oversized tool result with a one-line descriptor and drops attachments", () => {
    const content = "line one\n" + "Y".repeat(5000);
    const msgs: AgentMessage[] = [tool("a", "shell", content, [{ kind: "image", name: "s.png", dataUrl: "data:...", mimeType: "image/png" }])];
    const { messages } = pruneOlderMessages(msgs, { threshold: 2000 });
    const out = messages[0] as any;
    expect(out.content).toMatch(/\[shell\] result elided \(\d+ chars\): line one/);
    expect(out.attachments).toBeUndefined();
  });

  it("shrinks oversized assistant tool-call input (serialized as JSON)", () => {
    // ToolCall.input is unknown (object), so we measure JSON.stringify length
    const hugeInput = { data: "Z".repeat(5000) };
    const msgs: AgentMessage[] = [
      { role: "assistant", content: "", toolCalls: [{ id: "t1", name: "x", input: hugeInput } as any] }
    ];
    const { messages } = pruneOlderMessages(msgs, { threshold: 2000 });
    const tc = (messages[0] as any).toolCalls[0];
    // input should be replaced with an elided sentinel object
    expect(JSON.stringify(tc.input)).toMatch(/elided/);
  });

  it("leaves under-threshold content untouched and does not mutate inputs", () => {
    const original = tool("a", "read", "small");
    const msgs: AgentMessage[] = [original];
    const { messages, prunedCount } = pruneOlderMessages(msgs, { threshold: 2000 });
    expect((messages[0] as any).content).toBe("small");
    expect(prunedCount).toBe(0);
    expect(messages[0]).not.toBe(original); // returns a new array of (possibly cloned) messages
    expect((original as any).content).toBe("small"); // input object unchanged
  });
});

import { compactConversation } from "../../src/core/context/compaction/compactConversation.js";

it("compactConversation applies pruneOlder before summarize and returns summary text", async () => {
  const big = "Q".repeat(5000);
  const msgs: AgentMessage[] = [
    { role: "user", content: "start" },
    tool("a", "read", big),
    tool("b", "read", big),
    { role: "assistant", content: "done" },
    { role: "user", content: "next" }
  ];
  let sawForSummary: AgentMessage[] = [];
  const result = await compactConversation({
    messages: msgs,
    keepRecentTokens: 5, // keep only the very last message
    estimateTokens: (m) => m.reduce((n, x) => n + Math.ceil(((x as any).content?.length ?? 0) / 4), 0),
    pruneOlder: (older) => pruneOlderMessages(older, { threshold: 2000 }).messages,
    summarize: async (older) => { sawForSummary = older; return "SUMMARY"; }
  });
  // the dedup'd / descriptor'd older slice reached the summarizer (no raw 5000-char blob)
  expect(sawForSummary.some((m) => (m as any).content?.includes(big))).toBe(false);
  expect(result.summary).toBe("SUMMARY");
  expect(result.summarized).toBe(true);
});
