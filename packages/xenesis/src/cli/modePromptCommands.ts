import type { ApprovalMode, ProviderName, XenesisConfig } from "../config/index.js";

export const modePromptCommandNames = [
  "ultraplan",
  "fast",
  "thinkback",
  "thinkback-play"
] as const;

export type ModePromptCommandName = typeof modePromptCommandNames[number];

export interface ModePromptRuntimeIntent {
  provider: ProviderName;
  model: string;
  approvalMode: ApprovalMode;
  maxTurns: number;
  effort: string;
  verbosity: "concise" | "normal" | "detailed";
}

export interface ModePromptCommandPayload {
  command: ModePromptCommandName;
  referenceId: string;
  localOnly: true;
  boundedUtility: true;
  sourceEquivalent: false;
  providerCalls: false;
  networkCalls: false;
  browserLaunch: false;
  remoteSession: false;
  action: string;
  prompt?: string;
  scaffold: string;
  runtimeIntent: ModePromptRuntimeIntent;
  gaps: string[];
}

export interface ModePromptCommandResult {
  exitCode: number;
  stdout: string[];
  stderr: string[];
  payload?: ModePromptCommandPayload;
}

const referenceIds: Record<ModePromptCommandName, string> = {
  ultraplan: "reference.cli.command.ultraplan",
  fast: "reference.cli.command.fast",
  thinkback: "reference.cli.command.thinkback",
  "thinkback-play": "reference.cli.command.thinkback_play"
};

export function normalizeModePromptCommandAlias(value: string | undefined): string | undefined {
  if (value === "think-back") return "thinkback";
  if (value === "think-back-play") return "thinkback-play";
  return value;
}

export function isModePromptCommandName(value: string | undefined): value is ModePromptCommandName {
  return typeof value === "string" && (modePromptCommandNames as readonly string[]).includes(value);
}

function readEffortIntent(env: NodeJS.ProcessEnv) {
  const raw = env.XENESIS_EFFORT ?? env.CLAUDE_CODE_EFFORT_LEVEL;
  const normalized = raw?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : "auto";
}

function runtimeIntent(config: XenesisConfig, env: NodeJS.ProcessEnv): ModePromptRuntimeIntent {
  return {
    provider: config.provider,
    model: config.model,
    approvalMode: config.approvalMode,
    maxTurns: config.maxTurns,
    effort: readEffortIntent(env),
    verbosity: "normal"
  };
}

function block(value: string) {
  return `\`\`\`text\n${value.trim() || "(none)"}\n\`\`\``;
}

function buildUltraplanPayload(args: string[], runtime: ModePromptRuntimeIntent): ModePromptCommandPayload {
  const prompt = args.join(" ").trim();
  const scaffold = [
    "# Xenesis Ultraplan Local Scaffold",
    "",
    "## User Prompt",
    block(prompt || "(supply a planning prompt)"),
    "",
    "## Planning Contract",
    "- Produce an advanced plan locally through the normal Xenesis plan/work flow.",
    "- Keep execution read-only until the user explicitly switches to work mode.",
    "- Identify assumptions, risks, checkpoints, and verification commands.",
    "- Do not launch a remote web session, poll remote approval, or archive remote state."
  ].join("\n");

  return {
    command: "ultraplan",
    referenceId: referenceIds.ultraplan,
    localOnly: true,
    boundedUtility: true,
    sourceEquivalent: false,
    providerCalls: false,
    networkCalls: false,
    browserLaunch: false,
    remoteSession: false,
    action: prompt ? "prompt_scaffold" : "usage",
    ...(prompt ? { prompt } : {}),
    scaffold,
    runtimeIntent: {
      ...runtime,
      approvalMode: "readonly",
      verbosity: "detailed"
    },
    gaps: [
      "No Claude Code on the web session is created.",
      "No remote eligibility, terms dialog, polling, archive, or teleport behavior is implemented.",
      "Use `xenesis plan <prompt>` for the preserved local plan execution path."
    ]
  };
}

function buildFastPayload(args: string[], runtime: ModePromptRuntimeIntent): ModePromptCommandPayload | { error: string } {
  const action = args[0]?.toLowerCase() ?? "status";
  if (action !== "status" && action !== "on" && action !== "off" && action !== "prompt") {
    return { error: 'Command "fast" requires status, on, off, or prompt.' };
  }

  const prompt = action === "prompt" ? args.slice(1).join(" ").trim() : undefined;
  const intent = action === "on"
    ? "Prefer low-latency local execution settings for the next manual run."
    : action === "off"
      ? "Do not request fast execution intent for the next manual run."
      : "Report local fast-mode intent without mutating provider or model settings.";
  const scaffold = [
    "# Xenesis Fast Local Intent",
    "",
    `- action: ${action}`,
    `- model: ${runtime.model}`,
    `- effort: ${runtime.effort}`,
    `- verbosity: ${action === "on" ? "concise" : runtime.verbosity}`,
    `- intent: ${intent}`,
    "",
    "This command does not switch models, change billing mode, prefetch organization state, or persist reference fast-mode settings.",
    ...(prompt ? ["", "## Prompt", block(prompt)] : [])
  ].join("\n");

  return {
    command: "fast",
    referenceId: referenceIds.fast,
    localOnly: true,
    boundedUtility: true,
    sourceEquivalent: false,
    providerCalls: false,
    networkCalls: false,
    browserLaunch: false,
    remoteSession: false,
    action,
    ...(prompt ? { prompt } : {}),
    scaffold,
    runtimeIntent: {
      ...runtime,
      verbosity: action === "on" ? "concise" : runtime.verbosity
    },
    gaps: [
      "No reference FastModePicker is rendered.",
      "No model switch, billing premium, rate-limit lookup, cooldown prefetch, or user settings mutation is performed."
    ]
  };
}

function buildThinkbackPayload(args: string[], runtime: ModePromptRuntimeIntent): ModePromptCommandPayload {
  const prompt = args.join(" ").trim();
  const scaffold = [
    "# Xenesis Thinkback Local Recall Scaffold",
    "",
    "## Recall Scope",
    block(prompt || "Review local session/context history and produce a concise retrospective."),
    "",
    "## Suggested Local Sources",
    "- `xenesis sessions list`",
    "- `xenesis sessions show <session-id>`",
    "- `xenesis summary <session-id>`",
    "- `xenesis context search <query>`",
    "",
    "No year-in-review generation service, feature-gated remote workflow, analytics upload, network API, or hidden animation trigger is used."
  ].join("\n");

  return {
    command: "thinkback",
    referenceId: referenceIds.thinkback,
    localOnly: true,
    boundedUtility: true,
    sourceEquivalent: false,
    providerCalls: false,
    networkCalls: false,
    browserLaunch: false,
    remoteSession: false,
    action: "recall_scaffold",
    ...(prompt ? { prompt } : {}),
    scaffold,
    runtimeIntent: runtime,
    gaps: [
      "No 2025 Claude Code Year in Review service is contacted.",
      "No hidden generation pipeline, feature gate, network API, or telemetry-dependent content is implemented."
    ]
  };
}

function buildThinkbackPlayPayload(args: string[], runtime: ModePromptRuntimeIntent): ModePromptCommandPayload | { error: string } {
  if (args.length > 0) {
    return { error: 'Command "thinkback-play" does not accept positional arguments.' };
  }
  const scaffold = [
    "# Xenesis Thinkback Playback Boundary",
    "",
    "The reference command is a hidden local animation playback hook after remote thinkback generation.",
    "Xenesis exposes only this deterministic boundary report; no recording, replay engine, browser, terminal animation, or hidden service is started."
  ].join("\n");

  return {
    command: "thinkback-play",
    referenceId: referenceIds["thinkback-play"],
    localOnly: true,
    boundedUtility: true,
    sourceEquivalent: false,
    providerCalls: false,
    networkCalls: false,
    browserLaunch: false,
    remoteSession: false,
    action: "playback_boundary",
    scaffold,
    runtimeIntent: runtime,
    gaps: [
      "No thinkback animation is played.",
      "No hidden command trigger, generated media, browser, recording, or replay service is used."
    ]
  };
}

function payloadToText(payload: ModePromptCommandPayload): string[] {
  const prefix = payload.command;
  return [
    `${prefix}: bounded local compatibility`,
    `${prefix}: action=${payload.action}`,
    `${prefix}: localOnly=${payload.localOnly}`,
    `${prefix}: sourceEquivalent=${payload.sourceEquivalent}`,
    `${prefix}: providerCalls=${payload.providerCalls}`,
    `${prefix}: networkCalls=${payload.networkCalls}`,
    `${prefix}: browserLaunch=${payload.browserLaunch}`,
    `${prefix}: remoteSession=${payload.remoteSession}`,
    `${prefix}: model=${payload.runtimeIntent.model}`,
    `${prefix}: effort=${payload.runtimeIntent.effort}`,
    `${prefix}: verbosity=${payload.runtimeIntent.verbosity}`,
    payload.scaffold,
    `${prefix}: gaps=${payload.gaps.join(" | ")}`
  ];
}

export function renderModePromptCommand(options: {
  command: ModePromptCommandName;
  args: string[];
  config: XenesisConfig;
  env: NodeJS.ProcessEnv;
  json?: boolean;
}): ModePromptCommandResult {
  const runtime = runtimeIntent(options.config, options.env);
  const payloadOrError = options.command === "ultraplan"
    ? buildUltraplanPayload(options.args, runtime)
    : options.command === "fast"
      ? buildFastPayload(options.args, runtime)
      : options.command === "thinkback"
        ? buildThinkbackPayload(options.args, runtime)
        : buildThinkbackPlayPayload(options.args, runtime);

  if ("error" in payloadOrError) {
    return {
      exitCode: 1,
      stdout: [],
      stderr: [`error: ${payloadOrError.error}`]
    };
  }

  if (options.json) {
    return {
      exitCode: 0,
      stdout: [JSON.stringify(payloadOrError)],
      stderr: [],
      payload: payloadOrError
    };
  }

  return {
    exitCode: 0,
    stdout: payloadToText(payloadOrError),
    stderr: [],
    payload: payloadOrError
  };
}
