export interface ChannelMessage {
  conversationId: string;
  senderId: string;
  text: string;
  botUsername?: string;
}

export type ChannelMessageHandler = (message: ChannelMessage) => Promise<void>;

export interface ChannelMessageAction {
  label: string;
  value: string;
}

export interface ChannelOutgoingImage {
  data: Buffer;
  mimeType?: string;
  filename?: string;
  caption?: string;
}

export interface ChannelOutgoingRendering {
  telegramHtml?: string;
  slackMrkdwn?: string;
  discordMarkdown?: string;
}

export interface ChannelOutgoingMessage {
  text: string;
  actions?: ChannelMessageAction[];
  image?: ChannelOutgoingImage;
  rendering?: ChannelOutgoingRendering;
}

export interface ChannelAdapter {
  readonly name: string;
  start(onMessage: ChannelMessageHandler): Promise<void>;
  stop(): Promise<void>;
  send(conversationId: string, text: string): Promise<void>;
  sendMessage?(conversationId: string, message: ChannelOutgoingMessage): Promise<void>;
  notifyBusy?(conversationId: string): Promise<void>;
}
