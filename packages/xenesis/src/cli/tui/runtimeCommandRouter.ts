import { type ApprovalMode, type ProviderName, providerNames, type XenesisConfig } from '../../config/index.js';
import type { AgentMessage } from '../../core/messages.js';
import {
  formatAgentRuntimeCommitments,
  formatAgentRuntimeMemory,
  formatAgentRuntimeParity,
  formatAgentRuntimeSessions,
  formatAgentRuntimeStatus,
  resolveAgentRuntimeState,
} from '../../runtime/agentRuntimeState.js';
import { createToolManifest, renderToolManifestLine } from '../../tools/manifest.js';
import type { ToolRegistry } from '../../tools/index.js';
import { getTuiCommandPaletteHelp } from './commandCatalog.js';
import type { TuiRuntimeParsedArgs } from './runtimeTypes.js';
import type { TuiState } from './state.js';

export type TuiRuntimeCommandParsedArgs = Pick<TuiRuntimeParsedArgs, 'provider' | 'model' | 'approvalMode'>;

export interface TuiRuntimeCommandRouterOptions<Parsed extends TuiRuntimeCommandParsedArgs> {
  parsed: Parsed;
  env: NodeJS.ProcessEnv;
  chatSessionId: string;
  getState(): TuiState;
  setRuntimeState(): void;
  notify(message: string, kind?: 'info' | 'warning' | 'error'): void;
  setChatHistoryMessages(messages: AgentMessage[]): void;
  resetVisibleState(): void;
  loadRuntimeConfig(): Promise<XenesisConfig>;
  createRuntimeTools(config: XenesisConfig, env: NodeJS.ProcessEnv): Promise<ToolRegistry>;
  selectTools(config: XenesisConfig, tools: ToolRegistry): ToolRegistry;
  isProviderName(value: string): value is ProviderName;
  isApprovalMode(value: string): value is ApprovalMode;
}

export function createTuiRuntimeCommandRouter<Parsed extends TuiRuntimeCommandParsedArgs>(
  options: TuiRuntimeCommandRouterOptions<Parsed>,
) {
  const tuiCommandHelp = getTuiCommandPaletteHelp();

  return {
    async handle(input: string) {
      if (input === '/help' || input === '/commands') {
        options.notify(tuiCommandHelp);
        return true;
      }
      if (input === '/exit' || input === '/quit') {
        options.notify('Exit requested. The interactive renderer closes these commands immediately.');
        return true;
      }
      if (input === '/status') {
        options.setRuntimeState();
        const runtimeConfig = await options.loadRuntimeConfig();
        const runtimeState = await resolveAgentRuntimeState({ config: runtimeConfig, env: options.env });
        const state = options.getState();
        options.notify(
          `${formatAgentRuntimeStatus(runtimeState)} session=${state.sessionContext.activeSessionId ?? 'none'} resumedFrom=${state.sessionContext.resumedFromSessionId ?? 'none'} context=${state.sessionContext.historyMessageCount ?? 0} turns=${state.turns}`,
        );
        return true;
      }
      if (input === '/provider') {
        options.setRuntimeState();
        options.notify(`provider=${options.getState().runtime.provider}`);
        return true;
      }
      if (input.startsWith('/provider ')) {
        const provider = input.slice('/provider '.length).trim();
        if (!options.isProviderName(provider)) {
          options.notify(`Command "/provider" requires one of ${providerNames.join(', ')}.`, 'error');
          return true;
        }
        options.parsed.provider = provider;
        options.setRuntimeState();
        options.notify(`Provider set to ${provider}.`);
        return true;
      }
      if (input === '/workspace') {
        options.setRuntimeState();
        options.notify(`workspace=${options.getState().runtime.workspace}`);
        return true;
      }
      if (input === '/tools') {
        const runtimeConfig = await options.loadRuntimeConfig();
        const tools = Array.from(
          options.selectTools(runtimeConfig, await options.createRuntimeTools(runtimeConfig, options.env)).values(),
        ).sort((left, right) => left.name.localeCompare(right.name));
        const lines = tools.map((tool) => renderToolManifestLine(createToolManifest(tool)));
        options.notify(lines.length === 0 ? 'tools: none' : ['tools:', ...lines].join('\n'));
        return true;
      }
      if (input === '/session') {
        const state = options.getState();
        options.notify(
          `session=${state.sessionContext.activeSessionId ?? options.chatSessionId} latest=${state.sessionContext.lastSessionId ?? 'none'} resumedFrom=${state.sessionContext.resumedFromSessionId ?? 'none'} status=${state.status} turns=${state.turns} context=${state.sessionContext.historyMessageCount}`,
        );
        return true;
      }
      if (input === '/sessions' || input === '/sessions list') {
        const runtimeConfig = await options.loadRuntimeConfig();
        options.notify(formatAgentRuntimeSessions(await resolveAgentRuntimeState({ config: runtimeConfig, env: options.env })));
        return true;
      }
      if (input === '/memory' || input.startsWith('/memory ')) {
        const runtimeConfig = await options.loadRuntimeConfig();
        const runtimeState = await resolveAgentRuntimeState({ config: runtimeConfig, env: options.env });
        options.notify(formatAgentRuntimeMemory(runtimeState, runtimeConfig.extensions.memory.enabled));
        return true;
      }
      if (input === '/parity') {
        const runtimeConfig = await options.loadRuntimeConfig();
        options.notify(formatAgentRuntimeParity(await resolveAgentRuntimeState({ config: runtimeConfig, env: options.env })));
        return true;
      }
      if (input === '/commitments') {
        const runtimeConfig = await options.loadRuntimeConfig();
        options.notify(
          formatAgentRuntimeCommitments(await resolveAgentRuntimeState({ config: runtimeConfig, env: options.env })),
        );
        return true;
      }
      if (input === '/clear' || input === '/reset') {
        options.setChatHistoryMessages([]);
        options.resetVisibleState();
        options.notify('Visible transcript and conversation context cleared.');
        return true;
      }
      if (input.startsWith('/model ')) {
        options.parsed.model = input.slice('/model '.length).trim();
        options.setRuntimeState();
        options.notify(`Model set to ${options.parsed.model}.`);
        return true;
      }
      if (input.startsWith('/approval ')) {
        const approvalMode = input.slice('/approval '.length).trim();
        if (!options.isApprovalMode(approvalMode)) {
          options.notify('Command "/approval" requires safe, auto, or readonly.', 'error');
          return true;
        }
        options.parsed.approvalMode = approvalMode;
        options.setRuntimeState();
        options.notify(`Approval mode set to ${approvalMode}.`);
        return true;
      }
      return false;
    },
  };
}
