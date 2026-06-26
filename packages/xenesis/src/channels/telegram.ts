import type { ChannelAdapter, ChannelMessageHandler, ChannelOutgoingMessage } from "./types.js";
import type { ChannelSendLogEntry, ChannelSendLogger } from "./sendLog.js";

export interface TelegramAdapterOptions {
  token: string;
  allowedChatIds: number[];
  fetchImpl?: typeof fetch;
  pollTimeoutSeconds?: number;
  backoffMinMs?: number;
  backoffMaxMs?: number;
  logger?: (message: string) => void;
  sendLogger?: ChannelSendLogger;
}

const TELEGRAM_MESSAGE_LIMIT = 4096;

export function splitTelegramMessage(text: string): string[] {
  if (text.length === 0) return [""];
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
  readonly name = "telegram";
  private readonly fetchImpl: typeof fetch;
  private stopped = true;
  private offset = 0;
  private backoffMs = 0;
  private loop?: Promise<void>;
  private pollAbortController?: AbortController;

  constructor(private readonly options: TelegramAdapterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async start(onMessage: ChannelMessageHandler): Promise<void> {
    if (!this.stopped) return;
    if (this.options.allowedChatIds.length === 0) {
      throw new Error("Telegram adapter requires a non-empty allowedChatIds allowlist.");
    }
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
        response = await this.fetchImpl(this.api("sendMessage"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: Number(conversationId), text: chunk })
        });
        this.logSend({
          conversationId,
          method: "send",
          text: chunk,
          chunkIndex: index,
          chunkCount: chunks.length,
          ok: response.ok,
          status: response.status
        });
        if (!response.ok) throw new Error(`sendMessage HTTP ${response.status}`);
      } catch (error) {
        if (!response) {
          this.logSend({
            conversationId,
            method: "send",
            text: chunk,
            chunkIndex: index,
            chunkCount: chunks.length,
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        throw error;
      }
    }
  }

  async sendMessage(conversationId: string, message: ChannelOutgoingMessage): Promise<void> {
    const chunks = splitTelegramMessage(message.text);
    const actions = message.actions ?? [];
    for (const [index, chunk] of chunks.entries()) {
      const attachActions = actions.length > 0 && index === chunks.length - 1;
      let response: Response | undefined;
      try {
        response = await this.fetchImpl(this.api("sendMessage"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: Number(conversationId),
            text: chunk,
            ...(attachActions ? {
              reply_markup: {
                inline_keyboard: [actions.map((action) => ({
                  text: action.label,
                  callback_data: action.value
                }))]
              }
            } : {})
          })
        });
        this.logSend({
          conversationId,
          method: "sendMessage",
          text: chunk,
          chunkIndex: index,
          chunkCount: chunks.length,
          ok: response.ok,
          status: response.status,
          actionCount: attachActions ? actions.length : 0
        });
        if (!response.ok) throw new Error(`sendMessage HTTP ${response.status}`);
      } catch (error) {
        if (!response) {
          this.logSend({
            conversationId,
            method: "sendMessage",
            text: chunk,
            chunkIndex: index,
            chunkCount: chunks.length,
            ok: false,
            actionCount: attachActions ? actions.length : 0,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        throw error;
      }
    }
  }

  async notifyBusy(conversationId: string): Promise<void> {
    await this.fetchImpl(this.api("sendChatAction"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: Number(conversationId), action: "typing" })
    }).catch(() => undefined);
  }

  private api(method: string) {
    return `https://api.telegram.org/bot${this.options.token}/${method}`;
  }

  private log(message: string) {
    this.options.logger?.(message);
  }

  private logSend(entry: Omit<ChannelSendLogEntry, "channel" | "at">) {
    try {
      this.options.sendLogger?.({
        channel: this.name,
        at: new Date().toISOString(),
        ...entry
      });
    } catch {
      // Ignore diagnostic logger failures.
    }
  }

  private async pollLoop(onMessage: ChannelMessageHandler) {
    while (!this.stopped) {
      try {
        const timeout = this.options.pollTimeoutSeconds ?? 50;
        const url = `${this.api("getUpdates")}?timeout=${timeout}&offset=${this.offset}`;
        const controller = new AbortController();
        this.pollAbortController = controller;
        const response = await this.fetchImpl(url, { signal: controller.signal });
        if (this.pollAbortController === controller) this.pollAbortController = undefined;
        if (!response.ok) throw new Error(`getUpdates HTTP ${response.status}`);
        const body = await response.json() as { ok: boolean; result?: TelegramUpdate[] };
        if (!body.ok) throw new Error("getUpdates returned ok=false");
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
          await onMessage({
            conversationId: String(chatId),
            senderId: String(update.message?.from?.id ?? chatId),
            text
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
        this.log(`telegram: poll failed, backing off ${this.backoffMs}ms: ${error instanceof Error ? error.message : String(error)}`);
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
    if (callback.id) {
      await this.fetchImpl(this.api("answerCallbackQuery"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ callback_query_id: callback.id })
      }).catch(() => undefined);
    }
    await onMessage({
      conversationId: String(chatId),
      senderId: String(callback.from?.id ?? chatId),
      text
    });
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
