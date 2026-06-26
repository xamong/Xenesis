import { describe, it, expect } from "vitest";
import { createAppE2ECheckTool, type AppE2ECheckOptions } from "../../src/tools/appE2ECheckTool.js";
import type { BrowserDriver, BrowserSnapshot } from "../../src/tools/browserDriver.js";
import type { ToolContext } from "../../src/tools/types.js";

const RAW_B64 = "AAABBBCCC";

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

class FakeDriver implements BrowserDriver {
  constructor(private readonly browserSnapshot: BrowserSnapshot) {}
  async goto(): Promise<BrowserSnapshot> { return this.browserSnapshot; }
  async snapshot(): Promise<BrowserSnapshot> { return this.browserSnapshot; }
  async click(): Promise<BrowserSnapshot> { return this.browserSnapshot; }
  async fill(): Promise<BrowserSnapshot> { return this.browserSnapshot; }
  async back(): Promise<BrowserSnapshot> { return this.browserSnapshot; }
  async screenshot(): Promise<string> { return RAW_B64; }
  async boundingBoxes(): Promise<(null)[]> { return []; }
  async screenshotWithMarks(): Promise<string> { return RAW_B64; }
  async close(): Promise<void> { /* noop */ }
}

function makeTool(snapshot: BrowserSnapshot) {
  const options: AppE2ECheckOptions = {
    headless: true,
    allowedHosts: [],
    createDriver: () => new FakeDriver(snapshot)
  };
  return createAppE2ECheckTool(options);
}

// Visible canvas whose direct pixel read came back blank → ambiguous visual
// verification, with a retained screenshot PNG observed via fallback.
function ambiguousSnapshot(): BrowserSnapshot {
  return {
    url: "https://example.com/",
    title: "Canvas App",
    text: "rendered canvas application body text long enough to pass min length",
    elements: [{ ref: "e1", role: "button", label: "Go" }],
    canvases: [{
      ref: "c1",
      width: 800,
      height: 600,
      clientWidth: 800,
      clientHeight: 600,
      visible: true,
      pixelContent: "blank"
    }],
    screenshotVisual: {
      content: "observed",
      samples: 100,
      opaqueSamples: 100,
      uniqueColorBuckets: 40,
      maxChannelDelta: 200,
      screenshotBase64: RAW_B64
    }
  };
}

// Visible canvas with directly observed pixels → NOT ambiguous, no PNG retained.
function directPixelsSnapshot(): BrowserSnapshot {
  return {
    url: "https://example.com/",
    title: "Canvas App",
    text: "rendered canvas application body text long enough to pass min length",
    elements: [{ ref: "e1", role: "button", label: "Go" }],
    canvases: [{
      ref: "c1",
      width: 800,
      height: 600,
      clientWidth: 800,
      clientHeight: 600,
      visible: true,
      pixelContent: "observed"
    }]
  };
}

describe("verification PNG wiring (app_e2e_check)", () => {
  it("attaches the verification PNG on an ambiguous visual check", async () => {
    const tool = makeTool(ambiguousSnapshot());
    const result = await tool.run(
      {
        url: "https://example.com/",
        expectedText: [],
        forbiddenText: [],
        minTextLength: 20,
        minInteractiveElements: 0
      },
      ctx()
    );
    expect(result.attachments).toHaveLength(1);
    const att = result.attachments![0]!;
    expect(att.kind).toBe("image");
    expect(att.name).toBe("verification");
    expect(att.mimeType).toBe("image/png");
    expect(att.dataUrl).toBe(`data:image/png;base64,${RAW_B64}`);
  });

  it("does NOT embed base64 in the rendered text content", async () => {
    const tool = makeTool(ambiguousSnapshot());
    const result = await tool.run(
      {
        url: "https://example.com/",
        expectedText: [],
        forbiddenText: [],
        minTextLength: 20,
        minInteractiveElements: 0
      },
      ctx()
    );
    expect(result.content.includes(RAW_B64)).toBe(false);
    expect(result.content.includes("verificationScreenshotAttached: true")).toBe(true);
  });

  it("omits attachments when direct canvas pixels are observed (not ambiguous)", async () => {
    const tool = makeTool(directPixelsSnapshot());
    const result = await tool.run(
      {
        url: "https://example.com/",
        expectedText: [],
        forbiddenText: [],
        minTextLength: 20,
        minInteractiveElements: 0
      },
      ctx()
    );
    expect(result.attachments).toBeUndefined();
  });
});
