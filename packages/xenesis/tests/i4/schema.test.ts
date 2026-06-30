import { describe, expect, it } from 'vitest';
import { mcpServerConfigSchema } from '../../src/config/loadConfig.js';

describe('mcpServerConfigSchema', () => {
  it("parses a legacy stdio entry without a type field (back-compat) -> type:'stdio'", () => {
    const parsed = mcpServerConfigSchema.parse({ command: 'node', args: ['x.js'], env: { A: '1' } });
    expect(parsed).toEqual({ type: 'stdio', command: 'node', args: ['x.js'], env: { A: '1' } });
  });
  it('defaults args/env for a bare stdio command', () => {
    const parsed = mcpServerConfigSchema.parse({ command: 'node' }) as { type: string; args: unknown[]; env: object };
    expect(parsed.type).toBe('stdio');
    expect(parsed.args).toEqual([]);
    expect(parsed.env).toEqual({});
  });
  it('parses an explicit stdio entry', () => {
    const parsed = mcpServerConfigSchema.parse({ type: 'stdio', command: 'node' }) as { type: string };
    expect(parsed.type).toBe('stdio');
  });
  it('parses an http entry with url + optional headers', () => {
    const parsed = mcpServerConfigSchema.parse({
      type: 'http',
      url: 'https://h/mcp',
      headers: { Authorization: 'Bearer x' },
    }) as { type: string; url: string };
    expect(parsed.type).toBe('http');
    expect(parsed.url).toBe('https://h/mcp');
  });
  it('rejects an http entry with no url', () => {
    expect(() => mcpServerConfigSchema.parse({ type: 'http' })).toThrow();
  });
  it('rejects an http entry with a non-url string', () => {
    expect(() => mcpServerConfigSchema.parse({ type: 'http', url: 'not-a-url' })).toThrow();
  });
  it('rejects an unknown transport type', () => {
    expect(() => mcpServerConfigSchema.parse({ type: 'ws', url: 'wss://h' })).toThrow();
  });
});
