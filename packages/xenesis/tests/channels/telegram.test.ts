import { describe, expect, test } from 'vitest';
import { TelegramAdapter } from '../../src/channels/telegram.js';
import type { ChannelMessage } from '../../src/channels/types.js';

interface FetchCall {
  url: string;
  method?: string;
  body?: unknown;
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}

function telegramUpdate(updateId: number, chatId: number, text: string) {
  return {
    update_id: updateId,
    message: { chat: { id: chatId }, from: { id: chatId }, text },
  };
}

function fakeTelegramFetch(updates: unknown[][], options: { username?: string; setMyCommandsResponse?: unknown } = {}) {
  const calls: FetchCall[] = [];
  let updateIndex = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ url, method: init?.method, body });
    if (url.includes('/getMe')) {
      return jsonResponse({ ok: true, result: { username: options.username ?? 'XenesisBot' } });
    }
    if (url.includes('/setMyCommands')) {
      return jsonResponse(options.setMyCommandsResponse ?? { ok: true, result: true });
    }
    if (url.includes('/getUpdates')) {
      const result = updates[updateIndex] ?? [];
      updateIndex += 1;
      return jsonResponse({ ok: true, result });
    }
    if (url.includes('/sendMessage') || url.includes('/answerCallbackQuery') || url.includes('/sendChatAction')) {
      return jsonResponse({ ok: true, result: true });
    }
    return jsonResponse({ ok: true, result: true });
  };
  return { calls, fetchImpl };
}

async function waitFor(assertion: () => void | boolean, timeoutMs = 1000) {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const value = assertion();
      if (value !== false) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (lastError) throw lastError;
  throw new Error('Timed out waiting for condition.');
}

describe('TelegramAdapter command surface', () => {
  test('registers Telegram bot commands before polling', async () => {
    const { calls, fetchImpl } = fakeTelegramFetch([[]], { username: 'XenesisBot' });
    const adapter = new TelegramAdapter({
      token: 'tok',
      allowedChatIds: [100],
      fetchImpl,
      pollTimeoutSeconds: 0,
    });

    await adapter.start(async () => undefined);
    try {
      await waitFor(() => calls.some((call) => call.url.includes('/getUpdates')));
      expect(calls.find((call) => call.url.includes('/getMe'))?.method).toBe('GET');
      expect(calls.find((call) => call.url.includes('/setMyCommands'))?.body).toEqual({
        commands: [
          { command: 'help', description: 'Show available commands' },
          { command: 'status', description: 'Show session info' },
          { command: 'new', description: 'Start a new session' },
          { command: 'stop', description: 'Stop active channel work' },
          { command: 'desk', description: 'Open Desk menu' },
          { command: 'terminals', description: 'List Desk terminals' },
          { command: 'agents', description: 'List Xenesis Agents' },
          { command: 'detach', description: 'Detach current Desk target' },
        ],
      });
    } finally {
      await adapter.stop();
    }
  });

  test('logs setMyCommands failures and still polls', async () => {
    const logs: string[] = [];
    const { calls, fetchImpl } = fakeTelegramFetch([[]], {
      username: 'XenesisBot',
      setMyCommandsResponse: { ok: false, description: 'bad commands' },
    });
    const adapter = new TelegramAdapter({
      token: 'tok',
      allowedChatIds: [100],
      fetchImpl,
      pollTimeoutSeconds: 0,
      logger: (message) => logs.push(message),
    });

    await adapter.start(async () => undefined);
    try {
      await waitFor(() => calls.some((call) => call.url.includes('/getUpdates')));
      expect(logs.some((message) => message.includes('setMyCommands failed') && message.includes('bad commands'))).toBe(
        true,
      );
    } finally {
      await adapter.stop();
    }
  });

  test('ignores commands addressed to another Telegram bot', async () => {
    const { calls, fetchImpl } = fakeTelegramFetch([[telegramUpdate(1, 100, '/stop@OtherBot')], []], {
      username: 'XenesisBot',
    });
    const received: ChannelMessage[] = [];
    const adapter = new TelegramAdapter({
      token: 'tok',
      allowedChatIds: [100],
      fetchImpl,
      pollTimeoutSeconds: 0,
    });

    await adapter.start(async (message) => {
      received.push(message);
    });
    try {
      await waitFor(() => calls.filter((call) => call.url.includes('/getUpdates')).length >= 2);
      expect(received).toEqual([]);
    } finally {
      await adapter.stop();
    }
  });

  test('passes addressed commands for this bot with botUsername metadata', async () => {
    const { fetchImpl } = fakeTelegramFetch([[telegramUpdate(1, 100, '/terminals@XenesisBot')], []], {
      username: 'XenesisBot',
    });
    const received: ChannelMessage[] = [];
    const adapter = new TelegramAdapter({
      token: 'tok',
      allowedChatIds: [100],
      fetchImpl,
      pollTimeoutSeconds: 0,
    });

    await adapter.start(async (message) => {
      received.push(message);
    });
    try {
      await waitFor(() => received.length === 1);
      expect(received[0]).toMatchObject({
        conversationId: '100',
        senderId: '100',
        text: '/terminals@XenesisBot',
        botUsername: 'XenesisBot',
      });
    } finally {
      await adapter.stop();
    }
  });

  test('keeps inline keyboard action rendering', async () => {
    const { calls, fetchImpl } = fakeTelegramFetch([], { username: 'XenesisBot' });
    const adapter = new TelegramAdapter({
      token: 'tok',
      allowedChatIds: [100],
      fetchImpl,
    });

    await adapter.sendMessage('100', {
      text: 'Menu',
      actions: [{ label: 'Terminals', value: '/desk terminals' }],
    });

    const call = calls.find((item) => item.url.includes('/sendMessage'));
    expect(call?.body).toEqual({
      chat_id: 100,
      text: 'Menu',
      reply_markup: {
        inline_keyboard: [[{ text: 'Terminals', callback_data: '/desk terminals' }]],
      },
    });
  });
});
