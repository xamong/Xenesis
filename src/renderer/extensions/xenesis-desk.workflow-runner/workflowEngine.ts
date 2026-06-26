import { evaluateSugar, isSugarExpression, renderTemplate } from '@xcon-chain/core';
import type { WorkflowAction, WorkflowDiagnostic, WorkflowDocument } from '@xcon-workflow/core';
import { parseWorkflow, validateWorkflow } from '@xcon-workflow/core';
import { getMarkdownCodeFenceInfo, scanMarkdownCodeFences } from '../../markdown/markdownCodeFences';

export type WorkflowModel = WorkflowDocument;

export interface WorkflowTraceStep {
  id: string;
  type: string;
  scope: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  output?: unknown;
  error?: string;
}

export interface WorkflowExecutionEvent {
  at: string;
  kind: string;
  actionId?: string;
  actionType?: string;
  scope?: string;
  status?: string;
  error?: string;
  [key: string]: unknown;
}

export interface WorkflowRunResult {
  success: boolean;
  workflow: WorkflowModel;
  diagnostics: { severity: 'info' | 'warn' | 'error'; path: string; message: string; code?: string }[];
  context: Record<string, unknown>;
  result: unknown;
  events: unknown[];
  executionEvents: WorkflowExecutionEvent[];
  hostUpdates: unknown[];
  trace: WorkflowTraceStep[];
}

export type WorkflowRuntimeDiagnostic = WorkflowRunResult['diagnostics'][number];

export interface WorkflowCommandRequest {
  actionId: string;
  actionType: string;
  command: string;
  terminalId: string;
  targetTermIds: string[];
  sequential: boolean;
  timeoutMs: number;
  reply: boolean;
  delay: boolean;
}

export interface WorkflowCommandResponseItem {
  terminalId: string;
  text: string;
}

export interface WorkflowCommandResponseData {
  ResultMsg: string;
  command: string;
  sent: number;
  targetTermIds: string[];
  results: WorkflowCommandResponseItem[];
  extractedValue?: string;
}

export interface WorkflowCommandResult {
  ok: boolean;
  command: string;
  sent: number;
  targetTermIds: string[];
  sequential: boolean;
  responseData?: WorkflowCommandResponseData;
  error?: string;
}

export type WorkflowFileTransferDirection = 'upload' | 'download';
export type WorkflowFileTransferOverwritePolicy = 'ask' | 'overwrite' | 'skip';

export interface WorkflowFileTransferRequest {
  actionId: string;
  actionType: string;
  direction: WorkflowFileTransferDirection;
  profileId: string;
  protocol: string;
  localPath: string;
  remotePath: string;
  fileName?: string;
  overwritePolicy: WorkflowFileTransferOverwritePolicy;
}

export interface WorkflowFileTransferResult {
  ok: boolean;
  direction: WorkflowFileTransferDirection;
  profileId: string;
  localPath: string;
  remotePath: string;
  fileName: string;
  overwritePolicy: WorkflowFileTransferOverwritePolicy;
  queueItemId?: string;
  state?: string;
  error?: string;
}

export interface WorkflowPlaywrightSnapshotRequest {
  actionId: string;
  actionType: 'playwrightSnapshot';
  url: string;
  selector?: string;
  outDir?: string;
  fileName?: string;
  fullPage?: boolean;
  headless?: boolean;
  timeoutMs?: number;
  allowedHosts?: string[];
}

export interface WorkflowPlaywrightRunRequest {
  actionId: string;
  actionType: 'playwrightRun';
  url: string;
  actions: Array<Record<string, unknown>>;
  screenshot?: boolean;
  trace?: boolean;
  screenshotSelector?: string;
  outDir?: string;
  fileName?: string;
  screenshotFileName?: string;
  traceFileName?: string;
  headless?: boolean;
  timeoutMs?: number;
  allowedHosts?: string[];
}

export interface WorkflowPlaywrightResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface WorkflowHostAdapter {
  sendCommand?(request: WorkflowCommandRequest): Promise<WorkflowCommandResult>;
  transferFile?(request: WorkflowFileTransferRequest): Promise<WorkflowFileTransferResult>;
  runPlaywrightSnapshot?(request: WorkflowPlaywrightSnapshotRequest): Promise<WorkflowPlaywrightResult>;
  runPlaywright?(request: WorkflowPlaywrightRunRequest): Promise<WorkflowPlaywrightResult>;
}

export interface WorkflowRunControl {
  isCancelled(): boolean;
  waitIfPaused(): Promise<void>;
}

interface RunnerState {
  workflow: WorkflowModel;
  failed: boolean;
  context: Record<string, unknown>;
  result: unknown;
  events: unknown[];
  executionEvents: WorkflowExecutionEvent[];
  hostUpdates: unknown[];
  trace: WorkflowTraceStep[];
  onExecutionEvent?: (event: WorkflowExecutionEvent, trace: WorkflowTraceStep[]) => void;
}

interface RunOptions {
  fixture?: Record<string, unknown>;
  simulateApi?: boolean;
  hostAdapter?: WorkflowHostAdapter;
  targetTermIds?: string[];
  sequentialCommands?: boolean;
  runActionId?: string;
  runUntilActionId?: string;
  maxSleepMs?: number;
  maxSchedulerIterations?: number;
  stopOnFailure?: boolean;
  control?: WorkflowRunControl;
  onExecutionEvent?: (event: WorkflowExecutionEvent, trace: WorkflowTraceStep[]) => void;
}

class WorkflowRunControlError extends Error {
  code = 'workflow.cancelled';

  constructor(message = 'Workflow run cancelled.') {
    super(message);
    this.name = 'WorkflowRunControlError';
  }
}

const HOST_EVENT_TYPES = new Set([
  'activity',
  'makeRoot',
  'goHome',
  'goBack',
  'start',
  'stop',
  'timeline',
  'transition',
  'mediaControl',
  'easySelect',
  'ensureVisible',
]);
const WORKFLOW_INITIALIZER_ACTION_ID_PREFIX = '__var_';

export async function runWorkflowText(input: string, options: RunOptions = {}): Promise<WorkflowRunResult> {
  const workflow = parseWorkflowText(input);
  const state = createState(workflow, options.fixture, options);
  const diagnostics = [
    ...validateWorkflow(workflow).map(normalizeDiagnostic),
    ...inspectWorkflowRuntimeReadiness(workflow),
  ];
  if (diagnostics.some((item) => item.severity === 'error')) {
    state.failed = true;
  } else {
    const actionsToRun = selectActionsForRun(workflow.actions, options);
    if (!actionsToRun.length && (options.runActionId || options.runUntilActionId)) {
      state.failed = true;
      diagnostics.push({
        severity: 'error',
        path: 'workflow.actions',
        message: `Workflow action "${options.runActionId || options.runUntilActionId}" was not found.`,
      });
    } else {
      try {
        await executeActionList(actionsToRun, state, options, executionScopeForRun(options));
      } catch (error) {
        if (!isWorkflowRunControlError(error)) throw error;
        state.failed = true;
        diagnostics.push({
          severity: 'warn',
          path: 'workflow.control',
          code: error.code,
          message: error.message,
        });
        emit(state, { kind: 'workflow:cancelled', status: 'cancelled', error: error.message });
      }
    }
  }

  return {
    success: !state.failed,
    workflow,
    diagnostics,
    context: state.context,
    result: state.result,
    events: state.events,
    executionEvents: state.executionEvents,
    hostUpdates: state.hostUpdates,
    trace: state.trace,
  };
}

export function inspectWorkflowPreflightText(input: string): WorkflowRuntimeDiagnostic[] {
  const workflow = parseWorkflowText(input);
  return [...validateWorkflow(workflow).map(normalizeDiagnostic), ...inspectWorkflowRuntimeReadiness(workflow)];
}

function selectActionsForRun(actions: WorkflowAction[], options: RunOptions): WorkflowAction[] {
  const initializerActions = actions.filter(isWorkflowInitializerAction);
  const runnableActions = collectWorkflowActions(actions).filter((action) => !isWorkflowInitializerAction(action));
  if (options.runActionId) {
    const selectedAction = runnableActions.find((action) => action.id === options.runActionId);
    return [...initializerActions, ...(selectedAction ? [selectedAction] : [])];
  }
  if (options.runUntilActionId) {
    const untilIndex = runnableActions.findIndex((action) => action.id === options.runUntilActionId);
    return untilIndex >= 0 ? [...initializerActions, ...runnableActions.slice(0, untilIndex + 1)] : [];
  }
  return actions;
}

function isWorkflowInitializerAction(action: WorkflowAction): boolean {
  return action.id.startsWith(WORKFLOW_INITIALIZER_ACTION_ID_PREFIX) && action.type === 'saveData';
}

function executionScopeForRun(options: RunOptions): string {
  if (options.runActionId) return 'workflow.selected';
  if (options.runUntilActionId) return 'workflow.until';
  return 'workflow';
}

export function parseWorkflowText(input: string): WorkflowModel {
  const source = extractWorkflowSource(input);
  return parseWorkflow(source);
}

function extractWorkflowSource(input: string): string {
  const source = String(input || '');
  const fence = scanMarkdownCodeFences(source).find((item) => {
    const { lang } = getMarkdownCodeFenceInfo(item.info);
    return !lang || lang === 'xcon-workflow' || lang === 'workflow' || lang === 'xcon';
  });
  return fence?.code ?? source;
}

function normalizeDiagnostic(diagnostic: WorkflowDiagnostic): WorkflowRunResult['diagnostics'][number] {
  return {
    severity: diagnostic.severity === 'warning' ? 'warn' : diagnostic.severity,
    code: diagnostic.code,
    path: diagnostic.path,
    message: diagnostic.message,
  };
}

function inspectWorkflowRuntimeReadiness(workflow: WorkflowModel): WorkflowRuntimeDiagnostic[] {
  const diagnostics: WorkflowRuntimeDiagnostic[] = [];
  for (const action of collectWorkflowActions(workflow.actions)) {
    inspectActionRuntimeReadiness(action, diagnostics);
  }
  return diagnostics;
}

function collectWorkflowActions(actions: WorkflowAction[]): WorkflowAction[] {
  const collected: WorkflowAction[] = [];
  const visit = (action: WorkflowAction) => {
    collected.push(action);
    for (const child of [...action.actions, ...action.success, ...action.failure, ...action.catch, ...action.finally])
      visit(child);
  };
  for (const action of actions) visit(action);
  return collected;
}

function inspectActionRuntimeReadiness(action: WorkflowAction, diagnostics: WorkflowRuntimeDiagnostic[]): void {
  const path = `workflow.actions.${action.id || action.type}`;
  if (action.type === 'command' || action.type === 'shell') {
    const command = String(getProp(action, 'command') ?? '').trim();
    if (!command && Object.hasOwn(action.props, 'command')) {
      diagnostics.push({
        severity: 'warn',
        path: `${path}.command`,
        code: 'preflight.command.empty',
        message: `Command action "${action.id}" has no command.`,
      });
    }
    const extractPattern = String(getProp(action, 'extractPattern') ?? '').trim();
    if (extractPattern && !isValidRegex(extractPattern)) {
      diagnostics.push({
        severity: 'warn',
        path: `${path}.extractPattern`,
        code: 'preflight.command.extractPattern',
        message: `Invalid extractPattern regex in action "${action.id}".`,
      });
    }
    const storeAs = String(getProp(action, 'storeAs') ?? '').trim();
    if (extractPattern && !storeAs) {
      diagnostics.push({
        severity: 'warn',
        path: `${path}.storeAs`,
        code: 'preflight.command.storeAs',
        message: `Command action "${action.id}" extracts a response but has an empty storeAs target.`,
      });
    }
  }

  if (action.type === 'fileTransfer') {
    for (const key of ['profileId', 'localPath', 'remotePath']) {
      const value = String(getProp(action, key) ?? '').trim();
      if (!value) {
        diagnostics.push({
          severity: 'warn',
          path: `${path}.${key}`,
          code: `preflight.fileTransfer.${key}`,
          message: `FileTransfer action "${action.id}" is missing ${key}.`,
        });
      }
    }
  }

  if (action.type === 'playwrightSnapshot' || action.type === 'playwrightRun') {
    const url = String(getProp(action, 'url') ?? '').trim();
    if (!url) {
      diagnostics.push({
        severity: 'warn',
        path: `${path}.url`,
        code: 'preflight.playwright.url',
        message: `Playwright action "${action.id}" has no URL.`,
      });
    } else if (!url.startsWith('=') && !url.includes('{{') && !isHttpUrl(url)) {
      diagnostics.push({
        severity: 'warn',
        path: `${path}.url`,
        code: 'preflight.playwright.url',
        message: `Playwright action "${action.id}" URL should be an absolute http/https URL.`,
      });
    }

    if (action.type === 'playwrightRun') {
      const actions = String(getProp(action, 'actions') ?? '').trim();
      if (!actions) {
        diagnostics.push({
          severity: 'warn',
          path: `${path}.actions`,
          code: 'preflight.playwright.actions',
          message: `PlaywrightRun action "${action.id}" has no action list.`,
        });
      } else if (!actions.startsWith('=') && !actions.includes('{{') && !isJsonArrayText(actions)) {
        diagnostics.push({
          severity: 'warn',
          path: `${path}.actions`,
          code: 'preflight.playwright.actions',
          message: `PlaywrightRun action "${action.id}" actions should be a JSON array or expression.`,
        });
      }
    }
  }

  const conditionOperator = String(getProp(action, 'operator') ?? '')
    .trim()
    .toLowerCase();
  if (
    (conditionOperator === 'matches' || conditionOperator === 'notmatches') &&
    !isValidRegex(String(getProp(action, 'right') ?? ''))
  ) {
    diagnostics.push({
      severity: 'warn',
      path: `${path}.right`,
      code: 'preflight.condition.regex',
      message: `Invalid condition regex in action "${action.id}".`,
    });
  }

  for (const reference of collectWorkflowVariableReferences(action)) {
    const root = reference.split(/[.[]/, 1)[0];
    if (!KNOWN_CONTEXT_ROOTS.has(root)) {
      diagnostics.push({
        severity: 'warn',
        path,
        code: 'preflight.variable.root',
        message: `Unknown context root "${root}" referenced by action "${action.id}".`,
      });
    }
  }
}

const KNOWN_CONTEXT_ROOTS = new Set([
  'record',
  'parameter',
  'global',
  'local',
  'self',
  'item',
  'index',
  'result',
  'lastValue',
  'lastExtractedValue',
  'lastCommandResponse',
  'lastPlaywrightResult',
  'error',
]);

function collectWorkflowVariableReferences(action: WorkflowAction): string[] {
  const refs = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === 'string') collectVariableReferencesFromText(value, refs);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (isPlainObject(value)) Object.values(value).forEach(visit);
  };
  visit(action.label);
  visit(action.props);
  return Array.from(refs);
}

function collectVariableReferencesFromText(text: string, refs: Set<string>): void {
  for (const match of text.matchAll(/\{\{\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[\d+\])*)/g)) {
    refs.add(match[1]);
  }
  if (text.trim().startsWith('=')) {
    for (const match of text.matchAll(/(?:^|[^\w$])([A-Za-z_$][\w$]*)\s*\./g)) {
      refs.add(match[1]);
    }
  }
}

function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isJsonArrayText(value: string): boolean {
  try {
    return Array.isArray(JSON.parse(value));
  } catch {
    return false;
  }
}

function createState(
  workflow: WorkflowModel,
  fixture: Record<string, unknown> = {},
  options: RunOptions = {},
): RunnerState {
  const seed = clone(fixture);
  return {
    workflow,
    failed: false,
    result: undefined,
    trace: [],
    events: [],
    executionEvents: [],
    hostUpdates: [],
    onExecutionEvent: options.onExecutionEvent,
    context: {
      record: {},
      parameter: {},
      global: {},
      local: {},
      self: {},
      ...seed,
    },
  };
}

async function executeActionList(
  actions: WorkflowAction[],
  state: RunnerState,
  options: RunOptions,
  scope: string,
): Promise<unknown[]> {
  const ordered = orderByDependencies(actions);
  const results: unknown[] = [];
  for (const action of ordered) {
    await checkpointWorkflowRunControl(options);
    const result = await executeAction(action, state, options, scope);
    results.push(result);
    if (isPlainObject(result) && result.ok === false && options.stopOnFailure !== false && !action.failure.length) {
      state.failed = true;
      break;
    }
  }
  return results;
}

async function executeAction(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
  scope: string,
): Promise<Record<string, unknown>> {
  await checkpointWorkflowRunControl(options);
  const step: WorkflowTraceStep = {
    id: action.id,
    type: action.type,
    scope,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
  state.trace.push(step);
  emit(state, { kind: 'action:start', actionId: action.id, actionType: action.type, scope });
  try {
    const output = await performAction(action, state, options, scope);
    step.status = output.ok === false ? 'failed' : 'completed';
    step.output = clone(output);
    emit(state, {
      kind: output.ok === false ? 'action:fail' : 'action:end',
      actionId: action.id,
      actionType: action.type,
      scope,
      status: step.status,
      output: compactOutput(output),
    });
    if (output.ok === false && action.failure.length) {
      await executeActionList(action.failure, state, options, `${action.id}.failure`);
    } else if (output.ok !== false && action.success.length) {
      await executeActionList(action.success, state, options, `${action.id}.success`);
    }
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    step.status = 'failed';
    step.error = message;
    emit(state, { kind: 'action:error', actionId: action.id, actionType: action.type, scope, error: message });
    if (action.catch.length) {
      state.context.error = { message };
      await executeActionList(action.catch, state, options, `${action.id}.catch`);
      return { ok: false, caught: true, error: message };
    }
    throw error;
  } finally {
    if (action.finally.length) await executeActionList(action.finally, state, options, `${action.id}.finally`);
    step.endedAt = new Date().toISOString();
    step.durationMs = Math.max(0, Date.parse(step.endedAt) - Date.parse(step.startedAt));
  }
}

async function performAction(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
  scope: string,
): Promise<Record<string, unknown>> {
  switch (action.type) {
    case 'batch':
      return runBatch(action, state, options);
    case 'workqueue':
    case 'queue':
      return runWorkQueue(action, state, options);
    case 'scheduler':
    case 'schedule':
      return runScheduler(action, state, options);
    case 'condition':
    case 'select':
      return runCondition(action, state, options);
    case 'loop':
      return runLoop(action, state, options);
    case 'sleep':
      return runSleep(action, options);
    case 'chain':
    case 'formula':
      return runExpression(action, state);
    case 'saveData':
      return runSaveData(action, state);
    case 'setObjectValues':
    case 'setNewData':
    case 'createComponents':
      return runHostUpdate(action, state);
    case 'callApi':
      return runCallApi(action, state, options);
    case 'playwrightSnapshot':
      return runPlaywrightSnapshotAction(action, state, options);
    case 'playwrightRun':
      return runPlaywrightRunAction(action, state, options);
    case 'command':
    case 'shell':
      return runCommandAction(action, state, options);
    case 'fileTransfer':
      return runFileTransferAction(action, state, options);
    case 'note':
    case 'log':
    case 'toast':
    case 'alert':
    case 'sound':
      return runFeedback(action, state);
    default:
      if (HOST_EVENT_TYPES.has(action.type)) return runHostEvent(action, state);
      return { ok: false, error: `Unsupported action type "${action.type}".`, scope };
  }
}

async function runPlaywrightSnapshotAction(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
): Promise<Record<string, unknown>> {
  const url = optionalString(await evaluateValue(getProp(action, 'url') || action.label || '', state));
  const selector = optionalString(await evaluateValue(getProp(action, 'selector') ?? '', state));
  const request: WorkflowPlaywrightSnapshotRequest = {
    actionId: action.id,
    actionType: 'playwrightSnapshot',
    url,
    selector,
    outDir: optionalString(await evaluateValue(getProp(action, 'outDir') ?? '', state)),
    fileName: optionalString(await evaluateValue(getProp(action, 'fileName') ?? '', state)),
    fullPage: toBoolean(await evaluateValue(getProp(action, 'fullPage'), state), true),
    headless: toBoolean(await evaluateValue(getProp(action, 'headless'), state), true),
    timeoutMs: positiveNumber(
      await evaluateValue(getProp(action, 'timeoutMs') ?? getProp(action, 'timeout') ?? 60000, state),
      60000,
    ),
    allowedHosts: parseStringList(await evaluateValue(getProp(action, 'allowedHosts') ?? [], state)),
  };

  if (!url.trim()) return { ok: false, type: action.type, url, error: 'url is required.' };
  if (!options.hostAdapter?.runPlaywrightSnapshot) {
    return {
      ok: false,
      type: action.type,
      url,
      error: 'Playwright snapshot is disabled. Provide a host adapter to run it safely.',
    };
  }

  const result = await options.hostAdapter.runPlaywrightSnapshot(request);
  return storePlaywrightResult(state, action, result);
}

async function runPlaywrightRunAction(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
): Promise<Record<string, unknown>> {
  const url = optionalString(await evaluateValue(getProp(action, 'url') || action.label || '', state));
  const parsedActions = parsePlaywrightActions(await evaluateValue(getProp(action, 'actions') ?? [], state));
  if (parsedActions.error) return { ok: false, type: action.type, url, error: parsedActions.error };

  const request: WorkflowPlaywrightRunRequest = {
    actionId: action.id,
    actionType: 'playwrightRun',
    url,
    actions: parsedActions.actions,
    screenshot: toBoolean(await evaluateValue(getProp(action, 'screenshot'), state), true),
    trace: toBoolean(await evaluateValue(getProp(action, 'trace'), state), false),
    screenshotSelector: optionalString(
      await evaluateValue(getProp(action, 'screenshotSelector') ?? getProp(action, 'selector') ?? '', state),
    ),
    outDir: optionalString(await evaluateValue(getProp(action, 'outDir') ?? '', state)),
    fileName: optionalString(await evaluateValue(getProp(action, 'fileName') ?? '', state)),
    screenshotFileName: optionalString(await evaluateValue(getProp(action, 'screenshotFileName') ?? '', state)),
    traceFileName: optionalString(await evaluateValue(getProp(action, 'traceFileName') ?? '', state)),
    headless: toBoolean(await evaluateValue(getProp(action, 'headless'), state), true),
    timeoutMs: positiveNumber(
      await evaluateValue(getProp(action, 'timeoutMs') ?? getProp(action, 'timeout') ?? 60000, state),
      60000,
    ),
    allowedHosts: parseStringList(await evaluateValue(getProp(action, 'allowedHosts') ?? [], state)),
  };

  if (!url.trim()) return { ok: false, type: action.type, url, error: 'url is required.' };
  if (!request.actions.length)
    return { ok: false, type: action.type, url, error: 'actions must contain at least one Playwright action.' };
  if (!options.hostAdapter?.runPlaywright) {
    return {
      ok: false,
      type: action.type,
      url,
      error: 'Playwright run is disabled. Provide a host adapter to run it safely.',
    };
  }

  const result = await options.hostAdapter.runPlaywright(request);
  return storePlaywrightResult(state, action, result);
}

function storePlaywrightResult(
  state: RunnerState,
  action: WorkflowAction,
  result: WorkflowPlaywrightResult,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    type: action.type,
    ...result,
    ok: result.ok,
  };
  state.context[action.id] = { playwright: output };
  state.context.lastPlaywrightResult = output;
  if (isPlainObject(state.context.record)) state.context.record.lastPlaywrightResult = output;
  const storeAs = String(getProp(action, 'storeAs') || '').trim();
  if (storeAs) writeTarget(state.context, storeAs, undefined, output);
  state.result = output;
  return output;
}

function parsePlaywrightActions(value: unknown): { actions: Array<Record<string, unknown>>; error?: string } {
  if (Array.isArray(value)) {
    return { actions: value.filter(isPlainObject).slice(0, 50) };
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return { actions: [] };
    try {
      return parsePlaywrightActions(JSON.parse(text));
    } catch {
      return { actions: [], error: 'actions must be a valid JSON array or expression result.' };
    }
  }
  return { actions: [] };
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalString(value: unknown): string {
  return String(value ?? '').trim();
}

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function runCommandAction(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
): Promise<Record<string, unknown>> {
  const command = String((await evaluateValue(getProp(action, 'command') || action.label || '', state)) ?? '');
  const terminalId = String((await evaluateValue(getProp(action, 'terminalId') ?? '@selected', state)) ?? '@selected');
  const targetTermIds = resolveTargetTermIds(terminalId, options.targetTermIds ?? []);
  const request: WorkflowCommandRequest = {
    actionId: action.id,
    actionType: action.type,
    command,
    terminalId,
    targetTermIds,
    sequential: Boolean(options.sequentialCommands),
    timeoutMs: Math.max(0, Number(getProp(action, 'timeout') ?? getProp(action, 'timeoutMs') ?? 0) || 0),
    reply: toBoolean(getProp(action, 'reply'), true),
    delay: toBoolean(getProp(action, 'delay'), false),
  };

  if (!command.trim()) {
    return { ok: false, command, targetTermIds, error: 'command is empty.' };
  }
  if (!targetTermIds.length) {
    return { ok: false, command, targetTermIds, error: 'no target terminal sessions selected.' };
  }
  if (!options.hostAdapter?.sendCommand) {
    return {
      ok: false,
      command,
      targetTermIds,
      error: 'command execution is disabled. Provide a host adapter to run it safely.',
    };
  }

  const result = await options.hostAdapter?.sendCommand(request);
  if (result.responseData) {
    const responseData = result.responseData;
    const extractedValue = extractCommandResponseValue(responseData, action);
    if (extractedValue !== undefined) {
      responseData.extractedValue = extractedValue;
      state.context.lastExtractedValue = extractedValue;
      const storeAs = String(getProp(action, 'storeAs') || '').trim();
      if (storeAs) writeTarget(state.context, storeAs, undefined, extractedValue);
    }
    storeCommandResponse(state, action.id, responseData);
  }
  return {
    ok: result.ok,
    command: result.command,
    sent: result.sent,
    targetTermIds: result.targetTermIds,
    sequential: result.sequential,
    ...(result.responseData ? { responseData: result.responseData } : {}),
    ...(result.error ? { error: result.error } : {}),
  };
}

function storeCommandResponse(state: RunnerState, actionId: string, responseData: WorkflowCommandResponseData): void {
  state.context[actionId] = { responseData };
  state.context.lastCommandResponse = responseData;
  if (isPlainObject(state.context.record)) {
    state.context.record.responseData = responseData;
    state.context.record.lastCommandResponse = responseData;
  }
}

function extractCommandResponseValue(
  responseData: WorkflowCommandResponseData,
  action: WorkflowAction,
): string | undefined {
  const source = responseData.ResultMsg;
  const patternText = String(getProp(action, 'extractPattern') ?? '').trim();
  if (!source) return patternText ? undefined : '';
  if (!patternText) return source.trim();
  try {
    const match = new RegExp(patternText, 'm').exec(source);
    if (!match) return undefined;
    const groupIndex = Math.max(0, Number(getProp(action, 'extractGroup') ?? 1) || 0);
    return (match[groupIndex] ?? match[0] ?? '').trim();
  } catch {
    return undefined;
  }
}

async function runFileTransferAction(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
): Promise<Record<string, unknown>> {
  const direction = normalizeTransferDirection(await evaluateValue(getProp(action, 'direction') ?? 'upload', state));
  const profileId = String(
    (await evaluateValue(
      getProp(action, 'profileId') ?? getProp(action, 'profile') ?? getProp(action, 'connection') ?? '',
      state,
    )) ?? '',
  );
  const protocol = String((await evaluateValue(getProp(action, 'protocol') ?? 'sftp', state)) ?? 'sftp')
    .trim()
    .toLowerCase();
  const explicitLocalPath = await evaluateValue(getProp(action, 'localPath'), state);
  const explicitRemotePath = await evaluateValue(getProp(action, 'remotePath'), state);
  const sourcePath = await evaluateValue(getProp(action, 'sourcePath'), state);
  const targetPath = await evaluateValue(getProp(action, 'targetPath'), state);
  const localPath = String(explicitLocalPath ?? (direction === 'upload' ? sourcePath : targetPath) ?? '');
  const remotePath = String(explicitRemotePath ?? (direction === 'upload' ? targetPath : sourcePath) ?? '');
  const fileName = String((await evaluateValue(getProp(action, 'fileName') ?? '', state)) ?? '').trim();
  const overwritePolicy = normalizeOverwritePolicy(
    await evaluateValue(getProp(action, 'overwritePolicy') ?? getProp(action, 'overwrite') ?? 'ask', state),
  );
  const request: WorkflowFileTransferRequest = {
    actionId: action.id,
    actionType: action.type,
    direction,
    profileId,
    protocol,
    localPath,
    remotePath,
    ...(fileName ? { fileName } : {}),
    overwritePolicy,
  };

  if (!localPath.trim()) {
    return { ok: false, direction, profileId, localPath, remotePath, overwritePolicy, error: 'localPath is empty.' };
  }
  if (!remotePath.trim()) {
    return { ok: false, direction, profileId, localPath, remotePath, overwritePolicy, error: 'remotePath is empty.' };
  }
  if (!options.hostAdapter?.transferFile) {
    return {
      ok: false,
      direction,
      profileId,
      localPath,
      remotePath,
      overwritePolicy,
      error: 'file transfer is disabled. Provide a host adapter to enqueue it safely.',
    };
  }

  const result = await options.hostAdapter?.transferFile(request);
  return {
    ok: result.ok,
    direction: result.direction,
    profileId: result.profileId,
    localPath: result.localPath,
    remotePath: result.remotePath,
    fileName: result.fileName,
    overwritePolicy: result.overwritePolicy,
    ...(result.queueItemId ? { queueItemId: result.queueItemId } : {}),
    ...(result.state ? { state: result.state } : {}),
    ...(result.error ? { error: result.error } : {}),
  };
}

function normalizeTransferDirection(value: unknown): WorkflowFileTransferDirection {
  return String(value || '')
    .trim()
    .toLowerCase() === 'download'
    ? 'download'
    : 'upload';
}

function normalizeOverwritePolicy(value: unknown): WorkflowFileTransferOverwritePolicy {
  const text = String(value || '')
    .trim()
    .toLowerCase();
  if (text === 'overwrite' || text === 'replace') return 'overwrite';
  if (text === 'skip') return 'skip';
  return 'ask';
}

function resolveTargetTermIds(terminalId: string, selectedTermIds: string[]): string[] {
  const requested = terminalId.trim();
  if (!requested || requested === '@selected' || requested === '@active' || requested === '*') {
    return [...selectedTermIds];
  }
  return requested
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function runBatch(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
): Promise<Record<string, unknown>> {
  const mode = String(getProp(action, 'mode') || 'queue').toLowerCase();
  if (mode === 'parallel') {
    const results = await Promise.all(
      action.actions.map((child) => executeAction(child, state, options, `${action.id}.parallel`)),
    );
    return { ok: results.every((item) => item.ok !== false), mode, results };
  }
  const results = await executeActionList(action.actions, state, options, `${action.id}.queue`);
  return { ok: results.every((item) => !isPlainObject(item) || item.ok !== false), mode: 'queue', results };
}

async function runWorkQueue(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
): Promise<Record<string, unknown>> {
  const concurrency = Math.max(1, Number(getProp(action, 'concurrency') || 1));
  const source = getProp(action, 'items') ?? getProp(action, 'data') ?? getProp(action, 'of');
  const evaluated = source === undefined ? null : await evaluateValue(source, state);
  const items = Array.isArray(evaluated) ? evaluated : action.actions;
  emit(state, { kind: 'queue:start', actionId: action.id, concurrency, count: items.length });
  const results = await runConcurrent(items, concurrency, async (item, index) => {
    emit(state, { kind: 'queue:item:start', actionId: action.id, index, item: clone(item) });
    const scopedState = Array.isArray(evaluated) ? scopedItemState(state, item, index) : state;
    const itemResults = Array.isArray(evaluated)
      ? await executeActionList(action.actions, scopedState, options, `${action.id}.workqueue[${index}]`)
      : [await executeAction(item as WorkflowAction, state, options, `${action.id}.workqueue`)];
    emit(state, {
      kind: 'queue:item:end',
      actionId: action.id,
      index,
      ok: itemResults.every((result) => !isPlainObject(result) || result.ok !== false),
    });
    return itemResults;
  });
  emit(state, { kind: 'queue:end', actionId: action.id, concurrency, count: items.length });
  const flat = results.flat();
  return {
    ok: flat.every((result) => !isPlainObject(result) || result.ok !== false),
    mode: 'workqueue',
    concurrency,
    count: items.length,
    results,
  };
}

async function runScheduler(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
): Promise<Record<string, unknown>> {
  const mode = String(getProp(action, 'mode') || action.label || 'once').toLowerCase();
  const delayMs = Math.max(0, Number(getProp(action, 'delayMs') ?? getProp(action, 'delay') ?? 0) || 0);
  const intervalSource = getProp(action, 'intervalMs') ?? getProp(action, 'interval') ?? delayMs;
  const intervalMs = Math.max(1, Number(intervalSource || 1));
  const maxIterations = Math.max(1, Number(options.maxSchedulerIterations || 20));
  const requestedIterations = Number(
    getProp(action, 'iterations') ?? getProp(action, 'count') ?? getProp(action, 'repeat') ?? 1,
  );
  const iterations = Math.max(
    0,
    Math.min(Number.isFinite(requestedIterations) ? Math.floor(requestedIterations) : 1, maxIterations),
  );
  const results: unknown[][] = [];
  emit(state, { kind: 'scheduler:start', actionId: action.id, scheduleId: action.id, scheduleMode: mode, iterations });
  const runs = mode === 'interval' || mode === 'repeat' || mode === 'every' ? iterations : Math.min(iterations, 1);
  for (let index = 0; index < runs; index += 1) {
    const waitMs = index === 0 ? delayMs : intervalMs;
    if (waitMs > 0) await controlledSleep(Math.min(waitMs, options.maxSleepMs ?? 1000), options);
    emit(state, { kind: 'scheduler:tick:start', actionId: action.id, scheduleId: action.id, tick: index + 1 });
    const itemResults = await executeActionList(action.actions, state, options, `${action.id}.scheduler[${index}]`);
    results.push(itemResults);
    emit(state, {
      kind: 'scheduler:tick:end',
      actionId: action.id,
      scheduleId: action.id,
      tick: index + 1,
      ok: itemResults.every((result) => !isPlainObject(result) || result.ok !== false),
    });
  }
  emit(state, { kind: 'scheduler:end', actionId: action.id, scheduleId: action.id, runs });
  return {
    ok: results.flat().every((result) => !isPlainObject(result) || result.ok !== false),
    mode: 'scheduler',
    scheduleMode: mode,
    runs,
    results,
  };
}

async function runCondition(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
): Promise<Record<string, unknown>> {
  const condition = await evaluateConditionAction(action, state);
  const selected = condition.result ? 'success' : 'failure';
  const branch = condition.result ? action.success : action.failure;
  emit(state, { kind: 'condition:evaluate', actionId: action.id, value: condition.value, selected, condition });
  if (branch.length) await executeActionList(branch, state, options, `${action.id}.${selected}`);
  else if (condition.result && action.actions.length)
    await executeActionList(action.actions, state, options, `${action.id}.actions`);
  return { ok: true, handledBranches: true, value: condition.value, selected, condition };
}

async function evaluateConditionAction(
  action: WorkflowAction,
  state: RunnerState,
): Promise<Record<string, unknown> & { result: boolean; value: unknown }> {
  const operatorText = String(getProp(action, 'operator') ?? '').trim();
  if (operatorText) {
    const operator = operatorText.toLowerCase();
    const left = await evaluateValue(
      getProp(action, 'left') ??
        getProp(action, 'condition') ??
        getProp(action, 'test') ??
        getProp(action, 'expr') ??
        action.label ??
        '',
      state,
    );
    const right = await evaluateValue(getProp(action, 'right') ?? getProp(action, 'expected') ?? '', state);
    const result = compareConditionValues(left, operator, right);
    return { left, operator, right, value: result, result };
  }
  const value = await evaluateValue(
    getProp(action, 'condition') ?? getProp(action, 'test') ?? getProp(action, 'expr') ?? action.label ?? '',
    state,
  );
  return { left: value, operator: 'truthy', right: '', value, result: isTruthy(value) };
}

function compareConditionValues(left: unknown, operator: string, right: unknown): boolean {
  switch (operator) {
    case 'truthy':
    case 'true':
      return isTruthy(left);
    case 'falsy':
    case 'false':
      return !isTruthy(left);
    case 'exists':
      return left !== undefined && left !== null && left !== '';
    case 'empty':
      return left === undefined || left === null || left === '' || (Array.isArray(left) && left.length === 0);
    case 'eq':
    case 'equals':
    case '==':
      return String(left ?? '') === String(right ?? '');
    case 'ne':
    case 'notequals':
    case '!=':
      return String(left ?? '') !== String(right ?? '');
    case 'contains':
      return String(left ?? '').includes(String(right ?? ''));
    case 'notcontains':
      return !String(left ?? '').includes(String(right ?? ''));
    case 'startswith':
      return String(left ?? '').startsWith(String(right ?? ''));
    case 'endswith':
      return String(left ?? '').endsWith(String(right ?? ''));
    case 'matches':
      return testRegex(left, right);
    case 'notmatches':
      return !testRegex(left, right);
    case 'gt':
    case '>':
      return toNumber(left) > toNumber(right);
    case 'gte':
    case '>=':
      return toNumber(left) >= toNumber(right);
    case 'lt':
    case '<':
      return toNumber(left) < toNumber(right);
    case 'lte':
    case '<=':
      return toNumber(left) <= toNumber(right);
    default:
      return isTruthy(left);
  }
}

function testRegex(left: unknown, pattern: unknown): boolean {
  try {
    return new RegExp(String(pattern ?? ''), 'm').test(String(left ?? ''));
  } catch {
    return false;
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function runLoop(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
): Promise<Record<string, unknown>> {
  const value = await evaluateValue(
    getProp(action, 'items') ?? getProp(action, 'data') ?? getProp(action, 'of') ?? action.label ?? '',
    state,
  );
  const list = Array.isArray(value) ? value : [];
  const results: unknown[] = [];
  for (let index = 0; index < list.length; index += 1) {
    results.push(
      await executeActionList(
        action.actions,
        scopedItemState(state, list[index], index),
        options,
        `${action.id}[${index}]`,
      ),
    );
  }
  return { ok: true, count: list.length, results };
}

async function runSleep(action: WorkflowAction, options: RunOptions): Promise<Record<string, unknown>> {
  const requested = Number(getProp(action, 'duration') ?? getProp(action, 'ms') ?? action.label ?? 0);
  const duration = Math.max(0, Math.min(Number.isFinite(requested) ? requested : 0, options.maxSleepMs ?? 1000));
  if (duration > 0) await controlledSleep(duration, options);
  return { ok: true, duration };
}

async function runExpression(action: WorkflowAction, state: RunnerState): Promise<Record<string, unknown>> {
  const value = await evaluateValue(getProp(action, 'expr') ?? getProp(action, 'data') ?? action.label ?? '', state);
  state.context.result = value;
  state.context.lastValue = value;
  if (isPlainObject(state.context.record)) state.context.record.lastValue = value;
  state.result = value;
  return { ok: true, type: action.type, value };
}

async function runSaveData(action: WorkflowAction, state: RunnerState): Promise<Record<string, unknown>> {
  const target = String(getProp(action, 'target') || 'global');
  const key = getProp(action, 'key');
  const data = await evaluateValue(
    getProp(action, 'data') ?? getProp(action, 'value') ?? getProp(action, 'expr') ?? action.label ?? '',
    state,
  );
  writeTarget(state.context, target, typeof key === 'string' ? key : undefined, data);
  state.result = data;
  return { ok: true, target, key, data };
}

async function runHostUpdate(action: WorkflowAction, state: RunnerState): Promise<Record<string, unknown>> {
  const update = {
    type: action.type,
    target: getProp(action, 'target'),
    data: await evaluateValue(
      getProp(action, 'data') ?? getProp(action, 'dataTemplate') ?? getProp(action, 'value') ?? {},
      state,
    ),
  };
  state.hostUpdates.push(update);
  return { ok: true, update };
}

async function runCallApi(
  action: WorkflowAction,
  state: RunnerState,
  options: RunOptions,
): Promise<Record<string, unknown>> {
  const request = {
    method: String(getProp(action, 'method') || 'GET').toUpperCase(),
    url: await evaluateValue(getProp(action, 'url') || action.label || '', state),
    parameter: await evaluateValue(getProp(action, 'parameter') || getProp(action, 'params') || {}, state),
    payload: await evaluateValue(
      getProp(action, 'payload') ?? getProp(action, 'body') ?? getProp(action, 'data') ?? null,
      state,
    ),
  };
  if (!options.simulateApi)
    return { ok: false, request, error: 'callApi requires a host adapter or simulated API mode.' };
  const response = { ok: true, data: { request, simulated: true, products: [{ id: 'p1', title: 'Sample' }] } };
  if (isPlainObject(state.context.record)) state.context.record.responseData = response.data;
  state.result = response;
  return { ok: true, request, response };
}

async function runFeedback(action: WorkflowAction, state: RunnerState): Promise<Record<string, unknown>> {
  const message = await evaluateValue(getProp(action, 'message') ?? action.label ?? '', state);
  const event = { type: action.type, message };
  state.events.push(event);
  return { ok: true, event };
}

async function runHostEvent(action: WorkflowAction, state: RunnerState): Promise<Record<string, unknown>> {
  const event = {
    type: action.type,
    target: getProp(action, 'target'),
    xcon: getProp(action, 'xcon'),
    parameter: await evaluateValue(getProp(action, 'parameter') || {}, state),
    label: await evaluateValue(action.label || '', state),
  };
  state.events.push(event);
  return { ok: true, event };
}

async function evaluateValue(value: unknown, state: RunnerState): Promise<unknown> {
  if (typeof value === 'string') {
    const text = value.trim();
    if (isSugarExpression(text)) return evaluateSugar(text, state.context);
    if (value.includes('{{')) return renderTemplate(value, state.context);
    return value;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(await evaluateValue(item, state));
    return out;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = await evaluateValue(item, state);
    return out;
  }
  return value;
}

function orderByDependencies(actions: WorkflowAction[]): WorkflowAction[] {
  const byId = new Map(actions.map((action) => [action.id, action]));
  const result: WorkflowAction[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (action: WorkflowAction) => {
    if (visited.has(action.id) || visiting.has(action.id)) return;
    visiting.add(action.id);
    for (const dependency of action.after) {
      const depAction = byId.get(dependency);
      if (depAction) visit(depAction);
    }
    visiting.delete(action.id);
    visited.add(action.id);
    result.push(action);
  };
  for (const action of actions) visit(action);
  return result;
}

async function runConcurrent<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function scopedItemState(state: RunnerState, item: unknown, index: number): RunnerState {
  return {
    ...state,
    context: {
      ...state.context,
      item,
      index,
      record: state.context.record,
      parameter: state.context.parameter,
      global: state.context.global,
      local: state.context.local,
      self: state.context.self,
    },
  };
}

function getProp(action: WorkflowAction, name: string): unknown {
  if (Object.hasOwn(action.props, name)) return action.props[name];
  return (action as unknown as Record<string, unknown>)[name];
}

function writeTarget(context: Record<string, unknown>, target: string, key: string | undefined, value: unknown): void {
  if (key) {
    const root = ensurePath(context, target);
    root[key] = value;
    return;
  }
  setPath(context, target, value);
}

function ensurePath(root: Record<string, unknown>, path: string): Record<string, unknown> {
  let current = root;
  for (const part of pathParts(path)) {
    if (!isPlainObject(current[part])) current[part] = {};
    current = current[part] as Record<string, unknown>;
  }
  return current;
}

function setPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const parts = pathParts(path);
  if (!parts.length) return;
  let current = root;
  for (const part of parts.slice(0, -1)) {
    if (!isPlainObject(current[part])) current[part] = {};
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function pathParts(path: string): string[] {
  return String(path || '')
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
}

function emit(state: RunnerState, event: { kind: string; [key: string]: unknown }): void {
  const record = { at: new Date().toISOString(), ...event };
  state.executionEvents.push(record);
  state.onExecutionEvent?.(
    record,
    state.trace.map((step) => ({ ...step })),
  );
}

function compactOutput(output: Record<string, unknown>): Record<string, unknown> {
  const compact: Record<string, unknown> = {};
  for (const key of [
    'ok',
    'mode',
    'scheduleMode',
    'runs',
    'count',
    'concurrency',
    'target',
    'key',
    'duration',
    'url',
    'filePath',
    'screenshotFilePath',
    'traceFilePath',
    'outDir',
    'error',
  ]) {
    if (Object.hasOwn(output, key)) compact[key] = output[key];
  }
  if (isPlainObject(output.request)) {
    compact.request = {
      method: output.request.method,
      url: output.request.url,
    };
  }
  if (output.event) compact.event = output.event;
  return compact;
}

async function checkpointWorkflowRunControl(options: RunOptions): Promise<void> {
  const control = options.control;
  if (!control) return;
  if (control.isCancelled()) throw new WorkflowRunControlError();
  await control.waitIfPaused();
  if (control.isCancelled()) throw new WorkflowRunControlError();
}

async function controlledSleep(ms: number, options: RunOptions): Promise<void> {
  let remaining = Math.max(0, ms);
  while (remaining > 0) {
    await checkpointWorkflowRunControl(options);
    const slice = Math.min(remaining, 100);
    const startedAt = Date.now();
    await sleep(slice);
    remaining -= Math.max(1, Date.now() - startedAt);
  }
  await checkpointWorkflowRunControl(options);
}

function isWorkflowRunControlError(error: unknown): error is WorkflowRunControlError {
  return error instanceof WorkflowRunControlError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '' && value !== 'false' && value !== '0';
  return Boolean(value);
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'on'].includes(text)) return true;
  if (['false', 'no', 'n', '0', 'off'].includes(text)) return false;
  return fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}
