import type { AgentMessage } from '../core/messages.js';
import type { Tool } from '../tools/types.js';
import type { ProviderQueryConfig } from './queryConfig.js';

export interface ProviderRequest {
  model: string;
  messages: AgentMessage[];
  tools: Tool[];
  signal?: AbortSignal;
  queryConfig?: ProviderQueryConfig;
}

export interface ProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export type ProviderStopReason = 'stop' | 'length' | 'refusal' | 'tool_use' | 'content_filter' | 'other';

export interface ProviderResponse {
  message: Extract<AgentMessage, { role: 'assistant' }>;
  usage?: ProviderUsage;
  stopReason?: ProviderStopReason;
}

export type ProviderStreamEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'response'; response: ProviderResponse };

export type ProviderRuntimeTransport =
  | 'http-streaming'
  | 'http-nonstreaming'
  | 'cli-oneshot'
  | 'cli-interactive'
  | 'local-server'
  | 'mcp-agent';

export interface ProviderRuntimeCapabilities {
  transport: ProviderRuntimeTransport;
  streaming: boolean;
  persistentSession: boolean;
}

export interface AgentProvider {
  name: string;
  model?: string;
  capabilities?: ProviderRuntimeCapabilities;
  complete(request: ProviderRequest): Promise<ProviderResponse>;
  stream?(request: ProviderRequest): AsyncIterable<ProviderStreamEvent>;
  dispose?(): void | Promise<void>;
}
