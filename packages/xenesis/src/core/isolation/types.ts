export type IsolationMode = "shared" | "worktree";

export interface IsolationOutcome {
  mode: IsolationMode;
  worktreePath?: string;
  worktreeBranch?: string;
  changedFiles: number;
  newCommits: number;
  kept: boolean;
  fallbackReason?: string;
}

export interface ProvisionRequest {
  taskId: string;
  sessionId: string;
  baseWorkspace: string;
  baseCwd: string;
  xenesisHome?: string;
  mode: IsolationMode;
}

export interface ProvisionedWorkspace {
  workspaceRoot: string;
  cwd: string;
  mode: IsolationMode;
  worktreeBranch?: string;
  cleanup(): Promise<IsolationOutcome>;
}

export interface WorkspaceProvisioner {
  provision(req: ProvisionRequest): Promise<ProvisionedWorkspace>;
}

export interface WorktreeSessionState {
  active: boolean;
  originalWorkspaceRoot: string;
  originalCwd: string;
  gitRoot: string;
  worktreePath: string;
  worktreeName: string;
  worktreeBranch: string;
  originalBranch?: string;
  originalHeadCommit: string;
  enteredAt?: string;
  exitedAt?: string;
  updatedAt: string;
  action?: "keep" | "remove";
  discardedFiles?: number;
  discardedCommits?: number;
  cleanupError?: string;
}
