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

export declare function installHermesPlugins(
  options?: ProviderIntegrationHermesInstallRequest & {
    assetRoot?: string;
    fsImpl?: unknown;
  },
): ProviderIntegrationHermesInstallResult;
