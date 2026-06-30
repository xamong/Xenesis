import { describe, expect, it } from 'vitest';
import { RemoteDeskSessionManager } from '../../src/remoteDesk/sessionManager.js';
import type { RemoteDeskBridge, RemoteDeskCommandResponse } from '../../src/remoteDesk/types.js';

// A fake bridge that returns a fixed terminal list for xd.terminals.list.
// This exercises terminals() (which caches lastTerminals on the session) and
// then attach() (which resolves the selector via resolveTerminalSelector).
function makeManager(terminalIds: string[]) {
  const bridge: RemoteDeskBridge = {
    async callCapability(path: string) {
      if (path === 'xd.terminals.list') {
        return {
          ok: true,
          sessions: terminalIds.map((id, index) => ({
            id,
            title: `terminal ${index + 1}`,
            cwd: `/work/${id}`,
            active: index === 0,
          })),
        };
      }
      return { ok: true };
    },
  };
  return new RemoteDeskSessionManager({ bridge });
}

function responseText(response: RemoteDeskCommandResponse): string {
  return typeof response === 'string' ? response : response.text;
}

const CONV = 'conv-1';

async function listThenAttach(manager: RemoteDeskSessionManager, selector: string): Promise<RemoteDeskCommandResponse> {
  // Populate session.lastTerminals first.
  await manager.handle({ conversationId: CONV, text: '/desk terminals' });
  return manager.handle({ conversationId: CONV, text: `/desk attach ${selector}` });
}

describe('resolveTerminalSelector (via RemoteDeskSessionManager attach)', () => {
  it('resolves by list number', async () => {
    const manager = makeManager(['term-alpha-001', 'term-beta-002', 'term-gamma-003']);
    const response = await listThenAttach(manager, '2');
    expect(responseText(response)).toBe('Attached to terminal term-beta-002.');
  });

  it('resolves by full id', async () => {
    const manager = makeManager(['term-alpha-001', 'term-beta-002', 'term-gamma-003']);
    const response = await listThenAttach(manager, 'term-gamma-003');
    expect(responseText(response)).toBe('Attached to terminal term-gamma-003.');
  });

  it('resolves by unique non-numeric suffix', async () => {
    const manager = makeManager(['term-alpha-aaa', 'term-beta-bbb', 'term-gamma-ccc']);
    const response = await listThenAttach(manager, 'bbb');
    expect(responseText(response)).toBe('Attached to terminal term-beta-bbb.');
  });

  it('reports an ambiguous suffix instead of attaching', async () => {
    const manager = makeManager(['term-one-shared', 'term-two-shared']);
    const response = await listThenAttach(manager, 'shared');
    expect(responseText(response)).toContain('ambiguous');
  });

  it('errors on a single-digit out-of-range list number', async () => {
    const manager = makeManager(['term-alpha-001', 'term-beta-002']);
    const response = await listThenAttach(manager, '9');
    expect(responseText(response)).toContain('No terminal list item 9 is available');
  });

  it('falls back to the raw selector when nothing matches (multi-char id)', async () => {
    const manager = makeManager(['term-alpha-001', 'term-beta-002']);
    const response = await listThenAttach(manager, 'term-unknown-999');
    expect(responseText(response)).toBe('Attached to terminal term-unknown-999.');
  });
});
