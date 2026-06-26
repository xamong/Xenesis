import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  displayXenesisStatePath,
  type ProviderFallbackConfig,
  type ProviderName,
  type ProviderSetupEntry,
  resolveXenesisStatePath,
  type McpServerConfig,
  type XenesisConfig,
  xenesisStatePath
} from "../config/index.js";
import { FileWorkspaceContextIndexStore } from "../context/index.js";
import {
  buildMemorySystemMessage,
  buildSkillCatalogSystemMessage,
  buildSkillSystemMessage,
  clampApprovalMode,
  createAgentRunnerSubagentExecutor,
  createRuntimeToolRegistry,
  createSubagentTaskTool,
  loadPluginProviders,
  createEmbedder,
  mergeRecommendedMcpServers,
  registerMcpServerTools,
  SqliteMcpAuthStore,
  SqliteMemoryStore,
  SqlitePluginStateStore,
  SqliteSubagentTaskStore,
  loadSkillRegistry,
  type SkillDefinition,
  type SubagentTaskExecutor
} from "../extensions/index.js";
import { buildIdeContextSystemMessage, normalizeIdeContext, type IdeContextInput } from "../ide/index.js";
import {
  collectAgentMessages,
  collectAgentTaskContext,
  drainLegacyAgentInbox,
  SqliteAgentMessageStore,
  SqliteAgentTaskStore
} from "../orchestration/index.js";
import { filterToolsForApprovalMode } from "../permissions/policy.js";
import {
  AnthropicProvider,
  ClaudeCliProvider,
  ClaudeInteractiveProvider,
  CodexAppServerProvider,
  CodexCliProvider,
  MockProvider,
  OpenAIProvider,
  PROVIDER_CAPABILITIES,
  capabilitiesFor,
  getProviderFactory,
  presetApiKeyEnv,
  registerCodexResponsesProvider,
  resolveProviderSettings,
  type AgentProvider
} from "../providers/index.js";
import {
  createAppE2ECheckTool,
  createBrowserTool,
  createBuiltInTools,
  createComputerUseTool,
  createMemoryTool,
  createSessionSearchTool,
  createToolSearchTool,
  type ToolRegistry
} from "../tools/index.js";
import type { AdaptiveExecutionPolicy } from "./adaptiveExecutionPolicy.js";
import { createAgentCapabilityPolicySystemMessage } from "./agentCapabilityPolicy.js";
import type { ApprovalHandler } from "./AgentRunner.js";
import type { ContextSourceKind } from "./events.js";
import type { AgentMessage } from "./messages.js";
import {
  buildOperationalFailureSystemMessage,
  collectOperationalFailureContext,
  operationalFailureContextSource
} from "./operationalFailureContext.js";
import { staticRecordAdapter } from "./context/adapters.js";
import type { ContextDropReason } from "./context/ContextBudget.js";
import {
  buildContextPromptBlocks,
  type ContextPromptBlockBuildResult,
  type ContextSourceAdapter
} from "./context/ContextOrchestrator.js";
import { estimateContextTokens } from "./context/ContextRecord.js";
import { createInstructionContextAdapter } from "./context/instructions/InstructionDiscovery.js";
import { computeContextTokenBudget } from "./context/modelMetadata.js";
import {
  composeSystemPrompt,
  createSection13PromptBlocks,
  toSection13PromptTrace,
  type PromptBlock,
  type Section13ReferenceName
} from "./prompt/index.js";

type SystemMessage = Extract<AgentMessage, { role: "system" }>;

export type AgentRunMode = "plan" | "work";

export interface AgentRunSystemMessageOptions {
  prompt: string;
  sessionId?: string;
  taskId?: string;
  claimAgentMessages?: boolean;
  mode?: AgentRunMode;
  fromPlan?: boolean;
  model?: string;
  cwd?: string;
  ideContext?: IdeContextInput;
  systemMessages?: SystemMessage[];
  workflowContext?: {
    name: string;
    description?: string;
  };
}

export interface RunSystemContextSource {
  source: ContextSourceKind;
  name: string;
  injected: boolean;
  itemCount?: number;
  detail?: string;
  usedTokens?: number;
  tokenBudget?: number;
  droppedReason?: ContextDropReason;
}

export interface RunSystemContext {
  messages: SystemMessage[];
  sources: RunSystemContextSource[];
  backgroundTaskIds?: string[];
  agentMessageIds?: string[];
  adaptivePolicy?: AdaptiveExecutionPolicy;
}

export type RuntimeNoticeHandler = (line: string) => void | Promise<void>;

export interface ResolvedFallback {
  provider: AgentProvider;
  model: string;
  supportsTools: boolean;
  label: string;
}

export type SkippedFallbackReason = "disabled" | "no-credential" | "duplicate";

export interface SkippedFallback {
  label: string;
  reason: SkippedFallbackReason;
}

export interface FallbackChainResult {
  chain: ResolvedFallback[];
  skipped: SkippedFallback[];
}

function withProviderModel<T extends AgentProvider>(provider: T, model: string): T {
  provider.model = provider.model ?? model;
  return provider;
}

export function createProvider(config: XenesisConfig, env: NodeJS.ProcessEnv): AgentProvider {
  // Option B: the codex-responses provider talks to the ChatGPT Codex backend
  // directly (OAuth from ~/.codex/auth.json). Register lazily on first request so
  // the factory map picks it up below; reasoning effort comes from the launch env.
  if (config.provider === "codex-responses" && !getProviderFactory("codex-responses")) {
    registerCodexResponsesProvider();
  }
  const reg = getProviderFactory(config.provider);
  if (reg) {
    const regSettings = resolveProviderSettings(config, env);
    return withProviderModel(
      reg({
        name: config.provider,
        model: config.model,
        apiKey: regSettings.apiKey,
        baseURL: regSettings.baseURL,
        env
      }),
      config.model
    );
  }
  if (config.provider === "mock") return withProviderModel(new MockProvider(), config.model);
  if (config.provider === "codex-app-server") return withProviderModel(new CodexAppServerProvider({ env }), config.model);
  if (config.provider === "codex-cli") return withProviderModel(new CodexCliProvider({ env }), config.model);
  if (config.provider === "claude-interactive") return withProviderModel(new ClaudeInteractiveProvider({ env }), config.model);
  if (config.provider === "claude-cli") return withProviderModel(new ClaudeCliProvider({ env }), config.model);
  const settings = resolveProviderSettings(config, env);
  const apiKey = settings.apiKey
    ?? ((capabilitiesFor(settings.provider) ?? PROVIDER_CAPABILITIES[settings.provider]).requiresApiKey ? undefined : "xenesis-local");
  if (apiKey === undefined) {
    // A key-requiring provider reached this fallthrough with no resolved credential.
    // The OpenAI/Anthropic SDK would otherwise throw an opaque "Missing credentials".
    // Only throw when there is also no ambient key (preserving the SDK's process.env
    // fallback). This surfaces an actionable error AND catches the codex-responses
    // routing regression, where the provider name was lost before the registry branch
    // above and silently collapsed to a keyless key-based provider.
    const keyEnvName = settings.apiKeyEnv;
    const ambientKey = keyEnvName ? (env[keyEnvName] ?? process.env[keyEnvName]) : undefined;
    if (!ambientKey) {
      throw new Error(
        `Cannot construct provider "${settings.provider}": it requires an API key` +
          `${keyEnvName ? ` (set ${keyEnvName})` : ""} but none was resolved. ` +
          `If you intended codex-responses (codex OAuth, no API key needed), the provider ` +
          `name was lost in routing — ensure "codex-responses" is in the desk provider ` +
          `allowlist and that config.provider survived loadConfig.`
      );
    }
  }
  if (settings.provider === "anthropic" || settings.provider === "claude") {
    return new AnthropicProvider({
      name: settings.provider,
      model: config.model,
      apiKey,
      baseURL: settings.baseURL
    });
  }
  return new OpenAIProvider({
    name: settings.provider,
    model: config.model,
    apiKey,
    baseURL: settings.baseURL
  });
}

export function createFallbackProviders(config: XenesisConfig, env: NodeJS.ProcessEnv): AgentProvider[] {
  return resolveFallbackChain(config, env).chain.map((fallback) => fallback.provider);
}

type FallbackCandidate = {
  kind: ProviderName;
  model?: string;
  baseURL?: string;
  apiKeyEnv?: string;
  supportsTools?: boolean;
  label?: string;
  enabled?: boolean;
};

function hasProviderCatalog(config: XenesisConfig) {
  return (config.providers?.length ?? 0) > 0;
}

function candidateKey(candidate: FallbackCandidate, fallbackModel: string) {
  return [
    candidate.kind,
    fallbackModel,
    candidate.baseURL ?? "",
    candidate.apiKeyEnv ?? ""
  ].join("\0");
}

function catalogCandidate(entry: ProviderSetupEntry): FallbackCandidate {
  return {
    kind: entry.kind,
    model: entry.model,
    baseURL: entry.baseURL,
    apiKeyEnv: entry.apiKeyEnv,
    supportsTools: entry.supportsTools,
    label: entry.label,
    enabled: entry.enabled
  };
}

function legacyCandidate(fallback: ProviderFallbackConfig): FallbackCandidate {
  return {
    kind: fallback.provider,
    model: fallback.model,
    baseURL: fallback.baseURL,
    apiKeyEnv: fallback.apiKeyEnv
  };
}

function fallbackCandidateLabel(candidate: FallbackCandidate) {
  return candidate.label ?? `${candidate.kind}${candidate.model ? `:${candidate.model}` : ""}`;
}

function fallbackRequiresCredential(candidate: FallbackCandidate) {
  return (capabilitiesFor(candidate.kind) ?? PROVIDER_CAPABILITIES[candidate.kind]).requiresApiKey || Boolean(candidate.apiKeyEnv);
}

function fallbackCredentialEnv(candidate: FallbackCandidate) {
  return candidate.apiKeyEnv ?? presetApiKeyEnv(candidate.kind);
}

function createFallbackProviderFromCandidate(
  config: XenesisConfig,
  candidate: FallbackCandidate,
  env: NodeJS.ProcessEnv
) {
  return createProvider({
    ...config,
    provider: candidate.kind,
    model: candidate.model ?? config.model,
    baseURL: candidate.baseURL,
    apiKeyEnv: candidate.apiKeyEnv
  }, env);
}

export function resolveFallbackChainWithDiagnostics(
  config: XenesisConfig,
  env: NodeJS.ProcessEnv
): FallbackChainResult {
  return resolveFallbackChain(config, env);
}

export function resolveFallbackChain(config: XenesisConfig, env: NodeJS.ProcessEnv): FallbackChainResult {
  const usesCatalog = hasProviderCatalog(config);
  const candidates = usesCatalog
    ? config.providers!.map(catalogCandidate)
    : config.providerFallbacks.map(legacyCandidate);
  const seen = new Set<string>();
  const chain: ResolvedFallback[] = [];
  const skipped: FallbackChainResult["skipped"] = [];

  for (const candidate of candidates) {
    const model = candidate.model ?? config.model;
    const label = fallbackCandidateLabel(candidate);
    const skip = (reason: SkippedFallbackReason) => {
      skipped.push({
        label,
        reason
      });
    };

    if (candidate.enabled === false) {
      skip("disabled");
      continue;
    }
    const key = candidateKey(candidate, model);
    if (candidate.kind === config.provider && model === config.model) {
      skip("duplicate");
      continue;
    }
    if (seen.has(key)) {
      skip("duplicate");
      continue;
    }
    seen.add(key);

    const apiKeyEnv = fallbackCredentialEnv(candidate);
    if (fallbackRequiresCredential(candidate) && (!apiKeyEnv || !env[apiKeyEnv])) {
      skip("no-credential");
      continue;
    }

    chain.push({
      provider: createFallbackProviderFromCandidate(config, candidate, env),
      model,
      supportsTools: candidate.supportsTools ?? (capabilitiesFor(candidate.kind) ?? PROVIDER_CAPABILITIES[candidate.kind]).supportsTools,
      label
    });
  }

  return { chain, skipped };
}

export function selectTools(config: XenesisConfig, allTools: ToolRegistry): ToolRegistry {
  if (config.approvalMode !== "readonly" || config.provider === "mock") {
    return allTools;
  }

  const visibleNames = filterToolsForApprovalMode(Array.from(allTools.keys()), config.approvalMode);
  return new Map(visibleNames.map((name) => [name, allTools.get(name)!]));
}

function statePath(config: XenesisConfig, ...parts: string[]) {
  return xenesisStatePath(config.xenesisHome, ...parts);
}

function configuredStatePath(config: XenesisConfig, path: string) {
  return resolveXenesisStatePath(config.xenesisHome, path);
}

function createPluginStateStore(config: XenesisConfig) {
  return new SqlitePluginStateStore({
    xenesisHome: config.xenesisHome,
    workspaceRoot: config.workspace
  });
}

function uniquePaths(paths: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const path of paths) {
    const key = path.replace(/\\/g, "/");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(path);
  }
  return result;
}

async function runtimePluginPaths(config: XenesisConfig) {
  return uniquePaths([
    ...config.extensions.plugins.paths,
    ...await createPluginStateStore(config).enabledPaths()
  ]);
}

export function resolveRuntimeMcpServers(
  config: XenesisConfig,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): Record<string, McpServerConfig> {
  const recommended = config.extensions.recommendedMcpServers ?? [];
  if (recommended.length === 0) return config.extensions.mcpServers;
  const { servers, warnings } = mergeRecommendedMcpServers(config.extensions.mcpServers, recommended, {
    workspaceRoot: config.workspace,
    env
  });
  for (const warning of warnings) {
    console.warn(`[xenesis] mcp: ${warning}`);
  }
  return servers;
}

export interface RuntimeToolsOptions {
  approvalHandler?: ApprovalHandler;
}

export async function createRuntimeTools(
  config: XenesisConfig,
  env: NodeJS.ProcessEnv,
  runtime: RuntimeToolsOptions = {}
) {
  const pluginPaths = await runtimePluginPaths(config);

  // Register plugin-contributed LLM providers (manifest `providers` slot) into the
  // process-global factory map BEFORE tools are built and before any createProvider
  // call in this runtime, so a manifest-declared provider name is resolvable. Tolerant
  // policy: loadPluginProviders catches a per-path import/registration failure and skips
  // it (no boot crash); a duplicate provider name across plugins still throws.
  await loadPluginProviders({
    workspaceRoot: config.workspace,
    paths: pluginPaths,
    pluginLoadPolicy: "tolerant"
  });

  const registry = await createRuntimeToolRegistry({
    baseTools: createBuiltInTools({ env, webConfig: config.web, shellConfig: config.shell }),
    workspaceRoot: config.workspace,
    pluginPaths,
    pluginLoadPolicy: "tolerant"
  });

  if (config.extensions.memory.enabled) {
    const memoryTool = createMemoryTool(createMemoryStore(config));
    if (registry.has(memoryTool.name)) throw new Error(`Tool "${memoryTool.name}" is already registered.`);
    registry.set(memoryTool.name, memoryTool);
  }

  // session_search (DESK gates this on config.extensions.sessionSearch.enabled, which BACKUP's
  // config schema does not have). Mirror DESK's intent with a SAFE env gate (default OFF) that
  // matches BACKUP's existing env-flag pattern (see registry.ts remoteTriggerEnabled): set
  // XENESIS_SESSION_SEARCH=1 to enable. session_search indexes raw transcripts (distinct
  // cost/privacy profile), so it stays opt-in rather than always-on.
  if (/^(1|true|yes)$/iu.test(env.XENESIS_SESSION_SEARCH ?? "")) {
    const sessionSearchTool = createSessionSearchTool();
    if (registry.has(sessionSearchTool.name)) throw new Error(`Tool "${sessionSearchTool.name}" is already registered.`);
    registry.set(sessionSearchTool.name, sessionSearchTool);
  }

  if (config.browser.enabled) {
    const browserTool = createBrowserTool({
      headless: config.browser.headless,
      allowedHosts: config.browser.allowedHosts,
      idleTimeoutMs: config.browser.idleTimeoutMs
    });
    if (registry.has(browserTool.name)) throw new Error(`Tool "${browserTool.name}" is already registered.`);
    registry.set(browserTool.name, browserTool);

    const appE2ECheckTool = createAppE2ECheckTool({
      headless: config.browser.headless,
      allowedHosts: config.browser.allowedHosts
    });
    if (registry.has(appE2ECheckTool.name)) throw new Error(`Tool "${appE2ECheckTool.name}" is already registered.`);
    registry.set(appE2ECheckTool.name, appE2ECheckTool);
  }

  // computer_use (DESK gates this on config.extensions.computerUse?.enabled, absent from BACKUP's
  // config schema). It is a high-power native-control tool, so it stays default-OFF behind a SAFE
  // env gate matching BACKUP's existing env-flag pattern (registry.ts remoteTriggerEnabled): set
  // XENESIS_COMPUTER_USE=1 to enable. Behind tool_search (shouldDefer) once registered.
  if (/^(1|true|yes)$/iu.test(env.XENESIS_COMPUTER_USE ?? "")) {
    const computerUseTool = createComputerUseTool();
    if (registry.has(computerUseTool.name)) throw new Error(`Tool "${computerUseTool.name}" is already registered.`);
    registry.set(computerUseTool.name, computerUseTool);
  }

  registry.set("tool_search", createToolSearchTool(registry));

  if (config.extensions.subagents.enabled) {
    const executors: Record<string, SubagentTaskExecutor> = {};
    for (const [name, definition] of Object.entries(config.extensions.subagents.definitions)) {
      const effectiveMode = clampApprovalMode(config.approvalMode, definition.approvalMode ?? "readonly");
      const definitionTools = definition.tools
        ? Array.from(registry.values()).filter((tool) => definition.tools!.includes(tool.name))
        : Array.from(registry.values());
      const subagentTools = selectTools(
        { ...config, approvalMode: effectiveMode },
        new Map(definitionTools.map((tool) => [tool.name, tool]))
      );
      executors[name] = createAgentRunnerSubagentExecutor({
        provider: () => createProvider(config, env),
        model: config.model,
        workspaceRoot: config.workspace,
        cwd: config.workspace,
        approvalMode: effectiveMode,
        maxTurns: Math.max(1, Math.min(definition.maxTurns ?? 8, 24)),
        tools: subagentTools,
        blockedTools: config.permissions.blockedTools,
        approvalHandler: runtime.approvalHandler
      });
    }
    const researcherMode = clampApprovalMode(
      config.approvalMode,
      config.extensions.subagents.definitions.researcher?.approvalMode ?? "readonly"
    );
    const tool = createSubagentTaskTool(
      new SqliteSubagentTaskStore({ xenesisHome: config.xenesisHome }),
      executors,
      {
        maxConcurrent: config.extensions.subagents.maxConcurrent,
        backgroundDefaults: { approvalMode: researcherMode }
      }
    );
    if (registry.has(tool.name)) throw new Error(`Tool "${tool.name}" is already registered.`);
    registry.set(tool.name, tool);
  }

  await registerMcpServerTools(registry, resolveRuntimeMcpServers(config, env), config.workspace, {
    authStore: new SqliteMcpAuthStore({ xenesisHome: config.xenesisHome })
  });

  registry.set("tool_search", createToolSearchTool(registry));
  return registry;
}

export function partitionSkillContext(
  skills: SkillDefinition[],
  disclosure: "catalog" | "full"
): { messages: SystemMessage[]; itemCount: number } {
  if (disclosure === "full") {
    const message = buildSkillSystemMessage(skills);
    return { messages: message ? [message] : [], itemCount: skills.length };
  }
  const alwaysSkills = skills.filter((s) => s.always === true);
  const catalogSkills = skills.filter((s) => s.always !== true);
  const messages: SystemMessage[] = [];
  const alwaysMessage = buildSkillSystemMessage(alwaysSkills);
  if (alwaysMessage) messages.push(alwaysMessage);
  const catalogMessage = buildSkillCatalogSystemMessage(
    catalogSkills.map((s) => ({ name: s.name, description: s.description }))
  );
  if (catalogMessage) messages.push(catalogMessage);
  return { messages, itemCount: skills.length };
}

async function createSkillSystemContext(config: XenesisConfig): Promise<RunSystemContext> {
  if (!config.extensions.skills.autoLoad) {
    return {
      messages: [],
      sources: [{
        source: "skill",
        name: "skills",
        injected: false,
        itemCount: 0,
        detail: "autoLoad disabled"
      }]
    };
  }
  const registry = await loadSkillRegistry(config.workspace, config.extensions.skills.paths);
  const skills = registry.all();
  const { messages } = partitionSkillContext(skills, config.extensions.skills.disclosure);
  return {
    messages,
    sources: [{
      source: "skill",
      name: "skills",
      injected: messages.length > 0,
      itemCount: skills.length,
      detail: config.extensions.skills.paths.length > 0
        ? config.extensions.skills.paths.join(", ")
        : "default skill registry"
    }]
  };
}

function createMemoryStore(config: XenesisConfig) {
  const embedderConfig = config.extensions.memory.embedder;
  return new SqliteMemoryStore({
    xenesisHome: config.xenesisHome,
    memoryPath: configuredStatePath(config, config.extensions.memory.path),
    embedder: createEmbedder(embedderConfig),
    minScore: embedderConfig?.minScore
  });
}

const memoryGuidanceMessage: Extract<AgentMessage, { role: "system" }> = {
  role: "system",
  content: [
    "Xenesis memory is enabled.",
    "Use the `memory` tool to save durable user preferences, project facts, durable decisions, and reusable workflow notes.",
    "Search memory when the user asks about prior context or when stored preferences could change how you should answer.",
    "When memory conflicts with live workspace, Desk, IDE, or explicit user path context, prefer the live or explicit context and treat memory as background.",
    "Do not store secrets, credentials, or transient details that are only useful for the current turn."
  ].join("\n")
};

function createWorkspaceContextStore(config: XenesisConfig) {
  return new FileWorkspaceContextIndexStore({
    workspaceRoot: config.workspace,
    xenesisHome: config.xenesisHome
  });
}

async function createMemorySystemContext(
  config: XenesisConfig,
  prompt: string
): Promise<RunSystemContext> {
  if (!config.extensions.memory.enabled) {
    return {
      messages: [],
      sources: [{
        source: "memory",
        name: "workspace memory",
        injected: false,
        itemCount: 0,
        detail: "memory disabled"
      }]
    };
  }
  const messages = [memoryGuidanceMessage];
  const records = (await createMemoryStore(config).search(prompt)).slice(0, 8);
  const message = buildMemorySystemMessage(records);
  if (message) messages.push(message);
  return {
    messages,
    sources: [{
      source: "memory",
      name: "workspace memory",
      injected: true,
      itemCount: records.length,
      detail: config.extensions.memory.path
    }]
  };
}

function truncateContextPreview(preview: string | undefined) {
  if (!preview) return "";
  const normalized = preview.replace(/\s+/g, " ").trim();
  return normalized.length <= 240 ? normalized : `${normalized.slice(0, 237)}...`;
}

async function createWorkspaceContextSystemContext(
  config: XenesisConfig,
  prompt: string
): Promise<RunSystemContext> {
  const matches = await createWorkspaceContextStore(config).search(prompt, 8);
  if (matches.length === 0) {
    return {
      messages: [],
      sources: [{
        source: "workspace_context",
        name: "indexed workspace context",
        injected: false,
        itemCount: 0,
        detail: "no matching indexed files"
      }]
    };
  }

  return {
    messages: [{
      role: "system",
      content: [
        "Xenesis relevant workspace context:",
        ...matches.map((file, index) => {
          const preview = truncateContextPreview(file.preview);
          return preview
            ? `${index + 1}. ${file.path} (${file.size} bytes): ${preview}`
            : `${index + 1}. ${file.path} (${file.size} bytes)`;
        })
      ].join("\n")
    }],
    sources: [{
      source: "workspace_context",
      name: "indexed workspace context",
      injected: true,
      itemCount: matches.length,
      detail: matches.map((file) => file.path).join(", ")
    }]
  };
}

async function createBackgroundTaskSystemContext(
  config: XenesisConfig,
  sessionId: string | undefined
): Promise<RunSystemContext> {
  if (!sessionId) {
    return {
      messages: [],
      sources: [{
        source: "background_task",
        name: "completed background task results",
        injected: false,
        itemCount: 0,
        detail: "no session id"
      }],
      backgroundTaskIds: []
    };
  }

  const summary = await collectAgentTaskContext(
    new SqliteAgentTaskStore({ xenesisHome: config.xenesisHome }),
    sessionId,
    {
      maxTasks: 4,
      maxOutputChars: Math.min(1600, Math.max(400, Math.floor(config.context.maxToolResultChars / 8))),
      maxTotalChars: Math.min(6000, Math.max(1200, Math.floor(config.context.maxToolResultChars / 4)))
    }
  );
  return {
    messages: summary.content ? [{ role: "system", content: summary.content }] : [],
    sources: [{
      source: "background_task",
      name: "completed background task results",
      injected: Boolean(summary.content),
      itemCount: summary.taskIds.length,
      detail: summary.taskIds.length > 0 ? summary.taskIds.join(", ") : "no completed task results"
    }],
    backgroundTaskIds: summary.taskIds
  };
}

async function createAgentMessageSystemContext(
  config: XenesisConfig,
  options: AgentRunSystemMessageOptions
): Promise<RunSystemContext> {
  if (!options.taskId) {
    return {
      messages: [],
      sources: [{
        source: "agent_message",
        name: "unread agent messages",
        injected: false,
        itemCount: 0,
        detail: "no task id"
      }],
      agentMessageIds: []
    };
  }

  const messageStore = new SqliteAgentMessageStore({ xenesisHome: config.xenesisHome });
  await drainLegacyAgentInbox(
    new SqliteAgentTaskStore({ xenesisHome: config.xenesisHome }),
    messageStore,
    options.taskId
  );
  const summary = await collectAgentMessages(
    messageStore,
    options.taskId,
    {
      receiverSessionId: options.sessionId ?? options.taskId,
      maxMessages: 8,
      maxMessageChars: Math.min(1600, Math.max(400, Math.floor(config.context.maxToolResultChars / 8))),
      maxTotalChars: Math.min(6000, Math.max(1200, Math.floor(config.context.maxToolResultChars / 4))),
      claim: options.claimAgentMessages
    }
  );
  return {
    messages: summary.content ? [{ role: "system", content: summary.content }] : [],
    sources: [{
      source: "agent_message",
      name: "unread agent messages",
      injected: Boolean(summary.content),
      itemCount: summary.messageIds.length,
      detail: summary.messageIds.length > 0 ? summary.messageIds.join(", ") : "no unread messages"
    }],
    agentMessageIds: summary.messageIds
  };
}

function agentMessageClaimSessionId(options: AgentRunSystemMessageOptions) {
  return options.sessionId ?? options.taskId ?? "";
}

function contextAdapterSelected(built: ContextPromptBlockBuildResult, adapterId: string) {
  return built.records.some((record) => (record.conflictKey ?? record.id).split(":")[0] === adapterId);
}

async function releaseClaimedAgentMessagesForContext(
  config: XenesisConfig,
  options: AgentRunSystemMessageOptions,
  messageIds: readonly string[]
) {
  if (!options.claimAgentMessages || messageIds.length === 0) return;
  const receiverSessionId = agentMessageClaimSessionId(options);
  if (!receiverSessionId) return;
  await new SqliteAgentMessageStore({ xenesisHome: config.xenesisHome })
    .releaseClaims([...messageIds], receiverSessionId);
}

async function createOperationalFailureSystemContext(config: XenesisConfig): Promise<RunSystemContext> {
  const summary = await collectOperationalFailureContext(config);
  const message = buildOperationalFailureSystemMessage(summary);
  return {
    messages: message ? [{ role: "system", content: message }] : [],
    sources: [operationalFailureContextSource(summary)],
    adaptivePolicy: summary.adaptivePolicy
  };
}

function createIdeContextSystemContext(
  config: XenesisConfig,
  ideContext: IdeContextInput | undefined
): RunSystemContext {
  if (ideContext === undefined) {
    return {
      messages: [],
      sources: [{
        source: "ide",
        name: "ide context",
        injected: false,
        itemCount: 0,
        detail: "no IDE context provided"
      }]
    };
  }
  const message = buildIdeContextSystemMessage(normalizeIdeContext(config.workspace, ideContext));
  return {
    messages: message ? [message] : [],
    sources: [{
      source: "ide",
      name: "ide context",
      injected: Boolean(message),
      itemCount: message ? 1 : 0
    }]
  };
}

function shellEnvironmentName() {
  if (process.platform === "win32") return "Windows PowerShell";
  return "POSIX sh";
}

function createBaseSystemMessages(config: XenesisConfig): SystemMessage[] {
  const shell = shellEnvironmentName();
  return [{
    role: "system",
    content: [
      "You are Xenesis, a general-purpose AI agent running inside the Xenesis CLI.",
      "When asked who you are, identify yourself as Xenesis and explain that you can inspect and work with the current workspace using tools.",
      "Respond in the same language as the user's latest request unless the user explicitly asks for another language.",
      "If the user asks you to modify, fix, verify, run, complete, 진행, 수정, 검증, 완료, or 끝까지, a final answer that only gives a plan is incomplete. Execute the concrete tool steps unless a blocker or approval requirement stops you.",
      `Workspace root: ${config.workspace}`,
      `Xenesis home: ${config.xenesisHome}`,
      `Shell environment: ${shell}.`,
      "If the user asks for a local path outside the Workspace root, or a tool reports an outside-workspace boundary or CreateProcessAsUserW failed: 1312, do not answer as complete and do not merely say it cannot be opened. Request explicit user approval to open/switch to that workspace path.",
      "When unsure which tool to use, call tool_search with the user's goal or capability keywords before choosing a tool.",
      "Use built-in tools before shell for workspace inspection: tree and glob for discovery, list for directories, read for files, file_info for metadata, search for text, code_symbols for broad code structure, and lsp for definitions, references, and document symbols.",
      "For project analysis, do not stop after tree or glob alone. Read a small set of relevant entry, config, README, package, and route files so the final answer has concrete file evidence.",
      "For large files, use read with startLine/maxLines or file_info/search first, then inspect only the relevant ranges instead of loading the whole file.",
      "When producing a report, backlog, checklist, or recommendation from large source files, gather targeted evidence first: use search for high-signal terms, read narrow ranges around matches, and base each item on observed snippets rather than generic advice.",
      "If a large file preview is truncated, do not treat the preview as complete. Use search or a narrower read range before making claims about areas outside the preview.",
      "Do not recommend repository hosting, version-control setup, or deployment process changes unless the user asks for those topics.",
      "Use diff and patch for safe file changes, json for JSON files, diagnostics for npm script checks, server for managed long-running processes, task_handoff for turning multi-step plans into durable queued work, and agent_task for durable queued work tracking.",
      "For npm scripts with arguments, call diagnostics with script set to the package script name and args as a separate array. Example: use script=capability:eval and args=[\"--scenario\",\"run:session-id\"], never script=\"capability:eval -- --scenario run:session-id\".",
      "Evidence labels from reports are not source defects; do not patch labels, scenario ids, or signal names unless read/search confirms they are real source text that must change.",
      "Before adding TypeScript interface fields, config knobs, or schema properties, require a concrete typecheck/test failure or an observed source contract that names the missing field.",
      "When verification output only reports open recommendations, remaining work, or quality findings without a failing exit code, treat it as improvement backlog evidence rather than a concrete code defect.",
      "When the user asks to create or update a workspace file such as `*.md`, use write, patch, edit, or json. Do not use Desk artifact tools for normal workspace files.",
      "When creating a client-server app, done means the client can actually call implemented server endpoints, the server serves the client, data persists, npm scripts run, and a real smoke test or API roundtrip test passes.",
      "For generated client-server apps, run app_readiness before final reporting so root client serving, smoke-test robustness, and browser-check readiness are explicitly audited.",
      "After diagnostics passes for a browser client, use the browser tool when enabled to load the local app, read rendered text, and verify that the primary UI is not blank.",
      "After browser-rendered client apps pass diagnostics and app_readiness, run app_e2e_check when browser is enabled to catch blank UI, missing expected text, broken placeholders such as undefined, NaN, [object Object], and missing controls.",
      "If the user explicitly asks for browser or app_e2e_check verification, diagnostics alone is not enough; after diagnostics passes, start or reuse the app server and run browser or app_e2e_check before final reporting.",
      "When calling app_e2e_check, do not invent expectedText, minTextLength, or minInteractiveElements. Use []/default/0 unless the user explicitly named required copy or control counts, or the inspected source clearly defines those exact expectations.",
      "For canvas-rendered apps, treat canvasAppDetected with pageErrors: 0 as a meaningful rendered UI signal. Do not repair a canvas app by adding unrelated DOM labels such as Home/About/Contact unless the user or source requires them.",
      "If app_e2e_check fails, inspect client data binding and the API contract, patch the concrete defect, then rerun diagnostics, app_readiness, and app_e2e_check before final reporting.",
      "An app_e2e_check result with completionBlocked: true is a failed verification. Do not answer with only next steps; continue repairing until it passes, a repeated failure stop condition is met, or a real blocker is identified.",
      "If app_e2e_check recommends a repair, do not mask broken values with generic fallback labels unless the fallback is an explicit product requirement; prefer normalizing persisted data and fixing the client/server contract.",
      "If the browser tool is unavailable or disabled in CLI workspace mode, do not use desk_playwright_snapshot or desk_playwright_run as a substitute; report browser verification as unavailable after diagnostics and app_readiness pass.",
      "A tool result with ok=false, failed, not applied, or No changes were applied means the action did not succeed. Do not claim the file changed; read the file or retry with corrected inputs before continuing.",
      "If the same patch/edit failure repeats twice, stop repeating the same replacement strategy. Re-read the target and switch to json for JSON data, write for full-file replacement, or a smaller exact patch.",
      "For JSON arrays or data fixtures that need normalization, prefer json set on the root pointer after reading the current file rather than many fragile text patches.",
      "Before running diagnostics that starts the same app server, stop any managed server using that port or use server logs/list to confirm no managed server is still running.",
      "If app_readiness recommends rewriting the smoke test, replace the small smoke file with one complete bounded script instead of stacking partial patches.",
      "If the browser client is a static file such as client.html, index.html, or app.html, make the server serve that file from `/` or point readiness and browser checks at a route that actually returns 200.",
      "Do not create placeholder UI, placeholder routes, or fake test scripts such as echoing 'no tests yet' when the user asked for a working app or verification.",
      "Smoke and test scripts must exit non-zero on failure. A smoke test that prints failure text but exits 0 is broken and must be repaired.",
      "Smoke tests for client-server apps should be self-contained: start the required local server, wait for readiness, run the HTTP/browser checks, and stop the server before exiting unless the user explicitly requested a prestarted-server test.",
      "Generated readiness polling must be bounded with a maximum attempt count or deadline, must reject on timeout, and must consume or resume every HTTP response body so sockets and handles do not keep the test process alive.",
      "After stopping a spawned child server in a smoke test, wait for the close/exit event or enforce a short kill timeout before the test process exits.",
      "In smoke test catch blocks, set process.exitCode = 1 or rethrow after logging the error so a failing smoke test cannot exit successfully.",
      "Do not rely on an unref timer as the only failure exit path; cleanup timers should not convert failures into exit code 0.",
      "Server startup helpers in smoke tests must reject if the child exits or errors before readiness, and should include a bounded startup deadline.",
      "After patching a small generated script or test file, read the full file before rerunning diagnostics so duplicate entrypoints, misplaced blocks, and broken control flow are caught.",
      "If a small generated test script becomes structurally inconsistent, prefer replacing the whole file with a clear complete version over repeated partial patches.",
      "If the user explicitly asks you to replace or rewrite a file and the target file is known, do not stop after proposing replacement content or asking whether to proceed; call write, patch, edit, or json, then verify.",
      "If diagnostics reports timedOut: true, treat it as a failed verification: inspect startup waits, readiness messages, open handles, child processes, and timeout-prone loops, then patch and rerun diagnostics.",
      "If diagnostics exitCode is 0 but output says failed, error, missing, placeholder, or no tests, treat the verification as failed: inspect the script or app, patch it, and rerun verification before reporting.",
      "When you have already identified the exact file and one-line code defect, call patch rather than explaining that you plan to patch.",
      "When the user explicitly asks for todo, checklist, 단계별 정리, or progress tracking, call the todo tool to create or update the task list before answering.",
      shell === "Windows PowerShell"
        ? "When shell is necessary on Windows, use PowerShell syntax. Do not use POSIX heredocs such as python - <<'PY' or Unix-only find commands."
        : "When shell is necessary, use POSIX sh syntax."
    ].join("\n")
  }];
}

function createToolPolicySystemMessages(): SystemMessage[] {
  return [{
    role: "system",
    content: [
      "Xenesis tool selection policy:",
      "Prefer read-only, structured tools before broad shell commands.",
      "For code understanding, use code_symbols, lsp, search, read, tree, glob, and list before shell.",
      "Use shell only when a built-in tool cannot answer the question or when running an explicit command is the task.",
      "For modifications, inspect first, apply the smallest necessary patch, then verify with configured diagnostics or tests.",
      "For real-world current information, prefer dedicated weather, market, sports, and news tools first; if they do not cover the request, search and fetch a primary or relevant source before answering.",
      "For large or long-running work, keep immediate steps in todo, then use task_handoff to queue independent durable tasks before continuing. Use agent_task to inspect, retry, cancel, or show those durable tasks.",
      "If the user explicitly asks to 정리해줘 as todo or checklist, call `todo` at least once before presenting the list in text.",
      "",
      "Long-running work policy:",
      "Detect long-running work when the user asks for a whole project sweep, many files, a migration, repeated staged work, long verification, or phrases such as 전체, 일괄, 끝까지, 단계별, 차근차근, 마이그레이션, refactor all, migrate, audit, or complete everything.",
      "For these requests, first create a short todo checklist for immediate coordination, then use `task_handoff` for durable background stages instead of trying to finish every stage inside the current turn.",
      "Break handoff work into explicit labels such as inspect, implement, verify, repair, report, or domain-specific stages.",
      "Use `dependsOnLabels` to encode sequential dependencies, for example inspect -> implement -> verify -> report, while leaving independent research or inspection tasks without dependencies so the worker can run them earlier.",
      "Keep the current run focused on immediate coordination, risk checks, and the next visible answer; use `agent_task` to inspect, retry, cancel, or summarize queued background work.",
      "",
      "Xenesis current information policy:",
      "For current weather and current conditions, use weather_current before generic web_search. If the user gives no location, use the configured/default location instead of asking unless the user clearly needs a different place.",
      "For weather forecasts, weekend weather, weekly weather, and nationwide weather summaries, use weather_forecast before news_latest or generic web_search.",
      "For latest news and recent events, use news_latest before generic web_search.",
      "For 주식, 증시, 시장 현황, 코스피, 코스닥, KOSPI, KOSDAQ, stocks, indexes, funds, and market quote questions, use market_quote before news_latest or generic web_search.",
      "After market_quote, use news_latest only to explain recent market-moving headlines or if market_quote lacks coverage.",
      "For sports scores, schedules, and standings, use sports_scores before generic web_search.",
      "For ambiguous sports competitions such as 월드컵 or 월드컴, do not default to EPL. Prefer FIFA World Cup or FIFA Club World Cup when the wording supports it, otherwise ask a short clarification.",
      "If a specialized current-information tool fails or lacks coverage, use web_search and then web_fetch on a relevant result before answering.",
      "Never answer current-information questions with only a search-result link; summarize the actual values, headlines, scores, date, location, and source, and say clearly when live data cannot be confirmed."
    ].join("\n")
  }];
}

function createAutonomousExecutionSystemMessages(): SystemMessage[] {
  return [{
    role: "system",
    content: [
      "Xenesis autonomous execution loop:",
      "Classify each request as analyze, plan, work, operate-desk, or current-info before choosing tools.",
      "For non-trivial work, follow inspect -> plan -> execute -> verify -> repair-if-needed -> report.",
      "When the user asks to fix, modify, run, verify, complete, 진행, 수정, 검증, 완료, or 끝까지, do not stop at a proposed plan. Continue executing the next concrete tool step until the task is done or a blocker/approval stop condition is reached.",
      "Treat do-not-modify constraints as scoped to the named files or paths unless the user explicitly forbids all workspace changes. If the user says not to modify one file but asks you to fix another target file, modify only the allowed target and verify.",
      "After diagnostics identifies a concrete defect and read confirms the target file, use patch or another safe edit tool before reporting; then rerun focused verification when available.",
      "Keep the user-facing answer grounded in observed tool results, not assumptions.",
      "When progress requires user input, stop with a concrete question and preserve session/task state.",
      "",
      "Xenesis context arbitration policy:",
      "Prefer live Desk/IDE context over stale session text when the user says current, active, selected, this pane, or this folder.",
      "Prefer explicit user-provided paths over inferred paths, and verify missing files with list/tree/glob before saying they do not exist.",
      "Use session history for conversation continuity, workspace context for code/file facts, background task context for delegated results, and memory only for durable preferences or project facts.",
      "When contexts disagree, state which source is current and re-check the live source before acting.",
      "",
      "Xenesis verification and repair stop policy:",
      "Run focused verification after file changes when a configured diagnostic or relevant test exists.",
      "A diagnostics tool result with ok=false is not a final stopping point when the user asked you to complete, fix, verify, or finish the task; treat it as repair evidence, inspect the implicated files, patch the concrete defect, and rerun diagnostics.",
      "If a verification assertion still reports the same actual/expected value after a patch, assume the previous patch did not affect the failing calculation; re-read the complete implicated function and test expectation, then patch the direct calculation before retrying verification.",
      "If a read result is truncated during repair, do not patch or report from the truncated preview; call read again with a narrower range or larger maxChars before deciding the next patch.",
      "Repair only from concrete failure evidence. Do not rewrite broad areas after vague failures.",
      "Stop automatic repair and report evidence when the same failure signature repeats, when max repair attempts is reached, when a required approval is denied, or when the next fix would require an architectural decision.",
      "When stopped, include the failed command, shortest useful error, files touched, and the next recommended action.",
      "",
      "Xenesis background task and subagent policy:",
      "Use researcher for broad read-only discovery, implementer for scoped code changes, and verifier for independent checks.",
      "Use task_handoff for durable staged work, and agent_task to inspect or recover existing queued work before creating duplicate tasks.",
      "When background results are injected, acknowledge the task ids only when useful and avoid repeating completed work.",
      "",
      "Xenesis Desk CR/MCP policy:",
      "For Xenesis Desk operations, prefer desk_state, desk_active_context, desk_capabilities, desk_context_actions, desk_call_capability, and typed desk_* tools before shell.",
      "Treat natural-language Desk control requests as operate-desk even when the user does not mention CR, MCP, Capability Registry, tool names, or xd.* paths. Infer the intended Desk surface from ordinary wording such as file tree, terminal, browser, web page, document, preview, edit mode, split mode, tab arrangement, left, right, center, open, move, run, click, type, or arrange.",
      "For operate-desk requests, discover or choose the matching CR capability, execute through the generic Desk capability caller, and verify with a matching readback path, active context, pane/content inventory, terminal output, browser snapshot, document inspection, capture, or approval record before reporting.",
      "If a Desk capability reports approvalRequired, actionInboxItem, an external workspace boundary, or a permission boundary, stop with only user-facing product language. Let the Agent pane render the inline approval card; do not print actionInboxItem ids, raw args, CR paths, MCP tool names, or approvalRequired in normal chat.",
      "After an inline approval is executed, read the target state again before reporting the result. For file-tree actions read explorer/workspace state; for browser actions read tab/pane/browser state; for terminal actions read terminal session output/status; for document actions inspect/verify/open-content state.",
      "When the user says right, left, or center in Desk layout language, interpret it relative to the document/work area unless they explicitly name the Xenesis Agent pane or dock sidebar. Use document panes, split/tab arrangement, preview/edit mode, and tab controls rather than opening everything in the Agent side panel.",
      "For create, generate, edit, export, or apply operations, completion requires exact artifact/file/path/content readback or visible Desk state evidence. Do not report success from the request text, a plan, or a pending approval alone.",
      "For external local folders in Xenesis Desk, first inspect available workspace capabilities with desk_capabilities, then call xd.services.xenesis.setWorkspace or xd.xenesis.workspace.set without approved=true so Desk can create an approval request that the Agent pane renders as inline approval controls. If Desk capability tools are unavailable, report that concrete blocker; do not synthesize chat-only approval text.",
      "Use desk_create_xcon_markdown only when the task is to create a rendered XCON/SKETCH artifact inside an active Xenesis Desk pane; for writing a Markdown file under the workspace path, use write/patch/edit instead.",
      "Do not use Desk terminal or Desk capability tools as a fallback for ordinary CLI workspace verification. In CLI workspace tasks, use diagnostics, server, shell when permitted, or report the exact denied command and continue with available non-Desk verification.",
      "If direct MCP transport is unavailable, use the configured bridge state file or XENIS_HOME bridge.json fallback when the tool supports it.",
      "Always verify Desk control actions by reading state, active context, diagnostics, terminal output, captures, or open content after the call.",
      "",
      "Xenesis channel operations policy:",
      "For Telegram, Slack, Discord, and webhook runs, include traceId/sessionId, keep approvalMode conservative by default, and never expose tokens or webhook secrets.",
      "When channel credentials or allowlists are missing, report the exact missing env names and keep the run blocked rather than attempting blind delivery.",
      "Queue follow-up messages per conversation and preserve the session id unless the user explicitly resets it.",
      "",
      "Xenesis quality signals:",
      "Minimize shellUsageRatio, toolFailureRate, permissionDenyCount, and repeated repair attempts.",
      "Prefer runs with clear decisionTrace, injected context sources, verification evidence, and low tool retry counts.",
      "Use reports and diagnostics to improve the next run instead of repeating the same failing tool sequence."
    ].join("\n")
  }];
}

export function createModeSystemMessages(mode: AgentRunMode | undefined): SystemMessage[] {
  if (mode === "plan") {
    return [{
      role: "system",
      content: [
        "Xenesis mode: plan",
        "Do not modify workspace files. Inspect context, reason about the task, and produce an execution plan."
      ].join("\n")
    }];
  }
  if (mode === "work") {
    return [{
      role: "system",
      content: "Xenesis mode: work\nExecute the requested task using available tools and approval policy."
    }];
  }
  return [{
    role: "system",
    content: [
      "Xenesis mode: chat",
      "Default to normal conversation. For greetings, small talk, acknowledgements, or any input that is not a concrete workspace task or Desk-control request, reply directly and conversationally in the user's language.",
      "Use tools or emit a `xenesis-desk-action` block only when the user actually asks for a workspace task or a Desk operation. Do not classify, inspect state, call tools, or mention read-only, sandbox, or approval unless the user requested an action."
    ].join("\n")
  }];
}

function promptRequestsDeskBrowserControl(prompt: string) {
  return (
    /(?:https?:\/\/|file:\/\/)/i.test(prompt) &&
    /\b(?:browser|web)\b|브라우저|웹/i.test(prompt) &&
    /(?:form|field|input|button|click|fill|type|select|press|submit|save|양식|입력|입력칸|버튼|클릭|눌러|누르|선택|저장|제출)/i.test(prompt)
  );
}

function promptRequestsVisualVerification(prompt: string) {
  if (promptRequestsDeskBrowserControl(prompt)) return false;
  return (
    /\b(?:browser|app_e2e_check)\b/i.test(prompt) ||
    /브라우저|화면\s*(?:확인|검증)|렌더링\s*(?:확인|검증)/i.test(prompt)
  );
}

function promptRequestsServerLaunch(prompt: string) {
  return (
    /\b(?:start|launch|run|serve)\s+(?:the\s+)?(?:local\s+)?(?:app\s+)?server\b/i.test(prompt) ||
    /\bserver\b/i.test(prompt) && /\b(?:start|launch|run|serve|verify|check)\b/i.test(prompt) ||
    /서버(?:를|가|도)?\s*(?:띄워|실행|시작|구동|올려)|서버.*(?:띄워|실행|시작|구동|올려|확인|검증)/i.test(prompt)
  );
}

function createPromptRequirementSystemContext(prompt: string): RunSystemContext {
  const requiresVisualVerification = promptRequestsVisualVerification(prompt);
  const requiresServerLaunch = promptRequestsServerLaunch(prompt);

  if (!requiresVisualVerification && !requiresServerLaunch) {
    return {
      messages: [],
      sources: [{
        source: "tool_policy",
        name: "prompt-specific requirements",
        injected: false,
        itemCount: 0,
        detail: "no explicit browser/app_e2e_check verification request"
      }]
    };
  }

  const content: string[] = [];
  if (requiresVisualVerification) {
    content.push(
      "Xenesis user-requested visual verification gate:",
      "The latest user request explicitly asks for browser/app_e2e_check or screen verification.",
      "Treat browser/app_e2e_check verification as a required completion gate, not an optional recommendation.",
      "After code changes and diagnostics/app_readiness pass, start or reuse the local app server and run browser or app_e2e_check against the HTTP app URL.",
      "Do not provide the final report until browser or app_e2e_check has been called, unless the tool is unavailable or a concrete blocker prevents it.",
      "If the visual verification tool is unavailable or blocked, report that limitation explicitly with the completed diagnostics evidence."
    );
  }
  if (requiresServerLaunch) {
    if (content.length > 0) content.push("");
    content.push(
      "Xenesis user-requested server execution gate:",
      "The latest user request explicitly asks to start or launch a server.",
      "Call the server tool for that explicit server-start request when it is available.",
      "Do not substitute shell, diagnostics, or app_readiness for the explicit server-start gate; those tools may support verification, but they do not satisfy the server tool call.",
      "Do not provide the final report until server has been called, unless the tool is unavailable or a concrete blocker prevents it."
    );
  }

  return {
    messages: [{
      role: "system",
      content: content.join("\n")
    }],
    sources: [{
      source: "tool_policy",
      name: "prompt-specific completion gates",
      injected: true,
      itemCount: Number(requiresVisualVerification) + Number(requiresServerLaunch),
      detail: [
        requiresVisualVerification ? "browser/app_e2e_check requested by prompt" : "",
        requiresServerLaunch ? "server requested by prompt" : ""
      ].filter(Boolean).join(", ")
    }]
  };
}

function savedPlanPath(config: XenesisConfig) {
  return statePath(config, "plans", "latest.txt");
}

async function createSavedPlanSystemContext(
  config: XenesisConfig,
  options: AgentRunSystemMessageOptions
): Promise<RunSystemContext> {
  if (options.mode !== "work" || !options.fromPlan) {
    return {
      messages: [],
      sources: [{
        source: "saved_plan",
        name: "latest plan",
        injected: false,
        itemCount: 0,
        detail: "not requested"
      }]
    };
  }
  const plan = await readFile(savedPlanPath(config), "utf8");
  return {
    messages: [{
      role: "system",
      content: [
        "Xenesis loaded plan:",
        "",
        plan.trimEnd()
      ].join("\n")
    }],
    sources: [{
      source: "saved_plan",
      name: "latest plan",
      injected: true,
      itemCount: 1,
      detail: displayXenesisStatePath(config.xenesisHome, savedPlanPath(config))
    }]
  };
}

function joinSystemMessages(messages: readonly SystemMessage[]) {
  return messages
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

function contentOrUndefined(lines: readonly string[]) {
  const content = lines.join("\n").trim();
  return content.length > 0 ? content : undefined;
}

function splitBaseRuntimePrompt(baseMessages: readonly SystemMessage[]) {
  const identity: string[] = [];
  const stableSystem: string[] = [];
  const outputEfficiency: string[] = [];
  const language: string[] = [];
  const envInfo: string[] = [];
  const content = joinSystemMessages(baseMessages);

  for (const line of content.split("\n")) {
    if (
      line.startsWith("Workspace root:") ||
      line.startsWith("Xenesis home:") ||
      line.startsWith("Shell environment:")
    ) {
      envInfo.push(line);
      continue;
    }

    if (line.startsWith("Respond in the same language")) {
      language.push(line);
      continue;
    }

    if (
      /large files|large source files|truncated|startLine\/maxLines|diagnostics/i.test(line)
    ) {
      outputEfficiency.push(line);
      continue;
    }

    if (identity.length < 2) {
      identity.push(line);
      continue;
    }

    stableSystem.push(line);
  }

  return {
    identity: contentOrUndefined(identity),
    stableSystem: contentOrUndefined(stableSystem),
    outputEfficiency: contentOrUndefined(outputEfficiency),
    language: contentOrUndefined(language),
    envInfo: contentOrUndefined(envInfo)
  };
}

function buildScaffoldPromptBlocks(input: {
  baseMessages: readonly SystemMessage[];
  toolPolicyMessages: readonly SystemMessage[];
  autonomousExecutionMessages: readonly SystemMessage[];
  capabilityPolicyMessages: readonly SystemMessage[];
  modeMessages: readonly SystemMessage[];
  promptRequirementMessages: readonly SystemMessage[];
  workflowMessages: readonly SystemMessage[];
}): PromptBlock[] {
  const base = splitBaseRuntimePrompt(input.baseMessages);
  const contentByReferenceName: Partial<Record<Section13ReferenceName, string | undefined>> = {
    simple_intro: base.identity,
    simple_system: base.stableSystem,
    doing_tasks: joinSystemMessages(input.autonomousExecutionMessages),
    actions: joinSystemMessages(input.toolPolicyMessages),
    using_tools: joinSystemMessages(input.capabilityPolicyMessages),
    output_efficiency: base.outputEfficiency,
    session_guidance: joinSystemMessages([
      ...input.modeMessages,
      ...input.promptRequirementMessages,
      ...input.workflowMessages
    ]),
    env_info_simple: base.envInfo,
    language: base.language
  };
  return createSection13PromptBlocks({
    contentByReferenceName,
    source: "runtime.section_13"
  });
}

function dynamicContextSources(
  built: ContextPromptBlockBuildResult,
  sourceMetadataByAdapter: Partial<Record<string, RunSystemContextSource>> = {}
): RunSystemContextSource[] {
  const kindByAdapter: Record<string, ContextSourceKind> = {
    ide: "ide",
    "instruction-discovery": "workspace_context",
    saved_plan: "saved_plan",
    memory: "memory",
    skills: "skill",
    workspace_context: "workspace_context",
    background_task: "background_task",
    agent_message: "agent_message",
    operational_failure: "operational_failure"
  };
  const selectedAdapterIds = new Set(built.records.map((record) => (record.conflictKey ?? record.id).split(":")[0]));
  const instructionSelected = built.records.some((record) => record.authority === "project_instruction");
  const droppedByAdapter = new Map<string, ContextDropReason>();
  for (const drop of built.audit.dropped) {
    const adapterId = drop.id.startsWith("instruction:")
      ? "instruction-discovery"
      : drop.id.split(":")[0] ?? drop.id;
    droppedByAdapter.set(adapterId, drop.reason);
  }

  return built.audit.sourceAdapters.map((adapterId) => {
    const injected = adapterId === "instruction-discovery"
      ? instructionSelected
      : selectedAdapterIds.has(adapterId);
    const base = sourceMetadataByAdapter[adapterId];
    return {
      ...base,
      source: base?.source ?? kindByAdapter[adapterId] ?? "workspace_context",
      name: base?.name ?? adapterId,
      injected,
      usedTokens: built.audit.usedTokens,
      tokenBudget: built.audit.tokenBudget,
      ...(!injected && droppedByAdapter.has(adapterId)
        ? { droppedReason: droppedByAdapter.get(adapterId)! }
        : {})
    };
  });
}

export async function createRunSystemContext(
  config: XenesisConfig,
  options: AgentRunSystemMessageOptions
): Promise<RunSystemContext> {
  const baseMessages = createBaseSystemMessages(config);
  const toolPolicyMessages = createToolPolicySystemMessages();
  const autonomousExecutionMessages = createAutonomousExecutionSystemMessages();
  const capabilityPolicyMessages = [createAgentCapabilityPolicySystemMessage()];
  const modeMessages = createModeSystemMessages(options.mode);
  const promptRequirements = createPromptRequirementSystemContext(options.prompt);
  const ide = createIdeContextSystemContext(config, options.ideContext);
  const savedPlan = await createSavedPlanSystemContext(config, options);
  const workspaceContext = await createWorkspaceContextSystemContext(config, options.prompt);
  const backgroundTasks = await createBackgroundTaskSystemContext(config, options.sessionId);
  const agentMessages = await createAgentMessageSystemContext(config, options);
  const operationalFailures = await createOperationalFailureSystemContext(config);
  const skills = await createSkillSystemContext(config);
  const memory = await createMemorySystemContext(config, options.prompt);
  const mcpServerCount = Object.keys(config.extensions.mcpServers).length + (config.extensions.recommendedMcpServers?.length ?? 0);
  const scaffoldBlocks = buildScaffoldPromptBlocks({
    baseMessages,
    toolPolicyMessages,
    autonomousExecutionMessages,
    capabilityPolicyMessages,
    modeMessages,
    promptRequirementMessages: promptRequirements.messages,
    workflowMessages: options.systemMessages ?? []
  });
  const scaffoldTokens = scaffoldBlocks.reduce((total, block) => total + estimateContextTokens(block.content), 0);
  const adapters: ContextSourceAdapter[] = [
    staticRecordAdapter({ id: "ide", kind: "ide_context", authority: "active_surface", cacheScope: "session", priority: 1010, messages: ide.messages }),
    createInstructionContextAdapter({ workspaceRoot: config.workspace, cwd: options.cwd ?? config.workspace, tokenPriorityBase: 1015 }),
    staticRecordAdapter({ id: "saved_plan", kind: "session_memory", authority: "session_state", cacheScope: "session", priority: 1018, messages: savedPlan.messages }),
    staticRecordAdapter({ id: "memory", kind: "session_memory", authority: "durable_memory", cacheScope: "session", priority: 1020, messages: memory.messages }),
    staticRecordAdapter({ id: "skills", kind: "workspace_context", authority: "durable_memory", cacheScope: "session", priority: 1030, messages: skills.messages }),
    staticRecordAdapter({ id: "workspace_context", kind: "workspace_context", authority: "workspace_index", cacheScope: "session", priority: 1040, messages: workspaceContext.messages }),
    staticRecordAdapter({ id: "background_task", kind: "session_memory", authority: "session_state", cacheScope: "session", priority: 1050, messages: backgroundTasks.messages }),
    staticRecordAdapter({ id: "agent_message", kind: "session_memory", authority: "session_state", cacheScope: "session", priority: 1055, messages: agentMessages.messages }),
    staticRecordAdapter({ id: "operational_failure", kind: "session_memory", authority: "session_state", cacheScope: "session", priority: 1060, messages: operationalFailures.messages })
  ];
  const tokenBudget = computeContextTokenBudget({
    modelId: options.model ?? config.model,
    scaffoldTokens
  });
  let built: ContextPromptBlockBuildResult;
  try {
    built = await buildContextPromptBlocks({ adapters, tokenBudget });
  } catch (error) {
    await releaseClaimedAgentMessagesForContext(config, options, agentMessages.agentMessageIds ?? []);
    throw error;
  }
  const agentMessagesSelected = contextAdapterSelected(built, "agent_message");
  const agentMessageIds = agentMessagesSelected ? (agentMessages.agentMessageIds ?? []) : [];
  if (!agentMessagesSelected) {
    await releaseClaimedAgentMessagesForContext(config, options, agentMessages.agentMessageIds ?? []);
  }
  const prompt = composeSystemPrompt({ defaultBlocks: [...scaffoldBlocks, ...built.blocks] });
  const section13SystemMessage: SystemMessage = {
    role: "system",
    content: prompt.text,
    promptMetadata: {
      section13: toSection13PromptTrace(prompt),
      ...(mcpServerCount > 0
        ? {
            cacheControl: {
              anthropic: {
                disabled: true,
                reason: "mcp_servers_present"
              }
            }
          }
        : {})
    }
  };

  return {
    messages: [
      section13SystemMessage
    ],
    sources: [
      {
        source: "base",
        name: "base runtime instructions",
        injected: true,
        itemCount: baseMessages.length,
        detail: config.workspace
      },
      {
        source: "tool_policy",
        name: "tool selection policy",
        injected: true,
        itemCount: toolPolicyMessages.length
      },
      {
        source: "tool_policy",
        name: "autonomous execution policy",
        injected: true,
        itemCount: autonomousExecutionMessages.length
      },
      {
        source: "capability_policy",
        name: "agent capability policy",
        injected: true,
        itemCount: capabilityPolicyMessages.length
      },
      {
        source: "mode",
        name: options.mode ?? "default",
        injected: modeMessages.length > 0,
        itemCount: modeMessages.length
      },
      ...promptRequirements.sources,
      {
        source: "workflow",
        name: options.workflowContext?.name ?? "workflow instructions",
        injected: (options.systemMessages ?? []).length > 0,
        itemCount: (options.systemMessages ?? []).length,
        ...(options.workflowContext?.description ? { detail: options.workflowContext.description } : {})
      },
      ...dynamicContextSources(built, {
        ...(ide.sources[0] ? { ide: ide.sources[0] } : {}),
        ...(savedPlan.sources[0] ? { saved_plan: savedPlan.sources[0] } : {}),
        ...(memory.sources[0] ? { memory: memory.sources[0] } : {}),
        ...(skills.sources[0] ? { skills: skills.sources[0] } : {}),
        ...(workspaceContext.sources[0] ? { workspace_context: workspaceContext.sources[0] } : {}),
        ...(backgroundTasks.sources[0] ? { background_task: backgroundTasks.sources[0] } : {}),
        ...(agentMessages.sources[0] ? { agent_message: agentMessages.sources[0] } : {}),
        ...(operationalFailures.sources[0] ? { operational_failure: operationalFailures.sources[0] } : {})
      })
    ],
    backgroundTaskIds: backgroundTasks.backgroundTaskIds,
    agentMessageIds,
    adaptivePolicy: operationalFailures.adaptivePolicy
  };
}

export async function createRunSystemMessages(
  config: XenesisConfig,
  options: AgentRunSystemMessageOptions
): Promise<Extract<AgentMessage, { role: "system" }>[]> {
  return (await createRunSystemContext(config, options)).messages;
}

export async function saveLatestPlan(
  config: XenesisConfig,
  content: string,
  onNotice?: RuntimeNoticeHandler
) {
  const path = savedPlanPath(config);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${content.trimEnd()}\n`, "utf8");
  await onNotice?.(`plan: saved ${displayXenesisStatePath(config.xenesisHome, path)}`);
}
