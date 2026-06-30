import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCodexResponsesProvider } from '../providers/codexResponsesProvider.js';
import { resetProviderFactories } from '../providers/index.js';
import { createProvider } from './AgentRuntimeFactory.js';

const AUTH = { accessToken: 'tok', accountId: 'acc' };

beforeEach(() =>
  registerCodexResponsesProvider({ auth: AUTH, openaiFactory: () => ({ responses: { create: vi.fn() } }) }),
);
afterEach(() => resetProviderFactories());

describe('createProvider routing to codex-responses', () => {
  it('returns the registered codex-responses provider when config.provider is codex-responses', () => {
    const config = { provider: 'codex-responses', model: 'gpt-5-codex' } as never;
    const provider = createProvider(config, process.env);
    expect(provider.name).toBe('codex-responses');
    expect(provider.model).toBe('gpt-5-codex');
  });
});

describe('createProvider keyless guard', () => {
  it("throws an actionable error (not an opaque SDK 'Missing credentials') when a key-based provider has no resolved credential", () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const config = { provider: 'openai', model: 'gpt-4o' } as never;
      // No key in the passed env and none in process.env: instead of letting the
      // OpenAI SDK throw the opaque "Missing credentials", createProvider should
      // surface an actionable error that names the provider and the codex-responses
      // routing regression.
      expect(() => createProvider(config, {})).toThrow(/requires an API key|codex-responses/i);
    } finally {
      if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
    }
  });
});
