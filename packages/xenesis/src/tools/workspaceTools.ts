import { lstat, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { z } from "zod";
import {
  normalizeReadSnapshotInput,
  readFreshTextForMutation,
  readSnapshotInputSchema,
  writeTextIfReadStateFresh
} from "../core/files/index.js";
import type { ReadSnapshot } from "../core/files/index.js";
import { assertExistingPathInsideWorkspace } from "../utils/workspace.js";
import type { Tool } from "./types.js";

const defaultIgnoredDirectories = new Set([".git", ".xenesis", "dist", "node_modules"]);
const MAX_GLOB_SCAN_ENTRIES = 10_000;

const globInput = z.object({
  pattern: z.string().min(1),
  path: z.string().min(1).default("."),
  maxResults: z.number().int().positive().max(1000).default(200),
  includeDirectories: z.boolean().default(false),
  ignore: z.array(z.string().min(1)).default([])
});

const treeInput = z.object({
  path: z.string().min(1).default("."),
  depth: z.number().int().positive().max(8).default(3),
  ignore: z.array(z.string().min(1)).default([])
});

const pathInput = z.object({ path: z.string().min(1) });

const diffInput = z.object({
  path: z.string().min(1),
  content: z.string()
});

const patchInput = z.object({
  path: z.string().min(1),
  oldText: z.string().min(1),
  newText: z.string(),
  replaceAll: z.boolean().default(false),
  expectedReplacements: z.number().int().positive().nullable().optional(),
  readState: readSnapshotInputSchema.nullable().optional()
});

function normalizePath(value: string) {
  return value.replace(/\\/g, "/");
}

function globPatternToRegExp(pattern: string) {
  const normalized = normalizePath(pattern);
  let source = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    const afterNext = normalized[index + 2];

    if (char === "*" && next === "*" && afterNext === "/") {
      source += "(?:.*/)?";
      index += 2;
      continue;
    }
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
      continue;
    }
    if (char === "*") {
      source += "[^/]*";
      continue;
    }
    if (char === "?") {
      source += "[^/]";
      continue;
    }
    source += char.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
  }
  source += "$";
  return new RegExp(source);
}

function ignoreSet(extra: string[]) {
  return new Set([...defaultIgnoredDirectories, ...extra]);
}

function isIgnoredDirectory(name: string, ignored: Set<string>) {
  return ignored.has(name) || name.startsWith(".xenesis");
}

async function collectEntries(
  workspaceRoot: string,
  current: string,
  ignored: Set<string>,
  entries: { path: string; isDirectory: boolean }[],
  includeDirectories: boolean,
  scanLimit: number
): Promise<void> {
  if (entries.length >= scanLimit) return;
  const children = await readdir(current, { withFileTypes: true });
  for (const child of children.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entries.length >= scanLimit) return;
    const absolutePath = join(current, child.name);
    const relativePath = normalizePath(relative(workspaceRoot, absolutePath));
    if (child.isDirectory()) {
      if (isIgnoredDirectory(child.name, ignored)) continue;
      if (includeDirectories) entries.push({ path: relativePath, isDirectory: true });
      await collectEntries(workspaceRoot, absolutePath, ignored, entries, includeDirectories, scanLimit);
      continue;
    }
    if (child.isFile()) entries.push({ path: relativePath, isDirectory: false });
  }
}

export const globTool: Tool<z.infer<typeof globInput>> = {
  name: "glob",
  description: "Find workspace files by glob pattern without using shell.",
  inputSchema: globInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const root = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path ?? ".");
    const entries: { path: string; isDirectory: boolean }[] = [];
    const maxResults = input.maxResults ?? 200;
    await collectEntries(
      context.workspaceRoot,
      root,
      ignoreSet(input.ignore ?? []),
      entries,
      input.includeDirectories ?? false,
      MAX_GLOB_SCAN_ENTRIES
    );
    const matcher = globPatternToRegExp(input.pattern);
    const matches = entries
      .map((entry) => entry.path)
      .filter((entryPath) => matcher.test(entryPath))
      .slice(0, maxResults);
    return { ok: true, content: matches.length > 0 ? matches.join("\n") : "No matches." };
  }
};

async function renderTree(
  workspaceRoot: string,
  current: string,
  depth: number,
  maxDepth: number,
  ignored: Set<string>,
  lines: string[]
) {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isDirectory() && isIgnoredDirectory(entry.name, ignored)) continue;
    const absolutePath = join(current, entry.name);
    const relativePath = normalizePath(relative(workspaceRoot, absolutePath));
    if (entry.isDirectory()) {
      lines.push(`${relativePath}/`);
      if (depth < maxDepth) await renderTree(workspaceRoot, absolutePath, depth + 1, maxDepth, ignored, lines);
    } else if (entry.isFile()) {
      lines.push(relativePath);
    }
  }
}

export const treeTool: Tool<z.infer<typeof treeInput>> = {
  name: "tree",
  description: "Show a bounded directory tree inside the workspace.",
  inputSchema: treeInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const root = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path ?? ".");
    const lines: string[] = [];
    await renderTree(context.workspaceRoot, root, 1, input.depth ?? 3, ignoreSet(input.ignore ?? []), lines);
    return { ok: true, content: lines.length > 0 ? lines.join("\n") : "No entries." };
  }
};

export const fileInfoTool: Tool<z.infer<typeof pathInput>> = {
  name: "file_info",
  description: "Report file metadata inside the workspace without reading file contents.",
  inputSchema: pathInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const absolutePath = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path);
    const [stats, linkStats] = await Promise.all([stat(absolutePath), lstat(absolutePath)]);
    const type = stats.isDirectory() ? "directory" : stats.isFile() ? "file" : "other";
    return {
      ok: true,
      content: JSON.stringify({
        path: normalizePath(relative(context.workspaceRoot, absolutePath)) || ".",
        name: basename(absolutePath),
        extension: extname(absolutePath),
        type,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        readonly: false,
        symlink: linkStats.isSymbolicLink()
      }, null, 2)
    };
  }
};

function splitLines(content: string) {
  return content.replace(/\r\n/g, "\n").split("\n");
}

function simpleDiff(path: string, oldContent: string, newContent: string) {
  if (oldContent === newContent) return "No changes.";
  const oldLines = splitLines(oldContent);
  const newLines = splitLines(newContent);
  const lines = [`--- ${path}`, "+++ proposed"];
  const max = Math.max(oldLines.length, newLines.length);
  for (let index = 0; index < max; index += 1) {
    const oldLine = oldLines[index];
    const newLine = newLines[index];
    if (oldLine === newLine) {
      if (oldLine !== undefined && oldLine !== "") lines.push(` ${oldLine}`);
      continue;
    }
    if (oldLine !== undefined && oldLine !== "") lines.push(`-${oldLine}`);
    if (newLine !== undefined && newLine !== "") lines.push(`+${newLine}`);
  }
  return lines.join("\n");
}

export const diffTool: Tool<z.infer<typeof diffInput>> = {
  name: "diff",
  description: "Compare a workspace file with proposed UTF-8 content.",
  inputSchema: diffInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const absolutePath = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path);
    const current = await readFile(absolutePath, "utf8");
    return { ok: true, content: simpleDiff(input.path, current, input.content) };
  }
};

export const patchTool: Tool<z.infer<typeof patchInput>> = {
  name: "patch",
  description: "Safely apply an exact text replacement to one workspace file.",
  inputSchema: patchInput,
  isReadOnly: () => false,
  async run(input, context) {
    let guardedReadState: ReadSnapshot | undefined;
    let absolutePath: string;
    let current: string;
    if (input.readState != null) {
      try {
        guardedReadState = normalizeReadSnapshotInput(input.readState);
        const fresh = await readFreshTextForMutation({
          workspaceRoot: context.workspaceRoot,
          path: input.path,
          readState: guardedReadState
        });
        absolutePath = fresh.absolutePath;
        current = fresh.content;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, content: `Patch not applied: ${message} No changes were applied to ${input.path}.` };
      }
    } else {
      absolutePath = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path);
      current = await readFile(absolutePath, "utf8");
    }
    if (!current.includes(input.oldText)) {
      return { ok: false, content: `Patch not applied: text not found in ${input.path}. No changes were applied.` };
    }

    const replacementCount = current.split(input.oldText).length - 1;
    const actualReplacements = input.replaceAll === true ? replacementCount : 1;
    if (input.expectedReplacements != null && input.expectedReplacements !== actualReplacements) {
      return {
        ok: false,
        content: `Patch not applied: expected ${input.expectedReplacements} replacement(s) in ${input.path}, found ${actualReplacements}. No changes were applied.`
      };
    }

    const updated = input.replaceAll === true
      ? current.split(input.oldText).join(input.newText)
      : current.replace(input.oldText, input.newText);
    if (guardedReadState) {
      try {
        await writeTextIfReadStateFresh({
          workspaceRoot: context.workspaceRoot,
          path: input.path,
          readState: guardedReadState,
          content: updated
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, content: `Patch not applied: ${message} No changes were applied to ${input.path}.` };
      }
    } else {
      await writeFile(absolutePath, updated, "utf8");
    }
    return { ok: true, content: `Patched ${input.path} with ${actualReplacements} replacement(s).` };
  }
};
