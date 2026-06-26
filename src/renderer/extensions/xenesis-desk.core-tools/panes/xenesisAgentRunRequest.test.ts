import { describe, it, expect } from "vitest";
import { buildXenesisAgentRunRequest } from "./xenesisAgentRunRequest";

describe("buildXenesisAgentRunRequest casual input", () => {
  it("does not append Desk-control hint / read-only framing to a greeting", () => {
    const req = buildXenesisAgentRunRequest({
      prompt: "야",
      mode: "chat",
      source: "test",
      contextMessages: [],
    });
    expect(req.prompt).not.toContain("xenesis-desk-action");
    expect(req.prompt).not.toMatch(/read-only|sandbox/i);
    expect(req.prompt.trim()).toBe("야");
  });
});
