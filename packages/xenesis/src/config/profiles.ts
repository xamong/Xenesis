import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import type { CliConfigOverrides } from './types.js';
import { providerNames } from './types.js';

const secretRefSchema = z.union([
  z.string().min(1),
  z.object({
    source: z.enum(['env', 'file', 'exec']),
    provider: z.string().min(1).optional(),
    id: z.string().min(1),
  }),
]);

const contextSchema = z
  .object({
    autoCompact: z.boolean().optional(),
    compactAfterMessages: z.number().int().positive().optional(),
    compactKeepMessages: z.number().int().positive().optional(),
    maxToolResultChars: z.number().int().positive().optional(),
    llmSummary: z.boolean().optional(),
    summarizationModel: z.string().optional(),
    summarizationProvider: z.string().optional(),
    pruneToolResults: z.boolean().optional(),
    pruneToolResultThreshold: z.number().int().positive().optional(),
    stripOldImages: z.boolean().optional(),
    compactTokenThresholdRatio: z.number().min(0.1).max(1).optional(),
  })
  .optional();

const verificationSchema = z
  .object({
    commands: z.array(z.string().min(1)).optional(),
    autoRun: z.boolean().optional(),
    autoFix: z.boolean().optional(),
    timeoutMs: z.number().int().positive().optional(),
    maxOutputChars: z.number().int().positive().optional(),
    maxRepairAttempts: z.number().int().positive().optional(),
    acceptOnPass: z.boolean().optional(),
    rollbackFailedRepairs: z.boolean().optional(),
  })
  .optional();

const toolGuardSchema = z
  .object({
    enabled: z.boolean().optional(),
    useDefault: z.boolean().optional(),
    priorityTools: z.array(z.string().min(1)).optional(),
    requiredBefore: z.record(z.array(z.string().min(1))).optional(),
    requiredBeforeAny: z.record(z.array(z.string().min(1))).optional(),
  })
  .optional();

const providerFallbackSchema = z.object({
  provider: z.enum(providerNames),
  model: z.string().min(1).optional(),
  baseURL: z.string().min(1).optional(),
  apiKeyEnv: z.string().min(1).optional(),
});

const providerSetupSchema = z.object({
  kind: z.enum(providerNames),
  enabled: z.boolean().optional(),
  model: z.string().min(1).optional(),
  baseURL: z.string().min(1).optional(),
  apiKeyEnv: z.string().min(1).optional(),
  supportsTools: z.boolean().optional(),
  label: z.string().min(1).optional(),
});

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
  guard: toolGuardSchema,
  steps: z.array(workflowStepSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const workerSchema = z
  .object({
    enabled: z.boolean().optional(),
    pollIntervalMs: z.number().int().positive().optional(),
    concurrency: z.number().int().positive().optional(),
    defaults: z
      .object({
        approvalMode: z.enum(['safe', 'auto', 'readonly']).optional(),
        maxTurns: z.number().int().positive().optional(),
        maxTokens: z.number().int().positive().optional(),
      })
      .optional(),
  })
  .optional();

const isolationSchema = z
  .object({
    autoIsolateConcurrent: z.boolean().optional(),
    defaultMode: z.enum(['shared', 'worktree']).optional(),
    keepWorktree: z.enum(['if-changed', 'always', 'never']).optional(),
    scrubShellSecrets: z.boolean().optional(),
    shellSecretAllowlist: z.array(z.string().min(1)).optional(),
  })
  .optional();

const channelGuardrailsSchema = {
  enabled: z.boolean().optional(),
  approvalMode: z.enum(['safe', 'auto', 'readonly']).optional(),
  maxTurns: z.number().int().positive().optional(),
  maxTokens: z.number().int().positive().optional(),
};

const channelsSchema = z
  .object({
    telegram: z
      .object({
        ...channelGuardrailsSchema,
        tokenEnv: z.string().min(1).optional(),
        allowedChatIds: z.array(z.number().int()).optional(),
      })
      .optional(),
    slack: z
      .object({
        ...channelGuardrailsSchema,
        botTokenEnv: z.string().min(1).optional(),
        signingSecretEnv: z.string().min(1).optional(),
        allowedChannelIds: z.array(z.string().min(1)).optional(),
        webhookUrlEnv: z.string().min(1).optional(),
      })
      .optional(),
    discord: z
      .object({
        ...channelGuardrailsSchema,
        botTokenEnv: z.string().min(1).optional(),
        allowedChannelIds: z.array(z.string().min(1)).optional(),
        allowedGuildIds: z.array(z.string().min(1)).optional(),
        webhookUrlEnv: z.string().min(1).optional(),
      })
      .optional(),
    webhook: z
      .object({
        ...channelGuardrailsSchema,
        urlEnv: z.string().min(1).optional(),
        headers: z.record(z.string()).optional(),
      })
      .optional(),
  })
  .optional();

const browserSchema = z
  .object({
    enabled: z.boolean().optional(),
    headless: z.boolean().optional(),
    allowedHosts: z.array(z.string().min(1)).optional(),
    idleTimeoutMs: z.number().int().positive().optional(),
  })
  .optional();

const webSchema = z
  .object({
    allowedHosts: z.array(z.string().min(1)).optional(),
    fetchTimeoutMs: z.number().int().positive().optional(),
    maxRedirects: z.number().int().min(0).optional(),
  })
  .optional();

const shellSchema = z
  .object({
    persistent: z.boolean().optional(),
    idleTimeoutMs: z.number().int().positive().optional(),
  })
  .optional();

const hookSpecSchema = z.object({
  command: z.string().min(1),
  toolPattern: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const hooksSchema = z
  .object({
    enabled: z.boolean().optional(),
    preToolUse: z.array(hookSpecSchema).optional(),
    stop: z.array(hookSpecSchema).optional(),
    maxStopHookContinuations: z.number().int().min(0).optional(),
    commandTimeoutMs: z.number().int().positive().optional(),
  })
  .optional();

const approvalSchema = z
  .object({
    timeoutMs: z.number().int().positive().optional(),
    timeoutBehavior: z.enum(['allow', 'deny']).optional(),
  })
  .optional();

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

const mcpServerSchema = z.preprocess(
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
  z.discriminatedUnion('type', [
    z.object({
      enabled: z.boolean().optional(),
      type: z.literal('stdio').default('stdio'),
      command: z.string().min(1),
      args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
      cwd: z.string().min(1).optional(),
      transport: z.literal('stdio').optional(),
      toolFilter: mcpToolFilterSchema.optional(),
      connectionTimeoutMs: z.number().int().positive().optional(),
      requestTimeoutMs: z.number().int().positive().optional(),
    }),
    z.object({
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
    }),
  ]),
);

const embedderSchema = z.object({
  provider: z.enum(['deterministic']),
  dimensions: z.number().int().positive().optional(),
  minScore: z.number().min(0).max(1).optional(),
});

const memoryGraphSchema = z.object({
  enabled: z.boolean().optional(),
  endpoint: z.string().url().optional(),
  allowedEndpoints: z.array(z.string().url()).optional(),
  localOnly: z.boolean().optional(),
  allowSensitiveProjection: z.boolean().optional(),
  redactEvidence: z.boolean().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const extensionsSchema = z
  .object({
    mcpServers: z.record(mcpServerSchema).optional(),
    recommendedMcpServers: z.array(z.string().min(1)).optional(),
    memory: z
      .object({
        enabled: z.boolean().optional(),
        path: z.string().min(1).optional(),
        embedder: embedderSchema.optional(),
        graph: memoryGraphSchema.optional(),
      })
      .optional(),
    subagents: z
      .object({
        enabled: z.boolean().optional(),
        maxConcurrent: z.number().int().positive().optional(),
        definitions: z
          .record(
            z.object({
              approvalMode: z.enum(['safe', 'auto', 'readonly']).optional(),
              maxTurns: z.number().int().positive().max(24).optional(),
              tools: z.array(z.string().min(1)).optional(),
            }),
          )
          .optional(),
      })
      .optional(),
    plugins: z
      .object({
        paths: z.array(z.string().min(1)).optional(),
      })
      .optional(),
    skills: z
      .object({
        paths: z.array(z.string().min(1)).optional(),
        autoLoad: z.boolean().optional(),
        disclosure: z.enum(['catalog', 'full']).optional(),
      })
      .optional(),
  })
  .optional();

const curatorTierBSchema = z
  .object({
    enabled: z.boolean().optional(),
    dryRun: z.boolean().optional(),
    provider: z.enum(providerNames).optional(),
    model: z.string().min(1).optional(),
    intervalHours: z.number().int().positive().optional(),
    timeoutSeconds: z.number().int().positive().optional(),
    minClusterSize: z.number().int().positive().optional(),
    maxClusters: z.number().int().positive().optional(),
  })
  .optional();

const curatorSchema = z
  .object({
    enabled: z.boolean().optional(),
    staleAfterDays: z.number().int().positive().optional(),
    archiveAfterDays: z.number().int().positive().optional(),
    tierB: curatorTierBSchema,
  })
  .optional();

const commitmentsExtractionSchema = z
  .object({
    provider: z.enum(providerNames).optional(),
    model: z.string().min(1).optional(),
    debounceMs: z.number().int().positive().optional(),
    batchMaxItems: z.number().int().positive().optional(),
    queueMaxItems: z.number().int().positive().optional(),
    confidenceThreshold: z.number().positive().max(1).optional(),
    careConfidenceThreshold: z.number().positive().max(1).optional(),
    timeoutSeconds: z.number().int().positive().optional(),
  })
  .optional();

const commitmentsSchema = z
  .object({
    enabled: z.boolean().optional(),
    maxPerDay: z.number().int().positive().optional(),
    expireAfterHours: z.number().int().positive().optional(),
    extraction: commitmentsExtractionSchema,
  })
  .optional();

const permissionsSchema = z
  .object({
    blockedTools: z.array(z.string().min(1)).optional(),
    toolPolicies: z
      .record(
        z.object({
          action: z.enum(['allow', 'ask', 'deny']),
          reason: z.string().min(1).optional(),
          riskLevel: z.enum(['low', 'medium', 'high']).optional(),
        }),
      )
      .optional(),
    pathRules: z
      .array(
        z.object({
          action: z.enum(['allow', 'deny']),
          path: z.string().min(1),
          reason: z.string().min(1).optional(),
        }),
      )
      .optional(),
  })
  .optional();

export const profileConfigSchema = z.object({
  provider: z.enum(providerNames).optional(),
  model: z.string().min(1).optional(),
  baseURL: z.string().min(1).optional(),
  apiKeyEnv: z.string().min(1).optional(),
  providerRetries: z.number().int().min(0).optional(),
  providerFallbacks: z.array(providerFallbackSchema).optional(),
  providers: z.array(providerSetupSchema).optional(),
  workflow: z.string().min(1).optional(),
  workflows: z.record(workflowSchema).optional(),
  worker: workerSchema,
  isolation: isolationSchema,
  hooks: hooksSchema,
  channels: channelsSchema,
  browser: browserSchema,
  shell: shellSchema,
  web: webSchema,
  maxTurns: z.number().int().positive().optional(),
  approvalMode: z.enum(['safe', 'auto', 'readonly']).optional(),
  context: contextSchema,
  verification: verificationSchema,
  guard: toolGuardSchema,
  extensions: extensionsSchema,
  permissions: permissionsSchema,
  approval: approvalSchema,
  curator: curatorSchema,
  commitments: commitmentsSchema,
});

export type ProfileConfig = z.infer<typeof profileConfigSchema>;

const profilesFileSchema = z.object({
  active: z.string().min(1).optional(),
  profiles: z.record(profileConfigSchema).default({}),
});

export interface ProfilesFile {
  active?: string;
  profiles: Record<string, ProfileConfig>;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

export function defaultXenesisHome() {
  return resolve(homedir(), '.xenesis');
}

export function resolveXenesisHome(cwd: string, value?: string) {
  const home = value && value.trim().length > 0 ? value : defaultXenesisHome();
  return isAbsolute(home) ? resolve(home) : resolve(cwd, home);
}

export function profilesPath(xenesisHome: string) {
  return resolve(xenesisHome, 'profiles.json');
}

export async function readProfiles(xenesisHome: string): Promise<ProfilesFile> {
  try {
    const raw = await readFile(profilesPath(xenesisHome), 'utf8');
    return profilesFileSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return { profiles: {} };
    throw error;
  }
}

export async function writeProfiles(xenesisHome: string, profiles: ProfilesFile) {
  const path = profilesPath(xenesisHome);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(profiles, null, 2)}\n`, 'utf8');
}

export async function readProfileConfig(xenesisHome: string, requestedProfile?: string): Promise<ProfileConfig> {
  const profiles = await readProfiles(xenesisHome);
  const name = requestedProfile ?? profiles.active;
  if (!name) return {};
  const profile = profiles.profiles[name];
  if (!profile) throw new Error(`Profile not found: ${name}`);
  return profile;
}

export function pickProfileConfig(config: CliConfigOverrides): ProfileConfig {
  return profileConfigSchema.parse({
    provider: config.provider,
    model: config.model,
    baseURL: config.baseURL,
    apiKeyEnv: config.apiKeyEnv,
    providerRetries: config.providerRetries,
    providerFallbacks: config.providerFallbacks,
    providers: config.providers,
    workflow: config.workflow,
    workflows: config.workflows,
    worker: config.worker,
    isolation: config.isolation,
    hooks: config.hooks,
    channels: config.channels,
    browser: config.browser,
    shell: config.shell,
    web: config.web,
    maxTurns: config.maxTurns,
    approvalMode: config.approvalMode,
    context: config.context,
    verification: config.verification,
    guard: config.guard,
    extensions: config.extensions,
    permissions: config.permissions,
    approval: config.approval,
    curator: config.curator,
    commitments: config.commitments,
  });
}
