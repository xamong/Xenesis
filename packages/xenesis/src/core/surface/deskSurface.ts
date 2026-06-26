import type { SnapshotOptions, SurfaceAction, SurfaceElement, SurfaceHandler, SurfaceSnapshot } from "./types.js";

export type DeskBridgeCall = (path: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;

interface DeskElementPayload {
  role?: unknown;
  label?: unknown;
  selector?: unknown;
}

export class DeskSurfaceHandler implements SurfaceHandler {
  readonly name = "desk-playwright";
  private selectors = new Map<number, string>();

  constructor(private readonly call: DeskBridgeCall) {}

  async snapshot(_options?: SnapshotOptions): Promise<SurfaceSnapshot> {
    const payload = await this.call("xd.playwright.snapshot", {});
    const rawElements = Array.isArray(payload.elements) ? payload.elements as DeskElementPayload[] : [];
    this.selectors.clear();
    const elements: SurfaceElement[] = rawElements.map((element, index) => {
      const elementIndex = index + 1;
      if (typeof element.selector === "string") this.selectors.set(elementIndex, element.selector);
      return {
        index: elementIndex,
        role: typeof element.role === "string" ? element.role : "node",
        label: typeof element.label === "string" ? element.label : ""
      };
    });

    return {
      surface: "desk-playwright",
      ...(typeof payload.url === "string" ? { url: payload.url } : {}),
      ...(typeof payload.title === "string" ? { title: payload.title } : {}),
      text: typeof payload.text === "string" ? payload.text : "",
      elements,
      ...(typeof payload.screenshot === "string" ? { screenshot: payload.screenshot } : {}),
      som: false
    };
  }

  async act(action: SurfaceAction): Promise<SurfaceSnapshot> {
    if (action.type === "navigate") {
      await this.call("xd.playwright.run", { actions: [], url: action.url });
      return await this.snapshot();
    }
    if (action.type === "back") {
      return await this.snapshot();
    }

    const selector = this.selectors.get(action.index);
    if (!selector) {
      throw new Error(
        `Desk surface cannot target index ${action.index}: the Desk bridge did not provide a selector. Re-snapshot, or this requires the Desk element-indexing follow-up.`
      );
    }
    const playwrightAction = action.type === "click"
      ? { type: "click", selector }
      : { type: "fill", selector, value: action.text };
    await this.call("xd.playwright.run", { actions: [playwrightAction] });
    return await this.snapshot();
  }

  async close(): Promise<void> {
    this.selectors.clear();
  }
}
