/**
 * Terminal Inline Image Writer
 *
 * Encodes images as iTerm2 Inline Image Protocol (IIP) escape sequences
 * for rendering inside xterm.js terminals with @xterm/addon-image.
 *
 * Supported sources: file path, URL, raw Buffer.
 * Output: OSC 1337 escape sequence written directly to a PTY backend.
 */

import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { net } from 'electron';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TerminalImageOptions {
  /** Display width — 'auto', number (cells), 'Npx', 'N%' */
  width?: string;
  /** Display height — 'auto', number (cells), 'Npx', 'N%' */
  height?: string;
  /** Preserve aspect ratio (default: true) */
  preserveAspectRatio?: boolean;
  /** Optional filename for the image */
  filename?: string;
}

export interface TerminalImageResult {
  ok: boolean;
  error?: string;
  bytesSent?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_IMAGE_SIZE = 20_000_000; // 20 MB — matches IIP addon default
export const TERMINAL_IMAGE_SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/gif'] as const;

const SUPPORTED_MIME = new Set<string>(TERMINAL_IMAGE_SUPPORTED_FORMATS);

// ─── IIP Sequence Builder ───────────────────────────────────────────────────

function buildIipSequence(data: Buffer, options: TerminalImageOptions = {}): string {
  const base64 = data.toString('base64');
  const size = data.length;
  const name = options.filename
    ? Buffer.from(options.filename, 'utf-8').toString('base64')
    : Buffer.from('image', 'utf-8').toString('base64');
  const width = options.width ?? 'auto';
  const height = options.height ?? 'auto';
  const preserveAspect = options.preserveAspectRatio !== false ? 1 : 0;

  // OSC 1337 ; File=[params]:BASE64 ST
  // ST = BEL (\x07) for maximum compatibility
  return `\x1b]1337;File=inline=1;size=${size};name=${name};width=${width};height=${height};preserveAspectRatio=${preserveAspect}:${base64}\x07`;
}

// ─── Source Loaders ─────────────────────────────────────────────────────────

async function loadFromFile(filePath: string): Promise<Buffer> {
  const data = await readFile(filePath);
  return Buffer.from(data);
}

async function loadFromUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const request = net.request(url);
    const chunks: Buffer[] = [];
    let totalSize = 0;

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} fetching image`));
        return;
      }
      response.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > MAX_IMAGE_SIZE) {
          request.abort();
          reject(new Error(`Image exceeds ${MAX_IMAGE_SIZE} byte limit`));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.end();
  });
}

// ─── Detect image format from magic bytes ───────────────────────────────────

function detectMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // GIF
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  // BMP
  if (buf[0] === 0x42 && buf[1] === 0x4d) return 'image/bmp';
  // WebP (RIFF....WEBP)
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return 'image/webp';
  // SVG (starts with < or whitespace+<)
  const head = buf.subarray(0, Math.min(256, buf.length)).toString('utf-8').trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'image/svg+xml';
  return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Write an inline image to a terminal PTY session.
 *
 * @param writeFn - Function that writes raw data to the PTY backend
 * @param source  - File path, URL (http/https), or raw Buffer
 * @param options - Display options (width, height, preserveAspectRatio)
 */
export async function writeTerminalImage(
  writeFn: (data: string) => void,
  source: string | Buffer,
  options: TerminalImageOptions = {},
): Promise<TerminalImageResult> {
  try {
    let data: Buffer;
    let filename = options.filename;

    if (Buffer.isBuffer(source)) {
      data = source;
    } else if (source.startsWith('http://') || source.startsWith('https://')) {
      data = await loadFromUrl(source);
      if (!filename) {
        try {
          filename = basename(new URL(source).pathname);
        } catch {
          /* use default */
        }
      }
    } else {
      data = await loadFromFile(source);
      if (!filename) filename = basename(source);
    }

    if (data.length === 0) {
      return { ok: false, error: 'Empty image data' };
    }
    if (data.length > MAX_IMAGE_SIZE) {
      return { ok: false, error: `Image size ${data.length} exceeds ${MAX_IMAGE_SIZE} byte limit` };
    }

    const mime = detectMime(data);
    if (!mime || !SUPPORTED_MIME.has(mime)) {
      return { ok: false, error: `Unsupported image format${mime ? `: ${mime}` : ''}` };
    }

    const seq = buildIipSequence(data, { ...options, filename });
    writeFn(seq);

    return { ok: true, bytesSent: data.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/**
 * Build an IIP sequence string from a Buffer without writing.
 * Useful for composing image output with other terminal content.
 */
export function buildTerminalImageSequence(data: Buffer, options: TerminalImageOptions = {}): string | null {
  if (data.length === 0 || data.length > MAX_IMAGE_SIZE) return null;
  const mime = detectMime(data);
  if (!mime || !SUPPORTED_MIME.has(mime)) return null;
  return buildIipSequence(data, options);
}
