import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildSchemaGuidance, coerceToolArguments } from '../../src/providers/toolArgCoercion.js';

describe('coerceToolArguments', () => {
  it('parses string-encoded JSON to an object', () => {
    expect(coerceToolArguments('{"a":1}')).toEqual({ a: 1 });
  });
  it('returns {} for empty/null (no-parameter sentinel)', () => {
    expect(coerceToolArguments('')).toEqual({});
    expect(coerceToolArguments(null)).toEqual({});
    expect(coerceToolArguments(undefined)).toEqual({});
  });
  it('passes objects through and never fabricates fields', () => {
    expect(coerceToolArguments({ a: 1 })).toEqual({ a: 1 });
    expect(coerceToolArguments({})).toEqual({});
  });
  it('salvages truncated JSON or returns {}', () => {
    const r = coerceToolArguments('{"a":1');
    expect(typeof r).toBe('object');
  });
  it('does NOT inject schema defaults (the later safeParse does)', () => {
    const schema = z.object({ a: z.number().default(5) });
    expect(coerceToolArguments('{}', schema)).toEqual({}); // no a:5 here
    expect(schema.parse(coerceToolArguments('{}', schema))).toEqual({ a: 5 }); // safeParse applies it
  });
});

describe('buildSchemaGuidance', () => {
  it('returns issues + schema fragment + received', () => {
    const schema = z.object({ a: z.number() });
    const parsed = schema.safeParse({ a: 'x' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const g = buildSchemaGuidance(parsed.error, schema, { a: 'x' });
      expect(Array.isArray(g.issues)).toBe(true);
      expect(g.issues.length).toBeGreaterThan(0);
      expect(g.issues[0]).toContain('a');
      expect(g.schemaFragment).toBeTruthy();
    }
  });
});
