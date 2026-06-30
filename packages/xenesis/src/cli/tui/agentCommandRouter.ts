import { findPendingDurableApproval } from '../../core/agentSafety/index.js';
import type { AgentMessage } from '../../core/messages.js';
import { eventsToMessages, readSessionLog } from '../../sessions/index.js';
import type { ParsedSlashCommand } from '../slashCommands.js';
import type { TuiRuntimeIo, TuiSessionWriterSetter } from './runtimeTypes.js';
import { restoreTuiApproval, setTuiSessionContext, type TuiState } from './state.js';

export interface TuiAgentCommandParsedArgs {
  command?: string;
  prompt?: string;
  sessionCommand?: string;
  sessionId?: string;
}

export interface TuiAgentCommandRouterOptions<Parsed extends TuiAgentCommandParsedArgs> {
  parsed: Parsed;
  io: TuiRuntimeIo;
  getState(): TuiState;
  setState(state: TuiState): void;
  publish(): void;
  notify(message: string, kind?: 'info' | 'warning' | 'error'): void;
  getLastSessionId(): string | undefined;
  getChatHistoryMessages(): AgentMessage[];
  setChatHistoryMessages(messages: AgentMessage[]): void;
  resetVisibleState(): void;
  setTuiSessionWriter: TuiSessionWriterSetter;
  appendInputHistory(line: string): Promise<void>;
  setCapturedCommandOutput(command: string, stdout: string[], stderr: string[]): void;
  loadRuntimeConfig(): Promise<{ xenesisHome: string }>;
  runCapturedSlashCommand(
    input: string,
    io: TuiRuntimeIo,
    setSessionWriter: TuiSessionWriterSetter,
    getLastSessionId: () => string | undefined,
    resetVisibleState: () => void,
  ): Promise<void>;
  runTuiAgentPrompt(
    runParsed: Parsed,
    visibleInput: string,
    prompt: string,
    historyMessages: AgentMessage[],
  ): Promise<void>;
}

export function createTuiAgentCommandRouter<Parsed extends TuiAgentCommandParsedArgs>(
  options: TuiAgentCommandRouterOptions<Parsed>,
) {
  const capturedTuiSlashCommandNames = new Set(['memory', 'skills', 'plugins', 'sessions', 'compact']);

  const runCapturedTuiSlashCommand = async (input: string) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const capturedIo: TuiRuntimeIo = {
      ...options.io,
      stdout: (line) => stdout.push(line),
      stderr: (line) => stderr.push(line),
    };
    try {
      await options.runCapturedSlashCommand(
        input,
        capturedIo,
        options.setTuiSessionWriter,
        () => options.getLastSessionId(),
        () => {
          options.setChatHistoryMessages([]);
          options.resetVisibleState();
        },
      );
    } catch (error) {
      stderr.push(`error: ${errorMessage(error)}`);
    }
    options.setCapturedCommandOutput(input, stdout, stderr);
  };

  return {
    async handle(input: string, command: ParsedSlashCommand) {
      if (capturedTuiSlashCommandNames.has(command.name)) {
        await options.appendInputHistory(input);
        await runCapturedTuiSlashCommand(input);
        return true;
      }
      if (command?.name === 'plan' || command?.name === 'work') {
        const prompt = command.rest.trim();
        if (!prompt) {
          options.notify(`Command "/${command.name}" requires a prompt.`, 'error');
          return true;
        }
        const mode = command.name === 'plan' ? 'plan' : 'work';
        await options.runTuiAgentPrompt(
          {
            ...options.parsed,
            command: mode,
            prompt,
          } as Parsed,
          input,
          prompt,
          options.getChatHistoryMessages(),
        );
        return true;
      }
      if (command?.name === 'resume') {
        const [sessionId, ...promptParts] = command.args;
        const prompt = promptParts.join(' ').trim();
        if (!sessionId) {
          options.notify('Command "/resume" requires a session id.', 'error');
          return true;
        }
        try {
          const resumeConfig = await options.loadRuntimeConfig();
          const historyEvents = await readSessionLog(resumeConfig.xenesisHome, validateSessionId(sessionId));
          const historyMessages = eventsToMessages(historyEvents);
          if (!prompt) {
            const pendingApproval = findPendingDurableApproval(historyEvents);
            if (!pendingApproval) {
              options.notify(`No pending approval found for session ${sessionId}.`, 'warning');
              return true;
            }
            options.setState(
              restoreTuiApproval(
                setTuiSessionContext(options.getState(), {
                  resumedFromSessionId: sessionId,
                  historyMessageCount: historyMessages.length,
                }),
                pendingApproval,
              ),
            );
            options.publish();
            return true;
          }
          options.setState(
            setTuiSessionContext(options.getState(), {
              resumedFromSessionId: sessionId,
              historyMessageCount: historyMessages.length,
            }),
          );
          options.publish();
          await options.runTuiAgentPrompt(
            {
              ...options.parsed,
              command: 'sessions',
              sessionCommand: 'resume',
              sessionId,
              prompt,
            } as Parsed,
            input,
            prompt,
            historyMessages,
          );
        } catch (error) {
          options.notify(`Command "/resume" failed: ${errorMessage(error)}`, 'error');
        }
        return true;
      }
      return false;
    },
  };
}

function validateSessionId(sessionId: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(sessionId)) {
    throw new Error(`Invalid session id: ${sessionId}`);
  }
  return sessionId;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
