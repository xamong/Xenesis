import { describe, it, expect } from "vitest";
import { createBrowserTool, type BrowserToolOptions } from "../../src/tools/browserTool.js";
import type { BrowserDriver, BrowserSnapshot } from "../../src/tools/browserDriver.js";
import type { ToolContext } from "../../src/tools/types.js";

const RAW_B64 = "AAABBBCCC";

function fakeSnapshot(): BrowserSnapshot {
  return { url: "https://example.com/", title: "Example", text: "hello", elements: [] };
}

class FakeDriver implements BrowserDriver {
  async goto(): Promise<BrowserSnapshot> { return fakeSnapshot(); }
  async snapshot(): Promise<BrowserSnapshot> { return fakeSnapshot(); }
  async click(): Promise<BrowserSnapshot> { return fakeSnapshot(); }
  async fill(): Promise<BrowserSnapshot> { return fakeSnapshot(); }
  async back(): Promise<BrowserSnapshot> { return fakeSnapshot(); }
  async screenshot(): Promise<string> { return RAW_B64; }
  async boundingBoxes(): Promise<(null)[]> { return []; }
  async screenshotWithMarks(): Promise<string> { return RAW_B64; }
  async close(): Promise<void> { /* noop */ }
}

function ctx(): ToolContext {
  return {
    workspaceRoot: "/ws",
    cwd: "/ws",
    sessionId: "s1-test",
    todos: [],
    emit: () => undefined,
    logger: { debug() {}, info() {}, warn() {}, error() {} }
  };
}

function makeTool() {
  const options: BrowserToolOptions = {
    headless: true,
    allowedHosts: [],
    idleTimeoutMs: 60_000,
    createDriver: () => new FakeDriver()
  };
  return createBrowserTool(options);
}

describe("SOM / screenshot wiring (browser)", () => {
  it("attaches the SOM screenshot as a data-URL image on a SOM snapshot", async () => {
    const tool = makeTool();
    const result = await tool.run({ action: "screenshot" } as any, ctx());
    expect(result.ok).toBe(true);
    expect(result.attachments).toHaveLength(1);
    const att = result.attachments![0]!;
    expect(att.kind).toBe("image");
    expect(att.name).toBe("screenshot");
    expect(att.mimeType).toBe("image/png");
    expect(att.dataUrl).toBe(`data:image/png;base64,${RAW_B64}`);
  });

  it("does NOT embed base64 in the rendered text content", async () => {
    const tool = makeTool();
    const result = await tool.run({ action: "screenshot" } as any, ctx());
    expect(result.content.includes(RAW_B64)).toBe(false);
  });

  it("omits attachments when the snapshot has no screenshot (text-only read)", async () => {
    const tool = makeTool();
    // read with som=false → no screenshot captured
    const result = await tool.run({ action: "read", som: false } as any, ctx());
    expect(result.ok).toBe(true);
    expect(result.attachments).toBeUndefined();
  });
});
