import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, dirname, extname, isAbsolute, join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import type { AgentMessage } from "../core/messages.js";
import { stripSystemPromptDynamicBoundary } from "../core/prompt/index.js";
import type {
  AgentProvider,
  ProviderRequest,
  ProviderResponse,
  ProviderRuntimeCapabilities,
  ProviderStreamEvent
} from "./types.js";

export interface CliRunRequest {
  command: string;
  args: string[];
  stdin: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

export interface CliRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export type CliRunner = (request: CliRunRequest) => Promise<CliRunResult>;

export type CliPreflightAuthStatus = "env-configured" | "unknown" | "unavailable";

export interface CliPreflightRequest {
  provider: string;
  command: string;
  resolvedCommand: string;
  resolvedArgs: string[];
  env?: NodeJS.ProcessEnv;
  timeoutMs: number;
}

export interface CliPreflightRunResult {
  stdout: string;
  stderr: string;
  status: number | null;
  error?: string;
}

export type CliPreflightRunner = (request: CliPreflightRequest) => CliPreflightRunResult;

export interface CliPreflightStatus {
  provider: string;
  command: string;
  resolvedCommand: string;
  resolvedArgs: string[];
  installed: boolean;
  version?: string;
  authStatus: CliPreflightAuthStatus;
  authSource?: string;
  checkedAt: string;
  cacheKey: string;
  cacheTtlMs: number;
  cacheHit?: boolean;
  error?: string;
}

export interface CliProviderOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  run?: CliRunner;
  preflightRunner?: CliPreflightRunner;
}

export interface CliSpawnRequestInput {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform | string;
}

export interface CliSpawnRequest {
  command: string;
  args: string[];
  shell: boolean;
}

export interface CodexAppServerTurnRequest {
  threadId: string;
  inputText: string;
  model?: string;
  cwd?: string;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}

export interface CodexAppServerTurnResult {
  content: string;
  turnId?: string;
  raw?: unknown;
}

export interface CodexAppServerClient {
  initialize(signal?: AbortSignal): Promise<void>;
  startThread(request: { model?: string; cwd?: string; signal?: AbortSignal }): Promise<{ threadId: string; raw?: unknown }>;
  startTurn(request: CodexAppServerTurnRequest): Promise<CodexAppServerTurnResult>;
  dispose(): void;
}

export interface CodexAppServerSession {
  client?: CodexAppServerClient;
  threadId?: string;
  initialized?: boolean;
  unavailable?: boolean;
  lastError?: string;
}

export interface CodexAppServerProviderOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  client?: CodexAppServerClient;
  session?: CodexAppServerSession;
  fallbackProvider?: AgentProvider;
  preflightRunner?: CliPreflightRunner;
}

export interface ClaudeInteractiveTurnRequest {
  inputText: string;
  signal?: AbortSignal;
  onDelta?: (delta: string) => void;
}

export interface ClaudeInteractiveTurnResult {
  content: string;
  sessionId?: string;
  raw?: unknown;
}

export interface ClaudeInteractiveClient {
  startTurn(request: ClaudeInteractiveTurnRequest): Promise<ClaudeInteractiveTurnResult>;
  dispose(): void | Promise<void>;
}

export interface ClaudeInteractiveSession {
  client?: ClaudeInteractiveClient;
  sessionId?: string;
  unavailable?: boolean;
  lastError?: string;
}

export interface ClaudeInteractiveProviderOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  client?: ClaudeInteractiveClient;
  session?: ClaudeInteractiveSession;
  preflightRunner?: CliPreflightRunner;
}

interface CliProviderDefaults {
  providerName: "codex-cli" | "claude-cli";
  defaultCommand: string;
  defaultArgs: string[];
  commandEnv: string;
  argsEnv: string;
  timeoutEnv: string;
  defaultTimeoutMs: number;
}

interface CliSessionState {
  provider: string;
  sessionKey: string;
  sessionId?: string;
  initialized?: boolean;
  updatedAt?: string;
}

interface CliSessionHandle {
  path: string;
  state: CliSessionState;
}

function messageLabel(message: AgentMessage) {
  if (message.role === "system") return "System";
  if (message.role === "user") return "User";
  if (message.role === "assistant") return "Assistant";
  return `Tool (${message.name})`;
}

function formatPrompt(messages: AgentMessage[]) {
  return messages
    .map((message) => {
      const details = message.role === "tool"
        ? `toolCallId: ${message.toolCallId}\n${message.content}`
        : message.role === "system"
          ? stripSystemPromptDynamicBoundary(message.content)
          : message.content;
      return `## ${messageLabel(message)}\n${details}`;
    })
    .join("\n\n")
    .trimEnd() + "\n";
}

function parseArgsFromEnv(value: string | undefined, fallback: string[]) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
  } catch {
    // Fall back to a simple split for local overrides.
  }
  return text.split(/\s+/).filter(Boolean);
}

function textEnv(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
}

function isEnvFalse(value: unknown) {
  return typeof value === "string" && /^(?:0|false|no|off)$/i.test(value.trim());
}

function safeSessionKey(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 160) || "default";
}

function outputToString(value: unknown) {
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return value == null ? "" : String(value);
}

function firstOutputLine(stdout: string, stderr: string) {
  return `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function providerAuthProbe(provider: string, env: NodeJS.ProcessEnv | undefined) {
  const names = provider === "claude-cli" || provider === "claude-interactive"
    ? ["ANTHROPIC_API_KEY"]
    : provider === "codex-cli" || provider === "codex-app-server"
      ? ["OPENAI_API_KEY", "CODEX_API_KEY"]
      : [];
  const configured = names.find((name) => textEnv(env?.[name] ?? process.env[name]));
  if (configured) {
    return {
      authStatus: "env-configured" as const,
      authSource: configured
    };
  }
  return { authStatus: "unknown" as const };
}

function preflightCacheMs(env: NodeJS.ProcessEnv | undefined) {
  return positiveInteger(env?.XENESIS_CLI_PREFLIGHT_CACHE_MS)
    ?? positiveInteger(process.env.XENESIS_CLI_PREFLIGHT_CACHE_MS)
    ?? 5 * 60 * 1000;
}

function preflightTimeoutMs(env: NodeJS.ProcessEnv | undefined) {
  return positiveInteger(env?.XENESIS_CLI_PREFLIGHT_TIMEOUT_MS)
    ?? positiveInteger(process.env.XENESIS_CLI_PREFLIGHT_TIMEOUT_MS)
    ?? 2500;
}

function preflightCacheKey(provider: string, command: string, env: NodeJS.ProcessEnv | undefined) {
  const pathEnv = env?.Path ?? env?.PATH ?? process.env.Path ?? process.env.PATH ?? "";
  const pathExt = env?.PATHEXT ?? process.env.PATHEXT ?? "";
  return [
    provider,
    command,
    pathEnv,
    pathExt
  ].map((part) => safeSessionKey(String(part || ""))).join("|");
}

const cliPreflightCache = new Map<string, { expiresAt: number; status: CliPreflightStatus }>();
const DEFAULT_PERSISTENT_CLI_TURN_TIMEOUT_MS = 120_000;
const DEFAULT_ONESHOT_CLI_TURN_TIMEOUT_MS = 420_000;

function defaultCliPreflightRunner(request: CliPreflightRequest): CliPreflightRunResult {
  try {
    const result = spawnSync(request.resolvedCommand, request.resolvedArgs, {
      env: { ...process.env, ...(request.env ?? {}) },
      encoding: "utf8",
      timeout: request.timeoutMs,
      shell: false,
      windowsHide: true
    });
    return {
      stdout: outputToString(result.stdout),
      stderr: outputToString(result.stderr),
      status: result.status,
      ...(result.error ? { error: result.error.message } : {})
    };
  } catch (error) {
    return {
      stdout: "",
      stderr: "",
      status: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function clearCliPreflightCache() {
  cliPreflightCache.clear();
}

export function resolveCliPreflightStatus(
  provider: string,
  command: string,
  env: NodeJS.ProcessEnv | undefined,
  options: { runner?: CliPreflightRunner; now?: number } = {}
): CliPreflightStatus | undefined {
  if (isEnvFalse(env?.XENESIS_CLI_PREFLIGHT ?? process.env.XENESIS_CLI_PREFLIGHT)) return undefined;
  const cacheTtlMs = preflightCacheMs(env);
  const now = options.now ?? Date.now();
  const cacheKey = preflightCacheKey(provider, command, env);
  const cached = cliPreflightCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return {
      ...cached.status,
      cacheHit: true
    };
  }

  const spawnRequest = resolveCliSpawnRequest({
    command,
    args: ["--version"],
    env
  });
  const run = options.runner ?? defaultCliPreflightRunner;
  const probe = run({
    provider,
    command,
    resolvedCommand: spawnRequest.command,
    resolvedArgs: spawnRequest.args,
    env,
    timeoutMs: preflightTimeoutMs(env)
  });
  const missingCommand = probe.error ? /\bENOENT\b|not found|cannot find/i.test(probe.error) : false;
  const timedOut = probe.error ? /timed? ?out|ETIMEDOUT/i.test(probe.error) : false;
  const versionLine = firstOutputLine(probe.stdout, probe.stderr);
  const installed = !missingCommand && (probe.status === 0 || Boolean(versionLine) || timedOut);
  const auth = installed ? providerAuthProbe(provider, env) : { authStatus: "unavailable" as const };
  const status: CliPreflightStatus = {
    provider,
    command,
    resolvedCommand: spawnRequest.command,
    resolvedArgs: spawnRequest.args,
    installed,
    ...(versionLine ? { version: versionLine } : {}),
    ...auth,
    checkedAt: new Date(now).toISOString(),
    cacheKey,
    cacheTtlMs,
    ...(probe.error ? { error: probe.error } : {})
  };
  cliPreflightCache.set(cacheKey, {
    expiresAt: now + cacheTtlMs,
    status
  });
  return status;
}

function createTimeoutSignal(signal: AbortSignal | undefined, timeoutMs: number | undefined, label: string) {
  if (!timeoutMs) {
    return {
      signal,
      cleanup: () => {},
      timedOut: () => false
    };
  }
  const controller = new AbortController();
  let timedOut = false;
  const abortFromSignal = () => controller.abort();
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(`${label} timed out after ${timeoutMs}ms.`));
  }, timeoutMs);
  if (signal?.aborted) {
    abortFromSignal();
  } else {
    signal?.addEventListener("abort", abortFromSignal, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromSignal);
    },
    timedOut: () => timedOut
  };
}

function readCliSessionState(filePath: string): CliSessionState | undefined {
  if (!existsSync(filePath)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<CliSessionState>;
    if (typeof parsed.provider !== "string" || typeof parsed.sessionKey !== "string") return undefined;
    return {
      provider: parsed.provider,
      sessionKey: parsed.sessionKey,
      ...(typeof parsed.sessionId === "string" && parsed.sessionId ? { sessionId: parsed.sessionId } : {}),
      ...(parsed.initialized === true ? { initialized: true } : {}),
      ...(typeof parsed.updatedAt === "string" ? { updatedAt: parsed.updatedAt } : {})
    };
  } catch {
    return undefined;
  }
}

function writeCliSessionState(filePath: string, state: CliSessionState) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify({
    ...state,
    updatedAt: new Date().toISOString()
  }, null, 2), "utf8");
}

function resolveCliSessionHandle(providerName: string, env: NodeJS.ProcessEnv | undefined): CliSessionHandle | undefined {
  if (!env || isEnvFalse(env.XENESIS_CLI_SESSION_REUSE)) return undefined;
  const home = textEnv(env.XENESIS_HOME) ?? textEnv(env.XENIS_HOME);
  const sessionKey = textEnv(env.XENESIS_CLI_SESSION_KEY);
  if (!home || !sessionKey) return undefined;
  const filePath = join(home, "provider-sessions", `${providerName}-${safeSessionKey(sessionKey)}.json`);
  return {
    path: filePath,
    state: readCliSessionState(filePath) ?? {
      provider: providerName,
      sessionKey
    }
  };
}

function markCliSessionInitialized(handle: CliSessionHandle | undefined) {
  if (!handle) return;
  handle.state.initialized = true;
  writeCliSessionState(handle.path, handle.state);
}

function ensureClaudeSessionId(handle: CliSessionHandle) {
  if (!handle.state.sessionId) {
    handle.state.sessionId = randomUUID();
    writeCliSessionState(handle.path, handle.state);
  }
  return handle.state.sessionId;
}

function tomlString(value: string) {
  if (!value.includes("'")) return `'${value}'`;
  return JSON.stringify(value);
}

function tomlStringArray(values: string[]) {
  return `[${values.map(tomlString).join(",")}]`;
}

function readServerPathFromBridgeState(stateFilePath: string | undefined): string | undefined {
  if (!stateFilePath || !existsSync(stateFilePath)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(stateFilePath, "utf8")) as { serverPath?: unknown };
    return textEnv(parsed.serverPath);
  } catch {
    return undefined;
  }
}

function hasWindowsPathSeparator(value: string) {
  return /[\\/]/.test(value);
}

function windowsPathEnv(env: NodeJS.ProcessEnv | undefined) {
  return env?.Path ?? env?.PATH ?? process.env.Path ?? process.env.PATH ?? "";
}

function windowsPathExts(env: NodeJS.ProcessEnv | undefined) {
  const value = env?.PATHEXT ?? process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD";
  const extensions = value
    .split(";")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return extensions.length > 0 ? extensions : [".com", ".exe", ".bat", ".cmd"];
}

function windowsCommandCandidates(command: string, env: NodeJS.ProcessEnv | undefined) {
  const trimmed = command.trim();
  if (!trimmed) return [];
  const extension = extname(trimmed).toLowerCase();
  if (hasWindowsPathSeparator(trimmed) || isAbsolute(trimmed)) {
    if (extension) return [trimmed];
    return windowsPathExts(env).map((candidateExt) => `${trimmed}${candidateExt}`);
  }

  const dirs = windowsPathEnv(env)
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
  const names = extension
    ? [trimmed]
    : windowsPathExts(env).map((candidateExt) => `${trimmed}${candidateExt}`);
  return dirs.flatMap((dir) => names.map((name) => join(dir, name)));
}

function resolveWindowsCommandPath(command: string, env: NodeJS.ProcessEnv | undefined) {
  return windowsCommandCandidates(command, env).find((candidate) => existsSync(candidate));
}

function nodeCommandForNpmShim(shimPath: string) {
  const localNode = join(dirname(shimPath), "node.exe");
  return existsSync(localNode) ? localNode : "node";
}

function npmShimEntrypointFromContent(content: string) {
  const match = content.match(/%dp0%\\([^"\r\n]+?\.js)/i)
    ?? content.match(/\$basedir[\\/]+([^"\r\n]+?\.js)/i);
  return match?.[1]?.replace(/[\\/]+/g, "\\");
}

function resolveWindowsNpmShim(commandPath: string, args: string[]): CliSpawnRequest | undefined {
  const extension = extname(commandPath).toLowerCase();
  if (extension !== ".cmd" && extension !== ".bat" && extension !== ".ps1") return undefined;
  let content = "";
  try {
    content = readFileSync(commandPath, "utf8");
  } catch {
    return undefined;
  }
  const relativeEntrypoint = npmShimEntrypointFromContent(content);
  if (!relativeEntrypoint) return undefined;
  const entrypoint = join(dirname(commandPath), relativeEntrypoint);
  if (!existsSync(entrypoint)) return undefined;
  return {
    command: nodeCommandForNpmShim(commandPath),
    args: [entrypoint, ...args],
    shell: false
  };
}

export function resolveCliSpawnRequest(input: CliSpawnRequestInput): CliSpawnRequest {
  const platform = input.platform ?? process.platform;
  if (platform !== "win32") {
    return {
      command: input.command,
      args: input.args,
      shell: false
    };
  }

  const resolvedPath = resolveWindowsCommandPath(input.command, input.env) ?? input.command;
  const shim = resolveWindowsNpmShim(resolvedPath, input.args);
  if (shim) return shim;

  return {
    command: resolvedPath,
    args: input.args,
    shell: false
  };
}

const DESK_MCP_TOOL_NAMES = [
  "xenesis_desk_capabilities",
  "xenesis_desk_capability",
  "xenesis_desk_call_capability"
];

const CLAUDE_DESK_MCP_SERVER_KEY = "xenesis-dev";
const CLAUDE_DESK_MCP_TOOL_NAMES = DESK_MCP_TOOL_NAMES.map((toolName) =>
  `mcp__${CLAUDE_DESK_MCP_SERVER_KEY}__${toolName}`
);

function resolveDeskMcpConfig(env: NodeJS.ProcessEnv, autoConfigEnvName: string) {
  if (textEnv(env[autoConfigEnvName])?.toLowerCase() === "false") return undefined;
  const stateFilePath = textEnv(env.XENIS_MCP_STATE_FILE)
    ?? (textEnv(env.XENIS_HOME) ? join(textEnv(env.XENIS_HOME)!, "mcp", "bridge.json") : undefined);
  const serverPath = textEnv(env.XENIS_MCP_SERVER_PATH) ?? readServerPathFromBridgeState(stateFilePath);
  if (!stateFilePath || !serverPath) return undefined;
  return {
    stateFilePath,
    serverPath,
    nodeCommand: textEnv(env.XENIS_MCP_NODE_COMMAND) ?? "node",
    xenisHome: textEnv(env.XENIS_HOME)
  };
}

function argsAlreadyConfigureDeskMcp(args: string[]) {
  return args.some((arg) =>
    arg.includes("mcp_servers.xenesis_dev") ||
    arg.includes("mcp_servers.xenesis-dev") ||
    arg.includes("xenesis-dev") ||
    arg.includes("xenesis_desk_call_capability") ||
    arg.includes("xenesis-desk-mcp-server")
  );
}

function insertCliOptionsBeforeStdinPrompt(args: string[], extraArgs: string[]) {
  const stdinPromptIndex = args.lastIndexOf("-");
  if (stdinPromptIndex < 0) return [...args, ...extraArgs];
  return [
    ...args.slice(0, stdinPromptIndex),
    ...extraArgs,
    ...args.slice(stdinPromptIndex)
  ];
}

function hasAnyArg(args: readonly string[], names: readonly string[]) {
  return args.some((arg) => names.includes(arg));
}

function claudeSessionArgs(args: string[], handle: CliSessionHandle) {
  if (hasAnyArg(args, ["--session-id", "--resume", "-r", "--continue", "-c"])) return args;
  const sessionId = ensureClaudeSessionId(handle);
  return handle.state.initialized
    ? [...args, "--resume", sessionId]
    : [...args, "--session-id", sessionId];
}

function codexExecResumeArgs(args: string[], handle: CliSessionHandle) {
  if (!handle.state.initialized) return args;
  if (args[0] !== "exec" || args[1] === "resume") return args;
  const resumeArgs: string[] = [];
  let sandbox: string | undefined;
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--sandbox" || arg === "-s") {
      sandbox = args[index + 1];
      index += 1;
      continue;
    }
    resumeArgs.push(arg);
  }
  if (sandbox) {
    resumeArgs.unshift("-c", `sandbox=${tomlString(sandbox)}`);
  }
  return [args[0], "resume", "--last", ...resumeArgs];
}

function sessionArgs(providerName: string, args: string[], handle: CliSessionHandle | undefined) {
  if (!handle) return args;
  if (providerName === "claude-cli") return claudeSessionArgs(args, handle);
  if (providerName === "codex-cli") return codexExecResumeArgs(args, handle);
  return args;
}

function continuationMessages(messages: AgentMessage[]) {
  const lastAssistantIndex = messages.reduce(
    (lastIndex, message, index) => message.role === "assistant" ? index : lastIndex,
    -1
  );
  if (lastAssistantIndex < 0) return messages;
  const tail = messages.slice(lastAssistantIndex + 1);
  return tail.length > 0 ? tail : messages.slice(-1);
}

function codexDeskMcpArgs(env: NodeJS.ProcessEnv) {
  const config = resolveDeskMcpConfig(env, "XENESIS_CODEX_MCP_AUTO_CONFIG");
  if (!config) return [];
  const serverKey = "xenesis_dev";
  const args = [
    "-c", `mcp_servers.${serverKey}.enabled=true`,
    "-c", `mcp_servers.${serverKey}.command=${tomlString(config.nodeCommand)}`,
    "-c", `mcp_servers.${serverKey}.args=${tomlStringArray([config.serverPath])}`,
    "-c", `mcp_servers.${serverKey}.env.XENIS_MCP_STATE_FILE=${tomlString(config.stateFilePath)}`,
    "-c", `mcp_servers.${serverKey}.enabled_tools=${tomlStringArray(DESK_MCP_TOOL_NAMES)}`,
    "-c", `mcp_servers.${serverKey}.default_tools_approval_mode='approve'`,
    "-c", `mcp_servers.${serverKey}.tools.xenesis_desk_capabilities.approval_mode='approve'`,
    "-c", `mcp_servers.${serverKey}.tools.xenesis_desk_capability.approval_mode='approve'`,
    "-c", `mcp_servers.${serverKey}.tools.xenesis_desk_call_capability.approval_mode='approve'`
  ];
  if (config.xenisHome) {
    args.push("-c", `mcp_servers.${serverKey}.env.XENIS_HOME=${tomlString(config.xenisHome)}`);
  }
  return args;
}

function claudeDeskMcpArgs(providerName: "claude-cli" | "claude-interactive", env: NodeJS.ProcessEnv, baseArgs: string[]) {
  const config = resolveDeskMcpConfig(env, "XENESIS_CLAUDE_MCP_AUTO_CONFIG");
  if (!config) return [];
  const mcpConfig = {
    mcpServers: {
      [CLAUDE_DESK_MCP_SERVER_KEY]: {
        command: config.nodeCommand,
        args: [config.serverPath],
        env: {
          XENIS_MCP_STATE_FILE: config.stateFilePath,
          ...(config.xenisHome ? { XENIS_HOME: config.xenisHome } : {})
        }
      }
    }
  };
  const args = ["--mcp-config", JSON.stringify(mcpConfig), "--strict-mcp-config"];
  if (providerName === "claude-cli" && !hasAnyArg(baseArgs, ["--tools"])) {
    args.push("--tools", "");
  }
  if (!hasAnyArg(baseArgs, ["--allowedTools", "--allowed-tools"])) {
    args.push("--allowedTools", CLAUDE_DESK_MCP_TOOL_NAMES.join(","));
  }
  return args;
}

function claudeDisableNativeToolArgs(args: string[]) {
  if (hasAnyArg(args, ["--tools"])) return args;
  return insertCliOptionsBeforeStdinPrompt(args, ["--tools", ""]);
}

type DeskMcpCliProviderName = CliProviderDefaults["providerName"] | "claude-interactive";

function isClaudeCliProviderName(providerName: string) {
  return providerName === "claude-cli" || providerName === "claude-interactive";
}

function maybeAddDeskMcpArgs(providerName: DeskMcpCliProviderName, args: string[], env: NodeJS.ProcessEnv) {
  if (providerName !== "codex-cli" && !isClaudeCliProviderName(providerName)) return { args, configured: false };
  if (argsAlreadyConfigureDeskMcp(args)) {
    return {
      args: providerName === "claude-cli" ? claudeDisableNativeToolArgs(args) : args,
      configured: true
    };
  }
  const extraArgs = isClaudeCliProviderName(providerName)
    ? claudeDeskMcpArgs(providerName, env, args)
    : codexDeskMcpArgs(env);
  if (extraArgs.length === 0) return { args, configured: false };
  return {
    args: insertCliOptionsBeforeStdinPrompt(args, extraArgs),
    configured: true
  };
}

function codexAppServerArgs(env: NodeJS.ProcessEnv) {
  const args = parseArgsFromEnv(env.XENESIS_CODEX_APP_SERVER_ARGS, ["app-server", "--stdio"]);
  if (argsAlreadyConfigureDeskMcp(args)) return { args, configured: true };
  const extraArgs = codexDeskMcpArgs(env);
  if (extraArgs.length === 0) return { args, configured: false };
  return {
    args: [...args, ...extraArgs],
    configured: true
  };
}

function codexAppServerModel(env: NodeJS.ProcessEnv, requestModel: string) {
  const override = textEnv(env.XENESIS_CODEX_APP_SERVER_MODEL) ?? textEnv(env.XENESIS_CODEX_CLI_MODEL);
  if (override) return override;
  const model = requestModel.trim();
  if (!model || /^desk-/i.test(model) || /^mock(?:-|$)/i.test(model)) return undefined;
  return model;
}

function deskMcpPromptTools(providerName: string) {
  if (isClaudeCliProviderName(providerName)) {
    return {
      callTool: "mcp__xenesis-dev__xenesis_desk_call_capability",
      capabilitiesTool: "mcp__xenesis-dev__xenesis_desk_capabilities",
      capabilityTool: "mcp__xenesis-dev__xenesis_desk_capability"
    };
  }
  return {
    callTool: "xenesis_dev.xenesis_desk_call_capability",
    capabilitiesTool: "xenesis_dev.xenesis_desk_capabilities",
    capabilityTool: "xenesis_dev.xenesis_desk_capability"
  };
}

export function deskMcpSystemMessage(providerName: string): AgentMessage {
  const tools = deskMcpPromptTools(providerName);
  return {
    role: "system",
    content: [
      "Private execution interface: Xenesis Desk CR MCP tools are configured for this provider run.",
      `Use the fully qualified MCP tool \`${tools.callTool}\` for Capability Registry calls.`,
      `Use \`${tools.capabilitiesTool}\` to discover paths, \`${tools.capabilityTool}\` to inspect schemas/approval, and \`${tools.callTool}\` as the generic caller for every callable CR method.`,
      `For a known path such as \`xd.app.status\`, call \`${tools.callTool}\` with input \`{ "path": "xd.app.status", "args": {} }\`.`,
      `Desk capability families: status, explorer, terminal, browser, document, layout, office, ui.automation, agent.artifact, multi_step. Do not assume xd.* paths — discover the exact path and arg schema on demand with ${tools.capabilitiesTool} and ${tools.capabilityTool} before calling ${tools.callTool}.`,
      "Do not use shell or `tool_search` for CR calls when these fully qualified MCP tool names are configured.",
      "When this provider run has Desk CR MCP tools configured, do not use native provider file-editing tools such as apply_patch, shell redirection, filesystem writes, or local JSON/write/edit helpers to satisfy Desk file, document, terminal, browser, workspace, or UI mutations. Mutating Desk state must go through the CR MCP caller so approval, readback, and audit state stay aligned.",
      `When the user asks for an approval-required Desk action, call \`${tools.callTool}\` with approved=false so Desk creates the real approval record, then report that Desk approval is needed (omit diagnostic ids unless asked).`,
      "If that approved=false call returns a pending approval, approvalRequired, or an actionInboxItem, stop this provider turn after the real approval record is created. Do not wait for the user to approve it, do not call follow-up readback/verify/inspect/export, and do not issue a second mutation in the same provider turn unless the tool result says the action already executed.",
      "For text file generation or updates, do not set `maxBytes` from requested character count, document length, or design complexity requirements. Omit `maxBytes` unless the user explicitly asks for a file-size safety cap.",
      "For Desk calls that execute immediately, and for read-only Desk calls, verify with another CR/MCP read such as state, active context, diagnostics, captures, or open content before reporting a completed result.",
      "Do not mention MCP, CR, Capability Registry, bridge, tool names, `xd.*` paths, approval ids, or skill names in user-facing progress or final answers unless the user explicitly asks for diagnostics.",
      "Translate internal calls into Desk product language: browser tab count, browser URLs, file explorer open/closed state, current workspace, selected path, pane state, terminal output, web page state, document/file open state, pane layout, or approval needed."
    ].join("\n")
  };
}

const providerVisibleOutputContractMessage: AgentMessage = {
  role: "system",
  content: [
    "Assistant output contract for this turn:",
    "Use private Desk tools silently.",
    "For Desk file/document generation or edits, do not use native patch/write/shell filesystem mutation when a private Desk CR bridge is available; create the real private Desk mutation/approval. If it executes immediately, verify readback before answering. If it returns pending approval, stop with approval-needed product language only.",
    "Do not narrate tool choice, discovery, schema lookup, path lookup, or verification steps.",
    "The first visible assistant text should be the final user answer. If a progress update is unavoidable, say only: 상태를 확인 중입니다.",
    "For natural Desk status or control requests, answer in short product language only: browser tab count, browser URLs if asked, file explorer open/closed state, current workspace, selected path, pane state, terminal output, web page state, or that Desk approval is needed.",
    "Never report a requested completion marker, success word, or done/완료 for a Desk control task until the required private Desk call has actually run and required approval/readback has been observed.",
    "For web form tasks that ask you to type, click, submit, or verify page text, do not infer success from the prompt. Run the browser interaction through private Desk tools first, then verify with page text/readback; if the call returns pending approval, say only that Desk approval is needed and stop.",
    "For visible terminal tasks that ask you to open a terminal, run a command, or verify output, do not infer success from the prompt. Create the real Desk terminal approval request when required; if approval is pending, say only that Desk approval is needed and stop.",
    "Saying Desk approval is needed without first making the private Desk call that creates the approval record is invalid.",
    "Pending approval is a valid stop state only after the private Desk call created the real approval record. Do not perform same-turn post-approval verification; the Agent pane or a later turn will verify after approval execution.",
    "Do not report terminal command output until the terminal command has actually run and output readback matched.",
    "If the user asks to only confirm a previously opened, executed, or submitted Desk state, answer with a concise confirmation only. Do not restate URLs, local file paths, script names, hidden markers, codes, raw terminal output, or other readback identifiers unless the user explicitly asks for those details.",
    "If the user says `확인했다고만`, `확인만`, `준비됐다고만`, or equivalent answer-only wording, the visible answer should be just the requested short confirmation, for example `확인했습니다.`",
    "Do not mention MCP, CR, Capability Registry, bridge/브리지, tool names, `xd.*` paths, approval ids, `approvalRequired`, `actionInboxItem`, `superpowers:*`, skill names, shell fallback attempts, or raw process errors in visible text unless the user explicitly asks for diagnostics.",
    "If a Desk read lacks a requested field, say the field is not currently returned by Desk. Do not identify the underlying path, API, schema, or registry entry."
  ].join("\n")
};

function providerTurnMessages(messages: AgentMessage[], options: { deskMcpConfigured?: boolean; providerName?: string } = {}) {
  return [
    ...(options.deskMcpConfigured ? [deskMcpSystemMessage(options.providerName ?? "codex-cli")] : []),
    ...messages,
    providerVisibleOutputContractMessage
  ];
}

function defaultCliRunner(request: CliRunRequest): Promise<CliRunResult> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, ...(request.env ?? {}) };
    const spawnRequest = resolveCliSpawnRequest({
      command: request.command,
      args: request.args,
      env
    });
    const child = spawn(spawnRequest.command, spawnRequest.args, {
      cwd: request.cwd,
      env,
      shell: spawnRequest.shell,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const stdoutDecoder = new StringDecoder("utf8");
    const stderrDecoder = new StringDecoder("utf8");
    let settled = false;

    const flushDecoders = () => {
      const stdoutTail = stdoutDecoder.end();
      if (stdoutTail) request.onStdout?.(stdoutTail);
      const stderrTail = stderrDecoder.end();
      if (stderrTail) request.onStderr?.(stderrTail);
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      request.signal?.removeEventListener("abort", abort);
      callback();
    };
    const abort = () => {
      child.kill();
      finish(() => reject(new Error(`CLI command aborted: ${request.command}`)));
    };

    if (request.signal?.aborted) {
      abort();
      return;
    }
    request.signal?.addEventListener("abort", abort, { once: true });

    child.stdout.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.from(chunk);
      stdout.push(buffer);
      const text = stdoutDecoder.write(buffer);
      if (text) request.onStdout?.(text);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.from(chunk);
      stderr.push(buffer);
      const text = stderrDecoder.write(buffer);
      if (text) request.onStderr?.(text);
    });
    child.on("error", (error) => finish(() => reject(error)));
    child.on("close", (exitCode) => finish(() => {
      flushDecoders();
      resolve({
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        exitCode
      });
    }));
    child.stdin.end(request.stdin, "utf8");
  });
}

type JsonRpcId = string | number;

interface PendingJsonRpcRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface PendingCodexTurn {
  threadId: string;
  turnId: string;
  content: string;
  raw?: unknown;
  onDelta?: (delta: string) => void;
  resolve: (result: CodexAppServerTurnResult) => void;
  reject: (error: Error) => void;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function jsonStringField(record: Record<string, unknown> | undefined, key: string) {
  if (!record) return "";
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function agentTextFromTurn(turn: unknown) {
  if (!isJsonRecord(turn) || !Array.isArray(turn.items)) return "";
  return turn.items
    .filter(isJsonRecord)
    .filter((item) => item.type === "agentMessage")
    .map((item) => jsonStringField(item, "text"))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function messageError(message: Record<string, unknown>) {
  const error = isJsonRecord(message.error) ? message.error : undefined;
  const code = error && typeof error.code === "number" ? ` ${String(error.code)}` : "";
  const text = jsonStringField(error, "message") || "unknown JSON-RPC error";
  return new Error(`Codex app-server JSON-RPC error${code}: ${text}`);
}

function isCodexServerRequest(message: Record<string, unknown>) {
  return Object.prototype.hasOwnProperty.call(message, "id")
    && typeof message.method === "string"
    && !Object.prototype.hasOwnProperty.call(message, "result")
    && !Object.prototype.hasOwnProperty.call(message, "error");
}

class CodexAppServerProcessClient implements CodexAppServerClient {
  private child?: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private stdoutBuffer = "";
  private lastStderr = "";
  private initialized?: Promise<void>;
  private readonly pending = new Map<JsonRpcId, PendingJsonRpcRequest>();
  private readonly turns = new Map<string, PendingCodexTurn>();

  constructor(
    private readonly command: string,
    private readonly args: string[],
    private readonly options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
  ) {}

  initialize(signal?: AbortSignal): Promise<void> {
    if (!this.initialized) {
      this.initialized = this.request("initialize", {
        clientInfo: { name: "xenesis", version: "0.1.0" },
        capabilities: { experimentalApi: true, requestAttestation: false }
      }, signal).then(() => {
        this.notify("initialized");
      }).catch((error) => {
        this.initialized = undefined;
        throw error;
      });
    }
    return this.initialized;
  }

  async startThread(request: { model?: string; cwd?: string; signal?: AbortSignal }): Promise<{ threadId: string; raw?: unknown }> {
    await this.initialize(request.signal);
    const result = await this.request("thread/start", {
      ...(request.model ? { model: request.model } : {}),
      cwd: request.cwd ?? this.options.cwd ?? null,
      approvalPolicy: "never",
      sandbox: "read-only",
      ephemeral: false,
      threadSource: "api"
    }, request.signal);
    const thread = isJsonRecord(result) && isJsonRecord(result.thread) ? result.thread : undefined;
    const threadId = jsonStringField(thread, "id");
    if (!threadId) throw new Error("Codex app-server thread/start did not return thread.id.");
    return { threadId, raw: result };
  }

  async startTurn(request: CodexAppServerTurnRequest): Promise<CodexAppServerTurnResult> {
    await this.initialize(request.signal);
    const result = await this.request("turn/start", {
      threadId: request.threadId,
      input: [{ type: "text", text: request.inputText, text_elements: [] }],
      cwd: request.cwd ?? this.options.cwd ?? null,
      ...(request.model ? { model: request.model } : {})
    }, request.signal);
    const turn = isJsonRecord(result) && isJsonRecord(result.turn) ? result.turn : undefined;
    const turnId = jsonStringField(turn, "id");
    if (!turnId) throw new Error("Codex app-server turn/start did not return turn.id.");
    if (turn?.status === "completed") {
      return {
        content: agentTextFromTurn(turn),
        turnId,
        raw: result
      };
    }
    return await new Promise<CodexAppServerTurnResult>((resolve, reject) => {
      const pending: PendingCodexTurn = {
        threadId: request.threadId,
        turnId,
        content: "",
        raw: result,
        onDelta: request.onDelta,
        resolve,
        reject
      };
      this.turns.set(turnId, pending);
      const abort = () => {
        this.turns.delete(turnId);
        reject(new Error("Codex app-server turn aborted."));
      };
      if (request.signal?.aborted) {
        abort();
        return;
      }
      request.signal?.addEventListener("abort", abort, { once: true });
    });
  }

  dispose(): void {
    for (const pending of this.pending.values()) pending.reject(new Error("Codex app-server client disposed."));
    for (const turn of this.turns.values()) turn.reject(new Error("Codex app-server client disposed."));
    this.pending.clear();
    this.turns.clear();
    this.child?.kill();
    this.child = undefined;
    this.initialized = undefined;
  }

  private request(method: string, params: unknown, signal?: AbortSignal): Promise<unknown> {
    this.ensureStarted();
    const id = this.nextId++;
    const message = { id, method, params };
    return new Promise<unknown>((resolve, reject) => {
      const abort = () => {
        this.pending.delete(id);
        reject(new Error(`Codex app-server request aborted: ${method}`));
      };
      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener("abort", abort, { once: true });
      this.pending.set(id, {
        resolve: (value) => {
          signal?.removeEventListener("abort", abort);
          resolve(value);
        },
        reject: (error) => {
          signal?.removeEventListener("abort", abort);
          reject(error);
        }
      });
      this.child!.stdin.write(`${JSON.stringify(message)}\n`, "utf8");
    });
  }

  private notify(method: string, params?: unknown): void {
    this.ensureStarted();
    const message = params === undefined ? { method } : { method, params };
    this.child!.stdin.write(`${JSON.stringify(message)}\n`, "utf8");
  }

  private ensureStarted() {
    if (this.child) return;
    const env = { ...process.env, ...(this.options.env ?? {}) };
    const spawnRequest = resolveCliSpawnRequest({
      command: this.command,
      args: this.args,
      env
    });
    const child = spawn(spawnRequest.command, spawnRequest.args, {
      cwd: this.options.cwd,
      env,
      shell: spawnRequest.shell,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.child = child;
    child.stdout.on("data", (chunk: Buffer | string) => this.handleStdout(String(chunk)));
    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = String(chunk).trim();
      if (text) this.lastStderr = text;
    });
    child.on("error", (error) => this.failAll(error));
    child.on("close", (code) => {
      this.failAll(new Error([
        `Codex app-server exited with code ${String(code)}.`,
        this.lastStderr ? `stderr: ${this.lastStderr}` : ""
      ].filter(Boolean).join(" ")));
      this.child = undefined;
      this.initialized = undefined;
    });
  }

  private handleStdout(chunk: string) {
    this.stdoutBuffer += chunk;
    for (;;) {
      const newlineIndex = this.stdoutBuffer.indexOf("\n");
      if (newlineIndex < 0) break;
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        if (isJsonRecord(parsed)) this.handleMessage(parsed);
      } catch (error) {
        this.failAll(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private handleMessage(message: Record<string, unknown>) {
    if (Object.prototype.hasOwnProperty.call(message, "id")
      && (Object.prototype.hasOwnProperty.call(message, "result") || Object.prototype.hasOwnProperty.call(message, "error"))) {
      const id = message.id as JsonRpcId;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      if (Object.prototype.hasOwnProperty.call(message, "error")) {
        pending.reject(messageError(message));
        return;
      }
      pending.resolve(message.result);
      return;
    }

    if (isCodexServerRequest(message)) {
      this.child?.stdin.write(`${JSON.stringify({
        id: message.id,
        error: { code: -32601, message: `Unsupported Codex app-server request: ${String(message.method)}` }
      })}\n`, "utf8");
      return;
    }

    if (message.method === "item/agentMessage/delta" && isJsonRecord(message.params)) {
      const turnId = jsonStringField(message.params, "turnId");
      const delta = jsonStringField(message.params, "delta");
      const turn = this.turns.get(turnId);
      if (turn && delta) {
        turn.content += delta;
        turn.onDelta?.(delta);
      }
      return;
    }

    if (message.method === "turn/completed" && isJsonRecord(message.params)) {
      const turnRecord = isJsonRecord(message.params.turn) ? message.params.turn : undefined;
      const turnId = jsonStringField(turnRecord, "id");
      const turn = this.turns.get(turnId);
      if (!turn) return;
      this.turns.delete(turnId);
      const content = agentTextFromTurn(turnRecord) || turn.content;
      turn.resolve({ content, turnId, raw: message.params });
    }
  }

  private failAll(error: Error) {
    for (const pending of this.pending.values()) pending.reject(error);
    for (const turn of this.turns.values()) turn.reject(error);
    this.pending.clear();
    this.turns.clear();
  }
}

interface PendingClaudeInteractiveTurn {
  records: Record<string, unknown>[];
  emitted: string;
  sessionId?: string;
  onDelta?: (delta: string) => void;
  resolve: (result: ClaudeInteractiveTurnResult) => void;
  reject: (error: Error) => void;
  abort?: () => void;
}

function claudeInteractiveInputLine(inputText: string) {
  return `${JSON.stringify({
    type: "user",
    message: {
      role: "user",
      content: [{ type: "text", text: inputText }]
    }
  })}\n`;
}

function appendClaudeInteractiveText(turn: PendingClaudeInteractiveTurn, text: string) {
  const normalized = text.trimEnd();
  if (!normalized) return;
  if (!turn.emitted) {
    turn.emitted = normalized;
    turn.onDelta?.(normalized);
    return;
  }
  if (normalized.startsWith(turn.emitted)) {
    const delta = normalized.slice(turn.emitted.length);
    turn.emitted = normalized;
    if (delta) turn.onDelta?.(delta);
    return;
  }
  if (turn.emitted.endsWith(normalized)) return;
  turn.emitted += normalized;
  turn.onDelta?.(normalized);
}

class ClaudeInteractiveProcessClient implements ClaudeInteractiveClient {
  private child?: ChildProcessWithoutNullStreams;
  private stdoutBuffer = "";
  private lastStderr = "";
  private activeTurn?: PendingClaudeInteractiveTurn;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly command: string,
    private readonly args: string[],
    private readonly options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
  ) {}

  startTurn(request: ClaudeInteractiveTurnRequest): Promise<ClaudeInteractiveTurnResult> {
    const next = this.queue.then(
      () => this.runTurn(request),
      () => this.runTurn(request)
    );
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  dispose(): void {
    this.failActive(new Error("Claude interactive client disposed."));
    this.child?.kill();
    this.child = undefined;
  }

  private runTurn(request: ClaudeInteractiveTurnRequest): Promise<ClaudeInteractiveTurnResult> {
    this.ensureStarted();
    if (this.activeTurn) throw new Error("Claude interactive client already has an active turn.");
    return new Promise<ClaudeInteractiveTurnResult>((resolve, reject) => {
      const pending: PendingClaudeInteractiveTurn = {
        records: [],
        emitted: "",
        onDelta: request.onDelta,
        resolve,
        reject
      };
      const abort = () => {
        this.failActive(new Error("Claude interactive turn aborted."));
        this.child?.kill();
        this.child = undefined;
      };
      pending.abort = abort;
      this.activeTurn = pending;
      if (request.signal?.aborted) {
        abort();
        return;
      }
      request.signal?.addEventListener("abort", abort, { once: true });
      this.child!.stdin.write(claudeInteractiveInputLine(request.inputText), "utf8", (error) => {
        if (!error) return;
        request.signal?.removeEventListener("abort", abort);
        this.failActive(error);
      });
    });
  }

  private ensureStarted() {
    if (this.child) return;
    const env = { ...process.env, ...(this.options.env ?? {}) };
    const spawnRequest = resolveCliSpawnRequest({
      command: this.command,
      args: this.args,
      env
    });
    const child = spawn(spawnRequest.command, spawnRequest.args, {
      cwd: this.options.cwd,
      env,
      shell: spawnRequest.shell,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.child = child;
    child.stdout.on("data", (chunk: Buffer | string) => this.handleStdout(String(chunk)));
    child.stderr.on("data", (chunk: Buffer | string) => {
      const text = String(chunk).trim();
      if (text) this.lastStderr = text;
    });
    child.on("error", (error) => {
      this.failActive(error);
      this.child = undefined;
    });
    child.on("close", (code) => {
      this.failActive(new Error([
        `Claude interactive process exited with code ${String(code)}.`,
        this.lastStderr ? `stderr: ${this.lastStderr}` : ""
      ].filter(Boolean).join(" ")));
      this.child = undefined;
      this.stdoutBuffer = "";
    });
  }

  private handleStdout(chunk: string) {
    this.stdoutBuffer += chunk;
    for (;;) {
      const newlineIndex = this.stdoutBuffer.indexOf("\n");
      if (newlineIndex < 0) break;
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (!line) continue;
      try {
        const parsed = JSON.parse(line);
        if (isJsonRecord(parsed)) this.handleRecord(parsed);
      } catch (error) {
        this.failActive(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private handleRecord(record: Record<string, unknown>) {
    const turn = this.activeTurn;
    if (!turn) return;
    turn.records.push(record);
    if (typeof record.session_id === "string" && record.session_id) {
      turn.sessionId = record.session_id;
    }
    if (record.type === "assistant") {
      appendClaudeInteractiveText(turn, textFromClaudeContent(record));
      return;
    }
    if (record.type !== "result") return;
    const result = jsonStringField(record, "result") || turn.emitted;
    const message = result.trim() || this.lastStderr || "Claude interactive turn failed without a result.";
    const isError = record.is_error === true;
    this.finishActiveTurn(isError ? new Error(message) : undefined, {
      content: message,
      ...(turn.sessionId ? { sessionId: turn.sessionId } : {}),
      raw: turn.records
    });
  }

  private finishActiveTurn(error: Error | undefined, result: ClaudeInteractiveTurnResult) {
    const turn = this.activeTurn;
    if (!turn) return;
    this.activeTurn = undefined;
    turn.abort = undefined;
    if (error) {
      turn.reject(error);
      return;
    }
    turn.resolve(result);
  }

  private failActive(error: Error) {
    const turn = this.activeTurn;
    if (!turn) return;
    this.activeTurn = undefined;
    turn.abort = undefined;
    turn.reject(error);
  }
}

function stripCodexTranscriptEnvelope(output: string, options: { requireAssistantMarker?: boolean } = {}) {
  const normalized = output.replace(/\r\n/g, "\n").trim();
  if (!normalized) return normalized;
  const lines = normalized.split("\n");
  const lastCodexLine = lines.map((line) => line.trim()).lastIndexOf("codex");
  if (options.requireAssistantMarker && lastCodexLine < 0) return "";
  const answerLines = lastCodexLine >= 0 ? lines.slice(lastCodexLine + 1) : lines;
  const tokensIndex = answerLines.findIndex((line) => /^tokens used\b/i.test(line.trim()));
  return (tokensIndex >= 0 ? answerLines.slice(0, tokensIndex) : answerLines).join("\n").trim();
}

function parseJsonLines(output: string): Record<string, unknown>[] | undefined {
  const records: Record<string, unknown>[] = [];
  const lines = output.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return undefined;
  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return undefined;
    }
    if (!isJsonRecord(parsed)) return undefined;
    records.push(parsed);
  }
  return records.length > 0 ? records : undefined;
}

function textFromClaudeContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(textFromClaudeContent).filter(Boolean).join("");
  }
  if (!isJsonRecord(value)) return "";
  if (typeof value.text === "string") return value.text;
  if (typeof value.result === "string") return value.result;
  if (isJsonRecord(value.delta) && typeof value.delta.text === "string") return value.delta.text;
  if (isJsonRecord(value.message)) return textFromClaudeContent(value.message);
  if (Object.prototype.hasOwnProperty.call(value, "content")) return textFromClaudeContent(value.content);
  return "";
}

function mergeClaudeStreamText(chunks: string[]) {
  let merged = "";
  for (const chunk of chunks) {
    const text = chunk.trimEnd();
    if (!text) continue;
    if (!merged) {
      merged = text;
      continue;
    }
    if (text.startsWith(merged)) {
      merged = text;
      continue;
    }
    if (merged.endsWith(text)) continue;
    merged += text;
  }
  return merged.trim();
}

function normalizeClaudeJsonStreamOutput(output: string) {
  const records = parseJsonLines(output);
  if (!records) return undefined;
  const resultRecord = [...records].reverse().find((record) =>
    record.type === "result" && typeof record.result === "string"
  );
  if (resultRecord && typeof resultRecord.result === "string") return resultRecord.result.trim();
  const chunks = records
    .map((record) => textFromClaudeContent(record))
    .filter(Boolean);
  const merged = mergeClaudeStreamText(chunks);
  return merged || undefined;
}

function normalizeCliOutput(providerName: string, stdout: string, stderr: string) {
  const output = stdout.trim() || stderr.trim();
  if (providerName === "codex-cli") return stripCodexTranscriptEnvelope(output);
  if (providerName === "claude-cli") return normalizeClaudeJsonStreamOutput(output) ?? output.trim();
  return output.trim();
}

function normalizeCliStreamingOutput(providerName: string, stdout: string, stderr: string) {
  if (providerName === "codex-cli") {
    return stripCodexTranscriptEnvelope(stdout, { requireAssistantMarker: true });
  }
  if (providerName === "claude-cli") {
    return normalizeClaudeJsonStreamOutput(stdout) ?? normalizeCliOutput(providerName, stdout, stderr);
  }
  return normalizeCliOutput(providerName, stdout, stderr);
}

function appendDeltaFromNormalized(
  normalized: string,
  emitted: string,
  enqueue: (delta: string) => void
) {
  if (!normalized || normalized.length <= emitted.length) return emitted;
  if (!normalized.startsWith(emitted)) return emitted;
  const delta = normalized.slice(emitted.length);
  if (delta) enqueue(delta);
  return normalized;
}

function cliResponse(
  providerName: string,
  command: string,
  args: string[],
  codexDeskMcpConfigured: boolean,
  result: CliRunResult,
  runtime: ProviderRuntimeCapabilities,
  options: {
    sessionReuse?: boolean;
    preflight?: CliPreflightStatus;
  } = {}
): ProviderResponse {
  const content = normalizeCliOutput(providerName, result.stdout, result.stderr);
  return {
    message: {
      role: "assistant",
      content,
      providerMetadata: {
        cli: {
          provider: providerName,
          command,
          args,
          exitCode: result.exitCode ?? undefined,
          transport: runtime.transport,
          processModel: runtime.persistentSession ? "persistent-process" : "process-per-turn",
          streaming: runtime.streaming,
          persistentSession: runtime.persistentSession,
          sessionReuse: options.sessionReuse || undefined,
          sessionReuseMode: options.sessionReuse ? "provider-resume-args" : undefined,
          preflight: options.preflight,
          xenesisDeskMcpConfigured: codexDeskMcpConfigured || undefined,
          stderr: result.stderr.trim() || undefined
        }
      }
    }
  };
}

function cliFailure(providerName: string, result: CliRunResult) {
  const detail = result.stderr.trim() || result.stdout.trim() || "no CLI output";
  return new Error(`${providerName} failed with exit code ${String(result.exitCode)}: ${detail}`);
}

function codexAppServerResponse(
  content: string,
  metadata: {
    command: string;
    args: string[];
    threadId: string;
    turnId?: string;
    codexDeskMcpConfigured: boolean;
    preflight?: CliPreflightStatus;
    raw?: unknown;
  }
): ProviderResponse {
  return {
    message: {
      role: "assistant",
      content: content.trim(),
      providerMetadata: {
        cli: {
          provider: "codex-app-server",
          transport: "app-server",
          runtimeTransport: "cli-interactive",
          command: metadata.command,
          args: metadata.args,
          threadId: metadata.threadId,
          turnId: metadata.turnId,
          streaming: true,
          persistentSession: true,
          processModel: "persistent-process",
          preflight: metadata.preflight,
          xenesisDeskMcpConfigured: metadata.codexDeskMcpConfigured || undefined,
          raw: metadata.raw
        }
      }
    }
  };
}

const codexAppServerSessions = new Map<string, CodexAppServerSession>();

function codexAppServerSessionKey(env: NodeJS.ProcessEnv, command: string, args: string[], cwd?: string) {
  const home = textEnv(env.XENESIS_HOME) ?? textEnv(env.XENIS_HOME) ?? "";
  const sessionKey = textEnv(env.XENESIS_CLI_SESSION_KEY) ?? cwd ?? "default";
  return [home, sessionKey, command, ...args].map((part) => safeSessionKey(part)).join("|");
}

export class CodexAppServerProvider implements AgentProvider {
  name = "codex-app-server";
  readonly capabilities: ProviderRuntimeCapabilities = {
    transport: "cli-interactive",
    streaming: true,
    persistentSession: true
  };
  private readonly command: string;
  private readonly args: string[];
  private readonly cwd?: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly timeoutMs?: number;
  private readonly session: CodexAppServerSession;
  private readonly fallbackProvider?: AgentProvider;
  private readonly codexDeskMcpConfigured: boolean;
  private readonly preflight?: CliPreflightStatus;

  constructor(options: CodexAppServerProviderOptions = {}) {
    const env = options.env ?? process.env;
    this.env = env;
    this.command = options.command ?? env.XENESIS_CODEX_APP_SERVER_COMMAND ?? env.XENESIS_CODEX_CLI_COMMAND ?? "codex";
    this.timeoutMs = positiveInteger(options.timeoutMs)
      ?? positiveInteger(env.XENESIS_CODEX_APP_SERVER_TIMEOUT_MS)
      ?? positiveInteger(env.XENESIS_CODEX_CLI_TIMEOUT_MS)
      ?? positiveInteger(env.XENESIS_CLI_TIMEOUT_MS)
      ?? DEFAULT_PERSISTENT_CLI_TURN_TIMEOUT_MS;
    const appServerArgs = options.args
      ? { args: options.args, configured: argsAlreadyConfigureDeskMcp(options.args) }
      : codexAppServerArgs(env);
    this.args = appServerArgs.args;
    this.cwd = options.cwd;
    this.codexDeskMcpConfigured = appServerArgs.configured;
    this.preflight = resolveCliPreflightStatus("codex-app-server", this.command, env, {
      runner: options.preflightRunner
    });
    this.session = options.session ?? codexAppServerSessions.get(codexAppServerSessionKey(env, this.command, this.args, this.cwd)) ?? {};
    if (!options.session) {
      codexAppServerSessions.set(codexAppServerSessionKey(env, this.command, this.args, this.cwd), this.session);
    }
    this.session.client ??= options.client ?? new CodexAppServerProcessClient(this.command, this.args, {
      cwd: this.cwd,
      env: this.env
    });
    this.fallbackProvider = options.fallbackProvider ?? new CodexCliProvider({
      cwd: options.cwd,
      env
    });
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    try {
      const result = await this.runAppServerTurn(request);
      return codexAppServerResponse(result.content, {
        command: this.command,
        args: this.args,
        threadId: result.threadId,
        turnId: result.turnId,
        codexDeskMcpConfigured: this.codexDeskMcpConfigured,
        preflight: this.preflight,
        raw: result.raw
      });
    } catch (error) {
      return await this.completeWithFallback(request, error);
    }
  }

  async *stream(request: ProviderRequest): AsyncIterable<ProviderStreamEvent> {
    const queue: ProviderStreamEvent[] = [];
    let wake: (() => void) | undefined;
    let done = false;
    let result: Awaited<ReturnType<CodexAppServerProvider["runAppServerTurn"]>> | undefined;
    let failure: unknown;
    let emittedAppServerDelta = false;

    const notify = () => {
      const resolve = wake;
      wake = undefined;
      resolve?.();
    };
    const enqueue = (event: ProviderStreamEvent) => {
      queue.push(event);
      notify();
    };

    void this.runAppServerTurn(request, (delta) => {
      emittedAppServerDelta = true;
      enqueue({ type: "text_delta", delta });
    })
      .then((value) => {
        result = value;
        enqueue({
          type: "response",
          response: codexAppServerResponse(value.content, {
            command: this.command,
            args: this.args,
            threadId: value.threadId,
            turnId: value.turnId,
            codexDeskMcpConfigured: this.codexDeskMcpConfigured,
            preflight: this.preflight,
            raw: value.raw
          })
        });
      })
      .catch((error) => {
        failure = error;
      })
      .finally(() => {
        done = true;
        notify();
      });

    while (!done || queue.length > 0) {
      const next = queue.shift();
      if (next) {
        yield next;
        continue;
      }
      await new Promise<void>((resolve) => {
        wake = resolve;
        if (done || queue.length > 0) notify();
      });
    }

    if (failure) {
      if (emittedAppServerDelta) {
        throw failure instanceof Error ? failure : new Error(String(failure));
      }
      if (this.fallbackProvider?.stream) {
        for await (const event of this.fallbackProvider.stream(request)) yield event;
        return;
      }
      if (this.fallbackProvider) {
        yield { type: "response", response: await this.completeWithFallback(request, failure) };
        return;
      }
      throw failure;
    }
    if (!result) throw new Error("Codex app-server stream ended without a provider result.");
  }

  dispose(): void {
    this.session.client?.dispose();
    this.session.client = undefined;
    this.session.threadId = undefined;
    this.session.initialized = undefined;
    this.session.unavailable = undefined;
    this.session.lastError = undefined;
  }

  private async runAppServerTurn(request: ProviderRequest, onDelta?: (delta: string) => void) {
    if (this.session.unavailable) {
      throw new Error(this.session.lastError || "Codex app-server is unavailable.");
    }
    const client = this.session.client;
    if (!client) throw new Error("Codex app-server client is not configured.");
    const operation = createTimeoutSignal(request.signal, this.timeoutMs, "Codex app-server turn");
    try {
      if (!this.session.initialized) {
        await client.initialize(operation.signal);
      }
      const model = codexAppServerModel(this.env, request.model);
      const resumed = Boolean(this.session.threadId && this.session.initialized);
      if (!this.session.threadId) {
        const thread = await client.startThread({
          ...(model ? { model } : {}),
          cwd: this.cwd,
          signal: operation.signal
        });
        this.session.threadId = thread.threadId;
        this.session.initialized = true;
      }
      const requestMessages = resumed ? continuationMessages(request.messages) : request.messages;
      const inputMessages = providerTurnMessages(requestMessages, {
        deskMcpConfigured: this.codexDeskMcpConfigured,
        providerName: "codex-cli"
      });
      const result = await client.startTurn({
        threadId: this.session.threadId,
        inputText: formatPrompt(inputMessages),
        ...(model ? { model } : {}),
        cwd: this.cwd,
        signal: operation.signal,
        onDelta
      });
      return {
        ...result,
        threadId: this.session.threadId
      };
    } catch (error) {
      client.dispose();
      this.session.client = undefined;
      this.session.unavailable = true;
      this.session.lastError = operation.timedOut() && this.timeoutMs
        ? `Codex app-server turn timed out after ${this.timeoutMs}ms.`
        : error instanceof Error ? error.message : String(error);
      throw new Error(this.session.lastError);
    } finally {
      operation.cleanup();
    }
  }

  private async completeWithFallback(request: ProviderRequest, cause: unknown): Promise<ProviderResponse> {
    if (!this.fallbackProvider) throw cause instanceof Error ? cause : new Error(String(cause));
    return await this.fallbackProvider.complete(request);
  }
}

function claudeInteractiveResponse(
  content: string,
  metadata: {
    command: string;
    args: string[];
    sessionId?: string;
    claudeDeskMcpConfigured: boolean;
    preflight?: CliPreflightStatus;
    raw?: unknown;
  }
): ProviderResponse {
  return {
    message: {
      role: "assistant",
      content: content.trim(),
      providerMetadata: {
        cli: {
          provider: "claude-interactive",
          transport: "stream-json",
          runtimeTransport: "cli-interactive",
          command: metadata.command,
          args: metadata.args,
          sessionId: metadata.sessionId,
          streaming: true,
          persistentSession: true,
          processModel: "persistent-process",
          preflight: metadata.preflight,
          xenesisDeskMcpConfigured: metadata.claudeDeskMcpConfigured || undefined,
          raw: metadata.raw
        }
      }
    }
  };
}

const claudeInteractiveSessions = new Map<string, ClaudeInteractiveSession>();

function claudeInteractiveSessionKey(env: NodeJS.ProcessEnv, command: string, args: string[], cwd?: string) {
  const home = textEnv(env.XENESIS_HOME) ?? textEnv(env.XENIS_HOME) ?? "";
  const sessionKey = textEnv(env.XENESIS_CLI_SESSION_KEY) ?? cwd ?? "default";
  return [home, sessionKey, command, ...args].map((part) => safeSessionKey(part)).join("|");
}

export class ClaudeInteractiveProvider implements AgentProvider {
  name = "claude-interactive";
  readonly capabilities: ProviderRuntimeCapabilities = {
    transport: "cli-interactive",
    streaming: true,
    persistentSession: true
  };
  private readonly command: string;
  private readonly args: string[];
  private readonly cwd?: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly timeoutMs?: number;
  private readonly session: ClaudeInteractiveSession;
  private readonly claudeDeskMcpConfigured: boolean;
  private readonly preflight?: CliPreflightStatus;

  constructor(options: ClaudeInteractiveProviderOptions = {}) {
    const env = options.env ?? process.env;
    this.env = env;
    this.command = options.command ?? env.XENESIS_CLAUDE_INTERACTIVE_COMMAND ?? env.XENESIS_CLAUDE_CLI_COMMAND ?? "claude";
    this.timeoutMs = positiveInteger(options.timeoutMs)
      ?? positiveInteger(env.XENESIS_CLAUDE_INTERACTIVE_TIMEOUT_MS)
      ?? positiveInteger(env.XENESIS_CLAUDE_CLI_TIMEOUT_MS)
      ?? positiveInteger(env.XENESIS_CLI_TIMEOUT_MS)
      ?? DEFAULT_PERSISTENT_CLI_TURN_TIMEOUT_MS;
    const baseArgs = options.args ?? parseArgsFromEnv(env.XENESIS_CLAUDE_INTERACTIVE_ARGS, [
      "-p",
      "--setting-sources",
      "project,local",
      "--output-format",
      "stream-json",
      "--input-format",
      "stream-json",
      "--include-partial-messages",
      "--verbose"
    ]);
    const mcpArgs = maybeAddDeskMcpArgs("claude-interactive", baseArgs, env);
    this.args = mcpArgs.args;
    this.cwd = options.cwd;
    this.claudeDeskMcpConfigured = mcpArgs.configured;
    this.preflight = resolveCliPreflightStatus("claude-interactive", this.command, env, {
      runner: options.preflightRunner
    });
    this.session = options.session
      ?? claudeInteractiveSessions.get(claudeInteractiveSessionKey(env, this.command, this.args, this.cwd))
      ?? {};
    if (!options.session) {
      claudeInteractiveSessions.set(claudeInteractiveSessionKey(env, this.command, this.args, this.cwd), this.session);
    }
    this.session.client ??= options.client ?? new ClaudeInteractiveProcessClient(this.command, this.args, {
      cwd: this.cwd,
      env: this.env
    });
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const result = await this.runInteractiveTurn(request);
    return claudeInteractiveResponse(result.content, {
      command: this.command,
      args: this.args,
      sessionId: result.sessionId ?? this.session.sessionId,
      claudeDeskMcpConfigured: this.claudeDeskMcpConfigured,
      preflight: this.preflight,
      raw: result.raw
    });
  }

  async *stream(request: ProviderRequest): AsyncIterable<ProviderStreamEvent> {
    const queue: ProviderStreamEvent[] = [];
    let wake: (() => void) | undefined;
    let done = false;
    let result: ClaudeInteractiveTurnResult | undefined;
    let failure: unknown;

    const notify = () => {
      const resolve = wake;
      wake = undefined;
      resolve?.();
    };
    const enqueue = (event: ProviderStreamEvent) => {
      queue.push(event);
      notify();
    };

    void this.runInteractiveTurn(request, (delta) => enqueue({ type: "text_delta", delta }))
      .then((value) => {
        result = value;
        enqueue({
          type: "response",
          response: claudeInteractiveResponse(value.content, {
            command: this.command,
            args: this.args,
            sessionId: value.sessionId ?? this.session.sessionId,
            claudeDeskMcpConfigured: this.claudeDeskMcpConfigured,
            preflight: this.preflight,
            raw: value.raw
          })
        });
      })
      .catch((error) => {
        failure = error;
      })
      .finally(() => {
        done = true;
        notify();
      });

    while (!done || queue.length > 0) {
      const next = queue.shift();
      if (next) {
        yield next;
        continue;
      }
      await new Promise<void>((resolve) => {
        wake = resolve;
        if (done || queue.length > 0) notify();
      });
    }

    if (failure) throw failure instanceof Error ? failure : new Error(String(failure));
    if (!result) throw new Error("Claude interactive stream ended without a provider result.");
  }

  dispose(): void {
    void this.session.client?.dispose();
    this.session.client = undefined;
    this.session.sessionId = undefined;
    this.session.unavailable = undefined;
    this.session.lastError = undefined;
  }

  private async runInteractiveTurn(request: ProviderRequest, onDelta?: (delta: string) => void) {
    if (this.session.unavailable) {
      throw new Error(this.session.lastError || "Claude interactive provider is unavailable.");
    }
    const client = this.session.client;
    if (!client) throw new Error("Claude interactive client is not configured.");
    const operation = createTimeoutSignal(request.signal, this.timeoutMs, "Claude interactive turn");
    try {
      const resumed = Boolean(this.session.sessionId);
      const requestMessages = resumed ? continuationMessages(request.messages) : request.messages;
      const inputMessages = providerTurnMessages(requestMessages, {
        deskMcpConfigured: this.claudeDeskMcpConfigured,
        providerName: this.name
      });
      const result = await client.startTurn({
        inputText: formatPrompt(inputMessages),
        signal: operation.signal,
        onDelta
      });
      if (result.sessionId) this.session.sessionId = result.sessionId;
      return result;
    } catch (error) {
      if (operation.timedOut() && this.timeoutMs) {
        this.session.lastError = `Claude interactive turn timed out after ${this.timeoutMs}ms.`;
      } else {
        this.session.lastError = error instanceof Error ? error.message : String(error);
      }
      this.session.unavailable = true;
      void client.dispose();
      this.session.client = undefined;
      throw new Error(this.session.lastError);
    } finally {
      operation.cleanup();
    }
  }
}

class BaseCliProvider implements AgentProvider {
  name: string;
  readonly capabilities: ProviderRuntimeCapabilities = {
    transport: "cli-oneshot",
    streaming: true,
    persistentSession: false
  };
  private readonly command: string;
  private readonly args: string[];
  private readonly cwd?: string;
  private readonly env?: NodeJS.ProcessEnv;
  private readonly timeoutMs?: number;
  private readonly run: CliRunner;
  private readonly codexDeskMcpConfigured: boolean;
  private readonly cliSessionHandle?: CliSessionHandle;
  private readonly preflight?: CliPreflightStatus;

  constructor(defaults: CliProviderDefaults, options: CliProviderOptions = {}) {
    this.name = defaults.providerName;
    const env = options.env ?? process.env;
    this.command = options.command ?? env[defaults.commandEnv] ?? defaults.defaultCommand;
    this.timeoutMs = positiveInteger(options.timeoutMs)
      ?? positiveInteger(env[defaults.timeoutEnv])
      ?? positiveInteger(env.XENESIS_CLI_TIMEOUT_MS)
      ?? defaults.defaultTimeoutMs;
    const baseArgs = options.args ?? parseArgsFromEnv(env[defaults.argsEnv], defaults.defaultArgs);
    const codexMcpArgs = maybeAddDeskMcpArgs(defaults.providerName, baseArgs, env);
    this.args = codexMcpArgs.args;
    this.cwd = options.cwd;
    this.env = options.env;
    this.run = options.run ?? defaultCliRunner;
    this.codexDeskMcpConfigured = codexMcpArgs.configured;
    this.cliSessionHandle = resolveCliSessionHandle(defaults.providerName, env);
    this.preflight = resolveCliPreflightStatus(defaults.providerName, this.command, env, {
      runner: options.preflightRunner
    });
  }

  private messagesForRequest(request: ProviderRequest, resumed: boolean) {
    const requestMessages = resumed ? continuationMessages(request.messages) : request.messages;
    return providerTurnMessages(requestMessages, {
      deskMcpConfigured: this.codexDeskMcpConfigured,
      providerName: this.name
    });
  }

  private runPlan(request: ProviderRequest) {
    const args = sessionArgs(this.name, this.args, this.cliSessionHandle);
    const resumed = Boolean(this.cliSessionHandle?.state.initialized);
    return {
      args,
      messages: this.messagesForRequest(request, resumed)
    };
  }

  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    const plan = this.runPlan(request);
    const operation = createTimeoutSignal(request.signal, this.timeoutMs, `${this.name} CLI turn`);
    try {
      const result = await this.run({
        command: this.command,
        args: plan.args,
        stdin: formatPrompt(plan.messages),
        cwd: this.cwd,
        env: this.env,
        signal: operation.signal
      });
      if (result.exitCode !== 0) {
        throw cliFailure(this.name, result);
      }

      markCliSessionInitialized(this.cliSessionHandle);
      return cliResponse(this.name, this.command, plan.args, this.codexDeskMcpConfigured, result, this.capabilities, {
        sessionReuse: Boolean(this.cliSessionHandle),
        preflight: this.preflight
      });
    } catch (error) {
      if (operation.timedOut() && this.timeoutMs) {
        throw new Error(`${this.name} CLI turn timed out after ${this.timeoutMs}ms.`);
      }
      throw error;
    } finally {
      operation.cleanup();
    }
  }

  async *stream(request: ProviderRequest): AsyncIterable<ProviderStreamEvent> {
    const plan = this.runPlan(request);
    const operation = createTimeoutSignal(request.signal, this.timeoutMs, `${this.name} CLI turn`);
    const queue: ProviderStreamEvent[] = [];
    let wake: (() => void) | undefined;
    let stdout = "";
    let stderr = "";
    let emitted = "";
    let done = false;
    let result: CliRunResult | undefined;
    let failure: unknown;

    const notify = () => {
      const resolve = wake;
      wake = undefined;
      resolve?.();
    };
    const enqueue = (event: ProviderStreamEvent) => {
      queue.push(event);
      notify();
    };
    const emitAvailableDelta = () => {
      emitted = appendDeltaFromNormalized(
        normalizeCliStreamingOutput(this.name, stdout, stderr),
        emitted,
        (delta) => enqueue({ type: "text_delta", delta })
      );
    };
    const emitFinalDelta = (content: string) => {
      emitted = appendDeltaFromNormalized(
        content,
        emitted,
        (delta) => enqueue({ type: "text_delta", delta })
      );
    };

    void this.run({
      command: this.command,
      args: plan.args,
      stdin: formatPrompt(plan.messages),
      cwd: this.cwd,
      env: this.env,
      signal: operation.signal,
      onStdout: (chunk) => {
        stdout += chunk;
        emitAvailableDelta();
      },
      onStderr: (chunk) => {
        stderr += chunk;
        emitAvailableDelta();
      }
    }).then((value) => {
      result = value;
      stdout = value.stdout;
      stderr = value.stderr;
      if (value.exitCode === 0) {
        markCliSessionInitialized(this.cliSessionHandle);
        emitFinalDelta(normalizeCliOutput(this.name, value.stdout, value.stderr));
      }
    }).catch((error) => {
      failure = operation.timedOut() && this.timeoutMs
        ? new Error(`${this.name} CLI turn timed out after ${this.timeoutMs}ms.`)
        : error;
    }).finally(() => {
      operation.cleanup();
      done = true;
      notify();
    });

    while (!done || queue.length > 0) {
      const next = queue.shift();
      if (next) {
        yield next;
        continue;
      }
      await new Promise<void>((resolve) => {
        wake = resolve;
        if (done || queue.length > 0) notify();
      });
    }

    if (failure) throw failure;
    if (operation.timedOut() && this.timeoutMs) {
      throw new Error(`${this.name} CLI turn timed out after ${this.timeoutMs}ms.`);
    }
    if (!result) throw new Error(`${this.name} stream ended without a CLI result.`);
    if (result.exitCode !== 0) throw cliFailure(this.name, result);

    yield {
      type: "response",
      response: cliResponse(this.name, this.command, plan.args, this.codexDeskMcpConfigured, result, this.capabilities, {
        sessionReuse: Boolean(this.cliSessionHandle),
        preflight: this.preflight
      })
    };
  }
}

export class CodexCliProvider extends BaseCliProvider {
  constructor(options: CliProviderOptions = {}) {
    super({
      providerName: "codex-cli",
      defaultCommand: "codex",
      defaultArgs: ["exec", "--skip-git-repo-check", "--sandbox", "read-only", "-"],
      commandEnv: "XENESIS_CODEX_CLI_COMMAND",
      argsEnv: "XENESIS_CODEX_CLI_ARGS",
      timeoutEnv: "XENESIS_CODEX_CLI_TIMEOUT_MS",
      defaultTimeoutMs: DEFAULT_ONESHOT_CLI_TURN_TIMEOUT_MS
    }, options);
  }
}

export class ClaudeCliProvider extends BaseCliProvider {
  constructor(options: CliProviderOptions = {}) {
    super({
      providerName: "claude-cli",
      defaultCommand: "claude",
      defaultArgs: ["-p", "--setting-sources", "project,local", "--output-format", "stream-json", "--include-partial-messages", "--verbose"],
      commandEnv: "XENESIS_CLAUDE_CLI_COMMAND",
      argsEnv: "XENESIS_CLAUDE_CLI_ARGS",
      timeoutEnv: "XENESIS_CLAUDE_CLI_TIMEOUT_MS",
      defaultTimeoutMs: DEFAULT_ONESHOT_CLI_TURN_TIMEOUT_MS
    }, options);
  }
}
