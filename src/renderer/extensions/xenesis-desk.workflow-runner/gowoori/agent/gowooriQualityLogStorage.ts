import {
  exportGowooriQualityLog,
  type GowooriQualityLogEntry,
  importGowooriQualityLog,
  mergeGowooriQualityLogs,
} from './gowooriQualityLog';

export interface GowooriQualityLogStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const GOWOORI_CHAT_QUALITY_LOG_STORAGE_KEY = 'xenesis-desk:gowoori-chat-quality-log';
export const GOWOORI_CHAT_QUALITY_LOG_LIMIT = 200;
export const GOWOORI_QUALITY_LOG_CHANGED_EVENT = 'gowoori-quality-log-changed';

export function loadGowooriQualityLogFromStorage(
  storage: GowooriQualityLogStorageLike | null = getGowooriQualityLogStorage(),
  limit = GOWOORI_CHAT_QUALITY_LOG_LIMIT,
): GowooriQualityLogEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(GOWOORI_CHAT_QUALITY_LOG_STORAGE_KEY);
    if (!raw) return [];
    return importGowooriQualityLog(raw).entries.slice(0, normalizeLimit(limit));
  } catch {
    return [];
  }
}

export function persistGowooriQualityLogToStorage(
  entries: GowooriQualityLogEntry[],
  storage: GowooriQualityLogStorageLike | null = getGowooriQualityLogStorage(),
): void {
  if (!storage) return;
  try {
    if (!entries.length) {
      storage.removeItem(GOWOORI_CHAT_QUALITY_LOG_STORAGE_KEY);
      return;
    }
    storage.setItem(GOWOORI_CHAT_QUALITY_LOG_STORAGE_KEY, exportGowooriQualityLog(entries));
  } catch {
    // Quality log persistence should never block provider tests or generation.
  }
}

export function appendGowooriQualityLogToStorage(
  entry: GowooriQualityLogEntry,
  storage: GowooriQualityLogStorageLike | null = getGowooriQualityLogStorage(),
  limit = GOWOORI_CHAT_QUALITY_LOG_LIMIT,
): GowooriQualityLogEntry[] {
  const current = loadGowooriQualityLogFromStorage(storage, limit);
  const next = mergeGowooriQualityLogs(current, [entry], normalizeLimit(limit));
  persistGowooriQualityLogToStorage(next, storage);
  return next;
}

export function notifyGowooriQualityLogChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(GOWOORI_QUALITY_LOG_CHANGED_EVENT));
}

function getGowooriQualityLogStorage(): GowooriQualityLogStorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeLimit(limit: number): number {
  return Math.max(1, Math.round(Number.isFinite(limit) ? limit : GOWOORI_CHAT_QUALITY_LOG_LIMIT));
}
