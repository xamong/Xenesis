import { describe, expect, test } from 'vitest';
import { defaultConfig, providerNames, type XenesisConfig } from '../../src/config/types.js';
import {
  assertRuntimeProviderReady,
  type ProviderSelectionResult,
  resolveRuntimeProviderSelection,
} from '../../src/providers/runtimeProviderResolution.js';

function config(overrides: Partial<XenesisConfig> = {}): XenesisConfig {
  return {
    ...defaultConfig,
    provider: 'auto',
    model: 'test-model',
    xenesisHome: 'C:/xenesis-home',
    workspace: 'C:/workspace',
    ...overrides,
  };
}

function resolverOptions(existingPaths: string[] = []) {
  const normalized = new Set(existingPaths.map((path) => path.replaceAll('\\', '/')));
  return {
    homeDir: 'C:/Users/Test',
    existsSync: (path: string) => normalized.has(path.replaceAll('\\', '/')),
  };
}

function expectReady(selection: ProviderSelectionResult) {
  expect(selection.credentialState).toBe('present');
  expect(selection.safeForReasoning).toBe(true);
  expect(() => assertRuntimeProviderReady(selection)).not.toThrow();
}

describe('runtime provider resolution', () => {
  test('providerNames accepts auto', () => {
    expect(providerNames).toContain('auto');
  });

  test('providerNames exposes explicit local HTTP providers', () => {
    expect(providerNames).toContain('ollama');
    expect(providerNames).toContain('lmstudio');
  });

  test('auto resolves CODEX_HOME auth before home Codex auth', () => {
    const selection = resolveRuntimeProviderSelection(
      config(),
      { CODEX_HOME: 'D:/codex-home', ANTHROPIC_API_KEY: 'anthropic-secret' },
      resolverOptions(['D:/codex-home/auth.json', 'C:/Users/Test/.codex/auth.json']),
    );

    expect(selection).toMatchObject({
      requestedProvider: 'auto',
      provider: 'codex-app-server',
      source: 'auto-detect',
      authMode: 'codex-login',
      credentialState: 'present',
      credentialSource: 'CODEX_HOME/auth.json',
      processModel: 'persistent-process',
      apiKeyEnv: undefined,
      fallbackProvider: undefined,
      safeForReasoning: true,
    });
    expect(selection.diagnostics).toContain('codex auth found');
    expectReady(selection);
  });

  test('auto resolves home Codex auth before Claude credentials and env keys', () => {
    const selection = resolveRuntimeProviderSelection(
      config(),
      { ANTHROPIC_API_KEY: 'anthropic-secret' },
      resolverOptions(['C:/Users/Test/.codex/auth.json', 'C:/Users/Test/.claude/.credentials.json']),
    );

    expect(selection.provider).toBe('codex-app-server');
    expect(selection.credentialSource).toBe('~/.codex/auth.json');
    expect(selection.processModel).toBe('persistent-process');
    expectReady(selection);
  });

  test('auto resolves Claude credentials before env keys', () => {
    const selection = resolveRuntimeProviderSelection(
      config(),
      { ANTHROPIC_API_KEY: 'anthropic-secret', OPENAI_API_KEY: 'openai-secret' },
      resolverOptions(['C:/Users/Test/.claude/.credentials.json']),
    );

    expect(selection).toMatchObject({
      provider: 'claude-interactive',
      authMode: 'claude-login',
      credentialState: 'present',
      credentialSource: '~/.claude/.credentials.json',
      processModel: 'persistent-process',
      safeForReasoning: true,
    });
    expectReady(selection);
  });

  test.each([
    ['ANTHROPIC_API_KEY', 'anthropic'],
    ['OPENAI_API_KEY', 'openai'],
    ['GEMINI_API_KEY', 'gemini'],
    ['OPENROUTER_API_KEY', 'openrouter'],
    ['GROQ_API_KEY', 'groq'],
    ['DEEPSEEK_API_KEY', 'deepseek'],
    ['DASHSCOPE_API_KEY', 'qwen'],
    ['MISTRAL_API_KEY', 'mistral'],
    ['XAI_API_KEY', 'xai'],
  ] as const)('explicit %s provider uses %s without leaking the secret', (apiKeyEnv, provider) => {
    const selection = resolveRuntimeProviderSelection(
      config({ provider }),
      { [apiKeyEnv]: 'secret-value' },
      resolverOptions(),
    );

    expect(selection).toMatchObject({
      requestedProvider: provider,
      provider,
      source: 'user-settings-profile',
      credentialState: 'present',
      credentialSource: apiKeyEnv,
      processModel: 'http-streaming',
      apiKeyEnv,
      safeForReasoning: true,
    });
    expect(selection).not.toHaveProperty('apiKey');
    expect(JSON.stringify(selection)).not.toContain('secret-value');
    expectReady(selection);
  });

  test('auto ignores API-key environment variables when no local login is present', () => {
    const selection = resolveRuntimeProviderSelection(
      config(),
      {
        OPENAI_API_KEY: 'openai-secret',
        ANTHROPIC_API_KEY: 'anthropic-secret',
        GEMINI_API_KEY: 'gemini-secret',
      },
      resolverOptions(),
    );

    expect(selection).toMatchObject({
      requestedProvider: 'auto',
      provider: undefined,
      source: 'auto-detect',
      credentialState: 'missing',
      credentialSource: undefined,
      apiKeyEnv: undefined,
      safeForReasoning: false,
    });
    expect(JSON.stringify(selection)).not.toContain('openai-secret');
    expect(JSON.stringify(selection)).not.toContain('anthropic-secret');
    expect(JSON.stringify(selection)).not.toContain('gemini-secret');
    expect(selection.diagnostics.join('\n')).not.toContain('OPENAI_API_KEY');
    expect(() => assertRuntimeProviderReady(selection)).toThrow(/missing provider credentials/i);
  });

  test('explicit LM Studio provider is local HTTP and does not require credentials', () => {
    const selection = resolveRuntimeProviderSelection(config({ provider: 'lmstudio' }), {}, resolverOptions());

    expect(selection).toMatchObject({
      requestedProvider: 'lmstudio',
      provider: 'lmstudio',
      source: 'user-settings-profile',
      authMode: 'none',
      credentialState: 'present',
      baseURL: 'http://127.0.0.1:1234/v1',
      processModel: 'http-streaming',
      safeForReasoning: true,
    });
    expectReady(selection);
  });

  test('auto with no credentials returns structured missing credentials and does not select codex-cli', () => {
    const selection = resolveRuntimeProviderSelection(config(), {}, resolverOptions());

    expect(selection).toMatchObject({
      requestedProvider: 'auto',
      provider: undefined,
      source: 'auto-detect',
      credentialState: 'missing',
      credentialSource: undefined,
      fallbackProvider: undefined,
      safeForReasoning: false,
    });
    expect(selection.diagnostics.join('\n')).toContain('missing credentials');
    expect(selection.diagnostics.join('\n')).not.toContain('codex-cli');
    expect(() => assertRuntimeProviderReady(selection)).toThrow(/missing provider credentials/i);
  });

  test('explicit openai without OPENAI_API_KEY returns missing credential without selecting another provider', () => {
    const selection = resolveRuntimeProviderSelection(
      config({ provider: 'openai' }),
      {},
      resolverOptions(['C:/Users/Test/.codex/auth.json', 'C:/Users/Test/.claude/.credentials.json']),
    );

    expect(selection).toMatchObject({
      requestedProvider: 'openai',
      provider: 'openai',
      source: 'user-settings-profile',
      authMode: 'api-key',
      credentialState: 'missing',
      credentialSource: undefined,
      apiKeyEnv: 'OPENAI_API_KEY',
      processModel: 'http-streaming',
      fallbackProvider: undefined,
      safeForReasoning: false,
    });
    expect(() => assertRuntimeProviderReady(selection)).toThrow(/openai.*OPENAI_API_KEY/i);
  });

  test('explicit openai-compatible without baseURL is blocked before provider construction', () => {
    const selection = resolveRuntimeProviderSelection(
      config({ provider: 'openai-compatible', baseURL: undefined }),
      { XENESIS_API_KEY: 'secret-value' },
      resolverOptions(),
    );

    expect(selection).toMatchObject({
      requestedProvider: 'openai-compatible',
      provider: 'openai-compatible',
      source: 'user-settings-profile',
      credentialState: 'blocked',
      credentialSource: undefined,
      baseURL: undefined,
      safeForReasoning: false,
    });
    expect(selection.diagnostics.join('\n')).toMatch(/baseURL/i);
    expect(JSON.stringify(selection)).not.toContain('secret-value');
    expect(() => assertRuntimeProviderReady(selection)).toThrow(/openai-compatible.*blocked/i);
  });

  test('explicit unknown provider is blocked without selecting a fallback provider', () => {
    const selection = resolveRuntimeProviderSelection(
      config({ provider: 'not-a-provider' as XenesisConfig['provider'] }),
      { OPENAI_API_KEY: 'openai-secret' },
      resolverOptions(['C:/Users/Test/.codex/auth.json']),
    );

    expect(selection).toMatchObject({
      requestedProvider: 'not-a-provider',
      provider: 'not-a-provider',
      source: 'user-settings-profile',
      credentialState: 'blocked',
      credentialSource: undefined,
      fallbackProvider: undefined,
      safeForReasoning: false,
    });
    expect(selection.diagnostics.join('\n')).toMatch(/not registered/i);
    expect(() => assertRuntimeProviderReady(selection)).toThrow(/not-a-provider.*blocked/i);
  });

  test('explicit mock is rejected unless the test mock provider env gate is enabled', () => {
    const blocked = resolveRuntimeProviderSelection(config({ provider: 'mock' }), {}, resolverOptions());

    expect(blocked).toMatchObject({
      requestedProvider: 'mock',
      provider: 'mock',
      credentialState: 'blocked',
      processModel: 'local-server',
      safeForReasoning: false,
    });
    expect(() => assertRuntimeProviderReady(blocked)).toThrow(/mock provider is blocked/i);

    const allowed = resolveRuntimeProviderSelection(
      config({ provider: 'mock' }),
      { XENESIS_ENABLE_TEST_MOCK_PROVIDER: 'true' },
      resolverOptions(),
    );

    expect(allowed).toMatchObject({
      requestedProvider: 'mock',
      provider: 'mock',
      credentialState: 'present',
      safeForReasoning: true,
    });
    expectReady(allowed);
  });

  test('local CLI selection is not an input to package provider resolution', () => {
    const withoutLocalCli = resolveRuntimeProviderSelection(
      config(),
      { OPENAI_API_KEY: 'openai-secret' },
      resolverOptions(),
    );
    const withLocalCli = resolveRuntimeProviderSelection(
      { ...config(), localCli: { selectedAgentId: 'claude' } } as XenesisConfig,
      { OPENAI_API_KEY: 'openai-secret' },
      resolverOptions(),
    );

    expect(withLocalCli).toEqual(withoutLocalCli);
    expect(JSON.stringify(withLocalCli)).not.toContain('selectedAgentId');
  });
});
