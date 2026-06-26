/// <reference types="vite/client" />

import type {
  AppMenuApi,
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
    fileAPI: FileApi;
    fsAPI: FsApi;
    onboardingAPI: OnboardingApi;
    processViewerAPI: ProcessViewerApi;
    safeFileAPI: SafeFileApi;
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
