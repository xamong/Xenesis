// src/extensions/curator/auxClient.ts
// Production wiring: a DEDICATED, ISOLATED aux-model runner for the autonomous background
// subsystems (curator Tier-B, commitments extraction/surfacing).
//
// ISOLATION (satisfies safety #3 prompt-cache isolation + #5 aux/out-of-loop):
//   - Builds its OWN provider client via the existing provider factory — NEVER the interactive
//     agent loop's client/session. Each call is a one-shot text-in/text-out request.
//   - TOOLS ARE DISABLED: every request is sent with `tools: []`, so the model can never call a
//     tool from a background pass.
//   - No system prompt, no conversation history, no cache_control → the main interactive prompt
//     cache is never read or appended to.
//
// The runner shape ({prompt, provider?, model?, timeoutMs}) is shared by CuratorModelRunner and
// CommitmentModelRunner, so one factory feeds both subsystems with the SAME dedicated client.
import type { ProviderName, XenesisConfig } from '../../config/types.js';
import { createProvider } from '../../core/AgentRuntimeFactory.js';
import type { AgentProvider } from '../../providers/index.js';

/** A text-in/text-out aux runner (matches CuratorModelRunner / CommitmentModelRunner). */
export type AuxModelRunner = (params: {
  prompt: string;
  provider?: string;
  model?: string;
  timeoutMs: number;
}) => Promise<string>;

/**
 * Builds a dedicated aux runModel from the base config + env. The returned runner constructs a
 * STANDALONE provider client (per call, using the explicit aux provider/model the caller passes —
 * falling back to a sensible default) and invokes `complete` with TOOLS DISABLED.
 *
 * `defaultProvider`/`defaultModel` are the resolver-supplied aux defaults; callers (Tier-B,
 * commitments) pass their own resolved provider/model per request, which take precedence.
 */
export function createAuxModelRunner(options: {
  config: XenesisConfig;
  env: NodeJS.ProcessEnv;
  defaultProvider: ProviderName;
  defaultModel: string;
}): AuxModelRunner {
  const { config, env, defaultProvider, defaultModel } = options;
  // Cache one provider instance per provider+model so repeated background passes don't re-build a
  // client every tick. Keyed by `${provider}:${model}` — never shared with the agent loop.
  const cache = new Map<string, AgentProvider>();

  return async (params) => {
    const provider = (params.provider as ProviderName | undefined) ?? defaultProvider;
    const model = params.model?.trim() ? params.model.trim() : defaultModel;
    const key = `${provider}:${model}`;
    let client = cache.get(key);
    if (!client) {
      // Mirror how the agent builds a provider, but STANDALONE: override provider+model on a shallow
      // config clone so credential/baseURL resolution still works, then build a fresh client.
      const auxConfig: XenesisConfig = { ...config, provider, model };
      client = createProvider(auxConfig, env);
      cache.set(key, client);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1, params.timeoutMs));
    if (typeof timer === 'object' && timer && 'unref' in timer && typeof timer.unref === 'function') {
      timer.unref();
    }
    try {
      const response = await client.complete({
        model,
        messages: [{ role: 'user', content: params.prompt }],
        tools: [], // TOOLS DISABLED — background aux pass can never call a tool.
        signal: controller.signal,
      });
      return String(response.message.content ?? '');
    } finally {
      clearTimeout(timer);
    }
  };
}
