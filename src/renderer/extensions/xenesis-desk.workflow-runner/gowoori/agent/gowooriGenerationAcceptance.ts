import { routeGowooriUserPrompt } from './gowooriAgent';
import {
  getGowooriRichComponentDiagnostics,
  getRequiredGowooriRichComponentText,
} from './gowooriRichComponentStrategy';

export type GowooriGenerationAcceptanceCaseId =
  | 'weather-card'
  | 'chart-dashboard'
  | 'spangrid-report'
  | 'workflow-monitor'
  | 'map-location-report'
  | 'network-topology-dashboard'
  | 'qr-event-ticket'
  | 'banner-product-showcase'
  | 'rich-component-dashboard'
  | 'generated-artifact';

export type GowooriGenerationAcceptanceSeverity = 'info' | 'warning' | 'error';

export interface GowooriGenerationAcceptanceDiagnostic {
  severity: GowooriGenerationAcceptanceSeverity;
  message: string;
}

export interface GowooriGenerationAcceptanceCase {
  id: GowooriGenerationAcceptanceCaseId;
  title: string;
  prompt: string;
  semanticPrompt?: string;
  requiredText: string[];
}

export interface GowooriGenerationAcceptanceArtifact {
  source: string;
  summary?: string;
  provider?: string;
}

export interface GowooriGenerationAcceptanceNormalizeResult {
  source: string;
  changed?: boolean;
  renderable?: boolean;
  diagnostics?: GowooriGenerationAcceptanceDiagnostic[];
}

export interface GowooriGenerationAcceptanceValidationResult {
  ok: boolean;
  renderableBlockCount: number;
  diagnostics: GowooriGenerationAcceptanceDiagnostic[];
}

export interface GowooriGenerationAcceptanceResult {
  caseId: GowooriGenerationAcceptanceCaseId;
  title: string;
  prompt: string;
  provider: string;
  ok: boolean;
  sourceChars: number;
  renderableBlockCount: number;
  summary: string;
  missingText: string[];
  diagnostics: GowooriGenerationAcceptanceDiagnostic[];
}

export interface GowooriGenerationAcceptanceReport {
  provider: string;
  total: number;
  passed: number;
  failed: number;
  ok: boolean;
  results: GowooriGenerationAcceptanceResult[];
}

export interface GowooriGenerationAcceptanceSuiteOptions {
  provider: string;
  cases?: GowooriGenerationAcceptanceCase[];
  generate: (testCase: GowooriGenerationAcceptanceCase) => Promise<GowooriGenerationAcceptanceArtifact>;
  normalize?: (source: string) => GowooriGenerationAcceptanceNormalizeResult;
  validate: (source: string) => GowooriGenerationAcceptanceValidationResult;
}

export interface GowooriArtifactAcceptanceGateOptions {
  provider: string;
  prompt: string;
  semanticPrompt?: string;
  title?: string;
  source: string;
  requiredText?: string[];
  normalize?: (source: string) => GowooriGenerationAcceptanceNormalizeResult;
  validate: (source: string) => GowooriGenerationAcceptanceValidationResult;
}

const BASE_REQUIRED_TEXT = ['```xcon-chain-fixture', '```xcon-chain as ', '```xcon-sketch'];

const GENERATED_ARTIFACT_REQUIRED_TEXT = ['```xcon-sketch'];

export const GOWOORI_GENERATION_ACCEPTANCE_CASES: GowooriGenerationAcceptanceCase[] = [
  {
    id: 'weather-card',
    title: 'Weather card',
    prompt: [
      'Create a Gowoori artifact for a Seoul weather summary card.',
      'Use Markdown, xcon-chain-fixture sample data, xcon-chain aliases, and one xcon-sketch screen.',
      'Do not place {{...}} expressions inside SKETCH; bind aliases with $alias values.',
    ].join(' '),
    requiredText: BASE_REQUIRED_TEXT,
  },
  {
    id: 'chart-dashboard',
    title: 'Chart dashboard',
    prompt: [
      'Create a compact revenue dashboard for Gowoori with at least one visual chart area.',
      'Include fixture data, derived chain aliases, and a renderable xcon-sketch dashboard.',
      'Keep the answer self-contained for offline preview.',
    ].join(' '),
    requiredText: BASE_REQUIRED_TEXT,
  },
  {
    id: 'spangrid-report',
    title: 'SpanGrid report',
    prompt: [
      'Create a Markdown report for Gowoori with a spreadsheet-like SpanGrid or table summary area.',
      'Use fixture data and chain aliases for totals, then render the report as xcon-sketch.',
      'The artifact must be usable as a document-style preview.',
    ].join(' '),
    requiredText: BASE_REQUIRED_TEXT,
  },
  {
    id: 'workflow-monitor',
    title: 'Workflow monitor',
    prompt: [
      'Create a Gowoori artifact that demonstrates a workflow monitoring card.',
      'Include xcon-demo or workflow-friendly metadata, fixture state, aliases, and an xcon-sketch screen.',
      'The visible screen should show status, progress, and runtime events.',
    ].join(' '),
    requiredText: [...BASE_REQUIRED_TEXT, '```xcon-demo'],
  },
  {
    id: 'map-location-report',
    title: 'Map location report',
    prompt: [
      'Create a Gowoori artifact for a Seoul office location report with a real map preview and markers.',
      'Use Markdown plus a complete xcon-sketch screen.',
      'The visual artifact must include a map component, not only text coordinates.',
    ].join(' '),
    requiredText: [...GENERATED_ARTIFACT_REQUIRED_TEXT, ': map at'],
  },
  {
    id: 'network-topology-dashboard',
    title: 'Network topology dashboard',
    prompt: [
      'Create a Gowoori dashboard that explains a service dependency topology.',
      'Use a networkDiagram for API, worker, database, queue, and notification relationships.',
      'Include supporting status cards or labels.',
    ].join(' '),
    requiredText: [...GENERATED_ARTIFACT_REQUIRED_TEXT, ': networkDiagram at'],
  },
  {
    id: 'qr-event-ticket',
    title: 'QR event ticket',
    prompt: [
      'Create an event invitation ticket with a QR code for check-in.',
      'Use a polished visual card and include the qrCode component.',
    ].join(' '),
    requiredText: [...GENERATED_ARTIFACT_REQUIRED_TEXT, ': qrCode at'],
  },
  {
    id: 'banner-product-showcase',
    title: 'Banner product showcase',
    prompt: [
      'Create a product launch hero showcase with a banner, image, and call-to-action button.',
      'Use XCON/SKETCH components instead of a plain text panel.',
    ].join(' '),
    requiredText: [...GENERATED_ARTIFACT_REQUIRED_TEXT, ': banner at', ': image at', ': button '],
  },
  {
    id: 'rich-component-dashboard',
    title: 'Rich component dashboard',
    prompt: [
      'Create an operations dashboard with chart, spanGrid, map, and networkDiagram sections.',
      'The output should demonstrate how Gowoori chooses rich XCON components for a complex request.',
    ].join(' '),
    requiredText: [
      ...GENERATED_ARTIFACT_REQUIRED_TEXT,
      ': chart at',
      ': spanGrid at',
      ': map at',
      ': networkDiagram at',
    ],
  },
];

export async function runGowooriGenerationAcceptanceSuite(
  options: GowooriGenerationAcceptanceSuiteOptions,
): Promise<GowooriGenerationAcceptanceReport> {
  const cases = options.cases ?? GOWOORI_GENERATION_ACCEPTANCE_CASES;
  const results: GowooriGenerationAcceptanceResult[] = [];

  for (const testCase of cases) {
    results.push(await runGowooriGenerationAcceptanceCase(testCase, options));
  }

  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;

  return {
    provider: options.provider,
    total: results.length,
    passed,
    failed,
    ok: failed === 0,
    results,
  };
}

export function runGowooriArtifactAcceptanceGate(
  options: GowooriArtifactAcceptanceGateOptions,
): GowooriGenerationAcceptanceResult {
  const semanticPrompt = options.semanticPrompt?.trim() ? options.semanticPrompt : options.prompt;
  const requiredText = getGowooriRequiredTextForPrompt(
    semanticPrompt,
    options.requiredText ?? GENERATED_ARTIFACT_REQUIRED_TEXT,
  );
  return evaluateGowooriGeneratedArtifact(
    {
      id: 'generated-artifact',
      title: options.title ?? 'Generated Gowoori artifact',
      prompt: options.prompt,
      semanticPrompt,
      requiredText,
    },
    {
      provider: options.provider,
      source: options.source,
      normalize: options.normalize,
      validate: options.validate,
    },
  );
}

export function hasBlockingGowooriAcceptanceDiagnostics(
  result: Pick<GowooriGenerationAcceptanceResult, 'diagnostics'>,
): boolean {
  return result.diagnostics.some((diagnostic) => {
    if (diagnostic.severity !== 'error') return false;
    return (
      /Generated artifact is missing required text:\s*:\s*(?:chart|spanGrid|map|networkDiagram|banner|image|qrCode)\s+at/i.test(
        diagnostic.message,
      ) ||
      /component is required for this request/i.test(diagnostic.message) ||
      /component is missing required/i.test(diagnostic.message) ||
      /Identity request/i.test(diagnostic.message) ||
      /does not include the requested location/i.test(diagnostic.message) ||
      /Ranking or standings artifacts must/i.test(diagnostic.message) ||
      /Do not answer standings requests/i.test(diagnostic.message)
    );
  });
}

function getGowooriRequiredTextForPrompt(prompt: string, baseRequiredText: string[]): string[] {
  const route = routeGowooriUserPrompt(prompt);
  const richRequiredText = getRequiredGowooriRichComponentText(prompt, route);
  if (isIdentityAcceptancePrompt(prompt)) {
    return uniqueRequiredText([...baseRequiredText, ...richRequiredText, 'Gowoori']);
  }
  return uniqueRequiredText([...baseRequiredText, ...richRequiredText]);
}

function isDetailedWeatherAcceptancePrompt(prompt: string): boolean {
  const normalized = String(prompt || '').toLowerCase();
  const isWeather = /weather|forecast|temperature|humidity|wind|rain|snow|날씨|기온|온도|습도|바람|비|눈|예보/.test(
    normalized,
  );
  if (!isWeather) return false;
  return /weekly|week|7\s*day|seven\s*day|forecast|dashboard|chart|grid|table|detailed|detail|report|compare|이번\s*주|이번주|주간|7일|일주일|예보|차트|그래프|그리드|표|테이블|자세|상세|정리|비교|보고/.test(
    normalized,
  );
}

function isIdentityAcceptancePrompt(prompt: string): boolean {
  const normalized = String(prompt || '')
    .trim()
    .toLowerCase();
  return /(너|넌|당신|너희|you).{0,12}(누구|뭐|무엇|정체)|who\s+are\s+you|what\s+are\s+you|introduce\s+yourself|자기\s*소개|너에\s*대해|거울이.{0,12}(누구|뭐|무엇|소개)|gowoori.{0,20}(who|what|introduce)/.test(
    normalized,
  );
}

function isRankingTableAcceptancePrompt(prompt: string): boolean {
  const normalized = String(prompt || '').toLowerCase();
  const asksForRanking =
    /standings|ranking|rankings|ranked|leaderboard|league\s*table|scoreboard|순위표|순위|랭킹|리더보드|전적|승률/.test(
      normalized,
    );
  const rankingDomain = /kbo|baseball|league|team|club|프로야구|야구|축구|농구|배구|리그|팀|구단|선수|종목/.test(
    normalized,
  );
  const tableIntent = /dashboard|table|grid|chart|report|대시보드|표|테이블|그리드|차트|그래프|정리|보고/.test(
    normalized,
  );
  return asksForRanking && (rankingDomain || tableIntent);
}

function getGowooriSemanticDiagnostics(prompt: string, source: string): GowooriGenerationAcceptanceDiagnostic[] {
  if (!isIdentityAcceptancePrompt(prompt)) return [];

  const diagnostics: GowooriGenerationAcceptanceDiagnostic[] = [];
  const hasGowooriIdentity = /Gowoori|거울이/i.test(source);
  const hasWeatherDomainLeak =
    /서울\s*날씨|대전\s*날씨|날씨\s*정보|weather\s*card|weatherCard|temperature|tempLabel|forecast|기온|온도|습도|바람|예보/.test(
      source,
    );

  if (!hasGowooriIdentity) {
    diagnostics.push({
      severity: 'error',
      message: 'Identity request must identify Gowoori / 거울이 in the generated artifact.',
    });
  }

  if (hasWeatherDomainLeak) {
    diagnostics.push({
      severity: 'error',
      message:
        'Identity request was answered with weather-domain content. Discard previous weather artifacts and answer who Gowoori is.',
    });
  }

  return diagnostics;
}

function getGowooriWeatherLocationDiagnostics(prompt: string, source: string): GowooriGenerationAcceptanceDiagnostic[] {
  if (!isWeatherAcceptancePrompt(prompt)) return [];

  const requestedLocation = getRequestedWeatherLocation(prompt);
  if (!requestedLocation) return [];
  if (source.includes(requestedLocation)) return [];

  return [
    {
      severity: 'error',
      message: `Weather artifact does not include the requested location "${requestedLocation}". Do not reuse a previous city or weather artifact for this request.`,
    },
  ];
}

function getGowooriDetailedWeatherQualityDiagnostics(
  prompt: string,
  source: string,
): GowooriGenerationAcceptanceDiagnostic[] {
  if (!isDetailedWeatherAcceptancePrompt(prompt)) return [];

  const diagnostics: GowooriGenerationAcceptanceDiagnostic[] = [];
  const dateTokens = new Set(source.match(/\b(?:\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\b/g) ?? []);
  if (dateTokens.size < 5) {
    diagnostics.push({
      severity: 'error',
      message:
        'Detailed weekly weather artifact must include dense seven-day daily forecast data, not a one-card or two-day summary.',
    });
  }

  if (!/(최고|high|temperature_2m_max)/i.test(source) || !/(최저|low|temperature_2m_min)/i.test(source)) {
    diagnostics.push({
      severity: 'error',
      message: 'Detailed weekly weather artifact must include high/low temperature fields for the daily forecast.',
    });
  }

  if (!/(강수|rain|precipitation|probability|%)/i.test(source)) {
    diagnostics.push({
      severity: 'error',
      message: 'Detailed weekly weather artifact must include rain or precipitation probability fields.',
    });
  }

  return diagnostics;
}

function getGowooriRankingTableDiagnostics(prompt: string, source: string): GowooriGenerationAcceptanceDiagnostic[] {
  if (!isRankingTableAcceptancePrompt(prompt)) return [];

  const diagnostics: GowooriGenerationAcceptanceDiagnostic[] = [];
  if (!/: spanGrid at/.test(source)) {
    diagnostics.push({
      severity: 'error',
      message: 'Ranking or standings artifacts must render ranked rows with a spanGrid, not raw JSON or a code panel.',
    });
  }

  if (!/(순위|rank)/i.test(source) || !/(팀|team)/i.test(source)) {
    diagnostics.push({
      severity: 'error',
      message: 'Ranking or standings artifacts must include visible rank and team columns.',
    });
  }

  if (!/(승률|pct|percentage|win)/i.test(source)) {
    diagnostics.push({
      severity: 'error',
      message: 'Sports standings artifacts must include winning percentage or win/loss context.',
    });
  }

  if (/```(?:json|javascript|js|ts)\b/i.test(source) || /raw\s*json|code\s*panel|preformatted/i.test(source)) {
    diagnostics.push({
      severity: 'error',
      message: 'Do not answer standings requests with raw JSON, JavaScript, or a code panel. Use SKETCH spanGrid.',
    });
  }

  return diagnostics;
}

function isWeatherAcceptancePrompt(prompt: string): boolean {
  const normalized = String(prompt || '').toLowerCase();
  return /weather|forecast|temperature|humidity|wind|rain|snow|날씨|기온|온도|습도|바람|비|눈|예보/.test(normalized);
}

function getRequestedWeatherLocation(prompt: string): string | null {
  const text = String(prompt || '');
  const knownLocations = [
    '서울',
    '대전',
    '제주',
    '부산',
    '인천',
    '춘천',
    '강릉',
    '광주',
    '대구',
    '울산',
    '세종',
    '수원',
  ];
  return knownLocations.find((location) => text.includes(location)) ?? null;
}

function uniqueRequiredText(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

async function runGowooriGenerationAcceptanceCase(
  testCase: GowooriGenerationAcceptanceCase,
  options: GowooriGenerationAcceptanceSuiteOptions,
): Promise<GowooriGenerationAcceptanceResult> {
  try {
    const artifact = await options.generate(testCase);
    return evaluateGowooriGeneratedArtifact(testCase, {
      provider: options.provider,
      source: artifact.source,
      summary: artifact.summary,
      normalize: options.normalize,
      validate: options.validate,
    });
  } catch (error) {
    return {
      caseId: testCase.id,
      title: testCase.title,
      prompt: testCase.prompt,
      provider: options.provider,
      ok: false,
      sourceChars: 0,
      renderableBlockCount: 0,
      summary: '',
      missingText: testCase.requiredText,
      diagnostics: [
        {
          severity: 'error',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

function evaluateGowooriGeneratedArtifact(
  testCase: GowooriGenerationAcceptanceCase,
  options: {
    provider: string;
    source: string;
    summary?: string;
    normalize?: (source: string) => GowooriGenerationAcceptanceNormalizeResult;
    validate: (source: string) => GowooriGenerationAcceptanceValidationResult;
  },
): GowooriGenerationAcceptanceResult {
  const rawSource = String(options.source || '');
  const normalized = options.normalize ? options.normalize(rawSource) : { source: rawSource };
  const source = normalized.source;
  const validation = options.validate(source);
  const missingText = testCase.requiredText.filter((text) => !source.includes(text));
  const semanticPrompt = testCase.semanticPrompt?.trim() ? testCase.semanticPrompt : testCase.prompt;
  const route = routeGowooriUserPrompt(semanticPrompt);
  const semanticDiagnostics = [
    ...getGowooriRichComponentDiagnostics(semanticPrompt, source, route),
    ...getGowooriSemanticDiagnostics(semanticPrompt, source),
    ...getGowooriWeatherLocationDiagnostics(semanticPrompt, source),
    ...getGowooriDetailedWeatherQualityDiagnostics(semanticPrompt, source),
    ...getGowooriRankingTableDiagnostics(semanticPrompt, source),
  ];
  const semanticErrorCount = semanticDiagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const diagnostics = [
    ...(normalized.diagnostics ?? []),
    ...validation.diagnostics,
    ...missingText.map((text) => ({
      severity: 'error' as const,
      message: `Generated artifact is missing required text: ${text}`,
    })),
    ...semanticDiagnostics,
  ];

  return {
    caseId: testCase.id,
    title: testCase.title,
    prompt: testCase.prompt,
    provider: options.provider,
    ok: validation.ok && missingText.length === 0 && semanticErrorCount === 0,
    sourceChars: source.length,
    renderableBlockCount: validation.renderableBlockCount,
    summary: options.summary ?? '',
    missingText,
    diagnostics,
  };
}
