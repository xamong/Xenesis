import { buildMarkOverlayScript, type MarkInput, removeMarkOverlayScript } from '../core/surface/som.js';
import type { SurfaceBBox } from '../core/surface/types.js';

export interface BrowserSnapshotElement {
  ref: string;
  role: string;
  label: string;
}

export interface BrowserSnapshotCanvas {
  ref: string;
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  visible: boolean;
  pixelContent: 'observed' | 'blank' | 'unknown';
}

export type BrowserVisualContent = 'observed' | 'blank' | 'unknown';

export interface BrowserVisualSampleStats {
  samples: number;
  opaqueSamples: number;
  uniqueColorBuckets: number;
  maxChannelDelta: number;
}

export interface BrowserScreenshotVisualSignal extends BrowserVisualSampleStats {
  content: BrowserVisualContent;
  /**
   * Raw base64 PNG of the captured screenshot (no data-URL prefix). Retained so
   * ambiguous visual verifications can surface the PNG as a model-visible
   * attachment instead of only sampling it for stats then discarding it.
   */
  screenshotBase64?: string;
}

export interface BrowserSnapshot {
  url: string;
  title: string;
  text: string;
  elements: BrowserSnapshotElement[];
  canvases?: BrowserSnapshotCanvas[];
  screenshotVisual?: BrowserScreenshotVisualSignal;
  httpStatus?: number;
  pageErrors?: string[];
}

export interface BrowserDriver {
  goto(url: string): Promise<BrowserSnapshot>;
  snapshot(): Promise<BrowserSnapshot>;
  click(ref: string): Promise<BrowserSnapshot>;
  fill(ref: string, text: string, submit: boolean): Promise<BrowserSnapshot>;
  back(): Promise<BrowserSnapshot>;
  screenshot(): Promise<string>;
  boundingBoxes(): Promise<(SurfaceBBox | null)[]>;
  screenshotWithMarks(marks: MarkInput[]): Promise<string>;
  close(): Promise<void>;
}

export interface PlaywrightDriverOptions {
  headless: boolean;
  /**
   * Optional persistent user-data directory for the browser profile (used by the
   * desk login-web driver to keep a persistent login profile). Currently accepted
   * by the options; persistent-context launch wiring is a tracked follow-up.
   */
  userDataDir?: string;
}

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type=hidden])',
  'textarea',
  'select',
  '[role=button]',
  '[role=link]',
  '[role=textbox]',
].join(', ');

const MAX_SNAPSHOT_TEXT = 20000;
const MAX_ELEMENTS = 100;
const MAX_CANVASES = 20;
const CANVAS_CAPTURE_RETRY_ATTEMPTS = 3;
const CANVAS_CAPTURE_RETRY_DELAY_MS = 300;

type PlaywrightElement = {
  getAttribute(name: string): Promise<string | null>;
  innerText(): Promise<string>;
  evaluate<R>(fn: (node: any) => R): Promise<R>;
  click(): Promise<void>;
  fill(value: string): Promise<void>;
  press(key: string): Promise<void>;
  isVisible(): Promise<boolean>;
  boundingBox(): Promise<SurfaceBBox | null>;
};

type PlaywrightPage = {
  goto(url: string, options?: { waitUntil?: 'domcontentloaded' }): Promise<{ status(): number } | null>;
  goBack(): Promise<unknown>;
  url(): string;
  title(): Promise<string>;
  innerText(selector: string): Promise<string>;
  locator(selector: string): { all(): Promise<PlaywrightElement[]> };
  evaluate<R, A = unknown>(fn: ((arg: A) => R | Promise<R>) | string, arg?: A): Promise<R>;
  screenshot(options: { type: 'png' }): Promise<Buffer>;
  waitForLoadState?(state: 'networkidle', options?: { timeout?: number }): Promise<unknown>;
  waitForTimeout?(timeoutMs: number): Promise<unknown>;
  on(event: 'pageerror', handler: (error: Error) => void): void;
};

function hasCanvasSurface(canvas: BrowserSnapshotCanvas) {
  return (
    canvas.visible && ((canvas.width > 0 && canvas.height > 0) || (canvas.clientWidth > 0 && canvas.clientHeight > 0))
  );
}

export function shouldRetryCanvasCapture(snapshot: BrowserSnapshot) {
  const canvases = snapshot.canvases ?? [];
  return snapshot.text.trim().length === 0 && canvases.length > 0 && !canvases.some(hasCanvasSurface);
}

function shouldCaptureScreenshotVisualFallback(snapshot: BrowserSnapshot) {
  const canvases = snapshot.canvases ?? [];
  return canvases.some(hasCanvasSurface) && !canvases.some((canvas) => canvas.pixelContent === 'observed');
}

export function classifyVisualSampleStats(stats: BrowserVisualSampleStats): BrowserVisualContent {
  if (stats.samples <= 0) return 'unknown';
  if (stats.opaqueSamples <= 0) return 'blank';
  if (stats.uniqueColorBuckets >= 2 && stats.maxChannelDelta >= 12) return 'observed';
  return 'blank';
}

export class PlaywrightBrowserDriver implements BrowserDriver {
  private page?: PlaywrightPage;
  private browser?: { close(): Promise<void> };
  private handles: PlaywrightElement[] = [];
  private pageErrors: string[] = [];
  private lastHttpStatus: number | undefined;

  constructor(private readonly options: PlaywrightDriverOptions) {}

  async goto(url: string) {
    const page = await this.ensurePage();
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    this.lastHttpStatus = response?.status();
    await page.waitForLoadState?.('networkidle', { timeout: 1000 }).catch(() => undefined);
    await page.waitForTimeout?.(200).catch(() => undefined);
    return await this.capture();
  }

  async snapshot() {
    await this.ensurePage();
    return await this.capture();
  }

  async click(ref: string) {
    await this.handle(ref).click();
    return await this.capture();
  }

  async fill(ref: string, text: string, submit: boolean) {
    const handle = this.handle(ref);
    await handle.fill(text);
    if (submit) await handle.press('Enter');
    return await this.capture();
  }

  async back() {
    const page = await this.ensurePage();
    await page.goBack();
    return await this.capture();
  }

  async screenshot() {
    const page = await this.ensurePage();
    return (await page.screenshot({ type: 'png' })).toString('base64');
  }

  async boundingBoxes(): Promise<(SurfaceBBox | null)[]> {
    return await Promise.all(this.handles.map((handle) => handle.boundingBox().catch(() => null)));
  }

  async screenshotWithMarks(marks: MarkInput[]): Promise<string> {
    const page = await this.ensurePage();
    await page.evaluate<void>(buildMarkOverlayScript(marks));
    try {
      return (await page.screenshot({ type: 'png' })).toString('base64');
    } finally {
      await page.evaluate<void>(removeMarkOverlayScript()).catch(() => undefined);
    }
  }

  async close() {
    await this.browser?.close().catch(() => undefined);
    this.browser = undefined;
    this.page = undefined;
    this.handles = [];
    this.pageErrors = [];
    this.lastHttpStatus = undefined;
  }

  private async ensurePage(): Promise<PlaywrightPage> {
    if (this.page) return this.page;
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: this.options.headless });
    this.browser = browser;
    const context = await browser.newContext();
    this.page = (await context.newPage()) as unknown as PlaywrightPage;
    this.pageErrors = [];
    this.page.on('pageerror', (error) => {
      this.pageErrors.push(error.message || String(error));
      if (this.pageErrors.length > 20) this.pageErrors.shift();
    });
    return this.page;
  }

  private async capture(): Promise<BrowserSnapshot> {
    const page = await this.ensurePage();
    let snapshot = await this.captureOnce();
    for (let attempt = 0; attempt < CANVAS_CAPTURE_RETRY_ATTEMPTS && shouldRetryCanvasCapture(snapshot); attempt += 1) {
      await page.waitForTimeout?.(CANVAS_CAPTURE_RETRY_DELAY_MS).catch(() => undefined);
      snapshot = await this.captureOnce();
    }
    if (shouldCaptureScreenshotVisualFallback(snapshot)) {
      snapshot = {
        ...snapshot,
        screenshotVisual: await this.captureScreenshotVisualSignal(page),
      };
    }
    return snapshot;
  }

  private async captureScreenshotVisualSignal(page: PlaywrightPage): Promise<BrowserScreenshotVisualSignal> {
    try {
      const base64 = (await page.screenshot({ type: 'png' })).toString('base64');
      const stats = await page.evaluate(async (src) => {
        const browserGlobal = globalThis as any;
        const image = new browserGlobal.Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('Screenshot image decode failed.'));
          image.src = src;
        });

        const sourceWidth = Number(image.naturalWidth || image.width) || 0;
        const sourceHeight = Number(image.naturalHeight || image.height) || 0;
        if (sourceWidth <= 0 || sourceHeight <= 0 || !browserGlobal.document?.createElement) {
          return { samples: 0, opaqueSamples: 0, uniqueColorBuckets: 0, maxChannelDelta: 0 };
        }

        const maxSide = 160;
        const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = browserGlobal.document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return { samples: 0, opaqueSamples: 0, uniqueColorBuckets: 0, maxChannelDelta: 0 };

        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        const sampleColumns = Math.min(32, width);
        const sampleRows = Math.min(24, height);
        const buckets = new Set<string>();
        let samples = 0;
        let opaqueSamples = 0;
        let minR = 255;
        let minG = 255;
        let minB = 255;
        let maxR = 0;
        let maxG = 0;
        let maxB = 0;

        for (let row = 0; row < sampleRows; row += 1) {
          const y = sampleRows === 1 ? 0 : Math.round(((height - 1) * row) / (sampleRows - 1));
          for (let column = 0; column < sampleColumns; column += 1) {
            const x = sampleColumns === 1 ? 0 : Math.round(((width - 1) * column) / (sampleColumns - 1));
            const index = (y * width + x) * 4;
            const r = pixels[index] ?? 0;
            const g = pixels[index + 1] ?? 0;
            const b = pixels[index + 2] ?? 0;
            const a = pixels[index + 3] ?? 0;
            samples += 1;
            if (a <= 0) continue;
            opaqueSamples += 1;
            minR = Math.min(minR, r);
            minG = Math.min(minG, g);
            minB = Math.min(minB, b);
            maxR = Math.max(maxR, r);
            maxG = Math.max(maxG, g);
            maxB = Math.max(maxB, b);
            buckets.add(`${r >> 4},${g >> 4},${b >> 4}`);
          }
        }

        return {
          samples,
          opaqueSamples,
          uniqueColorBuckets: buckets.size,
          maxChannelDelta: opaqueSamples > 0 ? Math.max(maxR - minR, maxG - minG, maxB - minB) : 0,
        };
      }, `data:image/png;base64,${base64}`);

      return {
        ...stats,
        content: classifyVisualSampleStats(stats),
        screenshotBase64: base64,
      };
    } catch {
      return {
        content: 'unknown',
        samples: 0,
        opaqueSamples: 0,
        uniqueColorBuckets: 0,
        maxChannelDelta: 0,
      };
    }
  }

  private async captureOnce(): Promise<BrowserSnapshot> {
    const page = await this.ensurePage();
    const locators = await page.locator(INTERACTIVE_SELECTOR).all();
    this.handles = [];
    const elements: BrowserSnapshotElement[] = [];
    for (const locator of locators.slice(0, MAX_ELEMENTS)) {
      if (!(await locator.isVisible().catch(() => false))) continue;
      const ref = `e${this.handles.length + 1}`;
      const role = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => 'node');
      const label = (
        (await locator.getAttribute('aria-label').catch(() => null)) ??
        (await locator.innerText().catch(() => '')) ??
        ''
      )
        .trim()
        .slice(0, 120);
      this.handles.push(locator);
      elements.push({ ref, role, label });
    }
    const canvasLocators = await page.locator('canvas').all();
    const canvases: BrowserSnapshotCanvas[] = [];
    for (const locator of canvasLocators.slice(0, MAX_CANVASES)) {
      const visible = await locator.isVisible().catch(() => false);
      const info = await locator
        .evaluate((node) => {
          const canvas = node as any;
          const rect =
            typeof canvas.getBoundingClientRect === 'function'
              ? canvas.getBoundingClientRect()
              : { width: 0, height: 0 };
          const browserGlobal = globalThis as unknown as {
            getComputedStyle?: (element: any) => { display?: string; visibility?: string; opacity?: string };
          };
          const style =
            typeof browserGlobal.getComputedStyle === 'function' ? browserGlobal.getComputedStyle(canvas) : undefined;
          const clientWidth = Number(rect.width) || Number(canvas.clientWidth) || Number(canvas.offsetWidth) || 0;
          const clientHeight = Number(rect.height) || Number(canvas.clientHeight) || Number(canvas.offsetHeight) || 0;
          const layoutVisible =
            clientWidth > 0 &&
            clientHeight > 0 &&
            style?.display !== 'none' &&
            style?.visibility !== 'hidden' &&
            style?.opacity !== '0';
          let pixelContent: 'observed' | 'blank' | 'unknown' = 'unknown';
          try {
            const width = Number(canvas.width) || 0;
            const height = Number(canvas.height) || 0;
            const context =
              typeof canvas.getContext === 'function' ? canvas.getContext('2d', { willReadFrequently: true }) : null;
            if (context && width > 0 && height > 0) {
              pixelContent = 'blank';
              const sampleWidth = Math.max(1, Math.min(width, 48));
              const sampleHeight = Math.max(1, Math.min(height, 48));
              const sampleRects = [
                [0, 0],
                [
                  Math.max(0, Math.floor(width / 2) - Math.floor(sampleWidth / 2)),
                  Math.max(0, Math.floor(height / 2) - Math.floor(sampleHeight / 2)),
                ],
                [Math.max(0, width - sampleWidth), Math.max(0, height - sampleHeight)],
              ];
              for (const [x, y] of sampleRects) {
                const pixels = context.getImageData(x, y, sampleWidth, sampleHeight).data;
                for (let index = 3; index < pixels.length; index += 4) {
                  if (pixels[index] !== 0) {
                    pixelContent = 'observed';
                    break;
                  }
                }
                if (pixelContent === 'observed') break;
              }
            }
          } catch {
            pixelContent = 'unknown';
          }
          return {
            width: Number(canvas.width) || 0,
            height: Number(canvas.height) || 0,
            clientWidth,
            clientHeight,
            layoutVisible,
            pixelContent,
          };
        })
        .catch(() => ({
          width: 0,
          height: 0,
          clientWidth: 0,
          clientHeight: 0,
          layoutVisible: false,
          pixelContent: 'unknown' as const,
        }));
      const { layoutVisible, ...canvasInfo } = info;
      canvases.push({
        ref: `c${canvases.length + 1}`,
        visible: visible || layoutVisible,
        ...canvasInfo,
      });
    }
    const text = (await page.innerText('body').catch(() => '')).slice(0, MAX_SNAPSHOT_TEXT);
    return {
      url: page.url(),
      title: await page.title().catch(() => ''),
      text,
      elements,
      canvases,
      ...(this.lastHttpStatus !== undefined ? { httpStatus: this.lastHttpStatus } : {}),
      pageErrors: [...this.pageErrors],
    };
  }

  private handle(ref: string) {
    const index = Number(ref.replace(/^e/, '')) - 1;
    const handle = this.handles[index];
    if (!handle) throw new Error(`Unknown element ref: ${ref}. Take a fresh "read" snapshot first.`);
    return handle;
  }
}
