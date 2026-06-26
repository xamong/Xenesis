import type { DeskBridgeCapabilityCallResult, DeskBridgeCapabilityNode } from '../../../../deskBridgeCapabilities';
import { type GowooriAgentRoute, routeGowooriUserPrompt } from './gowooriAgent';
import { createFallbackGowooriAgentDataPacket, type GowooriAgentDataPacket } from './gowooriAgentData';
import type { GowooriRequestMode } from './gowooriProviders';

export interface GowooriWeatherToolRequest {
  city: string;
  prompt: string;
  intent: GowooriAgentRoute['intent'];
}

export interface GowooriWeatherToolResult {
  source: string;
  generatedAtKst: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  current: {
    temperatureC: number;
    feelsLikeC: number;
    condition: string;
    humidity: number;
    windMs: number;
  };
  daily?: Array<{
    date: string;
    day: string;
    condition: string;
    highC: number;
    lowC: number;
    rainProbability: number;
    note: string;
  }>;
  summary?: string;
}

export interface GowooriStandingsToolRequest {
  prompt: string;
  league: string;
  sport: string;
  intent: GowooriAgentRoute['intent'];
}

export interface GowooriStandingsToolResult {
  source: string;
  generatedAtKst: string;
  title: string;
  league: string;
  sport: string;
  columns?: Array<Record<string, unknown>>;
  rows: Array<Record<string, unknown>>;
  gridData?: unknown[][];
  chartData?: Record<string, unknown>;
  summary?: string;
  note?: string;
}

export type GowooriAgentToolCategory = 'weather' | 'sports' | 'web' | 'files' | 'time' | 'desk';

export type GowooriAgentToolName =
  | 'weather.current'
  | 'weather.weekly'
  | 'sports.standings'
  | 'web.search'
  | 'web.fetchText'
  | 'files.list'
  | 'files.readText'
  | 'files.previewWrite'
  | 'files.writeText'
  | 'desk.capability.list'
  | 'desk.capability.describe'
  | 'desk.capability.call'
  | 'time.now';

export interface GowooriAgentToolDescriptor {
  name: GowooriAgentToolName;
  category: GowooriAgentToolCategory;
  description: string;
  requiresApproval: boolean;
  sideEffect: 'none' | 'preview' | 'write';
}

export interface GowooriAgentToolCall {
  id: string;
  name: GowooriAgentToolName;
  input: Record<string, unknown>;
  required: boolean;
  reason: string;
}

export interface GowooriWebSearchToolRequest {
  query: string;
  prompt: string;
  intent: GowooriAgentRoute['intent'];
  maxResults: number;
}

export interface GowooriWebSearchResultItem {
  title: string;
  url?: string;
  snippet: string;
  source?: string;
}

export interface GowooriWebSearchToolResult {
  source: string;
  query: string;
  generatedAtKst?: string;
  results: GowooriWebSearchResultItem[];
}

export interface GowooriWebFetchTextToolRequest {
  url: string;
  prompt: string;
  intent: GowooriAgentRoute['intent'];
  maxChars: number;
}

export interface GowooriWebFetchTextToolResult {
  source: string;
  url: string;
  title?: string;
  fetchedAtKst?: string;
  text: string;
}

export interface GowooriFileListToolRequest {
  directoryPath: string;
  recursive?: boolean;
  maxEntries?: number;
}

export interface GowooriFileListToolResult {
  source: string;
  directoryPath: string;
  entries: Array<{ path: string; name: string; type: 'file' | 'directory'; size?: number }>;
}

export interface GowooriFileReadTextToolRequest {
  filePath: string;
  maxChars?: number;
}

export interface GowooriFileReadTextToolResult {
  source: string;
  filePath: string;
  text: string;
}

export interface GowooriFileWriteTextToolRequest {
  filePath: string;
  text: string;
}

export interface GowooriFileWriteTextToolResult {
  source: string;
  filePath: string;
  ok: boolean;
  preview?: string;
}

export interface GowooriDeskCapabilitySummary {
  path: string;
  label: string;
  description: string;
  kind: DeskBridgeCapabilityNode['kind'];
  permission: DeskBridgeCapabilityNode['permission'];
  approval: DeskBridgeCapabilityNode['approval'];
  readable?: boolean;
  writable?: boolean;
  callable?: boolean;
  subscribable?: boolean;
}

export interface GowooriDeskCapabilityListToolResult {
  source: 'xd-capability-registry';
  capabilities: GowooriDeskCapabilitySummary[];
}

export interface GowooriDeskCapabilityDescribeToolRequest {
  path?: string;
}

export interface GowooriDeskCapabilityDescribeToolResult {
  source: 'xd-capability-registry';
  path: string;
  capability: DeskBridgeCapabilityNode | null;
}

export interface GowooriDeskCapabilityCallToolRequest {
  path: string;
  args?: unknown;
  approved?: boolean;
}

export interface GowooriDeskCapabilityCallToolResult {
  source: 'xd-capability-registry';
  ok: boolean;
  path: string;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: DeskBridgeCapabilityCallResult['permission'];
  approval?: DeskBridgeCapabilityCallResult['approval'];
}

export interface GowooriTimeNowToolResult {
  source: string;
  iso: string;
  kst: string;
}

export interface GowooriAgentToolRegistry {
  weather?: {
    getCurrentWeather?: (request: GowooriWeatherToolRequest) => Promise<GowooriWeatherToolResult>;
    getWeeklyWeather?: (request: GowooriWeatherToolRequest) => Promise<GowooriWeatherToolResult>;
  };
  standings?: {
    getStandings?: (request: GowooriStandingsToolRequest) => Promise<GowooriStandingsToolResult>;
  };
  web?: {
    search?: (request: GowooriWebSearchToolRequest) => Promise<GowooriWebSearchToolResult>;
    fetchText?: (request: GowooriWebFetchTextToolRequest) => Promise<GowooriWebFetchTextToolResult>;
  };
  files?: {
    list?: (request: GowooriFileListToolRequest) => Promise<GowooriFileListToolResult>;
    readText?: (request: GowooriFileReadTextToolRequest) => Promise<GowooriFileReadTextToolResult>;
    previewWrite?: (request: GowooriFileWriteTextToolRequest) => Promise<GowooriFileWriteTextToolResult>;
    writeText?: (request: GowooriFileWriteTextToolRequest) => Promise<GowooriFileWriteTextToolResult>;
  };
  desk?: {
    listCapabilities?: () => Promise<GowooriDeskCapabilityListToolResult>;
    describeCapability?: (
      request: GowooriDeskCapabilityDescribeToolRequest,
    ) => Promise<GowooriDeskCapabilityDescribeToolResult>;
    callCapability?: (request: GowooriDeskCapabilityCallToolRequest) => Promise<GowooriDeskCapabilityCallToolResult>;
  };
  time?: {
    now?: () => Promise<GowooriTimeNowToolResult>;
  };
}

export interface GowooriAgentToolContextOptions {
  prompt: string;
  mode: GowooriRequestMode;
  tools?: GowooriAgentToolRegistry;
  approvedToolCallIds?: string[];
  onProgress?: (progress: GowooriAgentToolExecutionProgress) => void;
}

export type GowooriAgentToolExecutionStatus = 'success' | 'failed' | 'skipped' | 'approval-required';

export type GowooriAgentToolExecutionProgressPhase =
  | 'planning'
  | 'running'
  | GowooriAgentToolExecutionStatus
  | 'completed';

export interface GowooriAgentToolExecutionProgress {
  phase: GowooriAgentToolExecutionProgressPhase;
  call?: GowooriAgentToolCall;
  message: string;
  completed: number;
  total: number;
  successCount: number;
  pendingApprovalCount: number;
  failedCount: number;
  skippedCount: number;
}

export interface GowooriAgentToolExecution {
  call: GowooriAgentToolCall;
  status: GowooriAgentToolExecutionStatus;
  result?: unknown;
  error?: string;
}

export interface GowooriAgentToolExecutionContext {
  agentData: GowooriAgentDataPacket | null;
  plan: GowooriAgentToolCall[];
  executions: GowooriAgentToolExecution[];
  pendingApprovals: GowooriAgentToolCall[];
}

export async function resolveGowooriAgentToolContext(
  options: GowooriAgentToolContextOptions,
): Promise<GowooriAgentDataPacket | null> {
  const route = routeGowooriUserPrompt(options.prompt, options.mode);
  const requestedCity = extractGowooriWeatherCity(options.prompt);

  if (route.intent === 'ranking-table') {
    const standingsPacket = await tryResolveStandingsToolPacket(options.prompt, route, options.tools);
    if (standingsPacket) return standingsPacket;

    const webEvidencePacket = await tryResolveWebEvidencePacket(options.prompt, route, options.tools);
    if (webEvidencePacket) return webEvidencePacket;

    return createFallbackGowooriAgentDataPacket(route, options.prompt);
  }

  if (route.intent === 'weather-weekly' && options.tools?.weather?.getWeeklyWeather) {
    try {
      const result = await options.tools.weather.getWeeklyWeather({
        city: requestedCity,
        prompt: options.prompt,
        intent: route.intent,
      });
      return createWeatherToolPacket('weather-weekly', result, [
        'Use this tool result as the source of truth for the weekly weather dashboard.',
        'The xcon-sketch output must include chart and spanGrid sections derived from this tool result.',
        'If the tool result conflicts with earlier conversation or earlier artifacts, use this tool result.',
      ]);
    } catch {
      return createFallbackGowooriAgentDataPacket(route, options.prompt);
    }
  }

  if (route.intent === 'weather-now' && options.tools?.weather?.getCurrentWeather) {
    try {
      const result = await options.tools.weather.getCurrentWeather({
        city: requestedCity,
        prompt: options.prompt,
        intent: route.intent,
      });
      return createWeatherToolPacket('weather-now', result, [
        'Use this tool result as the source of truth for the weather card.',
        'If the tool result conflicts with earlier conversation or earlier artifacts, use this tool result.',
      ]);
    } catch {
      return createFallbackGowooriAgentDataPacket(route, options.prompt);
    }
  }

  if (isFreshExternalContextPrompt(options.prompt)) {
    const webEvidencePacket = await tryResolveWebEvidencePacket(options.prompt, route, options.tools);
    if (webEvidencePacket) return webEvidencePacket;
  }

  if (isDeskCapabilityContextPrompt(options.prompt)) {
    const deskPacket = await tryResolveDeskCapabilityContextPacket(options.prompt, route, options.tools);
    if (deskPacket) return deskPacket;
  }

  return createFallbackGowooriAgentDataPacket(route, options.prompt);
}

export async function resolveGowooriAgentToolExecutionContext(
  options: GowooriAgentToolContextOptions,
): Promise<GowooriAgentToolExecutionContext> {
  const route = routeGowooriUserPrompt(options.prompt, options.mode);
  const plan = planGowooriAgentToolCalls({
    prompt: options.prompt,
    mode: options.mode,
  });
  const approvedToolCallIds = new Set(options.approvedToolCallIds ?? []);
  const executions: GowooriAgentToolExecution[] = [];
  emitGowooriAgentToolProgress(options.onProgress, {
    phase: 'planning',
    message:
      plan.length > 0
        ? `Gowoori tools: ${plan.length}개 도구를 준비합니다.`
        : 'Gowoori tools: 추가 도구 없이 생성합니다.',
    plan,
    executions,
  });

  for (const call of plan) {
    const executionCall =
      approvedToolCallIds.has(call.id) || approvedToolCallIds.has(call.name)
        ? { ...call, input: { ...call.input, approved: true } }
        : call;
    emitGowooriAgentToolProgress(options.onProgress, {
      phase: 'running',
      call: executionCall,
      message: `Gowoori tools: ${executionCall.name} 실행 중입니다.`,
      plan,
      executions,
    });
    const execution = await executeGowooriAgentToolCall(executionCall, options.tools, executions);
    executions.push(execution);
    emitGowooriAgentToolProgress(options.onProgress, {
      phase: execution.status,
      call: executionCall,
      message: createGowooriAgentToolProgressMessage(execution),
      plan,
      executions,
    });
  }

  emitGowooriAgentToolProgress(options.onProgress, {
    phase: 'completed',
    message: createGowooriAgentToolCompletedMessage(executions),
    plan,
    executions,
  });

  const agentData =
    createAgentDataPacketFromToolExecutions(options.prompt, route, executions) ??
    createFallbackGowooriAgentDataPacket(route, options.prompt);

  return {
    agentData,
    plan,
    executions,
    pendingApprovals: executions
      .filter((execution) => execution.status === 'approval-required')
      .map((execution) => execution.call),
  };
}

function emitGowooriAgentToolProgress(
  onProgress: GowooriAgentToolContextOptions['onProgress'],
  event: {
    phase: GowooriAgentToolExecutionProgressPhase;
    call?: GowooriAgentToolCall;
    message: string;
    plan: GowooriAgentToolCall[];
    executions: GowooriAgentToolExecution[];
  },
): void {
  if (!onProgress) return;
  const counts = summarizeGowooriAgentToolExecutions(event.executions);
  try {
    onProgress({
      phase: event.phase,
      call: event.call,
      message: event.message,
      completed: event.executions.length,
      total: event.plan.length,
      successCount: counts.successCount,
      pendingApprovalCount: counts.pendingApprovalCount,
      failedCount: counts.failedCount,
      skippedCount: counts.skippedCount,
    });
  } catch {
    // Tool progress is advisory; it must not interrupt artifact generation.
  }
}

function summarizeGowooriAgentToolExecutions(executions: GowooriAgentToolExecution[]): {
  successCount: number;
  pendingApprovalCount: number;
  failedCount: number;
  skippedCount: number;
} {
  return executions.reduce(
    (summary, execution) => {
      if (execution.status === 'success') summary.successCount += 1;
      if (execution.status === 'approval-required') summary.pendingApprovalCount += 1;
      if (execution.status === 'failed') summary.failedCount += 1;
      if (execution.status === 'skipped') summary.skippedCount += 1;
      return summary;
    },
    {
      successCount: 0,
      pendingApprovalCount: 0,
      failedCount: 0,
      skippedCount: 0,
    },
  );
}

function createGowooriAgentToolProgressMessage(execution: GowooriAgentToolExecution): string {
  switch (execution.status) {
    case 'success':
      return `Gowoori tools: ${execution.call.name} 완료.`;
    case 'approval-required':
      return `Gowoori tools: ${execution.call.name} 실행에는 사용자 승인이 필요합니다.`;
    case 'failed':
      return `Gowoori tools: ${execution.call.name} 실패: ${execution.error ?? 'unknown error'}`;
    case 'skipped':
      return `Gowoori tools: ${execution.call.name} 건너뜀: ${execution.error ?? 'not available'}`;
    default:
      return `Gowoori tools: ${execution.call.name} 상태를 확인했습니다.`;
  }
}

function createGowooriAgentToolCompletedMessage(executions: GowooriAgentToolExecution[]): string {
  const counts = summarizeGowooriAgentToolExecutions(executions);
  if (executions.length === 0) return 'Gowoori tools: 실행할 도구가 없습니다.';
  return (
    [
      `Gowoori tools: ${counts.successCount}개 성공`,
      `${counts.pendingApprovalCount}개 승인 대기`,
      `${counts.failedCount}개 실패`,
      `${counts.skippedCount}개 건너뜀`,
    ].join(', ') + '.'
  );
}

export type GowooriAgentToolFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface GowooriDefaultSportsToolOptions {
  standingsEndpoint?: string | URL;
}

export interface GowooriDefaultAgentToolOptions {
  sports?: GowooriDefaultSportsToolOptions;
  sportsStandingsEndpoint?: string | URL;
}

export function createDefaultGowooriAgentTools(
  fetcher: GowooriAgentToolFetch = defaultGowooriAgentFetch,
  options: GowooriDefaultAgentToolOptions = {},
): GowooriAgentToolRegistry {
  const standingsEndpoint = normalizeSportsStandingsEndpoint(options);
  return {
    weather: {
      getCurrentWeather: (request) => fetchOpenMeteoWeather(request, fetcher),
      getWeeklyWeather: (request) => fetchOpenMeteoWeather(request, fetcher),
    },
    ...(standingsEndpoint
      ? ({
          standings: {
            getStandings: (request: GowooriStandingsToolRequest) =>
              fetchSportsStandings(request, fetcher, standingsEndpoint),
          },
        } satisfies Pick<GowooriAgentToolRegistry, 'standings'>)
      : {}),
    web: {
      search: (request) => fetchDuckDuckGoSearch(request, fetcher),
      fetchText: (request) => fetchWebText(request, fetcher),
    },
    desk: createGowooriDeskCapabilityTools(),
    time: {
      now: async () => createTimeNowResult(),
    },
  };
}

export function createGowooriDeskCapabilityTools(): NonNullable<GowooriAgentToolRegistry['desk']> {
  return {
    listCapabilities: async () => ({
      source: 'xd-capability-registry',
      capabilities: flattenGowooriDeskCapabilities(await listDeskBridge()),
    }),
    describeCapability: async (request) => {
      const path = request.path?.trim() || 'xd';
      return {
        source: 'xd-capability-registry',
        path,
        capability: await describeDeskBridge(path),
      };
    },
    callCapability: async (request) =>
      normalizeGowooriDeskCapabilityCallResult(
        await callGowooriDeskCapability(request.path, request.args, { approved: request.approved }),
      ),
  };
}

export function getGowooriAgentToolCatalog(): GowooriAgentToolDescriptor[] {
  return [
    {
      name: 'weather.current',
      category: 'weather',
      description: 'Fetch current weather for a requested city or region.',
      requiresApproval: false,
      sideEffect: 'none',
    },
    {
      name: 'weather.weekly',
      category: 'weather',
      description: 'Fetch a multi-day weather forecast for detailed weather dashboards.',
      requiresApproval: false,
      sideEffect: 'none',
    },
    {
      name: 'sports.standings',
      category: 'sports',
      description: 'Fetch structured league standings for ranked sports tables.',
      requiresApproval: false,
      sideEffect: 'none',
    },
    {
      name: 'web.search',
      category: 'web',
      description: 'Search the public web for current context when a structured domain tool is unavailable.',
      requiresApproval: false,
      sideEffect: 'none',
    },
    {
      name: 'web.fetchText',
      category: 'web',
      description: 'Fetch and sanitize text from a search result URL for evidence packets.',
      requiresApproval: false,
      sideEffect: 'none',
    },
    {
      name: 'files.list',
      category: 'files',
      description: 'List files in an approved workspace location.',
      requiresApproval: false,
      sideEffect: 'none',
    },
    {
      name: 'files.readText',
      category: 'files',
      description: 'Read text from an approved local or remote file.',
      requiresApproval: false,
      sideEffect: 'none',
    },
    {
      name: 'files.previewWrite',
      category: 'files',
      description: 'Preview a file write before applying it.',
      requiresApproval: true,
      sideEffect: 'preview',
    },
    {
      name: 'files.writeText',
      category: 'files',
      description: 'Apply an approved text file write.',
      requiresApproval: true,
      sideEffect: 'write',
    },
    {
      name: 'desk.capability.list',
      category: 'desk',
      description: 'List the Xenesis Desk capability registry so Gowoori can discover available local features.',
      requiresApproval: false,
      sideEffect: 'none',
    },
    {
      name: 'desk.capability.describe',
      category: 'desk',
      description:
        'Describe one Xenesis Desk capability path, including schema, permission, and approval requirements.',
      requiresApproval: false,
      sideEffect: 'none',
    },
    {
      name: 'desk.capability.call',
      category: 'desk',
      description: 'Call an Xenesis Desk capability through the source-scoped Gowoori bridge.',
      requiresApproval: true,
      sideEffect: 'write',
    },
    {
      name: 'time.now',
      category: 'time',
      description: 'Return the current local and KST timestamp.',
      requiresApproval: false,
      sideEffect: 'none',
    },
  ];
}

export function planGowooriAgentToolCalls(options: {
  prompt: string;
  mode: GowooriRequestMode;
}): GowooriAgentToolCall[] {
  const route = routeGowooriUserPrompt(options.prompt, options.mode);
  const calls: GowooriAgentToolCall[] = [];

  if (route.intent === 'weather-weekly') {
    calls.push({
      id: 'weather-weekly',
      name: 'weather.weekly',
      input: { city: extractGowooriWeatherCity(options.prompt), prompt: options.prompt, intent: route.intent },
      required: false,
      reason: 'Detailed weather dashboards need forecast evidence before generation.',
    });
    return calls;
  }

  if (route.intent === 'weather-now') {
    calls.push({
      id: 'weather-current',
      name: 'weather.current',
      input: { city: extractGowooriWeatherCity(options.prompt), prompt: options.prompt, intent: route.intent },
      required: false,
      reason: 'Weather cards should use current weather evidence before generation.',
    });
    return calls;
  }

  if (route.intent === 'ranking-table') {
    const standings = extractGowooriStandingsRequest(options.prompt, route.intent);
    const query = createGowooriWebSearchQuery(options.prompt, route);
    calls.push(
      {
        id: 'sports-standings',
        name: 'sports.standings',
        input: {
          prompt: standings.prompt,
          league: standings.league,
          sport: standings.sport,
          intent: standings.intent,
        },
        required: false,
        reason: 'Structured standings are the preferred source for ranked sports tables.',
      },
      {
        id: 'web-search',
        name: 'web.search',
        input: { query, prompt: options.prompt, intent: route.intent, maxResults: 5 },
        required: false,
        reason: 'Web evidence is the fallback when a structured standings tool is unavailable.',
      },
      {
        id: 'web-fetch-first',
        name: 'web.fetchText',
        input: { from: 'web.search[0].url', prompt: options.prompt, intent: route.intent, maxChars: 6000 },
        required: false,
        reason: 'Fetched page text can provide row-level evidence for standings.',
      },
    );
    return calls;
  }

  const filePreviewWriteRequest = extractGowooriFilePreviewWriteRequest(options.prompt);
  if (filePreviewWriteRequest) {
    calls.push({
      id: 'files-preview-write',
      name: 'files.previewWrite',
      input: { ...filePreviewWriteRequest },
      required: true,
      reason: 'Local file writes must be previewed and explicitly approved before Gowoori continues.',
    });
    return calls;
  }

  const deskCapabilityCallRequest = extractDeskCapabilityCallRequest(options.prompt);
  if (deskCapabilityCallRequest && isDeskCapabilityCallPrompt(options.prompt)) {
    calls.push({
      id: createDeskCapabilityCallId(deskCapabilityCallRequest.path),
      name: 'desk.capability.call',
      input: { ...deskCapabilityCallRequest },
      required: true,
      reason: 'Xenesis Desk capability calls can control local app state and require explicit approval.',
    });
    return calls;
  }

  if (isFreshExternalContextPrompt(options.prompt)) {
    calls.push({
      id: 'web-search',
      name: 'web.search',
      input: {
        query: createGowooriWebSearchQuery(options.prompt, route),
        prompt: options.prompt,
        intent: route.intent,
        maxResults: 5,
      },
      required: false,
      reason: 'The prompt asks for current or latest information that needs external evidence.',
    });
  }

  if (isDeskCapabilityContextPrompt(options.prompt)) {
    calls.push({
      id: 'desk-capability-list',
      name: 'desk.capability.list',
      input: {},
      required: false,
      reason: 'Xenesis Desk control requests should discover the capability registry before calling local features.',
    });
  }

  return calls;
}

async function executeGowooriAgentToolCall(
  call: GowooriAgentToolCall,
  tools: GowooriAgentToolRegistry | undefined,
  previousExecutions: GowooriAgentToolExecution[],
): Promise<GowooriAgentToolExecution> {
  const descriptor = getGowooriAgentToolCatalog().find((item) => item.name === call.name);
  if (descriptor?.requiresApproval && call.input.approved !== true) {
    return {
      call,
      status: 'approval-required',
      error: `${call.name} requires explicit user approval before execution.`,
    };
  }

  try {
    switch (call.name) {
      case 'weather.weekly':
        return await executeAvailableTool(
          call,
          tools?.weather?.getWeeklyWeather,
          call.input as unknown as GowooriWeatherToolRequest,
        );
      case 'weather.current':
        return await executeAvailableTool(
          call,
          tools?.weather?.getCurrentWeather,
          call.input as unknown as GowooriWeatherToolRequest,
        );
      case 'sports.standings':
        return await executeAvailableTool(
          call,
          tools?.standings?.getStandings,
          call.input as unknown as GowooriStandingsToolRequest,
        );
      case 'web.search':
        return await executeAvailableTool(
          call,
          tools?.web?.search,
          call.input as unknown as GowooriWebSearchToolRequest,
        );
      case 'web.fetchText': {
        const fetchRequest = resolveGowooriWebFetchRequest(call, previousExecutions);
        if (!fetchRequest) {
          return {
            call,
            status: 'skipped',
            error: 'No URL was available for web.fetchText.',
          };
        }
        return await executeAvailableTool(call, tools?.web?.fetchText, fetchRequest);
      }
      case 'files.list':
        return await executeAvailableTool(
          call,
          tools?.files?.list,
          call.input as unknown as GowooriFileListToolRequest,
        );
      case 'files.readText':
        return await executeAvailableTool(
          call,
          tools?.files?.readText,
          call.input as unknown as GowooriFileReadTextToolRequest,
        );
      case 'files.previewWrite':
        return await executeAvailableTool(
          call,
          tools?.files?.previewWrite,
          call.input as unknown as GowooriFileWriteTextToolRequest,
        );
      case 'files.writeText':
        return await executeAvailableTool(
          call,
          tools?.files?.writeText,
          call.input as unknown as GowooriFileWriteTextToolRequest,
        );
      case 'desk.capability.list':
        return await executeAvailableTool(call, tools?.desk?.listCapabilities, undefined);
      case 'desk.capability.describe':
        return await executeAvailableTool(
          call,
          tools?.desk?.describeCapability,
          call.input as unknown as GowooriDeskCapabilityDescribeToolRequest,
        );
      case 'desk.capability.call':
        return await executeAvailableTool(
          call,
          tools?.desk?.callCapability,
          call.input as unknown as GowooriDeskCapabilityCallToolRequest,
        );
      case 'time.now':
        return await executeAvailableTool(call, tools?.time?.now, undefined);
      default:
        return {
          call,
          status: 'skipped',
          error: `Unsupported Gowoori agent tool: ${call.name}`,
        };
    }
  } catch (error) {
    return {
      call,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function executeAvailableTool<TInput, TResult>(
  call: GowooriAgentToolCall,
  handler: ((request: TInput) => Promise<TResult>) | (() => Promise<TResult>) | undefined,
  input: TInput,
): Promise<GowooriAgentToolExecution> {
  if (!handler) {
    return {
      call,
      status: 'skipped',
      error: `${call.name} is not available in the current Gowoori tool registry.`,
    };
  }
  const result =
    input === undefined
      ? await (handler as () => Promise<TResult>)()
      : await (handler as (request: TInput) => Promise<TResult>)(input);
  return {
    call,
    status: 'success',
    result,
  };
}

function resolveGowooriWebFetchRequest(
  call: GowooriAgentToolCall,
  previousExecutions: GowooriAgentToolExecution[],
): GowooriWebFetchTextToolRequest | null {
  const input = call.input as Record<string, unknown>;
  const explicitUrl = typeof input.url === 'string' ? input.url.trim() : '';
  const searchUrl = input.from === 'web.search[0].url' ? getFirstWebSearchResultUrl(previousExecutions) : '';
  const url = explicitUrl || searchUrl;
  if (!url) return null;
  return {
    url,
    prompt: String(input.prompt ?? ''),
    intent: String(input.intent ?? 'other') as GowooriAgentRoute['intent'],
    maxChars: Number(input.maxChars ?? 6000),
  };
}

function getFirstWebSearchResultUrl(executions: GowooriAgentToolExecution[]): string {
  const searchExecution = executions.find(
    (execution) => execution.call.name === 'web.search' && execution.status === 'success' && execution.result,
  );
  const search = searchExecution?.result as GowooriWebSearchToolResult | undefined;
  return search?.results.find((result) => Boolean(result.url))?.url ?? '';
}

function createAgentDataPacketFromToolExecutions(
  prompt: string,
  route: GowooriAgentRoute,
  executions: GowooriAgentToolExecution[],
): GowooriAgentDataPacket | null {
  const weeklyWeather = findSuccessfulToolResult<GowooriWeatherToolResult>(executions, 'weather.weekly');
  if (weeklyWeather) {
    return createWeatherToolPacket('weather-weekly', weeklyWeather, [
      'Use this tool result as the source of truth for the weekly weather dashboard.',
      'The xcon-sketch output must include chart and spanGrid sections derived from this tool result.',
      'If the tool result conflicts with earlier conversation or earlier artifacts, use this tool result.',
    ]);
  }

  const currentWeather = findSuccessfulToolResult<GowooriWeatherToolResult>(executions, 'weather.current');
  if (currentWeather) {
    return createWeatherToolPacket('weather-now', currentWeather, [
      'Use this tool result as the source of truth for the weather card.',
      'If the tool result conflicts with earlier conversation or earlier artifacts, use this tool result.',
    ]);
  }

  const standings = findSuccessfulToolResult<GowooriStandingsToolResult>(executions, 'sports.standings');
  if (standings) {
    return createStandingsToolPacket(standings, [
      'Use this tool result as the source of truth for the standings or ranked table dashboard.',
      'Render the ranked rows as a spanGrid table, not as raw JSON, markdown code, or a dark code panel.',
      'If the tool result conflicts with earlier conversation or earlier artifacts, use this tool result.',
    ]);
  }

  const webSearch = findSuccessfulToolResult<GowooriWebSearchToolResult>(executions, 'web.search');
  if (webSearch) {
    const fetches = findSuccessfulToolResults<GowooriWebFetchTextToolResult>(executions, 'web.fetchText');
    return createWebEvidenceToolPacket(route, prompt, webSearch, fetches);
  }

  const deskCapabilityList = findSuccessfulToolResult<GowooriDeskCapabilityListToolResult>(
    executions,
    'desk.capability.list',
  );
  const deskCapabilityDescribe = findSuccessfulToolResult<GowooriDeskCapabilityDescribeToolResult>(
    executions,
    'desk.capability.describe',
  );
  const deskCapabilityCall = findSuccessfulToolResult<GowooriDeskCapabilityCallToolResult>(
    executions,
    'desk.capability.call',
  );
  if (deskCapabilityList || deskCapabilityDescribe || deskCapabilityCall) {
    return createDeskCapabilityToolPacket(prompt, route, {
      list: deskCapabilityList,
      describe: deskCapabilityDescribe,
      call: deskCapabilityCall,
    });
  }

  const toolResults = executions
    .filter((execution) => execution.status === 'success')
    .map((execution) => ({
      id: execution.call.id,
      name: execution.call.name,
      result: execution.result,
    }));
  if (toolResults.length > 0) {
    return {
      kind: 'tool-execution',
      source: 'tool',
      toolName: 'gowoori-agent-tools',
      data: {
        kind: 'tool-execution',
        routeIntent: route.intent,
        toolResults,
      },
      instructions: [
        'Use these Gowoori tool execution results as source context.',
        'Do not claim a local write or control action was completed unless a successful tool result explicitly says so.',
      ],
    };
  }

  return null;
}

function findSuccessfulToolResult<TResult>(
  executions: GowooriAgentToolExecution[],
  name: GowooriAgentToolName,
): TResult | null {
  return (
    (executions.find((execution) => execution.call.name === name && execution.status === 'success')?.result as
      | TResult
      | undefined) ?? null
  );
}

function findSuccessfulToolResults<TResult>(
  executions: GowooriAgentToolExecution[],
  name: GowooriAgentToolName,
): TResult[] {
  return executions
    .filter((execution) => execution.call.name === name && execution.status === 'success')
    .map((execution) => execution.result as TResult);
}

async function tryResolveStandingsToolPacket(
  prompt: string,
  route: GowooriAgentRoute,
  tools: GowooriAgentToolRegistry | undefined,
): Promise<GowooriAgentDataPacket | null> {
  if (!tools?.standings?.getStandings) return null;
  try {
    const standings = extractGowooriStandingsRequest(prompt, route.intent);
    const result = await tools.standings.getStandings(standings);
    return createStandingsToolPacket(result, [
      'Use this tool result as the source of truth for the standings or ranked table dashboard.',
      'Render the ranked rows as a spanGrid table, not as raw JSON, markdown code, or a dark code panel.',
      'If the tool result conflicts with earlier conversation or earlier artifacts, use this tool result.',
    ]);
  } catch {
    return null;
  }
}

async function tryResolveWebEvidencePacket(
  prompt: string,
  route: GowooriAgentRoute,
  tools: GowooriAgentToolRegistry | undefined,
): Promise<GowooriAgentDataPacket | null> {
  if (!tools?.web?.search) return null;
  try {
    const search = await tools.web.search({
      query: createGowooriWebSearchQuery(prompt, route),
      prompt,
      intent: route.intent,
      maxResults: 5,
    });
    const firstUrl = search.results.find((result) => Boolean(result.url))?.url;
    const fetches: GowooriWebFetchTextToolResult[] = [];
    if (firstUrl && tools.web.fetchText) {
      try {
        fetches.push(
          await tools.web.fetchText({
            url: firstUrl,
            prompt,
            intent: route.intent,
            maxChars: 6000,
          }),
        );
      } catch {
        // Search snippets are still useful as evidence when the page fetch fails.
      }
    }
    if (search.results.length === 0 && fetches.length === 0) return null;
    return createWebEvidenceToolPacket(route, prompt, search, fetches);
  } catch {
    return null;
  }
}

async function tryResolveDeskCapabilityContextPacket(
  prompt: string,
  route: GowooriAgentRoute,
  tools: GowooriAgentToolRegistry | undefined,
): Promise<GowooriAgentDataPacket | null> {
  if (!tools?.desk?.listCapabilities) return null;
  try {
    const list = await tools.desk.listCapabilities();
    const requestedPath = extractDeskCapabilityPath(prompt);
    const described =
      requestedPath && tools.desk.describeCapability
        ? await tools.desk.describeCapability({ path: requestedPath })
        : null;
    return {
      kind: 'xd-capability-registry',
      source: 'tool',
      toolName: 'xd-capability-registry',
      data: {
        kind: 'xd-capability-registry',
        routeIntent: route.intent,
        requestedPath,
        selectedCapability: described?.capability ?? null,
        capabilities: list.capabilities,
      },
      instructions: [
        'Use this Xenesis Desk capability registry context when the request asks to inspect or control the local Desk.',
        'Do not claim a control, write, or execute action was completed unless a desk.capability.call result is attached.',
        'Prefer read-only capability inspection unless the user explicitly requests a control, write, or execute action.',
      ],
    };
  } catch {
    return null;
  }
}

function createDeskCapabilityToolPacket(
  prompt: string,
  route: GowooriAgentRoute,
  results: {
    list?: GowooriDeskCapabilityListToolResult | null;
    describe?: GowooriDeskCapabilityDescribeToolResult | null;
    call?: GowooriDeskCapabilityCallToolResult | null;
  },
): GowooriAgentDataPacket {
  const requestedPath = extractDeskCapabilityPath(prompt);
  const kind = results.call ? 'xd-capability-call' : 'xd-capability-registry';
  return {
    kind,
    source: 'tool',
    toolName: kind,
    data: {
      kind,
      routeIntent: route.intent,
      requestedPath: requestedPath ?? results.describe?.path ?? results.call?.path ?? null,
      selectedCapability: results.describe?.capability ?? null,
      capabilityCall: results.call ?? null,
      capabilities: results.list?.capabilities ?? [],
    },
    instructions: [
      'Use this Xenesis Desk capability registry context when the request asks to inspect or control the local Desk.',
      'Do not claim a control, write, or execute action was completed unless a desk.capability.call result is attached and ok is true.',
      'Prefer read-only capability inspection unless the user explicitly requests a control, write, or execute action.',
    ],
  };
}

function flattenGowooriDeskCapabilities(nodes: DeskBridgeCapabilityNode[]): GowooriDeskCapabilitySummary[] {
  const capabilities: GowooriDeskCapabilitySummary[] = [];
  const visit = (node: DeskBridgeCapabilityNode): void => {
    capabilities.push(summarizeGowooriDeskCapability(node));
    for (const child of node.children ?? []) {
      visit(child);
    }
  };
  for (const node of nodes) {
    visit(node);
  }
  return capabilities;
}

function summarizeGowooriDeskCapability(node: DeskBridgeCapabilityNode): GowooriDeskCapabilitySummary {
  return {
    path: node.path,
    label: node.label,
    description: node.description,
    kind: node.kind,
    permission: node.permission,
    approval: node.approval,
    readable: node.readable,
    writable: node.writable,
    callable: node.callable,
    subscribable: node.subscribable,
  };
}

function normalizeGowooriDeskCapabilityCallResult(
  result: DeskBridgeCapabilityCallResult,
): GowooriDeskCapabilityCallToolResult {
  return {
    source: 'xd-capability-registry',
    ok: result.ok,
    path: result.path,
    result: result.result,
    error: result.error,
    approvalRequired: result.approvalRequired,
    permission: result.permission,
    approval: result.approval,
  };
}

type GowooriDeskBridgeRuntime = typeof import('../../../../deskBridge');

async function loadGowooriDeskBridge(): Promise<GowooriDeskBridgeRuntime | null> {
  try {
    return await import('../../../../deskBridge');
  } catch {
    return null;
  }
}

async function listDeskBridge(): Promise<DeskBridgeCapabilityNode[]> {
  const bridge = await loadGowooriDeskBridge();
  return bridge?.listDeskBridge() ?? [];
}

async function describeDeskBridge(path = 'xd'): Promise<DeskBridgeCapabilityNode | null> {
  const bridge = await loadGowooriDeskBridge();
  return bridge?.describeDeskBridge(path) ?? null;
}

async function callGowooriDeskCapability(
  path: string,
  args?: unknown,
  options?: { approved?: boolean },
): Promise<DeskBridgeCapabilityCallResult> {
  const bridge = await loadGowooriDeskBridge();
  if (bridge) {
    return bridge.callGowooriDeskCapability(path, args, options);
  }
  return {
    ok: false,
    path,
    error: 'Xenesis Desk bridge is not available to Gowoori agent tools.',
    source: 'gowoori',
  };
}

function createStandingsToolPacket(result: GowooriStandingsToolResult, instructions: string[]): GowooriAgentDataPacket {
  const gridData = result.gridData ?? createGridDataFromStandingsRows(result.rows);
  const chartData = result.chartData ?? createChartDataFromStandingsRows(result.rows);
  return {
    kind: 'ranking-table',
    source: 'tool',
    toolName: result.source,
    data: {
      kind: 'ranking-table',
      generatedAtKst: result.generatedAtKst,
      title: result.title,
      league: result.league,
      sport: result.sport,
      columns: result.columns,
      rows: result.rows,
      gridData,
      chartData,
      summary: result.summary,
      note: result.note,
    },
    instructions,
  };
}

function createWebEvidenceToolPacket(
  route: GowooriAgentRoute,
  prompt: string,
  search: GowooriWebSearchToolResult,
  fetches: GowooriWebFetchTextToolResult[],
): GowooriAgentDataPacket {
  const isRankingTable = route.intent === 'ranking-table';
  const generatedAtKst = search.generatedAtKst ?? createTimeNowResult().kst;
  const searchResults = search.results.map((result) => ({
    ...result,
    source: result.source ?? search.source,
  }));
  return {
    kind: isRankingTable ? 'ranking-table' : 'web-evidence',
    source: 'tool',
    toolName: 'web-evidence',
    data: {
      kind: isRankingTable ? 'ranking-table' : 'web-evidence',
      title: isRankingTable ? resolveRankingEvidenceTitle(prompt) : 'Web evidence',
      generatedAtKst,
      query: search.query,
      webEvidence: {
        searchResults,
        fetches: fetches.map((item) => ({
          source: item.source,
          url: item.url,
          title: item.title,
          fetchedAtKst: item.fetchedAtKst,
          text: item.text,
        })),
      },
      summary: isRankingTable
        ? 'Structured standings tool was unavailable, so Gowoori collected web evidence for the ranked table request.'
        : 'Gowoori collected web evidence for the current-information request.',
      note: 'Use only facts supported by the web evidence. If row-level data is insufficient, say so instead of inventing exact values.',
    },
    instructions: [
      'Use this web evidence as external context for the requested artifact.',
      'Do not invent precise facts, rankings, dates, prices, or scores that are not supported by the evidence packet.',
      ...(isRankingTable
        ? [
            'No structured sports standings tool result was available. Use the web evidence, and if it does not contain enough row-level standings data, clearly state the limitation.',
            'When enough row evidence exists, render rankings as a spanGrid table. Do not render the evidence itself as raw JSON or a dark code panel.',
          ]
        : []),
    ],
  };
}

function createWeatherToolPacket(
  kind: 'weather-now' | 'weather-weekly',
  result: GowooriWeatherToolResult,
  instructions: string[],
): GowooriAgentDataPacket {
  const daily = result.daily ?? [];
  const data: Record<string, unknown> = {
    kind,
    generatedAtKst: result.generatedAtKst,
    city: result.city,
    region: result.region,
    latitude: result.latitude,
    longitude: result.longitude,
    current: result.current,
    summary: result.summary,
  };

  if (kind === 'weather-weekly') {
    data.daily = daily;
    data.chartData = {
      labels: daily.map((item) => item.day),
      datasets: [
        {
          label: '최고 기온',
          data: daily.map((item) => item.highC),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56,189,248,0.18)',
        },
        {
          label: '강수확률',
          data: daily.map((item) => item.rainProbability),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.16)',
        },
      ],
    };
    data.gridData = [
      ['날짜', '날씨', '최고/최저', '강수', '메모'],
      ...daily.map((item) => [
        item.date,
        item.condition,
        `${item.highC}/${item.lowC}C`,
        `${item.rainProbability}%`,
        item.note,
      ]),
    ];
  }

  return {
    kind,
    source: 'tool',
    toolName: result.source,
    data,
    instructions,
  };
}

function extractGowooriStandingsRequest(
  prompt: string,
  intent: GowooriAgentRoute['intent'],
): GowooriStandingsToolRequest {
  const text = String(prompt || '').toLowerCase();
  if (/kbo|프로야구|야구|baseball/.test(text)) {
    return { prompt, league: 'KBO', sport: 'baseball', intent };
  }
  if (/nba|농구|basketball/.test(text)) {
    return { prompt, league: 'NBA', sport: 'basketball', intent };
  }
  if (/k[-\s]?league|축구|soccer|football/.test(text)) {
    return { prompt, league: 'K League', sport: 'soccer', intent };
  }
  return { prompt, league: 'Sample League', sport: 'ranking', intent };
}

function resolveRankingEvidenceTitle(prompt: string): string {
  return /kbo|프로야구|야구|baseball/i.test(prompt) ? 'KBO 프로야구 순위' : '순위표 대시보드';
}

function createGowooriWebSearchQuery(prompt: string, route: GowooriAgentRoute): string {
  if (route.intent === 'ranking-table') {
    const standings = extractGowooriStandingsRequest(prompt, route.intent);
    if (standings.league === 'KBO') return 'KBO 프로야구 순위 최신';
    return `${standings.league} standings ranking latest`;
  }
  return String(prompt || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFreshExternalContextPrompt(prompt: string): boolean {
  return /latest|current|today|now|this\s+week|search|lookup|fresh|최신|현재|오늘|이번\s*주|이번주|검색|조회|찾아|알려줘/.test(
    String(prompt || '').toLowerCase(),
  );
}

function isDeskCapabilityContextPrompt(prompt: string): boolean {
  return /xd\s*desk|capability|registry|bridge|dock|pane|panel|terminal|settings?|command|extension|file|folder|workspace|gowoori|거울이|브릿지|기능|도킹|독|패널|터미널|설정|명령|확장|파일|폴더|워크스페이스/.test(
    String(prompt || '').toLowerCase(),
  );
}

function isDeskCapabilityCallPrompt(prompt: string): boolean {
  return /call|invoke|execute|run|control|open|호출|실행|제어|열어|열기|적용|처리/.test(
    String(prompt || '').toLowerCase(),
  );
}

function createDeskCapabilityCallId(path: string): string {
  const suffix =
    String(path || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown';
  return `desk-capability-call-${suffix}`;
}

function extractGowooriFilePreviewWriteRequest(prompt: string): GowooriFileWriteTextToolRequest | null {
  if (!/(?:저장|저장해|저장해줘|save|write|export)/i.test(prompt)) return null;
  const match =
    prompt.match(/([A-Za-z]:\\[^"'<>|]*?\.(?:md|markdown|txt|json|xcon|xconj|sketch|html|csv))/i) ??
    prompt.match(/((?:\.{1,2}|[\\/])[^"'<>|]*?\.(?:md|markdown|txt|json|xcon|xconj|sketch|html|csv))/i);
  const filePath = match?.[1]?.trim().replace(/[.,;:]+$/, '');
  if (!filePath) return null;
  return {
    filePath,
    text: '',
  };
}

function extractDeskCapabilityPath(prompt: string): string | null {
  const text = String(prompt || '');
  const match = text.match(/\b(xd(?:\.[a-zA-Z0-9_-]+)+)\b/);
  return match?.[1] ?? null;
}

function extractDeskCapabilityCallRequest(prompt: string): GowooriDeskCapabilityCallToolRequest | null {
  const path = extractDeskCapabilityPath(prompt);
  if (!path) return null;
  return {
    path,
    args: extractFirstJsonObject(prompt) ?? extractCapabilityKeyValueArgs(prompt),
  };
}

function extractFirstJsonObject(text: string): Record<string, unknown> | null {
  const source = String(text || '');
  for (let start = source.indexOf('{'); start >= 0; start = source.indexOf('{', start + 1)) {
    const candidate = extractBalancedJsonCandidate(source, start);
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Keep scanning. User prompts can contain prose braces before the real JSON args.
    }
  }
  return null;
}

function extractBalancedJsonCandidate(source: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

function extractCapabilityKeyValueArgs(text: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const pattern =
    /\b([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\])*)`|([^\s,;]+))/g;
  const source = String(text || '');
  for (const match of source.matchAll(pattern)) {
    const key = match[1];
    const quotedValue = match[2] ?? match[3] ?? match[4];
    const rawValue = quotedValue ?? match[5] ?? '';
    args[key] = parseCapabilityArgValue(rawValue, quotedValue !== undefined);
  }
  return args;
}

function parseCapabilityArgValue(value: string, quoted: boolean): unknown {
  const normalized = unescapeCapabilityArgString(value).trim();
  if (quoted) return normalized;
  const cleaned = normalized.replace(/[.,;:]+$/, '');
  const lower = cleaned.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (lower === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) return Number(cleaned);
  return cleaned;
}

function unescapeCapabilityArgString(value: string): string {
  return String(value || '').replace(/\\(["'`\\])/g, '$1');
}

function createGridDataFromStandingsRows(rows: Array<Record<string, unknown>>): unknown[][] {
  if (!rows.length) return [];
  const keys = ['rank', 'team', 'games', 'wins', 'losses', 'ties', 'pct', 'gamesBehind', 'streak'].filter((key) =>
    Object.hasOwn(rows[0], key),
  );
  return [keys.map((key) => key), ...rows.map((row) => keys.map((key) => row[key]))];
}

function createChartDataFromStandingsRows(rows: Array<Record<string, unknown>>): Record<string, unknown> {
  const topRows = rows.slice(0, 5);
  return {
    labels: topRows.map((row) => String(row.team ?? row.name ?? row.rank ?? '')),
    datasets: [
      {
        label: 'Wins',
        data: topRows.map((row) => Number(row.wins ?? row.score ?? row.value ?? 0)),
        backgroundColor: ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6'],
      },
    ],
  };
}

function extractGowooriWeatherCity(prompt: string): string {
  const text = String(prompt || '');
  const knownCities = ['서울', '대전', '제주', '부산', '인천', '춘천', '강릉', '광주', '대구', '울산', '세종', '수원'];
  return knownCities.find((city) => text.includes(city)) ?? '서울';
}

function normalizeSportsStandingsEndpoint(options: GowooriDefaultAgentToolOptions): URL | null {
  const value = options.sports?.standingsEndpoint ?? options.sportsStandingsEndpoint;
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

async function fetchSportsStandings(
  request: GowooriStandingsToolRequest,
  fetcher: GowooriAgentToolFetch,
  endpoint: URL,
): Promise<GowooriStandingsToolResult> {
  const url = new URL(endpoint.toString());
  url.searchParams.set('league', request.league);
  url.searchParams.set('sport', request.sport);
  url.searchParams.set('intent', request.intent);
  url.searchParams.set('prompt', request.prompt);
  const response = await fetchWithTimeout(fetcher, url, 6500);
  if (!response.ok) {
    throw new Error(`Sports standings request failed with HTTP ${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  return normalizeSportsStandingsToolResult(payload, request);
}

function normalizeSportsStandingsToolResult(
  payload: unknown,
  request: GowooriStandingsToolRequest,
): GowooriStandingsToolResult {
  const root = asRecord(payload);
  const table = asRecord(root.table);
  const rows = normalizeStandingsRows(root.rows ?? table.rows ?? root.standings ?? root.data);
  if (rows.length === 0) {
    throw new Error('Sports standings endpoint returned no rows.');
  }
  const gridData = normalizeUnknownMatrix(root.gridData ?? table.gridData);
  return {
    source: normalizeNonEmptyString(root.source) ?? 'sports-standings-endpoint',
    generatedAtKst: normalizeNonEmptyString(root.generatedAtKst) ?? createTimeNowResult().kst,
    title: normalizeNonEmptyString(root.title) ?? `${request.league} standings`,
    league: normalizeNonEmptyString(root.league) ?? request.league,
    sport: normalizeNonEmptyString(root.sport) ?? request.sport,
    columns: normalizeRecordArray(root.columns ?? table.columns),
    rows,
    ...(gridData ? { gridData } : {}),
    ...(asRecordOrNull(root.chartData ?? table.chartData)
      ? { chartData: asRecordOrNull(root.chartData ?? table.chartData) as Record<string, unknown> }
      : {}),
    ...(normalizeNonEmptyString(root.summary) ? { summary: normalizeNonEmptyString(root.summary) } : {}),
    ...(normalizeNonEmptyString(root.note) ? { note: normalizeNonEmptyString(root.note) } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asRecordOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeNonEmptyString(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text ? text : undefined;
}

function normalizeRecordArray(value: unknown): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows = value
    .map((item) => asRecordOrNull(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
  return rows.length > 0 ? rows : undefined;
}

function normalizeStandingsRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (Array.isArray(row)) {
        return row.reduce<Record<string, unknown>>((record, cell, index) => {
          record[`col${index + 1}`] = cell;
          return record;
        }, {});
      }
      return asRecordOrNull(row);
    })
    .filter(hasRecordKeys);
}

function hasRecordKeys(value: Record<string, unknown> | null): value is Record<string, unknown> {
  return Boolean(value) && Object.keys(value as Record<string, unknown>).length > 0;
}

function normalizeUnknownMatrix(value: unknown): unknown[][] | undefined {
  if (!Array.isArray(value)) return undefined;
  const matrix = value.filter((row): row is unknown[] => Array.isArray(row)).map((row) => row.slice());
  return matrix.length > 0 ? matrix : undefined;
}

async function fetchDuckDuckGoSearch(
  request: GowooriWebSearchToolRequest,
  fetcher: GowooriAgentToolFetch,
): Promise<GowooriWebSearchToolResult> {
  const url = new URL('https://api.duckduckgo.com/');
  url.searchParams.set('q', request.query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('no_html', '1');
  url.searchParams.set('skip_disambig', '1');
  const response = await fetchWithTimeout(fetcher, url, 6500);
  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed with HTTP ${response.status}`);
  }
  const payload = (await response.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    Heading?: string;
    RelatedTopics?: Array<unknown>;
  };
  const results: GowooriWebSearchResultItem[] = [];
  if (payload.AbstractText) {
    results.push({
      title: payload.Heading || request.query,
      url: payload.AbstractURL,
      snippet: payload.AbstractText,
      source: 'duckduckgo',
    });
  }
  collectDuckDuckGoRelatedTopics(payload.RelatedTopics ?? [], results, request.maxResults);
  return {
    source: 'duckduckgo',
    query: request.query,
    generatedAtKst: createTimeNowResult().kst,
    results: results.slice(0, request.maxResults),
  };
}

function collectDuckDuckGoRelatedTopics(
  topics: Array<unknown>,
  results: GowooriWebSearchResultItem[],
  maxResults: number,
): void {
  for (const topic of topics) {
    if (results.length >= maxResults) return;
    if (!topic || typeof topic !== 'object') continue;
    const item = topic as { Text?: string; FirstURL?: string; Name?: string; Topics?: Array<unknown> };
    if (Array.isArray(item.Topics)) {
      collectDuckDuckGoRelatedTopics(item.Topics, results, maxResults);
      continue;
    }
    if (!item.Text) continue;
    const [title = item.Name || 'Result', ...snippetParts] = item.Text.split(' - ');
    results.push({
      title: title.trim() || item.Name || 'Result',
      url: item.FirstURL,
      snippet: (snippetParts.join(' - ') || item.Text).trim(),
      source: 'duckduckgo',
    });
  }
}

async function fetchWebText(
  request: GowooriWebFetchTextToolRequest,
  fetcher: GowooriAgentToolFetch,
): Promise<GowooriWebFetchTextToolResult> {
  const response = await fetchWithTimeout(fetcher, new URL(request.url), 6500);
  if (!response.ok) {
    throw new Error(`Web text fetch failed with HTTP ${response.status}`);
  }
  const rawText = await response.text();
  const title = extractHtmlTitle(rawText);
  return {
    source: 'web.fetch',
    url: request.url,
    title,
    fetchedAtKst: createTimeNowResult().kst,
    text: truncateText(stripHtmlToText(rawText), request.maxChars),
  };
}

function extractHtmlTitle(source: string): string | undefined {
  const match = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1]).replace(/\s+/g, ' ').trim() : undefined;
}

function stripHtmlToText(source: string): string {
  return decodeHtmlEntities(
    source
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function decodeHtmlEntities(source: string): string {
  return source
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function truncateText(source: string, maxChars: number): string {
  return source.length > maxChars ? `${source.slice(0, maxChars).trim()}...` : source;
}

function createTimeNowResult(): GowooriTimeNowToolResult {
  const now = new Date();
  return {
    source: 'system-clock',
    iso: now.toISOString(),
    kst: `${now.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' })} KST`,
  };
}

interface WeatherLocation {
  city: string;
  region: string;
  latitude: number;
  longitude: number;
}

const WEATHER_LOCATIONS: WeatherLocation[] = [
  { city: '서울', region: '서울특별시', latitude: 37.5665, longitude: 126.978 },
  { city: '대전', region: '대전광역시', latitude: 36.3504, longitude: 127.3845 },
  { city: '제주', region: '제주특별자치도', latitude: 33.4996, longitude: 126.5312 },
  { city: '부산', region: '부산광역시', latitude: 35.1796, longitude: 129.0756 },
  { city: '인천', region: '인천광역시', latitude: 37.4563, longitude: 126.7052 },
  { city: '춘천', region: '강원특별자치도 춘천시', latitude: 37.8813, longitude: 127.7298 },
  { city: '강릉', region: '강원특별자치도 강릉시', latitude: 37.7519, longitude: 128.8761 },
  { city: '광주', region: '광주광역시', latitude: 35.1595, longitude: 126.8526 },
  { city: '대구', region: '대구광역시', latitude: 35.8714, longitude: 128.6014 },
  { city: '울산', region: '울산광역시', latitude: 35.5384, longitude: 129.3114 },
  { city: '세종', region: '세종특별자치시', latitude: 36.4801, longitude: 127.289 },
  { city: '수원', region: '경기도 수원시', latitude: 37.2636, longitude: 127.0286 },
];

async function fetchOpenMeteoWeather(
  request: GowooriWeatherToolRequest,
  fetcher: GowooriAgentToolFetch,
): Promise<GowooriWeatherToolResult> {
  const location = resolveWeatherLocation(request.city);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(location.latitude));
  url.searchParams.set('longitude', String(location.longitude));
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
  );
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  url.searchParams.set('timezone', 'Asia/Seoul');
  url.searchParams.set('forecast_days', request.intent === 'weather-weekly' ? '7' : '1');

  const response = await fetchWithTimeout(fetcher, url, 6500);
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    current?: {
      time?: string;
      temperature_2m?: number;
      relative_humidity_2m?: number;
      apparent_temperature?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
    };
  };
  const current = payload.current ?? {};
  const daily = payload.daily ?? {};
  const dailyRows = (daily.time ?? []).map((date, index) => {
    const day = formatKoreanDay(date);
    const code = Number(daily.weather_code?.[index] ?? current.weather_code ?? 0);
    return {
      date: formatMonthDay(date),
      day,
      condition: weatherCodeToKorean(code),
      highC: roundWeatherValue(daily.temperature_2m_max?.[index] ?? current.temperature_2m ?? 0),
      lowC: roundWeatherValue(daily.temperature_2m_min?.[index] ?? current.apparent_temperature ?? 0),
      rainProbability: Math.round(Number(daily.precipitation_probability_max?.[index] ?? 0)),
      note: weatherCodeToNote(code, Number(daily.precipitation_probability_max?.[index] ?? 0)),
    };
  });

  const conditionCode = Number(current.weather_code ?? daily.weather_code?.[0] ?? 0);
  return {
    source: 'open-meteo',
    generatedAtKst: formatKstTimestamp(current.time),
    city: location.city,
    region: location.region,
    latitude: location.latitude,
    longitude: location.longitude,
    current: {
      temperatureC: roundWeatherValue(current.temperature_2m ?? daily.temperature_2m_max?.[0] ?? 0),
      feelsLikeC: roundWeatherValue(current.apparent_temperature ?? current.temperature_2m ?? 0),
      condition: weatherCodeToKorean(conditionCode),
      humidity: Math.round(Number(current.relative_humidity_2m ?? 0)),
      windMs: roundWeatherValue(current.wind_speed_10m ?? 0),
    },
    daily: dailyRows,
    summary: createWeatherToolSummary(location.city, dailyRows),
  };
}

async function fetchWithTimeout(fetcher: GowooriAgentToolFetch, url: URL, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, { signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timer);
  }
}

function defaultGowooriAgentFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Gowoori agent fetch is not available in this runtime.');
  }
  return globalThis.fetch(input, init);
}

function resolveWeatherLocation(city: string): WeatherLocation {
  return WEATHER_LOCATIONS.find((item) => item.city === city) ?? WEATHER_LOCATIONS[0];
}

function roundWeatherValue(value: unknown): number {
  return Math.round(Number(value || 0) * 10) / 10;
}

function formatKstTimestamp(value: string | undefined): string {
  if (!value) return `${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' })} KST`;
  return `${value.replace('T', ' ')} KST`;
}

function formatMonthDay(value: string): string {
  const [, month, day] = value.split('-');
  return month && day ? `${Number(month)}/${Number(day)}` : value;
}

function formatKoreanDay(value: string): string {
  const date = new Date(`${value}T00:00:00+09:00`);
  return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()] ?? '';
}

function weatherCodeToKorean(code: number): string {
  if (code === 0) return '맑음';
  if ([1, 2].includes(code)) return '부분 흐림';
  if (code === 3) return '흐림';
  if ([45, 48].includes(code)) return '안개';
  if ([51, 53, 55, 56, 57].includes(code)) return '이슬비';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '비';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '눈';
  if ([95, 96, 99].includes(code)) return '뇌우';
  return '변화 있음';
}

function weatherCodeToNote(code: number, rainProbability: number): string {
  if (rainProbability >= 70) return '우산 필수';
  if (rainProbability >= 40) return '우산 확인';
  if ([95, 96, 99].includes(code)) return '낙뢰 주의';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '비 대비';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '눈길 주의';
  if (code === 0) return '활동 좋음';
  return '날씨 확인';
}

function createWeatherToolSummary(city: string, daily: GowooriWeatherToolResult['daily']): string {
  if (!daily || daily.length === 0) return `${city} 현재 날씨입니다.`;
  const rainDays = daily
    .filter((item) => item.rainProbability >= 40)
    .map((item) => item.day)
    .join(', ');
  const maxHigh = Math.max(...daily.map((item) => item.highC));
  const minLow = Math.min(...daily.map((item) => item.lowC));
  return `${city} 주간 예보입니다. 최저 ${minLow}C, 최고 ${maxHigh}C 범위이며${rainDays ? ` ${rainDays}요일은 강수 가능성이 있습니다.` : ' 강수 가능성은 낮은 편입니다.'}`;
}
