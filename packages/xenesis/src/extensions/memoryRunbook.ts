import type { MemoryRunbook, MemoryRunbookPermissionLevel } from './memoryTypes.js';
import type { MemoryInput } from './types.js';

const PERMISSION_LEVELS = new Set<MemoryRunbookPermissionLevel>([
  'read',
  'draft',
  'suggest',
  'execute_requires_approval',
]);

export type MemoryRunbookInput = Partial<MemoryRunbook> & Pick<MemoryRunbook, 'trigger' | 'steps'>;

export interface CreateRunbookMemoryInputOptions {
  id: string;
  runbook: MemoryRunbookInput;
  text?: string;
  tags?: string[];
  priority?: number;
  source?: string;
  validFrom?: string;
  validTo?: string;
}

function normalizeList(values: readonly string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function assertIsoDate(value: string | undefined, field: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(Date.parse(value))) throw new Error(`Invalid runbook ${field}: ${value}`);
}

export function normalizeMemoryRunbook(input: MemoryRunbookInput): MemoryRunbook {
  const permissionLevel = input.permissionLevel ?? 'draft';
  const runbook: MemoryRunbook = {
    trigger: input.trigger.trim(),
    steps: normalizeList(input.steps),
    preferredFormat: normalizeList(input.preferredFormat),
    evidenceRequired: normalizeList(input.evidenceRequired),
    permissionLevel,
    ...(input.lastUsedAt ? { lastUsedAt: input.lastUsedAt } : {}),
    ...(input.validFrom ? { validFrom: input.validFrom } : {}),
    ...(input.validTo ? { validTo: input.validTo } : {}),
  };
  assertValidMemoryRunbook(runbook);
  return runbook;
}

export function assertValidMemoryRunbook(runbook: MemoryRunbook): void {
  if (!runbook.trigger.trim()) throw new Error('Invalid runbook: trigger must be non-empty');
  if (!Array.isArray(runbook.steps) || runbook.steps.map((step) => step.trim()).filter(Boolean).length === 0) {
    throw new Error('Invalid runbook: steps must include at least one step');
  }
  if (!PERMISSION_LEVELS.has(runbook.permissionLevel)) {
    throw new Error(`Invalid runbook: unsupported permissionLevel ${runbook.permissionLevel}`);
  }
  assertIsoDate(runbook.lastUsedAt, 'lastUsedAt');
  assertIsoDate(runbook.validFrom, 'validFrom');
  assertIsoDate(runbook.validTo, 'validTo');
  if (runbook.validFrom && runbook.validTo && Date.parse(runbook.validTo) <= Date.parse(runbook.validFrom)) {
    throw new Error('Invalid runbook: validTo must be after validFrom');
  }
}

export function isProcedureMemoryInput(input: MemoryInput): boolean {
  return input.kind === 'procedure' || input.runbook !== undefined;
}

export function validateMemoryRunbookInput(input: MemoryInput): MemoryInput {
  if (!isProcedureMemoryInput(input)) return input;
  if (!input.runbook) throw new Error('Invalid runbook memory: procedure memories require runbook');
  const runbook = normalizeMemoryRunbook({
    ...input.runbook,
    validFrom: input.runbook.validFrom ?? input.validFrom,
    validTo: input.runbook.validTo ?? input.validTo,
  });
  return {
    ...input,
    kind: 'procedure',
    runbook,
    validFrom: input.validFrom ?? runbook.validFrom,
    validTo: input.validTo ?? runbook.validTo,
  };
}

export function memoryRunbookSearchText(input: Pick<MemoryInput, 'runbook'>): string {
  const runbook = input.runbook;
  if (!runbook) return '';
  return [
    runbook.trigger,
    ...runbook.steps,
    ...runbook.preferredFormat,
    ...runbook.evidenceRequired,
    runbook.permissionLevel,
  ].join(' ');
}

export function runbooksEquivalent(left: MemoryRunbook | undefined, right: MemoryRunbook | undefined): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return JSON.stringify(normalizeMemoryRunbook(left)) === JSON.stringify(normalizeMemoryRunbook(right));
}

export function createRunbookMemoryInput(options: CreateRunbookMemoryInputOptions): MemoryInput {
  const runbook = normalizeMemoryRunbook({
    ...options.runbook,
    validFrom: options.runbook.validFrom ?? options.validFrom,
    validTo: options.runbook.validTo ?? options.validTo,
  });
  const tags = Array.from(new Set(['procedure', 'runbook', ...(options.tags ?? [])]));
  const text =
    options.text ??
    [`Procedure runbook: ${runbook.trigger}`, ...runbook.steps.map((step, index) => `${index + 1}. ${step}`)].join(
      '\n',
    );
  return {
    id: options.id,
    text,
    tags,
    kind: 'procedure',
    runbook,
    ...(options.priority !== undefined ? { priority: options.priority } : {}),
    ...(options.source ? { source: options.source } : {}),
    ...((options.validFrom ?? runbook.validFrom) ? { validFrom: options.validFrom ?? runbook.validFrom } : {}),
    ...((options.validTo ?? runbook.validTo) ? { validTo: options.validTo ?? runbook.validTo } : {}),
  };
}

export function canRunbookExecuteWithoutApproval(_runbook: MemoryRunbook | undefined): boolean {
  return false;
}
