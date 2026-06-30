import type { ApprovalMode, PathRuleConfig, PermissionRiskLevel, ToolPolicyConfig } from '../config/index.js';
import { isPathInside, resolveWorkspacePath } from '../utils/workspace.js';
import { findShellCommandOutsideWorkspacePath, isDestructiveShellCommand, isLowRiskShellCommand } from './shellRisk.js';

export type PermissionStatus = 'allow' | 'ask' | 'deny';

export interface PermissionRequest {
  toolName: string;
  input: unknown;
  isReadOnly: boolean;
  approvalMode: ApprovalMode;
  workspaceRoot: string;
  blockedTools?: string[];
  toolPolicies?: Record<string, ToolPolicyConfig>;
  pathRules?: PathRuleConfig[];
}

export interface PermissionDecision {
  status: PermissionStatus;
  reason: string;
  riskLevel: PermissionRiskLevel;
  audit: {
    summary: string;
    preview?: string;
    hardDeny: boolean;
  };
}

const alwaysAllowedPathlessTools = new Set(['todo', 'ask']);

function inputPath(input: unknown) {
  if (typeof input !== 'object' || input === null) return undefined;
  const value = (input as { path?: unknown }).path;
  return typeof value === 'string' ? value : undefined;
}

export function workspacePathForToolInput(toolName: string, input: unknown) {
  const path = inputPath(input);
  if (path !== undefined) return path;

  if (toolName === 'config' && typeof input === 'object' && input !== null) {
    const value = (input as { value?: unknown }).value;
    if (value !== undefined) return 'xenesis.config.json';
  }

  return undefined;
}

function inputCommand(input: unknown) {
  if (typeof input !== 'object' || input === null) return undefined;
  const value = (input as { command?: unknown }).command;
  return typeof value === 'string' ? value : undefined;
}

function inputUrl(input: unknown) {
  if (typeof input !== 'object' || input === null) return undefined;
  const value = (input as { url?: unknown }).url;
  return typeof value === 'string' ? value : undefined;
}

function inputString(input: unknown, key: string) {
  if (typeof input !== 'object' || input === null) return undefined;
  const value = (input as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function touchesWorkspacePath(toolName: string) {
  return (
    toolName === 'read' ||
    toolName === 'write' ||
    toolName === 'edit' ||
    toolName === 'list' ||
    toolName === 'search' ||
    toolName === 'glob' ||
    toolName === 'tree' ||
    toolName === 'file_info' ||
    toolName === 'diff' ||
    toolName === 'patch' ||
    toolName === 'json'
  );
}

export function summarizePermissionTarget(toolName: string, input: unknown) {
  const path = workspacePathForToolInput(toolName, input);
  if (path) return `${toolName} ${path}`;

  const command = inputCommand(input);
  if (command) return `${toolName} ${command}`;

  const url = inputUrl(input);
  if (url) return `${toolName} ${url}`;

  return toolName;
}

function truncatePreview(value: string, maxLength = 600) {
  const normalized = value.replace(/\r\n/g, '\n').trimEnd();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 32)}\n[preview truncated ${normalized.length - maxLength + 32} chars]`;
}

export function summarizePermissionPreview(
  toolName: string,
  input: unknown,
  summary = summarizePermissionTarget(toolName, input),
) {
  const path = inputPath(input);
  const command = inputCommand(input);
  const content = inputString(input, 'content');
  const oldText = inputString(input, 'oldText');
  const newText = inputString(input, 'newText');

  if (toolName === 'write' && path && content !== undefined) {
    return [summary, `contentLength=${content.length}`, 'content:', truncatePreview(content)].join('\n');
  }

  if ((toolName === 'edit' || toolName === 'patch') && path) {
    return [
      summary,
      oldText !== undefined ? `oldText=${truncatePreview(oldText, 240)}` : undefined,
      newText !== undefined ? `newText=${truncatePreview(newText, 240)}` : undefined,
    ]
      .filter((line): line is string => line !== undefined)
      .join('\n');
  }

  if (toolName === 'diff' && path && content !== undefined) {
    return [summary, `proposedLength=${content.length}`, 'proposed:', truncatePreview(content)].join('\n');
  }

  if (toolName === 'shell' && command) {
    return `command=${truncatePreview(command, 600)}`;
  }

  return summary;
}

function permissionDecision(
  status: PermissionStatus,
  reason: string,
  riskLevel: PermissionRiskLevel,
  summary: string,
  hardDeny = false,
  preview = summary,
): PermissionDecision {
  return {
    status,
    reason,
    riskLevel,
    audit: {
      summary,
      preview,
      hardDeny,
    },
  };
}

function inferredRisk(isReadOnly: boolean): PermissionRiskLevel {
  return isReadOnly ? 'low' : 'medium';
}

function applyPathRules(
  request: PermissionRequest,
  path: string,
  summary: string,
  preview: string,
): PermissionDecision | undefined {
  const rules = request.pathRules ?? [];
  if (rules.length === 0) return undefined;

  const resolvedPath = resolveWorkspacePath(request.workspaceRoot, path);
  const denyRule = rules.find((rule) => {
    if (rule.action !== 'deny') return false;
    const resolvedRulePath = resolveWorkspacePath(request.workspaceRoot, rule.path);
    return isPathInside(resolvedRulePath, resolvedPath);
  });
  if (denyRule) {
    return permissionDecision(
      'deny',
      denyRule.reason ?? `Path is denied by permission path rules: ${path}`,
      'high',
      summary,
      true,
      preview,
    );
  }

  const allowRules = rules.filter((rule) => rule.action === 'allow');
  if (allowRules.length === 0) return undefined;

  const allowed = allowRules.some((rule) => {
    const resolvedRulePath = resolveWorkspacePath(request.workspaceRoot, rule.path);
    return isPathInside(resolvedRulePath, resolvedPath);
  });
  if (!allowed) {
    return permissionDecision(
      'deny',
      `Path is not allowed by permission path rules: ${path}`,
      'high',
      summary,
      true,
      preview,
    );
  }

  return undefined;
}

function applyToolPolicy(
  policy: ToolPolicyConfig | undefined,
  isReadOnly: boolean,
  summary: string,
  preview: string,
): PermissionDecision | undefined {
  if (!policy) return undefined;

  if (policy.action === 'allow') {
    return permissionDecision(
      'allow',
      policy.reason ?? 'Tool allowed by explicit permission policy.',
      policy.riskLevel ?? inferredRisk(isReadOnly),
      summary,
      false,
      preview,
    );
  }

  if (policy.action === 'ask') {
    return permissionDecision(
      'ask',
      policy.reason ?? 'User approval required by explicit permission policy.',
      policy.riskLevel ?? inferredRisk(isReadOnly),
      summary,
      false,
      preview,
    );
  }

  return permissionDecision(
    'deny',
    policy.reason ?? 'Tool denied by explicit permission policy.',
    policy.riskLevel ?? 'high',
    summary,
    false,
    preview,
  );
}

export function evaluatePermission(request: PermissionRequest): PermissionDecision {
  const summary = summarizePermissionTarget(request.toolName, request.input);
  const preview = summarizePermissionPreview(request.toolName, request.input, summary);

  if (request.blockedTools?.includes(request.toolName)) {
    return permissionDecision(
      'deny',
      `Tool is blocked by permission policy: ${request.toolName}`,
      'high',
      summary,
      true,
      preview,
    );
  }

  const workspacePath = workspacePathForToolInput(request.toolName, request.input);
  if (touchesWorkspacePath(request.toolName) || workspacePath !== undefined) {
    const path = workspacePath;
    if (!path) {
      return permissionDecision(
        'deny',
        `Tool requires a workspace path: ${request.toolName}`,
        'high',
        summary,
        true,
        preview,
      );
    }

    const resolved = resolveWorkspacePath(request.workspaceRoot, path);
    if (!isPathInside(request.workspaceRoot, resolved)) {
      return permissionDecision('deny', `Path is outside the workspace: ${path}`, 'high', summary, true, preview);
    }

    const pathRuleDecision = applyPathRules(request, path, summary, preview);
    if (pathRuleDecision) return pathRuleDecision;
  }

  if (request.toolName === 'shell') {
    const command = inputCommand(request.input) ?? '';
    if (isDestructiveShellCommand(command)) {
      return permissionDecision('deny', 'Destructive shell command blocked.', 'high', summary, true, preview);
    }

    const outsidePath = findShellCommandOutsideWorkspacePath(command, request.workspaceRoot);
    if (outsidePath) {
      return permissionDecision(
        'deny',
        `Shell command writes outside the workspace: ${outsidePath}`,
        'high',
        summary,
        true,
        preview,
      );
    }
  }

  const toolPolicyDecision = applyToolPolicy(
    request.toolPolicies?.[request.toolName],
    request.isReadOnly,
    summary,
    preview,
  );
  if (toolPolicyDecision) return toolPolicyDecision;

  if (alwaysAllowedPathlessTools.has(request.toolName)) {
    return permissionDecision('allow', 'Low-risk tool allowed.', 'low', summary, false, preview);
  }

  if (request.approvalMode === 'readonly' && !request.isReadOnly) {
    return permissionDecision('deny', 'Readonly mode blocks modifying tools.', 'high', summary, true, preview);
  }

  if (request.toolName === 'memory') {
    return permissionDecision(
      'allow',
      'Memory tool writes only to agent memory state.',
      'low',
      summary,
      false,
      preview,
    );
  }

  if (request.toolName === 'shell') {
    const command = inputCommand(request.input) ?? '';

    if (request.isReadOnly) {
      return permissionDecision('allow', 'Read-only tool allowed.', 'low', summary, false, preview);
    }

    if (request.approvalMode === 'auto' && isLowRiskShellCommand(command)) {
      return permissionDecision('allow', 'Auto mode allowed low-risk shell command.', 'low', summary, false, preview);
    }

    return permissionDecision('ask', 'User approval required for shell command.', 'medium', summary, false, preview);
  }

  if (request.isReadOnly) {
    return permissionDecision('allow', 'Read-only tool allowed.', 'low', summary, false, preview);
  }

  if (request.approvalMode === 'auto') {
    return permissionDecision('allow', 'Auto mode allowed low-risk modifying tool.', 'medium', summary, false, preview);
  }

  return permissionDecision('ask', 'User approval required for modifying tool.', 'medium', summary, false, preview);
}

export function filterToolsForApprovalMode(toolNames: string[], approvalMode: ApprovalMode) {
  if (approvalMode !== 'readonly') return toolNames;
  return toolNames.filter((name) => name !== 'write' && name !== 'edit' && name !== 'patch' && name !== 'shell');
}

export { isDestructiveShellCommand, isLowRiskShellCommand };
