import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export function coerceToolArguments(raw: unknown, _schema?: z.ZodType): Record<string, unknown> {
  if (raw === null || raw === undefined) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t === '') return {};
    try {
      const p = JSON.parse(t);
      return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
    } catch {
      return salvagePartialJson(t) ?? {};
    }
  }
  return {}; // arrays / primitives are not an args object; schema will report what is required
}

function salvagePartialJson(s: string): Record<string, unknown> | undefined {
  if (!s.startsWith('{')) return undefined;
  for (let close = 1; close <= 5; close++) {
    try {
      const p = JSON.parse(s + '}'.repeat(close));
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      /* try more closes */
    }
  }
  return undefined;
}

export function buildSchemaGuidance(
  error: z.ZodError,
  schema: z.ZodType,
  received: unknown,
): { issues: string[]; schemaFragment: unknown; received: unknown } {
  const issues = error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
  let schemaFragment: unknown;
  try {
    schemaFragment = zodToJsonSchema(schema);
  } catch {
    schemaFragment = undefined;
  }
  let receivedOut: unknown = received;
  try {
    const s = JSON.stringify(received);
    if (s && s.length > 800) receivedOut = s.slice(0, 800) + '…';
  } catch {
    receivedOut = String(received);
  }
  return { issues, schemaFragment, received: receivedOut };
}
