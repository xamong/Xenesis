export interface PrepareCodexIsolatedHomeOptions {
  realCodexHome: string;
  isolatedHome: string;
  reasoningEffort?: string;
  workspaceCwd?: string;
}

export declare function prepareCodexIsolatedHome(
  options: PrepareCodexIsolatedHomeOptions,
  fs?: typeof import('node:fs'),
): string | null;

export declare function filterCodexConfig(text: string): string;

export declare function readCodexModel(realCodexHome: string, fs?: typeof import('node:fs')): string;
