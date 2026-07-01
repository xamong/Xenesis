import path from 'node:path';

export const LOCAL_SQLITE_DEFAULT_PORT = 3001;
export const HISTORICAL_REMOTE_META_API_URL = 'https://ai.xamong.com';

export interface LocalSqliteServerSettings {
  apiUrl?: string;
  devMode?: boolean;
  serverPort?: number;
}

export interface InternalServerLaunchOptions {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
}

export interface ResolveInternalServerLaunchOptionsParams {
  isPackaged: boolean;
  platform: NodeJS.Platform;
  electronExecPath: string;
  scriptPath: string;
  port: number;
  baseEnv?: Record<string, string | undefined>;
}

function normalizeServerPort(port: unknown): number {
  return Number.isInteger(port) && Number(port) >= 1024 && Number(port) <= 65535
    ? Number(port)
    : LOCAL_SQLITE_DEFAULT_PORT;
}

export function localSqliteApiUrl(port = LOCAL_SQLITE_DEFAULT_PORT): string {
  return `http://localhost:${normalizeServerPort(port)}`;
}

export function isHistoricalRemoteMetaApiUrl(value: unknown): boolean {
  return (
    String(value ?? '')
      .trim()
      .replace(/\/+$/, '') === HISTORICAL_REMOTE_META_API_URL
  );
}

export function isLocalSqliteApiUrl(value: unknown): boolean {
  const raw = String(value ?? '').trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function normalizeLocalSqliteServerSettings<T extends LocalSqliteServerSettings>(
  settings: T,
): T & Required<LocalSqliteServerSettings> {
  const serverPort = normalizeServerPort(settings.serverPort);
  const rawApiUrl = String(settings.apiUrl ?? '').trim();
  const apiUrl =
    !rawApiUrl || isHistoricalRemoteMetaApiUrl(rawApiUrl)
      ? localSqliteApiUrl(serverPort)
      : rawApiUrl.replace(/\/+$/, '');
  return {
    ...settings,
    apiUrl,
    devMode: Boolean(settings.devMode) || isLocalSqliteApiUrl(apiUrl),
    serverPort,
  };
}

export function shouldUseInternalSqliteServer(settings: LocalSqliteServerSettings): boolean {
  return Boolean(settings.devMode) || isLocalSqliteApiUrl(settings.apiUrl);
}

export function resolveInternalServerLaunchOptions({
  isPackaged,
  platform,
  electronExecPath,
  scriptPath,
  port,
  baseEnv = process.env,
}: ResolveInternalServerLaunchOptionsParams): InternalServerLaunchOptions {
  const env: Record<string, string | undefined> = { ...baseEnv, PORT: String(normalizeServerPort(port)) };
  const cwd = path.dirname(scriptPath);
  if (isPackaged) {
    env.ELECTRON_RUN_AS_NODE = '1';
    return { command: electronExecPath, args: [scriptPath], cwd, env };
  }

  delete env.ELECTRON_RUN_AS_NODE;
  return { command: platform === 'win32' ? 'node.exe' : 'node', args: [scriptPath], cwd, env };
}
