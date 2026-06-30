import { type CodexAuth, readCodexAuth } from './codexAuth.js';
import { buildCodexClient, type CodexReasoningEffort, type CodexResponsesClient } from './codexClient.js';
import { OpenAIProvider } from './openaiProvider.js';
import { registerProviderFactory } from './providerFactory.js';
import type { ProviderCapabilities } from './registry.js';

// Option B: the embedded Desk agent runs codex as a pure MODEL via the ChatGPT
// Codex backend Responses API. Xenesis owns the loop/tools/approvals; this
// provider is just OpenAIProvider (which already speaks /responses) wired to the
// codex backend client (base_url + OAuth + param sanitize). No codex binary, no
// plugin/tool_search bloat — Xenesis sends exactly its composed (lean) input.
export interface CodexResponsesProviderOptions {
  model: string;
  name?: string;
  auth?: CodexAuth; // injectable for tests; defaults to ~/.codex/auth.json
  authPath?: string;
  reasoningEffort?: CodexReasoningEffort;
  originator?: string;
  openaiFactory?: (opts: Record<string, unknown>) => CodexResponsesClient;
}

export function createCodexResponsesProvider(opts: CodexResponsesProviderOptions): OpenAIProvider {
  const auth = opts.auth ?? readCodexAuth(opts.authPath);
  const client = buildCodexClient({
    auth,
    originator: opts.originator ?? 'xenesis',
    reasoningEffort: opts.reasoningEffort,
    openaiFactory: opts.openaiFactory,
  });
  return new OpenAIProvider({ name: opts.name ?? 'codex-responses', model: opts.model, client });
}

export const CODEX_RESPONSES_CAPABILITIES: ProviderCapabilities = {
  supportsTools: true,
  requiresApiKey: false,
  transport: 'http-streaming',
  streaming: true,
  persistentSession: false,
};

export function registerCodexResponsesProvider(defaults?: Partial<CodexResponsesProviderOptions>): void {
  registerProviderFactory(
    'codex-responses',
    ({ name, model, env }) =>
      createCodexResponsesProvider({
        ...defaults,
        name,
        model,
        reasoningEffort:
          defaults?.reasoningEffort ?? (env.XENESIS_CODEX_REASONING_EFFORT as CodexReasoningEffort | undefined),
      }),
    CODEX_RESPONSES_CAPABILITIES,
  );
}
