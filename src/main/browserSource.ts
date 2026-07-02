import type { BrowserSourceRequest, BrowserSourceResult } from '../shared/types';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

function unavailable(request: BrowserSourceRequest, error: string, finalUrl = request.url): BrowserSourceResult {
  return {
    ok: false,
    kind: 'unavailable',
    url: request.url,
    finalUrl,
    error,
  };
}

function isHtmlContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return normalized.includes('text/html') || normalized.includes('application/xhtml+xml');
}

export async function loadBrowserResponseSource(request: BrowserSourceRequest): Promise<BrowserSourceResult> {
  let parsed: URL;
  try {
    parsed = new URL(request.url);
  } catch {
    return unavailable(request, 'Invalid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return unavailable(request, 'Only http and https URLs can be loaded as remote source.');
  }

  const timeoutMs = Math.max(1000, Number(request.timeoutMs) || DEFAULT_TIMEOUT_MS);
  const maxBytes = Math.max(1, Number(request.maxBytes) || DEFAULT_MAX_BYTES);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
    };
    if (request.userAgent?.trim()) headers['user-agent'] = request.userAgent.trim();

    const response = await fetch(request.url, {
      redirect: 'follow',
      signal: controller.signal,
      headers,
    });
    const finalUrl = response.url || request.url;
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) return unavailable(request, `HTTP ${response.status} ${response.statusText}`.trim(), finalUrl);
    if (!isHtmlContentType(contentType)) {
      return unavailable(
        request,
        `Expected HTML response but received ${contentType || 'unknown content type'}.`,
        finalUrl,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      return unavailable(request, `Remote source exceeds ${maxBytes} bytes.`, finalUrl);
    }

    return {
      ok: true,
      kind: 'response-source',
      url: request.url,
      finalUrl,
      source: buffer.toString('utf8'),
      contentType,
      byteCount: buffer.byteLength,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return unavailable(request, message || 'Remote source load failed.');
  } finally {
    clearTimeout(timer);
  }
}
