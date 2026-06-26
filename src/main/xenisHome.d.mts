export declare const XENIS_HOME_ENV = 'XENIS_HOME';
export declare const XENIS_HOME_DIR_NAME = '.xenis';
export declare const LEGACY_XAMONG_CODE_CONFIG_DIR = 'E:\\Xamong\\agent';
export declare const MIGRATABLE_USER_DATA_ITEMS: string[];

export interface XenisHomeOptions {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  homedir?: string;
}

export interface LegacyUserDataMigrationOptions {
  legacyDirs?: string[];
  targetDir: string;
}

export interface LegacyUserDataMigrationResult {
  migrated: boolean;
  sourceDir: string;
  copiedItems: string[];
}

export declare function resolveXenisHomeDir(options?: XenisHomeOptions): string;
export declare function getXenisHomePath(segments?: string[], options?: XenisHomeOptions): string;
export declare function getDefaultCaptureDir(options?: XenisHomeOptions): string;
export declare function getDefaultWorkspaceProfilesDir(options?: XenisHomeOptions): string;
export declare function getDefaultExportsDir(options?: XenisHomeOptions): string;
export declare function getDefaultWorkflowRunsDir(options?: XenisHomeOptions): string;
export declare function getDefaultWorkflowTemplatesDir(options?: XenisHomeOptions): string;
export declare function getDefaultDiagnosticsDir(options?: XenisHomeOptions): string;
export declare function getDefaultUserExtensionsDir(options?: XenisHomeOptions): string;
export declare function getDefaultXamongCodeConfigDir(options?: XenisHomeOptions): string;
export declare function getMcpDir(options?: XenisHomeOptions): string;
export declare function normalizeUserPath(value: unknown): string;
export declare function pathsEqual(left: unknown, right: unknown): boolean;
export declare function resolveDefaultedXamongCodeConfigDir(value: unknown, options?: XenisHomeOptions): string;
export declare function resolveDefaultedDir(value: unknown, fallbackDir: string): string;
export declare function legacyUserDataMigrationCandidates(options?: {
  defaultUserDataDir?: string;
  appIsPackaged?: boolean;
}): string[];
export declare function migrateLegacyUserData(options?: LegacyUserDataMigrationOptions): LegacyUserDataMigrationResult;
