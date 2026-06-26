import { evaluate, evaluateSugar, isSugarExpression } from '@xcon-chain/core';
import type { OpenFileResult } from '../../../shared/types';
import {
  findOpenMarkdownCodeFence,
  getMarkdownCodeFenceInfo,
  scanMarkdownCodeFences,
} from '../../markdown/markdownCodeFences';

export interface DemoScene {
  id: string;
  title: string;
  caption: string;
  action: string;
  actions?: DemoSceneAction[];
  duration: number;
}

export interface DemoSceneAction {
  type: string;
  target?: string;
  text?: string;
  value?: string | number | boolean | Record<string, unknown>;
  data?: string | number | boolean | Record<string, unknown>;
  status?: string;
  path?: string;
  label?: string;
  easing?: string;
  clear?: boolean;
  append?: boolean;
  keep?: boolean;
  replace?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  hold?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  w?: number;
  h?: number;
  top?: number;
  left?: number;
  behavior?: string;
  duration?: number;
}

export interface DemoActionContract {
  requiredFields?: Array<keyof DemoSceneAction>;
}

export interface DemoManifestDiagnostic {
  severity: 'warning' | 'error';
  path: string;
  message: string;
}

export interface DemoManifest {
  title: string;
  format: string;
  mode: string;
  scenes: DemoScene[];
}

export interface DemoFence {
  lang: string;
  args: string;
  info: string;
  content: string;
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
}

export interface DemoDocument {
  manifest: DemoManifest;
  fences: DemoFence[];
  fixtureText: string;
  fixture: Record<string, unknown>;
  chainFences: DemoFence[];
  workflowText: string;
  sketchText: string;
  markdownText: string;
  completeSketchFence: boolean;
  completeWorkflowFence: boolean;
}

const DEMO_SKETCH_LANGS = new Set(['xcon-sketch', 'xcon', 'sketch']);
const DEMO_FIXTURE_LANGS = new Set(['xcon-chain-fixture', 'json-fixture', 'xcon-fixture', 'fixture', 'json']);
const DEMO_WORKFLOW_LANGS = new Set(['xcon-workflow', 'workflow']);
const DEMO_CHAIN_LANGS = new Set(['xcon-chain', 'xcon-sugar', 'chain']);
const DEMO_HIDDEN_LANGS = new Set(['xcon-demo', ...DEMO_FIXTURE_LANGS, ...DEMO_WORKFLOW_LANGS, ...DEMO_CHAIN_LANGS]);

export const DEMO_ACTION_CONTRACTS: Record<string, DemoActionContract> = {
  caption: { requiredFields: ['text'] },
  focus: { requiredFields: ['target'] },
  typeText: { requiredFields: ['target', 'text'] },
  cursorMove: { requiredFields: ['target', 'x', 'y'] },
  cursorClick: { requiredFields: ['target', 'x', 'y'] },
  highlight: { requiredFields: ['target'] },
  callout: { requiredFields: ['target', 'text'] },
  stream: {},
  fixture: { requiredFields: ['target', 'status'] },
  setFixture: { requiredFields: ['path', 'value'] },
  chain: { requiredFields: ['target', 'status'] },
  workflow: {},
  workflowEvent: { requiredFields: ['target', 'status'] },
  wait: {},
  render: {},
};

export function collectDemoFences(source = ''): DemoFence[] {
  const input = String(source || '');
  return scanMarkdownCodeFences(input).map((fence) => {
    const { lang, args } = getMarkdownCodeFenceInfo(fence.info);
    return {
      lang,
      args,
      info: fence.info,
      content: fence.code,
      start: fence.start,
      end: fence.end,
      contentStart: fence.contentStart,
      contentEnd: fence.contentEnd,
    };
  });
}

export function extractDemoDocument(source = ''): DemoDocument {
  const input = String(source || '');
  const fences = collectDemoFences(input);
  const fixtureFence = fences.find((item) => DEMO_FIXTURE_LANGS.has(item.lang));
  const workflowFence = fences.find((item) => DEMO_WORKFLOW_LANGS.has(item.lang));
  const sketchFence = fences.find((item) => DEMO_SKETCH_LANGS.has(item.lang));
  const chainFences = fences.filter((item) => DEMO_CHAIN_LANGS.has(item.lang));
  const fixtureText = fixtureFence?.content.trim() || '';
  const fixture = parseDemoFixture(fixtureText);

  return {
    manifest: parseDemoManifest(input),
    fences,
    fixtureText,
    fixture: normalizeDemoFixture(fixture),
    chainFences,
    workflowText: workflowFence?.content.trim() || '',
    sketchText: sketchFence?.content.trim() || '',
    markdownText: removeHiddenDemoFences(input, fences),
    completeSketchFence: Boolean(sketchFence),
    completeWorkflowFence: Boolean(workflowFence),
  };
}

export function createDemoPreviewMarkdown(source = '', fixtureOverride?: Record<string, unknown> | null): string {
  const document = extractDemoDocument(source);
  const fixture = normalizeDemoFixture(fixtureOverride ?? document.fixture);
  const aliases = evaluateDemoAliases(document.chainFences, fixture);
  return applyDemoVariablesToMarkdown(document.markdownText, aliases, fixture);
}

export function evaluateDemoAliases(
  chainFences: DemoFence[],
  fixture: Record<string, unknown>,
): Record<string, unknown> {
  const aliases: Record<string, unknown> = {};
  const normalizedFixture = normalizeDemoFixture(fixture);
  const env = {
    ...normalizedFixture,
    record: isPlainRecord(normalizedFixture.record) ? normalizedFixture.record : {},
    global: isPlainRecord(normalizedFixture.global) ? normalizedFixture.global : {},
  };

  for (const fence of chainFences) {
    const alias = getDemoChainAlias(fence.args);
    if (!alias) continue;
    const expression = fence.content.trim();
    if (!expression) {
      aliases[alias] = '';
      continue;
    }
    try {
      aliases[alias] = isSugarExpression(expression) ? evaluateSugar(expression, env) : evaluate(expression, env);
    } catch (error) {
      aliases[alias] = `Chain error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  return aliases;
}

export function cloneDemoFixture(value: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return { record: {} };
  }
}

export function normalizeDemoFixture(value: Record<string, unknown> = { record: {} }): Record<string, unknown> {
  const target = isPlainRecord(value) ? cloneDemoFixture(value) : { record: {} };
  const record = ensureDemoRecord(target, 'record');

  record.metrics = isPlainRecord(record.metrics) ? record.metrics : {};
  const metrics = record.metrics as Record<string, unknown>;
  metrics.revenue ??= 0;
  metrics.growth ??= 0;
  metrics.health ??= 0;

  const channels = normalizeDemoRecordList(record.channels);
  const team = normalizeDemoRecordList(record.team);
  const deliveryTargets = normalizeDemoRecordList(record.deliveryTargets);
  record.channels = channels;
  record.team = team;
  record.deliveryTargets = deliveryTargets;

  channels.forEach((item) => {
    const normalizedStatus = String(item.status || '').toLowerCase();
    item.status ||= 'queued';
    item.color ||=
      normalizedStatus === 'done' || normalizedStatus === 'completed'
        ? '#22c55e'
        : normalizedStatus === 'running'
          ? '#38bdf8'
          : '#64748b';
  });
  deliveryTargets.forEach((item) => {
    const normalizedStatus = String(item.status || '').toLowerCase();
    item.status ||= 'waiting';
    item.color ||= normalizedStatus === 'done' || normalizedStatus === 'completed' ? '#22c55e' : '#64748b';
  });

  record.teamGrid = createDemoTeamGrid(team);
  record.chartData = createDemoChartData(channels, record.chartData);

  const workflow = ensureDemoRecord(record, 'workflow');
  workflow.status ||= 'Workflow not started';
  workflow.percent = normalizeDemoPercent(workflow.percent);
  workflow.percentLabel ||= `${workflow.percent}%`;
  workflow.fillWidth ||= Math.round(Number(workflow.percent || 0) * 7.8);
  workflow.eventCount ||= 0;
  workflow.lastEvent ||= 'No runtime event yet.';

  record.status ||= workflow.status;
  record.statusColor ||= '#94a3b8';
  record.updatedAt ||= 'demo idle';

  const scheduler = ensureDemoRecord(record, 'scheduler');
  scheduler.label ||= 'scheduler idle';
  for (let index = 1; index <= 5; index += 1) {
    scheduler[`tick${index}`] ||= '#475569';
  }

  const queue = ensureDemoRecord(record, 'queue');
  const queueTotal = Number(queue.total || channels.length || 0);
  const queueDone =
    channels.filter((item) => {
      const status = String(item.status || '').toLowerCase();
      return status === 'done' || status === 'completed';
    }).length || Number(queue.done || 0);
  const queuePercent =
    queueTotal > 0 ? Math.round((queueDone / queueTotal) * 100) : normalizeDemoPercent(queue.percent);
  queue.total = queueTotal;
  queue.done = queueDone;
  queue.percent = queuePercent;
  queue.percentLabel = `${queuePercent}%`;
  queue.fillWidth = Math.round(queuePercent * 7.8);
  queue.smallFillWidth = Math.round(queuePercent * 2.38);
  queue.doneText ||= `${queueDone} / ${queueTotal || 0} completed`;

  record.networkNodes = createDemoNetworkNodes(record.networkNodes, {
    channels,
    deliveryTargets,
    scheduler,
    workflow,
    queue,
    theme: isPlainRecord(record.theme) ? record.theme : {},
  });
  record.networkLinks = createDemoNetworkLinks(record.networkLinks, record.networkNodes, workflow);

  return target;
}

function normalizeDemoRecordList(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isPlainRecord).map((item) => ({ ...item })) : [];
}

function createDemoTeamGrid(team: Array<Record<string, unknown>>): unknown[][] {
  return [
    ['Team', 'Owner', 'Status'],
    ...team.map((item) => [
      normalizeDemoCellText(item.name),
      normalizeDemoCellText(item.owner),
      normalizeDemoCellText(item.status),
    ]),
  ];
}

function createDemoChartData(
  channels: Array<Record<string, unknown>>,
  currentChartData: unknown,
): Record<string, unknown> {
  if (
    channels.length === 0 &&
    isPlainRecord(currentChartData) &&
    Array.isArray(currentChartData.labels) &&
    Array.isArray(currentChartData.datasets)
  ) {
    return currentChartData;
  }
  return {
    labels: channels.map((item) => normalizeDemoCellText(item.name)),
    datasets: [
      {
        label: 'Value',
        data: channels.map((item) => Number(item.revenue ?? item.value ?? 0)),
        backgroundColor: '#c4622d',
        borderColor: '#38bdf8',
      },
    ],
  };
}

function createDemoNetworkNodes(
  currentNodes: unknown,
  state: {
    channels: Array<Record<string, unknown>>;
    deliveryTargets: Array<Record<string, unknown>>;
    scheduler: Record<string, unknown>;
    workflow: Record<string, unknown>;
    queue: Record<string, unknown>;
    theme: Record<string, unknown>;
  },
): Array<Record<string, unknown>> {
  const baseNodes = normalizeDemoRecordList(currentNodes);
  const hasDynamicSource =
    state.channels.length > 0 ||
    state.deliveryTargets.length > 0 ||
    Object.keys(state.scheduler).length > 0 ||
    Object.keys(state.workflow).length > 0;
  if (!hasDynamicSource && baseNodes.length > 0) return baseNodes;

  const nodes =
    baseNodes.length > 0
      ? baseNodes
      : [
          { id: 'hub', label: 'Hub', color: normalizeDemoCellText(state.theme.accent) || '#38bdf8', x: 400, y: 300 },
          { id: 'channels', label: 'Channels', color: '#64748b', x: 210, y: 170 },
          { id: 'scheduler', label: 'Scheduler', color: '#facc15', x: 600, y: 170 },
          { id: 'targets', label: 'Targets', color: '#fb7185', x: 590, y: 430 },
        ];

  const channelTotal = state.channels.length;
  const channelDone = countDemoStatus(state.channels, ['done', 'completed']);
  const channelRunning = countDemoStatus(state.channels, ['running', 'translating', 'processing']);
  const targetTotal = state.deliveryTargets.length;
  const targetDone = countDemoStatus(state.deliveryTargets, ['done', 'completed']);
  const targetRunning = countDemoStatus(state.deliveryTargets, ['running']);
  const tickCount = countDemoSchedulerTicks(state.scheduler);
  const percent = normalizeDemoPercent(state.workflow.percent ?? state.queue.percent);

  return nodes.map((node, index) => {
    const id = normalizeDemoCellText(node.id).toLowerCase();
    const label = normalizeDemoCellText(node.label || node.name || node.id);
    const next = { ...node };
    if (index === 0 || /\b(hub|root|ops|core|center)\b/i.test(id)) {
      next.color = percent >= 100 ? '#22c55e' : percent > 0 ? '#38bdf8' : node.color || '#64748b';
      next.label = percent > 0 ? `${label.replace(/\s+\d+%$/, '')} ${percent}%` : label;
    } else if (/\b(drone|channel|signal|api|feed|source)\b/i.test(id)) {
      next.color =
        channelDone >= channelTotal && channelTotal > 0
          ? '#22c55e'
          : channelRunning > 0 || channelDone > 0
            ? '#38bdf8'
            : node.color || '#64748b';
      next.label = channelTotal > 0 ? `${label.replace(/\s+\d+\/\d+$/, '')} ${channelDone}/${channelTotal}` : label;
    } else if (/\b(sensor|scheduler|queue|mesh|tick)\b/i.test(id)) {
      next.color = tickCount >= 5 ? '#22c55e' : tickCount > 0 ? '#facc15' : node.color || '#64748b';
      next.label = tickCount > 0 ? `${label.replace(/\s+T\d+$/, '')} T${tickCount}` : label;
    } else if (/\b(crew|target|dispatch|desk|client|archive)\b/i.test(id)) {
      next.color =
        targetDone >= targetTotal && targetTotal > 0
          ? '#22c55e'
          : targetRunning > 0 || targetDone > 0
            ? '#facc15'
            : node.color || '#64748b';
      next.label = targetTotal > 0 ? `${label.replace(/\s+\d+\/\d+$/, '')} ${targetDone}/${targetTotal}` : label;
    }
    return next;
  });
}

function createDemoNetworkLinks(
  currentLinks: unknown,
  nodesValue: unknown,
  workflow: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const links = normalizeDemoRecordList(currentLinks);
  if (links.length > 0) {
    const percent = normalizeDemoPercent(workflow.percent);
    return links.map((link, index) => {
      if (percent <= 0) return { ...link };
      const active = index <= Math.max(0, Math.ceil((percent / 100) * links.length) - 1);
      return {
        ...link,
        type: active ? 'ref' : link.type,
      };
    });
  }
  const nodes = normalizeDemoRecordList(nodesValue);
  const hub = nodes[0]?.id;
  if (!hub) return [];
  return nodes.slice(1).map((node) => ({
    source: normalizeDemoCellText(hub),
    target: normalizeDemoCellText(node.id),
  }));
}

function countDemoStatus(list: Array<Record<string, unknown>>, statuses: string[]): number {
  const statusSet = new Set(statuses.map((item) => item.toLowerCase()));
  return list.filter((item) => statusSet.has(normalizeDemoCellText(item.status).toLowerCase())).length;
}

function countDemoSchedulerTicks(scheduler: Record<string, unknown>): number {
  return Object.entries(scheduler).filter(
    ([key, value]) => /^tick\d+$/i.test(key) && normalizeDemoCellText(value).toLowerCase() === '#22c55e',
  ).length;
}

function normalizeDemoPercent(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? Math.max(0, Math.min(100, Math.round(numberValue))) : 0;
}

function normalizeDemoCellText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function setDemoFixturePath(
  fixture: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const target = cloneDemoFixture(fixture);
  const parts = String(path || '')
    .split('.')
    .filter(Boolean);
  if (parts.length === 0) return normalizeDemoFixture(target);
  let cursor: Record<string, unknown> | unknown[] = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const nextPart = parts[index + 1];
    const key = pathPartKey(part);
    const current = readContainerValue(cursor, key);
    if (!isContainerValue(current)) {
      writeContainerValue(cursor, key, isNumericPathPart(nextPart) ? [] : {});
    }
    cursor = readContainerValue(cursor, key) as Record<string, unknown> | unknown[];
  }
  writeContainerValue(cursor, pathPartKey(parts[parts.length - 1]), value);
  return normalizeDemoFixture(target);
}

export function applyDemoHostUpdateToFixture(
  fixture: Record<string, unknown>,
  update: Record<string, unknown> = {},
): Record<string, unknown> {
  const target = cloneDemoFixture(fixture);
  const path = String(update.target || '').trim();
  const value = update.dataTemplate ?? update.data ?? update.value ?? {};

  if (path === 'record') {
    mergeDemoFixtureValue(ensureDemoRecord(target, 'record'), value);
  } else if (path === 'global') {
    mergeDemoFixtureValue(ensureDemoRecord(target, 'global'), value);
  } else if (path.startsWith('record.') || path.startsWith('global.')) {
    const current = readDemoPath(target, path);
    return setDemoFixturePath(
      target,
      path,
      isPlainRecord(current) && isPlainRecord(value) ? { ...current, ...value } : value,
    );
  } else {
    const record = ensureDemoRecord(target, 'record');
    const updates = Array.isArray(record.hostUpdates) ? record.hostUpdates : [];
    record.hostUpdates = [
      ...updates,
      {
        type: update.type || 'hostUpdate',
        target: path,
        data: value,
      },
    ].slice(-40);
  }

  return normalizeDemoFixture(target);
}

export function updateDemoWorkflowFixture(
  fixture: Record<string, unknown>,
  status: 'running' | 'completed',
): Record<string, unknown> {
  const target = cloneDemoFixture(fixture);
  const record = ensureDemoRecord(target, 'record');
  const workflow = ensureDemoRecord(record, 'workflow');
  if (status === 'running') {
    workflow.status = 'Workflow running...';
    workflow.statusColor = '#38bdf8';
    workflow.percent = Math.max(15, Number(workflow.percent || 0));
    workflow.percentLabel = `${workflow.percent}%`;
    workflow.fillWidth = Math.max(120, Number(workflow.fillWidth || 0));
    workflow.lastEvent = 'Workflow action started.';
    return normalizeDemoFixture(target);
  }

  workflow.status = 'Workflow completed. Fixture is synchronized.';
  workflow.statusColor = '#22c55e';
  workflow.percent = 100;
  workflow.percentLabel = '100%';
  workflow.fillWidth = Math.max(720, Number(workflow.fillWidth || 0));
  workflow.lastEvent = 'Workflow replay completed.';
  record.status = workflow.status;
  record.updatedAt = 'workflow completed';
  return normalizeDemoFixture(target);
}

export function applyDemoWorkflowEventToFixture(
  fixture: Record<string, unknown>,
  event: Record<string, unknown> = {},
): Record<string, unknown> {
  const target = cloneDemoFixture(fixture);
  const record = ensureDemoRecord(target, 'record');
  const workflow = ensureDemoRecord(record, 'workflow');
  const queue = ensureDemoRecord(record, 'queue');
  const scheduler = ensureDemoRecord(record, 'scheduler');
  const kind = String(event.kind || event.type || event.status || 'event');
  const actionId = String(event.actionId || event.id || event.name || 'workflow');

  workflow.eventCount = Number(workflow.eventCount || 0) + 1;
  workflow.lastEvent = describeDemoWorkflowEvent({ ...event, kind, actionId });

  if (kind === 'action:start' || kind === 'running' || kind === 'queued') {
    workflow.status = kind === 'queued' ? `Queued ${actionId}` : `Running ${actionId}`;
    workflow.statusColor = '#38bdf8';
    setDemoWorkflowProgress(workflow, Math.max(Number(workflow.percent || 0), 12));
  } else if (kind === 'action:end' || kind === 'completed' || kind === 'done') {
    workflow.status = `Completed ${actionId}`;
    workflow.statusColor = '#22c55e';
    setDemoWorkflowProgress(workflow, Math.max(Number(workflow.percent || 0), 72));
  } else if (kind === 'action:fail' || kind === 'action:error' || kind === 'failed' || kind === 'error') {
    workflow.status = `Failed ${actionId}`;
    workflow.statusColor = '#ef4444';
  } else if (kind === 'queue:start') {
    queue.total = Number(event.total || event.count || event.items || queue.total || 0);
    queue.done = 0;
    queue.status = `Queue ${actionId} started`;
    syncDemoQueueProgress(queue, workflow);
  } else if (kind === 'queue:item:start') {
    queue.active = Number(queue.active || 0) + 1;
    queue.status = `Queue ${actionId} processing`;
    updateDemoIndexedRecordItem(record, event, 'running');
    syncDemoQueueProgress(queue, workflow);
  } else if (kind === 'queue:item:end') {
    queue.active = Math.max(0, Number(queue.active || 0) - 1);
    queue.total = Number(event.total || event.count || queue.total || 0);
    queue.done = Math.min(Number(queue.total || Number.MAX_SAFE_INTEGER), Number(queue.done || 0) + 1);
    queue.status = `Queue ${actionId} item completed`;
    updateDemoIndexedRecordItem(record, event, 'done');
    syncDemoQueueProgress(queue, workflow);
  } else if (kind === 'queue:end') {
    queue.total = Number(event.total || event.count || queue.total || queue.done || 0);
    queue.done = queue.total;
    queue.status = `Queue ${actionId} completed`;
    syncDemoQueueProgress(queue, workflow);
  } else if (kind === 'scheduler:start') {
    const iterations = Number(event.iterations || event.runs || event.count || 0);
    scheduler.label = `Scheduler ${actionId} started`;
    scheduler.ticks = 0;
    if (iterations > 0) scheduler.iterations = iterations;
    setDemoWorkflowProgress(workflow, Math.max(Number(workflow.percent || 0), 42));
  } else if (kind === 'scheduler:tick:start' || kind === 'scheduler:tick:end') {
    const tick = Number(event.tick || event.index || 1);
    scheduler.ticks = Math.max(Number(scheduler.ticks || 0), tick);
    scheduler.label = `Scheduler ${actionId} tick ${tick}`;
    scheduler[`tick${tick}`] = '#22c55e';
    pulseDemoRecordMetrics(record, tick);
    setDemoWorkflowProgress(workflow, Math.max(Number(workflow.percent || 0), Math.min(95, 60 + tick * 8)));
  } else if (kind === 'scheduler:end') {
    const iterations = Number(event.iterations || event.runs || event.count || scheduler.ticks || 0);
    scheduler.ticks = Math.max(Number(scheduler.ticks || 0), iterations);
    scheduler.label = `Scheduler ${actionId} completed`;
    for (let index = 1; index <= Math.min(12, Number(scheduler.ticks || 0)); index += 1) {
      scheduler[`tick${index}`] = '#22c55e';
    }
    workflow.status = 'Workflow completed. Fixture is synchronized.';
    workflow.statusColor = '#22c55e';
    setDemoWorkflowProgress(workflow, 100);
  }

  return normalizeDemoFixture(target);
}

export const BUILT_IN_DEMO = `\`\`\`xcon-demo
format "xcon-demo-preset/v1"
demo "Desk Demo Lab Player"
mode "read-only"
scene.1.id "brief"
scene.1.title "Read preset"
scene.1.caption "The Desk pane loads a portable xcon-demo-preset/v1 document."
scene.1.action "render"
scene.1.actions [{"type":"caption","text":"Load the xcon-demo preset and prepare the source panel.","duration":220},{"type":"focus","target":"source","duration":180},{"type":"typeText","target":"source","text":"xcon-demo preset\\nformat: xcon-demo-preset/v1\\nscene.1.action: render","duration":300},{"type":"cursorMove","target":"source","x":68,"y":42,"duration":120}]
scene.1.duration 700
scene.2.id "artifact"
scene.2.title "Render artifact"
scene.2.caption "Markdown and XCON/SKETCH are rendered through the public viewer path."
scene.2.action "render"
scene.2.actions [{"type":"caption","text":"Render Markdown and SKETCH in the artifact pane.","duration":220},{"type":"focus","target":"preview","duration":160},{"type":"highlight","target":"artifact","text":"Artifact render target","duration":180},{"type":"callout","target":"artifact","text":"XCON/SKETCH is now visible inside the same pane.","duration":180},{"type":"render","target":"artifact","duration":260},{"type":"cursorMove","target":"preview","x":164,"y":76,"duration":120}]
scene.2.duration 900
scene.3.id "workflow"
scene.3.title "Review workflow"
scene.3.caption "Scene metadata is visible without opening the full editor."
scene.3.action "workflow"
scene.3.actions [{"type":"caption","text":"Replay workflow metadata without switching to the full editor.","duration":160},{"type":"fixture","target":"fixture","status":"loaded","text":"Fixture JSON loaded","duration":160},{"type":"chain","target":"chain","status":"bound","text":"Chain aliases resolved","duration":160},{"type":"workflowEvent","target":"workflow","status":"completed","text":"Workflow event applied","duration":180},{"type":"wait","target":"runtime","text":"Hold for operator review","duration":140},{"type":"workflow","target":"scene-runner","duration":240},{"type":"cursorMove","target":"timeline","x":232,"y":104,"duration":120}]
scene.3.duration 900
\`\`\`

# Demo Lab Player

This read-only player previews Demo Lab documents inside Xenesis Desk. It is the first step before embedding the full timeline editor.

\`\`\`xcon-sketch
screen "Desk Demo Lab" 720x360 bg #f8fafc
  header: panel at 24 24 672 72
    bg #0f172a
    radius 18
    title: label "XCON Demo Lab Player" at 24 18 300 28
      color #ffffff
      font
        size 24
        weight 800
    status: label "Read-only preset" at 512 22 128 24
      bg #0369a1
      color #e0f2fe
      radius 12
      align center
      font
        size 12
        weight 700
  stage: panel at 40 128 312 160
    bg #ffffff
    border
      visible true
      color #dbeafe
      radius 16
    label1: label "Markdown" at 28 26 140 24
      color #1e3a8a
      font
        size 18
        weight 800
    label2: label "+ SKETCH" at 28 60 140 24
      color #0f766e
      font
        size 18
        weight 800
    label3: label "+ Workflow scenes" at 28 94 184 24
      color #7c3aed
      font
        size 18
        weight 800
  timeline: panel at 392 128 288 160
    bg #111827
    radius 16
    s1: label "1  Read preset" at 26 26 170 22
      color #bae6fd
      font
        size 14
        weight 700
    s2: label "2  Render artifact" at 26 66 190 22
      color #bbf7d0
      font
        size 14
        weight 700
    s3: label "3  Review workflow" at 26 106 190 22
      color #ddd6fe
      font
        size 14
        weight 700
\`\`\`
`;

export function extractFence(source: string, language: string): string {
  const normalizedLanguage = String(language || '')
    .trim()
    .toLowerCase();
  const fence = collectDemoFences(source).find((item) => item.lang === normalizedLanguage);
  return fence?.content.trim() ?? '';
}

export function withoutDemoFence(source: string): string {
  const input = String(source || '');
  const fence = collectDemoFences(input).find((item) => item.lang === 'xcon-demo');
  if (!fence) return input.trim();
  return `${input.slice(0, fence.start)}${input.slice(fence.end)}`.trim();
}

function parseQuotedValue(line: string): string | null {
  const match = /"((?:\\.|[^"\\])*)"/.exec(line);
  if (!match) return null;
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return match[1];
  }
}

function parseJsonValue(rawValue: string): unknown {
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function parseDemoFixture(fixtureText: string): Record<string, unknown> {
  if (!fixtureText.trim()) return { record: {} };
  try {
    const parsed = JSON.parse(fixtureText) as unknown;
    return isPlainRecord(parsed) ? parsed : { record: parsed };
  } catch {
    return {
      record: {},
      fixtureError: 'Invalid JSON fixture',
    };
  }
}

function removeHiddenDemoFences(source: string, fences = collectDemoFences(source)): string {
  let output = String(source || '');
  for (const fence of [...fences].reverse()) {
    if (DEMO_HIDDEN_LANGS.has(fence.lang)) {
      output = `${output.slice(0, fence.start)}${output.slice(fence.end)}`;
    }
  }
  return removeOpenHiddenDemoFence(output)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function removeOpenHiddenDemoFence(source: string): string {
  const input = String(source || '');
  const openFence = findOpenMarkdownCodeFence(input);
  const { lang } = getMarkdownCodeFenceInfo(openFence?.info || '');
  if (openFence && DEMO_HIDDEN_LANGS.has(lang)) {
    return input.slice(0, openFence.start).trimEnd();
  }
  return input;
}

function applyDemoVariablesToMarkdown(
  markdown: string,
  aliases: Record<string, unknown>,
  fixture: Record<string, unknown>,
): string {
  const fences = collectDemoFences(markdown);
  if (fences.length === 0) return applyDemoVariables(markdown, aliases, false, fixture);

  let output = '';
  let cursor = 0;
  for (const fence of fences) {
    output += applyDemoVariables(markdown.slice(cursor, fence.start), aliases, false, fixture);
    output += markdown.slice(fence.start, fence.contentStart);
    output += applyDemoVariables(fence.content, aliases, DEMO_SKETCH_LANGS.has(fence.lang), fixture);
    output += markdown.slice(fence.contentEnd, fence.end);
    cursor = fence.end;
  }
  output += applyDemoVariables(markdown.slice(cursor), aliases, false, fixture);
  return output;
}

function applyDemoVariables(
  text: string,
  aliases: Record<string, unknown>,
  sketchMode: boolean,
  fixture: Record<string, unknown>,
): string {
  const data = {
    ...aliases,
    record: isPlainRecord(fixture.record) ? fixture.record : {},
    global: isPlainRecord(fixture.global) ? fixture.global : {},
  };
  const source = sketchMode ? applyDemoInlineChainTemplates(String(text || ''), data, sketchMode) : String(text || '');
  return source.replace(/\$([A-Za-z_][\w-]*(?:\.(?:[A-Za-z_][\w-]*|\d+))*)/g, (match, path, offset, fullText) => {
    const value = readDemoPath(data, path);
    if (value === undefined) return match;
    if (sketchMode) return formatDemoValueForReplacement(value, fullText, offset);
    return value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  });
}

function applyDemoInlineChainTemplates(text: string, data: Record<string, unknown>, sketchMode: boolean): string {
  let output = String(text || '');
  let searchStart = 0;
  for (let iteration = 0; iteration < 64; iteration += 1) {
    const range = findInnermostDemoTemplateRange(output, searchStart);
    if (!range) return output;
    const expression = output.slice(range.start + 2, range.end - 2).trim();
    if (!shouldEvaluateDemoInlineExpression(expression, data)) {
      searchStart = range.end;
      continue;
    }
    const value = evaluateDemoInlineExpression(expression, data);
    output = `${output.slice(0, range.start)}${formatDemoValueForReplacement(value, output, range.start)}${output.slice(range.end)}`;
    searchStart = 0;
  }
  return output;
}

function findInnermostDemoTemplateRange(text: string, startIndex = 0): { start: number; end: number } | null {
  const stack: number[] = [];
  for (let index = Math.max(0, startIndex); index < text.length - 1; index += 1) {
    const pair = text.slice(index, index + 2);
    if (pair === '{{') {
      stack.push(index);
      index += 1;
      continue;
    }
    if (pair !== '}}') continue;
    const start = stack.pop();
    if (start === undefined) continue;
    return { start, end: index + 2 };
  }
  return null;
}

function shouldEvaluateDemoInlineExpression(expression: string, data: Record<string, unknown>): boolean {
  const input = String(expression || '').trim();
  if (!input) return false;
  if (input.startsWith('=')) return true;
  if (/^(let|return)\s+/.test(input)) return true;
  const root = getDemoInlineExpressionRoot(input);
  return root === 'record' || root === 'global' || Object.hasOwn(data, root);
}

function getDemoInlineExpressionRoot(expression: string): string {
  let input = String(expression || '').trim();
  if (input.startsWith('=')) input = input.slice(1).trim();
  const rootSource = input.split('|')[0]?.trim() || '';
  const match = rootSource.match(/^\$?([A-Za-z_][\w-]*)/);
  return match ? match[1] : '';
}

function evaluateDemoInlineExpression(expression: string, data: Record<string, unknown>): unknown {
  const input = String(expression || '').trim();
  if (!input) return '';
  const sugarSource = !input.startsWith('=') && input.includes('|') ? `= ${input}` : input;
  try {
    return isSugarExpression(sugarSource) ? evaluateSugar(sugarSource, data) : evaluate(sugarSource, data);
  } catch (error) {
    return `Chain error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function formatDemoValueForReplacement(value: unknown, fullText: string, offset: number): string {
  const quoted = isInsideDemoDoubleQuotedString(fullText, offset);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return quoted ? escapeDemoStringFragment(value) : JSON.stringify(value);
  return JSON.stringify(value);
}

function getDemoChainAlias(args: string): string {
  const match = String(args || '')
    .trim()
    .match(/^as(?:=|:|\s+)([A-Za-z_][\w-]*)$/);
  return match ? match[1] : '';
}

function readDemoPath(source: Record<string, unknown>, path: string): unknown {
  return String(path || '')
    .split('.')
    .reduce<unknown>((cursor, key) => {
      if (cursor == null) return undefined;
      if (Array.isArray(cursor) && /^\d+$/.test(key)) return cursor[Number(key)];
      if (isPlainRecord(cursor)) return cursor[key];
      return undefined;
    }, source);
}

function isInsideDemoDoubleQuotedString(text: string, offset: number): boolean {
  let quoteCount = 0;
  for (let index = 0; index < offset; index += 1) {
    if (text[index] !== '"') continue;
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
      slashCount += 1;
    }
    if (slashCount % 2 === 0) quoteCount += 1;
  }
  return quoteCount % 2 === 1;
}

function escapeDemoStringFragment(value: string): string {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isContainerValue(value: unknown): value is Record<string, unknown> | unknown[] {
  return Boolean(value) && typeof value === 'object';
}

function isNumericPathPart(value: string | undefined): boolean {
  return typeof value === 'string' && /^\d+$/.test(value);
}

function pathPartKey(value: string): string | number {
  return isNumericPathPart(value) ? Number(value) : value;
}

function readContainerValue(container: Record<string, unknown> | unknown[], key: string | number): unknown {
  return Array.isArray(container) ? container[Number(key)] : container[String(key)];
}

function writeContainerValue(
  container: Record<string, unknown> | unknown[],
  key: string | number,
  value: unknown,
): void {
  if (Array.isArray(container)) {
    container[Number(key)] = value;
  } else {
    container[String(key)] = value;
  }
}

function mergeDemoFixtureValue(target: Record<string, unknown>, value: unknown): void {
  if (!isPlainRecord(value)) return;
  for (const [key, item] of Object.entries(value)) {
    const current = target[key];
    if (isPlainRecord(current) && isPlainRecord(item)) {
      mergeDemoFixtureValue(current, item);
    } else {
      target[key] = item;
    }
  }
}

function ensureDemoRecord(target: Record<string, unknown>, key: string): Record<string, unknown> {
  const current = target[key];
  if (!isPlainRecord(current)) target[key] = {};
  return target[key] as Record<string, unknown>;
}

function setDemoWorkflowProgress(workflow: Record<string, unknown>, percent: number): void {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(percent || 0))));
  workflow.percent = normalized;
  workflow.percentLabel = `${normalized}%`;
  workflow.fillWidth = Math.round(normalized * 7.2);
}

function syncDemoQueueProgress(queue: Record<string, unknown>, workflow: Record<string, unknown>): void {
  const total = Number(queue.total || 0);
  const done = Number(queue.done || 0);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  queue.percent = percent;
  queue.percentLabel = `${percent}%`;
  queue.fillWidth = Math.round(percent * 7.2);
  queue.doneText = `${done} / ${total} completed`;
  setDemoWorkflowProgress(workflow, Math.max(Number(workflow.percent || 0), Math.min(95, percent)));
}

function describeDemoWorkflowEvent(event: Record<string, unknown>): string {
  const kind = event.kind || event.type || 'event';
  const id = event.actionId || event.id || event.name || 'workflow';
  if (kind === 'queue:item:start' || kind === 'queue:item:end') {
    return `${kind} ${id} #${Number(event.index || 0) + 1}`;
  }
  if (kind === 'scheduler:tick:start' || kind === 'scheduler:tick:end') {
    return `${kind} ${id} tick ${event.tick || event.index || 1}`;
  }
  return `${kind} ${id}`;
}

function updateDemoIndexedRecordItem(
  record: Record<string, unknown>,
  event: Record<string, unknown>,
  status: 'running' | 'done',
): void {
  const index = Number.isInteger(event.index) ? Number(event.index) : Number(event.itemIndex ?? -1);
  if (index < 0) return;
  const color = status === 'done' ? '#22c55e' : '#38bdf8';
  const label = status === 'done' ? 'Done' : 'Running';
  for (const key of ['channels', 'team', 'deliveryTargets', 'items']) {
    const list = Array.isArray(record[key]) ? (record[key] as unknown[]) : [];
    const item = list[index % Math.max(1, list.length)];
    if (!isPlainRecord(item)) continue;
    item.status = label;
    if ('color' in item || key !== 'team') item.color = color;
    if (typeof item.revenue === 'number') item.revenue += Math.max(4, Math.round(item.revenue * 0.08));
    if (typeof item.value === 'number') item.value += Math.max(2, Math.round(item.value * 0.06));
  }
}

function pulseDemoRecordMetrics(record: Record<string, unknown>, tick: number): void {
  if (isPlainRecord(record.metrics)) {
    if (typeof record.metrics.health === 'number') record.metrics.health = Math.min(100, record.metrics.health + 1);
    if (typeof record.metrics.growth === 'number') record.metrics.growth += 1;
    if (typeof record.metrics.revenue === 'number') record.metrics.revenue += 1200 * Math.max(1, Number(tick || 1));
  }
  const channels = Array.isArray(record.channels) ? record.channels : [];
  channels.forEach((item, index) => {
    if (!isPlainRecord(item)) return;
    if (typeof item.revenue === 'number' && index <= Number(tick || 0)) {
      item.revenue += Math.max(3, Math.round(item.revenue * 0.03));
    }
  });
}

function normalizeNumber(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function normalizeActionValue(value: unknown): DemoSceneAction['value'] | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return undefined;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  if (value.trim().toLowerCase() === 'true') return true;
  if (value.trim().toLowerCase() === 'false') return false;
  return undefined;
}

function normalizeBlockValue(rawValue: string): unknown {
  const value = rawValue.trim();
  if (!value) return undefined;
  if (value.startsWith('{') || value.startsWith('[')) {
    const parsedJson = parseJsonValue(value);
    if (parsedJson !== null) return parsedJson;
  }
  const quotedValue = parseQuotedValue(value);
  if (quotedValue !== null) return quotedValue;
  const parsedJson = parseJsonValue(value);
  if (parsedJson !== null) return parsedJson;
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return numericValue;
  const booleanValue = normalizeBoolean(value);
  if (booleanValue !== undefined) return booleanValue;
  return value;
}

function getLineIndent(line: string): number {
  const match = /^[\t ]*/.exec(line);
  return [...(match?.[0] ?? '')].reduce((sum, char) => sum + (char === '\t' ? 2 : 1), 0);
}

function getBlockActionDuration(actions: DemoSceneAction[]): number {
  return actions.reduce((sum, action) => {
    const duration = normalizeNumber(action.duration);
    return sum + Math.max(80, Math.round(duration ?? 80));
  }, 0);
}

function applyBlockSceneProperty(scene: Partial<DemoScene>, line: string): void {
  const match = /^(id|title|caption|action|duration)\s*(.*)$/i.exec(line);
  if (!match) return;
  const property = match[1] as 'id' | 'title' | 'caption' | 'action' | 'duration';
  const value = normalizeBlockValue(match[2]);
  if (property === 'duration') {
    const duration = normalizeNumber(value);
    if (duration !== undefined) scene.duration = Math.max(200, duration);
    return;
  }
  if (value !== undefined) {
    scene[property] = String(value);
  }
}

function applyBlockActionProperty(action: DemoSceneAction, line: string): void {
  const match =
    /^(target|text|value|data|status|path|label|easing|clear|append|keep|replace|fadeIn|fadeOut|hold|x|y|width|height|w|h|top|left|behavior|duration)\s*(.*)$/i.exec(
      line,
    );
  if (!match) return;
  const property = match[1] as keyof DemoSceneAction;
  const value = normalizeBlockValue(match[2]);
  if (
    property === 'x' ||
    property === 'y' ||
    property === 'duration' ||
    property === 'fadeIn' ||
    property === 'fadeOut' ||
    property === 'hold' ||
    property === 'width' ||
    property === 'height' ||
    property === 'w' ||
    property === 'h' ||
    property === 'top' ||
    property === 'left'
  ) {
    const numericValue = normalizeNumber(value);
    if (numericValue !== undefined) {
      action[property] = property === 'duration' ? Math.max(80, numericValue) : numericValue;
    }
    return;
  }
  if (property === 'clear' || property === 'append' || property === 'keep' || property === 'replace') {
    const booleanValue = normalizeBoolean(value);
    if (booleanValue !== undefined) action[property] = booleanValue;
    return;
  }
  if (property === 'value' || property === 'data') {
    const actionValue = normalizeActionValue(value);
    if (actionValue !== undefined) action[property] = actionValue;
    return;
  }
  if (value !== undefined) {
    action[property] = String(value);
  }
}

function createBlockScene(scene: Partial<DemoScene>, index: number): DemoScene {
  const actions = Array.isArray(scene.actions)
    ? scene.actions.map(normalizeDemoSceneAction).filter((action): action is DemoSceneAction => Boolean(action))
    : [];
  const actionDuration = getBlockActionDuration(actions);
  return {
    id: scene.id ?? `scene-${index}`,
    title: scene.title ?? `Scene ${index}`,
    caption: scene.caption ?? '',
    action: scene.action ?? actions[0]?.type ?? 'render',
    actions,
    duration: scene.duration ?? (actionDuration > 0 ? Math.max(200, actionDuration) : 700),
  };
}

function parseDemoBlockScenes(fence: string): DemoScene[] {
  const scenes: DemoScene[] = [];
  let currentScene: Partial<DemoScene> | null = null;
  let currentSceneIndent = 0;
  let actionsIndent: number | null = null;
  let currentAction: DemoSceneAction | null = null;
  let currentActionIndent = 0;

  const finishAction = () => {
    if (!currentScene || !currentAction) return;
    const normalizedAction = normalizeDemoSceneAction(currentAction);
    if (normalizedAction) {
      currentScene.actions = [...(currentScene.actions ?? []), normalizedAction];
    }
    currentAction = null;
  };

  const finishScene = () => {
    if (!currentScene) return;
    finishAction();
    scenes.push(createBlockScene(currentScene, scenes.length + 1));
    currentScene = null;
    actionsIndent = null;
  };

  for (const rawLine of fence.split(/\r?\n/)) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
    const indent = getLineIndent(rawLine);
    const sceneMatch = /^scene(?:\s+(.+))?$/i.exec(trimmedLine);
    if (sceneMatch) {
      finishScene();
      currentSceneIndent = indent;
      currentScene = {
        title: normalizeString(normalizeBlockValue(sceneMatch[1] ?? '')) ?? `Scene ${scenes.length + 1}`,
        action: 'render',
      };
      actionsIndent = null;
      continue;
    }

    if (!currentScene) continue;

    if (indent <= currentSceneIndent) {
      finishScene();
      continue;
    }

    if (/^actions$/i.test(trimmedLine)) {
      finishAction();
      actionsIndent = indent;
      continue;
    }

    if (actionsIndent !== null && indent > actionsIndent) {
      if (!currentAction || indent <= currentActionIndent) {
        finishAction();
        const type = /^action\s+(.+)$/i.exec(trimmedLine)?.[1]?.trim() ?? trimmedLine;
        currentAction = { type };
        currentActionIndent = indent;
        continue;
      }
      applyBlockActionProperty(currentAction, trimmedLine);
      continue;
    }

    finishAction();
    actionsIndent = null;
    applyBlockSceneProperty(currentScene, trimmedLine);
  }

  finishScene();
  return scenes;
}

export function normalizeDemoSceneAction(value: unknown): DemoSceneAction | null {
  if (typeof value === 'string') {
    const type = value.trim();
    return type ? { type } : null;
  }
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const type = normalizeString(record.type)?.trim();
  if (!type) return null;

  const duration = normalizeNumber(record.duration);
  return {
    type,
    ...(normalizeString(record.target) !== undefined ? { target: normalizeString(record.target) } : {}),
    ...(normalizeString(record.text) !== undefined ? { text: normalizeString(record.text) } : {}),
    ...(normalizeActionValue(record.value) !== undefined ? { value: normalizeActionValue(record.value) } : {}),
    ...(normalizeActionValue(record.data) !== undefined ? { data: normalizeActionValue(record.data) } : {}),
    ...(normalizeString(record.status) !== undefined ? { status: normalizeString(record.status) } : {}),
    ...(normalizeString(record.path) !== undefined ? { path: normalizeString(record.path) } : {}),
    ...(normalizeString(record.label) !== undefined ? { label: normalizeString(record.label) } : {}),
    ...(normalizeString(record.easing) !== undefined ? { easing: normalizeString(record.easing) } : {}),
    ...(normalizeBoolean(record.clear) !== undefined ? { clear: normalizeBoolean(record.clear) } : {}),
    ...(normalizeBoolean(record.append) !== undefined ? { append: normalizeBoolean(record.append) } : {}),
    ...(normalizeBoolean(record.keep) !== undefined ? { keep: normalizeBoolean(record.keep) } : {}),
    ...(normalizeBoolean(record.replace) !== undefined ? { replace: normalizeBoolean(record.replace) } : {}),
    ...(normalizeNumber(record.fadeIn) !== undefined ? { fadeIn: normalizeNumber(record.fadeIn) } : {}),
    ...(normalizeNumber(record.fadeOut) !== undefined ? { fadeOut: normalizeNumber(record.fadeOut) } : {}),
    ...(normalizeNumber(record.hold) !== undefined ? { hold: normalizeNumber(record.hold) } : {}),
    ...(normalizeNumber(record.x) !== undefined ? { x: normalizeNumber(record.x) } : {}),
    ...(normalizeNumber(record.y) !== undefined ? { y: normalizeNumber(record.y) } : {}),
    ...(normalizeNumber(record.width) !== undefined ? { width: normalizeNumber(record.width) } : {}),
    ...(normalizeNumber(record.height) !== undefined ? { height: normalizeNumber(record.height) } : {}),
    ...(normalizeNumber(record.w) !== undefined ? { w: normalizeNumber(record.w) } : {}),
    ...(normalizeNumber(record.h) !== undefined ? { h: normalizeNumber(record.h) } : {}),
    ...(normalizeNumber(record.top) !== undefined ? { top: normalizeNumber(record.top) } : {}),
    ...(normalizeNumber(record.left) !== undefined ? { left: normalizeNumber(record.left) } : {}),
    ...(normalizeString(record.behavior) !== undefined ? { behavior: normalizeString(record.behavior) } : {}),
    ...(duration === undefined ? {} : { duration: Math.max(80, duration) }),
  };
}

function hasActionField(action: DemoSceneAction, field: keyof DemoSceneAction): boolean {
  const value = action[field];
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function hasActionPoint(action: DemoSceneAction): boolean {
  if (hasActionField(action, 'x') && hasActionField(action, 'y')) return true;
  if (hasActionField(action, 'left') && hasActionField(action, 'top')) return true;
  if (!action.value || typeof action.value !== 'object') return false;
  const value = action.value as Record<string, unknown>;
  const x = normalizeNumber(value.x) ?? normalizeNumber(value.left);
  const y = normalizeNumber(value.y) ?? normalizeNumber(value.top);
  return x !== undefined && y !== undefined;
}

export function validateDemoManifest(manifest: DemoManifest): DemoManifestDiagnostic[] {
  const diagnostics: DemoManifestDiagnostic[] = [];

  manifest.scenes.forEach((scene, sceneIndex) => {
    getSceneActions(scene).forEach((action, actionIndex) => {
      const sceneNumber = sceneIndex + 1;
      const actionNumber = actionIndex + 1;
      const contract = DEMO_ACTION_CONTRACTS[action.type];

      if (!contract) {
        diagnostics.push({
          severity: 'warning',
          path: `scene.${sceneNumber}.actions.${actionNumber}.type`,
          message: `Unknown demo action type "${action.type}".`,
        });
        return;
      }

      for (const field of contract.requiredFields ?? []) {
        if ((field === 'x' || field === 'y') && hasActionPoint(action)) continue;
        if (action.type.toLowerCase() === 'setfixture' && field === 'value' && hasActionField(action, 'data')) continue;
        if (action.type.toLowerCase() === 'workflowevent' && field === 'status') {
          const event = isPlainRecord(action.value) ? action.value : isPlainRecord(action.data) ? action.data : {};
          if (
            hasActionField(action, 'text') ||
            hasActionField(action, 'status') ||
            'kind' in event ||
            'type' in event ||
            'status' in event
          )
            continue;
        }
        if (!hasActionField(action, field)) {
          diagnostics.push({
            severity: 'error',
            path: `scene.${sceneNumber}.actions.${actionNumber}.${field}`,
            message: `Action "${action.type}" requires ${field}.`,
          });
        }
      }
    });
  });

  return diagnostics;
}

export function getSceneActions(scene: DemoScene): DemoSceneAction[] {
  if (Array.isArray(scene.actions) && scene.actions.length > 0) {
    return scene.actions;
  }

  const actions: DemoSceneAction[] = [];
  if (scene.caption) {
    actions.push({ type: 'caption', text: scene.caption, duration: Math.min(scene.duration, 240) });
  }
  actions.push({ type: scene.action || 'render', target: scene.id, duration: scene.duration });
  return actions;
}

function quoteDemoValue(value: string): string {
  return JSON.stringify(value);
}

function serializeDemoAction(action: DemoSceneAction): DemoSceneAction {
  return {
    type: action.type,
    ...(action.target !== undefined ? { target: action.target } : {}),
    ...(action.text !== undefined ? { text: action.text } : {}),
    ...(action.value !== undefined ? { value: action.value } : {}),
    ...(action.data !== undefined ? { data: action.data } : {}),
    ...(action.status !== undefined ? { status: action.status } : {}),
    ...(action.path !== undefined ? { path: action.path } : {}),
    ...(action.label !== undefined ? { label: action.label } : {}),
    ...(action.easing !== undefined ? { easing: action.easing } : {}),
    ...(action.clear !== undefined ? { clear: action.clear } : {}),
    ...(action.append !== undefined ? { append: action.append } : {}),
    ...(action.keep !== undefined ? { keep: action.keep } : {}),
    ...(action.replace !== undefined ? { replace: action.replace } : {}),
    ...(action.fadeIn !== undefined ? { fadeIn: action.fadeIn } : {}),
    ...(action.fadeOut !== undefined ? { fadeOut: action.fadeOut } : {}),
    ...(action.hold !== undefined ? { hold: action.hold } : {}),
    ...(action.x !== undefined ? { x: action.x } : {}),
    ...(action.y !== undefined ? { y: action.y } : {}),
    ...(action.width !== undefined ? { width: action.width } : {}),
    ...(action.height !== undefined ? { height: action.height } : {}),
    ...(action.w !== undefined ? { w: action.w } : {}),
    ...(action.h !== undefined ? { h: action.h } : {}),
    ...(action.top !== undefined ? { top: action.top } : {}),
    ...(action.left !== undefined ? { left: action.left } : {}),
    ...(action.behavior !== undefined ? { behavior: action.behavior } : {}),
    ...(action.duration !== undefined ? { duration: action.duration } : {}),
  };
}

function serializeDemoActions(scene: DemoScene): string {
  return JSON.stringify(getSceneActions(scene).map(serializeDemoAction));
}

function getSerializedSceneDuration(scene: DemoScene): number {
  const actionDuration = getSceneActions(scene).reduce((sum, action) => {
    const duration = normalizeNumber(action.duration);
    return sum + Math.max(80, Math.round(duration ?? 80));
  }, 0);
  return Math.max(200, Math.round(scene.duration || 700), actionDuration);
}

export function serializeDemoManifest(manifest: DemoManifest): string {
  const lines = [
    '```xcon-demo',
    `format ${quoteDemoValue(manifest.format || 'xcon-demo-preset/v1')}`,
    `demo ${quoteDemoValue(manifest.title || 'Demo Lab Player')}`,
    `mode ${quoteDemoValue(manifest.mode || 'editable')}`,
  ];

  manifest.scenes.forEach((scene, index) => {
    const sceneNumber = index + 1;
    lines.push(
      `scene.${sceneNumber}.id ${quoteDemoValue(scene.id || `scene-${sceneNumber}`)}`,
      `scene.${sceneNumber}.title ${quoteDemoValue(scene.title || `Scene ${sceneNumber}`)}`,
      `scene.${sceneNumber}.caption ${quoteDemoValue(scene.caption || '')}`,
      `scene.${sceneNumber}.action ${quoteDemoValue(scene.action || 'render')}`,
      `scene.${sceneNumber}.actions ${serializeDemoActions(scene)}`,
      `scene.${sceneNumber}.duration ${getSerializedSceneDuration(scene)}`,
    );
  });

  lines.push('```');
  return lines.join('\n');
}

export function createDemoPresetSource(source: string, manifest: DemoManifest): string {
  const documentBody = withoutDemoFence(source);
  const serializedManifest = serializeDemoManifest({ ...manifest, mode: 'editable' });
  return documentBody ? `${serializedManifest}\n\n${documentBody}\n` : `${serializedManifest}\n`;
}

function parseSceneLine(line: string, scenes: Map<number, Partial<DemoScene>>): void {
  const match = /^scene\.(\d+)\.(id|title|caption|action|actions|duration)\s+(.+)$/i.exec(line.trim());
  if (!match) return;
  const index = Number(match[1]);
  const property = match[2] as keyof DemoScene;
  const rawValue = match[3].trim();
  const scene = scenes.get(index) ?? {};
  if (property === 'duration') {
    scene.duration = Math.max(200, Number(rawValue) || 700);
  } else if (property === 'actions') {
    const parsed = parseJsonValue(rawValue);
    scene.actions = Array.isArray(parsed)
      ? parsed.map(normalizeDemoSceneAction).filter((action): action is DemoSceneAction => Boolean(action))
      : [];
  } else {
    scene[property] = parseQuotedValue(rawValue) ?? rawValue;
  }
  scenes.set(index, scene);
}

export function parseDemoManifest(source: string): DemoManifest {
  const fence = extractFence(source, 'xcon-demo');
  const scenes = new Map<number, Partial<DemoScene>>();
  const blockScenes = parseDemoBlockScenes(fence);
  const heading = /^#\s+(.+)$/m.exec(source)?.[1]?.trim();
  let title = heading || 'Demo Lab Player';
  let format = fence ? 'xcon-demo-preset/v1' : 'markdown+xcon';
  let mode = 'read-only';

  for (const rawLine of fence.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('demo ')) title = parseQuotedValue(line) ?? title;
    if (line.startsWith('format ')) format = parseQuotedValue(line) ?? format;
    if (line.startsWith('mode ')) mode = parseQuotedValue(line) ?? mode;
    parseSceneLine(line, scenes);
  }

  const parsedLineScenes = [...scenes.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, scene]) => ({
      id: scene.id ?? `scene-${index}`,
      title: scene.title ?? `Scene ${index}`,
      caption: scene.caption ?? '',
      action: scene.action ?? 'render',
      actions: scene.actions,
      duration: scene.duration ?? 700,
    }));
  const parsedScenes = [...parsedLineScenes, ...blockScenes];

  return {
    title,
    format,
    mode,
    scenes:
      parsedScenes.length > 0
        ? parsedScenes
        : [
            {
              id: 'preview',
              title: 'Preview document',
              caption: 'Render the bundled document.',
              action: 'render',
              actions: [{ type: 'render', target: 'preview', duration: 700 }],
              duration: 700,
            },
          ],
  };
}

export function isSupportedDemoFile(file: OpenFileResult): boolean {
  const ext = file.ext.toLowerCase().replace(/^\./, '');
  return (
    file.contentType === 'markdown' ||
    file.contentType === 'code' ||
    ['md', 'markdown', 'xcon', 'xconj', 'xcons', 'sketch', 'txt'].includes(ext)
  );
}

export function hasRenderableDemoContent(source: string): boolean {
  return collectDemoFences(source).some((item) => item.lang === 'xcon-demo' || DEMO_SKETCH_LANGS.has(item.lang));
}
