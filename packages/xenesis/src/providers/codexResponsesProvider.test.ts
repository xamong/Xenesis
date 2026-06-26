import { afterEach, describe, expect, it, vi } from "vitest";
import type { CodexResponsesClient } from "./codexClient.js";
import {
  CODEX_RESPONSES_CAPABILITIES,
  createCodexResponsesProvider,
  registerCodexResponsesProvider
} from "./codexResponsesProvider.js";
import { capabilitiesFor, getProviderFactory, resetProviderFactories } from "./index.js";
import type { ProviderRequest } from "./types.js";

const AUTH = { accessToken: "tok", accountId: "acc" };

function factoryWith(create: ReturnType<typeof vi.fn>) {
  return (): CodexResponsesClient => ({
    responses: { create: create as CodexResponsesClient["responses"]["create"] }
  });
}

const REQUEST = {
  messages: [{ role: "user", content: "hi" }],
  tools: [],
  queryConfig: { budget: { maxTokens: 4096 } }
} as unknown as ProviderRequest;

afterEach(() => {
  resetProviderFactories();
  vi.restoreAllMocks();
});

describe("createCodexResponsesProvider", () => {
  it("returns an OpenAIProvider-shaped provider named codex-responses with the model", () => {
    const p = createCodexResponsesProvider({
      model: "gpt-5-codex",
      auth: AUTH,
      openaiFactory: factoryWith(vi.fn())
    });
    expect(p.name).toBe("codex-responses");
    expect(p.model).toBe("gpt-5-codex");
    expect(typeof p.complete).toBe("function");
    expect(typeof p.stream).toBe("function");
  });

  it("routes complete() through the codex-sanitized client (store:false, no max_output_tokens, encrypted reasoning)", async () => {
    const create = vi.fn().mockResolvedValue({ output: [], usage: { input_tokens: 10, output_tokens: 2 } });
    const p = createCodexResponsesProvider({ model: "gpt-5-codex", auth: AUTH, openaiFactory: factoryWith(create) });
    await p.complete(REQUEST);
    const sent = create.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.store).toBe(false);
    expect(sent.include).toEqual(["reasoning.encrypted_content"]);
    expect(sent).not.toHaveProperty("max_output_tokens"); // stripped even though queryConfig set it
  });
});

describe("registerCodexResponsesProvider", () => {
  it("registers a codex-responses factory selectable by name with no-api-key, tool+streaming capabilities", () => {
    registerCodexResponsesProvider({ auth: AUTH, openaiFactory: factoryWith(vi.fn()) });
    const factory = getProviderFactory("codex-responses");
    expect(factory).toBeDefined();
    const provider = factory!({ name: "codex-responses", model: "gpt-5-codex", env: process.env });
    expect(provider.name).toBe("codex-responses");
    expect(provider.model).toBe("gpt-5-codex");
    const caps = capabilitiesFor("codex-responses");
    expect(caps?.requiresApiKey).toBe(false);
    expect(caps?.supportsTools).toBe(true);
    expect(caps?.streaming).toBe(true);
    expect(CODEX_RESPONSES_CAPABILITIES.transport).toBe("http-streaming");
  });
});
