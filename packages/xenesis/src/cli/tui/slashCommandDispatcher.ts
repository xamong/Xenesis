import { type ParsedSlashCommand, parseSlashCommandLine } from '../slashCommands.js';

export interface TuiSlashCommandRuntimeRouter {
  handle(input: string): Promise<boolean> | boolean;
}

export interface TuiSlashCommandAgentRouter {
  handle(input: string, command: ParsedSlashCommand): Promise<boolean> | boolean;
}

export interface TuiSlashCommandImageRunner {
  run(input: string, commandName: 'image' | 'xcon-image', rest: string): Promise<void>;
}

export interface TuiSlashCommandDispatcherOptions {
  runtimeCommandRouter: TuiSlashCommandRuntimeRouter;
  outputCommandHandler(input: string): Promise<boolean> | boolean;
  imageCommandRunner: TuiSlashCommandImageRunner;
  agentCommandRouter: TuiSlashCommandAgentRouter;
  appendInputHistory(line: string): Promise<void>;
  notify(message: string, kind?: 'info' | 'warning' | 'error'): void;
}

export function createTuiSlashCommandDispatcher(options: TuiSlashCommandDispatcherOptions) {
  return {
    async dispatch(input: string) {
      if (await options.runtimeCommandRouter.handle(input)) {
        return true;
      }

      const command = parseSlashCommandLine(input);
      if (!command) return false;

      if (command.name === 'output' && (await options.outputCommandHandler(input))) {
        return true;
      }
      if (command.name === 'image' || command.name === 'xcon-image') {
        await options.appendInputHistory(input);
        await options.imageCommandRunner.run(input, command.name, command.rest);
        return true;
      }
      if (await options.agentCommandRouter.handle(input, command)) {
        return true;
      }

      options.notify(`Unknown or unsupported TUI slash command "/${command.name}". Type /help.`, 'error');
      return true;
    },
  };
}
