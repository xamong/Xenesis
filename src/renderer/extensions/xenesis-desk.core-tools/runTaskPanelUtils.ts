import type { ShellKind } from '../../../shared/types';

export const MAX_TASK_OUTPUT_CHARS = 120000;

export type RunTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface RunTaskSummaryInput {
  id: string;
  label: string;
  command: string;
  cwd: string;
  shell: ShellKind;
  status: RunTaskStatus;
  exitCode?: number;
  startedAt?: string;
  finishedAt?: string;
  output: string;
}

export function stripAnsi(value: string): string {
  return value
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildOneShotShellInput(command: string, shell: ShellKind): string {
  const trimmed = command.trim();
  if (!trimmed) return '';

  if (shell === 'cmd') {
    return `${trimmed}\r\nexit /b %ERRORLEVEL%\r\n`;
  }

  if (shell === 'wsl') {
    return `${trimmed}\nexit $?\n`;
  }

  const encoded = escapePowerShellSingleQuoted(trimmed);
  return `Invoke-Expression '${encoded}'\r\nexit $LASTEXITCODE\r\n`;
}

export function appendLimitedOutput(current: string, chunk: string): string {
  const next = current + chunk;
  if (next.length <= MAX_TASK_OUTPUT_CHARS) return next;
  return next.slice(next.length - MAX_TASK_OUTPUT_CHARS);
}

export function formatRunTaskTranscript(task: RunTaskSummaryInput): string {
  const cleanOutput = stripAnsi(task.output).trimEnd();
  return [
    `Run Task: ${task.label || task.command}`,
    `ID: ${task.id}`,
    `Shell: ${task.shell}`,
    `CWD: ${task.cwd || '-'}`,
    `Status: ${task.status}`,
    `Exit Code: ${task.exitCode ?? '-'}`,
    `Started: ${task.startedAt || '-'}`,
    `Finished: ${task.finishedAt || '-'}`,
    '',
    '$ ' + task.command,
    '',
    cleanOutput || '(no output)',
  ].join('\n');
}

export function summarizeRunTaskForBot(task: RunTaskSummaryInput): string {
  const output = stripAnsi(task.output).trim();
  const tail = output.length > 12000 ? output.slice(output.length - 12000) : output;
  return [
    'Review this Xenesis Desk Run Task result.',
    `Task: ${task.label || task.command}`,
    `Shell: ${task.shell}`,
    `CWD: ${task.cwd || '-'}`,
    `Status: ${task.status}`,
    `Exit code: ${task.exitCode ?? '-'}`,
    '',
    'Command:',
    task.command,
    '',
    'Output tail:',
    tail || '(no output)',
    '',
    'Summarize the result, identify errors, and recommend the next action.',
  ].join('\n');
}
