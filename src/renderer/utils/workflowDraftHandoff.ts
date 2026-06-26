import type { TerminalWorkBlock } from '../../shared/types';

export const WORKFLOW_DRAFT_HANDOFF_STORAGE_KEY = 'xenesis-workflow-runner-draft-handoff';
export const WORKFLOW_DRAFT_HANDOFF_EVENT = 'xenesis-workflow-runner-draft-handoff';

export interface WorkflowDraftHandoff {
  type: 'xenesis-workflow-runner-draft';
  source: 'ai-workbench-command-bundles';
  label: string;
  workflow: string;
  selectedActionId: string;
  bundleCount: number;
  commandCount: number;
  createdAt: string;
}

export function buildWorkflowDraftHandoffFromCommandBundles(commandBundles: TerminalWorkBlock[]): WorkflowDraftHandoff {
  const actionLines: string[] = [];
  const usedIds = new Set<string>();
  let selectedActionId = '';
  let commandCount = 0;

  for (const bundle of commandBundles) {
    const commands = splitCommandBundleLines(bundle.command);
    const baseId = uniqueActionBaseId(bundle.label || bundle.id || 'commandBundle');
    commands.forEach((command, index) => {
      commandCount += 1;
      const actionId = uniqueActionId(`${baseId}${index + 1}`, usedIds);
      if (!selectedActionId) selectedActionId = actionId;
      actionLines.push(
        `  ${actionId}: command ${quote(`${bundle.label || '묶음 명령'} ${index + 1}`)}`,
        `    comment ${quote(`묶음 명령: ${bundle.label || bundle.id || 'Command bundle'}`)}`,
        '    terminalId "@selected"',
        '    delay "NO"',
        '    timeout 60000',
        '    reply "YES"',
        `    command ${quote(command)}`,
        `    storeAs ${quote(`record.commandBundles.${actionId}`)}`,
      );
    });
  }

  return {
    type: 'xenesis-workflow-runner-draft',
    source: 'ai-workbench-command-bundles',
    label: 'Command bundle draft',
    workflow: ['workflow "Command bundle draft"', ...actionLines, ''].join('\n'),
    selectedActionId,
    bundleCount: commandBundles.length,
    commandCount,
    createdAt: new Date().toISOString(),
  };
}

export function parseWorkflowDraftHandoff(value: unknown): WorkflowDraftHandoff | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!isWorkflowDraftHandoff(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function consumeStoredWorkflowDraftHandoff(): WorkflowDraftHandoff | null {
  try {
    const handoff = parseWorkflowDraftHandoff(window.localStorage.getItem(WORKFLOW_DRAFT_HANDOFF_STORAGE_KEY));
    window.localStorage.removeItem(WORKFLOW_DRAFT_HANDOFF_STORAGE_KEY);
    return handoff;
  } catch {
    return null;
  }
}

function splitCommandBundleLines(command: string): string[] {
  return String(command || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniqueActionBaseId(label: string): string {
  const words = String(label || '')
    .replace(/[^A-Za-z0-9_\-\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const base = words.length
    ? words
        .map((word, index) =>
          index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join('')
    : 'commandBundle';
  const normalized = base.replace(/^[^A-Za-z_]+/, '');
  return normalized || 'commandBundle';
}

function uniqueActionId(candidate: string, usedIds: Set<string>): string {
  const safe = candidate.replace(/[^\w-]/g, '') || 'commandBundleAction';
  let next = safe;
  let suffix = 2;
  while (usedIds.has(next)) {
    next = `${safe}_${suffix}`;
    suffix += 1;
  }
  usedIds.add(next);
  return next;
}

function isWorkflowDraftHandoff(value: unknown): value is WorkflowDraftHandoff {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WorkflowDraftHandoff>;
  return (
    candidate.type === 'xenesis-workflow-runner-draft' &&
    candidate.source === 'ai-workbench-command-bundles' &&
    typeof candidate.workflow === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.selectedActionId === 'string' &&
    typeof candidate.bundleCount === 'number' &&
    typeof candidate.commandCount === 'number' &&
    typeof candidate.createdAt === 'string'
  );
}

function quote(value: string): string {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
