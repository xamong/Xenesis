/**
 * MCP bridge state file watcher.
 *
 * Monitors bridge.json for token changes and triggers reconnection.
 * Solves the problem where MCP server connects to release bridge
 * even when XENIS_HOME points to dev.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface BridgeState {
  bridgeUrl: string;
  bridgeToken: string;
  serverPath: string;
  updatedAt?: string;
}

export interface BridgeWatcher {
  start(): void;
  stop(): void;
  isWatching(): boolean;
  getCurrentState(): BridgeState | null;
  onReconnect: ((newState: BridgeState, oldState: BridgeState | null) => void) | null;
}

export function createBridgeWatcher(stateFilePath: string, pollIntervalMs = 5000): BridgeWatcher {
  let currentState: BridgeState | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let watching = false;

  function readState(): BridgeState | null {
    try {
      const content = fs.readFileSync(stateFilePath, 'utf-8');
      return JSON.parse(content) as BridgeState;
    } catch {
      return null;
    }
  }

  function check(watcher: BridgeWatcher): void {
    const newState = readState();
    if (!newState) return;

    if (!currentState) {
      currentState = newState;
      return;
    }

    if (newState.bridgeToken !== currentState.bridgeToken || newState.bridgeUrl !== currentState.bridgeUrl) {
      const oldState = currentState;
      currentState = newState;
      watcher.onReconnect?.(newState, oldState);
    }
  }

  const watcher: BridgeWatcher = {
    onReconnect: null,

    start(): void {
      if (watching) return;
      currentState = readState();
      timer = setInterval(() => check(watcher), pollIntervalMs);
      watching = true;
    },

    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      watching = false;
    },

    isWatching(): boolean {
      return watching;
    },

    getCurrentState(): BridgeState | null {
      return currentState ? { ...currentState } : null;
    },
  };

  return watcher;
}

export function resolveBridgeStateFilePath(): string {
  const home = process.env.XENIS_HOME || process.env.XENIS_MCP_STATE_FILE || '';

  if (home && home.endsWith('.json')) return home;
  if (home) return path.join(home, 'mcp', 'bridge.json');

  const userHome = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(userHome, '.xenis', 'mcp', 'bridge.json');
}
