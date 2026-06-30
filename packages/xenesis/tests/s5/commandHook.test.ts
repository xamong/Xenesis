import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type {
  BlockingHookHandler,
  PreToolUseDecision,
  PreToolUsePayload,
  StopDecision,
  StopPayload,
} from '../../src/hooks/blocking.js';
import { createCommandHookHandler } from '../../src/hooks/CommandHookHandler.js';

// Contract gate (compile-time only): the per-event result must be assignable
// to its typed BlockingHookHandler registration slot WITHOUT an `as any` cast.
// Param contravariance (PreToolUsePayload/StopPayload, no index signature) and
// return-type narrowing (pre -> PreToolUseDecision, stop -> StopDecision) must
// both hold. If the adapter regresses to Record<string,unknown> params or a
// widened return union, this stops compiling and `npx tsc --noEmit` fails.
const _preReg: BlockingHookHandler<PreToolUsePayload, PreToolUseDecision> = createCommandHookHandler(
  { command: 'true' },
  'pre_tool_use',
  { commandTimeoutMs: 1000 },
);
const _stopReg: BlockingHookHandler<StopPayload, StopDecision> = createCommandHookHandler({ command: 'true' }, 'stop', {
  commandTimeoutMs: 1000,
});
void _preReg;
void _stopReg;

// ESM: __dirname is undefined under this package's NodeNext/vitest config, so
// resolve fixtures relative to import.meta.url (per plan NOTE for ESM packages).
const fixturePath = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const fix = (name: string) => `"${process.execPath}" "${fixturePath(name)}"`;

const payload = {
  toolName: 'shell',
  toolInput: { cmd: 'ls' },
  isReadOnly: true,
  isMutation: false,
};
const defaults = { commandTimeoutMs: 3000 };

describe('createCommandHookHandler (pre_tool_use)', () => {
  it('stdout {decision:block} -> block', async () => {
    const h = createCommandHookHandler({ command: fix('hook-block.mjs') }, 'pre_tool_use', defaults);
    const d = (await h(payload)) as Extract<PreToolUseDecision, { decision: 'block' }>;
    expect(d.decision).toBe('block');
    expect(d.reason).toContain('blocked by fixture');
  });

  it('stdout {decision:allow} -> allow', async () => {
    const h = createCommandHookHandler({ command: fix('hook-allow.mjs') }, 'pre_tool_use', defaults);
    expect((await h(payload)).decision).toBe('allow');
  });

  it('non-zero exit -> block (explicit)', async () => {
    const h = createCommandHookHandler({ command: fix('hook-exit1.mjs') }, 'pre_tool_use', defaults);
    expect((await h(payload)).decision).toBe('block');
  });

  it('timeout -> fail-open allow', async () => {
    const h = createCommandHookHandler({ command: fix('hook-sleep.mjs'), timeoutMs: 300 }, 'pre_tool_use', defaults);
    expect((await h(payload)).decision).toBe('allow');
  }, 10000);

  // A missing binary invoked THROUGH the shell (shell:true) is reported by the
  // shell as a non-zero exit (command-not-found), not a spawn failure. Per the
  // design's explicit-block policy, a non-zero exit code is a BLOCK, not an
  // infra failure. (The original plan expectation assumed spawn() throws here,
  // which is not how shell:true behaves on Windows/posix.)
  it('missing binary via shell (non-zero exit) -> block (explicit)', async () => {
    const h = createCommandHookHandler({ command: '"definitely-not-a-real-binary-xyz" --x' }, 'pre_tool_use', defaults);
    expect((await h(payload)).decision).toBe('block');
  });

  // A genuine spawn failure (spawn() throws synchronously, e.g. an invalid
  // command argument) must fail open to allow per the infra-failure policy.
  it('spawn failure (spawn throws) -> fail-open allow', async () => {
    const h = createCommandHookHandler({ command: '' }, 'pre_tool_use', defaults);
    expect((await h(payload)).decision).toBe('allow');
  });

  it('hermes {action:block, message} shape normalizes -> block', async () => {
    const h = createCommandHookHandler({ command: fix('hook-hermes-block.mjs') }, 'pre_tool_use', defaults);
    const d = (await h(payload)) as Extract<PreToolUseDecision, { decision: 'block' }>;
    expect(d.decision).toBe('block');
    expect(d.reason).toContain('hermes blocked');
  });

  it('modify shape -> modify with modifiedArgs', async () => {
    const h = createCommandHookHandler({ command: fix('hook-modify.mjs') }, 'pre_tool_use', defaults);
    const d = (await h(payload)) as Extract<PreToolUseDecision, { decision: 'modify' }>;
    expect(d.decision).toBe('modify');
    expect(d.modifiedArgs).toEqual({ cmd: 'safe-ls' });
  });

  it('empty stdout, exit 0 -> allow', async () => {
    const h = createCommandHookHandler({ command: fix('hook-empty.mjs') }, 'pre_tool_use', defaults);
    expect((await h(payload)).decision).toBe('allow');
  });
});

describe('createCommandHookHandler (stop)', () => {
  const stopPayload = { stopHookActive: false, continuationCount: 0 };

  it('stdout {decision:block} -> block-stop with reason as continuePrompt', async () => {
    const h = createCommandHookHandler({ command: fix('hook-block.mjs') }, 'stop', defaults);
    const d = (await h(stopPayload)) as Extract<StopDecision, { decision: 'block-stop' }>;
    expect(d.decision).toBe('block-stop');
    expect(d.continuePrompt).toContain('blocked by fixture');
  });

  it('non-zero exit -> block-stop (explicit)', async () => {
    const h = createCommandHookHandler({ command: fix('hook-exit1.mjs') }, 'stop', defaults);
    expect((await h(stopPayload)).decision).toBe('block-stop');
  });

  it('stdout {decision:allow} -> allow-stop', async () => {
    const h = createCommandHookHandler({ command: fix('hook-allow.mjs') }, 'stop', defaults);
    expect((await h(stopPayload)).decision).toBe('allow-stop');
  });

  it('timeout -> fail-open allow-stop', async () => {
    const h = createCommandHookHandler({ command: fix('hook-sleep.mjs'), timeoutMs: 300 }, 'stop', defaults);
    expect((await h(stopPayload)).decision).toBe('allow-stop');
  }, 10000);
});
