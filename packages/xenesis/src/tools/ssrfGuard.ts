import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';

export type SafeLookupAddress = { address: string; family: number };
export type SafeLookup = (host: string) => Promise<SafeLookupAddress[]>;

export interface SafeFetchOptions {
  maxBytes: number;
  timeoutMs: number;
  allowedHosts?: string[];
  maxRedirects?: number;
  lookup?: SafeLookup;
  fetchImpl?: typeof fetch;
  transport?: SafeFetchTransport;
}

export interface SafeFetchResult {
  url: string;
  status: number;
  contentType: string;
  text: string;
  truncated: boolean;
}

export type PinnedSafeLookup = (host: string) => Promise<SafeLookupAddress[]>;
export type SafeFetchTransport = (
  url: URL,
  options: {
    headers: Record<string, string>;
    signal: AbortSignal;
    lookup: PinnedSafeLookup;
  },
) => Promise<Response>;

const blockedV4Cidrs: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const defaultLookup: SafeLookup = async (host) => dnsLookup(host, { all: true, verbatim: true });
let testLookup: SafeLookup | undefined;
let testTransport: SafeFetchTransport | undefined;

export function setSsrfGuardLookupForTests(lookup?: SafeLookup) {
  testLookup = lookup;
}

export function setSsrfGuardTransportForTests(transport?: SafeFetchTransport) {
  testTransport = transport;
}

function ipv4ToInt(ip: string) {
  return ip
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .reduce((value, part) => ((value << 8) + part) >>> 0, 0);
}

function inV4Cidr(ip: string, base: string, bits: number) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

function isBlockedIpv4(ip: string) {
  return blockedV4Cidrs.some(([base, bits]) => inV4Cidr(ip, base, bits));
}

function isBlockedIpv6(ip: string) {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('ff')) {
    return true;
  }
  const firstHextet = Number.parseInt(lower.split(':')[0] ?? '', 16);
  if (Number.isInteger(firstHextet) && firstHextet >= 0xfe80 && firstHextet <= 0xfebf) {
    return true;
  }
  const mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  const hexMapped = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMapped) {
    const high = Number.parseInt(hexMapped[1], 16);
    const low = Number.parseInt(hexMapped[2], 16);
    if ([high, low].every((part) => Number.isInteger(part) && part >= 0 && part <= 0xffff)) {
      return isBlockedIpv4([(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff].join('.'));
    }
  }
  return false;
}

function wildcardIpHostname(hostname: string) {
  const host = hostname.toLowerCase();
  const suffix = ['.sslip.io', '.nip.io', '.xip.io'].find((candidate) => host.endsWith(candidate));
  if (!suffix) return undefined;
  const labels = host.slice(0, -suffix.length).split('.');
  for (let index = 0; index < labels.length; index += 1) {
    const candidate = labels.slice(index).join('.').replace(/-/g, '.');
    if (isIP(candidate) === 4) return candidate;
  }
  return undefined;
}

function normalizedHost(host: string) {
  return host.replace(/^\[(.*)\]$/u, '$1').toLowerCase();
}

export function isBlockedAddress(ip: string) {
  const host = normalizedHost(ip);
  const version = isIP(host);
  if (version === 4) return isBlockedIpv4(host);
  if (version === 6) return isBlockedIpv6(host);
  return false;
}

export function isAllowedHost(host: string, allowedHosts: string[]) {
  const normalized = normalizedHost(host);
  return allowedHosts.some((candidate) => {
    const allowed = normalizedHost(candidate);
    return normalized === allowed || normalized.endsWith(`.${allowed}`);
  });
}

function isBlockedHostname(host: string) {
  const normalized = normalizedHost(host);
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized === 'metadata' || normalized === 'metadata.google.internal') return true;
  const wildcardIp = wildcardIpHostname(normalized);
  return wildcardIp ? isBlockedAddress(wildcardIp) : isBlockedAddress(normalized);
}

export async function assertSafeUrl(
  url: string,
  opts: { allowedHosts?: string[]; lookup?: SafeLookup } = {},
): Promise<URL> {
  return (await resolveSafeUrl(url, opts)).url;
}

async function resolveSafeUrl(
  url: string,
  opts: { allowedHosts?: string[]; lookup?: SafeLookup } = {},
): Promise<{ url: URL; addresses: SafeLookupAddress[] }> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Only HTTP(S) URLs are supported: ${url}`);
  }

  const host = normalizedHost(parsed.hostname);
  if (opts.allowedHosts && opts.allowedHosts.length > 0 && !isAllowedHost(host, opts.allowedHosts)) {
    throw new Error(`Host not in allowlist: ${host}`);
  }
  if (isBlockedHostname(host)) {
    throw new Error(`Blocked private-network URL: ${url}`);
  }
  const literalVersion = isIP(host);
  if (literalVersion) {
    return { url: parsed, addresses: [{ address: host, family: literalVersion }] };
  }

  const lookup = opts.lookup ?? testLookup ?? defaultLookup;
  const addresses = await lookup(host);
  if (addresses.length === 0) throw new Error(`Host ${host} did not resolve to any addresses.`);
  for (const entry of addresses) {
    if (isBlockedAddress(entry.address)) {
      throw new Error(`Host ${host} resolves to a blocked private-network address: ${entry.address}`);
    }
  }
  return { url: parsed, addresses };
}

function pinnedLookup(addresses: SafeLookupAddress[]): PinnedSafeLookup {
  return async () => addresses;
}

function nodePinnedLookup(addresses: SafeLookupAddress[]): LookupFunction {
  return ((_hostname: string, options: unknown, callback?: unknown) => {
    const cb = (typeof options === 'function' ? options : callback) as (
      error: NodeJS.ErrnoException | null,
      address: string | SafeLookupAddress[],
      family?: number,
    ) => void;
    const opts = typeof options === 'object' && options !== null ? (options as { all?: boolean }) : {};
    if (opts.all) {
      cb(
        null,
        addresses.map((entry) => ({ address: entry.address, family: entry.family })),
      );
      return;
    }
    const first = addresses[0];
    cb(null, first.address, first.family);
  }) as LookupFunction;
}

async function readBoundedText(response: Response, maxBytes: number, signal?: AbortSignal) {
  if (!response.body) return { text: '', truncated: false };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let remaining = maxBytes;
  let text = '';
  let truncated = false;
  let abortError: Error | undefined;
  const abort = () => {
    abortError = signal?.reason instanceof Error ? signal.reason : new Error('Request aborted.');
    void reader.cancel(signal?.reason).catch(() => undefined);
  };
  signal?.addEventListener('abort', abort, { once: true });

  try {
    while (true) {
      if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('Request aborted.');
      const { done, value } = await reader.read();
      if (abortError) throw abortError;
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      if (value.byteLength > remaining) {
        text += decoder.decode(value.slice(0, remaining), { stream: true });
        truncated = true;
        await reader.cancel();
        break;
      }

      remaining -= value.byteLength;
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    text += decoder.decode();
    reader.releaseLock();
  }

  return { text, truncated };
}

async function readBoundedIncomingMessage(response: IncomingMessage, maxBytes: number, signal: AbortSignal) {
  const decoder = new TextDecoder();
  let remaining = maxBytes;
  let text = '';
  let truncated = false;
  const abort = () => response.destroy(signal.reason instanceof Error ? signal.reason : new Error('Request aborted.'));
  signal.addEventListener('abort', abort, { once: true });

  try {
    for await (const rawChunk of response) {
      if (signal.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('Request aborted.');
      const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
      if (chunk.byteLength > remaining) {
        text += decoder.decode(chunk.subarray(0, remaining), { stream: true });
        truncated = true;
        response.destroy();
        break;
      }
      remaining -= chunk.byteLength;
      text += decoder.decode(chunk, { stream: true });
    }
  } finally {
    signal.removeEventListener('abort', abort);
    text += decoder.decode();
  }

  return { text, truncated };
}

function headerValue(headers: IncomingMessage['headers'], name: string) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

async function requestWithPinnedLookup(
  url: URL,
  addresses: SafeLookupAddress[],
  options: { maxBytes: number; signal: AbortSignal },
): Promise<{
  status: number;
  contentType: string;
  location?: string;
  body: { text: string; truncated: boolean };
}> {
  const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return await new Promise((resolvePromise, reject) => {
    const req = request(
      url,
      {
        headers: { 'user-agent': 'xenesis/0.1' },
        lookup: nodePinnedLookup(addresses),
        signal: options.signal,
      },
      (response) => {
        readBoundedIncomingMessage(response, options.maxBytes, options.signal)
          .then((body) =>
            resolvePromise({
              status: response.statusCode ?? 0,
              contentType: headerValue(response.headers, 'content-type') ?? '',
              location: headerValue(response.headers, 'location'),
              body,
            }),
          )
          .catch(reject);
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function transportResponse(
  transport: SafeFetchTransport,
  url: URL,
  addresses: SafeLookupAddress[],
  maxBytes: number,
  signal: AbortSignal,
) {
  const response = await transport(url, {
    headers: { 'user-agent': 'xenesis/0.1' },
    signal,
    lookup: pinnedLookup(addresses),
  });
  return {
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    location: response.headers.get('location') ?? undefined,
    body: await readBoundedText(response, maxBytes, signal),
  };
}

async function fetchImplResponse(fetchImpl: typeof fetch, url: string, maxBytes: number, signal: AbortSignal) {
  const response = await fetchImpl(url, {
    headers: { 'user-agent': 'xenesis/0.1' },
    redirect: 'manual',
    signal,
  });
  return {
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    location: response.headers.get('location') ?? undefined,
    body: await readBoundedText(response, maxBytes, signal),
  };
}

export async function safeFetch(url: string, options: SafeFetchOptions): Promise<SafeFetchResult> {
  const maxRedirects = options.maxRedirects ?? 5;
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const validated = await resolveSafeUrl(currentUrl, { allowedHosts: options.allowedHosts, lookup: options.lookup });
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error(`Request timed out after ${options.timeoutMs}ms.`)),
      options.timeoutMs,
    );
    let response: {
      status: number;
      contentType: string;
      location?: string;
      body: { text: string; truncated: boolean };
    };
    try {
      response = options.transport
        ? await transportResponse(
            options.transport,
            validated.url,
            validated.addresses,
            options.maxBytes,
            controller.signal,
          )
        : options.fetchImpl
          ? await fetchImplResponse(options.fetchImpl, currentUrl, options.maxBytes, controller.signal)
          : testTransport
            ? await transportResponse(
                testTransport,
                validated.url,
                validated.addresses,
                options.maxBytes,
                controller.signal,
              )
            : await requestWithPinnedLookup(validated.url, validated.addresses, {
                maxBytes: options.maxBytes,
                signal: controller.signal,
              });
    } finally {
      clearTimeout(timeout);
    }

    const location = response.location;
    if (response.status >= 300 && response.status < 400 && location) {
      if (redirectCount === maxRedirects) throw new Error(`Too many redirects while fetching: ${url}`);
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    return {
      url: currentUrl,
      status: response.status,
      contentType: response.contentType,
      text: response.body.text,
      truncated: response.body.truncated,
    };
  }

  throw new Error(`Too many redirects while fetching: ${url}`);
}
