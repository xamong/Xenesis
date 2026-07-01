export const DEFAULT_META_API_URL = 'https://ai.xamong.com';

export type MetaRecord = Record<string, any>;

export interface MetaCodeQuery {
  [key: string]: string | number | boolean | undefined;
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

export interface MetaValidationIssue {
  severity?: 'error' | 'warning';
  code: string;
  message: string;
  index: number;
  uid?: string | number | null;
  key?: string;
}

export interface MetaValidationResult {
  runId: string;
  scope: string;
  target: MetaRecord | null;
  status: 'ok' | 'warning' | 'error';
  errorCount: number;
  warningCount: number;
  errors: MetaValidationIssue[];
  warnings: MetaValidationIssue[];
}

export interface MetaSummary {
  dbPath: string;
  totalRows: number;
  templateRows: number;
  dataRows: number;
  crCapabilities: number;
  recentFailedCrRuns: number;
  lastSaveAt: string | null;
  lastValidationStatus: string | null;
  lastValidationAt: string | null;
}

export interface MetaActivityItem {
  kind: 'meta' | 'cr';
  id: string;
  action?: string;
  source?: string;
  title?: string;
  summary?: string;
  ok: 0 | 1 | boolean;
  error?: string | null;
  createdAt: string;
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
  listCrCapabilities(query?: MetaRecord): Promise<MetaRecord[]>;
  listCrSnapshots(query?: MetaRecord): Promise<MetaRecord[]>;
  listCrRuns(query?: MetaRecord): Promise<MetaRecord[]>;
  listAttributes(): Promise<MetaRecord[]>;
  validateMeta(payload: MetaRecord): Promise<MetaValidationResult>;
  loadMetaSummary(): Promise<MetaSummary>;
  listMetaActivity(query?: MetaRecord): Promise<MetaActivityItem[]>;
  batchCodes(
    items: MetaRecord[],
    options?: { allowWarnings?: boolean; requireWarningConfirmation?: boolean; target?: MetaRecord | null },
  ): Promise<unknown>;
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

export class MetaApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'MetaApiError';
    this.status = status;
    this.data = data;
  }
}

export function encodeMetaQueryParams(
  params: Record<string, string | number | boolean | undefined | null> = {},
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function readMetaJson<T>(response: Response): Promise<T> {
  let json: MetaApiEnvelope<T>;
  try {
    json = (await response.json()) as MetaApiEnvelope<T>;
  } catch (error) {
    if (!response.ok) throw new MetaApiError(`HTTP ${response.status}`, response.status);
    throw error;
  }

  if (!response.ok || json.success === false) {
    throw new MetaApiError(json.error ?? `HTTP ${response.status}`, response.status, json.data);
  }

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

    listCrCapabilities(query?: MetaRecord): Promise<MetaRecord[]> {
      return apiFetch<MetaRecord[]>(`/api/cr/capabilities${encodeMetaQueryParams(query ?? {})}`);
    },

    listCrSnapshots(query?: MetaRecord): Promise<MetaRecord[]> {
      return apiFetch<MetaRecord[]>(`/api/cr/snapshots${encodeMetaQueryParams(query ?? {})}`);
    },

    listCrRuns(query?: MetaRecord): Promise<MetaRecord[]> {
      return apiFetch<MetaRecord[]>(`/api/cr/runs${encodeMetaQueryParams(query ?? {})}`);
    },

    listAttributes(): Promise<MetaRecord[]> {
      return apiFetch<MetaRecord[]>('/api/codes/attributes');
    },

    validateMeta(payload: MetaRecord): Promise<MetaValidationResult> {
      return apiFetch<MetaValidationResult>('/api/meta/validate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    loadMetaSummary(): Promise<MetaSummary> {
      return apiFetch<MetaSummary>('/api/meta/summary');
    },

    listMetaActivity(query?: MetaRecord): Promise<MetaActivityItem[]> {
      return apiFetch<MetaActivityItem[]>(`/api/meta/activity${encodeMetaQueryParams(query ?? {})}`);
    },

    batchCodes(
      items: MetaRecord[],
      options?: { allowWarnings?: boolean; requireWarningConfirmation?: boolean; target?: MetaRecord | null },
    ): Promise<unknown> {
      return apiFetch<unknown>('/api/codes/batch', {
        method: 'POST',
        body: JSON.stringify({
          items,
          allowWarnings: options?.allowWarnings === true,
          requireWarningConfirmation: options?.requireWarningConfirmation === true,
          target: options?.target ?? null,
        }),
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
        body: JSON.stringify({ sql, readOnly: true }),
      });
    },
  };
}
