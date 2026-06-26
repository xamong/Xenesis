import type { ShellKind } from '../shared/types';

export interface TerminalWarmupLaunch {
  shell: ShellKind;
  command: string;
  args: string[];
  cwd: string;
}

export declare function shouldTerminalWarmupRun(env?: NodeJS.ProcessEnv): boolean;

export declare function buildTerminalWarmupLaunch(options?: {
  shell?: ShellKind | string;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  systemRoot?: string;
  cwd?: string;
}): TerminalWarmupLaunch;
