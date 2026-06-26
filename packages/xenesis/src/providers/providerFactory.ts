import type { AgentProvider } from "./types.js";
import type { ProviderCapabilities } from "./registry.js";

export type ProviderFactory = (opts: {
  name: string; model: string; apiKey?: string; baseURL?: string; env: NodeJS.ProcessEnv;
}) => AgentProvider;

const providerFactoryMap = new Map<string, ProviderFactory>();
const customCapabilitiesMap = new Map<string, ProviderCapabilities>();

export function registerProviderFactory(name: string, factory: ProviderFactory, capabilities: ProviderCapabilities): void {
  providerFactoryMap.set(name, factory);
  customCapabilitiesMap.set(name, capabilities);
}
export function getProviderFactory(name: string): ProviderFactory | undefined { return providerFactoryMap.get(name); }
export function getRegisteredCapabilities(name: string): ProviderCapabilities | undefined { return customCapabilitiesMap.get(name); }
export function resetProviderFactories(): void { providerFactoryMap.clear(); customCapabilitiesMap.clear(); }
