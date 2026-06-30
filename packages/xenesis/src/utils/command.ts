import { spawn } from 'node:child_process';
import { stripDangerousEnv } from './dangerousEnv.js';

export type ShellPlatform = NodeJS.Platform | 'posix';

export interface ShellInvocation {
  shell: string;
  args: string[];
}

export interface RunCommandOptions {
  command: string;
  cwd: string;
  timeoutMs: number;
  maxOutputChars?: number;
  env?: NodeJS.ProcessEnv;
}

export interface RunCommandArgsOptions {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  maxOutputChars?: number;
  env?: NodeJS.ProcessEnv;
}

export interface RunCommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  truncated: boolean;
}

export const DEFAULT_MAX_OUTPUT_CHARS = 100_000;
const KILL_GRACE_MS = process.platform === 'win32' ? 5000 : 1500;

/**
 * Launch parameters for a long-lived ("persistent") shell that reads commands
 * from stdin, distinct from the one-shot {@link buildShellInvocation}. On win32
 * this is `powershell.exe -NoProfile -NoLogo -NoExit -Command -` (reads from the
 * stdin pipe); on POSIX it is `bash` (fallback `sh`) with an empty arg list so
 * the interpreter stays interactive on its stdin pipe.
 */
export function buildPersistentShellSpawn(platform: ShellPlatform = process.platform): {
  command: string;
  args: string[];
} {
  if (platform === 'win32') {
    return { command: 'powershell.exe', args: ['-NoProfile', '-NoLogo', '-NoExit', '-Command', '-'] };
  }
  const shellPath = process.env.SHELL;
  const command = shellPath && /bash$/.test(shellPath) ? 'bash' : 'sh';
  return { command, args: [] };
}

export function buildShellInvocation(command: string, platform: ShellPlatform = process.platform): ShellInvocation {
  if (platform === 'win32') {
    return {
      shell: 'powershell.exe',
      args: [
        '-NoProfile',
        '-Command',
        `& { ${command}; $xenesisSuccess = $?; $xenesisExitCode = $LASTEXITCODE; if ($xenesisSuccess) { exit 0 }; if (($xenesisExitCode -is [int]) -and ($xenesisExitCode -ne 0)) { exit $xenesisExitCode }; exit 1 }`,
      ],
    };
  }

  return { shell: 'sh', args: ['-c', command] };
}

export async function runCommand(options: RunCommandOptions): Promise<RunCommandResult> {
  const { shell, args } = buildShellInvocation(options.command);
  return await runSpawnedCommand({
    command: shell,
    args,
    cwd: options.cwd,
    timeoutMs: options.timeoutMs,
    maxOutputChars: options.maxOutputChars,
    env: options.env,
    detached: process.platform !== 'win32',
  });
}

export async function runCommandArgs(options: RunCommandArgsOptions): Promise<RunCommandResult> {
  return await runSpawnedCommand({
    command: options.command,
    args: options.args,
    cwd: options.cwd,
    timeoutMs: options.timeoutMs,
    maxOutputChars: options.maxOutputChars,
    env: options.env,
    detached: process.platform !== 'win32',
  });
}

async function runSpawnedCommand(options: RunCommandArgsOptions & { detached: boolean }): Promise<RunCommandResult> {
  const maxOutputChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;

  return await new Promise((resolve) => {
    const spawnEnv = stripDangerousEnv(options.env ?? process.env);
    const child = spawn(options.command, options.args, {
      cwd: options.cwd,
      windowsHide: true,
      detached: options.detached,
      env: spawnEnv,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let handlingTimeout = false;
    let truncated = false;
    let closeExitCode: number | null = null;
    let resolveClosed: () => void = () => undefined;
    const closed = new Promise<void>((resolveClose) => {
      resolveClosed = resolveClose;
    });

    function appendOutput(target: 'stdout' | 'stderr', chunk: string) {
      const remaining = maxOutputChars - stdout.length - stderr.length;
      if (remaining <= 0) {
        truncated = true;
        return;
      }

      if (chunk.length > remaining) {
        truncated = true;
        chunk = chunk.slice(0, remaining);
      }

      if (target === 'stdout') stdout += chunk;
      else stderr += chunk;
    }

    function finish(result: RunCommandResult) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    }

    async function handleTimeout() {
      handlingTimeout = true;
      await Promise.all([killProcessTree(child.pid, 'force'), killWindowsProcessesReferencingPath(options.cwd)]);
      await waitForClose(closed, KILL_GRACE_MS);
      finish({ exitCode: null, stdout, stderr, timedOut: true, truncated });
    }

    const timer = setTimeout(() => {
      void handleTimeout();
    }, options.timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      appendOutput('stdout', chunk);
    });
    child.stderr.on('data', (chunk) => {
      appendOutput('stderr', chunk);
    });
    child.on('error', (error) => {
      if (settled) return;
      finish({ exitCode: 1, stdout, stderr: error.message, timedOut: false, truncated });
    });
    child.on('close', (exitCode) => {
      closeExitCode = exitCode;
      resolveClosed();
      if (handlingTimeout) return;
      finish({ exitCode: closeExitCode, stdout, stderr, timedOut: false, truncated });
    });
  });
}

export async function killProcessTree(pid: number | undefined, mode: 'soft' | 'force'): Promise<void> {
  if (pid === undefined) return;

  if (process.platform === 'win32') {
    // taskkill /t already walks the process tree. Calling it immediately avoids
    // a race where descendant discovery is slower than the timed-out child.
    await Promise.all([taskkill(pid, mode), killWindowsProcessTreeSnapshot(pid, mode)]);
    return;
  }

  try {
    process.kill(-pid, mode === 'force' ? 'SIGKILL' : 'SIGTERM');
  } catch {
    try {
      process.kill(pid, mode === 'force' ? 'SIGKILL' : 'SIGTERM');
    } catch {
      // The process may have already exited.
    }
  }
}

async function taskkill(pid: number, mode: 'soft' | 'force') {
  await new Promise<void>((resolve) => {
    const args = mode === 'force' ? ['/pid', String(pid), '/t', '/f'] : ['/pid', String(pid), '/t'];
    const killer = spawn('taskkill.exe', args, { windowsHide: true });
    const timer = setTimeout(() => {
      killer.kill();
      resolve();
    }, KILL_GRACE_MS);
    killer.on('error', () => {
      clearTimeout(timer);
      resolve();
    });
    killer.on('close', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function killWindowsProcessTreeSnapshot(pid: number, mode: 'soft' | 'force') {
  await new Promise<void>((resolve) => {
    const forceFlag = mode === 'force' ? '-Force' : '';
    const killer = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        [
          '$root = [int]$env:XENESIS_TIMEOUT_PID;',
          '$all = @(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId);',
          '$pending = New-Object System.Collections.Generic.Queue[int];',
          '$pending.Enqueue($root);',
          "$seen = New-Object 'System.Collections.Generic.HashSet[int]';",
          '$targets = New-Object System.Collections.Generic.List[int];',
          'while ($pending.Count -gt 0) {',
          '$parent = $pending.Dequeue();',
          'foreach ($process in $all) {',
          'if ($process.ParentProcessId -eq $parent -and $seen.Add([int]$process.ProcessId)) {',
          '$targets.Add([int]$process.ProcessId);',
          '$pending.Enqueue([int]$process.ProcessId);',
          '}',
          '}',
          '}',
          '$targets | Sort-Object -Descending | ForEach-Object { Stop-Process -Id $_ ' +
            forceFlag +
            ' -ErrorAction SilentlyContinue };',
          'Stop-Process -Id $root ' + forceFlag + ' -ErrorAction SilentlyContinue',
        ].join(' '),
      ],
      {
        windowsHide: true,
        env: {
          ...process.env,
          XENESIS_TIMEOUT_PID: String(pid),
        },
      },
    );
    const timer = setTimeout(() => {
      killer.kill();
      resolve();
    }, KILL_GRACE_MS);
    killer.on('error', () => {
      clearTimeout(timer);
      resolve();
    });
    killer.on('close', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function killWindowsProcessesReferencingPath(path: string) {
  if (process.platform !== 'win32') return;

  const deadline = Date.now() + KILL_GRACE_MS;
  let stableEmptyScans = 0;
  while (Date.now() < deadline && stableEmptyScans < 2) {
    const killed = await killWindowsProcessesReferencingPathOnce(path);
    if (killed === 0) {
      stableEmptyScans += 1;
    } else {
      stableEmptyScans = 0;
    }
    if (stableEmptyScans < 2) {
      await delay(150);
    }
  }
}

async function killWindowsProcessesReferencingPathOnce(path: string) {
  return await new Promise<number>((resolve) => {
    let stdout = '';
    const killer = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        [
          '$target = $env:XENESIS_TIMEOUT_CWD;',
          'if (-not $target) { exit 0 }',
          "$escapedTarget = $target.Replace('\\', '\\\\');",
          '$matches = @(Get-CimInstance Win32_Process |',
          'Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and ($_.CommandLine.Contains($target) -or $_.CommandLine.Contains($escapedTarget)) });',
          '$matches | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue };',
          'Write-Output $matches.Count',
        ].join(' '),
      ],
      {
        windowsHide: true,
        env: {
          ...process.env,
          XENESIS_TIMEOUT_CWD: path,
        },
      },
    );
    const timer = setTimeout(() => {
      killer.kill();
      resolve(0);
    }, KILL_GRACE_MS);
    killer.stdout.setEncoding('utf8');
    killer.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    killer.on('error', () => {
      clearTimeout(timer);
      resolve(0);
    });
    killer.on('close', () => {
      clearTimeout(timer);
      resolve(Number.parseInt(stdout.trim(), 10) || 0);
    });
  });
}

async function waitForClose(closed: Promise<void>, timeoutMs: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    closed.then(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
