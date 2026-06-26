export const DEFAULT_META_API_URL = 'https://ai.xamong.com';

export type MetaRecord = Record<string, any>;

export interface MetaCodeQuery {
  PID?: string | number;
  PCODE?: string | number;
  CODE?: string | number;
  TYPE?: string | number;
  RID?: string | number;
  USE_YN?: string | number;
}

export interface MetaQueryResult {
  type?: string;
  rows?: MetaRecord[];
  rowCount?: number;
  changes?: number;
  message?: string;
  [key: string]: any;
}

export interface MetaImportSnapshotTarget {
  PID?: string | number;
  PCODE?: string | number;
}

export type MetaImportConflictPolicy = 'insert' | 'merge' | 'update';

export interface MetaImportSnapshotOptions {
  conflictPolicy?: MetaImportConflictPolicy;
}

export interface MetaImportSnapshotResult {
  dryRun?: boolean;
  conflictPolicy?: MetaImportConflictPolicy;
  inserted?: number;
  insertedTemplates?: number;
  insertedAttributes?: number;
  insertedInstances?: number;
  skippedAttributes?: number;
  reusedConflicts?: number;
  updatedConflicts?: number;
  changedRows?: number;
  changedFields?: number;
  conflicts?: MetaRecord[];
  uidMap?: Record<string, number>;
  warnings?: string[];
  [key: string]: any;
}

export interface MetaManagementProvider {
  health(signal?: AbortSignal): Promise<boolean>;
  loadTree(): Promise<MetaRecord[]>;
  listCodes(query?: MetaCodeQuery): Promise<MetaRecord[]>;
  listAttributes(): Promise<MetaRecord[]>;
  batchCodes(items: MetaRecord[]): Promise<unknown>;
  previewImportSnapshot(
    snapshot: MetaRecord,
    target?: MetaImportSnapshotTarget,
    options?: MetaImportSnapshotOptions,
  ): Promise<MetaImportSnapshotResult>;
  importSnapshot(
    snapshot: MetaRecord,
    target?: MetaImportSnapshotTarget,
    options?: MetaImportSnapshotOptions,
  ): Promise<MetaImportSnapshotResult>;
  createCode(payload: MetaRecord): Promise<MetaRecord>;
  updateCode(uid: string | number, payload: MetaRecord): Promise<MetaRecord>;
  runQuery(sql: string): Promise<MetaQueryResult>;
}

interface MetaApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

export function encodeMetaQueryParams(params: MetaCodeQuery = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function readMetaJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const json = (await response.json()) as MetaApiEnvelope<T>;
  if (json.success === false) throw new Error(json.error ?? 'API error');
  return json.data as T;
}

function makeMetaApiFetch(base: string) {
  const normalizedBase = base.replace(/\/+$/, '');
  return async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
    const response = await fetch(`${normalizedBase}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    return readMetaJson<T>(response);
  };
}

export function createHttpMetaManagementProvider(base: string): MetaManagementProvider {
  const apiFetch = makeMetaApiFetch(base || DEFAULT_META_API_URL);

  return {
    async health(signal?: AbortSignal): Promise<boolean> {
      const normalizedBase = (base || DEFAULT_META_API_URL).replace(/\/+$/, '');
      const response = await fetch(`${normalizedBase}/api/health`, { signal });
      return response.ok;
    },

    loadTree(): Promise<MetaRecord[]> {
      return apiFetch<MetaRecord[]>('/api/codes/tree');
    },

    listCodes(query?: MetaCodeQuery): Promise<MetaRecord[]> {
      return apiFetch<MetaRecord[]>(`/api/codes${encodeMetaQueryParams(query)}`);
    },

    listAttributes(): Promise<MetaRecord[]> {
      return apiFetch<MetaRecord[]>('/api/codes/attributes');
    },

    batchCodes(items: MetaRecord[]): Promise<unknown> {
      return apiFetch<unknown>('/api/codes/batch', {
        method: 'POST',
        body: JSON.stringify({ items }),
      });
    },

    previewImportSnapshot(
      snapshot: MetaRecord,
      target?: MetaImportSnapshotTarget,
      options?: MetaImportSnapshotOptions,
    ): Promise<MetaImportSnapshotResult> {
      return apiFetch<MetaImportSnapshotResult>('/api/codes/import-snapshot', {
        method: 'POST',
        body: JSON.stringify({ snapshot, target, dryRun: true, ...(options ?? {}) }),
      });
    },

    importSnapshot(
      snapshot: MetaRecord,
      target?: MetaImportSnapshotTarget,
      options?: MetaImportSnapshotOptions,
    ): Promise<MetaImportSnapshotResult> {
      return apiFetch<MetaImportSnapshotResult>('/api/codes/import-snapshot', {
        method: 'POST',
        body: JSON.stringify({ snapshot, target, ...(options ?? {}) }),
      });
    },

    createCode(payload: MetaRecord): Promise<MetaRecord> {
      return apiFetch<MetaRecord>('/api/codes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    updateCode(uid: string | number, payload: MetaRecord): Promise<MetaRecord> {
      return apiFetch<MetaRecord>(`/api/codes/${encodeURIComponent(String(uid))}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },

    runQuery(sql: string): Promise<MetaQueryResult> {
      return apiFetch<MetaQueryResult>('/api/database/query', {
        method: 'POST',
        body: JSON.stringify({ sql }),
      });
    },
  };
}
