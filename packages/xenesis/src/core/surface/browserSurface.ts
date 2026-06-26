import type { BrowserDriver, BrowserSnapshot } from "../../tools/browserDriver.js";
import type { MarkInput } from "./som.js";
import type { SnapshotOptions, SurfaceAction, SurfaceElement, SurfaceHandler, SurfaceSnapshot } from "./types.js";

export class BrowserSurfaceHandler implements SurfaceHandler {
  readonly name = "browser";

  constructor(private readonly driver: BrowserDriver) {}

  private base(raw: BrowserSnapshot, elements: SurfaceElement[], screenshot: string | undefined, som: boolean): SurfaceSnapshot {
    return {
      surface: "browser",
      ...(raw.url ? { url: raw.url } : {}),
      ...(raw.title ? { title: raw.title } : {}),
      text: raw.text,
      elements,
      ...(raw.canvases ? { canvases: raw.canvases } : {}),
      ...(screenshot ? { screenshot } : {}),
      som
    };
  }

  private plainElements(raw: BrowserSnapshot): SurfaceElement[] {
    return raw.elements.map((element, index) => ({
      index: index + 1,
      role: element.role,
      label: element.label
    }));
  }

  async snapshot(options?: SnapshotOptions): Promise<SurfaceSnapshot> {
    const raw = await this.driver.snapshot();
    if (!options?.som) return this.base(raw, this.plainElements(raw), undefined, false);

    const boxes = await this.driver.boundingBoxes();
    const elements: SurfaceElement[] = raw.elements.map((element, index) => {
      const bbox = boxes[index] ?? undefined;
      return {
        index: index + 1,
        role: element.role,
        label: element.label,
        ...(bbox ? { bbox } : {})
      };
    });
    const marks: MarkInput[] = elements
      .filter((element): element is SurfaceElement & { bbox: NonNullable<SurfaceElement["bbox"]> } => Boolean(element.bbox))
      .map((element) => ({ index: element.index, bbox: element.bbox }));
    const screenshot = await this.driver.screenshotWithMarks(marks);
    return this.base(raw, elements, screenshot, true);
  }

  async act(action: SurfaceAction): Promise<SurfaceSnapshot> {
    let raw: BrowserSnapshot;
    switch (action.type) {
      case "navigate":
        raw = await this.driver.goto(action.url);
        break;
      case "click":
        raw = await this.driver.click(`e${action.index}`);
        break;
      case "fill":
        raw = await this.driver.fill(`e${action.index}`, action.text, action.submit ?? false);
        break;
      case "back":
        raw = await this.driver.back();
        break;
    }
    return this.base(raw, this.plainElements(raw), undefined, false);
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
