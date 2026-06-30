import * as dns from 'node:dns/promises';
import { isIP } from 'node:net';

type DnsAddress = { address: string; family: number };
type DnsLookup = (hostname: string) => Promise<DnsAddress[]>;

const defaultDnsLookup: DnsLookup = async (hostname) => dns.lookup(hostname, { all: true, verbatim: true });
let dnsLookup: DnsLookup = defaultDnsLookup;

export function setUrlSafetyDnsLookupForTests(lookup?: DnsLookup) {
  dnsLookup = lookup ?? defaultDnsLookup;
}

export function normalizedUrlHostname(url: URL) {
  return url.hostname.replace(/^\[(.*)\]$/u, '$1').toLowerCase();
}

function ipv4Parts(hostname: string) {
  const parts = hostname.split('.');
  if (parts.length !== 4) return undefined;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return undefined;
  return numbers as [number, number, number, number];
}

function ipv4FromMappedIpv6(hostname: string) {
  const lower = hostname.toLowerCase();
  if (!lower.startsWith('::ffff:')) return undefined;
  const suffix = lower.slice('::ffff:'.length);
  if (isIP(suffix) === 4) return suffix;
  const parts = suffix.split(':');
  if (parts.length !== 2) return undefined;
  const high = Number.parseInt(parts[0], 16);
  const low = Number.parseInt(parts[1], 16);
  if (![high, low].every((part) => Number.isInteger(part) && part >= 0 && part <= 0xffff)) return undefined;
  return [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff].join('.');
}

function wildcardIpHostname(hostname: string) {
  const host = hostname.toLowerCase();
  const suffixes = ['.sslip.io', '.nip.io', '.xip.io'];
  const suffix = suffixes.find((candidate) => host.endsWith(candidate));
  if (!suffix) return undefined;
  const prefix = host.slice(0, -suffix.length);
  const labels = prefix.split('.');
  for (let index = 0; index < labels.length; index += 1) {
    const candidate = labels.slice(index).join('.').replace(/-/g, '.');
    if (isIP(candidate) === 4) return candidate;
  }
  return undefined;
}

export function isPrivateNetworkHostname(hostname: string) {
  const host = hostname.replace(/^\[(.*)\]$/u, '$1').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === 'metadata' || host === 'metadata.google.internal') return true;
  const wildcardIp = wildcardIpHostname(host);
  if (wildcardIp) return isPrivateNetworkHostname(wildcardIp);

  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const [a, b] = ipv4Parts(host)!;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (ipVersion === 6) {
    const mappedIpv4 = ipv4FromMappedIpv6(host);
    if (mappedIpv4) return isPrivateNetworkHostname(mappedIpv4);
    return (
      host === '::' ||
      host === '::1' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe80:') ||
      host.startsWith('::ffff:127.') ||
      host.startsWith('::ffff:10.') ||
      host.startsWith('::ffff:192.168.') ||
      host.startsWith('::ffff:169.254.')
    );
  }

  return false;
}

async function assertPublicHostnameResolution(hostname: string, rawUrl: string) {
  const host = hostname.replace(/^\[(.*)\]$/u, '$1').toLowerCase();
  if (isIP(host)) return;
  const records = await dnsLookup(host);
  for (const record of records) {
    if (isPrivateNetworkHostname(record.address)) {
      throw new Error(`Blocked private-network URL: ${rawUrl}`);
    }
  }
}

export async function assertPublicHttpUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Only HTTP(S) URLs are supported: ${rawUrl}`);
  }
  if (isPrivateNetworkHostname(normalizedUrlHostname(parsed))) {
    throw new Error(`Blocked private-network URL: ${rawUrl}`);
  }
  await assertPublicHostnameResolution(normalizedUrlHostname(parsed), rawUrl);
  return parsed;
}

export function privateNetworkUrlInText(text: string) {
  const matches = text.match(/https?:\/\/[^\s"'<>`)]+/giu) ?? [];
  for (const match of matches) {
    try {
      const parsed = new URL(match);
      if (isPrivateNetworkHostname(normalizedUrlHostname(parsed))) return match;
    } catch {}
  }
  return undefined;
}
