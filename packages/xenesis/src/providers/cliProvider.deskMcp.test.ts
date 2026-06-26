import { describe, it, expect } from "vitest";
import { deskMcpSystemMessage } from "./cliProvider.js";

describe("deskMcpSystemMessage lean", () => {
  it("uses a family pointer, not the full catalog dump or hard chat-only imperative", () => {
    const msg = deskMcpSystemMessage("codex-cli");
    expect(msg.content).not.toContain("Capability family intent catalog:");
    expect(msg.content).not.toContain("Do not answer with chat-only approval text");
    expect(msg.content).toContain("xenesis_desk_capabilities");
    expect(msg.content.toLowerCase()).toContain("explorer");
    expect(msg.content.toLowerCase()).toContain("terminal");
  });
});
