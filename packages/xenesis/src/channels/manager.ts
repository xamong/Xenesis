import { buildChannelHelpMessage, buildDeskMenuMessage, normalizeChannelCommandText } from './commandSurface.js';
import type { ChannelAdapter, ChannelMessage, ChannelOutgoingMessage } from './types.js';

export interface ChannelRunRequest {
  prompt: string;
  sessionId: string;
  conversationId: string;
}

export type ChannelRunPrompt = (request: ChannelRunRequest) => Promise<{ content: string }>;

export type ChannelCommandResponse = string | ChannelOutgoingMessage | undefined;

export type ChannelCommandSend = (response: Exclude<ChannelCommandResponse, undefined>) => Promise<void>;

export type ChannelCommandMessage = ChannelMessage & {
  send?: ChannelCommandSend;
};

export interface ChannelCommandRouter {
  canHandle(text: string, message?: ChannelCommandMessage): boolean;
  handle(message: ChannelCommandMessage): Promise<ChannelCommandResponse>;
}

export interface ChannelSessionStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, sessionId: string): Promise<void>;
  clear(key: string): Promise<void>;
}

export interface ChannelQueuedMessageInput {
  conversationId: string;
  text: string;
}

export interface ChannelQueuedMessage extends ChannelQueuedMessageInput {
  id: string;
  key: string;
  createdAt: string;
}

export interface ChannelQueuedConversation {
  key: string;
  conversationId: string;
}

export interface ChannelMessageQueueStore {
  enqueueMessage(key: string, message: ChannelQueuedMessageInput): Promise<void>;
  peekMessages(key: string): Promise<ChannelQueuedMessage[]>;
  deleteMessages(ids: string[]): Promise<void>;
  drainMessages(key: string): Promise<ChannelQueuedMessage[]>;
  clearMessages(key: string): Promise<void>;
  listQueuedConversations(adapterName: string): Promise<ChannelQueuedConversation[]>;
}

export interface ChannelManagerOptions {
  adapter: ChannelAdapter;
  sessionStore: ChannelSessionStore;
  runPrompt: ChannelRunPrompt;
  commandRouters?: ChannelCommandRouter[];
  logger?: (message: string) => void;
}

interface ConversationState {
  running: boolean;
  queue: string[];
}

interface QueuedBatch {
  prompt: string;
  ack: () => Promise<void>;
}

export class ChannelManager {
  private readonly conversations = new Map<string, ConversationState>();
  private readonly pending = new Set<Promise<void>>();

  constructor(private readonly options: ChannelManagerOptions) {}

  async start() {
    await this.resumeQueuedConversations();
    await this.options.adapter.start((message) => this.onMessage(message));
  }

  async stop() {
    await this.options.adapter.stop();
    await this.drain();
  }

  async drain() {
    while (this.pending.size > 0) {
      await Promise.allSettled([...this.pending]);
    }
  }

  private async onMessage(message: ChannelMessage): Promise<void> {
    const text = normalizeChannelCommandText(message.text.trim(), {
      telegramBotUsername: (message as ChannelMessage & { botUsername?: string }).botUsername,
    });
    const commandMessage: ChannelCommandMessage = {
      ...message,
      text,
      send: (outgoing: Exclude<ChannelCommandResponse, undefined>) =>
        this.sendResponse(message.conversationId, outgoing),
    };
    if (text === '/help') {
      await this.sendResponse(message.conversationId, buildChannelHelpMessage());
      return;
    }
    if (text === '/desk menu') {
      await this.sendResponse(message.conversationId, buildDeskMenuMessage());
      return;
    }
    for (const router of this.options.commandRouters ?? []) {
      if (!router.canHandle(text, commandMessage)) continue;
      const response = await router.handle(commandMessage);
      if (response) await this.sendResponse(message.conversationId, response);
      return;
    }

    if (text === '/new') {
      await this.options.sessionStore.clear(this.sessionKey(message.conversationId));
      await this.clearQueuedMessages(message.conversationId);
      await this.options.adapter.send(message.conversationId, 'Session reset.');
      return;
    }
    if (text === '/status') {
      const running = this.state(message.conversationId).running;
      await this.options.adapter.send(message.conversationId, running ? 'Working on your last message.' : 'Idle.');
      return;
    }

    const state = this.state(message.conversationId);
    if (state.running) {
      await this.enqueueQueuedMessage(message.conversationId, text);
      return;
    }
    await this.trackRun(this.runConversation(message.conversationId, text));
  }

  private async runConversation(
    conversationId: string,
    prompt: string,
    ack: () => Promise<void> = async () => undefined,
  ): Promise<void> {
    const state = this.state(conversationId);
    state.running = true;
    try {
      let batch: QueuedBatch | undefined = { prompt, ack };
      while (batch) {
        await this.runSingleConversation(conversationId, batch.prompt);
        await batch.ack();
        batch = await this.nextQueuedBatch(conversationId);
      }
    } finally {
      state.running = false;
      await this.startQueuedConversation(conversationId);
    }
  }

  private async runSingleConversation(conversationId: string, prompt: string): Promise<void> {
    try {
      const key = this.sessionKey(conversationId);
      let sessionId = await this.options.sessionStore.get(key);
      if (!sessionId) {
        sessionId = `channel-${this.options.adapter.name}-${conversationId}-${Date.now()}`;
        await this.options.sessionStore.set(key, sessionId);
      }

      const busyTimer = setInterval(() => {
        void this.options.adapter.notifyBusy?.(conversationId);
      }, 5000);
      busyTimer.unref?.();
      try {
        const result = await this.options.runPrompt({ prompt, sessionId, conversationId });
        await this.options.adapter.send(conversationId, result.content || '(no output)');
      } finally {
        clearInterval(busyTimer);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.options.logger?.(`channel ${this.options.adapter.name}: run failed: ${message}`);
      await this.options.adapter.send(conversationId, `Run failed: ${message}`).catch(() => undefined);
    }
  }

  private trackRun(run: Promise<void>): Promise<void> {
    this.pending.add(run);
    void run.finally(() => this.pending.delete(run));
    return run;
  }

  private queueStore(): (ChannelSessionStore & ChannelMessageQueueStore) | undefined {
    const store = this.options.sessionStore;
    if (
      typeof (store as Partial<ChannelMessageQueueStore>).enqueueMessage === 'function' &&
      typeof (store as Partial<ChannelMessageQueueStore>).peekMessages === 'function' &&
      typeof (store as Partial<ChannelMessageQueueStore>).deleteMessages === 'function' &&
      typeof (store as Partial<ChannelMessageQueueStore>).drainMessages === 'function' &&
      typeof (store as Partial<ChannelMessageQueueStore>).clearMessages === 'function' &&
      typeof (store as Partial<ChannelMessageQueueStore>).listQueuedConversations === 'function'
    ) {
      return store as ChannelSessionStore & ChannelMessageQueueStore;
    }
    return undefined;
  }

  private async resumeQueuedConversations() {
    const store = this.queueStore();
    if (!store) return;
    const conversations = await store.listQueuedConversations(this.options.adapter.name);
    for (const { conversationId } of conversations) {
      const state = this.state(conversationId);
      if (state.running) continue;
      await this.startQueuedConversation(conversationId);
    }
  }

  private async enqueueQueuedMessage(conversationId: string, text: string) {
    const key = this.sessionKey(conversationId);
    const store = this.queueStore();
    if (store) {
      await store.enqueueMessage(key, { conversationId, text });
      return;
    }
    this.state(conversationId).queue.push(text);
  }

  private async clearQueuedMessages(conversationId: string) {
    const store = this.queueStore();
    if (store) await store.clearMessages(this.sessionKey(conversationId));
    this.state(conversationId).queue = [];
  }

  private async nextQueuedBatch(conversationId: string): Promise<QueuedBatch | undefined> {
    const store = this.queueStore();
    if (store) {
      const messages = await store.peekMessages(this.sessionKey(conversationId));
      if (messages.length === 0) return undefined;
      const ids = messages.map((message) => message.id);
      return {
        prompt: messages.map((message) => message.text).join('\n'),
        ack: () => store.deleteMessages(ids),
      };
    }
    const state = this.state(conversationId);
    const queued = state.queue.splice(0, state.queue.length);
    if (queued.length === 0) return undefined;
    return {
      prompt: queued.join('\n'),
      ack: async () => undefined,
    };
  }

  private async startQueuedConversation(conversationId: string) {
    const state = this.state(conversationId);
    if (state.running) return;
    state.running = true;
    let batch: QueuedBatch | undefined;
    try {
      batch = await this.nextQueuedBatch(conversationId);
    } catch (error) {
      state.running = false;
      throw error;
    }
    if (!batch) {
      state.running = false;
      return;
    }
    this.trackRun(this.runConversation(conversationId, batch.prompt, batch.ack));
  }

  private sessionKey(conversationId: string) {
    return `${this.options.adapter.name}:${conversationId}`;
  }

  private state(conversationId: string): ConversationState {
    let state = this.conversations.get(conversationId);
    if (!state) {
      state = { running: false, queue: [] };
      this.conversations.set(conversationId, state);
    }
    return state;
  }

  private async sendResponse(conversationId: string, response: ChannelCommandResponse): Promise<void> {
    if (!response) return;
    if (typeof response === 'string') {
      await this.options.adapter.send(conversationId, response);
      return;
    }
    if (this.options.adapter.sendMessage) {
      await this.options.adapter.sendMessage(conversationId, response);
      return;
    }
    await this.options.adapter.send(conversationId, formatOutgoingFallback(response));
  }
}

function formatOutgoingFallback(message: ChannelOutgoingMessage): string {
  const actions = message.actions ?? [];
  if (actions.length === 0) return message.text;
  return [message.text, '', ...actions.map((action, index) => `${index + 1}. ${action.label} - ${action.value}`)].join(
    '\n',
  );
}
