import type { TerminalHostSessionInfo } from '../../terminal/terminalHost';
import {
  BUILTIN_TEMPLATE_TIMESTAMP,
  createDefaultExecutionPresets,
  DEFAULT_FIXTURE,
  WORKFLOW_COMMAND_BATCH_PRESETS_KEY,
  WORKFLOW_COMMAND_TEMPLATES_KEY,
  WORKFLOW_RUNNER_PRESETS_KEY,
  WORKFLOW_TARGET_SETS_KEY,
} from './workflowRunnerConstants';
import type {
  WorkflowCommandBatchPreset,
  WorkflowCommandTemplate,
  WorkflowExecutionPreset,
  WorkflowRunScope,
  WorkflowTargetMode,
  WorkflowTargetSet,
} from './workflowRunnerTypes';

export function loadExecutionPresets(): WorkflowExecutionPreset[] {
  const defaults = createDefaultExecutionPresets();
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = window.localStorage.getItem(WORKFLOW_RUNNER_PRESETS_KEY);
    const userPresets = normalizeExecutionPresets(stored ? JSON.parse(stored) : []);
    return [...defaults, ...userPresets];
  } catch {
    return defaults;
  }
}

export function persistExecutionPresets(presets: WorkflowExecutionPreset[]): void {
  if (typeof window === 'undefined') return;
  const userPresets = presets.filter((preset) => preset.source === 'user');
  window.localStorage.setItem(WORKFLOW_RUNNER_PRESETS_KEY, JSON.stringify(userPresets));
}

export function createDefaultCommandTemplates(): WorkflowCommandTemplate[] {
  const createdAt = BUILTIN_TEMPLATE_TIMESTAMP;
  return [
    {
      id: 'builtin-pwd',
      label: 'Print working directory',
      command: 'pwd',
      category: 'Navigation',
      source: 'builtin',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'builtin-list',
      label: 'List files',
      command: 'ls -la',
      category: 'Navigation',
      source: 'builtin',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'builtin-disk',
      label: 'Disk usage',
      command: 'df -h',
      category: 'System',
      source: 'builtin',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'builtin-user',
      label: 'Current user',
      command: 'whoami',
      category: 'Identity',
      source: 'builtin',
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export function loadCommandTemplates(): WorkflowCommandTemplate[] {
  const defaults = createDefaultCommandTemplates();
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = window.localStorage.getItem(WORKFLOW_COMMAND_TEMPLATES_KEY);
    const userTemplates = normalizeCommandTemplates(stored ? JSON.parse(stored) : []);
    return [...defaults, ...userTemplates].sort((left, right) => {
      if (left.source !== right.source) return left.source === 'builtin' ? -1 : 1;
      const leftUsed = Date.parse(left.lastUsedAt ?? left.updatedAt);
      const rightUsed = Date.parse(right.lastUsedAt ?? right.updatedAt);
      if (leftUsed !== rightUsed) return rightUsed - leftUsed;
      return left.label.localeCompare(right.label);
    });
  } catch {
    return defaults;
  }
}

export function persistCommandTemplates(templates: WorkflowCommandTemplate[]): void {
  if (typeof window === 'undefined') return;
  const userTemplates = templates.filter((template) => template.source === 'user');
  window.localStorage.setItem(WORKFLOW_COMMAND_TEMPLATES_KEY, JSON.stringify(userTemplates));
}

export function createDefaultCommandBatchPresets(): WorkflowCommandBatchPreset[] {
  const createdAt = BUILTIN_TEMPLATE_TIMESTAMP;
  return [
    {
      id: 'builtin-linux-inventory',
      label: 'Linux inventory basics',
      commands: 'hostname\nuname -a\ndf -h\nfree -m',
      source: 'builtin',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'builtin-network-check',
      label: 'Network check',
      commands: 'ip addr\nip route\nnetstat -tulpen',
      source: 'builtin',
      createdAt,
      updatedAt: createdAt,
    },
  ];
}

export function loadCommandBatchPresets(): WorkflowCommandBatchPreset[] {
  const defaults = createDefaultCommandBatchPresets();
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = window.localStorage.getItem(WORKFLOW_COMMAND_BATCH_PRESETS_KEY);
    return sortCommandBatchPresets([...defaults, ...normalizeCommandBatchPresets(stored ? JSON.parse(stored) : [])]);
  } catch {
    return defaults;
  }
}

export function persistCommandBatchPresets(presets: WorkflowCommandBatchPreset[]): void {
  if (typeof window === 'undefined') return;
  const userPresets = presets.filter((preset) => preset.source === 'user');
  window.localStorage.setItem(WORKFLOW_COMMAND_BATCH_PRESETS_KEY, JSON.stringify(userPresets));
}

export function normalizeCommandBatchPresets(value: unknown): WorkflowCommandBatchPreset[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<WorkflowCommandBatchPreset> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const now = new Date().toISOString();
      return {
        id: typeof item.id === 'string' && item.id ? item.id : `user-command-batch-${Date.now()}`,
        label: typeof item.label === 'string' && item.label ? item.label : 'Saved command batch',
        commands: typeof item.commands === 'string' ? parseCommandBatch(item.commands).join('\n') : '',
        source: 'user' as const,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : now,
        ...(typeof item.lastUsedAt === 'string' ? { lastUsedAt: item.lastUsedAt } : {}),
      };
    })
    .filter((item) => item.commands.trim());
}

export function sortCommandBatchPresets(presets: WorkflowCommandBatchPreset[]): WorkflowCommandBatchPreset[] {
  return [...presets].sort((left, right) => {
    if (left.source !== right.source) return left.source === 'builtin' ? -1 : 1;
    const leftUsed = Date.parse(left.lastUsedAt ?? left.updatedAt);
    const rightUsed = Date.parse(right.lastUsedAt ?? right.updatedAt);
    if (leftUsed !== rightUsed) return rightUsed - leftUsed;
    return left.label.localeCompare(right.label);
  });
}

export function normalizeCommandTemplates(value: unknown): WorkflowCommandTemplate[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<WorkflowCommandTemplate> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const now = new Date().toISOString();
      return {
        id: typeof item.id === 'string' && item.id ? item.id : `user-command-${Date.now()}`,
        label: typeof item.label === 'string' && item.label ? item.label : 'Saved command',
        command: typeof item.command === 'string' ? item.command : '',
        category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Custom',
        source: 'user' as const,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : now,
        defaultValues:
          item.defaultValues && typeof item.defaultValues === 'object'
            ? sanitizeCommandTemplateValues(item.defaultValues)
            : {},
        ...(typeof item.lastUsedAt === 'string' ? { lastUsedAt: item.lastUsedAt } : {}),
      };
    })
    .filter((item) => item.command.trim());
}

export function commandTemplateCategories(templates: WorkflowCommandTemplate[]): string[] {
  return [...new Set(templates.map((template) => template.category).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function filterCommandTemplates(
  templates: WorkflowCommandTemplate[],
  query: string,
  category: string,
): WorkflowCommandTemplate[] {
  const needle = query.trim().toLocaleLowerCase();
  return templates.filter((template) => {
    if (category !== 'all' && template.category !== category) return false;
    if (!needle) return true;
    return [template.label, template.command, template.category, template.source].some((value) =>
      value.toLocaleLowerCase().includes(needle),
    );
  });
}

export function filterCommandLog(entries: string[], query: string): string[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return entries;
  return entries.filter((entry) => entry.toLocaleLowerCase().includes(needle));
}

export function parseCommandBatch(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function extractCommandTemplatePlaceholders(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g)) {
    names.add(match[1]);
  }
  return [...names];
}

export function resolveCommandTemplateText(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (token, name: string) =>
    Object.hasOwn(values, name) ? values[name] : token,
  );
}

export function sanitizeCommandTemplateValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const sanitized: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (/^[A-Za-z0-9_.-]+$/.test(key)) sanitized[key] = String(item ?? '');
  }
  return sanitized;
}

export function pickCommandTemplateValues(text: string, values: Record<string, string>): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const name of extractCommandTemplatePlaceholders(text)) {
    if (Object.hasOwn(values, name)) picked[name] = values[name];
  }
  return picked;
}

export function loadTargetSets(): WorkflowTargetSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(WORKFLOW_TARGET_SETS_KEY);
    return normalizeTargetSets(stored ? JSON.parse(stored) : []);
  } catch {
    return [];
  }
}

export function persistTargetSets(targetSets: WorkflowTargetSet[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WORKFLOW_TARGET_SETS_KEY, JSON.stringify(targetSets));
}

export function normalizeTargetSets(value: unknown): WorkflowTargetSet[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<WorkflowTargetSet> => Boolean(item) && typeof item === 'object')
    .map((item) => {
      const now = new Date().toISOString();
      const sessionIds = Array.isArray(item.sessionIds)
        ? [...new Set(item.sessionIds.map(String).filter(Boolean))]
        : [];
      return {
        id: typeof item.id === 'string' && item.id ? item.id : `target-set-${Date.now()}`,
        label: typeof item.label === 'string' && item.label ? item.label : 'Saved target set',
        sessionIds,
        sessionLabels: Array.isArray(item.sessionLabels) ? item.sessionLabels.map(String).filter(Boolean) : [],
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : now,
        ...(typeof item.lastUsedAt === 'string' ? { lastUsedAt: item.lastUsedAt } : {}),
      };
    })
    .filter((item) => item.sessionIds.length)
    .sort((left, right) => {
      const leftUsed = Date.parse(left.lastUsedAt ?? left.updatedAt);
      const rightUsed = Date.parse(right.lastUsedAt ?? right.updatedAt);
      if (leftUsed !== rightUsed) return rightUsed - leftUsed;
      return left.label.localeCompare(right.label);
    });
}

export function filterTargetSets(targetSets: WorkflowTargetSet[], query: string): WorkflowTargetSet[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return targetSets;
  return targetSets.filter((targetSet) =>
    [targetSet.label, ...targetSet.sessionLabels].some((value) => value.toLocaleLowerCase().includes(needle)),
  );
}

export function resolveTargetSetSelection(targetSet: WorkflowTargetSet, sessions: TerminalHostSessionInfo[]): string[] {
  const currentSessionIds = new Set(sessions.map((session) => session.id));
  const sessionByLabel = new Map(sessions.map((session) => [session.label, session]));
  const resolved = new Set<string>();

  for (const [index, savedId] of targetSet.sessionIds.entries()) {
    if (currentSessionIds.has(savedId)) {
      resolved.add(savedId);
      continue;
    }
    const savedLabel = targetSet.sessionLabels[index];
    const fallbackSession = savedLabel ? sessionByLabel.get(savedLabel) : undefined;
    if (fallbackSession) resolved.add(fallbackSession.id);
  }

  return [...resolved];
}

export function normalizeExecutionPresets(value: unknown): WorkflowExecutionPreset[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<WorkflowExecutionPreset> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `user-${Date.now()}`,
      label: typeof item.label === 'string' && item.label ? item.label : 'Saved workflow',
      source: 'user' as const,
      workflow: typeof item.workflow === 'string' ? item.workflow : '',
      fixture: typeof item.fixture === 'string' ? item.fixture : JSON.stringify(DEFAULT_FIXTURE, null, 2),
      scope: normalizeRunScope(item.scope),
      actionId: typeof item.actionId === 'string' && item.actionId ? item.actionId : undefined,
      simulateApi: typeof item.simulateApi === 'boolean' ? item.simulateApi : true,
      sequential: typeof item.sequential === 'boolean' ? item.sequential : false,
      targetMode: normalizeTargetMode(item.targetMode),
      targetGroupId: typeof item.targetGroupId === 'string' ? item.targetGroupId : '',
      commandConcurrency: normalizeCommandConcurrency(item.commandConcurrency),
    }))
    .filter((item) => item.workflow.trim());
}

export function normalizeRunScope(value: unknown): WorkflowRunScope {
  return value === 'selected' || value === 'until' ? value : 'all';
}

export function normalizeTargetMode(value: unknown): WorkflowTargetMode {
  return value === 'active' || value === 'all' || value === 'group' || value === 'failed' ? value : 'selected';
}

export function normalizeCommandConcurrency(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 4;
  return Math.max(1, Math.min(64, Math.floor(numeric)));
}
