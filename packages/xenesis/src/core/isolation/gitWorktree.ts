import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { xenesisStatePath } from "../../config/index.js";

const execFileAsync = promisify(execFile);
const slugSegmentPattern = /^[a-zA-Z0-9._-]+$/u;
const adjectives = ["clean", "focused", "steady", "bright", "direct", "durable", "local", "fresh"];
const nouns = ["branch", "task", "path", "workspace", "change", "thread", "lane", "copy"];

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function pathExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function randomItem(values: string[]) {
  return values[randomBytes(4).readUInt32BE(0) % values.length]!;
}

export function generateWorktreeName() {
  return `${randomItem(adjectives)}-${randomItem(nouns)}-${randomBytes(3).toString("hex")}`;
}

export function validateWorktreeSlug(name: string) {
  if (name.length === 0 || name.length > 64) return false;
  const segments = name.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) return false;
  return segments.every((segment) => slugSegmentPattern.test(segment));
}

export function flattenWorktreeSlug(name: string) {
  return name.replace(/\//gu, "+");
}

export function worktreeBranchName(name: string) {
  return `worktree-${flattenWorktreeSlug(name)}`;
}

export function worktreePathFor(xenesisHome: string, name: string) {
  return xenesisStatePath(xenesisHome, "worktrees", flattenWorktreeSlug(name));
}

export async function execCommand(command: string, args: string[], cwd: string): Promise<CommandResult> {
  try {
    const result = await execFileAsync(command, args, {
      cwd,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_ASKPASS: ""
      }
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0
    };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: string | number;
    };
    return {
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? execError.message,
      exitCode: typeof execError.code === "number" ? execError.code : 1
    };
  }
}

export async function git(cwd: string, args: string[]) {
  return await execCommand("git", args, cwd);
}

export async function requireGit(cwd: string, args: string[], failureMessage: string) {
  const result = await git(cwd, args);
  if (result.exitCode !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    throw new Error(detail ? `${failureMessage}: ${detail}` : failureMessage);
  }
  return result.stdout.trim();
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  const result = await git(cwd, ["rev-parse", "--is-inside-work-tree"]);
  return result.exitCode === 0 && result.stdout.trim() === "true";
}

export async function gitRoot(cwd: string) {
  return await requireGit(cwd, ["rev-parse", "--show-toplevel"], "Not inside a git repository");
}

export async function gitHead(cwd: string) {
  return await requireGit(cwd, ["rev-parse", "HEAD"], "Unable to resolve HEAD commit");
}

export async function currentBranch(cwd: string) {
  const result = await git(cwd, ["branch", "--show-current"]);
  return result.exitCode === 0 && result.stdout.trim().length > 0 ? result.stdout.trim() : undefined;
}

function countPorcelainEntries(output: string) {
  return output.split(/\r?\n/u).filter((line) => line.trim().length > 0).length;
}

export async function countDirtyFiles(worktreePath: string) {
  const result = await git(worktreePath, ["status", "--porcelain"]);
  if (result.exitCode !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    throw new Error(detail ? `Unable to inspect worktree status: ${detail}` : "Unable to inspect worktree status");
  }
  return countPorcelainEntries(result.stdout);
}

export async function countNewCommits(worktreePath: string, originalHeadCommit: string) {
  const result = await git(worktreePath, ["rev-list", "--count", `${originalHeadCommit}..HEAD`]);
  if (result.exitCode !== 0) {
    const detail = (result.stderr || result.stdout).trim();
    throw new Error(detail ? `Unable to inspect worktree commits: ${detail}` : "Unable to inspect worktree commits");
  }
  return Number.parseInt(result.stdout.trim(), 10) || 0;
}

export async function branchExists(gitRootPath: string, branch: string) {
  const result = await git(gitRootPath, ["rev-parse", "--verify", "--quiet", branch]);
  return result.exitCode === 0;
}

function normalizedPath(path: string) {
  const resolved = resolve(path);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export async function isIsolatedWorktreeRoot(path: string) {
  const result = await git(path, ["rev-parse", "--show-toplevel"]);
  return result.exitCode === 0 && normalizedPath(result.stdout.trim()) === normalizedPath(path);
}

export async function addWorktree(gitRootPath: string, branch: string, worktreePath: string) {
  await mkdir(dirname(worktreePath), { recursive: true });
  if (await pathExists(worktreePath)) {
    throw new Error(`Worktree path already exists: ${worktreePath}`);
  }
  await requireGit(gitRootPath, ["worktree", "add", "-B", branch, worktreePath, "HEAD"], "Unable to create git worktree");
}

export async function removeWorktree(gitRootPath: string, worktreePath: string) {
  await requireGit(gitRootPath, ["worktree", "remove", "--force", worktreePath], "Unable to remove git worktree");
}

export async function deleteBranchIfExists(gitRootPath: string, branch: string) {
  if (await branchExists(gitRootPath, branch)) {
    await requireGit(gitRootPath, ["branch", "-D", branch], "Unable to delete worktree branch");
  }
}
