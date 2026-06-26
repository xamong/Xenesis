import type { AppSettings, OpenFileResult, RemoteFileProfile } from '../../shared/types';
import {
  type ArtifactCompareResult,
  type BotArtifactCard,
  buildArtifactCompareText,
} from '../extensions/xenesis-desk.core-tools/deskIntelligence';
import {
  addExplorerContextItem,
  type ExplorerContextItem,
  getExplorerCompareSelection,
  getExplorerContextItems,
} from './explorerContextStore';

export const EXPLORER_COMPARE_HISTORY_STORAGE_KEY = 'xenesis-explorer-compare-history';
export const EXPLORER_COMPARE_HISTORY_CHANGED_EVENT = 'xenesis-explorer-compare-history-changed';
const EXPLORER_COMPARE_HISTORY_LIMIT = 10;
const EXPLORER_COMPARE_PINNED_LIMIT = 10;

export type ExplorerCompareErrorCode = 'missing-pair' | 'non-text' | 'missing-profile' | 'read-failed';

export class ExplorerCompareError extends Error {
  code: ExplorerCompareErrorCode;
  item?: ExplorerContextItem;

  constructor(code: ExplorerCompareErrorCode, message: string, item?: ExplorerContextItem) {
    super(message);
    this.name = 'ExplorerCompareError';
    this.code = code;
    this.item = item;
  }
}

export interface ExplorerComparePair {
  local: ExplorerContextItem;
  remote: ExplorerContextItem;
}

export interface ExplorerCompareResult {
  pair: ExplorerComparePair;
  result: ArtifactCompareResult;
}

export interface ExplorerCompareHistoryItem {
  id: string;
  pair: ExplorerComparePair;
  summary: string;
  equal: boolean;
  comparedAt: string;
  label?: string;
  pinned?: boolean;
}

function isTextOpenFileResult(result: OpenFileResult | null): result is OpenFileResult {
  return Boolean(result && ['markdown', 'mermaid', 'code'].includes(result.contentType));
}

function remoteProfiles(settings: AppSettings | null): RemoteFileProfile[] {
  return settings?.remoteFiles?.profiles ?? [];
}

function cleanText(value: unknown, maxLength = 2000): string {
  return String(value ?? '')
    .trim()
    .slice(0, maxLength);
}

function explorerItemToArtifactCard(item: ExplorerContextItem, typeLabel: string): BotArtifactCard {
  return {
    id: item.id,
    sessionId: 'explorer-context',
    messageId: item.source,
    createdAt: item.addedAt,
    label: item.name,
    kindGroup: 'other',
    typeLabel,
    searchText: `${item.name} ${item.path} ${item.source}`.toLowerCase(),
    title: item.name,
    kind: 'explorer-context',
    filePath: item.path,
  };
}

function uniqueItems(items: Array<ExplorerContextItem | undefined>): ExplorerContextItem[] {
  const result: ExplorerContextItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item) continue;
    const key = `${item.source}:${item.path}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function sanitizeHistoryExplorerItem(value: unknown): ExplorerContextItem | null {
  const input = value as Partial<ExplorerContextItem> | null;
  if (!input || typeof input !== 'object') return null;
  const source = input.source === 'remote' ? 'remote' : input.source === 'local' ? 'local' : null;
  const path = cleanText(input.path);
  if (!source || !path) return null;
  const kind = input.kind === 'folder' ? 'folder' : 'file';
  const item: ExplorerContextItem = {
    id: cleanText(input.id, 500) || `${source}:${path}`,
    source,
    kind,
    name: cleanText(input.name, 500) || path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || path,
    path,
    ext: cleanText(input.ext, 100),
    addedAt: cleanText(input.addedAt, 100) || new Date().toISOString(),
  };
  if (source === 'remote' && input.profile?.id) {
    item.profile = {
      id: cleanText(input.profile.id),
      name: cleanText(input.profile.name || input.profile.host),
      protocol: cleanText(input.profile.protocol),
      host: cleanText(input.profile.host),
      encoding: cleanText(input.profile.encoding),
    };
  }
  return item;
}

function comparePairKey(pair: ExplorerComparePair): string {
  return [pair.local.path, pair.remote.profile?.id || '', pair.remote.path]
    .map((part) => cleanText(part).toLowerCase())
    .join('::');
}

function compareHistoryItemsByDisplayOrder(a: ExplorerCompareHistoryItem, b: ExplorerCompareHistoryItem): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return b.comparedAt.localeCompare(a.comparedAt);
}

function sanitizeHistoryItem(value: unknown): ExplorerCompareHistoryItem | null {
  const input = value as Partial<ExplorerCompareHistoryItem> | null;
  if (!input || typeof input !== 'object') return null;
  const local = sanitizeHistoryExplorerItem(input.pair?.local);
  const remote = sanitizeHistoryExplorerItem(input.pair?.remote);
  if (!local || !remote || local.source !== 'local' || remote.source !== 'remote' || !remote.profile?.id) return null;
  const pair = { local, remote };
  return {
    id: cleanText(input.id, 500) || comparePairKey(pair),
    pair,
    summary: cleanText(input.summary, 500),
    equal: input.equal === true,
    comparedAt: cleanText(input.comparedAt, 100) || new Date().toISOString(),
    label: cleanText(input.label, 300),
    pinned: input.pinned === true,
  };
}

function normalizeExplorerCompareHistoryItems(items: ExplorerCompareHistoryItem[]): ExplorerCompareHistoryItem[] {
  const deduped: ExplorerCompareHistoryItem[] = [];
  const seen = new Set<string>();
  for (const rawItem of items) {
    const item = sanitizeHistoryItem(rawItem);
    if (!item) continue;
    const key = comparePairKey(item.pair);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  const sorted = deduped.sort(compareHistoryItemsByDisplayOrder);
  const pinned = sorted.filter((item) => item.pinned).slice(0, EXPLORER_COMPARE_PINNED_LIMIT);
  const recent = sorted.filter((item) => !item.pinned).slice(0, EXPLORER_COMPARE_HISTORY_LIMIT);
  return [...pinned, ...recent];
}

function writeExplorerCompareHistory(items: ExplorerCompareHistoryItem[]): ExplorerCompareHistoryItem[] {
  const next = normalizeExplorerCompareHistoryItems(items);
  try {
    window.localStorage.setItem(EXPLORER_COMPARE_HISTORY_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EXPLORER_COMPARE_HISTORY_CHANGED_EVENT, { detail: next }));
  } catch {
    // localStorage can be unavailable in restricted webviews.
  }
  return next;
}

export function getExplorerCompareHistory(): ExplorerCompareHistoryItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(EXPLORER_COMPARE_HISTORY_STORAGE_KEY) || '[]') as unknown[];
    const result: ExplorerCompareHistoryItem[] = [];
    const seen = new Set<string>();
    for (const raw of Array.isArray(parsed) ? parsed : []) {
      const item = sanitizeHistoryItem(raw);
      if (!item) continue;
      const key = comparePairKey(item.pair);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
    return normalizeExplorerCompareHistoryItems(result);
  } catch {
    return [];
  }
}

export function addExplorerCompareHistory(
  pair: ExplorerComparePair,
  result: ArtifactCompareResult,
): ExplorerCompareHistoryItem[] {
  const now = new Date().toISOString();
  const key = comparePairKey(pair);
  const existing = getExplorerCompareHistory().find((entry) => comparePairKey(entry.pair) === key);
  const item: ExplorerCompareHistoryItem = {
    id: existing?.id || `compare-${Date.now()}-${Math.abs(key.length)}`,
    pair,
    summary: result.summary,
    equal: result.equal,
    comparedAt: now,
    label: existing?.label,
    pinned: existing?.pinned,
  };
  return writeExplorerCompareHistory([
    item,
    ...getExplorerCompareHistory().filter((entry) => comparePairKey(entry.pair) !== key),
  ]);
}

export function clearExplorerCompareHistory(): ExplorerCompareHistoryItem[] {
  return writeExplorerCompareHistory([]);
}

export function updateExplorerCompareHistoryItem(
  id: string,
  patch: Pick<Partial<ExplorerCompareHistoryItem>, 'label' | 'pinned'>,
): ExplorerCompareHistoryItem[] {
  const cleanId = cleanText(id, 500);
  const next = getExplorerCompareHistory().map((item) => {
    if (item.id !== cleanId) return item;
    return {
      ...item,
      label: patch.label === undefined ? item.label : cleanText(patch.label, 300),
      pinned: patch.pinned === undefined ? item.pinned : patch.pinned === true,
    };
  });
  return writeExplorerCompareHistory(next);
}

function findComparePair(currentItem: ExplorerContextItem): ExplorerComparePair | null {
  const selections = getExplorerCompareSelection();
  const contextItems = getExplorerContextItems();
  const candidates = uniqueItems([currentItem, selections.local, selections.remote, ...contextItems]).filter(
    (item) => item.kind === 'file',
  );

  const local =
    currentItem.source === 'local' ? currentItem : (candidates.find((item) => item.source === 'local') ?? null);
  const remote =
    currentItem.source === 'remote'
      ? currentItem
      : (candidates.find((item) => item.source === 'remote' && item.profile?.id) ?? null);

  return local && remote ? { local, remote } : null;
}

function fullRemoteProfile(item: ExplorerContextItem, settings: AppSettings | null): RemoteFileProfile | null {
  if (item.source !== 'remote' || !item.profile?.id) return null;
  return remoteProfiles(settings).find((profile) => profile.id === item.profile?.id) ?? null;
}

export async function resolveExplorerCompareRemoteProfile(pair: ExplorerComparePair): Promise<RemoteFileProfile> {
  const settings = await window.terminalAPI.getSettings();
  const profile = fullRemoteProfile(pair.remote, settings);
  if (!profile) {
    throw new ExplorerCompareError('missing-profile', 'Remote profile is missing.', pair.remote);
  }
  return profile;
}

async function readExplorerText(item: ExplorerContextItem, settings: AppSettings | null): Promise<string> {
  const result =
    item.source === 'remote'
      ? await (async () => {
          const profile = fullRemoteProfile(item, settings);
          if (!profile) throw new ExplorerCompareError('missing-profile', 'Remote profile is missing.', item);
          return window.remoteFileAPI.readFile(profile, item.path);
        })()
      : await window.fileAPI.readFile(item.path);

  if (!result) throw new ExplorerCompareError('read-failed', 'File could not be read.', item);
  if (!isTextOpenFileResult(result))
    throw new ExplorerCompareError('non-text', 'Only text files can be compared.', item);
  return result.content;
}

export async function compareExplorerItemWithLatestOpposite(
  currentItem: ExplorerContextItem,
): Promise<ExplorerCompareResult> {
  addExplorerContextItem(currentItem);
  const pair = findComparePair(currentItem);
  if (!pair) {
    throw new ExplorerCompareError('missing-pair', 'Compare needs one local file and one FTP file.');
  }

  return compareExplorerPair(pair);
}

export async function compareExplorerPair(pair: ExplorerComparePair): Promise<ExplorerCompareResult> {
  const settings = await window.terminalAPI.getSettings();
  const [localText, remoteText] = await Promise.all([
    readExplorerText(pair.local, settings),
    readExplorerText(pair.remote, settings),
  ]);
  const result = buildArtifactCompareText(
    explorerItemToArtifactCard(pair.local, 'Local explorer file'),
    localText,
    explorerItemToArtifactCard(pair.remote, 'Remote explorer file'),
    remoteText,
  );
  addExplorerCompareHistory(pair, result);
  return {
    pair,
    result,
  };
}

export function formatExplorerCompareError(
  error: unknown,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (error instanceof ExplorerCompareError) {
    const name = error.item?.name || '-';
    switch (error.code) {
      case 'missing-pair':
        return t('explorerCompare.needsPair');
      case 'non-text':
        return t('explorerCompare.nonText', { name });
      case 'missing-profile':
        return t('explorerCompare.missingProfile', { name });
      case 'read-failed':
        return t('explorerCompare.readFailed', { name });
      default:
        return error.message;
    }
  }
  return error instanceof Error ? error.message : String(error);
}
