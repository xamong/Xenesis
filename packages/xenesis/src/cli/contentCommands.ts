import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { FileArtifactStore } from "../artifacts/index.js";
import { FileWorkspaceContextIndexStore, type WorkspaceContextFile } from "../context/index.js";
import type { XenesisConfig } from "../config/index.js";
import { displayXenesisStatePath, xenesisStatePath } from "../config/index.js";
import type { AgentMessage } from "../core/messages.js";
import {
  compactSessionEvents,
  eventsToMessages,
  readSessionLog,
  type SessionLogRecord
} from "../sessions/index.js";
import { prepareWorkspaceWritePath } from "../utils/workspace.js";

export type BriefCommandAction = "status" | "on" | "off" | "toggle";

interface CliContentState extends Record<string, unknown> {
  briefOnly?: boolean;
  updatedAt?: string;
}

interface SessionMetadata {
  name?: string;
  tag?: string;
  updatedAt?: string;
}

interface SessionMetadataFile {
  sessions: Record<string, SessionMetadata>;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSessionId(sessionId: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/u.test(sessionId)) {
    throw new Error(`Invalid session id: ${sessionId}`);
  }
  return sessionId;
}

function sessionDir(config: XenesisConfig) {
  return xenesisStatePath(config.xenesisHome, "sessions");
}

function cliStatePath(config: XenesisConfig) {
  return xenesisStatePath(config.xenesisHome, "cli_state.json");
}

function metadataPath(config: XenesisConfig) {
  return xenesisStatePath(config.xenesisHome, "sessions", "metadata.json");
}

async function readJsonFile(path: string): Promise<unknown | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as unknown;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return undefined;
    throw error;
  }
}

async function readCliContentState(config: XenesisConfig): Promise<CliContentState> {
  const raw = await readJsonFile(cliStatePath(config));
  if (!isRecord(raw)) return {};
  const state: CliContentState = { ...raw };
  if (typeof raw.briefOnly !== "boolean") delete state.briefOnly;
  if (typeof raw.updatedAt !== "string") delete state.updatedAt;
  return state;
}

async function writeCliContentState(config: XenesisConfig, state: CliContentState) {
  const path = cliStatePath(config);
  const nextState: CliContentState = {
    ...state,
    updatedAt: new Date().toISOString()
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  return nextState;
}

function normalizeMetadata(raw: unknown): SessionMetadataFile {
  if (!isRecord(raw) || !isRecord(raw.sessions)) return { sessions: {} };
  const sessions: Record<string, SessionMetadata> = {};
  for (const [sessionId, value] of Object.entries(raw.sessions)) {
    if (!isRecord(value)) continue;
    sessions[sessionId] = {
      ...(typeof value.name === "string" && value.name.trim() ? { name: value.name.trim() } : {}),
      ...(typeof value.tag === "string" && value.tag.trim() ? { tag: value.tag.trim() } : {}),
      ...(typeof value.updatedAt === "string" ? { updatedAt: value.updatedAt } : {})
    };
  }
  return { sessions };
}

async function readSessionMetadata(config: XenesisConfig) {
  return normalizeMetadata(await readJsonFile(metadataPath(config)));
}

async function writeSessionMetadata(config: XenesisConfig, metadata: SessionMetadataFile) {
  const path = metadataPath(config);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

async function latestSessionId(config: XenesisConfig) {
  let files;
  try {
    files = await readdir(sessionDir(config), { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new Error("No local sessions found.");
    }
    throw error;
  }

  const sessions = await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith(".jsonl"))
      .map(async (file) => ({
        id: file.name.slice(0, -".jsonl".length),
        mtimeMs: (await stat(resolve(sessionDir(config), file.name))).mtimeMs
      }))
  );
  const latest = sessions.sort((left, right) => right.mtimeMs - left.mtimeMs)[0];
  if (!latest) throw new Error("No local sessions found.");
  return latest.id;
}

async function resolveSessionId(config: XenesisConfig, requestedSessionId?: string) {
  if (!requestedSessionId || requestedSessionId === "latest") return await latestSessionId(config);
  return validateSessionId(requestedSessionId);
}

async function readResolvedSession(config: XenesisConfig, requestedSessionId?: string) {
  const sessionId = await resolveSessionId(config, requestedSessionId);
  return {
    sessionId,
    records: await readSessionLog(config.xenesisHome, sessionId)
  };
}

function messageText(message: AgentMessage) {
  return message.content.trim();
}

function recentAssistantTexts(records: SessionLogRecord[]) {
  return eventsToMessages(records)
    .filter((message): message is Extract<AgentMessage, { role: "assistant" }> => (
      message.role === "assistant" && messageText(message).length > 0
    ))
    .reverse()
    .slice(0, 20)
    .map((message) => messageText(message));
}

function lineCount(text: string) {
  return text.length === 0 ? 0 : text.split(/\r?\n/u).length;
}

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[-:.]/g, "").replace(/Z$/u, "Z");
}

function ensureTextFilename(filename: string) {
  const trimmed = filename.trim();
  if (trimmed.toLowerCase().endsWith(".txt")) return trimmed;
  return `${trimmed.replace(/\.[^./\\]+$/u, "")}.txt`;
}

function renderMessages(records: SessionLogRecord[]) {
  const chunks: string[] = [];
  for (const record of records) {
    if (record.type === "user_message") {
      chunks.push(`## User\n\n${record.message.content}`);
    } else if (record.type === "assistant_message") {
      chunks.push(`## Assistant\n\n${record.message.content}`);
    } else if (record.type === "tool_result") {
      chunks.push(`## Tool Result: ${record.message.name}\n\n${record.message.content}`);
    } else if (record.type === "run_state") {
      chunks.push(`## Run State\n\nstatus=${record.status}\nphase=${record.phase}\nturns=${record.turns}\nsummary=${record.summary}`);
    } else if (record.type === "artifact") {
      chunks.push(`## Artifact\n\n${record.artifactId} - ${record.title} (${record.kind})`);
    } else if (record.type === "done") {
      chunks.push(`## Done\n\n${record.content}`);
    } else if (record.type === "incomplete_run") {
      chunks.push(`## Incomplete Run\n\nreason=${record.reason}\nturns=${record.turns}\nsummary=${record.summary}`);
    } else if (record.type === "stopped") {
      chunks.push(`## Stopped\n\nreason=${record.reason}\nturns=${record.turns}`);
    }
  }
  return chunks.join("\n\n").trim();
}

function renderSessionExport(sessionId: string, records: SessionLogRecord[]) {
  const first = records[0];
  const traceId = records.find((record) => typeof record.traceId === "string" && record.traceId.trim())?.traceId;
  const header = [
    "# Xenesis Session Export",
    "",
    `session: ${sessionId}`,
    traceId ? `trace: ${traceId}` : undefined,
    first ? `startedAt: ${first.timestamp}` : undefined,
    records.at(-1) ? `exportedThrough: ${records.at(-1)!.timestamp}` : undefined
  ].filter((line): line is string => line !== undefined).join("\n");
  const body = renderMessages(records);
  return body ? `${header}\n\n${body}\n` : `${header}\n`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .replace(/-+/gu, "-");
}

const generatedNameStopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "for",
  "from",
  "how",
  "the",
  "this",
  "that",
  "with",
  "you",
  "your"
]);

function deriveSessionName(records: SessionLogRecord[]) {
  const text = eventsToMessages(records)
    .find((message) => message.role === "user" && message.content.trim().length > 0)
    ?.content ?? renderMessages(records);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .split(/\s+/u)
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && !generatedNameStopWords.has(word))
    .slice(0, 4);
  return words.length > 0 ? words.join("-") : "local-session";
}

function normalizeTag(value: string) {
  return value
    .trim()
    .replace(/^#+/u, "")
    .replace(/\s+/gu, "-")
    .replace(/[^A-Za-z0-9_.-]+/gu, "")
    .replace(/^-+|-+$/gu, "");
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function extensionLabel(extension: string) {
  return extension || "(none)";
}

function fileLine(prefix: string, file: WorkspaceContextFile) {
  return `${prefix}: ${file.path} ${formatBytes(file.size)}${file.text ? " text" : " binary"}`;
}

export async function renderBriefCommand(config: XenesisConfig, action: BriefCommandAction) {
  const state = await readCliContentState(config);
  const current = state.briefOnly === true;
  const next = action === "toggle" ? !current : action === "on" ? true : action === "off" ? false : current;

  if (action !== "status") {
    await writeCliContentState(config, {
      ...state,
      briefOnly: next
    });
  }

  return [
    `brief: enabled=${next}`,
    `brief: source=${action === "status" ? (state.briefOnly === undefined ? "default" : "state") : "state"}`,
    "brief: entitlement=not-checked-local",
    "brief: providerCalls=false",
    `brief: statePath=${displayXenesisStatePath(config.xenesisHome, cliStatePath(config))}`
  ];
}

export async function renderCopyCommand(config: XenesisConfig, requestedSessionId?: string, messageNumber = 1) {
  if (!Number.isInteger(messageNumber) || messageNumber < 1) {
    throw new Error(`copy message number must be a positive integer, got ${messageNumber}`);
  }

  const { sessionId, records } = await readResolvedSession(config, requestedSessionId);
  const texts = recentAssistantTexts(records);
  if (texts.length === 0) return [`copy: session=${sessionId}`, "copy: no assistant message"];
  if (messageNumber > texts.length) {
    return [
      `copy: session=${sessionId}`,
      `copy: only ${texts.length} assistant ${texts.length === 1 ? "message" : "messages"} available`
    ];
  }

  const text = texts[messageNumber - 1]!;
  const path = xenesisStatePath(config.xenesisHome, "copy", "response.md");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
  return [
    `copy: session=${sessionId}`,
    `copy: message=${messageNumber}`,
    `copy: characters=${text.length} lines=${lineCount(text)}`,
    `copy: written=${displayXenesisStatePath(config.xenesisHome, path)}`,
    "copy: clipboard=false"
  ];
}

export async function renderExportCommand(
  config: XenesisConfig,
  requestedSessionId?: string,
  filename?: string
) {
  const { sessionId, records } = await readResolvedSession(config, requestedSessionId);
  const content = renderSessionExport(sessionId, records);
  let outputPath: string;
  let displayPath: string;

  if (filename?.trim()) {
    const finalFilename = ensureTextFilename(filename);
    outputPath = await prepareWorkspaceWritePath(config.workspace, finalFilename);
    displayPath = outputPath;
  } else {
    outputPath = xenesisStatePath(config.xenesisHome, "exports", `${timestampForFilename()}-${sessionId}.txt`);
    displayPath = displayXenesisStatePath(config.xenesisHome, outputPath);
    await mkdir(dirname(outputPath), { recursive: true });
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
  return [
    `export: session=${sessionId}`,
    `export: written=${displayPath}`,
    `export: characters=${content.length} lines=${lineCount(content)}`,
    "export: providerCalls=false"
  ];
}

export async function renderShareCommand(config: XenesisConfig, requestedSessionId?: string) {
  const { sessionId, records } = await readResolvedSession(config, requestedSessionId);
  const store = new FileArtifactStore({ xenesisHome: config.xenesisHome });
  const record = await store.save({
    title: `Shared session ${sessionId}`,
    kind: "local-share",
    sessionId,
    content: renderSessionExport(sessionId, records)
  });
  return [
    `share: session=${sessionId}`,
    "share: remote=false",
    "share: providerCalls=false",
    `share: artifact=${record.id}`
  ];
}

export async function renderSummaryCommand(config: XenesisConfig, requestedSessionId?: string) {
  const { sessionId, records } = await readResolvedSession(config, requestedSessionId);
  return [
    `summary: session=${sessionId}`,
    "summary: providerCalls=false",
    compactSessionEvents(records)
  ];
}

export async function renderRenameCommand(config: XenesisConfig, requestedSessionId: string, requestedName?: string) {
  const sessionId = validateSessionId(requestedSessionId);
  const records = await readSessionLog(config.xenesisHome, sessionId);
  const providedName = requestedName?.trim();
  const name = providedName ? slugify(providedName) : deriveSessionName(records);
  if (!name) throw new Error("Session name cannot be empty.");

  const metadata = await readSessionMetadata(config);
  metadata.sessions[sessionId] = {
    ...metadata.sessions[sessionId],
    name,
    updatedAt: new Date().toISOString()
  };
  await writeSessionMetadata(config, metadata);

  return [
    `rename: session=${sessionId}`,
    `rename: name=${name}`,
    `rename: source=${providedName ? "provided" : "local"}`,
    "rename: providerCalls=false",
    `rename: metadata=${displayXenesisStatePath(config.xenesisHome, metadataPath(config))}`
  ];
}

export async function renderTagCommand(config: XenesisConfig, requestedSessionId: string, requestedTag: string) {
  const sessionId = validateSessionId(requestedSessionId);
  await readSessionLog(config.xenesisHome, sessionId);
  const tag = normalizeTag(requestedTag);
  if (!tag) throw new Error("Tag name cannot be empty.");

  const metadata = await readSessionMetadata(config);
  const current = metadata.sessions[sessionId]?.tag;
  const next: SessionMetadata = {
    ...metadata.sessions[sessionId],
    updatedAt: new Date().toISOString()
  };
  if (current === tag) delete next.tag;
  else next.tag = tag;
  metadata.sessions[sessionId] = next;
  await writeSessionMetadata(config, metadata);

  return [
    `tag: session=${sessionId}`,
    current === tag ? `tag: removed=#${tag}` : `tag: set=#${tag}`,
    `tag: metadata=${displayXenesisStatePath(config.xenesisHome, metadataPath(config))}`
  ];
}

export async function renderCtxVizCommand(config: XenesisConfig, query?: string) {
  const store = new FileWorkspaceContextIndexStore({
    workspaceRoot: config.workspace,
    xenesisHome: config.xenesisHome
  });
  const index = await store.read();
  if (!index) return ["ctx-viz: no context index", "ctx-viz: run `xenesis context index` first"];

  const queryText = query?.trim();
  if (queryText) {
    const matches = await store.search(queryText, 10);
    return [
      `ctx-viz: query=${queryText}`,
      `ctx-viz: matches=${matches.length}`,
      ...matches.map((file) => fileLine("match", file))
    ];
  }

  const byExtension = new Map<string, { files: number; bytes: number }>();
  for (const file of index.files) {
    const key = extensionLabel(file.extension);
    const current = byExtension.get(key) ?? { files: 0, bytes: 0 };
    current.files += 1;
    current.bytes += file.size;
    byExtension.set(key, current);
  }
  const extensionLines = Array.from(byExtension.entries())
    .sort((left, right) => right[1].files - left[1].files || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([extension, bucket]) => `ctx-viz: extension=${extension} files=${bucket.files} bytes=${bucket.bytes}`);
  const largest = [...index.files]
    .sort((left, right) => right.size - left.size || left.path.localeCompare(right.path))
    .slice(0, 5)
    .map((file) => fileLine("largest", file));

  return [
    `ctx-viz: workspace=${index.workspaceRoot}`,
    `ctx-viz: indexedAt=${index.indexedAt}`,
    `ctx-viz: files=${index.fileCount} totalSize=${index.totalSize}`,
    ...extensionLines,
    ...largest
  ];
}

export function inferCopyArgs(args: string[]): { sessionId?: string; messageNumber?: number } {
  const [first, second, ...rest] = args;
  if (rest.length > 0) throw new Error('Command "copy" accepts at most a session id and message number.');
  if (!first) return {};
  if (/^\d+$/u.test(first)) return { messageNumber: Number(first) };
  if (!second) return { sessionId: first };
  if (!/^\d+$/u.test(second)) throw new Error('Command "copy" message number must be a positive integer.');
  return {
    sessionId: first,
    messageNumber: Number(second)
  };
}
