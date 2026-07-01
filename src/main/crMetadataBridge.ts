import {
  buildCrRegistrySnapshot,
  extractCrWorkflowRunEvents,
  hashCrPayload,
  redactCrValue,
} from '../shared/crMetadata';
import type {
  DeskBridgeCapabilityAuditRecord,
  DeskBridgeCapabilityCallResult,
  DeskBridgeCapabilityNode,
} from '../shared/deskBridgeCapabilities';

export interface CrMetadataBridgeOptions {
  getApiUrl: () => string;
  listCapabilities: () => DeskBridgeCapabilityNode[];
  fetchImpl?: typeof fetch;
}

export interface CrMetadataBridge {
  sync(args?: unknown): Promise<unknown>;
  listCapabilities(args?: unknown): Promise<unknown>;
  listSnapshots(args?: unknown): Promise<unknown>;
  listRuns(args?: unknown): Promise<unknown>;
  recordRunFromAudit(record: DeskBridgeCapabilityAuditRecord, result: DeskBridgeCapabilityCallResult): Promise<void>;
}

export function createCrMetadataBridge(options: CrMetadataBridgeOptions): CrMetadataBridge {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  async function apiFetch(apiPath: string, body?: unknown): Promise<unknown> {
    const base = options.getApiUrl().replace(/\/+$/, '');
    const response = await fetchImpl(`${base}${apiPath}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const json = (await response.json()) as { success?: boolean; data?: unknown; error?: string };
    if (!response.ok || json.success === false) {
      throw new Error(json.error ?? `CR metadata API failed: HTTP ${response.status}`);
    }
    return json.data;
  }

  return {
    sync(args?: unknown): Promise<unknown> {
      const payload = buildCrRegistrySnapshot(options.listCapabilities(), {
        source: readReasonSource(args),
      });
      return apiFetch('/api/cr/sync', payload);
    },
    listCapabilities(args?: unknown): Promise<unknown> {
      return apiFetch(`/api/cr/capabilities${queryString(args)}`);
    },
    listSnapshots(args?: unknown): Promise<unknown> {
      return apiFetch(`/api/cr/snapshots${queryString(args)}`);
    },
    listRuns(args?: unknown): Promise<unknown> {
      return apiFetch(`/api/cr/runs${queryString(args)}`);
    },
    async recordRunFromAudit(
      record: DeskBridgeCapabilityAuditRecord,
      result: DeskBridgeCapabilityCallResult,
    ): Promise<void> {
      try {
        const runId = `crrun_${hashCrPayload({
          timestamp: record.timestamp,
          path: record.path,
          source: record.source,
          durationMs: record.durationMs,
        }).slice(0, 24)}`;
        const redactedArgs = redactCrValue(record.args);
        const redactedResult = redactCrValue(result.result);
        await apiFetch('/api/cr/runs', {
          runId,
          path: record.path,
          source: record.source,
          sourceAgent: record.sourceAgent,
          channel: record.channel,
          userId: record.userId,
          permission: record.permission,
          approval: record.approval,
          approved: record.approved,
          approvalRequired: record.approvalRequired === true,
          args: redactedArgs,
          result: redactedResult,
          ok: result.ok,
          error: result.error ?? record.error,
          startedAt: record.timestamp,
          durationMs: record.durationMs,
          events: record.path === 'xd.automation.workflow.run' ? extractCrWorkflowRunEvents(runId, result.result) : [],
        });
      } catch {
        // CR metadata capture is best effort and must not affect CR execution.
      }
    },
  };
}

function queryString(args: unknown): string {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

function readReasonSource(args: unknown): string {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return 'desk';
  const reason = (args as { reason?: unknown }).reason;
  return typeof reason === 'string' && reason.trim() ? `desk:${reason.trim().slice(0, 80)}` : 'desk';
}
