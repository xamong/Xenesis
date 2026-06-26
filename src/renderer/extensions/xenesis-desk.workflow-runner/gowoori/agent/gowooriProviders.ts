import { createGowooriAgentRoutingLines, type GowooriAgentRoute, routeGowooriUserPrompt } from './gowooriAgent';
import {
  createFallbackGowooriAgentDataPacket,
  createGowooriAgentDataSection,
  createGowooriAgentDataSectionFromPacket,
  type GowooriAgentDataPacket,
} from './gowooriAgentData';
import { createGowooriPromptPackSection } from './gowooriPromptPacks';
import {
  createGowooriRichComponentStrategyLines,
  type GowooriRichComponentId,
  getGowooriRichComponentRequirements,
} from './gowooriRichComponentStrategy';
import { findForcedMockScenario, findMockScenario, generateMockScenarioResponse } from './mockScenarios/index';

export type GowooriProvider = 'mock' | 'codex' | 'claude' | 'hermes' | 'byok';
export type GowooriProviderKind = 'local' | 'cli' | 'api';
export type GowooriRequestMode = 'generate' | 'repair' | 'continue' | 'explain';

export interface GowooriProviderDefinition {
  id: GowooriProvider;
  label: string;
  kind: GowooriProviderKind;
  description: string;
  command?: string;
  defaultArgs?: string[];
  promptMode?: 'argument' | 'stdin';
}

export interface GowooriProviderRequestInput {
  provider: GowooriProvider;
  mode: GowooriRequestMode;
  prompt: string;
  semanticPrompt?: string;
  agentData?: GowooriAgentDataPacket | null;
}

export interface GowooriProviderRequest extends GowooriProviderRequestInput {
  id: string;
  createdAt: string;
}

export interface GowooriArtifactResult {
  kind: 'artifact';
  provider: GowooriProvider;
  source: string;
  summary: string;
}

export interface GowooriCliPlanResult {
  kind: 'cli-plan';
  provider: GowooriProvider;
  command: string;
  defaultArgs: string[];
  promptMode: 'argument' | 'stdin';
  prompt: string;
  summary: string;
}

export interface GowooriApiPlanResult {
  kind: 'api-plan';
  provider: GowooriProvider;
  prompt: string;
  summary: string;
}

export type GowooriProviderResult = GowooriArtifactResult | GowooriCliPlanResult | GowooriApiPlanResult;

export const GOWOORI_MOCK_PREFLIGHT_REPAIR_SMOKE_TRIGGER = '[gowoori-smoke:repair-preflight]';

export const GOWOORI_PROVIDER_DEFINITIONS: GowooriProviderDefinition[] = [
  {
    id: 'mock',
    label: 'Mock local',
    kind: 'local',
    description: 'Generate a deterministic Markdown + XCON/SKETCH artifact without external calls.',
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    kind: 'cli',
    command: 'codex',
    defaultArgs: ['exec', '--skip-git-repo-check', '--sandbox', 'read-only', '-'],
    promptMode: 'stdin',
    description: 'Run Codex CLI in a read-only sandbox and stream the generated Gowoori artifact.',
  },
  {
    id: 'claude',
    label: 'Claude Code',
    kind: 'cli',
    command: 'claude',
    defaultArgs: [
      '-p',
      '--disable-slash-commands',
      '--no-session-persistence',
      '--tools=',
      '--permission-mode',
      'dontAsk',
    ],
    promptMode: 'stdin',
    description: 'Run Claude Code as a no-tools artifact generator and stream the generated Gowoori artifact.',
  },
  {
    id: 'hermes',
    label: 'Hermes',
    kind: 'cli',
    command: 'hermes',
    defaultArgs: ['run', '--stdin'],
    promptMode: 'stdin',
    description: 'Prepare a Hermes gateway request for streaming into Gowoori.',
  },
  {
    id: 'byok',
    label: 'BYOK API',
    kind: 'api',
    description: 'Prepare a BYOK API request. Network execution will be wired in a later step.',
  },
];

export function getGowooriProviderDefinition(provider: GowooriProvider): GowooriProviderDefinition {
  return GOWOORI_PROVIDER_DEFINITIONS.find((item) => item.id === provider) ?? GOWOORI_PROVIDER_DEFINITIONS[0];
}

export function isCliGowooriProvider(provider: GowooriProvider): boolean {
  return getGowooriProviderDefinition(provider).kind === 'cli';
}

export function createGowooriProviderRequest(input: GowooriProviderRequestInput): GowooriProviderRequest {
  return {
    ...input,
    id: `gowoori-request-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
}

export async function runGowooriProvider(request: GowooriProviderRequest): Promise<GowooriProviderResult> {
  const definition = getGowooriProviderDefinition(request.provider);
  const semanticPrompt = resolveGowooriSemanticPrompt(request);
  if (definition.kind === 'local') {
    const source = createMockGowooriResponse(semanticPrompt, request.mode, request.agentData);
    return {
      kind: 'artifact',
      provider: request.provider,
      source,
      summary: getGowooriMessageSummary(source),
    };
  }

  const prompt = createGowooriLlMRequestPrompt(request);
  if (definition.kind === 'cli') {
    return {
      kind: 'cli-plan',
      provider: request.provider,
      command: definition.command ?? request.provider,
      defaultArgs: definition.defaultArgs ?? [],
      promptMode: definition.promptMode ?? 'stdin',
      prompt,
      summary: `${definition.label} request is ready. Terminal streaming is the next wiring step.`,
    };
  }

  return {
    kind: 'api-plan',
    provider: request.provider,
    prompt,
    summary: `${definition.label} request is ready. API streaming is the next wiring step.`,
  };
}

export function createGowooriLlMRequestPrompt(request: GowooriProviderRequestInput): string {
  const semanticPrompt = resolveGowooriSemanticPrompt(request);
  const modeInstruction =
    request.mode === 'repair'
      ? 'Repair the provided artifact while preserving valid Markdown, XCON/SKETCH, chain aliases, and workflow intent.'
      : request.mode === 'continue'
        ? 'Continue the current artifact with the next useful section, keeping the same Markdown + XCON/SKETCH contract.'
        : request.mode === 'explain'
          ? 'Explain the artifact contract and include a compact runnable example.'
          : 'Generate a new artifact.';
  const route = routeGowooriUserPrompt(semanticPrompt, request.mode);
  const agentRouting = createGowooriAgentRoutingLines(route);
  const promptPackSection = createGowooriPromptPackSection(route.promptPacks);
  const dataSection = request.agentData
    ? createGowooriAgentDataSectionFromPacket(request.agentData)
    : createGowooriAgentDataSection(route, semanticPrompt);
  const intentGuidance = createGowooriIntentGuidance(route, semanticPrompt);
  const userRequestPrompt = sanitizeGowooriProviderUserPrompt(request.prompt, semanticPrompt, route);

  return [
    'You are generating a Gowoori artifact for XCON Viewer Desk.',
    'Provider execution note: generate the final artifact directly. Do not call tools, do not load skills, do not inspect files, and do not explain your process.',
    modeInstruction,
    ...agentRouting,
    ...promptPackSection,
    ...dataSection,
    ...intentGuidance,
    '',
    'Output contract:',
    'The final response must be directly renderable by Gowoori.',
    'Return Markdown + XCON/SKETCH: ordinary Markdown plus fenced XCON blocks only.',
    'Return only the final artifact. Do not add assistant commentary before or after it.',
    'Do not wrap the entire answer in an outer markdown code fence.',
    'For UI blocks, use exactly ```xcon-sketch. Never use ```sketch, raw unfenced SKETCH, HTML, or SVG as the primary answer.',
    'Never output raw SKETCH outside a fenced ```xcon-sketch block.',
    'Every xcon-sketch block must start with a screen declaration, for example: screen "Status" 360x220 bg #ffffff.',
    'Inside xcon-sketch, use Gowoori SKETCH component syntax only: componentName: componentType "text" at x y width height.',
    'Do not use Box/Text shorthand, JSX, Tailwind-like properties, YAML UI trees, or invented layout DSLs inside xcon-sketch.',
    'Do not use CSS-like shorthand properties inside xcon-sketch.',
    'Use nested border and font blocks: write border / visible / width / color / radius, and font / size / weight.',
    'Do not write top-level radius, borderColor, fontSize, fontWeight, or lineHeight on visual components.',
    'Keep JSON property values on one physical line after the property name for chartData, snapshot, markers, nodes, links, slides, and similar structured values.',
    'For chartData, always use a JSON object with labels and datasets arrays. Never use an array of label/value records.',
    'For spanGrid, prefer snapshot JSON over raw data/columns lines because snapshot preserves rows, columns, row heights, borders, merges, and fixed panes reliably.',
    'For spanGrid snapshot, every visible cell should include both backColor and foreColor so light and dark Desk themes remain readable.',
    'Valid component example: title: label "Ready" at 20 20 140 24.',
    'Valid panel example: card: panel at 16 60 328 120.',
    'Every visual component inside xcon-sketch must have a semantic named ID prefix. Do not generate anonymous "panel at ..." or "label at ..." lines.',
    'Every visual component must use explicit stable bounds with at x y width height and must stay inside the screen bounds.',
    'When a label, button, badge, image, chart, grid, map, or diagram visually belongs inside a panel/banner/card, nest it under that container by indentation. Do not place overlay text as a root-level sibling above a dark or light panel.',
    'If text appears on top of a colored panel, the text component must be a child of that panel so the effective background and contrast are unambiguous.',
    'Use only known public components: panel, label, button, textField, image, shape, banner, list, spanGrid, chart, networkDiagram, map, badge, alert, progressBar, tabs, select, switch, slider, rating, qrCode.',
    'Do not use unsupported or removed components: webView, frame, import, fileUpload, filePicker, imagePicker, signaturePad, or custom component names.',
    '',
    'Visual quality contract:',
    'Respond in the same natural language as the user request unless the user asks otherwise.',
    'Do not create generic placeholder screens such as "Welcome to the XCON Interface" or "This artifact demonstrates a simple user interface".',
    'Do not create large blank cards or decorative empty panels. Every large panel must contain meaningful labels, image/chart/grid/map content, or actionable controls.',
    'Use concrete content that directly answers the user request. If the request is too short, create a helpful Gowoori welcome or clarification card instead of a generic interface demo.',
    'If the user asks whether Gowoori can draw a chart, grid, map, banner, QR code, network diagram, button, or image, answer by rendering a working component showcase for that exact component.',
    'Every label, button, and badge must set an explicit high-contrast color. On light panels use @ink, @ink-2, #111827, or another dark color. On dark panels use white, #e5e7eb, or another light color.',
    'For dark headers, hero panels, and colored cards, put all overlaid title/subtitle/action components inside the dark parent panel. Never rely on sibling overlap for contrast.',
    'Prefer finished cards over tutorial layouts: a clear title, short supporting text, 2-3 practical actions or examples, and no oversized empty white area.',
    '',
    'Return sections in this order:',
    '1. Optional short Markdown heading and summary.',
    '2. Optional ```xcon-chain-fixture block when data binding is needed.',
    '3. Optional ```xcon-chain as alias blocks for derived values.',
    '4. Optional ```xcon-demo block for playback metadata.',
    '5. One or more fenced ```xcon-sketch blocks that each start with screen.',
    'Use xcon-chain-fixture for sample data when the artifact needs data binding.',
    'Use xcon-chain as aliases for derived values, for example ```xcon-chain as tempLabel, then reference $alias values in Markdown and SKETCH.',
    'Do not use {{...}} inside xcon-sketch. Prefer $alias values produced by xcon-chain fences.',
    'Inside xcon-sketch, inline chain sugar is allowed for record/global/alias expressions only when no alias fence is practical.',
    'For simple one-off answers, prefer concrete visible values directly in SKETCH instead of introducing xcon-chain aliases.',
    'If you use any $alias in Markdown or SKETCH, declare it in a preceding ```xcon-chain as alias block and include any fixture data it needs.',
    'Include xcon-demo metadata when the artifact benefits from playback or workflow demonstration.',
    'Keep the answer self-contained: fixture, aliases, workflow/demo metadata, Markdown explanation, then one or more xcon-sketch blocks.',
    '',
    'Do a final self-check before responding:',
    '- At least one ```xcon-sketch block exists.',
    '- Every xcon-sketch block begins with a screen declaration.',
    '- No ```sketch fence, raw unfenced SKETCH, HTML, JSX, SVG, Box/Text shorthand, or YAML UI tree is present.',
    '- No CSS-like shorthand property appears in SKETCH: radius, borderColor, fontSize, fontWeight, or lineHeight must not be top-level component properties.',
    '- Any chartData, snapshot, markers, nodes, links, slides, or similar JSON property is valid single-line JSON after the property name.',
    '- No {{...}} binding appears inside xcon-sketch.',
    '- Every $alias used in Markdown or SKETCH has a preceding xcon-chain declaration, or no $alias is used at all.',
    '- Any text placed over a colored panel/banner/card is nested under that container, not a root sibling.',
    '- Simple answers use concrete display text and do not depend on hidden runtime state.',
    'If any check fails, fix the artifact before sending it.',
    '',
    'User request:',
    userRequestPrompt,
  ].join('\n');
}

function resolveGowooriSemanticPrompt(request: Pick<GowooriProviderRequestInput, 'prompt' | 'semanticPrompt'>): string {
  return request.semanticPrompt?.trim() || request.prompt;
}

function sanitizeGowooriProviderUserPrompt(prompt: string, semanticPrompt: string, route: GowooriAgentRoute): string {
  const trimmedPrompt = prompt.trim();
  const trimmedSemanticPrompt = semanticPrompt.trim();
  if (!trimmedPrompt || !trimmedSemanticPrompt || trimmedPrompt === trimmedSemanticPrompt) {
    return trimmedPrompt;
  }

  const lines = trimmedPrompt.split(/\r?\n/);
  const sanitizedLines: string[] = [];
  let skippingPromptPackExamples = false;
  for (const line of lines) {
    if (/^\s*Prompt pack examples:\s*$/i.test(line)) {
      skippingPromptPackExamples = true;
      continue;
    }
    if (skippingPromptPackExamples) {
      continue;
    }
    if (/^\s*-?\s*Agent intent:\s*/i.test(line)) {
      continue;
    }
    if (/^\s*(Weather|Business reports|Operations\/workflow|Identity\/help):/i.test(line)) {
      continue;
    }
    if (route.intent !== 'weather-now' && route.intent !== 'weather-weekly') {
      if (
        /weather-weekly|weekly weather dashboard|detailed weather dashboard|Domain data packet:.*weather|제주 주간 날씨/i.test(
          line,
        )
      ) {
        continue;
      }
    }
    sanitizedLines.push(line);
  }

  const sanitizedPrompt = sanitizedLines.join('\n').trim();
  return sanitizedPrompt || trimmedSemanticPrompt;
}

function createGowooriIntentGuidance(route: GowooriAgentRoute, prompt: string): string[] {
  const lines: string[] = ['', 'Intent guidance:'];

  if (route.intent === 'identity') {
    lines.push(
      'The user is asking who Gowoori is. Answer as Gowoori / 거울이, the XCON Viewer Desk artifact assistant.',
      'Do not answer with weather, city forecast, dashboard metrics, or any previous artifact unless the user explicitly asks for that content.',
      'Explain that Gowoori can turn natural language into Markdown + XCON/SKETCH artifacts, data-bound documents, dashboards, and workflow monitors.',
      'Render one compact identity/help card with high-contrast labels and one clear action button.',
    );
  } else if (route.intent === 'greeting') {
    lines.push(
      'The user request is a brief greeting. Create a friendly Gowoori welcome card, not a generic interface placeholder.',
      'Keep the Markdown short and put the useful visible answer inside one compact welcome card.',
      'Use a polished assistant-style card with a greeting, short helper sentence, examples, and one primary button.',
    );
  } else if (route.intent === 'weather-now') {
    lines.push(
      'The user is asking for current weather. Create a weather-focused answer with concrete visible values.',
      'If live weather data is not supplied, use realistic sample values for the requested location and label them as sample/reference values in Markdown.',
      'Do not leave raw variable names such as $temperature or $condition visible unless matching xcon-chain aliases are declared.',
    );
  } else if (route.intent === 'weather-weekly') {
    lines.push(
      'The user is asking for detailed or weekly weather. Use the data packet as the source of truth when present.',
      'Preserve the requested location exactly. Do not reuse a previous city or artifact domain.',
      'Include a useful Markdown summary plus a dashboard-style SKETCH with current summary, forecast trend, daily grid, and practical tips.',
    );
  } else if (route.intent === 'ranking-table') {
    lines.push(
      'The user is asking for standings, rankings, or a leaderboard. Render rows as a real structured visual, not raw JSON or a code panel.',
      'If no live standings tool result is attached, clearly state in Markdown that values are sample/reference values.',
      'Use visible rank, team/name, score/win/loss/percentage columns and include both a spanGrid table and a chart derived from the ranked rows.',
    );
  } else if (route.intent === 'workflow') {
    lines.push(
      'The user is asking for workflow or monitoring output. Separate readable Markdown, visual SKETCH, and optional xcon-workflow metadata.',
      'Show runtime state such as queue, scheduler, progress, current action, warnings, and result when applicable.',
    );
  } else if (route.intent === 'document') {
    lines.push(
      'The user is asking for a document or report. Use Markdown for prose and SKETCH for structured visual blocks.',
      'Use data-bound fixture and chain aliases when values repeat or may be exported.',
    );
  } else {
    lines.push(
      'Create a self-contained Markdown + XCON/SKETCH artifact that directly answers the user request.',
      'Use the richest supported component that matches the content instead of falling back to plain panels and labels.',
    );
  }

  return [...lines, ...createGowooriRichComponentStrategyLines(prompt, route)];
}
function isBriefGowooriGreetingPrompt(prompt: string): boolean {
  const normalized = String(prompt || '')
    .trim()
    .replace(/[.!?。！？~\s]+/g, '')
    .toLowerCase();
  return ['hi', 'hello', 'hey', '안녕', '안녕하세요', '하이', '헬로'].includes(normalized);
}

function isWeatherGowooriPrompt(prompt: string): boolean {
  const normalized = String(prompt || '').toLowerCase();
  return /weather|forecast|temperature|humidity|wind|rain|snow|날씨|기온|온도|습도|바람|비|눈|예보/.test(normalized);
}

function isDetailedWeatherGowooriPrompt(prompt: string): boolean {
  const normalized = String(prompt || '').toLowerCase();
  if (!isWeatherGowooriPrompt(normalized)) return false;
  return /weekly|week|7\s*day|seven\s*day|forecast|dashboard|chart|grid|table|detailed|detail|report|compare|이번\s*주|이번주|주간|7일|일주일|예보|차트|그래프|그리드|표|테이블|자세|상세|정리|비교|보고/.test(
    normalized,
  );
}

export function safeGowooriTitleFromPrompt(prompt: string): string {
  const compact = prompt.replace(/\s+/g, ' ').trim();
  if (!compact) return 'Generated Gowoori Artifact';
  return compact.length > 44 ? `${compact.slice(0, 44)}...` : compact;
}

export function createMockGowooriResponse(
  prompt: string,
  mode: GowooriRequestMode,
  agentData?: GowooriAgentDataPacket | null,
): string {
  if (mode !== 'repair' && prompt.includes(GOWOORI_MOCK_PREFLIGHT_REPAIR_SMOKE_TRIGGER)) {
    return [
      '# Gowoori forced preflight repair smoke',
      '',
      'This deterministic mock response intentionally fails Gowoori preflight so the bridge smoke can verify diagnostics and automatic repair.',
      '',
      '```xcon-sketch',
      'title: label "Missing screen declaration" at 20 20 220 24',
      '```',
    ].join('\n');
  }

  const forcedMockScenario = findForcedMockScenario(prompt);
  if (forcedMockScenario) {
    return generateMockScenarioResponse(forcedMockScenario, prompt, agentData);
  }

  if (mode !== 'repair' && isDetailedWeatherGowooriPrompt(prompt)) {
    return createMockWeeklyWeatherGowooriResponse(prompt, agentData);
  }

  const mockScenario = findMockScenario(prompt);
  if (mockScenario) {
    return generateMockScenarioResponse(mockScenario, prompt, agentData);
  }

  const title = safeGowooriTitleFromPrompt(prompt);
  const intent =
    mode === 'repair'
      ? 'Repair and normalize the current artifact'
      : mode === 'continue'
        ? 'Continue the current artifact with a next section'
        : mode === 'explain'
          ? 'Explain the artifact contract'
          : 'Generate a new XCON artifact';
  const displayTitle = escapeSketchText(title);
  const demoBlock = /\b(workflow|monitor|demo|runtime)\b/i.test(prompt)
    ? [
        '```xcon-demo',
        'demo "Gowoori workflow monitor"',
        'mode "playback"',
        'autoplay false',
        'scene.1.id "render"',
        'scene.1.title "Render workflow artifact"',
        'scene.1.duration 900',
        'scene.1.actions [{"type":"render","target":"xcon","duration":900}]',
        '```',
        '',
      ].join('\n')
    : '';
  const richComponentBlock = createMockRichComponentBlock(prompt, mode);

  return `${demoBlock}# Gowoori artifact

${intent}: **${title}**

\`\`\`xcon-chain-fixture
{
  "record": {
    "title": "${escapeSketchText(title)}",
    "intent": "${intent}",
    "status": "Ready for Gowoori",
    "progress": 68,
    "items": [
      { "name": "Brief", "state": "captured" },
      { "name": "SKETCH", "state": "generated" },
      { "name": "Workflow", "state": "pending" }
    ]
  }
}

\`\`\`

\`\`\`xcon-chain as statusLabel
= record.status
\`\`\`

\`\`\`xcon-chain as intentLabel
= record.intent
\`\`\`

\`\`\`xcon-sketch
screen "Gowoori Document" 720x520
  backgroundColor "#f8fafc"
  hero: panel at 28 28 664 144
    backgroundColor "#0f172a"
    border
      visible false
      radius 24
    title: label "${displayTitle}" at 28 24 430 34
      color "#ffffff"
      font
        size 26
        weight 800
    badge: label "$statusLabel" at 494 28 132 28
      backgroundColor "#dcfce7"
      color "#166534"
      align "center"
      border
        visible false
        radius 14
      font
        size 12
        weight 800
    sub: label "$intentLabel" at 28 72 500 22
      color "#bfdbfe"
      font
        size 14
        weight 600
    intro: label "Gowoori converted your request into a Markdown + XCON/SKETCH artifact." at 28 108 520 24
      color "#e0f2fe"
      font
        size 13
        weight 600
  note: panel at 28 204 664 104
    backgroundColor "#eef6ff"
    border
      visible true
      width 1
      color "#bfdbfe"
      radius 18
    noteTitle: label "Generated by GowooriChat" at 20 18 190 22
      color "#1e3a8a"
      font
        size 16
        weight 800
    noteText: label "Ask for a chart, grid, map, banner, QR code, or dashboard to render richer components." at 20 48 570 22
      color "#475569"
      font
        size 12
        weight 600
\`\`\`${richComponentBlock}`;
}

interface MockWeatherDailyRow {
  date: string;
  day: string;
  condition: string;
  highC: number;
  lowC: number;
  rainProbability: number;
  note: string;
}

function createMockWeeklyWeatherGowooriResponse(prompt: string, agentData?: GowooriAgentDataPacket | null): string {
  const route = routeGowooriUserPrompt(prompt, 'generate');
  const packet = agentData?.kind === 'weather-weekly' ? agentData : createFallbackGowooriAgentDataPacket(route, prompt);
  const data = (packet?.kind === 'weather-weekly' ? packet.data : {}) as Record<string, unknown>;
  const city = getMockString(data.city, getRequestedMockWeatherCity(prompt));
  const region = getMockString(data.region, city);
  const latitude = getMockNumber(
    data.latitude,
    city.includes('제주') ? 33.4996 : city.includes('대전') ? 36.3504 : 37.5665,
  );
  const longitude = getMockNumber(
    data.longitude,
    city.includes('제주') ? 126.5312 : city.includes('대전') ? 127.3845 : 126.978,
  );
  const current = getMockRecord(data.current);
  const currentTemp = getMockNumber(current.temperatureC, city.includes('제주') ? 18.8 : 22.9);
  const feelsLike = getMockNumber(current.feelsLikeC, Math.round((currentTemp + 0.4) * 10) / 10);
  const condition = getMockString(
    current.condition,
    city.includes('제주') ? '부분 흐림, 강한 바람' : '맑음, 오후에는 가벼운 바람',
  );
  const humidity = getMockNumber(current.humidity, city.includes('제주') ? 60 : 46);
  const windMs = getMockNumber(current.windMs, city.includes('제주') ? 14.8 : 2.8);
  const daily = getMockWeeklyDailyRows(data.daily);
  const highMax = Math.max(...daily.map((item) => item.highC));
  const lowMin = Math.min(...daily.map((item) => item.lowC));
  const maxRain = Math.max(...daily.map((item) => item.rainProbability));
  const chartData = {
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
  const gridSnapshot = createMockWeatherSpanGridSnapshot(daily);
  const markerTitle = `${region} 기준 예보`;

  return `## 이번주 ${escapeSketchText(city)} 날씨 요약

${escapeSketchText(region)}는 이번 주 최저 ${lowMin}C, 최고 ${highMax}C 범위입니다. 현재는 ${escapeSketchText(condition)}, ${currentTemp}C이며 최대 강수확률은 ${maxRain}%입니다. 차트와 일별 표는 같은 예보 데이터를 기준으로 구성했습니다.

\`\`\`xcon-sketch
screen "${escapeSketchText(city)} 주간 날씨 대시보드" 1180x990 bg #f8fafc
  headerPanel: panel at 24 22 1132 94
    backgroundColor "#0f172a"
    border
      visible true
      width 1
      color "#0f172a"
      radius 8
    titleLabel: label "${escapeSketchText(city)} 주간 날씨 대시보드" at 28 18 380 30
      color "#ffffff"
      font
        size 22
        weight 700
    subtitleLabel: label "${escapeSketchText(region)} 기준 주간 예보  현재 ${currentTemp}C  체감 ${feelsLike}C" at 28 54 620 22
      color "#cbd5e1"
      font
        size 13
        weight 500
    currentBadge: label "현재 ${escapeSketchText(condition)}" at 866 20 230 28
      color "#e0f2fe"
      font
        size 14
        weight 700
    windBadge: label "습도 ${humidity}%  바람 ${windMs}m/s" at 866 54 230 22
      color "#fde68a"
      font
        size 12
        weight 700

  summaryCard: panel at 24 138 300 188
    backgroundColor "#ffffff"
    border
      visible true
      width 1
      color "#dbe4ee"
      radius 8
    summaryTitle: label "이번 주 핵심" at 20 18 160 24
      color "#111827"
      font
        size 16
        weight 700
    summaryMain: label "최고 ${highMax}C  최저 ${lowMin}C" at 20 54 230 28
      color "#0369a1"
      font
        size 20
        weight 800
    summaryDesc: label "주간 기온과 강수 흐름을 함께 확인하세요. 강수확률이 높은 날은 작은 우산을 준비하면 좋습니다." at 20 94 250 54
      color "#374151"
      font
        size 12
        weight 500
    summaryRisk: label "최대 강수확률 ${maxRain}%" at 20 156 210 20
      color "#92400e"
      font
        size 12
        weight 700

  currentCard: panel at 344 138 248 188
    backgroundColor "#ecfeff"
    border
      visible true
      width 1
      color "#bae6fd"
      radius 8
    currentTitle: label "현재 날씨" at 18 18 140 22
      color "#164e63"
      font
        size 15
        weight 800
    tempNow: label "${currentTemp}C" at 18 50 110 42
      color "#0f172a"
      font
        size 34
        weight 800
    feelsNow: label "체감 ${feelsLike}C" at 140 62 90 20
      color "#334155"
      font
        size 12
        weight 700
    humidityNow: label "습도 ${humidity}%" at 18 112 90 22
      color "#155e75"
      font
        size 13
        weight 700
    windNow: label "바람 ${windMs}m/s" at 120 112 100 22
      color "#92400e"
      font
        size 13
        weight 700
    conditionNow: label "${escapeSketchText(condition)}" at 18 148 190 22
      color "#0369a1"
      font
        size 13
        weight 800

  tipsCard: panel at 612 138 544 188
    backgroundColor "#ffffff"
    border
      visible true
      width 1
      color "#dbe4ee"
      radius 8
    tipsTitle: label "실용 팁" at 20 18 120 22
      color "#111827"
      font
        size 16
        weight 800
    tipOne: label "1. 강수확률이 높은 날은 외출 전 우산과 교통 상황을 확인하세요." at 20 54 480 22
      color "#374151"
      font
        size 12
        weight 600
    tipTwo: label "2. 최고기온이 오르는 날은 한낮 야외 활동 시간을 줄이는 편이 좋습니다." at 20 86 500 22
      color "#374151"
      font
        size 12
        weight 600
    tipThree: label "3. 바람이 강한 지역은 해안가 이동과 체감온도 변화에 유의하세요." at 20 118 500 22
      color "#374151"
      font
        size 12
        weight 600
    tipFour: label "4. 표의 최고/최저와 강수 열을 함께 보면 일정을 잡기 쉽습니다." at 20 150 510 22
      color "#374151"
      font
        size 12
        weight 600

  chartPanel: panel at 24 348 560 326
    backgroundColor "#ffffff"
    border
      visible true
      width 1
      color "#dbe4ee"
      radius 8
    chartTitle: label "최고 기온과 강수확률 추세" at 20 18 260 24
      color "#111827"
      font
        size 16
        weight 800
    weeklyTrendChart: chart at 20 58 520 232
      chartType "line"
      chartData ${JSON.stringify(chartData)}
    chartNote: label "파란색은 최고 기온, 주황색은 강수확률입니다." at 20 298 390 18
      color "#475569"
      font
        size 12
        weight 600

  mapPanel: panel at 604 348 552 326
    backgroundColor "#ffffff"
    border
      visible true
      width 1
      color "#dbe4ee"
      radius 8
    mapTitle: label "위치 기준" at 20 18 140 24
      color "#111827"
      font
        size 16
        weight 800
    cityMap: map at 20 58 512 226
      latitude ${latitude}
      longitude ${longitude}
      zoom 10
      provider "leaflet"
      tileLayer "OpenStreetMap"
      attribution "(C) OpenStreetMap contributors"
      showControls true
      enableZoom true
      enablePan true
      markers ${JSON.stringify([{ lat: latitude, lng: longitude, title: markerTitle }])}
    mapNote: label "좌표 ${latitude}, ${longitude} 기준 주간 예보입니다." at 20 298 360 18
      color "#475569"
      font
        size 12
        weight 600

  gridPanel: panel at 24 696 1132 264
    backgroundColor "#ffffff"
    border
      visible true
      width 1
      color "#dbe4ee"
      radius 8
    gridTitle: label "일별 예보 표" at 20 14 140 22
      color "#111827"
      font
        size 16
        weight 800
    forecastGrid: spanGrid at 172 14 936 236
      backgroundColor "#ffffff"
      readonly true
      snapshot ${JSON.stringify(gridSnapshot)}
\`\`\`
`;
}

function createMockWeatherSpanGridSnapshot(daily: MockWeatherDailyRow[]): Record<string, unknown> {
  const rows = [
    {
      height: 26,
      cells: ['날짜', '요일', '날씨', '최고/최저', '강수', '메모'].map((text) => ({
        text,
        backColor: '#f1f5f9',
        foreColor: '#111827',
        font: 'bold 9pt sans-serif',
        textAlign: 'MiddleCenter',
      })),
    },
    ...daily.map((item) => ({
      height: 30,
      cells: [
        { text: item.date, backColor: '#ffffff', foreColor: '#111827', textAlign: 'MiddleCenter' },
        { text: item.day, backColor: '#ffffff', foreColor: '#111827', textAlign: 'MiddleCenter' },
        { text: item.condition, backColor: '#ffffff', foreColor: '#111827', textAlign: 'MiddleCenter' },
        { text: `${item.highC}/${item.lowC}C`, backColor: '#ffffff', foreColor: '#111827', textAlign: 'MiddleCenter' },
        {
          text: `${item.rainProbability}%`,
          backColor: item.rainProbability >= 40 ? '#fee2e2' : item.rainProbability >= 15 ? '#ffedd5' : '#dcfce7',
          foreColor: item.rainProbability >= 40 ? '#991b1b' : item.rainProbability >= 15 ? '#9a3412' : '#166534',
          font: 'bold 9pt sans-serif',
          textAlign: 'MiddleCenter',
        },
        { text: item.note, backColor: '#ffffff', foreColor: '#111827', textAlign: 'MiddleCenter' },
      ],
    })),
  ];

  return {
    width: 936,
    height: rows.reduce((sum, row) => sum + row.height, 0),
    cols: [{ width: 100 }, { width: 100 }, { width: 180 }, { width: 180 }, { width: 120 }, { width: 256 }],
    rows,
    gridBorder: {
      borderDirection: 'All',
      lineStyle: 'Solid',
      lineWidth: 1,
      topColor: '#dbe4ee',
      leftColor: '#dbe4ee',
      rightColor: '#dbe4ee',
      bottomColor: '#dbe4ee',
    },
    fixed: { row: 0, col: 0 },
  };
}

function getMockWeeklyDailyRows(value: unknown): MockWeatherDailyRow[] {
  const rows = Array.isArray(value) ? value : [];
  const parsed = rows
    .map((row, index): MockWeatherDailyRow | null => {
      if (!row || typeof row !== 'object') return null;
      const record = row as Record<string, unknown>;
      return {
        date: getMockString(record.date, `6/${11 + index}`),
        day: getMockString(record.day, ['목', '금', '토', '일', '월', '화', '수'][index] ?? ''),
        condition: getMockString(record.condition, '흐림'),
        highC: getMockNumber(record.highC, 24 + index),
        lowC: getMockNumber(record.lowC, 17 + index / 2),
        rainProbability: getMockNumber(record.rainProbability, index > 3 ? 20 : 5),
        note: getMockString(record.note, '날씨 확인'),
      };
    })
    .filter((row): row is MockWeatherDailyRow => Boolean(row));
  if (parsed.length >= 7) return parsed.slice(0, 7);
  return [
    { date: '6/11', day: '목', condition: '부분 흐림', highC: 21.7, lowC: 18.5, rainProbability: 0, note: '날씨 확인' },
    { date: '6/12', day: '금', condition: '흐림', highC: 24.1, lowC: 17.6, rainProbability: 0, note: '날씨 확인' },
    { date: '6/13', day: '토', condition: '흐림', highC: 25, lowC: 19.7, rainProbability: 10, note: '날씨 확인' },
    { date: '6/14', day: '일', condition: '흐림', highC: 27.8, lowC: 18.6, rainProbability: 8, note: '날씨 확인' },
    { date: '6/15', day: '월', condition: '이슬비', highC: 26.5, lowC: 17.5, rainProbability: 16, note: '우산 권장' },
    { date: '6/16', day: '화', condition: '이슬비', highC: 26.3, lowC: 20.5, rainProbability: 25, note: '비 가능성' },
    { date: '6/17', day: '수', condition: '이슬비', highC: 28, lowC: 19.8, rainProbability: 22, note: '습도 확인' },
  ];
}

function getRequestedMockWeatherCity(prompt: string): string {
  const text = String(prompt || '');
  if (/제주|제주도/.test(text)) return '제주';
  if (/대전/.test(text)) return '대전';
  if (/부산/.test(text)) return '부산';
  if (/서울/.test(text)) return '서울';
  return '서울';
}

function getMockRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getMockString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function getMockNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function createMockRichComponentBlock(prompt: string, mode: GowooriRequestMode): string {
  const route = routeGowooriUserPrompt(prompt, mode);
  const components = new Set<GowooriRichComponentId>(
    getGowooriRichComponentRequirements(prompt, route).map((item) => item.component),
  );
  if (components.size === 0) return '';

  const lines = [
    '',
    '',
    '```xcon-sketch',
    'screen "Gowoori Rich Components" 960x660',
    '  backgroundColor "#0f172a"',
    '  richTitle: label "Rich component response" at 32 24 360 34',
    '    color "#f8fafc"',
    '    font',
    '      size 28',
    '      weight 900',
    '  richSubtitle: label "Gowoori selected semantic XCON components from the request." at 32 62 520 22',
    '    color "#cbd5e1"',
    '    font',
    '      size 14',
    '      weight 700',
  ];

  if (components.has('chart')) {
    lines.push(
      '  metricChart: chart at 32 110 280 180',
      '    chartType "bar"',
      '    chartData {"labels":["Alpha","Beta","Gamma"],"datasets":[{"label":"Score","data":[42,68,56],"backgroundColor":["#2563eb","#14b8a6","#f59e0b"]}]}',
    );
  }

  if (components.has('spanGrid')) {
    lines.push(
      '  dataGrid: spanGrid at 338 110 290 180',
      '    backgroundColor "#ffffff"',
      '    readonly true',
      '    snapshot {"width":290,"height":180,"cols":[{"width":110},{"width":90},{"width":80}],"rows":[{"height":34,"cells":[{"text":"Name","backColor":"#f1f5f9","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"Status","backColor":"#f1f5f9","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"Value","backColor":"#f1f5f9","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"Alpha","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleLeft"},{"text":"Ready","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"42","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"Beta","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleLeft"},{"text":"Watch","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"68","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"Gamma","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleLeft"},{"text":"Done","backColor":"#dbeafe","foreColor":"#1d4ed8","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"56","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":0,"col":0}}',
    );
  }

  if (components.has('map')) {
    lines.push(
      '  locationMap: map at 654 110 274 180',
      '    latitude 37.5665',
      '    longitude 126.978',
      '    zoom 12',
      '    provider "leaflet"',
      '    tileLayer "OpenStreetMap"',
      '    attribution "(C) OpenStreetMap contributors"',
      '    markers [{"lat":37.5665,"lng":126.978,"title":"City Hall"},{"lat":37.5704,"lng":126.983,"title":"Studio"}]',
    );
  }

  if (components.has('networkDiagram')) {
    lines.push(
      '  dependencyMap: networkDiagram at 32 330 390 200',
      '    backgroundColor "#111827"',
      '    nodeRadius 24',
      '    primaryColor "#2563eb"',
      '    nodeColor "#14b8a6"',
      '    accentColor "#f59e0b"',
      '    linkColor "#94a3b8"',
      '    textColor "#f8fafc"',
      '    showLabels true',
      '    showArrows true',
      '    nodes [{"id":"api","label":"API","x":80,"y":120},{"id":"queue","label":"Queue","x":220,"y":80},{"id":"worker","label":"Worker","x":220,"y":170},{"id":"db","label":"DB","x":340,"y":120}]',
      '    links [{"source":"api","target":"queue"},{"source":"queue","target":"worker"},{"source":"worker","target":"db"}]',
    );
  }

  if (components.has('banner')) {
    lines.push(
      '  heroBanner: banner at 454 330 474 148',
      '    bannerHeight "148px"',
      '    border',
      '      visible false',
      '      radius 20',
      '    slides [{"title":"Launch ready","subtitle":"A polished hero surface for the request.","image":"https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80"}]',
    );
  }

  if (components.has('image')) {
    lines.push(
      '  previewImage: image at 454 500 132 104',
      '    src "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80"',
      '    objectFit "cover"',
      '    border',
      '      visible false',
      '      radius 18',
    );
  }

  if (components.has('qrCode')) {
    lines.push('  handoffQr: qrCode at 624 500 104 104', '    text "https://xconviewer.dev"');
  }

  if (components.has('button')) {
    lines.push(
      '  actionButton: button "Open result" at 766 534 128 40',
      '    backgroundColor "#2563eb"',
      '    color "#ffffff"',
      '    border',
      '      visible false',
      '      radius 20',
    );
  }

  lines.push('```');
  return lines.join('\n');
}

export function getGowooriMessageSummary(source: string): string {
  const heading = /^#\s+(.+)$/m.exec(source)?.[1];
  return heading ? `Generated "${heading}".` : 'Generated a Gowoori-ready artifact.';
}

function escapeSketchText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
