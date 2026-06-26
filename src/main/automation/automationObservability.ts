import type { AutomationEvent, AutomationRelaySource } from '../../shared/types';
import {
  type MainInstantObservationResult,
  type MainObservationDescriptor,
  summarizeMainObservabilityPayload,
} from '../observabilityBridge';

export interface AutomationSemanticObservation {
  descriptor: MainObservationDescriptor;
  result: MainInstantObservationResult;
}

function semanticText(event: AutomationEvent): string | undefined {
  return event.relayText ?? event.streamText ?? event.input ?? event.suggestedInput;
}

function semanticSource(event: AutomationEvent): AutomationRelaySource | 'pending' | 'manual' | 'system' {
  if (event.relaySource) return event.relaySource;
  if (event.kind === 'pending') return 'pending';
  if (event.kind === 'manual_sent' || event.kind === 'auto_input') return 'manual';
  return 'system';
}

function semanticLabelSource(source: string): string {
  return source.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
}

function semanticSummary(event: AutomationEvent): Record<string, unknown> {
  return {
    termId: event.termId,
    kind: event.kind,
    relay: event.relay,
    relaySource: event.relaySource,
    relayReason: event.relayReason,
    relayFilterProfile: event.relayFilterProfile,
    source: event.source,
    rule: event.rule,
    state: event.state,
    text: semanticText(event),
    reason: event.reason,
  };
}

export function createAutomationSemanticObservation(event: AutomationEvent): AutomationSemanticObservation | null {
  const shouldObserve =
    event.kind === 'stream' ||
    event.kind === 'user_input' ||
    event.kind === 'auto_input' ||
    event.kind === 'pending' ||
    event.kind === 'manual_sent';
  if (!shouldObserve) return null;

  const source = semanticLabelSource(semanticSource(event));
  const summary = semanticSummary(event);
  const detail = summarizeMainObservabilityPayload(summary, 600);
  return {
    descriptor: {
      activity: {
        source: 'terminal',
        label: `terminal.output.semantic.${source}`,
        detail,
      },
      network: {
        source: 'terminal',
        method: 'POST',
        url: `terminal://automation/${encodeURIComponent(event.termId)}/${event.kind}/${source}`,
        requestBody: summarizeMainObservabilityPayload(summary, 1200),
      },
    },
    result: {
      ok: true,
      status: 200,
      statusText: event.relay === 'block' ? 'Blocked from external relay' : 'OK',
      responseBody: summary,
    },
  };
}
