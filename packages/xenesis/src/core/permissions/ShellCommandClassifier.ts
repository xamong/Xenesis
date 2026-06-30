import { resolve } from 'node:path';
import { privateNetworkUrlInText } from '../../utils/urlSafety.js';
import { isPathInside } from '../../utils/workspace.js';
import type { PermissionClassifierResult, PermissionEngineRiskLevel } from './PermissionEngine.js';

export type ShellDialect = 'powershell' | 'bash' | 'cmd' | 'unknown';

export interface ShellCommandClassifierInput {
  command: string;
  workspaceRoot: string;
  shell?: ShellDialect;
}

export interface ShellCommandClassifierResult extends PermissionClassifierResult {
  dialect: ShellDialect;
  riskLevel: PermissionEngineRiskLevel;
  findings: string[];
  outsideWorkspacePath?: string;
}

const writeLikeCommands = new Set([
  'add-content',
  'clear-content',
  'copy',
  'copy-item',
  'cp',
  'del',
  'erase',
  'ln',
  'md',
  'mkdir',
  'move',
  'move-item',
  'mv',
  'new-item',
  'out-file',
  'rd',
  'remove-item',
  'ren',
  'rename',
  'rename-item',
  'rm',
  'rmdir',
  'robocopy',
  'set-content',
  'tee',
  'touch',
  'xcopy',
]);

const networkFetchCommands = new Set(['curl', 'wget', 'invoke-webrequest', 'iwr', 'invoke-restmethod', 'irm']);

function tokenizeShellCommand(command: string) {
  return command.match(/"[^"]*"|'[^']*'|\S+/g)?.map((token) => token.replace(/^(['"])(.*)\1$/, '$2')) ?? [];
}

function executableBasename(token: string) {
  const base = token.toLowerCase().replace(/\\/g, '/').split('/').pop() ?? token.toLowerCase();
  return base.endsWith('.exe') ? base.slice(0, -4) : base;
}

function isShortFlagToken(token: string) {
  return /^-[A-Za-z]+$/.test(token);
}

function shortFlagTokenHas(token: string, flag: string) {
  return isShortFlagToken(token) && token.slice(1).toLowerCase().includes(flag.toLowerCase());
}

function isForceFlag(token: string) {
  const normalized = token.toLowerCase();
  return normalized === '--force' || normalized.startsWith('--force=') || shortFlagTokenHas(token, 'f');
}

function lowRiskFinding(tokens: string[]) {
  if (tokens.length === 0) return undefined;
  const executable = executableBasename(tokens[0]);
  if (tokens.length === 1 && executable === 'pwd') return 'low-risk command: pwd';
  if (tokens.length !== 2) return undefined;

  const flag = tokens[1].toLowerCase();
  if (executable === 'node' && (flag === '-v' || flag === '--version')) return 'low-risk command: node version';
  if (executable === 'npm' && flag === '--version') return 'low-risk command: npm version';
  if (executable === 'rg' && flag === '--version') return 'low-risk command: rg version';
  if (executable === 'git' && flag === '--version') return 'low-risk command: git version';
  return undefined;
}

function gitSubcommand(tokens: string[], gitIndex: number) {
  const optionValueFlags = new Set(['-c', '--git-dir', '--work-tree', '--namespace']);
  const optionValuePrefixes = ['--git-dir=', '--work-tree=', '--namespace='];

  for (let index = gitIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const normalized = token.toLowerCase();

    if (optionValueFlags.has(normalized)) {
      index += 1;
      continue;
    }

    if (optionValuePrefixes.some((prefix) => normalized.startsWith(prefix))) continue;
    if (normalized === '--' || normalized.startsWith('--')) continue;
    if (/^-[A-Za-z]+$/.test(token)) continue;

    return {
      args: tokens.slice(index + 1),
      subcommand: normalized,
    };
  }

  return undefined;
}

function isGitCleanAliasDefinition(token: string) {
  const normalized = token.toLowerCase();
  if (!normalized.startsWith('alias.')) return false;

  const equalsIndex = normalized.indexOf('=');
  if (equalsIndex === -1) return false;

  const aliasName = normalized.slice('alias.'.length, equalsIndex);
  const aliasValue = normalized.slice(equalsIndex + 1).trim();

  return aliasName.length > 0 && aliasValue.split(/\s+/)[0] === 'clean';
}

function hasInlineGitCleanAliasWithForce(tokens: string[], gitIndex: number) {
  let hasCleanAlias = false;

  for (let index = gitIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    const normalized = token.toLowerCase();

    if (normalized === '-c') {
      if (tokens[index + 1] && isGitCleanAliasDefinition(tokens[index + 1])) {
        hasCleanAlias = true;
      }

      index += 1;
      continue;
    }

    if (hasCleanAlias && isForceFlag(token)) return true;
  }

  return false;
}

function hasBranchForceDeleteFlag(args: string[]) {
  if (args.some((token) => token === '-D')) return true;
  return args.some((token) => token.toLowerCase() === '--delete') && args.some(isForceFlag);
}

function destructiveGitFinding(tokens: string[]) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (executableBasename(tokens[index]) !== 'git') continue;
    if (hasInlineGitCleanAliasWithForce(tokens, index)) return 'destructive git clean alias with force';

    const command = gitSubcommand(tokens, index);
    if (!command) continue;

    if (command.subcommand === 'reset' && command.args.some((token) => token.toLowerCase() === '--hard')) {
      return 'destructive git reset --hard';
    }
    if (command.subcommand === 'clean' && command.args.some(isForceFlag)) {
      return 'destructive git clean with force';
    }
    if (command.subcommand === 'checkout' && command.args.some(isForceFlag)) {
      return 'destructive git checkout with force';
    }
    if (command.subcommand === 'branch' && hasBranchForceDeleteFlag(command.args)) {
      return 'destructive git branch delete';
    }
  }

  return undefined;
}

function destructiveRmFinding(tokens: string[]) {
  for (let index = 0; index < tokens.length; index += 1) {
    const executable = executableBasename(tokens[index]);
    if (executable !== 'rm' && executable !== 'remove-item' && executable !== 'rmdir' && executable !== 'rd') continue;

    let hasRecursive = false;
    let hasForce = executable === 'remove-item';
    for (const token of tokens.slice(index + 1)) {
      const normalized = token.toLowerCase();
      if (normalized === '--recursive' || normalized === '-recurse') hasRecursive = true;
      if (normalized === '--force' || normalized === '-force') hasForce = true;
      if (shortFlagTokenHas(token, 'r')) hasRecursive = true;
      if (shortFlagTokenHas(token, 'f')) hasForce = true;
    }

    if (executable === 'remove-item' && hasRecursive) return 'PowerShell Remove-Item -Recurse';
    if (hasRecursive && hasForce) return 'recursive forced deletion';
  }

  return undefined;
}

function destructiveCmdFinding(command: string) {
  if (/\bdel\s+\/[sq]\b/i.test(command)) return 'cmd del recursive or quiet deletion';
  if (/\brmdir\s+\/s\b/i.test(command)) return 'cmd rmdir recursive deletion';
  if (/\bformat\b/i.test(command)) return 'cmd format command';
  if (/\bdiskpart\b/i.test(command)) return 'cmd diskpart command';
  if (/\breg\s+delete\b/i.test(command)) return 'cmd registry delete command';
  return undefined;
}

function powershellFinding(command: string, tokens: string[]) {
  const hasPowershellExecutable = tokens.some((token) => {
    const executable = executableBasename(token);
    return executable === 'powershell' || executable === 'pwsh';
  });
  if (
    hasPowershellExecutable &&
    tokens.some((token) => ['-encodedcommand', '-enc', '-e'].includes(token.toLowerCase()))
  ) {
    return 'PowerShell encoded command';
  }
  if (/\bRemove-Item\b/i.test(command) && /-Recurse\b/i.test(command)) return 'PowerShell Remove-Item -Recurse';
  if (/\bStart-Process\b/i.test(command) && /-Verb\s+RunAs\b/i.test(command))
    return 'PowerShell elevation via Start-Process -Verb RunAs';
  if (/\bInvoke-WebRequest\b/i.test(command) && /\|\s*(Invoke-Expression|iex)\b/i.test(command)) {
    return 'PowerShell download-and-execute pipeline';
  }
  return undefined;
}

function privateNetworkFetchFinding(tokens: string[]) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (!networkFetchCommands.has(executableBasename(tokens[index]))) continue;
    const url = privateNetworkUrlInText(tokens.slice(index + 1).join(' '));
    if (url) return `private-network URL in shell command: ${url}`;
  }
  return undefined;
}

function nestedShellCommand(tokens: string[], shellIndex: number) {
  for (let index = shellIndex + 1; index < tokens.length - 1; index += 1) {
    const token = tokens[index].toLowerCase();
    if (token === '-c' || token === '--command') return tokens[index + 1];
    if (isShortFlagToken(token) && token.includes('c')) return tokens[index + 1];
  }
  return undefined;
}

function nestedDestructiveFinding(tokens: string[], workspaceRoot: string, depth: number) {
  if (depth >= 3) return undefined;

  for (let index = 0; index < tokens.length; index += 1) {
    const executable = executableBasename(tokens[index]);
    if (executable === 'eval') {
      const nested = tokens.slice(index + 1).join(' ');
      const classified = classifyShellCommandInternal({ command: nested, workspaceRoot }, depth + 1);
      if (classified.status === 'unsafe') return `nested eval: ${classified.findings[0] ?? classified.reason}`;
    }

    if (executable === 'sh' || executable === 'bash' || executable === 'powershell' || executable === 'pwsh') {
      const nested = nestedShellCommand(tokens, index);
      if (!nested) continue;
      const classified = classifyShellCommandInternal(
        {
          command: nested,
          workspaceRoot,
          shell: executable === 'sh' || executable === 'bash' ? 'bash' : 'powershell',
        },
        depth + 1,
      );
      if (classified.status === 'unsafe') return `nested ${executable}: ${classified.findings[0] ?? classified.reason}`;
    }
  }

  return undefined;
}

function normalizedPotentialPath(token: string) {
  return token.trim().replace(/[),;]+$/g, '');
}

function isAbsoluteShellPath(token: string) {
  const normalized = normalizedPotentialPath(token);
  return /^[A-Za-z]:[\\/]/.test(normalized) || /^\\\\[^\\]/.test(normalized) || /^\/(?![A-Za-z?]$)/.test(normalized);
}

function outsideWorkspacePath(command: string, workspaceRoot: string) {
  const tokens = tokenizeShellCommand(command);
  if (!tokens.some((token) => writeLikeCommands.has(executableBasename(token)))) return undefined;

  return tokens
    .map(normalizedPotentialPath)
    .filter((token) => !writeLikeCommands.has(executableBasename(token)))
    .filter(isAbsoluteShellPath)
    .find((path) => !isPathInside(workspaceRoot, resolve(path)));
}

function redirectionOutsideWorkspace(command: string, workspaceRoot: string) {
  const pattern = /(?:^|\s|[^\s>])(\d*&?>>?|>>?)\s*("[^"]+"|'[^']+'|\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(command))) {
    const target = match[2].replace(/^(['"])(.*)\1$/, '$2');
    if (target === '/dev/null' || target.startsWith('&')) continue;
    const resolved = resolve(workspaceRoot, target);
    if (!isPathInside(workspaceRoot, resolved)) return target;
  }
  return undefined;
}

function forcePushFinding(tokens: string[]) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (executableBasename(tokens[index]) !== 'git') continue;
    const command = gitSubcommand(tokens, index);
    if (command?.subcommand !== 'push') continue;
    const lowerArgs = command.args.map((token) => token.toLowerCase());
    if (lowerArgs.includes('--force-with-lease')) continue;
    if (command.args.some(isForceFlag)) return 'force push rewrites remote history';
  }
  return undefined;
}

function pipeToInterpreterFinding(command: string) {
  const downloader = /\b(curl|wget|invoke-webrequest|iwr|invoke-restmethod|irm)\b/i;
  const interpreter = 'bash|sh|zsh|dash|python3?|node|ruby|perl|powershell|pwsh|iex|invoke-expression';
  if (downloader.test(command) && new RegExp(`\\|\\s*(?:sudo\\s+)?(?:${interpreter})\\b`, 'i').test(command)) {
    return 'download piped into an interpreter';
  }
  if (downloader.test(command) && /\$\(|`/.test(command) && new RegExp(`\\b(?:${interpreter})\\b`, 'i').test(command)) {
    return 'download executed via command substitution in an interpreter';
  }
  return undefined;
}

function classifyShellCommandInternal(input: ShellCommandClassifierInput, depth: number): ShellCommandClassifierResult {
  const command = input.command.trim();
  const dialect = input.shell ?? 'unknown';
  if (command.length === 0) {
    return {
      status: 'unparseable',
      reason: 'shell command is empty',
      dialect,
      riskLevel: 'medium',
      findings: ['empty command'],
    };
  }

  const tokens = tokenizeShellCommand(command);
  const lowRisk = lowRiskFinding(tokens);
  if (lowRisk) {
    return {
      status: 'safe',
      reason: lowRisk,
      dialect,
      riskLevel: 'low',
      findings: [lowRisk],
    };
  }

  const outsidePath = outsideWorkspacePath(command, input.workspaceRoot);
  if (outsidePath) {
    return {
      status: 'unsafe',
      reason: `shell command writes outside the workspace: ${outsidePath}`,
      dialect,
      riskLevel: 'high',
      findings: ['outside-workspace write'],
      outsideWorkspacePath: outsidePath,
    };
  }

  const redirectOutside = redirectionOutsideWorkspace(command, input.workspaceRoot);
  if (redirectOutside) {
    return {
      status: 'unsafe',
      reason: `shell command redirects output outside the workspace: ${redirectOutside}`,
      dialect,
      riskLevel: 'high',
      findings: ['redirection outside workspace'],
      outsideWorkspacePath: redirectOutside,
    };
  }

  const finding =
    destructiveGitFinding(tokens) ??
    destructiveRmFinding(tokens) ??
    destructiveCmdFinding(command) ??
    powershellFinding(command, tokens) ??
    privateNetworkFetchFinding(tokens) ??
    nestedDestructiveFinding(tokens, input.workspaceRoot, depth);

  if (finding) {
    return {
      status: 'unsafe',
      reason: finding,
      dialect,
      riskLevel: 'high',
      findings: [finding],
    };
  }

  const askFinding = forcePushFinding(tokens) ?? pipeToInterpreterFinding(command);
  if (askFinding) {
    return {
      status: 'ambiguous',
      reason: askFinding,
      dialect,
      riskLevel: 'medium',
      findings: [askFinding],
    };
  }

  return {
    status: 'ambiguous',
    reason: 'shell command requires approval because it is not classified as low-risk',
    dialect,
    riskLevel: 'medium',
    findings: ['not low-risk'],
  };
}

export function classifyShellCommand(input: ShellCommandClassifierInput): ShellCommandClassifierResult {
  return classifyShellCommandInternal(input, 0);
}

export function isLowRiskClassifiedShellCommand(command: string): boolean {
  return classifyShellCommand({ command, workspaceRoot: process.cwd() }).status === 'safe';
}

export function isDestructiveClassifiedShellCommand(command: string): boolean {
  const classified = classifyShellCommand({ command, workspaceRoot: process.cwd() });
  return classified.status === 'unsafe' && classified.outsideWorkspacePath === undefined;
}

export function findClassifiedShellCommandOutsideWorkspacePath(command: string, workspaceRoot: string) {
  return classifyShellCommand({ command, workspaceRoot }).outsideWorkspacePath;
}
