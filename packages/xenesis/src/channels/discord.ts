import type { ChannelAdapter, ChannelMessageHandler, ChannelOutgoingMessage } from './types.js';

export interface DiscordWebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener?(type: 'open' | 'message' | 'close' | 'error', listener: (event: unknown) => void): void;
  onopen?: ((event: unknown) => void) | null;
  onmessage?: ((event: { data?: unknown }) => void) | null;
  onclose?: ((event: unknown) => void) | null;
  onerror?: ((event: unknown) => void) | null;
}

export type DiscordWebSocketFactory = (url: string) => DiscordWebSocketLike;

export interface DiscordAdapterOptions {
  botToken?: string;
  allowedChannelIds?: string[];
  allowedGuildIds?: string[];
  webhookUrl?: string;
  fetchImpl?: typeof fetch;
  webSocketFactory?: DiscordWebSocketFactory;
  gatewayUrl?: string;
}

const discordApiBaseUrl = 'https://discord.com/api/v10';
const discordGatewayUrl = 'wss://gateway.discord.gg/?v=10&encoding=json';
const discordMessageLimit = 2000;
const discordMessageIntents = 512 + 4096 + 32768;

function splitDiscordMessage(text: string) {
  if (text.length === 0) return [''];
  const chunks: string[] = [];
  for (let offset = 0; offset < text.length; offset += discordMessageLimit) {
    chunks.push(text.slice(offset, offset + discordMessageLimit));
  }
  return chunks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function optionalRecord(value: unknown) {
  return isRecord(value) ? value : undefined;
}

function eventData(event: unknown) {
  const data = (event as { data?: unknown }).data;
  return typeof data === 'string' ? data : String(data ?? '');
}

function defaultWebSocketFactory(): DiscordWebSocketFactory {
  const WebSocketCtor = (
    globalThis as {
      WebSocket?: new (url: string) => DiscordWebSocketLike;
    }
  ).WebSocket;
  if (!WebSocketCtor) {
    throw new Error('Discord adapter requires WebSocket support or a webSocketFactory.');
  }
  return (url) => new WebSocketCtor(url);
}

export class DiscordAdapter implements ChannelAdapter {
  readonly name = 'discord';
  private readonly fetchImpl: typeof fetch;
  private handler?: ChannelMessageHandler;
  private socket?: DiscordWebSocketLike;
  private heartbeat?: NodeJS.Timeout;
  private sequence: number | null = null;

  constructor(private readonly options: DiscordAdapterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async start(onMessage: ChannelMessageHandler): Promise<void> {
    this.handler = onMessage;
    if (!this.options.botToken) throw new Error('Discord adapter requires botToken to receive events.');
    const socket = (this.options.webSocketFactory ?? defaultWebSocketFactory())(
      this.options.gatewayUrl ?? discordGatewayUrl,
    );
    this.socket = socket;
    this.addSocketListener(socket, 'message', (event) => {
      void this.handleGatewayMessage(event).catch(() => undefined);
    });
  }

  async stop(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    this.handler = undefined;
    this.socket?.close(1000, 'xenesis stop');
    this.socket = undefined;
  }

  async send(conversationId: string, text: string): Promise<void> {
    if (this.options.botToken) {
      for (const chunk of splitDiscordMessage(text)) {
        const response = await this.fetchImpl(
          `${discordApiBaseUrl}/channels/${encodeURIComponent(conversationId)}/messages`,
          {
            method: 'POST',
            headers: {
              authorization: `Bot ${this.options.botToken}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({ content: chunk }),
          },
        );
        if (!response.ok) throw new Error(`discord create message HTTP ${response.status}`);
      }
      return;
    }
    if (this.options.webhookUrl) {
      const response = await this.fetchImpl(this.options.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (!response.ok) throw new Error(`discord webhook HTTP ${response.status}`);
      return;
    }
    throw new Error('Discord adapter requires botToken or webhookUrl to send messages.');
  }

  async sendMessage(conversationId: string, message: ChannelOutgoingMessage): Promise<void> {
    const actions = message.actions ?? [];
    if (actions.length === 0) {
      await this.send(conversationId, message.text);
      return;
    }
    if (!this.options.botToken) {
      await this.send(conversationId, formatActionFallback(message));
      return;
    }
    const response = await this.fetchImpl(
      `${discordApiBaseUrl}/channels/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        headers: {
          authorization: `Bot ${this.options.botToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: message.text,
          components: [
            {
              type: 1,
              components: actions.map((action) => ({
                type: 2,
                style: 1,
                label: action.label,
                custom_id: action.value,
              })),
            },
          ],
        }),
      },
    );
    if (!response.ok) throw new Error(`discord create message HTTP ${response.status}`);
  }

  async notifyBusy(conversationId: string): Promise<void> {
    if (!this.options.botToken) return;
    await this.fetchImpl(`${discordApiBaseUrl}/channels/${encodeURIComponent(conversationId)}/typing`, {
      method: 'POST',
      headers: { authorization: `Bot ${this.options.botToken}` },
    }).catch(() => undefined);
  }

  private addSocketListener(
    socket: DiscordWebSocketLike,
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: unknown) => void,
  ) {
    if (socket.addEventListener) socket.addEventListener(type, listener);
    else {
      const key = `on${type}` as keyof DiscordWebSocketLike;
      (socket as unknown as Record<string, unknown>)[key] = listener;
    }
  }

  private sendGateway(payload: unknown) {
    this.socket?.send(JSON.stringify(payload));
  }

  private async handleGatewayMessage(event: unknown) {
    const payload = JSON.parse(eventData(event)) as unknown;
    if (!isRecord(payload)) return;
    if (typeof payload.s === 'number') this.sequence = payload.s;

    if (payload.op === 10) {
      const hello = optionalRecord(payload.d);
      const heartbeatInterval = typeof hello?.heartbeat_interval === 'number' ? hello.heartbeat_interval : 45000;
      this.startHeartbeat(heartbeatInterval);
      this.identify();
      return;
    }

    if (payload.op === 0 && payload.t === 'MESSAGE_CREATE') {
      await this.handleMessageCreate(payload.d);
    }
    if (payload.op === 0 && payload.t === 'INTERACTION_CREATE') {
      await this.handleInteractionCreate(payload.d);
    }
  }

  private startHeartbeat(intervalMs: number) {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      this.sendGateway({ op: 1, d: this.sequence });
    }, intervalMs);
    this.heartbeat.unref?.();
  }

  private identify() {
    this.sendGateway({
      op: 2,
      d: {
        token: this.options.botToken,
        intents: discordMessageIntents,
        properties: {
          os: process.platform,
          browser: 'xenesis',
          device: 'xenesis',
        },
      },
    });
  }

  private async handleMessageCreate(data: unknown) {
    const message = optionalRecord(data);
    if (!message) return;
    const author = optionalRecord(message.author);
    if (author?.bot === true) return;

    const channelId = optionalString(message.channel_id);
    const guildId = optionalString(message.guild_id);
    const senderId = optionalString(author?.id);
    const content = optionalString(message.content);
    if (!channelId || !senderId || !content) return;
    if (!this.isAllowedChannel(channelId)) return;
    if (!this.isAllowedGuild(guildId)) return;

    await this.handler?.({
      conversationId: channelId,
      senderId,
      text: content,
    });
  }

  private async handleInteractionCreate(data: unknown) {
    const interaction = optionalRecord(data);
    if (!interaction) return;

    const channelId = optionalString(interaction.channel_id);
    const guildId = optionalString(interaction.guild_id);
    const member = optionalRecord(interaction.member);
    const memberUser = optionalRecord(member?.user);
    const directUser = optionalRecord(interaction.user);
    const senderId = optionalString(memberUser?.id) ?? optionalString(directUser?.id);
    const interactionData = optionalRecord(interaction.data);
    const customId = optionalString(interactionData?.custom_id);
    if (!channelId || !senderId || !customId) return;
    if (!this.isAllowedChannel(channelId)) return;
    if (!this.isAllowedGuild(guildId)) return;

    const id = optionalString(interaction.id);
    const token = optionalString(interaction.token);
    if (id && token) {
      await this.fetchImpl(
        `${discordApiBaseUrl}/interactions/${encodeURIComponent(id)}/${encodeURIComponent(token)}/callback`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 6 }),
        },
      ).catch(() => undefined);
    }

    await this.handler?.({
      conversationId: channelId,
      senderId,
      text: customId,
    });
  }

  private isAllowedChannel(channelId: string) {
    const allowed = this.options.allowedChannelIds ?? [];
    return allowed.length === 0 || allowed.includes(channelId);
  }

  private isAllowedGuild(guildId: string | undefined) {
    const allowed = this.options.allowedGuildIds ?? [];
    return allowed.length === 0 || (guildId !== undefined && allowed.includes(guildId));
  }
}

function formatActionFallback(message: ChannelOutgoingMessage) {
  const actions = message.actions ?? [];
  if (actions.length === 0) return message.text;
  return [message.text, '', ...actions.map((action, index) => `${index + 1}. ${action.label} - ${action.value}`)].join(
    '\n',
  );
}
