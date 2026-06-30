import type { ApprovalMode, CliConfigOverrides, IsolationConfig } from '../config/index.js';
import { runAgentPipeline } from '../core/AgentRunPipeline.js';
import type { IsolationOutcome } from '../core/isolation/index.js';
import { decideTaskMode, resolveProvisioner } from '../core/isolation/index.js';
import type { WorkerTaskExecutor } from './taskWorker.js';

export interface PipelineTaskExecutorDefaults {
  approvalMode?: ApprovalMode;
  maxTurns?: number;
  maxTokens?: number;
}

export interface PipelineTaskExecutorOptions {
  cwd: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  secretEnvNames?: Iterable<string>;
  cli?: CliConfigOverrides;
  defaults?: PipelineTaskExecutorDefaults;
  xenesisHome?: string;
  isolation?: IsolationConfig;
  autoIsolate?: boolean;
}

type PipelineResult = Awaited<ReturnType<typeof runAgentPipeline>>;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function pipelineEnv(
  env: NodeJS.ProcessEnv | undefined,
  isolation: IsolationConfig | undefined,
  secretEnvNames: Iterable<string> = [],
): NodeJS.ProcessEnv | undefined {
  if (!isolation?.scrubShellSecrets) return env;
  const baseEnv = env ?? process.env;
  const secretNames = Array.from(new Set(secretEnvNames)).filter(Boolean);
  return {
    ...baseEnv,
    XENESIS_ISOLATION_SCRUB: '1',
    ...(secretNames.length > 0 ? { XENESIS_ISOLATION_SCRUB_NAMES: secretNames.join(',') } : {}),
    ...(isolation.shellSecretAllowlist.length > 0
      ? { XENESIS_ISOLATION_SCRUB_ALLOW: isolation.shellSecretAllowlist.join(',') }
      : {}),
  };
}

export function createPipelineTaskExecutor(options: PipelineTaskExecutorOptions): WorkerTaskExecutor {
  return async (task, context) => {
    const approvalMode = task.approvalMode ?? options.defaults?.approvalMode;
    const maxTurns = task.maxTurns ?? options.defaults?.maxTurns;
    const maxTokens = task.maxTokens ?? options.defaults?.maxTokens;
    const cli: CliConfigOverrides = {
      ...(options.cli ?? {}),
      ...(approvalMode ? { approvalMode } : {}),
      ...(maxTurns !== undefined ? { maxTurns } : {}),
    };

    const mode = decideTaskMode({
      explicit: task.metadata?.isolation,
      autoIsolate: options.autoIsolate ?? false,
      defaultMode: options.isolation?.defaultMode,
    });
    const provisioner = resolveProvisioner(mode, {
      xenesisHome: options.xenesisHome,
      keepWorktree: options.isolation?.keepWorktree ?? 'if-changed',
    });
    const workspace = await provisioner.provision({
      taskId: task.id,
      sessionId: task.sessionId,
      baseWorkspace: options.cwd,
      baseCwd: options.cwd,
      xenesisHome: options.xenesisHome,
      mode,
    });

    let result: PipelineResult | undefined;
    let runError: unknown;
    let cleanupError: unknown;
    let isolation: IsolationOutcome | undefined;
    try {
      result = await runAgentPipeline({
        cwd: options.cwd,
        workspaceRoot: workspace.workspaceRoot,
        configPath: options.configPath,
        env: pipelineEnv(options.env, options.isolation, options.secretEnvNames),
        cli,
        prompt: task.prompt,
        sessionId: task.sessionId,
        taskId: task.id,
        // S6 — no approvalHandler: a background task that hits an `ask` takes the
        // durable-pause path and returns `status: "paused"` (resumable via
        // resumeAgentPipeline + an injected decision) instead of silently
        // auto-denying every approval (the prior `() => false` bug).
        abortSignal: context.signal,
        maxTokensBudget: maxTokens,
        stream: false,
        disposeRunner: true,
      });
    } catch (error) {
      runError = error;
    }

    try {
      isolation = await workspace.cleanup();
    } catch (error) {
      cleanupError = error;
    }

    if (runError) {
      if (cleanupError) {
        throw new Error(`${errorMessage(runError)} (workspace cleanup also failed: ${errorMessage(cleanupError)})`, {
          cause: runError,
        });
      }
      throw runError;
    }
    if (cleanupError) throw cleanupError;
    if (!result) throw new Error('Agent task did not produce a result');

    if (result.exitCode !== 0) {
      throw new Error(`Agent task failed with exit code ${result.exitCode}`);
    }

    // S6 — a durably paused run (background `ask` with no resolver) is NOT a
    // failure: record it as `blocked` with the pending approval so the task is
    // resumable once a human decision arrives (Desk inbox consumes this). The
    // session log holds the durable permission_request + run_snapshot.pendingApproval.
    if (result.status === 'paused') {
      const pending = result.pendingApproval;
      const blockedReason = pending
        ? `awaiting approval for tool "${pending.name}": ${pending.reason}`
        : 'awaiting approval';
      return {
        status: 'blocked',
        output: result.doneContent ?? '',
        sessionId: result.sessionId,
        usage: result.usage,
        error: blockedReason,
        isolation,
      };
    }

    return {
      output: result.doneContent ?? '',
      sessionId: result.sessionId,
      usage: result.usage,
      isolation,
    };
  };
}
