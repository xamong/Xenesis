import type { AgentRunEvent } from '../core/events.js';
import type { gatewayOpenApiSpec } from './openapi.js';
import type { GatewayWorkflowStepRun, GatewayWorkflowSummary } from './workflows.js';

export type GatewayFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type GatewayReportKind = 'smoke' | 'scenario' | 'connect' | 'provider-live';
export type GatewayOpenApiSpec = typeof gatewayOpenApiSpec;

export interface XenesisGatewayClientOptions {
  baseUrl: string;
  token?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  retryStatuses?: number[];
  fetch?: GatewayFetch;
  onRequest?: GatewayClientRequestObserver;
  onResponse?: GatewayClientResponseObserver;
  onRetry?: GatewayClientRetryObserver;
  onError?: GatewayClientErrorObserver;
  observabilityEndpoint?: boolean | string;
  observabilityContext?: GatewayClientObservabilityContext;
}

export type GatewayClientRequestObserver = (event: GatewayClientRequestEvent) => void;
export type GatewayClientResponseObserver = (event: GatewayClientResponseEvent) => void;
export type GatewayClientRetryObserver = (event: GatewayClientRetryEvent) => void;
export type GatewayClientErrorObserver = (event: GatewayClientErrorEvent) => void;

export interface GatewayClientRequestEvent {
  method: 'GET' | 'POST';
  path: string;
  url: string;
  attempt: number;
  traceId: string;
  runId?: string;
  taskId?: string;
}

export interface GatewayClientResponseEvent extends GatewayClientRequestEvent {
  status: number;
  ok: boolean;
  durationMs: number;
}

export interface GatewayClientRetryEvent extends GatewayClientRequestEvent {
  nextAttempt: number;
  delayMs: number;
  status?: number;
  error?: unknown;
}

export interface GatewayClientErrorEvent extends GatewayClientRequestEvent {
  error: unknown;
  durationMs: number;
}

export interface GatewayClientObservabilityContext {
  traceId?: string;
  runId?: string;
  taskId?: string;
}

export type GatewayClientObservabilityEvent =
  | ({ kind: 'request' } & GatewayClientRequestEvent)
  | ({ kind: 'response' } & GatewayClientResponseEvent)
  | ({ kind: 'retry' } & GatewayClientRetryEvent)
  | ({ kind: 'error' } & GatewayClientErrorEvent)
  | GatewayClientTaskEvent;

export interface GatewayClientTaskEvent {
  kind: 'task';
  traceId?: string;
  taskId: string;
  phase: 'started' | 'retry' | 'completed' | 'failed' | 'blocked' | 'cancelled';
  taskStatus: string;
  attempt?: number;
  maxAttempts?: number;
  label?: string;
  handoffId?: string;
  handoffTitle?: string;
  source?: string;
  subagent?: string;
  parentSessionId?: string;
  blockedBy?: string[];
  blockedReason?: string;
  error?: unknown;
}

export interface GatewayObservedEvent {
  id: string;
  timestamp: string;
  kind: 'request' | 'response' | 'retry' | 'error' | 'task';
  method?: string;
  path?: string;
  url?: string;
  attempt?: number;
  status?: number;
  ok?: boolean;
  durationMs?: number;
  nextAttempt?: number;
  delayMs?: number;
  traceId?: string;
  runId?: string;
  taskId?: string;
  phase?: string;
  taskStatus?: string;
  maxAttempts?: number;
  label?: string;
  handoffId?: string;
  handoffTitle?: string;
  source?: string;
  subagent?: string;
  parentSessionId?: string;
  blockedBy?: string[];
  blockedReason?: string;
  error?: unknown;
}

export interface GatewayObservabilitySummary {
  total: number;
  request: number;
  response: number;
  retry: number;
  error: number;
  task: number;
}

export interface GatewayObservabilityEventsResponse {
  summary: GatewayObservabilitySummary;
  events: GatewayObservedEvent[];
}

export interface GatewayRecordObservabilityResponse extends GatewayObservabilityEventsResponse {
  accepted: number;
}

export interface GatewayObservabilityQuery {
  kind?: GatewayObservedEvent['kind'];
  traceId?: string;
  limit?: number;
}

export interface GatewayObservabilityRetention {
  maxEvents: number;
  maxAgeDays?: number;
}

export interface GatewayObservabilityExport {
  version: 1;
  exportedAt: string;
  retention: GatewayObservabilityRetention;
  events: GatewayObservedEvent[];
}

export interface GatewayClearObservabilityResponse {
  cleared: number;
  summary: GatewayObservabilitySummary;
}

export interface GatewayRunRequest {
  prompt: string;
  workflow?: string;
  configPath?: string;
  ideContext?: unknown;
}

export interface GatewayRunResponse {
  id: string;
  traceId: string;
  workflow: GatewayWorkflowSummary;
  sessionId?: string;
  exitCode: number;
  events: AgentRunEvent[];
  workflowSteps: GatewayWorkflowStepRun[];
  output: string;
  errors: string;
}

export interface GatewayStreamEvent<T = unknown> {
  event: string;
  data: T;
}

export interface GatewayActiveRun {
  id: string;
  traceId: string;
  sessionId?: string;
  workflow: GatewayWorkflowSummary;
  status: 'running';
  prompt: string;
  startedAt: string;
  workflowSteps: GatewayWorkflowStepRun[];
}

export interface GatewaySessionStatus {
  id: string;
  traceId?: string;
  status: string;
  phase: string;
  summary: string;
  updatedAt: string;
}

export interface GatewayTraceToolPolicySummary {
  policyName: string;
  priorityTools: string[];
  requiredBefore: Record<string, string[]>;
  requiredBeforeAny: Record<string, string[]>;
  allowCount: number;
  denyCount: number;
  nextActions: string[];
}

export interface GatewayTraceRunReport {
  id: string;
  sessionId: string;
  traceId: string;
  createdAt: string;
  status: string;
  phase?: string;
  turns: number;
  eventCount: number;
  messageCount: number;
  toolCallCount: number;
  toolResultCount: number;
  workflowSteps?: GatewayWorkflowStepRun[];
  toolPolicy?: GatewayTraceToolPolicySummary;
  verification?: GatewayTraceVerificationSummary;
}

export interface GatewayTraceVerificationSummary {
  status: string;
  commandCount: number;
  passed: number;
  failed: number;
  failedCommands: string[];
}

export interface GatewayTraceDiagnostics {
  status: 'ok' | 'warning' | 'failed';
  retryCount: number;
  fallbackCount: number;
  failedToolCallCount: number;
  permissionIssueCount: number;
  toolPolicyIssueCount: number;
  failedVerificationCount: number;
  errorCount: number;
  handoffCount: number;
  handoffTaskCount: number;
  handoffDependencyCount: number;
  taskExecution: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    blocked: number;
  };
  providerRetries: Array<{
    provider: string;
    attempt: number;
    maxRetries: number;
    message: string;
  }>;
  providerFallbacks: Array<{
    from: string;
    to: string;
    message: string;
  }>;
  failedToolCalls: Array<{
    toolCallId: string;
    name: string;
    content: string;
  }>;
  permissionIssues: Array<{
    toolCallId: string;
    name: string;
    status: string;
    reason: string;
    riskLevel: string;
    summary: string;
    hardDeny: boolean;
  }>;
  toolPolicyIssues: Array<{
    toolCallId: string;
    name: string;
    policyName: string;
    reason: string;
    requiredBefore: string[];
    missingBefore: string[];
    requiredBeforeAny: string[];
    missingBeforeAny: string[];
    priorityTools: string[];
    nextAction?: string;
  }>;
  errors: string[];
  verification?: GatewayTraceVerificationSummary;
}

export interface GatewayTraceDetail {
  traceId: string;
  activeRuns: GatewayActiveRun[];
  sessions: GatewaySessionStatus[];
  runReports: GatewayTraceRunReport[];
  workflowSteps: GatewayWorkflowStepRun[];
  diagnostics: GatewayTraceDiagnostics;
  observability: GatewayObservabilityEventsResponse;
}

export interface GatewayTraceSummary {
  traceId: string;
  status: GatewayTraceDiagnostics['status'];
  updatedAt: string;
  activeRunCount: number;
  sessionCount: number;
  runReportCount: number;
  observabilityEventCount: number;
  diagnostics: GatewayTraceDiagnostics;
}

export interface GatewayTraceListSummary {
  total: number;
  failed: number;
  warning: number;
  ok: number;
}

export interface GatewayTraceList {
  traces: GatewayTraceSummary[];
  summary: GatewayTraceListSummary;
}

export interface GatewayTraceCompactSession {
  id: string;
  status: string;
  phase: string;
  updatedAt: string;
  compact: string;
}

export interface GatewayTraceCompact {
  traceId: string;
  sessions: GatewayTraceCompactSession[];
}

export interface GatewayTraceBundle {
  traceId: string;
  exportedAt: string;
  detail: GatewayTraceDetail;
  compact: GatewayTraceCompact;
}

export interface GatewayReportSummary {
  kind: GatewayReportKind;
  id: string;
  createdAt: string;
  exitCode: number;
  passed: number;
  failed: number;
  total: number;
}

export interface GatewayReportDetail<TReport = unknown> {
  kind: GatewayReportKind;
  id: string;
  path: string;
  report: TReport;
}

export interface GatewayActionResult {
  exitCode: number;
  output: string;
  errors: string;
}

export interface GatewayProfile {
  name: string;
  provider?: string;
  model?: string;
  approvalMode?: string;
}

export interface GatewayProfileState {
  active: string | null;
  profiles: GatewayProfile[];
}

export interface GatewayTask {
  id: string;
  status: string;
  prompt: string;
  sessionId?: string;
  artifactId?: string;
  updatedAt: string;
}

export interface GatewayCancelResult {
  ok: boolean;
  id: string;
  status: 'cancelled';
}

export class GatewayClientError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'GatewayClientError';
    this.status = status;
    this.body = body;
  }
}

export class GatewayTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Gateway request timed out after ${timeoutMs}ms.`);
    this.name = 'GatewayTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

interface GatewayOperationSignal {
  signal?: AbortSignal;
  timedOut(): boolean;
  resetTimeout(): void;
  cleanup(): void;
}

const defaultRetryStatuses = [429, 500, 502, 503, 504];

export class XenesisGatewayClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs?: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly retryStatuses: Set<number>;
  private readonly fetchImpl: GatewayFetch;
  private readonly observabilityEndpoint?: string;
  private readonly observabilityContext?: GatewayClientObservabilityContext;
  private readonly observers: {
    onRequest?: GatewayClientRequestObserver;
    onResponse?: GatewayClientResponseObserver;
    onRetry?: GatewayClientRetryObserver;
    onError?: GatewayClientErrorObserver;
  };

  constructor(options: XenesisGatewayClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token;
    this.timeoutMs = options.timeoutMs;
    this.retries = normalizeNonNegativeInteger(options.retries ?? 0);
    this.retryDelayMs = normalizeNonNegativeInteger(options.retryDelayMs ?? 100);
    this.retryStatuses = new Set(options.retryStatuses ?? defaultRetryStatuses);
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.observabilityEndpoint = normalizeObservabilityEndpoint(options.observabilityEndpoint);
    this.observabilityContext = options.observabilityContext;
    this.observers = {
      onRequest: options.onRequest,
      onResponse: options.onResponse,
      onRetry: options.onRetry,
      onError: options.onError,
    };
  }

  async openApi(signal?: AbortSignal): Promise<GatewayOpenApiSpec> {
    return await this.get('/openapi.json', signal);
  }

  async health(signal?: AbortSignal): Promise<unknown> {
    return await this.get('/health', signal);
  }

  async status(signal?: AbortSignal): Promise<unknown> {
    return await this.get('/status', signal);
  }

  async run(body: GatewayRunRequest, signal?: AbortSignal): Promise<GatewayRunResponse> {
    return await this.post('/run', body, signal);
  }

  async activeRuns(signal?: AbortSignal): Promise<{ runs: GatewayActiveRun[] }> {
    return await this.get('/runs', signal);
  }

  async workflows(signal?: AbortSignal): Promise<{ workflows: GatewayWorkflowSummary[] }> {
    return await this.get('/workflows', signal);
  }

  async cancelRun(id: string, signal?: AbortSignal): Promise<GatewayCancelResult> {
    return await this.post(`/runs/${encodeURIComponent(id)}/cancel`, undefined, signal);
  }

  async reports(signal?: AbortSignal): Promise<{ reports: GatewayReportSummary[] }> {
    return await this.get('/reports', signal);
  }

  async report<TReport = unknown>(
    kind: GatewayReportKind,
    id: string,
    signal?: AbortSignal,
  ): Promise<GatewayReportDetail<TReport>> {
    return await this.get(`/reports/${kind}/${encodeURIComponent(id)}`, signal);
  }

  async profiles(signal?: AbortSignal): Promise<GatewayProfileState> {
    return await this.get('/profiles', signal);
  }

  async useProfile(name: string, signal?: AbortSignal): Promise<GatewayProfileState> {
    return await this.post('/profiles/use', { name }, signal);
  }

  async clearProfile(signal?: AbortSignal): Promise<GatewayProfileState> {
    return await this.post('/profiles/clear', undefined, signal);
  }

  async sessions(signal?: AbortSignal): Promise<{ sessions: string[] }> {
    return await this.get('/sessions', signal);
  }

  async sessionStatuses(signal?: AbortSignal): Promise<{ sessions: GatewaySessionStatus[] }> {
    return await this.get('/sessions/status', signal);
  }

  async trace(traceId: string, signal?: AbortSignal): Promise<GatewayTraceDetail> {
    return await this.get(`/traces/${encodeURIComponent(traceId)}`, signal);
  }

  async traceCompact(traceId: string, signal?: AbortSignal): Promise<GatewayTraceCompact> {
    return await this.get(`/traces/${encodeURIComponent(traceId)}/compact`, signal);
  }

  async traceBundle(traceId: string, signal?: AbortSignal): Promise<GatewayTraceBundle> {
    return await this.get(`/traces/${encodeURIComponent(traceId)}/bundle`, signal);
  }

  async traces(signal?: AbortSignal): Promise<GatewayTraceList> {
    return await this.get('/traces', signal);
  }

  async context(signal?: AbortSignal): Promise<unknown> {
    return await this.get('/context', signal);
  }

  async artifacts(signal?: AbortSignal): Promise<{ artifacts: unknown[] }> {
    return await this.get('/artifacts', signal);
  }

  async artifact<TArtifact = unknown>(id: string, signal?: AbortSignal): Promise<TArtifact> {
    return await this.get(`/artifacts/${encodeURIComponent(id)}`, signal);
  }

  async tasks(signal?: AbortSignal): Promise<{ tasks: GatewayTask[] }> {
    return await this.get('/tasks', signal);
  }

  async runTask(id: string, signal?: AbortSignal): Promise<GatewayActionResult> {
    return await this.post(`/tasks/${encodeURIComponent(id)}/run`, undefined, signal);
  }

  async cancelTask(id: string, signal?: AbortSignal): Promise<GatewayActionResult> {
    return await this.post(`/tasks/${encodeURIComponent(id)}/cancel`, undefined, signal);
  }

  async observabilityEvents(signal?: AbortSignal): Promise<GatewayObservabilityEventsResponse>;

  async observabilityEvents(
    query?: GatewayObservabilityQuery,
    signal?: AbortSignal,
  ): Promise<GatewayObservabilityEventsResponse>;

  async observabilityEvents(
    queryOrSignal?: GatewayObservabilityQuery | AbortSignal,
    signal?: AbortSignal,
  ): Promise<GatewayObservabilityEventsResponse> {
    const query = isAbortSignalInput(queryOrSignal) ? undefined : queryOrSignal;
    const requestSignal = isAbortSignalInput(queryOrSignal) ? queryOrSignal : signal;
    return await this.get(observabilityEventsPath(query), requestSignal);
  }

  async recordObservabilityEvents(
    events: GatewayClientObservabilityEvent[],
    signal?: AbortSignal,
  ): Promise<GatewayRecordObservabilityResponse> {
    return await this.post('/observability/events', { events: events.map(serializeObservabilityEvent) }, signal);
  }

  async exportObservabilityEvents(signal?: AbortSignal): Promise<GatewayObservabilityExport> {
    return await this.get('/observability/events/export', signal);
  }

  async clearObservabilityEvents(signal?: AbortSignal): Promise<GatewayClearObservabilityResponse> {
    return await this.post('/observability/events/clear', undefined, signal);
  }

  async smoke(signal?: AbortSignal): Promise<GatewayActionResult> {
    return await this.post('/checks/smoke', undefined, signal);
  }

  async scenario(signal?: AbortSignal): Promise<GatewayActionResult> {
    return await this.post('/checks/scenario', undefined, signal);
  }

  async connect(options: { probe?: boolean } = {}, signal?: AbortSignal): Promise<GatewayActionResult> {
    return await this.post('/checks/connect', options.probe === undefined ? undefined : options, signal);
  }

  async *streamRun(body: GatewayRunRequest, signal?: AbortSignal): AsyncGenerator<GatewayStreamEvent, void, void> {
    const operation = createOperationSignal(signal, this.timeoutMs, { startPaused: true });
    let response: Response;
    try {
      response = await this.fetchResponseWithRetry(
        '/run/stream',
        {
          method: 'POST',
          body,
          signal: operation.signal,
        },
        operation,
      );
      operation.resetTimeout();
    } catch (error) {
      if (operation.timedOut() || isAbortError(error, operation.signal)) return;
      throw error;
    }

    if (!response.body)
      throw new GatewayClientError(response.status, 'Gateway stream response has no body.', undefined);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        if (operation.signal?.aborted) return;
        const { done, value } = await reader.read().catch((error: unknown) => {
          if (operation.timedOut() || isAbortError(error, operation.signal)) return { done: true, value: undefined };
          throw error;
        });
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\n\n/);
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          if (operation.signal?.aborted) return;
          const parsed = parseSseChunk(chunk);
          if (parsed) {
            operation.resetTimeout();
            yield parsed;
          }
        }
      }
      if (operation.signal?.aborted) return;
      buffer += decoder.decode();
      const parsed = parseSseChunk(buffer);
      if (parsed) {
        operation.resetTimeout();
        yield parsed;
      }
    } finally {
      reader.releaseLock();
      operation.cleanup();
    }
  }

  private async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const response = await this.request(path, { method: 'GET', signal });
    return await readJson<T>(response);
  }

  private async post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const response = await this.request(path, { method: 'POST', body, signal });
    return await readJson<T>(response);
  }

  private async request(path: string, options: { method: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal }) {
    const operation = createOperationSignal(options.signal, this.timeoutMs);
    try {
      return await this.fetchResponseWithRetry(
        path,
        {
          ...options,
          signal: operation.signal,
        },
        operation,
      );
    } catch (error) {
      if (operation.timedOut()) throw new GatewayTimeoutError(this.timeoutMs!);
      throw error;
    } finally {
      operation.cleanup();
    }
  }

  private async fetchResponseWithRetry(
    path: string,
    options: { method: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal },
    operation: GatewayOperationSignal,
  ) {
    let attempt = 0;
    const url = this.url(path);
    const observabilityContext = this.createObservabilityContext();

    while (true) {
      const startedAt = Date.now();
      const requestEvent: GatewayClientRequestEvent = {
        method: options.method,
        path,
        url,
        attempt,
        ...observabilityContext,
      };
      await this.emitObservabilityEvent('request', requestEvent);
      try {
        const response = await this.fetchResponse(url, options);
        await this.emitObservabilityEvent('response', {
          ...requestEvent,
          status: response.status,
          ok: response.ok,
          durationMs: Date.now() - startedAt,
        });
        if (response.ok) return response;

        const body = await readResponseBody(response);
        const error = new GatewayClientError(response.status, errorMessage(body, response.statusText), body);
        if (!this.canRetryResponse(response.status, attempt, operation)) {
          await this.emitObservabilityEvent('error', {
            ...requestEvent,
            error,
            durationMs: Date.now() - startedAt,
          });
          throw error;
        }
        await this.emitObservabilityEvent('retry', {
          ...requestEvent,
          nextAttempt: attempt + 1,
          delayMs: this.retryDelayMs,
          status: response.status,
        });
        await this.delayBeforeRetry(operation);
        attempt += 1;
      } catch (error) {
        if (error instanceof GatewayClientError || operation.timedOut() || isAbortError(error, options.signal)) {
          throw error;
        }
        if (!this.canRetryNetworkError(attempt, operation)) {
          await this.emitObservabilityEvent('error', {
            ...requestEvent,
            error,
            durationMs: Date.now() - startedAt,
          });
          throw error;
        }
        await this.emitObservabilityEvent('retry', {
          ...requestEvent,
          nextAttempt: attempt + 1,
          delayMs: this.retryDelayMs,
          error,
        });
        await this.delayBeforeRetry(operation);
        attempt += 1;
      }
    }
  }

  private createObservabilityContext(): Required<Pick<GatewayClientRequestEvent, 'traceId'>> &
    Pick<GatewayClientRequestEvent, 'runId' | 'taskId'> {
    return {
      ...this.observabilityContext,
      traceId: this.observabilityContext?.traceId ?? createGatewayClientTraceId(),
    };
  }

  private async emitObservabilityEvent(kind: 'request', event: GatewayClientRequestEvent): Promise<void>;

  private async emitObservabilityEvent(kind: 'response', event: GatewayClientResponseEvent): Promise<void>;

  private async emitObservabilityEvent(kind: 'retry', event: GatewayClientRetryEvent): Promise<void>;

  private async emitObservabilityEvent(kind: 'error', event: GatewayClientErrorEvent): Promise<void>;

  private async emitObservabilityEvent(
    kind: GatewayClientObservabilityEvent['kind'],
    event: GatewayClientRequestEvent | GatewayClientResponseEvent | GatewayClientRetryEvent | GatewayClientErrorEvent,
  ) {
    if (kind === 'request') this.observers.onRequest?.(event as GatewayClientRequestEvent);
    if (kind === 'response') this.observers.onResponse?.(event as GatewayClientResponseEvent);
    if (kind === 'retry') this.observers.onRetry?.(event as GatewayClientRetryEvent);
    if (kind === 'error') this.observers.onError?.(event as GatewayClientErrorEvent);
    await this.publishObservabilityEvent({ kind, ...event } as GatewayClientObservabilityEvent);
  }

  private async publishObservabilityEvent(event: GatewayClientObservabilityEvent) {
    const url = this.observabilityUrl();
    if (!url) return;

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (this.token) headers.authorization = `Bearer ${this.token}`;

    try {
      await this.fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events: [serializeObservabilityEvent(event)] }),
      });
    } catch {
      // Observability is best-effort and must not change the primary request result.
    }
  }

  private observabilityUrl() {
    if (!this.observabilityEndpoint) return undefined;
    try {
      return new URL(this.observabilityEndpoint).toString();
    } catch {
      return this.url(
        this.observabilityEndpoint.startsWith('/') ? this.observabilityEndpoint : `/${this.observabilityEndpoint}`,
      );
    }
  }

  private async fetchResponse(url: string, options: { method: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal }) {
    const hasBody = options.body !== undefined;
    const headers: Record<string, string> = {};
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    if (hasBody) headers['content-type'] = 'application/json';

    const response = await this.fetchImpl(url, {
      method: options.method,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    return response;
  }

  private url(path: string) {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private canRetryResponse(status: number, attempt: number, operation: GatewayOperationSignal) {
    return (
      !operation.timedOut() && !operation.signal?.aborted && attempt < this.retries && this.retryStatuses.has(status)
    );
  }

  private canRetryNetworkError(attempt: number, operation: GatewayOperationSignal) {
    return !operation.timedOut() && !operation.signal?.aborted && attempt < this.retries;
  }

  private async delayBeforeRetry(operation: GatewayOperationSignal) {
    if (this.retryDelayMs <= 0) return;
    await delay(this.retryDelayMs, operation.signal);
  }
}

function normalizeObservabilityEndpoint(value: boolean | string | undefined) {
  if (value === true) return '/observability/events';
  if (value === false || value === undefined) return undefined;
  return value.trim() || undefined;
}

function isAbortSignalInput(value: unknown): value is AbortSignal {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AbortSignal).aborted === 'boolean' &&
    typeof (value as AbortSignal).addEventListener === 'function'
  );
}

function observabilityEventsPath(query: GatewayObservabilityQuery | undefined) {
  if (!query) return '/observability/events';
  const params = new URLSearchParams();
  if (query.kind) params.set('kind', query.kind);
  if (query.traceId) params.set('traceId', query.traceId);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  const suffix = params.toString();
  return suffix ? `/observability/events?${suffix}` : '/observability/events';
}

function createGatewayClientTraceId() {
  return `gateway-client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function serializeUnknownError(error: unknown) {
  if (error instanceof GatewayClientError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      body: error.body,
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return error;
}

function serializeObservabilityEvent(event: GatewayClientObservabilityEvent): Record<string, unknown> {
  const serialized: Record<string, unknown> = { ...event };
  if ('error' in serialized && serialized.error !== undefined) {
    serialized.error = serializeUnknownError(serialized.error);
  }
  return serialized;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as unknown;
  }
  return await response.text();
}

function errorMessage(body: unknown, fallback: string) {
  if (typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string') {
    return (body as { error: string }).error;
  }
  if (typeof body === 'string' && body.trim()) return body;
  return fallback || 'Gateway request failed.';
}

function normalizeNonNegativeInteger(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

async function delay(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    timeout.unref?.();
  });
}

function parseSseChunk(chunk: string): GatewayStreamEvent | undefined {
  const lines = chunk.split(/\r?\n/);
  const event = lines.find((line) => line.startsWith('event: '))?.slice('event: '.length) ?? 'message';
  const data = lines
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice('data: '.length))
    .join('\n');

  if (!data) return undefined;
  return {
    event,
    data: JSON.parse(data) as unknown,
  };
}

function createOperationSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number | undefined,
  options: { startPaused?: boolean } = {},
): GatewayOperationSignal {
  if (timeoutMs === undefined || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return {
      signal,
      timedOut: () => false,
      resetTimeout: () => undefined,
      cleanup: () => undefined,
    };
  }

  const controller = new AbortController();
  let timedOut = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const abortFromInput = () => {
    controller.abort(signal?.reason);
  };

  if (signal?.aborted) {
    abortFromInput();
  } else {
    signal?.addEventListener('abort', abortFromInput, { once: true });
  }

  const scheduleTimeout = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      timedOut = true;
      controller.abort(new GatewayTimeoutError(timeoutMs));
    }, timeoutMs);
    timeout.unref?.();
  };

  if (!options.startPaused) {
    scheduleTimeout();
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    resetTimeout: () => {
      if (!timedOut && !controller.signal.aborted) scheduleTimeout();
    },
    cleanup: () => {
      if (timeout) clearTimeout(timeout);
      signal?.removeEventListener('abort', abortFromInput);
    },
  };
}

function isAbortError(error: unknown, signal?: AbortSignal) {
  return (
    Boolean(signal?.aborted) ||
    (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError'))
  );
}
