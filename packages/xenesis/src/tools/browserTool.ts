import { z } from 'zod';
import { BrowserSurfaceHandler } from '../core/surface/browserSurface.js';
import { renderSurfaceSnapshot, type SurfaceSnapshot } from '../core/surface/index.js';
import { type BrowserDriver, PlaywrightBrowserDriver } from './browserDriver.js';
import { isAllowedHost } from './ssrfGuard.js';
import type { Tool, ToolContext } from './types.js';

const browserInput = z.object({
  action: z.enum(['goto', 'read', 'click', 'fill', 'back', 'screenshot', 'close']),
  url: z.string().nullable().optional(),
  index: z.number().int().positive().nullable().optional(),
  text: z.string().nullable().optional(),
  submit: z.boolean().nullable().optional(),
  som: z.boolean().nullable().optional(),
});

const browserOpenAIInput = z.object({
  action: z.enum(['goto', 'read', 'click', 'fill', 'back', 'screenshot', 'close']),
  url: z.string().nullable(),
  index: z.number().int().positive().nullable(),
  text: z.string().nullable(),
  submit: z.boolean().nullable(),
  som: z.boolean().nullable(),
});

type BrowserToolInput = z.infer<typeof browserInput>;

/**
 * Normalize a screenshot (raw base64 from the browser driver, or an already-formed
 * data URL) to a `data:image/png;base64,...` data URL for use as an image attachment.
 */
function screenshotDataUrl(screenshot: string): string {
  return screenshot.startsWith('data:') ? screenshot : `data:image/png;base64,${screenshot}`;
}

export interface BrowserToolOptions {
  headless: boolean;
  allowedHosts: string[];
  idleTimeoutMs: number;
  createDriver?: () => BrowserDriver;
}

interface DriverEntry {
  driver: BrowserDriver;
  idleTimer?: NodeJS.Timeout;
}

export function createBrowserTool(options: BrowserToolOptions): Tool<BrowserToolInput, SurfaceSnapshot> {
  const drivers = new Map<string, DriverEntry>();

  function assertAllowedUrl(url: string) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Only HTTP(S) URLs are allowed: ${url}`);
    }
    if (options.allowedHosts.length > 0 && !isAllowedHost(parsed.hostname, options.allowedHosts)) {
      throw new Error(`Host not in browser.allowedHosts: ${parsed.hostname}`);
    }
  }

  async function checkedSurfaceSnapshot(context: ToolContext, snapshot: SurfaceSnapshot) {
    try {
      if (snapshot.url) assertAllowedUrl(snapshot.url);
      return {
        ok: true,
        content: renderSurfaceSnapshot(snapshot),
        data: snapshot,
        // Carry the SOM/browser screenshot as a model-visible image attachment
        // (vision-gated downstream). renderSurfaceSnapshot stays image-free.
        ...(snapshot.screenshot
          ? {
              attachments: [
                {
                  kind: 'image' as const,
                  name: 'screenshot',
                  mimeType: 'image/png',
                  dataUrl: screenshotDataUrl(snapshot.screenshot),
                },
              ],
            }
          : {}),
      };
    } catch (error) {
      await closeSession(context.sessionId).catch(() => undefined);
      throw error;
    }
  }

  async function closeSession(sessionId: string) {
    const entry = drivers.get(sessionId);
    if (!entry) return;
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    drivers.delete(sessionId);
    await entry.driver.close();
  }

  function entryFor(context: ToolContext): DriverEntry {
    let entry = drivers.get(context.sessionId);
    if (!entry) {
      entry = {
        driver: options.createDriver?.() ?? new PlaywrightBrowserDriver({ headless: options.headless }),
      };
      drivers.set(context.sessionId, entry);
    }
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => {
      void closeSession(context.sessionId);
    }, options.idleTimeoutMs);
    entry.idleTimer.unref?.();
    return entry;
  }

  return {
    name: 'browser',
    description: [
      'Control a headless browser. goto/read return a text snapshot with numbered element indices ([1], [2], ...);',
      'click/fill act on those indices. read accepts som=true for a marked screenshot; screenshot always captures SOM. Never type passwords or secrets into pages.',
    ].join(' '),
    inputSchema: browserInput,
    openaiInputSchema: browserOpenAIInput,
    isReadOnly: (input) => input.action !== 'click' && input.action !== 'fill',
    cleanupSession: closeSession,
    async run(input, context) {
      try {
        if (input.action === 'close') {
          await closeSession(context.sessionId);
          return { ok: true, content: 'browser: closed' };
        }

        if (input.action === 'goto') {
          if (!input.url) return { ok: false, content: 'browser goto requires "url".' };
          assertAllowedUrl(input.url);
          const entry = entryFor(context);
          const handler = new BrowserSurfaceHandler(entry.driver);
          const snapshot = await handler.act({ type: 'navigate', url: input.url });
          return await checkedSurfaceSnapshot(context, snapshot);
        }

        const entry = entryFor(context);
        const handler = new BrowserSurfaceHandler(entry.driver);

        if (input.action === 'read') {
          const snapshot = await handler.snapshot({ som: input.som ?? false });
          return await checkedSurfaceSnapshot(context, snapshot);
        }

        if (input.action === 'click') {
          if (!input.index) return { ok: false, content: 'browser click requires "index".' };
          const snapshot = await handler.act({ type: 'click', index: input.index });
          return await checkedSurfaceSnapshot(context, snapshot);
        }

        if (input.action === 'fill') {
          if (!input.index) return { ok: false, content: 'browser fill requires "index".' };
          if (input.text === undefined || input.text === null) {
            return { ok: false, content: 'browser fill requires "text".' };
          }
          const snapshot = await handler.act({
            type: 'fill',
            index: input.index,
            text: input.text,
            submit: input.submit ?? false,
          });
          return await checkedSurfaceSnapshot(context, snapshot);
        }

        if (input.action === 'back') {
          const snapshot = await handler.act({ type: 'back' });
          return await checkedSurfaceSnapshot(context, snapshot);
        }

        const snapshot = await handler.snapshot({ som: true });
        return await checkedSurfaceSnapshot(context, snapshot);
      } catch (error) {
        return {
          ok: false,
          content: `browser ${input.action} failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  };
}
