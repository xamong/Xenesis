/**
 * Vercel AI SDK adapter for Xenesis provider abstraction.
 *
 * Wraps the AI SDK's unified interface to provide streamText/generateObject
 * across multiple LLM providers with a single API. Gradually replaces
 * direct OpenAI SDK calls in existing providers.
 *
 * Supported AI SDK providers: openai, anthropic, google
 *
 * Usage:
 *   const adapter = createAiSdkAdapter('openai', { apiKey: '...' });
 *   const stream = await adapter.streamText({ prompt: '...' });
 *   const object = await adapter.generateObject({ prompt: '...', schema: z.object({...}) });
 */

import type { LanguageModelUsage } from 'ai';
import type { ZodSchema } from 'zod';

export type AiSdkProviderName = 'openai' | 'anthropic' | 'google';

export interface AiSdkConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

export interface AiSdkStreamResult {
  text: string;
  finishReason: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface AiSdkObjectResult<T> {
  object: T;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

function normalizeAiSdkUsage(
  usage: LanguageModelUsage | undefined,
): { promptTokens: number; completionTokens: number; totalTokens: number } | undefined {
  if (!usage) return undefined;
  const promptTokens = usage.inputTokens ?? 0;
  const completionTokens = usage.outputTokens ?? 0;
  const totalTokens = usage.totalTokens ?? promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

export interface AiSdkAdapter {
  provider: AiSdkProviderName;
  model: string;
  streamText(options: {
    prompt: string;
    system?: string;
    maxTokens?: number;
    temperature?: number;
    onChunk?: (chunk: string) => void;
  }): Promise<AiSdkStreamResult>;
  generateObject<T>(options: {
    prompt: string;
    system?: string;
    schema: ZodSchema<T>;
    maxTokens?: number;
    temperature?: number;
  }): Promise<AiSdkObjectResult<T>>;
}

const DEFAULT_MODELS: Record<AiSdkProviderName, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  google: 'gemini-2.0-flash',
};

export async function createAiSdkAdapter(
  providerName: AiSdkProviderName,
  config: AiSdkConfig = {},
): Promise<AiSdkAdapter> {
  const modelId = config.model || DEFAULT_MODELS[providerName];

  let model: any;

  if (providerName === 'openai') {
    const { createOpenAI } = await import('@ai-sdk/openai');
    const provider = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    model = provider(modelId);
  } else if (providerName === 'anthropic') {
    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const provider = createAnthropic({ apiKey: config.apiKey, baseURL: config.baseURL });
    model = provider(modelId);
  } else if (providerName === 'google') {
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
    const provider = createGoogleGenerativeAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    model = provider(modelId);
  } else {
    throw new Error(`Unsupported AI SDK provider: ${providerName}`);
  }

  return {
    provider: providerName,
    model: modelId,

    async streamText(options) {
      const { streamText } = await import('ai');
      const result = await streamText({
        model,
        prompt: options.prompt,
        system: options.system,
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      });

      let text = '';
      for await (const chunk of result.textStream) {
        text += chunk;
        options.onChunk?.(chunk);
      }

      return {
        text,
        finishReason: (await result.finishReason) || 'stop',
        usage: normalizeAiSdkUsage(await result.usage),
      };
    },

    async generateObject<T>(options: {
      prompt: string;
      system?: string;
      schema: ZodSchema<T>;
      maxTokens?: number;
      temperature?: number;
    }): Promise<AiSdkObjectResult<T>> {
      const { generateObject } = await import('ai');
      const result = await generateObject({
        model,
        prompt: options.prompt,
        system: options.system,
        schema: options.schema,
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      });

      return {
        object: result.object as T,
        usage: normalizeAiSdkUsage(result.usage),
      };
    },
  };
}

export function listAiSdkProviders(): Array<{ name: AiSdkProviderName; defaultModel: string }> {
  return Object.entries(DEFAULT_MODELS).map(([name, defaultModel]) => ({
    name: name as AiSdkProviderName,
    defaultModel,
  }));
}
