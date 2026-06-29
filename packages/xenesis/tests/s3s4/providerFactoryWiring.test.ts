import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, afterEach } from "vitest";
import {
  registerProviderFactory,
  resetProviderFactories
} from "../../src/providers/providerFactory.js";
import type { AgentProvider } from "../../src/providers/types.js";
import { createProvider, resolveFallbackChain, selectTools } from "../../src/core/AgentRuntimeFactory.js";
import type { XenesisConfig } from "../../src/config/types.js";

afterEach(() => resetProviderFactories());

const caps = {
  supportsTools: true,
  requiresApiKey: false,
  transport: "http-streaming",
  streaming: true,
  persistentSession: false
} as const;

const keyedCaps = {
  ...caps,
  requiresApiKey: true
} as const;

// createProvider only reads provider/model/apiKeyEnv/baseURL off the config;
// cast a minimal object so we exercise the real e2e wiring without a full config.
function configFor(provider: string, model = "m"): XenesisConfig {
  return { provider, model } as unknown as XenesisConfig;
}

function configWithFallbacks(provider: string, providerFallbacks: Array<{ provider: string; model?: string }> = []): XenesisConfig {
  return {
    provider,
    model: "m",
    providerFallbacks
  } as unknown as XenesisConfig;
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

  it("applies credential readiness before constructing registered keyed providers", () => {
    let factoryCalls = 0;
    registerProviderFactory(
      "keyed-gateway",
      () => {
        factoryCalls += 1;
        return {
          name: "keyed-gateway",
          complete: async () => ({ message: { role: "assistant", content: "" } })
        };
      },
      keyedCaps as never
    );

    expect(() =>
      createProvider(
        {
          ...configFor("keyed-gateway"),
          apiKeyEnv: "KEYED_GATEWAY_API_KEY"
        } as XenesisConfig,
        {} as NodeJS.ProcessEnv
      )
    ).toThrow(/missing provider credentials.*keyed-gateway.*KEYED_GATEWAY_API_KEY/i);
    expect(factoryCalls).toBe(0);
  });

  it("blocks the built-in mock provider unless the explicit test gate is enabled", () => {
    expect(() => createProvider(configFor("mock"), {} as NodeJS.ProcessEnv))
      .toThrow(/mock provider is blocked|provider mock is blocked/i);
  });

  it("allows the built-in mock provider when the explicit test gate is enabled", () => {
    const provider = createProvider(
      configFor("mock"),
      { XENESIS_ENABLE_TEST_MOCK_PROVIDER: "true" } as NodeJS.ProcessEnv
    );
    expect(provider.name).toBe("mock");
  });

  it("throws a missing credential error for openai without OPENAI_API_KEY", () => {
    expect(() => createProvider(configFor("openai"), {} as NodeJS.ProcessEnv))
      .toThrow(/missing provider credentials.*openai.*OPENAI_API_KEY/i);
  });

  it("does not use configured fallbacks when the primary provider is missing credentials", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "xenesis-codex-fallback-home-"));
    await writeFile(join(codexHome, "auth.json"), "{}", "utf8");

    expect(() =>
      createProvider(
        configWithFallbacks("openai", [{ provider: "codex-app-server" }]),
        { CODEX_HOME: codexHome } as NodeJS.ProcessEnv
      )
    ).toThrow(/missing provider credentials.*openai.*OPENAI_API_KEY/i);
  });

  it("throws a missing credential error for auto when no provider credentials are present", () => {
    expect(() =>
      createProvider(configFor("auto"), {} as NodeJS.ProcessEnv, {
        existsSync: () => false,
        homeDir: join(tmpdir(), "xenesis-no-provider-auth")
      })
    ).toThrow(/missing provider credentials|missing credentials/i);
  });

  it("resolves auto with CODEX_HOME auth to codex-app-server", async () => {
    const codexHome = await mkdtemp(join(tmpdir(), "xenesis-codex-home-"));
    await writeFile(join(codexHome, "auth.json"), "{}", "utf8");

    const provider = createProvider(
      configFor("auto"),
      { CODEX_HOME: codexHome } as NodeJS.ProcessEnv
    );

    expect(provider.name).toBe("codex-app-server");
  });

  it("applies readiness checks to fallback candidates", () => {
    const result = resolveFallbackChain(
      configWithFallbacks("openai", [
        { provider: "anthropic", model: "claude-sonnet-4-5" },
        { provider: "mock", model: "mock-model" }
      ]),
      {} as NodeJS.ProcessEnv
    );

    expect(result.chain).toEqual([]);
    expect(result.skipped).toEqual([
      { label: "anthropic:claude-sonnet-4-5", reason: "no-credential" },
      { label: "mock:mock-model", reason: "no-credential" }
    ]);
  });

  it("CLI provider construction delegates to the core provider factory", async () => {
    const source = await readFile(
      new URL("../../src/cli/main.ts", import.meta.url),
      "utf8"
    );

    expect(source).toMatch(/createProvider as createResolvedProvider/);
    expect(source).toMatch(/function createProvider\(config: XenesisConfig, env: NodeJS\.ProcessEnv\): AgentProvider\s*\{\s*return createResolvedProvider\(config, env\);\s*\}/);
  });

  it("xenesis init defaults to the shared auto provider instead of openai", async () => {
    const source = await readFile(
      new URL("../../src/cli/main.ts", import.meta.url),
      "utf8"
    );

    expect(source).toMatch(/env\.XENESIS_PROVIDER \? parseProviderName\(env\.XENESIS_PROVIDER\) : defaultConfig\.provider/);
    expect(source).not.toMatch(/env\.XENESIS_PROVIDER \? parseProviderName\(env\.XENESIS_PROVIDER\) : "openai"/);
  });

  it("readonly tool filtering is independent of the configured provider name", async () => {
    const selected = selectTools(
      {
        ...configFor("mock"),
        approvalMode: "readonly"
      } as XenesisConfig,
      new Map([
        ["read", {}],
        ["shell", {}],
        ["write", {}],
        ["edit", {}],
        ["patch", {}]
      ]) as never
    );

    expect(Array.from(selected.keys())).toEqual(["read"]);

    const coreSource = await readFile(
      new URL("../../src/core/AgentRuntimeFactory.ts", import.meta.url),
      "utf8"
    );
    const cliSource = await readFile(
      new URL("../../src/cli/main.ts", import.meta.url),
      "utf8"
    );

    expect(coreSource).not.toMatch(/approvalMode !== ["']readonly["'] \|\| config\.provider === ["']mock["']/);
    expect(cliSource).not.toMatch(/approvalMode !== ["']readonly["'] \|\| config\.provider === ["']mock["']/);
  });

  it("runAgentPipeline disposes persistent providers after each run", async () => {
    const source = await readFile(
      new URL("../../src/core/AgentRunPipeline.ts", import.meta.url),
      "utf8"
    );

    expect(source).toMatch(/finally\s*\{\s*await disposePipelineRunner\(built\.runner\);\s*\}/);
    expect(source).toMatch(/finally\s*\{\s*await disposePipelineRunner\(fixBuilt\.runner\);\s*\}/);
  });
});
