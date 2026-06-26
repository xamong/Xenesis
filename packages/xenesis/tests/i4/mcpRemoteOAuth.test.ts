import { describe, expect, it, vi } from "vitest";
import {
  createMemoryMcpAuthStore,
  createMcpOAuthClientProvider,
  createRemoteMcpTransport,
  getMcpServerCredentialKey,
  registerMcpServerTools,
  runMcpOAuthLogin,
  type McpAuthStore,
  type McpToolClient
} from "../../src/extensions/mcp.js";
import type { McpServerConfig } from "../../src/config/types.js";
import type { Tool } from "../../src/tools/types.js";

function healthyClient(): McpToolClient {
  return {
    async listTools() {
      return [{ name: "ping", description: "p", inputSchema: { type: "object", properties: {} } }];
    },
    async callTool() {
      return { content: [{ type: "text", text: "ok" }] };
    },
    async close() {
      // noop
    }
  };
}

function sensitiveFailingClient(): McpToolClient {
  return {
    async listTools(): Promise<never> {
      throw new Error(
        "Authorization URL: https://auth.example.test/cb?access_token=tok&refresh_token=ref&client_secret=sec Bearer bearer-token"
      );
    },
    async callTool() {
      return { content: [] };
    },
    async close() {
      // noop
    }
  };
}

describe("remote MCP transport selection", () => {
  it("uses SSE transport when type or transport is sse", () => {
    const byType = createRemoteMcpTransport({ type: "sse", url: "https://mcp.example.test/sse" });
    const byTransport = createRemoteMcpTransport({
      type: "http",
      transport: "sse",
      url: "https://mcp.example.test/sse"
    });

    expect(byType.constructor.name).toBe("SSEClientTransport");
    expect(byTransport.constructor.name).toBe("SSEClientTransport");
  });

  it("uses StreamableHTTP transport for ordinary http config", () => {
    const transport = createRemoteMcpTransport({ type: "http", url: "https://mcp.example.test/mcp" });
    expect(transport.constructor.name).toBe("StreamableHTTPClientTransport");
  });
});

describe("remote MCP OAuth provider", () => {
  it("persists tokens, client information, and discovery state through the auth store", async () => {
    const store = createMemoryMcpAuthStore();
    const serverConfig = { type: "sse" as const, url: "https://mcp.example.test/sse" };
    const credentialKey = getMcpServerCredentialKey("linear", serverConfig);
    const provider = createMcpOAuthClientProvider({
      serverName: "linear",
      serverConfig,
      config: {
        clientId: "client-id",
        clientSecret: "client-secret",
        scope: "read write",
        redirectUrl: "http://127.0.0.1:7777/callback"
      },
      store
    });

    expect(String(provider.redirectUrl)).toContain("callback");
    expect(provider.clientMetadata.scope).toBe("read write");
    expect(await provider.clientInformation()).toMatchObject({
      client_id: "client-id",
      client_secret: "client-secret"
    });

    await provider.saveTokens({
      access_token: "access",
      refresh_token: "refresh",
      token_type: "Bearer",
      expires_in: 3600,
      scope: "read write"
    });
    expect((await provider.tokens())?.access_token).toBe("access");
    expect(store.read()?.mcpOAuth?.[credentialKey]?.refreshToken).toBe("refresh");
    expect(store.read()?.mcpOAuth?.[credentialKey]?.clientSecret).toBeUndefined();

    expect(provider.saveDiscoveryState).toBeDefined();
    await provider.saveDiscoveryState!({
      authorizationServerUrl: "https://auth.example.test",
      resourceMetadataUrl: "https://mcp.example.test/.well-known/oauth-protected-resource"
    });
    expect(provider.discoveryState).toBeDefined();
    expect(await provider.discoveryState!()).toEqual({
      authorizationServerUrl: "https://auth.example.test",
      resourceMetadataUrl: "https://mcp.example.test/.well-known/oauth-protected-resource"
    });

    expect(provider.invalidateCredentials).toBeDefined();
    await provider.invalidateCredentials!("tokens");
    expect(await provider.tokens()).toBeUndefined();
    expect(store.read()?.mcpOAuth?.[credentialKey]?.accessToken).toBe("");
  });

  it("removes persisted dynamic client secrets when client credentials are invalidated", async () => {
    const store = createMemoryMcpAuthStore();
    const serverConfig = { type: "http" as const, url: "https://mcp.example.test/mcp" };
    const credentialKey = getMcpServerCredentialKey("linear", serverConfig);
    const provider = createMcpOAuthClientProvider({
      serverName: "linear",
      serverConfig,
      store
    });

    expect(provider.saveClientInformation).toBeDefined();
    await provider.saveClientInformation!({
      client_id: "dynamic-client",
      client_secret: "dynamic-secret"
    });
    expect(store.read()?.mcpOAuthClientConfig?.[credentialKey]?.clientSecret).toBe("dynamic-secret");

    expect(provider.invalidateCredentials).toBeDefined();
    await provider.invalidateCredentials!("client");
    expect(store.read()?.mcpOAuthClientConfig?.[credentialKey]).toBeUndefined();
    expect(store.read()?.mcpOAuth?.[credentialKey]?.clientSecret).toBeUndefined();

    await provider.saveClientInformation!({
      client_id: "dynamic-client",
      client_secret: "dynamic-secret"
    });
    await provider.invalidateCredentials!("all");
    expect(store.read()?.mcpOAuthClientConfig?.[credentialKey]).toBeUndefined();
    expect(store.read()?.mcpOAuth?.[credentialKey]).toBeUndefined();
  });

  it("resolves SecretRef client secrets for OAuth login without persisting the raw configured secret", async () => {
    const store = createMemoryMcpAuthStore();
    const seenClientInfo: unknown[] = [];

    const result = await runMcpOAuthLogin({
      serverName: "linear",
      serverConfig: {
        type: "http",
        url: "https://mcp.example.test/mcp",
        auth: "oauth",
        oauth: {
          clientId: "client-id",
          clientSecret: { source: "env", id: "MCP_CLIENT_SECRET" }
        }
      },
      store,
      env: { MCP_CLIENT_SECRET: "resolved-secret" } as NodeJS.ProcessEnv,
      auth: async (provider) => {
        seenClientInfo.push(await provider.clientInformation());
        return "AUTHORIZED";
      }
    });

    expect(result).toBe("authorized");
    expect(seenClientInfo[0]).toMatchObject({
      client_id: "client-id",
      client_secret: "resolved-secret"
    });
    expect(JSON.stringify(store.read() ?? {})).not.toContain("resolved-secret");
  });
});

describe("registerMcpServerTools auth store wiring", () => {
  it("passes a shared auth store into the MCP client factory", async () => {
    const registry = new Map<string, Tool>();
    const store = createMemoryMcpAuthStore();
    let seenAuthStore: McpAuthStore | undefined;
    const servers: Record<string, McpServerConfig> = {
      remote: { type: "http", url: "https://mcp.example.test/mcp", auth: "oauth" }
    };

    await registerMcpServerTools(registry, servers, "/ws", {
      authStore: store,
      clientFactory: (_serverName, _config, _workspace, options) => {
        seenAuthStore = options?.authStore;
        return healthyClient();
      }
    });

    expect(seenAuthStore).toBe(store);
  });

  it("redacts OAuth secrets from skipped remote load warnings", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const registry = new Map<string, Tool>();
      const servers: Record<string, McpServerConfig> = {
        remote: { type: "http", url: "https://mcp.example.test/mcp", auth: "oauth" }
      };

      await registerMcpServerTools(registry, servers, "/ws", {
        clientFactory: () => sensitiveFailingClient()
      });

      const warning = String(warn.mock.calls[0]?.[0] ?? "");
      expect(warning).toContain("[redacted]");
      expect(warning).not.toContain("access_token=tok");
      expect(warning).not.toContain("refresh_token=ref");
      expect(warning).not.toContain("client_secret=sec");
      expect(warning).not.toContain("bearer-token");
    } finally {
      warn.mockRestore();
    }
  });
});
