export interface XenesisRunProviderRuntimeOverride {
  provider?: string;
  model?: string;
  profile?: string;
  baseURL?: string;
  apiKeyEnv?: string;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function plainRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  return value as Record<string, unknown>;
}

export function normalizeXenesisRunProviderRuntimeRequest(
  raw: Record<string, unknown>,
): XenesisRunProviderRuntimeOverride | undefined {
  const nested = plainRecord(raw.providerRuntime);
  const source = nested ?? raw;
  const fallback = nested ? raw : undefined;
  const provider = optionalText(source.provider) ?? optionalText(fallback?.provider);
  const model = optionalText(source.model) ?? optionalText(fallback?.model);
  const profile =
    optionalText(source.providerProfile) ??
    optionalText(source.profile) ??
    optionalText(fallback?.providerProfile) ??
    optionalText(fallback?.profile);
  const baseURL =
    optionalText(source.baseURL) ??
    optionalText(source.baseUrl) ??
    optionalText(fallback?.baseURL) ??
    optionalText(fallback?.baseUrl);
  const apiKeyEnv = optionalText(source.apiKeyEnv) ?? optionalText(fallback?.apiKeyEnv);
  const providerRuntime: XenesisRunProviderRuntimeOverride = {
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    ...(profile ? { profile } : {}),
    ...(baseURL ? { baseURL } : {}),
    ...(apiKeyEnv ? { apiKeyEnv } : {}),
  };
  return Object.keys(providerRuntime).length > 0 ? providerRuntime : undefined;
}
