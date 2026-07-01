import fs from 'node:fs';
import path from 'node:path';

import type { AgentSession, AgentSessionDiagnostic } from '../../shared/agentSessions';

export const AGENT_SESSION_CACHE_VERSION = 1;
export const AGENT_SESSION_OVERLAY_VERSION = 1;

export interface AgentSessionCacheFile {
  version: number;
  savedAt: string;
  sessions: AgentSession[];
  diagnostics: AgentSessionDiagnostic[];
}

export interface AgentSessionOverlayFile {
  version: number;
  pinned: string[];
  hidden: string[];
  links: Record<string, { termId: string; linkedAt: string }>;
}

function defaultCache(): AgentSessionCacheFile {
  return { version: AGENT_SESSION_CACHE_VERSION, savedAt: '', sessions: [], diagnostics: [] };
}

function defaultOverlay(): AgentSessionOverlayFile {
  return { version: AGENT_SESSION_OVERLAY_VERSION, pinned: [], hidden: [], links: {} };
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function createAgentSessionIndexStore(xenisHomeDir: string) {
  const root = path.join(xenisHomeDir, 'agent-sessions');
  const cachePath = path.join(root, 'cache.json');
  const overlayPath = path.join(root, 'overlay.json');
  return {
    cachePath,
    overlayPath,
    async loadCache(): Promise<AgentSessionCacheFile> {
      const cache = await readJsonFile<AgentSessionCacheFile>(cachePath, defaultCache());
      return cache.version === AGENT_SESSION_CACHE_VERSION ? cache : defaultCache();
    },
    async saveCache(cache: AgentSessionCacheFile): Promise<void> {
      await writeJsonFile(cachePath, { ...cache, version: AGENT_SESSION_CACHE_VERSION });
    },
    async loadOverlay(): Promise<AgentSessionOverlayFile> {
      const overlay = await readJsonFile<AgentSessionOverlayFile>(overlayPath, defaultOverlay());
      return overlay.version === AGENT_SESSION_OVERLAY_VERSION ? overlay : defaultOverlay();
    },
    async saveOverlay(overlay: AgentSessionOverlayFile): Promise<void> {
      await writeJsonFile(overlayPath, { ...overlay, version: AGENT_SESSION_OVERLAY_VERSION });
    },
  };
}
