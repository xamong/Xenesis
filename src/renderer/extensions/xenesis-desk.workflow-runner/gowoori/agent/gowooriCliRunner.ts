import type { ShellKind, TerminalApi } from '../../../../../shared/types';
import type { GowooriArtifactResult, GowooriCliPlanResult } from './gowooriProviders';

export type GowooriCliProgressPhase =
  | 'starting'
  | 'spawned'
  | 'sending-prompt'
  | 'waiting'
  | 'receiving-output'
  | 'completed'
  | 'timeout'
  | 'cancelled'
  | 'error';

export interface GowooriCliProgressEvent {
  phase: GowooriCliProgressPhase;
  provider: string;
  termId: string;
  message: string;
  elapsedMs: number;
  outputBytes: number;
  chunkCount: number;
  lastOutputAt: number | null;
  idleMs: number;
}

export interface GowooriCliRunnerOptions {
  shell?: ShellKind;
  cwd?: string;
  timeoutMs?: number;
  heartbeatMs?: number;
  commandArgs?: string[];
  promptMode?: 'argument' | 'stdin';
  stdinSuffix?: string;
  writePromptFile?: GowooriPromptFileWriter;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  onStatus?: (status: string) => void;
  onProgress?: (event: GowooriCliProgressEvent) => void;
}

export interface GowooriPromptFileWriteRequest {
  content: string;
  filePath: string;
  fileName: string;
  cwd?: string;
  maxBytes: number;
}

export type GowooriPromptFileWriter = (request: GowooriPromptFileWriteRequest) => Promise<string>;

export interface GowooriCliPreflightOptions {
  shell?: ShellKind;
  cwd?: string;
  timeoutMs?: number;
  heartbeatMs?: number;
  versionArgs?: string[];
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  onStatus?: (status: string) => void;
  onProgress?: (event: GowooriCliProgressEvent) => void;
}

export interface GowooriCliPreflightResult {
  ok: boolean;
  command: string;
  output: string;
  exitCode: number | null;
  message: string;
}

type GowooriTerminalApi = Pick<TerminalApi, 'spawn' | 'write' | 'onData' | 'onExit' | 'kill' | 'getSettings'>;
type GowooriCliOutputCaptureMode = 'none' | 'command-output-file' | 'stdout-file';

function createGowooriCliProgressTracker(
  provider: string,
  termId: string,
  options: Pick<GowooriCliRunnerOptions, 'heartbeatMs' | 'onProgress' | 'onStatus'>,
) {
  const startedAt = Date.now();
  let outputBytes = 0;
  let chunkCount = 0;
  let lastOutputAt: number | null = null;
  let heartbeatHandle: ReturnType<typeof setInterval> | null = null;

  const createEvent = (phase: GowooriCliProgressPhase, message: string): GowooriCliProgressEvent => {
    const now = Date.now();
    return {
      phase,
      provider,
      termId,
      message,
      elapsedMs: now - startedAt,
      outputBytes,
      chunkCount,
      lastOutputAt,
      idleMs: now - (lastOutputAt ?? startedAt),
    };
  };

  const emit = (phase: GowooriCliProgressPhase, message: string) => {
    const event = createEvent(phase, message);
    options.onProgress?.(event);
    options.onStatus?.(message);
  };

  const startHeartbeat = () => {
    if (heartbeatHandle) return;
    const heartbeatMs = Math.max(10, options.heartbeatMs ?? 2500);
    heartbeatHandle = setInterval(() => {
      const event = createEvent('waiting', '');
      const message =
        outputBytes > 0
          ? `${provider} CLI is still generating... ${formatGowooriCliBytes(outputBytes)} received, waiting for more output (${formatGowooriCliDuration(event.elapsedMs)}).`
          : `${provider} CLI is working... waiting for first output (${formatGowooriCliDuration(event.elapsedMs)}).`;
      emit('waiting', message);
    }, heartbeatMs);
  };

  const stopHeartbeat = () => {
    if (!heartbeatHandle) return;
    clearInterval(heartbeatHandle);
    heartbeatHandle = null;
  };

  return {
    get elapsedMs() {
      return Date.now() - startedAt;
    },
    get outputBytes() {
      return outputBytes;
    },
    emit,
    recordChunk(chunk: string) {
      outputBytes += countGowooriCliOutputBytes(chunk);
      chunkCount += 1;
      lastOutputAt = Date.now();
    },
    startHeartbeat,
    stopHeartbeat,
  };
}

function countGowooriCliOutputBytes(value: string): number {
  const text = String(value || '');
  try {
    return new TextEncoder().encode(text).byteLength;
  } catch {
    return text.length;
  }
}

function formatGowooriCliBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatGowooriCliDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export async function runGowooriCliProvider(
  plan: GowooriCliPlanResult,
  terminalApi: GowooriTerminalApi,
  options: GowooriCliRunnerOptions = {},
): Promise<GowooriArtifactResult> {
  const settings = await terminalApi.getSettings().catch(() => ({}) as Awaited<ReturnType<TerminalApi['getSettings']>>);
  const shell = options.shell ?? settings.defaultShell ?? 'powershell';
  const cwd = options.cwd ?? settings.defaultCwd;
  const termId = `gowoori-cli-${plan.provider}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let output = '';
  let settled = false;
  let cleanupData: (() => void) | null = null;
  let cleanupExit: (() => void) | null = null;
  let cleanupAbort: (() => void) | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const progress = createGowooriCliProgressTracker(plan.provider, termId, options);

  progress.emit('starting', `Starting ${plan.provider} CLI...`);

  await terminalApi.spawn({
    id: termId,
    kind: 'shell',
    shell,
    cols: 120,
    rows: 30,
    cwd,
  });
  progress.emit('spawned', `${plan.provider} CLI terminal is ready.`);

  const runCommand = await createGowooriCliRunCommand(plan, {
    ...options,
    shell,
    cwd,
    termId,
  });

  return new Promise<GowooriArtifactResult>((resolve, reject) => {
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      progress.stopHeartbeat();
      cleanupData?.();
      cleanupExit?.();
      cleanupAbort?.();
      callback();
    };

    const cancelRun = () => {
      finish(() => {
        progress.emit('cancelled', `${plan.provider} CLI run cancelled.`);
        try {
          terminalApi.kill(termId);
        } catch {
          // best effort
        }
        reject(new Error(`${plan.provider} CLI run cancelled.`));
      });
    };

    if (options.signal?.aborted) {
      cancelRun();
      return;
    }
    if (options.signal) {
      options.signal.addEventListener('abort', cancelRun, { once: true });
      cleanupAbort = () => options.signal?.removeEventListener('abort', cancelRun);
    }

    cleanupData = terminalApi.onData(termId, (event) => {
      output += event.data;
      progress.recordChunk(event.data);
      progress.emit(
        'receiving-output',
        `${plan.provider} CLI is generating... ${formatGowooriCliBytes(progress.outputBytes)} received.`,
      );
      options.onChunk?.(event.data);
    });

    cleanupExit = terminalApi.onExit(termId, (event) => {
      finish(() => {
        if (event.exitCode !== 0) {
          progress.emit('error', `${plan.provider} CLI exited with code ${event.exitCode}.`);
          reject(new Error(`${plan.provider} CLI exited with code ${event.exitCode}.`));
          return;
        }
        const source = normalizeCliArtifactOutput(output, plan.provider);
        progress.emit(
          'completed',
          source
            ? `${plan.provider} CLI completed with ${formatGowooriCliBytes(progress.outputBytes)} received.`
            : `${plan.provider} CLI completed without artifact output.`,
        );
        resolve({
          kind: 'artifact',
          provider: plan.provider,
          source,
          summary: source ? 'Generated artifact from CLI stream.' : 'CLI completed without artifact output.',
        });
      });
    });

    timeoutHandle = setTimeout(() => {
      finish(() => {
        progress.emit(
          'timeout',
          `${plan.provider} CLI timed out after ${formatGowooriCliDuration(progress.elapsedMs)}.`,
        );
        try {
          terminalApi.kill(termId);
        } catch {
          // best effort
        }
        reject(new Error(`${plan.provider} CLI timed out.`));
      });
    }, options.timeoutMs ?? 120000);

    progress.startHeartbeat();
    progress.emit('sending-prompt', `Sending prompt to ${plan.provider} CLI...`);
    terminalApi.write(termId, `${runCommand.command}\r`);
    if (runCommand.requiresDirectStdin) {
      terminalApi.write(termId, `${plan.prompt}${options.stdinSuffix ?? getTerminalStdinEndSequence(shell)}`);
    }
  });
}

export async function runGowooriCliPreflight(
  plan: GowooriCliPlanResult,
  terminalApi: GowooriTerminalApi,
  options: GowooriCliPreflightOptions = {},
): Promise<GowooriCliPreflightResult> {
  const settings = await terminalApi.getSettings().catch(() => ({}) as Awaited<ReturnType<TerminalApi['getSettings']>>);
  const shell = options.shell ?? settings.defaultShell ?? 'powershell';
  const cwd = options.cwd ?? settings.defaultCwd;
  const termId = `gowoori-cli-preflight-${plan.provider}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const command = buildGowooriCliVersionCommand(plan, options.versionArgs);
  let output = '';
  let settled = false;
  let cleanupData: (() => void) | null = null;
  let cleanupExit: (() => void) | null = null;
  let cleanupAbort: (() => void) | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const progress = createGowooriCliProgressTracker(plan.provider, termId, options);

  progress.emit('starting', `Checking ${plan.provider} CLI...`);

  await terminalApi.spawn({
    id: termId,
    kind: 'shell',
    shell,
    cols: 100,
    rows: 12,
    cwd,
  });
  progress.emit('spawned', `${plan.provider} CLI preflight terminal is ready.`);

  return new Promise<GowooriCliPreflightResult>((resolve, reject) => {
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      progress.stopHeartbeat();
      cleanupData?.();
      cleanupExit?.();
      cleanupAbort?.();
      callback();
    };

    const cancelRun = () => {
      finish(() => {
        progress.emit('cancelled', `${plan.provider} CLI preflight cancelled.`);
        try {
          terminalApi.kill(termId);
        } catch {
          // best effort
        }
        reject(new Error(`${plan.provider} CLI preflight cancelled.`));
      });
    };

    if (options.signal?.aborted) {
      cancelRun();
      return;
    }
    if (options.signal) {
      options.signal.addEventListener('abort', cancelRun, { once: true });
      cleanupAbort = () => options.signal?.removeEventListener('abort', cancelRun);
    }

    cleanupData = terminalApi.onData(termId, (event) => {
      output += event.data;
      progress.recordChunk(event.data);
      progress.emit(
        'receiving-output',
        `${plan.provider} CLI preflight output received: ${formatGowooriCliBytes(progress.outputBytes)}.`,
      );
      options.onChunk?.(event.data);
    });

    cleanupExit = terminalApi.onExit(termId, (event) => {
      finish(() => {
        const normalizedOutput = normalizeTerminalArtifactOutput(output);
        const ok = event.exitCode === 0;
        progress.emit(
          ok ? 'completed' : 'error',
          ok
            ? `${plan.provider} CLI preflight completed.`
            : `${plan.provider} CLI preflight exited with code ${event.exitCode}.`,
        );
        resolve({
          ok,
          command,
          output: normalizedOutput,
          exitCode: event.exitCode,
          message: ok
            ? `${plan.provider} CLI is reachable.`
            : `${plan.provider} CLI preflight exited with code ${event.exitCode}.`,
        });
      });
    });

    timeoutHandle = setTimeout(() => {
      finish(() => {
        progress.emit(
          'timeout',
          `${plan.provider} CLI preflight timed out after ${formatGowooriCliDuration(progress.elapsedMs)}.`,
        );
        try {
          terminalApi.kill(termId);
        } catch {
          // best effort
        }
        reject(new Error(`${plan.provider} CLI preflight timed out.`));
      });
    }, options.timeoutMs ?? 15000);

    progress.startHeartbeat();
    progress.emit('sending-prompt', `Sending preflight command to ${plan.provider} CLI...`);
    terminalApi.write(termId, `${withShellExit(command, shell)}\r`);
  });
}

export function buildGowooriCliCommand(
  plan: GowooriCliPlanResult,
  options: Pick<GowooriCliRunnerOptions, 'commandArgs' | 'promptMode'> & { outputLastMessageCliPath?: string } = {},
): string {
  const command = plan.command.trim() || plan.provider;
  const optionArgs = (options.commandArgs ?? []).filter((arg) => arg.trim());
  const baseArgs = optionArgs.length > 0 ? optionArgs : plan.defaultArgs;
  const args = createGowooriCliCommandArgs(
    plan,
    baseArgs.filter((arg) => arg.trim()),
    options,
  );
  const tokens = [command, ...args];
  if (options.promptMode !== 'stdin') {
    tokens.push(plan.prompt);
  }
  return tokens.map(quoteCliToken).join(' ');
}

function createGowooriCliCommandArgs(
  plan: GowooriCliPlanResult,
  args: string[],
  options: { outputLastMessageCliPath?: string },
): string[] {
  if (plan.provider !== 'codex' || !options.outputLastMessageCliPath) return args;
  const execIndex = args.findIndex((arg) => arg === 'exec');
  if (execIndex < 0) return args;

  const inserts: string[] = [];
  if (!hasCliFlag(args, '--ignore-user-config')) inserts.push('--ignore-user-config');
  if (!hasCliFlag(args, '--color')) inserts.push('--color', 'never');
  if (!hasCliFlag(args, '--output-last-message')) {
    inserts.push('--output-last-message', options.outputLastMessageCliPath);
  }
  if (inserts.length === 0) return args;

  return [...args.slice(0, execIndex + 1), ...inserts, ...args.slice(execIndex + 1)];
}

function hasCliFlag(args: string[], flag: string): boolean {
  return args.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}

export function buildGowooriCliVersionCommand(
  plan: GowooriCliPlanResult,
  versionArgs: string[] = ['--version'],
): string {
  const command = plan.command.trim() || plan.provider;
  const args = versionArgs.filter((arg) => arg.trim());
  return [command, ...args].map(quoteCliToken).join(' ');
}

export function normalizeTerminalArtifactOutput(output: string): string {
  return String(output || '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

const GOWOORI_CLI_OUTPUT_BASE64_BEGIN = '__GOWOORI_CLI_OUTPUT_BASE64_BEGIN__';
const GOWOORI_CLI_OUTPUT_BASE64_END = '__GOWOORI_CLI_OUTPUT_BASE64_END__';
const POWERSHELL_UTF8_PIPE_PREAMBLE =
  '$OutputEncoding=[System.Text.UTF8Encoding]::new($false); [Console]::OutputEncoding=$OutputEncoding';

export function normalizeCliArtifactOutput(output: string, provider = ''): string {
  const normalized = normalizeTerminalArtifactOutput(output);
  if (!normalized) return normalized;
  const base64Payload = extractGowooriCliBase64Payload(normalized);
  if (base64Payload) {
    const decoded = decodeGowooriCliBase64Payload(base64Payload);
    if (decoded) return normalizeTerminalArtifactOutput(decoded);
  }
  const codexTranscript = hasCodexTranscriptMarkers(normalized);
  if (provider !== 'codex' && !codexTranscript) {
    return normalized;
  }
  if (!codexTranscript) return normalized;
  return extractCodexAssistantArtifact(normalized);
}

function extractGowooriCliBase64Payload(output: string): string {
  const begin = output.lastIndexOf(GOWOORI_CLI_OUTPUT_BASE64_BEGIN);
  const end = output.lastIndexOf(GOWOORI_CLI_OUTPUT_BASE64_END);
  if (begin < 0 || end <= begin) return '';
  return output
    .slice(begin + GOWOORI_CLI_OUTPUT_BASE64_BEGIN.length, end)
    .replace(/\s+/g, '')
    .trim();
}

function decodeGowooriCliBase64Payload(payload: string): string {
  try {
    const bufferCtor = (
      globalThis as unknown as {
        Buffer?: { from(input: string, encoding: 'base64'): { toString(encoding: 'utf8'): string } };
      }
    ).Buffer;
    if (bufferCtor) {
      return bufferCtor.from(payload, 'base64').toString('utf8').trim();
    }
    if (typeof atob === 'function') {
      const binary = atob(payload);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes).trim();
    }
  } catch {
    return '';
  }
  return '';
}

function hasCodexTranscriptMarkers(output: string): boolean {
  return /\bOpenAI Codex v\d/i.test(output) || /^codex$/im.test(output) || /^tokens used$/im.test(output);
}

function extractCodexAssistantArtifact(output: string): string {
  const outputFileArtifact = extractCodexOutputFileTail(output);
  if (outputFileArtifact) return outputFileArtifact;

  const lines = output.split('\n');
  const candidates: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== 'codex') continue;
    const block: string[] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const marker = lines[cursor].trim();
      if (marker === 'user' || marker === 'exec' || marker === 'tokens used') break;
      if (/^--------$/.test(marker)) break;
      block.push(lines[cursor]);
    }
    const candidate = trimCodexAssistantBlock(block.join('\n'));
    if (candidate) candidates.push(candidate);
  }

  const artifactCandidate = [...candidates]
    .reverse()
    .find((candidate) => /```xcon-sketch[\s\S]*?\bscreen\b/i.test(candidate));
  return artifactCandidate ?? '';
}

function extractCodexOutputFileTail(output: string): string {
  const matches = [...output.matchAll(/\ntokens used\n[^\n]*(?:\n|$)/gi)];
  const lastMatch = matches.at(-1);
  if (!lastMatch || typeof lastMatch.index !== 'number') return '';
  const tail = output.slice(lastMatch.index + lastMatch[0].length).trim();
  if (!/```xcon-sketch\s*\n\s*screen\b/i.test(tail)) return '';
  return tail;
}

function trimCodexAssistantBlock(value: string): string {
  return String(value || '')
    .replace(/\n+tokens used\n[\d,]+(?:\s+)?$/i, '')
    .trim();
}

async function createGowooriCliRunCommand(
  plan: GowooriCliPlanResult,
  options: GowooriCliRunnerOptions & { shell: ShellKind; termId: string },
): Promise<{ command: string; requiresDirectStdin: boolean }> {
  if (options.promptMode === 'stdin' && options.writePromptFile && options.cwd) {
    const promptFile = createGowooriPromptFileTarget(options.cwd, options.termId);
    const outputCaptureMode = getGowooriCliOutputCaptureMode(plan.provider);
    const outputFile =
      outputCaptureMode !== 'none'
        ? createGowooriPromptFileTarget(options.cwd, `${options.termId}-last-message`)
        : null;
    const baseCommand = buildGowooriCliCommand(plan, {
      ...options,
      outputLastMessageCliPath:
        outputCaptureMode === 'command-output-file' && outputFile
          ? createGowooriPromptFileRelativePath(outputFile.fileName)
          : undefined,
    });
    const filePath = await options.writePromptFile({
      content: plan.prompt,
      filePath: promptFile.filePath,
      fileName: promptFile.fileName,
      cwd: options.cwd,
      maxBytes: 2_000_000,
    });
    return {
      command: withShellExit(
        buildPromptFilePipeCommand(filePath, baseCommand, options.shell, outputFile?.filePath, outputCaptureMode),
        options.shell,
      ),
      requiresDirectStdin: false,
    };
  }

  const baseCommand = buildGowooriCliCommand(plan, options);
  return {
    command: withShellExit(baseCommand, options.shell),
    requiresDirectStdin: options.promptMode === 'stdin',
  };
}

function createGowooriPromptFileTarget(cwd: string, termId: string): { filePath: string; fileName: string } {
  const base = String(cwd || '')
    .trim()
    .replace(/[\\/]+$/, '');
  const separator = base.includes('\\') ? '\\' : '/';
  const fileName = `${sanitizePromptFileName(termId)}.md`;
  return {
    fileName,
    filePath: `${base}${separator}.xenis-gowoori-prompts${separator}${fileName}`,
  };
}

function createGowooriPromptFileRelativePath(fileName: string): string {
  return `.xenis-gowoori-prompts/${fileName}`;
}

function sanitizePromptFileName(value: string): string {
  const text = String(value || 'gowoori-cli-prompt')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 140);
  return text || 'gowoori-cli-prompt';
}

function getGowooriCliOutputCaptureMode(provider: string): GowooriCliOutputCaptureMode {
  if (provider === 'codex') return 'command-output-file';
  if (provider === 'claude') return 'stdout-file';
  return 'none';
}

function buildPromptFilePipeCommand(
  filePath: string,
  command: string,
  shell: ShellKind,
  outputFilePath?: string,
  outputCaptureMode: GowooriCliOutputCaptureMode = outputFilePath ? 'command-output-file' : 'none',
): string {
  if (shell === 'cmd') {
    const base = `type ${quoteCmdPath(filePath)} | ${command}`;
    if (!outputFilePath) return base;
    if (outputCaptureMode === 'stdout-file') {
      return `${base} > ${quoteCmdPath(outputFilePath)} & if %ERRORLEVEL%==0 if exist ${quoteCmdPath(outputFilePath)} ${buildCmdBase64OutputCommand(outputFilePath)}`;
    }
    return `${base} & if %ERRORLEVEL%==0 if exist ${quoteCmdPath(outputFilePath)} ${buildCmdBase64OutputCommand(outputFilePath)}`;
  }
  if (shell === 'wsl' || shell === 'bash' || shell === 'zsh' || shell === 'sh') {
    const base = `cat ${quotePosixSingle(filePath)} | ${command}`;
    if (!outputFilePath) return base;
    if (outputCaptureMode === 'stdout-file') {
      return `${base} > ${quotePosixSingle(outputFilePath)}; status=$?; if [ "$status" -eq 0 ] && [ -f ${quotePosixSingle(outputFilePath)} ]; then ${buildPosixBase64OutputCommand(outputFilePath)}; fi; exit "$status"`;
    }
    return `${base}; status=$?; if [ "$status" -eq 0 ] && [ -f ${quotePosixSingle(outputFilePath)} ]; then ${buildPosixBase64OutputCommand(outputFilePath)}; fi; exit "$status"`;
  }
  const base = `${POWERSHELL_UTF8_PIPE_PREAMBLE}; Get-Content -Raw -Encoding UTF8 -LiteralPath ${quotePowerShellSingle(filePath)} | ${command}`;
  if (!outputFilePath) return base;
  if (outputCaptureMode === 'stdout-file') {
    return [
      POWERSHELL_UTF8_PIPE_PREAMBLE,
      `$gowooriCliOutputPath = ${quotePowerShellSingle(outputFilePath)}`,
      `Get-Content -Raw -Encoding UTF8 -LiteralPath ${quotePowerShellSingle(filePath)} | ${command} | Tee-Object -FilePath $gowooriCliOutputPath`,
      `$gowooriCliExitCode = $LASTEXITCODE`,
      `if ($gowooriCliExitCode -eq 0 -and (Test-Path -LiteralPath $gowooriCliOutputPath)) { ${buildPowerShellBase64OutputCommand('$gowooriCliOutputPath', { rawPathExpression: true })} }`,
      `$global:LASTEXITCODE = $gowooriCliExitCode`,
    ].join('; ');
  }
  return `${base}; if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath ${quotePowerShellSingle(outputFilePath)})) { ${buildPowerShellBase64OutputCommand(outputFilePath)} }`;
}

function buildPowerShellBase64OutputCommand(
  outputFilePath: string,
  options: { rawPathExpression?: boolean } = {},
): string {
  const pathExpression = options.rawPathExpression ? outputFilePath : quotePowerShellSingle(outputFilePath);
  return [
    `Write-Output '${GOWOORI_CLI_OUTPUT_BASE64_BEGIN}'`,
    `$gowooriOutputBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content -Raw -Encoding UTF8 -LiteralPath ${pathExpression})))`,
    `for ($i = 0; $i -lt $gowooriOutputBase64.Length; $i += 76) { $length = [Math]::Min(76, $gowooriOutputBase64.Length - $i); Write-Output $gowooriOutputBase64.Substring($i, $length) }`,
    `Write-Output '${GOWOORI_CLI_OUTPUT_BASE64_END}'`,
  ].join('; ');
}

function buildCmdBase64OutputCommand(outputFilePath: string): string {
  const script = `${POWERSHELL_UTF8_PIPE_PREAMBLE}; ${buildPowerShellBase64OutputCommand(outputFilePath)}`;
  return `powershell -NoProfile -Command ${quoteCmdPath(script)}`;
}

function buildPosixBase64OutputCommand(outputFilePath: string): string {
  return `printf '%s\\n' ${quotePosixSingle(GOWOORI_CLI_OUTPUT_BASE64_BEGIN)}; base64 ${quotePosixSingle(outputFilePath)}; printf '%s\\n' ${quotePosixSingle(GOWOORI_CLI_OUTPUT_BASE64_END)}`;
}

function withShellExit(command: string, shell: ShellKind): string {
  if (shell === 'cmd') return `${command} & exit /b %ERRORLEVEL%`;
  if (shell === 'wsl') return `${command}; exit $?`;
  return `${command}; exit $LASTEXITCODE`;
}

function getTerminalStdinEndSequence(shell: ShellKind): string {
  if (shell === 'wsl' || shell === 'bash' || shell === 'zsh' || shell === 'sh') return '\n\x04';
  return '\r\x1a\r';
}

function quoteCliToken(value: string): string {
  const input = String(value || '');
  if (!input) return '""';
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(input)) return input;
  return `"${input.replace(/(["`$\\])/g, '\\$1').replace(/\r?\n/g, '\\n')}"`;
}

function quotePowerShellSingle(value: string): string {
  return `'${String(value || '').replace(/'/g, "''")}'`;
}

function quoteCmdPath(value: string): string {
  return `"${String(value || '').replace(/"/g, '""')}"`;
}

function quotePosixSingle(value: string): string {
  return `'${String(value || '').replace(/'/g, "'\\''")}'`;
}
