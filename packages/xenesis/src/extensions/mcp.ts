import { createHash } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  auth as mcpOAuthAuth,
  UnauthorizedError,
  type OAuthClientProvider,
  type OAuthDiscoveryState
} from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { CircuitBreaker } from "./mcpCircuitBreaker.js";
import { jsonSchemaToZod } from "./jsonSchemaToZod.js";
import { stripDangerousEnv } from "../core/isolation/secretScrub.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolListChangedNotificationSchema,
  type CallToolResult,
  type Implementation,
  type ListToolsResult,
  type Tool as McpServerTool
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import type { McpServerConfig, McpStdioServerConfig, McpHttpServerConfig } from "../config/index.js";
import { resolveSecretRef } from "../config/secretRef.js";
import type { AgentMessageAttachment } from "../core/messages.js";
import { isSupportedImageMime } from "../providers/multimodal.js";
import type { Tool, ToolContext, ToolRegistry } from "../tools/index.js";

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export interface McpToolResult {
  content?: unknown[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface McpResourceDefinition {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface McpReadResourceResult {
  contents?: unknown[];
  [key: string]: unknown;
}

export interface McpPromptDefinition {
  name: string;
  description?: string;
  arguments?: unknown[];
}

export interface McpPromptResult {
  description?: string;
  messages?: unknown[];
  [key: string]: unknown;
}

export interface McpToolClient {
  listTools(): Promise<McpToolDefinition[]>;
  callTool(name: string, input: unknown): Promise<McpToolResult>;
  listResources?(): Promise<McpResourceDefinition[]>;
  readResource?(uri: string): Promise<McpReadResourceResult>;
  listPrompts?(): Promise<McpPromptDefinition[]>;
  getPrompt?(name: string, args: Record<string, unknown>): Promise<McpPromptResult>;
  onListChanged?(callback: () => void | Promise<void>): void;
  close(): Promise<void>;
}

export interface CreateMcpToolsOptions {
  serverName: string;
  client: McpToolClient;
  toolFilter?: { include?: string[]; exclude?: string[] };
}

export interface RemoteMcpAuthServerConfig {
  type: "sse" | "http";
  url: string;
  headers?: Record<string, string>;
  oauth?: {
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    redirectUrl?: string;
    xaa?: boolean;
    authServerMetadataUrl?: string;
  };
}

export interface McpOAuthDiscoveryState {
  authorizationServerUrl: string;
  resourceMetadataUrl?: string;
}

export interface McpOAuthStorageEntry {
  serverName?: string;
  serverUrl?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  discoveryState?: McpOAuthDiscoveryState;
  stepUpScope?: string;
}

export interface McpAuthStorageData {
  mcpOAuth?: Record<string, McpOAuthStorageEntry>;
  mcpOAuthClientConfig?: Record<string, { clientSecret?: string }>;
}

export interface McpAuthStore {
  read(): McpAuthStorageData | undefined;
  update(data: McpAuthStorageData): void;
}

const claudeAiServerPrefix = "claude.ai ";

export function normalizeMcpNameForTool(value: string) {
  let normalized = value.trim().replace(/[^A-Za-z0-9_-]/g, "_");
  if (value.startsWith(claudeAiServerPrefix)) {
    normalized = normalized.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  }
  return normalized || "tool";
}

const MAX_TOOL_NAME = 64;
function shortHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
}
export function sanitizeMcpToolName(serverName: string, toolName: string) {
  const full = `mcp__${normalizeMcpNameForTool(serverName)}__${normalizeMcpNameForTool(toolName)}`;
  if (full.length <= MAX_TOOL_NAME) return full;
  const suffix = `-${shortHash(full)}`;
  return full.slice(0, MAX_TOOL_NAME - suffix.length) + suffix;
}
/**
 * Strip exec-hijack environment variables (LD_PRELOAD, DYLD_*, NODE_OPTIONS,
 * GIT_SSH_COMMAND, etc.) from a config-/plugin-supplied MCP stdio server env
 * before it reaches the spawned child process. Returns the input unchanged when
 * undefined so callers can pass `config.env` straight through.
 */
export function buildMcpStdioEnv(
  configEnv: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!configEnv) return configEnv;
  return stripDangerousEnv(configEnv) as Record<string, string>;
}

export function dedupeToolName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const suffix = `-${shortHash(name + String(taken.size))}`;
  const base = name.slice(0, MAX_TOOL_NAME - suffix.length);
  let candidate = base + suffix;
  let n = 0;
  while (taken.has(candidate)) {
    const s = `-${shortHash(name + String(taken.size) + String(n++))}`;
    candidate = name.slice(0, MAX_TOOL_NAME - s.length) + s;
  }
  return candidate;
}

export interface ParseMcpToolNameOptions {
  legacyServerNames?: string[];
}

export function parseMcpToolName(
  toolName: string,
  options: ParseMcpToolNameOptions = {}
): { serverName: string; toolName?: string } | undefined {
  const parts = toolName.split("__");
  const [prefix, serverName, ...toolNameParts] = parts;
  if (prefix === "mcp" && serverName) {
    return {
      serverName,
      ...(toolNameParts.length > 0 ? { toolName: toolNameParts.join("__") } : {})
    };
  }
  if (!toolName.startsWith("mcp_")) return undefined;
  const legacyName = toolName.slice("mcp_".length);
  if (!legacyName) return undefined;
  const knownServer = (options.legacyServerNames ?? [])
    .map(normalizeMcpNameForTool)
    .sort((left, right) => right.length - left.length)
    .find((candidate) => legacyName === candidate || legacyName.startsWith(`${candidate}_`));
  if (knownServer) {
    const rest = legacyName.slice(knownServer.length);
    return {
      serverName: knownServer,
      ...(rest.startsWith("_") && rest.length > 1 ? { toolName: rest.slice(1) } : {})
    };
  }
  const separator = legacyName.indexOf("_");
  if (separator === -1) return { serverName: legacyName };
  return {
    serverName: legacyName.slice(0, separator),
    toolName: legacyName.slice(separator + 1)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneAuthStorage(data: McpAuthStorageData | undefined): McpAuthStorageData | undefined {
  return data ? JSON.parse(JSON.stringify(data)) as McpAuthStorageData : undefined;
}

export function createMemoryMcpAuthStore(initial?: McpAuthStorageData): McpAuthStore {
  let state = cloneAuthStorage(initial);
  return {
    read() {
      return cloneAuthStorage(state);
    },
    update(data) {
      state = cloneAuthStorage(data);
    }
  };
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableJsonValue(value[key])])
  );
}

function stableJsonString(value: unknown): string {
  return JSON.stringify(stableJsonValue(value));
}

export function getMcpServerCredentialKey(serverName: string, serverConfig: RemoteMcpAuthServerConfig): string {
  const configJson = stableJsonString({
    type: serverConfig.type,
    url: serverConfig.url,
    headers: serverConfig.headers ?? {}
  });
  const hash = createHash("sha256").update(configJson).digest("hex").slice(0, 16);
  return `${serverName}|${hash}`;
}

const nonstandardInvalidGrantAliases = new Set([
  "invalid_refresh_token",
  "expired_refresh_token",
  "token_expired"
]);

function responseWithBody(body: string, response: Response, init?: ResponseInit) {
  return new Response(body, {
    status: init?.status ?? response.status,
    statusText: init?.statusText ?? response.statusText,
    headers: response.headers
  });
}

function isOAuthTokenResponse(value: unknown) {
  return isRecord(value) && typeof value.access_token === "string";
}

function normalizedOAuthError(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value) || typeof value.error !== "string") return undefined;
  if (nonstandardInvalidGrantAliases.has(value.error)) {
    return {
      error: "invalid_grant",
      error_description: typeof value.error_description === "string"
        ? value.error_description
        : `Server returned non-standard error code: ${value.error}`
    };
  }
  return Object.fromEntries(
    Object.entries(value).filter(([key, nextValue]) => (
      ["error", "error_description", "error_uri"].includes(key) && typeof nextValue === "string"
    ))
  );
}

export async function normalizeMcpOAuthErrorResponse(response: Response): Promise<Response> {
  if (!response.ok) return response;
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return responseWithBody(text, response);
  }
  if (isOAuthTokenResponse(parsed)) return responseWithBody(text, response);
  const oauthError = normalizedOAuthError(parsed);
  if (!oauthError) return responseWithBody(text, response);
  return responseWithBody(JSON.stringify(oauthError), response, {
    status: 400,
    statusText: "Bad Request"
  });
}

export function saveMcpClientSecret(
  store: McpAuthStore,
  serverName: string,
  serverConfig: RemoteMcpAuthServerConfig,
  clientSecret: string
): void {
  const existingData = store.read() ?? {};
  const serverKey = getMcpServerCredentialKey(serverName, serverConfig);
  store.update({
    ...existingData,
    mcpOAuthClientConfig: {
      ...existingData.mcpOAuthClientConfig,
      [serverKey]: { clientSecret }
    }
  });
}

export function getMcpClientConfig(
  store: McpAuthStore,
  serverName: string,
  serverConfig: RemoteMcpAuthServerConfig
): { clientSecret?: string } | undefined {
  const serverKey = getMcpServerCredentialKey(serverName, serverConfig);
  return store.read()?.mcpOAuthClientConfig?.[serverKey];
}

export function clearMcpClientConfig(
  store: McpAuthStore,
  serverName: string,
  serverConfig: RemoteMcpAuthServerConfig
): void {
  const existingData = store.read();
  if (!existingData?.mcpOAuthClientConfig) return;
  const serverKey = getMcpServerCredentialKey(serverName, serverConfig);
  if (!(serverKey in existingData.mcpOAuthClientConfig)) return;
  delete existingData.mcpOAuthClientConfig[serverKey];
  store.update(existingData);
}

export function saveMcpDiscoveryState(
  store: McpAuthStore,
  serverName: string,
  serverConfig: RemoteMcpAuthServerConfig,
  discoveryState: McpOAuthDiscoveryState
): void {
  const existingData = store.read() ?? {};
  const serverKey = getMcpServerCredentialKey(serverName, serverConfig);
  const existingEntry = existingData.mcpOAuth?.[serverKey];
  store.update({
    ...existingData,
    mcpOAuth: {
      ...existingData.mcpOAuth,
      [serverKey]: {
        ...existingEntry,
        serverName,
        serverUrl: serverConfig.url,
        accessToken: existingEntry?.accessToken ?? "",
        expiresAt: existingEntry?.expiresAt ?? 0,
        discoveryState: {
          authorizationServerUrl: discoveryState.authorizationServerUrl,
          ...(discoveryState.resourceMetadataUrl ? { resourceMetadataUrl: discoveryState.resourceMetadataUrl } : {})
        }
      }
    }
  });
}

export function hasMcpDiscoveryButNoToken(
  store: McpAuthStore,
  serverName: string,
  serverConfig: RemoteMcpAuthServerConfig,
  options: { xaaEnabled?: boolean } = {}
): boolean {
  if (options.xaaEnabled && serverConfig.oauth?.xaa) return false;
  const serverKey = getMcpServerCredentialKey(serverName, serverConfig);
  const entry = store.read()?.mcpOAuth?.[serverKey];
  return entry !== undefined && !entry.accessToken && !entry.refreshToken;
}

export type McpAuthCredentialInvalidationScope = "all" | "client" | "tokens" | "discovery";

export function invalidateMcpAuthCredentials(
  store: McpAuthStore,
  serverName: string,
  serverConfig: RemoteMcpAuthServerConfig,
  scope: McpAuthCredentialInvalidationScope
): void {
  const existingData = store.read();
  if (!existingData) return;
  const serverKey = getMcpServerCredentialKey(serverName, serverConfig);
  const tokenData = existingData.mcpOAuth?.[serverKey];
  switch (scope) {
    case "all":
      if (existingData.mcpOAuth) delete existingData.mcpOAuth[serverKey];
      if (existingData.mcpOAuthClientConfig) delete existingData.mcpOAuthClientConfig[serverKey];
      break;
    case "client":
      if (tokenData) {
        tokenData.clientId = undefined;
        tokenData.clientSecret = undefined;
      }
      if (existingData.mcpOAuthClientConfig) delete existingData.mcpOAuthClientConfig[serverKey];
      break;
    case "tokens":
      if (!tokenData) return;
      tokenData.accessToken = "";
      tokenData.refreshToken = undefined;
      tokenData.expiresAt = 0;
      break;
    case "discovery":
      if (!tokenData) return;
      tokenData.discoveryState = undefined;
      tokenData.stepUpScope = undefined;
      break;
  }
  store.update(existingData);
}

export interface McpBearerTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: "Bearer";
}

export type McpTokenStateDecision =
  | { status: "missing" }
  | { status: "expired_without_refresh" }
  | { status: "refresh_required"; refreshToken: string; expiresIn: number }
  | { status: "step_up_required"; expiresIn: number; tokens: McpBearerTokens }
  | { status: "usable"; expiresIn: number; tokens: McpBearerTokens };

function scopeIncludesAll(currentScope: string | undefined, requestedScope: string) {
  const currentScopes = new Set((currentScope ?? "").split(/\s+/u).filter(Boolean));
  return requestedScope.split(/\s+/u).filter(Boolean).every((scope) => currentScopes.has(scope));
}

function bearerTokens(entry: McpOAuthStorageEntry, expiresIn: number, includeRefreshToken: boolean): McpBearerTokens {
  return {
    access_token: entry.accessToken ?? "",
    ...(includeRefreshToken && entry.refreshToken ? { refresh_token: entry.refreshToken } : {}),
    expires_in: expiresIn,
    ...(entry.scope ? { scope: entry.scope } : {}),
    token_type: "Bearer"
  };
}

export function evaluateMcpTokenState(
  entry: McpOAuthStorageEntry | undefined,
  options: { now?: number; pendingStepUpScope?: string } = {}
): McpTokenStateDecision {
  if (!entry || entry.expiresAt === undefined) return { status: "missing" };
  const now = options.now ?? Date.now();
  const expiresIn = Math.floor((entry.expiresAt - now) / 1000);
  const needsStepUp = options.pendingStepUpScope !== undefined && !scopeIncludesAll(entry.scope, options.pendingStepUpScope);
  if (needsStepUp) {
    return {
      status: "step_up_required",
      expiresIn,
      tokens: bearerTokens(entry, expiresIn, false)
    };
  }
  if (expiresIn <= 0 && !entry.refreshToken) return { status: "expired_without_refresh" };
  if (expiresIn <= 300 && entry.refreshToken) {
    return {
      status: "refresh_required",
      refreshToken: entry.refreshToken,
      expiresIn
    };
  }
  return {
    status: "usable",
    expiresIn,
    tokens: bearerTokens(entry, expiresIn, true)
  };
}

export interface CreateMcpOAuthClientProviderOptions {
  serverName: string;
  serverConfig: RemoteMcpAuthServerConfig;
  config?: {
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    redirectUrl?: string;
    authServerMetadataUrl?: string;
  };
  store: McpAuthStore;
  onAuthorizationUrl?: (url: string) => void;
}

export function createMcpOAuthClientProvider(options: CreateMcpOAuthClientProviderOptions): OAuthClientProvider {
  const { serverName, serverConfig, config = {}, store } = options;
  const credentialKey = getMcpServerCredentialKey(serverName, serverConfig);
  const redirectUrl = config.redirectUrl ?? "http://127.0.0.1:0/callback";
  let codeVerifierValue: string | undefined;

  const clientMetadata: OAuthClientMetadata = {
    redirect_uris: [redirectUrl],
    client_name: "xenesis",
    grant_types: ["authorization_code", "refresh_token"],
    ...(config.scope ? { scope: config.scope } : {})
  };

  return {
    get redirectUrl() {
      return redirectUrl;
    },

    get clientMetadata() {
      return clientMetadata;
    },

    clientInformation(): OAuthClientInformationMixed | undefined {
      if (config.clientId) {
        return {
          client_id: config.clientId,
          ...(config.clientSecret ? { client_secret: config.clientSecret } : {})
        };
      }
      const data = store.read();
      const entry = data?.mcpOAuth?.[credentialKey];
      if (!entry?.clientId) return undefined;
      const storedConfig = data?.mcpOAuthClientConfig?.[credentialKey];
      return {
        client_id: entry.clientId,
        ...(entry.clientSecret || storedConfig?.clientSecret
          ? { client_secret: entry.clientSecret ?? storedConfig?.clientSecret }
          : {})
      };
    },

    saveClientInformation(clientInformation: OAuthClientInformationMixed): void {
      const existingData = store.read() ?? {};
      const existingEntry = existingData.mcpOAuth?.[credentialKey];
      store.update({
        ...existingData,
        mcpOAuth: {
          ...existingData.mcpOAuth,
          [credentialKey]: {
            ...existingEntry,
            serverName,
            serverUrl: serverConfig.url,
            clientId: clientInformation.client_id,
            ...(clientInformation.client_secret ? { clientSecret: clientInformation.client_secret } : {}),
            accessToken: existingEntry?.accessToken ?? "",
            expiresAt: existingEntry?.expiresAt ?? 0
          }
        },
        mcpOAuthClientConfig: {
          ...existingData.mcpOAuthClientConfig,
          [credentialKey]: {
            ...(clientInformation.client_secret ? { clientSecret: clientInformation.client_secret } : {})
          }
        }
      });
    },

    tokens(): OAuthTokens | undefined {
      const entry = store.read()?.mcpOAuth?.[credentialKey];
      const decision = evaluateMcpTokenState(entry);
      if (decision.status === "usable" || decision.status === "step_up_required") {
        return decision.tokens;
      }
      if (decision.status === "refresh_required" && entry?.refreshToken) {
        return bearerTokens(entry, decision.expiresIn, true);
      }
      return undefined;
    },

    saveTokens(tokens: OAuthTokens): void {
      const existingData = store.read() ?? {};
      const existingEntry = existingData.mcpOAuth?.[credentialKey];
      const expiresIn = tokens.expires_in ?? 3600;
      store.update({
        ...existingData,
        mcpOAuth: {
          ...existingData.mcpOAuth,
          [credentialKey]: {
            ...existingEntry,
            serverName,
            serverUrl: serverConfig.url,
            ...(config.clientId ? { clientId: config.clientId } : {}),
            accessToken: tokens.access_token,
            ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
            expiresAt: Date.now() + expiresIn * 1000,
            ...(tokens.scope ? { scope: tokens.scope } : config.scope ? { scope: config.scope } : {})
          }
        }
      });
    },

    redirectToAuthorization(authorizationUrl: URL): void {
      if (options.onAuthorizationUrl) {
        options.onAuthorizationUrl(String(authorizationUrl));
        return;
      }
      throw new Error(`Authorization URL: ${String(authorizationUrl)}`);
    },

    saveCodeVerifier(codeVerifier: string): void {
      codeVerifierValue = codeVerifier;
    },

    codeVerifier(): string {
      if (!codeVerifierValue) throw new Error("No code verifier saved");
      return codeVerifierValue;
    },

    saveDiscoveryState(state: OAuthDiscoveryState): void {
      saveMcpDiscoveryState(store, serverName, serverConfig, {
        authorizationServerUrl: state.authorizationServerUrl,
        ...(state.resourceMetadataUrl ? { resourceMetadataUrl: state.resourceMetadataUrl } : {})
      });
    },

    discoveryState(): OAuthDiscoveryState | undefined {
      const entry = store.read()?.mcpOAuth?.[credentialKey];
      if (!entry?.discoveryState) return undefined;
      return {
        authorizationServerUrl: entry.discoveryState.authorizationServerUrl,
        ...(entry.discoveryState.resourceMetadataUrl ? { resourceMetadataUrl: entry.discoveryState.resourceMetadataUrl } : {})
      };
    },

    invalidateCredentials(scope): void {
      if (scope === "verifier") {
        codeVerifierValue = undefined;
        return;
      }
      invalidateMcpAuthCredentials(store, serverName, serverConfig, scope);
    }
  };
}

function remoteMcpTransportKind(config: McpHttpServerConfig): "http" | "sse" {
  return config.transport === "sse" || config.type === "sse" ? "sse" : "http";
}

function remoteMcpAuthServerConfig(config: McpHttpServerConfig): RemoteMcpAuthServerConfig {
  return {
    type: remoteMcpTransportKind(config),
    url: config.url,
    ...(config.headers ? { headers: config.headers } : {})
  };
}

export interface RemoteMcpTransportOptions {
  authProvider?: OAuthClientProvider;
  requestInit?: RequestInit;
}

export function createRemoteMcpTransport(
  config: McpHttpServerConfig,
  options: RemoteMcpTransportOptions = {}
): Transport {
  const requestInit = options.requestInit ?? (config.headers ? { headers: config.headers } : undefined);
  const transportOptions = {
    ...(options.authProvider ? { authProvider: options.authProvider } : {}),
    ...(requestInit ? { requestInit } : {})
  };
  return remoteMcpTransportKind(config) === "sse"
    ? new SSEClientTransport(new URL(config.url), transportOptions)
    : new StreamableHTTPClientTransport(new URL(config.url), transportOptions);
}

export interface RunMcpOAuthLoginOptions {
  serverName: string;
  serverConfig: McpHttpServerConfig;
  store: McpAuthStore;
  onAuthorizationUrl?: (url: string) => void;
  authorizationCode?: string;
  env?: NodeJS.ProcessEnv;
  auth?: (
    provider: OAuthClientProvider,
    options: { serverUrl: string; authorizationCode?: string }
  ) => Promise<"AUTHORIZED" | "REDIRECT">;
}

export async function runMcpOAuthLogin(options: RunMcpOAuthLoginOptions): Promise<"authorized" | "redirect"> {
  const oauth = options.serverConfig.oauth ?? {};
  const clientSecret = oauth.clientSecret !== undefined
    ? await resolveSecretRef(oauth.clientSecret, options.env)
    : undefined;
  const provider = createMcpOAuthClientProvider({
    serverName: options.serverName,
    serverConfig: remoteMcpAuthServerConfig(options.serverConfig),
    config: {
      ...(oauth.clientId ? { clientId: oauth.clientId } : {}),
      ...(clientSecret ? { clientSecret } : {}),
      ...(oauth.scope ? { scope: oauth.scope } : {}),
      ...(oauth.redirectUrl ? { redirectUrl: oauth.redirectUrl } : {}),
      ...(oauth.authServerMetadataUrl ? { authServerMetadataUrl: oauth.authServerMetadataUrl } : {})
    },
    store: options.store,
    onAuthorizationUrl: options.onAuthorizationUrl
  });

  const authorize = options.auth ?? mcpOAuthAuth;
  const result = await authorize(provider, {
    serverUrl: options.serverConfig.url,
    ...(options.authorizationCode ? { authorizationCode: options.authorizationCode } : {})
  });
  return result === "AUTHORIZED" ? "authorized" : "redirect";
}

function stringifyContentPart(part: unknown) {
  if (isRecord(part) && part.type === "text" && "text" in part) {
    return String((part as { text: unknown }).text);
  }
  if (isRecord(part) && part.type === "resource" && isRecord(part.resource)) {
    return stringifyContentPart(part.resource);
  }
  if (isRecord(part) && "text" in part) {
    return String((part as { text: unknown }).text);
  }
  if (isRecord(part) && "blob" in part) {
    const typed = part as { uri?: unknown; mimeType?: unknown; blob: unknown };
    return `[binary resource ${String(typed.uri ?? "unknown")} ${String(typed.mimeType ?? "application/octet-stream")}]`;
  }
  if (typeof part === "string") return part;
  return JSON.stringify(part);
}

/**
 * Split MCP CallToolResult content array into a text string and image attachments.
 * Text-type parts (and any unrecognized parts) go into the text accumulator via
 * stringifyContentPart; image-type parts that are runtime-guarded and MIME-gated
 * become AgentMessageAttachment entries (kind='image', dataUrl).
 *
 * Never throws — malformed image blocks (missing data / unsupported MIME) fall
 * through to the text path instead.
 */
export function splitMcpContent(content: unknown[]): { text: string; attachments: AgentMessageAttachment[] } {
  const textParts: string[] = [];
  const attachments: AgentMessageAttachment[] = [];

  for (const part of content) {
    if (
      isRecord(part) &&
      part.type === "image" &&
      typeof part.data === "string" &&
      part.data.length > 0 &&
      typeof part.mimeType === "string" &&
      isSupportedImageMime(part.mimeType)
    ) {
      attachments.push({
        kind: "image",
        name: "mcp-image",
        mimeType: part.mimeType as string,
        dataUrl: `data:${part.mimeType};base64,${part.data}`
      });
    } else {
      const stringified = stringifyContentPart(part);
      if (stringified) textParts.push(stringified);
    }
  }

  return { text: textParts.join("\n"), attachments };
}

export function formatMcpToolResult(result: McpToolResult) {
  if (Array.isArray(result.content) && result.content.length > 0) {
    return result.content.map(stringifyContentPart).join("\n");
  }
  if (result.structuredContent) return JSON.stringify(result.structuredContent);
  return JSON.stringify(result);
}

export function formatMcpResourceResult(result: McpReadResourceResult) {
  if (Array.isArray(result.contents) && result.contents.length > 0) {
    return result.contents.map(stringifyContentPart).join("\n");
  }
  return JSON.stringify(result);
}

function stringifyPromptMessage(message: unknown) {
  if (typeof message !== "object" || message === null) return stringifyContentPart(message);
  const typed = message as { role?: unknown; content?: unknown };
  const role = typeof typed.role === "string" ? typed.role : "message";
  const content = Array.isArray(typed.content)
    ? typed.content.map(stringifyContentPart).join("\n")
    : stringifyContentPart(typed.content);
  return `${role}: ${content}`;
}

export function formatMcpPromptResult(result: McpPromptResult) {
  if (Array.isArray(result.messages) && result.messages.length > 0) {
    return result.messages.map(stringifyPromptMessage).join("\n");
  }
  return JSON.stringify(result);
}

const readResourceInputSchema = z.object({
  uri: z.string().min(1)
});

const listMcpResourcesInputSchema = z.object({
  server: z.string().min(1).optional()
});

const readMcpResourceInputSchema = z.object({
  server: z.string().min(1),
  uri: z.string().min(1)
});

const getPromptInputSchema = z.object({
  name: z.string().min(1),
  arguments: z.record(z.string()).default({})
});

function resourceSummary(resources: McpResourceDefinition[]) {
  return resources
    .map((resource) => resource.name ? `${resource.name} (${resource.uri})` : resource.uri)
    .join(", ");
}

function promptSummary(prompts: McpPromptDefinition[]) {
  return prompts.map((prompt) => prompt.name).join(", ");
}

function availableServerNames(clients: Record<string, McpToolClient>) {
  return Object.keys(clients).sort();
}

function mcpResourceLine(resource: McpResourceDefinition & { server: string }) {
  return [
    resource.server,
    resource.name ?? "(unnamed)",
    resource.uri,
    resource.mimeType,
    resource.description ? `- ${resource.description}` : undefined
  ].filter((part): part is string => Boolean(part)).join(" ");
}

async function listMcpResources(
  clients: Record<string, McpToolClient>,
  targetServer?: string
): Promise<Array<McpResourceDefinition & { server: string }>> {
  const entries = Object.entries(clients)
    .filter(([serverName]) => !targetServer || serverName === targetServer);
  const results = await Promise.all(entries.map(async ([serverName, client]) => {
    if (!client.listResources) return [];
    try {
      return (await client.listResources()).map((resource) => ({
        server: serverName,
        ...resource
      }));
    } catch {
      return [];
    }
  }));
  return results.flat();
}

function mcpPromptArguments(args: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    ])
  );
}

async function optionalList<T>(list: (() => Promise<T[]>) | undefined): Promise<T[]> {
  if (!list) return [];
  try {
    return await list();
  } catch {
    return [];
  }
}

function matchesMcpToolFilter(name: string, filter: CreateMcpToolsOptions["toolFilter"]) {
  if (!filter) return true;
  if (filter.include !== undefined && !filter.include.includes(name)) return false;
  if (filter.exclude !== undefined && filter.exclude.includes(name)) return false;
  return true;
}

export async function createMcpTools(options: CreateMcpToolsOptions): Promise<Tool[]> {
  const definitions = await options.client.listTools();
  const resources = await optionalList(options.client.listResources?.bind(options.client));
  const prompts = await optionalList(options.client.listPrompts?.bind(options.client));

  const tools: Tool[] = definitions.filter((definition) => matchesMcpToolFilter(definition.name, options.toolFilter)).map((definition) => {
    const converted = (() => { try { return jsonSchemaToZod(definition.inputSchema); } catch { return z.record(z.unknown()); } })();
    const tool: Tool<Record<string, unknown>, McpToolResult> = {
      name: sanitizeMcpToolName(options.serverName, definition.name),
      isMcp: true,
      description: `[MCP:${options.serverName}] ${definition.description ?? definition.name}`,
      inputSchema: converted,
      openaiInputSchema: converted,
      isReadOnly: () => definition.name.startsWith("read") || definition.name.startsWith("list"),
      async run(input) {
        const result = await options.client.callTool(definition.name, input);
        const { text, attachments } = Array.isArray(result.content) && result.content.length > 0
          ? splitMcpContent(result.content)
          : { text: formatMcpToolResult(result), attachments: [] };
        // When images were extracted into attachments, never fall back to
        // formatMcpToolResult — that would JSON.stringify the image part and
        // dump the full base64 blob back into model-visible `content` (and
        // double the payload, since the image is already in attachments).
        const content = attachments.length > 0
          ? (text || `[${attachments.length} image${attachments.length === 1 ? "" : "s"} attached]`)
          : (text || formatMcpToolResult(result));
        return {
          ok: result.isError !== true,
          content,
          data: result,
          ...(attachments.length > 0 ? { attachments } : {})
        };
      }
    };
    return tool;
  });

  if (resources.length > 0 && options.client.readResource) {
    const tool: Tool<z.infer<typeof readResourceInputSchema>, McpReadResourceResult> = {
      name: sanitizeMcpToolName(options.serverName, "resource_read"),
      description: `[MCP:${options.serverName}] Read an MCP resource. Available: ${resourceSummary(resources)}`,
      inputSchema: readResourceInputSchema,
      openaiInputSchema: readResourceInputSchema,
      isReadOnly: () => true,
      async run(input) {
        const result = await options.client.readResource!(input.uri);
        return {
          ok: true,
          content: formatMcpResourceResult(result),
          data: result
        };
      }
    };
    tools.push(tool);
  }

  if (prompts.length > 0 && options.client.getPrompt) {
    const tool: Tool<z.infer<typeof getPromptInputSchema>, McpPromptResult> = {
      name: sanitizeMcpToolName(options.serverName, "prompt_get"),
      description: `[MCP:${options.serverName}] Get an MCP prompt. Available: ${promptSummary(prompts)}`,
      inputSchema: getPromptInputSchema,
      openaiInputSchema: getPromptInputSchema,
      isReadOnly: () => true,
      async run(input) {
        const result = await options.client.getPrompt!(input.name, input.arguments);
        return {
          ok: true,
          content: formatMcpPromptResult(result),
          data: result
        };
      }
    };
    tools.push(tool);
  }

  return tools;
}

export function createMcpResourceTools(clients: Record<string, McpToolClient>): Tool[] {
  const listTool: Tool<z.infer<typeof listMcpResourcesInputSchema>, Array<McpResourceDefinition & { server: string }>> = {
    name: "list_mcp_resources",
    description: "List resources from connected MCP servers.",
    inputSchema: listMcpResourcesInputSchema,
    openaiInputSchema: listMcpResourcesInputSchema,
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    async run(input) {
      const serverNames = availableServerNames(clients);
      if (input.server && !(input.server in clients)) {
        return {
          ok: false,
          content: `Server "${input.server}" not found. Available servers: ${serverNames.join(", ") || "none"}`
        };
      }
      const resources = await listMcpResources(clients, input.server);
      return {
        ok: true,
        content: resources.length > 0
          ? resources.map(mcpResourceLine).join("\n")
          : "No resources found. MCP servers may still provide tools even if they have no resources.",
        data: resources
      };
    }
  };

  const readTool: Tool<z.infer<typeof readMcpResourceInputSchema>, McpReadResourceResult> = {
    name: "read_mcp_resource",
    description: "Read a specific MCP resource by server name and URI.",
    inputSchema: readMcpResourceInputSchema,
    openaiInputSchema: readMcpResourceInputSchema,
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    async run(input) {
      const serverNames = availableServerNames(clients);
      const client = clients[input.server];
      if (!client) {
        return {
          ok: false,
          content: `Server "${input.server}" not found. Available servers: ${serverNames.join(", ") || "none"}`
        };
      }
      if (!client.readResource) {
        return {
          ok: false,
          content: `Server "${input.server}" does not support resources/read.`
        };
      }
      try {
        const result = await client.readResource(input.uri);
        return {
          ok: true,
          content: formatMcpResourceResult(result),
          data: result
        };
      } catch (error) {
        return {
          ok: false,
          content: error instanceof Error ? error.message : String(error)
        };
      }
    }
  };

  return [listTool, readTool];
}

export interface CreateXenesisMcpServerOptions {
  tools: ToolRegistry | Iterable<Tool>;
  context: ToolContext | ((request: { toolName: string; arguments: Record<string, unknown> }) => ToolContext | Promise<ToolContext>);
  serverInfo?: Implementation;
}

function toolRegistryFrom(tools: ToolRegistry | Iterable<Tool>): ToolRegistry {
  if (tools instanceof Map) return tools;
  return new Map(Array.from(tools).map((tool) => [tool.name, tool]));
}

function toMcpJsonSchema(schema: z.ZodType | undefined): McpServerTool["inputSchema"] | undefined {
  if (!schema) return undefined;
  const jsonSchema = zodToJsonSchema(schema, {
    $refStrategy: "none",
    target: "jsonSchema7"
  }) as Record<string, unknown>;
  delete jsonSchema.$schema;
  if (jsonSchema.type !== "object") {
    return {
      type: "object",
      properties: {}
    };
  }
  return jsonSchema as McpServerTool["inputSchema"];
}

function readOnlyHintForTool(tool: Tool) {
  try {
    return tool.isReadOnly({} as never);
  } catch {
    return false;
  }
}

function toMcpToolDefinition(tool: Tool): McpServerTool {
  const outputSchema = toMcpJsonSchema(tool.outputSchema);
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: toMcpJsonSchema(tool.inputSchema) ?? { type: "object", properties: {} },
    ...(outputSchema ? { outputSchema } : {}),
    annotations: {
      readOnlyHint: readOnlyHintForTool(tool)
    }
  };
}

async function mcpServerContext(
  context: CreateXenesisMcpServerOptions["context"],
  request: { toolName: string; arguments: Record<string, unknown> }
): Promise<ToolContext> {
  return typeof context === "function" ? await context(request) : context;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function resultStructuredContent(data: unknown): Record<string, unknown> | undefined {
  return isRecord(data) ? data : undefined;
}

async function callXenesisToolForMcp(
  registry: ToolRegistry,
  context: CreateXenesisMcpServerOptions["context"],
  toolName: string,
  args: unknown
): Promise<CallToolResult> {
  const tool = registry.get(toolName);
  if (!tool) throw new Error(`Tool ${toolName} not found`);
  const rawInput = isRecord(args) ? args : {};
  const parsedInput = tool.inputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    throw new Error(`Tool ${toolName} input is invalid: ${parsedInput.error.issues.map((issue) => issue.message).join("; ")}`);
  }
  let input = parsedInput.data;
  const toolContext = await mcpServerContext(context, {
    toolName,
    arguments: rawInput
  });
  const validationResult = await tool.validateInput?.(input);
  if (validationResult && !validationResult.result) {
    throw new Error(`Tool ${toolName} input is invalid: ${validationResult.message}`);
  }
  const permission = await tool.checkPermissions?.(input);
  if (permission?.behavior === "deny") {
    throw new Error(permission.message || `Tool ${toolName} permission denied`);
  }
  if (permission?.behavior === "ask") {
    throw new Error(permission.message || `Tool ${toolName} requires permission`);
  }
  if (permission) {
    input = permission.updatedInput;
  }
  const result = await tool.run(input, toolContext);
  if (!result.ok) throw new Error(result.content || `Tool ${toolName} failed`);
  return {
    content: [{ type: "text", text: result.content }],
    ...(resultStructuredContent(result.data) ? { structuredContent: resultStructuredContent(result.data) } : {})
  };
}

export function createXenesisMcpServer(options: CreateXenesisMcpServerOptions): Server {
  const registry = toolRegistryFrom(options.tools);
  const server = new Server(
    options.serverInfo ?? { name: "xenesis", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => ({
    tools: Array.from(registry.values()).map(toMcpToolDefinition)
  }));

  server.setRequestHandler(CallToolRequestSchema, async ({ params }): Promise<CallToolResult> => {
    try {
      return await callXenesisToolForMcp(registry, options.context, params.name, params.arguments);
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: errorMessage(error) }]
      };
    }
  });

  return server;
}

export async function startXenesisMcpServer(options: CreateXenesisMcpServerOptions): Promise<void> {
  const server = createXenesisMcpServer(options);
  await server.connect(new StdioServerTransport());
}

export class StdioMcpToolClient implements McpToolClient {
  private client?: Client;
  private transport?: StdioClientTransport;
  private listChangedCallback?: () => void | Promise<void>;
  private readonly breaker = new CircuitBreaker();

  constructor(
    private readonly serverName: string,
    private readonly config: McpStdioServerConfig,
    private readonly cwd: string
  ) {}

  private async ensureConnected() {
    if (this.client) return this.client;

    const client = new Client({
      name: `xenesis-${this.serverName}`,
      version: "0.1.0"
    });
    const transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args,
      env: buildMcpStdioEnv(this.config.env),
      cwd: this.cwd,
      stderr: "pipe"
    });
    await client.connect(transport);
    client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
      if (this.listChangedCallback) await this.listChangedCallback();
    });
    this.client = client;
    this.transport = transport;
    return client;
  }

  async listTools() {
    const client = await this.ensureConnected();
    const result = await client.listTools();
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }

  async callTool(name: string, input: unknown) {
    if (!this.breaker.canAttempt()) {
      return { isError: true, content: [{ type: "text", text: `MCP server "${this.serverName}" temporarily disabled (circuit open after repeated failures).` }] } as McpToolResult;
    }
    try {
      const client = await this.ensureConnected();
      const result = await client.callTool({
        name,
        arguments: typeof input === "object" && input !== null ? input as Record<string, unknown> : {}
      }) as McpToolResult;
      this.breaker.recordSuccess();
      return result;
    } catch (error) {
      this.breaker.recordFailure();
      throw error;
    }
  }

  async listResources() {
    const client = await this.ensureConnected();
    const result = await client.listResources();
    return result.resources.map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }));
  }

  async readResource(uri: string) {
    const client = await this.ensureConnected();
    return await client.readResource({ uri }) as McpReadResourceResult;
  }

  async listPrompts() {
    const client = await this.ensureConnected();
    const result = await client.listPrompts();
    return result.prompts.map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments
    }));
  }

  async getPrompt(name: string, args: Record<string, unknown>) {
    const client = await this.ensureConnected();
    return await client.getPrompt({ name, arguments: mcpPromptArguments(args) }) as McpPromptResult;
  }

  onListChanged(callback: () => void | Promise<void>): void {
    this.listChangedCallback = callback;
  }

  async close() {
    await this.transport?.close();
    this.client = undefined;
    this.transport = undefined;
  }
}

export class RemoteMcpToolClient implements McpToolClient {
  private client?: Client;
  private transport?: Transport;
  private listChangedCallback?: () => void | Promise<void>;
  private readonly breaker = new CircuitBreaker();

  constructor(
    private readonly serverName: string,
    private readonly config: McpHttpServerConfig,
    private readonly store: McpAuthStore = createMemoryMcpAuthStore()
  ) {}

  private async createAuthProvider(): Promise<OAuthClientProvider | undefined> {
    if (this.config.auth !== "oauth" && !this.config.oauth) return undefined;
    const oauth = this.config.oauth ?? {};
    const clientSecret = oauth.clientSecret !== undefined
      ? await resolveSecretRef(oauth.clientSecret)
      : undefined;
    return createMcpOAuthClientProvider({
      serverName: this.serverName,
      serverConfig: remoteMcpAuthServerConfig(this.config),
      config: {
        ...(oauth.clientId ? { clientId: oauth.clientId } : {}),
        ...(clientSecret ? { clientSecret } : {}),
        ...(oauth.scope ? { scope: oauth.scope } : {}),
        ...(oauth.redirectUrl ? { redirectUrl: oauth.redirectUrl } : {}),
        ...(oauth.authServerMetadataUrl ? { authServerMetadataUrl: oauth.authServerMetadataUrl } : {})
      },
      store: this.store
    });
  }

  private async ensureConnected() {
    if (this.client) return this.client;
    const client = new Client({ name: `xenesis-${this.serverName}`, version: "0.1.0" });
    const authProvider = await this.createAuthProvider();
    const transport = createRemoteMcpTransport(this.config, {
      ...(authProvider ? { authProvider } : {}),
      requestInit: this.config.headers ? { headers: this.config.headers } : undefined
    });
    await client.connect(transport);
    client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
      if (this.listChangedCallback) await this.listChangedCallback();
    });
    this.client = client;
    this.transport = transport;
    return client;
  }

  async listTools() {
    const client = await this.ensureConnected();
    const result = await client.listTools();
    return result.tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }));
  }

  async callTool(name: string, input: unknown) {
    if (!this.breaker.canAttempt()) {
      return { isError: true, content: [{ type: "text", text: `MCP server "${this.serverName}" temporarily disabled (circuit open after repeated failures).` }] } as McpToolResult;
    }
    const doCall = async () => {
      const client = await this.ensureConnected();
      return await client.callTool({
        name,
        arguments: typeof input === "object" && input !== null ? input as Record<string, unknown> : {}
      }) as McpToolResult;
    };
    try {
      const result = await doCall();
      this.breaker.recordSuccess();
      return result;
    } catch (error) {
      if (isMcpUnauthorized(error) && (this.config.auth === "oauth" || this.config.oauth)) {
        try {
          await this.refreshAuthAfterUnauthorized();
          const result = await doCall();
          this.breaker.recordSuccess();
          return result;
        } catch (retryError) {
          this.breaker.recordFailure();
          throw retryError;
        }
      }
      this.breaker.recordFailure();
      throw error;
    }
  }

  async listResources() {
    const client = await this.ensureConnected();
    const result = await client.listResources();
    return result.resources.map((resource) => ({ uri: resource.uri, name: resource.name, description: resource.description, mimeType: resource.mimeType }));
  }

  async readResource(uri: string) {
    const client = await this.ensureConnected();
    return await client.readResource({ uri }) as McpReadResourceResult;
  }

  async listPrompts() {
    const client = await this.ensureConnected();
    const result = await client.listPrompts();
    return result.prompts.map((prompt) => ({ name: prompt.name, description: prompt.description, arguments: prompt.arguments }));
  }

  async getPrompt(name: string, args: Record<string, unknown>) {
    const client = await this.ensureConnected();
    return await client.getPrompt({ name, arguments: mcpPromptArguments(args) }) as McpPromptResult;
  }

  onListChanged(callback: () => void | Promise<void>): void {
    this.listChangedCallback = callback;
  }

  private async refreshAuthAfterUnauthorized(): Promise<void> {
    const provider = await this.createAuthProvider();
    if (!provider) return;
    const serverConfig = remoteMcpAuthServerConfig(this.config);
    const credentialKey = getMcpServerCredentialKey(this.serverName, serverConfig);
    const currentToken = this.store.read()?.mcpOAuth?.[credentialKey]?.accessToken ?? "";
    const pendingKey = `${credentialKey}:${currentToken}`;
    let pending = pendingMcpOAuth401.get(pendingKey);
    if (!pending) {
      pending = mcpOAuthAuth(provider, { serverUrl: this.config.url }).then(() => undefined);
      pendingMcpOAuth401.set(pendingKey, pending);
    }
    try {
      await pending;
    } finally {
      pendingMcpOAuth401.delete(pendingKey);
    }
    await this.close();
  }

  async close() {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // ignore close errors
      }
    }
    if (this.transport) {
      try {
        await this.transport.close();
      } catch {
        // ignore close errors
      }
    }
    this.client = undefined;
    this.transport = undefined;
  }
}

const pendingMcpOAuth401 = new Map<string, Promise<void>>();

function isMcpUnauthorized(error: unknown): boolean {
  if (error instanceof UnauthorizedError) return true;
  if (typeof error === "object" && error !== null && "status" in error) {
    return (error as { status?: unknown }).status === 401;
  }
  return false;
}

function isRemoteMcpServerConfig(config: McpServerConfig): config is McpHttpServerConfig {
  return "url" in config && (config.type === "http" || config.type === "sse");
}

export function createMcpClient(
  serverName: string,
  config: McpServerConfig,
  workspace: string,
  options: CreateMcpClientOptions = {}
): McpToolClient {
  return isRemoteMcpServerConfig(config)
    ? new RemoteMcpToolClient(serverName, config, options.authStore)
    : new StdioMcpToolClient(serverName, config, workspace);
}

export interface CreateMcpClientOptions {
  authStore?: McpAuthStore;
}

export interface RegisterMcpServerToolsOptions {
  authStore?: McpAuthStore;
  clientFactory?: (
    serverName: string,
    config: McpServerConfig,
    workspace: string,
    options?: CreateMcpClientOptions
  ) => McpToolClient;
}

export async function registerMcpServerTools(
  registry: Map<string, Tool>,
  mcpServers: Record<string, McpServerConfig>,
  workspace: string,
  options: RegisterMcpServerToolsOptions = {}
): Promise<void> {
  const make = options.clientFactory ?? createMcpClient;
  const mcpClients: Record<string, McpToolClient> = {};
  for (const [serverName, server] of Object.entries(mcpServers)) {
    if (server.enabled === false) continue;
    try {
      const client = make(serverName, server, workspace, { authStore: options.authStore });
      const tools = await createMcpTools({ serverName, client, toolFilter: server.toolFilter });
      mcpClients[serverName] = client;
      for (const tool of tools) {
        let name = tool.name;
        if (registry.has(name)) {
          const taken = new Set(registry.keys());
          name = dedupeToolName(name, taken);
          console.warn(`[mcp] tool name collision: "${tool.name}" -> "${name}"`);
        }
        registry.set(name, name === tool.name ? tool : { ...tool, name });
      }
    } catch (err) {
      if (isRemoteMcpServerConfig(server)) {
        console.warn(`[mcp] remote server "${serverName}" failed to load, skipping: ${redactMcpLoadError(err)}`);
        continue;
      }
      throw err;
    }
  }
  if (Object.keys(mcpClients).length > 0) {
    for (const tool of createMcpResourceTools(mcpClients)) {
      let name = tool.name;
      if (registry.has(name)) {
        const taken = new Set(registry.keys());
        name = dedupeToolName(name, taken);
        console.warn(`[mcp] tool name collision: "${tool.name}" -> "${name}"`);
      }
      registry.set(name, name === tool.name ? tool : { ...tool, name });
    }
  }
}

function redactMcpLoadError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/\b(access_token|refresh_token|client_secret|code|state)=([^&\s]+)/giu, "$1=[redacted]")
    .replace(/\bBearer\s+[\w.\-~+/]+=*/giu, "Bearer [redacted]");
}
