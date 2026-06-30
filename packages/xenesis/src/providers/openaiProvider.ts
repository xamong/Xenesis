import OpenAI from 'openai';
import { zodResponsesFunction } from 'openai/helpers/zod';
import type {
  ResponseCreateParamsNonStreaming,
  ResponseCreateParamsStreaming,
} from 'openai/resources/responses/responses.js';
import type { AgentMessage, AgentMessageAttachment, ToolCall } from '../core/messages.js';
import { stripSystemPromptDynamicBoundary } from '../core/prompt/index.js';
import type { Tool } from '../tools/types.js';
import { supportsVision } from './modelCapabilities.js';
import { imageBlocksFor } from './multimodal.js';
import type {
  AgentProvider,
  ProviderRequest,
  ProviderResponse,
  ProviderStopReason,
  ProviderStreamEvent,
  ProviderUsage,
} from './types.js';

interface OpenAIResponsesClient {
  responses: {
    create(
      request: ResponseCreateParamsNonStreaming | ResponseCreateParamsStreaming,
      options?: { signal?: AbortSignal },
    ): Promise<unknown> | unknown;
  };
}

export interface OpenAIProviderOptions {
  apiKey?: string;
  baseURL?: string;
  model: string;
  name?: string;
  client?: OpenAIResponsesClient;
}

function openAIInputImages(attachments: readonly AgentMessageAttachment[] | undefined) {
  return imageBlocksFor(attachments).map((block) => ({
    type: 'input_image' as const,
    image_url: block.dataUrl,
  }));
}

export function toOpenAIInput(messages: AgentMessage[], opts?: { supportsVision?: boolean }) {
  const visionEnabled = opts?.supportsVision === true;
  return messages.flatMap((message) => {
    if (message.role === 'tool') {
      const items: unknown[] = [
        {
          type: 'function_call_output',
          call_id: message.toolCallId,
          output: message.content,
        },
      ];
      const images = visionEnabled ? openAIInputImages(message.attachments) : [];
      if (images.length > 0) {
        // Responses function_call_output cannot carry image blocks; deliver
        // the tool-result screenshot as a follow-on synthetic user item.
        items.push({ role: 'user', content: images });
      }
      return items;
    }

    if (message.role === 'assistant' && message.providerMetadata?.openai?.output) {
      return message.providerMetadata.openai.output;
    }

    if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
      const items: unknown[] = [];
      if (message.content) {
        items.push({ role: 'assistant', content: message.content });
      }
      for (const call of message.toolCalls) {
        items.push({
          type: 'function_call',
          call_id: call.id,
          name: call.name,
          arguments: JSON.stringify(call.input),
        });
      }
      return items;
    }

    if (message.role === 'user') {
      const images = visionEnabled ? openAIInputImages(message.attachments) : [];
      if (images.length > 0) {
        return [
          {
            role: 'user',
            content: [{ type: 'input_text', text: message.content }, ...images],
          },
        ];
      }
      return [{ role: 'user', content: message.content }];
    }

    return [
      {
        role: message.role,
        content: message.role === 'system' ? stripSystemPromptDynamicBoundary(message.content) : message.content,
      },
    ];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOpenAISchema(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeOpenAISchema(item));
  if (!isRecord(value)) return value;

  if (key === 'additionalProperties') {
    return false;
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [entryKey, normalizeOpenAISchema(entryValue, entryKey)]),
  );
}

function toOpenAITool(tool: Tool) {
  const openAITool = zodResponsesFunction({
    name: tool.name,
    description: tool.description,
    parameters: tool.openaiInputSchema ?? tool.inputSchema,
  });

  if (isRecord(openAITool) && 'parameters' in openAITool) {
    return {
      ...openAITool,
      parameters: normalizeOpenAISchema(openAITool.parameters),
    };
  }

  return openAITool;
}

function outputItems(response: unknown): unknown[] {
  if (typeof response !== 'object' || response === null) return [];
  const output = (response as { output?: unknown }).output;
  return Array.isArray(output) ? output : [];
}

function parseUsage(response: unknown): ProviderUsage | undefined {
  if (typeof response !== 'object' || response === null) return undefined;
  const usage = (response as { usage?: Record<string, unknown> }).usage;
  if (!usage) return undefined;
  return {
    inputTokens: typeof usage.input_tokens === 'number' ? usage.input_tokens : undefined,
    outputTokens: typeof usage.output_tokens === 'number' ? usage.output_tokens : undefined,
    totalTokens: typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined,
  };
}

function parseFunctionArguments(value: unknown, _callId: string, _name: string) {
  if (typeof value !== 'string' || value.length === 0) return {};
  try {
    return JSON.parse(value);
  } catch {
    // Soften (S4): malformed arguments JSON returns {} so the runner can coerce +
    // validate + emit schema guidance instead of throwing at the provider boundary.
    return {};
  }
}

function parseOutput(response: unknown) {
  const text: string[] = [];
  const toolCalls: ToolCall[] = [];
  const output = outputItems(response);

  for (const item of output) {
    if (typeof item !== 'object' || item === null) continue;
    const typed = item as Record<string, unknown>;

    if (typed.type === 'message' && Array.isArray(typed.content)) {
      for (const part of typed.content) {
        if (typeof part === 'object' && part !== null) {
          const contentPart = part as Record<string, unknown>;
          if (typeof contentPart.text === 'string') text.push(contentPart.text);
          if (contentPart.type === 'refusal' && typeof contentPart.refusal === 'string') {
            text.push(contentPart.refusal);
          }
        }
      }
    }

    if (typed.type === 'function_call') {
      const id = String(typed.call_id ?? typed.id ?? `call_${toolCalls.length + 1}`);
      const name = String(typed.name);
      toolCalls.push({
        id,
        name,
        input: parseFunctionArguments(typed.arguments, id, name),
      });
    }
  }

  return {
    content: text.join('\n'),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    providerMetadata: output.length > 0 ? { openai: { output } } : undefined,
  };
}

function mapOpenAIResponsesStopReason(response: unknown): ProviderStopReason | undefined {
  if (!isRecord(response)) return undefined;
  const status = response.status;
  if (status === 'incomplete') {
    const details = response.incomplete_details;
    const reason = isRecord(details) ? details.reason : undefined;
    if (reason === 'max_output_tokens') return 'length';
    if (reason === 'content_filter') return 'content_filter';
    return 'other';
  }
  return 'stop';
}

function providerResponse(response: unknown): ProviderResponse {
  const parsed = parseOutput(response);
  return {
    message: {
      role: 'assistant',
      content: parsed.content,
      toolCalls: parsed.toolCalls,
      providerMetadata: parsed.providerMetadata,
    },
    usage: parseUsage(response),
    stopReason: mapOpenAIResponsesStopReason(response),
  };
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === 'function'
  );
}

function eventRecord(event: unknown) {
  if (typeof event !== 'object' || event === null) return undefined;
  return event as Record<string, unknown>;
}

interface StreamedFunctionCall {
  key: string;
  callId: string;
  name: string;
  arguments: string;
}

function streamItemKey(record: Record<string, unknown>, item?: Record<string, unknown>): string {
  const key = item?.id ?? record.item_id ?? item?.call_id ?? record.call_id ?? record.output_index;
  return key === undefined ? `item:${String(record.type ?? 'unknown')}` : String(key);
}

function upsertStreamedFunctionCall(
  calls: Map<string, StreamedFunctionCall>,
  order: string[],
  key: string,
  patch: Partial<Omit<StreamedFunctionCall, 'key'>>,
) {
  const existing = calls.get(key);
  if (!existing) {
    order.push(key);
    calls.set(key, {
      key,
      callId: patch.callId ?? key,
      name: patch.name ?? '',
      arguments: patch.arguments ?? '',
    });
    return;
  }
  calls.set(key, {
    ...existing,
    ...(patch.callId !== undefined ? { callId: patch.callId } : {}),
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.arguments !== undefined ? { arguments: patch.arguments } : {}),
  });
}

function appendStreamedFunctionArguments(
  calls: Map<string, StreamedFunctionCall>,
  order: string[],
  key: string,
  delta: string,
) {
  const existing = calls.get(key);
  upsertStreamedFunctionCall(calls, order, key, {
    arguments: `${existing?.arguments ?? ''}${delta}`,
  });
}

function outputItemsFromStream(
  text: string,
  functionCalls: Map<string, StreamedFunctionCall>,
  functionCallOrder: string[],
): unknown[] {
  const output: unknown[] = [];
  if (text.length > 0) {
    output.push({
      type: 'message',
      content: [{ type: 'output_text', text }],
    });
  }
  for (const key of functionCallOrder) {
    const call = functionCalls.get(key);
    if (!call) continue;
    output.push({
      type: 'function_call',
      call_id: call.callId,
      name: call.name,
      arguments: call.arguments,
    });
  }
  return output;
}

function responseWithStreamedOutputFallback(response: unknown, streamedOutput: unknown[]): unknown {
  if (!isRecord(response) || streamedOutput.length === 0) return response;
  const output = response.output;
  if (Array.isArray(output) && output.length > 0) return response;
  return {
    ...response,
    output: streamedOutput,
  };
}

function providerLabel(name: string) {
  return name === 'openai' ? 'OpenAI' : name;
}

export class OpenAIProvider implements AgentProvider {
  name: string;
  model: string;
  private readonly client: OpenAIResponsesClient;
  private readonly defaultModel: string;

  constructor(options: OpenAIProviderOptions) {
    this.name = options.name ?? 'openai';
    this.defaultModel = options.model;
    this.model = options.model;
    this.client =
      options.client ??
      new OpenAI({
        apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
        baseURL: options.baseURL,
      });
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const model = request.model || this.defaultModel;
    const createRequest: ResponseCreateParamsNonStreaming = {
      model,
      input: toOpenAIInput(request.messages, {
        supportsVision: supportsVision(model, this.name),
      }) as ResponseCreateParamsNonStreaming['input'],
      tools: request.tools.map(toOpenAITool) as ResponseCreateParamsNonStreaming['tools'],
      ...(request.queryConfig?.budget.maxTokens ? { max_output_tokens: request.queryConfig.budget.maxTokens } : {}),
    };

    let response: unknown;
    try {
      response = await this.client.responses.create(
        createRequest,
        request.signal ? { signal: request.signal } : undefined,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${providerLabel(this.name)} provider request failed for model "${model}": ${message}`);
    }

    return providerResponse(response);
  }

  async *stream(request: ProviderRequest): AsyncIterable<ProviderStreamEvent> {
    const model = request.model || this.defaultModel;
    const createRequest: ResponseCreateParamsStreaming = {
      model,
      input: toOpenAIInput(request.messages, {
        supportsVision: supportsVision(model, this.name),
      }) as ResponseCreateParamsStreaming['input'],
      tools: request.tools.map(toOpenAITool) as ResponseCreateParamsStreaming['tools'],
      stream: true,
      ...(request.queryConfig?.budget.maxTokens ? { max_output_tokens: request.queryConfig.budget.maxTokens } : {}),
    };

    let responseStream: unknown;
    try {
      responseStream = await this.client.responses.create(
        createRequest,
        request.signal ? { signal: request.signal } : undefined,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${providerLabel(this.name)} provider stream request failed for model "${model}": ${message}`);
    }

    if (!isAsyncIterable(responseStream)) {
      throw new Error(
        `${providerLabel(this.name)} provider stream request for model "${model}" did not return an async iterable.`,
      );
    }

    let completedResponse: unknown;
    const textDeltas: string[] = [];
    const functionCalls = new Map<string, StreamedFunctionCall>();
    const functionCallOrder: string[] = [];
    for await (const event of responseStream) {
      const record = eventRecord(event);
      if (!record) continue;

      if (record.type === 'response.output_text.delta' && typeof record.delta === 'string') {
        textDeltas.push(record.delta);
        yield { type: 'text_delta', delta: record.delta };
      }

      if (
        (record.type === 'response.output_item.added' || record.type === 'response.output_item.done') &&
        isRecord(record.item) &&
        record.item.type === 'function_call'
      ) {
        const key = streamItemKey(record, record.item);
        upsertStreamedFunctionCall(functionCalls, functionCallOrder, key, {
          callId: String(record.item.call_id ?? record.item.id ?? key),
          name: typeof record.item.name === 'string' ? record.item.name : undefined,
          arguments: typeof record.item.arguments === 'string' ? record.item.arguments : undefined,
        });
      }

      if (record.type === 'response.function_call_arguments.delta' && typeof record.delta === 'string') {
        appendStreamedFunctionArguments(functionCalls, functionCallOrder, streamItemKey(record), record.delta);
      }

      if (record.type === 'response.function_call_arguments.done' && typeof record.arguments === 'string') {
        upsertStreamedFunctionCall(functionCalls, functionCallOrder, streamItemKey(record), {
          arguments: record.arguments,
        });
      }

      if (record.type === 'response.completed') {
        completedResponse = record.response;
      }

      if (record.type === 'response.failed' || record.type === 'response.error') {
        const error = record.error;
        const message =
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message)
            : JSON.stringify(record);
        throw new Error(`${providerLabel(this.name)} provider stream failed for model "${model}": ${message}`);
      }
    }

    if (completedResponse === undefined) {
      throw new Error(
        `${providerLabel(this.name)} provider stream ended without a completed response for model "${model}".`,
      );
    }

    yield {
      type: 'response',
      response: providerResponse(
        responseWithStreamedOutputFallback(
          completedResponse,
          outputItemsFromStream(textDeltas.join(''), functionCalls, functionCallOrder),
        ),
      ),
    };
  }
}
