import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createXenesisPaneAgentId,
  installXenesisDeskAgentBridge,
  registerXenesisAgentBridgeAgent,
} from './xenesisAgentBridgeRegistry';
import type { XenesisAgentState } from './xenesisAgentTypes';

function state(overrides: Partial<XenesisAgentState> = {}): XenesisAgentState {
  return {
    status: {
      ok: true,
      enabled: true,
      running: false,
      workspace: 'D:\\Workspace\\sample-app',
    } as XenesisAgentState['status'],
    prompt: '',
    mode: 'chat',
    loading: false,
    running: false,
    error: '',
    messages: [],
    rawStream: [],
    policyNotices: [],
    policySnapshot: null,
    rawStreamOpen: false,
    rawStreamFocusId: '',
    activeSessionId: '',
    statusBarKeys: [],
    ...overrides,
  };
}

test('createXenesisPaneAgentId produces stable xenis-prefixed ids', () => {
  assert.equal(createXenesisPaneAgentId('xenesis-desk 123'), 'xenis-xenesis-desk-123');
  assert.equal(createXenesisPaneAgentId('xenis-custom'), 'xenis-custom');
});

test('registry lists agents and exposes final assistant events only', async () => {
  const target: { __xenesisDeskAgentBridge?: ReturnType<typeof installXenesisDeskAgentBridge> } = {};
  installXenesisDeskAgentBridge(target as never);
  const unregister = registerXenesisAgentBridgeAgent({
    agentId: 'xenis-agent-a',
    title: 'Xenesis Agent',
    provider: 'Codex CLI',
    getSnapshot: () =>
      state({
        messages: [
          {
            id: 'assistant-2',
            at: '2026-06-21T01:00:03.000Z',
            role: 'assistant',
            content: 'Final answer',
            streaming: false,
          },
          { id: 'assistant-1', at: '2026-06-21T01:00:02.000Z', role: 'assistant', content: 'Draft', streaming: true },
          { id: 'user-1', at: '2026-06-21T01:00:01.000Z', role: 'user', content: 'Question' },
        ],
      }),
    submitMessage: async () => undefined,
  });

  try {
    const bridge = target.__xenesisDeskAgentBridge!;
    assert.deepEqual(
      bridge.listAgents().map((agent) => agent.agentId),
      ['xenis-agent-a'],
    );
    const events = await bridge.listAgentEvents('xenis-agent-a');
    assert.equal(events.ok, true);
    assert.deepEqual(
      events.events.map((event) => event.text),
      ['Final answer'],
    );
  } finally {
    unregister();
  }
});

test('registry submitMessage routes text to the registered pane', async () => {
  const target: { __xenesisDeskAgentBridge?: ReturnType<typeof installXenesisDeskAgentBridge> } = {};
  installXenesisDeskAgentBridge(target as never);
  const submitted: string[] = [];
  const unregister = registerXenesisAgentBridgeAgent({
    agentId: 'xenis-agent-submit',
    getSnapshot: () => state(),
    submitMessage: async (text: string) => {
      submitted.push(text);
    },
  });

  try {
    const result = await target.__xenesisDeskAgentBridge!.submitAgentMessage('xenis-agent-submit', 'hello');
    assert.equal(result.ok, true);
    assert.deepEqual(submitted, ['hello']);
  } finally {
    unregister();
  }
});
