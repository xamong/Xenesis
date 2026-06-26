import { describe, it, expect } from "vitest";
import { createMcpClient, RemoteMcpToolClient, StdioMcpToolClient } from "../../src/extensions/mcp.js";

describe("createMcpClient", () => {
  it("dispatches an http config to RemoteMcpToolClient", () => {
    const c = createMcpClient("s", { type: "http", url: "https://h/mcp" }, "/ws");
    expect(c).toBeInstanceOf(RemoteMcpToolClient);
  });
  it("dispatches an explicit stdio config to StdioMcpToolClient", () => {
    const c = createMcpClient("s", { type: "stdio", command: "node", args: [], env: {} }, "/ws");
    expect(c).toBeInstanceOf(StdioMcpToolClient);
  });
  it("dispatches a legacy (no type) config to StdioMcpToolClient", () => {
    const c = createMcpClient("s", { command: "node", args: [], env: {} }, "/ws");
    expect(c).toBeInstanceOf(StdioMcpToolClient);
  });
});
