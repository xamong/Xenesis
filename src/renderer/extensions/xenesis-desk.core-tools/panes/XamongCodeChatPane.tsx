import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';
import type { AiProviderKind, AiProviderSettings } from '../../../../shared/types';
import { authApiLoadUser } from '../../../auth/authApi';
import { useI18n } from '../../../i18n';

type TFunc = (key: string, vars?: Record<string, string>) => string;

// ─── 타입 ────────────────────────────────────────────────────────────────────

type ChatRole = 'user' | 'assistant' | 'system';
/**
 * agent = xamongcode /chat/interactive (승인·질문·브리핑 자동 처리 포함)
 * draft = xamong-code /api/agent SSE
 * lab   = Lab 서버
 */
type ChatMode = 'agent' | 'draft' | 'lab';

/** 'xc' = xamong-code CLI 서버 경유, 'direct' = AI 프로바이더 직접 호출 */
type CallPath = 'xc' | 'direct';

/** 채팅 첨부 파일/폴더 (입력창 위 별도 태그로 표시) */
interface Attachment {
  path: string;
  name: string;
}

/** 인라인 참조 태그 — 경로/파일명/선택 영역을 문장 안에 @태그 형태로 삽입 */
interface InlineMention {
  id: string;
  label: string; // 입력창에 @label 형태로 표시
  path: string; // 실제 파일 경로 또는 참조 식별자
}

/** 규격서 SessionSummary */
interface SessionRoutingSummary {
  activeProject?: {
    path?: string;
    kind?: string;
  };
  [key: string]: unknown;
}

interface SessionSummary {
  sessionId: string;
  workspace?: string;
  workspacePath?: string;
  cwd?: string;
  createdAt?: string;
  updatedAt?: string;
  messageCount: number;
  routing?: SessionRoutingSummary;
}

interface XconCompletionArtifact {
  type?: 'xcon-app' | string;
  workspace?: string;
  ownerUserId?: string;
  appSlug?: string;
  workspacePath?: string;
  projectPath?: string;
  readmePath?: string;
  bundlePath?: string;
  entryFile?: string;
}

interface CompletionPayload {
  ok: boolean;
  completionKind?: 'chat.completed' | 'chat.failed' | 'xcon.app.created' | string;
  shouldRegisterProject?: boolean;
  artifact?: XconCompletionArtifact;
  projectPath?: string;
  readmePath?: string;
  bundlePath?: string;
  directChat?: boolean;
  session?: SessionSummary;
  xconValidationPassed?: boolean;
  xconValidationIncomplete?: boolean;
  xconValidationStatus?: 'passed' | 'failed' | 'syntax_failed' | string;
  xconValidationCheck?: unknown;
}

// ─── Stream Status 타입 (ui-stream-status-spec.md) ───────────────────────────

type StreamStatusState =
  | 'routing'
  | 'starting'
  | 'generating'
  | 'waiting'
  | 'resuming'
  | 'recovering'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'heartbeat';

type StreamStatusPhase = 'routing' | 'launch' | 'prompt' | 'model' | 'interaction' | 'done' | 'error' | 'cancel';

interface StreamStatusEvent {
  state: StreamStatusState;
  phase: StreamStatusPhase;
  message: string;
  timestamp: string;
  runId?: string;
  sessionId?: string;
  cwd?: string;
  workspace?: string;
  workspacePath?: string;
  interactionId?: string;
  requestId?: string;
  kind?: string;
  toolName?: string;
  toolUseId?: string;
}

type StreamProgressStage =
  | 'routing'
  | 'prompt_saving'
  | 'model_starting'
  | 'model_waiting'
  | 'output_received'
  | 'tool_output'
  | 'recovering'
  | 'interaction_required'
  | 'finalizing'
  | string;

type StandardProgressStage =
  | 'routing'
  | 'briefing'
  | 'runtime_loading'
  | 'model_call'
  | 'tool_call'
  | 'artifact_written'
  | 'completed'
  | string;

interface StreamProgressEvent {
  stage: StreamProgressStage;
  standardStage?: StandardProgressStage;
  phase: string;
  message: string;
  timestamp: string;
  elapsedMs?: number;
  runId?: string;
  sessionId?: string;
  cwd?: string;
  workspace?: string;
  workspacePath?: string;
  kind?: string;
  detail?: unknown;
}

interface StreamTimelineEvent extends StreamActivityEvent {
  standardStage?: StandardProgressStage;
  lastActivityAt?: number;
}

interface StreamActivityEvent {
  stage: string;
  standardStage?: StandardProgressStage;
  phase?: string;
  message: string;
  timestamp: string;
  elapsedMs?: number;
  runId?: string;
  sessionId?: string;
  cwd?: string;
  workspace?: string;
  workspacePath?: string;
  kind?: string;
  level?: 'info' | 'warn' | 'error' | string;
  detail?: unknown;
}

interface XconStageInfo {
  index?: number;
  id?: string;
  title?: string;
}

interface StreamAssistantEvent {
  runId?: string;
  text?: string;
  stage?: XconStageInfo;
  append?: boolean;
  raw?: unknown;
}

// ─── Interactive API 타입 (ui-interaction-control-spec.md) ───────────────────

interface InteractiveMeta {
  ok: true;
  interactive: true;
  runId: string;
  command: string[];
  cwd?: string;
  cwdLabel?: string;
  workspace?: string;
  workspacePath?: string;
  sessionId?: string;
  route?: string;
  routingDecision?: {
    route?: string;
    source?: string;
    reason?: string;
    confidence?: number;
  };
}

interface InteractiveDone {
  ok: boolean;
  runId: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  sessionId?: string;
  session?: SessionSummary;
  completionKind?: string;
  shouldRegisterProject?: boolean;
  artifact?: XconCompletionArtifact;
  projectPath?: string;
  readmePath?: string;
  bundlePath?: string;
  directChat?: boolean;
  xconValidationPassed?: boolean;
  xconValidationIncomplete?: boolean;
  xconValidationStatus?: 'passed' | 'failed' | 'syntax_failed' | string;
  xconValidationCheck?: unknown;
}

/** /chat/interactive interaction_required 이벤트 페이로드 */
interface InteractionRequest {
  runId: string;
  interactionId: string;
  requestId: string;
  kind: 'permission' | 'question' | 'notice' | 'control' | string;
  status: 'pending' | 'responded' | 'canceled';
  createdAt: string;
  respondedAt?: string;
  canceledAt?: string;
  subtype?: string;
  toolName?: string;
  toolUseId?: string;
  input?: Record<string, unknown>;
  suggestions?: unknown[];
  blockedPath?: string;
  decisionReason?: string;
  agentId?: string;
  questions?: Array<{
    id?: string;
    answerKey?: string;
    question: string;
    header?: string;
    type?: 'text' | 'textarea' | 'radio' | 'checkbox' | string;
    required?: boolean;
    placeholder?: string;
    options?: Array<{
      id?: string;
      label?: string;
      title?: string;
      name?: string;
      value?: string;
      url?: string;
      description?: string;
      summary?: string;
      category?: string;
      surface?: string;
      platform?: string;
      scenario?: string;
      visual?: {
        kind?: string;
        recommended?: boolean;
        swatches?: string[];
        tags?: string[];
      };
    }>;
    multiSelect?: boolean;
  }>;
  request?: unknown;
}

/** /chat/interactive notice 이벤트 페이로드 (응답 불필요 브리핑) */
interface InteractiveNotice {
  runId: string;
  requiresResponse: false;
  toolName: string;
  toolUseId?: string;
  message?: string;
  status?: string;
  attachments?: unknown[];
  raw?: unknown;
}

interface ChatMessage {
  id: string;
  role: ChatRole;
  /** AI에 실제로 전송되는 내용 (파일 컨텍스트 포함) */
  content: string;
  /** 채팅 버블에 표시되는 내용. 없으면 content를 표시 */
  displayContent?: string;
  /** 사용자 버블에 표시되는 첨부 태그 */
  attachments?: Attachment[];
  timestamp: Date;
  streaming?: boolean;
  /** /chat/stream, /chat/interactive stderr 내용 (디버그 패널용) */
  stderr?: string;
  /** 메시지 처리 상태 */
  status?: 'submitting' | 'streaming' | 'completed' | 'failed' | 'aborted';
  /** /chat/interactive: interaction_required 이벤트 페이로드 */
  interactionRequest?: InteractionRequest;
  /** 사용자가 인터랙션을 처리한 결과 */
  interactionResolved?: 'allowed' | 'denied' | 'answered' | 'canceled';
  /** /chat/interactive: notice 이벤트 (응답 불필요 브리핑) */
  noticeData?: InteractiveNotice;
  /** interactive run ID (인터랙션 카드에서 respond API 호출에 사용) */
  runId?: string;
  /** apiServer progress SSE 이벤트 기반 세부 진행 상태 */
  progress?: StreamProgressEvent;
  /** apiServer activity SSE 이벤트 기반 최근 활동 로그 */
  activity?: StreamActivityEvent[];
  /** xconViewerWorkflow stage assistant 이벤트 메타데이터 */
  stageInfo?: XconStageInfo;
  /** 한 run 안에서 stage별 assistant 결과를 분리 렌더링하는 메시지 */
  stageMessage?: true;
}

// ─── 프로바이더 메타데이터 ────────────────────────────────────────────────────

const PROVIDER_LABEL: Record<AiProviderKind, string> = {
  auto: 'Auto (detect)',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  deepseek: 'DeepSeek',
  qwen: 'Qwen',
  mistral: 'Mistral',
  xai: 'xAI',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  together: 'Together AI',
  fireworks: 'Fireworks AI',
  azure: 'Azure OpenAI',
  'codex-cli': 'Codex CLI',
  'codex-app-server': 'Codex App Server',
  'claude-cli': 'Claude CLI',
  'claude-interactive': 'Claude Interactive',
};

/** api-server.js의 provider 파라미터 매핑 (LLM_PRESETS의 id 기준) */
const XC_PROVIDER_ID: Partial<Record<AiProviderKind, string>> = {
  openai: 'openai',
  anthropic: 'claude',
  gemini: 'gemini',
  openrouter: 'openrouter',
  groq: 'groq',
  deepseek: 'deepseek',
  qwen: 'qwen',
  mistral: 'mistral',
  xai: 'xai',
  ollama: 'ollama',
  lmstudio: 'lmstudio',
  together: 'together',
  fireworks: 'fireworks',
  azure: 'azure',
};

const LOCAL_PROVIDERS = new Set<AiProviderKind>(['ollama', 'lmstudio']);

// ─── 상수 ────────────────────────────────────────────────────────────────────

const ROLE_ICON: Record<ChatRole, string> = { user: '👤', assistant: '⬡', system: '⚙' };

/** xamongcode API 서버 기본 URL (apiServer.mjs, GET /health, POST /chat) */
const DEFAULT_AGENT_API_URL = 'http://127.0.0.1:3337';
const DEFAULT_LAB_API_URL = 'http://127.0.0.1:3845';

const DEFAULT_AI: AiProviderSettings = {
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: '',
  baseUrl: '',
  xcAgentApiUrl: '',
  xcApiUrl: '',
  labApiUrl: DEFAULT_LAB_API_URL,
};

// ─── 유틸 ────────────────────────────────────────────────────────────────────

/** 프로토콜이 없는 URL에 http:// 를 자동 추가 (예: localhost:8787 → http://localhost:8787) */
function normalizeBaseUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `http://${trimmed}`;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
function makeId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatElapsedMs(ms: number | undefined, tFn: TFunc): string {
  if (!Number.isFinite(ms ?? NaN)) return '';
  const totalSeconds = Math.max(0, Math.floor((ms ?? 0) / 1000));
  if (totalSeconds < 1) return '';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0
    ? tFn('chat.minutesSecs', { m: String(minutes), s: String(seconds) })
    : tFn('chat.seconds', { s: String(seconds) });
}

function getStandardStageLabel(tFn: TFunc): Record<string, string> {
  return {
    routing: tFn('chat.stage1'),
    briefing: tFn('chat.stage2'),
    runtime_loading: tFn('chat.stage3'),
    model_call: tFn('chat.stage4'),
    tool_call: tFn('chat.stage5'),
    artifact_written: tFn('chat.stage6'),
    completed: tFn('chat.stage7'),
  };
}

function progressDisplayText(progress: StreamProgressEvent | undefined, tFn: TFunc): string {
  if (!progress) return tFn('chat.stagePreparing');
  const elapsed = formatElapsedMs(progress.elapsedMs, tFn);
  const stageLabels = getStandardStageLabel(tFn);
  const standardLabel = progress.standardStage ? stageLabels[progress.standardStage] : '';
  const message = progress.message?.trim() || standardLabel || tFn('chat.stageInProgress');
  return elapsed ? `${message} (${elapsed})` : message;
}

function detailRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function formatByteCount(bytes: unknown): string {
  if (!Number.isFinite(bytes as number)) return '';
  const value = Number(bytes);
  if (value < 1024) return `${value}B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)}KB`;
  return `${(value / 1024 / 1024).toFixed(1)}MB`;
}

function activityDetailSummary(activity: StreamActivityEvent, tFn: TFunc): string {
  const detail = detailRecord(activity.detail);
  const parts: string[] = [];
  const llm = detailRecord(detail.llm);
  if (typeof llm.model === 'string' && llm.model) parts.push(llm.model);
  if (Number.isFinite(detail.maxTurns as number))
    parts.push(tFn('chat.maxTurns', { n: String(Number(detail.maxTurns)) }));
  const byteText = formatByteCount(detail.bytes);
  if (byteText) parts.push(byteText);
  if (Number.isFinite(detail.attempt as number) && Number.isFinite(detail.maxAttempts as number)) {
    parts.push(
      tFn('chat.retrying', { current: String(Number(detail.attempt)), max: String(Number(detail.maxAttempts)) }),
    );
  }
  if (typeof detail.toolName === 'string' && detail.toolName) parts.push(detail.toolName);
  if (typeof detail.skillName === 'string' && detail.skillName) parts.push(detail.skillName);
  if (Array.isArray(detail.pluginLabels) && detail.pluginLabels.length > 0) {
    const labels = detail.pluginLabels
      .filter((label): label is string => typeof label === 'string' && Boolean(label.trim()))
      .slice(0, 3);
    if (labels.length > 0) parts.push(labels.join(', '));
  }
  if (typeof detail.contract === 'string' && detail.contract) parts.push(detail.contract);
  if (typeof detail.status === 'string' && detail.status) parts.push(detail.status);
  const elapsed = formatElapsedMs(activity.elapsedMs, tFn);
  if (elapsed) parts.push(elapsed);
  return parts.join(' · ');
}

function activityDisplayText(activity: StreamActivityEvent, tFn: TFunc): string {
  const stageLabels = getStandardStageLabel(tFn);
  const standardLabel = activity.standardStage ? stageLabels[activity.standardStage] : '';
  const message = activity.message?.trim() || standardLabel || activity.stage || tFn('chat.stageInProgress');
  const summary = activityDetailSummary(activity, tFn);
  return summary ? `${message} · ${summary}` : message;
}

function activitySignature(activity: StreamActivityEvent): string {
  return [
    activity.stage,
    activity.standardStage,
    activity.phase,
    activity.kind,
    activity.message,
    activityDetailSummary(activity, (k) => k),
  ].join('|');
}

// ─── ANSI 코드 제거 ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1B\[[0-9;]*[mGKHFJST]|[\x1B\x9B][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g;
function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '');
}

// ─── SSE 파서 (POST /chat/stream 전용) ──────────────────────────────────────

type StreamEvent =
  | {
      event: 'meta';
      data: {
        ok: true;
        command: string[];
        cwd?: string;
        cwdLabel?: string;
        workspace?: string;
        workspacePath?: string;
        sessionId?: string;
        session?: SessionSummary;
      };
    }
  | { event: 'stdout'; data: { chunk: string; stage?: XconStageInfo; runId?: string } }
  | { event: 'stderr'; data: { chunk: string } }
  | { event: 'assistant'; data: StreamAssistantEvent }
  | { event: 'status'; data: StreamStatusEvent }
  | { event: 'progress'; data: StreamProgressEvent }
  | { event: 'timeline'; data: StreamTimelineEvent }
  | { event: 'activity'; data: StreamActivityEvent }
  | {
      event: 'done';
      data: CompletionPayload & { exitCode: number; timedOut: boolean; durationMs: number; sessionId?: string };
    }
  | { event: 'error'; data: { code: string; message: string } };

/** SSE 버퍼를 이중 개행 기준으로 파싱 (EventSource 미사용 — POST body 필요) */
function parseSseBuffer(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? '';

  for (const part of parts) {
    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of part.split(/\r?\n/)) {
      if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }

    if (dataLines.length > 0) {
      try {
        events.push({ event: eventName, data: JSON.parse(dataLines.join('\n')) } as StreamEvent);
      } catch {
        /* malformed JSON 무시 */
      }
    }
  }

  return { events, rest };
}

/** localStorage에서 xamongcode API Bearer 토큰 읽기 */
function getXcToken(): string | undefined {
  try {
    return localStorage.getItem('xamongToken') ?? undefined;
  } catch {
    return undefined;
  }
}

// ─── 프로젝트 등록 API ────────────────────────────────────────────────────────

/** UUID v4 생성 */
function makeProjectUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** 번들 경로 / 프롬프트에서 PROJECT_NAME 파생 (영문·숫자·_ 허용) */
function deriveProjectName(bundlePath: string, prompt: string): string {
  const normalized = bundlePath.replace(/\\/g, '/');
  const last = normalized.split('/').filter(Boolean).pop() ?? '';
  const base = last.replace(/\.[^.]+$/, '');
  if (base.length > 1 && /[a-zA-Z0-9]/.test(base)) {
    return base
      .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 64);
  }
  const words = prompt
    .trim()
    .split(/[\s\n]+/)
    .slice(0, 4)
    .join('_');
  return (
    words
      .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 64) || 'XApp_Project'
  );
}

/** 프로젝트 표시 제목 파생 */
function deriveProjectTitle(bundlePath: string, prompt: string): string {
  const normalized = bundlePath.replace(/\\/g, '/');
  const last = normalized.split('/').filter(Boolean).pop() ?? '';
  const base = last.replace(/\.[^.]+$/, '');
  if (base.length > 1) return base.replace(/[_-]+/g, ' ').trim().slice(0, 100);
  return (
    prompt
      .trim()
      .split(/[\n。.!?]+/)[0]
      ?.trim()
      .slice(0, 100) || 'XApp Project'
  );
}

function lastPathSegment(value: string): string {
  return (
    value
      .replace(/[\\/]+$/, '')
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() ?? ''
  );
}

function looksLikeFilePath(value: string): boolean {
  return /\.[a-z0-9]{1,12}$/i.test(lastPathSegment(value));
}

function xappEntryFilePath(projectOrFilePath: string): string {
  const trimmed = projectOrFilePath.trim().replace(/[\\/]+$/, '');
  if (!trimmed || looksLikeFilePath(trimmed)) return trimmed;
  const sep = trimmed.includes('/') && !trimmed.includes('\\') ? '/' : '\\';
  return `${trimmed}${sep}first.xconj`;
}

function joinXappPath(base: string, child: string): string {
  const cleanBase = base.trim().replace(/[\\/]+$/, '');
  const cleanChild = child.trim().replace(/^[\\/]+/, '');
  if (!cleanBase) return cleanChild;
  if (!cleanChild) return cleanBase;
  const sep = cleanBase.includes('/') && !cleanBase.includes('\\') ? '/' : '\\';
  return `${cleanBase}${sep}${cleanChild}`;
}

function isAppCreationDone(data: CompletionPayload): boolean {
  return data.ok === true && data.completionKind === 'xcon.app.created' && data.shouldRegisterProject === true;
}

function projectPathFromDonePayload(data: CompletionPayload): string | undefined {
  if (!isAppCreationDone(data)) return undefined;
  if (typeof data.projectPath === 'string' && data.projectPath) return data.projectPath;
  if (typeof data.artifact?.projectPath === 'string' && data.artifact.projectPath) {
    return data.artifact.projectPath;
  }
  if (typeof data.bundlePath === 'string' && data.bundlePath && !looksLikeFilePath(data.bundlePath)) {
    return data.bundlePath;
  }
  if (
    typeof data.artifact?.bundlePath === 'string' &&
    data.artifact.bundlePath &&
    !looksLikeFilePath(data.artifact.bundlePath)
  ) {
    return data.artifact.bundlePath;
  }
  if (typeof data.artifact?.workspacePath === 'string' && data.artifact.workspacePath) {
    return data.artifact.workspacePath;
  }
  return undefined;
}

function readmePathFromDonePayload(data: CompletionPayload): string | undefined {
  if (!isAppCreationDone(data)) return undefined;
  if (typeof data.readmePath === 'string' && data.readmePath) return data.readmePath;
  if (typeof data.artifact?.readmePath === 'string' && data.artifact.readmePath) {
    return data.artifact.readmePath;
  }
  const projectPath = projectPathFromDonePayload(data);
  return projectPath ? joinXappPath(projectPath, 'README.md') : undefined;
}

function bundlePathFromDonePayload(data: CompletionPayload): string | undefined {
  if (!isAppCreationDone(data)) return undefined;
  if (typeof data.bundlePath === 'string' && data.bundlePath) return data.bundlePath;
  if (typeof data.artifact?.bundlePath === 'string' && data.artifact.bundlePath) {
    return data.artifact.bundlePath;
  }
  const projectPath = projectPathFromDonePayload(data);
  const entryFile = data.artifact?.entryFile;
  if (projectPath && typeof entryFile === 'string' && entryFile) {
    return joinXappPath(projectPath, entryFile);
  }
  return projectPath ? xappEntryFilePath(projectPath) : undefined;
}

function xconValidationWarningFromDonePayload(data: CompletionPayload, tFn?: TFunc): string | undefined {
  if (!isAppCreationDone(data)) return undefined;
  const incomplete =
    data.xconValidationIncomplete === true ||
    data.xconValidationPassed === false ||
    (typeof data.xconValidationStatus === 'string' && data.xconValidationStatus !== 'passed');
  if (!incomplete) return undefined;
  if (data.xconValidationStatus === 'syntax_failed') {
    return tFn
      ? tFn('chat.xconValidationWarn1')
      : '⚠ 앱 생성은 완료됐지만 XCON JSON 문법 검증이 아직 통과하지 못했습니다. WORKFLOW.md의 검증 기록을 확인해 주세요.';
  }
  return tFn
    ? tFn('chat.xconValidationWarn2')
    : '⚠ 앱 생성은 완료됐지만 XCON 검증 항목이 남아 있습니다. WORKFLOW.md의 7단계 검증 기록을 확인해 주세요.';
}

function normalizeWorkspacePathForCompare(value?: string): string {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

function isExpectedAppCreationWorkspaceNarrowing(meta: InteractiveMeta, requestedWorkspacePath?: string): boolean {
  const route = meta.route || meta.routingDecision?.route;
  if (route !== 'create_new_xcon_app') return false;
  const requested = normalizeWorkspacePathForCompare(requestedWorkspacePath || '.');
  const actual = normalizeWorkspacePathForCompare(meta.workspacePath || '.');
  if (!requested || requested === '.') {
    return /^users\/[^/]+\/apps\/[^/]+$/i.test(actual);
  }
  return actual === requested || actual.startsWith(`${requested}/`);
}

/** localStorage에서 Xamong JWT access_token 읽기 */
function getXamongAccessToken(): string {
  try {
    const session = JSON.parse(localStorage.getItem('sessionInfo') || '{}');
    return (session?.access_token as string) ?? '';
  } catch {
    return '';
  }
}

/**
 * 앱 생성 완료 후 Xamong 서버에 프로젝트 정보 등록
 * POST /api/projects  — Bearer 인증
 */
async function registerProjectToServer(bundlePath: string, userPrompt: string, tFn: TFunc): Promise<void> {
  const user = authApiLoadUser();
  const userId = user?.id ?? '0000000000000000000';
  const jwtToken = getXamongAccessToken();

  const projectId = makeProjectUUID();
  const projectHash = projectId.replace(/-/g, '');
  const projectUUID = makeProjectUUID();
  const projectName = deriveProjectName(bundlePath, userPrompt);
  const title = deriveProjectTitle(bundlePath, userPrompt);
  const summary = userPrompt.trim().split(/\n/)[0].slice(0, 200);

  const endpoint = 'http://localhost:3100/api/projects';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;

  const body = {
    USERID: userId,
    USER_HASH: userId,
    JOINID: '0000000000000000000',
    PROJECT_ID: projectId,
    PROJECT_HASH: projectHash,
    PROJECT_UUID: projectUUID,
    PROJECT_NAME: projectName,
    TITLE: title,
    SUMMARY: summary,
    DESCRIPTION: tFn('chat.projectGenerated'),
    SAVED: bundlePath,
    RESOLUTION: '390x844',
    USE_YN: 'Y',
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = tFn('chat.projectRegFailed', { status: String(res.status) });
    try {
      const errJson = await res.json();
      msg = String(errJson.message || errJson.error || msg);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

// ─── 마크다운 렌더링 컴포넌트 ─────────────────────────────────────────────────
function ChatMessageContent({ content, streaming }: { content: string; streaming?: boolean }) {
  const { t: t18n } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const text = useMemo(() => stripAnsi(content), [content]);

  const handleCopy = useCallback((code: string, id: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
  }, []);

  return (
    <div className="xc-md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 코드 블록: 언어 배지 + 복사 버튼
          pre({ children }) {
            return <>{children}</>;
          },
          code(props) {
            const { className, children } = props;
            const lang = className?.replace('language-', '') ?? '';
            const isBlock = !!className;
            const code = String(children).replace(/\n$/, '');
            if (!isBlock) {
              return <code className="xc-md-icode">{children}</code>;
            }
            const cbId = `cb-${code.slice(0, 24).replace(/\s/g, '')}`;
            return (
              <div className="xc-md-codeblock">
                <div className="xc-md-codeblock-bar">
                  {lang && <span className="xc-md-lang">{lang}</span>}
                  <button className="xc-md-copy" onClick={() => handleCopy(code, cbId)} title={t18n('chat.copyTitle')}>
                    {copiedId === cbId ? t18n('chat.copiedLabel') : t18n('chat.copyLabel')}
                  </button>
                </div>
                <pre className="xc-md-pre">
                  <code className={className}>{children}</code>
                </pre>
              </div>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noreferrer" className="xc-md-link">
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
      {streaming && (
        <span className="xc-cursor" aria-hidden>
          ▋
        </span>
      )}
    </div>
  );
}

// ─── 인터랙션 카드 컴포넌트 ───────────────────────────────────────────────────

interface InteractionCardProps {
  req: InteractionRequest;
  resolved?: 'allowed' | 'denied' | 'answered' | 'canceled';
  /** onResolve(outcome, respondBody) — 컴포넌트 외부에서 respond API 호출 + 상태 갱신 */
  onResolve: (outcome: 'allowed' | 'denied' | 'answered', body: unknown) => Promise<void>;
}

type InteractionQuestion = NonNullable<InteractionRequest['questions']>[number];
type InteractionQuestionOption = NonNullable<InteractionQuestion['options']>[number];
type InteractionAnswerValue = string | string[];

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isOpenDesignBrief(req: InteractionRequest): boolean {
  return req.toolName === 'OpenDesignBrief' || req.input?.workflow === 'open-design';
}

function openDesignForm(req: InteractionRequest): { title?: string; description?: string; submitLabel?: string } {
  const form = recordValue(req.input?.form);
  return {
    title: stringValue(form?.title) ?? undefined,
    description: stringValue(form?.description),
    submitLabel: stringValue(form?.submitLabel),
  };
}

function interactionQuestions(req: InteractionRequest): InteractionQuestion[] {
  if (Array.isArray(req.questions) && req.questions.length > 0) return req.questions;
  const inputQuestions = req.input?.questions;
  return Array.isArray(inputQuestions) ? (inputQuestions as InteractionQuestion[]) : [];
}

function questionAnswerKey(question: InteractionQuestion, index: number): string {
  return question.answerKey?.trim() || question.id?.trim() || question.question?.trim() || `answer_${index + 1}`;
}

function optionLabel(option: InteractionQuestionOption): string | undefined {
  return (
    option.label?.trim() ||
    option.title?.trim() ||
    option.name?.trim() ||
    option.id?.trim() ||
    option.value?.trim() ||
    undefined
  );
}

function questionInputType(question: InteractionQuestion): 'text' | 'textarea' | 'radio' | 'checkbox' {
  const raw = String(question.type ?? '').toLowerCase();
  if (raw === 'textarea' || raw === 'string[]' || raw === 'long' || raw === 'paragraph') return 'textarea';
  if (raw === 'checkbox' || raw === 'multi' || raw === 'multiple') return 'checkbox';
  if (raw === 'radio' || raw === 'select' || raw === 'choice') return 'radio';
  return question.options && question.options.length > 0 ? 'radio' : 'text';
}

function optionValue(option: InteractionQuestionOption): string {
  return option.value?.trim() || option.id?.trim() || optionLabel(option) || '';
}

function optionUrl(option: InteractionQuestionOption): string | undefined {
  const url = option.url?.trim();
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

function optionDescription(option: InteractionQuestionOption): string | undefined {
  return (
    option.description?.trim() ||
    option.summary?.trim() ||
    option.category?.trim() ||
    option.surface?.trim() ||
    undefined
  );
}

function optionVisual(option: InteractionQuestionOption): NonNullable<InteractionQuestionOption['visual']> | undefined {
  return option.visual && typeof option.visual === 'object' ? option.visual : undefined;
}

function optionVisualKind(option: InteractionQuestionOption): string | undefined {
  const kind = optionVisual(option)?.kind;
  return typeof kind === 'string' && kind.trim() ? kind.trim() : undefined;
}

function isVisualCatalogQuestion(question: InteractionQuestion, answerKey: string): boolean {
  if (answerKey === 'templateId' || answerKey === 'designSystemId') return true;
  return (question.options ?? []).some((option) => {
    const kind = optionVisualKind(option);
    return kind === 'template' || kind === 'design-system';
  });
}

function optionSwatches(option: InteractionQuestionOption): string[] {
  const raw = optionVisual(option)?.swatches;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === 'string' && /^#[0-9a-f]{6}$/i.test(item.trim()))
    .map((item) => item.trim())
    .slice(0, 5);
}

function optionTags(option: InteractionQuestionOption): string[] {
  const visualTags = optionVisual(option)?.tags;
  const values = [
    ...(Array.isArray(visualTags) ? visualTags : []),
    option.surface,
    option.platform,
    option.scenario,
    option.category,
  ];
  return Array.from(
    new Set(
      values
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim()),
    ),
  ).slice(0, 4);
}

function optionRecommended(option: InteractionQuestionOption): boolean {
  return optionVisual(option)?.recommended === true;
}

function filterQuestionOptions(options: InteractionQuestionOption[], filter: string): InteractionQuestionOption[] {
  const query = filter.trim().toLowerCase();
  if (!query) return options;
  return options.filter(
    (option) =>
      (optionLabel(option) ?? '').toLowerCase().includes(query) ||
      optionValue(option).toLowerCase().includes(query) ||
      (optionDescription(option) ?? '').toLowerCase().includes(query),
  );
}

function answerTextValue(value: InteractionAnswerValue | undefined): string {
  return Array.isArray(value) ? value.join(', ') : (value ?? '');
}

function answerListValue(value: InteractionAnswerValue | undefined): string[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function questionCanContinue(question: InteractionQuestion, value: InteractionAnswerValue | undefined): boolean {
  if (question.required === false) return true;
  if (Array.isArray(value)) return value.length > 0;
  return (value ?? '').trim().length > 0;
}

function openDesignAnswerPayload(
  questions: InteractionQuestion[],
  answers: Record<string, InteractionAnswerValue>,
): Record<string, InteractionAnswerValue> {
  const payload: Record<string, InteractionAnswerValue> = {};
  questions.forEach((question, index) => {
    const key = questionAnswerKey(question, index);
    const value = answers[key];
    if (value === undefined) return;
    if (!Array.isArray(value) && value.trim().length === 0 && question.required === false) return;
    if (Array.isArray(value) && value.length === 0 && question.required === false) return;
    payload[key] = value;
  });
  return payload;
}

function toggleListValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

/**
 * 권한 승인 / 질문 응답 / 브리핑 확인 / 제어 카드
 * kind: permission | question | notice | control | (unknown)
 */
function InteractionCard({ req, resolved, onResolve }: InteractionCardProps) {
  const { t: t18n } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, InteractionAnswerValue>>({});

  const respond = async (outcome: 'allowed' | 'denied' | 'answered', body: unknown) => {
    setBusy(true);
    setErr(null);
    try {
      await onResolve(outcome, body);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // 이미 처리된 경우 — 결과 배지만 표시
  if (resolved) {
    const badge =
      resolved === 'allowed'
        ? { icon: '✅', label: t18n('chat.permissionAllowed'), cls: 'allowed' }
        : resolved === 'denied'
          ? { icon: '🚫', label: t18n('chat.permissionDenied'), cls: 'denied' }
          : resolved === 'answered'
            ? { icon: '✅', label: t18n('chat.permissionAnswered'), cls: 'allowed' }
            : { icon: '✕', label: t18n('chat.permissionCancelled'), cls: 'canceled' };
    return (
      <div className={`xc-interaction-card xc-interaction--resolved xc-interaction--${badge.cls}`}>
        <span className="xc-interaction-resolved-icon">{badge.icon}</span>
        <span className="xc-interaction-resolved-label">
          {req.toolName ? `${req.toolName} — ` : ''}
          {badge.label}
        </span>
      </div>
    );
  }

  // ── permission ────────────────────────────────────────────────────────────
  if (req.kind === 'permission') {
    const filePath = (req.input?.file_path ?? req.blockedPath) as string | undefined;
    return (
      <div className="xc-interaction-card xc-interaction--permission">
        <div className="xc-interaction-header">
          <span className="xc-interaction-icon">🔐</span>
          <span className="xc-interaction-kind">{t18n('chat.permissionRequest')}</span>
          {req.toolName && <span className="xc-interaction-tool">{req.toolName}</span>}
        </div>
        {filePath && (
          <div className="xc-interaction-path" title={filePath}>
            {filePath}
          </div>
        )}
        {err && <div className="xc-interaction-error">⚠ {err}</div>}
        <div className="xc-interaction-actions">
          <button
            className="xc-interaction-btn xc-interaction-btn--allow"
            disabled={busy}
            onClick={() => respond('allowed', { decision: 'allow', scope: 'once' })}
          >
            {t18n('chat.allowOnce')}
          </button>
          <button
            className="xc-interaction-btn xc-interaction-btn--allow-session"
            disabled={busy}
            onClick={() => respond('allowed', { decision: 'allow', scope: 'session' })}
          >
            {t18n('chat.allowSession')}
          </button>
          <button
            className="xc-interaction-btn xc-interaction-btn--deny"
            disabled={busy}
            onClick={() => respond('denied', { decision: 'deny', message: t18n('chat.userDenied') })}
          >
            {t18n('chat.deny')}
          </button>
        </div>
      </div>
    );
  }

  // ── question ──────────────────────────────────────────────────────────────
  if (req.kind === 'question') {
    const questions = interactionQuestions(req);

    if (isOpenDesignBrief(req)) {
      const form = openDesignForm(req);
      const allRequiredAnswered = questions.every((q, i) => questionCanContinue(q, answers[questionAnswerKey(q, i)]));
      const answeredCount = questions.filter((q, i) => questionCanContinue(q, answers[questionAnswerKey(q, i)])).length;

      return (
        <div className="xc-od-card">
          <div className="xc-od-head">
            <div className="xc-od-title-wrap">
              <div className="xc-od-kicker">{t18n('chat.odBriefing')}</div>
              <div className="xc-od-title">{form.title ?? t18n('chat.quickBriefing')}</div>
              {form.description && <div className="xc-od-desc">{form.description}</div>}
            </div>
            <div className="xc-od-step">
              {answeredCount} / {Math.max(questions.length, 1)}
            </div>
          </div>

          {questions.length > 0 ? (
            <div className="xc-od-form-grid">
              {questions.map((question, qi) => {
                const key = questionAnswerKey(question, qi);
                const type = questionInputType(question);
                const rawValue = answers[key];
                const textValue = answerTextValue(rawValue);
                const listValue = answerListValue(rawValue);
                const options = question.options ?? [];
                const filter = typeof answers[`__filter_${key}`] === 'string' ? String(answers[`__filter_${key}`]) : '';
                const filteredOptions = filterQuestionOptions(options, filter);
                const useSearch = options.length > 10;
                const needsCatalogOptions =
                  ['templateId', 'designSystemId'].includes(key) &&
                  ['radio', 'checkbox'].includes(type) &&
                  options.length === 0;
                const visualCatalog = isVisualCatalogQuestion(question, key);
                return (
                  <div
                    className={`xc-od-field${questionCanContinue(question, rawValue) ? ' is-complete' : ''}`}
                    key={key}
                  >
                    <div className="xc-od-field-head">
                      {question.header && <div className="xc-od-qheader">{question.header}</div>}
                      {question.required !== false && <span className="xc-od-required">{t18n('chat.required')}</span>}
                    </div>
                    <div className="xc-od-qtext">{question.question}</div>
                    {question.placeholder && !options.length && (
                      <div className="xc-od-help">{question.placeholder}</div>
                    )}

                    {options.length > 0 ? (
                      <div className="xc-od-choice-panel">
                        {useSearch && (
                          <input
                            className="xc-od-search"
                            value={filter}
                            disabled={busy}
                            placeholder={t18n('chat.searchSelect')}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [`__filter_${key}`]: e.target.value }))}
                          />
                        )}
                        <div
                          className={`xc-od-options${visualCatalog ? ' xc-od-options--visual' : ''}`}
                          role={type === 'checkbox' ? 'group' : 'listbox'}
                          aria-label={question.question}
                        >
                          {filteredOptions.map((opt, oi) => {
                            const value = optionValue(opt);
                            const label = optionLabel(opt) ?? t18n('chat.choices');
                            const description = optionDescription(opt);
                            const url = optionUrl(opt);
                            const swatches = optionSwatches(opt);
                            const tags = optionTags(opt);
                            const kind =
                              optionVisualKind(opt) ?? (key === 'designSystemId' ? 'design-system' : 'template');
                            const recommended = optionRecommended(opt);
                            const selected =
                              type === 'checkbox'
                                ? listValue.includes(value) || listValue.includes(label)
                                : textValue === value || textValue === label;
                            return (
                              <button
                                key={`${value}-${oi}`}
                                type="button"
                                className={`xc-od-option${visualCatalog ? ' xc-od-option--visual' : ''}${selected ? ' is-selected' : ''}`}
                                disabled={busy}
                                onClick={() =>
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [key]:
                                      type === 'checkbox' ? toggleListValue(answerListValue(prev[key]), value) : value,
                                  }))
                                }
                                title={description}
                                aria-pressed={selected}
                              >
                                {visualCatalog && (
                                  <span className="xc-od-option-visual-head" aria-hidden>
                                    {swatches.length > 0 ? (
                                      <span className="xc-od-option-swatches">
                                        {swatches.map((color, si) => (
                                          <span
                                            key={`${color}-${si}`}
                                            className="xc-od-option-swatch"
                                            style={{ backgroundColor: color }}
                                          />
                                        ))}
                                      </span>
                                    ) : (
                                      <span className={`xc-od-option-glyph xc-od-option-glyph--${kind}`}>
                                        {kind === 'design-system' ? 'Aa' : 'UI'}
                                      </span>
                                    )}
                                    {recommended && (
                                      <span className="xc-od-option-badge">{t18n('chat.recommended')}</span>
                                    )}
                                  </span>
                                )}
                                <span className="xc-od-option-main">{label}</span>
                                {description && <span className="xc-od-option-desc">{description}</span>}
                                {url && (
                                  <a
                                    className="xc-od-option-link"
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {new URL(url).hostname}
                                  </a>
                                )}
                                {visualCatalog && tags.length > 0 && (
                                  <span className="xc-od-option-tags">
                                    {tags.map((tag) => (
                                      <span key={tag} className="xc-od-option-tag">
                                        {tag}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                          {filteredOptions.length === 0 && (
                            <div className="xc-od-empty">{t18n('chat.noMatchingChoice')}</div>
                          )}
                        </div>
                      </div>
                    ) : needsCatalogOptions ? (
                      <div className="xc-od-empty xc-od-empty--warning">{t18n('chat.noChoiceList')}</div>
                    ) : type === 'textarea' ? (
                      <textarea
                        className="xc-od-textarea"
                        value={textValue}
                        disabled={busy}
                        rows={4}
                        placeholder={question.placeholder ?? t18n('chat.enterAnswer')}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    ) : (
                      <input
                        className="xc-od-input"
                        value={textValue}
                        disabled={busy}
                        placeholder={question.placeholder ?? t18n('chat.answerPlaceholder')}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="xc-od-empty">{t18n('chat.noQuestion')}</div>
          )}

          {err && <div className="xc-interaction-error">⚠ {err}</div>}
          <div className="xc-od-actions">
            <button
              className="xc-od-btn xc-od-btn--primary"
              disabled={busy || questions.length === 0 || !allRequiredAnswered}
              onClick={() =>
                respond('answered', {
                  decision: 'answer',
                  answers: openDesignAnswerPayload(questions, answers),
                })
              }
            >
              {form.submitLabel ?? t18n('chat.sendBriefing')}
            </button>
          </div>
        </div>
      );
    }

    const allAnswered = questions.every((q, i) => questionCanContinue(q, answers[questionAnswerKey(q, i)]));
    return (
      <div className="xc-interaction-card xc-interaction--question">
        <div className="xc-interaction-header">
          <span className="xc-interaction-icon">❓</span>
          <span className="xc-interaction-kind">{t18n('chat.questionResponse')}</span>
        </div>
        {questions.map((q, qi) => (
          <div key={qi} className="xc-interaction-question">
            {q.header && <div className="xc-interaction-qheader">{q.header}</div>}
            <div className="xc-interaction-qtext">{q.question}</div>
            {q.options && q.options.length > 0 ? (
              <div className="xc-interaction-options">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    className={`xc-interaction-option${answerListValue(answers[questionAnswerKey(q, qi)]).includes(optionValue(opt)) ? ' is-selected' : ''}`}
                    disabled={busy}
                    title={optionDescription(opt)}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [questionAnswerKey(q, qi)]:
                          questionInputType(q) === 'checkbox'
                            ? toggleListValue(answerListValue(prev[questionAnswerKey(q, qi)]), optionValue(opt))
                            : optionValue(opt),
                      }))
                    }
                  >
                    {optionLabel(opt) ?? t18n('chat.choices')}
                  </button>
                ))}
              </div>
            ) : (
              <input
                className="xc-interaction-text-input"
                value={answerTextValue(answers[questionAnswerKey(q, qi)])}
                disabled={busy}
                placeholder={t18n('chat.answerInputPlaceholder')}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [questionAnswerKey(q, qi)]: e.target.value }))}
              />
            )}
          </div>
        ))}
        {err && <div className="xc-interaction-error">⚠ {err}</div>}
        <div className="xc-interaction-actions">
          <button
            className="xc-interaction-btn xc-interaction-btn--allow"
            disabled={busy || !allAnswered}
            onClick={() => respond('answered', { decision: 'answer', answers })}
          >
            {t18n('chat.sendAnswer')}
          </button>
        </div>
      </div>
    );
  }

  // ── notice (interaction_required 안에 포함된 확인 요청) ────────────────────
  if (req.kind === 'notice') {
    const msg = (req.input as Record<string, unknown>)?.message as string | undefined;
    return (
      <div className="xc-interaction-card xc-interaction--notice">
        <div className="xc-interaction-header">
          <span className="xc-interaction-icon">📣</span>
          <span className="xc-interaction-kind">{t18n('chat.confirmRequest')}</span>
          {req.toolName && <span className="xc-interaction-tool">{req.toolName}</span>}
        </div>
        {msg && <div className="xc-interaction-message">{msg}</div>}
        {err && <div className="xc-interaction-error">⚠ {err}</div>}
        <div className="xc-interaction-actions">
          <button
            className="xc-interaction-btn xc-interaction-btn--allow"
            disabled={busy}
            onClick={() => respond('allowed', { decision: 'allow', scope: 'once' })}
          >
            {t18n('chat.confirmBtn')}
          </button>
        </div>
      </div>
    );
  }

  // ── 알 수 없는 kind — raw control panel ────────────────────────────────────
  return (
    <div className="xc-interaction-card xc-interaction--control">
      <div className="xc-interaction-header">
        <span className="xc-interaction-icon">⚙</span>
        <span className="xc-interaction-kind">
          {t18n('chat.controlRequest')} ({req.kind})
        </span>
        {req.toolName && <span className="xc-interaction-tool">{req.toolName}</span>}
      </div>
      <pre className="xc-interaction-raw">{JSON.stringify(req.input ?? req.request ?? {}, null, 2)}</pre>
      {err && <div className="xc-interaction-error">⚠ {err}</div>}
      <div className="xc-interaction-actions">
        <button
          className="xc-interaction-btn xc-interaction-btn--allow"
          disabled={busy}
          onClick={() => respond('allowed', { decision: 'allow', scope: 'once' })}
        >
          {t18n('chat.allow')}
        </button>
        <button
          className="xc-interaction-btn xc-interaction-btn--deny"
          disabled={busy}
          onClick={() => respond('denied', { decision: 'deny', message: t18n('chat.userDenied') })}
        >
          {t18n('chat.deny')}
        </button>
      </div>
    </div>
  );
}

/** 응답 불필요 브리핑 notice (SSE notice 이벤트) — 인라인 토스트 */
function NoticeCard({ notice }: { notice: InteractiveNotice }) {
  return (
    <div className="xc-notice-card">
      <span className="xc-notice-icon">📢</span>
      {notice.toolName && <span className="xc-notice-tool">{notice.toolName}</span>}
      {notice.message && <span className="xc-notice-msg">{notice.message}</span>}
    </div>
  );
}

/** stderr 디버그 패널 — 접기/펼치기 가능 */
function StderrPanel({ stderr }: { stderr: string }) {
  const { t: t18n } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="xc-stderr-panel">
      <button className="xc-stderr-toggle" onClick={() => setOpen((v) => !v)} title={t18n('chat.debugToggleTitle')}>
        {open ? '▲' : '▼'} stderr
      </button>
      {open && <pre className="xc-stderr-body">{stderr}</pre>}
    </div>
  );
}

/** 긴 문자열을 청크로 나눠 onDelta를 여러 번 호출해 타이핑 효과 */
async function simulateStream(
  text: string,
  onDelta: (t: string) => void,
  signal: AbortSignal,
  chunkSize = 8,
  delayMs = 8,
) {
  for (let i = 0; i < text.length; i += chunkSize) {
    if (signal.aborted) break;
    onDelta(text.slice(i, i + chunkSize));
    if (i + chunkSize < text.length) await new Promise((r) => setTimeout(r, delayMs));
  }
}

// ─── XC 이벤트 포맷터 ────────────────────────────────────────────────────────

function formatOdProgress(event: Record<string, unknown>, tFn?: TFunc): string | null {
  const stage = event.stage as string;
  const elapsed = event.elapsed as number | undefined;
  const elapsedLabel = elapsed !== undefined ? ` (${elapsed}${tFn ? tFn('chat.seconds2') : '초'})` : '';

  switch (stage) {
    case 'agent_spawned':
      return `🚀 ${tFn ? tFn('chat.agentStarting') : 'AI 에이전트 시작'}${elapsedLabel}`;
    case 'agent_running': {
      const stdout = event.stdoutBytes as number | undefined;
      return `⚙️ ${tFn ? tFn('chat.generating') : '앱 생성 중'}${elapsedLabel}${stdout ? ` — ${Math.round(stdout / 1024)}KB ${tFn ? tFn('chat.processed') : '처리됨'}` : ''}`;
    }
    case 'agent_done':
      return `✅ AI 에이전트 완료${elapsedLabel}`;
    case 'artifact_found': {
      const id = event.identifier as string | undefined;
      return `📦 아티팩트 추출: ${id ?? '?'}${elapsedLabel}`;
    }
    case 'saved':
      return `💾 프로젝트 저장 완료${elapsedLabel}`;
    case 'done':
      return `🎉 ${tFn ? tFn('chat.completed') : '완료'}!${elapsedLabel}`;
    case 'error':
      return `❌ ${tFn ? tFn('common.error') : '오류'}: ${String(event.message ?? (tFn ? tFn('common.error') : '알 수 없는 오류'))}`;
    default:
      return null;
  }
}

function formatXcEvent(event: Record<string, unknown>, tFn?: TFunc): string | null {
  const type = event.type as string;

  switch (type) {
    case 'model_response': {
      const text = String(event.text ?? '');
      return text ? `💬 ${text}` : null;
    }
    case 'tool_call': {
      const name = String(event.name ?? '');
      const toolLabel = name.includes('open_design') ? '🎨 Open Design' : `🔧 ${name}`;
      return `${toolLabel} ${tFn ? tFn('chat.calling') : '호출 중...'}`;
    }
    case 'tool_result': {
      const exitCode = event.exit_code;
      const name = String(event.name ?? '');
      if (exitCode === 0 || exitCode === undefined) {
        return name.includes('open_design')
          ? `✅ ${tFn ? tFn('chat.designDone') : '디자인 생성 완료'}`
          : `✅ ${name} ${tFn ? tFn('chat.completed') : '완료'}`;
      }
      return `❌ ${name} ${tFn ? tFn('chat.failed') : '실패'}`;
    }
    case 'od_progress':
      return formatOdProgress(event, tFn);
    case 'final':
      return String(event.text ?? '');
    case 'error':
      return `❌ ${tFn ? tFn('common.error') : '오류'}: ${String(event.error ?? (tFn ? tFn('common.error') : '알 수 없는 오류'))}`;
    case 'complete':
      return null; // complete는 xcCallAgent에서 별도 처리
    default:
      return null;
  }
}

// ─── xamong-code CLI API 서버 호출 ───────────────────────────────────────────

/**
 * 에이전트 API 헬스체크: /api/health → 200 OK 요구
 * 에이전트 서버는 명시적인 /api/health 엔드포인트를 제공함.
 */
async function xcHealthCheck(xcApiUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${xcApiUrl}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * xamongcode API 서버 헬스체크 (GET /health → { ok: true })
 * xamong-code가 아닌 xamongcode(apiServer.mjs)의 /health 엔드포인트.
 */
async function xcAgentHealthCheck(xcAgentApiUrl: string): Promise<boolean> {
  const base = xcAgentApiUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => ({}))) as { ok?: unknown };
    return data?.ok === true;
  } catch {
    return false;
  }
}

/**
 * Lab Web UI 서버 헬스체크 (GET /api/health → { ok: true })
 * Lab Web UI 서버(lab start)는 /api/health 를 제공하며 { ok: true } 를 반환.
 */
async function labHealthCheck(labApiUrl: string): Promise<boolean> {
  const base = labApiUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return true;
  } catch {
    /* 연결 불가 */
  }
  // 루트 경로로 폴백 (정적 index.html 서빙)
  try {
    await fetch(`${base}/`, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    /* 연결 불가 */
  }
  return false;
}

/** 파일 전체 경로에서 부모 디렉터리를 반환 (Node path 없이 브라우저 컨텍스트에서 동작) */
function dirFromFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash > 0 ? filePath.slice(0, lastSlash) : filePath;
}

/**
 * POST /api/agent (SSE 스트리밍)
 * 각 SSE 이벤트를 onContent(내용 전체 교체)로 전달하고,
 * complete 이벤트의 final_text로 최종 업데이트합니다.
 *
 * @param workspace          에이전트의 currentDirectory 로 사용할 절대경로 (선택)
 * @param onWorkspaceChange  앱 생성 완료 시 프로젝트 디렉터리 경로 전달 콜백
 */
async function xcCallAgent(
  xcApiUrl: string,
  prompt: string,
  cfg: AiProviderSettings,
  onContent: (content: string) => void,
  signal: AbortSignal,
  workspace?: string,
  onWorkspaceChange?: (path: string) => void,
  onBundleReady?: (bundlePath: string) => void,
  tFn?: TFunc,
): Promise<void> {
  const body: Record<string, unknown> = {
    prompt,
    model: cfg.model,
    provider: XC_PROVIDER_ID[cfg.provider] ?? cfg.provider,
  };
  // 작업 폴더가 있으면 서버에 전달 → 에이전트 currentDirectory 설정
  if (workspace) body.workspace = workspace;

  onContent(tFn ? tFn('chat.appGenerating') : '⏳ 앱 생성 중...');

  const res = await fetch(`${xcApiUrl}/api/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'text/event-stream',
    },
    signal,
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    throw new Error(tFn ? tFn('chat.serverError', { status: String(res.status) }) : `서버 오류 (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let finalText = '';

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') break outer;

      let event: Record<string, unknown>;
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }

      console.log('event:', event);

      const msg = formatXcEvent(event, tFn);
      if (msg) onContent(msg);

      // 앱 생성 완료 시 프로젝트 디렉터리를 workspace 로 자동 설정
      if (event.type === 'od_progress' && (event as Record<string, unknown>).stage === 'saved') {
        const bundlePath = (event as Record<string, unknown>).bundlePath;
        if (typeof bundlePath === 'string' && bundlePath) {
          (window as any).CURRENT_XAPP_BUNDLE_PATH = bundlePath;
          onWorkspaceChange?.(dirFromFilePath(bundlePath));
          onBundleReady?.(bundlePath);
        }
      }

      if (event.type === 'complete' && event.result) {
        const result = event.result as Record<string, unknown>;
        // resultToData 구조: { exitCode, output: { final_text, ... }, error }
        const output = result.output as Record<string, unknown> | null | undefined;
        const errMsg = typeof result.error === 'string' ? result.error.trim() : '';
        finalText =
          (typeof output?.final_text === 'string' ? output.final_text : '') ||
          (typeof output?.output === 'string' ? output.output : '') ||
          (typeof result.output === 'string' ? result.output : '') ||
          (result.exitCode !== 0 && errMsg ? `❌ 오류: ${errMsg}` : '');
      }
    }
  }

  if (finalText) onContent(finalText);
}

/** 서버 세션 ID 생성 (letters, numbers, `-`, `_`, `.` 만 허용) */
function makeSessionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `xc-${ts}-${rand}`;
}

function currentDeskUserid(): string | undefined {
  const user = authApiLoadUser();
  return user?.id || user?.email || undefined;
}

/**
 * xamongcode API 서버 채팅 — POST /chat/stream SSE 실시간 스트리밍
 *
 * 규격서 ui-integration-spec.md 기준:
 *   - meta  이벤트: cwd, sessionId 확인
 *   - stdout 이벤트: 텍스트 청크 즉시 onDelta 전달 → 첫 토큰부터 화면 표시
 *   - stderr 이벤트: 디버그 정보 onStderr 전달
 *   - done   이벤트: done.ok / done.exitCode 로 최종 성공 여부 판단
 *   - error  이벤트: 서버 오류 throw
 *
 * /chat/stream 연결 실패 시 /chat 비스트리밍 fallback 자동 적용.
 * sessionId를 전달하면 서버가 이전 대화를 포함해 컨텍스트를 유지한다.
 */
async function xcAgentStream(
  xcAgentApiUrl: string,
  prompt: string,
  cfg: AiProviderSettings,
  onDelta: (t: string) => void,
  onStderr: (chunk: string) => void,
  signal: AbortSignal,
  sessionId?: string,
  sessionMaxMessages = 20,
  workspace?: string,
  workspacePath?: string,
  maxTurns = 40,
  userid?: string,
  onStatus?: (status: StreamStatusEvent) => void,
  onProgress?: (progress: StreamProgressEvent) => void,
  onActivity?: (activity: StreamActivityEvent) => void,
  tFn?: TFunc,
): Promise<{ sessionMessageCount?: number }> {
  const base = xcAgentApiUrl.replace(/\/$/, '');
  const body: Record<string, unknown> = {
    prompt,
    mode: 'work',
    sessionMaxMessages,
    maxTurns,
  };
  if (sessionId) body.sessionId = sessionId;
  // Agent mode is API-server/config driven. Do not send the desktop app's
  // default provider/model here, otherwise workspace defaults are overridden.
  void cfg;
  if (workspace) body.workspace = workspace;
  if (workspacePath) body.workspacePath = workspacePath;
  if (userid) body.userid = userid;

  const token = getXcToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // ── 디버그 로깅 ────────────────────────────────────────────────────────────
  const dbgTagS = `[XC:stream ${Date.now().toString(36)}]`;
  console.group(`${dbgTagS} → POST ${base}/chat/stream`);
  console.log('request body:', JSON.parse(JSON.stringify(body)));
  console.groupEnd();
  // ────────────────────────────────────────────────────────────────────────────

  // ── /chat/stream SSE 시도 ──────────────────────────────────────────────
  let res: Response;
  try {
    res = await fetch(`${base}/chat/stream`, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify(body),
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    // 네트워크 오류 → /chat fallback
    return xcAgentChatFallback(base, body, headers, onDelta, onStderr, signal);
  }

  // 401: token 필요 알림
  if (res.status === 401) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    throw Object.assign(
      new Error(
        errJson.error?.message ??
          (tFn ? tFn('chat.authRequired') : '인증이 필요합니다. 설정에서 API 토큰을 확인하세요.'),
      ),
      { code: 'unauthorized' },
    );
  }

  // /chat/stream 미지원(404) → /chat fallback
  if (res.status === 404) {
    return xcAgentChatFallback(base, body, headers, onDelta, onStderr, signal, tFn);
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    let errMsg = tFn ? tFn('chat.serverError', { status: String(res.status) }) : `서버 오류 (${res.status})`;
    try {
      const errJson = JSON.parse(text);
      if (errJson?.error?.code) errMsg = `[${errJson.error.code}] ${errJson.error.message ?? errMsg}`;
      else if (errJson?.error?.message) errMsg = errJson.error.message;
    } catch {
      /* raw text */
    }
    throw new Error(errMsg);
  }

  // ── SSE 스트림 처리 ────────────────────────────────────────────────────
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalSessionCount: number | undefined;
  let doneSeen = false;
  let doneOk = true;
  let doneExitCode = 0;
  let timedOut = false;

  // ui-stream-status-spec.md 기준 타임아웃 (xcAgentInteractive와 동일 전략)
  // 스펙: heartbeat 간격 15s, 권장 no-event timeout ≥ 45s → 60s 사용
  let inactivityMs = 60_000; // 기본 60s (heartbeat 수신 시 자동 리셋)
  let inactivityFired = false;
  let sChunkCount = 0;

  console.log(`${dbgTagS} SSE 스트림 시작 (inactivityMs=${inactivityMs})`);

  const readNext = (): Promise<{ value: Uint8Array | undefined; done: boolean }> =>
    new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        inactivityFired = true;
        console.warn(`${dbgTagS} ⏱ per-chunk 타임아웃 (${inactivityMs}ms) — 청크 없음. reader.cancel()`);
        reader.cancel().catch(() => {});
        resolve({ value: undefined, done: true });
      }, inactivityMs);

      reader.read().then(
        (result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(result);
        },
        (err: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        },
      );
    });

  while (true) {
    const { value, done } = await readNext();
    if (done) {
      console.log(`${dbgTagS} reader done=true (청크 ${sChunkCount}개 처리 후 종료)`);
      break;
    }

    sChunkCount++;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSseBuffer(buffer);
    buffer = rest;

    let breakOuter = false;
    for (const item of events) {
      if (item.event === 'meta') {
        console.log(`${dbgTagS} SSE [meta]`, item.data);
        if (item.data.session?.messageCount !== undefined) {
          finalSessionCount = item.data.session.messageCount;
        }
      } else if (item.event === 'stdout') {
        console.debug(`${dbgTagS} SSE [stdout]`, String(item.data.chunk).slice(0, 120));
        onDelta(stripAnsi(item.data.chunk));
      } else if (item.event === 'stderr') {
        console.debug(`${dbgTagS} SSE [stderr]`, String(item.data.chunk).slice(0, 120));
        onStderr(stripAnsi(item.data.chunk));
      } else if (item.event === 'status') {
        // ui-stream-status-spec.md: status 이벤트 처리
        const statusEvt = item.data;
        onStatus?.(statusEvt);
        if (statusEvt.state === 'heartbeat') {
          console.debug(`${dbgTagS} SSE [status:heartbeat]`, statusEvt.timestamp ?? '');
        } else {
          console.log(`${dbgTagS} SSE [status:${statusEvt.state}]`, statusEvt);
        }
        switch (statusEvt.state) {
          case 'heartbeat':
            // per-read 타이머 자연 리셋 (다음 readNext() 새 타이머 시작)
            break;
          case 'completed':
          case 'failed':
          case 'canceled':
            inactivityMs = 10_000; // done이 곧 온다
            console.log(`${dbgTagS} inactivityMs → ${inactivityMs}`);
            break;
          case 'waiting':
            inactivityMs = 30 * 60 * 1000;
            console.log(`${dbgTagS} inactivityMs → ${inactivityMs} (interaction 대기)`);
            break;
          case 'resuming':
          case 'recovering':
          case 'generating':
          case 'starting':
          case 'routing':
            inactivityMs = 60_000;
            console.log(`${dbgTagS} inactivityMs → ${inactivityMs}`);
            break;
        }
      } else if (item.event === 'progress') {
        console.debug(`${dbgTagS} SSE [progress:${item.data.stage}]`, item.data);
        onProgress?.(item.data);
      } else if (item.event === 'timeline') {
        console.debug(`${dbgTagS} SSE [timeline:${item.data.stage}]`, item.data);
        onProgress?.(item.data as StreamProgressEvent);
      } else if (item.event === 'activity') {
        console.debug(`${dbgTagS} SSE [activity:${item.data.stage}]`, item.data);
        onActivity?.(item.data);
      } else if (item.event === 'done') {
        doneSeen = true;
        doneOk = item.data.ok;
        doneExitCode = item.data.exitCode;
        timedOut = item.data.timedOut ?? false;
        if (item.data.session?.messageCount !== undefined) {
          finalSessionCount = item.data.session.messageCount;
        }
        console.log(`${dbgTagS} ✅ done 수신 ok=${doneOk} exitCode=${doneExitCode} timedOut=${timedOut}`, item.data);
        // done 수신 즉시 스트림 해제
        reader.cancel().catch(() => {});
        breakOuter = true;
        break;
      } else if (item.event === 'error') {
        console.error(`${dbgTagS} ❌ error 이벤트:`, item.data);
        throw new Error(item.data.message);
      } else {
        const unknown = item as { event: string; data: unknown };
        console.warn(`${dbgTagS} ⚠️ 알 수 없는 이벤트:`, unknown.event, unknown.data);
      }
    }
    if (breakOuter) break;
  }

  console.log(
    `${dbgTagS} 루프 종료 — inactivityFired=${inactivityFired} doneSeen=${doneSeen}` +
      ` doneOk=${doneOk} chunks=${sChunkCount}`,
  );

  if (inactivityFired) return { sessionMessageCount: finalSessionCount };

  // done 이벤트 기준으로 최종 성공 여부 판단 (HTTP 200이어도 실패 가능)
  if (doneSeen && timedOut) throw new Error(tFn ? tFn('chat.agentTimeout') : '에이전트 실행 시간 초과');
  if (doneSeen && !doneOk) {
    throw Object.assign(new Error(tFn ? tFn('chat.agentFailed') : `에이전트 실행 실패 (exitCode: ${doneExitCode})`), {
      code: 'stream_failed',
      exitCode: doneExitCode,
    });
  }

  return { sessionMessageCount: finalSessionCount };
}

/**
 * /chat/stream 미지원 환경 fallback — POST /chat 동기 응답 + simulateStream
 * 첫 토큰 대기 후 타이핑 시뮬레이션으로 체감 속도 보완.
 */
async function xcAgentChatFallback(
  base: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
  onDelta: (t: string) => void,
  onStderr: (chunk: string) => void,
  signal: AbortSignal,
  tFn?: TFunc,
): Promise<{ sessionMessageCount?: number }> {
  const res = await fetch(`${base}/chat`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
    throw new Error(
      errJson.error?.message ??
        (tFn ? tFn('chat.serverError', { status: String(res.status) }) : `서버 오류 (${res.status})`),
    );
  }

  const data = (await res.json()) as {
    ok?: boolean;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    timedOut?: boolean;
    session?: { messageCount?: number };
  };

  if (data.timedOut) throw new Error(tFn ? tFn('chat.agentTimeout') : '에이전트 실행 시간 초과');
  if (data.ok === false || (data.exitCode !== undefined && data.exitCode !== 0)) {
    const errMsg = data.stderr?.trim() || (tFn ? tFn('chat.agentFailed') : '에이전트 실행 실패');
    throw new Error(errMsg);
  }

  if (data.stderr?.trim()) onStderr(data.stderr.trim());

  const text = (data.stdout ?? '').trim() || (tFn ? tFn('chat.noResult') : '(결과 없음)');
  await simulateStream(text, onDelta, signal, 12, 6);
  return { sessionMessageCount: data.session?.messageCount };
}

/**
 * xamongcode API 서버 세션 삭제 (DELETE /sessions/:sessionId?workspace=...)
 * 대화 초기화 시 서버의 저장된 세션 히스토리도 제거한다.
 * 서버가 꺼져 있어도 클라이언트 세션 리셋은 진행되므로 오류를 무시한다.
 */
async function xcAgentDeleteSession(xcAgentApiUrl: string, sessionId: string, workspace?: string): Promise<void> {
  const base = xcAgentApiUrl.replace(/\/$/, '');
  const token = getXcToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const qs = workspace ? `?workspace=${encodeURIComponent(workspace)}` : '';
  try {
    await fetch(`${base}/sessions/${encodeURIComponent(sessionId)}${qs}`, {
      method: 'DELETE',
      headers,
    });
  } catch {
    // 서버 연결 실패 시 무시
  }
}

// ─── /admin/config 로드 및 workspace 경로 변환 유틸 ──────────────────────────

interface WorkspaceEntry {
  id: string; // e.g. "projects"
  path?: string; // GET /workspaces response field, e.g. "F:\\Projects"
  root?: string; // legacy/local fallback field
  name?: string;
  aliases?: string[];
}

interface RuntimeConfig {
  workspaceRoot: string; // e.g. "F:\\Projects"
  defaultWorkspace: string; // e.g. "projects"
}

/**
 * GET /admin/config → workspaceRoot + defaultWorkspace 를 반환.
 * 앱 시작 및 서버 연결 확인 후 호출해 Thread State 초기화에 사용한다.
 */
async function loadAdminConfig(base: string): Promise<RuntimeConfig | null> {
  const token = getXcToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${base}/admin/config`, { headers, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      ok?: boolean;
      layout?: { workspaceRoot?: string; defaultWorkspace?: string };
    };
    const root = json.layout?.workspaceRoot;
    const defaultWs = json.layout?.defaultWorkspace;
    if (!root) return null;
    return { workspaceRoot: root, defaultWorkspace: defaultWs ?? 'projects' };
  } catch {
    return null;
  }
}

/** 경로의 백슬래시를 슬래시로 통일하고 끝 슬래시를 제거 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

/**
 * 절대경로 → workspacePath 상대경로 변환.
 * spec: ui-session-workspace-continuity-spec.md "폴더 선택 규칙"
 */
function toWorkspacePath(absolutePath: string, workspaceRoot: string): string | null {
  const root = normalizePath(workspaceRoot).toLowerCase();
  const target = normalizePath(absolutePath);
  const targetLower = target.toLowerCase();
  if (targetLower === root) return '.';
  if (!targetLower.startsWith(`${root}/`)) return null; // workspace 밖
  return target.slice(root.length + 1);
}

/**
 * 파일 경로이면 부모 폴더 반환 (spec: pickWorkingFolderFromPath).
 * 예) "F:\Projects\music\index.html" → "F:\Projects\music"
 */
function pickFolderFromPath(inputPath: string): string {
  const normalized = inputPath.replace(/\//g, '\\');
  const looksLikeFile = /\.[a-z0-9]+$/i.test(normalized.split('\\').at(-1) ?? '');
  if (!looksLikeFile) return normalized;
  return normalized.split('\\').slice(0, -1).join('\\');
}

function cleanPathCandidate(candidate: string): string {
  return candidate.trim().replace(/[.,;:)\]}]+$/, '');
}

function trimPromptTextFromPath(candidate: string): string {
  const normalized = candidate.trim();
  const fileMatch = normalized.match(/^([A-Za-z]:[\\/].*?\.[A-Za-z0-9][A-Za-z0-9_-]{0,15})(?=\s|$|[.,;:)\]}])/);
  if (fileMatch) return cleanPathCandidate(fileMatch[1]);

  const marker = normalized.search(
    /\s+(?:폴더|파일|디렉토리|에서|에|으로|로|을|를|은|는|이|가|와|과|랑|하고|읽고|참고|분석|정리|만들|생성|포팅|복사|수정|삭제|확인|folder|directory|file|read|and|then|from|into|create|make|write|analyze|convert|port)/i,
  );
  return cleanPathCandidate(marker >= 0 ? normalized.slice(0, marker) : normalized);
}

/**
 * 프롬프트 문자열에서 드라이브 절대경로 추출.
 * 예) "D:\Workspace\sample-app\index.html 을 읽어줘" → "D:\Workspace\sample-app\index.html"
 */
function detectAbsPathInPrompt(prompt: string): string | undefined {
  const match = prompt.match(/[A-Za-z]:[\\/][^\n\r"'<>|?*]+/);
  return match ? trimPromptTextFromPath(match[0]) : undefined;
}

/**
 * GET /workspaces → 서버가 등록한 workspace 목록을 반환.
 * 절대 경로(absPath)에서 매칭되는 workspace.id + 상대 workspacePath를 도출한다.
 * workspaceRoot 를 알고 있으면 toWorkspacePath() 를 우선 사용한다.
 *
 * 예) absPath = "D:\\Workspace\\sample-app"
 *   workspaceEntry.root = "F:\\Projects"
 *   → workspace = "projects", workspacePath = "music/mongna"
 */
async function resolveWorkspaceFromPath(
  base: string,
  absPath: string,
  workspaceRoot?: string,
  defaultWorkspace?: string,
): Promise<{ workspace: string; workspacePath: string } | null> {
  // workspaceRoot 를 이미 알면 API 호출 없이 변환
  if (workspaceRoot) {
    const rel = toWorkspacePath(absPath, workspaceRoot);
    if (rel !== null) return { workspace: defaultWorkspace ?? 'projects', workspacePath: rel };
  }

  const token = getXcToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${base}/workspaces`, { headers });
    if (!res.ok) return null;
    const json = (await res.json()) as { workspaces?: WorkspaceEntry[] };
    const list = json.workspaces ?? [];
    const normalAbs = normalizePath(absPath);
    for (const ws of list) {
      const workspaceRoot = ws.path ?? ws.root;
      if (!workspaceRoot) continue;
      const normalRoot = normalizePath(workspaceRoot);
      if (
        normalAbs.toLowerCase().startsWith(normalRoot.toLowerCase() + '/') ||
        normalAbs.toLowerCase() === normalRoot.toLowerCase()
      ) {
        const rel = normalAbs.slice(normalRoot.length).replace(/^\//, '');
        return { workspace: ws.id, workspacePath: rel || '.' };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── /chat/interactive 양방향 인터랙션 API ────────────────────────────────────

/**
 * POST /chat/runs/:runId/interactions/:interactionId/respond
 * 권한 승인(allow/deny), AskUserQuestion 답변(answer), 제어(response) 모두 사용.
 */
async function respondInteraction(
  base: string,
  runId: string,
  interactionId: string,
  body: unknown,
  tFn?: TFunc,
): Promise<void> {
  const token = getXcToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(
    `${base}/chat/runs/${encodeURIComponent(runId)}/interactions/${encodeURIComponent(interactionId)}/respond`,
    { method: 'POST', headers, body: JSON.stringify(body) },
  );
  if (!res.ok) {
    const text = await res
      .text()
      .catch(() => (tFn ? tFn('chat.respondError', { status: String(res.status) }) : `respond 오류 (${res.status})`));
    throw new Error(text);
  }
}

/** POST /chat/runs/:runId/cancel — interactive run 서버 측 강제 종료 */
async function cancelInteractiveRun(base: string, runId: string): Promise<void> {
  const token = getXcToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    await fetch(`${base}/chat/runs/${encodeURIComponent(runId)}/cancel`, {
      method: 'POST',
      headers,
    });
  } catch {
    /* 서버 중단 시 무시 */
  }
}

/**
 * POST /chat/interactive — 양방향 인터랙션 SSE 스트리밍
 *
 * ui-interaction-control-spec.md 기준:
 *   - meta                : runId 획득 (onRunId 콜백)
 *   - assistant           : 최종 assistant 텍스트 갱신 (onContent — replace)
 *   - stdout / stderr     : 스트리밍 텍스트 / 디버그 로그
 *   - notice              : 응답 불필요 브리핑 (onNotice 콜백)
 *   - interaction_required: 권한 승인 / 질문 응답 / 제어 (onInteraction 콜백)
 *   - interaction_canceled: pending interaction 취소 (onInteractionCanceled 콜백)
 *   - done                : done.ok / done.exitCode 기준 최종 성공 여부 판단
 *   - error               : 서버 에러 throw
 *
 * 일반 채팅 streaming은 /chat/stream 을 사용한다.
 * 권한 승인·질문 응답이 필요한 작업에만 이 함수를 사용한다.
 */
async function xcAgentInteractive(
  base: string,
  prompt: string,
  cfg: AiProviderSettings,
  onDelta: (t: string) => void,
  onContent: (t: string) => void,
  onStageAssistant: (event: StreamAssistantEvent) => void,
  onStderr: (chunk: string) => void,
  onRunId: (runId: string) => void,
  onInteraction: (req: InteractionRequest) => void,
  onInteractionCanceled: (interactionId: string) => void,
  onNotice: (notice: InteractiveNotice) => void,
  signal: AbortSignal,
  sessionId?: string,
  sessionMaxMessages = 20,
  workspace?: string,
  workspacePath?: string,
  userid?: string,
  onMeta?: (meta: InteractiveMeta) => void,
  maxTurns = 40,
  onStatus?: (status: StreamStatusEvent) => void,
  onProgress?: (progress: StreamProgressEvent) => void,
  onActivity?: (activity: StreamActivityEvent) => void,
  tFn?: TFunc,
): Promise<{
  sessionMessageCount?: number;
  bundlePath?: string;
  projectPath?: string;
  readmePath?: string;
  shouldRegisterProject?: boolean;
}> {
  const body: Record<string, unknown> = {
    prompt,
    mode: 'work',
    sessionMaxMessages,
    maxTurns,
  };
  if (sessionId) body.sessionId = sessionId;
  // Agent mode is API-server/config driven. Do not send the desktop app's
  // default provider/model here, otherwise workspace defaults are overridden.
  void cfg;
  if (workspace) body.workspace = workspace;
  if (workspacePath) body.workspacePath = workspacePath;
  if (userid) body.userid = userid;

  const token = getXcToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // ── 디버그 로깅 ────────────────────────────────────────────────────────────
  const dbgTag = `[XC:interactive ${Date.now().toString(36)}]`;
  console.group(`${dbgTag} → POST ${base}/chat/interactive`);
  console.log('request body:', JSON.parse(JSON.stringify(body)));
  console.log('headers (auth):', token ? 'Bearer ***' : '(없음)');
  console.groupEnd();
  // ────────────────────────────────────────────────────────────────────────────

  const res = await fetch(`${base}/chat/interactive`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify(body),
  });

  console.log(`${dbgTag} HTTP ${res.status} ${res.statusText}`);

  if (res.status === 401) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw Object.assign(
      new Error(
        errJson.error?.message ??
          (tFn ? tFn('chat.authRequired') : '인증이 필요합니다. 설정에서 API 토큰을 확인하세요.'),
      ),
      { code: 'unauthorized' },
    );
  }
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    let errMsg = tFn ? tFn('chat.serverError', { status: String(res.status) }) : `서버 오류 (${res.status})`;
    try {
      const errJson = JSON.parse(text);
      if (errJson?.error?.message) errMsg = errJson.error.message;
    } catch {
      /* raw */
    }
    throw new Error(errMsg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalSessionCount: number | undefined;
  let detectedBundlePath: string | undefined;
  let detectedProjectPath: string | undefined;
  let detectedReadmePath: string | undefined;
  let shouldRegisterProject = false;
  let doneSeen = false;
  let doneOk = true;
  let doneExitCode = 0;
  let timedOut = false;
  let assistantSeen = false;

  // ── 비활성 타임아웃 (ui-stream-status-spec.md 기준) ──────────────────────────
  //
  // 스펙 요구사항:
  //   - heartbeat 간격: 15초 / 권장 no-event timeout: ≥ 45초
  //   - heartbeat 수신 시: spinner 유지, timeout RESET
  //   - status: completed/failed/canceled → done 이벤트가 곧 온다 (10초 내)
  //   - status: waiting → 사용자 interaction 대기 (30분)
  //
  // 타임아웃 전략:
  //   A) 청크 비활성 타임아웃 (per-read, 60초):
  //      - reader.read()가 60초 내에 데이터를 반환하지 않으면 루프 탈출
  //      - heartbeat 수신 시 자동 리셋 (다음 readNext() 호출 시 새 타이머)
  //   B) 응답 후 절대 타임아웃 (post-assistant, 60초):
  //      - assistant 이벤트(최종 응답) 수신 후 60초 내에 done 없으면 완료 처리
  //      - heartbeat가 계속 와도 리셋되지 않는 하드 타임아웃
  //      - status: completed/failed → 10초로 단축
  //      - status: waiting (interaction) → 취소 (사용자가 직접 응답할 때까지 대기)

  const INACTIVITY_DEFAULT_MS = 60_000; // 60s: heartbeat 간격(15s) 대비 안전 마진
  const INACTIVITY_TERMINAL_MS = 10_000; // 10s: completed/failed/canceled 후
  const INACTIVITY_WAITING_MS = 30 * 60 * 1000; // 30min: interaction 사용자 대기
  const POST_RESPONSE_HARD_MS = 60_000; // 60s: assistant 후 done 미수신 시 강제 완료

  let inactivityMs = INACTIVITY_DEFAULT_MS;
  let inactivityFired = false;
  let postResponseHardFired = false;
  let postResponseHardTimer: ReturnType<typeof setTimeout> | null = null;
  let lastStatus: StreamStatusState | null = null;
  let chunkCount = 0;

  console.log(`${dbgTag} SSE 스트림 시작 (inactivityMs=${inactivityMs})`);

  /**
   * reader.read()에 per-chunk 비활성 타임아웃을 추가.
   * 서버가 연결을 유지한 채 아무 데이터도 보내지 않으면 루프를 빠져나온다.
   * heartbeat 청크가 오면 자연스럽게 리셋 (다음 readNext() 호출 시 새 타이머 시작).
   */
  const readNext = (): Promise<{ value: Uint8Array | undefined; done: boolean }> =>
    new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        inactivityFired = true;
        console.warn(`${dbgTag} ⏱ per-chunk 타임아웃 (${inactivityMs}ms) — 청크 없음. reader.cancel()`);
        reader.cancel().catch(() => {});
        resolve({ value: undefined, done: true });
      }, inactivityMs);

      reader.read().then(
        (result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(result);
        },
        (err: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        },
      );
    });

  try {
    outer: while (true) {
      const { value, done } = await readNext();
      if (done) {
        console.log(`${dbgTag} reader.read() done=true (청크 ${chunkCount}개 처리 후 종료)`);
        break;
      }

      chunkCount++;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSseBuffer(buffer);
      buffer = rest;

      for (const raw of events as Array<{ event: string; data: Record<string, unknown> }>) {
        const { event, data } = raw;

        // ── SSE 이벤트 로그 (verbose) ────────────────────────────────────────
        if (event === 'stdout' || event === 'stderr') {
          // stdout/stderr는 텍스트만 간략하게
          console.debug(`${dbgTag} SSE [${event}]`, String(data.chunk ?? '').slice(0, 120));
        } else if (event === 'status' && (data as unknown as StreamStatusEvent).state === 'heartbeat') {
          // heartbeat는 한 줄로
          console.debug(`${dbgTag} SSE [status:heartbeat] ${(data as unknown as StreamStatusEvent).timestamp ?? ''}`);
        } else {
          console.log(`${dbgTag} SSE [${event}]`, data);
        }
        // ─────────────────────────────────────────────────────────────────────

        switch (event) {
          case 'meta': {
            const meta = data as unknown as InteractiveMeta;
            if (meta.runId) onRunId(meta.runId);
            if ((data.session as SessionSummary)?.messageCount !== undefined) {
              finalSessionCount = (data.session as SessionSummary).messageCount;
            }
            onMeta?.(meta);
            break;
          }
          case 'assistant': {
            assistantSeen = true;
            const assistantEvent = data as unknown as StreamAssistantEvent;
            const text = stripAnsi(String(assistantEvent.text ?? ''));
            if (assistantEvent.stage) {
              onStageAssistant({ ...assistantEvent, text });
            } else {
              onContent(text);
            }
            // 최종 응답 수신 → 절대 타임아웃 시작 (heartbeat에 리셋되지 않음)
            // status: completed 수신 시 단축되고 status: waiting 수신 시 취소된다.
            if (postResponseHardTimer) clearTimeout(postResponseHardTimer);
            postResponseHardTimer = setTimeout(() => {
              postResponseHardFired = true;
              console.warn(
                `${dbgTag} ⏱ post-response 하드 타임아웃 (${POST_RESPONSE_HARD_MS}ms) — done 미수신. 강제 완료.`,
              );
              reader.cancel().catch(() => {});
            }, POST_RESPONSE_HARD_MS);
            console.log(`${dbgTag} assistant 수신 → 하드 타이머 시작 (${POST_RESPONSE_HARD_MS}ms)`);
            break;
          }
          case 'stdout': {
            const chunk = stripAnsi(String(data.chunk ?? ''));
            const stage = (data as unknown as { stage?: XconStageInfo }).stage;
            if (stage) {
              onStageAssistant({
                runId: typeof data.runId === 'string' ? data.runId : undefined,
                text: chunk,
                stage,
                raw: data,
                append: true,
              });
            } else {
              onDelta(chunk);
            }
            break;
          }
          case 'stderr':
            onStderr(stripAnsi(String(data.chunk ?? '')));
            break;
          case 'notice': {
            const noticeEvt = data as unknown as InteractiveNotice;
            // notice.raw 에서 번들 경로 감지 (od_progress:saved 스타일 데이터)
            if (noticeEvt.raw && typeof noticeEvt.raw === 'object') {
              const raw = noticeEvt.raw as Record<string, unknown>;
              if (raw.stage === 'saved' && typeof raw.bundlePath === 'string' && raw.bundlePath) {
                detectedBundlePath = raw.bundlePath;
                (window as any).CURRENT_XAPP_BUNDLE_PATH = detectedBundlePath;
                console.log(`${dbgTag} 📦 번들 경로 감지 (notice.raw):`, detectedBundlePath);
              }
              if (typeof raw.projectPath === 'string' && raw.projectPath) {
                detectedProjectPath = raw.projectPath;
                (window as any).CURRENT_XAPP_PROJECT_PATH = detectedProjectPath;
              }
              if (typeof raw.readmePath === 'string' && raw.readmePath) {
                detectedReadmePath = raw.readmePath;
                (window as any).CURRENT_XAPP_README_PATH = detectedReadmePath;
              }
            }
            onNotice(noticeEvt);
            break;
          }
          case 'status': {
            // ui-stream-status-spec.md 기준 상태 처리
            const statusEvt = data as unknown as StreamStatusEvent;
            onStatus?.(statusEvt);
            if (statusEvt.state !== 'heartbeat') {
              lastStatus = statusEvt.state;
            }
            switch (statusEvt.state) {
              case 'heartbeat':
                // per-read 타이머는 다음 readNext() 호출 시 자동 리셋됨
                // postResponseHardTimer는 의도적으로 리셋하지 않음 (hard limit)
                break;
              case 'completed':
              case 'failed':
              case 'canceled':
                // done이 곧 온다 — per-chunk 타임아웃 단축
                inactivityMs = INACTIVITY_TERMINAL_MS;
                console.log(`${dbgTag} status:${statusEvt.state} → inactivityMs=${inactivityMs}`);
                // post-response 하드 타임아웃도 단축 (status가 더 정확한 신호)
                if (postResponseHardTimer) {
                  clearTimeout(postResponseHardTimer);
                  postResponseHardTimer = setTimeout(() => {
                    postResponseHardFired = true;
                    console.warn(`${dbgTag} ⏱ post-response 단축 타임아웃 — done 미수신. 강제 완료.`);
                    reader.cancel().catch(() => {});
                  }, INACTIVITY_TERMINAL_MS + 2_000);
                }
                break;
              case 'waiting':
                // interaction 대기: 타임아웃 연장 + 하드 타이머 취소 (사용자 응답 대기)
                inactivityMs = INACTIVITY_WAITING_MS;
                console.log(`${dbgTag} status:waiting → inactivityMs=${inactivityMs}, 하드 타이머 취소`);
                if (postResponseHardTimer) {
                  clearTimeout(postResponseHardTimer);
                  postResponseHardTimer = null;
                }
                break;
              case 'resuming':
              case 'recovering':
              case 'generating':
              case 'starting':
              case 'routing':
                // 실행 재개 → 타임아웃 복원
                inactivityMs = INACTIVITY_DEFAULT_MS;
                console.log(`${dbgTag} status:${statusEvt.state} → inactivityMs=${inactivityMs}`);
                break;
            }
            break;
          }
          case 'progress': {
            console.debug(`${dbgTag} SSE [progress:${String(data.stage ?? '')}]`, data);
            // progress.detail 에서 번들 경로 감지 (od_progress:saved 래핑 형식)
            if (data.detail && typeof data.detail === 'object') {
              const d = data.detail as Record<string, unknown>;
              if (d.stage === 'saved' && typeof d.bundlePath === 'string' && d.bundlePath) {
                detectedBundlePath = d.bundlePath;
                (window as any).CURRENT_XAPP_BUNDLE_PATH = detectedBundlePath;
                console.log(`${dbgTag} 📦 번들 경로 감지 (progress.detail):`, detectedBundlePath);
              }
              if (typeof d.projectPath === 'string' && d.projectPath) {
                detectedProjectPath = d.projectPath;
                (window as any).CURRENT_XAPP_PROJECT_PATH = detectedProjectPath;
              }
              if (typeof d.readmePath === 'string' && d.readmePath) {
                detectedReadmePath = d.readmePath;
                (window as any).CURRENT_XAPP_README_PATH = detectedReadmePath;
              }
            }
            // od_progress 이벤트가 progress 래핑 없이 직접 올 경우
            if (
              data.type === 'od_progress' &&
              data.stage === 'saved' &&
              typeof data.bundlePath === 'string' &&
              data.bundlePath
            ) {
              detectedBundlePath = data.bundlePath as string;
              (window as any).CURRENT_XAPP_BUNDLE_PATH = detectedBundlePath;
              console.log(`${dbgTag} 📦 번들 경로 감지 (progress od_progress):`, detectedBundlePath);
            }
            if (typeof data.projectPath === 'string' && data.projectPath) {
              detectedProjectPath = data.projectPath as string;
              (window as any).CURRENT_XAPP_PROJECT_PATH = detectedProjectPath;
            }
            if (typeof data.readmePath === 'string' && data.readmePath) {
              detectedReadmePath = data.readmePath as string;
              (window as any).CURRENT_XAPP_README_PATH = detectedReadmePath;
            }
            onProgress?.(data as unknown as StreamProgressEvent);
            break;
          }
          case 'timeline': {
            console.debug(`${dbgTag} SSE [timeline:${String(data.stage ?? '')}]`, data);
            onProgress?.(data as unknown as StreamProgressEvent);
            break;
          }
          case 'activity': {
            console.debug(`${dbgTag} SSE [activity:${String(data.stage ?? '')}]`, data);
            onActivity?.(data as unknown as StreamActivityEvent);
            break;
          }
          case 'interaction_required':
            onInteraction(data as unknown as InteractionRequest);
            // interaction_required = waiting 상태와 동일 처리
            inactivityMs = INACTIVITY_WAITING_MS;
            console.log(`${dbgTag} interaction_required → inactivityMs=${inactivityMs}, 하드 타이머 취소`);
            if (postResponseHardTimer) {
              clearTimeout(postResponseHardTimer);
              postResponseHardTimer = null;
            }
            break;
          case 'interaction_canceled':
            onInteractionCanceled(String(data.interactionId ?? ''));
            // 승인 처리 후 agent 재개 → 타임아웃 복원
            inactivityMs = INACTIVITY_DEFAULT_MS;
            console.log(`${dbgTag} interaction_canceled → inactivityMs=${inactivityMs}`);
            break;
          case 'done': {
            if (postResponseHardTimer) {
              clearTimeout(postResponseHardTimer);
              postResponseHardTimer = null;
            }
            doneSeen = true;
            doneOk = Boolean(data.ok);
            doneExitCode = Number(data.exitCode ?? 0);
            timedOut = Boolean(data.timedOut);
            if ((data.session as SessionSummary)?.messageCount !== undefined) {
              finalSessionCount = (data.session as SessionSummary).messageCount;
            }
            const donePayload = data as unknown as CompletionPayload;
            shouldRegisterProject = isAppCreationDone(donePayload);
            const projectPath = projectPathFromDonePayload(donePayload);
            if (projectPath) {
              detectedProjectPath = projectPath;
              (window as any).CURRENT_XAPP_PROJECT_PATH = detectedProjectPath;
            }
            const readmePath = readmePathFromDonePayload(donePayload);
            if (readmePath) {
              detectedReadmePath = readmePath;
              (window as any).CURRENT_XAPP_README_PATH = detectedReadmePath;
            }
            // done 이벤트에 번들 경로 포함 시 추출
            const bundlePath = bundlePathFromDonePayload(donePayload);
            if (bundlePath) {
              detectedBundlePath = bundlePath;
              (window as any).CURRENT_XAPP_BUNDLE_PATH = detectedBundlePath;
            }
            if (detectedProjectPath && !detectedReadmePath) {
              detectedReadmePath = joinXappPath(detectedProjectPath, 'README.md');
              (window as any).CURRENT_XAPP_README_PATH = detectedReadmePath;
            }
            if (detectedProjectPath && !detectedBundlePath) {
              detectedBundlePath = xappEntryFilePath(detectedProjectPath);
              (window as any).CURRENT_XAPP_BUNDLE_PATH = detectedBundlePath;
            }
            const validationWarning = xconValidationWarningFromDonePayload(donePayload, tFn);
            if (validationWarning) {
              onDelta(`\n\n${validationWarning}`);
              onStderr(`${validationWarning}\n`);
            }
            console.log(
              `${dbgTag} ✅ done 수신 ok=${doneOk} exitCode=${doneExitCode} timedOut=${timedOut} projectPath=${detectedProjectPath ?? '없음'} readmePath=${detectedReadmePath ?? '없음'} bundlePath=${detectedBundlePath ?? '없음'}`,
            );
            // done 이벤트 수신 즉시 스트림 해제 후 루프 탈출.
            reader.cancel().catch(() => {});
            break outer;
          }
          case 'error':
            console.error(`${dbgTag} ❌ error 이벤트:`, data);
            throw new Error(String(data.message ?? (tFn ? tFn('chat.serverErr') : '서버 에러')));
          default:
            console.warn(`${dbgTag} ⚠️ 알 수 없는 이벤트:`, event, data);
        }
      }
    }
  } finally {
    // 타이머 누수 방지: 예외·정상 종료 모두 cleanup
    if (postResponseHardTimer) {
      clearTimeout(postResponseHardTimer);
      postResponseHardTimer = null;
    }
    console.log(
      `${dbgTag} 루프 종료 — inactivityFired=${inactivityFired} postResponseHardFired=${postResponseHardFired}` +
        ` doneSeen=${doneSeen} doneOk=${doneOk} lastStatus=${lastStatus} chunks=${chunkCount}`,
    );
  }

  if (!doneSeen) {
    const reason = postResponseHardFired
      ? 'assistant 응답 후 done 이벤트를 받지 못했습니다.'
      : inactivityFired
        ? '스트림 비활성 타임아웃으로 done 이벤트를 받지 못했습니다.'
        : 'done 이벤트 없이 스트림이 종료되었습니다.';
    if (assistantSeen) {
      onStderr(
        (tFn ? tFn('chat.doneMissingWarn') : `[경고] ${reason}`) +
          ' 이미 수신한 assistant 응답을 최종 응답으로 처리합니다.\n',
      );
      return {
        sessionMessageCount: finalSessionCount,
        bundlePath: detectedBundlePath,
        projectPath: detectedProjectPath,
        readmePath: detectedReadmePath,
        shouldRegisterProject,
      };
    }
    throw Object.assign(new Error(reason), { code: 'stream_incomplete' });
  }
  if (doneSeen && timedOut) throw new Error(tFn ? tFn('chat.agentTimeout') : '에이전트 실행 시간 초과');
  if (doneSeen && !doneOk) {
    throw Object.assign(new Error(tFn ? tFn('chat.agentFailed') : `에이전트 실행 실패 (exitCode: ${doneExitCode})`), {
      code: 'stream_failed',
      exitCode: doneExitCode,
    });
  }

  return {
    sessionMessageCount: finalSessionCount,
    bundlePath: detectedBundlePath,
    projectPath: detectedProjectPath,
    readmePath: detectedReadmePath,
    shouldRegisterProject,
  };
}

/**
 * Lab Web UI 서버 호출 (xamong-code lab start, 기본 포트 3845)
 *
 * 실제 엔드포인트:
 *   GET  /api/health     → { ok: true, workspaceRoot, tools }
 *   GET  /api/scenarios  → { scenarios: [...] }
 *   POST /api/plan       → { plan: [...], tools: [...] }
 *   POST /api/run        → { transcript: { results, answer } }
 *                           (X-Agent-Approved: yes 헤더 필요)
 *
 * 흐름:
 *   1) /api/plan  — 프롬프트에 매칭되는 계획 조회 및 표시
 *   2) 계획이 비어 있으면 /api/scenarios 에서 지원 목록 안내 (종료)
 *   3) /api/run   — 계획 실행 및 결과 스트리밍
 *
 * ※ Lab 모드는 실험 전용. 실패해도 에이전트 서버로 폴백하지 않음.
 *    (main/index.ts CORS 핸들러에서 X-Agent-Approved 헤더 허용 필요)
 */
async function xcCallLab(
  labApiUrl: string,
  prompt: string,
  onDelta: (t: string) => void,
  signal: AbortSignal,
  tFn?: TFunc,
): Promise<void> {
  const base = labApiUrl.replace(/\/$/, '');

  // ── Step 1: 실행 계획 조회 ─────────────────────────────────────────────────
  const planRes = await fetch(`${base}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ prompt }),
  });

  if (!planRes.ok) {
    const errJson = (await planRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(errJson.error ?? (tFn ? tFn('chat.labPlanError') : `Lab /api/plan 오류 (${planRes.status})`));
  }

  const planJson = (await planRes.json().catch(() => ({}))) as { plan?: unknown[]; tools?: unknown[] };
  const steps = planJson.plan ?? [];

  // ── Step 2: 계획이 없으면 지원 시나리오 안내 후 종료 ───────────────────────
  if (steps.length === 0) {
    onDelta(`ℹ Lab 시나리오가 이 프롬프트와 매칭되지 않습니다.\n\n`);
    onDelta(`Lab은 키워드 기반의 결정론적 실험 도구입니다.\n`);
    onDelta(`아래 시나리오 중 하나를 그대로 입력해 보세요:\n\n`);

    // 지원 시나리오 목록 조회
    try {
      const scRes = await fetch(`${base}/api/scenarios`, { signal });
      if (scRes.ok) {
        const scJson = (await scRes.json().catch(() => ({}))) as {
          scenarios?: { label?: string; prompt?: string; category?: string }[];
        };
        const scenarios = scJson.scenarios ?? [];
        // 카테고리별 그룹핑
        const byCategory = new Map<string, { label: string; prompt: string }[]>();
        for (const sc of scenarios) {
          const cat = sc.category ?? (tFn ? tFn('chat.other') : '기타');
          if (!byCategory.has(cat)) byCategory.set(cat, []);
          byCategory.get(cat)!.push({ label: sc.label ?? '', prompt: sc.prompt ?? '' });
        }
        for (const [cat, items] of byCategory) {
          onDelta(`[${cat}]\n`);
          for (const item of items) {
            onDelta(`  • ${item.prompt}  (${item.label})\n`);
          }
          onDelta('\n');
        }
      } else {
        // 시나리오 조회 실패 시 고정 예시
        onDelta(`  • explain folder structure\n`);
        onDelta(`  • analyze this file\n`);
        onDelta(`  • summarize and compare documents\n`);
        onDelta(`  • analyze csv data and create chart\n`);
        onDelta(`  • check logs and service health\n`);
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      onDelta(`  • explain folder structure\n`);
      onDelta(`  • analyze this file\n`);
    }
    return;
  }

  // ── Step 3: 계획 표시 ──────────────────────────────────────────────────────
  onDelta(tFn ? tFn('chat.executionPlan') : '📋 실행 계획:\n');
  for (const step of steps) {
    const s = step as { tool?: string; input?: Record<string, unknown>; why?: string };
    const inputKeys = s.input ? Object.keys(s.input) : [];
    const args = inputKeys.length > 0 ? `  ${JSON.stringify(s.input)}` : '';
    onDelta(`  • ${s.tool ?? '?'}${args}\n`);
  }
  onDelta('\n');
  if (signal.aborted) return;
  await new Promise((r) => setTimeout(r, 120));

  // ── Step 4: 계획 실행 ──────────────────────────────────────────────────────
  const runRes = await fetch(`${base}/api/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-Approved': 'yes', // write/execute 도구 승인
    },
    signal,
    body: JSON.stringify({ prompt }),
  });

  if (!runRes.ok) {
    const errJson = (await runRes.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new Error(errJson.error ?? (tFn ? tFn('chat.labRunError') : `Lab /api/run 오류 (${runRes.status})`));
  }

  const runJson = (await runRes.json().catch(() => ({}))) as {
    transcript?: {
      results?: {
        ok?: boolean;
        call?: { tool?: string };
        result?: { data?: unknown };
        error?: string;
        code?: string;
      }[];
      answer?: string;
    };
  };

  const transcript = runJson.transcript;
  if (!transcript) {
    throw new Error(tFn ? tFn('chat.labNoTranscript') : 'Lab 서버가 transcript를 반환하지 않았습니다.');
  }

  // ── Step 5: 결과 스트리밍 ──────────────────────────────────────────────────
  const results = transcript.results ?? [];
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;

  if (results.length > 0) {
    onDelta(`✅ 실행 완료 (성공: ${succeeded} / ${results.length}${failed > 0 ? `, 실패: ${failed}` : ''})\n\n`);
    for (const r of results) {
      const toolName = r.call?.tool ?? '?';
      if (r.ok) {
        const output = r.result?.data;
        const outputStr = typeof output === 'string' ? output : output != null ? JSON.stringify(output, null, 2) : '';
        if (outputStr) {
          onDelta(`[${toolName}]\n${outputStr}\n\n`);
          if (signal.aborted) return;
          await new Promise((re) => setTimeout(re, 15));
        }
      } else {
        onDelta(`[${toolName}] ❌ ${r.error ?? (tFn ? tFn('chat.failed') : '실패')}${r.code ? ` (${r.code})` : ''}\n`);
      }
    }
  } else {
    onDelta('실행 결과가 없습니다 (계획에 도구 호출이 포함되지 않음).');
  }
}

// ─── 직접 AI 프로바이더 호출 (스트리밍) ──────────────────────────────────────

/** Chat Completions 호환 (OpenAI, Groq, Together, Fireworks, Ollama, LM Studio, Azure) */
async function directCallOpenAICompat(
  cfg: AiProviderSettings,
  messages: { role: string; content: string }[],
  onDelta: (t: string) => void,
  signal: AbortSignal,
  tFn?: TFunc,
): Promise<void> {
  const baseUrl =
    cfg.baseUrl ||
    (cfg.provider === 'groq'
      ? 'https://api.groq.com/openai/v1'
      : cfg.provider === 'deepseek'
        ? 'https://api.deepseek.com'
        : cfg.provider === 'qwen'
          ? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
          : cfg.provider === 'together'
            ? 'https://api.together.ai/v1'
            : cfg.provider === 'fireworks'
              ? 'https://api.fireworks.ai/inference/v1'
              : cfg.provider === 'ollama'
                ? 'http://localhost:11434/v1'
                : cfg.provider === 'lmstudio'
                  ? 'http://localhost:1234/v1'
                  : 'https://api.openai.com/v1');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({ model: cfg.model, messages, stream: true }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`[${res.status}] ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error(tFn ? tFn('chat.streamReadError') : '응답 스트림을 읽을 수 없습니다.');
  const dec = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.replace(/^data:\s*/, '');
      if (!t || t === '[DONE]') continue;
      try {
        const delta = JSON.parse(t).choices?.[0]?.delta?.content;
        if (delta) onDelta(delta);
      } catch {
        /* 무시 */
      }
    }
  }
}

/** Anthropic Messages API (SSE 스트리밍) */
async function directCallAnthropic(
  cfg: AiProviderSettings,
  messages: { role: string; content: string }[],
  onDelta: (t: string) => void,
  signal: AbortSignal,
  tFn?: TFunc,
): Promise<void> {
  const baseUrl = cfg.baseUrl || 'https://api.anthropic.com';
  const sysMsgs = messages.filter((m) => m.role === 'system');
  const chatMsgs = messages.filter((m) => m.role !== 'system');

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal,
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 4096,
      system: sysMsgs.map((m) => m.content).join('\n') || undefined,
      messages: chatMsgs,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`[${res.status}] ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error(tFn ? tFn('chat.streamReadError') : '응답 스트림을 읽을 수 없습니다.');
  const dec = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const t = line.slice(5).trim();
      if (!t) continue;
      try {
        const json = JSON.parse(t);
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          onDelta(json.delta.text);
        }
      } catch {
        /* 무시 */
      }
    }
  }
}

/** Google Gemini REST SSE */
async function directCallGemini(
  cfg: AiProviderSettings,
  messages: { role: string; content: string }[],
  onDelta: (t: string) => void,
  signal: AbortSignal,
  tFn?: TFunc,
): Promise<void> {
  if (cfg.baseUrl) return directCallOpenAICompat(cfg, messages, onDelta, signal, tFn);

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
  const sysText = messages.find((m) => m.role === 'system')?.content;
  const body: Record<string, unknown> = { contents };
  if (sysText) body.systemInstruction = { parts: [{ text: sysText }] };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:streamGenerateContent?alt=sse&key=${cfg.apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal, body: JSON.stringify(body) },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`[${res.status}] ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error(tFn ? tFn('chat.streamReadError') : '응답 스트림을 읽을 수 없습니다.');
  const dec = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const t = line.slice(5).trim();
      if (!t) continue;
      try {
        const text = JSON.parse(t).candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) onDelta(text);
      } catch {
        /* 무시 */
      }
    }
  }
}

// ─── 최상위 디스패처 ──────────────────────────────────────────────────────────

/**
 * agent 모드: xamongcode API(/chat/stream SSE) 호출
 * draft 모드: xcApiUrl이 설정·응답 중이면 XC API 경유, 아니면 AI 프로바이더 직접 호출
 * lab 모드: labApiUrl 전용 서버로만 호출 (에이전트 API와 완전히 독립)
 *
 * @param xcAgentOk       에이전트 모드(xamongcode) 서버 연결 가능 여부
 * @param draftPath       드래프트 모드 경로 ('xc' | 'direct')
 * @param labPath         Lab 모드 경로 ('xc' | 'unreachable')
 * @param onContent       XC 에이전트 경로 전용 replace 콜백 (SSE 이벤트마다 전체 내용 교체)
 * @param onStderr        stderr 청크 수신 콜백 (디버그 패널용)
 * @param sessionId       에이전트 모드 전용 세션 ID (서버 측 컨텍스트 유지)
 * @param onSessionUpdate 세션 메시지 수 업데이트 콜백
 * @param agentWorkspace  에이전트 workspace 파라미터
 * @param agentWorkspacePath 에이전트 workspacePath 파라미터
 */
async function dispatchChat(
  cfg: AiProviderSettings,
  mode: ChatMode,
  history: ChatMessage[],
  onDelta: (t: string) => void,
  onContent: (content: string) => void,
  onStderr: (chunk: string) => void,
  signal: AbortSignal,
  xcAgentOk: boolean,
  draftPath: CallPath,
  labPath: CallPath,
  workspace?: string,
  onWorkspaceChange?: (path: string) => void,
  onBundleReady?: (bundlePath: string) => void,
  sessionId?: string,
  onSessionUpdate?: (count: number) => void,
  agentWorkspace?: string,
  agentWorkspacePath?: string,
  tFn?: TFunc,
): Promise<void> {
  const lastUserMsg = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';

  // ── Lab 모드 ─────────────────────────────────────────────────────────────
  if (mode === 'lab') {
    if (labPath === 'xc') {
      const labUrl = (cfg.labApiUrl || DEFAULT_LAB_API_URL).replace(/\/$/, '');
      await xcCallLab(labUrl, lastUserMsg, onDelta, signal, tFn);
    } else {
      // Lab 서버에 연결할 수 없음 → 안내 메시지 출력
      const labUrl = cfg.labApiUrl || DEFAULT_LAB_API_URL;
      await simulateStream(
        tFn
          ? tFn('chat.labConnectFailed', { url: labUrl })
          : `[Lab 모드] Lab API 서버(${labUrl})에 연결할 수 없습니다.\n\n` +
              `Lab 서버가 실행 중인지 확인하거나, 설정(⚙) → AI 프로바이더 → Lab API 에서\n` +
              `서버 주소를 수정해 주세요.\n` +
              `기본 주소: ${DEFAULT_LAB_API_URL}`,
        onDelta,
        signal,
      );
    }
    return;
  }

  // ── 드래프트 모드 (xamong-code /api/agent SSE) ────────────────────────────
  if (draftPath === 'xc') {
    await xcCallAgent(
      cfg.xcApiUrl.replace(/\/$/, ''),
      lastUserMsg,
      cfg,
      onContent,
      signal,
      workspace,
      onWorkspaceChange,
      onBundleReady,
      tFn,
    );
    return;
  }

  // 직접 AI 호출 (스트리밍)
  const messages = history.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));

  switch (cfg.provider) {
    case 'anthropic':
      await directCallAnthropic(cfg, messages, onDelta, signal, tFn);
      break;
    case 'gemini':
      await directCallGemini(cfg, messages, onDelta, signal, tFn);
      break;
    default:
      await directCallOpenAICompat(cfg, messages, onDelta, signal, tFn);
  }
}

// ─── 웰컴 메시지 ─────────────────────────────────────────────────────────────

function makeWelcome(cfg: AiProviderSettings, tFn?: TFunc): ChatMessage {
  const isLocal = LOCAL_PROVIDERS.has(cfg.provider);
  const hasKey = isLocal || !!cfg.apiKey || !!cfg.xcApiUrl;
  const xcAgentUrl = cfg.xcAgentApiUrl || DEFAULT_AGENT_API_URL;
  const draftVia = cfg.xcApiUrl
    ? tFn
      ? tFn('chat.welcomeDraftApiServer', { url: cfg.xcApiUrl })
      : `Draft API server (${cfg.xcApiUrl})`
    : tFn
      ? tFn('chat.welcomeDraftDirect', { provider: PROVIDER_LABEL[cfg.provider] })
      : `${PROVIDER_LABEL[cfg.provider]} direct`;
  const labUrl = cfg.labApiUrl || DEFAULT_LAB_API_URL;
  const title = tFn ? tFn('chat.welcomeTitle') : 'XamongCode Chat Pane';
  const statusLabel = hasKey
    ? tFn
      ? tFn('chat.welcomeReady')
      : 'Ready to connect'
    : tFn
      ? tFn('chat.welcomeSetupNeeded')
      : 'Setup needed';
  return {
    id: 'welcome',
    role: 'system',
    content:
      (tFn ? tFn('chat.welcomeIntro', { title }) : `⬡ ${title}`) +
      '\n' +
      (tFn ? tFn('chat.welcomeAgentMode', { url: xcAgentUrl }) : `Agent mode: xamongcode API server (${xcAgentUrl})`) +
      '\n' +
      (tFn ? tFn('chat.welcomeDraftMode', { via: draftVia }) : `Draft mode: ${draftVia}`) +
      '\n' +
      (tFn ? tFn('chat.welcomeLabMode', { url: labUrl }) : `Lab mode: Lab API server (${labUrl})`) +
      '\n' +
      (tFn ? tFn('chat.welcomeModel', { model: cfg.model }) : `Model: ${cfg.model}`) +
      '\n' +
      (tFn ? tFn('chat.welcomeStatus', { status: statusLabel }) : `Status: ${statusLabel}`) +
      '\n\n' +
      (tFn ? tFn('chat.welcomeChangeHint') : 'Change via Settings (⚙) → AI Provider.'),
    timestamp: new Date(),
  };
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

type XcStatus = 'checking' | 'ok' | 'unreachable' | 'none';

export function XamongCodeChatPane() {
  const { t: t18n } = useI18n();
  const [aiCfg, setAiCfg] = useState<AiProviderSettings>(DEFAULT_AI);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasContent, setHasContent] = useState(false);
  const [mode, setMode] = useState<ChatMode>('agent');
  const [isBusy, setIsBusy] = useState(false);
  // 에이전트 모드 API 상태 (xcAgentApiUrl — xamongcode)
  const [xcAgentStatus, setXcAgentStatus] = useState<XcStatus>('checking');
  // 드래프트 모드 API 상태 (xcApiUrl — xamong-code)
  const [draftStatus, setDraftStatus] = useState<XcStatus>('none');
  // Lab 모드 API 상태 (labApiUrl — 항상 체크)
  const [labStatus, setLabStatus] = useState<XcStatus>('checking');
  // 현재 열린 작업 폴더 (드래프트 에이전트에 workspace 로 전달)
  const [workspace, setWorkspace] = useState<string | undefined>(undefined);
  // 에이전트 모드 세션 (서버 측 컨텍스트 유지)
  const [agentSessionId, setAgentSessionId] = useState<string>(() => makeSessionId());
  const [agentMsgCount, setAgentMsgCount] = useState<number>(0);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // 에이전트 run 관리 (run ID: InteractionCard의 respond API 호출에 사용)
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const activeRunIdRef = useRef<string | null>(null); // 콜백에서 stale closure 방지

  // SSE meta 이벤트로 수신한 실제 작업 디렉토리 (컨텍스트 바 표시용)
  const [agentCwd, setAgentCwd] = useState<string | undefined>(undefined);
  // meta에서 받은 workspace/workspacePath (후속 요청에 재사용)
  const [resolvedWorkspace, setResolvedWorkspace] = useState<string | undefined>(undefined);
  const [resolvedWorkspacePath, setResolvedWorkspacePath] = useState<string | undefined>(undefined);
  // /admin/config 에서 로드한 서버 런타임 설정
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [defaultWorkspace, setDefaultWorkspace] = useState<string | null>(null);
  // status 이벤트 기반 실행 상태 (ui-stream-status-spec.md)
  const [runStatus, setRunStatus] = useState<StreamStatusState | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const mentionMapRef = useRef(new Map<string, InlineMention>());
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** 마지막으로 전송한 사용자 프롬프트 — 프로젝트 등록 시 SUMMARY/TITLE 추출에 사용 */
  const lastUserPromptRef = useRef<string>('');

  // 프로젝트 등록 결과 토스트 (ok | error | null)
  const [projRegToast, setProjRegToast] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null);

  const clearResolvedAgentWorkspace = useCallback(() => {
    setAgentCwd(undefined);
    setResolvedWorkspace(undefined);
    setResolvedWorkspacePath(undefined);
  }, []);

  // ── 첨부 파일 관리 ─────────────────────────────────────────────────────────
  const addAttachment = useCallback((path: string) => {
    const name = path.replace(/\\/g, '/').split('/').pop() || path;
    setAttachments((prev) => (prev.some((a) => a.path === path) ? prev : [...prev, { path, name }]));
  }, []);

  const removeAttachment = useCallback((path: string) => {
    setAttachments((prev) => prev.filter((a) => a.path !== path));
  }, []);

  // ── 인라인 멘션 삽입 ─────────────────────────────────────────────────────────
  const insertMention = useCallback((path: string) => {
    const el = editableRef.current;
    const label = path.replace(/\\/g, '/').split('/').pop() || path;
    const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    mentionMapRef.current.set(id, { id, label, path });

    const span = document.createElement('span');
    span.className = 'xc-mention';
    span.contentEditable = 'false';
    span.dataset.id = id;
    span.textContent = `@${label}`;

    const sel = window.getSelection();
    if (el && sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(span);
      const space = document.createTextNode('\u00a0');
      span.after(space);
      const r2 = document.createRange();
      r2.setStart(space, 1);
      r2.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r2);
    } else if (el) {
      const space = document.createTextNode('\u00a0');
      el.appendChild(span);
      el.appendChild(space);
    }

    setHasContent(true);
    el?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 드래그 & 드롭 ─────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      // 실제 OS 파일 드롭 → 상단 첨부 태그 (파일/이미지 등 바이너리 첨부)
      if (e.dataTransfer.files.length > 0) {
        Array.from(e.dataTransfer.files).forEach((f) => {
          const p = (f as File & { path?: string }).path;
          if (p) addAttachment(p);
        });
        editableRef.current?.focus();
        return;
      }

      // 텍스트/경로 드롭 (앱 내부 트리, 선택 영역 등) → 인라인 멘션으로 삽입
      const txt = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-filepath');
      if (txt) {
        txt
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((p) => insertMention(p));
      }
    },
    [addAttachment, insertMention],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // ── 파일 피커 (+ 버튼) ────────────────────────────────────────────────────
  const handleFilePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      Array.from(e.target.files ?? []).forEach((f) => {
        const p = (f as File & { path?: string }).path || f.name;
        if (p) addAttachment(p);
      });
      // input 초기화 (같은 파일 재선택 허용)
      if (e.target) e.target.value = '';
    },
    [addAttachment],
  );

  // ── contenteditable 콘텐츠 직렬화 ────────────────────────────────────────────
  const getContentForSend = useCallback((): { displayText: string; mentionList: InlineMention[] } => {
    const el = editableRef.current;
    if (!el) return { displayText: '', mentionList: [] };

    const seen = new Set<string>();
    const mentionList: InlineMention[] = [];
    let text = '';

    function walk(nodes: NodeList) {
      for (const node of Array.from(nodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent ?? '';
        } else if (node instanceof HTMLElement) {
          if (node.tagName === 'BR') {
            text += '\n';
          } else if (node.classList.contains('xc-mention')) {
            const m = mentionMapRef.current.get(node.dataset.id ?? '');
            if (m) {
              text += `@${m.label}`;
              if (!seen.has(m.id)) {
                seen.add(m.id);
                mentionList.push(m);
              }
            }
          } else if (node.tagName === 'DIV' || node.tagName === 'P') {
            if (text && !text.endsWith('\n')) text += '\n';
            walk(node.childNodes);
          } else {
            walk(node.childNodes);
          }
        }
      }
    }

    walk(el.childNodes);
    return { displayText: text.trim(), mentionList };
  }, []);

  const clearInput = useCallback(() => {
    const el = editableRef.current;
    if (el) {
      el.innerHTML = '';
      el.style.height = '';
    }
    mentionMapRef.current.clear();
    setHasContent(false);
  }, []);

  // ── contenteditable onInput: hasContent 갱신 + 자동 높이 (최대 5줄) ──────────
  const handleInput = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    const empty = el.innerText.trim() === '' && !el.querySelector('.xc-mention');
    setHasContent(!empty);
    el.style.height = 'auto';
    const style = getComputedStyle(el);
    const lineH = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
    const padT = parseFloat(style.paddingTop);
    const padB = parseFloat(style.paddingBottom);
    el.style.height = `${Math.min(el.scrollHeight, lineH * 5 + padT + padB)}px`;
  }, []);

  // ── 붙여넣기 → 순수 텍스트만 허용 ───────────────────────────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // ── 멘션 콘텐츠 읽기 (파일이면 내용 포함, 아니면 경로 참조만) ──────────────────
  const buildMentionContext = useCallback(async (list: InlineMention[]): Promise<string> => {
    if (!list.length) return '';
    const MAX_CHARS = 8000;
    const parts: string[] = [];
    for (const m of list) {
      try {
        const result = await (window as any).fileAPI?.readFile?.(m.path);
        const raw = (result?.content ?? '') as string;
        const content = raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS) + t18n('chat.contentTruncated') : raw;
        const ext = m.label.split('.').pop() ?? '';
        parts.push(`<reference path="${m.path}" label="${m.label}">\n\`\`\`${ext}\n${content}\n\`\`\`\n</reference>`);
      } catch {
        parts.push(`<reference label="${m.label}" path="${m.path}">${t18n('chat.reference')}</reference>`);
      }
    }
    return parts.join('\n\n');
  }, []);

  // ── 설정 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    window.terminalAPI
      ?.getSettings?.()
      .then((s) => {
        // 구버전 설정에 labApiUrl / xcAgentApiUrl 이 없을 수 있으므로 기본값 보장
        const raw = s.aiProvider ?? DEFAULT_AI;
        const cfg: AiProviderSettings = {
          ...DEFAULT_AI,
          ...raw,
          labApiUrl: raw.labApiUrl || DEFAULT_LAB_API_URL,
          xcApiUrl: normalizeBaseUrl(raw.xcApiUrl || ''),
          xcAgentApiUrl: normalizeBaseUrl(raw.xcAgentApiUrl || ''),
        };
        setAiCfg(cfg);
        setMessages([makeWelcome(cfg, t18n)]);
        checkAllStatus(cfg);
        // 현재 열린 작업 폴더를 workspace 로 설정 (있으면)
        const sAny = s as unknown as Record<string, unknown>;
        const ws = sAny.workspacePath ?? sAny.workspace;
        if (typeof ws === 'string' && ws) {
          setWorkspace(ws);
          clearResolvedAgentWorkspace();
        }
      })
      .catch(() => {
        setMessages([makeWelcome(DEFAULT_AI, t18n)]);
        checkAllStatus(DEFAULT_AI);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearResolvedAgentWorkspace]);

  // ── app-settings-changed 이벤트 ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ aiProvider?: AiProviderSettings; workspacePath?: string; workspace?: string }>;
      if (ev.detail?.aiProvider) {
        const raw = ev.detail.aiProvider;
        const cfg: AiProviderSettings = {
          ...DEFAULT_AI,
          ...raw,
          labApiUrl: raw.labApiUrl || DEFAULT_LAB_API_URL,
          xcApiUrl: normalizeBaseUrl(raw.xcApiUrl || ''),
          xcAgentApiUrl: normalizeBaseUrl(raw.xcAgentApiUrl || ''),
        };
        setAiCfg(cfg);
        checkAllStatus(cfg);
      }
      // workspace 경로 업데이트
      const ws = ev.detail?.workspacePath ?? ev.detail?.workspace;
      if (typeof ws === 'string' && ws) {
        setWorkspace(ws);
        clearResolvedAgentWorkspace();
      }
    };
    window.addEventListener('app-settings-changed', handler);

    // workspace-changed 이벤트 (파일 탐색기에서 폴더를 열 때 발생)
    const wsHandler = (e: Event) => {
      const ev = e as CustomEvent<{ path?: string }>;
      if (typeof ev.detail?.path === 'string' && ev.detail.path) {
        setWorkspace(ev.detail.path);
        clearResolvedAgentWorkspace();
      }
    };
    window.addEventListener('workspace-changed', wsHandler);

    return () => {
      window.removeEventListener('app-settings-changed', handler);
      window.removeEventListener('workspace-changed', wsHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearResolvedAgentWorkspace]);

  // ── 스크롤 하단 ───────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ── 에이전트(xamongcode) + 드래프트(xamong-code) + Lab API 헬스체크 (동시 실행) ─
  const checkAllStatus = useCallback((cfg: AiProviderSettings) => {
    // 에이전트 API (xcAgentApiUrl → xamongcode): 기본값 DEFAULT_AGENT_API_URL 사용
    const xcAgentUrl = cfg.xcAgentApiUrl || DEFAULT_AGENT_API_URL;
    setXcAgentStatus('checking');
    xcAgentHealthCheck(xcAgentUrl).then((ok) => {
      setXcAgentStatus(ok ? 'ok' : 'unreachable');
      // 서버가 살아 있으면 /admin/config 로드 (workspaceRoot, defaultWorkspace 확보)
      if (ok) {
        loadAdminConfig(xcAgentUrl).then((cfg2) => {
          if (cfg2) {
            setWorkspaceRoot(cfg2.workspaceRoot);
            setDefaultWorkspace(cfg2.defaultWorkspace);
          }
        });
      }
    });

    // 드래프트 API (xcApiUrl → xamong-code): 미설정이면 'none'
    if (!cfg.xcApiUrl) {
      setDraftStatus('none');
    } else {
      setDraftStatus('checking');
      xcHealthCheck(cfg.xcApiUrl).then((ok) => setDraftStatus(ok ? 'ok' : 'unreachable'));
    }

    // Lab API (labApiUrl): 항상 체크 (기본값 http://127.0.0.1:3845)
    const labUrl = cfg.labApiUrl || DEFAULT_LAB_API_URL;
    setLabStatus('checking');
    labHealthCheck(labUrl).then((ok) => setLabStatus(ok ? 'ok' : 'unreachable'));
  }, []);

  // ── 메시지 헬퍼 ───────────────────────────────────────────────────────────
  const pushMessage = useCallback((role: ChatRole, content: string): string => {
    const id = makeId();
    setMessages((prev) => [...prev, { id, role, content, timestamp: new Date() }]);
    return id;
  }, []);

  const appendStreamId = useCallback((id: string, text: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: m.content + text } : m)));
  }, []);

  /** XC 에이전트 SSE 이벤트용: 메시지 전체 내용 교체 (append가 아닌 replace) */
  const replaceStreamId = useCallback((id: string, content: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));
  }, []);

  const upsertStageAssistantMessage = useCallback((streamMessageId: string, event: StreamAssistantEvent) => {
    const incoming = stripAnsi(String(event.text ?? ''));
    if (!incoming.trim()) return;

    const stage = event.stage;
    const stageIndex = typeof stage?.index === 'number' ? stage.index : undefined;

    setMessages((prev) => {
      const existingIndex =
        stageIndex !== undefined
          ? prev.findIndex((m) => m.stageMessage && m.runId === streamMessageId && m.stageInfo?.index === stageIndex)
          : -1;

      if (existingIndex >= 0) {
        return prev.map((m, idx) =>
          idx === existingIndex
            ? {
                ...m,
                content: event.append ? `${m.content}${incoming}` : incoming.trim(),
                displayContent: event.append ? `${m.content}${incoming}` : incoming.trim(),
                timestamp: new Date(),
                streaming: false,
                status: 'completed',
                stageInfo: stage,
              }
            : m,
        );
      }

      const stageMessage: ChatMessage = {
        id: `${streamMessageId}-stage-${stageIndex ?? makeId()}`,
        role: 'assistant',
        content: event.append ? incoming.trimStart() : incoming.trim(),
        displayContent: event.append ? incoming.trimStart() : incoming.trim(),
        timestamp: new Date(),
        streaming: false,
        status: 'completed',
        runId: streamMessageId,
        stageInfo: stage,
        stageMessage: true,
      };

      const placeholderIndex = prev.findIndex((m) => m.id === streamMessageId);
      if (placeholderIndex < 0) return [...prev, stageMessage];
      return [...prev.slice(0, placeholderIndex), stageMessage, ...prev.slice(placeholderIndex)];
    });
  }, []);

  const mergeNoticeIntoStreamId = useCallback((id: string, message: string) => {
    const notice = stripAnsi(message).trim();
    if (!notice) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const current = m.content.trim();
        if (!current) return { ...m, content: notice };
        if (current.includes(notice)) return m;
        return { ...m, content: `${m.content.trimEnd()}\n\n${notice}` };
      }),
    );
  }, []);

  /** stderr 청크 누적 (디버그 패널용) */
  const appendStderrId = useCallback((id: string, chunk: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, stderr: (m.stderr ?? '') + chunk } : m)));
  }, []);

  const finalizeStream = useCallback((id: string, failed = false) => {
    setMessages((prev) => {
      const hasStageMessages = prev.some((m) => m.runId === id && m.stageMessage);
      return prev.flatMap((m) => {
        if (m.id !== id) return [m];
        if (hasStageMessages && !m.content.trim() && !m.stderr?.trim()) return [];
        return [{ ...m, streaming: false, status: failed ? 'failed' : 'completed', progress: undefined }];
      });
    });
  }, []);

  const updateProgressId = useCallback((id: string, progress: StreamProgressEvent) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, progress } : m)));
  }, []);

  const appendActivityId = useCallback((id: string, activity: StreamActivityEvent) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const current = m.activity ?? [];
        const last = current[current.length - 1];
        const next =
          last && activitySignature(last) === activitySignature(activity)
            ? [...current.slice(0, -1), activity]
            : [...current, activity];
        return { ...m, activity: next.slice(-6) };
      }),
    );
  }, []);

  // ── 파일 콘텐츠 읽기 헬퍼 ───────────────────────────────────────────────────
  const buildAttachContext = useCallback(async (list: Attachment[]): Promise<string> => {
    if (!list.length) return '';
    const MAX_CHARS = 8000;
    const parts: string[] = [];
    for (const a of list) {
      try {
        const result = await (window as any).fileAPI?.readFile?.(a.path);
        const raw = (result?.content ?? '') as string;
        const content = raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS) + t18n('chat.contentTruncated') : raw;
        const ext = a.name.split('.').pop() ?? '';
        parts.push(`<file path="${a.path}">\n\`\`\`${ext}\n${content}\n\`\`\`\n</file>`);
      } catch {
        parts.push(`<file path="${a.path}">${t18n('chat.readFailed')}</file>`);
      }
    }
    return parts.join('\n\n');
  }, []);

  // ── 중지 (handleSend에서 참조하므로 앞에 선언) ────────────────────────────
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    // interactive 모드: 서버 측 run도 취소
    if (activeRunIdRef.current) {
      const xcAgentUrl = (aiCfg.xcAgentApiUrl || DEFAULT_AGENT_API_URL).replace(/\/$/, '');
      cancelInteractiveRun(xcAgentUrl, activeRunIdRef.current).catch(() => {});
      activeRunIdRef.current = null;
      setActiveRunId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiCfg]);

  // ── 전송 ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const { displayText, mentionList } = getContentForSend();
    const text = displayText;
    if ((!text && attachments.length === 0 && mentionList.length === 0) || isBusy) return;

    // 사용자 프롬프트 저장 — 앱 생성 완료 시 프로젝트 등록에서 사용
    if (text) lastUserPromptRef.current = text;

    // 이번 대화에서 앱 생성 완료 시 감지된 번들 경로 (done 수신 후 일괄 등록)
    let capturedBundlePath: string | null = null;
    let capturedProjectPath: string | null = null;
    let capturedReadmePath: string | null = null;
    let capturedShouldRegisterProject = false;

    // 첨부 및 입력 상태를 즉시 스냅샷해 두고 초기화
    const attachSnap = [...attachments];
    setAttachments([]);
    clearInput();
    setIsBusy(true);

    // 에이전트 모드: 직접 호출 시 API 키 검증
    const isLocal = LOCAL_PROVIDERS.has(aiCfg.provider);
    const hasDirectKey = isLocal || !!aiCfg.apiKey;
    const xcAgentOk = xcAgentStatus === 'ok';
    const draftPath: CallPath = draftStatus === 'ok' ? 'xc' : 'direct';
    const labPath: CallPath = labStatus === 'ok' ? 'xc' : 'direct';

    if (mode === 'draft' && draftPath === 'direct' && !hasDirectKey) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'user',
          content: text,
          displayContent: text,
          attachments: attachSnap,
          timestamp: new Date(),
        },
        {
          id: makeId(),
          role: 'system',
          timestamp: new Date(),
          content: `⚠ ${PROVIDER_LABEL[aiCfg.provider]} ${t18n('chat.noApiKey')}`,
        },
      ]);
      setIsBusy(false);
      return;
    }

    // 멘션 + 첨부 파일 컨텍스트 구축 (파일 내용 읽기)
    const mentionContext = await buildMentionContext(mentionList);
    const attachContext = await buildAttachContext(attachSnap);
    const ctxParts = [mentionContext, attachContext].filter(Boolean);
    const aiText = ctxParts.length ? `${ctxParts.join('\n\n')}\n\n---\n\n${text}` : text;

    // 사용자 메시지 추가 (버블에는 text + 첨부 태그만 표시; 멘션은 text 안에 @label 포함)
    const userEntry: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: aiText,
      displayContent: text || t18n('chat.attachment'),
      attachments: attachSnap,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userEntry]);

    // 스트리밍 assistant 메시지 추가
    const streamId = makeId();
    setMessages((prev) => [
      ...prev,
      {
        id: streamId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        streaming: true,
      },
    ]);

    abortRef.current = new AbortController();

    let failed = false;
    try {
      (window as any).CURRENT_XAPP_BUNDLE_PATH = null;
      (window as any).CURRENT_XAPP_PROJECT_PATH = null;
      (window as any).CURRENT_XAPP_README_PATH = null;
      // messages는 stale closure이므로 방금 추가된 user 메시지를 직접 포함시킨다.
      const snap = [...messages, userEntry];
      const xcAgentUrl = (aiCfg.xcAgentApiUrl || DEFAULT_AGENT_API_URL).replace(/\/$/, '');
      let bundleReadyDispatched = false;
      const dispatchXappReady = (entryFilePath: string, projectPath?: string | null) => {
        if (!entryFilePath) return;
        (window as any).CURRENT_XAPP_BUNDLE_PATH = entryFilePath;
        if (projectPath) (window as any).CURRENT_XAPP_PROJECT_PATH = projectPath;
        window.dispatchEvent(
          new CustomEvent('xapp-bundle-ready', {
            detail: {
              bundlePath: entryFilePath,
              ...(projectPath ? { projectPath } : {}),
            },
          }),
        );
        if (projectPath) {
          window.dispatchEvent(
            new CustomEvent('xapp-project-ready', {
              detail: { projectPath, entryFilePath },
            }),
          );
        }
        bundleReadyDispatched = true;
      };
      const dispatchGeneratedAppReady = (
        entryFilePath?: string | null,
        projectPath?: string | null,
        readmePath?: string | null,
      ) => {
        if (!entryFilePath && !projectPath && !readmePath) return;
        if (entryFilePath) (window as any).CURRENT_XAPP_BUNDLE_PATH = entryFilePath;
        if (projectPath) (window as any).CURRENT_XAPP_PROJECT_PATH = projectPath;
        const resolvedReadmePath = readmePath || (projectPath ? joinXappPath(projectPath, 'README.md') : null);
        if (resolvedReadmePath) (window as any).CURRENT_XAPP_README_PATH = resolvedReadmePath;
        if (projectPath) {
          window.dispatchEvent(
            new CustomEvent('xapp-project-ready', {
              detail: {
                projectPath,
                ...(entryFilePath ? { entryFilePath } : {}),
                ...(resolvedReadmePath ? { readmePath: resolvedReadmePath } : {}),
              },
            }),
          );
        }
        if (resolvedReadmePath) {
          window.dispatchEvent(
            new CustomEvent('xapp-readme-ready', {
              detail: {
                readmePath: resolvedReadmePath,
                ...(projectPath ? { projectPath } : {}),
                ...(entryFilePath ? { entryFilePath } : {}),
              },
            }),
          );
        }
        bundleReadyDispatched = true;
      };

      // ── agent 모드: /chat/interactive 사용 (승인·질문 자동 처리 포함) ────────
      if (mode === 'agent') {
        if (!xcAgentOk) {
          await simulateStream(
            t18n('chat.agentConnectFailed', { url: xcAgentUrl }),
            (delta) => appendStreamId(streamId, delta),
            abortRef.current.signal,
          );
        } else {
          // workspace 자동 resolve:
          // 1순위 — 이전 meta 이벤트에서 받은 값 (가장 정확)
          // 2순위 — 프롬프트 내 절대경로 자동 감지
          // 3순위 — 파일 탐색기의 현재 폴더를 /workspaces API로 변환
          // 4순위 — workspaceRoot 를 알면 toWorkspacePath 직접 변환
          // 5순위 — defaultWorkspace + "." 로 서버 기본 폴더 사용
          let sendWorkspace = resolvedWorkspace;
          let sendWorkspacePath = resolvedWorkspacePath;
          const sendUserid = currentDeskUserid();
          const detectedPath = detectAbsPathInPrompt(aiText);

          if (detectedPath) {
            const candidatePath = pickFolderFromPath(detectedPath);
            const resolved = await resolveWorkspaceFromPath(
              xcAgentUrl,
              candidatePath,
              workspaceRoot ?? undefined,
              defaultWorkspace ?? undefined,
            );
            if (!resolved) {
              throw new Error(t18n('chat.workspaceConvertFailed', { path: candidatePath }));
            }
            sendWorkspace = resolved.workspace;
            sendWorkspacePath = resolved.workspacePath;
            setResolvedWorkspace(resolved.workspace);
            setResolvedWorkspacePath(resolved.workspacePath);
          } else if (!sendWorkspace) {
            const candidatePath = workspace ?? undefined;

            if (candidatePath) {
              const resolved = await resolveWorkspaceFromPath(
                xcAgentUrl,
                candidatePath,
                workspaceRoot ?? undefined,
                defaultWorkspace ?? undefined,
              );
              if (resolved) {
                sendWorkspace = resolved.workspace;
                sendWorkspacePath = resolved.workspacePath;
                setResolvedWorkspace(resolved.workspace);
                setResolvedWorkspacePath(resolved.workspacePath);
              }
            }

            // 그래도 없으면 defaultWorkspace + "." 로 폴백
            if (!sendWorkspace && defaultWorkspace) {
              sendWorkspace = defaultWorkspace;
            }
          }

          const result = await xcAgentInteractive(
            xcAgentUrl,
            aiText,
            aiCfg,
            (delta) => appendStreamId(streamId, delta),
            (content) => replaceStreamId(streamId, content),
            (stageEvent) => upsertStageAssistantMessage(streamId, stageEvent),
            (chunk) => appendStderrId(streamId, chunk),
            (runId) => {
              activeRunIdRef.current = runId;
              setActiveRunId(runId);
            },
            // 권한/질문 요청 → 자동으로 카드 표시
            (req: InteractionRequest) => {
              setMessages((prev) => [
                ...prev,
                {
                  id: makeId(),
                  role: 'assistant' as ChatRole,
                  content: '',
                  timestamp: new Date(),
                  interactionRequest: req,
                  runId: req.runId,
                },
              ]);
            },
            (interactionId: string) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.interactionRequest?.interactionId === interactionId
                    ? { ...m, interactionResolved: 'canceled' as const }
                    : m,
                ),
              );
            },
            // 브리핑 공지 → 자동으로 인라인 표시
            (notice: InteractiveNotice) => {
              if (notice.message && notice.status !== 'proactive') {
                mergeNoticeIntoStreamId(streamId, notice.message);
                return;
              }
              setMessages((prev) => [
                ...prev,
                {
                  id: makeId(),
                  role: 'assistant' as ChatRole,
                  content: notice.message ?? '',
                  timestamp: new Date(),
                  noticeData: notice,
                },
              ]);
            },
            abortRef.current.signal,
            agentSessionId,
            20,
            sendWorkspace,
            sendWorkspacePath,
            sendUserid,
            // meta 이벤트: cwd/workspace/workspacePath를 상태에 저장해 후속 요청에 재사용
            (meta: InteractiveMeta) => {
              if (meta.cwd) setAgentCwd(meta.cwd);
              if (meta.workspace) setResolvedWorkspace(meta.workspace);
              if (meta.workspacePath) setResolvedWorkspacePath(meta.workspacePath);

              // workspacePath 불일치 경고 (디버그용 stderr 패널에 출력)
              if (
                meta.workspacePath &&
                sendWorkspacePath &&
                meta.workspacePath !== sendWorkspacePath &&
                meta.workspacePath !== '.' &&
                !isExpectedAppCreationWorkspaceNarrowing(meta, sendWorkspacePath)
              ) {
                appendStderrId(
                  streamId,
                  t18n('chat.cwdMismatch', { ui: sendWorkspacePath ?? '', api: meta.workspacePath ?? '' }) + '\n',
                );
              }
            },
            8,
            // status 이벤트: UI 상태 표시용 (heartbeat는 상태 변경 없음)
            (statusEvt: StreamStatusEvent) => {
              if (statusEvt.state !== 'heartbeat') {
                setRunStatus(statusEvt.state);
              }
            },
            // progress 이벤트: 현재 LLM/도구/복구 세부 상태를 메시지 버블에 표시
            (progressEvt: StreamProgressEvent) => {
              updateProgressId(streamId, progressEvt);
              // progress.detail 에서 번들 경로 감지 (캡처 — done 이후 등록)
              if (progressEvt.detail && typeof progressEvt.detail === 'object') {
                const d = progressEvt.detail as Record<string, unknown>;
                if (d.stage === 'saved' && typeof d.bundlePath === 'string' && d.bundlePath) {
                  capturedBundlePath = d.bundlePath;
                }
                if (typeof d.projectPath === 'string' && d.projectPath) {
                  capturedProjectPath = d.projectPath;
                }
                if (typeof d.readmePath === 'string' && d.readmePath) {
                  capturedReadmePath = d.readmePath;
                }
              }
            },
            // activity 이벤트: 최근 작업 흐름을 Codex 스타일 로그로 누적 표시
            (activityEvt: StreamActivityEvent) => {
              appendActivityId(streamId, activityEvt);
            },
          );
          if (result.sessionMessageCount !== undefined) setAgentMsgCount(result.sessionMessageCount);
          capturedShouldRegisterProject = result.shouldRegisterProject === true;
          // 에이전트 모드: done 수신 후 번들 경로 캡처 (xcAgentInteractive 반환값 우선)
          if (capturedShouldRegisterProject && result.projectPath) {
            capturedProjectPath = result.projectPath;
          }
          if (capturedShouldRegisterProject && result.readmePath) {
            capturedReadmePath = result.readmePath;
          }
          if (capturedShouldRegisterProject && result.bundlePath) {
            capturedBundlePath = result.bundlePath;
          } else if (capturedShouldRegisterProject && !capturedBundlePath) {
            // 전역 변수 폴백 (xcCallAgent가 설정한 경우)
            const g = (window as any).CURRENT_XAPP_BUNDLE_PATH as string | undefined;
            if (typeof g === 'string' && g) capturedBundlePath = g;
          }
          if (capturedShouldRegisterProject && !capturedProjectPath) {
            const g = (window as any).CURRENT_XAPP_PROJECT_PATH as string | undefined;
            if (typeof g === 'string' && g) capturedProjectPath = g;
          }
          if (capturedShouldRegisterProject && !capturedReadmePath) {
            const g = (window as any).CURRENT_XAPP_README_PATH as string | undefined;
            if (typeof g === 'string' && g) capturedReadmePath = g;
          }
        }
      } else {
        // ── draft / lab 모드 ────────────────────────────────────────────
        await dispatchChat(
          aiCfg,
          mode,
          snap,
          (delta) => appendStreamId(streamId, delta),
          (content) => replaceStreamId(streamId, content),
          (chunk) => appendStderrId(streamId, chunk),
          abortRef.current.signal,
          xcAgentOk,
          draftPath,
          labPath,
          workspace,
          (newPath) => {
            setWorkspace(newPath);
            window.dispatchEvent(new CustomEvent('workspace-changed', { detail: { path: newPath } }));
          },
          // od_progress:saved 이벤트 → 번들 경로 캡처 (done 이후 등록)
          (bundlePath) => {
            capturedBundlePath = bundlePath;
            (window as any).CURRENT_XAPP_BUNDLE_PATH = bundlePath;
            dispatchXappReady(xappEntryFilePath(bundlePath), looksLikeFilePath(bundlePath) ? null : bundlePath);
          },
          agentSessionId,
          (count) => setAgentMsgCount(count),
          undefined,
          undefined,
          t18n,
        );
        // draft 모드: dispatchChat 완료(done 수신) 후 전역 변수도 확인
        if (!capturedBundlePath) {
          const g = (window as any).CURRENT_XAPP_BUNDLE_PATH as string | undefined;
          if (typeof g === 'string' && g) capturedBundlePath = g;
        }
      }

      // ── 앱 생성 완료: SSE done 수신 이후 프로젝트 등록 ──────────────────────
      const allowProjectRegistration =
        mode === 'agent' ? capturedShouldRegisterProject : Boolean(capturedBundlePath || capturedProjectPath);
      const inferredProjectPath =
        capturedProjectPath ||
        (capturedBundlePath && !looksLikeFilePath(capturedBundlePath) ? capturedBundlePath : null);
      const entryFilePath =
        capturedBundlePath && looksLikeFilePath(capturedBundlePath)
          ? capturedBundlePath
          : inferredProjectPath
            ? xappEntryFilePath(inferredProjectPath)
            : capturedBundlePath;
      const readmePath =
        capturedReadmePath || (inferredProjectPath ? joinXappPath(inferredProjectPath, 'README.md') : null);

      console.log('[ProjectReg] entryFilePath:', entryFilePath);
      console.log('[ProjectReg] inferredProjectPath:', inferredProjectPath);
      console.log('[ProjectReg] shouldRegisterProject:', allowProjectRegistration);
      if (allowProjectRegistration && (entryFilePath || inferredProjectPath)) {
        const pathToReg = inferredProjectPath || entryFilePath!;
        if (!bundleReadyDispatched) {
          if (mode === 'agent') {
            dispatchGeneratedAppReady(entryFilePath, inferredProjectPath, readmePath);
          } else if (entryFilePath) {
            dispatchXappReady(entryFilePath, inferredProjectPath);
          }
        }
        const promptForReg = lastUserPromptRef.current;
        console.log('[ProjectReg] 프로젝트 등록 시작:', pathToReg);
        registerProjectToServer(pathToReg, promptForReg, t18n)
          .then(() => {
            console.log('[ProjectReg] 등록 성공');
            window.dispatchEvent(
              new CustomEvent('xapp-project-registered', {
                detail: {
                  projectPath: pathToReg,
                  ...(entryFilePath ? { entryFilePath } : {}),
                  ...(readmePath ? { readmePath } : {}),
                },
              }),
            );
            setProjRegToast({ type: 'ok', msg: t18n('chat.projectRegistered') });
            setTimeout(() => setProjRegToast(null), 4000);
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : t18n('chat.projectRegisterFailed', { e: '' });
            console.warn('[ProjectReg] 등록 실패:', msg);
            setProjRegToast({ type: 'error', msg: t18n('chat.projectRegisterFailed', { e: msg }) });
            setTimeout(() => setProjRegToast(null), 6000);
          });
      }
    } catch (err) {
      failed = true;
      const e = err as Error & { code?: string };
      if (e.name === 'AbortError') {
        appendStreamId(streamId, t18n('chat.stopped'));
        failed = false; // 사용자가 직접 중지 — failed 아님
        setMessages((prev) => prev.map((m) => (m.id === streamId ? { ...m, status: 'aborted' } : m)));
      } else if (e.code === 'unauthorized') {
        appendStreamId(streamId, `\n\n🔒 ${e.message}`);
      } else {
        appendStreamId(streamId, t18n('chat.errorSuffix', { e: e.message }));
      }
    } finally {
      // run 종료 후 정리
      activeRunIdRef.current = null;
      setActiveRunId(null);
      setRunStatus(null);
      finalizeStream(streamId, failed);
      setIsBusy(false);
      abortRef.current = null;
      editableRef.current?.focus();
    }
  }, [
    attachments,
    isBusy,
    aiCfg,
    mode,
    messages,
    xcAgentStatus,
    draftStatus,
    labStatus,
    getContentForSend,
    clearInput,
    buildMentionContext,
    buildAttachContext,
    appendStreamId,
    replaceStreamId,
    upsertStageAssistantMessage,
    mergeNoticeIntoStreamId,
    appendStderrId,
    finalizeStream,
    updateProgressId,
    appendActivityId,
    handleStop,
    workspace,
    resolvedWorkspace,
    resolvedWorkspacePath,
    agentSessionId,
    workspaceRoot,
    defaultWorkspace,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [handleSend],
  );

  const handleClear = useCallback(() => {
    if (mode === 'agent') {
      // 서버 세션 삭제 (비동기, 오류 무시)
      // workspace ID: resolvedWorkspace → defaultWorkspace → 'projects' 순 폴백
      const xcAgentUrl = aiCfg.xcAgentApiUrl || DEFAULT_AGENT_API_URL;
      const wsForDelete = resolvedWorkspace ?? defaultWorkspace ?? 'projects';
      xcAgentDeleteSession(xcAgentUrl, agentSessionId, wsForDelete).catch(() => {});
      // 새 세션 ID 생성 + meta 상태 초기화 (workspaceRoot/defaultWorkspace는 유지)
      setAgentSessionId(makeSessionId());
      setAgentMsgCount(0);
      setAgentCwd(undefined);
      setResolvedWorkspace(undefined);
      setResolvedWorkspacePath(undefined);
    }
    setMessages([makeWelcome(aiCfg, t18n)]);
  }, [aiCfg, mode, agentSessionId, resolvedWorkspace, defaultWorkspace, t18n]);

  const handleRefreshStatus = useCallback(() => checkAllStatus(aiCfg), [checkAllStatus, aiCfg]);

  // ── 연결 상태 계산 ────────────────────────────────────────────────────────
  const isLocal = LOCAL_PROVIDERS.has(aiCfg.provider);
  const hasApiKey = isLocal || !!aiCfg.apiKey;
  const xcAgentOk = xcAgentStatus === 'ok';
  const draftOk = draftStatus === 'ok';
  const labOk = labStatus === 'ok';
  const effectiveXcAgentUrl = aiCfg.xcAgentApiUrl || DEFAULT_AGENT_API_URL;
  const effectiveLabUrl = aiCfg.labApiUrl || DEFAULT_LAB_API_URL;

  // 현재 모드 기준 준비 상태
  const isReady = mode === 'agent' ? xcAgentOk : mode === 'lab' ? labOk : draftOk || hasApiKey;

  // 헤더 상태 표시 레이블 (현재 모드 기준)
  const pathLabel =
    mode === 'agent'
      ? xcAgentOk
        ? `${t18n('chat.agentApiLabel')} (${effectiveXcAgentUrl})`
        : xcAgentStatus === 'unreachable'
          ? `${t18n('chat.agentApiLabel')} ${t18n('chat.connectFailed')} (${effectiveXcAgentUrl})`
          : xcAgentStatus === 'checking'
            ? `${t18n('chat.agentApiLabel')} ${t18n('chat.checking')}...`
            : `${t18n('chat.agentApiLabel')} (${effectiveXcAgentUrl})`
      : mode === 'lab'
        ? labOk
          ? `Lab API (${effectiveLabUrl})`
          : labStatus === 'unreachable'
            ? `Lab API ${t18n('chat.connectFailed')} (${effectiveLabUrl})`
            : labStatus === 'checking'
              ? `Lab API ${t18n('chat.checking')}...`
              : `Lab API (${effectiveLabUrl})`
        : draftOk
          ? `${t18n('chat.draftApiLabel')} (${aiCfg.xcApiUrl})`
          : draftStatus === 'unreachable'
            ? `${t18n('chat.draftApiLabel')} ${t18n('chat.connectFailed')} — ${t18n('chat.direct')} ${PROVIDER_LABEL[aiCfg.provider]}`
            : draftStatus === 'checking'
              ? `${t18n('chat.draftApiLabel')} ${t18n('chat.checking')}...`
              : `${t18n('chat.direct')} ${PROVIDER_LABEL[aiCfg.provider]}`;

  // 현재 모드의 상태 (점 색상, 애니메이션용)
  const currentStatus = mode === 'agent' ? xcAgentStatus : mode === 'lab' ? labStatus : draftStatus;

  // 에이전트 모드: 승인 대기 중인 인터랙션이 있으면 입력창 placeholder 변경
  const hasPendingInteraction =
    isBusy && mode === 'agent' && messages.some((m) => m.interactionRequest && !m.interactionResolved);

  // status 이벤트 기반 입력창 placeholder 텍스트
  const busyPlaceholder = (() => {
    if (hasPendingInteraction) return t18n('chat.approvalWaiting');
    if (!isBusy) return undefined;
    switch (runStatus) {
      case 'starting':
        return t18n('chat.starting');
      case 'generating':
        return t18n('chat.generating2');
      case 'waiting':
        return t18n('chat.approvalWaiting');
      case 'resuming':
        return t18n('chat.resuming');
      default:
        return t18n('chat.generating2');
    }
  })();

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div className="xc-chat">
      {/* ── 헤더 ────────────────────────────────────────────────────────── */}
      <div className="xc-chat-header">
        <span className="xc-chat-title">{t18n('chat.xamongCodeTitle')}</span>

        {/* 모드 토글 */}
        <div className="xc-chat-mode-group" role="group" aria-label={t18n('chat.chatModeAriaLabel')}>
          {(['agent', 'draft', 'lab'] as ChatMode[]).map((m) => {
            const dotStatus = m === 'agent' ? xcAgentStatus : m === 'lab' ? labStatus : draftStatus;
            const dotOk = dotStatus === 'ok' || (m === 'draft' && draftStatus === 'none');
            const modeTitle =
              m === 'agent'
                ? xcAgentOk
                  ? `${t18n('chat.agentApiLabel')} (${effectiveXcAgentUrl})`
                  : `xamongcode API ${t18n('chat.connectFailed')} (${effectiveXcAgentUrl})`
                : m === 'draft'
                  ? draftOk
                    ? `${t18n('chat.draftApiLabel')} (${aiCfg.xcApiUrl})`
                    : `${PROVIDER_LABEL[aiCfg.provider]} ${t18n('chat.direct')}`
                  : labOk
                    ? `Lab API (${effectiveLabUrl})`
                    : `Lab API ${t18n('chat.connectFailed')} (${effectiveLabUrl})`;
            return (
              <button
                key={m}
                className={`xc-chat-mode-btn${mode === m ? ' is-active' : ''}`}
                onClick={() => setMode(m)}
                title={modeTitle}
              >
                <span className={`xc-mode-dot${dotOk ? ' ok' : dotStatus === 'checking' ? ' checking' : ' err'}`} />
                {m === 'agent' ? t18n('chat.modeAgent') : m === 'draft' ? t18n('chat.modeDraft') : 'Lab'}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* 세션 배지 (에이전트 모드 + 연결됨) */}
        {mode === 'agent' && xcAgentOk && (
          <span
            className="xc-session-badge"
            title={t18n('chat.sessionInfo', { id: agentSessionId, turns: String(agentMsgCount) })}
          >
            {agentMsgCount > 0 ? t18n('chat.turnCount', { n: String(agentMsgCount) }) : t18n('chat.newSession')}
          </span>
        )}
        {/* 에이전트 run 상태 배지 */}
        {mode === 'agent' && activeRunId && isBusy && (
          <span
            className={`xc-run-badge${hasPendingInteraction || runStatus === 'waiting' ? ' is-idle' : ''}`}
            title={`Run ID: ${activeRunId}`}
          >
            {hasPendingInteraction || runStatus === 'waiting'
              ? t18n('chat.approvalWaitBadge')
              : runStatus === 'starting'
                ? t18n('chat.startingBadge')
                : runStatus === 'resuming'
                  ? t18n('chat.resumingBadge')
                  : t18n('chat.runningBadge')}
          </span>
        )}

        <button
          className="xc-chat-clear-btn"
          onClick={handleClear}
          title={t18n('chat.resetSessionTitle')}
          disabled={isBusy}
        >
          ↺
        </button>
      </div>

      {/* ── 컨텍스트 바 (URL / 모델 / 상태 / cwd) ───────────────────────── */}
      <div className="xc-ctx-bar">
        <span
          className={`xc-ctx-dot${isReady ? ' ok' : currentStatus === 'checking' ? ' checking' : ''}`}
          style={currentStatus === 'checking' ? { animation: 'xc-blink 0.6s linear infinite' } : undefined}
        />
        <span className="xc-ctx-label" title={pathLabel}>
          {pathLabel}
        </span>
        {!isReady && mode !== 'agent' && currentStatus !== 'checking' && (
          <span className="xc-ctx-warn">{t18n('chat.connectFailedBadge')}</span>
        )}
        {/* meta.cwd: 서버에서 수신한 실제 작업 디렉토리 (가장 정확) */}
        {mode === 'agent' && agentCwd && (
          <span
            className="xc-ctx-cwd"
            title={[
              t18n('chat.workingDir', { path: agentCwd }),
              resolvedWorkspace ? `workspace: ${resolvedWorkspace}` : '',
              resolvedWorkspacePath ? `workspacePath: ${resolvedWorkspacePath}` : '',
              workspaceRoot ? `workspaceRoot: ${workspaceRoot}` : '',
            ]
              .filter(Boolean)
              .join('\n')}
          >
            📂 {agentCwd.replace(/\\/g, '/').split('/').slice(-2).join('/')}
          </span>
        )}
        {/* 아직 cwd가 없지만 탐색기 폴더가 선택된 경우 */}
        {mode === 'agent' && !agentCwd && workspace && (
          <span
            className="xc-ctx-cwd"
            title={`${t18n('chat.selectedFolder', { path: workspace })}${workspaceRoot ? `\nworkspaceRoot: ${workspaceRoot}` : ''}`}
            style={{ opacity: 0.6 }}
          >
            📁 {workspace.replace(/\\/g, '/').split('/').slice(-2).join('/')}
          </span>
        )}
      </div>

      {/* ── 메시지 목록 ──────────────────────────────────────────────────── */}
      <div className="xc-msgs" ref={scrollRef} aria-live="polite">
        {messages.map((msg) => {
          // ── 시스템 공지 ──────────────────────────────────────────────
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="xc-msg-notice">
                <div className="xc-msg-notice-header">
                  <span className="xc-msg-notice-icon">⬡</span>
                  <span className="xc-msg-notice-label">{t18n('chat.roleAssistant')}</span>
                  <span className="xc-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
                <pre className="xc-msg-notice-text">{msg.content}</pre>
              </div>
            );
          }

          // ── 사용자 메시지 ────────────────────────────────────────────
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="xc-msg-user-row">
                <div className="xc-msg-user-header">
                  <span className="xc-msg-user-name">{t18n('chat.meLabel')}</span>
                  <span className="xc-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="xc-msg-chips">
                    {msg.attachments.map((a) => (
                      <span key={a.path} className="xc-chip" title={a.path}>
                        <span className="xc-chip-icon">📄</span>
                        {a.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="xc-msg-user-bubble">{msg.displayContent ?? msg.content}</div>
              </div>
            );
          }

          // ── 인터랙션 카드 (interaction_required 이벤트) ────────────────
          if (msg.interactionRequest) {
            const xcBase = (aiCfg.xcAgentApiUrl || DEFAULT_AGENT_API_URL).replace(/\/$/, '');
            return (
              <div key={msg.id} className="xc-msg-interaction-row">
                <InteractionCard
                  req={msg.interactionRequest}
                  resolved={msg.interactionResolved}
                  onResolve={async (outcome, body) => {
                    await respondInteraction(
                      xcBase,
                      msg.interactionRequest!.runId,
                      msg.interactionRequest!.interactionId,
                      body,
                      t18n,
                    );
                    setMessages((prev) =>
                      prev.map((m) => (m.id === msg.id ? { ...m, interactionResolved: outcome } : m)),
                    );
                  }}
                />
              </div>
            );
          }

          // ── notice 카드 (응답 불필요 브리핑) ──────────────────────────
          if (msg.noticeData) {
            return (
              <div key={msg.id} className="xc-msg-notice-row">
                <NoticeCard notice={msg.noticeData} />
              </div>
            );
          }

          // ── 어시스턴트 메시지 ─────────────────────────────────────────
          const isThinking = msg.streaming && !msg.content;
          return (
            <div key={msg.id} className={`xc-msg-ai-row${msg.status === 'failed' ? ' is-failed' : ''}`}>
              <div className="xc-msg-ai-header">
                <span className="xc-msg-ai-icon" aria-hidden>
                  ●
                </span>
                <span className="xc-msg-ai-name">{t18n('chat.roleAssistant')}</span>
                {msg.stageInfo?.index !== undefined && (
                  <span className="xc-msg-stage-badge">
                    Stage {msg.stageInfo.index}
                    {msg.stageInfo.title ? ` · ${msg.stageInfo.title}` : ''}
                  </span>
                )}
                {!msg.streaming && <span className="xc-msg-time">{formatTime(msg.timestamp)}</span>}
                {msg.status === 'failed' && (
                  <span className="xc-msg-status-badge xc-msg-status-badge--failed" title={t18n('chat.runFailedTitle')}>
                    {t18n('chat.runFailedLabel')}
                  </span>
                )}
                {msg.status === 'aborted' && (
                  <span
                    className="xc-msg-status-badge xc-msg-status-badge--aborted"
                    title={t18n('chat.userStoppedTitle')}
                  >
                    {t18n('chat.userStoppedLabel')}
                  </span>
                )}
              </div>
              <div className="xc-msg-ai-body">
                {isThinking ? (
                  <div className="xc-thinking-stack" aria-label={t18n('chat.generatingAriaLabel')}>
                    <div className="xc-thinking-wrap">
                      <div className="xc-thinking">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="xc-thinking-text">{progressDisplayText(msg.progress, t18n)}</div>
                    </div>
                    {msg.activity && msg.activity.length > 0 && (
                      <div className="xc-activity-log" aria-label={t18n('chat.recentActivityAriaLabel')}>
                        {msg.activity.slice(-5).map((activity, idx) => (
                          <div
                            key={`${activity.timestamp}-${activity.stage}-${idx}`}
                            className={`xc-activity-row xc-activity-row--${activity.level ?? 'info'}`}
                          >
                            <span className="xc-activity-dot" aria-hidden />
                            <span className="xc-activity-text">{activityDisplayText(activity, t18n)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <ChatMessageContent content={msg.displayContent ?? msg.content} streaming={msg.streaming} />
                    {msg.streaming && msg.activity && msg.activity.length > 0 && (
                      <div className="xc-activity-log" aria-label={t18n('chat.recentActivityAriaLabel')}>
                        {msg.activity.slice(-5).map((activity, idx) => (
                          <div
                            key={`${activity.timestamp}-${activity.stage}-${idx}`}
                            className={`xc-activity-row xc-activity-row--${activity.level ?? 'info'}`}
                          >
                            <span className="xc-activity-dot" aria-hidden />
                            <span className="xc-activity-text">{activityDisplayText(activity, t18n)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {msg.stderr && <StderrPanel stderr={msg.stderr} />}
            </div>
          );
        })}

        {/* 첫 토큰 대기 (별도 로딩 표시 — streaming 메시지가 없을 때) */}
        {isBusy && !messages.some((m) => m.streaming) && (
          <div className="xc-msg-ai-row">
            <div className="xc-msg-ai-header">
              <span className="xc-msg-ai-icon" aria-hidden>
                ●
              </span>
              <span className="xc-msg-ai-name">{t18n('chat.roleAssistant')}</span>
            </div>
            <div className="xc-msg-ai-body">
              <div className="xc-thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 입력 바 ──────────────────────────────────────────────────────── */}
      <div className="xc-input-bar">
        {/* 파일 피커 hidden input */}
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFilePickerChange} />

        {/* 첨부/드래그 래퍼 */}
        <div
          className={`xc-input-wrap${isDragOver ? ' is-drag-over' : ''}${isBusy ? ' is-busy' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {/* 첨부 칩 */}
          {attachments.length > 0 && (
            <div className="xc-input-chips">
              {attachments.map((a) => (
                <span key={a.path} className="xc-chip xc-chip--input" title={a.path}>
                  <span className="xc-chip-icon">📄</span>
                  <span className="xc-chip-name">{a.name}</span>
                  <button
                    className="xc-chip-remove"
                    onClick={() => removeAttachment(a.path)}
                    title={`제거: ${a.path}`}
                    tabIndex={-1}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 텍스트 입력 */}
          <div
            ref={editableRef}
            contentEditable={isBusy ? 'false' : 'true'}
            suppressContentEditableWarning
            className="xc-input"
            role="textbox"
            aria-multiline="true"
            aria-label={t18n('chat.chatInputAriaLabel')}
            data-placeholder={
              busyPlaceholder
                ? hasPendingInteraction
                  ? t18n('chat.approvalWaiting')
                  : busyPlaceholder
                : attachments.length > 0
                  ? t18n('chat.msgAddPlaceholder')
                  : t18n('chat.msgInputPlaceholder')
            }
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            spellCheck={false}
          />

          {/* 입력창 하단 액션 바 */}
          <div className="xc-input-footer">
            <div className="xc-input-mode-tag" title={pathLabel}>
              <span className={`xc-ctx-dot xc-ctx-dot--sm${isReady ? ' ok' : ''}`} />
              {mode === 'agent' ? t18n('chat.modeAgent') : mode === 'draft' ? t18n('chat.modeDraft') : 'Lab'}
            </div>
            <div style={{ flex: 1 }} />
            <button
              className="xc-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title={t18n('chat.attachFileTitle')}
              disabled={isBusy}
              tabIndex={-1}
            >
              @
            </button>
            {isBusy ? (
              <button className="xc-send-btn xc-stop-btn" onClick={handleStop} title={t18n('chat.stopTitle')}>
                ■
              </button>
            ) : (
              <button
                className="xc-send-btn"
                onClick={handleSend}
                disabled={!hasContent && attachments.length === 0}
                title={t18n('chat.sendTitle')}
              >
                ↵
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 프로젝트 등록 결과 토스트 */}
      {projRegToast && (
        <div className={`xc-proj-reg-toast xc-proj-reg-toast--${projRegToast.type}`}>
          <span className="xc-proj-reg-toast-icon">{projRegToast.type === 'ok' ? '✓' : '⚠'}</span>
          <span className="xc-proj-reg-toast-msg">{projRegToast.msg}</span>
          <button
            className="xc-proj-reg-toast-close"
            onClick={() => setProjRegToast(null)}
            aria-label={t18n('chat.closeAriaLabel')}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
