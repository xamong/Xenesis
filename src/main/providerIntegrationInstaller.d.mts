import type {
  ProviderIntegrationCliInstallRequest,
  ProviderIntegrationCliInstallResult,
  ProviderIntegrationHermesInstallRequest,
  ProviderIntegrationHermesInstallResult,
  ProviderIntegrationStatus,
  ProviderIntegrationXenesisInstallResult,
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

export declare function renderXenesisDeskSkill(options?: {
  serverName?: string;
  targetId?: string;
  templateText?: string;
}): string;

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

export declare function resolveXenesisNativePluginPlan(options?: { assetRoot?: string; xenesisHome?: string }): {
  assetRoot: string;
  xenesisHome: string;
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
  xenesisHome?: string;
  fsImpl?: unknown;
}): ProviderIntegrationStatus;

export declare function installCliIntegration(
  options?: ProviderIntegrationCliInstallRequest & {
    serverName?: string;
    serverPath?: string;
    xenisHome?: string;
    assetRoot?: string;
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

export declare function installXenesisNativePlugins(options?: {
  assetRoot?: string;
  xenesisHome?: string;
  xenisHome?: string;
  serverPath?: string;
  fsImpl?: unknown;
}): ProviderIntegrationXenesisInstallResult;
