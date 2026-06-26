import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type {
  AppMenuApi,
  AppSettings,
  AutomationApi,
  AutomationEvent,
  AutomationStage,
  AutomationStatus,
  AutomationStreamFilterProfile,
  CaptureApi,
  CaptureItem,
  CapturePaneRequest,
  CapturePaneResult,
  DeskBridgeApi,
  DetachPayload,
  DiagnosticsApi,
  DiagnosticsLogEntry,
  DiagnosticsLogRecordRequest,
  ExtensionApi,
  FileApi,
  FileTransferPayload,
  FileTransferResult,
  FsApi,
  FsEntry,
  LocalCliAgentStatus,
  LocalCliApi,
  McpBridgeActionInboxItem,
  McpBridgeActionInboxResolveRequest,
  McpBridgeActionInboxResolveResult,
  McpBridgeApi,
  McpBridgeBotEvent,
  McpBridgeBotSession,
  McpBridgeBotSessionSaveResult,
  McpBridgeCapabilityApprovalRememberEntry,
  McpBridgeCapabilityApprovalRememberResult,
  McpBridgeCapabilityCallRequest,
  McpBridgeCapabilityCallResult,
  McpBridgeCaptureActivePanePayload,
  McpBridgeCaptureActivePaneResult,
  McpBridgeDemoLabPlaybackControlPayload,
  McpBridgeDemoLabPlaybackControlResult,
  McpBridgeBrowserActionPayload,
  McpBridgeBrowserActionResult,
  McpBridgeDockActionPayload,
  McpBridgeDockActionResult,
  McpBridgeExplorerActionPayload,
  McpBridgeExplorerActionResult,
  McpBridgeExtensionActionsPayload,
  McpBridgeFavoritesActionPayload,
  McpBridgeFavoritesActionResult,
  McpBridgeGowooriArtifactVisibilityPayload,
  McpBridgeGowooriArtifactVisibilityResult,
  McpBridgeGowooriChatCancelPayload,
  McpBridgeGowooriChatRunPayload,
  McpBridgeGowooriChatRunProgress,
  McpBridgeGowooriChatRunResult,
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
  McpBridgeOpenBuiltinPanePayload,
  McpBridgeOpenBuiltinPaneResult,
  McpBridgeOpenFilePayload,
  McpBridgeOpenTerminalPayload,
  McpBridgeRemoteExplorerActionPayload,
  McpBridgeRemoteExplorerActionResult,
  McpBridgeRendererPerformanceTraceRequest,
  McpBridgeRendererPerformanceTraceResult,
  McpBridgeRendererStateSnapshot,
  McpBridgeStatus,
  McpBridgeTerminalUiActionPayload,
  McpBridgeTerminalUiActionResult,
  McpSettingsApi,
  OnboardingApi,
  OnboardingSampleWorkspaceStatus,
  OpenFileResult,
  ProcessInfo,
  ProcessKillResult,
  ProcessViewerApi,
  ProviderIntegrationApi,
  RemoteFileApi,
  RemoteFileProfile,
  RemoteFileWriteRequest,
  SafeFileApi,
  SafeFileApplyRequest,
  SafeFileApplyResult,
  SafeFilePreviewRequest,
  SafeFilePreviewResult,
  SafeFileRestoreRequest,
  SafeFileRestoreResult,
  SaveLogRequest,
  SaveTextAsRequest,
  SaveTextAsResult,
  SecretVaultApi,
  ServerApi,
  ServerStatus,
  SettingsBackupListItem,
  SettingsExportResult,
  SettingsImportResult,
  ShellDescriptor,
  SiblingWindowBounds,
  TerminalApi,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalSpawnRequest,
  TerminalSpawnResult,
  TransferQueueApi,
  TransferQueueEnqueueRequest,
  TransferQueueItem,
  UpdaterApi,
  UpdaterStatus,
  WindowBounds,
  WindowSizerPreset,
  WorkflowPlaywrightApi,
  WorkflowPlaywrightRunRequest,
  WorkflowPlaywrightSnapshotRequest,
  WorkflowRunHistoryListRequest,
  WorkflowRunHistoryRecord,
  WorkflowRunsApi,
  WorkflowTemplateRecord,
  WorkflowTemplatesApi,
  WorkspaceApi,
  WorkspaceProfile,
  XamongCodeApi,
  XamongCodeServerStatus,
  XenesisApi,
  XenesisProfileChannelsUpdateRequest,
  XenesisProfileChannelTestRequest,
  XenesisProfileInstallRequest,
  XenesisReportQuery,
  XenesisRunEvent,
  XenesisTaskQuery,
} from '../shared/types';
import { installMainObservabilityForwarder, observeAsyncMethod, observeSyncMethod } from './observability';

function summarizePreloadPayload(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) return undefined;
    return serialized.length > 600 ? `${serialized.slice(0, 600)}...` : serialized;
  } catch {
    const fallback = String(value);
    return fallback.length > 600 ? `${fallback.slice(0, 600)}...` : fallback;
  }
}

function observePreloadTerminalApi(target: EventTarget, terminalApi: TerminalApi): void {
  observeAsyncMethod(target, terminalApi as unknown as Record<string, unknown>, 'spawn', (request) => ({
    activity: {
      source: 'terminal',
      label: 'terminal.spawn',
      detail: summarizePreloadPayload(request),
    },
    network: {
      source: 'mcp',
      method: 'POST',
      url: 'ipc://terminal/spawn',
      requestBody: summarizePreloadPayload(request),
    },
  }));
  observeAsyncMethod(target, terminalApi as unknown as Record<string, unknown>, 'adopt', (termId) => ({
    activity: {
      source: 'terminal',
      label: 'terminal.adopt',
      detail: summarizePreloadPayload({ termId }),
    },
  }));
  observeSyncMethod(target, terminalApi as unknown as Record<string, unknown>, 'kill', (termId) => ({
    activity: {
      source: 'terminal',
      label: 'terminal.kill',
      detail: summarizePreloadPayload({ termId }),
    },
  }));
}

function observePreloadWorkflowApis(
  target: EventTarget,
  workflowRunsApi: WorkflowRunsApi,
  workflowTemplatesApi: WorkflowTemplatesApi,
  workflowPlaywrightApi: WorkflowPlaywrightApi,
): void {
  for (const key of ['save', 'delete', 'clear'] as const) {
    observeAsyncMethod(target, workflowRunsApi as unknown as Record<string, unknown>, key, (arg) => ({
      activity: {
        source: 'workflow',
        label: `workflow-runs.${key}`,
        detail: summarizePreloadPayload(arg),
      },
      network: {
        source: 'mcp',
        method: 'POST',
        url: `ipc://workflow-runs/${key}`,
        requestBody: summarizePreloadPayload(arg),
      },
    }));
  }
  for (const key of ['save', 'setFavorite', 'touch', 'remove'] as const) {
    observeAsyncMethod(target, workflowTemplatesApi as unknown as Record<string, unknown>, key, (arg) => ({
      activity: {
        source: 'workflow',
        label: `workflow-templates.${key}`,
        detail: summarizePreloadPayload(arg),
      },
      network: {
        source: 'mcp',
        method: 'POST',
        url: `ipc://workflow-templates/${key}`,
        requestBody: summarizePreloadPayload(arg),
      },
    }));
  }
  observeAsyncMethod(target, workflowPlaywrightApi as unknown as Record<string, unknown>, 'snapshot', (request) => ({
    activity: {
      source: 'workflow',
      label: 'workflow-playwright.snapshot',
      detail: summarizePreloadPayload(request),
    },
    network: {
      source: 'playwright',
      method: 'POST',
      url: 'ipc://workflow-playwright/snapshot',
      requestBody: summarizePreloadPayload(request),
    },
  }));
  observeAsyncMethod(target, workflowPlaywrightApi as unknown as Record<string, unknown>, 'run', (request) => ({
    activity: {
      source: 'workflow',
      label: 'workflow-playwright.run',
      detail: summarizePreloadPayload(request),
    },
    network: {
      source: 'playwright',
      method: 'POST',
      url: 'ipc://workflow-playwright/run',
      requestBody: summarizePreloadPayload(request),
    },
  }));
}

function observePreloadXenesisApi(target: EventTarget, xenesisApi: XenesisApi): void {
  for (const key of [
    'gatewayStatus',
    'gatewayStart',
    'gatewayStop',
    'gatewayRestart',
    'gatewayOpenDashboard',
  ] as const) {
    observeAsyncMethod(target, xenesisApi as unknown as Record<string, unknown>, key, () => ({
      activity: {
        source: 'gateway',
        label: `xenesis.${key}`,
      },
      network: {
        source: 'gateway',
        method: 'POST',
        url: `ipc://xenesis/${key}`,
      },
    }));
  }
  observeAsyncMethod(target, xenesisApi as unknown as Record<string, unknown>, 'run', (request) => ({
    activity: {
      source: 'agent',
      label: 'xenesis.run',
      detail: summarizePreloadPayload(request),
    },
    network: {
      source: 'gateway',
      method: 'POST',
      url: 'ipc://xenesis/run',
      requestBody: summarizePreloadPayload(request),
    },
  }));
}

installMainObservabilityForwarder(window, ipcRenderer);

const api: TerminalApi = {
  spawn(request: TerminalSpawnRequest): Promise<TerminalSpawnResult> {
    return ipcRenderer.invoke('terminal:spawn', request);
  },

  write(id: string, data: string): void {
    ipcRenderer.send('terminal:write', { id, data });
  },

  writeImage(
    id: string,
    source: string,
    options?: { width?: string; height?: string; preserveAspectRatio?: boolean; filename?: string },
  ): Promise<{ ok: boolean; error?: string; bytesSent?: number }> {
    return ipcRenderer.invoke('terminal:write-image', { id, source, options });
  },

  writeImageBase64(
    id: string,
    base64: string,
    options?: { width?: string; height?: string; preserveAspectRatio?: boolean; filename?: string },
  ): Promise<{ ok: boolean; error?: string; bytesSent?: number }> {
    return ipcRenderer.invoke('terminal:write-image', { id, base64, options });
  },

  writeXconImage(
    id: string,
    xcon: string,
    options?: {
      width?: string;
      height?: string;
      syntax?: string;
      theme?: string;
      title?: string;
      viewportWidth?: number;
    },
  ): Promise<{ ok: boolean; error?: string; bytesSent?: number }> {
    return ipcRenderer.invoke('terminal:write-xcon-image', { id, xcon, options });
  },

  resize(id: string, cols: number, rows: number): void {
    ipcRenderer.send('terminal:resize', { id, cols, rows });
  },

  kill(id: string): void {
    ipcRenderer.send('terminal:kill', { id });
  },

  listShells(): Promise<ShellDescriptor[]> {
    return ipcRenderer.invoke('terminal:list-shells');
  },

  selectCwd(): Promise<string | null> {
    return ipcRenderer.invoke('dialog:select-cwd');
  },

  saveLog(request: SaveLogRequest) {
    return ipcRenderer.invoke('dialog:save-log', request);
  },

  revealPath(targetPath: string): Promise<void> {
    return ipcRenderer.invoke('shell:reveal-path', targetPath);
  },

  adopt(termId: string): Promise<{ scrollback: string } | null> {
    return ipcRenderer.invoke('terminal:adopt', termId);
  },

  /**
   * 세션 ID 별 채널(terminal:data:${id})을 구독.
   * 모든 세션이 동일 채널을 공유하던 구조에서 세션별로 분리해
   * 불필요한 콜백 호출을 제거.
   */
  onData(id: string, callback: (event: TerminalDataEvent) => void): () => void {
    const channel = `terminal:data:${id}`;
    const listener = (_event: Electron.IpcRendererEvent, payload: TerminalDataEvent) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  onExit(id: string, callback: (event: TerminalExitEvent) => void): () => void {
    const channel = `terminal:exit:${id}`;
    const listener = (_event: Electron.IpcRendererEvent, payload: TerminalExitEvent) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // ── 설정 영속 저장 ────────────────────────────────────────────────────────

  getSettings(): Promise<AppSettings> {
    return ipcRenderer.invoke('app:get-settings');
  },

  saveSettings(settings: Partial<AppSettings>): Promise<void> {
    return ipcRenderer.invoke('app:save-settings', settings);
  },

  exportSettings(): Promise<SettingsExportResult> {
    return ipcRenderer.invoke('app:export-settings');
  },

  importSettings(): Promise<SettingsImportResult> {
    return ipcRenderer.invoke('app:import-settings');
  },

  listSettingsBackups(): Promise<SettingsBackupListItem[]> {
    return ipcRenderer.invoke('app:list-settings-backups');
  },

  restoreSettingsBackup(filePath: string): Promise<SettingsImportResult> {
    return ipcRenderer.invoke('app:restore-settings-backup', filePath);
  },

  // ── 앱 종료 협력 IPC ─────────────────────────────────────────────────────
  // Main 프로세스가 앱 종료 직전 렌더러에 'app:closing' 이벤트를 보내면
  // 렌더러에서 터미널을 도킹 탭 X 버튼과 동일한 방식으로 정리한 뒤
  // confirmAppClose()로 완료 신호를 돌려보냄.

  onAppClosing(callback: () => void): () => void {
    const listener = () => callback();
    ipcRenderer.on('app:closing', listener);
    return () => ipcRenderer.removeListener('app:closing', listener);
  },

  confirmAppClose(): void {
    ipcRenderer.send('app:close-confirmed');
  },
};

observePreloadTerminalApi(window, api);
contextBridge.exposeInMainWorld('terminalAPI', api);

const appMenuApi: AppMenuApi = {
  onCommand(callback) {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
      const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
      callback({
        id: typeof record.id === 'string' ? record.id : undefined,
        actionId: typeof record.actionId === 'string' ? record.actionId : undefined,
        commandId: typeof record.commandId === 'string' ? record.commandId : undefined,
      });
    };
    ipcRenderer.on('app-menu:command', listener);
    return () => ipcRenderer.removeListener('app-menu:command', listener);
  },
};

contextBridge.exposeInMainWorld('appMenuAPI', appMenuApi);

const fileApi: FileApi = {
  openFile(): Promise<OpenFileResult | null> {
    return ipcRenderer.invoke('file:open');
  },

  readFile(filePath: string): Promise<OpenFileResult | null> {
    return ipcRenderer.invoke('file:read', filePath);
  },

  saveText(filePath: string, content: string): Promise<{ saved: boolean }> {
    return ipcRenderer.invoke('file:save-text', filePath, content);
  },

  saveTextAs(request: SaveTextAsRequest): Promise<SaveTextAsResult> {
    return ipcRenderer.invoke('file:save-text-as', request);
  },

  openExternal(url: string): Promise<void> {
    return ipcRenderer.invoke('shell:open-external', url);
  },

  // Electron 29+ 에서 File.path 가 deprecated → webUtils.getPathForFile() 사용.
  // contextBridge 를 통해 File 객체를 전달하면 Electron 이 내부 경로를 유지한다.
  getPathForFile(file: File): string {
    return webUtils.getPathForFile(file);
  },

  detachTab(payload: DetachPayload): Promise<void> {
    return ipcRenderer.invoke('window:detach-tab', payload);
  },

  getDetachPayload(): Promise<DetachPayload | null> {
    return ipcRenderer.invoke('window:get-detach-payload');
  },

  reattachStart(): Promise<void> {
    return ipcRenderer.invoke('window:reattach-start');
  },

  reattachCancel(): Promise<void> {
    return ipcRenderer.invoke('window:reattach-cancel');
  },

  reattachDrop(payload: DetachPayload): Promise<void> {
    return ipcRenderer.invoke('window:reattach-drop', payload);
  },

  onReattachShowTarget(cb: () => void): () => void {
    const listener = () => cb();
    ipcRenderer.on('reattach:show-target', listener);
    return () => ipcRenderer.removeListener('reattach:show-target', listener);
  },

  onReattachHideTarget(cb: () => void): () => void {
    const listener = () => cb();
    ipcRenderer.on('reattach:hide-target', listener);
    return () => ipcRenderer.removeListener('reattach:hide-target', listener);
  },

  onReattachContent(cb: (payload: DetachPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: DetachPayload) => cb(payload);
    ipcRenderer.on('reattach:content', listener);
    return () => ipcRenderer.removeListener('reattach:content', listener);
  },

  // ── 분리 창 간 합치기 ──────────────────────────────────────────────────────
  getSiblingWindowBounds(): Promise<SiblingWindowBounds> {
    return ipcRenderer.invoke('window:get-sibling-window-bounds');
  },

  mergeTabToDetached(payload: DetachPayload, targetWindowId: number): Promise<void> {
    return ipcRenderer.invoke('window:merge-tab-to-detached', payload, targetWindowId);
  },

  highlightDetachedWindow(targetWindowId: number, show: boolean): Promise<void> {
    return ipcRenderer.invoke('window:highlight-detached', targetWindowId, show);
  },

  onMergeReceiveTab(cb: (payload: DetachPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: DetachPayload) => cb(payload);
    ipcRenderer.on('merge:receive-tab', listener);
    return () => ipcRenderer.removeListener('merge:receive-tab', listener);
  },

  onMergeShowTarget(cb: () => void): () => void {
    const listener = () => cb();
    ipcRenderer.on('merge:show-target', listener);
    return () => ipcRenderer.removeListener('merge:show-target', listener);
  },

  onMergeHideTarget(cb: () => void): () => void {
    const listener = () => cb();
    ipcRenderer.on('merge:hide-target', listener);
    return () => ipcRenderer.removeListener('merge:hide-target', listener);
  },

  closeSelf(): Promise<void> {
    return ipcRenderer.invoke('window:close-self');
  },

  getCurrentWindowBounds(): Promise<WindowBounds | null> {
    return ipcRenderer.invoke('window:get-current-bounds');
  },

  onCurrentWindowBoundsChanged(callback: (bounds: WindowBounds) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, bounds: WindowBounds) => callback(bounds);
    ipcRenderer.on('window:bounds-changed', listener);
    return () => ipcRenderer.removeListener('window:bounds-changed', listener);
  },

  applyWindowSizerPreset(preset: WindowSizerPreset): Promise<{ applied: boolean; bounds: WindowBounds }> {
    return ipcRenderer.invoke('window:apply-sizer-preset', preset);
  },
};

contextBridge.exposeInMainWorld('fileAPI', fileApi);

const fsApi: FsApi = {
  listDir(dirPath: string): Promise<FsEntry[]> {
    return ipcRenderer.invoke('fs:list-dir', dirPath);
  },
  selectDir(): Promise<string | null> {
    return ipcRenderer.invoke('fs:select-dir');
  },
  readFileBase64(filePath: string): Promise<FileTransferPayload | null> {
    return ipcRenderer.invoke('fs:read-file-base64', filePath);
  },
  writeFileBase64(filePath: string, contentBase64: string): Promise<FileTransferResult> {
    return ipcRenderer.invoke('fs:write-file-base64', filePath, contentBase64);
  },
};

contextBridge.exposeInMainWorld('fsAPI', fsApi);

const onboardingApi: OnboardingApi = {
  sampleStatus() {
    return ipcRenderer.invoke('onboarding:sample-status');
  },
  prepareSampleWorkspace() {
    return ipcRenderer.invoke('onboarding:prepare-sample');
  },
  resetSampleWorkspace() {
    return ipcRenderer.invoke('onboarding:reset-sample');
  },
  saveRunArtifact(request) {
    return ipcRenderer.invoke('onboarding:save-run-artifact', request);
  },
  listRunArtifacts() {
    return ipcRenderer.invoke('onboarding:list-run-artifacts');
  },
  openRunArtifact(runId?: string) {
    return ipcRenderer.invoke('onboarding:open-run-artifact', runId);
  },
  clearRunArtifacts() {
    return ipcRenderer.invoke('onboarding:clear-run-artifacts');
  },
  readDemoRoute() {
    return ipcRenderer.invoke('onboarding:read-demo-route');
  },
  saveDemoRoute(request) {
    return ipcRenderer.invoke('onboarding:save-demo-route', request);
  },
  exportDemoRouteStoryboard() {
    return ipcRenderer.invoke('onboarding:export-demo-route-storyboard');
  },
  openDemoRouteTarget(request) {
    return ipcRenderer.invoke('onboarding:open-demo-route-target', request);
  },
  onSampleStatusChanged(callback) {
    const listener = (_event: Electron.IpcRendererEvent, status: OnboardingSampleWorkspaceStatus) => callback(status);
    ipcRenderer.on('onboarding:sample-status-changed', listener);
    return () => ipcRenderer.removeListener('onboarding:sample-status-changed', listener);
  },
};

contextBridge.exposeInMainWorld('onboardingAPI', onboardingApi);

const processViewerApi: ProcessViewerApi = {
  list(): Promise<ProcessInfo[]> {
    return ipcRenderer.invoke('process-viewer:list');
  },

  kill(pid: number, force = false): Promise<ProcessKillResult> {
    return ipcRenderer.invoke('process-viewer:kill', pid, force);
  },
};

contextBridge.exposeInMainWorld('processViewerAPI', processViewerApi);

const safeFileApi: SafeFileApi = {
  previewTextWrite(request: SafeFilePreviewRequest): Promise<SafeFilePreviewResult> {
    return ipcRenderer.invoke('safe-file:preview', request);
  },

  applyTextWrite(request: SafeFileApplyRequest): Promise<SafeFileApplyResult> {
    return ipcRenderer.invoke('safe-file:apply', request);
  },

  restoreTextBackup(request: SafeFileRestoreRequest): Promise<SafeFileRestoreResult> {
    return ipcRenderer.invoke('safe-file:restore', request);
  },
};

contextBridge.exposeInMainWorld('safeFileAPI', safeFileApi);

const remoteFileApi: RemoteFileApi = {
  test(profile: RemoteFileProfile) {
    return ipcRenderer.invoke('remote-file:test', profile);
  },

  list(profile: RemoteFileProfile, remotePath: string) {
    return ipcRenderer.invoke('remote-file:list', profile, remotePath);
  },

  readFile(profile: RemoteFileProfile, remotePath: string): Promise<OpenFileResult | null> {
    return ipcRenderer.invoke('remote-file:read-file', profile, remotePath);
  },

  readFileBase64(profile: RemoteFileProfile, remotePath: string): Promise<FileTransferPayload | null> {
    return ipcRenderer.invoke('remote-file:read-file-base64', profile, remotePath);
  },

  writeFile(request: RemoteFileWriteRequest) {
    return ipcRenderer.invoke('remote-file:write-file', request);
  },

  mkdir(profile: RemoteFileProfile, remotePath: string) {
    return ipcRenderer.invoke('remote-file:mkdir', profile, remotePath);
  },

  delete(profile: RemoteFileProfile, remotePath: string, isDirectory: boolean) {
    return ipcRenderer.invoke('remote-file:delete', profile, remotePath, isDirectory);
  },

  rename(profile: RemoteFileProfile, fromPath: string, toPath: string) {
    return ipcRenderer.invoke('remote-file:rename', profile, fromPath, toPath);
  },
};

contextBridge.exposeInMainWorld('remoteFileAPI', remoteFileApi);

const transferQueueApi: TransferQueueApi = {
  enqueue(request: TransferQueueEnqueueRequest) {
    return ipcRenderer.invoke('transfer-queue:enqueue', request);
  },
  list() {
    return ipcRenderer.invoke('transfer-queue:list');
  },
  retry(id: string) {
    return ipcRenderer.invoke('transfer-queue:retry', id);
  },
  cancel(id: string) {
    return ipcRenderer.invoke('transfer-queue:cancel', id);
  },
  clearCompleted() {
    return ipcRenderer.invoke('transfer-queue:clear-completed');
  },
  clearAll() {
    return ipcRenderer.invoke('transfer-queue:clear-all');
  },
  onChanged(callback: (items: TransferQueueItem[]) => void) {
    const listener = (_event: Electron.IpcRendererEvent, items: TransferQueueItem[]) => callback(items);
    ipcRenderer.on('transfer-queue:changed', listener);
    return () => ipcRenderer.removeListener('transfer-queue:changed', listener);
  },
};

contextBridge.exposeInMainWorld('transferQueueAPI', transferQueueApi);

const extensionApi: ExtensionApi = {
  list() {
    return ipcRenderer.invoke('extensions:list');
  },

  reload() {
    return ipcRenderer.invoke('extensions:reload');
  },

  retry(extensionId: string) {
    return ipcRenderer.invoke('extensions:retry', extensionId);
  },

  setEnabled(extensionId: string, enabled: boolean) {
    return ipcRenderer.invoke('extensions:set-enabled', extensionId, enabled);
  },

  runCommand(commandId: string) {
    return ipcRenderer.invoke('extensions:run-command', commandId);
  },
};

contextBridge.exposeInMainWorld('extensionAPI', extensionApi);

const xconApi = {
  renderToPng(
    xcon: string,
    options?: { syntax?: string; theme?: string; viewportWidth?: number; title?: string },
  ): Promise<{ ok: boolean; base64?: string; pngBytes?: number; width?: number; height?: number; error?: string }> {
    return ipcRenderer.invoke('xcon:render-to-png', { xcon, options });
  },
};
contextBridge.exposeInMainWorld('xconAPI', xconApi);

const diagnosticsApi: DiagnosticsApi = {
  list() {
    return ipcRenderer.invoke('diagnostics:list');
  },

  record(entry: DiagnosticsLogRecordRequest) {
    return ipcRenderer.invoke('diagnostics:record', entry);
  },

  clear() {
    return ipcRenderer.invoke('diagnostics:clear');
  },

  revealLogFile() {
    return ipcRenderer.invoke('diagnostics:reveal-log-file');
  },

  exportBundle() {
    return ipcRenderer.invoke('diagnostics:export-bundle');
  },

  onChanged(callback: (items: DiagnosticsLogEntry[]) => void) {
    const listener = (_event: Electron.IpcRendererEvent, items: DiagnosticsLogEntry[]) => callback(items);
    ipcRenderer.on('diagnostics:changed', listener);
    return () => ipcRenderer.removeListener('diagnostics:changed', listener);
  },
};

contextBridge.exposeInMainWorld('diagnosticsAPI', diagnosticsApi);

const secretVaultApi: SecretVaultApi = {
  status() {
    return ipcRenderer.invoke('secret-vault:status');
  },

  clear() {
    return ipcRenderer.invoke('secret-vault:clear');
  },
};

contextBridge.exposeInMainWorld('secretVaultAPI', secretVaultApi);

const serverApi: ServerApi = {
  start(): Promise<ServerStatus> {
    return ipcRenderer.invoke('server:start');
  },
  stop(): Promise<ServerStatus> {
    return ipcRenderer.invoke('server:stop');
  },
  status(): Promise<ServerStatus> {
    return ipcRenderer.invoke('server:status');
  },
};

contextBridge.exposeInMainWorld('serverAPI', serverApi);

const workspaceApi: WorkspaceApi = {
  saveAs(profile: WorkspaceProfile, suggestedName?: string) {
    return ipcRenderer.invoke('workspace:save-as', profile, suggestedName);
  },
  saveTo(profile: WorkspaceProfile, filePath: string) {
    return ipcRenderer.invoke('workspace:save-to', profile, filePath);
  },
  open() {
    return ipcRenderer.invoke('workspace:open');
  },
  read(filePath: string) {
    return ipcRenderer.invoke('workspace:read', filePath);
  },
  clearRecent() {
    return ipcRenderer.invoke('workspace:clear-recent');
  },
};

contextBridge.exposeInMainWorld('workspaceAPI', workspaceApi);

const workflowRunsApi: WorkflowRunsApi = {
  list(request?: WorkflowRunHistoryListRequest) {
    return ipcRenderer.invoke('workflow-runs:list', request);
  },
  save(record: WorkflowRunHistoryRecord) {
    return ipcRenderer.invoke('workflow-runs:save', record);
  },
  delete(id: string) {
    return ipcRenderer.invoke('workflow-runs:delete', id);
  },
  clear() {
    return ipcRenderer.invoke('workflow-runs:clear');
  },
};

const workflowTemplatesApi: WorkflowTemplatesApi = {
  list() {
    return ipcRenderer.invoke('workflow-templates:list');
  },
  save(template: WorkflowTemplateRecord) {
    return ipcRenderer.invoke('workflow-templates:save', template);
  },
  setFavorite(id: string, favorite: boolean) {
    return ipcRenderer.invoke('workflow-templates:favorite', id, favorite);
  },
  touch(id: string) {
    return ipcRenderer.invoke('workflow-templates:touch', id);
  },
  remove(id: string) {
    return ipcRenderer.invoke('workflow-templates:remove', id);
  },
};

const workflowPlaywrightApi: WorkflowPlaywrightApi = {
  snapshot(request: WorkflowPlaywrightSnapshotRequest) {
    return ipcRenderer.invoke('workflow-playwright:snapshot', request);
  },
  run(request: WorkflowPlaywrightRunRequest) {
    return ipcRenderer.invoke('workflow-playwright:run', request);
  },
};

observePreloadWorkflowApis(window, workflowRunsApi, workflowTemplatesApi, workflowPlaywrightApi);
contextBridge.exposeInMainWorld('workflowRunsAPI', workflowRunsApi);
contextBridge.exposeInMainWorld('workflowTemplatesAPI', workflowTemplatesApi);
contextBridge.exposeInMainWorld('workflowPlaywrightAPI', workflowPlaywrightApi);

const xamongCodeApi: XamongCodeApi = {
  start(): Promise<XamongCodeServerStatus> {
    return ipcRenderer.invoke('xamong-code:start');
  },
  stop(): Promise<XamongCodeServerStatus> {
    return ipcRenderer.invoke('xamong-code:stop');
  },
  status(): Promise<XamongCodeServerStatus> {
    return ipcRenderer.invoke('xamong-code:status');
  },
};

contextBridge.exposeInMainWorld('xamongCodeAPI', xamongCodeApi);

const xenesisApi: XenesisApi = {
  status() {
    return ipcRenderer.invoke('xenesis:status');
  },
  setWorkspace(path: string) {
    return ipcRenderer.invoke('xenesis:set-workspace', path);
  },
  profiles() {
    return ipcRenderer.invoke('xenesis:profiles');
  },
  installProfile(request: XenesisProfileInstallRequest) {
    return ipcRenderer.invoke('xenesis:profile-install', request);
  },
  useProfile(name: string) {
    return ipcRenderer.invoke('xenesis:profile-use', name);
  },
  updateProfileChannels(request: XenesisProfileChannelsUpdateRequest) {
    return ipcRenderer.invoke('xenesis:profile-channels-update', request);
  },
  testProfileChannel(request: XenesisProfileChannelTestRequest) {
    return ipcRenderer.invoke('xenesis:profile-channel-test', request);
  },
  reports(query?: XenesisReportQuery) {
    return ipcRenderer.invoke('xenesis:reports', query);
  },
  tasks(query?: XenesisTaskQuery) {
    return ipcRenderer.invoke('xenesis:tasks', query);
  },
  diagnostics() {
    return ipcRenderer.invoke('xenesis:diagnostics');
  },
  gatewayStatus() {
    return ipcRenderer.invoke('xenesis:gateway-status');
  },
  gatewayStart() {
    return ipcRenderer.invoke('xenesis:gateway-start');
  },
  gatewayStop() {
    return ipcRenderer.invoke('xenesis:gateway-stop');
  },
  gatewayRestart() {
    return ipcRenderer.invoke('xenesis:gateway-restart');
  },
  gatewayOpenDashboard() {
    return ipcRenderer.invoke('xenesis:gateway-open-dashboard');
  },
  connectionsStatus() {
    return ipcRenderer.invoke('xenesis:connections-status');
  },
  start() {
    return ipcRenderer.invoke('xenesis:start');
  },
  stop() {
    return ipcRenderer.invoke('xenesis:stop');
  },
  restart() {
    return ipcRenderer.invoke('xenesis:restart');
  },
  cancel() {
    return ipcRenderer.invoke('xenesis:cancel');
  },
  resetSession() {
    return ipcRenderer.invoke('xenesis:reset-session');
  },
  run(request) {
    return ipcRenderer.invoke('xenesis:run', request);
  },
  onRunEvent(callback: (event: XenesisRunEvent) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, event: XenesisRunEvent) => callback(event);
    ipcRenderer.on('xenesis:run-event', listener);
    return () => ipcRenderer.removeListener('xenesis:run-event', listener);
  },
};

observePreloadXenesisApi(window, xenesisApi);
contextBridge.exposeInMainWorld('xenesisAPI', xenesisApi);

const localCliApi: LocalCliApi = {
  scan(): Promise<LocalCliAgentStatus[]> {
    return ipcRenderer.invoke('local-cli:scan');
  },
};

contextBridge.exposeInMainWorld('localCliAPI', localCliApi);

const mcpBridgeApi: McpBridgeApi = {
  status(): Promise<McpBridgeStatus> {
    return ipcRenderer.invoke('mcp:bridge-status');
  },
  listActionInbox(): Promise<McpBridgeActionInboxItem[]> {
    return ipcRenderer.invoke('mcp:action-inbox-list');
  },
  resolveActionInboxItem(request: McpBridgeActionInboxResolveRequest): Promise<McpBridgeActionInboxResolveResult> {
    return ipcRenderer.invoke('mcp:action-inbox-resolve', request);
  },
  callCapability(request: McpBridgeCapabilityCallRequest): Promise<McpBridgeCapabilityCallResult> {
    return ipcRenderer.invoke('mcp:capability-call', request);
  },
  rememberCapabilityApprovals(
    entries: McpBridgeCapabilityApprovalRememberEntry[],
  ): Promise<McpBridgeCapabilityApprovalRememberResult> {
    return ipcRenderer.invoke('mcp:capability-approval-remember', entries);
  },
  listBotSessions(): Promise<McpBridgeBotSession[]> {
    return ipcRenderer.invoke('mcp:bot-sessions-list');
  },
  saveBotSession(session: McpBridgeBotSession): Promise<McpBridgeBotSessionSaveResult> {
    return ipcRenderer.invoke('mcp:bot-session-save', session);
  },
  onActionInboxChanged(callback: (items: McpBridgeActionInboxItem[]) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, items: McpBridgeActionInboxItem[]) => callback(items);
    ipcRenderer.on('mcp:action-inbox-changed', listener);
    return () => ipcRenderer.removeListener('mcp:action-inbox-changed', listener);
  },
  onOpenFile(callback: (payload: McpBridgeOpenFilePayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: McpBridgeOpenFilePayload) => callback(payload);
    ipcRenderer.on('mcp:open-file', listener);
    return () => ipcRenderer.removeListener('mcp:open-file', listener);
  },
  onOpenBrowser(callback: (payload: McpBridgeOpenBrowserPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: McpBridgeOpenBrowserPayload) => callback(payload);
    ipcRenderer.on('mcp:open-browser', listener);
    return () => ipcRenderer.removeListener('mcp:open-browser', listener);
  },
  onOpenBuiltinPane(
    callback: (
      payload: McpBridgeOpenBuiltinPanePayload,
    ) => McpBridgeOpenBuiltinPaneResult | Promise<McpBridgeOpenBuiltinPaneResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeOpenBuiltinPanePayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:open-builtin-pane-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:open-builtin-pane-result', {
          requestId: payload?.requestId || '',
          kind: payload?.kind || 'settings',
          ok: false,
          placement: payload?.placement,
          targetPaneId: payload?.targetPaneId,
          category: payload?.category,
          mode: payload?.mode,
          section: payload?.section,
          ensureVisible: payload?.ensureVisible,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:open-builtin-pane', listener);
    return () => ipcRenderer.removeListener('mcp:open-builtin-pane', listener);
  },
  onOnboardingStepAction(
    callback: (
      payload: McpBridgeOnboardingStepActionPayload,
    ) => McpBridgeOnboardingStepActionResult | Promise<McpBridgeOnboardingStepActionResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeOnboardingStepActionPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:onboarding-step-action-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:onboarding-step-action-result', {
          requestId: payload?.requestId || '',
          action: payload?.action || 'verify',
          stepId: payload?.stepId || '',
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:onboarding-step-action', listener);
    return () => ipcRenderer.removeListener('mcp:onboarding-step-action', listener);
  },
  onOnboardingScenarioRun(
    callback: (
      payload: McpBridgeOnboardingScenarioRunPayload,
    ) => McpBridgeOnboardingScenarioRunResult | Promise<McpBridgeOnboardingScenarioRunResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeOnboardingScenarioRunPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:onboarding-scenario-run-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:onboarding-scenario-run-result', {
          requestId: payload?.requestId || '',
          trackId: payload?.trackId || 'basic-desk',
          ok: false,
          completed: false,
          steps: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:onboarding-scenario-run', listener);
    return () => ipcRenderer.removeListener('mcp:onboarding-scenario-run', listener);
  },
  onOnboardingRunPreview(
    callback: (
      payload: McpBridgeOnboardingRunPreviewPayload,
    ) => McpBridgeOnboardingRunPreviewResult | Promise<McpBridgeOnboardingRunPreviewResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeOnboardingRunPreviewPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:onboarding-run-preview-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:onboarding-run-preview-result', {
          requestId: payload?.requestId || '',
          ok: false,
          runId: payload?.runId,
          selected: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:onboarding-run-preview', listener);
    return () => ipcRenderer.removeListener('mcp:onboarding-run-preview', listener);
  },
  onOnboardingDemoModeRun(
    callback: (
      payload: McpBridgeOnboardingDemoModeRunPayload,
    ) => McpBridgeOnboardingDemoModeRunResult | Promise<McpBridgeOnboardingDemoModeRunResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeOnboardingDemoModeRunPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:onboarding-demo-mode-run-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:onboarding-demo-mode-run-result', {
          requestId: payload?.requestId || '',
          ok: false,
          completed: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:onboarding-demo-mode-run', listener);
    return () => ipcRenderer.removeListener('mcp:onboarding-demo-mode-run', listener);
  },
  onDemoLabPlaybackControl(
    callback: (
      payload: McpBridgeDemoLabPlaybackControlPayload,
    ) => McpBridgeDemoLabPlaybackControlResult | Promise<McpBridgeDemoLabPlaybackControlResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeDemoLabPlaybackControlPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:demo-lab-playback-control-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:demo-lab-playback-control-result', {
          requestId: payload?.requestId || '',
          action: payload?.action || 'status',
          contentId: payload?.contentId,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:demo-lab-playback-control', listener);
    return () => ipcRenderer.removeListener('mcp:demo-lab-playback-control', listener);
  },
  onExtensionActions(callback: (payload: McpBridgeExtensionActionsPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: McpBridgeExtensionActionsPayload) =>
      callback(payload);
    ipcRenderer.on('mcp:extension-actions', listener);
    return () => ipcRenderer.removeListener('mcp:extension-actions', listener);
  },
  onOpenTerminal(callback: (payload: McpBridgeOpenTerminalPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: McpBridgeOpenTerminalPayload) => callback(payload);
    ipcRenderer.on('mcp:open-terminal', listener);
    return () => ipcRenderer.removeListener('mcp:open-terminal', listener);
  },
  onBotEvent(callback: (payload: McpBridgeBotEvent) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: McpBridgeBotEvent) => callback(payload);
    ipcRenderer.on('mcp:bot-event', listener);
    return () => ipcRenderer.removeListener('mcp:bot-event', listener);
  },
  onDockAction(
    callback: (payload: McpBridgeDockActionPayload) => McpBridgeDockActionResult | Promise<McpBridgeDockActionResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeDockActionPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:dock-action-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:dock-action-result', {
          requestId: payload?.requestId || '',
          action: payload?.action || 'focus',
          ok: false,
          contentId: payload?.contentId,
          paneId: payload?.paneId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:dock-action', listener);
    return () => ipcRenderer.removeListener('mcp:dock-action', listener);
  },
  onBrowserAction(
    callback: (
      payload: McpBridgeBrowserActionPayload,
    ) => McpBridgeBrowserActionResult | Promise<McpBridgeBrowserActionResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeBrowserActionPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:browser-action-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:browser-action-result', {
          requestId: payload?.requestId || '',
          action: payload?.action || 'state',
          ok: false,
          contentId: payload?.contentId,
          paneId: payload?.paneId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:browser-action', listener);
    return () => ipcRenderer.removeListener('mcp:browser-action', listener);
  },
  reportBrowserActionResult(result: McpBridgeBrowserActionResult): Promise<void> {
    return ipcRenderer.invoke('mcp:browser-action-result', result);
  },
  onExplorerAction(
    callback: (
      payload: McpBridgeExplorerActionPayload,
    ) => McpBridgeExplorerActionResult | Promise<McpBridgeExplorerActionResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeExplorerActionPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:explorer-action-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:explorer-action-result', {
          requestId: payload?.requestId || '',
          action: payload?.action || 'show',
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:explorer-action', listener);
    return () => ipcRenderer.removeListener('mcp:explorer-action', listener);
  },
  reportExplorerActionResult(result: McpBridgeExplorerActionResult): Promise<void> {
    return ipcRenderer.invoke('mcp:explorer-action-result', result);
  },
  onRemoteExplorerAction(
    callback: (
      payload: McpBridgeRemoteExplorerActionPayload,
    ) => McpBridgeRemoteExplorerActionResult | Promise<McpBridgeRemoteExplorerActionResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeRemoteExplorerActionPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:remote-explorer-action-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:remote-explorer-action-result', {
          requestId: payload?.requestId || '',
          action: payload?.action || 'show',
          ok: false,
          profileId: payload?.profileId,
          path: payload?.path,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:remote-explorer-action', listener);
    return () => ipcRenderer.removeListener('mcp:remote-explorer-action', listener);
  },
  reportRemoteExplorerActionResult(result: McpBridgeRemoteExplorerActionResult): Promise<void> {
    return ipcRenderer.invoke('mcp:remote-explorer-action-result', result);
  },
  onTerminalUiAction(
    callback: (
      payload: McpBridgeTerminalUiActionPayload,
    ) => McpBridgeTerminalUiActionResult | Promise<McpBridgeTerminalUiActionResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeTerminalUiActionPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:terminal-ui-action-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:terminal-ui-action-result', {
          requestId: payload?.requestId || '',
          action: payload?.action || 'copy',
          ok: false,
          termId: payload?.termId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:terminal-ui-action', listener);
    return () => ipcRenderer.removeListener('mcp:terminal-ui-action', listener);
  },
  reportTerminalUiActionResult(result: McpBridgeTerminalUiActionResult): Promise<void> {
    return ipcRenderer.invoke('mcp:terminal-ui-action-result', result);
  },
  onFavoritesAction(
    callback: (
      payload: McpBridgeFavoritesActionPayload,
    ) => McpBridgeFavoritesActionResult | Promise<McpBridgeFavoritesActionResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeFavoritesActionPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:favorites-action-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:favorites-action-result', {
          requestId: payload?.requestId || '',
          action: payload?.action || 'list',
          ok: false,
          id: payload?.id,
          path: payload?.path,
          tab: payload?.tab,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:favorites-action', listener);
    return () => ipcRenderer.removeListener('mcp:favorites-action', listener);
  },
  reportFavoritesActionResult(result: McpBridgeFavoritesActionResult): Promise<void> {
    return ipcRenderer.invoke('mcp:favorites-action-result', result);
  },
  onRendererPerformanceTrace(
    callback: (
      payload: McpBridgeRendererPerformanceTraceRequest,
    ) => McpBridgeRendererPerformanceTraceResult | Promise<McpBridgeRendererPerformanceTraceResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeRendererPerformanceTraceRequest) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:renderer-performance-trace-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:renderer-performance-trace-result', {
          requestId: payload?.requestId || '',
          ok: false,
          enabled: false,
          setting: '',
          itemCount: 0,
          recent: [],
          summary: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:renderer-performance-trace', listener);
    return () => ipcRenderer.removeListener('mcp:renderer-performance-trace', listener);
  },
  reportRendererPerformanceTraceResult(result: McpBridgeRendererPerformanceTraceResult): Promise<void> {
    return ipcRenderer.invoke('mcp:renderer-performance-trace-result', result);
  },
  onCaptureActivePane(
    callback: (
      payload: McpBridgeCaptureActivePanePayload,
    ) => McpBridgeCaptureActivePaneResult | Promise<McpBridgeCaptureActivePaneResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeCaptureActivePanePayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:capture-active-pane-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:capture-active-pane-result', {
          requestId: payload?.requestId || '',
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:capture-active-pane', listener);
    return () => ipcRenderer.removeListener('mcp:capture-active-pane', listener);
  },
  reportCaptureActivePaneResult(result: McpBridgeCaptureActivePaneResult): Promise<void> {
    return ipcRenderer.invoke('mcp:capture-active-pane-result', result);
  },
  onGowooriChatRun(callback: (payload: McpBridgeGowooriChatRunPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: McpBridgeGowooriChatRunPayload) => callback(payload);
    ipcRenderer.on('mcp:gowoori-chat-run', listener);
    return () => ipcRenderer.removeListener('mcp:gowoori-chat-run', listener);
  },
  onGowooriChatRunCancel(callback: (payload: McpBridgeGowooriChatCancelPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: McpBridgeGowooriChatCancelPayload) =>
      callback(payload);
    ipcRenderer.on('mcp:gowoori-chat-run-cancel', listener);
    return () => ipcRenderer.removeListener('mcp:gowoori-chat-run-cancel', listener);
  },
  onGowooriArtifactVisibility(
    callback: (
      payload: McpBridgeGowooriArtifactVisibilityPayload,
    ) => McpBridgeGowooriArtifactVisibilityResult | Promise<McpBridgeGowooriArtifactVisibilityResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeGowooriArtifactVisibilityPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:gowoori-artifact-visibility-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:gowoori-artifact-visibility-result', {
          requestId: payload?.requestId || '',
          ok: false,
          components: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:gowoori-artifact-visibility', listener);
    return () => ipcRenderer.removeListener('mcp:gowoori-artifact-visibility', listener);
  },
  reportGowooriArtifactVisibilityResult(result: McpBridgeGowooriArtifactVisibilityResult): Promise<void> {
    return ipcRenderer.invoke('mcp:gowoori-artifact-visibility-result', result);
  },
  onGowooriOverlayShow(
    callback: (
      payload: McpBridgeGowooriOverlayPayload,
    ) => McpBridgeGowooriOverlayResult | Promise<McpBridgeGowooriOverlayResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeGowooriOverlayPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:gowoori-overlay-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:gowoori-overlay-result', {
          requestId: payload?.requestId || '',
          ok: false,
          visible: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:gowoori-overlay-show', listener);
    return () => ipcRenderer.removeListener('mcp:gowoori-overlay-show', listener);
  },
  onGowooriOverlayHide(
    callback: (
      payload: McpBridgeGowooriOverlayPayload,
    ) => McpBridgeGowooriOverlayResult | Promise<McpBridgeGowooriOverlayResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeGowooriOverlayPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:gowoori-overlay-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:gowoori-overlay-result', {
          requestId: payload?.requestId || '',
          ok: false,
          visible: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:gowoori-overlay-hide', listener);
    return () => ipcRenderer.removeListener('mcp:gowoori-overlay-hide', listener);
  },
  onGowooriOverlayStatus(
    callback: (
      payload: McpBridgeGowooriOverlayPayload,
    ) => McpBridgeGowooriOverlayResult | Promise<McpBridgeGowooriOverlayResult>,
  ): () => void {
    const listener = async (_event: Electron.IpcRendererEvent, payload: McpBridgeGowooriOverlayPayload) => {
      try {
        const result = await callback(payload);
        await ipcRenderer.invoke('mcp:gowoori-overlay-result', result);
      } catch (error) {
        await ipcRenderer.invoke('mcp:gowoori-overlay-result', {
          requestId: payload?.requestId || '',
          ok: false,
          visible: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    ipcRenderer.on('mcp:gowoori-overlay-status', listener);
    return () => ipcRenderer.removeListener('mcp:gowoori-overlay-status', listener);
  },
  reportGowooriOverlayResult(result: McpBridgeGowooriOverlayResult): Promise<void> {
    return ipcRenderer.invoke('mcp:gowoori-overlay-result', result);
  },
  reportGowooriChatRunProgress(progress: McpBridgeGowooriChatRunProgress): Promise<void> {
    return ipcRenderer.invoke('mcp:gowoori-chat-run-progress', progress);
  },
  reportGowooriChatRunResult(result: McpBridgeGowooriChatRunResult): Promise<void> {
    return ipcRenderer.invoke('mcp:gowoori-chat-run-result', result);
  },
  reportState(snapshot: McpBridgeRendererStateSnapshot): Promise<void> {
    return ipcRenderer.invoke('mcp:renderer-state', snapshot);
  },
};

const deskBridgeApi: DeskBridgeApi = mcpBridgeApi;

contextBridge.exposeInMainWorld('deskBridgeAPI', deskBridgeApi);
contextBridge.exposeInMainWorld('mcpBridgeAPI', mcpBridgeApi);

const mcpSettingsApi: McpSettingsApi = {
  status() {
    return ipcRenderer.invoke('mcp-settings:status');
  },
};

contextBridge.exposeInMainWorld('mcpSettingsAPI', mcpSettingsApi);

const providerIntegrationApi: ProviderIntegrationApi = {
  status(request) {
    return ipcRenderer.invoke('provider-integration:status', request);
  },
  installCliIntegration(request) {
    return ipcRenderer.invoke('provider-integration:install-cli', request);
  },
  installHermesPlugins(request) {
    return ipcRenderer.invoke('provider-integration:install-hermes-plugins', request);
  },
};

contextBridge.exposeInMainWorld('providerIntegrationAPI', providerIntegrationApi);

const updaterApi: UpdaterApi = {
  check(): Promise<void> {
    return ipcRenderer.invoke('updater:check');
  },

  download(): Promise<void> {
    return ipcRenderer.invoke('updater:download');
  },

  install(): void {
    ipcRenderer.invoke('updater:install');
  },

  getStatus(): Promise<UpdaterStatus> {
    return ipcRenderer.invoke('updater:get-status');
  },

  onStatusChanged(callback: (status: UpdaterStatus) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, status: UpdaterStatus) => callback(status);
    ipcRenderer.on('updater:status-changed', listener);
    return () => ipcRenderer.removeListener('updater:status-changed', listener);
  },
};

contextBridge.exposeInMainWorld('updaterAPI', updaterApi);

const captureApi: CaptureApi = {
  startCapture(): Promise<void> {
    return ipcRenderer.invoke('capture:start');
  },

  capturePane(request: CapturePaneRequest): Promise<CapturePaneResult> {
    return ipcRenderer.invoke('capture:pane', request);
  },

  onCaptureDone(callback: (filePath: string) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('capture:done', listener);
    return () => ipcRenderer.removeListener('capture:done', listener);
  },

  onCapturePreparing(callback: () => void): () => void {
    const listener = () => callback();
    ipcRenderer.on('capture:preparing', listener);
    return () => ipcRenderer.removeListener('capture:preparing', listener);
  },

  onCaptureReady(callback: () => void): () => void {
    const listener = () => callback();
    ipcRenderer.on('capture:ready', listener);
    return () => ipcRenderer.removeListener('capture:ready', listener);
  },

  listCaptures(): Promise<CaptureItem[]> {
    return ipcRenderer.invoke('capture:list');
  },

  getThumbnail(filePath: string): Promise<string> {
    return ipcRenderer.invoke('capture:thumbnail', filePath);
  },

  deleteCapture(filePath: string): Promise<void> {
    return ipcRenderer.invoke('capture:delete', filePath);
  },

  deleteAllCaptures(): Promise<void> {
    return ipcRenderer.invoke('capture:delete-all');
  },

  startFileDrag(filePath: string): void {
    ipcRenderer.send('capture:start-drag', filePath);
  },
};

contextBridge.exposeInMainWorld('captureAPI', captureApi);

const automationApi: AutomationApi = {
  setEnabled(termId: string, enabled: boolean): void {
    ipcRenderer.send('automation:set-enabled', { termId, enabled });
  },

  setStage(termId: string, stage: AutomationStage): void {
    ipcRenderer.send('automation:set-stage', { termId, stage });
  },

  setStreamFilterProfile(termId: string, profile: AutomationStreamFilterProfile | 'default'): void {
    ipcRenderer.send('automation:set-stream-filter-profile', { termId, profile });
  },

  getStatus(termId: string): Promise<AutomationStatus | null> {
    return ipcRenderer.invoke('automation:get-status', termId);
  },

  getEvents(termId: string): Promise<AutomationEvent[]> {
    return ipcRenderer.invoke('automation:get-events', termId);
  },

  clearEvents(termId: string): void {
    ipcRenderer.send('automation:clear-events', termId);
  },

  onStatus(termId: string, cb: (status: AutomationStatus) => void): () => void {
    const channel = `automation:status:${termId}`;
    const listener = (_event: Electron.IpcRendererEvent, status: AutomationStatus) => cb(status);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  onEvent(termId: string, cb: (event: AutomationEvent) => void): () => void {
    const channel = `automation:event:${termId}`;
    const listener = (_event: Electron.IpcRendererEvent, event: AutomationEvent) => cb(event);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  /** 설정 변경 후 실행 중인 모든 자동화 컨트롤러에 새 설정 반영 */
  reloadSettings(): void {
    ipcRenderer.send('automation:reload-settings');
  },

  /**
   * 수동으로 터미널에 명령 전송.
   * autoSend=false여도 이 API로는 전송 가능.
   * @param pendingEventId - 처리할 pending 이벤트 ID (dismissed 처리용)
   */
  manualSend(termId: string, input: string, pendingEventId?: string): void {
    ipcRenderer.send('automation:manual-send', { termId, input, pendingEventId });
  },
};

contextBridge.exposeInMainWorld('automationAPI', automationApi);
