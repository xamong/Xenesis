/**
 * Gateway security and rate-limiting middleware.
 *
 * These are designed to be applied to the Xenesis Gateway Express app.
 * Import and call applyGatewayMiddleware(app) after the app is created.
 *
 * Sprint 0-3: rate-limiter-flexible
 * Sprint 0-4: helmet + cors
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

let helmetMiddleware: ((req: IncomingMessage, res: ServerResponse, next: () => void) => void) | null = null;
let corsMiddleware: ((req: IncomingMessage, res: ServerResponse, next: () => void) => void) | null = null;
let rateLimiter: { consume: (key: string) => Promise<unknown> } | null = null;

async function loadHelmet() {
  try {
    const helmet = await import('helmet');
    return helmet.default();
  } catch {
    return null;
  }
}

async function loadCors() {
  try {
    const cors = await import('cors');
    return cors.default({ origin: true, credentials: true });
  } catch {
    return null;
  }
}

async function loadRateLimiter() {
  try {
    const { RateLimiterMemory } = await import('rate-limiter-flexible');
    return new RateLimiterMemory({
      points: 60,
      duration: 60,
    });
  } catch {
    return null;
  }
}

export async function initGatewayMiddleware() {
  helmetMiddleware = await loadHelmet();
  corsMiddleware = await loadCors();
  rateLimiter = await loadRateLimiter();
}

export function applyHelmet(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (helmetMiddleware) helmetMiddleware(req, res, next);
  else next();
}

export function applyCors(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (corsMiddleware) corsMiddleware(req, res, next);
  else next();
}

export async function applyRateLimit(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (!rateLimiter) return true;
  const key = (req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  try {
    await rateLimiter.consume(key);
    return true;
  } catch {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
    res.end(JSON.stringify({ error: 'Too many requests', retryAfterSeconds: 60 }));
    return false;
  }
}
