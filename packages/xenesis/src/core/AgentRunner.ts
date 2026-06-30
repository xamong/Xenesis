import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { FileWorkspaceChangeStore } from '../changes/index.js';
import type { ApprovalMode, PermissionsConfig } from '../config/types.js';
import type { HookRegistry } from '../hooks/HookRegistry.js';
import type { HookEmitter, HookName } from '../hooks/index.js';
import type { HandoffPriorityPolicy } from '../orchestration/index.js';
import { evaluatePermission, workspacePathForToolInput } from '../permissions/policy.js';
import { buildProviderQueryConfig, type ProviderQueryConfig } from '../providers/queryConfig.js';
import { buildSchemaGuidance, coerceToolArguments } from '../providers/toolArgCoercion.js';
import type { AgentProvider, ProviderRequest, ProviderResponse } from '../providers/types.js';
import type { SessionWriter } from '../sessions/types.js';
import type {
  TodoItem,
  Tool,
  ToolContext,
  ToolContextUpdates,
  ToolEvent,
  ToolLogger,
  ToolRegistry,
} from '../tools/types.js';
import { assertInsideWorkspace } from '../utils/workspace.js';
import { estimateContextTokens } from './context/ContextRecord.js';
import { compactConversation, shouldThrash } from './context/compaction/compactConversation.js';
import { pruneOlderMessages } from './context/compaction/pruneToolResults.js';
import { stripStaleImageAttachments } from './context/compaction/stripStaleImages.js';
import { computeContextTokenBudget } from './context/modelMetadata.js';
import type {
  AgentRunEvent,
  ApprovalDecision,
  ApprovalRequest,
  RunStateEvent,
  SessionEvent,
  ToolResultStoredEvent,
} from './events.js';
import {
  classifyVerificationFailure,
  renderVerificationFailureClassification,
  type VerificationFailureClassification,
  type VerificationToolName,
} from './failureClassification.js';
import { ApprovalPauseSignal } from './hitl/ApprovalPauseSignal.js';
import { type ExecutionBackend, LOCAL_BACKEND } from './isolation/executionBackend.js';
import { type AgentMessage, repairToolResultPairing, type ToolCall } from './messages.js';
import { type WrappedExternalContent, wrapExternalContent } from './prompt/index.js';
import {
  classifyProviderFailure,
  computeRetryDelayMs,
  decideProviderAttempt,
  extractRetryAfterMs,
} from './providerFailurePolicy.js';
import { buildRunSnapshot, type ResumableRunState, type RunSnapshotInput } from './resume/ResumableRunState.js';
import type { XenesisTurnApprovalResolutionInput, XenesisTurnLedger, XenesisTurnProcessModel } from './turnLedger.js';

type UserMessage = Extract<AgentMessage, { role: 'user' }>;
type SystemMessage = Extract<AgentMessage, { role: 'system' }>;
type AssistantMessage = Extract<AgentMessage, { role: 'assistant' }>;
type ToolMessage = Extract<AgentMessage, { role: 'tool' }>;
type ToolRunOutcome = {
  ok: boolean;
  recordedMessage: ToolMessage;
  modelMessage: ToolMessage;
  data?: unknown;
  externalContentWarnings?: string[];
  storedEvent?: ToolResultStoredEvent;
  inputPath?: string;
  isReadOnly?: boolean;
  isMutation?: boolean;
  newMessages?: AgentMessage[];
  contextUpdates?: ToolContextUpdates;
};
type ToolLoopGuardrailReason =
  | 'repeated_exact_failure'
  | 'repeated_same_tool_failure'
  | 'repeated_readonly_no_progress';
type ToolLoopGuardrailEntry = {
  toolName: string;
  inputKey: string;
  inputHash: string;
  resultHash: string;
  observations: number;
  ok: boolean;
  isReadOnly?: boolean;
  isMutation?: boolean;
  contentPreview: string;
};
type ToolLoopGuardrailState = {
  byCallKey: Map<string, ToolLoopGuardrailEntry>;
  consecutiveFailureToolName?: string;
  consecutiveFailureCount: number;
};
type ToolLoopGuardrailDecision = {
  reason: ToolLoopGuardrailReason;
  content: string;
  isReadOnly?: boolean;
  isMutation?: boolean;
};
type ToolCallBlock = {
  concurrent: boolean;
  toolCalls: ToolCall[];
};
type ToolPolicyRecoveryHint = {
  policyName: string;
  toolName: string;
  reason: string;
  nextAction?: string;
  missingBefore: string[];
  missingBeforeAny: string[];
};
type ToolPolicyAuditOptions = {
  force?: boolean;
  policyName?: string;
  reason?: string;
  nextAction?: string;
  priorityTools?: string[];
};
type ToolRecoveryHint = {
  kind: 'missing_tool' | 'invalid_tool_input' | 'permission_denied' | 'approval_denied' | 'tool_failed' | 'hook_denied';
  toolName: string;
  reason: string;
  nextAction: string;
  availableTools?: string[];
  schemaContext?: string;
};
type ToolResultGuidanceHint = {
  toolName: string;
  status?: string;
  verificationOk?: string;
  repairRequired?: string;
  visualVerificationMethod?: string;
  directCanvasPixelStatus?: string;
  screenshotFallbackReason?: string;
  nextRecommendedTools: string[];
  verificationSequence?: string[];
  nextRecommendedAction?: string;
  guidance?: string[];
};
type ToolResultGuidancePolicyDecision = {
  policyName: string;
  reason: string;
  nextAction: string;
  requiredBefore: string[];
  missingBefore: string[];
  priorityTools: string[];
};
type ToolPriorityHint = {
  reason: string;
  tools: string[];
  guidance: string;
};
type CollectedToolRun = {
  events: AgentRunEvent[];
  outcome: ToolRunOutcome;
};

export type ApprovalHandler = (request: ApprovalRequest) => Promise<boolean> | boolean;

export interface ToolExecutionPolicy {
  name?: string;
  priorityTools?: string[];
  requiredBefore?: Record<string, string[]>;
  requiredBeforeAny?: Record<string, string[]>;
  handoffPriority?: HandoffPriorityPolicy;
  snapshotOnly?: boolean;
}

export interface AgentRunnerOptions {
  provider: AgentProvider;
  fallbackProviders?: AgentProvider[];
  supportsTools?: boolean;
  fallbackSupportsTools?: boolean[];
  model: string;
  env?: NodeJS.ProcessEnv;
  skillPaths?: string[];
  workspaceRoot: string;
  xenesisHome?: string;
  cwd?: string;
  sessionId?: string;
  approvalMode?: ApprovalMode;
  maxTurns?: number;
  maxTokensBudget?: number;
  tools?: Tool[] | ToolRegistry;
  sessionWriter?: SessionWriter;
  logger?: ToolLogger;
  approvalHandler?: ApprovalHandler;
  /**
   * S6 — durable HITL. Tools whose approval gate is short-circuited (always
   * allowed) for the duration of this run. Restored from
   * `resumeState.alwaysAllowedTools` on resume; an `always-allow` decision adds
   * to this set at runtime. A hard policy deny always wins over always-allow.
   */
  alwaysAllowedTools?: string[];
  /**
   * S6 — durable HITL fast-lane timeout for the in-process `approvalHandler`
   * await (ms). On timeout the decision is `timeout` and the approval is
   * resolved per `approvalTimeoutBehavior`. Defaults to 300000 (5min).
   */
  approvalTimeoutMs?: number;
  /**
   * S6 — durable HITL fast-lane timeout behaviour: on `approvalHandler` timeout,
   * `allow` runs the tool, `deny` denies it. Defaults to `deny`.
   */
  approvalTimeoutBehavior?: 'allow' | 'deny';
  /**
   * S6 — durable HITL resume. A human decision injected by `resumeAgentPipeline`
   * for the exact stored tool call. Consumed once at the approval gate: when its
   * `toolCallId` matches, the gate applies it (execute/deny) instead of asking,
   * for exactly-once resume.
   */
  injectedApprovalDecision?: ApprovalDecision;
  systemMessages?: SystemMessage[];
  historyMessages?: AgentMessage[];
  blockedTools?: string[];
  permissions?: PermissionsConfig;
  maxToolRetries?: number;
  maxArgsCorrectionRetries?: number;
  maxToolResultChars?: number;
  compactHistoryAfterMessages?: number;
  compactHistoryKeepMessages?: number;
  autoCompact?: boolean;
  pruneOlderEnabled?: boolean;
  pruneToolResultThreshold?: number;
  stripOldImagesEnabled?: boolean;
  compactTokenThresholdRatio?: number;
  llmSummarize?: (older: AgentMessage[], previousSummary?: string) => Promise<string>;
  stream?: boolean;
  abortSignal?: AbortSignal;
  providerMaxRetries?: number;
  providerRetryDelayMs?: number;
  hooks?: HookEmitter;
  hookRegistry?: HookRegistry;
  maxStopHookContinuations?: number;
  toolExecutionPolicy?: ToolExecutionPolicy;
  recordLifecycle?: boolean;
  /**
   * S7 — event-sourced resume. When present, `run()` seeds its per-run state
   * (turn count, recovery counters, successful-tool sets, compaction ratios,
   * `previousCompactSummary`, `stopHookContinuationCount`, `messageSeq`, usage)
   * from this snapshot INSTEAD of zero-initializing, and does NOT re-append the
   * triggering user message (it is already the last turn in `historyMessages`).
   * Seed-state, never replay: past events are not re-executed.
   */
  resumeState?: ResumableRunState;
  /**
   * S7 — event-sourced resume flag. When `true`, the triggering user message is
   * already the last turn in `historyMessages` (rehydrated from the log), so
   * `run()` must NOT re-append or re-record it, and must NOT consume a fresh
   * `messageSeq` id for it. This is keyed separately from `resumeState` because
   * a pre-S7 log (no `run_snapshot`) still resumes via the message-only degrade
   * path: `resumeState` is `undefined` there, but the user message is present in
   * `historyMessages` all the same, so re-appending it would duplicate it.
   * Constraint derivation still runs on the recovered user message.
   */
  resuming?: boolean;
  /**
   * I3 — execution backend seam. When absent, defaults to LOCAL_BACKEND
   * (delegates to runCommand/runCommandArgs byte-for-byte). Inject a custom
   * backend (Docker, remote) to intercept all one-shot shell/runtime tool exec.
   */
  executionBackend?: ExecutionBackend;
  turnLedger?: XenesisTurnLedger;
}

export interface AgentRunUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface AgentRunResultBase {
  content: string;
  messages: AgentMessage[];
  turns: number;
  usage: AgentRunUsage;
}

export type AgentRunResult =
  | (AgentRunResultBase & { status: 'done' })
  | (AgentRunResultBase & { status: 'stopped'; reason: 'max_turns' | 'cancelled' | 'budget' })
  | (AgentRunResultBase & { status: 'paused'; reason: 'awaiting_approval'; pendingApproval: ApprovalRequest });

const defaultLogger: ToolLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

class RunnerCancelledError extends Error {
  constructor() {
    super('Run cancelled');
    this.name = 'RunnerCancelledError';
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function stableToolInputValue(value: unknown): unknown {
  if (value === null) return null;
  const valueType = typeof value;
  if (valueType === 'bigint') return String(value);
  if (valueType === 'number') return Number.isFinite(value as number) ? value : String(value);
  if (valueType === 'string' || valueType === 'boolean') return value;
  if (valueType === 'undefined' || valueType === 'function' || valueType === 'symbol') return null;
  if (Array.isArray(value)) return value.map((item) => stableToolInputValue(item));

  const input = value as Record<string, unknown>;
  return Object.keys(input)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = stableToolInputValue(input[key]);
      return acc;
    }, {});
}

function canonicalToolInput(input: unknown) {
  return JSON.stringify(stableToolInputValue(input));
}

function shortHash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function toolLoopCallKey(toolCall: ToolCall) {
  return `${toolCall.name}|${canonicalToolInput(toolCall.input)}`;
}

function createToolLoopGuardrailState(): ToolLoopGuardrailState {
  return {
    byCallKey: new Map(),
    consecutiveFailureCount: 0,
  };
}

function usageSnapshot(usage: AgentRunUsage): AgentRunUsage {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  };
}

function isAbortLikeError(error: unknown) {
  return (
    error instanceof RunnerCancelledError ||
    (error instanceof Error && (error.name === 'AbortError' || error.message.toLowerCase().includes('aborted')))
  );
}

function isContextLimitError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes('context_length_exceeded') ||
    message.includes('maximum context') ||
    message.includes('context window') ||
    message.includes('prompt is too long') ||
    message.includes('too many tokens') ||
    message.includes('token limit')
  );
}

function sleep(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new RunnerCancelledError());
      return;
    }
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new RunnerCancelledError());
    };
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function toolArray(tools: Tool[] | ToolRegistry | undefined) {
  if (!tools) return [];
  return Array.isArray(tools) ? tools : Array.from(tools.values());
}

function toolResultMessage(toolCall: ToolCall, content: string): ToolMessage {
  return {
    role: 'tool',
    toolCallId: toolCall.id,
    name: toolCall.name,
    content,
  };
}

function truncateToolContent(content: string, maxChars: number) {
  if (content.length <= maxChars) return content;
  const headLength = Math.max(0, Math.floor(maxChars * 0.7));
  const tailLength = Math.max(0, maxChars - headLength);
  const omitted = content.length - headLength - tailLength;
  return [
    content.slice(0, headLength),
    '',
    `[output truncated: omitted ${omitted} characters from ${content.length}]`,
    '',
    content.slice(content.length - tailLength),
  ].join('\n');
}

function toolResultAuthority(isReadOnly?: boolean, isMutation?: boolean) {
  if (isMutation) return 'tool_mutation';
  if (isReadOnly) return 'tool_readonly';
  return 'tool';
}

function wrapModelVisibleToolResult(
  toolCall: ToolCall,
  content: string,
  isReadOnly?: boolean,
  isMutation?: boolean,
): WrappedExternalContent {
  return wrapExternalContent({
    kind: 'tool_result',
    source: toolCall.name,
    authority: toolResultAuthority(isReadOnly, isMutation),
    content,
  });
}

function userFacingExternalContentWarnings(wrapped: WrappedExternalContent): string[] {
  return wrapped.warnings.filter((warning) => warning.includes('prompt-injection') || warning.includes('truncated'));
}

function compactHistoryMessages(messages: AgentMessage[], keepMessages: number): SystemMessage {
  const summary = messages
    .map((message, index) => {
      if (message.role === 'tool') return `${index + 1}. tool ${message.name}: ${message.content}`;
      return `${index + 1}. ${message.role}: ${message.content}`;
    })
    .join('\n');

  return {
    role: 'system',
    content: [
      'Xenesis compacted session context:',
      '[REFERENCE ONLY — respond only to the latest user message after this summary. Topic overlap with this summary does NOT mean resume its task.]',
      '',
      summary,
      '',
      '--- END OF CONTEXT SUMMARY ---',
      `Recent ${keepMessages} messages are preserved after this summary.`,
    ].join('\n'),
  };
}

function messageTokenText(message: AgentMessage) {
  if (message.role === 'assistant' && (message.toolCalls ?? []).length > 0) {
    return [message.content, JSON.stringify(message.toolCalls)].join('\n');
  }
  if (message.role === 'tool') return [message.name, message.content].join('\n');
  return message.content;
}

export function estimateMessagesTokens(messages: AgentMessage[]) {
  return messages.reduce((total, message) => total + estimateContextTokens(messageTokenText(message)), 0);
}

function deterministicCompactSummary(messages: AgentMessage[]) {
  return messages
    .map((message, index) => {
      if (message.role === 'tool') return `${index + 1}. tool ${message.name}: ${message.content}`;
      return `${index + 1}. ${message.role}: ${message.content}`;
    })
    .join('\n');
}

function isProjectAnalysisPrompt(content: string) {
  const normalized = content.toLowerCase();
  const hasProjectSubject = /프로젝트|폴더|workspace|project|folder/.test(normalized);
  const hasAnalysisIntent = /구조|분석|리뉴얼|요약|structure|analy[sz]e|renewal|summari[sz]e|summary/.test(normalized);
  return hasProjectSubject && hasAnalysisIntent;
}

function isProjectEvidenceToolName(name: string) {
  return ['read', 'search', 'code_symbols', 'lsp', 'context_search'].includes(name);
}

function hasSuccessfulDiscoveryTool(successfulToolNames: ReadonlySet<string>) {
  return ['tree', 'glob', 'list'].some((name) => successfulToolNames.has(name));
}

function projectAnalysisEvidenceRecoveryMessage(
  userMessage: UserMessage,
  successfulToolNames: ReadonlySet<string>,
  successfulEvidenceToolCount: number,
  successfulEvidencePathCount: number,
  recoveryCount: number,
): SystemMessage | undefined {
  if (recoveryCount >= 2) return undefined;
  if (!isProjectAnalysisPrompt(userMessage.content)) return undefined;
  if (successfulEvidenceToolCount >= 2 && successfulEvidencePathCount >= 2) return undefined;

  return {
    role: 'system',
    content: [
      'Project analysis requires file evidence before final answer.',
      hasSuccessfulDiscoveryTool(successfulToolNames)
        ? 'You have only used discovery tools such as tree/glob/list so far.'
        : 'You have not yet gathered file evidence.',
      'Call read, search, code_symbols, lsp, or context_search on a small set of relevant files before finalizing.',
      'Use at least two focused evidence reads/searches from distinct files or sources when the workspace has multiple entry, config, or documentation files. Configuration files or repeated ranges from one report alone are not enough for project-renewal analysis.',
      'For large files, use read with startLine/maxLines or search first, then summarize the observed evidence.',
    ].join('\n'),
  };
}

const verificationToolRecoveryNames = ['app_readiness', 'diagnostics', 'app_e2e_check'];

// Streaming idle watchdog: abort a provider stream that produces no events for this long.
function resolveStreamIdleMs(env: NodeJS.ProcessEnv = process.env) {
  return Number(env.XENESIS_STREAM_IDLE_MS ?? process.env.XENESIS_STREAM_IDLE_MS ?? '60000') || 60000;
}

function userRequestedVerificationToolUse(content: string) {
  return /app_readiness|app_e2e_check|diagnostics|verify|verification|test|diagnostic|검증|테스트|진단|수정|고쳐|복구/i.test(
    content,
  );
}

function containsToolUnavailableClaim(content: string) {
  return /unable\s+to\s+use|can't\s+use|cannot\s+use|not\s+able\s+to\s+use|current\s+constraints|tool\s+constraints|tools?\s+(?:are\s+)?unavailable|사용할\s+수\s+없|도구[^.!?\n]{0,80}(?:사용|호출|실행)[^.!?\n]{0,40}(?:못|불가)/i.test(
    content,
  );
}

function contentMentionsTool(content: string, toolName: string) {
  return new RegExp(`(?:^|[^A-Za-z0-9_])${escapeRegExp(toolName)}(?:$|[^A-Za-z0-9_])`, 'i').test(content);
}

function userRequestedServerToolUse(content: string) {
  return (
    contentMentionsTool(content, 'server') ||
    /서버[^.!?\n]{0,30}(?:띄|실행|시작|구동|열|켜)|(?:띄|실행|시작|구동|열|켜)[^.!?\n]{0,30}서버|(?:start|run|launch|serve)[^.!?\n]{0,30}server|server[^.!?\n]{0,30}(?:start|run|launch|serve)/i.test(
      content,
    )
  );
}

function userRequestedVisualVerification(content: string) {
  return (
    contentMentionsTool(content, 'browser') ||
    contentMentionsTool(content, 'app_e2e_check') ||
    /브라우저|화면[^.!?\n]{0,30}(?:확인|검증|점검|테스트)|(?:확인|검증|점검|테스트)[^.!?\n]{0,30}화면|렌더링[^.!?\n]{0,30}(?:확인|검증|점검|테스트)/i.test(
      content,
    )
  );
}

function falseUnavailableToolRecoveryMessage(
  userMessage: UserMessage,
  assistantContent: string,
  availableToolNames: readonly string[],
  alreadyUsed: boolean,
): SystemMessage | undefined {
  if (alreadyUsed) return undefined;
  if (!userRequestedVerificationToolUse(userMessage.content)) return undefined;
  if (!containsToolUnavailableClaim(assistantContent)) return undefined;

  const availableNames = new Set(availableToolNames);
  const requestedVerificationTools = verificationToolRecoveryNames.filter(
    (name) =>
      availableNames.has(name) &&
      (contentMentionsTool(userMessage.content, name) || contentMentionsTool(assistantContent, name)),
  );
  if (requestedVerificationTools.length === 0) return undefined;

  return {
    role: 'system',
    content: [
      'Requested verification tools are available in this run.',
      `Available requested tools: ${requestedVerificationTools.join(', ')}`,
      'Do not claim these tools are unavailable unless the runtime explicitly denies a tool call.',
      'Call the first appropriate verification tool now. For generated client-server apps, start with app_readiness, then run diagnostics, then app_e2e_check when the app is browser-facing.',
    ].join('\n'),
  };
}

function explicitlyRequestedToolNames(content: string, availableToolNames: readonly string[]) {
  const available = new Set(availableToolNames);
  const requestedTools = ['app_readiness', 'diagnostics', 'app_e2e_check', 'browser', 'read'].filter(
    (toolName) => available.has(toolName) && contentMentionsTool(content, toolName),
  );
  if (available.has('server') && userRequestedServerToolUse(content)) {
    requestedTools.push('server');
  }
  return Array.from(new Set(requestedTools));
}

function userRequestedPostMutationRead(content: string) {
  return /(?:갱신|생성|작성|수정|변경|편집|추가|저장|업데이트|write|update|create|modify|edit|patch)[^.!?\n]{0,80}(?:후|뒤|다시|재확인|read\s*back|re-read)|(?:후|뒤|다시|재확인)[^.!?\n]{0,80}read|read\s+back|re-read|after\s+(?:writing|updating|editing|modifying)/i.test(
    content,
  );
}

function userRequestedComplexImplementationTracking(content: string) {
  const workRequested =
    /구현|수정|변경|추가|생성|검증|실행|완료|끝까지|implement|build|create|update|modify|fix|verify|run/i.test(content);
  if (!workRequested) return false;

  const explicitPlanningOnly =
    /계획만|제안만|분석만|읽기만|수정하지\s*(?:마|말)|do\s+not\s+(?:modify|edit|write|change)|plan\s+only|proposal\s+only/i.test(
      content,
    );
  if (explicitPlanningOnly) return false;

  const numberedStepCount = content.match(/(?:^|\s)\d+[).]/g)?.length ?? 0;
  const sequencedWork =
    /먼저[^.!?\n]{0,120}(?:그\s*다음|이후|후)|(?:그\s*다음|이후|후)[^.!?\n]{0,120}(?:검증|실행|보고)|then|after(?:ward)?/i.test(
      content,
    );
  const verificationRequested = /검증|테스트|diagnostics|npm\s+test|verify|verification|test/i.test(content);
  return numberedStepCount >= 2 || (sequencedWork && verificationRequested);
}

function explicitToolCompletionRecoveryMessage(
  userMessage: UserMessage,
  availableToolNames: readonly string[],
  successfulToolNames: ReadonlySet<string>,
  attemptedToolNames: ReadonlySet<string>,
  mutationSinceLastRead: boolean,
  recoveryCount: number,
): SystemMessage | undefined {
  if (recoveryCount >= 2) return undefined;
  const constraints = detectUserRequestConstraints(userMessage.content);
  const preferences = detectUserToolPreferences(userMessage.content);
  const visualVerificationAllowed = !constraints.noBrowser && !preferences.readinessOnly;
  const availableToolSet = new Set(availableToolNames);
  const visualVerificationTools = visualVerificationAllowed
    ? ['browser', 'app_e2e_check'].filter((toolName) => availableToolSet.has(toolName))
    : [];
  const requireVisualVerificationGroup =
    visualVerificationTools.length > 0 && userRequestedVisualVerification(userMessage.content);
  const requestedToolSet = new Set(explicitlyRequestedToolNames(userMessage.content, availableToolNames));
  const requireTodoTracking =
    availableToolSet.has('todo') &&
    !constraints.readOnly &&
    userRequestedComplexImplementationTracking(userMessage.content);
  if (requireTodoTracking) requestedToolSet.add('todo');
  const requestedTools = Array.from(requestedToolSet)
    .filter((toolName) => visualVerificationAllowed || !['browser', 'app_e2e_check'].includes(toolName))
    .filter((toolName) => !requireVisualVerificationGroup || !visualVerificationTools.includes(toolName));
  const requirePostMutationRead = mutationSinceLastRead && userRequestedPostMutationRead(userMessage.content);
  const missingTools = requestedTools.filter((toolName) => {
    if (toolName === 'read' && requirePostMutationRead) return true;
    return !successfulToolNames.has(toolName);
  });
  const missingVisualVerificationGroup =
    requireVisualVerificationGroup &&
    !visualVerificationTools.some((toolName) => successfulToolNames.has(toolName)) &&
    !visualVerificationTools.every((toolName) => attemptedToolNames.has(toolName))
      ? visualVerificationTools
      : [];
  if (missingTools.length === 0 && missingVisualVerificationGroup.length === 0) return undefined;

  return {
    role: 'system',
    content: [
      'Xenesis explicit tool completion required.',
      ...(missingTools.length > 0
        ? [
            `The user explicitly requested these tool(s), but they have not completed successfully yet: ${missingTools.join(', ')}.`,
          ]
        : []),
      ...(missingVisualVerificationGroup.length > 0
        ? [
            `The user explicitly requested one of these tool group(s), but none completed successfully yet: ${missingVisualVerificationGroup.join(' or ')}.`,
          ]
        : []),
      requirePostMutationRead && missingTools.includes('read')
        ? 'A file mutation succeeded after the last successful read, so read the changed file before finalizing.'
        : 'Call the missing requested tool(s) before finalizing.',
      missingVisualVerificationGroup.length > 0
        ? 'Do not use task_handoff as a substitute for this explicit visual verification gate; perform browser/app_e2e_check in the current run or report a concrete blocker.'
        : undefined,
      'Do not finalize until the missing requested tools succeed. If a requested tool cannot be called, first attempt the tool or report the concrete runtime denial/error.',
    ]
      .filter((line) => line !== undefined)
      .join('\n'),
  };
}

function userRequestedWorkspaceFileMutation(content: string) {
  const scopedFileMutationRequest = hasScopedFileMutationRequest(content);
  if (!scopedFileMutationRequest && userRequestedDeskBrowserControl(content)) {
    return false;
  }
  if (!scopedFileMutationRequest && userRequestedDocumentViewOrLayoutControl(content)) {
    return false;
  }
  if (
    !scopedFileMutationRequest &&
    /(?:파일|문서|코드|README|\.md|\.html|\.json)[^.!?\n]{0,80}(?:수정|변경|편집|저장|write|update|edit)[^.!?\n]{0,20}(?:하지\s*(?:마|말)|않|금지)|(?:do\s+not|don't|dont|never)[^.!?\n]{0,80}(?:modify|edit|write|change|update|save|touch)[^.!?\n]{0,80}(?:file|README|\.md|\.html|\.json)/i.test(
      content,
    )
  ) {
    return false;
  }
  return (
    scopedFileMutationRequest ||
    /(?:파일|문서|코드|README|\.md|\.html|\.json|workspace|작업공간)[^.!?\n]{0,80}(?:갱신|생성|작성|수정|변경|편집|추가|저장|업데이트|만들|써|write|update|create|modify|edit|patch)|(?:갱신|생성|작성|수정|변경|편집|추가|저장|업데이트|만들|write|update|create|modify|edit|patch)[^.!?\n]{0,80}(?:파일|문서|코드|README|\.md|\.html|\.json)/i.test(
      content,
    )
  );
}

function userRequestedDocumentViewOrLayoutControl(content: string) {
  const hasDeskDocumentSurface =
    /(?:작업\s*영역|문서\s*영역|가운데|브라우저|웹\s*페이지|웹페이지|https?:\/\/|\.md\b|\.html\b|\.xcon\b|\.mermaid\b|\bfile\b|파일|문서)/i.test(
      content,
    );
  const hasViewModeIntent =
    /(?:편집\s*[+/&]\s*미리보기|미리보기\s*[+/&]\s*편집|분할\s*(?:모드|보기)|미리보기|보기\s*모드|문서\s*모드|\bsplit\s*(?:mode|view)?\b|\bpreview\b|\bviewer\b|\bedit\s*mode\b|\bsource\s*mode\b)/i.test(
      content,
    );
  const hasLayoutIntent =
    /(?:좌우|상하|나란히|붙여|정렬|오른쪽|왼쪽|위쪽|아래쪽|\barrange\b|\blayout\b|\bside\s*by\s*side\b|\bleft\s*right\b)/i.test(
      content,
    );
  const hasContentMutationIntent =
    /(?:본문|내용|문단|행|슬라이드|코드|\bcode\b|\bsource\b|\btext\b)[^.!?\n]{0,50}(?:추가|고쳐|고치|수정|변경|작성|저장|써|붙여|append|edit|update|write|replace)|(?:추가|고쳐|고치|수정|변경|작성|저장|써|붙여|append|update|write|replace)[^.!?\n]{0,50}(?:본문|내용|문단|행|슬라이드|코드|\bcode\b|\bsource\b|\btext\b)/i.test(
      content,
    );

  return hasDeskDocumentSurface && (hasViewModeIntent || hasLayoutIntent) && !hasContentMutationIntent;
}

function userRequestedOfficeDocumentAutomation(content: string) {
  return (
    (/(?:\.docx|\.xlsx|\.pptx)\b/i.test(content) ||
      /\b(?:word|excel|powerpoint|pptx|office)\b/i.test(content) ||
      /(?:워드|엑셀|파워포인트|발표\s*자료|오피스|통합\s*문서|통합\s*문서를?)/i.test(content)) &&
    /(?:생성|작성|만들|추가|수정|변경|편집|저장|내보내|export|create|generate|make|add|append|edit|update|modify)/i.test(
      content,
    )
  );
}

function userRequestedAgentArtifactQualityLogRestore(content: string) {
  const namesSavedQualityEntry =
    /(?:agent-quality-[a-z0-9_-]+|quality\s*log|qualityLog|quality\s*entry|품질\s*이력|저장된\s*이력|이력\s*항목)/i.test(
      content,
    );
  const asksForRestoreToFile =
    /(?:결과물|아티팩트|artifact|source|소스)[^.!?\n]{0,140}(?:파일|경로|\.md|\.xcon|\.html|file|path|써|작성|저장|복원|되살려|apply|restore|write)|(?:파일|경로|\.md|\.xcon|\.html|file|path)[^.!?\n]{0,140}(?:결과물|아티팩트|artifact|source|소스|다시\s*써|써|작성|저장|복원|되살려|apply|restore|write)/i.test(
      content,
    );
  return namesSavedQualityEntry && asksForRestoreToFile;
}

function userRequestedDeskBrowserControl(content: string) {
  return (
    /(?:https?:\/\/|file:\/\/)/i.test(content) &&
    /\b(?:browser|web)\b|브라우저|웹/i.test(content) &&
    /(?:form|field|input|button|click|fill|type|select|press|submit|save|양식|입력|입력칸|버튼|클릭|눌러|누르|선택|저장|제출)/i.test(
      content,
    )
  );
}

function fileMutationRequiredRecoveryMessage(
  userMessage: UserMessage,
  successfulMutationCount: number,
  recoveryCount: number,
  assistantMessage?: AssistantMessage,
): SystemMessage | undefined {
  if (recoveryCount >= 2) return undefined;
  if (successfulMutationCount > 0) return undefined;
  if (!userRequestedWorkspaceFileMutation(userMessage.content)) return undefined;

  if (userRequestedAgentArtifactQualityLogRestore(userMessage.content)) {
    return {
      role: 'system',
      content: [
        'Xenesis Agent artifact quality-log restore capability required.',
        'The user requested restoring or applying a saved Agent artifact quality-log entry to a file path. Do not satisfy this through generic workspace file write, patch, edit, json, shell-generated file mutation, xd.files.previewTextWrite, or xd.files.applyTextWrite.',
        'Call the available Desk capability caller, such as desk_call_capability or xenesis_desk_call_capability, before finalizing.',
        'Call xd.agent.artifacts.qualityLog.applyEntry with approved=false using entryId for the saved quality-log entry and filePath for the requested output path so Desk creates the real inline approval request.',
        'If the call returns pending approval, stop this provider turn with generic approval-needed product language and do not run same-turn post-approval verification.',
        'If the action executes immediately, or in a later verification turn after approval execution, verify with xd.agent.artifacts.qualityLog.list and file readback, status, or visibility before reporting the user-facing result.',
      ].join('\n'),
    };
  }

  if (userRequestedOfficeDocumentAutomation(userMessage.content)) {
    return {
      role: 'system',
      content: [
        'Xenesis Desk Office document capability required.',
        'The user requested Word, Excel, PowerPoint, or Office file generation/editing. Do not satisfy this through generic workspace file write, patch, edit, json, or shell-generated file mutation.',
        'Call the available Desk capability caller, such as desk_call_capability or xenesis_desk_call_capability, before finalizing.',
        'For new Office files, call xd.documents.office.generate with approved=false so Desk creates the real inline approval request. Use kind=word/excel/powerpoint and the requested output file path/content fields.',
        "For rich Word or PowerPoint generation, include intent and a layoutPlan. Word layoutPlan.sections should match the user's document type instead of always using the fallback brief shape. PowerPoint layoutPlan.slides should use roles such as title, agenda, comparison, timeline, metrics, matrix, recommendation, closing, or content as appropriate.",
        'For Office edits, call xd.documents.office.edit with approved=false. Use appendParagraphs for Word/docx, appendRows with sheetName and rows for Excel/xlsx, and appendSlides for PowerPoint/pptx.',
        'When an Office generate/edit/export call returns a pending approval, the user-facing approval stop must use generic Desk product language only. Do not echo hidden or remembered titles, marker-like identifiers, requested content/body text, file paths, raw args, approval ids, actionInboxItem, CR paths, or tool names in the normal assistant text; let the Agent chat render the inline approval buttons.',
        'If the call returns pending approval, stop this provider turn and do not run same-turn inspect or verify.',
        'If the Office action executes immediately, or in a later verification turn after approval execution, verify with xd.documents.office.inspect or xd.documents.office.verify before reporting the user-facing result.',
      ].join('\n'),
    };
  }

  if (assistantMessage?.providerMetadata?.cli?.xenesisDeskMcpConfigured) {
    return {
      role: 'system',
      content: [
        'Xenesis Desk CR file mutation required.',
        'The user requested a workspace file change, and this provider run has Desk CR MCP tools configured.',
        'Do not satisfy this with native provider apply_patch, shell redirection, direct filesystem writes, or generic write, patch, edit, or json helpers.',
        'Call the configured Desk capability caller before finalizing.',
        'For text file generation or updates, use xd.files.applyTextWrite with approved=false so Desk creates the real inline approval request. Use xd.files.previewTextWrite first only when the user explicitly asks for a preview/edit-flow before applying.',
        'Do not set maxBytes from requested character count, document length, or design complexity requirements. Omit maxBytes unless the user explicitly asks for a file-size safety cap.',
        'If the call returns pending approval, stop this provider turn and do not run same-turn post-approval readback.',
        'If the file action executes immediately, or in a later verification turn after approval execution, verify with xd.files.readText, viewer/open-content state, diagnostics, or another Desk CR readback path before reporting the user-facing result.',
        'When an approval is pending, keep visible text generic and product-facing. Do not echo CR paths, raw args, approval ids, actionInboxItem, approvalRequired, or hidden marker values.',
      ].join('\n'),
    };
  }

  return {
    role: 'system',
    content: [
      'Xenesis file mutation required.',
      'The user requested a workspace file change, but no file mutation tool has completed successfully yet.',
      'Do not answer with a plan, proposed content, or a question about whether to proceed.',
      'Call write, patch, edit, or json now after using the required read/list evidence. If the mutation is impossible, report the concrete tool denial or file error after attempting the appropriate tool.',
    ].join('\n'),
  };
}

function userRequestedRepositoryTopic(content: string) {
  return /git|github|repo\b|repository|version control|hosting|deployment|버전\s*관리|저장소|배포/.test(
    content.toLowerCase(),
  );
}

function userRequestedRepairOrVerification(content: string) {
  return /fix|repair|verify|verification|test|diagnostic|run|complete|finish|done|수정|복구|검증|테스트|실행|완료|끝까지|고쳐/.test(
    content.toLowerCase(),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toolResultFieldValue(content: string, field: string) {
  const match = new RegExp(`^\\s*${escapeRegExp(field)}\\s*:\\s*(.*?)\\s*$`, 'im').exec(content);
  const value = match?.[1]?.trim();
  return value ? value : undefined;
}

function splitToolNameList(value: string | undefined) {
  if (!value) return [];
  const parts = value
    .replace(/\s*->\s*/g, ',')
    .replace(/[;|]/g, ',')
    .split(/[,\s]+/);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function uniqueToolNames(tools: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tool of tools) {
    if (seen.has(tool)) continue;
    seen.add(tool);
    result.push(tool);
  }
  return result;
}

function toolResultLooksFailed(content: string) {
  return (
    /(?:status|verificationOk|repairRequired|timedOut|completionBlocked)\s*:\s*(?:fail|false|true)/i.test(content) &&
    !/(?:status\s*:\s*pass|verificationOk\s*:\s*true|repairRequired\s*:\s*false)/i.test(content)
  );
}

function parseToolResultGuidance(toolName: string, content: string): ToolResultGuidanceHint | undefined {
  const knownGuidanceTool =
    toolName === 'app_readiness' ||
    toolName === 'diagnostics' ||
    toolName === 'app_e2e_check' ||
    toolName === 'browser';
  const status = toolResultFieldValue(content, 'status');
  const verificationOk = toolResultFieldValue(content, 'verificationOk');
  const repairRequired = toolResultFieldValue(content, 'repairRequired');
  const visualVerificationMethod = toolResultFieldValue(content, 'visualVerificationMethod');
  const directCanvasPixelStatus = toolResultFieldValue(content, 'directCanvasPixelStatus');
  const screenshotFallbackReason = toolResultFieldValue(content, 'screenshotFallbackReason');
  const explicitRecommendedTools = splitToolNameList(toolResultFieldValue(content, 'nextRecommendedTools'));
  const nextTools = splitToolNameList(toolResultFieldValue(content, 'nextTools'));
  let nextRecommendedTools = explicitRecommendedTools.length > 0 ? explicitRecommendedTools : nextTools;
  let verificationSequence: string[] = [];
  let nextRecommendedAction = toolResultFieldValue(content, 'nextRecommendedAction');
  const guidance: string[] = [];

  if (!knownGuidanceTool && nextRecommendedTools.length === 0 && !nextRecommendedAction) {
    return undefined;
  }

  if (toolName === 'app_readiness') {
    const failureCount = Number(toolResultFieldValue(content, 'failures') ?? '0');
    const readinessPassed = status === 'pass' || (!Number.isNaN(failureCount) && failureCount === 0);
    if (readinessPassed) {
      nextRecommendedTools = ['diagnostics', 'app_e2e_check'];
      verificationSequence = ['diagnostics', 'app_e2e_check'];
      nextRecommendedAction ??= 'run_diagnostics_then_app_e2e_check_before_finalizing_browser_facing_app';
      guidance.push(
        'App readiness passed. Continue with diagnostics and browser-facing e2e verification before finalizing app work.',
      );
    } else if (status === 'fail' || failureCount > 0) {
      nextRecommendedTools =
        nextRecommendedTools.length > 0 ? nextRecommendedTools : ['read', 'patch', 'app_readiness'];
      nextRecommendedAction ??= 'repair_readiness_findings_then_rerun_app_readiness';
      guidance.push(
        'App readiness failed. Repair the reported structural/client issues, then rerun app_readiness before downstream checks.',
      );
    }
  } else if (toolName === 'diagnostics') {
    const diagnosticsPassed =
      verificationOk === 'true' ||
      (toolResultFieldValue(content, 'exitCode') === '0' &&
        toolResultFieldValue(content, 'timedOut') === 'false' &&
        repairRequired === 'false');
    if (diagnosticsPassed) {
      nextRecommendedTools = ['app_e2e_check'];
      verificationSequence = ['app_e2e_check'];
      nextRecommendedAction ??= 'run_app_e2e_check_for_browser_or_ui_apps_before_finalizing';
      guidance.push('Diagnostics passed. Use app_e2e_check for browser-facing UI evidence before finalizing.');
    } else if (repairRequired === 'true' || toolResultLooksFailed(content)) {
      nextRecommendedTools =
        nextRecommendedTools.length > 0 ? nextRecommendedTools : ['read', 'patch', 'diagnostics', 'app_e2e_check'];
      nextRecommendedAction ??= 'repair_diagnostics_failure_then_rerun_diagnostics_and_app_e2e_check';
      guidance.push(
        'Diagnostics failed. Repair the diagnosed cause, rerun diagnostics, then run app_e2e_check if the app has a browser UI.',
      );
    }
  } else if (toolName === 'browser') {
    if (/ERR_CONNECTION_REFUSED|ECONNREFUSED|server\s+not\s+running/i.test(content)) {
      nextRecommendedTools = ['app_launch_plan', 'server', 'browser', 'app_e2e_check'];
      verificationSequence = ['app_launch_plan', 'server', 'browser', 'app_e2e_check'];
      nextRecommendedAction ??= 'start_or_recover_server_then_retry_browser_and_app_e2e_check';
      guidance.push(
        'Browser could not reach the app. Recover the local launch plan/server first, then retry browser and app_e2e_check.',
      );
    } else if (/Only\s+HTTP\(S\)\s+URLs|file:\/\/|Invalid URL/i.test(content)) {
      nextRecommendedTools = ['app_launch_plan', 'server', 'browser', 'app_e2e_check'];
      verificationSequence = ['app_launch_plan', 'server', 'browser', 'app_e2e_check'];
      nextRecommendedAction ??= 'serve_local_file_over_http_then_retry_browser_and_app_e2e_check';
      guidance.push(
        'Browser requires an HTTP(S) URL. Serve the local app first, then retry browser and app_e2e_check.',
      );
    } else if (/browser:\s*screenshot captured/i.test(content)) {
      nextRecommendedTools = ['app_e2e_check'];
      verificationSequence = ['app_e2e_check'];
      nextRecommendedAction ??= 'use_screenshot_evidence_then_rerun_app_e2e_check_if_formal_verification_is_needed';
      guidance.push(
        'Browser screenshot evidence is available. Use it for visual reasoning and rerun app_e2e_check when formal verification is needed.',
      );
    }
  }

  if (
    !status &&
    !verificationOk &&
    !repairRequired &&
    !visualVerificationMethod &&
    !directCanvasPixelStatus &&
    !screenshotFallbackReason &&
    nextRecommendedTools.length === 0 &&
    verificationSequence.length === 0 &&
    !nextRecommendedAction &&
    guidance.length === 0
  ) {
    return undefined;
  }

  const hint: ToolResultGuidanceHint = {
    toolName,
    nextRecommendedTools: uniqueToolNames(nextRecommendedTools),
  };
  if (status) hint.status = status;
  if (verificationOk) hint.verificationOk = verificationOk;
  if (repairRequired) hint.repairRequired = repairRequired;
  if (visualVerificationMethod) hint.visualVerificationMethod = visualVerificationMethod;
  if (directCanvasPixelStatus) hint.directCanvasPixelStatus = directCanvasPixelStatus;
  if (screenshotFallbackReason) hint.screenshotFallbackReason = screenshotFallbackReason;
  if (verificationSequence.length > 0) hint.verificationSequence = uniqueToolNames(verificationSequence);
  if (nextRecommendedAction) hint.nextRecommendedAction = nextRecommendedAction;
  if (guidance.length > 0) hint.guidance = guidance;
  return hint;
}

function orderedMissingBefore(sequence: string[], toolName: string, successfulToolNames: ReadonlySet<string>) {
  const index = sequence.indexOf(toolName);
  const requiredBefore =
    index === -1
      ? [sequence.find((name) => !successfulToolNames.has(name))].filter((name): name is string => Boolean(name))
      : sequence.slice(0, index);
  return {
    requiredBefore,
    missingBefore: requiredBefore.filter((name) => !successfulToolNames.has(name)),
  };
}

function guidanceToolIsSequenceRelated(toolName: string, sequence: string[], nextRecommendedTools: string[]) {
  if (sequence.includes(toolName) || nextRecommendedTools.includes(toolName)) return true;
  if (
    toolName === 'browser' &&
    (sequence.includes('app_e2e_check') ||
      sequence.includes('diagnostics') ||
      nextRecommendedTools.includes('app_e2e_check'))
  )
    return true;
  if (toolName === 'app_e2e_check' && sequence.includes('browser')) return true;
  return false;
}

function promptToolPriorityHint(content: string): ToolPriorityHint | undefined {
  const memoryRequested =
    /기억|메모리|장기기억|\bmemory\b|\bremember\b|\brecall\b/i.test(content) &&
    /기억해|기억해줘|기억해둬|저장|검색|찾아|확인|내용|뭐|무엇|\bremember\b|\brecall\b|\bsearch\b|\bsave\b|\bstore\b|\bstored\b/i.test(
      content,
    );
  if (memoryRequested) {
    return {
      reason: 'durable_memory_request',
      tools: ['memory'],
      guidance:
        'For explicit durable-memory save/search/recall requests, call the memory tool before answering; do not rely only on the current transcript.',
    };
  }

  const appVerificationRequested =
    userRequestedRepairOrVerification(content) &&
    /app|browser|ui|client|server|web|page|프론트|브라우저|웹|화면|앱|서버|클라이언트/i.test(content);

  if (appVerificationRequested) {
    return {
      reason: 'app_verification_chain',
      tools: ['app_launch_plan', 'app_readiness', 'diagnostics', 'server', 'browser', 'app_e2e_check'],
      guidance:
        'For browser-facing app work, prefer launch planning, readiness, diagnostics, server/browser evidence, and app_e2e_check before shell-only conclusions.',
    };
  }

  if (isProjectAnalysisPrompt(content)) {
    return {
      reason: 'project_analysis_evidence',
      tools: ['tree', 'glob', 'list', 'search', 'read', 'code_symbols', 'lsp', 'context_search'],
      guidance:
        'Prefer these tools before shell or mutation tools so project analysis starts from cheap structured evidence.',
    };
  }

  if (userRequestedRepairOrVerification(content)) {
    return {
      reason: 'repair_verification_evidence',
      tools: ['todo', 'search', 'read', 'code_symbols', 'lsp', 'diff', 'patch', 'json', 'diagnostics'],
      guidance: 'For repair work, gather focused evidence, patch narrowly, then verify with diagnostics.',
    };
  }

  return undefined;
}

function userForbidsTool(content: string, toolName: string) {
  const escapedTool = escapeRegExp(toolName);
  if (new RegExp(`${escapedTool}\\s*보다`, 'i').test(content)) return false;
  const englishForbidden = [
    new RegExp(
      `(?:do\\s+not|don't|dont|never)\\s+(?:directly\\s+)?(?:call|use|run|execute|invoke|start)\\s+(?:the\\s+)?${escapedTool}(?:\\s+tool)?`,
      'i',
    ),
    new RegExp(
      `(?:do\\s+not|don't|dont|never)[^.!?\\n]{0,100}(?:${escapedTool}\\s+tool|tool\\s+${escapedTool}|${escapedTool})`,
      'i',
    ),
  ];
  const koreanForbidden = [
    new RegExp(
      `${escapedTool}\\s*(?:tool|도구)?(?:를|을|은|는)?\\s*(?:직접\\s*)?(?:호출|사용|실행|시작|쓰)\\s*하지\\s*(?:마|말|않|않도록)`,
      'i',
    ),
    new RegExp(`${escapedTool}\\s*(?:tool|도구)?(?:를|을|은|는)?\\s*(?:호출|사용|실행|시작|쓰)[^.!?\\n]{0,20}말`, 'i'),
    new RegExp(`${escapedTool}\\s*(?:tool|도구)?(?:를|을|은|는)?\\s*쓰지\\s*(?:마|말|않|않도록)?`, 'i'),
    new RegExp(`(?:호출|사용|실행|시작|쓰)\\s*하지\\s*(?:마|말|않)[^.!?\\n]{0,80}${escapedTool}`, 'i'),
  ];
  return [...englishForbidden, ...koreanForbidden].some((pattern) => pattern.test(content));
}

function extractUserForbiddenTools(content: string, toolNames: Iterable<string>) {
  return new Set(Array.from(toolNames).filter((toolName) => userForbidsTool(content, toolName)));
}

interface UserRequestConstraints {
  readOnly: boolean;
  noFileMutation: boolean;
  noCommandExecution: boolean;
  noBrowser: boolean;
}

interface UserToolPreferences {
  shellRequiresPriorEvidence: boolean;
  mutationRequiresPriorEvidence: boolean;
  readinessOnly: boolean;
  noExternalWeb: boolean;
}

const noUserRequestConstraints: UserRequestConstraints = {
  readOnly: false,
  noFileMutation: false,
  noCommandExecution: false,
  noBrowser: false,
};

const noUserToolPreferences: UserToolPreferences = {
  shellRequiresPriorEvidence: false,
  mutationRequiresPriorEvidence: false,
  readinessOnly: false,
  noExternalWeb: false,
};

function hasPattern(content: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(content));
}

type AnswerOnlyFinalKind = 'confirmation' | 'ready';

type AnswerOnlyFinalRequest = {
  kind: AnswerOnlyFinalKind;
  content: string;
};

function detectAnswerOnlyFinalRequest(content: string): AnswerOnlyFinalRequest | undefined {
  if (
    hasPattern(content, [
      /준비\s*(?:됐|되었)\s*다고\s*만/i,
      /준비\s*(?:됐|되었)?\s*(?:다고)?\s*만\s*(?:말|답|응답)/i,
      /\b(?:just|only)\s+say\s+(?:ready|done)\b/i,
    ])
  ) {
    return { kind: 'ready', content: '준비됐습니다.' };
  }

  if (
    hasPattern(content, [
      /확인\s*(?:했|됐|되었)\s*다고\s*만/i,
      /확인\s*(?:했|됐|되었)?\s*(?:다고)?\s*만\s*(?:말|답|응답)/i,
      /확인만\s*(?:말|답|응답)/i,
      /\b(?:just|only)\s+say\s+(?:confirmed|checked|ok|okay|yes)\b/i,
    ])
  ) {
    return { kind: 'confirmation', content: '확인했습니다.' };
  }

  return undefined;
}

function assistantContentHasBlocker(content: string) {
  return hasPattern(content, [
    /(?:승인|권한|허가|permission|approval)[^.\n]{0,80}(?:필요|필요합니다|required|denied|거절)/i,
    /(?:실패|오류|에러|불가|차단|거부|failed|error|blocked|cannot|can't)/i,
  ]);
}

function assistantContentHasNegativeAnswer(content: string) {
  return hasPattern(content, [
    /(?:없습니다|없어요|안\s*보|보이지\s*않|남아\s*있지\s*않|준비되지\s*않)/i,
    /\bnot\s+(?:visible|ready|found|available|present|done)\b/i,
    /\b(?:no|none)\s+(?:visible|ready|result|state|output|content)\b/i,
  ]);
}

function assistantContentSupportsAnswerOnlyKind(kind: AnswerOnlyFinalKind, content: string) {
  if (kind === 'ready') {
    return hasPattern(content, [/준비|완료|끝났|ready|done/i]);
  }
  return hasPattern(content, [/확인|보입니다|남아|있습니다|checked|confirmed|visible|present|\byes\b|\bok\b/i]);
}

function answerOnlyFinalContentForUserRequest(userContent: string, assistantContent: string) {
  const request = detectAnswerOnlyFinalRequest(userContent);
  if (!request) return undefined;
  if (assistantContentHasBlocker(assistantContent)) return undefined;
  if (assistantContentHasNegativeAnswer(assistantContent)) return undefined;
  if (!assistantContentSupportsAnswerOnlyKind(request.kind, assistantContent)) return undefined;
  return assistantContent.trim() === request.content ? undefined : request.content;
}

function hasScopedFileMutationRequest(content: string) {
  return hasPattern(content, [
    /(?:수정|변경|편집|쓰기|삭제|생성|패치)\s*하지\s*(?:마|말|않|않도록)[^\n]{0,160}(?:만\s*)?(?:수정|변경|편집|고쳐|고치|패치|작성|저장|업데이트|write|update|edit|modify|fix|patch)/i,
    /(?:do\s+not|don't|dont|never)[^\n]{0,80}(?:modify|change|edit|write|patch|delete|create)[^\n]{0,160}(?:only\s+)?(?:modify|change|edit|write|patch|update|fix)/i,
  ]);
}

function detectUserRequestConstraints(content: string): UserRequestConstraints {
  const readOnly = hasPattern(content, [
    /읽기\s*전용|읽기만|확인만|분석만|조회만/i,
    /\bread[-\s]?only\b|\bonly\s+read\b|\binspect\s+only\b|\banaly[sz]e\s+only\b/i,
  ]);
  const scopedFileMutationRequest = hasScopedFileMutationRequest(content);
  const noFileMutation =
    readOnly ||
    (!scopedFileMutationRequest &&
      hasPattern(content, [
        /(?:파일|코드|앱|프로젝트|workspace|작업공간)?\s*(?:수정|변경|편집|쓰기|삭제|생성|패치)\s*하지\s*(?:마|말|않|않도록)/i,
        /(?:수정|변경|편집|쓰기|삭제|생성|패치)[^.!?\n]{0,40}(?:하지\s*(?:마|말|않)|금지)/i,
        /\bdo\s+not\s+(?:modify|change|edit|write|patch|delete|create)\b/i,
        /\bdon't\s+(?:modify|change|edit|write|patch|delete|create)\b/i,
        /\bwithout\s+(?:modifying|changing|editing|writing|patching|deleting)\b/i,
        /\bno\s+(?:file\s+)?(?:changes|edits|writes|modifications|patches)\b/i,
      ]));
  const commandExecutionAlternativeAllowed = hasPattern(content, [
    /(?:shell|쉘|터미널|terminal|명령어|명령|command)\s*(?:말고|대신)[^.!?\n]{0,80}(?:server|서버)\s*(?:도구|tool)?/i,
    /(?:server|서버)\s*(?:도구|tool)?[^.!?\n]{0,80}(?:로|으로|사용|실행|쓰)[^.!?\n]{0,80}(?:shell|쉘|터미널|terminal|명령어|명령|command)\s*(?:말고|대신)/i,
    /\b(?:use|run|call|start)\s+(?:the\s+)?server\s+tool\s+(?:instead\s+of|rather\s+than)\s+(?:shell|terminal|commands?)\b/i,
    /\b(?:instead\s+of|rather\s+than)\s+(?:shell|terminal|commands?)[^.!?\n]{0,80}(?:use|run|call|start)\s+(?:the\s+)?server\s+tool\b/i,
  ]);
  const noCommandExecution =
    !commandExecutionAlternativeAllowed &&
    hasPattern(content, [
      /(?:shell|쉘|터미널|terminal|명령어|명령|command)\s*(?:을|를|은|는)?\s*(?:쓰지|사용하지|실행하지|호출하지)\s*(?:마|말|않|않도록)?/i,
      /(?:shell|쉘|터미널|terminal|명령어|명령|command)[^.!?\n]{0,40}(?:금지|없이|말고)/i,
      /\bdo\s+not\s+(?:run|execute|use)\s+(?:shell|terminal|commands?|command-line)\b/i,
      /\bdon't\s+(?:run|execute|use)\s+(?:shell|terminal|commands?|command-line)\b/i,
      /\bno\s+(?:shell|terminal|commands?|command-line)\b/i,
      /\bwithout\s+(?:running|executing|using)\s+(?:shell|terminal|commands?)\b/i,
    ]);
  const noBrowser = hasPattern(content, [
    /브라우저\s*(?:를|을|은|는)?\s*(?:열지|띄우지|사용하지|실행하지|호출하지)\s*(?:마|말|않|않도록)?/i,
    /브라우저[^.!?\n]{0,40}(?:금지|없이|말고)/i,
    /\bdo\s+not\s+(?:open|use|run|launch)\s+(?:a\s+)?browser\b/i,
    /\bdon't\s+(?:open|use|run|launch)\s+(?:a\s+)?browser\b/i,
    /\bno\s+browser\b/i,
    /\bwithout\s+(?:opening|using|launching)\s+(?:a\s+)?browser\b/i,
  ]);
  return {
    readOnly,
    noFileMutation,
    noCommandExecution,
    noBrowser,
  };
}

function activeUserConstraintNames(constraints: UserRequestConstraints) {
  const names: string[] = [];
  if (constraints.readOnly) names.push('read_only');
  if (constraints.noFileMutation) names.push('no_file_mutation');
  if (constraints.noCommandExecution) names.push('no_command_execution');
  if (constraints.noBrowser) names.push('no_browser');
  return names;
}

function detectUserToolPreferences(content: string): UserToolPreferences {
  const shellRequiresPriorEvidence = hasPattern(content, [
    /(?:shell|쉘|터미널|terminal|명령어|명령|command)\s*보다[^.!?\n]{0,80}(?:lsp|read|search|code_symbols|읽|검색|확인|분석)[^.!?\n]{0,40}먼저/i,
    /(?:lsp|read|search|code_symbols|읽|검색|확인|분석)[^.!?\n]{0,40}먼저[^.!?\n]{0,80}(?:shell|쉘|터미널|terminal|명령어|명령|command)/i,
    /(?:use|run)\s+(?:lsp|read|search|inspection|evidence)\s+(?:before|prior\s+to)\s+(?:shell|terminal|commands?)/i,
  ]);
  const mutationRequiresPriorEvidence = hasPattern(content, [
    /(?:수정|변경|편집|쓰기|패치|write|edit|patch)[^.!?\n]{0,40}전에[^.!?\n]{0,80}(?:read|search|읽|검색|확인|분석)[^.!?\n]{0,40}먼저/i,
    /(?:read|search|읽|검색|확인|분석)[^.!?\n]{0,40}먼저[^.!?\n]{0,80}(?:수정|변경|편집|쓰기|패치|write|edit|patch)/i,
    /(?:read|search|inspect|analy[sz]e)[^.!?\n]{0,80}(?:before|prior\s+to)[^.!?\n]{0,80}(?:editing|modifying|patching|writing|changing)/i,
    /(?:before|prior\s+to)[^.!?\n]{0,80}(?:editing|modifying|patching|writing|changing)[^.!?\n]{0,80}(?:read|search|inspect|analy[sz]e)/i,
  ]);
  const readinessOnly = hasPattern(content, [
    /브라우저\s*대신\s*app_readiness\s*만/i,
    /app_readiness\s*만[^.!?\n]{0,80}브라우저\s*(?:대신|말고)/i,
    /(?:use\s+)?(?:only\s+)?app_readiness\s+(?:only\s+)?(?:instead\s+of|rather\s+than)\s+(?:browser|app_e2e_check)/i,
    /(?:browser|app_e2e_check)\s+(?:instead\s+use|rather\s+than)\s+app_readiness/i,
  ]);
  const noExternalWeb = hasPattern(content, [
    /외부\s*웹\s*(?:검색|조회|접속|사용)\s*하지\s*(?:마|말|않|않도록)?/i,
    /웹\s*검색\s*하지\s*(?:마|말|않|않도록)?/i,
    /(?:web_search|web_fetch)\s*(?:를|을|은|는)?\s*(?:쓰지|사용하지|호출하지)\s*(?:마|말|않|않도록)?/i,
    /\b(?:do\s+not|don't|dont|no)\s+(?:use\s+)?(?:external\s+)?web\s+(?:search|fetch|access|lookup)\b/i,
    /\bwithout\s+(?:external\s+)?web\s+(?:search|fetch|access|lookup)\b/i,
  ]);
  return {
    shellRequiresPriorEvidence,
    mutationRequiresPriorEvidence,
    readinessOnly,
    noExternalWeb,
  };
}

function activeUserToolPreferenceNames(preferences: UserToolPreferences) {
  const names: string[] = [];
  if (preferences.shellRequiresPriorEvidence) names.push('shell_requires_prior_evidence');
  if (preferences.mutationRequiresPriorEvidence) names.push('mutation_requires_prior_evidence');
  if (preferences.readinessOnly) names.push('app_readiness_only');
  if (preferences.noExternalWeb) names.push('no_external_web');
  return names;
}

interface VerificationFailure {
  message: ToolMessage;
  toolName: VerificationToolName;
  signature: string;
  evidence: string;
  classification: VerificationFailureClassification;
}

type FailedVerificationToolMessage = ToolMessage & { name: VerificationToolName };

type VerificationRecoveryDecision =
  | { kind: 'none' }
  | { kind: 'continue'; failure: VerificationFailure; attempt: number; message: SystemMessage }
  | { kind: 'blocked'; failure: VerificationFailure; attempt: number; content: string };

type AutoVerificationRepairResult =
  | { status: 'not_applicable'; reason: string }
  | { status: 'executed'; failure: VerificationFailure; summaryMessage: SystemMessage; guardRequired?: boolean }
  | { status: 'failed'; failure: VerificationFailure; reason: string }
  | { status: 'skipped'; failure: VerificationFailure; reason: string; allowFinal?: boolean };

interface VerificationRepairGuard {
  failure: VerificationFailure;
  evidenceSatisfied: boolean;
  modified: boolean;
  evidencePaths: Set<string>;
  requiredVerificationSequence: VerificationToolName[];
  completedVerificationSteps: Set<VerificationToolName>;
  repeatedFailureAfterPatch?: VerificationFailure;
}

interface VerificationRepairGuardHint {
  deniedTool: string;
  reason: string;
  nextAction: string;
}

function isVerificationToolName(name: string): name is VerificationToolName {
  return name === 'diagnostics' || name === 'app_e2e_check' || name === 'app_readiness';
}

function isVerificationRepairEvidenceToolName(name: string) {
  return name === 'read' || name === 'search' || name === 'code_symbols' || name === 'lsp' || name === 'context_search';
}

function isVerificationRepairMutationToolName(name: string) {
  return name === 'write' || name === 'patch' || name === 'edit' || name === 'json' || name === 'desk_safe_file_apply';
}

function shellCommandAppearsToModifyFiles(input: unknown) {
  if (typeof input !== 'object' || input === null) return false;
  const command = (input as { command?: unknown }).command;
  if (typeof command !== 'string') return false;
  return /(?:^|[\s;&|])(?:Set-Content|Add-Content|Out-File|New-Item|Remove-Item|Move-Item|Copy-Item|Rename-Item|del|erase|rm|mv|cp|mkdir|rmdir|npm\s+(?:install|i|update)|pnpm\s+(?:install|add|update)|yarn\s+(?:add|install|upgrade))\b|(?:^|[^>])>{1,2}(?!>)/i.test(
    command,
  );
}

function isVerificationRepairMutationToolCall(name: string, input: unknown, isReadOnly: boolean) {
  if (name === 'shell') return shellCommandAppearsToModifyFiles(input);
  return !isReadOnly && isVerificationRepairMutationToolName(name);
}

const fileMutationToolNames = new Set(['write', 'patch', 'edit', 'json', 'desk_safe_file_apply']);
const commandExecutionToolNames = new Set(['shell', 'desk_terminal_run', 'desk_terminal_stop', 'server']);
const browserToolNames = new Set(['browser', 'app_e2e_check']);
const externalWebToolNames = new Set(['web_search', 'web_fetch']);
const evidencePreferenceToolNames = ['lsp', 'read', 'search', 'code_symbols', 'context_search'];
const readOnlySideEffectToolNames = new Set([
  ...fileMutationToolNames,
  ...commandExecutionToolNames,
  ...browserToolNames,
  'todo',
  'memory',
  'agent_task',
  'task_handoff',
]);

function toolCallAppearsToMutateFiles(name: string, input: unknown, isReadOnly: boolean) {
  if (name === 'shell' || name === 'desk_terminal_run') return shellCommandAppearsToModifyFiles(input);
  if (!fileMutationToolNames.has(name)) return false;
  return !isReadOnly;
}

function hasSuccessfulEvidencePreferenceTool(successfulToolNames: ReadonlySet<string> | undefined) {
  if (!successfulToolNames) return false;
  return evidencePreferenceToolNames.some((name) => successfulToolNames.has(name));
}

function failedVerificationPatternFor(toolName: VerificationToolName) {
  if (toolName === 'diagnostics') {
    return /verificationOk:\s*false|repairRequired:\s*true|timedOut:\s*true|failureLikeOutput:\s*true|exitCode:\s*(?:none|[1-9]\d*)/i;
  }
  if (toolName === 'app_e2e_check') {
    return /status:\s*(?:fail|failed)|completionBlocked:\s*true|failures:\s*[1-9]\d*|pageErrors:\s*[1-9]\d*|app_e2e_check\s+failed|net::ERR_|page\.goto|page_error|http_status_error|http_error_page|server_default_page|httpStatus:\s*[45]\d\d|missing_expected_text|forbidden_text|text_below_min|interactive_elements_below_min/i;
  }
  return /status:\s*(?:fail|failed)|completionBlocked:\s*true|ready:\s*false|failures:\s*[1-9]\d*|client_script_syntax_error|smoke_client_contract_mismatch|server_start_failed|port_not_listening|readiness.*(?:failed|timeout)/i;
}

function isFailedVerificationToolMessage(message: AgentMessage): message is FailedVerificationToolMessage {
  if (message.role !== 'tool' || !isVerificationToolName(message.name)) return false;
  return failedVerificationPatternFor(message.name).test(message.content);
}

function isVerificationCleanupToolMessage(message: ToolMessage) {
  if (message.name === 'desk_terminal_stop') return true;
  return message.name === 'server' && /server\s+stopped|stopped:\s|server\s+stop/i.test(message.content);
}

function isVerificationRecoverySupportToolMessage(message: ToolMessage) {
  if (isVerificationCleanupToolMessage(message)) return true;
  if (isVerificationRepairEvidenceToolName(message.name)) return true;
  if (message.name === 'server' && !message.toolCallId.startsWith('auto-server-')) return true;
  return (
    message.name === 'list' ||
    message.name === 'glob' ||
    message.name === 'tree' ||
    message.name === 'file_info' ||
    message.name === 'todo'
  );
}

function verificationFailureEvidence(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const importantLines = lines.filter((line) =>
    /script:|status:|completionBlocked:|verificationOk:|repairRequired:|timedOut:|failureLikeOutput:|exitCode:|failures:|pageErrors:|app_e2e_check\s+failed|net::ERR_|page\.goto|page_error|http_status_error|http_error_page|server_default_page|httpStatus:\s*[45]\d\d|client_script_syntax_error|smoke_client_contract_mismatch|server_start_failed|port_not_listening|missing_expected_text|forbidden_text|text_below_min|interactive_elements_below_min/i.test(
      line,
    ),
  );
  return (importantLines.length > 0 ? importantLines : lines).slice(0, 8).join('\n').slice(0, 1200);
}

function verificationFailureSignature(toolName: VerificationToolName, content: string) {
  return `${toolName}:${verificationFailureEvidence(content).toLowerCase().replace(/\s+/g, ' ').slice(0, 500)}`;
}

function latestFailedVerificationMessage(messages: AgentMessage[]): VerificationFailure | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'user') return undefined;
    if (message.role === 'tool') {
      if (!isVerificationToolName(message.name)) {
        if (isVerificationRecoverySupportToolMessage(message)) continue;
        return undefined;
      }
      if (!isFailedVerificationToolMessage(message)) return undefined;
      const toolName: VerificationToolName = message.name;
      return {
        message,
        toolName,
        signature: verificationFailureSignature(toolName, message.content),
        evidence: verificationFailureEvidence(message.content),
        classification: classifyVerificationFailure({
          toolName,
          content: message.content,
        }),
      };
    }
  }
  return undefined;
}

function findToolCallById(messages: AgentMessage[], toolCallId: string): ToolCall | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'assistant') continue;
    const toolCall = (message.toolCalls ?? []).find((candidate) => candidate.id === toolCallId);
    if (toolCall) return toolCall;
  }
  return undefined;
}

function extractUrlFromVerificationFailure(failure: VerificationFailure, originalToolCall?: ToolCall) {
  const input = originalToolCall?.input;
  if (typeof input === 'object' && input !== null) {
    const url = (input as { url?: unknown }).url;
    if (typeof url === 'string' && url.trim()) return url.trim();
  }

  const match = failure.message.content.match(/https?:\/\/[^\s"'<>]+/i);
  return match?.[0];
}

function isHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function localFilePathFromVerificationUrl(url: string) {
  const trimmed = url.trim();
  if (/^file:/i.test(trimmed)) return fileURLToPath(trimmed);
  if (/^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('\\')) return trimmed;
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed)) return trimmed;
  return undefined;
}

function encodePathForUrl(path: string) {
  return path
    .split('/')
    .filter((part) => part.length > 0)
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function localStaticHttpTarget(workspaceRoot: string, url: string, port: number) {
  if (isHttpUrl(url)) return undefined;
  const localPath = localFilePathFromVerificationUrl(url);
  if (!localPath) return undefined;
  const absolutePath = assertInsideWorkspace(workspaceRoot, localPath);
  const relativePath = relative(resolve(workspaceRoot), absolutePath).replace(/\\/g, '/');
  const urlPath = encodePathForUrl(relativePath || 'index.html');
  return {
    relativePath,
    url: `http://127.0.0.1:${port}/${urlPath}`,
  };
}

function workspaceRelativeLocalEntry(workspaceRoot: string, url: string) {
  if (isHttpUrl(url)) return undefined;
  const localPath = localFilePathFromVerificationUrl(url);
  if (!localPath) return undefined;
  const absolutePath = assertInsideWorkspace(workspaceRoot, localPath);
  const relativePath = relative(resolve(workspaceRoot), absolutePath).replace(/\\/g, '/');
  return relativePath || 'index.html';
}

async function workspaceFileExists(workspaceRoot: string, relativePath: string) {
  try {
    await readFile(assertInsideWorkspace(workspaceRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

function shouldRetryWithWorkspaceIndex(failure: VerificationFailure, causeId: string | undefined) {
  if (causeId !== 'server_not_running') return false;
  return /server_default_page|IIS Windows Server|Apache(?:2)? Default Page|nginx welcome|It works!|http_error_page|http_status_error|httpStatus:\s*[45]\d\d/i.test(
    failure.message.content,
  );
}

async function allocateLocalHttpPort() {
  return await new Promise<number>((resolvePort, rejectPort) => {
    const server = createServer();
    server.once('error', rejectPort);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => rejectPort(new Error('Failed to allocate a local HTTP port.')));
        return;
      }
      const port = address.port;
      server.close(() => resolvePort(port));
    });
  });
}

function nodeEvalCommand(script: string) {
  const node =
    process.platform === 'win32' ? `& ${JSON.stringify(process.execPath)}` : JSON.stringify(process.execPath);
  return `${node} -e ${JSON.stringify(script)}`;
}

function staticHttpServerCommand(port: number) {
  return nodeEvalCommand(
    [
      "const http = require('http');",
      "const fs = require('fs');",
      "const path = require('path');",
      'const root = path.resolve(process.cwd());',
      "const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav'};",
      'http.createServer((req, res) => {',
      "  const parsed = new URL(req.url || '/', 'http://127.0.0.1');",
      '  let requestPath = decodeURIComponent(parsed.pathname);',
      "  if (requestPath === '/' || requestPath.endsWith('/')) requestPath += 'index.html';",
      "  const file = path.resolve(root, requestPath.replace(/^[/\\\\]+/, ''));",
      "  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end('forbidden'); return; }",
      '  fs.stat(file, (statError, stats) => {',
      "    if (statError || !stats.isFile()) { res.writeHead(404); res.end('not found'); return; }",
      "    res.writeHead(200, { 'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });",
      "    fs.createReadStream(file).on('error', () => { res.destroy(); }).pipe(res);",
      '  });',
      `}).listen(${port}, '127.0.0.1', () => console.log('static server ready ${port}'));`,
      'setInterval(() => {}, 1000);',
    ].join(' '),
  );
}

interface AutoRepairLaunchPlan {
  command: string;
  cwd: string;
  readinessUrl: string;
}

function keyValueFields(content: string) {
  const fields = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (!key || !value) continue;
    fields.set(key, value);
  }
  return fields;
}

function parseAutoRepairLaunchPlan(content: string): AutoRepairLaunchPlan | undefined {
  const fields = keyValueFields(content);
  const command = fields.get('command');
  const readinessUrl = fields.get('readinessurl');
  if (!command || !readinessUrl || !isHttpUrl(readinessUrl)) return undefined;
  return {
    command,
    cwd: fields.get('cwd') ?? '.',
    readinessUrl,
  };
}

function appLaunchPlanInputForAutoRepair(
  workspaceRoot: string,
  failedUrl: string,
  causeId: string | undefined,
  shouldUseWorkspaceIndex: boolean,
): { cwd: string; entry: string | null; target: 'browser' } {
  let entry: string | null = null;
  if (shouldUseWorkspaceIndex) {
    entry = 'index.html';
  } else if (causeId === 'local_file_requires_server') {
    entry = workspaceRelativeLocalEntry(workspaceRoot, failedUrl) ?? null;
  }
  return {
    cwd: '.',
    entry,
    target: 'browser',
  };
}

function appE2EInputForAutoRepair(originalToolCall: ToolCall | undefined, url: string) {
  if (originalToolCall?.input && typeof originalToolCall.input === 'object' && !Array.isArray(originalToolCall.input)) {
    return {
      ...originalToolCall.input,
      url,
    };
  }
  return {
    url,
    expectedText: [],
    forbiddenText: ['undefined', 'NaN', '[object Object]'],
    minTextLength: 20,
    minInteractiveElements: 0,
  };
}

function autoRepairSummaryMessage(failure: VerificationFailure, serverName: string): SystemMessage {
  return {
    role: 'system',
    content: [
      'Xenesis auto repair recipe completed.',
      `repairRecipe: ${failure.classification.repairRecipe?.id ?? 'unknown'}`,
      `failureCause: ${failure.classification.primaryCause?.id ?? 'unknown'}`,
      `serverName: ${serverName}`,
      'The failed verification was repaired by running the recipe tools directly.',
      'Use the latest tool results as evidence. Report completion only if the final verification tool result passed.',
    ].join('\n'),
  };
}

function repairCandidateNarrowingPolicy(failure: VerificationFailure) {
  const causeId = failure.classification.primaryCause?.id;
  const common = [
    'Repair candidate narrowing policy:',
    'Before patching, identify one primary candidate file/function from the failure evidence.',
    'Prefer read, search, code_symbols, or lsp before shell. Inspect at most three candidate files before the first patch unless the evidence is ambiguous.',
    'Patch the smallest candidate supported by verification evidence, then rerun the failed verification path.',
  ];

  if (causeId === 'client_runtime_error') {
    return [
      ...common,
      'Candidate source order: explicit path in page_error or client_script_syntax_error evidence -> script src from the HTML entry -> client entry/route/component referenced by the rendered page.',
      'Patch only the directly implicated client runtime defect. Do not hide the error with generic fallback labels or unrelated UI changes.',
    ];
  }

  if (causeId === 'smoke_test_structure') {
    return [
      ...common,
      'Candidate source order: smoke test script -> package script mapping -> server startup/readiness helper -> process cleanup helper.',
      'Patch bounded readiness waits, response consumption, failure exit, and cleanup waits before rerunning diagnostics.',
    ];
  }

  if (causeId === 'verification_timeout') {
    return [
      ...common,
      'Candidate source order: timed-out diagnostics script -> readiness wait loop -> child process cleanup/open handles -> server startup observability.',
      'Do not rerun the same timed-out command until a bounded wait, explicit failure exit, or cleanup candidate has been patched.',
    ];
  }

  if (causeId === 'server_not_running') {
    return [
      ...common,
      'Candidate source order: package start script -> server entry -> readiness port/url config.',
      'Prefer the managed server tool with readinessUrl before patching code. Patch startup code only if the server tool reports a concrete startup failure.',
    ];
  }

  return [
    ...common,
    'Candidate source order: failed verification output -> directly implicated source/config/test file -> nearest entrypoint or contract boundary.',
    'If no concrete candidate is visible after focused inspection, stop and report the missing evidence instead of guessing.',
  ];
}

function autoTriageSummaryMessage(failure: VerificationFailure, toolName: string): SystemMessage {
  return {
    role: 'system',
    content: [
      'Xenesis auto triage recipe completed.',
      `repairRecipe: ${failure.classification.repairRecipe?.id ?? 'unknown'}`,
      `failureCause: ${failure.classification.primaryCause?.id ?? 'unknown'}`,
      `triageTool: ${toolName}`,
      'Additional evidence was collected by running a safe verification tool.',
      ...repairCandidateNarrowingPolicy(failure),
      'Use the latest tool results as repair evidence. Do not report completion until the blocking defect is repaired and final verification passes.',
    ].join('\n'),
  };
}

function verificationToolRepairGuidance(toolName: VerificationToolName) {
  if (toolName === 'diagnostics') {
    return [
      'Inspect the implicated script, server, test, route, readiness wait, open handle, or child process cleanup code.',
      'Patch the concrete defect, read the changed file when it is small, then rerun diagnostics.',
    ];
  }
  if (toolName === 'app_e2e_check') {
    return [
      'Inspect the rendered app path, browser page errors, data binding, fixture/API payload shape, and client script syntax.',
      'Patch the concrete rendered-app defect, then rerun app_readiness or diagnostics if relevant and rerun app_e2e_check before completion.',
    ];
  }
  return [
    'Inspect server startup, readiness URL, client script syntax, smoke/API contract shape, and reported readiness findings.',
    'Patch the concrete readiness defect, then rerun app_readiness and follow with diagnostics or app_e2e_check when the app is browser-facing.',
  ];
}

function verificationRecoveryRequiredMessage(failure: VerificationFailure, attempt: number): SystemMessage {
  return {
    role: 'system',
    content: [
      'Xenesis verification recovery required.',
      `The most recent ${failure.toolName} tool result failed or blocked completion. Do not finalize, summarize next steps, or say you will fix it later.`,
      `Repair attempt ${attempt}/2.`,
      'Failure evidence:',
      failure.evidence,
      'Failure classification:',
      renderVerificationFailureClassification(failure.classification),
      ...repairCandidateNarrowingPolicy(failure),
      ...verificationToolRepairGuidance(failure.toolName),
      'Only report completion after diagnostics succeeds. If the same failure signature repeats after repair, stop with the failed command and evidence.',
    ].join('\n'),
  };
}

function verificationBlockedContent(failure: VerificationFailure) {
  return [
    'Verification repair is blocked because the same verification failure repeated after repair attempts.',
    '',
    `Failed tool: ${failure.toolName}`,
    '',
    'Failure evidence:',
    failure.evidence,
    '',
    'Failure classification:',
    renderVerificationFailureClassification(failure.classification),
    '',
    'I should not claim completion until the failed verification is repaired and rerun successfully.',
  ].join('\n');
}

function contentClaimsVerificationResolved(content: string) {
  return /(?:verification|diagnostics|readiness|e2e|smoke|test|검증|진단|준비|테스트|스모크)[^.!?\n]{0,100}(?:passed|succeeded|successful|green|fixed|repaired|complete|completed|done|통과|성공|수정|복구|해결|완료)|(?:passed|succeeded|successful|fixed|repaired|complete|completed|done|통과|성공|수정|복구|해결|완료)[^.!?\n]{0,100}(?:verification|diagnostics|readiness|e2e|smoke|test|검증|진단|준비|테스트|스모크)/i.test(
    content,
  );
}

function verificationRecoveryDecision(
  userMessage: UserMessage,
  messages: AgentMessage[],
  recoveryCounts: ReadonlyMap<string, number>,
): VerificationRecoveryDecision {
  if (!userRequestedRepairOrVerification(userMessage.content)) return { kind: 'none' };
  const failure = latestFailedVerificationMessage(messages);
  if (!failure) return { kind: 'none' };
  const previousAttempts = recoveryCounts.get(failure.signature) ?? 0;
  if (previousAttempts >= 2) {
    return {
      kind: 'blocked',
      failure,
      attempt: previousAttempts,
      content: verificationBlockedContent(failure),
    };
  }
  const attempt = previousAttempts + 1;
  return {
    kind: 'continue',
    failure,
    attempt,
    message: verificationRecoveryRequiredMessage(failure, attempt),
  };
}

function containsRepositoryRecommendation(content: string) {
  if (/do not recommend repository|remove unrequested repository/i.test(content)) return false;
  return /git\s*(도입|설정|구축|사용)|github|버전\s*관리\s*(도입|설정|구축)|저장소\s*(도입|설정|구축)|repository hosting|version-control setup|version control setup|deployment process/i.test(
    content,
  );
}

function unrequestedRepositoryRecommendationRecoveryMessage(
  userMessage: UserMessage,
  assistantContent: string,
  alreadyUsed: boolean,
): SystemMessage | undefined {
  if (alreadyUsed) return undefined;
  if (userRequestedRepositoryTopic(userMessage.content)) return undefined;
  if (!containsRepositoryRecommendation(assistantContent)) return undefined;
  return {
    role: 'system',
    content: [
      'Remove unrequested repository, version-control, hosting, and deployment process recommendations.',
      'The user did not ask for those topics. Revise the final answer to stay within the requested project analysis or renewal scope.',
      'Do not mention Git, GitHub, repositories, version-control setup, or deployment process changes unless the user explicitly asks.',
    ].join('\n'),
  };
}

function isCompactSummaryMessage(message: AgentMessage): message is SystemMessage {
  return message.role === 'system' && message.content.startsWith('Xenesis compacted session context:');
}

function toolResultCallIds(messages: AgentMessage[]) {
  return new Set(
    messages.filter((message): message is ToolMessage => message.role === 'tool').map((message) => message.toolCallId),
  );
}

function assistantToolCallIds(messages: AgentMessage[]) {
  const ids = new Set<string>();
  for (const message of messages) {
    if (message.role !== 'assistant') continue;
    for (const toolCall of message.toolCalls ?? []) ids.add(toolCall.id);
  }
  return ids;
}

function missingToolCallIds(messages: AgentMessage[]) {
  const resultIds = toolResultCallIds(messages);
  const callIds = assistantToolCallIds(messages);
  return Array.from(resultIds).filter((id) => !callIds.has(id));
}

function findAssistantIndexForToolCalls(messages: AgentMessage[], beforeIndex: number, toolCallIds: string[]) {
  const missing = new Set(toolCallIds);
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'assistant') continue;
    if ((message.toolCalls ?? []).some((toolCall) => missing.has(toolCall.id))) return index;
  }
  return -1;
}

function dropOrphanToolResults(messages: AgentMessage[]) {
  const callIds = assistantToolCallIds(messages);
  return messages.filter((message) => message.role !== 'tool' || callIds.has(message.toolCallId));
}

export function compactMessageParts(historyMessages: AgentMessage[], keepMessages: number) {
  const keepCount = Math.max(0, keepMessages);
  if (keepCount === 0) {
    return {
      keepCount,
      olderMessages: historyMessages,
      recentMessages: [],
    };
  }

  let splitIndex = Math.max(0, historyMessages.length - keepCount);
  while (splitIndex > 0) {
    const missingIds = missingToolCallIds(historyMessages.slice(splitIndex));
    if (missingIds.length === 0) break;
    const assistantIndex = findAssistantIndexForToolCalls(historyMessages, splitIndex, missingIds);
    if (assistantIndex === -1) break;
    splitIndex = assistantIndex;
  }

  return {
    keepCount,
    olderMessages: historyMessages.slice(0, splitIndex),
    recentMessages: dropOrphanToolResults(historyMessages.slice(splitIndex)),
  };
}

export function compactedHistoryMessages(
  historyMessages: AgentMessage[],
  compactAfterMessages: number,
  keepMessages: number,
) {
  if (historyMessages.length <= compactAfterMessages) {
    return historyMessages.map((message) => ({ ...message }));
  }

  const { keepCount, olderMessages, recentMessages } = compactMessageParts(historyMessages, keepMessages);
  return [compactHistoryMessages(olderMessages, keepCount), ...recentMessages.map((message) => ({ ...message }))];
}

function toolRunOutcome(
  toolCall: ToolCall,
  ok: boolean,
  content: string,
  maxToolResultChars: number,
  inputPath?: string,
  isReadOnly?: boolean,
  isMutation?: boolean,
): ToolRunOutcome {
  const recordedMessage = toolResultMessage(toolCall, content);
  const wrapped = wrapModelVisibleToolResult(
    toolCall,
    truncateToolContent(content, maxToolResultChars),
    isReadOnly,
    isMutation,
  );
  const modelMessage = toolResultMessage(toolCall, wrapped.content);
  const warnings = userFacingExternalContentWarnings(wrapped);
  return {
    ok,
    recordedMessage,
    modelMessage,
    ...(warnings.length > 0 ? { externalContentWarnings: warnings } : {}),
    ...(inputPath ? { inputPath } : {}),
    ...(isReadOnly !== undefined ? { isReadOnly } : {}),
    ...(isMutation !== undefined ? { isMutation } : {}),
  };
}

function sanitizeFileSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 80) || 'tool';
}

function storedToolResultContent(input: { toolCall: ToolCall; path: string; originalChars: number; preview: string }) {
  return [
    '[tool result stored]',
    `tool: ${input.toolCall.name}`,
    `toolCallId: ${input.toolCall.id}`,
    `originalChars: ${input.originalChars}`,
    `path: ${input.path}`,
    'The full output was stored outside model context. Read the referenced file if full detail is required.',
    '',
    'Preview:',
    input.preview,
  ].join('\n');
}

function toolInputPath(input: unknown) {
  if (typeof input !== 'object' || input === null) return undefined;
  const path = (input as { path?: unknown }).path;
  return typeof path === 'string' && path.length > 0 ? path : undefined;
}

const currentInfoToolRecoveryNames = new Set([
  'weather_current',
  'weather_forecast',
  'market_quote',
  'sports_scores',
  'news_latest',
]);

function isExternalWorkspaceOrSessionAccessBlock(content: string) {
  return /(?:outside\s+(?:the\s+)?workspace|cwd\s+is\s+outside\s+(?:the\s+)?workspace|writes\s+outside\s+(?:the\s+)?workspace|CreateProcessAsUserW\s+failed:\s*1312)/i.test(
    content,
  );
}

function externalWorkspaceAccessNextAction(recoveryTools: string[]) {
  const toolGuidance =
    recoveryTools.length > 0
      ? [
          `Use one of these available recovery tools before finalizing: ${recoveryTools.join(', ')}.`,
          'Inspect the workspace capability with desk_capabilities, then call xd.services.xenesis.setWorkspace or xd.xenesis.workspace.set without approved=true so Desk can create a real approval request.',
          'Do not synthesize chat-only approval text. A valid approval request must come from the CR/MCP capability call result so the Agent pane can render inline approval controls.',
        ]
      : [
          'No CR/MCP workspace recovery tool is available in this run, so report that concrete blocker instead of inventing an approval request.',
        ];
  return [
    'The requested path or command is blocked by the current workspace/session boundary.',
    'Do not answer as complete and do not merely report that the path cannot be opened.',
    ...toolGuidance,
  ].join(' ');
}

function toolFailureNextAction(toolName: string, content: string, recoveryTools: string[] = []) {
  if (isExternalWorkspaceOrSessionAccessBlock(content)) {
    return externalWorkspaceAccessNextAction(recoveryTools);
  }
  if (currentInfoToolRecoveryNames.has(toolName) && recoveryTools.length > 0) {
    return [
      `The ${toolName} lookup failed or returned no useful current result.`,
      `Use one of these available recovery tools before finalizing: ${recoveryTools.join(', ')}.`,
      'Adjust the query or fetch a relevant source, then answer from the recovered evidence.',
    ].join(' ');
  }
  if (toolName === 'browser' && /(?:Only\s+HTTP\(S\)\s+URLs\s+are\s+allowed|file:\/\/|local\s+file)/i.test(content)) {
    return [
      'Local file browser URLs require an HTTP server.',
      'Do not ask the user to open the file manually.',
      'Start a local static server for the workspace or use server/app_e2e_check against an http:// URL, then rerun browser verification.',
    ].join(' ');
  }
  if (
    toolName === 'patch' &&
    /(?:text\s+not\s+found|replacement\s+text\s+did\s+not\s+match|no\s+changes\s+were\s+applied|patch\s+not\s+applied)/i.test(
      content,
    )
  ) {
    return [
      'Patch failed because the replacement text did not match the current file contents.',
      'Do not ask the user to proceed.',
      'Read the target file again, then retry patch with an exact current snippet or use write when replacing the whole small file is safer.',
    ].join(' ');
  }
  return 'Inspect the tool result and retry only with corrected input or choose another tool.';
}

function permissionDeniedNextAction(reason: string, recoveryTools: string[] = []) {
  if (isExternalWorkspaceOrSessionAccessBlock(reason)) {
    return externalWorkspaceAccessNextAction(recoveryTools);
  }
  return 'Do not retry the denied tool. Use an allowed read-only tool, request user approval, or explain the limitation.';
}

async function readWorkspaceTextSnapshot(workspaceRoot: string, path: string) {
  const absolutePath = assertInsideWorkspace(workspaceRoot, path);
  try {
    return await readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'EISDIR')) {
      return undefined;
    }
    throw error;
  }
}

export class AgentRunner {
  private readonly provider: AgentProvider;
  private readonly providers: AgentProvider[];
  private readonly providerSupportsTools: boolean[];
  private readonly providerModels: string[];
  private readonly model: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly skillPaths: string[];
  private workspaceRoot: string;
  private readonly xenesisHome: string;
  private cwd: string;
  private readonly sessionId: string;
  private readonly approvalMode: ApprovalMode;
  private readonly maxTurns: number;
  private readonly maxTokensBudget?: number;
  private readonly tools: Tool[];
  private readonly toolMap: Map<string, Tool>;
  private readonly sessionWriter?: SessionWriter;
  private readonly logger: ToolLogger;
  private readonly approvalHandler?: ApprovalHandler;
  private readonly systemMessages: SystemMessage[];
  private readonly historyMessages: AgentMessage[];
  private readonly permissions: PermissionsConfig;
  private readonly maxToolRetries: number;
  private readonly maxArgsCorrectionRetries: number;
  private readonly maxToolResultChars: number;
  private readonly compactHistoryAfterMessages: number;
  private readonly compactHistoryKeepMessages: number;
  private readonly autoCompact: boolean;
  private readonly pruneOlderEnabled: boolean;
  private readonly pruneToolResultThreshold: number;
  private readonly stripOldImagesEnabled: boolean;
  private readonly compactTokenThresholdRatio: number;
  private readonly llmSummarize?: (older: AgentMessage[], previousSummary?: string) => Promise<string>;
  private previousCompactSummary?: string;
  private readonly stream: boolean;
  private readonly abortSignal?: AbortSignal;
  private readonly providerMaxRetries: number;
  private readonly providerRetryDelayMs: number;
  private readonly streamIdleMs: number;
  private readonly providerQueryConfig: ProviderQueryConfig;
  private readonly hooks?: HookEmitter;
  private readonly hookRegistry?: HookRegistry;
  private readonly maxStopHookContinuations: number;
  private stopHookContinuationCount = 0;
  private readonly toolExecutionPolicy?: ToolExecutionPolicy;
  private readonly recordLifecycle: boolean;
  private toolPolicyRecoveryHints: ToolPolicyRecoveryHint[] = [];
  private toolRecoveryHints: ToolRecoveryHint[] = [];
  private argsCorrectionRetryCounts: Map<string, number> = new Map();
  private toolResultGuidanceHints: ToolResultGuidanceHint[] = [];
  private toolLoopGuardrail: ToolLoopGuardrailState = createToolLoopGuardrailState();
  private verificationRepairGuard?: VerificationRepairGuard;
  private verificationRepairGuardHint?: VerificationRepairGuardHint;
  private userForbiddenTools: Set<string> = new Set();
  private userRequestConstraints: UserRequestConstraints = noUserRequestConstraints;
  private userToolPreferences: UserToolPreferences = noUserToolPreferences;
  private promptToolPriority?: ToolPriorityHint;
  private messageSeq = 0;
  private readonly resumeState?: ResumableRunState;
  private readonly resuming: boolean;
  // S6 — durable HITL gate state.
  private alwaysAllowedTools: Set<string>;
  private injectedApprovalDecision?: ApprovalDecision;
  private readonly approvalTimeoutMs: number;
  private readonly approvalTimeoutBehavior: 'allow' | 'deny';
  // S6 — latest per-turn snapshot input (loop locals), captured at the turn
  // boundary so the durable mid-gate approval snapshot can be built with the
  // current run state PLUS the pendingApproval, without threading the loop
  // locals through every tool generator.
  private currentRunSnapshotInput?: RunSnapshotInput;
  // I3 — execution backend seam (default LOCAL_BACKEND).
  private readonly executionBackend: ExecutionBackend;
  private readonly turnLedger?: XenesisTurnLedger;
  private currentTurnLedgerId?: string;
  private turnLedgerToolEvidence = new Map<
    string,
    {
      isCr: boolean;
      isMcp: boolean;
      isCrReadbackTool: boolean;
      crKind?: 'call' | 'capabilities' | 'capability';
      path?: string;
    }
  >();

  constructor(options: AgentRunnerOptions) {
    this.provider = options.provider;
    this.providers = [options.provider, ...(options.fallbackProviders ?? [])];
    this.providerSupportsTools = [
      options.supportsTools ?? true,
      ...this.providers.slice(1).map((_, index) => options.fallbackSupportsTools?.[index] ?? true),
    ];
    this.model = options.model;
    this.providerModels = this.providers.map((provider) => provider.model ?? options.model);
    this.env = options.env ?? process.env;
    this.skillPaths = options.skillPaths ?? [];
    this.workspaceRoot = options.workspaceRoot;
    this.xenesisHome = options.xenesisHome ?? resolve(options.workspaceRoot, '.xenesis');
    this.cwd = options.cwd ?? options.workspaceRoot;
    this.sessionId = options.sessionId ?? crypto.randomUUID();
    this.approvalMode = options.approvalMode ?? 'safe';
    this.maxTurns = options.maxTurns ?? 8;
    this.maxTokensBudget = options.maxTokensBudget;
    this.tools = toolArray(options.tools);
    this.toolMap = new Map(this.tools.map((tool) => [tool.name, tool]));
    this.sessionWriter = options.sessionWriter;
    this.logger = options.logger ?? defaultLogger;
    this.approvalHandler = options.approvalHandler;
    this.systemMessages = options.systemMessages ?? [];
    this.historyMessages = options.historyMessages ?? [];
    this.permissions = {
      blockedTools: options.permissions?.blockedTools ?? options.blockedTools ?? [],
      toolPolicies: options.permissions?.toolPolicies ?? {},
      pathRules: options.permissions?.pathRules ?? [],
    };
    this.maxToolRetries = options.maxToolRetries ?? 1;
    this.maxArgsCorrectionRetries = options.maxArgsCorrectionRetries ?? 1;
    this.maxToolResultChars = options.maxToolResultChars ?? 100000;
    this.compactHistoryAfterMessages = options.compactHistoryAfterMessages ?? 24;
    this.compactHistoryKeepMessages = options.compactHistoryKeepMessages ?? 8;
    this.autoCompact = options.autoCompact ?? true;
    this.pruneOlderEnabled = options.pruneOlderEnabled ?? true;
    this.pruneToolResultThreshold = options.pruneToolResultThreshold ?? 2000;
    this.stripOldImagesEnabled = options.stripOldImagesEnabled ?? true;
    this.compactTokenThresholdRatio = options.compactTokenThresholdRatio ?? 0.8;
    this.llmSummarize = options.llmSummarize;
    this.stream = options.stream ?? false;
    this.abortSignal = options.abortSignal;
    this.providerMaxRetries = options.providerMaxRetries ?? 0;
    this.providerRetryDelayMs = options.providerRetryDelayMs ?? 0;
    this.streamIdleMs = resolveStreamIdleMs(this.env);
    this.providerQueryConfig = buildProviderQueryConfig({
      sessionId: this.sessionId,
      model: this.model,
      providers: this.providers,
      providerMaxRetries: this.providerMaxRetries,
      maxTokensBudget: this.maxTokensBudget,
      stream: this.stream,
      env: this.env,
    });
    this.hooks = options.hooks;
    this.hookRegistry = options.hookRegistry;
    this.maxStopHookContinuations = options.maxStopHookContinuations ?? 3;
    this.toolExecutionPolicy = options.toolExecutionPolicy;
    this.recordLifecycle = options.recordLifecycle ?? false;
    this.resumeState = options.resumeState;
    // Resuming whenever a snapshot is restored OR the caller flags a message-only
    // (degrade) resume. Either way the user message already lives in history.
    this.resuming = options.resuming ?? Boolean(options.resumeState);
    // S6 — durable HITL gate. Restore always-allowed tools from the explicit
    // option first, else from the resume snapshot (Task 6 wires this through).
    this.alwaysAllowedTools = new Set(options.alwaysAllowedTools ?? options.resumeState?.alwaysAllowedTools ?? []);
    this.injectedApprovalDecision = options.injectedApprovalDecision;
    this.approvalTimeoutMs = options.approvalTimeoutMs ?? 300000;
    this.approvalTimeoutBehavior = options.approvalTimeoutBehavior ?? 'deny';
    this.executionBackend = options.executionBackend ?? LOCAL_BACKEND;
    this.turnLedger = options.turnLedger;
  }

  async dispose(): Promise<void> {
    const seen = new Set<AgentProvider>();
    const errors: unknown[] = [];
    for (const provider of this.providers) {
      if (seen.has(provider)) continue;
      seen.add(provider);
      const disposable = provider as AgentProvider & {
        dispose?: () => void | Promise<void>;
        close?: () => void | Promise<void>;
      };
      try {
        if (typeof disposable.dispose === 'function') {
          await disposable.dispose();
        } else if (typeof disposable.close === 'function') {
          await disposable.close();
        }
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      const first = errors[0];
      throw first instanceof Error ? first : new Error(String(first));
    }
  }

  async *run(input: string | UserMessage): AsyncGenerator<AgentRunEvent, AgentRunResult, void> {
    this.toolPolicyRecoveryHints = [];
    this.toolRecoveryHints = [];
    this.argsCorrectionRetryCounts = new Map();
    this.toolResultGuidanceHints = [];
    this.toolLoopGuardrail = createToolLoopGuardrailState();
    this.turnLedgerToolEvidence = new Map();
    this.verificationRepairGuard = undefined;
    this.verificationRepairGuardHint = undefined;
    this.userForbiddenTools = new Set();
    this.userRequestConstraints = noUserRequestConstraints;
    this.userToolPreferences = noUserToolPreferences;
    this.promptToolPriority = undefined;
    // S7 — seed-state resume. Restore the instance-level run state from the
    // snapshot when resuming, otherwise zero-initialize as for a fresh run.
    // (The user-derived state above is intentionally re-derived from the
    // recovered user message, not restored.)
    if (this.resumeState) {
      this.stopHookContinuationCount = this.resumeState.stopHookContinuationCount;
      this.previousCompactSummary = this.resumeState.previousCompactSummary;
      this.messageSeq = this.resumeState.messageSeq;
    } else {
      this.stopHookContinuationCount = 0;
    }
    const messages: AgentMessage[] = [
      ...this.systemMessages.map((message) => ({ ...message })),
      ...(this.autoCompact
        ? compactedHistoryMessages(
            this.historyMessages,
            this.compactHistoryAfterMessages,
            this.compactHistoryKeepMessages,
          )
        : this.historyMessages.map((message) => ({ ...message }))),
    ];
    const todos: TodoItem[] = [];
    // S7 — seed the usage accumulator from the snapshot on resume so the
    // restored run continues against the same token budget; otherwise start at 0.
    const usage: AgentRunUsage = this.resumeState
      ? {
          inputTokens: this.resumeState.usage.inputTokens,
          outputTokens: this.resumeState.usage.outputTokens,
          totalTokens: this.resumeState.usage.totalTokens,
        }
      : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const rawUserMessage: UserMessage = typeof input === 'string' ? { role: 'user', content: input } : input;
    // On resume the triggering user message is already the last turn in
    // `historyMessages`; it is NOT recorded again and must NOT consume a fresh
    // messageSeq id (the restored messageSeq belongs to the next NEW message).
    const userMessage: UserMessage = this.resuming
      ? { ...rawUserMessage }
      : { ...rawUserMessage, id: `${this.sessionId}:m${this.messageSeq++}` };
    this.startTurnLedger(userMessage);
    this.userForbiddenTools = extractUserForbiddenTools(userMessage.content, this.toolMap.keys());
    this.userRequestConstraints = detectUserRequestConstraints(userMessage.content);
    this.userToolPreferences = detectUserToolPreferences(userMessage.content);
    this.promptToolPriority = promptToolPriorityHint(userMessage.content);

    // Seed-state resume (turn-boundary): the user message is already in the
    // rehydrated history, so do NOT re-append it or re-record it. This holds for
    // BOTH the snapshot path (`resumeState` present) and the message-only degrade
    // path (no snapshot, but still a resume), hence the gate is on `resuming`,
    // not `resumeState`. Constraint derivation above still runs on the recovered
    // user message.
    if (!this.resuming) {
      messages.push(userMessage);
      yield await this.record({ type: 'user_message', message: userMessage });
    }
    const policySnapshot = await this.recordToolPolicySnapshot();
    if (policySnapshot) yield policySnapshot;
    await this.checkpoint({
      status: 'started',
      phase: 'planning',
      turns: 0,
      summary: 'run started',
    });
    await this.emitHook('run_started', {
      input: userMessage.content,
      messageCount: messages.length,
    });

    // S7 — seed-state resume. When `resumeState` is present, initialize the
    // run-loop locals FROM the snapshot (counters, sets, maps, ratios) instead
    // of the zero defaults, so the resumed run continues mid-budget. Past events
    // are NOT replayed.
    const resume = this.resumeState;
    let turns = resume ? resume.turns : 0;
    let lastAssistant: AssistantMessage | undefined;
    const successfulToolNames = new Set<string>(resume?.successfulToolNames ?? []);
    const attemptedToolNames = new Set<string>(resume?.attemptedToolNames ?? []);
    let successfulEvidenceToolCount = resume ? resume.successfulEvidenceToolCount : 0;
    const successfulEvidencePaths = new Set<string>(resume?.successfulEvidencePaths ?? []);
    let projectAnalysisEvidenceRecoveryCount = resume ? resume.recovery.projectAnalysisEvidenceRecoveryCount : 0;
    let repositoryRecommendationRecoveryUsed = resume ? resume.recovery.repositoryRecommendationRecoveryUsed : false;
    let falseUnavailableToolRecoveryUsed = resume ? resume.recovery.falseUnavailableToolRecoveryUsed : false;
    let explicitToolCompletionRecoveryCount = resume ? resume.recovery.explicitToolCompletionRecoveryCount : 0;
    let fileMutationRequiredRecoveryCount = resume ? resume.recovery.fileMutationRequiredRecoveryCount : 0;
    let maxOutputTokensRecoveryCount = resume ? resume.recovery.maxOutputTokensRecoveryCount : 0;
    let mutationSinceLastRead = resume ? resume.mutationSinceLastRead : false;
    let successfulMutationCount = resume ? resume.successfulMutationCount : 0;
    const verificationRecoveryCounts = new Map<string, number>(resume?.verificationRecoveryCounts ?? []);
    const autoVerificationRepairSignatures = new Set<string>(resume?.autoVerificationRepairSignatures ?? []);
    let toolRecoveryFinalizationRecoveryCount = resume ? resume.recovery.toolRecoveryFinalizationRecoveryCount : 0;
    const verificationRepairTurnExtension = Math.max(4, Math.min(8, Math.ceil(this.maxTurns / 2)));
    let verificationRepairExtensionActive = resume ? resume.verificationRepairExtensionActive : false;
    let verificationRepairExtensionRecorded = false;
    const currentTurnLimit = () =>
      this.maxTurns + (verificationRepairExtensionActive ? verificationRepairTurnExtension : 0);
    let activeModel = this.model;
    let activeAllowedTools: Set<string> | undefined;
    let activeEffort: string | undefined;
    let lastResponseInputTokens = 0;
    const recentCompactionSavedRatios: number[] = resume ? [...resume.recentCompactionSavedRatios] : [];
    const applyToolContextUpdates = (updates: ToolContextUpdates | undefined) => {
      if (!updates) return;
      if (updates.model) activeModel = updates.model;
      if (updates.allowedTools) activeAllowedTools = new Set(updates.allowedTools);
      if (updates.effort) activeEffort = updates.effort;
    };

    const observeExplicitToolProgress = (toolResult: ToolRunOutcome) => {
      const toolName = toolResult.recordedMessage.name;
      attemptedToolNames.add(toolName);
      if (!toolResult.ok && isVerificationToolName(toolName) && successfulMutationCount > 0) {
        verificationRepairExtensionActive = true;
      }
      if (!toolResult.ok) return;
      if (toolResult.isMutation || toolName === 'read' || isVerificationToolName(toolName)) {
        explicitToolCompletionRecoveryCount = 0;
      }
      if (toolResult.recordedMessage.name === 'read') {
        mutationSinceLastRead = false;
        return;
      }
      if (toolResult.isMutation) {
        mutationSinceLastRead = true;
        successfulMutationCount += 1;
        fileMutationRequiredRecoveryCount = 0;
      }
    };

    // S6 — durable HITL resume: apply a pending approval BEFORE the normal loop.
    // On resume the historical assistant tool_call is in `historyMessages` but the
    // provider must NOT re-emit it; the runner applies the injected human decision
    // directly to the exact stored call — exactly once — pairing the dangling
    // tool_call and writing `approval_resolved`. The next provider turn then sees
    // a complete exchange. Idempotency: skip if the call is already paired (a prior
    // resume resolved it) — the pipeline also gates via `hasApprovalResolved`.
    const pendingApproval = this.resumeState?.pendingApproval;
    const injectedForPending = this.injectedApprovalDecision;
    if (
      pendingApproval &&
      injectedForPending &&
      injectedForPending.toolCallId === pendingApproval.toolCallId &&
      !messages.some((m) => m.role === 'tool' && m.toolCallId === pendingApproval.toolCallId)
    ) {
      this.injectedApprovalDecision = undefined; // consume once
      const pendingToolCall: ToolCall = {
        id: pendingApproval.toolCallId,
        name: pendingApproval.toolName,
        input: pendingApproval.toolInput,
      };
      const resolvedAt = new Date().toISOString();
      yield await this.record({
        type: 'approval_resolved',
        toolCallId: pendingToolCall.id,
        approvalId: pendingApproval.approvalId,
        approved: injectedForPending.approved,
        decision: injectedForPending.decision,
        resolvedAt,
      });
      this.markTurnLedgerApprovalResolved({
        approvalId: pendingApproval.approvalId,
        approved: injectedForPending.approved,
        decision: injectedForPending.decision,
        resolvedAt,
        name: pendingToolCall.name,
        toolInput: pendingToolCall.input,
        summary: pendingApproval.summary,
      });
      let resumeOutcome: ToolRunOutcome;
      if (injectedForPending.approved) {
        // approve / always-allow → execute the exact stored call exactly once.
        // Mark the tool always-allowed so the in-loop gate short-circuits silently
        // (no second permission_request / approval_resolved); always-allow keeps it
        // in the set, a one-shot approve removes it again afterwards.
        const wasAlwaysAllowed = this.alwaysAllowedTools.has(pendingToolCall.name);
        this.alwaysAllowedTools.add(pendingToolCall.name);
        try {
          this.recordTurnLedgerToolCall(pendingToolCall);
          resumeOutcome = yield* this.runToolCall(pendingToolCall, todos, turns, usage, successfulToolNames);
        } finally {
          if (injectedForPending.decision !== 'always-allow' && !wasAlwaysAllowed) {
            this.alwaysAllowedTools.delete(pendingToolCall.name);
          }
        }
      } else {
        // deny / timeout → a deny tool_result; the tool is NOT executed.
        resumeOutcome = await this.createObservedToolRunOutcome(
          pendingToolCall,
          false,
          `Permission denied for tool "${pendingToolCall.name}": ${pendingApproval.reason}`,
        );
      }
      yield* this.finishToolCall(resumeOutcome, messages, turns, successfulToolNames);
      observeExplicitToolProgress(resumeOutcome);
      if (resumeOutcome.ok && isProjectEvidenceToolName(resumeOutcome.recordedMessage.name)) {
        successfulEvidenceToolCount += 1;
        if (resumeOutcome.inputPath) successfulEvidencePaths.add(resumeOutcome.inputPath.replace(/\\/g, '/'));
      }
    }

    while (turns < currentTurnLimit()) {
      if (turns > 0) {
        const compactEvent = await this.compactActiveMessages(
          messages,
          activeModel,
          lastResponseInputTokens,
          recentCompactionSavedRatios,
        );
        if (compactEvent) {
          lastResponseInputTokens = 0;
          yield await this.record(compactEvent);
          await this.emitHook('context_compact', {
            originalMessages: compactEvent.originalMessages,
            compactedMessages: compactEvent.compactedMessages,
            keptMessages: compactEvent.keptMessages,
          });
        }
      }
      if (verificationRepairExtensionActive && !verificationRepairExtensionRecorded && turns >= this.maxTurns) {
        verificationRepairExtensionRecorded = true;
        yield await this.record({
          type: 'run_state',
          status: 'provider_request',
          phase: 'executing',
          turns,
          summary: `extending run by up to ${verificationRepairTurnExtension} turns for verification repair`,
        });
      }

      if (this.isAborted()) {
        await this.recordIncompleteRun('cancelled', turns, 'run cancelled', usage);
        yield await this.record({ type: 'stopped', reason: 'cancelled', turns, usage: usageSnapshot(usage) });
        await this.checkpoint({
          status: 'cancelled',
          phase: 'terminal',
          turns,
          summary: 'run cancelled',
          reason: 'cancelled',
        });
        await this.emitHook('run_cancelled', { turns });
        await this.cleanupToolSessions();
        this.stopTurnLedger('cancelled', 'run cancelled');
        return {
          status: 'stopped',
          reason: 'cancelled',
          content: lastAssistant?.content ?? '',
          messages,
          turns,
          usage,
        };
      }

      if (this.maxTokensBudget !== undefined && usage.totalTokens >= this.maxTokensBudget) {
        await this.recordIncompleteRun('budget', turns, 'run stopped: budget', usage);
        yield await this.record({ type: 'stopped', reason: 'budget', turns, usage: usageSnapshot(usage) });
        await this.checkpoint({
          status: 'stopped',
          phase: 'terminal',
          turns,
          summary: 'run stopped: budget',
          reason: 'budget',
        });
        await this.cleanupToolSessions();
        this.stopTurnLedger('blocked', 'run stopped: budget');
        return {
          status: 'stopped',
          reason: 'budget',
          content: lastAssistant?.content ?? '',
          messages,
          turns,
          usage,
        };
      }

      turns += 1;
      // S7 — always-on per-turn run_snapshot at the turn boundary (seed-state
      // resume). Persisted to JSONL via record() but NOT yielded, so it never
      // reaches the public pipeline event stream (like assistant_delta). This is
      // independent of recordLifecycle.
      // S6 — capture the snapshot INPUT (loop locals) into an instance field so
      // the durable mid-gate approval snapshot can be built with the same state
      // PLUS the pendingApproval, without threading these locals through the
      // tool generators. `alwaysAllowedTools` is carried so resume restores it.
      const turnSnapshotInput: RunSnapshotInput = {
        turns,
        usage,
        projectAnalysisEvidenceRecoveryCount,
        explicitToolCompletionRecoveryCount,
        fileMutationRequiredRecoveryCount,
        maxOutputTokensRecoveryCount,
        toolRecoveryFinalizationRecoveryCount,
        repositoryRecommendationRecoveryUsed,
        falseUnavailableToolRecoveryUsed,
        successfulToolNames,
        attemptedToolNames,
        successfulEvidencePaths,
        successfulEvidenceToolCount,
        successfulMutationCount,
        mutationSinceLastRead,
        verificationRecoveryCounts,
        autoVerificationRepairSignatures,
        verificationRepairExtensionActive,
        recentCompactionSavedRatios,
        previousCompactSummary: this.previousCompactSummary,
        stopHookContinuationCount: this.stopHookContinuationCount,
        messageSeq: this.messageSeq,
        alwaysAllowedTools: this.alwaysAllowedTools,
      };
      this.currentRunSnapshotInput = turnSnapshotInput;
      await this.record({
        type: 'run_snapshot',
        state: buildRunSnapshot(turnSnapshotInput),
      });
      let response: ProviderResponse | undefined;
      let recoveredContextLimit = false;
      while (!response) {
        try {
          await this.checkpoint({
            status: 'provider_request',
            phase: 'executing',
            turns,
            summary: 'requesting provider response',
          });
          this.markTurnLedgerRunning();
          response = yield* this.completeProvider({
            model: activeModel,
            messages: this.messagesForProvider(messages, activeEffort),
            tools: this.toolsForProvider(activeAllowedTools),
            signal: this.abortSignal,
            queryConfig: this.providerQueryConfigForModel(activeModel),
          });
        } catch (error) {
          if (this.isCancellation(error)) {
            await this.recordIncompleteRun('cancelled', turns - 1, 'run cancelled', usage);
            yield await this.record({
              type: 'stopped',
              reason: 'cancelled',
              turns: turns - 1,
              usage: usageSnapshot(usage),
            });
            await this.checkpoint({
              status: 'cancelled',
              phase: 'terminal',
              turns: turns - 1,
              summary: 'run cancelled',
              reason: 'cancelled',
            });
            await this.emitHook('run_cancelled', { turns: turns - 1 });
            await this.cleanupToolSessions();
            this.stopTurnLedger('cancelled', 'run cancelled');
            return {
              status: 'stopped',
              reason: 'cancelled',
              content: lastAssistant?.content ?? '',
              messages,
              turns: turns - 1,
              usage,
            };
          }

          const compactEvent =
            !recoveredContextLimit && isContextLimitError(error)
              ? await this.forceCompactActiveMessages(messages, recentCompactionSavedRatios)
              : undefined;
          if (compactEvent) {
            recoveredContextLimit = true;
            const recoveryEvent = {
              type: 'context_recovery',
              reason: 'provider_context_limit',
              message: errorMessage(error),
              originalMessages: compactEvent.originalMessages,
              compactedMessages: compactEvent.compactedMessages,
            } as const;
            yield await this.record(recoveryEvent);
            yield await this.record(compactEvent);
            await this.emitHook('context_recovery', {
              reason: recoveryEvent.reason,
              message: recoveryEvent.message,
              originalMessages: recoveryEvent.originalMessages,
              compactedMessages: recoveryEvent.compactedMessages,
            });
            await this.emitHook('context_compact', {
              originalMessages: compactEvent.originalMessages,
              compactedMessages: compactEvent.compactedMessages,
              keptMessages: compactEvent.keptMessages,
            });
            continue;
          }

          const providerFailure = classifyProviderFailure(error);
          if (providerFailure.kind === 'max_output_tokens' && maxOutputTokensRecoveryCount < 3) {
            maxOutputTokensRecoveryCount += 1;
            messages.push({
              role: 'user',
              content:
                'Output token limit hit. Resume directly; do not apologize, recap, or restart. ' +
                'Continue from the interrupted point and break remaining work into smaller pieces.',
            });
            yield await this.record({
              type: 'run_state',
              status: 'provider_request',
              phase: 'executing',
              turns,
              summary: 'recovering from max_output_tokens',
            });
            continue;
          }

          await this.checkpoint({
            status: 'failed',
            phase: 'terminal',
            turns,
            summary: 'run failed',
            error: errorMessage(error),
          });
          this.failTurnLedger(error);
          await this.cleanupToolSessions();
          throw error;
        }
      }

      if (response.usage) {
        usage.inputTokens += response.usage.inputTokens ?? 0;
        usage.outputTokens += response.usage.outputTokens ?? 0;
        usage.totalTokens = usage.inputTokens + usage.outputTokens;
        lastResponseInputTokens = response.usage.inputTokens ?? 0;
      } else {
        lastResponseInputTokens = 0;
      }

      let assistantMessage = { ...response.message, id: `${this.sessionId}:m${this.messageSeq++}` };
      maxOutputTokensRecoveryCount = 0;
      lastAssistant = assistantMessage;
      messages.push(assistantMessage);
      this.recordTurnLedgerProviderCliMcpTranscript(assistantMessage);
      const toolCalls = assistantMessage.toolCalls ?? [];
      if (toolCalls.length === 0) {
        // A provider refusal / content-filter stop is final: surface the model's own
        // content as the answer and terminate the run rather than running it through the
        // recovery/verification gates (which would otherwise try to "repair" a refusal).
        if (response.stopReason === 'refusal' || response.stopReason === 'content_filter') {
          yield await this.record({ type: 'assistant_message', message: assistantMessage });
          yield await this.record({
            type: 'done',
            content: assistantMessage.content,
            turns,
            usage: usageSnapshot(usage),
          });
          await this.checkpoint({
            status: 'completed',
            phase: 'terminal',
            turns,
            summary: `run stopped: provider ${response.stopReason}`,
          });
          await this.emitHook('run_completed', {
            contentLength: assistantMessage.content.length,
            turns,
          });
          this.completeTurnLedger(assistantMessage.content);
          await this.cleanupToolSessions();
          return {
            status: 'done',
            content: assistantMessage.content,
            messages,
            turns,
            usage,
          };
        }

        const evidenceRecovery = projectAnalysisEvidenceRecoveryMessage(
          userMessage,
          successfulToolNames,
          successfulEvidenceToolCount,
          successfulEvidencePaths.size,
          projectAnalysisEvidenceRecoveryCount,
        );
        if (evidenceRecovery) {
          projectAnalysisEvidenceRecoveryCount += 1;
          messages.push(evidenceRecovery);
          yield await this.record({
            type: 'run_state',
            status: 'provider_request',
            phase: 'executing',
            turns,
            summary: 'requesting file evidence before final project analysis',
          });
          continue;
        }

        const falseUnavailableToolRecovery = falseUnavailableToolRecoveryMessage(
          userMessage,
          assistantMessage.content,
          this.toolsForProvider(activeAllowedTools).map((tool) => tool.name),
          falseUnavailableToolRecoveryUsed,
        );
        if (falseUnavailableToolRecovery) {
          falseUnavailableToolRecoveryUsed = true;
          messages.push(falseUnavailableToolRecovery);
          yield await this.record({
            type: 'run_state',
            status: 'provider_request',
            phase: 'executing',
            turns,
            summary: 'requesting tool call after false unavailable-tool claim',
          });
          continue;
        }

        const fileMutationRequiredRecovery = fileMutationRequiredRecoveryMessage(
          userMessage,
          successfulMutationCount,
          fileMutationRequiredRecoveryCount,
          assistantMessage,
        );
        if (fileMutationRequiredRecovery) {
          fileMutationRequiredRecoveryCount += 1;
          messages.push(fileMutationRequiredRecovery);
          yield await this.record({
            type: 'run_state',
            status: 'provider_request',
            phase: 'executing',
            turns,
            summary: 'requesting required file mutation before final answer',
          });
          continue;
        }

        const pendingVerificationRecovery = verificationRecoveryDecision(
          userMessage,
          messages.slice(0, -1),
          verificationRecoveryCounts,
        );
        if (pendingVerificationRecovery.kind === 'none') {
          const explicitToolCompletionRecovery = explicitToolCompletionRecoveryMessage(
            userMessage,
            Array.from(this.toolMap.keys()),
            successfulToolNames,
            attemptedToolNames,
            mutationSinceLastRead,
            explicitToolCompletionRecoveryCount,
          );
          if (explicitToolCompletionRecovery) {
            explicitToolCompletionRecoveryCount += 1;
            messages.push(explicitToolCompletionRecovery);
            yield await this.record({
              type: 'run_state',
              status: 'provider_request',
              phase: 'executing',
              turns,
              summary: 'requesting explicitly requested tool completion before final answer',
            });
            continue;
          }
        }

        const repositoryRecovery = unrequestedRepositoryRecommendationRecoveryMessage(
          userMessage,
          assistantMessage.content,
          repositoryRecommendationRecoveryUsed,
        );
        if (repositoryRecovery) {
          repositoryRecommendationRecoveryUsed = true;
          messages.push(repositoryRecovery);
          yield await this.record({
            type: 'run_state',
            status: 'provider_request',
            phase: 'executing',
            turns,
            summary: 'requesting revised answer without unrequested repository guidance',
          });
          continue;
        }

        const toolRecoveryFinalizationRecovery = this.toolRecoveryFinalizationRecoveryMessage(
          toolRecoveryFinalizationRecoveryCount,
        );
        if (toolRecoveryFinalizationRecovery) {
          toolRecoveryFinalizationRecoveryCount += 1;
          messages.push(toolRecoveryFinalizationRecovery);
          yield await this.record({
            type: 'run_state',
            status: 'provider_request',
            phase: 'executing',
            turns,
            summary: 'requesting tool recovery before final answer',
          });
          continue;
        }

        const repeatedGuardStop = yield* this.stopForRepeatedVerificationRepairFailure(messages, turns, usage);
        if (repeatedGuardStop) return repeatedGuardStop;

        const activeVerificationRepairGuard = this.verificationRepairGuard as VerificationRepairGuard | undefined;
        const verificationGuardWasModified = Boolean(
          activeVerificationRepairGuard && activeVerificationRepairGuard.modified,
        );
        const verificationGuardRecovery = this.verificationRepairGuardRequiredMessage(assistantMessage.content);
        if (verificationGuardRecovery) {
          const verificationGuardRecoverySummary = verificationGuardWasModified
            ? 'requesting original verification rerun after repair patch'
            : 'requesting pending verification rerun before final answer';
          messages.push(verificationGuardRecovery);
          yield await this.record({
            type: 'run_state',
            status: 'provider_request',
            phase: 'executing',
            turns,
            summary: verificationGuardRecoverySummary,
          });
          continue;
        }

        const verificationRecovery = verificationRecoveryDecision(
          userMessage,
          messages.slice(0, -1),
          verificationRecoveryCounts,
        );
        if (verificationRecovery.kind === 'continue') {
          const autoRepair = yield* this.tryAutoVerificationRepair(
            verificationRecovery.failure,
            messages.slice(0, -1),
            messages,
            todos,
            turns,
            usage,
            successfulToolNames,
            autoVerificationRepairSignatures,
          );
          if (autoRepair.status === 'executed') {
            if (autoRepair.guardRequired) this.activateVerificationRepairGuard(autoRepair.failure);
            messages.push(autoRepair.summaryMessage);
            yield await this.record({
              type: 'run_state',
              status: 'provider_request',
              phase: 'executing',
              turns,
              summary: `requesting report after auto repair recipe for ${autoRepair.failure.toolName}`,
            });
            continue;
          }
          if (autoRepair.status === 'failed') {
            yield await this.record({
              type: 'repair_decision',
              status: 'failed',
              reason: `auto repair failed: ${autoRepair.reason}`,
              attempt: 1,
              maxAttempts: 1,
              failedCommands: [autoRepair.failure.toolName],
            });
          }
          let allowFinalAfterAutoRepairSkip = false;
          if (autoRepair.status === 'skipped') {
            yield await this.record({
              type: 'repair_decision',
              status: 'skipped',
              reason: autoRepair.reason,
              attempt: 1,
              maxAttempts: 1,
              failedCommands: [autoRepair.failure.toolName],
            });
            allowFinalAfterAutoRepairSkip = autoRepair.allowFinal === true;
          }

          if (!allowFinalAfterAutoRepairSkip) {
            verificationRecoveryCounts.set(verificationRecovery.failure.signature, verificationRecovery.attempt);
            this.activateVerificationRepairGuard(verificationRecovery.failure);
            messages.push(verificationRecovery.message);
            yield await this.record({
              type: 'run_state',
              status: 'provider_request',
              phase: 'executing',
              turns,
              summary: `requesting repair after failed ${verificationRecovery.failure.toolName}`,
            });
            continue;
          }
        }
        if (verificationRecovery.kind === 'blocked') {
          const blockedAssistant: AssistantMessage = {
            role: 'assistant',
            content: verificationRecovery.content,
          };
          messages.push(blockedAssistant);
          yield await this.record({
            type: 'repair_decision',
            status: 'blocked',
            reason: `repeated ${verificationRecovery.failure.toolName} failure`,
            attempt: verificationRecovery.attempt,
            maxAttempts: 2,
            failedCommands: [verificationRecovery.failure.toolName],
          });
          yield await this.record({ type: 'assistant_message', message: blockedAssistant });
          yield await this.record({
            type: 'done',
            content: blockedAssistant.content,
            turns,
            usage: usageSnapshot(usage),
          });
          await this.checkpoint({
            status: 'stopped',
            phase: 'terminal',
            turns,
            summary: `run blocked after repeated ${verificationRecovery.failure.toolName} failure`,
          });
          await this.emitHook('run_completed', {
            contentLength: blockedAssistant.content.length,
            turns,
          });
          this.completeTurnLedger(blockedAssistant.content);
          await this.cleanupToolSessions();
          return {
            status: 'done',
            content: blockedAssistant.content,
            messages,
            turns,
            usage,
          };
        }

        const answerOnlyFinalContent = answerOnlyFinalContentForUserRequest(
          userMessage.content,
          assistantMessage.content,
        );
        if (answerOnlyFinalContent) {
          assistantMessage = { ...assistantMessage, content: answerOnlyFinalContent };
          messages[messages.length - 1] = assistantMessage;
        }

        yield await this.record({ type: 'assistant_message', message: assistantMessage });

        // Stop blocking-hook seam: a registered Stop hook may block this normal
        // completion and inject a continuation prompt, forcing the agent to keep
        // working. Bounded by maxStopHookContinuations (consuming normal turns);
        // the while (turns < currentTurnLimit()) condition is the hard backstop.
        // The refusal/content_filter early-return branch above is NOT reached here.
        if (this.hookRegistry?.hasStop()) {
          const stopDecision = await this.hookRegistry.runStop({
            stopHookActive: this.stopHookContinuationCount > 0,
            continuationCount: this.stopHookContinuationCount,
          });
          if (stopDecision.decision === 'block-stop') {
            if (this.stopHookContinuationCount < this.maxStopHookContinuations) {
              this.stopHookContinuationCount += 1;
              messages.push({ role: 'user', content: stopDecision.continuePrompt });
              yield await this.record({
                type: 'run_state',
                status: 'provider_request',
                phase: 'executing',
                turns,
                summary: `Stop hook requested continuation ${this.stopHookContinuationCount}/${this.maxStopHookContinuations}.`,
                reason: stopDecision.reason,
              });
              continue;
            }
            // Cap reached: stop with a clear reason and fall through to done.
            yield await this.record({
              type: 'run_state',
              status: 'provider_request',
              phase: 'terminal',
              turns,
              summary: `Stop hook continuation cap reached (${this.maxStopHookContinuations}); stopping.`,
              reason: stopDecision.reason,
            });
          }
          // allow-stop (or cap reached): fall through to done.
        }

        yield await this.record({
          type: 'done',
          content: assistantMessage.content,
          turns,
          usage: usageSnapshot(usage),
        });
        await this.checkpoint({
          status: 'completed',
          phase: 'terminal',
          turns,
          summary: 'run completed',
        });
        await this.emitHook('run_completed', {
          contentLength: assistantMessage.content.length,
          turns,
        });
        this.completeTurnLedger(assistantMessage.content);
        await this.cleanupToolSessions();
        return {
          status: 'done',
          content: assistantMessage.content,
          messages,
          turns,
          usage,
        };
      }

      yield await this.record({ type: 'assistant_message', message: assistantMessage });

      // S6 — durable HITL pause bubbling. A no-handler `ask` at the approval gate
      // throws ApprovalPauseSignal from runToolCall/collectToolRun; catch it here
      // and return a `paused` result. The durable records (permission_request +
      // mid-gate run_snapshot.pendingApproval) are already written; the paused
      // tool_call assistant message is already in `messages` and has NO matching
      // tool_result (intentionally un-paired for resume to resolve). Mirrors the
      // RunnerCancelledError terminal-return structure.
      try {
        for (const block of this.partitionToolCalls(toolCalls)) {
          if (block.concurrent) {
            for (const toolCall of block.toolCalls) {
              yield await this.startToolCall(toolCall, turns);
              const choiceAudit = await this.recordToolChoiceAudit(toolCall, successfulToolNames);
              if (choiceAudit) yield choiceAudit;
            }

            const runs = await Promise.all(
              block.toolCalls.map((toolCall) =>
                this.collectToolRun(toolCall, todos, turns, usage, successfulToolNames),
              ),
            );
            for (const run of runs) {
              for (const event of run.events) yield event;
              yield* this.finishToolCall(run.outcome, messages, turns, successfulToolNames);
              applyToolContextUpdates(run.outcome.contextUpdates);
              observeExplicitToolProgress(run.outcome);
              const repeatedGuardStop = yield* this.stopForRepeatedVerificationRepairFailure(messages, turns, usage);
              if (repeatedGuardStop) return repeatedGuardStop;
              if (run.outcome.ok && isProjectEvidenceToolName(run.outcome.recordedMessage.name)) {
                successfulEvidenceToolCount += 1;
                if (run.outcome.inputPath) successfulEvidencePaths.add(run.outcome.inputPath.replace(/\\/g, '/'));
              }
            }
            continue;
          }

          for (const toolCall of block.toolCalls) {
            yield await this.startToolCall(toolCall, turns);
            const choiceAudit = await this.recordToolChoiceAudit(toolCall, successfulToolNames);
            if (choiceAudit) yield choiceAudit;
            const toolResult = yield* this.runToolCall(toolCall, todos, turns, usage, successfulToolNames);
            yield* this.finishToolCall(toolResult, messages, turns, successfulToolNames);
            applyToolContextUpdates(toolResult.contextUpdates);
            observeExplicitToolProgress(toolResult);
            const repeatedGuardStop = yield* this.stopForRepeatedVerificationRepairFailure(messages, turns, usage);
            if (repeatedGuardStop) return repeatedGuardStop;
            if (toolResult.ok && isProjectEvidenceToolName(toolResult.recordedMessage.name)) {
              successfulEvidenceToolCount += 1;
              if (toolResult.inputPath) successfulEvidencePaths.add(toolResult.inputPath.replace(/\\/g, '/'));
            }
          }
        }
      } catch (error) {
        if (error instanceof ApprovalPauseSignal) {
          await this.checkpoint({
            status: 'awaiting_approval',
            phase: 'approving',
            turns,
            summary: `paused awaiting approval for ${error.pendingApproval.name}`,
            toolCallId: error.pendingApproval.toolCallId,
            toolName: error.pendingApproval.name,
            reason: error.pendingApproval.reason,
          });
          await this.cleanupToolSessions();
          return {
            status: 'paused',
            reason: 'awaiting_approval',
            pendingApproval: error.pendingApproval,
            content: lastAssistant?.content ?? '',
            messages,
            turns,
            usage,
          };
        }
        this.failTurnLedger(error);
        throw error;
      }
    }

    await this.recordIncompleteRun('max_turns', turns, 'run stopped: max_turns', usage);
    yield await this.record({ type: 'stopped', reason: 'max_turns', turns, usage: usageSnapshot(usage) });
    await this.checkpoint({
      status: 'stopped',
      phase: 'terminal',
      turns,
      summary: 'run stopped: max_turns',
      reason: 'max_turns',
    });
    await this.cleanupToolSessions();
    this.stopTurnLedger('blocked', 'run stopped: max_turns');
    return {
      status: 'stopped',
      reason: 'max_turns',
      content: lastAssistant?.content ?? '',
      messages,
      turns,
      usage,
    };
  }

  async runToCompletion(input: string | UserMessage): Promise<AgentRunResult> {
    const iterator = this.run(input);
    while (true) {
      const step = await iterator.next();
      if (step.done) return step.value;
    }
  }

  private startTurnLedger(input: string | UserMessage) {
    if (!this.turnLedger) return;

    const prompt = typeof input === 'string' ? input : input.content;
    const processModel = this.turnLedgerProcessModel(this.provider);
    const turn = this.turnLedger.startTurn({
      sessionId: this.sessionId,
      prompt,
      providerRequested: this.provider.name,
      providerResolved: this.provider.name,
      providerSource: 'runtime',
      ...(processModel !== undefined ? { processModel } : {}),
    });
    this.currentTurnLedgerId = turn.id;
  }

  private turnLedgerProcessModel(provider: AgentProvider = this.provider): XenesisTurnProcessModel | undefined {
    const capabilities = provider.capabilities;
    if (capabilities?.transport === 'mcp-agent') return 'embedded';
    if (capabilities?.persistentSession === true) return 'persistent-process';
    if (
      capabilities?.persistentSession === false &&
      (capabilities.transport === 'cli-oneshot' || capabilities.transport === 'cli-interactive')
    ) {
      return 'process-per-turn';
    }

    if (provider.name === 'codex-app-server') return 'persistent-process';
    if (provider.name === 'codex-cli' || provider.name === 'claude-cli') return 'process-per-turn';
    return undefined;
  }

  private markTurnLedgerProviderStarting(provider: AgentProvider) {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    this.withTurnLedger((ledger, turnId) => {
      ledger.markProviderStarting(turnId, {
        resolved: provider.name,
        processModel: this.turnLedgerProcessModel(provider) ?? null,
      });
    });
  }

  private markTurnLedgerRunning() {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    this.withTurnLedger((ledger, turnId) => {
      ledger.markRunning(turnId);
    });
  }

  private recordTurnLedgerProviderCliMcpTranscript(message: AssistantMessage) {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    const cli = message.providerMetadata?.cli;
    if (cli?.xenesisDeskMcpConfigured !== true || typeof cli.stderr !== 'string') return;

    const completedToolNames = this.completedCliMcpToolNames(cli.stderr);
    if (completedToolNames.length === 0) return;

    this.withTurnLedger((ledger, turnId) => {
      for (const tool of completedToolNames) {
        const toolName = tool.name;
        const canonical = this.canonicalTurnLedgerToolName(toolName);
        const transcriptId = `${canonical}:cli-transcript:${tool.occurrence}`;
        const crKind = this.turnLedgerCrToolKind(canonical);
        const isCr = crKind !== undefined;

        const turn = ledger.getTurn(turnId);
        const alreadyRecorded = turn?.toolCalls.some((item) => item.id === transcriptId) === true;
        if (alreadyRecorded) {
          ledger.updateToolCall(turnId, {
            id: transcriptId,
            name: canonical,
            status: 'completed',
            summary: 'completed from CLI MCP transcript; readback not inferred',
          });
        } else {
          ledger.addToolCall(turnId, {
            id: transcriptId,
            name: canonical,
            status: 'completed',
            summary: 'completed from CLI MCP transcript; readback not inferred',
          });
        }

        this.turnLedgerToolEvidence.set(transcriptId, {
          isCr,
          isMcp: true,
          isCrReadbackTool: crKind === 'capabilities' || crKind === 'capability',
          ...(crKind !== undefined ? { crKind } : {}),
        });

        ledger.addEvidence(turnId, {
          kind: 'mcp-tool-called',
          id: transcriptId,
          summary: `CLI MCP tool ${canonical} completed from provider transcript`,
          verified: true,
        });

        if (isCr) {
          ledger.addEvidence(turnId, {
            kind: 'cr-capability-called',
            id: transcriptId,
            summary: `CR tool ${canonical} completed through provider MCP transcript; readback not inferred`,
            verified: true,
          });
        }
      }
    });
  }

  private completedCliMcpToolNames(stderr: string) {
    const tools: Array<{ name: string; occurrence: number }> = [];
    const counts = new Map<string, number>();
    for (const match of stderr.matchAll(/^\s*mcp:\s+[^/\s]+\/([^\s]+)\s+\(completed\)\s*$/gim)) {
      const name = match[1]?.trim();
      if (!name) continue;
      const occurrence = (counts.get(name) ?? 0) + 1;
      counts.set(name, occurrence);
      tools.push({ name, occurrence });
    }
    return tools;
  }

  private recordTurnLedgerToolCall(toolCall: ToolCall) {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    this.withTurnLedger((ledger, turnId) => {
      const tool = this.toolMap.get(toolCall.name);
      const crKind = this.turnLedgerCrToolKind(toolCall.name);
      const isCr = crKind !== undefined;
      const isMcp = tool?.isMcp === true;
      const isCrReadbackTool = crKind === 'capabilities' || crKind === 'capability';
      const path = this.turnLedgerCapabilityPath(toolCall.input);

      const turn = ledger.getTurn(turnId);
      const alreadyRecorded =
        turn?.toolCalls.some(
          (item) =>
            (toolCall.id !== undefined && item.id === toolCall.id) ||
            (toolCall.id === undefined && item.name === toolCall.name && item.path === path),
        ) === true;
      if (!alreadyRecorded) {
        ledger.addToolCall(turnId, {
          name: toolCall.name,
          ...(toolCall.id !== undefined ? { id: toolCall.id } : {}),
          ...(path !== undefined ? { path } : {}),
          status: 'running',
        });
      }

      if (isMcp || isCr) {
        this.turnLedgerToolEvidence.set(toolCall.id, {
          isCr,
          isMcp,
          isCrReadbackTool,
          ...(crKind !== undefined ? { crKind } : {}),
          ...(path !== undefined ? { path } : {}),
        });
      }

      if (isMcp) {
        ledger.addEvidence(turnId, {
          kind: 'mcp-tool-called',
          id: toolCall.id,
          ...(path !== undefined ? { path } : {}),
          summary: `MCP tool ${toolCall.name} called`,
          verified: true,
        });
      }

      if (isCr) {
        ledger.addEvidence(turnId, {
          kind: 'cr-capability-called',
          id: toolCall.id,
          ...(path !== undefined ? { path } : {}),
          summary: path ? `CR capability ${path} called` : `CR tool ${toolCall.name} called`,
          verified: true,
        });
      }
    });
  }

  private recordTurnLedgerReadback(toolResult: ToolRunOutcome) {
    if (!this.turnLedger || !this.currentTurnLedgerId || !toolResult.ok) return;
    const meta = this.turnLedgerToolEvidence.get(toolResult.recordedMessage.toolCallId);
    if (!meta || (!meta.isCr && !meta.isMcp)) return;
    const canRecordReadback =
      meta.crKind === 'call'
        ? this.turnLedgerCallResultIsReadback(toolResult.data, meta.path)
        : meta.isCrReadbackTool || toolResult.isReadOnly === true;
    if (!canRecordReadback) return;

    this.withTurnLedger((ledger, turnId) => {
      ledger.addEvidence(turnId, {
        kind: 'readback',
        id: toolResult.recordedMessage.toolCallId,
        ...(meta.path !== undefined ? { path: meta.path } : {}),
        summary: meta.path ? `Readback from ${meta.path}` : `Readback from ${toolResult.recordedMessage.name}`,
        verified: true,
      });
    });
  }

  private recordTurnLedgerToolResult(toolResult: ToolRunOutcome) {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    const meta = this.turnLedgerToolEvidence.get(toolResult.recordedMessage.toolCallId);
    this.withTurnLedger((ledger, turnId) => {
      ledger.updateToolCall(turnId, {
        id: toolResult.recordedMessage.toolCallId,
        name: toolResult.recordedMessage.name,
        ...(meta?.path !== undefined ? { path: meta.path } : {}),
        status: toolResult.ok ? 'completed' : 'failed',
      });
    });
  }

  private turnLedgerCrToolKind(name: string): 'call' | 'capabilities' | 'capability' | undefined {
    const canonical = this.canonicalTurnLedgerToolName(name);
    if (canonical === 'desk_call_capability' || canonical === 'xenesis_desk_call_capability') return 'call';
    if (canonical === 'desk_capabilities' || canonical === 'xenesis_desk_capabilities') return 'capabilities';
    if (canonical === 'desk_capability' || canonical === 'xenesis_desk_capability') return 'capability';
    return undefined;
  }

  private canonicalTurnLedgerToolName(name: string) {
    const providerToolName = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : name;
    return providerToolName.includes('__')
      ? providerToolName.slice(providerToolName.lastIndexOf('__') + 2)
      : providerToolName;
  }

  private turnLedgerCallResultIsReadback(data: unknown, expectedPath?: string) {
    const payload = this.turnLedgerStructuredContent(data);
    if (!payload) return false;
    if (payload.ok === false || payload.approvalRequired === true) return false;

    const path = typeof payload.path === 'string' ? payload.path.trim() : undefined;
    if (expectedPath !== undefined && path !== undefined && path !== expectedPath) return false;

    const permission = typeof payload.permission === 'string' ? payload.permission.toLowerCase() : undefined;
    if (permission !== undefined) return permission === 'read';

    const approval = typeof payload.approval === 'string' ? payload.approval.toLowerCase() : undefined;
    return payload.readable === true && payload.approvalRequired === false && approval === 'never';
  }

  private turnLedgerStructuredContent(data: unknown): Record<string, unknown> | undefined {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const record = data as Record<string, unknown>;
    const structuredContent = record.structuredContent;
    if (structuredContent && typeof structuredContent === 'object' && !Array.isArray(structuredContent)) {
      return structuredContent as Record<string, unknown>;
    }
    return record;
  }

  private turnLedgerCapabilityPath(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
    const path = (input as { path?: unknown }).path;
    if (typeof path !== 'string') return undefined;
    const trimmed = path.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private markTurnLedgerWaitingForApproval(request: ApprovalRequest) {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    this.withTurnLedger((ledger, turnId) => {
      const capabilityPath = this.turnLedgerCapabilityPath(request.input) ?? request.name;
      ledger.markWaitingForApproval(turnId, {
        approvalId: request.approvalId,
        capabilityPath,
        summary: request.summary || request.reason,
      });
      ledger.updateToolCall(turnId, {
        id: request.toolCallId,
        name: request.name,
        path: capabilityPath,
        status: 'waiting_for_approval',
        summary: request.summary || request.reason,
      });
    });
  }

  private markTurnLedgerApprovalResolved(input: {
    approvalId?: string;
    approved: boolean;
    decision: ApprovalDecision['decision'];
    resolvedAt?: string;
    name?: string;
    toolInput?: unknown;
    summary?: string;
  }) {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    const status = this.turnLedgerApprovalStatus(input.approved, input.decision);
    const capabilityPath = this.turnLedgerCapabilityPath(input.toolInput) ?? input.name;
    const approval: XenesisTurnApprovalResolutionInput = {
      status,
      summary: input.summary ?? `Approval ${status}`,
      ...(input.approvalId !== undefined ? { approvalId: input.approvalId } : {}),
      ...(capabilityPath !== undefined ? { capabilityPath } : {}),
      ...(input.resolvedAt !== undefined ? { at: input.resolvedAt } : {}),
    };
    this.withTurnLedger((ledger, turnId) => {
      ledger.resolveApproval(turnId, approval);
    });
  }

  private turnLedgerApprovalStatus(
    approved: boolean,
    decision: ApprovalDecision['decision'],
  ): XenesisTurnApprovalResolutionInput['status'] {
    if (approved) return 'approved';
    if (decision === 'timeout') return 'expired';
    return 'rejected';
  }

  private completeTurnLedger(responsePreview: string) {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    this.withTurnLedger((ledger, turnId) => {
      ledger.completeTurn(turnId, responsePreview);
    });
  }

  private stopTurnLedger(status: 'blocked' | 'cancelled', reason: string) {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    this.withTurnLedger((ledger, turnId) => {
      ledger.stopTurn(turnId, status, reason);
    });
  }

  private failTurnLedger(error: unknown) {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    this.withTurnLedger((ledger, turnId) => {
      ledger.failTurn(turnId, error instanceof Error ? error.name : 'Error', errorMessage(error));
    });
  }

  private withTurnLedger(update: (ledger: XenesisTurnLedger, turnId: string) => void) {
    if (!this.turnLedger || !this.currentTurnLedgerId) return;
    try {
      update(this.turnLedger, this.currentTurnLedgerId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('turn_not_found:')) {
        this.currentTurnLedgerId = undefined;
        return;
      }
      throw error;
    }
  }

  private async record<T extends SessionEvent>(event: T): Promise<T> {
    await this.sessionWriter?.write(event);
    return event;
  }

  private async recordToolPolicySnapshot() {
    if (!this.toolExecutionPolicy) return undefined;
    return await this.record({
      type: 'tool_policy_snapshot',
      policyName: this.toolExecutionPolicy.name ?? 'unnamed',
      priorityTools: this.toolExecutionPolicy.priorityTools ?? [],
      requiredBefore: this.toolExecutionPolicy.requiredBefore ?? {},
      requiredBeforeAny: this.toolExecutionPolicy.requiredBeforeAny ?? {},
    });
  }

  private async checkpoint(event: Omit<RunStateEvent, 'type'>) {
    if (!this.recordLifecycle) return;
    await this.record({ type: 'run_state', ...event });
  }

  private async recordIncompleteRun(
    reason: 'max_turns' | 'cancelled' | 'budget' | 'user_input_required' | 'provider_error',
    turns: number,
    summary: string,
    usage?: AgentRunUsage,
  ) {
    await this.record({
      type: 'incomplete_run',
      reason,
      turns,
      summary,
      ...(usage ? { usage: usageSnapshot(usage) } : {}),
    });
  }

  private async emitHook(name: HookName, payload: Record<string, unknown>) {
    if (!this.hooks) return;
    try {
      await this.hooks.emit({
        name,
        sessionId: this.sessionId,
        payload,
      });
    } catch (error) {
      this.logger.warn(`Hook "${name}" failed: ${errorMessage(error)}`);
    }
  }

  private async cleanupToolSessions() {
    await Promise.all(
      this.tools.map(async (tool) => {
        if (!tool.cleanupSession) return;
        try {
          await tool.cleanupSession(this.sessionId);
        } catch (error) {
          this.logger.warn(`Tool "${tool.name}" cleanup failed: ${errorMessage(error)}`);
        }
      }),
    );
  }

  private userForbiddenToolReason(toolNames: string[]) {
    const reasons = toolNames
      .map((name) => this.userToolDeniedReason(name))
      .filter((reason): reason is string => reason !== undefined);
    if (reasons.length === 0) return undefined;
    return reasons.join('; ');
  }

  private userToolDeniedReason(
    toolName: string,
    input?: unknown,
    isReadOnly?: boolean,
    successfulToolNames?: ReadonlySet<string>,
  ) {
    if (this.userForbiddenTools.has(toolName)) return `user forbids tool: ${toolName}`;
    if (this.userRequestConstraints.noCommandExecution && commandExecutionToolNames.has(toolName)) {
      return `user forbids command execution tool: ${toolName}`;
    }
    if (this.userRequestConstraints.noBrowser && browserToolNames.has(toolName)) {
      return `user forbids browser tool: ${toolName}`;
    }
    if (this.userToolPreferences.readinessOnly && browserToolNames.has(toolName)) {
      return `prefer app_readiness over browser tools: ${toolName}`;
    }
    if (this.userToolPreferences.noExternalWeb && externalWebToolNames.has(toolName)) {
      return `user forbids external web tools: ${toolName}`;
    }
    if (
      this.userRequestConstraints.noFileMutation &&
      input !== undefined &&
      isReadOnly !== undefined &&
      toolCallAppearsToMutateFiles(toolName, input, isReadOnly)
    ) {
      if (toolName === 'shell' || toolName === 'desk_terminal_run') {
        return `user forbids file mutation: ${toolName} command appears to modify files`;
      }
      return `user forbids file mutation: ${toolName}`;
    }
    if (this.userRequestConstraints.readOnly && isReadOnly === false) {
      return `user requested read-only mode: ${toolName} is mutating`;
    }
    if (
      this.userToolPreferences.shellRequiresPriorEvidence &&
      commandExecutionToolNames.has(toolName) &&
      !hasSuccessfulEvidencePreferenceTool(successfulToolNames)
    ) {
      return `requires preferred prior tool before ${toolName}: ${evidencePreferenceToolNames.join(', ')}`;
    }
    if (
      this.userToolPreferences.mutationRequiresPriorEvidence &&
      input !== undefined &&
      isReadOnly !== undefined &&
      toolCallAppearsToMutateFiles(toolName, input, isReadOnly) &&
      !hasSuccessfulEvidencePreferenceTool(successfulToolNames)
    ) {
      return `requires prior evidence tool before file mutation: ${evidencePreferenceToolNames.join(', ')}`;
    }
    return undefined;
  }

  private toolDeniedForProvider(tool: Tool) {
    const toolName = tool.name;
    if (this.userForbiddenTools.has(toolName)) return true;
    if (this.userRequestConstraints.noCommandExecution && commandExecutionToolNames.has(toolName)) return true;
    if (this.userRequestConstraints.noBrowser && browserToolNames.has(toolName)) return true;
    if (this.userToolPreferences.readinessOnly && browserToolNames.has(toolName)) return true;
    if (this.userToolPreferences.noExternalWeb && externalWebToolNames.has(toolName)) return true;
    if (this.userRequestConstraints.noFileMutation && fileMutationToolNames.has(toolName)) return true;
    if (this.userRequestConstraints.readOnly && readOnlySideEffectToolNames.has(toolName)) return true;
    return false;
  }

  private async *tryAutoVerificationRepair(
    failure: VerificationFailure,
    priorMessages: AgentMessage[],
    activeMessages: AgentMessage[],
    todos: TodoItem[],
    turns: number,
    usage: AgentRunUsage,
    successfulToolNames: Set<string>,
    attemptedSignatures: Set<string>,
  ): AsyncGenerator<AgentRunEvent, AutoVerificationRepairResult, void> {
    if (this.approvalMode !== 'auto') return { status: 'not_applicable', reason: 'approval mode is not auto' };
    if (attemptedSignatures.has(failure.signature))
      return { status: 'not_applicable', reason: 'auto repair already attempted' };
    const causeId = failure.classification.primaryCause?.id;

    if (causeId === 'verification_timeout') {
      if (!/timedOut:\s*true|timeoutHint:/i.test(failure.message.content)) {
        return {
          status: 'not_applicable',
          reason: 'verification timeout evidence is not explicit enough to skip auto-rerun',
        };
      }
      attemptedSignatures.add(failure.signature);
      return {
        status: 'skipped',
        failure,
        reason: `auto repair skipped for verification_timeout: timed-out verification must be bounded in code before rerun`,
      };
    }

    if (causeId === 'client_runtime_error') {
      if (failure.toolName !== 'app_e2e_check') {
        return { status: 'not_applicable', reason: 'client runtime triage only runs after app_e2e_check failures' };
      }
      const forbiddenReason = this.userForbiddenToolReason(['app_readiness']);
      if (forbiddenReason) return { status: 'skipped', failure, reason: forbiddenReason, allowFinal: true };
      if (!this.toolMap.has('app_readiness')) {
        return { status: 'not_applicable', reason: 'app_readiness tool is unavailable' };
      }

      attemptedSignatures.add(failure.signature);
      const readinessCall: ToolCall = {
        id: `auto-app-readiness-${Date.now()}`,
        name: 'app_readiness',
        input: {},
      };
      yield await this.record({
        type: 'repair_decision',
        status: 'auto_executed',
        reason: `auto executing ${failure.classification.repairRecipe?.id ?? 'fix_client_runtime_error'} triage for client_runtime_error`,
        attempt: 1,
        maxAttempts: 1,
        failedCommands: [failure.toolName],
      });
      yield* this.runSyntheticToolCall(readinessCall, activeMessages, todos, turns, usage, successfulToolNames);
      return {
        status: 'executed',
        failure,
        summaryMessage: autoTriageSummaryMessage(failure, 'app_readiness'),
        guardRequired: true,
      };
    }

    if (causeId === 'smoke_test_structure') {
      if (failure.toolName !== 'app_readiness') {
        return { status: 'not_applicable', reason: 'smoke structure triage only runs after app_readiness failures' };
      }
      const forbiddenReason = this.userForbiddenToolReason(['diagnostics']);
      if (forbiddenReason) return { status: 'skipped', failure, reason: forbiddenReason, allowFinal: true };
      if (!this.toolMap.has('diagnostics')) {
        return { status: 'not_applicable', reason: 'diagnostics tool is unavailable' };
      }

      attemptedSignatures.add(failure.signature);
      const diagnosticsCall: ToolCall = {
        id: `auto-diagnostics-${Date.now()}`,
        name: 'diagnostics',
        input: {
          script: 'test',
          timeoutMs: 15_000,
          maxOutputChars: 12_000,
        },
      };
      yield await this.record({
        type: 'repair_decision',
        status: 'auto_executed',
        reason: `auto executing ${failure.classification.repairRecipe?.id ?? 'rewrite_smoke_test_structure'} triage for smoke_test_structure`,
        attempt: 1,
        maxAttempts: 1,
        failedCommands: [failure.toolName],
      });
      yield* this.runSyntheticToolCall(diagnosticsCall, activeMessages, todos, turns, usage, successfulToolNames);
      return {
        status: 'executed',
        failure,
        summaryMessage: autoTriageSummaryMessage(failure, 'diagnostics'),
        guardRequired: true,
      };
    }

    if (causeId !== 'server_not_running' && causeId !== 'local_file_requires_server') {
      return { status: 'not_applicable', reason: `failure cause is not auto-repairable: ${causeId ?? 'unknown'}` };
    }
    const forbiddenReason = this.userForbiddenToolReason(['server', 'app_e2e_check']);
    if (forbiddenReason) return { status: 'skipped', failure, reason: forbiddenReason, allowFinal: true };
    if (!this.toolMap.has('server') || !this.toolMap.has('app_e2e_check')) {
      return { status: 'not_applicable', reason: 'required tools are unavailable' };
    }

    const originalToolCall = findToolCallById(priorMessages, failure.message.toolCallId);
    const failedUrl = extractUrlFromVerificationFailure(failure, originalToolCall);
    if (!failedUrl) return { status: 'not_applicable', reason: 'failed app URL could not be determined' };
    const shouldUseWorkspaceIndex =
      shouldRetryWithWorkspaceIndex(failure, causeId) && (await workspaceFileExists(this.workspaceRoot, 'index.html'));

    attemptedSignatures.add(failure.signature);
    const serverName = `auto-repair-${sanitizeFileSegment(this.sessionId)}`;
    let launchPlan: AutoRepairLaunchPlan | undefined;

    yield await this.record({
      type: 'repair_decision',
      status: 'auto_executed',
      reason: `auto executing ${failure.classification.repairRecipe?.id ?? 'repair recipe'} for ${causeId}`,
      attempt: 1,
      maxAttempts: 1,
      failedCommands: [failure.toolName],
    });

    const launchPlanForbiddenReason = this.userForbiddenToolReason(['app_launch_plan']);
    if (this.toolMap.has('app_launch_plan') && !launchPlanForbiddenReason) {
      const launchPlanCall: ToolCall = {
        id: `auto-app-launch-plan-${Date.now()}`,
        name: 'app_launch_plan',
        input: appLaunchPlanInputForAutoRepair(this.workspaceRoot, failedUrl, causeId, shouldUseWorkspaceIndex),
      };
      const launchPlanResult = yield* this.runSyntheticToolCall(
        launchPlanCall,
        activeMessages,
        todos,
        turns,
        usage,
        successfulToolNames,
      );
      if (launchPlanResult.ok) {
        launchPlan = parseAutoRepairLaunchPlan(launchPlanResult.recordedMessage.content);
      }
    }

    const localTarget =
      !launchPlan && (causeId === 'local_file_requires_server' || shouldUseWorkspaceIndex)
        ? localStaticHttpTarget(
            this.workspaceRoot,
            shouldUseWorkspaceIndex ? 'index.html' : failedUrl,
            await allocateLocalHttpPort(),
          )
        : undefined;
    if (!launchPlan && causeId === 'local_file_requires_server' && !localTarget) {
      return {
        status: 'not_applicable',
        reason: 'failed local file URL could not be converted to a workspace HTTP URL',
      };
    }
    if (!launchPlan && shouldUseWorkspaceIndex && !localTarget) {
      return {
        status: 'not_applicable',
        reason: 'workspace index.html could not be converted to a workspace HTTP URL',
      };
    }
    const url = launchPlan?.readinessUrl ?? localTarget?.url ?? failedUrl;
    const command = launchPlan?.command ?? (localTarget ? 'xenesis:static .' : 'npm start');
    const cwd = launchPlan?.cwd ?? '.';

    const startCall: ToolCall = {
      id: `auto-server-start-${Date.now()}`,
      name: 'server',
      input: {
        action: 'start',
        name: serverName,
        command,
        cwd,
        readinessUrl: url,
        readinessTimeoutMs: 15_000,
      },
    };
    const e2eCall: ToolCall = {
      id: `auto-e2e-${Date.now()}`,
      name: 'app_e2e_check',
      input: appE2EInputForAutoRepair(originalToolCall, url),
    };
    const stopCall: ToolCall = {
      id: `auto-server-stop-${Date.now()}`,
      name: 'server',
      input: {
        action: 'stop',
        name: serverName,
      },
    };

    const startResult = yield* this.runSyntheticToolCall(
      startCall,
      activeMessages,
      todos,
      turns,
      usage,
      successfulToolNames,
    );
    if (!startResult.ok) {
      return { status: 'failed', failure, reason: startResult.recordedMessage.content };
    }

    let e2eResult: ToolRunOutcome | undefined;
    try {
      e2eResult = yield* this.runSyntheticToolCall(e2eCall, activeMessages, todos, turns, usage, successfulToolNames);
    } finally {
      yield* this.runSyntheticToolCall(stopCall, activeMessages, todos, turns, usage, successfulToolNames);
    }

    if (!e2eResult?.ok) {
      return {
        status: 'failed',
        failure,
        reason: e2eResult?.recordedMessage.content ?? 'app_e2e_check did not complete',
      };
    }

    return {
      status: 'executed',
      failure,
      summaryMessage: autoRepairSummaryMessage(failure, serverName),
    };
  }

  private async *runSyntheticToolCall(
    toolCall: ToolCall,
    messages: AgentMessage[],
    todos: TodoItem[],
    turns: number,
    usage: AgentRunUsage,
    successfulToolNames: Set<string>,
  ): AsyncGenerator<AgentRunEvent, ToolRunOutcome, void> {
    const assistantMessage: AssistantMessage = {
      role: 'assistant',
      content: '',
      toolCalls: [toolCall],
    };
    messages.push(assistantMessage);
    yield await this.record({ type: 'assistant_message', message: assistantMessage });
    yield await this.startToolCall(toolCall, turns);
    const choiceAudit = await this.recordToolChoiceAudit(toolCall, successfulToolNames);
    if (choiceAudit) yield choiceAudit;
    const result = yield* this.runToolCall(toolCall, todos, turns, usage, successfulToolNames);
    yield* this.finishToolCall(result, messages, turns, successfulToolNames);
    return result;
  }

  private partitionToolCalls(toolCalls: ToolCall[]): ToolCallBlock[] {
    const blocks: ToolCallBlock[] = [];
    for (const toolCall of toolCalls) {
      const concurrent = this.isConcurrentToolCall(toolCall);
      const last = blocks[blocks.length - 1];
      if (concurrent && last?.concurrent) {
        last.toolCalls.push(toolCall);
      } else {
        blocks.push({ concurrent, toolCalls: [toolCall] });
      }
    }
    return blocks;
  }

  private isConcurrentToolCall(toolCall: ToolCall) {
    const tool = this.toolMap.get(toolCall.name);
    if (!tool) return false;

    const requiredBefore = this.toolExecutionPolicy?.requiredBefore?.[tool.name] ?? [];
    const requiredBeforeAny = this.toolExecutionPolicy?.requiredBeforeAny?.[tool.name] ?? [];
    if (requiredBefore.length > 0 || requiredBeforeAny.length > 0) return false;

    const parsed = tool.inputSchema.safeParse(coerceToolArguments(toolCall.input, tool.inputSchema));
    if (!parsed.success) return false;

    try {
      return tool.isReadOnly(parsed.data) && tool.isConcurrencySafe?.(parsed.data) === true;
    } catch {
      return false;
    }
  }

  private async startToolCall(
    toolCall: ToolCall,
    turns: number,
  ): Promise<Extract<AgentRunEvent, { type: 'tool_call' }>> {
    this.recordTurnLedgerToolCall(toolCall);
    const event = await this.record({ type: 'tool_call', toolCall });
    await this.checkpoint({
      status: 'tool_call',
      phase: 'executing',
      turns,
      summary: `running tool ${toolCall.name}`,
      toolCallId: toolCall.id,
      toolName: toolCall.name,
    });
    await this.emitHook('tool_call', {
      id: toolCall.id,
      name: toolCall.name,
    });
    return event;
  }

  private async collectToolRun(
    toolCall: ToolCall,
    todos: TodoItem[],
    turns: number,
    usage: AgentRunUsage,
    successfulToolNames: ReadonlySet<string>,
  ): Promise<CollectedToolRun> {
    const events: AgentRunEvent[] = [];
    const iterator = this.runToolCall(toolCall, todos, turns, usage, successfulToolNames);
    while (true) {
      const step = await iterator.next();
      if (step.done) return { events, outcome: step.value };
      events.push(step.value);
    }
  }

  private toolLoopGuardrailDecision(toolCall: ToolCall): ToolLoopGuardrailDecision | undefined {
    const callKey = toolLoopCallKey(toolCall);
    const entry = this.toolLoopGuardrail.byCallKey.get(callKey);
    if (entry && !entry.ok && entry.observations >= 2) {
      return {
        reason: 'repeated_exact_failure',
        content: this.toolLoopGuardrailContent(toolCall, 'repeated_exact_failure', entry),
        ...(entry.isReadOnly !== undefined ? { isReadOnly: entry.isReadOnly } : {}),
        ...(entry.isMutation !== undefined ? { isMutation: entry.isMutation } : {}),
      };
    }

    if (entry && entry.ok && entry.isReadOnly === true && entry.isMutation !== true && entry.observations >= 2) {
      return {
        reason: 'repeated_readonly_no_progress',
        content: this.toolLoopGuardrailContent(toolCall, 'repeated_readonly_no_progress', entry),
        isReadOnly: true,
        isMutation: false,
      };
    }

    if (
      this.toolLoopGuardrail.consecutiveFailureToolName === toolCall.name &&
      this.toolLoopGuardrail.consecutiveFailureCount >= 2
    ) {
      return {
        reason: 'repeated_same_tool_failure',
        content: this.toolLoopGuardrailContent(toolCall, 'repeated_same_tool_failure', entry),
      };
    }

    return undefined;
  }

  private toolLoopGuardrailContent(
    toolCall: ToolCall,
    reason: ToolLoopGuardrailReason,
    entry?: ToolLoopGuardrailEntry,
  ) {
    const reasonText =
      reason === 'repeated_exact_failure'
        ? 'the same tool and canonical input have already produced the same failed result twice in this Agent turn'
        : reason === 'repeated_same_tool_failure'
          ? 'the same tool has failed twice in a row in this Agent turn'
          : 'the same read-only tool call has already returned an identical result twice without observable progress';
    const nextAction = [
      'Inspect the latest tool result already in the conversation.',
      'Do not retry the same tool call unchanged.',
      'Change the query, path, selector, input, or tool; if no useful alternative exists, report the concrete limitation with the evidence already gathered.',
    ].join(' ');
    return [
      `Xenesis tool-loop guardrail blocked repeated tool call "${toolCall.name}".`,
      `Reason: ${reasonText}.`,
      `Input hash: ${entry?.inputHash ?? shortHash(canonicalToolInput(toolCall.input))}.`,
      ...(entry ? [`Previous result hash: ${entry.resultHash}.`] : []),
      ...(entry?.contentPreview ? ['Previous result preview:', entry.contentPreview] : []),
      `Next action: ${nextAction}`,
    ].join('\n');
  }

  private observeToolLoopGuardrailOutcome(toolCall: ToolCall, outcome: ToolRunOutcome) {
    const inputKey = canonicalToolInput(toolCall.input);
    const callKey = `${toolCall.name}|${inputKey}`;
    const resultHash = shortHash(outcome.recordedMessage.content);
    const existing = this.toolLoopGuardrail.byCallKey.get(callKey);
    const sameObservation = Boolean(
      existing &&
        existing.ok === outcome.ok &&
        existing.resultHash === resultHash &&
        existing.isReadOnly === outcome.isReadOnly &&
        existing.isMutation === outcome.isMutation,
    );
    this.toolLoopGuardrail.byCallKey.set(callKey, {
      toolName: toolCall.name,
      inputKey,
      inputHash: shortHash(inputKey),
      resultHash,
      observations: sameObservation && existing ? existing.observations + 1 : 1,
      ok: outcome.ok,
      ...(outcome.isReadOnly !== undefined ? { isReadOnly: outcome.isReadOnly } : {}),
      ...(outcome.isMutation !== undefined ? { isMutation: outcome.isMutation } : {}),
      contentPreview: truncateToolContent(outcome.recordedMessage.content, 400),
    });

    if (outcome.ok) {
      this.toolLoopGuardrail.consecutiveFailureToolName = undefined;
      this.toolLoopGuardrail.consecutiveFailureCount = 0;
      if (outcome.isMutation === true) {
        for (const [key, entry] of this.toolLoopGuardrail.byCallKey) {
          if (entry.ok && entry.isReadOnly === true && entry.isMutation !== true) {
            this.toolLoopGuardrail.byCallKey.delete(key);
          }
        }
      }
      return;
    }

    if (this.toolLoopGuardrail.consecutiveFailureToolName === toolCall.name) {
      this.toolLoopGuardrail.consecutiveFailureCount += 1;
    } else {
      this.toolLoopGuardrail.consecutiveFailureToolName = toolCall.name;
      this.toolLoopGuardrail.consecutiveFailureCount = 1;
    }
  }

  private async createObservedToolRunOutcome(
    toolCall: ToolCall,
    ok: boolean,
    content: string,
    inputPath?: string,
    isReadOnly?: boolean,
    isMutation?: boolean,
  ) {
    const outcome = await this.createToolRunOutcome(toolCall, ok, content, inputPath, isReadOnly, isMutation);
    this.observeToolLoopGuardrailOutcome(toolCall, outcome);
    return outcome;
  }

  private async *finishToolCall(
    toolResult: ToolRunOutcome,
    messages: AgentMessage[],
    turns: number,
    successfulToolNames: Set<string>,
  ): AsyncGenerator<AgentRunEvent, void, void> {
    if (toolResult.ok) {
      successfulToolNames.add(toolResult.recordedMessage.name);
      this.clearSatisfiedToolPolicyRecoveryHints(successfulToolNames);
      this.clearToolRecoveryHints(toolResult.recordedMessage.name);
      this.observeVerificationRepairGuardToolResult(toolResult);
    } else {
      this.observeVerificationRepairGuardFailedToolResult(toolResult);
    }
    this.observeToolResultGuidance(toolResult);
    this.recordTurnLedgerToolResult(toolResult);
    this.recordTurnLedgerReadback(toolResult);
    if (toolResult.storedEvent) yield await this.record(toolResult.storedEvent);
    if (toolResult.externalContentWarnings && toolResult.externalContentWarnings.length > 0) {
      yield await this.record({
        type: 'tool_event',
        event: {
          type: 'external_content_warning',
          source: 'tool_result',
          toolCallId: toolResult.recordedMessage.toolCallId,
          toolName: toolResult.recordedMessage.name,
          warnings: toolResult.externalContentWarnings,
        },
      });
    }
    messages.push(toolResult.modelMessage);
    const toolResultEvent = await this.record({
      type: 'tool_result',
      ok: toolResult.ok,
      message: toolResult.recordedMessage,
    });
    await this.checkpoint({
      status: 'tool_result',
      phase: 'executing',
      turns,
      summary: `${toolResult.recordedMessage.name} ${toolResult.ok ? 'completed' : 'failed'}`,
      toolCallId: toolResult.recordedMessage.toolCallId,
      toolName: toolResult.recordedMessage.name,
    });
    yield toolResultEvent;
    await this.emitHook('tool_result', {
      id: toolResult.recordedMessage.toolCallId,
      name: toolResult.recordedMessage.name,
      ok: toolResult.ok,
      contentLength: toolResult.recordedMessage.content.length,
    });

    for (const message of toolResult.newMessages ?? []) {
      messages.push(message);
      if (message.role === 'user') {
        yield await this.record({ type: 'user_message', message });
      } else if (message.role === 'assistant') {
        yield await this.record({ type: 'assistant_message', message });
      }
    }
  }

  private async recordPermissionAudit(toolCall: ToolCall, permission: ReturnType<typeof evaluatePermission>) {
    if (permission.status === 'allow') return;
    await this.record({
      type: 'permission_audit',
      toolCallId: toolCall.id,
      name: toolCall.name,
      status: permission.status,
      reason: permission.reason,
      riskLevel: permission.riskLevel,
      summary: permission.audit.summary,
      preview: permission.audit.preview,
      hardDeny: permission.audit.hardDeny,
    });
  }

  // S6 — the single durable HITL approval gate. Used by BOTH the permission-ask
  // gate and the hook-ask path (`evaluatePreToolUse`), so there is exactly one
  // durable record shape. Written as an async generator so it can yield the
  // `permission_request`/`approval_resolved` events into the run stream.
  //
  // Returns "approved" → the caller falls through to execute the tool.
  // Returns { denied } → the caller produces a deny tool_result (pairing kept).
  // Throws ApprovalPauseSignal → durable pause; NO tool_result; the tool_call is
  //   left intentionally un-paired and the run bubbles up to a `paused` result.
  //
  // Durable-first: the `permission_request` + a mid-gate `run_snapshot` carrying
  // `pendingApproval` are written BEFORE any in-process await, so a crash during
  // the fast-lane await is still resumable.
  private async *resolveApproval(
    toolCall: { id: string; name: string },
    request: ApprovalRequest,
  ): AsyncGenerator<AgentRunEvent, 'approved' | { denied: string }, void> {
    // 1. always-allow short-circuit (a hard policy deny is evaluated separately
    //    and still wins; this only skips the soft ask gate).
    if (this.alwaysAllowedTools.has(toolCall.name)) return 'approved';

    // 2. durable records FIRST.
    yield await this.record({ type: 'permission_request', request });
    await this.record({
      type: 'run_snapshot',
      state: this.buildSnapshotWithPendingApproval(request),
    });
    this.markTurnLedgerWaitingForApproval(request);

    // 3. injected-decision path (resume): apply the stored decision exactly once.
    const injected = this.injectedApprovalDecision;
    if (injected && injected.toolCallId === toolCall.id) {
      this.injectedApprovalDecision = undefined; // consume once
      const resolvedAt = new Date().toISOString();
      yield await this.record({
        type: 'approval_resolved',
        toolCallId: toolCall.id,
        approvalId: request.approvalId,
        approved: injected.approved,
        decision: injected.decision,
        resolvedAt,
      });
      this.markTurnLedgerApprovalResolved({
        approvalId: request.approvalId,
        approved: injected.approved,
        decision: injected.decision,
        resolvedAt,
        name: request.name,
        toolInput: request.input,
        summary: request.summary,
      });
      if (injected.decision === 'always-allow') this.alwaysAllowedTools.add(toolCall.name);
      return injected.approved ? 'approved' : { denied: request.reason };
    }

    // 4. fast-lane (interactive): await the in-process handler with a timeout.
    if (this.approvalHandler) {
      const decided = await this.awaitApprovalWithTimeout(request);
      const resolvedAt = new Date().toISOString();
      yield await this.record({
        type: 'approval_resolved',
        toolCallId: toolCall.id,
        approvalId: request.approvalId,
        approved: decided.approved,
        decision: decided.decision,
        resolvedAt,
      });
      this.markTurnLedgerApprovalResolved({
        approvalId: request.approvalId,
        approved: decided.approved,
        decision: decided.decision,
        resolvedAt,
        name: request.name,
        toolInput: request.input,
        summary: request.summary,
      });
      if (decided.decision === 'always-allow') this.alwaysAllowedTools.add(toolCall.name);
      return decided.approved ? 'approved' : { denied: request.reason };
    }

    // 5. durable pause (no handler): bubble up to run() → `paused` result. The
    //    durable records (step 2) are already on disk; NO tool_result is written.
    throw new ApprovalPauseSignal(request);
  }

  // Build the mid-gate durable snapshot: the latest per-turn loop state PLUS the
  // pendingApproval derived from the request, so resume recovers the exact paused
  // tool call. Falls back to a minimal snapshot input if no turn ran yet.
  private buildSnapshotWithPendingApproval(request: ApprovalRequest): ResumableRunState {
    const base: RunSnapshotInput = this.currentRunSnapshotInput ?? {
      turns: 0,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      projectAnalysisEvidenceRecoveryCount: 0,
      explicitToolCompletionRecoveryCount: 0,
      fileMutationRequiredRecoveryCount: 0,
      maxOutputTokensRecoveryCount: 0,
      toolRecoveryFinalizationRecoveryCount: 0,
      repositoryRecommendationRecoveryUsed: false,
      falseUnavailableToolRecoveryUsed: false,
      successfulToolNames: new Set(),
      attemptedToolNames: new Set(),
      successfulEvidencePaths: new Set(),
      successfulEvidenceToolCount: 0,
      successfulMutationCount: 0,
      mutationSinceLastRead: false,
      verificationRecoveryCounts: new Map(),
      autoVerificationRepairSignatures: new Set(),
      verificationRepairExtensionActive: false,
      recentCompactionSavedRatios: [],
      stopHookContinuationCount: this.stopHookContinuationCount,
      messageSeq: this.messageSeq,
      alwaysAllowedTools: this.alwaysAllowedTools,
    };
    const pendingApproval: ResumableRunState['pendingApproval'] = {
      toolCallId: request.toolCallId,
      toolName: request.name,
      toolInput: request.input,
      approvalId: request.approvalId,
      reason: request.reason,
      riskLevel: request.riskLevel,
      summary: request.summary,
      ...(request.preview !== undefined ? { preview: request.preview } : {}),
    };
    return buildRunSnapshot({ ...base, alwaysAllowedTools: this.alwaysAllowedTools, pendingApproval });
  }

  // Race the in-process approvalHandler (boolean contract) against the approval
  // timeout. true→approve, false→deny, timeout→resolved per timeoutBehavior.
  private async awaitApprovalWithTimeout(
    request: ApprovalRequest,
  ): Promise<{ approved: boolean; decision: ApprovalDecision['decision'] }> {
    if (!this.approvalHandler) {
      return { approved: false, decision: 'deny' };
    }
    const timeoutMs = request.timeoutMs ?? this.approvalTimeoutMs;
    const timeoutBehavior = request.timeoutBehavior ?? this.approvalTimeoutBehavior;
    const TIMEOUT = Symbol('approval-timeout');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<typeof TIMEOUT>((resolveTimeout) => {
      timer = setTimeout(() => resolveTimeout(TIMEOUT), timeoutMs);
    });
    try {
      const outcome = await Promise.race([Promise.resolve(this.approvalHandler(request)), timeoutPromise]);
      if (outcome === TIMEOUT) {
        return { approved: timeoutBehavior === 'allow', decision: 'timeout' };
      }
      return outcome ? { approved: true, decision: 'approve' } : { approved: false, decision: 'deny' };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async recordToolPolicyAudit(
    toolCall: ToolCall,
    status: 'allow' | 'deny',
    requiredBefore: string[],
    missingBefore: string[],
    requiredBeforeAny: string[],
    missingBeforeAny: string[],
    options: ToolPolicyAuditOptions = {},
  ) {
    if ((!this.toolExecutionPolicy || this.toolExecutionPolicy.snapshotOnly) && !options.force) return undefined;
    const missing = [...missingBefore, ...missingBeforeAny];
    const nextAction =
      missingBefore.length > 0
        ? `Run these tools first: ${missingBefore.join(', ')}`
        : missingBeforeAny.length > 0
          ? `Run one of these tools first: ${missingBeforeAny.join(', ')}`
          : undefined;
    const policyName = options.policyName ?? this.toolExecutionPolicy?.name ?? 'unnamed';
    const reason =
      options.reason ??
      (status === 'allow'
        ? 'policy requirements satisfied'
        : `requires successful prior tool call(s): ${missing.join(', ')}`);
    const effectiveNextAction = options.nextAction ?? nextAction;
    if (status === 'deny') {
      this.rememberToolPolicyRecoveryHint({
        policyName,
        toolName: toolCall.name,
        reason,
        ...(effectiveNextAction ? { nextAction: effectiveNextAction } : {}),
        missingBefore,
        missingBeforeAny,
      });
    }
    return await this.record({
      type: 'tool_policy_audit',
      toolCallId: toolCall.id,
      name: toolCall.name,
      policyName,
      status,
      reason,
      ...(effectiveNextAction ? { nextAction: effectiveNextAction } : {}),
      requiredBefore,
      missingBefore,
      ...(requiredBeforeAny.length > 0 ? { requiredBeforeAny } : {}),
      ...(missingBeforeAny.length > 0 ? { missingBeforeAny } : {}),
      ...(options.priorityTools
        ? { priorityTools: options.priorityTools }
        : this.toolExecutionPolicy?.priorityTools
          ? { priorityTools: this.toolExecutionPolicy.priorityTools }
          : {}),
    });
  }

  private effectivePolicyMissingTools(
    toolName: string,
    requiredBefore: string[],
    requiredBeforeAny: string[],
    successfulToolNames: ReadonlySet<string>,
  ) {
    const oneOfRequirementSatisfied =
      requiredBeforeAny.length > 0 && requiredBeforeAny.some((name) => successfulToolNames.has(name));
    const interchangeableRequired =
      toolName === 'task_handoff' && oneOfRequirementSatisfied ? new Set(requiredBeforeAny) : new Set<string>();
    const effectiveRequiredBefore = requiredBefore.filter((name) => !interchangeableRequired.has(name));
    const missingBefore = effectiveRequiredBefore.filter((name) => !successfulToolNames.has(name));
    const missingBeforeAny = requiredBeforeAny.length > 0 && !oneOfRequirementSatisfied ? requiredBeforeAny : [];
    return {
      requiredBefore: effectiveRequiredBefore,
      missingBefore,
      requiredBeforeAny,
      missingBeforeAny,
    };
  }

  private rememberToolPolicyRecoveryHint(hint: ToolPolicyRecoveryHint) {
    const key = `${hint.policyName}|${hint.toolName}|${hint.reason}|${hint.nextAction ?? ''}`;
    const existing = this.toolPolicyRecoveryHints.filter(
      (candidate) =>
        `${candidate.policyName}|${candidate.toolName}|${candidate.reason}|${candidate.nextAction ?? ''}` !== key,
    );
    this.toolPolicyRecoveryHints = [...existing, hint].slice(-3);
  }

  private clearSatisfiedToolPolicyRecoveryHints(successfulToolNames: ReadonlySet<string>) {
    this.toolPolicyRecoveryHints = this.toolPolicyRecoveryHints.filter((hint) => {
      const missing = this.effectivePolicyMissingTools(
        hint.toolName,
        hint.missingBefore,
        hint.missingBeforeAny,
        successfulToolNames,
      );
      return missing.missingBefore.length > 0 || missing.missingBeforeAny.length > 0;
    });
  }

  private toolPolicyRecoverySystemMessage(): SystemMessage | undefined {
    if (this.toolPolicyRecoveryHints.length === 0) return undefined;
    const lines = [
      'Xenesis tool policy recovery guidance:',
      'A previous tool call was denied by the active guard. Use this guidance before selecting the next tool.',
      ...this.toolPolicyRecoveryHints.flatMap((hint) => [
        `- Policy: ${hint.policyName}`,
        `  Denied tool: ${hint.toolName}`,
        `  Reason: ${hint.reason}`,
        ...(hint.nextAction ? [`  Next action: ${hint.nextAction}`] : []),
        ...(hint.missingBefore.length > 0 ? [`  Required predecessor tools: ${hint.missingBefore.join(', ')}`] : []),
        ...(hint.missingBeforeAny.length > 0
          ? [`  Required one-of predecessor tools: ${hint.missingBeforeAny.join(', ')}`]
          : []),
      ]),
      'Do not retry the denied tool until the required predecessor tool succeeds.',
    ];
    return {
      role: 'system',
      content: lines.join('\n'),
    };
  }

  private observeToolResultGuidance(toolResult: ToolRunOutcome) {
    const toolName = toolResult.recordedMessage.name;
    const hint = parseToolResultGuidance(toolName, toolResult.recordedMessage.content);
    if (hint) {
      this.toolResultGuidanceHints = [hint];
      return;
    }

    if (toolName === 'app_e2e_check') {
      this.toolResultGuidanceHints = [];
      return;
    }

    if (toolResult.ok) {
      this.clearSatisfiedToolResultGuidanceHints(toolName);
    }
  }

  private clearSatisfiedToolResultGuidanceHints(toolName: string) {
    this.toolResultGuidanceHints = this.toolResultGuidanceHints.filter((hint) => {
      if (hint.nextRecommendedTools.includes(toolName)) return false;
      if (toolName === 'browser' && hint.visualVerificationMethod === 'screenshot_fallback') return false;
      return true;
    });
  }

  private toolResultGuidanceSystemMessage(): SystemMessage | undefined {
    if (this.toolResultGuidanceHints.length === 0) return undefined;

    const lines = [
      'Xenesis tool result guidance:',
      'A previous tool returned structured next-step guidance. Use this before selecting the next tool or finalizing.',
      ...this.toolResultGuidanceHints.flatMap((hint) => [
        `- Previous tool: ${hint.toolName}`,
        ...(hint.status ? [`  status: ${hint.status}`] : []),
        ...(hint.verificationOk ? [`  verificationOk: ${hint.verificationOk}`] : []),
        ...(hint.repairRequired ? [`  repairRequired: ${hint.repairRequired}`] : []),
        ...(hint.visualVerificationMethod ? [`  visualVerificationMethod: ${hint.visualVerificationMethod}`] : []),
        ...(hint.directCanvasPixelStatus ? [`  directCanvasPixelStatus: ${hint.directCanvasPixelStatus}`] : []),
        ...(hint.screenshotFallbackReason ? [`  screenshotFallbackReason: ${hint.screenshotFallbackReason}`] : []),
        ...(hint.nextRecommendedTools.length > 0
          ? [`  Recommended next tools: ${hint.nextRecommendedTools.join(', ')}`]
          : []),
        ...(hint.verificationSequence && hint.verificationSequence.length > 0
          ? [`  Recommended verification sequence: ${hint.verificationSequence.join(' -> ')}`]
          : []),
        ...(hint.nextRecommendedAction ? [`  Recommended next action: ${hint.nextRecommendedAction}`] : []),
        ...(hint.guidance && hint.guidance.length > 0 ? hint.guidance.map((line) => `  Guidance: ${line}`) : []),
        ...(hint.visualVerificationMethod === 'screenshot_fallback'
          ? [
              '  Visual fallback guidance: direct canvas pixels were unavailable. If exact canvas text, layout, or rendered visual state matters, call browser for a screenshot or rerun app_e2e_check with focused expectations before finalizing.',
            ]
          : []),
        ...(hint.visualVerificationMethod === 'direct_canvas_pixels'
          ? [
              '  Visual verification guidance: direct canvas pixels were observed. Prefer app_e2e_check evidence unless the user asks for exact screenshot-level visual review.',
            ]
          : []),
      ]),
    ];

    return {
      role: 'system',
      content: lines.join('\n'),
    };
  }

  private toolResultGuidancePolicyDenial(
    toolName: string,
    successfulToolNames: ReadonlySet<string>,
  ): ToolResultGuidancePolicyDecision | undefined {
    for (const hint of this.toolResultGuidanceHints) {
      if (!hint.verificationSequence || hint.verificationSequence.length === 0) continue;
      const availableSequence = hint.verificationSequence.filter((name) => {
        const tool = this.toolMap.get(name);
        if (!tool) return false;
        return !this.toolDeniedForProvider(tool);
      });
      if (availableSequence.length === 0) continue;
      if (!guidanceToolIsSequenceRelated(toolName, availableSequence, hint.nextRecommendedTools)) continue;

      const nextRequiredTool = availableSequence.find((name) => !successfulToolNames.has(name));
      if (!nextRequiredTool) continue;
      if (toolName === nextRequiredTool) continue;

      const toolIndex = availableSequence.indexOf(toolName);
      const nextIndex = availableSequence.indexOf(nextRequiredTool);
      if (toolIndex !== -1 && toolIndex < nextIndex) continue;

      const { requiredBefore, missingBefore } = orderedMissingBefore(availableSequence, toolName, successfulToolNames);
      if (missingBefore.length === 0) continue;

      return {
        policyName: 'xenesis:tool-result-guidance',
        reason: [
          `requires successful prior tool call(s): ${missingBefore.join(', ')}.`,
          `Previous tool "${hint.toolName}" recommended sequence: ${availableSequence.join(' -> ')}.`,
        ].join(' '),
        nextAction: `Run these tools first: ${missingBefore.join(', ')}`,
        requiredBefore,
        missingBefore,
        priorityTools: availableSequence,
      };
    }
    return undefined;
  }

  private activeToolPriorityHints(candidateTools: readonly Tool[] = this.tools): ToolPriorityHint[] {
    const available = new Set(candidateTools.map((tool) => tool.name));
    const resultGuidanceHints = this.toolResultGuidanceHints
      .map((hint): ToolPriorityHint | undefined => {
        const tools = uniqueToolNames([...(hint.verificationSequence ?? []), ...hint.nextRecommendedTools]).filter(
          (name) => available.has(name),
        );
        if (tools.length === 0) return undefined;
        return {
          reason: `tool_result:${hint.toolName}`,
          tools,
          guidance: hint.nextRecommendedAction
            ? `Follow the previous ${hint.toolName} result: ${hint.nextRecommendedAction}.`
            : `Follow the previous ${hint.toolName} result before choosing lower-priority tools.`,
        };
      })
      .filter((hint): hint is ToolPriorityHint => hint !== undefined);

    const promptHint = this.promptToolPriority
      ? {
          ...this.promptToolPriority,
          tools: this.promptToolPriority.tools.filter((name) => available.has(name)),
        }
      : undefined;
    const executionPolicyHint =
      this.toolExecutionPolicy?.priorityTools && this.toolExecutionPolicy.priorityTools.length > 0
        ? {
            reason: `execution_policy:${this.toolExecutionPolicy.name ?? 'unnamed'}`,
            tools: this.toolExecutionPolicy.priorityTools.filter((name) => available.has(name)),
            guidance:
              'Follow the active execution policy priority tools before lower-priority or caution tools when they fit the task.',
          }
        : undefined;

    return [
      ...resultGuidanceHints,
      ...(promptHint && promptHint.tools.length > 0 ? [promptHint] : []),
      ...(executionPolicyHint && executionPolicyHint.tools.length > 0 ? [executionPolicyHint] : []),
    ];
  }

  private activeToolPriorityNames(candidateTools: readonly Tool[] = this.tools) {
    return uniqueToolNames(this.activeToolPriorityHints(candidateTools).flatMap((hint) => hint.tools));
  }

  private async recordToolChoiceAudit(
    toolCall: ToolCall,
    successfulToolNames: ReadonlySet<string>,
  ): Promise<Extract<AgentRunEvent, { type: 'tool_choice_audit' }> | undefined> {
    const visibleTools = this.tools.filter((tool) => !this.toolDeniedForProvider(tool));
    const hints = this.activeToolPriorityHints(visibleTools);
    if (hints.length === 0) return undefined;

    const priorityTools = uniqueToolNames(hints.flatMap((hint) => hint.tools));
    const unmetPriorityTools = priorityTools.filter((name) => !successfulToolNames.has(name));
    if (priorityTools.length === 0 || unmetPriorityTools.length === 0) return undefined;

    const priorityReasons = uniqueToolNames(hints.map((hint) => hint.reason));
    const followsExplicitPriority = priorityTools.includes(toolCall.name);
    const followsPolicyReadyPriority =
      !followsExplicitPriority && this.toolCallFollowsPolicyReadyPriority(toolCall.name, successfulToolNames);
    const followsPriority = followsExplicitPriority || followsPolicyReadyPriority;
    return await this.record({
      type: 'tool_choice_audit',
      toolCallId: toolCall.id,
      name: toolCall.name,
      status: followsPriority ? 'followed_priority' : 'missed_priority',
      reason: followsExplicitPriority
        ? `called priority tool ${toolCall.name}`
        : followsPolicyReadyPriority
          ? `called policy-ready tool ${toolCall.name}`
          : `called ${toolCall.name} while higher-priority tools were available`,
      priorityReasons,
      priorityTools,
      unmetPriorityTools,
    });
  }

  private toolCallFollowsPolicyReadyPriority(toolName: string, successfulToolNames: ReadonlySet<string>) {
    if (toolName !== 'task_handoff') return false;

    const requiredBefore = this.toolExecutionPolicy?.requiredBefore?.[toolName] ?? [];
    const requiredBeforeAny = this.toolExecutionPolicy?.requiredBeforeAny?.[toolName] ?? [];
    if (requiredBefore.length === 0 && requiredBeforeAny.length === 0) return false;

    const missing = this.effectivePolicyMissingTools(toolName, requiredBefore, requiredBeforeAny, successfulToolNames);
    return missing.missingBefore.length === 0 && missing.missingBeforeAny.length === 0;
  }

  private prioritizeTools(tools: Tool[]) {
    const priorityNames = this.activeToolPriorityNames(tools);
    if (priorityNames.length === 0) return tools;

    const priorityRank = new Map(priorityNames.map((name, index) => [name, index]));
    return tools
      .map((tool, index) => ({ tool, index }))
      .sort((left, right) => {
        const leftRank = priorityRank.get(left.tool.name);
        const rightRank = priorityRank.get(right.tool.name);
        if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank;
        if (leftRank !== undefined) return -1;
        if (rightRank !== undefined) return 1;
        return left.index - right.index;
      })
      .map(({ tool }) => tool);
  }

  private toolPrioritySystemMessage(): SystemMessage | undefined {
    const visibleTools = this.tools.filter((tool) => !this.toolDeniedForProvider(tool));
    const hints = this.activeToolPriorityHints(visibleTools);
    if (hints.length === 0) return undefined;

    const lines = [
      'Xenesis tool priority guidance:',
      'Use this to choose tools earlier in the run. This prioritizes tool choice but does not override permission, approval, or tool policy guards.',
      ...hints.flatMap((hint) => [
        `- Reason: ${hint.reason}`,
        `  Priority tools: ${hint.tools.join(', ')}`,
        `  Guidance: ${hint.guidance}`,
      ]),
      'Prefer these tools before shell or mutation tools when they fit the task. If a priority tool is unavailable or denied, use the next listed tool and report concrete limitations.',
    ];

    return {
      role: 'system',
      content: lines.join('\n'),
    };
  }

  private activateVerificationRepairGuard(failure: VerificationFailure) {
    const existing = this.verificationRepairGuard;
    if (existing?.failure.signature === failure.signature) return;
    this.verificationRepairGuard = {
      failure,
      evidenceSatisfied: false,
      modified: false,
      evidencePaths: new Set(),
      requiredVerificationSequence: this.verificationSequenceForFailure(failure),
      completedVerificationSteps: new Set(),
    };
    this.verificationRepairGuardHint = undefined;
  }

  private verificationSequenceForFailure(failure: VerificationFailure): VerificationToolName[] {
    const sequence: VerificationToolName[] =
      failure.toolName === 'app_readiness'
        ? ['app_readiness', 'diagnostics', 'app_e2e_check']
        : failure.toolName === 'diagnostics'
          ? ['diagnostics', 'app_e2e_check']
          : ['app_e2e_check'];
    return sequence.filter((toolName) => {
      const tool = this.toolMap.get(toolName);
      if (!tool) return false;
      return !this.toolDeniedForProvider(tool);
    });
  }

  private pendingVerificationSteps(guard: VerificationRepairGuard) {
    return guard.requiredVerificationSequence.filter((toolName) => !guard.completedVerificationSteps.has(toolName));
  }

  private nextVerificationStep(guard: VerificationRepairGuard) {
    return this.pendingVerificationSteps(guard)[0];
  }

  private verificationRepairGuardDenial(toolName: string, isMutation: boolean) {
    if (!this.verificationRepairGuard) return undefined;
    if (!isMutation) return undefined;
    if (this.verificationRepairGuard.evidencePaths.size > 3) {
      const nextAction = 'Stop and report evidence ambiguity before patching.';
      const reason = 'Evidence candidate limit exceeded: too many candidate evidence files were inspected';
      return {
        reason,
        nextAction,
        content: [
          `Verification repair guard denied tool "${toolName}": too many candidate evidence files.`,
          nextAction,
          `Candidate evidence files: ${Array.from(this.verificationRepairGuard.evidencePaths).join(', ')}.`,
        ].join(' '),
      };
    }
    if (this.verificationRepairGuard.evidenceSatisfied) return undefined;

    const requiredEvidenceTools = 'read, search, code_symbols, lsp, context_search';
    const nextAction = `Run one evidence tool first: ${requiredEvidenceTools}.`;
    const reason =
      toolName === 'shell'
        ? 'shell command appears to modify files before candidate evidence was read'
        : 'repair patch attempted before candidate evidence was read';
    return {
      reason,
      nextAction,
      content: [
        `Verification repair guard denied tool "${toolName}": ${reason}.`,
        nextAction,
        `Original failed verification tool: ${this.verificationRepairGuard.failure.toolName}.`,
      ].join(' '),
    };
  }

  private verificationRepairGuardSystemMessage(): SystemMessage | undefined {
    if (!this.verificationRepairGuardHint) return undefined;
    return {
      role: 'system',
      content: [
        'Xenesis verification repair guard guidance:',
        `Denied tool: ${this.verificationRepairGuardHint.deniedTool}`,
        `Reason: ${this.verificationRepairGuardHint.reason}`,
        `Next action: ${this.verificationRepairGuardHint.nextAction}`,
        'Required evidence tools: read, search, code_symbols, lsp, context_search',
        'Do not retry the denied mutation tool until one evidence tool succeeds.',
      ].join('\n'),
    };
  }

  private verificationRepairGuardRequiredMessage(assistantContent: string): SystemMessage | undefined {
    const guard = this.verificationRepairGuard;
    if (!guard) return undefined;
    const nextStep = this.nextVerificationStep(guard);
    if (!nextStep) return undefined;
    if (!guard.modified) {
      if (!contentClaimsVerificationResolved(assistantContent)) return undefined;
      return {
        role: 'system',
        content: [
          'Xenesis verification repair is still pending.',
          `Previous failed verification tool: ${guard.failure.toolName}.`,
          'Do not finalize, summarize success, or claim the repair is complete while this verification failure remains unresolved.',
          'Inspect focused evidence and apply a repair if needed.',
          `Rerun the original failed verification tool: ${guard.failure.toolName}.`,
          'Do not finalize until that verification passes.',
        ].join('\n'),
      };
    }
    const remainingSteps = this.pendingVerificationSteps(guard);
    const guidance =
      guard.requiredVerificationSequence.length > 1
        ? [
            `Run the next app verification step: ${nextStep}.`,
            `Remaining app verification steps: ${remainingSteps.join(' -> ')}.`,
            'Do not finalize until the required verification sequence passes.',
          ]
        : [
            `Rerun the original failed verification tool: ${guard.failure.toolName}.`,
            'Do not finalize until that verification passes.',
          ];
    return {
      role: 'system',
      content: [
        'Xenesis verification repair guard required.',
        ...guidance,
        'If the original failure repeats, continue the repair loop with the latest verification evidence instead of summarizing success.',
      ].join('\n'),
    };
  }

  private observeVerificationRepairGuardToolResult(toolResult: ToolRunOutcome) {
    const guard = this.verificationRepairGuard;
    if (!guard || !toolResult.ok) return;

    const toolName = toolResult.recordedMessage.name;
    if (isVerificationToolName(toolName)) {
      if (toolName === this.nextVerificationStep(guard)) {
        guard.completedVerificationSteps.add(toolName);
      }
      if (this.pendingVerificationSteps(guard).length === 0) {
        this.verificationRepairGuard = undefined;
        this.verificationRepairGuardHint = undefined;
      }
      return;
    }

    if (isVerificationRepairEvidenceToolName(toolName)) {
      guard.evidenceSatisfied = true;
      if (toolResult.inputPath) guard.evidencePaths.add(toolResult.inputPath);
      this.verificationRepairGuardHint = undefined;
    }

    if (toolResult.isMutation === true) {
      guard.modified = true;
      this.verificationRepairGuardHint = undefined;
    }
  }

  private observeVerificationRepairGuardFailedToolResult(toolResult: ToolRunOutcome) {
    const guard = this.verificationRepairGuard;
    if (!guard?.modified) return;
    const message = toolResult.recordedMessage;
    if (!isFailedVerificationToolMessage(message)) return;
    const failure: VerificationFailure = {
      message,
      toolName: message.name,
      signature: verificationFailureSignature(message.name, message.content),
      evidence: verificationFailureEvidence(message.content),
      classification: classifyVerificationFailure({
        toolName: message.name,
        content: message.content,
      }),
    };
    if (message.name === guard.failure.toolName && failure.signature === guard.failure.signature) {
      guard.repeatedFailureAfterPatch = failure;
      return;
    }

    if (
      message.name === this.nextVerificationStep(guard) ||
      guard.requiredVerificationSequence.includes(message.name)
    ) {
      this.verificationRepairGuard = {
        failure,
        evidenceSatisfied: false,
        modified: false,
        evidencePaths: new Set(),
        requiredVerificationSequence: this.verificationSequenceForFailure(failure),
        completedVerificationSteps: new Set(),
      };
      this.verificationRepairGuardHint = undefined;
    }
  }

  private async *stopForRepeatedVerificationRepairFailure(
    messages: AgentMessage[],
    turns: number,
    usage: AgentRunUsage,
  ): AsyncGenerator<AgentRunEvent, AgentRunResult | undefined, void> {
    const repeatedGuardFailure = this.verificationRepairGuard?.repeatedFailureAfterPatch;
    if (!repeatedGuardFailure) return undefined;

    const blockedContent = [
      'Verification repair is blocked because the same failure repeated after a patch.',
      '',
      `Failed tool: ${repeatedGuardFailure.toolName}`,
      '',
      'Failure evidence:',
      repeatedGuardFailure.evidence,
      '',
      'I should not continue patching without stronger evidence or user direction.',
    ].join('\n');
    const blockedAssistant: AssistantMessage = {
      role: 'assistant',
      content: blockedContent,
    };
    messages.push(blockedAssistant);
    yield await this.record({
      type: 'repair_decision',
      status: 'blocked',
      reason: `same verification failure repeated after patch: ${repeatedGuardFailure.toolName}`,
      attempt: 1,
      maxAttempts: 1,
      failedCommands: [repeatedGuardFailure.toolName],
    });
    yield await this.record({ type: 'assistant_message', message: blockedAssistant });
    yield await this.record({
      type: 'done',
      content: blockedAssistant.content,
      turns,
      usage: usageSnapshot(usage),
    });
    await this.checkpoint({
      status: 'stopped',
      phase: 'terminal',
      turns,
      summary: `run blocked after repeated ${repeatedGuardFailure.toolName} failure after patch`,
    });
    await this.emitHook('run_completed', {
      contentLength: blockedAssistant.content.length,
      turns,
    });
    this.stopTurnLedger('blocked', `run blocked after repeated ${repeatedGuardFailure.toolName} failure after patch`);
    await this.cleanupToolSessions();
    return {
      status: 'done',
      content: blockedAssistant.content,
      messages,
      turns,
      usage,
    };
  }

  private messagesForProvider(messages: AgentMessage[], activeEffort?: string): AgentMessage[] {
    const base = this.stripOldImagesEnabled
      ? stripStaleImageAttachments(messages, { keepRecentTurns: this.compactHistoryKeepMessages })
      : messages;
    const recoveryMessages = [
      activeEffort
        ? {
            role: 'system' as const,
            content: `Active skill effort override: ${activeEffort}`,
          }
        : undefined,
      this.userForbiddenToolsSystemMessage(),
      this.toolPrioritySystemMessage(),
      this.verificationRepairGuardSystemMessage(),
      this.toolPolicyRecoverySystemMessage(),
      this.toolResultGuidanceSystemMessage(),
      this.toolRecoverySystemMessage(),
    ].filter((message): message is SystemMessage => message !== undefined);
    if (recoveryMessages.length === 0) return repairToolResultPairing(base);

    let firstNonSystem = base.findIndex((message) => message.role !== 'system');
    if (firstNonSystem === -1) firstNonSystem = base.length;
    return repairToolResultPairing([
      ...base.slice(0, firstNonSystem),
      ...recoveryMessages,
      ...base.slice(firstNonSystem),
    ]);
  }

  private providerQueryConfigForModel(model: string) {
    if (model === this.model) return this.providerQueryConfig;
    return buildProviderQueryConfig({
      sessionId: this.sessionId,
      model,
      providers: this.providers,
      providerMaxRetries: this.providerMaxRetries,
      maxTokensBudget: this.maxTokensBudget,
      stream: this.stream,
      env: this.env,
    });
  }

  private toolsForProvider(activeAllowedTools?: ReadonlySet<string>) {
    let visibleTools = this.tools;
    if (activeAllowedTools) {
      visibleTools = visibleTools.filter((tool) => activeAllowedTools.has(tool.name));
    }
    if (
      this.userForbiddenTools.size === 0 &&
      activeUserConstraintNames(this.userRequestConstraints).length === 0 &&
      activeUserToolPreferenceNames(this.userToolPreferences).length === 0
    ) {
      return this.prioritizeTools(visibleTools);
    }
    visibleTools = this.tools.filter((tool) => !this.toolDeniedForProvider(tool));
    return this.prioritizeTools(visibleTools);
  }

  private userForbiddenToolsSystemMessage(): SystemMessage | undefined {
    const constraints = activeUserConstraintNames(this.userRequestConstraints);
    const preferences = activeUserToolPreferenceNames(this.userToolPreferences);
    if (this.userForbiddenTools.size === 0 && constraints.length === 0 && preferences.length === 0) return undefined;
    const tools = Array.from(this.userForbiddenTools).sort();
    const lines = [
      ...(tools.length > 0 ? [`The current user request forbids these tools: ${tools.join(', ')}`] : []),
      ...(constraints.length > 0 ? [`Active user constraints: ${constraints.join(', ')}`] : []),
      ...(preferences.length > 0 ? [`Active user tool preferences: ${preferences.join(', ')}`] : []),
      'Do not call tools blocked by these user constraints, and do not use automatic repair recipes that require them.',
      'When a preference requires prior evidence, call one of these tools first and wait for success: lsp, read, search, code_symbols, context_search.',
      'If the requested task cannot proceed without a forbidden tool or blocked action, report the observed limitation concisely.',
    ];
    return { role: 'system', content: lines.join('\n') };
  }

  private rememberToolRecoveryHint(hint: ToolRecoveryHint) {
    const key = `${hint.kind}|${hint.toolName}|${hint.reason}`;
    const existing = this.toolRecoveryHints.filter(
      (candidate) => `${candidate.kind}|${candidate.toolName}|${candidate.reason}` !== key,
    );
    this.toolRecoveryHints = [...existing, hint].slice(-4);
  }

  private clearToolRecoveryHints(succeededToolName?: string) {
    // Retain unresolved `invalid_tool_input` (args-correction) guidance keyed by the
    // offending tool name: a DIFFERENT tool succeeding mid-turn must not wipe the
    // schema guidance for the tool that still has malformed args.
    this.toolRecoveryHints = this.toolRecoveryHints.filter(
      (hint) =>
        hint.kind === 'invalid_tool_input' && succeededToolName !== undefined && hint.toolName !== succeededToolName,
    );
  }

  private buildArgsCorrectionGuidance(
    toolName: string,
    error: z.ZodError,
    schema: z.ZodType,
    received: unknown,
  ): { content: string; schemaContext?: string } {
    const attempts = (this.argsCorrectionRetryCounts.get(toolName) ?? 0) + 1;
    this.argsCorrectionRetryCounts.set(toolName, attempts);
    // Bounded correction budget: emit structured schema guidance while attempts are
    // within budget; once exhausted, degrade to the prior flat-message behavior.
    if (attempts > this.maxArgsCorrectionRetries + 1) {
      return { content: `Invalid input for tool "${toolName}": ${error.message}` };
    }
    const guidance = buildSchemaGuidance(error, schema, received);
    const structured = {
      error: 'invalid_tool_input',
      tool: toolName,
      issues: guidance.issues,
      schema: guidance.schemaFragment,
      received: guidance.received,
    };
    const schemaContext = safeStringify(structured);
    return {
      content: `Invalid input for tool "${toolName}". ${schemaContext}`,
      schemaContext,
    };
  }

  private buildValidateInputGuidance(
    toolName: string,
    message: string,
    schema: z.ZodType,
    received: unknown,
  ): { content: string; schemaContext?: string } {
    const attempts = (this.argsCorrectionRetryCounts.get(toolName) ?? 0) + 1;
    this.argsCorrectionRetryCounts.set(toolName, attempts);
    if (attempts > this.maxArgsCorrectionRetries + 1) {
      return { content: message };
    }
    let schemaFragment: unknown;
    try {
      schemaFragment = zodToJsonSchema(schema);
    } catch {
      schemaFragment = undefined;
    }
    const structured = {
      error: 'invalid_tool_input',
      tool: toolName,
      issues: [message],
      schema: schemaFragment,
      received,
    };
    const schemaContext = safeStringify(structured);
    return {
      content: `${message} ${schemaContext}`,
      schemaContext,
    };
  }

  private toolRecoverySystemMessage(): SystemMessage | undefined {
    if (this.toolRecoveryHints.length === 0) return undefined;
    const lines = [
      'Xenesis tool recovery guidance:',
      'A previous tool call failed before producing a useful result. Use this guidance before selecting the next tool.',
      ...this.toolRecoveryHints.flatMap((hint) => [
        `- Failure type: ${hint.kind}`,
        `  Tool: ${hint.toolName}`,
        `  Reason: ${hint.reason}`,
        ...(hint.availableTools && hint.availableTools.length > 0
          ? [`  Available tools: ${hint.availableTools.join(', ')}`]
          : []),
        ...(hint.schemaContext ? [`  Schema guidance: ${hint.schemaContext}`] : []),
        `  Next action: ${hint.nextAction}`,
      ]),
    ];
    return {
      role: 'system',
      content: lines.join('\n'),
    };
  }

  private currentInfoFailureRecoveryTools(toolName: string) {
    if (!currentInfoToolRecoveryNames.has(toolName)) return [];
    if (this.userToolPreferences.noExternalWeb) return [];
    return ['web_search', 'web_fetch'].filter((name) => this.toolMap.has(name));
  }

  private externalWorkspaceAccessRecoveryTools(content: string) {
    if (!isExternalWorkspaceOrSessionAccessBlock(content)) return [];
    return ['desk_capabilities', 'desk_call_capability'].filter((name) => this.toolMap.has(name));
  }

  private toolFailureRecoveryTools(toolName: string, content: string) {
    const currentInfoRecoveryTools = this.currentInfoFailureRecoveryTools(toolName);
    if (currentInfoRecoveryTools.length > 0) return currentInfoRecoveryTools;
    return this.externalWorkspaceAccessRecoveryTools(content);
  }

  private recoverableToolFailureHint() {
    return this.toolRecoveryHints.find(
      (hint) =>
        (hint.kind === 'tool_failed' || hint.kind === 'permission_denied') && (hint.availableTools?.length ?? 0) > 0,
    );
  }

  private toolRecoveryFinalizationRecoveryMessage(recoveryCount: number): SystemMessage | undefined {
    if (recoveryCount > 0) return undefined;
    const hint = this.recoverableToolFailureHint();
    if (!hint || !hint.availableTools || hint.availableTools.length === 0) return undefined;

    return {
      role: 'system',
      content: [
        'Xenesis tool recovery required before final answer.',
        `The previous ${hint.toolName} ${hint.kind === 'tool_failed' ? 'call failed' : 'attempt was denied'}: ${hint.reason}`,
        `Use one of these available recovery tools before finalizing: ${hint.availableTools.join(', ')}`,
        `Next action: ${hint.nextAction}`,
        'If the recovery tool also fails or cannot provide relevant evidence, then report the concrete limitation with the attempted recovery evidence.',
      ].join('\n'),
    };
  }

  private isAborted() {
    return this.abortSignal?.aborted === true;
  }

  private throwIfAborted() {
    if (this.isAborted()) throw new RunnerCancelledError();
  }

  private isCancellation(error: unknown) {
    return this.isAborted() || isAbortLikeError(error);
  }

  private async compactActiveMessages(
    messages: AgentMessage[],
    model: string,
    lastResponseInputTokens: number,
    recentSavedRatios: number[],
  ) {
    if (!this.autoCompact) return undefined;

    let firstNonSystem = messages.findIndex((message) => message.role !== 'system');
    if (firstNonSystem === -1) firstNonSystem = messages.length;

    const leadingSystemMessages = messages.slice(0, firstNonSystem);
    const baseSystemMessages = leadingSystemMessages.filter((message) => !isCompactSummaryMessage(message));
    const compactableMessages = [
      ...leadingSystemMessages.filter(isCompactSummaryMessage),
      ...messages.slice(firstNonSystem),
    ];

    const scaffoldTokens = estimateMessagesTokens(baseSystemMessages);
    const tokenThreshold = computeContextTokenBudget({ modelId: model, scaffoldTokens });
    const countTriggered = compactableMessages.length > this.compactHistoryAfterMessages;
    const tokenTriggered = lastResponseInputTokens > tokenThreshold;
    const preflightTriggered =
      estimateMessagesTokens(compactableMessages) > tokenThreshold * this.compactTokenThresholdRatio;
    if (!countTriggered && !tokenTriggered && !preflightTriggered) return undefined;

    return await this.applyStructuredCompaction(messages, baseSystemMessages, compactableMessages, recentSavedRatios);
  }

  private async forceCompactActiveMessages(messages: AgentMessage[], recentSavedRatios: number[]) {
    if (!this.autoCompact) return undefined;

    let firstNonSystem = messages.findIndex((message) => message.role !== 'system');
    if (firstNonSystem === -1) firstNonSystem = messages.length;

    const leadingSystemMessages = messages.slice(0, firstNonSystem);
    const baseSystemMessages = leadingSystemMessages.filter((message) => !isCompactSummaryMessage(message));
    const compactableMessages = [
      ...leadingSystemMessages.filter(isCompactSummaryMessage),
      ...messages.slice(firstNonSystem),
    ];
    if (compactableMessages.length <= 1) return undefined;

    return await this.applyStructuredCompaction(messages, baseSystemMessages, compactableMessages, recentSavedRatios, {
      force: true,
    });
  }

  private async applyStructuredCompaction(
    messages: AgentMessage[],
    baseSystemMessages: AgentMessage[],
    compactableMessages: AgentMessage[],
    recentSavedRatios: number[],
    options: { force?: boolean } = {},
  ) {
    if (!options.force && shouldThrash(recentSavedRatios)) return undefined;

    const effectiveKeepMessages = Math.max(
      0,
      Math.min(this.compactHistoryKeepMessages, Math.max(0, compactableMessages.length - 1)),
    );
    const { keepCount, recentMessages } = compactMessageParts(compactableMessages, effectiveKeepMessages);
    const keepRecentTokens = Math.max(0, estimateMessagesTokens(recentMessages));
    const result = await compactConversation({
      messages: compactableMessages,
      keepRecentTokens,
      summarize: this.llmSummarize
        ? (olderMessages) => this.llmSummarize!(olderMessages, this.previousCompactSummary)
        : async (olderMessages) => deterministicCompactSummary(olderMessages),
      pruneOlder: this.pruneOlderEnabled
        ? (olderMessages) => pruneOlderMessages(olderMessages, { threshold: this.pruneToolResultThreshold }).messages
        : undefined,
      estimateTokens: estimateMessagesTokens,
      abortSignal: this.abortSignal,
    });

    if (!result.summarized && !options.force) return undefined;

    recentSavedRatios.push(result.savedRatio);
    if (recentSavedRatios.length > 4) recentSavedRatios.splice(0, recentSavedRatios.length - 4);
    messages.splice(0, messages.length, ...baseSystemMessages, ...result.messages);

    if (typeof result.summary === 'string' && result.summary.length > 0) {
      this.previousCompactSummary = result.summary;
    }

    return {
      type: 'context_compact' as const,
      originalMessages: compactableMessages.length,
      compactedMessages: result.messages.length,
      keptMessages: keepCount,
      summary: result.summary,
      summarizedFrom: 0,
      summarizedTo: Math.max(0, compactableMessages.length - keepCount),
    };
  }

  private async *completeProvider(request: ProviderRequest): AsyncGenerator<AgentRunEvent, ProviderResponse, void> {
    let lastError: unknown;

    for (let providerIndex = 0; providerIndex < this.providers.length; providerIndex += 1) {
      const provider = this.providers[providerIndex];
      const providerModel = providerIndex === 0 ? request.model : (this.providerModels[providerIndex] ?? request.model);
      const providerRequest: ProviderRequest = {
        ...request,
        model: providerModel,
        queryConfig: this.providerQueryConfigForModel(providerModel),
      };

      for (let attempt = 0; attempt <= this.providerMaxRetries; attempt += 1) {
        this.throwIfAborted();
        try {
          this.markTurnLedgerProviderStarting(provider);
          return yield* this.invokeProvider(provider, providerRequest);
        } catch (error) {
          if (this.isCancellation(error)) throw new RunnerCancelledError();
          lastError = error;
          const failure = classifyProviderFailure(error);
          const message = failure.message;
          const decision = decideProviderAttempt({
            failure,
            attempt,
            maxRetries: this.providerMaxRetries,
            nextProviderIndex: providerIndex + 1,
            remainingProviderSupportsTools: this.providerSupportsTools.slice(providerIndex + 1),
            toolsRequired: providerRequest.tools.length > 0,
          });

          if (decision.kind === 'retry') {
            const retryEvent = {
              type: 'provider_retry',
              provider: provider.name,
              attempt: attempt + 1,
              maxRetries: this.providerMaxRetries,
              message,
              failureKind: failure.kind,
              retryable: failure.retryable,
              remainingRetries: this.providerMaxRetries - attempt - 1,
            } as const;
            yield await this.record(retryEvent);
            await this.emitHook('provider_retry', {
              provider: retryEvent.provider,
              attempt: retryEvent.attempt,
              maxRetries: retryEvent.maxRetries,
              message: retryEvent.message,
              failureKind: retryEvent.failureKind,
              retryable: retryEvent.retryable,
              remainingRetries: retryEvent.remainingRetries,
            });
            const delayMs = computeRetryDelayMs({
              attempt,
              baseDelayMs: this.providerRetryDelayMs,
              retryAfterMs: extractRetryAfterMs(error),
            });
            await sleep(delayMs, this.abortSignal);
            continue;
          }

          if (decision.kind === 'fallback') {
            const fallback = this.providers[decision.toIndex];
            const fromModel = this.providerModels[providerIndex];
            const toModel = this.providerModels[decision.toIndex];
            const fallbackEvent = {
              type: 'provider_fallback',
              from: provider.name,
              to: fallback.name,
              message,
              failureKind: failure.kind,
              fromModel,
              toModel,
              modelSwitch: provider.name === fallback.name && fromModel !== toModel,
            } as const;
            yield await this.record(fallbackEvent);
            await this.emitHook('provider_fallback', {
              from: fallbackEvent.from,
              to: fallbackEvent.to,
              message: fallbackEvent.message,
              failureKind: fallbackEvent.failureKind,
              fromModel: fallbackEvent.fromModel,
              toModel: fallbackEvent.toModel,
              modelSwitch: fallbackEvent.modelSwitch,
            });
            providerIndex = decision.toIndex - 1;
            break;
          }

          if (decision.kind === 'fail-closed') {
            throw new Error(
              `Provider fallback refused: request includes tools, but no remaining tool-capable fallback provider is available after "${provider.name}" failed: ${message}`,
            );
          }

          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(errorMessage(lastError ?? 'Provider request failed'));
  }

  private async *invokeProvider(
    provider: AgentProvider,
    request: ProviderRequest,
  ): AsyncGenerator<AgentRunEvent, ProviderResponse, void> {
    this.throwIfAborted();
    const providerStream = this.resolveProviderStream(provider);
    const useProviderStream = Boolean(providerStream);
    await this.emitHook('provider_request', {
      provider: provider.name,
      model: request.model,
      messageCount: request.messages.length,
      toolCount: request.tools.length,
      stream: useProviderStream,
      providerCapabilities: provider.capabilities,
    });

    if (!providerStream) {
      const response = await provider.complete(request);
      await this.emitHook('provider_response', {
        provider: provider.name,
        contentLength: response.message.content.length,
        toolCallCount: response.message.toolCalls?.length ?? 0,
      });
      return response;
    }

    let finalResponse: ProviderResponse | undefined;
    const iterator = providerStream(request)[Symbol.asyncIterator]();
    while (true) {
      this.throwIfAborted();
      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      const next = await Promise.race([
        iterator.next(),
        new Promise<never>((_, reject) => {
          idleTimer = setTimeout(
            () => reject(new Error(`Provider "${provider.name}" stream idle for ${this.streamIdleMs}ms`)),
            this.streamIdleMs,
          );
        }),
      ]).finally(() => {
        if (idleTimer) clearTimeout(idleTimer);
      });
      if (next.done) break;
      const event = next.value;
      if (event.type === 'text_delta') {
        yield { type: 'assistant_delta', delta: event.delta };
      } else {
        finalResponse = event.response;
      }
    }

    if (!finalResponse) {
      throw new Error(`Provider "${provider.name}" stream ended without a final response.`);
    }

    await this.emitHook('provider_response', {
      provider: provider.name,
      contentLength: finalResponse.message.content.length,
      toolCallCount: finalResponse.message.toolCalls?.length ?? 0,
    });
    return finalResponse;
  }

  private resolveProviderStream(provider: AgentProvider): AgentProvider['stream'] {
    if (!this.stream || !provider.stream) return undefined;
    if (provider.capabilities?.streaming === false) return undefined;
    return provider.stream.bind(provider);
  }

  // Shared PreToolUse blocking-hook evaluation. Runs AFTER schema parse +
  // validateInput and BEFORE the user/permission/policy gates, so a hook can ADD
  // a deny (it can never remove a built-in safety deny) and a `modify` is
  // re-validated against the tool schema and then falls through so the
  // downstream gates re-evaluate the modified input. A `block` lands in the
  // tool_result position via createObservedToolRunOutcome(false) so the
  // tool_use/tool_result pairing is preserved. Wired into runToolCall, which is
  // the single chokepoint for all three tool paths: collectToolRun (concurrent)
  // and runSyntheticToolCall both delegate to runToolCall, so covering it here
  // covers all three.
  private async evaluatePreToolUse(
    toolCall: ToolCall,
    tool: Tool,
    parsedData: Record<string, unknown>,
    meta: { isReadOnly: boolean; isMutation: boolean; inputPath?: string },
  ): Promise<
    | { kind: 'allow' }
    | { kind: 'deny'; outcome: ToolRunOutcome; auditEvent?: AgentRunEvent }
    | {
        kind: 'modify';
        parsedData: Record<string, unknown>;
        isReadOnly: boolean;
        isMutation: boolean;
        inputPath?: string;
      }
    | { kind: 'ask'; request: ApprovalRequest }
  > {
    if (!this.hookRegistry?.hasPreToolUse()) return { kind: 'allow' };

    const decision = await this.hookRegistry.runPreToolUse({
      toolName: tool.name,
      toolInput: parsedData,
      isReadOnly: meta.isReadOnly,
      isMutation: meta.isMutation,
      ...(meta.inputPath !== undefined ? { inputPath: meta.inputPath } : {}),
    });

    if (decision.decision === 'block') {
      this.rememberToolRecoveryHint({
        kind: 'hook_denied',
        toolName: tool.name,
        reason: decision.reason,
        nextAction:
          'Do not retry; this tool call was blocked by a PreToolUse hook. Change approach or report the limitation.',
      });
      const hookAudit = await this.recordToolPolicyAudit(toolCall, 'deny', [], [], [], [], {
        force: true,
        policyName: 'hook:PreToolUse',
        reason: decision.reason,
      });
      const outcome = await this.createObservedToolRunOutcome(
        toolCall,
        false,
        decision.content ?? decision.reason,
        meta.inputPath,
        meta.isReadOnly,
        meta.isMutation,
      );
      // evaluatePreToolUse is not a generator; the audit event is returned to the
      // generator caller (runToolCall) so it can be yielded before the deny outcome.
      return hookAudit ? { kind: 'deny', outcome, auditEvent: hookAudit } : { kind: 'deny', outcome };
    }

    if (decision.decision === 'modify') {
      const coerced = coerceToolArguments(decision.modifiedArgs, tool.inputSchema);
      const reparsed = tool.inputSchema.safeParse(coerced);
      if (!reparsed.success) {
        const outcome = await this.createObservedToolRunOutcome(
          toolCall,
          false,
          `PreToolUse hook produced invalid modified arguments for tool "${tool.name}": ${reparsed.error.issues
            .map((issue) => issue.message)
            .join('; ')}`,
          meta.inputPath,
          meta.isReadOnly,
          meta.isMutation,
        );
        return { kind: 'deny', outcome };
      }
      const newData = reparsed.data as Record<string, unknown>;
      const newReadOnly = tool.isReadOnly(newData);
      return {
        kind: 'modify',
        parsedData: newData,
        isReadOnly: newReadOnly,
        isMutation: isVerificationRepairMutationToolCall(tool.name, newData, newReadOnly),
        inputPath: workspacePathForToolInput(tool.name, newData),
      };
    }

    if (decision.decision === 'ask') {
      // S6 — hook-ask routes through the SAME durable HITL gate as permission-ask.
      // Build an ApprovalRequest from the payload + ask fields; runToolCall calls
      // resolveApproval with it (resolveApproval is a generator; evaluatePreToolUse
      // is not, so the request is returned for the generator caller to resolve).
      const request: ApprovalRequest = {
        toolCallId: toolCall.id,
        approvalId: crypto.randomUUID(),
        name: tool.name,
        input: parsedData,
        reason: decision.reason ?? 'PreToolUse hook requested approval',
        riskLevel: meta.isMutation ? 'high' : 'low',
        summary: decision.title ?? tool.name,
        ...(decision.description !== undefined ? { preview: decision.description } : {}),
        ...(decision.severity !== undefined ? { severity: decision.severity } : {}),
        ...(decision.allowedDecisions !== undefined ? { allowedDecisions: decision.allowedDecisions } : {}),
        ...(decision.timeoutMs !== undefined ? { timeoutMs: decision.timeoutMs } : {}),
        ...(decision.timeoutBehavior !== undefined ? { timeoutBehavior: decision.timeoutBehavior } : {}),
      };
      return { kind: 'ask', request };
    }

    // allow falls through (no gate).
    return { kind: 'allow' };
  }

  private async *runToolCall(
    toolCall: ToolCall,
    todos: TodoItem[],
    turns: number,
    usage: AgentRunUsage,
    successfulToolNames: ReadonlySet<string>,
  ): AsyncGenerator<AgentRunEvent, ToolRunOutcome, void> {
    const loopGuardrailDecision = this.toolLoopGuardrailDecision(toolCall);
    if (loopGuardrailDecision) {
      this.rememberToolRecoveryHint({
        kind: 'tool_failed',
        toolName: toolCall.name,
        reason: loopGuardrailDecision.content,
        nextAction: 'Inspect the latest tool result, change strategy, and do not retry the same tool call unchanged.',
      });
      return await this.createObservedToolRunOutcome(
        toolCall,
        false,
        loopGuardrailDecision.content,
        undefined,
        loopGuardrailDecision.isReadOnly,
        loopGuardrailDecision.isMutation,
      );
    }

    const tool = this.toolMap.get(toolCall.name);
    if (!tool) {
      this.rememberToolRecoveryHint({
        kind: 'missing_tool',
        toolName: toolCall.name,
        reason: `Tool "${toolCall.name}" is not available.`,
        availableTools: Array.from(this.toolMap.keys()).sort(),
        nextAction: `Choose an available tool instead of \`${toolCall.name}\`, or answer without a tool if no suitable tool exists.`,
      });
      return await this.createObservedToolRunOutcome(toolCall, false, `Tool "${toolCall.name}" is not available.`);
    }

    const coerced = coerceToolArguments(toolCall.input, tool.inputSchema);
    const parsed = tool.inputSchema.safeParse(coerced);
    if (!parsed.success) {
      const guidance = this.buildArgsCorrectionGuidance(toolCall.name, parsed.error, tool.inputSchema, coerced);
      this.rememberToolRecoveryHint({
        kind: 'invalid_tool_input',
        toolName: toolCall.name,
        reason: `Invalid input for tool "${toolCall.name}": ${parsed.error.message}`,
        nextAction: 'Retry the tool with input that matches its schema.',
        schemaContext: guidance.schemaContext,
      });
      return await this.createObservedToolRunOutcome(toolCall, false, guidance.content);
    }

    const emittedEvents: ToolEvent[] = [];
    const context: ToolContext = {
      workspaceRoot: this.workspaceRoot,
      xenesisHome: this.xenesisHome,
      cwd: this.cwd,
      env: this.env,
      executionBackend: this.executionBackend,
      skillPaths: this.skillPaths,
      sessionId: this.sessionId,
      abortSignal: this.abortSignal,
      toolExecutionPolicy: this.toolExecutionPolicy,
      todos,
      emit: (event) => emittedEvents.push(event),
      setCwd: (cwd) => {
        this.cwd = cwd;
      },
      setWorkspaceRoot: (workspaceRoot) => {
        this.workspaceRoot = workspaceRoot;
      },
      recordUsage: (childUsage) => {
        usage.inputTokens += childUsage.inputTokens;
        usage.outputTokens += childUsage.outputTokens;
        usage.totalTokens = usage.inputTokens + usage.outputTokens;
      },
      logger: this.logger,
    };

    if (tool.validateInput) {
      const validation = await tool.validateInput(parsed.data, context);
      if (!validation.result) {
        const guidance = this.buildValidateInputGuidance(
          toolCall.name,
          validation.message,
          tool.inputSchema,
          parsed.data,
        );
        this.rememberToolRecoveryHint({
          kind: 'invalid_tool_input',
          toolName: toolCall.name,
          reason: validation.message,
          nextAction: 'Retry the tool with valid input or choose a different available tool.',
          schemaContext: guidance.schemaContext,
        });
        return await this.createObservedToolRunOutcome(toolCall, false, guidance.content);
      }
    }

    let inputPath = workspacePathForToolInput(tool.name, parsed.data);
    let isReadOnly = tool.isReadOnly(parsed.data);
    let isMutation = isVerificationRepairMutationToolCall(tool.name, parsed.data, isReadOnly);

    // PreToolUse blocking-hook seam. Runs after schema/validateInput and before
    // the user/permission/policy gates so a hook can ADD a deny (never bypass a
    // built-in safety deny) and a `modify` falls through to be re-gated.
    const preHook = await this.evaluatePreToolUse(toolCall, tool, parsed.data as Record<string, unknown>, {
      isReadOnly,
      isMutation,
      ...(inputPath !== undefined ? { inputPath } : {}),
    });
    if (preHook.kind === 'deny') {
      if (preHook.auditEvent) yield preHook.auditEvent;
      return preHook.outcome;
    }
    if (preHook.kind === 'modify') {
      parsed.data = preHook.parsedData as typeof parsed.data;
      isReadOnly = preHook.isReadOnly;
      isMutation = preHook.isMutation;
      inputPath = preHook.inputPath;
    }
    if (preHook.kind === 'ask') {
      // S6 — hook-ask shares the SAME durable HITL gate as permission-ask. The
      // pause path throws ApprovalPauseSignal which bubbles to run() with no extra
      // handling here; approve falls through to the remaining gates + execution.
      const outcome = yield* this.resolveApproval(toolCall, preHook.request);
      if (outcome !== 'approved') {
        this.rememberToolRecoveryHint({
          kind: 'approval_denied',
          toolName: toolCall.name,
          reason: preHook.request.reason,
          nextAction:
            'Do not retry the rejected tool call. Ask the user for explicit approval or choose a lower-risk alternative.',
        });
        return await this.createObservedToolRunOutcome(
          toolCall,
          false,
          `Permission denied for tool "${toolCall.name}": ${preHook.request.reason}`,
          inputPath,
          isReadOnly,
          isMutation,
        );
      }
    }

    const userDeniedReason = this.userToolDeniedReason(tool.name, parsed.data, isReadOnly, successfulToolNames);
    if (userDeniedReason) {
      const reason = this.userForbiddenTools.has(tool.name)
        ? `The current user request explicitly forbids tool "${tool.name}".`
        : userDeniedReason;
      this.rememberToolRecoveryHint({
        kind: 'permission_denied',
        toolName: tool.name,
        reason,
        nextAction:
          'Do not retry the forbidden or constrained tool. Report the limitation or choose an allowed alternative.',
      });
      return await this.createObservedToolRunOutcome(
        toolCall,
        false,
        `Permission denied for tool "${tool.name}": ${reason}`,
        inputPath,
        isReadOnly,
        isMutation,
      );
    }

    const guardDenial = this.verificationRepairGuardDenial(tool.name, isMutation);
    if (guardDenial) {
      this.verificationRepairGuardHint = {
        deniedTool: tool.name,
        reason: guardDenial.reason,
        nextAction: guardDenial.nextAction,
      };
      return await this.createObservedToolRunOutcome(
        toolCall,
        false,
        guardDenial.content,
        inputPath,
        isReadOnly,
        isMutation,
      );
    }

    const policyRequirements = this.effectivePolicyMissingTools(
      tool.name,
      this.toolExecutionPolicy?.requiredBefore?.[tool.name] ?? [],
      this.toolExecutionPolicy?.requiredBeforeAny?.[tool.name] ?? [],
      successfulToolNames,
    );
    const policyAudit = await this.recordToolPolicyAudit(
      toolCall,
      policyRequirements.missingBefore.length > 0 || policyRequirements.missingBeforeAny.length > 0 ? 'deny' : 'allow',
      policyRequirements.requiredBefore,
      policyRequirements.missingBefore,
      policyRequirements.requiredBeforeAny,
      policyRequirements.missingBeforeAny,
    );
    if (policyAudit) yield policyAudit;
    if (policyRequirements.missingBefore.length > 0 || policyRequirements.missingBeforeAny.length > 0) {
      return await this.createObservedToolRunOutcome(
        toolCall,
        false,
        [
          `Tool policy "${this.toolExecutionPolicy?.name ?? 'unnamed'}" denied tool "${tool.name}":`,
          `requires successful prior tool call(s): ${[...policyRequirements.missingBefore, ...policyRequirements.missingBeforeAny].join(', ')}.`,
        ].join(' '),
        inputPath,
      );
    }

    const guidancePolicyDenial = this.toolResultGuidancePolicyDenial(tool.name, successfulToolNames);
    if (guidancePolicyDenial) {
      const guidancePolicyAudit = await this.recordToolPolicyAudit(
        toolCall,
        'deny',
        guidancePolicyDenial.requiredBefore,
        guidancePolicyDenial.missingBefore,
        [],
        [],
        {
          force: true,
          policyName: guidancePolicyDenial.policyName,
          reason: guidancePolicyDenial.reason,
          nextAction: guidancePolicyDenial.nextAction,
          priorityTools: guidancePolicyDenial.priorityTools,
        },
      );
      if (guidancePolicyAudit) yield guidancePolicyAudit;
      return await this.createObservedToolRunOutcome(
        toolCall,
        false,
        [
          `Tool policy "${guidancePolicyDenial.policyName}" denied tool "${tool.name}":`,
          guidancePolicyDenial.reason,
          guidancePolicyDenial.nextAction,
        ].join(' '),
        inputPath,
        isReadOnly,
        isMutation,
      );
    }

    const permission = evaluatePermission({
      toolName: tool.name,
      input: parsed.data,
      isReadOnly,
      approvalMode: this.approvalMode,
      workspaceRoot: this.workspaceRoot,
      blockedTools: this.permissions.blockedTools,
      toolPolicies: this.permissions.toolPolicies,
      pathRules: this.permissions.pathRules,
    });

    if (permission.status === 'deny') {
      await this.recordPermissionAudit(toolCall, permission);
      const recoveryTools = this.externalWorkspaceAccessRecoveryTools(permission.reason);
      this.rememberToolRecoveryHint({
        kind: 'permission_denied',
        toolName: toolCall.name,
        reason: permission.reason,
        ...(recoveryTools.length > 0 ? { availableTools: recoveryTools } : {}),
        nextAction: permissionDeniedNextAction(permission.reason, recoveryTools),
      });
      return await this.createObservedToolRunOutcome(
        toolCall,
        false,
        `Permission denied for tool "${toolCall.name}": ${permission.reason}`,
        inputPath,
      );
    }

    if (permission.status === 'ask') {
      const request: ApprovalRequest = {
        toolCallId: toolCall.id,
        approvalId: crypto.randomUUID(),
        name: tool.name,
        input: parsed.data,
        reason: permission.reason,
        riskLevel: permission.riskLevel,
        summary: permission.audit.summary,
        preview: permission.audit.preview,
      };
      await this.recordPermissionAudit(toolCall, permission);
      await this.checkpoint({
        status: 'awaiting_approval',
        phase: 'approving',
        turns,
        summary: `awaiting approval for ${tool.name}`,
        toolCallId: toolCall.id,
        toolName: tool.name,
        reason: permission.reason,
      });

      // S6 — route through the single durable HITL gate. It writes the
      // permission_request + a mid-gate snapshot, then resolves via the injected
      // decision / fast-lane handler, or throws ApprovalPauseSignal (durable
      // pause) which bubbles to run() → a `paused` result.
      const outcome = yield* this.resolveApproval(toolCall, request);
      if (outcome !== 'approved') {
        this.rememberToolRecoveryHint({
          kind: 'approval_denied',
          toolName: toolCall.name,
          reason: permission.reason,
          nextAction:
            'Do not retry the rejected tool call. Ask the user for explicit approval or choose a lower-risk alternative.',
        });
        return await this.createObservedToolRunOutcome(
          toolCall,
          false,
          `Permission denied for tool "${toolCall.name}": ${permission.reason}`,
          inputPath,
        );
      }
    }

    const changePath = isReadOnly ? undefined : inputPath;
    const beforeChangeContent =
      changePath === undefined ? undefined : await readWorkspaceTextSnapshot(this.workspaceRoot, changePath);
    let ok = false;
    let content = '';
    let data: unknown;
    let newMessages: AgentMessage[] | undefined;
    let contextUpdates: ToolContextUpdates | undefined;
    for (let attempt = 0; attempt <= this.maxToolRetries; attempt += 1) {
      try {
        const result = await tool.run(parsed.data, context);
        ok = result.ok;
        content = result.content;
        data = result.data;
        newMessages = result.newMessages;
        contextUpdates = result.contextUpdates;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ok = false;
        content = `Tool "${tool.name}" failed: ${message}`;
        data = undefined;
        newMessages = undefined;
        contextUpdates = undefined;
      }

      if (ok || attempt === this.maxToolRetries) break;
    }
    if (!ok) {
      const recoveryTools = this.toolFailureRecoveryTools(tool.name, content);
      this.rememberToolRecoveryHint({
        kind: 'tool_failed',
        toolName: tool.name,
        reason: content,
        ...(recoveryTools.length > 0 ? { availableTools: recoveryTools } : {}),
        nextAction: toolFailureNextAction(tool.name, content, recoveryTools),
      });
    }

    if (ok && changePath !== undefined) {
      const afterChangeContent = await readWorkspaceTextSnapshot(this.workspaceRoot, changePath);
      if (beforeChangeContent !== afterChangeContent) {
        const change = await new FileWorkspaceChangeStore({
          workspaceRoot: this.workspaceRoot,
          xenesisHome: this.xenesisHome,
        }).record({
          sessionId: this.sessionId,
          toolCallId: toolCall.id,
          toolName: tool.name,
          path: changePath,
          beforeContent: beforeChangeContent,
          afterContent: afterChangeContent,
        });
        yield await this.record({
          type: 'workspace_change',
          changeId: change.id,
          action: change.action,
          path: change.path,
          toolName: change.toolName,
        });
      }
    }

    for (const event of emittedEvents) {
      yield await this.record({ type: 'tool_event', event });
    }

    const outcome = await this.createObservedToolRunOutcome(toolCall, ok, content, inputPath, isReadOnly, isMutation);
    return {
      ...outcome,
      ...(data !== undefined ? { data } : {}),
      ...(newMessages && newMessages.length > 0 ? { newMessages } : {}),
      ...(contextUpdates ? { contextUpdates } : {}),
    };
  }

  private async createToolRunOutcome(
    toolCall: ToolCall,
    ok: boolean,
    content: string,
    inputPath?: string,
    isReadOnly?: boolean,
    isMutation?: boolean,
  ): Promise<ToolRunOutcome> {
    if (content.length <= this.maxToolResultChars) {
      return toolRunOutcome(toolCall, ok, content, this.maxToolResultChars, inputPath, isReadOnly, isMutation);
    }

    const directory = resolve(this.xenesisHome, 'tool-results', sanitizeFileSegment(this.sessionId));
    await mkdir(directory, { recursive: true });
    const path = resolve(directory, `${sanitizeFileSegment(toolCall.id)}-${sanitizeFileSegment(toolCall.name)}.txt`);
    await writeFile(path, content, 'utf8');

    const preview = truncateToolContent(content, this.maxToolResultChars);
    const wrapped = wrapModelVisibleToolResult(
      toolCall,
      storedToolResultContent({
        toolCall,
        path,
        originalChars: content.length,
        preview,
      }),
      isReadOnly,
      isMutation,
    );
    const warnings = userFacingExternalContentWarnings(wrapped);
    return {
      ok,
      recordedMessage: toolResultMessage(toolCall, content),
      modelMessage: toolResultMessage(toolCall, wrapped.content),
      ...(warnings.length > 0 ? { externalContentWarnings: warnings } : {}),
      ...(inputPath ? { inputPath } : {}),
      ...(isReadOnly !== undefined ? { isReadOnly } : {}),
      ...(isMutation !== undefined ? { isMutation } : {}),
      storedEvent: {
        type: 'tool_result_stored',
        toolCallId: toolCall.id,
        name: toolCall.name,
        path,
        originalChars: content.length,
        previewChars: preview.length,
      },
    };
  }
}
