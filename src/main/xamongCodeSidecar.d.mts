export declare const DEFAULT_XAMONG_CODE_API_HOST = '127.0.0.1';
export declare const DEFAULT_XAMONG_CODE_API_PORT = 3337;
export declare const DEFAULT_XAMONG_CODE_CONFIG_DIR: string;

export interface ResolveXamongCodeRuntimePathOptions {
  settingPath?: string;
  env?: NodeJS.ProcessEnv;
  appIsPackaged?: boolean;
  dirname?: string;
  resourcesPath?: string;
  existsSync?: (path: string) => boolean;
}

export interface BuildXamongCodeApiLaunchOptions {
  runtimePath: string;
  host?: string;
  port?: number;
  configDir?: string;
  openAiApiKey?: string;
  openAiModel?: string;
  workspacesConfigPath?: string;
  directGeneralChat?: boolean;
  directChatModel?: string;
  workerTierPolicies?: string;
  env?: NodeJS.ProcessEnv;
  existsSync?: (path: string) => boolean;
}

export type XamongCodeApiLaunch =
  | {
      ok: true;
      command: string;
      args: string[];
      cwd: string;
      env: NodeJS.ProcessEnv;
      url: string;
    }
  | {
      ok: false;
      error: string;
    };

export declare function resolveXamongCodeRuntimePath(options?: ResolveXamongCodeRuntimePathOptions): string;

export declare function buildXamongCodeApiLaunch(options: BuildXamongCodeApiLaunchOptions): XamongCodeApiLaunch;

export interface BuildXamongCodeTerminalEnvOptions {
  baseEnv?: NodeJS.ProcessEnv;
  runtimePath?: string;
  configDir?: string;
  apiUrl?: string;
  openAiApiKey?: string;
  openAiModel?: string;
  workspacesConfigPath?: string;
  directGeneralChat?: boolean;
  directChatModel?: string;
  workerTierPolicies?: string;
  shimDir?: string;
  pathKey?: string;
}

export declare function findPathEnvKey(env?: NodeJS.ProcessEnv): string;

export declare function buildXamongCodeTerminalEnv(options?: BuildXamongCodeTerminalEnvOptions): NodeJS.ProcessEnv;
