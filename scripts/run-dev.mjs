#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const command = isWindows ? 'powershell' : 'bash';
const args = isWindows
  ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(scriptDir, 'run-dev.ps1')]
  : [path.join(scriptDir, 'run-dev.sh')];
const hideShell = process.env.XENIS_RUN_DEV_HIDE_SHELL === '1';

const child = spawn(command, args, {
  cwd: path.join(scriptDir, '..'),
  env: process.env,
  stdio: 'inherit',
  windowsHide: hideShell,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});

child.on('error', (error) => {
  console.error(`Failed to start Xenesis Desk development script: ${error.message}`);
  process.exitCode = 1;
});
