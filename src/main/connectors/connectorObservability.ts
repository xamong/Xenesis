import type { RendererObservabilityOperationEvent } from '../../shared/observabilityEvents';
import { summarizeMainObservabilityPayload } from '../observabilityBridge';

export type ConnectorTelemetryProtocol = 'action' | 'http' | 'graphql' | 'grpc' | 'mqtt';

export interface ConnectorOperationDescriptor {
  connectorId: string;
  operation: string;
  protocol: ConnectorTelemetryProtocol;
  method?: string;
  url?: string;
  requestBody?: unknown;
}

export type ConnectorObservabilitySink = (event: RendererObservabilityOperationEvent) => void;

let connectorOperationSeq = 0;
let connectorObservabilitySink: ConnectorObservabilitySink | null = null;

function nextConnectorOperationId(): string {
  connectorOperationSeq += 1;
  return `connector-operation-${Date.now()}-${connectorOperationSeq}`;
}

function isSensitiveQueryKey(key: string): boolean {
  return /authorization|token|secret|password|api[-_ ]?key|apikey/i.test(key);
}

function sanitizeConnectorUrl(value: string): string {
  if (!value) return value;
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (isSensitiveQueryKey(key)) url.searchParams.set(key, 'redacted');
    }
    return url.toString();
  } catch {
    return value.replace(
      /([?&][^=]*(?:authorization|token|secret|password|api[-_ ]?key|apikey)[^=]*=)[^&]*/gi,
      '$1redacted',
    );
  }
}

function connectorOperationLabel(descriptor: ConnectorOperationDescriptor): string {
  return `connector.${descriptor.protocol}.${descriptor.connectorId}.${descriptor.operation}`;
}

function connectorOperationUrl(descriptor: ConnectorOperationDescriptor): string {
  return sanitizeConnectorUrl(descriptor.url ?? `connector://${descriptor.connectorId}/${descriptor.operation}`);
}

function emitConnectorObservability(event: RendererObservabilityOperationEvent): void {
  try {
    connectorObservabilitySink?.(event);
  } catch {
    // Observability must not affect connector execution.
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function setConnectorObservabilitySink(sink: ConnectorObservabilitySink | null): () => void {
  connectorObservabilitySink = sink;
  return () => {
    if (connectorObservabilitySink === sink) connectorObservabilitySink = null;
  };
}

export function clearConnectorObservabilitySink(): void {
  connectorObservabilitySink = null;
}

export async function observeConnectorOperation<T>(
  descriptor: ConnectorOperationDescriptor,
  operation: () => Promise<T>,
): Promise<T> {
  const id = nextConnectorOperationId();
  emitConnectorObservability({
    id,
    phase: 'start',
    activity: {
      source: 'connector',
      label: connectorOperationLabel(descriptor),
      detail: descriptor.url ? sanitizeConnectorUrl(descriptor.url) : undefined,
    },
    network: {
      source: 'connector',
      method: (descriptor.method ?? 'POST').toUpperCase(),
      url: connectorOperationUrl(descriptor),
      requestBody:
        descriptor.requestBody === undefined
          ? undefined
          : summarizeMainObservabilityPayload(descriptor.requestBody, 1200),
    },
  });

  try {
    const result = await operation();
    emitConnectorObservability({
      id,
      phase: 'complete',
      ok: true,
      status: 200,
      statusText: 'OK',
      responseBody: summarizeMainObservabilityPayload(result, 1200),
    });
    return result;
  } catch (error) {
    emitConnectorObservability({
      id,
      phase: 'complete',
      ok: false,
      status: 500,
      statusText: errorMessage(error),
      error: errorMessage(error),
    });
    throw error;
  }
}
