import {
  runCommand,
  runCommandArgs,
  type RunCommandOptions,
  type RunCommandArgsOptions,
  type RunCommandResult
} from "../../utils/command.js";

/**
 * Extension point for out-of-process execution (Docker / remote VM). Only the
 * local backend is implemented (delegates to utils/command); shared and
 * worktree modes are workspace-location strategies over this backend.
 */
export interface ExecutionBackend {
  readonly kind: "local" | "docker" | "remote";
  run(options: RunCommandOptions): Promise<RunCommandResult>;
  runArgs(options: RunCommandArgsOptions): Promise<RunCommandResult>;
}

export class LocalExecutionBackend implements ExecutionBackend {
  readonly kind = "local" as const;
  run(options: RunCommandOptions): Promise<RunCommandResult> { return runCommand(options); }
  runArgs(options: RunCommandArgsOptions): Promise<RunCommandResult> { return runCommandArgs(options); }
}

export const LOCAL_BACKEND: ExecutionBackend = new LocalExecutionBackend();
