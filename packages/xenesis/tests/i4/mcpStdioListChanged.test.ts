import { describe, it, expect } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { StdioMcpToolClient, type McpToolClient } from "../../src/extensions/mcp.js";
import { createTempWorkspace } from "../helpers/tempWorkspace.js";

const require = createRequire(import.meta.url);

describe("StdioMcpToolClient subscribes to tools/list_changed", () => {
  it("fires the onListChanged callback when the stdio server emits a list_changed notification", async () => {
    const workspace = await createTempWorkspace("xenesis-mcp-lc-");
    let client: McpToolClient | undefined;
    try {
      const dir = join(workspace.root, "server");
      await mkdir(dir, { recursive: true });
      const serverPath = join(dir, "list-changed-server.mjs");
      const mcpUrl = pathToFileURL(require.resolve("@modelcontextprotocol/sdk/server/mcp.js")).href;
      const stdioUrl = pathToFileURL(require.resolve("@modelcontextprotocol/sdk/server/stdio.js")).href;
      const zodUrl = pathToFileURL(require.resolve("zod")).href;
      await writeFile(
        serverPath,
        [
          `import { McpServer } from ${JSON.stringify(mcpUrl)};`,
          `import { StdioServerTransport } from ${JSON.stringify(stdioUrl)};`,
          `import { z } from ${JSON.stringify(zodUrl)};`,
          `const server = new McpServer({ name: "lc-test", version: "1.0.0" });`,
          `server.registerTool("greet", { description: "Greet", inputSchema: { name: z.string() } }, async ({ name }) => ({ content: [{ type: "text", text: "Hello " + name }] }));`,
          `await server.connect(new StdioServerTransport());`,
          // Emit list_changed repeatedly so the client reliably catches one after it connects.
          `setInterval(() => { server.server.sendToolListChanged().catch(() => {}); }, 100);`
        ].join("\n"),
        "utf8"
      );

      client = new StdioMcpToolClient("lc", { command: process.execPath, args: [serverPath], env: {} }, workspace.root);

      let fired = false;
      const firedPromise = new Promise<void>((resolve) => {
        client!.onListChanged?.(() => {
          fired = true;
          resolve();
        });
      });
      // Connecting registers the notification handler before we wait.
      await client.listTools();
      await Promise.race([firedPromise, new Promise<void>((resolve) => setTimeout(resolve, 5000))]);

      expect(fired).toBe(true);
    } finally {
      await client?.close();
      await workspace.cleanup();
    }
  }, 20000);
});
