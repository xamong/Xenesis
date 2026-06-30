import type { GowooriChatSettings } from '../../../../../shared/types';
import { GOWOORI_PROVIDER_DEFINITIONS, type GowooriProvider, type GowooriRequestMode } from '../agent/gowooriProviders';
import type {
  GowooriSimpleProgressStepId,
  GowooriSimplePromptPreset,
  GowooriSimpleRefinementPromptPreset,
} from './gowooriChatTypes';

export const GOWOORI_PROVIDER_IDS = new Set<GowooriProvider>(GOWOORI_PROVIDER_DEFINITIONS.map((item) => item.id));
export const GOWOORI_REQUEST_MODES = new Set<GowooriRequestMode>(['generate', 'repair', 'continue', 'explain']);
export const GOWOORI_MASCOT_SRC = 'assets/gowoori-mascot.png';

export const RESTORED_REVIEW_REPAIR_PROMPT_PREFIX =
  'Create a repaired Gowoori artifact from this restored package review note.';

export const GOWOORI_CHAT_PROVIDER_SETTINGS_STORAGE_KEY = 'xenesis-desk:gowoori-chat-provider-settings';
export const GOWOORI_CHAT_UI_MODE_STORAGE_KEY = 'xenesis-desk:gowoori-chat-ui-mode';
export const LEGACY_PROVIDER_TIMEOUT_MS = 120000;
export const DEFAULT_PROVIDER_TIMEOUT_MS = 300000;
export const SLOW_LOCAL_CLI_PROVIDER_TIMEOUT_MS = 420000;
const DEFAULT_PROVIDER_LONG_RUNNING_AFTER_MS = 45000;
const SLOW_LOCAL_CLI_PROVIDER_LONG_RUNNING_AFTER_MS = 90000;
const SLOW_LOCAL_CLI_PROVIDERS = new Set<GowooriProvider>(['codex', 'claude']);

export interface GowooriProviderTimeoutProfile {
  provider: GowooriProvider;
  timeoutMs: number;
  longRunningAfterMs: number;
  isSlowLocalCli: boolean;
  timeoutLabel: string;
}

export const DEFAULT_PROVIDER_SETTINGS: GowooriChatSettings = {
  provider: 'byok',
  promptMode: 'stdin',
  commandArgs: '',
  timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS,
  livePreview: true,
  commandOverrides: {},
  apiBaseUrl: '',
  apiModel: '',
  sportsStandingsEndpoint: '',
};

export function resolveGowooriProviderTimeoutMs(provider: GowooriProvider, timeoutMs: number): number {
  return resolveGowooriProviderTimeoutProfile(provider, timeoutMs).timeoutMs;
}

export function resolveGowooriProviderTimeoutProfile(
  provider: GowooriProvider,
  timeoutMs: number,
): GowooriProviderTimeoutProfile {
  const normalizedTimeoutMs = Number.isFinite(timeoutMs)
    ? Math.max(5000, Math.round(timeoutMs))
    : DEFAULT_PROVIDER_TIMEOUT_MS;
  const isSlowLocalCli = SLOW_LOCAL_CLI_PROVIDERS.has(provider);
  const resolvedTimeoutMs = isSlowLocalCli
    ? Math.max(normalizedTimeoutMs, SLOW_LOCAL_CLI_PROVIDER_TIMEOUT_MS)
    : normalizedTimeoutMs;
  const timeoutMinutes = Math.max(1, Math.round(resolvedTimeoutMs / 60000));
  return {
    provider,
    timeoutMs: resolvedTimeoutMs,
    longRunningAfterMs: isSlowLocalCli
      ? SLOW_LOCAL_CLI_PROVIDER_LONG_RUNNING_AFTER_MS
      : DEFAULT_PROVIDER_LONG_RUNNING_AFTER_MS,
    isSlowLocalCli,
    timeoutLabel: `${timeoutMinutes}분`,
  };
}

export function createGowooriProviderLongRunningHint(profile: GowooriProviderTimeoutProfile): string {
  if (profile.isSlowLocalCli) {
    return `로컬 CLI provider는 응답이 오래 걸릴 수 있습니다. 최대 ${profile.timeoutLabel}까지 기다립니다.`;
  }
  return `응답이 길어질 수 있습니다. 최대 ${profile.timeoutLabel}까지 기다립니다.`;
}

export const GOWOORI_PROVIDER_SMOKE_PROMPT = [
  'Provider smoke test: return a compact self-contained Markdown + XCON/SKETCH Gowoori artifact.',
  'The artifact must include these blocks in this exact order:',
  '1. A short Markdown heading.',
  '2. A fenced ```xcon-chain-fixture block with JSON: {"record":{"title":"Gowoori stream OK"}}.',
  '3. A fenced ```xcon-chain as smokeTitle block with exactly: = record.title',
  '4. A fenced ```xcon-sketch block whose screen uses a label with "$smokeTitle".',
  'Do not omit the fixture or chain alias blocks.',
].join('\n');

export const GOWOORI_PROVIDER_SMOKE_REQUIRED_TEXT = [
  '```xcon-chain-fixture',
  '```xcon-chain as smokeTitle',
  '$smokeTitle',
];

export const GOWOORI_SIMPLE_PROGRESS_STEP_LABELS: Record<GowooriSimpleProgressStepId, string> = {
  prompt: 'Prompt sent',
  streaming: 'Streaming',
  preflight: 'Preflight',
  apply: 'Applied/Repair needed',
};

export const GOWOORI_SIMPLE_PROMPT_PRESETS: GowooriSimplePromptPreset[] = [
  {
    id: 'weather-card',
    label: 'Weather card',
    description: 'Start with a city answer that renders as a polished SKETCH card.',
    prompt: [
      'Create a concise Markdown + XCON/SKETCH weather answer for Seoul.',
      'Use a 720px wide document-friendly screen with a hero weather card, hourly summary, and practical recommendations.',
      'Use SKETCH for the main visual answer and keep the Markdown text short.',
      'Return only the final Markdown + XCON/SKETCH artifact.',
    ].join('\n'),
  },
  {
    id: 'business-dashboard',
    label: 'Business dashboard',
    description: 'Build an executive dashboard with chart, SpanGrid, and notes.',
    prompt: [
      'Create a Markdown + XCON/SKETCH executive dashboard for a weekly subscription business review.',
      'Include revenue, growth, churn, activation, a chart component, and a SpanGrid table that can be data-bound later.',
      'Use a clean document-oriented layout, not a marketing landing page.',
      'Return only the final Markdown + XCON/SKETCH artifact.',
    ].join('\n'),
  },
  {
    id: 'workflow-monitor',
    label: 'Workflow monitor',
    description: 'Show live operations with queue, scheduler, and status panels.',
    prompt: [
      'Create a Markdown + XCON/SKETCH workflow monitoring dashboard for an XCON workflow runner.',
      'Show queue depth, scheduler status, running jobs, failed jobs, retry progress, and a compact network diagram area.',
      'Make the screen suitable for live updates from xcon-chain aliases and workflow actions.',
      'Return only the final Markdown + XCON/SKETCH artifact.',
    ].join('\n'),
  },
  {
    id: 'desk-capability-status',
    label: 'Desk status',
    description: 'Try a local Xenesis Desk capability call with explicit approval.',
    prompt: [
      'xd.app.status capability를 {"includeDiagnostics":true,"scope":"summary"} 인자로 호출해줘.',
      '승인 후 결과를 사용해서 Xenesis Desk 상태를 짧은 Markdown + XCON/SKETCH 카드로 요약해줘.',
      'Return only the final Markdown + XCON/SKETCH artifact.',
    ].join('\n'),
  },
];

export const GOWOORI_SIMPLE_REFINEMENT_PROMPTS: GowooriSimpleRefinementPromptPreset[] = [
  {
    id: 'compact-layout',
    label: 'Make compact',
    description: 'Tighten spacing and make the artifact easier to scan.',
    requestMode: 'generate',
    prompt: [
      'Refine the current Markdown + XCON/SKETCH artifact.',
      'Make the layout more compact without removing important information.',
      'Keep all generated output renderable in Gowoori and return only the complete revised artifact.',
    ].join('\n'),
  },
  {
    id: 'add-chart',
    label: 'Add chart',
    description: 'Add or improve a chart section using document-safe layout.',
    requestMode: 'generate',
    prompt: [
      'Refine the current Markdown + XCON/SKETCH artifact.',
      'Add a useful chart component or improve the existing chart so the data story is clearer.',
      'Keep labels readable and return only the complete revised artifact.',
    ].join('\n'),
  },
  {
    id: 'repair-sketch',
    label: 'Fix SKETCH',
    description: 'Repair syntax and renderability issues before applying.',
    requestMode: 'repair',
    prompt: [
      'Repair the current Markdown + XCON/SKETCH artifact.',
      'Fix SKETCH syntax, unsupported component usage, malformed fences, and layout-breaking values.',
      'Preserve the intent and return only the complete repaired artifact.',
    ].join('\n'),
  },
  {
    id: 'document-layout',
    label: 'Document layout',
    description: 'Convert the result toward a report-friendly document layout.',
    requestMode: 'generate',
    prompt: [
      'Refine the current Markdown + XCON/SKETCH artifact.',
      'Make it feel like a polished document or dashboard page, with clear hierarchy and print-friendly sections.',
      'Return only the complete revised artifact.',
    ].join('\n'),
  },
];

export const GOWOORI_SIMPLE_FIRST_RUN_STEPS = [
  {
    title: '1. Check run setup',
    description: 'Confirm the provider, Gowoori target, and Auto apply before sending a prompt.',
  },
  {
    title: '2. Start from an artifact',
    description: 'Use a quick start for a weather card, KPI dashboard, or workflow monitor.',
  },
  {
    title: '3. Review the result',
    description: 'GowooriChat streams the answer, runs preflight, then applies or offers repair.',
  },
];
