import { describe, it, expect } from "vitest";
import { registerMcpServerTools, type McpToolClient } from "../../src/extensions/mcp.js";
import type { Tool } from "../../src/tools/types.js";
import type { McpServerConfig } from "../../src/config/types.js";

function healthyClient(): McpToolClient {
  return {
    async listTools() { return [{ name: "ping", description: "p", inputSchema: { type: "object", properties: {} } }]; },
    async callTool() { return { content: [{ type: "text", text: "ok" }] }; },
    async close() { /* noop */ }
  };
}
function failingClient(): McpToolClient {
  return {
    async listTools(): Promise<never> { throw new Error("boom: cannot connect"); },
    async callTool() { return { content: [] }; },
    async close() { /* noop */ }
  };
}

describe("registerMcpServerTools tolerant policy", () => {
  it("registers tools from a healthy server (+ resource tools)", async () => {
    const registry = new Map<string, Tool>();
    const servers: Record<string, McpServerConfig> = { good: { type: "stdio", command: "x", args: [], env: {} } };
    await registerMcpServerTools(registry, servers, "/ws", { clientFactory: () => healthyClient() });
    expect([...registry.keys()].some((k) => k.startsWith("mcp__good__"))).toBe(true);
    expect(registry.has("list_mcp_resources")).toBe(true);
    expect(registry.has("read_mcp_resource")).toBe(true);
  });

  it("SKIPS a failing http (remote) server without throwing", async () => {
    const registry = new Map<string, Tool>();
    const servers: Record<string, McpServerConfig> = { remote: { type: "http", url: "https://h/mcp" } };
    await expect(
      registerMcpServerTools(registry, servers, "/ws", { clientFactory: () => failingClient() })
    ).resolves.toBeUndefined();
    expect([...registry.keys()].some((k) => k.startsWith("mcp__remote__"))).toBe(false);
    // no clients registered -> no global resource tools
    expect(registry.has("list_mcp_resources")).toBe(false);
  });

  it("THROWS on a failing stdio server (strict, byte-parity)", async () => {
    const registry = new Map<string, Tool>();
    const servers: Record<string, McpServerConfig> = { local: { type: "stdio", command: "x", args: [], env: {} } };
    await expect(
      registerMcpServerTools(registry, servers, "/ws", { clientFactory: () => failingClient() })
    ).rejects.toThrow(/boom/);
  });

  it("keeps a healthy server when a sibling remote server fails", async () => {
    const registry = new Map<string, Tool>();
    const servers: Record<string, McpServerConfig> = {
      good: { type: "stdio", command: "x", args: [], env: {} },
      remote: { type: "http", url: "https://h/mcp" }
    };
    await registerMcpServerTools(registry, servers, "/ws", {
      clientFactory: (name) => (name === "remote" ? failingClient() : healthyClient())
    });
    expect([...registry.keys()].some((k) => k.startsWith("mcp__good__"))).toBe(true);
    expect([...registry.keys()].some((k) => k.startsWith("mcp__remote__"))).toBe(false);
  });
});
