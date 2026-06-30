import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseSlashCommandLine } from '../slashCommands.js';
import {
  clearTuiCommandOutput,
  scrollTuiCommandOutput,
  setTuiCommandOutputExpanded,
  setTuiCommandOutputOffset,
  setTuiCommandOutputSavedPath,
  type TuiState,
} from './state.js';

export interface TuiOutputCommandHandlerOptions {
  getState(): TuiState;
  setState(state: TuiState): void;
  publish(): void;
  notify(message: string, kind?: 'info' | 'warning' | 'error'): void;
  statePath(...parts: string[]): string;
}

export function createTuiOutputCommandHandler(options: TuiOutputCommandHandlerOptions) {
  const outputScrollStep = 4;
  const bottomOutputOffset = () => {
    const state = options.getState();
    if (!state.commandOutput) return 0;
    const visibleLimit = state.commandOutput.expanded ? 20 : 6;
    return Math.max(0, state.commandOutput.lines.length - visibleLimit);
  };
  const saveCommandOutput = async () => {
    const state = options.getState();
    if (!state.commandOutput) {
      options.notify('No command output to save.', 'warning');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = options.statePath('outputs', `xenesis-output-${timestamp}.txt`);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      [
        `command: ${state.commandOutput.command}`,
        `kind: ${state.commandOutput.kind}`,
        '',
        ...state.commandOutput.lines,
      ].join('\n'),
      'utf8',
    );
    options.setState(setTuiCommandOutputSavedPath(options.getState(), outputPath));
    options.publish();
    options.notify(`Output saved: ${outputPath}`);
  };

  return async function handleOutputCommand(input: string) {
    const command = parseSlashCommandLine(input);
    if (!command || command.name !== 'output') return false;
    const action = command.args[0];
    if (!options.getState().commandOutput && action !== 'clear') {
      options.notify('No command output to control.', 'warning');
      return true;
    }
    if (!action) {
      options.notify('Use /output up, down, top, bottom, expand, compact, clear, or save.');
      return true;
    }
    if (action === 'up') {
      options.setState(scrollTuiCommandOutput(options.getState(), -outputScrollStep));
      options.publish();
      return true;
    }
    if (action === 'down') {
      options.setState(scrollTuiCommandOutput(options.getState(), outputScrollStep));
      options.publish();
      return true;
    }
    if (action === 'top') {
      options.setState(setTuiCommandOutputOffset(options.getState(), 0));
      options.publish();
      return true;
    }
    if (action === 'bottom') {
      options.setState(setTuiCommandOutputOffset(options.getState(), bottomOutputOffset()));
      options.publish();
      return true;
    }
    if (action === 'expand') {
      options.setState(setTuiCommandOutputExpanded(options.getState(), true));
      options.publish();
      return true;
    }
    if (action === 'compact' || action === 'collapse') {
      options.setState(setTuiCommandOutputExpanded(options.getState(), false));
      options.publish();
      return true;
    }
    if (action === 'clear') {
      options.setState(clearTuiCommandOutput(options.getState()));
      options.publish();
      options.notify('Output cleared.');
      return true;
    }
    if (action === 'save') {
      await saveCommandOutput();
      return true;
    }
    options.notify('Command "/output" requires up, down, top, bottom, expand, compact, clear, or save.', 'error');
    return true;
  };
}
