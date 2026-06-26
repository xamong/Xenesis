import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  displayXenesisStatePath,
  xenesisStatePath,
  type XenesisConfig
} from "../config/index.js";

export const preferenceCommandNames = [
  "clear",
  "color",
  "theme",
  "vim",
  "keybindings",
  "statusline",
  "output-style",
  "exit"
] as const;

export type PreferenceCommandName = typeof preferenceCommandNames[number];

const agentColors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"] as const;
type AgentColor = typeof agentColors[number];

const resetColorAliases = new Set(["default", "reset", "none", "gray", "grey"]);

const themeSettings = [
  "auto",
  "dark",
  "light",
  "dark-daltonized",
  "light-daltonized",
  "dark-ansi",
  "light-ansi"
] as const;
type ThemeSetting = typeof themeSettings[number];

type EditorMode = "normal" | "vim";

interface PreferenceState {
  color?: AgentColor | null;
  theme?: ThemeSetting | null;
  editorMode?: EditorMode;
  statuslinePrompt?: string | null;
  updatedAt?: string;
}

export interface PreferenceCommandInput {
  command: PreferenceCommandName;
  args?: string[];
  json?: boolean;
}

export interface PreferenceCommandResult {
  exitCode: number;
  stdout: string[];
  stderr: string[];
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isPreferenceCommandName(value: unknown): value is PreferenceCommandName {
  return typeof value === "string" && (preferenceCommandNames as readonly string[]).includes(value);
}

function preferenceStatePath(config: XenesisConfig) {
  return xenesisStatePath(config.xenesisHome, "cli_preferences.json");
}

function displayPreferenceStatePath(config: XenesisConfig) {
  return displayXenesisStatePath(config.xenesisHome, preferenceStatePath(config));
}

function chatHistoryPath(config: XenesisConfig) {
  return xenesisStatePath(config.xenesisHome, "chat_history");
}

function keybindingsPath(config: XenesisConfig) {
  return xenesisStatePath(config.xenesisHome, "keybindings.json");
}

function normalizePreferenceState(raw: unknown): PreferenceState {
  if (!isRecord(raw)) return {};
  const state: PreferenceState = {};
  if (typeof raw.color === "string" && (agentColors as readonly string[]).includes(raw.color)) {
    state.color = raw.color as AgentColor;
  } else if (raw.color === null) {
    state.color = null;
  }
  if (typeof raw.theme === "string" && (themeSettings as readonly string[]).includes(raw.theme)) {
    state.theme = raw.theme as ThemeSetting;
  } else if (raw.theme === null) {
    state.theme = null;
  }
  if (raw.editorMode === "vim") {
    state.editorMode = "vim";
  } else if (raw.editorMode === "normal" || raw.editorMode === "emacs") {
    state.editorMode = "normal";
  }
  if (typeof raw.statuslinePrompt === "string" && raw.statuslinePrompt.trim().length > 0) {
    state.statuslinePrompt = raw.statuslinePrompt.trim();
  } else if (raw.statuslinePrompt === null) {
    state.statuslinePrompt = null;
  }
  if (typeof raw.updatedAt === "string") {
    state.updatedAt = raw.updatedAt;
  }
  return state;
}

async function readPreferenceState(config: XenesisConfig): Promise<PreferenceState> {
  try {
    return normalizePreferenceState(JSON.parse(await readFile(preferenceStatePath(config), "utf8")));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return {};
    throw error;
  }
}

async function writePreferenceState(config: XenesisConfig, state: PreferenceState) {
  const path = preferenceStatePath(config);
  const nextState: PreferenceState = {
    ...state,
    updatedAt: new Date().toISOString()
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  return nextState;
}

function ok(stdout: string[]): PreferenceCommandResult {
  return {
    exitCode: 0,
    stdout,
    stderr: []
  };
}

function jsonOk(value: unknown): PreferenceCommandResult {
  return ok([JSON.stringify(value)]);
}

function error(message: string): PreferenceCommandResult {
  return {
    exitCode: 1,
    stdout: [],
    stderr: [`error: ${message}`]
  };
}

function availableColorText() {
  return [...agentColors, "default"].join(", ");
}

function availableThemeText() {
  return themeSettings.join(", ");
}

function currentColor(state: PreferenceState) {
  return state.color ?? "default";
}

function currentTheme(state: PreferenceState) {
  return state.theme ?? "default";
}

function currentEditorMode(state: PreferenceState): EditorMode {
  return state.editorMode === "vim" ? "vim" : "normal";
}

function vimHint(mode: EditorMode) {
  return mode === "vim"
    ? "Use Escape key to toggle between INSERT and NORMAL modes."
    : "Using standard keyboard bindings.";
}

function defaultStatuslinePrompt() {
  return "Infer a Xenesis status line from the local shell prompt.";
}

function keybindingsTemplate() {
  return `${JSON.stringify({
    version: 1,
    bindings: [
      { key: "ctrl+c", command: "interrupt" },
      { key: "ctrl+d", command: "exit" },
      { key: "ctrl+l", command: "clear" }
    ]
  }, null, 2)}\n`;
}

async function runClearCommand(config: XenesisConfig, json: boolean): Promise<PreferenceCommandResult> {
  const path = chatHistoryPath(config);
  let chatHistory = "none" as "cleared" | "none";
  try {
    await unlink(path);
    chatHistory = "cleared";
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") throw error;
  }

  const payload = {
    command: "clear",
    localOnly: true,
    activeConversation: false,
    chatHistory,
    sessionsCleared: false,
    providerCalls: false,
    path: displayXenesisStatePath(config.xenesisHome, path),
    sourceEquivalent: false
  };

  if (json) return jsonOk(payload);
  return ok([
    "clear: activeConversation=false",
    `clear: chatHistory=${chatHistory}`,
    "clear: sessionsCleared=false",
    "clear: providerCalls=false"
  ]);
}

async function runColorCommand(config: XenesisConfig, args: string[], json: boolean): Promise<PreferenceCommandResult> {
  const state = await readPreferenceState(config);
  const requested = args.join(" ").trim().toLowerCase();

  if (!requested || requested === "current" || requested === "show" || requested === "status") {
    const payload = {
      command: "color",
      current: currentColor(state),
      available: [...agentColors],
      resetAliases: Array.from(resetColorAliases).sort(),
      statePath: displayPreferenceStatePath(config),
      localOnly: true,
      sourceEquivalent: false
    };
    if (json) return jsonOk(payload);
    return ok([
      `color: current=${payload.current}`,
      `color: available=${availableColorText()}`
    ]);
  }

  if (resetColorAliases.has(requested)) {
    const nextState = await writePreferenceState(config, {
      ...state,
      color: null
    });
    const payload = {
      command: "color",
      set: "default",
      current: currentColor(nextState),
      statePath: displayPreferenceStatePath(config),
      localOnly: true,
      sourceEquivalent: false
    };
    if (json) return jsonOk(payload);
    return ok([
      "color: set=default",
      `color: statePath=${payload.statePath}`
    ]);
  }

  if (!(agentColors as readonly string[]).includes(requested)) {
    return error(`invalid color "${requested}". Available colors: ${availableColorText()}.`);
  }

  const nextState = await writePreferenceState(config, {
    ...state,
    color: requested as AgentColor
  });
  const payload = {
    command: "color",
    set: currentColor(nextState),
    current: currentColor(nextState),
    statePath: displayPreferenceStatePath(config),
    localOnly: true,
    sourceEquivalent: false
  };
  if (json) return jsonOk(payload);
  return ok([
    `color: set=${payload.set}`,
    `color: statePath=${payload.statePath}`
  ]);
}

async function runThemeCommand(config: XenesisConfig, args: string[], json: boolean): Promise<PreferenceCommandResult> {
  const state = await readPreferenceState(config);
  const requested = args.join(" ").trim().toLowerCase();

  if (!requested || requested === "current" || requested === "show" || requested === "status") {
    const payload = {
      command: "theme",
      current: currentTheme(state),
      available: [...themeSettings],
      statePath: displayPreferenceStatePath(config),
      localOnly: true,
      interactivePicker: false,
      sourceEquivalent: false
    };
    if (json) return jsonOk(payload);
    return ok([
      `theme: current=${payload.current}`,
      `theme: available=${availableThemeText()}`,
      "theme: interactivePicker=false"
    ]);
  }

  if (requested === "list") {
    const payload = {
      command: "theme",
      current: currentTheme(state),
      available: [...themeSettings],
      localOnly: true,
      interactivePicker: false,
      sourceEquivalent: false
    };
    if (json) return jsonOk(payload);
    return ok(themeSettings.map((theme) => `theme: option=${theme}`));
  }

  if (requested === "default" || requested === "reset") {
    const nextState = await writePreferenceState(config, {
      ...state,
      theme: null
    });
    const payload = {
      command: "theme",
      set: currentTheme(nextState),
      current: currentTheme(nextState),
      statePath: displayPreferenceStatePath(config),
      localOnly: true,
      interactivePicker: false,
      sourceEquivalent: false
    };
    if (json) return jsonOk(payload);
    return ok([
      "theme: set=default",
      `theme: statePath=${payload.statePath}`,
      "theme: interactivePicker=false"
    ]);
  }

  if (!(themeSettings as readonly string[]).includes(requested)) {
    return error(`invalid theme "${requested}". Available themes: ${availableThemeText()}.`);
  }

  const nextState = await writePreferenceState(config, {
    ...state,
    theme: requested as ThemeSetting
  });
  const payload = {
    command: "theme",
    set: currentTheme(nextState),
    current: currentTheme(nextState),
    statePath: displayPreferenceStatePath(config),
    localOnly: true,
    interactivePicker: false,
    sourceEquivalent: false
  };
  if (json) return jsonOk(payload);
  return ok([
    `theme: set=${payload.set}`,
    `theme: statePath=${payload.statePath}`,
    "theme: interactivePicker=false"
  ]);
}

async function runVimCommand(config: XenesisConfig, args: string[], json: boolean): Promise<PreferenceCommandResult> {
  const state = await readPreferenceState(config);
  const requested = args.join(" ").trim().toLowerCase();

  if (requested === "current" || requested === "show" || requested === "status") {
    const mode = currentEditorMode(state);
    const payload = {
      command: "vim",
      editorMode: mode,
      hint: vimHint(mode),
      statePath: displayPreferenceStatePath(config),
      localOnly: true,
      sourceEquivalent: false
    };
    if (json) return jsonOk(payload);
    return ok([
      `vim: editorMode=${mode}`,
      `vim: hint=${payload.hint}`
    ]);
  }

  let mode: EditorMode;
  if (!requested || requested === "toggle") {
    mode = currentEditorMode(state) === "normal" ? "vim" : "normal";
  } else if (requested === "on" || requested === "vim") {
    mode = "vim";
  } else if (requested === "off" || requested === "normal" || requested === "default") {
    mode = "normal";
  } else {
    return error('vim requires no args, current, toggle, on, off, vim, normal, or default.');
  }

  await writePreferenceState(config, {
    ...state,
    editorMode: mode
  });
  const payload = {
    command: "vim",
    editorMode: mode,
    hint: vimHint(mode),
    statePath: displayPreferenceStatePath(config),
    localOnly: true,
    sourceEquivalent: false
  };
  if (json) return jsonOk(payload);
  return ok([
    `vim: editorMode=${mode}`,
    `vim: hint=${payload.hint}`,
    `vim: statePath=${payload.statePath}`
  ]);
}

async function runKeybindingsCommand(config: XenesisConfig, args: string[], json: boolean): Promise<PreferenceCommandResult> {
  const requested = args.join(" ").trim().toLowerCase();
  const path = keybindingsPath(config);
  const displayPath = displayXenesisStatePath(config.xenesisHome, path);

  if (requested === "show" || requested === "path" || requested === "current") {
    const payload = {
      command: "keybindings",
      path: displayPath,
      editorLaunch: false,
      localOnly: true,
      sourceEquivalent: false
    };
    if (json) return jsonOk(payload);
    return ok([
      `keybindings: path=${displayPath}`,
      "keybindings: editorLaunch=false"
    ]);
  }

  if (requested) {
    return error('keybindings accepts no args, show, path, or current.');
  }

  let created = true;
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, keybindingsTemplate(), {
      encoding: "utf8",
      flag: "wx"
    });
  } catch (err) {
    if (isNodeError(err) && err.code === "EEXIST") {
      created = false;
    } else {
      throw err;
    }
  }

  const payload = {
    command: "keybindings",
    path: displayPath,
    created,
    editorLaunch: false,
    localOnly: true,
    sourceEquivalent: false
  };
  if (json) return jsonOk(payload);
  return ok([
    `keybindings: ${created ? "created" : "exists"} ${displayPath}`,
    "keybindings: editorLaunch=false"
  ]);
}

async function runStatuslineCommand(config: XenesisConfig, args: string[], json: boolean): Promise<PreferenceCommandResult> {
  const state = await readPreferenceState(config);
  const requested = args.join(" ").trim();
  const normalized = requested.toLowerCase();

  if (normalized === "show" || normalized === "current" || normalized === "status") {
    const prompt = state.statuslinePrompt ?? undefined;
    const payload = {
      command: "statusline",
      configured: prompt !== undefined,
      prompt,
      agent: false,
      providerCalls: false,
      statePath: displayPreferenceStatePath(config),
      localOnly: true,
      sourceEquivalent: false
    };
    if (json) return jsonOk(payload);
    return ok([
      `statusline: configured=${payload.configured}`,
      ...(prompt ? [`statusline: prompt=${prompt}`] : []),
      "statusline: agent=false",
      "statusline: providerCalls=false"
    ]);
  }

  if (normalized === "reset" || normalized === "default" || normalized === "none") {
    const nextState = await writePreferenceState(config, {
      ...state,
      statuslinePrompt: null
    });
    const payload = {
      command: "statusline",
      configured: nextState.statuslinePrompt !== null && nextState.statuslinePrompt !== undefined,
      prompt: undefined,
      agent: false,
      providerCalls: false,
      statePath: displayPreferenceStatePath(config),
      localOnly: true,
      sourceEquivalent: false
    };
    if (json) return jsonOk(payload);
    return ok([
      "statusline: configured=false",
      `statusline: statePath=${payload.statePath}`,
      "statusline: agent=false",
      "statusline: providerCalls=false"
    ]);
  }

  const prompt = requested || defaultStatuslinePrompt();
  const nextState = await writePreferenceState(config, {
    ...state,
    statuslinePrompt: prompt
  });
  const payload = {
    command: "statusline",
    configured: true,
    prompt: nextState.statuslinePrompt,
    agent: false,
    providerCalls: false,
    statePath: displayPreferenceStatePath(config),
    localOnly: true,
    sourceEquivalent: false
  };
  if (json) return jsonOk(payload);
  return ok([
    "statusline: configured=true",
    `statusline: prompt=${payload.prompt}`,
    `statusline: statePath=${payload.statePath}`,
    "statusline: agent=false",
    "statusline: providerCalls=false"
  ]);
}

function runOutputStyleCommand(args: string[], json: boolean): PreferenceCommandResult {
  if (args.length > 0) {
    return error("output-style does not accept positional arguments.");
  }
  const payload = {
    command: "output-style",
    deprecated: true,
    replacement: "config",
    message: "Use config to change output style. Changes take effect on the next session.",
    localOnly: true,
    sourceEquivalent: false
  };
  if (json) return jsonOk(payload);
  return ok([
    "output-style: deprecated=true",
    `output-style: ${payload.message}`
  ]);
}

function runExitCommand(args: string[], json: boolean): PreferenceCommandResult {
  if (args.length > 0) {
    return error("exit does not accept positional arguments.");
  }
  const payload = {
    command: "exit",
    message: "goodbye",
    interactiveExitFlow: false,
    localOnly: true,
    sourceEquivalent: false
  };
  if (json) return jsonOk(payload);
  return ok(["exit: goodbye"]);
}

export async function runPreferenceCommand(
  config: XenesisConfig,
  input: PreferenceCommandInput
): Promise<PreferenceCommandResult> {
  const args = input.args ?? [];
  const json = input.json === true;

  switch (input.command) {
    case "clear":
      if (args.length > 0) return error("clear does not accept positional arguments.");
      return await runClearCommand(config, json);
    case "color":
      return await runColorCommand(config, args, json);
    case "theme":
      return await runThemeCommand(config, args, json);
    case "vim":
      return await runVimCommand(config, args, json);
    case "keybindings":
      return await runKeybindingsCommand(config, args, json);
    case "statusline":
      return await runStatuslineCommand(config, args, json);
    case "output-style":
      return runOutputStyleCommand(args, json);
    case "exit":
      return runExitCommand(args, json);
  }
}
