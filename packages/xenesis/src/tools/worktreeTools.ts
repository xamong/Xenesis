import { z } from "zod";
import {
  addWorktree,
  countDirtyFiles,
  countNewCommits,
  currentBranch,
  deleteBranchIfExists,
  generateWorktreeName,
  gitHead,
  gitRoot,
  removeWorktree,
  validateWorktreeSlug,
  worktreeBranchName,
  worktreePathFor
} from "../core/isolation/gitWorktree.js";
import type { WorktreeSessionState } from "../core/isolation/types.js";
import { readWorktreeSession, writeWorktreeSession } from "./worktreeSessionStore.js";
import type { Tool, ToolContext } from "./types.js";

const enterWorktreeInputSchema = z.object({
  name: z.string().nullable().optional()
});

const exitWorktreeInputSchema = z.object({
  action: z.enum(["keep", "remove"]),
  discard_changes: z.boolean().nullable().optional()
});

type EnterWorktreeInput = z.infer<typeof enterWorktreeInputSchema>;
type ExitWorktreeInput = z.infer<typeof exitWorktreeInputSchema>;

interface EnterWorktreeOutput {
  worktreePath: string;
  worktreeBranch: string;
  message: string;
}

interface ExitWorktreeOutput {
  action: ExitWorktreeInput["action"] | "noop";
  originalCwd?: string;
  worktreePath?: string;
  worktreeBranch?: string;
  discardedFiles?: number;
  discardedCommits?: number;
  message: string;
}

function requireXenesisHome(context: ToolContext) {
  if (!context.xenesisHome) {
    throw new Error("Xenesis home is required for durable worktree state.");
  }
  return context.xenesisHome;
}

function now() {
  return new Date().toISOString();
}

async function enterWorktree(input: EnterWorktreeInput, context: ToolContext) {
  const requestedName = typeof input.name === "string"
    ? input.name
    : generateWorktreeName();
  if (!validateWorktreeSlug(requestedName)) {
    return {
      ok: false,
      content: "Invalid worktree name. Use letters, numbers, dot, underscore, dash, and slash-separated path segments only."
    };
  }

  const home = requireXenesisHome(context);
  const active = await readWorktreeSession(home, context.sessionId);
  if (active?.active) {
    return {
      ok: false,
      content: `Already in a worktree session at ${active.worktreePath}. Exit the current worktree before entering another.`
    };
  }

  const root = await gitRoot(context.cwd);
  const branch = worktreeBranchName(requestedName);
  const path = worktreePathFor(home, requestedName);
  const originalHeadCommit = await gitHead(root);
  const originalBranch = await currentBranch(root);

  await addWorktree(root, branch, path);

  const timestamp = now();
  const session: WorktreeSessionState = {
    active: true,
    originalWorkspaceRoot: context.workspaceRoot,
    originalCwd: context.cwd,
    gitRoot: root,
    worktreePath: path,
    worktreeName: requestedName,
    worktreeBranch: branch,
    ...(originalBranch ? { originalBranch } : {}),
    originalHeadCommit,
    enteredAt: timestamp,
    updatedAt: timestamp
  };
  await writeWorktreeSession(home, context.sessionId, session);
  context.setWorkspaceRoot?.(path);
  context.setCwd?.(path);

  const data: EnterWorktreeOutput = {
    worktreePath: path,
    worktreeBranch: branch,
    message: `Created worktree "${requestedName}" at ${path}.`
  };
  return {
    ok: true,
    content: `${data.message}\nSession is now isolated in branch ${branch}.`,
    data
  };
}

async function exitWorktree(input: ExitWorktreeInput, context: ToolContext) {
  const home = requireXenesisHome(context);
  const current = await readWorktreeSession(home, context.sessionId);
  if (!current?.active) {
    const data: ExitWorktreeOutput = {
      action: "noop",
      message: "No-op: there is no active EnterWorktree session."
    };
    return {
      ok: true,
      content: data.message,
      data
    };
  }

  const dirtyFiles = await countDirtyFiles(current.worktreePath);
  const newCommits = await countNewCommits(current.worktreePath, current.originalHeadCommit);
  if (input.action === "remove" && !input.discard_changes && (dirtyFiles > 0 || newCommits > 0)) {
    return {
      ok: false,
      content: [
        `Worktree has ${dirtyFiles} changed file(s) and ${newCommits} new commit(s).`,
        "Removing it would discard this work permanently.",
        "Run exit_worktree with discard_changes: true to confirm removal."
      ].join(" ")
    };
  }

  if (input.action === "remove") {
    await removeWorktree(current.gitRoot, current.worktreePath);
    await deleteBranchIfExists(current.gitRoot, current.worktreeBranch);
  }

  const timestamp = now();
  const nextSession: WorktreeSessionState = {
    ...current,
    active: false,
    action: input.action,
    discardedFiles: input.action === "remove" ? dirtyFiles : 0,
    discardedCommits: input.action === "remove" ? newCommits : 0,
    exitedAt: timestamp,
    updatedAt: timestamp
  };
  await writeWorktreeSession(home, context.sessionId, nextSession);
  context.setWorkspaceRoot?.(current.originalWorkspaceRoot ?? current.gitRoot);
  context.setCwd?.(current.originalCwd);

  const message = input.action === "remove"
    ? `Exited and removed worktree ${current.worktreePath}.`
    : `Exited worktree ${current.worktreePath}; directory and branch were kept.`;
  const data: ExitWorktreeOutput = {
    action: input.action,
    originalCwd: current.originalCwd,
    worktreePath: current.worktreePath,
    worktreeBranch: current.worktreeBranch,
    discardedFiles: input.action === "remove" ? dirtyFiles : 0,
    discardedCommits: input.action === "remove" ? newCommits : 0,
    message
  };
  return {
    ok: true,
    content: message,
    data
  };
}

export const enterWorktreeTool: Tool<EnterWorktreeInput, EnterWorktreeOutput> = {
  name: "enter_worktree",
  description: "Create a durable isolated git worktree for the current Xenesis session.",
  inputSchema: enterWorktreeInputSchema,
  openaiInputSchema: enterWorktreeInputSchema,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  async run(input, context) {
    try {
      return await enterWorktree(input, context);
    } catch (error) {
      return {
        ok: false,
        content: `EnterWorktree tool failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};

export const exitWorktreeTool: Tool<ExitWorktreeInput, ExitWorktreeOutput> = {
  name: "exit_worktree",
  description: "Exit the active Xenesis git worktree session, keeping or removing the worktree.",
  inputSchema: exitWorktreeInputSchema,
  openaiInputSchema: exitWorktreeInputSchema,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  async run(input, context) {
    try {
      return await exitWorktree(input, context);
    } catch (error) {
      return {
        ok: false,
        content: `ExitWorktree tool failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};
