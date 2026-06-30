import { providerNames } from '../config/types.js';
import type { ProviderCapabilities } from './registry.js';
import type { AgentProvider } from './types.js';

export type ProviderFactory = (opts: {
  name: string;
  model: string;
  apiKey?: string;
  baseURL?: string;
  env: NodeJS.ProcessEnv;
}) => AgentProvider;

const providerFactoryMap = new Map<string, ProviderFactory>();
const customCapabilitiesMap = new Map<string, ProviderCapabilities>();
const reservedProviderFactoryNames = new Set<string>(providerNames);

export function registerProviderFactory(
  name: string,
  factory: ProviderFactory,
  capabilities: ProviderCapabilities,
): void {
  const key = name.trim();
  if (key.length === 0) throw new Error('Provider factory name is required.');
  if (reservedProviderFactoryNames.has(key)) {
    throw new Error(`Cannot register provider factory for reserved provider name "${key}".`);
  }
  providerFactoryMap.set(key, factory);
  customCapabilitiesMap.set(key, capabilities);
}
export function getProviderFactory(name: string): ProviderFactory | undefined {
  return providerFactoryMap.get(name);
}
export function getRegisteredCapabilities(name: string): ProviderCapabilities | undefined {
  return customCapabilitiesMap.get(name);
}
export function resetProviderFactories(): void {
  providerFactoryMap.clear();
  customCapabilitiesMap.clear();
}
