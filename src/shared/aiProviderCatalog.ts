import type { AiProviderKind } from './types';

export interface ProviderMeta {
  label: string;
  shortLabel: string;
  defaultModel: string;
  models: string[];
  needsKey: boolean;
  defaultBaseUrl: string;
}

export const AI_PROVIDERS: Record<AiProviderKind, ProviderMeta> = {
  auto: {
    label: 'Auto (detect)',
    shortLabel: 'Auto',
    defaultModel: '',
    models: [],
    needsKey: false,
    defaultBaseUrl: '',
  },
  openai: {
    label: 'OpenAI',
    shortLabel: 'OpenAI',
    defaultModel: 'gpt-5.5',
    models: ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4', 'gpt-5.4-pro', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.3-codex'],
    needsKey: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    label: 'Anthropic',
    shortLabel: 'Anthropic',
    defaultModel: 'claude-sonnet-5',
    models: ['claude-fable-5', 'claude-opus-4-8', 'claude-sonnet-5', 'claude-haiku-4-5'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  gemini: {
    label: 'Google Gemini',
    shortLabel: 'Google Gemini',
    defaultModel: 'gemini-3.5-flash',
    models: [
      'gemini-3.5-flash',
      'gemini-3.1-pro-preview',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ],
    needsKey: true,
    defaultBaseUrl: '',
  },
  openrouter: {
    label: 'OpenRouter',
    shortLabel: 'OpenRouter',
    defaultModel: 'anthropic/claude-sonnet-5',
    models: [
      'anthropic/claude-sonnet-5',
      'openai/gpt-5.5',
      'openai/gpt-5.4-mini',
      'anthropic/claude-opus-4.8',
      'google/gemini-3.5-flash',
      'deepseek/deepseek-v4-pro',
      'qwen/qwen3.7-plus',
      'openrouter/fusion',
    ],
    needsKey: true,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
  },
  groq: {
    label: 'Groq',
    shortLabel: 'Groq',
    defaultModel: 'openai/gpt-oss-120b',
    models: [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'groq/compound',
      'groq/compound-mini',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'qwen/qwen3.6-27b',
      'qwen/qwen3-32b',
    ],
    needsKey: true,
    defaultBaseUrl: '',
  },
  deepseek: {
    label: 'DeepSeek',
    shortLabel: 'DeepSeek',
    defaultModel: 'deepseek-v4-flash',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    needsKey: true,
    defaultBaseUrl: 'https://api.deepseek.com',
  },
  qwen: {
    label: 'Qwen',
    shortLabel: 'Qwen',
    defaultModel: 'qwen3.7-plus',
    models: ['qwen3.7-max', 'qwen3.7-plus', 'qwen3.6-flash', 'qwen3.6-max-preview', 'qwen3-max'],
    needsKey: true,
    defaultBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  },
  mistral: {
    label: 'Mistral',
    shortLabel: 'Mistral',
    defaultModel: 'mistral-medium-latest',
    models: [
      'mistral-medium-latest',
      'mistral-medium-3-5',
      'mistral-small-latest',
      'mistral-small-2603',
      'mistral-large-latest',
      'devstral-latest',
      'codestral-latest',
    ],
    needsKey: true,
    defaultBaseUrl: 'https://api.mistral.ai/v1',
  },
  xai: {
    label: 'xAI',
    shortLabel: 'xAI',
    defaultModel: 'grok-4.3',
    models: ['grok-4.3', 'grok-build-0.1'],
    needsKey: true,
    defaultBaseUrl: 'https://api.x.ai/v1',
  },
  ollama: {
    label: 'Ollama',
    shortLabel: 'Ollama',
    defaultModel: 'gpt-oss:20b',
    models: [
      'gpt-oss:20b',
      'gpt-oss:120b',
      'gpt-oss:latest',
      'qwen3:30b',
      'qwen3:235b',
      'qwen3.6',
      'qwen3.5',
      'qwen3-coder-next',
    ],
    needsKey: false,
    defaultBaseUrl: 'http://localhost:11434',
  },
  lmstudio: {
    label: 'LM Studio',
    shortLabel: 'LM Studio',
    defaultModel: 'local-model',
    models: ['local-model', 'gpt-oss-20b', 'qwen3.6', 'qwen3-coder-next'],
    needsKey: false,
    defaultBaseUrl: 'http://localhost:1234',
  },
  together: {
    label: 'Together AI',
    shortLabel: 'Together',
    defaultModel: 'deepseek-ai/DeepSeek-V4-Pro',
    models: [
      'deepseek-ai/DeepSeek-V4-Pro',
      'zai-org/GLM-5.2',
      'moonshotai/Kimi-K2.7-Code',
      'MiniMaxAI/MiniMax-M3',
      'Qwen/Qwen3.7-Plus',
      'Qwen/Qwen3.7-Max',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'nvidia/nemotron-3-ultra-550b-a55b',
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    ],
    needsKey: true,
    defaultBaseUrl: '',
  },
  fireworks: {
    label: 'Fireworks AI',
    shortLabel: 'Fireworks',
    defaultModel: 'accounts/fireworks/models/deepseek-v4-pro',
    models: [
      'accounts/fireworks/models/deepseek-v4-pro',
      'accounts/fireworks/models/glm-5p2',
      'accounts/fireworks/models/kimi-k2p6',
      'accounts/fireworks/models/gpt-oss-120b',
      'accounts/fireworks/models/gpt-oss-20b',
      'accounts/fireworks/models/glm-5p2-fp8',
    ],
    needsKey: true,
    defaultBaseUrl: '',
  },
  azure: {
    label: 'Azure OpenAI',
    shortLabel: 'Azure OpenAI',
    defaultModel: 'gpt-chat-latest',
    models: ['gpt-chat-latest', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  'codex-cli': {
    label: 'Codex CLI (Local)',
    shortLabel: 'Codex',
    defaultModel: 'gpt-5.5',
    models: ['gpt-5.5', 'gpt-5.3-codex'],
    needsKey: false,
    defaultBaseUrl: '',
  },
  'codex-app-server': {
    label: 'Codex App Server (Local)',
    shortLabel: 'Codex',
    defaultModel: 'gpt-5.5',
    models: ['gpt-5.5', 'gpt-5.3-codex'],
    needsKey: false,
    defaultBaseUrl: '',
  },
  'claude-cli': {
    label: 'Claude CLI (Local)',
    shortLabel: 'Claude',
    defaultModel: 'claude-sonnet-5',
    models: ['claude-sonnet-5', 'claude-opus-4-8'],
    needsKey: false,
    defaultBaseUrl: '',
  },
  'claude-interactive': {
    label: 'Claude Interactive (Local)',
    shortLabel: 'Claude',
    defaultModel: 'claude-sonnet-5',
    models: ['claude-sonnet-5'],
    needsKey: false,
    defaultBaseUrl: '',
  },
};

export const AI_PROVIDER_KINDS = Object.keys(AI_PROVIDERS) as AiProviderKind[];

export const AI_PROVIDER_API_ORDER = [
  'openai',
  'anthropic',
  'gemini',
  'openrouter',
  'azure',
  'groq',
  'deepseek',
  'qwen',
  'mistral',
  'xai',
  'ollama',
  'lmstudio',
  'together',
  'fireworks',
] as const satisfies readonly AiProviderKind[];

export const API_AI_PROVIDER_ORDER = AI_PROVIDER_API_ORDER;

const AI_PROVIDER_API_SET = new Set<AiProviderKind>(AI_PROVIDER_API_ORDER);

export function isApiAiProviderKind(provider: unknown): provider is (typeof AI_PROVIDER_API_ORDER)[number] {
  return typeof provider === 'string' && AI_PROVIDER_API_SET.has(provider as AiProviderKind);
}

export function coerceApiAiProviderKind(provider: unknown, fallback: AiProviderKind = 'openai'): AiProviderKind {
  if (isApiAiProviderKind(provider)) return provider;
  return isApiAiProviderKind(fallback) ? fallback : 'openai';
}
