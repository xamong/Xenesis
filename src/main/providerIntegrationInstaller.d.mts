import type {
  ProviderIntegrationCliInstallRequest,
  ProviderIntegrationCliInstallResult,
  ProviderIntegrationHermesInstallRequest,
  ProviderIntegrationHermesInstallResult,
  ProviderIntegrationStatus,
} from '../shared/types';

export declare function mergeCodexMcpConfig(
  existingText?: string,
  options?: {
    serverName?: string;
    serverPath?: string;
    xenisHome?: string;
  },
): string;

export declare function mergeJsonMcpConfig(
  existingText?: string,
  options?: {
    serverName?: string;
    serverPath?: string;
    xenisHome?: string;
  },
): string;

export declare function mergeCodexExternalMcpConfig(
  existingText?: string,
  options?: {
    serverName?: string;
    config?: Record<string, unknown>;
  },
): string;

export declare function mergeJsonExternalMcpConfig(
  existingText?: string,
  options?: {
    serverName?: string;
    config?: Record<string, unknown>;
  },
): string;

export declare function renderXenesisDeskSkill(options?: { serverName?: string }): string;

export declare function buildCliIntegrationTargets(options?: {
  homeDir?: string;
  appDataDir?: string;
}): ProviderIntegrationStatus['cliTargets'];

export declare function resolveHermesPluginPlan(options?: { assetRoot?: string; hermesRoot?: string }): {
  assetRoot: string;
  hermesRoot: string;
  items: Array<{
    id: string;
    label: string;
    sourcePath: string;
    destinationPath: string;
  }>;
};

export declare function getProviderIntegrationStatus(options?: {
  homeDir?: string;
  appDataDir?: string;
  assetRoot?: string;
  hermesRoot?: string;
  fsImpl?: unknown;
}): ProviderIntegrationStatus;

export declare function installCliIntegration(
  options?: ProviderIntegrationCliInstallRequest & {
    serverName?: string;
    serverPath?: string;
    xenisHome?: string;
    homeDir?: string;
    appDataDir?: string;
    backupRoot?: string;
    fsImpl?: unknown;
  },
): ProviderIntegrationCliInstallResult;

export declare function installExternalMcpServer(options?: {
  serverName?: string;
  config?: Record<string, unknown>;
  targetIds?: string[];
  homeDir?: string;
  appDataDir?: string;
  backupRoot?: string;
  fsImpl?: unknown;
}): {
  ok: true;
  serverName: string;
  targets: Array<{
    id: string;
    label: string;
    configType: string;
    path: string;
    changed: boolean;
    backupPath: string;
  }>;
};

export declare function installHermesPlugins(
  options?: ProviderIntegrationHermesInstallRequest & {
    assetRoot?: string;
    fsImpl?: unknown;
  },
): ProviderIntegrationHermesInstallResult;
