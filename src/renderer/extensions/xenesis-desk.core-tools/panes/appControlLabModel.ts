import type {
  ExternalAppAction,
  ExternalAppActionName,
  ExternalAppActionResult,
  ExternalAppBounds,
  ExternalAppElementInfo,
  ExternalAppObservationTarget,
  ExternalAppWindowInfo,
} from '../../../../shared/externalAppControl';

export type AppControlLabActionId =
  | 'status'
  | 'launch'
  | 'find'
  | 'close'
  | 'inspect'
  | 'tree'
  | 'menuExplore'
  | 'elementFromPoint'
  | 'highlight'
  | 'captureElement';

export interface AppControlLabActionDefinition {
  id: AppControlLabActionId;
  label: string;
  path: `xd.apps.${string}`;
  action: ExternalAppActionName;
  group?: 'app' | 'observe' | 'target';
}

export interface AppControlLabFormState {
  appId?: string;
  path?: string;
  args?: string[];
  argsText?: string;
  cwd?: string;
  windowId?: string;
  processName?: string;
  titleContains?: string;
  elementRef?: string;
  screenshotPath?: string;
  depth?: number | string;
  limit?: number | string;
  x?: number | string;
  y?: number | string;
  durationMs?: number | string;
  includeValues?: boolean;
  includeFullTree?: boolean;
  includeTreePreview?: boolean;
}

export interface AppControlLabTreeRow {
  depth: number;
  label: string;
  elementRef: string;
  provider?: ExternalAppElementInfo['provider'];
  role?: string;
  name?: string;
  value?: string;
  automationId?: string;
  className?: string;
  controlType?: string;
  bounds?: string;
  childCount?: number;
  truncated?: boolean;
}

export interface AppControlLabNetworkDiagramNode {
  id: string;
  label: string;
  type: string;
  group: string;
  color: string;
  metadata: Record<string, unknown>;
}

export interface AppControlLabNetworkDiagramLink {
  source: string;
  target: string;
  type: 'child';
  label: string;
  weight: number;
  metadata: Record<string, unknown>;
}

export interface AppControlLabNetworkDiagramModel {
  nodes: AppControlLabNetworkDiagramNode[];
  links: AppControlLabNetworkDiagramLink[];
  truncated: boolean;
}

export interface AppControlLabNetworkDiagramSize {
  width: number;
  height: number;
}

export interface AppControlLabTargetSummary {
  appId?: string;
  windowId?: string;
  processId?: number;
  processName?: string;
  title?: string;
  className?: string;
  bounds?: string;
}

export interface AppControlLabCaptureSummary {
  path?: string;
  dataUrl?: string;
  width?: number;
  height?: number;
  bounds?: string;
}

export interface AppControlLabResultSummary {
  ok: boolean;
  action: ExternalAppActionName;
  message: string;
  primaryWindow?: ExternalAppWindowInfo;
  target?: AppControlLabTargetSummary;
  treeRows: AppControlLabTreeRow[];
  resultTree: ExternalAppElementInfo[];
  capture?: AppControlLabCaptureSummary;
  warnings: string[];
  errorLabel?: string;
}

export interface AppControlLabHistoryEntry {
  id: string;
  actionId: AppControlLabActionId;
  path: string;
  at: number;
  args?: ExternalAppAction;
  result: {
    ok: boolean;
    message: string;
    errorLabel?: string;
  };
}

export interface AppControlLabBridgeCallResult {
  ok: boolean;
  result?: unknown;
  error?: string;
  message?: string;
}

export const APP_CONTROL_LAB_ACTIONS: AppControlLabActionDefinition[] = [
  { id: 'status', label: 'Status', path: 'xd.apps.status', action: 'status', group: 'app' },
  { id: 'launch', label: 'Launch', path: 'xd.apps.launch', action: 'launch', group: 'app' },
  { id: 'find', label: 'Find', path: 'xd.apps.find', action: 'find', group: 'target' },
  { id: 'close', label: 'Close', path: 'xd.apps.close', action: 'close', group: 'app' },
  { id: 'inspect', label: 'Inspect', path: 'xd.apps.inspect', action: 'inspect', group: 'observe' },
  { id: 'tree', label: 'Tree', path: 'xd.apps.tree', action: 'tree', group: 'observe' },
  { id: 'menuExplore', label: 'Menu Explore', path: 'xd.apps.menuExplore', action: 'menuExplore', group: 'observe' },
  {
    id: 'elementFromPoint',
    label: 'Element From Point',
    path: 'xd.apps.elementFromPoint',
    action: 'elementFromPoint',
    group: 'observe',
  },
  { id: 'highlight', label: 'Highlight', path: 'xd.apps.highlight', action: 'highlight', group: 'observe' },
  {
    id: 'captureElement',
    label: 'Capture Element',
    path: 'xd.apps.captureElement',
    action: 'captureElement',
    group: 'observe',
  },
];

const ACTION_BY_ID = new Map(APP_CONTROL_LAB_ACTIONS.map((action) => [action.id, action]));
const APP_CONTROL_GRAPH_MAX_ROWS = 160;
const APP_CONTROL_GRAPH_FALLBACK_SIZE: AppControlLabNetworkDiagramSize = { width: 620, height: 360 };
const APP_CONTROL_GRAPH_COLORS: Record<string, string> = {
  button: '#facc15',
  checkbox: '#facc15',
  combobox: '#facc15',
  custom: '#94a3b8',
  document: '#38bdf8',
  edit: '#34d399',
  element: '#38bdf8',
  image: '#f472b6',
  menu: '#a78bfa',
  menubar: '#a78bfa',
  pane: '#60a5fa',
  scrollbar: '#fb923c',
  statusbar: '#22d3ee',
  text: '#e2e8f0',
  titlebar: '#818cf8',
  window: '#f472b6',
};

export function buildAppControlLabArgs(
  actionOrId: AppControlLabActionId | AppControlLabActionDefinition,
  form: AppControlLabFormState,
): ExternalAppAction {
  const definition = typeof actionOrId === 'string' ? ACTION_BY_ID.get(actionOrId) : actionOrId;
  if (!definition) throw new Error(`Unsupported App Control Lab action: ${String(actionOrId)}`);

  const args: ExternalAppAction = {
    action: definition.action,
    ...targetFields(form),
  };

  if (definition.id === 'launch') {
    const launchArgs = normalizeArgs(form.args, form.argsText);
    if (launchArgs.length) args.args = launchArgs;
    const cwd = cleanString(form.cwd);
    if (cwd) args.cwd = cwd;
  }

  if (definition.id === 'inspect' || definition.id === 'tree' || definition.id === 'menuExplore') {
    const depth = clampInteger(form.depth, 1, 20);
    const limit = clampInteger(form.limit, 1, 1000);
    if (depth !== undefined) args.depth = depth;
    if (limit !== undefined) args.limit = limit;
    if (form.includeValues === true) args.includeValues = true;
    if (definition.id !== 'menuExplore' && form.includeFullTree === true) {
      args.includeFullTree = true;
    }
    if (definition.id !== 'menuExplore' && form.includeTreePreview === true) {
      args.includeTreePreview = true;
    }
  }

  if (definition.id === 'elementFromPoint') {
    args.x = finiteScreenInteger(form.x);
    args.y = finiteScreenInteger(form.y);
  }

  if (definition.id === 'highlight') {
    args.durationMs = clampInteger(form.durationMs, 100, 10000) ?? 1000;
  }

  if (definition.id === 'captureElement') {
    const screenshotPath = cleanString(form.screenshotPath);
    if (screenshotPath) args.screenshotPath = screenshotPath;
  }

  return args;
}

export function boundsLabel(bounds: ExternalAppBounds | undefined): string | undefined {
  if (!bounds) return undefined;
  return `${bounds.x},${bounds.y} ${bounds.width}x${bounds.height}`;
}

export function flattenAppControlLabTree(
  nodes: readonly ExternalAppElementInfo[] | ExternalAppElementInfo | undefined,
  limit = 200,
): AppControlLabTreeRow[] {
  const rows: AppControlLabTreeRow[] = [];
  const roots = Array.isArray(nodes) ? nodes : nodes ? [nodes] : [];
  const maxRows = Math.max(0, Math.floor(limit));

  const visit = (node: ExternalAppElementInfo, depth: number): void => {
    if (rows.length >= maxRows) return;
    rows.push(treeRow(node, depth));
    for (const child of node.children ?? []) {
      if (rows.length >= maxRows) return;
      visit(child, depth + 1);
    }
  };

  for (const node of roots) {
    if (rows.length >= maxRows) break;
    visit(node, 0);
  }

  return rows;
}

export function appControlLabNetworkDiagramSizeFromHost(
  measure: Partial<AppControlLabNetworkDiagramSize> | undefined,
): AppControlLabNetworkDiagramSize {
  const width = Math.max(320, Math.floor(Number(measure?.width) || APP_CONTROL_GRAPH_FALLBACK_SIZE.width));
  const height = Math.max(260, Math.floor(Number(measure?.height) || APP_CONTROL_GRAPH_FALLBACK_SIZE.height));
  return { width, height };
}

export function buildAppControlLabNetworkDiagramModel(
  rows: readonly AppControlLabTreeRow[] | undefined,
  selectedElementRef?: string,
  maxRows = APP_CONTROL_GRAPH_MAX_ROWS,
): AppControlLabNetworkDiagramModel {
  const selectedRef = cleanString(selectedElementRef);
  const visibleRows = (rows ?? []).filter((row) => cleanString(row.elementRef)).slice(0, Math.max(0, maxRows));
  const nodes: AppControlLabNetworkDiagramNode[] = [];
  const links: AppControlLabNetworkDiagramLink[] = [];
  const nodeIds = new Set<string>();
  const linkIds = new Set<string>();
  const stack: { depth: number; id: string }[] = [];

  for (const row of visibleRows) {
    const id = cleanString(row.elementRef);
    if (!id) continue;
    const depth = Math.max(0, Math.floor(Number(row.depth) || 0));
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();

    if (!nodeIds.has(id)) {
      const type = appControlLabGraphNodeType(row);
      const selected = Boolean(selectedRef && selectedRef === id);
      nodes.push({
        id,
        label: trimGraphLabel(row.label || row.name || row.role || id),
        type,
        group: type,
        color: selected ? '#facc15' : appControlLabGraphColor(type),
        metadata: {
          selected,
          depth,
          elementRef: id,
          provider: row.provider,
          role: row.role,
          name: row.name,
          value: row.value,
          bounds: row.bounds,
          childCount: row.childCount,
          truncated: row.truncated,
        },
      });
      nodeIds.add(id);
    }

    const parent = stack[stack.length - 1];
    if (parent) {
      const linkId = `${parent.id}->${id}`;
      if (!linkIds.has(linkId) && parent.id !== id) {
        links.push({
          source: parent.id,
          target: id,
          type: 'child',
          label: 'contains',
          weight: Math.max(1, 5 - depth),
          metadata: { depth },
        });
        linkIds.add(linkId);
      }
    }
    stack.push({ depth, id });
  }

  return { nodes, links, truncated: (rows ?? []).length > visibleRows.length };
}

export function buildAppControlLabNetworkDiagramSketch(
  rows: readonly AppControlLabTreeRow[] | undefined,
  size: AppControlLabNetworkDiagramSize,
  selectedElementRef?: string,
): string {
  const normalizedSize = appControlLabNetworkDiagramSizeFromHost(size);
  const model = buildAppControlLabNetworkDiagramModel(rows, selectedElementRef);
  const graphWidth = Math.max(240, normalizedSize.width - 16);
  const graphHeight = Math.max(180, normalizedSize.height - 56);
  const title = model.nodes.length ? 'Observed App UI Tree' : 'Run Inspect, Tree, Menu Explore, or Element From Point';
  const subtitle = model.nodes.length
    ? `${model.nodes.length} elements / ${model.links.length} parent-child links`
    : 'OBSERVE result is displayed as an XCON/SKETCH networkDiagram.';

  return [
    `screen "App Control Observe" ${normalizedSize.width}x${normalizedSize.height} bg #0f1117`,
    `  title: label ${JSON.stringify(title)} at 14 10 ${Math.max(180, normalizedSize.width - 28)} 20`,
    '    color "#e2e8f0"',
    '    font',
    '      size 14',
    '      weight 700',
    `  subtitle: label ${JSON.stringify(subtitle)} at 14 31 ${Math.max(180, normalizedSize.width - 28)} 18`,
    '    color "#94a3b8"',
    '    font',
    '      size 10',
    '      weight 500',
    `  uiTree: networkDiagram at 8 50 ${graphWidth} ${graphHeight}`,
    '    theme "obsidian"',
    '    nodeRadius 15',
    '    linkDistance 70',
    '    charge -680',
    '    friction 0.74',
    '    showControls true',
    '    showSearch false',
    '    showFilters false',
    '    showLegend true',
    '    showLabels true',
    '    showArrows true',
    '    enableDrag true',
    '    enableZoom true',
    '    enablePan true',
    '    enableHover true',
    `    nodes ${JSON.stringify(model.nodes)}`,
    `    links ${JSON.stringify(model.links)}`,
  ].join('\n');
}

export function summarizeAppControlLabResult(result: ExternalAppActionResult): AppControlLabResultSummary {
  const primaryWindow = result.windows.find((window) => window.isForeground) ?? result.windows[0];
  const resultTree = elementTreeRoots(result);
  const errorOrMessage = result.error || result.message;

  return {
    ok: result.ok,
    action: result.action,
    message: result.message,
    ...(primaryWindow ? { primaryWindow } : {}),
    target: summarizeTarget(result.target, primaryWindow),
    treeRows: flattenAppControlLabTree(resultTree),
    resultTree,
    capture: summarizeCapture(result),
    warnings: result.warnings ? [...result.warnings] : [],
    ...(!result.ok && errorOrMessage
      ? { errorLabel: result.code ? `${result.code}: ${errorOrMessage}` : errorOrMessage }
      : {}),
  };
}

export function summarizeAppControlLabCallResult(
  action: AppControlLabActionDefinition,
  callResult: AppControlLabBridgeCallResult,
): AppControlLabResultSummary {
  if (isExternalAppActionResult(callResult.result)) return summarizeAppControlLabResult(callResult.result);
  if (!callResult.ok) return failureSummary(action, callResult);
  return failureSummary(action, { message: 'DeskBridge returned a malformed app control result.' });
}

export function applyAppControlLabElementSelection(
  form: AppControlLabFormState,
  element: Partial<AppControlLabTreeRow> | undefined,
): AppControlLabFormState {
  const elementRef = cleanString(element?.elementRef);
  return elementRef ? { ...form, elementRef } : form;
}

export function isAppControlLabTreeRowSelected(
  form: Pick<AppControlLabFormState, 'elementRef'>,
  row: Partial<AppControlLabTreeRow>,
): boolean {
  const selectedElementRef = cleanString(form.elementRef);
  const rowElementRef = cleanString(row.elementRef);
  return Boolean(selectedElementRef && rowElementRef && selectedElementRef === rowElementRef);
}

export function selectedElementRefLabel(form: Pick<AppControlLabFormState, 'elementRef'>): string {
  return cleanString(form.elementRef) ?? 'No element selected';
}

export function recordAppControlLabHistory(
  previous: readonly AppControlLabHistoryEntry[],
  entry: AppControlLabHistoryEntry,
  limit = 25,
): AppControlLabHistoryEntry[] {
  return [entry, ...previous].slice(0, Math.max(0, Math.floor(limit)));
}

function failureSummary(
  action: AppControlLabActionDefinition,
  callResult: { error?: string; message?: string },
): AppControlLabResultSummary {
  const errorLabel = callResult.error || callResult.message || undefined;
  return {
    ok: false,
    action: action.action,
    message: callResult.message || callResult.error || 'DeskBridge capability call failed.',
    treeRows: [],
    resultTree: [],
    warnings: [],
    ...(errorLabel ? { errorLabel } : {}),
  };
}

function isExternalAppActionResult(value: unknown): value is ExternalAppActionResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<ExternalAppActionResult>;
  return (
    typeof candidate.ok === 'boolean' &&
    typeof candidate.action === 'string' &&
    typeof candidate.message === 'string' &&
    Array.isArray(candidate.windows)
  );
}

function targetFields(form: AppControlLabFormState): Partial<ExternalAppAction> {
  return {
    ...optionalStringField('appId', form.appId),
    ...optionalStringField('path', form.path),
    ...optionalStringField('windowId', form.windowId),
    ...optionalStringField('processName', form.processName),
    ...optionalStringField('titleContains', form.titleContains),
    ...optionalStringField('elementRef', form.elementRef),
  };
}

function optionalStringField<K extends keyof ExternalAppAction>(
  key: K,
  value: string | undefined,
): Partial<Pick<ExternalAppAction, K>> {
  const cleaned = cleanString(value);
  return cleaned ? ({ [key]: cleaned } as Partial<Pick<ExternalAppAction, K>>) : {};
}

function cleanString(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function normalizeArgs(args: readonly string[] | undefined, argsText: string | undefined): string[] {
  if (args?.length) return args.map((arg) => String(arg).trim()).filter(Boolean);
  const cleanedText = cleanString(argsText);
  return cleanedText ? cleanedText.split(/\s+/).filter(Boolean) : [];
}

function clampInteger(value: number | string | undefined, min: number, max: number): number | undefined {
  if (value === undefined || value === '') return undefined;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return undefined;
  return Math.min(max, Math.max(min, Math.trunc(numberValue)));
}

function finiteScreenInteger(value: number | string | undefined): number {
  if (value === undefined || value === '') return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.trunc(numberValue) : 0;
}

function appControlLabGraphNodeType(row: AppControlLabTreeRow): string {
  return (
    cleanString(row.role) ??
    cleanString(row.controlType) ??
    cleanString(row.className) ??
    'element'
  ).toLowerCase();
}

function appControlLabGraphColor(type: string): string {
  return APP_CONTROL_GRAPH_COLORS[type] ?? '#38bdf8';
}

function trimGraphLabel(value: string, maxLength = 42): string {
  const cleaned = cleanString(value) ?? 'element';
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}...` : cleaned;
}

function treeRow(node: ExternalAppElementInfo, depth: number): AppControlLabTreeRow {
  const elementRef = node.elementRef || `${depth}:${node.role || node.name || 'element'}`;
  const label = node.name || node.role || node.controlType || node.className || elementRef;
  return {
    depth,
    label,
    elementRef,
    provider: node.provider,
    ...(node.role ? { role: node.role } : {}),
    ...(node.name ? { name: node.name } : {}),
    ...(node.value ? { value: node.value } : {}),
    ...(node.automationId ? { automationId: node.automationId } : {}),
    ...(node.className ? { className: node.className } : {}),
    ...(node.controlType ? { controlType: node.controlType } : {}),
    ...(boundsLabel(node.bounds) ? { bounds: boundsLabel(node.bounds) } : {}),
    ...(node.childCount !== undefined ? { childCount: node.childCount } : {}),
    ...(node.truncated !== undefined ? { truncated: node.truncated } : {}),
  };
}

function summarizeTarget(
  target: ExternalAppObservationTarget | undefined,
  primaryWindow: ExternalAppWindowInfo | undefined,
): AppControlLabTargetSummary | undefined {
  if (!target && !primaryWindow) return undefined;
  return {
    ...(target?.appId ? { appId: target.appId } : {}),
    ...(target?.windowId || primaryWindow?.windowId ? { windowId: target?.windowId ?? primaryWindow?.windowId } : {}),
    ...((target?.processId ?? primaryWindow?.processId)
      ? { processId: target?.processId ?? primaryWindow?.processId }
      : {}),
    ...(target?.processName ? { processName: target.processName } : {}),
    ...(target?.title || primaryWindow?.title ? { title: target?.title ?? primaryWindow?.title } : {}),
    ...(target?.className ? { className: target.className } : {}),
    ...(boundsLabel(target?.bounds ?? primaryWindow?.bounds)
      ? { bounds: boundsLabel(target?.bounds ?? primaryWindow?.bounds) }
      : {}),
  };
}

function summarizeCapture(result: ExternalAppActionResult): AppControlLabCaptureSummary | undefined {
  const screenshot = result.screenshot;
  if (!screenshot && !result.screenshotPath) return undefined;
  return {
    ...(screenshot?.path || result.screenshotPath ? { path: screenshot?.path ?? result.screenshotPath } : {}),
    ...(screenshot?.dataUrl ? { dataUrl: screenshot.dataUrl } : {}),
    ...(screenshot?.width !== undefined ? { width: screenshot.width } : {}),
    ...(screenshot?.height !== undefined ? { height: screenshot.height } : {}),
    ...(boundsLabel(screenshot?.bounds) ? { bounds: boundsLabel(screenshot?.bounds) } : {}),
  };
}

function elementTreeRoots(result: ExternalAppActionResult): ExternalAppElementInfo[] {
  return [
    ...externalElementRoots(result.observation),
    ...externalElementRoots(result.tree),
    ...externalElementRoots(result.element),
  ];
}

function externalElementRoots(value: unknown): ExternalAppElementInfo[] {
  if (Array.isArray(value)) return value.filter(isExternalElementInfo);
  return isExternalElementInfo(value) ? [value] : [];
}

function isExternalElementInfo(value: unknown): value is ExternalAppElementInfo {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<ExternalAppElementInfo>;
  return Boolean(
    candidate.elementRef ||
      candidate.name ||
      candidate.role ||
      candidate.controlType ||
      candidate.className ||
      Array.isArray(candidate.children),
  );
}
