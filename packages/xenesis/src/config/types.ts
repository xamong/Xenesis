import type { IsolationMode } from '../core/isolation/types.js';

export type SecretRef = string | { source: 'env' | 'file' | 'exec'; provider?: string; id: string };

export const providerNames = [
  'auto',
  'openai',
  'mock',
  'anthropic',
  'claude',
  'openai-compatible',
  'gemini',
  'ollama',
  'lmstudio',
  'openrouter',
  'groq',
  'deepseek',
  'qwen',
  'mistral',
  'xai',
  'codex-app-server',
  'codex-cli',
  'codex-responses',
  'claude-interactive',
  'claude-cli',
] as const;

export type ProviderName = (typeof providerNames)[number];
export type ApprovalMode = 'safe' | 'auto' | 'readonly';
export type ToolPolicyAction = 'allow' | 'ask' | 'deny';
export type PermissionRiskLevel = 'low' | 'medium' | 'high';
export type WorkflowMode = 'agent' | 'plan' | 'work';
export type WorkflowStepInput = 'original' | 'previous';

export interface McpStdioServerConfig {
  enabled?: boolean;
  type?: 'stdio';
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd?: string;
  transport?: 'stdio';
  toolFilter?: { include?: string[]; exclude?: string[] };
  connectionTimeoutMs?: number;
  requestTimeoutMs?: number;
}
export interface McpHttpServerConfig {
  enabled?: boolean;
  type: 'http' | 'sse';
  url: string;
  headers?: Record<string, string>;
  transport?: 'http' | 'sse';
  auth?: 'oauth' | 'none';
  oauth?: {
    clientId?: string;
    clientSecret?: SecretRef;
    scope?: string;
    redirectUrl?: string;
    authServerMetadataUrl?: string;
  };
  toolFilter?: { include?: string[]; exclude?: string[] };
  connectionTimeoutMs?: number;
  requestTimeoutMs?: number;
}
export type McpServerConfig = McpStdioServerConfig | McpHttpServerConfig;

export interface EmbedderConfig {
  provider: 'deterministic';
  dimensions?: number;
  minScore?: number;
}

export interface MemoryConfig {
  enabled: boolean;
  path: string;
  embedder?: EmbedderConfig;
  graph: MemoryGraphConfig;
}

export interface MemoryGraphConfig {
  enabled: boolean;
  endpoint?: string;
  allowedEndpoints: string[];
  localOnly: boolean;
  allowSensitiveProjection: boolean;
  redactEvidence: boolean;
  timeoutMs: number;
}

export interface SubagentDefinitionConfig {
  approvalMode?: ApprovalMode;
  maxTurns?: number;
  tools?: string[];
}

export interface SubagentConfig {
  enabled: boolean;
  maxConcurrent: number;
  definitions: Record<string, SubagentDefinitionConfig>;
}

export interface PluginConfig {
  paths: string[];
}

export interface SkillConfig {
  paths: string[];
  autoLoad: boolean;
  disclosure: 'catalog' | 'full';
}

export interface ExtensionsConfig {
  mcpServers: Record<string, McpServerConfig>;
  recommendedMcpServers: string[];
  memory: MemoryConfig;
  subagents: SubagentConfig;
  plugins: PluginConfig;
  skills: SkillConfig;
}

export interface ToolPolicyConfig {
  action: ToolPolicyAction;
  reason?: string;
  riskLevel?: PermissionRiskLevel;
}

export interface PathRuleConfig {
  action: 'allow' | 'deny';
  path: string;
  reason?: string;
}

export interface PermissionsConfig {
  blockedTools: string[];
  toolPolicies: Record<string, ToolPolicyConfig>;
  pathRules: PathRuleConfig[];
}

export interface ContextConfig {
  autoCompact: boolean;
  compactAfterMessages: number;
  compactKeepMessages: number;
  maxToolResultChars: number;
  operationalFailures: OperationalFailureContextConfig;
  /** Use an LLM (aux model) to summarize compacted history instead of a deterministic line dump. */
  llmSummary: boolean;
  /** Aux model id used for compaction summaries. */
  summarizationModel: string;
  /** Provider name for the summarization model. Defaults to the primary provider when undefined. */
  summarizationProvider?: string;
  /** Run a deterministic dedup/descriptor prune pass over the older slice before summarizing. */
  pruneToolResults: boolean;
  /** Char length above which an older tool result / tool-call arg block is pruned to a descriptor. */
  pruneToolResultThreshold: number;
  /** Strip base64 image attachments from messages outside the recent / most-recent-image window before sending to the provider. */
  stripOldImages: boolean;
  /** Pre-flight compaction trigger as a fraction of the computed context-token budget. */
  compactTokenThresholdRatio: number;
}

export interface OperationalFailureContextConfig {
  enabled: boolean;
  maxReports: number;
  maxRunReports: number;
  maxTasks: number;
  maxItems: number;
}

export interface VerificationConfig {
  commands: string[];
  autoRun: boolean;
  autoFix: boolean;
  timeoutMs: number;
  maxOutputChars: number;
  maxRepairAttempts: number;
  acceptOnPass: boolean;
  rollbackFailedRepairs: boolean;
}

export interface ToolGuardConfig {
  enabled: boolean;
  useDefault: boolean;
  priorityTools: string[];
  requiredBefore: Record<string, string[]>;
  requiredBeforeAny: Record<string, string[]>;
}

export interface ProviderFallbackConfig {
  provider: ProviderName;
  model?: string;
  baseURL?: string;
  apiKeyEnv?: string;
}

export interface ProviderSetupEntry {
  kind: ProviderName;
  enabled?: boolean;
  model?: string;
  baseURL?: string;
  apiKeyEnv?: string;
  supportsTools?: boolean;
  label?: string;
}

export interface WorkflowStepConfig {
  name: string;
  description?: string;
  input?: WorkflowStepInput;
  prompt?: string;
  promptPrefix?: string;
  promptSuffix?: string;
  mode?: WorkflowMode;
  metadata?: Record<string, unknown>;
}

export interface WorkflowConfig {
  handler?: string;
  description?: string;
  systemMessage?: string;
  prompt?: string;
  promptPrefix?: string;
  promptSuffix?: string;
  mode?: WorkflowMode;
  guard?: ToolGuardConfig;
  steps?: WorkflowStepConfig[];
  metadata?: Record<string, unknown>;
}

export interface WorkerDefaultsConfig {
  approvalMode: ApprovalMode;
  maxTurns: number;
  maxTokens: number;
}

export interface WorkerConfig {
  enabled: boolean;
  pollIntervalMs: number;
  concurrency: number;
  defaults: WorkerDefaultsConfig;
}

/**
 * Curator (memory lifecycle) config. Tier-A is a pure, no-LLM garbage collector: active→stale
 * after `staleAfterDays`, any→archived after `archiveAfterDays` (archive-never-delete, pin-protect).
 */
export interface CuratorConfig {
  enabled: boolean;
  staleAfterDays: number;
  archiveAfterDays: number;
  /**
   * Tier-B (LLM umbrella consolidation). AUTONOMOUS-RISK: default-OFF + dry-run-ON. Runs on an
   * aux/cheap model with TOOLS DISABLED, out of the interactive loop. Mutation requires BOTH
   * dryRun:false AND an explicit approval. Merged/demoted rows are archived (never deleted).
   */
  tierB?: CuratorTierBConfig;
}

/**
 * Curator Tier-B config. Two independent safety locks:
 *  - `dryRun` (default TRUE): produce a plan only; mutate NOTHING.
 *  - explicit approval at the runtime/store seam: even with dryRun:false, no apply without it.
 * `enabled` is default FALSE (the whole pass is opt-in). `intervalHours` mirrors Hermes' 7d cadence.
 */
export interface CuratorTierBConfig {
  enabled: boolean;
  dryRun: boolean;
  provider?: ProviderName;
  model?: string;
  intervalHours: number;
  timeoutSeconds: number;
  minClusterSize: number;
  maxClusters: number;
}

/**
 * P6 (e): Commitments subsystem config. OPT-IN, default OFF. When disabled (the default),
 * no turns are enqueued, no extraction runs, and no commitment tasks are created. The
 * extractor runs on an AUX/cheap model with tools DISABLED.
 */
export interface CommitmentsExtractionConfig {
  /** Aux/cheap model override for the hidden extractor. Falls back to the main model. */
  provider?: ProviderName;
  model?: string;
  /** Debounce window before a batch drains (ms). */
  debounceMs: number;
  /** Max items per extraction batch. */
  batchMaxItems: number;
  /** Max queued items before new turns are dropped. */
  queueMaxItems: number;
  /** Confidence floor for routine/personal commitments. */
  confidenceThreshold: number;
  /** Higher confidence floor for care_check_in / care-sensitivity commitments. */
  careConfidenceThreshold: number;
  /** Extractor run timeout (seconds). */
  timeoutSeconds: number;
}

export interface CommitmentsConfig {
  enabled: boolean;
  /** Max commitment deliveries surfaced per scope per rolling day. */
  maxPerDay: number;
  /** Hours after the due window's latest before an unsent commitment expires. */
  expireAfterHours: number;
  extraction: CommitmentsExtractionConfig;
}

export interface IsolationConfig {
  autoIsolateConcurrent: boolean;
  defaultMode: IsolationMode;
  keepWorktree: 'if-changed' | 'always' | 'never';
  scrubShellSecrets: boolean;
  shellSecretAllowlist: string[];
}

export interface ApprovalConfig {
  timeoutMs: number;
  timeoutBehavior: 'allow' | 'deny';
}

export interface HookSpec {
  command: string;
  toolPattern?: string;
  timeoutMs?: number;
}

export interface HooksConfig {
  enabled: boolean;
  preToolUse: HookSpec[];
  stop: HookSpec[];
  maxStopHookContinuations: number;
  commandTimeoutMs: number;
}

export interface TelegramChannelConfig {
  enabled: boolean;
  tokenEnv: string;
  allowedChatIds: number[];
  approvalMode: ApprovalMode;
  maxTurns: number;
  maxTokens: number;
}

export interface SlackChannelConfig {
  enabled: boolean;
  botTokenEnv: string;
  signingSecretEnv: string;
  allowedChannelIds: string[];
  webhookUrlEnv: string;
  approvalMode: ApprovalMode;
  maxTurns: number;
  maxTokens: number;
}

export interface DiscordChannelConfig {
  enabled: boolean;
  botTokenEnv: string;
  allowedChannelIds: string[];
  allowedGuildIds: string[];
  webhookUrlEnv: string;
  approvalMode: ApprovalMode;
  maxTurns: number;
  maxTokens: number;
}

export interface WebhookChannelConfig {
  enabled: boolean;
  urlEnv: string;
  headers: Record<string, string>;
  approvalMode: ApprovalMode;
  maxTurns: number;
  maxTokens: number;
}

export interface ChannelsConfig {
  telegram?: TelegramChannelConfig;
  slack?: SlackChannelConfig;
  discord?: DiscordChannelConfig;
  webhook?: WebhookChannelConfig;
}

export interface BrowserConfig {
  enabled: boolean;
  headless: boolean;
  allowedHosts: string[];
  idleTimeoutMs: number;
}

export interface ShellConfig {
  persistent: boolean;
  idleTimeoutMs: number;
}

export interface WebToolsConfig {
  allowedHosts: string[];
  fetchTimeoutMs: number;
  maxRedirects: number;
}

export interface XenesisConfig {
  provider: ProviderName;
  model: string;
  xenesisHome: string;
  baseURL?: string;
  apiKeyEnv?: string;
  providerRetries: number;
  providerFallbacks: ProviderFallbackConfig[];
  providers?: ProviderSetupEntry[];
  context: ContextConfig;
  hooks: HooksConfig;
  verification: VerificationConfig;
  guard: ToolGuardConfig;
  workflow: string;
  workflows: Record<string, WorkflowConfig>;
  worker: WorkerConfig;
  isolation: IsolationConfig;
  channels: ChannelsConfig;
  browser: BrowserConfig;
  shell: ShellConfig;
  web?: WebToolsConfig;
  curator?: CuratorConfig;
  commitments?: CommitmentsConfig;
  maxTurns: number;
  workspace: string;
  approvalMode: ApprovalMode;
  extensions: ExtensionsConfig;
  permissions: PermissionsConfig;
  approval: ApprovalConfig;
}

export interface CliConfigOverrides {
  provider?: ProviderName;
  model?: string;
  xenesisHome?: string;
  profile?: string;
  trustWorkspace?: boolean;
  baseURL?: string;
  apiKeyEnv?: string;
  providerRetries?: number;
  providerFallbacks?: ProviderFallbackConfig[];
  providers?: ProviderSetupEntry[];
  context?: ContextConfig;
  hooks?: Partial<HooksConfig>;
  verification?: VerificationConfig;
  guard?: ToolGuardConfig;
  workflow?: string;
  workflows?: Record<string, WorkflowConfig>;
  worker?: WorkerConfig;
  isolation?: IsolationConfig;
  channels?: ChannelsConfig;
  browser?: BrowserConfig;
  shell?: ShellConfig;
  web?: WebToolsConfig;
  maxTurns?: number;
  workspace?: string;
  approvalMode?: ApprovalMode;
  extensions?: ExtensionsConfig;
  permissions?: PermissionsConfig;
  approval?: Partial<ApprovalConfig>;
  curator?: CuratorConfig;
  commitments?: CommitmentsConfig;
}

export interface LoadConfigOptions {
  cwd: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  cli?: CliConfigOverrides;
}

export const defaultConfig = {
  provider: 'openai',
  model: 'gpt-5.4-mini',
  providerRetries: 1,
  providerFallbacks: [],
  hooks: {
    enabled: true,
    preToolUse: [],
    stop: [],
    maxStopHookContinuations: 3,
    commandTimeoutMs: 5000,
  },
  context: {
    autoCompact: true,
    compactAfterMessages: 24,
    compactKeepMessages: 8,
    maxToolResultChars: 100000,
    operationalFailures: {
      enabled: true,
      maxReports: 3,
      maxRunReports: 3,
      maxTasks: 4,
      maxItems: 8,
    },
    llmSummary: true,
    summarizationModel: 'claude-haiku-4-5',
    pruneToolResults: true,
    pruneToolResultThreshold: 2000,
    stripOldImages: true,
    compactTokenThresholdRatio: 0.8,
  },
  verification: {
    commands: [],
    autoRun: false,
    autoFix: false,
    timeoutMs: 120000,
    maxOutputChars: 12000,
    maxRepairAttempts: 1,
    acceptOnPass: false,
    rollbackFailedRepairs: true,
  },
  guard: {
    enabled: true,
    useDefault: true,
    priorityTools: [],
    requiredBefore: {},
    requiredBeforeAny: {},
  },
  workflow: 'default',
  workflows: {
    default: {
      handler: 'default',
      description: 'Default agent workflow.',
    },
  },
  worker: {
    enabled: true,
    pollIntervalMs: 3000,
    concurrency: 1,
    defaults: {
      approvalMode: 'safe',
      maxTurns: 16,
      maxTokens: 200000,
    },
  },
  isolation: {
    autoIsolateConcurrent: false,
    defaultMode: 'worktree',
    keepWorktree: 'if-changed',
    scrubShellSecrets: true,
    shellSecretAllowlist: [],
  },
  channels: {},
  browser: {
    enabled: true,
    headless: true,
    allowedHosts: [],
    idleTimeoutMs: 300000,
  },
  shell: {
    persistent: true,
    idleTimeoutMs: 300000,
  },
  maxTurns: 16,
  workspace: '.',
  approvalMode: 'safe',
  extensions: {
    mcpServers: {},
    recommendedMcpServers: [],
    memory: {
      enabled: false,
      path: '.xenesis/memory.json',
      graph: {
        enabled: false,
        allowedEndpoints: ['http://127.0.0.1:8000', 'http://localhost:8000'],
        localOnly: true,
        allowSensitiveProjection: false,
        redactEvidence: true,
        timeoutMs: 15000,
      },
    },
    subagents: {
      enabled: false,
      maxConcurrent: 2,
      definitions: {
        researcher: {
          approvalMode: 'readonly',
          maxTurns: 8,
          tools: [
            'tree',
            'glob',
            'list',
            'read',
            'search',
            'code_symbols',
            'lsp',
            'file_info',
            'web_search',
            'web_fetch',
          ],
        },
        implementer: {
          approvalMode: 'safe',
          maxTurns: 12,
          tools: [
            'tree',
            'glob',
            'list',
            'read',
            'search',
            'code_symbols',
            'lsp',
            'diff',
            'patch',
            'json',
            'diagnostics',
          ],
        },
        verifier: {
          approvalMode: 'readonly',
          maxTurns: 8,
          tools: ['read', 'search', 'diagnostics', 'shell', 'agent_task', 'task_handoff'],
        },
      },
    },
    plugins: { paths: [] },
    skills: { paths: [], autoLoad: false, disclosure: 'catalog' },
  },
  permissions: {
    blockedTools: [],
    toolPolicies: {},
    pathRules: [],
  },
  approval: {
    timeoutMs: 300000,
    timeoutBehavior: 'deny',
  },
} satisfies Omit<XenesisConfig, 'workspace' | 'xenesisHome'> & { workspace: string };
