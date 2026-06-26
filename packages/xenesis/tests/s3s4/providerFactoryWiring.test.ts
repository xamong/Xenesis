import { describe, it, expect, afterEach } from "vitest";
import {
  registerProviderFactory,
  resetProviderFactories
} from "../../src/providers/providerFactory.js";
import type { AgentProvider } from "../../src/providers/types.js";
import { createProvider } from "../../src/core/AgentRuntimeFactory.js";
import type { XenesisConfig } from "../../src/config/types.js";

afterEach(() => resetProviderFactories());

const caps = {
  supportsTools: true,
  requiresApiKey: false,
  transport: "http-streaming",
  streaming: true,
  persistentSession: false
} as const;

// createProvider only reads provider/model/apiKeyEnv/baseURL off the config;
// cast a minimal object so we exercise the real e2e wiring without a full config.
function configFor(provider: string, model = "m"): XenesisConfig {
  return { provider, model } as unknown as XenesisConfig;
}

describe("createProvider <-> registerProviderFactory wiring (Spec section 5)", () => {
  it("uses a registered EXTERNAL factory (name absent from the ProviderName tuple)", () => {
    const fake: AgentProvider = {
      name: "my-gateway",
      complete: async () => ({ message: { role: "assistant", content: "" } })
    };
    let receivedOpts: { name: string; model: string } | undefined;
    registerProviderFactory(
      "my-gateway",
      (opts) => {
        receivedOpts = { name: opts.name, model: opts.model };
        return fake;
      },
      caps as never
    );

    // Before the fix this threw a TypeError inside resolveProviderSettings
    // (providerPresets["my-gateway"] is undefined) for an external provider.
    const provider = createProvider(configFor("my-gateway", "gw-model"), {} as NodeJS.ProcessEnv);

    expect(provider).toBe(fake);
    expect(receivedOpts).toEqual({ name: "my-gateway", model: "gw-model" });
    // withProviderModel backfills model when the factory leaves it unset.
    expect(provider.model).toBe("gw-model");
  });

  it("does not throw resolving settings for an external provider with no preset", () => {
    registerProviderFactory(
      "edge-gateway",
      () => ({
        name: "edge-gateway",
        complete: async () => ({ message: { role: "assistant", content: "" } })
      }),
      caps as never
    );
    expect(() =>
      createProvider(configFor("edge-gateway"), {} as NodeJS.ProcessEnv)
    ).not.toThrow();
  });

  it("falls through to built-in providers when no factory is registered", () => {
    const provider = createProvider(configFor("mock"), {} as NodeJS.ProcessEnv);
    expect(provider.name).toBe("mock");
  });
});
