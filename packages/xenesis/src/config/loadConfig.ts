import { access, readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { resolveConfigEnvVars } from './envInterpolation.js';
import { readProfileConfig, resolveXenesisHome } from './profiles.js';
import {
  type ApprovalConfig,
  type ApprovalMode,
  type BrowserConfig,
  type ChannelsConfig,
  type CliConfigOverrides,
  type ContextConfig,
  defaultConfig,
  type ExtensionsConfig,
  type HooksConfig,
  type IsolationConfig,
  type LoadConfigOptions,
  type PermissionsConfig,
  type ProviderFallbackConfig,
  type ProviderName,
  type ProviderSetupEntry,
  providerNames,
  type SecretRef,
  type ShellConfig,
  type ToolGuardConfig,
  type VerificationConfig,
  type WebToolsConfig,
  type WorkerConfig,
  type WorkflowConfig,
  type XenesisConfig,
} from './types.js';

const secretRefSchema: z.ZodType<SecretRef> = z.union([
  z.string().min(1),
  z.object({
    source: z.enum(['env', 'file', 'exec']),
    provider: z.string().min(1).optional(),
    id: z.string().min(1),
  }),
]);

const mcpOauthSchema = z.object({
  clientId: z.string().min(1).optional(),
  clientSecret: secretRefSchema.optional(),
  scope: z.string().min(1).optional(),
  redirectUrl: z.string().min(1).optional(),
  authServerMetadataUrl: z.string().min(1).optional(),
});

const mcpToolFilterSchema = z.object({
  include: z.array(z.string().min(1)).optional(),
  exclude: z.array(z.string().min(1)).optional(),
});

const mcpStdioSchema = z.object({
  enabled: z.boolean().optional(),
  type: z.literal('stdio').default('stdio'),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  cwd: z.string().min(1).optional(),
  transport: z.literal('stdio').optional(),
  toolFilter: mcpToolFilterSchema.optional(),
  connectionTimeoutMs: z.number().int().positive().optional(),
  requestTimeoutMs: z.number().int().positive().optional(),
});
const mcpHttpSchema = z.object({
  enabled: z.boolean().optional(),
  type: z.enum(['http', 'sse']),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  transport: z.enum(['http', 'sse']).optional(),
  auth: z.enum(['oauth', 'none']).optional(),
  oauth: mcpOauthSchema.optional(),
  toolFilter: mcpToolFilterSchema.optional(),
  connectionTimeoutMs: z.number().int().positive().optional(),
  requestTimeoutMs: z.number().int().positive().optional(),
});
export const mcpServerConfigSchema = z.preprocess(
  (v) => {
    if (!v || typeof v !== 'object' || 'type' in (v as Record<string, unknown>)) return v;
    const record = v as Record<string, unknown>;
    if (
      record.transport === 'http' ||
      record.transport === 'sse' ||
      (record.url !== undefined && record.command === undefined)
    ) {
      return { type: record.transport === 'sse' ? 'sse' : 'http', ...record };
    }
    return { type: 'stdio', ...record };
  },
  z.discriminatedUnion('type', [mcpStdioSchema, mcpHttpSchema]),
);

const extensionsSchema = z
  .object({
    mcpServers: z.record(mcpServerConfigSchema).default({}),
    recommendedMcpServers: z.array(z.string().min(1)).default(defaultConfig.extensions.recommendedMcpServers),
    memory: z
      .object({
        enabled: z.boolean().default(false),
        path: z.string().min(1).default('.xenesis/memory.json'),
        embedder: z
          .object({
            provider: z.enum(['deterministic']),
            dimensions: z.number().int().positive().optional(),
            minScore: z.number().min(0).max(1).optional(),
          })
          .optional(),
      })
      .default(defaultConfig.extensions.memory),
    subagents: z
      .object({
        enabled: z.boolean().default(defaultConfig.extensions.subagents.enabled),
        maxConcurrent: z.number().int().positive().default(defaultConfig.extensions.subagents.maxConcurrent),
        definitions: z
          .record(
            z.object({
              approvalMode: z.enum(['safe', 'auto', 'readonly']).optional(),
              maxTurns: z.number().int().positive().max(24).optional(),
              tools: z.array(z.string().min(1)).optional(),
            }),
          )
          .default(defaultConfig.extensions.subagents.definitions),
      })
      .default(defaultConfig.extensions.subagents),
    plugins: z
      .object({
        paths: z.array(z.string().min(1)).default([]),
      })
      .default(defaultConfig.extensions.plugins),
    skills: z
      .object({
        paths: z.array(z.string().min(1)).default([]),
        autoLoad: z.boolean().default(false),
        disclosure: z.enum(['catalog', 'full']).default('catalog'),
      })
      .default(defaultConfig.extensions.skills),
  })
  .default(defaultConfig.extensions);

const operationalFailureContextSchema = z
  .object({
    enabled: z.boolean().default(defaultConfig.context.operationalFailures.enabled),
    maxReports: z.number().int().min(0).default(defaultConfig.context.operationalFailures.maxReports),
    maxRunReports: z.number().int().min(0).default(defaultConfig.context.operationalFailures.maxRunReports),
    maxTasks: z.number().int().min(0).default(defaultConfig.context.operationalFailures.maxTasks),
    maxItems: z.number().int().min(0).default(defaultConfig.context.operationalFailures.maxItems),
  })
  .default(defaultConfig.context.operationalFailures);

export const contextSchema = z
  .object({
    autoCompact: z.boolean().default(defaultConfig.context.autoCompact),
    compactAfterMessages: z.number().int().positive().default(defaultConfig.context.compactAfterMessages),
    compactKeepMessages: z.number().int().positive().default(defaultConfig.context.compactKeepMessages),
    maxToolResultChars: z.number().int().positive().default(defaultConfig.context.maxToolResultChars),
    operationalFailures: operationalFailureContextSchema,
    llmSummary: z.boolean().default(true),
    summarizationModel: z.string().default('claude-haiku-4-5'),
    summarizationProvider: z.string().optional(),
    pruneToolResults: z.boolean().default(true),
    pruneToolResultThreshold: z.number().int().positive().default(2000),
    stripOldImages: z.boolean().default(true),
    compactTokenThresholdRatio: z.number().min(0.1).max(1).default(0.8),
  })
  .default(defaultConfig.context);

const verificationSchema = z
  .object({
    commands: z.array(z.string().min(1)).default(defaultConfig.verification.commands),
    autoRun: z.boolean().default(defaultConfig.verification.autoRun),
    autoFix: z.boolean().default(defaultConfig.verification.autoFix),
    timeoutMs: z.number().int().positive().default(defaultConfig.verification.timeoutMs),
    maxOutputChars: z.number().int().positive().default(defaultConfig.verification.maxOutputChars),
    maxRepairAttempts: z.number().int().positive().default(defaultConfig.verification.maxRepairAttempts),
    acceptOnPass: z.boolean().default(defaultConfig.verification.acceptOnPass),
    rollbackFailedRepairs: z.boolean().default(defaultConfig.verification.rollbackFailedRepairs),
  })
  .default(defaultConfig.verification);

const toolGuardSchema = z
  .object({
    enabled: z.boolean().default(defaultConfig.guard.enabled),
    useDefault: z.boolean().default(defaultConfig.guard.useDefault),
    priorityTools: z.array(z.string().min(1)).default(defaultConfig.guard.priorityTools),
    requiredBefore: z.record(z.array(z.string().min(1))).default(defaultConfig.guard.requiredBefore),
    requiredBeforeAny: z.record(z.array(z.string().min(1))).default(defaultConfig.guard.requiredBeforeAny),
  })
  .default(defaultConfig.guard);

const workflowModeSchema = z.enum(['agent', 'plan', 'work']);

const workflowStepSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  input: z.enum(['original', 'previous']).optional(),
  prompt: z.string().optional(),
  promptPrefix: z.string().optional(),
  promptSuffix: z.string().optional(),
  mode: workflowModeSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

const workflowSchema = z.object({
  handler: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  systemMessage: z.string().min(1).optional(),
  prompt: z.string().optional(),
  promptPrefix: z.string().optional(),
  promptSuffix: z.string().optional(),
  mode: workflowModeSchema.optional(),
  guard: toolGuardSchema.optional(),
  steps: z.array(workflowStepSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const workerSchema = z
  .object({
    enabled: z.boolean().default(defaultConfig.worker.enabled),
    pollIntervalMs: z.number().int().positive().default(defaultConfig.worker.pollIntervalMs),
    concurrency: z.number().int().positive().default(defaultConfig.worker.concurrency),
    defaults: z
      .object({
        approvalMode: z.enum(['safe', 'auto', 'readonly']).default(defaultConfig.worker.defaults.approvalMode),
        maxTurns: z.number().int().positive().default(defaultConfig.worker.defaults.maxTurns),
        maxTokens: z.number().int().positive().default(defaultConfig.worker.defaults.maxTokens),
      })
      .default(defaultConfig.worker.defaults),
  })
  .default(defaultConfig.worker);

const isolationSchema = z
  .object({
    autoIsolateConcurrent: z.boolean().default(defaultConfig.isolation.autoIsolateConcurrent),
    defaultMode: z.enum(['shared', 'worktree']).default(defaultConfig.isolation.defaultMode),
    keepWorktree: z.enum(['if-changed', 'always', 'never']).default(defaultConfig.isolation.keepWorktree),
    scrubShellSecrets: z.boolean().default(defaultConfig.isolation.scrubShellSecrets),
    shellSecretAllowlist: z.array(z.string().min(1)).default(defaultConfig.isolation.shellSecretAllowlist),
  })
  .default(defaultConfig.isolation);

const channelGuardrailsSchema = {
  enabled: z.boolean().default(false),
  approvalMode: z.enum(['safe', 'auto', 'readonly']).default('safe'),
  maxTurns: z.number().int().positive().default(16),
  maxTokens: z.number().int().positive().default(200000),
};

const channelsSchema = z
  .object({
    telegram: z
      .object({
        ...channelGuardrailsSchema,
        tokenEnv: z.string().min(1).default('TELEGRAM_BOT_TOKEN'),
        allowedChatIds: z.array(z.number().int()).default([]),
      })
      .optional(),
    slack: z
      .object({
        ...channelGuardrailsSchema,
        botTokenEnv: z.string().min(1).default('SLACK_BOT_TOKEN'),
        signingSecretEnv: z.string().min(1).default('SLACK_SIGNING_SECRET'),
        allowedChannelIds: z.array(z.string().min(1)).default([]),
        webhookUrlEnv: z.string().min(1).default('SLACK_WEBHOOK_URL'),
      })
      .optional(),
    discord: z
      .object({
        ...channelGuardrailsSchema,
        botTokenEnv: z.string().min(1).default('DISCORD_BOT_TOKEN'),
        allowedChannelIds: z.array(z.string().min(1)).default([]),
        allowedGuildIds: z.array(z.string().min(1)).default([]),
        webhookUrlEnv: z.string().min(1).default('DISCORD_WEBHOOK_URL'),
      })
      .optional(),
    webhook: z
      .object({
        ...channelGuardrailsSchema,
        urlEnv: z.string().min(1).default('XENESIS_WEBHOOK_URL'),
        headers: z.record(z.string()).default({}),
      })
      .optional(),
  })
  .default(defaultConfig.channels);

const browserSchema = z
  .object({
    enabled: z.boolean().default(defaultConfig.browser.enabled),
    headless: z.boolean().default(defaultConfig.browser.headless),
    allowedHosts: z.array(z.string().min(1)).default(defaultConfig.browser.allowedHosts),
    idleTimeoutMs: z.number().int().positive().default(defaultConfig.browser.idleTimeoutMs),
  })
  .default(defaultConfig.browser);

const shellSchema = z
  .object({
    persistent: z.boolean().default(true),
    idleTimeoutMs: z.number().int().positive().default(300000),
  })
  .default({});

const webSchema = z.object({
  allowedHosts: z.array(z.string().min(1)).default([]),
  fetchTimeoutMs: z.number().int().positive().default(15000),
  maxRedirects: z.number().int().min(0).default(5),
});

const hookSpecSchema = z.object({
  command: z.string().min(1),
  toolPattern: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const hooksSchema = z
  .object({
    enabled: z.boolean().default(defaultConfig.hooks.enabled),
    preToolUse: z.array(hookSpecSchema).default(defaultConfig.hooks.preToolUse),
    stop: z.array(hookSpecSchema).default(defaultConfig.hooks.stop),
    maxStopHookContinuations: z.number().int().min(0).default(defaultConfig.hooks.maxStopHookContinuations),
    commandTimeoutMs: z.number().int().positive().default(defaultConfig.hooks.commandTimeoutMs),
  })
  .default(defaultConfig.hooks);

const permissionsSchema = z
  .object({
    blockedTools: z.array(z.string().min(1)).default([]),
    toolPolicies: z
      .record(
        z.object({
          action: z.enum(['allow', 'ask', 'deny']),
          reason: z.string().min(1).optional(),
          riskLevel: z.enum(['low', 'medium', 'high']).optional(),
        }),
      )
      .default({}),
    pathRules: z
      .array(
        z.object({
          action: z.enum(['allow', 'deny']),
          path: z.string().min(1),
          reason: z.string().min(1).optional(),
        }),
      )
      .default([]),
  })
  .default(defaultConfig.permissions);

const approvalSchema = z
  .object({
    timeoutMs: z.number().int().positive().default(300000),
    timeoutBehavior: z.enum(['allow', 'deny']).default('deny'),
  })
  .default({});

const curatorTierBSchema = z.object({
  enabled: z.boolean().default(false),
  dryRun: z.boolean().default(true),
  provider: z.enum(providerNames).optional(),
  model: z.string().min(1).optional(),
  intervalHours: z.number().int().positive().default(168),
  timeoutSeconds: z.number().int().positive().default(60),
  minClusterSize: z.number().int().positive().default(2),
  maxClusters: z.number().int().positive().default(25),
});

const curatorSchema = z.object({
  enabled: z.boolean().default(false),
  staleAfterDays: z.number().int().positive().default(30),
  archiveAfterDays: z.number().int().positive().default(90),
  tierB: curatorTierBSchema.optional(),
});

const commitmentsExtractionSchema = z.object({
  provider: z.enum(providerNames).optional(),
  model: z.string().min(1).optional(),
  debounceMs: z.number().int().positive().default(15000),
  batchMaxItems: z.number().int().positive().default(8),
  queueMaxItems: z.number().int().positive().default(64),
  confidenceThreshold: z.number().positive().max(1).default(0.72),
  careConfidenceThreshold: z.number().positive().max(1).default(0.86),
  timeoutSeconds: z.number().int().positive().default(45),
});

const commitmentsSchema = z.object({
  enabled: z.boolean().default(false),
  maxPerDay: z.number().int().positive().default(3),
  expireAfterHours: z.number().int().positive().default(72),
  extraction: commitmentsExtractionSchema.default({}),
});

const providerSetupSchema: z.ZodType<ProviderSetupEntry> = z.object({
  kind: z.enum(providerNames),
  enabled: z.boolean().optional(),
  model: z.string().min(1).optional(),
  baseURL: z.string().min(1).optional(),
  apiKeyEnv: z.string().min(1).optional(),
  supportsTools: z.boolean().optional(),
  label: z.string().min(1).optional(),
});

const configSchema = z.object({
  provider: z.enum(providerNames).optional(),
  model: z.string().min(1).optional(),
  xenesisHome: z.string().min(1).optional(),
  baseURL: z.string().min(1).optional(),
  apiKeyEnv: z.string().min(1).optional(),
  providerRetries: z.number().int().min(0).optional(),
  providerFallbacks: z
    .array(
      z.object({
        provider: z.enum(providerNames),
        model: z.string().min(1).optional(),
        baseURL: z.string().min(1).optional(),
        apiKeyEnv: z.string().min(1).optional(),
      }),
    )
    .default(defaultConfig.providerFallbacks),
  providers: z.array(providerSetupSchema).optional(),
  maxTurns: z.number().int().positive().optional(),
  context: contextSchema.optional(),
  hooks: hooksSchema.optional(),
  verification: verificationSchema.optional(),
  guard: toolGuardSchema.optional(),
  workflow: z.string().min(1).optional(),
  workflows: z.record(workflowSchema).default(defaultConfig.workflows),
  worker: workerSchema.optional(),
  isolation: isolationSchema.optional(),
  channels: channelsSchema.optional(),
  browser: browserSchema.optional(),
  shell: shellSchema.optional(),
  web: webSchema.optional(),
  workspace: z.string().min(1).optional(),
  approvalMode: z.enum(['safe', 'auto', 'readonly']).optional(),
  extensions: extensionsSchema.optional(),
  permissions: permissionsSchema.optional(),
  approval: approvalSchema.optional(),
  curator: curatorSchema.optional(),
  commitments: commitmentsSchema.optional(),
});

type ConfigFile = Partial<z.infer<typeof configSchema>>;

export function configJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(configSchema, 'XenesisConfig') as Record<string, unknown>;
}

type ConfigObject = Record<string, unknown>;

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function parseMaxTurns(value: string | undefined) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`XENESIS_MAX_TURNS must be a positive integer, got ${value}`);
  }
  return parsed;
}

function parseApprovalMode(value: string | undefined): ApprovalMode | undefined {
  if (value === undefined) return undefined;
  if (value === 'safe' || value === 'auto' || value === 'readonly') return value;
  throw new Error(`XENESIS_APPROVAL_MODE must be safe, auto, or readonly, got ${value}`);
}

function parseBooleanEnv(value: string | undefined, name: string) {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false, got ${value}`);
}

function parseNonNegativeInteger(value: string | undefined, name: string) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer, got ${value}`);
  }
  return parsed;
}

function parseProvider(value: string | undefined): ProviderName | undefined {
  if (value === undefined) return undefined;
  if ((providerNames as readonly string[]).includes(value)) return value as ProviderName;
  throw new Error(`XENESIS_PROVIDER must be one of ${providerNames.join(', ')}, got ${value}`);
}

function parseProviderFallbacks(value: string | undefined): ProviderFallbackConfig[] | undefined {
  if (value === undefined) return undefined;
  if (value.trim().length === 0) return [];
  return value.split(',').map((part) => {
    const [providerName, model] = part.trim().split(':', 2);
    const provider = parseProvider(providerName);
    if (!provider) throw new Error(`XENESIS_FALLBACK_PROVIDERS contains an empty provider name`);
    return {
      provider,
      ...(model && model.trim().length > 0 ? { model: model.trim() } : {}),
    };
  });
}

function isPlainConfigObject(value: unknown): value is ConfigObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeConfigObject(base: ConfigObject, override: ConfigObject): ConfigObject {
  const result: ConfigObject = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const current = result[key];
    if (isPlainConfigObject(current) && isPlainConfigObject(value)) {
      result[key] = mergeConfigObject(current, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function mergeConfigLayers(...layers: unknown[]): ConfigObject {
  let result: ConfigObject = {};
  for (const layer of layers) {
    if (!isPlainConfigObject(layer)) continue;
    result = mergeConfigObject(result, layer);
  }
  return result;
}

async function readConfigFile(
  cwd: string,
  configPath?: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ConfigFile> {
  const isExplicitConfigPath = configPath !== undefined;
  const resolvedPath = configPath ? resolve(cwd, configPath) : resolve(cwd, 'xenesis.config.json');

  try {
    await access(resolvedPath);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT' && !isExplicitConfigPath) {
      return {};
    }
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new Error(`Config file not found ${resolvedPath}`);
    }
    throw error;
  }

  try {
    const raw = await readFile(resolvedPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return configSchema.parse(resolveConfigEnvVars(parsed, env));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid config file ${resolvedPath}: ${message}`);
  }
}

function envOverrides(env: NodeJS.ProcessEnv): CliConfigOverrides {
  const overrides: CliConfigOverrides = {};
  if (env.XENESIS_HOME !== undefined) {
    if (env.XENESIS_HOME.length === 0) throw new Error('XENESIS_HOME must not be empty');
    overrides.xenesisHome = env.XENESIS_HOME;
  }
  if (env.XENESIS_PROFILE !== undefined) {
    if (env.XENESIS_PROFILE.length === 0) throw new Error('XENESIS_PROFILE must not be empty');
    overrides.profile = env.XENESIS_PROFILE;
  }
  if (env.XENESIS_PROVIDER !== undefined) {
    overrides.provider = parseProvider(env.XENESIS_PROVIDER);
  }
  if (env.XENESIS_MODEL !== undefined) {
    overrides.model = env.XENESIS_MODEL;
  } else if (env.OPENAI_MODEL !== undefined) {
    overrides.model = env.OPENAI_MODEL;
  }
  if (env.XENESIS_BASE_URL !== undefined) {
    if (env.XENESIS_BASE_URL.length === 0) throw new Error('XENESIS_BASE_URL must not be empty');
    overrides.baseURL = env.XENESIS_BASE_URL;
  }
  if (env.XENESIS_API_KEY_ENV !== undefined) {
    if (env.XENESIS_API_KEY_ENV.length === 0) throw new Error('XENESIS_API_KEY_ENV must not be empty');
    overrides.apiKeyEnv = env.XENESIS_API_KEY_ENV;
  }
  if (env.XENESIS_PROVIDER_RETRIES !== undefined) {
    overrides.providerRetries = parseNonNegativeInteger(env.XENESIS_PROVIDER_RETRIES, 'XENESIS_PROVIDER_RETRIES');
  }
  if (env.XENESIS_FALLBACK_PROVIDERS !== undefined) {
    overrides.providerFallbacks = parseProviderFallbacks(env.XENESIS_FALLBACK_PROVIDERS);
  }
  const contextOverrides: Partial<ContextConfig> = {};
  if (env.XENESIS_AUTO_COMPACT !== undefined) {
    contextOverrides.autoCompact = parseBooleanEnv(env.XENESIS_AUTO_COMPACT, 'XENESIS_AUTO_COMPACT');
  }
  if (env.XENESIS_CONTEXT_COMPACT_AFTER !== undefined) {
    contextOverrides.compactAfterMessages = parseMaxTurns(env.XENESIS_CONTEXT_COMPACT_AFTER);
  }
  if (env.XENESIS_CONTEXT_KEEP !== undefined) {
    contextOverrides.compactKeepMessages = parseMaxTurns(env.XENESIS_CONTEXT_KEEP);
  }
  if (env.XENESIS_MAX_TOOL_RESULT_CHARS !== undefined) {
    contextOverrides.maxToolResultChars = parseMaxTurns(env.XENESIS_MAX_TOOL_RESULT_CHARS);
  }
  if (env.XENESIS_LLM_SUMMARY !== undefined) {
    contextOverrides.llmSummary = parseBooleanEnv(env.XENESIS_LLM_SUMMARY, 'XENESIS_LLM_SUMMARY');
  }
  if (env.XENESIS_SUMMARIZATION_MODEL !== undefined) {
    if (env.XENESIS_SUMMARIZATION_MODEL.length === 0) throw new Error('XENESIS_SUMMARIZATION_MODEL must not be empty');
    contextOverrides.summarizationModel = env.XENESIS_SUMMARIZATION_MODEL;
  }
  if (env.XENESIS_PRUNE_TOOL_RESULTS !== undefined) {
    contextOverrides.pruneToolResults = parseBooleanEnv(env.XENESIS_PRUNE_TOOL_RESULTS, 'XENESIS_PRUNE_TOOL_RESULTS');
  }
  if (env.XENESIS_STRIP_OLD_IMAGES !== undefined) {
    contextOverrides.stripOldImages = parseBooleanEnv(env.XENESIS_STRIP_OLD_IMAGES, 'XENESIS_STRIP_OLD_IMAGES');
  }
  const operationalFailureOverrides: Partial<ContextConfig['operationalFailures']> = {};
  if (env.XENESIS_OPERATIONAL_FAILURE_CONTEXT !== undefined) {
    operationalFailureOverrides.enabled = parseBooleanEnv(
      env.XENESIS_OPERATIONAL_FAILURE_CONTEXT,
      'XENESIS_OPERATIONAL_FAILURE_CONTEXT',
    );
  }
  if (env.XENESIS_OPERATIONAL_FAILURE_MAX_ITEMS !== undefined) {
    operationalFailureOverrides.maxItems = parseNonNegativeInteger(
      env.XENESIS_OPERATIONAL_FAILURE_MAX_ITEMS,
      'XENESIS_OPERATIONAL_FAILURE_MAX_ITEMS',
    );
  }
  if (Object.keys(operationalFailureOverrides).length > 0) {
    contextOverrides.operationalFailures = {
      ...defaultConfig.context.operationalFailures,
      ...operationalFailureOverrides,
    };
  }
  if (Object.keys(contextOverrides).length > 0) {
    overrides.context = contextSchema.parse({
      ...defaultConfig.context,
      ...contextOverrides,
    });
  }
  if (env.XENESIS_MAX_TURNS !== undefined) {
    overrides.maxTurns = parseMaxTurns(env.XENESIS_MAX_TURNS);
  }
  if (env.XENESIS_APPROVAL_MODE !== undefined) {
    overrides.approvalMode = parseApprovalMode(env.XENESIS_APPROVAL_MODE);
  }
  const hooksOverrides: Partial<HooksConfig> = {};
  if (env.XENESIS_HOOKS_ENABLED !== undefined) {
    hooksOverrides.enabled = parseBooleanEnv(env.XENESIS_HOOKS_ENABLED, 'XENESIS_HOOKS_ENABLED');
  }
  if (Object.keys(hooksOverrides).length > 0) {
    overrides.hooks = hooksOverrides;
  }
  return overrides;
}

function resolveWorkspace(cwd: string, workspace: string) {
  return isAbsolute(workspace) ? resolve(workspace) : resolve(cwd, workspace);
}

function normalizeExtensions(extensions: ExtensionsConfig | undefined): ExtensionsConfig {
  return extensionsSchema.parse(extensions ?? defaultConfig.extensions);
}

function normalizePermissions(permissions: PermissionsConfig | undefined): PermissionsConfig {
  return permissionsSchema.parse(permissions ?? defaultConfig.permissions);
}

function trustWorkspacePermissions(permissions: PermissionsConfig): PermissionsConfig {
  return {
    ...permissions,
    toolPolicies: {
      ...permissions.toolPolicies,
      shell: {
        action: 'allow',
        reason: 'Workspace trusted by --trust-workspace.',
        riskLevel: 'medium',
      },
    },
  };
}

function normalizeContext(context: ContextConfig | undefined): ContextConfig {
  return contextSchema.parse(context ?? defaultConfig.context);
}

function normalizeVerification(verification: VerificationConfig | undefined): VerificationConfig {
  return verificationSchema.parse(verification ?? defaultConfig.verification);
}

function normalizeGuard(guard: ToolGuardConfig | undefined): ToolGuardConfig {
  return toolGuardSchema.parse(guard ?? defaultConfig.guard);
}

function normalizeWorkflows(workflows: Record<string, WorkflowConfig> | undefined): Record<string, WorkflowConfig> {
  return z.record(workflowSchema).parse(workflows ?? defaultConfig.workflows);
}

function normalizeWorker(worker: WorkerConfig | undefined): WorkerConfig {
  return workerSchema.parse(worker ?? defaultConfig.worker);
}

function normalizeIsolation(isolation: IsolationConfig | undefined): IsolationConfig {
  return isolationSchema.parse(isolation ?? defaultConfig.isolation);
}

function normalizeChannels(channels: ChannelsConfig | undefined): ChannelsConfig {
  return channelsSchema.parse(channels ?? defaultConfig.channels);
}

function normalizeBrowser(browser: BrowserConfig | undefined): BrowserConfig {
  return browserSchema.parse(browser ?? defaultConfig.browser);
}

function normalizeShell(shell: ShellConfig | undefined): ShellConfig {
  return shellSchema.parse(shell ?? defaultConfig.shell);
}

function normalizeWeb(web: WebToolsConfig | undefined): WebToolsConfig | undefined {
  return web === undefined ? undefined : webSchema.parse(web);
}

function normalizeHooks(hooks: HooksConfig | undefined): HooksConfig {
  return hooksSchema.parse(hooks ?? defaultConfig.hooks);
}

function normalizeApproval(approval: ApprovalConfig | undefined): ApprovalConfig {
  return approvalSchema.parse(approval ?? defaultConfig.approval);
}

export async function loadConfig(options: LoadConfigOptions): Promise<XenesisConfig> {
  const env = options.env ?? process.env;
  const fileConfig = await readConfigFile(options.cwd, options.configPath, env);
  const envConfig = envOverrides(env);
  const cliConfig = options.cli ?? {};
  const xenesisHome = resolveXenesisHome(
    options.cwd,
    cliConfig.xenesisHome ?? envConfig.xenesisHome ?? fileConfig.xenesisHome,
  );
  const profileConfig = await readProfileConfig(xenesisHome, cliConfig.profile ?? envConfig.profile);
  const { profile: _envProfile, ...envConfigOverrides } = envConfig;
  const { profile: _cliProfile, trustWorkspace, ...cliConfigOverrides } = cliConfig;

  const merged = configSchema.parse(
    mergeConfigLayers(defaultConfig, fileConfig, profileConfig, envConfigOverrides, cliConfigOverrides, {
      xenesisHome,
    }),
  );
  const web = normalizeWeb(merged.web);

  return {
    provider: merged.provider ?? (defaultConfig.provider as ProviderName),
    model: merged.model ?? defaultConfig.model,
    baseURL: merged.baseURL,
    apiKeyEnv: merged.apiKeyEnv,
    providerRetries: merged.providerRetries ?? defaultConfig.providerRetries,
    providerFallbacks: merged.providerFallbacks ?? defaultConfig.providerFallbacks,
    ...(merged.providers !== undefined ? { providers: merged.providers } : {}),
    context: normalizeContext(merged.context),
    hooks: normalizeHooks(merged.hooks),
    verification: normalizeVerification(merged.verification),
    guard: normalizeGuard(merged.guard),
    workflow: merged.workflow ?? defaultConfig.workflow,
    workflows: normalizeWorkflows(merged.workflows),
    worker: normalizeWorker(merged.worker),
    isolation: normalizeIsolation(merged.isolation),
    channels: normalizeChannels(merged.channels),
    browser: normalizeBrowser(merged.browser),
    shell: normalizeShell(merged.shell),
    ...(web !== undefined ? { web } : {}),
    maxTurns: merged.maxTurns ?? defaultConfig.maxTurns,
    xenesisHome: resolveXenesisHome(options.cwd, merged.xenesisHome ?? xenesisHome),
    workspace: resolveWorkspace(options.cwd, merged.workspace ?? defaultConfig.workspace),
    approvalMode: merged.approvalMode ?? defaultConfig.approvalMode,
    extensions: normalizeExtensions(merged.extensions),
    permissions: trustWorkspace
      ? trustWorkspacePermissions(normalizePermissions(merged.permissions))
      : normalizePermissions(merged.permissions),
    approval: normalizeApproval(merged.approval),
    ...(merged.curator !== undefined ? { curator: merged.curator } : {}),
    ...(merged.commitments !== undefined ? { commitments: merged.commitments } : {}),
  };
}
