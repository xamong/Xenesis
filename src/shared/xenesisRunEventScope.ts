import type { XenesisRunEvent, XenesisRunRequest } from './types';

export const XENESIS_AGENT_RUN_SOURCE = 'xenesis-xenesis-agent';
export const XENESIS_AGENT_WORKBENCH_RUN_SOURCE = 'xenesis-agent-workbench';

export interface XenesisRunEventConsumeOptions {
  allowUnscoped?: boolean;
}

function normalizedText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function withXenesisRunEventScope(
  event: XenesisRunEvent,
  request: Pick<XenesisRunRequest, 'source' | 'sessionId'>,
  runId: string,
): XenesisRunEvent {
  const source = normalizedText(request.source);
  const sessionId = normalizedText(request.sessionId);
  return {
    ...event,
    runId: normalizedText(runId) || event.runId,
    source: source || event.source,
    sessionId: sessionId || event.sessionId,
  };
}

export function xenesisRunEventSource(event: XenesisRunEvent): string {
  return normalizedText(event.source);
}

export function shouldConsumeXenesisRunEvent(
  event: XenesisRunEvent,
  expectedSource: string,
  options: XenesisRunEventConsumeOptions = {},
): boolean {
  const source = xenesisRunEventSource(event);
  if (!source) return Boolean(options.allowUnscoped);
  return source === expectedSource;
}
