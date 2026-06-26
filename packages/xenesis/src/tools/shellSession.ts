import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { computeShellEnv } from "../core/isolation/secretScrub.js";
import {
  buildPersistentShellSpawn,
  killProcessTree,
  DEFAULT_MAX_OUTPUT_CHARS
} from "../utils/command.js";

const isWin = process.platform === "win32";

export interface ShellSessionOptions {
  workspaceRoot: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
}

export interface ShellExecResult {
  output: string;
  exitCode: number;
  cwd: string;
  timedOut: boolean;
}

/**
 * A long-lived shell subprocess fed commands over stdin. Each command's output is
 * delimited by a per-session crypto-random GUID sentinel (`<MARKER><exitcode>|<cwd><MARKER>`)
 * so `cd`/`export`/builtins persist across {@link exec} calls. Commands are serialized
 * (one in flight per session). A command exceeding `timeoutMs` triggers kill+restart
 * (the child is re-spawned at the last known good cwd; env exports are lost on restart).
 */
export class ShellSession {
  private child?: ChildProcessWithoutNullStreams;
  private readonly marker = `__XENESIS_SH_${randomUUID().replace(/-/g, "")}__`;
  private readonly env?: NodeJS.ProcessEnv;
  private _cwd: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly opts: ShellSessionOptions) {
    this._cwd = opts.cwd;
    // Spec invariant: env scrubbed once at construction via computeShellEnv (NOT the
    // loader-only stripDangerousEnv), removing API-key/bot-token secrets AND injection
    // vars before they reach the persistent child. Idempotent, so a caller that already
    // passed computeShellEnv(context.env) incurs only a redundant pass; a caller that
    // forgets is still protected. The scrubbed env is reused for spawn and every restart.
    // computeShellEnv returns undefined only when isolation is explicitly opted out
    // (XENESIS_ISOLATION_SCRUB="0"), in which case the child inherits process.env.
    this.env = opts.env ? computeShellEnv(opts.env) : undefined;
  }

  get cwd(): string {
    return this._cwd;
  }

  /**
   * The OS pid of the live child shell, or undefined when none is spawned. This is the
   * single pid tracked for killProcessTree on dispose/restart/idle (global constraint:
   * "kill the session child strictly by tracked PID"). Exposed so the lifecycle invariant
   * — no orphaned child survives dispose — is OS-level assertable.
   */
  get childPid(): number | undefined {
    return this.child?.pid;
  }

  private ensureChild(): ChildProcessWithoutNullStreams {
    if (this.child && !this.child.killed && this.child.exitCode === null) return this.child;
    const { command, args } = buildPersistentShellSpawn();
    const child = spawn(command, args, {
      cwd: this._cwd,
      windowsHide: true,
      // detached:false on win32 (cannot kill(-pid)); track child.pid for killProcessTree.
      detached: false,
      stdio: ["pipe", "pipe", "pipe"],
      ...(this.env ? { env: this.env } : {})
    }) as ChildProcessWithoutNullStreams;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    // Keep stderr drained: on win32 we redirect with 2>&1 so this stays empty, but
    // an interpreter-level write must not back-pressure the pipe.
    child.stderr.on("data", () => undefined);
    // A live error (e.g. failed spawn) must not crash the host process.
    child.on("error", () => undefined);
    this.child = child;
    return child;
  }

  /**
   * Wrap a command so the child emits, as its final line, the sentinel carrying the
   * exit code and the resolved cwd. stderr is merged into stdout (2>&1) so the marker
   * is the last token. The exit-code idiom mirrors the one-shot buildShellInvocation:
   * a PowerShell-native failure ($? -eq $false) surfaces as 1, while a native exe's
   * own $LASTEXITCODE is preserved.
   */
  private wrap(command: string): string {
    if (isWin) {
      // A PowerShell TERMINATING error (throw, -ErrorAction Stop, a thrown
      // exception) aborts the rest of the input line. If the marker were a bare
      // statement after the command it would never emit on such an error, the
      // pipe read would block until timeoutMs, and the session would be killed +
      // restarted (losing all env exports). So the command runs inside try/catch:
      // the catch streams the error text (merged like 2>&1) and records failure,
      // then a finally GUARANTEES the marker line is the last token emitted.
      return (
        "$xenesisCaught = $false; " +
        // BUG 1 fix: capture $? and $LASTEXITCODE INSIDE the scriptblock, immediately
        // after the command, BEFORE the `Out-String -Stream` pipe runs. The pipeline
        // itself SUCCEEDS and would otherwise overwrite $? — so a NON-terminating error
        // (e.g. Get-ChildItem on a missing path, no -ErrorAction Stop) was reported as
        // success (gxc=0), diverging from the stateless buildShellInvocation which
        // reports exit 1. Script-scoped vars survive the pipe and outlive the block.
        `try { & { ${command}; $script:xenSucc = $?; $script:xenCode = $LASTEXITCODE } 2>&1 | Out-String -Stream } ` +
        "catch { $xenesisCaught = $true; $_ | Out-String -Stream }; " +
        "$xenesisSuccess = if ($xenesisCaught) { $false } else { $script:xenSucc }; " +
        "$xenesisExitCode = if ($xenesisCaught) { $null } else { $script:xenCode }; " +
        "$gxc = if ($xenesisSuccess) { if (($xenesisExitCode -is [int]) -and ($xenesisExitCode -ne 0)) { $xenesisExitCode } else { 0 } } " +
        "else { if (($xenesisExitCode -is [int]) -and ($xenesisExitCode -ne 0)) { $xenesisExitCode } else { 1 } }; " +
        // BUG 2 fix: guarantee the marker starts on its own line. A command that writes
        // to the console host without a trailing newline (e.g. [Console]::Out.Write)
        // would otherwise glue the marker onto that line; the `^`-anchored (m-flag) read
        // regex never matches, the marker leaks into output, and the read hangs until
        // timeoutMs (kill+restart). An empty Write-Output emits a blank line first so the
        // marker is line-anchored; finish() trims the resulting trailing blank line.
        `Write-Output ""; ` +
        `Write-Output "${this.marker}$gxc|$((Get-Location).Path)${this.marker}"\n`
      );
    }
    // POSIX: capture $? immediately, merge stderr, emit the marker last.
    return (
      `{ ${command} ; } 2>&1; __gxc=$?; ` +
      `printf '\\n${this.marker}%s|%s${this.marker}\\n' "$__gxc" "$(pwd -P)"\n`
    );
  }

  exec(command: string, timeoutMs: number): Promise<ShellExecResult> {
    // Serialize: chain on the queue so only one command runs at a time per session.
    const run = this.queue.then(() => this.execNow(command, timeoutMs));
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private execNow(command: string, timeoutMs: number): Promise<ShellExecResult> {
    const child = this.ensureChild();
    return new Promise<ShellExecResult>((resolve) => {
      let buffer = "";
      let settled = false;
      // Match the marker pair on a line: <MARKER><exitcode>|<cwd><MARKER>. The cwd
      // can contain anything (including a literal '|'), so it is captured lazily up to
      // the closing marker. CRLF/LF are tolerated: \r? before the final newline, and
      // the regex is anchored with the `m` flag so the leading marker starts a line.
      // The exit code may be NEGATIVE on win32 (a native exe's $LASTEXITCODE can be
      // negative, e.g. node -e "process.exit(-1)"); accept a leading minus so such a
      // marker is matched instead of leaking into output and hanging until timeout.
      const re = new RegExp(`^${this.marker}(-?\\d+)\\|([\\s\\S]*?)${this.marker}\\r?$`, "m");

      const cleanup = () => {
        clearTimeout(timer);
        child.stdout.off("data", onData);
      };

      const finish = (exitCode: number, cwd: string, before: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        this._cwd = cwd.trim() || this._cwd;
        let output = before.replace(/[\r\n]+$/, "");
        if (output.length > DEFAULT_MAX_OUTPUT_CHARS) {
          output =
            output.slice(0, DEFAULT_MAX_OUTPUT_CHARS) +
            `\n[output truncated after ${DEFAULT_MAX_OUTPUT_CHARS} characters]`;
        }
        resolve({ output, exitCode, cwd: this._cwd, timedOut: false });
      };

      const onData = (chunk: string) => {
        buffer += chunk;
        const m = re.exec(buffer);
        if (m && !settled) {
          finish(Number.parseInt(m[1]!, 10), m[2]!, buffer.slice(0, m.index));
        }
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        // Kill+restart so a hung command never blocks the pipe indefinitely.
        this.restart();
        resolve({
          output: buffer.replace(/[\r\n]+$/, ""),
          exitCode: -1,
          cwd: this._cwd,
          timedOut: true
        });
      }, timeoutMs);
      timer.unref?.();

      child.stdout.on("data", onData);
      child.stdin.write(this.wrap(command));
    });
  }

  private restart(): void {
    if (this.child?.pid !== undefined) {
      void killProcessTree(this.child.pid, "force").catch(() => undefined);
    }
    // Drop the reference; the next ensureChild() re-spawns at this._cwd.
    this.child = undefined;
  }

  dispose(): void {
    if (this.child?.pid !== undefined) {
      void killProcessTree(this.child.pid, "force").catch(() => undefined);
    }
    this.child = undefined;
  }
}
