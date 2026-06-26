import type { GowooriChatSettings, TerminalApi } from '../../shared/types';
import {
  createGowooriAgentRoutingLines,
  type GowooriAgentRoute,
  routeGowooriUserPrompt,
} from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriAgent';
import type { GowooriAgentDataPacket } from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriAgentData';
import type {
  GowooriAgentToolCall,
  GowooriAgentToolExecutionProgress,
  GowooriAgentToolRegistry,
} from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriAgentTools';
import {
  type GowooriArtifactActionState,
  type GowooriGeneratedArtifactResult,
  prepareGowooriGeneratedArtifact,
  resolveGowooriArtifactActionState,
} from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriArtifactPipeline';
import type { GowooriArtifactRepairDiagnostic } from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriArtifactRepair';
import {
  createGowooriAutoRepairPrompt,
  type GowooriApiRuntimeResolution,
  type GowooriProviderArtifactRunOptions,
  runGowooriProviderArtifact,
} from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriChatRunController';
import type {
  GowooriCliProgressEvent,
  GowooriPromptFileWriter,
} from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriCliRunner';
import {
  createGowooriLlMRequestPrompt,
  createGowooriProviderRequest,
  type GowooriProvider,
  type GowooriProviderRequest,
  type GowooriProviderResult,
  type GowooriRequestMode,
  runGowooriProvider,
} from '../extensions/xenesis-desk.workflow-runner/gowoori/agent/gowooriProviders';

export type XconArtifactSurface = 'gowoori' | 'xenesis' | 'workflow' | 'internal';

export interface XconArtifactProviderPlanInput {
  surface: XconArtifactSurface;
  provider: GowooriProvider;
  mode: GowooriRequestMode;
  prompt: string;
  semanticPrompt?: string;
  agentData?: GowooriAgentDataPacket | null;
  execution?: XconArtifactProviderExecutionOptions;
}

export interface XconArtifactProviderExecutionOptions {
  providerSettings: GowooriChatSettings;
  terminalApi: Pick<TerminalApi, 'spawn' | 'write' | 'onData' | 'onExit' | 'kill' | 'getSettings'>;
  resolveApiRuntime: () => Promise<GowooriApiRuntimeResolution>;
  createAbortController?: () => AbortController;
  onAbortController?: (controller: AbortController) => void;
  onChunk?: (chunk: string) => void;
  onStatus?: (status: string) => void;
  onToolProgress?: (progress: GowooriAgentToolExecutionProgress) => void;
  onToolApprovalsRequired?: (approvals: GowooriAgentToolCall[]) => void;
  onProgress?: (event: GowooriCliProgressEvent) => void;
  cliStatus?: (command: string) => string;
  apiStatus?: (profileName: string) => string;
  agentTools?: GowooriAgentToolRegistry;
  writePromptFile?: GowooriPromptFileWriter;
  approvedAgentToolCallIds?: string[];
  runner?: (options: GowooriProviderArtifactRunOptions) => Promise<GowooriProviderResult>;
}

export interface XconArtifactProviderPlan {
  surface: XconArtifactSurface;
  route: GowooriAgentRoute;
  routeLines: string[];
  providerRequest: GowooriProviderRequest;
  llmPrompt: string;
}

export interface XconArtifactProviderRunResult {
  plan: XconArtifactProviderPlan;
  providerResult: GowooriProviderResult;
}

export interface XconArtifactAutomaticRepairInput {
  initialArtifact: XconArtifactResult;
  resultInput: XconArtifactResultInput;
  execution?: XconArtifactProviderExecutionOptions;
  allowAutomaticRepair?: boolean;
  onRepairPrompt?: (prompt: string) => void;
  onRepairProviderResult?: (result: GowooriProviderResult) => void;
}

export interface XconArtifactAutomaticRepairOutcome {
  initialArtifact: XconArtifactResult;
  finalArtifact: XconArtifactResult;
  repairPrompt: string;
  repairProviderResult: GowooriProviderResult | null;
  autoRepairAttempted: boolean;
  autoRepairSucceeded: boolean;
  repairBeforeDiagnosticsCount: number;
  repairAfterDiagnosticsCount: number;
}

export interface XconArtifactResultInput {
  surface: XconArtifactSurface;
  provider: GowooriProvider;
  mode: GowooriRequestMode | 'benchmark';
  prompt: string;
  semanticPrompt?: string;
  applyLabel: string;
  source: string;
  summary: string;
  autoApply: boolean;
  startedAt: number;
  completedAt?: number;
  autoRepairAttempted?: boolean;
  autoRepairSucceeded?: boolean;
  repairBeforeDiagnosticsCount?: number;
  repairAfterDiagnosticsCount?: number;
}

export interface XconArtifactResult {
  surface: XconArtifactSurface;
  prepared: GowooriGeneratedArtifactResult;
  actionState: GowooriArtifactActionState;
  finalSource: string;
  validationOk: boolean;
  willApply: boolean;
  assistantMessageText: string;
  assistantStatus: string;
}

export type XconArtifactDiagnosticSource = 'normalization' | 'validation';

export type XconArtifactDiagnosticSeverity = 'info' | 'warning' | 'error';

export interface XconArtifactDiagnosticDetail {
  source: XconArtifactDiagnosticSource;
  severity: XconArtifactDiagnosticSeverity;
  message: string;
}

const STRONG_ARTIFACT_TERMS = [
  'xcon',
  'sketch',
  'artifact',
  '아티팩트',
  '거울',
  'gowoori',
  '화면',
  'ui',
  '대시보드',
  'dashboard',
  '보고서',
  'report',
  '문서',
  'document',
  '차트',
  'chart',
  '그래프',
  'graph',
  '그리드',
  'grid',
  '표',
  '테이블',
  'table',
  '지도',
  'map',
  '배너',
  'banner',
  'qr',
  '큐알',
  '네트워크',
  'network',
  '워크플로우',
  'workflow',
  '모니터',
  'monitor',
  '순위',
  '랭킹',
  'ranking',
];

export function createXconArtifactProviderPlan(input: XconArtifactProviderPlanInput): XconArtifactProviderPlan {
  const routePrompt = input.semanticPrompt?.trim() || input.prompt;
  const route = routeGowooriUserPrompt(routePrompt, input.mode);
  const providerRequest = createGowooriProviderRequest({
    provider: input.provider,
    mode: input.mode,
    prompt: input.prompt,
    semanticPrompt: input.semanticPrompt,
    agentData: input.agentData,
  });

  return {
    surface: input.surface,
    route,
    routeLines: createGowooriAgentRoutingLines(route),
    providerRequest,
    llmPrompt: createGowooriLlMRequestPrompt(providerRequest),
  };
}

export async function runXconArtifactProvider(
  input: XconArtifactProviderPlanInput,
): Promise<XconArtifactProviderRunResult> {
  const plan = createXconArtifactProviderPlan(input);
  if (input.execution) {
    const { runner = runGowooriProviderArtifact, ...execution } = input.execution;

    return {
      plan,
      providerResult: await runner({
        ...execution,
        provider: input.provider,
        mode: input.mode,
        prompt: input.prompt,
        semanticPrompt: input.semanticPrompt,
      }),
    };
  }

  return {
    plan,
    providerResult: await runGowooriProvider(plan.providerRequest),
  };
}

export function prepareXconArtifactResult(input: XconArtifactResultInput): XconArtifactResult {
  const prepared = prepareGowooriGeneratedArtifact(input);
  const actionState = resolveGowooriArtifactActionState({
    hasSource: Boolean(prepared.finalArtifact.source.trim()),
    preflightOk: prepared.validationOk,
    applied: prepared.willApply,
    autoRepairAttempted: input.autoRepairAttempted === true,
    autoRepairSucceeded: input.autoRepairSucceeded === true,
    hasPrompt: Boolean(input.prompt.trim()),
    renderableBlockCount: prepared.acceptanceGate.renderableBlockCount,
  });

  return {
    surface: input.surface,
    prepared,
    actionState,
    finalSource: prepared.finalArtifact.source,
    validationOk: prepared.validationOk,
    willApply: prepared.willApply,
    assistantMessageText: prepared.assistantMessageText,
    assistantStatus: prepared.assistantStatus,
  };
}

export async function runXconArtifactAutomaticRepair(
  input: XconArtifactAutomaticRepairInput,
): Promise<XconArtifactAutomaticRepairOutcome> {
  const allowAutomaticRepair = input.allowAutomaticRepair ?? true;
  const initialDiagnostics = createXconArtifactDiagnosticDetails(input.initialArtifact).filter(
    (diagnostic) => diagnostic.severity !== 'info',
  );
  const repairBeforeDiagnosticsCount = initialDiagnostics.length;

  if (!allowAutomaticRepair || repairBeforeDiagnosticsCount === 0 || !input.initialArtifact.actionState.canRepair) {
    return {
      initialArtifact: input.initialArtifact,
      finalArtifact: input.initialArtifact,
      repairPrompt: '',
      repairProviderResult: null,
      autoRepairAttempted: false,
      autoRepairSucceeded: false,
      repairBeforeDiagnosticsCount,
      repairAfterDiagnosticsCount: repairBeforeDiagnosticsCount,
    };
  }

  const repairSourcePrompt = input.resultInput.semanticPrompt?.trim() || input.resultInput.prompt;
  const repairPrompt = createGowooriAutoRepairPrompt(
    repairSourcePrompt,
    input.initialArtifact.finalSource,
    initialDiagnostics.map(toGowooriRepairDiagnostic),
  );
  input.onRepairPrompt?.(repairPrompt);

  let repairProviderResult: GowooriProviderResult;
  if (input.execution) {
    const { runner = runGowooriProviderArtifact, ...execution } = input.execution;
    repairProviderResult = await runner({
      ...execution,
      provider: input.resultInput.provider,
      mode: 'repair',
      prompt: repairPrompt,
      semanticPrompt: repairSourcePrompt,
    });
  } else {
    repairProviderResult = await runGowooriProvider(
      createGowooriProviderRequest({
        provider: input.resultInput.provider,
        mode: 'repair',
        prompt: repairPrompt,
        semanticPrompt: repairSourcePrompt,
      }),
    );
  }
  input.onRepairProviderResult?.(repairProviderResult);

  if (repairProviderResult.kind !== 'artifact') {
    const attemptedArtifact = prepareXconArtifactResult({
      ...input.resultInput,
      autoRepairAttempted: true,
      autoRepairSucceeded: false,
      repairBeforeDiagnosticsCount,
      repairAfterDiagnosticsCount: repairBeforeDiagnosticsCount,
      completedAt: Date.now(),
    });
    return {
      initialArtifact: input.initialArtifact,
      finalArtifact: attemptedArtifact,
      repairPrompt,
      repairProviderResult,
      autoRepairAttempted: true,
      autoRepairSucceeded: false,
      repairBeforeDiagnosticsCount,
      repairAfterDiagnosticsCount: repairBeforeDiagnosticsCount,
    };
  }

  const repairProbe = prepareXconArtifactResult({
    ...input.resultInput,
    mode: 'repair',
    source: repairProviderResult.source,
    summary: repairProviderResult.summary,
    autoRepairAttempted: true,
    autoRepairSucceeded: false,
    repairBeforeDiagnosticsCount,
    completedAt: Date.now(),
  });
  const repairAfterDiagnosticsCount = createXconArtifactDiagnosticDetails(repairProbe).filter(
    (diagnostic) => diagnostic.severity !== 'info',
  ).length;
  const autoRepairSucceeded = repairProbe.validationOk;
  const shouldUseRepairedArtifact =
    autoRepairSucceeded ||
    repairAfterDiagnosticsCount < repairBeforeDiagnosticsCount ||
    (!input.initialArtifact.actionState.canPreview && repairProbe.actionState.canPreview);

  const finalArtifact = shouldUseRepairedArtifact
    ? prepareXconArtifactResult({
        ...input.resultInput,
        mode: 'repair',
        source: repairProviderResult.source,
        summary: repairProviderResult.summary,
        autoRepairAttempted: true,
        autoRepairSucceeded,
        repairBeforeDiagnosticsCount,
        repairAfterDiagnosticsCount,
        completedAt: Date.now(),
      })
    : prepareXconArtifactResult({
        ...input.resultInput,
        autoRepairAttempted: true,
        autoRepairSucceeded: false,
        repairBeforeDiagnosticsCount,
        repairAfterDiagnosticsCount,
        completedAt: Date.now(),
      });

  return {
    initialArtifact: input.initialArtifact,
    finalArtifact,
    repairPrompt,
    repairProviderResult,
    autoRepairAttempted: true,
    autoRepairSucceeded,
    repairBeforeDiagnosticsCount,
    repairAfterDiagnosticsCount,
  };
}

export function shouldRouteXenesisInputToArtifact(input: string): boolean {
  const normalized = String(input || '')
    .trim()
    .toLowerCase();
  if (!normalized || normalized.startsWith('/')) return false;
  if (STRONG_ARTIFACT_TERMS.some((term) => normalized.includes(term))) return true;

  const route = routeGowooriUserPrompt(input, 'generate');
  return ['ranking-table', 'workflow', 'dashboard', 'document'].includes(route.intent);
}

export function createXconArtifactTranscriptSummary(result: XconArtifactResult): string {
  const diagnostics = createXconArtifactDiagnosticDetails(result);
  const warningCount = diagnostics.filter((item) => item.severity === 'warning').length;
  const errorCount = diagnostics.filter((item) => item.severity === 'error').length;
  const state = result.actionState.label;
  const suffix = warningCount > 0 || errorCount > 0 ? ` (${errorCount} error, ${warningCount} warning)` : '';
  return `${state}${suffix}`;
}

export function createXconArtifactDiagnosticDetails(result: XconArtifactResult): XconArtifactDiagnosticDetail[] {
  return [
    ...result.prepared.finalArtifact.diagnostics.map((diagnostic) => ({
      source: 'normalization' as const,
      severity: diagnostic.severity,
      message: normalizeDiagnosticMessage(diagnostic.message),
    })),
    ...result.prepared.acceptanceGate.diagnostics.map((diagnostic) => ({
      source: 'validation' as const,
      severity: diagnostic.severity,
      message: normalizeDiagnosticMessage(diagnostic.message),
    })),
  ].filter((diagnostic) => diagnostic.message);
}

export function createXconArtifactDiagnosticTranscript(
  result: XconArtifactResult,
  options: { limit?: number } = {},
): string {
  const limit =
    typeof options.limit === 'number' && Number.isFinite(options.limit) ? Math.max(1, Math.floor(options.limit)) : 12;
  const diagnostics = createXconArtifactDiagnosticDetails(result).filter(
    (diagnostic) => diagnostic.severity !== 'info',
  );

  if (diagnostics.length === 0) return '';

  const visibleDiagnostics = diagnostics.slice(0, limit);
  const omittedCount = diagnostics.length - visibleDiagnostics.length;
  const lines = [
    'XCON diagnostics:',
    ...visibleDiagnostics.map((diagnostic) => `- ${diagnostic.severity} [${diagnostic.source}]: ${diagnostic.message}`),
  ];

  if (omittedCount > 0) {
    lines.push(`- info [validation]: ${omittedCount} additional diagnostic(s) omitted.`);
  }

  return lines.join('\n');
}

function normalizeDiagnosticMessage(message: string): string {
  return String(message || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toGowooriRepairDiagnostic(detail: XconArtifactDiagnosticDetail): GowooriArtifactRepairDiagnostic {
  return {
    severity: detail.severity,
    message: detail.source ? `[${detail.source}] ${detail.message}` : detail.message,
  };
}
