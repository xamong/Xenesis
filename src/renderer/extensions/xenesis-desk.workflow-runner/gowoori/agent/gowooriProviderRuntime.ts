import type { AiProviderKind } from '../../../../../shared/types';
import type { GowooriApiFormat } from './gowooriApiRunner';

const DEFAULT_OPENAI_MODEL = 'gpt-4o';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const LOCAL_NO_KEY_PROVIDERS = new Set<string>(['ollama', 'lmstudio']);

export interface GowooriApiRuntimeInput {
  provider?: AiProviderKind | string | null;
  model?: string | null;
  baseUrl?: string | null;
  apiKey?: string | null;
  apiBaseUrlOverride?: string | null;
  apiModelOverride?: string | null;
  apiKeyRequired?: boolean;
  fallbackModel?: string | null;
}

export interface GowooriApiRuntimeSettings {
  apiFormat: GowooriApiFormat;
  baseUrl: string;
  model: string;
  apiKey: string;
  apiKeyRequired: boolean;
}

export function getGowooriApiFormatForProvider(provider?: string | null): GowooriApiFormat {
  if (provider === 'azure') return 'azure';
  if (provider === 'anthropic') return 'anthropic';
  if (provider === 'gemini') return 'gemini';
  return 'openai';
}

export function normalizeOpenAiCompatibleChatUrl(baseUrl: string): string {
  const trimmed = String(baseUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  if (/\/v1$/i.test(trimmed)) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

export function getDefaultGowooriApiBaseUrl(provider?: string | null, model?: string | null): string {
  if (provider === 'anthropic') return 'https://api.anthropic.com/v1/messages';
  if (provider === 'gemini') {
    const geminiModel = String(model || '').trim() || DEFAULT_GEMINI_MODEL;
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:streamGenerateContent`;
  }
  if (provider === 'azure') return '';
  if (provider === 'deepseek') return 'https://api.deepseek.com/chat/completions';
  if (provider === 'qwen') return 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
  if (provider === 'ollama') return 'http://127.0.0.1:11434/v1/chat/completions';
  if (provider === 'lmstudio') return 'http://127.0.0.1:1234/v1/chat/completions';
  return 'https://api.openai.com/v1/chat/completions';
}

export function isGowooriApiKeyRequired(provider?: string | null, override?: boolean): boolean {
  if (override !== undefined) return override;
  return !LOCAL_NO_KEY_PROVIDERS.has(String(provider || ''));
}

export function resolveGowooriApiRuntimeSettings(input: GowooriApiRuntimeInput): GowooriApiRuntimeSettings {
  const provider = String(input.provider || 'openai');
  const model = String(input.apiModelOverride || input.model || input.fallbackModel || DEFAULT_OPENAI_MODEL).trim();
  const rawBaseUrl = String(input.apiBaseUrlOverride || input.baseUrl || '').trim();
  const apiFormat = getGowooriApiFormatForProvider(provider);
  const defaultBaseUrl = getDefaultGowooriApiBaseUrl(provider, model);
  const baseUrl =
    apiFormat === 'openai'
      ? normalizeOpenAiCompatibleChatUrl(rawBaseUrl || defaultBaseUrl)
      : rawBaseUrl || defaultBaseUrl;

  return {
    apiFormat,
    baseUrl,
    model,
    apiKey: String(input.apiKey || '').trim(),
    apiKeyRequired: isGowooriApiKeyRequired(provider, input.apiKeyRequired),
  };
}
