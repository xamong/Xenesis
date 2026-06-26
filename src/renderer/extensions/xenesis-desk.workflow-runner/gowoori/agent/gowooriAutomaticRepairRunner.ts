import type { GowooriChatSettings, TerminalApi } from '../../../../../shared/types';
import type { GowooriArtifactRepairDiagnostic } from './gowooriArtifactRepair';
import {
  createGowooriAutoRepairPrompt,
  type GowooriApiRuntimeResolution,
  runGowooriProviderArtifact,
} from './gowooriChatRunController';
import type { GowooriPromptFileWriter } from './gowooriCliRunner';
import type { GowooriArtifactResult, GowooriProvider } from './gowooriProviders';

type GowooriAutomaticRepairTerminalApi = Pick<
  TerminalApi,
  'spawn' | 'write' | 'onData' | 'onExit' | 'kill' | 'getSettings'
>;

export interface GowooriAutomaticRepairAttemptOptions {
  originalPrompt: string;
  semanticPrompt?: string;
  source: string;
  diagnostics: GowooriArtifactRepairDiagnostic[];
  repairProvider: GowooriProvider;
  providerSettings: GowooriChatSettings;
  terminalApi: GowooriAutomaticRepairTerminalApi;
  resolveApiRuntime: () => Promise<GowooriApiRuntimeResolution>;
  appendRawStream: (chunk: string) => void;
  appendSystemMessage: (text: string, detail?: string) => void;
  setStatus: (status: string) => void;
  setAbortController: (controller: AbortController) => void;
  writePromptFile?: GowooriPromptFileWriter;
}

export async function runGowooriAutomaticRepairAttempt(
  options: GowooriAutomaticRepairAttemptOptions,
): Promise<GowooriArtifactResult | null> {
  const repairPrompt = createGowooriAutoRepairPrompt(options.originalPrompt, options.source, options.diagnostics);

  options.setStatus('Gowoori preflight failed. Requesting one automatic repair...');
  options.appendSystemMessage(
    'Gowoori preflight failed. Sending one automatic repair request to the selected provider.',
    options.diagnostics.map((item) => `${item.severity}: ${item.message}`).join('\n'),
  );
  options.appendRawStream(['', '', '[Automatic Gowoori repair request]', repairPrompt, ''].join('\n'));

  return runGowooriProviderArtifact({
    provider: options.repairProvider,
    mode: 'repair',
    prompt: repairPrompt,
    semanticPrompt: options.semanticPrompt?.trim() || options.originalPrompt,
    providerSettings: options.providerSettings,
    terminalApi: options.terminalApi,
    resolveApiRuntime: options.resolveApiRuntime,
    onAbortController: options.setAbortController,
    onChunk: options.appendRawStream,
    onStatus: options.setStatus,
    cliStatus: (command) => `${command} is repairing the Gowoori artifact...`,
    apiStatus: (profileName) => `BYOK API is repairing with AI profile ${profileName}...`,
    writePromptFile: options.writePromptFile,
  });
}
