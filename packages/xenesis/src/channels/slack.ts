import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ChannelAdapter, ChannelMessageHandler, ChannelOutgoingMessage } from './types.js';

export interface SlackAdapterOptions {
  botToken?: string;
  signingSecret?: string;
  allowedChannelIds?: string[];
  webhookUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  signatureToleranceSeconds?: number;
}

export interface SlackEventHttpResponse {
  statusCode: number;
  contentType: string;
  body: string;
}

type SlackHeaderMap = Record<string, string | string[] | undefined>;

const slackApiUrl = 'https://slack.com/api/chat.postMessage';
const defaultSignatureToleranceSeconds = 300;

function headerValue(headers: SlackHeaderMap, name: string) {
  const direct = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(direct)) return direct[0];
  return direct;
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export class SlackAdapter implements ChannelAdapter {
  readonly name = 'slack';
  private readonly fetchImpl: typeof fetch;
  private handler?: ChannelMessageHandler;

  constructor(private readonly options: SlackAdapterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async start(onMessage: ChannelMessageHandler): Promise<void> {
    this.handler = onMessage;
  }

  async stop(): Promise<void> {
    this.handler = undefined;
  }

  async handleEventRequest(headers: SlackHeaderMap, rawBody: string): Promise<SlackEventHttpResponse> {
    this.verifySignature(headers, rawBody);
    const body = JSON.parse(rawBody) as unknown;
    if (!isRecord(body)) throw new Error('Slack event body must be a JSON object.');

    if (body.type === 'url_verification') {
      const challenge = optionalString(body.challenge);
      if (!challenge) throw new Error('Slack url_verification requires a challenge.');
      return {
        statusCode: 200,
        contentType: 'text/plain; charset=utf-8',
        body: challenge,
      };
    }

    if (body.type === 'event_callback') {
      await this.handleEvent(body.event);
    }

    return {
      statusCode: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true }),
    };
  }

  async handleInteractionRequest(headers: SlackHeaderMap, rawBody: string): Promise<SlackEventHttpResponse> {
    this.verifySignature(headers, rawBody);
    const payload = new URLSearchParams(rawBody).get('payload');
    if (!payload) throw new Error('Slack interaction request requires a payload.');
    const body = JSON.parse(payload) as unknown;
    if (!isRecord(body)) throw new Error('Slack interaction payload must be a JSON object.');
    if (body.type === 'block_actions') {
      await this.handleBlockAction(body);
    }
    return {
      statusCode: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ ok: true }),
    };
  }

  async send(conversationId: string, text: string): Promise<void> {
    if (this.options.botToken) {
      await this.postSlackMessage(conversationId, text);
      return;
    }
    if (this.options.webhookUrl) {
      const response = await this.fetchImpl(this.options.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(`slack webhook HTTP ${response.status}`);
      return;
    }
    throw new Error('Slack adapter requires botToken or webhookUrl to send messages.');
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
    await this.postSlackMessage(conversationId, message.text, {
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: message.text } },
        {
          type: 'actions',
          elements: actions.map((action) => ({
            type: 'button',
            text: { type: 'plain_text', text: action.label },
            value: action.value,
          })),
        },
      ],
    });
  }

  private async postSlackMessage(channel: string, text: string, extra: Record<string, unknown> = {}) {
    const response = await this.fetchImpl(slackApiUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.options.botToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ channel, text, ...extra }),
    });
    if (!response.ok) throw new Error(`slack chat.postMessage HTTP ${response.status}`);
    const body = (await response.json().catch(() => undefined)) as { ok?: boolean; error?: string } | undefined;
    if (body && body.ok === false) throw new Error(`slack chat.postMessage failed: ${body.error ?? 'unknown error'}`);
  }

  private verifySignature(headers: SlackHeaderMap, rawBody: string) {
    const secret = this.options.signingSecret;
    if (!secret) throw new Error('Slack adapter requires signingSecret to receive events.');
    const timestamp = headerValue(headers, 'x-slack-request-timestamp');
    const signature = headerValue(headers, 'x-slack-signature');
    if (!timestamp || !signature) throw new Error('Invalid Slack signature: missing headers.');

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) throw new Error('Invalid Slack signature timestamp.');
    const nowSeconds = Math.floor((this.options.now?.() ?? Date.now()) / 1000);
    const tolerance = this.options.signatureToleranceSeconds ?? defaultSignatureToleranceSeconds;
    if (Math.abs(nowSeconds - timestampSeconds) > tolerance) {
      throw new Error('Invalid Slack signature: timestamp outside tolerance.');
    }

    const expected = `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${rawBody}`).digest('hex')}`;
    if (!secureEqual(expected, signature)) {
      throw new Error('Invalid Slack signature.');
    }
  }

  private async handleEvent(event: unknown) {
    if (!isRecord(event)) return;
    if (event.type !== 'message') return;
    if (event.subtype !== undefined || event.bot_id !== undefined) return;

    const channel = optionalString(event.channel);
    const user = optionalString(event.user);
    const text = optionalString(event.text);
    if (!channel || !user || !text) return;
    if (!this.isAllowedChannel(channel)) return;

    await this.handler?.({
      conversationId: channel,
      senderId: user,
      text,
    });
  }

  private async handleBlockAction(payload: Record<string, unknown>) {
    const channel = optionalString(isRecord(payload.channel) ? payload.channel.id : undefined);
    const user = optionalString(isRecord(payload.user) ? payload.user.id : undefined);
    const actions = Array.isArray(payload.actions) ? payload.actions : [];
    const firstAction = actions.find(isRecord);
    const value = optionalString(firstAction?.value);
    if (!channel || !user || !value) return;
    if (!this.isAllowedChannel(channel)) return;

    await this.handler?.({
      conversationId: channel,
      senderId: user,
      text: value,
    });
  }

  private isAllowedChannel(channel: string) {
    const allowed = this.options.allowedChannelIds ?? [];
    return allowed.length === 0 || allowed.includes(channel);
  }
}

function formatActionFallback(message: ChannelOutgoingMessage) {
  const actions = message.actions ?? [];
  if (actions.length === 0) return message.text;
  return [message.text, '', ...actions.map((action, index) => `${index + 1}. ${action.label} - ${action.value}`)].join(
    '\n',
  );
}
