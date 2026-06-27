import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BUILTIN_EXTERNAL_APP_PROFILES,
  createExternalAppProfileFromTemplate,
  EXTERNAL_APP_PROFILE_TEMPLATES,
  type ExternalAppProfile,
  normalizeExternalAppSettings,
} from '../../shared/externalAppControl';
import { filterXenisPhase5SecretVaultItems, isXenisPhase5EnabledFromSettings } from '../../shared/phase5';
import type {
  AiProviderKind,
  AiProviderProfile,
  AiProviderSettings,
  AppSettings,
  AutomationSettings,
  CommandShortcutBinding,
  ExtensionInfo,
  ExtensionPermission,
  GowooriChatSettings,
  LocalCliAgentId,
  LocalCliAgentStatus,
  LocalCliApi,
  LocalTerminalCliSelection,
  LocalTerminalProfile,
  McpBridgeCapabilityCallRequest,
  McpSettingsStatus,
  ProviderIntegrationApi,
  ProviderIntegrationCliTargetId,
  ProviderIntegrationStatus,
  RemoteFileEncoding,
  RemoteFileProfile,
  RemoteFileProtocol,
  RemoteFileSettings,
  RemoteTerminalProfile,
  RemoteTerminalProtocol,
  RemoteTerminalSettings,
  SecretVaultStatus,
  SecretVaultStorageMode,
  SettingsBackupListItem,
  ShellDescriptor,
  ShellKind,
  TerminalProfileGroup,
  TerminalRestoreSettings,
  TerminalWorkBlock,
  ThemeName,
  UpdateChannel,
  UpdaterSettings,
  UpdaterStatus,
  WindowBounds,
  WindowSizerCoordinateMode,
  WindowSizerPreset,
  WorkspaceSettings,
  XamongCodeApi,
  XamongCodeServerStatus,
  XenesisApprovalMode,
  XenesisConnectionItem,
  XenesisConnectionStatus,
  XenesisConnectionsStatus,
  XenesisGatewayChannelName,
  XenesisGatewayChannelRuntimeStatus,
  XenesisProfileChannelName,
  XenesisProfileChannelSettings,
  XenesisProfileState,
  XenesisRuntimeMode,
  XenesisStatus,
} from '../../shared/types';
import { type AuthUser, authApiLoadUser, authApiLogout } from '../auth/authApi';
import { renderExtensionSettingsSections } from '../extensions/settingsRegistry';
import { runGowooriApiProvider } from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriApiRunner';
import type { GowooriArtifactRepairDiagnostic } from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriArtifactRepair';
import { resolveGowooriApiRuntimeSettings } from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriProviderRuntime';
import { createGowooriQualityLogEntry } from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriQualityLog';
import {
  appendGowooriQualityLogToStorage,
  notifyGowooriQualityLogChanged,
} from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriQualityLogStorage';
import { useI18n } from '../i18n';
import {
  eventToAccelerator,
  findDuplicateAccelerators,
  normalizeAccelerator,
  normalizeCommandShortcutBindings,
} from '../keyboardShortcuts';
import AutomationSettingsSection from '../terminal/AutomationSettingsSection';
import { mergePendingLocalTerminalProfile } from '../terminal/terminalProfileSnapshot';
import { SETTINGS_CATEGORIES, type SettingsCategoryId, VISIBLE_SETTINGS_CATEGORIES } from './settingsCatalog.mjs';
import {
  buildXenesisConnectionGuideRequest,
  buildXenesisConnectionOpenRequest,
  buildXenesisConnectionSettingsRequest,
  formatXenesisChannelAccessGroupsSummary,
  formatXenesisChannelPairingSummary,
  formatXenesisChannelRoutingSummary,
  formatXenesisChannelSafetySummary,
  formatXenesisGuideCatalogSummary,
  formatXenesisMessengerViewSummary,
  formatXenesisProviderRoutingSummary,
  formatXenesisProviderSetupSummary,
  formatXenesisProviderViewSummary,
  formatXenesisToolConnectorSummary,
  formatXenesisToolInstallPlanSummary,
  formatXenesisToolSetupSummary,
  formatXenesisToolUserStorySummary,
  formatXenesisToolViewSummary,
  listXenesisConnectionSections,
  xenesisConnectionTone,
} from './xenesisConnectionCenter';

const BUILTIN_EXTERNAL_APP_IDS = new Set(BUILTIN_EXTERNAL_APP_PROFILES.map((profile) => profile.id));

declare global {
  interface Window {
    xamongCodeAPI: XamongCodeApi;
    localCliAPI: LocalCliApi;
    providerIntegrationAPI: ProviderIntegrationApi;
    __xenesisSettingsOpenTarget?: SettingsOpenTargetDetail;
  }
}

const DEFAULT_XENESIS_PROFILE_CHANNEL_SETTINGS: XenesisProfileChannelSettings = {
  telegram: {
    enabled: false,
    approvalMode: 'safe',
    maxTurns: 12,
    maxTokens: 120000,
    tokenEnv: 'TELEGRAM_BOT_TOKEN',
    allowedChatIds: '',
  },
  slack: {
    enabled: false,
    approvalMode: 'safe',
    maxTurns: 12,
    maxTokens: 120000,
    botTokenEnv: 'SLACK_BOT_TOKEN',
    signingSecretEnv: 'SLACK_SIGNING_SECRET',
    webhookUrlEnv: 'SLACK_WEBHOOK_URL',
    allowedChannelIds: '',
  },
  discord: {
    enabled: false,
    approvalMode: 'safe',
    maxTurns: 12,
    maxTokens: 120000,
    botTokenEnv: 'DISCORD_BOT_TOKEN',
    webhookUrlEnv: 'DISCORD_WEBHOOK_URL',
    allowedChannelIds: '',
    allowedGuildIds: '',
  },
  webhook: {
    enabled: false,
    approvalMode: 'safe',
    maxTurns: 12,
    maxTokens: 120000,
    urlEnv: 'XENESIS_WEBHOOK_URL',
  },
};

function cloneXenesisProfileChannelSettings(settings?: XenesisProfileChannelSettings): XenesisProfileChannelSettings {
  return {
    telegram: { ...DEFAULT_XENESIS_PROFILE_CHANNEL_SETTINGS.telegram, ...settings?.telegram },
    slack: { ...DEFAULT_XENESIS_PROFILE_CHANNEL_SETTINGS.slack, ...settings?.slack },
    discord: { ...DEFAULT_XENESIS_PROFILE_CHANNEL_SETTINGS.discord, ...settings?.discord },
    webhook: { ...DEFAULT_XENESIS_PROFILE_CHANNEL_SETTINGS.webhook, ...settings?.webhook },
  };
}

const XENESIS_ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function xenesisSecretInputType(value: string): 'text' | 'password' {
  const trimmed = value.trim();
  return trimmed === '' || XENESIS_ENV_NAME_PATTERN.test(trimmed) ? 'text' : 'password';
}

interface ProviderMeta {
  label: string;
  shortLabel: string;
  defaultModel: string;
  models: string[];
  needsKey: boolean;
  defaultBaseUrl: string;
}

interface XamongInteractiveWorker {
  key: string;
  ownerId?: string;
  sessionId?: string;
  workspace?: string;
  workspacePath?: string;
  warm?: boolean;
  active?: boolean;
  tier?: string;
  createdAt?: number;
  lastUsedAt?: number;
  warmKey?: string;
}

interface XamongInteractiveWorkerStatus {
  enabled: boolean;
  idleMs: number;
  maxTotal: number;
  maxPerUser: number;
  warmPoolSize: number;
  tierPolicies?: Record<string, unknown>;
  total: number;
  active: number;
  idle: number;
  warm: number;
  workers?: XamongInteractiveWorker[];
}

interface KeyboardShortcutCommand {
  id: string;
  label: string;
  category: string;
  searchText?: string;
}

function getKeyboardShortcutSearchText(command: KeyboardShortcutCommand, accelerator: string): string {
  return [command.label, command.category, command.searchText, accelerator]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();
}

function buildWorkBlockCommandId(block: TerminalWorkBlock): string {
  return `terminal-work-block:${block.id}`;
}

const DEFAULT_API_URL = 'https://ai.xamong.com';
const DEFAULT_XAMONG_CODE_PORT = 3337;
const DEFAULT_XAMONG_CODE_HOST = '127.0.0.1';
const DEFAULT_XAMONG_CODE_CONFIG_DIR = '';
const DEFAULT_XAMONG_CODE_CONFIG_DIR_PLACEHOLDER = 'XENIS_HOME\\agent';
const DEFAULT_XENESIS_GATEWAY_HOST = '127.0.0.1';
const DEFAULT_XENESIS_GATEWAY_PORT = 3338;
const DEFAULT_XENESIS_MAX_TURNS = 20;
const DEFAULT_LAB_API_URL = 'http://127.0.0.1:3845';
const GOWOORI_SPORTS_STANDINGS_TEST_TIMEOUT_MS = 8000;
const PORT_MIN = 1024;
const PORT_MAX = 65535;

const AI_PROVIDERS: Record<AiProviderKind, ProviderMeta> = {
  auto: {
    label: 'Auto (detect)',
    shortLabel: 'Auto',
    defaultModel: '',
    models: [],
    needsKey: false,
    defaultBaseUrl: '',
  },
  openai: {
    label: 'OpenAI',
    shortLabel: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o3-mini'],
    needsKey: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    label: 'Anthropic',
    shortLabel: 'Anthropic',
    defaultModel: 'claude-opus-4-5',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-haiku-20241022'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  azure: {
    label: 'Azure OpenAI',
    shortLabel: 'Azure OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4-turbo'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  'codex-cli': {
    label: 'Codex CLI (Local)',
    shortLabel: 'Codex',
    defaultModel: 'gpt-5.5',
    models: ['gpt-5.5', 'gpt-5-codex'],
    needsKey: false,
    defaultBaseUrl: '',
  },
  'codex-app-server': {
    label: 'Codex App Server (Local)',
    shortLabel: 'Codex',
    defaultModel: 'gpt-5.5',
    models: ['gpt-5.5'],
    needsKey: false,
    defaultBaseUrl: '',
  },
  'claude-cli': {
    label: 'Claude CLI (Local)',
    shortLabel: 'Claude',
    defaultModel: 'claude-sonnet-4-5',
    models: ['claude-sonnet-4-5', 'claude-opus-4-5'],
    needsKey: false,
    defaultBaseUrl: '',
  },
  'claude-interactive': {
    label: 'Claude Interactive (Local)',
    shortLabel: 'Claude',
    defaultModel: 'claude-sonnet-4-5',
    models: ['claude-sonnet-4-5'],
    needsKey: false,
    defaultBaseUrl: '',
  },
  gemini: {
    label: 'Google Gemini',
    shortLabel: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  groq: {
    label: 'Groq',
    shortLabel: 'Groq',
    defaultModel: 'llama-3.1-8b-instant',
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  deepseek: {
    label: 'DeepSeek',
    shortLabel: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    needsKey: true,
    defaultBaseUrl: 'https://api.deepseek.com',
  },
  qwen: {
    label: 'Qwen',
    shortLabel: 'Qwen',
    defaultModel: 'qwen-plus',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
    needsKey: true,
    defaultBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  },
  ollama: {
    label: 'Ollama',
    shortLabel: 'Ollama',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'llama3.1', 'mistral', 'gemma2', 'phi3', 'qwen2.5'],
    needsKey: false,
    defaultBaseUrl: 'http://localhost:11434',
  },
  lmstudio: {
    label: 'LM Studio',
    shortLabel: 'LM Studio',
    defaultModel: 'local-model',
    models: ['local-model'],
    needsKey: false,
    defaultBaseUrl: 'http://localhost:1234',
  },
  together: {
    label: 'Together AI',
    shortLabel: 'Together',
    defaultModel: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    models: ['meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  fireworks: {
    label: 'Fireworks AI',
    shortLabel: 'Fireworks',
    defaultModel: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
    models: ['accounts/fireworks/models/llama-v3p1-8b-instruct'],
    needsKey: true,
    defaultBaseUrl: '',
  },
};

const PROVIDER_ORDER: AiProviderKind[] = [
  'auto',
  'codex-cli',
  'codex-app-server',
  'claude-cli',
  'claude-interactive',
  'openai',
  'anthropic',
  'gemini',
  'azure',
  'groq',
  'deepseek',
  'qwen',
  'ollama',
  'lmstudio',
  'together',
  'fireworks',
];

function getAiProviderModelLabelKey(provider: AiProviderKind): string {
  return provider === 'azure' ? 'settings.aiDeploymentLabel' : 'settings.aiModelLabel';
}

function getAiProviderModelCustomLabelKey(provider: AiProviderKind): string {
  return provider === 'azure' ? 'settings.aiDeploymentCustomLabel' : 'settings.aiModelCustomLabel';
}

function getAiProviderModelCustomPlaceholderKey(provider: AiProviderKind): string {
  return provider === 'azure' ? 'settings.aiDeploymentCustomPlaceholder' : 'settings.aiModelCustomPlaceholder';
}

function getAiProviderBaseUrlLabelKey(provider: AiProviderKind): string {
  return provider === 'azure' ? 'settings.aiAzureResourceUrlLabel' : 'settings.aiBaseUrlLabel';
}

function getAiProviderBaseUrlPlaceholder(
  provider: AiProviderKind,
  meta: ProviderMeta,
  translate: (key: string) => string,
): string {
  if (provider === 'azure') return translate('settings.aiAzureResourceUrlPlaceholder');
  return meta.defaultBaseUrl || translate('settings.aiEndpointDefaultPlaceholder');
}

function getAiProviderEndpointHintKey(provider: AiProviderKind): string {
  return provider === 'azure' ? 'settings.aiAzureEndpointHint' : 'settings.aiKeyHint';
}

const DEFAULT_AI_PROVIDER: AiProviderSettings = {
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: '',
  baseUrl: '',
  xcAgentApiUrl: '',
  xcApiUrl: '',
  labApiUrl: DEFAULT_LAB_API_URL,
};
const DEFAULT_AI_PROVIDER_PROFILE_ID = 'default';
const DEFAULT_GOWOORI_CHAT_SETTINGS: GowooriChatSettings = {
  provider: 'byok',
  promptMode: 'stdin',
  commandArgs: '',
  timeoutMs: 120000,
  livePreview: true,
  commandOverrides: {},
  apiBaseUrl: '',
  apiModel: '',
  sportsStandingsEndpoint: '',
};

interface SettingsProviderQualityLogInput {
  provider: AiProviderKind;
  providerLabel: string;
  profileName: string;
  startedAt: number;
  completedAt: number;
  ok: boolean;
  source: string;
  summary: string;
  diagnostics?: GowooriArtifactRepairDiagnostic[];
}

function appendSettingsProviderQualityLog(input: SettingsProviderQualityLogInput): void {
  appendGowooriQualityLogToStorage(
    createGowooriQualityLogEntry({
      id: `settings-provider-${input.provider}-${input.startedAt}-${Math.random().toString(36).slice(2, 8)}`,
      provider: input.provider,
      mode: 'settings-test',
      promptTitle: `${input.profileName || input.providerLabel} provider test`,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      source: input.source,
      normalizedChanged: false,
      preflightOk: input.ok,
      autoRepairAttempted: false,
      autoRepairSucceeded: false,
      applied: false,
      diagnostics: input.diagnostics ?? [],
      summary: input.summary,
    }),
  );
  notifyGowooriQualityLogChanged();
}

const DEFAULT_LOCAL_CLI_AGENT: LocalCliAgentId = 'codex';
const DEFAULT_REMOTE_TIMEOUT_MS = 15000;
const DEFAULT_TERMINAL_RESTORE_SETTINGS: TerminalRestoreSettings = {
  restoreShell: true,
  restoreSsh: false,
  restoreTelnet: false,
  runInitialCommandOnRestore: true,
  rerunLastCommandOnRestore: false,
};
const DEFAULT_UPDATER_SETTINGS: UpdaterSettings = {
  channel: 'public-stable',
  autoCheck: true,
  localFeedUrl: 'http://127.0.0.1:18180/xenesis-desk/',
};
const UPDATE_CHANNEL_FEEDS: Record<Exclude<UpdateChannel, 'local'>, string> = {
  'public-stable': 'https://github.com/xamong/xenesis-desk/releases/latest',
  'internal-dev': 'https://update.xamong.com/xenesis-desk/internal-dev/',
  nightly: 'https://update.xamong.com/xenesis-desk/nightly/',
};
function normalizeUpdaterSettings(settings?: Partial<UpdaterSettings>): UpdaterSettings {
  const channel: UpdateChannel =
    settings?.channel === 'internal-dev' || settings?.channel === 'nightly' || settings?.channel === 'local'
      ? settings.channel
      : 'public-stable';
  return {
    channel,
    autoCheck: settings?.autoCheck !== false,
    localFeedUrl:
      typeof settings?.localFeedUrl === 'string' && settings.localFeedUrl.trim()
        ? settings.localFeedUrl.trim()
        : DEFAULT_UPDATER_SETTINGS.localFeedUrl,
  };
}
function resolveUpdaterFeedUrl(settings: UpdaterSettings): string {
  return settings.channel === 'local' ? settings.localFeedUrl : UPDATE_CHANNEL_FEEDS[settings.channel];
}
const DEFAULT_UPDATER_STATUS: UpdaterStatus = {
  state: 'idle',
  channel: DEFAULT_UPDATER_SETTINGS.channel,
  feedUrl: resolveUpdaterFeedUrl(DEFAULT_UPDATER_SETTINGS),
  autoCheck: DEFAULT_UPDATER_SETTINGS.autoCheck,
};
const FALLBACK_SHELL_DESCRIPTORS: ShellDescriptor[] = [
  { kind: 'powershell', label: 'Windows PowerShell', command: 'powershell.exe', available: true },
  { kind: 'cmd', label: 'Command Prompt', command: 'cmd.exe', available: true },
  { kind: 'pwsh', label: 'PowerShell 7+ (pwsh)', command: 'pwsh.exe', available: false },
  { kind: 'wsl', label: 'WSL (Linux)', command: 'wsl.exe', available: false },
];
const KNOWN_LOCAL_SHELL_KINDS = new Set<ShellKind>(['powershell', 'cmd', 'pwsh', 'wsl', 'zsh', 'bash', 'sh']);

const WINDOW_SIZER_COORDINATE_OPTIONS: Array<{ value: WindowSizerCoordinateMode; labelKey: string }> = [
  { value: 'active-display-workarea', labelKey: 'settings.windowSizerCoordinateActiveWorkarea' },
  { value: 'absolute', labelKey: 'settings.windowSizerCoordinateAbsolute' },
];

const GENERIC_ENV_PLACEHOLDERS = [
  { key: 'NODE_ENV', value: 'development' },
  { key: 'PROJECT_ROOT', value: 'C:\\Projects\\demo' },
];

const LOCAL_CLI_MCP_ENV_PLACEHOLDERS = [
  { key: 'XENIS_MCP_CONFIG_FILE', value: 'XENIS_HOME\\mcp\\xenesis-mcp-config.json' },
  {
    key: 'XENIS_MCP_SERVER_PATH',
    value: 'C:\\Program Files\\Xenesis Desk\\resources\\app.asar.unpacked\\mcp\\xenesis-desk-mcp-server.mjs',
  },
];

const LOCAL_CLI_ENV_PLACEHOLDERS: Partial<Record<LocalCliAgentId, Array<{ key: string; value: string }>>> = {
  codex: [
    { key: 'OPENAI_API_KEY', value: 'sk-...' },
    { key: 'OPENAI_MODEL', value: 'gpt-5.4' },
    { key: 'OPENAI_BASE_URL', value: 'https://api.openai.com/v1' },
  ],
  claude: [
    { key: 'ANTHROPIC_API_KEY', value: 'sk-ant-...' },
    { key: 'ANTHROPIC_MODEL', value: 'claude-sonnet-4-5' },
  ],
  gemini: [
    { key: 'GEMINI_API_KEY', value: 'AIza...' },
    { key: 'GEMINI_MODEL', value: 'gemini-2.0-flash' },
  ],
  opencode: [
    { key: 'OPENAI_API_KEY', value: 'sk-...' },
    { key: 'OPENAI_MODEL', value: 'gpt-5.4' },
  ],
  qwen: [
    { key: 'DASHSCOPE_API_KEY', value: 'sk-...' },
    { key: 'QWEN_MODEL', value: 'qwen-plus' },
  ],
  kimi: [
    { key: 'MOONSHOT_API_KEY', value: 'sk-...' },
    { key: 'MOONSHOT_MODEL', value: 'kimi-k2' },
  ],
  'github-copilot': [{ key: 'GITHUB_TOKEN', value: 'ghp_...' }],
};

function formatEnvironmentPlaceholderLine(shell: ShellKind, key: string, value: string): string {
  if (shell === 'cmd') return `set ${key}=${value}`;
  if (shell === 'powershell' || shell === 'pwsh') return `$env:${key}="${value}"`;
  return `export ${key}="${value}"`;
}

function getLocalShellEnvironmentPlaceholder(
  shell: ShellKind,
  selection: LocalTerminalCliSelection,
  defaultAgentId: LocalCliAgentId,
): string {
  const agentId = selection === 'none' ? null : selection === 'default' ? defaultAgentId : selection;
  const variables = agentId
    ? [...(LOCAL_CLI_ENV_PLACEHOLDERS[agentId] ?? GENERIC_ENV_PLACEHOLDERS), ...LOCAL_CLI_MCP_ENV_PLACEHOLDERS]
    : GENERIC_ENV_PLACEHOLDERS;

  return variables.map(({ key, value }) => formatEnvironmentPlaceholderLine(shell, key, value)).join('\n');
}

type TerminalProfileListItem =
  | { type: 'local'; profile: LocalTerminalProfile }
  | { type: 'remote'; profile: RemoteTerminalProfile };

function defaultRemotePort(protocol: RemoteTerminalProtocol): number {
  return protocol === 'ssh' ? 22 : 23;
}

function normalizeRemotePort(value: string | number, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(value, 10);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return fallback;
  return n;
}

function createBlankRemoteProfile(protocol: RemoteTerminalProtocol = 'ssh'): RemoteTerminalProfile {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: '',
    groupId: '',
    protocol,
    host: '',
    port: defaultRemotePort(protocol),
    username: '',
    password: '',
    privateKeyPath: '',
    passphrase: '',
    connectTimeoutMs: DEFAULT_REMOTE_TIMEOUT_MS,
    initialCommand: '',
    createdAt: now,
    updatedAt: now,
  };
}

function defaultRemoteFilePort(protocol: RemoteFileProtocol): number {
  if (protocol === 'sftp') return 22;
  return 21;
}

const REMOTE_FILE_ENCODING_OPTIONS: { value: RemoteFileEncoding; labelKey: string }[] = [
  { value: 'utf8', labelKey: 'settings.remoteFileEncodingUtf8' },
  { value: 'euc-kr', labelKey: 'settings.remoteFileEncodingEucKr' },
  { value: 'cp949', labelKey: 'settings.remoteFileEncodingCp949' },
  { value: 'utf16le', labelKey: 'settings.remoteFileEncodingUtf16le' },
  { value: 'latin1', labelKey: 'settings.remoteFileEncodingLatin1' },
  { value: 'ascii', labelKey: 'settings.remoteFileEncodingAscii' },
];

function normalizeRemoteFileEncoding(value: unknown): RemoteFileEncoding {
  return REMOTE_FILE_ENCODING_OPTIONS.some((option) => option.value === value) ? (value as RemoteFileEncoding) : 'utf8';
}

function normalizeTerminalRestoreSettings(settings?: Partial<TerminalRestoreSettings>): TerminalRestoreSettings {
  return {
    ...DEFAULT_TERMINAL_RESTORE_SETTINGS,
    ...(settings ?? {}),
  };
}

function createBlankRemoteFileProfile(protocol: RemoteFileProtocol = 'ftp'): RemoteFileProfile {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: '',
    groupId: '',
    protocol,
    host: '',
    port: defaultRemoteFilePort(protocol),
    username: '',
    password: '',
    privateKeyPath: '',
    passphrase: '',
    connectTimeoutMs: DEFAULT_REMOTE_TIMEOUT_MS,
    rootPath: '/',
    encoding: 'utf8',
    createdAt: now,
    updatedAt: now,
  };
}

function createBlankLocalProfile(shell: ShellKind = 'powershell'): LocalTerminalProfile {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: '',
    groupId: '',
    shell,
    cwd: '',
    localCliAgentId: 'default',
    environmentText: '',
    initialCommand: '',
    createdAt: now,
    updatedAt: now,
  };
}

function createBlankTerminalGroup(): TerminalProfileGroup {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: '',
    createdAt: now,
    updatedAt: now,
  };
}

function createBlankWindowSizerPreset(bounds?: Partial<WindowBounds>): WindowSizerPreset {
  const now = Date.now();
  const width = Number.isFinite(bounds?.width) ? Number(bounds?.width) : 1280;
  const height = Number.isFinite(bounds?.height) ? Number(bounds?.height) : 720;
  return {
    id: crypto.randomUUID(),
    name: `${width}x${height}`,
    group: '',
    width,
    height,
    moveToPosition: Boolean(bounds),
    x: Number.isFinite(bounds?.x) ? Number(bounds?.x) : 0,
    y: Number.isFinite(bounds?.y) ? Number(bounds?.y) : 0,
    coordinateMode: bounds ? 'absolute' : 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: false,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeWindowSizerNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

function normalizeWindowSizerPresets(presets: WindowSizerPreset[] | undefined): WindowSizerPreset[] {
  if (!Array.isArray(presets)) return [];
  return presets.map((preset) => {
    const base = createBlankWindowSizerPreset();
    const width = normalizeWindowSizerNumber(preset.width, 320, 7680, base.width);
    const height = normalizeWindowSizerNumber(preset.height, 240, 4320, base.height);
    return {
      ...base,
      ...preset,
      id: String(preset.id || crypto.randomUUID()),
      name: String(preset.name || `${width}x${height}`),
      group: String(preset.group ?? ''),
      width,
      height,
      moveToPosition: preset.moveToPosition === true,
      x: normalizeWindowSizerNumber(preset.x, -100000, 100000, 0),
      y: normalizeWindowSizerNumber(preset.y, -100000, 100000, 0),
      coordinateMode: preset.coordinateMode === 'absolute' ? 'absolute' : 'active-display-workarea',
      allowOutsideDisplay: preset.allowOutsideDisplay === true,
      builtin: preset.builtin === true,
    };
  });
}

function normalizeLocalCliSelection(value: unknown): LocalTerminalCliSelection {
  const raw = String(value ?? 'default');
  if (raw === 'default' || raw === 'none') return raw;
  return raw as LocalCliAgentId;
}

function normalizeTerminalGroups(groups: TerminalProfileGroup[] | undefined): TerminalProfileGroup[] {
  if (!Array.isArray(groups)) return [];
  return groups.map((group) => ({
    ...createBlankTerminalGroup(),
    ...group,
    id: String(group.id || crypto.randomUUID()),
    name: String(group.name ?? ''),
  }));
}

function normalizeRemoteProfiles(profiles: RemoteTerminalProfile[] | undefined): RemoteTerminalProfile[] {
  if (!Array.isArray(profiles)) return [];
  return profiles.map((profile) => ({
    ...createBlankRemoteProfile(profile.protocol === 'telnet' ? 'telnet' : 'ssh'),
    ...profile,
    id: String(profile.id || crypto.randomUUID()),
    groupId: String(profile.groupId ?? ''),
    protocol: profile.protocol === 'telnet' ? 'telnet' : 'ssh',
    host: String(profile.host ?? ''),
    port: Number.isFinite(profile.port)
      ? profile.port
      : defaultRemotePort(profile.protocol === 'telnet' ? 'telnet' : 'ssh'),
    username: String(profile.username ?? ''),
    password: String(profile.password ?? ''),
    privateKeyPath: String(profile.privateKeyPath ?? ''),
    passphrase: String(profile.passphrase ?? ''),
    connectTimeoutMs: Number.isFinite(profile.connectTimeoutMs) ? profile.connectTimeoutMs : DEFAULT_REMOTE_TIMEOUT_MS,
    initialCommand: String(profile.initialCommand ?? ''),
  }));
}

function normalizeRemoteFileProfiles(profiles: RemoteFileProfile[] | undefined): RemoteFileProfile[] {
  if (!Array.isArray(profiles)) return [];
  return profiles.map((profile) => {
    const protocol: RemoteFileProtocol =
      profile.protocol === 'sftp' || profile.protocol === 'ftps' ? profile.protocol : 'ftp';
    return {
      ...createBlankRemoteFileProfile(protocol),
      ...profile,
      id: String(profile.id || crypto.randomUUID()),
      name: String(profile.name ?? ''),
      groupId: String(profile.groupId ?? ''),
      protocol,
      host: String(profile.host ?? ''),
      port: Number.isFinite(profile.port) ? profile.port : defaultRemoteFilePort(protocol),
      username: String(profile.username ?? ''),
      password: String(profile.password ?? ''),
      privateKeyPath: String(profile.privateKeyPath ?? ''),
      passphrase: String(profile.passphrase ?? ''),
      connectTimeoutMs: Number.isFinite(profile.connectTimeoutMs)
        ? profile.connectTimeoutMs
        : DEFAULT_REMOTE_TIMEOUT_MS,
      rootPath: String(profile.rootPath || '/'),
      encoding: normalizeRemoteFileEncoding(profile.encoding),
    };
  });
}

function buildRemoteProfileSettingsSnapshot(
  remoteTerminals: RemoteTerminalSettings,
  remoteFiles: RemoteFileSettings,
): string {
  return JSON.stringify({
    remoteTerminalSettings: remoteTerminals,
    remoteFileSettings: remoteFiles,
  });
}

function normalizeLocalProfiles(
  profiles: LocalTerminalProfile[] | undefined,
  fallbackShell: ShellKind = 'powershell',
): LocalTerminalProfile[] {
  if (!Array.isArray(profiles)) return [];
  return profiles.map((profile) => {
    const shell = KNOWN_LOCAL_SHELL_KINDS.has(profile.shell) ? profile.shell : fallbackShell;
    return {
      ...createBlankLocalProfile(shell),
      ...profile,
      id: String(profile.id || crypto.randomUUID()),
      name: String(profile.name ?? ''),
      groupId: String(profile.groupId ?? ''),
      shell,
      cwd: String(profile.cwd ?? ''),
      localCliAgentId: normalizeLocalCliSelection(profile.localCliAgentId),
      environmentText: String(profile.environmentText ?? ''),
      initialCommand: String(profile.initialCommand ?? ''),
    };
  });
}

function cls(...parts: (string | false | undefined | null)[]) {
  return parts.filter(Boolean).join(' ');
}

function parsePort(val: string): number | null {
  const n = parseInt(val, 10);
  if (!Number.isInteger(n) || n < PORT_MIN || n > PORT_MAX) return null;
  return n;
}

function getStoredXamongToken(): string {
  try {
    return localStorage.getItem('xamongToken') ?? '';
  } catch {
    return '';
  }
}

function isPlainJsonObjectText(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function isSettingsPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function countGowooriSportsStandingsRowArray(value: unknown, headerLikely = false): number {
  if (!Array.isArray(value)) return 0;
  if (value.length === 0) return 0;
  if (value.every((item) => isSettingsPlainRecord(item))) return value.length;
  if (value.every(Array.isArray)) return Math.max(0, value.length - (headerLikely ? 1 : 0));
  return 0;
}

function countGowooriSportsStandingsRows(payload: unknown): number {
  if (Array.isArray(payload)) return countGowooriSportsStandingsRowArray(payload);
  if (!isSettingsPlainRecord(payload)) return 0;

  const data = isSettingsPlainRecord(payload.data) ? payload.data : null;
  const result = isSettingsPlainRecord(payload.result) ? payload.result : null;
  const standings = isSettingsPlainRecord(payload.standings) ? payload.standings : null;
  const table = isSettingsPlainRecord(payload.table) ? payload.table : null;

  return Math.max(
    countGowooriSportsStandingsRowArray(payload.rows),
    countGowooriSportsStandingsRowArray(payload.gridData, true),
    countGowooriSportsStandingsRowArray(payload.standings),
    countGowooriSportsStandingsRowArray(data?.rows),
    countGowooriSportsStandingsRowArray(data?.gridData, true),
    countGowooriSportsStandingsRowArray(result?.rows),
    countGowooriSportsStandingsRowArray(result?.gridData, true),
    countGowooriSportsStandingsRowArray(standings?.rows),
    countGowooriSportsStandingsRowArray(standings?.gridData, true),
    countGowooriSportsStandingsRowArray(table?.rows),
    countGowooriSportsStandingsRowArray(table?.gridData, true),
  );
}

function buildGowooriSportsStandingsTestUrl(endpoint: string): string {
  const trimmed = endpoint.trim();
  const url = new URL(trimmed, window.location.origin);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Endpoint must use http or https.');
  }
  url.searchParams.set('league', 'KBO');
  url.searchParams.set('sport', 'baseball');
  url.searchParams.set('intent', 'ranking-table');
  url.searchParams.set('prompt', 'Gowoori sports standings endpoint smoke test');
  return url.toString();
}

function getSettingsErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'Request timed out.';
    return error.message;
  }
  return String(error || 'Unknown error');
}

const HERMES_PROVIDER_ROOT = 'providers/hermes';
const HERMES_GATEWAY_PLUGIN_PATH = 'providers/hermes/plugins/xenesis_desk_gateway';
const HERMES_BOT_PLATFORM_PLUGIN_PATH = 'providers/hermes/plugins/platforms/xenesis_desk_bot';
const HERMES_E2E_BOT_PATH = 'providers/hermes/plugins/xenesis_desk_gateway/e2e_bot';

type SettingsRunModelMode = 'xamong' | 'hermes' | 'local' | 'byok';
type SettingsXenesisTab = 'connections' | 'agent' | 'gateway' | 'external-bots' | 'gowoori';
type SettingsInterfaceTab = 'language' | 'appearance' | 'keyboard-shortcuts' | 'window-sizer';
type SettingsInfoTab = 'general' | 'secret-vault' | 'settings-backup';

type SettingsOpenTargetDetail = {
  category?: unknown;
  mode?: unknown;
  section?: unknown;
  focusConnectionId?: unknown;
  ensureVisible?: unknown;
  selectedTerminalProfileId?: unknown;
  pendingLocalTerminalProfile?: unknown;
  expiresAt?: number;
  nonce?: number;
};

type AppSettingsChangedDetail = Partial<AppSettings> & {
  selectedTerminalProfileId?: unknown;
  selectedRemoteFileProfileId?: unknown;
};

function normalizeSettingsTargetCategory(value: unknown): SettingsCategoryId | null {
  const category = typeof value === 'string' ? value.trim() : '';
  if (category === 'ai-provider') return 'run-model';
  if (category === 'xenesis' || category === 'xenis') return 'xenesis-agent';
  if (category === 'ui') return 'interface';
  if (category === 'information') return 'info';
  const normalized = category;
  return SETTINGS_CATEGORIES.some((item) => item.id === normalized) ? (normalized as SettingsCategoryId) : null;
}

function getInterfaceTabForCategory(category: SettingsCategoryId | null): SettingsInterfaceTab | null {
  if (
    category === 'language' ||
    category === 'appearance' ||
    category === 'keyboard-shortcuts' ||
    category === 'window-sizer'
  ) {
    return category;
  }
  return null;
}

function getInfoTabForCategory(category: SettingsCategoryId | null): SettingsInfoTab | null {
  if (category === 'general' || category === 'secret-vault' || category === 'settings-backup') {
    return category;
  }
  if (category === 'about') {
    return 'general';
  }
  return null;
}

function normalizeInterfaceTab(value: unknown): SettingsInterfaceTab | null {
  const mode = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (mode === 'language' || mode === 'locale') return 'language';
  if (mode === 'appearance' || mode === 'theme' || mode === 'display') return 'appearance';
  if (mode === 'keyboard-shortcuts' || mode === 'shortcuts' || mode === 'keyboard') return 'keyboard-shortcuts';
  if (mode === 'window-sizer' || mode === 'window-size' || mode === 'window') return 'window-sizer';
  return null;
}

function normalizeInfoTab(value: unknown): SettingsInfoTab | null {
  const mode = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (mode === 'general' || mode === 'basic' || mode === 'basic-info' || mode === 'about') return 'general';
  if (mode === 'secret-vault' || mode === 'secret' || mode === 'secrets') return 'secret-vault';
  if (mode === 'settings-backup' || mode === 'backup') return 'settings-backup';
  return null;
}

function normalizeRunModelMode(value: unknown): SettingsRunModelMode | null {
  const mode = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (mode === 'xamong' || mode === 'xamongcode' || mode === 'xamong-code') return 'xamong';
  if (mode === 'hermes' || mode === 'hermes-plugin' || mode === 'plugin-hermes') return 'hermes';
  if (mode === 'local' || mode === 'local-cli' || mode === 'cli') return 'local';
  if (mode === 'byok') return 'byok';
  return null;
}

function normalizeXenesisTab(value: unknown): SettingsXenesisTab | null {
  const mode = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (mode === 'connections' || mode === 'connection-center' || mode === 'onboarding') return 'connections';
  if (mode === 'xenesis' || mode === 'xenis' || mode === 'agent' || mode === 'xenesis-agent') return 'agent';
  if (mode === 'gateway' || mode === 'gateway-control' || mode === 'xenesis-gateway') return 'gateway';
  if (mode === 'external-bots' || mode === 'external-bot' || mode === 'external-bot-channels' || mode === 'bots')
    return 'external-bots';
  if (mode === 'gowoori' || mode === 'gowoori-agent' || mode === 'gowoori-agent-settings') return 'gowoori';
  return null;
}

function normalizeSettingsTargetSection(value: unknown): string {
  const section = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (section === 'overview' || section === 'top') return 'default';
  if (section === 'connections' || section === 'connection-center' || section === 'onboarding')
    return 'xenesis-connections';
  if (section === 'runtime' || section === 'xenesis') return 'xenesis-runtime';
  if (section === 'gateway' || section === 'gateway-control' || section === 'xenesis-gateway') return 'xenesis-gateway';
  if (section === 'external-bots' || section === 'external-bot') return 'external-bot-channels';
  if (section === 'gowoori' || section === 'gowoori-agent-settings') return 'gowoori-agent';
  if (section === 'xamong' || section === 'xamongcode') return 'xamong-runtime';
  if (section === 'hermes' || section === 'hermes-plugin' || section === 'hermes-provider') return 'hermes-provider';
  if (section === 'local') return 'local-cli';
  if (section === 'byok') return 'byok-provider';
  if (section === 'language' || section === 'settings-language') return 'settings-language';
  if (section === 'appearance' || section === 'theme') return 'settings-appearance';
  if (section === 'keyboard-shortcuts' || section === 'shortcuts') return 'settings-keyboard-shortcuts';
  if (section === 'window-sizer' || section === 'window-size') return 'settings-window-sizer';
  if (section === 'general' || section === 'basic-info' || section === 'about') return 'settings-basic-info';
  if (section === 'secret-vault' || section === 'secrets') return 'settings-secret-vault';
  if (section === 'settings-backup' || section === 'backup') return 'settings-backup';
  return section;
}

function findXenesisConnectionElement(connectionId: string): HTMLElement | null {
  const normalizedId = connectionId.trim();
  if (!normalizedId) return null;
  for (const element of document.querySelectorAll<HTMLElement>('[data-xenesis-connection]')) {
    if (element.dataset.xenesisConnection === normalizedId) return element;
  }
  return null;
}

function getRunModelModeForSection(section: string): SettingsRunModelMode | null {
  if (section === 'xamong-runtime') return 'xamong';
  if (section === 'hermes-provider') return 'hermes';
  if (section === 'local-cli') return 'local';
  if (section === 'byok-provider') return 'byok';
  return null;
}

function getXenesisTabForSection(section: string): SettingsXenesisTab | null {
  if (section === 'xenesis-connections') return 'connections';
  if (section === 'xenesis-runtime') return 'agent';
  if (section === 'xenesis-gateway') return 'gateway';
  if (section === 'external-bot-channels') return 'external-bots';
  if (section === 'gowoori-agent') return 'gowoori';
  return null;
}

function getInterfaceTabForSection(section: string): SettingsInterfaceTab | null {
  if (section === 'settings-language') return 'language';
  if (section === 'settings-appearance') return 'appearance';
  if (section === 'settings-keyboard-shortcuts') return 'keyboard-shortcuts';
  if (section === 'settings-window-sizer') return 'window-sizer';
  return null;
}

function getInfoTabForSection(section: string): SettingsInfoTab | null {
  if (section === 'settings-basic-info') return 'general';
  if (section === 'settings-secret-vault') return 'secret-vault';
  if (section === 'settings-backup') return 'settings-backup';
  return null;
}

function normalizeAiProvider(raw?: Partial<AiProviderSettings>): AiProviderSettings {
  const provider = raw?.provider && AI_PROVIDERS[raw.provider] ? raw.provider : DEFAULT_AI_PROVIDER.provider;
  const meta = AI_PROVIDERS[provider];
  return {
    ...DEFAULT_AI_PROVIDER,
    ...raw,
    provider,
    model: raw?.model || meta.defaultModel,
    baseUrl: raw?.baseUrl ?? meta.defaultBaseUrl,
    xcAgentApiUrl: raw?.xcAgentApiUrl || '',
    xcApiUrl: raw?.xcApiUrl || '',
    labApiUrl: raw?.labApiUrl || DEFAULT_LAB_API_URL,
  };
}

function createAiProviderProfileId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createAiProviderProfile(settings: AiProviderSettings, index: number): AiProviderProfile {
  const normalized = normalizeAiProvider(settings);
  const now = Date.now();
  return {
    id: index === 0 ? DEFAULT_AI_PROVIDER_PROFILE_ID : createAiProviderProfileId(),
    name: index === 0 ? 'Default OpenAI' : `${AI_PROVIDERS[normalized.provider].shortLabel} ${index + 1}`,
    settings: normalized,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeAiProviderProfilesForPane(
  rawProfiles: AiProviderProfile[] | undefined,
  activeProfileId: string | undefined,
  fallbackSettings: AiProviderSettings,
): { profiles: AiProviderProfile[]; activeId: string; activeSettings: AiProviderSettings } {
  const profiles = Array.isArray(rawProfiles)
    ? rawProfiles.map((profile, index) => ({
        id: profile.id || (index === 0 ? DEFAULT_AI_PROVIDER_PROFILE_ID : createAiProviderProfileId()),
        name: profile.name || `${AI_PROVIDERS[normalizeAiProvider(profile.settings).provider].shortLabel} ${index + 1}`,
        settings: normalizeAiProvider(profile.settings),
        createdAt: Number.isFinite(profile.createdAt) ? profile.createdAt : 0,
        updatedAt: Number.isFinite(profile.updatedAt) ? profile.updatedAt : 0,
      }))
    : [];

  if (!profiles.length) {
    profiles.push(createAiProviderProfile(fallbackSettings, 0));
  }

  const active = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
  return {
    profiles,
    activeId: active.id,
    activeSettings: normalizeAiProvider(active.settings),
  };
}

export default function SettingsPane() {
  const { t, locale, setLocale, availableLocales } = useI18n();

  const getCatTitle = (id: string): string => {
    const category = SETTINGS_CATEGORIES.find((item) => item.id === id);
    return category ? t(category.titleKey) : id;
  };

  const getCatDesc = (id: string): string => {
    const category = SETTINGS_CATEGORIES.find((item) => item.id === id);
    return category ? t(category.descriptionKey) : '';
  };

  const getProviderLabel = (provider: AiProviderKind): string =>
    provider === 'ollama' ? t('app.ollamaLocal') : AI_PROVIDERS[provider].label;

  const getLocaleIcon = (value: string): string => {
    const normalized = value.toLowerCase();
    if (normalized.startsWith('ko')) return '文';
    if (normalized.startsWith('en')) return 'A';
    return normalized.slice(0, 2).toUpperCase();
  };

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('info');
  const [runMode, setRunMode] = useState<SettingsRunModelMode>('byok');
  const [xenesisTab, setXenesisTab] = useState<SettingsXenesisTab>('agent');
  const [focusedXenesisConnectionId, setFocusedXenesisConnectionId] = useState('');
  const [interfaceTab, setInterfaceTab] = useState<SettingsInterfaceTab>('language');
  const [infoTab, setInfoTab] = useState<SettingsInfoTab>('general');
  const [xenisPhase5Enabled, setXenisPhase5Enabled] = useState(false);
  const [draftLocale, setDraftLocale] = useState(locale);

  const [theme, setTheme] = useState<ThemeName>('dark');
  const [fontSize, setFontSize] = useState(14);
  const [defaultShell, setDefaultShell] = useState<ShellKind>('powershell');
  const [shells, setShells] = useState<ShellDescriptor[]>([]);
  const [defaultCwd, setDefaultCwd] = useState('');
  const [terminalGroups, setTerminalGroups] = useState<TerminalProfileGroup[]>([]);
  const [remoteProfiles, setRemoteProfiles] = useState<RemoteTerminalProfile[]>([]);
  const [localProfiles, setLocalProfiles] = useState<LocalTerminalProfile[]>([]);
  const [selectedTerminalProfileId, setSelectedTerminalProfileId] = useState('');
  const [remoteFileGroups, setRemoteFileGroups] = useState<TerminalProfileGroup[]>([]);
  const [remoteFileProfiles, setRemoteFileProfiles] = useState<RemoteFileProfile[]>([]);
  const [selectedRemoteFileProfileId, setSelectedRemoteFileProfileId] = useState('');
  const [remoteFileTesting, setRemoteFileTesting] = useState(false);
  const [remoteFileTestMessage, setRemoteFileTestMessage] = useState('');
  const [windowSizerPresets, setWindowSizerPresets] = useState<WindowSizerPreset[]>([]);
  const [selectedWindowSizerPresetId, setSelectedWindowSizerPresetId] = useState('');
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>({
    currentPath: '',
    recent: [],
    autoRestore: false,
  });
  const [terminalRestoreSettings, setTerminalRestoreSettings] = useState<TerminalRestoreSettings>(
    DEFAULT_TERMINAL_RESTORE_SETTINGS,
  );
  const [keyboardShortcutBindings, setKeyboardShortcutBindings] = useState<CommandShortcutBinding[]>([]);
  const [keyboardShortcutQuery, setKeyboardShortcutQuery] = useState('');
  const [extensionInfos, setExtensionInfos] = useState<ExtensionInfo[]>([]);
  const [extensionBusy, setExtensionBusy] = useState(false);
  const [extensionMessage, setExtensionMessage] = useState('');
  const [mcpStatus, setMcpStatus] = useState<McpSettingsStatus | null>(null);
  const [mcpStatusBusy, setMcpStatusBusy] = useState(false);
  const [mcpStatusError, setMcpStatusError] = useState('');
  const [xenesisConnectionsStatus, setXenesisConnectionsStatus] = useState<XenesisConnectionsStatus | null>(null);
  const [xenesisConnectionsBusy, setXenesisConnectionsBusy] = useState(false);
  const [xenesisConnectionsError, setXenesisConnectionsError] = useState('');
  const [secretVaultMode, setSecretVaultMode] = useState<SecretVaultStorageMode>('plain');
  const [secretVaultStatus, setSecretVaultStatus] = useState<SecretVaultStatus | null>(null);
  const [secretVaultBusy, setSecretVaultBusy] = useState(false);
  const [secretVaultMessage, setSecretVaultMessage] = useState('');
  const [settingsBackupBusy, setSettingsBackupBusy] = useState(false);
  const [settingsBackupMessage, setSettingsBackupMessage] = useState('');
  const [settingsBackupItems, setSettingsBackupItems] = useState<SettingsBackupListItem[]>([]);
  const [showRemotePassword, setShowRemotePassword] = useState(false);
  const [showRemotePassphrase, setShowRemotePassphrase] = useState(false);
  const [captureDir, setCaptureDir] = useState('');
  const [aiProvider, setAiProvider] = useState<AiProviderSettings>(DEFAULT_AI_PROVIDER);
  const [aiProviderProfiles, setAiProviderProfiles] = useState<AiProviderProfile[]>([
    createAiProviderProfile(DEFAULT_AI_PROVIDER, 0),
  ]);
  const [activeAiProviderProfileId, setActiveAiProviderProfileId] = useState(DEFAULT_AI_PROVIDER_PROFILE_ID);
  const [aiProviderTesting, setAiProviderTesting] = useState(false);
  const [aiProviderTestMessage, setAiProviderTestMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [gowooriChatSportsStandingsEndpoint, setGowooriChatSportsStandingsEndpoint] = useState('');
  const [gowooriSportsStandingsEndpointTesting, setGowooriSportsStandingsEndpointTesting] = useState(false);
  const [gowooriSportsStandingsEndpointTestMessage, setGowooriSportsStandingsEndpointTestMessage] = useState('');
  const [localCliAgents, setLocalCliAgents] = useState<LocalCliAgentStatus[]>([]);
  const [localCliBusy, setLocalCliBusy] = useState(false);
  const [localCliSelectedId, setLocalCliSelectedId] = useState<LocalCliAgentId>(DEFAULT_LOCAL_CLI_AGENT);
  const [localCliAutoConfigure, setLocalCliAutoConfigure] = useState(true);
  const [externalAppProfiles, setExternalAppProfiles] = useState<ExternalAppProfile[]>([]);
  const [externalAppsEnabled, setExternalAppsEnabled] = useState(true);
  const [providerIntegrationStatus, setProviderIntegrationStatus] = useState<ProviderIntegrationStatus | null>(null);
  const [providerIntegrationBusy, setProviderIntegrationBusy] = useState(false);
  const [providerIntegrationMessage, setProviderIntegrationMessage] = useState('');
  const [hermesInstallRoot, setHermesInstallRoot] = useState('');
  const [hermesInstalling, setHermesInstalling] = useState(false);
  const [cliIntegrationBusyTarget, setCliIntegrationBusyTarget] = useState<ProviderIntegrationCliTargetId | ''>('');

  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>({
    defaultMode: 'stream',
    streamFilterProfile: 'auto',
    autoSend: false,
    defaultStage: 1,
    regexRules: [],
    llmApiKey: '',
    llmModel: 'gpt-4.1-mini',
    extraDangerPatterns: [],
  });

  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);

  const [xamongStatus, setXamongStatus] = useState<XamongCodeServerStatus>({
    running: false,
    host: DEFAULT_XAMONG_CODE_HOST,
    port: DEFAULT_XAMONG_CODE_PORT,
    url: `http://${DEFAULT_XAMONG_CODE_HOST}:${DEFAULT_XAMONG_CODE_PORT}`,
    runtimePath: '',
    configDir: DEFAULT_XAMONG_CODE_CONFIG_DIR,
    workspacesConfigPath: '',
    openAiModel: '',
    directGeneralChat: true,
    directChatModel: '',
    workerTierPolicies: '',
    hasOpenAiApiKey: false,
    managed: false,
  });
  const [xamongBusy, setXamongBusy] = useState(false);
  const [xamongRuntimePath, setXamongRuntimePath] = useState('');
  const [xamongConfigDir, setXamongConfigDir] = useState(DEFAULT_XAMONG_CODE_CONFIG_DIR);
  const [xamongAutoStart, setXamongAutoStart] = useState(true);
  const [xamongPortStr, setXamongPortStr] = useState(String(DEFAULT_XAMONG_CODE_PORT));
  const [xamongPortError, setXamongPortError] = useState('');
  const [xamongOpenAiApiKey, setXamongOpenAiApiKey] = useState('');
  const [xamongOpenAiModel, setXamongOpenAiModel] = useState('');
  const [xamongWorkspacesConfigPath, setXamongWorkspacesConfigPath] = useState('');
  const [xamongDirectGeneralChat, setXamongDirectGeneralChat] = useState(true);
  const [xamongDirectChatModel, setXamongDirectChatModel] = useState('');
  const [xamongWorkerTierPolicies, setXamongWorkerTierPolicies] = useState('');
  const [xamongWorkerTierPoliciesError, setXamongWorkerTierPoliciesError] = useState('');
  const [xamongWorkerStatus, setXamongWorkerStatus] = useState<XamongInteractiveWorkerStatus | null>(null);
  const [xamongWorkerBusy, setXamongWorkerBusy] = useState(false);
  const [xamongWorkerError, setXamongWorkerError] = useState('');
  const [xenesisEnabled, setXenesisEnabled] = useState(true);
  const [xenesisRuntimeMode, setXenesisRuntimeMode] = useState<XenesisRuntimeMode>('embedded');
  const [xenesisRuntimePath, setXenesisRuntimePath] = useState('');
  const [xenesisAutoStart, setXenesisAutoStart] = useState(false);
  const [xenesisGatewayEnabled, setXenesisGatewayEnabled] = useState(false);
  const [xenesisGatewayAutoStart, setXenesisGatewayAutoStart] = useState(false);
  const [xenesisGatewayDevToken, setXenesisGatewayDevToken] = useState('');
  const [xenesisHost, setXenesisHost] = useState(DEFAULT_XENESIS_GATEWAY_HOST);
  const [xenesisPortStr, setXenesisPortStr] = useState(String(DEFAULT_XENESIS_GATEWAY_PORT));
  const [xenesisPortError, setXenesisPortError] = useState('');
  const [xenesisApprovalMode, setXenesisApprovalMode] = useState<XenesisApprovalMode>('safe');
  const [xenesisMaxTurnsStr, setXenesisMaxTurnsStr] = useState(String(DEFAULT_XENESIS_MAX_TURNS));
  const [xenesisModel, setXenesisModel] = useState('');
  const [xenesisProfile, setXenesisProfile] = useState('');
  const [xenesisProfileState, setXenesisProfileState] = useState<XenesisProfileState | null>(null);
  const [xenesisProfileBusy, setXenesisProfileBusy] = useState(false);
  const [xenesisProfileError, setXenesisProfileError] = useState('');
  const [xenesisMcpEnabled, setXenesisMcpEnabled] = useState(true);
  const [xenesisExternalBotChannels, setXenesisExternalBotChannels] = useState<XenesisProfileChannelSettings>(() =>
    cloneXenesisProfileChannelSettings(),
  );
  const [xenesisExternalBotSaving, setXenesisExternalBotSaving] = useState(false);
  const [xenesisExternalBotTesting, setXenesisExternalBotTesting] = useState<XenesisProfileChannelName | null>(null);
  const [xenesisExternalBotMessage, setXenesisExternalBotMessage] = useState('');
  const [hermesProviderMessage, setHermesProviderMessage] = useState('');
  const [xenesisGatewayStatus, setXenesisGatewayStatus] = useState<XenesisStatus | null>(null);
  const [xenesisGatewayBusy, setXenesisGatewayBusy] = useState(false);
  const [xenesisGatewayMessage, setXenesisGatewayMessage] = useState('');

  // ── 사용자 프로필 상태 ────────────────────────────────────────────────────────
  const [profileUser, setProfileUser] = useState<AuthUser | null>(null);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileId, setProfileId] = useState('');
  const [profilePlan, setProfilePlan] = useState('');
  const [profileToken, setProfileToken] = useState('');
  const [profileShowToken, setProfileShowToken] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [saved, setSaved] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState('');
  const [loading, setLoading] = useState(true);
  const [updaterSettings, setUpdaterSettings] = useState<UpdaterSettings>(DEFAULT_UPDATER_SETTINGS);
  const [updStatus, setUpdStatus] = useState<UpdaterStatus>(DEFAULT_UPDATER_STATUS);
  const [updBusy, setUpdBusy] = useState(false);
  const xamongPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCategoryRef = useRef<SettingsCategoryId>('info');
  const interfaceTabRef = useRef<SettingsInterfaceTab>('language');
  const selectedWindowSizerPresetIdRef = useRef('');
  const remoteProfileSettingsLoadedRef = useRef(false);
  const remoteProfileSettingsSnapshotRef = useRef('');
  const remoteProfileSettingsDirtyRef = useRef(false);
  const xenesisConnectionFocusTimeoutRef = useRef<number | null>(null);

  const markRemoteProfileSettingsDirty = useCallback(() => {
    remoteProfileSettingsDirtyRef.current = true;
  }, []);

  useEffect(() => {
    setDraftLocale(locale);
  }, [locale]);

  useEffect(
    () => () => {
      if (xenesisConnectionFocusTimeoutRef.current !== null) {
        window.clearTimeout(xenesisConnectionFocusTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    window.terminalAPI
      .listShells()
      .then(setShells)
      .catch(() => setShells(FALLBACK_SHELL_DESCRIPTORS));
  }, []);

  const shellOptions = useMemo(() => {
    const descriptors = shells.length > 0 ? shells : FALLBACK_SHELL_DESCRIPTORS;
    return descriptors.map((shell) => ({
      value: shell.kind,
      label: shell.label,
      available: shell.available,
    }));
  }, [shells]);

  const applySettingsToState = useCallback((s: AppSettings) => {
    const normalizedAi = normalizeAiProvider(s.aiProvider);
    const normalizedAiProfileState = normalizeAiProviderProfilesForPane(
      s.aiProviderProfiles,
      s.activeAiProviderProfileId,
      normalizedAi,
    );
    setSettings(s);
    const phase5Enabled = isXenisPhase5EnabledFromSettings(s);
    setXenisPhase5Enabled(phase5Enabled);
    if (!phase5Enabled) {
      setRunMode((current) => (current === 'xamong' ? 'byok' : current));
    }
    setTheme(s.theme ?? 'dark');
    setFontSize(s.fontSize ?? 14);
    const normalizedDefaultShell = s.defaultShell ?? 'powershell';
    setDefaultShell(normalizedDefaultShell);
    setDefaultCwd(s.defaultCwd ?? '');
    const normalizedGroups = normalizeTerminalGroups(s.remoteTerminals?.groups);
    const normalizedRemoteProfiles = normalizeRemoteProfiles(s.remoteTerminals?.profiles);
    const normalizedLocalProfiles = normalizeLocalProfiles(s.remoteTerminals?.localProfiles, normalizedDefaultShell);
    const normalizedRemoteFileGroups = normalizeTerminalGroups(s.remoteFiles?.groups);
    const normalizedRemoteFileProfiles = normalizeRemoteFileProfiles(s.remoteFiles?.profiles);
    const normalizedRemoteTerminalSettings = {
      groups: normalizedGroups,
      profiles: normalizedRemoteProfiles,
      localProfiles: normalizedLocalProfiles,
    };
    const normalizedRemoteFileSettings = {
      groups: normalizedRemoteFileGroups,
      profiles: normalizedRemoteFileProfiles,
    };
    remoteProfileSettingsLoadedRef.current = true;
    remoteProfileSettingsDirtyRef.current = false;
    remoteProfileSettingsSnapshotRef.current = buildRemoteProfileSettingsSnapshot(
      normalizedRemoteTerminalSettings,
      normalizedRemoteFileSettings,
    );
    const normalizedWindowSizerPresets = normalizeWindowSizerPresets(s.windowSizer?.presets);
    const normalizedWorkspaceSettings: WorkspaceSettings = {
      currentPath: s.workspace?.currentPath ?? '',
      recent: Array.isArray(s.workspace?.recent) ? s.workspace.recent : [],
      autoRestore: s.workspace?.autoRestore === true,
    };
    setTerminalGroups(normalizedRemoteTerminalSettings.groups);
    setRemoteProfiles(normalizedRemoteTerminalSettings.profiles);
    setLocalProfiles(normalizedRemoteTerminalSettings.localProfiles);
    setSelectedTerminalProfileId((current) =>
      current &&
      (normalizedRemoteProfiles.some((profile) => `remote:${profile.id}` === current) ||
        normalizedLocalProfiles.some((profile) => `local:${profile.id}` === current))
        ? current
        : normalizedLocalProfiles[0]
          ? `local:${normalizedLocalProfiles[0].id}`
          : normalizedRemoteProfiles[0]
            ? `remote:${normalizedRemoteProfiles[0].id}`
            : '',
    );
    setRemoteFileGroups(normalizedRemoteFileSettings.groups);
    setRemoteFileProfiles(normalizedRemoteFileSettings.profiles);
    setSelectedRemoteFileProfileId((current) =>
      current && normalizedRemoteFileProfiles.some((profile) => profile.id === current)
        ? current
        : (normalizedRemoteFileProfiles[0]?.id ?? ''),
    );
    setRemoteFileTestMessage('');
    setWindowSizerPresets(normalizedWindowSizerPresets);
    setWorkspaceSettings(normalizedWorkspaceSettings);
    setTerminalRestoreSettings(normalizeTerminalRestoreSettings(s.terminalRestore));
    setKeyboardShortcutBindings(normalizeCommandShortcutBindings(s.keyboardShortcuts?.bindings));
    setSelectedWindowSizerPresetId((current) =>
      current && normalizedWindowSizerPresets.some((preset) => preset.id === current)
        ? current
        : (normalizedWindowSizerPresets[0]?.id ?? ''),
    );
    setCaptureDir(s.captureDir ?? '');
    setAiProviderProfiles(normalizedAiProfileState.profiles);
    setActiveAiProviderProfileId(normalizedAiProfileState.activeId);
    setAiProvider(normalizedAiProfileState.activeSettings);
    setGowooriChatSportsStandingsEndpoint(s.gowooriChat?.sportsStandingsEndpoint ?? '');
    setLocalCliSelectedId(s.localCli?.selectedAgentId ?? DEFAULT_LOCAL_CLI_AGENT);
    setLocalCliAutoConfigure(s.localCli?.autoConfigureTerminal ?? true);
    const normalizedExternalApps = normalizeExternalAppSettings(s.externalApps);
    setExternalAppsEnabled(normalizedExternalApps.enabled);
    setExternalAppProfiles(normalizedExternalApps.profiles);
    setApiUrl(s.apiUrl ?? DEFAULT_API_URL);
    setUpdaterSettings(normalizeUpdaterSettings(s.updater));
    setSecretVaultMode(s.secretVault?.mode === 'os-protected' ? 'os-protected' : 'plain');

    setXamongRuntimePath(s.xamongCode?.runtimePath ?? '');
    setXamongConfigDir(s.xamongCode?.configDir ?? DEFAULT_XAMONG_CODE_CONFIG_DIR);
    setXamongAutoStart(s.xamongCode?.autoStart ?? true);
    setXamongPortStr(String(s.xamongCode?.port ?? DEFAULT_XAMONG_CODE_PORT));
    setXamongPortError('');
    setXamongOpenAiApiKey(
      s.xamongCode?.openAiApiKey ?? (normalizedAi.provider === 'openai' ? normalizedAi.apiKey : ''),
    );
    setXamongOpenAiModel(s.xamongCode?.openAiModel ?? (normalizedAi.provider === 'openai' ? normalizedAi.model : ''));
    setXamongWorkspacesConfigPath(s.xamongCode?.workspacesConfigPath ?? '');
    setXamongDirectGeneralChat(s.xamongCode?.directGeneralChat !== false);
    setXamongDirectChatModel(s.xamongCode?.directChatModel ?? '');
    setXamongWorkerTierPolicies(s.xamongCode?.workerTierPolicies ?? '');
    setXamongWorkerTierPoliciesError('');
    setXenesisEnabled(s.xenesis?.enabled !== false);
    setXenesisRuntimeMode(s.xenesis?.runtimeMode === 'externalGateway' ? 'externalGateway' : 'embedded');
    setXenesisRuntimePath(s.xenesis?.runtimePath ?? '');
    setXenesisAutoStart(s.xenesis?.autoStart === true);
    setXenesisGatewayEnabled(s.xenesis?.gateway?.enabled === true || s.xenesis?.runtimeMode === 'externalGateway');
    setXenesisGatewayAutoStart(s.xenesis?.gateway?.autoStart === true);
    setXenesisGatewayDevToken(s.xenesis?.gateway?.devToken ?? '');
    setXenesisHost(s.xenesis?.gateway?.host ?? s.xenesis?.host ?? DEFAULT_XENESIS_GATEWAY_HOST);
    setXenesisPortStr(String(s.xenesis?.gateway?.port ?? s.xenesis?.port ?? DEFAULT_XENESIS_GATEWAY_PORT));
    setXenesisPortError('');
    setXenesisApprovalMode(s.xenesis?.approvalMode ?? 'safe');
    setXenesisMaxTurnsStr(String(s.xenesis?.maxTurns ?? DEFAULT_XENESIS_MAX_TURNS));
    setXenesisModel(s.xenesis?.model ?? '');
    setXenesisProfile(s.xenesis?.profile ?? '');
    setXenesisMcpEnabled(s.xenesis?.mcpEnabled !== false);
    if (s.automation) {
      setAutomationSettings((prev) => ({ ...prev, ...s.automation }));
    }
  }, []);

  useEffect(() => {
    window.terminalAPI
      .getSettings()
      .then(applySettingsToState)
      .catch((error) => {
        setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
      })
      .finally(() => setLoading(false));
  }, [applySettingsToState, t]);

  const loadExtensions = useCallback(async () => {
    const extensions = await window.extensionAPI.list();
    setExtensionInfos(extensions);
  }, []);

  const loadMcpStatus = useCallback(async () => {
    setMcpStatusBusy(true);
    setMcpStatusError('');
    try {
      setMcpStatus(await window.mcpSettingsAPI.status());
    } catch (error) {
      setMcpStatus(null);
      setMcpStatusError(error instanceof Error ? error.message : String(error));
    } finally {
      setMcpStatusBusy(false);
    }
  }, []);

  const loadXenesisConnectionsStatus = useCallback(async () => {
    setXenesisConnectionsBusy(true);
    setXenesisConnectionsError('');
    try {
      setXenesisConnectionsStatus(await window.xenesisAPI.connectionsStatus());
    } catch (error) {
      setXenesisConnectionsStatus(null);
      setXenesisConnectionsError(error instanceof Error ? error.message : String(error));
    } finally {
      setXenesisConnectionsBusy(false);
    }
  }, []);

  const loadProviderIntegrationStatus = useCallback(
    async (hermesRoot = hermesInstallRoot) => {
      setProviderIntegrationBusy(true);
      try {
        const status = await window.providerIntegrationAPI.status({ hermesRoot });
        setProviderIntegrationStatus(status);
      } catch (error) {
        setProviderIntegrationStatus(null);
        setProviderIntegrationMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setProviderIntegrationBusy(false);
      }
    },
    [hermesInstallRoot],
  );

  const loadXenesisProfiles = useCallback(async () => {
    setXenesisProfileBusy(true);
    setXenesisProfileError('');
    try {
      const state = await window.xenesisAPI.profiles();
      setXenesisProfileState(state);
      setXenesisExternalBotChannels(cloneXenesisProfileChannelSettings(state.channelSettings));
      setXenesisProfile((current) => (current.trim() ? current : state.active));
    } catch (error) {
      setXenesisProfileState(null);
      setXenesisExternalBotChannels(cloneXenesisProfileChannelSettings());
      setXenesisProfileError(error instanceof Error ? error.message : String(error));
    } finally {
      setXenesisProfileBusy(false);
    }
  }, []);

  const loadXenesisGatewayStatus = useCallback(async () => {
    try {
      const status = await window.xenesisAPI.gatewayStatus();
      setXenesisGatewayStatus(status);
      setXenesisGatewayMessage('');
    } catch (error) {
      setXenesisGatewayStatus(null);
      setXenesisGatewayMessage(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const loadSecretVaultStatus = useCallback(async () => {
    const status = await window.secretVaultAPI.status();
    setSecretVaultStatus(status);
    setSecretVaultMode(status.mode);
  }, []);

  const loadSettingsBackups = useCallback(async () => {
    const backups = await window.terminalAPI.listSettingsBackups();
    setSettingsBackupItems(backups);
  }, []);

  useEffect(() => {
    loadExtensions().catch(() => setExtensionInfos([]));
  }, [loadExtensions]);

  useEffect(() => {
    void loadMcpStatus();
  }, [loadMcpStatus]);

  useEffect(() => {
    void loadXenesisConnectionsStatus();
  }, [loadXenesisConnectionsStatus]);

  useEffect(() => {
    void loadXenesisProfiles();
  }, [loadXenesisProfiles]);

  useEffect(() => {
    void loadXenesisGatewayStatus();
  }, [loadXenesisGatewayStatus]);

  useEffect(() => {
    loadSecretVaultStatus().catch(() => setSecretVaultStatus(null));
  }, [loadSecretVaultStatus]);

  useEffect(() => {
    loadSettingsBackups().catch(() => setSettingsBackupItems([]));
  }, [loadSettingsBackups]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    interfaceTabRef.current = interfaceTab;
  }, [interfaceTab]);

  useEffect(() => {
    selectedWindowSizerPresetIdRef.current = selectedWindowSizerPresetId;
  }, [selectedWindowSizerPresetId]);

  useEffect(() => {
    if (!xenisPhase5Enabled && runMode === 'xamong') {
      setRunMode('byok');
    }
  }, [runMode, xenisPhase5Enabled]);

  const activateSettingsCategory = useCallback((category: SettingsCategoryId) => {
    const interfaceTarget = getInterfaceTabForCategory(category);
    if (interfaceTarget) {
      setActiveCategory('interface');
      setInterfaceTab(interfaceTarget);
      return;
    }

    const infoTarget = getInfoTabForCategory(category);
    if (infoTarget) {
      setActiveCategory('info');
      setInfoTab(infoTarget);
      return;
    }

    setActiveCategory(category);
  }, []);

  const applySettingsOpenTarget = useCallback(
    (detail?: SettingsOpenTargetDetail | null) => {
      if (!detail) return;
      if (typeof detail.expiresAt === 'number' && detail.expiresAt < Date.now()) return;

      const rawSection = normalizeSettingsTargetSection(detail.section);
      const section = !xenisPhase5Enabled && rawSection === 'xamong-runtime' ? 'default' : rawSection;
      const requestedConnectionId = typeof detail.focusConnectionId === 'string' ? detail.focusConnectionId.trim() : '';
      const normalizedXenesisTab = normalizeXenesisTab(detail.mode) ?? getXenesisTabForSection(section);
      const normalizedCategory = normalizeSettingsTargetCategory(detail.category);
      const requestedCategory =
        normalizedCategory === 'run-model' && normalizedXenesisTab ? 'xenesis-agent' : normalizedCategory;
      const rawMode = normalizeRunModelMode(detail.mode) ?? getRunModelModeForSection(section);
      const normalizedMode = rawMode === 'xamong' && !xenisPhase5Enabled ? 'byok' : rawMode;
      const normalizedInterfaceTab =
        normalizeInterfaceTab(detail.mode) ??
        getInterfaceTabForCategory(normalizedCategory) ??
        getInterfaceTabForSection(section);
      const normalizedInfoTab =
        normalizeInfoTab(detail.mode) ?? getInfoTabForCategory(normalizedCategory) ?? getInfoTabForSection(section);
      const targetCategory = requestedCategory ?? (normalizedXenesisTab ? 'xenesis-agent' : activeCategoryRef.current);
      const pendingLocalProfile =
        detail.pendingLocalTerminalProfile && typeof detail.pendingLocalTerminalProfile === 'object'
          ? (normalizeLocalProfiles([detail.pendingLocalTerminalProfile as LocalTerminalProfile], defaultShell)[0] ??
            null)
          : null;
      const requestedTerminalProfileId =
        typeof detail.selectedTerminalProfileId === 'string' ? detail.selectedTerminalProfileId : '';

      if (requestedCategory) {
        activateSettingsCategory(requestedCategory);
      }
      if (pendingLocalProfile) {
        setLocalProfiles((prev) => mergePendingLocalTerminalProfile(prev, pendingLocalProfile));
        setSelectedTerminalProfileId(`local:${pendingLocalProfile.id}`);
        setSaved(false);
      } else if (requestedTerminalProfileId) {
        setSelectedTerminalProfileId(requestedTerminalProfileId);
      }
      if (targetCategory === 'xenesis-agent' && normalizedXenesisTab) {
        setXenesisTab(normalizedXenesisTab);
      }
      if (requestedConnectionId) {
        setFocusedXenesisConnectionId(requestedConnectionId);
        if (xenesisConnectionFocusTimeoutRef.current !== null) {
          window.clearTimeout(xenesisConnectionFocusTimeoutRef.current);
        }
        xenesisConnectionFocusTimeoutRef.current = window.setTimeout(() => {
          setFocusedXenesisConnectionId((current) => (current === requestedConnectionId ? '' : current));
          xenesisConnectionFocusTimeoutRef.current = null;
        }, 60000);
      }
      if (targetCategory === 'run-model' && normalizedMode) {
        setRunMode(normalizedMode);
      }
      if (normalizedInterfaceTab) {
        setActiveCategory('interface');
        setInterfaceTab(normalizedInterfaceTab);
      }
      if (normalizedInfoTab) {
        setActiveCategory('info');
        setInfoTab(normalizedInfoTab);
      }
      if (section && detail.ensureVisible !== false) {
        const scrollToSection = (attempt = 0) => {
          const element =
            (requestedConnectionId ? findXenesisConnectionElement(requestedConnectionId) : null) ??
            document.querySelector<HTMLElement>(`[data-settings-section="${section}"]`);
          if (element) {
            element.scrollIntoView({ block: requestedConnectionId ? 'center' : 'start', behavior: 'auto' });
            return;
          }
          if (attempt < 12) {
            window.setTimeout(() => scrollToSection(attempt + 1), 100);
          }
        };
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToSection();
          });
        });
      }
    },
    [activateSettingsCategory, defaultShell, xenisPhase5Enabled],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const category = normalizeSettingsTargetCategory((event as CustomEvent<unknown>).detail);
      if (category) {
        activateSettingsCategory(category);
      }
    };
    window.addEventListener('settings-open-category', handler);
    return () => window.removeEventListener('settings-open-category', handler);
  }, [activateSettingsCategory]);

  useEffect(() => {
    const handler = (event: Event) => {
      applySettingsOpenTarget((event as CustomEvent<SettingsOpenTargetDetail>).detail);
    };
    window.addEventListener('settings-open-target', handler);
    return () => window.removeEventListener('settings-open-target', handler);
  }, [applySettingsOpenTarget]);

  useEffect(() => {
    if (loading) return;
    applySettingsOpenTarget(window.__xenesisSettingsOpenTarget);
  }, [applySettingsOpenTarget, loading]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AppSettingsChangedDetail>).detail;
      if (!detail) return;

      if (detail.windowSizer) {
        const normalizedWindowSizerPresets = normalizeWindowSizerPresets(detail.windowSizer.presets);
        setWindowSizerPresets(normalizedWindowSizerPresets);
        setSelectedWindowSizerPresetId((current) =>
          current && normalizedWindowSizerPresets.some((preset) => preset.id === current)
            ? current
            : (normalizedWindowSizerPresets[normalizedWindowSizerPresets.length - 1]?.id ?? ''),
        );
      }

      let nextRemoteTerminalSettings: RemoteTerminalSettings | null = null;
      let nextRemoteFileSettings: RemoteFileSettings | null = null;

      if (detail.remoteTerminals) {
        const normalizedGroups = normalizeTerminalGroups(detail.remoteTerminals.groups);
        const normalizedRemoteProfiles = normalizeRemoteProfiles(detail.remoteTerminals.profiles);
        const normalizedLocalProfiles = normalizeLocalProfiles(detail.remoteTerminals.localProfiles, defaultShell);
        const requestedSelection = String(detail.selectedTerminalProfileId ?? '');
        nextRemoteTerminalSettings = {
          groups: normalizedGroups,
          profiles: normalizedRemoteProfiles,
          localProfiles: normalizedLocalProfiles,
        };

        setTerminalGroups(nextRemoteTerminalSettings.groups);
        setRemoteProfiles(nextRemoteTerminalSettings.profiles);
        setLocalProfiles(nextRemoteTerminalSettings.localProfiles);
        setSelectedTerminalProfileId((current) => {
          const candidate = requestedSelection || current;
          if (
            candidate &&
            (normalizedRemoteProfiles.some((profile) => `remote:${profile.id}` === candidate) ||
              normalizedLocalProfiles.some((profile) => `local:${profile.id}` === candidate))
          ) {
            return candidate;
          }
          return normalizedLocalProfiles[normalizedLocalProfiles.length - 1]
            ? `local:${normalizedLocalProfiles[normalizedLocalProfiles.length - 1].id}`
            : normalizedRemoteProfiles[normalizedRemoteProfiles.length - 1]
              ? `remote:${normalizedRemoteProfiles[normalizedRemoteProfiles.length - 1].id}`
              : '';
        });
      }

      if (detail.remoteFiles) {
        const normalizedRemoteFileGroups = normalizeTerminalGroups(detail.remoteFiles.groups);
        const normalizedRemoteFileProfiles = normalizeRemoteFileProfiles(detail.remoteFiles.profiles);
        const requestedRemoteFileSelection = String(detail.selectedRemoteFileProfileId ?? '');
        nextRemoteFileSettings = {
          groups: normalizedRemoteFileGroups,
          profiles: normalizedRemoteFileProfiles,
        };

        setRemoteFileGroups(nextRemoteFileSettings.groups);
        setRemoteFileProfiles(nextRemoteFileSettings.profiles);
        setSelectedRemoteFileProfileId((current) => {
          const candidate = requestedRemoteFileSelection || current;
          return candidate && normalizedRemoteFileProfiles.some((profile) => profile.id === candidate)
            ? candidate
            : (normalizedRemoteFileProfiles[normalizedRemoteFileProfiles.length - 1]?.id ?? '');
        });
      }
      if (nextRemoteTerminalSettings && nextRemoteFileSettings) {
        remoteProfileSettingsLoadedRef.current = true;
        remoteProfileSettingsDirtyRef.current = false;
        remoteProfileSettingsSnapshotRef.current = buildRemoteProfileSettingsSnapshot(
          nextRemoteTerminalSettings,
          nextRemoteFileSettings,
        );
      }
    };
    window.addEventListener('app-settings-changed', handler);
    return () => window.removeEventListener('app-settings-changed', handler);
  }, [defaultShell]);

  useEffect(() => {
    const handler = (event: Event) => {
      const presetId = String((event as CustomEvent<string>).detail ?? '');
      if (!presetId) return;
      setActiveCategory('interface');
      setInterfaceTab('window-sizer');
      setSelectedWindowSizerPresetId(presetId);
    };
    window.addEventListener('window-sizer-select-preset', handler);
    return () => window.removeEventListener('window-sizer-select-preset', handler);
  }, []);

  useEffect(() => {
    if (typeof window.fileAPI?.onCurrentWindowBoundsChanged !== 'function') return undefined;

    return window.fileAPI.onCurrentWindowBoundsChanged((bounds: WindowBounds) => {
      if (!(activeCategoryRef.current === 'interface' && interfaceTabRef.current === 'window-sizer')) return;
      const presetId = selectedWindowSizerPresetIdRef.current;
      if (!presetId) return;

      setSaved(false);
      setWindowSizerPresets((prev) =>
        prev.map((preset) => {
          if (preset.id !== presetId) return preset;
          if (
            preset.width === bounds.width &&
            preset.height === bounds.height &&
            preset.x === bounds.x &&
            preset.y === bounds.y
          ) {
            return preset;
          }

          return {
            ...preset,
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
            updatedAt: Date.now(),
          };
        }),
      );
    });
  }, []);

  // 프로필 초기 로드
  useEffect(() => {
    const user = authApiLoadUser();
    setProfileUser(user);
  }, []);

  const startProfileEdit = useCallback((user: AuthUser | null) => {
    setProfileName(user?.name ?? '');
    setProfileEmail(user?.email ?? '');
    setProfileId(user?.id ?? '');
    setProfilePlan(user?.plan ?? '');
    // 기존에 저장된 JWT 토큰 복원
    try {
      const session = JSON.parse(localStorage.getItem('sessionInfo') ?? '{}');
      setProfileToken(session?.access_token ?? '');
    } catch {
      setProfileToken('');
    }
    setProfileShowToken(false);
    setProfileEditMode(true);
  }, []);

  const handleProfileSave = useCallback(() => {
    const updated: AuthUser = {
      id: profileId.trim() || (profileUser?.id ?? ''),
      name: profileName.trim() || (profileUser?.name ?? ''),
      email: profileEmail.trim() || (profileUser?.email ?? ''),
      provider: profileUser?.provider ?? 'email',
      avatar: profileUser?.avatar ?? '',
      plan: profilePlan.trim() || profileUser?.plan,
      subscription: profileUser?.subscription ?? '',
    };
    localStorage.setItem('xamong_user', JSON.stringify(updated));
    localStorage.setItem('xamong_logged_in', 'true');

    // JWT 토큰 저장 — authApi.ts 가 sessionInfo.access_token 을 Auth 헤더로 사용
    const token = profileToken.trim();
    if (token) {
      let session: Record<string, string> = {};
      try {
        session = JSON.parse(localStorage.getItem('sessionInfo') ?? '{}');
      } catch {
        /* ignore */
      }
      localStorage.setItem('sessionInfo', JSON.stringify({ ...session, access_token: token }));
    }

    setProfileUser(updated);
    setProfileEditMode(false);
    setProfileSaved(true);
    window.dispatchEvent(new CustomEvent('xamong-profile-updated', { detail: updated }));
    setTimeout(() => setProfileSaved(false), 2000);
  }, [profileId, profileName, profileEmail, profilePlan, profileToken, profileUser]);

  const handleProfileLogout = useCallback(() => {
    authApiLogout();
    setProfileUser(null);
    setProfileEditMode(false);
    window.dispatchEvent(new CustomEvent('xamong-profile-updated', { detail: null }));
  }, []);

  useEffect(() => {
    window.updaterAPI
      ?.getStatus()
      .then(setUpdStatus)
      .catch(() => {});
    return window.updaterAPI?.onStatusChanged(setUpdStatus);
  }, []);

  const pollXamongStatus = useCallback(() => {
    if (!xenisPhase5Enabled) {
      setXamongStatus({
        running: false,
        host: DEFAULT_XAMONG_CODE_HOST,
        port: DEFAULT_XAMONG_CODE_PORT,
        url: `http://${DEFAULT_XAMONG_CODE_HOST}:${DEFAULT_XAMONG_CODE_PORT}`,
        runtimePath: '',
        configDir: DEFAULT_XAMONG_CODE_CONFIG_DIR,
        workspacesConfigPath: '',
        openAiModel: '',
        directGeneralChat: true,
        directChatModel: '',
        workerTierPolicies: '',
        hasOpenAiApiKey: false,
        managed: false,
      });
      return;
    }
    window.xamongCodeAPI
      ?.status?.()
      .then((st) => setXamongStatus(st))
      .catch(() => {});
  }, [xenisPhase5Enabled]);

  const scanLocalCli = useCallback(async () => {
    setLocalCliBusy(true);
    try {
      const agents = await window.localCliAPI?.scan?.();
      if (Array.isArray(agents)) setLocalCliAgents(agents);
    } catch {
      /* ignore */
    } finally {
      setLocalCliBusy(false);
    }
  }, []);

  const fetchXamongWorkers = useCallback(async () => {
    if (!xamongStatus.running) {
      setXamongWorkerStatus(null);
      setXamongWorkerError('');
      return;
    }
    const base = (xamongStatus.url || `http://${DEFAULT_XAMONG_CODE_HOST}:${DEFAULT_XAMONG_CODE_PORT}`).replace(
      /\/$/,
      '',
    );
    const token = getStoredXamongToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    setXamongWorkerBusy(true);
    setXamongWorkerError('');
    try {
      const res = await fetch(`${base}/admin/workers`, { headers });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        interactiveWorkers?: XamongInteractiveWorkerStatus;
        error?: { message?: string };
      };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error?.message || t('settings.workerStatusFailed', { status: String(res.status) }));
      }
      setXamongWorkerStatus(json.interactiveWorkers ?? null);
    } catch (error) {
      setXamongWorkerError(error instanceof Error ? error.message : String(error));
    } finally {
      setXamongWorkerBusy(false);
    }
  }, [xamongStatus.running, xamongStatus.url, t]);

  const closeXamongWorkers = useCallback(
    async (key?: string) => {
      if (!xamongStatus.running) return;
      const base = (xamongStatus.url || `http://${DEFAULT_XAMONG_CODE_HOST}:${DEFAULT_XAMONG_CODE_PORT}`).replace(
        /\/$/,
        '',
      );
      const token = getStoredXamongToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      setXamongWorkerBusy(true);
      setXamongWorkerError('');
      try {
        const res = await fetch(`${base}/admin/workers/close`, {
          method: 'POST',
          headers,
          body: JSON.stringify(key ? { key } : { all: true }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          interactiveWorkers?: XamongInteractiveWorkerStatus;
          error?: { message?: string };
        };
        if (!res.ok || json.ok === false) {
          throw new Error(json.error?.message || t('settings.workerStopFailed', { status: String(res.status) }));
        }
        setXamongWorkerStatus(json.interactiveWorkers ?? null);
      } catch (error) {
        setXamongWorkerError(error instanceof Error ? error.message : String(error));
      } finally {
        setXamongWorkerBusy(false);
      }
    },
    [xamongStatus.running, xamongStatus.url, t],
  );

  useEffect(() => {
    if (!xenisPhase5Enabled) {
      if (xamongPollRef.current) {
        clearInterval(xamongPollRef.current);
        xamongPollRef.current = null;
      }
      pollXamongStatus();
      return undefined;
    }
    pollXamongStatus();
    xamongPollRef.current = setInterval(pollXamongStatus, 3000);
    return () => {
      if (xamongPollRef.current) clearInterval(xamongPollRef.current);
    };
  }, [pollXamongStatus, xenisPhase5Enabled]);

  useEffect(() => {
    scanLocalCli();
  }, [scanLocalCli]);

  useEffect(() => {
    loadProviderIntegrationStatus();
  }, [loadProviderIntegrationStatus]);

  const handleXamongPortChange = useCallback(
    (val: string) => {
      setXamongPortStr(val);
      if (!val) {
        setXamongPortError(t('settings.portRequired'));
        return;
      }
      const n = parsePort(val);
      setXamongPortError(n === null ? t('settings.portRange', { min: String(PORT_MIN), max: String(PORT_MAX) }) : '');
    },
    [t],
  );

  const handleXenesisPortChange = useCallback(
    (val: string) => {
      setXenesisPortStr(val);
      if (!val) {
        setXenesisPortError(t('settings.portRequired'));
        return;
      }
      const n = parsePort(val);
      setXenesisPortError(n === null ? t('settings.portRange', { min: String(PORT_MIN), max: String(PORT_MAX) }) : '');
    },
    [t],
  );

  const handleWorkerTierPoliciesChange = useCallback(
    (value: string) => {
      setXamongWorkerTierPolicies(value);
      setXamongWorkerTierPoliciesError(isPlainJsonObjectText(value) ? '' : t('settings.jsonFormat'));
    },
    [t],
  );

  const handleXenesisProfileSelect = useCallback(async (value: string) => {
    setXenesisProfile(value);
    if (!value.trim()) return;
    setXenesisProfileBusy(true);
    setXenesisProfileError('');
    try {
      const state = await window.xenesisAPI.useProfile(value.trim());
      setXenesisProfileState(state);
      setXenesisExternalBotChannels(cloneXenesisProfileChannelSettings(state.channelSettings));
      setXenesisProfile(state.active);
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              xenesis: {
                ...prev.xenesis,
                profile: state.active,
              },
            }
          : prev,
      );
    } catch (error) {
      setXenesisProfileError(error instanceof Error ? error.message : String(error));
    } finally {
      setXenesisProfileBusy(false);
    }
  }, []);

  const handleXenesisProfileInstallTemplate = useCallback(async (template: string) => {
    setXenesisProfileBusy(true);
    setXenesisProfileError('');
    try {
      const state = await window.xenesisAPI.installProfile({ template, activate: true });
      setXenesisProfileState(state);
      setXenesisExternalBotChannels(cloneXenesisProfileChannelSettings(state.channelSettings));
      setXenesisProfile(state.active);
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              xenesis: {
                ...prev.xenesis,
                profile: state.active,
              },
            }
          : prev,
      );
    } catch (error) {
      setXenesisProfileError(error instanceof Error ? error.message : String(error));
    } finally {
      setXenesisProfileBusy(false);
    }
  }, []);

  const patchXenesisExternalBotChannel = useCallback(
    <K extends keyof XenesisProfileChannelSettings>(channel: K, patch: Partial<XenesisProfileChannelSettings[K]>) => {
      setXenesisExternalBotMessage('');
      setXenesisExternalBotChannels((prev) => ({
        ...prev,
        [channel]: {
          ...prev[channel],
          ...patch,
        },
      }));
    },
    [],
  );

  const handleXenesisExternalBotChannelsSave = useCallback(async () => {
    if (xenesisExternalBotSaving) return;
    const profile = xenesisProfileState?.active || xenesisProfile.trim();
    setXenesisExternalBotSaving(true);
    setXenesisExternalBotMessage('');
    try {
      const state = await window.xenesisAPI.updateProfileChannels({
        profile,
        channels: xenesisExternalBotChannels,
      });
      setXenesisProfileState(state);
      setXenesisExternalBotChannels(cloneXenesisProfileChannelSettings(state.channelSettings));
      setXenesisProfile(state.active);
      setXenesisExternalBotMessage(t('settings.xenesisExternalBotSaved'));
    } catch (error) {
      setXenesisExternalBotMessage(
        t('settings.xenesisExternalBotSaveFailed', {
          message: getSettingsErrorMessage(error),
        }),
      );
    } finally {
      setXenesisExternalBotSaving(false);
    }
  }, [t, xenesisExternalBotChannels, xenesisExternalBotSaving, xenesisProfile, xenesisProfileState?.active]);

  const handleXenesisExternalBotChannelTest = useCallback(
    async (channel: XenesisProfileChannelName) => {
      if (xenesisExternalBotTesting || xenesisProfileBusy) return;
      const profile = xenesisProfileState?.active || xenesisProfile.trim();
      setXenesisExternalBotTesting(channel);
      setXenesisExternalBotMessage('');
      try {
        const result = await window.xenesisAPI.testProfileChannel({
          profile,
          channel,
          channels: xenesisExternalBotChannels,
        });
        setXenesisExternalBotMessage(
          t('settings.xenesisExternalBotTestSent', {
            channel,
            target: result.target,
          }),
        );
      } catch (error) {
        setXenesisExternalBotMessage(
          t('settings.xenesisExternalBotTestFailed', {
            channel,
            message: getSettingsErrorMessage(error),
          }),
        );
      } finally {
        setXenesisExternalBotTesting(null);
      }
    },
    [
      t,
      xenesisExternalBotChannels,
      xenesisExternalBotTesting,
      xenesisProfile,
      xenesisProfileBusy,
      xenesisProfileState?.active,
    ],
  );

  const xenesisProfilePolicyItems = xenesisProfileState?.policy
    ? [
        { label: 'Workflow', value: xenesisProfileState.policy.workflow },
        { label: 'Approval', value: xenesisProfileState.policy.approvalMode },
        {
          label: 'Max turns',
          value: xenesisProfileState.policy.maxTurns > 0 ? String(xenesisProfileState.policy.maxTurns) : 'default',
        },
        { label: 'Context', value: xenesisProfileState.policy.contextAutoCompact ? 'auto compact' : 'manual compact' },
        { label: 'Memory', value: xenesisProfileState.policy.memoryEnabled ? 'enabled' : 'disabled' },
        { label: 'Subagents', value: xenesisProfileState.policy.subagentsEnabled ? 'enabled' : 'disabled' },
        { label: 'Verification', value: xenesisProfileState.policy.verificationAutoRun ? 'auto run' : 'manual' },
      ]
    : [];

  const patchAiProvider = useCallback(
    (patch: Partial<AiProviderSettings>) => {
      setAiProviderTestMessage('');
      setAiProvider((prev) => {
        const next = { ...prev, ...patch };
        if (next.provider === 'openai') {
          if (patch.apiKey !== undefined) setXamongOpenAiApiKey(patch.apiKey);
          if (patch.model !== undefined) setXamongOpenAiModel(patch.model);
        }
        setAiProviderProfiles((profiles) =>
          profiles.map((profile) =>
            profile.id === activeAiProviderProfileId
              ? { ...profile, settings: normalizeAiProvider(next), updatedAt: Date.now() }
              : profile,
          ),
        );
        return next;
      });
    },
    [activeAiProviderProfileId],
  );

  const handleProviderChange = useCallback(
    (provider: AiProviderKind) => {
      const meta = AI_PROVIDERS[provider];
      patchAiProvider({
        provider,
        model: meta.defaultModel,
        baseUrl: meta.defaultBaseUrl,
      });
    },
    [patchAiProvider],
  );

  const buildXamongCodeSettings = useCallback(() => {
    const port = parsePort(xamongPortStr);
    const openAiApiKey =
      xamongOpenAiApiKey.trim() || (aiProvider.provider === 'openai' ? aiProvider.apiKey.trim() : '');
    const openAiModel = xamongOpenAiModel.trim() || (aiProvider.provider === 'openai' ? aiProvider.model.trim() : '');
    return {
      runtimePath: xamongRuntimePath.trim(),
      configDir: xamongConfigDir.trim() || DEFAULT_XAMONG_CODE_CONFIG_DIR,
      autoStart: xamongAutoStart,
      host: DEFAULT_XAMONG_CODE_HOST,
      port: port ?? DEFAULT_XAMONG_CODE_PORT,
      openAiApiKey,
      openAiModel,
      workspacesConfigPath: xamongWorkspacesConfigPath.trim(),
      directGeneralChat: xamongDirectGeneralChat,
      directChatModel: xamongDirectChatModel.trim(),
      workerTierPolicies: xamongWorkerTierPolicies.trim(),
    };
  }, [
    aiProvider.apiKey,
    aiProvider.model,
    aiProvider.provider,
    xamongAutoStart,
    xamongConfigDir,
    xamongDirectChatModel,
    xamongDirectGeneralChat,
    xamongOpenAiApiKey,
    xamongOpenAiModel,
    xamongPortStr,
    xamongRuntimePath,
    xamongWorkerTierPolicies,
    xamongWorkspacesConfigPath,
  ]);

  const buildXenesisRuntimeSettings = useCallback(() => {
    const port = parsePort(xenesisPortStr);
    const maxTurns = Number.parseInt(xenesisMaxTurnsStr, 10);
    return {
      enabled: xenesisEnabled,
      runtimeMode: xenesisRuntimeMode,
      autoStart: xenesisAutoStart,
      runtimePath: xenesisRuntimePath.trim(),
      host: xenesisHost.trim() || DEFAULT_XENESIS_GATEWAY_HOST,
      port: port ?? DEFAULT_XENESIS_GATEWAY_PORT,
      approvalMode: xenesisApprovalMode,
      maxTurns: Number.isInteger(maxTurns) && maxTurns > 0 ? maxTurns : DEFAULT_XENESIS_MAX_TURNS,
      model: xenesisModel.trim(),
      profile: xenesisProfile.trim(),
      mcpEnabled: xenesisMcpEnabled,
      gateway: {
        enabled: xenesisGatewayEnabled || xenesisRuntimeMode === 'externalGateway',
        autoStart: xenesisGatewayAutoStart,
        host: xenesisHost.trim() || DEFAULT_XENESIS_GATEWAY_HOST,
        port: port ?? DEFAULT_XENESIS_GATEWAY_PORT,
        requireAuth: true,
        mcpEnabled: xenesisMcpEnabled,
        devToken: xenesisGatewayDevToken.trim(),
      },
    };
  }, [
    xenesisApprovalMode,
    xenesisAutoStart,
    xenesisEnabled,
    xenesisGatewayAutoStart,
    xenesisGatewayDevToken,
    xenesisGatewayEnabled,
    xenesisHost,
    xenesisMaxTurnsStr,
    xenesisMcpEnabled,
    xenesisModel,
    xenesisPortStr,
    xenesisProfile,
    xenesisRuntimeMode,
    xenesisRuntimePath,
  ]);

  const saveUpdatedSettings = useCallback(
    async (updated: Partial<AppSettings>) => {
      await window.terminalAPI.saveSettings(updated);
      setSettings((prev) => (prev ? { ...prev, ...updated } : prev));
      window.dispatchEvent(
        new CustomEvent('app-settings-changed', {
          detail: { ...(settings ?? {}), ...updated },
        }),
      );
    },
    [settings],
  );

  const saveExternalApps = useCallback(async () => {
    const externalApps = normalizeExternalAppSettings({
      enabled: externalAppsEnabled,
      profiles: externalAppProfiles,
    });
    await saveUpdatedSettings({ externalApps });
    setExternalAppsEnabled(externalApps.enabled);
    setExternalAppProfiles(externalApps.profiles);
    setSettingsSaveError('');
    setSaved(true);
  }, [externalAppProfiles, externalAppsEnabled, saveUpdatedSettings]);

  const patchExternalAppProfile = useCallback((id: string, patch: Partial<ExternalAppProfile>) => {
    setExternalAppProfiles((profiles) =>
      profiles.map((profile) => (profile.id === id ? { ...profile, ...patch } : profile)),
    );
  }, []);

  const addExternalAppProfile = useCallback(() => {
    const id = `external-${Date.now().toString(36)}`;
    setExternalAppProfiles((profiles) => [
      ...profiles,
      {
        id,
        label: 'External app',
        platform: 'windows',
        executable: '',
        allowedActions: ['launch', 'focus', 'status', 'find'],
        approvalLevel: 'high',
        enabled: true,
      },
    ]);
  }, []);

  const addExternalAppProfileFromTemplate = useCallback((templateId: string) => {
    setExternalAppProfiles((profiles) => {
      const profile = createExternalAppProfileFromTemplate(
        templateId,
        profiles.map((item) => item.id),
      );
      return profile ? [...profiles, profile] : profiles;
    });
  }, []);

  const removeExternalAppProfile = useCallback((id: string) => {
    if (BUILTIN_EXTERNAL_APP_IDS.has(id)) return;
    setExternalAppProfiles((profiles) => profiles.filter((profile) => profile.id !== id));
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    const remoteTerminalSettings = {
      groups: terminalGroups,
      profiles: remoteProfiles,
      localProfiles,
    };
    const remoteFileSettings = {
      groups: remoteFileGroups,
      profiles: remoteFileProfiles,
    };
    const snapshot = buildRemoteProfileSettingsSnapshot(remoteTerminalSettings, remoteFileSettings);

    if (!remoteProfileSettingsLoadedRef.current) {
      remoteProfileSettingsLoadedRef.current = true;
      remoteProfileSettingsDirtyRef.current = false;
      remoteProfileSettingsSnapshotRef.current = snapshot;
      return undefined;
    }

    if (!remoteProfileSettingsDirtyRef.current) {
      return undefined;
    }

    if (snapshot === remoteProfileSettingsSnapshotRef.current) {
      remoteProfileSettingsDirtyRef.current = false;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      window.terminalAPI
        .saveSettings({
          remoteTerminals: remoteTerminalSettings,
          remoteFiles: remoteFileSettings,
        })
        .then(() => {
          remoteProfileSettingsSnapshotRef.current = snapshot;
          remoteProfileSettingsDirtyRef.current = false;
          setSettingsSaveError('');
          setSettings((prev) =>
            prev
              ? {
                  ...prev,
                  remoteTerminals: remoteTerminalSettings,
                  remoteFiles: remoteFileSettings,
                }
              : prev,
          );
          window.dispatchEvent(
            new CustomEvent('app-settings-changed', {
              detail: {
                remoteTerminals: remoteTerminalSettings,
                remoteFiles: remoteFileSettings,
                selectedTerminalProfileId,
                selectedRemoteFileProfileId,
              },
            }),
          );
        })
        .catch((error) => {
          setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    loading,
    localProfiles,
    remoteFileGroups,
    remoteFileProfiles,
    remoteProfiles,
    selectedRemoteFileProfileId,
    selectedTerminalProfileId,
    terminalGroups,
    t,
  ]);

  const handleAiProviderProfileSelect = useCallback(
    (profileId: string) => {
      const profile = aiProviderProfiles.find((item) => item.id === profileId);
      if (!profile) return;
      const nextProvider = normalizeAiProvider(profile.settings);
      setActiveAiProviderProfileId(profile.id);
      setAiProvider(nextProvider);
      setAiProviderTestMessage('');
      if (nextProvider.provider === 'openai') {
        setXamongOpenAiApiKey(nextProvider.apiKey);
        setXamongOpenAiModel(nextProvider.model);
      }
      saveUpdatedSettings({
        aiProvider: nextProvider,
        aiProviderProfiles,
        activeAiProviderProfileId: profile.id,
      })
        .then(() => setSettingsSaveError(''))
        .catch((error) => {
          setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
        });
    },
    [aiProviderProfiles, saveUpdatedSettings, t],
  );

  const handleAiProviderProfileSave = useCallback(() => {
    const normalized = normalizeAiProvider(aiProvider);
    const nextProfiles = aiProviderProfiles.map((profile) =>
      profile.id === activeAiProviderProfileId ? { ...profile, settings: normalized, updatedAt: Date.now() } : profile,
    );
    setAiProviderProfiles(nextProfiles);
    saveUpdatedSettings({
      aiProvider: normalized,
      aiProviderProfiles: nextProfiles,
      activeAiProviderProfileId,
    })
      .then(() => {
        setSaved(true);
        setSettingsSaveError('');
        setTimeout(() => setSaved(false), 2000);
      })
      .catch((error) => {
        setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
      });
  }, [activeAiProviderProfileId, aiProvider, aiProviderProfiles, saveUpdatedSettings, t]);

  const handleAiProviderProfileCreate = useCallback(() => {
    const normalized = normalizeAiProvider(aiProvider);
    const nextProfile = {
      ...createAiProviderProfile(normalized, aiProviderProfiles.length),
      id: createAiProviderProfileId(),
      name: t('settings.aiProviderProfileNewName', {
        provider: getProviderLabel(normalized.provider),
        index: String(aiProviderProfiles.length + 1),
      }),
    };
    const nextProfiles = [...aiProviderProfiles, nextProfile];
    setAiProviderProfiles(nextProfiles);
    setActiveAiProviderProfileId(nextProfile.id);
    saveUpdatedSettings({
      aiProvider: normalized,
      aiProviderProfiles: nextProfiles,
      activeAiProviderProfileId: nextProfile.id,
    })
      .then(() => setSettingsSaveError(''))
      .catch((error) => {
        setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
      });
  }, [aiProvider, aiProviderProfiles, getProviderLabel, saveUpdatedSettings, t]);

  const handleAiProviderProfileDelete = useCallback(() => {
    if (aiProviderProfiles.length <= 1) return;
    const nextProfiles = aiProviderProfiles.filter((profile) => profile.id !== activeAiProviderProfileId);
    const fallbackProfile = nextProfiles[0] ?? createAiProviderProfile(DEFAULT_AI_PROVIDER, 0);
    const nextProvider = normalizeAiProvider(fallbackProfile.settings);
    setAiProviderProfiles(nextProfiles);
    setActiveAiProviderProfileId(fallbackProfile.id);
    setAiProvider(nextProvider);
    setAiProviderTestMessage('');
    saveUpdatedSettings({
      aiProvider: nextProvider,
      aiProviderProfiles: nextProfiles,
      activeAiProviderProfileId: fallbackProfile.id,
    })
      .then(() => setSettingsSaveError(''))
      .catch((error) => {
        setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
      });
  }, [activeAiProviderProfileId, aiProviderProfiles, saveUpdatedSettings, t]);

  const handleAiProviderTest = useCallback(async () => {
    if (aiProviderTesting) return;
    const providerSettings = {
      ...aiProvider,
      apiKey: aiProvider.apiKey.trim(),
      model: aiProvider.model.trim(),
      baseUrl: aiProvider.baseUrl.trim(),
    };
    const providerMeta = AI_PROVIDERS[providerSettings.provider];
    const providerLabel = getProviderLabel(providerSettings.provider);
    const runtime = resolveGowooriApiRuntimeSettings({
      provider: providerSettings.provider,
      model: providerSettings.model,
      baseUrl: providerSettings.baseUrl,
      apiKey: providerSettings.apiKey,
      apiKeyRequired: providerMeta.needsKey,
      fallbackModel: providerMeta.defaultModel,
    });

    setAiProviderTesting(true);
    setAiProviderTestMessage(t('settings.aiProviderTesting', { provider: providerLabel }));
    const startedAt = Date.now();
    const activeProfileName =
      aiProviderProfiles.find((profile) => profile.id === activeAiProviderProfileId)?.name || providerLabel;
    let artifactText = '';
    try {
      if (runtime.apiKeyRequired && !runtime.apiKey) {
        const message = t('settings.aiProviderTestMissingKey', { provider: providerLabel });
        appendSettingsProviderQualityLog({
          provider: providerSettings.provider,
          providerLabel,
          profileName: activeProfileName,
          startedAt,
          completedAt: Date.now(),
          ok: false,
          source: '',
          summary: message,
          diagnostics: [{ severity: 'error', message }],
        });
        setAiProviderTestMessage(message);
        return;
      }
      if (!runtime.baseUrl) {
        const message = t('settings.aiProviderTestMissingBaseUrl', { provider: providerLabel });
        appendSettingsProviderQualityLog({
          provider: providerSettings.provider,
          providerLabel,
          profileName: activeProfileName,
          startedAt,
          completedAt: Date.now(),
          ok: false,
          source: '',
          summary: message,
          diagnostics: [{ severity: 'error', message }],
        });
        setAiProviderTestMessage(message);
        return;
      }

      await saveUpdatedSettings({ aiProvider: providerSettings });
      let chunkCount = 0;
      await runGowooriApiProvider(
        {
          kind: 'api-plan',
          provider: 'byok',
          summary: `${providerLabel} settings smoke test`,
          prompt: 'Reply with exactly: Gowoori provider test OK',
        },
        {
          apiFormat: runtime.apiFormat,
          apiKey: runtime.apiKey,
          apiKeyRequired: runtime.apiKeyRequired,
          baseUrl: runtime.baseUrl,
          model: runtime.model,
          onChunk: (chunk) => {
            if (!chunk) return;
            chunkCount += 1;
            artifactText += chunk;
          },
        },
      );
      const successMessage = t('settings.aiProviderTestSuccess', {
        provider: providerLabel,
        chunks: String(chunkCount),
        preview: (artifactText.trim() || 'OK').slice(0, 80),
      });
      appendSettingsProviderQualityLog({
        provider: providerSettings.provider,
        providerLabel,
        profileName: activeProfileName,
        startedAt,
        completedAt: Date.now(),
        ok: true,
        source: artifactText.trim() || 'Gowoori provider test OK',
        summary: successMessage,
      });
      setAiProviderTestMessage(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failedMessage = t('settings.aiProviderTestFailed', {
        provider: providerLabel,
        message,
      });
      appendSettingsProviderQualityLog({
        provider: providerSettings.provider,
        providerLabel,
        profileName: activeProfileName,
        startedAt,
        completedAt: Date.now(),
        ok: false,
        source: artifactText,
        summary: failedMessage,
        diagnostics: [{ severity: 'error', message }],
      });
      setAiProviderTestMessage(failedMessage);
    } finally {
      setAiProviderTesting(false);
    }
  }, [activeAiProviderProfileId, aiProvider, aiProviderProfiles, aiProviderTesting, saveUpdatedSettings, t]);

  const handleGowooriSportsStandingsEndpointTest = useCallback(async () => {
    if (gowooriSportsStandingsEndpointTesting) return;
    const endpoint = gowooriChatSportsStandingsEndpoint.trim();
    if (!endpoint) {
      setGowooriSportsStandingsEndpointTestMessage(t('settings.gowooriSportsStandingsEndpointTestMissing'));
      return;
    }

    let testUrl = '';
    try {
      testUrl = buildGowooriSportsStandingsTestUrl(endpoint);
    } catch (error) {
      setGowooriSportsStandingsEndpointTestMessage(
        t('settings.gowooriSportsStandingsEndpointTestInvalid', {
          message: getSettingsErrorMessage(error),
        }),
      );
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), GOWOORI_SPORTS_STANDINGS_TEST_TIMEOUT_MS);
    setGowooriSportsStandingsEndpointTesting(true);
    setGowooriSportsStandingsEndpointTestMessage(t('settings.gowooriSportsStandingsEndpointTesting'));
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as unknown;
      const rowCount = countGowooriSportsStandingsRows(payload);
      if (rowCount <= 0) {
        throw new Error(t('settings.gowooriSportsStandingsEndpointTestNoRows'));
      }
      setGowooriSportsStandingsEndpointTestMessage(
        t('settings.gowooriSportsStandingsEndpointTestSuccess', {
          count: String(rowCount),
        }),
      );
    } catch (error) {
      setGowooriSportsStandingsEndpointTestMessage(
        t('settings.gowooriSportsStandingsEndpointTestFailed', {
          message: getSettingsErrorMessage(error),
        }),
      );
    } finally {
      window.clearTimeout(timeoutId);
      setGowooriSportsStandingsEndpointTesting(false);
    }
  }, [gowooriChatSportsStandingsEndpoint, gowooriSportsStandingsEndpointTesting, t]);

  const handleExtensionReload = useCallback(async () => {
    setExtensionBusy(true);
    setExtensionMessage('');
    try {
      const extensions = await window.extensionAPI.reload();
      setExtensionInfos(extensions);
      setExtensionMessage(t('settings.extensionsReloaded'));
      window.dispatchEvent(new CustomEvent('extensions-changed'));
    } catch (error) {
      setExtensionMessage(
        t('settings.extensionsReloadFailed', {
          e: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setExtensionBusy(false);
    }
  }, [t]);

  const handleExtensionToggle = useCallback(
    async (extensionId: string, enabled: boolean) => {
      setExtensionBusy(true);
      setExtensionMessage('');
      try {
        const extensions = await window.extensionAPI.setEnabled(extensionId, enabled);
        setExtensionInfos(extensions);
        setExtensionMessage(enabled ? t('settings.extensionsEnabled') : t('settings.extensionsDisabled'));
        window.dispatchEvent(new CustomEvent('extensions-changed'));
      } catch (error) {
        setExtensionMessage(
          t('settings.extensionsToggleFailed', {
            e: error instanceof Error ? error.message : String(error),
          }),
        );
      } finally {
        setExtensionBusy(false);
      }
    },
    [t],
  );

  const handleExtensionRetry = useCallback(
    async (extensionId: string) => {
      setExtensionBusy(true);
      setExtensionMessage('');
      try {
        const extensions = await window.extensionAPI.retry(extensionId);
        setExtensionInfos(extensions);
        setExtensionMessage(t('settings.extensionsRetryDone'));
        window.dispatchEvent(new CustomEvent('extensions-changed'));
      } catch (error) {
        setExtensionMessage(
          t('settings.extensionsRetryFailed', {
            e: error instanceof Error ? error.message : String(error),
          }),
        );
      } finally {
        setExtensionBusy(false);
      }
    },
    [t],
  );

  const renderExtensionSourceLabel = useCallback(
    (source: ExtensionInfo['source']) => {
      if (source === 'public') return t('settings.extensionsSourcePublic');
      if (source === 'internal') return t('settings.extensionsSourceInternal');
      return t('settings.extensionsSourceUser');
    },
    [t],
  );

  const renderExtensionPermissionLabel = useCallback(
    (permission: ExtensionPermission) => {
      switch (permission) {
        case 'commands':
          return t('settings.extensionsPermissionCommands');
        case 'files.read':
          return t('settings.extensionsPermissionFilesRead');
        case 'files.write':
          return t('settings.extensionsPermissionFilesWrite');
        case 'settings.read':
          return t('settings.extensionsPermissionSettingsRead');
        case 'settings.write':
          return t('settings.extensionsPermissionSettingsWrite');
        case 'tools.open':
          return t('settings.extensionsPermissionToolsOpen');
        case 'panels.open':
          return t('settings.extensionsPermissionPanelsOpen');
        default:
          return permission;
      }
    },
    [t],
  );

  const patchKeyboardShortcut = useCallback((commandId: string, patch: Partial<CommandShortcutBinding>) => {
    setKeyboardShortcutBindings((prev) => {
      const now = Date.now();
      const existing = prev.find((binding) => binding.commandId === commandId);
      const nextBinding: CommandShortcutBinding = {
        id: existing?.id ?? `shortcut-${commandId}-${crypto.randomUUID()}`,
        commandId,
        accelerator: normalizeAccelerator(patch.accelerator ?? existing?.accelerator ?? ''),
        enabled: patch.enabled ?? existing?.enabled ?? true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      return [...prev.filter((binding) => binding.commandId !== commandId), nextBinding];
    });
  }, []);

  const getKeyboardShortcutCommands = useCallback((): KeyboardShortcutCommand[] => {
    const coreCommands = [
      {
        id: 'command-palette',
        label: t('settings.shortcutCommandPalette'),
        category: t('settings.shortcutCoreCategory'),
      },
      {
        id: 'new-default-terminal',
        label: t('settings.shortcutDefaultTerminal'),
        category: t('settings.shortcutCoreCategory'),
      },
      { id: 'new-ps', label: t('app.newPowerShell'), category: t('settings.shortcutTerminalCategory') },
      { id: 'new-cmd', label: t('app.newCmd'), category: t('settings.shortcutTerminalCategory') },
      { id: 'new-pwsh', label: t('app.newPwsh'), category: t('settings.shortcutTerminalCategory') },
      { id: 'new-wsl', label: t('app.newWsl'), category: t('settings.shortcutTerminalCategory') },
      { id: 'new-browser', label: t('app.newBrowserTab'), category: t('settings.shortcutCoreCategory') },
      { id: 'open-file', label: t('app.openLocalFile'), category: t('settings.shortcutCoreCategory') },
      { id: 'open-workspace', label: t('app.openWorkspaceFile'), category: t('settings.shortcutCoreCategory') },
      { id: 'diagnostics', label: t('app.diagnosticsCenter'), category: t('settings.shortcutCoreCategory') },
      { id: 'onboarding', label: t('app.onboardingTitle'), category: t('settings.shortcutCoreCategory') },
      { id: 'settings', label: t('app.openSettings'), category: t('settings.shortcutCoreCategory') },
      { id: 'arrange-h', label: t('app.alignHorizontalBtn'), category: t('settings.shortcutLayoutCategory') },
      { id: 'arrange-v', label: t('app.alignVerticalBtn'), category: t('settings.shortcutLayoutCategory') },
      { id: 'arrange-g', label: t('app.alignGridBtn'), category: t('settings.shortcutLayoutCategory') },
      { id: 'merge-all', label: t('app.mergeAllBtn'), category: t('settings.shortcutLayoutCategory') },
      { id: 'toggle-theme', label: t('settings.shortcutToggleTheme'), category: t('settings.shortcutCoreCategory') },
      { id: 'font-up', label: t('common.fontSizeIncrease'), category: t('settings.shortcutCoreCategory') },
      { id: 'font-down', label: t('common.fontSizeDecrease'), category: t('settings.shortcutCoreCategory') },
      { id: 'save-layout', label: t('app.saveLayout'), category: t('settings.shortcutLayoutCategory') },
      { id: 'restore-layout', label: t('app.loadLayout'), category: t('settings.shortcutLayoutCategory') },
      { id: 'reset-layout', label: t('app.resetLayout'), category: t('settings.shortcutLayoutCategory') },
    ];
    const extensionCommands = extensionInfos.flatMap((extension) =>
      extension.commands.map((command) => ({
        id: `extension:${command.id}`,
        label: command.titleKey ? t(command.titleKey) : command.title,
        category: `${t('settings.shortcutExtensionCategory')} · ${extension.name}`,
      })),
    );
    const workBlockCommands = (settings?.terminalWorkBlocks ?? []).map((block) => {
      const groupName = block.group || block.terminalKind || 'terminal';
      return {
        id: buildWorkBlockCommandId(block),
        label: t('app.workBlockPaletteLabel', { label: block.label }),
        category: `${t('app.workBlocksTitle')} · ${groupName}`,
        searchText: [block.command, block.cwd, block.group, block.terminalKind].join(' '),
      };
    });
    return [...coreCommands, ...workBlockCommands, ...extensionCommands];
  }, [extensionInfos, settings?.terminalWorkBlocks, t]);

  const renderSecretVaultKindLabel = useCallback(
    (kind: SecretVaultStatus['items'][number]['kind']) => {
      switch (kind) {
        case 'api-key':
          return t('settings.secretVaultKindApiKey');
        case 'remote-password':
          return t('settings.secretVaultKindRemotePassword');
        case 'remote-passphrase':
          return t('settings.secretVaultKindRemotePassphrase');
        case 'token':
          return t('settings.secretVaultKindToken');
        case 'generic':
          return t('settings.secretVaultKindGeneric');
        default:
          return kind;
      }
    },
    [t],
  );

  const handleSecretVaultClear = useCallback(async () => {
    setSecretVaultBusy(true);
    setSecretVaultMessage('');
    try {
      const status = await window.secretVaultAPI.clear();
      setSecretVaultStatus(status);
      setSecretVaultMode(status.mode);
      setSecretVaultMessage(t('settings.secretVaultCleared'));
      await window.terminalAPI
        .getSettings()
        .then(applySettingsToState)
        .catch((error) => {
          setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
        });
    } catch (error) {
      setSecretVaultMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSecretVaultBusy(false);
    }
  }, [applySettingsToState, t]);

  const handleSettingsBackupExport = useCallback(async () => {
    setSettingsBackupBusy(true);
    setSettingsBackupMessage('');
    try {
      const result = await window.terminalAPI.exportSettings();
      setSettingsBackupMessage(
        result.saved && result.path
          ? t('settings.settingsBackupExported', { path: result.path })
          : t('settings.settingsBackupCancelled'),
      );
    } catch (error) {
      setSettingsBackupMessage(
        t('settings.settingsBackupFailed', {
          e: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setSettingsBackupBusy(false);
    }
  }, [t]);

  const handleSettingsBackupImport = useCallback(async () => {
    if (!window.confirm(t('settings.settingsBackupImportConfirm'))) {
      return;
    }

    setSettingsBackupBusy(true);
    setSettingsBackupMessage('');
    try {
      const result = await window.terminalAPI.importSettings();
      if (!result.imported) {
        setSettingsBackupMessage(t('settings.settingsBackupCancelled'));
        return;
      }
      applySettingsToState(result.settings);
      const importedMessage = t('settings.settingsBackupImported', { path: result.path ?? '' });
      const previousMessage = result.previousBackupPath
        ? t('settings.settingsBackupPreviousSaved', { path: result.previousBackupPath })
        : '';
      setSettingsBackupMessage([importedMessage, previousMessage].filter(Boolean).join(' '));
      await Promise.all([
        loadExtensions().catch(() => setExtensionInfos([])),
        loadSecretVaultStatus().catch(() => setSecretVaultStatus(null)),
        loadSettingsBackups().catch(() => setSettingsBackupItems([])),
      ]);
      window.dispatchEvent(new CustomEvent('app-settings-changed', { detail: result.settings }));
      window.dispatchEvent(new CustomEvent('extensions-changed'));
    } catch (error) {
      setSettingsBackupMessage(
        t('settings.settingsBackupFailed', {
          e: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setSettingsBackupBusy(false);
    }
  }, [applySettingsToState, loadExtensions, loadSecretVaultStatus, loadSettingsBackups, t]);

  const handleSettingsBackupRestore = useCallback(
    async (item: SettingsBackupListItem) => {
      if (!window.confirm(t('settings.settingsBackupRestoreConfirm', { name: item.fileName }))) {
        return;
      }

      setSettingsBackupBusy(true);
      setSettingsBackupMessage('');
      try {
        const result = await window.terminalAPI.restoreSettingsBackup(item.path);
        applySettingsToState(result.settings);
        const importedMessage = t('settings.settingsBackupRestored', { path: result.path ?? item.path });
        const previousMessage = result.previousBackupPath
          ? t('settings.settingsBackupPreviousSaved', { path: result.previousBackupPath })
          : '';
        setSettingsBackupMessage([importedMessage, previousMessage].filter(Boolean).join(' '));
        await Promise.all([
          loadExtensions().catch(() => setExtensionInfos([])),
          loadSecretVaultStatus().catch(() => setSecretVaultStatus(null)),
          loadSettingsBackups().catch(() => setSettingsBackupItems([])),
        ]);
        window.dispatchEvent(new CustomEvent('app-settings-changed', { detail: result.settings }));
        window.dispatchEvent(new CustomEvent('extensions-changed'));
      } catch (error) {
        setSettingsBackupMessage(
          t('settings.settingsBackupFailed', {
            e: error instanceof Error ? error.message : String(error),
          }),
        );
      } finally {
        setSettingsBackupBusy(false);
      }
    },
    [applySettingsToState, loadExtensions, loadSecretVaultStatus, loadSettingsBackups, t],
  );

  const handleSave = useCallback(() => {
    if (!settings) {
      setSettingsSaveError(t('settings.settingsSaveFailed', { e: 'Settings were not loaded.' }));
      return;
    }
    if (xenisPhase5Enabled && parsePort(xamongPortStr) === null) {
      setXamongPortError(t('settings.portRange', { min: String(PORT_MIN), max: String(PORT_MAX) }));
      return;
    }
    if (parsePort(xenesisPortStr) === null) {
      setXenesisPortError(t('settings.portRange', { min: String(PORT_MIN), max: String(PORT_MAX) }));
      return;
    }
    if (xenisPhase5Enabled && (xamongWorkerTierPoliciesError || !isPlainJsonObjectText(xamongWorkerTierPolicies))) {
      setXamongWorkerTierPoliciesError(t('settings.jsonFormat'));
      return;
    }

    const normalizedAiProvider = normalizeAiProvider(aiProvider);
    const updatedAiProviderProfiles = aiProviderProfiles.map((profile) =>
      profile.id === activeAiProviderProfileId
        ? { ...profile, settings: normalizedAiProvider, updatedAt: Date.now() }
        : profile,
    );

    const updated: Partial<AppSettings> = {
      theme,
      fontSize,
      defaultShell,
      defaultCwd,
      captureDir,
      aiProvider: normalizedAiProvider,
      aiProviderProfiles: updatedAiProviderProfiles,
      activeAiProviderProfileId,
      gowooriChat: {
        ...(settings?.gowooriChat ?? DEFAULT_GOWOORI_CHAT_SETTINGS),
        sportsStandingsEndpoint: gowooriChatSportsStandingsEndpoint.trim(),
      },
      apiUrl: apiUrl.trim() || DEFAULT_API_URL,
      ...(xenisPhase5Enabled ? { xamongCode: buildXamongCodeSettings() } : {}),
      xenesis: buildXenesisRuntimeSettings(),
      localCli: {
        selectedAgentId: localCliSelectedId,
        autoConfigureTerminal: localCliAutoConfigure,
      },
      remoteTerminals: {
        groups: terminalGroups,
        profiles: remoteProfiles,
        localProfiles,
      },
      remoteFiles: { groups: remoteFileGroups, profiles: remoteFileProfiles },
      windowSizer: { presets: windowSizerPresets },
      secretVault: {
        mode: secretVaultMode,
        items: settings?.secretVault?.items ?? [],
      },
      terminalRestore: terminalRestoreSettings,
      keyboardShortcuts: { bindings: keyboardShortcutBindings },
      workspace: workspaceSettings,
      updater: updaterSettings,
    };

    setSettingsSaveError('');
    saveUpdatedSettings(updated)
      .then(() => {
        setLocale(draftLocale);
        setSaved(true);
        setSettingsSaveError('');
        loadSecretVaultStatus().catch(() => {});
        setTimeout(() => setSaved(false), 2000);
      })
      .catch((error) => {
        setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
      });
  }, [
    activeAiProviderProfileId,
    aiProvider,
    aiProviderProfiles,
    apiUrl,
    buildXamongCodeSettings,
    buildXenesisRuntimeSettings,
    captureDir,
    defaultCwd,
    defaultShell,
    draftLocale,
    fontSize,
    keyboardShortcutBindings,
    gowooriChatSportsStandingsEndpoint,
    localCliAutoConfigure,
    localCliSelectedId,
    localProfiles,
    loadSecretVaultStatus,
    remoteFileGroups,
    remoteFileProfiles,
    remoteProfiles,
    saveUpdatedSettings,
    secretVaultMode,
    settings,
    setLocale,
    t,
    terminalGroups,
    terminalRestoreSettings,
    theme,
    updaterSettings,
    workspaceSettings,
    windowSizerPresets,
    xamongPortStr,
    xamongWorkerTierPolicies,
    xamongWorkerTierPoliciesError,
    xenisPhase5Enabled,
    xenesisPortStr,
  ]);

  const terminalProfileItems: TerminalProfileListItem[] = [
    ...localProfiles.map((profile) => ({ type: 'local' as const, profile })),
    ...remoteProfiles.map((profile) => ({ type: 'remote' as const, profile })),
  ];
  const selectedTerminalItem =
    terminalProfileItems.find((item) => `${item.type}:${item.profile.id}` === selectedTerminalProfileId) ??
    terminalProfileItems[0] ??
    null;
  const selectedLocalProfile = selectedTerminalItem?.type === 'local' ? selectedTerminalItem.profile : null;
  const selectedRemoteProfile = selectedTerminalItem?.type === 'remote' ? selectedTerminalItem.profile : null;
  const selectedRemoteFileProfile =
    remoteFileProfiles.find((profile) => profile.id === selectedRemoteFileProfileId) ?? remoteFileProfiles[0] ?? null;
  const selectedWindowSizerPreset =
    windowSizerPresets.find((preset) => preset.id === selectedWindowSizerPresetId) ?? windowSizerPresets[0] ?? null;

  const patchTerminalGroup = useCallback(
    (groupId: string, patch: Partial<TerminalProfileGroup>) => {
      markRemoteProfileSettingsDirty();
      setTerminalGroups((prev) =>
        prev.map((group) => {
          if (group.id !== groupId) return group;
          return { ...group, ...patch, updatedAt: Date.now() };
        }),
      );
    },
    [markRemoteProfileSettingsDirty],
  );

  const handleTerminalGroupAdd = useCallback(() => {
    const group = createBlankTerminalGroup();
    markRemoteProfileSettingsDirty();
    setTerminalGroups((prev) => [...prev, group]);
  }, [markRemoteProfileSettingsDirty]);

  const handleTerminalGroupDelete = useCallback(
    (groupId: string) => {
      markRemoteProfileSettingsDirty();
      setTerminalGroups((prev) => prev.filter((group) => group.id !== groupId));
      setRemoteProfiles((prev) =>
        prev.map((profile) =>
          profile.groupId === groupId ? { ...profile, groupId: '', updatedAt: Date.now() } : profile,
        ),
      );
      setLocalProfiles((prev) =>
        prev.map((profile) =>
          profile.groupId === groupId ? { ...profile, groupId: '', updatedAt: Date.now() } : profile,
        ),
      );
    },
    [markRemoteProfileSettingsDirty],
  );

  const patchRemoteProfile = useCallback(
    (profileId: string, patch: Partial<RemoteTerminalProfile>) => {
      markRemoteProfileSettingsDirty();
      setRemoteProfiles((prev) =>
        prev.map((profile) => {
          if (profile.id !== profileId) return profile;
          return { ...profile, ...patch, updatedAt: Date.now() };
        }),
      );
    },
    [markRemoteProfileSettingsDirty],
  );

  const patchLocalProfile = useCallback(
    (profileId: string, patch: Partial<LocalTerminalProfile>) => {
      markRemoteProfileSettingsDirty();
      setLocalProfiles((prev) =>
        prev.map((profile) => {
          if (profile.id !== profileId) return profile;
          return { ...profile, ...patch, updatedAt: Date.now() };
        }),
      );
    },
    [markRemoteProfileSettingsDirty],
  );

  const handleRemoteProfileAdd = useCallback(
    (protocol: RemoteTerminalProtocol = 'ssh') => {
      const profile = createBlankRemoteProfile(protocol);
      markRemoteProfileSettingsDirty();
      setRemoteProfiles((prev) => [...prev, profile]);
      setSelectedTerminalProfileId(`remote:${profile.id}`);
    },
    [markRemoteProfileSettingsDirty],
  );

  const handleLocalProfileAdd = useCallback(
    (shell: ShellKind = defaultShell) => {
      const profile = createBlankLocalProfile(shell);
      markRemoteProfileSettingsDirty();
      setLocalProfiles((prev) => [...prev, profile]);
      setSelectedTerminalProfileId(`local:${profile.id}`);
    },
    [defaultShell, markRemoteProfileSettingsDirty],
  );

  const handleRemoteProfileDelete = useCallback(
    (profileId: string) => {
      markRemoteProfileSettingsDirty();
      setRemoteProfiles((prev) => {
        const next = prev.filter((profile) => profile.id !== profileId);
        setSelectedTerminalProfileId((current) =>
          current === `remote:${profileId}`
            ? localProfiles[0]
              ? `local:${localProfiles[0].id}`
              : next[0]
                ? `remote:${next[0].id}`
                : ''
            : current,
        );
        return next;
      });
    },
    [localProfiles, markRemoteProfileSettingsDirty],
  );

  const handleLocalProfileDelete = useCallback(
    (profileId: string) => {
      markRemoteProfileSettingsDirty();
      setLocalProfiles((prev) => {
        const next = prev.filter((profile) => profile.id !== profileId);
        setSelectedTerminalProfileId((current) =>
          current === `local:${profileId}`
            ? next[0]
              ? `local:${next[0].id}`
              : remoteProfiles[0]
                ? `remote:${remoteProfiles[0].id}`
                : ''
            : current,
        );
        return next;
      });
    },
    [markRemoteProfileSettingsDirty, remoteProfiles],
  );

  const handleRemoteProtocolChange = useCallback(
    (profile: RemoteTerminalProfile, protocol: RemoteTerminalProtocol) => {
      patchRemoteProfile(profile.id, {
        protocol,
        port: defaultRemotePort(protocol),
      });
    },
    [patchRemoteProfile],
  );

  const handleRemoteConnect = useCallback((profile: RemoteTerminalProfile | null) => {
    if (!profile?.host.trim()) return;
    window.dispatchEvent(new CustomEvent<RemoteTerminalProfile>('app-open-remote-terminal', { detail: profile }));
  }, []);

  const handleLocalConnect = useCallback((profile: LocalTerminalProfile | null) => {
    if (!profile) return;
    window.dispatchEvent(new CustomEvent<LocalTerminalProfile>('app-open-local-terminal', { detail: profile }));
  }, []);

  const patchRemoteFileGroup = useCallback(
    (groupId: string, patch: Partial<TerminalProfileGroup>) => {
      markRemoteProfileSettingsDirty();
      setRemoteFileGroups((prev) =>
        prev.map((group) => {
          if (group.id !== groupId) return group;
          return { ...group, ...patch, updatedAt: Date.now() };
        }),
      );
    },
    [markRemoteProfileSettingsDirty],
  );

  const handleRemoteFileGroupAdd = useCallback(() => {
    const group = createBlankTerminalGroup();
    markRemoteProfileSettingsDirty();
    setRemoteFileGroups((prev) => [...prev, group]);
  }, [markRemoteProfileSettingsDirty]);

  const handleRemoteFileGroupDelete = useCallback(
    (groupId: string) => {
      markRemoteProfileSettingsDirty();
      setRemoteFileGroups((prev) => prev.filter((group) => group.id !== groupId));
      setRemoteFileProfiles((prev) =>
        prev.map((profile) =>
          profile.groupId === groupId ? { ...profile, groupId: '', updatedAt: Date.now() } : profile,
        ),
      );
    },
    [markRemoteProfileSettingsDirty],
  );

  const patchRemoteFileProfile = useCallback(
    (profileId: string, patch: Partial<RemoteFileProfile>) => {
      markRemoteProfileSettingsDirty();
      setRemoteFileProfiles((prev) =>
        prev.map((profile) => {
          if (profile.id !== profileId) return profile;
          return { ...profile, ...patch, updatedAt: Date.now() };
        }),
      );
      setRemoteFileTestMessage('');
    },
    [markRemoteProfileSettingsDirty],
  );

  const handleRemoteFileProfileAdd = useCallback(
    (protocol: RemoteFileProtocol = 'ftp') => {
      const profile = createBlankRemoteFileProfile(protocol);
      markRemoteProfileSettingsDirty();
      setRemoteFileProfiles((prev) => [...prev, profile]);
      setSelectedRemoteFileProfileId(profile.id);
      setRemoteFileTestMessage('');
    },
    [markRemoteProfileSettingsDirty],
  );

  const handleRemoteFileProfileDelete = useCallback(
    (profileId: string) => {
      markRemoteProfileSettingsDirty();
      setRemoteFileProfiles((prev) => {
        const next = prev.filter((profile) => profile.id !== profileId);
        setSelectedRemoteFileProfileId((current) => (current === profileId ? (next[0]?.id ?? '') : current));
        return next;
      });
      setRemoteFileTestMessage('');
    },
    [markRemoteProfileSettingsDirty],
  );

  const handleRemoteFileProtocolChange = useCallback(
    (profile: RemoteFileProfile, protocol: RemoteFileProtocol) => {
      patchRemoteFileProfile(profile.id, {
        protocol,
        port: defaultRemoteFilePort(protocol),
      });
    },
    [patchRemoteFileProfile],
  );

  const handleRemoteFileTest = useCallback(
    async (profile: RemoteFileProfile | null) => {
      if (!profile?.host.trim()) return;
      setRemoteFileTesting(true);
      setRemoteFileTestMessage('');
      try {
        const result = await window.remoteFileAPI.test(profile);
        setRemoteFileTestMessage(
          result.ok ? t('settings.remoteFileTestOk') : result.message || t('settings.remoteFileTestFailed'),
        );
      } catch (error) {
        setRemoteFileTestMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setRemoteFileTesting(false);
      }
    },
    [t],
  );

  const patchWindowSizerPreset = useCallback((presetId: string, patch: Partial<WindowSizerPreset>) => {
    setWindowSizerPresets((prev) =>
      prev.map((preset) => {
        if (preset.id !== presetId) return preset;
        return { ...preset, ...patch, updatedAt: Date.now() };
      }),
    );
  }, []);

  const handleWindowSizerPresetAdd = useCallback(() => {
    const preset = createBlankWindowSizerPreset();
    setWindowSizerPresets((prev) => [...prev, preset]);
    setSelectedWindowSizerPresetId(preset.id);
  }, []);

  const handleWindowSizerPresetAddCurrent = useCallback(async () => {
    const bounds = await window.fileAPI.getCurrentWindowBounds();
    const preset = createBlankWindowSizerPreset(bounds ?? undefined);
    preset.name = bounds
      ? t('settings.windowSizerCurrentName', { width: String(bounds.width), height: String(bounds.height) })
      : preset.name;
    preset.group = t('settings.windowSizerCustomGroup');
    setWindowSizerPresets((prev) => [...prev, preset]);
    setSelectedWindowSizerPresetId(preset.id);
  }, [t]);

  const handleWindowSizerPresetDelete = useCallback((presetId: string) => {
    setWindowSizerPresets((prev) => {
      const next = prev.filter((preset) => preset.id !== presetId);
      setSelectedWindowSizerPresetId((current) => (current === presetId ? (next[0]?.id ?? '') : current));
      return next;
    });
  }, []);

  const handleWindowSizerApply = useCallback((preset: WindowSizerPreset | null) => {
    if (!preset) return;
    window.fileAPI.applyWindowSizerPreset(preset).catch(() => {});
  }, []);

  const handleXamongToggle = useCallback(async () => {
    if (!xenisPhase5Enabled) return;
    if (xamongPortError) return;
    setXamongBusy(true);
    try {
      const xamongCode = buildXamongCodeSettings();
      if (!xamongStatus.running) {
        await saveUpdatedSettings({ xamongCode });
      }
      const st = xamongStatus.running ? await window.xamongCodeAPI.stop() : await window.xamongCodeAPI.start();
      setXamongStatus(st);

      if (st.running) {
        const agentUrl = st.port === DEFAULT_XAMONG_CODE_PORT && st.host === DEFAULT_XAMONG_CODE_HOST ? '' : st.url;
        const nextAiProvider = { ...aiProvider, xcAgentApiUrl: agentUrl };
        setAiProvider(nextAiProvider);
        await saveUpdatedSettings({ aiProvider: nextAiProvider, xamongCode });
      }
    } catch (error) {
      setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
    } finally {
      setXamongBusy(false);
      pollXamongStatus();
    }
  }, [
    aiProvider,
    buildXamongCodeSettings,
    pollXamongStatus,
    saveUpdatedSettings,
    t,
    xenisPhase5Enabled,
    xamongPortError,
    xamongStatus.running,
  ]);

  const handleXenesisGatewayAction = useCallback(
    async (action: 'start' | 'stop' | 'restart' | 'refresh') => {
      if (xenesisPortError) return;
      setXenesisGatewayBusy(true);
      setXenesisGatewayMessage('');
      try {
        let status: XenesisStatus;
        if (action === 'refresh') {
          status = await window.xenesisAPI.gatewayStatus();
        } else if (action === 'stop') {
          status = await window.xenesisAPI.gatewayStop();
        } else {
          await saveUpdatedSettings({ xenesis: buildXenesisRuntimeSettings() });
          status =
            action === 'restart' ? await window.xenesisAPI.gatewayRestart() : await window.xenesisAPI.gatewayStart();
        }
        setXenesisGatewayStatus(status);
        const gateway = status.gateway;
        if (gateway.error) {
          setXenesisGatewayMessage(gateway.error);
        } else if (gateway.running) {
          setXenesisGatewayMessage(t('settings.xenesisGatewayStatusRunning'));
        } else {
          setXenesisGatewayMessage(t('settings.xenesisGatewayStatusStopped'));
        }
      } catch (error) {
        setXenesisGatewayMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setXenesisGatewayBusy(false);
      }
    },
    [buildXenesisRuntimeSettings, saveUpdatedSettings, t, xenesisPortError],
  );

  const handleXenesisGatewayOpenDashboard = useCallback(async () => {
    setXenesisGatewayBusy(true);
    setXenesisGatewayMessage('');
    try {
      const status = await window.xenesisAPI.gatewayOpenDashboard();
      setXenesisGatewayStatus(status);
      setXenesisGatewayMessage(status.gateway.error || t('settings.xenesisGatewayDashboardOpened'));
    } catch (error) {
      setXenesisGatewayMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setXenesisGatewayBusy(false);
    }
  }, [t]);

  const handleUpdCheck = useCallback(async () => {
    setUpdBusy(true);
    try {
      await saveUpdatedSettings({ updater: updaterSettings });
      setSettingsSaveError('');
      await window.updaterAPI?.check().catch(() => {});
    } catch (error) {
      setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
    } finally {
      setUpdBusy(false);
    }
  }, [saveUpdatedSettings, t, updaterSettings]);

  const handleUpdDownload = useCallback(async () => {
    setUpdBusy(true);
    await window.updaterAPI?.download().catch(() => {});
    setUpdBusy(false);
  }, []);

  const handleUpdInstall = useCallback(() => {
    window.updaterAPI?.install();
  }, []);

  const activeMeta =
    VISIBLE_SETTINGS_CATEGORIES.find((category) => category.id === activeCategory) ?? VISIBLE_SETTINGS_CATEGORIES[0];
  const activeProviderMeta = AI_PROVIDERS[aiProvider.provider];
  const visibleSecretVaultItems = useMemo(
    () => filterXenisPhase5SecretVaultItems(secretVaultStatus?.items ?? [], { xenisPhase5: xenisPhase5Enabled }),
    [secretVaultStatus?.items, xenisPhase5Enabled],
  );

  const renderInputReset = (title: string, onClick: () => void) => (
    <button className="sp-btn-ghost sp-icon-btn" title={title} onClick={onClick}>
      ↺
    </button>
  );

  const renderGeneral = () => (
    <div className="sp-stack">
      {/* ── 사용자 프로필 ──────────────────────────────────────────────────── */}
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.userProfile')}</h2>
            <p>{t('settings.userProfileDesc')}</p>
          </div>
          {!profileEditMode && (
            <div className="sp-actions-row sp-actions-row-tight">
              <button className="sp-btn-ghost" onClick={() => startProfileEdit(profileUser)}>
                {profileUser ? t('settings.editProfile') : t('settings.manualRegister')}
              </button>
              {profileUser && (
                <button className="sp-btn-ghost sp-btn-danger-ghost" onClick={handleProfileLogout}>
                  {t('common.logout')}
                </button>
              )}
            </div>
          )}
        </div>

        {!profileEditMode ? (
          profileUser ? (
            /* 로그인 상태: 프로필 카드 */
            <div className="sp-profile-card">
              <div className="sp-profile-avatar">{profileUser.name.charAt(0).toUpperCase()}</div>
              <div className="sp-profile-info">
                <div className="sp-info-list">
                  <div>
                    <span>{t('settings.profileName')}</span>
                    <strong>{profileUser.name}</strong>
                  </div>
                  <div>
                    <span>{t('settings.profileEmail')}</span>
                    <strong>{profileUser.email}</strong>
                  </div>
                  <div>
                    <span>{t('settings.profileId')}</span>
                    <strong>{profileUser.id || '—'}</strong>
                  </div>
                  <div>
                    <span>{t('settings.profilePlan')}</span>
                    <strong>
                      {profileUser.plan === '1'
                        ? t('settings.profilePlanBasic')
                        : profileUser.plan === '2'
                          ? t('settings.profilePlanPro')
                          : profileUser.plan
                            ? t('common.planOther', { plan: profileUser.plan })
                            : '—'}
                    </strong>
                  </div>
                  <div>
                    <span>{t('settings.profileProvider')}</span>
                    <strong>{profileUser.provider || '—'}</strong>
                  </div>
                  {profileUser.subscription && (
                    <div>
                      <span>{t('settings.profileSubscription')}</span>
                      <strong>{profileUser.subscription}</strong>
                    </div>
                  )}
                  {(() => {
                    let token = '';
                    try {
                      const s = JSON.parse(localStorage.getItem('sessionInfo') ?? '{}');
                      token = s?.access_token ?? '';
                    } catch {
                      /* ignore */
                    }
                    return token ? (
                      <div>
                        <span>{t('settings.profileJwtToken')}</span>
                        <strong className="sp-token-badge">{t('settings.profileJwtRegistered')}</strong>
                      </div>
                    ) : (
                      <div>
                        <span>{t('settings.profileJwtToken')}</span>
                        <strong className="sp-token-badge sp-token-none">{t('settings.profileJwtNone')}</strong>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* 비로그인 상태 */
            <div className="sp-empty-block">
              {t('settings.profileNoAccount')} {t('settings.profileLoginHintPre')}{' '}
              <strong>👤 {t('common.login')}</strong> {t('settings.profileLoginHintMid')}{' '}
              <strong>{t('settings.manualRegister')}</strong>
              {t('settings.profileLoginHintPost')}
            </div>
          )
        ) : (
          /* 편집 폼 */
          <div className="sp-profile-edit-form">
            <div className="sp-grid two">
              <div className="sp-field">
                <label className="sp-label" htmlFor="sp-profile-name">
                  {t('settings.profileNameLabel')}
                </label>
                <input
                  id="sp-profile-name"
                  className="sp-input"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder={t('settings.profileNamePlaceholder')}
                  autoFocus
                />
              </div>
              <div className="sp-field">
                <label className="sp-label" htmlFor="sp-profile-email">
                  {t('settings.profileEmailLabel')}
                </label>
                <input
                  id="sp-profile-email"
                  className="sp-input"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            </div>
            <div className="sp-grid two">
              <div className="sp-field">
                <label className="sp-label" htmlFor="sp-profile-id">
                  {t('settings.profileId')} (userid)
                </label>
                <input
                  id="sp-profile-id"
                  className="sp-input"
                  type="text"
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  placeholder={t('settings.profileIdPlaceholder')}
                  spellCheck={false}
                />
                <p className="sp-hint">{t('settings.profileIdHint')}</p>
              </div>
              <div className="sp-field">
                <label className="sp-label" htmlFor="sp-profile-plan">
                  {t('settings.profilePlanLabel')}
                </label>
                <select
                  id="sp-profile-plan"
                  className="sp-input"
                  value={profilePlan}
                  onChange={(e) => setProfilePlan(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="1">{t('settings.profilePlanBasic')}</option>
                  <option value="2">{t('settings.profilePlanPro')}</option>
                  <option value="3">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-profile-token">
                {t('settings.profileJwtTokenLabel')}
              </label>
              <div className="sp-input-row">
                <input
                  id="sp-profile-token"
                  className="sp-input sp-input-mono"
                  type={profileShowToken ? 'text' : 'password'}
                  value={profileToken}
                  onChange={(e) => setProfileToken(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  spellCheck={false}
                  autoComplete="off"
                />
                <button
                  className="sp-btn-ghost sp-icon-btn"
                  title={profileShowToken ? t('settings.profileJwtHideTitle') : t('settings.profileJwtShowTitle')}
                  onClick={() => setProfileShowToken((v) => !v)}
                >
                  {profileShowToken ? t('settings.profileJwtHidden') : t('settings.profileJwtShown')}
                </button>
                {profileToken && (
                  <button
                    className="sp-btn-ghost sp-icon-btn"
                    title={t('settings.profileJwtResetTitle')}
                    onClick={() => setProfileToken('')}
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="sp-hint">{t('settings.profileJwtHint')}</p>
            </div>

            <div className="sp-actions-row">
              <button className="sp-btn-ghost" onClick={() => setProfileEditMode(false)}>
                {t('settings.profileCancel')}
              </button>
              <button
                className={cls('sp-btn sp-btn-primary', profileSaved && 'sp-btn-saved')}
                disabled={!profileName.trim() || !profileEmail.trim()}
                onClick={handleProfileSave}
              >
                {profileSaved ? t('settings.profileSaved') : t('settings.profileSave')}
              </button>
            </div>
          </div>
        )}
      </section>

      {xenisPhase5Enabled && (
        <section className="sp-section" data-settings-section="xamong-agent-workers">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.workerTitle')}</h2>
              <p>{t('settings.workerDesc')}</p>
            </div>
            <div className="sp-actions-row">
              <button
                className="sp-btn"
                disabled={xamongWorkerBusy || !xamongStatus.running}
                onClick={fetchXamongWorkers}
              >
                {xamongWorkerBusy ? t('settings.workerRefreshing') : t('settings.workerRefresh')}
              </button>
              <button
                className="sp-btn sp-btn-danger"
                disabled={xamongWorkerBusy || !xamongStatus.running || !xamongWorkerStatus?.total}
                onClick={() => closeXamongWorkers()}
              >
                {t('settings.workerStopAll')}
              </button>
            </div>
          </div>

          {!xamongStatus.running ? (
            <div className="sp-empty-block">{t('settings.workerNoServer')}</div>
          ) : xamongWorkerError ? (
            <div className="sp-empty-block">
              {t('settings.workerStatusError')} {xamongWorkerError}
            </div>
          ) : (
            <>
              <div className="sp-grid four">
                <div className="sp-info-card">
                  <strong>{t('settings.workerTotal')}</strong>
                  <span>{xamongWorkerStatus?.total ?? 0}</span>
                </div>
                <div className="sp-info-card">
                  <strong>{t('settings.workerActive')}</strong>
                  <span>{xamongWorkerStatus?.active ?? 0}</span>
                </div>
                <div className="sp-info-card">
                  <strong>{t('settings.workerIdle')}</strong>
                  <span>{xamongWorkerStatus?.idle ?? 0}</span>
                </div>
                <div className="sp-info-card">
                  <strong>Warm</strong>
                  <span>{xamongWorkerStatus?.warm ?? 0}</span>
                </div>
              </div>
              <div className="sp-info-list sp-worker-list">
                <div>
                  <span>{t('settings.workerPolicy')}</span>
                  <strong>
                    {xamongWorkerStatus?.enabled
                      ? `maxTotal ${xamongWorkerStatus.maxTotal}, maxPerUser ${xamongWorkerStatus.maxPerUser}, warm ${xamongWorkerStatus.warmPoolSize}`
                      : t('settings.workerPolicyDisabled')}
                  </strong>
                </div>
                {(xamongWorkerStatus?.workers ?? []).length === 0 ? (
                  <div>
                    <span>{t('settings.workerList')}</span>
                    <strong>{t('settings.workerNone')}</strong>
                  </div>
                ) : (
                  (xamongWorkerStatus?.workers ?? []).map((worker) => (
                    <div key={worker.key} className="sp-worker-row">
                      <span>
                        {worker.warm ? 'warm' : worker.active ? 'active' : 'idle'} · {worker.tier || 'default'}
                      </span>
                      <strong title={worker.key}>{worker.sessionId || worker.warmKey || worker.key}</strong>
                      <button
                        className="sp-btn-ghost sp-btn-sm"
                        disabled={xamongWorkerBusy}
                        onClick={() => closeXamongWorkers(worker.key)}
                      >
                        {t('settings.workerStop')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      )}

      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.captureTitle')}</h2>
            <p>{t('settings.captureDesc')}</p>
          </div>
        </div>

        <div className="sp-field">
          <label className="sp-label" htmlFor="sp-capture-dir">
            {t('settings.captureFolderLabel')}
          </label>
          <div className="sp-input-row">
            <input
              id="sp-capture-dir"
              className="sp-input"
              type="text"
              value={captureDir}
              readOnly
              placeholder={t('settings.captureDefaultPlaceholder')}
            />
            <button
              className="sp-btn-ghost sp-icon-btn"
              title={t('settings.captureFolderSelectTitle')}
              onClick={async () => {
                const selected = await window.terminalAPI.selectCwd();
                if (selected !== null) setCaptureDir(selected);
              }}
            >
              …
            </button>
            {captureDir && (
              <button
                className="sp-btn-ghost sp-icon-btn"
                title={t('settings.captureResetTitle')}
                onClick={() => setCaptureDir('')}
              >
                ✕
              </button>
            )}
          </div>
          <p className="sp-hint">{t('settings.captureHint')}</p>
        </div>
      </section>
    </div>
  );

  const renderXenesisRuntime = () => {
    return (
      <section className="sp-section" data-settings-section="xenesis-runtime">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.xenesisRuntimeTitle')}</h2>
            <p>{t('settings.xenesisRuntimeDesc')}</p>
          </div>
        </div>

        <div className="sp-grid two">
          <div className="sp-field sp-field-inline">
            <label className="sp-label" htmlFor="sp-xenesis-enabled">
              {t('settings.xenesisRuntimeEnabled')}
            </label>
            <button
              id="sp-xenesis-enabled"
              className={cls('sp-toggle', xenesisEnabled && 'sp-toggle-on')}
              role="switch"
              aria-checked={xenesisEnabled}
              onClick={() => setXenesisEnabled((v) => !v)}
            >
              <span className="sp-toggle-thumb" />
            </button>
            <span className="sp-toggle-label">
              {xenesisEnabled ? t('settings.xenesisRuntimeEnabledOn') : t('settings.xenesisRuntimeEnabledOff')}
            </span>
          </div>

          <div className="sp-field sp-field-inline">
            <label className="sp-label" htmlFor="sp-xenesis-mcp">
              {t('settings.xenesisMcpLabel')}
            </label>
            <button
              id="sp-xenesis-mcp"
              className={cls('sp-toggle', xenesisMcpEnabled && 'sp-toggle-on')}
              role="switch"
              aria-checked={xenesisMcpEnabled}
              onClick={() => setXenesisMcpEnabled((v) => !v)}
            >
              <span className="sp-toggle-thumb" />
            </button>
            <span className="sp-toggle-label">
              {xenesisMcpEnabled ? t('settings.xenesisMcpOn') : t('settings.xenesisMcpOff')}
            </span>
          </div>
        </div>

        <div className="sp-mode-switch" role="tablist" aria-label={t('settings.xenesisRuntimeModeAriaLabel')}>
          <button
            id="sp-xenesis-runtime-mode-embedded"
            className={cls('sp-mode-option', xenesisRuntimeMode === 'embedded' && 'is-active')}
            onClick={() => setXenesisRuntimeMode('embedded')}
          >
            <strong>{t('settings.xenesisRuntimeModeEmbedded')}</strong>
            <span>{t('settings.xenesisRuntimeModeEmbeddedDesc')}</span>
          </button>
          <button
            id="sp-xenesis-runtime-mode-external"
            className={cls('sp-mode-option', xenesisRuntimeMode === 'externalGateway' && 'is-active')}
            onClick={() => setXenesisRuntimeMode('externalGateway')}
          >
            <strong>{t('settings.xenesisRuntimeModeExternalGateway')}</strong>
            <span>{t('settings.xenesisRuntimeModeExternalGatewayDesc')}</span>
          </button>
        </div>

        {xenesisRuntimeMode === 'externalGateway' && (
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xenesis-runtime-path">
              {t('settings.xenesisRuntimePathLabel')}
            </label>
            <div className="sp-input-row">
              <input
                id="sp-xenesis-runtime-path"
                className="sp-input"
                type="text"
                value={xenesisRuntimePath}
                placeholder={t('settings.xenesisRuntimePathPlaceholder')}
                onChange={(e) => setXenesisRuntimePath(e.target.value)}
                spellCheck={false}
              />
              <button
                className="sp-btn-ghost sp-icon-btn"
                title={t('settings.runtimePathSelectTitle')}
                onClick={async () => {
                  const selected = await window.terminalAPI.selectCwd();
                  if (selected) setXenesisRuntimePath(selected);
                }}
              >
                ...
              </button>
              {xenesisRuntimePath &&
                renderInputReset(t('settings.runtimePathAutoTitle'), () => setXenesisRuntimePath(''))}
            </div>
            <p className="sp-hint">{t('settings.xenesisRuntimePathHint')}</p>
          </div>
        )}

        <div className="sp-grid two">
          <div className="sp-field sp-field-inline">
            <label className="sp-label" htmlFor="sp-xenesis-autostart">
              {t('settings.xenesisAutoStart')}
            </label>
            <button
              id="sp-xenesis-autostart"
              className={cls('sp-toggle', xenesisAutoStart && 'sp-toggle-on')}
              role="switch"
              aria-checked={xenesisAutoStart}
              onClick={() => setXenesisAutoStart((v) => !v)}
            >
              <span className="sp-toggle-thumb" />
            </button>
            <span className="sp-toggle-label">
              {xenesisAutoStart ? t('settings.agentApiAutoStartOn') : t('settings.agentApiAutoStartOff')}
            </span>
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xenesis-approval">
              {t('settings.xenesisApprovalModeLabel')}
            </label>
            <select
              id="sp-xenesis-approval"
              className="sp-input"
              value={xenesisApprovalMode}
              onChange={(e) => setXenesisApprovalMode(e.target.value as XenesisApprovalMode)}
            >
              <option value="safe">{t('settings.xenesisApprovalSafe')}</option>
              <option value="readonly">{t('settings.xenesisApprovalReadonly')}</option>
              <option value="auto">{t('settings.xenesisApprovalAuto')}</option>
            </select>
          </div>
        </div>

        <div className="sp-grid two">
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xenesis-max-turns">
              {t('settings.xenesisMaxTurnsLabel')}
            </label>
            <input
              id="sp-xenesis-max-turns"
              className="sp-input"
              type="number"
              min={1}
              max={100}
              value={xenesisMaxTurnsStr}
              onChange={(e) => setXenesisMaxTurnsStr(e.target.value)}
            />
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xenesis-model">
              {t('settings.xenesisModelLabel')}
            </label>
            <input
              id="sp-xenesis-model"
              className="sp-input"
              type="text"
              value={xenesisModel}
              placeholder={t('settings.xenesisModelPlaceholder')}
              onChange={(e) => setXenesisModel(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="sp-field">
          <label className="sp-label" htmlFor="sp-xenesis-profile">
            {t('settings.xenesisProfileLabel')}
          </label>
          <div className="sp-input-row">
            <select
              id="sp-xenesis-profile"
              className="sp-input"
              value={xenesisProfile}
              disabled={xenesisProfileBusy}
              onChange={(e) => {
                void handleXenesisProfileSelect(e.target.value);
              }}
            >
              <option value="">{t('settings.xenesisProfileDefault')}</option>
              {(xenesisProfileState?.installed ?? []).map((profile) => (
                <option key={profile} value={profile}>
                  {profile}
                </option>
              ))}
            </select>
            <button
              className="sp-btn-ghost sp-icon-btn"
              title={t('settings.xenesisProfileRefreshTitle')}
              disabled={xenesisProfileBusy}
              onClick={() => {
                void loadXenesisProfiles();
              }}
            >
              ...
            </button>
          </div>
          {xenesisProfileState && xenesisProfileState.templates.length > 0 && (
            <div className="sp-actions-row sp-actions-row-tight">
              {xenesisProfileState.templates.map((template) => (
                <button
                  key={template.name}
                  className="sp-btn-ghost sp-btn-sm"
                  title={template.summary}
                  disabled={xenesisProfileBusy}
                  onClick={() => {
                    void handleXenesisProfileInstallTemplate(template.name);
                  }}
                >
                  {t('settings.xenesisProfileInstallTemplate', { name: template.name })}
                </button>
              ))}
            </div>
          )}
          <p className="sp-hint">{t('settings.xenesisRuntimeHint')}</p>
          {xenesisProfileState && (
            <p className="sp-hint">
              {t('settings.xenesisProfileStateHint', {
                active: xenesisProfileState.active || t('settings.xenesisProfileDefault'),
                count: String(xenesisProfileState.installed.length),
              })}
            </p>
          )}
          {xenesisProfilePolicyItems.length > 0 && (
            <div className="sp-mini-metrics sp-xenesis-profile-policy" aria-label="Xenesis profile policy">
              {xenesisProfilePolicyItems.map((item) => (
                <span key={item.label} className="sp-mini-metric">
                  <strong>{item.label}</strong>
                  <small>{item.value}</small>
                </span>
              ))}
            </div>
          )}
          {xenesisProfileError && <p className="sp-error">{xenesisProfileError}</p>}
        </div>
      </section>
    );
  };

  const xenesisConnectionStatusLabel = (status: XenesisConnectionStatus) => {
    switch (status) {
      case 'ready':
        return t('settings.xenesisConnectionsStatusReady');
      case 'needs-setup':
        return t('settings.xenesisConnectionsStatusNeedsSetup');
      case 'disabled':
        return t('settings.xenesisConnectionsStatusDisabled');
      case 'blocked':
        return t('settings.xenesisConnectionsStatusBlocked');
      case 'planned':
        return t('settings.xenesisConnectionsStatusPlanned');
      default:
        return t('settings.xenesisConnectionsStatusUnknown');
    }
  };

  const xenesisConnectionPillClass = (status: XenesisConnectionStatus) => {
    const tone = xenesisConnectionTone(status);
    if (tone === 'success') return 'sp-pill-on';
    if (tone === 'warning' || tone === 'info') return 'sp-pill-warning';
    if (tone === 'danger') return 'sp-pill-danger';
    return '';
  };

  const handleXenesisConnectionRequest = useCallback(
    async (request: McpBridgeCapabilityCallRequest | null) => {
      if (!request) return;
      if (!window.deskBridgeAPI?.callCapability) {
        setXenesisConnectionsError('Desk bridge API is unavailable.');
        return;
      }
      try {
        const result = await window.deskBridgeAPI.callCapability(request);
        if (!result.ok) {
          setXenesisConnectionsError(result.error || t('settings.xenesisConnectionsActionFailed'));
        }
      } catch (error) {
        setXenesisConnectionsError(error instanceof Error ? error.message : String(error));
      }
    },
    [t],
  );

  const renderXenesisConnectionItem = (item: XenesisConnectionItem) => {
    const openRequest = buildXenesisConnectionOpenRequest(item);
    const settingsRequest = buildXenesisConnectionSettingsRequest(item);
    const guideRequest = buildXenesisConnectionGuideRequest(item);
    const mcpTemplate = item.mcpTemplate;
    const providerSetup = item.providerSetup;
    const providerView = item.providerView;
    const providerRouting = item.providerRouting;
    const toolSetup = item.toolSetup;
    const toolInstallPlan = item.toolInstallPlan;
    const toolConnector = item.toolConnector;
    const toolView = item.toolView;
    const toolUserStory = item.toolUserStory;
    const messengerView = item.messengerView;
    const channelTemplate = item.channelTemplate;
    return (
      <div
        className={cls('sp-info-card', focusedXenesisConnectionId === item.id && 'is-focused')}
        key={item.id}
        data-xenesis-connection={item.id}
      >
        <div className="sp-section-heading">
          <div>
            <strong>{item.label}</strong>
            <span>{item.summary}</span>
          </div>
          <span className={cls('sp-pill', xenesisConnectionPillClass(item.status))}>
            {xenesisConnectionStatusLabel(item.status)}
          </span>
        </div>
        {(openRequest || settingsRequest || guideRequest) && (
          <div className="sp-actions-row sp-actions-row-tight">
            <button
              className="sp-btn-ghost sp-btn-sm"
              onClick={() => {
                void handleXenesisConnectionRequest(openRequest);
              }}
            >
              {t('settings.xenesisConnectionsFocusCard')}
            </button>
            {settingsRequest ? (
              <button
                className="sp-btn-ghost sp-btn-sm"
                onClick={() => {
                  void handleXenesisConnectionRequest(settingsRequest);
                }}
              >
                {t('settings.xenesisConnectionsOpenSettings')}
              </button>
            ) : null}
            {guideRequest ? (
              <button
                className="sp-btn-ghost sp-btn-sm"
                onClick={() => {
                  void handleXenesisConnectionRequest(guideRequest);
                }}
              >
                {t('settings.xenesisConnectionsOpenGuide')}
              </button>
            ) : null}
          </div>
        )}
        {(item.missingEnv?.length || item.requiredEnv?.length || item.crActions?.length || item.guidePath) && (
          <div className="sp-info-list sp-info-list-compact">
            {item.missingEnv?.length ? (
              <div>
                <span>{t('settings.xenesisConnectionsMissingEnv')}</span>
                <strong>{item.missingEnv.join(', ')}</strong>
              </div>
            ) : null}
            {!item.missingEnv?.length && item.requiredEnv?.length ? (
              <div>
                <span>{t('settings.xenesisConnectionsRequiredEnv')}</span>
                <strong>{item.requiredEnv.join(', ')}</strong>
              </div>
            ) : null}
            {item.crActions?.length ? (
              <div>
                <span>{t('settings.xenesisConnectionsCrActions')}</span>
                <strong>{item.crActions.join(', ')}</strong>
              </div>
            ) : null}
            {item.guidePath ? (
              <div>
                <span>{t('settings.xenesisConnectionsGuide')}</span>
                <strong>{item.guidePath}</strong>
              </div>
            ) : null}
          </div>
        )}
        {item.setupSteps?.length ? (
          <div className="sp-info-list sp-info-list-compact">
            {item.setupSteps.map((step, index) => (
              <div key={`${item.id}-step-${index}`}>
                <span>
                  {t('settings.xenesisConnectionsSetupStep')} {index + 1}
                </span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        ) : null}
        {item.sourceDocs?.length ? (
          <div className="sp-info-list sp-info-list-compact">
            <div>
              <span>{t('settings.xenesisConnectionsSources')}</span>
              <strong>{item.sourceDocs.map((source) => source.label).join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {item.guideCatalog ? (
          <div className="sp-info-list sp-info-list-compact" data-xenesis-guide-catalog={item.id}>
            <div>
              <span>{t('settings.xenesisConnectionsGuideCatalog')}</span>
              <strong>{formatXenesisGuideCatalogSummary(item.guideCatalog)}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsGuideSurfaces')}</span>
              <strong>{item.guideCatalog.coveredSurfaces.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsGuidePrerequisites')}</span>
              <strong>{item.guideCatalog.prerequisites.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsGuideValidation')}</span>
              <strong>{item.guideCatalog.validationChecks.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsGuideUserStories')}</span>
              <strong>{item.guideCatalog.userStoryTemplates.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsGuideReadback')}</span>
              <strong>{item.guideCatalog.readPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsGuideControls')}</span>
              <strong>{item.guideCatalog.controlPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsGuideBoundaries')}</span>
              <strong>{item.guideCatalog.safetyBoundaries.join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {providerSetup ? (
          <div className="sp-info-list sp-info-list-compact" data-xenesis-provider-setup={item.id}>
            <div>
              <span>{t('settings.xenesisConnectionsProviderSetup')}</span>
              <strong>{formatXenesisProviderSetupSummary(providerSetup)}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderCredential')}</span>
              <strong>
                {providerSetup.credentialState} / {providerSetup.credentialStorage}
              </strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderEndpoint')}</span>
              <strong>{providerSetup.endpoint}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderRuntime')}</span>
              <strong>
                {providerSetup.runtimeProfile} / {providerSetup.runtimeProvider} / {providerSetup.runtimeModel}
              </strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderPolicy')}</span>
              <strong>
                {providerSetup.providerRetries} / {providerSetup.fallbackPolicy}
              </strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderLocalCli')}</span>
              <strong>{providerSetup.localCliBoundary}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderVerification')}</span>
              <strong>{providerSetup.verification.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderCrReadback')}</span>
              <strong>{providerSetup.crReadPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderRiskControls')}</span>
              <strong>{providerSetup.riskControls.join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {providerRouting ? (
          <div className="sp-info-list sp-info-list-compact" data-xenesis-provider-routing={item.id}>
            <div>
              <span>{t('settings.xenesisConnectionsProviderRouting')}</span>
              <strong>{formatXenesisProviderRoutingSummary(providerRouting)}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderRoutingRuntime')}</span>
              <strong>
                {providerRouting.runtimeProfile} / {providerRouting.runtimeProvider} / {providerRouting.runtimeModel}
              </strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderRoutingFallbacks')}</span>
              <strong>
                {providerRouting.fallbackChain.length
                  ? providerRouting.fallbackChain
                      .map(
                        (fallback) =>
                          `${fallback.index}. ${fallback.provider}/${fallback.model}/${fallback.credentialState}/${fallback.baseURLState}`,
                      )
                      .join(', ')
                  : '-'}
              </strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderRoutingCredentialPools')}</span>
              <strong>
                {providerRouting.credentialPools
                  .map((pool) =>
                    pool.apiKeyEnv
                      ? `${pool.source}:${pool.provider}:${pool.credentialState} (${pool.apiKeyEnv})`
                      : `${pool.source}:${pool.provider}:${pool.credentialState}`,
                  )
                  .join(', ')}
              </strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderRoutingReadback')}</span>
              <strong>{providerRouting.readPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderRoutingDiagnostics')}</span>
              <strong>{providerRouting.diagnostics.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderRoutingSafety')}</span>
              <strong>{providerRouting.safetyBoundaries.join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {providerView ? (
          <div className="sp-info-list sp-info-list-compact" data-xenesis-provider-view={item.id}>
            <div>
              <span>{t('settings.xenesisConnectionsProviderView')}</span>
              <strong>{formatXenesisProviderViewSummary(providerView)}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderViewSetupSurface')}</span>
              <strong>{providerView.setupSurface}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderViewOpen')}</span>
              <strong>
                {providerView.openPath} {JSON.stringify(providerView.openArgs)}
              </strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderViewInternalViews')}</span>
              <strong>{providerView.internalViews.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderViewReadback')}</span>
              <strong>{providerView.readPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderViewControls')}</span>
              <strong>{providerView.controlPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderViewDiagnostics')}</span>
              <strong>{providerView.diagnostics.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsProviderViewSafety')}</span>
              <strong>{providerView.safetyBoundaries.join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {toolSetup ? (
          <div className="sp-info-list sp-info-list-compact" data-xenesis-tool-setup={item.id}>
            <div>
              <span>{t('settings.xenesisConnectionsToolSetup')}</span>
              <strong>{formatXenesisToolSetupSummary(toolSetup)}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolDataScopes')}</span>
              <strong>{toolSetup.dataScopes.join(', ') || '-'}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolWriteScopes')}</span>
              <strong>{toolSetup.writeScopes.join(', ') || '-'}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolCredentials')}</span>
              <strong>{toolSetup.credentialStorage}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolVerification')}</span>
              <strong>{toolSetup.verification.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolCrReadback')}</span>
              <strong>{toolSetup.crReadPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolRiskControls')}</span>
              <strong>{toolSetup.riskControls.join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {toolInstallPlan ? (
          <div className="sp-info-list sp-info-list-compact" data-xenesis-tool-install-plan={item.id}>
            <div>
              <span>{t('settings.xenesisConnectionsToolInstallPlan')}</span>
              <strong>{formatXenesisToolInstallPlanSummary(toolInstallPlan)}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolInstallPlanSurface')}</span>
              <strong>{toolInstallPlan.installSurface}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolInstallPlanActions')}</span>
              <strong>{toolInstallPlan.installActions.join(', ') || '-'}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolInstallPlanSteps')}</span>
              <strong>{toolInstallPlan.installSteps.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolInstallPlanTargets')}</span>
              <strong>{toolInstallPlan.configTargets.join(', ') || '-'}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolInstallPlanRequiredEnv')}</span>
              <strong>{toolInstallPlan.requiredEnv.join(', ') || '-'}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolInstallPlanReadback')}</span>
              <strong>{toolInstallPlan.readPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolInstallPlanControls')}</span>
              <strong>{toolInstallPlan.controlPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolInstallPlanDiagnostics')}</span>
              <strong>{toolInstallPlan.diagnostics.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolInstallPlanSafety')}</span>
              <strong>{toolInstallPlan.safetyBoundaries.join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {toolConnector ? (
          <div className="sp-info-list sp-info-list-compact" data-xenesis-tool-connector={item.id}>
            <div>
              <span>{t('settings.xenesisConnectionsToolConnector')}</span>
              <strong>{formatXenesisToolConnectorSummary(toolConnector)}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolConnectorCredentialState')}</span>
              <strong>{toolConnector.credentialState}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolConnectorCredentials')}</span>
              <strong>
                {toolConnector.credentialRefs.length
                  ? toolConnector.credentialRefs
                      .map((ref) => `${ref.source}:${ref.ref}:${ref.state}${ref.required ? ':required' : ''}`)
                      .join(', ')
                  : '-'}
              </strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolConnectorValidation')}</span>
              <strong>{toolConnector.validationChecks.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolConnectorReadback')}</span>
              <strong>{toolConnector.readPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolConnectorControls')}</span>
              <strong>{toolConnector.controlPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolConnectorDiagnostics')}</span>
              <strong>{toolConnector.diagnostics.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolConnectorSafety')}</span>
              <strong>{toolConnector.safetyBoundaries.join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {toolView ? (
          <div className="sp-info-list sp-info-list-compact" data-xenesis-tool-view={item.id}>
            <div>
              <span>{t('settings.xenesisConnectionsToolView')}</span>
              <strong>{formatXenesisToolViewSummary(toolView)}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolViewSetupSurface')}</span>
              <strong>{toolView.setupSurface}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolViewOpen')}</span>
              <strong>
                {toolView.openPath} {JSON.stringify(toolView.openArgs)}
              </strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolViewInternalViews')}</span>
              <strong>{toolView.internalViews.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolViewReadback')}</span>
              <strong>{toolView.readPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolViewControls')}</span>
              <strong>{toolView.controlPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolViewDiagnostics')}</span>
              <strong>{toolView.diagnostics.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolViewSafety')}</span>
              <strong>{toolView.safetyBoundaries.join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {toolUserStory ? (
          <div className="sp-info-list sp-info-list-compact" data-xenesis-tool-user-story={item.id}>
            <div>
              <span>{t('settings.xenesisConnectionsToolUserStory')}</span>
              <strong>{formatXenesisToolUserStorySummary(toolUserStory)}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolUserStoryStories')}</span>
              <strong>{toolUserStory.userStories.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolUserStoryConnectors')}</span>
              <strong>{toolUserStory.prerequisiteConnectors.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolUserStoryScopes')}</span>
              <strong>{toolUserStory.requiredScopes.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolUserStoryReadback')}</span>
              <strong>{toolUserStory.readPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolUserStoryControls')}</span>
              <strong>{toolUserStory.controlPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolUserStoryDiagnostics')}</span>
              <strong>{toolUserStory.diagnostics.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsToolUserStorySafety')}</span>
              <strong>{toolUserStory.safetyBoundaries.join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {messengerView ? (
          <div className="sp-info-list sp-info-list-compact" data-xenesis-messenger-view={item.id}>
            <div>
              <span>{t('settings.xenesisConnectionsMessengerView')}</span>
              <strong>{formatXenesisMessengerViewSummary(messengerView)}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsMessengerViewRuntime')}</span>
              <strong>{messengerView.runtimeSupport}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsMessengerViewSetupSurface')}</span>
              <strong>{messengerView.setupSurface}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsMessengerViewOpen')}</span>
              <strong>
                {messengerView.openPath} {JSON.stringify(messengerView.openArgs)}
              </strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsMessengerViewInternalViews')}</span>
              <strong>{messengerView.internalViews.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsMessengerViewReadback')}</span>
              <strong>{messengerView.readPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsMessengerViewControls')}</span>
              <strong>{messengerView.controlPaths.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsMessengerViewDiagnostics')}</span>
              <strong>{messengerView.diagnostics.join(', ')}</strong>
            </div>
            <div>
              <span>{t('settings.xenesisConnectionsMessengerViewSafety')}</span>
              <strong>{messengerView.safetyBoundaries.join(', ')}</strong>
            </div>
          </div>
        ) : null}
        {mcpTemplate ? (
          <div className="sp-mcp-template" data-xenesis-mcp-template={mcpTemplate.serverName}>
            <div className="sp-info-list sp-info-list-compact">
              <div>
                <span>{t('settings.xenesisConnectionsMcpServer')}</span>
                <strong>{mcpTemplate.serverName}</strong>
              </div>
              <div>
                <span>{t('settings.xenesisConnectionsMcpTransport')}</span>
                <strong>{mcpTemplate.transport}</strong>
              </div>
              <div>
                <span>
                  {mcpTemplate.command
                    ? t('settings.xenesisConnectionsMcpCommand')
                    : t('settings.xenesisConnectionsMcpUrl')}
                </span>
                <strong>
                  {mcpTemplate.command ? [mcpTemplate.command, ...(mcpTemplate.args ?? [])].join(' ') : mcpTemplate.url}
                </strong>
              </div>
              <div>
                <span>{t('settings.xenesisConnectionsMcpTools')}</span>
                <strong>
                  {mcpTemplate.defaultEnabledTools?.length
                    ? mcpTemplate.defaultEnabledTools.join(', ')
                    : t('settings.xenesisConnectionsMcpToolsAll')}
                </strong>
              </div>
            </div>
            <div className="sp-mcp-snippets">
              {[
                {
                  id: 'json',
                  label: t('settings.xenesisConnectionsMcpJsonSnippet'),
                  content: mcpTemplate.configSnippets.json,
                },
                {
                  id: 'codex',
                  label: t('settings.xenesisConnectionsMcpCodexSnippet'),
                  content: mcpTemplate.configSnippets.codexToml,
                },
              ].map((snippet) => (
                <div className="sp-mcp-snippet" key={`${item.id}-${snippet.id}`}>
                  <div className="sp-mcp-snippet-head">
                    <strong>{snippet.label}</strong>
                    <button
                      className="sp-btn-ghost sp-btn-sm"
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(snippet.content).catch(() => undefined);
                      }}
                    >
                      {t('common.copy')}
                    </button>
                  </div>
                  <pre>
                    <code>{snippet.content}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {channelTemplate ? (
          <div className="sp-channel-template" data-xenesis-channel-template={item.id}>
            <div className="sp-info-list sp-info-list-compact">
              <div>
                <span>{t('settings.xenesisConnectionsChannelCategory')}</span>
                <strong>{channelTemplate.category}</strong>
              </div>
              <div>
                <span>{t('settings.xenesisConnectionsChannelAdapter')}</span>
                <strong>{channelTemplate.adapter}</strong>
              </div>
              <div>
                <span>{t('settings.xenesisConnectionsChannelAuth')}</span>
                <strong>{channelTemplate.auth}</strong>
              </div>
            </div>
            <div className="sp-channel-chips">
              <div>
                <span>{t('settings.xenesisConnectionsChannelCapabilities')}</span>
                <strong>{channelTemplate.capabilities.join(', ')}</strong>
              </div>
              <div>
                <span>{t('settings.xenesisConnectionsChannelSafety')}</span>
                <strong>{channelTemplate.safetyControls.join(', ')}</strong>
              </div>
            </div>
            {channelTemplate.routing ? (
              <div className="sp-info-list sp-info-list-compact" data-xenesis-channel-routing={item.id}>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelRoute')}</span>
                  <strong>{formatXenesisChannelRoutingSummary(channelTemplate.routing)}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelDefaultAgent')}</span>
                  <strong>{channelTemplate.routing.defaultAgent}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelSessionScope')}</span>
                  <strong>{channelTemplate.routing.sessionScope}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelAllowlist')}</span>
                  <strong>{channelTemplate.routing.allowlistFields.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelDiagnostics')}</span>
                  <strong>{channelTemplate.routing.diagnostics.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelDelivery')}</span>
                  <strong>{channelTemplate.routing.deliveryFeatures.join(', ')}</strong>
                </div>
              </div>
            ) : null}
            {channelTemplate.safety ? (
              <div className="sp-info-list sp-info-list-compact" data-xenesis-channel-safety={item.id}>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelSafetyModel')}</span>
                  <strong>{formatXenesisChannelSafetySummary(channelTemplate.safety)}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelAccessGroups')}</span>
                  <strong>{channelTemplate.safety.accessGroupFields.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelBoundaries')}</span>
                  <strong>
                    {channelTemplate.safety.inboundBoundary} / {channelTemplate.safety.outboundBoundary}
                  </strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelLoopProtection')}</span>
                  <strong>{channelTemplate.safety.loopProtection.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelTroubleshooting')}</span>
                  <strong>{channelTemplate.safety.troubleshooting.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelSafetyReadback')}</span>
                  <strong>{channelTemplate.safety.readPaths.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelSafetyControls')}</span>
                  <strong>{channelTemplate.safety.controlPaths.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelSafetyBoundaries')}</span>
                  <strong>{channelTemplate.safety.safetyBoundaries.join(', ')}</strong>
                </div>
              </div>
            ) : null}
            {channelTemplate.accessGroups ? (
              <div className="sp-info-list sp-info-list-compact" data-xenesis-channel-access-groups={item.id}>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelAccessGroupModel')}</span>
                  <strong>{formatXenesisChannelAccessGroupsSummary(channelTemplate.accessGroups)}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelAccessGroupBindings')}</span>
                  <strong>
                    {channelTemplate.accessGroups.bindings
                      .map((binding) => `${binding.groupId}:${binding.field}`)
                      .join(', ')}
                  </strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelAccessGroupDiagnostics')}</span>
                  <strong>{channelTemplate.accessGroups.diagnostics.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelAccessGroupReadback')}</span>
                  <strong>{channelTemplate.accessGroups.readPaths.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelAccessGroupControls')}</span>
                  <strong>{channelTemplate.accessGroups.controlPaths.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelAccessGroupBoundaries')}</span>
                  <strong>{channelTemplate.accessGroups.safetyBoundaries.join(', ')}</strong>
                </div>
              </div>
            ) : null}
            {channelTemplate.pairing ? (
              <div className="sp-info-list sp-info-list-compact" data-xenesis-channel-pairing={item.id}>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelPairing')}</span>
                  <strong>{formatXenesisChannelPairingSummary(channelTemplate.pairing)}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelPairingRuntime')}</span>
                  <strong>{channelTemplate.pairing.runtimeSupport}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelPairingCredentials')}</span>
                  <strong>
                    {channelTemplate.pairing.credentialRefs
                      .map((ref) => `${ref.source}:${ref.ref}:${ref.state}${ref.required ? ':required' : ''}`)
                      .join(', ') || '-'}
                  </strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelPairingValidation')}</span>
                  <strong>{channelTemplate.pairing.validationChecks.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelPairingReadback')}</span>
                  <strong>{channelTemplate.pairing.readPaths.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelPairingControls')}</span>
                  <strong>{channelTemplate.pairing.controlPaths.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelPairingDiagnostics')}</span>
                  <strong>{channelTemplate.pairing.diagnostics.join(', ')}</strong>
                </div>
                <div>
                  <span>{t('settings.xenesisConnectionsChannelPairingSafety')}</span>
                  <strong>{channelTemplate.pairing.safetyBoundaries.join(', ')}</strong>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {item.warnings?.length ? <p className="sp-hint sp-warning-text">{item.warnings.join(' ')}</p> : null}
      </div>
    );
  };

  const renderXenesisConnections = () => {
    const sections = listXenesisConnectionSections(xenesisConnectionsStatus);
    return (
      <div className="sp-stack" data-settings-section="xenesis-connections">
        <section className="sp-section">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.xenesisConnectionsTitle')}</h2>
              <p>{t('settings.xenesisConnectionsDesc')}</p>
            </div>
            <div className="sp-actions-row sp-actions-row-tight">
              <button
                className="sp-btn"
                disabled={xenesisConnectionsBusy}
                onClick={() => {
                  void loadXenesisConnectionsStatus();
                }}
              >
                {xenesisConnectionsBusy ? t('common.checking') : t('settings.xenesisConnectionsRefresh')}
              </button>
            </div>
          </div>

          {xenesisConnectionsStatus ? (
            <div className="sp-info-list">
              <div>
                <span>{t('settings.xenesisConnectionsReady')}</span>
                <strong>
                  {xenesisConnectionsStatus.summary.ready}/{xenesisConnectionsStatus.summary.total}
                </strong>
              </div>
              <div>
                <span>{t('settings.xenesisConnectionsBlocked')}</span>
                <strong>{xenesisConnectionsStatus.summary.blocked}</strong>
              </div>
              <div>
                <span>{t('settings.xenesisConnectionsPlanned')}</span>
                <strong>{xenesisConnectionsStatus.summary.planned}</strong>
              </div>
            </div>
          ) : (
            <div className="sp-empty-block">{t('settings.xenesisConnectionsEmpty')}</div>
          )}
          {xenesisConnectionsError && (
            <p className="sp-hint sp-warning-text">
              {t('settings.xenesisConnectionsFailed', { message: xenesisConnectionsError })}
            </p>
          )}
        </section>

        {sections.map((section) => (
          <section className="sp-section" key={section.id}>
            <div className="sp-section-heading">
              <div>
                <h2>{section.label}</h2>
              </div>
            </div>
            <div className="sp-grid two">{section.items.map(renderXenesisConnectionItem)}</div>
          </section>
        ))}
      </div>
    );
  };

  const renderXenesisGateway = () => {
    const gatewayStatus = xenesisGatewayStatus?.gateway;
    const gatewayRunning = gatewayStatus?.running === true;
    const gatewayEnabledForUi = xenesisGatewayEnabled || xenesisRuntimeMode === 'externalGateway';
    const gatewayChannelErrors = (gatewayStatus?.channels?.items ?? []).filter((channel) => channel.lastError);
    const gatewayStatusText = gatewayRunning
      ? `${t('settings.xenesisGatewayStatusRunning')} (${gatewayStatus?.url || `http://${xenesisHost}:${xenesisPortStr}`}${gatewayStatus?.pid != null ? `, PID ${gatewayStatus.pid}` : ''})`
      : gatewayStatus?.error
        ? `${t('settings.xenesisGatewayStatusStoppedDash')} ${gatewayStatus.error}`
        : t('settings.xenesisGatewayStatusStopped');

    return (
      <section className="sp-section" data-settings-section="xenesis-gateway">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.xenesisGatewayTitle')}</h2>
            <p>{t('settings.xenesisGatewayDesc')}</p>
          </div>
        </div>

        <div className="sp-grid two">
          <div className="sp-field sp-field-inline">
            <label className="sp-label" htmlFor="sp-xenesis-gateway-enabled">
              {t('settings.xenesisGatewayEnabled')}
            </label>
            <button
              id="sp-xenesis-gateway-enabled"
              className={cls(
                'sp-toggle',
                (xenesisGatewayEnabled || xenesisRuntimeMode === 'externalGateway') && 'sp-toggle-on',
              )}
              role="switch"
              aria-checked={xenesisGatewayEnabled || xenesisRuntimeMode === 'externalGateway'}
              disabled={xenesisRuntimeMode === 'externalGateway'}
              onClick={() => setXenesisGatewayEnabled((v) => !v)}
            >
              <span className="sp-toggle-thumb" />
            </button>
            <span className="sp-toggle-label">
              {xenesisGatewayEnabled || xenesisRuntimeMode === 'externalGateway'
                ? t('settings.xenesisGatewayEnabledOn')
                : t('settings.xenesisGatewayEnabledOff')}
            </span>
          </div>

          <div className="sp-field sp-field-inline">
            <label className="sp-label" htmlFor="sp-xenesis-gateway-autostart">
              {t('settings.xenesisGatewayAutoStart')}
            </label>
            <button
              id="sp-xenesis-gateway-autostart"
              className={cls('sp-toggle', xenesisGatewayAutoStart && 'sp-toggle-on')}
              role="switch"
              aria-checked={xenesisGatewayAutoStart}
              onClick={() => setXenesisGatewayAutoStart((v) => !v)}
            >
              <span className="sp-toggle-thumb" />
            </button>
            <span className="sp-toggle-label">
              {xenesisGatewayAutoStart ? t('settings.agentApiAutoStartOn') : t('settings.agentApiAutoStartOff')}
            </span>
          </div>
        </div>

        <div className="sp-grid two">
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xenesis-host">
              {t('settings.xenesisGatewayHostLabel')}
            </label>
            <input
              id="sp-xenesis-host"
              className="sp-input"
              type="text"
              value={xenesisHost}
              placeholder={DEFAULT_XENESIS_GATEWAY_HOST}
              onChange={(e) => setXenesisHost(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xenesis-port">
              {t('settings.xenesisGatewayPortLabel')}
            </label>
            <div className="sp-input-row">
              <input
                id="sp-xenesis-port"
                className={cls('sp-input', 'sp-input-port', xenesisPortError && 'sp-input-error')}
                type="number"
                min={PORT_MIN}
                max={PORT_MAX}
                value={xenesisPortStr}
                onChange={(e) => handleXenesisPortChange(e.target.value)}
              />
              {renderInputReset(t('settings.agentApiPortResetTitle'), () =>
                handleXenesisPortChange(String(DEFAULT_XENESIS_GATEWAY_PORT)),
              )}
            </div>
            {xenesisPortError && <p className="sp-error">{xenesisPortError}</p>}
          </div>
        </div>

        <div className="sp-field">
          <label className="sp-label">{t('settings.xenesisGatewayManualControls')}</label>
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xenesis-gateway-dev-token">
              {t('settings.xenesisGatewayDevTokenLabel')}
            </label>
            <div className="sp-input-row">
              <input
                id="sp-xenesis-gateway-dev-token"
                className="sp-input"
                type="password"
                value={xenesisGatewayDevToken}
                placeholder={t('settings.xenesisGatewayDevTokenPlaceholder')}
                onChange={(e) => setXenesisGatewayDevToken(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
              <button
                className="sp-btn-ghost sp-icon-btn"
                title={t('common.copy')}
                disabled={!xenesisGatewayDevToken.trim()}
                onClick={() => {
                  const token = xenesisGatewayDevToken.trim();
                  if (!token) return;
                  void navigator.clipboard?.writeText(token)?.catch(() => undefined);
                }}
              >
                ⧉
              </button>
              {xenesisGatewayDevToken && renderInputReset(t('common.reset'), () => setXenesisGatewayDevToken(''))}
            </div>
            <p className="sp-hint">{t('settings.xenesisGatewayDevTokenHint')}</p>
          </div>
          <div className="sp-server-status-row">
            <span className={cls('sp-server-dot', gatewayRunning ? 'sp-dot-on' : 'sp-dot-off')} />
            <span className="sp-server-status-text">{gatewayStatusText}</span>
            <button
              className="sp-btn-ghost sp-btn-sm"
              disabled={xenesisGatewayBusy}
              onClick={() => {
                void handleXenesisGatewayAction('refresh');
              }}
            >
              {t('settings.xenesisGatewayRefresh')}
            </button>
            <button
              className="sp-btn-ghost sp-btn-sm"
              disabled={xenesisGatewayBusy || !gatewayRunning}
              onClick={() => {
                void handleXenesisGatewayOpenDashboard();
              }}
            >
              {t('settings.xenesisGatewayOpenDashboard')}
            </button>
            <button
              className={cls('sp-btn', 'sp-btn-success')}
              disabled={xenesisGatewayBusy || !!xenesisPortError || !gatewayEnabledForUi}
              onClick={() => {
                void handleXenesisGatewayAction('start');
              }}
            >
              {xenesisGatewayBusy ? t('settings.agentApiProcessing') : t('settings.xenesisGatewayStart')}
            </button>
            <button
              className="sp-btn"
              disabled={xenesisGatewayBusy || !!xenesisPortError || !gatewayEnabledForUi}
              onClick={() => {
                void handleXenesisGatewayAction('restart');
              }}
            >
              {t('settings.xenesisGatewayRestart')}
            </button>
            <button
              className={cls('sp-btn', 'sp-btn-danger')}
              disabled={xenesisGatewayBusy || !gatewayRunning}
              onClick={() => {
                void handleXenesisGatewayAction('stop');
              }}
            >
              {t('settings.xenesisGatewayStop')}
            </button>
          </div>
          {!gatewayEnabledForUi && (
            <p className="sp-hint sp-warning-text">{t('settings.xenesisGatewayManualDisabledHint')}</p>
          )}
          {xenesisGatewayMessage && (
            <p className={cls('sp-hint', gatewayStatus?.error && 'sp-warning-text')}>{xenesisGatewayMessage}</p>
          )}
          {gatewayChannelErrors.map((channel) => (
            <p key={channel.name} className="sp-hint sp-warning-text">
              {t('settings.xenesisGatewayChannelLastError', {
                channel: channel.name,
                message: channel.lastError?.message ?? '',
                time: channel.lastError?.at ?? '',
              })}
            </p>
          ))}
        </div>
      </section>
    );
  };

  const renderXenesisChannelStatus = (name: keyof XenesisProfileChannelSettings) => {
    const state = xenesisProfileState?.channels.find((channel) => channel.name === name);
    return (
      <span className={cls('sp-pill', state?.configured && 'sp-pill-on')}>
        {state?.configured ? t('settings.xenesisExternalBotConfigured') : t('settings.xenesisExternalBotEnvMissing')}
      </span>
    );
  };

  const xenesisGatewayChannelRuntimeLabel = (status: XenesisGatewayChannelRuntimeStatus) => {
    switch (status) {
      case 'ready':
        return t('settings.xenesisExternalBotRuntimeReady');
      case 'error':
        return t('settings.xenesisExternalBotRuntimeError');
      case 'blocked':
        return t('settings.xenesisExternalBotRuntimeBlocked');
      case 'disabled':
        return t('settings.xenesisExternalBotRuntimeDisabled');
      default:
        return status;
    }
  };

  const renderXenesisGatewayChannelRuntimeStatus = (name: XenesisGatewayChannelName) => {
    const state =
      xenesisGatewayStatus?.gateway.channels?.[name] ??
      xenesisGatewayStatus?.gateway.channels?.items.find((channel) => channel.name === name);
    if (!state) return null;
    return (
      <span
        className={cls(
          'sp-pill',
          state.runtimeStatus === 'ready' && 'sp-pill-on',
          state.runtimeStatus === 'error' && 'sp-pill-danger',
          state.runtimeStatus === 'blocked' && 'sp-pill-warning',
        )}
        title={state.lastError ? `${state.lastError.message} (${state.lastError.at})` : undefined}
      >
        {xenesisGatewayChannelRuntimeLabel(state.runtimeStatus)}
      </span>
    );
  };

  const renderXenesisExternalBotTestButton = (channel: XenesisProfileChannelName) => (
    <button
      className="sp-btn-ghost sp-btn-sm"
      disabled={xenesisExternalBotTesting !== null || xenesisExternalBotSaving || xenesisProfileBusy}
      onClick={() => {
        void handleXenesisExternalBotChannelTest(channel);
      }}
    >
      {xenesisExternalBotTesting === channel
        ? t('settings.xenesisExternalBotTesting')
        : t('settings.xenesisExternalBotTest')}
    </button>
  );

  const parseXenesisGuardrailNumber = (value: string, fallback: number) => {
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : fallback;
  };

  const renderXenesisExternalBotGuardrails = (channel: XenesisProfileChannelName) => {
    const settings = xenesisExternalBotChannels[channel];
    return (
      <div className="sp-grid three">
        <div className="sp-field">
          <label className="sp-label" htmlFor={`sp-xenesis-${channel}-approval-mode`}>
            {t('settings.xenesisExternalBotApprovalMode')}
          </label>
          <select
            id={`sp-xenesis-${channel}-approval-mode`}
            className="sp-input"
            value={settings.approvalMode}
            onChange={(event) =>
              patchXenesisExternalBotChannel(channel, { approvalMode: event.target.value as XenesisApprovalMode })
            }
          >
            <option value="readonly">{t('settings.xenesisExternalBotApprovalReadonly')}</option>
            <option value="safe">{t('settings.xenesisExternalBotApprovalSafe')}</option>
            <option value="auto">{t('settings.xenesisExternalBotApprovalAuto')}</option>
          </select>
        </div>
        <div className="sp-field">
          <label className="sp-label" htmlFor={`sp-xenesis-${channel}-max-turns`}>
            {t('settings.xenesisExternalBotMaxTurns')}
          </label>
          <input
            id={`sp-xenesis-${channel}-max-turns`}
            type="number"
            min={1}
            step={1}
            className="sp-input"
            value={settings.maxTurns}
            onChange={(event) =>
              patchXenesisExternalBotChannel(channel, {
                maxTurns: parseXenesisGuardrailNumber(event.target.value, settings.maxTurns),
              })
            }
          />
        </div>
        <div className="sp-field">
          <label className="sp-label" htmlFor={`sp-xenesis-${channel}-max-tokens`}>
            {t('settings.xenesisExternalBotMaxTokens')}
          </label>
          <input
            id={`sp-xenesis-${channel}-max-tokens`}
            type="number"
            min={1}
            step={1000}
            className="sp-input"
            value={settings.maxTokens}
            onChange={(event) =>
              patchXenesisExternalBotChannel(channel, {
                maxTokens: parseXenesisGuardrailNumber(event.target.value, settings.maxTokens),
              })
            }
          />
        </div>
      </div>
    );
  };

  const renderXenesisExternalBotChannels = () => (
    <section className="sp-section" data-settings-section="external-bot-channels">
      <div className="sp-section-heading">
        <div>
          <h2>{t('settings.xenesisExternalBotTitle')}</h2>
          <p>{t('settings.xenesisExternalBotDesc')}</p>
          <p className="sp-hint">
            {t('settings.xenesisExternalBotActiveProfile', {
              profile: xenesisProfileState?.active || xenesisProfile || t('settings.xenesisProfileDefault'),
            })}
          </p>
          <p className="sp-hint">{t('settings.xenesisExternalBotStorageHint')}</p>
        </div>
        <button
          className="sp-btn sp-btn-primary"
          disabled={xenesisExternalBotSaving || xenesisProfileBusy}
          onClick={() => {
            void handleXenesisExternalBotChannelsSave();
          }}
        >
          {xenesisExternalBotSaving ? t('common.saving') : t('settings.xenesisExternalBotSave')}
        </button>
      </div>

      <p className={cls('sp-hint', !xenesisGatewayEnabled && 'sp-warning-text')}>
        {xenesisGatewayEnabled
          ? t('settings.xenesisExternalBotGatewayReady')
          : t('settings.xenesisExternalBotGatewayRequired')}
      </p>
      {(xenesisGatewayStatus?.gateway.channels?.items ?? [])
        .filter((channel) => channel.enabled && channel.lastError)
        .map((channel) => (
          <p key={channel.name} className="sp-hint sp-warning-text">
            {t('settings.xenesisExternalBotChannelLastError', {
              channel: channel.name,
              message: channel.lastError?.message ?? '',
              time: channel.lastError?.at ?? '',
            })}
          </p>
        ))}

      <div className="sp-xenesis-bot-channel-list">
        <div className="sp-xenesis-bot-channel-card">
          <div className="sp-xenesis-bot-channel-header">
            <div>
              <strong>Telegram</strong>
              <span>{t('settings.xenesisExternalBotTelegramDesc')}</span>
            </div>
            <div className="sp-xenesis-bot-channel-actions">
              {renderXenesisGatewayChannelRuntimeStatus('telegram')}
              {renderXenesisChannelStatus('telegram')}
              {renderXenesisExternalBotTestButton('telegram')}
              <button
                className={cls('sp-toggle', xenesisExternalBotChannels.telegram.enabled && 'sp-toggle-on')}
                role="switch"
                aria-checked={xenesisExternalBotChannels.telegram.enabled}
                onClick={() =>
                  patchXenesisExternalBotChannel('telegram', { enabled: !xenesisExternalBotChannels.telegram.enabled })
                }
              >
                <span className="sp-toggle-thumb" />
              </button>
            </div>
          </div>
          <div className="sp-grid two">
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-xenesis-telegram-token-env">
                {t('settings.xenesisExternalBotTokenEnv')}
              </label>
              <input
                id="sp-xenesis-telegram-token-env"
                type={xenesisSecretInputType(xenesisExternalBotChannels.telegram.tokenEnv)}
                className="sp-input"
                value={xenesisExternalBotChannels.telegram.tokenEnv}
                onChange={(event) => patchXenesisExternalBotChannel('telegram', { tokenEnv: event.target.value })}
                spellCheck={false}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-xenesis-telegram-chat-ids">
                {t('settings.xenesisExternalBotAllowedChatIds')}
              </label>
              <textarea
                id="sp-xenesis-telegram-chat-ids"
                className="sp-input sp-textarea sp-xenesis-bot-textarea"
                value={xenesisExternalBotChannels.telegram.allowedChatIds}
                onChange={(event) => patchXenesisExternalBotChannel('telegram', { allowedChatIds: event.target.value })}
                spellCheck={false}
              />
            </div>
          </div>
          {renderXenesisExternalBotGuardrails('telegram')}
        </div>

        <div className="sp-xenesis-bot-channel-card">
          <div className="sp-xenesis-bot-channel-header">
            <div>
              <strong>Slack</strong>
              <span>{t('settings.xenesisExternalBotSlackDesc')}</span>
            </div>
            <div className="sp-xenesis-bot-channel-actions">
              {renderXenesisGatewayChannelRuntimeStatus('slack')}
              {renderXenesisChannelStatus('slack')}
              {renderXenesisExternalBotTestButton('slack')}
              <button
                className={cls('sp-toggle', xenesisExternalBotChannels.slack.enabled && 'sp-toggle-on')}
                role="switch"
                aria-checked={xenesisExternalBotChannels.slack.enabled}
                onClick={() =>
                  patchXenesisExternalBotChannel('slack', { enabled: !xenesisExternalBotChannels.slack.enabled })
                }
              >
                <span className="sp-toggle-thumb" />
              </button>
            </div>
          </div>
          <div className="sp-grid two">
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-xenesis-slack-bot-token-env">
                {t('settings.xenesisExternalBotBotTokenEnv')}
              </label>
              <input
                id="sp-xenesis-slack-bot-token-env"
                type={xenesisSecretInputType(xenesisExternalBotChannels.slack.botTokenEnv)}
                className="sp-input"
                value={xenesisExternalBotChannels.slack.botTokenEnv}
                onChange={(event) => patchXenesisExternalBotChannel('slack', { botTokenEnv: event.target.value })}
                spellCheck={false}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-xenesis-slack-signing-env">
                {t('settings.xenesisExternalBotSigningSecretEnv')}
              </label>
              <input
                id="sp-xenesis-slack-signing-env"
                type={xenesisSecretInputType(xenesisExternalBotChannels.slack.signingSecretEnv)}
                className="sp-input"
                value={xenesisExternalBotChannels.slack.signingSecretEnv}
                onChange={(event) => patchXenesisExternalBotChannel('slack', { signingSecretEnv: event.target.value })}
                spellCheck={false}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-xenesis-slack-webhook-env">
                {t('settings.xenesisExternalBotWebhookUrlEnv')}
              </label>
              <input
                id="sp-xenesis-slack-webhook-env"
                type={xenesisSecretInputType(xenesisExternalBotChannels.slack.webhookUrlEnv)}
                className="sp-input"
                value={xenesisExternalBotChannels.slack.webhookUrlEnv}
                onChange={(event) => patchXenesisExternalBotChannel('slack', { webhookUrlEnv: event.target.value })}
                spellCheck={false}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-xenesis-slack-channel-ids">
                {t('settings.xenesisExternalBotAllowedChannelIds')}
              </label>
              <textarea
                id="sp-xenesis-slack-channel-ids"
                className="sp-input sp-textarea sp-xenesis-bot-textarea"
                value={xenesisExternalBotChannels.slack.allowedChannelIds}
                onChange={(event) => patchXenesisExternalBotChannel('slack', { allowedChannelIds: event.target.value })}
                spellCheck={false}
              />
            </div>
          </div>
          {renderXenesisExternalBotGuardrails('slack')}
        </div>

        <div className="sp-xenesis-bot-channel-card">
          <div className="sp-xenesis-bot-channel-header">
            <div>
              <strong>Discord</strong>
              <span>{t('settings.xenesisExternalBotDiscordDesc')}</span>
            </div>
            <div className="sp-xenesis-bot-channel-actions">
              {renderXenesisGatewayChannelRuntimeStatus('discord')}
              {renderXenesisChannelStatus('discord')}
              {renderXenesisExternalBotTestButton('discord')}
              <button
                className={cls('sp-toggle', xenesisExternalBotChannels.discord.enabled && 'sp-toggle-on')}
                role="switch"
                aria-checked={xenesisExternalBotChannels.discord.enabled}
                onClick={() =>
                  patchXenesisExternalBotChannel('discord', { enabled: !xenesisExternalBotChannels.discord.enabled })
                }
              >
                <span className="sp-toggle-thumb" />
              </button>
            </div>
          </div>
          <div className="sp-grid two">
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-xenesis-discord-bot-token-env">
                {t('settings.xenesisExternalBotBotTokenEnv')}
              </label>
              <input
                id="sp-xenesis-discord-bot-token-env"
                type={xenesisSecretInputType(xenesisExternalBotChannels.discord.botTokenEnv)}
                className="sp-input"
                value={xenesisExternalBotChannels.discord.botTokenEnv}
                onChange={(event) => patchXenesisExternalBotChannel('discord', { botTokenEnv: event.target.value })}
                spellCheck={false}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-xenesis-discord-webhook-env">
                {t('settings.xenesisExternalBotWebhookUrlEnv')}
              </label>
              <input
                id="sp-xenesis-discord-webhook-env"
                type={xenesisSecretInputType(xenesisExternalBotChannels.discord.webhookUrlEnv)}
                className="sp-input"
                value={xenesisExternalBotChannels.discord.webhookUrlEnv}
                onChange={(event) => patchXenesisExternalBotChannel('discord', { webhookUrlEnv: event.target.value })}
                spellCheck={false}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-xenesis-discord-channel-ids">
                {t('settings.xenesisExternalBotAllowedChannelIds')}
              </label>
              <textarea
                id="sp-xenesis-discord-channel-ids"
                className="sp-input sp-textarea sp-xenesis-bot-textarea"
                value={xenesisExternalBotChannels.discord.allowedChannelIds}
                onChange={(event) =>
                  patchXenesisExternalBotChannel('discord', { allowedChannelIds: event.target.value })
                }
                spellCheck={false}
              />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="sp-xenesis-discord-guild-ids">
                {t('settings.xenesisExternalBotAllowedGuildIds')}
              </label>
              <textarea
                id="sp-xenesis-discord-guild-ids"
                className="sp-input sp-textarea sp-xenesis-bot-textarea"
                value={xenesisExternalBotChannels.discord.allowedGuildIds}
                onChange={(event) => patchXenesisExternalBotChannel('discord', { allowedGuildIds: event.target.value })}
                spellCheck={false}
              />
            </div>
          </div>
          {renderXenesisExternalBotGuardrails('discord')}
        </div>

        <div className="sp-xenesis-bot-channel-card">
          <div className="sp-xenesis-bot-channel-header">
            <div>
              <strong>Webhook</strong>
              <span>{t('settings.xenesisExternalBotWebhookDesc')}</span>
            </div>
            <div className="sp-xenesis-bot-channel-actions">
              {renderXenesisGatewayChannelRuntimeStatus('webhook')}
              {renderXenesisChannelStatus('webhook')}
              {renderXenesisExternalBotTestButton('webhook')}
              <button
                className={cls('sp-toggle', xenesisExternalBotChannels.webhook.enabled && 'sp-toggle-on')}
                role="switch"
                aria-checked={xenesisExternalBotChannels.webhook.enabled}
                onClick={() =>
                  patchXenesisExternalBotChannel('webhook', { enabled: !xenesisExternalBotChannels.webhook.enabled })
                }
              >
                <span className="sp-toggle-thumb" />
              </button>
            </div>
          </div>
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xenesis-webhook-url-env">
              {t('settings.xenesisExternalBotUrlEnv')}
            </label>
            <input
              id="sp-xenesis-webhook-url-env"
              type={xenesisSecretInputType(xenesisExternalBotChannels.webhook.urlEnv)}
              className="sp-input"
              value={xenesisExternalBotChannels.webhook.urlEnv}
              onChange={(event) => patchXenesisExternalBotChannel('webhook', { urlEnv: event.target.value })}
              spellCheck={false}
            />
          </div>
          {renderXenesisExternalBotGuardrails('webhook')}
        </div>
      </div>

      {xenesisExternalBotMessage && <p className="sp-hint">{xenesisExternalBotMessage}</p>}
    </section>
  );

  const handleHermesToolOpen = useCallback(
    (commandId: string, label: string) => {
      window.dispatchEvent(new CustomEvent('app-run-extension-command', { detail: { commandId } }));
      setHermesProviderMessage(t('settings.hermesOpenRequested', { label }));
    },
    [t],
  );

  const handleHermesRootSelect = useCallback(async () => {
    const selected = await window.terminalAPI.selectCwd();
    if (!selected) return;
    setHermesInstallRoot(selected);
    setProviderIntegrationMessage('');
    await loadProviderIntegrationStatus(selected);
  }, [loadProviderIntegrationStatus]);

  const handleHermesPluginInstall = useCallback(async () => {
    const hermesRoot = hermesInstallRoot.trim();
    if (!hermesRoot) {
      setProviderIntegrationMessage(t('settings.hermesPluginInstallRootRequired'));
      return;
    }
    setHermesInstalling(true);
    setProviderIntegrationMessage('');
    try {
      const result = await window.providerIntegrationAPI.installHermesPlugins({ hermesRoot });
      setProviderIntegrationMessage(
        result.ok
          ? t('settings.hermesPluginInstallSuccess')
          : t('settings.hermesPluginInstallFailed', { message: result.error || t('common.unknownError') }),
      );
      await loadProviderIntegrationStatus(hermesRoot);
    } catch (error) {
      setProviderIntegrationMessage(
        t('settings.hermesPluginInstallFailed', {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      setHermesInstalling(false);
    }
  }, [hermesInstallRoot, loadProviderIntegrationStatus, t]);

  const handleCliIntegrationInstall = useCallback(
    async (targetId: ProviderIntegrationCliTargetId, mode: 'mcp' | 'skill' | 'all') => {
      setCliIntegrationBusyTarget(targetId);
      setProviderIntegrationMessage('');
      try {
        const result = await window.providerIntegrationAPI.installCliIntegration({
          targetId,
          installMcp: mode === 'mcp' || mode === 'all',
          installSkill: mode === 'skill' || mode === 'all',
        });
        const label = result.target?.label ?? targetId;
        setProviderIntegrationMessage(
          result.ok
            ? t('settings.localCliIntegrationSuccess', { label })
            : t('settings.localCliIntegrationFailed', { label, message: result.error || t('common.unknownError') }),
        );
        await loadProviderIntegrationStatus();
      } catch (error) {
        setProviderIntegrationMessage(
          t('settings.localCliIntegrationFailed', {
            label: targetId,
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      } finally {
        setCliIntegrationBusyTarget('');
      }
    },
    [loadProviderIntegrationStatus, t],
  );

  const renderXenesisDeskSection = () => (
    <div className="sp-stack" data-settings-section="xenesis-desk">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.xenesisDeskSectionTitle')}</h2>
            <p>{t('settings.xenesisDeskSectionDesc')}</p>
          </div>
        </div>
        <div className="sp-mode-switch" role="tablist" aria-label={t('settings.xenesisDeskTabsAriaLabel')}>
          <button
            className={cls('sp-mode-option', xenesisTab === 'connections' && 'is-active')}
            data-settings-xenesis-tab="connections"
            onClick={() => setXenesisTab('connections')}
          >
            <strong>{t('settings.xenesisDeskTabConnections')}</strong>
            <span>
              {xenesisConnectionsStatus
                ? t('settings.xenesisDeskTabConnectionsDescReady', {
                    ready: String(xenesisConnectionsStatus.summary.ready),
                    total: String(xenesisConnectionsStatus.summary.total),
                  })
                : t('settings.xenesisDeskTabConnectionsDesc')}
            </span>
          </button>
          <button
            className={cls('sp-mode-option', xenesisTab === 'agent' && 'is-active')}
            data-settings-xenesis-tab="agent"
            onClick={() => setXenesisTab('agent')}
          >
            <strong>{t('settings.xenesisDeskTabAgent')}</strong>
            <span>
              {xenesisEnabled ? t('settings.xenesisRuntimeEnabledOn') : t('settings.xenesisRuntimeEnabledOff')}
            </span>
          </button>
          <button
            className={cls('sp-mode-option', xenesisTab === 'gateway' && 'is-active')}
            data-settings-xenesis-tab="gateway"
            onClick={() => setXenesisTab('gateway')}
          >
            <strong>{t('settings.xenesisDeskTabGateway')}</strong>
            <span>
              {xenesisGatewayStatus?.gateway?.running
                ? t('settings.xenesisGatewayStatusRunning')
                : t('settings.xenesisGatewayStatusStopped')}
            </span>
          </button>
          <button
            className={cls('sp-mode-option', xenesisTab === 'external-bots' && 'is-active')}
            data-settings-xenesis-tab="external-bots"
            onClick={() => setXenesisTab('external-bots')}
          >
            <strong>{t('settings.xenesisDeskTabExternalBots')}</strong>
            <span>{t('settings.xenesisDeskTabExternalBotsDesc')}</span>
          </button>
          <button
            className={cls('sp-mode-option', xenesisTab === 'gowoori' && 'is-active')}
            data-settings-xenesis-tab="gowoori"
            onClick={() => setXenesisTab('gowoori')}
          >
            <strong>{t('settings.xenesisDeskTabGowoori')}</strong>
            <span>{t('settings.xenesisDeskTabGowooriDesc')}</span>
          </button>
        </div>
      </section>

      {xenesisTab === 'connections' && renderXenesisConnections()}
      {xenesisTab === 'agent' && renderXenesisRuntime()}
      {xenesisTab === 'gateway' && renderXenesisGateway()}
      {xenesisTab === 'external-bots' && renderXenesisExternalBotChannels()}
      {xenesisTab === 'gowoori' && renderGowooriAgentSettings()}
    </div>
  );

  const renderHermesProvider = () => {
    const toolCards = [
      {
        commandId: 'xenesis-desk.core-tools.openHermesStatus',
        title: t('settings.hermesToolStatus'),
        description: t('settings.hermesToolStatusDesc'),
      },
      {
        commandId: 'xenesis-desk.core-tools.openHermesActionInbox',
        title: t('settings.hermesToolActionInbox'),
        description: t('settings.hermesToolActionInboxDesc'),
      },
      {
        commandId: 'xenesis-desk.core-tools.openHermesTimeline',
        title: t('settings.hermesToolTimeline'),
        description: t('settings.hermesToolTimelineDesc'),
      },
      {
        commandId: 'xenesis-desk.core-tools.openHermesStashOps',
        title: t('settings.hermesToolStashOps'),
        description: t('settings.hermesToolStashOpsDesc'),
      },
      {
        commandId: 'xenesis-desk.core-tools.openXenisBot',
        title: t('settings.hermesToolBot'),
        description: t('settings.hermesToolBotDesc'),
      },
    ];
    const pluginCards = [
      {
        title: t('settings.hermesProviderRootLabel'),
        path: HERMES_PROVIDER_ROOT,
        description: t('settings.hermesProviderRootDesc'),
      },
      {
        title: t('settings.hermesGatewayPluginLabel'),
        path: HERMES_GATEWAY_PLUGIN_PATH,
        description: t('settings.hermesGatewayPluginDesc'),
      },
      {
        title: t('settings.hermesBotPlatformPluginLabel'),
        path: HERMES_BOT_PLATFORM_PLUGIN_PATH,
        description: t('settings.hermesBotPlatformPluginDesc'),
      },
      {
        title: t('settings.hermesE2eBotLabel'),
        path: HERMES_E2E_BOT_PATH,
        description: t('settings.hermesE2eBotDesc'),
      },
    ];
    const envRows = [
      ['XENIS_BOT_ENABLED', t('settings.hermesEnvEnabled')],
      ['XENIS_MCP_BRIDGE_URL', t('settings.hermesEnvBridgeUrl')],
      ['XENIS_MCP_BRIDGE_TOKEN', t('settings.hermesEnvBridgeToken')],
      ['XENIS_BOT_LISTEN_HOST', t('settings.hermesEnvListenHost')],
      ['XENIS_BOT_LISTEN_PORT', t('settings.hermesEnvListenPort')],
      ['XENIS_BOT_ALLOWED_USERS', t('settings.hermesEnvAllowedUsers')],
      ['XENIS_BOT_ALLOW_ALL_USERS', t('settings.hermesEnvAllowAllUsers')],
    ];
    const hermesIntegration = providerIntegrationStatus?.hermes;

    return (
      <div className="sp-stack" data-settings-section="hermes-provider">
        <section className="sp-section">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.hermesTitle')}</h2>
              <p>{t('settings.hermesDesc')}</p>
            </div>
          </div>

          <div className="sp-section-heading sp-section-heading-compact">
            <div>
              <h2>{t('settings.hermesToolsTitle')}</h2>
              <p>{t('settings.hermesToolsDesc')}</p>
            </div>
          </div>
          <div className="sp-grid two">
            {toolCards.map((card) => (
              <div className="sp-info-card" key={card.commandId}>
                <strong>{card.title}</strong>
                <span>{card.description}</span>
                <button
                  className="sp-btn-ghost sp-btn-sm"
                  type="button"
                  onClick={() => handleHermesToolOpen(card.commandId, card.title)}
                >
                  {t('settings.hermesOpenTool')}
                </button>
              </div>
            ))}
          </div>
          {hermesProviderMessage && <p className="sp-hint">{hermesProviderMessage}</p>}
        </section>

        <section className="sp-section" data-settings-section="hermes-plugins">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.hermesPluginTitle')}</h2>
              <p>{t('settings.hermesPluginDesc')}</p>
            </div>
          </div>
          <div className="sp-grid two">
            {pluginCards.map((card) => (
              <div className="sp-info-card" key={card.path}>
                <strong>{card.title}</strong>
                <span>
                  <code>{card.path}</code>
                </span>
                <span>{card.description}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="sp-section" data-settings-section="hermes-plugin-installer">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.hermesPluginInstallTitle')}</h2>
              <p>{t('settings.hermesPluginInstallDesc')}</p>
            </div>
            <button
              className="sp-btn"
              type="button"
              disabled={providerIntegrationBusy || hermesInstalling || !hermesInstallRoot.trim()}
              onClick={handleHermesPluginInstall}
            >
              {hermesInstalling ? t('settings.hermesPluginInstalling') : t('settings.hermesPluginInstall')}
            </button>
          </div>
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-hermes-install-root">
              {t('settings.hermesPluginInstallRootLabel')}
            </label>
            <div className="sp-input-row">
              <input
                id="sp-hermes-install-root"
                className="sp-input"
                type="text"
                value={hermesInstallRoot}
                placeholder={t('settings.hermesPluginInstallRootPlaceholder')}
                onChange={(event) => {
                  setHermesInstallRoot(event.target.value);
                  setProviderIntegrationMessage('');
                }}
                spellCheck={false}
              />
              <button
                className="sp-btn-ghost sp-icon-btn"
                type="button"
                title={t('settings.hermesPluginInstallRootSelect')}
                onClick={handleHermesRootSelect}
              >
                …
              </button>
            </div>
            <p className="sp-hint">{t('settings.hermesPluginInstallRootHint')}</p>
          </div>
          <div className="sp-grid two">
            <div className="sp-info-card">
              <strong>{t('settings.hermesPluginInstallAssetRoot')}</strong>
              <span>
                <code>{hermesIntegration?.assetRoot || '-'}</code>
              </span>
              <span>
                {hermesIntegration?.assetAvailable ? t('settings.integrationReady') : t('settings.integrationMissing')}
              </span>
            </div>
            {(hermesIntegration?.items ?? []).map((item) => (
              <div className="sp-info-card" key={item.id}>
                <strong>{item.label}</strong>
                <span>
                  <code>{item.destinationPath || '-'}</code>
                </span>
                <span className={cls('sp-pill', item.installed && 'sp-pill-on')}>
                  {item.installed ? t('settings.integrationInstalled') : t('settings.integrationPending')}
                </span>
              </div>
            ))}
          </div>
          {providerIntegrationMessage && <p className="sp-hint">{providerIntegrationMessage}</p>}
        </section>

        <section className="sp-section" data-settings-section="hermes-bot-platform">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.hermesEnvTitle')}</h2>
              <p>{t('settings.hermesEnvDesc')}</p>
            </div>
          </div>
          <div className="sp-info-list">
            {envRows.map(([envName, description]) => (
              <div key={envName}>
                <strong>{envName}</strong>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const renderRunModel = () => (
    <div className="sp-stack" data-settings-section="default">
      <section className="sp-section" data-settings-section="provider-connection">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.providerConnectionTitle')}</h2>
            <p>{t('settings.providerConnectionDesc')}</p>
          </div>
        </div>
        <div className="sp-mode-switch" role="tablist" aria-label={t('settings.runModeAriaLabel')}>
          <button
            className={cls('sp-mode-option', runMode === 'hermes' && 'is-active')}
            data-settings-mode="hermes"
            onClick={() => setRunMode('hermes')}
          >
            <strong>{t('settings.runModeHermes')}</strong>
            <span>{t('settings.hermesRunModeDesc')}</span>
          </button>
          <button
            className={cls('sp-mode-option', runMode === 'local' && 'is-active')}
            data-settings-mode="local"
            onClick={() => setRunMode('local')}
          >
            <strong>{t('settings.runModeLocalCli')}</strong>
            <span>
              {t('settings.runModeInstalledCount', {
                count: String(localCliAgents.filter((agent) => agent.installed).length),
              })}
            </span>
          </button>
          <button
            className={cls('sp-mode-option', runMode === 'byok' && 'is-active')}
            data-settings-mode="byok"
            onClick={() => setRunMode('byok')}
          >
            <strong>BYOK</strong>
            <span>{t('settings.runModeApiProvider')}</span>
          </button>
          {xenisPhase5Enabled && (
            <button
              className={cls('sp-mode-option', runMode === 'xamong' && 'is-active')}
              data-settings-mode="xamong"
              onClick={() => setRunMode('xamong')}
            >
              <strong>{t('settings.runModeXamongCode')}</strong>
              <span>{xamongStatus.running ? t('settings.runtimeRunning') : t('settings.runModeConfigured')}</span>
            </button>
          )}
        </div>
      </section>

      {runMode === 'xamong' && xenisPhase5Enabled && renderLocalRuntime()}
      {runMode === 'hermes' && renderHermesProvider()}
      {runMode === 'local' && renderLocalCli()}
      {runMode === 'byok' && renderByokProvider()}
    </div>
  );

  const renderLocalRuntime = () => (
    <div className="sp-stack" data-settings-section="xamong-runtime">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.runtimeTitle')}</h2>
            <p>{t('settings.runtimeDesc')}</p>
          </div>
          <span className={cls('sp-pill', xamongStatus.running && 'sp-pill-on')}>
            {xamongStatus.running ? t('settings.runtimeRunning') : t('settings.runtimeStopped')}
          </span>
        </div>

        <div className="sp-field">
          <label className="sp-label" htmlFor="sp-xamong-runtime">
            {t('settings.runtimePathLabel')}
          </label>
          <div className="sp-input-row">
            <input
              id="sp-xamong-runtime"
              className="sp-input"
              type="text"
              value={xamongRuntimePath}
              placeholder={t('settings.runtimePathPlaceholder')}
              onChange={(e) => setXamongRuntimePath(e.target.value)}
            />
            <button
              className="sp-btn-ghost sp-icon-btn"
              title={t('settings.runtimePathSelectTitle')}
              onClick={async () => {
                const selected = await window.terminalAPI.selectCwd();
                if (selected) setXamongRuntimePath(selected);
              }}
            >
              …
            </button>
            {xamongRuntimePath && renderInputReset(t('settings.runtimePathAutoTitle'), () => setXamongRuntimePath(''))}
          </div>
          <p className="sp-hint">
            {t('settings.runtimeDetected')} <code>{xamongStatus.runtimePath || t('settings.runtimeNotFound')}</code>
          </p>
        </div>

        <div className="sp-grid two">
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xamong-config">
              {t('settings.gowooriConfigDirLabel')}
            </label>
            <div className="sp-input-row">
              <input
                id="sp-xamong-config"
                className="sp-input"
                type="text"
                value={xamongConfigDir}
                placeholder={DEFAULT_XAMONG_CODE_CONFIG_DIR_PLACEHOLDER}
                onChange={(e) => setXamongConfigDir(e.target.value)}
              />
              <button
                className="sp-btn-ghost sp-icon-btn"
                title={t('settings.configDirSelectTitle')}
                onClick={async () => {
                  const selected = await window.terminalAPI.selectCwd();
                  if (selected) setXamongConfigDir(selected);
                }}
              >
                …
              </button>
              {renderInputReset(t('settings.configDirResetTitle'), () =>
                setXamongConfigDir(DEFAULT_XAMONG_CODE_CONFIG_DIR),
              )}
            </div>
            <p className="sp-hint">{t('settings.configDirHint')}</p>
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xamong-workspaces">
              {t('settings.gowooriWorkspaceConfigLabel')}
            </label>
            <div className="sp-input-row">
              <input
                id="sp-xamong-workspaces"
                className="sp-input"
                type="text"
                value={xamongWorkspacesConfigPath}
                placeholder={`${DEFAULT_XAMONG_CODE_CONFIG_DIR_PLACEHOLDER}\\xamong-api-workspaces.json ${t('settings.configFileAutoPlaceholder')}`}
                onChange={(e) => setXamongWorkspacesConfigPath(e.target.value)}
                spellCheck={false}
              />
              <button
                className="sp-btn-ghost sp-icon-btn"
                title={t('settings.configFileSelectTitle')}
                onClick={async () => {
                  const selected = await window.fileAPI.openFile();
                  if (selected?.filePath) setXamongWorkspacesConfigPath(selected.filePath);
                }}
              >
                …
              </button>
              {xamongWorkspacesConfigPath &&
                renderInputReset(t('settings.configFileAutoTitle'), () => setXamongWorkspacesConfigPath(''))}
            </div>
            <p className="sp-hint">{t('settings.configFileHint')}</p>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.terminalCliTitle')}</h2>
            <p>{t('settings.terminalCliDesc')}</p>
          </div>
        </div>

        <div className="sp-grid two">
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xamong-openai-key">
              OPENAI_API_KEY
            </label>
            <div className="sp-input-row">
              <input
                id="sp-xamong-openai-key"
                className="sp-input"
                type="password"
                value={xamongOpenAiApiKey}
                placeholder={t('settings.xcApiKeyPlaceholder')}
                onChange={(e) => setXamongOpenAiApiKey(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
              {xamongOpenAiApiKey && (
                <button
                  className="sp-btn-ghost sp-icon-btn"
                  title={t('settings.xcApiKeyResetTitle')}
                  onClick={() => setXamongOpenAiApiKey('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xamong-openai-model">
              OPENAI_MODEL
            </label>
            <div className="sp-input-row">
              <input
                id="sp-xamong-openai-model"
                className="sp-input"
                type="text"
                value={xamongOpenAiModel}
                placeholder={t('settings.xcModelPlaceholder')}
                onChange={(e) => setXamongOpenAiModel(e.target.value)}
                spellCheck={false}
              />
              {xamongOpenAiModel && (
                <button
                  className="sp-btn-ghost sp-icon-btn"
                  title={t('common.reset')}
                  onClick={() => setXamongOpenAiModel('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="sp-grid two">
          <div className="sp-field">
            <div className="sp-input-row">
              <label className="sp-label" htmlFor="sp-xamong-direct-chat">
                {t('settings.quickChatLabel')}
              </label>
              <button
                id="sp-xamong-direct-chat"
                className={cls('sp-toggle', xamongDirectGeneralChat && 'sp-toggle-on')}
                role="switch"
                aria-checked={xamongDirectGeneralChat}
                onClick={() => setXamongDirectGeneralChat((v) => !v)}
              >
                <span className="sp-toggle-thumb" />
              </button>
              <span className="sp-toggle-label">
                {xamongDirectGeneralChat ? t('settings.quickChatDirect') : t('settings.quickChatWorker')}
              </span>
            </div>
            <p className="sp-hint">{t('settings.quickChatHint')}</p>
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xamong-direct-chat-model">
              {t('settings.gowooriChatModelLabel')}
            </label>
            <div className="sp-input-row">
              <input
                id="sp-xamong-direct-chat-model"
                className="sp-input"
                type="text"
                value={xamongDirectChatModel}
                placeholder={t('settings.modelCustomPlaceholder')}
                onChange={(e) => setXamongDirectChatModel(e.target.value)}
                spellCheck={false}
              />
              {xamongDirectChatModel && (
                <button
                  className="sp-btn-ghost sp-icon-btn"
                  title={t('common.reset')}
                  onClick={() => setXamongDirectChatModel('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="sp-field">
          <label className="sp-label" htmlFor="sp-xamong-worker-policies">
            {t('settings.gowooriWorkerPoliciesLabel')}
          </label>
          <textarea
            id="sp-xamong-worker-policies"
            className={cls('sp-input', 'sp-textarea', xamongWorkerTierPoliciesError && 'sp-input-error')}
            value={xamongWorkerTierPolicies}
            placeholder='{"default":{"maxPerUser":2,"warmPoolSize":1},"pro":{"maxPerUser":4,"warmPoolSize":2}}'
            onChange={(e) => handleWorkerTierPoliciesChange(e.target.value)}
            rows={4}
            spellCheck={false}
          />
          {xamongWorkerTierPoliciesError ? (
            <p className="sp-error">{xamongWorkerTierPoliciesError}</p>
          ) : (
            <p className="sp-hint">{t('settings.workerPolicyHint')}</p>
          )}
        </div>

        <div className="sp-grid two">
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-default-shell">
              {t('settings.defaultShellLabel')}
            </label>
            <select
              id="sp-default-shell"
              className="sp-input"
              value={defaultShell}
              onChange={(e) => setDefaultShell(e.target.value as ShellKind)}
            >
              {shellOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={!option.available}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="sp-hint">{t('settings.defaultShellHint')}</p>
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-default-cwd">
              {t('settings.defaultCwdLabel')}
            </label>
            <div className="sp-input-row">
              <input
                id="sp-default-cwd"
                className="sp-input"
                type="text"
                value={defaultCwd}
                readOnly
                placeholder={t('settings.defaultCwdPlaceholder')}
              />
              <button
                className="sp-btn-ghost sp-icon-btn"
                title={t('settings.defaultCwdSelectTitle')}
                onClick={async () => {
                  const selected = await window.terminalAPI.selectCwd();
                  if (selected !== null) setDefaultCwd(selected);
                }}
              >
                …
              </button>
              {defaultCwd && (
                <button
                  className="sp-btn-ghost sp-icon-btn"
                  title={t('settings.defaultCwdResetTitle')}
                  onClick={() => setDefaultCwd('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.agentApiTitle')}</h2>
            <p>{t('settings.agentApiDesc')}</p>
          </div>
        </div>

        <div className="sp-grid two">
          <div className="sp-field sp-field-inline">
            <label className="sp-label" htmlFor="sp-xamong-autostart">
              {t('settings.agentApiAutoStart')}
            </label>
            <button
              id="sp-xamong-autostart"
              className={cls('sp-toggle', xamongAutoStart && 'sp-toggle-on')}
              role="switch"
              aria-checked={xamongAutoStart}
              onClick={() => setXamongAutoStart((v) => !v)}
            >
              <span className="sp-toggle-thumb" />
            </button>
            <span className="sp-toggle-label">
              {xamongAutoStart ? t('settings.agentApiAutoStartOn') : t('settings.agentApiAutoStartOff')}
            </span>
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-xamong-port">
              {t('settings.agentApiPortLabel')}
            </label>
            <div className="sp-input-row">
              <input
                id="sp-xamong-port"
                className={cls('sp-input', 'sp-input-port', xamongPortError && 'sp-input-error')}
                type="number"
                min={PORT_MIN}
                max={PORT_MAX}
                value={xamongPortStr}
                onChange={(e) => handleXamongPortChange(e.target.value)}
              />
              {renderInputReset(t('settings.agentApiPortResetTitle'), () =>
                handleXamongPortChange(String(DEFAULT_XAMONG_CODE_PORT)),
              )}
            </div>
            {xamongPortError && <p className="sp-error">{xamongPortError}</p>}
          </div>
        </div>

        <div className="sp-server-status-row">
          <span className={cls('sp-server-dot', xamongStatus.running ? 'sp-dot-on' : 'sp-dot-off')} />
          <span className="sp-server-status-text">
            {xamongStatus.running
              ? `${t('settings.agentApiStatusRunning')} (${xamongStatus.url}${xamongStatus.pid != null ? `, PID ${xamongStatus.pid}` : ''}${xamongStatus.openAiModel ? `, ${xamongStatus.openAiModel}` : ''})`
              : xamongStatus.error
                ? `${t('settings.agentApiStatusStoppedDash')} ${xamongStatus.error}`
                : t('settings.agentApiStatusStopped')}
          </span>
          <button
            className={cls('sp-btn', xamongStatus.running ? 'sp-btn-danger' : 'sp-btn-success')}
            disabled={xamongBusy || !!xamongPortError}
            onClick={handleXamongToggle}
          >
            {xamongBusy
              ? t('settings.agentApiProcessing')
              : xamongStatus.running
                ? t('settings.agentApiStop')
                : t('settings.agentApiStart')}
          </button>
        </div>

        {xamongStatus.running && (
          <button
            className="sp-btn-ghost sp-btn-sm"
            onClick={async () => {
              const agentUrl =
                xamongStatus.port === DEFAULT_XAMONG_CODE_PORT && xamongStatus.host === DEFAULT_XAMONG_CODE_HOST
                  ? ''
                  : xamongStatus.url;
              const nextAiProvider = { ...aiProvider, xcAgentApiUrl: agentUrl };
              setAiProvider(nextAiProvider);
              try {
                await saveUpdatedSettings({ aiProvider: nextAiProvider });
                setSettingsSaveError('');
              } catch (error) {
                setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
              }
            }}
          >
            {t('settings.agentApiUseAsChat')}
          </button>
        )}
      </section>
    </div>
  );

  const renderLocalCli = () => {
    const installedCount = localCliAgents.filter((agent) => agent.installed).length;
    const selected = localCliAgents.find((agent) => agent.id === localCliSelectedId);
    const integrationTargets = providerIntegrationStatus?.cliTargets ?? [];

    return (
      <div className="sp-stack" data-settings-section="local-cli">
        <section className="sp-section">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.localCliTitle')}</h2>
              <p>{t('settings.localCliDesc')}</p>
            </div>
            <div className="sp-actions-row sp-actions-row-tight">
              <button className="sp-btn-ghost" disabled={localCliBusy} onClick={scanLocalCli}>
                {localCliBusy ? t('settings.localCliChecking') : t('settings.localCliTest')}
              </button>
              <button className="sp-btn-ghost" disabled={localCliBusy} onClick={scanLocalCli}>
                {t('settings.localCliRescan')}
              </button>
            </div>
          </div>

          <div className="sp-field sp-field-inline sp-cli-auto-row">
            <label className="sp-label" htmlFor="sp-local-cli-auto">
              {t('settings.localCliEnvLabel')}
            </label>
            <button
              id="sp-local-cli-auto"
              className={cls('sp-toggle', localCliAutoConfigure && 'sp-toggle-on')}
              role="switch"
              aria-checked={localCliAutoConfigure}
              onClick={() => setLocalCliAutoConfigure((v) => !v)}
            >
              <span className="sp-toggle-thumb" />
            </button>
            <span className="sp-toggle-label">
              {localCliAutoConfigure ? t('settings.localCliEnvOn') : t('settings.localCliEnvOff')}
            </span>
          </div>

          <div className="sp-cli-summary">
            <span>{t('settings.localCliInstalledCount', { count: String(installedCount) })}</span>
            <span>{t('settings.localCliSelectedCount', { count: String(selected?.label ?? localCliSelectedId) })}</span>
          </div>

          <div className="sp-cli-grid" role="list">
            {localCliAgents.map((agent) => (
              <button
                key={agent.id}
                className={cls(
                  'sp-cli-card',
                  `sp-cli-card-${agent.accent}`,
                  agent.installed && 'is-installed',
                  localCliSelectedId === agent.id && 'is-selected',
                )}
                disabled={!agent.installed}
                onClick={() => setLocalCliSelectedId(agent.id)}
                role="listitem"
              >
                <span className="sp-cli-icon" aria-hidden="true">
                  {agent.label
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')}
                </span>
                <span className="sp-cli-copy">
                  <strong>{agent.label}</strong>
                  <small>
                    {agent.installed ? agent.version || agent.commandPath : t('settings.localCliNotInstalled')}
                  </small>
                </span>
                <span className={cls('sp-cli-select-dot', localCliSelectedId === agent.id && 'is-on')} />
              </button>
            ))}
          </div>

          {localCliAgents.length === 0 && <div className="sp-empty-block">{t('settings.localCliLoadFailed')}</div>}
        </section>

        <section className="sp-section" data-settings-section="local-cli-integrations">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.localCliIntegrationTitle')}</h2>
              <p>{t('settings.localCliIntegrationDesc')}</p>
            </div>
            <button
              className="sp-btn-ghost"
              type="button"
              disabled={providerIntegrationBusy}
              onClick={() => loadProviderIntegrationStatus()}
            >
              {providerIntegrationBusy ? t('common.checking') : t('common.refresh')}
            </button>
          </div>
          <div className="sp-grid two">
            {integrationTargets.map((target) => {
              const busy = cliIntegrationBusyTarget === target.id;
              return (
                <div className="sp-info-card" key={target.id}>
                  <strong>{target.label}</strong>
                  <span>
                    {t('settings.localCliIntegrationMcpPath')}: <code>{target.mcpConfigPath}</code>
                  </span>
                  {target.skillPath && (
                    <span>
                      {t('settings.localCliIntegrationSkillPath')}: <code>{target.skillPath}</code>
                    </span>
                  )}
                  <span className={cls('sp-pill', target.mcpInstalled && 'sp-pill-on')}>
                    {target.mcpInstalled
                      ? t('settings.localCliIntegrationMcpInstalled')
                      : t('settings.localCliIntegrationMcpPending')}
                  </span>
                  {target.supportsSkill && (
                    <span className={cls('sp-pill', target.skillInstalled && 'sp-pill-on')}>
                      {target.skillInstalled
                        ? t('settings.localCliIntegrationSkillInstalled')
                        : t('settings.localCliIntegrationSkillPending')}
                    </span>
                  )}
                  <div className="sp-actions-row sp-actions-row-tight">
                    <button
                      className="sp-btn-ghost sp-btn-sm"
                      type="button"
                      disabled={busy}
                      onClick={() => handleCliIntegrationInstall(target.id, 'mcp')}
                    >
                      {t('settings.localCliIntegrationInstallMcp')}
                    </button>
                    {target.supportsSkill && (
                      <button
                        className="sp-btn-ghost sp-btn-sm"
                        type="button"
                        disabled={busy}
                        onClick={() => handleCliIntegrationInstall(target.id, 'skill')}
                      >
                        {t('settings.localCliIntegrationInstallSkill')}
                      </button>
                    )}
                    <button
                      className="sp-btn sp-btn-sm"
                      type="button"
                      disabled={busy}
                      onClick={() => handleCliIntegrationInstall(target.id, 'all')}
                    >
                      {busy ? t('common.processing') : t('settings.localCliIntegrationInstallAll')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {providerIntegrationMessage && <p className="sp-hint">{providerIntegrationMessage}</p>}
        </section>

        <section className="sp-section">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.terminalApplyTitle')}</h2>
              <p>{t('settings.terminalApplyDesc')}</p>
            </div>
          </div>
          <div className="sp-grid two">
            <div className="sp-info-card">
              <strong>{t('settings.terminalApplyCliCard')}</strong>
              <span>{selected?.commandPath || t('settings.terminalApplyCliHint')}</span>
            </div>
            <div className="sp-info-card">
              <strong>{t('settings.terminalApplyEnvCard')}</strong>
              <span>{t('settings.terminalApplyGowooriEnvCard')}</span>
            </div>
          </div>
          <p className="sp-hint">{t('settings.terminalApplyExample')}</p>
        </section>
      </div>
    );
  };

  const renderGowooriAgentSettings = () => (
    <section className="sp-section" data-settings-section="gowoori-agent">
      <div className="sp-section-heading">
        <div>
          <h2>{t('settings.gowooriAgentSettingsTitle')}</h2>
          <p>{t('settings.gowooriAgentSettingsDesc')}</p>
        </div>
      </div>

      <div className="sp-field">
        <label className="sp-label" htmlFor="sp-gowoori-sports-standings-endpoint">
          {t('settings.gowooriSportsStandingsEndpointLabel')}
        </label>
        <div className="sp-input-row">
          <input
            id="sp-gowoori-sports-standings-endpoint"
            className="sp-input"
            type="text"
            value={gowooriChatSportsStandingsEndpoint}
            onChange={(e) => {
              setGowooriChatSportsStandingsEndpoint(e.target.value);
              setGowooriSportsStandingsEndpointTestMessage('');
            }}
            placeholder={t('settings.gowooriSportsStandingsEndpointPlaceholder')}
            spellCheck={false}
          />
          <button
            id="sp-gowoori-sports-standings-endpoint-test"
            className="sp-btn-ghost"
            disabled={gowooriSportsStandingsEndpointTesting}
            onClick={handleGowooriSportsStandingsEndpointTest}
          >
            {gowooriSportsStandingsEndpointTesting
              ? t('common.checking')
              : t('settings.gowooriSportsStandingsEndpointTest')}
          </button>
        </div>
        {gowooriSportsStandingsEndpointTestMessage && (
          <p className="sp-hint">{gowooriSportsStandingsEndpointTestMessage}</p>
        )}
        <p className="sp-hint">{t('settings.gowooriSportsStandingsEndpointHint')}</p>
      </div>
    </section>
  );

  const renderByokProvider = () => (
    <section className="sp-section" data-settings-section="byok-provider">
      <div className="sp-field">
        <label className="sp-label" htmlFor="sp-provider-profile">
          {t('settings.aiProviderProfileLabel')}
        </label>
        <div className="sp-input-row">
          <select
            id="sp-provider-profile"
            className="sp-input"
            value={activeAiProviderProfileId}
            onChange={(e) => handleAiProviderProfileSelect(e.target.value)}
          >
            {aiProviderProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <button className="sp-btn-ghost" onClick={handleAiProviderProfileSave}>
            {t('settings.aiProviderProfileSave')}
          </button>
          <button className="sp-btn-ghost" onClick={handleAiProviderProfileCreate}>
            {t('settings.aiProviderProfileNew')}
          </button>
          <button
            className="sp-btn-ghost"
            disabled={aiProviderProfiles.length <= 1}
            onClick={handleAiProviderProfileDelete}
          >
            {t('settings.aiProviderProfileDelete')}
          </button>
        </div>
        <p className="sp-hint">{t('settings.aiProviderProfileHint')}</p>
      </div>

      <div className="sp-provider-tabs" role="tablist" aria-label="LLM provider">
        {PROVIDER_ORDER.map((provider) => (
          <button
            key={provider}
            className={cls('sp-provider-tab', aiProvider.provider === provider && 'is-active')}
            onClick={() => handleProviderChange(provider)}
          >
            {AI_PROVIDERS[provider].shortLabel}
          </button>
        ))}
      </div>

      <div className="sp-section-heading">
        <div>
          <h2>{getProviderLabel(aiProvider.provider)} API</h2>
          <p>{t('settings.aiProviderHint')}</p>
        </div>
        <button
          className="sp-btn-ghost"
          title={t('settings.aiProviderTestTitle')}
          disabled={aiProviderTesting}
          onClick={handleAiProviderTest}
        >
          {aiProviderTesting ? t('common.checking') : t('settings.aiProviderTest')}
        </button>
      </div>
      {aiProviderTestMessage && <p className="sp-hint">{aiProviderTestMessage}</p>}

      <div className="sp-field">
        <label className="sp-label" htmlFor="sp-provider-quick">
          {t('settings.aiQuickInputLabel')}
        </label>
        <select
          id="sp-provider-quick"
          className="sp-input"
          value={aiProvider.provider}
          onChange={(e) => handleProviderChange(e.target.value as AiProviderKind)}
        >
          {PROVIDER_ORDER.map((provider) => (
            <option key={provider} value={provider}>
              {getProviderLabel(provider)}
            </option>
          ))}
        </select>
      </div>

      {activeProviderMeta.needsKey && (
        <div className="sp-field">
          <label className="sp-label" htmlFor="sp-provider-key">
            {t('settings.aiApiKeyLabel')}
          </label>
          <div className="sp-input-row">
            <input
              id="sp-provider-key"
              className="sp-input"
              type={showApiKey ? 'text' : 'password'}
              value={aiProvider.apiKey}
              onChange={(e) => patchAiProvider({ apiKey: e.target.value })}
              placeholder={`${getProviderLabel(aiProvider.provider)} API Key`}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              className="sp-btn-ghost sp-icon-btn"
              title={showApiKey ? t('settings.aiApiKeyHideTitle') : t('settings.aiApiKeyShowTitle')}
              onClick={() => setShowApiKey((v) => !v)}
            >
              {showApiKey ? t('settings.aiApiKeyHidden') : t('settings.aiApiKeyShown')}
            </button>
            {aiProvider.apiKey && (
              <button
                className="sp-btn-ghost sp-icon-btn"
                title={t('settings.aiApiKeyResetTitle')}
                onClick={() => patchAiProvider({ apiKey: '' })}
              >
                ✕
              </button>
            )}
          </div>
          <p className="sp-hint">{t('settings.aiApiKeyVaultHint')}</p>
        </div>
      )}

      <div className="sp-grid two">
        <div className="sp-field">
          <label className="sp-label" htmlFor="sp-provider-model">
            {t(getAiProviderModelLabelKey(aiProvider.provider))}
          </label>
          <select
            id="sp-provider-model"
            className="sp-input"
            value={aiProvider.model}
            onChange={(e) => patchAiProvider({ model: e.target.value })}
          >
            {activeProviderMeta.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div className="sp-field">
          <label className="sp-label" htmlFor="sp-provider-model-custom">
            {t(getAiProviderModelCustomLabelKey(aiProvider.provider))}
          </label>
          <input
            id="sp-provider-model-custom"
            className="sp-input"
            type="text"
            value={activeProviderMeta.models.includes(aiProvider.model) ? '' : aiProvider.model}
            placeholder={t(getAiProviderModelCustomPlaceholderKey(aiProvider.provider))}
            onChange={(e) => patchAiProvider({ model: e.target.value || activeProviderMeta.defaultModel })}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="sp-field">
        <label className="sp-label" htmlFor="sp-provider-base">
          {t(getAiProviderBaseUrlLabelKey(aiProvider.provider))}
        </label>
        <div className="sp-input-row">
          <input
            id="sp-provider-base"
            className="sp-input"
            type="text"
            value={aiProvider.baseUrl}
            onChange={(e) => patchAiProvider({ baseUrl: e.target.value })}
            placeholder={getAiProviderBaseUrlPlaceholder(aiProvider.provider, activeProviderMeta, t)}
            spellCheck={false}
          />
          {aiProvider.baseUrl &&
            renderInputReset(t('settings.aiEndpointResetTitle'), () =>
              patchAiProvider({ baseUrl: activeProviderMeta.defaultBaseUrl }),
            )}
        </div>
        <p className="sp-hint">{t(getAiProviderEndpointHintKey(aiProvider.provider))}</p>
      </div>

      {xenisPhase5Enabled && (
        <div className="sp-grid three">
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-agent-api">
              {t('settings.aiAgentApiLabel')}
            </label>
            <input
              id="sp-agent-api"
              className="sp-input"
              type="text"
              value={aiProvider.xcAgentApiUrl ?? ''}
              onChange={(e) => patchAiProvider({ xcAgentApiUrl: e.target.value })}
              placeholder={t('settings.aiAgentApiPlaceholder')}
              spellCheck={false}
            />
          </div>
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-draft-api">
              {t('settings.aiDraftApiLabel')}
            </label>
            <input
              id="sp-draft-api"
              className="sp-input"
              type="text"
              value={aiProvider.xcApiUrl}
              onChange={(e) => patchAiProvider({ xcApiUrl: e.target.value })}
              placeholder={t('settings.aiDraftApiPlaceholder')}
              spellCheck={false}
            />
          </div>
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-lab-api">
              Lab API
            </label>
            <input
              id="sp-lab-api"
              className="sp-input"
              type="text"
              value={aiProvider.labApiUrl ?? ''}
              onChange={(e) => patchAiProvider({ labApiUrl: e.target.value })}
              placeholder={DEFAULT_LAB_API_URL}
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </section>
  );

  const renderRemoteTerminals = () => (
    <div className="sp-stack" data-settings-section="remote-terminals">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.remoteTerminalsTitle')}</h2>
            <p>{t('settings.remoteTerminalsDesc')}</p>
          </div>
          <div className="sp-actions-row">
            <button className="sp-btn" onClick={() => handleLocalProfileAdd()}>
              {t('settings.remoteAddLocalShell')}
            </button>
            <button className="sp-btn" onClick={() => handleRemoteProfileAdd('ssh')}>
              {t('settings.remoteAddSsh')}
            </button>
            <button className="sp-btn" onClick={() => handleRemoteProfileAdd('telnet')}>
              {t('settings.remoteAddTelnet')}
            </button>
            <button className="sp-btn-ghost" onClick={handleTerminalGroupAdd}>
              {t('settings.remoteAddGroup')}
            </button>
          </div>
        </div>

        <div className="sp-field">
          <label className="sp-label">{t('settings.remoteGroupsLabel')}</label>
          {terminalGroups.length === 0 ? (
            <p className="sp-hint">{t('settings.remoteNoGroupsHint')}</p>
          ) : (
            <div className="sp-stack">
              {terminalGroups.map((group) => (
                <div className="sp-input-row" key={group.id}>
                  <input
                    className="sp-input"
                    type="text"
                    value={group.name}
                    onChange={(e) => patchTerminalGroup(group.id, { name: e.target.value })}
                    placeholder={t('settings.remoteGroupNameLabel')}
                  />
                  <button
                    className="sp-btn-ghost sp-icon-btn"
                    title={t('settings.remoteGroupDeleteTitle')}
                    onClick={() => handleTerminalGroupDelete(group.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sp-grid two">
          <div className="sp-stack">
            {terminalProfileItems.length === 0 ? (
              <div className="sp-empty-block">{t('settings.remoteEmpty')}</div>
            ) : (
              <>
                {localProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    className={`sp-select-card${selectedTerminalProfileId === `local:${profile.id}` ? ' sp-select-card-active' : ''}`}
                    onClick={() => setSelectedTerminalProfileId(`local:${profile.id}`)}
                  >
                    <span className="sp-square-icon">{profile.shell.toUpperCase().slice(0, 3)}</span>
                    <span>
                      <strong>{profile.name || t('settings.localShellUnnamed')}</strong>
                      <small>
                        {[
                          shellOptions.find((option) => option.value === profile.shell)?.label ?? profile.shell,
                          profile.cwd || t('settings.defaultCwdPlaceholder'),
                        ].join(' · ')}
                      </small>
                    </span>
                    {selectedTerminalProfileId === `local:${profile.id}` && <span className="sp-chevron">✓</span>}
                  </button>
                ))}
                {remoteProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    className={`sp-select-card${selectedTerminalProfileId === `remote:${profile.id}` ? ' sp-select-card-active' : ''}`}
                    onClick={() => setSelectedTerminalProfileId(`remote:${profile.id}`)}
                  >
                    <span className="sp-square-icon">{profile.protocol.toUpperCase()}</span>
                    <span>
                      <strong>{profile.name || profile.host || t('settings.remoteUnnamed')}</strong>
                      <small>
                        {profile.host
                          ? `${profile.username ? `${profile.username}@` : ''}${profile.host}:${profile.port}`
                          : t('settings.remoteHostMissing')}
                      </small>
                    </span>
                    {selectedTerminalProfileId === `remote:${profile.id}` && <span className="sp-chevron">✓</span>}
                  </button>
                ))}
              </>
            )}
          </div>

          {selectedLocalProfile ? (
            <div className="sp-stack">
              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-local-name">
                    {t('settings.remoteNameLabel')}
                  </label>
                  <input
                    id="sp-local-name"
                    className="sp-input"
                    type="text"
                    value={selectedLocalProfile.name}
                    onChange={(e) => patchLocalProfile(selectedLocalProfile.id, { name: e.target.value })}
                    placeholder={t('settings.localShellNamePlaceholder')}
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-local-group">
                    {t('settings.remoteGroupNameLabel')}
                  </label>
                  <select
                    id="sp-local-group"
                    className="sp-input"
                    value={selectedLocalProfile.groupId}
                    onChange={(e) => patchLocalProfile(selectedLocalProfile.id, { groupId: e.target.value })}
                  >
                    <option value="">{t('settings.remoteNoGroup')}</option>
                    {terminalGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name || t('settings.remoteUnnamedGroup')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-local-shell">
                    {t('settings.localShellKindLabel')}
                  </label>
                  <select
                    id="sp-local-shell"
                    className="sp-input"
                    value={selectedLocalProfile.shell}
                    onChange={(e) => patchLocalProfile(selectedLocalProfile.id, { shell: e.target.value as ShellKind })}
                  >
                    {shellOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={!option.available}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-local-cli">
                    {t('settings.localShellCliLabel')}
                  </label>
                  <select
                    id="sp-local-cli"
                    className="sp-input"
                    value={selectedLocalProfile.localCliAgentId}
                    onChange={(e) =>
                      patchLocalProfile(selectedLocalProfile.id, {
                        localCliAgentId: e.target.value as LocalTerminalCliSelection,
                      })
                    }
                  >
                    <option value="default">{t('settings.localShellCliDefault')}</option>
                    <option value="none">{t('settings.localShellCliNone')}</option>
                    {localCliAgents.map((agent) => (
                      <option key={agent.id} value={agent.id} disabled={!agent.installed}>
                        {t('settings.localShellCliPrepare', { label: agent.label })}
                        {agent.installed ? '' : ` (${t('settings.localCliNotInstalled')})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sp-field">
                <label className="sp-label" htmlFor="sp-local-cwd">
                  {t('settings.localShellCwdLabel')}
                </label>
                <div className="sp-input-row">
                  <input
                    id="sp-local-cwd"
                    className="sp-input"
                    type="text"
                    value={selectedLocalProfile.cwd}
                    onChange={(e) => patchLocalProfile(selectedLocalProfile.id, { cwd: e.target.value })}
                    placeholder={t('settings.defaultCwdPlaceholder')}
                    spellCheck={false}
                  />
                  <button
                    className="sp-btn-ghost sp-icon-btn"
                    title={t('settings.defaultCwdSelectTitle')}
                    onClick={async () => {
                      const selected = await window.terminalAPI.selectCwd();
                      if (selected) patchLocalProfile(selectedLocalProfile.id, { cwd: selected });
                    }}
                  >
                    …
                  </button>
                  {selectedLocalProfile.cwd && (
                    <button
                      className="sp-btn-ghost sp-icon-btn"
                      title={t('common.reset')}
                      onClick={() => patchLocalProfile(selectedLocalProfile.id, { cwd: '' })}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-local-env">
                    {t('settings.localShellEnvironmentLabel')}
                  </label>
                  <textarea
                    id="sp-local-env"
                    className="sp-input"
                    rows={5}
                    value={selectedLocalProfile.environmentText}
                    onChange={(e) => patchLocalProfile(selectedLocalProfile.id, { environmentText: e.target.value })}
                    placeholder={getLocalShellEnvironmentPlaceholder(
                      selectedLocalProfile.shell,
                      selectedLocalProfile.localCliAgentId,
                      localCliSelectedId,
                    )}
                    spellCheck={false}
                  />
                  <p className="sp-hint">{t('settings.localShellEnvironmentHint')}</p>
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-local-command">
                    {t('settings.localShellStartupCommandLabel')}
                  </label>
                  <textarea
                    id="sp-local-command"
                    className="sp-input"
                    rows={5}
                    value={selectedLocalProfile.initialCommand}
                    onChange={(e) => patchLocalProfile(selectedLocalProfile.id, { initialCommand: e.target.value })}
                    placeholder={selectedLocalProfile.shell === 'cmd' ? 'dir' : 'pwd'}
                    spellCheck={false}
                  />
                  <p className="sp-hint">{t('settings.localShellStartupCommandHint')}</p>
                </div>
              </div>

              <div className="sp-actions-row">
                <button className="sp-btn sp-btn-primary" onClick={() => handleLocalConnect(selectedLocalProfile)}>
                  {t('settings.remoteConnect')}
                </button>
                <button
                  className="sp-btn sp-btn-danger"
                  onClick={() => handleLocalProfileDelete(selectedLocalProfile.id)}
                >
                  {t('settings.remoteDelete')}
                </button>
                <span className="sp-hint">{t('settings.remoteSaveHint')}</span>
              </div>
            </div>
          ) : selectedRemoteProfile ? (
            <div className="sp-stack">
              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-protocol">
                    {t('settings.remoteProtocolLabel')}
                  </label>
                  <select
                    id="sp-remote-protocol"
                    className="sp-input"
                    value={selectedRemoteProfile.protocol}
                    onChange={(e) =>
                      handleRemoteProtocolChange(selectedRemoteProfile, e.target.value as RemoteTerminalProtocol)
                    }
                  >
                    <option value="ssh">SSH</option>
                    <option value="telnet">TELNET</option>
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-name">
                    {t('settings.remoteNameLabel')}
                  </label>
                  <input
                    id="sp-remote-name"
                    className="sp-input"
                    type="text"
                    value={selectedRemoteProfile.name}
                    onChange={(e) => patchRemoteProfile(selectedRemoteProfile.id, { name: e.target.value })}
                    placeholder={t('settings.remoteNamePlaceholder')}
                  />
                </div>
              </div>

              <div className="sp-field">
                <label className="sp-label" htmlFor="sp-remote-group">
                  {t('settings.remoteGroupNameLabel')}
                </label>
                <select
                  id="sp-remote-group"
                  className="sp-input"
                  value={selectedRemoteProfile.groupId}
                  onChange={(e) => patchRemoteProfile(selectedRemoteProfile.id, { groupId: e.target.value })}
                >
                  <option value="">{t('settings.remoteNoGroup')}</option>
                  {terminalGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name || t('settings.remoteUnnamedGroup')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-host">
                    {t('settings.remoteHostLabel')}
                  </label>
                  <input
                    id="sp-remote-host"
                    className="sp-input"
                    type="text"
                    value={selectedRemoteProfile.host}
                    onChange={(e) => patchRemoteProfile(selectedRemoteProfile.id, { host: e.target.value })}
                    placeholder="example.com"
                    spellCheck={false}
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-port">
                    {t('settings.remotePortLabel')}
                  </label>
                  <input
                    id="sp-remote-port"
                    className="sp-input"
                    type="number"
                    min={1}
                    max={65535}
                    value={selectedRemoteProfile.port}
                    onChange={(e) =>
                      patchRemoteProfile(selectedRemoteProfile.id, {
                        port: normalizeRemotePort(e.target.value, defaultRemotePort(selectedRemoteProfile.protocol)),
                      })
                    }
                  />
                </div>
              </div>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-username">
                    {t('settings.remoteUsernameLabel')}
                  </label>
                  <input
                    id="sp-remote-username"
                    className="sp-input"
                    type="text"
                    value={selectedRemoteProfile.username}
                    onChange={(e) => patchRemoteProfile(selectedRemoteProfile.id, { username: e.target.value })}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-password">
                    {t('settings.remotePasswordLabel')}
                  </label>
                  <div className="sp-input-row">
                    <input
                      id="sp-remote-password"
                      className="sp-input"
                      type={showRemotePassword ? 'text' : 'password'}
                      value={selectedRemoteProfile.password}
                      onChange={(e) => patchRemoteProfile(selectedRemoteProfile.id, { password: e.target.value })}
                      autoComplete="off"
                    />
                    <button
                      className="sp-btn-ghost sp-icon-btn"
                      title={showRemotePassword ? t('common.hide') : t('common.show')}
                      onClick={() => setShowRemotePassword((v) => !v)}
                    >
                      {showRemotePassword ? t('common.hidden') : t('common.show')}
                    </button>
                    {selectedRemoteProfile.password && (
                      <button
                        className="sp-btn-ghost sp-icon-btn"
                        title={t('common.reset')}
                        onClick={() => patchRemoteProfile(selectedRemoteProfile.id, { password: '' })}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="sp-hint">{t('settings.remotePasswordStoredHint')}</p>
                </div>
              </div>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-key">
                    {t('settings.remotePrivateKeyLabel')}
                  </label>
                  <div className="sp-input-row">
                    <input
                      id="sp-remote-key"
                      className="sp-input"
                      type="text"
                      value={selectedRemoteProfile.privateKeyPath}
                      onChange={(e) => patchRemoteProfile(selectedRemoteProfile.id, { privateKeyPath: e.target.value })}
                      placeholder={t('settings.remotePrivateKeyPlaceholder')}
                      spellCheck={false}
                    />
                    <button
                      className="sp-btn-ghost sp-icon-btn"
                      title={t('settings.remotePrivateKeySelectTitle')}
                      onClick={async () => {
                        const selected = await window.fileAPI.openFile();
                        if (selected?.filePath)
                          patchRemoteProfile(selectedRemoteProfile.id, { privateKeyPath: selected.filePath });
                      }}
                    >
                      …
                    </button>
                    {selectedRemoteProfile.privateKeyPath && (
                      <button
                        className="sp-btn-ghost sp-icon-btn"
                        title={t('common.reset')}
                        onClick={() => patchRemoteProfile(selectedRemoteProfile.id, { privateKeyPath: '' })}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-passphrase">
                    {t('settings.remotePassphraseLabel')}
                  </label>
                  <div className="sp-input-row">
                    <input
                      id="sp-remote-passphrase"
                      className="sp-input"
                      type={showRemotePassphrase ? 'text' : 'password'}
                      value={selectedRemoteProfile.passphrase}
                      onChange={(e) => patchRemoteProfile(selectedRemoteProfile.id, { passphrase: e.target.value })}
                      autoComplete="off"
                    />
                    <button
                      className="sp-btn-ghost sp-icon-btn"
                      title={showRemotePassphrase ? t('common.hide') : t('common.show')}
                      onClick={() => setShowRemotePassphrase((v) => !v)}
                    >
                      {showRemotePassphrase ? t('common.hidden') : t('common.show')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-timeout">
                    {t('settings.remoteTimeoutLabel')}
                  </label>
                  <input
                    id="sp-remote-timeout"
                    className="sp-input"
                    type="number"
                    min={1000}
                    max={120000}
                    step={1000}
                    value={selectedRemoteProfile.connectTimeoutMs}
                    onChange={(e) =>
                      patchRemoteProfile(selectedRemoteProfile.id, {
                        connectTimeoutMs: Math.max(
                          1000,
                          Math.min(120000, Number(e.target.value) || DEFAULT_REMOTE_TIMEOUT_MS),
                        ),
                      })
                    }
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-command">
                    {t('settings.remoteInitialCommandLabel')}
                  </label>
                  <input
                    id="sp-remote-command"
                    className="sp-input"
                    type="text"
                    value={selectedRemoteProfile.initialCommand}
                    onChange={(e) => patchRemoteProfile(selectedRemoteProfile.id, { initialCommand: e.target.value })}
                    placeholder={t('settings.remoteInitialCommandPlaceholder')}
                    spellCheck={false}
                  />
                </div>
              </div>

              {selectedRemoteProfile.protocol === 'telnet' && (
                <p className="sp-hint">{t('settings.remoteTelnetAutoLoginHint')}</p>
              )}

              <div className="sp-actions-row">
                <button
                  className="sp-btn sp-btn-primary"
                  disabled={!selectedRemoteProfile.host.trim()}
                  onClick={() => handleRemoteConnect(selectedRemoteProfile)}
                >
                  {t('settings.remoteConnect')}
                </button>
                <button
                  className="sp-btn sp-btn-danger"
                  onClick={() => handleRemoteProfileDelete(selectedRemoteProfile.id)}
                >
                  {t('settings.remoteDelete')}
                </button>
                <span className="sp-hint">{t('settings.remoteSaveHint')}</span>
              </div>
            </div>
          ) : (
            <div className="sp-empty-block">{t('settings.remoteSelectEmpty')}</div>
          )}
        </div>
      </section>
    </div>
  );

  const renderRemoteFiles = () => (
    <div className="sp-stack">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.remoteFilesTitle')}</h2>
            <p>{t('settings.remoteFilesDesc')}</p>
          </div>
          <div className="sp-actions-row">
            <button className="sp-btn" onClick={() => handleRemoteFileProfileAdd('sftp')}>
              {t('settings.remoteFileAddSftp')}
            </button>
            <button className="sp-btn" onClick={() => handleRemoteFileProfileAdd('ftp')}>
              {t('settings.remoteFileAddFtp')}
            </button>
            <button className="sp-btn" onClick={() => handleRemoteFileProfileAdd('ftps')}>
              {t('settings.remoteFileAddFtps')}
            </button>
            <button className="sp-btn-ghost" onClick={handleRemoteFileGroupAdd}>
              {t('settings.remoteFileAddGroup')}
            </button>
          </div>
        </div>

        <div className="sp-field">
          <label className="sp-label">{t('settings.remoteFileGroupsLabel')}</label>
          {remoteFileGroups.length === 0 ? (
            <p className="sp-hint">{t('settings.remoteFileNoGroupsHint')}</p>
          ) : (
            <div className="sp-stack">
              {remoteFileGroups.map((group) => (
                <div className="sp-input-row" key={group.id}>
                  <input
                    className="sp-input"
                    type="text"
                    value={group.name}
                    onChange={(e) => patchRemoteFileGroup(group.id, { name: e.target.value })}
                    placeholder={t('settings.remoteFileGroupNameLabel')}
                  />
                  <button
                    className="sp-btn-ghost sp-icon-btn"
                    title={t('settings.remoteFileGroupDeleteTitle')}
                    onClick={() => handleRemoteFileGroupDelete(group.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sp-grid two">
          <div className="sp-stack">
            {remoteFileProfiles.length === 0 ? (
              <div className="sp-empty-block">{t('settings.remoteFileEmpty')}</div>
            ) : (
              remoteFileProfiles.map((profile) => (
                <button
                  key={profile.id}
                  className={`sp-select-card${selectedRemoteFileProfile?.id === profile.id ? ' sp-select-card-active' : ''}`}
                  onClick={() => {
                    setSelectedRemoteFileProfileId(profile.id);
                    setRemoteFileTestMessage('');
                  }}
                >
                  <span className="sp-square-icon">{profile.protocol.toUpperCase()}</span>
                  <span>
                    <strong>{profile.name || profile.host || t('settings.remoteFileUnnamed')}</strong>
                    <small>
                      {profile.host
                        ? `${profile.username ? `${profile.username}@` : ''}${profile.host}:${profile.port}${profile.rootPath ? ` · ${profile.rootPath}` : ''}`
                        : t('settings.remoteHostMissing')}
                    </small>
                  </span>
                  {selectedRemoteFileProfile?.id === profile.id && <span className="sp-chevron">✓</span>}
                </button>
              ))
            )}
          </div>

          {selectedRemoteFileProfile ? (
            <div className="sp-stack">
              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-file-protocol">
                    {t('settings.remoteFileProtocolLabel')}
                  </label>
                  <select
                    id="sp-remote-file-protocol"
                    className="sp-input"
                    value={selectedRemoteFileProfile.protocol}
                    onChange={(e) =>
                      handleRemoteFileProtocolChange(selectedRemoteFileProfile, e.target.value as RemoteFileProtocol)
                    }
                  >
                    <option value="sftp">SFTP</option>
                    <option value="ftp">FTP</option>
                    <option value="ftps">FTPS</option>
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-file-name">
                    {t('settings.remoteFileNameLabel')}
                  </label>
                  <input
                    id="sp-remote-file-name"
                    className="sp-input"
                    type="text"
                    value={selectedRemoteFileProfile.name}
                    onChange={(e) => patchRemoteFileProfile(selectedRemoteFileProfile.id, { name: e.target.value })}
                    placeholder={t('settings.remoteFileNamePlaceholder')}
                  />
                </div>
              </div>

              <div className="sp-field">
                <label className="sp-label" htmlFor="sp-remote-file-group">
                  {t('settings.remoteFileGroupNameLabel')}
                </label>
                <select
                  id="sp-remote-file-group"
                  className="sp-input"
                  value={selectedRemoteFileProfile.groupId}
                  onChange={(e) => patchRemoteFileProfile(selectedRemoteFileProfile.id, { groupId: e.target.value })}
                >
                  <option value="">{t('settings.remoteFileNoGroup')}</option>
                  {remoteFileGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name || t('settings.remoteFileUnnamedGroup')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-file-host">
                    {t('settings.remoteFileHostLabel')}
                  </label>
                  <input
                    id="sp-remote-file-host"
                    className="sp-input"
                    type="text"
                    value={selectedRemoteFileProfile.host}
                    onChange={(e) => patchRemoteFileProfile(selectedRemoteFileProfile.id, { host: e.target.value })}
                    placeholder="example.com"
                    spellCheck={false}
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-file-port">
                    {t('settings.remoteFilePortLabel')}
                  </label>
                  <input
                    id="sp-remote-file-port"
                    className="sp-input"
                    type="number"
                    min={1}
                    max={65535}
                    value={selectedRemoteFileProfile.port}
                    onChange={(e) =>
                      patchRemoteFileProfile(selectedRemoteFileProfile.id, {
                        port: normalizeRemotePort(
                          e.target.value,
                          defaultRemoteFilePort(selectedRemoteFileProfile.protocol),
                        ),
                      })
                    }
                  />
                </div>
              </div>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-file-username">
                    {t('settings.remoteFileUsernameLabel')}
                  </label>
                  <input
                    id="sp-remote-file-username"
                    className="sp-input"
                    type="text"
                    value={selectedRemoteFileProfile.username}
                    onChange={(e) => patchRemoteFileProfile(selectedRemoteFileProfile.id, { username: e.target.value })}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-file-password">
                    {t('settings.remoteFilePasswordLabel')}
                  </label>
                  <div className="sp-input-row">
                    <input
                      id="sp-remote-file-password"
                      className="sp-input"
                      type={showRemotePassword ? 'text' : 'password'}
                      value={selectedRemoteFileProfile.password}
                      onChange={(e) =>
                        patchRemoteFileProfile(selectedRemoteFileProfile.id, { password: e.target.value })
                      }
                      autoComplete="off"
                    />
                    <button
                      className="sp-btn-ghost sp-icon-btn"
                      title={showRemotePassword ? t('common.hide') : t('common.show')}
                      onClick={() => setShowRemotePassword((v) => !v)}
                    >
                      {showRemotePassword ? t('common.hidden') : t('common.show')}
                    </button>
                    {selectedRemoteFileProfile.password && (
                      <button
                        className="sp-btn-ghost sp-icon-btn"
                        title={t('common.reset')}
                        onClick={() => patchRemoteFileProfile(selectedRemoteFileProfile.id, { password: '' })}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="sp-hint">{t('settings.remoteFilePasswordStoredHint')}</p>
                </div>
              </div>

              {selectedRemoteFileProfile.protocol === 'sftp' && (
                <div className="sp-grid two">
                  <div className="sp-field">
                    <label className="sp-label" htmlFor="sp-remote-file-key">
                      {t('settings.remoteFilePrivateKeyLabel')}
                    </label>
                    <div className="sp-input-row">
                      <input
                        id="sp-remote-file-key"
                        className="sp-input"
                        type="text"
                        value={selectedRemoteFileProfile.privateKeyPath}
                        onChange={(e) =>
                          patchRemoteFileProfile(selectedRemoteFileProfile.id, { privateKeyPath: e.target.value })
                        }
                        placeholder={t('settings.remoteFilePrivateKeyPlaceholder')}
                        spellCheck={false}
                      />
                      <button
                        className="sp-btn-ghost sp-icon-btn"
                        title={t('settings.remoteFilePrivateKeySelectTitle')}
                        onClick={async () => {
                          const selected = await window.fileAPI.openFile();
                          if (selected?.filePath)
                            patchRemoteFileProfile(selectedRemoteFileProfile.id, { privateKeyPath: selected.filePath });
                        }}
                      >
                        …
                      </button>
                    </div>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label" htmlFor="sp-remote-file-passphrase">
                      {t('settings.remoteFilePassphraseLabel')}
                    </label>
                    <div className="sp-input-row">
                      <input
                        id="sp-remote-file-passphrase"
                        className="sp-input"
                        type={showRemotePassphrase ? 'text' : 'password'}
                        value={selectedRemoteFileProfile.passphrase}
                        onChange={(e) =>
                          patchRemoteFileProfile(selectedRemoteFileProfile.id, { passphrase: e.target.value })
                        }
                        autoComplete="off"
                      />
                      <button
                        className="sp-btn-ghost sp-icon-btn"
                        title={showRemotePassphrase ? t('common.hide') : t('common.show')}
                        onClick={() => setShowRemotePassphrase((v) => !v)}
                      >
                        {showRemotePassphrase ? t('common.hidden') : t('common.show')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-file-root">
                    {t('settings.remoteFileRootPathLabel')}
                  </label>
                  <input
                    id="sp-remote-file-root"
                    className="sp-input"
                    type="text"
                    value={selectedRemoteFileProfile.rootPath}
                    onChange={(e) => patchRemoteFileProfile(selectedRemoteFileProfile.id, { rootPath: e.target.value })}
                    placeholder={t('settings.remoteFileRootPathPlaceholder')}
                    spellCheck={false}
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-file-encoding">
                    {t('settings.remoteFileEncodingLabel')}
                  </label>
                  <select
                    id="sp-remote-file-encoding"
                    className="sp-input"
                    value={selectedRemoteFileProfile.encoding}
                    onChange={(e) =>
                      patchRemoteFileProfile(selectedRemoteFileProfile.id, {
                        encoding: normalizeRemoteFileEncoding(e.target.value),
                      })
                    }
                  >
                    {REMOTE_FILE_ENCODING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                  <p className="sp-hint">{t('settings.remoteFileEncodingHint')}</p>
                </div>
              </div>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-remote-file-timeout">
                    {t('settings.remoteTimeoutLabel')}
                  </label>
                  <input
                    id="sp-remote-file-timeout"
                    className="sp-input"
                    type="number"
                    min={1000}
                    max={120000}
                    step={1000}
                    value={selectedRemoteFileProfile.connectTimeoutMs}
                    onChange={(e) =>
                      patchRemoteFileProfile(selectedRemoteFileProfile.id, {
                        connectTimeoutMs: Math.max(
                          1000,
                          Math.min(120000, Number(e.target.value) || DEFAULT_REMOTE_TIMEOUT_MS),
                        ),
                      })
                    }
                  />
                </div>
              </div>

              <div className="sp-actions-row">
                <button
                  className="sp-btn sp-btn-primary"
                  disabled={!selectedRemoteFileProfile.host.trim() || remoteFileTesting}
                  onClick={() => handleRemoteFileTest(selectedRemoteFileProfile)}
                >
                  {remoteFileTesting ? t('settings.remoteFileTesting') : t('settings.remoteFileTest')}
                </button>
                <button
                  className="sp-btn sp-btn-danger"
                  onClick={() => handleRemoteFileProfileDelete(selectedRemoteFileProfile.id)}
                >
                  {t('settings.remoteFileDelete')}
                </button>
                <span className="sp-hint">{remoteFileTestMessage || t('settings.remoteFileSaveHint')}</span>
              </div>
            </div>
          ) : (
            <div className="sp-empty-block">{t('settings.remoteFileSelectEmpty')}</div>
          )}
        </div>
      </section>
    </div>
  );

  const renderWindowSizer = () => (
    <div className="sp-stack">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.windowSizerTitle')}</h2>
            <p>{t('settings.windowSizerDesc')}</p>
          </div>
          <div className="sp-actions-row">
            <button className="sp-btn" onClick={handleWindowSizerPresetAdd}>
              {t('settings.windowSizerAdd')}
            </button>
            <button className="sp-btn-ghost" onClick={handleWindowSizerPresetAddCurrent}>
              {t('settings.windowSizerAddCurrent')}
            </button>
          </div>
        </div>

        <div className="sp-grid two">
          <div className="sp-stack">
            {windowSizerPresets.length === 0 ? (
              <div className="sp-empty-block">{t('settings.windowSizerEmpty')}</div>
            ) : (
              windowSizerPresets.map((preset) => (
                <button
                  key={preset.id}
                  className={`sp-select-card${selectedWindowSizerPreset?.id === preset.id ? ' sp-select-card-active' : ''}`}
                  onClick={() => setSelectedWindowSizerPresetId(preset.id)}
                >
                  <span className="sp-square-icon">▣</span>
                  <span>
                    <strong>{preset.name || `${preset.width}x${preset.height}`}</strong>
                    <small>
                      {preset.group ? `${preset.group} · ` : ''}
                      {preset.width}x{preset.height}
                      {preset.moveToPosition ? ` · ${preset.x}, ${preset.y}` : ''}
                    </small>
                  </span>
                  {selectedWindowSizerPreset?.id === preset.id && <span className="sp-chevron">✓</span>}
                </button>
              ))
            )}
          </div>

          {selectedWindowSizerPreset ? (
            <div className="sp-stack">
              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-window-sizer-name">
                    {t('settings.windowSizerNameLabel')}
                  </label>
                  <input
                    id="sp-window-sizer-name"
                    className="sp-input"
                    type="text"
                    value={selectedWindowSizerPreset.name}
                    onChange={(e) => patchWindowSizerPreset(selectedWindowSizerPreset.id, { name: e.target.value })}
                    placeholder="1280x720"
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-window-sizer-group">
                    {t('settings.windowSizerGroupLabel')}
                  </label>
                  <input
                    id="sp-window-sizer-group"
                    className="sp-input"
                    type="text"
                    value={selectedWindowSizerPreset.group}
                    onChange={(e) => patchWindowSizerPreset(selectedWindowSizerPreset.id, { group: e.target.value })}
                    placeholder={t('settings.windowSizerGroupPlaceholder')}
                  />
                </div>
              </div>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-window-sizer-width">
                    {t('settings.windowSizerWidth')}
                  </label>
                  <input
                    id="sp-window-sizer-width"
                    className="sp-input"
                    type="number"
                    min={320}
                    max={7680}
                    value={selectedWindowSizerPreset.width}
                    onChange={(e) =>
                      patchWindowSizerPreset(selectedWindowSizerPreset.id, {
                        width: normalizeWindowSizerNumber(e.target.value, 320, 7680, selectedWindowSizerPreset.width),
                      })
                    }
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-window-sizer-height">
                    {t('settings.windowSizerHeight')}
                  </label>
                  <input
                    id="sp-window-sizer-height"
                    className="sp-input"
                    type="number"
                    min={240}
                    max={4320}
                    value={selectedWindowSizerPreset.height}
                    onChange={(e) =>
                      patchWindowSizerPreset(selectedWindowSizerPreset.id, {
                        height: normalizeWindowSizerNumber(e.target.value, 240, 4320, selectedWindowSizerPreset.height),
                      })
                    }
                  />
                </div>
              </div>

              <label className="sp-field-inline">
                <input
                  type="checkbox"
                  checked={selectedWindowSizerPreset.moveToPosition}
                  onChange={(e) =>
                    patchWindowSizerPreset(selectedWindowSizerPreset.id, { moveToPosition: e.target.checked })
                  }
                />
                <span>{t('settings.windowSizerMoveToPosition')}</span>
              </label>

              <div className="sp-grid two">
                <div className="sp-field">
                  <label className="sp-label" htmlFor="sp-window-sizer-mode">
                    {t('settings.windowSizerCoordinateMode')}
                  </label>
                  <select
                    id="sp-window-sizer-mode"
                    className="sp-input"
                    value={selectedWindowSizerPreset.coordinateMode}
                    disabled={!selectedWindowSizerPreset.moveToPosition}
                    onChange={(e) =>
                      patchWindowSizerPreset(selectedWindowSizerPreset.id, {
                        coordinateMode: e.target.value as WindowSizerCoordinateMode,
                      })
                    }
                  >
                    {WINDOW_SIZER_COORDINATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-label">{t('settings.windowSizerPosition')}</label>
                  <div className="sp-input-row">
                    <input
                      className="sp-input"
                      type="number"
                      value={selectedWindowSizerPreset.x}
                      disabled={!selectedWindowSizerPreset.moveToPosition}
                      aria-label={t('settings.windowSizerX')}
                      onChange={(e) =>
                        patchWindowSizerPreset(selectedWindowSizerPreset.id, {
                          x: normalizeWindowSizerNumber(e.target.value, -100000, 100000, selectedWindowSizerPreset.x),
                        })
                      }
                    />
                    <input
                      className="sp-input"
                      type="number"
                      value={selectedWindowSizerPreset.y}
                      disabled={!selectedWindowSizerPreset.moveToPosition}
                      aria-label={t('settings.windowSizerY')}
                      onChange={(e) =>
                        patchWindowSizerPreset(selectedWindowSizerPreset.id, {
                          y: normalizeWindowSizerNumber(e.target.value, -100000, 100000, selectedWindowSizerPreset.y),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <label className="sp-field-inline">
                <input
                  type="checkbox"
                  checked={selectedWindowSizerPreset.allowOutsideDisplay}
                  disabled={!selectedWindowSizerPreset.moveToPosition}
                  onChange={(e) =>
                    patchWindowSizerPreset(selectedWindowSizerPreset.id, { allowOutsideDisplay: e.target.checked })
                  }
                />
                <span>{t('settings.windowSizerAllowOutsideDisplay')}</span>
              </label>
              <p className="sp-hint">{t('settings.windowSizerPositionHint')}</p>

              <div className="sp-actions-row">
                <button
                  className="sp-btn sp-btn-primary"
                  onClick={() => handleWindowSizerApply(selectedWindowSizerPreset)}
                >
                  {t('settings.windowSizerApply')}
                </button>
                <button
                  className="sp-btn sp-btn-danger"
                  onClick={() => handleWindowSizerPresetDelete(selectedWindowSizerPreset.id)}
                >
                  {t('settings.windowSizerDelete')}
                </button>
                <span className="sp-hint">{t('settings.windowSizerSaveHint')}</span>
              </div>
            </div>
          ) : (
            <div className="sp-empty-block">{t('settings.windowSizerSelectEmpty')}</div>
          )}
        </div>
      </section>
    </div>
  );

  const renderKeyboardShortcuts = () => {
    const commands = getKeyboardShortcutCommands();
    const duplicateAccelerators = findDuplicateAccelerators(keyboardShortcutBindings);
    const bindingByCommandId = new Map(keyboardShortcutBindings.map((binding) => [binding.commandId, binding]));
    const normalizedShortcutQuery = keyboardShortcutQuery.trim().toLowerCase();
    const filteredKeyboardShortcutCommands = normalizedShortcutQuery
      ? commands.filter((command) => {
          const binding = bindingByCommandId.get(command.id);
          const accelerator = normalizeAccelerator(binding?.accelerator ?? '');
          return getKeyboardShortcutSearchText(command, accelerator).includes(normalizedShortcutQuery);
        })
      : commands;

    return (
      <div className="sp-stack">
        <section className="sp-section">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.keyboardShortcutsTitle')}</h2>
              <p>{t('settings.keyboardShortcutsDesc')}</p>
            </div>
          </div>
          <p className="sp-hint">{t('settings.shortcutCaptureHint')}</p>
          {duplicateAccelerators.size > 0 && (
            <p className="sp-hint sp-warning-text">{t('settings.shortcutDuplicateWarning')}</p>
          )}
          <input
            className="sp-input"
            value={keyboardShortcutQuery}
            placeholder={t('settings.shortcutSearchPlaceholder')}
            onChange={(event) => setKeyboardShortcutQuery(event.target.value)}
          />
        </section>

        <section className="sp-section">
          <div className="sp-shortcut-list">
            {filteredKeyboardShortcutCommands.map((command) => {
              const binding = bindingByCommandId.get(command.id);
              const accelerator = normalizeAccelerator(binding?.accelerator ?? '');
              const duplicate = accelerator && duplicateAccelerators.has(accelerator);
              return (
                <div key={command.id} className={cls('sp-shortcut-row', duplicate && 'has-conflict')}>
                  <div className="sp-shortcut-command">
                    <strong>{command.label}</strong>
                    <span>{command.category}</span>
                  </div>
                  <input
                    className="sp-input sp-shortcut-input"
                    value={accelerator}
                    placeholder={t('settings.shortcutUnset')}
                    readOnly
                    onKeyDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (event.key === 'Backspace' || event.key === 'Delete') {
                        patchKeyboardShortcut(command.id, { accelerator: '' });
                        return;
                      }
                      const next = eventToAccelerator(event);
                      if (next) patchKeyboardShortcut(command.id, { accelerator: next, enabled: true });
                    }}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    id={`sp-shortcut-enabled-${command.id}`}
                    className={cls('sp-toggle', (binding?.enabled ?? true) && 'sp-toggle-on')}
                    role="switch"
                    aria-checked={binding?.enabled ?? true}
                    onClick={() => patchKeyboardShortcut(command.id, { enabled: !(binding?.enabled ?? true) })}
                  >
                    <span className="sp-toggle-thumb" />
                  </button>
                </div>
              );
            })}
            {filteredKeyboardShortcutCommands.length === 0 && (
              <div className="sp-empty-block">{t('settings.shortcutNoResult')}</div>
            )}
          </div>
        </section>
      </div>
    );
  };

  const handleWorkspaceClearRecent = useCallback(async () => {
    const recent = await window.workspaceAPI.clearRecent();
    const next = { ...workspaceSettings, recent };
    setWorkspaceSettings(next);
    window.dispatchEvent(
      new CustomEvent('app-settings-changed', {
        detail: { workspace: next },
      }),
    );
  }, [workspaceSettings]);

  const patchTerminalRestoreSettings = useCallback((patch: Partial<TerminalRestoreSettings>) => {
    setTerminalRestoreSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const renderWorkspace = () => (
    <div className="sp-stack">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.workspaceTitle')}</h2>
            <p>{t('settings.workspaceDesc')}</p>
          </div>
        </div>

        <div className="sp-info-list">
          <div>
            <span>{t('settings.workspaceCurrent')}</span>
            <strong>{workspaceSettings.currentPath || t('settings.workspaceNone')}</strong>
          </div>
        </div>

        <label className="sp-toggle-row" htmlFor="sp-workspace-auto">
          <div>
            <span>{t('settings.workspaceAutoRestore')}</span>
            <small>{t('settings.workspaceAutoRestoreHint')}</small>
          </div>
          <button
            id="sp-workspace-auto"
            className={cls('sp-toggle', workspaceSettings.autoRestore && 'sp-toggle-on')}
            role="switch"
            aria-checked={workspaceSettings.autoRestore}
            onClick={() => setWorkspaceSettings((prev) => ({ ...prev, autoRestore: !prev.autoRestore }))}
          >
            <span className="sp-toggle-thumb" />
          </button>
        </label>
      </section>

      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.terminalRestoreTitle')}</h2>
            <p>{t('settings.terminalRestoreDesc')}</p>
          </div>
        </div>

        <label className="sp-toggle-row" htmlFor="sp-terminal-restore-shell">
          <div>
            <span>{t('settings.terminalRestoreShell')}</span>
            <small>{t('settings.terminalRestoreShellHint')}</small>
          </div>
          <button
            id="sp-terminal-restore-shell"
            className={cls('sp-toggle', terminalRestoreSettings.restoreShell && 'sp-toggle-on')}
            role="switch"
            aria-checked={terminalRestoreSettings.restoreShell}
            onClick={() => patchTerminalRestoreSettings({ restoreShell: !terminalRestoreSettings.restoreShell })}
          >
            <span className="sp-toggle-thumb" />
          </button>
        </label>

        <label className="sp-toggle-row" htmlFor="sp-terminal-restore-ssh">
          <div>
            <span>{t('settings.terminalRestoreSsh')}</span>
            <small>{t('settings.terminalRestoreSshHint')}</small>
          </div>
          <button
            id="sp-terminal-restore-ssh"
            className={cls('sp-toggle', terminalRestoreSettings.restoreSsh && 'sp-toggle-on')}
            role="switch"
            aria-checked={terminalRestoreSettings.restoreSsh}
            onClick={() => patchTerminalRestoreSettings({ restoreSsh: !terminalRestoreSettings.restoreSsh })}
          >
            <span className="sp-toggle-thumb" />
          </button>
        </label>

        <label className="sp-toggle-row" htmlFor="sp-terminal-restore-telnet">
          <div>
            <span>{t('settings.terminalRestoreTelnet')}</span>
            <small>{t('settings.terminalRestoreTelnetHint')}</small>
          </div>
          <button
            id="sp-terminal-restore-telnet"
            className={cls('sp-toggle', terminalRestoreSettings.restoreTelnet && 'sp-toggle-on')}
            role="switch"
            aria-checked={terminalRestoreSettings.restoreTelnet}
            onClick={() => patchTerminalRestoreSettings({ restoreTelnet: !terminalRestoreSettings.restoreTelnet })}
          >
            <span className="sp-toggle-thumb" />
          </button>
        </label>

        <label className="sp-toggle-row" htmlFor="sp-terminal-restore-initial">
          <div>
            <span>{t('settings.terminalRestoreInitialCommand')}</span>
            <small>{t('settings.terminalRestoreInitialCommandHint')}</small>
          </div>
          <button
            id="sp-terminal-restore-initial"
            className={cls('sp-toggle', terminalRestoreSettings.runInitialCommandOnRestore && 'sp-toggle-on')}
            role="switch"
            aria-checked={terminalRestoreSettings.runInitialCommandOnRestore}
            onClick={() =>
              patchTerminalRestoreSettings({
                runInitialCommandOnRestore: !terminalRestoreSettings.runInitialCommandOnRestore,
              })
            }
          >
            <span className="sp-toggle-thumb" />
          </button>
        </label>

        <label className="sp-toggle-row" htmlFor="sp-terminal-restore-last-command">
          <div>
            <span>{t('settings.terminalRestoreLastCommand')}</span>
            <small>{t('settings.terminalRestoreLastCommandHint')}</small>
          </div>
          <button
            id="sp-terminal-restore-last-command"
            className={cls('sp-toggle', terminalRestoreSettings.rerunLastCommandOnRestore && 'sp-toggle-on')}
            role="switch"
            aria-checked={terminalRestoreSettings.rerunLastCommandOnRestore}
            onClick={() =>
              patchTerminalRestoreSettings({
                rerunLastCommandOnRestore: !terminalRestoreSettings.rerunLastCommandOnRestore,
              })
            }
          >
            <span className="sp-toggle-thumb" />
          </button>
        </label>
      </section>

      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.workspaceRecent')}</h2>
            <p>{t('settings.workspaceRecentDesc')}</p>
          </div>
          <button className="sp-btn-ghost" onClick={handleWorkspaceClearRecent}>
            {t('settings.workspaceClearRecent')}
          </button>
        </div>

        {workspaceSettings.recent.length === 0 ? (
          <div className="sp-empty-block">{t('settings.workspaceRecentEmpty')}</div>
        ) : (
          <div className="sp-stack">
            {workspaceSettings.recent.map((item) => (
              <div key={item.path} className="sp-select-card">
                <div className="sp-select-card-main">
                  <strong>{item.name}</strong>
                  <span>{item.path}</span>
                  <small>{new Date(item.updatedAt).toLocaleString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderSettingsBackup = () => (
    <div className="sp-stack">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.settingsBackupTitle')}</h2>
            <p>{t('settings.settingsBackupDesc')}</p>
          </div>
        </div>

        <div className="sp-info-list">
          <div>
            <span>{t('settings.settingsBackupIncludesSecretsLabel')}</span>
            <strong>{t('settings.settingsBackupIncludesSecrets')}</strong>
          </div>
        </div>

        <div className="sp-grid two">
          <div className="sp-info-card">
            <strong>{t('settings.settingsBackupExport')}</strong>
            <span>{t('settings.settingsBackupExportHint')}</span>
            <button className="sp-btn" disabled={settingsBackupBusy} onClick={handleSettingsBackupExport}>
              {settingsBackupBusy ? t('common.processing') : t('settings.settingsBackupExport')}
            </button>
          </div>
          <div className="sp-info-card">
            <strong>{t('settings.settingsBackupImport')}</strong>
            <span>{t('settings.settingsBackupImportHint')}</span>
            <button
              className="sp-btn sp-btn-primary"
              disabled={settingsBackupBusy}
              onClick={handleSettingsBackupImport}
            >
              {settingsBackupBusy ? t('common.processing') : t('settings.settingsBackupImport')}
            </button>
          </div>
        </div>

        {settingsBackupMessage && <p className="sp-hint">{settingsBackupMessage}</p>}
      </section>

      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.settingsBackupRecentTitle')}</h2>
            <p>{t('settings.settingsBackupRecentDesc')}</p>
          </div>
          <button
            className="sp-btn-ghost"
            disabled={settingsBackupBusy}
            onClick={() => loadSettingsBackups().catch(() => setSettingsBackupItems([]))}
          >
            {t('common.refresh')}
          </button>
        </div>

        {settingsBackupItems.length === 0 ? (
          <div className="sp-empty-block">{t('settings.settingsBackupRecentEmpty')}</div>
        ) : (
          <div className="sp-stack">
            {settingsBackupItems.map((item) => (
              <div key={item.path} className="sp-select-card">
                <div className="sp-select-card-main">
                  <strong>{item.fileName}</strong>
                  <span>{item.path}</span>
                  <small>
                    {new Date(item.exportedAt).toLocaleString()}
                    {' · '}
                    {Math.max(1, Math.round(item.size / 1024))} KB
                    {item.appVersion ? ` · v${item.appVersion}` : ''}
                    {' · '}
                    {item.includesSecrets
                      ? t('settings.settingsBackupIncludesSecretsShort')
                      : t('settings.settingsBackupNoSecrets')}
                  </small>
                </div>
                <div className="sp-select-card-actions">
                  <button
                    className="sp-btn sp-btn-sm"
                    disabled={settingsBackupBusy}
                    onClick={() => handleSettingsBackupRestore(item)}
                  >
                    {t('settings.settingsBackupRestore')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderExtensions = () => (
    <div className="sp-stack">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.extensionsTitle')}</h2>
            <p>{t('settings.extensionsDesc')}</p>
          </div>
          <div className="sp-actions-row">
            <button className="sp-btn" disabled={extensionBusy} onClick={handleExtensionReload}>
              {extensionBusy ? t('settings.extensionsReloading') : t('settings.extensionsReload')}
            </button>
          </div>
        </div>

        {extensionMessage && <p className="sp-hint">{extensionMessage}</p>}

        {extensionInfos.length === 0 ? (
          <div className="sp-empty-block">{t('settings.extensionsEmpty')}</div>
        ) : (
          <div className="sp-stack">
            {extensionInfos.map((extension) => (
              <div key={extension.id} className={cls('sp-select-card', extension.enabled && 'is-active')}>
                <div className="sp-select-card-main">
                  <strong>{extension.name}</strong>
                  <span>{extension.description || extension.id}</span>
                  <small>
                    {renderExtensionSourceLabel(extension.source)}
                    {' · '}
                    {extension.version}
                  </small>
                </div>
                <div className="sp-select-card-actions">
                  {extension.error && (
                    <button
                      className="sp-btn sp-btn-sm"
                      disabled={extensionBusy}
                      onClick={() => handleExtensionRetry(extension.id)}
                    >
                      {t('settings.extensionsRetry')}
                    </button>
                  )}
                  <button
                    id={`sp-extension-${extension.id}`}
                    className={cls('sp-toggle', extension.enabled && 'sp-toggle-on')}
                    role="switch"
                    aria-checked={extension.enabled}
                    disabled={extensionBusy}
                    title={
                      extension.enabled ? t('settings.extensionsDisableTitle') : t('settings.extensionsEnableTitle')
                    }
                    onClick={() => handleExtensionToggle(extension.id, !extension.enabled)}
                  >
                    <span className="sp-toggle-thumb" />
                  </button>
                </div>
                <div className="sp-info-list sp-info-list-compact">
                  <div>
                    <span>{t('settings.extensionsSource')}</span>
                    <strong>{renderExtensionSourceLabel(extension.source)}</strong>
                  </div>
                  <div>
                    <span>{t('settings.extensionsPermissions')}</span>
                    <strong className="sp-extension-chips">
                      {extension.permissions.length > 0
                        ? extension.permissions.map((permission) => (
                            <span key={permission} className="sp-pill">
                              {renderExtensionPermissionLabel(permission)}
                            </span>
                          ))
                        : t('settings.extensionsNoPermissions')}
                    </strong>
                  </div>
                  <div>
                    <span>{t('settings.extensionsPath')}</span>
                    <strong>{extension.path}</strong>
                  </div>
                  <div>
                    <span>{t('settings.extensionsMain')}</span>
                    <strong>{extension.main}</strong>
                  </div>
                  <div>
                    <span>{t('settings.extensionsCommands')}</span>
                    <strong>
                      {extension.commands.length > 0
                        ? extension.commands
                            .map((command) => (command.titleKey ? t(command.titleKey) : command.title))
                            .join(', ')
                        : t('settings.extensionsNoCommands')}
                    </strong>
                  </div>
                  {extension.error && (
                    <div>
                      <span>{t('settings.extensionsError')}</span>
                      <strong>{extension.error}</strong>
                    </div>
                  )}
                  {extension.logs.length > 0 && (
                    <div>
                      <span>{t('settings.extensionsLogs')}</span>
                      <strong className="sp-extension-log-list">
                        {extension.logs.map((log) => (
                          <span key={`${log.timestamp}-${log.phase}-${log.message}`}>
                            {new Date(log.timestamp).toLocaleString()} [{log.phase}] {log.message}
                          </span>
                        ))}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.xenisMcpTitle')}</h2>
            <p>{t('settings.xenisMcpDesc')}</p>
          </div>
          <div className="sp-actions-row">
            <button
              className="sp-btn"
              disabled={mcpStatusBusy}
              onClick={() => {
                void loadMcpStatus();
              }}
            >
              {mcpStatusBusy ? t('common.checking') : t('settings.xenisMcpRefresh')}
            </button>
          </div>
        </div>

        <div className="sp-info-list">
          <div>
            <span>{t('settings.xenisMcpAvailable')}</span>
            <strong>
              {mcpStatusBusy
                ? t('common.checking')
                : mcpStatus
                  ? mcpStatus.available
                    ? t('common.available')
                    : t('common.unavailable')
                  : t('common.unavailable')}
            </strong>
          </div>
          <div>
            <span>{t('settings.xenisMcpServerPath')}</span>
            <strong>{mcpStatus?.serverPath || '-'}</strong>
          </div>
          <div>
            <span>{t('settings.xenisMcpBridgeUrl')}</span>
            <strong>{mcpStatus?.bridgeUrl || '-'}</strong>
          </div>
          <div>
            <span>{t('settings.xenisMcpBridgeState')}</span>
            <strong>{mcpStatus?.bridgeStatePath || '-'}</strong>
          </div>
          <div>
            <span>{t('settings.xenisMcpConfigFile')}</span>
            <strong>{mcpStatus?.configFilePath || '-'}</strong>
          </div>
        </div>
        {mcpStatusError && <p className="sp-hint">{t('settings.xenisMcpStatusFailed', { e: mcpStatusError })}</p>}
        <p className="sp-hint">{t('settings.xenisMcpHint')}</p>
      </section>

      {extensionInfos.map((extension) => (
        <React.Fragment key={`${extension.id}-settings`}>{renderExtensionSettingsSections(extension)}</React.Fragment>
      ))}
    </div>
  );

  const renderSecretVault = () => (
    <div className="sp-stack">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.secretVaultTitle')}</h2>
            <p>{t('settings.secretVaultDesc')}</p>
          </div>
          <div className="sp-actions-row">
            <button
              className="sp-btn sp-btn-danger-ghost"
              disabled={secretVaultBusy || visibleSecretVaultItems.length === 0}
              onClick={handleSecretVaultClear}
            >
              {t('settings.secretVaultClear')}
            </button>
          </div>
        </div>

        {secretVaultMessage && <p className="sp-hint">{secretVaultMessage}</p>}

        <div className="sp-grid two">
          <div className="sp-field">
            <label className="sp-label" htmlFor="sp-secret-vault-mode">
              {t('settings.secretVaultMode')}
            </label>
            <select
              id="sp-secret-vault-mode"
              className="sp-input"
              value={secretVaultMode}
              onChange={(event) => setSecretVaultMode(event.target.value as SecretVaultStorageMode)}
            >
              <option value="plain">{t('settings.secretVaultPlain')}</option>
              <option value="os-protected">{t('settings.secretVaultOsProtected')}</option>
            </select>
            <p className="sp-hint">{t('settings.secretVaultModeHint')}</p>
          </div>

          <div className="sp-info-list">
            <div>
              <span>{t('settings.secretVaultAvailable')}</span>
              <strong>
                {secretVaultStatus?.osProtectedAvailable ? t('common.available') : t('common.unavailable')}
              </strong>
            </div>
            <div>
              <span>{t('settings.secretVaultEffectiveMode')}</span>
              <strong>
                {secretVaultStatus?.effectiveMode === 'os-protected'
                  ? t('settings.secretVaultOsProtected')
                  : t('settings.secretVaultPlain')}
              </strong>
            </div>
          </div>
        </div>

        <div className="sp-section-heading sp-section-heading-compact">
          <div>
            <h3>{t('settings.secretVaultEntries')}</h3>
            <p>{t('settings.secretVaultEntriesDesc')}</p>
          </div>
        </div>

        {visibleSecretVaultItems.length === 0 ? (
          <div className="sp-empty-block">{t('settings.secretVaultEmpty')}</div>
        ) : (
          <div className="sp-stack">
            {visibleSecretVaultItems.map((item) => (
              <div key={item.secretId} className="sp-select-card">
                <div className="sp-select-card-main">
                  <strong>{item.label}</strong>
                  <span>{item.secretId}</span>
                  <small>
                    {renderSecretVaultKindLabel(item.kind)}
                    {' · '}
                    {item.storage === 'os-protected'
                      ? t('settings.secretVaultOsProtected')
                      : t('settings.secretVaultPlain')}
                    {' · '}
                    {new Date(item.updatedAt).toLocaleString()}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderMcp = () => (
    <div className="sp-stack">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.mcpTitle')}</h2>
            <p>{t('settings.mcpDesc')}</p>
          </div>
        </div>
        <div className="sp-field">
          <label className="sp-label">{t('settings.gowooriConfigDirLabel')}</label>
          <input
            className="sp-input"
            type="text"
            value={xamongConfigDir}
            onChange={(e) => setXamongConfigDir(e.target.value)}
          />
          <p className="sp-hint">{t('settings.mcpHint')}</p>
        </div>
        <div className="sp-field">
          <label className="sp-label">{t('settings.gowooriWorkspaceConfigLabel')}</label>
          <input
            className="sp-input"
            type="text"
            value={xamongWorkspacesConfigPath}
            onChange={(e) => setXamongWorkspacesConfigPath(e.target.value)}
          />
        </div>
      </section>
    </div>
  );

  const renderSkillsDesign = () => (
    <div className="sp-stack">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.skillsTitle')}</h2>
            <p>{t('settings.skillsDesc')}</p>
          </div>
        </div>
        <div className="sp-grid two">
          <div className="sp-info-card">
            <strong>{t('settings.skillsConfigBased')}</strong>
            <span>{xamongConfigDir || DEFAULT_XAMONG_CODE_CONFIG_DIR_PLACEHOLDER}</span>
          </div>
          <div className="sp-info-card">
            <strong>{t('settings.skillsWorkspace')}</strong>
            <span>
              {xamongWorkspacesConfigPath ||
                `${xamongConfigDir || DEFAULT_XAMONG_CODE_CONFIG_DIR_PLACEHOLDER}\\xamong-api-workspaces.json`}
            </span>
          </div>
        </div>
        <p className="sp-hint">{t('settings.skillsHint')}</p>
      </section>
    </div>
  );

  const renderAppearance = () => (
    <div className="sp-stack">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.appearanceTitle')}</h2>
            <p>{t('settings.appearanceDesc')}</p>
          </div>
        </div>
        <div className="sp-segmented">
          {(['dark', 'light'] as ThemeName[]).map((item) => (
            <button
              key={item}
              className={cls('sp-segment', theme === item && 'is-active')}
              onClick={() => setTheme(item)}
            >
              {item === 'dark' ? t('settings.appearanceDark') : t('settings.appearanceLight')}
            </button>
          ))}
        </div>

        <div className="sp-field">
          <label className="sp-label" htmlFor="sp-font-size">
            {t('settings.terminalFontSizeLabel')} <span className="sp-muted">{fontSize}px</span>
          </label>
          <input
            id="sp-font-size"
            className="sp-range"
            type="range"
            min="8"
            max="24"
            step="1"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
        </div>
      </section>
    </div>
  );

  const renderLanguage = () => (
    <section className="sp-section">
      <div className="sp-section-heading">
        <div>
          <h2>{t('settings.languageTitle')}</h2>
          <p>{t('settings.languageDesc')}</p>
        </div>
      </div>
      <div className="sp-grid two">
        {availableLocales.map((localeOption) => (
          <button
            key={localeOption.locale}
            className={`sp-select-card${draftLocale === localeOption.locale ? ' sp-select-card-active' : ''}`}
            onClick={() => setDraftLocale(localeOption.locale)}
          >
            <span className="sp-square-icon">{getLocaleIcon(localeOption.locale)}</span>
            <span>
              <strong>{localeOption.label}</strong>
              <small>{localeOption.locale}</small>
            </span>
            {draftLocale === localeOption.locale && <span className="sp-chevron">✓</span>}
          </button>
        ))}
      </div>
    </section>
  );

  const renderAbout = () => {
    const updateChannelOptions: Array<{ value: UpdateChannel; label: string; description: string }> = [
      {
        value: 'public-stable',
        label: t('settings.updateChannelPublicStable'),
        description: t('settings.updateChannelPublicStableDesc'),
      },
      {
        value: 'internal-dev',
        label: t('settings.updateChannelInternalDev'),
        description: t('settings.updateChannelInternalDevDesc'),
      },
      {
        value: 'nightly',
        label: t('settings.updateChannelNightly'),
        description: t('settings.updateChannelNightlyDesc'),
      },
      {
        value: 'local',
        label: t('settings.updateChannelLocal'),
        description: t('settings.updateChannelLocalDesc'),
      },
    ];
    const currentUpdateChannel =
      updateChannelOptions.find((option) => option.value === updaterSettings.channel) ?? updateChannelOptions[0];
    const currentFeedUrl = updStatus.feedUrl || resolveUpdaterFeedUrl(updaterSettings);

    return (
      <div className="sp-stack">
        <section className="sp-section">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.aboutTitle')}</h2>
              <p>{t('settings.aboutDesc')}</p>
            </div>
          </div>
          <div className="sp-info-list">
            <div>
              <span>{t('common.version')}</span>
              <strong>{(window as unknown as { __APP_VERSION__?: string }).__APP_VERSION__ ?? 'N/A'}</strong>
            </div>
            <div>
              <span>{t('common.channel')}</span>
              <strong>{currentUpdateChannel.label}</strong>
            </div>
            <div>
              <span>{t('settings.aboutRuntime')}</span>
              <strong>{t('settings.aboutPackaged')}</strong>
            </div>
            <div>
              <span>{t('settings.aboutPlatform')}</span>
              <strong>{navigator.platform}</strong>
            </div>
          </div>
        </section>

        <section className="sp-section">
          <div className="sp-section-heading">
            <div>
              <h2>{t('settings.updateTitle')}</h2>
              <p>{t('settings.updateDesc')}</p>
            </div>
          </div>
          <div className="sp-grid two">
            <label className="sp-field">
              <span className="sp-label">{t('settings.updateChannelLabel')}</span>
              <select
                className="sp-input"
                value={updaterSettings.channel}
                onChange={(event) => {
                  const channel = event.target.value as UpdateChannel;
                  setUpdaterSettings((prev) => normalizeUpdaterSettings({ ...prev, channel }));
                }}
              >
                {updateChannelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="sp-hint">{currentUpdateChannel.description}</span>
            </label>
            <label className="sp-field sp-field-row">
              <button
                type="button"
                className={cls('sp-toggle', updaterSettings.autoCheck && 'sp-toggle-on')}
                onClick={() => setUpdaterSettings((prev) => ({ ...prev, autoCheck: !prev.autoCheck }))}
                aria-pressed={updaterSettings.autoCheck}
              >
                <span className="sp-toggle-thumb" />
              </button>
              <span className="sp-toggle-label">{t('settings.updateAutoCheck')}</span>
            </label>
          </div>
          {updaterSettings.channel === 'local' && (
            <label className="sp-field">
              <span className="sp-label">{t('settings.updateLocalFeedUrl')}</span>
              <input
                className="sp-input"
                value={updaterSettings.localFeedUrl}
                onChange={(event) => setUpdaterSettings((prev) => ({ ...prev, localFeedUrl: event.target.value }))}
                placeholder={DEFAULT_UPDATER_SETTINGS.localFeedUrl}
              />
            </label>
          )}
          <div className="sp-update-feed-url">
            <span>{t('settings.updateFeedUrl')}</span>
            <code>{currentFeedUrl}</code>
          </div>
          <div className="sp-update-status-row">
            <span
              className={cls(
                'sp-update-indicator',
                updStatus.state === 'available' && 'sp-upd-available',
                updStatus.state === 'downloaded' && 'sp-upd-downloaded',
                updStatus.state === 'error' && 'sp-upd-error',
                updStatus.state === 'checking' && 'sp-upd-checking',
              )}
            />
            <span className="sp-update-status-text">
              {updStatus.state === 'idle' && t('settings.updateIdle')}
              {updStatus.state === 'checking' && t('settings.updateChecking')}
              {updStatus.state === 'not-available' && t('settings.updateLatest', { version: updStatus.info.version })}
              {updStatus.state === 'available' && t('settings.updateAvailable', { version: updStatus.info.version })}
              {updStatus.state === 'downloading' &&
                t('settings.updateDownloading', { pct: String(Math.round(updStatus.progress.percent)) })}
              {updStatus.state === 'downloaded' && t('settings.updateReady', { version: updStatus.info.version })}
              {updStatus.state === 'error' && t('settings.updateError', { e: String(updStatus.message) })}
            </span>
          </div>
          {updStatus.state === 'downloading' && (
            <div className="sp-update-progress-bar">
              <div className="sp-update-progress-fill" style={{ width: `${updStatus.progress.percent}%` }} />
            </div>
          )}
          <div className="sp-actions-row">
            {(updStatus.state === 'idle' || updStatus.state === 'not-available' || updStatus.state === 'error') && (
              <button className="sp-btn" disabled={updBusy} onClick={handleUpdCheck}>
                {updBusy ? t('settings.updateCheckingBtn') : t('settings.updateCheckBtn')}
              </button>
            )}
            {updStatus.state === 'available' && (
              <button className="sp-btn sp-btn-success" disabled={updBusy} onClick={handleUpdDownload}>
                {updBusy ? t('settings.updateDownloadingBtn') : t('settings.updateDownloadBtn')}
              </button>
            )}
            {updStatus.state === 'downloaded' && (
              <button className="sp-btn sp-btn-primary" onClick={handleUpdInstall}>
                {t('settings.updateInstallBtn')}
              </button>
            )}
            {(updStatus.state === 'checking' || updStatus.state === 'downloading') && (
              <button className="sp-btn" disabled>
                {t('settings.updateProcessingBtn')}
              </button>
            )}
          </div>
        </section>
      </div>
    );
  };

  const renderInterfaceSettings = () => (
    <div className="sp-stack" data-settings-section="settings-interface">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.category.interface')}</h2>
            <p>{t('settings.category.interfaceDesc')}</p>
          </div>
        </div>
        <div className="sp-mode-switch" role="tablist" aria-label={t('settings.interfaceTabsAriaLabel')}>
          <button
            className={cls('sp-mode-option', interfaceTab === 'language' && 'is-active')}
            onClick={() => setInterfaceTab('language')}
          >
            <strong>{t('settings.category.language')}</strong>
            <span>{t('settings.category.languageDesc')}</span>
          </button>
          <button
            className={cls('sp-mode-option', interfaceTab === 'appearance' && 'is-active')}
            onClick={() => setInterfaceTab('appearance')}
          >
            <strong>{t('settings.category.appearance')}</strong>
            <span>{t('settings.category.appearanceDesc')}</span>
          </button>
          <button
            className={cls('sp-mode-option', interfaceTab === 'keyboard-shortcuts' && 'is-active')}
            onClick={() => setInterfaceTab('keyboard-shortcuts')}
          >
            <strong>{t('settings.category.keyboardShortcuts')}</strong>
            <span>{t('settings.category.keyboardShortcutsDesc')}</span>
          </button>
          <button
            className={cls('sp-mode-option', interfaceTab === 'window-sizer' && 'is-active')}
            onClick={() => setInterfaceTab('window-sizer')}
          >
            <strong>{t('settings.category.windowSizer')}</strong>
            <span>{t('settings.category.windowSizerDesc')}</span>
          </button>
        </div>
      </section>

      {interfaceTab === 'language' && <div data-settings-section="settings-language">{renderLanguage()}</div>}
      {interfaceTab === 'appearance' && <div data-settings-section="settings-appearance">{renderAppearance()}</div>}
      {interfaceTab === 'keyboard-shortcuts' && (
        <div data-settings-section="settings-keyboard-shortcuts">{renderKeyboardShortcuts()}</div>
      )}
      {interfaceTab === 'window-sizer' && (
        <div data-settings-section="settings-window-sizer">{renderWindowSizer()}</div>
      )}
    </div>
  );

  const renderBasicInfo = () => (
    <div className="sp-stack" data-settings-section="settings-basic-info">
      {renderGeneral()}
      {renderAbout()}
    </div>
  );

  const renderInfoSettings = () => (
    <div className="sp-stack" data-settings-section="settings-info">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.category.info')}</h2>
            <p>{t('settings.category.infoDesc')}</p>
          </div>
        </div>
        <div className="sp-mode-switch" role="tablist" aria-label={t('settings.infoTabsAriaLabel')}>
          <button
            className={cls('sp-mode-option', infoTab === 'general' && 'is-active')}
            onClick={() => setInfoTab('general')}
          >
            <strong>{t('settings.category.general')}</strong>
            <span>{t('settings.category.generalDesc')}</span>
          </button>
          <button
            className={cls('sp-mode-option', infoTab === 'secret-vault' && 'is-active')}
            onClick={() => setInfoTab('secret-vault')}
          >
            <strong>{t('settings.category.secretVault')}</strong>
            <span>{t('settings.category.secretVaultDesc')}</span>
          </button>
          <button
            className={cls('sp-mode-option', infoTab === 'settings-backup' && 'is-active')}
            onClick={() => setInfoTab('settings-backup')}
          >
            <strong>{t('settings.category.settingsBackup')}</strong>
            <span>{t('settings.category.settingsBackupDesc')}</span>
          </button>
        </div>
      </section>

      {infoTab === 'general' && renderBasicInfo()}
      {infoTab === 'secret-vault' && <div data-settings-section="settings-secret-vault">{renderSecretVault()}</div>}
      {infoTab === 'settings-backup' && <div data-settings-section="settings-backup">{renderSettingsBackup()}</div>}
    </div>
  );

  const renderExternalApps = () => (
    <div className="sp-stack" data-settings-section="settings-external-apps">
      <section className="sp-section">
        <div className="sp-section-heading">
          <div>
            <h2>{t('settings.category.externalApps')}</h2>
            <p>{t('settings.category.externalAppsDesc')}</p>
          </div>
          <div className="sp-actions-row">
            <button
              className="sp-btn sp-btn-primary"
              onClick={() => {
                void saveExternalApps().catch((error) => {
                  setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
                });
              }}
            >
              {t('settings.settingsSave')}
            </button>
          </div>
        </div>

        <div className="sp-field">
          <label className="sp-inline-check" htmlFor="sp-external-apps-enabled">
            <input
              id="sp-external-apps-enabled"
              type="checkbox"
              checked={externalAppsEnabled}
              onChange={(event) => setExternalAppsEnabled(event.target.checked)}
            />
            <span>Enable external desktop app control</span>
          </label>
          <p className="sp-hint">
            Registered profiles are used by Xenesis Agent and the Capability Registry before arbitrary executable paths.
          </p>
        </div>

        <div className="sp-field">
          <span className="sp-label">Quick add templates</span>
          <div className="sp-actions-row">
            {EXTERNAL_APP_PROFILE_TEMPLATES.map((template) => {
              const exists = externalAppProfiles.some((profile) => profile.id === template.id);
              return (
                <button
                  key={template.id}
                  className="sp-btn-ghost"
                  disabled={exists}
                  onClick={() => addExternalAppProfileFromTemplate(template.id)}
                >
                  {exists ? `${template.label} added` : `Add ${template.label}`}
                </button>
              );
            })}
          </div>
          <p className="sp-hint">
            Templates create editable profiles. Shell profiles use high approval because they can execute arbitrary
            commands.
          </p>
        </div>

        <div className="sp-grid two">
          {externalAppProfiles.map((profile) => {
            const isBuiltIn = BUILTIN_EXTERNAL_APP_IDS.has(profile.id);
            const executable = profile.executable.trim();
            const executableHint = executable
              ? /^[a-z]:\\/i.test(executable) || executable.startsWith('\\\\')
                ? 'absolute executable path'
                : 'resolved from PATH or Windows app alias'
              : 'executable path required';
            return (
              <div key={profile.id} className="sp-select-card">
                <div className="sp-select-card-main">
                  <strong>
                    {profile.label || profile.id}
                    {isBuiltIn ? ' · built-in' : ''}
                  </strong>
                  <span>{profile.executable || 'Executable path required'}</span>
                  <small>
                    {profile.platform} · approval {profile.approvalLevel} · actions {profile.allowedActions.join(', ')}
                  </small>
                  <small>{executableHint}</small>
                </div>
                <div className="sp-grid two">
                  <label className="sp-label" htmlFor={`sp-external-app-id-${profile.id}`}>
                    Profile ID
                    <input
                      id={`sp-external-app-id-${profile.id}`}
                      className="sp-input"
                      disabled
                      value={profile.id}
                      readOnly
                    />
                  </label>
                  <label className="sp-label" htmlFor={`sp-external-app-label-${profile.id}`}>
                    Name
                    <input
                      id={`sp-external-app-label-${profile.id}`}
                      className="sp-input"
                      disabled={isBuiltIn}
                      value={profile.label}
                      onChange={(event) => patchExternalAppProfile(profile.id, { label: event.target.value })}
                    />
                  </label>
                  <label className="sp-label" htmlFor={`sp-external-app-exe-${profile.id}`}>
                    Executable
                    <input
                      id={`sp-external-app-exe-${profile.id}`}
                      className="sp-input"
                      disabled={isBuiltIn}
                      value={profile.executable}
                      onChange={(event) => patchExternalAppProfile(profile.id, { executable: event.target.value })}
                    />
                  </label>
                  <label className="sp-label" htmlFor={`sp-external-app-approval-${profile.id}`}>
                    Approval
                    <select
                      id={`sp-external-app-approval-${profile.id}`}
                      className="sp-input"
                      disabled={isBuiltIn}
                      value={profile.approvalLevel}
                      onChange={(event) =>
                        patchExternalAppProfile(profile.id, {
                          approvalLevel: event.target.value as ExternalAppProfile['approvalLevel'],
                        })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="sp-label" htmlFor={`sp-external-app-enabled-${profile.id}`}>
                    Enabled
                    <select
                      id={`sp-external-app-enabled-${profile.id}`}
                      className="sp-input"
                      disabled={isBuiltIn}
                      value={profile.enabled ? 'enabled' : 'disabled'}
                      onChange={(event) =>
                        patchExternalAppProfile(profile.id, { enabled: event.target.value === 'enabled' })
                      }
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>
                </div>
                {!isBuiltIn && (
                  <div className="sp-actions-row">
                    <button className="sp-btn-ghost" onClick={() => removeExternalAppProfile(profile.id)}>
                      Remove profile
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button className="sp-btn-ghost" onClick={addExternalAppProfile}>
          Add external app profile
        </button>
      </section>
    </div>
  );

  const renderPlaceholder = (title: string, description: string) => (
    <section className="sp-section">
      <div className="sp-section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="sp-empty-block">{t('settings.noSaveOptions')}</div>
    </section>
  );

  const renderActiveCategory = () => {
    switch (activeCategory as string) {
      case 'general':
        return renderGeneral();
      case 'xenesis-agent':
        return renderXenesisDeskSection();
      case 'run-model':
        return renderRunModel();
      case 'interface':
        return renderInterfaceSettings();
      case 'info':
        return renderInfoSettings();
      case 'media':
        return renderPlaceholder(t('settings.category.media'), t('settings.category.mediaDesc'));
      case 'connectors':
        return renderPlaceholder(t('settings.category.connectors'), t('settings.category.connectorsDesc'));
      case 'mcp':
        return renderMcp();
      case 'language':
        return renderLanguage();
      case 'appearance':
        return renderAppearance();
      case 'notifications':
        return renderPlaceholder(t('settings.category.notifications'), t('settings.category.notificationsDesc'));
      case 'pets':
        return renderPlaceholder(t('settings.category.pets'), t('settings.category.petsDesc'));
      case 'skills-design':
        return renderSkillsDesign();
      case 'automation':
        return (
          <AutomationSettingsSection
            initial={automationSettings}
            onSave={(newAuto) => {
              setAutomationSettings(newAuto);
              window.terminalAPI
                .saveSettings({ automation: newAuto })
                .then(() => {
                  setSettingsSaveError('');
                  setSettings((prev) => (prev ? { ...prev, automation: newAuto } : prev));
                  window.dispatchEvent(
                    new CustomEvent('app-settings-changed', {
                      detail: { automation: newAuto },
                    }),
                  );
                  // 실행 중인 컨트롤러에 즉시 반영
                  (
                    window as Window & { automationAPI?: { reloadSettings?: () => void } }
                  ).automationAPI?.reloadSettings?.();
                })
                .catch((error) => {
                  setSettingsSaveError(t('settings.settingsSaveFailed', { e: getSettingsErrorMessage(error) }));
                });
            }}
          />
        );
      case 'keyboard-shortcuts':
        return renderKeyboardShortcuts();
      case 'workspace':
        return renderWorkspace();
      case 'settings-backup':
        return renderSettingsBackup();
      case 'remote-terminals':
        return renderRemoteTerminals();
      case 'remote-files':
        return renderRemoteFiles();
      case 'window-sizer':
        return renderWindowSizer();
      case 'extensions':
        return renderExtensions();
      case 'external-apps':
        return renderExternalApps();
      case 'secret-vault':
        return renderSecretVault();
      case 'about':
        return renderAbout();
      default:
        return renderRunModel();
    }
  };

  if (loading) {
    return (
      <div className="sp-root sp-loading">
        <div className="sp-spinner" />
        <span>{t('settings.settingsLoading')}</span>
      </div>
    );
  }

  return (
    <div className="sp-root">
      <aside className="sp-sidebar" aria-label={t('settings.settingsCategoryAriaLabel')}>
        {VISIBLE_SETTINGS_CATEGORIES.map((category) => (
          <button
            key={category.id}
            className={cls('sp-nav-item', activeCategory === category.id && 'is-active')}
            onClick={() => activateSettingsCategory(category.id)}
          >
            <span className="sp-nav-icon">{category.icon}</span>
            <span className="sp-nav-copy">
              <strong>{getCatTitle(category.id)}</strong>
              <small>{getCatDesc(category.id)}</small>
            </span>
          </button>
        ))}
      </aside>

      <main className="sp-main">
        <div className="sp-titlebar">
          <span>{t('settings.settingsHeader')}</span>
          <h1>{getCatTitle(activeMeta.id)}</h1>
          <p>{getCatDesc(activeMeta.id)}</p>
        </div>

        <div className="sp-content">{renderActiveCategory()}</div>

        <div className="sp-footer">
          {settingsSaveError && <p className="sp-error sp-footer-error">{settingsSaveError}</p>}
          <button
            className="sp-btn-ghost"
            onClick={() => {
              if (settings) applySettingsToState(settings);
              setDraftLocale(locale);
              setSettingsSaveError('');
            }}
          >
            {t('settings.settingsCancel')}
          </button>
          <button
            className="sp-btn sp-btn-primary"
            onClick={handleSave}
            disabled={(xenisPhase5Enabled && !!xamongPortError) || !!xenesisPortError}
          >
            {saved ? t('settings.settingsSaved') : t('settings.settingsSave')}
          </button>
        </div>
      </main>
    </div>
  );
}
