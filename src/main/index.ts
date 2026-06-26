import type { ChildProcess } from 'node:child_process';
import { execFile, spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as pty from '@lydell/node-pty';
import type { XconSyntax } from '@xcon-viewer/core';
import { fromSketchLenient, parseBySyntax } from '@xcon-viewer/core';
import { renderToHtml, viewerCss } from '@xcon-viewer/viewer';
import { Client as BasicFtpClient, FileType as BasicFtpFileType } from 'basic-ftp';
import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  safeStorage,
  screen,
  session,
  shell,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import iconv from 'iconv-lite';
import type { ClientChannel, ConnectConfig, FileEntryWithStats, SFTPWrapper } from 'ssh2';
import { Client } from 'ssh2';
import {
  DiscordAdapter,
  SlackAdapter,
  TelegramAdapter,
  WebhookAdapter,
} from '../../packages/xenesis/src/channels/index';
import {
  getOperatingProfileTemplate,
  listOperatingProfileTemplates,
  type ProfileConfig,
  type ProfilesFile,
  profilesPath,
  readProfiles,
  writeProfiles,
} from '../../packages/xenesis/src/config/index';
import {
  APP_MENU_MODEL,
  type AppMenuActionNode,
  type AppMenuCommandNode,
  type AppMenuGroupNode,
  type AppMenuNode,
} from '../shared/appMenuModel';
import {
  callDeskBridgeCapability,
  DESK_BRIDGE_RENDERER_COMMAND_CAPABILITY_COVERAGE,
  type DeskBridgeCapabilityAdapter,
  type DeskBridgeCapabilitySource,
  findDeskBridgeCapability,
  listDeskBridgeCapabilities,
} from '../shared/deskBridgeCapabilities';
import { normalizeExternalAppSettings } from '../shared/externalAppControl';
import {
  canUseXenisPhase5XamongCodeCommand,
  isXenisPhase5Visible,
  isXenisPhase5Enabled as resolveXenisPhase5Enabled,
  type XenisPhase5VisibilityOptions,
} from '../shared/phase5';
import type {
  AiProviderKind,
  AiProviderProfile,
  AiProviderSettings,
  AiReasoningEffort,
  AppFeatureFlags,
  AppSettings,
  AutomationEvent,
  AutomationMode,
  AutomationSettings,
  AutomationStage,
  AutomationStreamFilterProfile,
  CaptureItem,
  CapturePaneRequest,
  CapturePaneResult,
  CommandShortcutBinding,
  DetachPayload,
  DiagnosticsBundleExportResult,
  DiagnosticsLogEntry,
  DiagnosticsLogLevel,
  DiagnosticsLogRecordRequest,
  DiagnosticsLogSource,
  ExtensionCommandDescriptor,
  ExtensionHostAction,
  ExtensionLogEntry,
  ExtensionPanelPlacement,
  ExtensionRunResult,
  FileTransferPayload,
  FileTransferResult,
  FsEntry,
  KeyboardShortcutSettings,
  LocalCliAgentId,
  LocalCliAgentStatus,
  LocalTerminalProfile,
  McpBridgeActionInboxItem,
  McpBridgeActionInboxResolveRequest,
  McpBridgeActionInboxResolveResult,
  McpBridgeBotArtifact,
  McpBridgeBotEvent,
  McpBridgeBotSession,
  McpBridgeBotSessionSaveResult,
  McpBridgeCapabilityCallRequest,
  McpBridgeCapabilityCallResult,
  McpBridgeCapabilityApprovalRememberEntry,
  McpBridgeCapabilityApprovalRememberResult,
  McpBridgeCaptureActivePanePayload,
  McpBridgeCaptureActivePaneResult,
  McpBridgeDemoLabPlaybackControlAction,
  McpBridgeDemoLabPlaybackControlPayload,
  McpBridgeDemoLabPlaybackControlResult,
  McpBridgeBrowserActionPayload,
  McpBridgeBrowserActionResult,
  McpBridgeDockActionPayload,
  McpBridgeDockActionResult,
  McpBridgeExplorerActionPayload,
  McpBridgeExplorerActionResult,
  McpBridgeFavoritesActionPayload,
  McpBridgeFavoritesActionResult,
  McpBridgeGowooriArtifactVisibilityPayload,
  McpBridgeGowooriArtifactVisibilityResult,
  McpBridgeGowooriChatAsyncRunSnapshot,
  McpBridgeGowooriChatCancelResult,
  McpBridgeGowooriChatDiagnostic,
  McpBridgeGowooriChatRunPayload,
  McpBridgeGowooriChatRunProgress,
  McpBridgeGowooriChatRunProgressPhase,
  McpBridgeGowooriChatRunResult,
  McpBridgeGowooriChatRunStatus,
  McpBridgeGowooriOverlayPayload,
  McpBridgeGowooriOverlayResult,
  McpBridgeOnboardingDemoModeRunPayload,
  McpBridgeOnboardingDemoModeRunResult,
  McpBridgeOnboardingRunPreviewPayload,
  McpBridgeOnboardingRunPreviewResult,
  McpBridgeOnboardingScenarioRunPayload,
  McpBridgeOnboardingScenarioRunResult,
  McpBridgeOnboardingStepActionPayload,
  McpBridgeOnboardingStepActionResult,
  McpBridgeOpenBrowserPayload,
  McpBridgeOpenBuiltinPaneKind,
  McpBridgeOpenBuiltinPanePayload,
  McpBridgeOpenBuiltinPaneResult,
  McpBridgeOpenTerminalPayload,
  McpBridgeRemoteExplorerActionPayload,
  McpBridgeRemoteExplorerActionResult,
  McpBridgeRendererExplorerSnapshot,
  McpBridgeRendererPerformanceTraceEntry,
  McpBridgeRendererPerformanceTraceRequest,
  McpBridgeRendererPerformanceTraceResult,
  McpBridgeRendererPerformanceTraceSnapshot,
  McpBridgeRendererPerformanceTraceSummaryItem,
  McpBridgeRendererStateSnapshot,
  McpBridgeRendererWorkspaceSnapshot,
  McpBridgeStatus,
  McpBridgeTerminalMetadata,
  McpBridgeTerminalUiActionPayload,
  McpBridgeTerminalUiActionResult,
  McpSettingsStatus,
  OnboardingDemoRouteOpenRequest,
  OnboardingDemoRouteSaveRequest,
  OnboardingRunArtifact,
  OnboardingSampleWorkspaceStatus,
  OnboardingSettings,
  OnboardingVerificationSnapshot,
  OpenFileResult,
  ProcessInfo,
  ProcessKillResult,
  ProviderIntegrationCliInstallRequest,
  ProviderIntegrationCliInstallResult,
  ProviderIntegrationHermesInstallRequest,
  ProviderIntegrationHermesInstallResult,
  ProviderIntegrationStatus,
  ProviderIntegrationStatusRequest,
  RemoteFileEncoding,
  RemoteFileEntry,
  RemoteFileOperationResult,
  RemoteFileProfile,
  RemoteFileProtocol,
  RemoteFileWriteRequest,
  RemoteTerminalProfile,
  RenderOptions,
  SafeFileApplyRequest,
  SafeFileApplyResult,
  SafeFilePreviewRequest,
  SafeFilePreviewResult,
  SafeFileRestoreRequest,
  SafeFileRestoreResult,
  SecretVaultItem,
  SecretVaultKind,
  SecretVaultSettings,
  SecretVaultStatus,
  SecretVaultStorageMode,
  ServerStatus,
  SettingsBackupFile,
  SettingsBackupListItem,
  SettingsExportResult,
  SettingsImportResult,
  ShellDescriptor,
  ShellKind,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalSessionKind,
  TerminalSpawnRequest,
  TerminalSpawnResult,
  ThemeName,
  TransferOverwritePolicy,
  TransferQueueEnqueueRequest,
  TransferQueueItem,
  UpdateChannel,
  UpdaterSettings,
  UpdaterStatus,
  WindowBounds,
  WindowSizerPreset,
  WorkflowPlaywrightResult,
  WorkflowPlaywrightRunRequest,
  WorkflowPlaywrightSnapshotRequest,
  WorkflowRunHistoryListRequest,
  WorkflowRunHistoryRecord,
  WorkflowRunHistorySaveResult,
  WorkflowTemplateRecord,
  WorkflowTemplateSaveResult,
  WorkspaceOpenResult,
  WorkspaceProfile,
  WorkspaceRecentItem,
  WorkspaceSaveResult,
  WorkspaceSettings,
  XamongCodeRuntimeSettings,
  XamongCodeServerStatus,
  XenesisApprovalMode,
  XenesisChannelState,
  XenesisGatewayChannelName,
  XenesisGatewayChannelRuntimeStatus,
  XenesisGatewayChannelStatus,
  XenesisGatewayChannelsStatus,
  XenesisGatewaySettings,
  XenesisGatewayStatus,
  XenesisOperationalDiagnostics,
  XenesisProfileChannelName,
  XenesisProfileChannelSettings,
  XenesisProfileChannelsUpdateRequest,
  XenesisProfileChannelTestRequest,
  XenesisProfileChannelTestResult,
  XenesisProfileInstallRequest,
  XenesisProfilePolicyState,
  XenesisProfileState,
  XenesisProfileTemplate,
  XenesisProviderRuntimeStatus,
  XenesisReportKind,
  XenesisReportQuery,
  XenesisReportSummary,
  XenesisRunEvent,
  XenesisRunRequest,
  XenesisRunResult,
  XenesisRuntimeMode,
  XenesisRuntimeSettings,
  XenesisStatus,
  XenesisTaskQuery,
  XenesisTaskStatus,
  XenesisTaskSummary,
} from '../shared/types';
import { buildXenesisConnectionsStatus, type XenesisConnectionsStatus } from '../shared/xenesisConnections';
import { createAppControlService } from './appControl/appControlService';
import { createAgentControlLockManager } from './agentControlLock';
import { createAuditLogger } from './audit/auditLogger';
import { AutomationController } from './automation/automationController';
import { JsonlAutomationEventLogSink } from './automation/automationEventLog';
import { createAutomationSemanticObservation } from './automation/automationObservability';
import {
  createCapabilityApprovalAllowKey,
  createCapabilityApprovalRequest,
  isCapabilityApprovalItem,
  parseCapabilityApprovalCommand,
} from './capabilityActionApproval.mjs';
import { setConnectorObservabilitySink } from './connectors/connectorObservability';
import { ExtensionHost } from './extensions/extensionHost';
import {
  buildLocalCliTerminalEnv,
  buildMcpConfigSnippet,
  resolveLocalCliAgentStatus,
  scanLocalCliAgents,
} from './localCliAgents.mjs';
import {
  applyMcpActionInboxRequest,
  createMcpActionInboxState,
  listMcpActionInboxItems,
  loadMcpActionInboxStateFromFile,
  markExpiredMcpActionInboxItems,
  persistMcpActionInboxState,
  resolveMcpActionInboxItem,
} from './mcpActionInbox.mjs';
import {
  applyMcpBotSession,
  createMcpBotSessionsState,
  listMcpBotSessions,
  loadMcpBotSessionsStateFromFile,
  persistMcpBotSessionsState,
} from './mcpBotSessions.mjs';
import { normalizeBotBridgeEvent } from './mcpBridgeBot.mjs';
import { normalizeBridgePathFields, normalizeBridgePathForPlatform } from './mcpBridgePaths.mjs';
import { buildMcpTerminalSessionList } from './mcpTerminalSessionList';
import { createMetaBridge } from './metaBridge';
import {
  emitMainInstantOperation,
  emitMainObservabilityOperation,
  type MainObservabilityWindow,
  observeMainAsyncOperation,
  summarizeMainObservabilityPayload,
} from './observabilityBridge';
import {
  exportOnboardingDemoRouteStoryboard,
  openOnboardingDemoRouteTarget,
  readOnboardingDemoRoute,
  saveOnboardingDemoRoute,
} from './onboardingDemoRoute';
import {
  clearOnboardingRunArtifacts,
  getOnboardingRunArtifactPath,
  listOnboardingRunArtifacts,
  saveOnboardingRunArtifact,
} from './onboardingRunArtifacts';
import {
  getOnboardingSampleWorkspaceStatus,
  prepareOnboardingSampleWorkspace,
  resetOnboardingSampleWorkspace,
} from './onboardingSampleWorkspace';
import {
  getProviderIntegrationStatus,
  installCliIntegration,
  installHermesPlugins,
} from './providerIntegrationInstaller.mjs';
import { applySafeTextFileWrite, previewSafeTextFileWrite, restoreSafeTextFileBackup } from './safeFileEdit';
import { type TerminalImageOptions, writeTerminalImage } from './terminalImageWriter';
import { buildTerminalWarmupLaunch, shouldTerminalWarmupRun } from './terminalWarmup.mjs';
import { renderXconToPng, writeTerminalXconImage, type XconRenderOptions } from './terminalXconRenderer';
import {
  buildXamongCodeApiLaunch,
  buildXamongCodeTerminalEnv,
  DEFAULT_XAMONG_CODE_API_HOST,
  DEFAULT_XAMONG_CODE_API_PORT,
  DEFAULT_XAMONG_CODE_CONFIG_DIR,
  resolveXamongCodeRuntimePath,
} from './xamongCodeSidecar.mjs';
import { XenesisEmbeddedAgentService, type XenesisEmbeddedAgentServiceOptions } from './xenesisEmbeddedService';
import { createXenesisRunEventObservation } from './xenesisRunObservability';
import {
  buildXenesisGatewayLaunch,
  buildXenesisGatewayRunPayload,
  buildXenesisProviderRuntimeOptions,
  createXenesisService,
  findOpenPort,
  postGatewayJson,
  readGatewayJson,
  resolveXenesisGatewayPort,
  resolveXenesisRuntimePath,
  resolveXenesisStateHome,
  resolveXenesisWorkspaceRoot,
  waitForGatewayReady,
} from './xenesisService.mjs';
import { buildXenesisTuiTerminalRequest } from './xenesisTuiLaunch';
import {
  getDefaultCaptureDir,
  getDefaultDiagnosticsDir,
  getDefaultExportsDir,
  getDefaultUserExtensionsDir,
  getDefaultWorkflowRunsDir,
  getDefaultWorkflowTemplatesDir,
  getDefaultWorkspaceProfilesDir,
  getMcpDir,
  legacyUserDataMigrationCandidates,
  migrateLegacyUserData,
  resolveDefaultedDir,
  resolveDefaultedXamongCodeConfigDir,
  resolveXenisHomeDir,
} from './xenisHome.mjs';

// Prefer Windows.Graphics.Capture for screen thumbnails when Chromium/WebRTC
// supports it. DXGI Desktop Duplication is noisy and fragile on some
// multi-UHD Windows setups, especially around full-screen transitions.
app.commandLine.appendSwitch('enable-features', 'AllowWgcScreenCapturer');

const defaultElectronUserDataDir = app.getPath('userData');
if (!app.isPackaged) {
  const devUserData = `${defaultElectronUserDataDir}-dev`;
  app.setPath('userData', devUserData);
}
const xenisHomeDir = resolveXenisHomeDir();
fs.mkdirSync(xenisHomeDir, { recursive: true });
const automationEventLogSink = new JsonlAutomationEventLogSink(path.join(xenisHomeDir, 'automation-logs'));
const capabilityAuditLogger = createAuditLogger(path.join(xenisHomeDir, 'audit'));
try {
  migrateLegacyUserData({
    legacyDirs: legacyUserDataMigrationCandidates({
      defaultUserDataDir: defaultElectronUserDataDir,
      appIsPackaged: app.isPackaged,
    }),
    targetDir: xenisHomeDir,
  });
} catch (error) {
  console.warn('Failed to migrate legacy Xenesis Desk userData', error);
}

interface SessionRecord {
  id: string;
  kind: TerminalSessionKind;
  shell?: ShellKind;
  profileId?: string;
  command: string;
  cwd: string;
  backend: TerminalBackend;
  /** 터미널 출력을 수신하는 창 ID. null이면 소유자 없음(출력 드롭) */
  ownerWindowId: number | null;
  /** 최근 출력 순환 버퍼 — 새 창 채택 시 스크롤백 재생에 사용 */
  scrollbackChunks: string[];
  /** 현재 버퍼에 쌓인 총 바이트 수 (근사값) */
  scrollbackBytes: number;
  /** MCP bridge가 시작한 세션이면 원래 실행 명령을 보관 */
  mcpCommand?: string;
  /** MCP bridge가 renderer에 표시한 탭 제목 */
  mcpTitle?: string;
  /** MCP bridge가 시작한 세션의 선택적 분류/소스 메타데이터 */
  mcpMetadata?: McpBridgeTerminalMetadata;
  /** 사용자가 현재 입력 중인 명령줄(Enter 전까지 누적) */
  inputLineBuffer?: string;
  /** 자동화 필터 자동 감지를 위한 마지막 실행 명령 */
  lastCommand?: string;
}

const TERMINAL_INPUT_CONTROL_RE = /\x1b(?:\][^\x07]*(?:\x07|\x1b\\)|\[[0-?]*[ -/]*[@-~]|[@-Z\\-_])/g;

function stripTerminalInputControlSequences(text: string): string {
  return text.replace(TERMINAL_INPUT_CONTROL_RE, '').replace(/\x1b/g, '');
}

function commitSessionInputLine(session: SessionRecord): void {
  const command = (session.inputLineBuffer ?? '').trim();
  session.inputLineBuffer = '';
  if (command) session.lastCommand = command.slice(0, 1000);
}

function trackTerminalInput(session: SessionRecord, data: string): void {
  if (!data) return;
  const cleaned = stripTerminalInputControlSequences(data);
  for (const char of cleaned) {
    if (char === '\r' || char === '\n') {
      commitSessionInputLine(session);
      continue;
    }
    if (char === '\u0003' || char === '\u0015') {
      session.inputLineBuffer = '';
      continue;
    }
    if (char === '\b' || char === '\u007f') {
      session.inputLineBuffer = (session.inputLineBuffer ?? '').slice(0, -1);
      continue;
    }
    if (char < ' ') continue;
    session.inputLineBuffer = `${session.inputLineBuffer ?? ''}${char}`.slice(-1000);
  }
}

interface TerminalBackend {
  readonly pid: number;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

interface TerminalBackendCallbacks {
  onData(data: string): void;
  onExit(exitCode: number, signal?: number): void;
}

/** 세션당 스크롤백 버퍼 최대 크기 (256 KB) */
const SCROLLBACK_MAX_BYTES = 256 * 1024;

/** BrowserWindow ID로 창 참조 반환 (Electron 공식 API 없으므로 직접 조회) */
function getWindowById(id: number): BrowserWindow | null {
  return BrowserWindow.getAllWindows().find((w) => w.id === id) ?? null;
}

const sessions = new Map<string, SessionRecord>();

// ─── 자동화 엔진 레지스트리 ──────────────────────────────────────────────────────
// termId → AutomationController (PTY 세션과 동일한 생명주기)
const automationControllers = new Map<string, AutomationController>();
let extensionHost: ExtensionHost | null = null;

const MCP_BRIDGE_HOST = '127.0.0.1';
const MCP_BRIDGE_PORT = 3847;
const MCP_BRIDGE_DEV_PORT = 3848;
let mcpBridgePort = getPreferredMcpBridgePort();
let mcpBridgeServer: http.Server | null = null;
let mcpBridgeStartPromise: Promise<boolean> | null = null;
const mcpBridgeToken = crypto.randomUUID();
const MCP_INVENTORY_MAX_ITEMS = 100;
const MCP_RENDERER_TRACE_RECENT_MAX_ITEMS = 20;
const MCP_RENDERER_TRACE_SUMMARY_MAX_ITEMS = 10;
const MCP_RENDERER_TRACE_DETAILS_MAX_ITEMS = 20;
const MCP_TOOL_TIMEOUT_MS = 90_000;

interface McpBridgePortOptions {
  appIsPackaged?: boolean;
  env?: NodeJS.ProcessEnv;
}

function getPreferredMcpBridgePort({
  appIsPackaged = app.isPackaged,
  env = process.env,
}: McpBridgePortOptions = {}): number {
  return !appIsPackaged && env.ELECTRON_RENDERER_URL ? MCP_BRIDGE_DEV_PORT : MCP_BRIDGE_PORT;
}

interface McpOpenedFileRecord {
  filePath: string;
  fileName: string;
  placement?: ExtensionPanelPlacement;
  targetPaneId?: string;
  renderOptions?: RenderOptions;
  openedAt: string;
  updatedAt: string;
}

interface McpPanelRecord {
  id: string;
  commandId: string;
  extensionId?: string;
  title: string;
  placement: ExtensionPanelPlacement;
  contentBytes: number;
  openedAt: string;
  updatedAt: string;
}

const mcpOpenedFiles = new Map<string, McpOpenedFileRecord>();
const mcpPanels = new Map<string, McpPanelRecord>();
const mcpActionInboxState = createMcpActionInboxState();
const mcpBotSessionsState = createMcpBotSessionsState();
const mcpCapabilityApprovalAllowKeys = new Set<string>();
let latestMcpRendererState: McpBridgeRendererStateSnapshot | null = null;
const MCP_DOCK_ACTION_TIMEOUT_MS = 5_000;
const pendingMcpOpenBuiltinPaneRequests = new Map<
  string,
  {
    resolve: (result: McpBridgeOpenBuiltinPaneResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpDockActions = new Map<
  string,
  {
    resolve: (result: McpBridgeDockActionResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpBrowserActions = new Map<
  string,
  {
    resolve: (result: McpBridgeBrowserActionResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpExplorerActions = new Map<
  string,
  {
    resolve: (result: McpBridgeExplorerActionResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpRemoteExplorerActions = new Map<
  string,
  {
    resolve: (result: McpBridgeRemoteExplorerActionResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpTerminalUiActions = new Map<
  string,
  {
    resolve: (result: McpBridgeTerminalUiActionResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpOnboardingStepActions = new Map<
  string,
  {
    resolve: (result: McpBridgeOnboardingStepActionResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpOnboardingScenarioRuns = new Map<
  string,
  {
    resolve: (result: McpBridgeOnboardingScenarioRunResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpOnboardingRunPreviews = new Map<
  string,
  {
    resolve: (result: McpBridgeOnboardingRunPreviewResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpOnboardingDemoModeRuns = new Map<
  string,
  {
    resolve: (result: McpBridgeOnboardingDemoModeRunResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpDemoLabPlaybackControls = new Map<
  string,
  {
    resolve: (result: McpBridgeDemoLabPlaybackControlResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpFavoritesActions = new Map<
  string,
  {
    resolve: (result: McpBridgeFavoritesActionResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpRendererPerformanceTraces = new Map<
  string,
  {
    resolve: (result: McpBridgeRendererPerformanceTraceResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpCaptureActivePaneRequests = new Map<
  string,
  {
    resolve: (result: McpBridgeCaptureActivePaneResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpGowooriArtifactVisibilityRequests = new Map<
  string,
  {
    resolve: (result: McpBridgeGowooriArtifactVisibilityResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const pendingMcpGowooriOverlayRequests = new Map<
  string,
  {
    resolve: (result: McpBridgeGowooriOverlayResult) => void;
    timeout: NodeJS.Timeout;
  }
>();
const MCP_GOWOORI_COMMAND_ID = 'xenesis-desk.workflow-runner.openGowoori';
const MCP_GOWOORI_CHAT_COMMAND_ID = 'xenesis-desk.workflow-runner.openGowooriChat';
const MCP_GOWOORI_CHAT_BOOTSTRAP_TIMEOUT_MS = 8_000;
const MCP_GOWOORI_CHAT_RUN_TIMEOUT_MS = 120_000;
const MCP_GOWOORI_CHAT_SLOW_LOCAL_CLI_RUN_TIMEOUT_MS = 420_000;
const MCP_GOWOORI_CHAT_RUN_MAX_TIMEOUT_MS = 600_000;
const MCP_GOWOORI_CHAT_SLOW_LOCAL_CLI_PROVIDERS = new Set(['codex', 'claude', 'hermes']);
const MCP_GOWOORI_CHAT_PROMPT_MAX_CHARS = 20_000;
const MCP_GOWOORI_CHAT_SOURCE_MAX_CHARS = 200_000;
const MCP_GOWOORI_CHAT_PROGRESS_MAX_ITEMS = 120;
const MCP_GOWOORI_CHAT_COMPLETED_RUN_MAX_ITEMS = 50;
const MCP_GOWOORI_CHAT_BUSY_RESULT_GRACE_MS = 1500;
interface PendingMcpGowooriChatRunEntry {
  requestId: string;
  prompt: string;
  status: McpBridgeGowooriChatRunStatus;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  progress: McpBridgeGowooriChatRunProgress[];
  result?: McpBridgeGowooriChatRunResult;
  error?: string;
  resolve: (result: McpBridgeGowooriChatRunResult) => void;
  timeout: NodeJS.Timeout;
  deferredBusyResult?: McpBridgeGowooriChatRunResult;
  deferredBusyResultTimeout?: NodeJS.Timeout;
  targetWindow?: BrowserWindow;
}
const pendingMcpGowooriChatRuns = new Map<string, PendingMcpGowooriChatRunEntry>();
const completedMcpGowooriChatRuns = new Map<string, McpBridgeGowooriChatAsyncRunSnapshot>();

function resolveMcpGowooriChatRunTimeoutMs(provider: unknown, timeoutMs: unknown): number {
  const numericTimeoutMs = Number(timeoutMs);
  const normalizedTimeoutMs =
    Number.isFinite(numericTimeoutMs) && numericTimeoutMs > 0
      ? Math.min(MCP_GOWOORI_CHAT_RUN_MAX_TIMEOUT_MS, Math.max(5_000, Math.trunc(numericTimeoutMs)))
      : MCP_GOWOORI_CHAT_RUN_TIMEOUT_MS;
  const normalizedProvider = typeof provider === 'string' ? provider.trim().toLowerCase() : '';
  if (MCP_GOWOORI_CHAT_SLOW_LOCAL_CLI_PROVIDERS.has(normalizedProvider)) {
    return Math.min(
      MCP_GOWOORI_CHAT_RUN_MAX_TIMEOUT_MS,
      Math.max(normalizedTimeoutMs, MCP_GOWOORI_CHAT_SLOW_LOCAL_CLI_RUN_TIMEOUT_MS),
    );
  }
  return normalizedTimeoutMs;
}

const DIAGNOSTICS_MAX_ITEMS = 500;
const DIAGNOSTICS_LOG_FILE_NAME = 'diagnostics.jsonl';
const DIAGNOSTICS_SECRET_REPLACEMENT = '[redacted]';
const diagnosticsLogs: DiagnosticsLogEntry[] = [];
let diagnosticsLogSeq = 0;
const diagnosticsLogLevels = new Set<DiagnosticsLogLevel>(['info', 'warn', 'error']);
const diagnosticsLogSources = new Set<DiagnosticsLogSource>([
  'main',
  'renderer',
  'extension',
  'terminal',
  'remote-file',
  'subagent-hook',
  'updater',
  'transfer',
  'system',
]);

function normalizeDiagnosticLevel(value: unknown): DiagnosticsLogLevel {
  return typeof value === 'string' && diagnosticsLogLevels.has(value as DiagnosticsLogLevel)
    ? (value as DiagnosticsLogLevel)
    : 'info';
}

function normalizeDiagnosticSource(value: unknown): DiagnosticsLogSource {
  return typeof value === 'string' && diagnosticsLogSources.has(value as DiagnosticsLogSource)
    ? (value as DiagnosticsLogSource)
    : 'system';
}

function getDiagnosticsLogFilePath(): string {
  return path.join(getDefaultDiagnosticsDir(), DIAGNOSTICS_LOG_FILE_NAME);
}

function redactDiagnosticText(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, `Bearer ${DIAGNOSTICS_SECRET_REPLACEMENT}`)
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, DIAGNOSTICS_SECRET_REPLACEMENT)
    .replace(/\bxcon-secret:[^\s"',;)}\]]+/gi, `xcon-secret:${DIAGNOSTICS_SECRET_REPLACEMENT}`)
    .replace(
      /([?&](?:api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|passphrase|secret)=)[^&#\s]+/gi,
      `$1${DIAGNOSTICS_SECRET_REPLACEMENT}`,
    )
    .replace(
      /\b(password|passphrase|api[_-]?key|access[_-]?token|refresh[_-]?token|token|secret|authorization)\b(\s*[:=]\s*)(["']?)[^"',\s}\]]+/gi,
      (_match, key: string, separator: string, quote: string) =>
        `${key}${separator}${quote}${DIAGNOSTICS_SECRET_REPLACEMENT}`,
    );
}

function redactDiagnosticsLogEntry(item: DiagnosticsLogEntry): DiagnosticsLogEntry {
  return {
    ...item,
    message: redactDiagnosticText(item.message),
    detail: item.detail === undefined ? undefined : redactDiagnosticText(item.detail),
  };
}

function redactExtensionLogEntry(item: ExtensionLogEntry): ExtensionLogEntry {
  return {
    ...item,
    message: redactDiagnosticText(item.message),
  };
}

function normalizePersistedDiagnosticLog(raw: unknown): DiagnosticsLogEntry | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const object = raw as Partial<DiagnosticsLogEntry>;
  const timestamp = Number(object.timestamp);
  const message = typeof object.message === 'string' ? object.message.trim() : '';
  if (!Number.isFinite(timestamp) || !message) return null;

  const id = typeof object.id === 'string' && object.id.trim() ? object.id.trim() : `diagnostics-${timestamp}-0`;
  const scope = typeof object.scope === 'string' && object.scope.trim() ? object.scope.trim() : 'app';

  return redactDiagnosticsLogEntry({
    id,
    timestamp,
    level: normalizeDiagnosticLevel(object.level),
    source: normalizeDiagnosticSource(object.source),
    scope,
    message,
    detail: object.detail === undefined ? undefined : String(object.detail),
  });
}

function rewritePersistedDiagnosticsLogs(): void {
  try {
    const filePath = getDiagnosticsLogFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      diagnosticsLogs.map((item) => JSON.stringify(item)).join('\n') + (diagnosticsLogs.length ? '\n' : ''),
      'utf8',
    );
  } catch {
    // Diagnostics persistence must never break the app's main flow.
  }
}

function loadPersistedDiagnosticsLogs(): void {
  try {
    const filePath = getDiagnosticsLogFilePath();
    if (!fs.existsSync(filePath)) return;

    const restoredItems = fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return normalizePersistedDiagnosticLog(JSON.parse(line) as unknown);
        } catch {
          return null;
        }
      })
      .filter((item): item is DiagnosticsLogEntry => Boolean(item));

    const mergedItems = [...restoredItems, ...diagnosticsLogs]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-DIAGNOSTICS_MAX_ITEMS);
    diagnosticsLogs.splice(0, diagnosticsLogs.length, ...mergedItems);
    rewritePersistedDiagnosticsLogs();
  } catch {
    // Ignore corrupt or inaccessible persisted logs.
  }
}

function appendPersistedDiagnosticLog(item: DiagnosticsLogEntry): void {
  try {
    const filePath = getDiagnosticsLogFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(item)}\n`, 'utf8');
  } catch {
    // Diagnostics persistence must never break logging itself.
  }
}

function revealDiagnosticsLogFile(): boolean {
  try {
    const filePath = getDiagnosticsLogFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '', 'utf8');
    }
    shell.showItemInFolder(filePath);
    return true;
  } catch (error) {
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'diagnostics',
      message: 'Failed to reveal diagnostics log file',
      detail: diagnosticDetailFromUnknown(error),
    });
    return false;
  }
}

function buildDiagnosticsBundle() {
  const settings = loadSettings();
  return {
    kind: 'xenesis-desk-diagnostics-bundle',
    version: 1,
    generatedAt: new Date().toISOString(),
    app: {
      name: app.getName(),
      version: app.getVersion(),
      packaged: app.isPackaged,
    },
    runtime: {
      platform: process.platform,
      arch: process.arch,
      versions: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node,
      },
    },
    settingsSummary: {
      theme: settings.theme,
      defaultShell: settings.defaultShell,
      fontSize: settings.fontSize,
      devMode: settings.devMode,
      captureDirConfigured: Boolean(settings.captureDir),
      updateChannel: settings.updater.channel,
      updateAutoCheck: settings.updater.autoCheck,
      localCliSelectedAgentId: settings.localCli.selectedAgentId,
      terminalRestore: settings.terminalRestore,
      remoteTerminalProfileCount: settings.remoteTerminals.profiles.length,
      remoteFileProfileCount: settings.remoteFiles.profiles.length,
      windowSizerPresetCount: settings.windowSizer.presets.length,
      disabledExtensionCount: settings.extensions.disabledExtensionIds.length,
      workspaceCurrentName: settings.workspace.currentPath ? path.basename(settings.workspace.currentPath) : '',
      onboardingDismissed: settings.onboarding.dismissed,
      secretVaultMode: settings.secretVault.mode,
      secretVaultItemCount: settings.secretVault.items.length,
    },
    xenesis: buildXenesisDiagnosticsSummary(),
    diagnostics: listDiagnosticsLogs().map(redactDiagnosticsLogEntry),
    extensions: (extensionHost?.listExtensions() ?? []).map((extension) => ({
      id: extension.id,
      name: extension.name,
      version: extension.version,
      source: extension.source,
      builtin: extension.builtin,
      enabled: extension.enabled,
      permissions: extension.permissions,
      commandCount: extension.commands.length,
      error: extension.error,
      logs: extension.logs.map(redactExtensionLogEntry),
    })),
  };
}

function buildXenesisDiagnosticsSummary() {
  const settings = loadSettings().xenesis;
  const runtimeMode = getXenesisRuntimeMode(settings);
  const providerRuntime = buildXenesisProviderRuntimeStatus();
  return {
    enabled: settings.enabled,
    runtimeMode,
    autoStart: settings.autoStart,
    mcpEnabled: settings.mcpEnabled,
    approvalMode: settings.approvalMode,
    maxTurns: settings.maxTurns,
    modelConfigured: Boolean(String(settings.model || '').trim()),
    profile: settings.profile,
    providerRuntime,
    runtimePath: resolveConfiguredXenesisRuntime(settings) || 'embedded',
    xenesisHome: resolveXenesisStateHome({ xenisHome: xenisHomeDir }),
    workspace: xenesisGatewayWorkspace || getXenesisWorkspace(),
    gatewayUrl: xenesisGatewayUrl,
    portFallback: xenesisLastPortFallback,
    lastError: xenesisLastError,
  };
}

async function exportDiagnosticsBundle(): Promise<DiagnosticsBundleExportResult> {
  try {
    const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const diagnosticsDir = getDefaultDiagnosticsDir();
    await fs.promises.mkdir(diagnosticsDir, { recursive: true });
    const result = await dialog.showSaveDialog({
      title: 'Xenesis Desk 진단 번들 내보내기',
      defaultPath: path.join(diagnosticsDir, `xenesis-diagnostics-bundle-${safeTimestamp}.json`),
      filters: [
        { name: 'Xenesis Desk Diagnostics Bundle', extensions: ['json'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { saved: false };
    }

    await fs.promises.writeFile(result.filePath, JSON.stringify(buildDiagnosticsBundle(), null, 2), 'utf8');
    try {
      shell.showItemInFolder(result.filePath);
    } catch (error) {
      recordDiagnosticLog({
        level: 'warn',
        source: 'main',
        scope: 'diagnostics',
        message: 'Failed to reveal exported diagnostics bundle',
        detail: diagnosticDetailFromUnknown(error),
      });
    }
    return { saved: true, path: result.filePath };
  } catch (error) {
    const detail = diagnosticDetailFromUnknown(error) ?? String(error);
    recordDiagnosticLog({
      level: 'error',
      source: 'main',
      scope: 'diagnostics',
      message: 'Failed to export diagnostics bundle',
      detail,
    });
    return { saved: false, error: detail };
  }
}

function listDiagnosticsLogs(): DiagnosticsLogEntry[] {
  const extensionEntries = (extensionHost?.listExtensions() ?? []).flatMap((extension) =>
    extension.logs.map((log) =>
      redactDiagnosticsLogEntry({
        id: `extension:${extension.id}:${log.timestamp}:${log.phase}:${log.message}`,
        timestamp: log.timestamp,
        level: normalizeDiagnosticLevel(log.level),
        source: 'extension' as const,
        scope: extension.name || extension.id,
        message: log.message,
        detail: log.phase,
      }),
    ),
  );
  return [...diagnosticsLogs, ...extensionEntries]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, DIAGNOSTICS_MAX_ITEMS);
}

function sendDiagnosticsChanged(): void {
  const items = listDiagnosticsLogs();
  for (const win of BrowserWindow.getAllWindows()) {
    sendToRenderer(win, 'diagnostics:changed', items);
  }
}

function recordDiagnosticLog(entry: DiagnosticsLogRecordRequest): DiagnosticsLogEntry {
  const item: DiagnosticsLogEntry = {
    id: `diagnostics-${Date.now()}-${(diagnosticsLogSeq += 1)}`,
    timestamp: Date.now(),
    level: normalizeDiagnosticLevel(entry.level),
    source: normalizeDiagnosticSource(entry.source),
    scope: String(entry.scope || '').trim() || 'app',
    message: redactDiagnosticText(String(entry.message || '').trim() || 'No diagnostic message'),
    detail: entry.detail === undefined ? undefined : redactDiagnosticText(String(entry.detail)),
  };
  diagnosticsLogs.push(item);
  let shouldRewritePersistedLogs = false;
  if (diagnosticsLogs.length > DIAGNOSTICS_MAX_ITEMS) {
    diagnosticsLogs.splice(0, diagnosticsLogs.length - DIAGNOSTICS_MAX_ITEMS);
    shouldRewritePersistedLogs = true;
  }
  appendPersistedDiagnosticLog(item);
  if (shouldRewritePersistedLogs) {
    rewritePersistedDiagnosticsLogs();
  }
  sendDiagnosticsChanged();
  return item;
}

function clearDiagnosticsLogs(): DiagnosticsLogEntry[] {
  diagnosticsLogs.splice(0, diagnosticsLogs.length);
  extensionHost?.clearLogs();
  rewritePersistedDiagnosticsLogs();
  sendDiagnosticsChanged();
  return listDiagnosticsLogs();
}

function diagnosticDetailFromUnknown(value: unknown): string | undefined {
  return value instanceof Error ? value.stack : undefined;
}

process.on('uncaughtException', (error) => {
  recordDiagnosticLog({
    level: 'error',
    source: 'main',
    scope: 'process',
    message: error instanceof Error ? error.message : String(error),
    detail: diagnosticDetailFromUnknown(error),
  });
});

process.on('unhandledRejection', (reason) => {
  recordDiagnosticLog({
    level: 'error',
    source: 'main',
    scope: 'unhandledRejection',
    message: reason instanceof Error ? reason.message : String(reason),
    detail: diagnosticDetailFromUnknown(reason),
  });
});

const AUTOMATION_SETTINGS_DEFAULT: AutomationSettings = {
  defaultMode: 'stream',
  streamFilterProfile: 'auto',
  defaultStage: 1,
  autoSend: false,
  regexRules: [],
  llmApiKey: '',
  llmModel: 'gpt-4.1-mini',
  extraDangerPatterns: [],
};

const DEFAULT_WINDOW_SIZER_PRESETS: WindowSizerPreset[] = [
  {
    id: 'builtin-hd',
    name: 'HD',
    group: 'Display',
    width: 1280,
    height: 720,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-fhd',
    name: 'FHD',
    group: 'Display',
    width: 1920,
    height: 1080,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-qhd',
    name: 'QHD',
    group: 'Display',
    width: 2560,
    height: 1440,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-uhd',
    name: 'UHD',
    group: 'Display',
    width: 3840,
    height: 2160,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-4-3-640',
    name: '640x480',
    group: '4:3',
    width: 640,
    height: 480,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-4-3-800',
    name: '800x600',
    group: '4:3',
    width: 800,
    height: 600,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-4-3-1024',
    name: '1024x768',
    group: '4:3',
    width: 1024,
    height: 768,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-4-3-1280',
    name: '1280x960',
    group: '4:3',
    width: 1280,
    height: 960,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-4-3-1600',
    name: '1600x1200',
    group: '4:3',
    width: 1600,
    height: 1200,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-16-9-1366',
    name: '1366x768',
    group: '16:9',
    width: 1366,
    height: 768,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-16-9-1600',
    name: '1600x900',
    group: '16:9',
    width: 1600,
    height: 900,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-16-10-1280',
    name: '1280x800',
    group: '16:10',
    width: 1280,
    height: 800,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-16-10-1440',
    name: '1440x900',
    group: '16:10',
    width: 1440,
    height: 900,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-16-10-1680',
    name: '1680x1050',
    group: '16:10',
    width: 1680,
    height: 1050,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-16-10-1920',
    name: '1920x1200',
    group: '16:10',
    width: 1920,
    height: 1200,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-youtube-720',
    name: 'YouTube 720p',
    group: 'YouTube',
    width: 1280,
    height: 720,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-youtube-1080',
    name: 'YouTube 1080p',
    group: 'YouTube',
    width: 1920,
    height: 1080,
    moveToPosition: false,
    x: 0,
    y: 0,
    coordinateMode: 'active-display-workarea',
    allowOutsideDisplay: false,
    builtin: true,
    createdAt: 0,
    updatedAt: 0,
  },
];

const MAIN_WINDOW_DEFAULT_WIDTH = 1280;
const MAIN_WINDOW_DEFAULT_HEIGHT = 840;
const MAIN_WINDOW_MIN_WIDTH = 640;
const MAIN_WINDOW_MIN_HEIGHT = 480;
const MAIN_WINDOW_BOUNDS_SAVE_DELAY_MS = 250;

function getAutomationSettings(): AutomationSettings {
  const s = loadSettings();
  return normalizeAutomationSettings(s.automation);
}

function getFallbackLlmKey(): string {
  return loadSettings().aiProvider?.apiKey ?? '';
}

function getAutomationRuntimeConfig(): {
  settings: AutomationSettings;
  fallbackApiKey: string;
  stage: AutomationStage;
} {
  const appSettings = loadSettings();
  const settings = normalizeAutomationSettings({ ...AUTOMATION_SETTINGS_DEFAULT, ...(appSettings.automation ?? {}) });
  return {
    settings,
    fallbackApiKey: appSettings.aiProvider?.apiKey ?? '',
    stage: (settings.defaultStage ?? 1) as AutomationStage,
  };
}

function normalizeAutomationMode(value: unknown): AutomationMode | undefined {
  return value === 'stream' || value === 'watch' || value === 'respond' ? value : undefined;
}

function normalizeAutomationStreamFilterProfile(value: unknown): AutomationStreamFilterProfile {
  return value === 'none' || value === 'codex' || value === 'claude' || value === 'gemini' || value === 'auto'
    ? value
    : 'auto';
}

function normalizeAutomationSettings(saved?: Partial<AutomationSettings>): AutomationSettings {
  const hasSavedAutomation = Boolean(saved);
  const savedMode = normalizeAutomationMode(saved?.defaultMode);
  const migratedMode =
    savedMode ??
    (hasSavedAutomation ? (saved?.autoSend === true ? 'respond' : 'watch') : SETTINGS_DEFAULT.automation.defaultMode);

  return {
    ...SETTINGS_DEFAULT.automation,
    ...(saved ?? {}),
    defaultMode: migratedMode,
    streamFilterProfile: normalizeAutomationStreamFilterProfile(saved?.streamFilterProfile),
    autoSend: migratedMode === 'respond',
  };
}

const shellKinds = new Set<ShellKind>(['powershell', 'cmd', 'pwsh', 'wsl', 'zsh', 'bash', 'sh']);
const localCliAgentIds = new Set<LocalCliAgentId>([
  'claude',
  'codex',
  'devin',
  'gemini',
  'opencode',
  'hermes',
  'kimi',
  'cursor',
  'qwen',
  'qoder',
  'github-copilot',
  'pi',
]);

// 탭 분리 창에 전달할 pending payload (windowId → payload, 1회성)
const detachPayloads = new Map<number, DetachPayload>();

// 분리 창 레지스트리 (windowId → BrowserWindow) — 창 간 합치기에 사용
const detachedWindows = new Map<number, BrowserWindow>();

// 메인 창 참조 (재결합 IPC 전달용)
let mainWindowRef: BrowserWindow | null = null;

function broadcastOnboardingSampleWorkspaceStatus(status: OnboardingSampleWorkspaceStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('onboarding:sample-status-changed', status);
    }
  }
}

async function prepareOnboardingSampleWorkspaceAndBroadcast() {
  const result = await prepareOnboardingSampleWorkspace();
  broadcastOnboardingSampleWorkspaceStatus(result);
  return result;
}

async function resetOnboardingSampleWorkspaceAndBroadcast() {
  const result = await resetOnboardingSampleWorkspace();
  broadcastOnboardingSampleWorkspaceStatus(result);
  return result;
}

// 화면 영역 캡처 오버레이 창 목록 (모니터별 1개씩)
let captureWindows: BrowserWindow[] = [];

// 네이티브 폴더 선택 다이얼로그 중복 생성을 막는 single-flight 상태
let selectCwdDialogPromise: Promise<string | null> | null = null;
let fsSelectDirDialogPromise: Promise<string | null> | null = null;

// ─── 설정 영속 저장 ────────────────────────────────────────────────────────────

const DEFAULT_AI_PROVIDER_PROFILE_ID = 'default';
const DEFAULT_AI_PROVIDER_SETTINGS: AiProviderSettings = {
  provider: 'auto',
  model: '',
  apiKey: '',
  baseUrl: '',
  xcAgentApiUrl: '',
  xcApiUrl: '',
  labApiUrl: 'http://127.0.0.1:3845',
  reasoningEffort: 'medium',
};
const AI_REASONING_EFFORTS = new Set<AiReasoningEffort>(['default', 'low', 'medium', 'high', 'xhigh']);
const AI_PROVIDER_KINDS = new Set<AiProviderKind>([
  'auto',
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'deepseek',
  'qwen',
  'ollama',
  'lmstudio',
  'together',
  'fireworks',
  'azure',
  'codex-cli',
  'codex-app-server',
  'claude-cli',
  'claude-interactive',
]);

const SETTINGS_DEFAULT: AppSettings = {
  theme: 'dark' as ThemeName,
  defaultCwd: '',
  fontSize: 13,
  defaultShell: getDefaultShellKindForPlatform(),
  cmdHistory: [],
  cmdShortcuts: [],
  terminalWorkBlocks: [],
  keyboardShortcuts: {
    bindings: [
      {
        id: 'builtin-command-palette',
        commandId: 'command-palette',
        accelerator: 'Ctrl+K',
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: 'builtin-new-default-terminal',
        commandId: 'new-default-terminal',
        accelerator: 'Ctrl+Shift+T',
        enabled: true,
        createdAt: 0,
        updatedAt: 0,
      },
    ],
  },
  featureFlags: {
    xenisPhase5: false,
  },
  // 개발 빌드는 내부 서버(localhost:3001)를 기본으로, 배포 빌드는 운영 서버 사용
  apiUrl: app.isPackaged ? 'https://ai.xamong.com' : 'http://localhost:3001',
  devMode: !app.isPackaged, // 개발 빌드는 개발 모드 기본 ON
  serverPort: 3001,
  aiProvider: DEFAULT_AI_PROVIDER_SETTINGS,
  aiProviderProfiles: [
    {
      id: DEFAULT_AI_PROVIDER_PROFILE_ID,
      name: 'Default OpenAI',
      settings: DEFAULT_AI_PROVIDER_SETTINGS,
      createdAt: 0,
      updatedAt: 0,
    },
  ],
  activeAiProviderProfileId: DEFAULT_AI_PROVIDER_PROFILE_ID,
  xamongCode: {
    runtimePath: '',
    configDir: DEFAULT_XAMONG_CODE_CONFIG_DIR,
    autoStart: true,
    host: DEFAULT_XAMONG_CODE_API_HOST,
    port: DEFAULT_XAMONG_CODE_API_PORT,
    openAiApiKey: '',
    openAiModel: '',
    workspacesConfigPath: '',
    directGeneralChat: true,
    directChatModel: '',
    workerTierPolicies: '',
  },
  xenesis: {
    enabled: true,
    runtimeMode: 'embedded',
    autoStart: false,
    runtimePath: '',
    host: '127.0.0.1',
    port: 3338,
    approvalMode: 'safe',
    maxTurns: 20,
    model: '',
    profile: '',
    mcpEnabled: true,
    gateway: {
      enabled: false,
      autoStart: false,
      host: '127.0.0.1',
      port: 3338,
      requireAuth: true,
      mcpEnabled: true,
      devToken: '',
    },
  },
  localCli: {
    selectedAgentId: 'codex',
    autoConfigureTerminal: true,
  },
  externalApps: normalizeExternalAppSettings(undefined),
  gowooriChat: {
    provider: 'byok',
    promptMode: 'stdin',
    commandArgs: '',
    timeoutMs: 120000,
    livePreview: true,
    commandOverrides: {},
    apiBaseUrl: '',
    apiModel: '',
    sportsStandingsEndpoint: '',
  },
  captureDir: getDefaultCaptureDir(),
  automation: {
    defaultMode: 'stream',
    streamFilterProfile: 'auto',
    defaultStage: 1,
    autoSend: false,
    regexRules: [],
    llmApiKey: '',
    llmModel: 'gpt-4.1-mini',
    extraDangerPatterns: [],
  },
  terminalRestore: {
    restoreShell: true,
    restoreSsh: false,
    restoreTelnet: false,
    runInitialCommandOnRestore: true,
    rerunLastCommandOnRestore: false,
  },
  remoteTerminals: {
    groups: [],
    profiles: [],
    localProfiles: [],
  },
  remoteFiles: {
    groups: [],
    profiles: [],
  },
  windowSizer: {
    presets: DEFAULT_WINDOW_SIZER_PRESETS,
  },
  mainWindowBounds: null,
  extensions: {
    disabledExtensionIds: [],
    userExtensionsDir: getDefaultUserExtensionsDir(),
  },
  secretVault: {
    mode: 'plain',
    items: [],
  },
  workspace: {
    currentPath: '',
    recent: [],
    autoRestore: false,
  },
  onboarding: {
    dismissed: false,
    dismissedAt: 0,
    version: 'public-v2',
    currentTrack: 'basic-desk',
    currentStepId: 'choose-workspace-folder',
    completedStepIds: [],
    skippedStepIds: [],
    verificationResults: {},
    sampleWorkspacePath: '',
  },
  updater: {
    channel: 'public-stable',
    autoCheck: true,
    localFeedUrl: 'http://127.0.0.1:18180/xenesis-desk/',
  },
};

function getSettingsPath(): string {
  return path.join(xenisHomeDir, 'settings.json');
}

function readSettingsFileForPersist(): Partial<AppSettings> {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf8');
    return JSON.parse(raw) as Partial<AppSettings>;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ENOENT') return {};
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load settings from ${getSettingsPath()}: ${message}`);
  }
}

function readSettingsFileForLoad(): Partial<AppSettings> {
  try {
    return readSettingsFileForPersist();
  } catch {
    return {};
  }
}

const SETTINGS_BACKUP_KIND = 'xenesis-desk-settings';
const SETTINGS_AUTO_BACKUP_LIMIT = 20;
const SECRET_REF_PREFIX = 'xcon-secret:';
const KNOWN_SECRET_PREFIXES = [
  'ai-provider:',
  'ai-provider-profile:',
  'xamong-code:',
  'automation:',
  'remote-terminal:',
  'remote-file:',
];

interface KnownSecretTarget {
  secretId: string;
  label: string;
  kind: SecretVaultKind;
  get(): string;
  set(value: string): void;
}

function cloneAppSettings(settings: AppSettings): AppSettings {
  return JSON.parse(JSON.stringify(settings)) as AppSettings;
}

function normalizeAiProviderSettings(raw?: Partial<AiProviderSettings>): AiProviderSettings {
  const provider =
    typeof raw?.provider === 'string' && AI_PROVIDER_KINDS.has(raw.provider as AiProviderKind)
      ? (raw.provider as AiProviderKind)
      : DEFAULT_AI_PROVIDER_SETTINGS.provider;
  return {
    ...DEFAULT_AI_PROVIDER_SETTINGS,
    ...(raw ?? {}),
    provider,
    model: typeof raw?.model === 'string' && raw.model.trim() ? raw.model : DEFAULT_AI_PROVIDER_SETTINGS.model,
    apiKey: typeof raw?.apiKey === 'string' ? raw.apiKey : '',
    baseUrl: typeof raw?.baseUrl === 'string' ? raw.baseUrl : '',
    xcAgentApiUrl: typeof raw?.xcAgentApiUrl === 'string' ? raw.xcAgentApiUrl : '',
    xcApiUrl: typeof raw?.xcApiUrl === 'string' ? raw.xcApiUrl : '',
    labApiUrl:
      typeof raw?.labApiUrl === 'string' && raw.labApiUrl.trim()
        ? raw.labApiUrl
        : DEFAULT_AI_PROVIDER_SETTINGS.labApiUrl,
    reasoningEffort:
      typeof raw?.reasoningEffort === 'string' && AI_REASONING_EFFORTS.has(raw.reasoningEffort as AiReasoningEffort)
        ? (raw.reasoningEffort as AiReasoningEffort)
        : DEFAULT_AI_PROVIDER_SETTINGS.reasoningEffort,
  };
}

function createDefaultAiProviderProfile(settings?: Partial<AiProviderSettings>): AiProviderProfile {
  const normalized = normalizeAiProviderSettings(settings);
  return {
    id: DEFAULT_AI_PROVIDER_PROFILE_ID,
    name: 'Default OpenAI',
    settings: normalized,
    createdAt: 0,
    updatedAt: 0,
  };
}

function normalizeAiProviderProfiles(
  rawProfiles: unknown,
  activeProfileId: unknown,
  fallbackSettings?: Partial<AiProviderSettings>,
): { profiles: AiProviderProfile[]; activeId: string; activeSettings: AiProviderSettings } {
  const fallback = normalizeAiProviderSettings(fallbackSettings);
  const seenIds = new Set<string>();
  const profiles = Array.isArray(rawProfiles)
    ? rawProfiles
        .map((raw, index): AiProviderProfile | null => {
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
          const profile = raw as Partial<AiProviderProfile>;
          const rawId =
            typeof profile.id === 'string' && profile.id.trim() ? profile.id.trim() : `profile-${index + 1}`;
          const id = seenIds.has(rawId) ? `${rawId}-${index + 1}` : rawId;
          seenIds.add(id);
          return {
            id,
            name:
              typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : `Provider ${index + 1}`,
            settings: normalizeAiProviderSettings(profile.settings ?? fallback),
            createdAt: Number.isFinite(profile.createdAt) ? Number(profile.createdAt) : 0,
            updatedAt: Number.isFinite(profile.updatedAt) ? Number(profile.updatedAt) : 0,
          };
        })
        .filter((profile): profile is AiProviderProfile => Boolean(profile))
    : [];

  if (!profiles.length) {
    profiles.push(createDefaultAiProviderProfile(fallback));
  }

  const requestedActiveId = typeof activeProfileId === 'string' ? activeProfileId : '';
  const activeProfile = profiles.find((profile) => profile.id === requestedActiveId) ?? profiles[0];
  const activeSettings = normalizeAiProviderSettings(activeProfile.settings);
  activeProfile.settings = activeSettings;

  return {
    profiles,
    activeId: activeProfile.id,
    activeSettings,
  };
}

function buildSettingsBackup(settings: AppSettings): SettingsBackupFile {
  return {
    kind: SETTINGS_BACKUP_KIND,
    version: 1,
    appVersion: app.getVersion(),
    exportedAt: new Date().toISOString(),
    includesSecrets: true,
    settings: protectSettingsSecrets(settings),
  };
}

function normalizeSettingsBackup(raw: unknown): SettingsBackupFile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid settings backup file.');
  }

  const object = raw as Partial<SettingsBackupFile> & Partial<AppSettings>;
  if (object.kind === SETTINGS_BACKUP_KIND) {
    if (!object.settings || typeof object.settings !== 'object' || Array.isArray(object.settings)) {
      throw new Error('Invalid settings backup file.');
    }
    return {
      kind: SETTINGS_BACKUP_KIND,
      version: 1,
      appVersion: typeof object.appVersion === 'string' ? object.appVersion : '',
      exportedAt: typeof object.exportedAt === 'string' ? object.exportedAt : new Date().toISOString(),
      includesSecrets: object.includesSecrets === true,
      settings: object.settings as AppSettings,
    };
  }

  return {
    kind: SETTINGS_BACKUP_KIND,
    version: 1,
    appVersion: '',
    exportedAt: new Date().toISOString(),
    includesSecrets: true,
    settings: raw as AppSettings,
  };
}

function getSettingsBackupDir(): string {
  return path.join(xenisHomeDir, 'settings-backups');
}

async function writeSettingsAutoBackup(settings: AppSettings): Promise<string> {
  const backup = buildSettingsBackup(settings);
  const safeTimestamp = backup.exportedAt.replace(/[:.]/g, '-');
  const backupDir = getSettingsBackupDir();
  const backupPath = path.join(backupDir, `xenesis-desk-before-import-${safeTimestamp}.json`);
  await fs.promises.mkdir(backupDir, { recursive: true });
  await fs.promises.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  await pruneSettingsAutoBackups();
  return backupPath;
}

function isPathInsideDirectory(filePath: string, directoryPath: string): boolean {
  const resolvedFilePath = path.resolve(filePath);
  const resolvedDirectoryPath = path.resolve(directoryPath);
  const relativePath = path.relative(resolvedDirectoryPath, resolvedFilePath);
  return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

async function collectSettingsBackups(): Promise<SettingsBackupListItem[]> {
  const backupDir = getSettingsBackupDir();
  let entries: Array<{ isFile(): boolean; name: string }>;
  try {
    entries = await fs.promises.readdir(backupDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map(async (entry): Promise<SettingsBackupListItem | null> => {
        const filePath = path.join(backupDir, entry.name);
        try {
          const [raw, stat] = await Promise.all([fs.promises.readFile(filePath, 'utf8'), fs.promises.stat(filePath)]);
          const backup = normalizeSettingsBackup(JSON.parse(raw) as unknown);
          return {
            path: filePath,
            fileName: entry.name,
            exportedAt: backup.exportedAt,
            appVersion: backup.appVersion,
            includesSecrets: backup.includesSecrets,
            size: stat.size,
          };
        } catch {
          return null;
        }
      }),
  );

  return items
    .filter((item): item is SettingsBackupListItem => Boolean(item))
    .sort((a, b) => Date.parse(b.exportedAt) - Date.parse(a.exportedAt));
}

async function listSettingsBackups(): Promise<SettingsBackupListItem[]> {
  return (await collectSettingsBackups()).slice(0, SETTINGS_AUTO_BACKUP_LIMIT);
}

async function pruneSettingsAutoBackups(): Promise<void> {
  const backupDir = getSettingsBackupDir();
  const expiredItems = (await collectSettingsBackups()).slice(SETTINGS_AUTO_BACKUP_LIMIT);
  await Promise.all(
    expiredItems.map(async (item) => {
      if (!isPathInsideDirectory(item.path, backupDir)) return;
      await fs.promises.unlink(item.path).catch(() => {});
    }),
  );
}

async function applySettingsBackupFile(
  filePath: string,
  currentSettings = loadSettings(),
): Promise<SettingsImportResult> {
  const raw = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as unknown;
  const backup = normalizeSettingsBackup(raw);
  const previousBackupPath = await writeSettingsAutoBackup(currentSettings);
  const importedSettings = persistSettings(backup.settings);
  getExtensionHost().reload();
  broadcastUpdaterStatus({ state: 'idle' });
  return { imported: true, path: filePath, previousBackupPath, settings: importedSettings };
}

async function restoreSettingsBackup(filePath: string): Promise<SettingsImportResult> {
  const requestedPath = path.resolve(String(filePath ?? '').trim());
  if (!requestedPath || !isPathInsideDirectory(requestedPath, getSettingsBackupDir())) {
    throw new Error('Settings backup path is not allowed.');
  }
  return applySettingsBackupFile(requestedPath);
}

function normalizeSecretVaultMode(value: unknown): SecretVaultStorageMode {
  return value === 'os-protected' ? 'os-protected' : 'plain';
}

function normalizeSecretVaultSettings(raw: Partial<SecretVaultSettings> | undefined): SecretVaultSettings {
  const items = Array.isArray(raw?.items)
    ? raw.items
        .map((item): SecretVaultItem | null => {
          if (!item || typeof item !== 'object') return null;
          const secretId = typeof item.secretId === 'string' ? item.secretId.trim() : '';
          if (!secretId) return null;
          return {
            secretId,
            label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : secretId,
            kind:
              item.kind === 'api-key' ||
              item.kind === 'remote-password' ||
              item.kind === 'remote-passphrase' ||
              item.kind === 'token' ||
              item.kind === 'generic'
                ? item.kind
                : 'generic',
            storage: normalizeSecretVaultMode(item.storage),
            value: typeof item.value === 'string' ? item.value : '',
            updatedAt: Number.isFinite(item.updatedAt) ? Number(item.updatedAt) : Date.now(),
          };
        })
        .filter((item): item is SecretVaultItem => Boolean(item))
    : [];
  return {
    mode: normalizeSecretVaultMode(raw?.mode),
    items,
  };
}

function isSecretRef(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(SECRET_REF_PREFIX);
}

function makeSecretRef(secretId: string): string {
  return `${SECRET_REF_PREFIX}${secretId}`;
}

function secretIdFromRef(ref: string): string {
  return ref.slice(SECRET_REF_PREFIX.length);
}

function secretIdForRemoteTerminal(profileId: string, field: 'password' | 'passphrase'): string {
  return `remote-terminal:${profileId}:${field}`;
}

function secretIdForRemoteFile(profileId: string, field: 'password' | 'passphrase'): string {
  return `remote-file:${profileId}:${field}`;
}

function canUseOsProtectedSecrets(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function effectiveSecretVaultMode(mode: SecretVaultStorageMode): SecretVaultStorageMode {
  return mode === 'os-protected' && canUseOsProtectedSecrets() ? 'os-protected' : 'plain';
}

function sealSecretValue(value: string, storage: SecretVaultStorageMode): string {
  if (!value) return '';
  if (storage !== 'os-protected') return value;
  try {
    return safeStorage.encryptString(value).toString('base64');
  } catch {
    return value;
  }
}

function unsealSecretValue(value: string, storage: SecretVaultStorageMode): string {
  if (!value) return '';
  if (storage !== 'os-protected') return value;
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'));
  } catch {
    return '';
  }
}

function secretVaultItemMap(vault: SecretVaultSettings): Map<string, SecretVaultItem> {
  return new Map(vault.items.map((item) => [item.secretId, item]));
}

function knownSecretTargets(settings: AppSettings): KnownSecretTarget[] {
  const targets: KnownSecretTarget[] = [
    {
      secretId: `ai-provider:${settings.aiProvider.provider}:apiKey`,
      label: `${settings.aiProvider.provider} API Key`,
      kind: 'api-key',
      get: () => settings.aiProvider.apiKey,
      set: (value) => {
        settings.aiProvider.apiKey = value;
      },
    },
    {
      secretId: 'xamong-code:openAiApiKey',
      label: 'XamongCode OPENAI_API_KEY',
      kind: 'api-key',
      get: () => settings.xamongCode.openAiApiKey,
      set: (value) => {
        settings.xamongCode.openAiApiKey = value;
      },
    },
    {
      secretId: 'automation:llmApiKey',
      label: 'Automation LLM API Key',
      kind: 'api-key',
      get: () => settings.automation.llmApiKey,
      set: (value) => {
        settings.automation.llmApiKey = value;
      },
    },
  ];

  for (const profile of settings.aiProviderProfiles) {
    targets.push({
      secretId: `ai-provider-profile:${profile.id}:apiKey`,
      label: `${profile.name || profile.settings.provider || 'AI provider'} API Key`,
      kind: 'api-key',
      get: () => profile.settings.apiKey,
      set: (value) => {
        profile.settings.apiKey = value;
      },
    });
  }

  for (const profile of settings.remoteTerminals.profiles) {
    targets.push({
      secretId: secretIdForRemoteTerminal(profile.id || profile.host, 'password'),
      label: `${profile.name || profile.host || 'Remote terminal'} password`,
      kind: 'remote-password',
      get: () => profile.password,
      set: (value) => {
        profile.password = value;
      },
    });
    targets.push({
      secretId: secretIdForRemoteTerminal(profile.id || profile.host, 'passphrase'),
      label: `${profile.name || profile.host || 'Remote terminal'} passphrase`,
      kind: 'remote-passphrase',
      get: () => profile.passphrase,
      set: (value) => {
        profile.passphrase = value;
      },
    });
  }

  for (const profile of settings.remoteFiles.profiles) {
    targets.push({
      secretId: secretIdForRemoteFile(profile.id || profile.host, 'password'),
      label: `${profile.name || profile.host || 'Remote file'} password`,
      kind: 'remote-password',
      get: () => profile.password,
      set: (value) => {
        profile.password = value;
      },
    });
    targets.push({
      secretId: secretIdForRemoteFile(profile.id || profile.host, 'passphrase'),
      label: `${profile.name || profile.host || 'Remote file'} passphrase`,
      kind: 'remote-passphrase',
      get: () => profile.passphrase,
      set: (value) => {
        profile.passphrase = value;
      },
    });
  }

  return targets;
}

function isKnownSecretId(secretId: string): boolean {
  return KNOWN_SECRET_PREFIXES.some((prefix) => secretId.startsWith(prefix));
}

function protectSettingsSecrets(settings: AppSettings): AppSettings {
  const protectedSettings = cloneAppSettings(settings);
  const vault = normalizeSecretVaultSettings(protectedSettings.secretVault);
  const existingItems = secretVaultItemMap(vault);
  const nextItems = new Map<string, SecretVaultItem>();
  const activeKnownSecretIds = new Set<string>();
  const storage = effectiveSecretVaultMode(vault.mode);

  for (const item of existingItems.values()) {
    if (!isKnownSecretId(item.secretId)) {
      nextItems.set(item.secretId, item);
    }
  }

  for (const target of knownSecretTargets(protectedSettings)) {
    activeKnownSecretIds.add(target.secretId);
    const rawValue = String(target.get() || '');
    const existing = existingItems.get(target.secretId);
    const plainValue = isSecretRef(rawValue)
      ? existing
        ? unsealSecretValue(existing.value, existing.storage)
        : ''
      : rawValue;

    if (!plainValue) {
      target.set('');
      continue;
    }

    nextItems.set(target.secretId, {
      secretId: target.secretId,
      label: target.label,
      kind: target.kind,
      storage,
      value: sealSecretValue(plainValue, storage),
      updatedAt: Date.now(),
    });
    target.set(makeSecretRef(target.secretId));
  }

  for (const secretId of Array.from(nextItems.keys())) {
    if (isKnownSecretId(secretId) && !activeKnownSecretIds.has(secretId)) {
      nextItems.delete(secretId);
    }
  }

  protectedSettings.secretVault = {
    mode: vault.mode,
    items: Array.from(nextItems.values()),
  };
  return protectedSettings;
}

function resolveSettingsSecrets(settings: AppSettings): AppSettings {
  const resolvedSettings = cloneAppSettings(settings);
  const vault = normalizeSecretVaultSettings(resolvedSettings.secretVault);
  const items = secretVaultItemMap(vault);

  for (const target of knownSecretTargets(resolvedSettings)) {
    const rawValue = String(target.get() || '');
    if (!isSecretRef(rawValue)) continue;
    const item = items.get(secretIdFromRef(rawValue));
    target.set(item ? unsealSecretValue(item.value, item.storage) : '');
  }

  resolvedSettings.secretVault = vault;
  return resolvedSettings;
}

function secretVaultStatusFromSettings(settings: AppSettings): SecretVaultStatus {
  const vault = normalizeSecretVaultSettings(settings.secretVault);
  return {
    mode: vault.mode,
    effectiveMode: effectiveSecretVaultMode(vault.mode),
    osProtectedAvailable: canUseOsProtectedSecrets(),
    items: vault.items.map((item) => ({
      secretId: item.secretId,
      label: item.label,
      kind: item.kind,
      storage: item.storage,
      updatedAt: item.updatedAt,
      hasValue: item.value.length > 0,
    })),
  };
}

function getSecretVaultStatus(): SecretVaultStatus {
  return secretVaultStatusFromSettings(loadSettings());
}

function clearSecretVault(): SecretVaultStatus {
  const clearedSettings = loadSettings();
  for (const target of knownSecretTargets(clearedSettings)) {
    target.set('');
  }
  clearedSettings.secretVault = {
    ...normalizeSecretVaultSettings(clearedSettings.secretVault),
    items: [],
  };
  return secretVaultStatusFromSettings(persistSettings(clearedSettings));
}

function normalizeWorkspaceSettings(raw: Partial<WorkspaceSettings> | undefined): WorkspaceSettings {
  const recent = Array.isArray(raw?.recent)
    ? raw.recent
        .map((item): WorkspaceRecentItem | null => {
          if (!item || typeof item !== 'object') return null;
          const pathValue = typeof item.path === 'string' ? item.path.trim() : '';
          if (!pathValue) return null;
          const nameValue =
            typeof item.name === 'string' && item.name.trim()
              ? item.name.trim()
              : path.basename(pathValue).replace(/\.xcon-desk-workspace\.json$/i, '');
          const updatedAtValue = Number.isFinite(item.updatedAt) ? Number(item.updatedAt) : Date.now();
          return { path: pathValue, name: nameValue, updatedAt: updatedAtValue };
        })
        .filter((item): item is WorkspaceRecentItem => Boolean(item))
    : [];
  return {
    currentPath: typeof raw?.currentPath === 'string' ? raw.currentPath : '',
    recent: recent.slice(0, 12),
    autoRestore: raw?.autoRestore === true,
  };
}

function normalizeKeyboardShortcutBinding(raw: unknown): CommandShortcutBinding | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const object = raw as Partial<CommandShortcutBinding>;
  const commandId = String(object.commandId || '').trim();
  if (!commandId) {
    return null;
  }
  const now = Date.now();
  return {
    id: String(object.id || `shortcut-${commandId}-${now}`).trim(),
    commandId,
    accelerator: String(object.accelerator || '').trim(),
    enabled: object.enabled !== false,
    createdAt: Number.isFinite(object.createdAt) ? Number(object.createdAt) : now,
    updatedAt: Number.isFinite(object.updatedAt) ? Number(object.updatedAt) : now,
  };
}

function normalizeKeyboardShortcutSettings(
  raw: Partial<KeyboardShortcutSettings> | undefined,
): KeyboardShortcutSettings {
  const bindings = Array.isArray(raw?.bindings)
    ? raw.bindings.map(normalizeKeyboardShortcutBinding).filter((item): item is CommandShortcutBinding => Boolean(item))
    : [];
  const byCommandId = new Map<string, CommandShortcutBinding>();
  for (const binding of bindings) {
    byCommandId.set(binding.commandId, binding);
  }
  return { bindings: Array.from(byCommandId.values()) };
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean)));
}

function normalizeOnboardingVerificationResults(raw: unknown): Record<string, OnboardingVerificationSnapshot> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const result: Record<string, OnboardingVerificationSnapshot> = {};
  const validStates = new Set<OnboardingVerificationSnapshot['state']>([
    'idle',
    'pending',
    'passed',
    'failed',
    'skipped',
  ]);
  for (const [stepId, value] of Object.entries(raw)) {
    const normalizedStepId = stepId.trim();
    if (!normalizedStepId || !value || typeof value !== 'object' || Array.isArray(value)) continue;
    const object = value as Partial<OnboardingVerificationSnapshot>;
    const state = validStates.has(object.state as OnboardingVerificationSnapshot['state'])
      ? (object.state as OnboardingVerificationSnapshot['state'])
      : 'idle';
    result[normalizedStepId] = {
      state,
      checkedAt: Number.isFinite(object.checkedAt) ? Number(object.checkedAt) : 0,
      message: typeof object.message === 'string' ? object.message : '',
    };
  }
  return result;
}

function normalizeOnboardingSettings(raw: Partial<OnboardingSettings> | undefined): OnboardingSettings {
  const currentTrack = raw?.currentTrack === 'basic-desk' ? raw.currentTrack : 'basic-desk';
  const currentStepId =
    typeof raw?.currentStepId === 'string' && raw.currentStepId.trim()
      ? raw.currentStepId.trim()
      : 'choose-workspace-folder';
  return {
    dismissed: raw?.dismissed === true,
    dismissedAt: Number.isFinite(raw?.dismissedAt) ? Number(raw?.dismissedAt) : 0,
    version: typeof raw?.version === 'string' && raw.version.trim() ? raw.version.trim() : 'public-v2',
    currentTrack,
    currentStepId,
    completedStepIds: normalizeStringArray(raw?.completedStepIds),
    skippedStepIds: normalizeStringArray(raw?.skippedStepIds),
    verificationResults: normalizeOnboardingVerificationResults(raw?.verificationResults),
    sampleWorkspacePath: typeof raw?.sampleWorkspacePath === 'string' ? raw.sampleWorkspacePath : '',
  };
}

type AutoUpdateFeed = { provider: 'generic'; url: string } | { provider: 'github'; owner: string; repo: string };

const UPDATE_CHANNEL_FEEDS: Record<Exclude<UpdateChannel, 'local'>, { displayUrl: string; feed: AutoUpdateFeed }> = {
  'public-stable': {
    displayUrl: 'https://github.com/xamong/xenesis-desk/releases/latest',
    feed: { provider: 'github', owner: 'xamong', repo: 'xenesis-desk' },
  },
  'internal-dev': {
    displayUrl: 'https://update.xamong.com/xenesis-desk/internal-dev/',
    feed: { provider: 'generic', url: 'https://update.xamong.com/xenesis-desk/internal-dev/' },
  },
  nightly: {
    displayUrl: 'https://update.xamong.com/xenesis-desk/nightly/',
    feed: { provider: 'generic', url: 'https://update.xamong.com/xenesis-desk/nightly/' },
  },
};

const UPDATE_CHANNEL_NAMES: Record<UpdateChannel, string> = {
  'public-stable': 'latest',
  'internal-dev': 'dev',
  nightly: 'nightly',
  local: 'latest',
};

function normalizeUpdaterSettings(raw: Partial<UpdaterSettings> | undefined): UpdaterSettings {
  const channel: UpdateChannel =
    raw?.channel === 'internal-dev' || raw?.channel === 'nightly' || raw?.channel === 'local'
      ? raw.channel
      : 'public-stable';
  return {
    channel,
    autoCheck: raw?.autoCheck !== false,
    localFeedUrl:
      typeof raw?.localFeedUrl === 'string' && raw.localFeedUrl.trim()
        ? raw.localFeedUrl.trim()
        : SETTINGS_DEFAULT.updater.localFeedUrl,
  };
}

function resolveUpdateFeedUrl(settings: UpdaterSettings): string {
  if (settings.channel === 'local') {
    return settings.localFeedUrl || SETTINGS_DEFAULT.updater.localFeedUrl;
  }
  return UPDATE_CHANNEL_FEEDS[settings.channel].displayUrl;
}

function resolveUpdateFeed(settings: UpdaterSettings): AutoUpdateFeed {
  if (settings.channel === 'local') {
    return { provider: 'generic', url: settings.localFeedUrl || SETTINGS_DEFAULT.updater.localFeedUrl };
  }
  return UPDATE_CHANNEL_FEEDS[settings.channel].feed;
}

const xenesisApprovalModes = new Set<XenesisApprovalMode>(['readonly', 'safe', 'auto']);
const xenesisRuntimeModes = new Set<XenesisRuntimeMode>(['embedded', 'externalGateway']);
const XENESIS_MAX_TURNS_LIMIT = 100;

function normalizeXenesisGatewaySettings(
  raw: Partial<XenesisGatewaySettings> | undefined,
  legacy: Pick<XenesisRuntimeSettings, 'runtimeMode' | 'host' | 'port' | 'mcpEnabled'>,
): XenesisGatewaySettings {
  const source = raw && typeof raw === 'object' ? raw : {};
  const host = typeof source.host === 'string' && source.host.trim() ? source.host.trim() : legacy.host;
  const port = Number(source.port ?? legacy.port);

  return {
    enabled: source.enabled === true || legacy.runtimeMode === 'externalGateway',
    autoStart: source.autoStart === true,
    host: host || SETTINGS_DEFAULT.xenesis.gateway.host,
    port: Number.isInteger(port) && port >= 0 && port <= 65535 ? port : SETTINGS_DEFAULT.xenesis.gateway.port,
    requireAuth: source.requireAuth !== false,
    mcpEnabled: source.mcpEnabled !== undefined ? source.mcpEnabled !== false : legacy.mcpEnabled !== false,
    devToken: typeof source.devToken === 'string' ? source.devToken.trim() : '',
  };
}

function normalizeXenesisRuntimeSettings(raw: Partial<XenesisRuntimeSettings> | undefined): XenesisRuntimeSettings {
  const merged = { ...SETTINGS_DEFAULT.xenesis, ...(raw ?? {}) };
  const port = Number(merged.port);
  const maxTurns = Number(merged.maxTurns);
  const host =
    typeof merged.host === 'string' && merged.host.trim() ? merged.host.trim() : SETTINGS_DEFAULT.xenesis.host;
  const approvalMode =
    typeof merged.approvalMode === 'string' && xenesisApprovalModes.has(merged.approvalMode as XenesisApprovalMode)
      ? (merged.approvalMode as XenesisApprovalMode)
      : SETTINGS_DEFAULT.xenesis.approvalMode;
  const runtimeMode =
    typeof merged.runtimeMode === 'string' && xenesisRuntimeModes.has(merged.runtimeMode as XenesisRuntimeMode)
      ? (merged.runtimeMode as XenesisRuntimeMode)
      : SETTINGS_DEFAULT.xenesis.runtimeMode;
  const legacy = {
    runtimeMode,
    host,
    port: Number.isInteger(port) && port >= 0 && port <= 65535 ? port : SETTINGS_DEFAULT.xenesis.port,
    mcpEnabled: merged.mcpEnabled !== false,
  };
  const gateway = normalizeXenesisGatewaySettings(merged.gateway, legacy);

  return {
    enabled: merged.enabled !== false,
    runtimeMode,
    autoStart: merged.autoStart === true,
    runtimePath: typeof merged.runtimePath === 'string' ? merged.runtimePath : '',
    host,
    port: Number.isInteger(port) && port >= 0 && port <= 65535 ? port : SETTINGS_DEFAULT.xenesis.port,
    approvalMode,
    maxTurns:
      Number.isInteger(maxTurns) && maxTurns > 0
        ? Math.min(maxTurns, XENESIS_MAX_TURNS_LIMIT)
        : SETTINGS_DEFAULT.xenesis.maxTurns,
    model: typeof merged.model === 'string' ? merged.model : '',
    profile: typeof merged.profile === 'string' ? merged.profile : '',
    mcpEnabled: merged.mcpEnabled !== false,
    gateway,
  };
}

function normalizeAppFeatureFlags(raw?: Partial<AppFeatureFlags>, includeEnv = false): AppFeatureFlags {
  return {
    xenisPhase5: resolveXenisPhase5Enabled({ featureFlags: raw ?? {} }, includeEnv ? process.env : {}),
  };
}

function getXenisPhase5VisibilityOptions(settings = loadSettings()): XenisPhase5VisibilityOptions {
  return {
    xenisPhase5: resolveXenisPhase5Enabled(settings, process.env),
  };
}

function isXenisPhase5Enabled(settings = loadSettings()): boolean {
  return getXenisPhase5VisibilityOptions(settings).xenisPhase5 === true;
}

function readStoredFeatureFlags(): Partial<AppFeatureFlags> {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf8');
    const saved = JSON.parse(raw) as Partial<AppSettings>;
    return saved.featureFlags ?? {};
  } catch {
    return {};
  }
}

function loadSettings(): AppSettings {
  try {
    const saved = readSettingsFileForLoad();
    const merged = {
      ...SETTINGS_DEFAULT,
      ...saved,
      aiProvider: normalizeAiProviderSettings(saved.aiProvider ?? SETTINGS_DEFAULT.aiProvider),
      aiProviderProfiles: saved.aiProviderProfiles ?? SETTINGS_DEFAULT.aiProviderProfiles,
      activeAiProviderProfileId: saved.activeAiProviderProfileId ?? SETTINGS_DEFAULT.activeAiProviderProfileId,
      featureFlags: normalizeAppFeatureFlags(saved.featureFlags ?? SETTINGS_DEFAULT.featureFlags, true),
      xamongCode: { ...SETTINGS_DEFAULT.xamongCode, ...(saved.xamongCode ?? {}) },
      xenesis: normalizeXenesisRuntimeSettings({ ...SETTINGS_DEFAULT.xenesis, ...(saved.xenesis ?? {}) }),
      localCli: { ...SETTINGS_DEFAULT.localCli, ...(saved.localCli ?? {}) },
      externalApps: normalizeExternalAppSettings(saved.externalApps ?? SETTINGS_DEFAULT.externalApps),
      gowooriChat: { ...SETTINGS_DEFAULT.gowooriChat, ...(saved.gowooriChat ?? {}) },
      automation: normalizeAutomationSettings(saved.automation),
      terminalRestore: { ...SETTINGS_DEFAULT.terminalRestore, ...(saved.terminalRestore ?? {}) },
      remoteTerminals: { ...SETTINGS_DEFAULT.remoteTerminals, ...(saved.remoteTerminals ?? {}) },
      remoteFiles: { ...SETTINGS_DEFAULT.remoteFiles, ...(saved.remoteFiles ?? {}) },
      windowSizer: { ...SETTINGS_DEFAULT.windowSizer, ...(saved.windowSizer ?? {}) },
      mainWindowBounds: normalizeMainWindowBounds(saved.mainWindowBounds ?? SETTINGS_DEFAULT.mainWindowBounds),
      extensions: { ...SETTINGS_DEFAULT.extensions, ...(saved.extensions ?? {}) },
      secretVault: normalizeSecretVaultSettings({ ...SETTINGS_DEFAULT.secretVault, ...(saved.secretVault ?? {}) }),
      workspace: normalizeWorkspaceSettings({ ...SETTINGS_DEFAULT.workspace, ...(saved.workspace ?? {}) }),
      keyboardShortcuts: normalizeKeyboardShortcutSettings(
        saved.keyboardShortcuts ?? SETTINGS_DEFAULT.keyboardShortcuts,
      ),
      onboarding: normalizeOnboardingSettings(saved.onboarding ?? SETTINGS_DEFAULT.onboarding),
      updater: normalizeUpdaterSettings(saved.updater ?? SETTINGS_DEFAULT.updater),
    };
    const providerState = normalizeAiProviderProfiles(
      merged.aiProviderProfiles,
      merged.activeAiProviderProfileId,
      merged.aiProvider,
    );
    merged.aiProviderProfiles = providerState.profiles;
    merged.activeAiProviderProfileId = providerState.activeId;
    merged.aiProvider = providerState.activeSettings;
    merged.defaultShell = normalizeShellKindForPlatform(merged.defaultShell);
    // serverPort 유효성 검사
    if (!Number.isInteger(merged.serverPort) || merged.serverPort < 1024 || merged.serverPort > 65535) {
      merged.serverPort = 3001;
    }
    if (!Number.isInteger(merged.xamongCode.port) || merged.xamongCode.port < 1024 || merged.xamongCode.port > 65535) {
      merged.xamongCode.port = DEFAULT_XAMONG_CODE_API_PORT;
    }
    if (!merged.xamongCode.host) {
      merged.xamongCode.host = DEFAULT_XAMONG_CODE_API_HOST;
    }
    merged.xamongCode.configDir = resolveDefaultedXamongCodeConfigDir(merged.xamongCode.configDir);
    merged.xamongCode.openAiApiKey = String(merged.xamongCode.openAiApiKey ?? '');
    merged.xamongCode.openAiModel = String(merged.xamongCode.openAiModel ?? '');
    merged.xamongCode.workspacesConfigPath = String(merged.xamongCode.workspacesConfigPath ?? '');
    merged.xamongCode.directGeneralChat = merged.xamongCode.directGeneralChat !== false;
    merged.xamongCode.directChatModel = String(merged.xamongCode.directChatModel ?? '');
    merged.xamongCode.workerTierPolicies = String(merged.xamongCode.workerTierPolicies ?? '');
    if (!localCliAgentIds.has(merged.localCli.selectedAgentId)) {
      merged.localCli.selectedAgentId = SETTINGS_DEFAULT.localCli.selectedAgentId;
    }
    merged.localCli.autoConfigureTerminal = merged.localCli.autoConfigureTerminal !== false;
    merged.externalApps = normalizeExternalAppSettings(merged.externalApps);
    merged.gowooriChat.promptMode = merged.gowooriChat.promptMode === 'argument' ? 'argument' : 'stdin';
    merged.gowooriChat.commandArgs = String(merged.gowooriChat.commandArgs ?? '');
    merged.gowooriChat.timeoutMs = Number.isFinite(merged.gowooriChat.timeoutMs)
      ? Math.max(5000, Math.round(merged.gowooriChat.timeoutMs))
      : SETTINGS_DEFAULT.gowooriChat.timeoutMs;
    merged.gowooriChat.livePreview = merged.gowooriChat.livePreview !== false;
    merged.gowooriChat.commandOverrides =
      merged.gowooriChat.commandOverrides && typeof merged.gowooriChat.commandOverrides === 'object'
        ? merged.gowooriChat.commandOverrides
        : {};
    merged.gowooriChat.apiBaseUrl = String(merged.gowooriChat.apiBaseUrl ?? '');
    merged.gowooriChat.apiModel = String(merged.gowooriChat.apiModel ?? '');
    merged.gowooriChat.sportsStandingsEndpoint = String(merged.gowooriChat.sportsStandingsEndpoint ?? '');
    merged.captureDir = resolveDefaultedDir(merged.captureDir, getDefaultCaptureDir());
    merged.remoteTerminals.groups = Array.isArray(merged.remoteTerminals.groups) ? merged.remoteTerminals.groups : [];
    merged.remoteTerminals.profiles = Array.isArray(merged.remoteTerminals.profiles)
      ? merged.remoteTerminals.profiles
      : [];
    merged.remoteTerminals.localProfiles = Array.isArray(merged.remoteTerminals.localProfiles)
      ? merged.remoteTerminals.localProfiles
      : [];
    merged.remoteFiles.groups = Array.isArray(merged.remoteFiles.groups) ? merged.remoteFiles.groups : [];
    merged.remoteFiles.profiles = Array.isArray(merged.remoteFiles.profiles) ? merged.remoteFiles.profiles : [];
    merged.windowSizer.presets = normalizeWindowSizerPresets(merged.windowSizer.presets);
    merged.extensions.disabledExtensionIds = Array.isArray(merged.extensions.disabledExtensionIds)
      ? Array.from(new Set(merged.extensions.disabledExtensionIds.filter((id): id is string => typeof id === 'string')))
      : [];
    merged.extensions.userExtensionsDir = resolveDefaultedDir(
      merged.extensions.userExtensionsDir,
      getDefaultUserExtensionsDir(),
    );
    merged.secretVault = normalizeSecretVaultSettings(merged.secretVault);
    merged.workspace = normalizeWorkspaceSettings(merged.workspace);
    merged.keyboardShortcuts = normalizeKeyboardShortcutSettings(merged.keyboardShortcuts);
    merged.terminalWorkBlocks = Array.isArray(merged.terminalWorkBlocks) ? merged.terminalWorkBlocks : [];
    merged.onboarding = normalizeOnboardingSettings(merged.onboarding);
    merged.updater = normalizeUpdaterSettings(merged.updater);
    // 개발 빌드에서 저장된 apiUrl이 운영 서버 URL이면 로컬 서버로 자동 전환
    if (!app.isPackaged && merged.apiUrl === 'https://ai.xamong.com') {
      merged.apiUrl = `http://localhost:${merged.serverPort}`;
      merged.devMode = true;
    }
    merged.featureFlags = normalizeAppFeatureFlags(merged.featureFlags, true);
    return resolveSettingsSecrets(merged);
  } catch {
    const defaults = cloneAppSettings(SETTINGS_DEFAULT);
    defaults.featureFlags = normalizeAppFeatureFlags(defaults.featureFlags, true);
    return resolveSettingsSecrets(defaults);
  }
}

function loadSettingsForPersist(): AppSettings {
  readSettingsFileForPersist();
  return loadSettings();
}

function persistSettings(settings: Partial<AppSettings>): AppSettings {
  try {
    const current = loadSettingsForPersist();
    const updated = {
      ...current,
      ...settings,
      aiProvider: settings.aiProvider
        ? normalizeAiProviderSettings({ ...current.aiProvider, ...settings.aiProvider })
        : current.aiProvider,
      featureFlags: settings.featureFlags
        ? normalizeAppFeatureFlags({ ...readStoredFeatureFlags(), ...settings.featureFlags })
        : normalizeAppFeatureFlags(readStoredFeatureFlags()),
      aiProviderProfiles: settings.aiProviderProfiles ?? current.aiProviderProfiles,
      activeAiProviderProfileId: settings.activeAiProviderProfileId ?? current.activeAiProviderProfileId,
      xamongCode: settings.xamongCode ? { ...current.xamongCode, ...settings.xamongCode } : current.xamongCode,
      xenesis: settings.xenesis
        ? normalizeXenesisRuntimeSettings({ ...current.xenesis, ...settings.xenesis })
        : current.xenesis,
      localCli: settings.localCli ? { ...current.localCli, ...settings.localCli } : current.localCli,
      externalApps: settings.externalApps
        ? normalizeExternalAppSettings({ ...current.externalApps, ...settings.externalApps })
        : current.externalApps,
      gowooriChat: settings.gowooriChat ? { ...current.gowooriChat, ...settings.gowooriChat } : current.gowooriChat,
      automation: settings.automation ? { ...current.automation, ...settings.automation } : current.automation,
      terminalRestore: settings.terminalRestore
        ? { ...current.terminalRestore, ...settings.terminalRestore }
        : current.terminalRestore,
      remoteTerminals: settings.remoteTerminals
        ? { ...current.remoteTerminals, ...settings.remoteTerminals }
        : current.remoteTerminals,
      remoteFiles: settings.remoteFiles ? { ...current.remoteFiles, ...settings.remoteFiles } : current.remoteFiles,
      windowSizer: settings.windowSizer ? { ...current.windowSizer, ...settings.windowSizer } : current.windowSizer,
      mainWindowBounds:
        settings.mainWindowBounds !== undefined
          ? normalizeMainWindowBounds(settings.mainWindowBounds)
          : current.mainWindowBounds,
      extensions: settings.extensions ? { ...current.extensions, ...settings.extensions } : current.extensions,
      secretVault: settings.secretVault
        ? normalizeSecretVaultSettings({ ...current.secretVault, ...settings.secretVault })
        : current.secretVault,
      workspace: settings.workspace
        ? normalizeWorkspaceSettings({ ...current.workspace, ...settings.workspace })
        : current.workspace,
      keyboardShortcuts: settings.keyboardShortcuts
        ? normalizeKeyboardShortcutSettings(settings.keyboardShortcuts)
        : current.keyboardShortcuts,
      onboarding: settings.onboarding ? normalizeOnboardingSettings(settings.onboarding) : current.onboarding,
      updater: settings.updater ? normalizeUpdaterSettings(settings.updater) : current.updater,
    };
    const providerState = normalizeAiProviderProfiles(
      updated.aiProviderProfiles,
      updated.activeAiProviderProfileId,
      updated.aiProvider,
    );
    const activeAiProvider = normalizeAiProviderSettings(updated.aiProvider);
    updated.aiProviderProfiles = settings.aiProvider
      ? providerState.profiles.map((profile) =>
          profile.id === providerState.activeId
            ? { ...profile, settings: activeAiProvider, updatedAt: Date.now() }
            : profile,
        )
      : providerState.profiles;
    updated.activeAiProviderProfileId = providerState.activeId;
    updated.aiProvider = settings.aiProvider ? activeAiProvider : providerState.activeSettings;
    updated.defaultShell = normalizeShellKindForPlatform(updated.defaultShell);
    updated.featureFlags = normalizeAppFeatureFlags(updated.featureFlags);
    updated.xamongCode = {
      ...updated.xamongCode,
      configDir: resolveDefaultedXamongCodeConfigDir(updated.xamongCode.configDir),
    };
    updated.xenesis = normalizeXenesisRuntimeSettings(updated.xenesis);
    updated.externalApps = normalizeExternalAppSettings(updated.externalApps);
    updated.captureDir = resolveDefaultedDir(updated.captureDir, getDefaultCaptureDir());
    updated.extensions = {
      ...updated.extensions,
      userExtensionsDir: resolveDefaultedDir(updated.extensions.userExtensionsDir, getDefaultUserExtensionsDir()),
    };
    const protectedSettings = protectSettingsSecrets(updated);
    fs.writeFileSync(getSettingsPath(), JSON.stringify(protectedSettings, null, 2), 'utf8');
    return resolveSettingsSecrets(protectedSettings);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save settings to ${getSettingsPath()}: ${message}`);
  }
}

async function saveApplicationSettings(settings: Partial<AppSettings>): Promise<void> {
  const before = loadSettings();
  persistSettings(settings);
  const after = loadSettings();
  const phase5Changed = isXenisPhase5Enabled(before) !== isXenisPhase5Enabled(after);
  if (phase5Changed) {
    setupApplicationMenu();
    getExtensionHost().reload();
    if (!isXenisPhase5Enabled(after) && xamongCodeProcess) {
      await stopXamongCodeServer();
    }
  }
  if (settings.extensions) {
    getExtensionHost().reload();
  }

  if (settings.serverPort !== undefined && settings.serverPort !== before.serverPort) {
    if (internalServerProcess) {
      await stopInternalServer();
      await startInternalServer();
    } else {
      internalServerPort = settings.serverPort;
    }
  }

  if (
    settings.xamongCode &&
    isXenisPhase5Enabled(after) &&
    xamongCodeSettingsChanged(before.xamongCode, after.xamongCode)
  ) {
    if (xamongCodeProcess) {
      await stopXamongCodeServer();
      await startXamongCodeServer();
    }
  }

  if (settings.xenesis && xenesisSettingsChanged(before.xenesis, loadSettings().xenesis)) {
    const status = await getXenesisStatusPayload();
    if (status.managed) {
      if (loadSettings().xenesis.enabled) {
        await restartXenesisRuntime();
      } else {
        await stopXenesisRuntime();
      }
    }
    const nextSettings = loadSettings().xenesis;
    const gateway = getXenesisGatewaySettings(nextSettings);
    const gatewayStatus = getXenesisGatewayStatusPayload();
    if (gatewayStatus.running || gateway.enabled) {
      if (nextSettings.enabled && gateway.enabled) {
        await startXenesisGatewayRuntime();
      } else {
        await stopXenesisGatewayRuntime();
      }
    }
  }
}

async function exportSettingsToDialog(): Promise<SettingsExportResult> {
  const backup = buildSettingsBackup(loadSettings());
  const datePart = backup.exportedAt.slice(0, 10);
  const exportsDir = getDefaultExportsDir();
  await fs.promises.mkdir(exportsDir, { recursive: true });
  const result = await dialog.showSaveDialog({
    title: 'Xenesis Desk 설정 내보내기',
    defaultPath: path.join(exportsDir, `xenesis-desk-settings-${datePart}.json`),
    filters: [
      { name: 'Xenesis Desk Settings', extensions: ['xcon-desk-settings.json', 'json'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { saved: false };
  }

  await fs.promises.writeFile(result.filePath, JSON.stringify(backup, null, 2), 'utf8');
  return { saved: true, path: result.filePath };
}

async function importSettingsFromDialog(): Promise<SettingsImportResult> {
  const currentSettings = loadSettings();
  const result = await dialog.showOpenDialog({
    title: 'Xenesis Desk 설정 가져오기',
    properties: ['openFile'],
    filters: [
      { name: 'Xenesis Desk Settings', extensions: ['xcon-desk-settings.json', 'json'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { imported: false, settings: currentSettings };
  }

  return applySettingsBackupFile(result.filePaths[0], currentSettings);
}

function workspaceNameFromPath(filePath: string): string {
  return (
    path
      .basename(filePath)
      .replace(/\.xcon-desk-workspace\.json$/i, '')
      .replace(/\.json$/i, '') || 'Workspace'
  );
}

function normalizeWorkspaceProfile(raw: unknown, fallbackName = 'Workspace'): WorkspaceProfile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid workspace profile.');
  }
  const object = raw as Partial<WorkspaceProfile>;
  const settings = (object.settings && typeof object.settings === 'object' ? object.settings : {}) as Partial<
    WorkspaceProfile['settings']
  >;
  const requestedShell = settings.defaultShell;
  return {
    version: 1,
    name: typeof object.name === 'string' && object.name.trim() ? object.name.trim() : fallbackName,
    savedAt: typeof object.savedAt === 'string' && object.savedAt ? object.savedAt : new Date().toISOString(),
    appVersion: typeof object.appVersion === 'string' ? object.appVersion : app.getVersion(),
    settings: {
      defaultCwd: typeof settings.defaultCwd === 'string' ? settings.defaultCwd : '',
      defaultShell:
        requestedShell && shellKinds.has(requestedShell as ShellKind)
          ? (requestedShell as ShellKind)
          : getDefaultShellKindForPlatform(),
      localCli: {
        ...SETTINGS_DEFAULT.localCli,
        ...(settings.localCli ?? {}),
      },
      terminalRestore: {
        ...SETTINGS_DEFAULT.terminalRestore,
        ...(settings.terminalRestore ?? {}),
      },
      remoteTerminals: {
        groups: Array.isArray(settings.remoteTerminals?.groups) ? settings.remoteTerminals.groups : [],
        profiles: Array.isArray(settings.remoteTerminals?.profiles) ? settings.remoteTerminals.profiles : [],
        localProfiles: Array.isArray(settings.remoteTerminals?.localProfiles)
          ? settings.remoteTerminals.localProfiles
          : [],
      },
      remoteFiles: {
        groups: Array.isArray(settings.remoteFiles?.groups) ? settings.remoteFiles.groups : [],
        profiles: Array.isArray(settings.remoteFiles?.profiles) ? settings.remoteFiles.profiles : [],
      },
      windowSizer: {
        presets: normalizeWindowSizerPresets(settings.windowSizer?.presets),
      },
    },
    layout: object.layout ?? null,
  };
}

function rememberWorkspace(filePath: string, profile: WorkspaceProfile): WorkspaceRecentItem[] {
  const current = loadSettings().workspace;
  const item: WorkspaceRecentItem = {
    path: filePath,
    name: profile.name || workspaceNameFromPath(filePath),
    updatedAt: Date.now(),
  };
  const recent = [item, ...current.recent.filter((existing) => existing.path !== filePath)].slice(0, 12);
  persistSettings({
    workspace: {
      ...current,
      currentPath: filePath,
      recent,
    },
  });
  return recent;
}

async function readWorkspaceProfile(filePath: string): Promise<WorkspaceOpenResult> {
  const raw = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as unknown;
  const profile = normalizeWorkspaceProfile(raw, workspaceNameFromPath(filePath));
  const recent = rememberWorkspace(filePath, profile);
  return { path: filePath, profile, recent };
}

async function saveWorkspaceProfileToPath(
  rawProfile: WorkspaceProfile,
  filePath: string,
): Promise<WorkspaceSaveResult> {
  const requestedPath = String(filePath ?? '').trim();
  if (!requestedPath) {
    throw new Error('Workspace path is required.');
  }
  const targetPath = path.resolve(requestedPath);
  const profile = normalizeWorkspaceProfile(rawProfile, workspaceNameFromPath(targetPath));
  const savedProfile: WorkspaceProfile = {
    ...profile,
    name: workspaceNameFromPath(targetPath),
    savedAt: new Date().toISOString(),
  };
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.promises.writeFile(targetPath, JSON.stringify(savedProfile, null, 2), 'utf8');
  const recent = rememberWorkspace(targetPath, savedProfile);
  return { saved: true, path: targetPath, profile: savedProfile, recent };
}

function sanitizeWorkflowRunFilePart(value: string): string {
  return (
    (value || 'workflow')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '-')
      .slice(0, 96) || 'workflow'
  );
}

function normalizeWorkflowRunHistoryRecord(raw: unknown, filePath?: string): WorkflowRunHistoryRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const object = raw as Partial<WorkflowRunHistoryRecord>;
  const id = typeof object.id === 'string' && object.id.trim() ? object.id.trim() : `workflow-run-${Date.now()}`;
  const workflowName =
    typeof object.workflowName === 'string' && object.workflowName.trim() ? object.workflowName.trim() : 'Workflow';
  const startedAt =
    typeof object.startedAt === 'string' && object.startedAt.trim()
      ? object.startedAt.trim()
      : new Date().toISOString();
  const savedAt =
    typeof object.savedAt === 'string' && object.savedAt.trim() ? object.savedAt.trim() : new Date().toISOString();

  return {
    version: 1,
    id,
    workflowName,
    workflowSource: typeof object.workflowSource === 'string' ? object.workflowSource : '',
    fixture: typeof object.fixture === 'string' ? object.fixture : '',
    success: object.success === true,
    scope: typeof object.scope === 'string' ? object.scope : 'all',
    actionId: typeof object.actionId === 'string' ? object.actionId : undefined,
    simulateApi: object.simulateApi === true,
    sequential: object.sequential === true,
    targetMode: typeof object.targetMode === 'string' ? object.targetMode : 'selected',
    targetGroupId: typeof object.targetGroupId === 'string' ? object.targetGroupId : '',
    commandConcurrency: Number.isFinite(Number(object.commandConcurrency))
      ? Number(object.commandConcurrency)
      : undefined,
    targetCount: Number.isFinite(Number(object.targetCount)) ? Number(object.targetCount) : 0,
    actionCount: Number.isFinite(Number(object.actionCount)) ? Number(object.actionCount) : 0,
    startedAt,
    durationMs: Number.isFinite(Number(object.durationMs)) ? Number(object.durationMs) : 0,
    savedAt,
    result: object.result ?? null,
    commandStatuses: Array.isArray(object.commandStatuses) ? object.commandStatuses : [],
    failedTargetIds: Array.isArray(object.failedTargetIds) ? object.failedTargetIds.map(String).filter(Boolean) : [],
    terminalResultSummary: Array.isArray(object.terminalResultSummary) ? object.terminalResultSummary : [],
    ...(filePath ? { filePath } : {}),
  };
}

function workflowRunHistoryMatches(record: WorkflowRunHistoryRecord, request: WorkflowRunHistoryListRequest): boolean {
  if (request.status === 'success' && !record.success) return false;
  if (request.status === 'failed' && record.success) return false;
  const query = typeof request.query === 'string' ? request.query.trim().toLowerCase() : '';
  if (!query) return true;
  return [record.workflowName, record.scope, record.targetMode, record.startedAt, record.filePath ?? ''].some((value) =>
    value.toLowerCase().includes(query),
  );
}

function workflowRunHistoryFilePath(record: WorkflowRunHistoryRecord): string {
  const stamp = sanitizeWorkflowRunFilePart(record.startedAt.replace(/[-:.TZ]/g, ''));
  const name = sanitizeWorkflowRunFilePart(record.workflowName);
  const id = sanitizeWorkflowRunFilePart(record.id);
  return path.join(getDefaultWorkflowRunsDir(), `${stamp}-${name}-${id}.json`);
}

async function listWorkflowRunHistory(
  request: WorkflowRunHistoryListRequest = {},
): Promise<WorkflowRunHistoryRecord[]> {
  const runsDir = getDefaultWorkflowRunsDir();
  await fs.promises.mkdir(runsDir, { recursive: true });
  const entries = await fs.promises.readdir(runsDir, { withFileTypes: true });
  const records: WorkflowRunHistoryRecord[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) continue;
    const filePath = path.join(runsDir, entry.name);
    try {
      const parsed = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as unknown;
      const record = normalizeWorkflowRunHistoryRecord(parsed, filePath);
      if (record && workflowRunHistoryMatches(record, request)) records.push(record);
    } catch {
      // Ignore corrupted history entries; a single bad run file should not hide the rest.
    }
  }

  records.sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt));
  const limit = Number.isFinite(Number(request.limit)) ? Math.max(1, Math.min(500, Number(request.limit))) : 200;
  return records.slice(0, limit);
}

async function saveWorkflowRunHistoryRecord(raw: unknown): Promise<WorkflowRunHistorySaveResult> {
  const record = normalizeWorkflowRunHistoryRecord(raw);
  if (!record) throw new Error('Invalid workflow run history record.');
  const runsDir = getDefaultWorkflowRunsDir();
  await fs.promises.mkdir(runsDir, { recursive: true });
  const nextRecord: WorkflowRunHistoryRecord = {
    ...record,
    savedAt: new Date().toISOString(),
  };
  const filePath = workflowRunHistoryFilePath(nextRecord);
  await fs.promises.writeFile(filePath, JSON.stringify(nextRecord, null, 2), 'utf8');
  return {
    saved: true,
    path: filePath,
    record: { ...nextRecord, filePath },
  };
}

async function deleteWorkflowRunHistoryRecord(id: string): Promise<WorkflowRunHistoryRecord[]> {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return listWorkflowRunHistory({ limit: 500 });
  const records = await listWorkflowRunHistory({ limit: 500 });
  const record = records.find((item) => item.id === normalizedId);
  if (!record?.filePath) return records;
  const runsDir = path.resolve(getDefaultWorkflowRunsDir());
  const filePath = path.resolve(record.filePath);
  if (!filePath.startsWith(`${runsDir}${path.sep}`) || !filePath.toLowerCase().endsWith('.json')) {
    return records;
  }
  await fs.promises.rm(filePath, { force: true });
  return listWorkflowRunHistory({ limit: 500 });
}

async function clearWorkflowRunHistory(): Promise<WorkflowRunHistoryRecord[]> {
  const runsDir = getDefaultWorkflowRunsDir();
  await fs.promises.mkdir(runsDir, { recursive: true });
  const entries = await fs.promises.readdir(runsDir, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
      .map((entry) => fs.promises.rm(path.join(runsDir, entry.name), { force: true })),
  );
  return [];
}

function normalizeWorkflowTemplateRecord(raw: unknown, filePath?: string): WorkflowTemplateRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const object = raw as Partial<WorkflowTemplateRecord>;
  const workflow = typeof object.workflow === 'string' ? object.workflow : '';
  if (!workflow.trim()) return null;
  const now = new Date().toISOString();
  const id = typeof object.id === 'string' && object.id.trim() ? object.id.trim() : `workflow-template-${Date.now()}`;
  const name = typeof object.name === 'string' && object.name.trim() ? object.name.trim() : 'Workflow Template';
  const createdAt = typeof object.createdAt === 'string' && object.createdAt.trim() ? object.createdAt.trim() : now;
  const updatedAt =
    typeof object.updatedAt === 'string' && object.updatedAt.trim() ? object.updatedAt.trim() : createdAt;
  const lastUsedAt =
    typeof object.lastUsedAt === 'string' && object.lastUsedAt.trim() ? object.lastUsedAt.trim() : undefined;

  return {
    version: 1,
    id,
    name,
    description: typeof object.description === 'string' ? object.description : '',
    source: object.source === 'builtin' ? 'builtin' : 'user',
    workflow,
    fixture: typeof object.fixture === 'string' ? object.fixture : '',
    favorite: object.favorite === true,
    createdAt,
    updatedAt,
    ...(lastUsedAt ? { lastUsedAt } : {}),
    ...(filePath ? { filePath } : {}),
  };
}

function workflowTemplateFilePath(record: WorkflowTemplateRecord): string {
  const name = sanitizeWorkflowRunFilePart(record.name);
  const id = sanitizeWorkflowRunFilePart(record.id);
  return path.join(getDefaultWorkflowTemplatesDir(), `${name}-${id}.json`);
}

function compareWorkflowTemplates(left: WorkflowTemplateRecord, right: WorkflowTemplateRecord): number {
  if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
  const leftUsed = Date.parse(left.lastUsedAt ?? left.updatedAt);
  const rightUsed = Date.parse(right.lastUsedAt ?? right.updatedAt);
  if (leftUsed !== rightUsed) return rightUsed - leftUsed;
  return left.name.localeCompare(right.name);
}

async function listWorkflowTemplates(): Promise<WorkflowTemplateRecord[]> {
  const templatesDir = getDefaultWorkflowTemplatesDir();
  await fs.promises.mkdir(templatesDir, { recursive: true });
  const entries = await fs.promises.readdir(templatesDir, { withFileTypes: true });
  const records: WorkflowTemplateRecord[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.json')) continue;
    const filePath = path.join(templatesDir, entry.name);
    try {
      const parsed = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as unknown;
      const record = normalizeWorkflowTemplateRecord(parsed, filePath);
      if (record) records.push({ ...record, source: 'user' });
    } catch {
      // Ignore invalid template files; users can remove or repair them manually.
    }
  }

  return records.sort(compareWorkflowTemplates);
}

async function findWorkflowTemplateById(id: string): Promise<WorkflowTemplateRecord | null> {
  const templates = await listWorkflowTemplates();
  return templates.find((template) => template.id === id) ?? null;
}

async function saveWorkflowTemplateRecord(raw: unknown): Promise<WorkflowTemplateSaveResult> {
  const record = normalizeWorkflowTemplateRecord(raw);
  if (!record) throw new Error('Invalid workflow template record.');
  const templatesDir = getDefaultWorkflowTemplatesDir();
  await fs.promises.mkdir(templatesDir, { recursive: true });
  const existing = await findWorkflowTemplateById(record.id);
  const now = new Date().toISOString();
  const nextRecord: WorkflowTemplateRecord = {
    ...record,
    source: 'user',
    createdAt: existing?.createdAt ?? record.createdAt,
    updatedAt: now,
  };
  delete nextRecord.filePath;
  const filePath = existing?.filePath ?? workflowTemplateFilePath(nextRecord);
  await fs.promises.writeFile(filePath, JSON.stringify(nextRecord, null, 2), 'utf8');
  return {
    saved: true,
    path: filePath,
    template: { ...nextRecord, filePath },
  };
}

async function updateWorkflowTemplate(
  id: string,
  patch: Partial<Pick<WorkflowTemplateRecord, 'favorite' | 'lastUsedAt'>>,
): Promise<WorkflowTemplateRecord[]> {
  const templateId = String(id || '').trim();
  if (!templateId) return listWorkflowTemplates();
  const existing = await findWorkflowTemplateById(templateId);
  if (!existing) return listWorkflowTemplates();
  const now = new Date().toISOString();
  const filePath = existing.filePath ?? workflowTemplateFilePath(existing);
  const nextRecord: WorkflowTemplateRecord = {
    ...existing,
    ...patch,
    source: 'user',
    updatedAt: patch.lastUsedAt ? existing.updatedAt : now,
  };
  delete nextRecord.filePath;
  await fs.promises.writeFile(filePath, JSON.stringify(nextRecord, null, 2), 'utf8');
  return listWorkflowTemplates();
}

async function removeWorkflowTemplate(id: string): Promise<WorkflowTemplateRecord[]> {
  const existing = await findWorkflowTemplateById(String(id || '').trim());
  if (existing?.filePath) {
    await fs.promises.rm(existing.filePath, { force: true });
  }
  return listWorkflowTemplates();
}

function getExtensionHost(): ExtensionHost {
  if (!extensionHost) {
    const builtinExtensionsDir = path.join(app.getAppPath(), 'extensions');
    const packagingExtensionsDir = path.join(app.getAppPath(), 'packaging', 'extensions');
    const userDataExtensionsDir = getDefaultUserExtensionsDir();
    extensionHost = new ExtensionHost({
      builtinExtensionsDir,
      additionalBuiltinExtensionsDirs: [packagingExtensionsDir],
      userDataExtensionsDir,
      storageDir: path.join(xenisHomeDir, 'extension-storage'),
      getSettings: loadSettings,
      saveSettings: persistSettings,
    });
  }
  return extensionHost;
}

// ─── 유틸리티 ──────────────────────────────────────────────────────────────────

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

function normalizeWindowSizerPreset(raw: Partial<WindowSizerPreset>, fallback?: WindowSizerPreset): WindowSizerPreset {
  const hasFallback = Boolean(fallback);
  const base = fallback ?? {
    ...DEFAULT_WINDOW_SIZER_PRESETS[0],
    id: '',
    name: '',
    group: '',
    builtin: false,
  };
  const now = Date.now();
  const coordinateMode = raw.coordinateMode === 'absolute' ? 'absolute' : 'active-display-workarea';
  return {
    id: String(raw.id || base.id || `window-sizer-${now}`),
    name: String(raw.name || base.name || `${base.width}x${base.height}`),
    group: String(raw.group ?? base.group ?? ''),
    width: clamp(raw.width, 320, 7680, base.width || 1280),
    height: clamp(raw.height, 240, 4320, base.height || 720),
    moveToPosition: raw.moveToPosition === true,
    x: clamp(raw.x, -100000, 100000, base.x || 0),
    y: clamp(raw.y, -100000, 100000, base.y || 0),
    coordinateMode,
    allowOutsideDisplay: raw.allowOutsideDisplay === true,
    builtin: raw.builtin === true || (hasFallback && base.builtin === true),
    createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : base.createdAt || now,
    updatedAt: Number.isFinite(raw.updatedAt) ? Number(raw.updatedAt) : base.updatedAt || now,
  };
}

function normalizeWindowSizerPresets(rawPresets: unknown): WindowSizerPreset[] {
  const incoming = Array.isArray(rawPresets) ? rawPresets : [];
  const normalized = incoming
    .filter((item) => item && typeof item === 'object')
    .map((item) => normalizeWindowSizerPreset(item as Partial<WindowSizerPreset>));
  const byId = new Map<string, WindowSizerPreset>();

  for (const preset of DEFAULT_WINDOW_SIZER_PRESETS) {
    byId.set(preset.id, normalizeWindowSizerPreset(preset, preset));
  }
  for (const preset of normalized) {
    byId.set(preset.id, preset);
  }

  return Array.from(byId.values());
}

function resolveWindowSizerPresetInput(body: Record<string, unknown>): WindowSizerPreset {
  const rawPreset =
    body.preset && typeof body.preset === 'object' && !Array.isArray(body.preset)
      ? (body.preset as Record<string, unknown>)
      : body;
  const presetId = readCapabilityString(body, ['presetId']) || readCapabilityString(rawPreset, ['presetId']);

  if (!presetId) {
    return normalizeWindowSizerPreset(rawPreset as Partial<WindowSizerPreset>);
  }

  const requestedIds = new Set(
    [presetId, presetId.startsWith('builtin-') ? presetId : `builtin-${presetId}`]
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  const settings = loadSettings();
  const presets = normalizeWindowSizerPresets(settings.windowSizer?.presets);
  const matchedPreset = presets.find(
    (preset) => requestedIds.has(preset.id.toLowerCase()) || requestedIds.has(preset.name.toLowerCase()),
  );

  return matchedPreset
    ? normalizeWindowSizerPreset(matchedPreset, matchedPreset)
    : normalizeWindowSizerPreset(rawPreset as Partial<WindowSizerPreset>);
}

function normalizeMainWindowBounds(rawBounds: unknown): WindowBounds | null {
  if (!rawBounds || typeof rawBounds !== 'object' || Array.isArray(rawBounds)) {
    return null;
  }

  const bounds = rawBounds as Partial<WindowBounds>;
  const x = Number(bounds.x);
  const y = Number(bounds.y);
  const width = Number(bounds.width);
  const height = Number(bounds.height);

  if (![x, y, width, height].every(Number.isFinite)) {
    return null;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(MAIN_WINDOW_MIN_WIDTH, Math.round(width)),
    height: Math.max(MAIN_WINDOW_MIN_HEIGHT, Math.round(height)),
  };
}

function resolveMainWindowInitialBounds(bounds: WindowBounds | null): Partial<WindowBounds> {
  const normalized = normalizeMainWindowBounds(bounds);
  if (!normalized) {
    return {
      width: MAIN_WINDOW_DEFAULT_WIDTH,
      height: MAIN_WINDOW_DEFAULT_HEIGHT,
    };
  }
  return constrainWindowBounds(normalized);
}

function constrainWindowBounds(bounds: WindowBounds): WindowBounds {
  const visibleMargin = 80;
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const area = display.workArea;
  return {
    ...bounds,
    x: clamp(bounds.x, area.x - bounds.width + visibleMargin, area.x + area.width - visibleMargin, bounds.x),
    y: clamp(bounds.y, area.y, area.y + area.height - visibleMargin, bounds.y),
  };
}

function buildWindowSizerBounds(win: BrowserWindow, preset: WindowSizerPreset): WindowBounds {
  const current = win.getBounds();
  let nextBounds: WindowBounds = {
    x: current.x,
    y: current.y,
    width: clamp(preset.width, 320, 7680, current.width),
    height: clamp(preset.height, 240, 4320, current.height),
  };

  if (!preset.moveToPosition) {
    return nextBounds;
  }

  if (preset.coordinateMode === 'active-display-workarea') {
    const workArea = screen.getDisplayMatching(current).workArea;
    nextBounds = {
      ...nextBounds,
      x: workArea.x + clamp(preset.x, -100000, 100000, 0),
      y: workArea.y + clamp(preset.y, -100000, 100000, 0),
    };
  } else {
    nextBounds = {
      ...nextBounds,
      x: clamp(preset.x, -100000, 100000, current.x),
      y: clamp(preset.y, -100000, 100000, current.y),
    };
  }

  return preset.allowOutsideDisplay ? nextBounds : constrainWindowBounds(nextBounds);
}

function getDefaultCwd(): string {
  return process.env.USERPROFILE || process.env.HOME || os.homedir();
}

function normalizeCwd(cwd?: string): string {
  if (!cwd) return getDefaultCwd();

  try {
    const resolved = path.resolve(cwd);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return resolved;
    }
  } catch {
    // fall through to default cwd
  }

  return getDefaultCwd();
}

function unquoteShellEnvValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function parseShellEnvironmentText(environmentText: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const rawLine of String(environmentText || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('::') || /^rem\s+/i.test(line)) continue;

    let expression = line;
    const powershellMatch = /^\$env:([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/i.exec(expression);
    if (powershellMatch) {
      env[powershellMatch[1]] = unquoteShellEnvValue(powershellMatch[2]);
      continue;
    }

    const cmdMatch = /^set\s+(.+)$/i.exec(expression);
    if (cmdMatch) {
      expression = cmdMatch[1].trim();
      if (expression.startsWith('"') && expression.endsWith('"')) {
        expression = expression.slice(1, -1);
      }
    }

    const exportMatch = /^export\s+(.+)$/i.exec(expression);
    if (exportMatch) {
      expression = exportMatch[1].trim();
    }

    const eq = expression.indexOf('=');
    if (eq <= 0) continue;
    const key = expression.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    env[key] = unquoteShellEnvValue(expression.slice(eq + 1));
  }
  return env;
}

function formatShellStartupInput(shell: ShellKind, initialCommand: string): string {
  const lines = String(initialCommand || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return '';

  const newline = isPosixShell(shell) || shell === 'wsl' ? '\n' : '\r';
  return lines.map((line) => `${line}${newline}`).join('');
}

function isPosixShell(kind: ShellKind): boolean {
  return kind === 'zsh' || kind === 'bash' || kind === 'sh';
}

function getDefaultShellKindForPlatform(platform = process.platform, env = process.env): ShellKind {
  if (platform === 'win32') return 'powershell';
  const shellName = path.basename(env.SHELL || '').toLowerCase();
  if (shellName === 'zsh' || shellName === 'bash' || shellName === 'sh') {
    return shellName;
  }
  return platform === 'darwin' ? 'zsh' : 'bash';
}

function isShellKindSupportedForPlatform(kind: ShellKind, platform = process.platform): boolean {
  if (platform === 'win32') {
    return kind === 'powershell' || kind === 'cmd' || kind === 'pwsh' || kind === 'wsl';
  }
  if (platform === 'darwin') {
    return kind === 'zsh' || kind === 'bash' || kind === 'sh' || kind === 'pwsh';
  }
  return kind === 'bash' || kind === 'sh' || kind === 'zsh' || kind === 'pwsh';
}

function normalizeShellKindForPlatform(value: unknown, platform = process.platform): ShellKind {
  const shell = typeof value === 'string' ? (value.trim().toLowerCase() as ShellKind) : undefined;
  if (shell && shellKinds.has(shell) && isShellKindSupportedForPlatform(shell, platform)) {
    return shell;
  }
  return getDefaultShellKindForPlatform(platform);
}

function allowedShellKindsForCurrentPlatform(platform = process.platform): ShellKind[] {
  return getShellDescriptorsForPlatform(platform).map((shell) => shell.kind);
}

/**
 * PowerShell prompt hook — OSC 1337;CurrentDir=<path> 시퀀스를 전송해
 * xterm.js가 현재 디렉터리를 감지하고 도킹 탭 제목을 갱신할 수 있게 한다.
 *
 * ⚠️ $host.UI.RawUI.Write() 대신 prompt 반환값에 OSC 시퀀스를 앞에 붙이는 방식 사용.
 *    Write() 방식은 PSReadLine이 "터미널 변조"를 감지해 프롬프트를 반복 출력하는
 *    부작용이 있고, PTY 데이터 스트림에도 올바르게 들어가지 않아 xterm.js 파싱이 실패함.
 *    반환값 방식: xterm.js가 OSC 시퀀스를 파싱 후 뒤따르는 텍스트를 프롬프트로 표시.
 *
 * 실행 순서: PS 시작 → 프로파일 로드 → 이 스크립트 실행 (프로파일 prompt를 래핑)
 * - $esc\$orig: PS 이중 인용 문자열에서 ESC + \ (OSC ST) + 원래 프롬프트 텍스트
 */
const POWERSHELL_CWD_HOOK =
  '$global:__DeskOriginalPrompt = $function:prompt; ' +
  'function global:prompt { ' +
  '$cwd = (Get-Location).Path; ' +
  '$esc = [char]27; ' +
  '$orig = if ($global:__DeskOriginalPrompt) { & $global:__DeskOriginalPrompt } else { "PS $cwd> " }; ' +
  '"$esc]1337;CurrentDir=$cwd$esc\\$orig" ' +
  '}';

interface ResolvedShell {
  command: string;
  args: string[];
  label: string;
}

function resolveWindowsShell(kind: ShellKind): ResolvedShell {
  const systemRoot = process.env.SystemRoot || 'C:\\Windows';

  if (kind === 'cmd') {
    return {
      command: process.env.ComSpec || path.join(systemRoot, 'System32', 'cmd.exe'),
      args: [],
      label: 'Command Prompt',
    };
  }

  if (kind === 'pwsh') {
    return {
      command: 'pwsh.exe',
      args: ['-NoLogo', '-NoExit', '-Command', POWERSHELL_CWD_HOOK],
      label: 'PowerShell 7+',
    };
  }

  if (kind === 'wsl') {
    return {
      command: 'wsl.exe',
      args: [],
      label: 'WSL',
    };
  }

  return {
    command: path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    args: ['-NoLogo', '-NoExit', '-Command', POWERSHELL_CWD_HOOK],
    label: 'Windows PowerShell',
  };
}

function resolveDarwinShell(kind: ShellKind): ResolvedShell {
  if (kind === 'bash') return { command: '/bin/bash', args: ['-l'], label: 'Bash' };
  if (kind === 'sh') return { command: '/bin/sh', args: [], label: 'sh' };
  if (kind === 'pwsh') {
    const homebrewPwsh = '/opt/homebrew/bin/pwsh';
    const intelHomebrewPwsh = '/usr/local/bin/pwsh';
    const command = fs.existsSync(homebrewPwsh)
      ? homebrewPwsh
      : fs.existsSync(intelHomebrewPwsh)
        ? intelHomebrewPwsh
        : 'pwsh';
    return { command, args: ['-NoLogo'], label: 'PowerShell 7+' };
  }
  return { command: '/bin/zsh', args: ['-l'], label: 'zsh' };
}

function resolveLinuxShell(kind: ShellKind): ResolvedShell {
  if (kind === 'zsh') return { command: '/bin/zsh', args: ['-l'], label: 'zsh' };
  if (kind === 'sh') return { command: '/bin/sh', args: [], label: 'sh' };
  if (kind === 'pwsh') return { command: 'pwsh', args: ['-NoLogo'], label: 'PowerShell 7+' };
  return { command: '/bin/bash', args: ['-l'], label: 'Bash' };
}

function resolveShell(kind: ShellKind): ResolvedShell {
  if (process.platform === 'win32') {
    return resolveWindowsShell(kind);
  }

  if (process.platform === 'darwin') {
    return resolveDarwinShell(kind);
  }

  return resolveLinuxShell(kind);
}

function isCommandAvailable(command: string): boolean {
  try {
    if (process.platform === 'win32') {
      const result = spawnSync('where.exe', [command], { windowsHide: true, stdio: 'ignore' });
      return result.status === 0;
    }

    const result = spawnSync('command', ['-v', command], { shell: true, stdio: 'ignore' });
    return result.status === 0;
  } catch {
    return false;
  }
}

function isShellCommandAvailable(command: string, fallbackCommand?: string): boolean {
  if (path.isAbsolute(command)) return fs.existsSync(command);
  return isCommandAvailable(fallbackCommand ?? command);
}

function getShellDescriptorsForPlatform(platform = process.platform): ShellDescriptor[] {
  if (platform === 'win32') {
    const powershell = resolveWindowsShell('powershell');
    const cmd = resolveWindowsShell('cmd');
    const pwsh = resolveWindowsShell('pwsh');

    return [
      {
        kind: 'powershell',
        label: powershell.label,
        command: powershell.command,
        available: fs.existsSync(powershell.command),
      },
      {
        kind: 'cmd',
        label: cmd.label,
        command: cmd.command,
        available: fs.existsSync(cmd.command),
      },
      {
        kind: 'pwsh',
        label: pwsh.label,
        command: pwsh.command,
        available: isCommandAvailable('pwsh.exe'),
      },
      {
        kind: 'wsl',
        label: 'WSL',
        command: 'wsl.exe',
        available: isCommandAvailable('wsl.exe'),
      },
    ];
  }

  if (platform === 'darwin') {
    const zsh = resolveDarwinShell('zsh');
    const bash = resolveDarwinShell('bash');
    const sh = resolveDarwinShell('sh');
    const pwsh = resolveDarwinShell('pwsh');

    return [
      {
        kind: 'zsh',
        label: zsh.label,
        command: zsh.command,
        available: isShellCommandAvailable(zsh.command),
      },
      {
        kind: 'bash',
        label: bash.label,
        command: bash.command,
        available: isShellCommandAvailable(bash.command),
      },
      {
        kind: 'sh',
        label: sh.label,
        command: sh.command,
        available: isShellCommandAvailable(sh.command),
      },
      {
        kind: 'pwsh',
        label: pwsh.label,
        command: pwsh.command,
        available: isShellCommandAvailable(pwsh.command, 'pwsh'),
      },
    ];
  }

  const bash = resolveLinuxShell('bash');
  const sh = resolveLinuxShell('sh');
  const zsh = resolveLinuxShell('zsh');
  const pwsh = resolveLinuxShell('pwsh');

  return [
    {
      kind: 'bash',
      label: bash.label,
      command: bash.command,
      available: isShellCommandAvailable(bash.command),
    },
    {
      kind: 'sh',
      label: sh.label,
      command: sh.command,
      available: isShellCommandAvailable(sh.command),
    },
    {
      kind: 'zsh',
      label: zsh.label,
      command: zsh.command,
      available: isShellCommandAvailable(zsh.command),
    },
    {
      kind: 'pwsh',
      label: pwsh.label,
      command: pwsh.command,
      available: isShellCommandAvailable(pwsh.command, 'pwsh'),
    },
  ];
}

interface TerminalBackendStart {
  kind: TerminalSessionKind;
  shell?: ShellKind;
  profileId?: string;
  command: string;
  cwd: string;
  backend: TerminalBackend;
}

function createShellBackend(
  request: { shell: ShellKind; cwd?: string; profile?: LocalTerminalProfile },
  cols: number,
  rows: number,
  callbacks: TerminalBackendCallbacks,
): TerminalBackendStart {
  const profile = request.profile;
  const shellKind = profile?.shell ?? request.shell;
  if (!shellKinds.has(shellKind) || !isShellKindSupportedForPlatform(shellKind)) {
    throw new Error(`Unsupported shell: ${shellKind}`);
  }

  const cwd = normalizeCwd(profile?.cwd || request.cwd);
  const target = resolveShell(shellKind);
  const appSettings = loadSettings();
  const xamongSettings = appSettings.xamongCode;
  const xamongRuntimePath = resolveConfiguredXamongCodeRuntime(xamongSettings);
  const xamongShimDir = ensureXamongCodeTerminalShim(xamongRuntimePath);
  const baseEnv = {
    ...process.env,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
  } as NodeJS.ProcessEnv;
  const xamongEnv = buildXamongCodeTerminalEnv({
    baseEnv,
    runtimePath: xamongRuntimePath,
    configDir: xamongSettings.configDir || DEFAULT_XAMONG_CODE_CONFIG_DIR,
    apiUrl: `http://${xamongSettings.host || DEFAULT_XAMONG_CODE_API_HOST}:${xamongSettings.port || DEFAULT_XAMONG_CODE_API_PORT}`,
    openAiApiKey: xamongSettings.openAiApiKey || '',
    openAiModel: xamongSettings.openAiModel || '',
    workspacesConfigPath: xamongSettings.workspacesConfigPath || '',
    directGeneralChat: xamongSettings.directGeneralChat !== false,
    directChatModel: xamongSettings.directChatModel || '',
    workerTierPolicies: xamongSettings.workerTierPolicies || '',
    shimDir: xamongShimDir,
  });
  let selectedLocalCliId = appSettings.localCli.selectedAgentId;
  let localCliSettings = appSettings.localCli;
  if (profile) {
    if (profile.localCliAgentId === 'none') {
      localCliSettings = {
        selectedAgentId: selectedLocalCliId,
        autoConfigureTerminal: false,
      };
    } else if (profile.localCliAgentId !== 'default' && localCliAgentIds.has(profile.localCliAgentId)) {
      selectedLocalCliId = profile.localCliAgentId;
      localCliSettings = {
        selectedAgentId: selectedLocalCliId,
        autoConfigureTerminal: true,
      };
    }
  }
  const selectedLocalCli =
    localCliSettings.autoConfigureTerminal === false
      ? null
      : resolveLocalCliAgentStatus(selectedLocalCliId, {
          env: process.env,
          existsSync: fs.existsSync,
          includeVersions: false,
        });
  const env = buildLocalCliTerminalEnv({
    baseEnv: xamongEnv,
    localCli: localCliSettings,
    aiProvider: appSettings.aiProvider,
    xamongCode: xamongSettings,
    selectedAgent: selectedLocalCli,
    mcp: {
      enabled: isMcpServerAvailable(),
      serverPath: getMcpServerScriptPath(),
      bridgeUrl: getMcpBridgeUrl(),
      bridgeToken: mcpBridgeToken,
      stateFilePath: getMcpBridgeStateFilePath(),
      configFilePath: getMcpConfigSnippetFilePath(),
    },
  });
  Object.assign(env, profile ? parseShellEnvironmentText(profile.environmentText) : {});

  const ptyProcess = pty.spawn(target.command, target.args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env,
  });

  ptyProcess.onData(callbacks.onData);
  ptyProcess.onExit(({ exitCode, signal }) => callbacks.onExit(exitCode, signal));
  const startupInput = profile ? formatShellStartupInput(profile.shell, profile.initialCommand) : '';
  if (startupInput) {
    setTimeout(() => {
      try {
        ptyProcess.write(startupInput);
      } catch {
        // shell may have exited before startup command injection
      }
    }, 80);
  }

  return {
    kind: 'shell',
    shell: shellKind,
    profileId: profile?.id || undefined,
    command: target.command,
    cwd,
    backend: {
      pid: ptyProcess.pid,
      write(data: string) {
        ptyProcess.write(data);
      },
      resize(cols: number, rows: number) {
        ptyProcess.resize(cols, rows);
      },
      kill() {
        ptyProcess.kill();
      },
    },
  };
}

let terminalWarmupScheduled = false;

function scheduleTerminalWarmup(delayMs = 1200): void {
  if (terminalWarmupScheduled) return;
  if (!shouldTerminalWarmupRun(process.env)) return;

  terminalWarmupScheduled = true;
  const timer = setTimeout(() => runTerminalWarmup(), Math.max(0, delayMs));
  if (typeof (timer as NodeJS.Timeout).unref === 'function') {
    (timer as NodeJS.Timeout).unref();
  }
}

function runTerminalWarmup(): void {
  const startedAt = Date.now();
  const settings = loadSettings();
  const shell = normalizeShellKindForPlatform(settings.defaultShell);
  const launch = buildTerminalWarmupLaunch({
    shell,
    platform: process.platform,
    env: process.env,
    systemRoot: process.env.SystemRoot,
    cwd: normalizeCwd(settings.defaultCwd || undefined),
  });

  let warmupPty: ReturnType<typeof pty.spawn> | null = null;
  let finished = false;
  const finish = (level: DiagnosticsLogLevel, message: string, detail?: unknown) => {
    if (finished) return;
    finished = true;
    recordDiagnosticLog({
      level,
      source: 'main',
      scope: 'terminal',
      message,
      detail: diagnosticDetailFromUnknown({
        shell: launch.shell,
        command: launch.command,
        args: launch.args,
        cwd: launch.cwd,
        durationMs: Date.now() - startedAt,
        detail,
      }),
    });
  };

  try {
    warmupPty = pty.spawn(launch.command, launch.args, {
      name: 'xterm-256color',
      cols: 20,
      rows: 5,
      cwd: launch.cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });

    const killTimer = setTimeout(() => {
      if (finished) return;
      try {
        warmupPty?.kill();
      } catch {
        /* best effort */
      }
      finish('warn', 'Terminal warmup timed out and was stopped');
    }, 5000);
    if (typeof killTimer.unref === 'function') killTimer.unref();

    warmupPty.onExit(({ exitCode, signal }) => {
      clearTimeout(killTimer);
      finish('info', 'Terminal warmup completed', { exitCode, signal });
    });
  } catch (error) {
    finish('warn', 'Terminal warmup failed', error);
  }
}

function sanitizeRemoteProfile(profile: RemoteTerminalProfile, protocol: 'ssh' | 'telnet'): RemoteTerminalProfile {
  if (!profile || typeof profile !== 'object') {
    throw new Error('Remote terminal profile is required.');
  }
  const host = String(profile.host || '').trim();
  if (!host) {
    throw new Error('Remote terminal host is required.');
  }
  const fallbackPort = protocol === 'ssh' ? 22 : 23;
  return {
    ...profile,
    id: String(profile.id || '').trim(),
    name: String(profile.name || '').trim() || host,
    groupId: String(profile.groupId || '').trim(),
    protocol,
    host,
    port: clamp(profile.port, 1, 65535, fallbackPort),
    username: String(profile.username || '').trim(),
    password: String(profile.password || ''),
    privateKeyPath: String(profile.privateKeyPath || '').trim(),
    passphrase: String(profile.passphrase || ''),
    connectTimeoutMs: clamp(profile.connectTimeoutMs, 1000, 120000, 15000),
    initialCommand: String(profile.initialCommand || ''),
    createdAt: Number.isFinite(profile.createdAt) ? profile.createdAt : Date.now(),
    updatedAt: Number.isFinite(profile.updatedAt) ? profile.updatedAt : Date.now(),
  };
}

function toTerminalData(chunk: Buffer | string | unknown): string {
  return Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');
}

function createSshBackend(
  rawProfile: RemoteTerminalProfile,
  cols: number,
  rows: number,
  callbacks: TerminalBackendCallbacks,
): TerminalBackendStart {
  const profile = sanitizeRemoteProfile(rawProfile, 'ssh');
  const conn = new Client();
  let channel: ClientChannel | null = null;
  let exited = false;

  const finish = (exitCode: number, signal?: number) => {
    if (exited) return;
    exited = true;
    callbacks.onExit(exitCode, signal);
  };

  const connectConfig: ConnectConfig = {
    host: profile.host,
    port: profile.port,
    username: profile.username,
    readyTimeout: profile.connectTimeoutMs,
    keepaliveInterval: 15000,
    keepaliveCountMax: 3,
  };

  if (profile.password) {
    connectConfig.password = profile.password;
  }
  if (profile.privateKeyPath) {
    try {
      connectConfig.privateKey = fs.readFileSync(profile.privateKeyPath);
      if (profile.passphrase) connectConfig.passphrase = profile.passphrase;
    } catch (error) {
      throw new Error(`Cannot read private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  conn.on('ready', () => {
    conn.shell({ term: 'xterm-256color', cols, rows }, (err, stream) => {
      if (err) {
        callbacks.onData(`\r\n\x1b[31mSSH shell failed: ${err.message}\x1b[0m\r\n`);
        conn.end();
        finish(1);
        return;
      }

      channel = stream;
      stream.on('data', (data: Buffer) => callbacks.onData(toTerminalData(data)));
      stream.stderr.on('data', (data: Buffer) => callbacks.onData(toTerminalData(data)));
      stream.on('close', () => {
        conn.end();
        finish(0);
      });

      if (profile.initialCommand.trim()) {
        stream.write(`${profile.initialCommand.replace(/\r?\n$/, '')}\n`);
      }
    });
  });

  conn.on('error', (error) => {
    recordDiagnosticLog({
      level: 'error',
      source: 'terminal',
      scope: profile.name || profile.host,
      message: `SSH error: ${error.message}`,
      detail: error.stack,
    });
    callbacks.onData(`\r\n\x1b[31mSSH error: ${error.message}\x1b[0m\r\n`);
    finish(1);
  });
  conn.on('close', () => finish(exited ? 0 : 0));

  conn.connect(connectConfig);

  return {
    kind: 'ssh',
    profileId: profile.id,
    command: `ssh://${profile.username ? `${profile.username}@` : ''}${profile.host}:${profile.port}`,
    cwd: '',
    backend: {
      pid: 0,
      write(data: string) {
        channel?.write(data);
      },
      resize(cols: number, rows: number) {
        channel?.setWindow(rows, cols, 0, 0);
      },
      kill() {
        try {
          channel?.end();
        } catch {
          /* ignore */
        }
        try {
          conn.end();
        } catch {
          /* ignore */
        }
        finish(0);
      },
    },
  };
}

const IAC = 255;
const DONT = 254;
const DO = 253;
const WONT = 252;
const WILL = 251;
const SB = 250;
const SE = 240;
const TELNET_ECHO = 1;
const TELNET_SUPPRESS_GO_AHEAD = 3;

function negotiateTelnetOptions(data: Buffer, socket: net.Socket): Buffer {
  const output: number[] = [];
  for (let i = 0; i < data.length; i += 1) {
    const byte = data[i];
    if (byte !== IAC) {
      output.push(byte);
      continue;
    }

    const command = data[++i];
    if (command === IAC) {
      output.push(IAC);
      continue;
    }

    if (command === SB) {
      while (i < data.length - 1) {
        i += 1;
        if (data[i] === IAC && data[i + 1] === SE) {
          i += 1;
          break;
        }
      }
      continue;
    }

    if (command === DO || command === DONT || command === WILL || command === WONT) {
      const option = data[++i];
      if (option === undefined) continue;
      if (command === DO) {
        socket.write(Buffer.from([IAC, WONT, option]));
      } else if (command === WILL) {
        const accept = option === TELNET_ECHO || option === TELNET_SUPPRESS_GO_AHEAD;
        socket.write(Buffer.from([IAC, accept ? DO : DONT, option]));
      }
    }
  }
  return Buffer.from(output);
}

function createTelnetBackend(
  rawProfile: RemoteTerminalProfile,
  callbacks: TerminalBackendCallbacks,
): TerminalBackendStart {
  const profile = sanitizeRemoteProfile(rawProfile, 'telnet');
  const socket = net.createConnection({ host: profile.host, port: profile.port, timeout: profile.connectTimeoutMs });
  let exited = false;
  let usernameSent = false;
  let passwordSent = false;

  const finish = (exitCode: number) => {
    if (exited) return;
    exited = true;
    callbacks.onExit(exitCode);
  };

  socket.on('connect', () => {
    if (profile.initialCommand.trim()) {
      socket.write(`${profile.initialCommand.replace(/\r?\n$/, '')}\r\n`);
    }
  });
  socket.on('data', (chunk) => {
    const payload = negotiateTelnetOptions(chunk, socket);
    if (payload.length <= 0) return;

    const text = payload.toString('utf8');
    callbacks.onData(text);
    const lower = text.toLowerCase();
    if (!usernameSent && profile.username && /(login|username)[: ]*$/.test(lower)) {
      usernameSent = true;
      socket.write(`${profile.username}\r\n`);
    } else if (!passwordSent && profile.password && /password[: ]*$/.test(lower)) {
      passwordSent = true;
      socket.write(`${profile.password}\r\n`);
    }
  });
  socket.on('timeout', () => {
    callbacks.onData('\r\n\x1b[31mTELNET timeout\x1b[0m\r\n');
    socket.destroy();
    finish(1);
  });
  socket.on('error', (error) => {
    recordDiagnosticLog({
      level: 'error',
      source: 'terminal',
      scope: profile.name || profile.host,
      message: `TELNET error: ${error.message}`,
      detail: error.stack,
    });
    callbacks.onData(`\r\n\x1b[31mTELNET error: ${error.message}\x1b[0m\r\n`);
    finish(1);
  });
  socket.on('close', () => finish(exited ? 0 : 0));

  return {
    kind: 'telnet',
    profileId: profile.id,
    command: `telnet://${profile.host}:${profile.port}`,
    cwd: '',
    backend: {
      pid: 0,
      write(data: string) {
        if (!socket.destroyed) socket.write(data);
      },
      resize() {
        // TELNET NAWS support varies by server; xterm visual resize still applies locally.
      },
      kill() {
        socket.destroy();
        finish(0);
      },
    },
  };
}

function sendToRenderer(window: BrowserWindow | null, channel: string, payload: unknown): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, payload);
  }
}

function emitTerminalDisplayOutput(record: SessionRecord, data: string): boolean {
  if (record.ownerWindowId === null) return false;
  const ownerWin = getWindowById(record.ownerWindowId);
  if (!ownerWin || ownerWin.isDestroyed()) return false;
  const payload: TerminalDataEvent = { id: record.id, data };
  sendToRenderer(ownerWin, `terminal:data:${record.id}`, payload);
  return true;
}

async function writeTerminalImageToDisplay(
  session: SessionRecord,
  source: string | Buffer,
  options: TerminalImageOptions = {},
) {
  let delivered = false;
  const result = await writeTerminalImage(
    (data) => {
      delivered = emitTerminalDisplayOutput(session, data) || delivered;
    },
    source,
    options,
  );
  if (result.ok && !delivered) {
    return { ...result, ok: false, error: 'Terminal renderer is not attached.' };
  }
  return result;
}

async function writeTerminalXconImageToDisplay(session: SessionRecord, xcon: string, options: XconRenderOptions = {}) {
  let delivered = false;
  const result = await writeTerminalXconImage(
    (data) => {
      delivered = emitTerminalDisplayOutput(session, data) || delivered;
    },
    xcon,
    options,
  );
  if (result.ok && !delivered) {
    return { ...result, ok: false, error: 'Terminal renderer is not attached.' };
  }
  return result;
}

function getMcpBridgeUrl(): string {
  return `http://${MCP_BRIDGE_HOST}:${mcpBridgePort}`;
}

function getMcpServerScriptPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'mcp', 'xenesis-desk-mcp-server.mjs');
  }
  return path.resolve(process.cwd(), 'mcp', 'xenesis-desk-mcp-server.mjs');
}

function isMcpServerAvailable(): boolean {
  return fs.existsSync(getMcpServerScriptPath());
}

function getPlaywrightWorkerScriptPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'mcp', 'playwright-worker.mjs');
  }
  return path.resolve(process.cwd(), 'mcp', 'playwright-worker.mjs');
}

function normalizePlaywrightWorkerTimeout(args: { timeoutMs?: unknown }): number {
  const parsed = Number(args?.timeoutMs);
  if (!Number.isFinite(parsed)) return 60000;
  return Math.max(500, Math.min(parsed, 180000));
}

function runPlaywrightWorker(
  operation: 'snapshot' | 'run',
  request: WorkflowPlaywrightSnapshotRequest | WorkflowPlaywrightRunRequest,
): Promise<WorkflowPlaywrightResult> {
  const workerPath = getPlaywrightWorkerScriptPath();
  if (!fs.existsSync(workerPath)) {
    return Promise.resolve({ ok: false, operation, error: `Playwright worker not found: ${workerPath}` });
  }

  return new Promise((resolve) => {
    const timeoutMs = normalizePlaywrightWorkerTimeout(request);
    const processTimeoutMs = Math.max(timeoutMs + 10000, 15000);
    const nodePath = process.platform === 'win32' ? 'node.exe' : 'node';
    const child = spawn(nodePath, [workerPath], {
      cwd: path.resolve(path.dirname(workerPath), '..'),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const maxOutputBytes = 1024 * 1024;

    const finish = (result: WorkflowPlaywrightResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish({ ok: false, operation, error: `Playwright worker timed out after ${processTimeoutMs}ms.` });
    }, processTimeoutMs);

    const stdoutStream = child.stdout;
    const stderrStream = child.stderr;
    const stdinStream = child.stdin;
    if (!stdoutStream || !stderrStream || !stdinStream) {
      finish({ ok: false, operation, error: 'Playwright worker stdio streams are not available.' });
      return;
    }

    stdoutStream.setEncoding('utf8');
    stderrStream.setEncoding('utf8');
    stdoutStream.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.length > maxOutputBytes) {
        child.kill();
        finish({ ok: false, operation, error: 'Playwright worker output exceeded the maximum size.' });
      }
    });
    stderrStream.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      finish({ ok: false, operation, error: error.message });
    });
    child.on('close', (code) => {
      if (settled) return;
      let payload: WorkflowPlaywrightResult | null = null;
      try {
        payload = JSON.parse(stdout.trim() || '{}') as WorkflowPlaywrightResult;
      } catch {
        payload = null;
      }
      if (!payload || typeof payload.ok !== 'boolean') {
        finish({ ok: false, operation, error: stderr.trim() || 'Playwright worker returned invalid JSON.' });
        return;
      }
      if (code !== 0 && payload.ok !== false) {
        finish({
          ...payload,
          ok: false,
          operation,
          error: stderr.trim() || `Playwright worker exited with code ${code}.`,
        });
        return;
      }
      finish({ operation, ...payload });
    });
    stdinStream.end(JSON.stringify({ ...request, operation }));
  });
}

function getPlaywrightResultScreenshotPath(result: WorkflowPlaywrightResult): string {
  const payload = result as WorkflowPlaywrightResult & {
    filePath?: unknown;
    screenshotFilePath?: unknown;
    artifacts?: unknown;
  };
  const screenshotFilePath = typeof payload.screenshotFilePath === 'string' ? payload.screenshotFilePath.trim() : '';
  const directPath = screenshotFilePath || (typeof payload.filePath === 'string' ? payload.filePath.trim() : '');
  if (directPath) return directPath;

  const artifacts: unknown[] = Array.isArray(payload.artifacts) ? payload.artifacts : [];
  const screenshotArtifact = artifacts.find(
    (artifact) =>
      Boolean(artifact) &&
      typeof artifact === 'object' &&
      (artifact as { type?: unknown }).type === 'screenshot' &&
      typeof (artifact as { filePath?: unknown }).filePath === 'string',
  ) as { filePath?: string } | undefined;
  return typeof screenshotArtifact?.filePath === 'string' ? screenshotArtifact.filePath.trim() : '';
}

async function runMcpBridgePlaywright(operation: 'snapshot' | 'run', body: unknown): Promise<Record<string, unknown>> {
  const request = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const result = await runPlaywrightWorker(
    operation,
    request as unknown as WorkflowPlaywrightSnapshotRequest | WorkflowPlaywrightRunRequest,
  );
  const response: Record<string, unknown> = {
    success: Boolean(result.ok),
    ...result,
  };
  const shouldOpenInDesk = operation === 'snapshot' ? request.openInDesk !== false : request.openInDesk === true;

  if (shouldOpenInDesk) {
    response.openInDesk = true;
    response.opened = false;
  }

  if (result.ok && shouldOpenInDesk) {
    const filePath = getPlaywrightResultScreenshotPath(result);
    if (filePath) {
      const placement = normalizeMcpPanelPlacement(request.placement);
      const targetPaneId = normalizeMcpTargetPaneId(request.targetPaneId);
      const renderOptions = normalizeMcpRenderOptions(request.renderOptions);
      if (sendMcpOpenFileToRenderer(filePath, placement, targetPaneId, renderOptions)) {
        response.opened = true;
        if (targetPaneId) response.targetPaneId = targetPaneId;
      } else {
        response.openError = 'Xenesis Desk renderer window is not available';
      }
    } else {
      response.openError =
        operation === 'run'
          ? 'Open in Xenesis Desk skipped: no screenshot artifact.'
          : 'Open in Xenesis Desk skipped: no screenshot file path.';
    }
  }

  return response;
}

function mcpBridgeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeMcpBridgePathPayload(value: unknown): Record<string, unknown> {
  return normalizeBridgePathFields(mcpBridgeRecord(value), { platform: process.platform });
}

interface XconPdfExportResult {
  filePath: string;
  pdfPath: string;
  title: string;
  pdfFileName: string;
  pdfOutDir: string;
  pdfBytes: number;
}

const XCON_PDF_PAGE_WIDTH_MM = 210;
const XCON_PDF_PAGE_HORIZONTAL_MARGIN_MM = 16;
const XCON_PDF_PRINTABLE_WIDTH_MM = XCON_PDF_PAGE_WIDTH_MM - XCON_PDF_PAGE_HORIZONTAL_MARGIN_MM * 2;

function sanitizePdfFileName(value: unknown, sourceFilePath: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const fallbackBase = path.basename(sourceFilePath, path.extname(sourceFilePath)) || 'xcon-artifact';
  const baseName = raw ? path.basename(raw) : `${fallbackBase}.pdf`;
  const safeName =
    baseName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || `${fallbackBase}.pdf`;
  return safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;
}

function normalizePdfExportOutDir(value: unknown, sourceFilePath: string): string {
  const raw = normalizeBridgePathForPlatform(String(value || '').trim(), { platform: process.platform });
  if (!raw) return path.dirname(sourceFilePath);
  if (path.isAbsolute(raw)) return path.resolve(raw);
  return path.resolve(getDefaultExportsDir(), raw);
}

function markdownTitleForPdf(content: string, sourceFilePath: string): string {
  const match = String(content || '').match(/^#\s+(.+)$/m);
  const title = match?.[1]?.trim();
  return title || path.basename(sourceFilePath, path.extname(sourceFilePath)) || 'XCON/SKETCH Document';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdownForPdf(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderMarkdownSegmentForPdf(markdown: string): string {
  const lines = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let inList = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInlineMarkdownForPdf(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!inList) return;
    html.push('</ul>');
    inList = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(6, heading[1].length);
      html.push(`<h${level}>${renderInlineMarkdownForPdf(heading[2])}</h${level}>`);
      continue;
    }

    const listItem = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listItem) {
      flushParagraph();
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${renderInlineMarkdownForPdf(listItem[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  return html.join('\n');
}

function detectPdfXconSyntax(code: string): XconSyntax {
  const trimmed = String(code || '').trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<')) return 'xml';
  if (/^(screen|form|panel)\b/i.test(trimmed)) return 'sketch';
  return 'tagless';
}

function getPdfXconSyntax(info: string, code: string): XconSyntax | null {
  const lang =
    String(info || '')
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase() || '';
  if (!lang) return null;
  if (lang === 'xcon') return detectPdfXconSyntax(code);
  if (lang === 'xcon-json' || lang === 'xconj') return 'json';
  if (lang === 'xcon-xml' || lang === 'xconx') return 'xml';
  if (lang === 'xcon-tagless' || lang === 'xconl' || lang === 'xcont') return 'tagless';
  if (lang === 'xcon-sketch' || lang === 'xcons' || lang === 'sketch') return 'sketch';
  return null;
}

function renderXconFenceForPdf(info: string, code: string): string | null {
  const syntax = getPdfXconSyntax(info, code);
  if (!syntax) return null;

  try {
    const document = syntax === 'sketch' ? fromSketchLenient(code).document : parseBySyntax(code, syntax);
    return [
      '<section class="xcon-pdf-block">',
      '<div class="xcon-pdf-fit">',
      `<div class="xcon-pdf-render" data-xcon-theme="light">${renderToHtml(document, { allowExternalResources: true, allowHtml: true })}</div>`,
      '</div>',
      '</section>',
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      '<section class="xcon-pdf-block xcon-pdf-block-error">',
      '<strong>XCON render error</strong>',
      `<pre>${escapeHtml(message)}</pre>`,
      `<pre>${escapeHtml(code)}</pre>`,
      '</section>',
    ].join('\n');
  }
}

function fitXconPdfBlocksForPrint(): string {
  return [
    '(() => {',
    '  const probe = document.createElement("div");',
    `  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:${XCON_PDF_PRINTABLE_WIDTH_MM}mm;height:1px;left:-10000px;top:-10000px;";`,
    '  document.body.appendChild(probe);',
    '  const printableWidth = Math.max(1, probe.getBoundingClientRect().width || 1);',
    '  probe.remove();',
    "  const blocks = Array.from(document.querySelectorAll('.xcon-pdf-fit'));",
    '  for (const block of blocks) {',
    "    const render = block.querySelector('.xcon-pdf-render');",
    '    if (!render) continue;',
    '    render.style.transform = "";',
    '    render.style.width = "";',
    '    render.style.height = "";',
    '    block.style.height = "";',
    '    const measuredWidth = block.clientWidth || block.getBoundingClientRect().width || printableWidth;',
    '    const availableWidth = Math.max(1, Math.min(measuredWidth, printableWidth));',
    '    const renderRect = render.getBoundingClientRect();',
    '    const childRects = Array.from(render.children).map(child => child.getBoundingClientRect());',
    '    const childContentWidth = childRects.reduce((max, childRect) => Math.max(max, childRect.right - renderRect.left), 0);',
    '    const childContentHeight = childRects.reduce((max, childRect) => Math.max(max, childRect.bottom - renderRect.top), 0);',
    '    const contentWidth = Math.max(render.scrollWidth || 0, renderRect.width || 0, childContentWidth, 1);',
    '    const contentHeight = Math.max(render.scrollHeight || 0, renderRect.height || 0, childContentHeight, 1);',
    '    const scale = Math.min(1, availableWidth / contentWidth);',
    '    render.style.transformOrigin = "top left";',
    '    render.style.transform = `scale(${scale})`;',
    '    render.style.width = `${contentWidth}px`;',
    '    render.style.height = `${contentHeight}px`;',
    '    block.style.height = `${Math.ceil(contentHeight * scale)}px`;',
    '  }',
    '  return true;',
    '})()',
  ].join('\n');
}

function markdownToPdfExportHtml(markdown: string, title: string, sourceFilePath: string): string {
  const source = String(markdown || '').replace(/\r\n/g, '\n');
  const fencePattern = /^```([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm;
  const body: string[] = [];
  let offset = 0;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(source))) {
    body.push(renderMarkdownSegmentForPdf(source.slice(offset, match.index)));
    const info = match[1] || '';
    const code = match[2] || '';
    const xconHtml = renderXconFenceForPdf(info, code);
    body.push(xconHtml ?? `<pre class="code-block"><code>${escapeHtml(code)}</code></pre>`);
    offset = match.index + match[0].length;
  }
  body.push(renderMarkdownSegmentForPdf(source.slice(offset)));

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    '<style>',
    '@page { size: A4; margin: 18mm 16mm; }',
    'html, body { margin: 0; padding: 0; background: #ffffff; color: #111827; }',
    'body { font-family: "Segoe UI", Arial, sans-serif; font-size: 13px; line-height: 1.58; }',
    'main { width: 100%; max-width: none; margin: 0; padding: 0; }',
    '.doc-meta { color: #64748b; font-size: 10px; margin-bottom: 18px; word-break: break-all; }',
    'h1 { font-size: 28px; margin: 0 0 10px; line-height: 1.2; }',
    'h2 { font-size: 21px; margin: 24px 0 8px; }',
    'h3 { font-size: 17px; margin: 20px 0 6px; }',
    'p { margin: 8px 0; }',
    'ul { margin: 8px 0 12px 22px; padding: 0; }',
    'li { margin: 4px 0; }',
    'code { font-family: Consolas, "Cascadia Mono", monospace; font-size: 0.92em; background: #f1f5f9; padding: 1px 4px; border-radius: 4px; }',
    'pre { white-space: pre-wrap; word-break: break-word; background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow: visible; }',
    '.xcon-pdf-block { margin: 16px 0 22px; page-break-inside: avoid; }',
    `.xcon-pdf-fit { width: ${XCON_PDF_PRINTABLE_WIDTH_MM}mm; max-width: 100%; overflow: hidden; box-sizing: border-box; }`,
    '.xcon-pdf-render { display: inline-block; overflow: visible; max-width: none; }',
    '.xcon-pdf-block-error { border: 1px solid #fca5a5; background: #fff1f2; padding: 12px; border-radius: 8px; }',
    viewerCss,
    '</style>',
    '</head>',
    '<body>',
    '<main>',
    `<div class="doc-meta">Source: ${escapeHtml(sourceFilePath)}</div>`,
    body.join('\n'),
    '</main>',
    '</body>',
    '</html>',
  ].join('\n');
}

async function exportXconMarkdownToPdf(raw: unknown): Promise<XconPdfExportResult> {
  const body = mcpBridgeRecord(raw);
  const rawFilePath = typeof body.filePath === 'string' ? body.filePath.trim() : '';
  const filePath = normalizeBridgePathForPlatform(rawFilePath, { platform: process.platform });
  if (!filePath || !path.isAbsolute(filePath)) {
    throw new Error('filePath must be an absolute path');
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const markdown = await fs.promises.readFile(filePath, 'utf8');
  const title = String(body.title || '').trim() || markdownTitleForPdf(markdown, filePath);
  const pdfOutDir = normalizePdfExportOutDir(body.pdfOutDir ?? body.outDir, filePath);
  const pdfFileName = sanitizePdfFileName(body.pdfFileName, filePath);
  const pdfPath = path.join(pdfOutDir, pdfFileName);
  const html = markdownToPdfExportHtml(markdown, title, filePath);

  await fs.promises.mkdir(pdfOutDir, { recursive: true });

  const pdfWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  try {
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await pdfWindow.webContents.executeJavaScript(
      'document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true, () => true) : true',
      true,
    );
    await pdfWindow.webContents.executeJavaScript(fitXconPdfBlocksForPrint(), true);
    const pdfBuffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        marginType: 'custom',
        top: 0.32,
        bottom: 0.32,
        left: 0.28,
        right: 0.28,
      },
      preferCSSPageSize: true,
    });
    await fs.promises.writeFile(pdfPath, pdfBuffer);
    return {
      filePath,
      pdfPath,
      title,
      pdfFileName,
      pdfOutDir,
      pdfBytes: pdfBuffer.byteLength,
    };
  } finally {
    if (!pdfWindow.isDestroyed()) {
      pdfWindow.close();
    }
  }
}

function mcpToolPayloadFromEnvelope(envelope: unknown, toolName: string): Record<string, unknown> {
  const outer = mcpBridgeRecord(envelope);
  const outerError = outer.error;
  if (outerError) {
    const errorObject = mcpBridgeRecord(outerError);
    return {
      ok: false,
      success: false,
      error: String(errorObject.message || outerError || `Xenesis Desk MCP tool failed: ${toolName}`),
    };
  }

  const result = mcpBridgeRecord(outer.result);
  const structured = mcpBridgeRecord(result.structuredContent);
  const content = Array.isArray(result.content) ? result.content : [];
  const text = content
    .map((item) => mcpBridgeRecord(item))
    .filter((item) => item.type === 'text' && typeof item.text === 'string')
    .map((item) => String(item.text))
    .filter(Boolean)
    .join('\n');
  const isError = Boolean(result.isError);
  const payload: Record<string, unknown> = { ...structured };

  if (!Object.hasOwn(payload, 'ok')) payload.ok = !isError;
  if (!Object.hasOwn(payload, 'success')) payload.success = !isError;
  if (text && !Object.hasOwn(payload, 'message')) payload.message = text;
  if (isError) {
    payload.ok = false;
    payload.success = false;
    if (!payload.error) payload.error = text || `Xenesis Desk MCP tool failed: ${toolName}`;
  }
  return payload;
}

function runMcpServerTool(toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const serverPath = getMcpServerScriptPath();
  if (!fs.existsSync(serverPath)) {
    return Promise.resolve({
      ok: false,
      success: false,
      error: `Xenesis Desk MCP server not found: ${serverPath}`,
      serverPath,
    });
  }

  return new Promise((resolve) => {
    const nodePath = process.platform === 'win32' ? 'node.exe' : 'node';
    const child = spawn(nodePath, [serverPath], {
      cwd: path.resolve(path.dirname(serverPath), '..'),
      env: {
        ...process.env,
        XENIS_MCP_BRIDGE_URL: getMcpBridgeUrl(),
        XENIS_MCP_BRIDGE_TOKEN: mcpBridgeToken,
        XENIS_MCP_STATE_FILE: getMcpBridgeStateFilePath(),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const maxOutputBytes = 1024 * 1024;

    const finish = (payload: Record<string, unknown>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(payload);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish({
        ok: false,
        success: false,
        error: `Xenesis Desk MCP tool timed out after ${MCP_TOOL_TIMEOUT_MS}ms: ${toolName}`,
      });
    }, MCP_TOOL_TIMEOUT_MS);

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
      if (stdout.length > maxOutputBytes) {
        child.kill();
        finish({ ok: false, success: false, error: 'Xenesis Desk MCP tool output exceeded the maximum size.' });
      }
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
      if (stderr.length > maxOutputBytes) {
        child.kill();
        finish({ ok: false, success: false, error: 'Xenesis Desk MCP tool error output exceeded the maximum size.' });
      }
    });
    child.on('error', (error) =>
      finish({
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    child.on('close', (code) => {
      if (settled) return;
      const stdoutLine = stdout.split(/\r?\n/).find((line) => line.trim());
      if (!stdoutLine) {
        finish({
          ok: false,
          success: false,
          error: stderr.trim() || `Xenesis Desk MCP tool returned no output: ${toolName}`,
        });
        return;
      }
      let envelope: unknown;
      try {
        envelope = JSON.parse(stdoutLine);
      } catch (error) {
        finish({
          ok: false,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }
      const payload = mcpToolPayloadFromEnvelope(envelope, toolName);
      if (code !== 0 && payload.success !== false && payload.ok !== false) {
        payload.success = false;
        payload.ok = false;
        payload.error = stderr.trim() || `Xenesis Desk MCP tool exited with code ${code}: ${toolName}`;
      }
      finish(payload);
    });

    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    };
    child.stdin?.end(`${JSON.stringify(request)}\n`);
  });
}

function getMcpBridgeStateFilePath(): string {
  return path.join(getMcpDir(), 'bridge.json');
}

function getMcpConfigSnippetFilePath(): string {
  return path.join(getMcpDir(), 'xenesis-mcp-config.json');
}

function getMcpSettingsStatus(): McpSettingsStatus {
  return {
    available: isMcpServerAvailable(),
    serverPath: getMcpServerScriptPath(),
    bridgeUrl: isMcpServerAvailable() ? getMcpBridgeUrl() : '',
    bridgeStatePath: getMcpBridgeStateFilePath(),
    configFilePath: getMcpConfigSnippetFilePath(),
  };
}

async function getXenesisConnectionsStatus(): Promise<XenesisConnectionsStatus> {
  const settings = loadSettings();
  return buildXenesisConnectionsStatus({
    aiProvider: settings.aiProvider,
    mcp: getMcpSettingsStatus(),
    providerIntegration: getProviderIntegrationStatusSnapshot(),
    xenesis: await getXenesisStatusPayload(),
    repoRoot: app.isPackaged ? app.getAppPath() : process.cwd(),
  });
}

function getProviderIntegrationAssetRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'provider-assets');
  }
  return path.resolve(process.cwd(), 'providers');
}

function getProviderIntegrationBackupRoot(): string {
  return path.join(xenisHomeDir, 'integration-backups');
}

function getProviderIntegrationStatusSnapshot(request?: ProviderIntegrationStatusRequest): ProviderIntegrationStatus {
  return getProviderIntegrationStatus({
    assetRoot: getProviderIntegrationAssetRoot(),
    hermesRoot: typeof request?.hermesRoot === 'string' ? request.hermesRoot : '',
  });
}

function runProviderIntegrationCliInstall(
  request?: ProviderIntegrationCliInstallRequest,
): ProviderIntegrationCliInstallResult {
  try {
    const targetId = request?.targetId;
    if (!targetId) {
      return {
        ok: false,
        error: 'CLI integration target is required.',
      };
    }
    return installCliIntegration({
      targetId,
      installMcp: request?.installMcp !== false,
      installSkill: request?.installSkill !== false,
      serverPath: getMcpServerScriptPath(),
      xenisHome: xenisHomeDir,
      backupRoot: getProviderIntegrationBackupRoot(),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function runProviderIntegrationHermesInstall(
  request?: ProviderIntegrationHermesInstallRequest,
): ProviderIntegrationHermesInstallResult {
  try {
    return installHermesPlugins({
      assetRoot: getProviderIntegrationAssetRoot(),
      hermesRoot: typeof request?.hermesRoot === 'string' ? request.hermesRoot : '',
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function clearMcpBridgeStateFiles(): void {
  for (const filePath of [getMcpBridgeStateFilePath(), getMcpConfigSnippetFilePath()]) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Stale MCP metadata cleanup is best-effort only.
    }
  }
}

function writeMcpBridgeStateFile(): void {
  if (!isMcpServerAvailable()) {
    clearMcpBridgeStateFiles();
    return;
  }

  try {
    const filePath = getMcpBridgeStateFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          bridgeUrl: getMcpBridgeUrl(),
          bridgeToken: mcpBridgeToken,
          serverPath: getMcpServerScriptPath(),
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );
    fs.writeFileSync(
      getMcpConfigSnippetFilePath(),
      buildMcpConfigSnippet({
        serverPath: getMcpServerScriptPath(),
        bridgeUrl: getMcpBridgeUrl(),
        bridgeToken: mcpBridgeToken,
        stateFilePath: getMcpBridgeStateFilePath(),
      }),
      'utf8',
    );
  } catch (error) {
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'mcp',
      message: 'Failed to write Xenesis Desk MCP bridge state file',
      detail: diagnosticDetailFromUnknown(error),
    });
  }
}

function readRequestJson(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    req.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > 1024 * 1024) {
        reject(new Error('Request body is too large'));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function writeBridgeJson(res: http.ServerResponse, statusCode: number, payload: unknown): void {
  completeMcpBridgeRequestObservation(res, statusCode, payload);
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function isMcpBridgeRequestAuthorized(req: http.IncomingMessage): boolean {
  const authorization = String(req.headers.authorization || '');
  const headerToken = String(req.headers['x-xenesis-mcp-token'] || '');
  const bearerToken = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : '';
  return bearerToken === mcpBridgeToken || headerToken === mcpBridgeToken;
}

function getMcpTargetWindow(): BrowserWindow | null {
  return mainWindowRef && !mainWindowRef.isDestroyed()
    ? mainWindowRef
    : (BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null);
}

function getMainObservabilityWindow(preferred?: MainObservabilityWindow | null): MainObservabilityWindow | null {
  if (preferred && !preferred.isDestroyed()) return preferred;
  return getMcpTargetWindow();
}

setConnectorObservabilitySink((event) => {
  emitMainObservabilityOperation(getMainObservabilityWindow(mainWindowRef), event);
});

interface McpBridgeRequestObservation {
  id: string;
  targetWindow: MainObservabilityWindow | null;
}

const mcpBridgeRequestObservations = new WeakMap<http.ServerResponse, McpBridgeRequestObservation>();

function startMcpBridgeRequestObservation(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  method: string,
  url: URL,
): void {
  const id = `main-mcp-bridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const targetWindow = getMainObservabilityWindow();
  const pathWithSearch = `${url.pathname}${url.search}`;
  mcpBridgeRequestObservations.set(res, { id, targetWindow });
  emitMainObservabilityOperation(targetWindow, {
    id,
    phase: 'start',
    activity: {
      source: 'mcp',
      label: 'mcp.bridge.request',
      detail: `${method} ${pathWithSearch}`,
    },
    network: {
      source: 'mcp',
      method,
      url: `${getMcpBridgeUrl()}${pathWithSearch}`,
    },
  });
}

function completeMcpBridgeRequestObservation(res: http.ServerResponse, statusCode: number, payload: unknown): void {
  const observation = mcpBridgeRequestObservations.get(res);
  if (!observation) return;
  mcpBridgeRequestObservations.delete(res);
  emitMainObservabilityOperation(observation.targetWindow, {
    id: observation.id,
    phase: 'complete',
    ok: statusCode < 400,
    status: statusCode,
    statusText: statusCode < 400 ? 'OK' : 'Error',
    responseBody: summarizeMainObservabilityPayload(payload, 1200),
    error: statusCode < 400 ? undefined : summarizeMainObservabilityPayload(payload, 600),
  });
}

interface TerminalOutputObservationBuffer {
  bytes: number;
  preview: string;
  windowId: number | null;
  timer: NodeJS.Timeout;
}

const terminalOutputObservations = new Map<string, TerminalOutputObservationBuffer>();

function stripTerminalControlForObservation(text: string): string {
  return text
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function flushTerminalOutputObservation(id: string): void {
  const buffered = terminalOutputObservations.get(id);
  if (!buffered) return;
  terminalOutputObservations.delete(id);
  const targetWindow = buffered.windowId !== null ? getWindowById(buffered.windowId) : getMainObservabilityWindow();
  emitMainInstantOperation(
    getMainObservabilityWindow(targetWindow),
    {
      activity: {
        source: 'terminal',
        label: 'terminal.output',
        detail: `id=${id} bytes=${buffered.bytes}${buffered.preview ? ` preview=${buffered.preview}` : ''}`,
      },
    },
    {
      responseBody: {
        id,
        bytes: buffered.bytes,
        preview: buffered.preview,
      },
    },
  );
}

function recordTerminalOutputObservation(ownerWin: BrowserWindow | null, id: string, data: string): void {
  if (!id || !data) return;
  const current = terminalOutputObservations.get(id);
  const preview = stripTerminalControlForObservation(data).slice(0, 220);
  if (current) {
    current.bytes += Buffer.byteLength(data, 'utf8');
    if (preview && current.preview.length < 220) {
      current.preview = `${current.preview}${current.preview ? ' ' : ''}${preview}`.slice(0, 220);
    }
    return;
  }
  const timer = setTimeout(() => flushTerminalOutputObservation(id), 750);
  if (typeof timer.unref === 'function') timer.unref();
  terminalOutputObservations.set(id, {
    bytes: Buffer.byteLength(data, 'utf8'),
    preview,
    windowId: ownerWin?.id ?? null,
    timer,
  });
}

function recordTerminalExitObservation(
  ownerWin: BrowserWindow | null,
  id: string,
  exitCode: number,
  signal?: number,
): void {
  const pending = terminalOutputObservations.get(id);
  if (pending) {
    clearTimeout(pending.timer);
    flushTerminalOutputObservation(id);
  }
  emitMainInstantOperation(
    getMainObservabilityWindow(ownerWin),
    {
      activity: {
        source: 'terminal',
        label: 'terminal.exit',
        detail: `id=${id} exitCode=${exitCode}${signal ? ` signal=${signal}` : ''}`,
      },
    },
    {
      ok: Number(exitCode || 0) === 0 && !signal,
      status: Number(exitCode || 0) === 0 && !signal ? 200 : 500,
      responseBody: { id, exitCode, signal },
      error: Number(exitCode || 0) === 0 && !signal ? undefined : { id, exitCode, signal },
    },
  );
}

function recordXenesisRunEventObservation(targetWindow: BrowserWindow | null, event: XenesisRunEvent): void {
  const observation = createXenesisRunEventObservation(event);
  emitMainInstantOperation(getMainObservabilityWindow(targetWindow), observation.descriptor, observation.result);
}

function recordAutomationEventObservation(targetWindow: BrowserWindow | null, event: AutomationEvent): void {
  const observation = createAutomationSemanticObservation(event);
  if (!observation) return;
  emitMainInstantOperation(getMainObservabilityWindow(targetWindow), observation.descriptor, observation.result);
}

function showMcpTargetWindow(targetWindow: BrowserWindow): void {
  if (targetWindow.isMinimized()) targetWindow.restore();
  targetWindow.show();
  targetWindow.focus();
}

function shouldRevealMcpBotEvent(payload: McpBridgeBotEvent): boolean {
  return payload.type !== 'stream' && payload.type !== 'status';
}

function pruneMcpInventoryMap<T extends { updatedAt: string }>(items: Map<string, T>): void {
  if (items.size <= MCP_INVENTORY_MAX_ITEMS) return;
  const removable = [...items.entries()]
    .sort((a, b) => a[1].updatedAt.localeCompare(b[1].updatedAt))
    .slice(0, items.size - MCP_INVENTORY_MAX_ITEMS);
  for (const [key] of removable) {
    items.delete(key);
  }
}

function recordMcpOpenedFile(
  filePath: string,
  placement?: ExtensionPanelPlacement,
  targetPaneId?: string,
  renderOptions?: RenderOptions,
): void {
  const resolvedPath = path.resolve(filePath);
  const now = new Date().toISOString();
  const existing = mcpOpenedFiles.get(resolvedPath);
  mcpOpenedFiles.set(resolvedPath, {
    filePath: resolvedPath,
    fileName: path.basename(resolvedPath),
    placement,
    targetPaneId,
    renderOptions,
    openedAt: existing?.openedAt ?? now,
    updatedAt: now,
  });
  pruneMcpInventoryMap(mcpOpenedFiles);
}

function listMcpOpenedFiles(): McpOpenedFileRecord[] {
  return [...mcpOpenedFiles.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function sendMcpOpenFileToRenderer(
  filePath: string,
  placement?: ExtensionPanelPlacement,
  targetPaneId?: string,
  renderOptions?: RenderOptions,
): boolean {
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow) return false;

  showMcpTargetWindow(targetWindow);
  sendToRenderer(targetWindow, 'mcp:open-file', { filePath, placement, targetPaneId, renderOptions });
  recordMcpOpenedFile(filePath, placement, targetPaneId, renderOptions);
  return true;
}

function emitMcpOpenBrowser(payload: McpBridgeOpenBrowserPayload): boolean {
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow) return false;

  showMcpTargetWindow(targetWindow);
  sendToRenderer(targetWindow, 'mcp:open-browser', payload);
  return true;
}

function sendMcpOpenBuiltinPaneToRenderer(
  payload: Omit<McpBridgeOpenBuiltinPanePayload, 'requestId'>,
): Promise<McpBridgeOpenBuiltinPaneResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return Promise.resolve({
      requestId,
      kind: payload.kind,
      ok: false,
      placement: payload.placement,
      targetPaneId: payload.targetPaneId,
      category: payload.category,
      mode: payload.mode,
      section: payload.section,
      ensureVisible: payload.ensureVisible,
      error: 'Xenesis Desk renderer window is not available',
    });
  }

  showMcpTargetWindow(targetWindow);
  const resultPromise = new Promise<McpBridgeOpenBuiltinPaneResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpOpenBuiltinPaneRequests.delete(requestId);
      resolve({
        requestId,
        kind: payload.kind,
        ok: false,
        placement: payload.placement,
        targetPaneId: payload.targetPaneId,
        category: payload.category,
        mode: payload.mode,
        section: payload.section,
        ensureVisible: payload.ensureVisible,
        error: 'Xenesis Desk built-in pane open timed out',
      });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpOpenBuiltinPaneRequests.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:open-builtin-pane', { ...payload, requestId });
  return resultPromise;
}

function getMcpExtensionCommands(): ExtensionCommandDescriptor[] {
  return getExtensionHost()
    .listExtensions()
    .flatMap((extension) => extension.commands);
}

function sendMcpExtensionActionsToRenderer(commandId: string, actions: ExtensionHostAction[]): boolean {
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow) return false;

  showMcpTargetWindow(targetWindow);
  sendToRenderer(targetWindow, 'mcp:extension-actions', { commandId, actions });
  recordMcpExtensionPanelActions(commandId, actions);
  return true;
}

function emitMcpOpenTerminal(payload: McpBridgeOpenTerminalPayload): boolean {
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow) return false;

  showMcpTargetWindow(targetWindow);
  sendToRenderer(targetWindow, 'mcp:open-terminal', payload);
  return true;
}

function sendMcpBotEventToRenderer(payload: McpBridgeBotEvent): boolean {
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow) return false;

  if (shouldRevealMcpBotEvent(payload)) {
    showMcpTargetWindow(targetWindow);
  }
  sendToRenderer(targetWindow, 'mcp:bot-event', payload);
  return true;
}

function getMcpActionInboxStorePath(): string {
  return path.join(getMcpDir(), 'action-inbox.json');
}

function getMcpBotSessionsStorePath(): string {
  return path.join(getMcpDir(), 'bot-sessions.json');
}

function getMcpCapabilityApprovalsStorePath(): string {
  return path.join(getMcpDir(), 'capability-approvals.json');
}

// These read-like explorer capabilities are remembered per-capability: the args
// are dropped from the approval key so a one-time "always allow" sticks across
// every folder instead of re-prompting per navigated path. Strictly limited to
// navigation/selection (directory display + selection), never write/exec/exfil
// capabilities, which stay remembered per-exact-args.
const CAPABILITY_SCOPED_APPROVAL_PATHS = new Set<string>([
  'xd.explorer.local.navigate',
  'xd.explorer.local.selectPath',
]);

function capabilityApprovalAllowKey(pathValue: string, args: unknown, source: DeskBridgeCapabilitySource): string {
  const keyArgs = CAPABILITY_SCOPED_APPROVAL_PATHS.has(pathValue) ? undefined : args;
  return createCapabilityApprovalAllowKey({ path: pathValue, args: keyArgs, source });
}

function isMcpCapabilityApprovalRemembered(pathValue: string, args: unknown, source: DeskBridgeCapabilitySource): boolean {
  return mcpCapabilityApprovalAllowKeys.has(capabilityApprovalAllowKey(pathValue, args, source));
}

function persistMcpCapabilityApprovalsSafely(): void {
  try {
    fs.mkdirSync(getMcpDir(), { recursive: true });
    fs.writeFileSync(
      getMcpCapabilityApprovalsStorePath(),
      `${JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        keys: [...mcpCapabilityApprovalAllowKeys].sort(),
      }, null, 2)}\n`,
      'utf8',
    );
  } catch (error) {
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'mcp',
      message: 'Failed to persist MCP capability approvals',
      detail: diagnosticDetailFromUnknown(error),
    });
  }
}

function loadPersistedMcpCapabilityApprovals(): void {
  try {
    const filePath = getMcpCapabilityApprovalsStorePath();
    if (!fs.existsSync(filePath)) return;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const keys = Array.isArray(parsed?.keys) ? parsed.keys : [];
    mcpCapabilityApprovalAllowKeys.clear();
    for (const key of keys) {
      if (typeof key === 'string' && key.startsWith('capability-always:')) {
        mcpCapabilityApprovalAllowKeys.add(key);
      }
    }
  } catch (error) {
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'mcp',
      message: 'Failed to load MCP capability approvals',
      detail: diagnosticDetailFromUnknown(error),
    });
  }
}

function rememberMcpCapabilityApproval(item: McpBridgeActionInboxItem): string {
  const command = parseCapabilityApprovalCommand(item.command);
  const key = capabilityApprovalAllowKey(
    command.path,
    command.args,
    command.source as DeskBridgeCapabilitySource,
  );
  mcpCapabilityApprovalAllowKeys.add(key);
  persistMcpCapabilityApprovalsSafely();
  return key;
}

// Direct standing-approval persistence for an explicit (path, args, source)
// call. Card A's "항상 승인" button uses this so a future un-approved render of
// the same desk action (source 'xenesis') clears the approval gate via the
// remembered allow-key without re-prompting.
function rememberMcpCapabilityApprovalForCall(
  pathValue: string,
  args: unknown,
  source: DeskBridgeCapabilitySource,
): string {
  const key = capabilityApprovalAllowKey(pathValue, args, source);
  mcpCapabilityApprovalAllowKeys.add(key);
  persistMcpCapabilityApprovalsSafely();
  return key;
}

function persistMcpBotSessionsStateSafely(): void {
  try {
    persistMcpBotSessionsState(mcpBotSessionsState, getMcpBotSessionsStorePath());
  } catch (error) {
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'mcp',
      message: 'Failed to persist MCP Bot sessions',
      detail: diagnosticDetailFromUnknown(error),
    });
  }
}

function loadPersistedMcpBotSessionsState(): void {
  try {
    const result = loadMcpBotSessionsStateFromFile(mcpBotSessionsState, getMcpBotSessionsStorePath());
    if (result.loaded) {
      pruneMcpInventoryMap(mcpBotSessionsState.sessions);
      persistMcpBotSessionsStateSafely();
    }
  } catch (error) {
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'mcp',
      message: 'Failed to load MCP Bot sessions',
      detail: diagnosticDetailFromUnknown(error),
    });
  }
}

function listMcpBotSessionsSnapshot(): McpBridgeBotSession[] {
  return listMcpBotSessions(mcpBotSessionsState) as McpBridgeBotSession[];
}

function saveMcpBotSessionSnapshot(raw: unknown): McpBridgeBotSessionSaveResult {
  try {
    applyMcpBotSession(mcpBotSessionsState, raw);
    pruneMcpInventoryMap(mcpBotSessionsState.sessions);
    persistMcpBotSessionsStateSafely();
    return { ok: true };
  } catch (error) {
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'mcp',
      message: 'Failed to save MCP Bot session',
      detail: diagnosticDetailFromUnknown(error),
    });
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function persistMcpActionInboxStateSafely(): void {
  try {
    persistMcpActionInboxState(mcpActionInboxState, getMcpActionInboxStorePath());
  } catch (error) {
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'mcp',
      message: 'Failed to persist MCP action inbox',
      detail: diagnosticDetailFromUnknown(error),
    });
  }
}

function refreshMcpActionInboxExpirations(): void {
  const expired = markExpiredMcpActionInboxItems(mcpActionInboxState) as McpBridgeActionInboxItem[];
  if (!expired.length) return;
  pruneMcpInventoryMap(mcpActionInboxState.items);
  persistMcpActionInboxStateSafely();
  recordDiagnosticLog({
    level: 'info',
    source: 'main',
    scope: 'mcp',
    message: `Expired ${expired.length} MCP action inbox request(s)`,
    detail: JSON.stringify(expired.map((item) => ({ id: item.id, sessionId: item.sessionId }))),
  });
}

function loadPersistedMcpActionInboxState(): void {
  try {
    const result = loadMcpActionInboxStateFromFile(mcpActionInboxState, getMcpActionInboxStorePath());
    refreshMcpActionInboxExpirations();
    if (result.loaded) {
      pruneMcpInventoryMap(mcpActionInboxState.items);
      persistMcpActionInboxStateSafely();
    }
  } catch (error) {
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'mcp',
      message: 'Failed to load MCP action inbox',
      detail: diagnosticDetailFromUnknown(error),
    });
  }
}

function listMcpActionInboxSnapshot(): McpBridgeActionInboxItem[] {
  refreshMcpActionInboxExpirations();
  return listMcpActionInboxItems(mcpActionInboxState) as McpBridgeActionInboxItem[];
}

function emitMcpActionInboxChanged(): void {
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow) return;
  sendToRenderer(targetWindow, 'mcp:action-inbox-changed', listMcpActionInboxSnapshot());
}

function recordMcpActionInboxRequest(raw: unknown): McpBridgeActionInboxItem {
  const item = applyMcpActionInboxRequest(mcpActionInboxState, raw) as McpBridgeActionInboxItem;
  pruneMcpInventoryMap(mcpActionInboxState.items);
  persistMcpActionInboxStateSafely();
  emitMcpActionInboxChanged();
  return item;
}

async function postMcpActionInboxCallback(item: McpBridgeActionInboxItem, text: string): Promise<string> {
  const callbackUrl = String(item.callbackUrl || '').trim();
  if (!callbackUrl) return 'No Hermes callback URL registered.';
  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sessionId: item.sessionId || 'xenesis-bot',
      text,
      userId: 'xenesis',
      userName: 'Xenesis Desk',
    }),
  });
  if (!response.ok) {
    throw new Error(`Hermes callback failed: HTTP ${response.status}`);
  }
  return `Hermes callback sent: ${text}`;
}

async function resolveCapabilityActionInboxRequest(
  existing: McpBridgeActionInboxItem,
  request: McpBridgeActionInboxResolveRequest,
): Promise<McpBridgeActionInboxResolveResult> {
  const now = new Date().toISOString();
  if (request.resolution === 'reject') {
    const rejected = resolveMcpActionInboxItem(mcpActionInboxState, {
      ...request,
      result: 'Capability call rejected by user.',
      at: now,
      lastCallbackAt: now,
    }) as McpBridgeActionInboxResolveResult;
    persistMcpActionInboxStateSafely();
    emitMcpActionInboxChanged();
    recordDiagnosticLog({
      level: 'info',
      source: 'main',
      scope: 'mcp',
      message: `Capability approval rejected: ${existing.title}`,
      detail: JSON.stringify({ id: existing.id, sessionId: existing.sessionId }),
    });
    return rejected;
  }

  try {
    const command = parseCapabilityApprovalCommand(existing.command);
    const result = await callDeskBridgeCapability(createMcpBridgeCapabilityAdapter(), {
      path: command.path,
      args: command.args,
      source: command.source as DeskBridgeCapabilitySource,
      approved: true,
    });
    if (!result.ok) {
      const message = result.error || `Capability call failed after approval: ${command.path}`;
      const failedItem = applyMcpActionInboxRequest(mcpActionInboxState, {
        ...existing,
        status: 'failed',
        error: message,
        at: now,
        lastCallbackAt: now,
      }) as McpBridgeActionInboxItem;
      persistMcpActionInboxStateSafely();
      emitMcpActionInboxChanged();
      recordDiagnosticLog({
        level: 'warn',
        source: 'main',
        scope: 'mcp',
        message: `Capability approval execution failed: ${command.path}`,
        detail: message,
      });
      return { ok: false, item: failedItem, error: message };
    }

    const resolved = resolveMcpActionInboxItem(mcpActionInboxState, {
      ...request,
      result: `Capability call approved and executed: ${command.path}`,
      at: now,
      lastCallbackAt: now,
    }) as McpBridgeActionInboxResolveResult;
    if (request.scope === 'always') {
      const allowKey = rememberMcpCapabilityApproval(existing);
      recordDiagnosticLog({
        level: 'info',
        source: 'main',
        scope: 'mcp',
        message: `Capability approval remembered: ${command.path}`,
        detail: JSON.stringify({ id: existing.id, sessionId: existing.sessionId, allowKey }),
      });
    }
    persistMcpActionInboxStateSafely();
    emitMcpActionInboxChanged();
    recordDiagnosticLog({
      level: 'info',
      source: 'main',
      scope: 'mcp',
      message: `Capability approval executed: ${command.path}`,
      detail: JSON.stringify({ id: existing.id, sessionId: existing.sessionId }),
    });
    return resolved;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedItem = applyMcpActionInboxRequest(mcpActionInboxState, {
      ...existing,
      status: 'failed',
      error: message,
      at: now,
      lastCallbackAt: now,
    }) as McpBridgeActionInboxItem;
    persistMcpActionInboxStateSafely();
    emitMcpActionInboxChanged();
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'mcp',
      message: `Capability approval resolver failed: ${existing.title}`,
      detail: message,
    });
    return { ok: false, item: failedItem, error: message };
  }
}

async function resolveMcpActionInboxRequest(
  request: McpBridgeActionInboxResolveRequest,
): Promise<McpBridgeActionInboxResolveResult> {
  const existing = listMcpActionInboxSnapshot().find((item) => item.id === String(request?.id || ''));
  if (!existing) {
    return { ok: false, error: `Action request not found: ${String(request?.id || '')}` };
  }
  if (existing.status !== 'pending') {
    return { ok: false, item: existing, error: `Action request is ${existing.status}` };
  }
  if (isCapabilityApprovalItem(existing)) {
    return resolveCapabilityActionInboxRequest(existing, request);
  }
  const text = request.resolution === 'approve' ? existing.approveText : existing.rejectText;
  try {
    const now = new Date().toISOString();
    const result = await postMcpActionInboxCallback(existing, text);
    const resolved = resolveMcpActionInboxItem(mcpActionInboxState, {
      ...request,
      result,
      at: now,
      lastCallbackAt: now,
    }) as McpBridgeActionInboxResolveResult;
    persistMcpActionInboxStateSafely();
    emitMcpActionInboxChanged();
    recordDiagnosticLog({
      level: 'info',
      source: 'main',
      scope: 'mcp',
      message: `MCP action inbox ${request.resolution}: ${existing.title}`,
      detail: JSON.stringify({ id: existing.id, sessionId: existing.sessionId }),
    });
    return resolved;
  } catch (error) {
    const now = new Date().toISOString();
    const message = error instanceof Error ? error.message : String(error);
    const failedItem = applyMcpActionInboxRequest(mcpActionInboxState, {
      ...existing,
      status: 'failed',
      error: message,
      at: now,
      lastCallbackAt: now,
    }) as McpBridgeActionInboxItem;
    persistMcpActionInboxStateSafely();
    emitMcpActionInboxChanged();
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'mcp',
      message: `MCP action inbox callback failed: ${existing.title}`,
      detail: message,
    });
    return { ok: false, item: failedItem, error: message };
  }
}

function getMcpBotEventType(url: URL): McpBridgeBotEvent['type'] | null {
  if (url.pathname === '/bot/session') return 'session';
  if (url.pathname === '/bot/message') return 'message';
  if (url.pathname === '/bot/stream') return 'stream';
  if (url.pathname === '/bot/final') return 'final';
  if (url.pathname === '/bot/status') return 'status';
  if (url.pathname === '/bot/error') return 'error';
  return null;
}

const MCP_PANEL_PLACEMENTS = new Set<ExtensionPanelPlacement>(['tab', 'left', 'right', 'top', 'bottom']);

function normalizeMcpPanelPlacement(value: unknown): ExtensionPanelPlacement | undefined {
  const placement = typeof value === 'string' ? value.trim() : '';
  return MCP_PANEL_PLACEMENTS.has(placement as ExtensionPanelPlacement)
    ? (placement as ExtensionPanelPlacement)
    : undefined;
}

function sanitizeMcpExtensionPanelPlacement(value: unknown): ExtensionPanelPlacement | undefined {
  return normalizeMcpPanelPlacement(value);
}

function normalizeMcpTargetPaneId(value: unknown): string | undefined {
  const targetPaneId = typeof value === 'string' ? value.trim() : '';
  return targetPaneId || undefined;
}

function recordMcpExtensionPanelActions(commandId: string, actions: ExtensionHostAction[]): void {
  const now = new Date().toISOString();
  actions.forEach((action, index) => {
    if (action.type !== 'openPanel') return;
    const title = String(action.title || commandId).trim() || commandId;
    const extensionId =
      typeof action.extensionId === 'string' && action.extensionId.trim() ? action.extensionId.trim() : undefined;
    const idParts = [commandId, extensionId ?? 'extension', String(index), title];
    const id = idParts.join(':');
    const existing = mcpPanels.get(id);
    mcpPanels.set(id, {
      id,
      commandId,
      extensionId,
      title,
      placement: normalizeMcpPanelPlacement(action.placement) ?? 'tab',
      contentBytes: Buffer.byteLength(String(action.html || ''), 'utf8'),
      openedAt: existing?.openedAt ?? now,
      updatedAt: now,
    });
  });
  pruneMcpInventoryMap(mcpPanels);
}

function listMcpPanels(): McpPanelRecord[] {
  return [...mcpPanels.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function listRecentDiagnosticsForMcp(limitValue: unknown = 20): DiagnosticsLogEntry[] {
  const rawLimit = Number(limitValue);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.trunc(rawLimit), 100) : 20;
  return listDiagnosticsLogs().slice(0, limit).map(redactDiagnosticsLogEntry);
}

function sanitizeMcpRendererText(value: unknown, maxLength = 500): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

function sanitizeMcpRendererOptionalText(value: unknown, maxLength = 500): string | undefined {
  const text = sanitizeMcpRendererText(value, maxLength).trim();
  return text || undefined;
}

function sanitizeMcpRendererStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => sanitizeMcpRendererText(item, 160).trim())
        .filter(Boolean)
        .slice(0, MCP_INVENTORY_MAX_ITEMS)
    : [];
}

function sanitizeMcpRendererFileOrigin(value: unknown): 'local' | 'remote' {
  return sanitizeMcpRendererText(value, 20) === 'remote' ? 'remote' : 'local';
}

function sanitizeMcpRendererOptionalNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function sanitizeMcpRendererTraceDetails(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const details: Record<string, unknown> = {};
  for (const [rawKey, rawValue] of Object.entries(value).slice(0, MCP_RENDERER_TRACE_DETAILS_MAX_ITEMS)) {
    const key = sanitizeMcpRendererText(rawKey, 80).trim();
    if (!key) continue;
    if (typeof rawValue === 'string') {
      details[key] = rawValue.slice(0, 300);
    } else if (typeof rawValue === 'number') {
      if (Number.isFinite(rawValue)) details[key] = rawValue;
    } else if (typeof rawValue === 'boolean' || rawValue === null) {
      details[key] = rawValue;
    }
  }
  return Object.keys(details).length ? details : undefined;
}

function sanitizeMcpRendererPerformanceTraceEntry(value: unknown): McpBridgeRendererPerformanceTraceEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const scope = sanitizeMcpRendererText(raw.scope, 80).trim();
  const action = sanitizeMcpRendererText(raw.action, 120).trim();
  if (!scope || !action) return null;
  return {
    scope,
    action,
    durationMs: sanitizeMcpRendererOptionalNumber(raw.durationMs),
    at: sanitizeMcpRendererOptionalNumber(raw.at),
    timestamp: sanitizeMcpRendererOptionalText(raw.timestamp, 80),
    details: sanitizeMcpRendererTraceDetails(raw.details),
  };
}

function sanitizeMcpRendererPerformanceTraceSummaryItem(
  value: unknown,
): McpBridgeRendererPerformanceTraceSummaryItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const scope = sanitizeMcpRendererText(raw.scope, 80).trim();
  const action = sanitizeMcpRendererText(raw.action, 120).trim();
  if (!scope || !action) return null;
  return {
    scope,
    action,
    count: Math.max(0, Math.trunc(sanitizeMcpRendererOptionalNumber(raw.count) ?? 0)),
    averageDurationMs: sanitizeMcpRendererOptionalNumber(raw.averageDurationMs) ?? 0,
    maxDurationMs: sanitizeMcpRendererOptionalNumber(raw.maxDurationMs) ?? 0,
    totalDurationMs: sanitizeMcpRendererOptionalNumber(raw.totalDurationMs) ?? 0,
  };
}

function sanitizeMcpRendererPerformanceTraceSnapshot(
  value: unknown,
): McpBridgeRendererPerformanceTraceSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const recent = Array.isArray(raw.recent)
    ? raw.recent
        .slice(-MCP_RENDERER_TRACE_RECENT_MAX_ITEMS)
        .map(sanitizeMcpRendererPerformanceTraceEntry)
        .filter((item): item is McpBridgeRendererPerformanceTraceEntry => Boolean(item))
    : [];
  const summary = Array.isArray(raw.summary)
    ? raw.summary
        .slice(0, MCP_RENDERER_TRACE_SUMMARY_MAX_ITEMS)
        .map(sanitizeMcpRendererPerformanceTraceSummaryItem)
        .filter((item): item is McpBridgeRendererPerformanceTraceSummaryItem => Boolean(item))
    : [];
  const rawItemCount = sanitizeMcpRendererOptionalNumber(raw.itemCount);
  return {
    enabled: raw.enabled === true,
    setting: sanitizeMcpRendererText(raw.setting, 200).trim(),
    itemCount: Number.isFinite(rawItemCount) ? Math.max(0, Math.trunc(rawItemCount ?? 0)) : recent.length,
    recent,
    summary,
  };
}

function sanitizeMcpRendererPerformanceTraceResult(value: unknown): McpBridgeRendererPerformanceTraceResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpRendererText(raw.requestId, 120).trim();
  if (!requestId) return null;
  const snapshot = sanitizeMcpRendererPerformanceTraceSnapshot(raw) ?? {
    enabled: false,
    setting: '',
    itemCount: 0,
    recent: [],
    summary: [],
  };
  return {
    requestId,
    ok: raw.ok === true,
    ...snapshot,
    error: sanitizeMcpRendererOptionalText(raw.error, 1000),
  };
}

function sanitizeMcpRendererWorkspaceSnapshot(value: unknown): McpBridgeRendererWorkspaceSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const currentPath = sanitizeMcpRendererText(raw.currentPath, 1000).trim();
  const profilePath = sanitizeMcpRendererOptionalText(raw.profilePath, 1000)?.trim();
  return {
    currentPath,
    ...(profilePath ? { profilePath } : {}),
    autoRestore: raw.autoRestore === true,
  };
}

function sanitizeMcpRendererExplorerSnapshot(value: unknown): McpBridgeRendererExplorerSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const rootDir = sanitizeMcpRendererText(raw.rootDir, 1000).trim();
  const selectedPath = sanitizeMcpRendererOptionalText(raw.selectedPath, 1000)?.trim();
  return {
    open: raw.open === true,
    rootDir,
    ...(selectedPath ? { selectedPath } : {}),
    selectedIsDir: raw.selectedIsDir === true,
  };
}

function sanitizeMcpRendererStateSnapshot(value: unknown): McpBridgeRendererStateSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const contents = Array.isArray(raw.contents) ? raw.contents : [];
  const panes = Array.isArray(raw.panes) ? raw.panes : [];
  const openFiles = Array.isArray(raw.openFiles) ? raw.openFiles : [];
  const panels = Array.isArray(raw.panels) ? raw.panels : [];

  return {
    reportedAt: sanitizeMcpRendererOptionalText(raw.reportedAt, 80) ?? new Date().toISOString(),
    activePaneId: raw.activePaneId === null ? null : sanitizeMcpRendererOptionalText(raw.activePaneId, 160),
    panes: panes
      .slice(0, MCP_INVENTORY_MAX_ITEMS)
      .map((item) => {
        const pane = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
        return {
          id: sanitizeMcpRendererText(pane.id, 160).trim(),
          state: sanitizeMcpRendererText(pane.state, 80).trim() || 'document',
          activeContentId:
            pane.activeContentId === null ? null : sanitizeMcpRendererOptionalText(pane.activeContentId, 160),
          contents: sanitizeMcpRendererStringArray(pane.contents),
          group: pane.group === null ? null : sanitizeMcpRendererOptionalText(pane.group, 160),
        };
      })
      .filter((item) => item.id),
    contents: contents
      .slice(0, MCP_INVENTORY_MAX_ITEMS)
      .map((item) => {
        const content =
          item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
        return {
          id: sanitizeMcpRendererText(content.id, 160).trim(),
          title: sanitizeMcpRendererText(content.title, 300).trim() || sanitizeMcpRendererText(content.id, 160).trim(),
          contentType: (sanitizeMcpRendererText(content.contentType, 80).trim() as any) || 'html',
          paneId: sanitizeMcpRendererOptionalText(content.paneId, 160),
          state: sanitizeMcpRendererOptionalText(content.state, 80),
          filePath: sanitizeMcpRendererOptionalText(content.filePath, 1000),
          fileName: sanitizeMcpRendererOptionalText(content.fileName, 300),
          fileExt: sanitizeMcpRendererOptionalText(content.fileExt, 80),
          fileOrigin: sanitizeMcpRendererFileOrigin(content.fileOrigin),
          remoteFilePath: sanitizeMcpRendererOptionalText(content.remoteFilePath, 1000),
          termId: sanitizeMcpRendererOptionalText(content.termId, 160),
          terminalMetadata: normalizeMcpTerminalMetadata(content.terminalMetadata),
          url: sanitizeMcpRendererOptionalText(content.url, 1000),
          renderOptions:
            content.renderOptions && typeof content.renderOptions === 'object' && !Array.isArray(content.renderOptions)
              ? (content.renderOptions as RenderOptions)
              : undefined,
        };
      })
      .filter((item) => item.id),
    openFiles: openFiles
      .slice(0, MCP_INVENTORY_MAX_ITEMS)
      .map((item) => {
        const file = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
        return {
          contentId: sanitizeMcpRendererText(file.contentId, 160).trim(),
          paneId: sanitizeMcpRendererOptionalText(file.paneId, 160),
          filePath: sanitizeMcpRendererText(file.filePath, 1000).trim(),
          fileName: sanitizeMcpRendererOptionalText(file.fileName, 300),
          fileExt: sanitizeMcpRendererOptionalText(file.fileExt, 80),
          fileOrigin: sanitizeMcpRendererFileOrigin(file.fileOrigin),
          remoteFilePath: sanitizeMcpRendererOptionalText(file.remoteFilePath, 1000),
          state: sanitizeMcpRendererOptionalText(file.state, 80),
          title: sanitizeMcpRendererOptionalText(file.title, 300),
        };
      })
      .filter((item) => item.contentId && item.filePath),
    panels: panels
      .slice(0, MCP_INVENTORY_MAX_ITEMS)
      .map((item) => {
        const panel = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
        return {
          contentId: sanitizeMcpRendererText(panel.contentId, 160).trim(),
          paneId: sanitizeMcpRendererOptionalText(panel.paneId, 160),
          title:
            sanitizeMcpRendererText(panel.title, 300).trim() || sanitizeMcpRendererText(panel.contentId, 160).trim(),
          state: sanitizeMcpRendererOptionalText(panel.state, 80),
        };
      })
      .filter((item) => item.contentId),
    workspace: sanitizeMcpRendererWorkspaceSnapshot(raw.workspace),
    explorer: sanitizeMcpRendererExplorerSnapshot(raw.explorer),
    performanceTrace: sanitizeMcpRendererPerformanceTraceSnapshot(raw.performanceTrace),
  };
}

function listMcpPanelsForBridge(): unknown[] {
  return latestMcpRendererState?.panels?.length ? latestMcpRendererState.panels : listMcpPanels();
}

function listMcpOpenFilesForBridge(): unknown[] {
  return latestMcpRendererState?.openFiles?.length ? latestMcpRendererState.openFiles : listMcpOpenedFiles();
}

function getLatestMcpBotInputUrl(botSessions: McpBridgeBotSession[] = listMcpBotSessionsSnapshot()): string {
  return botSessions.find((session) => typeof session.inputUrl === 'string' && session.inputUrl.trim())?.inputUrl || '';
}

function buildMcpBridgeStateSnapshot(): Record<string, unknown> {
  const windows = BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed());
  const botSessions = listMcpBotSessionsSnapshot();
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    bridge: {
      bridgeUrl: getMcpBridgeUrl(),
      bridgeStatePath: getMcpBridgeStateFilePath(),
      configFilePath: getMcpConfigSnippetFilePath(),
      serverPath: getMcpServerScriptPath(),
      available: isMcpServerAvailable(),
    },
    app: {
      name: app.getName(),
      version: app.getVersion(),
      packaged: app.isPackaged,
      platform: process.platform,
      arch: process.arch,
      windowCount: windows.length,
      targetWindowId: getMcpTargetWindow()?.id ?? null,
    },
    terminals: listMcpTerminalSessions(),
    extensionCommands: getMcpExtensionCommands(),
    rendererState: latestMcpRendererState,
    panels: listMcpPanelsForBridge(),
    openFiles: listMcpOpenFilesForBridge(),
    botSessions,
    botInputUrl: getLatestMcpBotInputUrl(botSessions),
    actionInbox: listMcpActionInboxSnapshot(),
    bridgePanels: listMcpPanels(),
    bridgeOpenFiles: listMcpOpenedFiles(),
    diagnostics: listRecentDiagnosticsForMcp(20),
  };
}

function buildMcpBridgeStatusSnapshot(): McpBridgeStatus {
  const snapshot = buildMcpBridgeStateSnapshot() as Omit<McpBridgeStatus, 'bridge'> & {
    bridge: Omit<McpBridgeStatus['bridge'], 'tokenPresent'>;
  };
  return {
    ...snapshot,
    bridge: {
      ...snapshot.bridge,
      tokenPresent: Boolean(mcpBridgeToken),
    },
  };
}

function buildMcpActiveContextSnapshot(): Record<string, unknown> {
  const state = latestMcpRendererState;
  const activePane =
    state?.panes.find((pane) => pane.id === state.activePaneId) ??
    state?.panes.find((pane) => pane.activeContentId) ??
    null;
  const activeContentId = activePane?.activeContentId || activePane?.contents?.[0] || null;
  const activeContent = activeContentId
    ? (state?.contents.find((content) => content.id === activeContentId) ?? null)
    : null;
  const activeOpenFile = activeContentId
    ? (state?.openFiles.find((file) => file.contentId === activeContentId) ?? null)
    : null;
  const activePanel = activeContentId
    ? (state?.panels.find((panel) => panel.contentId === activeContentId) ?? null)
    : null;
  const activeTerminal = activeContent?.termId
    ? (listMcpTerminalSessions().find((session) => session.id === activeContent.termId) ?? null)
    : null;
  const terminals = listMcpTerminalSessions();

  return {
    ok: true,
    reportedAt: state?.reportedAt ?? new Date().toISOString(),
    activePane,
    activeContent,
    activeOpenFile,
    activePanel,
    activeTerminal,
    counts: {
      panes: state?.panes.length ?? 0,
      contents: state?.contents.length ?? 0,
      openFiles: state?.openFiles.length ?? 0,
      panels: state?.panels.length ?? 0,
      terminals: terminals.length,
    },
    rendererState: state,
  };
}

function listMcpCommandPaletteCommands(queryValue?: unknown): Record<string, unknown>[] {
  const query = typeof queryValue === 'string' ? queryValue.trim().toLowerCase() : '';
  const searchableText = (command: Record<string, unknown>): string =>
    [
      command.id,
      command.title,
      command.category,
      command.extensionId,
      command.extensionName,
      command.rendererCommandCapabilityPath,
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');

  const rendererCommands = Object.values(DESK_BRIDGE_RENDERER_COMMAND_CAPABILITY_COVERAGE).map((entry) => ({
    id: entry.commandId,
    commandId: entry.commandId,
    title: entry.commandId,
    category: 'Renderer',
    source: 'renderer',
    commandPalette: true,
    available: true,
    rendererCommandCapabilityPath: entry.rendererCommandCapabilityPath,
    notes: entry.notes || '',
  }));
  const extensionCommands = getMcpExtensionCommands().map((command) => ({
    ...command,
    source: 'extension',
    commandPalette: command.menuLocations.includes('commandPalette'),
  }));

  return [...rendererCommands, ...extensionCommands]
    .filter((command) => !query || searchableText(command).includes(query))
    .slice(0, MCP_INVENTORY_MAX_ITEMS);
}

function buildMcpContextActionButton(action: Record<string, unknown>, index: number): Record<string, unknown> {
  const requiresApproval = action.requiresApproval === true;
  const label = String(action.label || action.id || `Action ${index}`).trim() || `Action ${index}`;
  const value = String(action.command || '').trim();
  return {
    label,
    command: `/xd context-actions #${index}`,
    value,
    style: requiresApproval ? 'danger' : 'primary',
    requiresApproval,
  };
}

function buildMcpContextActionsSnapshot(): Record<string, unknown> {
  const activeContext = buildMcpActiveContextSnapshot();
  const activeContent =
    activeContext.activeContent && typeof activeContext.activeContent === 'object'
      ? (activeContext.activeContent as Record<string, unknown>)
      : {};
  const activeOpenFile =
    activeContext.activeOpenFile && typeof activeContext.activeOpenFile === 'object'
      ? (activeContext.activeOpenFile as Record<string, unknown>)
      : {};
  const activePanel =
    activeContext.activePanel && typeof activeContext.activePanel === 'object'
      ? (activeContext.activePanel as Record<string, unknown>)
      : {};
  const activeTerminal =
    activeContext.activeTerminal && typeof activeContext.activeTerminal === 'object'
      ? (activeContext.activeTerminal as Record<string, unknown>)
      : {};
  const actions: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const addAction = (action: Record<string, unknown>) => {
    const id = String(action.id || '').trim();
    const command = String(action.command || '').trim();
    if (!id || !command || seen.has(id)) return;
    seen.add(id);
    actions.push(action);
  };

  addAction({
    id: 'refresh-context',
    label: 'Refresh active context',
    command: 'context',
    kind: 'context.refresh',
    requiresApproval: false,
  });
  addAction({
    id: 'open-command-palette',
    label: 'Search command palette',
    command: 'commands',
    kind: 'command.palette',
    requiresApproval: false,
  });

  const contentId = typeof activeContent.id === 'string' ? activeContent.id.trim() : '';
  if (contentId) {
    addAction({
      id: 'focus-active-content',
      label: 'Focus active content',
      command: `focus ${contentId}`,
      kind: 'dock.focus',
      requiresApproval: false,
      target: { contentId },
    });
    addAction({
      id: 'close-active-content',
      label: 'Close active content',
      command: `close ${contentId}`,
      kind: 'dock.close',
      requiresApproval: true,
      target: { contentId },
    });
  }

  const fileTitle = String(activeOpenFile.title || activeOpenFile.fileName || activeContent.title || '').trim();
  if (Object.keys(activeOpenFile).length > 0) {
    addAction({
      id: 'list-open-files',
      label: 'List open files',
      command: 'files',
      kind: 'file.list',
      requiresApproval: false,
    });
    if (fileTitle) {
      addAction({
        id: 'search-file-commands',
        label: `Search commands for ${fileTitle}`,
        command: `commands ${fileTitle}`,
        kind: 'command.search',
        requiresApproval: false,
      });
    }
  }

  const panelContentId = typeof activePanel.contentId === 'string' ? activePanel.contentId.trim() : '';
  if (panelContentId) {
    addAction({
      id: 'focus-active-panel',
      label: 'Focus active panel',
      command: `focus ${panelContentId}`,
      kind: 'panel.focus',
      requiresApproval: false,
      target: { contentId: panelContentId },
    });
    addAction({
      id: 'close-active-panel',
      label: 'Close active panel',
      command: `close ${panelContentId}`,
      kind: 'panel.close',
      requiresApproval: true,
      target: { contentId: panelContentId },
    });
  }

  const terminalId = typeof activeTerminal.id === 'string' ? activeTerminal.id.trim() : '';
  if (terminalId) {
    addAction({
      id: 'tail-active-terminal',
      label: 'Tail active terminal',
      command: `tail ${terminalId}`,
      kind: 'terminal.tail',
      requiresApproval: false,
      target: { terminalId },
    });
    addAction({
      id: 'stop-active-terminal',
      label: 'Stop active terminal',
      command: `stop ${terminalId}`,
      kind: 'terminal.stop',
      requiresApproval: false,
      target: { terminalId },
    });
  }

  return {
    ok: true,
    reportedAt: activeContext.reportedAt ?? new Date().toISOString(),
    activeContext,
    actions: actions.slice(0, MCP_INVENTORY_MAX_ITEMS).map((action, index) => ({
      ...action,
      button: buildMcpContextActionButton(action, index + 1),
    })),
  };
}

function sanitizeMcpDockActionText(value: unknown, maxLength = 300): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizeMcpGowooriChatSource(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const source = value.slice(0, MCP_GOWOORI_CHAT_SOURCE_MAX_CHARS);
  return source.length > 0 ? source : undefined;
}

function sanitizeMcpWindowState(value: unknown): McpBridgeDockActionPayload['windowState'] {
  switch (value) {
    case 'top':
    case 'left':
    case 'document':
    case 'right':
    case 'bottom':
      return value;
    default:
      return undefined;
  }
}

function sanitizeMcpDockSize(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(0, Math.min(4096, Math.trunc(numeric)));
}

function sanitizeMcpDockPanePercent(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(0, Math.min(95, Math.trunc(numeric)));
}

function sanitizeMcpDockActionTarget(
  body: unknown,
): Pick<
  McpBridgeDockActionPayload,
  | 'contentId'
  | 'paneId'
  | 'targetPaneId'
  | 'clear'
  | 'useActive'
  | 'windowState'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'widthPercent'
  | 'heightPercent'
> {
  const value = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const contentId = sanitizeMcpDockActionText(value.contentId, 200);
  const paneId = sanitizeMcpDockActionText(value.paneId, 200);
  const targetPaneId = sanitizeMcpDockActionText(value.targetPaneId, 200);
  const windowState = sanitizeMcpWindowState(value.windowState);
  const left = sanitizeMcpDockSize(value.left);
  const right = sanitizeMcpDockSize(value.right);
  const top = sanitizeMcpDockSize(value.top);
  const bottom = sanitizeMcpDockSize(value.bottom);
  const widthPercent = sanitizeMcpDockPanePercent(value.widthPercent);
  const heightPercent = sanitizeMcpDockPanePercent(value.heightPercent);
  return {
    ...(contentId ? { contentId } : {}),
    ...(paneId ? { paneId } : {}),
    ...(targetPaneId ? { targetPaneId } : {}),
    ...(windowState ? { windowState } : {}),
    ...(left !== undefined ? { left } : {}),
    ...(right !== undefined ? { right } : {}),
    ...(top !== undefined ? { top } : {}),
    ...(bottom !== undefined ? { bottom } : {}),
    ...(widthPercent !== undefined ? { widthPercent } : {}),
    ...(heightPercent !== undefined ? { heightPercent } : {}),
    ...(value.clear === true ? { clear: true } : {}),
    ...(value.useActive === true ? { useActive: true } : value.useActive === false ? { useActive: false } : {}),
  };
}

function sanitizeMcpDockAction(value: unknown): McpBridgeDockActionPayload['action'] {
  switch (value) {
    case 'move':
    case 'close':
    case 'closeOthers':
    case 'closeRight':
    case 'closeAll':
    case 'arrangeGroup':
    case 'mergeGroup':
    case 'arrangeWindow':
    case 'mergeWindow':
    case 'mergeAll':
    case 'readArtifactTarget':
    case 'setArtifactTarget':
    case 'readSizes':
    case 'setSizes':
    case 'setPaneSize':
      return value;
    case 'focus':
    default:
      return 'focus';
  }
}

function sanitizeMcpDockArrangeMode(value: unknown): McpBridgeDockActionPayload['mode'] {
  switch (value) {
    case 'row':
    case 'column':
    case 'grid':
      return value;
    default:
      return undefined;
  }
}

function sanitizeMcpOpenBuiltinPaneResult(value: unknown): McpBridgeOpenBuiltinPaneResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  let kind: McpBridgeOpenBuiltinPaneKind;
  try {
    kind = normalizeMcpBuiltinPaneKind(raw.kind);
  } catch {
    kind = 'settings';
  }
  return {
    requestId,
    kind,
    ok: raw.ok === true,
    placement: normalizeMcpPanelPlacement(raw.placement),
    targetPaneId: sanitizeMcpDockActionText(raw.targetPaneId, 200) || undefined,
    category: sanitizeMcpDockActionText(raw.category, 120) || undefined,
    mode: sanitizeMcpDockActionText(raw.mode, 120) || undefined,
    section: sanitizeMcpDockActionText(raw.section, 120) || undefined,
    ensureVisible: typeof raw.ensureVisible === 'boolean' ? raw.ensureVisible : undefined,
    message: sanitizeMcpDockActionText(raw.message, 500) || undefined,
    error: sanitizeMcpDockActionText(raw.error, 500) || undefined,
  };
}

function sanitizeMcpDockActionResult(value: unknown): McpBridgeDockActionResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  const action = sanitizeMcpDockAction(raw.action);
  const stringList = (items: unknown): string[] =>
    Array.isArray(items)
      ? items
          .map((item) => sanitizeMcpDockActionText(item, 200))
          .filter(Boolean)
          .slice(0, MCP_INVENTORY_MAX_ITEMS)
      : [];
  const rawSizes =
    raw.sizes && typeof raw.sizes === 'object' && !Array.isArray(raw.sizes)
      ? (raw.sizes as Record<string, unknown>)
      : null;
  const sizes = rawSizes
    ? {
        left: sanitizeMcpDockSize(rawSizes.left) ?? 0,
        right: sanitizeMcpDockSize(rawSizes.right) ?? 0,
        top: sanitizeMcpDockSize(rawSizes.top) ?? 0,
        bottom: sanitizeMcpDockSize(rawSizes.bottom) ?? 0,
      }
    : undefined;
  return {
    requestId,
    action,
    mode: sanitizeMcpDockArrangeMode(raw.mode),
    ok: raw.ok === true,
    contentId: sanitizeMcpDockActionText(raw.contentId, 200) || undefined,
    paneId: sanitizeMcpDockActionText(raw.paneId, 200) || undefined,
    artifactPaneId: sanitizeMcpDockActionText(raw.artifactPaneId, 200) || null,
    activePaneId: sanitizeMcpDockActionText(raw.activePaneId, 200) || null,
    isArtifactTarget: raw.isArtifactTarget === true,
    focusedContentId: sanitizeMcpDockActionText(raw.focusedContentId, 200) || undefined,
    focusedPaneId: sanitizeMcpDockActionText(raw.focusedPaneId, 200) || undefined,
    closedContentIds: stringList(raw.closedContentIds),
    closedTerminalIds: stringList(raw.closedTerminalIds),
    ...(sizes ? { sizes } : {}),
    message: sanitizeMcpDockActionText(raw.message, 500) || undefined,
    error: sanitizeMcpDockActionText(raw.error, 500) || undefined,
  };
}

function sanitizeMcpExplorerAction(value: unknown): McpBridgeExplorerActionPayload['action'] {
  switch (value) {
    case 'hide':
    case 'toggle':
    case 'navigate':
    case 'refresh':
    case 'goUp':
    case 'setFilter':
    case 'clearFilter':
    case 'selectPath':
    case 'openSelected':
    case 'previewSelected':
    case 'togglePreview':
    case 'toggleDetails':
    case 'sendSelectedToBot':
    case 'addSelectedToContext':
    case 'copySelectedPath':
    case 'addSelectedToFavorites':
    case 'openSelectedInTerminal':
    case 'openSelectedSafeEdit':
    case 'openSelectedSyncPlanner':
      return value;
    case 'show':
    default:
      return 'show';
  }
}

function sanitizeMcpExplorerActionRequest(body: unknown): Omit<McpBridgeExplorerActionPayload, 'requestId'> {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const action = sanitizeMcpExplorerAction(raw.action);
  const request: Omit<McpBridgeExplorerActionPayload, 'requestId'> = { action };
  const pathValue = sanitizeMcpDockActionText(raw.path, 2000);
  const selectPath = sanitizeMcpDockActionText(raw.selectPath, 2000);
  const query = sanitizeMcpDockActionText(raw.query, 500);
  const shell = sanitizeMcpShellKind(raw.shell);
  if (pathValue) request.path = normalizeBridgePathForPlatform(pathValue, { platform: process.platform });
  if (selectPath) request.selectPath = normalizeBridgePathForPlatform(selectPath, { platform: process.platform });
  if (query) request.query = query;
  if (shell) request.shell = shell;
  return request;
}

function sanitizeMcpExplorerActionResult(value: unknown): McpBridgeExplorerActionResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  return {
    requestId,
    action: sanitizeMcpExplorerAction(raw.action),
    ok: raw.ok === true,
    explorerOpen: typeof raw.explorerOpen === 'boolean' ? raw.explorerOpen : undefined,
    rootDir: sanitizeMcpDockActionText(raw.rootDir, 2000) || undefined,
    selectPath: sanitizeMcpDockActionText(raw.selectPath, 2000) || undefined,
    query: sanitizeMcpDockActionText(raw.query, 500) || undefined,
    message: sanitizeMcpDockActionText(raw.message, 500) || undefined,
    error: sanitizeMcpDockActionText(raw.error, 500) || undefined,
  };
}

function normalizeMcpRemotePath(value: string): string {
  const normalized = sanitizeMcpDockActionText(value, 2000).replace(/\\/g, '/').replace(/\/+/g, '/');
  if (!normalized || normalized === '.') return '';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function sanitizeMcpRemoteExplorerAction(value: unknown): McpBridgeRemoteExplorerActionPayload['action'] {
  switch (value) {
    case 'navigate':
    case 'refresh':
    case 'goUp':
    case 'setFilter':
    case 'clearFilter':
    case 'selectPath':
    case 'openSelected':
    case 'previewSelected':
    case 'togglePreview':
    case 'toggleDetails':
    case 'sendSelectedToBot':
    case 'addSelectedToContext':
    case 'copySelectedPath':
    case 'openSelectedSyncPlanner':
      return value;
    case 'show':
    default:
      return 'show';
  }
}

function sanitizeMcpRemoteExplorerActionRequest(
  body: unknown,
): Omit<McpBridgeRemoteExplorerActionPayload, 'requestId'> {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const action = sanitizeMcpRemoteExplorerAction(raw.action);
  const request: Omit<McpBridgeRemoteExplorerActionPayload, 'requestId'> = { action };
  const profileId = sanitizeMcpDockActionText(raw.profileId, 300);
  const pathValue = normalizeMcpRemotePath(String(raw.path ?? ''));
  const selectPath = normalizeMcpRemotePath(String(raw.selectPath ?? ''));
  const query = sanitizeMcpDockActionText(raw.query, 500);
  if (profileId) request.profileId = profileId;
  if (pathValue) request.path = pathValue;
  if (selectPath) request.selectPath = selectPath;
  if (query) request.query = query;
  return request;
}

function sanitizeMcpRemoteExplorerActionResult(value: unknown): McpBridgeRemoteExplorerActionResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  return {
    requestId,
    action: sanitizeMcpRemoteExplorerAction(raw.action),
    ok: raw.ok === true,
    remoteExplorerOpen: typeof raw.remoteExplorerOpen === 'boolean' ? raw.remoteExplorerOpen : undefined,
    profileId: sanitizeMcpDockActionText(raw.profileId, 300) || undefined,
    path: normalizeMcpRemotePath(String(raw.path ?? '')) || undefined,
    selectPath: normalizeMcpRemotePath(String(raw.selectPath ?? '')) || undefined,
    query: sanitizeMcpDockActionText(raw.query, 500) || undefined,
    message: sanitizeMcpDockActionText(raw.message, 500) || undefined,
    error: sanitizeMcpDockActionText(raw.error, 500) || undefined,
  };
}

function sanitizeMcpTerminalUiAction(value: unknown): McpBridgeTerminalUiActionPayload['action'] {
  switch (value) {
    case 'paste':
    case 'selectAll':
    case 'clearScreen':
    case 'clearScrollback':
    case 'scrollTop':
    case 'scrollBottom':
    case 'setFitLock':
    case 'toggleFitLock':
    case 'findNext':
    case 'findPrev':
    case 'saveLog':
    case 'sendSelectionToBot':
    case 'sendRecentOutputToBot':
      return value;
    case 'copy':
    default:
      return 'copy';
  }
}

function sanitizeMcpTerminalUiActionRequest(body: unknown): Omit<McpBridgeTerminalUiActionPayload, 'requestId'> {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const action = sanitizeMcpTerminalUiAction(raw.action);
  const request: Omit<McpBridgeTerminalUiActionPayload, 'requestId'> = { action };
  const termId = sanitizeMcpDockActionText(raw.termId, 200);
  const query = sanitizeMcpDockActionText(raw.query, 500);
  if (termId) request.termId = termId;
  if (query) request.query = query;
  if (typeof raw.locked === 'boolean') request.locked = raw.locked;
  return request;
}

function sanitizeMcpTerminalUiActionResult(value: unknown): McpBridgeTerminalUiActionResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  return {
    requestId,
    action: sanitizeMcpTerminalUiAction(raw.action),
    ok: raw.ok === true,
    termId: sanitizeMcpDockActionText(raw.termId, 200) || undefined,
    query: sanitizeMcpDockActionText(raw.query, 500) || undefined,
    locked: typeof raw.locked === 'boolean' ? raw.locked : undefined,
    message: sanitizeMcpDockActionText(raw.message, 500) || undefined,
    error: sanitizeMcpDockActionText(raw.error, 500) || undefined,
  };
}

function sanitizeMcpOnboardingStepAction(value: unknown): McpBridgeOnboardingStepActionPayload['action'] {
  return value === 'run' ? 'run' : 'verify';
}

function sanitizeMcpOnboardingStepActionRequest(
  body: unknown,
  actionOverride?: McpBridgeOnboardingStepActionPayload['action'],
): Omit<McpBridgeOnboardingStepActionPayload, 'requestId'> {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const stepId = sanitizeMcpDockActionText(raw.stepId, 160);
  const request: Omit<McpBridgeOnboardingStepActionPayload, 'requestId'> = {
    action: actionOverride ?? sanitizeMcpOnboardingStepAction(raw.action),
    stepId,
  };
  const sampleWorkspacePath = sanitizeMcpDockActionText(raw.sampleWorkspacePath, 1_000);
  if (sampleWorkspacePath) request.sampleWorkspacePath = sampleWorkspacePath;
  return request;
}

function sanitizeMcpOnboardingStepActionResult(value: unknown): McpBridgeOnboardingStepActionResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  const stepId = sanitizeMcpDockActionText(raw.stepId, 160);
  if (!requestId || !stepId) return null;
  return {
    requestId,
    action: sanitizeMcpOnboardingStepAction(raw.action),
    stepId,
    ok: raw.ok === true,
    ran: typeof raw.ran === 'boolean' ? raw.ran : undefined,
    verified: typeof raw.verified === 'boolean' ? raw.verified : undefined,
    passed: typeof raw.passed === 'boolean' ? raw.passed : undefined,
    message: sanitizeMcpDockActionText(raw.message, 1_000) || undefined,
    sampleWorkspacePath: sanitizeMcpDockActionText(raw.sampleWorkspacePath, 1_000) || undefined,
    error: sanitizeMcpDockActionText(raw.error, 1_000) || undefined,
  };
}

function sanitizeMcpOnboardingScenarioRunRequest(
  body: unknown,
): Omit<McpBridgeOnboardingScenarioRunPayload, 'requestId'> {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const sampleWorkspacePath = sanitizeMcpDockActionText(raw.sampleWorkspacePath, 1_000);
  const artifactDir = sanitizeMcpDockActionText(raw.artifactDir, 1_000);
  const rawDelayMs = Number(raw.delayMs);
  const request: Omit<McpBridgeOnboardingScenarioRunPayload, 'requestId'> = {
    trackId: 'basic-desk',
    prepareSample: raw.prepareSample !== false,
    resetSample: raw.resetSample === true,
    stopOnFailure: raw.stopOnFailure !== false,
    delayMs: Number.isFinite(rawDelayMs) ? Math.max(0, Math.min(5_000, Math.round(rawDelayMs))) : 250,
    capture: raw.capture === true,
    caption: raw.caption === true,
  };
  if (sampleWorkspacePath) request.sampleWorkspacePath = sampleWorkspacePath;
  if (artifactDir) request.artifactDir = artifactDir;
  return request;
}

function sanitizeMcpOnboardingScenarioRunResult(value: unknown): McpBridgeOnboardingScenarioRunResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
  const steps = rawSteps
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item, index): McpBridgeOnboardingScenarioRunResult['steps'][number] => {
      const step = item as Record<string, unknown>;
      return {
        stepId: sanitizeMcpDockActionText(step.stepId, 160),
        index: Number.isFinite(Number(step.index)) ? Number(step.index) : index,
        total: Number.isFinite(Number(step.total)) ? Number(step.total) : rawSteps.length,
        ok: step.ok === true,
        ran: step.ran === true,
        verified: step.verified === true,
        passed: step.passed === true,
        message: sanitizeMcpDockActionText(step.message, 1_000) || undefined,
        caption: sanitizeMcpDockActionText(step.caption, 1_000) || undefined,
        capture:
          step.capture && typeof step.capture === 'object' && !Array.isArray(step.capture)
            ? (step.capture as CapturePaneResult)
            : undefined,
        screenshotPath: sanitizeMcpDockActionText(step.screenshotPath, 1_000) || undefined,
        screenshotFileName: sanitizeMcpDockActionText(step.screenshotFileName, 240) || undefined,
        error: sanitizeMcpDockActionText(step.error, 1_000) || undefined,
      };
    })
    .filter((step) => Boolean(step.stepId));
  return {
    requestId,
    trackId: 'basic-desk',
    ok: raw.ok === true,
    completed: raw.completed === true,
    stoppedAtStepId: sanitizeMcpDockActionText(raw.stoppedAtStepId, 160) || undefined,
    sampleWorkspacePath: sanitizeMcpDockActionText(raw.sampleWorkspacePath, 1_000) || undefined,
    steps,
    artifact:
      raw.artifact && typeof raw.artifact === 'object' && !Array.isArray(raw.artifact)
        ? (raw.artifact as OnboardingRunArtifact)
        : undefined,
    error: sanitizeMcpDockActionText(raw.error, 1_000) || undefined,
  };
}

function sanitizeMcpOnboardingRunPreviewRequest(
  body: unknown,
): Omit<McpBridgeOnboardingRunPreviewPayload, 'requestId'> {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const runId = sanitizeMcpDockActionText(raw.runId, 240);
  return {
    ...(runId ? { runId } : {}),
    ensureVisible: raw.ensureVisible !== false,
    capture: raw.capture === true,
  };
}

function sanitizeMcpOnboardingRunPreviewResult(value: unknown): McpBridgeOnboardingRunPreviewResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  return {
    requestId,
    ok: raw.ok === true,
    runId: sanitizeMcpDockActionText(raw.runId, 240) || undefined,
    selected: typeof raw.selected === 'boolean' ? raw.selected : undefined,
    artifact:
      raw.artifact && typeof raw.artifact === 'object' && !Array.isArray(raw.artifact)
        ? (raw.artifact as OnboardingRunArtifact)
        : undefined,
    capture: sanitizeMcpCapturePaneArtifact(raw.capture),
    error: sanitizeMcpDockActionText(raw.error, 1_000) || undefined,
  };
}

function sanitizeMcpOnboardingDemoModeRunRequest(
  body: unknown,
): Omit<McpBridgeOnboardingDemoModeRunPayload, 'requestId'> {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  return {
    ensureVisible: raw.ensureVisible !== false,
    capture: raw.capture !== false,
    openPlayer: raw.openPlayer === true,
  };
}

function sanitizeMcpOnboardingDemoModeRunResult(value: unknown): McpBridgeOnboardingDemoModeRunResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  const uiRaw =
    raw.ui && typeof raw.ui === 'object' && !Array.isArray(raw.ui) ? (raw.ui as Record<string, unknown>) : null;
  const ui = uiRaw
    ? {
        mode: uiRaw.mode === 'learn' ? ('learn' as const) : ('demo' as const),
        statusText: sanitizeMcpDockActionText(uiRaw.statusText, 1_000) || undefined,
        failureText: sanitizeMcpDockActionText(uiRaw.failureText, 1_000) || undefined,
        scenarioSummary: sanitizeMcpDockActionText(uiRaw.scenarioSummary, 1_000) || undefined,
        runArtifactCount: Number.isFinite(Number(uiRaw.runArtifactCount))
          ? Math.max(0, Math.trunc(Number(uiRaw.runArtifactCount)))
          : 0,
        selectedRunId: sanitizeMcpDockActionText(uiRaw.selectedRunId, 240) || undefined,
        demoRouteRunId: sanitizeMcpDockActionText(uiRaw.demoRouteRunId, 240) || undefined,
        sceneCount: Number.isFinite(Number(uiRaw.sceneCount)) ? Math.max(0, Math.trunc(Number(uiRaw.sceneCount))) : 0,
        routeViewerVisible: uiRaw.routeViewerVisible === true,
        runViewerVisible: uiRaw.runViewerVisible === true,
        storyboardActionVisible: uiRaw.storyboardActionVisible === true,
        playerActionVisible: uiRaw.playerActionVisible === true,
      }
    : undefined;
  const playerRaw =
    raw.playerOpen && typeof raw.playerOpen === 'object' && !Array.isArray(raw.playerOpen)
      ? (raw.playerOpen as Record<string, unknown>)
      : null;
  const playerTarget = sanitizeMcpDockActionText(playerRaw?.target, 80);
  const normalizedPlayerTarget = (
    playerTarget === 'json' ||
    playerTarget === 'run' ||
    playerTarget === 'preview' ||
    playerTarget === 'scene' ||
    playerTarget === 'storyboard' ||
    playerTarget === 'demoPreset'
      ? playerTarget
      : 'demoPreset'
  ) as NonNullable<McpBridgeOnboardingDemoModeRunResult['playerOpen']>['target'];
  const playerOpen = playerRaw
    ? {
        ok: playerRaw.ok === true,
        target: normalizedPlayerTarget,
        path: sanitizeMcpDockActionText(playerRaw.path, 1_000),
        error: sanitizeMcpDockActionText(playerRaw.error, 1_000) || undefined,
      }
    : undefined;
  return {
    requestId,
    ok: raw.ok === true,
    completed: typeof raw.completed === 'boolean' ? raw.completed : undefined,
    scenario: sanitizeMcpOnboardingScenarioRunResult(raw.scenario) ?? undefined,
    demoRouteSave:
      raw.demoRouteSave && typeof raw.demoRouteSave === 'object' && !Array.isArray(raw.demoRouteSave)
        ? (raw.demoRouteSave as McpBridgeOnboardingDemoModeRunResult['demoRouteSave'])
        : undefined,
    ui,
    capture: sanitizeMcpCapturePaneArtifact(raw.capture),
    playerOpen,
    error: sanitizeMcpDockActionText(raw.error, 1_000) || undefined,
  };
}

function sanitizeMcpDemoLabPlaybackControlAction(value: unknown): McpBridgeDemoLabPlaybackControlAction {
  return value === 'start' ||
    value === 'stop' ||
    value === 'next' ||
    value === 'prev' ||
    value === 'reset' ||
    value === 'mode'
    ? value
    : 'status';
}

function sanitizeMcpDemoLabPlaybackMode(value: unknown): McpBridgeDemoLabPlaybackControlPayload['mode'] | undefined {
  return value === 'preview' || value === 'code' || value === 'split' ? value : undefined;
}

function sanitizeMcpFiniteNumber(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function sanitizeMcpDemoLabPlaybackControlRequest(
  body: unknown,
): Omit<McpBridgeDemoLabPlaybackControlPayload, 'requestId'> {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const request: Omit<McpBridgeDemoLabPlaybackControlPayload, 'requestId'> = {
    action: sanitizeMcpDemoLabPlaybackControlAction(raw.action),
  };
  const contentId = sanitizeMcpDockActionText(raw.contentId, 200);
  const mode = sanitizeMcpDemoLabPlaybackMode(raw.mode);
  if (contentId) request.contentId = contentId;
  if (mode) request.mode = mode;
  return request;
}

function sanitizeMcpDemoLabPlaybackControlResult(value: unknown): McpBridgeDemoLabPlaybackControlResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  const action = sanitizeMcpDemoLabPlaybackControlAction(raw.action);
  return {
    requestId,
    ok: raw.ok === true,
    action,
    contentId: sanitizeMcpDockActionText(raw.contentId, 200) || undefined,
    title: sanitizeMcpDockActionText(raw.title, 300) || undefined,
    sourceLabel: sanitizeMcpDockActionText(raw.sourceLabel, 300) || undefined,
    filePath: sanitizeMcpDockActionText(raw.filePath, 1_000) || undefined,
    mode: sanitizeMcpDemoLabPlaybackMode(raw.mode),
    isPlaying: typeof raw.isPlaying === 'boolean' ? raw.isPlaying : undefined,
    sceneIndex: sanitizeMcpFiniteNumber(raw.sceneIndex),
    sceneCount: sanitizeMcpFiniteNumber(raw.sceneCount),
    actionIndex: sanitizeMcpFiniteNumber(raw.actionIndex),
    actionCount: sanitizeMcpFiniteNumber(raw.actionCount),
    activeSceneTitle:
      typeof raw.activeSceneTitle === 'string' ? sanitizeMcpDockActionText(raw.activeSceneTitle, 300) : null,
    activeActionType:
      typeof raw.activeActionType === 'string' ? sanitizeMcpDockActionText(raw.activeActionType, 120) : null,
    progress: sanitizeMcpFiniteNumber(raw.progress),
    elapsedMs: sanitizeMcpFiniteNumber(raw.elapsedMs),
    durationMs: sanitizeMcpFiniteNumber(raw.durationMs),
    error: sanitizeMcpDockActionText(raw.error, 1_000) || undefined,
  };
}

function sanitizeMcpFavoritesAction(value: unknown): McpBridgeFavoritesActionPayload['action'] {
  switch (value) {
    case 'add':
    case 'addCurrentTab':
    case 'remove':
    case 'open':
    case 'openInTerminal':
    case 'copyPath':
    case 'showTab':
      return value;
    case 'list':
    default:
      return 'list';
  }
}

function sanitizeMcpFavoriteKind(value: unknown): McpBridgeFavoritesActionPayload['kind'] | undefined {
  switch (value) {
    case 'file':
    case 'folder':
    case 'url':
    case 'terminal-path':
      return value;
    default:
      return undefined;
  }
}

function sanitizeMcpFavoritesTab(value: unknown): McpBridgeFavoritesActionPayload['tab'] | undefined {
  switch (value) {
    case 'captures':
    case 'remote-files':
    case 'favorites':
      return value;
    default:
      return undefined;
  }
}

function sanitizeMcpShellKind(value: unknown): ShellKind | undefined {
  switch (value) {
    case 'powershell':
    case 'cmd':
    case 'pwsh':
    case 'wsl':
    case 'zsh':
    case 'bash':
    case 'sh':
      return value;
    default:
      return undefined;
  }
}

function sanitizeMcpFavoritesActionRequest(body: unknown): Omit<McpBridgeFavoritesActionPayload, 'requestId'> {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const action = sanitizeMcpFavoritesAction(raw.action);
  const request: Omit<McpBridgeFavoritesActionPayload, 'requestId'> = { action };
  const id = sanitizeMcpDockActionText(raw.id, 200);
  const pathValue = sanitizeMcpDockActionText(raw.path, 2000);
  const label = sanitizeMcpDockActionText(raw.label, 500);
  const kind = sanitizeMcpFavoriteKind(raw.kind);
  const shell = sanitizeMcpShellKind(raw.shell);
  const tab = sanitizeMcpFavoritesTab(raw.tab);
  if (id) request.id = id;
  if (pathValue)
    request.path = /^https?:\/\//i.test(pathValue)
      ? pathValue
      : normalizeBridgePathForPlatform(pathValue, { platform: process.platform });
  if (label) request.label = label;
  if (kind) request.kind = kind;
  if (shell) request.shell = shell;
  if (tab) request.tab = tab;
  return request;
}

function sanitizeMcpFavoritesActionResult(value: unknown): McpBridgeFavoritesActionResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  const items = Array.isArray(raw.items)
    ? raw.items
        .map((item): NonNullable<McpBridgeFavoritesActionResult['items']>[number] | null => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
          const source = item as Record<string, unknown>;
          const id = sanitizeMcpDockActionText(source.id, 200);
          const kind = sanitizeMcpFavoriteKind(source.kind);
          const pathValue = sanitizeMcpDockActionText(source.path, 2000);
          const label = sanitizeMcpDockActionText(source.label, 500);
          const addedAt = Number(source.addedAt);
          if (!id || !kind || !pathValue || !label) return null;
          return {
            id,
            kind,
            path: pathValue,
            label,
            addedAt: Number.isFinite(addedAt) ? addedAt : 0,
          };
        })
        .filter((item): item is NonNullable<McpBridgeFavoritesActionResult['items']>[number] => Boolean(item))
    : undefined;
  return {
    requestId,
    action: sanitizeMcpFavoritesAction(raw.action),
    ok: raw.ok === true,
    id: sanitizeMcpDockActionText(raw.id, 200) || undefined,
    path: sanitizeMcpDockActionText(raw.path, 2000) || undefined,
    tab: sanitizeMcpFavoritesTab(raw.tab),
    items,
    message: sanitizeMcpDockActionText(raw.message, 500) || undefined,
    error: sanitizeMcpDockActionText(raw.error, 500) || undefined,
  };
}

function sanitizeMcpCapturePaneArtifact(value: unknown): CapturePaneResult | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const filePath = sanitizeMcpDockActionText(raw.filePath, 1000);
  const fileName = sanitizeMcpDockActionText(raw.fileName, 300);
  if (!filePath || !fileName) return undefined;
  const createdAt = Number(raw.createdAt);
  const size = Number(raw.size);
  return {
    filePath,
    fileName,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    size: Number.isFinite(size) && size >= 0 ? Math.trunc(size) : 0,
    paneId: sanitizeMcpDockActionText(raw.paneId, 200) || undefined,
    contentId: sanitizeMcpDockActionText(raw.contentId, 200) || undefined,
    title: sanitizeMcpDockActionText(raw.title, 500) || undefined,
    contentType: sanitizeMcpDockActionText(raw.contentType, 100) || undefined,
  };
}

function sanitizeMcpCaptureActivePaneResult(value: unknown): McpBridgeCaptureActivePaneResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  const targetRaw =
    raw.target && typeof raw.target === 'object' && !Array.isArray(raw.target)
      ? (raw.target as Record<string, unknown>)
      : null;
  const target = targetRaw
    ? {
        paneId: sanitizeMcpDockActionText(targetRaw.paneId, 200),
        contentId: sanitizeMcpDockActionText(targetRaw.contentId, 200),
        title: sanitizeMcpDockActionText(targetRaw.title, 500),
        contentType: sanitizeMcpDockActionText(targetRaw.contentType, 100),
      }
    : undefined;
  const normalizedTarget = target?.paneId && target.contentId ? target : undefined;
  return {
    requestId,
    ok: raw.ok === true,
    target: normalizedTarget,
    artifact: sanitizeMcpCapturePaneArtifact(raw.artifact),
    error: sanitizeMcpDockActionText(raw.error, 1000) || undefined,
  };
}

function sanitizeMcpCaptureActivePaneRequest(value: unknown): Omit<McpBridgeCaptureActivePanePayload, 'requestId'> {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const paneId = sanitizeMcpDockActionText(raw.paneId, 200);
  const contentId = sanitizeMcpDockActionText(raw.contentId, 200);
  return {
    ...(paneId ? { paneId } : {}),
    ...(contentId ? { contentId } : {}),
    ...(typeof raw.preferArtifactPane === 'boolean' ? { preferArtifactPane: raw.preferArtifactPane } : {}),
  };
}

function sanitizeMcpGowooriArtifactVisibilityRequest(
  value: unknown,
): Omit<McpBridgeGowooriArtifactVisibilityPayload, 'requestId'> {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const paneId = sanitizeMcpDockActionText(raw.paneId, 200);
  const contentId = sanitizeMcpDockActionText(raw.contentId, 200);
  const components = Array.isArray(raw.components)
    ? raw.components
        .map((component) => sanitizeMcpDockActionText(component, 80))
        .filter(Boolean)
        .slice(0, 20)
    : [];
  return {
    ...(paneId ? { paneId } : {}),
    ...(contentId ? { contentId } : {}),
    ...(components.length ? { components } : {}),
    ...(typeof raw.reveal === 'boolean' ? { reveal: raw.reveal } : {}),
  };
}

function sanitizeMcpGowooriArtifactVisibilityResult(value: unknown): McpBridgeGowooriArtifactVisibilityResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  const components = Array.isArray(raw.components)
    ? raw.components
        .map((component): McpBridgeGowooriArtifactVisibilityResult['components'][number] | null => {
          if (!component || typeof component !== 'object' || Array.isArray(component)) return null;
          const item = component as Record<string, unknown>;
          const name = sanitizeMcpDockActionText(item.component, 80);
          if (!name) return null;
          const viewportRaw =
            item.viewport && typeof item.viewport === 'object' && !Array.isArray(item.viewport)
              ? (item.viewport as Record<string, unknown>)
              : null;
          const sanitizedComponent: McpBridgeGowooriArtifactVisibilityResult['components'][number] = {
            component: name,
            selector: sanitizeMcpDockActionText(item.selector, 300),
            present: item.present === true,
            visible: item.visible === true,
          };
          if (Number.isFinite(Number(item.width))) sanitizedComponent.width = Number(item.width);
          if (Number.isFinite(Number(item.height))) sanitizedComponent.height = Number(item.height);
          if (Number.isFinite(Number(item.x))) sanitizedComponent.x = Number(item.x);
          if (Number.isFinite(Number(item.y))) sanitizedComponent.y = Number(item.y);
          if (Number.isFinite(Number(item.visibleRatio))) sanitizedComponent.visibleRatio = Number(item.visibleRatio);
          if (viewportRaw) {
            sanitizedComponent.viewport = {
              width: Number.isFinite(Number(viewportRaw.width)) ? Number(viewportRaw.width) : 0,
              height: Number.isFinite(Number(viewportRaw.height)) ? Number(viewportRaw.height) : 0,
            };
          }
          const error = sanitizeMcpDockActionText(item.error, 1000);
          if (error) sanitizedComponent.error = error;
          return sanitizedComponent;
        })
        .filter((component): component is McpBridgeGowooriArtifactVisibilityResult['components'][number] =>
          Boolean(component),
        )
    : [];
  return {
    requestId,
    ok: raw.ok === true,
    paneId: sanitizeMcpDockActionText(raw.paneId, 200) || undefined,
    contentId: sanitizeMcpDockActionText(raw.contentId, 200) || undefined,
    components,
    error: sanitizeMcpDockActionText(raw.error, 1000) || undefined,
  };
}

function sanitizeMcpGowooriOverlayRequest(value: unknown): Omit<McpBridgeGowooriOverlayPayload, 'requestId'> {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const zoom = Number(raw.zoom);
  return {
    id: sanitizeMcpDockActionText(raw.id, 120) || undefined,
    title: sanitizeMcpDockActionText(raw.title, 200) || undefined,
    label: sanitizeMcpDockActionText(raw.label, 240) || undefined,
    source: sanitizeMcpGowooriChatSource(raw.source),
    zoom: Number.isFinite(zoom) ? Math.min(200, Math.max(50, Math.round(zoom))) : undefined,
    contentId: sanitizeMcpDockActionText(raw.contentId, 200) || undefined,
  };
}

function sanitizeMcpGowooriOverlayResult(value: unknown): McpBridgeGowooriOverlayResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  const sourceLength = Number(raw.sourceLength);
  return {
    requestId,
    ok: raw.ok === true,
    visible: raw.visible === true,
    id: sanitizeMcpDockActionText(raw.id, 120) || undefined,
    title: sanitizeMcpDockActionText(raw.title, 200) || undefined,
    label: sanitizeMcpDockActionText(raw.label, 240) || undefined,
    sourceLength: Number.isFinite(sourceLength) && sourceLength >= 0 ? Math.round(sourceLength) : undefined,
    contentId: sanitizeMcpDockActionText(raw.contentId, 200) || undefined,
    error: sanitizeMcpDockActionText(raw.error, 1000) || undefined,
  };
}

function sanitizeMcpGowooriChatRunRequest(value: unknown): Omit<McpBridgeGowooriChatRunPayload, 'requestId'> {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const prompt = sanitizeMcpDockActionText(raw.prompt, MCP_GOWOORI_CHAT_PROMPT_MAX_CHARS);
  if (!prompt) throw new Error('prompt is required');
  const provider = sanitizeMcpDockActionText(raw.provider, 40);
  const requestMode = sanitizeMcpDockActionText(raw.requestMode, 40);
  const targetMode = sanitizeMcpDockActionText(raw.targetMode, 200);
  const targetContentId = sanitizeMcpDockActionText(raw.targetContentId, 200);
  const sportsStandingsEndpoint = sanitizeMcpDockActionText(raw.sportsStandingsEndpoint, 2000);
  const timeoutMs = Number(raw.timeoutMs);
  const resolvedTimeoutMs = resolveMcpGowooriChatRunTimeoutMs(provider, timeoutMs);
  return {
    prompt,
    ...(provider ? { provider: provider as McpBridgeGowooriChatRunPayload['provider'] } : {}),
    ...(requestMode ? { requestMode: requestMode as McpBridgeGowooriChatRunPayload['requestMode'] } : {}),
    ...(targetMode ? { targetMode } : {}),
    ...(targetContentId ? { targetContentId } : {}),
    ...(sportsStandingsEndpoint ? { sportsStandingsEndpoint } : {}),
    ...(typeof raw.autoApply === 'boolean' ? { autoApply: raw.autoApply } : {}),
    timeoutMs: resolvedTimeoutMs,
  };
}

function sanitizeMcpGowooriChatDiagnostics(value: unknown): McpBridgeGowooriChatDiagnostic[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const diagnostics = value
    .slice(0, 20)
    .map((item): McpBridgeGowooriChatDiagnostic | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const raw = item as Record<string, unknown>;
      const message = sanitizeMcpDockActionText(raw.message, 1000);
      if (!message) return null;
      return {
        severity: sanitizeMcpDockActionText(raw.severity, 40) || 'info',
        message,
      };
    })
    .filter((item): item is McpBridgeGowooriChatDiagnostic => Boolean(item));
  return diagnostics.length > 0 ? diagnostics : undefined;
}

function sanitizeMcpGowooriChatRunResult(value: unknown): McpBridgeGowooriChatRunResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  const prompt = sanitizeMcpDockActionText(raw.prompt, MCP_GOWOORI_CHAT_PROMPT_MAX_CHARS);
  if (!requestId) return null;
  const sourceLength = Number(raw.sourceLength);
  return {
    requestId,
    ok: raw.ok === true,
    prompt,
    ...(Number.isFinite(sourceLength) && sourceLength >= 0 ? { sourceLength: Math.trunc(sourceLength) } : {}),
    source: sanitizeMcpGowooriChatSource(raw.source),
    summary: sanitizeMcpDockActionText(raw.summary, 1000) || undefined,
    label: sanitizeMcpDockActionText(raw.label, 500) || undefined,
    applied: typeof raw.applied === 'boolean' ? raw.applied : undefined,
    targetMode: sanitizeMcpDockActionText(raw.targetMode, 200) || undefined,
    diagnostics: sanitizeMcpGowooriChatDiagnostics(raw.diagnostics),
    autoRepairAttempted: typeof raw.autoRepairAttempted === 'boolean' ? raw.autoRepairAttempted : undefined,
    autoRepairSucceeded: typeof raw.autoRepairSucceeded === 'boolean' ? raw.autoRepairSucceeded : undefined,
    error: sanitizeMcpDockActionText(raw.error, 1000) || undefined,
  };
}

const mcpGowooriChatRunStatuses: ReadonlySet<McpBridgeGowooriChatRunStatus> = new Set([
  'queued',
  'running',
  'completed',
  'failed',
  'timeout',
  'cancelled',
]);
const mcpGowooriChatRunProgressPhases: ReadonlySet<McpBridgeGowooriChatRunProgressPhase> = new Set([
  'queued',
  'starting',
  'spawned',
  'sending-prompt',
  'waiting',
  'receiving-output',
  'streaming',
  'validating',
  'repairing',
  'applying',
  'completed',
  'timeout',
  'cancelled',
  'error',
]);

function sanitizeMcpGowooriChatRunStatus(
  value: unknown,
  fallback: McpBridgeGowooriChatRunStatus,
): McpBridgeGowooriChatRunStatus {
  return typeof value === 'string' && mcpGowooriChatRunStatuses.has(value as McpBridgeGowooriChatRunStatus)
    ? (value as McpBridgeGowooriChatRunStatus)
    : fallback;
}

function sanitizeMcpGowooriChatRunProgressPhase(
  value: unknown,
  fallback: McpBridgeGowooriChatRunProgressPhase,
): McpBridgeGowooriChatRunProgressPhase {
  return typeof value === 'string' && mcpGowooriChatRunProgressPhases.has(value as McpBridgeGowooriChatRunProgressPhase)
    ? (value as McpBridgeGowooriChatRunProgressPhase)
    : fallback;
}

function createMcpGowooriChatRunProgress(
  requestId: string,
  status: McpBridgeGowooriChatRunStatus,
  phase: McpBridgeGowooriChatRunProgressPhase,
  message: string,
  extra: Partial<Omit<McpBridgeGowooriChatRunProgress, 'requestId' | 'status' | 'phase' | 'message' | 'at'>> = {},
): McpBridgeGowooriChatRunProgress {
  return {
    requestId,
    status,
    phase,
    message,
    ...extra,
    at: new Date().toISOString(),
  };
}

function sanitizeMcpGowooriChatRunProgress(value: unknown): McpBridgeGowooriChatRunProgress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  const message = sanitizeMcpDockActionText(raw.message, 1000);
  if (!requestId || !message) return null;
  const elapsedMs = Number(raw.elapsedMs);
  const receivedBytes = Number(raw.receivedBytes);
  const sourceLength = Number(raw.sourceLength);
  return {
    requestId,
    status: sanitizeMcpGowooriChatRunStatus(raw.status, 'running'),
    phase: sanitizeMcpGowooriChatRunProgressPhase(raw.phase, 'waiting'),
    message,
    provider: sanitizeMcpDockActionText(raw.provider, 80) || undefined,
    prompt: sanitizeMcpDockActionText(raw.prompt, MCP_GOWOORI_CHAT_PROMPT_MAX_CHARS) || undefined,
    elapsedMs: Number.isFinite(elapsedMs) && elapsedMs >= 0 ? Math.trunc(elapsedMs) : undefined,
    receivedBytes: Number.isFinite(receivedBytes) && receivedBytes >= 0 ? Math.trunc(receivedBytes) : undefined,
    sourceLength: Number.isFinite(sourceLength) && sourceLength >= 0 ? Math.trunc(sourceLength) : undefined,
    at: sanitizeMcpDockActionText(raw.at, 80) || new Date().toISOString(),
  };
}

function appendMcpGowooriChatRunProgress(
  entry: PendingMcpGowooriChatRunEntry,
  progress: McpBridgeGowooriChatRunProgress,
): void {
  if (entry.deferredBusyResultTimeout && progress.status === 'running') {
    clearTimeout(entry.deferredBusyResultTimeout);
    entry.deferredBusyResultTimeout = undefined;
    entry.deferredBusyResult = undefined;
  }
  entry.status = progress.status;
  entry.progress.push(progress);
  if (entry.progress.length > MCP_GOWOORI_CHAT_PROGRESS_MAX_ITEMS) {
    entry.progress.splice(0, entry.progress.length - MCP_GOWOORI_CHAT_PROGRESS_MAX_ITEMS);
  }
}

function isMcpGowooriChatBusyResult(result: McpBridgeGowooriChatRunResult): boolean {
  return result.ok !== true && /GowooriChat is already generating/i.test(String(result.error || ''));
}

function hasMcpGowooriChatRendererProgress(entry: PendingMcpGowooriChatRunEntry): boolean {
  return entry.progress.some(
    (progress) =>
      progress.status === 'running' &&
      progress.message !== 'GowooriChat run queued.' &&
      progress.message !== 'GowooriChat run sent to renderer.',
  );
}

function createMcpGowooriChatRunSnapshot(entry: PendingMcpGowooriChatRunEntry): McpBridgeGowooriChatAsyncRunSnapshot {
  return {
    requestId: entry.requestId,
    ok: entry.status === 'completed',
    status: entry.status,
    prompt: entry.prompt,
    queuedAt: entry.queuedAt,
    startedAt: entry.startedAt,
    completedAt: entry.completedAt,
    progress: [...entry.progress],
    result: entry.result,
    error: entry.error,
  };
}

function rememberCompletedMcpGowooriChatRun(snapshot: McpBridgeGowooriChatAsyncRunSnapshot): void {
  completedMcpGowooriChatRuns.set(snapshot.requestId, snapshot);
  while (completedMcpGowooriChatRuns.size > MCP_GOWOORI_CHAT_COMPLETED_RUN_MAX_ITEMS) {
    const oldestKey = completedMcpGowooriChatRuns.keys().next().value as string | undefined;
    if (!oldestKey) break;
    completedMcpGowooriChatRuns.delete(oldestKey);
  }
}

function getMcpGowooriChatRunSnapshot(requestId: string): McpBridgeGowooriChatAsyncRunSnapshot | null {
  const pending = pendingMcpGowooriChatRuns.get(requestId);
  if (pending) return createMcpGowooriChatRunSnapshot(pending);
  return completedMcpGowooriChatRuns.get(requestId) ?? null;
}

function finalizeMcpGowooriChatRun(
  requestId: string,
  result: McpBridgeGowooriChatRunResult,
  status: McpBridgeGowooriChatRunStatus,
  phase: McpBridgeGowooriChatRunProgressPhase,
  message: string,
): boolean {
  const pending = pendingMcpGowooriChatRuns.get(requestId);
  if (!pending) return false;
  clearTimeout(pending.timeout);
  if (pending.deferredBusyResultTimeout) {
    clearTimeout(pending.deferredBusyResultTimeout);
    pending.deferredBusyResultTimeout = undefined;
    pending.deferredBusyResult = undefined;
  }
  pending.completedAt = new Date().toISOString();
  pending.result = result;
  pending.error = result.error;
  appendMcpGowooriChatRunProgress(
    pending,
    createMcpGowooriChatRunProgress(requestId, status, phase, message, {
      prompt: pending.prompt,
      sourceLength: result.sourceLength,
    }),
  );
  pendingMcpGowooriChatRuns.delete(requestId);
  rememberCompletedMcpGowooriChatRun(createMcpGowooriChatRunSnapshot(pending));
  pending.resolve(result);
  return true;
}

function handleMcpGowooriChatRunResult(result: McpBridgeGowooriChatRunResult): boolean {
  const pending = pendingMcpGowooriChatRuns.get(result.requestId);
  if (!pending) return false;
  if (isMcpGowooriChatBusyResult(result)) {
    if (hasMcpGowooriChatRendererProgress(pending)) {
      return true;
    }
    if (!pending.deferredBusyResultTimeout) {
      appendMcpGowooriChatRunProgress(
        pending,
        createMcpGowooriChatRunProgress(
          result.requestId,
          'running',
          'waiting',
          'GowooriChat reported a busy stale listener; waiting briefly for an active renderer response.',
          {
            prompt: pending.prompt,
            sourceLength: result.sourceLength,
          },
        ),
      );
      pending.deferredBusyResult = result;
      pending.deferredBusyResultTimeout = setTimeout(() => {
        const latestPending = pendingMcpGowooriChatRuns.get(result.requestId);
        if (!latestPending?.deferredBusyResult) return;
        finalizeMcpGowooriChatRun(
          result.requestId,
          latestPending.deferredBusyResult,
          'failed',
          'error',
          latestPending.deferredBusyResult.error || 'GowooriChat run failed.',
        );
      }, MCP_GOWOORI_CHAT_BUSY_RESULT_GRACE_MS);
    }
    return true;
  }
  return finalizeMcpGowooriChatRun(
    result.requestId,
    result,
    result.ok ? 'completed' : 'failed',
    result.ok ? 'completed' : 'error',
    result.ok ? 'GowooriChat run completed.' : result.error || 'GowooriChat run failed.',
  );
}

function waitForMcpDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function hasMcpRendererContentType(contentType: string): boolean {
  return latestMcpRendererState?.contents.some((content) => content.contentType === contentType) === true;
}

function findMcpRendererContentByType(
  contentType: string,
): { contentId: string; paneId: string; windowState: McpBridgeDockActionPayload['windowState'] } | null {
  const state = latestMcpRendererState;
  if (!state) return null;
  const content = state.contents.find((candidate) => candidate.contentType === contentType);
  const contentId = String(content?.id || '').trim();
  if (!contentId) return null;
  const pane = state.panes.find(
    (candidate) => Array.isArray(candidate.contents) && candidate.contents.includes(contentId),
  );
  const paneId = String(pane?.id || '').trim();
  if (!paneId) return null;
  const paneState = pane as { state?: unknown; windowState?: unknown };
  const windowState = sanitizeMcpWindowState(paneState.windowState ?? paneState.state);
  return { contentId, paneId, windowState };
}

async function waitForMcpRendererContentType(
  contentType: string,
  timeoutMs = MCP_GOWOORI_CHAT_BOOTSTRAP_TIMEOUT_MS,
): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (hasMcpRendererContentType(contentType)) return true;
    await waitForMcpDelay(100);
  }
  return hasMcpRendererContentType(contentType);
}

async function reconcileMcpRendererContentPlacement(
  contentType: string,
  panelPlacement?: ExtensionPanelPlacement,
): Promise<McpBridgeDockActionResult | null> {
  const desiredState: McpBridgeDockActionPayload['windowState'] =
    panelPlacement === 'left' || panelPlacement === 'right' || panelPlacement === 'top' || panelPlacement === 'bottom'
      ? panelPlacement
      : panelPlacement === 'tab'
        ? 'document'
        : undefined;
  if (!desiredState) return null;

  const target = findMcpRendererContentByType(contentType);
  if (!target) return null;
  if (target.windowState === desiredState) return null;

  const result = await sendMcpDockActionToRenderer('move', {
    contentId: target.contentId,
    paneId: target.paneId,
    windowState: desiredState,
  });
  if (result.ok !== true) {
    throw new Error(result.error || `Failed to move ${contentType} to ${desiredState}.`);
  }
  await waitForMcpDelay(150);
  return result;
}

async function ensureMcpRendererToolContent(
  commandId: string,
  contentType: string,
  label: string,
  requestId: string,
  prompt: string,
  provider?: string,
  panelPlacement?: ExtensionPanelPlacement,
): Promise<void> {
  const pending = pendingMcpGowooriChatRuns.get(requestId);
  if (hasMcpRendererContentType(contentType)) {
    const placementResult = await reconcileMcpRendererContentPlacement(contentType, panelPlacement);
    if (pending) {
      appendMcpGowooriChatRunProgress(
        pending,
        createMcpGowooriChatRunProgress(
          requestId,
          'running',
          'starting',
          placementResult?.ok
            ? `${label} is already open; moved it to ${panelPlacement}.`
            : `${label} is already open.`,
          { provider, prompt },
        ),
      );
    }
    return;
  }

  if (pending) {
    appendMcpGowooriChatRunProgress(
      pending,
      createMcpGowooriChatRunProgress(
        requestId,
        'running',
        'starting',
        `${label} is not open; opening it before running GowooriChat.`,
        { provider, prompt },
      ),
    );
  }

  const result = await runMcpExtensionCommand(commandId, panelPlacement);
  if (result.ok !== true || result.actionsDispatched !== true) {
    throw new Error(result.error || `Failed to open ${label}.`);
  }

  const ready = await waitForMcpRendererContentType(contentType);
  if (!ready) {
    throw new Error(`${label} did not become available before GowooriChat run dispatch.`);
  }
}

function shouldBootstrapGowooriViewerForMcpRun(request: Omit<McpBridgeGowooriChatRunPayload, 'requestId'>): boolean {
  const target = String(request.targetContentId || request.targetMode || '').trim();
  if (target === 'new') return false;
  if (target && target !== 'all') return false;
  return !hasMcpRendererContentType('gowoori');
}

async function dispatchMcpGowooriChatRun(
  targetWindow: BrowserWindow,
  payload: McpBridgeGowooriChatRunPayload,
): Promise<void> {
  const pending = pendingMcpGowooriChatRuns.get(payload.requestId);
  const provider = payload.provider;
  await ensureMcpRendererToolContent(
    MCP_GOWOORI_CHAT_COMMAND_ID,
    'gowoori-chat',
    'GowooriChat',
    payload.requestId,
    payload.prompt,
    provider,
    'right',
  );
  if (shouldBootstrapGowooriViewerForMcpRun(payload)) {
    await ensureMcpRendererToolContent(
      MCP_GOWOORI_COMMAND_ID,
      'gowoori',
      'Gowoori / 거울이',
      payload.requestId,
      payload.prompt,
      provider,
      'tab',
    );
  }
  if (!pendingMcpGowooriChatRuns.has(payload.requestId)) return;
  if (pending) {
    appendMcpGowooriChatRunProgress(
      pending,
      createMcpGowooriChatRunProgress(payload.requestId, 'running', 'starting', 'GowooriChat run sent to renderer.', {
        provider,
        prompt: payload.prompt,
      }),
    );
  }
  sendToRenderer(targetWindow, 'mcp:gowoori-chat-run', payload);
}

function createMcpGowooriChatRunSession(request: Omit<McpBridgeGowooriChatRunPayload, 'requestId'>): {
  requestId: string;
  payload: McpBridgeGowooriChatRunPayload;
  promise: Promise<McpBridgeGowooriChatRunResult>;
  snapshot: McpBridgeGowooriChatAsyncRunSnapshot;
} {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  const queuedAt = new Date().toISOString();
  const payload: McpBridgeGowooriChatRunPayload = { requestId, ...request };
  if (!targetWindow) {
    const result: McpBridgeGowooriChatRunResult = {
      requestId,
      ok: false,
      prompt: request.prompt,
      error: 'Xenesis Desk renderer window is not available',
    };
    const snapshot: McpBridgeGowooriChatAsyncRunSnapshot = {
      requestId,
      ok: false,
      status: 'failed',
      prompt: request.prompt,
      queuedAt,
      completedAt: queuedAt,
      progress: [
        createMcpGowooriChatRunProgress(
          requestId,
          'failed',
          'error',
          result.error ?? 'Xenesis Desk renderer window is not available',
          { prompt: request.prompt },
        ),
      ],
      result,
      error: result.error,
    };
    rememberCompletedMcpGowooriChatRun(snapshot);
    return { requestId, payload, promise: Promise.resolve(result), snapshot };
  }

  showMcpTargetWindow(targetWindow);
  const promise = new Promise<McpBridgeGowooriChatRunResult>((resolve) => {
    const runTimeoutMs = resolveMcpGowooriChatRunTimeoutMs(request.provider, request.timeoutMs);
    const timeout = setTimeout(() => {
      finalizeMcpGowooriChatRun(
        requestId,
        { requestId, ok: false, prompt: request.prompt, error: 'GowooriChat run timed out' },
        'timeout',
        'timeout',
        'GowooriChat run timed out.',
      );
    }, runTimeoutMs);
    const entry: PendingMcpGowooriChatRunEntry = {
      requestId,
      prompt: request.prompt,
      status: 'queued',
      queuedAt,
      progress: [],
      resolve,
      timeout,
      targetWindow,
    };
    appendMcpGowooriChatRunProgress(
      entry,
      createMcpGowooriChatRunProgress(requestId, 'queued', 'queued', 'GowooriChat run queued.', {
        provider: request.provider,
        prompt: request.prompt,
      }),
    );
    entry.status = 'running';
    entry.startedAt = new Date().toISOString();
    pendingMcpGowooriChatRuns.set(requestId, entry);
  });
  void dispatchMcpGowooriChatRun(targetWindow, payload).catch((error) => {
    finalizeMcpGowooriChatRun(
      requestId,
      {
        requestId,
        ok: false,
        prompt: request.prompt,
        error: error instanceof Error ? error.message : String(error),
      },
      'failed',
      'error',
      error instanceof Error ? error.message : String(error),
    );
  });
  const snapshot = getMcpGowooriChatRunSnapshot(requestId) ?? {
    requestId,
    ok: false,
    status: 'running',
    prompt: request.prompt,
    queuedAt,
    startedAt: queuedAt,
    progress: [],
  };
  return { requestId, payload, promise, snapshot };
}

async function sendMcpGowooriChatRunToRenderer(
  request: Omit<McpBridgeGowooriChatRunPayload, 'requestId'>,
): Promise<McpBridgeGowooriChatRunResult> {
  return createMcpGowooriChatRunSession(request).promise;
}

function cancelMcpGowooriChatRun(requestId: string): McpBridgeGowooriChatCancelResult {
  const normalizedRequestId = sanitizeMcpDockActionText(requestId, 120);
  if (!normalizedRequestId) {
    return { requestId: '', ok: false, error: 'requestId is required' };
  }
  const pending = pendingMcpGowooriChatRuns.get(normalizedRequestId);
  if (!pending) {
    const snapshot = completedMcpGowooriChatRuns.get(normalizedRequestId);
    if (snapshot) {
      return {
        requestId: normalizedRequestId,
        ok: false,
        status: snapshot.status,
        error: `GowooriChat run is already ${snapshot.status}`,
      };
    }
    return { requestId: normalizedRequestId, ok: false, error: 'GowooriChat run not found' };
  }
  if (pending.targetWindow) {
    sendToRenderer(pending.targetWindow, 'mcp:gowoori-chat-run-cancel', { requestId: normalizedRequestId });
  }
  finalizeMcpGowooriChatRun(
    normalizedRequestId,
    { requestId: normalizedRequestId, ok: false, prompt: pending.prompt, error: 'GowooriChat run cancelled' },
    'cancelled',
    'cancelled',
    'GowooriChat run cancelled.',
  );
  return { requestId: normalizedRequestId, ok: true, status: 'cancelled', message: 'GowooriChat run cancelled' };
}

async function sendMcpDockActionToRenderer(
  action: McpBridgeDockActionPayload['action'],
  target: Pick<
    McpBridgeDockActionPayload,
    | 'contentId'
    | 'paneId'
    | 'targetPaneId'
    | 'mode'
    | 'clear'
    | 'useActive'
    | 'windowState'
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'widthPercent'
    | 'heightPercent'
  >,
): Promise<McpBridgeDockActionResult> {
  const actionAllowsMissingTarget =
    action === 'readArtifactTarget' ||
    action === 'setArtifactTarget' ||
    action === 'readSizes' ||
    action === 'setSizes' ||
    action === 'arrangeWindow' ||
    action === 'mergeWindow' ||
    action === 'mergeAll';
  const actionUsesActiveTarget = target.useActive === true;
  if (!actionAllowsMissingTarget && !actionUsesActiveTarget && !target.contentId && !target.paneId) {
    throw new Error('contentId or paneId is required');
  }
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow) {
    return { requestId: '', action, ok: false, ...target, error: 'Xenesis Desk renderer window is not available' };
  }

  showMcpTargetWindow(targetWindow);
  const requestId = crypto.randomUUID();
  const payload: McpBridgeDockActionPayload = { requestId, action, ...target };
  const resultPromise = new Promise<McpBridgeDockActionResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpDockActions.delete(requestId);
      resolve({ requestId, action, ok: false, ...target, error: 'Xenesis Desk dock action timed out' });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpDockActions.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:dock-action', payload);
  return resultPromise;
}

function sanitizeMcpBrowserAction(value: unknown): McpBridgeBrowserActionPayload['action'] {
  switch (value) {
    case 'navigate':
    case 'back':
    case 'forward':
    case 'reload':
    case 'stop':
    case 'state':
    case 'textSnapshot':
    case 'domSnapshot':
    case 'elementAction':
      return value;
    default:
      return 'state';
  }
}

function sanitizeMcpBrowserActionRequest(body: unknown): Omit<McpBridgeBrowserActionPayload, 'requestId'> {
  const raw = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const action = sanitizeMcpBrowserAction(raw.action);
  const request: Omit<McpBridgeBrowserActionPayload, 'requestId'> = { action };
  const contentId = sanitizeMcpDockActionText(raw.contentId, 200);
  const paneId = sanitizeMcpDockActionText(raw.paneId, 200);
  const url = sanitizeMcpDockActionText(raw.url, 2000);
  const elementAction = sanitizeMcpDockActionText(raw.elementAction, 40);
  const selector = sanitizeMcpDockActionText(raw.selector, 1000);
  const text = sanitizeMcpDockActionText(raw.text, 1000);
  const value = sanitizeMcpDockActionText(raw.value, 5000);
  const key = sanitizeMcpDockActionText(raw.key, 120);
  const maxChars = typeof raw.maxChars === 'number' && Number.isFinite(raw.maxChars) ? raw.maxChars : undefined;
  const maxLinks = typeof raw.maxLinks === 'number' && Number.isFinite(raw.maxLinks) ? raw.maxLinks : undefined;
  const maxNodes = typeof raw.maxNodes === 'number' && Number.isFinite(raw.maxNodes) ? raw.maxNodes : undefined;
  const maxTextChars = typeof raw.maxTextChars === 'number' && Number.isFinite(raw.maxTextChars) ? raw.maxTextChars : undefined;
  if (contentId) request.contentId = contentId;
  if (paneId) request.paneId = paneId;
  if (url) request.url = url;
  switch (elementAction) {
    case 'fill':
    case 'click':
    case 'select':
    case 'press':
      request.elementAction = elementAction;
      break;
    default:
      break;
  }
  if (selector) request.selector = selector;
  if (text) request.text = text;
  if (value) request.value = value;
  if (key) request.key = key;
  if (maxChars !== undefined) request.maxChars = maxChars;
  if (maxLinks !== undefined) request.maxLinks = maxLinks;
  if (maxNodes !== undefined) request.maxNodes = maxNodes;
  if (maxTextChars !== undefined) request.maxTextChars = maxTextChars;
  return request;
}

function sanitizeMcpBrowserActionResult(value: unknown): McpBridgeBrowserActionResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const requestId = sanitizeMcpDockActionText(raw.requestId, 120);
  if (!requestId) return null;
  return {
    requestId,
    action: sanitizeMcpBrowserAction(raw.action),
    ok: raw.ok === true,
    contentId: sanitizeMcpDockActionText(raw.contentId, 200) || undefined,
    paneId: sanitizeMcpDockActionText(raw.paneId, 200) || undefined,
    url: sanitizeMcpDockActionText(raw.url, 2000) || undefined,
    loading: typeof raw.loading === 'boolean' ? raw.loading : undefined,
    canGoBack: typeof raw.canGoBack === 'boolean' ? raw.canGoBack : undefined,
    canGoForward: typeof raw.canGoForward === 'boolean' ? raw.canGoForward : undefined,
    title: sanitizeMcpDockActionText(raw.title, 500) || undefined,
    text: typeof raw.text === 'string' ? raw.text : undefined,
    links: Array.isArray(raw.links) ? raw.links as Array<{ text?: string; href?: string }> : undefined,
    forms: Array.isArray(raw.forms) ? raw.forms : undefined,
    dom: raw.dom,
    elementAction: raw.elementAction,
    snapshot: raw.snapshot,
    error: sanitizeMcpDockActionText(raw.error, 500) || undefined,
  };
}

async function sendMcpBrowserActionToRenderer(
  request: Omit<McpBridgeBrowserActionPayload, 'requestId'>,
): Promise<McpBridgeBrowserActionResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return { requestId, action: request.action, ok: false, error: 'Xenesis Desk renderer window is not available' };
  }

  if (request.action === 'navigate' && !request.url) {
    return { requestId, action: request.action, ok: false, error: 'url is required for browser navigate' };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeBrowserActionPayload = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeBrowserActionResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpBrowserActions.delete(requestId);
      resolve({
        requestId,
        action: request.action,
        contentId: request.contentId,
        paneId: request.paneId,
        ok: false,
        error: 'Xenesis Desk browser action timed out',
      });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpBrowserActions.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:browser-action', payload);
  return resultPromise;
}

async function sendMcpExplorerActionToRenderer(
  request: Omit<McpBridgeExplorerActionPayload, 'requestId'>,
): Promise<McpBridgeExplorerActionResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return { requestId, action: request.action, ok: false, error: 'Xenesis Desk renderer window is not available' };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeExplorerActionPayload = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeExplorerActionResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpExplorerActions.delete(requestId);
      resolve({ requestId, action: request.action, ok: false, error: 'Xenesis Desk explorer action timed out' });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpExplorerActions.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:explorer-action', payload);
  return resultPromise;
}

async function sendMcpRemoteExplorerActionToRenderer(
  request: Omit<McpBridgeRemoteExplorerActionPayload, 'requestId'>,
): Promise<McpBridgeRemoteExplorerActionResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return { requestId, action: request.action, ok: false, error: 'Xenesis Desk renderer window is not available' };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeRemoteExplorerActionPayload = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeRemoteExplorerActionResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpRemoteExplorerActions.delete(requestId);
      resolve({ requestId, action: request.action, ok: false, error: 'Xenesis Desk remote explorer action timed out' });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpRemoteExplorerActions.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:remote-explorer-action', payload);
  return resultPromise;
}

async function sendMcpTerminalUiActionToRenderer(
  request: Omit<McpBridgeTerminalUiActionPayload, 'requestId'>,
): Promise<McpBridgeTerminalUiActionResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return { requestId, action: request.action, ok: false, error: 'Xenesis Desk renderer window is not available' };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeTerminalUiActionPayload = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeTerminalUiActionResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpTerminalUiActions.delete(requestId);
      resolve({
        requestId,
        action: request.action,
        termId: request.termId,
        ok: false,
        error: 'Xenesis Desk terminal UI action timed out',
      });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpTerminalUiActions.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:terminal-ui-action', payload);
  return resultPromise;
}

async function sendMcpOnboardingStepActionToRenderer(
  request: Omit<McpBridgeOnboardingStepActionPayload, 'requestId'>,
): Promise<McpBridgeOnboardingStepActionResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  const stepId = String(request.stepId || '').trim();
  if (!targetWindow) {
    return {
      requestId,
      action: request.action,
      stepId,
      ok: false,
      error: 'Xenesis Desk renderer window is not available',
    };
  }
  if (!stepId) {
    return { requestId, action: request.action, stepId, ok: false, error: 'stepId is required' };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeOnboardingStepActionPayload = { requestId, ...request, stepId };
  const resultPromise = new Promise<McpBridgeOnboardingStepActionResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpOnboardingStepActions.delete(requestId);
      resolve({
        requestId,
        action: request.action,
        stepId,
        ok: false,
        sampleWorkspacePath: request.sampleWorkspacePath,
        error: 'Xenesis Desk onboarding step action timed out',
      });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpOnboardingStepActions.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:onboarding-step-action', payload);
  return resultPromise;
}

async function sendMcpOnboardingScenarioRunToRenderer(
  request: Omit<McpBridgeOnboardingScenarioRunPayload, 'requestId'>,
): Promise<McpBridgeOnboardingScenarioRunResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return {
      requestId,
      trackId: 'basic-desk',
      ok: false,
      completed: false,
      sampleWorkspacePath: request.sampleWorkspacePath,
      steps: [],
      error: 'Xenesis Desk renderer window is not available',
    };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeOnboardingScenarioRunPayload = { requestId, ...request, trackId: 'basic-desk' };
  const resultPromise = new Promise<McpBridgeOnboardingScenarioRunResult>((resolve) => {
    const timeout = setTimeout(
      () => {
        pendingMcpOnboardingScenarioRuns.delete(requestId);
        resolve({
          requestId,
          trackId: 'basic-desk',
          ok: false,
          completed: false,
          sampleWorkspacePath: request.sampleWorkspacePath,
          steps: [],
          error: 'Xenesis Desk onboarding scenario run timed out',
        });
      },
      Math.max(MCP_DOCK_ACTION_TIMEOUT_MS, 45_000),
    );
    pendingMcpOnboardingScenarioRuns.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:onboarding-scenario-run', payload);
  return resultPromise;
}

async function sendMcpOnboardingRunPreviewToRenderer(
  request: Omit<McpBridgeOnboardingRunPreviewPayload, 'requestId'>,
): Promise<McpBridgeOnboardingRunPreviewResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return {
      requestId,
      ok: false,
      runId: request.runId,
      selected: false,
      error: 'Xenesis Desk renderer window is not available',
    };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeOnboardingRunPreviewPayload = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeOnboardingRunPreviewResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpOnboardingRunPreviews.delete(requestId);
      resolve({
        requestId,
        ok: false,
        runId: request.runId,
        selected: false,
        error: 'Xenesis Desk onboarding run preview timed out',
      });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpOnboardingRunPreviews.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:onboarding-run-preview', payload);
  return resultPromise;
}

async function sendMcpOnboardingDemoModeRunToRenderer(
  request: Omit<McpBridgeOnboardingDemoModeRunPayload, 'requestId'>,
): Promise<McpBridgeOnboardingDemoModeRunResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return {
      requestId,
      ok: false,
      completed: false,
      error: 'Xenesis Desk renderer window is not available',
    };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeOnboardingDemoModeRunPayload = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeOnboardingDemoModeRunResult>((resolve) => {
    const timeout = setTimeout(
      () => {
        pendingMcpOnboardingDemoModeRuns.delete(requestId);
        resolve({
          requestId,
          ok: false,
          completed: false,
          error: 'Xenesis Desk onboarding Demo Mode UI flow timed out',
        });
      },
      Math.max(MCP_DOCK_ACTION_TIMEOUT_MS, 75_000),
    );
    pendingMcpOnboardingDemoModeRuns.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:onboarding-demo-mode-run', payload);
  return resultPromise;
}

async function sendMcpDemoLabPlaybackControlToRenderer(
  request: Omit<McpBridgeDemoLabPlaybackControlPayload, 'requestId'>,
): Promise<McpBridgeDemoLabPlaybackControlResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  const action = request.action || 'status';
  if (!targetWindow) {
    return {
      requestId,
      action,
      ok: false,
      contentId: request.contentId,
      error: 'Xenesis Desk renderer window is not available',
    };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeDemoLabPlaybackControlPayload = { requestId, ...request, action };
  const resultPromise = new Promise<McpBridgeDemoLabPlaybackControlResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpDemoLabPlaybackControls.delete(requestId);
      resolve({
        requestId,
        action,
        ok: false,
        contentId: request.contentId,
        error: 'Xenesis Desk Demo Lab playback control timed out',
      });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpDemoLabPlaybackControls.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:demo-lab-playback-control', payload);
  return resultPromise;
}

async function sendMcpFavoritesActionToRenderer(
  request: Omit<McpBridgeFavoritesActionPayload, 'requestId'>,
): Promise<McpBridgeFavoritesActionResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return { requestId, action: request.action, ok: false, error: 'Xenesis Desk renderer window is not available' };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeFavoritesActionPayload = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeFavoritesActionResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpFavoritesActions.delete(requestId);
      resolve({
        requestId,
        action: request.action,
        id: request.id,
        path: request.path,
        tab: request.tab,
        ok: false,
        error: 'Xenesis Desk favorites action timed out',
      });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpFavoritesActions.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:favorites-action', payload);
  return resultPromise;
}

async function sendMcpCaptureActivePaneToRenderer(
  request: Omit<McpBridgeCaptureActivePanePayload, 'requestId'>,
): Promise<McpBridgeCaptureActivePaneResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return { requestId, ok: false, error: 'Xenesis Desk renderer window is not available' };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeCaptureActivePanePayload = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeCaptureActivePaneResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpCaptureActivePaneRequests.delete(requestId);
      resolve({ requestId, ok: false, error: 'Active pane capture request timed out' });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpCaptureActivePaneRequests.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:capture-active-pane', payload);
  return resultPromise;
}

async function sendMcpGowooriArtifactVisibilityToRenderer(
  request: Omit<McpBridgeGowooriArtifactVisibilityPayload, 'requestId'>,
): Promise<McpBridgeGowooriArtifactVisibilityResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return { requestId, ok: false, components: [], error: 'Xenesis Desk renderer window is not available' };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeGowooriArtifactVisibilityPayload = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeGowooriArtifactVisibilityResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpGowooriArtifactVisibilityRequests.delete(requestId);
      resolve({ requestId, ok: false, components: [], error: 'Gowoori artifact visibility request timed out' });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpGowooriArtifactVisibilityRequests.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:gowoori-artifact-visibility', payload);
  return resultPromise;
}

async function sendMcpGowooriOverlayToRenderer(
  channel: 'mcp:gowoori-overlay-show' | 'mcp:gowoori-overlay-hide' | 'mcp:gowoori-overlay-status',
  request: Omit<McpBridgeGowooriOverlayPayload, 'requestId'>,
): Promise<McpBridgeGowooriOverlayResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return {
      requestId,
      ok: false,
      visible: false,
      error: 'Xenesis Desk renderer window is not available',
    };
  }

  showMcpTargetWindow(targetWindow);
  const payload: McpBridgeGowooriOverlayPayload = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeGowooriOverlayResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpGowooriOverlayRequests.delete(requestId);
      resolve({
        requestId,
        ok: false,
        visible: false,
        error: 'Gowoori overlay request timed out',
      });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpGowooriOverlayRequests.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, channel, payload);
  return resultPromise;
}

function sanitizeMcpRendererPerformanceTraceRequest(
  value: unknown,
): Omit<McpBridgeRendererPerformanceTraceRequest, 'requestId'> {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    ...(typeof raw.enabled === 'boolean' ? { enabled: raw.enabled } : {}),
    ...(typeof raw.setting === 'string' ? { setting: sanitizeMcpRendererText(raw.setting, 200).trim() } : {}),
    ...(raw.clear === true ? { clear: true } : {}),
  };
}

async function sendMcpRendererPerformanceTraceToRenderer(
  request: Omit<McpBridgeRendererPerformanceTraceRequest, 'requestId'>,
): Promise<McpBridgeRendererPerformanceTraceResult> {
  const targetWindow = getMcpTargetWindow();
  const requestId = crypto.randomUUID();
  if (!targetWindow) {
    return {
      requestId,
      ok: false,
      enabled: false,
      setting: '',
      itemCount: 0,
      recent: [],
      summary: [],
      error: 'Xenesis Desk renderer window is not available',
    };
  }

  const payload: McpBridgeRendererPerformanceTraceRequest = { requestId, ...request };
  const resultPromise = new Promise<McpBridgeRendererPerformanceTraceResult>((resolve) => {
    const timeout = setTimeout(() => {
      pendingMcpRendererPerformanceTraces.delete(requestId);
      resolve({
        requestId,
        ok: false,
        enabled: false,
        setting: '',
        itemCount: 0,
        recent: [],
        summary: [],
        error: 'Renderer performance trace request timed out',
      });
    }, MCP_DOCK_ACTION_TIMEOUT_MS);
    pendingMcpRendererPerformanceTraces.set(requestId, { resolve, timeout });
  });
  sendToRenderer(targetWindow, 'mcp:renderer-performance-trace', payload);
  return resultPromise;
}

function normalizeMcpRenderOptions(value: unknown): RenderOptions | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const body = value as { streaming?: unknown; openAs?: unknown };
  const renderOptions: RenderOptions = {};

  if (body.openAs === 'demoLabPlayback') {
    renderOptions.openAs = 'demoLabPlayback';
  }

  const streaming = body.streaming;
  if (!streaming || typeof streaming !== 'object' || Array.isArray(streaming)) {
    return renderOptions.openAs ? renderOptions : undefined;
  }
  if ((streaming as { enabled?: unknown }).enabled !== true) {
    return renderOptions.openAs ? renderOptions : undefined;
  }

  const numberOrUndefined = (raw: unknown): number | undefined => {
    const number = Number(raw);
    return Number.isFinite(number) ? number : undefined;
  };

  renderOptions.streaming = {
    enabled: true,
    intervalMs: numberOrUndefined((streaming as { intervalMs?: unknown }).intervalMs),
    chunkSize: numberOrUndefined((streaming as { chunkSize?: unknown }).chunkSize),
    initialDelayMs: numberOrUndefined((streaming as { initialDelayMs?: unknown }).initialDelayMs),
  };
  return renderOptions;
}

function applyMcpPanelPlacementOverride(
  actions: ExtensionHostAction[],
  panelPlacement: ExtensionPanelPlacement | undefined,
  targetPaneId?: string,
): ExtensionHostAction[] {
  if (!panelPlacement && !targetPaneId) return actions;
  return actions.map((action) =>
    action.type === 'openPanel' || action.type === 'openTool'
      ? {
          ...action,
          ...(panelPlacement ? { placement: panelPlacement } : {}),
          ...(targetPaneId ? { targetPaneId } : {}),
        }
      : action,
  );
}

async function runMcpExtensionCommand(
  commandId: string,
  panelPlacement?: ExtensionPanelPlacement,
  targetPaneId?: string,
): Promise<ExtensionRunResult & { actionsDispatched: boolean }> {
  const result = await getExtensionHost().runCommand(commandId);
  const actions = applyMcpPanelPlacementOverride(result.actions ?? [], panelPlacement, targetPaneId);
  const actionsDispatched = actions.length === 0 || sendMcpExtensionActionsToRenderer(commandId, actions);
  return {
    ...result,
    actions,
    actionsDispatched,
  };
}

function runMcpRendererCommand(commandId: string): ExtensionRunResult & { actionsDispatched: boolean } {
  const actions: ExtensionHostAction[] = [];
  const actionsDispatched = sendMcpExtensionActionsToRenderer(commandId, []);
  if (!actionsDispatched) {
    return {
      ok: false,
      commandId,
      actions,
      actionsDispatched,
      error: 'No target renderer window available.',
    };
  }
  return {
    ok: true,
    commandId,
    actions,
    actionsDispatched,
    message: `Renderer command dispatched: ${commandId}`,
  };
}

const MCP_TERMINAL_COMMAND_MAX_CHARS = 20_000;

interface McpTerminalPreview {
  shell: ShellKind;
  command: string;
  cwd: string;
  title: string;
  metadata?: McpBridgeTerminalMetadata;
}

interface McpTerminalRunResult extends TerminalSpawnResult {
  title: string;
  mcpCommand: string;
  metadata?: McpBridgeTerminalMetadata;
}

function normalizeMcpTerminalCommand(value: unknown): string {
  const command = typeof value === 'string' ? value.trim() : '';
  if (!command) throw new Error('command is required');
  if (command.length > MCP_TERMINAL_COMMAND_MAX_CHARS) {
    throw new Error(`command must be ${MCP_TERMINAL_COMMAND_MAX_CHARS} characters or fewer`);
  }
  return command;
}

function normalizeMcpTerminalShell(value: unknown): ShellKind {
  const fallback = normalizeShellKindForPlatform(loadSettings().defaultShell);
  const shell = typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : fallback;
  if (!shellKinds.has(shell as ShellKind) || !isShellKindSupportedForPlatform(shell as ShellKind)) {
    throw new Error(`shell must be one of: ${allowedShellKindsForCurrentPlatform().join(', ')}`);
  }
  return shell as ShellKind;
}

function normalizeMcpTerminalCwd(value: unknown): string {
  const configuredDefault = loadSettings().defaultCwd || undefined;
  const raw = typeof value === 'string' && value.trim() ? value.trim() : configuredDefault;
  const cwd = raw ? path.resolve(raw) : getDefaultCwd();
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    throw new Error(`cwd must be an existing directory: ${cwd}`);
  }
  return cwd;
}

function buildMcpTerminalTitle(shell: ShellKind, command: string): string {
  const firstLine =
    command
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? shell;
  const compact = firstLine.length > 56 ? `${firstLine.slice(0, 53)}...` : firstLine;
  return `MCP: ${compact}`;
}

function normalizeMcpTerminalTitle(value: unknown, fallback: string): string {
  const title = typeof value === 'string' && value.trim() ? value.trim().replace(/\s+/g, ' ') : fallback;
  return title.length > 96 ? `${title.slice(0, 93)}...` : title;
}

function normalizeMcpTerminalMetadata(value: unknown): McpBridgeTerminalMetadata | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  const metadata: McpBridgeTerminalMetadata = {};
  for (const key of ['kind', 'subagentId', 'parentTermId', 'agent', 'task', 'command'] as const) {
    const raw = input[key];
    if (typeof raw === 'string' && raw.trim())
      metadata[key] = raw.trim().slice(0, key === 'task' || key === 'command' ? 2000 : 200);
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

interface McpTerminalRunAndWaitResult {
  ok: boolean;
  command: string;
  cwd: string;
  shell: ShellKind;
  pid?: number;
  exitCode: number | null;
  signal?: string | null;
  timedOut: boolean;
  durationMs: number;
  output: string;
  stdout: string;
  stderr: string;
  error?: string;
}

function resolveOneShotShellSpawn(shellKind: ShellKind, command: string): { command: string; args: string[] } {
  const resolved = resolveShell(shellKind);
  if (process.platform === 'win32') {
    if (shellKind === 'cmd') return { command: resolved.command, args: ['/d', '/s', '/c', command] };
    if (shellKind === 'wsl') return { command: resolved.command, args: ['sh', '-lc', command] };
    return { command: resolved.command, args: ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command] };
  }
  if (shellKind === 'pwsh') return { command: resolved.command, args: ['-NoLogo', '-NoProfile', '-Command', command] };
  const shellCommand = resolved.command || (shellKind === 'sh' ? '/bin/sh' : '/bin/bash');
  return { command: shellCommand, args: ['-lc', command] };
}

function normalizeMcpTerminalRunAndWaitTimeout(value: unknown): number {
  const requested = Number(value);
  return Number.isFinite(requested)
    ? clamp(Math.trunc(requested), 1000, 30 * 60 * 1000, 120_000)
    : 120_000;
}

function normalizeMcpTerminalRunAndWaitMaxBytes(value: unknown): number {
  const requested = Number(value);
  return Number.isFinite(requested)
    ? clamp(Math.trunc(requested), 1024, SCROLLBACK_MAX_BYTES, 64 * 1024)
    : 64 * 1024;
}

function trimCapturedOutput(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) return value;
  let trimmed = value.slice(-maxBytes);
  while (Buffer.byteLength(trimmed, 'utf8') > maxBytes && trimmed.length > 0) {
    trimmed = trimmed.slice(1);
  }
  return trimmed;
}

// One-shot terminal: run a command, wait for exit, return captured output + exit
// code. Ported from the backup (restores xd.terminals.runAndWait, which the
// public-release target was missing so the model-facing desk_terminal_run_and_wait
// tool threw/hung). Lets the agent run a command and read its real output back.
async function runMcpTerminalCommandAndWait(args: unknown): Promise<McpTerminalRunAndWaitResult> {
  const body = normalizeMcpCapabilityArgs(args);
  const preview = previewMcpTerminalCommand(body);
  const timeoutMs = normalizeMcpTerminalRunAndWaitTimeout(body.timeoutMs);
  const maxBytes = normalizeMcpTerminalRunAndWaitMaxBytes(body.maxBytes);
  const spawnTarget = resolveOneShotShellSpawn(preview.shell, preview.command);
  const startedAt = Date.now();

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    let child: ChildProcess;

    const finish = (result: Omit<McpTerminalRunAndWaitResult, 'ok' | 'command' | 'cwd' | 'shell' | 'durationMs' | 'output' | 'stdout' | 'stderr' | 'timedOut'>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stdout = trimCapturedOutput(stdout, maxBytes);
      stderr = trimCapturedOutput(stderr, maxBytes);
      const output = trimCapturedOutput(`${stdout}${stderr}`, maxBytes);
      resolve({
        ok: !result.error && !timedOut,
        command: preview.command,
        cwd: preview.cwd,
        shell: preview.shell,
        durationMs: Date.now() - startedAt,
        output,
        stdout,
        stderr,
        ...result,
        timedOut,
      });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try { child?.kill(); } catch { /* process already exited */ }
      finish({ exitCode: null, signal: 'timeout', error: `Command timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    try {
      child = spawn(spawnTarget.command, spawnTarget.args, {
        cwd: preview.cwd,
        windowsHide: true,
      });
    } catch (error) {
      finish({ exitCode: null, signal: null, error: error instanceof Error ? error.message : String(error) });
      return;
    }

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => {
      stdout = trimCapturedOutput(`${stdout}${String(chunk)}`, maxBytes);
    });
    child.stderr?.on('data', (chunk) => {
      stderr = trimCapturedOutput(`${stderr}${String(chunk)}`, maxBytes);
    });
    child.once('error', (error) => {
      finish({ pid: child.pid, exitCode: null, signal: null, error: error.message });
    });
    child.once('close', (exitCode, signal) => {
      finish({ pid: child.pid, exitCode, signal: signal ?? null });
    });
  });
}

function previewMcpTerminalCommand(body: unknown): McpTerminalPreview {
  const request = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const command = normalizeMcpTerminalCommand(request.command);
  const shell = normalizeMcpTerminalShell(request.shell);
  const cwd = normalizeMcpTerminalCwd(request.cwd);
  const fallbackTitle = buildMcpTerminalTitle(shell, command);
  return {
    shell,
    command,
    cwd,
    title: normalizeMcpTerminalTitle(request.title, fallbackTitle),
    metadata: normalizeMcpTerminalMetadata(request.metadata),
  };
}

function createMcpTerminalSession(body: unknown): McpTerminalRunResult {
  const preview = previewMcpTerminalCommand(body);
  const request = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const placement = sanitizeMcpExtensionPanelPlacement(request.placement);
  const targetPaneId =
    typeof request.targetPaneId === 'string' && request.targetPaneId.trim()
      ? request.targetPaneId.trim().slice(0, 200)
      : undefined;
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow) throw new Error('Xenesis Desk renderer window is not available');

  const id =
    typeof request.id === 'string' && request.id.trim() ? request.id.trim() : `mcp-terminal-${crypto.randomUUID()}`;
  if (id.length > 100) throw new Error('terminal id must be 100 characters or fewer');
  if (sessions.has(id)) throw new Error(`Terminal session already exists: ${id}`);

  const cols = clamp(request.cols, 20, 400, 120);
  const rows = clamp(request.rows, 5, 200, 30);
  let record!: SessionRecord;

  const onData = (data: string) => {
    record.scrollbackChunks.push(data);
    record.scrollbackBytes += data.length;
    while (record.scrollbackBytes > SCROLLBACK_MAX_BYTES && record.scrollbackChunks.length > 1) {
      const removed = record.scrollbackChunks.shift()!;
      record.scrollbackBytes -= removed.length;
    }

    if (record.ownerWindowId === null) return;
    const ownerWin = getWindowById(record.ownerWindowId);
    const payload: TerminalDataEvent = { id, data };
    sendToRenderer(ownerWin, `terminal:data:${id}`, payload);
    recordTerminalOutputObservation(ownerWin, id, data);
    automationControllers
      .get(id)
      ?.onOutput(data)
      .catch(() => undefined);
  };

  const onExit = (exitCode: number, signal?: number) => {
    const sessionRecord = sessions.get(id);
    sessions.delete(id);
    automationControllers.delete(id);
    const payload: TerminalExitEvent = { id, exitCode, signal };
    const exitOwnerWinId = sessionRecord?.ownerWindowId ?? null;
    const exitOwnerWin = exitOwnerWinId !== null ? getWindowById(exitOwnerWinId) : targetWindow;
    sendToRenderer(exitOwnerWin, `terminal:exit:${id}`, payload);
    recordTerminalExitObservation(exitOwnerWin, id, exitCode, signal);
  };

  const started = createShellBackend({ shell: preview.shell, cwd: preview.cwd }, cols, rows, { onData, onExit });

  record = {
    id,
    kind: started.kind,
    shell: started.shell,
    profileId: started.profileId,
    command: started.command,
    cwd: started.cwd,
    backend: started.backend,
    ownerWindowId: targetWindow.id,
    scrollbackChunks: [],
    scrollbackBytes: 0,
    mcpCommand: preview.command,
    mcpTitle: preview.title,
    mcpMetadata: preview.metadata,
    lastCommand: preview.command,
  };
  sessions.set(id, record);
  emitMainInstantOperation(
    getMainObservabilityWindow(targetWindow),
    {
      activity: {
        source: 'terminal',
        label: 'terminal.spawn',
        detail: summarizeMainObservabilityPayload({ id, command: record.command, cwd: record.cwd, source: 'mcp' }, 600),
      },
    },
    {
      responseBody: { id, command: record.command, cwd: record.cwd, source: 'mcp' },
    },
  );

  const automationRuntime = getAutomationRuntimeConfig();
  const automationCtrl = new AutomationController({
    termId: id,
    stage: automationRuntime.stage,
    write: (data) => {
      trackTerminalInput(record, data);
      try {
        record.backend.write(data);
      } catch {
        /* 종료 후 무시 */
      }
    },
    notifyStatus: (status) => {
      const ownerWin = record.ownerWindowId !== null ? getWindowById(record.ownerWindowId) : null;
      sendToRenderer(ownerWin, `automation:status:${id}`, status);
    },
    notifyEvent: (event) => {
      const ownerWin = record.ownerWindowId !== null ? getWindowById(record.ownerWindowId) : null;
      sendToRenderer(ownerWin, `automation:event:${id}`, event);
    },
    observeEvent: (event) => {
      const ownerWin = record.ownerWindowId !== null ? getWindowById(record.ownerWindowId) : null;
      recordAutomationEventObservation(ownerWin, event);
    },
    settings: automationRuntime.settings,
    fallbackApiKey: automationRuntime.fallbackApiKey,
    eventLog: automationEventLogSink,
    getStreamContext: () => ({
      lastCommand: record.lastCommand ?? record.mcpCommand,
      recentOutput: record.scrollbackChunks.slice(-8).join(''),
    }),
  });
  automationControllers.set(id, automationCtrl);

  const payload: McpBridgeOpenTerminalPayload = {
    id,
    title: preview.title,
    shell: preview.shell,
    command: preview.command,
    cwd: started.cwd,
    pid: started.backend.pid,
    metadata: preview.metadata,
    placement,
    targetPaneId,
  };
  if (!emitMcpOpenTerminal(payload)) {
    try {
      started.backend.kill();
    } catch {
      /* best effort cleanup */
    }
    sessions.delete(id);
    automationControllers.delete(id);
    throw new Error('Xenesis Desk renderer window is not available');
  }

  const startupInput = formatShellStartupInput(preview.shell, preview.command);
  if (startupInput) {
    setTimeout(() => {
      try {
        record.backend.write(startupInput);
      } catch {
        /* terminal exited before write */
      }
    }, 350);
  }

  return {
    id,
    kind: started.kind,
    pid: started.backend.pid,
    shell: started.shell,
    command: started.command,
    cwd: started.cwd,
    profileId: started.profileId,
    title: preview.title,
    mcpCommand: preview.command,
    metadata: preview.metadata,
  };
}

function getTerminalTail(id: string, maxBytes?: unknown): string | null {
  const session = sessions.get(id);
  if (!session) return null;
  const limit = clamp(maxBytes, 1, SCROLLBACK_MAX_BYTES, 16 * 1024);
  const scrollback = session.scrollbackChunks.join('');
  return scrollback.length > limit ? scrollback.slice(-limit) : scrollback;
}

function stopMcpTerminalSession(id: string): boolean {
  const session = sessions.get(id);
  if (!session) return false;
  try {
    session.backend.kill();
  } catch {
    // Already killed.
  } finally {
    sessions.delete(session.id);
    automationControllers.delete(session.id);
  }
  return true;
}

function listMcpTerminalSessions(): Array<Record<string, unknown>> {
  return buildMcpTerminalSessionList(sessions.values(), latestMcpRendererState);
}

function normalizeMcpCapabilityArgs(args: unknown): Record<string, unknown> {
  return args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
}

function normalizeAuditQueryArgs(args: unknown): {
  since?: string;
  source?: string;
  permission?: string;
  limit?: number;
} {
  const body = normalizeMcpCapabilityArgs(args);
  const limit = Number(body.limit);
  return {
    since: typeof body.since === 'string' && body.since.trim() ? body.since.trim() : undefined,
    source: typeof body.source === 'string' && body.source.trim() ? body.source.trim() : undefined,
    permission: typeof body.permission === 'string' && body.permission.trim() ? body.permission.trim() : undefined,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(5000, Math.trunc(limit)) : 200,
  };
}

const agentControlLockManager = createAgentControlLockManager();

function getMetaBridgeApiUrl(settings = loadSettings()): string {
  const configured = String(settings.apiUrl || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  return app.isPackaged ? 'https://ai.xamong.com' : `http://localhost:${settings.serverPort}`;
}

const metaBridge = createMetaBridge({ apiUrl: getMetaBridgeApiUrl() });

async function dispatchMetaBridgeCapability(path: string, args: unknown): Promise<unknown> {
  metaBridge.setApiUrl(getMetaBridgeApiUrl());
  const result = await metaBridge.dispatch(path, normalizeMcpCapabilityArgs(args));
  if (!result.ok) return result;
  return result.result;
}

const CR_SMOKE_FILE_NAMES = {
  plan: 'cr-full-plan.json',
  dryRun: 'cr-full-dry-run.json',
  handoff: 'cr-external-llm-handoff.json',
  liveResult: 'cr-full-result.json',
  acceptance: 'cr-acceptance-result.json',
} as const;

type CrSmokeFileKey = keyof typeof CR_SMOKE_FILE_NAMES;

function resolveDevXenisHomeForCrSmoke(): string {
  const explicitDevHome = String(process.env.XENIS_DEV_HOME || '').trim();
  if (explicitDevHome) return path.resolve(explicitDevHome);

  const configuredHome = String(process.env.XENIS_HOME || '').trim();
  if (configuredHome && configuredHome.toLowerCase().includes('.xenis-dev')) {
    return path.resolve(configuredHome);
  }

  const userHome = String(process.env.USERPROFILE || process.env.HOME || '').trim();
  return path.resolve(userHome || app.getPath('home'), '.xenis-dev');
}

function summarizeCrSmokePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const record = payload as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  for (const key of ['ok', 'mode', 'valid', 'readyForExternalLlm', 'testedAt', 'generatedAt', 'timestamp', 'error']) {
    if (key in record) summary[key] = record[key];
  }
  if (record.summary && typeof record.summary === 'object' && !Array.isArray(record.summary)) {
    summary.summary = record.summary;
  }
  if (record.coverage && typeof record.coverage === 'object' && !Array.isArray(record.coverage)) {
    summary.coverage = record.coverage;
  }
  if (Array.isArray(record.checks)) summary.checkCount = record.checks.length;
  if (Array.isArray(record.calls)) summary.callCount = record.calls.length;
  if (Array.isArray(record.results)) summary.resultCount = record.results.length;
  return summary;
}

function readCrSmokeJsonFile(smokeDir: string, key: CrSmokeFileKey, includePayload: boolean): Record<string, unknown> {
  const fileName = CR_SMOKE_FILE_NAMES[key];
  const filePath = path.join(smokeDir, fileName);
  const base = { key, fileName, path: filePath };
  if (!fs.existsSync(filePath)) {
    return { ...base, exists: false };
  }

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return { ...base, exists: true, ok: false, error: 'Path exists but is not a file.' };
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      return {
        ...base,
        exists: true,
        ok: false,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
        mtimeIso: stat.mtime.toISOString(),
        parseError: error instanceof Error ? error.message : String(error),
      };
    }

    return {
      ...base,
      exists: true,
      ok: true,
      sizeBytes: stat.size,
      mtimeMs: stat.mtimeMs,
      mtimeIso: stat.mtime.toISOString(),
      summary: summarizeCrSmokePayload(payload),
      ...(includePayload ? { payload } : {}),
    };
  } catch (error) {
    return {
      ...base,
      exists: false,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function readCrSmokeLatestSnapshot(args: unknown): Record<string, unknown> {
  const body = normalizeMcpCapabilityArgs(args);
  const includePayload = body.includePayload === true;
  const smokeDirOverride = readCapabilityString(body, ['smokeDir', 'dirPath', 'path']);
  const smokeDir =
    smokeDirOverride && path.isAbsolute(smokeDirOverride)
      ? path.resolve(smokeDirOverride)
      : path.join(resolveDevXenisHomeForCrSmoke(), 'mcp', 'cr-smoke');

  const files = {} as Record<CrSmokeFileKey, Record<string, unknown>>;
  for (const [key] of Object.entries(CR_SMOKE_FILE_NAMES) as Array<[CrSmokeFileKey, string]>) {
    files[key] = readCrSmokeJsonFile(smokeDir, key, includePayload);
  }

  const existingFiles = (Object.entries(files) as Array<[CrSmokeFileKey, Record<string, unknown>]>)
    .filter(([, file]) => file.exists === true && typeof file.mtimeMs === 'number')
    .sort((a, b) => Number(b[1].mtimeMs) - Number(a[1].mtimeMs));
  const latest = existingFiles.length
    ? {
        key: existingFiles[0][0],
        path: existingFiles[0][1].path,
        mtimeIso: existingFiles[0][1].mtimeIso,
      }
    : null;
  const handoffSummary =
    files.handoff.summary && typeof files.handoff.summary === 'object'
      ? (files.handoff.summary as Record<string, unknown>)
      : {};
  const readyForExternalLlm = Boolean(
    handoffSummary.readyForExternalLlm ??
      handoffSummary.ok ??
      (files.plan.exists === true && files.dryRun.exists === true && files.handoff.exists === true),
  );

  return {
    ok: true,
    smokeDir,
    includePayload,
    readyForExternalLlm,
    latest,
    files,
    commands: {
      handoff: 'npm run --silent smoke:cr:external-llm-handoff -- --json',
      live: 'npm run --silent smoke:cr:external-llm-handoff -- --run-live --json',
    },
  };
}

function normalizeMcpBrowserUrl(value: unknown): string {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : 'https://www.google.com';
  try {
    return new URL(raw).toString();
  } catch {
    throw new Error(`url must be an absolute URL: ${raw}`);
  }
}

function openMcpBrowserCapability(args: unknown): Record<string, unknown> {
  const body = normalizeMcpCapabilityArgs(args);
  const url = normalizeMcpBrowserUrl(body.url);
  const placement = normalizeMcpPanelPlacement(body.placement);
  const targetPaneId = normalizeMcpTargetPaneId(body.targetPaneId);
  if (!emitMcpOpenBrowser({ url, placement, targetPaneId })) {
    return { ok: false, error: 'Xenesis Desk renderer window is not available' };
  }

  recordDiagnosticLog({
    level: 'info',
    source: 'main',
    scope: 'mcp',
    message: 'MCP opened browser through capability',
    detail: JSON.stringify({ url, placement, targetPaneId }),
  });
  return { ok: true, url, placement, targetPaneId };
}

function normalizeMcpBuiltinPaneKind(value: unknown): McpBridgeOpenBuiltinPaneKind {
  const kind = typeof value === 'string' ? value.trim() : '';
  if (kind === 'settings' || kind === 'diagnostics' || kind === 'onboarding') {
    return kind;
  }
  throw new Error(`Unsupported built-in pane kind: ${kind || '(missing)'}`);
}

function normalizeMcpSettingsCategory(value: unknown): string | undefined {
  const category = typeof value === 'string' ? value.trim() : '';
  return category || undefined;
}

function normalizeMcpSettingsTargetText(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

async function openMcpBuiltinPaneCapability(args: unknown): Promise<Record<string, unknown>> {
  const body = normalizeMcpCapabilityArgs(args);
  const kind = normalizeMcpBuiltinPaneKind(body.kind);
  const placement = normalizeMcpPanelPlacement(body.placement ?? body.panelPlacement);
  const targetPaneId = normalizeMcpTargetPaneId(body.targetPaneId);
  const category = kind === 'settings' ? normalizeMcpSettingsCategory(body.category) : undefined;
  const mode = kind === 'settings' ? normalizeMcpSettingsTargetText(body.mode) : undefined;
  const section = kind === 'settings' ? normalizeMcpSettingsTargetText(body.section) : undefined;
  const ensureVisible = kind === 'settings' && typeof body.ensureVisible === 'boolean' ? body.ensureVisible : undefined;
  const result = await sendMcpOpenBuiltinPaneToRenderer({
    kind,
    placement,
    targetPaneId,
    category,
    mode,
    section,
    ensureVisible,
  });
  if (!result.ok) return { ...result };

  recordDiagnosticLog({
    level: 'info',
    source: 'main',
    scope: 'mcp',
    message: 'MCP opened built-in pane through capability',
    detail: JSON.stringify({ kind, placement, targetPaneId, category, mode, section, ensureVisible }),
  });
  return { ok: true, kind, placement, targetPaneId, category, mode, section, ensureVisible, renderer: result };
}

function openMcpFileCapability(args: unknown): Record<string, unknown> {
  const body = normalizeMcpCapabilityArgs(args);
  const rawFilePath = typeof body.filePath === 'string' ? body.filePath.trim() : '';
  const filePath = normalizeBridgePathForPlatform(rawFilePath, { platform: process.platform });

  if (!filePath || !path.isAbsolute(filePath)) {
    return { ok: false, error: 'filePath must be an absolute path' };
  }
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `File not found: ${filePath}` };
  }

  const placement = normalizeMcpPanelPlacement(body.placement);
  const targetPaneId = normalizeMcpTargetPaneId(body.targetPaneId);
  const renderOptions = normalizeMcpRenderOptions(body.renderOptions);
  if (!sendMcpOpenFileToRenderer(filePath, placement, targetPaneId, renderOptions)) {
    return { ok: false, error: 'Xenesis Desk renderer window is not available' };
  }

  recordDiagnosticLog({
    level: 'info',
    source: 'main',
    scope: 'mcp',
    message: `MCP opened file through capability: ${path.basename(filePath)}`,
    detail: filePath,
  });
  return { ok: true, filePath, placement, targetPaneId, renderOptions };
}

function readCapabilityString(body: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function readCapabilityRawString(body: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return fallback;
}

function readCapabilityProfile(body: Record<string, unknown>): RemoteFileProfile {
  const profile =
    body.profile && typeof body.profile === 'object' && !Array.isArray(body.profile) ? body.profile : body;
  return profile as RemoteFileProfile;
}

async function saveWorkspaceProfileFromCapability(args: unknown): Promise<Record<string, unknown>> {
  const body = normalizeMcpCapabilityArgs(args);
  const rawProfile = body.profile && typeof body.profile === 'object' ? body.profile : body;
  const suggestedName = readCapabilityString(body, ['suggestedName', 'name'], 'Workspace');
  const profile = normalizeWorkspaceProfile(rawProfile, suggestedName);
  const safeName = `${(suggestedName || profile.name || 'Workspace').replace(/[\\/:*?"<>|]/g, '_')}.xcon-desk-workspace.json`;
  const workspaceDir = getDefaultWorkspaceProfilesDir();
  await fs.promises.mkdir(workspaceDir, { recursive: true });
  const result = await dialog.showSaveDialog({
    title: 'Xcon Desk Workspace 저장',
    defaultPath: path.join(workspaceDir, safeName),
    filters: [
      { name: 'Xcon Desk Workspace', extensions: ['xcon-desk-workspace.json', 'json'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, saved: false, recent: loadSettings().workspace.recent };
  }

  const savedProfile: WorkspaceProfile = {
    ...profile,
    name: workspaceNameFromPath(result.filePath),
    savedAt: new Date().toISOString(),
  };
  await fs.promises.writeFile(result.filePath, JSON.stringify(savedProfile, null, 2), 'utf8');
  const recent = rememberWorkspace(result.filePath, savedProfile);
  return { ok: true, saved: true, path: result.filePath, profile: savedProfile, recent };
}

async function openWorkspaceFromDialogForCapability(): Promise<Record<string, unknown>> {
  const workspaceDir = getDefaultWorkspaceProfilesDir();
  await fs.promises.mkdir(workspaceDir, { recursive: true });
  const result = await dialog.showOpenDialog({
    title: 'Xcon Desk Workspace 열기',
    defaultPath: workspaceDir,
    properties: ['openFile'],
    filters: [
      { name: 'Xcon Desk Workspace', extensions: ['xcon-desk-workspace.json', 'json'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, canceled: true };
  }

  const workspace = await readWorkspaceProfile(result.filePaths[0]);
  return { ok: true, ...workspace };
}

function clearRecentWorkspacesForCapability(): Record<string, unknown> {
  const current = loadSettings().workspace;
  persistSettings({ workspace: { ...current, recent: [] } });
  return { ok: true, recent: [] };
}

async function openLocalFileDialogForCapability(): Promise<Record<string, unknown>> {
  const result = await dialog.showOpenDialog({
    title: '파일 열기',
    properties: ['openFile'],
    filters: [
      {
        name: 'All Supported',
        extensions: [
          'md',
          'markdown',
          'mmd',
          'js',
          'ts',
          'jsx',
          'tsx',
          'py',
          'html',
          'htm',
          'css',
          'json',
          'xcon',
          'xconj',
          'xcon-workflow',
          'xml',
          'yaml',
          'yml',
          'sh',
          'bat',
          'txt',
          'log',
          'rs',
          'go',
          'java',
          'cpp',
          'c',
          'cs',
          'rb',
          'php',
          'swift',
          'kt',
          'png',
          'jpg',
          'jpeg',
          'gif',
          'webp',
          'svg',
          'bmp',
          'ico',
          'pdf',
          'doc',
          'docx',
          'hwp',
          'hwpx',
          'xls',
          'xlsx',
          'xlsm',
          'xlsb',
          'ppt',
          'pptx',
        ],
      },
      { name: 'All files', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true };
  return { ok: true, file: await readFileToResult(result.filePaths[0]) };
}

async function saveLocalTextFileAsForCapability(args: unknown): Promise<Record<string, unknown>> {
  const body = normalizeMcpCapabilityArgs(args);
  const safeName = readCapabilityString(body, ['defaultName', 'fileName'], 'untitled.txt').replace(
    /[\\/:*?"<>|]/g,
    '_',
  );
  const filters =
    Array.isArray(body.filters) && body.filters.length
      ? (body.filters as { name: string; extensions: string[] }[])
      : [
          { name: 'Text', extensions: ['txt'] },
          { name: 'All files', extensions: ['*'] },
        ];
  const result = await dialog.showSaveDialog({
    title: '파일 저장',
    defaultPath: safeName,
    filters,
  });
  if (result.canceled || !result.filePath) return { ok: false, saved: false };
  await fs.promises.writeFile(result.filePath, typeof body.content === 'string' ? body.content : '', 'utf8');
  return { ok: true, saved: true, path: result.filePath };
}

async function listFsDirForCapability(args: unknown): Promise<Record<string, unknown>> {
  const dirPath = readCapabilityString(normalizeMcpCapabilityArgs(args), ['dirPath', 'path']);
  if (!dirPath) return { ok: false, entries: [], error: 'dirPath is required' };
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const result: FsEntry[] = entries
      .map((e) => ({
        name: e.name,
        path: path.join(dirPath, e.name),
        isDirectory: e.isDirectory(),
        ext: e.isDirectory() ? '' : path.extname(e.name).replace('.', '').toLowerCase(),
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name, 'ko');
      });
    return { ok: true, entries: result };
  } catch (error) {
    return { ok: false, entries: [], error: error instanceof Error ? error.message : String(error) };
  }
}

async function readFsFileBase64ForCapability(args: unknown): Promise<Record<string, unknown>> {
  const filePath = readCapabilityString(normalizeMcpCapabilityArgs(args), ['filePath', 'path']);
  if (!filePath) return { ok: false, error: 'filePath is required' };
  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      return { ok: true, file: { fileName: path.basename(filePath), contentBase64: '', size: 0, isDirectory: true } };
    }
    const buffer = await fs.promises.readFile(filePath);
    return {
      ok: true,
      file: { fileName: path.basename(filePath), contentBase64: buffer.toString('base64'), size: buffer.length },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function writeFsFileBase64ForCapability(args: unknown): Promise<FileTransferResult & { ok: boolean }> {
  const body = normalizeMcpCapabilityArgs(args);
  const filePath = readCapabilityString(body, ['filePath', 'path']);
  if (!filePath) return { ok: false, saved: false, message: 'Invalid file path.' };
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, Buffer.from(String(body.contentBase64 || ''), 'base64'));
    return { ok: true, saved: true };
  } catch (error) {
    return { ok: false, saved: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function getCaptureDir(): string {
  const settings = loadSettings();
  const dir = settings.captureDir?.trim();
  const captureDir = dir || getDefaultCaptureDir();
  fs.mkdirSync(captureDir, { recursive: true });
  return captureDir;
}

function listCapturesForCapability(): Record<string, unknown> {
  try {
    const dir = getCaptureDir();
    const captures = fs
      .readdirSync(dir)
      .filter((f) => /^(capture|pane_capture)_\d+\.png$/i.test(f))
      .map((f) => {
        const filePath = path.join(dir, f);
        const stat = fs.statSync(filePath);
        return {
          filePath,
          fileName: f,
          createdAt: stat.mtimeMs,
          size: stat.size,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    return { ok: true, captures };
  } catch (error) {
    return { ok: false, captures: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function resolveCapturePathForCapability(args: unknown): string {
  const body = normalizeMcpCapabilityArgs(args);
  const filePath = readCapabilityString(body, ['filePath', 'path']);
  if (filePath) return filePath;
  const fileName = path.basename(readCapabilityString(body, ['fileName', 'name']));
  if (!/^(capture|pane_capture)_\d+\.png$/i.test(fileName)) return '';
  return path.join(getCaptureDir(), fileName);
}

function getCaptureThumbnailForCapability(args: unknown): Record<string, unknown> {
  const filePath = resolveCapturePathForCapability(args);
  try {
    if (!filePath || !fs.existsSync(filePath)) return { ok: false, thumbnail: '' };
    const img = nativeImage.createFromPath(filePath);
    if (img.isEmpty()) return { ok: false, thumbnail: '' };
    const thumb = img.resize({ width: 96, height: 72, quality: 'good' });
    return { ok: true, filePath, thumbnail: `data:image/jpeg;base64,${thumb.toJPEG(75).toString('base64')}` };
  } catch (error) {
    return { ok: false, thumbnail: '', error: error instanceof Error ? error.message : String(error) };
  }
}

function deleteCaptureForCapability(args: unknown): Record<string, unknown> {
  const filePath = resolveCapturePathForCapability(args);
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { ok: true, filePath };
  } catch (error) {
    return { ok: false, filePath, error: error instanceof Error ? error.message : String(error) };
  }
}

function deleteAllCapturesForCapability(): Record<string, unknown> {
  try {
    const dir = getCaptureDir();
    const files = fs.readdirSync(dir).filter((f) => /^(capture|pane_capture)_\d+\.png$/i.test(f));
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch {
        /* Ignore per-file failure. */
      }
    }
    return { ok: true, deleted: files.length };
  } catch (error) {
    return { ok: false, deleted: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

function closeCaptureWindows(): void {
  for (const w of captureWindows) {
    if (!w.isDestroyed()) w.close();
  }
  captureWindows = [];
}

async function startCaptureOverlay(): Promise<Record<string, unknown>> {
  if (captureWindows.length > 0) return { ok: true, alreadyOpen: true };
  mainWindowRef?.webContents.send('capture:preparing');

  const displays = screen.getAllDisplays();
  const maxW = Math.max(...displays.map((d) => d.bounds.width * (d.scaleFactor ?? 1)));
  const maxH = Math.max(...displays.map((d) => d.bounds.height * (d.scaleFactor ?? 1)));

  let sources: Awaited<ReturnType<typeof desktopCapturer.getSources>>;
  try {
    sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: Math.round(maxW), height: Math.round(maxH) },
    });
  } catch (error) {
    mainWindowRef?.webContents.send('capture:ready');
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const usableSources = sources.filter((source) => !source.thumbnail.isEmpty());
  if (usableSources.length === 0) {
    mainWindowRef?.webContents.send('capture:ready');
    return { ok: false, error: 'No usable screen thumbnails for capture overlay.' };
  }

  let loadedCaptureWindows = 0;
  for (let i = 0; i < displays.length; i++) {
    const d = displays[i];
    const source = usableSources.find((s) => s.display_id === String(d.id)) ?? usableSources[i] ?? usableSources[0];
    const screenshot = source.thumbnail.toDataURL();
    const overlayBounds = {
      x: Math.round(d.bounds.x),
      y: Math.round(d.bounds.y),
      width: Math.round(d.bounds.width),
      height: Math.round(d.bounds.height),
    };

    const win = new BrowserWindow({
      x: overlayBounds.x,
      y: overlayBounds.y,
      width: overlayBounds.width,
      height: overlayBounds.height,
      useContentSize: true,
      frame: false,
      thickFrame: false,
      hasShadow: false,
      show: false,
      backgroundColor: '#000000',
      fullscreen: false,
      fullscreenable: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.webContents.on('did-finish-load', () => {
      win.setBounds(overlayBounds, false);
      win.setContentSize(overlayBounds.width, overlayBounds.height);
      win.setPosition(overlayBounds.x, overlayBounds.y, false);
      win.webContents.send('prepare-canvas', { screenshot });
      win.showInactive();
      win.setAlwaysOnTop(true, 'screen-saver');
      loadedCaptureWindows += 1;
      if (loadedCaptureWindows === captureWindows.length) {
        mainWindowRef?.webContents.send('capture:ready');
      }
    });
    win.on('closed', () => {
      captureWindows = captureWindows.filter((w) => w !== win);
      if (captureWindows.length === 0) mainWindowRef?.webContents.send('capture:ready');
    });
    captureWindows.push(win);

    if (process.env.ELECTRON_RENDERER_URL) {
      win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/capture.html`).catch(console.error);
    } else {
      win.loadFile(path.join(__dirname, '../renderer/capture.html')).catch(console.error);
    }
  }

  return { ok: true, windows: captureWindows.length };
}

function normalizeCapturePaneRectForCapability(
  args: Record<string, unknown>,
  fallbackWidth: number,
  fallbackHeight: number,
): Required<Pick<CapturePaneRequest, 'x' | 'y' | 'width' | 'height'>> {
  const readNumber = (input: unknown, fallback: number): number => {
    const next = Number(input);
    return Number.isFinite(next) ? next : fallback;
  };
  return {
    x: Math.max(0, Math.floor(readNumber(args.x, 0))),
    y: Math.max(0, Math.floor(readNumber(args.y, 0))),
    width: Math.max(1, Math.min(12000, Math.ceil(readNumber(args.width, fallbackWidth)))),
    height: Math.max(1, Math.min(12000, Math.ceil(readNumber(args.height, fallbackHeight)))),
  };
}

async function capturePaneForCapability(
  args: unknown,
): Promise<(CapturePaneResult & { ok: boolean }) | { ok: false; error: string }> {
  const body = normalizeMcpCapabilityArgs(args);
  const windowId = Number(body.windowId);
  const targetWindow =
    Number.isInteger(windowId) && windowId > 0
      ? getWindowById(windowId)
      : (BrowserWindow.getFocusedWindow() ?? mainWindowRef);
  if (!targetWindow || targetWindow.isDestroyed()) {
    return { ok: false, error: 'No renderer window is available for pane capture.' };
  }

  try {
    const contentBounds = targetWindow.getContentBounds();
    const rect = normalizeCapturePaneRectForCapability(body, contentBounds.width, contentBounds.height);
    const image = await targetWindow.webContents.capturePage(rect);
    if (image.isEmpty()) {
      return { ok: false, error: 'Pane capture produced an empty image.' };
    }

    const fileName = `pane_capture_${Date.now()}.png`;
    const filePath = path.join(getCaptureDir(), fileName);
    await fs.promises.writeFile(filePath, image.toPNG());
    const stat = await fs.promises.stat(filePath);

    targetWindow.webContents.send('capture:done', filePath);
    if (mainWindowRef && !mainWindowRef.isDestroyed() && mainWindowRef.webContents !== targetWindow.webContents) {
      mainWindowRef.webContents.send('capture:done', filePath);
    }

    return {
      ok: true,
      filePath,
      fileName,
      createdAt: stat.mtimeMs,
      size: stat.size,
      paneId: readCapabilityString(body, ['paneId']),
      contentId: readCapabilityString(body, ['contentId']),
      title: readCapabilityString(body, ['title']),
      contentType: readCapabilityString(body, ['contentType']),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function saveCaptureDataUrlForCapability(
  args: unknown,
): Promise<(CaptureItem & { ok: boolean }) | { ok: false; error: string }> {
  const body = normalizeMcpCapabilityArgs(args);
  const dataUrl = readCapabilityString(body, ['dataUrl', 'content', 'base64']);
  if (!dataUrl) return { ok: false, error: 'dataUrl is required' };

  try {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/i, '').trim();
    if (!base64Data) return { ok: false, error: 'dataUrl is empty' };

    const fileName = `capture_${Date.now()}.png`;
    const filePath = path.join(getCaptureDir(), fileName);
    await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'));
    const stat = await fs.promises.stat(filePath);

    const targetWindow = BrowserWindow.getFocusedWindow() ?? mainWindowRef;
    if (targetWindow && !targetWindow.isDestroyed()) targetWindow.webContents.send('capture:done', filePath);
    if (mainWindowRef && !mainWindowRef.isDestroyed() && mainWindowRef !== targetWindow) {
      mainWindowRef.webContents.send('capture:done', filePath);
    }

    return {
      ok: true,
      filePath,
      fileName,
      createdAt: stat.mtimeMs,
      size: stat.size,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function getFocusedCapabilityWindow(): BrowserWindow | null {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow && !focusedWindow.isDestroyed()) return focusedWindow;
  return mainWindowRef && !mainWindowRef.isDestroyed() ? mainWindowRef : null;
}

function executeAppMenuRoleForCapability(args: unknown): Record<string, unknown> {
  const body = normalizeMcpCapabilityArgs(args);
  const role = readCapabilityString(body, ['role']);
  if (!role) return { ok: false, error: 'role is required' };

  if (role === 'quit') {
    app.quit();
    return { ok: true, role, quitting: true };
  }

  const win = getFocusedCapabilityWindow();
  if (!win || win.isDestroyed()) return { ok: false, role, error: 'No Xenesis Desk window is available.' };

  const webContents = win.webContents;
  switch (role) {
    case 'undo':
      webContents.undo();
      return { ok: true, role };
    case 'redo':
      webContents.redo();
      return { ok: true, role };
    case 'cut':
      webContents.cut();
      return { ok: true, role };
    case 'copy':
      webContents.copy();
      return { ok: true, role };
    case 'paste':
      webContents.paste();
      return { ok: true, role };
    case 'selectAll':
      webContents.selectAll();
      return { ok: true, role };
    case 'reload':
      webContents.reload();
      return { ok: true, role };
    case 'forceReload':
      webContents.reloadIgnoringCache();
      return { ok: true, role };
    case 'toggleDevTools':
      if (webContents.isDevToolsOpened()) webContents.closeDevTools();
      else webContents.openDevTools({ mode: 'detach' });
      return { ok: true, role, devToolsOpen: webContents.isDevToolsOpened() };
    case 'resetZoom':
      webContents.setZoomLevel(0);
      return { ok: true, role, zoomLevel: 0 };
    case 'zoomIn': {
      const zoomLevel = webContents.getZoomLevel() + 1;
      webContents.setZoomLevel(zoomLevel);
      return { ok: true, role, zoomLevel };
    }
    case 'zoomOut': {
      const zoomLevel = webContents.getZoomLevel() - 1;
      webContents.setZoomLevel(zoomLevel);
      return { ok: true, role, zoomLevel };
    }
    case 'togglefullscreen': {
      const fullScreen = !win.isFullScreen();
      win.setFullScreen(fullScreen);
      return { ok: true, role, fullScreen };
    }
    default:
      return { ok: false, role, error: `Unsupported application menu role: ${role}` };
  }
}

function xenesisAgentBridgeArgs(args: unknown): Record<string, string> {
  const body = normalizeMcpCapabilityArgs(args);
  return {
    agentId: readCapabilityRawString(body, ['agentId', 'id']).trim(),
    text: readCapabilityRawString(body, ['text', 'message', 'prompt']).trim(),
  };
}

async function executeXenesisAgentBridgeScript(
  fallback: Record<string, unknown>,
  script: string,
): Promise<Record<string, unknown>> {
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow || targetWindow.isDestroyed()) {
    return fallback;
  }

  try {
    const result = (await targetWindow.webContents.executeJavaScript(script, true)) as Record<string, unknown>;
    return { ...result, windowId: targetWindow.id };
  } catch (error) {
    return {
      ok: false,
      windowId: targetWindow.id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const XENESIS_AGENT_PROGRESS_SANITIZER_SCRIPT = String.raw`
  const stripXenesisAgentControlText = (value) => String(value || '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u001b[@-Z\\-_]/g, '')
    .replace(/\u009b[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[←↵]?\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  const XENESIS_AGENT_PROGRESS_NOISE_PATTERNS = [
    /MCP prompt pack/i,
    /Shared XCON Generation Contract/i,
    /Return sections in this order/i,
    /Do a final self-check/i,
    /Final Self-Check/i,
    /Output contract/i,
    /Visual quality contract/i,
    /Broken artifact:/i,
    /ERROR: \[validation\]/i,
    /WARNING: \[validation\]/i,
    /\[Console\]::OutputEncoding/i,
    /Get-Content\s+-Raw/i,
    /\bcodex\s+exec\b/i,
    /\bclaude\s+-p\b/i,
    /__GOWOORI_CLI_OUTPUT_BASE64_(?:BEGIN|END)__/i,
    /LASTEXITCODE/i,
    /CurrentDir=/i,
    /OpenAI Codex v/i,
    /\bworkdir:\s*/i,
    /\bapproval:\s*/i,
    /\bsandbox:\s*/i,
    /\bsession id:\s*/i,
    /\btokens used\b/i,
  ];
  function isXenesisAgentProgressNoise(value) {
    const text = stripXenesisAgentControlText(value).trim();
    if (!text) return false;
    return XENESIS_AGENT_PROGRESS_NOISE_PATTERNS.some((pattern) => pattern.test(text));
  }
  function summarizeXenesisAgentProgressText(value, options = {}) {
    const text = stripXenesisAgentControlText(value);
    if (/validation|diagnostic|Broken artifact|repair/i.test(text)) return '아티팩트를 점검하는 중...';
    if (/Codex CLI|Claude CLI|OpenAI Codex|claude -p|codex exec/i.test(text)) return 'LLM 응답을 생성하는 중...';
    if (options.role === 'system') return '상태를 확인하는 중...';
    return '응답을 생성하는 중...';
  }
  function sanitizeXenesisAgentProgressText(value, options = {}) {
    const maxLength = Number(options.maxLength || 1600);
    const text = stripXenesisAgentControlText(value)
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .trim();
    if (!text) return '';
    if (isXenesisAgentProgressNoise(text)) {
      return summarizeXenesisAgentProgressText(text, options).slice(-maxLength);
    }
    const cleaned = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line && !isXenesisAgentProgressNoise(line))
      .filter((line) => !/^(Copy|Status|Raw|Clear|Cancel|Work log|Diagnostics)$/i.test(line))
      .join('\n')
      .trim();
    if (!cleaned) return summarizeXenesisAgentProgressText(text, options).slice(-maxLength);
    return cleaned.slice(-maxLength);
  }
  function sanitizeXenesisAgentProgressLine(line) {
    const text = sanitizeXenesisAgentProgressText(line?.visibleText || line?.text || '', {
      role: line?.role || '',
      maxLength: 1200,
    });
    return {
      role: line?.role || '',
      streaming: Boolean(line?.streaming),
      error: Boolean(line?.error),
      text,
    };
  }
`;

async function listXenesisAgentsForCapability(): Promise<Record<string, unknown>> {
  const script = `
(() => {
  const normalizeListResult = (value) => {
    if (Array.isArray(value)) return { ok: true, agents: value };
    if (value && typeof value === 'object') {
      if (Array.isArray(value.agents)) return { ...value, ok: value.ok !== false, agents: value.agents };
      if (value.ok === false) return { ok: false, error: String(value.error || 'Failed to list Xenesis agents.') };
    }
    return { ok: true, agents: [] };
  };
  return (async () => {
    const registry = window.__xenesisDeskAgentBridge;
    if (!registry) return { ok: true, agents: [] };
    const listAgents = registry.listAgents || registry.list;
    if (typeof listAgents !== 'function') return { ok: true, agents: [] };
    return normalizeListResult(await listAgents.call(registry));
  })().catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
})()
`;
  return executeXenesisAgentBridgeScript({ ok: true, agents: [] }, script);
}

async function getXenesisAgentStatusForCapability(args: unknown): Promise<Record<string, unknown>> {
  const { agentId } = xenesisAgentBridgeArgs(args);
  if (!agentId) return { ok: false, error: 'agentId is required' };

  const script = `
(() => {
  const agentId = ${JSON.stringify(agentId)};
  const normalizeStatusResult = (value) => {
    if (!value) return { ok: false, error: 'Xenesis agent not found.' };
    if (value && typeof value === 'object') {
      if (value.ok === false) return { ok: false, error: String(value.error || 'Xenesis agent not found.'), ...value };
      if ('agent' in value && !value.agent) return { ok: false, error: 'Xenesis agent not found.', ...value };
      return { ok: true, ...value };
    }
    return { ok: true, status: value };
  };
  return (async () => {
    const registry = window.__xenesisDeskAgentBridge;
    if (!registry) return { ok: false, error: 'Xenesis Agent bridge registry is unavailable.' };
    const getStatus = registry.getAgentStatus || registry.statusAgent || registry.status;
    if (typeof getStatus !== 'function') return { ok: false, error: 'Xenesis Agent bridge registry cannot read status.' };
    return normalizeStatusResult(await getStatus.call(registry, agentId));
  })().catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
})()
`;
  return executeXenesisAgentBridgeScript({ ok: false, error: 'Xenesis Agent bridge registry is unavailable.' }, script);
}

async function submitXenesisAgentMessageForCapability(args: unknown): Promise<Record<string, unknown>> {
  const { agentId, text } = xenesisAgentBridgeArgs(args);
  if (!agentId) return { ok: false, error: 'agentId is required' };
  if (!text) return { ok: false, error: 'text is required' };

  const script = `
(() => {
  const payload = ${JSON.stringify({ agentId, text })};
  const normalizeSubmitResult = (value) => {
    if (value && typeof value === 'object') {
      if (value.ok === false) return { ok: false, error: String(value.error || 'Failed to submit Xenesis agent message.'), ...value };
      if ('event' in value) return { ...value, ok: true };
    }
    return { ok: true, event: value ?? null };
  };
  return (async () => {
    const registry = window.__xenesisDeskAgentBridge;
    if (!registry) return { ok: false, error: 'Xenesis Agent bridge registry is unavailable.' };
    const submit = registry.submitAgentMessage || registry.submitMessage;
    if (typeof submit !== 'function') return { ok: false, error: 'Xenesis Agent bridge registry cannot submit messages.' };
    return normalizeSubmitResult(await submit.call(registry, payload.agentId, payload.text));
  })().catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
})()
`;
  return executeXenesisAgentBridgeScript({ ok: false, error: 'Xenesis Agent bridge registry is unavailable.' }, script);
}

async function listXenesisAgentEventsForCapability(args: unknown): Promise<Record<string, unknown>> {
  const { agentId } = xenesisAgentBridgeArgs(args);
  if (!agentId) return { ok: false, error: 'agentId is required' };

  const script = `
(() => {
  const agentId = ${JSON.stringify(agentId)};
  const normalizeEventsResult = (value) => {
    if (Array.isArray(value)) return { ok: true, events: value };
    if (value && typeof value === 'object') {
      if (Array.isArray(value.events)) return { ...value, ok: value.ok !== false, events: value.events };
      if (value.ok === false) return { ok: false, error: String(value.error || 'Failed to list Xenesis agent events.') };
    }
    return { ok: true, events: [] };
  };
  return (async () => {
    const registry = window.__xenesisDeskAgentBridge;
    if (!registry) return { ok: true, events: [] };
    const listEvents = registry.listAgentEvents || registry.listEvents;
    if (typeof listEvents !== 'function') return { ok: true, events: [] };
    return normalizeEventsResult(await listEvents.call(registry, agentId));
  })().catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }));
})()
`;
  return executeXenesisAgentBridgeScript({ ok: true, events: [] }, script);
}

async function dropXenesisAgentAttachmentsForCapability(args: unknown): Promise<Record<string, unknown>> {
  const body = normalizeMcpCapabilityArgs(args);
  const attachments = normalizeXenesisRunAttachments(body.attachments) || [];
  if (attachments.length === 0) {
    return { ok: false, dropped: false, error: 'attachments are required' };
  }
  if (app.isPackaged) {
    return {
      ok: false,
      dropped: false,
      error: 'xd.testing.xenesisAgent.dropAttachments is only available in the development Electron app.',
    };
  }

  const expectedText = readCapabilityRawString(
    body,
    ['expectedText', 'waitForText', 'contains'],
    attachments[0]?.name || '',
  );
  const timeoutMs = clamp(Number(body.timeoutMs), 250, 600000, 30000);
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow || targetWindow.isDestroyed()) {
    return { ok: false, dropped: false, error: 'No Xenesis Desk window is available.' };
  }

  showMcpTargetWindow(targetWindow);
  const script = `
(() => {
  const config = ${JSON.stringify({ attachments, expectedText, timeoutMs })};
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    setTimeout(finish, 80);
    try {
      requestAnimationFrame(() => requestAnimationFrame(finish));
    } catch {
      finish();
    }
  });
  const elementVisibleArea = (element) => {
    if (!(element instanceof HTMLElement)) return 0;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return 0;
    const rect = element.getBoundingClientRect();
    const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    return width * height;
  };
  const getXenesisAgentRootDiagnostics = () => {
    const roots = Array.from(document.querySelectorAll('.xd-xenesis-agent'));
    const scoredRoots = roots
      .map((root) => {
        const dropTarget = root.querySelector('.xd-xenesis-terminal');
        return {
          root,
          dropTarget,
          rootArea: elementVisibleArea(root),
          dropTargetArea: dropTarget ? elementVisibleArea(dropTarget) : 0,
          text: String(root.textContent || '').slice(-1200),
        };
      })
      .sort((a, b) => (b.dropTargetArea - a.dropTargetArea) || (b.rootArea - a.rootArea));
    return {
      count: roots.length,
      visibleRoots: scoredRoots
        .filter((entry) => entry.rootArea > 0 && entry.dropTargetArea > 0)
        .map((entry) => ({
          root: entry.root,
          dropTarget: entry.dropTarget,
          rootArea: entry.rootArea,
          dropTargetArea: entry.dropTargetArea,
          text: entry.text,
        })),
      all: scoredRoots.map((entry) => ({
        rootArea: entry.rootArea,
        dropTargetArea: entry.dropTargetArea,
        hasDropTarget: Boolean(entry.dropTarget),
        text: entry.text,
      })),
    };
  };
  const selectXenesisAgentRoot = () => {
    const diagnostics = getXenesisAgentRootDiagnostics();
    return diagnostics.visibleRoots[0] || null;
  };
  const decodeDataUrl = (value) => {
    const text = String(value || '');
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(text);
    if (!match) return new Uint8Array();
    const isBase64 = Boolean(match[2]);
    const payload = match[3] || '';
    if (isBase64) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(payload));
  };
  const buildAttachmentFile = (attachment, index) => {
    const name = String(attachment?.name || 'xenesis-attachment-' + (index + 1));
    const mimeType = String(attachment?.mimeType || 'application/octet-stream');
    if (attachment?.dataUrl) {
      return new File([decodeDataUrl(attachment.dataUrl)], name, { type: mimeType });
    }
    const text = String(attachment?.text || attachment?.previewText || attachment?.path || name);
    return new File([text], name, { type: mimeType });
  };
  const readAttachmentChips = (root) => Array.from(root.querySelectorAll('.xd-xenesis-attachment-chip'))
    .map((chip) => String(chip.textContent || '').trim())
    .filter(Boolean);
  const waitForAttachmentChips = async (root, expectedName) => {
    const deadline = Date.now() + Number(config.timeoutMs || 30000);
    while (Date.now() <= deadline) {
      const chipNames = readAttachmentChips(root);
      const rootText = String(root?.innerText || '');
      const matched = expectedName
        ? chipNames.some((name) => name.includes(expectedName))
        : chipNames.length >= config.attachments.length;
      if (matched) return { matched: true, chipNames, bodyText: rootText };
      await sleep(100);
    }
    return {
      matched: false,
      chipNames: readAttachmentChips(root),
      bodyText: String(root?.innerText || ''),
    };
  };
  return (async () => {
    if (typeof DataTransfer !== 'function' || typeof DragEvent !== 'function' || typeof File !== 'function') {
      return {
        ok: false,
        dropped: false,
        error: 'The renderer does not expose DataTransfer, DragEvent, and File constructors.',
        diagnostics: getXenesisAgentRootDiagnostics(),
      };
    }
    const selected = selectXenesisAgentRoot();
    if (!selected?.root || !selected?.dropTarget) {
      return {
        ok: false,
        dropped: false,
        error: 'Visible Xenesis Agent drop target was not found.',
        diagnostics: getXenesisAgentRootDiagnostics(),
      };
    }
    const root = selected.root;
    const dropTarget = selected.dropTarget;
    const files = config.attachments.map(buildAttachmentFile);
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    dataTransfer.dropEffect = 'copy';
    dataTransfer.effectAllowed = 'copy';
    const createDragEvent = (type) => {
      const event = new DragEvent(type, { bubbles: true, cancelable: true });
      try {
        Object.defineProperty(event, 'dataTransfer', { configurable: true, value: dataTransfer });
      } catch {
        if (!event.dataTransfer) {
          Object.defineProperty(event, 'dataTransfer', { configurable: true, value: dataTransfer });
        }
      }
      return event;
    };
    const dispatchDragEvent = (event) => {
      dropTarget.dispatchEvent(event);
    };
    dropTarget.scrollIntoView({ block: 'center', inline: 'nearest' });
    await nextFrame();
    dispatchDragEvent(createDragEvent('dragenter'));
    dispatchDragEvent(createDragEvent('dragover'));
    await sleep(50);
    dispatchDragEvent(createDragEvent('drop'));
    await nextFrame();
    const droppedAttachmentNames = files.map((file) => file.name);
    const waitResult = await waitForAttachmentChips(root, String(config.expectedText || droppedAttachmentNames[0] || ''));
    return {
      ok: waitResult.matched,
      dropped: true,
      attachmentCount: files.length,
      droppedAttachmentNames,
      chipNames: waitResult.chipNames,
      matchedExpectedText: waitResult.matched,
      expectedText: config.expectedText,
      bodyTextPreview: waitResult.bodyText.slice(0, 1200),
      bodyTextTail: waitResult.bodyText.slice(-2000),
      diagnostics: getXenesisAgentRootDiagnostics(),
    };
  })().catch((error) => ({
    ok: false,
    dropped: false,
    error: error instanceof Error ? error.message : String(error),
    diagnostics: getXenesisAgentRootDiagnostics(),
  }));
})()
`;

  try {
    const result = (await targetWindow.webContents.executeJavaScript(script, true)) as Record<string, unknown>;
    return { ...result, windowId: targetWindow.id };
  } catch (error) {
    return {
      ok: false,
      dropped: false,
      windowId: targetWindow.id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function snapshotXenesisAgentForCapability(args: unknown): Promise<Record<string, unknown>> {
  const body = normalizeMcpCapabilityArgs(args);
  const maxLines = clamp(Number(body.maxLines), 1, 80, 12);
  const includeBodyText = typeof body.includeBodyText === 'boolean' ? body.includeBodyText : false;
  if (app.isPackaged) {
    return {
      ok: false,
      present: false,
      error: 'xd.testing.xenesisAgent.snapshot is only available in the development Electron app.',
    };
  }

  const targetWindow = getMcpTargetWindow();
  if (!targetWindow || targetWindow.isDestroyed()) {
    return { ok: false, present: false, error: 'No Xenesis Desk window is available.' };
  }

  const script = `
(() => {
  const config = ${JSON.stringify({ maxLines, includeBodyText })};
${XENESIS_AGENT_PROGRESS_SANITIZER_SCRIPT}
  const elementVisibleArea = (element) => {
    if (!(element instanceof HTMLElement)) return 0;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return 0;
    const rect = element.getBoundingClientRect();
    const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    return width * height;
  };
  const readTranscriptLines = (agentRoot) => {
    if (!agentRoot) return [];
    return Array.from(agentRoot.querySelectorAll('.xd-xenesis-terminal-line')).map((element) => ({
      role: element.classList.contains('is-assistant')
        ? 'assistant'
        : element.classList.contains('is-system')
          ? 'system'
          : element.classList.contains('is-user')
            ? 'user'
            : 'unknown',
      streaming: element.classList.contains('is-streaming'),
      error: element.classList.contains('is-error'),
      text: element.textContent || '',
      visibleText: element.innerText || element.textContent || '',
    }));
  };
  const roots = Array.from(document.querySelectorAll('.xd-xenesis-agent'));
  const scoredRoots = roots
    .map((root) => {
      const input = root.querySelector('textarea.xd-xenesis-terminal-input');
      const transcript = root.querySelector('.xd-xenesis-terminal');
      const rootArea = elementVisibleArea(root);
      const inputArea = input ? elementVisibleArea(input) : 0;
      const transcriptArea = transcript ? elementVisibleArea(transcript) : 0;
      return { root, input, transcript, rootArea, inputArea, transcriptArea };
    })
    .sort((a, b) => (b.transcriptArea - a.transcriptArea) || (b.inputArea - a.inputArea) || (b.rootArea - a.rootArea));
  const selected = scoredRoots.find((item) => item.rootArea > 0 && (item.transcriptArea > 0 || item.inputArea > 0)) || scoredRoots[0] || null;
  const root = selected?.root || null;
  const lines = readTranscriptLines(root);
  const recentLines = lines.slice(-Number(config.maxLines || 12)).map((line) => sanitizeXenesisAgentProgressLine(line));
  const assistantLines = lines.filter((line) => line.role === 'assistant' && String(line.visibleText || line.text || '').trim());
  const userLines = lines.filter((line) => line.role === 'user' && String(line.visibleText || line.text || '').trim());
  const systemLines = lines.filter((line) => line.role === 'system' && String(line.visibleText || line.text || '').trim());
  const lastLine = [...lines].reverse().find((line) => String(line.visibleText || line.text || '').trim()) || null;
  const bodyText = String(document.body?.innerText || '');
  const result = {
    ok: Boolean(root),
    present: Boolean(root),
    rootCount: roots.length,
    inputCount: scoredRoots.filter((item) => item.input).length,
    visibleRootCount: scoredRoots.filter((item) => item.rootArea > 0 && (item.transcriptArea > 0 || item.inputArea > 0)).length,
    lineCount: lines.length,
    streamingLineCount: lines.filter((line) => line.streaming).length,
    errorLineCount: lines.filter((line) => line.error).length,
    busy: Boolean(root?.querySelector('[aria-busy="true"], .is-streaming, .xd-provider-working, .xd-xenesis-is-running')),
    lastLineRole: lastLine?.role || '',
    lastLineText: sanitizeXenesisAgentProgressText(lastLine?.visibleText || lastLine?.text || '', { role: lastLine?.role || '', maxLength: 1200 }),
    lastAssistantText: sanitizeXenesisAgentProgressText(assistantLines.at(-1)?.visibleText || assistantLines.at(-1)?.text || '', { role: 'assistant', maxLength: 1600 }),
    lastUserText: String(userLines.at(-1)?.visibleText || userLines.at(-1)?.text || '').trim().slice(-1200),
    lastSystemText: sanitizeXenesisAgentProgressText(systemLines.at(-1)?.visibleText || systemLines.at(-1)?.text || '', { role: 'system', maxLength: 1200 }),
    lastLines: recentLines,
  };
  if (config.includeBodyText) {
    result.bodyTextPreview = bodyText.slice(0, 1200);
    result.bodyTextTail = bodyText.slice(-2000);
  }
  return result;
})()
`;

  try {
    const result = (await targetWindow.webContents.executeJavaScript(script, true)) as Record<string, unknown>;
    return { ...result, windowId: targetWindow.id };
  } catch (error) {
    return {
      ok: false,
      present: false,
      windowId: targetWindow.id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function submitXenesisAgentPromptForCapability(args: unknown): Promise<Record<string, unknown>> {
  const body = normalizeMcpCapabilityArgs(args);
  const prompt = readCapabilityRawString(body, ['prompt', 'text', 'message']);
  if (!prompt.trim()) return { ok: false, submitted: false, error: 'prompt is required' };
  if (app.isPackaged) {
    return {
      ok: false,
      submitted: false,
      error: 'xd.testing.xenesisAgent.submitPrompt is only available in the development Electron app.',
    };
  }

  const submitModeInput = readCapabilityString(body, ['submitMode', 'mode'], 'both').toLowerCase();
  const submitMode = submitModeInput === 'enter' || submitModeInput === 'form' ? submitModeInput : 'both';
  const expectedText = readCapabilityRawString(body, ['expectedText', 'waitForText', 'contains']);
  const expectedTextScope = readCapabilityString(body, ['expectedTextScope', 'textScope'], 'newResponse').toLowerCase();
  const matchBodyText = body.matchBodyText === true || expectedTextScope === 'body' || expectedTextScope === 'anywhere';
  const clickApprovalButton = body.clickApprovalButton !== false;
  const timeoutMs = clamp(Number(body.timeoutMs), 250, 600000, 30000);
  const typeDelayMs = clamp(Number(body.typeDelayMs), 0, 1000, 0);
  const progressIntervalMs = clamp(Number(body.progressIntervalMs), 0, 60000, 0);
  const progressSampleLimit = clamp(Number(body.progressSampleLimit), 1, 100, 20);
  const bypassDirectDeskRouting = body.bypassDirectDeskRouting === true;
  const bypassNaturalDeskRouting = body.bypassNaturalDeskRouting === true;
  const attachments = normalizeXenesisRunAttachments(body.attachments) || [];
  const rawExpectedComponents = Array.isArray(body.expectedComponents)
    ? body.expectedComponents
    : Array.isArray(body.components)
      ? body.components
      : typeof body.expectedComponents === 'string'
        ? body.expectedComponents.split(',')
        : typeof body.components === 'string'
          ? body.components.split(',')
          : [];
  const expectedComponents = rawExpectedComponents
    .map((component) => sanitizeMcpDockActionText(component, 80))
    .filter(Boolean)
    .slice(0, 20);
  const revealComponents = typeof body.revealComponents === 'boolean' ? body.revealComponents : true;
  const preferArtifactPane = typeof body.preferArtifactPane === 'boolean' ? body.preferArtifactPane : true;
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow || targetWindow.isDestroyed()) {
    return { ok: false, submitted: false, error: 'No Xenesis Desk window is available.' };
  }

  showMcpTargetWindow(targetWindow);
  const script = `
(() => {
  const config = ${JSON.stringify({ prompt, submitMode, expectedText, matchBodyText, clickApprovalButton, timeoutMs, attachments, typeDelayMs, progressIntervalMs, progressSampleLimit, bypassDirectDeskRouting, bypassNaturalDeskRouting })};
${XENESIS_AGENT_PROGRESS_SANITIZER_SCRIPT}
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    setTimeout(finish, 80);
    try {
      requestAnimationFrame(() => requestAnimationFrame(finish));
    } catch {
      finish();
    }
  });
  const setNativeValue = (element, value) => {
    const ownDescriptor = Object.getOwnPropertyDescriptor(element, 'value');
    const prototype = Object.getPrototypeOf(element);
    const prototypeDescriptor = prototype ? Object.getOwnPropertyDescriptor(prototype, 'value') : null;
    const setter = prototypeDescriptor?.set || ownDescriptor?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
  };
  const dispatchInput = (element, data, inputType = 'insertText') => {
    try {
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: false,
        data,
        inputType,
      }));
    } catch {
      element.dispatchEvent(new Event('input', { bubbles: true, cancelable: false }));
    }
  };
  const typeTextIntoInput = async (element, text) => {
    const delayMs = Number(config.typeDelayMs || 0);
    if (delayMs <= 0) {
      setNativeValue(element, text);
      dispatchInput(element, text, 'insertText');
      return;
    }
    setNativeValue(element, '');
    dispatchInput(element, null, 'deleteContentBackward');
    for (const char of text) {
      setNativeValue(element, element.value + char);
      dispatchInput(element, char, 'insertText');
      await sleep(delayMs);
    }
  };
  const makeKeyboardEvent = () => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      location: 0,
      repeat: false,
      isComposing: false,
    });
    Object.defineProperty(event, 'keyCode', { configurable: true, get: () => 13 });
    Object.defineProperty(event, 'which', { configurable: true, get: () => 13 });
    return event;
  };
  const elementVisibleArea = (element) => {
    if (!(element instanceof HTMLElement)) return 0;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return 0;
    const rect = element.getBoundingClientRect();
    const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    return width * height;
  };
  const getXenesisAgentRootDiagnostics = () => {
    const roots = Array.from(document.querySelectorAll('.xd-xenesis-agent'));
    const scoredRoots = roots
      .map((root) => {
        const input = root.querySelector('textarea.xd-xenesis-terminal-input');
        return {
          root,
          input,
          rootArea: elementVisibleArea(root),
          inputArea: input ? elementVisibleArea(input) : 0,
        };
      })
      .sort((a, b) => (b.inputArea - a.inputArea) || (b.rootArea - a.rootArea));
    const visibleRoots = scoredRoots.filter((item) => item.input && item.rootArea > 0 && item.inputArea > 0);
    return {
      roots,
      scoredRoots,
      visibleRoots,
      rootCount: roots.length,
      inputCount: scoredRoots.filter((item) => item.input).length,
      visibleRootCount: visibleRoots.length,
    };
  };
  const selectXenesisAgentRoot = () => {
    const diagnostics = getXenesisAgentRootDiagnostics();
    return diagnostics.visibleRoots[0]?.root || null;
  };
  const isApprovalPrompt = () => /^(?:승인|허용|진행|좋아|네|예|응|오케이|ok|okay|yes|approve|approved)(?:\\s*(?:승인)?(?:합니다|해|할게|진행해|저장|apply|please|it)?)?[.!。！]*$/i.test(String(config.prompt || '').trim());
  const findLatestDeskActionApproveButton = (agentRoot) => {
    if (!agentRoot || !config.clickApprovalButton || !isApprovalPrompt()) return null;
    const buttons = Array.from(agentRoot.querySelectorAll('[data-xenesis-agent-desk-action-approve="true"], .xd-xenesis-desk-action-card.is-pending button'));
    return buttons.reverse().find((button) => (
      button instanceof HTMLButtonElement
      && !button.disabled
      && elementVisibleArea(button) > 0
      && /승인|approve|실행|run/i.test(button.innerText || button.textContent || '')
    )) || null;
  };
  const readTranscriptLines = (agentRoot) => {
    if (!agentRoot) return [];
    return Array.from(agentRoot.querySelectorAll('.xd-xenesis-terminal-line')).map((element) => ({
      role: element.classList.contains('is-assistant')
        ? 'assistant'
        : element.classList.contains('is-system')
          ? 'system'
          : element.classList.contains('is-user')
            ? 'user'
            : 'unknown',
      streaming: element.classList.contains('is-streaming'),
      error: element.classList.contains('is-error'),
      text: element.textContent || '',
      visibleText: element.innerText || element.textContent || '',
    }));
  };
  const parseArtifactStatus = (responseText) => {
    const artifactStatusLine = (responseText.match(/XCON artifact:\\s*[^\\n]+/) || [''])[0].trim();
    const countMatch = artifactStatusLine.match(/\\((\\d+)\\s+error,\\s*(\\d+)\\s+warning\\)/i);
    const errors = countMatch ? Number(countMatch[1]) : 0;
    const warnings = countMatch ? Number(countMatch[2]) : 0;
    const diagnosticSection = (responseText.match(/XCON diagnostics:\\s*\\n([\\s\\S]*?)(?:\\n\\s*\\n|$)/i) || [])[1] || '';
    const artifactDiagnosticDetails = diagnosticSection
      .split(/\\n+/)
      .map((line) => {
        const match = line.trim().match(/^(?:[-•]\\s*)?(info|warning|error)\\s*\\[([^\\]]+)\\]:\\s*(.+)$/i);
        if (!match) return null;
        return {
          severity: match[1].toLowerCase(),
          source: match[2],
          message: match[3].trim(),
        };
      })
      .filter(Boolean);
    return {
      artifactStatusLine,
      artifactDiagnosticSummary: {
        errors,
        warnings,
      },
      artifactDiagnosticDetails,
      artifactHasDiagnostics: errors > 0 || warnings > 0,
    };
  };
  const extractArtifactOverlaySource = (responseText) => {
    const text = String(responseText || '').trim();
    if (!text) return '';
    return /\`\`\`(?:xcon-sketch|xcons|sketch|xcon)\\b/i.test(text) ? text : '';
  };
  const readLatestArtifactSource = () => {
    const snapshot = window.__xenesisDeskXenesisAgentLatestArtifactSource;
    if (!snapshot || typeof snapshot.source !== 'string' || !snapshot.source.trim()) return null;
    return {
      label: String(snapshot.label || ''),
      source: snapshot.source,
      sourceLength: Number(snapshot.sourceLength || snapshot.source.length),
      updatedAt: Number(snapshot.updatedAt || 0),
    };
  };
  const chooseArtifactSource = (artifactBefore, responseText) => {
    const latest = readLatestArtifactSource();
    const fallback = extractArtifactOverlaySource(responseText);
    if (!latest?.source) {
      return { source: fallback, label: '', changed: false };
    }
    const changed = latest.updatedAt !== artifactBefore?.updatedAt || latest.source !== artifactBefore?.source;
    if (changed || !fallback) {
      return { source: latest.source, label: latest.label || '', changed };
    }
    return { source: fallback, label: latest.label || '', changed };
  };
  const waitForRenderedText = async (expectedText, timeoutMs, baselineLineCount, agentRoot) => {
    const startedAt = Date.now();
    const deadline = Date.now() + timeoutMs;
    let lastText = agentRoot?.innerText || agentRoot?.textContent || '';
    let lastLines = readTranscriptLines(agentRoot);
    let lastNewLines = [];
    let lastProgressAt = 0;
    let lastProgressSignature = '';
    const progressSamples = [];
    const buildProgressSample = () => {
      const newLines = lastNewLines.length ? lastNewLines : lastLines.slice(baselineLineCount);
      const visibleLines = newLines.filter((line) => String(line.visibleText || line.text || '').trim());
      const assistantLines = visibleLines.filter((line) => line.role === 'assistant');
      const systemLines = visibleLines.filter((line) => line.role === 'system');
      const lastLine = visibleLines.at(-1) || lastLines.filter((line) => String(line.visibleText || line.text || '').trim()).at(-1) || null;
      return {
        elapsedMs: Date.now() - startedAt,
        lineCount: lastLines.length,
        newLineCount: newLines.length,
        streamingLineCount: lastLines.filter((line) => line.streaming).length,
        lastLineRole: lastLine?.role || '',
        lastLineText: sanitizeXenesisAgentProgressText(lastLine?.visibleText || lastLine?.text || '', { role: lastLine?.role || '', maxLength: 1200 }),
        lastAssistantText: sanitizeXenesisAgentProgressText(assistantLines.at(-1)?.visibleText || assistantLines.at(-1)?.text || '', { role: 'assistant', maxLength: 1600 }),
        lastSystemText: sanitizeXenesisAgentProgressText(systemLines.at(-1)?.visibleText || systemLines.at(-1)?.text || '', { role: 'system', maxLength: 1200 }),
      };
    };
    const maybePushProgressSample = (force = false) => {
      if (!Number(config.progressIntervalMs || 0) && !force) return;
      const now = Date.now();
      if (!force && now - lastProgressAt < Number(config.progressIntervalMs || 0)) return;
      const sample = buildProgressSample();
      const signature = [
        sample.lineCount,
        sample.newLineCount,
        sample.streamingLineCount,
        sample.lastLineRole,
        sample.lastLineText,
        sample.lastAssistantText,
        sample.lastSystemText,
      ].join('|');
      if (!force && signature === lastProgressSignature) return;
      lastProgressAt = now;
      lastProgressSignature = signature;
      progressSamples.push(sample);
      const limit = Number(config.progressSampleLimit || 20);
      while (progressSamples.length > limit) progressSamples.shift();
    };
    while (Date.now() <= deadline) {
      lastText = agentRoot?.innerText || agentRoot?.textContent || '';
      lastLines = readTranscriptLines(agentRoot);
      lastNewLines = lastLines.slice(baselineLineCount);
      const newResponseLines = lastNewLines.filter((line) => (
        (line.role === 'assistant' || line.role === 'system')
        && line.visibleText.trim()
        && !line.streaming
      ));
      const newResponseText = newResponseLines.map((line) => line.visibleText.trim()).join('\\n\\n');
      if (expectedText) {
        if (newResponseText.includes(expectedText) || (config.matchBodyText && lastText.includes(expectedText))) {
          maybePushProgressSample(true);
          const artifactStatus = parseArtifactStatus(newResponseText || lastText);
          return {
            matched: true,
            bodyText: lastText,
            lineCount: lastLines.length,
            newLineCount: lastNewLines.length,
            responseText: newResponseText || lastText,
            elapsedMs: Date.now() - startedAt,
            progressSamples,
            lastProgress: progressSamples.at(-1) || null,
            ...artifactStatus,
          };
        }
      } else if (newResponseLines.length > 0) {
        maybePushProgressSample(true);
        const artifactStatus = parseArtifactStatus(newResponseText);
        return {
          matched: true,
          bodyText: lastText,
          lineCount: lastLines.length,
          newLineCount: lastNewLines.length,
          responseText: newResponseText,
          elapsedMs: Date.now() - startedAt,
          progressSamples,
          lastProgress: progressSamples.at(-1) || null,
          ...artifactStatus,
        };
      }
      maybePushProgressSample(false);
      await sleep(100);
    }
    const responseText = lastNewLines.map((line) => line.visibleText.trim()).filter(Boolean).join('\\n\\n');
    maybePushProgressSample(true);
    const artifactStatus = parseArtifactStatus(responseText);
    return {
      matched: false,
      bodyText: lastText,
      lineCount: lastLines.length,
      newLineCount: lastNewLines.length,
      responseText,
      elapsedMs: Date.now() - startedAt,
      progressSamples,
      lastProgress: progressSamples.at(-1) || null,
      ...artifactStatus,
    };
  };
  return (async () => {
    const root = selectXenesisAgentRoot();
    if (!root) {
      const diagnostics = getXenesisAgentRootDiagnostics();
      return {
        ok: false,
        submitted: false,
        error: 'Visible Xenesis Agent pane was not found. Open or focus Xenesis Agent before submitting.',
        rootCount: diagnostics.rootCount,
        inputCount: diagnostics.inputCount,
        visibleRootCount: diagnostics.visibleRootCount,
      };
    }
    const input = root.querySelector('textarea.xd-xenesis-terminal-input');
    if (!input) {
      return { ok: false, submitted: false, error: 'Xenesis Agent prompt textarea was not found.' };
    }
    const form = input.closest('form');
    const submitButton = form
      ? Array.from(form.querySelectorAll('button, input[type="submit"]')).find((candidate) => (
          candidate instanceof HTMLElement
          && elementVisibleArea(candidate) > 0
          && !candidate.hasAttribute('disabled')
        ))
      : null;
    const beforeValue = input.value;
    const transcriptBefore = readTranscriptLines(root);
    const artifactBefore = readLatestArtifactSource();
    const approvalButton = findLatestDeskActionApproveButton(root);
    if (approvalButton) {
      approvalButton.click();
      const waitResult = await waitForRenderedText(config.expectedText, config.timeoutMs, transcriptBefore.length, root);
      const artifact = chooseArtifactSource(artifactBefore, waitResult.responseText);
      return {
        ok: !config.expectedText || waitResult.matched,
        submitted: true,
        beforeValue,
        valueAfterInput: beforeValue,
        afterValue: input.value,
        approvalButtonClicked: true,
        customEventSubmitted: false,
        shouldFallbackSubmit: false,
        enterPrevented: false,
        formSubmitPrevented: false,
        submitButtonClicked: false,
        matchedExpectedText: waitResult.matched,
        expectedText: config.expectedText,
        promptVisible: waitResult.bodyText.includes(config.prompt.trim()),
        lineCountBefore: transcriptBefore.length,
        lineCountAfter: waitResult.lineCount,
        newLineCount: waitResult.newLineCount,
        artifactStatusLine: waitResult.artifactStatusLine,
        artifactDiagnosticSummary: waitResult.artifactDiagnosticSummary,
        artifactDiagnosticDetails: waitResult.artifactDiagnosticDetails,
        artifactHasDiagnostics: waitResult.artifactHasDiagnostics,
        elapsedMs: waitResult.elapsedMs,
        progressSamples: waitResult.progressSamples,
        lastProgress: waitResult.lastProgress,
        artifactSource: artifact.source,
        artifactSourceLength: artifact.source.length,
        artifactSourceChanged: artifact.changed,
        artifactLabel: artifact.label,
        responseTextPreview: waitResult.responseText.slice(0, 2000),
        bodyTextPreview: waitResult.bodyText.slice(0, 1200),
        bodyTextTail: waitResult.bodyText.slice(-2000),
      };
    }
    input.scrollIntoView({ block: 'center', inline: 'nearest' });
    input.focus();
    await typeTextIntoInput(input, config.prompt);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await nextFrame();
    await sleep(50);
    const valueAfterInput = input.value;

    const submitDetail = {
      prompt: config.prompt,
      source: 'xd.testing.xenesisAgent.submitPrompt',
      bypassDirectDeskRouting: config.bypassDirectDeskRouting === true,
      bypassNaturalDeskRouting: config.bypassNaturalDeskRouting === true,
    };
    if (Array.isArray(config.attachments) && config.attachments.length > 0) {
      submitDetail.attachments = config.attachments;
    }
    const submitEvent = new CustomEvent('xenesis-agent-submit-prompt', {
      bubbles: false,
      cancelable: true,
      detail: submitDetail,
    });
    const customEventSubmitted = !root.dispatchEvent(submitEvent);
    await sleep(250);
    const transcriptAfterCustom = readTranscriptLines(root);
    const shouldFallbackSubmit = transcriptAfterCustom.length === transcriptBefore.length && input.value === config.prompt;

    let enterPrevented = false;
    let formSubmitPrevented = false;
    let submitButtonClicked = false;
    if (shouldFallbackSubmit && (config.submitMode === 'enter' || config.submitMode === 'both')) {
      enterPrevented = !input.dispatchEvent(makeKeyboardEvent());
      await sleep(150);
    }
    if (shouldFallbackSubmit && (config.submitMode === 'form' || (config.submitMode === 'both' && input.value === config.prompt))) {
      if (!form) {
        return { ok: false, submitted: false, error: 'Xenesis Agent prompt form was not found.', beforeValue, valueAfterInput };
      }
      const formSubmitEvent = new Event('submit', { bubbles: true, cancelable: true });
      formSubmitPrevented = !form.dispatchEvent(formSubmitEvent);
      await sleep(150);
    }
    if (shouldFallbackSubmit && submitButton && input.value === config.prompt) {
      submitButton.click();
      submitButtonClicked = true;
      await sleep(150);
    }

    const waitResult = await waitForRenderedText(config.expectedText, config.timeoutMs, transcriptBefore.length, root);
    const artifact = chooseArtifactSource(artifactBefore, waitResult.responseText);
    const afterValue = input.value;
    const promptVisible = waitResult.bodyText.includes(config.prompt.trim());
    const submitted = promptVisible || afterValue.trim() === '';
    return {
      ok: submitted && (!config.expectedText || waitResult.matched),
      submitted,
      beforeValue,
      valueAfterInput,
      afterValue,
      customEventSubmitted,
      shouldFallbackSubmit,
      enterPrevented,
      formSubmitPrevented,
      submitButtonClicked,
      matchedExpectedText: waitResult.matched,
      expectedText: config.expectedText,
      promptVisible,
      lineCountBefore: transcriptBefore.length,
      lineCountAfter: waitResult.lineCount,
      newLineCount: waitResult.newLineCount,
      artifactStatusLine: waitResult.artifactStatusLine,
      artifactDiagnosticSummary: waitResult.artifactDiagnosticSummary,
      artifactDiagnosticDetails: waitResult.artifactDiagnosticDetails,
      artifactHasDiagnostics: waitResult.artifactHasDiagnostics,
      elapsedMs: waitResult.elapsedMs,
      progressSamples: waitResult.progressSamples,
      lastProgress: waitResult.lastProgress,
      artifactSource: artifact.source,
      artifactSourceLength: artifact.source.length,
      artifactSourceChanged: artifact.changed,
      artifactLabel: artifact.label,
      responseTextPreview: waitResult.responseText.slice(0, 2000),
      bodyTextPreview: waitResult.bodyText.slice(0, 1200),
      bodyTextTail: waitResult.bodyText.slice(-2000),
    };
  })().catch((error) => ({ ok: false, submitted: false, error: error instanceof Error ? error.message : String(error) }));
})()
`;

  try {
    const result = (await targetWindow.webContents.executeJavaScript(script, true)) as Record<string, unknown>;
    let componentVisibility: McpBridgeGowooriArtifactVisibilityResult | undefined;
    let componentsOk: boolean | undefined;
    let missingComponents: string[] | undefined;
    if (expectedComponents.length > 0 && result?.submitted === true) {
      componentVisibility = await sendMcpGowooriArtifactVisibilityToRenderer({
        components: expectedComponents,
        reveal: revealComponents,
        preferArtifactPane: preferArtifactPane,
      });
      const visibleComponents = new Set(
        componentVisibility.components
          .filter((component) => component.present && component.visible)
          .map((component) => component.component),
      );
      missingComponents = expectedComponents.filter((component) => !visibleComponents.has(component));
      componentsOk = componentVisibility.ok === true && missingComponents.length === 0;
    }
    const textOk = result?.ok === true;
    return {
      ...result,
      ok: textOk && componentsOk !== false,
      windowId: targetWindow.id,
      ...(expectedComponents.length > 0 ? { expectedComponents } : {}),
      ...(componentVisibility ? { componentVisibility } : {}),
      ...(typeof componentsOk === 'boolean' ? { componentsOk } : {}),
      ...(missingComponents ? { missingComponents } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      submitted: false,
      windowId: targetWindow.id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function submitGowooriChatPromptForCapability(args: unknown): Promise<Record<string, unknown>> {
  const body = normalizeMcpCapabilityArgs(args);
  const prompt = readCapabilityRawString(body, ['prompt', 'text', 'message']);
  if (!prompt.trim()) return { ok: false, submitted: false, error: 'prompt is required' };
  if (app.isPackaged) {
    return {
      ok: false,
      submitted: false,
      error: 'xd.testing.gowooriChat.submitPrompt is only available in the development Electron app.',
    };
  }

  const validProviders = new Set(['mock', 'codex', 'claude', 'hermes', 'byok']);
  const providerInput = readCapabilityString(body, ['provider'], '').toLowerCase();
  const provider = validProviders.has(providerInput) ? providerInput : '';
  const uiModeInput = readCapabilityString(body, ['uiMode', 'mode'], 'user').toLowerCase();
  if (uiModeInput && uiModeInput !== 'user') {
    return {
      ok: false,
      submitted: false,
      error: 'xd.testing.gowooriChat.submitPrompt only allows GowooriChat user mode.',
    };
  }
  const uiMode = 'user';
  const submitModeInput = readCapabilityString(body, ['submitMode'], 'both').toLowerCase();
  const submitMode = submitModeInput === 'enter' || submitModeInput === 'button' ? submitModeInput : 'both';
  const typeDelayMs = clamp(Number(body.typeDelayMs), 0, 1000, 55);
  const timeoutMs = clamp(Number(body.timeoutMs), 250, 600000, 45000);
  const expectedText = readCapabilityRawString(body, ['expectedText', 'waitForText', 'contains']);
  const targetWindow = getMcpTargetWindow();
  if (!targetWindow || targetWindow.isDestroyed()) {
    return { ok: false, submitted: false, error: 'No Xenesis Desk window is available.' };
  }

  showMcpTargetWindow(targetWindow);
  const script = `
(() => {
  const config = ${JSON.stringify({ prompt, provider, uiMode, submitMode, typeDelayMs, timeoutMs, expectedText })};
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nextFrame = () => new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    setTimeout(finish, 80);
    try {
      requestAnimationFrame(() => requestAnimationFrame(finish));
    } catch {
      finish();
    }
  });
  const setNativeValue = (element, value) => {
    const ownDescriptor = Object.getOwnPropertyDescriptor(element, 'value');
    const prototype = Object.getPrototypeOf(element);
    const prototypeDescriptor = prototype ? Object.getOwnPropertyDescriptor(prototype, 'value') : null;
    const setter = prototypeDescriptor?.set || ownDescriptor?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
  };
  const dispatchInput = (element, data, inputType = 'insertText') => {
    let event;
    try {
      event = new InputEvent('input', {
        bubbles: true,
        cancelable: false,
        data,
        inputType,
      });
    } catch {
      event = new Event('input', { bubbles: true, cancelable: false });
    }
    element.dispatchEvent(event);
  };
  const makeKeyboardEvent = () => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      location: 0,
      repeat: false,
      shiftKey: false,
      isComposing: false,
    });
    Object.defineProperty(event, 'keyCode', { configurable: true, get: () => 13 });
    Object.defineProperty(event, 'which', { configurable: true, get: () => 13 });
    return event;
  };
  const elementVisibleArea = (element) => {
    if (!(element instanceof HTMLElement)) return 0;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return 0;
    const rect = element.getBoundingClientRect();
    const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    return width * height;
  };
  const readMessages = (root) => Array.from(root.querySelectorAll('.wfr-gowoori-chat__message, .wfr-gowoori-chat__user-message')).map((element) => ({
    role: element.classList.contains('is-assistant')
      ? 'assistant'
      : element.classList.contains('is-system')
        ? 'system'
        : element.classList.contains('is-user')
          ? 'user'
          : 'unknown',
    loading: element.classList.contains('is-loading'),
    text: element.innerText || element.textContent || '',
  }));
  const getVisibleRootDiagnostics = () => {
    const roots = Array.from(document.querySelectorAll('.wfr-gowoori-chat'));
    const scoredRoots = roots
      .map((root) => {
        const input = root.querySelector('.wfr-gowoori-chat__input-row textarea, textarea');
        return {
          root,
          input,
          rootArea: elementVisibleArea(root),
          inputArea: input ? elementVisibleArea(input) : 0,
        };
      })
      .sort((a, b) => (b.inputArea - a.inputArea) || (b.rootArea - a.rootArea));
    const visibleRoots = scoredRoots.filter((item) => item.input && item.rootArea > 0 && item.inputArea > 0);
    return {
      roots,
      scoredRoots,
      visibleRoots,
      rootCount: roots.length,
      inputCount: scoredRoots.filter((item) => item.input).length,
      visibleRootCount: visibleRoots.length,
    };
  };
  const selectRoot = () => {
    const diagnostics = getVisibleRootDiagnostics();
    return diagnostics.visibleRoots[0]?.root || null;
  };
  const clickModeButton = async (root, mode) => {
    if (!mode) return { selected: false };
    const labels = mode === 'advanced'
      ? ['Dev Advanced']
      : mode === 'simple'
        ? ['Dev Simple', 'Developer Mode']
        : ['User Mode'];
    const buttons = Array.from(root.querySelectorAll('button')).filter((button) => button instanceof HTMLButtonElement);
    const button = buttons.find((candidate) => {
      if (elementVisibleArea(candidate) <= 0 || candidate.disabled) return false;
      const text = (candidate.innerText || candidate.textContent || '').trim();
      return labels.some((label) => text.includes(label));
    });
    if (!button) return { selected: false, reason: 'mode button not visible' };
    const activeBefore = button.classList.contains('is-active');
    if (!activeBefore) {
      button.click();
      await sleep(250);
      await nextFrame();
    }
    return { selected: true, activeBefore, text: button.innerText || button.textContent || '' };
  };
  const selectProvider = async (root, provider) => {
    if (!provider) return { selected: false };
    const selects = Array.from(root.querySelectorAll('label select')).filter((select) => select instanceof HTMLSelectElement);
    const select = selects.find((candidate) => {
      const label = candidate.closest('label');
      const labelText = label ? (label.innerText || label.textContent || '') : '';
      return /Provider/i.test(labelText) && Array.from(candidate.options).some((option) => option.value === provider);
    }) || selects.find((candidate) => Array.from(candidate.options).some((option) => option.value === provider));
    if (!select) return { selected: false, reason: 'provider select not visible' };
    const before = select.value;
    if (before !== provider) {
      setNativeValue(select, provider);
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(300);
      await nextFrame();
    }
    return { selected: true, before, after: select.value };
  };
  const findSubmitButton = (root) => Array.from(root.querySelectorAll('.wfr-gowoori-chat__input-row button, button')).find((candidate) => {
    if (!(candidate instanceof HTMLButtonElement)) return false;
    if (candidate.disabled || elementVisibleArea(candidate) <= 0) return false;
    const text = (candidate.innerText || candidate.textContent || '').trim();
    return /^Send$/i.test(text);
  }) || null;
  const selectUserTargetIfNeeded = async (root) => {
    if (config.uiMode !== 'user') return { selected: false, reason: 'not user mode' };
    const startedAt = Date.now();
    const maxWaitMs = Math.min(5000, Number(config.timeoutMs || 45000));
    while (Date.now() - startedAt <= maxWaitMs) {
      const chooser = root.querySelector('.wfr-gowoori-chat__target-chooser');
      if (chooser && elementVisibleArea(chooser) > 0) {
        const buttons = Array.from(chooser.querySelectorAll('button')).filter((candidate) => (
          candidate instanceof HTMLButtonElement
          && !candidate.disabled
          && elementVisibleArea(candidate) > 0
        ));
        const button = buttons.find((candidate) => /Keep using/i.test(candidate.innerText || candidate.textContent || ''))
          || buttons.find((candidate) => /Always open new/i.test(candidate.innerText || candidate.textContent || ''))
          || buttons[0]
          || null;
        if (!button) return { selected: false, reason: 'target chooser has no enabled button' };
        const text = (button.innerText || button.textContent || '').trim();
        button.click();
        await sleep(350);
        await nextFrame();
        return { selected: true, text };
      }
      const text = root.innerText || root.textContent || '';
      if (/Cancel/.test(text) || readMessages(root).some((message) => message.loading)) {
        return { selected: false, reason: 'generation already started' };
      }
      await sleep(120);
    }
    return { selected: false, reason: 'target chooser not shown' };
  };
  const readLatestArtifactSource = () => {
    const snapshot = window.__xenesisDeskGowooriChatLatestArtifactSource;
    if (!snapshot || typeof snapshot.source !== 'string' || !snapshot.source.trim()) return null;
    return {
      id: String(snapshot.id || ''),
      text: String(snapshot.text || ''),
      source: snapshot.source,
      sourceLength: Number(snapshot.sourceLength || snapshot.source.length),
      updatedAt: Number(snapshot.updatedAt || 0),
    };
  };
  const waitForRenderedResponse = async (root, baselineMessages) => {
    const startedAt = Date.now();
    const deadline = startedAt + Number(config.timeoutMs || 45000);
    let lastMessages = readMessages(root);
    let lastText = root.innerText || root.textContent || '';
    let lastInputValue = '';
    while (Date.now() <= deadline) {
      const input = root.querySelector('.wfr-gowoori-chat__input-row textarea, textarea');
      lastInputValue = input?.value || '';
      lastMessages = readMessages(root);
      lastText = root.innerText || root.textContent || '';
      const newMessages = lastMessages.slice(baselineMessages.length);
      const loading = lastMessages.some((message) => message.loading) || /Cancel/.test(root.innerText || root.textContent || '');
      const hasNewAssistant = newMessages.some((message) => (
        (message.role === 'assistant' || message.role === 'system')
        && String(message.text || '').trim()
        && !message.loading
      ));
      const matchedExpectedText = config.expectedText ? lastText.includes(config.expectedText) : false;
      if (config.expectedText ? matchedExpectedText : (hasNewAssistant && !loading && !lastInputValue.trim())) {
        return {
          matched: true,
          matchedExpectedText,
          elapsedMs: Date.now() - startedAt,
          messages: lastMessages,
          bodyText: lastText,
          afterValue: lastInputValue,
        };
      }
      await sleep(120);
    }
    return {
      matched: false,
      matchedExpectedText: false,
      elapsedMs: Date.now() - startedAt,
      messages: lastMessages,
      bodyText: lastText,
      afterValue: lastInputValue,
    };
  };
  return (async () => {
    let root = selectRoot();
    if (!root) {
      const diagnostics = getVisibleRootDiagnostics();
      return {
        ok: false,
        submitted: false,
        error: 'Visible GowooriChat pane was not found. Open or focus GowooriChat before submitting.',
        rootCount: diagnostics.rootCount,
        inputCount: diagnostics.inputCount,
        visibleRootCount: diagnostics.visibleRootCount,
      };
    }
    const modeResult = await clickModeButton(root, config.uiMode);
    root = selectRoot() || root;
    const providerResult = await selectProvider(root, config.provider);
    root = selectRoot() || root;
    const input = root.querySelector('.wfr-gowoori-chat__input-row textarea, textarea');
    if (!(input instanceof HTMLTextAreaElement)) {
      return { ok: false, submitted: false, error: 'GowooriChat textarea was not found.', modeResult, providerResult };
    }
    const beforeValue = input.value;
    const baselineMessages = readMessages(root);
    const artifactBefore = readLatestArtifactSource();
    input.scrollIntoView({ block: 'center', inline: 'nearest' });
    input.focus();
    if (input.value) {
      setNativeValue(input, '');
      dispatchInput(input, null, 'deleteContentBackward');
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await nextFrame();
    }
    for (const char of config.prompt) {
      setNativeValue(input, input.value + char);
      dispatchInput(input, char, 'insertText');
      if (Number(config.typeDelayMs || 0) > 0) await sleep(Number(config.typeDelayMs));
    }
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await nextFrame();
    await sleep(80);
    const valueAfterTyping = input.value;
    let enterPrevented = false;
    let submitButtonClicked = false;
    if (config.submitMode === 'enter' || config.submitMode === 'both') {
      enterPrevented = !input.dispatchEvent(makeKeyboardEvent());
      await sleep(250);
      await nextFrame();
    }
    if ((config.submitMode === 'button' || config.submitMode === 'both') && input.value.trim()) {
      const submitButton = findSubmitButton(root);
      if (submitButton) {
        submitButton.click();
        submitButtonClicked = true;
        await sleep(250);
        await nextFrame();
      }
    }
    const userTargetResult = await selectUserTargetIfNeeded(root);
    const waitResult = await waitForRenderedResponse(root, baselineMessages);
    const artifactAfter = readLatestArtifactSource();
    const artifactSource = artifactAfter?.source || '';
    const promptVisible = waitResult.bodyText.includes(config.prompt.trim());
    const newMessages = waitResult.messages.slice(baselineMessages.length);
    const submitted = promptVisible || !String(waitResult.afterValue || '').trim() || newMessages.some((message) => message.role === 'user');
    return {
      ok: submitted && waitResult.matched,
      submitted,
      beforeValue,
      valueAfterTyping,
      afterValue: waitResult.afterValue,
      enterPrevented,
      submitButtonClicked,
      modeResult,
      providerResult,
      userTargetResult,
      matchedExpectedText: waitResult.matchedExpectedText,
      expectedText: config.expectedText,
      promptVisible,
      messageCountBefore: baselineMessages.length,
      messageCountAfter: waitResult.messages.length,
      newMessageCount: newMessages.length,
      newAssistantCount: newMessages.filter((message) => message.role === 'assistant').length,
      elapsedMs: waitResult.elapsedMs,
      artifactSource,
      artifactSourceLength: artifactSource.length,
      artifactSourceChanged: Boolean(artifactSource && artifactSource !== (artifactBefore?.source || '')),
      artifactLabel: artifactAfter?.text || '',
      bodyTextPreview: waitResult.bodyText.slice(0, 1200),
      bodyTextTail: waitResult.bodyText.slice(-2000),
    };
  })().catch((error) => ({ ok: false, submitted: false, error: error instanceof Error ? error.message : String(error) }));
})()
`;

  try {
    const result = (await targetWindow.webContents.executeJavaScript(script, true)) as Record<string, unknown>;
    return { ...result, windowId: targetWindow.id };
  } catch (error) {
    return {
      ok: false,
      submitted: false,
      windowId: targetWindow.id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function createMcpBridgeCapabilityAdapter(): DeskBridgeCapabilityAdapter {
  const appControlService = createAppControlService({
    getSettings: () => loadSettings().externalApps,
  });

  return {
    status: () => buildMcpBridgeStateSnapshot(),
    recordAudit: (record) => {
      capabilityAuditLogger.log(record);
      return { ok: true };
    },
    listAudit: (args: unknown) => ({ ok: true, records: capabilityAuditLogger.query(normalizeAuditQueryArgs(args)) }),
    queryAudit: (args: unknown) => ({ ok: true, records: capabilityAuditLogger.query(normalizeAuditQueryArgs(args)) }),
    exportAudit: () => ({ ok: true, records: capabilityAuditLogger.exportAll() }),
    clearAudit: () => {
      capabilityAuditLogger.clear();
      return { ok: true, records: [] };
    },
    acquireControl: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const agentId = readCapabilityString(body, ['agentId', 'agent', 'id', 'source'], 'agent');
      const source = readCapabilityString(body, ['source'], 'capability');
      return agentControlLockManager.acquire(agentId, source);
    },
    releaseControl: (args: unknown) => {
      const lockId = readCapabilityString(normalizeMcpCapabilityArgs(args), ['lockId', 'id']);
      if (!lockId) return { ok: false, error: 'lockId is required' };
      return agentControlLockManager.release(lockId);
    },
    forceReleaseControl: () => agentControlLockManager.forceRelease(),
    getControlStatus: () => agentControlLockManager.status(),
    openXenesisTui: (args: unknown) => ({
      ok: true,
      ...createMcpTerminalSession(
        buildXenesisTuiTerminalRequest({
          args,
          runtimePath: resolveConfiguredXenesisRuntime(),
          execPath: process.execPath,
          env: process.env,
          existsSync: fs.existsSync,
        }),
      ),
    }),
    loadMetaTree: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.tree.load', args),
    searchMetaTree: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.tree.search', args),
    listMetaCodes: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.codes.list', args),
    createMetaCode: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.codes.create', args),
    updateMetaCode: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.codes.update', args),
    batchMetaCodes: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.codes.batch', args),
    listMetaAttributes: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.attributes.list', args),
    getMetaAttributeSchema: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.attributes.schema', args),
    listMetaInstances: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.instances.list', args),
    metaInstancesToFixture: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.instances.toFixture', args),
    runMetaQuery: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.query.run', args),
    exportMetaSnapshot: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.snapshot.export', args),
    importMetaSnapshot: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.snapshot.import', args),
    getMetaRelationsGraph: (args: unknown) => dispatchMetaBridgeCapability('xd.meta.relations.graph', args),
    appMenuRole: executeAppMenuRoleForCapability,
    openFile: openMcpFileCapability,
    openBrowser: openMcpBrowserCapability,
    browserAction: (args: unknown) => sendMcpBrowserActionToRenderer(sanitizeMcpBrowserActionRequest(args)),
    openBuiltinPane: openMcpBuiltinPaneCapability,
    runExternalAppAction: (args: unknown) => appControlService.run(args),
    getOnboardingSampleWorkspaceStatus: () => getOnboardingSampleWorkspaceStatus(),
    prepareOnboardingSampleWorkspace: () => prepareOnboardingSampleWorkspaceAndBroadcast(),
    resetOnboardingSampleWorkspace: () => resetOnboardingSampleWorkspaceAndBroadcast(),
    listOnboardingRunArtifacts: () => listOnboardingRunArtifacts(),
    openOnboardingRunArtifact: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const runId = sanitizeMcpDockActionText(body.runId, 240) || undefined;
      const targetPath = await getOnboardingRunArtifactPath(runId);
      const error = await shell.openPath(targetPath);
      return { ok: !error, path: targetPath, error: error || undefined };
    },
    clearOnboardingRunArtifacts: () => clearOnboardingRunArtifacts(),
    onboardingStepAction: (args: unknown) =>
      sendMcpOnboardingStepActionToRenderer(sanitizeMcpOnboardingStepActionRequest(normalizeMcpCapabilityArgs(args))),
    onboardingScenarioRun: (args: unknown) =>
      sendMcpOnboardingScenarioRunToRenderer(sanitizeMcpOnboardingScenarioRunRequest(normalizeMcpCapabilityArgs(args))),
    previewOnboardingRunArtifact: (args: unknown) =>
      sendMcpOnboardingRunPreviewToRenderer(sanitizeMcpOnboardingRunPreviewRequest(normalizeMcpCapabilityArgs(args))),
    onboardingDemoModeRun: (args: unknown) =>
      sendMcpOnboardingDemoModeRunToRenderer(sanitizeMcpOnboardingDemoModeRunRequest(normalizeMcpCapabilityArgs(args))),
    saveOnboardingDemoRoute: (args: unknown) =>
      saveOnboardingDemoRoute(normalizeMcpCapabilityArgs(args) as unknown as OnboardingDemoRouteSaveRequest),
    demoLabPlaybackControl: (args: unknown) =>
      sendMcpDemoLabPlaybackControlToRenderer(
        sanitizeMcpDemoLabPlaybackControlRequest(normalizeMcpCapabilityArgs(args)),
      ),
    previewTextWrite: (args: unknown) =>
      previewSafeTextFileWrite(normalizeMcpCapabilityArgs(args) as unknown as SafeFilePreviewRequest),
    applyTextWrite: (args: unknown) =>
      applySafeTextFileWrite(normalizeMcpCapabilityArgs(args) as unknown as SafeFileApplyRequest),
    restoreTextBackup: (args: unknown) =>
      restoreSafeTextFileBackup(normalizeMcpCapabilityArgs(args) as unknown as SafeFileRestoreRequest),
    dockAction: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const action = sanitizeMcpDockAction(body.action);
      const target = sanitizeMcpDockActionTarget(body);
      const actionAllowsMissingTarget =
        action === 'readArtifactTarget' ||
        action === 'setArtifactTarget' ||
        action === 'readSizes' ||
        action === 'setSizes' ||
        action === 'arrangeWindow' ||
        action === 'mergeWindow' ||
        action === 'mergeAll';
      const actionUsesActiveTarget = target.useActive === true;
      if (!actionAllowsMissingTarget && !actionUsesActiveTarget && !target.contentId && !target.paneId) {
        return { ok: false, error: 'contentId or paneId is required' };
      }
      return sendMcpDockActionToRenderer(action, {
        ...target,
        mode: sanitizeMcpDockArrangeMode(body.mode),
      });
    },
    explorerAction: async (args: unknown) => {
      const request = sanitizeMcpExplorerActionRequest(normalizeMcpCapabilityArgs(args));
      if (request.action === 'navigate' && !request.path) {
        return { ok: false, error: 'path is required' };
      }
      return sendMcpExplorerActionToRenderer(request);
    },
    remoteExplorerAction: async (args: unknown) => {
      const request = sanitizeMcpRemoteExplorerActionRequest(normalizeMcpCapabilityArgs(args));
      if (request.action === 'navigate') {
        if (!request.profileId) return { ok: false, error: 'profileId is required' };
        if (!request.path) return { ok: false, error: 'path is required' };
      }
      return sendMcpRemoteExplorerActionToRenderer(request);
    },
    terminalUiAction: async (args: unknown) => {
      const request = sanitizeMcpTerminalUiActionRequest(normalizeMcpCapabilityArgs(args));
      if ((request.action === 'findNext' || request.action === 'findPrev') && !request.query) {
        return { ok: false, error: 'query is required' };
      }
      if (request.action === 'setFitLock' && typeof request.locked !== 'boolean') {
        return { ok: false, error: 'locked is required' };
      }
      return sendMcpTerminalUiActionToRenderer(request);
    },
    favoritesAction: async (args: unknown) => {
      const request = sanitizeMcpFavoritesActionRequest(normalizeMcpCapabilityArgs(args));
      if ((request.action === 'remove' || request.action === 'open') && !request.id) {
        return { ok: false, error: 'id is required' };
      }
      if (
        (request.action === 'add' || request.action === 'openInTerminal' || request.action === 'copyPath') &&
        !request.path
      ) {
        return { ok: false, error: 'path is required' };
      }
      if (request.action === 'add' && !request.kind) {
        return { ok: false, error: 'kind is required' };
      }
      if (request.action === 'openInTerminal' && !request.shell) {
        return { ok: false, error: 'shell is required' };
      }
      if (request.action === 'showTab' && !request.tab) {
        return { ok: false, error: 'tab is required' };
      }
      return sendMcpFavoritesActionToRenderer(request);
    },
    readSettings: () => ({ ok: true, settings: protectSettingsSecrets(loadSettings()) }),
    saveSettings: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const rawSettings =
        body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings) ? body.settings : body;
      await saveApplicationSettings(rawSettings as Partial<AppSettings>);
      return { ok: true, settings: protectSettingsSecrets(loadSettings()) };
    },
    exportSettings: () => exportSettingsToDialog().then((result) => ({ ok: Boolean(result.saved), ...result })),
    importSettings: () => importSettingsFromDialog().then((result) => ({ ok: Boolean(result.imported), ...result })),
    listSettingsBackups: () => listSettingsBackups().then((backups) => ({ ok: true, backups })),
    restoreSettingsBackup: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const filePath = typeof body.filePath === 'string' ? body.filePath.trim() : '';
      if (!filePath) return { ok: false, error: 'filePath is required' };
      return restoreSettingsBackup(filePath).then((result) => ({ ok: Boolean(result.imported), ...result }));
    },
    getSecretVaultStatus: () => ({ ok: true, status: getSecretVaultStatus() }),
    clearSecretVault: () => ({ ok: true, status: clearSecretVault() }),
    listProcesses: () => listLocalProcesses().then((processes) => ({ ok: true, processes })),
    killProcess: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const pid = Number(body.pid);
      if (!Number.isInteger(pid) || pid <= 0) return { ok: false, error: 'pid is required' };
      const result = await killLocalProcess(pid, body.force === true);
      return result;
    },
    saveWorkspaceAs: async (args: unknown) => saveWorkspaceProfileFromCapability(args),
    openWorkspace: () => openWorkspaceFromDialogForCapability(),
    readWorkspace: async (args: unknown) => {
      const filePath = readCapabilityString(normalizeMcpCapabilityArgs(args), ['filePath', 'path']);
      if (!filePath) return { ok: false, error: 'filePath is required' };
      const workspace = await readWorkspaceProfile(path.resolve(filePath));
      return { ok: true, ...workspace };
    },
    clearRecentWorkspaces: () => clearRecentWorkspacesForCapability(),
    getWindowBounds: () => {
      const win = mainWindowRef && !mainWindowRef.isDestroyed() ? mainWindowRef : BrowserWindow.getFocusedWindow();
      return { ok: Boolean(win), bounds: win && !win.isDestroyed() ? win.getBounds() : null };
    },
    applyWindowSizerPreset: (args: unknown) => {
      const win = mainWindowRef && !mainWindowRef.isDestroyed() ? mainWindowRef : BrowserWindow.getFocusedWindow();
      if (!win || win.isDestroyed()) return { ok: false, error: 'Window is not available.' };
      const body = normalizeMcpCapabilityArgs(args);
      const normalizedPreset = resolveWindowSizerPresetInput(body);
      const nextBounds = buildWindowSizerBounds(win, normalizedPreset);
      win.setBounds(nextBounds, true);
      win.focus();
      return { ok: true, applied: true, bounds: win.getBounds() };
    },
    detachWindowTab: (args: unknown) => {
      const payload = normalizeMcpCapabilityArgs(args) as unknown as DetachPayload;
      if (!payload || !payload.id) return { ok: false, error: 'detach payload id is required' };
      const win = createDetachedWindow(payload.title || 'Xenesis Desk');
      detachPayloads.set(win.id, payload);
      return { ok: true, windowId: win.id };
    },
    getWindowDetachPayload: () => {
      const win = BrowserWindow.getFocusedWindow();
      if (!win || win.isDestroyed()) return { ok: false, payload: null };
      const payload = detachPayloads.get(win.id) ?? null;
      detachPayloads.delete(win.id);
      return { ok: Boolean(payload), payload };
    },
    startWindowReattach: () => {
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('reattach:show-target');
        return { ok: true };
      }
      return { ok: false, error: 'Main window is not available.' };
    },
    cancelWindowReattach: () => {
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('reattach:hide-target');
        return { ok: true };
      }
      return { ok: false, error: 'Main window is not available.' };
    },
    dropWindowReattach: (args: unknown) => {
      const payload = normalizeMcpCapabilityArgs(args) as unknown as DetachPayload;
      if (!payload || !payload.id) return { ok: false, error: 'detach payload id is required' };
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('reattach:content', payload);
        mainWindowRef.focus();
        return { ok: true };
      }
      return { ok: false, error: 'Main window is not available.' };
    },
    getSiblingWindowBounds: () => {
      const focusedWindowId = BrowserWindow.getFocusedWindow()?.id;
      const mainBounds = mainWindowRef && !mainWindowRef.isDestroyed() ? { bounds: mainWindowRef.getBounds() } : null;
      const detached = Array.from(detachedWindows.entries())
        .filter(([id, win]) => id !== focusedWindowId && !win.isDestroyed())
        .map(([windowId, win]) => ({ windowId, bounds: win.getBounds() }));
      return { ok: true, mainWindow: mainBounds, detachedWindows: detached };
    },
    mergeTabToDetachedWindow: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const payload = (body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
        ? body.payload
        : body) as unknown as DetachPayload;
      const targetWindowId = Number(body.targetWindowId ?? body.windowId);
      if (!payload || !payload.id) return { ok: false, error: 'detach payload id is required' };
      if (!Number.isInteger(targetWindowId)) return { ok: false, error: 'targetWindowId is required' };
      const targetWin = detachedWindows.get(targetWindowId);
      if (!targetWin || targetWin.isDestroyed())
        return { ok: false, error: 'Target detached window is not available.' };
      targetWin.webContents.send('merge:receive-tab', payload);
      targetWin.focus();
      return { ok: true };
    },
    highlightDetachedWindow: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const targetWindowId = Number(body.targetWindowId ?? body.windowId);
      if (!Number.isInteger(targetWindowId)) return { ok: false, error: 'targetWindowId is required' };
      const targetWin = detachedWindows.get(targetWindowId);
      if (!targetWin || targetWin.isDestroyed())
        return { ok: false, error: 'Target detached window is not available.' };
      targetWin.webContents.send(body.show === false ? 'merge:hide-target' : 'merge:show-target');
      return { ok: true };
    },
    closeSelfWindow: () => {
      const win = BrowserWindow.getFocusedWindow();
      if (win && !win.isDestroyed() && win !== mainWindowRef) {
        win.close();
        return { ok: true };
      }
      return { ok: false, error: 'Focused detached window is not available.' };
    },
    openLocalFileDialog: () => openLocalFileDialogForCapability(),
    readLocalFile: (args: unknown) => {
      const filePath = readCapabilityString(normalizeMcpCapabilityArgs(args), ['filePath', 'path']);
      if (!filePath) return { ok: false, error: 'filePath is required' };
      return readFileToResult(filePath).then((file) => ({ ok: Boolean(file), file }));
    },
    saveLocalTextFile: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const filePath = readCapabilityString(body, ['filePath', 'path']);
      if (!filePath) return { ok: false, saved: false, error: 'filePath is required' };
      try {
        await fs.promises.writeFile(filePath, typeof body.content === 'string' ? body.content : '', 'utf8');
        return { ok: true, saved: true };
      } catch (error) {
        return { ok: false, saved: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
    saveLocalTextFileAs: async (args: unknown) => saveLocalTextFileAsForCapability(args),
    revealLocalPath: (args: unknown) => {
      const targetPath = readCapabilityString(normalizeMcpCapabilityArgs(args), ['path', 'filePath']);
      if (!targetPath) return { ok: false, error: 'path is required' };
      shell.showItemInFolder(targetPath);
      return { ok: true, path: targetPath };
    },
    openExternalUrl: async (args: unknown) => {
      const url = readCapabilityString(normalizeMcpCapabilityArgs(args), ['url', 'href']);
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:'))) {
        return { ok: false, error: 'url must be http, https, or mailto' };
      }
      await shell.openExternal(url).catch(() => undefined);
      return { ok: true, url };
    },
    listFsDir: async (args: unknown) => listFsDirForCapability(args),
    selectFsDir: () => {
      if (fsSelectDirDialogPromise)
        return fsSelectDirDialogPromise.then((dirPath) => ({ ok: Boolean(dirPath), dirPath }));
      fsSelectDirDialogPromise = (async () => {
        const result = await dialog.showOpenDialog({
          title: '탐색기 폴더 선택',
          properties: ['openDirectory', 'createDirectory'],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
      })();
      return fsSelectDirDialogPromise
        .then((dirPath) => ({ ok: Boolean(dirPath), dirPath }))
        .finally(() => {
          fsSelectDirDialogPromise = null;
        });
    },
    readFsFileBase64: async (args: unknown) => readFsFileBase64ForCapability(args),
    writeFsFileBase64: async (args: unknown) => writeFsFileBase64ForCapability(args),
    testRemoteFileProfile: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      return remoteFileTest(readCapabilityProfile(body));
    },
    listRemoteFiles: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const remotePath = readCapabilityString(body, ['remotePath', 'path'], '/');
      return remoteFileList(readCapabilityProfile(body), remotePath).then((entries) => ({ ok: true, entries }));
    },
    readRemoteFile: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const remotePath = readCapabilityString(body, ['remotePath', 'path'], '/');
      return remoteFileRead(readCapabilityProfile(body), remotePath).then((file) => ({ ok: Boolean(file), file }));
    },
    readRemoteFileBase64: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const remotePath = readCapabilityString(body, ['remotePath', 'path'], '/');
      return remoteFileReadBase64(readCapabilityProfile(body), remotePath).then((file) => ({
        ok: Boolean(file),
        file,
      }));
    },
    writeRemoteFile: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const request =
        body.request && typeof body.request === 'object' && !Array.isArray(body.request)
          ? (body.request as RemoteFileWriteRequest)
          : (body as unknown as RemoteFileWriteRequest);
      return remoteFileWrite(request);
    },
    makeRemoteDirectory: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const remotePath = readCapabilityString(body, ['remotePath', 'path'], '/');
      return remoteFileMkdir(readCapabilityProfile(body), remotePath);
    },
    deleteRemoteFile: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const remotePath = readCapabilityString(body, ['remotePath', 'path'], '/');
      return remoteFileDelete(readCapabilityProfile(body), remotePath, body.isDirectory === true);
    },
    renameRemoteFile: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const fromPath = readCapabilityString(body, ['fromPath', 'remotePath'], '/');
      const toPath = readCapabilityString(body, ['toPath', 'newPath'], '/');
      return remoteFileRename(readCapabilityProfile(body), fromPath, toPath);
    },
    enqueueTransfer: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const request =
        body.request && typeof body.request === 'object' && !Array.isArray(body.request)
          ? (body.request as TransferQueueEnqueueRequest)
          : (body as unknown as TransferQueueEnqueueRequest);
      return { ok: true, item: enqueueTransfer(request), transfers: snapshotTransferQueue() };
    },
    listTransfers: () => ({ ok: true, transfers: snapshotTransferQueue() }),
    retryTransfer: (args: unknown) => {
      const id = readCapabilityString(normalizeMcpCapabilityArgs(args), ['id']);
      if (!id) return { ok: false, error: 'id is required' };
      const item = retryTransfer(id);
      return { ok: Boolean(item), item, transfers: snapshotTransferQueue() };
    },
    cancelTransfer: (args: unknown) => {
      const id = readCapabilityString(normalizeMcpCapabilityArgs(args), ['id']);
      if (!id) return { ok: false, error: 'id is required' };
      const item = cancelTransfer(id);
      return { ok: Boolean(item), item, transfers: snapshotTransferQueue() };
    },
    clearCompletedTransfers: () => ({ ok: true, transfers: clearCompletedTransfers() }),
    clearAllTransfers: () => ({ ok: true, transfers: clearAllTransfers() }),
    startCaptureOverlay: async () => startCaptureOverlay(),
    cancelCaptureOverlay: () => {
      for (const win of captureWindows) {
        if (!win.isDestroyed()) win.close();
      }
      captureWindows = [];
      mainWindowRef?.webContents.send('capture:ready');
      return { ok: true };
    },
    startCaptureFileDrag: (args: unknown) => {
      const filePath = readCapabilityString(normalizeMcpCapabilityArgs(args), ['filePath', 'path']);
      if (!filePath) return { ok: false, error: 'filePath is required' };
      return {
        ok: fs.existsSync(filePath),
        filePath,
        dragRequiresRendererEvent: true,
        error: fs.existsSync(filePath) ? undefined : 'filePath does not exist',
      };
    },
    capturePane: async (args: unknown) => capturePaneForCapability(args),
    saveCaptureDataUrl: async (args: unknown) => saveCaptureDataUrlForCapability(args),
    listCaptures: () => listCapturesForCapability(),
    getCaptureThumbnail: (args: unknown) => getCaptureThumbnailForCapability(args),
    deleteCapture: (args: unknown) => deleteCaptureForCapability(args),
    deleteAllCaptures: () => deleteAllCapturesForCapability(),
    getAutomationStatus: (args: unknown) => {
      const termId = readCapabilityString(normalizeMcpCapabilityArgs(args), ['termId', 'id']);
      if (!termId) return { ok: false, error: 'termId is required' };
      return { ok: true, status: automationControllers.get(termId)?.getStatus() ?? null };
    },
    getAutomationEvents: (args: unknown) => {
      const termId = readCapabilityString(normalizeMcpCapabilityArgs(args), ['termId', 'id']);
      if (!termId) return { ok: false, error: 'termId is required' };
      return { ok: true, events: automationControllers.get(termId)?.getEvents() ?? [] };
    },
    clearAutomationEvents: (args: unknown) => {
      const termId = readCapabilityString(normalizeMcpCapabilityArgs(args), ['termId', 'id']);
      if (!termId) return { ok: false, error: 'termId is required' };
      automationControllers.get(termId)?.clearEvents();
      return { ok: true, events: automationControllers.get(termId)?.getEvents() ?? [] };
    },
    setAutomationEnabled: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const termId = readCapabilityString(body, ['termId', 'id']);
      if (!termId) return { ok: false, error: 'termId is required' };
      automationControllers.get(termId)?.setEnabled(body.enabled === true);
      return { ok: true, status: automationControllers.get(termId)?.getStatus() ?? null };
    },
    setAutomationStage: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const termId = readCapabilityString(body, ['termId', 'id']);
      if (!termId) return { ok: false, error: 'termId is required' };
      const stage = [1, 2, 3].includes(Number(body.stage)) ? (Number(body.stage) as AutomationStage) : 1;
      automationControllers.get(termId)?.setStage(stage);
      return { ok: true, status: automationControllers.get(termId)?.getStatus() ?? null };
    },
    setAutomationStreamFilterProfile: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const termId = readCapabilityString(body, ['termId', 'id']);
      if (!termId) return { ok: false, error: 'termId is required' };
      const rawProfile = readCapabilityString(body, ['profile', 'streamFilterProfile'], 'default');
      const profile = rawProfile === 'default' ? undefined : normalizeAutomationStreamFilterProfile(rawProfile);
      automationControllers.get(termId)?.setStreamFilterProfile(profile);
      return {
        ok: true,
        profile: profile ?? 'default',
        status: automationControllers.get(termId)?.getStatus() ?? null,
      };
    },
    reloadAutomationSettings: () => {
      const automationSettings = getAutomationSettings();
      const fallbackKey = getFallbackLlmKey();
      for (const ctrl of automationControllers.values()) {
        ctrl.updateSettings(automationSettings, fallbackKey);
      }
      return { ok: true, controllers: automationControllers.size };
    },
    sendAutomationManualInput: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const termId = readCapabilityString(body, ['termId', 'id']);
      const input = readCapabilityRawString(body, ['input', 'text']);
      if (!termId) return { ok: false, error: 'termId is required' };
      if (!input) return { ok: false, error: 'input is required' };
      automationControllers.get(termId)?.manualSend(input, readCapabilityString(body, ['pendingEventId']));
      return { ok: true, status: automationControllers.get(termId)?.getStatus() ?? null };
    },
    listWorkflowRunHistory: (args: unknown) =>
      listWorkflowRunHistory(normalizeMcpCapabilityArgs(args) as unknown as WorkflowRunHistoryListRequest).then(
        (records) => ({ ok: true, records }),
      ),
    saveWorkflowRunHistory: (args: unknown) =>
      saveWorkflowRunHistoryRecord(normalizeMcpCapabilityArgs(args) as unknown as WorkflowRunHistoryRecord),
    deleteWorkflowRunHistory: (args: unknown) => {
      const id = readCapabilityString(normalizeMcpCapabilityArgs(args), ['id']);
      if (!id) return { ok: false, error: 'id is required' };
      return deleteWorkflowRunHistoryRecord(id).then((records) => ({ ok: true, records }));
    },
    clearWorkflowRunHistory: () => clearWorkflowRunHistory().then((records) => ({ ok: true, records })),
    listWorkflowTemplates: () => listWorkflowTemplates().then((templates) => ({ ok: true, templates })),
    saveWorkflowTemplate: (args: unknown) =>
      saveWorkflowTemplateRecord(normalizeMcpCapabilityArgs(args) as unknown as WorkflowTemplateRecord),
    favoriteWorkflowTemplate: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const id = readCapabilityString(body, ['id']);
      if (!id) return { ok: false, error: 'id is required' };
      return updateWorkflowTemplate(id, { favorite: body.favorite === true }).then((templates) => ({
        ok: true,
        templates,
      }));
    },
    touchWorkflowTemplate: (args: unknown) => {
      const id = readCapabilityString(normalizeMcpCapabilityArgs(args), ['id']);
      if (!id) return { ok: false, error: 'id is required' };
      return updateWorkflowTemplate(id, { lastUsedAt: new Date().toISOString() }).then((templates) => ({
        ok: true,
        templates,
      }));
    },
    removeWorkflowTemplate: (args: unknown) => {
      const id = readCapabilityString(normalizeMcpCapabilityArgs(args), ['id']);
      if (!id) return { ok: false, error: 'id is required' };
      return removeWorkflowTemplate(id).then((templates) => ({ ok: true, templates }));
    },
    workflowPlaywrightSnapshot: (args: unknown) =>
      runPlaywrightWorker('snapshot', normalizeMcpCapabilityArgs(args) as unknown as WorkflowPlaywrightSnapshotRequest),
    workflowPlaywrightRun: (args: unknown) =>
      runPlaywrightWorker('run', normalizeMcpCapabilityArgs(args) as unknown as WorkflowPlaywrightRunRequest),
    getMcpSettingsStatus: () => ({ ok: true, status: getMcpSettingsStatus() }),
    getMcpBridgeStatus: () => ({ ok: true, status: buildMcpBridgeStatusSnapshot() }),
    getCrSmokeLatest: (args: unknown) => readCrSmokeLatestSnapshot(args),
    listMcpActionInbox: () => ({ ok: true, items: listMcpActionInboxSnapshot() }),
    requestMcpActionInbox: (args: unknown) => {
      const item = recordMcpActionInboxRequest(normalizeMcpCapabilityArgs(args));
      recordDiagnosticLog({
        level: 'info',
        source: 'main',
        scope: 'mcp',
        message: `MCP action inbox request: ${item.title}`,
        detail: JSON.stringify({ id: item.id, sessionId: item.sessionId, kind: item.kind }),
      });
      return { ok: true, item };
    },
    resolveMcpActionInbox: (args: unknown) =>
      resolveMcpActionInboxRequest(normalizeMcpCapabilityArgs(args) as unknown as McpBridgeActionInboxResolveRequest),
    listMcpBotSessions: () => ({ ok: true, sessions: listMcpBotSessionsSnapshot() }),
    saveMcpBotSession: (args: unknown) =>
      saveMcpBotSessionSnapshot(normalizeMcpCapabilityArgs(args) as unknown as McpBridgeBotSession),
    getUpdaterStatus: () => ({ ok: true, status: updaterStatus }),
    checkForUpdates: async () => {
      configureAutoUpdaterFeed();
      if (!app.isPackaged) {
        recordUpdaterDiagnostic('info', 'Update check skipped in development mode');
        broadcastUpdaterStatus({
          state: 'not-available',
          info: { version: app.getVersion(), releaseNotes: '개발 모드에서는 업데이트를 확인할 수 없습니다.' },
        });
        return { ok: true, skipped: true, status: updaterStatus };
      }
      await autoUpdater.checkForUpdates().catch((err) => {
        recordUpdaterDiagnostic('error', 'Update check failed', String(err?.message ?? err));
        broadcastUpdaterStatus({ state: 'error', message: String(err?.message ?? err) });
      });
      return { ok: updaterStatus.state !== 'error', status: updaterStatus };
    },
    downloadUpdate: async () => {
      if (!app.isPackaged) {
        return { ok: true, skipped: true, status: updaterStatus };
      }
      configureAutoUpdaterFeed();
      recordUpdaterDiagnostic('info', 'Update download requested');
      await autoUpdater.downloadUpdate().catch((err) => {
        recordUpdaterDiagnostic('error', 'Update download failed', String(err?.message ?? err));
        broadcastUpdaterStatus({ state: 'error', message: String(err?.message ?? err) });
      });
      return { ok: updaterStatus.state !== 'error', status: updaterStatus };
    },
    installUpdate: () => {
      if (!app.isPackaged) {
        return { ok: true, skipped: true, status: updaterStatus };
      }
      recordUpdaterDiagnostic('info', 'Update install requested');
      autoUpdater.quitAndInstall(true, true);
      return { ok: true, status: updaterStatus };
    },
    getInternalServerStatus: () => getInternalServerStatus().then((status) => ({ ok: true, status })),
    startInternalServer: () => startInternalServer().then((status) => ({ ok: true, status })),
    stopInternalServer: () => stopInternalServer().then((status) => ({ ok: true, status })),
    getXamongCodeStatus: () => getXamongCodeServerStatus().then((status) => ({ ok: true, status })),
    startXamongCode: () => startXamongCodeServer().then((status) => ({ ok: true, status })),
    stopXamongCode: () => stopXamongCodeServer().then((status) => ({ ok: true, status })),
    isXenisPhase5Enabled: () => isXenisPhase5Enabled(),
    getXenesisStatus: () =>
      getXenesisStatusPayload().then((status) => ({ ok: true, status: redactXenesisStatusForCapability(status) })),
    getXenesisConnectionsStatus: () => getXenesisConnectionsStatus().then((status) => ({ ok: true, status })),
    getXenesisDiagnostics: () => getXenesisOperationalDiagnostics().then((diagnostics) => ({ ok: true, diagnostics })),
    listXenesisReports: (args: unknown) =>
      listXenesisReports(
        args === undefined ? undefined : (normalizeMcpCapabilityArgs(args) as XenesisReportQuery),
      ).then((reports) => ({ ok: true, ...reports })),
    listXenesisTasks: (args: unknown) =>
      listXenesisAgentTasks(
        args === undefined ? undefined : (normalizeMcpCapabilityArgs(args) as XenesisTaskQuery),
      ).then((tasks) => ({ ok: true, ...tasks })),
    listXenesisProfiles: () =>
      getXenesisProfileState().then((profile) => ({
        ok: true,
        profile: redactXenesisProfileStateForCapability(profile),
      })),
    installXenesisProfile: (args: unknown) =>
      installXenesisProfile(normalizeMcpCapabilityArgs(args) as unknown as XenesisProfileInstallRequest).then(
        (profile) => ({ ok: true, profile: redactXenesisProfileStateForCapability(profile) }),
      ),
    useXenesisProfile: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const name = readCapabilityString(body, ['name', 'profile']);
      return useXenesisProfile(name).then((profile) => ({
        ok: true,
        profile: redactXenesisProfileStateForCapability(profile),
      }));
    },
    updateXenesisProfileChannels: (args: unknown) =>
      updateXenesisProfileChannels(
        normalizeMcpCapabilityArgs(args) as unknown as XenesisProfileChannelsUpdateRequest,
      ).then((profile) => ({ ok: true, profile: redactXenesisProfileStateForCapability(profile) })),
    testXenesisProfileChannel: (args: unknown) =>
      testXenesisProfileChannel(normalizeMcpCapabilityArgs(args) as unknown as XenesisProfileChannelTestRequest).then(
        (result) => ({ ok: true, result }),
      ),
    setXenesisWorkspace: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const workspacePath =
        typeof body.path === 'string' ? body.path : typeof body.workspacePath === 'string' ? body.workspacePath : body;
      return setXenesisActiveWorkspace(workspacePath).then((status) => ({
        ok: true,
        status: redactXenesisStatusForCapability(status),
      }));
    },
    startXenesis: () =>
      startXenesisRuntime().then((status) => ({ ok: true, status: redactXenesisStatusForCapability(status) })),
    stopXenesis: () =>
      stopXenesisRuntime().then((status) => ({ ok: true, status: redactXenesisStatusForCapability(status) })),
    restartXenesis: () =>
      restartXenesisRuntime().then((status) => ({ ok: true, status: redactXenesisStatusForCapability(status) })),
    startXenesisGateway: () =>
      startXenesisGatewayRuntime().then((status) => ({ ok: true, status: redactXenesisStatusForCapability(status) })),
    stopXenesisGateway: () =>
      stopXenesisGatewayRuntime().then((status) => ({ ok: true, status: redactXenesisStatusForCapability(status) })),
    restartXenesisGateway: async () => {
      await stopXenesisGatewayRuntime();
      const status = await startXenesisGatewayRuntime();
      return { ok: true, status: redactXenesisStatusForCapability(status) };
    },
    openXenesisGatewayDashboard: () =>
      openXenesisGatewayDashboard().then((status) => ({ ok: true, status: redactXenesisStatusForCapability(status) })),
    cancelXenesis: () =>
      cancelXenesisRuntime().then((status) => ({ ok: true, status: redactXenesisStatusForCapability(status) })),
    resetXenesisSession: () =>
      resetXenesisSession().then((status) => ({ ok: true, status: redactXenesisStatusForCapability(status) })),
    runXenesis: async (args: unknown) => {
      return runXenesisRequest(args as XenesisRunRequest);
    },
    listXenesisAgents: listXenesisAgentsForCapability,
    getXenesisAgentStatus: getXenesisAgentStatusForCapability,
    submitXenesisAgentMessage: submitXenesisAgentMessageForCapability,
    listXenesisAgentEvents: listXenesisAgentEventsForCapability,
    snapshotXenesisAgent: snapshotXenesisAgentForCapability,
    submitXenesisAgentPrompt: submitXenesisAgentPromptForCapability,
    dropXenesisAgentAttachments: dropXenesisAgentAttachmentsForCapability,
    submitGowooriChatPrompt: submitGowooriChatPromptForCapability,
    scanLocalCli: () => ({
      ok: true,
      agents: scanLocalCliAgents({
        env: process.env,
        existsSync: fs.existsSync,
        spawnSync,
        includeVersions: true,
      }),
    }),
    runGowooriChat: async (args: unknown) => sendMcpGowooriChatRunToRenderer(sanitizeMcpGowooriChatRunRequest(args)),
    cancelGowooriChat: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      return cancelMcpGowooriChatRun(typeof body.requestId === 'string' ? body.requestId : '');
    },
    inspectGowooriArtifactVisibility: async (args: unknown) =>
      sendMcpGowooriArtifactVisibilityToRenderer(sanitizeMcpGowooriArtifactVisibilityRequest(args)),
    showGowooriOverlay: async (args: unknown) =>
      sendMcpGowooriOverlayToRenderer('mcp:gowoori-overlay-show', sanitizeMcpGowooriOverlayRequest(args)),
    hideGowooriOverlay: async (args: unknown) =>
      sendMcpGowooriOverlayToRenderer('mcp:gowoori-overlay-hide', sanitizeMcpGowooriOverlayRequest(args)),
    readGowooriOverlay: async (args: unknown) =>
      sendMcpGowooriOverlayToRenderer('mcp:gowoori-overlay-status', sanitizeMcpGowooriOverlayRequest(args)),
    activeContext: () => buildMcpActiveContextSnapshot(),
    contextActions: () => buildMcpContextActionsSnapshot(),
    listDockPanes: () => ({
      ok: true,
      panes: latestMcpRendererState?.panes ?? [],
      contents: latestMcpRendererState?.contents ?? [],
      activePaneId: latestMcpRendererState?.activePaneId ?? null,
      rendererState: latestMcpRendererState,
    }),
    listPanels: () => ({
      ok: true,
      panels: listMcpPanelsForBridge(),
      bridgePanels: listMcpPanels(),
      rendererState: latestMcpRendererState,
    }),
    listOpenFiles: () => ({
      ok: true,
      openFiles: listMcpOpenFilesForBridge(),
      bridgeOpenFiles: listMcpOpenedFiles(),
      rendererState: latestMcpRendererState,
    }),
    listCommandPalette: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const query = body.query;
      return {
        ok: true,
        query: typeof query === 'string' ? query : '',
        commands: listMcpCommandPaletteCommands(query),
      };
    },
    runCommandPalette: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const commandId = typeof body.commandId === 'string' ? body.commandId.trim() : '';
      if (!commandId) return { ok: false, error: 'commandId is required' };
      const panelPlacement = normalizeMcpPanelPlacement(body.panelPlacement ?? body.placement);
      const targetPaneId = normalizeMcpTargetPaneId(body.targetPaneId);
      if (commandId in DESK_BRIDGE_RENDERER_COMMAND_CAPABILITY_COVERAGE) {
        return runMcpRendererCommand(commandId);
      }
      return runMcpExtensionCommand(commandId, panelPlacement, targetPaneId);
    },
    previewTerminal: (args: unknown) => ({ ok: true, ...previewMcpTerminalCommand(args) }),
    listTerminals: () => ({ ok: true, sessions: listMcpTerminalSessions() }),
    listTerminalShells: () => ({ ok: true, shells: getShellDescriptorsForPlatform() }),
    spawnTerminal: (args: unknown) => ({ ok: true, ...createMcpTerminalSession(args) }),
    writeTerminal: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const id = readCapabilityString(body, ['id']);
      const data = typeof body.data === 'string' ? body.data : '';
      const session = id ? sessions.get(id) : undefined;
      if (!session) return { ok: false, error: `Terminal session not found: ${id}` };
      if (data.length > 100_000) return { ok: false, error: 'Terminal input is too large.' };
      try {
        trackTerminalInput(session, data);
        automationControllers.get(session.id)?.recordTerminalInput(data);
        session.backend.write(data);
        return { ok: true, id };
      } catch (error) {
        return { ok: false, id, error: error instanceof Error ? error.message : String(error) };
      }
    },
    writeTerminalImage: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const termId = readCapabilityString(body, ['termId', 'id']);
      const source = readCapabilityString(body, ['source']);
      const session = termId ? sessions.get(termId) : undefined;
      if (!session) return { ok: false, error: `Terminal session not found: ${termId}` };
      if (!source) return { ok: false, error: 'No image source provided' };
      return writeTerminalImageToDisplay(session, source, {
        width: typeof body.width === 'string' ? body.width : undefined,
        height: typeof body.height === 'string' ? body.height : undefined,
        preserveAspectRatio: typeof body.preserveAspectRatio === 'boolean' ? body.preserveAspectRatio : undefined,
      });
    },
    writeTerminalImageBase64: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const termId = readCapabilityString(body, ['termId', 'id']);
      const base64 = readCapabilityString(body, ['base64']);
      const session = termId ? sessions.get(termId) : undefined;
      if (!session) return { ok: false, error: `Terminal session not found: ${termId}` };
      if (!base64) return { ok: false, error: 'No base64 data provided' };
      return writeTerminalImageToDisplay(session, Buffer.from(base64, 'base64'), {
        width: typeof body.width === 'string' ? body.width : undefined,
        height: typeof body.height === 'string' ? body.height : undefined,
        preserveAspectRatio: typeof body.preserveAspectRatio === 'boolean' ? body.preserveAspectRatio : undefined,
        filename: typeof body.filename === 'string' ? body.filename : undefined,
      });
    },
    writeTerminalXconImage: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const termId = readCapabilityString(body, ['termId', 'id']);
      const xcon = readCapabilityString(body, ['xcon', 'content', 'markdown']);
      const session = termId ? sessions.get(termId) : undefined;
      if (!session) return { ok: false, error: `Terminal session not found: ${termId}` };
      if (!xcon) return { ok: false, error: 'No XCON input provided' };
      return writeTerminalXconImageToDisplay(session, xcon, {
        width: typeof body.width === 'string' ? body.width : undefined,
        height: typeof body.height === 'string' ? body.height : undefined,
        preserveAspectRatio: typeof body.preserveAspectRatio === 'boolean' ? body.preserveAspectRatio : undefined,
        syntax: typeof body.syntax === 'string' ? (body.syntax as any) : undefined,
        theme: typeof body.theme === 'string' ? (body.theme as any) : undefined,
        viewportWidth: typeof body.viewportWidth === 'number' ? body.viewportWidth : undefined,
        title: typeof body.title === 'string' ? body.title : undefined,
      });
    },
    renderXconToPng: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const xcon = readCapabilityString(body, ['xcon', 'content', 'markdown']);
      if (!xcon) return { ok: false, error: 'No XCON input provided' };
      const result = await renderXconToPng(xcon, {
        syntax: typeof body.syntax === 'string' ? (body.syntax as any) : undefined,
        theme: typeof body.theme === 'string' ? (body.theme as any) : undefined,
        viewportWidth: typeof body.viewportWidth === 'number' ? body.viewportWidth : undefined,
        title: typeof body.title === 'string' ? body.title : undefined,
      });
      return {
        ok: result.ok,
        base64: result.base64,
        pngBytes: result.pngBytes,
        width: result.width,
        height: result.height,
        error: result.error,
      };
    },
    resizeTerminal: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const id = readCapabilityString(body, ['id']);
      const session = id ? sessions.get(id) : undefined;
      if (!session) return { ok: false, error: `Terminal session not found: ${id}` };
      try {
        const cols = clamp(body.cols, 20, 400, 120);
        const rows = clamp(body.rows, 5, 200, 30);
        session.backend.resize(cols, rows);
        return { ok: true, id, cols, rows };
      } catch (error) {
        return { ok: false, id, error: error instanceof Error ? error.message : String(error) };
      }
    },
    killTerminal: (args: unknown) => {
      const id = readCapabilityString(normalizeMcpCapabilityArgs(args), ['id']);
      const session = id ? sessions.get(id) : undefined;
      if (!session) return { ok: false, error: `Terminal session not found: ${id}` };
      try {
        session.backend.kill();
      } catch {
        // Already exited.
      } finally {
        sessions.delete(session.id);
        automationControllers.delete(session.id);
      }
      return { ok: true, id };
    },
    adoptTerminal: (args: unknown) => {
      const id = readCapabilityString(normalizeMcpCapabilityArgs(args), ['id', 'termId']);
      const session = id ? sessions.get(id) : undefined;
      if (!session) return { ok: false, error: `Terminal session not found: ${id}`, scrollback: '' };
      return { ok: true, id, scrollback: session.scrollbackChunks.join('') };
    },
    selectTerminalCwd: () => {
      if (selectCwdDialogPromise) return selectCwdDialogPromise.then((cwd) => ({ ok: Boolean(cwd), cwd }));
      selectCwdDialogPromise = (async () => {
        const result = await dialog.showOpenDialog({
          title: '작업 폴더 선택',
          properties: ['openDirectory', 'createDirectory'],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
      })();
      return selectCwdDialogPromise
        .then((cwd) => ({ ok: Boolean(cwd), cwd }))
        .finally(() => {
          selectCwdDialogPromise = null;
        });
    },
    saveTerminalLog: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const safeName = (
        typeof body.defaultName === 'string' && body.defaultName ? body.defaultName : 'terminal.log'
      ).replace(/[\\/:*?"<>|]/g, '_');
      const result = await dialog.showSaveDialog({
        title: '터미널 로그 저장',
        defaultPath: safeName,
        filters: [
          { name: 'Text log', extensions: ['log', 'txt'] },
          { name: 'All files', extensions: ['*'] },
        ],
      });
      if (result.canceled || !result.filePath) return { ok: false, saved: false };
      await fs.promises.writeFile(result.filePath, typeof body.text === 'string' ? body.text : '', 'utf8');
      return { ok: true, saved: true, path: result.filePath };
    },
    runTerminal: (args: unknown) => ({ ok: true, ...createMcpTerminalSession(args) }),
    runTerminalAndWait: (args: unknown) => runMcpTerminalCommandAndWait(args),
    tailTerminal: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!id) return { ok: false, error: 'id is required' };
      const tail = getTerminalTail(id, body.maxBytes);
      if (tail === null) return { ok: false, error: `Terminal session not found: ${id}` };
      return { ok: true, id, tail };
    },
    stopTerminal: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!id) return { ok: false, error: 'id is required' };
      const stopped = stopMcpTerminalSession(id);
      return {
        ok: stopped,
        id,
        ...(stopped ? {} : { error: `Terminal session not found: ${id}` }),
      };
    },
    captureActivePane: async (args: unknown) =>
      sendMcpCaptureActivePaneToRenderer(sanitizeMcpCaptureActivePaneRequest(args)),
    rendererPerformanceTrace: async (args: unknown) =>
      sendMcpRendererPerformanceTraceToRenderer(sanitizeMcpRendererPerformanceTraceRequest(args)),
    playwrightSnapshot: async (args: unknown) =>
      runMcpBridgePlaywright('snapshot', normalizeMcpBridgePathPayload(args)),
    playwrightRun: async (args: unknown) => runMcpBridgePlaywright('run', normalizeMcpBridgePathPayload(args)),
    getXconPrompt: async (args: unknown) =>
      runMcpServerTool('xenesis_desk_get_xcon_prompt', normalizeMcpBridgePathPayload(args)),
    validateXconMarkdown: async (args: unknown) =>
      runMcpServerTool('xenesis_desk_validate_xcon_markdown', normalizeMcpBridgePathPayload(args)),
    createXconMarkdown: async (args: unknown) =>
      runMcpServerTool('xenesis_desk_create_xcon_markdown', normalizeMcpBridgePathPayload(args)),
    createXconMarkdownFromContent: async (args: unknown) =>
      runMcpServerTool('xenesis_desk_create_xcon_markdown_from_content', normalizeMcpBridgePathPayload(args)),
    exportXconPdf: async (args: unknown) => {
      try {
        const result = await exportXconMarkdownToPdf(normalizeMcpBridgePathPayload(args));
        return { ok: true, success: true, pdfExported: true, ...result };
      } catch (error) {
        return {
          ok: false,
          success: false,
          pdfExported: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    listExtensions: () => ({ ok: true, extensions: getExtensionHost().listExtensions() }),
    reloadExtensions: () => ({ ok: true, extensions: getExtensionHost().reload() }),
    retryExtension: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const extensionId = typeof body.extensionId === 'string' ? body.extensionId.trim() : '';
      if (!extensionId) return { ok: false, error: 'extensionId is required' };
      return { ok: true, extensions: getExtensionHost().retry(extensionId) };
    },
    setExtensionEnabled: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const extensionId = typeof body.extensionId === 'string' ? body.extensionId.trim() : '';
      if (!extensionId) return { ok: false, error: 'extensionId is required' };
      return { ok: true, extensions: getExtensionHost().setEnabled(extensionId, body.enabled === true) };
    },
    listExtensionCommands: () => ({ ok: true, commands: getMcpExtensionCommands() }),
    runExtensionCommand: async (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const commandId = typeof body.commandId === 'string' ? body.commandId.trim() : '';
      if (!commandId) return { ok: false, error: 'commandId is required' };
      const panelPlacement = normalizeMcpPanelPlacement(body.panelPlacement ?? body.placement);
      const targetPaneId = normalizeMcpTargetPaneId(body.targetPaneId);
      return runMcpExtensionCommand(commandId, panelPlacement, targetPaneId);
    },
    recentDiagnostics: (args: unknown) => {
      const body = normalizeMcpCapabilityArgs(args);
      const limit = body.limit;
      return {
        ok: true,
        limit: Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Math.trunc(Number(limit)), 100) : 20,
        diagnostics: listRecentDiagnosticsForMcp(limit),
      };
    },
    listDiagnostics: () => ({ ok: true, diagnostics: listDiagnosticsLogs() }),
    recordDiagnostic: (args: unknown) => ({
      ok: true,
      diagnostic: recordDiagnosticLog(normalizeMcpCapabilityArgs(args) as unknown as DiagnosticsLogRecordRequest),
    }),
    clearDiagnostics: () => ({ ok: true, diagnostics: clearDiagnosticsLogs() }),
    revealDiagnosticsLogFile: () => ({ ok: revealDiagnosticsLogFile() }),
    exportDiagnosticsBundle: () =>
      exportDiagnosticsBundle().then((result) => ({ ok: Boolean(result.saved), ...result })),
  };
}

function normalizeDeskBridgeCapabilitySource(
  value: unknown,
  fallback: DeskBridgeCapabilitySource,
): DeskBridgeCapabilitySource {
  return value === 'internal' || value === 'mcp' || value === 'gowoori' || value === 'workflow' || value === 'xenesis'
    ? value
    : fallback;
}

async function callMcpBridgeCapabilityFromRequest(
  rawRequest: unknown,
  defaultSource: DeskBridgeCapabilitySource,
): Promise<McpBridgeCapabilityCallResult> {
  const body = normalizeMcpCapabilityArgs(rawRequest);
  const capabilityPath = typeof body.path === 'string' ? body.path : '';
  const capabilityArgs = body.args;
  const source = normalizeDeskBridgeCapabilitySource(body.source, defaultSource);
  const preApproved = body.approved === true;
  const rememberedHit = isMcpCapabilityApprovalRemembered(capabilityPath, capabilityArgs, source);
  const result = await callDeskBridgeCapability(createMcpBridgeCapabilityAdapter(), {
    path: capabilityPath,
    args: capabilityArgs,
    source,
    approved: preApproved || rememberedHit,
  });

  if (!result.ok && result.approvalRequired) {
    const item = recordMcpActionInboxRequest(
      createCapabilityApprovalRequest({
        path: capabilityPath,
        args: capabilityArgs,
        source,
        result,
      }),
    );
    recordDiagnosticLog({
      level: 'info',
      source: 'main',
      scope: 'mcp',
      message: `Capability approval requested: ${item.title}`,
      detail: JSON.stringify({ id: item.id, path: capabilityPath, source }),
    });
    return {
      ...result,
      message: 'Capability approval requested.',
      actionInboxItem: item,
    };
  }

  // Executed (no approval prompt). Tag HOW it cleared the gate so downstream
  // reports "already ran" instead of a phantom "approval needed" for the
  // common case where the user previously approved this capability.
  const approvalResolution: McpBridgeCapabilityCallResult['approvalResolution'] =
    preApproved ? 'pre-approved' : rememberedHit ? 'auto-approved' : 'not-required';
  return { ...result, approvalResolution };
}

function rememberMcpCapabilityApprovalsFromRequest(raw: unknown): McpBridgeCapabilityApprovalRememberResult {
  try {
    const entries = Array.isArray(raw) ? raw : raw ? [raw] : [];
    let count = 0;
    for (const entry of entries) {
      const record = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
      const pathValue = typeof record.path === 'string' ? record.path : '';
      if (!pathValue) continue;
      const source = normalizeDeskBridgeCapabilitySource(record.source, 'xenesis');
      rememberMcpCapabilityApprovalForCall(pathValue, record.args, source);
      count += 1;
    }
    return { ok: count > 0, count };
  } catch (error) {
    return { ok: false, count: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

function createMcpBridgeServer(): http.Server {
  return http.createServer(async (req, res) => {
    const method = String(req.method || '').toUpperCase();
    const url = new URL(req.url || '/', getMcpBridgeUrl());
    startMcpBridgeRequestObservation(req, res, method, url);

    if (method === 'GET' && url.pathname === '/health') {
      writeBridgeJson(res, 200, {
        ok: true,
        product: 'Xenesis Desk',
        bridgeUrl: getMcpBridgeUrl(),
        serverPath: getMcpServerScriptPath(),
      });
      return;
    }

    if (method !== 'POST') {
      writeBridgeJson(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    if (!isMcpBridgeRequestAuthorized(req)) {
      writeBridgeJson(res, 401, { ok: false, error: 'Unauthorized' });
      return;
    }

    try {
      if (url.pathname === '/state') {
        writeBridgeJson(res, 200, buildMcpBridgeStateSnapshot());
        return;
      }

      if (url.pathname === '/capabilities/list') {
        writeBridgeJson(res, 200, {
          ok: true,
          capabilities: listDeskBridgeCapabilities(undefined, getXenisPhase5VisibilityOptions()),
        });
        return;
      }

      if (url.pathname === '/capabilities/describe') {
        const body = await readRequestJson(req);
        const capabilityPath =
          typeof (body as { path?: unknown })?.path === 'string' ? (body as { path: string }).path : 'xd';
        const capability = findDeskBridgeCapability(capabilityPath, undefined, getXenisPhase5VisibilityOptions());
        if (!capability) {
          writeBridgeJson(res, 404, {
            ok: false,
            path: capabilityPath || 'xd',
            error: `Capability not found: ${capabilityPath || 'xd'}`,
          });
          return;
        }
        writeBridgeJson(res, 200, { ok: true, path: capability.path, capability });
        return;
      }

      if (url.pathname === '/capabilities/call') {
        const body = await readRequestJson(req);
        const result = await callMcpBridgeCapabilityFromRequest(body, 'mcp');
        if (result.actionInboxItem) {
          writeBridgeJson(res, 202, result);
          return;
        }
        writeBridgeJson(res, result.ok ? 200 : 400, result);
        return;
      }

      if (url.pathname === '/action-inbox/list') {
        writeBridgeJson(res, 200, { ok: true, actions: listMcpActionInboxSnapshot() });
        return;
      }

      if (url.pathname === '/action-inbox/request') {
        const body = await readRequestJson(req);
        const item = recordMcpActionInboxRequest(body);
        recordDiagnosticLog({
          level: 'info',
          source: 'main',
          scope: 'mcp',
          message: `MCP action inbox request: ${item.title}`,
          detail: JSON.stringify({ id: item.id, sessionId: item.sessionId, kind: item.kind }),
        });
        writeBridgeJson(res, 200, { ok: true, item });
        return;
      }

      if (url.pathname === '/panels/list') {
        writeBridgeJson(res, 200, {
          ok: true,
          panels: listMcpPanelsForBridge(),
          bridgePanels: listMcpPanels(),
          rendererState: latestMcpRendererState,
        });
        return;
      }

      if (url.pathname === '/files/open') {
        writeBridgeJson(res, 200, {
          ok: true,
          openFiles: listMcpOpenFilesForBridge(),
          bridgeOpenFiles: listMcpOpenedFiles(),
          rendererState: latestMcpRendererState,
        });
        return;
      }

      if (url.pathname === '/active-context') {
        writeBridgeJson(res, 200, buildMcpActiveContextSnapshot());
        return;
      }

      if (url.pathname === '/context-actions') {
        writeBridgeJson(res, 200, buildMcpContextActionsSnapshot());
        return;
      }

      if (url.pathname === '/command-palette') {
        const body = await readRequestJson(req);
        const query = (body as { query?: unknown })?.query;
        writeBridgeJson(res, 200, {
          ok: true,
          query: typeof query === 'string' ? query : '',
          commands: listMcpCommandPaletteCommands(query),
        });
        return;
      }

      if (url.pathname === '/command-palette/run') {
        const body = await readRequestJson(req);
        const commandId =
          typeof (body as { commandId?: unknown })?.commandId === 'string'
            ? (body as { commandId: string }).commandId.trim()
            : '';
        if (!commandId) {
          writeBridgeJson(res, 400, { ok: false, error: 'commandId is required' });
          return;
        }

        const panelPlacement = normalizeMcpPanelPlacement((body as { panelPlacement?: unknown })?.panelPlacement);
        const targetPaneId = normalizeMcpTargetPaneId((body as { targetPaneId?: unknown })?.targetPaneId);
        const result =
          commandId in DESK_BRIDGE_RENDERER_COMMAND_CAPABILITY_COVERAGE
            ? runMcpRendererCommand(commandId)
            : await runMcpExtensionCommand(commandId, panelPlacement, targetPaneId);
        recordDiagnosticLog({
          level: result.ok ? 'info' : 'warn',
          source: 'main',
          scope: 'mcp',
          message: result.ok
            ? `MCP ran command palette command: ${commandId}`
            : `MCP command palette command failed: ${commandId}`,
          detail: result.error || JSON.stringify({ actionsDispatched: result.actionsDispatched }),
        });
        writeBridgeJson(res, 200, { commandId, ...result });
        return;
      }

      if (url.pathname === '/gowoori-chat/run-async') {
        const body = await readRequestJson(req);
        const request = sanitizeMcpGowooriChatRunRequest(body);
        const session = createMcpGowooriChatRunSession(request);
        recordDiagnosticLog({
          level: 'info',
          source: 'main',
          scope: 'mcp',
          message: 'MCP GowooriChat async run started',
          detail: JSON.stringify({
            requestId: session.requestId,
            provider: request.provider,
            targetMode: request.targetMode,
          }),
        });
        writeBridgeJson(res, 202, session.snapshot);
        return;
      }

      if (url.pathname === '/gowoori-chat/run-status') {
        const body = await readRequestJson(req);
        const requestId = sanitizeMcpDockActionText(
          (body as { requestId?: unknown })?.requestId ?? url.searchParams.get('requestId'),
          120,
        );
        if (!requestId) {
          writeBridgeJson(res, 400, { ok: false, error: 'requestId is required' });
          return;
        }
        const snapshot = getMcpGowooriChatRunSnapshot(requestId);
        if (!snapshot) {
          writeBridgeJson(res, 404, { ok: false, requestId, error: 'GowooriChat run not found' });
          return;
        }
        writeBridgeJson(res, 200, snapshot);
        return;
      }

      if (url.pathname === '/gowoori-chat/run-cancel') {
        const body = await readRequestJson(req);
        const requestId = sanitizeMcpDockActionText(
          (body as { requestId?: unknown })?.requestId ?? url.searchParams.get('requestId'),
          120,
        );
        const result = cancelMcpGowooriChatRun(requestId);
        writeBridgeJson(res, result.ok ? 200 : 404, result);
        return;
      }

      if (url.pathname === '/gowoori-chat/run') {
        const body = await readRequestJson(req);
        const request = sanitizeMcpGowooriChatRunRequest(body);
        const result = await sendMcpGowooriChatRunToRenderer(request);
        recordDiagnosticLog({
          level: result.ok ? 'info' : 'warn',
          source: 'main',
          scope: 'mcp',
          message: result.ok ? 'MCP GowooriChat run completed' : 'MCP GowooriChat run failed',
          detail:
            result.error ||
            JSON.stringify({
              sourceLength: result.sourceLength,
              applied: result.applied,
              targetMode: result.targetMode,
            }),
        });
        writeBridgeJson(res, 200, result);
        return;
      }

      const dockActionByHttpPath: Record<string, McpBridgeDockActionPayload['action']> = {
        '/dock/focus': 'focus',
        '/dock/move': 'move',
        '/dock/close': 'close',
        '/dock/close-others': 'closeOthers',
        '/dock/close-right': 'closeRight',
        '/dock/close-all': 'closeAll',
        '/dock/arrange-group': 'arrangeGroup',
        '/dock/merge-group': 'mergeGroup',
        '/dock/window/arrange': 'arrangeWindow',
        '/dock/window/merge': 'mergeWindow',
        '/dock/merge-all': 'mergeAll',
        '/dock/sizes/current': 'readSizes',
        '/dock/sizes/set': 'setSizes',
        '/dock/pane/size/set': 'setPaneSize',
      };
      const dockAction = dockActionByHttpPath[url.pathname];
      if (dockAction) {
        const body = await readRequestJson(req);
        const target = sanitizeMcpDockActionTarget(body);
        const mode = sanitizeMcpDockArrangeMode(mcpBridgeRecord(body).mode);
        if (
          (dockAction === 'closeOthers' || dockAction === 'closeRight') &&
          !target.contentId &&
          target.useActive !== true
        ) {
          writeBridgeJson(res, 400, { ok: false, error: 'contentId is required' });
          return;
        }
        const actionAllowsMissingTarget =
          dockAction === 'arrangeWindow' ||
          dockAction === 'mergeWindow' ||
          dockAction === 'mergeAll' ||
          dockAction === 'readSizes' ||
          dockAction === 'setSizes';
        const actionUsesActiveTarget = target.useActive === true;
        if (!actionAllowsMissingTarget && !actionUsesActiveTarget && !target.contentId && !target.paneId) {
          writeBridgeJson(res, 400, { ok: false, error: 'contentId or paneId is required' });
          return;
        }
        const result = await sendMcpDockActionToRenderer(dockAction, { ...target, mode });
        writeBridgeJson(res, result.ok ? 200 : 404, result);
        return;
      }

      const explorerActionByHttpPath: Record<string, McpBridgeExplorerActionPayload['action']> = {
        '/explorer/show': 'show',
        '/explorer/hide': 'hide',
        '/explorer/toggle': 'toggle',
        '/explorer/navigate': 'navigate',
        '/explorer/refresh': 'refresh',
        '/explorer/go-up': 'goUp',
        '/explorer/set-filter': 'setFilter',
        '/explorer/clear-filter': 'clearFilter',
        '/explorer/copy-selected-path': 'copySelectedPath',
        '/explorer/select-path': 'selectPath',
        '/explorer/open-selected': 'openSelected',
        '/explorer/preview-selected': 'previewSelected',
        '/explorer/toggle-preview': 'togglePreview',
        '/explorer/toggle-details': 'toggleDetails',
        '/explorer/send-selected-to-bot': 'sendSelectedToBot',
        '/explorer/add-selected-to-context': 'addSelectedToContext',
        '/explorer/add-selected-to-favorites': 'addSelectedToFavorites',
        '/explorer/open-selected-in-terminal': 'openSelectedInTerminal',
        '/explorer/open-selected-safe-edit': 'openSelectedSafeEdit',
        '/explorer/open-selected-sync-planner': 'openSelectedSyncPlanner',
      };
      const explorerAction = explorerActionByHttpPath[url.pathname];
      if (explorerAction) {
        const body = await readRequestJson(req);
        const request = sanitizeMcpExplorerActionRequest({ ...mcpBridgeRecord(body), action: explorerAction });
        if (request.action === 'navigate' && !request.path) {
          writeBridgeJson(res, 400, { ok: false, error: 'path is required' });
          return;
        }
        const result = await sendMcpExplorerActionToRenderer(request);
        writeBridgeJson(res, result.ok ? 200 : 404, result);
        return;
      }

      const remoteExplorerActionByHttpPath: Record<string, McpBridgeRemoteExplorerActionPayload['action']> = {
        '/explorer/remote/show': 'show',
        '/explorer/remote/navigate': 'navigate',
        '/explorer/remote/refresh': 'refresh',
        '/explorer/remote/go-up': 'goUp',
        '/explorer/remote/set-filter': 'setFilter',
        '/explorer/remote/clear-filter': 'clearFilter',
        '/explorer/remote/copy-selected-path': 'copySelectedPath',
        '/explorer/remote/select-path': 'selectPath',
        '/explorer/remote/open-selected': 'openSelected',
        '/explorer/remote/preview-selected': 'previewSelected',
        '/explorer/remote/toggle-preview': 'togglePreview',
        '/explorer/remote/toggle-details': 'toggleDetails',
        '/explorer/remote/send-selected-to-bot': 'sendSelectedToBot',
        '/explorer/remote/add-selected-to-context': 'addSelectedToContext',
        '/explorer/remote/open-selected-sync-planner': 'openSelectedSyncPlanner',
      };
      const remoteExplorerAction = remoteExplorerActionByHttpPath[url.pathname];
      if (remoteExplorerAction) {
        const body = await readRequestJson(req);
        const request = sanitizeMcpRemoteExplorerActionRequest({
          ...mcpBridgeRecord(body),
          action: remoteExplorerAction,
        });
        if (request.action === 'navigate') {
          if (!request.profileId) {
            writeBridgeJson(res, 400, { ok: false, error: 'profileId is required' });
            return;
          }
          if (!request.path) {
            writeBridgeJson(res, 400, { ok: false, error: 'path is required' });
            return;
          }
        }
        const result = await sendMcpRemoteExplorerActionToRenderer(request);
        writeBridgeJson(res, result.ok ? 200 : 404, result);
        return;
      }

      const terminalUiActionByHttpPath: Record<string, McpBridgeTerminalUiActionPayload['action']> = {
        '/terminals/ui/copy': 'copy',
        '/terminals/ui/paste': 'paste',
        '/terminals/ui/select-all': 'selectAll',
        '/terminals/ui/clear-screen': 'clearScreen',
        '/terminals/ui/clear-scrollback': 'clearScrollback',
        '/terminals/ui/scroll-top': 'scrollTop',
        '/terminals/ui/scroll-bottom': 'scrollBottom',
        '/terminals/ui/set-fit-lock': 'setFitLock',
        '/terminals/ui/toggle-fit-lock': 'toggleFitLock',
        '/terminals/ui/find-next': 'findNext',
        '/terminals/ui/find-prev': 'findPrev',
        '/terminals/ui/save-log': 'saveLog',
        '/terminals/ui/send-selection-to-bot': 'sendSelectionToBot',
        '/terminals/ui/send-recent-output-to-bot': 'sendRecentOutputToBot',
      };
      const terminalUiAction = terminalUiActionByHttpPath[url.pathname];
      if (terminalUiAction) {
        const body = await readRequestJson(req);
        const request = sanitizeMcpTerminalUiActionRequest({ ...mcpBridgeRecord(body), action: terminalUiAction });
        if ((request.action === 'findNext' || request.action === 'findPrev') && !request.query) {
          writeBridgeJson(res, 400, { ok: false, error: 'query is required' });
          return;
        }
        if (request.action === 'setFitLock' && typeof request.locked !== 'boolean') {
          writeBridgeJson(res, 400, { ok: false, error: 'locked is required' });
          return;
        }
        const result = await sendMcpTerminalUiActionToRenderer(request);
        writeBridgeJson(res, result.ok ? 200 : 404, result);
        return;
      }

      const favoritesActionByHttpPath: Record<string, McpBridgeFavoritesActionPayload['action']> = {
        '/favorites/list': 'list',
        '/favorites/add': 'add',
        '/favorites/add-current-tab': 'addCurrentTab',
        '/favorites/remove': 'remove',
        '/favorites/open': 'open',
        '/favorites/open-in-terminal': 'openInTerminal',
        '/favorites/copy-path': 'copyPath',
        '/favorites/show-tab': 'showTab',
      };
      const favoritesAction = favoritesActionByHttpPath[url.pathname];
      if (favoritesAction) {
        const body = await readRequestJson(req);
        const request = sanitizeMcpFavoritesActionRequest({ ...mcpBridgeRecord(body), action: favoritesAction });
        if ((request.action === 'remove' || request.action === 'open') && !request.id) {
          writeBridgeJson(res, 400, { ok: false, error: 'id is required' });
          return;
        }
        if (
          (request.action === 'add' || request.action === 'openInTerminal' || request.action === 'copyPath') &&
          !request.path
        ) {
          writeBridgeJson(res, 400, { ok: false, error: 'path is required' });
          return;
        }
        if (request.action === 'add' && !request.kind) {
          writeBridgeJson(res, 400, { ok: false, error: 'kind is required' });
          return;
        }
        if (request.action === 'openInTerminal' && !request.shell) {
          writeBridgeJson(res, 400, { ok: false, error: 'shell is required' });
          return;
        }
        if (request.action === 'showTab' && !request.tab) {
          writeBridgeJson(res, 400, { ok: false, error: 'tab is required' });
          return;
        }
        const result = await sendMcpFavoritesActionToRenderer(request);
        writeBridgeJson(res, result.ok ? 200 : 404, result);
        return;
      }

      if (url.pathname === '/capture/active-pane') {
        const body = await readRequestJson(req);
        const request = sanitizeMcpCaptureActivePaneRequest(body);
        const result = await sendMcpCaptureActivePaneToRenderer(request);
        recordDiagnosticLog({
          level: result.ok ? 'info' : 'warn',
          source: 'main',
          scope: 'mcp',
          message: result.ok ? 'MCP captured active pane' : 'MCP active pane capture failed',
          detail:
            result.error ||
            JSON.stringify({
              paneId: result.target?.paneId,
              contentId: result.target?.contentId,
              filePath: result.artifact?.filePath,
            }),
        });
        writeBridgeJson(res, result.ok ? 200 : 500, result);
        return;
      }

      if (url.pathname === '/renderer-performance-trace') {
        const body = await readRequestJson(req);
        const request = sanitizeMcpRendererPerformanceTraceRequest(body);
        const result = await sendMcpRendererPerformanceTraceToRenderer(request);
        recordDiagnosticLog({
          level: result.ok ? 'info' : 'warn',
          source: 'main',
          scope: 'mcp',
          message: result.ok ? 'MCP renderer performance trace updated' : 'MCP renderer performance trace failed',
          detail:
            result.error ||
            JSON.stringify({
              enabled: result.enabled,
              setting: result.setting,
              itemCount: result.itemCount,
              summaryCount: result.summary.length,
            }),
        });
        writeBridgeJson(res, result.ok ? 200 : 500, result);
        return;
      }

      if (url.pathname === '/diagnostics/recent') {
        const body = await readRequestJson(req);
        const limit = (body as { limit?: unknown })?.limit;
        writeBridgeJson(res, 200, {
          ok: true,
          limit: Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.min(Math.trunc(Number(limit)), 100) : 20,
          diagnostics: listRecentDiagnosticsForMcp(limit),
        });
        return;
      }

      if (url.pathname === '/extension-commands') {
        const commands = getMcpExtensionCommands();
        writeBridgeJson(res, 200, { ok: true, commands });
        return;
      }

      if (url.pathname === '/run-extension-command') {
        const body = await readRequestJson(req);
        const commandId =
          typeof (body as { commandId?: unknown })?.commandId === 'string'
            ? (body as { commandId: string }).commandId.trim()
            : '';
        if (!commandId) {
          writeBridgeJson(res, 400, { ok: false, error: 'commandId is required' });
          return;
        }

        const panelPlacement = normalizeMcpPanelPlacement((body as { panelPlacement?: unknown })?.panelPlacement);
        const targetPaneId = normalizeMcpTargetPaneId((body as { targetPaneId?: unknown })?.targetPaneId);
        const result = await runMcpExtensionCommand(commandId, panelPlacement, targetPaneId);
        recordDiagnosticLog({
          level: result.ok ? 'info' : 'warn',
          source: 'main',
          scope: 'mcp',
          message: result.ok ? `MCP ran extension command: ${commandId}` : `MCP extension command failed: ${commandId}`,
          detail: result.error || JSON.stringify({ actionsDispatched: result.actionsDispatched }),
        });
        writeBridgeJson(res, 200, result);
        return;
      }

      const botEventType = getMcpBotEventType(url);
      if (botEventType) {
        const body = await readRequestJson(req);
        const eventBody =
          body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
        const event = normalizeBotBridgeEvent(
          {
            ...eventBody,
            type: botEventType,
          },
          { now: new Date().toISOString() },
        ) as McpBridgeBotEvent;
        if (!sendMcpBotEventToRenderer(event)) {
          writeBridgeJson(res, 503, { ok: false, error: 'Xenesis Desk renderer window is not available' });
          return;
        }
        recordDiagnosticLog({
          level: botEventType === 'error' ? 'warn' : 'info',
          source: 'main',
          scope: 'mcp',
          message: `MCP Bot event: ${botEventType}`,
          detail: JSON.stringify({ sessionId: event.sessionId, messageId: event.messageId }),
        });
        writeBridgeJson(res, 200, { ok: true, event });
        return;
      }

      if (url.pathname === '/xcon/validate') {
        const body = normalizeMcpBridgePathPayload(await readRequestJson(req));
        const result = await runMcpServerTool('xenesis_desk_validate_xcon_markdown', body);
        writeBridgeJson(res, result.success === false || result.ok === false ? 400 : 200, result);
        return;
      }

      if (url.pathname === '/xcon/create') {
        const body = normalizeMcpBridgePathPayload(await readRequestJson(req));
        const result = await runMcpServerTool('xenesis_desk_create_xcon_markdown', body);
        recordDiagnosticLog({
          level: result.success === false || result.ok === false ? 'warn' : 'info',
          source: 'main',
          scope: 'mcp',
          message:
            result.success === false || result.ok === false ? 'MCP XCON create failed' : 'MCP created XCON Markdown',
          detail: String(result.error || result.filePath || ''),
        });
        writeBridgeJson(res, result.success === false || result.ok === false ? 400 : 200, result);
        return;
      }

      if (url.pathname === '/xcon/create-from-content') {
        const body = normalizeMcpBridgePathPayload(await readRequestJson(req));
        const result = await runMcpServerTool('xenesis_desk_create_xcon_markdown_from_content', body);
        recordDiagnosticLog({
          level: result.success === false || result.ok === false ? 'warn' : 'info',
          source: 'main',
          scope: 'mcp',
          message:
            result.success === false || result.ok === false
              ? 'MCP XCON content create failed'
              : 'MCP created XCON Markdown from content',
          detail: String(result.error || result.filePath || ''),
        });
        writeBridgeJson(res, result.success === false || result.ok === false ? 400 : 200, result);
        return;
      }

      if (url.pathname === '/xcon/export-pdf') {
        const body = normalizeMcpBridgePathPayload(await readRequestJson(req));
        try {
          const result = await exportXconMarkdownToPdf(body);
          recordDiagnosticLog({
            level: 'info',
            source: 'main',
            scope: 'mcp',
            message: `MCP exported XCON PDF: ${path.basename(result.pdfPath)}`,
            detail: JSON.stringify({ filePath: result.filePath, pdfPath: result.pdfPath }),
          });
          writeBridgeJson(res, 200, {
            ok: true,
            success: true,
            pdfExported: true,
            filePath: result.filePath,
            pdfPath: result.pdfPath,
            title: result.title,
            pdfFileName: result.pdfFileName,
            pdfOutDir: result.pdfOutDir,
            pdfBytes: result.pdfBytes,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          recordDiagnosticLog({
            level: 'warn',
            source: 'main',
            scope: 'mcp',
            message: 'MCP XCON PDF export failed',
            detail: message,
          });
          writeBridgeJson(res, 400, { ok: false, success: false, pdfExported: false, error: message });
        }
        return;
      }

      if (url.pathname === '/playwright/snapshot' || url.pathname === '/playwright/run') {
        const body = normalizeMcpBridgePathPayload(await readRequestJson(req));
        const operation = url.pathname === '/playwright/snapshot' ? 'snapshot' : 'run';
        const result = await runMcpBridgePlaywright(operation, body);
        recordDiagnosticLog({
          level: result.ok === false ? 'warn' : 'info',
          source: 'main',
          scope: 'mcp',
          message: result.ok === false ? `MCP Playwright ${operation} failed` : `MCP ran Playwright ${operation}`,
          detail: String(result.error || JSON.stringify({ url: (body as { url?: unknown })?.url || '' })),
        });
        writeBridgeJson(res, 200, result);
        return;
      }

      if (url.pathname === '/terminal/preview') {
        const body = await readRequestJson(req);
        const preview = previewMcpTerminalCommand(body);
        writeBridgeJson(res, 200, { ok: true, ...preview });
        return;
      }

      if (url.pathname === '/terminal/run') {
        const body = await readRequestJson(req);
        const result = createMcpTerminalSession(body);
        recordDiagnosticLog({
          level: 'info',
          source: 'terminal',
          scope: 'mcp',
          message: `MCP opened terminal: ${result.title}`,
          detail: JSON.stringify({ id: result.id, cwd: result.cwd, shell: result.shell }),
        });
        writeBridgeJson(res, 200, { ok: true, ...result });
        return;
      }

      if (url.pathname === '/terminal/tail') {
        const body = await readRequestJson(req);
        const id = typeof (body as { id?: unknown })?.id === 'string' ? (body as { id: string }).id.trim() : '';
        if (!id) {
          writeBridgeJson(res, 400, { ok: false, error: 'id is required' });
          return;
        }
        const tail = getTerminalTail(id, (body as { maxBytes?: unknown })?.maxBytes);
        if (tail === null) {
          writeBridgeJson(res, 404, { ok: false, error: `Terminal session not found: ${id}` });
          return;
        }
        writeBridgeJson(res, 200, { ok: true, id, tail });
        return;
      }

      if (url.pathname === '/terminal/stop') {
        const body = await readRequestJson(req);
        const id = typeof (body as { id?: unknown })?.id === 'string' ? (body as { id: string }).id.trim() : '';
        if (!id) {
          writeBridgeJson(res, 400, { ok: false, error: 'id is required' });
          return;
        }
        const stopped = stopMcpTerminalSession(id);
        writeBridgeJson(res, stopped ? 200 : 404, {
          ok: stopped,
          id,
          ...(stopped ? {} : { error: `Terminal session not found: ${id}` }),
        });
        return;
      }

      if (url.pathname === '/terminal/list') {
        writeBridgeJson(res, 200, { ok: true, sessions: listMcpTerminalSessions() });
        return;
      }

      if (url.pathname !== '/open-file') {
        writeBridgeJson(res, 404, { ok: false, error: 'Not found' });
        return;
      }

      const body = await readRequestJson(req);
      const rawFilePath =
        typeof (body as { filePath?: unknown })?.filePath === 'string'
          ? (body as { filePath: string }).filePath.trim()
          : '';
      const filePath = normalizeBridgePathForPlatform(rawFilePath, { platform: process.platform });

      if (!filePath || !path.isAbsolute(filePath)) {
        writeBridgeJson(res, 400, { ok: false, error: 'filePath must be an absolute path' });
        return;
      }
      if (!fs.existsSync(filePath)) {
        writeBridgeJson(res, 404, { ok: false, error: `File not found: ${filePath}` });
        return;
      }
      const placement = normalizeMcpPanelPlacement((body as { placement?: unknown })?.placement);
      const targetPaneId = normalizeMcpTargetPaneId((body as { targetPaneId?: unknown })?.targetPaneId);
      const renderOptions = normalizeMcpRenderOptions((body as { renderOptions?: unknown })?.renderOptions);
      if (!sendMcpOpenFileToRenderer(filePath, placement, targetPaneId, renderOptions)) {
        writeBridgeJson(res, 503, { ok: false, error: 'Xenesis Desk renderer window is not available' });
        return;
      }

      recordDiagnosticLog({
        level: 'info',
        source: 'main',
        scope: 'mcp',
        message: `MCP opened file: ${path.basename(filePath)}`,
        detail: filePath,
      });
      writeBridgeJson(res, 200, { ok: true, filePath, placement, targetPaneId, renderOptions });
    } catch (error) {
      writeBridgeJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

function startMcpBridgeServer(port = getPreferredMcpBridgePort()): Promise<boolean> {
  if (mcpBridgeServer) return Promise.resolve(true);
  if (mcpBridgeStartPromise) return mcpBridgeStartPromise;
  if (!isMcpServerAvailable()) {
    clearMcpBridgeStateFiles();
    recordDiagnosticLog({
      level: 'info',
      source: 'main',
      scope: 'mcp',
      message: 'Xenesis Desk MCP bridge disabled because the MCP server folder is not present',
      detail: getMcpServerScriptPath(),
    });
    return Promise.resolve(false);
  }

  const server = createMcpBridgeServer();
  // Some CR calls intentionally wait for live LLM/CLI output. Node's default
  // request timeout is too short for those long-running provider checks.
  server.requestTimeout = 900_000;
  server.timeout = 900_000;
  server.headersTimeout = 120_000;
  server.keepAliveTimeout = 15_000;
  mcpBridgeStartPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (ready: boolean): void => {
      if (settled) return;
      settled = true;
      mcpBridgeStartPromise = null;
      resolve(ready);
    };

    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE' && port !== 0) {
        mcpBridgeServer = null;
        mcpBridgeStartPromise = null;
        startMcpBridgeServer(0).then(resolve);
        return;
      }

      recordDiagnosticLog({
        level: 'warn',
        source: 'main',
        scope: 'mcp',
        message: 'Xenesis Desk MCP bridge failed to start',
        detail: diagnosticDetailFromUnknown(error),
      });
      mcpBridgeServer = null;
      settle(false);
    });

    server.listen(port, MCP_BRIDGE_HOST, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        mcpBridgePort = address.port;
      }
      mcpBridgeServer = server;
      writeMcpBridgeStateFile();
      recordDiagnosticLog({
        level: 'info',
        source: 'main',
        scope: 'mcp',
        message: `Xenesis Desk MCP bridge listening on ${getMcpBridgeUrl()}`,
      });
      settle(true);
    });
  });

  return mcpBridgeStartPromise;
}

function stopMcpBridgeServer(): void {
  const server = mcpBridgeServer;
  mcpBridgeServer = null;
  mcpBridgeStartPromise = null;
  if (!server) return;
  try {
    server.close();
  } catch {
    // App shutdown should not be blocked by bridge cleanup.
  }
}

function emitWindowBoundsChanged(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  sendToRenderer(win, 'window:bounds-changed', win.getBounds());
}

function attachWindowBoundsEvents(win: BrowserWindow): void {
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let lastEmitAt = 0;

  const emit = () => {
    pendingTimer = null;
    lastEmitAt = Date.now();
    emitWindowBoundsChanged(win);
  };

  const scheduleEmit = () => {
    if (win.isDestroyed()) return;
    const now = Date.now();
    const elapsed = now - lastEmitAt;

    if (elapsed >= 80) {
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      emit();
      return;
    }

    if (pendingTimer) return;
    pendingTimer = setTimeout(emit, 80 - elapsed);
  };

  win.on('resize', scheduleEmit);
  win.on('move', scheduleEmit);
  win.on('closed', () => {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  });
}

function getPersistableWindowBounds(win: BrowserWindow): WindowBounds | null {
  if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) {
    return null;
  }

  const bounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
  return normalizeMainWindowBounds(bounds);
}

function attachMainWindowBoundsPersistence(win: BrowserWindow): void {
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  const clearPendingTimer = () => {
    if (!pendingTimer) return;
    clearTimeout(pendingTimer);
    pendingTimer = null;
  };

  const persistBounds = () => {
    pendingTimer = null;
    const nextBounds = getPersistableWindowBounds(win);
    if (!nextBounds) return;
    persistSettings({ mainWindowBounds: nextBounds });
  };

  const schedulePersist = () => {
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    clearPendingTimer();
    pendingTimer = setTimeout(persistBounds, MAIN_WINDOW_BOUNDS_SAVE_DELAY_MS);
  };

  win.on('resize', schedulePersist);
  win.on('move', schedulePersist);
  win.on('unmaximize', schedulePersist);
  win.on('close', () => {
    clearPendingTimer();
    persistBounds();
  });
  win.on('closed', clearPendingTimer);
}

function killAllSessions(): void {
  for (const session of sessions.values()) {
    try {
      session.backend.kill();
    } catch {
      // Session may already be gone.
    }
  }
  sessions.clear();
  automationControllers.clear();
}

// ─── 자동 업데이트 ────────────────────────────────────────────────────────────

type UpdaterStatusPayload = UpdaterStatus extends infer Item
  ? Item extends UpdaterStatus
    ? Omit<Item, 'channel' | 'feedUrl' | 'autoCheck'>
    : never
  : never;

function getUpdaterStatusContext(): Pick<UpdaterStatus, 'channel' | 'feedUrl' | 'autoCheck'> {
  const updater = normalizeUpdaterSettings(loadSettings().updater);
  return {
    channel: updater.channel,
    feedUrl: resolveUpdateFeedUrl(updater),
    autoCheck: updater.autoCheck,
  };
}

function withUpdaterContext(status: UpdaterStatusPayload): UpdaterStatus {
  return {
    ...status,
    ...getUpdaterStatusContext(),
  } as UpdaterStatus;
}

let updaterStatus: UpdaterStatus = withUpdaterContext({ state: 'idle' });

function configureAutoUpdaterFeed(): UpdaterSettings {
  const updater = normalizeUpdaterSettings(loadSettings().updater);
  autoUpdater.channel = UPDATE_CHANNEL_NAMES[updater.channel];
  autoUpdater.allowPrerelease = updater.channel !== 'public-stable';
  autoUpdater.setFeedURL(resolveUpdateFeed(updater));
  return updater;
}

function broadcastUpdaterStatus(status: UpdaterStatusPayload): void {
  updaterStatus = withUpdaterContext(status);
  mainWindowRef?.webContents.send('updater:status-changed', updaterStatus);
}

function recordUpdaterDiagnostic(level: DiagnosticsLogLevel, message: string, detail?: string): void {
  const context = getUpdaterStatusContext();
  recordDiagnosticLog({
    level,
    source: 'updater',
    scope: 'auto-updater',
    message,
    detail: detail ?? `channel=${context.channel}; feedUrl=${context.feedUrl}; autoCheck=${context.autoCheck}`,
  });
}

function setupAutoUpdater(): void {
  // 개발 모드에서는 비활성화 (패키징된 앱에서만 동작)
  if (!app.isPackaged) {
    broadcastUpdaterStatus({ state: 'idle' });
    return;
  }

  configureAutoUpdaterFeed();
  autoUpdater.autoDownload = false; // 사용자가 직접 다운로드 트리거
  autoUpdater.autoInstallOnAppQuit = true; // 앱 종료 시 자동 설치

  autoUpdater.on('checking-for-update', () => {
    recordUpdaterDiagnostic('info', 'Checking for updates');
    broadcastUpdaterStatus({ state: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    recordUpdaterDiagnostic('info', `Update available: ${info.version}`);
    broadcastUpdaterStatus({
      state: 'available',
      info: {
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
        releaseDate: info.releaseDate ? String(info.releaseDate) : undefined,
      },
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    recordUpdaterDiagnostic('info', `No update available: ${info.version}`);
    broadcastUpdaterStatus({
      state: 'not-available',
      info: {
        version: info.version,
        releaseNotes: null,
        releaseDate: info.releaseDate ? String(info.releaseDate) : undefined,
      },
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    broadcastUpdaterStatus({
      state: 'downloading',
      progress: {
        bytesPerSecond: progress.bytesPerSecond,
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      },
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    recordUpdaterDiagnostic('info', `Update downloaded: ${info.version}`);
    broadcastUpdaterStatus({
      state: 'downloaded',
      info: {
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
        releaseDate: info.releaseDate ? String(info.releaseDate) : undefined,
      },
    });
  });

  autoUpdater.on('error', (err) => {
    recordUpdaterDiagnostic('error', 'Update check failed', err.message);
    broadcastUpdaterStatus({ state: 'error', message: err.message });
  });

  // 앱 준비 후 5초 뒤 자동 확인
  setTimeout(() => {
    if (!loadSettings().updater.autoCheck) return;
    configureAutoUpdaterFeed();
    autoUpdater.checkForUpdates().catch((err) => {
      recordUpdaterDiagnostic('error', 'Update check failed', String(err?.message ?? err));
      broadcastUpdaterStatus({ state: 'error', message: String(err?.message ?? err) });
    });
  }, 5000);
}

// Updater IPC 핸들러
ipcMain.handle('updater:get-status', (): UpdaterStatus => updaterStatus);

ipcMain.handle('updater:check', async (): Promise<void> => {
  configureAutoUpdaterFeed();
  if (!app.isPackaged) {
    recordUpdaterDiagnostic('info', 'Update check skipped in development mode');
    broadcastUpdaterStatus({
      state: 'not-available',
      info: { version: app.getVersion(), releaseNotes: '개발 모드에서는 업데이트를 확인할 수 없습니다.' },
    });
    return;
  }
  await autoUpdater.checkForUpdates().catch((err) => {
    recordUpdaterDiagnostic('error', 'Update check failed', String(err?.message ?? err));
    broadcastUpdaterStatus({ state: 'error', message: String(err?.message ?? err) });
  });
});

ipcMain.handle('updater:download', async (): Promise<void> => {
  if (!app.isPackaged) return;
  configureAutoUpdaterFeed();
  recordUpdaterDiagnostic('info', 'Update download requested');
  await autoUpdater.downloadUpdate().catch((err) => {
    recordUpdaterDiagnostic('error', 'Update download failed', String(err?.message ?? err));
    broadcastUpdaterStatus({ state: 'error', message: String(err?.message ?? err) });
  });
});

ipcMain.handle('updater:install', (): void => {
  recordUpdaterDiagnostic('info', 'Update install requested');
  autoUpdater.quitAndInstall(true, true);
});

// ─── 내부 SQLite 서버 관리 ────────────────────────────────────────────────────

// 내부 서버 프로세스 (항상 시스템 node 사용)
let internalServer: null = null; // 미사용 (하위 호환 유지용)
let internalServerProcess: ChildProcess | null = null;
let internalServerPid: number | undefined;
// 실제 기동 포트 — 앱 시작 시 설정 파일에서 읽어 초기화, 이후 변경 시 갱신
let internalServerPort: number = (() => loadSettings().serverPort ?? 3001)();

/** 현재 설정에서 서버 포트를 읽어 반환 */
function getServerPort(): number {
  return loadSettings().serverPort ?? 3001;
}

function getServerScriptPath(): string {
  if (app.isPackaged) {
    // 배포 빌드: asarUnpack 으로 추출된 경로
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'index.js');
  }
  // 개발 빌드: out/main/ 에서 두 단계 위로 → 프로젝트 루트/server/index.js
  return path.join(__dirname, '../../server/index.js');
}

/** 실제 포트 3001 이 열려 있는지 비동기로 확인 (외부 기동 서버도 감지) */
function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.createConnection(port, '127.0.0.1');
    const done = (ok: boolean) => {
      try {
        sock.destroy();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
    setTimeout(() => done(false), 800);
  });
}

async function getInternalServerStatus(): Promise<ServerStatus> {
  const portOpen = await isPortListening(internalServerPort);
  if (!portOpen) {
    if (internalServer || internalServerProcess) {
      internalServer = null;
      internalServerProcess = null;
      internalServerPid = undefined;
    }
    return { running: false, port: internalServerPort };
  }
  return { running: true, port: internalServerPort, pid: internalServerPid };
}

function startInternalServer(): Promise<ServerStatus> {
  // 설정에서 포트를 읽어 기동
  internalServerPort = getServerPort();

  // 이미 기동 중이면 상태만 반환
  if (internalServer || internalServerProcess) return getInternalServerStatus();

  const scriptPath = getServerScriptPath();
  if (!fs.existsSync(scriptPath)) {
    return Promise.resolve({ running: false, port: internalServerPort });
  }

  const serverEnv = { ...process.env, PORT: String(internalServerPort) };

  // ── 개발/배포 공통: 시스템 node 로 서버 기동 ────────────────────────────
  // better-sqlite3 는 시스템 Node.js 용으로 컴파일된 네이티브 모듈이므로
  // 항상 시스템 node 를 사용한다.
  return isPortListening(internalServerPort).then((already) => {
    if (already) return getInternalServerStatus();

    const nodePath = process.platform === 'win32' ? 'node.exe' : 'node';
    internalServerProcess = spawn(nodePath, [scriptPath], {
      env: serverEnv,
      cwd: path.dirname(scriptPath),
      stdio: 'pipe',
      windowsHide: true,
    });
    internalServerPid = internalServerProcess.pid;
    internalServerProcess.on('exit', () => {
      internalServerProcess = null;
      internalServerPid = undefined;
    });
    // 서버가 포트를 열 때까지 최대 8초 대기
    return new Promise<ServerStatus>((resolve) => {
      let elapsed = 0;
      const check = setInterval(async () => {
        elapsed += 300;
        const ok = await isPortListening(internalServerPort);
        if (ok || elapsed >= 8000) {
          clearInterval(check);
          resolve(await getInternalServerStatus());
        }
      }, 300);
    });
  });
}

async function stopInternalServer(): Promise<ServerStatus> {
  if (internalServerProcess) {
    try {
      internalServerProcess.kill();
    } catch {
      /* 이미 종료 */
    }
    internalServerProcess = null;
    internalServerPid = undefined;
  }
  internalServer = null;
  return { running: false, port: internalServerPort };
}

// ─── xamongcode API sidecar 관리 ─────────────────────────────────────────────

let xamongCodeProcess: ChildProcess | null = null;
let xamongCodePid: number | undefined;
let xamongCodeLastError = '';

function getXamongCodeSettings(): XamongCodeRuntimeSettings {
  return loadSettings().xamongCode;
}

function xamongCodeSettingsChanged(before: XamongCodeRuntimeSettings, after: XamongCodeRuntimeSettings): boolean {
  return (
    before.runtimePath !== after.runtimePath ||
    before.configDir !== after.configDir ||
    before.host !== after.host ||
    before.port !== after.port ||
    before.openAiApiKey !== after.openAiApiKey ||
    before.openAiModel !== after.openAiModel ||
    before.workspacesConfigPath !== after.workspacesConfigPath ||
    before.directGeneralChat !== after.directGeneralChat ||
    before.directChatModel !== after.directChatModel ||
    before.workerTierPolicies !== after.workerTierPolicies
  );
}

function resolveConfiguredXamongCodeRuntime(settings = getXamongCodeSettings()): string {
  return resolveXamongCodeRuntimePath({
    settingPath: settings.runtimePath,
    env: process.env,
    appIsPackaged: app.isPackaged,
    dirname: __dirname,
    resourcesPath: process.resourcesPath,
    existsSync: fs.existsSync,
  });
}

function ensureXamongCodeTerminalShim(runtimePath: string): string {
  if (!runtimePath) return '';
  const cliPath = path.join(runtimePath, 'runtime-compat', 'openai-cli.mjs');
  if (!fs.existsSync(cliPath)) return '';

  const binDir = path.join(xenisHomeDir, 'bin');
  try {
    fs.mkdirSync(binDir, { recursive: true });
    if (process.platform === 'win32') {
      const shimPath = path.join(binDir, 'xamong.cmd');
      const shim = `@echo off\r\nnode "${cliPath}" %*\r\n`;
      fs.writeFileSync(shimPath, shim, 'utf8');
    } else {
      const shimPath = path.join(binDir, 'xamong');
      const shim = `#!/usr/bin/env sh\nnode "${cliPath}" "$@"\n`;
      fs.writeFileSync(shimPath, shim, { encoding: 'utf8', mode: 0o755 });
      try {
        fs.chmodSync(shimPath, 0o755);
      } catch {
        /* ignore */
      }
    }
    return binDir;
  } catch {
    return '';
  }
}

function xamongCodeStatusPayload(
  running: boolean,
  settings = getXamongCodeSettings(),
  runtimePath = resolveConfiguredXamongCodeRuntime(settings),
): XamongCodeServerStatus {
  const host = settings.host || DEFAULT_XAMONG_CODE_API_HOST;
  const port = settings.port || DEFAULT_XAMONG_CODE_API_PORT;
  return {
    running,
    host,
    port,
    url: `http://${host}:${port}`,
    runtimePath,
    configDir: settings.configDir || DEFAULT_XAMONG_CODE_CONFIG_DIR,
    workspacesConfigPath: settings.workspacesConfigPath || '',
    openAiModel: settings.openAiModel || '',
    directGeneralChat: settings.directGeneralChat !== false,
    directChatModel: settings.directChatModel || '',
    workerTierPolicies: settings.workerTierPolicies || '',
    hasOpenAiApiKey: !!settings.openAiApiKey,
    managed: !!xamongCodeProcess,
    pid: xamongCodePid,
    ...(xamongCodeLastError ? { error: xamongCodeLastError } : {}),
  };
}

async function getXamongCodeServerStatus(): Promise<XamongCodeServerStatus> {
  const settings = getXamongCodeSettings();
  const runtimePath = resolveConfiguredXamongCodeRuntime(settings);
  if (!isXenisPhase5Enabled()) {
    return {
      ...xamongCodeStatusPayload(false, settings, runtimePath),
      error: 'XamongCode is hidden until XENIS_PHASE_5=true or featureFlags.xenisPhase5 is enabled.',
    };
  }
  const portOpen = await isPortListening(settings.port || DEFAULT_XAMONG_CODE_API_PORT);
  if (!portOpen && xamongCodeProcess) {
    xamongCodeProcess = null;
    xamongCodePid = undefined;
  }
  return xamongCodeStatusPayload(portOpen, settings, runtimePath);
}

async function startXamongCodeServer(): Promise<XamongCodeServerStatus> {
  const settings = getXamongCodeSettings();
  const runtimePath = resolveConfiguredXamongCodeRuntime(settings);
  const port = settings.port || DEFAULT_XAMONG_CODE_API_PORT;
  if (!isXenisPhase5Enabled()) {
    xamongCodeLastError = 'XamongCode is hidden until XENIS_PHASE_5=true or featureFlags.xenisPhase5 is enabled.';
    return xamongCodeStatusPayload(false, settings, runtimePath);
  }

  if (await isPortListening(port)) {
    xamongCodeLastError = '';
    return xamongCodeStatusPayload(true, settings, runtimePath);
  }

  const launch = buildXamongCodeApiLaunch({
    runtimePath,
    host: settings.host || DEFAULT_XAMONG_CODE_API_HOST,
    port,
    configDir: settings.configDir || DEFAULT_XAMONG_CODE_CONFIG_DIR,
    openAiApiKey: settings.openAiApiKey || '',
    openAiModel: settings.openAiModel || '',
    workspacesConfigPath: settings.workspacesConfigPath || '',
    directGeneralChat: settings.directGeneralChat !== false,
    directChatModel: settings.directChatModel || '',
    workerTierPolicies: settings.workerTierPolicies || '',
    env: process.env,
    existsSync: fs.existsSync,
  });

  if (!launch.ok) {
    xamongCodeLastError = launch.error;
    return xamongCodeStatusPayload(false, settings, runtimePath);
  }

  try {
    xamongCodeProcess = spawn(launch.command, launch.args, {
      env: launch.env,
      cwd: launch.cwd,
      stdio: 'ignore',
      windowsHide: true,
    });
    xamongCodePid = xamongCodeProcess.pid;
    xamongCodeLastError = '';
    xamongCodeProcess.on('error', (error) => {
      xamongCodeLastError = error.message;
      xamongCodeProcess = null;
      xamongCodePid = undefined;
    });
    xamongCodeProcess.on('exit', () => {
      xamongCodeProcess = null;
      xamongCodePid = undefined;
    });
  } catch (error) {
    xamongCodeLastError = error instanceof Error ? error.message : String(error);
    xamongCodeProcess = null;
    xamongCodePid = undefined;
    return xamongCodeStatusPayload(false, settings, runtimePath);
  }

  return new Promise<XamongCodeServerStatus>((resolve) => {
    let elapsed = 0;
    const check = setInterval(async () => {
      elapsed += 300;
      const ok = await isPortListening(port);
      if (ok || elapsed >= 8000) {
        clearInterval(check);
        if (!ok && !xamongCodeLastError) {
          xamongCodeLastError = 'xamongcode API server did not open its port within 8 seconds.';
        }
        resolve(await getXamongCodeServerStatus());
      }
    }, 300);
  });
}

async function stopXamongCodeServer(): Promise<XamongCodeServerStatus> {
  if (xamongCodeProcess) {
    try {
      xamongCodeProcess.kill();
    } catch {
      /* already stopped */
    }
    xamongCodeProcess = null;
    xamongCodePid = undefined;
  }
  return getXamongCodeServerStatus();
}

// ─── Xenesis gateway sidecar 관리 ────────────────────────────────────────────

const xenesisGatewayToken = crypto.randomUUID();
const xenesisService = createXenesisService();
type XenesisInternalStatus = ReturnType<typeof xenesisService.getStatus>;
let xenesisGatewayUrl = '';
let xenesisGatewayPort = 0;
let xenesisGatewayWorkspace = '';
let activeXenesisWorkspace = '';
let xenesisLastError = '';
let xenesisLastPortFallback = '';
let embeddedXenesisService: XenesisEmbeddedAgentService | null = null;
const xenesisGatewayChannelDiagnosticKeys = new Map<XenesisGatewayChannelName, string>();

function getCurrentXenesisGatewayToken(): string {
  return getXenesisGatewaySettings(loadSettings().xenesis).devToken.trim() || xenesisGatewayToken;
}

type XenesisStatusWithoutProfile = Omit<XenesisStatus, 'profile'>;

function normalizeXenesisWorkspacePath(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/[\\/]+$/, '');
}

function xenesisWorkspaceKey(value: string): string {
  const normalized = normalizeXenesisWorkspacePath(value);
  if (!normalized) return '';
  try {
    return path.resolve(normalized).toLowerCase();
  } catch {
    return normalized.toLowerCase();
  }
}

function xenesisWorkspaceEquals(left: string, right: string): boolean {
  const leftKey = xenesisWorkspaceKey(left);
  const rightKey = xenesisWorkspaceKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

function getXenesisWorkspace(): string {
  const settings = loadSettings();
  return resolveXenesisWorkspaceRoot({
    activeWorkspace: activeXenesisWorkspace,
    workspacePath: settings.workspace.currentPath,
    defaultCwd: settings.defaultCwd,
    fallbackCwd: process.cwd(),
  });
}

function getXenesisStateHome(): string {
  return resolveXenesisStateHome({ xenisHome: xenisHomeDir });
}

const XENESIS_REPORT_KINDS = new Set<XenesisReportKind>(['smoke', 'scenario', 'connect', 'provider-live']);
const XENESIS_REPORT_STATUSES = new Set(['passed', 'failed']);
const XENESIS_TASK_STATUSES = new Set<XenesisTaskStatus>([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'blocked',
]);

function xenesisText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function xenesisLimit(value: unknown, fallback = 20): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 500);
}

function xenesisContains(value: unknown, query: string | undefined): boolean {
  if (!query) return true;
  return String(value ?? '')
    .toLowerCase()
    .includes(query.toLowerCase());
}

function xenesisReportKindFromFileName(fileName: string): XenesisReportKind | null {
  if (fileName.startsWith('provider-live-')) return 'provider-live';
  if (fileName.startsWith('scenario-')) return 'scenario';
  if (fileName.startsWith('connect-')) return 'connect';
  if (fileName.startsWith('smoke-')) return 'smoke';
  return null;
}

function normalizeXenesisReportQuery(query: XenesisReportQuery | undefined): XenesisReportQuery {
  const kind = xenesisText(query?.kind);
  const status = xenesisText(query?.status);
  return {
    ...(kind && XENESIS_REPORT_KINDS.has(kind as XenesisReportKind) ? { kind: kind as XenesisReportKind } : {}),
    ...(status && XENESIS_REPORT_STATUSES.has(status) ? { status: status as XenesisReportQuery['status'] } : {}),
    limit: xenesisLimit(query?.limit),
  };
}

function normalizeXenesisTaskQuery(query: XenesisTaskQuery | undefined): XenesisTaskQuery {
  const status = xenesisText(query?.status);
  return {
    ...(status && XENESIS_TASK_STATUSES.has(status as XenesisTaskStatus)
      ? { status: status as XenesisTaskStatus }
      : {}),
    ...(xenesisText(query?.taskId) ? { taskId: xenesisText(query?.taskId) } : {}),
    ...(xenesisText(query?.label) ? { label: xenesisText(query?.label) } : {}),
    ...(xenesisText(query?.handoffId) ? { handoffId: xenesisText(query?.handoffId) } : {}),
    ...(xenesisText(query?.handoffTitle) ? { handoffTitle: xenesisText(query?.handoffTitle) } : {}),
    ...(xenesisText(query?.source) ? { source: xenesisText(query?.source) } : {}),
    ...(xenesisText(query?.subagent) ? { subagent: xenesisText(query?.subagent) } : {}),
    limit: xenesisLimit(query?.limit),
  };
}

function xenesisReportPassed(report: XenesisReportSummary): boolean {
  return report.exitCode === 0 && report.failed === 0;
}

async function listXenesisReports(query?: XenesisReportQuery): Promise<{ reports: XenesisReportSummary[] }> {
  const normalized = normalizeXenesisReportQuery(query);
  const reportsDir = path.join(getXenesisStateHome(), 'reports');
  let files: fs.Dirent[];
  try {
    files = await fs.promises.readdir(reportsDir, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return { reports: [] };
    throw error;
  }

  const reports = (
    await Promise.all(
      files
        .filter((file) => file.isFile() && /^(smoke|scenario|connect|provider-live)-.+\.json$/.test(file.name))
        .map(async (file) => {
          const kind = xenesisReportKindFromFileName(file.name);
          if (!kind) return null;
          const raw = JSON.parse(await fs.promises.readFile(path.join(reportsDir, file.name), 'utf8')) as {
            id?: unknown;
            createdAt?: unknown;
            exitCode?: unknown;
            summary?: { total?: unknown; passed?: unknown; failed?: unknown };
          };
          return {
            kind,
            id: typeof raw.id === 'string' ? raw.id : file.name.slice(0, -'.json'.length),
            createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
            exitCode: typeof raw.exitCode === 'number' && Number.isFinite(raw.exitCode) ? raw.exitCode : 1,
            passed: typeof raw.summary?.passed === 'number' ? raw.summary.passed : 0,
            failed: typeof raw.summary?.failed === 'number' ? raw.summary.failed : 0,
            total: typeof raw.summary?.total === 'number' ? raw.summary.total : 0,
          } satisfies XenesisReportSummary;
        }),
    )
  )
    .filter((report): report is XenesisReportSummary => Boolean(report))
    .filter((report) => !normalized.kind || report.kind === normalized.kind)
    .filter(
      (report) =>
        !normalized.status ||
        (normalized.status === 'passed' ? xenesisReportPassed(report) : !xenesisReportPassed(report)),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return { reports: reports.slice(0, normalized.limit) };
}

function summarizeXenesisTaskRecord(value: unknown): XenesisTaskSummary | null {
  if (!isPlainRecord(value)) return null;
  const id = xenesisText(value.id);
  const status = xenesisText(value.status);
  const prompt = typeof value.prompt === 'string' ? value.prompt : '';
  const updatedAt =
    xenesisText(value.updatedAt) ||
    xenesisText(value.finishedAt) ||
    xenesisText(value.startedAt) ||
    xenesisText(value.createdAt);
  if (!id || !status || !updatedAt) return null;
  return {
    id,
    status,
    prompt,
    ...(xenesisText(value.sessionId) ? { sessionId: xenesisText(value.sessionId) } : {}),
    ...(xenesisText(value.parentSessionId) ? { parentSessionId: xenesisText(value.parentSessionId) } : {}),
    ...(xenesisText(value.source) ? { source: xenesisText(value.source) } : {}),
    ...(xenesisText(value.subagent) ? { subagent: xenesisText(value.subagent) } : {}),
    ...(xenesisText(value.label) ? { label: xenesisText(value.label) } : {}),
    ...(xenesisText(value.handoffId) ? { handoffId: xenesisText(value.handoffId) } : {}),
    ...(xenesisText(value.handoffTitle) ? { handoffTitle: xenesisText(value.handoffTitle) } : {}),
    ...(xenesisText(value.blockedReason) ? { blockedReason: xenesisText(value.blockedReason) } : {}),
    ...(typeof value.attempts === 'number' ? { attempts: value.attempts } : {}),
    ...(xenesisText(value.error) ? { error: xenesisText(value.error) } : {}),
    ...(xenesisText(value.output) ? { output: xenesisText(value.output) } : {}),
    ...(xenesisText(value.createdAt) ? { createdAt: xenesisText(value.createdAt) } : {}),
    ...(xenesisText(value.startedAt) ? { startedAt: xenesisText(value.startedAt) } : {}),
    ...(xenesisText(value.finishedAt) ? { finishedAt: xenesisText(value.finishedAt) } : {}),
    updatedAt,
  };
}

async function listXenesisAgentTasks(query?: XenesisTaskQuery): Promise<{ tasks: XenesisTaskSummary[] }> {
  const normalized = normalizeXenesisTaskQuery(query);
  const tasksPath = path.join(getXenesisStateHome(), 'agent_tasks.json');
  let raw: unknown;
  try {
    raw = JSON.parse(await fs.promises.readFile(tasksPath, 'utf8')) as unknown;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return { tasks: [] };
    throw error;
  }

  const records = Array.isArray(raw) ? raw : [];
  const tasks = records
    .map(summarizeXenesisTaskRecord)
    .filter((task): task is XenesisTaskSummary => Boolean(task))
    .filter((task) => !normalized.status || task.status === normalized.status)
    .filter((task) => !normalized.taskId || task.id === normalized.taskId)
    .filter((task) => xenesisContains(task.label, normalized.label))
    .filter((task) => !normalized.handoffId || task.handoffId === normalized.handoffId)
    .filter((task) => xenesisContains(task.handoffTitle, normalized.handoffTitle))
    .filter((task) => xenesisContains(task.source, normalized.source))
    .filter((task) => xenesisContains(task.subagent, normalized.subagent))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return { tasks: tasks.slice(0, normalized.limit) };
}

function summarizeXenesisReports(reports: XenesisReportSummary[]) {
  return {
    total: reports.length,
    passed: reports.filter(xenesisReportPassed).length,
    failed: reports.filter((report) => !xenesisReportPassed(report)).length,
  };
}

function summarizeXenesisTasks(tasks: XenesisTaskSummary[]): Record<XenesisTaskStatus, number> & { total: number } {
  const summary = {
    total: tasks.length,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    blocked: 0,
  };
  for (const task of tasks) {
    if (XENESIS_TASK_STATUSES.has(task.status as XenesisTaskStatus)) {
      summary[task.status as XenesisTaskStatus] += 1;
    }
  }
  return summary;
}

async function getXenesisOperationalDiagnostics(): Promise<XenesisOperationalDiagnostics> {
  const [status, reportResult, taskResult] = await Promise.all([
    getXenesisStatusPayload(),
    listXenesisReports({ limit: 20 }),
    listXenesisAgentTasks({ limit: 20 }),
  ]);
  return {
    updatedAt: new Date().toISOString(),
    xenesisHome: getXenesisStateHome(),
    workspace: getXenesisWorkspace(),
    status,
    reports: {
      summary: summarizeXenesisReports(reportResult.reports),
      reports: reportResult.reports,
    },
    tasks: {
      summary: summarizeXenesisTasks(taskResult.tasks),
      tasks: taskResult.tasks,
    },
  };
}

const DEFAULT_XENESIS_PROFILE_TEMPLATE = 'desk';

function cloneXenesisProfileConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function xenesisProfileTemplates(): XenesisProfileTemplate[] {
  return listOperatingProfileTemplates().map((template) => ({
    name: template.name,
    summary: template.summary,
  }));
}

function xenesisChannelEnvNames(name: XenesisChannelState['name'], channel: Record<string, unknown>): string[] {
  const read = (key: string): string | null => {
    const value = channel[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  };
  if (name === 'telegram') return [read('tokenEnv')].filter((value): value is string => Boolean(value));
  if (name === 'slack')
    return [read('botTokenEnv'), read('signingSecretEnv'), read('webhookUrlEnv')].filter((value): value is string =>
      Boolean(value),
    );
  if (name === 'discord')
    return [read('botTokenEnv'), read('webhookUrlEnv')].filter((value): value is string => Boolean(value));
  return [read('urlEnv')].filter((value): value is string => Boolean(value));
}

function isXenesisChannelCredentialConfigured(value: string): boolean {
  if (!isXenesisEnvName(value)) return true;
  return Boolean(process.env[value]);
}

function redactXenesisChannelCredentialReference(value: string): string {
  return isXenesisEnvName(value) ? value : '<secret>';
}

function redactXenesisChannelTargetList(value: string): string {
  return value.trim() ? '<configured>' : '';
}

function summarizeXenesisProfileChannels(profile: ProfileConfig | undefined): XenesisChannelState[] {
  const channels = isPlainRecord(profile?.channels) ? profile.channels : {};
  return (['telegram', 'slack', 'discord', 'webhook'] satisfies XenesisChannelState['name'][]).map((name) => {
    const channel = isPlainRecord(channels[name]) ? channels[name] : {};
    const env = xenesisChannelEnvNames(name, channel);
    return {
      name,
      enabled: channel.enabled === true,
      configured: env.length > 0 && env.some(isXenesisChannelCredentialConfigured),
      env,
    };
  });
}

function csvFromValues(values: unknown): string {
  return Array.isArray(values) ? values.map((value) => String(value)).join(', ') : '';
}

const DEFAULT_XENESIS_CHANNEL_APPROVAL_MODE: XenesisApprovalMode = 'safe';
const DEFAULT_XENESIS_CHANNEL_MAX_TURNS = 12;
const DEFAULT_XENESIS_CHANNEL_MAX_TOKENS = 120000;

function normalizeXenesisChannelApprovalMode(
  value: unknown,
  fallback: XenesisApprovalMode = DEFAULT_XENESIS_CHANNEL_APPROVAL_MODE,
): XenesisApprovalMode {
  return value === 'readonly' || value === 'safe' || value === 'auto' ? value : fallback;
}

function normalizeXenesisChannelPositiveInteger(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : fallback;
}

function xenesisChannelGuardrailSettings(
  channel: Record<string, unknown>,
  fallback?: Partial<XenesisChannelRunLimits>,
): XenesisChannelRunLimits {
  const approvalModeFallback = fallback?.approvalMode ?? DEFAULT_XENESIS_CHANNEL_APPROVAL_MODE;
  const maxTurnsFallback = normalizeXenesisChannelPositiveInteger(
    fallback?.maxTurns,
    DEFAULT_XENESIS_CHANNEL_MAX_TURNS,
  );
  const maxTokensFallback = normalizeXenesisChannelPositiveInteger(
    fallback?.maxTokens,
    DEFAULT_XENESIS_CHANNEL_MAX_TOKENS,
  );
  return {
    approvalMode: normalizeXenesisChannelApprovalMode(channel.approvalMode, approvalModeFallback),
    maxTurns: normalizeXenesisChannelPositiveInteger(channel.maxTurns, maxTurnsFallback),
    maxTokens: normalizeXenesisChannelPositiveInteger(channel.maxTokens, maxTokensFallback),
  };
}

function summarizeXenesisProfileChannelSettings(profile: ProfileConfig | undefined): XenesisProfileChannelSettings {
  const channels = isPlainRecord(profile?.channels) ? profile.channels : {};
  const telegram = isPlainRecord(channels.telegram) ? channels.telegram : {};
  const slack = isPlainRecord(channels.slack) ? channels.slack : {};
  const discord = isPlainRecord(channels.discord) ? channels.discord : {};
  const webhook = isPlainRecord(channels.webhook) ? channels.webhook : {};
  return {
    telegram: {
      enabled: telegram.enabled === true,
      ...xenesisChannelGuardrailSettings(telegram),
      tokenEnv:
        typeof telegram.tokenEnv === 'string' && telegram.tokenEnv.trim()
          ? telegram.tokenEnv.trim()
          : 'TELEGRAM_BOT_TOKEN',
      allowedChatIds: csvFromValues(telegram.allowedChatIds),
    },
    slack: {
      enabled: slack.enabled === true,
      ...xenesisChannelGuardrailSettings(slack),
      botTokenEnv:
        typeof slack.botTokenEnv === 'string' && slack.botTokenEnv.trim()
          ? slack.botTokenEnv.trim()
          : 'SLACK_BOT_TOKEN',
      signingSecretEnv:
        typeof slack.signingSecretEnv === 'string' && slack.signingSecretEnv.trim()
          ? slack.signingSecretEnv.trim()
          : 'SLACK_SIGNING_SECRET',
      webhookUrlEnv:
        typeof slack.webhookUrlEnv === 'string' && slack.webhookUrlEnv.trim()
          ? slack.webhookUrlEnv.trim()
          : 'SLACK_WEBHOOK_URL',
      allowedChannelIds: csvFromValues(slack.allowedChannelIds),
    },
    discord: {
      enabled: discord.enabled === true,
      ...xenesisChannelGuardrailSettings(discord),
      botTokenEnv:
        typeof discord.botTokenEnv === 'string' && discord.botTokenEnv.trim()
          ? discord.botTokenEnv.trim()
          : 'DISCORD_BOT_TOKEN',
      webhookUrlEnv:
        typeof discord.webhookUrlEnv === 'string' && discord.webhookUrlEnv.trim()
          ? discord.webhookUrlEnv.trim()
          : 'DISCORD_WEBHOOK_URL',
      allowedChannelIds: csvFromValues(discord.allowedChannelIds),
      allowedGuildIds: csvFromValues(discord.allowedGuildIds),
    },
    webhook: {
      enabled: webhook.enabled === true,
      ...xenesisChannelGuardrailSettings(webhook),
      urlEnv:
        typeof webhook.urlEnv === 'string' && webhook.urlEnv.trim() ? webhook.urlEnv.trim() : 'XENESIS_WEBHOOK_URL',
    },
  };
}

function redactXenesisProfileChannelSettingsForCapability(
  channelSettings: XenesisProfileChannelSettings,
): XenesisProfileChannelSettings {
  return {
    telegram: {
      ...channelSettings.telegram,
      tokenEnv: redactXenesisChannelCredentialReference(channelSettings.telegram.tokenEnv),
      allowedChatIds: redactXenesisChannelTargetList(channelSettings.telegram.allowedChatIds),
    },
    slack: {
      ...channelSettings.slack,
      botTokenEnv: redactXenesisChannelCredentialReference(channelSettings.slack.botTokenEnv),
      signingSecretEnv: redactXenesisChannelCredentialReference(channelSettings.slack.signingSecretEnv),
      webhookUrlEnv: redactXenesisChannelCredentialReference(channelSettings.slack.webhookUrlEnv),
      allowedChannelIds: redactXenesisChannelTargetList(channelSettings.slack.allowedChannelIds),
    },
    discord: {
      ...channelSettings.discord,
      botTokenEnv: redactXenesisChannelCredentialReference(channelSettings.discord.botTokenEnv),
      webhookUrlEnv: redactXenesisChannelCredentialReference(channelSettings.discord.webhookUrlEnv),
      allowedChannelIds: redactXenesisChannelTargetList(channelSettings.discord.allowedChannelIds),
      allowedGuildIds: redactXenesisChannelTargetList(channelSettings.discord.allowedGuildIds),
    },
    webhook: {
      ...channelSettings.webhook,
      urlEnv: redactXenesisChannelCredentialReference(channelSettings.webhook.urlEnv),
    },
  };
}

function redactXenesisProfileStateForCapability(profile: XenesisProfileState): XenesisProfileState {
  return {
    ...profile,
    channels: profile.channels.map((channel) => ({
      ...channel,
      env: channel.env.map(redactXenesisChannelCredentialReference),
    })),
    channelSettings: redactXenesisProfileChannelSettingsForCapability(profile.channelSettings),
  };
}

function redactXenesisStatusForCapability(status: XenesisStatus): XenesisStatus {
  return {
    ...status,
    profile: redactXenesisProfileStateForCapability(status.profile),
  };
}

function csvToStrings(value: unknown): string[] {
  return String(value ?? '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function csvToSafeIntegers(value: unknown): number[] {
  return csvToStrings(value)
    .filter((item) => /^-?\d+$/.test(item))
    .map((item) => Number(item))
    .filter((item) => Number.isSafeInteger(item));
}

function envName(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim();
  return text || fallback;
}

type XenesisChannelRunLimits = {
  approvalMode: NonNullable<ProfileConfig['approvalMode']>;
  maxTurns: number;
  maxTokens: number;
};

type NormalizedXenesisProfileChannels = {
  telegram: NonNullable<NonNullable<ProfileConfig['channels']>['telegram']> & XenesisChannelRunLimits;
  slack: NonNullable<NonNullable<ProfileConfig['channels']>['slack']> & XenesisChannelRunLimits;
  discord: NonNullable<NonNullable<ProfileConfig['channels']>['discord']> & XenesisChannelRunLimits;
  webhook: NonNullable<NonNullable<ProfileConfig['channels']>['webhook']> & XenesisChannelRunLimits;
};

function normalizeXenesisProfileChannelSettings(
  request: XenesisProfileChannelsUpdateRequest,
  previousChannels?: ProfileConfig['channels'],
): ProfileConfig['channels'] {
  const channels = (isPlainRecord(request?.channels) ? request.channels : {}) as Record<string, unknown>;
  const telegram = isPlainRecord(channels.telegram) ? channels.telegram : {};
  const slack = isPlainRecord(channels.slack) ? channels.slack : {};
  const discord = isPlainRecord(channels.discord) ? channels.discord : {};
  const webhook = isPlainRecord(channels.webhook) ? channels.webhook : {};
  const normalized: NormalizedXenesisProfileChannels = {
    telegram: {
      enabled: telegram.enabled === true,
      tokenEnv: envName(telegram.tokenEnv, 'TELEGRAM_BOT_TOKEN'),
      allowedChatIds: csvToSafeIntegers(telegram.allowedChatIds),
      ...xenesisChannelGuardrailSettings(telegram, previousChannels?.telegram),
    },
    slack: {
      enabled: slack.enabled === true,
      botTokenEnv: envName(slack.botTokenEnv, 'SLACK_BOT_TOKEN'),
      signingSecretEnv: envName(slack.signingSecretEnv, 'SLACK_SIGNING_SECRET'),
      allowedChannelIds: csvToStrings(slack.allowedChannelIds),
      webhookUrlEnv: envName(slack.webhookUrlEnv, 'SLACK_WEBHOOK_URL'),
      ...xenesisChannelGuardrailSettings(slack, previousChannels?.slack),
    },
    discord: {
      enabled: discord.enabled === true,
      botTokenEnv: envName(discord.botTokenEnv, 'DISCORD_BOT_TOKEN'),
      allowedChannelIds: csvToStrings(discord.allowedChannelIds),
      allowedGuildIds: csvToStrings(discord.allowedGuildIds),
      webhookUrlEnv: envName(discord.webhookUrlEnv, 'DISCORD_WEBHOOK_URL'),
      ...xenesisChannelGuardrailSettings(discord, previousChannels?.discord),
    },
    webhook: {
      enabled: webhook.enabled === true,
      urlEnv: envName(webhook.urlEnv, 'XENESIS_WEBHOOK_URL'),
      headers: {},
      ...xenesisChannelGuardrailSettings(webhook, previousChannels?.webhook),
    },
  };
  return normalized;
}

function summarizeXenesisProfilePolicy(profile: ProfileConfig | undefined): XenesisProfilePolicyState {
  return {
    workflow: typeof profile?.workflow === 'string' ? profile.workflow : 'default',
    approvalMode: profile?.approvalMode ?? 'safe',
    maxTurns: typeof profile?.maxTurns === 'number' && Number.isFinite(profile.maxTurns) ? profile.maxTurns : 0,
    providerRetries:
      typeof profile?.providerRetries === 'number' && Number.isFinite(profile.providerRetries)
        ? profile.providerRetries
        : 0,
    contextAutoCompact: profile?.context?.autoCompact === true,
    memoryEnabled: profile?.extensions?.memory?.enabled === true,
    subagentsEnabled: profile?.extensions?.subagents?.enabled === true,
    browserEnabled: profile?.browser?.enabled === true,
    verificationAutoRun: profile?.verification?.autoRun === true,
    verificationAutoFix: profile?.verification?.autoFix === true,
  };
}

function readXenesisProfilesSync(): ProfilesFile {
  try {
    const raw = fs.readFileSync(profilesPath(getXenesisStateHome()), 'utf8');
    const parsed = JSON.parse(raw) as Partial<ProfilesFile>;
    return {
      active: typeof parsed.active === 'string' ? parsed.active : undefined,
      profiles: isPlainRecord(parsed.profiles) ? (parsed.profiles as Record<string, ProfileConfig>) : {},
    };
  } catch {
    return { profiles: {} };
  }
}

function getXenesisProfileRunSnapshot(settings = loadSettings().xenesis): {
  name: string;
  policy: XenesisProfilePolicyState;
} {
  const profiles = readXenesisProfilesSync();
  const active = settings.profile || profiles.active || DEFAULT_XENESIS_PROFILE_TEMPLATE;
  const profile =
    profiles.profiles[active] ??
    (active === DEFAULT_XENESIS_PROFILE_TEMPLATE
      ? getOperatingProfileTemplate(DEFAULT_XENESIS_PROFILE_TEMPLATE)?.profile
      : undefined);
  return {
    name: active,
    policy: summarizeXenesisProfilePolicy(profile),
  };
}

async function getXenesisProfileState(): Promise<XenesisProfileState> {
  await ensureDefaultXenesisProfile();
  const settings = loadSettings().xenesis;
  const profiles = await readProfiles(getXenesisStateHome());
  const active = settings.profile || profiles.active || DEFAULT_XENESIS_PROFILE_TEMPLATE;
  const activeProfile = active ? profiles.profiles[active] : undefined;
  return {
    active,
    configured: settings.profile || DEFAULT_XENESIS_PROFILE_TEMPLATE,
    installed: Object.keys(profiles.profiles).sort((left, right) => left.localeCompare(right)),
    templates: xenesisProfileTemplates(),
    channels: summarizeXenesisProfileChannels(activeProfile),
    channelSettings: summarizeXenesisProfileChannelSettings(activeProfile),
    policy: summarizeXenesisProfilePolicy(active ? profiles.profiles[active] : undefined),
  };
}

function normalizeXenesisProfileName(value: unknown): string {
  return String(value || '').trim();
}

function persistActiveXenesisProfile(name: string): void {
  const settings = loadSettings().xenesis;
  persistSettings({
    xenesis: {
      ...settings,
      profile: name,
    },
  });
}

async function ensureDefaultXenesisProfile(): Promise<void> {
  const settings = loadSettings().xenesis;
  if (normalizeXenesisProfileName(settings.profile)) return;

  const profiles = await readProfiles(getXenesisStateHome());
  if (normalizeXenesisProfileName(profiles.active)) return;

  if (profiles.profiles[DEFAULT_XENESIS_PROFILE_TEMPLATE]) {
    profiles.active = DEFAULT_XENESIS_PROFILE_TEMPLATE;
    await writeProfiles(getXenesisStateHome(), profiles);
    persistActiveXenesisProfile(DEFAULT_XENESIS_PROFILE_TEMPLATE);
    if (embeddedXenesisService) embeddedXenesisService.updateOptions(embeddedXenesisOptions());
    return;
  }

  if (Object.keys(profiles.profiles).length > 0) return;

  const template = getOperatingProfileTemplate(DEFAULT_XENESIS_PROFILE_TEMPLATE);
  if (!template) return;

  profiles.profiles[DEFAULT_XENESIS_PROFILE_TEMPLATE] = cloneXenesisProfileConfig(template.profile);
  profiles.active = DEFAULT_XENESIS_PROFILE_TEMPLATE;
  await writeProfiles(getXenesisStateHome(), profiles);
  persistActiveXenesisProfile(DEFAULT_XENESIS_PROFILE_TEMPLATE);
  if (embeddedXenesisService) embeddedXenesisService.updateOptions(embeddedXenesisOptions());
}

async function useXenesisProfile(name: string): Promise<XenesisProfileState> {
  const profileName = normalizeXenesisProfileName(name);
  if (!profileName) {
    throw new Error('Xenesis profile name is required.');
  }
  const profiles = await readProfiles(getXenesisStateHome());
  if (!profiles.profiles[profileName]) {
    throw new Error(`Xenesis profile not found: ${profileName}`);
  }
  profiles.active = profileName;
  await writeProfiles(getXenesisStateHome(), profiles);
  persistActiveXenesisProfile(profileName);
  getEmbeddedXenesisService().updateOptions(embeddedXenesisOptions());
  return getXenesisProfileState();
}

async function installXenesisProfile(request: XenesisProfileInstallRequest): Promise<XenesisProfileState> {
  const templateName = normalizeXenesisProfileName(request?.template);
  if (!templateName) {
    throw new Error('Xenesis profile template is required.');
  }
  const template = getOperatingProfileTemplate(templateName);
  if (!template) {
    throw new Error(`Xenesis profile template not found: ${templateName}`);
  }
  const profileName = normalizeXenesisProfileName(request?.name) || template.name;
  const profiles = await readProfiles(getXenesisStateHome());
  profiles.profiles[profileName] = cloneXenesisProfileConfig(template.profile);
  if (request?.activate !== false) {
    profiles.active = profileName;
  }
  await writeProfiles(getXenesisStateHome(), profiles);
  if (request?.activate !== false) {
    persistActiveXenesisProfile(profileName);
    getEmbeddedXenesisService().updateOptions(embeddedXenesisOptions());
  }
  return getXenesisProfileState();
}

async function updateXenesisProfileChannels(
  request: XenesisProfileChannelsUpdateRequest,
): Promise<XenesisProfileState> {
  const profiles = await readProfiles(getXenesisStateHome());
  const profileName =
    normalizeXenesisProfileName(request?.profile) ||
    loadSettings().xenesis.profile ||
    profiles.active ||
    DEFAULT_XENESIS_PROFILE_TEMPLATE;
  const profile = profiles.profiles[profileName];
  if (!profile) {
    throw new Error(`Xenesis profile not found: ${profileName}`);
  }
  const nextChannels = normalizeXenesisProfileChannelSettings(
    request,
    profile.channels,
  ) as NormalizedXenesisProfileChannels;
  profiles.profiles[profileName] = {
    ...profile,
    channels: {
      telegram: nextChannels.telegram,
      slack: nextChannels.slack,
      discord: nextChannels.discord,
      webhook: nextChannels.webhook,
    },
  };
  profiles.active = profileName;
  await writeProfiles(getXenesisStateHome(), profiles);
  persistActiveXenesisProfile(profileName);
  getEmbeddedXenesisService().updateOptions(embeddedXenesisOptions());
  return getXenesisProfileState();
}

const XENESIS_PROFILE_CHANNEL_NAMES = ['telegram', 'slack', 'discord', 'webhook'] satisfies XenesisProfileChannelName[];
const XENESIS_ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isXenesisProfileChannelName(value: unknown): value is XenesisProfileChannelName {
  return typeof value === 'string' && XENESIS_PROFILE_CHANNEL_NAMES.includes(value as XenesisProfileChannelName);
}

function isXenesisEnvName(value: string): boolean {
  return XENESIS_ENV_NAME_PATTERN.test(value);
}

function readXenesisChannelSecret(value: unknown, fallback: string, label: string): { value: string; source: string } {
  const reference = String(value ?? '').trim() || fallback;
  if (isXenesisEnvName(reference)) {
    const secret = process.env[reference]?.trim();
    if (!secret) {
      throw new Error(`${label} env var is not set: ${reference}`);
    }
    return { value: secret, source: reference };
  }
  return { value: reference, source: 'direct value' };
}

function readOptionalXenesisChannelSecret(value: unknown, fallback: string): { source: string; value?: string } {
  const raw = String(value ?? '').trim();
  const reference = raw || fallback;
  if (isXenesisEnvName(reference)) {
    return {
      source: reference,
      value: process.env[reference]?.trim() || undefined,
    };
  }
  return {
    source: 'direct value',
    value: reference,
  };
}

function sanitizeXenesisChannelSendError(error: unknown, secrets: string[], label: string): Error {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets) {
    if (secret) message = message.split(secret).join('[secret]');
  }
  return new Error(`${label}: ${message}`);
}

async function runXenesisChannelSend(label: string, secrets: string[], send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (error) {
    throw sanitizeXenesisChannelSendError(error, secrets, label);
  }
}

function firstXenesisCsvValue(value: unknown, label: string): string {
  const first = csvToStrings(value)[0];
  if (!first) {
    throw new Error(`${label} is required.`);
  }
  return first;
}

function firstXenesisIntegerCsvValue(value: unknown, label: string): string {
  const first = firstXenesisCsvValue(value, label);
  const numeric = Number(first);
  if (!/^-?\d+$/.test(first) || !Number.isSafeInteger(numeric)) {
    throw new Error(`${label} must be a safe integer.`);
  }
  return first;
}

function buildXenesisProfileChannelTestMessage(
  profile: string,
  channel: XenesisProfileChannelName,
  override?: string,
): string {
  const custom = String(override ?? '').trim();
  if (custom) return custom;
  return [
    'Xenesis Desk external bot test',
    `profile: ${profile}`,
    `channel: ${channel}`,
    `time: ${new Date().toISOString()}`,
  ].join('\n');
}

async function sendTelegramChannelTest(
  channel: XenesisProfileChannelSettings['telegram'],
  message: string,
): Promise<string> {
  const token = readXenesisChannelSecret(channel.tokenEnv, 'TELEGRAM_BOT_TOKEN', 'Telegram token');
  const target = firstXenesisIntegerCsvValue(channel.allowedChatIds, 'Telegram chat id');
  const adapter = new TelegramAdapter({ token: token.value, allowedChatIds: [Number(target)] });
  await runXenesisChannelSend('Telegram test send failed', [token.value], () => adapter.send(target, message));
  return target;
}

async function sendSlackChannelTest(channel: XenesisProfileChannelSettings['slack'], message: string): Promise<string> {
  const webhook = readOptionalXenesisChannelSecret(channel.webhookUrlEnv, 'SLACK_WEBHOOK_URL');
  if (webhook.value) {
    const adapter = new SlackAdapter({ webhookUrl: webhook.value });
    await runXenesisChannelSend('Slack test send failed', [webhook.value], () => adapter.send('webhook', message));
    return `webhook:${webhook.source}`;
  }

  const botToken = readXenesisChannelSecret(channel.botTokenEnv, 'SLACK_BOT_TOKEN', 'Slack bot token');
  const target = firstXenesisCsvValue(channel.allowedChannelIds, 'Slack channel id');
  const adapter = new SlackAdapter({ botToken: botToken.value, allowedChannelIds: [target] });
  await runXenesisChannelSend('Slack test send failed', [botToken.value], () => adapter.send(target, message));
  return target;
}

async function sendDiscordChannelTest(
  channel: XenesisProfileChannelSettings['discord'],
  message: string,
): Promise<string> {
  const webhook = readOptionalXenesisChannelSecret(channel.webhookUrlEnv, 'DISCORD_WEBHOOK_URL');
  if (webhook.value) {
    const adapter = new DiscordAdapter({ webhookUrl: webhook.value });
    await runXenesisChannelSend('Discord test send failed', [webhook.value], () => adapter.send('webhook', message));
    return `webhook:${webhook.source}`;
  }

  const botToken = readXenesisChannelSecret(channel.botTokenEnv, 'DISCORD_BOT_TOKEN', 'Discord bot token');
  const target = firstXenesisCsvValue(channel.allowedChannelIds, 'Discord channel id');
  const adapter = new DiscordAdapter({
    botToken: botToken.value,
    allowedChannelIds: [target],
    allowedGuildIds: csvToStrings(channel.allowedGuildIds),
  });
  await runXenesisChannelSend('Discord test send failed', [botToken.value], () => adapter.send(target, message));
  return target;
}

async function sendWebhookChannelTest(
  channel: XenesisProfileChannelSettings['webhook'],
  message: string,
): Promise<string> {
  const url = readXenesisChannelSecret(channel.urlEnv, 'XENESIS_WEBHOOK_URL', 'Webhook URL');
  const adapter = new WebhookAdapter({ url: url.value });
  await runXenesisChannelSend('Webhook test send failed', [url.value], () => adapter.send('test', message));
  return `webhook:${url.source}`;
}

async function testXenesisProfileChannel(
  request: XenesisProfileChannelTestRequest,
): Promise<XenesisProfileChannelTestResult> {
  const channel = request?.channel;
  if (!isXenesisProfileChannelName(channel)) {
    throw new Error('Xenesis profile channel is required.');
  }
  if (!isPlainRecord(request?.channels) || !isPlainRecord(request.channels[channel])) {
    throw new Error(`Xenesis ${channel} channel settings are required.`);
  }

  const profiles = await readProfiles(getXenesisStateHome());
  const profile =
    normalizeXenesisProfileName(request?.profile) ||
    loadSettings().xenesis.profile ||
    profiles.active ||
    DEFAULT_XENESIS_PROFILE_TEMPLATE;
  const testMessage = buildXenesisProfileChannelTestMessage(profile, channel, request?.message);

  let target: string;
  if (channel === 'telegram') {
    target = await sendTelegramChannelTest(request.channels.telegram, testMessage);
  } else if (channel === 'slack') {
    target = await sendSlackChannelTest(request.channels.slack, testMessage);
  } else if (channel === 'discord') {
    target = await sendDiscordChannelTest(request.channels.discord, testMessage);
  } else {
    target = await sendWebhookChannelTest(request.channels.webhook, testMessage);
  }

  return {
    ok: true,
    channel,
    profile,
    target,
    message: `Xenesis ${channel} test message sent to ${target}.`,
  };
}

async function setXenesisActiveWorkspace(workspacePath: unknown): Promise<XenesisStatus> {
  const normalized = normalizeXenesisWorkspacePath(workspacePath);
  if (normalized) activeXenesisWorkspace = normalized;
  if ((getXenesisRuntimeMode() === 'externalGateway' || getXenesisGatewaySettings().enabled) && normalized) {
    xenesisGatewayWorkspace = normalized;
  }
  if (embeddedXenesisService && normalized) {
    embeddedXenesisService.setWorkspace(normalized);
  }
  return getXenesisStatusPayload();
}

function embeddedXenesisOptions(): XenesisEmbeddedAgentServiceOptions {
  const appSettings = loadSettings();
  const settings = appSettings.xenesis;
  const workspace = getXenesisWorkspace();
  const xenesisHome = getXenesisStateHome();
  const mcpBridgeReady = settings.mcpEnabled && Boolean(mcpBridgeServer);
  const providerRuntime = buildXenesisProviderRuntimeOptions({
    xenesisSettings: settings,
    aiProvider: appSettings.aiProvider,
    env: process.env,
  });
  const profileSnapshot = getXenesisProfileRunSnapshot(settings);
  // User-configurable Desk-agent reasoning effort (Settings > AI provider),
  // separate from the user's global ~/.codex/config.toml. When set (not
  // 'default') and the provider is codex, pin model_reasoning_effort for the
  // embedded run so the Desk agent does not inherit a slow global xhigh for
  // simple CR routing. 'default' -> no injection (codex config applies).
  const deskReasoningEffort = appSettings.aiProvider.reasoningEffort;
  const codexReasoningEnv =
    (providerRuntime.provider || '').startsWith('codex') &&
    deskReasoningEffort &&
    deskReasoningEffort !== 'default'
      ? {
          XENESIS_CODEX_APP_SERVER_ARGS:
            process.env.XENESIS_CODEX_APP_SERVER_ARGS ??
            `app-server --stdio -c model_reasoning_effort=${deskReasoningEffort}`,
          XENESIS_CODEX_CLI_ARGS:
            process.env.XENESIS_CODEX_CLI_ARGS ??
            `exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=${deskReasoningEffort} -`,
        }
      : {};

  return {
    enabled: settings.enabled,
    xenesisHome,
    runtimePath: resolveConfiguredXenesisRuntime(settings) || 'embedded',
    workspace,
    // When the Desk MCP bridge is up, hand the embedded provider (codex/claude)
    // the bridge state file + server path so resolveDeskMcpConfig configures the
    // Desk CR MCP tools. Without these the agent has no xd.* tools and no CR
    // instruction, so it falls back to native file/shell exploration.
    // NOTE: must be the explicit bridge paths — XENESIS_HOME is ~/.xenis/xenesis
    // (resolveXenesisStateHome appends 'xenesis'), which does NOT match the
    // ~/.xenis/mcp bridge dir, so deriving from XENESIS_HOME would not resolve.
    env: {
      ...process.env,
      ...providerRuntime.env,
      ...(mcpBridgeReady
        ? {
            XENIS_MCP_STATE_FILE: getMcpBridgeStateFilePath(),
            XENIS_MCP_SERVER_PATH: getMcpServerScriptPath(),
            // First codex+MCP turn cold-starts the app-server, the Desk MCP
            // server, and codex's configured MCP servers, and can emit no stream
            // event for minutes before completing. The default 60s stream-idle
            // watchdog (AgentRunner STREAM_IDLE_MS) would abort that working run,
            // so give codex+MCP runs a larger idle window (explicit override wins).
            XENESIS_STREAM_IDLE_MS: process.env.XENESIS_STREAM_IDLE_MS ?? '300000',
            // The codex app-server per-turn timeout defaults to 120s
            // (DEFAULT_PERSISTENT_CLI_TURN_TIMEOUT_MS). A deep-reasoning turn
            // (e.g. the user's model_reasoning_effort="xhigh") routinely exceeds
            // 120s and would be killed mid-reasoning with "turn timed out after
            // 120000ms". Give codex+MCP turns a much larger ceiling so slow,
            // high-effort turns complete. (Lower effort in ~/.codex/config.toml to
            // make turns faster; this only raises the kill ceiling.)
            XENESIS_CODEX_APP_SERVER_TIMEOUT_MS:
              process.env.XENESIS_CODEX_APP_SERVER_TIMEOUT_MS ?? '600000',
          }
        : {}),
      ...codexReasoningEnv,
    },
    providerRuntime,
    approvalMode: settings.approvalMode,
    maxTurns: settings.maxTurns,
    profileName: profileSnapshot.name,
    profilePolicy: profileSnapshot.policy,
    bridgeUrl: mcpBridgeReady ? getMcpBridgeUrl() : '',
    bridgeToken: mcpBridgeReady ? mcpBridgeToken : '',
    onEvent: (event) => {
      recordXenesisRunEventObservation(mainWindowRef, event);
      mainWindowRef?.webContents.send('xenesis:run-event', event);
    },
  };
}

function buildXenesisProviderRuntimeStatus(): XenesisProviderRuntimeStatus {
  const appSettings = loadSettings();
  const providerRuntime = buildXenesisProviderRuntimeOptions({
    xenesisSettings: appSettings.xenesis,
    aiProvider: appSettings.aiProvider,
    env: process.env,
  });
  return {
    provider: providerRuntime.provider,
    model: providerRuntime.model,
    profile: providerRuntime.profile,
    baseURL: providerRuntime.baseURL,
    apiKeyEnv: providerRuntime.apiKeyEnv,
  };
}

function getEmbeddedXenesisService(): XenesisEmbeddedAgentService {
  if (!embeddedXenesisService) {
    embeddedXenesisService = new XenesisEmbeddedAgentService(embeddedXenesisOptions());
  } else {
    embeddedXenesisService.updateOptions(embeddedXenesisOptions());
  }
  return embeddedXenesisService;
}

function getXenesisRuntimeMode(settings = loadSettings().xenesis): XenesisRuntimeMode {
  return settings.runtimeMode === 'externalGateway' ? 'externalGateway' : 'embedded';
}

function getXenesisGatewaySettings(settings = loadSettings().xenesis): XenesisGatewaySettings {
  return getXenesisRuntimeMode(settings) === 'externalGateway'
    ? { ...settings.gateway, enabled: true }
    : settings.gateway;
}

function resolveConfiguredXenesisRuntime(settings = loadSettings().xenesis): string {
  return resolveXenesisRuntimePath({
    settingsPath: settings.runtimePath,
    env: process.env,
    appIsPackaged: app.isPackaged,
    dirname: __dirname,
    resourcesPath: process.resourcesPath,
    existsSync: fs.existsSync,
  });
}

function xenesisSettingsChanged(before: XenesisRuntimeSettings, after: XenesisRuntimeSettings): boolean {
  return (
    before.enabled !== after.enabled ||
    before.runtimeMode !== after.runtimeMode ||
    before.runtimePath !== after.runtimePath ||
    before.host !== after.host ||
    before.port !== after.port ||
    before.approvalMode !== after.approvalMode ||
    before.maxTurns !== after.maxTurns ||
    before.model !== after.model ||
    before.profile !== after.profile ||
    before.mcpEnabled !== after.mcpEnabled ||
    JSON.stringify(before.gateway) !== JSON.stringify(after.gateway)
  );
}

async function buildCurrentXenesisLaunch() {
  const appSettings = loadSettings();
  const settings = appSettings.xenesis;
  const gateway = getXenesisGatewaySettings(settings);
  const runtimePath = resolveConfiguredXenesisRuntime(settings);
  const host = gateway.host || SETTINGS_DEFAULT.xenesis.gateway.host;
  const portResolution = await resolveXenesisGatewayPort({
    configuredPort: gateway.port,
    host,
  });
  const port = portResolution.port;
  xenesisLastPortFallback = portResolution.fallbackReason;
  const workspace = getXenesisWorkspace();
  const xenesisHome = getXenesisStateHome();
  const mcpBridgeReady = gateway.mcpEnabled && Boolean(mcpBridgeServer);
  const providerRuntime = buildXenesisProviderRuntimeOptions({
    xenesisSettings: settings,
    aiProvider: appSettings.aiProvider,
    env: process.env,
  });
  const resolvedGatewayToken = getCurrentXenesisGatewayToken();

  return buildXenesisGatewayLaunch({
    runtimePath,
    stateHome: xenesisHome,
    workspace,
    host,
    port,
    token: resolvedGatewayToken,
    bridgeUrl: mcpBridgeReady ? getMcpBridgeUrl() : '',
    bridgeToken: mcpBridgeReady ? mcpBridgeToken : '',
    profile: providerRuntime.profile,
    provider: providerRuntime.provider,
    model: providerRuntime.model,
    baseURL: providerRuntime.baseURL,
    apiKeyEnv: providerRuntime.apiKeyEnv,
    env: { ...process.env, ...providerRuntime.env },
    existsSync: fs.existsSync,
  });
}

async function probeXenesisGatewayReady(url: string): Promise<{ ready: boolean; error: string }> {
  if (!url) {
    return { ready: false, error: 'Xenesis gateway URL is not available.' };
  }
  try {
    await readGatewayJson(url, getCurrentXenesisGatewayToken(), '/status', 750);
    return { ready: true, error: '' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ready: false, error: `Xenesis gateway is not ready or reachable: ${detail}` };
  }
}

const XENESIS_GATEWAY_CHANNEL_NAMES: XenesisGatewayChannelName[] = ['telegram', 'slack', 'discord', 'webhook'];
const XENESIS_GATEWAY_CHANNEL_RUNTIME_STATUSES = new Set<XenesisGatewayChannelRuntimeStatus>([
  'disabled',
  'blocked',
  'ready',
  'error',
]);

function normalizeGatewayStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeGatewayRuntimeStatus(value: unknown): XenesisGatewayChannelRuntimeStatus {
  return typeof value === 'string' &&
    XENESIS_GATEWAY_CHANNEL_RUNTIME_STATUSES.has(value as XenesisGatewayChannelRuntimeStatus)
    ? (value as XenesisGatewayChannelRuntimeStatus)
    : 'blocked';
}

function normalizeGatewayChannelStatus(
  name: XenesisGatewayChannelName,
  value: unknown,
): XenesisGatewayChannelStatus | undefined {
  if (!isPlainRecord(value)) return undefined;
  return {
    name,
    enabled: value.enabled === true,
    ready: value.ready === true,
    runtimeStatus: normalizeGatewayRuntimeStatus(value.runtimeStatus),
    missingEnv: normalizeGatewayStringList(value.missingEnv),
    warnings: normalizeGatewayStringList(value.warnings),
    safeToDeliver: value.safeToDeliver === true,
    approvalMode: typeof value.approvalMode === 'string' ? value.approvalMode : '',
    maxTurns: typeof value.maxTurns === 'number' && Number.isFinite(value.maxTurns) ? value.maxTurns : 0,
    maxTokens: typeof value.maxTokens === 'number' && Number.isFinite(value.maxTokens) ? value.maxTokens : 0,
    ...(isPlainRecord(value.lastError) &&
    typeof value.lastError.message === 'string' &&
    typeof value.lastError.at === 'string'
      ? { lastError: { message: value.lastError.message, at: value.lastError.at } }
      : {}),
  };
}

function normalizeGatewayChannelsStatus(value: unknown): XenesisGatewayChannelsStatus | undefined {
  if (!isPlainRecord(value)) return undefined;
  const items = XENESIS_GATEWAY_CHANNEL_NAMES.map((name) => normalizeGatewayChannelStatus(name, value[name])).filter(
    (item): item is XenesisGatewayChannelStatus => Boolean(item),
  );
  if (items.length === 0) return undefined;
  return {
    total: items.length,
    enabled: items.filter((channel) => channel.enabled).length,
    ready: items.filter((channel) => channel.ready).length,
    blocked: items.filter((channel) => channel.enabled && !channel.ready).length,
    disabled: items.filter((channel) => !channel.enabled).length,
    items,
    ...(items.find((channel) => channel.name === 'telegram')
      ? { telegram: items.find((channel) => channel.name === 'telegram') }
      : {}),
    ...(items.find((channel) => channel.name === 'slack')
      ? { slack: items.find((channel) => channel.name === 'slack') }
      : {}),
    ...(items.find((channel) => channel.name === 'discord')
      ? { discord: items.find((channel) => channel.name === 'discord') }
      : {}),
    ...(items.find((channel) => channel.name === 'webhook')
      ? { webhook: items.find((channel) => channel.name === 'webhook') }
      : {}),
  };
}

function recordXenesisGatewayChannelDiagnostics(channels: XenesisGatewayChannelsStatus): void {
  for (const channel of channels.items) {
    const lastError = channel.lastError;
    if (!lastError) {
      xenesisGatewayChannelDiagnosticKeys.delete(channel.name);
      continue;
    }
    const key = lastError.message;
    if (xenesisGatewayChannelDiagnosticKeys.get(channel.name) === key) continue;
    xenesisGatewayChannelDiagnosticKeys.set(channel.name, key);
    recordDiagnosticLog({
      level: 'warn',
      source: 'main',
      scope: 'xenesis-gateway',
      message: `${channel.name} channel error`,
      detail: `${lastError.message}\nat: ${lastError.at}`,
    });
  }
}

async function readXenesisGatewayChannelsStatus(
  gateway: XenesisGatewayStatus,
): Promise<XenesisGatewayChannelsStatus | undefined> {
  if (!gateway.running || !gateway.url) return undefined;
  try {
    const status = await readGatewayJson(gateway.url, getCurrentXenesisGatewayToken(), '/status', 750);
    const channels = normalizeGatewayChannelsStatus(isPlainRecord(status) ? status.channels : undefined);
    if (channels) recordXenesisGatewayChannelDiagnostics(channels);
    return channels;
  } catch {
    return undefined;
  }
}

async function enrichXenesisStatusWithGatewayChannels<T extends XenesisStatusWithoutProfile>(status: T): Promise<T> {
  const channels = await readXenesisGatewayChannelsStatus(status.gateway);
  if (!channels) return status;
  return {
    ...status,
    gateway: {
      ...status.gateway,
      channels,
    },
  };
}

function xenesisUpdatedAtFromStatus(serviceStatus: XenesisInternalStatus): string {
  const timestamp =
    typeof serviceStatus.stoppedAt === 'number'
      ? serviceStatus.stoppedAt
      : typeof serviceStatus.startedAt === 'number'
        ? serviceStatus.startedAt
        : undefined;
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    return new Date(timestamp).toISOString();
  }
  return new Date().toISOString();
}

async function getXenesisStatusPayload(): Promise<XenesisStatus> {
  const base =
    getXenesisRuntimeMode() === 'externalGateway'
      ? getExternalXenesisGatewayStatusPayload()
      : getEmbeddedXenesisStatusPayload();
  const enriched = await enrichXenesisStatusWithGatewayChannels(base);
  return {
    ...enriched,
    profile: await getXenesisProfileState(),
  };
}

async function startEmbeddedXenesisRuntime(): Promise<XenesisStatus> {
  getEmbeddedXenesisService().start();
  return getXenesisStatusPayload();
}

async function stopEmbeddedXenesisRuntime(): Promise<XenesisStatus> {
  getEmbeddedXenesisService().stop();
  return getXenesisStatusPayload();
}

function getEmbeddedXenesisStatusPayload(): XenesisStatusWithoutProfile {
  return getEmbeddedXenesisService().status(getXenesisGatewayStatusPayload());
}

function getExternalXenesisGatewayStatusPayload(): XenesisStatusWithoutProfile {
  const settings = loadSettings().xenesis;
  const gateway = getXenesisGatewayStatusPayload();
  const serviceStatus = xenesisService.getStatus();
  const running = serviceStatus.state === 'running';
  const runtimePath = resolveConfiguredXenesisRuntime(settings);
  const url = serviceStatus.url || xenesisGatewayUrl;
  const error = serviceStatus.error || xenesisLastError || xenesisLastPortFallback;

  return {
    ok: settings.enabled && running && !error,
    running,
    managed: true,
    enabled: settings.enabled,
    runtimeMode: 'externalGateway',
    url,
    ...(typeof serviceStatus.pid === 'number' ? { pid: serviceStatus.pid } : {}),
    runtimePath,
    xenesisHome: getXenesisStateHome(),
    workspace: xenesisGatewayWorkspace || getXenesisWorkspace(),
    providerRuntime: buildXenesisProviderRuntimeStatus(),
    error,
    updatedAt: xenesisUpdatedAtFromStatus(serviceStatus),
    gateway,
  };
}

async function startExternalXenesisGatewayRuntime(): Promise<XenesisStatus> {
  return startXenesisGatewayRuntime();
}

function getXenesisGatewayStatusPayload(): XenesisGatewayStatus {
  const settings = loadSettings().xenesis;
  const gateway = getXenesisGatewaySettings(settings);
  const serviceStatus = xenesisService.getStatus();
  const running = serviceStatus.state === 'running';
  const error = serviceStatus.error || xenesisLastError || xenesisLastPortFallback;

  return {
    enabled: settings.enabled && gateway.enabled,
    running,
    managed: true,
    url: serviceStatus.url || xenesisGatewayUrl,
    ...(typeof serviceStatus.pid === 'number' ? { pid: serviceStatus.pid } : {}),
    host: gateway.host,
    port: serviceStatus.port || xenesisGatewayPort || gateway.port,
    workspace: xenesisGatewayWorkspace || getXenesisWorkspace(),
    error,
    updatedAt: xenesisUpdatedAtFromStatus(serviceStatus),
  };
}

async function openXenesisGatewayDashboard(): Promise<XenesisStatus> {
  const status = await getXenesisStatusPayload();
  const gateway = status.gateway;
  if (!gateway.running || !gateway.url) {
    xenesisLastError = gateway.error || 'Xenesis gateway is not running.';
    return getXenesisStatusPayload();
  }

  try {
    const dashboardUrl = new URL('/dashboard', gateway.url);
    const token = getCurrentXenesisGatewayToken();
    if (token) dashboardUrl.searchParams.set('token', token);
    if (!emitMcpOpenBrowser({ url: dashboardUrl.toString(), placement: 'tab' })) {
      throw new Error('Xenesis Desk renderer window is not available.');
    }
    xenesisLastError = '';
  } catch (error) {
    xenesisLastError = error instanceof Error ? error.message : String(error);
  }

  return getXenesisStatusPayload();
}

async function startXenesisGatewayRuntime(): Promise<XenesisStatus> {
  return observeMainAsyncOperation(
    getMainObservabilityWindow(mainWindowRef),
    {
      activity: {
        source: 'gateway',
        label: 'xenesis.gateway.sidecar.start',
      },
    },
    async () => {
      const settings = loadSettings().xenesis;
      const gateway = getXenesisGatewaySettings(settings);
      if (!settings.enabled) {
        xenesisLastError = 'Xenesis is disabled in settings.';
        return getXenesisStatusPayload();
      }

      if (!gateway.enabled) {
        xenesisLastError = '';
        return getXenesisStatusPayload();
      }

      const launch = await buildCurrentXenesisLaunch();
      if (!launch.ok) {
        xenesisLastError = launch.error;
      }
      const serviceStatus = xenesisService.start(launch);
      if (launch.ok) {
        xenesisGatewayUrl = serviceStatus.url || launch.url;
        xenesisGatewayPort = serviceStatus.port || launch.port;
        xenesisGatewayWorkspace = launch.cwd;
        const ready = await waitForGatewayReady(xenesisGatewayUrl, getCurrentXenesisGatewayToken(), {
          timeoutMs: 5000,
        });
        xenesisLastError = ready.ready ? '' : ready.error;
      }
      return getXenesisStatusPayload();
    },
  );
}

async function stopExternalXenesisGatewayRuntime(): Promise<XenesisStatus> {
  return stopXenesisGatewayRuntime();
}

async function stopXenesisGatewayRuntime(): Promise<XenesisStatus> {
  return observeMainAsyncOperation(
    getMainObservabilityWindow(mainWindowRef),
    {
      activity: {
        source: 'gateway',
        label: 'xenesis.gateway.sidecar.stop',
      },
    },
    async () => {
      xenesisService.stop();
      xenesisGatewayUrl = '';
      xenesisGatewayPort = 0;
      xenesisLastError = '';
      xenesisLastPortFallback = '';
      return getXenesisStatusPayload();
    },
  );
}

async function startXenesisRuntime(): Promise<XenesisStatus> {
  await ensureDefaultXenesisProfile();
  return getXenesisRuntimeMode() === 'externalGateway'
    ? startExternalXenesisGatewayRuntime()
    : startEmbeddedXenesisRuntime();
}

async function stopXenesisRuntime(): Promise<XenesisStatus> {
  return getXenesisRuntimeMode() === 'externalGateway'
    ? stopExternalXenesisGatewayRuntime()
    : stopEmbeddedXenesisRuntime();
}

async function waitForXenesisStopped(timeoutMs = 3000): Promise<void> {
  void timeoutMs;
}

async function restartXenesisRuntime(): Promise<XenesisStatus> {
  await stopXenesisRuntime();
  return startXenesisRuntime();
}

async function cancelXenesisRuntime(): Promise<XenesisStatus> {
  getEmbeddedXenesisService().cancel();
  return getXenesisStatusPayload();
}

async function resetXenesisSession(): Promise<XenesisStatus> {
  getEmbeddedXenesisService().resetSession();
  return getXenesisStatusPayload();
}

const xenesisRunModes = new Set<XenesisRunRequest['mode']>(['chat', 'plan', 'work']);

interface XenesisRunProviderRuntimeOverride {
  provider?: string;
  model?: string;
  profile?: string;
  baseURL?: string;
  apiKeyEnv?: string;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeXenesisRunProviderRuntime(
  raw: Record<string, unknown>,
): XenesisRunProviderRuntimeOverride | undefined {
  const provider = optionalXenesisText(raw.provider);
  const model = optionalXenesisText(raw.model);
  const profile = optionalXenesisText(raw.providerProfile) ?? optionalXenesisText(raw.profile);
  const baseURL = optionalXenesisText(raw.baseURL) ?? optionalXenesisText(raw.baseUrl);
  const apiKeyEnv = optionalXenesisText(raw.apiKeyEnv);
  const providerRuntime: XenesisRunProviderRuntimeOverride = {
    ...(provider ? { provider } : {}),
    ...(model ? { model } : {}),
    ...(profile ? { profile } : {}),
    ...(baseURL ? { baseURL } : {}),
    ...(apiKeyEnv ? { apiKeyEnv } : {}),
  };
  return Object.keys(providerRuntime).length > 0 ? providerRuntime : undefined;
}

function normalizeXenesisRunAttachments(raw: unknown): XenesisRunRequest['attachments'] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const attachments: NonNullable<XenesisRunRequest['attachments']> = [];
  for (const item of raw) {
    if (!isPlainRecord(item)) continue;
    const kind = item.kind === 'image' || item.kind === 'file' ? item.kind : undefined;
    const name = optionalXenesisText(item.name);
    if (!kind || !name) continue;
    const attachment: NonNullable<XenesisRunRequest['attachments']>[number] = { kind, name };
    const mimeType = optionalXenesisText(item.mimeType);
    const path = optionalXenesisText(item.path);
    const dataUrl = optionalXenesisText(item.dataUrl);
    const text = typeof item.text === 'string' && item.text.trim() ? item.text : undefined;
    if (mimeType) attachment.mimeType = mimeType;
    if (typeof item.size === 'number' && Number.isFinite(item.size) && item.size >= 0) {
      attachment.size = item.size;
    }
    if (path) attachment.path = path;
    if (dataUrl) attachment.dataUrl = dataUrl;
    if (text) attachment.text = text;
    attachments.push(attachment);
    if (attachments.length >= 12) break;
  }
  return attachments.length ? attachments : undefined;
}

function normalizeXenesisRunRequest(request: XenesisRunRequest):
  | {
      ok: true;
      prompt: string;
      attachments?: XenesisRunRequest['attachments'];
      workflow?: string;
      source: string;
      mode?: XenesisRunRequest['mode'];
      sessionId?: string;
      historyMessages?: XenesisRunRequest['historyMessages'];
      stream: boolean;
      context: Record<string, unknown>;
      providerRuntime?: XenesisRunProviderRuntimeOverride;
    }
  | {
      ok: false;
      error: string;
    } {
  const raw: Record<string, unknown> = isPlainRecord(request) ? request : {};
  const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : '';
  if (!prompt) {
    return { ok: false, error: 'Xenesis prompt is required.' };
  }

  const mode =
    typeof raw.mode === 'string' && xenesisRunModes.has(raw.mode as XenesisRunRequest['mode'])
      ? (raw.mode as XenesisRunRequest['mode'])
      : undefined;
  const source = typeof raw.source === 'string' && raw.source.trim() ? raw.source.trim() : 'xenesis-desk';
  const workflow = typeof raw.workflow === 'string' && raw.workflow.trim() ? raw.workflow.trim() : undefined;
  const sessionId = typeof raw.sessionId === 'string' && raw.sessionId.trim() ? raw.sessionId.trim() : undefined;
  const historyMessages = Array.isArray(raw.historyMessages)
    ? raw.historyMessages
        .filter(
          (item) =>
            isPlainRecord(item) &&
            (item.role === 'system' || item.role === 'user' || item.role === 'assistant') &&
            typeof item.content === 'string' &&
            item.content.trim(),
        )
        .map((item) => ({
          role: item.role as 'system' | 'user' | 'assistant',
          content: String(item.content).trim(),
        }))
        .slice(-24)
    : undefined;
  const context = isPlainRecord(raw.context) ? raw.context : {};
  const providerRuntime = normalizeXenesisRunProviderRuntime(raw);
  const attachments = normalizeXenesisRunAttachments(raw.attachments);
  const stream = raw.stream === false ? false : true;

  return {
    ok: true,
    prompt,
    ...(attachments?.length ? { attachments } : {}),
    ...(workflow ? { workflow } : {}),
    source,
    ...(mode ? { mode } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(historyMessages?.length ? { historyMessages } : {}),
    stream,
    context,
    ...(providerRuntime ? { providerRuntime } : {}),
  };
}

function optionalXenesisText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function copyXenesisArtifacts(value: unknown): McpBridgeBotArtifact[] {
  if (!Array.isArray(value)) return [];
  const artifacts: McpBridgeBotArtifact[] = [];
  for (const item of value) {
    if (!isPlainRecord(item)) continue;
    const filePath = optionalXenesisText(item.filePath) ?? optionalXenesisText(item.path);
    const title =
      optionalXenesisText(item.title) ?? optionalXenesisText(item.name) ?? optionalXenesisText(item.label) ?? filePath;
    const kind = optionalXenesisText(item.kind) ?? optionalXenesisText(item.type);
    const openCommand = optionalXenesisText(item.openCommand);
    const focusCommand = optionalXenesisText(item.focusCommand);
    if (!title && !filePath && !kind) continue;
    artifacts.push({
      ...(title ? { title } : {}),
      ...(kind ? { kind } : {}),
      ...(filePath ? { filePath } : {}),
      ...(openCommand ? { openCommand } : {}),
      ...(focusCommand ? { focusCommand } : {}),
    });
  }
  return artifacts.slice(0, 100);
}

function xenesisRunResultFromGatewayResponse(response: unknown): XenesisRunResult {
  const raw = isPlainRecord(response) ? response : {};
  const result: XenesisRunResult = {
    ok: raw.ok === false ? false : true,
  };

  if (typeof raw.id === 'string') result.id = raw.id;
  if (typeof raw.traceId === 'string') result.traceId = raw.traceId;
  if (typeof raw.sessionId === 'string') result.sessionId = raw.sessionId;
  if (typeof raw.output === 'string') result.output = raw.output;
  if (typeof raw.doneContent === 'string') result.doneContent = raw.doneContent;
  if (typeof raw.errors === 'string') result.errors = raw.errors;
  if (typeof raw.error === 'string') result.error = raw.error;
  if (Array.isArray(raw.events)) result.events = raw.events;
  if (typeof raw.exitCode === 'number' && Number.isFinite(raw.exitCode)) {
    result.exitCode = raw.exitCode;
  }
  result.artifacts = copyXenesisArtifacts(raw.artifacts);
  if (result.artifacts.length === 0) delete result.artifacts;
  if (!result.ok && !result.error) {
    result.error = result.errors || 'Xenesis run failed.';
  }

  return result;
}

function recordXenesisRunSuccess(result: XenesisRunResult): void {
  recordDiagnosticLog({
    level: 'info',
    source: 'main',
    scope: 'xenesis',
    message: 'Xenesis run completed',
    detail: JSON.stringify({
      id: result.id || '',
      traceId: result.traceId || '',
      sessionId: result.sessionId || '',
      artifactCount: result.artifacts?.length ?? 0,
    }),
  });
}

function recordXenesisRunFailure(message: string): void {
  recordDiagnosticLog({
    level: 'error',
    source: 'main',
    scope: 'xenesis',
    message: 'Xenesis run failed',
    detail: message,
  });
}

async function runXenesisEmbeddedRequest(
  request: XenesisRunRequest,
  emitEvent?: (event: XenesisRunEvent) => void,
): Promise<XenesisRunResult> {
  const normalized = normalizeXenesisRunRequest(request);
  if (!normalized.ok) {
    emitEvent?.({ event: 'gateway_error', data: { error: normalized.error } });
    recordXenesisRunFailure(normalized.error);
    return { ok: false, error: normalized.error };
  }

  const status = await startXenesisRuntime();
  if (!status.running || !status.ok) {
    const message = status.error || 'Xenesis runtime is not ready.';
    emitEvent?.({ event: 'gateway_error', data: { error: message } });
    recordXenesisRunFailure(message);
    return { ok: false, error: message };
  }

  const result = await getEmbeddedXenesisService().run({
    prompt: normalized.prompt,
    workspace: status.workspace,
    workflow: normalized.workflow || 'xenis',
    source: normalized.source,
    mode: normalized.mode,
    sessionId: normalized.sessionId,
    historyMessages: normalized.historyMessages,
    attachments: normalized.attachments,
    stream: normalized.stream,
    context: normalized.context,
    ...(normalized.providerRuntime ? { providerRuntime: normalized.providerRuntime } : {}),
  });

  if (!result.ok) {
    const message = result.error || result.errors || 'Xenesis run failed.';
    emitEvent?.({ event: 'gateway_error', data: result });
    recordXenesisRunFailure(message);
    return result;
  }

  emitEvent?.({ event: 'gateway_done', data: result });
  recordXenesisRunSuccess(result);
  return result;
}

async function runXenesisExternalGatewayRequest(
  request: XenesisRunRequest,
  emitEvent?: (event: XenesisRunEvent) => void,
): Promise<XenesisRunResult> {
  const normalized = normalizeXenesisRunRequest(request);
  if (!normalized.ok) {
    emitEvent?.({ event: 'gateway_error', data: { error: normalized.error } });
    recordXenesisRunFailure(normalized.error);
    return { ok: false, error: normalized.error };
  }

  const status = await startExternalXenesisGatewayRuntime();
  if (!status.running || !status.ok || !status.url) {
    const message = status.error || 'Xenesis external gateway is not ready.';
    emitEvent?.({ event: 'gateway_error', data: { error: message } });
    recordXenesisRunFailure(message);
    return { ok: false, error: message };
  }

  try {
    const gatewayPayload = buildXenesisGatewayRunPayload({
      prompt: normalized.prompt,
      workflow: normalized.workflow || 'xenis',
      source: normalized.source,
      workspace: status.workspace,
      mode: normalized.mode,
      context: normalized.context,
      ...(normalized.attachments?.length ? { attachments: normalized.attachments } : {}),
      ...(normalized.providerRuntime ? { providerRuntime: normalized.providerRuntime } : {}),
    });
    const response = await observeMainAsyncOperation(
      getMainObservabilityWindow(mainWindowRef),
      {
        activity: {
          source: 'gateway',
          label: 'xenesis.gateway.run',
          detail: `mode=${normalized.mode} workflow=${normalized.workflow || 'xenis'}`,
        },
        network: {
          source: 'gateway',
          method: 'POST',
          url: new URL('/run', status.url).toString(),
          requestBody: summarizeMainObservabilityPayload(gatewayPayload, 1200),
        },
      },
      () => postGatewayJson(status.url, getCurrentXenesisGatewayToken(), '/run', gatewayPayload),
    );
    const result = xenesisRunResultFromGatewayResponse(response);
    if (!result.ok) {
      const message = result.error || result.errors || 'Xenesis gateway run failed.';
      emitEvent?.({ event: 'gateway_error', data: result });
      recordXenesisRunFailure(message);
      return result;
    }
    emitEvent?.({ event: 'gateway_done', data: result });
    recordXenesisRunSuccess(result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    xenesisLastError = message;
    emitEvent?.({ event: 'gateway_error', data: { error: message } });
    recordXenesisRunFailure(message);
    return { ok: false, error: message };
  }
}

async function runXenesisRequest(
  request: XenesisRunRequest,
  emitEvent?: (event: XenesisRunEvent) => void,
): Promise<XenesisRunResult> {
  if (getXenesisRuntimeMode() === 'externalGateway') {
    return runXenesisExternalGatewayRequest(request, emitEvent);
  }
  return runXenesisEmbeddedRequest(request, emitEvent);
}

// ─── 애플리케이션 메뉴 ────────────────────────────────────────────────────────

const NATIVE_MENU_LABELS: Record<string, { ko: string; en: string }> = {
  'app.menuDesk': { ko: 'Desk', en: 'Desk' },
  'app.menuXenesis': { ko: 'Xenesis', en: 'Xenesis' },
  'app.menuAutomation': { ko: '자동화', en: 'Automation' },
  'app.toolsMenuGroupGowoori': { ko: 'Gowoori', en: 'Gowoori' },
  'app.toolsMenuGroupHermes': { ko: 'Hermes', en: 'Hermes' },
  'app.toolsMenuGroupTools': { ko: 'Tools', en: 'Tools' },
  'app.toolsMenuGroupDeveloper': { ko: '개발자', en: 'Developer' },
  'app.menuHelp': { ko: '도움말', en: 'Help' },
  'app.terminalLabel': { ko: '새 터미널', en: 'New Terminal' },
  'app.browserLabel': { ko: '새 브라우저', en: 'New Browser' },
  'app.openFileLabel': { ko: '파일 열기...', en: 'Open File...' },
  'app.menuCommandCenter': { ko: 'Command Center', en: 'Command Center' },
  'app.windowSizerLabel': { ko: '창 크기/위치', en: 'Window Size/Position' },
  'app.alignHorizontalBtn': { ko: '가로 정렬', en: 'Arrange Horizontal' },
  'app.alignVerticalBtn': { ko: '세로 정렬', en: 'Arrange Vertical' },
  'app.alignGridBtn': { ko: '바둑판 정렬', en: 'Arrange Grid' },
  'app.paneInspectLabel': { ko: '패인 확인', en: 'Pane Inspect' },
  'app.toolsXenesisAgent': { ko: 'Xenesis Agent', en: 'Xenesis Agent' },
  'settings.category.xenesisAgent': { ko: 'Xenesis Agent', en: 'Xenesis Agent' },
  'settings.category.runModel': { ko: 'AI 프로바이더', en: 'AI Provider' },
  'app.menuGatewayControl': { ko: 'Gateway 제어', en: 'Gateway Control' },
  'app.menuExternalBotChannels': { ko: '외부 봇 채널', en: 'External Bot Channels' },
  'app.toolsXamongCode': { ko: 'XamongCode Chat', en: 'XamongCode Chat' },
  'monitor.topbarTitle': { ko: '자동화 모니터', en: 'Automation Monitor' },
  'settings.category.automation': { ko: '자동화 설정', en: 'Automation Settings' },
  'settings.category.externalApps': { ko: '외부 앱', en: 'External Apps' },
  'settings.category.externalAppsDesc': {
    ko: '외부 데스크톱 앱 실행 및 제어 프로필',
    en: 'Profiles for launching and controlling external desktop apps',
  },
  'app.toolsMenuDemoLabEditor': { ko: 'Demo Lab Editor', en: 'Demo Lab Editor' },
  'app.toolsXenisBot': { ko: 'Xenesis Bot', en: 'Xenesis Bot' },
  'app.toolsPreview': { ko: '미리보기', en: 'Preview' },
  'app.toolsMeta': { ko: '매트릭스 / 메타 관리', en: 'Matrix / Meta Management' },
  'app.toolsQueryAnalyzer': { ko: '쿼리 분석기', en: 'Query Analyzer' },
  'app.toolsQueryAnalyzerOD': { ko: '쿼리 분석기 (OD)', en: 'Query Analyzer (OD)' },
  'settings.developerServerTitle': { ko: 'SQLite 서버 설정', en: 'SQLite Server Settings' },
  'app.onboardingTitle': { ko: 'Xenesis Desk 시작', en: 'Start Xenesis Desk' },
  'app.diagnosticsCenter': { ko: '진단/로그 센터', en: 'Diagnostics / Logs' },
  'app.toolsSettings': { ko: '설정', en: 'Settings' },
};

function nativeMenuLocale(): 'ko' | 'en' {
  return app.getLocale().toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

function resolveNativeMenuLabel(node: { label: string; labelKey?: string }): string {
  if (!node.labelKey) {
    return node.label;
  }
  return NATIVE_MENU_LABELS[node.labelKey]?.[nativeMenuLocale()] ?? node.label;
}

function dispatchRendererAppMenuCommand(payload: { id: string; actionId?: string; commandId?: string }): void {
  const targetWindow =
    BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows().find((candidate) => !candidate.isDestroyed());
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }
  targetWindow.webContents.send('app-menu:command', payload);
}

function buildNativeFeatureMenuItems(
  groupId: string,
  nodes: AppMenuNode[],
  options: XenisPhase5VisibilityOptions = getXenisPhase5VisibilityOptions(),
): Electron.MenuItemConstructorOptions[] {
  const items: Electron.MenuItemConstructorOptions[] = [];

  for (const node of nodes) {
    if (node.kind === 'separator') {
      items.push({ type: 'separator' });
      continue;
    }
    if (node.phase5Only === true && !isXenisPhase5Visible(options)) {
      continue;
    }
    if (node.native === false) {
      continue;
    }
    if (node.kind === 'group') {
      const submenu = buildNativeFeatureMenuItems(node.id, node.children, options);
      if (submenu.length > 0) {
        items.push({
          label: resolveNativeMenuLabel(node),
          submenu,
        });
      }
      continue;
    }
    if (node.kind === 'command') {
      const commandNode: AppMenuCommandNode = node;
      if (!canUseXenisPhase5XamongCodeCommand(commandNode.commandId, options)) {
        continue;
      }
      items.push({
        label: resolveNativeMenuLabel(commandNode),
        click: () =>
          dispatchRendererAppMenuCommand({
            id: `${groupId}.${commandNode.id}`,
            commandId: commandNode.commandId,
          }),
      });
      continue;
    }
    const actionNode: AppMenuActionNode = node;
    items.push({
      label: resolveNativeMenuLabel(actionNode),
      click: () =>
        dispatchRendererAppMenuCommand({
          id: `${groupId}.${actionNode.id}`,
          actionId: actionNode.actionId,
        }),
    });
  }

  return compactNativeMenuItems(items);
}

function compactNativeMenuItems(items: Electron.MenuItemConstructorOptions[]): Electron.MenuItemConstructorOptions[] {
  const compacted: Electron.MenuItemConstructorOptions[] = [];
  for (const item of items) {
    if (
      item.type === 'separator' &&
      (compacted.length === 0 || compacted[compacted.length - 1]?.type === 'separator')
    ) {
      continue;
    }
    compacted.push(item);
  }
  while (compacted[compacted.length - 1]?.type === 'separator') {
    compacted.pop();
  }
  return compacted;
}

function buildNativeFeatureMenus(): Electron.MenuItemConstructorOptions[] {
  const options = getXenisPhase5VisibilityOptions();
  return APP_MENU_MODEL.filter((group) => group.native !== false && !group.dynamicExtensions)
    .filter((group) => group.phase5Only !== true || isXenisPhase5Visible(options))
    .map((group) => ({
      label: resolveNativeMenuLabel(group),
      submenu: buildNativeFeatureMenuItems(group.id, group.children, options),
    }))
    .filter((item) => Array.isArray(item.submenu) && item.submenu.length > 0);
}

function setupApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: nativeMenuLocale() === 'ko' ? '새 터미널' : 'New Terminal',
          click: () => dispatchRendererAppMenuCommand({ id: 'file.new-terminal', actionId: 'new-terminal' }),
        },
        {
          label: nativeMenuLocale() === 'ko' ? '파일 열기...' : 'Open File...',
          click: () => dispatchRendererAppMenuCommand({ id: 'file.open-file', actionId: 'open-file' }),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    ...buildNativeFeatureMenus(),
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── 창 생성 ──────────────────────────────────────────────────────────────────

function shouldRunXenesisPackagedSmoke(): boolean {
  return process.env.XENIS_XENESIS_PACKAGED_SMOKE === '1';
}

function writeXenesisPackagedSmokeArtifact(artifact: Record<string, unknown>): void {
  const outputPath = process.env.XENIS_XENESIS_PACKAGED_SMOKE_OUTPUT;
  if (!outputPath) return;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2), 'utf8');
}

async function runXenesisPackagedSmoke(): Promise<void> {
  let artifact: Record<string, unknown> = {
    ok: false,
    runtimeMode: '',
    status: null,
    error: '',
    checkedAt: new Date().toISOString(),
  };

  try {
    const status = await startXenesisRuntime();
    artifact = {
      ok: status.ok === true && status.running === true && status.runtimeMode === 'embedded',
      runtimeMode: status.runtimeMode,
      status,
      error: status.error || '',
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    artifact = {
      ...artifact,
      error: error instanceof Error ? error.message : String(error),
      checkedAt: new Date().toISOString(),
    };
  }

  writeXenesisPackagedSmokeArtifact(artifact);
  stopXenesisRuntime();
  stopXenesisGatewayRuntime();
  stopMcpBridgeServer();
  stopInternalServer();
  stopXamongCodeServer();
  killAllSessions();
  app.exit(artifact.ok ? 0 : 1);
}

function createWindow(): BrowserWindow {
  const runPackagedSmoke = shouldRunXenesisPackagedSmoke();
  const initialBounds = runPackagedSmoke
    ? { width: MAIN_WINDOW_DEFAULT_WIDTH, height: MAIN_WINDOW_DEFAULT_HEIGHT }
    : resolveMainWindowInitialBounds(loadSettings().mainWindowBounds);
  const mainWindow = new BrowserWindow({
    ...initialBounds,
    minWidth: 640,
    minHeight: 480,
    show: !runPackagedSmoke,
    title: 'Xenesis Desk',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: false — File.path(OS 드래그 파일 경로) 접근에 필요.
      // nodeIntegration: false + contextIsolation: true 가 유지되므로
      // 렌더러에서 Node.js 직접 접근 불가, contextBridge 격리도 유지됨.
      sandbox: false,
      webviewTag: true,
    },
  });

  mainWindowRef = mainWindow;
  attachWindowBoundsEvents(mainWindow);
  if (!runPackagedSmoke) {
    attachMainWindowBoundsPersistence(mainWindow);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => undefined);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (url !== currentUrl) {
      event.preventDefault();
      shell.openExternal(url).catch(() => undefined);
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL).catch(console.error);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')).catch(console.error);
  }

  // ── 창 닫기 전 확인 다이얼로그 (close = 닫히기 전, closed = 닫힌 후) ─────────
  // X 버튼, Alt+F4, 메뉴 Quit 등 종료 시도 → 열려 있는 PTY 세션이 있으면 경고 표시.
  // 확인 후: Main → Renderer에 app:closing 전송 → Renderer가 도킹 탭 X 버튼과 동일한
  // 방식으로 터미널을 정리 → app:close-confirmed 응답 → Main이 창 닫기 완료.
  let closeConfirmed = false;

  mainWindow.on('close', (event) => {
    // 이미 확인 완료이거나 활성 세션이 없으면 바로 닫기
    if (closeConfirmed || sessions.size === 0) {
      killAllSessions(); // 방어: 혹시 남은 세션 정리
      return;
    }

    // 닫기 중단 후 확인 다이얼로그 표시
    event.preventDefault();
    const sessionCount = sessions.size;

    // showMessageBoxSync는 클릭한 버튼의 인덱스(number)를 직접 반환
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['모두 종료하고 닫기', '취소'],
      defaultId: 1,
      cancelId: 1,
      title: '터미널 세션 종료 확인',
      message: `실행 중인 터미널 세션이 ${sessionCount}개 있습니다.`,
      detail:
        '앱을 종료하면 열려 있는 모든 터미널 프로세스(PTY)가 강제로 중지됩니다.\n' +
        'node.exe, powershell, cmd 등 자식 프로세스도 함께 종료됩니다.\n\n' +
        '계속 진행하시겠습니까?',
    });

    if (response === 0) {
      // "모두 종료하고 닫기" 확인 → Renderer에 터미널 정리 요청
      // Renderer는 도킹 탭 X 버튼과 동일한 로직(terminalHost.kill + engine.closeContent)으로
      // 각 터미널을 정리한 뒤 app:close-confirmed 를 돌려보냄.
      closeConfirmed = true;
      mainWindow.webContents.send('app:closing');

      // 강제 종료 타이머: Renderer가 3초 내 응답 없으면 PTY를 직접 종료하고 창 닫기
      // (렌더러 딜레이 150ms + 메인 딜레이 300ms 포함한 여유 시간)
      const forceTimer = setTimeout(() => {
        killAllSessions();
        if (!mainWindow.isDestroyed()) mainWindow.close();
      }, 3000);
      forceTimer.unref();

      // Renderer 정리 완료 신호 수신 → 타이머 취소 후 창 닫기
      ipcMain.once('app:close-confirmed', () => {
        clearTimeout(forceTimer);
        killAllSessions(); // 방어: Renderer IPC kill 이후 남은 세션 정리

        // 딜레이: ptyProcess.kill() 이후 PTY 프로세스가 OS에서 실제로 종료될 때까지
        // 대기. TerminateProcess(Win32)는 즉시 반환하지만 자식 프로세스 정리가
        // 이벤트 루프 다음 틱에서 처리되는 경우가 있음.
        setTimeout(() => {
          if (!mainWindow.isDestroyed()) mainWindow.close();
        }, 300);
      });
    }
    // response === 1: "취소" → event.preventDefault()로 이미 처리됨
  });

  mainWindow.on('closed', () => {
    mainWindowRef = null;
    killAllSessions(); // 방어: close 핸들러를 우회한 경우(예: destroy()) 대비
  });

  return mainWindow;
}

// ─── 분리 창 생성 ─────────────────────────────────────────────────────────────

function createDetachedWindow(title: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 480,
    minHeight: 320,
    title: title || 'Xenesis Desk',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: false — 메인 윈도우와 동일한 이유로 File.path 접근 허용
      sandbox: false,
      webviewTag: true,
    },
  });

  attachWindowBoundsEvents(win);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => undefined);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const currentUrl = win.webContents.getURL();
    if (url !== currentUrl) {
      event.preventDefault();
      shell.openExternal(url).catch(() => undefined);
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL + '#detached').catch(console.error);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: 'detached' }).catch(console.error);
  }

  // 분리 창 레지스트리에 등록
  detachedWindows.set(win.id, win);
  win.on('closed', () => {
    detachedWindows.delete(win.id);
    // 이 창이 소유한 PTY 세션 정리 — 탭 닫기 없이 창을 바로 닫은 경우 대비.
    // 500ms 딜레이: 탭 이동(merge/reattach) 직후 창이 닫히는 경우
    // terminal:adopt IPC가 먼저 처리될 수 있도록 충분한 여유를 줌.
    const closedWinId = win.id;
    setTimeout(() => {
      for (const [sessionId, session] of sessions.entries()) {
        if (session.ownerWindowId === closedWinId) {
          try {
            session.backend.kill();
          } catch {
            /* ignore */
          }
          sessions.delete(sessionId);
          automationControllers.delete(sessionId);
        }
      }
    }, 500);
  });

  return win;
}

// ─── 파일 읽기 헬퍼 ──────────────────────────────────────────────────────────

/** hex 뷰어 최대 읽기 크기 — 1 MiB */
const HEX_MAX_BYTES = 1024 * 1024;

/** 텍스트 파일 판별 스니핑 크기 — 8 KiB */
const TEXT_SNIFF_BYTES = 8 * 1024;

/**
 * 버퍼의 앞부분을 검사해 텍스트 파일인지 추정한다.
 * - null 바이트(0x00)가 존재하면 바이너리로 판단
 * - 출력 불가 제어 문자(탭·LF·CR 제외)가 10 % 이상이면 바이너리로 판단
 */
function looksLikeText(buf: Buffer): boolean {
  if (buf.length === 0) return true;
  if (buf.indexOf(0x00) !== -1) return false;

  let controlCount = 0;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    // 허용: 0x09(탭), 0x0A(LF), 0x0D(CR), 0x20 이상
    if (b < 0x09 || (b > 0x0d && b < 0x20) || b === 0x7f) {
      controlCount++;
    }
  }
  return controlCount / buf.length < 0.1;
}

async function readFileToResult(filePath: string): Promise<OpenFileResult | null> {
  const SUPPORTED_EXTS: Record<string, OpenFileResult['contentType']> = {
    md: 'markdown',
    markdown: 'markdown',
    mmd: 'mermaid',
    js: 'code',
    ts: 'code',
    jsx: 'code',
    tsx: 'code',
    mjs: 'code',
    cjs: 'code',
    py: 'code',
    html: 'code',
    htm: 'code',
    css: 'code',
    json: 'code',
    xcon: 'code',
    xconj: 'code',
    xml: 'code',
    yaml: 'code',
    yml: 'code',
    sh: 'code',
    workflow: 'code',
    bat: 'code',
    txt: 'code',
    log: 'code',
    rs: 'code',
    go: 'code',
    java: 'code',
    cpp: 'code',
    c: 'code',
    cs: 'code',
    rb: 'code',
    php: 'code',
    swift: 'code',
    kt: 'code',
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    webp: 'image',
    bmp: 'image',
    ico: 'image',
    svg: 'image', // App.tsx 에서 브라우저 패인으로 라우팅됨 (html/htm도 동일)
    pdf: 'document-preview',
    docx: 'document-preview',
    doc: 'document-preview',
    hwp: 'document-preview',
    hwpx: 'document-preview',
    xls: 'document-preview',
    xlsx: 'document-preview',
    xlsm: 'document-preview',
    xlsb: 'document-preview',
    pptx: 'document-preview',
    ppt: 'document-preview',
    // ── 복합 확장자: *.xcon.json / *.xcon.xml → XCON 뷰어로 라우팅
    'xcon.json': 'code',
    'xcon.xml': 'code',
    'xcon-workflow': 'code',
  };

  try {
    const fileName = path.basename(filePath);
    // 복합 확장자(*.xcon.json, *.xcon.xml) 우선 감지, 없으면 단순 확장자 추출
    const compoundMatch = /\.(xcon\.(?:json|xml|tagless)|xcon-workflow)$/i.exec(fileName);
    const ext = compoundMatch ? compoundMatch[1].toLowerCase() : path.extname(filePath).replace('.', '').toLowerCase();
    const contentType = SUPPORTED_EXTS[ext];

    // ── 지원 확장자가 없으면 파일 앞부분을 검사해 텍스트/바이너리를 판별 ───
    if (!contentType) {
      const stat = await fs.promises.stat(filePath);
      const totalBytes = stat.size;
      const fd = await fs.promises.open(filePath, 'r');
      // hex 최대 크기까지 한 번에 읽어 스니핑과 hex 출력에 공용 사용
      const readSize = Math.min(HEX_MAX_BYTES, totalBytes);
      const buf = Buffer.allocUnsafe(readSize);
      await fd.read(buf, 0, readSize, 0);
      await fd.close();

      const sniffView = buf.subarray(0, Math.min(TEXT_SNIFF_BYTES, readSize));
      if (looksLikeText(sniffView)) {
        // 텍스트로 판단 → 전체 파일을 UTF-8로 읽어 코드뷰로 열기
        const content = await fs.promises.readFile(filePath, 'utf8');
        return { filePath, fileName, ext, contentType: 'code', content };
      }

      return {
        filePath,
        fileName,
        ext,
        contentType: 'hex',
        content: buf.toString('base64'),
        totalBytes,
      };
    }

    let content: string;
    if (ext === 'svg') {
      content = '';
    } else if (contentType === 'document-preview') {
      const buffer = await fs.promises.readFile(filePath);
      content = buffer.toString('base64');
    } else if (contentType === 'image') {
      const buffer = await fs.promises.readFile(filePath);
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        bmp: 'image/bmp',
        ico: 'image/x-icon',
      };
      const mime = mimeMap[ext] ?? 'image/png';
      content = `data:${mime};base64,${buffer.toString('base64')}`;
    } else {
      content = await fs.promises.readFile(filePath, 'utf8');
    }

    return { filePath, fileName, content, ext, contentType };
  } catch {
    return null;
  }
}

// ─── 원격 파일(FTP/FTPS/SFTP) 헬퍼 ───────────────────────────────────────────

const REMOTE_FILE_SUPPORTED_EXTS: Record<string, OpenFileResult['contentType']> = {
  md: 'markdown',
  markdown: 'markdown',
  mmd: 'mermaid',
  js: 'code',
  ts: 'code',
  jsx: 'code',
  tsx: 'code',
  mjs: 'code',
  cjs: 'code',
  py: 'code',
  html: 'code',
  htm: 'code',
  css: 'code',
  json: 'code',
  xcon: 'code',
  xconj: 'code',
  xml: 'code',
  yaml: 'code',
  yml: 'code',
  sh: 'code',
  bat: 'code',
  txt: 'code',
  log: 'code',
  rs: 'code',
  go: 'code',
  java: 'code',
  cpp: 'code',
  c: 'code',
  cs: 'code',
  rb: 'code',
  php: 'code',
  swift: 'code',
  kt: 'code',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  ico: 'image',
  svg: 'image',
  pdf: 'document-preview',
  docx: 'document-preview',
  doc: 'document-preview',
  hwp: 'document-preview',
  hwpx: 'document-preview',
  xls: 'document-preview',
  xlsx: 'document-preview',
  xlsm: 'document-preview',
  xlsb: 'document-preview',
  pptx: 'document-preview',
  ppt: 'document-preview',
  'xcon.json': 'code',
  'xcon.xml': 'code',
  'xcon.tagless': 'code',
};

function defaultRemoteFilePort(protocol: RemoteFileProtocol): number {
  if (protocol === 'sftp') return 22;
  return 21;
}

const REMOTE_FILE_ENCODINGS = new Set<RemoteFileEncoding>(['utf8', 'euc-kr', 'cp949', 'utf16le', 'latin1', 'ascii']);
const LEGACY_KOREAN_REMOTE_FILE_ENCODINGS = new Set<RemoteFileEncoding>(['euc-kr', 'cp949']);
type BasicFtpWireEncoding = 'utf8' | 'utf16le' | 'latin1' | 'ascii';

function normalizeRemoteFileEncoding(value: unknown): RemoteFileEncoding {
  return REMOTE_FILE_ENCODINGS.has(value as RemoteFileEncoding) ? (value as RemoteFileEncoding) : 'utf8';
}

function isLegacyKoreanRemoteFileEncoding(encoding: RemoteFileEncoding): boolean {
  return LEGACY_KOREAN_REMOTE_FILE_ENCODINGS.has(encoding);
}

function getBasicFtpWireEncoding(encoding: RemoteFileEncoding): BasicFtpWireEncoding {
  return isLegacyKoreanRemoteFileEncoding(encoding) ? 'latin1' : (encoding as BasicFtpWireEncoding);
}

function decodeRemoteText(buffer: Buffer, encoding: RemoteFileEncoding): string {
  return isLegacyKoreanRemoteFileEncoding(encoding)
    ? iconv.decode(buffer, encoding)
    : buffer.toString(encoding as BufferEncoding);
}

function encodeRemoteText(text: string, encoding: RemoteFileEncoding): Buffer {
  return isLegacyKoreanRemoteFileEncoding(encoding)
    ? iconv.encode(text, encoding)
    : Buffer.from(text, encoding as BufferEncoding);
}

function normalizeRemoteDir(input: string): string {
  const normalized = input.trim().replace(/\\/g, '/').replace(/\/+/g, '/');
  if (!normalized || normalized === '.') return '/';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function joinRemotePath(basePath: string, name: string): string {
  const cleanBase = normalizeRemoteDir(basePath).replace(/\/+$/, '');
  const cleanName = String(name || '').replace(/^\/+/, '');
  return cleanBase ? `${cleanBase}/${cleanName}` : `/${cleanName}`;
}

function encodeFtpPath(remotePath: string, profile: RemoteFileProfile): string {
  if (profile.protocol === 'sftp' || !isLegacyKoreanRemoteFileEncoding(profile.encoding)) return remotePath;
  return iconv.encode(remotePath, profile.encoding).toString('latin1');
}

function decodeFtpName(name: string, profile: RemoteFileProfile): string {
  if (profile.protocol === 'sftp' || !isLegacyKoreanRemoteFileEncoding(profile.encoding)) return name;
  return iconv.decode(Buffer.from(name, 'latin1'), profile.encoding);
}

function sanitizeRemoteFileProfile(rawProfile: RemoteFileProfile): RemoteFileProfile {
  if (!rawProfile || typeof rawProfile !== 'object') {
    throw new Error('Remote file profile is required.');
  }

  const protocol: RemoteFileProtocol =
    rawProfile.protocol === 'sftp' || rawProfile.protocol === 'ftps' ? rawProfile.protocol : 'ftp';
  const host = String(rawProfile.host || '').trim();
  if (!host) {
    throw new Error('Remote file host is required.');
  }

  return {
    ...rawProfile,
    id: String(rawProfile.id || '').trim(),
    name: String(rawProfile.name || '').trim() || host,
    groupId: String(rawProfile.groupId || '').trim(),
    protocol,
    host,
    port: clamp(rawProfile.port, 1, 65535, defaultRemoteFilePort(protocol)),
    username: String(rawProfile.username || '').trim(),
    password: String(rawProfile.password || ''),
    privateKeyPath: String(rawProfile.privateKeyPath || '').trim(),
    passphrase: String(rawProfile.passphrase || ''),
    connectTimeoutMs: clamp(rawProfile.connectTimeoutMs, 1000, 120000, 15000),
    rootPath: normalizeRemoteDir(String(rawProfile.rootPath || '/')),
    encoding: normalizeRemoteFileEncoding(rawProfile.encoding),
    createdAt: Number.isFinite(rawProfile.createdAt) ? rawProfile.createdAt : Date.now(),
    updatedAt: Number.isFinite(rawProfile.updatedAt) ? rawProfile.updatedAt : Date.now(),
  };
}

function remoteBufferToOpenFileResult(
  remotePath: string,
  buffer: Buffer,
  encoding: RemoteFileEncoding = 'utf8',
): OpenFileResult {
  const textEncoding = normalizeRemoteFileEncoding(encoding);
  const fileName = path.posix.basename(remotePath);
  const compoundMatch = /\.(xcon\.(?:json|xml|tagless))$/i.exec(fileName);
  const ext = compoundMatch
    ? compoundMatch[1].toLowerCase()
    : path.posix.extname(fileName).replace('.', '').toLowerCase();
  const contentType = REMOTE_FILE_SUPPORTED_EXTS[ext];

  if (!contentType) {
    const sniffView = buffer.subarray(0, Math.min(TEXT_SNIFF_BYTES, buffer.length));
    if (looksLikeText(sniffView)) {
      return {
        filePath: remotePath,
        fileName,
        ext,
        contentType: 'code',
        content: decodeRemoteText(buffer, textEncoding),
      };
    }

    const clipped = buffer.subarray(0, Math.min(HEX_MAX_BYTES, buffer.length));
    return {
      filePath: remotePath,
      fileName,
      ext,
      contentType: 'hex',
      content: clipped.toString('base64'),
      totalBytes: buffer.length,
    };
  }

  if (contentType === 'document-preview') {
    return {
      filePath: remotePath,
      fileName,
      ext,
      contentType,
      content: buffer.toString('base64'),
    };
  }

  if (contentType === 'image') {
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      svg: 'image/svg+xml',
    };
    const mime = mimeMap[ext] ?? 'image/png';
    return {
      filePath: remotePath,
      fileName,
      ext,
      contentType,
      content: `data:${mime};base64,${buffer.toString('base64')}`,
    };
  }

  return {
    filePath: remotePath,
    fileName,
    ext,
    contentType,
    content: decodeRemoteText(buffer, textEncoding),
  };
}

async function createBasicFtpClient(rawProfile: RemoteFileProfile): Promise<BasicFtpClient> {
  const profile = sanitizeRemoteFileProfile(rawProfile);
  const client = new BasicFtpClient(profile.connectTimeoutMs);
  client.ftp.encoding = getBasicFtpWireEncoding(profile.encoding);
  await client.access({
    host: profile.host,
    port: profile.port,
    user: profile.username || 'anonymous',
    password: profile.password || 'guest',
    secure: profile.protocol === 'ftps',
  });
  return client;
}

async function withBasicFtpClient<T>(
  rawProfile: RemoteFileProfile,
  worker: (client: BasicFtpClient, profile: RemoteFileProfile) => Promise<T>,
): Promise<T> {
  const client = await createBasicFtpClient(rawProfile);
  const profile = sanitizeRemoteFileProfile(rawProfile);
  try {
    return await worker(client, profile);
  } finally {
    client.close();
  }
}

function ftpInfoToRemoteEntry(
  basePath: string,
  info: { name: string; type: BasicFtpFileType; size: number; modifiedAt?: Date },
  profile: RemoteFileProfile,
): RemoteFileEntry {
  const isDirectory = info.type === BasicFtpFileType.Directory;
  const name = decodeFtpName(info.name, profile);
  return {
    name,
    path: joinRemotePath(basePath, name),
    isDirectory,
    ext: isDirectory ? '' : path.posix.extname(name).replace('.', '').toLowerCase(),
    size: Number.isFinite(info.size) ? info.size : 0,
    modifiedAt: info.modifiedAt?.toISOString(),
  };
}

function buildSftpConfig(profile: RemoteFileProfile): ConnectConfig {
  const connectConfig: ConnectConfig = {
    host: profile.host,
    port: profile.port,
    username: profile.username,
    readyTimeout: profile.connectTimeoutMs,
    keepaliveInterval: 15000,
    keepaliveCountMax: 3,
  };

  if (profile.password) {
    connectConfig.password = profile.password;
  }
  if (profile.privateKeyPath) {
    try {
      connectConfig.privateKey = fs.readFileSync(profile.privateKeyPath);
      if (profile.passphrase) connectConfig.passphrase = profile.passphrase;
    } catch (error) {
      throw new Error(`Cannot read private key: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return connectConfig;
}

function withSftpClient<T>(
  rawProfile: RemoteFileProfile,
  worker: (sftp: SFTPWrapper, profile: RemoteFileProfile) => Promise<T>,
): Promise<T> {
  const profile = sanitizeRemoteFileProfile(rawProfile);
  const conn = new Client();

  return new Promise<T>((resolve, reject) => {
    let finished = false;
    const finish = (error?: unknown, value?: T) => {
      if (finished) return;
      finished = true;
      conn.end();
      if (error) {
        reject(error);
      } else {
        resolve(value as T);
      }
    };

    conn
      .on('ready', () => {
        conn.sftp((error, sftp) => {
          if (error) {
            finish(error);
            return;
          }
          worker(sftp, profile)
            .then((result) => finish(undefined, result))
            .catch(finish);
        });
      })
      .on('error', finish)
      .connect(buildSftpConfig(profile));
  });
}

function sftpReaddir(sftp: SFTPWrapper, remotePath: string): Promise<FileEntryWithStats[]> {
  return new Promise((resolve, reject) => {
    sftp.readdir(remotePath, (error, list) => (error ? reject(error) : resolve(list)));
  });
}

function sftpReadFile(sftp: SFTPWrapper, remotePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    sftp.readFile(remotePath, (error, data) => (error ? reject(error) : resolve(Buffer.from(data))));
  });
}

function sftpWriteFile(sftp: SFTPWrapper, remotePath: string, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    sftp.writeFile(remotePath, data, (error) => (error ? reject(error) : resolve()));
  });
}

function sftpMkdir(sftp: SFTPWrapper, remotePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    sftp.mkdir(remotePath, (error) => (error ? reject(error) : resolve()));
  });
}

function sftpDelete(sftp: SFTPWrapper, remotePath: string, isDirectory: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const callback = (error?: Error | null) => (error ? reject(error) : resolve());
    if (isDirectory) {
      sftp.rmdir(remotePath, callback);
    } else {
      sftp.unlink(remotePath, callback);
    }
  });
}

function sftpRename(sftp: SFTPWrapper, fromPath: string, toPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    sftp.rename(fromPath, toPath, (error) => (error ? reject(error) : resolve()));
  });
}

function sftpInfoToRemoteEntry(basePath: string, info: FileEntryWithStats): RemoteFileEntry {
  const isDirectory =
    typeof info.attrs.isDirectory === 'function' ? info.attrs.isDirectory() : info.longname.startsWith('d');
  return {
    name: info.filename,
    path: joinRemotePath(basePath, info.filename),
    isDirectory,
    ext: isDirectory ? '' : path.posix.extname(info.filename).replace('.', '').toLowerCase(),
    size: Number.isFinite(info.attrs.size) ? info.attrs.size : 0,
    modifiedAt: Number.isFinite(info.attrs.mtime) ? new Date(info.attrs.mtime * 1000).toISOString() : undefined,
  };
}

function sortRemoteEntries(entries: RemoteFileEntry[]): RemoteFileEntry[] {
  return entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, 'ko');
  });
}

function recordRemoteFileDiagnostic(
  operation: string,
  rawProfile: RemoteFileProfile,
  rawRemotePath: string,
  error: unknown,
): void {
  let profileName = 'remote-file';
  let remotePath = String(rawRemotePath || '/');
  try {
    const profile = sanitizeRemoteFileProfile(rawProfile);
    profileName = profile.name || profile.host || profile.protocol.toUpperCase();
    remotePath = normalizeRemoteDir(String(rawRemotePath || profile.rootPath || '/'));
  } catch {
    remotePath = String(rawRemotePath || '/');
  }
  const message = error instanceof Error ? error.message : String(error);
  recordDiagnosticLog({
    level: 'error',
    source: 'remote-file',
    scope: `${profileName} · ${operation}`,
    message: `Remote file ${operation} failed: ${message}`,
    detail: remotePath,
  });
}

async function remoteFileList(rawProfile: RemoteFileProfile, rawRemotePath: string): Promise<RemoteFileEntry[]> {
  const requestedPath = normalizeRemoteDir(String(rawRemotePath || '/'));
  const profile = sanitizeRemoteFileProfile(rawProfile);

  try {
    if (profile.protocol === 'sftp') {
      return await withSftpClient(profile, async (sftp) => {
        const entries = await sftpReaddir(sftp, requestedPath);
        return sortRemoteEntries(
          entries
            .filter((info) => info.filename !== '.' && info.filename !== '..')
            .map((info) => sftpInfoToRemoteEntry(requestedPath, info)),
        );
      });
    }

    return await withBasicFtpClient(profile, async (client) => {
      const entries = await client.list(encodeFtpPath(requestedPath, profile));
      return sortRemoteEntries(entries.map((info) => ftpInfoToRemoteEntry(requestedPath, info, profile)));
    });
  } catch (error) {
    recordRemoteFileDiagnostic('list', profile, requestedPath, error);
    throw error;
  }
}

async function remoteFileReadBuffer(
  rawProfile: RemoteFileProfile,
  rawRemotePath: string,
): Promise<{ remotePath: string; buffer: Buffer }> {
  const remotePath = normalizeRemoteDir(String(rawRemotePath || '/'));
  const profile = sanitizeRemoteFileProfile(rawProfile);

  const buffer =
    profile.protocol === 'sftp'
      ? await withSftpClient(profile, (sftp) => sftpReadFile(sftp, remotePath))
      : await withBasicFtpClient(profile, async (client) => {
          const chunks: Buffer[] = [];
          const writable = new Writable({
            write(chunk, _encoding, callback) {
              chunks.push(Buffer.from(chunk));
              callback();
            },
          });
          await client.downloadTo(writable, encodeFtpPath(remotePath, profile));
          return Buffer.concat(chunks);
        });

  return { remotePath, buffer };
}

async function remoteFileRead(rawProfile: RemoteFileProfile, rawRemotePath: string): Promise<OpenFileResult | null> {
  try {
    const profile = sanitizeRemoteFileProfile(rawProfile);
    const { remotePath, buffer } = await remoteFileReadBuffer(profile, rawRemotePath);
    return remoteBufferToOpenFileResult(remotePath, buffer, profile.encoding);
  } catch (error) {
    recordRemoteFileDiagnostic('read', rawProfile, rawRemotePath, error);
    return null;
  }
}

async function remoteFileReadBase64(
  rawProfile: RemoteFileProfile,
  rawRemotePath: string,
): Promise<FileTransferPayload | null> {
  try {
    const { remotePath, buffer } = await remoteFileReadBuffer(rawProfile, rawRemotePath);
    return {
      fileName: path.posix.basename(remotePath),
      contentBase64: buffer.toString('base64'),
      size: buffer.length,
    };
  } catch (error) {
    recordRemoteFileDiagnostic('read', rawProfile, rawRemotePath, error);
    return null;
  }
}

async function remoteFileWrite(request: RemoteFileWriteRequest): Promise<RemoteFileOperationResult> {
  try {
    const profile = sanitizeRemoteFileProfile(request.profile);
    const remotePath = normalizeRemoteDir(String(request.remotePath || '/'));
    const inputBuffer = Buffer.from(String(request.contentBase64 || ''), 'base64');
    const buffer =
      request.contentMode === 'text' ? encodeRemoteText(inputBuffer.toString('utf8'), profile.encoding) : inputBuffer;

    if (profile.protocol === 'sftp') {
      await withSftpClient(profile, (sftp) => sftpWriteFile(sftp, remotePath, buffer));
    } else {
      await withBasicFtpClient(profile, async (client) => {
        await client.uploadFrom(Readable.from([buffer]), encodeFtpPath(remotePath, profile));
      });
    }

    return { ok: true };
  } catch (error) {
    recordRemoteFileDiagnostic('write', request.profile, request.remotePath, error);
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function remoteFileMkdir(
  rawProfile: RemoteFileProfile,
  rawRemotePath: string,
): Promise<RemoteFileOperationResult> {
  try {
    const profile = sanitizeRemoteFileProfile(rawProfile);
    const remotePath = normalizeRemoteDir(String(rawRemotePath || '/'));
    if (profile.protocol === 'sftp') {
      await withSftpClient(profile, (sftp) => sftpMkdir(sftp, remotePath));
    } else {
      await withBasicFtpClient(profile, async (client) => {
        await client.ensureDir(encodeFtpPath(remotePath, profile));
      });
    }
    return { ok: true };
  } catch (error) {
    recordRemoteFileDiagnostic('mkdir', rawProfile, rawRemotePath, error);
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function remoteFileDelete(
  rawProfile: RemoteFileProfile,
  rawRemotePath: string,
  isDirectory: boolean,
): Promise<RemoteFileOperationResult> {
  try {
    const profile = sanitizeRemoteFileProfile(rawProfile);
    const remotePath = normalizeRemoteDir(String(rawRemotePath || '/'));
    if (profile.protocol === 'sftp') {
      await withSftpClient(profile, (sftp) => sftpDelete(sftp, remotePath, isDirectory));
    } else {
      await withBasicFtpClient(profile, async (client) => {
        if (isDirectory) {
          await client.removeDir(encodeFtpPath(remotePath, profile));
        } else {
          await client.remove(encodeFtpPath(remotePath, profile));
        }
      });
    }
    return { ok: true };
  } catch (error) {
    recordRemoteFileDiagnostic(isDirectory ? 'delete-dir' : 'delete', rawProfile, rawRemotePath, error);
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function remoteFileRename(
  rawProfile: RemoteFileProfile,
  rawFromPath: string,
  rawToPath: string,
): Promise<RemoteFileOperationResult> {
  try {
    const profile = sanitizeRemoteFileProfile(rawProfile);
    const fromPath = normalizeRemoteDir(String(rawFromPath || '/'));
    const toPath = normalizeRemoteDir(String(rawToPath || '/'));
    if (profile.protocol === 'sftp') {
      await withSftpClient(profile, (sftp) => sftpRename(sftp, fromPath, toPath));
    } else {
      await withBasicFtpClient(profile, async (client) => {
        await client.rename(encodeFtpPath(fromPath, profile), encodeFtpPath(toPath, profile));
      });
    }
    return { ok: true };
  } catch (error) {
    recordRemoteFileDiagnostic('rename', rawProfile, `${rawFromPath} -> ${rawToPath}`, error);
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function remoteFileTest(rawProfile: RemoteFileProfile): Promise<RemoteFileOperationResult> {
  try {
    const profile = sanitizeRemoteFileProfile(rawProfile);
    await remoteFileList(profile, profile.rootPath || '/');
    return { ok: true, message: 'OK' };
  } catch (error) {
    recordRemoteFileDiagnostic('test', rawProfile, rawProfile.rootPath || '/', error);
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

interface TransferQueueRuntimeItem extends TransferQueueItem {
  request: TransferQueueEnqueueRequest;
  cancelRequested: boolean;
}

const transferQueueItems: TransferQueueRuntimeItem[] = [];
let transferQueueRunning = false;
let transferQueueCounter = 0;

function normalizeTransferOverwritePolicy(policy: unknown): TransferOverwritePolicy {
  return policy === 'ask' || policy === 'skip' || policy === 'overwrite' ? policy : 'overwrite';
}

function transferDisplayName(request: TransferQueueEnqueueRequest): string {
  if (request.fileName?.trim()) return request.fileName.trim();
  const sourcePath = request.direction === 'upload' ? request.localPath : request.remotePath;
  const normalized = String(sourcePath || '').replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).pop() || 'transfer';
}

function publicTransferItem(item: TransferQueueRuntimeItem): TransferQueueItem {
  const { request: _request, cancelRequested: _cancelRequested, ...publicItem } = item;
  return { ...publicItem };
}

function snapshotTransferQueue(): TransferQueueItem[] {
  return transferQueueItems.map(publicTransferItem);
}

function emitTransferQueueChanged(): void {
  const items = snapshotTransferQueue();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('transfer-queue:changed', items);
  }
}

function updateTransferItem(item: TransferQueueRuntimeItem, patch: Partial<TransferQueueItem>): void {
  Object.assign(item, patch);
  emitTransferQueueChanged();
}

function enqueueTransfer(request: TransferQueueEnqueueRequest, retryOf?: string): TransferQueueItem {
  const profile = sanitizeRemoteFileProfile(request.profile);
  const normalizedRequest: TransferQueueEnqueueRequest = {
    ...request,
    profile,
    direction: request.direction === 'download' ? 'download' : 'upload',
    localPath: String(request.localPath || ''),
    remotePath: normalizeRemoteDir(String(request.remotePath || '/')),
    fileName: transferDisplayName(request),
    overwritePolicy: normalizeTransferOverwritePolicy(request.overwritePolicy),
  };

  const now = Date.now();
  const item: TransferQueueRuntimeItem = {
    id: `transfer-${now}-${++transferQueueCounter}`,
    direction: normalizedRequest.direction,
    state: 'queued',
    profileId: profile.id,
    profileName: profile.name || profile.host || profile.protocol.toUpperCase(),
    localPath: normalizedRequest.localPath,
    remotePath: normalizedRequest.remotePath,
    fileName: normalizedRequest.fileName || transferDisplayName(normalizedRequest),
    overwritePolicy: normalizedRequest.overwritePolicy ?? 'overwrite',
    bytesTransferred: 0,
    bytesTotal: 0,
    createdAt: now,
    retryOf,
    request: normalizedRequest,
    cancelRequested: false,
  };

  transferQueueItems.unshift(item);
  emitTransferQueueChanged();
  void runTransferQueue();
  return publicTransferItem(item);
}

function assertTransferNotCanceled(item: TransferQueueRuntimeItem): void {
  if (item.cancelRequested || item.state === 'canceled') {
    throw new Error('Transfer canceled.');
  }
}

function remoteParentPath(remotePath: string): string {
  const clean = normalizeRemoteDir(remotePath).replace(/\/+$/, '');
  if (!clean || clean === '/') return '/';
  const index = clean.lastIndexOf('/');
  return index <= 0 ? '/' : clean.slice(0, index);
}

async function remoteFileExists(profile: RemoteFileProfile, remotePath: string): Promise<boolean> {
  try {
    const parentPath = remoteParentPath(remotePath);
    const name = path.posix.basename(remotePath);
    const entries = await remoteFileList(profile, parentPath);
    return entries.some((entry) => entry.name === name);
  } catch {
    return false;
  }
}

async function remoteFileSize(profile: RemoteFileProfile, remotePath: string): Promise<number> {
  try {
    const parentPath = remoteParentPath(remotePath);
    const name = path.posix.basename(remotePath);
    const entries = await remoteFileList(profile, parentPath);
    return entries.find((entry) => entry.name === name)?.size ?? 0;
  } catch {
    return 0;
  }
}

async function pipeSftpUpload(
  item: TransferQueueRuntimeItem,
  sftp: SFTPWrapper,
  localPath: string,
  remotePath: string,
): Promise<void> {
  let transferred = 0;
  const source = fs.createReadStream(localPath);
  source.on('data', (chunk: string | Buffer) => {
    assertTransferNotCanceled(item);
    transferred += Buffer.byteLength(chunk);
    updateTransferItem(item, { bytesTransferred: Math.min(transferred, item.bytesTotal || transferred) });
  });
  await pipeline(source, sftp.createWriteStream(remotePath));
}

async function pipeSftpDownload(
  item: TransferQueueRuntimeItem,
  sftp: SFTPWrapper,
  remotePath: string,
  localPath: string,
): Promise<void> {
  let transferred = 0;
  const source = sftp.createReadStream(remotePath);
  source.on('data', (chunk: string | Buffer) => {
    assertTransferNotCanceled(item);
    transferred += Buffer.byteLength(chunk);
    updateTransferItem(item, { bytesTransferred: Math.min(transferred, item.bytesTotal || transferred) });
  });
  await pipeline(source, fs.createWriteStream(localPath));
}

async function performUploadTransfer(item: TransferQueueRuntimeItem): Promise<void> {
  const profile = sanitizeRemoteFileProfile(item.request.profile);
  const localPath = path.resolve(item.request.localPath);
  const remotePath = normalizeRemoteDir(item.request.remotePath);
  const stat = await fs.promises.stat(localPath);
  if (!stat.isFile()) throw new Error('Only file transfers are supported.');
  updateTransferItem(item, { bytesTotal: stat.size, bytesTransferred: 0 });

  if (item.overwritePolicy === 'skip' && (await remoteFileExists(profile, remotePath))) {
    updateTransferItem(item, { bytesTransferred: stat.size });
    return;
  }

  if (profile.protocol === 'sftp') {
    await withSftpClient(profile, async (sftp) => {
      assertTransferNotCanceled(item);
      await pipeSftpUpload(item, sftp, localPath, remotePath);
    });
    return;
  }

  await withBasicFtpClient(profile, async (client, normalizedProfile) => {
    client.trackProgress((info) => {
      updateTransferItem(item, { bytesTransferred: Math.min(info.bytesOverall, item.bytesTotal || info.bytesOverall) });
    });
    try {
      assertTransferNotCanceled(item);
      await client.uploadFrom(localPath, encodeFtpPath(remotePath, normalizedProfile));
    } finally {
      client.trackProgress();
    }
  });
}

async function performDownloadTransfer(item: TransferQueueRuntimeItem): Promise<void> {
  const profile = sanitizeRemoteFileProfile(item.request.profile);
  const remotePath = normalizeRemoteDir(item.request.remotePath);
  const localPath = path.resolve(item.request.localPath);

  if (item.overwritePolicy === 'skip' && fs.existsSync(localPath)) {
    return;
  }

  await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
  const size = await remoteFileSize(profile, remotePath);
  updateTransferItem(item, { bytesTotal: size, bytesTransferred: 0 });

  if (profile.protocol === 'sftp') {
    await withSftpClient(profile, async (sftp) => {
      assertTransferNotCanceled(item);
      await pipeSftpDownload(item, sftp, remotePath, localPath);
    });
    return;
  }

  await withBasicFtpClient(profile, async (client, normalizedProfile) => {
    client.trackProgress((info) => {
      updateTransferItem(item, { bytesTransferred: Math.min(info.bytesOverall, item.bytesTotal || info.bytesOverall) });
    });
    try {
      assertTransferNotCanceled(item);
      await client.downloadTo(localPath, encodeFtpPath(remotePath, normalizedProfile));
    } finally {
      client.trackProgress();
    }
  });
}

async function performTransfer(item: TransferQueueRuntimeItem): Promise<void> {
  if (item.direction === 'upload') {
    await performUploadTransfer(item);
  } else {
    await performDownloadTransfer(item);
  }
}

async function runTransferQueue(): Promise<void> {
  if (transferQueueRunning) return;
  transferQueueRunning = true;
  try {
    while (true) {
      const item = transferQueueItems.find((entry) => entry.state === 'queued');
      if (!item) return;
      if (item.cancelRequested) {
        updateTransferItem(item, { state: 'canceled', finishedAt: Date.now() });
        continue;
      }
      updateTransferItem(item, { state: 'running', startedAt: Date.now(), error: undefined });
      try {
        await performTransfer(item);
        if (item.cancelRequested) {
          updateTransferItem(item, { state: 'canceled', finishedAt: Date.now() });
        } else {
          updateTransferItem(item, {
            state: 'completed',
            bytesTransferred: item.bytesTotal || item.bytesTransferred,
            finishedAt: Date.now(),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!item.cancelRequested) {
          recordDiagnosticLog({
            level: 'error',
            source: 'transfer',
            scope: `${item.profileName} · ${item.direction}`,
            message: `Transfer failed: ${message}`,
            detail: `${item.localPath} -> ${item.remotePath}`,
          });
        }
        updateTransferItem(item, {
          state: item.cancelRequested ? 'canceled' : 'failed',
          error: message,
          finishedAt: Date.now(),
        });
      }
    }
  } finally {
    transferQueueRunning = false;
  }
}

function retryTransfer(id: string): TransferQueueItem | null {
  const item = transferQueueItems.find((entry) => entry.id === id);
  if (!item || (item.state !== 'failed' && item.state !== 'canceled')) return null;
  return enqueueTransfer(item.request, item.id);
}

function cancelTransfer(id: string): TransferQueueItem | null {
  const item = transferQueueItems.find((entry) => entry.id === id);
  if (!item) return null;
  item.cancelRequested = true;
  if (item.state === 'queued') {
    updateTransferItem(item, { state: 'canceled', finishedAt: Date.now() });
  } else {
    emitTransferQueueChanged();
  }
  return publicTransferItem(item);
}

function clearCompletedTransfers(): TransferQueueItem[] {
  for (let i = transferQueueItems.length - 1; i >= 0; i -= 1) {
    if (transferQueueItems[i].state === 'completed' || transferQueueItems[i].state === 'canceled') {
      transferQueueItems.splice(i, 1);
    }
  }
  emitTransferQueueChanged();
  return snapshotTransferQueue();
}

function clearAllTransfers(): TransferQueueItem[] {
  for (let i = transferQueueItems.length - 1; i >= 0; i -= 1) {
    const item = transferQueueItems[i];
    if (item.state === 'running') {
      item.cancelRequested = true;
    } else {
      transferQueueItems.splice(i, 1);
    }
  }
  emitTransferQueueChanged();
  return snapshotTransferQueue();
}

function execFileText(file: string, args: string[], timeoutMs = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || error.message || error)));
          return;
        }
        resolve(String(stdout ?? ''));
      },
    );
  });
}

function processMemoryBytes(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function parseWindowsProcessJson(output: string): ProcessInfo[] {
  const trimmed = output.trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed) as unknown;
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.flatMap((item): ProcessInfo[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const pid = Number(record.ProcessId);
    if (!Number.isFinite(pid) || pid <= 0) return [];
    const ppid = Number(record.ParentProcessId);
    const name = String(record.Name || `pid-${pid}`);
    const command = String(record.CommandLine || name);
    const executablePath = typeof record.ExecutablePath === 'string' ? record.ExecutablePath : undefined;
    const startedAt = typeof record.CreationDate === 'string' ? record.CreationDate : undefined;
    return [
      {
        pid,
        ppid: Number.isFinite(ppid) && ppid >= 0 ? ppid : undefined,
        name,
        command,
        path: executablePath,
        startedAt,
        memoryBytes: processMemoryBytes(record.WorkingSetSize),
        source: 'local',
      },
    ];
  });
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
      continue;
    }
    cell += char;
  }
  cells.push(cell);
  return cells;
}

function parseTasklistCsv(output: string): ProcessInfo[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line): ProcessInfo[] => {
      const cells = parseCsvLine(line);
      const name = cells[0]?.trim();
      const pid = Number(cells[1]);
      if (!name || !Number.isFinite(pid) || pid <= 0) return [];
      return [
        {
          pid,
          name,
          command: name,
          source: 'local',
        },
      ];
    });
}

function parsePosixProcesses(output: string): ProcessInfo[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line): ProcessInfo[] => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
      if (!match) return [];
      const pid = Number(match[1]);
      const ppid = Number(match[2]);
      const rssKb = Number(match[3]);
      const name = match[4] || `pid-${pid}`;
      const args = match[5]?.trim();
      return [
        {
          pid,
          ppid: Number.isFinite(ppid) ? ppid : undefined,
          name,
          command: args || name,
          memoryBytes: Number.isFinite(rssKb) ? rssKb * 1024 : undefined,
          source: 'local',
        },
      ];
    });
}

async function listLocalProcesses(): Promise<ProcessInfo[]> {
  if (process.platform === 'win32') {
    const script = [
      'Get-CimInstance Win32_Process',
      'Select-Object ProcessId,ParentProcessId,Name,CommandLine,ExecutablePath,CreationDate,WorkingSetSize',
      'ConvertTo-Json -Depth 2 -Compress',
    ].join(' | ');
    try {
      const output = await execFileText(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
        12000,
      );
      return parseWindowsProcessJson(output).sort((a, b) => a.pid - b.pid);
    } catch {
      const output = await execFileText('tasklist.exe', ['/FO', 'CSV', '/NH'], 12000);
      return parseTasklistCsv(output).sort((a, b) => a.pid - b.pid);
    }
  }

  const output = await execFileText('ps', ['-eo', 'pid=,ppid=,rss=,comm=,args='], 12000);
  return parsePosixProcesses(output).sort((a, b) => a.pid - b.pid);
}

async function killLocalProcess(pid: number, force = false): Promise<ProcessKillResult> {
  const targetPid = Number(pid);
  if (!Number.isInteger(targetPid) || targetPid <= 0) {
    return { ok: false, pid: targetPid, error: 'Invalid process id.' };
  }
  if (targetPid === process.pid) {
    return { ok: false, pid: targetPid, error: 'Refusing to terminate the Xenesis Desk main process.' };
  }

  try {
    if (process.platform === 'win32') {
      const args = ['/PID', String(targetPid), '/T'];
      if (force) args.push('/F');
      await execFileText('taskkill.exe', args, 10000);
    } else {
      process.kill(targetPid, force ? 'SIGKILL' : 'SIGTERM');
    }
    return { ok: true, pid: targetPid, message: `Termination requested for process ${targetPid}.` };
  } catch (error) {
    return {
      ok: false,
      pid: targetPid,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── IPC 핸들러 ───────────────────────────────────────────────────────────────

function setupIpc(): void {
  // ── 설정 ──
  ipcMain.handle('app:get-settings', () => loadSettingsForPersist());
  ipcMain.handle('secret-vault:status', () => getSecretVaultStatus());
  ipcMain.handle('secret-vault:clear', () => clearSecretVault());
  ipcMain.handle('process-viewer:list', (): Promise<ProcessInfo[]> => listLocalProcesses());
  ipcMain.handle(
    'process-viewer:kill',
    (_event, pid: number, force?: boolean): Promise<ProcessKillResult> => killLocalProcess(pid, force === true),
  );
  ipcMain.handle(
    'safe-file:preview',
    (_event, request: SafeFilePreviewRequest): Promise<SafeFilePreviewResult> => previewSafeTextFileWrite(request),
  );
  ipcMain.handle(
    'safe-file:apply',
    (_event, request: SafeFileApplyRequest): Promise<SafeFileApplyResult> => applySafeTextFileWrite(request),
  );
  ipcMain.handle(
    'safe-file:restore',
    (_event, request: SafeFileRestoreRequest): Promise<SafeFileRestoreResult> => restoreSafeTextFileBackup(request),
  );

  ipcMain.handle('app:save-settings', async (_event, settings: Partial<AppSettings>) => {
    await saveApplicationSettings(settings);
  });

  ipcMain.handle('app:export-settings', async (): Promise<SettingsExportResult> => {
    return exportSettingsToDialog();
  });

  ipcMain.handle('app:import-settings', async (): Promise<SettingsImportResult> => {
    return importSettingsFromDialog();
  });

  ipcMain.handle('app:list-settings-backups', (): Promise<SettingsBackupListItem[]> => listSettingsBackups());

  ipcMain.handle(
    'app:restore-settings-backup',
    (_event, filePath: string): Promise<SettingsImportResult> => restoreSettingsBackup(filePath),
  );

  ipcMain.handle('extensions:list', () => getExtensionHost().listExtensions());

  ipcMain.handle('extensions:reload', () => getExtensionHost().reload());

  ipcMain.handle('extensions:retry', (_event, extensionId: string) =>
    getExtensionHost().retry(String(extensionId || '')),
  );

  ipcMain.handle('extensions:set-enabled', (_event, extensionId: string, enabled: boolean) =>
    getExtensionHost().setEnabled(String(extensionId), Boolean(enabled)),
  );

  ipcMain.handle('extensions:run-command', (_event, commandId: string) =>
    getExtensionHost().runCommand(String(commandId)),
  );

  ipcMain.handle(
    'workflow-runs:list',
    (_event, request?: WorkflowRunHistoryListRequest): Promise<WorkflowRunHistoryRecord[]> =>
      listWorkflowRunHistory(request ?? {}),
  );

  ipcMain.handle(
    'workflow-runs:save',
    (_event, record: WorkflowRunHistoryRecord): Promise<WorkflowRunHistorySaveResult> =>
      saveWorkflowRunHistoryRecord(record),
  );

  ipcMain.handle(
    'workflow-runs:delete',
    (_event, id: string): Promise<WorkflowRunHistoryRecord[]> => deleteWorkflowRunHistoryRecord(String(id || '')),
  );

  ipcMain.handle('workflow-runs:clear', (): Promise<WorkflowRunHistoryRecord[]> => clearWorkflowRunHistory());

  ipcMain.handle('workflow-templates:list', (): Promise<WorkflowTemplateRecord[]> => listWorkflowTemplates());

  ipcMain.handle(
    'workflow-templates:save',
    (_event, template: WorkflowTemplateRecord): Promise<WorkflowTemplateSaveResult> =>
      saveWorkflowTemplateRecord(template),
  );

  ipcMain.handle(
    'workflow-templates:favorite',
    (_event, id: string, favorite: boolean): Promise<WorkflowTemplateRecord[]> =>
      updateWorkflowTemplate(id, { favorite: Boolean(favorite) }),
  );

  ipcMain.handle(
    'workflow-templates:touch',
    (_event, id: string): Promise<WorkflowTemplateRecord[]> =>
      updateWorkflowTemplate(id, { lastUsedAt: new Date().toISOString() }),
  );

  ipcMain.handle(
    'workflow-templates:remove',
    (_event, id: string): Promise<WorkflowTemplateRecord[]> => removeWorkflowTemplate(id),
  );

  ipcMain.handle(
    'workflow-playwright:snapshot',
    (_event, request: WorkflowPlaywrightSnapshotRequest): Promise<WorkflowPlaywrightResult> =>
      runPlaywrightWorker('snapshot', request ?? { url: '' }),
  );

  ipcMain.handle(
    'workflow-playwright:run',
    (_event, request: WorkflowPlaywrightRunRequest): Promise<WorkflowPlaywrightResult> =>
      runPlaywrightWorker('run', request ?? { url: '', actions: [] }),
  );

  ipcMain.handle('mcp-settings:status', (): McpSettingsStatus => getMcpSettingsStatus());
  ipcMain.handle(
    'provider-integration:status',
    (_event, request?: ProviderIntegrationStatusRequest): ProviderIntegrationStatus =>
      getProviderIntegrationStatusSnapshot(request),
  );
  ipcMain.handle(
    'provider-integration:install-cli',
    (_event, request?: ProviderIntegrationCliInstallRequest): ProviderIntegrationCliInstallResult =>
      runProviderIntegrationCliInstall(request),
  );
  ipcMain.handle(
    'provider-integration:install-hermes-plugins',
    (_event, request?: ProviderIntegrationHermesInstallRequest): ProviderIntegrationHermesInstallResult =>
      runProviderIntegrationHermesInstall(request),
  );
  ipcMain.handle('mcp:renderer-state', (_event, snapshot: unknown): { ok: boolean } => {
    latestMcpRendererState = sanitizeMcpRendererStateSnapshot(snapshot);
    return { ok: Boolean(latestMcpRendererState) };
  });
  ipcMain.handle('mcp:open-builtin-pane-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpOpenBuiltinPaneResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpOpenBuiltinPaneRequests.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpOpenBuiltinPaneRequests.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:dock-action-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpDockActionResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpDockActions.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpDockActions.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:browser-action-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpBrowserActionResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpBrowserActions.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpBrowserActions.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:explorer-action-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpExplorerActionResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpExplorerActions.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpExplorerActions.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:remote-explorer-action-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpRemoteExplorerActionResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpRemoteExplorerActions.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpRemoteExplorerActions.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:terminal-ui-action-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpTerminalUiActionResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpTerminalUiActions.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpTerminalUiActions.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:onboarding-step-action-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpOnboardingStepActionResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpOnboardingStepActions.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpOnboardingStepActions.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:onboarding-scenario-run-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpOnboardingScenarioRunResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpOnboardingScenarioRuns.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpOnboardingScenarioRuns.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:onboarding-run-preview-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpOnboardingRunPreviewResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpOnboardingRunPreviews.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpOnboardingRunPreviews.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:onboarding-demo-mode-run-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpOnboardingDemoModeRunResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpOnboardingDemoModeRuns.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpOnboardingDemoModeRuns.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:demo-lab-playback-control-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpDemoLabPlaybackControlResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpDemoLabPlaybackControls.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpDemoLabPlaybackControls.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:favorites-action-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpFavoritesActionResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpFavoritesActions.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpFavoritesActions.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:renderer-performance-trace-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpRendererPerformanceTraceResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpRendererPerformanceTraces.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpRendererPerformanceTraces.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:capture-active-pane-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpCaptureActivePaneResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpCaptureActivePaneRequests.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpCaptureActivePaneRequests.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:gowoori-artifact-visibility-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpGowooriArtifactVisibilityResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpGowooriArtifactVisibilityRequests.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpGowooriArtifactVisibilityRequests.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:gowoori-overlay-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpGowooriOverlayResult(result);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpGowooriOverlayRequests.get(sanitized.requestId);
    if (!pending) return { ok: false };
    clearTimeout(pending.timeout);
    pendingMcpGowooriOverlayRequests.delete(sanitized.requestId);
    pending.resolve(sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:gowoori-chat-run-result', (_event, result: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpGowooriChatRunResult(result);
    if (!sanitized) return { ok: false };
    return { ok: handleMcpGowooriChatRunResult(sanitized) };
  });
  ipcMain.handle('mcp:gowoori-chat-run-progress', (_event, progress: unknown): { ok: boolean } => {
    const sanitized = sanitizeMcpGowooriChatRunProgress(progress);
    if (!sanitized) return { ok: false };
    const pending = pendingMcpGowooriChatRuns.get(sanitized.requestId);
    if (!pending) return { ok: false };
    appendMcpGowooriChatRunProgress(pending, sanitized);
    return { ok: true };
  });
  ipcMain.handle('mcp:bridge-status', (): McpBridgeStatus => buildMcpBridgeStatusSnapshot());
  ipcMain.handle('mcp:action-inbox-list', (): McpBridgeActionInboxItem[] => listMcpActionInboxSnapshot());
  ipcMain.handle(
    'mcp:action-inbox-resolve',
    (_event, request: McpBridgeActionInboxResolveRequest): Promise<McpBridgeActionInboxResolveResult> =>
      resolveMcpActionInboxRequest(request),
  );
  ipcMain.handle(
    'mcp:capability-call',
    (_event, request: McpBridgeCapabilityCallRequest): Promise<McpBridgeCapabilityCallResult> =>
      callMcpBridgeCapabilityFromRequest(request, 'workflow'),
  );
  ipcMain.handle(
    'mcp:capability-approval-remember',
    (_event, entries: McpBridgeCapabilityApprovalRememberEntry[]): McpBridgeCapabilityApprovalRememberResult =>
      rememberMcpCapabilityApprovalsFromRequest(entries),
  );
  ipcMain.handle('mcp:bot-sessions-list', (): McpBridgeBotSession[] => listMcpBotSessionsSnapshot());
  ipcMain.handle(
    'mcp:bot-session-save',
    (_event, session: McpBridgeBotSession): McpBridgeBotSessionSaveResult => saveMcpBotSessionSnapshot(session),
  );

  ipcMain.handle('diagnostics:list', (): DiagnosticsLogEntry[] => listDiagnosticsLogs());

  ipcMain.handle(
    'diagnostics:record',
    (_event, entry: DiagnosticsLogRecordRequest): DiagnosticsLogEntry => recordDiagnosticLog(entry),
  );

  ipcMain.handle('diagnostics:clear', (): DiagnosticsLogEntry[] => clearDiagnosticsLogs());

  ipcMain.handle('diagnostics:reveal-log-file', (): boolean => revealDiagnosticsLogFile());

  ipcMain.handle('diagnostics:export-bundle', (): Promise<DiagnosticsBundleExportResult> => exportDiagnosticsBundle());

  ipcMain.handle('workspace:save-as', async (_event, rawProfile: WorkspaceProfile, suggestedName?: string) => {
    const profile = normalizeWorkspaceProfile(rawProfile, String(suggestedName || 'Workspace'));
    const safeName = `${(suggestedName || profile.name || 'Workspace').replace(/[\\/:*?"<>|]/g, '_')}.xcon-desk-workspace.json`;
    const workspaceDir = getDefaultWorkspaceProfilesDir();
    await fs.promises.mkdir(workspaceDir, { recursive: true });
    const result = await dialog.showSaveDialog({
      title: 'Xcon Desk Workspace 저장',
      defaultPath: path.join(workspaceDir, safeName),
      filters: [
        { name: 'Xcon Desk Workspace', extensions: ['xcon-desk-workspace.json', 'json'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { saved: false, recent: loadSettings().workspace.recent };
    }

    return saveWorkspaceProfileToPath(profile, result.filePath);
  });

  ipcMain.handle('workspace:save-to', async (_event, rawProfile: WorkspaceProfile, filePath: string) => {
    return saveWorkspaceProfileToPath(rawProfile, filePath);
  });

  ipcMain.handle('workspace:open', async (): Promise<WorkspaceOpenResult | null> => {
    const workspaceDir = getDefaultWorkspaceProfilesDir();
    await fs.promises.mkdir(workspaceDir, { recursive: true });
    const result = await dialog.showOpenDialog({
      title: 'Xcon Desk Workspace 열기',
      defaultPath: workspaceDir,
      properties: ['openFile'],
      filters: [
        { name: 'Xcon Desk Workspace', extensions: ['xcon-desk-workspace.json', 'json'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    return readWorkspaceProfile(filePath);
  });

  ipcMain.handle('workspace:read', async (_event, filePath: string): Promise<WorkspaceOpenResult> => {
    const requestedPath = String(filePath ?? '').trim();
    if (!requestedPath) {
      throw new Error('Workspace path is required.');
    }
    return readWorkspaceProfile(path.resolve(requestedPath));
  });

  ipcMain.handle('workspace:clear-recent', (): WorkspaceRecentItem[] => {
    const current = loadSettings().workspace;
    persistSettings({ workspace: { ...current, recent: [] } });
    return [];
  });

  ipcMain.handle('window:get-current-bounds', (event): WindowBounds | null => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return null;
    return win.getBounds();
  });

  ipcMain.handle(
    'window:apply-sizer-preset',
    (event, preset: WindowSizerPreset): { applied: boolean; bounds: WindowBounds } => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win || win.isDestroyed()) {
        throw new Error('Window is not available.');
      }

      const normalizedPreset = normalizeWindowSizerPreset(preset);
      const nextBounds = buildWindowSizerBounds(win, normalizedPreset);
      win.setBounds(nextBounds, true);
      win.focus();

      return { applied: true, bounds: win.getBounds() };
    },
  );

  // ── 내부 서버 (모두 비동기 — isPortListening 대기) ──
  ipcMain.handle('server:status', (): Promise<ServerStatus> => getInternalServerStatus());
  ipcMain.handle('server:start', (): Promise<ServerStatus> => startInternalServer());
  ipcMain.handle('server:stop', (): Promise<ServerStatus> => stopInternalServer());

  // ── xamongcode sidecar API 서버 ──
  ipcMain.handle('xamong-code:status', (): Promise<XamongCodeServerStatus> => getXamongCodeServerStatus());
  ipcMain.handle('xamong-code:start', (): Promise<XamongCodeServerStatus> => startXamongCodeServer());
  ipcMain.handle('xamong-code:stop', (): Promise<XamongCodeServerStatus> => stopXamongCodeServer());

  // ── Xenesis gateway sidecar ──
  ipcMain.handle('xenesis:status', (): Promise<XenesisStatus> => getXenesisStatusPayload());
  ipcMain.handle(
    'xenesis:set-workspace',
    (_event, workspacePath: string): Promise<XenesisStatus> => setXenesisActiveWorkspace(workspacePath),
  );
  ipcMain.handle('xenesis:profiles', (): Promise<XenesisProfileState> => getXenesisProfileState());
  ipcMain.handle(
    'xenesis:profile-install',
    (_event, request: XenesisProfileInstallRequest): Promise<XenesisProfileState> => installXenesisProfile(request),
  );
  ipcMain.handle(
    'xenesis:profile-use',
    (_event, name: string): Promise<XenesisProfileState> => useXenesisProfile(name),
  );
  ipcMain.handle(
    'xenesis:profile-channels-update',
    (_event, request: XenesisProfileChannelsUpdateRequest): Promise<XenesisProfileState> =>
      updateXenesisProfileChannels(request),
  );
  ipcMain.handle(
    'xenesis:profile-channel-test',
    (_event, request: XenesisProfileChannelTestRequest): Promise<XenesisProfileChannelTestResult> =>
      testXenesisProfileChannel(request),
  );
  ipcMain.handle(
    'xenesis:reports',
    (_event, query?: XenesisReportQuery): Promise<{ reports: XenesisReportSummary[] }> => listXenesisReports(query),
  );
  ipcMain.handle(
    'xenesis:tasks',
    (_event, query?: XenesisTaskQuery): Promise<{ tasks: XenesisTaskSummary[] }> => listXenesisAgentTasks(query),
  );
  ipcMain.handle(
    'xenesis:diagnostics',
    (): Promise<XenesisOperationalDiagnostics> => getXenesisOperationalDiagnostics(),
  );
  ipcMain.handle('xenesis:gateway-status', (): Promise<XenesisStatus> => getXenesisStatusPayload());
  ipcMain.handle('xenesis:connections-status', (): Promise<XenesisConnectionsStatus> => getXenesisConnectionsStatus());
  ipcMain.handle('xenesis:gateway-start', (): Promise<XenesisStatus> => startXenesisGatewayRuntime());
  ipcMain.handle('xenesis:gateway-stop', (): Promise<XenesisStatus> => stopXenesisGatewayRuntime());
  ipcMain.handle('xenesis:gateway-restart', async (): Promise<XenesisStatus> => {
    await stopXenesisGatewayRuntime();
    return startXenesisGatewayRuntime();
  });
  ipcMain.handle('xenesis:gateway-open-dashboard', (): Promise<XenesisStatus> => openXenesisGatewayDashboard());
  ipcMain.handle('xenesis:start', (): Promise<XenesisStatus> => startXenesisRuntime());
  ipcMain.handle('xenesis:stop', (): Promise<XenesisStatus> => stopXenesisRuntime());
  ipcMain.handle('xenesis:restart', (): Promise<XenesisStatus> => restartXenesisRuntime());
  ipcMain.handle('xenesis:cancel', (): Promise<XenesisStatus> => cancelXenesisRuntime());
  ipcMain.handle('xenesis:reset-session', (): Promise<XenesisStatus> => resetXenesisSession());
  ipcMain.handle('xenesis:run', async (event, request: XenesisRunRequest): Promise<XenesisRunResult> => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    return runXenesisRequest(request, (runEvent) => {
      event.sender.send('xenesis:run-event', runEvent);
      recordXenesisRunEventObservation(senderWindow, runEvent);
    });
  });

  // ── 로컬 코드 에이전트 CLI 감지 ──
  ipcMain.handle('local-cli:scan', (): LocalCliAgentStatus[] =>
    scanLocalCliAgents({
      env: process.env,
      existsSync: fs.existsSync,
      spawnSync,
      includeVersions: true,
    }),
  );

  // ── 셸 목록 ──
  ipcMain.handle('terminal:list-shells', (): ShellDescriptor[] => {
    return getShellDescriptorsForPlatform();
  });

  // ── 터미널 세션 생성 ──
  ipcMain.handle('terminal:spawn', (event, request: TerminalSpawnRequest): TerminalSpawnResult => {
    const id = String(request.id || '').trim();

    if (!id || id.length > 100) {
      throw new Error('Invalid terminal session id.');
    }

    if (sessions.has(id)) {
      throw new Error(`Terminal session already exists: ${id}`);
    }

    const cols = clamp(request.cols, 20, 400, 120);
    const rows = clamp(request.rows, 5, 200, 30);
    const spawnWindow = BrowserWindow.fromWebContents(event.sender);
    let record!: SessionRecord;

    const onData = (data: string) => {
      // 스크롤백 버퍼에 추가 (새 창 채택 시 재생용)
      record.scrollbackChunks.push(data);
      record.scrollbackBytes += data.length;
      // 버퍼 초과 시 가장 오래된 청크 제거
      while (record.scrollbackBytes > SCROLLBACK_MAX_BYTES && record.scrollbackChunks.length > 1) {
        const removed = record.scrollbackChunks.shift()!;
        record.scrollbackBytes -= removed.length;
      }

      // ownerWindowId가 null이면 소유자 없음 → 출력 드롭 (탭 이동 핸드오프 중)
      if (record.ownerWindowId === null) return;
      const ownerWin = getWindowById(record.ownerWindowId);
      const payload: TerminalDataEvent = { id, data };
      sendToRenderer(ownerWin, `terminal:data:${id}`, payload);
      recordTerminalOutputObservation(ownerWin, id, data);

      // 자동화 엔진으로 출력 전달 (비동기, 오류가 터미널 스트림에 영향 안 줌)
      automationControllers
        .get(id)
        ?.onOutput(data)
        .catch(() => undefined);
    };

    const onExit = (exitCode: number, signal?: number) => {
      const sessionRecord = sessions.get(id);
      sessions.delete(id);
      automationControllers.delete(id);
      const payload: TerminalExitEvent = { id, exitCode, signal };
      // 종료 시점의 ownerWindowId로 exit 이벤트 전송
      const exitOwnerWinId = sessionRecord?.ownerWindowId ?? null;
      const exitOwnerWin = exitOwnerWinId !== null ? getWindowById(exitOwnerWinId) : spawnWindow;
      sendToRenderer(exitOwnerWin, `terminal:exit:${id}`, payload);
      recordTerminalExitObservation(exitOwnerWin, id, exitCode, signal);
    };

    let started: TerminalBackendStart;
    if (request.kind === 'ssh') {
      started = createSshBackend(request.profile, cols, rows, { onData, onExit });
    } else if (request.kind === 'telnet') {
      started = createTelnetBackend(request.profile, { onData, onExit });
    } else {
      if (!('shell' in request)) {
        throw new Error('Shell terminal request requires shell.');
      }
      started = createShellBackend(request, cols, rows, { onData, onExit });
    }

    record = {
      id,
      kind: started.kind,
      shell: started.shell,
      profileId: started.profileId,
      command: started.command,
      cwd: started.cwd,
      backend: started.backend,
      ownerWindowId: spawnWindow?.id ?? null,
      scrollbackChunks: [],
      scrollbackBytes: 0,
      lastCommand:
        request.kind !== 'ssh' && request.kind !== 'telnet'
          ? request.profile?.initialCommand?.trim() || undefined
          : undefined,
    };

    sessions.set(id, record);
    emitMainInstantOperation(
      getMainObservabilityWindow(spawnWindow),
      {
        activity: {
          source: 'terminal',
          label: 'terminal.spawn',
          detail: summarizeMainObservabilityPayload(
            { id, command: record.command, cwd: record.cwd, source: 'ipc' },
            600,
          ),
        },
      },
      {
        responseBody: { id, command: record.command, cwd: record.cwd, source: 'ipc' },
      },
    );

    // ── 자동화 컨트롤러 생성 (기본 비활성화) ────────────────────────────────
    const automationRuntime = getAutomationRuntimeConfig();
    const automationCtrl = new AutomationController({
      termId: id,
      stage: automationRuntime.stage,
      write: (data) => {
        trackTerminalInput(record, data);
        try {
          record.backend.write(data);
        } catch {
          /* 종료 후 무시 */
        }
      },
      notifyStatus: (status) => {
        const ownerWin = record.ownerWindowId !== null ? getWindowById(record.ownerWindowId) : null;
        sendToRenderer(ownerWin, `automation:status:${id}`, status);
      },
      notifyEvent: (event) => {
        const ownerWin = record.ownerWindowId !== null ? getWindowById(record.ownerWindowId) : null;
        sendToRenderer(ownerWin, `automation:event:${id}`, event);
      },
      observeEvent: (event) => {
        const ownerWin = record.ownerWindowId !== null ? getWindowById(record.ownerWindowId) : null;
        recordAutomationEventObservation(ownerWin, event);
      },
      settings: automationRuntime.settings,
      fallbackApiKey: automationRuntime.fallbackApiKey,
      eventLog: automationEventLogSink,
      getStreamContext: () => ({
        lastCommand: record.lastCommand,
        recentOutput: record.scrollbackChunks.slice(-8).join(''),
      }),
    });
    automationControllers.set(id, automationCtrl);

    return {
      id,
      kind: started.kind,
      pid: started.backend.pid,
      shell: started.shell,
      command: started.command,
      cwd: started.cwd,
      profileId: started.profileId,
    };
  });

  // ── 터미널 입력 ──
  ipcMain.on('terminal:write', (_event, payload: { id?: string; data?: string }) => {
    const session = payload.id ? sessions.get(payload.id) : undefined;
    const data = typeof payload.data === 'string' ? payload.data : '';

    if (!session || data.length > 100_000) return;
    trackTerminalInput(session, data);
    automationControllers.get(session.id)?.recordTerminalInput(data);

    try {
      session.backend.write(data);
    } catch {
      // Ignore writes after exit.
    }
  });

  // ── 터미널 인라인 이미지 출력 ──
  ipcMain.handle(
    'terminal:write-image',
    async (
      _event,
      payload: {
        id?: string;
        source?: string;
        base64?: string;
        options?: TerminalImageOptions;
      },
    ) => {
      const session = payload.id ? sessions.get(payload.id) : undefined;
      if (!session) return { ok: false, error: 'Terminal session not found' };

      let source: string | Buffer;
      if (payload.base64) {
        source = Buffer.from(payload.base64, 'base64');
      } else if (payload.source) {
        source = payload.source;
      } else {
        return { ok: false, error: 'No image source provided (source or base64 required)' };
      }

      return writeTerminalImageToDisplay(session, source, payload.options ?? {});
    },
  );

  // ── 터미널 XCON 인라인 렌더 ──
  ipcMain.handle(
    'terminal:write-xcon-image',
    async (
      _event,
      payload: {
        id?: string;
        xcon?: string;
        options?: XconRenderOptions;
      },
    ) => {
      const session = payload.id ? sessions.get(payload.id) : undefined;
      if (!session) return { ok: false, error: 'Terminal session not found' };
      if (!payload.xcon) return { ok: false, error: 'No XCON input provided' };

      return writeTerminalXconImageToDisplay(session, payload.xcon, payload.options ?? {});
    },
  );

  // ── XCON → PNG 렌더 (터미널 무관, 채널 범용) ──
  ipcMain.handle(
    'xcon:render-to-png',
    async (
      _event,
      payload: {
        xcon?: string;
        options?: { syntax?: string; theme?: string; viewportWidth?: number; title?: string };
      },
    ) => {
      if (!payload.xcon) return { ok: false, error: 'No XCON input provided' };
      const result = await renderXconToPng(payload.xcon, (payload.options as any) ?? {});
      // Buffer는 IPC로 전송 불가 — base64로만 반환
      return {
        ok: result.ok,
        base64: result.base64,
        pngBytes: result.pngBytes,
        width: result.width,
        height: result.height,
        error: result.error,
      };
    },
  );

  // ── 터미널 리사이즈 ──
  ipcMain.on('terminal:resize', (_event, payload: { id?: string; cols?: number; rows?: number }) => {
    const session = payload.id ? sessions.get(payload.id) : undefined;
    if (!session) return;

    const cols = clamp(payload.cols, 20, 400, 120);
    const rows = clamp(payload.rows, 5, 200, 30);

    try {
      session.backend.resize(cols, rows);
    } catch {
      // Resize can race with process exit. Ignore safely.
    }
  });

  // ── 터미널 소유권 이전 (터미널 탭 분리/합치기 시 새 창이 호출) ──
  ipcMain.handle('terminal:adopt', (event, termId: string) => {
    const session = sessions.get(termId);
    if (!session) return null;
    const requesterWin = BrowserWindow.fromWebContents(event.sender);
    if (!requesterWin) return null;
    // 소유권 이전 — 이후 PTY 출력이 새 창으로 라우팅됨
    session.ownerWindowId = requesterWin.id;
    // 스크롤백 버퍼를 이어붙여 반환
    return { scrollback: session.scrollbackChunks.join('') };
  });

  // ── 터미널 종료 ──
  ipcMain.on('terminal:kill', (_event, payload: { id?: string }) => {
    const session = payload.id ? sessions.get(payload.id) : undefined;
    if (!session) return;

    try {
      session.backend.kill();
    } catch {
      // Already killed.
    } finally {
      sessions.delete(session.id);
      automationControllers.delete(session.id);
    }
  });

  // ── 다이얼로그 ──
  ipcMain.handle('dialog:select-cwd', async (): Promise<string | null> => {
    if (selectCwdDialogPromise) return selectCwdDialogPromise;

    selectCwdDialogPromise = (async () => {
      const result = await dialog.showOpenDialog({
        title: '작업 폴더 선택',
        properties: ['openDirectory', 'createDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    })();

    try {
      return await selectCwdDialogPromise;
    } finally {
      selectCwdDialogPromise = null;
    }
  });

  ipcMain.handle('dialog:save-log', async (_event, payload: { defaultName?: string; text?: string }) => {
    const safeName = (payload.defaultName || 'terminal.log').replace(/[\\/:*?"<>|]/g, '_');
    const result = await dialog.showSaveDialog({
      title: '터미널 로그 저장',
      defaultPath: safeName,
      filters: [
        { name: 'Text log', extensions: ['log', 'txt'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { saved: false };
    }

    await fs.promises.writeFile(result.filePath, payload.text || '', 'utf8');
    return { saved: true, path: result.filePath };
  });

  ipcMain.handle('shell:reveal-path', async (_event, targetPath: string): Promise<void> => {
    if (!targetPath) return;
    shell.showItemInFolder(targetPath);
  });

  ipcMain.handle('shell:open-external', async (_event, url: string): Promise<void> => {
    if (!url || typeof url !== 'string') return;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) return;
    await shell.openExternal(url).catch(() => undefined);
  });

  // ── 파일 API ──
  ipcMain.handle('file:open', async (): Promise<OpenFileResult | null> => {
    const result = await dialog.showOpenDialog({
      title: '파일 열기',
      properties: ['openFile'],
      filters: [
        {
          name: 'All Supported',
          extensions: [
            'md',
            'markdown',
            'mmd',
            'js',
            'ts',
            'jsx',
            'tsx',
            'py',
            'html',
            'htm',
            'css',
            'json',
            'xcon',
            'xconj',
            'xcon-workflow',
            'xml',
            'yaml',
            'yml',
            'sh',
            'bat',
            'txt',
            'log',
            'rs',
            'go',
            'java',
            'cpp',
            'c',
            'cs',
            'rb',
            'php',
            'swift',
            'kt',
            'png',
            'jpg',
            'jpeg',
            'gif',
            'webp',
            'svg',
            'bmp',
            'ico',
            'pdf',
            'doc',
            'docx',
            'hwp',
            'hwpx',
            'xls',
            'xlsx',
            'xlsm',
            'xlsb',
            'ppt',
            'pptx',
          ],
        },
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'Mermaid', extensions: ['mmd'] },
        { name: 'XCON Workflow', extensions: ['xcon-workflow', 'workflow', 'xcon'] },
        { name: 'XCON', extensions: ['xcon', 'xconj'] },
        { name: 'Web Documents', extensions: ['html', 'htm'] },
        {
          name: 'Code / Text',
          extensions: [
            'js',
            'ts',
            'jsx',
            'tsx',
            'mjs',
            'cjs',
            'py',
            'html',
            'htm',
            'css',
            'json',
            'xcon',
            'xconj',
            'xcon-workflow',
            'workflow',
            'xml',
            'yaml',
            'yml',
            'sh',
            'bat',
            'txt',
            'log',
            'rs',
            'go',
            'java',
            'cpp',
            'c',
            'cs',
            'rb',
            'php',
            'swift',
            'kt',
          ],
        },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'] },
        {
          name: 'Documents',
          extensions: ['pdf', 'doc', 'docx', 'hwp', 'hwpx', 'xls', 'xlsx', 'xlsm', 'xlsb', 'ppt', 'pptx'],
        },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return readFileToResult(result.filePaths[0]);
  });

  ipcMain.handle('file:read', async (_event, filePath: string): Promise<OpenFileResult | null> => {
    if (!filePath || typeof filePath !== 'string') return null;
    return readFileToResult(filePath);
  });

  ipcMain.handle('file:save-text', async (_event, filePath: string, content: string): Promise<{ saved: boolean }> => {
    if (!filePath || typeof filePath !== 'string') return { saved: false };
    try {
      await fs.promises.writeFile(filePath, content, 'utf8');
      return { saved: true };
    } catch {
      return { saved: false };
    }
  });

  ipcMain.handle(
    'file:save-text-as',
    async (
      _event,
      payload: { defaultName?: string; content?: string; filters?: { name: string; extensions: string[] }[] },
    ): Promise<{ saved: boolean; path?: string }> => {
      const safeName = (payload.defaultName || 'untitled.txt').replace(/[\\/:*?"<>|]/g, '_');
      const filters =
        Array.isArray(payload.filters) && payload.filters.length
          ? payload.filters
          : [
              { name: 'Text', extensions: ['txt'] },
              { name: 'All files', extensions: ['*'] },
            ];
      const result = await dialog.showSaveDialog({
        title: '파일 저장',
        defaultPath: safeName,
        filters,
      });

      if (result.canceled || !result.filePath) {
        return { saved: false };
      }

      await fs.promises.writeFile(result.filePath, payload.content || '', 'utf8');
      return { saved: true, path: result.filePath };
    },
  );

  // ── 탭 분리 창 ──
  ipcMain.handle('window:detach-tab', (_event, payload: DetachPayload) => {
    if (!payload || !payload.id) return;
    const win = createDetachedWindow(payload.title || 'Xenesis Desk');
    detachPayloads.set(win.id, payload);
  });

  ipcMain.handle('window:get-detach-payload', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const payload = detachPayloads.get(win.id) ?? null;
    detachPayloads.delete(win.id);
    return payload;
  });

  // ── 탭 재결합 (분리 창 → 메인 창) ──
  ipcMain.handle('window:reattach-start', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('reattach:show-target');
    }
  });

  ipcMain.handle('window:reattach-cancel', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('reattach:hide-target');
    }
  });

  ipcMain.handle('window:reattach-drop', (_event, payload: DetachPayload) => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('reattach:content', payload);
      mainWindowRef.focus();
    }
    // 창 닫기는 Renderer가 engine.closeContent 후 window:close-self로 처리.
    // 여기서 강제 닫으면 분리 창에 탭이 여러 개일 때 나머지 탭도 사라지는 버그 발생.
  });

  // ── 분리 창 간 합치기 (Detached → Detached merge) ──────────────────────────

  // 메인 창 + 요청 창을 제외한 다른 분리 창 화면 bounds 반환
  ipcMain.handle('window:get-sibling-window-bounds', (event) => {
    const senderWinId = BrowserWindow.fromWebContents(event.sender)?.id;
    const mainBounds = mainWindowRef && !mainWindowRef.isDestroyed() ? { bounds: mainWindowRef.getBounds() } : null;
    const detached: { windowId: number; bounds: { x: number; y: number; width: number; height: number } }[] = [];
    for (const [id, win] of detachedWindows.entries()) {
      if (id === senderWinId || win.isDestroyed()) continue;
      detached.push({ windowId: id, bounds: win.getBounds() });
    }
    return { mainWindow: mainBounds, detachedWindows: detached };
  });

  // target 분리 창에 탭 payload 전달만 수행 — 창 닫기는 Renderer(closeSelf)가 처리
  ipcMain.handle('window:merge-tab-to-detached', (_event, payload: DetachPayload, targetWindowId: number) => {
    const targetWin = detachedWindows.get(targetWindowId);
    if (!targetWin || targetWin.isDestroyed()) return;
    targetWin.webContents.send('merge:receive-tab', payload);
    targetWin.focus();
    // source 창 닫기는 Renderer가 engine.closeContent 후 window:close-self로 처리
  });

  // target 분리 창의 드롭 수신 오버레이 on/off
  ipcMain.handle('window:highlight-detached', (_event, targetWindowId: number, show: boolean) => {
    const targetWin = detachedWindows.get(targetWindowId);
    if (!targetWin || targetWin.isDestroyed()) return;
    targetWin.webContents.send(show ? 'merge:show-target' : 'merge:hide-target');
  });

  // Renderer가 탭을 모두 이동한 후 스스로 창 닫기를 요청
  ipcMain.handle('window:close-self', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed() && win !== mainWindowRef) {
      win.close();
    }
  });

  // ── 원격 파일 탐색기 (FTP/FTPS/SFTP) ──
  ipcMain.handle('remote-file:test', async (_event, profile: RemoteFileProfile) => remoteFileTest(profile));

  ipcMain.handle(
    'remote-file:list',
    async (_event, profile: RemoteFileProfile, remotePath: string): Promise<RemoteFileEntry[]> =>
      remoteFileList(profile, remotePath),
  );

  ipcMain.handle(
    'remote-file:read-file',
    async (_event, profile: RemoteFileProfile, remotePath: string): Promise<OpenFileResult | null> =>
      remoteFileRead(profile, remotePath),
  );

  ipcMain.handle(
    'remote-file:read-file-base64',
    async (_event, profile: RemoteFileProfile, remotePath: string): Promise<FileTransferPayload | null> =>
      remoteFileReadBase64(profile, remotePath),
  );

  ipcMain.handle(
    'remote-file:write-file',
    async (_event, request: RemoteFileWriteRequest): Promise<RemoteFileOperationResult> => remoteFileWrite(request),
  );

  ipcMain.handle(
    'remote-file:mkdir',
    async (_event, profile: RemoteFileProfile, remotePath: string): Promise<RemoteFileOperationResult> =>
      remoteFileMkdir(profile, remotePath),
  );

  ipcMain.handle(
    'remote-file:delete',
    async (
      _event,
      profile: RemoteFileProfile,
      remotePath: string,
      isDirectory: boolean,
    ): Promise<RemoteFileOperationResult> => remoteFileDelete(profile, remotePath, isDirectory),
  );

  ipcMain.handle(
    'remote-file:rename',
    async (_event, profile: RemoteFileProfile, fromPath: string, toPath: string): Promise<RemoteFileOperationResult> =>
      remoteFileRename(profile, fromPath, toPath),
  );

  ipcMain.handle(
    'transfer-queue:enqueue',
    (_event, request: TransferQueueEnqueueRequest): TransferQueueItem => enqueueTransfer(request),
  );

  ipcMain.handle('transfer-queue:list', (): TransferQueueItem[] => snapshotTransferQueue());

  ipcMain.handle('transfer-queue:retry', (_event, id: string): TransferQueueItem | null =>
    retryTransfer(String(id || '')),
  );

  ipcMain.handle('transfer-queue:cancel', (_event, id: string): TransferQueueItem | null =>
    cancelTransfer(String(id || '')),
  );

  ipcMain.handle('transfer-queue:clear-completed', (): TransferQueueItem[] => clearCompletedTransfers());

  ipcMain.handle('transfer-queue:clear-all', (): TransferQueueItem[] => clearAllTransfers());

  // ── 파일 시스템 탐색기 ──
  ipcMain.handle('fs:list-dir', async (_event, dirPath: string): Promise<FsEntry[]> => {
    if (!dirPath || typeof dirPath !== 'string') return [];
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      return entries
        .map((e) => ({
          name: e.name,
          path: path.join(dirPath, e.name),
          isDirectory: e.isDirectory(),
          ext: e.isDirectory() ? '' : path.extname(e.name).replace('.', '').toLowerCase(),
        }))
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name, 'ko');
        });
    } catch {
      return [];
    }
  });

  ipcMain.handle('fs:read-file-base64', async (_event, filePath: string): Promise<FileTransferPayload | null> => {
    if (!filePath || typeof filePath !== 'string') return null;
    try {
      const stat = await fs.promises.stat(filePath);
      if (stat.isDirectory()) {
        return {
          fileName: path.basename(filePath),
          contentBase64: '',
          size: 0,
          isDirectory: true,
        };
      }
      const buffer = await fs.promises.readFile(filePath);
      return {
        fileName: path.basename(filePath),
        contentBase64: buffer.toString('base64'),
        size: buffer.length,
      };
    } catch {
      return null;
    }
  });

  ipcMain.handle(
    'fs:write-file-base64',
    async (_event, filePath: string, contentBase64: string): Promise<FileTransferResult> => {
      if (!filePath || typeof filePath !== 'string') return { saved: false, message: 'Invalid file path.' };
      try {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, Buffer.from(String(contentBase64 || ''), 'base64'));
        return { saved: true };
      } catch (error) {
        return { saved: false, message: error instanceof Error ? error.message : String(error) };
      }
    },
  );

  ipcMain.handle('fs:select-dir', async (): Promise<string | null> => {
    if (fsSelectDirDialogPromise) return fsSelectDirDialogPromise;

    fsSelectDirDialogPromise = (async () => {
      const result = await dialog.showOpenDialog({
        title: '탐색기 폴더 선택',
        properties: ['openDirectory', 'createDirectory'],
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0];
    })();

    try {
      return await fsSelectDirDialogPromise;
    } finally {
      fsSelectDirDialogPromise = null;
    }
  });

  ipcMain.handle('onboarding:sample-status', () => getOnboardingSampleWorkspaceStatus());

  ipcMain.handle('onboarding:prepare-sample', () => prepareOnboardingSampleWorkspaceAndBroadcast());

  ipcMain.handle('onboarding:reset-sample', () => resetOnboardingSampleWorkspaceAndBroadcast());

  ipcMain.handle('onboarding:save-run-artifact', (_event, request) => saveOnboardingRunArtifact(request));

  ipcMain.handle('onboarding:list-run-artifacts', () => listOnboardingRunArtifacts());

  ipcMain.handle('onboarding:open-run-artifact', async (_event, runId?: string) => {
    const targetPath = await getOnboardingRunArtifactPath(runId);
    const error = await shell.openPath(targetPath);
    return { ok: !error, path: targetPath, error: error || undefined };
  });

  ipcMain.handle('onboarding:clear-run-artifacts', () => clearOnboardingRunArtifacts());

  ipcMain.handle('onboarding:read-demo-route', () => readOnboardingDemoRoute());

  ipcMain.handle('onboarding:save-demo-route', (_event, rawRequest) => {
    const request = rawRequest && typeof rawRequest === 'object' ? (rawRequest as OnboardingDemoRouteSaveRequest) : {};
    return saveOnboardingDemoRoute(request as OnboardingDemoRouteSaveRequest);
  });

  ipcMain.handle('onboarding:export-demo-route-storyboard', () => exportOnboardingDemoRouteStoryboard());

  ipcMain.handle('onboarding:open-demo-route-target', (_event, rawRequest) => {
    const request = rawRequest && typeof rawRequest === 'object' ? (rawRequest as OnboardingDemoRouteOpenRequest) : {};
    return openOnboardingDemoRouteTarget(request, (targetPath) => {
      if (request.target === 'demoPreset') {
        return Promise.resolve(
          sendMcpOpenFileToRenderer(targetPath, 'tab', undefined, { openAs: 'demoLabPlayback' })
            ? ''
            : 'Xenesis Desk renderer window is not available',
        );
      }
      if (request.target === 'storyboard') {
        return Promise.resolve(
          sendMcpOpenFileToRenderer(targetPath, 'tab') ? '' : 'Xenesis Desk renderer window is not available',
        );
      }
      return shell.openPath(targetPath);
    });
  });

  // ── 화면 영역 캡처 (모니터별 개별 fullscreen 창) ──────────────────────────
  function closeCaptureWindows(): void {
    for (const w of captureWindows) {
      if (!w.isDestroyed()) w.close();
    }
    captureWindows = [];
  }

  ipcMain.handle('capture:start', async () => {
    // 이미 캡처 창이 열려 있으면 무시
    if (captureWindows.length > 0) return;

    // 즉시 "준비 중" 알림 → 렌더러에서 스피너/메시지 표시
    mainWindowRef?.webContents.send('capture:preparing');

    const displays = screen.getAllDisplays();

    // 각 모니터별 스크린샷: display 크기 그대로 요청 (화질 최적)
    const maxW = Math.max(...displays.map((d) => d.bounds.width * (d.scaleFactor ?? 1)));
    const maxH = Math.max(...displays.map((d) => d.bounds.height * (d.scaleFactor ?? 1)));

    let sources: Awaited<ReturnType<typeof desktopCapturer.getSources>>;
    try {
      sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: Math.round(maxW), height: Math.round(maxH) },
      });
    } catch (error) {
      console.error('Failed to collect screen thumbnails for capture overlay', error);
      mainWindowRef?.webContents.send('capture:ready');
      return;
    }

    const usableSources = sources.filter((source) => !source.thumbnail.isEmpty());
    if (usableSources.length === 0) {
      console.error('No usable screen thumbnails for capture overlay');
      mainWindowRef?.webContents.send('capture:ready');
      return;
    }

    let loadedCaptureWindows = 0;

    for (let i = 0; i < displays.length; i++) {
      const d = displays[i];
      // display_id 기반 매핑, fallback: 인덱스 순서
      const source = usableSources.find((s) => s.display_id === String(d.id)) ?? usableSources[i] ?? usableSources[0];
      const screenshot = source.thumbnail.toDataURL();
      const overlayBounds = {
        x: Math.round(d.bounds.x),
        y: Math.round(d.bounds.y),
        width: Math.round(d.bounds.width),
        height: Math.round(d.bounds.height),
      };

      const win = new BrowserWindow({
        x: overlayBounds.x,
        y: overlayBounds.y,
        width: overlayBounds.width,
        height: overlayBounds.height,
        useContentSize: true,
        frame: false,
        thickFrame: false,
        hasShadow: false,
        // transparent: true 사용 금지 — Windows 보조 모니터에서 클릭 시
        // DWM 합성 경로가 달라져 캔버스 렌더링이 깨지는 버그가 있음.
        // 캔버스가 스크린샷을 직접 그리므로 투명 배경은 불필요.
        show: false,
        backgroundColor: '#000000',
        fullscreen: false,
        fullscreenable: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        skipTaskbar: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      });

      win.setAlwaysOnTop(true, 'screen-saver');
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

      win.webContents.on('did-finish-load', () => {
        win.setBounds(overlayBounds, false);
        win.setContentSize(overlayBounds.width, overlayBounds.height);
        win.setPosition(overlayBounds.x, overlayBounds.y, false);
        win.webContents.send('prepare-canvas', { screenshot });
        win.showInactive();
        win.setAlwaysOnTop(true, 'screen-saver');

        loadedCaptureWindows += 1;
        if (loadedCaptureWindows === captureWindows.length) {
          mainWindowRef?.webContents.send('capture:ready');
        }
      });

      win.on('closed', () => {
        captureWindows = captureWindows.filter((w) => w !== win);
        // 모든 창이 닫히면 취소 신호
        if (captureWindows.length === 0) {
          mainWindowRef?.webContents.send('capture:ready');
        }
      });

      captureWindows.push(win);

      if (process.env.ELECTRON_RENDERER_URL) {
        win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/capture.html`).catch(console.error);
      } else {
        win.loadFile(path.join(__dirname, '../renderer/capture.html')).catch(console.error);
      }
    }
  });

  ipcMain.on('capture:save', (_event, dataUrl: string) => {
    if (!dataUrl || typeof dataUrl !== 'string') return;
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const fileName = `capture_${Date.now()}.png`;
    const captureDir = getCaptureDir();
    const filePath = path.join(captureDir, fileName);

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
      if (!err) {
        shell.showItemInFolder(filePath);
        mainWindowRef?.webContents.send('capture:done', filePath);
      }
      closeCaptureWindows();
    });
  });

  function normalizeCapturePaneRequest(
    value: CapturePaneRequest,
  ): Required<Pick<CapturePaneRequest, 'x' | 'y' | 'width' | 'height'>> {
    const readNumber = (input: unknown, fallback = 0): number => {
      const next = Number(input);
      return Number.isFinite(next) ? next : fallback;
    };
    return {
      x: Math.max(0, Math.floor(readNumber(value.x))),
      y: Math.max(0, Math.floor(readNumber(value.y))),
      width: Math.max(1, Math.min(12000, Math.ceil(readNumber(value.width, 1)))),
      height: Math.max(1, Math.min(12000, Math.ceil(readNumber(value.height, 1)))),
    };
  }

  ipcMain.handle('capture:pane', async (event, request: CapturePaneRequest): Promise<CapturePaneResult> => {
    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
    if (!sourceWindow || sourceWindow.isDestroyed()) {
      throw new Error('No renderer window is available for pane capture.');
    }

    const rect = normalizeCapturePaneRequest(request);
    const image = await sourceWindow.webContents.capturePage(rect);
    if (image.isEmpty()) {
      throw new Error('Pane capture produced an empty image.');
    }

    const captureDir = getCaptureDir();
    const fileName = `pane_capture_${Date.now()}.png`;
    const filePath = path.join(captureDir, fileName);
    const png = image.toPNG();
    await fs.promises.writeFile(filePath, png);
    const stat = await fs.promises.stat(filePath);
    event.sender.send('capture:done', filePath);
    if (mainWindowRef && !mainWindowRef.isDestroyed() && mainWindowRef.webContents !== event.sender) {
      mainWindowRef.webContents.send('capture:done', filePath);
    }

    return {
      filePath,
      fileName,
      createdAt: stat.mtimeMs,
      size: stat.size,
      paneId: typeof request.paneId === 'string' ? request.paneId : undefined,
      contentId: typeof request.contentId === 'string' ? request.contentId : undefined,
      title: typeof request.title === 'string' ? request.title : undefined,
      contentType: typeof request.contentType === 'string' ? request.contentType : undefined,
    };
  });

  ipcMain.on('capture:cancel', () => {
    closeCaptureWindows();
  });

  // ── 캡처 목록 조회 ──────────────────────────────────────────────────────────
  function getCaptureDir(): string {
    const settings = loadSettings();
    const dir = settings.captureDir?.trim();
    const captureDir = dir || getDefaultCaptureDir();
    fs.mkdirSync(captureDir, { recursive: true });
    return captureDir;
  }

  ipcMain.handle('capture:list', () => {
    try {
      const dir = getCaptureDir();
      const files = fs
        .readdirSync(dir)
        .filter((f) => /^(capture|pane_capture)_\d+\.png$/i.test(f))
        .map((f) => {
          const filePath = path.join(dir, f);
          const stat = fs.statSync(filePath);
          return {
            filePath,
            fileName: f,
            createdAt: stat.mtimeMs,
            size: stat.size,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      return files;
    } catch {
      return [];
    }
  });

  // ── 캡처 썸네일 (nativeImage로 리사이즈 후 base64 반환) ────────────────────
  ipcMain.handle('capture:thumbnail', (_event, filePath: string) => {
    try {
      if (typeof filePath !== 'string' || !fs.existsSync(filePath)) return '';
      const img = nativeImage.createFromPath(filePath);
      if (img.isEmpty()) return '';
      // 96×72 JPEG 썸네일 (약 5-10KB)
      const thumb = img.resize({ width: 96, height: 72, quality: 'good' });
      return `data:image/jpeg;base64,${thumb.toJPEG(75).toString('base64')}`;
    } catch {
      return '';
    }
  });

  ipcMain.handle('capture:delete', (_event, filePath: string) => {
    try {
      if (typeof filePath === 'string' && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // 삭제 실패 무시
    }
  });

  ipcMain.handle('capture:delete-all', () => {
    try {
      const dir = getCaptureDir();
      const files = fs.readdirSync(dir).filter((f) => /^(capture|pane_capture)_\d+\.png$/i.test(f));
      for (const f of files) {
        try {
          fs.unlinkSync(path.join(dir, f));
        } catch {
          /* 개별 실패 무시 */
        }
      }
    } catch {
      // 폴더 조회 실패 무시
    }
  });

  ipcMain.on('capture:start-drag', (event, filePath: string) => {
    if (typeof filePath !== 'string' || !fs.existsSync(filePath)) return;
    try {
      const icon = nativeImage.createFromPath(filePath).resize({ width: 64, height: 48 });
      event.sender.startDrag({ file: filePath, icon });
    } catch {
      // startDrag 실패 무시
    }
  });

  // ─── 자동화 IPC ───────────────────────────────────────────────────────────────

  ipcMain.on('automation:set-enabled', (_event, payload: { termId: string; enabled: boolean }) => {
    automationControllers.get(payload.termId)?.setEnabled(Boolean(payload.enabled));
  });

  ipcMain.on('automation:set-stage', (_event, payload: { termId: string; stage: number }) => {
    const stage = [1, 2, 3].includes(payload.stage) ? (payload.stage as AutomationStage) : 1;
    automationControllers.get(payload.termId)?.setStage(stage);
  });

  ipcMain.on(
    'automation:set-stream-filter-profile',
    (_event, payload: { termId: string; profile: AutomationStreamFilterProfile | 'default' }) => {
      const profile =
        payload.profile === 'default' ? undefined : normalizeAutomationStreamFilterProfile(payload.profile);
      automationControllers.get(payload.termId)?.setStreamFilterProfile(profile);
    },
  );

  ipcMain.handle('automation:get-status', (_event, termId: string) => {
    return automationControllers.get(termId)?.getStatus() ?? null;
  });

  ipcMain.handle('automation:get-events', (_event, termId: string) => {
    return automationControllers.get(termId)?.getEvents() ?? [];
  });

  ipcMain.on('automation:clear-events', (_event, termId: string) => {
    automationControllers.get(termId)?.clearEvents();
  });

  // 설정 저장 시 실행 중인 모든 자동화 컨트롤러에 새 설정 반영
  ipcMain.on('automation:reload-settings', () => {
    const automationSettings = getAutomationSettings();
    const fallbackKey = getFallbackLlmKey();
    for (const ctrl of automationControllers.values()) {
      ctrl.updateSettings(automationSettings, fallbackKey);
    }
  });

  // 수동 명령 전송 (autoSend=false일 때도 허용)
  ipcMain.on(
    'automation:manual-send',
    (_event, payload: { termId: string; input: string; pendingEventId?: string }) => {
      automationControllers.get(payload.termId)?.manualSend(payload.input, payload.pendingEventId);
    },
  );
}

// ─── 싱글 인스턴스 잠금 ────────────────────────────────────────────────────────
//
// 이미 실행 중인 인스턴스가 있으면 해당 창을 포커스하고, 새 인스턴스는 즉시 종료.
// 이를 생략하면 이전 프로세스가 완전히 종료되지 않은 상태에서 앱을 재실행했을 때
// 두 번째 인스턴스가 다른 실행 경로(userData 등)를 사용해 데이터가 초기화된다.
//
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  // 중복 인스턴스 → 이벤트 루프를 기다리지 않고 즉시 종료
  app.exit(0);
} else {
  app.on('second-instance', () => {
    // 두 번째 실행 시도 → 기존 창 활성화
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      if (mainWindowRef.isMinimized()) mainWindowRef.restore();
      mainWindowRef.focus();
    }
  });

  // ─── 앱 시작 ────────────────────────────────────────────────────────────────

  app
    .whenReady()
    .then(() => {
      // ── 로컬호스트 API 서버 CORS 우회 ─────────────────────────────────────────
      // Electron 렌더러는 브라우저와 동일한 CORS 규칙을 따른다.
      // 앱이 file:// 또는 http://localhost:dev-port 에서 로드될 때,
      // http://127.0.0.1:xxxx (Lab API, Agent API 등) 로의 fetch는 크로스 오리진으로
      // 처리되어 서버에 CORS 헤더가 없으면 TypeError로 실패한다.
      //
      // 해결: 세션 레벨에서 localhost / 127.0.0.1 응답에 CORS 헤더를 주입.
      // - 일반 요청: Access-Control-Allow-Origin: * 추가
      // - OPTIONS 프리플라이트: 위 헤더 추가 + statusLine 200 으로 강제
      //   (서버가 OPTIONS를 처리하지 않아 4xx 를 반환해도 브라우저가 통과시킴)
      session.defaultSession.webRequest.onHeadersReceived(
        { urls: ['http://127.0.0.1/*', 'http://localhost/*'] },
        (details, callback) => {
          const corsHeaders: Record<string, string[]> = {
            'access-control-allow-origin': ['*'],
            'access-control-allow-methods': ['GET, POST, PUT, PATCH, DELETE, OPTIONS'],
            'access-control-allow-headers': ['Content-Type, Authorization, X-Requested-With, X-Agent-Approved'],
            'access-control-max-age': ['86400'],
          };
          const isOptions = (details.method ?? '').toUpperCase() === 'OPTIONS';

          // 서버가 이미 보낸 access-control-* 헤더를 모두 제거한 후 덮어쓴다.
          // (대소문자 불일치로 인한 *, * 중복 방지: 서버는 'Access-Control-...',
          //  corsHeaders는 'access-control-...' 이므로 spread만으로는 덮어쓰지 못함)
          const cleaned: Record<string, string[]> = {};
          for (const [key, value] of Object.entries(details.responseHeaders ?? {})) {
            if (!key.toLowerCase().startsWith('access-control-')) {
              cleaned[key] = value as string[];
            }
          }

          callback({
            responseHeaders: { ...cleaned, ...corsHeaders },
            // OPTIONS 프리플라이트는 200 OK 여야 브라우저가 실제 요청을 진행함
            ...(isOptions ? { statusLine: 'HTTP/1.1 200 OK' } : {}),
          });
        },
      );

      loadPersistedDiagnosticsLogs();
      loadPersistedMcpActionInboxState();
      loadPersistedMcpBotSessionsState();
      loadPersistedMcpCapabilityApprovals();
      const mcpBridgeReadyPromise = startMcpBridgeServer();
      setupApplicationMenu();
      setupIpc();
      createWindow();
      scheduleTerminalWarmup();
      setupAutoUpdater();

      if (shouldRunXenesisPackagedSmoke()) {
        runXenesisPackagedSmoke().catch((error) => {
          const artifact = {
            ok: false,
            runtimeMode: '',
            status: null,
            error: error instanceof Error ? error.message : String(error),
            checkedAt: new Date().toISOString(),
          };
          writeXenesisPackagedSmokeArtifact(artifact);
          app.exit(1);
        });
        return;
      }

      if (isXenisPhase5Enabled() && loadSettings().xamongCode.autoStart) {
        startXamongCodeServer().catch((error) => {
          xamongCodeLastError = error instanceof Error ? error.message : String(error);
        });
      }

      if (loadSettings().xenesis.autoStart) {
        mcpBridgeReadyPromise
          .catch((error) => {
            recordDiagnosticLog({
              level: 'warn',
              source: 'main',
              scope: 'mcp',
              message: 'Xenesis Desk MCP bridge readiness wait failed',
              detail: diagnosticDetailFromUnknown(error),
            });
            return false;
          })
          .then(() => {
            if (loadSettings().xenesis.mcpEnabled && !mcpBridgeServer) {
              recordDiagnosticLog({
                level: 'warn',
                source: 'main',
                scope: 'xenesis',
                message: 'Starting Xenesis without MCP bridge because the bridge is not listening',
              });
            }
            return startXenesisRuntime();
          })
          .then((status) => {
            if (status.error) {
              recordDiagnosticLog({
                level: 'error',
                source: 'main',
                scope: 'xenesis',
                message: 'Failed to auto-start Xenesis runtime',
                detail: status.error,
              });
            }
          })
          .catch((error) => {
            xenesisLastError = error instanceof Error ? error.message : String(error);
            recordDiagnosticLog({
              level: 'error',
              source: 'main',
              scope: 'xenesis',
              message: 'Failed to auto-start Xenesis runtime',
              detail: diagnosticDetailFromUnknown(error),
            });
          });
      }

      if (loadSettings().xenesis.gateway.autoStart) {
        mcpBridgeReadyPromise
          .catch((error) => {
            recordDiagnosticLog({
              level: 'warn',
              source: 'main',
              scope: 'mcp',
              message: 'Xenesis Desk MCP bridge readiness wait failed',
              detail: diagnosticDetailFromUnknown(error),
            });
            return false;
          })
          .then(() => {
            if (loadSettings().xenesis.gateway.mcpEnabled && !mcpBridgeServer) {
              recordDiagnosticLog({
                level: 'warn',
                source: 'main',
                scope: 'xenesis',
                message: 'Starting Xenesis gateway without MCP bridge because the bridge is not listening',
              });
            }
            return startXenesisGatewayRuntime();
          })
          .then((status) => {
            if (status.gateway.error) {
              recordDiagnosticLog({
                level: 'error',
                source: 'main',
                scope: 'xenesis',
                message: 'Failed to auto-start Xenesis gateway',
                detail: status.gateway.error,
              });
            }
          })
          .catch((error) => {
            xenesisLastError = error instanceof Error ? error.message : String(error);
            recordDiagnosticLog({
              level: 'error',
              source: 'main',
              scope: 'xenesis',
              message: 'Failed to auto-start Xenesis gateway',
              detail: diagnosticDetailFromUnknown(error),
            });
          });
      }

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    })
    .catch(console.error);

  // 종료 직전 리소스 정리 (before-quit: quit() 호출 직후, 창 닫히기 전)
  // 메뉴 Quit / app.quit() 경로: 활성 세션이 있으면 직접 종료하지 않고
  // mainWindow.close()를 통해 close 이벤트(확인 다이얼로그)로 위임.
  // 창이 이미 닫혀 있거나 세션이 없으면 바로 정리.
  app.on('before-quit', (event) => {
    if (sessions.size > 0 && mainWindowRef && !mainWindowRef.isDestroyed()) {
      // 아직 세션이 남아 있고 메인 창이 열려 있으면 → close 이벤트에서 다이얼로그 처리
      event.preventDefault();
      mainWindowRef.close();
      return;
    }
    killAllSessions();
    stopMcpBridgeServer();
    stopInternalServer();
    stopXamongCodeServer();
    stopXenesisRuntime();
    stopXenesisGatewayRuntime();
  });

  app.on('window-all-closed', () => {
    killAllSessions();
    stopMcpBridgeServer();
    stopXamongCodeServer();
    stopXenesisRuntime();
    stopXenesisGatewayRuntime();
    if (process.platform !== 'darwin') {
      app.quit();

      // node-pty 등 자식 프로세스가 Node.js 이벤트 루프를 점유해
      // app.quit() 이 지연되는 경우를 위한 강제 종료 안전망.
      // unref()로 타이머 자체가 프로세스를 붙잡지 않도록 함.
      setTimeout(() => process.exit(0), 3_000).unref();
    }
  });
}
