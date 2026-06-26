import type {
  AiProviderSettings,
  LocalCliAgentStatus,
  LocalCliSettings,
  XamongCodeRuntimeSettings,
} from '../shared/types';

export declare const LOCAL_CLI_AGENTS: readonly Array<{
  id: string;
  label: string;
  subtitle: string;
  commands: readonly string[];
  provider: string;
  accent: string;
}>;

export declare function findPathEnvKey(
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
  platform?: NodeJS.Platform | string,
): string;

export declare function resolveAgentCommand(
  agent: { commands?: readonly string[] },
  options?: {
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    platform?: NodeJS.Platform | string;
    existsSync?: (candidate: string) => boolean;
  },
): string;

export declare function scanLocalCliAgents(options?: {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  platform?: NodeJS.Platform | string;
  existsSync?: (candidate: string) => boolean;
  spawnSync?: (
    command: string,
    args?: readonly string[],
    options?: unknown,
  ) => {
    status?: number | null;
    stdout?: unknown;
    stderr?: unknown;
  };
  includeVersions?: boolean;
}): LocalCliAgentStatus[];

export declare function resolveLocalCliAgentStatus(
  agentId: string,
  options?: {
    env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
    platform?: NodeJS.Platform | string;
    existsSync?: (candidate: string) => boolean;
    spawnSync?: (
      command: string,
      args?: readonly string[],
      options?: unknown,
    ) => {
      status?: number | null;
      stdout?: unknown;
      stderr?: unknown;
    };
    includeVersions?: boolean;
  },
): LocalCliAgentStatus | null;

export declare function buildMcpConfigSnippet(options?: {
  serverPath?: string;
  bridgeUrl?: string;
  bridgeToken?: string;
  stateFilePath?: string;
  configFilePath?: string;
}): string;

export declare function buildLocalCliTerminalEnv(options?: {
  baseEnv?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  localCli?: Partial<LocalCliSettings>;
  aiProvider?: Partial<AiProviderSettings>;
  xamongCode?: Partial<XamongCodeRuntimeSettings>;
  selectedAgent?: Partial<LocalCliAgentStatus> | null;
  platform?: NodeJS.Platform | string;
  mcp?: {
    enabled?: boolean;
    serverPath?: string;
    bridgeUrl?: string;
    bridgeToken?: string;
    stateFilePath?: string;
    configFilePath?: string;
  };
}): NodeJS.ProcessEnv;
