import { describe, expect, test } from 'vitest';
import { ChannelManager, type ChannelSessionStore } from '../../src/channels/index.js';
import type { ChannelAdapter, ChannelMessageHandler, ChannelOutgoingMessage } from '../../src/channels/types.js';

class MemorySessionStore implements ChannelSessionStore {
  private readonly values = new Map<string, string>();

  async get(key: string) {
    return this.values.get(key);
  }

  async set(key: string, sessionId: string) {
    this.values.set(key, sessionId);
  }

  async clear(key: string) {
    this.values.delete(key);
  }
}

class FakeAdapter implements ChannelAdapter {
  readonly name = 'fake';
  handler?: ChannelMessageHandler;
  readonly sent: string[] = [];
  readonly richSent: ChannelOutgoingMessage[] = [];

  async start(onMessage: ChannelMessageHandler) {
    this.handler = onMessage;
  }

  async stop() {
    this.handler = undefined;
  }

  async send(_conversationId: string, text: string) {
    this.sent.push(text);
  }

  async sendMessage(_conversationId: string, message: ChannelOutgoingMessage) {
    this.richSent.push(message);
  }
}

describe('ChannelManager command surface routing', () => {
  test('handles /help, /desk, and /desk menu before agent execution', async () => {
    const adapter = new FakeAdapter();
    const prompts: string[] = [];
    const manager = new ChannelManager({
      adapter,
      sessionStore: new MemorySessionStore(),
      runPrompt: async (request) => {
        prompts.push(request.prompt);
        return { content: 'agent handled' };
      },
    });
    await manager.start();

    await adapter.handler!({ conversationId: '100', senderId: '100', text: '/help' });
    await adapter.handler!({ conversationId: '100', senderId: '100', text: '/desk' });
    await adapter.handler!({ conversationId: '100', senderId: '100', text: '/desk menu' });

    expect(prompts).toEqual([]);
    expect(adapter.richSent.map((message) => message.text)).toEqual([
      expect.stringContaining('/terminals - List Desk terminals'),
      expect.stringContaining('Xenesis Desk Menu'),
      expect.stringContaining('Xenesis Desk Menu'),
    ]);
    expect(adapter.richSent[1]?.actions).toEqual([
      { label: 'Terminals', value: '/desk terminals' },
      { label: 'Agents', value: '/desk agents' },
      { label: 'Desk Status', value: '/desk status' },
      { label: 'Detach', value: '/desk detach' },
    ]);
    await manager.stop();
  });

  test('normalizes short Desk aliases before command routers run', async () => {
    const adapter = new FakeAdapter();
    const handled: string[] = [];
    const prompts: string[] = [];
    const manager = new ChannelManager({
      adapter,
      sessionStore: new MemorySessionStore(),
      commandRouters: [
        {
          canHandle: (text) => text.startsWith('/desk'),
          handle: async ({ text }) => {
            handled.push(text);
            return 'desk handled';
          },
        },
      ],
      runPrompt: async (request) => {
        prompts.push(request.prompt);
        return { content: 'agent handled' };
      },
    });
    await manager.start();

    await adapter.handler!({ conversationId: '100', senderId: '100', text: '/terminals' });
    await adapter.handler!({ conversationId: '100', senderId: '100', text: '/agents' });
    await adapter.handler!({ conversationId: '100', senderId: '100', text: '/detach' });

    expect(handled).toEqual(['/desk terminals', '/desk agents', '/desk detach']);
    expect(prompts).toEqual([]);
    expect(adapter.sent).toEqual(['desk handled', 'desk handled', 'desk handled']);
    await manager.stop();
  });

  test('keeps ordinary natural language on the agent pipeline', async () => {
    const adapter = new FakeAdapter();
    const prompts: string[] = [];
    const manager = new ChannelManager({
      adapter,
      sessionStore: new MemorySessionStore(),
      runPrompt: async (request) => {
        prompts.push(request.prompt);
        return { content: 'agent reply' };
      },
    });
    await manager.start();

    await adapter.handler!({ conversationId: '100', senderId: '100', text: 'show me the current plan' });
    await manager.drain();

    expect(prompts).toEqual(['show me the current plan']);
    expect(adapter.sent).toEqual(['agent reply']);
    await manager.stop();
  });
});
