import { createHash } from 'node:crypto';
import type { DeskBridgeCapabilityNode } from './deskBridgeCapabilities';

export interface CrRegistrySnapshotOptions {
  capturedAt?: string;
  source?: string;
}

export interface CrCapabilityRecord {
  path: string;
  parentPath: string;
  segment: string;
  kind: string;
  label: string;
  description: string;
  permission: string;
  approval: string;
  readable: boolean;
  writable: boolean;
  callable: boolean;
  subscribable: boolean;
  hasSchema: boolean;
  schemaHash?: string;
  status: 'active' | 'removed';
}

export interface CrCapabilitySchemaRecord {
  schemaHash: string;
  schemaJson: string;
}

export interface CrRegistrySnapshotPayload {
  snapshotId: string;
  capturedAt: string;
  source: string;
  registryHash: string;
  nodeCount: number;
  callableCount: number;
  eventCount: number;
  schemaCount: number;
  capabilities: CrCapabilityRecord[];
  schemas: CrCapabilitySchemaRecord[];
  rawPayloadHash: string;
  rawPayloadJson: string;
}

export interface CrRunEventRecord {
  runId: string;
  seq: number;
  stepPath: string;
  stepLabel?: string;
  ok: boolean;
  skipped: boolean;
  error?: string;
  durationMs: number;
  resultHash?: string;
}

const SECRET_KEY_PATTERN = /token|secret|password|passphrase|apiKey|authorization|bridgeToken/i;

export function stableCrJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value)) ?? 'null';
}

export function hashCrPayload(value: unknown): string {
  return createHash('sha256').update(stableCrJson(value)).digest('hex');
}

export function hashCrText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function makeCrShortRid(prefix: string, value: string): string {
  const safePrefix =
    prefix
      .replace(/[^A-Z0-9_]/gi, '')
      .toUpperCase()
      .slice(0, 10) || 'CR';
  return `${safePrefix}_${hashCrText(value).slice(0, 20)}`;
}

export function redactCrValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactCrValue(item));
  if (!value || typeof value !== 'object') return value;

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redactCrValue(nested);
  }
  return output;
}

export function buildCrRegistrySnapshot(
  nodes: DeskBridgeCapabilityNode[],
  options: CrRegistrySnapshotOptions = {},
): CrRegistrySnapshotPayload {
  const capturedAt = options.capturedAt ?? new Date().toISOString();
  const source = options.source ?? 'desk';
  const capabilities = [...nodes].map(capabilityRecordFromNode).sort((a, b) => a.path.localeCompare(b.path));
  const schemaByHash = new Map<string, CrCapabilitySchemaRecord>();

  for (const node of nodes) {
    if (!node.schema) continue;
    const schemaJson = stableCrJson(node.schema);
    const schemaHash = hashCrText(schemaJson);
    schemaByHash.set(schemaHash, { schemaHash, schemaJson });
  }

  const rawPayloadJson = stableCrJson(capabilities);
  const rawPayloadHash = hashCrText(rawPayloadJson);
  const registryHash = hashCrPayload({ capabilities });

  return {
    snapshotId: `crsnap_${registryHash.slice(0, 24)}`,
    capturedAt,
    source,
    registryHash,
    nodeCount: capabilities.length,
    callableCount: capabilities.filter((item) => item.callable).length,
    eventCount: capabilities.filter((item) => item.kind === 'event').length,
    schemaCount: schemaByHash.size,
    capabilities,
    schemas: [...schemaByHash.values()].sort((a, b) => a.schemaHash.localeCompare(b.schemaHash)),
    rawPayloadHash,
    rawPayloadJson,
  };
}

export function extractCrWorkflowRunEvents(runId: string, result: unknown): CrRunEventRecord[] {
  const root = result && typeof result === 'object' ? (result as { results?: unknown }) : {};
  const results = Array.isArray(root.results) ? root.results : [];
  return results
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => ({
      runId,
      seq: Number.isFinite(Number(item.index)) ? Number(item.index) : index,
      stepPath: typeof item.path === 'string' ? item.path : '',
      stepLabel: typeof item.label === 'string' ? item.label : undefined,
      ok: item.ok === true,
      skipped: item.skipped === true,
      error: typeof item.error === 'string' ? item.error : undefined,
      durationMs: Number.isFinite(Number(item.durationMs)) ? Number(item.durationMs) : 0,
      resultHash: item.result === undefined ? undefined : hashCrPayload(redactCrValue(item.result)),
    }));
}

function capabilityRecordFromNode(node: DeskBridgeCapabilityNode): CrCapabilityRecord {
  const parentPath = parentCapabilityPath(node.path);
  const schemaHash = node.schema ? hashCrText(stableCrJson(node.schema)) : undefined;
  return {
    path: node.path,
    parentPath,
    segment: node.path.split('.').filter(Boolean).at(-1) ?? node.path,
    kind: node.kind,
    label: node.label,
    description: node.description,
    permission: node.permission,
    approval: node.approval,
    readable: node.readable === true,
    writable: node.writable === true,
    callable: node.callable === true,
    subscribable: node.subscribable === true,
    hasSchema: Boolean(node.schema),
    ...(schemaHash ? { schemaHash } : {}),
    status: 'active',
  };
}

function parentCapabilityPath(path: string): string {
  const segments = path.split('.').filter(Boolean);
  if (segments.length <= 1) return '';
  return segments.slice(0, -1).join('.');
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortJsonValue(nested)]),
  );
}
