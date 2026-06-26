import { describe, it, expect, afterEach } from "vitest";
import { registerProviderFactory, getProviderFactory, getRegisteredCapabilities, resetProviderFactories } from "../../src/providers/providerFactory.js";

afterEach(() => resetProviderFactories());

const caps = { supportsTools: true, requiresApiKey: false, transport: "http-streaming", streaming: true, persistentSession: false } as const;

describe("registerProviderFactory", () => {
  it("registers + retrieves a factory and its capabilities", () => {
    const fake = { name: "x", complete: async () => ({ message: { role: "assistant", content: "" } }) } as any;
    registerProviderFactory("my-gateway", () => fake, caps as any);
    expect(getProviderFactory("my-gateway")).toBeTypeOf("function");
    expect(getProviderFactory("my-gateway")!({ name: "my-gateway", model: "m", env: {} })).toBe(fake);
    expect(getRegisteredCapabilities("my-gateway")).toEqual(caps);
  });
  it("returns undefined for unregistered names (built-ins use fallthrough)", () => {
    expect(getProviderFactory("anthropic")).toBeUndefined();
    expect(getRegisteredCapabilities("anthropic")).toBeUndefined();
  });
  it("resetProviderFactories clears the registry", () => {
    registerProviderFactory("tmp", (() => ({})) as any, caps as any);
    resetProviderFactories();
    expect(getProviderFactory("tmp")).toBeUndefined();
  });
});
