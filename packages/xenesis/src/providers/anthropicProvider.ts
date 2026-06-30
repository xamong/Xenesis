import { zodToJsonSchema } from 'zod-to-json-schema';
import type { AgentMessage, AgentMessageAttachment, ToolCall } from '../core/messages.js';
import { splitSystemPromptAtDynamicBoundary, stripSystemPromptDynamicBoundary } from '../core/prompt/index.js';
import type { Tool } from '../tools/types.js';
import { supportsVision } from './modelCapabilities.js';
import { imageBlocksFor } from './multimodal.js';
import { ProviderHttpError, parseRetryAfter } from './providerHttpError.js';
import type {
  AgentProvider,
  ProviderRequest,
  ProviderResponse,
  ProviderStopReason,
  ProviderStreamEvent,
  ProviderUsage,
} from './types.js';

type AnthropicRole = 'user' | 'assistant';

interface AnthropicMessage {
  role: AnthropicRole;
  content: string | unknown[];
}

interface AnthropicSystemTextBlock {
  type: 'text';
  text: string;
  cache_control?: {
    type: 'ephemeral';
  };
}

interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AnthropicMessageCreateRequest {
  model: string;
  max_tokens: number;
  system?: string | AnthropicSystemTextBlock[];
  messages: AnthropicMessage[];
  tools?: AnthropicToolDefinition[];
  stream?: boolean;
  signal?: AbortSignal;
}

export interface AnthropicMessagesClient {
  create(request: AnthropicMessageCreateRequest): Promise<unknown>;
  stream(request: AnthropicMessageCreateRequest): AsyncIterable<unknown>;
}

export interface AnthropicProviderOptions {
  apiKey?: string;
  baseURL?: string;
  model: string;
  maxTokens?: number;
  name?: string;
  client?: AnthropicMessagesClient;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function contentBlocks(response: unknown) {
  if (!isRecord(response)) return [];
  return asArray(response.content);
}

function parseUsage(response: unknown): ProviderUsage | undefined {
  if (!isRecord(response) || !isRecord(response.usage)) return undefined;
  const usage = response.usage;
  const inputTokens = typeof usage.input_tokens === 'number' ? usage.input_tokens : undefined;
  const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : undefined;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined,
  };
}

function mapAnthropicStopReason(response: unknown): ProviderStopReason | undefined {
  if (!isRecord(response)) return undefined;
  const raw = response.stop_reason;
  if (typeof raw !== 'string') return undefined;
  switch (raw) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_use';
    case 'refusal':
      return 'refusal';
    default:
      return 'other';
  }
}

function parseToolInput(value: unknown, _id: string, _name: string) {
  if (value === undefined || value === null) return {};
  if (isRecord(value)) return value;
  // Soften (S4): non-object input is not a hard failure here; return {} so the
  // runner can coerce + validate against the tool schema and emit guidance.
  return {};
}

function parseAnthropicResponse(response: unknown): ProviderResponse {
  const text: string[] = [];
  const toolCalls: ToolCall[] = [];
  const content = contentBlocks(response);

  for (const block of content) {
    if (!isRecord(block)) continue;
    if (block.type === 'text' && typeof block.text === 'string') {
      text.push(block.text);
    }
    if (block.type === 'tool_use') {
      const id = String(block.id ?? `toolu_${toolCalls.length + 1}`);
      const name = String(block.name ?? '');
      toolCalls.push({
        id,
        name,
        input: parseToolInput(block.input, id, name),
      });
    }
  }

  return {
    message: {
      role: 'assistant',
      content: text.join('\n'),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      providerMetadata: content.length > 0 ? { anthropic: { content } } : undefined,
    },
    usage: parseUsage(response),
    stopReason: mapAnthropicStopReason(response),
  };
}

function toJsonSchema(tool: Tool) {
  const schema = zodToJsonSchema(tool.openaiInputSchema ?? tool.inputSchema, {
    $refStrategy: 'none',
    target: 'jsonSchema7',
  }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

function toAnthropicTool(tool: Tool): AnthropicToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: toJsonSchema(tool),
  };
}

function assistantContent(message: Extract<AgentMessage, { role: 'assistant' }>) {
  if (message.providerMetadata?.anthropic?.content) {
    return message.providerMetadata.anthropic.content;
  }

  const content: unknown[] = [];
  if (message.content) content.push({ type: 'text', text: message.content });
  for (const toolCall of message.toolCalls ?? []) {
    content.push({
      type: 'tool_use',
      id: toolCall.id,
      name: toolCall.name,
      input: toolCall.input,
    });
  }
  return content.length > 0 ? content : [{ type: 'text', text: '' }];
}

function anthropicImageBlocks(attachments: readonly AgentMessageAttachment[] | undefined) {
  return imageBlocksFor(attachments).map((block) => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: block.mediaType, data: block.base64 },
  }));
}

export function toAnthropicInput(messages: AgentMessage[], opts?: { supportsVision?: boolean }) {
  const visionEnabled = opts?.supportsVision === true;
  const system: Extract<AgentMessage, { role: 'system' }>[] = [];
  const output: AnthropicMessage[] = [];
  let pendingToolResults: unknown[] = [];

  const flushToolResults = () => {
    if (pendingToolResults.length === 0) return;
    output.push({
      role: 'user',
      content: pendingToolResults,
    });
    pendingToolResults = [];
  };

  for (const message of messages) {
    if (message.role === 'system') {
      system.push(message);
      continue;
    }

    if (message.role === 'tool') {
      const images = visionEnabled ? anthropicImageBlocks(message.attachments) : [];
      pendingToolResults.push({
        type: 'tool_result',
        tool_use_id: message.toolCallId,
        content: images.length > 0 ? [{ type: 'text', text: message.content }, ...images] : message.content,
      });
      continue;
    }

    flushToolResults();
    if (message.role === 'user') {
      const images = visionEnabled ? anthropicImageBlocks(message.attachments) : [];
      output.push({
        role: 'user',
        content: images.length > 0 ? [{ type: 'text', text: message.content }, ...images] : message.content,
      });
    } else {
      output.push({ role: 'assistant', content: assistantContent(message) });
    }
  }

  flushToolResults();
  return {
    system: anthropicSystemPrompt(system),
    messages: output,
  };
}

function anthropicCacheDisabled(system: readonly Extract<AgentMessage, { role: 'system' }>[]) {
  return system.some((message) => message.promptMetadata?.cacheControl?.anthropic?.disabled === true);
}

function anthropicSystemPrompt(
  system: readonly Extract<AgentMessage, { role: 'system' }>[],
): string | AnthropicSystemTextBlock[] | undefined {
  if (system.length === 0) return undefined;
  const content = system.map((message) => message.content).join('\n');
  const parts = splitSystemPromptAtDynamicBoundary(content);
  if (!parts.hasBoundary) return content;
  if (anthropicCacheDisabled(system)) return stripSystemPromptDynamicBoundary(content);

  const blocks: AnthropicSystemTextBlock[] = [];

  if (parts.stablePrefix.length > 0) {
    blocks.push({
      type: 'text',
      text: parts.stablePrefix,
      cache_control: { type: 'ephemeral' },
    });
  }
  if (parts.dynamicTail.length > 0) {
    blocks.push({
      type: 'text',
      text: parts.dynamicTail,
    });
  }
  return blocks.length > 0 ? blocks : undefined;
}

function mergeUsage(previous: ProviderUsage | undefined, next: ProviderUsage | undefined): ProviderUsage | undefined {
  if (!previous) return next;
  if (!next) return previous;
  const inputTokens = next.inputTokens ?? previous.inputTokens;
  const outputTokens = next.outputTokens ?? previous.outputTokens;
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined,
  };
}

function parseStreamUsage(value: unknown): ProviderUsage | undefined {
  if (!isRecord(value)) return undefined;
  return parseUsage({ usage: value });
}

function createRequest(
  request: ProviderRequest,
  defaultModel: string,
  maxTokens: number,
  providerName: string,
  stream?: boolean,
) {
  const resolvedMaxTokens = request.queryConfig?.budget.maxTokens ?? maxTokens;
  const resolvedModel = request.model || defaultModel;
  const input = toAnthropicInput(request.messages, { supportsVision: supportsVision(resolvedModel, providerName) });
  const tools = request.tools.map(toAnthropicTool);
  return {
    model: resolvedModel,
    max_tokens: resolvedMaxTokens,
    ...(input.system ? { system: input.system } : {}),
    messages: input.messages,
    ...(tools.length > 0 ? { tools } : {}),
    ...(stream ? { stream: true } : {}),
    ...(request.signal ? { signal: request.signal } : {}),
  };
}

function streamEventRecord(event: unknown) {
  return isRecord(event) ? event : undefined;
}

function eventDelta(event: Record<string, unknown>) {
  return isRecord(event.delta) ? event.delta : undefined;
}

function parseJsonObject(value: string, id: string, name: string) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parseToolInput(parsed, id, name);
  } catch {
    // Soften (S4): malformed streamed JSON returns {} so the runner can coerce +
    // validate + emit schema guidance instead of throwing at the provider boundary.
    return {};
  }
}

class FetchAnthropicMessagesClient implements AnthropicMessagesClient {
  private readonly apiKey?: string;
  private readonly baseURL: string;

  constructor(options: { apiKey?: string; baseURL?: string }) {
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL ?? 'https://api.anthropic.com';
  }

  async create(request: AnthropicMessageCreateRequest): Promise<unknown> {
    return await this.send(request, false);
  }

  async *stream(request: AnthropicMessageCreateRequest): AsyncIterable<unknown> {
    const response = await this.send(request, true);
    for await (const event of parseSseEvents(response)) {
      yield event;
    }
  }

  private async send(request: AnthropicMessageCreateRequest, stream: false): Promise<unknown>;
  private async send(request: AnthropicMessageCreateRequest, stream: true): Promise<Response>;
  private async send(request: AnthropicMessageCreateRequest, stream: boolean) {
    if (!this.apiKey) throw new Error('ANTHROPIC_API_KEY is required for Anthropic provider.');
    const { signal, ...body } = request;
    const response = await fetch(`${this.baseURL.replace(/\/+$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
      throw new ProviderHttpError(`HTTP ${response.status}: ${body}`, {
        status: response.status,
        ...(retryAfter !== undefined ? { retryAfterMs: retryAfter } : {}),
      });
    }

    if (stream) return response;
    return await response.json();
  }
}

async function* parseSseEvents(response: Response): AsyncIterable<unknown> {
  if (!response.body) throw new Error('Anthropic stream response had no body.');
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    let match = buffer.match(/\r?\n\r?\n/);
    while (match?.index !== undefined) {
      const frame = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      const event = parseSseFrame(frame);
      if (event !== undefined) yield event;
      match = buffer.match(/\r?\n\r?\n/);
    }
  }

  buffer += decoder.decode();
  const event = parseSseFrame(buffer);
  if (event !== undefined) yield event;
}

function parseSseFrame(frame: string) {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n')
    .trim();
  if (!data || data === '[DONE]') return undefined;
  return JSON.parse(data) as unknown;
}

export class AnthropicProvider implements AgentProvider {
  name: string;
  model: string;
  private readonly client: AnthropicMessagesClient;
  private readonly defaultModel: string;
  private readonly maxTokens: number;

  constructor(options: AnthropicProviderOptions) {
    this.name = options.name ?? 'anthropic';
    this.defaultModel = options.model;
    this.model = options.model;
    this.maxTokens = options.maxTokens ?? 4096;
    this.client =
      options.client ??
      new FetchAnthropicMessagesClient({
        apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY,
        baseURL: options.baseURL,
      });
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const createPayload = createRequest(request, this.defaultModel, this.maxTokens, this.name);
    let response: unknown;
    try {
      response = await this.client.create(createPayload);
    } catch (error) {
      if (error instanceof ProviderHttpError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${this.name} provider request failed for model "${createPayload.model}": ${message}`);
    }
    return parseAnthropicResponse(response);
  }

  async *stream(request: ProviderRequest): AsyncIterable<ProviderStreamEvent> {
    const createPayload = createRequest(request, this.defaultModel, this.maxTokens, this.name, true);
    const content: Record<number, Record<string, unknown>> = {};
    const inputJson: Record<number, string> = {};
    let usage: ProviderUsage | undefined;
    let stopReason: unknown;

    let responseStream: AsyncIterable<unknown>;
    try {
      responseStream = this.client.stream(createPayload);
    } catch (error) {
      if (error instanceof ProviderHttpError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${this.name} provider stream request failed for model "${createPayload.model}": ${message}`);
    }

    for await (const event of responseStream) {
      const record = streamEventRecord(event);
      if (!record) continue;

      if (record.type === 'message_start' && isRecord(record.message)) {
        usage = mergeUsage(usage, parseUsage(record.message));
      }

      if (record.type === 'content_block_start' && typeof record.index === 'number' && isRecord(record.content_block)) {
        content[record.index] = { ...record.content_block };
      }

      if (record.type === 'content_block_delta' && typeof record.index === 'number') {
        const delta = eventDelta(record);
        const block = content[record.index];
        if (!delta || !block) continue;

        if (delta.type === 'text_delta' && typeof delta.text === 'string') {
          block.text = `${typeof block.text === 'string' ? block.text : ''}${delta.text}`;
          yield { type: 'text_delta', delta: delta.text };
        }

        if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
          inputJson[record.index] = `${inputJson[record.index] ?? ''}${delta.partial_json}`;
        }
      }

      if (record.type === 'content_block_stop' && typeof record.index === 'number') {
        const block = content[record.index];
        if (block?.type === 'tool_use') {
          const id = String(block.id ?? `toolu_${record.index}`);
          const name = String(block.name ?? '');
          block.input = parseJsonObject(inputJson[record.index] ?? JSON.stringify(block.input ?? {}), id, name);
        }
      }

      if (record.type === 'message_delta') {
        if (isRecord(record.usage)) {
          usage = mergeUsage(usage, parseStreamUsage(record.usage));
        }
        if (isRecord(record.delta) && typeof record.delta.stop_reason === 'string') {
          stopReason = record.delta.stop_reason;
        }
      }

      if (record.type === 'error') {
        const error = isRecord(record.error) ? record.error : {};
        throw new Error(
          `${this.name} provider stream failed for model "${createPayload.model}": ${String(error.message ?? 'unknown error')}`,
        );
      }
    }

    const response = parseAnthropicResponse({
      content: Object.entries(content)
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, block]) => block),
      usage: {
        input_tokens: usage?.inputTokens,
        output_tokens: usage?.outputTokens,
      },
      ...(typeof stopReason === 'string' ? { stop_reason: stopReason } : {}),
    });
    yield { type: 'response', response };
  }
}
