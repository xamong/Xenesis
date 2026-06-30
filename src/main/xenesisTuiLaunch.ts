import fs from 'node:fs';
import path from 'node:path';

import type { ExtensionPanelPlacement, ShellKind } from '../shared/types';
import { XENESIS_TUI_TERMINAL_TITLE } from '../shared/xenesisTui';

export interface BuildElectronRunAsNodeCommandOptions {
  execPath: string;
  entrypoint: string;
  args?: string[];
}

export interface BuildNodeRunCommandOptions {
  nodePath: string;
  entrypoint: string;
  args?: string[];
}

export interface BuildXenesisTuiTerminalRequestOptions {
  args?: unknown;
  runtimePath: string;
  execPath: string;
  env?: NodeJS.ProcessEnv;
  existsSync?: (path: string) => boolean;
  platform?: NodeJS.Platform;
}

export interface XenesisTuiTerminalRequest {
  command: string;
  cwd: string;
  shell: ShellKind;
  placement?: ExtensionPanelPlacement;
  targetPaneId?: string;
  title: string;
  metadata: {
    kind: 'xenesis-tui';
    command: string;
  };
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function quoteCmdNestedArg(value: string): string {
  return `""${String(value).replace(/"/g, '""""')}""`;
}

function quoteCmdCliArg(value: string): string {
  return /^[A-Za-z0-9._:/\\-]+$/.test(value) ? value : quoteCmdNestedArg(value);
}

function buildCmdShellCommand(parts: string[]): string {
  return `cmd /d /s /c "${parts.join(' ')}"`;
}

function pathForPlatform(platform: NodeJS.Platform): path.PlatformPath {
  return platform === 'win32' ? path.win32 : path;
}

export function buildElectronRunAsNodeCommand(options: BuildElectronRunAsNodeCommandOptions): string {
  const execPath = normalizeText(options.execPath);
  const entrypoint = normalizeText(options.entrypoint);
  if (!execPath) throw new Error('Electron executable path is required for Xenesis TUI.');
  if (!entrypoint) throw new Error('Xenesis CLI entrypoint is required for Xenesis TUI.');

  const args = (options.args ?? []).map((arg) => quoteCmdCliArg(String(arg)));
  return buildCmdShellCommand([
    'set ELECTRON_RUN_AS_NODE=1&&',
    quoteCmdNestedArg(execPath),
    quoteCmdNestedArg(entrypoint),
    ...args,
  ]);
}

export function buildNodeRunCommand(options: BuildNodeRunCommandOptions): string {
  const nodePath = normalizeText(options.nodePath);
  const entrypoint = normalizeText(options.entrypoint);
  if (!nodePath) throw new Error('Node executable path is required for Xenesis TUI.');
  if (!entrypoint) throw new Error('Xenesis CLI entrypoint is required for Xenesis TUI.');

  const args = (options.args ?? []).map((arg) => quoteCmdCliArg(String(arg)));
  return buildCmdShellCommand([quoteCmdNestedArg(nodePath), quoteCmdNestedArg(entrypoint), ...args]);
}

function findEnvValue(env: NodeJS.ProcessEnv, key: string): string {
  const direct = env[key];
  if (typeof direct === 'string') return direct;
  const foundKey = Object.keys(env).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
  const value = foundKey ? env[foundKey] : undefined;
  return typeof value === 'string' ? value : '';
}

function splitPathEntries(pathEnv: string, delimiter: string): string[] {
  return pathEnv
    .split(delimiter)
    .map((entry) => entry.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

export function resolveNodeExecutablePath(
  options: { env?: NodeJS.ProcessEnv; existsSync?: (path: string) => boolean; platform?: NodeJS.Platform } = {},
): string | null {
  const env = options.env ?? process.env;
  const existsSync = options.existsSync ?? fs.existsSync;
  const platform = options.platform ?? process.platform;
  const delimiter = platform === 'win32' ? ';' : path.delimiter;
  const pathEnv = findEnvValue(env, 'PATH');
  if (!pathEnv) return null;

  const names = platform === 'win32' ? ['node.exe', 'node.cmd', 'node.bat', 'node'] : ['node'];
  const pathImpl = pathForPlatform(platform);
  for (const dir of splitPathEntries(pathEnv, delimiter)) {
    for (const name of names) {
      const candidate = pathImpl.join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export function buildXenesisTuiTerminalRequest(
  options: BuildXenesisTuiTerminalRequestOptions,
): XenesisTuiTerminalRequest {
  const args = normalizeRecord(options.args);
  const runtimePath = normalizeText(options.runtimePath);
  const existsSync = options.existsSync ?? fs.existsSync;
  if (!runtimePath) throw new Error('Xenesis runtime path is not configured.');

  const platform = options.platform ?? process.platform;
  const entrypoint = pathForPlatform(platform).join(runtimePath, 'dist', 'cli', 'main.js');
  if (!existsSync(entrypoint)) {
    throw new Error(`Xenesis CLI entrypoint was not found: ${entrypoint}`);
  }

  const cliArgs = ['tui', '--cwd', '.'];
  const nodePath = resolveNodeExecutablePath({ env: options.env, existsSync, platform });
  const command = nodePath
    ? buildNodeRunCommand({ nodePath, entrypoint, args: cliArgs })
    : buildElectronRunAsNodeCommand({
        execPath: options.execPath,
        entrypoint,
        args: cliArgs,
      });

  const placement = normalizeText(args.placement) as ExtensionPanelPlacement;
  const targetPaneId = normalizeText(args.targetPaneId);

  return {
    command,
    cwd: normalizeText(args.cwd) || process.cwd(),
    shell: (normalizeText(args.shell) || 'powershell') as ShellKind,
    ...(placement ? { placement } : {}),
    ...(targetPaneId ? { targetPaneId } : {}),
    title: XENESIS_TUI_TERMINAL_TITLE,
    metadata: {
      kind: 'xenesis-tui',
      command,
    },
  };
}
