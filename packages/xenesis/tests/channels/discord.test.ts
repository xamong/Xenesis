import { describe, expect, test } from 'vitest';
import { DiscordAdapter } from '../../src/channels/index.js';

type FetchCall = { url: string; headers?: Record<string, string>; body?: unknown };

function fakeFetch(status = 200) {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (input: string | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    return new Response(JSON.stringify({ ok: status >= 200 && status < 300 }), { status });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

class FakeWebSocket {
  send() {}
  close() {}
  addEventListener() {}
}

describe('DiscordAdapter rich rendering', () => {
  test('sendMessage uses Discord Markdown rendering when provided', async () => {
    const { calls, fetchImpl } = fakeFetch();
    const adapter = new DiscordAdapter({
      botToken: 'discord-token',
      allowedChannelIds: ['100'],
      fetchImpl,
      webSocketFactory: () => new FakeWebSocket(),
    });

    await adapter.sendMessage('100', {
      text: '1. term-alp · PowerShell <Main>',
      rendering: { discordMarkdown: '1. **term-alp** · PowerShell <Main>' },
      actions: [{ label: 'Attach 1', value: '/desk attach 1' }],
    });

    expect(calls[0]).toMatchObject({
      url: 'https://discord.com/api/v10/channels/100/messages',
      body: {
        content: '1. **term-alp** · PowerShell <Main>',
        components: [
          {
            type: 1,
            components: [{ type: 2, style: 1, label: 'Attach 1', custom_id: '/desk attach 1' }],
          },
        ],
      },
    });
  });

  test('sendMessage splits long Discord Markdown content and keeps buttons on the final chunk', async () => {
    const { calls, fetchImpl } = fakeFetch();
    const adapter = new DiscordAdapter({
      botToken: 'discord-token',
      allowedChannelIds: ['100'],
      fetchImpl,
      webSocketFactory: () => new FakeWebSocket(),
    });
    const markdown = `${'x'.repeat(2000)}tail`;

    await adapter.sendMessage('100', {
      text: 'plain fallback',
      rendering: { discordMarkdown: markdown },
      actions: [{ label: 'Attach 1', value: '/desk attach 1' }],
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      url: 'https://discord.com/api/v10/channels/100/messages',
      body: { content: 'x'.repeat(2000) },
    });
    expect((calls[0].body as { components?: unknown }).components).toBeUndefined();
    expect(calls[1]).toMatchObject({
      url: 'https://discord.com/api/v10/channels/100/messages',
      body: {
        content: 'tail',
        components: [
          {
            type: 1,
            components: [{ type: 2, style: 1, label: 'Attach 1', custom_id: '/desk attach 1' }],
          },
        ],
      },
    });
  });

  test('sendMessage keeps Discord Markdown surrogate pairs on one chunk boundary', async () => {
    const { calls, fetchImpl } = fakeFetch();
    const adapter = new DiscordAdapter({
      botToken: 'discord-token',
      allowedChannelIds: ['100'],
      fetchImpl,
      webSocketFactory: () => new FakeWebSocket(),
    });
    const markdown = `${'x'.repeat(1999)}😀tail`;

    await adapter.sendMessage('100', {
      text: 'plain fallback',
      rendering: { discordMarkdown: markdown },
      actions: [{ label: 'Attach 1', value: '/desk attach 1' }],
    });

    const firstContent = (calls[0].body as { content: string }).content;
    const secondContent = (calls[1].body as { content: string }).content;
    expect(firstContent).not.toMatch(/[\uD800-\uDBFF]$/);
    expect(secondContent).not.toMatch(/^[\uDC00-\uDFFF]/);
    expect(secondContent).toBe('😀tail');
  });
});
