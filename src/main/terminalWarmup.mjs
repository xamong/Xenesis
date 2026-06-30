import path from 'node:path';

function isWindows(platform) {
  return platform === 'win32';
}

function normalizeShell(value, platform = process.platform) {
  const shell = String(value || '')
    .trim()
    .toLowerCase();
  if (isWindows(platform)) {
    return ['powershell', 'cmd', 'pwsh', 'wsl'].includes(shell) ? shell : 'powershell';
  }
  if (platform === 'darwin') {
    return ['zsh', 'bash', 'sh', 'pwsh'].includes(shell) ? shell : 'zsh';
  }
  return ['bash', 'sh', 'zsh', 'pwsh'].includes(shell) ? shell : 'bash';
}

function normalizeCwd(value) {
  const cwd = String(value || '').trim();
  return cwd || process.cwd();
}

function resolveWindowsSystemCommand(env, fallbackCommand, relativeParts, systemRoot) {
  const root = String(systemRoot || env.SystemRoot || env.windir || '').trim();
  return root ? path.win32.join(root, ...relativeParts) : fallbackCommand;
}

export function shouldTerminalWarmupRun(env = process.env) {
  const disabled = String(env.XENIS_DISABLE_TERMINAL_WARMUP || '')
    .trim()
    .toLowerCase();
  return !['1', 'true', 'yes', 'on'].includes(disabled);
}

export function buildTerminalWarmupLaunch({
  shell,
  platform = process.platform,
  env = process.env,
  systemRoot,
  cwd = process.cwd(),
} = {}) {
  const resolvedShell = normalizeShell(shell, platform);
  const resolvedCwd = normalizeCwd(cwd);

  if (platform === 'win32') {
    if (resolvedShell === 'cmd') {
      return {
        shell: resolvedShell,
        command: env.ComSpec || resolveWindowsSystemCommand(env, 'cmd.exe', ['System32', 'cmd.exe'], systemRoot),
        args: ['/d', '/c', 'exit'],
        cwd: resolvedCwd,
      };
    }
    if (resolvedShell === 'pwsh') {
      return {
        shell: resolvedShell,
        command: 'pwsh.exe',
        args: ['-NoLogo', '-NoProfile', '-Command', 'exit'],
        cwd: resolvedCwd,
      };
    }
    if (resolvedShell === 'wsl') {
      return {
        shell: resolvedShell,
        command: 'wsl.exe',
        args: ['-e', 'sh', '-lc', 'true'],
        cwd: resolvedCwd,
      };
    }
    return {
      shell: 'powershell',
      command: resolveWindowsSystemCommand(
        env,
        'powershell.exe',
        ['System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'],
        systemRoot,
      ),
      args: ['-NoLogo', '-NoProfile', '-Command', 'exit'],
      cwd: resolvedCwd,
    };
  }

  if (resolvedShell === 'pwsh') {
    return {
      shell: resolvedShell,
      command: platform === 'darwin' ? '/opt/homebrew/bin/pwsh' : 'pwsh',
      args: ['-NoLogo', '-NoProfile', '-Command', 'exit'],
      cwd: resolvedCwd,
    };
  }

  if (resolvedShell === 'zsh') {
    return { shell: resolvedShell, command: '/bin/zsh', args: ['-lc', 'true'], cwd: resolvedCwd };
  }
  if (resolvedShell === 'sh') {
    return { shell: resolvedShell, command: '/bin/sh', args: ['-c', 'true'], cwd: resolvedCwd };
  }
  return { shell: 'bash', command: '/bin/bash', args: ['-lc', 'true'], cwd: resolvedCwd };
}
