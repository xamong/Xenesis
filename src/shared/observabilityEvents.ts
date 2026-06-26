export const RENDERER_OBSERVABILITY_EVENT = 'xenesis-desk:observability-operation';
export const MAIN_OBSERVABILITY_IPC_CHANNEL = 'observability:operation';

export type RendererObservabilityPhase = 'start' | 'complete';

export interface RendererObservabilityActivityPayload {
  source: string;
  label: string;
  detail?: string;
}

export interface RendererObservabilityNetworkPayload {
  source: string;
  method: string;
  url: string;
  requestBody?: string;
}

export interface RendererObservabilityOperationEvent {
  id: string;
  phase: RendererObservabilityPhase;
  activity?: RendererObservabilityActivityPayload;
  network?: RendererObservabilityNetworkPayload;
  ok?: boolean;
  status?: number;
  statusText?: string;
  responseBody?: string;
  error?: string;
}

export function isRendererObservabilityOperationEvent(value: unknown): value is RendererObservabilityOperationEvent {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && (record.phase === 'start' || record.phase === 'complete');
}
