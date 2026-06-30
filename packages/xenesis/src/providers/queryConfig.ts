export interface ProviderQueryConfigProvider {
  name: string;
  model?: string;
}

export interface ProviderQueryConfigOptions {
  sessionId: string;
  model: string;
  providers: readonly ProviderQueryConfigProvider[];
  providerMaxRetries?: number;
  maxTokensBudget?: number;
  stream?: boolean;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

export interface ProviderQueryConfig {
  version: 1;
  sessionId: string;
  model: string;
  providerNames: readonly string[];
  providerModels: readonly string[];
  retry: {
    maxRetries: number;
  };
  budget: {
    maxTokens: number | null;
  };
  stream: boolean;
  gates: {
    streamingToolExecution: boolean;
    emitToolUseSummaries: boolean;
    antUser: boolean;
    fastModeEnabled: boolean;
  };
}

function envValue(env: ProviderQueryConfigOptions['env'], key: string) {
  return env?.[key];
}

function envTruthy(env: ProviderQueryConfigOptions['env'], key: string) {
  const value = envValue(env, key);
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized !== '' && normalized !== '0' && normalized !== 'false' && normalized !== 'no' && normalized !== 'off'
  );
}

function anyEnvTruthy(env: ProviderQueryConfigOptions['env'], keys: readonly string[]) {
  return keys.some((key) => envTruthy(env, key));
}

function freezeProviderQueryConfig(config: ProviderQueryConfig): ProviderQueryConfig {
  Object.freeze(config.providerNames);
  Object.freeze(config.providerModels);
  Object.freeze(config.retry);
  Object.freeze(config.budget);
  Object.freeze(config.gates);
  return Object.freeze(config);
}

export function buildProviderQueryConfig(options: ProviderQueryConfigOptions): ProviderQueryConfig {
  const env = options.env ?? process.env;
  const providerNames = options.providers.map((provider) => provider.name);
  const providerModels = options.providers.map((provider) => provider.model ?? options.model);

  return freezeProviderQueryConfig({
    version: 1,
    sessionId: options.sessionId,
    model: options.model,
    providerNames,
    providerModels,
    retry: {
      maxRetries: options.providerMaxRetries ?? 0,
    },
    budget: {
      maxTokens: options.maxTokensBudget ?? null,
    },
    stream: options.stream ?? false,
    gates: {
      streamingToolExecution: anyEnvTruthy(env, [
        'XENESIS_STREAMING_TOOL_EXECUTION',
        'CLAUDE_CODE_STREAMING_TOOL_EXECUTION',
      ]),
      emitToolUseSummaries: anyEnvTruthy(env, [
        'XENESIS_EMIT_TOOL_USE_SUMMARIES',
        'CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES',
      ]),
      antUser: envValue(env, 'XENESIS_USER_TYPE') === 'ant' || envValue(env, 'USER_TYPE') === 'ant',
      fastModeEnabled: !anyEnvTruthy(env, ['XENESIS_DISABLE_FAST_MODE', 'CLAUDE_CODE_DISABLE_FAST_MODE']),
    },
  });
}
