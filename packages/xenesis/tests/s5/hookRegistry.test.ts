import { describe, expect, it } from 'vitest';
import type { PreToolUseDecision, StopDecision } from '../../src/hooks/blocking.js';
import { HookRegistry } from '../../src/hooks/HookRegistry.js';

const payload = { toolName: 'shell', toolInput: { cmd: 'ls' }, isReadOnly: true, isMutation: false };

describe('HookRegistry PreToolUse', () => {
  it('returns allow with no handlers', async () => {
    const r = new HookRegistry();
    expect((await r.runPreToolUse(payload)).decision).toBe('allow');
  });

  it('block short-circuits and wins over a later modify (most-restrictive)', async () => {
    const r = new HookRegistry();
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'block', reason: 'no' }) });
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'modify', modifiedArgs: { cmd: 'x' } }) });
    const d = await r.runPreToolUse(payload);
    expect(d.decision).toBe('block');
  });

  it('last modify wins when no block', async () => {
    const r = new HookRegistry();
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'modify', modifiedArgs: { cmd: 'a' } }) });
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'modify', modifiedArgs: { cmd: 'b' } }) });
    const d = (await r.runPreToolUse(payload)) as Extract<PreToolUseDecision, { decision: 'modify' }>;
    expect(d.decision).toBe('modify');
    expect(d.modifiedArgs).toEqual({ cmd: 'b' });
  });

  it('toolNamePattern skips non-matching handlers', async () => {
    const r = new HookRegistry();
    r.register({
      event: 'pre_tool_use',
      toolNamePattern: '^write$',
      handler: () => ({ decision: 'block', reason: 'no' }),
    });
    expect((await r.runPreToolUse(payload)).decision).toBe('allow'); // payload.toolName === "shell"
  });

  it('a throwing handler is fail-open (allow)', async () => {
    const r = new HookRegistry();
    r.register({
      event: 'pre_tool_use',
      handler: () => {
        throw new Error('boom');
      },
    });
    expect((await r.runPreToolUse(payload)).decision).toBe('allow');
  });

  it('ask returns the real ask decision (no longer promoted to allow)', async () => {
    const r = new HookRegistry();
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'ask', reason: 'later' }) });
    const d = (await r.runPreToolUse(payload)) as Extract<PreToolUseDecision, { decision: 'ask' }>;
    expect(d.decision).toBe('ask');
    expect(d.reason).toBe('later');
  });

  it('ask wins over a later modify (precedence: ask > modify)', async () => {
    const r = new HookRegistry();
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'ask', reason: 'confirm' }) });
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'modify', modifiedArgs: { cmd: 'x' } }) });
    expect((await r.runPreToolUse(payload)).decision).toBe('ask');
  });

  it('first ask wins when multiple handlers ask', async () => {
    const r = new HookRegistry();
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'ask', reason: 'first' }) });
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'ask', reason: 'second' }) });
    const d = (await r.runPreToolUse(payload)) as Extract<PreToolUseDecision, { decision: 'ask' }>;
    expect(d.reason).toBe('first');
  });

  it('block still short-circuits and wins over a later ask (most-restrictive)', async () => {
    const r = new HookRegistry();
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'block', reason: 'no' }) });
    r.register({ event: 'pre_tool_use', handler: () => ({ decision: 'ask', reason: 'later' }) });
    expect((await r.runPreToolUse(payload)).decision).toBe('block');
  });
});

describe('HookRegistry Stop', () => {
  const sp = { stopHookActive: false, continuationCount: 0 };
  it('allow-stop with no handlers', async () => {
    expect((await new HookRegistry().runStop(sp)).decision).toBe('allow-stop');
  });
  it('first block-stop wins', async () => {
    const r = new HookRegistry();
    r.register({ event: 'stop', handler: () => ({ decision: 'block-stop', continuePrompt: 'keep going' }) });
    const d = (await r.runStop(sp)) as Extract<StopDecision, { decision: 'block-stop' }>;
    expect(d.decision).toBe('block-stop');
    expect(d.continuePrompt).toBe('keep going');
  });
  it('throwing stop handler is fail-open (allow-stop)', async () => {
    const r = new HookRegistry();
    r.register({
      event: 'stop',
      handler: () => {
        throw new Error('x');
      },
    });
    expect((await r.runStop(sp)).decision).toBe('allow-stop');
  });
});
