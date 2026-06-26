import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createMcpTools, type McpToolClient } from "../../src/extensions/mcp.js";
import { createToolSearchTool } from "../../src/tools/toolSearchTool.js";
import type { Tool, ToolContext, ToolRegistry } from "../../src/tools/types.js";

function toolClient(overrides: Partial<McpToolClient> = {}): McpToolClient {
  return {
    listTools: async () => [{ name: "snap", description: "take a screenshot" }],
    callTool: async () => ({ content: [{ type: "text", text: "ok" }], isError: false }),
    close: async () => {},
    ...overrides
  };
}

function fakeToolContext(): ToolContext {
  return {
    workspaceRoot: process.cwd(),
    cwd: process.cwd(),
    sessionId: "mcp-deferred-test",
    todos: [],
    emit: () => {},
    logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }
  };
}

describe("createMcpTools marks MCP server tools as deferred (isMcp)", () => {
  it("flags the per-definition MCP tool with isMcp:true", async () => {
    const tools = await createMcpTools({ serverName: "vision", client: toolClient() });
    const tool = tools.find((t) => t.name === "mcp__vision__snap");
    expect(tool).toBeDefined();
    expect(tool!.isMcp).toBe(true);
  });

  // Parity with main: main flags isMcp only on the per-definition MCP tools, NOT on the
  // aggregate resource_read / prompt_get helper tools. Keep those discovery helpers
  // non-deferred so they stay directly available, matching main's createMcpTools.
  it("does NOT flag the aggregate resource_read / prompt_get tools as isMcp", async () => {
    const tools = await createMcpTools({
      serverName: "vision",
      client: toolClient({
        listResources: async () => [{ uri: "file://a.txt", name: "a" }],
        readResource: async () => ({ contents: [{ uri: "file://a.txt", text: "x" }] }),
        listPrompts: async () => [{ name: "review", description: "review code" }],
        getPrompt: async () => ({ messages: [{ role: "user", content: { type: "text", text: "hi" } }] })
      })
    });
    const perDefinition = tools.find((t) => t.name === "mcp__vision__snap");
    const resourceRead = tools.find((t) => t.name === "mcp__vision__resource_read");
    const promptGet = tools.find((t) => t.name === "mcp__vision__prompt_get");
    expect(perDefinition?.isMcp).toBe(true);
    expect(resourceRead).toBeDefined();
    expect(promptGet).toBeDefined();
    expect(resourceRead!.isMcp).toBeFalsy();
    expect(promptGet!.isMcp).toBeFalsy();
  });
});

describe("tool_search discovers MCP server tools via the deferred path", () => {
  it("includes the MCP tool in the deferred set and matches an mcp__ prefix query", async () => {
    const mcpTools = await createMcpTools({ serverName: "vision", client: toolClient() });
    const registry: ToolRegistry = new Map();
    for (const t of mcpTools) registry.set(t.name, t);
    // A regular, non-deferred tool that must NOT be counted as deferred.
    const plain: Tool = {
      name: "read_file",
      description: "Read a file from disk",
      inputSchema: z.object({ path: z.string() }),
      isReadOnly: () => true,
      run: async () => ({ ok: true, content: "" })
    };
    registry.set(plain.name, plain);

    const search = createToolSearchTool(registry);
    const result = await search.run({ query: "mcp__vision__snap" }, fakeToolContext());
    const data = result.data as unknown as { total_deferred_tools?: number; matches?: string[] };

    expect(data.total_deferred_tools).toBe(1);
    expect(data.matches).toContain("mcp__vision__snap");
  });
});
