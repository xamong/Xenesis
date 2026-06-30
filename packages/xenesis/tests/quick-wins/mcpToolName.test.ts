import { describe, expect, it } from 'vitest';
import { dedupeToolName, sanitizeMcpToolName } from '../../src/extensions/mcp.js';

describe('MCP tool-name safety', () => {
  it('truncates to <=64 chars', () => {
    const long = sanitizeMcpToolName('server', 'x'.repeat(200));
    expect(long.length).toBeLessThanOrEqual(64);
  });
  it('dedupes collisions deterministically and stays <=64', () => {
    const taken = new Set<string>();
    const a = dedupeToolName('mcp__s__tool', taken);
    taken.add(a);
    const b = dedupeToolName('mcp__s__tool', taken);
    taken.add(b);
    expect(a).not.toBe(b);
    expect(b.length).toBeLessThanOrEqual(64);
  });
  it('keeps two distinct long tool names distinct after truncation, each <=64', () => {
    // Both names share the same first 56 chars after the mcp__s__ prefix, so a
    // naive truncate-to-64 would collide. The hash suffix derives from the full
    // distinct name, so the results must stay distinct.
    const a = sanitizeMcpToolName('s', 'a' + 'x'.repeat(200));
    const b = sanitizeMcpToolName('s', 'b' + 'x'.repeat(200));
    expect(a.length).toBeLessThanOrEqual(64);
    expect(b.length).toBeLessThanOrEqual(64);
    expect(a).not.toBe(b);
  });
  it('returns an exact-64-char name unchanged (no spurious suffix)', () => {
    // mcp__ (5) + s (1) + __ (2) = 8 chars of fixed prefix; 56-char tool => 64.
    const tool = 'x'.repeat(56);
    const name = sanitizeMcpToolName('s', tool);
    expect(name).toBe(`mcp__s__${tool}`);
    expect(name.length).toBe(64);
  });
});
