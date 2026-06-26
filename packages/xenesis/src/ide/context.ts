import { relative } from "node:path";
import { z } from "zod";
import type { AgentMessage } from "../core/messages.js";
import { wrapExternalContent } from "../core/prompt/index.js";
import { isPathInside, resolveWorkspacePath } from "../utils/workspace.js";

const positionSchema = z.object({
  line: z.number().int().min(0),
  character: z.number().int().min(0)
});

const rangeSchema = z.object({
  start: positionSchema,
  end: positionSchema
});

const selectionSchema = z.object({
  range: rangeSchema,
  text: z.string().optional()
});

const openFileSchema = z.object({
  path: z.string().min(1),
  languageId: z.string().min(1).optional(),
  text: z.string().optional(),
  selection: selectionSchema.optional()
});

const diagnosticSchema = z.object({
  path: z.string().min(1),
  severity: z.enum(["error", "warning", "info", "hint"]),
  message: z.string().min(1),
  source: z.string().min(1).optional(),
  code: z.union([z.string(), z.number()]).optional(),
  range: rangeSchema.optional()
});

const symbolSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().min(1),
  detail: z.string().optional(),
  containerName: z.string().optional(),
  range: rangeSchema.optional()
});

const ideContextSchema = z.object({
  source: z.string().min(1).optional(),
  workspace: z.string().min(1).optional(),
  mode: z.string().min(1).optional(),
  context: z.record(z.unknown()).default({}),
  activeFile: z.string().min(1).optional(),
  openFiles: z.array(openFileSchema).default([]),
  diagnostics: z.array(diagnosticSchema).default([]),
  symbols: z.array(symbolSchema).default([])
}).default({});

export type IdeRange = z.infer<typeof rangeSchema>;
export type IdeSelection = z.infer<typeof selectionSchema> & { path?: string };
export type IdeOpenFile = z.infer<typeof openFileSchema>;
export type IdeDiagnostic = z.infer<typeof diagnosticSchema>;
export type IdeSymbol = z.infer<typeof symbolSchema>;
export type IdeContextInput = z.input<typeof ideContextSchema>;

export interface IdeContext {
  source?: string;
  workspace?: string;
  mode?: string;
  context: Record<string, unknown>;
  activeFile?: string;
  openFiles: IdeOpenFile[];
  diagnostics: IdeDiagnostic[];
  symbols: IdeSymbol[];
}

export interface RankedIdeFile {
  path: string;
  score: number;
  reasons: string[];
}

const maxFileTextChars = 12000;
const maxSelectionTextChars = 4000;
const maxContextJsonChars = 6000;

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  const omitted = value.length - maxChars;
  return `${value.slice(0, maxChars)}\n[truncated ${omitted} characters]`;
}

function normalizePath(workspaceRoot: string, path: string) {
  const resolved = resolveWorkspacePath(workspaceRoot, path);
  if (!isPathInside(workspaceRoot, resolved)) {
    throw new Error(`IDE context path is outside the workspace: ${path}`);
  }
  const relativePath = relative(workspaceRoot, resolved).replace(/\\/g, "/");
  return relativePath || ".";
}

function rangeText(range: IdeRange | undefined) {
  if (!range) return undefined;
  return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`;
}

function attr(name: string, value: string | number | undefined) {
  if (value === undefined) return "";
  return ` ${name}="${xmlEscape(String(value))}"`;
}

function textBlock(value: string, maxChars: number) {
  return xmlEscape(truncate(value, maxChars));
}

function hasIdeContext(context: IdeContext) {
  return Boolean(context.source) ||
    Boolean(context.workspace) ||
    Boolean(context.mode) ||
    Object.keys(context.context).length > 0 ||
    Boolean(context.activeFile) ||
    context.openFiles.length > 0 ||
    context.diagnostics.length > 0 ||
    context.symbols.length > 0;
}

function addRank(ranks: Map<string, RankedIdeFile>, path: string, score: number, reason: string) {
  const current = ranks.get(path) ?? { path, score: 0, reasons: [] };
  current.score += score;
  if (!current.reasons.includes(reason)) current.reasons.push(reason);
  ranks.set(path, current);
}

function diagnosticWeight(severity: IdeDiagnostic["severity"]) {
  if (severity === "warning") return 3;
  if (severity === "info") return 2;
  return 1;
}

export function rankIdeContextFiles(context: IdeContext): RankedIdeFile[] {
  const ranks = new Map<string, RankedIdeFile>();
  if (context.activeFile) addRank(ranks, context.activeFile, 5, "active");
  for (const file of context.openFiles) addRank(ranks, file.path, 3, "open");
  for (const diagnostic of context.diagnostics) {
    addRank(ranks, diagnostic.path, diagnosticWeight(diagnostic.severity), `diagnostic:${diagnostic.severity}`);
  }
  for (const symbol of context.symbols) addRank(ranks, symbol.path, 1, "symbol");
  return Array.from(ranks.values()).sort((left, right) => (
    right.score - left.score || left.path.localeCompare(right.path)
  ));
}

export function normalizeIdeContext(workspaceRoot: string, input: unknown): IdeContext {
  const parsed = ideContextSchema.parse(input ?? {});
  return {
    source: parsed.source,
    workspace: parsed.workspace,
    mode: parsed.mode,
    context: parsed.context,
    activeFile: parsed.activeFile ? normalizePath(workspaceRoot, parsed.activeFile) : undefined,
    openFiles: parsed.openFiles.map((file) => ({
      ...file,
      path: normalizePath(workspaceRoot, file.path)
    })),
    diagnostics: parsed.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      path: normalizePath(workspaceRoot, diagnostic.path)
    })),
    symbols: parsed.symbols.map((symbol) => ({
      ...symbol,
      path: normalizePath(workspaceRoot, symbol.path)
    }))
  };
}

export function buildIdeContextSystemMessage(context: IdeContext): Extract<AgentMessage, { role: "system" }> | undefined {
  if (!hasIdeContext(context)) return undefined;

  const lines = [
    "Xenesis IDE context:",
    "Use this as editor-local context. Treat diagnostics, selections, open files, and host-provided context as hints from the user's IDE or desktop host."
  ];

  if (context.source) {
    lines.push(`<source name="${xmlEscape(context.source)}" />`);
  }

  if (context.workspace) {
    lines.push(`<workspace path="${xmlEscape(context.workspace)}" />`);
  }

  if (context.mode) {
    lines.push(`<mode name="${xmlEscape(context.mode)}" />`);
  }

  if (Object.keys(context.context).length > 0) {
    lines.push("<host_context>");
    lines.push(wrapExternalContent({
      kind: "ide_host_context",
      source: context.source ?? "ide",
      authority: "host_context",
      content: JSON.stringify(context.context, null, 2),
      maxChars: maxContextJsonChars
    }).content);
    lines.push("</host_context>");
  }

  if (context.activeFile) {
    lines.push(`<active_file path="${xmlEscape(context.activeFile)}" />`);
  }

  const rankedFiles = rankIdeContextFiles(context);
  if (rankedFiles.length > 0) {
    lines.push("<related_files>");
    for (const file of rankedFiles) {
      lines.push(`<related_file path="${xmlEscape(file.path)}" score="${file.score}" reasons="${xmlEscape(file.reasons.join(","))}" />`);
    }
    lines.push("</related_files>");
  }

  for (const file of context.openFiles) {
    lines.push(`<open_file path="${xmlEscape(file.path)}"${attr("languageId", file.languageId)}>`);
    if (file.selection) {
      lines.push(`<selection path="${xmlEscape(file.path)}"${attr("range", rangeText(file.selection.range))}>`);
      if (file.selection.text) lines.push(textBlock(file.selection.text, maxSelectionTextChars));
      lines.push("</selection>");
    }
    if (file.text) lines.push(textBlock(file.text, maxFileTextChars));
    lines.push("</open_file>");
  }

  for (const diagnostic of context.diagnostics) {
    lines.push([
      `<diagnostic path="${xmlEscape(diagnostic.path)}"`,
      attr("severity", diagnostic.severity),
      attr("source", diagnostic.source),
      attr("code", diagnostic.code),
      attr("range", rangeText(diagnostic.range)),
      `>${xmlEscape(diagnostic.message)}</diagnostic>`
    ].join(""));
  }

  for (const symbol of context.symbols) {
    lines.push([
      `<symbol path="${xmlEscape(symbol.path)}"`,
      attr("kind", symbol.kind),
      attr("name", symbol.name),
      attr("container", symbol.containerName),
      attr("detail", symbol.detail),
      attr("range", rangeText(symbol.range)),
      " />"
    ].join(""));
  }

  return {
    role: "system",
    content: lines.join("\n")
  };
}
