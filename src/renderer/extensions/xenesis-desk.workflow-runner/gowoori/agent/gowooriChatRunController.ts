import type { GowooriChatSettings, TerminalApi } from '../../../../../shared/types';
import { resolveGowooriProviderTimeoutMs } from '../chat/gowooriChatConstants';
import { createGowooriAgentRepairLines, routeGowooriUserPrompt } from './gowooriAgent';
import {
  type GowooriAgentToolCall,
  type GowooriAgentToolExecutionProgress,
  type GowooriAgentToolRegistry,
  resolveGowooriAgentToolExecutionContext,
} from './gowooriAgentTools';
import { runGowooriApiProvider } from './gowooriApiRunner';
import type { GowooriArtifactRepairDiagnostic } from './gowooriArtifactRepair';
import { type GowooriCliProgressEvent, type GowooriPromptFileWriter, runGowooriCliProvider } from './gowooriCliRunner';
import type { GowooriApiRuntimeSettings } from './gowooriProviderRuntime';
import {
  createGowooriProviderRequest,
  type GowooriArtifactResult,
  type GowooriProvider,
  type GowooriRequestMode,
  runGowooriProvider,
} from './gowooriProviders';
import { createGowooriRichComponentStrategyLines } from './gowooriRichComponentStrategy';
import { observeGowooriStage } from './gowooriStageTelemetry';

export type GowooriTargetMode = 'new' | 'all' | string;

export interface GowooriChatRunOverrides {
  provider?: GowooriProvider;
  requestMode?: GowooriRequestMode;
  targetMode?: GowooriTargetMode;
  autoApply?: boolean;
  approvedAgentToolCallIds?: string[];
  bridgeRequestId?: string;
  sportsStandingsEndpoint?: string;
}

export interface GowooriChatRunCompletion {
  ok: boolean;
  prompt: string;
  sourceLength?: number;
  source?: string;
  summary?: string;
  label?: string;
  applied?: boolean;
  targetMode?: string;
  diagnostics?: GowooriArtifactRepairDiagnostic[];
  autoRepairAttempted?: boolean;
  autoRepairSucceeded?: boolean;
  error?: string;
}

export interface GowooriApiRuntimeResolution {
  runtime: GowooriApiRuntimeSettings;
  activeProfileName: string;
}

export interface GowooriProviderArtifactRunOptions {
  provider: GowooriProvider;
  mode: GowooriRequestMode;
  prompt: string;
  semanticPrompt?: string;
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
  telemetryTarget?: EventTarget | null;
}

export class GowooriAgentToolApprovalRequiredError extends Error {
  readonly approvals: GowooriAgentToolCall[];

  constructor(approvals: GowooriAgentToolCall[]) {
    super('Gowoori agent tools require explicit user approval before continuing.');
    this.name = 'GowooriAgentToolApprovalRequiredError';
    this.approvals = approvals;
  }
}

export function parseCommandArgs(input: string): string[] {
  const args: string[] = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) !== null) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    if (value.trim()) args.push(value.replace(/\\(["'\\])/g, '$1'));
  }
  return args;
}

export function createGowooriAutoRepairPrompt(
  originalPrompt: string,
  source: string,
  diagnostics: GowooriArtifactRepairDiagnostic[],
): string {
  const diagnosticText =
    diagnostics.length > 0
      ? diagnostics.map((item) => `- ${item.severity.toUpperCase()}: ${item.message}`).join('\n')
      : '- ERROR: Gowoori could not validate the artifact.';

  return [
    'Automatic Gowoori repair request.',
    '',
    'The previous answer failed Gowoori preflight validation.',
    ...createGowooriAgentRepairLines(originalPrompt),
    'Return a corrected Markdown + XCON/SKETCH artifact only.',
    'Do not explain the repair. Do not wrap the whole response in a markdown/text fence.',
    'Every UI block must use a fenced ```xcon-sketch block and start with a screen declaration.',
    'Never output raw SKETCH outside a fenced ```xcon-sketch block.',
    'Inside xcon-sketch, use only Gowoori SKETCH syntax: componentName: componentType "text" at x y width height.',
    'Do not use Box/Text shorthand, JSX, Tailwind-like properties, YAML UI trees, or invented layout DSLs.',
    'Valid example: title: label "Ready" at 20 20 140 24.',
    'Use xcon-chain aliases and $alias references instead of {{...}} inside xcon-sketch.',
    'Return sections in this order when applicable: Markdown heading, xcon-chain-fixture, xcon-chain aliases, xcon-demo, xcon-sketch.',
    ...createGowooriRichComponentStrategyLines(originalPrompt, routeGowooriUserPrompt(originalPrompt, 'repair')),
    'Do a final self-check before responding. If any check fails, fix the artifact before sending it.',
    '',
    'Original user request:',
    originalPrompt.trim(),
    '',
    'Validation diagnostics:',
    diagnosticText,
    '',
    'Broken artifact:',
    source.trim(),
  ].join('\n');
}

export async function runGowooriProviderArtifact(
  options: GowooriProviderArtifactRunOptions,
): Promise<GowooriArtifactResult> {
  const stageBase = {
    target: options.telemetryTarget,
    provider: options.provider,
    mode: options.mode,
    prompt: options.prompt,
    semanticPrompt: options.semanticPrompt,
  };
  const toolContext = await observeGowooriStage(
    {
      ...stageBase,
      stage: 'prompt',
      detail: {
        hasAgentTools: Boolean(options.agentTools),
        approvedToolCallCount: options.approvedAgentToolCallIds?.length ?? 0,
      },
    },
    () =>
      resolveGowooriAgentToolExecutionContext({
        prompt: options.prompt,
        mode: options.mode,
        tools: options.agentTools,
        approvedToolCallIds: options.approvedAgentToolCallIds,
        onProgress: (progress) => {
          options.onStatus?.(progress.message);
          options.onToolProgress?.(progress);
        },
      }),
  );
  if (toolContext.pendingApprovals.length > 0) {
    options.onToolApprovalsRequired?.(toolContext.pendingApprovals);
    throw new GowooriAgentToolApprovalRequiredError(toolContext.pendingApprovals);
  }
  const result = await observeGowooriStage(
    {
      ...stageBase,
      stage: 'provider',
      detail: {
        agentDataKeys: Object.keys(toolContext.agentData ?? {}).length,
      },
    },
    () =>
      runGowooriProvider(
        createGowooriProviderRequest({
          provider: options.provider,
          mode: options.mode,
          prompt: options.prompt,
          semanticPrompt: options.semanticPrompt,
          agentData: toolContext.agentData,
        }),
      ),
  );

  if (result.kind === 'cli-plan') {
    const commandOverride = options.providerSettings.commandOverrides[result.provider]?.trim();
    const cliPlan = {
      ...result,
      command: commandOverride || result.command,
    };
    const runAbortController = options.createAbortController?.() ?? new AbortController();
    options.onAbortController?.(runAbortController);
    options.onStatus?.(
      options.cliStatus?.(cliPlan.command) ?? `${cliPlan.command} is running through Xenesis Desk terminal...`,
    );
    return observeGowooriStage(
      {
        ...stageBase,
        stage: 'generate',
        detail: {
          providerKind: 'cli',
          command: cliPlan.command,
          promptMode: options.providerSettings.promptMode,
        },
      },
      () =>
        runGowooriCliProvider(cliPlan, options.terminalApi, {
          promptMode: options.providerSettings.promptMode,
          commandArgs: parseCommandArgs(options.providerSettings.commandArgs || cliPlan.defaultArgs.join(' ')),
          timeoutMs: resolveGowooriProviderTimeoutMs(result.provider, options.providerSettings.timeoutMs),
          signal: runAbortController.signal,
          onChunk: options.onChunk,
          onStatus: options.onStatus,
          onProgress: options.onProgress,
          writePromptFile: options.writePromptFile,
        }),
    );
  }

  if (result.kind === 'api-plan') {
    const runAbortController = options.createAbortController?.() ?? new AbortController();
    options.onAbortController?.(runAbortController);
    const { runtime, activeProfileName } = await options.resolveApiRuntime();
    options.onStatus?.(
      options.apiStatus?.(activeProfileName) ?? `BYOK API streaming with AI profile ${activeProfileName}...`,
    );
    return observeGowooriStage(
      {
        ...stageBase,
        stage: 'generate',
        detail: {
          providerKind: 'api',
          profileName: activeProfileName,
          apiFormat: runtime.apiFormat,
          apiKeyConfigured: Boolean(runtime.apiKey),
        },
      },
      () =>
        runGowooriApiProvider(result, {
          baseUrl: runtime.baseUrl,
          apiKey: runtime.apiKey,
          apiKeyRequired: runtime.apiKeyRequired,
          model: runtime.model,
          apiFormat: runtime.apiFormat,
          signal: runAbortController.signal,
          onChunk: options.onChunk,
          onStatus: options.onStatus,
        }),
    );
  }

  return observeGowooriStage(
    {
      ...stageBase,
      stage: 'generate',
      detail: {
        providerKind: 'local',
        resultKind: result.kind,
      },
    },
    async () => result,
  );
}
