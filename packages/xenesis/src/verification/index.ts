import { spawn } from "node:child_process";

export type VerificationStatus = "passed" | "failed" | "skipped";

export interface VerificationCommandResult {
  command: string;
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface VerificationReport {
  status: VerificationStatus;
  createdAt: string;
  commandCount: number;
  passed: number;
  failed: number;
  results: VerificationCommandResult[];
}

export interface RunVerificationCommandsOptions {
  commands: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxOutputChars: number;
  now?: () => Date;
}

class LimitedTextBuffer {
  private text = "";
  private truncated = false;
  private readonly maxChars: number;

  constructor(maxChars: number) {
    this.maxChars = Math.max(0, maxChars);
  }

  append(chunk: Buffer | string) {
    if (this.truncated) return;
    const value = String(chunk);
    const remaining = this.maxChars - this.text.length;
    if (remaining <= 0) {
      this.truncated = true;
      return;
    }
    if (value.length <= remaining) {
      this.text += value;
      return;
    }
    this.text += value.slice(0, remaining);
    this.truncated = true;
  }

  value() {
    return this.truncated ? `${this.text}\n[output truncated]` : this.text;
  }
}

async function runOneCommand(
  command: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
  maxOutputChars: number
): Promise<VerificationCommandResult> {
  const startedAt = Date.now();
  const stdout = new LimitedTextBuffer(maxOutputChars);
  const stderr = new LimitedTextBuffer(maxOutputChars);

  return await new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    const child = spawn(command, {
      cwd,
      env,
      shell: true,
      windowsHide: true
    });
    const finish = (exitCode: number | null, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (timedOut) {
        stderr.append(`\nCommand timed out after ${timeoutMs}ms.`);
      } else if (error) {
        stderr.append(error.message);
      }
      resolve({
        command,
        ok: exitCode === 0 && !timedOut && !error,
        exitCode,
        stdout: stdout.value(),
        stderr: stderr.value(),
        durationMs: Date.now() - startedAt
      });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => stdout.append(chunk));
    child.stderr?.on("data", (chunk) => stderr.append(chunk));
    child.on("error", (error) => finish(null, error));
    child.on("close", (code) => finish(code));
  });
}

export async function runVerificationCommands(options: RunVerificationCommandsOptions): Promise<VerificationReport> {
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  if (options.commands.length === 0) {
    return {
      status: "skipped",
      createdAt,
      commandCount: 0,
      passed: 0,
      failed: 0,
      results: []
    };
  }

  const results: VerificationCommandResult[] = [];
  for (const command of options.commands) {
    results.push(await runOneCommand(
      command,
      options.cwd,
      options.env,
      options.timeoutMs,
      options.maxOutputChars
    ));
  }

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;
  return {
    status: failed === 0 ? "passed" : "failed",
    createdAt,
    commandCount: results.length,
    passed,
    failed,
    results
  };
}
