import OpenAI from "openai";
import type {
  ChatCompletionContentPart,
  ChatCompletionContentPartText,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall
} from "openai/resources/chat/completions/completions.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { AgentMessage, ToolCall } from "../core/messages.js";
import type { Tool } from "../tools/types.js";
import { imageBlocksFor, userContentWithAttachmentSummary } from "./multimodal.js";
import { supportsVision } from "./modelCapabilities.js";
import type { AgentProvider, ProviderRequest, ProviderResponse, ProviderStopReason, ProviderStreamEvent, ProviderUsage } from "./types.js";

interface OpenAIChatClient {
  chat: {
    completions: {
      create(request: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<unknown> | unknown;
    };
  };
}

export interface OpenAIChatProviderOptions {
  apiKey?: string;
  baseURL?: string;
  model: string;
  name?: string;
  client?: OpenAIChatClient;
}

interface StreamingToolCall {
  id: string;
  name: string;
  arguments: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseUsage(response: unknown): ProviderUsage | undefined {
  if (!isRecord(response) || !isRecord(response.usage)) return undefined;
  const usage = response.usage;
  return {
    inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
    outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : undefined
  };
}

function toJsonSchema(tool: Tool) {
  const schema = zodToJsonSchema(tool.openaiInputSchema ?? tool.inputSchema, {
    $refStrategy: "none",
    target: "jsonSchema7"
  }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

function toChatTool(tool: Tool) {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: toJsonSchema(tool)
    }
  };
}

function toChatToolCall(toolCall: ToolCall): ChatCompletionMessageToolCall {
  return {
    id: toolCall.id,
    type: "function",
    function: {
      name: toolCall.name,
      arguments: JSON.stringify(toolCall.input ?? {})
    }
  };
}

function imageContentParts(
  message: Extract<AgentMessage, { role: "user" | "tool" }>,
  visionEnabled: boolean
): ChatCompletionContentPart[] {
  const images = visionEnabled ? imageBlocksFor(message.attachments) : [];
  return images.map((block) => ({
    type: "image_url",
    image_url: { url: block.dataUrl }
  }));
}

function chatUserContent(
  message: Extract<AgentMessage, { role: "user" }>,
  visionEnabled: boolean
): string | ChatCompletionContentPart[] {
  const images = imageContentParts(message, visionEnabled);
  const text = userContentWithAttachmentSummary(message);
  if (images.length === 0) return text;
  const textPart: ChatCompletionContentPartText = { type: "text", text };
  return [textPart, ...images];
}

export function toChatMessages(
  messages: AgentMessage[],
  opts?: { supportsVision?: boolean }
): ChatCompletionMessageParam[] {
  const visionEnabled = opts?.supportsVision === true;
  return messages.flatMap((message): ChatCompletionMessageParam[] => {
    if (message.role === "tool") {
      // Chat Completions tool messages accept text content ONLY
      // (ChatCompletionToolMessageParam.content is string | ChatCompletionContentPartText[]).
      // Image parts are rejected on role:"tool", so the screenshot is delivered as a
      // follow-on synthetic user message (mirrors the Responses provider's approach).
      const toolMessage: ChatCompletionMessageParam = {
        role: "tool",
        tool_call_id: message.toolCallId,
        content: message.content
      };
      const images = imageContentParts(message, visionEnabled);
      if (images.length === 0) return [toolMessage];
      const followOn: ChatCompletionMessageParam = { role: "user", content: images };
      return [toolMessage, followOn];
    }
    if (message.role === "assistant") {
      return [{
        role: "assistant",
        content: message.content || null,
        ...(message.toolCalls?.length ? { tool_calls: message.toolCalls.map(toChatToolCall) } : {})
      }];
    }
    if (message.role === "user") {
      return [{
        role: "user",
        content: chatUserContent(message, visionEnabled)
      }];
    }
    return [{
      role: message.role,
      content: message.content
    }];
  });
}

function parseFunctionArguments(value: unknown, _callId: string, _name: string) {
  if (typeof value !== "string" || value.length === 0) return {};
  try {
    return JSON.parse(value);
  } catch {
    // Soften (S4): malformed arguments JSON returns {} so the runner can coerce +
    // validate + emit schema guidance instead of throwing at the provider boundary.
    return {};
  }
}

function parseToolCalls(value: unknown): ToolCall[] | undefined {
  const toolCalls = asArray(value).flatMap((entry, index) => {
    if (!isRecord(entry) || !isRecord(entry.function)) return [];
    const id = String(entry.id ?? `call_${index + 1}`);
    const name = String(entry.function.name ?? "");
    return [{
      id,
      name,
      input: parseFunctionArguments(entry.function.arguments, id, name)
    }];
  });
  return toolCalls.length > 0 ? toolCalls : undefined;
}

function firstChoiceMessage(response: unknown): Record<string, unknown> {
  if (!isRecord(response)) return {};
  const choice = asArray(response.choices)[0];
  if (!isRecord(choice) || !isRecord(choice.message)) return {};
  return choice.message;
}

function mapChatFinishReason(finishReason: unknown): ProviderStopReason | undefined {
  if (typeof finishReason !== "string") return undefined;
  switch (finishReason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content_filter";
    case "tool_calls":
    case "function_call":
      return "tool_use";
    default:
      return "other";
  }
}

function firstChoiceFinishReason(response: unknown): unknown {
  if (!isRecord(response)) return undefined;
  const choice = asArray(response.choices)[0];
  return isRecord(choice) ? choice.finish_reason : undefined;
}

function parseChatResponse(response: unknown): ProviderResponse {
  const message = firstChoiceMessage(response);
  const content = typeof message.content === "string" ? message.content : "";
  return {
    message: {
      role: "assistant",
      content,
      toolCalls: parseToolCalls(message.tool_calls),
      providerMetadata: { openai: { output: [{ role: "assistant", ...message }] } }
    },
    usage: parseUsage(response),
    stopReason: mapChatFinishReason(firstChoiceFinishReason(response))
  };
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return typeof value === "object" &&
    value !== null &&
    typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function";
}

function providerLabel(name: string) {
  if (name === "qwen") return "Qwen";
  if (name === "deepseek") return "DeepSeek";
  return name === "openai" ? "OpenAI" : name;
}

function applyToolCallDelta(parts: Map<number, StreamingToolCall>, raw: unknown) {
  if (!isRecord(raw)) return;
  const index = typeof raw.index === "number" ? raw.index : parts.size;
  const current = parts.get(index) ?? { id: "", name: "", arguments: "" };
  if (typeof raw.id === "string") current.id = raw.id;
  if (isRecord(raw.function)) {
    if (typeof raw.function.name === "string") current.name += raw.function.name;
    if (typeof raw.function.arguments === "string") current.arguments += raw.function.arguments;
  }
  parts.set(index, current);
}

function streamingToolCalls(parts: Map<number, StreamingToolCall>): ToolCall[] | undefined {
  const calls = Array.from(parts.values()).flatMap((part, index) => {
    const id = part.id || `call_${index + 1}`;
    const name = part.name;
    if (!name) return [];
    return [{
      id,
      name,
      input: parseFunctionArguments(part.arguments, id, name)
    }];
  });
  return calls.length > 0 ? calls : undefined;
}

export class OpenAIChatProvider implements AgentProvider {
  name: string;
  private readonly client: OpenAIChatClient;
  private readonly defaultModel: string;

  constructor(options: OpenAIChatProviderOptions) {
    this.name = options.name ?? "openai-compatible";
    this.defaultModel = options.model;
    this.client = options.client ?? (new OpenAI({
      apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
      baseURL: options.baseURL
    }) as unknown as OpenAIChatClient);
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const model = request.model || this.defaultModel;
    const createRequest = {
      model,
      messages: toChatMessages(request.messages, { supportsVision: supportsVision(model, this.name) }),
      ...(request.tools.length > 0 ? { tools: request.tools.map(toChatTool) } : {}),
      ...(request.queryConfig?.budget.maxTokens ? { max_tokens: request.queryConfig.budget.maxTokens } : {})
    };

    try {
      const response = await this.client.chat.completions.create(
        createRequest,
        request.signal ? { signal: request.signal } : undefined
      );
      return parseChatResponse(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${providerLabel(this.name)} provider request failed for model "${model}": ${message}`);
    }
  }

  async *stream(request: ProviderRequest): AsyncIterable<ProviderStreamEvent> {
    const model = request.model || this.defaultModel;
    const createRequest = {
      model,
      messages: toChatMessages(request.messages, { supportsVision: supportsVision(model, this.name) }),
      ...(request.tools.length > 0 ? { tools: request.tools.map(toChatTool) } : {}),
      stream: true,
      stream_options: { include_usage: true },
      ...(request.queryConfig?.budget.maxTokens ? { max_tokens: request.queryConfig.budget.maxTokens } : {})
    };

    let responseStream: unknown;
    try {
      responseStream = await this.client.chat.completions.create(
        createRequest,
        request.signal ? { signal: request.signal } : undefined
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${providerLabel(this.name)} provider stream request failed for model "${model}": ${message}`);
    }

    if (!isAsyncIterable(responseStream)) {
      throw new Error(`${providerLabel(this.name)} provider stream request for model "${model}" did not return an async iterable.`);
    }

    const text: string[] = [];
    const toolCallParts = new Map<number, StreamingToolCall>();
    let usage: ProviderUsage | undefined;
    let finishReason: unknown;

    for await (const chunk of responseStream) {
      usage = parseUsage(chunk) ?? usage;
      if (!isRecord(chunk)) continue;
      const choice = asArray(chunk.choices)[0];
      if (!isRecord(choice)) continue;
      if (typeof choice.finish_reason === "string") finishReason = choice.finish_reason;
      if (!isRecord(choice.delta)) continue;
      const delta = choice.delta;
      if (typeof delta.content === "string" && delta.content.length > 0) {
        text.push(delta.content);
        yield { type: "text_delta", delta: delta.content };
      }
      for (const toolCall of asArray(delta.tool_calls)) {
        applyToolCallDelta(toolCallParts, toolCall);
      }
    }

    const content = text.join("");
    yield {
      type: "response",
      response: {
        message: {
          role: "assistant",
          content,
          toolCalls: streamingToolCalls(toolCallParts),
          providerMetadata: { openai: { output: [{ role: "assistant", content }] } }
        },
        usage,
        stopReason: mapChatFinishReason(finishReason)
      }
    };
  }
}
