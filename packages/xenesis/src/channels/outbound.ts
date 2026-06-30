import type { ChannelAdapter, ChannelMessageHandler } from './types.js';

export interface WebhookAdapterOptions {
  url: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

async function postJson(
  fetchImpl: typeof fetch,
  url: string,
  payload: unknown,
  headers: Record<string, string>,
  label: string,
) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
}

export class WebhookAdapter implements ChannelAdapter {
  readonly name = 'webhook';
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: WebhookAdapterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async start(_onMessage: ChannelMessageHandler): Promise<void> {}

  async stop(): Promise<void> {}

  async send(conversationId: string, text: string): Promise<void> {
    await postJson(
      this.fetchImpl,
      this.options.url,
      { channel: this.name, conversationId, text },
      this.options.headers ?? {},
      'webhook',
    );
  }
}
