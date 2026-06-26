import { createTuiState, renderTuiSnapshot, type TuiRuntimeSummary, type TuiState } from "./state.js";

export function createInitialTuiState(runtime: TuiRuntimeSummary) {
  return createTuiState(runtime);
}

export function renderTuiFrameLines(state: TuiState, options: { interactive: boolean } = { interactive: false }) {
  const lines = renderTuiSnapshot(state).split("\n");
  lines.push("");
  if (options.interactive) {
    lines.push("Commands: /help, /commands, /status, /provider <name>, /workspace, /tools, /memory, /skills, /plugins, /sessions, /compact, /output, /plan, /work, /resume, /exit");
    lines.push("Type a prompt and press Enter.");
  } else {
    lines.push("Preview mode: run without --print from a TTY to start the full-screen terminal UI.");
  }
  return lines;
}

export function renderTuiHelpLines() {
  return [
    "Usage: xenesis tui [options]",
    "",
    "Starts the Xenesis full-screen terminal UI for chat-oriented agent runs.",
    "",
    "Options:",
    "  --print          Print a deterministic TUI preview and exit.",
    "  --config <path>  Use a config file.",
    "  --cwd <path>     Select workspace root.",
    "  --provider <name> Override provider.",
    "  --model <name>   Override model.",
    "",
    "TUI commands:",
    "  /help                         Show TUI commands.",
    "  /commands                     Alias for /help.",
    "  /status                       Redraw provider, model, approval mode, and workspace.",
    "  /provider                     Show current provider.",
    "  /provider <name>              Change provider for subsequent prompts.",
    "  /workspace                    Show the active workspace.",
    "  /tools                        List available runtime tools.",
    "  /session                      Show TUI session id, status, and turns.",
    "  /clear                        Clear visible TUI state and conversation context.",
    "  /reset                        Alias for /clear.",
    "  /model <name>                 Change model for subsequent prompts.",
    "  /approval <safe|auto|readonly> Change approval mode for subsequent prompts.",
    "  /memory <add|list|search>     Save, list, or search workspace memory.",
    "  /skills <list|show>           List or show configured skills.",
    "  /plugins list                 List configured and installed plugins.",
    "  /sessions list                List session logs.",
    "  /compact [session-id]         Compact the latest or selected session.",
    "  /output <up|down|top|bottom|expand|compact|clear|save>",
    "                                Scroll, expand, clear, or save latest command output.",
    "  /plan <prompt>                Run one prompt in plan mode.",
    "  /work <prompt>                Run one prompt in work mode.",
    "  /resume <session-id> <prompt> Continue from a prior session.",
    "  /exit                         Exit the TUI.",
    "  /quit                         Alias for /exit."
  ];
}
