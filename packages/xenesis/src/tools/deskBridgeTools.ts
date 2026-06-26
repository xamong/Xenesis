import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DeskSurfaceHandler, renderSurfaceSnapshot, type SurfaceSnapshot } from "../core/surface/index.js";
import type { Tool, ToolContext } from "./types.js";

const bridgeReadInput = z.object({
  timeoutMs: z.number().int().positive().max(60_000).default(5000)
});

const deskBrowserListInput = bridgeReadInput;
const deskExplorerStateInput = bridgeReadInput;

const capabilitiesInput = z.object({
  path: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().max(60_000).default(5000)
});

const capabilitiesOpenAIInput = z.object({
  path: z.string().min(1).nullable(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const callCapabilityInput = z.object({
  path: z.string().min(1),
  args: z.record(z.unknown()).default({}),
  argsJson: z.string().optional(),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(60_000).default(10_000)
});

const callCapabilityOpenAIInput = z.object({
  path: z.string().min(1),
  argsJson: z.string(),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const deskXvCommandInput = z.object({
  command: z.string().min(1),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(60_000).default(10_000)
});

const deskXvCommandOpenAIInput = z.object({
  command: z.string().min(1),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const placementSchema = z.enum(["tab", "left", "right", "top", "bottom"]);
const shellSchema = z.enum(["powershell", "cmd", "pwsh", "wsl"]);

const deskOpenFileInput = z.object({
  filePath: z.string().min(1),
  placement: placementSchema.nullable().optional(),
  targetPaneId: z.string().min(1).nullable().optional(),
  streaming: z.boolean().nullable().optional(),
  streamingChunkSize: z.number().int().positive().nullable().optional(),
  streamingInitialDelayMs: z.number().int().nonnegative().nullable().optional(),
  streamingIntervalMs: z.number().int().nonnegative().nullable().optional(),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(60_000).default(10_000)
});

const deskOpenFileOpenAIInput = z.object({
  filePath: z.string().min(1),
  placement: placementSchema.nullable(),
  targetPaneId: z.string().nullable(),
  streaming: z.boolean().nullable(),
  streamingChunkSize: z.number().int().positive().nullable(),
  streamingInitialDelayMs: z.number().int().nonnegative().nullable(),
  streamingIntervalMs: z.number().int().nonnegative().nullable(),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const deskTerminalRunInput = z.object({
  command: z.string().min(1),
  cwd: z.string().min(1).nullable().optional(),
  shell: shellSchema.nullable().optional(),
  id: z.string().min(1).nullable().optional(),
  rows: z.number().int().positive().nullable().optional(),
  cols: z.number().int().positive().nullable().optional(),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(60_000).default(10_000)
});

const deskTerminalRunOpenAIInput = z.object({
  command: z.string().min(1),
  cwd: z.string().nullable(),
  shell: shellSchema.nullable(),
  id: z.string().nullable(),
  rows: z.number().int().positive().nullable(),
  cols: z.number().int().positive().nullable(),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const deskTerminalRunAndWaitInput = z.object({
  command: z.string().min(1),
  cwd: z.string().min(1).nullable().optional(),
  shell: shellSchema.nullable().optional(),
  maxBytes: z.number().int().positive().nullable().optional(),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(30 * 60_000).default(120_000)
});

const deskTerminalRunAndWaitOpenAIInput = z.object({
  command: z.string().min(1),
  cwd: z.string().nullable(),
  shell: shellSchema.nullable(),
  maxBytes: z.number().int().positive().nullable(),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(30 * 60_000)
});

const deskSubagentAgentSchema = z.enum(["codex", "claude", "gemini", "xenesis", "custom"]);

const deskSubagentStartInput = z.object({
  task: z.string().min(1),
  agent: deskSubagentAgentSchema.default("codex"),
  command: z.string().min(1).nullable().optional(),
  cwd: z.string().min(1).nullable().optional(),
  shell: shellSchema.nullable().optional(),
  id: z.string().min(1).nullable().optional(),
  title: z.string().min(1).nullable().optional(),
  parentTermId: z.string().min(1).nullable().optional(),
  rows: z.number().int().positive().nullable().optional(),
  cols: z.number().int().positive().nullable().optional(),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(60_000).default(10_000)
});

const deskSubagentStartOpenAIInput = z.object({
  task: z.string().min(1),
  agent: deskSubagentAgentSchema,
  command: z.string().nullable(),
  cwd: z.string().nullable(),
  shell: shellSchema.nullable(),
  id: z.string().nullable(),
  title: z.string().nullable(),
  parentTermId: z.string().nullable(),
  rows: z.number().int().positive().nullable(),
  cols: z.number().int().positive().nullable(),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const deskSubagentListInput = z.object({
  timeoutMs: z.number().int().positive().max(60_000).default(5000)
});

const deskSubagentListOpenAIInput = z.object({
  timeoutMs: z.number().int().positive().max(60_000)
});

const deskCommandPaletteInput = z.object({
  query: z.string().nullable().optional(),
  includeDisabled: z.boolean().nullable().optional(),
  timeoutMs: z.number().int().positive().max(60_000).default(5000)
});

const deskCommandPaletteOpenAIInput = z.object({
  query: z.string().nullable(),
  includeDisabled: z.boolean().nullable(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const deskRunCommandPaletteInput = z.object({
  commandId: z.string().min(1),
  panelPlacement: placementSchema.nullable().optional(),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(60_000).default(10_000)
});

const deskRunCommandPaletteOpenAIInput = z.object({
  commandId: z.string().min(1),
  panelPlacement: placementSchema.nullable(),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const deskCreateXconMarkdownInput = z.object({
  prompt: z.string().min(1),
  title: z.string().min(1).nullable().optional(),
  fileName: z.string().min(1).nullable().optional(),
  workspaceDir: z.string().min(1).nullable().optional(),
  outDir: z.string().min(1).nullable().optional(),
  mode: z.enum(["view", "code", "both"]).nullable().optional(),
  openInDesk: z.boolean().nullable().optional(),
  placement: placementSchema.nullable().optional(),
  targetPaneId: z.string().min(1).nullable().optional(),
  streaming: z.boolean().nullable().optional(),
  streamingChunkSize: z.number().int().positive().nullable().optional(),
  streamingInitialDelayMs: z.number().int().nonnegative().nullable().optional(),
  streamingIntervalMs: z.number().int().nonnegative().nullable().optional(),
  exportPdf: z.boolean().nullable().optional(),
  pdfFileName: z.string().min(1).nullable().optional(),
  pdfOutDir: z.string().min(1).nullable().optional(),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(120_000).default(30_000)
});

const deskCreateXconMarkdownOpenAIInput = z.object({
  prompt: z.string().min(1),
  title: z.string().nullable(),
  fileName: z.string().nullable(),
  workspaceDir: z.string().nullable(),
  outDir: z.string().nullable(),
  mode: z.enum(["view", "code", "both"]).nullable(),
  openInDesk: z.boolean().nullable(),
  placement: placementSchema.nullable(),
  targetPaneId: z.string().nullable(),
  streaming: z.boolean().nullable(),
  streamingChunkSize: z.number().int().positive().nullable(),
  streamingInitialDelayMs: z.number().int().nonnegative().nullable(),
  streamingIntervalMs: z.number().int().nonnegative().nullable(),
  exportPdf: z.boolean().nullable(),
  pdfFileName: z.string().nullable(),
  pdfOutDir: z.string().nullable(),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(120_000)
});

const deskExportXconPdfInput = z.object({
  filePath: z.string().min(1),
  pdfFileName: z.string().min(1).nullable().optional(),
  pdfOutDir: z.string().min(1).nullable().optional(),
  title: z.string().min(1).nullable().optional(),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(120_000).default(30_000)
});

const deskExportXconPdfOpenAIInput = z.object({
  filePath: z.string().min(1),
  pdfFileName: z.string().nullable(),
  pdfOutDir: z.string().nullable(),
  title: z.string().nullable(),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(120_000)
});

const deskTerminalTailInput = z.object({
  id: z.string().min(1),
  maxBytes: z.number().int().positive().nullable().optional(),
  timeoutMs: z.number().int().positive().max(60_000).default(5000)
});

const deskTerminalTailOpenAIInput = z.object({
  id: z.string().min(1),
  maxBytes: z.number().int().positive().nullable(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const deskTerminalStopInput = z.object({
  id: z.string().min(1),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(60_000).default(10_000)
});

const deskTerminalStopOpenAIInput = z.object({
  id: z.string().min(1),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const deskContextActionsInput = z.object({
  timeoutMs: z.number().int().positive().max(60_000).default(5000)
});

const deskRecentDiagnosticsInput = z.object({
  limit: z.number().int().positive().max(200).nullable().optional(),
  timeoutMs: z.number().int().positive().max(60_000).default(5000)
});

const deskRecentDiagnosticsOpenAIInput = z.object({
  limit: z.number().int().positive().max(200).nullable(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const playwrightActionInput = z.object({
  type: z.enum(["click", "fill", "press", "waitForSelector", "waitForTimeout", "screenshot"]),
  selector: z.string().nullable().optional(),
  index: z.number().int().positive().nullable().optional(),
  value: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  ms: z.number().int().nonnegative().nullable().optional(),
  timeoutMs: z.number().int().positive().nullable().optional(),
  fileName: z.string().nullable().optional(),
  state: z.enum(["attached", "detached", "visible", "hidden"]).nullable().optional()
});

const playwrightActionOpenAIInput = z.object({
  type: z.enum(["click", "fill", "press", "waitForSelector", "waitForTimeout", "screenshot"]),
  selector: z.string().nullable(),
  index: z.number().int().positive().nullable(),
  value: z.string().nullable(),
  text: z.string().nullable(),
  key: z.string().nullable(),
  ms: z.number().int().nonnegative().nullable(),
  timeoutMs: z.number().int().positive().nullable(),
  fileName: z.string().nullable(),
  state: z.enum(["attached", "detached", "visible", "hidden"]).nullable()
});

const deskPlaywrightSnapshotInput = z.object({
  url: z.string().min(1),
  selector: z.string().nullable().optional(),
  openInDesk: z.boolean().nullable().optional(),
  waitForSelector: z.boolean().nullable().optional(),
  fullPage: z.boolean().nullable().optional(),
  headless: z.boolean().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  outDir: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  format: z.enum(["png", "jpeg"]).nullable().optional(),
  quality: z.number().int().min(1).max(100).nullable().optional(),
  placement: placementSchema.nullable().optional(),
  targetPaneId: z.string().nullable().optional(),
  timeoutMs: z.number().int().positive().max(300_000).default(60_000),
  approved: z.boolean().default(false)
});

const deskPlaywrightSnapshotOpenAIInput = z.object({
  url: z.string().min(1),
  selector: z.string().nullable(),
  openInDesk: z.boolean().nullable(),
  waitForSelector: z.boolean().nullable(),
  fullPage: z.boolean().nullable(),
  headless: z.boolean().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  outDir: z.string().nullable(),
  fileName: z.string().nullable(),
  format: z.enum(["png", "jpeg"]).nullable(),
  quality: z.number().int().min(1).max(100).nullable(),
  placement: placementSchema.nullable(),
  targetPaneId: z.string().nullable(),
  timeoutMs: z.number().int().positive().max(300_000),
  approved: z.boolean()
});

const deskPlaywrightRunInput = z.object({
  url: z.string().min(1),
  actions: z.array(playwrightActionInput),
  screenshot: z.boolean().nullable().optional(),
  screenshotFileName: z.string().nullable().optional(),
  trace: z.boolean().nullable().optional(),
  traceFileName: z.string().nullable().optional(),
  openInDesk: z.boolean().nullable().optional(),
  fullPage: z.boolean().nullable().optional(),
  headless: z.boolean().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  outDir: z.string().nullable().optional(),
  timeoutMs: z.number().int().positive().max(300_000).default(60_000),
  approved: z.boolean().default(false)
});

const deskPlaywrightRunOpenAIInput = z.object({
  url: z.string().min(1),
  actions: z.array(playwrightActionOpenAIInput),
  screenshot: z.boolean().nullable(),
  screenshotFileName: z.string().nullable(),
  trace: z.boolean().nullable(),
  traceFileName: z.string().nullable(),
  openInDesk: z.boolean().nullable(),
  fullPage: z.boolean().nullable(),
  headless: z.boolean().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  outDir: z.string().nullable(),
  timeoutMs: z.number().int().positive().max(300_000),
  approved: z.boolean()
});

const deskSafeFilePreviewInput = z.object({
  filePath: z.string().min(1),
  content: z.string(),
  maxBytes: z.number().int().positive().nullable().optional(),
  timeoutMs: z.number().int().positive().max(60_000).default(10_000)
});

const deskSafeFilePreviewOpenAIInput = z.object({
  filePath: z.string().min(1),
  content: z.string(),
  maxBytes: z.number().int().positive().nullable(),
  timeoutMs: z.number().int().positive().max(60_000)
});

const deskSafeFileApplyInput = z.object({
  filePath: z.string().min(1),
  content: z.string(),
  backupRoot: z.string().min(1).nullable().optional(),
  maxBytes: z.number().int().positive().nullable().optional(),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(60_000).default(10_000)
});

const deskSafeFileApplyOpenAIInput = z.object({
  filePath: z.string().min(1),
  content: z.string(),
  backupRoot: z.string().nullable(),
  maxBytes: z.number().int().positive().nullable(),
  approved: z.boolean(),
  timeoutMs: z.number().int().positive().max(60_000)
});

type BridgePayload = Record<string, unknown>;

interface BridgeConnection {
  url: string;
  token: string;
  source: "env" | "state-file";
  statePath?: string;
}

function bridgeEnv(context: ToolContext) {
  return context.env ?? process.env;
}

function normalizeBridgeUrl(value: unknown) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

function configuredBridgeUrl(context: ToolContext) {
  return normalizeBridgeUrl(bridgeEnv(context).XENIS_MCP_BRIDGE_URL);
}

function configuredBridgeToken(context: ToolContext) {
  return String(bridgeEnv(context).XENIS_MCP_BRIDGE_TOKEN ?? "").trim();
}

function bridgeStateFilePath(context: ToolContext) {
  const env = bridgeEnv(context);
  const explicit = String(env.XENIS_MCP_STATE_FILE ?? "").trim();
  if (explicit) return explicit;
  const home = String(env.XENIS_HOME ?? "").trim();
  return home ? join(home, "mcp", "bridge.json") : "";
}

async function readBridgeConnectionFromStateFile(context: ToolContext): Promise<BridgeConnection | undefined> {
  const statePath = bridgeStateFilePath(context);
  if (!statePath) return undefined;
  let raw: string;
  try {
    raw = await readFile(statePath, "utf8");
  } catch {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const state = parsed as Record<string, unknown>;
  const url = normalizeBridgeUrl(state.bridgeUrl);
  if (!url) return undefined;
  return {
    url,
    token: String(state.bridgeToken ?? "").trim(),
    source: "state-file",
    statePath
  };
}

async function resolveBridgeConnection(context: ToolContext): Promise<BridgeConnection> {
  const url = configuredBridgeUrl(context);
  if (url) {
    return {
      url,
      token: configuredBridgeToken(context),
      source: "env"
    };
  }
  const stateConnection = await readBridgeConnectionFromStateFile(context);
  if (stateConnection) return stateConnection;
  throw new Error(
    "Xenesis Desk MCP bridge URL is not configured. Set XENIS_MCP_BRIDGE_URL, XENIS_MCP_STATE_FILE, or XENIS_HOME."
  );
}

function authHeaders(connection: BridgeConnection): Record<string, string> {
  const token = connection.token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function callDeskBridge(
  context: ToolContext,
  endpoint: string,
  body: BridgePayload,
  timeoutMs: number
): Promise<BridgePayload> {
  const connection = await resolveBridgeConnection(context);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${connection.url}${endpoint}`, {
      method: "POST",
      headers: authHeaders(connection),
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    let payload: unknown = {};
    if (text.trim()) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { ok: false, error: text };
      }
    }
    const normalized = payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as BridgePayload
      : { ok: false, error: String(payload) };
    if (!response.ok && normalized.ok !== false && !normalized.approvalRequired) {
      return {
        ...normalized,
        ok: false,
        error: `Xenesis Desk bridge HTTP ${response.status}: ${text || response.statusText}`
      };
    }
    return normalized;
  } finally {
    clearTimeout(timer);
  }
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, content: message };
}

function jsonContent(payload: unknown) {
  return JSON.stringify(payload, null, 2);
}

function withoutControlFields(input: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "approved" || key === "timeoutMs") continue;
    if (value !== undefined && value !== null) result[key] = value;
  }
  return result;
}

function withoutKeys(input: Record<string, unknown>, keys: readonly string[]) {
  const result: Record<string, unknown> = {};
  const skipped = new Set(keys);
  for (const [key, value] of Object.entries(input)) {
    if (skipped.has(key)) continue;
    if (value !== undefined && value !== null) result[key] = value;
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function payloadSurfaceData(payload: BridgePayload) {
  return isRecord(payload.result) ? payload.result : payload;
}

interface DeskBridgeSurfaceResult {
  ok: boolean;
  content: string;
  data?: unknown;
}

class DeskBridgeSurfaceSignal extends Error {
  constructor(readonly result: DeskBridgeSurfaceResult) {
    super(result.content);
  }
}

function bridgePayloadResult(payload: BridgePayload, fallbackPath: string): DeskBridgeSurfaceResult | undefined {
  if (payload.approvalRequired) {
    return { ok: true, content: formatCapabilityCallResult(payload, fallbackPath), data: payload };
  }
  if (payload.ok === false) {
    return {
      ok: false,
      content: String(payload.error ?? `Xenesis Desk capability failed: ${fallbackPath}`),
      data: payload
    };
  }
  return undefined;
}

function isIndexPlaywrightAction(action: z.infer<typeof playwrightActionInput>) {
  return (action.type === "click" || action.type === "fill") && action.index !== undefined && action.index !== null;
}

async function runDeskPlaywrightIndexActions(
  input: z.infer<typeof deskPlaywrightRunInput>,
  context: ToolContext
): Promise<{ ok: true; snapshot: SurfaceSnapshot } | DeskBridgeSurfaceResult> {
  const baseSnapshotArgs = withoutKeys(input as Record<string, unknown>, [
    "actions",
    "screenshot",
    "screenshotFileName",
    "trace",
    "traceFileName",
    "timeoutMs",
    "approved"
  ]);
  const baseRunArgs = withoutKeys(input as Record<string, unknown>, ["actions", "timeoutMs", "approved"]);
  const call = async (path: string, args: Record<string, unknown>) => {
    const payload = await callCapabilityPath(
      context,
      path,
      path === "xd.playwright.snapshot" ? { ...baseSnapshotArgs, ...args } : { ...baseRunArgs, ...args },
      input.approved === true,
      input.timeoutMs ?? 60_000
    );
    const bridgeResult = bridgePayloadResult(payload, path);
    if (bridgeResult) throw new DeskBridgeSurfaceSignal(bridgeResult);
    return payloadSurfaceData(payload);
  };
  const handler = new DeskSurfaceHandler(call);
  try {
    let snapshot = await handler.snapshot();

    for (const action of input.actions) {
      if (isIndexPlaywrightAction(action)) {
        if (action.type === "click") {
          snapshot = await handler.act({ type: "click", index: action.index! });
        } else {
          const text = action.value ?? action.text ?? "";
          snapshot = await handler.act({ type: "fill", index: action.index!, text });
        }
        continue;
      }

      const payload = await callCapabilityPath(
        context,
        "xd.playwright.run",
        { ...baseRunArgs, actions: [withoutKeys(action as Record<string, unknown>, ["index"])] },
        input.approved === true,
        input.timeoutMs ?? 60_000
      );
      const bridgeResult = bridgePayloadResult(payload, "xd.playwright.run");
      if (bridgeResult) return bridgeResult;
      snapshot = await handler.snapshot();
    }

    return { ok: true, snapshot };
  } catch (error) {
    if (error instanceof DeskBridgeSurfaceSignal) return error.result;
    throw error;
  }
}

function compactDeskSubagentTitle(value: unknown, fallback = "subagent") {
  const title = String(value || "").replace(/\s+/g, " ").trim() || fallback;
  return title.length > 64 ? `${title.slice(0, 61)}...` : title;
}

function quoteDeskSubagentCommandArg(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}

function buildDefaultDeskSubagentCommand(agent: z.infer<typeof deskSubagentAgentSchema>, task: string) {
  const prompt = quoteDeskSubagentCommandArg(task);
  if (agent === "claude") return `claude -p ${prompt}`;
  if (agent === "gemini") return `gemini -p ${prompt}`;
  if (agent === "xenesis") return `xenesis run ${prompt}`;
  if (agent === "custom") return `echo ${prompt}`;
  return `codex exec ${prompt}`;
}

function buildDeskSubagentTerminalArgs(input: z.infer<typeof deskSubagentStartInput>) {
  const task = input.task.trim();
  const agent = input.agent ?? "codex";
  const command = input.command?.trim() || buildDefaultDeskSubagentCommand(agent, task);
  const subagentId = input.id?.trim() || `subagent-${Date.now().toString(36)}`;
  return {
    command,
    ...(input.cwd ? { cwd: input.cwd } : {}),
    ...(input.shell ? { shell: input.shell } : {}),
    ...(input.id ? { id: input.id } : {}),
    ...(input.rows ? { rows: input.rows } : {}),
    ...(input.cols ? { cols: input.cols } : {}),
    title: `Subagent: ${compactDeskSubagentTitle(input.title, task)}`,
    metadata: {
      kind: "xenesis-desk-subagent",
      subagentId,
      agent,
      task,
      command,
      ...(input.parentTermId ? { parentTermId: input.parentTermId } : {})
    }
  };
}

export async function callCapabilityPath(
  context: ToolContext,
  path: string,
  args: Record<string, unknown>,
  approved: boolean,
  timeoutMs: number
) {
  return await callDeskBridge(context, "/capabilities/call", {
    path,
    args,
    source: "xenesis",
    approved
  }, timeoutMs);
}

function parseCapabilityArgs(input: z.infer<typeof callCapabilityInput>) {
  const argsJson = typeof input.argsJson === "string" ? input.argsJson.trim() : "";
  if (!argsJson) return input.args ?? {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(argsJson);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`desk_call_capability argsJson must be a JSON object: ${reason}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("desk_call_capability argsJson must parse to a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function stripXvPrefix(command: string) {
  const trimmed = command.trim();
  if (trimmed === "/xd" || trimmed === "xd") return "";
  if (trimmed.startsWith("/xd ")) return trimmed.slice(4).trim();
  if (trimmed.startsWith("xd ")) return trimmed.slice(3).trim();
  return trimmed;
}

function unquoteToken(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function splitFirstToken(value: string): [string, string] {
  const trimmed = value.trim();
  if (!trimmed) return ["", ""];
  const quote = trimmed[0];
  if (quote === "\"" || quote === "'") {
    const end = trimmed.indexOf(quote, 1);
    if (end > 0) return [trimmed.slice(1, end), trimmed.slice(end + 1).trim()];
  }
  const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(trimmed);
  return match ? [match[1] ?? "", match[2] ?? ""] : [trimmed, ""];
}

function parseOptionalPositiveInteger(value: string, fallback: number | undefined) {
  const trimmed = value.trim().replace(/^#/, "");
  if (!trimmed) return fallback;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseJsonObjectLiteral(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`/xd call args must be a JSON object: ${reason}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("/xd call args must parse to a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

interface XvCommandRoute {
  endpoint: string;
  body: BridgePayload;
  label: string;
  format(payload: BridgePayload): string;
}

function callRoute(path: string, args: Record<string, unknown>, approved: boolean, label = path): XvCommandRoute {
  return {
    endpoint: "/capabilities/call",
    body: {
      path,
      args,
      source: "xenesis",
      approved
    },
    label,
    format: (payload) => formatCapabilityCallResult(payload, path)
  };
}

function describeRoute(path: string): XvCommandRoute {
  return {
    endpoint: "/capabilities/describe",
    body: { path },
    label: `describe ${path}`,
    format: (payload) => formatCapabilityDescription(payload, path)
  };
}

function resolveXvCommandRoute(command: string, approved: boolean): XvCommandRoute {
  const body = stripXvPrefix(command);
  const [verbRaw, rest] = splitFirstToken(body);
  const verb = verbRaw.toLowerCase();

  if (!verb || verb === "status" || verb === "state" || verb === "mobile") {
    return {
      endpoint: "/state",
      body: {},
      label: "status",
      format: formatDeskState
    };
  }

  if (verb === "context" || verb === "active") {
    return {
      endpoint: "/active-context",
      body: {},
      label: "context",
      format: jsonContent
    };
  }

  if (verb === "capability" || verb === "capabilities" || verb === "cap" || verb === "describe") {
    const path = rest.trim();
    if (!path) {
      return {
        endpoint: "/capabilities/list",
        body: {},
        label: "capabilities",
        format: formatCapabilities
      };
    }
    return describeRoute(path);
  }

  if (verb === "call") {
    const [path, argsJson] = splitFirstToken(rest);
    if (!path) throw new Error("/xd call requires a capability path.");
    return callRoute(path, parseJsonObjectLiteral(argsJson), approved);
  }

  if (verb.startsWith("xd.")) {
    return callRoute(verbRaw, parseJsonObjectLiteral(rest), approved);
  }

  if (verb === "actions" || verb === "context-actions") return callRoute("xd.context.actions", {}, approved);
  if (verb === "logs" || verb === "diagnostics") {
    const limit = parseOptionalPositiveInteger(rest, undefined);
    return callRoute("xd.diagnostics.recent", limit ? { limit } : {}, approved);
  }
  if (verb === "panels" || verb === "bridge-panels") return callRoute("xd.panels.list", {}, approved);
  if (verb === "files") return callRoute("xd.files.listOpen", {}, approved);
  if (verb === "terminals") return callRoute("xd.terminals.list", {}, approved);
  if (verb === "tail") {
    const [id] = splitFirstToken(rest);
    if (!id) throw new Error("/xd tail requires a terminal id.");
    return callRoute("xd.terminals.tail", { id }, approved);
  }
  if (verb === "stop") {
    const [id] = splitFirstToken(rest);
    if (!id) throw new Error("/xd stop requires a terminal id.");
    return callRoute("xd.terminals.stop", { id }, approved);
  }
  if (verb === "run") {
    if (!rest.trim()) throw new Error("/xd run requires a command.");
    return callRoute("xd.terminals.run", { command: rest.trim() }, approved);
  }
  if (verb === "open") {
    if (!rest.trim()) throw new Error("/xd open requires a file path.");
    return callRoute("xd.files.open", { filePath: unquoteToken(rest) }, approved);
  }
  if (verb === "commands") {
    return callRoute("xd.commands.palette.list", rest.trim() ? { query: rest.trim() } : {}, approved);
  }
  if (verb === "command" || verb === "exec" || verb === "extension") {
    const [commandId, placement] = splitFirstToken(rest);
    if (!commandId) throw new Error(`/xd ${verb} requires a command id.`);
    return callRoute("xd.commands.palette.run", {
      commandId,
      ...(placement ? { panelPlacement: placement } : {})
    }, approved);
  }
  if (verb === "xcon") {
    if (!rest.trim()) return describeRoute("xd.artifacts.xconMarkdown.prompt");
    return callRoute("xd.artifacts.xconMarkdown.create", {
      prompt: rest.trim(),
      openInDesk: true
    }, approved);
  }
  if (verb === "validate") {
    if (!rest.trim()) throw new Error("/xd validate requires Markdown content.");
    return callRoute("xd.artifacts.xconMarkdown.validate", { content: rest }, approved);
  }

  throw new Error(`Unsupported /xd command: ${verbRaw}. Use /xd capabilities or /xd call <path> <json> for lower-level CR access.`);
}

function formatCapabilityCallResult(payload: BridgePayload, fallbackPath: string) {
  if (payload.approvalRequired) {
    const item = payload.actionInboxItem && typeof payload.actionInboxItem === "object"
      ? payload.actionInboxItem as { id?: unknown }
      : {};
    const id = typeof item.id === "string" && item.id ? ` Approval request: ${item.id}` : "";
    return `Xenesis Desk capability approval required: ${String(payload.path ?? fallbackPath)}.${id}`;
  }
  return `Called Xenesis Desk capability: ${String(payload.path ?? fallbackPath)}`;
}

function arrayValue(payload: BridgePayload, key: string): unknown[] {
  const value = payload[key];
  return Array.isArray(value) ? value : [];
}

function formatDeskState(payload: BridgePayload) {
  const terminals = arrayValue(payload, "terminals");
  const panels = arrayValue(payload, "panels");
  const openFiles = arrayValue(payload, "openFiles");
  const diagnostics = arrayValue(payload, "diagnostics");
  return [
    `Terminals: ${terminals.length}`,
    `Panels: ${panels.length}`,
    `Open files: ${openFiles.length}`,
    `Diagnostics: ${diagnostics.length}`
  ].join("\n");
}

function resultRecord(payload: BridgePayload) {
  return isRecord(payload.result) ? payload.result : payload;
}

function stringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function numberField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function booleanField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function arrayField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function formatBrowserList(payload: BridgePayload) {
  const data = resultRecord(payload);
  const browsers = arrayField(data, ["browsers", "browserPanes", "panes", "items"]);
  const count = numberField(data, ["count", "browserCount", "total"]) ?? browsers.length;
  const lines = [`Browser panes: ${count}`];
  for (const item of browsers) {
    if (!isRecord(item)) continue;
    const title = stringField(item, ["title", "name", "label", "contentId", "paneId"]) || "Untitled";
    const url = stringField(item, ["url", "currentUrl", "href"]);
    const active = booleanField(item, ["active", "isActive", "focused"]) === true ? " active" : "";
    lines.push(`- ${title}${url ? ` ${url}` : ""}${active}`);
  }
  return lines.join("\n");
}

function formatExplorerState(payload: BridgePayload) {
  const data = resultRecord(payload);
  const open = booleanField(data, ["explorerOpen", "open", "isOpen"]);
  const root = stringField(data, ["rootDir", "rootPath", "root", "workspaceRoot"]);
  const selected = stringField(data, ["selectedPath", "selectionPath", "selectedFile", "selectedFilePath"]);
  return [
    `File Explorer: ${open === false ? "closed" : "open"}`,
    root ? `Root: ${root}` : "Root: unavailable",
    selected ? `Selected: ${selected}` : "Selected: unavailable"
  ].join("\n");
}

function capabilityPath(value: unknown) {
  return typeof value === "object" && value !== null && "path" in value
    ? String((value as { path?: unknown }).path ?? "")
    : "";
}

function formatCapabilities(payload: BridgePayload) {
  const capabilities = arrayValue(payload, "capabilities");
  const lines = capabilities
    .map((capability) => {
      const path = capabilityPath(capability);
      if (!path) return "";
      const typed = capability as { kind?: unknown; callable?: unknown; readable?: unknown };
      const kind = typed.kind ? ` [${String(typed.kind)}]` : "";
      const flags = [
        typed.readable === true ? "readable" : "",
        typed.callable === true ? "callable" : ""
      ].filter(Boolean);
      return `- ${path}${kind}${flags.length > 0 ? ` ${flags.join(" ")}` : ""}`;
    })
    .filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : "No Xenesis Desk capabilities are registered.";
}

function formatCapabilityDescription(payload: BridgePayload, fallbackPath: string) {
  const capability = payload.capability && typeof payload.capability === "object"
    ? payload.capability as Record<string, unknown>
    : {};
  return [
    `Path: ${String(capability.path ?? payload.path ?? fallbackPath)}`,
    capability.kind ? `Kind: ${String(capability.kind)}` : undefined,
    capability.label ? `Label: ${String(capability.label)}` : undefined,
    capability.description ? `Description: ${String(capability.description)}` : undefined,
    capability.readable === true ? "Readable: yes" : undefined,
    capability.callable === true ? "Callable: yes" : undefined,
    capability.subscribable === true ? "Subscribable: yes" : undefined
  ].filter((line): line is string => line !== undefined).join("\n");
}

export const deskStateTool: Tool<z.infer<typeof bridgeReadInput>> = {
  name: "desk_state",
  description: "Read the current Xenesis Desk bridge state: terminals, panels, open files, diagnostics, and renderer state.",
  inputSchema: bridgeReadInput,
  openaiInputSchema: bridgeReadInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callDeskBridge(context, "/state", {}, input.timeoutMs ?? 5000);
      if (payload.ok === false) return { ok: false, content: String(payload.error ?? "Xenesis Desk state request failed."), data: payload };
      return { ok: true, content: formatDeskState(payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskActiveContextTool: Tool<z.infer<typeof bridgeReadInput>> = {
  name: "desk_active_context",
  description: "Read the currently active Xenesis Desk pane, content, file, panel, or terminal context.",
  inputSchema: bridgeReadInput,
  openaiInputSchema: bridgeReadInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callDeskBridge(context, "/active-context", {}, input.timeoutMs ?? 5000);
      if (payload.ok === false) return { ok: false, content: String(payload.error ?? "Xenesis Desk active context request failed."), data: payload };
      return { ok: true, content: jsonContent(payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskBrowserListTool: Tool<z.infer<typeof deskBrowserListInput>> = {
  name: "desk_browser_list",
  description: "Read visible Xenesis Desk browser panes, including count, titles, URLs, and active state. Use for natural-language browser tab status questions.",
  inputSchema: deskBrowserListInput,
  openaiInputSchema: deskBrowserListInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(context, "xd.panes.browser.list", {}, false, input.timeoutMs ?? 5000);
      if (payload.approvalRequired) return { ok: true, content: "Browser pane list requires Desk approval.", data: payload };
      if (payload.ok === false) return { ok: false, content: String(payload.error ?? "Browser pane list failed."), data: payload };
      return { ok: true, content: formatBrowserList(payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskExplorerStateTool: Tool<z.infer<typeof deskExplorerStateInput>> = {
  name: "desk_explorer_state",
  description: "Read local Xenesis Desk file explorer state, including whether it is open, its root, and selected path.",
  inputSchema: deskExplorerStateInput,
  openaiInputSchema: deskExplorerStateInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(context, "xd.explorer.local.state", {}, false, input.timeoutMs ?? 5000);
      if (payload.approvalRequired) return { ok: true, content: "File explorer state requires Desk approval.", data: payload };
      if (payload.ok === false) return { ok: false, content: String(payload.error ?? "File explorer state failed."), data: payload };
      return { ok: true, content: formatExplorerState(payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskCapabilitiesTool: Tool<z.infer<typeof capabilitiesInput>> = {
  name: "desk_capabilities",
  description: "List Xenesis Desk bridge capabilities, or describe one capability by path.",
  inputSchema: capabilitiesInput,
  openaiInputSchema: capabilitiesOpenAIInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const path = typeof input.path === "string" ? input.path.trim() : "";
      const endpoint = path ? "/capabilities/describe" : "/capabilities/list";
      const payload = await callDeskBridge(context, endpoint, path ? { path } : {}, input.timeoutMs ?? 5000);
      if (payload.ok === false) return { ok: false, content: String(payload.error ?? "Xenesis Desk capability request failed."), data: payload };
      return {
        ok: true,
        content: path ? formatCapabilityDescription(payload, path) : formatCapabilities(payload),
        data: payload
      };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskCallCapabilityTool: Tool<z.infer<typeof callCapabilityInput>> = {
  name: "desk_call_capability",
  description: "Call a registered Xenesis Desk bridge capability by path. Control/write/execute capabilities may require Desk approval. Use xd.apps.* for visible external desktop app control, and prefer registered appId values such as notepad over arbitrary executable paths.",
  inputSchema: callCapabilityInput,
  openaiInputSchema: callCapabilityOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const args = parseCapabilityArgs(input);
      const payload = await callDeskBridge(context, "/capabilities/call", {
        path: input.path,
        args,
        source: "xenesis",
        approved: input.approved === true
      }, input.timeoutMs ?? 10_000);
      if (payload.approvalRequired) {
        const item = payload.actionInboxItem && typeof payload.actionInboxItem === "object"
          ? payload.actionInboxItem as { id?: unknown }
          : {};
        const id = typeof item.id === "string" && item.id ? ` Approval request: ${item.id}` : "";
        return {
          ok: true,
          content: `Xenesis Desk capability approval required: ${String(payload.path ?? input.path)}.${id}`,
          data: payload
        };
      }
      if (payload.ok === false) return { ok: false, content: String(payload.error ?? `Xenesis Desk capability call failed: ${input.path}`), data: payload };
      return {
        ok: true,
        content: `Called Xenesis Desk capability: ${String(payload.path ?? input.path)}`,
        data: payload
      };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskXvCommandTool: Tool<z.infer<typeof deskXvCommandInput>> = {
  name: "desk_xd_command",
  description: "Route a concise /xd command through the Xenesis Desk bridge and Capability Registry. Supports status, context, actions, logs, commands, run, tail, stop, open, xcon, validate, capabilities, call, and xd.apps.* external desktop app control such as notepad.",
  inputSchema: deskXvCommandInput,
  openaiInputSchema: deskXvCommandOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const route = resolveXvCommandRoute(input.command, input.approved === true);
      const payload = await callDeskBridge(context, route.endpoint, route.body, input.timeoutMs ?? 10_000);
      if (payload.ok === false && !payload.approvalRequired) {
        return { ok: false, content: String(payload.error ?? `Xenesis Desk /xd command failed: ${route.label}`), data: payload };
      }
      return {
        ok: true,
        content: `Xenesis Desk /xd ${route.label}\n${route.format(payload)}`,
        data: payload
      };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskOpenFileTool: Tool<z.infer<typeof deskOpenFileInput>> = {
  name: "desk_open_file",
  description: "Open an existing local file in Xenesis Desk using the Desk bridge.",
  inputSchema: deskOpenFileInput,
  openaiInputSchema: deskOpenFileOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.files.open",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 10_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk file open failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.files.open"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskTerminalRunTool: Tool<z.infer<typeof deskTerminalRunInput>> = {
  name: "desk_terminal_run",
  description: "Run a command in a visible Xenesis Desk terminal.",
  inputSchema: deskTerminalRunInput,
  openaiInputSchema: deskTerminalRunOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.terminals.run",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 10_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk terminal command failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.terminals.run"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskTerminalRunAndWaitTool: Tool<z.infer<typeof deskTerminalRunAndWaitInput>> = {
  name: "desk_terminal_run_and_wait",
  description: "Run a one-shot command through Xenesis Desk and return exit status plus captured output. Prefer this when the task needs command results, not a visible interactive terminal.",
  inputSchema: deskTerminalRunAndWaitInput,
  openaiInputSchema: deskTerminalRunAndWaitOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.terminals.runAndWait",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 120_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk terminal run-and-wait failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.terminals.runAndWait"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskSubagentStartTool: Tool<z.infer<typeof deskSubagentStartInput>> = {
  name: "desk_subagent_start",
  description: "Start delegated work as a Desk-visible subagent in its own Xenesis Desk terminal. Prefer this over invisible background delegation when the user wants to watch each subagent separately.",
  inputSchema: deskSubagentStartInput,
  openaiInputSchema: deskSubagentStartOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const args = buildDeskSubagentTerminalArgs(input);
      const payload = await callCapabilityPath(
        context,
        "xd.terminals.run",
        args,
        input.approved === true,
        input.timeoutMs ?? 10_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk subagent terminal failed."), data: payload };
      return {
        ok: true,
        content: `Desk-visible subagent requested: ${args.metadata.agent} - ${args.metadata.task}`,
        data: payload
      };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskSubagentListTool: Tool<z.infer<typeof deskSubagentListInput>> = {
  name: "desk_subagent_list",
  description: "List Xenesis Desk terminal sessions so a parent agent can find Desk-visible subagents.",
  inputSchema: deskSubagentListInput,
  openaiInputSchema: deskSubagentListOpenAIInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(context, "xd.terminals.list", {}, false, input.timeoutMs ?? 5000);
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk terminal list failed."), data: payload };
      return { ok: true, content: jsonContent(payload.result ?? payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskSubagentTailTool: Tool<z.infer<typeof deskTerminalTailInput>> = {
  name: "desk_subagent_tail",
  description: "Read recent output from a Desk-visible subagent terminal session.",
  inputSchema: deskTerminalTailInput,
  openaiInputSchema: deskTerminalTailOpenAIInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.terminals.tail",
        withoutControlFields(input as Record<string, unknown>),
        false,
        input.timeoutMs ?? 5000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk subagent tail failed."), data: payload };
      return { ok: true, content: jsonContent(payload.result ?? payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskSubagentStopTool: Tool<z.infer<typeof deskTerminalStopInput>> = {
  name: "desk_subagent_stop",
  description: "Stop a Desk-visible subagent terminal session.",
  inputSchema: deskTerminalStopInput,
  openaiInputSchema: deskTerminalStopOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.terminals.stop",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 10_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk subagent stop failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.terminals.stop"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskCommandPaletteTool: Tool<z.infer<typeof deskCommandPaletteInput>> = {
  name: "desk_command_palette",
  description: "List searchable Xenesis Desk command palette commands.",
  inputSchema: deskCommandPaletteInput,
  openaiInputSchema: deskCommandPaletteOpenAIInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.commands.palette.list",
        withoutControlFields(input as Record<string, unknown>),
        false,
        input.timeoutMs ?? 5000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk command palette list failed."), data: payload };
      return { ok: true, content: jsonContent(payload.result ?? payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskRunCommandPaletteTool: Tool<z.infer<typeof deskRunCommandPaletteInput>> = {
  name: "desk_run_command_palette",
  description: "Run a command palette command in Xenesis Desk.",
  inputSchema: deskRunCommandPaletteInput,
  openaiInputSchema: deskRunCommandPaletteOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.commands.palette.run",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 10_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk command palette command failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.commands.palette.run"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskCreateXconMarkdownTool: Tool<z.infer<typeof deskCreateXconMarkdownInput>> = {
  name: "desk_create_xcon_markdown",
  description: "Create a rendered XCON/SKETCH Markdown artifact inside Xenesis Desk. Do not use this for normal workspace .md file writes; use write, patch, or edit instead.",
  inputSchema: deskCreateXconMarkdownInput,
  openaiInputSchema: deskCreateXconMarkdownOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.artifacts.xconMarkdown.create",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 30_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk XCON Markdown creation failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.artifacts.xconMarkdown.create"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskExportXconPdfTool: Tool<z.infer<typeof deskExportXconPdfInput>> = {
  name: "desk_export_xcon_pdf",
  description: "Export an existing XCON/SKETCH Markdown file to PDF through Xenesis Desk.",
  inputSchema: deskExportXconPdfInput,
  openaiInputSchema: deskExportXconPdfOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.artifacts.xconMarkdown.exportPdf",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 30_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk XCON PDF export failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.artifacts.xconMarkdown.exportPdf"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskTerminalTailTool: Tool<z.infer<typeof deskTerminalTailInput>> = {
  name: "desk_terminal_tail",
  description: "Read recent output from a known Xenesis Desk terminal session.",
  inputSchema: deskTerminalTailInput,
  openaiInputSchema: deskTerminalTailOpenAIInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.terminals.tail",
        withoutControlFields(input as Record<string, unknown>),
        false,
        input.timeoutMs ?? 5000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk terminal tail failed."), data: payload };
      return { ok: true, content: jsonContent(payload.result ?? payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskTerminalStopTool: Tool<z.infer<typeof deskTerminalStopInput>> = {
  name: "desk_terminal_stop",
  description: "Stop a known Xenesis Desk terminal session.",
  inputSchema: deskTerminalStopInput,
  openaiInputSchema: deskTerminalStopOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.terminals.stop",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 10_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk terminal stop failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.terminals.stop"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskContextActionsTool: Tool<z.infer<typeof deskContextActionsInput>> = {
  name: "desk_context_actions",
  description: "List context-aware Xenesis Desk actions for the currently active pane, content, file, panel, or terminal.",
  inputSchema: deskContextActionsInput,
  openaiInputSchema: deskContextActionsInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.context.actions",
        {},
        false,
        input.timeoutMs ?? 5000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk context actions failed."), data: payload };
      return { ok: true, content: jsonContent(payload.result ?? payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskRecentDiagnosticsTool: Tool<z.infer<typeof deskRecentDiagnosticsInput>> = {
  name: "desk_recent_diagnostics",
  description: "Read recent Xenesis Desk diagnostics entries.",
  inputSchema: deskRecentDiagnosticsInput,
  openaiInputSchema: deskRecentDiagnosticsOpenAIInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.diagnostics.recent",
        withoutControlFields(input as Record<string, unknown>),
        false,
        input.timeoutMs ?? 5000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk recent diagnostics failed."), data: payload };
      return { ok: true, content: jsonContent(payload.result ?? payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskPlaywrightSnapshotTool: Tool<z.infer<typeof deskPlaywrightSnapshotInput>> = {
  name: "desk_playwright_snapshot",
  description: "Capture a URL screenshot through Xenesis Desk Playwright automation.",
  inputSchema: deskPlaywrightSnapshotInput,
  openaiInputSchema: deskPlaywrightSnapshotOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.playwright.snapshot",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 60_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk Playwright snapshot failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.playwright.snapshot"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskPlaywrightRunTool: Tool<z.infer<typeof deskPlaywrightRunInput>> = {
  name: "desk_playwright_run",
  description: "Run ordered Playwright browser actions through Xenesis Desk.",
  inputSchema: deskPlaywrightRunInput,
  openaiInputSchema: deskPlaywrightRunOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      if (input.actions.some(isIndexPlaywrightAction)) {
        const result = await runDeskPlaywrightIndexActions(input, context);
        if (!("snapshot" in result)) return result;
        return {
          ok: true,
          content: renderSurfaceSnapshot(result.snapshot),
          data: result.snapshot
        };
      }
      const payload = await callCapabilityPath(
        context,
        "xd.playwright.run",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 60_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk Playwright run failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.playwright.run"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskSafeFilePreviewTool: Tool<z.infer<typeof deskSafeFilePreviewInput>> = {
  name: "desk_safe_file_preview",
  description: "Preview a safe Xenesis Desk text file write without changing disk.",
  inputSchema: deskSafeFilePreviewInput,
  openaiInputSchema: deskSafeFilePreviewOpenAIInput,
  isReadOnly: () => true,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.files.previewTextWrite",
        withoutControlFields(input as Record<string, unknown>),
        false,
        input.timeoutMs ?? 10_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk safe file preview failed."), data: payload };
      return { ok: true, content: jsonContent(payload.result ?? payload), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};

export const deskSafeFileApplyTool: Tool<z.infer<typeof deskSafeFileApplyInput>> = {
  name: "desk_safe_file_apply",
  description: "Apply a safe Xenesis Desk text file write with backup metadata.",
  inputSchema: deskSafeFileApplyInput,
  openaiInputSchema: deskSafeFileApplyOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    try {
      const payload = await callCapabilityPath(
        context,
        "xd.files.applyTextWrite",
        withoutControlFields(input as Record<string, unknown>),
        input.approved === true,
        input.timeoutMs ?? 10_000
      );
      if (payload.ok === false && !payload.approvalRequired) return { ok: false, content: String(payload.error ?? "Xenesis Desk safe file apply failed."), data: payload };
      return { ok: true, content: formatCapabilityCallResult(payload, "xd.files.applyTextWrite"), data: payload };
    } catch (error) {
      return errorResult(error);
    }
  }
};
