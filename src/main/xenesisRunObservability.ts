import type { RendererObservabilityOperationEvent } from '../shared/observabilityEvents';
import type { XenesisRunEvent } from '../shared/types';
import {
  type MainInstantObservationResult,
  type MainObservationDescriptor,
  summarizeMainObservabilityPayload,
} from './observabilityBridge';

export interface XenesisRunObservation {
  descriptor: MainObservationDescriptor;
  result: MainInstantObservationResult;
}

interface TaskWorkerRunEventData {
  type?: string;
  phase?: string;
  taskId?: string;
  sessionId?: string;
  status?: string;
  attempt?: number;
  maxAttempts?: number;
  task?: {
    id?: string;
    label?: string;
    source?: string;
    handoffId?: string;
    handoffTitle?: string;
    subagent?: string;
    parentSessionId?: string;
  };
  blockedBy?: string;
  blockedReason?: string;
  error?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function taskWorkerData(event: XenesisRunEvent): TaskWorkerRunEventData | null {
  if (event.event !== 'task_worker_event' && !(isRecord(event.data) && event.data.type === 'task_worker_event')) {
    return null;
  }
  if (!isRecord(event.data)) return null;
  return event.data as TaskWorkerRunEventData;
}

function taskWorkerPhase(data: TaskWorkerRunEventData): string {
  const phase = typeof data.phase === 'string' && data.phase.trim() ? data.phase.trim() : 'event';
  return phase.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
}

function taskWorkerOk(phase: string, data: TaskWorkerRunEventData): boolean {
  if (data.error) return false;
  return !['failed', 'blocked', 'cancelled'].includes(phase);
}

function taskWorkerSummary(data: TaskWorkerRunEventData): Record<string, unknown> {
  return {
    taskId: data.taskId ?? data.task?.id,
    sessionId: data.sessionId,
    label: data.task?.label,
    source: data.task?.source,
    status: data.status,
    attempt: data.attempt,
    maxAttempts: data.maxAttempts,
    handoffId: data.task?.handoffId,
    handoffTitle: data.task?.handoffTitle,
    subagent: data.task?.subagent,
    parentSessionId: data.task?.parentSessionId,
    blockedBy: data.blockedBy,
    blockedReason: data.blockedReason,
  };
}

export function createXenesisRunEventObservation(event: XenesisRunEvent): XenesisRunObservation {
  const taskEvent = taskWorkerData(event);
  if (taskEvent) {
    const phase = taskWorkerPhase(taskEvent);
    const ok = taskWorkerOk(phase, taskEvent);
    const summary = taskWorkerSummary(taskEvent);
    return {
      descriptor: {
        activity: {
          source: 'xenesis',
          label: `xenesis.worker.${phase}`,
          detail: summarizeMainObservabilityPayload(summary, 600),
        },
        network: {
          source: 'xenesis',
          method: 'POST',
          url: `xenesis://task-worker/${phase}`,
          requestBody: summarizeMainObservabilityPayload(summary, 1200),
        },
      },
      result: {
        ok,
        status: ok ? 200 : 500,
        statusText: ok ? 'OK' : 'Task worker error',
        responseBody: event.data,
        error: ok ? undefined : (taskEvent.error ?? summary),
      },
    };
  }

  return {
    descriptor: {
      activity: {
        source: 'agent',
        label: `xenesis.event.${event.event}`,
        detail: summarizeMainObservabilityPayload(event.data, 600),
      },
    },
    result: {
      ok: event.event !== 'gateway_error',
      status: event.event === 'gateway_error' ? 500 : 200,
      responseBody: event.data,
      error: event.event === 'gateway_error' ? event.data : undefined,
    },
  };
}

export function createXenesisRunObservabilityEvents(event: XenesisRunEvent): RendererObservabilityOperationEvent[] {
  const observation = createXenesisRunEventObservation(event);
  const id = `xenesis-run-event-${Date.now()}-${event.event}`;
  return [
    {
      id,
      phase: 'start',
      activity: observation.descriptor.activity,
      network: observation.descriptor.network,
    },
    {
      id,
      phase: 'complete',
      ok: observation.result.ok,
      status: observation.result.status,
      statusText: observation.result.statusText,
      responseBody: summarizeMainObservabilityPayload(observation.result.responseBody, 1200),
      error:
        observation.result.error === undefined
          ? undefined
          : summarizeMainObservabilityPayload(observation.result.error, 600),
    },
  ];
}
