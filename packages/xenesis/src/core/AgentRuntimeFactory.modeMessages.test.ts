import { describe, it, expect } from "vitest";
import { createModeSystemMessages } from "./AgentRuntimeFactory.js";

describe("createModeSystemMessages chat default", () => {
  it("returns a conversational-default block when no plan/work mode is set (chat)", () => {
    const msgs = createModeSystemMessages(undefined);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toContain("Xenesis mode: chat");
    expect(msgs[0].content.toLowerCase()).toContain("conversation");
    expect(msgs[0].content).not.toContain("MUST");
  });
});
