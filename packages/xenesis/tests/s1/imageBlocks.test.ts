import { describe, it, expect } from "vitest";
import { imageBlocksFor, MAX_IMAGES_PER_REQUEST } from "../../src/providers/multimodal.js";
import { supportsVision } from "../../src/providers/modelCapabilities.js";

const img = (data: string, mt = "image/png", name = "s") => ({ kind: "image" as const, name, dataUrl: `data:${mt};base64,${data}` });

describe("imageBlocksFor", () => {
  it("parses image attachments into blocks", () => {
    const b = imageBlocksFor([img("AAA")]);
    expect(b).toHaveLength(1);
    expect(b[0].mediaType).toBe("image/png");
    expect(b[0].base64).toBe("AAA");
  });
  it("drops non-image and unsupported MIME", () => {
    expect(imageBlocksFor([{ kind: "file", name: "f", dataUrl: "data:text/plain;base64,AA" }])).toHaveLength(0);
    expect(imageBlocksFor([img("AA", "image/svg+xml")])).toHaveLength(0);
  });
  it("caps to MAX_IMAGES_PER_REQUEST, most-recent wins", () => {
    const many = Array.from({ length: 5 }, (_, i) => img("AA", "image/png", `n${i}`));
    const b = imageBlocksFor(many);
    expect(b).toHaveLength(MAX_IMAGES_PER_REQUEST);
    expect(b[b.length - 1].name).toBe("n4");
  });
  it("drops oversize images", () => {
    expect(imageBlocksFor([img("A".repeat(2_000_000))], { maxBytes: 1500 })).toHaveLength(0);
  });
});

describe("supportsVision", () => {
  it("true for known vision models", () => {
    expect(supportsVision("claude-opus-4-8")).toBe(true);
    expect(supportsVision("gpt-4o")).toBe(true);
  });
  it("false for non-vision / unknown", () => {
    expect(supportsVision("o1-mini")).toBe(false);
    expect(supportsVision("some-random-model")).toBe(false);
  });
});
