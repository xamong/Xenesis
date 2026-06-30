import {
  findClassifiedShellCommandOutsideWorkspacePath,
  isDestructiveClassifiedShellCommand,
  isLowRiskClassifiedShellCommand,
} from '../core/permissions/index.js';

export function isDestructiveShellCommand(command: string) {
  return isDestructiveClassifiedShellCommand(command);
}

export function isLowRiskShellCommand(command: string) {
  return isLowRiskClassifiedShellCommand(command);
}

export function findShellCommandOutsideWorkspacePath(command: string, workspaceRoot: string) {
  return findClassifiedShellCommandOutsideWorkspacePath(command, workspaceRoot);
}
