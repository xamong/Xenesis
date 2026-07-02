/// <reference types="vite/client" />

import type {
  AgentSessionsApi,
  AppMenuApi,
  BrowserSourceApi,
  CaptureApi,
  DeskBridgeApi,
  DiagnosticsApi,
  ExtensionApi,
  FileApi,
  FsApi,
  LocalCliApi,
  McpBridgeApi,
  McpSettingsApi,
  OnboardingApi,
  ProcessViewerApi,
  ProviderIntegrationApi,
  RemoteFileApi,
  SafeFileApi,
  SecretVaultApi,
  ServerApi,
  TerminalApi,
  TransferQueueApi,
  UpdaterApi,
  VaultApi,
  WorkflowPlaywrightApi,
  WorkflowRunsApi,
  WorkflowTemplatesApi,
  WorkspaceApi,
  XamongCodeApi,
  XenesisApi,
} from '../shared/types';

declare global {
  interface Window {
    terminalAPI: TerminalApi;
    appMenuAPI?: AppMenuApi;
    browserSourceAPI: BrowserSourceApi;
    fileAPI: FileApi;
    fsAPI: FsApi;
    vaultAPI: VaultApi;
    onboardingAPI: OnboardingApi;
    processViewerAPI: ProcessViewerApi;
    safeFileAPI: SafeFileApi;
    agentSessionsAPI?: AgentSessionsApi;
    remoteFileAPI: RemoteFileApi;
    transferQueueAPI: TransferQueueApi;
    extensionAPI: ExtensionApi;
    diagnosticsAPI: DiagnosticsApi;
    secretVaultAPI: SecretVaultApi;
    serverAPI: ServerApi;
    workspaceAPI: WorkspaceApi;
    workflowRunsAPI: WorkflowRunsApi;
    workflowTemplatesAPI: WorkflowTemplatesApi;
    workflowPlaywrightAPI?: WorkflowPlaywrightApi;
    xamongCodeAPI: XamongCodeApi;
    xenesisAPI: XenesisApi;
    localCliAPI: LocalCliApi;
    deskBridgeAPI?: DeskBridgeApi;
    mcpBridgeAPI?: McpBridgeApi;
    mcpSettingsAPI: McpSettingsApi;
    providerIntegrationAPI: ProviderIntegrationApi;
    updaterAPI: UpdaterApi;
    captureAPI?: CaptureApi;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.HTMLAttributes<HTMLElement> & {
        src?: string;
        allowpopups?: string;
        partition?: string;
        nodeintegration?: string;
        webpreferences?: string;
        useragent?: string;
      };
    }
  }
}
