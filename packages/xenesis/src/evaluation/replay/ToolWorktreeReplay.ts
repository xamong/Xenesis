import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { createBuiltInTools } from "../../tools/index.js";
import type { ToolContext, ToolResult } from "../../tools/types.js";
import { branchExists, git } from "../../core/isolation/gitWorktree.js";
import { readWorktreeSession } from "../../tools/worktreeSessionStore.js";
import type { WorktreeSessionState } from "../../core/isolation/types.js";
import type { OracleObservation } from "./GoldenReplay.js";

export interface ToolWorktreeReplayInput {
  invalidName: string;
  keepName: string;
  dirtyName: string;
  dirtyFile: string;
}

export interface ToolWorktreeReplayOptions {
  workspaceRoot: string;
  xenesisHome: string;
  input: ToolWorktreeReplayInput;
}

interface MutableContextState {
  workspaceRoot: string;
  cwd: string;
  cwdChanges: string[];
  workspaceRootChanges: string[];
}

function context(options: Pick<ToolWorktreeReplayOptions, "workspaceRoot" | "xenesisHome">): ToolContext {
  const state: MutableContextState = {
    workspaceRoot: options.workspaceRoot,
    cwd: options.workspaceRoot,
    cwdChanges: [],
    workspaceRootChanges: []
  };
  const toolContext: ToolContext = {
    workspaceRoot: state.workspaceRoot,
    xenesisHome: options.xenesisHome,
    cwd: state.cwd,
    sessionId: "worktree-oracle-session",
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    },
    setWorkspaceRoot: (workspaceRoot) => {
      state.workspaceRoot = workspaceRoot;
      toolContext.workspaceRoot = workspaceRoot;
      state.workspaceRootChanges.push(workspaceRoot);
    },
    setCwd: (cwd) => {
      state.cwd = cwd;
      toolContext.cwd = cwd;
      state.cwdChanges.push(cwd);
    }
  };
  Object.defineProperty(toolContext, "__worktreeOracleState", {
    value: state,
    enumerable: false
  });
  return toolContext;
}

function contextState(toolContext: ToolContext): MutableContextState {
  return (toolContext as ToolContext & { __worktreeOracleState: MutableContextState }).__worktreeOracleState;
}

function dataRecord(result: ToolResult): Record<string, unknown> {
  return result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
}

function stringData(result: ToolResult, key: string): string {
  const value = dataRecord(result)[key];
  return typeof value === "string" ? value : "";
}

function numberData(result: ToolResult, key: string): number {
  const value = dataRecord(result)[key];
  return typeof value === "number" ? value : -1;
}

function actionData(result: ToolResult): string {
  return stringData(result, "action");
}

function contentIncludes(content: string, expected: string): string {
  return content.includes(expected) ? expected : "";
}

function pathSuffix(root: string, path: string): string {
  return relative(root, path).replace(/\\/gu, "/");
}

async function exists(path: string): Promise<boolean> {
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

async function currentBranch(path: string): Promise<string> {
  const result = await git(path, ["branch", "--show-current"]);
  return result.stdout.trim();
}

async function writeText(path: string, text: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

function projectSession(session: WorktreeSessionState | undefined, mode: "active" | "exited") {
  if (!session) {
    throw new Error("Expected worktree session state");
  }
  return {
    active: session.active,
    worktreeName: session.worktreeName,
    worktreeBranch: session.worktreeBranch,
    ...(mode === "active" ? {
      hasOriginalHeadCommit: /^[0-9a-f]{40}$/u.test(session.originalHeadCommit),
      hasEnteredAt: typeof session.enteredAt === "string"
    } : {
      action: session.action,
      discardedFiles: session.discardedFiles,
      discardedCommits: session.discardedCommits,
      hasExitedAt: typeof session.exitedAt === "string"
    })
  };
}

export async function collectToolWorktreeObservation(options: ToolWorktreeReplayOptions): Promise<OracleObservation> {
  const tools = createBuiltInTools();
  const enter = tools.get("enter_worktree");
  const exit = tools.get("exit_worktree");
  if (!enter || !exit) {
    throw new Error("Expected built-in enter_worktree and exit_worktree tools");
  }

  const toolContext = context(options);
  const state = contextState(toolContext);

  const invalidName = await enter.run({ name: options.input.invalidName }, toolContext);
  const enterKeep = await enter.run({ name: options.input.keepName }, toolContext);
  const keepWorktreePath = stringData(enterKeep, "worktreePath");
  const keepWorktreeBranch = stringData(enterKeep, "worktreeBranch");
  const keepSessionActive = await readWorktreeSession(options.xenesisHome, toolContext.sessionId);
  const duplicateEnter = await enter.run({ name: "another-worktree" }, toolContext);
  const keepBranch = await currentBranch(keepWorktreePath);
  const exitKeep = await exit.run({ action: "keep" }, toolContext);
  const keepSessionExited = await readWorktreeSession(options.xenesisHome, toolContext.sessionId);
  const exitNoop = await exit.run({ action: "keep" }, toolContext);

  const enterDirty = await enter.run({ name: options.input.dirtyName }, toolContext);
  const dirtyWorktreePath = stringData(enterDirty, "worktreePath");
  const dirtyWorktreeBranch = stringData(enterDirty, "worktreeBranch");
  await writeText(join(dirtyWorktreePath, options.input.dirtyFile), "dirty\n");
  const blockedRemoveDirty = await exit.run({ action: "remove" }, toolContext);
  const dirtyExistsAfterBlock = await exists(dirtyWorktreePath);
  const removedDirty = await exit.run({ action: "remove", discard_changes: true }, toolContext);

  return {
    ledgerEntries: [
      {
        type: "tool.worktree_lifecycle",
        invalidName: {
          ok: invalidName.ok,
          contentIncludes: contentIncludes(invalidName.content, "Invalid worktree name")
        },
        enterKeep: {
          ok: enterKeep.ok,
          contentIncludes: [
            contentIncludes(enterKeep.content, `Created worktree "${options.input.keepName}"`),
            contentIncludes(enterKeep.content, `Session is now isolated in branch ${keepWorktreeBranch}.`)
          ],
          data: {
            worktreeBranch: keepWorktreeBranch,
            worktreePathSuffix: pathSuffix(options.workspaceRoot, keepWorktreePath)
          },
          session: projectSession(keepSessionActive, "active"),
          context: {
            cwdChangedToWorktree: state.cwdChanges[0] === keepWorktreePath,
            workspaceRootChangedToWorktree: state.workspaceRootChanges[0] === keepWorktreePath
          },
          git: {
            branch: keepBranch
          }
        },
        duplicateEnter: {
          ok: duplicateEnter.ok,
          contentIncludes: contentIncludes(duplicateEnter.content, "Already in a worktree session")
        },
        exitKeep: {
          ok: exitKeep.ok,
          contentIncludes: contentIncludes(exitKeep.content, "Exited worktree"),
          data: {
            action: actionData(exitKeep),
            worktreeBranch: stringData(exitKeep, "worktreeBranch"),
            discardedFiles: numberData(exitKeep, "discardedFiles"),
            discardedCommits: numberData(exitKeep, "discardedCommits")
          },
          session: projectSession(keepSessionExited, "exited"),
          keptWorktreeExists: await exists(keepWorktreePath),
          keptBranchExists: await branchExists(options.workspaceRoot, keepWorktreeBranch)
        },
        exitNoop: {
          ok: exitNoop.ok,
          contentIncludes: contentIncludes(exitNoop.content, "No-op: there is no active EnterWorktree session."),
          data: {
            action: actionData(exitNoop),
            message: stringData(exitNoop, "message")
          }
        },
        enterDirty: {
          ok: enterDirty.ok,
          data: {
            worktreeBranch: dirtyWorktreeBranch,
            worktreePathSuffix: pathSuffix(options.workspaceRoot, dirtyWorktreePath)
          }
        },
        blockedRemoveDirty: {
          ok: blockedRemoveDirty.ok,
          contentIncludes: [
            contentIncludes(blockedRemoveDirty.content, "Worktree has 1 changed file(s)"),
            contentIncludes(blockedRemoveDirty.content, "Run exit_worktree with discard_changes: true")
          ],
          dirtyWorktreeStillExists: dirtyExistsAfterBlock
        },
        removedDirty: {
          ok: removedDirty.ok,
          contentIncludes: contentIncludes(removedDirty.content, "Exited and removed worktree"),
          data: {
            action: actionData(removedDirty),
            worktreeBranch: stringData(removedDirty, "worktreeBranch"),
            discardedFiles: numberData(removedDirty, "discardedFiles"),
            discardedCommits: numberData(removedDirty, "discardedCommits")
          },
          dirtyWorktreeExists: await exists(dirtyWorktreePath),
          dirtyBranchExists: await branchExists(options.workspaceRoot, dirtyWorktreeBranch)
        }
      }
    ],
    finalStatus: "tool_worktree_lifecycle_oracle_ready",
    visibleResult: "worktree tools validate names, create durable git worktree sessions, block duplicate entry, keep or remove worktrees safely, and require explicit discard confirmation for dirty removal"
  };
}
