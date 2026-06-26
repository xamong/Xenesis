import { statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SqliteMcpAuthStore } from "../../src/extensions/SqliteMcpAuthStore.js";
import { createTempWorkspace } from "../helpers/tempWorkspace.js";

describe("SqliteMcpAuthStore", () => {
  it("round-trips OAuth data across instances under xenesis home", async () => {
    const ws = await createTempWorkspace();
    try {
      const first = new SqliteMcpAuthStore({ xenesisHome: ws.root });
      first.update({
        mcpOAuth: {
          "linear|abc": {
            serverName: "linear",
            serverUrl: "https://mcp.linear.app/mcp",
            accessToken: "tok",
            refreshToken: "refresh",
            expiresAt: 123
          }
        }
      });

      const second = new SqliteMcpAuthStore({ xenesisHome: ws.root });
      expect(second.read()?.mcpOAuth?.["linear|abc"]?.accessToken).toBe("tok");
      expect(second.read()?.mcpOAuth?.["linear|abc"]?.refreshToken).toBe("refresh");
    } finally {
      await ws.cleanup();
    }
  });

  it("returns undefined before the auth file exists", async () => {
    const ws = await createTempWorkspace();
    try {
      expect(new SqliteMcpAuthStore({ xenesisHome: ws.root }).read()).toBeUndefined();
    } finally {
      await ws.cleanup();
    }
  });

  it("writes token data to mcp-tokens/auth.json with owner-only mode on posix", async () => {
    const ws = await createTempWorkspace();
    try {
      const store = new SqliteMcpAuthStore({ xenesisHome: ws.root });
      store.update({ mcpOAuth: {} });
      const path = join(ws.root, "mcp-tokens", "auth.json");
      expect(store.read()).toEqual({ mcpOAuth: {} });
      if (process.platform !== "win32") {
        expect(statSync(path).mode & 0o777).toBe(0o600);
      }
    } finally {
      await ws.cleanup();
    }
  });
});
