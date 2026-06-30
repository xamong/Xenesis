import type { ProviderName, XenesisConfig } from '../config/types.js';
import { getRegisteredCapabilities } from './providerFactory.js';
import type { ProviderRuntimeCapabilities } from './types.js';

interface ProviderPreset {
  apiKeyEnv?: string;
  baseURL?: string;
}

export interface ProviderCapabilities extends ProviderRuntimeCapabilities {
  supportsTools: boolean;
  requiresApiKey: boolean;
}

export interface ProviderRuntimeSettings {
  provider: ProviderName;
  apiKey?: string;
  apiKeyEnv?: string;
  baseURL?: string;
}

const providerPresets: Record<ProviderName, ProviderPreset> = {
  auto: {},
  openai: { apiKeyEnv: 'OPENAI_API_KEY' },
  // Test/dev provider only. Normal reasoning provider resolution blocks this
  // unless XENESIS_ENABLE_TEST_MOCK_PROVIDER=true is present.
  mock: {},
  anthropic: {
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    baseURL: 'https://api.anthropic.com',
  },
  claude: {
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    baseURL: 'https://api.anthropic.com',
  },
  'openai-compatible': { apiKeyEnv: 'XENESIS_API_KEY' },
  gemini: {
    apiKeyEnv: 'GEMINI_API_KEY',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  },
  ollama: {
    apiKeyEnv: 'OLLAMA_API_KEY',
    baseURL: 'http://localhost:11434/v1',
  },
  openrouter: {
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseURL: 'https://openrouter.ai/api/v1',
  },
  groq: {
    apiKeyEnv: 'GROQ_API_KEY',
    baseURL: 'https://api.groq.com/openai/v1',
  },
  deepseek: {
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com',
  },
  qwen: {
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  },
  mistral: {
    apiKeyEnv: 'MISTRAL_API_KEY',
    baseURL: 'https://api.mistral.ai/v1',
  },
  xai: {
    apiKeyEnv: 'XAI_API_KEY',
    baseURL: 'https://api.x.ai/v1',
  },
  'codex-app-server': {},
  'codex-cli': {},
  'claude-interactive': {},
  'claude-cli': {},
};

export const PROVIDER_CAPABILITIES: Record<ProviderName, ProviderCapabilities> = {
  // Resolver-only sentinel. Direct legacy provider construction should fail
  // closed instead of treating auto as a runnable local provider.
  auto: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  openai: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  mock: {
    supportsTools: true,
    requiresApiKey: false,
    transport: 'local-server',
    streaming: false,
    persistentSession: true,
  },
  anthropic: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  claude: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  'openai-compatible': {
    supportsTools: true,
    requiresApiKey: false,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  gemini: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  ollama: {
    supportsTools: true,
    requiresApiKey: false,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  openrouter: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  groq: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  deepseek: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  qwen: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  mistral: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  xai: {
    supportsTools: true,
    requiresApiKey: true,
    transport: 'http-streaming',
    streaming: true,
    persistentSession: false,
  },
  'codex-app-server': {
    supportsTools: true,
    requiresApiKey: false,
    transport: 'cli-interactive',
    streaming: true,
    persistentSession: true,
  },
  'codex-cli': {
    supportsTools: true,
    requiresApiKey: false,
    transport: 'cli-oneshot',
    streaming: true,
    persistentSession: false,
  },
  'claude-interactive': {
    supportsTools: true,
    requiresApiKey: false,
    transport: 'cli-interactive',
    streaming: true,
    persistentSession: true,
  },
  'claude-cli': {
    supportsTools: true,
    requiresApiKey: false,
    transport: 'cli-oneshot',
    streaming: true,
    persistentSession: false,
  },
};

export function capabilitiesFor(name: string): ProviderCapabilities | undefined {
  return getRegisteredCapabilities(name) ?? (PROVIDER_CAPABILITIES as Record<string, ProviderCapabilities>)[name];
}

export function presetApiKeyEnv(kind: ProviderName) {
  // Tolerate external/registered provider names absent from the preset table.
  return (providerPresets as Record<string, ProviderPreset | undefined>)[kind]?.apiKeyEnv;
}

export function resolveProviderSettings(
  config: XenesisConfig,
  env: NodeJS.ProcessEnv = process.env,
): ProviderRuntimeSettings {
  // External/registered providers are not in the ProviderName tuple, so they have
  // no preset entry. Tolerate a missing preset instead of dereferencing undefined.
  const preset = (providerPresets as Record<string, ProviderPreset | undefined>)[config.provider] ?? {};
  const apiKeyEnv = config.apiKeyEnv ?? preset.apiKeyEnv;
  return {
    provider: config.provider,
    apiKey: apiKeyEnv ? env[apiKeyEnv] : undefined,
    apiKeyEnv,
    baseURL: config.baseURL ?? env.XENESIS_BASE_URL ?? preset.baseURL,
  };
}
