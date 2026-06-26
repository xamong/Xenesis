import type { DeskBridgeCapabilityCallResult, DeskBridgeCapabilityPermission } from './deskBridgeCapabilities';

export interface DeskBridgeWorkflowStepInput {
  path?: unknown;
  args?: unknown;
  approved?: unknown;
  label?: unknown;
  optional?: unknown;
}

export interface DeskBridgeWorkflowInput {
  name?: unknown;
  description?: unknown;
  delayMs?: unknown;
  stopOnFail?: unknown;
  steps?: unknown;
}

export interface DeskBridgeWorkflowRegistryEntry {
  path: string;
  permission?: DeskBridgeCapabilityPermission;
}

export interface DeskBridgeWorkflowPreviewOptions {
  registry?: DeskBridgeWorkflowRegistryEntry[];
  defaultDelayMs?: number;
  maxSteps?: number;
}

export interface DeskBridgeWorkflowNormalizedStep {
  index: number;
  path: string;
  args: Record<string, unknown>;
  approved: boolean;
  optional: boolean;
  label: string;
  permission: DeskBridgeCapabilityPermission;
}

export interface DeskBridgeWorkflowRejectedStep {
  index: number;
  path: string;
  reason: string;
}

export interface DeskBridgeWorkflowPreview {
  ok: boolean;
  name: string;
  description: string;
  delayMs: number;
  stopOnFail: boolean;
  steps: DeskBridgeWorkflowNormalizedStep[];
  rejectedSteps: DeskBridgeWorkflowRejectedStep[];
}

export interface DeskBridgeWorkflowStepResult {
  index: number;
  path: string;
  label: string;
  ok: boolean;
  skipped?: boolean;
  optional?: boolean;
  error?: string;
  result?: unknown;
  elapsedMs: number;
}

export interface DeskBridgeWorkflowRunResult extends DeskBridgeWorkflowPreview {
  completed: number;
  passed: number;
  failed: number;
  skipped: number;
  elapsedMs: number;
  results: DeskBridgeWorkflowStepResult[];
}

export interface DeskBridgeWorkflowRunner {
  execute: (step: DeskBridgeWorkflowNormalizedStep) => Promise<DeskBridgeCapabilityCallResult | unknown>;
  delay?: (ms: number) => Promise<void>;
  registry?: DeskBridgeWorkflowRegistryEntry[];
}

const defaultMaxSteps = 100;

const defaultRegistry: DeskBridgeWorkflowRegistryEntry[] = [
  { path: 'xd.app.status', permission: 'read' },
  { path: 'xd.dock.panes.list', permission: 'read' },
  { path: 'xd.dock.focus', permission: 'control' },
  { path: 'xd.dock.close', permission: 'control' },
  { path: 'xd.dock.closeAll', permission: 'control' },
  { path: 'xd.dock.move', permission: 'control' },
  { path: 'xd.dock.pane.arrange', permission: 'control' },
  { path: 'xd.dock.pane.merge', permission: 'control' },
  { path: 'xd.dock.pane.size.set', permission: 'control' },
  { path: 'xd.dock.sizes.set', permission: 'control' },
  { path: 'xd.views.open', permission: 'control' },
  { path: 'xd.panes.settings.open', permission: 'control' },
  { path: 'xd.panes.browser.open', permission: 'control' },
  { path: 'xd.capture.deleteAll', permission: 'danger' },
  { path: 'xd.meta.snapshot.import', permission: 'write' },
];

const blockedWorkflowPaths = new Set([
  'xd.automation.workflow.run',
  'xd.automation.workflow.preview',
  'xd.capture.deleteAll',
  'xd.meta.snapshot.import',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeWorkflowText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() || fallback : fallback;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number, minimum = 0): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum) return fallback;
  return Math.trunc(parsed);
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (/^(?:1|true|yes|on)$/i.test(value.trim())) return true;
    if (/^(?:0|false|no|off)$/i.test(value.trim())) return false;
  }
  return fallback;
}

function buildRegistryMap(
  registry: DeskBridgeWorkflowRegistryEntry[] | undefined,
): Map<string, DeskBridgeWorkflowRegistryEntry> {
  const entries = registry && registry.length > 0 ? registry : defaultRegistry;
  return new Map(entries.map((entry) => [entry.path, entry]));
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeStepArgs(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (!isRecord(value)) return {};
  return value;
}

function rejectionForStep(path: string, entry: DeskBridgeWorkflowRegistryEntry | undefined): string {
  if (!entry) return 'Capability is not registered.';
  if (blockedWorkflowPaths.has(path) || entry.permission === 'danger' || entry.permission === 'write') {
    return 'Capability is not allowed in Xenesis Agent workflows.';
  }
  return '';
}

function resultOk(value: unknown): boolean {
  if (isRecord(value) && typeof value.ok === 'boolean') return value.ok;
  return true;
}

function resultError(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const error = value.error ?? value.message;
  return typeof error === 'string' && error.trim() ? error.trim() : undefined;
}

export function buildDeskBridgeWorkflowPreview(
  input: DeskBridgeWorkflowInput | Record<string, unknown>,
  options: DeskBridgeWorkflowPreviewOptions = {},
): DeskBridgeWorkflowPreview {
  const source = isRecord(input) ? input : {};
  const rawSteps = Array.isArray(source.steps) ? source.steps : [];
  const maxSteps = normalizeNonNegativeInteger(options.maxSteps, defaultMaxSteps, 1);
  const registry = buildRegistryMap(options.registry);
  const steps: DeskBridgeWorkflowNormalizedStep[] = [];
  const rejectedSteps: DeskBridgeWorkflowRejectedStep[] = [];

  if (rawSteps.length === 0) {
    rejectedSteps.push({ index: 0, path: '', reason: 'Workflow must include at least one step.' });
  }

  for (const [index, rawStep] of rawSteps.slice(0, maxSteps).entries()) {
    const step = isRecord(rawStep) ? (rawStep as DeskBridgeWorkflowStepInput) : {};
    const path = normalizeWorkflowText(step.path);
    if (!path) {
      rejectedSteps.push({ index, path: '', reason: 'Capability path is required.' });
      continue;
    }
    const entry = registry.get(path);
    const rejectedReason = rejectionForStep(path, entry);
    if (rejectedReason) {
      rejectedSteps.push({ index, path, reason: rejectedReason });
      continue;
    }
    const permission = entry?.permission ?? 'control';
    steps.push({
      index,
      path,
      args: normalizeStepArgs(step.args),
      approved: typeof step.approved === 'boolean' ? step.approved : permission !== 'read',
      optional: normalizeBoolean(step.optional, false),
      label: normalizeWorkflowText(step.label, path),
      permission,
    });
  }

  if (rawSteps.length > maxSteps) {
    rejectedSteps.push({
      index: maxSteps,
      path: '',
      reason: `Workflow step limit exceeded. Max steps: ${maxSteps}.`,
    });
  }

  return {
    ok: rejectedSteps.length === 0,
    name: normalizeWorkflowText(source.name, 'desk-workflow'),
    description: normalizeWorkflowText(source.description),
    delayMs: normalizeNonNegativeInteger(source.delayMs, options.defaultDelayMs ?? 0, 0),
    stopOnFail: normalizeBoolean(source.stopOnFail, true),
    steps,
    rejectedSteps,
  };
}

export async function runDeskBridgeWorkflow(
  input: DeskBridgeWorkflowInput | Record<string, unknown>,
  runner: DeskBridgeWorkflowRunner,
): Promise<DeskBridgeWorkflowRunResult> {
  const startedAt = Date.now();
  const preview = buildDeskBridgeWorkflowPreview(input, { registry: runner.registry });
  const delay = runner.delay ?? defaultDelay;
  const results: DeskBridgeWorkflowStepResult[] = [];
  let blockedByFailure = false;

  if (!preview.ok) {
    return {
      ...preview,
      completed: 0,
      passed: 0,
      failed: preview.rejectedSteps.length,
      skipped: preview.steps.length,
      elapsedMs: Date.now() - startedAt,
      results: preview.steps.map((step) => ({
        index: step.index,
        path: step.path,
        label: step.label,
        ok: false,
        skipped: true,
        error: 'Skipped because workflow preview has rejected steps.',
        elapsedMs: 0,
      })),
    };
  }

  for (const step of preview.steps) {
    if (blockedByFailure) {
      results.push({
        index: step.index,
        path: step.path,
        label: step.label,
        ok: false,
        skipped: true,
        optional: step.optional,
        error: 'Skipped after previous workflow failure.',
        elapsedMs: 0,
      });
      continue;
    }

    const stepStartedAt = Date.now();
    try {
      const result = await runner.execute(step);
      const ok = resultOk(result);
      const error = resultError(result);
      results.push({
        index: step.index,
        path: step.path,
        label: step.label,
        ok,
        optional: step.optional,
        error,
        result,
        elapsedMs: Date.now() - stepStartedAt,
      });
      if (!ok && !step.optional && preview.stopOnFail) {
        blockedByFailure = true;
      }
    } catch (error) {
      results.push({
        index: step.index,
        path: step.path,
        label: step.label,
        ok: false,
        optional: step.optional,
        error: error instanceof Error ? error.message : String(error),
        elapsedMs: Date.now() - stepStartedAt,
      });
      if (!step.optional && preview.stopOnFail) {
        blockedByFailure = true;
      }
    }

    if (!blockedByFailure && preview.delayMs > 0) {
      await delay(preview.delayMs);
    }
  }

  const failed = results.filter((item) => !item.ok && !item.skipped).length;
  const skipped = results.filter((item) => item.skipped).length;
  const passed = results.filter((item) => item.ok).length;
  return {
    ...preview,
    ok: preview.ok && failed === 0,
    completed: results.length - skipped,
    passed,
    failed,
    skipped,
    elapsedMs: Date.now() - startedAt,
    results,
  };
}
