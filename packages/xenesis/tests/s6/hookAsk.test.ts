import { describe, expect, it } from 'vitest';
import { HookRegistry } from '../../src/hooks/HookRegistry.js';

const payload = { toolName: 'shell', toolInput: { cmd: 'rm -rf x' }, isReadOnly: false, isMutation: true };

describe('HookRegistry ask (S6)', () => {
  it('returns a real ask decision (no longer promoted to allow)', async () => {
    const r = new HookRegistry();
    r.register({
      event: 'pre_tool_use',
      handler: () => ({
        decision: 'ask',
        title: 'Confirm rm',
        severity: 'critical',
        allowedDecisions: ['approve', 'deny'],
      }),
    });
    const d = await r.runPreToolUse(payload);
    expect(d.decision).toBe('ask');
    expect((d as any).title).toBe('Confirm rm');
    expect((d as any).severity).toBe('critical');
  });
  it('block beats ask', async () => {
    const r = new HookRegistry();
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'ask' }) });
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'block', reason: 'no' }) });
    expect((await r.runPreToolUse(payload)).decision).toBe('block');
  });
  it('ask beats modify/allow', async () => {
    const r = new HookRegistry();
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'modify', modifiedArgs: { cmd: 'ls' } }) });
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'ask' }) });
    expect((await r.runPreToolUse(payload)).decision).toBe('ask');
  });
});
