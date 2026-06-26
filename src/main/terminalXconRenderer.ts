/**
 * XCON PNG Renderer + Terminal Writer
 *
 * Core engine: renderXconToPng() — renders XCON/SKETCH to a PNG Buffer.
 * This is the shared primitive used by:
 *   - Terminal inline image (xd.terminals.image.showXcon)
 *   - Standalone PNG render (xd.xcon.renderToPng) — for Telegram/Discord/Slack/etc.
 *
 * Pipeline: XCON markdown → renderToHtml() → offscreen BrowserWindow → capturePage() → PNG
 */

import type { XconSyntax } from '@xcon-viewer/core';
import { fromSketchLenient, parseBySyntax } from '@xcon-viewer/core';
import { renderToHtml, viewerCss } from '@xcon-viewer/viewer';
import { BrowserWindow } from 'electron';
import { type TerminalImageOptions, type TerminalImageResult, writeTerminalImage } from './terminalImageWriter';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface XconRenderOptions extends TerminalImageOptions {
  syntax?: XconSyntax | 'sketch';
  theme?: 'light' | 'dark';
  viewportWidth?: number;
  title?: string;
}

export interface XconPngResult {
  ok: boolean;
  /** PNG image as a Buffer (only present when ok=true) */
  png?: Buffer;
  /** PNG image as base64 string (only present when ok=true) */
  base64?: string;
  /** PNG byte size */
  pngBytes?: number;
  /** Rendered image dimensions */
  width?: number;
  height?: number;
  error?: string;
}

// ─── XCON → HTML ────────────────────────────────────────────────────────────

function detectSyntax(code: string): XconSyntax | 'sketch' {
  const trimmed = code.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<')) return 'xml';
  return 'sketch';
}

function extractXconCode(input: string): { code: string; syntax?: XconSyntax | 'sketch' } {
  const fenceMatch = input.match(/```(?:xcon(?:-(\w+))?|sketch|xcons)\s*\n([\s\S]*?)```/);
  if (fenceMatch) {
    const lang = fenceMatch[1] || '';
    const code = fenceMatch[2].trim();
    let syntax: XconSyntax | 'sketch' | undefined;
    if (lang === 'json' || lang === 'j') syntax = 'json';
    else if (lang === 'xml' || lang === 'x') syntax = 'xml';
    else if (lang === 'tagless' || lang === 'l' || lang === 't') syntax = 'tagless';
    else if (lang === 'sketch' || lang === 's' || !lang) syntax = 'sketch';
    return { code, syntax };
  }
  return { code: input.trim() };
}

function renderXconToHtml(code: string, syntax: XconSyntax | 'sketch'): string {
  const document = syntax === 'sketch' ? fromSketchLenient(code).document : parseBySyntax(code, syntax as XconSyntax);
  return renderToHtml(document, { allowExternalResources: true, allowHtml: true });
}

function buildFullHtml(xconHtml: string, options: XconRenderOptions): string {
  const theme = options.theme || 'light';
  const bgColor = theme === 'dark' ? '#0d1117' : '#ffffff';
  const textColor = theme === 'dark' ? '#e6edf3' : '#111827';
  const titleHtml = options.title
    ? `<div style="font-size:18px;font-weight:600;margin-bottom:12px;color:${textColor}">${escapeHtml(options.title)}</div>`
    : '';

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<style>',
    `html, body { margin: 0; padding: 0; background: ${bgColor}; color: ${textColor}; }`,
    'body { font-family: "Segoe UI", Arial, sans-serif; font-size: 14px; line-height: 1.5; padding: 16px; }',
    `.xcon-render { display: inline-block; max-width: 100%; }`,
    viewerCss,
    '</style>',
    '</head>',
    `<body data-xcon-theme="${theme}">`,
    titleHtml,
    `<div class="xcon-render" data-xcon-theme="${theme}">${xconHtml}</div>`,
    '</body>',
    '</html>',
  ].join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── HTML → PNG via offscreen BrowserWindow ─────────────────────────────────

async function renderHtmlToPng(
  html: string,
  viewportWidth: number,
): Promise<{ png: Buffer; width: number; height: number }> {
  const win = new BrowserWindow({
    show: false,
    width: viewportWidth,
    height: 600,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      offscreen: true,
    },
  });

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    await win.webContents.executeJavaScript(
      'document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true, () => true) : true',
      true,
    );

    const contentSize = await win.webContents.executeJavaScript(
      `(() => {
        const body = document.body;
        const html = document.documentElement;
        const width = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
        const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
        return { width: Math.min(width, ${viewportWidth}), height: Math.min(height + 32, 4096) };
      })()`,
      true,
    );

    const w = contentSize.width || viewportWidth;
    const h = contentSize.height || 600;
    win.setSize(w, h);

    await new Promise((r) => setTimeout(r, 100));

    const image = await win.webContents.capturePage({ x: 0, y: 0, width: w, height: h });
    return { png: image.toPNG(), width: w, height: h };
  } finally {
    if (!win.isDestroyed()) {
      win.close();
    }
  }
}

// ─── Public API: Standalone PNG Render ──────────────────────────────────────

/**
 * Render XCON/SKETCH to a PNG image (no output target).
 * Returns the PNG buffer + base64 for any consumer: terminal, Telegram, Discord, Slack, file, etc.
 */
export async function renderXconToPng(
  xconInput: string,
  options: Omit<XconRenderOptions, keyof TerminalImageOptions> & { viewportWidth?: number; title?: string } = {},
): Promise<XconPngResult> {
  try {
    const { code, syntax: detectedSyntax } = extractXconCode(xconInput);
    if (!code) {
      return { ok: false, error: 'Empty XCON input' };
    }

    const syntax = options.syntax || detectedSyntax || detectSyntax(code);
    const xconHtml = renderXconToHtml(code, syntax);
    const fullHtml = buildFullHtml(xconHtml, options as XconRenderOptions);

    const viewportWidth = options.viewportWidth || 1024;
    const { png, width, height } = await renderHtmlToPng(fullHtml, viewportWidth);

    if (!png || png.length === 0) {
      return { ok: false, error: 'Failed to capture XCON render' };
    }

    return {
      ok: true,
      png,
      base64: png.toString('base64'),
      pngBytes: png.length,
      width,
      height,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `XCON render failed: ${msg}` };
  }
}

// ─── Public API: Terminal Writer (uses renderXconToPng internally) ───────────

/**
 * Render XCON/SKETCH and write the result as an inline image to a terminal.
 */
export async function writeTerminalXconImage(
  writeFn: (data: string) => void,
  xconInput: string,
  options: XconRenderOptions = {},
): Promise<TerminalImageResult> {
  const result = await renderXconToPng(xconInput, options);
  if (!result.ok || !result.png) {
    return { ok: false, error: result.error };
  }

  return writeTerminalImage(writeFn, result.png, {
    ...options,
    filename: options.filename || 'xcon-render.png',
  });
}
