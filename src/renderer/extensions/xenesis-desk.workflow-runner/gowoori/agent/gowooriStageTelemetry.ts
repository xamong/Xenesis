import {
  RENDERER_OBSERVABILITY_EVENT,
  type RendererObservabilityOperationEvent,
} from '../../../../../shared/observabilityEvents';
import type { GowooriProvider, GowooriRequestMode } from './gowooriProviders';

export type GowooriGenerationStage = 'prompt' | 'provider' | 'generate' | 'preflight' | 'repair' | 'finalize' | 'apply';

export interface GowooriStageTelemetryContext {
  target?: EventTarget | null;
  stage: GowooriGenerationStage;
  provider: GowooriProvider | string;
  mode: GowooriRequestMode | string;
  prompt: string;
  semanticPrompt?: string;
  detail?: Record<string, unknown>;
}

export interface GowooriStageTelemetryToken {
  id: string;
  target: EventTarget | null;
}

let sequence = 0;

export function emitGowooriStageStart(context: GowooriStageTelemetryContext): GowooriStageTelemetryToken {
  const target = resolveTelemetryTarget(context.target);
  const id = createGowooriStageTelemetryId(context.stage);
  if (!target) return { id, target: null };

  const detail = createStageDetail(context);
  dispatchOperationEvent(target, {
    id,
    phase: 'start',
    activity: {
      source: 'gowoori',
      label: `gowoori.generation.${context.stage}`,
      detail: safeJson(detail),
    },
    network: {
      source: 'gowoori',
      method: 'POST',
      url: `gowoori://generation/${context.stage}`,
      requestBody: safeJson(detail),
    },
  });
  return { id, target };
}

export function emitGowooriStageComplete(
  token: GowooriStageTelemetryToken,
  result: { ok?: boolean; status?: number; statusText?: string; responseBody?: string; error?: string } = {},
): void {
  if (!token.target) return;
  dispatchOperationEvent(token.target, {
    id: token.id,
    phase: 'complete',
    ok: result.ok,
    status: result.status,
    statusText: result.statusText,
    responseBody: result.responseBody,
    error: result.error,
  });
}

export async function observeGowooriStage<T>(
  context: GowooriStageTelemetryContext,
  run: () => T | Promise<T>,
): Promise<T> {
  const token = emitGowooriStageStart(context);
  try {
    const result = await run();
    emitGowooriStageComplete(token, {
      ok: true,
      status: 200,
      statusText: 'OK',
      responseBody: safeJson(summarizeStageResult(result)),
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitGowooriStageComplete(token, {
      ok: false,
      status: 500,
      statusText: message,
      error: message,
    });
    throw error;
  }
}

function dispatchOperationEvent(target: EventTarget, detail: RendererObservabilityOperationEvent): void {
  target.dispatchEvent(new CustomEvent(RENDERER_OBSERVABILITY_EVENT, { detail }));
}

function resolveTelemetryTarget(target?: EventTarget | null): EventTarget | null {
  if (target && typeof target.dispatchEvent === 'function') return target;
  const candidate = globalThis as unknown as EventTarget | undefined;
  return candidate && typeof candidate.dispatchEvent === 'function' ? candidate : null;
}

function createGowooriStageTelemetryId(stage: GowooriGenerationStage): string {
  sequence += 1;
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${sequence.toString(36)}`;
  return `gowoori-stage-${stage}-${randomPart}`;
}

function createStageDetail(context: GowooriStageTelemetryContext): Record<string, unknown> {
  const prompt = String(context.prompt || '');
  const semanticPrompt = String(context.semanticPrompt || '');
  return {
    stage: context.stage,
    provider: context.provider,
    mode: context.mode,
    promptChars: prompt.length,
    promptPreview: previewText(prompt),
    semanticPromptChars: semanticPrompt ? semanticPrompt.length : undefined,
    semanticPromptPreview: semanticPrompt ? previewText(semanticPrompt) : undefined,
    ...context.detail,
  };
}

function summarizeStageResult(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    return {
      textChars: value.length,
      textPreview: previewText(value),
    };
  }
  if (!value || typeof value !== 'object') {
    return {
      valueType: typeof value,
    };
  }

  const record = value as Record<string, unknown>;
  const source = typeof record.source === 'string' ? record.source : '';
  const summary = typeof record.summary === 'string' ? record.summary : '';
  return {
    ok: typeof record.ok === 'boolean' ? record.ok : undefined,
    applied: typeof record.applied === 'boolean' ? record.applied : undefined,
    provider: typeof record.provider === 'string' ? record.provider : undefined,
    mode: typeof record.mode === 'string' ? record.mode : undefined,
    sourceLength: typeof record.sourceLength === 'number' ? record.sourceLength : source ? source.length : undefined,
    summaryChars: summary ? summary.length : undefined,
    summaryPreview: summary ? previewText(summary) : undefined,
  };
}

function previewText(value: string, limit = 160): string {
  const compact = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit)}...`;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => (entry === undefined ? undefined : entry));
}
