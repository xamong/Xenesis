import { describe, expect, test, vi } from "vitest";
import { resolveRuntimeMcpServers } from "../../src/core/AgentRuntimeFactory.js";
import { defaultConfig, type XenesisConfig } from "../../src/config/index.js";
import {
  registerMcpServerTools,
  type McpToolClient
} from "../../src/extensions/mcp.js";

function makeConfig(extensions: Partial<XenesisConfig["extensions"]> = {}): XenesisConfig {
  return {
    provider: "mock",
    model: "mock-model",
    providerRetries: defaultConfig.providerRetries,
    providerFallbacks: defaultConfig.providerFallbacks,
    context: defaultConfig.context,
    hooks: defaultConfig.hooks,
    verification: defaultConfig.verification,
    guard: defaultConfig.guard,
    workflow: defaultConfig.workflow,
    workflows: defaultConfig.workflows,
    worker: defaultConfig.worker,
    isolation: defaultConfig.isolation,
    channels: defaultConfig.channels,
    browser: defaultConfig.browser,
    shell: defaultConfig.shell,
    maxTurns: 8,
    xenesisHome: ".xenesis",
    workspace: "/workspace/root",
    approvalMode: "safe",
    extensions: { ...defaultConfig.extensions, ...extensions },
    permissions: defaultConfig.permissions,
    approval: defaultConfig.approval
  };
}

function fakeClient(toolNames: string[]): McpToolClient {
  return {
    async listTools() {
      return toolNames.map((name) => ({ name, inputSchema: { type: "object" } }));
    },
    async callTool() {
      return { content: [{ type: "text", text: "ok" }] };
    },
    async close() {}
  };
}

describe("recommended MCP runtime merge", () => {
  test("resolveRuntimeMcpServers merges opt-in recommendations and preserves explicit servers", () => {
    const config = makeConfig({
      mcpServers: {
        fetch: { type: "stdio", command: "custom-fetch", args: [], env: {} }
      },
      recommendedMcpServers: ["fetch", "filesystem", "linear"]
    });

    const servers = resolveRuntimeMcpServers(config, {});

    expect("command" in servers.fetch ? servers.fetch.command : undefined).toBe("custom-fetch");
    expect(servers.filesystem).toMatchObject({
      type: "stdio",
      command: "npx",
      args: expect.arrayContaining(["/workspace/root"])
    });
    expect(servers.linear).toMatchObject({
      type: "http",
      url: "https://mcp.linear.app/mcp",
      auth: "oauth"
    });
  });

  test("resolveRuntimeMcpServers skips missing env recommendations and emits a warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const servers = resolveRuntimeMcpServers(makeConfig({
        mcpServers: {},
        recommendedMcpServers: ["github"]
      }), {});

      expect(servers.github).toBeUndefined();
      expect(warnSpy.mock.calls.map((call) => call.join(" ")).join("\n")).toMatch(/github.*GITHUB_TOKEN/i);
    } finally {
      warnSpy.mockRestore();
    }
  });

  test("registerMcpServerTools applies per-server toolFilter includes", async () => {
    const registry = new Map();

    await registerMcpServerTools(registry, {
      filesystem: {
        type: "stdio",
        command: "npx",
        args: [],
        env: {},
        toolFilter: { include: ["read_file"] }
      }
    }, "/workspace/root", {
      clientFactory: () => fakeClient(["read_file", "write_file"])
    });

    expect([...registry.keys()]).toContain("mcp__filesystem__read_file");
    expect([...registry.keys()]).not.toContain("mcp__filesystem__write_file");
  });

  test("registerMcpServerTools skips disabled servers without creating clients", async () => {
    const registry = new Map();
    const clientFactory = vi.fn(() => fakeClient(["read_file"]));

    await registerMcpServerTools(registry, {
      disabled: {
        type: "stdio",
        command: "node",
        args: [],
        env: {},
        enabled: false
      }
    }, "/workspace/root", { clientFactory });

    expect(clientFactory).not.toHaveBeenCalled();
    expect([...registry.keys()]).toEqual([]);
  });
});
