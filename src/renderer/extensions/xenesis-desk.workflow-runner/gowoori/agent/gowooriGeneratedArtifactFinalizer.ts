import type { GowooriChatTranscriptMessage } from '../chat/panes/GowooriChatTranscriptPanel';
import { createGowooriArtifactComparison, type GowooriArtifactComparison } from './gowooriArtifactComparison';
import { prepareGowooriGeneratedArtifact, resolveGowooriArtifactActionState } from './gowooriArtifactPipeline';
import type { GowooriArtifactRepairDiagnostic, GowooriArtifactRepairResult } from './gowooriArtifactRepair';
import { validateGowooriArtifactSource } from './gowooriArtifactValidation';
import type { GowooriChatRunCompletion, GowooriTargetMode } from './gowooriChatRunController';
import {
  hasBlockingGowooriAcceptanceDiagnostics,
  runGowooriArtifactAcceptanceGate,
} from './gowooriGenerationAcceptance';
import type { GowooriArtifactResult, GowooriProvider, GowooriRequestMode } from './gowooriProviders';
import { createGowooriQualityLogEntry, type GowooriQualityLogEntry } from './gowooriQualityLog';
import { emitGowooriStageComplete, emitGowooriStageStart, observeGowooriStage } from './gowooriStageTelemetry';

export interface GowooriGeneratedArtifactFinalizerOptions {
  rawSource: string;
  summary: string;
  originalPrompt: string;
  semanticPrompt?: string;
  applyLabel: string;
  successStatus: string;
  targetMode: GowooriTargetMode;
  liveTarget?: GowooriTargetMode | null;
  allowAutomaticRepair?: boolean;
  startedAt?: number;
  qualityProvider: GowooriProvider;
  qualityMode: GowooriRequestMode;
  autoApply: boolean;
  prepareArtifactSource: (source: string, allowPartial: boolean, context: string) => GowooriArtifactRepairResult;
  recordArtifactDiagnostics: (
    context: string,
    changed: boolean,
    renderable: boolean,
    diagnostics: GowooriArtifactRepairDiagnostic[],
  ) => void;
  runAutomaticRepairAttempt: (
    originalPrompt: string,
    source: string,
    diagnostics: GowooriArtifactRepairDiagnostic[],
    repairProvider: GowooriProvider,
  ) => Promise<GowooriArtifactResult | null>;
  applySourceToGowoori: (source: string, label: string, targetOverride?: GowooriTargetMode) => Promise<void>;
  appendQualityLogEntry: (entry: GowooriQualityLogEntry) => void;
  appendAssistantMessage: (message: GowooriChatTranscriptMessage) => void;
  appendRepairComparison: (comparison: GowooriArtifactComparison) => void;
  setInspectorTab: (tab: 'chat' | 'stream' | 'repair' | 'quality') => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setStatus: (status: string) => void;
  clearAbortController: () => void;
  clearLivePreviewTarget: () => void;
  createMessageId: () => string;
  telemetryTarget?: EventTarget | null;
}

export async function finishGowooriGeneratedArtifact(
  options: GowooriGeneratedArtifactFinalizerOptions,
): Promise<GowooriChatRunCompletion> {
  const startedAt = options.startedAt ?? Date.now();
  const allowAutomaticRepair = options.allowAutomaticRepair ?? true;
  const stageBase = {
    target: options.telemetryTarget,
    provider: options.qualityProvider,
    mode: options.qualityMode,
    prompt: options.originalPrompt,
    semanticPrompt: options.semanticPrompt,
  };
  const finalizeStage = emitGowooriStageStart({
    ...stageBase,
    stage: 'finalize',
    detail: {
      applyLabel: options.applyLabel,
      autoApply: options.autoApply,
      targetMode: options.liveTarget ?? options.targetMode,
    },
  });
  let finalArtifact: GowooriArtifactRepairResult;
  let acceptanceGate: ReturnType<typeof runGowooriArtifactAcceptanceGate>;
  try {
    const preflightResult = await observeGowooriStage(
      {
        ...stageBase,
        stage: 'preflight',
        detail: {
          applyLabel: options.applyLabel,
          rawSourceChars: options.rawSource.length,
        },
      },
      async () => {
        const repairedArtifact = options.prepareArtifactSource(options.rawSource, false, options.applyLabel);
        const gate = runGowooriArtifactAcceptanceGate({
          provider: options.qualityProvider,
          prompt: options.originalPrompt,
          semanticPrompt: options.semanticPrompt,
          title: options.applyLabel,
          source: repairedArtifact.source,
          validate: validateGowooriArtifactSource,
        });

        options.recordArtifactDiagnostics(
          `${options.applyLabel} acceptanceGate preflight`,
          repairedArtifact.changed,
          gate.ok,
          gate.diagnostics,
        );

        return {
          finalArtifact: repairedArtifact,
          acceptanceGate: gate,
          ok: gate.ok,
          sourceLength: repairedArtifact.source.length,
          summary: gate.summary,
        };
      },
    );
    finalArtifact = preflightResult.finalArtifact;
    acceptanceGate = preflightResult.acceptanceGate;
    const initialArtifact = finalArtifact;
    const initialAcceptanceGate = acceptanceGate;
    let finalSummary = options.summary;
    let finalApplyLabel = options.applyLabel;
    let finalSuccessStatus = options.successStatus;
    let autoRepairAttempted = false;
    let autoRepairSucceeded = false;
    let repairBeforeDiagnosticsCount = 0;
    let repairAfterDiagnosticsCount = 0;
    let qualityDiagnostics = [...initialAcceptanceGate.diagnostics];

    if (!acceptanceGate.ok && allowAutomaticRepair) {
      autoRepairAttempted = true;
      const originalArtifact = finalArtifact;
      const originalAcceptanceGate = acceptanceGate;
      repairBeforeDiagnosticsCount = originalAcceptanceGate.diagnostics.length;
      repairAfterDiagnosticsCount = repairBeforeDiagnosticsCount;
      const repairedAttempt = await observeGowooriStage(
        {
          ...stageBase,
          stage: 'repair',
          detail: {
            diagnosticsCount: originalAcceptanceGate.diagnostics.length,
            sourceLength: originalArtifact.source.length,
          },
        },
        () =>
          options.runAutomaticRepairAttempt(
            options.semanticPrompt?.trim() || options.originalPrompt,
            originalArtifact.source,
            originalAcceptanceGate.diagnostics,
            options.qualityProvider,
          ),
      );

      if (repairedAttempt) {
        finalApplyLabel = `${options.applyLabel} repaired`;
        finalSuccessStatus = `${options.successStatus} Automatic repair succeeded.`;
        finalSummary = repairedAttempt.summary;
        finalArtifact = options.prepareArtifactSource(repairedAttempt.source, false, finalApplyLabel);
        acceptanceGate = runGowooriArtifactAcceptanceGate({
          provider: options.qualityProvider,
          prompt: options.originalPrompt,
          semanticPrompt: options.semanticPrompt,
          title: finalApplyLabel,
          source: finalArtifact.source,
          validate: validateGowooriArtifactSource,
        });
        autoRepairSucceeded = acceptanceGate.ok;
        repairAfterDiagnosticsCount = acceptanceGate.diagnostics.length;
        qualityDiagnostics = [...originalAcceptanceGate.diagnostics, ...acceptanceGate.diagnostics];
        options.recordArtifactDiagnostics(
          `${finalApplyLabel} acceptanceGate preflight`,
          finalArtifact.changed,
          acceptanceGate.ok,
          acceptanceGate.diagnostics,
        );
        options.appendRepairComparison(
          createGowooriArtifactComparison({
            context: `${options.applyLabel} automatic repair`,
            originalSource: originalArtifact.source,
            originalRenderable: originalAcceptanceGate.ok,
            originalDiagnostics: originalAcceptanceGate.diagnostics,
            repairedSource: finalArtifact.source,
            repairedRenderable: acceptanceGate.ok,
            repairedDiagnostics: acceptanceGate.diagnostics,
          }),
        );
        options.setInspectorTab('repair');
      }
    }

    const pipelineResult = prepareGowooriGeneratedArtifact({
      provider: options.qualityProvider,
      mode: options.qualityMode,
      prompt: options.originalPrompt,
      semanticPrompt: options.semanticPrompt,
      applyLabel: finalApplyLabel,
      source: finalArtifact.source,
      summary: finalSummary,
      autoApply: options.autoApply,
      startedAt,
      completedAt: Date.now(),
      autoRepairAttempted,
      autoRepairSucceeded,
      repairBeforeDiagnosticsCount,
      repairAfterDiagnosticsCount,
    });
    const validationOk = pipelineResult.validationOk;
    const willApply = pipelineResult.willApply;
    const bestEffortRenderable = pipelineResult.acceptanceGate.renderableBlockCount > 0;
    const hasBlockingDiagnostics = hasBlockingGowooriAcceptanceDiagnostics(pipelineResult.acceptanceGate);
    const sourceState = resolveGowooriArtifactActionState({
      hasSource: Boolean(finalArtifact.source),
      preflightOk: validationOk,
      applied: willApply,
      autoRepairAttempted,
      autoRepairSucceeded,
      hasPrompt: Boolean(options.originalPrompt.trim()),
      renderableBlockCount: hasBlockingDiagnostics ? 0 : pipelineResult.acceptanceGate.renderableBlockCount,
    });

    options.appendQualityLogEntry(
      createGowooriQualityLogEntry({
        ...pipelineResult.qualityLogInput,
        id: options.createMessageId(),
        normalizedChanged: initialArtifact.changed || finalArtifact.changed,
        diagnostics: qualityDiagnostics,
      }),
    );

    options.appendAssistantMessage({
      id: options.createMessageId(),
      role: 'assistant',
      text:
        validationOk || (bestEffortRenderable && !hasBlockingDiagnostics)
          ? finalSummary
          : 'Gowoori artifact failed preflight validation.',
      prompt: options.originalPrompt,
      source: finalArtifact.source,
      sourceState,
      status: validationOk
        ? options.autoApply
          ? finalSuccessStatus
          : finalSuccessStatus.replace(/ Applying to Gowoori\.?$/i, ' Waiting for apply.')
        : pipelineResult.assistantStatus,
    });
    options.setIsGenerating(false);
    options.clearAbortController();

    if (!validationOk && (!bestEffortRenderable || hasBlockingDiagnostics)) {
      options.clearLivePreviewTarget();
      options.setInspectorTab('repair');
      options.setStatus('Gowoori artifact failed preflight validation. Review Repair diagnostics.');
      const completion: GowooriChatRunCompletion = {
        ok: false,
        prompt: options.originalPrompt,
        sourceLength: finalArtifact.source.length,
        source: finalArtifact.source,
        summary: finalSummary,
        label: finalApplyLabel,
        applied: false,
        targetMode: options.liveTarget ?? options.targetMode,
        diagnostics: qualityDiagnostics,
        autoRepairAttempted,
        autoRepairSucceeded,
        error: 'Gowoori artifact failed preflight validation.',
      };
      emitGowooriStageComplete(finalizeStage, {
        ok: false,
        status: 422,
        statusText: completion.error,
        responseBody: JSON.stringify({
          ok: completion.ok,
          sourceLength: completion.sourceLength,
          diagnosticsCount: qualityDiagnostics.length,
          error: completion.error,
        }),
      });
      return completion;
    }

    options.setStatus(
      validationOk
        ? options.autoApply
          ? finalSuccessStatus
          : 'Generated. Waiting for apply.'
        : pipelineResult.assistantStatus,
    );
    if (willApply) {
      await observeGowooriStage(
        {
          ...stageBase,
          stage: 'apply',
          detail: {
            applyLabel: finalApplyLabel,
            targetMode: options.liveTarget ?? options.targetMode,
            sourceLength: finalArtifact.source.length,
          },
        },
        () => options.applySourceToGowoori(finalArtifact.source, finalApplyLabel, options.liveTarget ?? undefined),
      );
    }
    options.clearLivePreviewTarget();
    const completion: GowooriChatRunCompletion = {
      ok: true,
      prompt: options.originalPrompt,
      sourceLength: finalArtifact.source.length,
      source: finalArtifact.source,
      summary: finalSummary,
      label: finalApplyLabel,
      applied: willApply,
      targetMode: options.liveTarget ?? options.targetMode,
      diagnostics: qualityDiagnostics,
      autoRepairAttempted,
      autoRepairSucceeded,
    };
    emitGowooriStageComplete(finalizeStage, {
      ok: true,
      status: 200,
      statusText: 'OK',
      responseBody: JSON.stringify({
        ok: completion.ok,
        applied: completion.applied,
        sourceLength: completion.sourceLength,
        diagnosticsCount: qualityDiagnostics.length,
      }),
    });
    return completion;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitGowooriStageComplete(finalizeStage, {
      ok: false,
      status: 500,
      statusText: message,
      error: message,
    });
    throw error;
  }
}
