import {
  buildXenesisVisibleSubagentWorkWorkers,
  parseXenesisVisibleSubagentRunOptions,
  type XenesisVisibleSubagentWorker,
} from './xenesisAgentVisibleSubagentsDemo';

export type VisibleSubagentExecutionMode = 'subagent-driven' | 'inline';

export type VisibleSubagentPlanSessionStatus =
  | 'planning'
  | 'awaiting-selection'
  | 'running'
  | 'summarizing'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface VisibleSubagentPlanSessionOptions {
  runId?: string;
  manualSelection?: boolean;
  keepOpen?: boolean;
  closeAfter?: boolean;
  showMs?: number;
  sleepSeconds?: number;
}

export interface VisibleSubagentPlanSession {
  id: string;
  userTask: string;
  status: VisibleSubagentPlanSessionStatus;
  modes: VisibleSubagentExecutionMode[];
  recommendedMode: VisibleSubagentExecutionMode;
  selectedMode?: VisibleSubagentExecutionMode;
  selectionSource?: 'auto' | 'manual' | 'default' | 'fallback';
  manualSelection: boolean;
  workers: XenesisVisibleSubagentWorker[];
  layoutPolicy: {
    rightWidth: number;
    bottomHeight: number;
    documentArrangement: 'grid';
  };
  cleanupPolicy: {
    keepOpen: boolean;
    closeAfter: boolean;
    showMs: number;
  };
  timeoutPolicy: {
    workerMarkerTimeoutMs: number;
    pollMs: number;
  };
}

export interface VisibleSubagentPlanSessionRunOptions {
  manualSelection: boolean;
  keepOpen: boolean;
  closeAfter: boolean;
  showMs: number;
  sleepSeconds: number;
  taskInput: string;
}

const DEFAULT_VISIBLE_PLAN_TASK = 'Inspect the current Xenesis Desk workspace and report status.';
const VISIBLE_PLAN_MODES: VisibleSubagentExecutionMode[] = ['subagent-driven', 'inline'];
const EXPLANATION_PATTERN = /(무슨\s*기능|뭔지\s*설명|설명해|explain|what\s+is|what'?s)/i;
const PLAN_INTENT_PATTERN =
  /(서브에이전트|subagent|visible\s+worker|visible\s+subagent).*(계획|plan|실행|run|execute|worker)|(?:계획|plan).*(서브에이전트|subagent|visible\s+worker)/i;

function createVisibleSubagentPlanSessionId(): string {
  return `vp-${Date.now().toString(36)}`;
}

function stripPlanOnlyOptions(input: string): string {
  return input
    .replace(/(?:^|\s)--manual(?=\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseVisibleSubagentPlanSessionOptions(
  input: string,
  options: { defaultTask?: string } = {},
): VisibleSubagentPlanSessionRunOptions {
  const manualSelection = /(?:^|\s)--manual(?=\s|$)/i.test(input);
  const parsed = parseXenesisVisibleSubagentRunOptions(stripPlanOnlyOptions(input), {
    defaultTask: options.defaultTask ?? DEFAULT_VISIBLE_PLAN_TASK,
  });

  return {
    manualSelection,
    keepOpen: parsed.keepOpen,
    closeAfter: parsed.closeAfter,
    showMs: parsed.showMs,
    sleepSeconds: parsed.sleepSeconds,
    taskInput: parsed.taskInput,
  };
}

export function buildVisibleSubagentPlanSession(
  userTask: string,
  options: VisibleSubagentPlanSessionOptions = {},
): VisibleSubagentPlanSession {
  const task = userTask.trim() || DEFAULT_VISIBLE_PLAN_TASK;
  const manualSelection = options.manualSelection === true;
  const keepOpen = options.keepOpen === true;
  const closeAfter = !keepOpen && options.closeAfter === true;
  const showMs = Number.isFinite(options.showMs)
    ? Math.max(0, Math.min(60000, Math.trunc(options.showMs ?? 6000)))
    : 6000;
  const sleepSeconds = Number.isFinite(options.sleepSeconds)
    ? Math.max(1, Math.min(300, Math.trunc(options.sleepSeconds ?? 45)))
    : 45;
  const id = (options.runId || createVisibleSubagentPlanSessionId()).trim();

  return {
    id,
    userTask: task,
    status: manualSelection ? 'awaiting-selection' : 'running',
    modes: [...VISIBLE_PLAN_MODES],
    recommendedMode: 'subagent-driven',
    ...(manualSelection
      ? {}
      : {
          selectedMode: 'subagent-driven' as const,
          selectionSource: 'auto' as const,
        }),
    manualSelection,
    workers: buildXenesisVisibleSubagentWorkWorkers(task, {
      runId: id,
      sleepSeconds,
    }),
    layoutPolicy: {
      rightWidth: 760,
      bottomHeight: 170,
      documentArrangement: 'grid',
    },
    cleanupPolicy: {
      keepOpen,
      closeAfter,
      showMs,
    },
    timeoutPolicy: {
      workerMarkerTimeoutMs: 120000,
      pollMs: 750,
    },
  };
}

function formatModeLabel(mode: VisibleSubagentExecutionMode): string {
  return mode === 'subagent-driven' ? 'Subagent-Driven' : 'Inline Execution';
}

export function formatVisibleSubagentPlanSessionForTerminal(session: VisibleSubagentPlanSession): string {
  return [
    'Visible Subagent Plan Session',
    '',
    `- Session: ${session.id}`,
    `- Task: ${session.userTask}`,
    `- Status: ${session.status}`,
    `- Recommended: ${session.recommendedMode}`,
    `- Next: ${
      session.manualSelection
        ? 'await user selection before starting workers'
        : `auto-select ${session.selectedMode ?? session.recommendedMode}`
    }`,
    '- Modes:',
    ...session.modes.map((mode, index) => `  ${index + 1}. ${formatModeLabel(mode)} (${mode})`),
    '- Workers:',
    ...session.workers.map((worker, index) => `  ${index + 1}. ${worker.title} - ${worker.task}`),
  ].join('\n');
}

export function formatVisibleSubagentPlanSessionForAgent(session: VisibleSubagentPlanSession): string {
  return [
    'Visible Subagent Plan Session',
    '',
    `- task: ${session.userTask}`,
    `- recommended mode: ${session.recommendedMode}`,
    `- available modes: ${session.modes.join(', ')}`,
    `- selection: ${
      session.manualSelection ? 'manual selection required' : `${session.selectedMode} (${session.selectionSource})`
    }`,
    `- layout: ${session.layoutPolicy.documentArrangement}`,
    `- cleanup: ${session.cleanupPolicy.keepOpen ? 'keep open' : 'stop workers'}${
      session.cleanupPolicy.closeAfter ? ', close tabs' : ''
    }`,
    '',
    'workers:',
    ...session.workers.map((worker) => `- ${worker.title}: ${worker.task}`),
  ].join('\n');
}

export function shouldTreatVisibleSubagentPlanSessionPromptAsExplanation(input: string): boolean {
  return EXPLANATION_PATTERN.test(input);
}

export function shouldRouteVisibleSubagentPlanSessionPrompt(input: string): boolean {
  if (shouldTreatVisibleSubagentPlanSessionPromptAsExplanation(input)) return false;
  return PLAN_INTENT_PATTERN.test(input);
}
