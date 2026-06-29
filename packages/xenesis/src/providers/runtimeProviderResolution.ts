import { existsSync as nodeExistsSync } from 'node:fs';
import { homedir as nodeHomeDir } from 'node:os';
import { join } from 'node:path';
import type { ProviderName, ProviderSetupEntry, XenesisConfig } from '../config/types.js';
import { capabilitiesFor, presetApiKeyEnv } from './registry.js';

export type RuntimeProviderName = Exclude<ProviderName, 'auto' | 'mock'>;
export type ResolvedProviderName = RuntimeProviderName | 'mock';
export type ProviderSelectionSource = 'user-settings-profile' | 'auto-detect';
export type ProviderAuthMode = 'api-key' | 'codex-login' | 'claude-login' | 'none' | 'test-mock';
export type ProviderCredentialState = 'present' | 'missing' | 'blocked';
export type ProviderProcessModel = 'persistent-process' | 'process-per-turn' | 'http-streaming' | 'local-server';

export interface ProviderSelectionResult {
  requestedProvider: ProviderName | string;
  provider?: ResolvedProviderName;
  source: ProviderSelectionSource;
  authMode?: ProviderAuthMode;
  credentialState: ProviderCredentialState;
  credentialSource?: string;
  processModel?: ProviderProcessModel;
  apiKeyEnv?: string;
  baseURL?: string;
  model?: string;
  fallbackProvider?: RuntimeProviderName;
  diagnostics: string[];
  safeForReasoning: boolean;
}

export interface RuntimeProviderResolutionOptions {
  existsSync?: (path: string) => boolean;
  homeDir?: string;
  allowTestMockProvider?: boolean;
}

type RuntimeEnv = Record<string, string | undefined>;

const AUTO_API_KEY_PROVIDERS = [
  { apiKeyEnv: 'ANTHROPIC_API_KEY', provider: 'anthropic' },
  { apiKeyEnv: 'OPENAI_API_KEY', provider: 'openai' },
  { apiKeyEnv: 'GEMINI_API_KEY', provider: 'gemini' },
  { apiKeyEnv: 'OPENROUTER_API_KEY', provider: 'openrouter' },
  { apiKeyEnv: 'GROQ_API_KEY', provider: 'groq' },
  { apiKeyEnv: 'DEEPSEEK_API_KEY', provider: 'deepseek' },
  { apiKeyEnv: 'DASHSCOPE_API_KEY', provider: 'qwen' },
  { apiKeyEnv: 'MISTRAL_API_KEY', provider: 'mistral' },
  { apiKeyEnv: 'XAI_API_KEY', provider: 'xai' },
] as const satisfies ReadonlyArray<{ apiKeyEnv: string; provider: RuntimeProviderName }>;

function processModelForProvider(provider: ResolvedProviderName): ProviderProcessModel {
  const transport = capabilitiesFor(provider)?.transport;
  if (transport === 'cli-interactive') return 'persistent-process';
  if (transport === 'cli-oneshot') return 'process-per-turn';
  if (transport === 'local-server') return 'local-server';
  return 'http-streaming';
}

function providerSetup(config: XenesisConfig, provider: ProviderName): ProviderSetupEntry | undefined {
  return config.providers?.find((entry) => entry.enabled !== false && entry.kind === provider);
}

function configuredApiKeyEnv(config: XenesisConfig, provider: ProviderName): string | undefined {
  return config.apiKeyEnv ?? providerSetup(config, provider)?.apiKeyEnv ?? presetApiKeyEnv(provider);
}

function configuredBaseURL(config: XenesisConfig, env: RuntimeEnv, provider: ProviderName): string | undefined {
  return config.baseURL ?? env.XENESIS_BASE_URL ?? providerSetup(config, provider)?.baseURL;
}

function resultForReadyProvider(
  config: XenesisConfig,
  env: RuntimeEnv,
  provider: RuntimeProviderName,
  source: ProviderSelectionSource,
  authMode: ProviderAuthMode,
  credentialSource: string,
  apiKeyEnv?: string,
  diagnostics: string[] = [],
): ProviderSelectionResult {
  return {
    requestedProvider: config.provider,
    provider,
    source,
    authMode,
    credentialState: 'present',
    credentialSource,
    processModel: processModelForProvider(provider),
    apiKeyEnv,
    baseURL: configuredBaseURL(config, env, provider),
    model: providerSetup(config, provider)?.model ?? config.model,
    fallbackProvider: undefined,
    diagnostics,
    safeForReasoning: true,
  };
}

function hasNonEmptyEnv(env: RuntimeEnv, name: string): boolean {
  return typeof env[name] === 'string' && env[name]!.length > 0;
}

function resolveAuto(
  config: XenesisConfig,
  env: RuntimeEnv,
  options: Required<Pick<RuntimeProviderResolutionOptions, 'existsSync' | 'homeDir'>>,
): ProviderSelectionResult {
  const diagnostics: string[] = [];
  const codexHomeAuth = env.CODEX_HOME ? join(env.CODEX_HOME, 'auth.json') : undefined;
  if (codexHomeAuth && options.existsSync(codexHomeAuth)) {
    diagnostics.push('codex auth found');
    return resultForReadyProvider(
      config,
      env,
      'codex-app-server',
      'auto-detect',
      'codex-login',
      'CODEX_HOME/auth.json',
      undefined,
      diagnostics,
    );
  }

  const homeCodexAuth = join(options.homeDir, '.codex', 'auth.json');
  if (options.existsSync(homeCodexAuth)) {
    diagnostics.push('codex auth found');
    return resultForReadyProvider(
      config,
      env,
      'codex-app-server',
      'auto-detect',
      'codex-login',
      '~/.codex/auth.json',
      undefined,
      diagnostics,
    );
  }

  const claudeCredentials = join(options.homeDir, '.claude', '.credentials.json');
  if (options.existsSync(claudeCredentials)) {
    diagnostics.push('claude credentials found');
    return resultForReadyProvider(
      config,
      env,
      'claude-interactive',
      'auto-detect',
      'claude-login',
      '~/.claude/.credentials.json',
      undefined,
      diagnostics,
    );
  }

  for (const candidate of AUTO_API_KEY_PROVIDERS) {
    if (!hasNonEmptyEnv(env, candidate.apiKeyEnv)) continue;
    diagnostics.push(`${candidate.apiKeyEnv} found`);
    return resultForReadyProvider(
      config,
      env,
      candidate.provider,
      'auto-detect',
      'api-key',
      candidate.apiKeyEnv,
      candidate.apiKeyEnv,
      diagnostics,
    );
  }

  return {
    requestedProvider: config.provider,
    provider: undefined,
    source: 'auto-detect',
    authMode: undefined,
    credentialState: 'missing',
    credentialSource: undefined,
    processModel: undefined,
    apiKeyEnv: undefined,
    baseURL: config.baseURL ?? env.XENESIS_BASE_URL,
    model: config.model,
    fallbackProvider: undefined,
    diagnostics: [
      'missing credentials: checked CODEX_HOME/auth.json, ~/.codex/auth.json, ~/.claude/.credentials.json, ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, DEEPSEEK_API_KEY, DASHSCOPE_API_KEY, MISTRAL_API_KEY, XAI_API_KEY',
    ],
    safeForReasoning: false,
  };
}

function resolveMock(config: XenesisConfig, env: RuntimeEnv, allowTestMockProvider: boolean): ProviderSelectionResult {
  const allowed = allowTestMockProvider || env.XENESIS_ENABLE_TEST_MOCK_PROVIDER === 'true';
  return {
    requestedProvider: config.provider,
    provider: 'mock',
    source: 'user-settings-profile',
    authMode: allowed ? 'test-mock' : undefined,
    credentialState: allowed ? 'present' : 'blocked',
    credentialSource: allowed ? 'XENESIS_ENABLE_TEST_MOCK_PROVIDER' : undefined,
    processModel: 'local-server',
    apiKeyEnv: undefined,
    baseURL: undefined,
    model: config.model,
    fallbackProvider: undefined,
    diagnostics: allowed
      ? ['mock provider enabled for test runtime']
      : ['mock provider is blocked for normal reasoning'],
    safeForReasoning: allowed,
  };
}

function resolveExplicitProvider(config: XenesisConfig, env: RuntimeEnv): ProviderSelectionResult {
  const provider = config.provider as RuntimeProviderName;
  const capabilities = capabilitiesFor(provider);
  const apiKeyEnv = configuredApiKeyEnv(config, provider);
  const base = {
    requestedProvider: config.provider,
    provider,
    source: 'user-settings-profile' as const,
    processModel: processModelForProvider(provider),
    apiKeyEnv,
    baseURL: configuredBaseURL(config, env, provider),
    model: providerSetup(config, provider)?.model ?? config.model,
    fallbackProvider: undefined,
    diagnostics: [] as string[],
  };

  if (!capabilities) {
    return {
      ...base,
      authMode: undefined,
      credentialState: 'blocked',
      credentialSource: undefined,
      diagnostics: [`provider ${provider} is not registered`],
      safeForReasoning: false,
    };
  }

  if (provider === 'openai-compatible' && !base.baseURL) {
    return {
      ...base,
      authMode: undefined,
      credentialState: 'blocked',
      credentialSource: undefined,
      diagnostics: ['provider openai-compatible requires baseURL'],
      safeForReasoning: false,
    };
  }

  if (capabilities.requiresApiKey) {
    if (apiKeyEnv && hasNonEmptyEnv(env, apiKeyEnv)) {
      return {
        ...base,
        authMode: 'api-key',
        credentialState: 'present',
        credentialSource: apiKeyEnv,
        diagnostics: [`${apiKeyEnv} found`],
        safeForReasoning: true,
      };
    }
    return {
      ...base,
      authMode: 'api-key',
      credentialState: 'missing',
      credentialSource: undefined,
      diagnostics: [`provider ${provider} requires ${apiKeyEnv ?? 'an API key'}`],
      safeForReasoning: false,
    };
  }

  const authMode: ProviderAuthMode =
    provider === 'codex-app-server' || provider === 'codex-cli'
      ? 'codex-login'
      : provider === 'claude-interactive' || provider === 'claude-cli'
        ? 'claude-login'
        : 'none';
  return {
    ...base,
    authMode,
    credentialState: 'present',
    credentialSource: authMode === 'none' ? undefined : 'provider runtime',
    diagnostics: [`provider ${provider} does not require an API key`],
    safeForReasoning: true,
  };
}

export function resolveRuntimeProviderSelection(
  config: XenesisConfig,
  env: RuntimeEnv = process.env,
  options: RuntimeProviderResolutionOptions = {},
): ProviderSelectionResult {
  const resolvedOptions = {
    existsSync: options.existsSync ?? nodeExistsSync,
    homeDir: options.homeDir ?? nodeHomeDir(),
  };

  if (config.provider === 'auto') {
    return resolveAuto(config, env, resolvedOptions);
  }
  if (config.provider === 'mock') {
    return resolveMock(config, env, options.allowTestMockProvider === true);
  }
  return resolveExplicitProvider(config, env);
}

export function assertRuntimeProviderReady(selection: ProviderSelectionResult): void {
  if (selection.credentialState === 'missing') {
    const providerText = selection.provider ? ` for ${selection.provider}` : '';
    const apiKeyText = selection.apiKeyEnv ? ` (${selection.apiKeyEnv})` : '';
    throw new Error(`Missing provider credentials${providerText}${apiKeyText}. ${selection.diagnostics.join('; ')}`);
  }
  if (selection.credentialState === 'blocked') {
    throw new Error(
      `Provider ${selection.provider ?? selection.requestedProvider} is blocked. ${selection.diagnostics.join('; ')}`,
    );
  }
  if (selection.provider === 'mock' && !selection.safeForReasoning) {
    throw new Error('Mock provider is blocked for normal reasoning.');
  }
  if (!selection.provider || !selection.safeForReasoning) {
    throw new Error(
      `Provider ${selection.requestedProvider} is not ready for reasoning. ${selection.diagnostics.join('; ')}`,
    );
  }
}
