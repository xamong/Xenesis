import type { ExternalAppSettings } from './externalAppControl';
import type { XenesisConnectionsStatus } from './xenesisConnections';

export type {
  XenesisConnectionChannelAccessGroupBinding,
  XenesisConnectionChannelAccessGroupsTemplate,
  XenesisConnectionChannelRoutingTemplate,
  XenesisConnectionChannelSafetyTemplate,
  XenesisConnectionChannelTemplate,
  XenesisConnectionGuideCatalogTemplate,
  XenesisConnectionItem,
  XenesisConnectionMcpTemplate,
  XenesisConnectionMessengerViewTemplate,
  XenesisConnectionProviderCredentialPoolItem,
  XenesisConnectionProviderCredentialState,
  XenesisConnectionProviderFallbackChainItem,
  XenesisConnectionProviderFallbackInput,
  XenesisConnectionProviderRoutingTemplate,
  XenesisConnectionProviderSetupTemplate,
  XenesisConnectionProviderViewTemplate,
  XenesisConnectionSection,
  XenesisConnectionStatus,
  XenesisConnectionsStatus,
  XenesisConnectionToolSetupTemplate,
  XenesisConnectionToolViewTemplate,
} from './xenesisConnections';

export type ShellKind = 'powershell' | 'cmd' | 'pwsh' | 'wsl' | 'zsh' | 'bash' | 'sh';

// ─── AI 프로바이더 설정 ────────────────────────────────────────────────────────

export type AiProviderKind =
  | 'auto' // 자동 감지 (자격증명 스캔: codex 로그인 > claude 로그인 > BYOK 키...)
  | 'openai' // OpenAI (Responses / Chat Completions)
  | 'anthropic' // Anthropic Claude
  | 'gemini' // Google Gemini (OpenAI 호환)
  | 'groq' // Groq (OpenAI 호환)
  | 'deepseek' // DeepSeek (OpenAI 호환)
  | 'qwen' // Qwen / DashScope (OpenAI 호환)
  | 'ollama' // Ollama (로컬, 인증 불필요)
  | 'lmstudio' // LM Studio (로컬)
  | 'together' // Together AI
  | 'fireworks' // Fireworks AI
  | 'azure' // Azure OpenAI (호환)
  | 'codex-cli' // OpenAI Codex CLI (로컬, CODEX_HOME 인증, API 키 불필요)
  | 'codex-app-server' // Codex app-server (로컬)
  | 'claude-cli' // Claude Code CLI (로컬)
  | 'claude-interactive'; // Claude interactive (로컬)

/**
 * Reasoning effort for the embedded Desk agent's Codex/CLI runtime. 'default'
 * inherits the user's global ~/.codex/config.toml (e.g. xhigh); the explicit
 * tiers let the Desk agent run faster than a global xhigh for simple CR routing.
 */
export type AiReasoningEffort = 'default' | 'low' | 'medium' | 'high' | 'xhigh';

export interface AiProviderSettings {
  provider: AiProviderKind;
  model: string;
  /**
   * Codex/CLI reasoning effort for the EMBEDDED Desk agent only (separate from
   * the user's global codex config). Default 'medium' keeps Desk CR turns fast
   * while staying high enough to generate real shell commands; 'default' defers
   * to ~/.codex/config.toml.
   */
  reasoningEffort?: AiReasoningEffort;
  /** API 키 (Ollama 등 로컬 프로바이더는 빈 문자열 허용) */
  apiKey: string;
  /** 커스텀/로컬 엔드포인트 (기본값 사용 시 빈 문자열) */
  baseUrl: string;
  /**
   * 에이전트 모드 전용 API 서버 URL (xamongcode apiServer.mjs, 기본 포트 3337)
   * POST /chat 엔드포인트를 사용. 빈 문자열이면 기본값 http://127.0.0.1:3337 사용.
   */
  xcAgentApiUrl: string;
  /**
   * 드래프트 모드 전용 API 서버 URL (xamong-code api-server.js, 예: http://localhost:8787)
   * 설정 시 draft 호출을 해당 서버로 라우팅, 미설정 시 직접 AI API 호출
   */
  xcApiUrl: string;
  /**
   * Lab 모드 전용 API 서버 URL (기본값: http://127.0.0.1:3845)
   * 에이전트 API와 완전히 별개의 서버. 빈 문자열이면 기본값 사용.
   */
  labApiUrl: string;
}

export interface AiProviderProfile {
  id: string;
  name: string;
  settings: AiProviderSettings;
  createdAt: number;
  updatedAt: number;
}

export interface XamongCodeRuntimeSettings {
  /** xamongcode 설치/런타임 루트. 비어 있으면 env 또는 Desk 옆 sibling/vendor 경로를 자동 탐색 */
  runtimePath: string;
  /** XAMONG_CONFIG_DIR. API 서버 설정, 로그, 세션 저장 위치 */
  configDir: string;
  /** Desk 시작 시 xamongcode API 서버를 자동 시작 */
  autoStart: boolean;
  /** xamongcode API bind host */
  host: string;
  /** xamongcode API bind port */
  port: number;
  /** xamongcode/OpenAI runtime key. Required for OpenAI-backed execution */
  openAiApiKey: string;
  /** OPENAI_MODEL for xamongcode CLI/API */
  openAiModel: string;
  /** XAMONG_API_WORKSPACES_CONFIG. Empty means configDir/xamong-api-workspaces.json auto-detect */
  workspacesConfigPath: string;
  /** 일반 채팅은 xamongcode CLI 부팅 없이 API 서버의 direct chat 경로를 우선 사용 */
  directGeneralChat: boolean;
  /** XAMONG_API_DIRECT_CHAT_MODEL. Empty means xamongcode API default */
  directChatModel: string;
  /** XAMONG_API_INTERACTIVE_WORKER_TIER_POLICIES JSON string */
  workerTierPolicies: string;
}

export type XenesisApprovalMode = 'readonly' | 'safe' | 'auto';
export type XenesisRuntimeMode = 'embedded' | 'externalGateway';
export type XenesisProfileChannelName = 'telegram' | 'slack' | 'discord' | 'webhook';

export interface XenesisGatewaySettings {
  enabled: boolean;
  autoStart: boolean;
  host: string;
  port: number;
  requireAuth: boolean;
  mcpEnabled: boolean;
  /** Optional fixed token for local development and e2e bot testing. Empty uses an app-session token. */
  devToken: string;
}

export interface XenesisProfileTemplate {
  name: string;
  summary: string;
}

export interface XenesisChannelState {
  name: XenesisProfileChannelName;
  enabled: boolean;
  configured: boolean;
  env: string[];
}

export interface XenesisChannelGuardrailSettings {
  approvalMode: XenesisApprovalMode;
  maxTurns: number;
  maxTokens: number;
}

export interface XenesisTelegramChannelSettings extends XenesisChannelGuardrailSettings {
  enabled: boolean;
  tokenEnv: string;
  allowedChatIds: string;
}

export interface XenesisSlackChannelSettings extends XenesisChannelGuardrailSettings {
  enabled: boolean;
  botTokenEnv: string;
  signingSecretEnv: string;
  webhookUrlEnv: string;
  allowedChannelIds: string;
}

export interface XenesisDiscordChannelSettings extends XenesisChannelGuardrailSettings {
  enabled: boolean;
  botTokenEnv: string;
  webhookUrlEnv: string;
  allowedChannelIds: string;
  allowedGuildIds: string;
}

export interface XenesisWebhookChannelSettings extends XenesisChannelGuardrailSettings {
  enabled: boolean;
  urlEnv: string;
}

export interface XenesisProfileChannelSettings {
  telegram: XenesisTelegramChannelSettings;
  slack: XenesisSlackChannelSettings;
  discord: XenesisDiscordChannelSettings;
  webhook: XenesisWebhookChannelSettings;
}

export interface XenesisProfilePolicyState {
  workflow: string;
  approvalMode: XenesisApprovalMode;
  maxTurns: number;
  providerRetries: number;
  contextAutoCompact: boolean;
  memoryEnabled: boolean;
  subagentsEnabled: boolean;
  browserEnabled: boolean;
  verificationAutoRun: boolean;
  verificationAutoFix: boolean;
}

export interface XenesisProfileState {
  active: string;
  configured: string;
  installed: string[];
  templates: XenesisProfileTemplate[];
  channels: XenesisChannelState[];
  channelSettings: XenesisProfileChannelSettings;
  policy: XenesisProfilePolicyState;
}

export interface XenesisProfileInstallRequest {
  template: string;
  name?: string;
  activate?: boolean;
}

export interface XenesisProfileChannelsUpdateRequest {
  profile?: string;
  channels: XenesisProfileChannelSettings;
}

export interface XenesisProfileChannelTestRequest {
  profile?: string;
  channel: XenesisProfileChannelName;
  channels: XenesisProfileChannelSettings;
  message?: string;
}

export interface XenesisProfileChannelTestResult {
  ok: boolean;
  channel: XenesisProfileChannelName;
  profile: string;
  target: string;
  message: string;
}

export interface XenesisRuntimeSettings {
  enabled: boolean;
  runtimeMode: XenesisRuntimeMode;
  autoStart: boolean;
  runtimePath: string;
  host: string;
  port: number;
  approvalMode: XenesisApprovalMode;
  maxTurns: number;
  model: string;
  profile: string;
  mcpEnabled: boolean;
  gateway: XenesisGatewaySettings;
}

export interface XenesisProviderRuntimeStatus {
  provider: string;
  model: string;
  profile: string;
  baseURL: string;
  apiKeyEnv: string;
}

export type LocalCliAgentId =
  | 'claude'
  | 'codex'
  | 'devin'
  | 'gemini'
  | 'opencode'
  | 'hermes'
  | 'kimi'
  | 'cursor'
  | 'qwen'
  | 'qoder'
  | 'github-copilot'
  | 'pi';

export interface LocalCliSettings {
  /** Desk 터미널에 기본으로 연결할 코드 에이전트 */
  selectedAgentId: LocalCliAgentId;
  /** 새 터미널을 만들 때 선택한 CLI의 PATH/API 키/모델 환경을 자동 주입 */
  autoConfigureTerminal: boolean;
}

export type GowooriChatPromptMode = 'argument' | 'stdin';
export type GowooriChatProviderId = 'mock' | 'codex' | 'claude' | 'hermes' | 'byok';

export interface GowooriChatSettings {
  /** GowooriChat에서 사용할 기본 LLM provider. byok은 설정된 AI 프로필을 직접 호출한다. */
  provider: GowooriChatProviderId;
  /** CLI에 프롬프트를 전달하는 방식. stdin은 긴 Markdown/XCON 요청에 더 안전하다. */
  promptMode: GowooriChatPromptMode;
  /** 선택한 provider에 공통으로 붙일 CLI 인자. 비어 있으면 provider 기본값을 사용한다. */
  commandArgs: string;
  /** CLI/API 실행 제한 시간 */
  timeoutMs: number;
  /** 스트림이 들어오는 동안 Gowoori preview를 점진적으로 갱신 */
  livePreview: boolean;
  /** provider별 실행 명령 override */
  commandOverrides: Partial<Record<string, string>>;
  /** BYOK API endpoint override. 비어 있으면 aiProvider.baseUrl을 사용한다. */
  apiBaseUrl: string;
  /** BYOK model override. 비어 있으면 aiProvider.model을 사용한다. */
  apiModel: string;
  /** Optional structured sports standings proxy endpoint for Gowoori Agent tools. */
  sportsStandingsEndpoint: string;
}

export interface LocalCliAgentStatus {
  id: LocalCliAgentId;
  label: string;
  subtitle: string;
  provider: string;
  accent: string;
  commands: string[];
  installed: boolean;
  commandPath: string;
  version: string;
}

/** 디렉터리 항목 — fs:list-dir IPC 응답 */
export interface FsEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  /** 소문자, 점 없음. 디렉터리는 빈 문자열 */
  ext: string;
}

export interface FileTransferPayload {
  fileName: string;
  contentBase64: string;
  size: number;
  isDirectory?: boolean;
}

export interface FileTransferResult {
  saved: boolean;
  message?: string;
}

export interface FsApi {
  listDir(dirPath: string): Promise<FsEntry[]>;
  selectDir(): Promise<string | null>;
  readFileBase64(filePath: string): Promise<FileTransferPayload | null>;
  writeFileBase64(filePath: string, contentBase64: string): Promise<FileTransferResult>;
}

export interface ProcessInfo {
  pid: number;
  ppid?: number;
  name: string;
  command: string;
  path?: string;
  memoryBytes?: number;
  startedAt?: string;
  source: 'local';
}

export interface ProcessKillResult {
  ok: boolean;
  pid: number;
  message?: string;
  error?: string;
}

export interface ProcessViewerApi {
  list(): Promise<ProcessInfo[]>;
  kill(pid: number, force?: boolean): Promise<ProcessKillResult>;
}

export interface SafeFilePreviewRequest {
  filePath: string;
  content: string;
  maxBytes?: number;
}

export interface SafeFilePreviewResult {
  ok: true;
  filePath: string;
  existed: boolean;
  originalBytes: number;
  modifiedBytes: number;
  wouldChange: boolean;
  backupRequired: boolean;
  diff: string;
}

export interface SafeFileApplyRequest extends SafeFilePreviewRequest {
  backupRoot?: string;
}

export interface SafeFileApplyResult extends SafeFilePreviewResult {
  written: boolean;
  backupCreated: boolean;
  backupPath?: string;
  metadataPath?: string;
}

export interface SafeFileRestoreRequest {
  backupPath: string;
  filePath?: string;
}

export interface SafeFileRestoreResult {
  ok: true;
  filePath: string;
  backupPath: string;
  restoredBytes: number;
}

export interface SafeFileApi {
  previewTextWrite(request: SafeFilePreviewRequest): Promise<SafeFilePreviewResult>;
  applyTextWrite(request: SafeFileApplyRequest): Promise<SafeFileApplyResult>;
  restoreTextBackup(request: SafeFileRestoreRequest): Promise<SafeFileRestoreResult>;
}

export type DockContentType =
  | 'html'
  | 'terminal'
  | 'command-center'
  | 'browser'
  | 'markdown'
  | 'mermaid'
  | 'code'
  | 'image'
  | 'xamong-chat'
  | 'xenesis-bot'
  | 'xd-ai-workbench'
  | 'xd-artifact-library'
  | 'xd-terminal-inspector'
  | 'xd-process-viewer'
  | 'xd-remote-sync-planner'
  | 'xd-run-task-panel'
  | 'xd-safe-file-edit-center'
  | 'xenesis-agent'
  | 'hermes-status'
  | 'hermes-action-inbox'
  | 'capability-explorer'
  | 'hermes-timeline'
  | 'hermes-stash-ops'
  | 'activity-timeline'
  | 'network-monitor'
  | 'xd-blaster'
  | 'audit-log'
  | 'agent-performance'
  | 'hex'
  | 'document-preview'
  | 'meta-management'
  | 'query-analyzer'
  | 'sqlite-server-settings'
  | 'workflow-runner'
  | 'demo-lab-player'
  | 'demo-lab-playback'
  | 'gowoori'
  | 'gowoori-chat'
  | 'alert-rules'
  | 'template-catalog'
  | 'artifact-versions'
  | 'settings'
  | 'xcon-viewer'
  | 'xapp-preview'
  | 'automation-monitor'
  | 'extension-panel'
  | 'diagnostics'
  | 'onboarding';

export type ExtensionMenuLocation = 'tools' | 'commandPalette' | 'settings';
export type ExtensionPanelPlacement = 'tab' | 'left' | 'right' | 'top' | 'bottom';
export type WindowState = 'top' | 'left' | 'document' | 'right' | 'bottom';
export interface RenderStreamingOptions {
  enabled?: boolean;
  intervalMs?: number;
  chunkSize?: number;
  initialDelayMs?: number;
}
export interface RenderOptions {
  streaming?: RenderStreamingOptions;
  openAs?: 'demoLabPlayback';
}
export interface ExtensionOpenPanelOptions {
  placement?: ExtensionPanelPlacement;
}
export type ExtensionSource = 'public' | 'internal' | 'user';
export type ExtensionPermission =
  | 'commands'
  | 'files.read'
  | 'files.write'
  | 'settings.read'
  | 'settings.write'
  | 'tools.open'
  | 'panels.open';

export interface ExtensionLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  phase: 'manifest' | 'activation' | 'runtime';
  message: string;
}

export interface ExtensionCommandContribution {
  command: string;
  title: string;
  titleKey?: string;
  category?: string;
  categoryKey?: string;
  icon?: string;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  publisher?: string;
  description?: string;
  source?: ExtensionSource;
  permissions?: ExtensionPermission[];
  main: string;
  contributes?: {
    commands?: ExtensionCommandContribution[];
    menus?: Partial<Record<ExtensionMenuLocation, string[]>>;
  };
}

export interface ExtensionCommandDescriptor {
  id: string;
  title: string;
  titleKey?: string;
  category?: string;
  categoryKey?: string;
  icon?: string;
  extensionId: string;
  extensionName: string;
  enabled: boolean;
  menuLocations: ExtensionMenuLocation[];
}

export type ExtensionTool =
  | 'xenesis-desk.core-tools.xamong-code-chat'
  | 'xenesis-desk.core-tools.xenesis-bot'
  | 'xenesis-desk.core-tools.ai-workbench'
  | 'xenesis-desk.core-tools.artifact-library'
  | 'xenesis-desk.core-tools.terminal-inspector'
  | 'xenesis-desk.core-tools.process-viewer'
  | 'xenesis-desk.core-tools.remote-sync-planner'
  | 'xenesis-desk.core-tools.run-task-panel'
  | 'xenesis-desk.core-tools.safe-file-edit-center'
  | 'xenesis-desk.core-tools.xenesis-agent'
  | 'xenesis-desk.core-tools.hermes-status'
  | 'xenesis-desk.core-tools.hermes-action-inbox'
  | 'xenesis-desk.core-tools.capability-explorer'
  | 'xenesis-desk.core-tools.hermes-timeline'
  | 'xenesis-desk.core-tools.hermes-stash-ops'
  | 'xenesis-desk.core-tools.xapp-preview'
  | 'xenesis-desk.data-tools.meta-management'
  | 'xenesis-desk.data-tools.query-analyzer'
  | 'xenesis-desk.data-tools.query-analyzer-od'
  | 'xenesis-desk.data-tools.sqlite-server-settings'
  | 'xenesis-desk.workflow-runner.runner'
  | 'xenesis-desk.workflow-runner.demo-lab-playback'
  | 'xenesis-desk.workflow-runner.demo-lab-player'
  | 'xenesis-desk.workflow-runner.gowoori'
  | 'xenesis-desk.workflow-runner.gowoori-chat'
  | 'xenesis-desk.core-tools.activity-timeline'
  | 'xenesis-desk.core-tools.network-monitor'
  | 'xenesis-desk.core-tools.xd-blaster'
  | 'xenesis-desk.core-tools.audit-log'
  | 'xenesis-desk.core-tools.agent-performance'
  | 'xenesis-desk.workflow-runner.alert-rules'
  | 'xenesis-desk.workflow-runner.template-catalog'
  | 'xenesis-desk.workflow-runner.artifact-versions';

export type ExtensionHostAction =
  | {
      type: 'message';
      text: string;
      extensionId?: string;
    }
  | {
      type: 'openPanel';
      title: string;
      html: string;
      placement?: ExtensionPanelPlacement;
      targetPaneId?: string;
      extensionId?: string;
    }
  | {
      type: 'openMarkdown';
      title: string;
      content: string;
      extensionId?: string;
    }
  | {
      type: 'openCode';
      title: string;
      content: string;
      language?: string;
      extensionId?: string;
    }
  | {
      type: 'openTool';
      tool: ExtensionTool;
      placement?: ExtensionPanelPlacement;
      targetPaneId?: string;
      extensionId?: string;
    };

export interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  publisher?: string;
  description?: string;
  path: string;
  main: string;
  builtin: boolean;
  source: ExtensionSource;
  permissions: ExtensionPermission[];
  enabled: boolean;
  commands: ExtensionCommandDescriptor[];
  logs: ExtensionLogEntry[];
  error?: string;
}

export interface ExtensionRunResult {
  ok: boolean;
  commandId?: string;
  message?: string;
  error?: string;
  actions?: ExtensionHostAction[];
}

export interface ExtensionApi {
  list(): Promise<ExtensionInfo[]>;
  reload(): Promise<ExtensionInfo[]>;
  retry(extensionId: string): Promise<ExtensionInfo[]>;
  setEnabled(extensionId: string, enabled: boolean): Promise<ExtensionInfo[]>;
  runCommand(commandId: string): Promise<ExtensionRunResult>;
}

export type DiagnosticsLogLevel = 'info' | 'warn' | 'error';
export type DiagnosticsLogSource =
  | 'main'
  | 'renderer'
  | 'extension'
  | 'terminal'
  | 'remote-file'
  | 'subagent-hook'
  | 'updater'
  | 'transfer'
  | 'system';

export interface DiagnosticsLogEntry {
  id: string;
  timestamp: number;
  level: DiagnosticsLogLevel;
  source: DiagnosticsLogSource;
  scope: string;
  message: string;
  detail?: string;
}

export interface DiagnosticsLogRecordRequest {
  level?: DiagnosticsLogLevel;
  source?: DiagnosticsLogSource;
  scope?: string;
  message: string;
  detail?: string;
}

export interface DiagnosticsBundleExportResult {
  saved: boolean;
  path?: string;
  error?: string;
}

export interface DiagnosticsApi {
  list(): Promise<DiagnosticsLogEntry[]>;
  record(entry: DiagnosticsLogRecordRequest): Promise<DiagnosticsLogEntry>;
  clear(): Promise<DiagnosticsLogEntry[]>;
  revealLogFile(): Promise<boolean>;
  exportBundle(): Promise<DiagnosticsBundleExportResult>;
  onChanged(callback: (items: DiagnosticsLogEntry[]) => void): () => void;
}

export interface ExtensionSettings {
  disabledExtensionIds: string[];
  userExtensionsDir: string;
}

export type SecretVaultStorageMode = 'plain' | 'os-protected';
export type SecretVaultKind = 'api-key' | 'remote-password' | 'remote-passphrase' | 'token' | 'generic';

export interface SecretVaultItem {
  secretId: string;
  label: string;
  kind: SecretVaultKind;
  storage: SecretVaultStorageMode;
  value: string;
  updatedAt: number;
}

export interface SecretVaultSettings {
  mode: SecretVaultStorageMode;
  items: SecretVaultItem[];
}

export interface SecretVaultStatusItem {
  secretId: string;
  label: string;
  kind: SecretVaultKind;
  storage: SecretVaultStorageMode;
  updatedAt: number;
  hasValue: boolean;
}

export interface SecretVaultStatus {
  mode: SecretVaultStorageMode;
  effectiveMode: SecretVaultStorageMode;
  osProtectedAvailable: boolean;
  items: SecretVaultStatusItem[];
}

export interface SecretVaultApi {
  status(): Promise<SecretVaultStatus>;
  clear(): Promise<SecretVaultStatus>;
}

export interface WorkspaceRecentItem {
  path: string;
  name: string;
  updatedAt: number;
}

export interface WorkspaceSettings {
  currentPath: string;
  recent: WorkspaceRecentItem[];
  autoRestore: boolean;
}

export type OnboardingTrackId = 'basic-desk';
export type OnboardingVerificationState = 'idle' | 'pending' | 'passed' | 'failed' | 'skipped';

export interface OnboardingVerificationSnapshot {
  state: OnboardingVerificationState;
  checkedAt: number;
  message: string;
}

export interface OnboardingSettings {
  dismissed: boolean;
  dismissedAt: number;
  version: string;
  currentTrack: OnboardingTrackId;
  currentStepId: string;
  completedStepIds: string[];
  skippedStepIds: string[];
  verificationResults: Record<string, OnboardingVerificationSnapshot>;
  sampleWorkspacePath: string;
}

export interface OnboardingSampleWorkspaceStatus {
  exists: boolean;
  path: string;
  expectedFiles: string[];
  missingFiles: string[];
}

export interface OnboardingSampleWorkspaceResult extends OnboardingSampleWorkspaceStatus {
  prepared: boolean;
  reset: boolean;
  message: string;
}

export interface OnboardingRunArtifactStep {
  stepId: string;
  index: number;
  total: number;
  ok: boolean;
  ran: boolean;
  verified: boolean;
  passed: boolean;
  message?: string;
  caption?: string;
  capture?: CapturePaneResult;
  screenshotPath?: string;
  screenshotFileName?: string;
  error?: string;
}

export interface OnboardingRunArtifactSaveRequest {
  runId?: string;
  title?: string;
  trackId: OnboardingTrackId;
  startedAt: string;
  finishedAt: string;
  sampleWorkspacePath?: string;
  artifactDir?: string;
  steps: OnboardingRunArtifactStep[];
}

export interface OnboardingRunArtifact {
  runId: string;
  title: string;
  trackId: OnboardingTrackId;
  path: string;
  manifestPath: string;
  createdAt: string;
  startedAt: string;
  finishedAt: string;
  sampleWorkspacePath?: string;
  stepCount: number;
  passedCount: number;
  screenshots: string[];
  steps: OnboardingRunArtifactStep[];
}

export interface OnboardingRunArtifactOpenResult {
  ok: boolean;
  path: string;
  error?: string;
}

export interface OnboardingRunArtifactClearResult {
  ok: boolean;
  path: string;
  cleared: number;
  error?: string;
}

export interface OnboardingDemoRouteScene {
  index: number;
  stepId: string;
  title: string;
  caption?: string;
  passed?: boolean;
  screenshotPath?: string;
  screenshotFileName?: string;
}

export interface OnboardingDemoRouteStoryboard {
  title: string;
  trackId: OnboardingTrackId | string;
  sampleWorkspacePath?: string;
  runId?: string;
  runManifestPath?: string;
  previewCapturePath?: string;
  scenes: OnboardingDemoRouteScene[];
}

export interface OnboardingDemoRouteResult {
  ok: boolean;
  mode?: string;
  generatedAt?: string;
  outputPath?: string;
  storyboardPath?: string;
  demoLabPresetPath?: string;
  artifact?: OnboardingRunArtifact;
  preview?: {
    runId?: string;
    capture?: CapturePaneResult;
  };
  storyboardPreview?: {
    open?: unknown;
    capture?: CapturePaneResult;
  };
  demoLabPlayback?: {
    open?: unknown;
    controls?: McpBridgeDemoLabPlaybackControlResult[];
    capture?: CapturePaneResult;
    error?: string;
  };
  storyboard?: OnboardingDemoRouteStoryboard;
  sampleResetWarning?: string;
  error?: string;
}

export interface OnboardingDemoRouteReadResult {
  ok: boolean;
  path: string;
  exists: boolean;
  route?: OnboardingDemoRouteResult;
  error?: string;
}

export interface OnboardingDemoRouteSaveRequest {
  scenario: McpBridgeOnboardingScenarioRunResult;
  preview?: McpBridgeOnboardingRunPreviewResult;
  windowSize?: string;
  mode?: string;
}

export interface OnboardingDemoRouteSaveResult {
  ok: boolean;
  path: string;
  route?: OnboardingDemoRouteResult;
  storyboardPath?: string;
  demoLabPresetPath?: string;
  sceneCount: number;
  error?: string;
}

export interface OnboardingDemoRouteStoryboardExportResult {
  ok: boolean;
  path: string;
  routePath: string;
  sceneCount: number;
  error?: string;
}

export type OnboardingDemoRouteOpenTarget = 'json' | 'run' | 'preview' | 'scene' | 'storyboard' | 'demoPreset';

export interface OnboardingDemoRouteOpenRequest {
  target?: OnboardingDemoRouteOpenTarget;
  stepId?: string;
}

export interface OnboardingDemoRouteOpenResult {
  ok: boolean;
  path: string;
  target: OnboardingDemoRouteOpenTarget;
  error?: string;
}

export interface OnboardingApi {
  sampleStatus(): Promise<OnboardingSampleWorkspaceStatus>;
  prepareSampleWorkspace(): Promise<OnboardingSampleWorkspaceResult>;
  resetSampleWorkspace(): Promise<OnboardingSampleWorkspaceResult>;
  saveRunArtifact(request: OnboardingRunArtifactSaveRequest): Promise<OnboardingRunArtifact>;
  listRunArtifacts(): Promise<OnboardingRunArtifact[]>;
  openRunArtifact(runId?: string): Promise<OnboardingRunArtifactOpenResult>;
  clearRunArtifacts(): Promise<OnboardingRunArtifactClearResult>;
  readDemoRoute(): Promise<OnboardingDemoRouteReadResult>;
  saveDemoRoute(request: OnboardingDemoRouteSaveRequest): Promise<OnboardingDemoRouteSaveResult>;
  exportDemoRouteStoryboard(): Promise<OnboardingDemoRouteStoryboardExportResult>;
  openDemoRouteTarget(request?: OnboardingDemoRouteOpenRequest): Promise<OnboardingDemoRouteOpenResult>;
  onSampleStatusChanged(callback: (status: OnboardingSampleWorkspaceStatus) => void): () => void;
}

export type McpBridgeDemoLabPlaybackControlAction = 'status' | 'start' | 'stop' | 'next' | 'prev' | 'reset' | 'mode';
export type McpBridgeDemoLabPlaybackMode = 'preview' | 'code' | 'split';

export interface McpBridgeDemoLabPlaybackControlPayload {
  requestId: string;
  action: McpBridgeDemoLabPlaybackControlAction;
  contentId?: string;
  mode?: McpBridgeDemoLabPlaybackMode;
}

export interface McpBridgeDemoLabPlaybackControlResult {
  requestId: string;
  ok: boolean;
  action: McpBridgeDemoLabPlaybackControlAction;
  contentId?: string;
  title?: string;
  sourceLabel?: string;
  filePath?: string;
  mode?: McpBridgeDemoLabPlaybackMode;
  isPlaying?: boolean;
  sceneIndex?: number;
  sceneCount?: number;
  actionIndex?: number;
  actionCount?: number;
  activeSceneTitle?: string | null;
  activeActionType?: string | null;
  progress?: number;
  elapsedMs?: number;
  durationMs?: number;
  error?: string;
}

export type ThemeName = 'dark' | 'light';

export type RemoteTerminalProtocol = 'ssh' | 'telnet';
export type TerminalSessionKind = 'shell' | 'ssh' | 'telnet';
export type LocalTerminalCliSelection = 'default' | 'none' | LocalCliAgentId;

export interface TerminalRestoreSettings {
  restoreShell: boolean;
  restoreSsh: boolean;
  restoreTelnet: boolean;
  runInitialCommandOnRestore: boolean;
  rerunLastCommandOnRestore: boolean;
}

export interface TerminalProfileGroup {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalTerminalProfile {
  id: string;
  name: string;
  groupId: string;
  shell: ShellKind;
  cwd: string;
  localCliAgentId: LocalTerminalCliSelection;
  environmentText: string;
  initialCommand: string;
  createdAt: number;
  updatedAt: number;
}

export interface RemoteTerminalProfile {
  id: string;
  name: string;
  groupId: string;
  protocol: RemoteTerminalProtocol;
  host: string;
  port: number;
  username: string;
  /** 사용자가 요청한 로컬 저장 비밀번호. 빈 문자열이면 저장하지 않음. */
  password: string;
  privateKeyPath: string;
  passphrase: string;
  connectTimeoutMs: number;
  initialCommand: string;
  createdAt: number;
  updatedAt: number;
}

export interface RemoteTerminalSettings {
  groups: TerminalProfileGroup[];
  profiles: RemoteTerminalProfile[];
  localProfiles: LocalTerminalProfile[];
}

export type RemoteFileProtocol = 'ftp' | 'ftps' | 'sftp';
export type RemoteFileEncoding = 'utf8' | 'euc-kr' | 'cp949' | 'utf16le' | 'latin1' | 'ascii';

export interface RemoteFileProfile {
  id: string;
  name: string;
  groupId: string;
  protocol: RemoteFileProtocol;
  host: string;
  port: number;
  username: string;
  /** 사용자가 요청한 로컬 저장 비밀번호. 빈 문자열이면 저장하지 않음. */
  password: string;
  privateKeyPath: string;
  passphrase: string;
  connectTimeoutMs: number;
  rootPath: string;
  /** FTP/FTPS control/list encoding and editable text file encoding. */
  encoding: RemoteFileEncoding;
  createdAt: number;
  updatedAt: number;
}

export interface RemoteFileSettings {
  groups: TerminalProfileGroup[];
  profiles: RemoteFileProfile[];
}

export interface RemoteFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  ext: string;
  size: number;
  modifiedAt?: string;
}

export interface RemoteFileOperationResult {
  ok: boolean;
  message?: string;
}

export interface RemoteFileWriteRequest {
  profile: RemoteFileProfile;
  remotePath: string;
  contentBase64: string;
  contentMode?: 'binary' | 'text';
}

export type TransferQueueDirection = 'upload' | 'download';
export type TransferQueueState = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
export type TransferOverwritePolicy = 'ask' | 'overwrite' | 'skip';

export interface TransferQueueEnqueueRequest {
  direction: TransferQueueDirection;
  profile: RemoteFileProfile;
  localPath: string;
  remotePath: string;
  fileName?: string;
  overwritePolicy?: TransferOverwritePolicy;
}

export interface TransferQueueItem {
  id: string;
  direction: TransferQueueDirection;
  state: TransferQueueState;
  profileId: string;
  profileName: string;
  localPath: string;
  remotePath: string;
  fileName: string;
  overwritePolicy: TransferOverwritePolicy;
  bytesTransferred: number;
  bytesTotal: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  retryOf?: string;
}

export interface RemoteFileApi {
  test(profile: RemoteFileProfile): Promise<RemoteFileOperationResult>;
  list(profile: RemoteFileProfile, remotePath: string): Promise<RemoteFileEntry[]>;
  readFile(profile: RemoteFileProfile, remotePath: string): Promise<OpenFileResult | null>;
  readFileBase64(profile: RemoteFileProfile, remotePath: string): Promise<FileTransferPayload | null>;
  writeFile(request: RemoteFileWriteRequest): Promise<RemoteFileOperationResult>;
  mkdir(profile: RemoteFileProfile, remotePath: string): Promise<RemoteFileOperationResult>;
  delete(profile: RemoteFileProfile, remotePath: string, isDirectory: boolean): Promise<RemoteFileOperationResult>;
  rename(profile: RemoteFileProfile, fromPath: string, toPath: string): Promise<RemoteFileOperationResult>;
}

export interface TransferQueueApi {
  enqueue(request: TransferQueueEnqueueRequest): Promise<TransferQueueItem>;
  list(): Promise<TransferQueueItem[]>;
  retry(id: string): Promise<TransferQueueItem | null>;
  cancel(id: string): Promise<TransferQueueItem | null>;
  clearCompleted(): Promise<TransferQueueItem[]>;
  clearAll(): Promise<TransferQueueItem[]>;
  onChanged(callback: (items: TransferQueueItem[]) => void): () => void;
}

export interface AppMenuCommandEvent {
  id?: string;
  actionId?: string;
  commandId?: string;
}

export interface AppMenuApi {
  onCommand(callback: (event: AppMenuCommandEvent) => void): () => void;
}

export type RemoteSyncAction =
  | 'upload'
  | 'download'
  | 'equal'
  | 'conflict'
  | 'local-only'
  | 'remote-only'
  | 'skip-directory';

export interface RemoteSyncPlanEntry {
  name: string;
  localPath?: string;
  remotePath?: string;
  isDirectory: boolean;
  action: RemoteSyncAction;
  reason: string;
}

export interface RemoteSyncPlan {
  generatedAt: string;
  localDir: string;
  remotePath: string;
  profileId: string;
  profileName: string;
  entries: RemoteSyncPlanEntry[];
  counts: Record<RemoteSyncAction, number>;
}

export type WindowSizerCoordinateMode = 'active-display-workarea' | 'absolute';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowSizerPreset {
  id: string;
  name: string;
  group: string;
  width: number;
  height: number;
  /** false이면 크기만 적용하고 현재 창 위치는 유지한다. */
  moveToPosition: boolean;
  /** coordinateMode 기준 X 좌표. active-display-workarea이면 현재 모니터 작업영역 기준 상대 좌표. */
  x: number;
  /** coordinateMode 기준 Y 좌표. active-display-workarea이면 현재 모니터 작업영역 기준 상대 좌표. */
  y: number;
  coordinateMode: WindowSizerCoordinateMode;
  /** false이면 창이 화면 밖으로 완전히 사라지지 않도록 최소 가시 영역을 보정한다. */
  allowOutsideDisplay: boolean;
  builtin?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WindowSizerSettings {
  presets: WindowSizerPreset[];
}

export interface WorkspaceProfileSettings {
  defaultCwd: string;
  defaultShell: ShellKind;
  localCli: LocalCliSettings;
  terminalRestore: TerminalRestoreSettings;
  remoteTerminals: RemoteTerminalSettings;
  remoteFiles: RemoteFileSettings;
  windowSizer: WindowSizerSettings;
}

export interface WorkspaceProfile {
  version: 1;
  name: string;
  savedAt: string;
  appVersion?: string;
  settings: WorkspaceProfileSettings;
  layout: unknown | null;
}

export interface WorkspaceSaveResult {
  saved: boolean;
  path?: string;
  profile?: WorkspaceProfile;
  recent: WorkspaceRecentItem[];
}

export interface WorkspaceOpenResult {
  path: string;
  profile: WorkspaceProfile;
  recent: WorkspaceRecentItem[];
}

export interface WorkspaceApi {
  saveAs(profile: WorkspaceProfile, suggestedName?: string): Promise<WorkspaceSaveResult>;
  saveTo(profile: WorkspaceProfile, filePath: string): Promise<WorkspaceSaveResult>;
  open(): Promise<WorkspaceOpenResult | null>;
  read(filePath: string): Promise<WorkspaceOpenResult>;
  clearRecent(): Promise<WorkspaceRecentItem[]>;
}

export type WorkflowRunHistoryStatusFilter = 'all' | 'success' | 'failed';

export interface WorkflowRunHistoryRecord {
  version: 1;
  id: string;
  workflowName: string;
  workflowSource?: string;
  fixture?: string;
  success: boolean;
  scope: string;
  actionId?: string;
  simulateApi?: boolean;
  sequential?: boolean;
  targetMode: string;
  targetGroupId?: string;
  commandConcurrency?: number;
  targetCount: number;
  actionCount: number;
  startedAt: string;
  durationMs: number;
  savedAt: string;
  result: unknown;
  commandStatuses?: unknown[];
  failedTargetIds?: string[];
  terminalResultSummary?: unknown[];
  filePath?: string;
}

export interface WorkflowRunHistoryListRequest {
  limit?: number;
  query?: string;
  status?: WorkflowRunHistoryStatusFilter;
}

export interface WorkflowRunHistorySaveResult {
  saved: boolean;
  path: string;
  record: WorkflowRunHistoryRecord;
}

export interface WorkflowRunsApi {
  list(request?: WorkflowRunHistoryListRequest): Promise<WorkflowRunHistoryRecord[]>;
  save(record: WorkflowRunHistoryRecord): Promise<WorkflowRunHistorySaveResult>;
  delete(id: string): Promise<WorkflowRunHistoryRecord[]>;
  clear(): Promise<WorkflowRunHistoryRecord[]>;
}

export type WorkflowTemplateSource = 'builtin' | 'user';

export interface WorkflowTemplateRecord {
  version: 1;
  id: string;
  name: string;
  description: string;
  source: WorkflowTemplateSource;
  workflow: string;
  fixture: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  filePath?: string;
}

export interface WorkflowTemplateSaveResult {
  saved: boolean;
  path: string;
  template: WorkflowTemplateRecord;
}

export interface WorkflowTemplatesApi {
  list(): Promise<WorkflowTemplateRecord[]>;
  save(template: WorkflowTemplateRecord): Promise<WorkflowTemplateSaveResult>;
  setFavorite(id: string, favorite: boolean): Promise<WorkflowTemplateRecord[]>;
  touch(id: string): Promise<WorkflowTemplateRecord[]>;
  remove(id: string): Promise<WorkflowTemplateRecord[]>;
}

export interface WorkflowPlaywrightAction {
  type?: string;
  action?: string;
  selector?: string;
  value?: unknown;
  text?: string;
  key?: string;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  ms?: number;
  fileName?: string;
  timeoutMs?: number;
  [key: string]: unknown;
}

export interface WorkflowPlaywrightSnapshotRequest {
  url: string;
  selector?: string;
  outDir?: string;
  fileName?: string;
  fullPage?: boolean;
  headless?: boolean;
  timeoutMs?: number;
  allowedHosts?: string[];
}

export interface WorkflowPlaywrightRunRequest {
  url: string;
  actions: WorkflowPlaywrightAction[];
  screenshot?: boolean;
  trace?: boolean;
  selector?: string;
  screenshotSelector?: string;
  outDir?: string;
  fileName?: string;
  screenshotFileName?: string;
  traceFileName?: string;
  headless?: boolean;
  timeoutMs?: number;
  allowedHosts?: string[];
}

export interface WorkflowPlaywrightResult {
  ok: boolean;
  error?: string;
  filePath?: string;
  screenshotFilePath?: string;
  traceFilePath?: string;
  url?: string;
  outDir?: string;
  artifacts?: unknown[];
  actions?: unknown[];
  [key: string]: unknown;
}

export interface WorkflowPlaywrightApi {
  snapshot(request: WorkflowPlaywrightSnapshotRequest): Promise<WorkflowPlaywrightResult>;
  run(request: WorkflowPlaywrightRunRequest): Promise<WorkflowPlaywrightResult>;
}

export interface ShellTerminalSpawnRequest {
  id: string;
  kind?: 'shell';
  shell: ShellKind;
  cols: number;
  rows: number;
  cwd?: string;
  profile?: LocalTerminalProfile;
}

export interface SshTerminalSpawnRequest {
  id: string;
  kind: 'ssh';
  profile: RemoteTerminalProfile;
  cols: number;
  rows: number;
}

export interface TelnetTerminalSpawnRequest {
  id: string;
  kind: 'telnet';
  profile: RemoteTerminalProfile;
  cols: number;
  rows: number;
}

export type TerminalSpawnRequest = ShellTerminalSpawnRequest | SshTerminalSpawnRequest | TelnetTerminalSpawnRequest;

export type TerminalSpawnConfig =
  | Omit<ShellTerminalSpawnRequest, 'id' | 'cols' | 'rows'>
  | Omit<SshTerminalSpawnRequest, 'id' | 'cols' | 'rows'>
  | Omit<TelnetTerminalSpawnRequest, 'id' | 'cols' | 'rows'>;

export interface TerminalSessionSnapshot {
  kind: TerminalSessionKind;
  spawnConfig: TerminalSpawnConfig;
  lastCommand?: string;
  metadata?: McpBridgeTerminalMetadata;
}

export interface TerminalSpawnResult {
  id: string;
  kind: TerminalSessionKind;
  pid: number;
  shell?: ShellKind;
  command: string;
  cwd: string;
  profileId?: string;
}

export interface TerminalDataEvent {
  id: string;
  data: string;
}

export interface TerminalExitEvent {
  id: string;
  exitCode: number;
  signal?: number;
}

export interface ShellDescriptor {
  kind: ShellKind;
  label: string;
  available: boolean;
  command: string;
}

export interface SaveLogRequest {
  defaultName: string;
  text: string;
}

export interface SaveLogResult {
  saved: boolean;
  path?: string;
}

export interface TerminalImageWriteOptions {
  width?: string;
  height?: string;
  preserveAspectRatio?: boolean;
  filename?: string;
}

export interface TerminalXconImageWriteOptions {
  width?: string;
  height?: string;
  syntax?: string;
  theme?: string;
  title?: string;
  viewportWidth?: number;
}

export interface TerminalImageWriteResult {
  ok: boolean;
  error?: string;
  bytesSent?: number;
}

/** 단축 명령 항목 (commandStore 와 공유) */
export interface CmdShortcut {
  id: string;
  name: string;
  command: string;
}

/** 터미널 묶음 명령 — 명령과 실행 맥락을 함께 저장하는 재사용 항목 */
export interface TerminalWorkBlock {
  id: string;
  label: string;
  command: string;
  group: string;
  cwd: string;
  terminalKind: ShellKind | TerminalSessionKind | string;
  createdAt: number;
  updatedAt: number;
  runCount: number;
}

/** 커맨드 팔레트 명령에 연결되는 전역 키보드 단축키 */
export interface CommandShortcutBinding {
  id: string;
  commandId: string;
  accelerator: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface KeyboardShortcutSettings {
  bindings: CommandShortcutBinding[];
}

// ─── 자동화 시스템 ────────────────────────────────────────────────────────────

/** 사용자 정의 정규식 규칙 */
export interface AutomationRegexRule {
  id: string;
  name: string;
  /** RegExp 패턴 소스 (슬래시 없음) */
  pattern: string;
  /** RegExp 플래그 (기본 'i') */
  flags: string;
  /** 매칭 시 터미널에 전송할 입력 */
  response: string;
  /** 같은 규칙이 재실행되기까지 최소 간격(ms) */
  cooldownMs: number;
  enabled: boolean;
}

/** 자동화 단계 */
export type AutomationStage = 1 | 2 | 3;

/** 자동화 동작 모드 */
export type AutomationMode = 'stream' | 'watch' | 'respond';

/** Stream 모드 출력 필터 프로필 */
export type AutomationStreamFilterProfile = 'auto' | 'none' | 'codex' | 'claude' | 'gemini' | 'aider' | 'windsurf';

/** 자동화 전역 설정 */
export interface AutomationSettings {
  /** 새 터미널의 기본 자동화 동작 모드 */
  defaultMode: AutomationMode;
  /** Stream 모드에서 터미널 출력 필터를 선택하는 방식 */
  streamFilterProfile: AutomationStreamFilterProfile;
  /** 새 터미널의 기본 자동화 단계 */
  defaultStage: AutomationStage;
  /**
   * 이전 설정 호환용 자동 명령 전송 여부.
   * 신규 런타임은 defaultMode를 우선 사용하고, defaultMode가 없던 기존 설정만 이 값을 참고한다.
   */
  autoSend: boolean;
  /** 사용자 정의 정규식 규칙 목록 */
  regexRules: AutomationRegexRule[];
  /** LLM 자동화 전용 API 키 (비어 있으면 aiProvider.apiKey 공유) */
  llmApiKey: string;
  /** LLM 자동화 모델 (기본: gpt-4.1-mini) */
  llmModel: string;
  /** 위험 패턴 추가 목록 (기본 패턴 외 사용자 정의) */
  extraDangerPatterns: string[];
}

/** per-session 자동화 런타임 상태 (IPC 직렬화용) */
export interface AutomationStatus {
  termId: string;
  enabled: boolean;
  mode: AutomationMode;
  stage: AutomationStage;
  /** 전역 설정의 Stream 필터 프로필 */
  defaultStreamFilterProfile: AutomationStreamFilterProfile;
  /** 현재 터미널에 실제 적용되는 Stream 필터 프로필 */
  streamFilterProfile: AutomationStreamFilterProfile;
  /** 터미널별 override. 없으면 전역 설정을 따른다. */
  streamFilterProfileOverride?: AutomationStreamFilterProfile;
  llmReady: boolean;
  blocked: boolean;
  blockReason?: string;
  /** 현재 자동 전송 ON/OFF 여부 (설정값 반영) */
  autoSend: boolean;
}

/** 자동화 이벤트 종류 */
export type AutomationEventKind =
  | 'stream' // stream 모드에서 필터링되어 클라이언트에 전달된 출력
  | 'user_input' // Codex 등 TUI에서 표시한 사용자 프롬프트 echo
  | 'auto_input' // autoSend=true 일 때 자동 전송 완료
  | 'pending' // autoSend=false 일 때 감지만 하고 대기 중 (수동 전송 대상)
  | 'manual_sent' // 사용자가 수동으로 전송한 명령
  | 'blocked'
  | 'llm_error'
  | 'status_change';

/** 외부 채널 relay 정책 */
export type AutomationRelayPolicy = 'allow' | 'block' | 'local-only';

/** 외부 채널 relay 판단에 사용한 이벤트 출처 */
export type AutomationRelaySource = 'assistant' | 'user' | 'tool' | 'system';

/** 터미널 출력에서 파싱된 선택 옵션 */
export interface AutomationOption {
  label: string;
  /** 실제 전송할 입력값 (예: "1\r", "y", "\x1b") */
  input: string;
}

/** 자동화 이벤트 항목 */
export interface AutomationEvent {
  id: string;
  termId: string;
  at: string;
  kind: AutomationEventKind;
  source?: 'regex' | 'state-machine' | 'llm';
  rule?: string;
  /** 자동 전송됐거나 수동 전송 가능한 입력값 */
  input?: string;
  reason?: string;
  /** stream 이벤트 전용: 클라이언트에 전달할 필터링된 텍스트 */
  streamText?: string;
  /**
   * 외부 채널 relay 정책.
   * canonical 필터는 AutomationController에서 결정하고, RemoteDesk/e2e 등 소비자는 이 값을 우선 신뢰한다.
   */
  relay?: AutomationRelayPolicy;
  /** relay 판단 대상의 논리 출처 */
  relaySource?: AutomationRelaySource;
  /** 외부 채널로 보낼 canonical 텍스트 */
  relayText?: string;
  /** relay 차단/허용 판단 이유 */
  relayReason?: string;
  /** relay 판단에 사용한 Stream 필터 프로필 */
  relayFilterProfile?: AutomationStreamFilterProfile;
  state?: string;
  error?: boolean;
  /**
   * pending 이벤트 전용: 터미널 출력에서 감지된 선택 옵션 목록.
   * 빈 배열이면 suggestedInput 버튼만 표시.
   */
  options?: AutomationOption[];
  /**
   * pending 이벤트 전용: 엔진이 권장하는 입력값 (버튼으로 표시).
   * autoSend=false 이므로 실제 전송되지 않고 사용자 클릭을 기다림.
   */
  suggestedInput?: string;
  /** pending이 처리(전송)됐는지 여부 */
  dismissed?: boolean;
}

/** 자동화 IPC API */
export interface AutomationApi {
  /** 세션 자동화 활성화/비활성화 */
  setEnabled(termId: string, enabled: boolean): void;
  /** 자동화 단계 변경 */
  setStage(termId: string, stage: AutomationStage): void;
  /** Stream 모드 출력 필터 프로필을 터미널별로 변경. default는 전역 설정으로 복귀 */
  setStreamFilterProfile(termId: string, profile: AutomationStreamFilterProfile | 'default'): void;
  /** 세션 자동화 상태 조회 */
  getStatus(termId: string): Promise<AutomationStatus | null>;
  /** 세션 이벤트 목록 조회 */
  getEvents(termId: string): Promise<AutomationEvent[]>;
  /** 세션 이벤트 초기화 */
  clearEvents(termId: string): void;
  /** 상태 변경 실시간 구독 */
  onStatus(termId: string, cb: (status: AutomationStatus) => void): () => void;
  /** 이벤트 발생 실시간 구독 */
  onEvent(termId: string, cb: (event: AutomationEvent) => void): () => void;
  /** 설정 변경 후 실행 중인 모든 자동화 컨트롤러에 새 설정 반영 */
  reloadSettings(): void;
  /**
   * 수동으로 터미널에 명령 전송 (pending 이벤트의 버튼 클릭 시 호출).
   * autoSend=false여도 이 API로는 전송 가능.
   */
  manualSend(termId: string, input: string, pendingEventId?: string): void;
}

export interface AppFeatureFlags {
  /** Enables staged XamongCode/Phase 5 surfaces. Defaults to false unless XENIS_PHASE_5=true. */
  xenisPhase5: boolean;
}

/** 앱 전역 설정 — userData/settings.json 에 저장됨 */
export interface AppSettings {
  theme: ThemeName;
  defaultCwd: string;
  fontSize: number;
  defaultShell: ShellKind;
  /** 명령 이력 — localStorage 대신 userData 에 영속 저장 */
  cmdHistory: string[];
  /** 단축 명령 — localStorage 대신 userData 에 영속 저장 */
  cmdShortcuts: CmdShortcut[];
  /** 터미널 묶음 명령 — 명령과 실행 맥락을 함께 저장 */
  terminalWorkBlocks: TerminalWorkBlock[];
  /** 커맨드 팔레트/확장 명령 단축키 */
  keyboardShortcuts: KeyboardShortcutSettings;
  /** 단계적 기능 공개 플래그 */
  featureFlags: AppFeatureFlags;
  /** API 서버 URL (기본값: https://ai.xamong.com) */
  apiUrl: string;
  /** 개발 모드 — 내부 SQLite 서버 제어 허용 */
  devMode: boolean;
  /** 내부 SQLite 서버 포트 (기본값: 3001) */
  serverPort: number;
  /** AI 프로바이더 설정 */
  aiProvider: AiProviderSettings;
  /** 저장된 Gowoori/GowooriChat AI 프로바이더 프로필 */
  aiProviderProfiles: AiProviderProfile[];
  /** 현재 활성 AI 프로바이더 프로필 ID */
  activeAiProviderProfileId: string;
  /** xamongcode sidecar 런타임 설정 */
  xamongCode: XamongCodeRuntimeSettings;
  /** Xenesis sidecar 런타임 설정 */
  xenesis: XenesisRuntimeSettings;
  /** Desk 터미널에서 사용할 로컬 코드 에이전트 설정 */
  localCli: LocalCliSettings;
  /** 외부 데스크톱 앱 실행 및 제어 프로필 */
  externalApps: ExternalAppSettings;
  /** GowooriChat CLI/API provider 실행 설정 */
  gowooriChat: GowooriChatSettings;
  /** 화면 캡처 저장 폴더 (비어 있으면 Xenesis Desk 홈의 captures) */
  captureDir: string;
  /** 터미널 자동화 설정 */
  automation: AutomationSettings;
  /** 저장된 레이아웃/워크스페이스에서 터미널 탭을 다시 연결하는 정책 */
  terminalRestore: TerminalRestoreSettings;
  /** SSH/TELNET 저장 서버 목록 */
  remoteTerminals: RemoteTerminalSettings;
  /** FTP/FTPS/SFTP 저장 서버 목록 */
  remoteFiles: RemoteFileSettings;
  /** 앱 창 크기/위치 프리셋 */
  windowSizer: WindowSizerSettings;
  /** 마지막 메인 창 크기/위치. null이면 기본 크기로 시작 */
  mainWindowBounds: WindowBounds | null;
  /** 로컬 확장/플러그인 설정 */
  extensions: ExtensionSettings;
  /** 로컬 비밀정보 저장소 설정 */
  secretVault: SecretVaultSettings;
  /** 워크스페이스 파일 설정 */
  workspace: WorkspaceSettings;
  /** 공개판/첫 실행 온보딩 표시 상태 */
  onboarding: OnboardingSettings;
  /** 자동 업데이트 채널 설정 */
  updater: UpdaterSettings;
}

export interface SettingsBackupFile {
  kind: 'xenesis-desk-settings';
  version: 1;
  appVersion: string;
  exportedAt: string;
  includesSecrets: boolean;
  settings: AppSettings;
}

export interface SettingsExportResult {
  saved: boolean;
  path?: string;
}

export interface SettingsBackupListItem {
  path: string;
  fileName: string;
  exportedAt: string;
  appVersion: string;
  includesSecrets: boolean;
  size: number;
}

export interface SettingsImportResult {
  imported: boolean;
  path?: string;
  previousBackupPath?: string;
  settings: AppSettings;
}

/** 내부 서버 상태 */
export interface ServerStatus {
  running: boolean;
  port: number;
  pid?: number;
}

/** 내부 서버 IPC API */
export interface ServerApi {
  start(): Promise<ServerStatus>;
  stop(): Promise<ServerStatus>;
  status(): Promise<ServerStatus>;
}

export interface XamongCodeServerStatus {
  running: boolean;
  host: string;
  port: number;
  url: string;
  runtimePath: string;
  configDir: string;
  workspacesConfigPath: string;
  openAiModel: string;
  directGeneralChat: boolean;
  directChatModel: string;
  workerTierPolicies: string;
  hasOpenAiApiKey: boolean;
  managed: boolean;
  pid?: number;
  error?: string;
}

export interface XamongCodeApi {
  start(): Promise<XamongCodeServerStatus>;
  stop(): Promise<XamongCodeServerStatus>;
  status(): Promise<XamongCodeServerStatus>;
}

export interface XenesisStatus {
  ok: boolean;
  running: boolean;
  managed: boolean;
  enabled: boolean;
  runtimeMode: XenesisRuntimeMode;
  url: string;
  pid?: number;
  runtimePath: string;
  xenesisHome: string;
  workspace: string;
  providerRuntime: XenesisProviderRuntimeStatus;
  error: string;
  updatedAt: string;
  gateway: XenesisGatewayStatus;
  profile: XenesisProfileState;
}

export type XenesisReportKind = 'smoke' | 'scenario' | 'connect' | 'provider-live';
export type XenesisReportStatus = 'passed' | 'failed';

export interface XenesisReportQuery {
  kind?: XenesisReportKind;
  status?: XenesisReportStatus;
  limit?: number;
}

export interface XenesisReportSummary {
  kind: XenesisReportKind;
  id: string;
  createdAt: string;
  exitCode: number;
  passed: number;
  failed: number;
  total: number;
}

export type XenesisTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'blocked';

export interface XenesisTaskQuery {
  status?: XenesisTaskStatus;
  taskId?: string;
  label?: string;
  handoffId?: string;
  handoffTitle?: string;
  source?: string;
  subagent?: string;
  limit?: number;
}

export interface XenesisTaskSummary {
  id: string;
  status: XenesisTaskStatus | string;
  prompt: string;
  sessionId?: string;
  parentSessionId?: string;
  source?: string;
  subagent?: string;
  label?: string;
  handoffId?: string;
  handoffTitle?: string;
  blockedReason?: string;
  attempts?: number;
  error?: string;
  output?: string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
}

export interface XenesisOperationalDiagnostics {
  updatedAt: string;
  xenesisHome: string;
  workspace: string;
  status: XenesisStatus;
  reports: {
    summary: {
      total: number;
      passed: number;
      failed: number;
    };
    reports: XenesisReportSummary[];
  };
  tasks: {
    summary: Record<XenesisTaskStatus, number> & { total: number };
    tasks: XenesisTaskSummary[];
  };
}

export type XenesisGatewayChannelName = 'telegram' | 'slack' | 'discord' | 'webhook';
export type XenesisGatewayChannelRuntimeStatus = 'disabled' | 'blocked' | 'ready' | 'error';

export interface XenesisGatewayChannelRuntimeIssue {
  at: string;
  message: string;
}

export interface XenesisGatewayChannelStatus {
  name: XenesisGatewayChannelName;
  enabled: boolean;
  ready: boolean;
  runtimeStatus: XenesisGatewayChannelRuntimeStatus;
  missingEnv: string[];
  warnings: string[];
  safeToDeliver: boolean;
  approvalMode: string;
  maxTurns: number;
  maxTokens: number;
  lastError?: XenesisGatewayChannelRuntimeIssue;
}

export interface XenesisGatewayChannelsStatus {
  total: number;
  enabled: number;
  ready: number;
  blocked: number;
  disabled: number;
  items: XenesisGatewayChannelStatus[];
  telegram?: XenesisGatewayChannelStatus;
  slack?: XenesisGatewayChannelStatus;
  discord?: XenesisGatewayChannelStatus;
  webhook?: XenesisGatewayChannelStatus;
}

export interface XenesisGatewayStatus {
  enabled: boolean;
  running: boolean;
  managed: boolean;
  url: string;
  pid?: number;
  host: string;
  port: number;
  workspace: string;
  error: string;
  updatedAt: string;
  channels?: XenesisGatewayChannelsStatus;
}

export interface XenesisRunAttachment {
  kind: 'image' | 'file';
  name: string;
  mimeType?: string;
  size?: number;
  path?: string;
  dataUrl?: string;
  text?: string;
}

export interface XenesisRunRequest {
  prompt: string;
  attachments?: XenesisRunAttachment[];
  workspace?: string;
  mode?: 'chat' | 'plan' | 'work';
  workflow?: string;
  source?: string;
  sessionId?: string;
  historyMessages?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  provider?: string;
  providerProfile?: string;
  profile?: string;
  model?: string;
  stream?: boolean;
  baseURL?: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  context?: Record<string, unknown>;
}

export interface XenesisRunEvent {
  event: string;
  data: unknown;
}

export interface XenesisToolPolicyIssue {
  toolCallId?: string;
  name: string;
  policyName: string;
  reason: string;
  nextAction?: string;
  requiredBefore: string[];
  missingBefore: string[];
  priorityTools: string[];
}

export interface XenesisToolPolicySummary {
  policyName: string;
  priorityTools: string[];
  requiredBefore: Record<string, string[]>;
  requiredBeforeAny: Record<string, string[]>;
  allowCount?: number;
  denyCount?: number;
  nextActions?: string[];
}

export interface XenesisRunResult {
  ok: boolean;
  id?: string;
  traceId?: string;
  sessionId?: string;
  exitCode?: number;
  events?: unknown[];
  artifacts?: McpBridgeBotArtifact[];
  profile?: string;
  profilePolicy?: XenesisProfilePolicyState;
  output?: string;
  doneContent?: string;
  errors?: string;
  error?: string;
  toolPolicy?: XenesisToolPolicySummary;
  toolPolicyIssues?: XenesisToolPolicyIssue[];
  diagnostics?: {
    toolPolicyIssues?: XenesisToolPolicyIssue[];
  };
}

export interface XenesisApi {
  status(): Promise<XenesisStatus>;
  setWorkspace(path: string): Promise<XenesisStatus>;
  profiles(): Promise<XenesisProfileState>;
  installProfile(request: XenesisProfileInstallRequest): Promise<XenesisProfileState>;
  useProfile(name: string): Promise<XenesisProfileState>;
  updateProfileChannels(request: XenesisProfileChannelsUpdateRequest): Promise<XenesisProfileState>;
  testProfileChannel(request: XenesisProfileChannelTestRequest): Promise<XenesisProfileChannelTestResult>;
  reports(query?: XenesisReportQuery): Promise<{ reports: XenesisReportSummary[] }>;
  tasks(query?: XenesisTaskQuery): Promise<{ tasks: XenesisTaskSummary[] }>;
  diagnostics(): Promise<XenesisOperationalDiagnostics>;
  gatewayStatus(): Promise<XenesisStatus>;
  gatewayStart(): Promise<XenesisStatus>;
  gatewayStop(): Promise<XenesisStatus>;
  gatewayRestart(): Promise<XenesisStatus>;
  gatewayOpenDashboard(): Promise<XenesisStatus>;
  connectionsStatus(): Promise<XenesisConnectionsStatus>;
  start(): Promise<XenesisStatus>;
  stop(): Promise<XenesisStatus>;
  restart(): Promise<XenesisStatus>;
  cancel(): Promise<XenesisStatus>;
  resetSession(): Promise<XenesisStatus>;
  run(request: XenesisRunRequest): Promise<XenesisRunResult>;
  onRunEvent(callback: (event: XenesisRunEvent) => void): () => void;
}

export interface LocalCliApi {
  scan(): Promise<LocalCliAgentStatus[]>;
}

export type ProviderIntegrationCliTargetId = 'codex' | 'claude' | 'cursor';

export interface ProviderIntegrationCliTargetStatus {
  id: ProviderIntegrationCliTargetId;
  label: string;
  configType: 'codex-toml' | 'json-mcp';
  supportsMcp: boolean;
  supportsSkill: boolean;
  mcpConfigPath: string;
  skillPath: string;
  mcpInstalled: boolean;
  skillInstalled: boolean;
}

export interface ProviderIntegrationHermesPluginStatus {
  id: string;
  label: string;
  sourcePath: string;
  destinationPath: string;
  sourceAvailable: boolean;
  installed: boolean;
}

export interface ProviderIntegrationHermesStatus {
  assetRoot: string;
  hermesRoot: string;
  assetAvailable: boolean;
  rootConfigured: boolean;
  pluginsInstalled: boolean;
  items: ProviderIntegrationHermesPluginStatus[];
}

export interface ProviderIntegrationStatus {
  cliTargets: ProviderIntegrationCliTargetStatus[];
  hermes: ProviderIntegrationHermesStatus;
}

export interface ProviderIntegrationStatusRequest {
  hermesRoot?: string;
}

export interface ProviderIntegrationCliInstallRequest {
  targetId: ProviderIntegrationCliTargetId;
  installMcp?: boolean;
  installSkill?: boolean;
}

export interface ProviderIntegrationInstallChange {
  kind: 'mcp' | 'skill';
  path: string;
  changed: boolean;
  backupPath?: string;
}

export interface ProviderIntegrationCliInstallResult {
  ok: boolean;
  target?: ProviderIntegrationCliTargetStatus;
  changes?: ProviderIntegrationInstallChange[];
  error?: string;
}

export interface ProviderIntegrationHermesInstallRequest {
  hermesRoot: string;
}

export interface ProviderIntegrationHermesInstallResult {
  ok: boolean;
  hermesRoot?: string;
  installed?: Array<{
    id: string;
    label: string;
    sourcePath: string;
    destinationPath: string;
  }>;
  error?: string;
}

export interface ProviderIntegrationApi {
  status(request?: ProviderIntegrationStatusRequest): Promise<ProviderIntegrationStatus>;
  installCliIntegration(request: ProviderIntegrationCliInstallRequest): Promise<ProviderIntegrationCliInstallResult>;
  installHermesPlugins(
    request: ProviderIntegrationHermesInstallRequest,
  ): Promise<ProviderIntegrationHermesInstallResult>;
}

export interface McpBridgeOpenFilePayload {
  filePath: string;
  placement?: ExtensionPanelPlacement;
  targetPaneId?: string;
  renderOptions?: RenderOptions;
}

export interface McpBridgeOpenBrowserPayload {
  url?: string;
  placement?: ExtensionPanelPlacement;
  targetPaneId?: string;
}

export type McpBridgeOpenBuiltinPaneKind = 'settings' | 'diagnostics' | 'onboarding';

export interface McpBridgeOpenBuiltinPanePayload {
  requestId?: string;
  kind: McpBridgeOpenBuiltinPaneKind;
  placement?: ExtensionPanelPlacement;
  targetPaneId?: string;
  category?: string;
  mode?: string;
  section?: string;
  focusConnectionId?: string;
  ensureVisible?: boolean;
}

export interface McpBridgeOpenBuiltinPaneResult {
  requestId: string;
  kind: McpBridgeOpenBuiltinPaneKind;
  ok: boolean;
  placement?: ExtensionPanelPlacement;
  targetPaneId?: string;
  category?: string;
  mode?: string;
  section?: string;
  focusConnectionId?: string;
  ensureVisible?: boolean;
  message?: string;
  error?: string;
}

export interface McpBridgeOnboardingStepActionPayload {
  requestId: string;
  action: 'run' | 'verify';
  stepId: string;
  sampleWorkspacePath?: string;
}

export interface McpBridgeOnboardingStepActionResult {
  requestId: string;
  action: McpBridgeOnboardingStepActionPayload['action'];
  stepId: string;
  ok: boolean;
  ran?: boolean;
  verified?: boolean;
  passed?: boolean;
  message?: string;
  sampleWorkspacePath?: string;
  error?: string;
}

export interface McpBridgeOnboardingScenarioRunPayload {
  requestId: string;
  trackId: 'basic-desk';
  sampleWorkspacePath?: string;
  prepareSample?: boolean;
  resetSample?: boolean;
  stopOnFailure?: boolean;
  delayMs?: number;
  capture?: boolean;
  caption?: boolean;
  artifactDir?: string;
}

export interface McpBridgeOnboardingScenarioStepResult {
  stepId: string;
  index: number;
  total: number;
  ok: boolean;
  ran: boolean;
  verified: boolean;
  passed: boolean;
  message?: string;
  caption?: string;
  capture?: CapturePaneResult;
  screenshotPath?: string;
  screenshotFileName?: string;
  error?: string;
}

export interface McpBridgeOnboardingScenarioRunResult {
  requestId: string;
  trackId: McpBridgeOnboardingScenarioRunPayload['trackId'];
  ok: boolean;
  completed: boolean;
  stoppedAtStepId?: string;
  sampleWorkspacePath?: string;
  steps: McpBridgeOnboardingScenarioStepResult[];
  artifact?: OnboardingRunArtifact;
  error?: string;
}

export interface McpBridgeOnboardingRunPreviewPayload {
  requestId: string;
  runId?: string;
  ensureVisible?: boolean;
  capture?: boolean;
}

export interface McpBridgeOnboardingRunPreviewResult {
  requestId: string;
  ok: boolean;
  runId?: string;
  selected?: boolean;
  artifact?: OnboardingRunArtifact;
  capture?: CapturePaneResult;
  error?: string;
}

export interface McpBridgeOnboardingDemoModeRunPayload {
  requestId: string;
  ensureVisible?: boolean;
  capture?: boolean;
  openPlayer?: boolean;
}

export interface McpBridgeOnboardingDemoModeUiSnapshot {
  mode: 'demo' | 'learn';
  statusText?: string;
  failureText?: string;
  scenarioSummary?: string;
  runArtifactCount: number;
  selectedRunId?: string;
  demoRouteRunId?: string;
  sceneCount: number;
  routeViewerVisible: boolean;
  runViewerVisible: boolean;
  storyboardActionVisible: boolean;
  playerActionVisible: boolean;
}

export interface McpBridgeOnboardingDemoModeRunResult {
  requestId: string;
  ok: boolean;
  completed?: boolean;
  scenario?: McpBridgeOnboardingScenarioRunResult;
  demoRouteSave?: OnboardingDemoRouteSaveResult;
  ui?: McpBridgeOnboardingDemoModeUiSnapshot;
  capture?: CapturePaneResult;
  playerOpen?: OnboardingDemoRouteOpenResult;
  error?: string;
}

export interface McpBridgeExtensionActionsPayload {
  commandId?: string;
  actions: ExtensionHostAction[];
}

export interface McpBridgeTerminalMetadata {
  kind?: string;
  subagentId?: string;
  parentTermId?: string;
  agent?: string;
  task?: string;
  command?: string;
}

export interface McpBridgeOpenTerminalPayload {
  id: string;
  title: string;
  shell: ShellKind;
  command: string;
  cwd: string;
  pid: number;
  metadata?: McpBridgeTerminalMetadata;
  placement?: ExtensionPanelPlacement;
  targetPaneId?: string;
}

export interface McpBridgeDockActionPayload {
  requestId: string;
  action:
    | 'focus'
    | 'move'
    | 'close'
    | 'closeOthers'
    | 'closeRight'
    | 'closeAll'
    | 'arrangeGroup'
    | 'mergeGroup'
    | 'arrangeWindow'
    | 'mergeWindow'
    | 'mergeAll'
    | 'readArtifactTarget'
    | 'setArtifactTarget'
    | 'readSizes'
    | 'setSizes'
    | 'setPaneSize';
  mode?: 'row' | 'column' | 'grid';
  contentId?: string;
  paneId?: string;
  targetPaneId?: string;
  windowState?: WindowState;
  clear?: boolean;
  useActive?: boolean;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  widthPercent?: number;
  heightPercent?: number;
}

export interface McpBridgeDockSizes {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface McpBridgeDockActionResult {
  requestId: string;
  action: McpBridgeDockActionPayload['action'];
  mode?: McpBridgeDockActionPayload['mode'];
  ok: boolean;
  contentId?: string;
  paneId?: string;
  targetPaneId?: string;
  artifactPaneId?: string | null;
  activePaneId?: string | null;
  isArtifactTarget?: boolean;
  focusedContentId?: string;
  focusedPaneId?: string;
  closedContentIds?: string[];
  closedTerminalIds?: string[];
  sizes?: McpBridgeDockSizes;
  widthPercent?: number;
  heightPercent?: number;
  message?: string;
  error?: string;
}

export interface McpBridgeBrowserActionPayload {
  requestId: string;
  action:
    | 'navigate'
    | 'back'
    | 'forward'
    | 'reload'
    | 'stop'
    | 'state'
    | 'textSnapshot'
    | 'domSnapshot'
    | 'elementAction';
  contentId?: string;
  paneId?: string;
  url?: string;
  elementAction?: 'fill' | 'click' | 'select' | 'press';
  selector?: string;
  text?: string;
  value?: string;
  key?: string;
  maxChars?: number;
  maxLinks?: number;
  maxNodes?: number;
  maxTextChars?: number;
}

export interface McpBridgeBrowserActionResult {
  requestId: string;
  action: McpBridgeBrowserActionPayload['action'];
  ok: boolean;
  contentId?: string;
  paneId?: string;
  url?: string;
  loading?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  title?: string;
  text?: string;
  links?: Array<{ text?: string; href?: string }>;
  forms?: unknown[];
  dom?: unknown;
  elementAction?: unknown;
  snapshot?: unknown;
  error?: string;
}

export interface McpBridgeExplorerActionPayload {
  requestId: string;
  action:
    | 'show'
    | 'hide'
    | 'toggle'
    | 'navigate'
    | 'refresh'
    | 'goUp'
    | 'setFilter'
    | 'clearFilter'
    | 'selectPath'
    | 'openSelected'
    | 'previewSelected'
    | 'togglePreview'
    | 'toggleDetails'
    | 'sendSelectedToBot'
    | 'addSelectedToContext'
    | 'copySelectedPath'
    | 'addSelectedToFavorites'
    | 'openSelectedInTerminal'
    | 'openSelectedSafeEdit'
    | 'openSelectedSyncPlanner';
  path?: string;
  selectPath?: string;
  query?: string;
  shell?: ShellKind;
}

export interface McpBridgeExplorerActionResult {
  requestId: string;
  action: McpBridgeExplorerActionPayload['action'];
  ok: boolean;
  explorerOpen?: boolean;
  rootDir?: string;
  selectPath?: string;
  query?: string;
  message?: string;
  error?: string;
}

export interface McpBridgeRemoteExplorerActionPayload {
  requestId: string;
  action:
    | 'show'
    | 'navigate'
    | 'refresh'
    | 'goUp'
    | 'setFilter'
    | 'clearFilter'
    | 'selectPath'
    | 'openSelected'
    | 'previewSelected'
    | 'togglePreview'
    | 'toggleDetails'
    | 'sendSelectedToBot'
    | 'addSelectedToContext'
    | 'copySelectedPath'
    | 'openSelectedSyncPlanner';
  profileId?: string;
  path?: string;
  selectPath?: string;
  query?: string;
}

export interface McpBridgeRemoteExplorerActionResult {
  requestId: string;
  action: McpBridgeRemoteExplorerActionPayload['action'];
  ok: boolean;
  remoteExplorerOpen?: boolean;
  profileId?: string;
  path?: string;
  selectPath?: string;
  query?: string;
  message?: string;
  error?: string;
}

export interface McpBridgeTerminalUiActionPayload {
  requestId: string;
  action:
    | 'copy'
    | 'paste'
    | 'selectAll'
    | 'clearScreen'
    | 'clearScrollback'
    | 'scrollTop'
    | 'scrollBottom'
    | 'setFitLock'
    | 'toggleFitLock'
    | 'findNext'
    | 'findPrev'
    | 'saveLog'
    | 'sendSelectionToBot'
    | 'sendRecentOutputToBot';
  termId?: string;
  query?: string;
  locked?: boolean;
}

export interface McpBridgeTerminalUiActionResult {
  requestId: string;
  action: McpBridgeTerminalUiActionPayload['action'];
  ok: boolean;
  termId?: string;
  query?: string;
  locked?: boolean;
  message?: string;
  error?: string;
}

export interface McpBridgeFavoritesActionPayload {
  requestId: string;
  action: 'list' | 'add' | 'addCurrentTab' | 'remove' | 'open' | 'openInTerminal' | 'copyPath' | 'showTab';
  id?: string;
  kind?: 'file' | 'folder' | 'url' | 'terminal-path';
  path?: string;
  label?: string;
  shell?: ShellKind;
  tab?: 'favorites' | 'captures' | 'remote-files';
}

export interface McpBridgeFavoritesActionResult {
  requestId: string;
  action: McpBridgeFavoritesActionPayload['action'];
  ok: boolean;
  id?: string;
  path?: string;
  tab?: McpBridgeFavoritesActionPayload['tab'];
  items?: Array<{
    id: string;
    kind: McpBridgeFavoritesActionPayload['kind'];
    path: string;
    label: string;
    addedAt: number;
  }>;
  message?: string;
  error?: string;
}

export interface McpBridgeGowooriChatRunPayload {
  requestId: string;
  prompt: string;
  provider?: GowooriChatProviderId;
  requestMode?: 'generate' | 'repair' | 'continue' | 'explain';
  targetMode?: 'new' | 'all' | string;
  targetContentId?: string;
  autoApply?: boolean;
  timeoutMs?: number;
  sportsStandingsEndpoint?: string;
}

export interface McpBridgeGowooriChatDiagnostic {
  severity: 'info' | 'warning' | 'error' | string;
  message: string;
}

export interface McpBridgeGowooriChatRunResult {
  requestId: string;
  ok: boolean;
  prompt: string;
  sourceLength?: number;
  source?: string;
  summary?: string;
  label?: string;
  applied?: boolean;
  targetMode?: string;
  diagnostics?: McpBridgeGowooriChatDiagnostic[];
  autoRepairAttempted?: boolean;
  autoRepairSucceeded?: boolean;
  error?: string;
}

export type McpBridgeGowooriChatRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';

export type McpBridgeGowooriChatRunProgressPhase =
  | 'queued'
  | 'starting'
  | 'spawned'
  | 'sending-prompt'
  | 'waiting'
  | 'receiving-output'
  | 'streaming'
  | 'validating'
  | 'repairing'
  | 'applying'
  | 'completed'
  | 'timeout'
  | 'cancelled'
  | 'error';

export interface McpBridgeGowooriChatRunProgress {
  requestId: string;
  status: McpBridgeGowooriChatRunStatus;
  phase: McpBridgeGowooriChatRunProgressPhase;
  message: string;
  provider?: GowooriChatProviderId | string;
  prompt?: string;
  elapsedMs?: number;
  receivedBytes?: number;
  sourceLength?: number;
  at: string;
}

export interface McpBridgeGowooriChatCancelPayload {
  requestId: string;
}

export interface McpBridgeGowooriChatCancelResult {
  requestId: string;
  ok: boolean;
  status?: McpBridgeGowooriChatRunStatus;
  message?: string;
  error?: string;
}

export interface McpBridgeGowooriChatAsyncRunSnapshot {
  requestId: string;
  ok: boolean;
  status: McpBridgeGowooriChatRunStatus;
  prompt: string;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: McpBridgeGowooriChatRunProgress[];
  result?: McpBridgeGowooriChatRunResult;
  error?: string;
}

export interface McpBridgeGowooriArtifactVisibilityPayload {
  requestId: string;
  paneId?: string;
  contentId?: string;
  preferArtifactPane?: boolean;
  components?: string[];
  reveal?: boolean;
}

export interface McpBridgeGowooriArtifactComponentVisibility {
  component: string;
  selector: string;
  present: boolean;
  visible: boolean;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  visibleRatio?: number;
  viewport?: {
    width: number;
    height: number;
  };
  error?: string;
}

export interface McpBridgeGowooriArtifactVisibilityResult {
  requestId: string;
  ok: boolean;
  paneId?: string;
  contentId?: string;
  components: McpBridgeGowooriArtifactComponentVisibility[];
  error?: string;
}

export interface McpBridgeGowooriOverlayPayload {
  requestId: string;
  id?: string;
  title?: string;
  label?: string;
  source?: string;
  zoom?: number;
  contentId?: string;
}

export interface McpBridgeGowooriOverlayResult {
  requestId: string;
  ok: boolean;
  visible: boolean;
  id?: string;
  title?: string;
  label?: string;
  sourceLength?: number;
  contentId?: string;
  error?: string;
}

export interface McpBridgeRendererPaneSnapshot {
  id: string;
  state: string;
  activeContentId?: string | null;
  contents: string[];
  group?: string | null;
  isArtifactTarget?: boolean;
}

export interface McpBridgeRendererContentSnapshot {
  id: string;
  title: string;
  contentType: DockContentType;
  paneId?: string;
  state?: string;
  filePath?: string;
  fileName?: string;
  fileExt?: string;
  fileOrigin?: 'local' | 'remote';
  remoteFilePath?: string;
  termId?: string;
  terminalMetadata?: McpBridgeTerminalMetadata;
  terminalImageAddonLoaded?: boolean;
  terminalImageAddonUnavailableReason?: string;
  url?: string;
  renderOptions?: RenderOptions;
}

export interface McpBridgeRendererOpenFileSnapshot {
  contentId: string;
  paneId?: string;
  filePath: string;
  fileName?: string;
  fileExt?: string;
  fileOrigin?: 'local' | 'remote';
  remoteFilePath?: string;
  state?: string;
  title?: string;
}

export interface McpBridgeRendererPanelSnapshot {
  contentId: string;
  paneId?: string;
  title: string;
  state?: string;
}

export interface McpBridgeRendererWorkspaceSnapshot {
  currentPath: string;
  profilePath?: string;
  autoRestore?: boolean;
}

export interface McpBridgeRendererExplorerSnapshot {
  open: boolean;
  rootDir: string;
  selectedPath?: string;
  selectedIsDir?: boolean;
}

export interface McpBridgeRendererPerformanceTraceEntry {
  scope: string;
  action: string;
  durationMs?: number;
  at?: number;
  timestamp?: string;
  details?: Record<string, unknown>;
}

export interface McpBridgeRendererPerformanceTraceSummaryItem {
  scope: string;
  action: string;
  count: number;
  averageDurationMs: number;
  maxDurationMs: number;
  totalDurationMs: number;
}

export interface McpBridgeRendererPerformanceTraceSnapshot {
  enabled: boolean;
  setting: string;
  itemCount: number;
  recent: McpBridgeRendererPerformanceTraceEntry[];
  summary: McpBridgeRendererPerformanceTraceSummaryItem[];
}

export interface McpBridgeRendererPerformanceTraceRequest {
  requestId: string;
  enabled?: boolean;
  setting?: string;
  clear?: boolean;
}

export interface McpBridgeRendererPerformanceTraceResult extends McpBridgeRendererPerformanceTraceSnapshot {
  requestId: string;
  ok: boolean;
  error?: string;
}

export interface McpBridgeRendererStateSnapshot {
  reportedAt: string;
  activePaneId?: string | null;
  artifactPaneId?: string | null;
  panes: McpBridgeRendererPaneSnapshot[];
  contents: McpBridgeRendererContentSnapshot[];
  openFiles: McpBridgeRendererOpenFileSnapshot[];
  panels: McpBridgeRendererPanelSnapshot[];
  workspace?: McpBridgeRendererWorkspaceSnapshot;
  explorer?: McpBridgeRendererExplorerSnapshot;
  performanceTrace?: McpBridgeRendererPerformanceTraceSnapshot;
}

export type McpBridgeBotEventType = 'session' | 'message' | 'stream' | 'final' | 'status' | 'error';
export type McpBridgeBotRole = 'user' | 'assistant' | 'system';
export type McpBridgeBotChannelName =
  | 'hermes'
  | 'telegram'
  | 'slack'
  | 'discord'
  | 'webhook'
  | 'agent'
  | 'server'
  | 'external';

export interface McpBridgeBotApprovalUi {
  title?: string;
  subjectLabel?: string;
  reasonLabel?: string;
  choices?: string[];
  buttonLabels?: Record<string, string>;
}

export interface McpBridgeBotArtifact {
  title?: string;
  kind?: string;
  filePath?: string;
  openCommand?: string;
  focusCommand?: string;
}

export interface McpBridgeBotXenisMetadata {
  surface?: string;
  mode?: string;
  sourceMessageId?: string;
  packetCommand?: string;
  workPacketItemCount?: number;
  artifactAction?: string;
  artifactTitle?: string;
  artifactPath?: string;
  artifactFormats?: string[];
}

export interface McpBridgeBotEvent {
  type: McpBridgeBotEventType;
  sessionId: string;
  messageId: string;
  role: McpBridgeBotRole;
  delta: string;
  content: string;
  title: string;
  source: string;
  channel?: McpBridgeBotChannelName;
  status: string;
  inputUrl: string;
  placement?: ExtensionPanelPlacement;
  approvalUi?: McpBridgeBotApprovalUi;
  artifacts?: McpBridgeBotArtifact[];
  xenesis_desk?: McpBridgeBotXenisMetadata;
  at: string;
}

export interface McpBridgeBotMessage {
  id: string;
  role: McpBridgeBotRole;
  content: string;
  approvalUi?: McpBridgeBotApprovalUi;
  artifacts?: McpBridgeBotArtifact[];
  xenesis_desk?: McpBridgeBotXenisMetadata;
  streaming: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface McpBridgeBotSession {
  id: string;
  title: string;
  source: string;
  channel?: McpBridgeBotChannelName;
  status: string;
  inputUrl: string;
  updatedAt: string;
  messages: McpBridgeBotMessage[];
}

export interface McpBridgeBotSessionSaveResult {
  ok: boolean;
  error?: string;
}

export interface McpBridgeStatus {
  ok: boolean;
  generatedAt: string;
  bridge: {
    bridgeUrl: string;
    bridgeStatePath: string;
    configFilePath: string;
    serverPath: string;
    available: boolean;
    tokenPresent: boolean;
  };
  app: {
    name: string;
    version: string;
    packaged: boolean;
    platform: string;
    arch: string;
    windowCount: number;
    targetWindowId: number | null;
  };
  rendererState: McpBridgeRendererStateSnapshot | null;
  panels: unknown[];
  openFiles: unknown[];
  botSessions: McpBridgeBotSession[];
  botInputUrl: string;
  actionInbox: McpBridgeActionInboxItem[];
  bridgePanels: unknown[];
  bridgeOpenFiles: unknown[];
  diagnostics: DiagnosticsLogEntry[];
}

export type McpBridgeActionInboxStatus = 'pending' | 'approved' | 'rejected' | 'failed' | 'expired';
export type McpBridgeActionInboxResolution = 'approve' | 'reject';

export interface McpBridgeActionInboxItem {
  id: string;
  title: string;
  kind: string;
  command: string;
  description: string;
  source: string;
  sessionId: string;
  approvalSessionKey: string;
  requester: string;
  risk: string;
  status: McpBridgeActionInboxStatus;
  callbackUrl: string;
  approveText: string;
  rejectText: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  resolvedAt: string;
  lastCallbackAt: string;
  result: string;
  error: string;
}

export interface McpBridgeActionInboxResolveRequest {
  id: string;
  resolution: McpBridgeActionInboxResolution;
  note?: string;
  scope?: 'once' | 'always';
  createdAt?: string;
}

export interface McpBridgeActionInboxResolveResult {
  ok: boolean;
  item?: McpBridgeActionInboxItem;
  error?: string;
}

export interface McpBridgeCapabilityCallRequest {
  path: string;
  args?: unknown;
  source?: 'internal' | 'mcp' | 'gowoori' | 'workflow' | 'xenesis';
  approved?: boolean;
}

export interface McpBridgeCapabilityCallResult {
  ok: boolean;
  path: string;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: string;
  approval?: string;
  source?: string;
  message?: string;
  actionInboxItem?: McpBridgeActionInboxItem;
  approvalResolution?: 'pre-approved' | 'auto-approved' | 'not-required';
}

export interface McpBridgeCapabilityApprovalRememberEntry {
  path: string;
  args?: unknown;
  source?: 'internal' | 'mcp' | 'gowoori' | 'workflow' | 'xenesis';
}

export interface McpBridgeCapabilityApprovalRememberResult {
  ok: boolean;
  count: number;
  error?: string;
}

export interface McpBridgeCaptureActivePanePayload {
  requestId: string;
  paneId?: string;
  contentId?: string;
  preferArtifactPane?: boolean;
}

export interface McpBridgeCaptureActivePaneTarget {
  paneId: string;
  contentId: string;
  title: string;
  contentType: DockContentType | string;
}

export interface McpBridgeCaptureActivePaneResult {
  requestId: string;
  ok: boolean;
  target?: McpBridgeCaptureActivePaneTarget;
  artifact?: CapturePaneResult;
  error?: string;
}

export interface McpBridgeApi {
  status(): Promise<McpBridgeStatus>;
  listActionInbox(): Promise<McpBridgeActionInboxItem[]>;
  resolveActionInboxItem(request: McpBridgeActionInboxResolveRequest): Promise<McpBridgeActionInboxResolveResult>;
  callCapability(request: McpBridgeCapabilityCallRequest): Promise<McpBridgeCapabilityCallResult>;
  rememberCapabilityApprovals(
    entries: McpBridgeCapabilityApprovalRememberEntry[],
  ): Promise<McpBridgeCapabilityApprovalRememberResult>;
  listBotSessions(): Promise<McpBridgeBotSession[]>;
  saveBotSession(session: McpBridgeBotSession): Promise<McpBridgeBotSessionSaveResult>;
  onActionInboxChanged(callback: (items: McpBridgeActionInboxItem[]) => void): () => void;
  onOpenFile(callback: (payload: McpBridgeOpenFilePayload) => void): () => void;
  onOpenBrowser(callback: (payload: McpBridgeOpenBrowserPayload) => void): () => void;
  onOpenBuiltinPane(
    callback: (
      payload: McpBridgeOpenBuiltinPanePayload,
    ) => McpBridgeOpenBuiltinPaneResult | Promise<McpBridgeOpenBuiltinPaneResult>,
  ): () => void;
  onOnboardingStepAction(
    callback: (
      payload: McpBridgeOnboardingStepActionPayload,
    ) => McpBridgeOnboardingStepActionResult | Promise<McpBridgeOnboardingStepActionResult>,
  ): () => void;
  onOnboardingScenarioRun(
    callback: (
      payload: McpBridgeOnboardingScenarioRunPayload,
    ) => McpBridgeOnboardingScenarioRunResult | Promise<McpBridgeOnboardingScenarioRunResult>,
  ): () => void;
  onOnboardingRunPreview(
    callback: (
      payload: McpBridgeOnboardingRunPreviewPayload,
    ) => McpBridgeOnboardingRunPreviewResult | Promise<McpBridgeOnboardingRunPreviewResult>,
  ): () => void;
  onOnboardingDemoModeRun(
    callback: (
      payload: McpBridgeOnboardingDemoModeRunPayload,
    ) => McpBridgeOnboardingDemoModeRunResult | Promise<McpBridgeOnboardingDemoModeRunResult>,
  ): () => void;
  onDemoLabPlaybackControl(
    callback: (
      payload: McpBridgeDemoLabPlaybackControlPayload,
    ) => McpBridgeDemoLabPlaybackControlResult | Promise<McpBridgeDemoLabPlaybackControlResult>,
  ): () => void;
  onExtensionActions(callback: (payload: McpBridgeExtensionActionsPayload) => void): () => void;
  onOpenTerminal(callback: (payload: McpBridgeOpenTerminalPayload) => void): () => void;
  onBotEvent(callback: (payload: McpBridgeBotEvent) => void): () => void;
  onDockAction(
    callback: (payload: McpBridgeDockActionPayload) => McpBridgeDockActionResult | Promise<McpBridgeDockActionResult>,
  ): () => void;
  onBrowserAction(
    callback: (
      payload: McpBridgeBrowserActionPayload,
    ) => McpBridgeBrowserActionResult | Promise<McpBridgeBrowserActionResult>,
  ): () => void;
  reportBrowserActionResult(result: McpBridgeBrowserActionResult): Promise<void>;
  onExplorerAction(
    callback: (
      payload: McpBridgeExplorerActionPayload,
    ) => McpBridgeExplorerActionResult | Promise<McpBridgeExplorerActionResult>,
  ): () => void;
  reportExplorerActionResult(result: McpBridgeExplorerActionResult): Promise<void>;
  onRemoteExplorerAction(
    callback: (
      payload: McpBridgeRemoteExplorerActionPayload,
    ) => McpBridgeRemoteExplorerActionResult | Promise<McpBridgeRemoteExplorerActionResult>,
  ): () => void;
  reportRemoteExplorerActionResult(result: McpBridgeRemoteExplorerActionResult): Promise<void>;
  onTerminalUiAction(
    callback: (
      payload: McpBridgeTerminalUiActionPayload,
    ) => McpBridgeTerminalUiActionResult | Promise<McpBridgeTerminalUiActionResult>,
  ): () => void;
  reportTerminalUiActionResult(result: McpBridgeTerminalUiActionResult): Promise<void>;
  onFavoritesAction(
    callback: (
      payload: McpBridgeFavoritesActionPayload,
    ) => McpBridgeFavoritesActionResult | Promise<McpBridgeFavoritesActionResult>,
  ): () => void;
  reportFavoritesActionResult(result: McpBridgeFavoritesActionResult): Promise<void>;
  onRendererPerformanceTrace(
    callback: (
      payload: McpBridgeRendererPerformanceTraceRequest,
    ) => McpBridgeRendererPerformanceTraceResult | Promise<McpBridgeRendererPerformanceTraceResult>,
  ): () => void;
  reportRendererPerformanceTraceResult(result: McpBridgeRendererPerformanceTraceResult): Promise<void>;
  onCaptureActivePane(
    callback: (
      payload: McpBridgeCaptureActivePanePayload,
    ) => McpBridgeCaptureActivePaneResult | Promise<McpBridgeCaptureActivePaneResult>,
  ): () => void;
  reportCaptureActivePaneResult(result: McpBridgeCaptureActivePaneResult): Promise<void>;
  onGowooriChatRun(callback: (payload: McpBridgeGowooriChatRunPayload) => void): () => void;
  onGowooriChatRunCancel(callback: (payload: McpBridgeGowooriChatCancelPayload) => void): () => void;
  onGowooriArtifactVisibility(
    callback: (
      payload: McpBridgeGowooriArtifactVisibilityPayload,
    ) => McpBridgeGowooriArtifactVisibilityResult | Promise<McpBridgeGowooriArtifactVisibilityResult>,
  ): () => void;
  reportGowooriArtifactVisibilityResult(result: McpBridgeGowooriArtifactVisibilityResult): Promise<void>;
  onGowooriOverlayShow(
    callback: (
      payload: McpBridgeGowooriOverlayPayload,
    ) => McpBridgeGowooriOverlayResult | Promise<McpBridgeGowooriOverlayResult>,
  ): () => void;
  onGowooriOverlayHide(
    callback: (
      payload: McpBridgeGowooriOverlayPayload,
    ) => McpBridgeGowooriOverlayResult | Promise<McpBridgeGowooriOverlayResult>,
  ): () => void;
  onGowooriOverlayStatus(
    callback: (
      payload: McpBridgeGowooriOverlayPayload,
    ) => McpBridgeGowooriOverlayResult | Promise<McpBridgeGowooriOverlayResult>,
  ): () => void;
  reportGowooriOverlayResult(result: McpBridgeGowooriOverlayResult): Promise<void>;
  reportGowooriChatRunProgress(progress: McpBridgeGowooriChatRunProgress): Promise<void>;
  reportGowooriChatRunResult(result: McpBridgeGowooriChatRunResult): Promise<void>;
  reportState(snapshot: McpBridgeRendererStateSnapshot): Promise<void>;
}

/** Internal renderer bridge. MCP remains one external adapter over the same capabilities. */
export interface DeskBridgeApi extends McpBridgeApi {}

export interface McpSettingsStatus {
  available: boolean;
  serverPath: string;
  bridgeUrl: string;
  bridgeStatePath: string;
  configFilePath: string;
}

export interface McpSettingsApi {
  status(): Promise<McpSettingsStatus>;
}

export interface OpenFileResult {
  filePath: string;
  fileName: string;
  /** 텍스트 · Base64 이미지 · Base64 바이너리(hex/document-preview) */
  content: string;
  ext: string;
  contentType: 'markdown' | 'mermaid' | 'code' | 'image' | 'hex' | 'document-preview';
  /** hex 타입일 때 원본 파일 크기 (바이트) — 잘린 경우 totalBytes > content decoded size */
  totalBytes?: number;
}

export interface SaveTextAsFilter {
  name: string;
  extensions: string[];
}

export interface SaveTextAsRequest {
  defaultName: string;
  content: string;
  filters?: SaveTextAsFilter[];
}

export interface SaveTextAsResult {
  saved: boolean;
  path?: string;
}

/** 탭을 새 윈도우로 분리할 때 전달되는 content 직렬화 데이터 */
export interface DetachPayload {
  id: string;
  title: string;
  titleKey?: string;
  titleVars?: Record<string, string | number>;
  html: string;
  contentType: DockContentType;
  /** 터미널 탭 전용: PTY 세션 ID (non-terminal 탭은 undefined) */
  termId?: string;
  terminalRestore?: TerminalSessionSnapshot;
  url?: string;
  filePath?: string;
  fileName?: string;
  fileContent?: string;
  fileExt?: string;
  botSessionId?: string;
  botInputUrl?: string;
  botSource?: string;
  botChannel?: McpBridgeBotChannelName;
}

/** 분리 창 하나의 windowId + 화면 좌표 bounds */
export interface DetachedWindowBounds {
  windowId: number;
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * 현재 창을 제외한 모든 이웃 창(메인 + 다른 분리 창) bounds.
 * 분리 창에서 드래그 시 어느 창 위에 있는지 판별할 때 사용.
 */
export interface SiblingWindowBounds {
  /** 메인 창 bounds. 메인 창이 없거나 파괴된 경우 null */
  mainWindow: { bounds: { x: number; y: number; width: number; height: number } } | null;
  /** 현재 창을 제외한 다른 분리 창 목록 */
  detachedWindows: DetachedWindowBounds[];
}

export interface FileApi {
  openFile(): Promise<OpenFileResult | null>;
  readFile(filePath: string): Promise<OpenFileResult | null>;
  saveText(filePath: string, content: string): Promise<{ saved: boolean }>;
  saveTextAs(request: SaveTextAsRequest): Promise<SaveTextAsResult>;
  /** http/https URL을 OS 기본 브라우저로 열기 */
  openExternal(url: string): Promise<void>;
  /**
   * Electron 29+: File.path 대체 API.
   * contextBridge 를 통해 드롭된 File 객체의 절대 경로를 반환한다.
   * sandbox 설정과 무관하게 동작 (webUtils 사용).
   */
  getPathForFile(file: File): string;
  /** 탭을 새 Electron 윈도우로 분리 */
  detachTab(payload: DetachPayload): Promise<void>;
  /** 분리 창 시작 시 payload 수신 (없으면 null) */
  getDetachPayload(): Promise<DetachPayload | null>;
  /** 분리 창에서 메인 창으로 탭 드래그 시작 알림 */
  reattachStart(): Promise<void>;
  /** 재결합 드래그 취소 알림 */
  reattachCancel(): Promise<void>;
  /** 분리 창 탭을 메인 창으로 전달하고 분리 창 닫기 */
  reattachDrop(payload: DetachPayload): Promise<void>;
  /** 메인 창: 재결합 수신 드롭 타깃 표시 구독 */
  onReattachShowTarget(cb: () => void): () => void;
  /** 메인 창: 재결합 수신 드롭 타깃 숨김 구독 */
  onReattachHideTarget(cb: () => void): () => void;
  /** 메인 창: 재결합된 탭 content payload 수신 구독 */
  onReattachContent(cb: (payload: DetachPayload) => void): () => void;

  // ── 분리 창 간 합치기 (Detached → Detached merge) ─────────────────────────
  /**
   * 메인 창 bounds + 현재 창 제외 다른 분리 창 bounds 반환.
   * 분리 창에서 드래그 시 어느 창 위에 있는지 판별할 때 사용.
   */
  getSiblingWindowBounds(): Promise<SiblingWindowBounds>;
  /**
   * source 분리 창의 탭 payload를 target 분리 창으로 전달.
   * source 창 닫기는 Renderer가 직접 closeSelf()로 처리한다.
   */
  mergeTabToDetached(payload: DetachPayload, targetWindowId: number): Promise<void>;
  /** target 분리 창의 드롭 수신 오버레이 on/off */
  highlightDetachedWindow(targetWindowId: number, show: boolean): Promise<void>;
  /** 분리 창: 다른 분리 창에서 탭이 전달됨 */
  onMergeReceiveTab(cb: (payload: DetachPayload) => void): () => void;
  /** 분리 창: 드롭 수신 오버레이 표시 구독 */
  onMergeShowTarget(cb: () => void): () => void;
  /** 분리 창: 드롭 수신 오버레이 숨김 구독 */
  onMergeHideTarget(cb: () => void): () => void;
  /**
   * 현재 분리 창을 닫는다. 탭이 모두 다른 창으로 이동된 후 Renderer에서 호출.
   * 메인 창에서 호출해도 무시된다.
   */
  closeSelf(): Promise<void>;
  /** 현재 Electron 창 bounds 조회 */
  getCurrentWindowBounds(): Promise<WindowBounds | null>;
  /** 현재 Electron 창의 이동/리사이즈 bounds 변경 구독 */
  onCurrentWindowBoundsChanged(callback: (bounds: WindowBounds) => void): () => void;
  /** 저장된 프리셋으로 현재 Electron 창 크기/위치 적용 */
  applyWindowSizerPreset(preset: WindowSizerPreset): Promise<{ applied: boolean; bounds: WindowBounds }>;
}

// ─── 자동 업데이트 ────────────────────────────────────────────────────────────

/** 업데이트 릴리즈 정보 (IPC 직렬화 가능한 subset) */
export type UpdateChannel = 'public-stable' | 'internal-dev' | 'nightly' | 'local';

export interface UpdaterSettings {
  channel: UpdateChannel;
  autoCheck: boolean;
  localFeedUrl: string;
}

export interface UpdateReleaseInfo {
  version: string;
  releaseNotes?: string | null;
  releaseDate?: string;
}

/** 업데이트 다운로드 진행 상태 */
export interface UpdateDownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface UpdaterStatusContext {
  channel: UpdateChannel;
  feedUrl: string;
  autoCheck: boolean;
}

/** 업데이터 상태 (discriminated union) */
export type UpdaterStatus =
  | ({ state: 'idle' } & UpdaterStatusContext)
  | ({ state: 'checking' } & UpdaterStatusContext)
  | ({ state: 'available'; info: UpdateReleaseInfo } & UpdaterStatusContext)
  | ({ state: 'not-available'; info: UpdateReleaseInfo } & UpdaterStatusContext)
  | ({ state: 'downloading'; progress: UpdateDownloadProgress } & UpdaterStatusContext)
  | ({ state: 'downloaded'; info: UpdateReleaseInfo } & UpdaterStatusContext)
  | ({ state: 'error'; message: string } & UpdaterStatusContext);

export interface UpdaterApi {
  /** 업데이트 서버에서 새 버전 확인 */
  check(): Promise<void>;
  /** 사용 가능한 업데이트 다운로드 */
  download(): Promise<void>;
  /** 다운로드된 업데이트 설치 (앱 재시작) */
  install(): void;
  /** 현재 업데이터 상태 조회 */
  getStatus(): Promise<UpdaterStatus>;
  /** 상태 변경 구독 (반환값: 구독 해제 함수) */
  onStatusChanged(callback: (status: UpdaterStatus) => void): () => void;
}

// ─── 화면 영역 캡처 ───────────────────────────────────────────────────────────

/** 저장된 캡처 이미지 항목 */
export interface CaptureItem {
  filePath: string;
  fileName: string;
  /** Unix timestamp (ms) */
  createdAt: number;
  /** 파일 크기 (바이트) */
  size: number;
}

export interface CapturePaneRequest {
  x: number;
  y: number;
  width: number;
  height: number;
  paneId?: string;
  contentId?: string;
  title?: string;
  contentType?: string;
}

export interface CapturePaneResult extends CaptureItem {
  paneId?: string;
  contentId?: string;
  title?: string;
  contentType?: string;
}

export interface CaptureApi {
  /** 화면 영역 캡처 오버레이 시작 */
  startCapture(): Promise<void>;
  /** 현재 렌더러 창의 지정 rect를 이미지로 저장 */
  capturePane(request: CapturePaneRequest): Promise<CapturePaneResult>;
  /** 캡처 완료 시 저장된 파일 경로 수신 */
  onCaptureDone(callback: (filePath: string) => void): () => void;
  /** desktopCapturer 스크린샷 수집 시작 시 수신 (준비 중 표시용) */
  onCapturePreparing(callback: () => void): () => void;
  /** 캡처 오버레이가 준비 완료(창 오픈) 됐을 때 수신 */
  onCaptureReady(callback: () => void): () => void;
  /** 현재 캡처 폴더의 이미지 목록 조회 */
  listCaptures(): Promise<CaptureItem[]>;
  /** 특정 캡처 파일을 작은 썸네일 base64(data URL)로 반환 */
  getThumbnail(filePath: string): Promise<string>;
  /** 특정 캡처 파일 삭제 */
  deleteCapture(filePath: string): Promise<void>;
  /** 캡처 폴더 내 모든 파일 삭제 */
  deleteAllCaptures(): Promise<void>;
  /** 네이티브 파일 드래그 시작 (탐색기로 드래그 아웃) */
  startFileDrag(filePath: string): void;
}

export interface TerminalApi {
  spawn(request: TerminalSpawnRequest): Promise<TerminalSpawnResult>;
  write(id: string, data: string): void;
  writeImage(id: string, source: string, options?: TerminalImageWriteOptions): Promise<TerminalImageWriteResult>;
  writeImageBase64(id: string, base64: string, options?: TerminalImageWriteOptions): Promise<TerminalImageWriteResult>;
  writeXconImage(id: string, xcon: string, options?: TerminalXconImageWriteOptions): Promise<TerminalImageWriteResult>;
  resize(id: string, cols: number, rows: number): void;
  kill(id: string): void;
  listShells(): Promise<ShellDescriptor[]>;
  selectCwd(): Promise<string | null>;
  saveLog(request: SaveLogRequest): Promise<SaveLogResult>;
  revealPath(path: string): Promise<void>;
  /**
   * 다른 창에서 실행 중인 기존 PTY 세션의 소유권을 현재 창으로 이전.
   * 반환값: 스크롤백 버퍼(최근 256 KB). 세션이 없으면 null.
   */
  adopt(termId: string): Promise<{ scrollback: string } | null>;

  /** 세션 ID 별 채널로 분리 — 불필요한 필터링 제거 */
  onData(id: string, callback: (event: TerminalDataEvent) => void): () => void;
  onExit(id: string, callback: (event: TerminalExitEvent) => void): () => void;

  /** 설정 영속 저장 */
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: Partial<AppSettings>): Promise<void>;
  exportSettings(): Promise<SettingsExportResult>;
  importSettings(): Promise<SettingsImportResult>;
  listSettingsBackups(): Promise<SettingsBackupListItem[]>;
  restoreSettingsBackup(filePath: string): Promise<SettingsImportResult>;

  /** Main 프로세스가 앱 종료 직전 렌더러에 터미널 정리를 요청할 때 수신 */
  onAppClosing(callback: () => void): () => void;
  /** 렌더러 터미널 정리 완료 후 Main에 종료 준비 완료 신호 전송 */
  confirmAppClose(): void;
}
