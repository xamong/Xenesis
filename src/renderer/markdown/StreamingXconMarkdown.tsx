import {
  fromSketchLenient,
  parseBySyntax,
  type SketchRecoveryError,
  type XconObject,
  type XconSyntax,
} from '@xcon-viewer/core';
import { hydrateXconViewer, renderToHtml, viewerCss } from '@xcon-viewer/viewer';
import mermaid from 'mermaid';
import React, { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { ThemeName } from '../../shared/types';
import { initMermaid } from '../hooks/useMermaidTheme';
import { useI18n } from '../i18n';
import { useAppTheme } from '../ThemeContext';
import {
  getRendererPerformanceTraceDuration,
  getRendererPerformanceTraceNow,
  measureRendererPerformanceTrace,
  recordRendererPerformanceTrace,
} from '../utils/performanceTrace';

export type MarkdownXconFormat = 'auto' | XconSyntax;

const MIN_MARKDOWN_XCON_RENDER_INTERVAL_MS = 120;
const MARKDOWN_IDLE_RENDER_TIMEOUT_MS = 180;
const MAX_MARKDOWN_XCON_RENDER_SNAPSHOTS = 16;

let mermaidStreamingSeq = 0;

interface MarkdownXconPreviewSize {
  width: number;
  height: number;
}

interface MarkdownXconRenderResult {
  previewSize: MarkdownXconPreviewSize;
  diagnostics: SketchRecoveryError[];
}

interface MarkdownXconRenderSnapshot {
  bodyHtml: string;
  previewSize: MarkdownXconPreviewSize;
  renderKey: string;
  theme: ThemeName;
}

const markdownXconRenderSnapshots = new Map<string, MarkdownXconRenderSnapshot>();

interface OpenMarkdownXconFence {
  codeStart: number;
  info: string;
  lang: string;
  format: MarkdownXconFormat;
  marker: string;
}

interface MarkdownFenceFrame {
  marker: string;
  markerChar: '`' | '~';
  markerLength: number;
  info: string;
  codeStart: number;
  xconFence: OpenMarkdownXconFence | null;
}

interface StreamingMarkdownPreviewResult {
  markdown: string;
  hasOpenXconFence: boolean;
  hasBestEffortXcon: boolean;
  fallbackMarkdown: string;
}

function getMarkdownFenceParts(info: string): { lang: string; args: string[] } {
  const [language, ...args] = String(info || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return { lang: (language || '').toLowerCase(), args };
}

function isMarkdownFenceOpeningLine(lineText: string): MarkdownFenceFrame | null {
  const match = /^[ \t]{0,3}(`{3,}|~{3,})([^\r\n]*)$/.exec(lineText);
  if (!match) return null;
  const marker = match[1];
  const markerChar = marker[0] as '`' | '~';
  return {
    marker,
    markerChar,
    markerLength: marker.length,
    info: match[2].trim(),
    codeStart: 0,
    xconFence: null,
  };
}

function isMarkdownFenceClosingLine(lineText: string, frame: MarkdownFenceFrame): boolean {
  const escapedMarker = frame.markerChar === '`' ? '`' : '~';
  const pattern = new RegExp(`^[ \\t]{0,3}${escapedMarker}{${frame.markerLength},}[ \\t]*$`);
  return pattern.test(lineText);
}

export function hasCompleteMarkdownXconFence(markdown: string): boolean {
  const lines = String(markdown || '').match(/[^\r\n]*(?:\r?\n|$)/g) ?? [];
  let openFrame: MarkdownFenceFrame | null = null;

  for (const line of lines) {
    if (!line) continue;
    const lineText = line.replace(/\r?\n$/, '');
    if (openFrame) {
      if (isMarkdownFenceClosingLine(lineText, openFrame)) {
        if (openFrame.xconFence) return true;
        openFrame = null;
      }
      continue;
    }

    const opening = isMarkdownFenceOpeningLine(lineText);
    if (!opening) continue;
    const { lang } = getMarkdownFenceParts(opening.info);
    const format = getMarkdownXconFormat(lang);
    openFrame = {
      ...opening,
      xconFence: format
        ? {
            codeStart: 0,
            info: opening.info,
            lang,
            format,
            marker: opening.marker,
          }
        : null,
    };
  }

  return false;
}

export function getMarkdownXconFormat(lang: string): MarkdownXconFormat | null {
  switch (lang.toLowerCase()) {
    case 'xcon':
      return 'auto';
    case 'xcon-json':
    case 'xconj':
      return 'json';
    case 'xcon-xml':
    case 'xconx':
      return 'xml';
    case 'xcon-tagless':
    case 'xconl':
    case 'xcont':
      return 'tagless';
    case 'xcon-sketch':
    case 'xcons':
    case 'sketch':
      return 'sketch';
    default:
      return null;
  }
}

function detectMarkdownXconFormat(src: string): XconSyntax {
  const trimmed = src.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<')) return 'xml';
  if (/^(screen|form|panel)\b/i.test(trimmed)) return 'sketch';
  return 'tagless';
}

function getMarkdownXconShadow(host: HTMLElement): ShadowRoot {
  return host.shadowRoot ?? host.attachShadow({ mode: 'open' });
}

function rectParts(value: unknown): [number, number, number, number] | null {
  if (Array.isArray(value) && value.length >= 4) {
    const parts = value.slice(0, 4).map(Number);
    return parts.every(Number.isFinite) ? (parts as [number, number, number, number]) : null;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/^\s*\[|\]\s*$/g, '');
  const parts = normalized.split(',').map((part) => Number(part.trim()));
  return parts.length >= 4 && parts.every(Number.isFinite)
    ? (parts.slice(0, 4) as [number, number, number, number])
    : null;
}

function getMarkdownXconPreviewSize(document: XconObject): MarkdownXconPreviewSize {
  const pos = rectParts(document.get('pos'));
  if (!pos) return { width: 360, height: 220 };
  const [x, y, width, height] = pos;
  return {
    width: Math.max(120, Math.ceil(x + width)),
    height: Math.max(80, Math.ceil(y + height)),
  };
}

function parseMarkdownXconForRender(
  code: string,
  format: XconSyntax,
): { document: XconObject; diagnostics: SketchRecoveryError[] } {
  if (format === 'sketch') {
    const result = fromSketchLenient(code);
    return { document: result.document, diagnostics: result.errors };
  }
  return { document: parseBySyntax(code, format), diagnostics: [] };
}

function applyMarkdownXconScale(host: HTMLElement, size: MarkdownXconPreviewSize): void {
  const availableWidth = host.parentElement?.clientWidth || size.width;
  const scale = Math.min(1, Math.max(0.1, availableWidth / size.width));
  host.style.setProperty('--md-xcon-scale', scale.toFixed(4));
  host.style.setProperty('--md-xcon-scaled-width', `${Math.ceil(size.width * scale)}px`);
  host.style.setProperty('--md-xcon-scaled-height', `${Math.ceil(size.height * scale)}px`);
}

function hashMarkdownXconHtml(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function getMarkdownXconSnapshotKey(format: MarkdownXconFormat, theme: ThemeName, code: string): string {
  return `${theme}:${format}:${hashMarkdownXconHtml(code)}`;
}

function rememberMarkdownXconSnapshot(key: string, snapshot: MarkdownXconRenderSnapshot): void {
  markdownXconRenderSnapshots.delete(key);
  markdownXconRenderSnapshots.set(key, snapshot);
  while (markdownXconRenderSnapshots.size > MAX_MARKDOWN_XCON_RENDER_SNAPSHOTS) {
    const oldestKey = markdownXconRenderSnapshots.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    markdownXconRenderSnapshots.delete(oldestKey);
  }
}

function scheduleMarkdownIdleRender(callback: () => void): () => void {
  let cancelled = false;
  const run = () => {
    if (!cancelled) callback();
  };

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(run, { timeout: MARKDOWN_IDLE_RENDER_TIMEOUT_MS });
    return () => {
      cancelled = true;
      window.cancelIdleCallback?.(handle);
    };
  }

  const timer = window.setTimeout(run, MARKDOWN_IDLE_RENDER_TIMEOUT_MS);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

function useIdleQueuedText(source: string, enabled: boolean): string {
  const [queuedText, setQueuedText] = useState(source);
  const latestSourceRef = useRef(source);
  const pendingIdleRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    latestSourceRef.current = source;

    if (!enabled) {
      pendingIdleRenderRef.current?.();
      pendingIdleRenderRef.current = null;
      setQueuedText((current) => (current === source ? current : source));
      return;
    }

    if (source === queuedText || pendingIdleRenderRef.current) return;

    pendingIdleRenderRef.current = scheduleMarkdownIdleRender(() => {
      pendingIdleRenderRef.current = null;
      setQueuedText(latestSourceRef.current);
    });
  }, [enabled, queuedText, source]);

  useEffect(
    () => () => {
      pendingIdleRenderRef.current?.();
      pendingIdleRenderRef.current = null;
    },
    [],
  );

  return enabled ? queuedText : source;
}

function applyMarkdownXconHostSize(host: HTMLElement, size: MarkdownXconPreviewSize): void {
  host.style.setProperty('--md-xcon-width', `${size.width}px`);
  host.style.setProperty('--md-xcon-height', `${size.height}px`);
  applyMarkdownXconScale(host, size);
}

function ensureMarkdownXconShadowScaffold(shadow: ShadowRoot): void {
  if (shadow.querySelector('[data-md-xcon-shadow-style="true"]')) return;
  const style = document.createElement('style');
  style.dataset.mdXconShadowStyle = 'true';
  style.textContent = `
    :host {
      display: block;
      width: var(--md-xcon-scaled-width, var(--md-xcon-width, 100%));
      height: var(--md-xcon-scaled-height, var(--md-xcon-height, auto));
      min-height: 0;
      overflow: visible;
      box-sizing: border-box;
      background: transparent;
      white-space: normal;
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 16px;
      line-height: normal;
      letter-spacing: normal;
    }
    .md-xcon-shadow-root {
      position: relative;
      width: var(--md-xcon-width, 100%);
      height: var(--md-xcon-height, auto);
      min-height: var(--md-xcon-height, 0px);
      overflow: hidden;
      box-sizing: border-box;
      white-space: normal;
      font-family: inherit;
      font-size: 16px;
      line-height: normal;
      letter-spacing: normal;
      transform: scale(var(--md-xcon-scale, 1));
      transform-origin: 0 0;
      opacity: 1;
    }
    ${viewerCss}
  `;
  shadow.appendChild(style);
}

function restoreMarkdownXconRenderSnapshot(host: HTMLElement, snapshot: MarkdownXconRenderSnapshot): void {
  if (host.dataset.mdXconHasRender === 'true') return;
  applyMarkdownXconHostSize(host, snapshot.previewSize);
  const shadow = getMarkdownXconShadow(host);
  ensureMarkdownXconShadowScaffold(shadow);
  shadow.querySelectorAll<HTMLElement>('.md-xcon-shadow-root').forEach((layer) => layer.remove());
  const cachedLayer = window.document.createElement('div');
  cachedLayer.dataset.xconTheme = snapshot.theme;
  cachedLayer.dataset.mdXconLayer = 'active';
  cachedLayer.setAttribute('data-md-xcon-layer', 'active');
  cachedLayer.className = 'md-xcon-shadow-root';
  cachedLayer.innerHTML = snapshot.bodyHtml;
  shadow.appendChild(cachedLayer);
  hydrateXconViewer(cachedLayer);
  host.dataset.mdXconRenderKey = snapshot.renderKey;
  host.dataset.mdXconHasRender = 'true';
  host.setAttribute('data-md-xcon-render-key', snapshot.renderKey);
}

function replaceMarkdownXconRenderLayer(shadow: ShadowRoot, nextLayer: HTMLElement): void {
  const previousLayers = [...shadow.querySelectorAll<HTMLElement>('[data-md-xcon-layer]')];

  nextLayer.dataset.mdXconLayer = 'active';
  nextLayer.setAttribute('data-md-xcon-layer', 'active');
  nextLayer.removeAttribute('aria-hidden');
  shadow.appendChild(nextLayer);
  hydrateXconViewer(nextLayer);
  previousLayers.forEach((layer) => layer.remove());
}

function sameSketchDiagnostics(left: SketchRecoveryError[], right: SketchRecoveryError[]): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const other = right[index];
    return (
      item.line === other.line &&
      item.column === other.column &&
      item.message === other.message &&
      item.source === other.source
    );
  });
}

function renderMarkdownXcon(
  host: HTMLElement,
  code: string,
  format: XconSyntax,
  theme: ThemeName,
): MarkdownXconRenderResult {
  const { document, diagnostics } = parseMarkdownXconForRender(code, format);
  const previewSize = getMarkdownXconPreviewSize(document);
  applyMarkdownXconHostSize(host, previewSize);
  const shadow = getMarkdownXconShadow(host);
  const bodyHtml = renderToHtml(document, { allowExternalResources: true, allowHtml: true });
  const renderKey = `${theme}:${previewSize.width}x${previewSize.height}:${hashMarkdownXconHtml(bodyHtml)}`;
  if (host.dataset.mdXconRenderKey === renderKey) return { previewSize, diagnostics };
  ensureMarkdownXconShadowScaffold(shadow);
  const nextLayer = window.document.createElement('div');
  nextLayer.dataset.xconTheme = theme;
  nextLayer.className = 'md-xcon-shadow-root';
  nextLayer.innerHTML = bodyHtml;
  replaceMarkdownXconRenderLayer(shadow, nextLayer);
  host.dataset.mdXconRenderKey = renderKey;
  host.dataset.mdXconHasRender = 'true';
  host.setAttribute('data-md-xcon-render-key', renderKey);
  rememberMarkdownXconSnapshot(getMarkdownXconSnapshotKey(format, theme, code), {
    bodyHtml,
    previewSize,
    renderKey,
    theme,
  });
  return { previewSize, diagnostics };
}

function findOpenMarkdownXconFence(markdown: string): OpenMarkdownXconFence | null {
  const lines = String(markdown || '').match(/[^\r\n]*(?:\r?\n|$)/g) ?? [];
  let offset = 0;
  let openFrame: MarkdownFenceFrame | null = null;

  for (const line of lines) {
    if (!line) continue;
    const lineText = line.replace(/\r?\n$/, '');
    if (openFrame) {
      if (isMarkdownFenceClosingLine(lineText, openFrame)) {
        openFrame = null;
      }
      offset += line.length;
      continue;
    }

    const opening = isMarkdownFenceOpeningLine(lineText);
    if (opening) {
      const { lang } = getMarkdownFenceParts(opening.info);
      const format = getMarkdownXconFormat(lang);
      openFrame = {
        ...opening,
        codeStart: offset + line.length,
        xconFence: format
          ? {
              codeStart: offset + line.length,
              info: opening.info,
              lang,
              format,
              marker: opening.marker,
            }
          : null,
      };
    }
    offset += line.length;
  }

  return openFrame?.xconFence ?? null;
}

function findBestEffortMarkdownXconSource(code: string, format: MarkdownXconFormat): string {
  const normalized = String(code || '').replace(/\r\n/g, '\n');
  const completeSource = normalized.endsWith('\n')
    ? normalized
    : normalized.slice(0, Math.max(0, normalized.lastIndexOf('\n') + 1));
  const lines = completeSource.split('\n');

  for (let end = lines.length; end > 0; end -= 1) {
    const candidate = lines.slice(0, end).join('\n').trimEnd();
    if (!candidate.trim()) continue;
    const resolvedFormat = format === 'auto' ? detectMarkdownXconFormat(candidate) : format;
    try {
      parseMarkdownXconForRender(candidate, resolvedFormat);
      return candidate;
    } catch {
      // Keep trimming to the last parseable complete line.
    }
  }

  return '';
}

function buildStreamingMarkdownPreviewResult(markdown: string): StreamingMarkdownPreviewResult {
  const openFence = findOpenMarkdownXconFence(markdown);
  if (!openFence) {
    return {
      markdown,
      hasOpenXconFence: false,
      hasBestEffortXcon: false,
      fallbackMarkdown: markdown,
    };
  }

  const partialCode = markdown.slice(openFence.codeStart);
  const bestEffortCode = findBestEffortMarkdownXconSource(partialCode, openFence.format);
  const fallbackMarkdown = markdown.slice(0, openFence.codeStart).trimEnd();
  if (!bestEffortCode) {
    return {
      markdown: fallbackMarkdown,
      hasOpenXconFence: true,
      hasBestEffortXcon: false,
      fallbackMarkdown,
    };
  }

  return {
    markdown: `${markdown.slice(0, openFence.codeStart)}${bestEffortCode}\n${openFence.marker}\n`,
    hasOpenXconFence: true,
    hasBestEffortXcon: true,
    fallbackMarkdown,
  };
}

export function buildStreamingMarkdownPreview(markdown: string): string {
  return buildStreamingMarkdownPreviewResult(markdown).markdown;
}

export function useStableStreamingMarkdownPreview(markdown: string): string {
  const lastRenderableMarkdownRef = useRef('');

  return useMemo(() => {
    const result = buildStreamingMarkdownPreviewResult(markdown);
    if (result.hasOpenXconFence && !result.hasBestEffortXcon) {
      return lastRenderableMarkdownRef.current || result.fallbackMarkdown;
    }
    lastRenderableMarkdownRef.current = result.markdown;
    return result.markdown;
  }, [markdown]);
}

interface MarkdownXconBlockProps {
  code: string;
  format: MarkdownXconFormat;
  theme: ThemeName;
}

function MermaidBlock({ code, theme }: { code: string; theme: ThemeName }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initMermaid(theme);
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    setError(null);
    if (!code.trim()) return;

    const id = `mmd-stream-${++mermaidStreamingSeq}`;
    let cancelled = false;

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        const svgEl = ref.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (error) {
    return (
      <div className="md-mermaid-error">
        <span className="md-mermaid-error-title">{t('markdown.mermaidError')}</span>
        <pre className="md-mermaid-error-msg">{error}</pre>
      </div>
    );
  }

  return <div ref={ref} className="md-mermaid-block" />;
}

function sameMarkdownXconBlockProps(previous: MarkdownXconBlockProps, next: MarkdownXconBlockProps): boolean {
  return previous.code === next.code && previous.format === next.format && previous.theme === next.theme;
}

export const MarkdownXconBlock = React.memo(function MarkdownXconBlock({
  code,
  format,
  theme,
}: MarkdownXconBlockProps) {
  const { t } = useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const renderCleanupRef = useRef<(() => void) | null>(null);
  const renderTimerRef = useRef<number | undefined>(undefined);
  const pendingRenderRef = useRef<{ code: string; format: XconSyntax; theme: ThemeName } | null>(null);
  const lastRenderAtRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<SketchRecoveryError[]>([]);
  const resolvedFormat = format === 'auto' ? detectMarkdownXconFormat(code) : format;
  const snapshotKey = useMemo(
    () => getMarkdownXconSnapshotKey(resolvedFormat, theme, code),
    [code, resolvedFormat, theme],
  );
  const initialPreviewSize = useMemo<MarkdownXconPreviewSize | null>(() => {
    const snapshot = markdownXconRenderSnapshots.get(snapshotKey);
    if (snapshot) return snapshot.previewSize;
    try {
      const { document } = parseMarkdownXconForRender(code, resolvedFormat);
      return getMarkdownXconPreviewSize(document);
    } catch {
      return null;
    }
  }, [code, resolvedFormat, snapshotKey]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !initialPreviewSize) return;
    applyMarkdownXconHostSize(host, initialPreviewSize);
    const snapshot = snapshotKey ? markdownXconRenderSnapshots.get(snapshotKey) : undefined;
    if (snapshot) restoreMarkdownXconRenderSnapshot(host, snapshot);
  }, [initialPreviewSize, snapshotKey]);

  const flushRender = () => {
    const host = hostRef.current;
    const pending = pendingRenderRef.current;
    if (!host || !pending) return;

    pendingRenderRef.current = null;
    renderTimerRef.current = undefined;
    renderCleanupRef.current?.();
    renderCleanupRef.current = null;

    setError((current) => (current === null ? current : null));
    setDiagnostics((current) => (current.length ? [] : current));

    try {
      const { previewSize, diagnostics } = measureRendererPerformanceTrace(
        {
          scope: 'markdown-xcon',
          action: 'xcon-block-render',
          details: {
            format: pending.format,
            theme: pending.theme,
            codeChars: pending.code.length,
          },
        },
        () => renderMarkdownXcon(host, pending.code, pending.format, pending.theme),
      );
      setDiagnostics((current) => (sameSketchDiagnostics(current, diagnostics) ? current : diagnostics));
      const syncScale = () => applyMarkdownXconScale(host, previewSize);
      syncScale();
      let resizeObserver: ResizeObserver | undefined;
      if (typeof ResizeObserver !== 'undefined' && host.parentElement) {
        resizeObserver = new ResizeObserver(syncScale);
        resizeObserver.observe(host.parentElement);
      }
      window.addEventListener('resize', syncScale);
      renderCleanupRef.current = () => {
        resizeObserver?.disconnect();
        window.removeEventListener('resize', syncScale);
      };
      lastRenderAtRef.current = Date.now();
    } catch (err) {
      if (host.dataset.mdXconHasRender === 'true') {
        setError(null);
        setDiagnostics([]);
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    pendingRenderRef.current = { code, format: resolvedFormat, theme };
    const hasPreviousRender = host.dataset.mdXconHasRender === 'true';
    const elapsed = Date.now() - lastRenderAtRef.current;
    const delay = hasPreviousRender ? Math.max(0, MIN_MARKDOWN_XCON_RENDER_INTERVAL_MS - elapsed) : 0;

    if (delay <= 0) {
      if (renderTimerRef.current !== undefined) {
        window.clearTimeout(renderTimerRef.current);
        renderTimerRef.current = undefined;
      }
      flushRender();
      return;
    }

    if (renderTimerRef.current === undefined) {
      renderTimerRef.current = window.setTimeout(flushRender, delay);
    }
  }, [code, resolvedFormat, theme]);

  useEffect(
    () => () => {
      if (renderTimerRef.current !== undefined) {
        window.clearTimeout(renderTimerRef.current);
      }
      renderCleanupRef.current?.();
    },
    [],
  );

  return (
    <div className="md-xcon-block" data-xcon-theme={theme}>
      {error && (
        <div className="md-xcon-error">
          <span className="md-xcon-error-title">{t('markdown.xconError')}</span>
          <pre className="md-xcon-error-msg">{error}</pre>
        </div>
      )}
      <div ref={hostRef} className="md-xcon-public-viewer" />
      {diagnostics.length > 0 && (
        <details className="md-xcon-diagnostics">
          <summary>
            {diagnostics.length} SKETCH parse warning{diagnostics.length === 1 ? '' : 's'}
          </summary>
          <ul>
            {diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.line}-${index}`}>
                <span className="md-xcon-diagnostic-line">line {diagnostic.line}</span>
                <span>{diagnostic.message.replace(/^XCON\/SKETCH parse error at line \d+:\s*/, '')}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}, sameMarkdownXconBlockProps);

export function StreamingXconMarkdown({
  content,
  className,
  deferRendering = false,
}: {
  content: string;
  className?: string;
  deferRendering?: boolean;
}) {
  const markdownRenderTraceStartedAt = getRendererPerformanceTraceNow();
  const appTheme = useAppTheme();
  const deferredContent = useDeferredValue(content);
  const idleContent = useIdleQueuedText(deferredContent, deferRendering);
  const renderContent = deferRendering ? idleContent : content;
  const previewMarkdown = useStableStreamingMarkdownPreview(renderContent);
  useEffect(() => {
    recordRendererPerformanceTrace({
      scope: 'markdown-xcon',
      action: 'markdown-rendered',
      durationMs: getRendererPerformanceTraceDuration(markdownRenderTraceStartedAt),
      details: {
        deferRendering,
        sourceChars: content.length,
        contentChars: previewMarkdown.length,
      },
    });
  }, [content.length, deferRendering, markdownRenderTraceStartedAt, previewMarkdown.length]);
  const markdownComponents = useMemo(
    () => ({
      img({ src, alt }: { src?: string; alt?: string }) {
        return <img src={src} alt={alt ?? ''} style={{ maxWidth: '100%' }} />;
      },
      code({ className, children, ...props }: React.ComponentProps<'code'>) {
        const lang = /language-([\w-]+)/.exec(className ?? '')?.[1] ?? '';
        const codeStr = String(children).replace(/\n$/, '');
        if (lang === 'mermaid') {
          return <MermaidBlock code={codeStr} theme={appTheme} />;
        }
        const xconFormat = getMarkdownXconFormat(lang);
        if (xconFormat) {
          return <MarkdownXconBlock code={codeStr} format={xconFormat} theme={appTheme} />;
        }
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }),
    [appTheme],
  );

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {previewMarkdown}
      </ReactMarkdown>
    </div>
  );
}
