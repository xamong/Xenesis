export declare const DEFAULT_XENESIS_GATEWAY_HOST = '127.0.0.1';
export declare const DEFAULT_XENESIS_GATEWAY_PORT = 3338;
export declare const DEFAULT_XENESIS_GATEWAY_WORKFLOW = 'xenis';

export interface ResolveXenesisRuntimePathOptions {
  settingPath?: string;
  settingsPath?: string;
  env?: NodeJS.ProcessEnv;
  app?: {
    isPackaged?: boolean;
  };
  appIsPackaged?: boolean;
  dirname?: string;
  resourcesPath?: string;
  existsSync?: (path: string) => boolean;
}

export interface ResolveXenesisStateHomeOptions {
  xenisHome: string;
}

export interface ResolveXenesisWorkspaceRootOptions {
  activeWorkspace?: string;
  workspacePath?: string;
  defaultCwd?: string;
  fallbackCwd?: string;
  existsSync?: (path: string) => boolean;
  statSync?: (path: string) => {
    isDirectory?: () => boolean;
    isFile?: () => boolean;
  };
  readFileSync?: (path: string, encoding: BufferEncoding) => string;
}

export interface ResolveXenesisGatewayPortOptions {
  configuredPort?: number;
  host?: string;
  defaultPort?: number;
  isPortAvailable?: (host: string, port: number) => boolean | Promise<boolean>;
  findOpenPort?: (host?: string) => number | Promise<number>;
}

export interface ResolveXenesisGatewayPortResult {
  port: number;
  preferredPort: number;
  fallback: boolean;
  fallbackReason: string;
}

export interface BuildXenesisGatewayLaunchOptions {
  runtimePath: string;
  stateHome?: string;
  xenesisHome?: string;
  xenisHome?: string;
  workspace?: string;
  host?: string;
  port?: number;
  token?: string;
  gatewayToken?: string;
  bridgeUrl?: string;
  mcpBridgeUrl?: string;
  bridgeToken?: string;
  mcpBridgeToken?: string;
  profile?: string;
  provider?: string;
  model?: string;
  baseURL?: string;
  apiKeyEnv?: string;
  env?: NodeJS.ProcessEnv;
  existsSync?: (path: string) => boolean;
}

export interface BuildXenesisProviderRuntimeOptionsOptions {
  xenesisSettings?: {
    model?: string;
    profile?: string;
  };
  aiProvider?: {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
  };
  env?: NodeJS.ProcessEnv;
}

export interface BuildXenesisGatewayRunPayloadOptions {
  prompt?: string;
  workflow?: string;
  source?: string;
  workspace?: string;
  mode?: 'chat' | 'plan' | 'work';
  context?: Record<string, unknown>;
}

export interface XenesisGatewayRunPayload {
  prompt: string;
  workflow: string;
  ideContext: {
    source: string;
    workspace: string;
    mode?: 'chat' | 'plan' | 'work';
    context: Record<string, unknown>;
  };
}

export interface XenesisProviderRuntimeOptions {
  provider: string;
  model: string;
  profile: string;
  baseURL: string;
  apiKeyEnv: string;
  env: NodeJS.ProcessEnv;
}

export type XenesisGatewayLaunch =
  | {
      ok: true;
      command: string;
      args: string[];
      cwd: string;
      env: NodeJS.ProcessEnv;
      url: string;
      host: string;
      port: number;
      entrypoint: string;
    }
  | {
      ok: false;
      error: string;
    };

export interface XenesisServiceStatus {
  state: 'stopped' | 'running' | 'stopping' | 'error';
  pid: number | null;
  url: string;
  host: string;
  port: number;
  startedAt: number | null;
  stoppedAt: number | null;
  exitCode: number | null;
  signal: NodeJS.Signals | string | null;
  error: string;
}

export interface XenesisService {
  getStatus(): XenesisServiceStatus;
  start(launch: XenesisGatewayLaunch): XenesisServiceStatus;
  stop(): XenesisServiceStatus;
}

export interface CreateXenesisServiceOptions {
  spawnImpl?: (
    command: string,
    args: string[],
    options: {
      cwd: string;
      env: NodeJS.ProcessEnv;
      stdio: ['ignore', 'pipe', 'pipe'];
      windowsHide: boolean;
    },
  ) => {
    pid?: number;
    stdout?: {
      on?: (event: 'data', listener: (chunk: unknown) => void) => unknown;
    };
    stderr?: {
      on?: (event: 'data', listener: (chunk: unknown) => void) => unknown;
    };
    once?: (event: 'error' | 'exit', listener: (...args: any[]) => void) => unknown;
    kill?: () => unknown;
  };
  now?: () => number;
}

export declare function resolveXenesisRuntimePath(options?: ResolveXenesisRuntimePathOptions): string;

export declare function resolveXenesisStateHome(options: ResolveXenesisStateHomeOptions): string;

export declare function resolveXenesisWorkspaceRoot(options?: ResolveXenesisWorkspaceRootOptions): string;

export declare function isPortAvailable(host?: string, port?: number): Promise<boolean>;

export declare function resolveXenesisGatewayPort(
  options?: ResolveXenesisGatewayPortOptions,
): Promise<ResolveXenesisGatewayPortResult>;

export declare function findOpenPort(host?: string): Promise<number>;

export declare function buildXenesisProviderRuntimeOptions(
  options?: BuildXenesisProviderRuntimeOptionsOptions,
): XenesisProviderRuntimeOptions;

export declare function buildXenesisGatewayRunPayload(
  options?: BuildXenesisGatewayRunPayloadOptions,
): XenesisGatewayRunPayload;

export declare function buildXenesisGatewayLaunch(options: BuildXenesisGatewayLaunchOptions): XenesisGatewayLaunch;

export declare function readGatewayJson(
  url: string,
  token: string,
  pathname: string,
  timeoutMs?: number,
): Promise<unknown>;

export interface WaitForGatewayReadyOptions {
  timeoutMs?: number;
  intervalMs?: number;
  requestTimeoutMs?: number;
  readJson?: (url: string, token: string, pathname: string, timeoutMs?: number) => Promise<unknown>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface WaitForGatewayReadyResult {
  ready: boolean;
  error: string;
  attempts: number;
}

export declare function waitForGatewayReady(
  url: string,
  token: string,
  options?: WaitForGatewayReadyOptions,
): Promise<WaitForGatewayReadyResult>;

export declare function parseXenesisSseChunk(chunk: string): { event: string; data: unknown } | undefined;

export declare function postGatewayJson(
  url: string,
  token: string,
  pathname: string,
  body: unknown,
  timeoutMs?: number,
): Promise<unknown>;

export declare function createXenesisService(options?: CreateXenesisServiceOptions): XenesisService;
