import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRemoteDeskBridgeFromEnv } from '../../remoteDesk/bridgeClient.js';
import type { TuiTerminalImageRequest } from './runtimeTypes.js';
import { setTuiSuggestionContext, type TuiState } from './state.js';

export interface TuiImageCommandRunnerOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  xenesisHome: string;
  getState(): TuiState;
  setState(state: TuiState): void;
  publish(): void;
  notify(message: string, kind?: 'info' | 'warning' | 'error'): void;
  setCapturedCommandOutput(command: string, stdout: string[], stderr: string[]): void;
  statePath(...parts: string[]): string;
  createTerminalImageRequest(
    commandName: 'image' | 'xcon-image',
    rest: string,
    cwd: string,
  ): Promise<TuiTerminalImageRequest>;
  friendlyImageError(error: unknown): string;
  bridgeCallFailed(value: unknown): string | undefined;
  isSupportedImageFileName(value: string): boolean;
  quoteCommandArg(value: string): string;
}

export function createTuiImageCommandRunner(options: TuiImageCommandRunnerOptions) {
  let recentImageSources: string[] = [];
  let captureImageSources: string[] = [];

  const combinedTuiImageSources = () => {
    const sources: string[] = [];
    for (const source of [...recentImageSources, ...captureImageSources]) {
      if (source && !sources.includes(source)) sources.push(source);
    }
    return sources.slice(0, 10);
  };
  const setTuiImageSuggestionSources = () => {
    options.setState(setTuiSuggestionContext(options.getState(), { imageSources: combinedTuiImageSources() }));
    options.publish();
  };
  const rememberRecentImageSource = (source: string | undefined) => {
    if (!source) return;
    recentImageSources = [source, ...recentImageSources.filter((existing) => existing !== source)].slice(0, 8);
    setTuiImageSuggestionSources();
  };
  const getTuiCaptureDirectories = () => {
    const userHome = options.env.USERPROFILE ?? options.env.HOME;
    const directories = [
      options.statePath('captures'),
      resolve(options.xenesisHome, 'captures'),
      userHome ? resolve(userHome, '.xenis-dev', 'captures') : undefined,
      userHome ? resolve(userHome, '.xenis', 'captures') : undefined,
    ];
    return directories.filter(
      (directory, index): directory is string => Boolean(directory) && directories.indexOf(directory) === index,
    );
  };
  const refreshTuiImageSuggestions = async () => {
    const candidates: Array<{ path: string; mtimeMs: number }> = [];
    for (const directory of getTuiCaptureDirectories()) {
      let files;
      try {
        files = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        if (isNodeError(error) && error.code === 'ENOENT') continue;
        throw error;
      }
      await Promise.all(
        files
          .filter((file) => file.isFile() && options.isSupportedImageFileName(file.name))
          .map(async (file) => {
            const path = resolve(directory, file.name);
            candidates.push({ path, mtimeMs: (await stat(path)).mtimeMs });
          }),
      );
    }
    captureImageSources = candidates
      .sort((left, right) => right.mtimeMs - left.mtimeMs)
      .map((candidate) => candidate.path)
      .slice(0, 8);
    setTuiImageSuggestionSources();
  };

  return {
    refreshSuggestions: refreshTuiImageSuggestions,
    async run(input: string, commandName: 'image' | 'xcon-image', rest: string) {
      const stdout: string[] = [];
      const stderr: string[] = [];
      try {
        const tokens = commandName === 'image' ? tokenizeTuiCommandArgs(rest) : [];
        const subcommand = tokens[0]?.toLowerCase();
        if (commandName === 'image' && subcommand === 'info') {
          stdout.push(`recent: ${recentImageSources[0] ?? 'none'}`);
          stdout.push(
            captureImageSources.length > 0 ? `captures: ${captureImageSources.join(', ')}` : 'captures: none',
          );
          stdout.push('usage: /image <path-or-url> [--width=80%] [--height=auto] [--term-id id]');
          stdout.push('usage: /image recent [--width=80%] [--height=auto] [--term-id id]');
          stdout.push('usage: /image clear [--term-id id]');
          options.setCapturedCommandOutput(input, stdout, stderr);
          return;
        }
        if (commandName === 'image' && subcommand === 'clear') {
          const request: TuiTerminalImageRequest = {
            path: 'xd.terminals.ui.clearScreen',
            args: parseTuiImageOptions(tokens.slice(1), ['termId']),
            label: 'terminal',
          };
          const result = await createRemoteDeskBridgeFromEnv(options.env).callCapability(request.path, request.args, {
            approved: true,
          });
          const failure = options.bridgeCallFailed(result);
          if (failure) throw new Error(failure);
          stdout.push(`capability: ${request.path}`);
          stdout.push(JSON.stringify(result, null, 2));
          options.setCapturedCommandOutput(input, stdout, stderr);
          options.notify('Terminal screen clear requested.');
          return;
        }

        let requestRest = rest;
        if (commandName === 'image' && subcommand === 'recent') {
          const latestSource = recentImageSources[0];
          if (!latestSource) throw new Error('No recent image is available. Use /image <path-or-url> first.');
          requestRest = [
            options.quoteCommandArg(latestSource),
            ...tokens.slice(1).map((token) => options.quoteCommandArg(token)),
          ].join(' ');
        }

        const request = await options.createTerminalImageRequest(commandName, requestRest, options.cwd);
        const result = await createRemoteDeskBridgeFromEnv(options.env).callCapability(request.path, request.args, {
          approved: true,
        });
        const failure = options.bridgeCallFailed(result);
        if (failure) throw new Error(failure);
        stdout.push(`capability: ${request.path}`);
        stdout.push(`source: ${request.label}`);
        stdout.push(JSON.stringify(result, null, 2));
        options.setCapturedCommandOutput(input, stdout, stderr);
        if (commandName === 'image') rememberRecentImageSource(request.args.source);
        options.notify(commandName === 'image' ? 'Image sent to terminal.' : 'XCON image sent to terminal.');
      } catch (error) {
        stderr.push(`error: ${options.friendlyImageError(error)}`);
        options.setCapturedCommandOutput(input, stdout, stderr);
      }
    },
  };
}

function tokenizeTuiCommandArgs(value: string) {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else if (char === '\\' && value[index + 1] === quote) {
        current += quote;
        index += 1;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }
  if (quote) throw new Error('Unclosed quote in command.');
  if (current) tokens.push(current);
  return tokens;
}

function normalizeTuiImageOptionKey(value: string) {
  const key = value.replace(/^-+/, '').replace(/-([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase());
  if (key === 'term' || key === 'id' || key === 'termId') return 'termId';
  return key;
}

function parseTuiImageOptions(tokens: string[], allowedKeys: readonly string[]) {
  const options: Record<string, string> = {};
  const allowed = new Set(allowedKeys);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unknown extra argument: ${token}`);
    }
    const equalsIndex = token.indexOf('=');
    const rawKey = equalsIndex >= 0 ? token.slice(2, equalsIndex) : token.slice(2);
    const key = normalizeTuiImageOptionKey(rawKey);
    if (!allowed.has(key)) throw new Error(`Unknown image option: --${rawKey}`);
    let optionValue = '';
    if (equalsIndex >= 0) {
      optionValue = token.slice(equalsIndex + 1);
    } else if (tokens[index + 1] && !tokens[index + 1].startsWith('--')) {
      optionValue = tokens[index + 1];
      index += 1;
    }
    options[key] = optionValue;
  }
  return options;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}
