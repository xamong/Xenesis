import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { FileArtifactStore } from "../artifacts/index.js";
import {
  ChannelManager,
  DiscordAdapter,
  SqliteChannelSessionStore,
  SlackAdapter,
  TelegramAdapter,
  WebhookAdapter,
  createChannelSendLogWriter,
  createChannelPipelineRunner,
  summarizeChannelDiagnostics,
  type ChannelAdapter,
  type ChannelDiagnostic,
  type DiscordWebSocketFactory,
  type SlackEventHttpResponse
} from "../channels/index.js";
import type { CliIo } from "../cli/main.js";
import {
  loadConfig,
  readProfiles,
  type ApprovalMode,
  type CliConfigOverrides,
  type WorkflowConfig,
  writeProfiles,
  xenesisStatePath
} from "../config/index.js";
import { FileWorkspaceContextIndexStore } from "../context/index.js";
import {
  runAgentPipeline,
  type AgentRunPipelineOptions,
  type AgentRunPipelineResult
} from "../core/AgentRunPipeline.js";
import { buildAdaptiveExecutionPolicy } from "../core/adaptiveExecutionPolicy.js";
import { collectSecretEnvNames, decideWorkerIsolation, isGitRepo } from "../core/isolation/index.js";
import { collectOperationalFailureContext } from "../core/operationalFailureContext.js";
import { createRemoteDeskBridgeFromEnv, RemoteDeskSessionManager } from "../remoteDesk/index.js";
import type { AgentRunEvent } from "../core/events.js";
import {
  SqlitePluginStateStore,
  loadPluginWorkflows,
  type PluginWorkflowDescriptor
} from "../extensions/index.js";
import { isHandoffPriorityPolicy } from "../orchestration/index.js";
import {
  completeWorkflowStepRun as completeGatewayWorkflowStepRun,
  createWorkflowStepRun as gatewayWorkflowStepRun,
  failWorkflowStepRun as failGatewayWorkflowStepRun,
  formatWorkflowStepPrompt as formatGatewayStepPrompt,
  isWorkflowClientEvent as isGatewayClientEvent,
  workflowStepPipeline as gatewayStepPipeline,
  workflowSteps as gatewayWorkflowSteps
} from "../workflows/index.js";
import {
  createPipelineTaskExecutor,
  CombinedScheduleStore,
  SqliteAgentTaskStore,
  SqliteScheduleStore,
  SessionScheduleStore,
  TaskScheduler,
  TaskWorker,
  type AgentTask,
  type AgentTaskStatus,
  type CreateAgentTaskInput,
  type CreateScheduleInput,
  type ScheduleTrigger,
  type TaskScheduleDefaults,
  type TaskWorkerEvent,
  type UpdateScheduleInput
} from "../orchestration/index.js";
import type { RunReport } from "../runReports/index.js";
import { compactSessionEvents, latestRunState, readSessionLog, type SessionLogRecord } from "../sessions/index.js";
import { renderDashboardHtml } from "./dashboard.js";
import { gatewayOpenApiSpec } from "./openapi.js";
import {
  listGatewayWorkflows,
  resolveGatewayWorkflow,
  summarizeGatewayWorkflow,
  type GatewayWorkflowBody,
  type GatewayWorkflowHandler,
  type GatewayWorkflowPipelineOverrides,
  type GatewayWorkflowSelection,
  type GatewayWorkflowSummary,
  type GatewayWorkflowStep,
  type GatewayWorkflowStepRun
} from "./workflows.js";

export type GatewayRunCli = (argv: string[], io: CliIo) => Promise<number>;
export type GatewayRunPipeline = (options: AgentRunPipelineOptions) => Promise<AgentRunPipelineResult>;
export type GatewayRunAgent = GatewayRunPipeline;

export interface GatewayOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  configPath?: string;
  cli?: CliConfigOverrides;
  cliArgs?: string[];
  host?: string;
  port?: number;
  authToken?: string;
  allowedOrigins?: string[];
  maxBodyBytes?: number;
  maxConcurrentRuns?: number;
  requestTimeoutMs?: number;
  observabilityMaxEvents?: number;
  observabilityMaxAgeDays?: number;
  workflows?: GatewayWorkflowHandler[];
  runCli: GatewayRunCli;
  runPipeline?: GatewayRunPipeline;
  runAgent?: GatewayRunAgent;
  channelFetch?: typeof fetch;
  discordWebSocketFactory?: DiscordWebSocketFactory;
  worker?: boolean;
}

export interface GatewayHandle {
  server: Server;
  url: string;
  authToken?: string;
  authTokenGenerated: boolean;
  close(): Promise<void>;
}

interface ActiveGatewayRun {
  id: string;
  traceId: string;
  controller: AbortController;
  startedAt: string;
  prompt: string;
  sessionId?: string;
  workflow: GatewayWorkflowSummary;
  workflowSteps: GatewayWorkflowStepRun[];
}

interface GatewayActionResult {
  exitCode: number;
  output: string;
  errors: string;
}

type GatewayObservabilityEventKind = "request" | "response" | "retry" | "error" | "task";

interface GatewayObservabilityEventInput {
  kind: GatewayObservabilityEventKind;
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

interface GatewayObservabilityEvent extends GatewayObservabilityEventInput {
  id: string;
  timestamp: string;
}

interface GatewayObservabilitySummary {
  total: number;
  request: number;
  response: number;
  retry: number;
  error: number;
  task: number;
}

interface GatewayObservabilityQuery {
  kind?: GatewayObservabilityEventKind;
  traceId?: string;
  taskId?: string;
  phase?: string;
  taskStatus?: string;
  label?: string;
  handoffId?: string;
  handoffTitle?: string;
  limit?: number;
}

type GatewayReportKind = "smoke" | "scenario" | "connect" | "provider-live";
type GatewayReportStatus = "passed" | "failed";

interface GatewayReportQuery {
  kind?: GatewayReportKind;
  status?: GatewayReportStatus;
  limit?: number;
}

interface GatewayTaskQuery {
  status?: AgentTaskStatus;
  taskId?: string;
  label?: string;
  handoffId?: string;
  handoffTitle?: string;
  source?: string;
  subagent?: string;
  limit?: number;
}

interface GatewayObservabilityRetention {
  maxEvents: number;
  maxAgeDays?: number;
}

const maxBodyBytes = 1024 * 1024;
const defaultRequestTimeoutMs = 30_000;
const maxObservabilityEvents = 500;
const dayMs = 24 * 60 * 60 * 1000;
const gatewayReportKinds = new Set<GatewayReportKind>(["smoke", "scenario", "connect", "provider-live"]);
const gatewayReportStatuses = new Set<GatewayReportStatus>(["passed", "failed"]);
const gatewayTaskStatuses = new Set<AgentTaskStatus>([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
  "blocked"
]);

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

class GatewayHttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function createRunId() {
  return `gateway-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTraceId() {
  return `gateway-trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createObservabilityEventId() {
  return `gateway-obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function contentType(value: string) {
  return { "content-type": value };
}

function writeJson(response: ServerResponse, statusCode: number, value: unknown) {
  response.writeHead(statusCode, contentType("application/json; charset=utf-8"));
  response.end(`${JSON.stringify(value)}\n`);
}

function writeText(response: ServerResponse, statusCode: number, contentTypeValue: string, body: string) {
  response.writeHead(statusCode, contentType(contentTypeValue));
  response.end(body);
}

function writeSlackEventResponse(response: ServerResponse, result: SlackEventHttpResponse) {
  writeText(response, result.statusCode, result.contentType, result.body);
}

function writeNotFound(response: ServerResponse) {
  writeJson(response, 404, { error: "Not found" });
}

function writeMethodNotAllowed(response: ServerResponse) {
  writeJson(response, 405, { error: "Method not allowed" });
}

function writeSse(response: ServerResponse, event: string, data: unknown) {
  response.write(`event: ${event}\n`);
  for (const line of JSON.stringify(data).split(/\r?\n/)) {
    response.write(`data: ${line}\n`);
  }
  response.write("\n");
}

function bearerToken(request: IncomingMessage) {
  const authorization = request.headers.authorization ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function queryToken(url: URL) {
  return url.searchParams.get("token") ?? undefined;
}

const publicGatewayPaths = new Set(["/health"]);

function sameOrigin(request: IncomingMessage, origin: string) {
  const host = request.headers.host;
  return Boolean(host && (origin === `http://${host}` || origin === `https://${host}`));
}

function applyCors(options: GatewayOptions, request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin;
  if (!origin) return true;
  const allowed = new Set(options.allowedOrigins ?? []);
  if (!allowed.has(origin) && !sameOrigin(request, origin)) return false;
  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("vary", "Origin");
  response.setHeader("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization,content-type");
  return true;
}

function authorizeGatewayRequest(options: GatewayOptions, request: IncomingMessage, url: URL) {
  if (publicGatewayPaths.has(url.pathname)) return true;
  if (!options.authToken) return false;
  const token = bearerToken(request) ?? queryToken(url);
  return token === options.authToken;
}

export const __test_authorizeGatewayRequest = authorizeGatewayRequest;

export function __test_ensureGatewayAuthToken(options: GatewayOptions): void {
  if (options.authToken) return;
  options.authToken = randomBytes(24).toString("base64url");
  process.emitWarning(
    "Gateway auth token auto-generated; read GatewayHandle.authToken or set XENESIS_GATEWAY_TOKEN/--auth-token-env for a stable token.",
    { code: "XENESIS_GATEWAY_TOKEN_GENERATED" }
  );
}

function ensureRunCapacity(options: GatewayOptions, activeRuns: Map<string, ActiveGatewayRun>) {
  const limit = options.maxConcurrentRuns;
  if (limit !== undefined && activeRuns.size >= limit) {
    throw new GatewayHttpError(429, `Gateway run limit reached: ${limit}`);
  }
}

function parseEventLine(line: string): AgentRunEvent | undefined {
  try {
    return JSON.parse(line) as AgentRunEvent;
  } catch {
    return undefined;
  }
}

function sessionIdFromEvent(event: AgentRunEvent | undefined) {
  const sessionId = (event as { sessionId?: unknown } | undefined)?.sessionId;
  return typeof sessionId === "string" && sessionId.trim() ? sessionId : undefined;
}

async function readRawBody(request: IncomingMessage, maxBytes = maxBodyBytes): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) throw new GatewayHttpError(413, "Request body too large.");
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonBody(request: IncomingMessage, maxBytes = maxBodyBytes): Promise<unknown> {
  const raw = (await readRawBody(request, maxBytes)).trim();
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

function parsePromptBody(body: unknown): GatewayWorkflowBody {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be a JSON object.");
  }

  const prompt = (body as { prompt?: unknown }).prompt;
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new Error('Request body requires non-empty string field "prompt".');
  }

  const configPath = (body as { configPath?: unknown }).configPath;
  if (configPath !== undefined && typeof configPath !== "string") {
    throw new Error('Request body field "configPath" must be a string.');
  }

  const workflow = (body as { workflow?: unknown }).workflow;
  if (workflow !== undefined && typeof workflow !== "string") {
    throw new Error('Request body field "workflow" must be a string.');
  }

  return {
    prompt,
    configPath,
    ideContext: (body as { ideContext?: GatewayWorkflowBody["ideContext"] }).ideContext,
    ...(workflow !== undefined ? { workflow } : {})
  };
}

function isApprovalMode(value: unknown): value is ApprovalMode {
  return value === "safe" || value === "auto" || value === "readonly";
}

function optionalApprovalMode(value: unknown, name: string) {
  if (value === undefined) return undefined;
  if (!isApprovalMode(value)) throw new Error(`Request body field "${name}" must be safe, auto, or readonly.`);
  return value;
}

function optionalPositiveIntegerField(value: unknown, name: string) {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`Request body field "${name}" must be a positive integer.`);
  }
  return value as number;
}

function optionalBooleanField(value: unknown, name: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new Error(`Request body field "${name}" must be a boolean.`);
  return value;
}

function optionalStringField(value: unknown, name: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Request body field "${name}" must be a non-empty string.`);
  }
  return value;
}

function parseScheduleDefaults(value: unknown): TaskScheduleDefaults | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null) {
    throw new Error('Request body field "defaults" must be an object.');
  }
  const raw = value as Record<string, unknown>;
  return {
    approvalMode: optionalApprovalMode(raw.approvalMode, "defaults.approvalMode"),
    maxTurns: optionalPositiveIntegerField(raw.maxTurns, "defaults.maxTurns"),
    maxTokens: optionalPositiveIntegerField(raw.maxTokens, "defaults.maxTokens")
  };
}

function parseScheduleTrigger(value: unknown): ScheduleTrigger {
  if (typeof value !== "object" || value === null) {
    throw new Error('Request body field "trigger" must be an object.');
  }
  const raw = value as Record<string, unknown>;
  if (raw.type === "interval") {
    const every = optionalStringField(raw.every, "trigger.every");
    return { type: "interval", every: every! };
  }
  if (raw.type === "daily") {
    const at = optionalStringField(raw.at, "trigger.at");
    return { type: "daily", at: at! };
  }
  throw new Error('Request body field "trigger.type" must be interval or daily.');
}

function parseCreateTaskBody(body: unknown): CreateAgentTaskInput {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be a JSON object.");
  }
  const raw = body as Record<string, unknown>;
  const prompt = optionalStringField(raw.prompt, "prompt");
  return {
    prompt: prompt!,
    approvalMode: optionalApprovalMode(raw.approvalMode, "approvalMode"),
    maxTurns: optionalPositiveIntegerField(raw.maxTurns, "maxTurns"),
    maxTokens: optionalPositiveIntegerField(raw.maxTokens, "maxTokens"),
    scheduleId: optionalStringField(raw.scheduleId, "scheduleId")
  };
}

function parseCreateScheduleBody(body: unknown): CreateScheduleInput {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be a JSON object.");
  }
  const raw = body as Record<string, unknown>;
  const prompt = optionalStringField(raw.prompt, "prompt");
  return {
    prompt: prompt!,
    trigger: parseScheduleTrigger(raw.trigger),
    enabled: optionalBooleanField(raw.enabled, "enabled"),
    defaults: parseScheduleDefaults(raw.defaults)
  };
}

function parseUpdateScheduleBody(body: unknown): UpdateScheduleInput {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be a JSON object.");
  }
  const raw = body as Record<string, unknown>;
  const parsed: UpdateScheduleInput = {};
  const prompt = optionalStringField(raw.prompt, "prompt");
  if (prompt !== undefined) parsed.prompt = prompt;
  if (raw.trigger !== undefined) parsed.trigger = parseScheduleTrigger(raw.trigger);
  const enabled = optionalBooleanField(raw.enabled, "enabled");
  if (enabled !== undefined) parsed.enabled = enabled;
  const defaults = parseScheduleDefaults(raw.defaults);
  if (defaults !== undefined) parsed.defaults = defaults;
  const lastFiredAt = optionalStringField(raw.lastFiredAt, "lastFiredAt");
  if (lastFiredAt !== undefined) parsed.lastFiredAt = lastFiredAt;
  return parsed;
}

function isObservabilityEventKind(value: unknown): value is GatewayObservabilityEventKind {
  return value === "request" ||
    value === "response" ||
    value === "retry" ||
    value === "error" ||
    value === "task";
}

function queryStringParam(url: URL, name: string) {
  const value = url.searchParams.get(name);
  return value !== null && value.trim() ? value.trim() : undefined;
}

function queryLimitParam(url: URL, maximum: number) {
  const limit = url.searchParams.get("limit");
  if (limit === null) return undefined;
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new GatewayHttpError(400, 'Query "limit" must be a positive integer.');
  }
  return Math.min(parsed, maximum);
}

function containsQuery(value: string | undefined, query: string | undefined) {
  if (!query) return true;
  return String(value ?? "").toLowerCase().includes(query.toLowerCase());
}

function isGatewayReportKind(value: unknown): value is GatewayReportKind {
  return typeof value === "string" && gatewayReportKinds.has(value as GatewayReportKind);
}

function isGatewayReportStatus(value: unknown): value is GatewayReportStatus {
  return typeof value === "string" && gatewayReportStatuses.has(value as GatewayReportStatus);
}

function isAgentTaskStatus(value: unknown): value is AgentTaskStatus {
  return typeof value === "string" && gatewayTaskStatuses.has(value as AgentTaskStatus);
}

function optionalString(value: unknown, name: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`Observability field "${name}" must be a string.`);
  return value;
}

function optionalNumber(value: unknown, name: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Observability field "${name}" must be a finite number.`);
  }
  return value;
}

function optionalBoolean(value: unknown, name: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new Error(`Observability field "${name}" must be a boolean.`);
  return value;
}

function optionalStringArray(value: unknown, name: string) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Observability field "${name}" must be an array of strings.`);
  }
  return value;
}

function parseObservabilityEvent(value: unknown): GatewayObservabilityEventInput {
  if (typeof value !== "object" || value === null) {
    throw new Error("Observability event must be a JSON object.");
  }
  const raw = value as Record<string, unknown>;
  if (!isObservabilityEventKind(raw.kind)) {
    throw new Error('Observability event requires kind: "request", "response", "retry", "error", or "task".');
  }
  return {
    kind: raw.kind,
    method: optionalString(raw.method, "method"),
    path: optionalString(raw.path, "path"),
    url: optionalString(raw.url, "url"),
    attempt: optionalNumber(raw.attempt, "attempt"),
    status: optionalNumber(raw.status, "status"),
    ok: optionalBoolean(raw.ok, "ok"),
    durationMs: optionalNumber(raw.durationMs, "durationMs"),
    nextAttempt: optionalNumber(raw.nextAttempt, "nextAttempt"),
    delayMs: optionalNumber(raw.delayMs, "delayMs"),
    traceId: optionalString(raw.traceId, "traceId"),
    runId: optionalString(raw.runId, "runId"),
    taskId: optionalString(raw.taskId, "taskId"),
    phase: optionalString(raw.phase, "phase"),
    taskStatus: optionalString(raw.taskStatus, "taskStatus"),
    maxAttempts: optionalNumber(raw.maxAttempts, "maxAttempts"),
    label: optionalString(raw.label, "label"),
    handoffId: optionalString(raw.handoffId, "handoffId"),
    handoffTitle: optionalString(raw.handoffTitle, "handoffTitle"),
    source: optionalString(raw.source, "source"),
    subagent: optionalString(raw.subagent, "subagent"),
    parentSessionId: optionalString(raw.parentSessionId, "parentSessionId"),
    blockedBy: optionalStringArray(raw.blockedBy, "blockedBy"),
    blockedReason: optionalString(raw.blockedReason, "blockedReason"),
    error: raw.error
  };
}

function parseObservabilityBody(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new Error("Observability request body must be a JSON object.");
  }
  const raw = body as { events?: unknown; kind?: unknown };
  const events = Array.isArray(raw.events) ? raw.events : [body];
  if (events.length === 0) throw new Error("Observability request body requires at least one event.");
  return events.map(parseObservabilityEvent);
}

function parseObservabilityQuery(url: URL): GatewayObservabilityQuery {
  const query: GatewayObservabilityQuery = {};
  const kind = url.searchParams.get("kind");
  if (kind !== null) {
    if (!isObservabilityEventKind(kind)) {
      throw new GatewayHttpError(400, 'Query "kind" must be request, response, retry, error, or task.');
    }
    query.kind = kind;
  }

  const traceId = url.searchParams.get("traceId");
  if (traceId !== null && traceId.trim()) query.traceId = traceId;
  const taskId = queryStringParam(url, "taskId");
  if (taskId) query.taskId = taskId;
  const phase = queryStringParam(url, "phase");
  if (phase) query.phase = phase;
  const taskStatus = queryStringParam(url, "taskStatus");
  if (taskStatus) query.taskStatus = taskStatus;
  const label = queryStringParam(url, "label");
  if (label) query.label = label;
  const handoffId = queryStringParam(url, "handoffId");
  if (handoffId) query.handoffId = handoffId;
  const handoffTitle = queryStringParam(url, "handoffTitle");
  if (handoffTitle) query.handoffTitle = handoffTitle;

  const limit = queryLimitParam(url, maxObservabilityEvents);
  if (limit !== undefined) query.limit = limit;

  return query;
}

function parseReportQuery(url: URL): GatewayReportQuery {
  const query: GatewayReportQuery = {};
  const kind = url.searchParams.get("kind");
  if (kind !== null) {
    if (!isGatewayReportKind(kind)) {
      throw new GatewayHttpError(400, 'Query "kind" must be smoke, scenario, connect, or provider-live.');
    }
    query.kind = kind;
  }
  const status = url.searchParams.get("status");
  if (status !== null) {
    if (!isGatewayReportStatus(status)) {
      throw new GatewayHttpError(400, 'Query "status" must be passed or failed.');
    }
    query.status = status;
  }
  const limit = queryLimitParam(url, maxObservabilityEvents);
  if (limit !== undefined) query.limit = limit;
  return query;
}

function parseTaskQuery(url: URL): GatewayTaskQuery {
  const query: GatewayTaskQuery = {};
  const status = url.searchParams.get("status");
  if (status !== null) {
    if (!isAgentTaskStatus(status)) {
      throw new GatewayHttpError(400, 'Query "status" must be queued, running, completed, failed, cancelled, or blocked.');
    }
    query.status = status;
  }
  const taskId = queryStringParam(url, "taskId");
  if (taskId) query.taskId = taskId;
  const label = queryStringParam(url, "label");
  if (label) query.label = label;
  const handoffId = queryStringParam(url, "handoffId");
  if (handoffId) query.handoffId = handoffId;
  const handoffTitle = queryStringParam(url, "handoffTitle");
  if (handoffTitle) query.handoffTitle = handoffTitle;
  const source = queryStringParam(url, "source");
  if (source) query.source = source;
  const subagent = queryStringParam(url, "subagent");
  if (subagent) query.subagent = subagent;
  const limit = queryLimitParam(url, maxObservabilityEvents);
  if (limit !== undefined) query.limit = limit;
  return query;
}

function summarizeObservabilityEvents(events: GatewayObservabilityEvent[]): GatewayObservabilitySummary {
  const summary: GatewayObservabilitySummary = {
    total: events.length,
    request: 0,
    response: 0,
    retry: 0,
    error: 0,
    task: 0
  };
  for (const event of events) summary[event.kind] += 1;
  return summary;
}

function filterObservabilityEvents(
  events: GatewayObservabilityEvent[],
  query: GatewayObservabilityQuery = {}
) {
  let filtered = events;
  if (query.kind) filtered = filtered.filter((event) => event.kind === query.kind);
  if (query.traceId) filtered = filtered.filter((event) => event.traceId === query.traceId);
  if (query.taskId) filtered = filtered.filter((event) => event.taskId === query.taskId);
  if (query.phase) filtered = filtered.filter((event) => event.phase === query.phase);
  if (query.taskStatus) filtered = filtered.filter((event) => event.taskStatus === query.taskStatus);
  if (query.label) filtered = filtered.filter((event) => containsQuery(event.label, query.label));
  if (query.handoffId) filtered = filtered.filter((event) => event.handoffId === query.handoffId);
  if (query.handoffTitle) filtered = filtered.filter((event) => containsQuery(event.handoffTitle, query.handoffTitle));
  if (query.limit !== undefined && filtered.length > query.limit) {
    filtered = filtered.slice(filtered.length - query.limit);
  }
  return filtered;
}

function normalizeObservabilityRetention(options: GatewayOptions): GatewayObservabilityRetention {
  return {
    maxEvents: positiveIntegerOrDefault(options.observabilityMaxEvents, maxObservabilityEvents),
    ...(options.observabilityMaxAgeDays !== undefined
      ? { maxAgeDays: positiveIntegerOrDefault(options.observabilityMaxAgeDays, 1) }
      : {})
  };
}

function positiveIntegerOrDefault(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || value === undefined || value <= 0) return fallback;
  return Math.floor(value);
}

function parseStoredObservabilityEvents(value: unknown): GatewayObservabilityEvent[] {
  if (typeof value !== "object" || value === null || !Array.isArray((value as { events?: unknown }).events)) {
    return [];
  }

  return (value as { events: unknown[] }).events.map((event) => {
    if (typeof event !== "object" || event === null) {
      throw new Error("Stored observability event must be a JSON object.");
    }
    const raw = event as Record<string, unknown>;
    const id = optionalString(raw.id, "id");
    const timestamp = optionalString(raw.timestamp, "timestamp");
    if (!id || !timestamp) {
      throw new Error("Stored observability event requires id and timestamp.");
    }
    return {
      ...parseObservabilityEvent(raw),
      id,
      timestamp
    };
  });
}

async function observabilityEventsPath(options: GatewayOptions) {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env
  });
  return xenesisStatePath(config.xenesisHome, "observability", "events.json");
}

function createGatewayObservabilityStore(options: GatewayOptions) {
  return new GatewayObservabilityStore(
    () => observabilityEventsPath(options),
    normalizeObservabilityRetention(options)
  );
}

class GatewayObservabilityStore {
  private events: GatewayObservabilityEvent[] | undefined;
  private pathPromise: Promise<string> | undefined;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly resolvePath: () => Promise<string>,
    private readonly retention: GatewayObservabilityRetention
  ) {}

  private async path() {
    this.pathPromise ??= this.resolvePath();
    return await this.pathPromise;
  }

  private async load() {
    if (this.events) return this.events;
    const path = await this.path();
    try {
      const storedEvents = parseStoredObservabilityEvents(JSON.parse(await readFile(path, "utf8")));
      this.events = this.applyRetention(storedEvents);
      if (this.events.length !== storedEvents.length) await this.save();
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        this.events = [];
      } else {
        throw error;
      }
    }
    return this.events;
  }

  private applyRetention(events: GatewayObservabilityEvent[]) {
    let retained = events;
    if (this.retention.maxAgeDays !== undefined) {
      const cutoff = Date.now() - this.retention.maxAgeDays * dayMs;
      retained = retained.filter((event) => {
        const timestamp = Date.parse(event.timestamp);
        return Number.isNaN(timestamp) || timestamp >= cutoff;
      });
    }
    if (retained.length > this.retention.maxEvents) {
      retained = retained.slice(retained.length - this.retention.maxEvents);
    }
    return retained;
  }

  private async save() {
    const path = await this.path();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify({
      version: 1,
      events: this.events ?? []
    }, null, 2)}\n`, "utf8");
  }

  private async enqueue<T>(operation: () => Promise<T>) {
    const next = this.writeQueue.then(operation, operation);
    this.writeQueue = next.then(() => undefined, () => undefined);
    return await next;
  }

  async record(inputs: GatewayObservabilityEventInput[]) {
    return await this.enqueue(async () => {
      const events = await this.load();
      const accepted = inputs.map((input) => ({
        ...input,
        id: createObservabilityEventId(),
        timestamp: new Date().toISOString()
      }));
      events.push(...accepted);
      this.events = this.applyRetention(events);
      await this.save();
      return accepted;
    });
  }

  async clear() {
    return await this.enqueue(async () => {
      const events = await this.load();
      const cleared = events.length;
      this.events = [];
      await this.save();
      return {
        cleared,
        summary: summarizeObservabilityEvents(this.events)
      };
    });
  }

  async exportEvents() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      retention: this.retention,
      events: await this.list()
    };
  }

  async list(query: GatewayObservabilityQuery = {}) {
    return [...filterObservabilityEvents(await this.load(), query)];
  }

  async summary() {
    return summarizeObservabilityEvents(await this.load());
  }
}

async function resolveTaskTraceId(options: GatewayOptions, task: AgentTask) {
  if (!task.parentSessionId) return undefined;
  try {
    const config = await loadConfig({
      cwd: options.cwd,
      configPath: options.configPath,
      env: options.env
    });
    const records = await readSessionLog(config.xenesisHome, task.parentSessionId);
    return records.find((record) => typeof record.traceId === "string" && record.traceId.trim())?.traceId;
  } catch {
    return undefined;
  }
}

async function recordTaskWorkerEvent(
  options: GatewayOptions,
  observabilityStore: GatewayObservabilityStore,
  event: TaskWorkerEvent
) {
  try {
    await observabilityStore.record([{
      kind: "task",
      traceId: await resolveTaskTraceId(options, event.task),
      taskId: event.task.id,
      phase: event.phase,
      taskStatus: event.status,
      attempt: event.attempt,
      maxAttempts: event.maxAttempts,
      label: event.task.label,
      handoffId: event.task.handoffId,
      handoffTitle: event.task.handoffTitle,
      source: event.task.source,
      subagent: event.task.subagent,
      parentSessionId: event.task.parentSessionId,
      blockedBy: event.blockedBy ?? event.task.blockedBy,
      blockedReason: event.blockedReason ?? event.task.blockedReason,
      error: event.error
    }]);
  } catch {
    // Observability must not change worker scheduling or task execution.
  }
}

function gatewayArgv(options: GatewayOptions, body: GatewayWorkflowBody) {
  const argv = [
    "node",
    "xenesis",
    "--cwd",
    options.cwd,
    "--json",
    "--print"
  ];
  const configPath = body.configPath ?? options.configPath;
  if (configPath) argv.push("--config", configPath);
  argv.push(...(options.cliArgs ?? []));
  argv.push(body.prompt);
  return argv;
}

function gatewayActionArgv(options: GatewayOptions, args: string[]) {
  const argv = [
    "node",
    "xenesis",
    "--cwd",
    options.cwd
  ];
  if (options.configPath) argv.push("--config", options.configPath);
  argv.push(...(options.cliArgs ?? []));
  argv.push(...args);
  return argv;
}

function readGatewayCliArgValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Gateway option "${name}" requires a value.`);
  }
  return value;
}

function parseGatewayCliInteger(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Gateway option "${name}" must be a non-negative integer; got ${value}.`);
  }
  return parsed;
}

function gatewayCliOverrides(options: GatewayOptions): CliConfigOverrides | undefined {
  const parsed: CliConfigOverrides = {};
  const args = options.cliArgs ?? [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--home") {
      parsed.xenesisHome = readGatewayCliArgValue(args, index, "--home");
      index += 1;
    } else if (arg === "--profile") {
      parsed.profile = readGatewayCliArgValue(args, index, "--profile");
      index += 1;
    } else if (arg === "--provider") {
      parsed.provider = readGatewayCliArgValue(args, index, "--provider") as CliConfigOverrides["provider"];
      index += 1;
    } else if (arg === "--model") {
      parsed.model = readGatewayCliArgValue(args, index, "--model");
      index += 1;
    } else if (arg === "--base-url") {
      parsed.baseURL = readGatewayCliArgValue(args, index, "--base-url");
      index += 1;
    } else if (arg === "--api-key-env") {
      parsed.apiKeyEnv = readGatewayCliArgValue(args, index, "--api-key-env");
      index += 1;
    } else if (arg === "--provider-retries") {
      parsed.providerRetries = parseGatewayCliInteger(
        readGatewayCliArgValue(args, index, "--provider-retries"),
        "--provider-retries"
      );
      index += 1;
    } else if (arg === "--fallback-provider") {
      const provider = readGatewayCliArgValue(args, index, "--fallback-provider") as CliConfigOverrides["provider"];
      parsed.providerFallbacks = [
        ...(parsed.providerFallbacks ?? []),
        { provider: provider! }
      ];
      index += 1;
    } else if (arg === "--max-turns") {
      parsed.maxTurns = parseGatewayCliInteger(readGatewayCliArgValue(args, index, "--max-turns"), "--max-turns");
      index += 1;
    } else if (arg === "--auto") {
      parsed.approvalMode = "auto";
    } else if (arg === "--readonly") {
      parsed.approvalMode = "readonly";
    }
  }

  const merged = { ...parsed, ...(options.cli ?? {}) };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function loadGatewayConfig(options: GatewayOptions) {
  return loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env,
    cli: options.cli ?? gatewayCliOverrides(options)
  });
}

function createPluginStateStore(config: Awaited<ReturnType<typeof loadGatewayConfig>>) {
  return new SqlitePluginStateStore({
    xenesisHome: config.xenesisHome,
    workspaceRoot: config.workspace
  });
}

function uniquePaths(paths: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const path of paths) {
    const key = path.replace(/\\/g, "/");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(path);
  }
  return result;
}

async function runtimePluginPaths(config: Awaited<ReturnType<typeof loadGatewayConfig>>) {
  return uniquePaths([
    ...config.extensions.plugins.paths,
    ...await createPluginStateStore(config).enabledPaths()
  ]);
}

function createPluginGatewayWorkflow(descriptor: PluginWorkflowDescriptor): GatewayWorkflowHandler {
  return {
    name: descriptor.name,
    description: descriptor.description,
    matches: ({ body }) => body.workflow === descriptor.name,
    prepare: ({ body }) => {
      const base = {
        ...(descriptor.metadata ? { metadata: descriptor.metadata } : {})
      };
      const mode = workflowMode(descriptor);
      const toolExecutionPolicy = workflowToolExecutionPolicy(descriptor.name, descriptor);
      const pipeline = {
        ...(mode ? { mode } : {}),
        ...(toolExecutionPolicy ? { toolExecutionPolicy } : {})
      };
      if (descriptor.steps?.length) {
        return {
          ...base,
          ...(Object.keys(pipeline).length > 0 ? { pipeline } : {}),
          steps: descriptor.steps.map((step) => ({
            name: step.name,
            ...(step.description ? { description: step.description } : {}),
            ...(step.input ? { input: step.input } : {}),
            ...(step.prompt !== undefined ? { prompt: step.prompt } : {}),
            ...(step.promptPrefix !== undefined ? { promptPrefix: step.promptPrefix } : {}),
            ...(step.promptSuffix !== undefined ? { promptSuffix: step.promptSuffix } : {}),
            ...(step.mode ? { pipeline: { mode: step.mode } } : {}),
            ...(step.metadata ? { metadata: step.metadata } : {})
          }))
        };
      }
      return {
        ...base,
        prompt: descriptor.prompt !== undefined
          ? descriptor.prompt
          : `${descriptor.promptPrefix ?? ""}${body.prompt}${descriptor.promptSuffix ?? ""}`,
        ...(Object.keys(pipeline).length > 0 ? { pipeline } : {})
      };
    }
  };
}

function handlerMode(handler: string | undefined): GatewayWorkflowPipelineOverrides["mode"] {
  if (handler === "plan" || handler === "work") return handler;
  return undefined;
}

function workflowMode(descriptor: WorkflowConfig): GatewayWorkflowPipelineOverrides["mode"] {
  if (descriptor.mode === "plan" || descriptor.mode === "work") return descriptor.mode;
  return handlerMode(descriptor.handler);
}

function workflowToolExecutionPolicy(
  name: string,
  descriptor: WorkflowConfig
): GatewayWorkflowPipelineOverrides["toolExecutionPolicy"] | undefined {
  const policy = descriptor.metadata?.handoffPriority;
  if (!isHandoffPriorityPolicy(policy)) return undefined;
  return {
    name: `workflow:${name}`,
    handoffPriority: policy
  };
}

function createConfiguredGatewayWorkflow(
  name: string,
  descriptor: WorkflowConfig,
  defaultWorkflow: string
): GatewayWorkflowHandler {
  return {
    name,
    description: descriptor.description,
    matches: ({ body }) => body.workflow === undefined && defaultWorkflow === name,
    prepare: ({ body }) => {
      const base = {
        ...(descriptor.metadata ? { metadata: descriptor.metadata } : {})
      };
      const mode = workflowMode(descriptor);
      const toolExecutionPolicy = workflowToolExecutionPolicy(name, descriptor);
      const pipeline = {
        ...(mode ? { mode } : {}),
        ...(descriptor.guard ? { guard: descriptor.guard } : {}),
        ...(toolExecutionPolicy ? { toolExecutionPolicy } : {})
      };
      if (descriptor.steps?.length) {
        return {
          ...base,
          ...(Object.keys(pipeline).length > 0 ? { pipeline } : {}),
          steps: descriptor.steps.map((step) => ({
            name: step.name,
            ...(step.description ? { description: step.description } : {}),
            ...(step.input ? { input: step.input } : {}),
            ...(step.prompt !== undefined ? { prompt: step.prompt } : {}),
            ...(step.promptPrefix !== undefined ? { promptPrefix: step.promptPrefix } : {}),
            ...(step.promptSuffix !== undefined ? { promptSuffix: step.promptSuffix } : {}),
            ...(step.mode === "plan" || step.mode === "work" ? { pipeline: { mode: step.mode } } : {}),
            ...(step.metadata ? { metadata: step.metadata } : {})
          }))
        };
      }
      return {
        ...base,
        prompt: descriptor.prompt !== undefined
          ? descriptor.prompt
          : `${descriptor.promptPrefix ?? ""}${body.prompt}${descriptor.promptSuffix ?? ""}`,
        ...(Object.keys(pipeline).length > 0 ? { pipeline } : {})
      };
    }
  };
}

async function loadGatewayWorkflows(options: GatewayOptions) {
  const config = await loadGatewayConfig(options);
  const pluginWorkflows = await loadPluginWorkflows({
    workspaceRoot: config.workspace,
    paths: await runtimePluginPaths(config)
  });
  return [
    ...(options.workflows ?? []),
    ...Object.entries(config.workflows).map(([name, descriptor]) => (
      createConfiguredGatewayWorkflow(name, descriptor, config.workflow)
    )),
    ...pluginWorkflows.map(createPluginGatewayWorkflow)
  ];
}

async function runCliAction(options: GatewayOptions, args: string[]): Promise<GatewayActionResult> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = await options.runCli(gatewayActionArgv(options, args), {
    cwd: options.cwd,
    env: options.env,
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line)
  });
  return {
    exitCode,
    output: stdout.join("\n"),
    errors: stderr.join("\n")
  };
}

function parseProbeBody(body: unknown) {
  if (typeof body !== "object" || body === null) return false;
  return (body as { probe?: unknown }).probe === true;
}

function parseProfileUseBody(body: unknown) {
  if (typeof body !== "object" || body === null) {
    throw new Error("Request body must be a JSON object.");
  }
  const name = (body as { name?: unknown }).name;
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error('Request body requires non-empty string field "name".');
  }
  return name;
}

async function profileState(options: GatewayOptions) {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env
  });
  return {
    xenesisHome: config.xenesisHome,
    profiles: await readProfiles(config.xenesisHome)
  };
}

function renderProfiles(profiles: Awaited<ReturnType<typeof readProfiles>>) {
  return {
    active: profiles.active ?? null,
    profiles: Object.entries(profiles.profiles)
      .map(([name, profile]) => ({
        name,
        provider: profile.provider,
        model: profile.model,
        approvalMode: profile.approvalMode
      }))
      .sort((left, right) => left.name.localeCompare(right.name))
  };
}

async function listProfiles(options: GatewayOptions) {
  const { profiles } = await profileState(options);
  return renderProfiles(profiles);
}

async function useProfile(options: GatewayOptions, name: string) {
  const { xenesisHome, profiles } = await profileState(options);
  if (!profiles.profiles[name]) throw new Error(`Profile not found: ${name}`);
  profiles.active = name;
  await writeProfiles(xenesisHome, profiles);
  return renderProfiles(profiles);
}

async function clearProfile(options: GatewayOptions) {
  const { xenesisHome, profiles } = await profileState(options);
  delete profiles.active;
  await writeProfiles(xenesisHome, profiles);
  return renderProfiles(profiles);
}

async function listSessions(options: GatewayOptions) {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env
  });
  const sessionsDir = xenesisStatePath(config.xenesisHome, "sessions");

  let files;
  try {
    files = await readdir(sessionsDir, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }

  const sessions = await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith(".jsonl"))
      .map(async (file) => ({
        id: file.name.slice(0, -".jsonl".length),
        mtimeMs: (await stat(resolve(sessionsDir, file.name))).mtimeMs
      }))
  );

  return sessions
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .map((session) => session.id);
}

async function listSessionStatuses(options: GatewayOptions) {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env
  });
  const sessionsDir = xenesisStatePath(config.xenesisHome, "sessions");

  let files;
  try {
    files = await readdir(sessionsDir, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }

  const sessions = await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith(".jsonl"))
      .map(async (file) => {
        const id = file.name.slice(0, -".jsonl".length);
        const path = resolve(sessionsDir, file.name);
        const mtimeMs = (await stat(path)).mtimeMs;
        const records = await readSessionLog(config.xenesisHome, id);
        const state = latestRunState(records);
        const traceId = records.find((record) => typeof record.traceId === "string" && record.traceId.trim())?.traceId;
        return {
          id,
          ...(traceId ? { traceId } : {}),
          status: state?.status ?? "unknown",
          phase: state?.phase ?? "unknown",
          summary: state?.summary ?? "",
          updatedAt: state?.timestamp ?? new Date(mtimeMs).toISOString(),
          mtimeMs
        };
      })
  );

  return sessions
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .map(({ mtimeMs: _mtimeMs, ...session }) => session);
}

async function listAllTraceSessionData(options: GatewayOptions) {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env
  });
  const sessionsDir = xenesisStatePath(config.xenesisHome, "sessions");

  let files;
  try {
    files = await readdir(sessionsDir, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }

  const sessions = await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith(".jsonl"))
      .map(async (file) => {
        const id = file.name.slice(0, -".jsonl".length);
        const path = resolve(sessionsDir, file.name);
        const mtimeMs = (await stat(path)).mtimeMs;
        const records = await readSessionLog(config.xenesisHome, id);
        const traceIds = Array.from(new Set(records
          .map((record) => record.traceId)
          .filter((recordTraceId): recordTraceId is string => Boolean(recordTraceId?.trim()))));
        return traceIds.map((traceId) => {
          const traceRecords = records.filter((record) => record.traceId === traceId);
          const state = latestRunState(traceRecords);
          return {
            traceId,
            records: traceRecords,
            status: {
              id,
              traceId,
              status: state?.status ?? "unknown",
              phase: state?.phase ?? "unknown",
              summary: state?.summary ?? "",
              updatedAt: state?.timestamp ?? new Date(mtimeMs).toISOString()
            }
          };
        });
      })
  );

  return sessions.flat();
}

async function listTraceSessionData(options: GatewayOptions, traceId: string) {
  return (await listAllTraceSessionData(options))
    .filter((session) => session.traceId === traceId);
}

async function readContextIndex(options: GatewayOptions) {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env
  });
  const index = await new FileWorkspaceContextIndexStore({
    workspaceRoot: config.workspace,
    xenesisHome: config.xenesisHome
  }).read();
  return index ?? {
    workspaceRoot: config.workspace,
    indexedAt: null,
    fileCount: 0,
    totalSize: 0,
    ignoredDirectories: [],
    files: []
  };
}

async function artifactStore(options: GatewayOptions) {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env
  });
  return new FileArtifactStore({ xenesisHome: config.xenesisHome });
}

async function listArtifacts(options: GatewayOptions) {
  return await (await artifactStore(options)).list();
}

async function readArtifact(options: GatewayOptions, id: string) {
  return await (await artifactStore(options)).read(id);
}

async function gatewayTaskStore(options: GatewayOptions) {
  const config = await loadGatewayConfig(options);
  return new SqliteAgentTaskStore({ xenesisHome: config.xenesisHome });
}

async function gatewayScheduleStore(options: GatewayOptions) {
  const config = await loadGatewayConfig(options);
  return new SqliteScheduleStore({ xenesisHome: config.xenesisHome });
}

function filterTasks(tasks: AgentTask[], query: GatewayTaskQuery = {}) {
  let filtered = tasks;
  if (query.status) filtered = filtered.filter((task) => task.status === query.status);
  if (query.taskId) filtered = filtered.filter((task) => task.id === query.taskId);
  if (query.label) filtered = filtered.filter((task) => containsQuery(task.label, query.label));
  if (query.handoffId) filtered = filtered.filter((task) => task.handoffId === query.handoffId);
  if (query.handoffTitle) filtered = filtered.filter((task) => containsQuery(task.handoffTitle, query.handoffTitle));
  if (query.source) filtered = filtered.filter((task) => containsQuery(task.source, query.source));
  if (query.subagent) filtered = filtered.filter((task) => containsQuery(task.subagent, query.subagent));
  return filtered;
}

async function listTasks(options: GatewayOptions, query: GatewayTaskQuery = {}) {
  const store = await gatewayTaskStore(options);
  const tasks = filterTasks(await store.list(), query);
  const sorted = tasks
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((task) => ({
      id: task.id,
      status: task.status,
      prompt: task.prompt,
      sessionId: task.sessionId,
      parentSessionId: task.parentSessionId,
      source: task.source,
      subagent: task.subagent,
      label: task.label,
      handoffId: task.handoffId,
      handoffTitle: task.handoffTitle,
      handoffOrder: task.handoffOrder,
      handoffTotal: task.handoffTotal,
      priority: task.priority,
      dependsOn: task.dependsOn,
      blockedBy: task.blockedBy,
      blockedReason: task.blockedReason,
      scheduleId: task.scheduleId,
      approvalMode: task.approvalMode,
      maxTurns: task.maxTurns,
      maxTokens: task.maxTokens,
      usage: task.usage,
      artifactId: task.artifactId,
      attempts: task.attempts,
      attemptHistory: task.attemptHistory,
      output: task.output,
      error: task.error,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      updatedAt: task.updatedAt
    }));
  return query.limit !== undefined && sorted.length > query.limit
    ? sorted.slice(0, query.limit)
    : sorted;
}

async function listAllAgentTasks(options: GatewayOptions) {
  return await (await gatewayTaskStore(options)).list();
}

async function createTask(options: GatewayOptions, input: CreateAgentTaskInput) {
  return await (await gatewayTaskStore(options)).create(input);
}

async function listSchedules(options: GatewayOptions) {
  return (await (await gatewayScheduleStore(options)).list())
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function createSchedule(options: GatewayOptions, input: CreateScheduleInput) {
  return await (await gatewayScheduleStore(options)).create(input);
}

async function updateSchedule(options: GatewayOptions, id: string, input: UpdateScheduleInput) {
  return await (await gatewayScheduleStore(options)).update(id, input);
}

async function removeSchedule(options: GatewayOptions, id: string) {
  await (await gatewayScheduleStore(options)).remove(id);
  return { ok: true, id };
}

function reportMatchesStatus(
  report: { exitCode: number; failed: number },
  status: GatewayReportStatus | undefined
) {
  if (!status) return true;
  const failed = report.exitCode !== 0 || report.failed > 0;
  return status === "failed" ? failed : !failed;
}

async function listReports(options: GatewayOptions, query: GatewayReportQuery = {}) {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env
  });
  const reportsDir = xenesisStatePath(config.xenesisHome, "reports");

  let files;
  try {
    files = await readdir(reportsDir, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }

  const reports = await Promise.all(
    files
      .filter((file) => file.isFile() && /^(smoke|scenario|connect|provider-live)-.+\.json$/.test(file.name))
      .map(async (file) => {
        const raw = await readFile(resolve(reportsDir, file.name), "utf8");
        const report = JSON.parse(raw) as {
          id: string;
          createdAt: string;
          exitCode: number;
          summary: { total: number; passed: number; failed: number };
        };
        return {
          kind: file.name.startsWith("provider-live-")
            ? "provider-live"
            : file.name.startsWith("scenario-")
              ? "scenario"
              : file.name.startsWith("connect-")
                ? "connect"
                : "smoke",
          id: report.id,
          createdAt: report.createdAt,
          exitCode: report.exitCode,
          passed: report.summary.passed,
          failed: report.summary.failed,
          total: report.summary.total
        };
      })
  );

  const sorted = reports
    .filter((report) => (!query.kind || report.kind === query.kind) && reportMatchesStatus(report, query.status))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return query.limit !== undefined && sorted.length > query.limit
    ? sorted.slice(0, query.limit)
    : sorted;
}

function summarizeTraceRunReport(report: RunReport) {
  if (!report.traceId) return undefined;
  return {
    id: report.id,
    sessionId: report.sessionId,
    traceId: report.traceId,
    createdAt: report.createdAt,
    status: report.status,
    phase: report.phase,
    turns: report.turns,
    eventCount: report.eventCount,
    messageCount: report.messageCount,
    toolCallCount: report.toolCallCount,
    toolResultCount: report.toolResultCount,
    ...(report.stages ? { stages: report.stages } : {}),
    ...(report.contextSources ? { contextSources: report.contextSources } : {}),
    ...(report.metrics ? { metrics: report.metrics } : {}),
    ...(report.toolPolicy ? { toolPolicy: report.toolPolicy } : {}),
    ...(report.toolRecovery ? { toolRecovery: report.toolRecovery } : {}),
    ...(report.handoffs ? { handoffs: report.handoffs } : {}),
    ...(report.workflowSteps ? { workflowSteps: report.workflowSteps } : {}),
    ...(report.verification ? {
      verification: {
        status: report.verification.status,
        commandCount: report.verification.commandCount,
        passed: report.verification.passed,
        failed: report.verification.failed,
        failedCommands: report.verification.results
          .filter((result) => !result.ok)
          .map((result) => result.command)
      }
    } : {})
  };
}

async function listAgentRunReports(options: GatewayOptions): Promise<RunReport[]> {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env
  });
  const reportsDir = xenesisStatePath(config.xenesisHome, "run_reports");

  let files;
  try {
    files = await readdir(reportsDir, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }

  return (await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith(".json"))
      .map(async (file) => JSON.parse(await readFile(resolve(reportsDir, file.name), "utf8")) as RunReport)
  )).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function listTraceRunReports(options: GatewayOptions) {
  const reports = (await listAgentRunReports(options)).map((report) => summarizeTraceRunReport(report));

  return reports
    .filter((report): report is NonNullable<typeof report> => report !== undefined)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function listRunReportsByTraceId(options: GatewayOptions, traceId: string) {
  return (await listTraceRunReports(options))
    .filter((report) => report.traceId === traceId);
}

type TraceDiagnosticStatus = "ok" | "warning" | "failed";

function reportFileName(kind: GatewayReportKind, id: string) {
  const normalized = id.endsWith(".json") ? id.slice(0, -".json".length) : id;
  return `${normalized.startsWith(`${kind}-`) ? normalized : `${kind}-${normalized}`}.json`;
}

async function readReportDetail(options: GatewayOptions, kind: GatewayReportKind, id: string) {
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env
  });
  const reportsDir = xenesisStatePath(config.xenesisHome, "reports");
  const fileName = reportFileName(kind, id);
  const path = resolve(reportsDir, fileName);

  try {
    const report = JSON.parse(await readFile(path, "utf8")) as { id?: string };
    return {
      kind,
      id: report.id ?? fileName.slice(0, -".json".length),
      path,
      report
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

function listActiveRuns(activeRuns: Map<string, ActiveGatewayRun>) {
  return Array.from(activeRuns.values())
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .map((run) => ({
      id: run.id,
      traceId: run.traceId,
      sessionId: run.sessionId,
      status: "running",
      prompt: run.prompt,
      workflow: run.workflow,
      startedAt: run.startedAt,
      workflowSteps: run.workflowSteps
    }));
}

function traceWorkflowSteps(
  reports: Awaited<ReturnType<typeof listRunReportsByTraceId>>,
  runs: ReturnType<typeof listActiveRuns>
) {
  return [
    ...reports.flatMap((report) => report.workflowSteps ?? []),
    ...runs.flatMap((run) => run.workflowSteps ?? [])
  ].sort((left, right) => {
    const leftTime = left.startedAt ?? "";
    const rightTime = right.startedAt ?? "";
    return leftTime.localeCompare(rightTime) || left.index - right.index;
  });
}

function taskWasRetried(task: AgentTask) {
  return (task.attempts ?? 0) > 1 || (task.attemptHistory?.length ?? 0) > 1;
}

function traceSessionIds(
  sessions: Awaited<ReturnType<typeof listTraceSessionData>>,
  reports: Awaited<ReturnType<typeof listRunReportsByTraceId>>
) {
  return new Set([
    ...sessions.map((session) => session.status.id),
    ...reports.map((report) => report.sessionId)
  ].filter((id): id is string => Boolean(id?.trim())));
}

function traceHandoffIds(reports: Awaited<ReturnType<typeof listRunReportsByTraceId>>) {
  return new Set(reports
    .flatMap((report) => report.handoffs ?? [])
    .map((handoff) => handoff.handoffId)
    .filter((handoffId): handoffId is string => Boolean(handoffId?.trim())));
}

function traceTasks(
  tasks: AgentTask[],
  sessions: Awaited<ReturnType<typeof listTraceSessionData>>,
  reports: Awaited<ReturnType<typeof listRunReportsByTraceId>>
) {
  const sessionIds = traceSessionIds(sessions, reports);
  const handoffIds = traceHandoffIds(reports);
  return tasks.filter((task) => (
    Boolean(task.parentSessionId && sessionIds.has(task.parentSessionId)) ||
    Boolean(task.handoffId && handoffIds.has(task.handoffId))
  ));
}

function summarizeTaskExecution(tasks: AgentTask[]) {
  const handoffIds = Array.from(new Set(tasks
    .map((task) => task.handoffId)
    .filter((handoffId): handoffId is string => Boolean(handoffId?.trim())))).sort();

  return {
    taskCount: tasks.length,
    handoffTaskCount: tasks.filter((task) => Boolean(task.handoffId)).length,
    queuedCount: tasks.filter((task) => task.status === "queued").length,
    runningCount: tasks.filter((task) => task.status === "running").length,
    completedCount: tasks.filter((task) => task.status === "completed").length,
    failedCount: tasks.filter((task) => task.status === "failed").length,
    cancelledCount: tasks.filter((task) => task.status === "cancelled").length,
    blockedCount: tasks.filter((task) => task.status === "blocked").length,
    retriedCount: tasks.filter(taskWasRetried).length,
    handoffIds
  };
}

function buildTraceDiagnostics(
  records: SessionLogRecord[],
  runReports: Awaited<ReturnType<typeof listRunReportsByTraceId>>,
  tasks: AgentTask[] = []
) {
  const providerRetries = records
    .filter((record): record is SessionLogRecord & { type: "provider_retry" } => record.type === "provider_retry")
    .map((record) => ({
      provider: record.provider,
      attempt: record.attempt,
      maxRetries: record.maxRetries,
      message: record.message
    }));
  const providerFallbacks = records
    .filter((record): record is SessionLogRecord & { type: "provider_fallback" } => record.type === "provider_fallback")
    .map((record) => ({
      from: record.from,
      to: record.to,
      message: record.message
    }));
  const failedToolCalls = records
    .filter((record): record is SessionLogRecord & { type: "tool_result"; ok: false } => (
      record.type === "tool_result" && !record.ok
    ))
    .map((record) => ({
      toolCallId: record.message.toolCallId,
      name: record.message.name,
      content: record.message.content
    }));
  const permissionIssues = records
    .filter((record): record is SessionLogRecord & { type: "permission_audit" } => (
      record.type === "permission_audit" && (record.status !== "allow" || record.hardDeny)
    ))
    .map((record) => ({
      toolCallId: record.toolCallId,
      name: record.name,
      status: record.status,
      reason: record.reason,
      riskLevel: record.riskLevel,
      summary: record.summary,
      hardDeny: record.hardDeny
    }));
  const toolPolicyIssues = records
    .filter((record): record is SessionLogRecord & { type: "tool_policy_audit" } => (
      record.type === "tool_policy_audit" && record.status === "deny"
    ))
    .map((record) => ({
      toolCallId: record.toolCallId,
      name: record.name,
      policyName: record.policyName,
      reason: record.reason,
      requiredBefore: record.requiredBefore,
      missingBefore: record.missingBefore,
      requiredBeforeAny: record.requiredBeforeAny ?? [],
      missingBeforeAny: record.missingBeforeAny ?? [],
      priorityTools: record.priorityTools ?? [],
      ...(record.nextAction ? { nextAction: record.nextAction } : {})
    }));
  const errorMessages = records
    .filter((record): record is SessionLogRecord & { type: "error" } => record.type === "error")
    .map((record) => record.message);
  const verificationReports = runReports
    .map((report) => report.verification)
    .filter((verification): verification is NonNullable<typeof verification> => verification !== undefined);
  const failedCommands = verificationReports.flatMap((verification) => verification.failedCommands);
  const verification = verificationReports.length > 0
    ? {
        status: failedCommands.length > 0 || verificationReports.some((report) => report.status === "failed")
          ? "failed"
          : verificationReports.at(-1)?.status ?? "unknown",
        commandCount: verificationReports.reduce((sum, report) => sum + report.commandCount, 0),
        passed: verificationReports.reduce((sum, report) => sum + report.passed, 0),
        failed: verificationReports.reduce((sum, report) => sum + report.failed, 0),
        failedCommands
      }
    : undefined;
  const handoffCount = runReports.reduce((sum, report) => sum + (report.metrics?.handoffCount ?? 0), 0);
  const handoffTaskCount = runReports.reduce((sum, report) => sum + (report.metrics?.handoffTaskCount ?? 0), 0);
  const handoffDependencyCount = runReports.reduce((sum, report) => (
    sum + (report.metrics?.handoffDependencyCount ?? 0)
  ), 0);
  const toolRecoveryItems = runReports.flatMap((report) => (
    report.toolRecovery?.items ?? []
  ).map((item) => ({
    sessionId: report.sessionId,
    ...(report.traceId ? { traceId: report.traceId } : {}),
    reportId: report.id,
    ...item
  })));
  const toolRecoveryHintCount = runReports.reduce((sum, report) => (
    sum + (report.metrics?.toolRecoveryHintCount ?? report.toolRecovery?.total ?? 0)
  ), 0);
  const toolRecoveryRecoveredCount = runReports.reduce((sum, report) => (
    sum + (report.metrics?.toolRecoveryRecoveredCount ?? report.toolRecovery?.recoveredCount ?? 0)
  ), 0);
  const toolRecoveryUnrecoveredCount = runReports.reduce((sum, report) => (
    sum + (report.metrics?.toolRecoveryUnrecoveredCount ?? report.toolRecovery?.unrecoveredCount ?? 0)
  ), 0);
  const taskExecution = summarizeTaskExecution(tasks);
  const hasFailure = (
    failedToolCalls.length > 0 ||
    permissionIssues.some((issue) => issue.status === "deny" || issue.hardDeny) ||
    toolPolicyIssues.length > 0 ||
    toolRecoveryUnrecoveredCount > 0 ||
    failedCommands.length > 0 ||
    errorMessages.length > 0 ||
    runReports.some((report) => report.status === "failed")
  );
  const hasWarning = providerRetries.length > 0 ||
    providerFallbacks.length > 0 ||
    permissionIssues.length > 0 ||
    toolRecoveryRecoveredCount > 0;
  const status: TraceDiagnosticStatus = hasFailure ? "failed" : hasWarning ? "warning" : "ok";

  return {
    status,
    retryCount: providerRetries.length,
    fallbackCount: providerFallbacks.length,
    failedToolCallCount: failedToolCalls.length,
    permissionIssueCount: permissionIssues.length,
    toolPolicyIssueCount: toolPolicyIssues.length,
    toolRecoveryHintCount,
    toolRecoveryRecoveredCount,
    toolRecoveryUnrecoveredCount,
    failedVerificationCount: failedCommands.length,
    errorCount: errorMessages.length,
    handoffCount,
    handoffTaskCount,
    handoffDependencyCount,
    taskExecution,
    providerRetries,
    providerFallbacks,
    failedToolCalls,
    permissionIssues,
    toolPolicyIssues,
    toolRecoveryItems,
    errors: errorMessages,
    ...(verification ? { verification } : {})
  };
}

function summarizeTraceStatus(traces: Array<{ diagnostics: { status: "ok" | "warning" | "failed" } }>) {
  const summary = {
    total: traces.length,
    failed: 0,
    warning: 0,
    ok: 0
  };
  for (const trace of traces) {
    if (trace.diagnostics.status === "failed") summary.failed += 1;
    else if (trace.diagnostics.status === "warning") summary.warning += 1;
    else summary.ok += 1;
  }
  return summary;
}

async function listTraceSummaries(
  options: GatewayOptions,
  activeRuns: Map<string, ActiveGatewayRun>,
  observabilityStore: GatewayObservabilityStore
) {
  const [sessionData, runReports, observabilityEvents, allTasks] = await Promise.all([
    listAllTraceSessionData(options),
    listTraceRunReports(options),
    observabilityStore.list(),
    listAllAgentTasks(options)
  ]);
  const activeRunList = listActiveRuns(activeRuns);
  const traceIds = new Set<string>();

  for (const session of sessionData) traceIds.add(session.traceId);
  for (const report of runReports) traceIds.add(report.traceId);
  for (const run of activeRunList) traceIds.add(run.traceId);
  for (const event of observabilityEvents) {
    if (event.traceId?.trim()) traceIds.add(event.traceId);
  }

  const traces = Array.from(traceIds).map((traceId) => {
    const sessions = sessionData.filter((session) => session.traceId === traceId);
    const reports = runReports.filter((report) => report.traceId === traceId);
    const runs = activeRunList.filter((run) => run.traceId === traceId);
    const events = observabilityEvents.filter((event) => event.traceId === traceId);
    const diagnostics = buildTraceDiagnostics(
      sessions.flatMap((session) => session.records),
      reports,
      traceTasks(allTasks, sessions, reports)
    );
    const updatedAt = [
      ...sessions.map((session) => session.status.updatedAt),
      ...reports.map((report) => report.createdAt),
      ...runs.map((run) => run.startedAt),
      ...events.map((event) => event.timestamp)
    ].sort().at(-1) ?? "";

    return {
      traceId,
      status: diagnostics.status,
      updatedAt,
      activeRunCount: runs.length,
      sessionCount: sessions.length,
      runReportCount: reports.length,
      observabilityEventCount: events.length,
      diagnostics
    };
  }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    traces,
    summary: summarizeTraceStatus(traces)
  };
}

async function readTraceDetail(
  options: GatewayOptions,
  activeRuns: Map<string, ActiveGatewayRun>,
  observabilityStore: GatewayObservabilityStore,
  traceId: string
) {
  const [sessionData, runReports, events, allTasks] = await Promise.all([
    listTraceSessionData(options, traceId),
    listRunReportsByTraceId(options, traceId),
    observabilityStore.list({ traceId }),
    listAllAgentTasks(options)
  ]);
  const records = sessionData.flatMap((session) => session.records);
  const activeRunList = listActiveRuns(activeRuns).filter((run) => run.traceId === traceId);
  const tasks = traceTasks(allTasks, sessionData, runReports);

  return {
    traceId,
    activeRuns: activeRunList,
    sessions: sessionData.map((session) => session.status),
    runReports,
    workflowSteps: traceWorkflowSteps(runReports, activeRunList),
    diagnostics: buildTraceDiagnostics(records, runReports, tasks),
    tasks,
    observability: {
      summary: summarizeObservabilityEvents(events),
      events
    }
  };
}

async function readTraceCompact(options: GatewayOptions, traceId: string) {
  const sessionData = await listTraceSessionData(options, traceId);
  return {
    traceId,
    sessions: sessionData.map((session) => ({
      id: session.status.id,
      status: session.status.status,
      phase: session.status.phase,
      updatedAt: session.status.updatedAt,
      compact: compactSessionEvents(session.records)
    }))
  };
}

async function readTraceBundle(
  options: GatewayOptions,
  activeRuns: Map<string, ActiveGatewayRun>,
  observabilityStore: GatewayObservabilityStore,
  traceId: string
) {
  const [detail, compact] = await Promise.all([
    readTraceDetail(options, activeRuns, observabilityStore, traceId),
    readTraceCompact(options, traceId)
  ]);
  return {
    traceId,
    exportedAt: new Date().toISOString(),
    detail,
    compact
  };
}

function summarizeTaskStatuses(tasks: Awaited<ReturnType<typeof listTasks>>) {
  const summary = {
    total: tasks.length,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    blocked: 0,
    retried: 0
  };
  for (const task of tasks) {
    summary[task.status] += 1;
    if ((task.attempts ?? 0) > 1 || (task.attemptHistory?.length ?? 0) > 1) summary.retried += 1;
  }
  return summary;
}

function summarizeRunReportQuality(reports: RunReport[]) {
  const withMetrics = reports.filter((report) => report.metrics);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const average = (values: number[]) => values.length > 0 ? sum(values) / values.length : 0;

  return {
    total: reports.length,
    measured: withMetrics.length,
    success: withMetrics.filter((report) => report.metrics.success).length,
    blocked: withMetrics.filter((report) => report.metrics.blocked).length,
    verificationPassed: withMetrics.filter((report) => report.metrics.verificationPassed === true).length,
    verificationFailed: withMetrics.filter((report) => report.metrics.verificationPassed === false).length,
    repairAttemptCount: sum(withMetrics.map((report) => report.metrics.repairAttemptCount)),
    averageToolFailureRate: average(withMetrics.map((report) => report.metrics.toolFailureRate)),
    averageShellUsageRatio: average(withMetrics.map((report) => report.metrics.shellUsageRatio)),
    contextCompactCount: sum(withMetrics.map((report) => report.metrics.contextCompactCount)),
    toolRecoveryHintCount: sum(withMetrics.map((report) => report.metrics.toolRecoveryHintCount ?? 0)),
    toolRecoveryRecoveredCount: sum(withMetrics.map((report) => report.metrics.toolRecoveryRecoveredCount ?? 0)),
    toolRecoveryUnrecoveredCount: sum(withMetrics.map((report) => report.metrics.toolRecoveryUnrecoveredCount ?? 0)),
    handoffRunCount: withMetrics.filter((report) => report.metrics.handoffUsed).length,
    handoffCount: sum(withMetrics.map((report) => report.metrics.handoffCount ?? 0)),
    handoffTaskCount: sum(withMetrics.map((report) => report.metrics.handoffTaskCount ?? 0)),
    handoffDependencyCount: sum(withMetrics.map((report) => report.metrics.handoffDependencyCount ?? 0))
  };
}

function summarizeDecisionTraceStatus(reports: RunReport[]) {
  const latest = reports
    .flatMap((report) => (report.decisionTrace ?? []).map((decision) => ({
      sessionId: report.sessionId,
      ...(report.traceId ? { traceId: report.traceId } : {}),
      reportId: report.id,
      createdAt: report.createdAt,
      ...decision
    })))
    .slice(0, 20);

  return {
    total: reports.reduce((sum, report) => sum + (report.decisionTrace?.length ?? 0), 0),
    latest
  };
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort((left, right) => left.localeCompare(right));
}

function uniqueInOrder(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function summarizeTopFailedTools(reports: RunReport[]) {
  const summaries = new Map<string, {
    name: string;
    calls: number;
    failures: number;
    runCount: number;
    latestSessionId?: string;
    latestTraceId?: string;
  }>();

  for (const report of reports) {
    for (const tool of report.tools ?? []) {
      if ((tool.failures ?? 0) <= 0) continue;
      const summary = summaries.get(tool.name) ?? {
        name: tool.name,
        calls: 0,
        failures: 0,
        runCount: 0
      };
      summary.calls += tool.calls ?? 0;
      summary.failures += tool.failures ?? 0;
      summary.runCount += 1;
      summary.latestSessionId ??= report.sessionId;
      if (report.traceId) summary.latestTraceId ??= report.traceId;
      summaries.set(tool.name, summary);
    }
  }

  return Array.from(summaries.values())
    .sort((left, right) => (
      right.failures - left.failures ||
      right.runCount - left.runCount ||
      left.name.localeCompare(right.name)
    ))
    .slice(0, 10);
}

function isBlockedRepairDecision(decision: NonNullable<RunReport["decisionTrace"]>[number]) {
  if (decision.kind !== "repair") return false;
  return decision.status === "blocked" ||
    decision.title.toLowerCase().includes("blocked") ||
    decision.reason.toLowerCase().includes("blocked");
}

function summarizeRepairStopReasons(reports: RunReport[]) {
  const summaries = new Map<string, {
    reason: string;
    count: number;
    failedCommands: string[];
    latestSessionId?: string;
    latestTraceId?: string;
  }>();

  for (const report of reports) {
    for (const decision of report.decisionTrace ?? []) {
      if (!isBlockedRepairDecision(decision)) continue;
      const summary = summaries.get(decision.reason) ?? {
        reason: decision.reason,
        count: 0,
        failedCommands: []
      };
      summary.count += 1;
      summary.failedCommands = uniqueInOrder([
        ...summary.failedCommands,
        ...(decision.related ?? [])
      ]);
      summary.latestSessionId ??= report.sessionId;
      if (report.traceId) summary.latestTraceId ??= report.traceId;
      summaries.set(decision.reason, summary);
    }
  }

  return Array.from(summaries.values())
    .sort((left, right) => (
      right.count - left.count ||
      left.reason.localeCompare(right.reason)
    ))
    .slice(0, 10);
}

function summarizeHandoffBottlenecks(tasks: Awaited<ReturnType<typeof listTasks>>) {
  const summaries = new Map<string, {
    handoffId: string;
    title?: string;
    total: number;
    queued: number;
    running: number;
    blocked: number;
    failed: number;
    completed: number;
    cancelled: number;
    active: number;
    labels: string[];
    blockedReasons: string[];
  }>();

  for (const task of tasks) {
    if (!task.handoffId) continue;
    const summary = summaries.get(task.handoffId) ?? {
      handoffId: task.handoffId,
      ...(task.handoffTitle ? { title: task.handoffTitle } : {}),
      total: 0,
      queued: 0,
      running: 0,
      blocked: 0,
      failed: 0,
      completed: 0,
      cancelled: 0,
      active: 0,
      labels: [],
      blockedReasons: []
    };

    summary.total += 1;
    if (task.status === "queued") summary.queued += 1;
    if (task.status === "running") summary.running += 1;
    if (task.status === "blocked") summary.blocked += 1;
    if (task.status === "failed") summary.failed += 1;
    if (task.status === "completed") summary.completed += 1;
    if (task.status === "cancelled") summary.cancelled += 1;
    if (task.status !== "completed" && task.status !== "cancelled") summary.active += 1;
    if (task.label) summary.labels.push(task.label);
    if (task.blockedReason) summary.blockedReasons.push(task.blockedReason);
    if (!summary.title && task.handoffTitle) summary.title = task.handoffTitle;
    summaries.set(task.handoffId, summary);
  }

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      labels: uniqueSorted(summary.labels),
      blockedReasons: uniqueSorted(summary.blockedReasons)
    }))
    .filter((summary) => summary.active > 0)
    .sort((left, right) => (
      right.blocked - left.blocked ||
      right.active - left.active ||
      right.failed - left.failed ||
      left.handoffId.localeCompare(right.handoffId)
    ))
    .slice(0, 10);
}

function summarizeToolRecoveryPatterns(reports: RunReport[]) {
  const summaries = new Map<string, {
    kind: NonNullable<RunReport["toolRecovery"]>["items"][number]["kind"];
    count: number;
    recoveredCount: number;
    unrecoveredCount: number;
    tools: string[];
    nextActions: string[];
    latestSessionId?: string;
    latestTraceId?: string;
  }>();

  for (const report of reports) {
    for (const item of report.toolRecovery?.items ?? []) {
      const summary = summaries.get(item.kind) ?? {
        kind: item.kind,
        count: 0,
        recoveredCount: 0,
        unrecoveredCount: 0,
        tools: [],
        nextActions: []
      };
      summary.count += 1;
      if (item.recovered) summary.recoveredCount += 1;
      else summary.unrecoveredCount += 1;
      summary.tools.push(item.toolName);
      if (item.nextAction) summary.nextActions.push(item.nextAction);
      summary.latestSessionId ??= report.sessionId;
      if (report.traceId) summary.latestTraceId ??= report.traceId;
      summaries.set(item.kind, summary);
    }
  }

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      tools: uniqueSorted(summary.tools),
      nextActions: uniqueSorted(summary.nextActions)
    }))
    .sort((left, right) => (
      right.unrecoveredCount - left.unrecoveredCount ||
      right.count - left.count ||
      left.kind.localeCompare(right.kind)
    ))
    .slice(0, 10);
}

function summarizeDiagnosticInsights(
  reports: RunReport[],
  tasks: Awaited<ReturnType<typeof listTasks>>
) {
  const failurePatterns = {
    topFailedTools: summarizeTopFailedTools(reports),
    repairStopReasons: summarizeRepairStopReasons(reports),
    handoffBottlenecks: summarizeHandoffBottlenecks(tasks),
    toolRecoveryPatterns: summarizeToolRecoveryPatterns(reports)
  };
  return {
    failurePatterns,
    adaptivePolicy: buildAdaptiveExecutionPolicy(failurePatterns)
  };
}

function summarizeGatewayWorkflowStatus(workflows: GatewayWorkflowSummary[]) {
  const defaultWorkflow = workflows.find((workflow) => (
    (workflow.metadata as { defaultWorkflow?: unknown } | undefined)?.defaultWorkflow === true
  )) ?? workflows.find((workflow) => workflow.name === "xenis");
  const metadata = defaultWorkflow?.metadata as {
    role?: unknown;
    operatingModel?: unknown;
    bridge?: unknown;
  } | undefined;

  return {
    total: workflows.length,
    default: defaultWorkflow?.name ?? null,
    orchestration: metadata ? {
      role: metadata.role,
      operatingModel: metadata.operatingModel,
      bridge: metadata.bridge
    } : null
  };
}

async function gatewayStatus(
  options: GatewayOptions,
  activeRuns: Map<string, ActiveGatewayRun>,
  observabilityStore: GatewayObservabilityStore,
  channels: GatewayChannelRuntime = { managers: [], health: {} }
) {
  const config = await loadGatewayConfig(options);
  const env = options.env ?? process.env;
  const [tasks, reports, sessions, runReports, workflows, operationalFailures] = await Promise.all([
    listTasks(options),
    listReports(options),
    listSessionStatuses(options),
    listAgentRunReports(options),
    loadGatewayWorkflows(options).then((loaded) => listGatewayWorkflows(loaded)),
    collectOperationalFailureContext(config)
  ]);
  return {
    ok: true,
    service: "xenesis-gateway",
    activeRuns: activeRuns.size,
    tasks: summarizeTaskStatuses(tasks),
    workflows: summarizeGatewayWorkflowStatus(workflows),
    channels: summarizeGatewayChannels(config, env, channels.health),
    sessions: {
      total: sessions.length
    },
    observability: await observabilityStore.summary(),
    quality: summarizeRunReportQuality(runReports),
    decisions: summarizeDecisionTraceStatus(runReports),
    diagnostics: summarizeDiagnosticInsights(runReports, tasks),
    reports: {
      total: reports.length,
      latest: reports[0] ?? null
    },
    operationalFailures
  };
}

async function runPromptJson(
  options: GatewayOptions,
  activeRuns: Map<string, ActiveGatewayRun>,
  observabilityStore: GatewayObservabilityStore,
  body: GatewayWorkflowBody
) {
  ensureRunCapacity(options, activeRuns);
  const workflow = await resolveGatewayWorkflow({
    body,
    stream: false,
    env: options.env ?? process.env
  }, await loadGatewayWorkflows(options));
  const workflowSummary = summarizeGatewayWorkflow(workflow);
  const id = createRunId();
  const traceId = createTraceId();
  const controller = new AbortController();
  const stdout: string[] = [];
  const events: AgentRunEvent[] = [];
  let sessionId: string | undefined;
  const runPipeline = options.runPipeline ?? options.runAgent ?? runAgentPipeline;
  const workflowSteps: GatewayWorkflowStepRun[] = [];

  activeRuns.set(id, {
    id,
    traceId,
    controller,
    startedAt: new Date().toISOString(),
    prompt: body.prompt,
    workflow: workflowSummary,
    workflowSteps
  });
  await observabilityStore.record([{
    kind: "request",
    method: "POST",
    path: "/run",
    attempt: 0,
    traceId,
    runId: id
  }]);

  try {
    let exitCode = 0;
    let previousContent: string | undefined;
    const steps = gatewayWorkflowSteps(workflow);
    const hasExplicitSteps = workflow.steps !== undefined;

    for (let index = 0; index < steps.length; index += 1) {
      if (controller.signal.aborted) break;
      const step = steps[index];
      const prompt = formatGatewayStepPrompt(workflow, step, previousContent);
      const beforeEventCount = events.length;
      const stepRun = gatewayWorkflowStepRun(workflowSummary, step, index, steps.length);
      if (hasExplicitSteps) {
        workflowSteps.push(stepRun);
        stdout.push(`workflow step ${index + 1}/${steps.length}: ${step.name}`);
      }
      let result: AgentRunPipelineResult;
      try {
        result = await runPipeline({
          cwd: options.cwd,
          configPath: workflow.configPath ?? options.configPath,
          env: options.env,
          cli: gatewayCliOverrides(options),
          prompt,
          abortSignal: controller.signal,
          ideContext: workflow.ideContext,
          traceId,
          ...gatewayStepPipeline(workflow, step),
          ...(hasExplicitSteps ? {
            workflowStep: {
              workflow: stepRun.workflow,
              step: stepRun.step,
              index: stepRun.index,
              total: stepRun.total,
              startedAt: stepRun.startedAt
            }
          } : {}),
          onSessionWriter: (_writer, createdSessionId) => {
            sessionId = createdSessionId;
            const activeRun = activeRuns.get(id);
            if (activeRun) activeRun.sessionId = createdSessionId;
          },
          onEvent: (event) => {
            if (!isGatewayClientEvent(event)) return;
            stdout.push(JSON.stringify(event));
            events.push(event);
          },
          onNotice: (line) => {
            stdout.push(line);
          }
        });
      } catch (error) {
        if (hasExplicitSteps) failGatewayWorkflowStepRun(stepRun, error);
        throw error;
      }
      if (hasExplicitSteps) completeGatewayWorkflowStepRun(stepRun, result);
      if (events.length === beforeEventCount && result.events.length > 0) {
        const clientEvents = result.events.filter(isGatewayClientEvent);
        events.push(...clientEvents);
        stdout.push(...clientEvents.map((event) => JSON.stringify(event)));
      }
      sessionId = result.sessionId;
      const activeRun = activeRuns.get(id);
      if (activeRun) activeRun.sessionId = result.sessionId;
      previousContent = result.doneContent ?? previousContent;
      exitCode = result.exitCode;
      if (result.exitCode !== 0) break;
    }

    return {
      id,
      traceId,
      workflow: workflowSummary,
      sessionId,
      exitCode,
      events,
      workflowSteps,
      output: stdout.join("\n"),
      errors: ""
    };
  } finally {
    activeRuns.delete(id);
  }
}

async function streamPrompt(
  options: GatewayOptions,
  activeRuns: Map<string, ActiveGatewayRun>,
  observabilityStore: GatewayObservabilityStore,
  body: GatewayWorkflowBody,
  request: IncomingMessage,
  response: ServerResponse
) {
  ensureRunCapacity(options, activeRuns);
  const workflow = await resolveGatewayWorkflow({
    body,
    stream: true,
    env: options.env ?? process.env
  }, await loadGatewayWorkflows(options));
  const workflowSummary = summarizeGatewayWorkflow(workflow);
  const id = createRunId();
  const traceId = createTraceId();
  const controller = new AbortController();
  const errors: string[] = [];
  let completed = false;
  let sessionId: string | undefined;
  let emittedEventCount = 0;
  const runPipeline = options.runPipeline ?? options.runAgent ?? runAgentPipeline;
  const workflowSteps: GatewayWorkflowStepRun[] = [];

  activeRuns.set(id, {
    id,
    traceId,
    controller,
    startedAt: new Date().toISOString(),
    prompt: body.prompt,
    workflow: workflowSummary,
    workflowSteps
  });
  await observabilityStore.record([{
    kind: "request",
    method: "POST",
    path: "/run/stream",
    attempt: 0,
    traceId,
    runId: id
  }]);

  response.writeHead(200, {
    ...contentType("text/event-stream; charset=utf-8"),
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive"
  });
  response.flushHeaders();
  writeSse(response, "gateway_run", { id, traceId, workflow: workflowSummary });

  response.on("close", () => {
    if (!completed) controller.abort();
  });
  request.on("aborted", () => controller.abort());

  try {
    let exitCode = 0;
    let previousContent: string | undefined;
    const steps = gatewayWorkflowSteps(workflow);
    const hasExplicitSteps = workflow.steps !== undefined;

    for (let index = 0; index < steps.length; index += 1) {
      if (controller.signal.aborted) break;
      const step = steps[index];
      const prompt = formatGatewayStepPrompt(workflow, step, previousContent);
      const beforeEventCount = emittedEventCount;
      const stepRun = gatewayWorkflowStepRun(workflowSummary, step, index, steps.length);
      if (hasExplicitSteps) {
        workflowSteps.push(stepRun);
        writeSse(response, "gateway_workflow_step", {
          id,
          traceId,
          ...stepRun
        });
      }
      let result: AgentRunPipelineResult;
      try {
        result = await runPipeline({
          cwd: options.cwd,
          configPath: workflow.configPath ?? options.configPath,
          env: options.env,
          cli: gatewayCliOverrides(options),
          prompt,
          abortSignal: controller.signal,
          ideContext: workflow.ideContext,
          traceId,
          ...gatewayStepPipeline(workflow, step),
          ...(hasExplicitSteps ? {
            workflowStep: {
              workflow: stepRun.workflow,
              step: stepRun.step,
              index: stepRun.index,
              total: stepRun.total,
              startedAt: stepRun.startedAt
            }
          } : {}),
          onSessionWriter: (_writer, createdSessionId) => {
            sessionId = createdSessionId;
            const activeRun = activeRuns.get(id);
            if (activeRun) activeRun.sessionId = createdSessionId;
          },
          onEvent: (event) => {
            if (!isGatewayClientEvent(event)) return;
            emittedEventCount += 1;
            writeSse(response, event.type, event);
          },
          onNotice: (line) => {
            writeSse(response, "output", { line });
          }
        });
      } catch (error) {
        if (hasExplicitSteps) {
          failGatewayWorkflowStepRun(stepRun, error);
          writeSse(response, "gateway_workflow_step", {
            id,
            traceId,
            ...stepRun
          });
        }
        throw error;
      }
      if (hasExplicitSteps) {
        completeGatewayWorkflowStepRun(stepRun, result);
        writeSse(response, "gateway_workflow_step", {
          id,
          traceId,
          ...stepRun
        });
      }
      if (emittedEventCount === beforeEventCount) {
        for (const event of result.events.filter(isGatewayClientEvent)) {
          emittedEventCount += 1;
          writeSse(response, event.type, event);
        }
      }
      sessionId = result.sessionId;
      const activeRun = activeRuns.get(id);
      if (activeRun) activeRun.sessionId = result.sessionId;
      previousContent = result.doneContent ?? previousContent;
      exitCode = result.exitCode;
      if (result.exitCode !== 0) break;
    }

    completed = true;
    writeSse(response, "gateway_done", {
      id,
      traceId,
      workflow: workflowSummary,
      sessionId,
      exitCode,
      workflowSteps,
      errors: errors.join("\n")
    });
    response.end();
  } catch (error) {
    completed = true;
    const message = error instanceof Error ? error.message : String(error);
    writeSse(response, "gateway_error", { id, error: message });
    response.end();
  } finally {
    activeRuns.delete(id);
  }
}

async function createGatewayWorker(options: GatewayOptions, observabilityStore: GatewayObservabilityStore) {
  const config = await loadGatewayConfig(options);
  if (options.worker === false || !config.worker.enabled) return undefined;

  const taskStore = new SqliteAgentTaskStore({ xenesisHome: config.xenesisHome });
  const durableScheduleStore = new SqliteScheduleStore({ xenesisHome: config.xenesisHome });
  const scheduleStore = new CombinedScheduleStore([
    durableScheduleStore,
    new SessionScheduleStore({ scope: config.xenesisHome })
  ]);
  const scheduler = new TaskScheduler({
    scheduleStore,
    taskStore
  });
  const workerIsolation = decideWorkerIsolation({
    isGit: await isGitRepo(options.cwd),
    autoIsolateConcurrent: config.isolation.autoIsolateConcurrent,
    concurrency: config.worker.concurrency
  });
  const worker = new TaskWorker({
    taskStore,
    executor: createPipelineTaskExecutor({
      cwd: options.cwd,
      configPath: options.configPath,
      env: options.env,
      secretEnvNames: collectSecretEnvNames(config),
      cli: options.cli ?? gatewayCliOverrides(options),
      defaults: config.worker.defaults,
      xenesisHome: config.xenesisHome,
      isolation: config.isolation,
      autoIsolate: workerIsolation.autoIsolateTasks
    }),
    concurrency: workerIsolation.effectiveConcurrency,
    pollIntervalMs: config.worker.pollIntervalMs,
    onTick: async () => {
      await scheduler.tick();
    },
    onTaskEvent: async (event) => {
      await recordTaskWorkerEvent(options, observabilityStore, event);
    }
  });

  await worker.start();
  return worker;
}

type LoadedGatewayConfig = Awaited<ReturnType<typeof loadGatewayConfig>>;
type GatewayChannelGuardrails = {
  approvalMode: ApprovalMode;
  maxTurns: number;
  maxTokens: number;
};

interface GatewayChannelRuntime {
  managers: ChannelManager[];
  slack?: SlackAdapter;
  health: GatewayChannelRuntimeHealthMap;
}

type GatewayChannelName = ChannelDiagnostic["name"];
type GatewayChannelRuntimeStatus = "disabled" | "blocked" | "ready" | "error";

interface GatewayChannelRuntimeIssue {
  at: string;
  message: string;
}

interface GatewayChannelRuntimeHealth {
  runtimeStatus: GatewayChannelRuntimeStatus;
  lastError?: GatewayChannelRuntimeIssue;
  lastRecordedErrorAt?: number;
}

type GatewayChannelRuntimeHealthMap = Partial<Record<GatewayChannelName, GatewayChannelRuntimeHealth>>;

const ENV_REFERENCE_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

function resolveChannelSecret(env: NodeJS.ProcessEnv, reference: string, label: string) {
  const normalized = reference.trim();
  if (!normalized) throw new Error(`${label} channel enabled but credential reference is empty.`);
  if (!ENV_REFERENCE_PATTERN.test(normalized)) return normalized;
  const value = env[normalized];
  if (!value) throw new Error(`${label} channel enabled but env ${normalized} is not set.`);
  return value;
}

function recordGatewayChannelRuntimeError(
  health: GatewayChannelRuntimeHealthMap,
  channel: GatewayChannelName,
  message: string,
  observabilityStore?: GatewayObservabilityStore
) {
  const now = Date.now();
  const previous = health[channel]?.lastError;
  health[channel] = {
    runtimeStatus: "error",
    lastError: {
      at: new Date(now).toISOString(),
      message
    },
    lastRecordedErrorAt: health[channel]?.lastRecordedErrorAt
  };

  const shouldRecord = !previous ||
    previous.message !== message ||
    now - (health[channel]?.lastRecordedErrorAt ?? 0) > 60_000;
  if (!shouldRecord) return;

  health[channel] = {
    ...health[channel],
    lastRecordedErrorAt: now
  };
  void observabilityStore?.record([{
    kind: "error",
    phase: `channel:${channel}`,
    label: `${channel} channel runtime`,
    error: message
  }]).catch(() => undefined);
}

function gatewayChannelRuntimeStatus(diagnostic: ChannelDiagnostic, health: GatewayChannelRuntimeHealth | undefined) {
  if (!diagnostic.enabled) return "disabled";
  if (health?.lastError) return "error";
  return diagnostic.ready ? "ready" : "blocked";
}

function summarizeGatewayChannels(
  config: LoadedGatewayConfig,
  env: NodeJS.ProcessEnv,
  health: GatewayChannelRuntimeHealthMap
) {
  const summary = summarizeChannelDiagnostics(config.channels, env);
  const items = summary.channels.map((diagnostic) => {
    const runtimeHealth = health[diagnostic.name];
    const runtimeStatus = gatewayChannelRuntimeStatus(diagnostic, runtimeHealth);
    const ready = diagnostic.ready && runtimeStatus !== "error";
    return {
      ...diagnostic,
      ready,
      safeToDeliver: diagnostic.safeToDeliver && ready,
      runtimeStatus,
      ...(runtimeHealth?.lastError ? { lastError: runtimeHealth.lastError } : {})
    };
  });
  return {
    total: items.length,
    enabled: items.filter((channel) => channel.enabled).length,
    ready: items.filter((channel) => channel.ready).length,
    blocked: items.filter((channel) => channel.enabled && !channel.ready).length,
    disabled: items.filter((channel) => !channel.enabled).length,
    items,
    ...Object.fromEntries(items.map((channel) => [channel.name, channel]))
  };
}

function createManagedChannel(
  options: GatewayOptions,
  config: LoadedGatewayConfig,
  adapter: ChannelAdapter,
  guardrails: GatewayChannelGuardrails
) {
  return new ChannelManager({
    adapter,
    sessionStore: new SqliteChannelSessionStore({ xenesisHome: config.xenesisHome }),
    runPrompt: createChannelPipelineRunner({
      cwd: options.cwd,
      env: options.env,
      configPath: options.configPath,
      cli: options.cli ?? gatewayCliOverrides(options),
      xenesisHome: config.xenesisHome,
      channel: guardrails,
      runPipeline: options.runPipeline ?? options.runAgent ?? runAgentPipeline
    }),
    commandRouters: [
      new RemoteDeskSessionManager({
        bridge: createRemoteDeskBridgeFromEnv(options.env ?? process.env)
      })
    ]
  });
}

async function createGatewayChannelRuntime(
  options: GatewayOptions,
  observabilityStore?: GatewayObservabilityStore
): Promise<GatewayChannelRuntime> {
  if (options.worker === false) return { managers: [], health: {} };

  const config = await loadGatewayConfig(options);
  const env = options.env ?? process.env;
  const managers: ChannelManager[] = [];
  const health: GatewayChannelRuntimeHealthMap = {};
  let slackAdapter: SlackAdapter | undefined;

  const telegram = config.channels.telegram;
  if (telegram?.enabled) {
    const token = resolveChannelSecret(env, telegram.tokenEnv, "Telegram");
    if (telegram.allowedChatIds.length === 0) {
      throw new Error("Telegram channel enabled but allowedChatIds is empty - refusing to start.");
    }

    managers.push(createManagedChannel(
      options,
      config,
      new TelegramAdapter({
        token,
        allowedChatIds: telegram.allowedChatIds,
        fetchImpl: options.channelFetch,
        logger: (message) => recordGatewayChannelRuntimeError(health, "telegram", message, observabilityStore),
        sendLogger: createChannelSendLogWriter(config.xenesisHome, "telegram")
      }),
      {
        approvalMode: telegram.approvalMode,
        maxTurns: telegram.maxTurns,
        maxTokens: telegram.maxTokens
      }
    ));
  }

  const slack = config.channels.slack;
  if (slack?.enabled) {
    const botToken = resolveChannelSecret(env, slack.botTokenEnv, "Slack");
    const signingSecret = resolveChannelSecret(env, slack.signingSecretEnv, "Slack");
    if (slack.allowedChannelIds.length === 0) {
      throw new Error("Slack channel enabled but allowedChannelIds is empty - refusing to start.");
    }

    slackAdapter = new SlackAdapter({
      botToken,
      signingSecret,
      allowedChannelIds: slack.allowedChannelIds,
      webhookUrl: env[slack.webhookUrlEnv],
      fetchImpl: options.channelFetch
    });
    managers.push(createManagedChannel(
      options,
      config,
      slackAdapter,
      {
        approvalMode: slack.approvalMode,
        maxTurns: slack.maxTurns,
        maxTokens: slack.maxTokens
      }
    ));
  }

  const discord = config.channels.discord;
  if (discord?.enabled) {
    const botToken = resolveChannelSecret(env, discord.botTokenEnv, "Discord");
    if (discord.allowedChannelIds.length === 0) {
      throw new Error("Discord channel enabled but allowedChannelIds is empty - refusing to start.");
    }

    managers.push(createManagedChannel(
      options,
      config,
      new DiscordAdapter({
        botToken,
        allowedChannelIds: discord.allowedChannelIds,
        allowedGuildIds: discord.allowedGuildIds,
        webhookUrl: env[discord.webhookUrlEnv],
        fetchImpl: options.channelFetch,
        webSocketFactory: options.discordWebSocketFactory
      }),
      {
        approvalMode: discord.approvalMode,
        maxTurns: discord.maxTurns,
        maxTokens: discord.maxTokens
      }
    ));
  }

  const webhook = config.channels.webhook;
  if (webhook?.enabled) {
    managers.push(createManagedChannel(
      options,
      config,
      new WebhookAdapter({
        url: resolveChannelSecret(env, webhook.urlEnv, "Webhook"),
        headers: webhook.headers
      }),
      {
        approvalMode: webhook.approvalMode,
        maxTurns: webhook.maxTurns,
        maxTokens: webhook.maxTokens
      }
    ));
  }

  return {
    managers,
    slack: slackAdapter,
    health
  };
}

export function createGatewayServer(
  options: GatewayOptions,
  channels: GatewayChannelRuntime = { managers: [], health: {} },
  observabilityStore = createGatewayObservabilityStore(options)
): Server {
  const authTokenWasConfigured = Boolean(options.authToken);
  __test_ensureGatewayAuthToken(options);
  (options as GatewayOptions & { authTokenGenerated?: boolean }).authTokenGenerated = !authTokenWasConfigured;
  const activeRuns = new Map<string, ActiveGatewayRun>();
  const bodyLimit = options.maxBodyBytes ?? maxBodyBytes;
  const requestTimeoutMs = options.requestTimeoutMs ?? defaultRequestTimeoutMs;

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    try {
      if (requestTimeoutMs > 0) {
        request.setTimeout(requestTimeoutMs, () => {
          request.destroy(new GatewayHttpError(408, "Request timed out."));
        });
      }
      if (!applyCors(options, request, response)) {
        writeJson(response, 403, { error: "Origin not allowed" });
        return;
      }
      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }

      if (url.pathname === "/channels/slack/events") {
        if (request.method !== "POST") {
          writeMethodNotAllowed(response);
          return;
        }
        if (!channels.slack) {
          writeJson(response, 404, { error: "Slack channel is not enabled." });
          return;
        }
        const result = await channels.slack.handleEventRequest(request.headers, await readRawBody(request, bodyLimit));
        writeSlackEventResponse(response, result);
        return;
      }

      if (url.pathname === "/channels/slack/interactions") {
        if (request.method !== "POST") {
          writeMethodNotAllowed(response);
          return;
        }
        if (!channels.slack) {
          writeJson(response, 404, { error: "Slack channel is not enabled." });
          return;
        }
        const result = await channels.slack.handleInteractionRequest(request.headers, await readRawBody(request, bodyLimit));
        writeSlackEventResponse(response, result);
        return;
      }

      if (!authorizeGatewayRequest(options, request, url)) {
        writeJson(response, 401, { error: "Unauthorized" });
        return;
      }

      if (request.method === "GET" && url.pathname === "/health") {
        writeJson(response, 200, {
          ok: true,
          service: "xenesis-gateway",
          dashboard: "/dashboard"
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/status") {
        writeJson(response, 200, await gatewayStatus(options, activeRuns, observabilityStore, channels));
        return;
      }

      if (request.method === "GET" && url.pathname === "/dashboard") {
        response.writeHead(200, contentType("text/html; charset=utf-8"));
        response.end(renderDashboardHtml());
        return;
      }

      if (request.method === "GET" && url.pathname === "/openapi.json") {
        writeJson(response, 200, gatewayOpenApiSpec);
        return;
      }

      if (request.method === "GET" && url.pathname === "/workflows") {
        writeJson(response, 200, { workflows: listGatewayWorkflows(await loadGatewayWorkflows(options)) });
        return;
      }

      if (request.method === "GET" && url.pathname === "/sessions") {
        writeJson(response, 200, { sessions: await listSessions(options) });
        return;
      }

      if (request.method === "GET" && url.pathname === "/sessions/status") {
        writeJson(response, 200, { sessions: await listSessionStatuses(options) });
        return;
      }

      if (request.method === "GET" && url.pathname === "/traces") {
        writeJson(response, 200, await listTraceSummaries(options, activeRuns, observabilityStore));
        return;
      }

      const traceActionMatch = url.pathname.match(/^\/traces\/([^/]+)\/(compact|bundle)$/);
      if (request.method === "GET" && traceActionMatch) {
        const traceId = decodeURIComponent(traceActionMatch[1]);
        if (!traceId.trim()) {
          writeJson(response, 400, { error: "Trace id is required." });
          return;
        }
        const action = traceActionMatch[2];
        writeJson(response, 200, action === "compact"
          ? await readTraceCompact(options, traceId)
          : await readTraceBundle(options, activeRuns, observabilityStore, traceId));
        return;
      }

      const traceMatch = url.pathname.match(/^\/traces\/([^/]+)$/);
      if (request.method === "GET" && traceMatch) {
        const traceId = decodeURIComponent(traceMatch[1]);
        if (!traceId.trim()) {
          writeJson(response, 400, { error: "Trace id is required." });
          return;
        }
        writeJson(response, 200, await readTraceDetail(options, activeRuns, observabilityStore, traceId));
        return;
      }

      if (request.method === "GET" && url.pathname === "/context") {
        writeJson(response, 200, await readContextIndex(options));
        return;
      }

      if (request.method === "GET" && url.pathname === "/artifacts") {
        writeJson(response, 200, { artifacts: await listArtifacts(options) });
        return;
      }

      const artifactMatch = url.pathname.match(/^\/artifacts\/([^/]+)$/);
      if (request.method === "GET" && artifactMatch) {
        const artifact = await readArtifact(options, decodeURIComponent(artifactMatch[1]));
        if (!artifact) {
          writeJson(response, 404, { error: `Artifact not found: ${decodeURIComponent(artifactMatch[1])}` });
          return;
        }
        writeJson(response, 200, artifact);
        return;
      }

      if (request.method === "GET" && url.pathname === "/tasks") {
        writeJson(response, 200, { tasks: await listTasks(options, parseTaskQuery(url)) });
        return;
      }

      if (request.method === "POST" && url.pathname === "/tasks") {
        const task = await createTask(options, parseCreateTaskBody(await readJsonBody(request, bodyLimit)));
        writeJson(response, 201, { task });
        return;
      }

      if (request.method === "GET" && url.pathname === "/schedules") {
        writeJson(response, 200, { schedules: await listSchedules(options) });
        return;
      }

      if (request.method === "POST" && url.pathname === "/schedules") {
        const schedule = await createSchedule(options, parseCreateScheduleBody(await readJsonBody(request, bodyLimit)));
        writeJson(response, 201, { schedule });
        return;
      }

      const scheduleMatch = url.pathname.match(/^\/schedules\/([^/]+)$/);
      if (request.method === "PATCH" && scheduleMatch) {
        const schedule = await updateSchedule(
          options,
          decodeURIComponent(scheduleMatch[1]),
          parseUpdateScheduleBody(await readJsonBody(request, bodyLimit))
        );
        writeJson(response, 200, { schedule });
        return;
      }

      if (request.method === "DELETE" && scheduleMatch) {
        writeJson(response, 200, await removeSchedule(options, decodeURIComponent(scheduleMatch[1])));
        return;
      }

      if (request.method === "GET" && url.pathname === "/observability/events") {
        const events = await observabilityStore.list(parseObservabilityQuery(url));
        writeJson(response, 200, {
          summary: summarizeObservabilityEvents(events),
          events
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/observability/events") {
        const acceptedEvents = await observabilityStore.record(parseObservabilityBody(await readJsonBody(request, bodyLimit)));
        writeJson(response, 200, {
          accepted: acceptedEvents.length,
          summary: await observabilityStore.summary(),
          events: acceptedEvents
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/observability/events/export") {
        writeJson(response, 200, await observabilityStore.exportEvents());
        return;
      }

      if (request.method === "POST" && url.pathname === "/observability/events/clear") {
        writeJson(response, 200, await observabilityStore.clear());
        return;
      }

      if (request.method === "GET" && url.pathname === "/reports") {
        writeJson(response, 200, { reports: await listReports(options, parseReportQuery(url)) });
        return;
      }

      const reportMatch = url.pathname.match(/^\/reports\/(smoke|scenario|connect|provider-live)\/([^/]+)$/);
      if (request.method === "GET" && reportMatch) {
        const detail = await readReportDetail(
          options,
          reportMatch[1] as GatewayReportKind,
          decodeURIComponent(reportMatch[2])
        );
        if (!detail) {
          writeJson(response, 404, { error: `Report not found: ${decodeURIComponent(reportMatch[2])}` });
          return;
        }
        writeJson(response, 200, detail);
        return;
      }

      if (request.method === "GET" && url.pathname === "/runs") {
        writeJson(response, 200, { runs: listActiveRuns(activeRuns) });
        return;
      }

      if (request.method === "GET" && url.pathname === "/profiles") {
        writeJson(response, 200, await listProfiles(options));
        return;
      }

      if (request.method === "POST" && url.pathname === "/profiles/use") {
        const name = parseProfileUseBody(await readJsonBody(request, bodyLimit));
        writeJson(response, 200, await useProfile(options, name));
        return;
      }

      if (request.method === "POST" && url.pathname === "/profiles/clear") {
        writeJson(response, 200, await clearProfile(options));
        return;
      }

      if (request.method === "POST" && url.pathname === "/checks/smoke") {
        writeJson(response, 200, await runCliAction(options, ["--json", "smoke"]));
        return;
      }

      if (request.method === "POST" && url.pathname === "/checks/scenario") {
        writeJson(response, 200, await runCliAction(options, ["--json", "scenario"]));
        return;
      }

      if (request.method === "POST" && url.pathname === "/checks/connect") {
        const probe = parseProbeBody(await readJsonBody(request, bodyLimit));
        writeJson(response, 200, await runCliAction(options, [
          "--json",
          "connect",
          "check",
          ...(probe ? ["--probe"] : [])
        ]));
        return;
      }

      const taskActionMatch = url.pathname.match(/^\/tasks\/([^/]+)\/(run|cancel)$/);
      if (request.method === "POST" && taskActionMatch) {
        const id = decodeURIComponent(taskActionMatch[1]);
        const action = taskActionMatch[2];
        writeJson(response, 200, await runCliAction(options, action === "run"
          ? ["tasks", "run", id, "--print"]
          : ["tasks", "cancel", id]));
        return;
      }

      if (request.method === "POST" && url.pathname === "/run") {
        const body = parsePromptBody(await readJsonBody(request, bodyLimit));
        writeJson(response, 200, await runPromptJson(options, activeRuns, observabilityStore, body));
        return;
      }

      if (request.method === "POST" && url.pathname === "/run/stream") {
        const body = parsePromptBody(await readJsonBody(request, bodyLimit));
        await streamPrompt(options, activeRuns, observabilityStore, body, request, response);
        return;
      }

      const cancelMatch = url.pathname.match(/^\/runs\/([^/]+)\/cancel$/);
      if (request.method === "POST" && cancelMatch) {
        const id = decodeURIComponent(cancelMatch[1]);
        const activeRun = activeRuns.get(id);
        if (!activeRun) {
          writeJson(response, 404, { error: `Run not found: ${id}` });
          return;
        }
        activeRun.controller.abort();
        writeJson(response, 200, { ok: true, id, status: "cancelled" });
        return;
      }

      if (["GET", "POST"].includes(request.method ?? "")) writeNotFound(response);
      else writeMethodNotAllowed(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const statusCode = error instanceof GatewayHttpError ? error.statusCode : 400;
      writeJson(response, statusCode, { error: message });
    }
  });
}

export async function startGateway(options: GatewayOptions): Promise<GatewayHandle> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8787;
  const observabilityStore = createGatewayObservabilityStore(options);
  const channelRuntime = await createGatewayChannelRuntime(options, observabilityStore);
  const server = createGatewayServer(options, channelRuntime, observabilityStore);
  let worker: TaskWorker | undefined;
  let channelManagers: ChannelManager[] = channelRuntime.managers;

  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolvePromise();
    });
  });

  try {
    worker = await createGatewayWorker(options, observabilityStore);
    for (const manager of channelManagers) await manager.start();
  } catch (error) {
    await Promise.allSettled(channelManagers.map((manager) => manager.stop()));
    await worker?.stop();
    await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
    throw error;
  }

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${host}:${actualPort}`;

  return {
    server,
    url,
    authToken: options.authToken,
    authTokenGenerated: Boolean((options as GatewayOptions & { authTokenGenerated?: boolean }).authTokenGenerated),
    close: async () => {
      await Promise.allSettled(channelManagers.map((manager) => manager.stop()));
      await worker?.stop();
      await new Promise<void>((resolvePromise, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolvePromise();
        });
      });
    }
  };
}
