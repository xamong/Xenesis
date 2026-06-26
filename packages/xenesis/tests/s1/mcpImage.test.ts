import { describe, it, expect } from "vitest";
import {
  splitMcpContent,
  createMcpTools,
  type McpToolClient,
  type McpToolResult
} from "../../src/extensions/mcp.js";
import type { ToolContext } from "../../src/tools/types.js";

// A long-ish base64-looking blob so an accidental JSON.stringify dump is unmistakable.
const BIG_BASE64 = "QUJD".repeat(200); // 800 chars

function fakeClient(result: McpToolResult): McpToolClient {
  return {
    listTools: async () => [{ name: "snap", description: "take a screenshot" }],
    callTool: async () => result,
    close: async () => {}
  };
}

function fakeToolContext(): ToolContext {
  return {
    workspaceRoot: process.cwd(),
    cwd: process.cwd(),
    sessionId: "mcp-image-test",
    todos: [],
    emit: () => {},
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    }
  };
}

describe("splitMcpContent", () => {
  it("splits text and image parts", () => {
    const { text, attachments } = splitMcpContent([
      { type: "text", text: "ok" },
      { type: "image", data: "AAA", mimeType: "image/png" }
    ]);
    expect(text).toContain("ok");
    expect(attachments).toHaveLength(1);
    expect(attachments[0]!.dataUrl).toBe("data:image/png;base64,AAA");
    expect(attachments[0]!.kind).toBe("image");
  });

  it("handles multiple text parts joined", () => {
    const { text, attachments } = splitMcpContent([
      { type: "text", text: "hello" },
      { type: "text", text: "world" }
    ]);
    expect(text).toContain("hello");
    expect(text).toContain("world");
    expect(attachments).toHaveLength(0);
  });

  it("guards malformed image block — missing data — no throw", () => {
    const { text, attachments } = splitMcpContent([
      { type: "image", mimeType: "image/png" }
    ]);
    // malformed → falls through to stringifyContentPart
    expect(attachments).toHaveLength(0);
    expect(() => splitMcpContent([{ type: "image", mimeType: "image/png" }])).not.toThrow();
  });

  it("drops unsupported MIME types", () => {
    const { attachments } = splitMcpContent([
      { type: "image", data: "AAA", mimeType: "image/svg+xml" }
    ]);
    expect(attachments).toHaveLength(0);
  });

  it("handles multiple images", () => {
    const { attachments } = splitMcpContent([
      { type: "image", data: "AAA", mimeType: "image/png" },
      { type: "image", data: "BBB", mimeType: "image/jpeg" }
    ]);
    expect(attachments).toHaveLength(2);
    expect(attachments[0]!.dataUrl).toBe("data:image/png;base64,AAA");
    expect(attachments[1]!.dataUrl).toBe("data:image/jpeg;base64,BBB");
  });

  it("handles empty array", () => {
    const { text, attachments } = splitMcpContent([]);
    expect(text).toBe("");
    expect(attachments).toHaveLength(0);
  });
});

describe("createMcpTools run() — image-only result", () => {
  it("never dumps base64 into content; image goes to attachments", async () => {
    const tools = await createMcpTools({
      serverName: "vision",
      client: fakeClient({
        content: [{ type: "image", data: BIG_BASE64, mimeType: "image/png" }],
        isError: false
      })
    });
    const tool = tools[0]!;
    const result = await tool.run({}, fakeToolContext());

    // The base64 blob must NOT appear in model-visible content.
    expect(result.content).not.toContain(BIG_BASE64);
    expect(result.content).not.toContain("base64");
    expect(result.content).toBe("[1 image attached]");

    // The image must be carried via attachments instead.
    expect(result.attachments).toBeDefined();
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments![0]!.kind).toBe("image");
    expect(result.attachments![0]!.dataUrl).toBe(`data:image/png;base64,${BIG_BASE64}`);
    expect(result.ok).toBe(true);
  });

  it("pluralizes the placeholder for multiple image-only results", async () => {
    const tools = await createMcpTools({
      serverName: "vision",
      client: fakeClient({
        content: [
          { type: "image", data: BIG_BASE64, mimeType: "image/png" },
          { type: "image", data: BIG_BASE64, mimeType: "image/jpeg" }
        ],
        isError: false
      })
    });
    const result = await tools[0]!.run({}, fakeToolContext());
    expect(result.content).toBe("[2 images attached]");
    expect(result.content).not.toContain(BIG_BASE64);
    expect(result.attachments).toHaveLength(2);
  });

  it("keeps text content when image+text are mixed (no base64 leak)", async () => {
    const tools = await createMcpTools({
      serverName: "vision",
      client: fakeClient({
        content: [
          { type: "text", text: "here is the screenshot" },
          { type: "image", data: BIG_BASE64, mimeType: "image/png" }
        ],
        isError: false
      })
    });
    const result = await tools[0]!.run({}, fakeToolContext());
    expect(result.content).toContain("here is the screenshot");
    expect(result.content).not.toContain(BIG_BASE64);
    expect(result.attachments).toHaveLength(1);
  });

  it("falls back to formatted result only when there are no attachments", async () => {
    const tools = await createMcpTools({
      serverName: "vision",
      client: fakeClient({
        content: [{ type: "text", text: "plain text result" }],
        isError: false
      })
    });
    const result = await tools[0]!.run({}, fakeToolContext());
    expect(result.content).toContain("plain text result");
    expect(result.attachments).toBeUndefined();
  });
});
