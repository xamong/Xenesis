import { describe, it, expect, vi, afterEach } from "vitest";
import { AnthropicProvider } from "../../src/providers/anthropicProvider.js";
import { ProviderHttpError } from "../../src/providers/providerHttpError.js";
import type { ProviderRequest } from "../../src/providers/types.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function request(): ProviderRequest {
  return { model: "claude-test", messages: [{ role: "user", content: "hi" }], tools: [] };
}

describe("AnthropicProvider surfaces structured HTTP errors", () => {
  it("throws a ProviderHttpError (status + retryAfterMs) on a 429 and preserves it through complete()", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rate limited", { status: 429, headers: { "retry-after": "2" } }))
    );
    const provider = new AnthropicProvider({ apiKey: "test-key", model: "claude-test" });

    let caught: unknown;
    try {
      await provider.complete(request());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ProviderHttpError);
    expect((caught as ProviderHttpError).status).toBe(429);
    expect((caught as ProviderHttpError).retryAfterMs).toBe(2000);
  });
});
