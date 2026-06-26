import { describe, it, expect } from "vitest";
import { eventsToMessages } from "../../src/sessions/history.js";
import type { SessionLogRecord } from "../../src/sessions/history.js";

describe("AgentMessage.id backfill", () => {
  it("carries through an explicit id", () => {
    const recs = [
      { type: "user_message", sessionId: "s", timestamp: "t", message: { role: "user", content: "hi", id: "s:m0" } }
    ] as unknown as SessionLogRecord[];
    expect(eventsToMessages(recs)[0].id).toBe("s:m0");
  });
  it("backfills a deterministic id when absent (pre-S7 log)", () => {
    const recs = [
      { type: "user_message", sessionId: "s", timestamp: "t", message: { role: "user", content: "a" } },
      { type: "assistant_message", sessionId: "s", timestamp: "t", message: { role: "assistant", content: "b" } }
    ] as unknown as SessionLogRecord[];
    const out = eventsToMessages(recs);
    expect(out[0].id).toBe("s:r0");
    expect(out[1].id).toBe("s:r1");
    // deterministic: same input -> same ids
    expect(eventsToMessages(recs).map((m) => m.id)).toEqual(["s:r0", "s:r1"]);
  });
});
