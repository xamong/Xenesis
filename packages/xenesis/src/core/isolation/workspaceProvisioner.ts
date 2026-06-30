import { randomBytes } from 'node:crypto';
import { readWorktreeSession, writeWorktreeSession } from '../../tools/worktreeSessionStore.js';
import {
  addWorktree,
  countDirtyFiles,
  countNewCommits,
  currentBranch,
  deleteBranchIfExists,
  gitHead,
  gitRoot,
  isGitRepo,
  removeWorktree,
  worktreeBranchName,
  worktreePathFor,
} from './gitWorktree.js';
import type {
  IsolationMode,
  IsolationOutcome,
  ProvisionedWorkspace,
  ProvisionRequest,
  WorkspaceProvisioner,
  WorktreeSessionState,
} from './types.js';

export interface ProvisionerDeps {
  xenesisHome?: string;
  keepWorktree: 'if-changed' | 'always' | 'never';
}

function nowIso() {
  return new Date().toISOString();
}

function worktreeNameForTask(taskId: string) {
  const slug = taskId
    .replace(/[^a-zA-Z0-9._-]/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '');
  const base = slug.length > 0 ? slug.slice(0, 54) : 'task';
  return `${base}-${randomBytes(4).toString('hex')}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export class SharedWorkspaceProvisioner implements WorkspaceProvisioner {
  async provision(req: ProvisionRequest): Promise<ProvisionedWorkspace> {
    return {
      workspaceRoot: req.baseWorkspace,
      cwd: req.baseCwd,
      mode: 'shared',
      async cleanup(): Promise<IsolationOutcome> {
        return { mode: 'shared', changedFiles: 0, newCommits: 0, kept: false };
      },
    };
  }
}

export class GitWorktreeProvisioner implements WorkspaceProvisioner {
  constructor(private readonly deps: ProvisionerDeps) {}

  async provision(req: ProvisionRequest): Promise<ProvisionedWorkspace> {
    if (!(await isGitRepo(req.baseCwd))) {
      throw new Error('worktree isolation requires a git repository');
    }
    const xenesisHome = this.deps.xenesisHome ?? req.xenesisHome;
    if (!xenesisHome) {
      throw new Error('worktree isolation requires xenesisHome');
    }

    const root = await gitRoot(req.baseCwd);
    const name = worktreeNameForTask(req.taskId);
    const branch = worktreeBranchName(name);
    const path = worktreePathFor(xenesisHome, name);
    const originalHeadCommit = await gitHead(root);
    const originalBranch = await currentBranch(root);

    await addWorktree(root, branch, path);

    const timestamp = nowIso();
    const session: WorktreeSessionState = {
      active: true,
      originalWorkspaceRoot: req.baseWorkspace,
      originalCwd: req.baseCwd,
      gitRoot: root,
      worktreePath: path,
      worktreeName: name,
      worktreeBranch: branch,
      ...(originalBranch ? { originalBranch } : {}),
      originalHeadCommit,
      enteredAt: timestamp,
      updatedAt: timestamp,
    };
    await writeWorktreeSession(xenesisHome, req.sessionId, session);

    const keepWorktree = this.deps.keepWorktree;
    return {
      workspaceRoot: path,
      cwd: path,
      mode: 'worktree',
      worktreeBranch: branch,
      async cleanup(): Promise<IsolationOutcome> {
        let changedFiles = 0;
        let newCommits = 0;
        let kept = true;
        let cleanupError: unknown;
        try {
          changedFiles = await countDirtyFiles(path);
          newCommits = await countNewCommits(path, originalHeadCommit);
          const changed = changedFiles > 0 || newCommits > 0;
          kept = keepWorktree === 'always' || (keepWorktree === 'if-changed' && changed);
          if (!kept) {
            await removeWorktree(root, path);
            await deleteBranchIfExists(root, branch);
          }
        } catch (error) {
          cleanupError = error;
        }

        const current = await readWorktreeSession(xenesisHome, req.sessionId);
        if (current) {
          await writeWorktreeSession(xenesisHome, req.sessionId, {
            ...current,
            active: false,
            exitedAt: nowIso(),
            updatedAt: nowIso(),
            ...(cleanupError ? { cleanupError: errorMessage(cleanupError) } : {}),
            discardedFiles: kept ? 0 : changedFiles,
            discardedCommits: kept ? 0 : newCommits,
          });
        }
        if (cleanupError) throw cleanupError;
        return {
          mode: 'worktree',
          worktreePath: path,
          worktreeBranch: branch,
          changedFiles,
          newCommits,
          kept,
        };
      },
    };
  }
}

export function resolveProvisioner(mode: IsolationMode, deps: ProvisionerDeps): WorkspaceProvisioner {
  if (mode === 'worktree') return new GitWorktreeProvisioner(deps);
  return new SharedWorkspaceProvisioner();
}
