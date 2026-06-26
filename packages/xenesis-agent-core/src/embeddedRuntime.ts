import {
  type ProviderName,
  runXenesisEmbeddedPrompt,
  type XenesisEmbeddedPromptOptions,
  type XenesisEmbeddedPromptResult,
} from './xenesisRuntimeBridge';

export type DeskEmbeddedPromptOptions = XenesisEmbeddedPromptOptions;
export type DeskEmbeddedPromptResult = XenesisEmbeddedPromptResult;
export type { ProviderName };

export type DeskApprovalMode = 'safe' | 'auto' | 'readonly';

export interface DeskEmbeddedProfilePolicyState {
  workflow: string;
  approvalMode: DeskApprovalMode;
  maxTurns: number;
  providerRetries: number;
  contextAutoCompact: boolean;
  memoryEnabled: boolean;
  subagentsEnabled: boolean;
  browserEnabled: boolean;
  verificationAutoRun: boolean;
  verificationAutoFix: boolean;
}

export interface DeskProviderRuntimeOptions {
  provider: string;
  model: string;
  profile: string;
  baseURL: string;
  apiKeyEnv: string;
  env: NodeJS.ProcessEnv;
}

export interface DeskProviderRuntimeOverride {
  provider?: string;
  model?: string;
  profile?: string;
  providerProfile?: string;
  baseURL?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  env?: NodeJS.ProcessEnv;
}

export interface DeskEmbeddedRunRequest {
  prompt: string;
  workspace?: string;
  workflow?: string;
  mode?: XenesisEmbeddedPromptOptions['mode'];
  source?: string;
  context?: Record<string, unknown>;
  sessionId?: string;
  historyMessages?: XenesisEmbeddedPromptOptions['historyMessages'];
  attachments?: XenesisEmbeddedPromptOptions['attachments'];
  providerRuntime?: DeskProviderRuntimeOverride;
  stream?: boolean;
}

export interface CreateDeskEmbeddedEnvInput {
  baseEnv?: NodeJS.ProcessEnv;
  providerRuntime: Pick<DeskProviderRuntimeOptions, 'env'>;
  xenesisHome: string;
  bridgeUrl?: string;
  bridgeToken?: string;
}

export interface CreateDeskEmbeddedPromptOptionsInput {
  workspace: string;
  xenesisHome: string;
  baseEnv?: NodeJS.ProcessEnv;
  providerRuntime: DeskProviderRuntimeOptions;
  approvalMode: DeskApprovalMode;
  maxTurns: number;
  profileName?: string;
  profilePolicy?: DeskEmbeddedProfilePolicyState;
  bridgeUrl?: string;
  bridgeToken?: string;
  request: DeskEmbeddedRunRequest;
  abortSignal?: AbortSignal;
  onEvent?: XenesisEmbeddedPromptOptions['onEvent'];
  onSession?: XenesisEmbeddedPromptOptions['onSession'];
  onMessages?: XenesisEmbeddedPromptOptions['onMessages'];
}

const deskProviderNames = new Set<ProviderName>([
  'openai',
  'mock',
  'anthropic',
  'claude',
  'openai-compatible',
  'gemini',
  'ollama',
  'openrouter',
  'groq',
  'deepseek',
  'qwen',
  'mistral',
  'xai',
  'codex-cli',
  'codex-app-server',
  'codex-responses',
  'claude-cli',
  'claude-interactive',
]);

export function normalizeDeskProviderName(value: string): ProviderName | undefined {
  const normalized = String(value || '').trim();
  return deskProviderNames.has(normalized as ProviderName) ? (normalized as ProviderName) : undefined;
}

function optionalProviderRuntimeText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function mergeDeskProviderRuntimeOptions(
  base: DeskProviderRuntimeOptions,
  override?: DeskProviderRuntimeOverride,
): DeskProviderRuntimeOptions {
  if (!override) return base;
  return {
    provider: optionalProviderRuntimeText(override.provider) ?? base.provider,
    model: optionalProviderRuntimeText(override.model) ?? base.model,
    profile: optionalProviderRuntimeText(override.profile ?? override.providerProfile) ?? base.profile,
    baseURL: optionalProviderRuntimeText(override.baseURL ?? override.baseUrl) ?? base.baseURL,
    apiKeyEnv: optionalProviderRuntimeText(override.apiKeyEnv) ?? base.apiKeyEnv,
    env: {
      ...base.env,
      ...(override.env ?? {}),
    },
  };
}

export function createDeskEmbeddedEnv(input: CreateDeskEmbeddedEnvInput): NodeJS.ProcessEnv {
  return {
    ...(input.baseEnv ?? {}),
    ...input.providerRuntime.env,
    XENESIS_HOME: input.xenesisHome,
    XENESIS_MODE: 'desk',
    XENIS_XENESIS: '1',
    ...(input.bridgeUrl ? { XENIS_MCP_BRIDGE_URL: input.bridgeUrl } : {}),
    ...(input.bridgeToken ? { XENIS_MCP_BRIDGE_TOKEN: input.bridgeToken } : {}),
  };
}

export function createDeskEmbeddedPromptOptions(
  input: CreateDeskEmbeddedPromptOptionsInput,
): DeskEmbeddedPromptOptions {
  const providerRuntime = mergeDeskProviderRuntimeOptions(input.providerRuntime, input.request.providerRuntime);
  const provider = normalizeDeskProviderName(providerRuntime.provider);

  return {
    cwd: input.workspace,
    env: createDeskEmbeddedEnv({
      baseEnv: input.baseEnv,
      providerRuntime,
      xenesisHome: input.xenesisHome,
      bridgeUrl: input.bridgeUrl,
      bridgeToken: input.bridgeToken,
    }),
    prompt: input.request.prompt,
    workflow: input.request.workflow || 'xenis',
    mode: input.request.mode || 'work',
    source: input.request.source || 'xenesis-xenesis-agent',
    workspace: input.workspace,
    context: input.request.context,
    sessionId: input.request.sessionId,
    historyMessages: input.request.historyMessages,
    attachments: input.request.attachments,
    stream: input.request.stream ?? true,
    profile: input.profileName,
    profilePolicy: input.profilePolicy,
    abortSignal: input.abortSignal,
    cli: {
      xenesisHome: input.xenesisHome,
      ...(provider ? { provider } : {}),
      ...(providerRuntime.model ? { model: providerRuntime.model } : {}),
      ...(providerRuntime.profile ? { profile: providerRuntime.profile } : {}),
      approvalMode: input.approvalMode,
      maxTurns: input.maxTurns,
      ...(providerRuntime.baseURL ? { baseURL: providerRuntime.baseURL } : {}),
      ...(providerRuntime.apiKeyEnv ? { apiKeyEnv: providerRuntime.apiKeyEnv } : {}),
    },
    onSession: input.onSession,
    onMessages: input.onMessages,
    onEvent: input.onEvent,
  };
}

export function runDeskEmbeddedPrompt(options: DeskEmbeddedPromptOptions): Promise<DeskEmbeddedPromptResult> {
  return runXenesisEmbeddedPrompt(options);
}
