import { spawn } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { z } from "zod";
import { assertExistingPathInsideWorkspace } from "../utils/workspace.js";
import { ripgrepExecutables, type RipgrepExecutable } from "./ripgrep.js";
import type { Tool } from "./types.js";

const searchInput = z.object({
  pattern: z.string().min(1),
  path: z.string().min(1).default(".")
});

const ignoredDirectories = new Set([".git", ".xenesis", "dist", "node_modules"]);
const searchableExtensions = new Set([
  "",
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ps1",
  ".sh",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);
const MAX_FALLBACK_FILES = 1000;
const MAX_SEARCH_RESULT_LINES = 120;
const MAX_SEARCH_RESULT_CHARS = 12000;

function truncateSearchOutput(content: string) {
  if (content === "No matches.") return content;

  const lines = content.split(/\r?\n/);
  const kept: string[] = [];
  let chars = 0;

  for (const line of lines) {
    const nextChars = chars + line.length + (kept.length > 0 ? 1 : 0);
    if (kept.length >= MAX_SEARCH_RESULT_LINES || nextChars > MAX_SEARCH_RESULT_CHARS) break;
    kept.push(line);
    chars = nextChars;
  }

  if (kept.length === lines.length) return content;

  return [
    ...kept,
    `[search output truncated: showing first ${kept.length} of ${lines.length} matching lines; narrow pattern/path or read a specific file.]`
  ].join("\n");
}

async function collectSearchFiles(
  workspaceRoot: string,
  current: string,
  files: string[]
): Promise<void> {
  if (files.length >= MAX_FALLBACK_FILES) return;
  const currentStat = await stat(current);
  if (currentStat.isFile()) {
    if (searchableExtensions.has(extname(current))) files.push(current);
    return;
  }

  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (files.length >= MAX_FALLBACK_FILES) return;
    const absolutePath = join(current, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await collectSearchFiles(workspaceRoot, absolutePath, files);
      }
      continue;
    }
    if (!entry.isFile() || !searchableExtensions.has(extname(entry.name))) continue;

    try {
      await assertExistingPathInsideWorkspace(workspaceRoot, absolutePath);
      files.push(absolutePath);
    } catch {
      // Skip symlink escapes or files that cannot be safely resolved inside the workspace.
    }
  }
}

async function fallbackSearch(workspaceRoot: string, searchPath: string, pattern: string) {
  const files: string[] = [];
  await collectSearchFiles(workspaceRoot, searchPath, files);
  const lines: string[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }

    content.split(/\r?\n/).forEach((line, index) => {
      if (line.includes(pattern)) {
        const relativePath = relative(workspaceRoot, file).replace(/\\/g, "/");
        lines.push(`${relativePath}:${index + 1}:${line}`);
      }
    });
  }

  return {
    ok: true,
    content: lines.length > 0 ? truncateSearchOutput(lines.join("\n")) : "No matches."
  };
}

function runRipgrep(
  executable: RipgrepExecutable,
  args: string[],
  cwd: string
): Promise<
  | { type: "result"; result: { ok: boolean; content: string } }
  | { type: "unavailable" }
> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { type: "result"; result: { ok: boolean; content: string } } | { type: "unavailable" }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const child = spawn(executable.path, args, {
      cwd,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if (/ENOENT/i.test(error.message)) finish({ type: "unavailable" });
      else finish({ type: "result", result: { ok: false, content: `Failed to run ${executable.source} rg: ${error.message}` } });
    });
    child.on("close", (code) => {
      if (settled) return;
      if (code === 0) finish({ type: "result", result: { ok: true, content: truncateSearchOutput(stdout.trimEnd()) } });
      else if (code === 1) finish({ type: "result", result: { ok: true, content: "No matches." } });
      else finish({ type: "result", result: { ok: false, content: stderr.trimEnd() || `${executable.source} rg exited with code ${code}` } });
    });
  });
}

export const searchTool: Tool<z.infer<typeof searchInput>> = {
  name: "search",
  description: "Search text inside the workspace. Uses rg when available and falls back to a built-in text search.",
  inputSchema: searchInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const searchPath = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path);
    const args = ["--no-config", "--line-number", "--color", "never", "--", input.pattern, searchPath];

    for (const executable of await ripgrepExecutables()) {
      const result = await runRipgrep(executable, args, context.cwd);
      if (result.type === "result") return result.result;
    }

    try {
      return await fallbackSearch(context.workspaceRoot, searchPath, input.pattern);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, content: `Failed to search workspace: ${message}` };
    }
  }
};
