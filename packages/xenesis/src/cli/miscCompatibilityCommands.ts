import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { XenesisConfig } from "../config/index.js";
import { displayXenesisStatePath, xenesisStatePath } from "../config/index.js";

export const miscCompatibilityCommandNames = [
  "btw",
  "feedback",
  "stickers",
  "moved-to-plugin",
  "plugin-moved"
] as const;

export type MiscCompatibilityCommandName = typeof miscCompatibilityCommandNames[number];

export function isMiscCompatibilityCommandName(value: string | undefined): value is MiscCompatibilityCommandName {
  return (miscCompatibilityCommandNames as readonly string[]).includes(value ?? "");
}

function feedbackDraftPath(config: XenesisConfig) {
  return xenesisStatePath(config.xenesisHome, "feedback", "draft.json");
}

function oneLine(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

async function renderBtwCommand(args: string[]) {
  const question = args.join(" ").trim();
  if (!question) throw new Error('Command "btw" requires a question.');

  return [
    "btw: local side-question compatibility",
    `btw: question=${oneLine(question)}`,
    "btw: answer=not-generated",
    "btw: providerCalls=false network=false tui=false",
    "btw: guidance=Use xenesis chat or xenesis plan for a model-backed follow-up."
  ];
}

async function renderFeedbackCommand(config: XenesisConfig, args: string[]) {
  const description = args.join(" ").trim();
  const path = feedbackDraftPath(config);
  const displayPath = displayXenesisStatePath(config.xenesisHome, path);

  if (!description) {
    return [
      "feedback: local draft guidance",
      `feedback: draftPath=${displayPath}`,
      "feedback: upload=false browser=false network=false tui=false",
      "feedback: usage=xenesis feedback <description> to save a local draft"
    ];
  }

  const draft = {
    description,
    localOnly: true,
    upload: false,
    browser: false,
    network: false,
    source: "xenesis-cli-feedback-compat"
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(draft, null, 2)}\n`, "utf8");

  return [
    "feedback: local draft saved",
    `feedback: written=${displayPath}`,
    `feedback: characters=${description.length}`,
    "feedback: upload=false browser=false network=false tui=false"
  ];
}

function renderStickersCommand(args: string[]) {
  if (args.length > 0) throw new Error('Command "stickers" does not accept positional arguments.');
  return [
    "stickers: local catalogue only",
    "stickers: item=claude-code-stickers action=external-ordering-disabled",
    "stickers: assets=0",
    "stickers: providerCalls=false network=false browser=false tui=false"
  ];
}

function renderMovedToPluginCommand(command: MiscCompatibilityCommandName, args: string[]) {
  const [legacyCommand = "unknown", pluginName = "plugin", pluginCommand = legacyCommand] = args;
  const displayCommand = command === "plugin-moved" ? "plugin-moved" : "moved-to-plugin";
  return [
    `${displayCommand}: compatibility guidance`,
    `${displayCommand}: legacyCommand=${legacyCommand}`,
    `${displayCommand}: plugin=${pluginName}`,
    `${displayCommand}: pluginCommand=${pluginCommand}`,
    `${displayCommand}: install=false marketplace=false network=false`,
    `${displayCommand}: guidance=Use explicit local Xenesis plugin paths; no marketplace install or remote lookup is performed.`
  ];
}

export async function renderMiscCompatibilityCommand(
  config: XenesisConfig,
  command: MiscCompatibilityCommandName,
  args: string[] = []
) {
  switch (command) {
    case "btw":
      return await renderBtwCommand(args);
    case "feedback":
      return await renderFeedbackCommand(config, args);
    case "stickers":
      return renderStickersCommand(args);
    case "moved-to-plugin":
    case "plugin-moved":
      return renderMovedToPluginCommand(command, args);
  }
}
