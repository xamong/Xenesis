import type { GowooriChatSettings, TerminalApi } from '../../../../../shared/types';
import type { GowooriArtifactRepairDiagnostic, GowooriArtifactRepairResult } from './gowooriArtifactRepair';
import { validateGowooriArtifactSource } from './gowooriArtifactValidation';
import { type GowooriApiRuntimeResolution, runGowooriProviderArtifact } from './gowooriChatRunController';
import type { GowooriPromptFileWriter } from './gowooriCliRunner';
import { GOWOORI_GENERATION_ACCEPTANCE_CASES, runGowooriArtifactAcceptanceGate } from './gowooriGenerationAcceptance';
import type { GowooriArtifactResult, GowooriProvider } from './gowooriProviders';
import { createGowooriQualityLogEntry, type GowooriQualityLogEntry } from './gowooriQualityLog';

type GowooriBenchmarkTerminalApi = Pick<TerminalApi, 'spawn' | 'write' | 'onData' | 'onExit' | 'kill' | 'getSettings'>;

export interface GowooriProviderAcceptanceBenchmarkOptions {
  provider: GowooriProvider;
  providerLabel: string;
  providerSettings: GowooriChatSettings;
  terminalApi: GowooriBenchmarkTerminalApi;
  resolveApiRuntime: () => Promise<GowooriApiRuntimeResolution>;
  prepareArtifactSource: (source: string, allowPartial: boolean, context: string) => GowooriArtifactRepairResult;
  runAutomaticRepairAttempt: (
    originalPrompt: string,
    source: string,
    diagnostics: GowooriArtifactRepairDiagnostic[],
    repairProvider: GowooriProvider,
  ) => Promise<GowooriArtifactResult | null>;
  appendRawStream: (chunk: string) => void;
  setStatus: (status: string) => void;
  setAbortController: (controller: AbortController) => void;
  writePromptFile?: GowooriPromptFileWriter;
  appendSystemMessage: (text: string, detail?: string) => void;
  createMessageId: () => string;
}

export interface GowooriProviderAcceptanceBenchmarkResult {
  provider: GowooriProvider;
  providerLabel: string;
  passed: number;
  total: number;
  entries: GowooriQualityLogEntry[];
}

export async function runGowooriProviderAcceptanceBenchmark(
  options: GowooriProviderAcceptanceBenchmarkOptions,
): Promise<GowooriProviderAcceptanceBenchmarkResult> {
  const total = GOWOORI_GENERATION_ACCEPTANCE_CASES.length;
  let passed = 0;
  const entries: GowooriQualityLogEntry[] = [];

  options.setStatus(`Benchmarking ${options.providerLabel} with ${total} standard Gowoori prompt(s)...`);
  options.appendSystemMessage(
    `Running Gowoori acceptance benchmark for ${options.providerLabel}.`,
    GOWOORI_GENERATION_ACCEPTANCE_CASES.map((testCase) => `- ${testCase.title}`).join('\n'),
  );

  for (let index = 0; index < total; index += 1) {
    const testCase = GOWOORI_GENERATION_ACCEPTANCE_CASES[index];
    const startedAt = Date.now();
    const label = `Gowoori benchmark: ${testCase.title}`;
    options.setStatus(`Benchmarking ${options.providerLabel}: ${index + 1}/${total} ${testCase.title}`);
    options.appendRawStream(['', `[Benchmark ${index + 1}/${total}] ${testCase.id}`, testCase.prompt, ''].join('\n'));

    try {
      const artifact = await runGowooriProviderArtifact({
        provider: options.provider,
        mode: 'generate',
        prompt: testCase.prompt,
        providerSettings: options.providerSettings,
        terminalApi: options.terminalApi,
        resolveApiRuntime: options.resolveApiRuntime,
        onAbortController: options.setAbortController,
        onChunk: options.appendRawStream,
        onStatus: options.setStatus,
        apiStatus: (profileName) => `Benchmarking BYOK with AI profile ${profileName}: ${testCase.title}`,
        writePromptFile: options.writePromptFile,
      });

      let finalArtifact = options.prepareArtifactSource(artifact.source, false, label);
      let acceptanceGate = runGowooriArtifactAcceptanceGate({
        provider: options.provider,
        prompt: testCase.prompt,
        title: testCase.title,
        source: finalArtifact.source,
        requiredText: testCase.requiredText,
        validate: validateGowooriArtifactSource,
      });
      const originalAcceptanceGate = acceptanceGate;
      let finalSummary = artifact.summary;
      let autoRepairAttempted = false;
      let autoRepairSucceeded = false;
      let repairBeforeDiagnosticsCount = 0;
      let repairAfterDiagnosticsCount = 0;
      let diagnostics = [...acceptanceGate.diagnostics];

      if (!acceptanceGate.ok) {
        autoRepairAttempted = true;
        repairBeforeDiagnosticsCount = acceptanceGate.diagnostics.length;
        repairAfterDiagnosticsCount = repairBeforeDiagnosticsCount;
        const repairedAttempt = await options.runAutomaticRepairAttempt(
          testCase.prompt,
          finalArtifact.source,
          acceptanceGate.diagnostics,
          options.provider,
        );

        if (repairedAttempt) {
          finalSummary = repairedAttempt.summary;
          finalArtifact = options.prepareArtifactSource(repairedAttempt.source, false, `${label} repaired`);
          acceptanceGate = runGowooriArtifactAcceptanceGate({
            provider: options.provider,
            prompt: testCase.prompt,
            title: `${testCase.title} repaired`,
            source: finalArtifact.source,
            requiredText: testCase.requiredText,
            validate: validateGowooriArtifactSource,
          });
          autoRepairSucceeded = acceptanceGate.ok;
          repairAfterDiagnosticsCount = acceptanceGate.diagnostics.length;
          diagnostics = [...originalAcceptanceGate.diagnostics, ...acceptanceGate.diagnostics];
        }
      }

      if (acceptanceGate.ok) passed += 1;
      entries.push(
        createGowooriQualityLogEntry({
          id: options.createMessageId(),
          provider: options.provider,
          mode: 'benchmark',
          promptTitle: testCase.title,
          startedAt,
          completedAt: Date.now(),
          source: finalArtifact.source,
          normalizedChanged: finalArtifact.changed,
          preflightOk: acceptanceGate.ok,
          autoRepairAttempted,
          autoRepairSucceeded,
          applyRequested: false,
          applied: false,
          repairBeforeDiagnosticsCount,
          repairAfterDiagnosticsCount,
          diagnostics,
          summary: finalSummary,
        }),
      );
      options.appendRawStream(`[Benchmark result] ${testCase.id}: ${acceptanceGate.ok ? 'PASS' : 'FAIL'}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      entries.push(
        createGowooriQualityLogEntry({
          id: options.createMessageId(),
          provider: options.provider,
          mode: 'benchmark',
          promptTitle: testCase.title,
          startedAt,
          completedAt: Date.now(),
          source: '',
          normalizedChanged: false,
          preflightOk: false,
          autoRepairAttempted: false,
          autoRepairSucceeded: false,
          applyRequested: false,
          applied: false,
          providerError: true,
          diagnostics: [{ severity: 'error', message }],
          summary: 'Provider benchmark failed before artifact validation.',
        }),
      );
      options.appendRawStream(`[Benchmark error] ${testCase.id}: ${message}\n`);
    }
  }

  options.appendSystemMessage(`${options.providerLabel} acceptance benchmark completed: ${passed}/${total} passed.`);
  options.setStatus(`${options.providerLabel} acceptance benchmark completed: ${passed}/${total} passed.`);

  return {
    provider: options.provider,
    providerLabel: options.providerLabel,
    passed,
    total,
    entries,
  };
}
