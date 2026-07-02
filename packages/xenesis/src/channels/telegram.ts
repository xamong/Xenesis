import { telegramBotCommandsFromSurface } from './commandSurface.js';
import type { ChannelSendLogEntry, ChannelSendLogger } from './sendLog.js';
import type { ChannelAdapter, ChannelMessageHandler, ChannelOutgoingMessage } from './types.js';

export interface TelegramAdapterOptions {
  token: string;
  allowedChatIds: number[];
  botUsername?: string;
  fetchImpl?: typeof fetch;
  pollTimeoutSeconds?: number;
  backoffMinMs?: number;
  backoffMaxMs?: number;
  logger?: (message: string) => void;
  sendLogger?: ChannelSendLogger;
}

const TELEGRAM_MESSAGE_LIMIT = 4096;

export function splitTelegramMessage(text: string): string[] {
  if (text.length === 0) return [''];
  const chunks: string[] = [];
  for (let offset = 0; offset < text.length; offset += TELEGRAM_MESSAGE_LIMIT) {
    chunks.push(text.slice(offset, offset + TELEGRAM_MESSAGE_LIMIT));
  }
  return chunks;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat?: { id?: number };
    from?: { id?: number };
    text?: string;
  };
  callback_query?: {
    id?: string;
    from?: { id?: number };
    message?: { chat?: { id?: number } };
    data?: string;
  };
}

export class TelegramAdapter implements ChannelAdapter {
  readonly name = 'telegram';
  private readonly fetchImpl: typeof fetch;
  private stopped = true;
  private offset = 0;
  private backoffMs = 0;
  private loop?: Promise<void>;
  private pollAbortController?: AbortController;
  private botUsername?: string;

  constructor(private readonly options: TelegramAdapterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.botUsername = options.botUsername;
  }

  async start(onMessage: ChannelMessageHandler): Promise<void> {
    if (!this.stopped) return;
    if (this.options.allowedChatIds.length === 0) {
      throw new Error('Telegram adapter requires a non-empty allowedChatIds allowlist.');
    }
    await this.resolveBotUsername();
    await this.registerBotCommands();
    this.stopped = false;
    this.loop = this.pollLoop(onMessage);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.pollAbortController?.abort();
    await this.loop?.catch(() => undefined);
  }

  async send(conversationId: string, text: string): Promise<void> {
    const chunks = splitTelegramMessage(text);
    for (const [index, chunk] of chunks.entries()) {
      let response: Response | undefined;
      try {
        response = await this.fetchImpl(this.api('sendMessage'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: Number(conversationId), text: chunk }),
        });
        this.logSend({
          conversationId,
          method: 'send',
          text: chunk,
          chunkIndex: index,
          chunkCount: chunks.length,
          ok: response.ok,
          status: response.status,
        });
        if (!response.ok) throw new Error(`sendMessage HTTP ${response.status}`);
      } catch (error) {
        if (!response) {
          this.logSend({
            conversationId,
            method: 'send',
            text: chunk,
            chunkIndex: index,
            chunkCount: chunks.length,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        throw error;
      }
    }
  }

  async sendMessage(conversationId: string, message: ChannelOutgoingMessage): Promise<void> {
    if (message.image?.data) {
      await this.sendImageMessage(conversationId, message);
      return;
    }

    const text = message.rendering?.telegramHtml ?? message.text;
    const parseMode = message.rendering?.telegramHtml ? 'HTML' : undefined;
    const chunks = splitTelegramMessage(text);
    const actions = message.actions ?? [];
    for (const [index, chunk] of chunks.entries()) {
      const attachActions = actions.length > 0 && index === chunks.length - 1;
      let response: Response | undefined;
      try {
        response = await this.fetchImpl(this.api('sendMessage'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: Number(conversationId),
            text: chunk,
            ...(parseMode ? { parse_mode: parseMode } : {}),
            ...(attachActions
              ? {
                  reply_markup: {
                    inline_keyboard: [
                      actions.map((action) => ({
                        text: action.label,
                        callback_data: action.value,
                      })),
                    ],
                  },
                }
              : {}),
          }),
        });
        this.logSend({
          conversationId,
          method: 'sendMessage',
          text: chunk,
          chunkIndex: index,
          chunkCount: chunks.length,
          ok: response.ok,
          status: response.status,
          actionCount: attachActions ? actions.length : 0,
        });
        if (!response.ok) throw new Error(`sendMessage HTTP ${response.status}`);
      } catch (error) {
        if (!response) {
          this.logSend({
            conversationId,
            method: 'sendMessage',
            text: chunk,
            chunkIndex: index,
            chunkCount: chunks.length,
            ok: false,
            actionCount: attachActions ? actions.length : 0,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        throw error;
      }
    }
  }

  private async sendImageMessage(conversationId: string, message: ChannelOutgoingMessage): Promise<void> {
    const image = message.image!;
    const caption = image.caption || message.text || '';
    const truncatedCaption = caption.length > 1024 ? `${caption.slice(0, 1021)}...` : caption;
    const filename = image.filename || 'image.png';
    const boundary = `----XenesisBoundary${Date.now()}`;
    const parts: (string | Buffer)[] = [];
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${Number(conversationId)}\r\n`);
    if (truncatedCaption) {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${truncatedCaption}\r\n`);
    }
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${filename}"\r\nContent-Type: ${image.mimeType || 'image/png'}\r\n\r\n`,
    );
    parts.push(image.data);
    parts.push(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat(parts.map((part) => (typeof part === 'string' ? Buffer.from(part, 'utf8') : part)));

    let response: Response | undefined;
    try {
      response = await this.fetchImpl(this.api('sendPhoto'), {
        method: 'POST',
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
        body: body as unknown as RequestInit['body'],
      });
      this.logSend({
        conversationId,
        method: 'sendPhoto',
        text: truncatedCaption,
        ok: response.ok,
        status: response.status,
      });
      if (!response.ok) throw new Error(`sendPhoto HTTP ${response.status}`);
    } catch (error) {
      if (!response) {
        this.logSend({
          conversationId,
          method: 'sendPhoto',
          text: truncatedCaption,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }

    if (caption.length > 1024) {
      await this.sendMessage(conversationId, { text: caption.slice(1024), actions: message.actions });
    } else if (message.actions && message.actions.length > 0) {
      await this.sendMessage(conversationId, { text: 'Options:', actions: message.actions });
    }
  }

  async notifyBusy(conversationId: string): Promise<void> {
    await this.fetchImpl(this.api('sendChatAction'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: Number(conversationId), action: 'typing' }),
    }).catch(() => undefined);
  }

  private api(method: string) {
    return `https://api.telegram.org/bot${this.options.token}/${method}`;
  }

  private log(message: string) {
    this.options.logger?.(message);
  }

  private logSend(entry: Omit<ChannelSendLogEntry, 'channel' | 'at'>) {
    try {
      this.options.sendLogger?.({
        channel: this.name,
        at: new Date().toISOString(),
        ...entry,
      });
    } catch {
      // Ignore diagnostic logger failures.
    }
  }

  private async pollLoop(onMessage: ChannelMessageHandler) {
    while (!this.stopped) {
      try {
        const timeout = this.options.pollTimeoutSeconds ?? 50;
        const url = `${this.api('getUpdates')}?timeout=${timeout}&offset=${this.offset}`;
        const controller = new AbortController();
        this.pollAbortController = controller;
        const response = await this.fetchImpl(url, { signal: controller.signal });
        if (this.pollAbortController === controller) this.pollAbortController = undefined;
        if (!response.ok) throw new Error(`getUpdates HTTP ${response.status}`);
        const body = (await response.json()) as { ok: boolean; result?: TelegramUpdate[] };
        if (!body.ok) throw new Error('getUpdates returned ok=false');
        this.backoffMs = 0;
        for (const update of body.result ?? []) {
          this.offset = Math.max(this.offset, update.update_id + 1);
          const chatId = update.message?.chat?.id;
          const text = update.message?.text;
          if (chatId === undefined || text === undefined) continue;
          if (!this.options.allowedChatIds.includes(chatId)) {
            this.log(`telegram: ignored message from unauthorized chat ${chatId}`);
            continue;
          }
          if (this.isCommandAddressedToAnotherBot(text)) {
            this.log(`telegram: ignored command addressed to another bot from chat ${chatId}`);
            continue;
          }
          await onMessage({
            conversationId: String(chatId),
            senderId: String(update.message?.from?.id ?? chatId),
            text,
            botUsername: this.botUsername,
          });
        }
        for (const update of body.result ?? []) {
          await this.handleCallbackUpdate(update, onMessage);
        }
        if ((body.result ?? []).length === 0 && timeout === 0) {
          await this.sleep(10);
        }
      } catch (error) {
        this.pollAbortController = undefined;
        if (this.stopped) break;
        const min = this.options.backoffMinMs ?? 1000;
        const max = this.options.backoffMaxMs ?? 60000;
        this.backoffMs = Math.min(Math.max(this.backoffMs * 2, min), max);
        this.log(
          `telegram: poll failed, backing off ${this.backoffMs}ms: ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.sleep(this.backoffMs);
      }
    }
  }

  private async handleCallbackUpdate(update: TelegramUpdate, onMessage: ChannelMessageHandler) {
    const callback = update.callback_query;
    if (!callback) return;
    const chatId = callback.message?.chat?.id;
    const text = callback.data;
    if (chatId === undefined || text === undefined) return;
    if (!this.options.allowedChatIds.includes(chatId)) {
      this.log(`telegram: ignored callback from unauthorized chat ${chatId}`);
      return;
    }
    if (this.isCommandAddressedToAnotherBot(text)) {
      this.log(`telegram: ignored callback command addressed to another bot from chat ${chatId}`);
      return;
    }
    if (callback.id) {
      await this.fetchImpl(this.api('answerCallbackQuery'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callback.id }),
      }).catch(() => undefined);
    }
    await onMessage({
      conversationId: String(chatId),
      senderId: String(callback.from?.id ?? chatId),
      text,
      botUsername: this.botUsername,
    });
  }

  private isCommandAddressedToAnotherBot(text: string) {
    const commandToken = text.trim().split(/\s+/, 1)[0] ?? '';
    if (!commandToken.startsWith('/')) return false;
    const mentionIndex = commandToken.indexOf('@');
    if (mentionIndex < 0) return false;
    const botUsername = this.botUsername;
    if (!botUsername) return true;
    const mentionedUsername = commandToken.slice(mentionIndex + 1);
    return mentionedUsername.length > 0 && mentionedUsername.toLowerCase() !== botUsername.toLowerCase();
  }

  private async resolveBotUsername() {
    if (this.botUsername) return;
    try {
      const response = await this.fetchImpl(this.api('getMe'), { method: 'GET' });
      if (!response.ok) throw new Error(`getMe HTTP ${response.status}`);
      const body = (await response.json()) as { ok?: boolean; result?: { username?: unknown } };
      const username = body.ok === true && typeof body.result?.username === 'string' ? body.result.username : undefined;
      if (username) this.botUsername = username;
    } catch (error) {
      this.log(`telegram: getMe failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async registerBotCommands() {
    try {
      const response = await this.fetchImpl(this.api('setMyCommands'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commands: telegramBotCommandsFromSurface() }),
      });
      if (!response.ok) throw new Error(`setMyCommands HTTP ${response.status}`);
      const body = (await response.json()) as { ok?: boolean; description?: unknown };
      if (body.ok === false) {
        throw new Error(typeof body.description === 'string' ? body.description : 'setMyCommands returned ok=false');
      }
    } catch (error) {
      this.log(`telegram: setMyCommands failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
