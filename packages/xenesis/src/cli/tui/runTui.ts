import { getTuiInteractiveCommandSummary, renderTuiCommandHelpLines } from './commandCatalog.js';
import { createTuiState, renderTuiSnapshot, type TuiRuntimeSummary, type TuiState } from './state.js';

export function createInitialTuiState(runtime: TuiRuntimeSummary) {
  return createTuiState(runtime);
}

export function renderTuiFrameLines(state: TuiState, options: { interactive: boolean } = { interactive: false }) {
  const lines = renderTuiSnapshot(state).split('\n');
  lines.push('');
  if (options.interactive) {
    lines.push(`Commands: ${getTuiInteractiveCommandSummary()}`);
    lines.push('Type a prompt and press Enter.');
  } else {
    lines.push('Preview mode: run without --print from a TTY to start the full-screen terminal UI.');
  }
  return lines;
}

export function renderTuiHelpLines() {
  return [
    'Usage: xenesis tui [options]',
    '',
    'Starts the Xenesis full-screen terminal UI for chat-oriented agent runs.',
    '',
    'Options:',
    '  --print          Print a deterministic TUI preview and exit.',
    '  --config <path>  Use a config file.',
    '  --cwd <path>     Select workspace root.',
    '  --provider <name> Override provider.',
    '  --model <name>   Override model.',
    '',
    ...renderTuiCommandHelpLines(),
  ];
}
