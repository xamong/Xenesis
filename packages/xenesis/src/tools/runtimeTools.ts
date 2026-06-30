import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { basename, resolve } from 'node:path';
import { z } from 'zod';
import { classifyVerificationFailure, renderVerificationFailureClassification } from '../core/failureClassification.js';
import { LOCAL_BACKEND } from '../core/isolation/executionBackend.js';
import { computeShellEnv } from '../core/isolation/secretScrub.js';
import { buildShellInvocation, killProcessTree, runCommand } from '../utils/command.js';
import { assertExistingPathInsideWorkspace } from '../utils/workspace.js';
import type { Tool } from './types.js';

const diagnosticsInput = z.object({
  script: z.string().min(1).default('typecheck'),
  args: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().max(600_000).default(120_000),
  maxOutputChars: z.number().int().positive().max(100_000).default(20_000),
});

const jsonInput = z.object({
  action: z.enum(['get', 'set', 'delete']),
  path: z.string().min(1),
  pointer: z.string().default(''),
  value: z.unknown().optional(),
  valueJson: z.string().nullable().optional(),
});

const jsonOpenAIInput = z.object({
  action: z.enum(['get', 'set', 'delete']),
  path: z.string().min(1),
  pointer: z.string(),
  valueJson: z.string().nullable(),
});

const serverInput = z.object({
  action: z.enum(['start', 'list', 'logs', 'stop']),
  name: z.string().min(1).nullable().optional(),
  command: z.string().nullable().optional(),
  cwd: z.string().default('.'),
  readinessUrl: z.string().nullable().optional(),
  readinessTimeoutMs: z.number().int().min(100).max(120_000).nullable().optional(),
});

const serverOpenAIInput = z.object({
  action: z.enum(['start', 'list', 'logs', 'stop']),
  name: z.string().nullable(),
  command: z.string().nullable(),
  cwd: z.string(),
  readinessUrl: z.string().nullable(),
  readinessTimeoutMs: z.number().int().min(100).max(120_000).nullable(),
});

function scriptNameIsSafe(script: string) {
  return /^[A-Za-z0-9:_-]+$/.test(script);
}

function scriptArgIsSafe(arg: string) {
  return arg.length > 0 && /^[A-Za-z0-9_./\\:=@,+-]+$/.test(arg);
}

function unsafeScriptArgs(args: string[]) {
  return args.filter((arg) => !scriptArgIsSafe(arg));
}

function npmRunInvocation(script: string, args: string[]) {
  const npmArgs = ['run', '--silent', script, ...(args.length > 0 ? ['--', ...args] : [])];
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm', ...npmArgs],
    };
  }

  return {
    command: 'npm',
    args: npmArgs,
  };
}

async function packageScripts(workspaceRoot: string) {
  const packagePath = await assertExistingPathInsideWorkspace(workspaceRoot, 'package.json');
  const parsed = JSON.parse(await readFile(packagePath, 'utf8')) as { scripts?: Record<string, string> };
  return parsed.scripts ?? {};
}

function summarizeDiagnosticOutput(options: {
  script: string;
  args?: string[];
  scriptFallback?: string;
  exitCode: number | null;
  timedOut: boolean;
  truncated: boolean;
  failureLikeOutput?: boolean;
  stdout: string;
  stderr: string;
}) {
  const verificationOk = options.exitCode === 0 && !options.timedOut && !options.failureLikeOutput;
  const lines = [
    `script: ${options.script}`,
    ...(options.args && options.args.length > 0 ? [`args: ${options.args.join(' ')}`] : []),
    ...(options.scriptFallback ? [`scriptFallback: ${options.scriptFallback}`] : []),
    `exitCode: ${options.exitCode === null ? 'none' : options.exitCode}`,
    `timedOut: ${options.timedOut}`,
    `truncated: ${options.truncated}`,
    `verificationOk: ${verificationOk}`,
    `repairRequired: ${!verificationOk}`,
  ];
  if (options.failureLikeOutput !== undefined) {
    lines.push(`failureLikeOutput: ${options.failureLikeOutput}`);
  }
  if (options.timedOut) {
    lines.push(
      'timeoutHint: verification timed out; inspect readiness waits, missing 200 routes, unbounded polling, open handles, and child server cleanup before reporting.',
    );
  }
  const output = [options.stdout.trimEnd(), options.stderr.trimEnd()].filter(Boolean).join('\n');
  if (output) lines.push('output:', output);
  if (!verificationOk) {
    lines.push(
      renderVerificationFailureClassification(
        classifyVerificationFailure({
          toolName: 'diagnostics',
          content: lines.join('\n'),
        }),
      ),
    );
  }
  return lines.join('\n');
}

function hasFailureLikeDiagnosticOutput(stdout: string, stderr: string) {
  const output = [stdout, stderr].filter(Boolean).join('\n');
  return output.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^(0|no)\s+(failures?|errors?)\b/i.test(trimmed)) return false;
    if (/\b(no|without)\s+(failures?|errors?)\b/i.test(trimmed)) return false;
    const withoutZeroFailureCounters = trimmed.replace(
      /\b(?:failed|failures?|errors?|error|exceptions?)\s*[:=]\s*0\b/gi,
      '',
    );
    return /\b(failed|failure|error|exception)\b\s*[:=-]?/i.test(withoutZeroFailureCounters);
  });
}

export const diagnosticsTool: Tool<z.infer<typeof diagnosticsInput>> = {
  name: 'diagnostics',
  description: 'Run a package.json npm script and summarize diagnostic output.',
  inputSchema: diagnosticsInput,
  isReadOnly: () => true,
  async run(input, context) {
    const requestedScript = input.script ?? 'typecheck';
    const args = input.args ?? [];
    let script = requestedScript;
    if (!scriptNameIsSafe(script)) return { ok: false, content: `Unsafe npm script name: ${script}` };
    const unsafeArgs = unsafeScriptArgs(args);
    if (unsafeArgs.length > 0) {
      return { ok: false, content: `Unsafe npm script args: ${unsafeArgs.join(', ')}` };
    }

    const scripts = await packageScripts(context.workspaceRoot);
    if (!(script in scripts)) {
      if (script === 'typecheck' && 'test' in scripts) {
        script = 'test';
      } else {
        const available = Object.keys(scripts).sort().join(', ') || 'none';
        return { ok: false, content: `npm script not found: ${script}\navailableScripts: ${available}` };
      }
    }

    const npmInvocation = npmRunInvocation(script, args);
    const result = await (context.executionBackend ?? LOCAL_BACKEND).runArgs({
      command: npmInvocation.command,
      args: npmInvocation.args,
      cwd: context.workspaceRoot,
      timeoutMs: input.timeoutMs ?? 120_000,
      maxOutputChars: input.maxOutputChars ?? 20_000,
    });
    const failureLikeOutput = hasFailureLikeDiagnosticOutput(result.stdout, result.stderr);

    return {
      ok: result.exitCode === 0 && !result.timedOut && !failureLikeOutput,
      content: summarizeDiagnosticOutput({
        script,
        args,
        scriptFallback: script !== requestedScript ? `${requestedScript} -> ${script}` : undefined,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        truncated: result.truncated,
        failureLikeOutput,
        stdout: result.stdout,
        stderr: result.stderr,
      }),
      data: result,
    };
  },
};

function decodePointerToken(token: string) {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

function pointerTokens(pointer: string) {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new Error(`Invalid JSON pointer: ${pointer}`);
  return pointer.slice(1).split('/').map(decodePointerToken);
}

function readPointer(root: unknown, pointer: string): unknown {
  let current = root;
  for (const token of pointerTokens(pointer)) {
    if (typeof current !== 'object' || current === null || !(token in current)) {
      throw new Error(`JSON pointer not found: ${pointer}`);
    }
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

function parentForPointer(root: unknown, pointer: string, create: boolean) {
  const tokens = pointerTokens(pointer);
  if (tokens.length === 0) throw new Error('JSON pointer must target a property.');
  let current = root;
  for (const token of tokens.slice(0, -1)) {
    if (typeof current !== 'object' || current === null) {
      throw new Error(`JSON pointer parent is not an object: ${pointer}`);
    }
    const record = current as Record<string, unknown>;
    if (!(token in record)) {
      if (!create) throw new Error(`JSON pointer not found: ${pointer}`);
      record[token] = {};
    }
    current = record[token];
  }
  if (typeof current !== 'object' || current === null) {
    throw new Error(`JSON pointer parent is not an object: ${pointer}`);
  }
  return {
    parent: current as Record<string, unknown>,
    key: tokens[tokens.length - 1]!,
  };
}

export const jsonTool: Tool<z.infer<typeof jsonInput>> = {
  name: 'json',
  description: 'Read or modify JSON files inside the workspace by JSON pointer.',
  inputSchema: jsonInput,
  openaiInputSchema: jsonOpenAIInput,
  isReadOnly: (input) => input.action === 'get',
  async run(input, context) {
    const absolutePath = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path);
    const parsed = JSON.parse(await readFile(absolutePath, 'utf8')) as unknown;
    const pointer = input.pointer ?? '';

    if (input.action === 'get') {
      return { ok: true, content: JSON.stringify(readPointer(parsed, pointer), null, 2) };
    }

    if (input.action === 'set') {
      let value = input.value;
      if (!('value' in input)) {
        if (typeof input.valueJson !== 'string') return { ok: false, content: 'json set requires value or valueJson.' };
        try {
          value = JSON.parse(input.valueJson);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { ok: false, content: `Invalid valueJson: ${message}` };
        }
      }
      if (pointer === '') {
        await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
        return { ok: true, content: `Set root in ${input.path}.` };
      }
      const target = parentForPointer(parsed, pointer, true);
      target.parent[target.key] = value;
      await writeFile(absolutePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
      return { ok: true, content: `Set ${pointer || '/'} in ${input.path}.` };
    }

    const target = parentForPointer(parsed, pointer, false);
    if (!(target.key in target.parent)) return { ok: false, content: `JSON pointer not found: ${pointer}` };
    delete target.parent[target.key];
    await writeFile(absolutePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
    return { ok: true, content: `Deleted ${pointer} from ${input.path}.` };
  },
};

interface ManagedServer {
  name: string;
  command: string;
  cwd: string;
  child: ChildProcessWithoutNullStreams;
  startedAt: string;
  logs: string;
}

const managedServers = new Map<string, ManagedServer>();
const MAX_SERVER_LOG_CHARS = 50_000;

function appendServerLog(server: ManagedServer, chunk: string) {
  server.logs += chunk;
  if (server.logs.length > MAX_SERVER_LOG_CHARS) {
    server.logs = server.logs.slice(server.logs.length - MAX_SERVER_LOG_CHARS);
  }
}

function requireServerName(input: z.infer<typeof serverInput>) {
  if (!input.name) throw new Error(`server ${input.action} requires a name.`);
  return input.name;
}

async function stopServer(server: ManagedServer) {
  if (server.child.exitCode !== null || server.child.killed) return;
  const pid = server.child.pid;
  const closed = new Promise<void>((resolveClosed) => {
    server.child.once('close', () => resolveClosed());
  });
  await killProcessTree(pid, 'force');
  server.child.kill('SIGKILL');
  await Promise.race([closed, new Promise<void>((resolveTimeout) => setTimeout(resolveTimeout, 1000))]);
}

export async function stopAllManagedServers() {
  const servers = Array.from(managedServers.values());
  for (const server of servers) {
    await stopServer(server);
    managedServers.delete(server.name);
  }
}

async function waitForServerStartup(server: ManagedServer, timeoutMs: number) {
  const startedWithLogs = () => server.logs.length > 0 || server.child.exitCode !== null || server.child.killed;
  if (startedWithLogs()) return;
  await new Promise<void>((resolveWait) => {
    const timer = setTimeout(resolveWait, timeoutMs);
    const finish = () => {
      clearTimeout(timer);
      server.child.stdout.off('data', finish);
      server.child.stderr.off('data', finish);
      server.child.off('close', finish);
      resolveWait();
    };
    server.child.stdout.once('data', finish);
    server.child.stderr.once('data', finish);
    server.child.once('close', finish);
  });
}

function assertLocalReadinessUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`server readinessUrl must be HTTP(S): ${url}`);
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
    throw new Error(`server readinessUrl must target localhost: ${url}`);
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text().catch(() => '');
    if (!response.ok) {
      return { ok: false, reason: `HTTP status ${response.status}` };
    }
    if (looksLikeGenericServerLandingPage(body)) {
      return { ok: false, reason: 'generic server landing page' };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: message || 'readiness URL fetch failed' };
  } finally {
    clearTimeout(timeout);
  }
}

function looksLikeGenericServerLandingPage(text: string) {
  return /IIS Windows Server|HTTP Error \d|HTTP 오류 \d|Apache(?:2)? (?:Debian )?Default Page|nginx welcome|It works!/i.test(
    text,
  );
}

async function waitForReadinessUrl(server: ManagedServer, url: string, timeoutMs: number) {
  assertLocalReadinessUrl(url);
  const startedAt = Date.now();
  let lastReason: string | undefined;
  while (Date.now() - startedAt < timeoutMs) {
    if (server.child.exitCode !== null || server.child.killed) {
      return { ok: false, elapsedMs: Date.now() - startedAt, reason: 'server exited before readiness URL passed' };
    }
    const readiness = await fetchWithTimeout(url, 750);
    if (readiness.ok) {
      return { ok: true, elapsedMs: Date.now() - startedAt };
    }
    lastReason = readiness.reason;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  return {
    ok: false,
    elapsedMs: Date.now() - startedAt,
    reason: `readiness URL timed out after ${timeoutMs}ms${lastReason ? `; last failure: ${lastReason}` : ''}`,
  };
}

function looksLikePlaceholderServerCommand(command: string) {
  const normalized = command.trim();
  if (!normalized) return false;
  if (/^(?:Start-WebServer|Run-WebServer|Start-Server|Start-App|Run-App)$/i.test(normalized)) return true;
  if (/^(?:start|run)\s+(?:web\s+)?server$/i.test(normalized)) return true;
  return /\b(?:TODO|placeholder|your-command-here|replace-with|example-command)\b/i.test(normalized);
}

function firstCommandToken(command: string) {
  const normalized = command.trim().replace(/^&\s+/, '');
  const quoted = normalized.match(/^["']([^"']+)["']/);
  if (quoted) return quoted[1];
  return normalized.split(/\s+/)[0] ?? '';
}

async function missingLocalServerScript(command: string, cwd: string) {
  const token = firstCommandToken(command).replace(/^["']|["']$/g, '');
  if (!token) return undefined;
  const scriptName = basename(token.replace(/\\/g, '/'));
  if (!/^(?:start|run)[-_]?(?:web[-_]?)?(?:server|app)\.(?:cmd|bat|ps1|sh)$/i.test(scriptName)) {
    return undefined;
  }
  const scriptPath = resolve(cwd, token);
  try {
    await access(scriptPath);
    return undefined;
  } catch {
    return scriptName;
  }
}

function parseXenesisStaticCommand(command: string) {
  const match = command.match(/^xenesis:static(?:\s+(.+))?$/i);
  if (!match) return undefined;
  const root = (match[1] ?? '.').trim().replace(/^["']|["']$/g, '') || '.';
  return { root };
}

async function allocateLocalHttpPort() {
  return await new Promise<number>((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once('error', rejectPort);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => rejectPort(new Error('Failed to allocate a local HTTP port.')));
        return;
      }
      const port = address.port;
      server.close(() => resolvePort(port));
    });
  });
}

function portFromReadinessUrl(readinessUrl: string) {
  if (!readinessUrl.trim()) return undefined;
  const parsed = new URL(readinessUrl);
  if (!parsed.port) return undefined;
  return Number(parsed.port);
}

function staticHttpServerScript() {
  return [
    "const http = require('http');",
    "const fs = require('fs');",
    "const path = require('path');",
    'const root = path.resolve(process.argv[1]);',
    'const port = Number(process.argv[2]);',
    "const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.ttf':'font/ttf','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg','.m4a':'audio/mp4','.wav':'audio/wav'};",
    'http.createServer((req, res) => {',
    "  const parsed = new URL(req.url || '/', 'http://127.0.0.1');",
    '  let requestPath = decodeURIComponent(parsed.pathname);',
    "  if (requestPath === '/' || requestPath.endsWith('/')) requestPath += 'index.html';",
    "  const file = path.resolve(root, requestPath.replace(/^[/\\\\]+/, ''));",
    "  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end('forbidden'); return; }",
    '  fs.stat(file, (statError, stats) => {',
    "    if (statError || !stats.isFile()) { res.writeHead(404); res.end('not found'); return; }",
    "    res.writeHead(200, { 'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });",
    "    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);",
    '  });',
    "}).listen(port, '127.0.0.1', () => console.log(`static server ready ${port}`));",
    'setInterval(() => {}, 1000);',
  ].join(' ');
}

async function buildServerStartInvocation(options: { command: string; cwd: string; readinessUrl: string }) {
  const staticCommand = parseXenesisStaticCommand(options.command);
  if (staticCommand) {
    const staticRoot = await assertExistingPathInsideWorkspace(options.cwd, staticCommand.root);
    const port = portFromReadinessUrl(options.readinessUrl) ?? (await allocateLocalHttpPort());
    return {
      shell: process.execPath,
      args: ['-e', staticHttpServerScript(), staticRoot, String(port)],
      cwd: staticRoot,
      displayCommand: `xenesis:static ${staticCommand.root}`,
      inferredReadinessUrl: options.readinessUrl || `http://127.0.0.1:${port}/`,
    };
  }

  return {
    ...buildShellInvocation(options.command),
    cwd: options.cwd,
    displayCommand: options.command,
    inferredReadinessUrl: options.readinessUrl,
  };
}

export const serverTool: Tool<z.infer<typeof serverInput>> = {
  name: 'server',
  description: 'Start, list, read logs from, and stop managed workspace processes.',
  inputSchema: serverInput,
  openaiInputSchema: serverOpenAIInput,
  isReadOnly: (input) => input.action === 'list' || input.action === 'logs',
  async run(input, context) {
    if (input.action === 'list') {
      const lines = Array.from(managedServers.values()).map((server) => {
        const status =
          server.child.exitCode === null && !server.child.killed
            ? 'running'
            : `exited(${server.child.exitCode ?? 'unknown'})`;
        return `${server.name} ${status} ${server.cwd}`;
      });
      return { ok: true, content: lines.length > 0 ? lines.join('\n') : 'no servers' };
    }

    const name = requireServerName(input);
    if (input.action === 'logs') {
      const server = managedServers.get(name);
      if (!server) return { ok: false, content: `server not found: ${name}` };
      return { ok: true, content: server.logs.trimEnd() || 'no logs' };
    }

    if (input.action === 'stop') {
      const server = managedServers.get(name);
      if (!server) return { ok: false, content: `server not found: ${name}` };
      await stopServer(server);
      managedServers.delete(name);
      return { ok: true, content: `server stopped: ${name}` };
    }

    const command = input.command?.trim() ?? '';
    if (!command) return { ok: false, content: 'server start requires a command.' };
    const cwd = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.cwd?.trim() || '.');
    if (looksLikePlaceholderServerCommand(command)) {
      return {
        ok: false,
        content: [
          `placeholder server command rejected: ${command}`,
          'Run app_launch_plan first, then start server with a concrete command from package.json, Python entrypoint, or managed static serving.',
        ].join('\n'),
      };
    }
    const missingScript = await missingLocalServerScript(command, cwd);
    if (missingScript) {
      return {
        ok: false,
        content: [
          `server script not found: ${missingScript}`,
          `command: ${command}`,
          'Run app_launch_plan first, then start server with the concrete command it returns.',
        ].join('\n'),
      };
    }
    if (managedServers.has(name)) return { ok: false, content: `server already exists: ${name}` };
    const readinessUrl = input.readinessUrl?.trim() || '';
    const invocation = await buildServerStartInvocation({
      command,
      cwd,
      readinessUrl,
    });
    const child = spawn(invocation.shell, invocation.args, {
      cwd: resolve(invocation.cwd),
      windowsHide: true,
      detached: process.platform !== 'win32',
      // Scrub secrets/exec-hijack vars from the long-lived managed child, mirroring
      // shellTool/ShellSession. computeShellEnv returns undefined only when isolation
      // is explicitly opted out (XENESIS_ISOLATION_SCRUB="0"), which lets the child
      // inherit the full env exactly as before.
      env: computeShellEnv(context.env ?? process.env),
    });
    const server: ManagedServer = {
      name,
      command: invocation.displayCommand,
      cwd: invocation.cwd,
      child,
      startedAt: new Date().toISOString(),
      logs: '',
    };
    managedServers.set(name, server);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => appendServerLog(server, String(chunk)));
    child.stderr.on('data', (chunk) => appendServerLog(server, String(chunk)));
    child.on('close', () => {
      // Keep the record so logs remain available until the user stops or replaces it.
    });
    child.on('error', (error) => appendServerLog(server, error.message));

    await waitForServerStartup(server, 1000);
    const effectiveReadinessUrl = invocation.inferredReadinessUrl;
    const readinessTimeoutMs = input.readinessTimeoutMs ?? 10_000;
    if (effectiveReadinessUrl && child.exitCode === null) {
      const readiness = await waitForReadinessUrl(server, effectiveReadinessUrl, readinessTimeoutMs);
      if (!readiness.ok) {
        const logPreview = server.logs.trimEnd().slice(-1200);
        await stopServer(server);
        managedServers.delete(name);
        return {
          ok: false,
          content: [
            `server readiness failed: ${name}`,
            `readiness: fail ${effectiveReadinessUrl}`,
            `elapsedMs: ${readiness.elapsedMs}`,
            `reason: ${readiness.reason ?? 'unknown readiness failure'}`,
            logPreview ? `logs:\n${logPreview}` : 'logs: none',
          ].join('\n'),
        };
      }
      return {
        ok: true,
        content: [
          `server started: ${name}`,
          `readiness: pass ${effectiveReadinessUrl}`,
          `readinessElapsedMs: ${readiness.elapsedMs}`,
        ].join('\n'),
        data: { name, command: server.command, cwd: server.cwd, startedAt: server.startedAt },
      };
    }
    return {
      ok: child.exitCode === null,
      content: child.exitCode === null ? `server started: ${name}` : `server exited early: ${name}`,
      data: { name, command: server.command, cwd: server.cwd, startedAt: server.startedAt },
    };
  },
};
