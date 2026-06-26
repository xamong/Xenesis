import { type GowooriArtifactRepairResult, normalizeGowooriArtifactSource } from './gowooriArtifactRepair';
import { validateGowooriArtifactSource } from './gowooriArtifactValidation';
import {
  type GowooriGenerationAcceptanceResult,
  hasBlockingGowooriAcceptanceDiagnostics,
  runGowooriArtifactAcceptanceGate,
} from './gowooriGenerationAcceptance';
import type { GowooriProvider, GowooriRequestMode } from './gowooriProviders';
import type { GowooriQualityLogInput } from './gowooriQualityLog';

export interface GowooriGeneratedArtifactInput {
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

export interface GowooriGeneratedArtifactResult {
  finalArtifact: GowooriArtifactRepairResult;
  acceptanceGate: GowooriGenerationAcceptanceResult;
  validationOk: boolean;
  willApply: boolean;
  assistantMessageText: string;
  assistantStatus: string;
  qualityLogInput: GowooriQualityLogInput;
}

export type GowooriArtifactActionTone = 'ready' | 'applied' | 'blocked' | 'empty';

export interface GowooriArtifactActionStateInput {
  hasSource: boolean;
  preflightOk: boolean;
  applied: boolean;
  autoRepairAttempted: boolean;
  autoRepairSucceeded: boolean;
  hasPrompt: boolean;
  renderableBlockCount?: number;
}

export interface GowooriArtifactActionState {
  tone: GowooriArtifactActionTone;
  label: string;
  canPreview: boolean;
  canApply: boolean;
  canRepair: boolean;
  canRetry: boolean;
}

export function prepareGowooriGeneratedArtifact(input: GowooriGeneratedArtifactInput): GowooriGeneratedArtifactResult {
  const completedAt = normalizeTimestamp(input.completedAt, Date.now());
  const finalArtifact = normalizeGowooriArtifactSource(normalizeProviderArtifactOutput(input.source));
  const acceptanceGate = runGowooriArtifactAcceptanceGate({
    provider: input.provider,
    prompt: input.prompt,
    semanticPrompt: input.semanticPrompt,
    title: input.applyLabel,
    source: finalArtifact.source,
    validate: validateGowooriArtifactSource,
  });
  const validationOk = acceptanceGate.ok;
  const bestEffortRenderable = acceptanceGate.renderableBlockCount > 0;
  const hasBlockingDiagnostics = hasBlockingGowooriAcceptanceDiagnostics(acceptanceGate);
  const canApplyArtifact = validationOk || (bestEffortRenderable && !hasBlockingDiagnostics);
  const willApply = input.autoApply && canApplyArtifact;
  const diagnostics = [...finalArtifact.diagnostics, ...acceptanceGate.diagnostics];

  return {
    finalArtifact,
    acceptanceGate,
    validationOk,
    willApply,
    assistantMessageText: canApplyArtifact ? input.summary : formatPreflightFailureMessage(diagnostics),
    assistantStatus: validationOk
      ? willApply
        ? 'Generated and applied to Gowoori.'
        : 'Generated. Waiting for apply.'
      : canApplyArtifact
        ? willApply
          ? 'Generated and applied to Gowoori with preflight warnings.'
          : 'Generated with preflight warnings. Waiting for apply.'
        : bestEffortRenderable
          ? 'Gowoori artifact failed request-specific validation. Repair or retry generation.'
          : 'No renderable XCON/SKETCH block was found. Repair or retry generation.',
    qualityLogInput: {
      id: createGowooriPipelineId(completedAt),
      provider: input.provider,
      mode: input.mode,
      promptTitle: safeGowooriPipelineTitle(input.prompt),
      startedAt: normalizeTimestamp(input.startedAt, completedAt),
      completedAt,
      source: finalArtifact.source,
      normalizedChanged: finalArtifact.changed,
      preflightOk: validationOk,
      autoRepairAttempted: input.autoRepairAttempted === true,
      autoRepairSucceeded: input.autoRepairSucceeded === true,
      applyRequested: willApply,
      applied: willApply,
      repairBeforeDiagnosticsCount: input.repairBeforeDiagnosticsCount,
      repairAfterDiagnosticsCount: input.repairAfterDiagnosticsCount,
      diagnostics,
      summary: input.summary,
    },
  };
}

export function resolveGowooriArtifactActionState(input: GowooriArtifactActionStateInput): GowooriArtifactActionState {
  if (!input.hasSource) {
    return {
      tone: 'empty',
      label: 'No artifact',
      canPreview: false,
      canApply: false,
      canRepair: false,
      canRetry: input.hasPrompt,
    };
  }

  if (!input.preflightOk) {
    const bestEffortRenderable = normalizeRenderableBlockCount(input.renderableBlockCount) > 0;
    if (bestEffortRenderable) {
      return {
        tone: input.applied ? 'applied' : 'ready',
        label: input.applied ? 'Applied with warnings' : 'Ready with warnings',
        canPreview: true,
        canApply: true,
        canRepair: true,
        canRetry: input.hasPrompt,
      };
    }

    return {
      tone: 'blocked',
      label: 'Repair needed',
      canPreview: false,
      canApply: false,
      canRepair: true,
      canRetry: input.hasPrompt,
    };
  }

  if (input.applied) {
    return {
      tone: 'applied',
      label: input.autoRepairAttempted && input.autoRepairSucceeded ? 'Repaired and applied' : 'Applied',
      canPreview: true,
      canApply: true,
      canRepair: false,
      canRetry: input.hasPrompt,
    };
  }

  return {
    tone: 'ready',
    label: input.autoRepairAttempted && input.autoRepairSucceeded ? 'Repaired and ready' : 'Ready to apply',
    canPreview: true,
    canApply: true,
    canRepair: false,
    canRetry: input.hasPrompt,
  };
}

export function normalizeProviderArtifactOutput(output: string): string {
  return String(output || '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

function normalizeRenderableBlockCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function safeGowooriPipelineTitle(prompt: string): string {
  const compact = String(prompt || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!compact) return 'Generated Gowoori Artifact';
  return compact.length > 44 ? `${compact.slice(0, 44)}...` : compact;
}

interface GowooriDiagnostic {
  severity?: string;
  message?: string;
}

function formatPreflightFailureMessage(diagnostics: GowooriDiagnostic[]): string {
  const errors = diagnostics.filter((d) => d.severity === 'error');
  if (errors.length === 0) return 'Gowoori artifact failed preflight validation.';
  const details = errors
    .slice(0, 3)
    .map((d) => d.message || 'unknown')
    .join('; ');
  const suffix = errors.length > 3 ? ` (+${errors.length - 3} more)` : '';
  return `Gowoori artifact failed preflight: ${details}${suffix}`;
}

function createGowooriPipelineId(completedAt: number): string {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(16).slice(2);
  return `gowoori-chat-${completedAt}-${suffix}`;
}
