import type { GowooriAgentRoute } from './gowooriAgent';

export type GowooriRichComponentId =
  | 'chart'
  | 'spanGrid'
  | 'map'
  | 'networkDiagram'
  | 'banner'
  | 'image'
  | 'qrCode'
  | 'button';

export type GowooriRichComponentPriority = 'required' | 'recommended';

export interface GowooriRichComponentRequirement {
  component: GowooriRichComponentId;
  priority: GowooriRichComponentPriority;
  reason: string;
  requiredText: string;
}

interface ComponentRule {
  component: GowooriRichComponentId;
  requiredPattern: RegExp;
  recommendedPattern: RegExp;
  requiredReason: string;
  recommendedReason: string;
  requiredText: string;
}

interface ComponentPropertyContract {
  label: string;
  pattern: RegExp;
}

const COMPONENT_RULES: ComponentRule[] = [
  {
    component: 'chart',
    requiredPattern:
      /chart|graph|trend|timeseries|time\s*series|forecast|comparison|compare|analytics|차트|그래프|추이|시계열|예보|비교|분석/,
    recommendedPattern:
      /dashboard|metric|kpi|revenue|sales|growth|score|performance|대시보드|지표|매출|실적|성장|성과|점수|순위/,
    requiredReason: 'The request asks for a visual trend, forecast, comparison, or graph.',
    recommendedReason: 'Metric or dashboard content usually communicates better with a chart.',
    requiredText: ': chart at',
  },
  {
    component: 'spanGrid',
    requiredPattern:
      /table|grid|spreadsheet|sheet|ranking|rankings|standings|leaderboard|schedule|invoice|quote|checklist|matrix|표|테이블|그리드|스프레드시트|순위|순위표|랭킹|일정|견적|청구|체크리스트|매트릭스/,
    recommendedPattern: /report|document|rows|columns|list of|records|보고서|문서|행|열|목록|정리/,
    requiredReason: 'The request asks for tabular, ranking, checklist, or spreadsheet-like data.',
    recommendedReason: 'Document/report content with rows and columns should use SpanGrid instead of plain labels.',
    requiredText: ': spanGrid at',
  },
  {
    component: 'map',
    requiredPattern:
      /map|location|route|geo|geography|latitude|longitude|marker|regional|region\s*by\s*region|지도|위치|경로|좌표|위도|경도|마커|지역별|전국/,
    recommendedPattern:
      /city|store|branch|venue|address|weather\s*map|서울|대전|부산|제주|인천|광주|대구|울산|매장|지점|장소|주소|지역/,
    requiredReason: 'The request is location-aware and needs an actual map surface.',
    recommendedReason: 'Location-aware content can be made clearer with a static map preview and markers.',
    requiredText: ': map at',
  },
  {
    component: 'networkDiagram',
    requiredPattern:
      /network|topology|dependency|dependencies|architecture|relationship|graph\s*of|service\s*map|flow\s*map|네트워크|토폴로지|의존성|아키텍처|관계도|구성도|서비스맵|연결\s*구조/,
    recommendedPattern:
      /workflow|pipeline|integration|system|incident|agent|queue|워크플로우|파이프라인|연동|시스템|장애|에이전트|큐/,
    requiredReason: 'The request asks for relationships, dependencies, architecture, or topology.',
    recommendedReason: 'System/workflow content benefits from an explicit relationship diagram.',
    requiredText: ': networkDiagram at',
  },
  {
    component: 'banner',
    requiredPattern:
      /banner|hero|landing|campaign|promotion|promo|showcase|배너|히어로|랜딩|캠페인|홍보|프로모션|쇼케이스/,
    recommendedPattern:
      /product|event|brand|travel|hotel|course|collection|상품|이벤트|브랜드|여행|호텔|코스|컬렉션|소개/,
    requiredReason: 'The request asks for a hero/banner/promotion surface.',
    recommendedReason: 'Product, event, or brand introductions should lead with a banner-like visual block.',
    requiredText: ': banner at',
  },
  {
    component: 'image',
    requiredPattern: /image|photo|picture|gallery|thumbnail|이미지|사진|갤러리|썸네일/,
    recommendedPattern: /product|place|venue|profile|portfolio|상품|장소|매장|프로필|포트폴리오/,
    requiredReason: 'The request explicitly asks for visual imagery.',
    recommendedReason: 'Concrete products, places, and profiles should include real imagery when possible.',
    requiredText: ': image at',
  },
  {
    component: 'qrCode',
    requiredPattern:
      /qr|qr\s*code|qrcode|ticket|invite|check-?in|vcard|share\s*link|큐알|QR|티켓|초대|체크인|공유\s*링크|연락처/,
    recommendedPattern: /event|coupon|reservation|membership|download|link|이벤트|쿠폰|예약|멤버십|다운로드|링크/,
    requiredReason: 'The request asks for QR, ticket, invite, check-in, or share-link output.',
    recommendedReason: 'Events, coupons, reservations, and links often need a QR code for handoff.',
    requiredText: ': qrCode at',
  },
  {
    component: 'button',
    requiredPattern:
      /button|cta|action|click|submit|search|filter|reserve|buy|버튼|액션|클릭|제출|검색|필터|예약|구매|신청/,
    recommendedPattern: /screen|ui|card|dashboard|form|화면|UI|카드|대시보드|폼|입력/,
    requiredReason: 'The request asks for direct user actions.',
    recommendedReason: 'Interactive screens should expose clear buttons or action controls.',
    requiredText: ': button ',
  },
];

const RICH_COMPONENT_PROPERTY_CONTRACTS: Record<GowooriRichComponentId, ComponentPropertyContract[]> = {
  chart: [
    { label: 'chartType', pattern: /^\s*chartType\s+"?(?:bar|line|pie|doughnut|radar|polarArea|scatter|bubble)"?/im },
    { label: 'chartData', pattern: /^\s*chartData\s+(?:\{|\[|\$[A-Za-z_])/im },
  ],
  spanGrid: [
    { label: 'data or snapshot', pattern: /^\s*(?:data|snapshot|dataTemplate)\s+(?:\{|\[|\$[A-Za-z_])/im },
    {
      label: 'columns or snapshot cols',
      pattern: /^\s*(?:columns\s+(?:\[|\$[A-Za-z_])|snapshot\s+\{.*"(?:cols|columns)"\s*:)/im,
    },
  ],
  map: [
    { label: 'latitude', pattern: /^\s*latitude\s+-?\d/im },
    { label: 'longitude', pattern: /^\s*longitude\s+-?\d/im },
    { label: 'zoom', pattern: /^\s*zoom\s+\d/im },
    { label: 'markers', pattern: /^\s*markers\s+(?:\[|\$[A-Za-z_])/im },
  ],
  networkDiagram: [
    { label: 'nodes', pattern: /^\s*nodes\s+(?:\[|\$[A-Za-z_])/im },
    { label: 'links', pattern: /^\s*links\s+(?:\[|\$[A-Za-z_])/im },
  ],
  banner: [
    { label: 'bannerHeight', pattern: /^\s*bannerHeight\s+/im },
    { label: 'slides', pattern: /^\s*slides\s+(?:\[|\$[A-Za-z_])/im },
  ],
  image: [{ label: 'src', pattern: /^\s*src\s+"/im }],
  qrCode: [{ label: 'text', pattern: /^\s*text\s+"/im }],
  button: [],
};

const RICH_COMPONENT_SNIPPETS: Partial<Record<GowooriRichComponentId, string[]>> = {
  chart: [
    'chart snippet:',
    '  metricChart: chart at 32 180 360 220',
    '    chartType "bar"',
    '    chartData {"labels":["Mon","Tue","Wed","Thu"],"datasets":[{"label":"Requests","data":[127,184,163,211],"backgroundColor":["#2563eb","#14b8a6","#f59e0b","#ef4444"]}]}',
  ],
  spanGrid: [
    'spanGrid snippet:',
    '  statusGrid: spanGrid at 32 180 520 220',
    '    backgroundColor "#ffffff"',
    '    readonly true',
    '    snapshot {"width":520,"height":220,"cols":[{"width":150},{"width":150},{"width":120}],"rows":[{"height":34,"cells":[{"text":"Name","backColor":"#f1f5f9","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"Status","backColor":"#f1f5f9","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"Value","backColor":"#f1f5f9","foreColor":"#111827","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"Mina","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleLeft"},{"text":"Ready","backColor":"#dcfce7","foreColor":"#166534","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"127","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"Ari","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleLeft"},{"text":"Review","backColor":"#fef3c7","foreColor":"#92400e","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"84.3%","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleCenter"}]},{"height":36,"cells":[{"text":"Jun","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleLeft"},{"text":"Watch","backColor":"#fee2e2","foreColor":"#991b1b","font":"bold 9pt sans-serif","textAlign":"MiddleCenter"},{"text":"6","backColor":"#ffffff","foreColor":"#111827","textAlign":"MiddleCenter"}]}],"gridBorder":{"borderDirection":"All","lineStyle":"Solid","lineWidth":1,"topColor":"#dbe4ee","leftColor":"#dbe4ee","rightColor":"#dbe4ee","bottomColor":"#dbe4ee"},"fixed":{"row":0,"col":0}}',
  ],
  map: [
    'map snippet:',
    '  cityMap: map at 32 180 520 260',
    '    latitude 37.5665',
    '    longitude 126.978',
    '    zoom 12',
    '    provider "leaflet"',
    '    tileLayer "OpenStreetMap"',
    '    attribution "(C) OpenStreetMap contributors"',
    '    showControls true',
    '    enableZoom true',
    '    enablePan true',
    '    markers [{"lat":37.5665,"lng":126.978,"title":"City Hall"},{"lat":37.5704,"lng":126.983,"title":"Studio"}]',
  ],
  networkDiagram: [
    'networkDiagram snippet:',
    '  topology: networkDiagram at 32 180 520 260',
    '    backgroundColor "#111827"',
    '    nodeRadius 24',
    '    primaryColor "#2563eb"',
    '    nodeColor "#14b8a6"',
    '    accentColor "#f59e0b"',
    '    linkColor "#94a3b8"',
    '    textColor "#f8fafc"',
    '    showLabels true',
    '    showArrows true',
    '    nodes [{"id":"api","label":"API","x":90,"y":130},{"id":"queue","label":"Queue","x":260,"y":80},{"id":"worker","label":"Worker","x":260,"y":190},{"id":"db","label":"DB","x":430,"y":130}]',
    '    links [{"source":"api","target":"queue"},{"source":"queue","target":"worker"},{"source":"worker","target":"db"}]',
  ],
  banner: [
    'banner snippet:',
    '  heroBanner: banner at 32 120 656 220',
    '    bannerHeight "220px"',
    '    direction "horizontal"',
    '    border',
    '      visible false',
    '      radius 24',
    '    slides [{"type":"image","src":"https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80","objectFit":"cover","overlayTitle":"Launch ready","overlaySub":"A polished hero surface for the request.","overlayCta":"Open now","pos":[0,0,656,220]}]',
    '    autoplay',
    '      enabled true',
    '      interval 3500',
    '      loop true',
    '      rolling true',
  ],
  image: [
    'image snippet:',
    '  previewImage: image at 32 180 220 160',
    '    src "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80"',
    '    objectFit "cover"',
    '    border',
    '      visible false',
    '      radius 18',
  ],
  qrCode: [
    'qrCode snippet:',
    '  handoffQr: qrCode at 32 180 160 160',
    '    text "https://xconviewer.dev"',
    '    size 140',
    '    showText true',
  ],
  button: [
    'button snippet:',
    '  primaryAction: button "Open result" at 32 420 140 42',
    '    backgroundColor "#2563eb"',
    '    color "#ffffff"',
    '    border',
    '      visible false',
    '      radius 21',
  ],
};

export function getGowooriRichComponentRequirements(
  prompt: string,
  route?: Pick<GowooriAgentRoute, 'intent'>,
): GowooriRichComponentRequirement[] {
  const text = normalizeStrategyPrompt(prompt);
  const requirements = new Map<GowooriRichComponentId, GowooriRichComponentRequirement>();

  for (const rule of COMPONENT_RULES) {
    if (rule.requiredPattern.test(text)) {
      addRequirement(requirements, {
        component: rule.component,
        priority: 'required',
        reason: rule.requiredReason,
        requiredText: rule.requiredText,
      });
      continue;
    }
    if (rule.recommendedPattern.test(text)) {
      addRequirement(requirements, {
        component: rule.component,
        priority: 'recommended',
        reason: rule.recommendedReason,
        requiredText: rule.requiredText,
      });
    }
  }

  switch (route?.intent) {
    case 'weather-weekly':
      addRequirement(requirements, {
        component: 'chart',
        priority: 'required',
        reason: 'Detailed or weekly weather needs a forecast trend chart.',
        requiredText: ': chart at',
      });
      addRequirement(requirements, {
        component: 'spanGrid',
        priority: 'required',
        reason: 'Detailed or weekly weather needs a daily forecast grid.',
        requiredText: ': spanGrid at',
      });
      break;
    case 'ranking-table':
      addRequirement(requirements, {
        component: 'spanGrid',
        priority: 'required',
        reason: 'Rankings and standings must render rows with SpanGrid.',
        requiredText: ': spanGrid at',
      });
      addRequirement(requirements, {
        component: 'chart',
        priority: 'required',
        reason: 'Rankings and standings dashboards must include a chart for wins, score, or rank comparison.',
        requiredText: ': chart at',
      });
      break;
    case 'dashboard':
      addRequirement(requirements, {
        component: 'chart',
        priority: 'recommended',
        reason: 'Dashboards should include at least one visual metric surface when data exists.',
        requiredText: ': chart at',
      });
      break;
    case 'workflow':
      addRequirement(requirements, {
        component: 'networkDiagram',
        priority: 'recommended',
        reason: 'Workflow and automation artifacts often need dependency or runtime flow diagrams.',
        requiredText: ': networkDiagram at',
      });
      break;
    case 'document':
      addRequirement(requirements, {
        component: 'spanGrid',
        priority: 'recommended',
        reason: 'Documents and reports often need structured tables or reusable grids.',
        requiredText: ': spanGrid at',
      });
      break;
    default:
      break;
  }

  return Array.from(requirements.values());
}

export function getRequiredGowooriRichComponentText(
  prompt: string,
  route?: Pick<GowooriAgentRoute, 'intent'>,
): string[] {
  return getGowooriRichComponentRequirements(prompt, route)
    .filter((item) => item.priority === 'required')
    .map((item) => item.requiredText);
}

export function createGowooriRichComponentStrategyLines(
  prompt: string,
  route: Pick<GowooriAgentRoute, 'intent'>,
): string[] {
  const requirements = getGowooriRichComponentRequirements(prompt, route);
  const required = requirements.filter((item) => item.priority === 'required');
  const recommended = requirements.filter((item) => item.priority === 'recommended');
  const requestLines =
    requirements.length > 0
      ? [
          'Request-specific component plan:',
          ...required.map((item) => `- Required ${item.component}: ${item.reason}`),
          ...recommended.map((item) => `- Recommended ${item.component}: ${item.reason}`),
        ]
      : [
          'Request-specific component plan:',
          '- No special rich component is mandatory. Still prefer finished cards with labels, buttons, images, charts, grids, maps, or diagrams when the content benefits from them.',
        ];

  return [
    '',
    'Rich component strategy:',
    'Choose components from the user request semantics. Do not copy a fixed weather, ranking, or demo screen unless that is the actual request.',
    'The original user request is more important than any previous artifact or sample. If a previous artifact conflicts with the new request, discard the previous domain.',
    ...requestLines,
    '',
    'Component selection matrix:',
    '- Use chart for trends, forecasts, comparisons, KPI dashboards, analytics, sales, rankings, and time-series data.',
    '- Use spanGrid for tables, rankings, schedules, invoices, checklists, matrices, and spreadsheet-like document areas.',
    '- Use map for location, route, venue, store, regional, coordinate, marker, and real-place summaries.',
    '- Use networkDiagram for dependencies, topology, architecture, service maps, workflow relationships, and incident blast radius.',
    '- Use banner plus image for hero, promotion, product, event, campaign, travel, brand, and showcase surfaces.',
    '- Use qrCode for tickets, invites, check-in, coupons, membership, contact, and share-link handoff.',
    '- Use button for clear actions; use label for text; use image for concrete product/place/person visuals.',
    '',
    'Copyable SKETCH rich component snippets:',
    'These snippets are real line-oriented SKETCH. Keep the line breaks and indentation. Never compress SKETCH properties with semicolons.',
    'Keep chartData JSON on one physical line after the chartData property name.',
    'Use chartData as a JSON object with labels and datasets arrays. Do not use an array of label/value records.',
    'Keep chartData, snapshot, markers, nodes, links, slides, and other JSON property values on one physical line after the property name.',
    'For spanGrid snapshot cells, include explicit backColor and foreColor on every visible cell so the grid stays readable in dark and light themes.',
    'If you use a rich component, include its required data properties. Do not create an empty white panel as a placeholder.',
    ...createSelectedRichComponentSnippetLines(requirements),
  ];
}

export function getGowooriRichComponentDiagnostics(
  prompt: string,
  source: string,
  route?: Pick<GowooriAgentRoute, 'intent'>,
): Array<{ severity: 'warning' | 'error'; message: string }> {
  const requirements = getGowooriRichComponentRequirements(prompt, route);
  const diagnostics: Array<{ severity: 'warning' | 'error'; message: string }> = [];

  for (const requirement of requirements) {
    if (!source.includes(requirement.requiredText)) {
      diagnostics.push({
        severity: requirement.priority === 'required' ? 'error' : 'warning',
        message: `${capitalizeComponent(requirement.component)} component is ${requirement.priority} for this request: ${requirement.reason}`,
      });
      continue;
    }

    for (const missingProperty of getMissingRichComponentProperties(requirement.component, source)) {
      diagnostics.push({
        severity: requirement.priority === 'required' ? 'error' : 'warning',
        message: `${capitalizeComponent(requirement.component)} component is missing required ${missingProperty}. Add a complete, renderable ${requirement.component} block instead of a blank placeholder.`,
      });
    }
  }

  if (isWeakLabelOnlyArtifact(source) && requirements.some((item) => item.component !== 'button')) {
    diagnostics.push({
      severity: 'warning',
      message:
        'The artifact appears label/panel-heavy. Use the selected rich components instead of plain text-only cards when data or visual structure is requested.',
    });
  }

  return diagnostics;
}

function createSelectedRichComponentSnippetLines(requirements: GowooriRichComponentRequirement[]): string[] {
  const selected = new Set<GowooriRichComponentId>();
  for (const requirement of requirements) selected.add(requirement.component);
  if (selected.size === 0) {
    selected.add('chart');
    selected.add('spanGrid');
    selected.add('button');
  }

  const lines: string[] = [];
  for (const component of selected) {
    const snippet = RICH_COMPONENT_SNIPPETS[component];
    if (!snippet) continue;
    if (lines.length > 0) lines.push('');
    lines.push(...snippet);
  }
  return lines;
}

function getMissingRichComponentProperties(component: GowooriRichComponentId, source: string): string[] {
  return RICH_COMPONENT_PROPERTY_CONTRACTS[component]
    .filter((contract) => !contract.pattern.test(source))
    .map((contract) => contract.label);
}

function addRequirement(
  requirements: Map<GowooriRichComponentId, GowooriRichComponentRequirement>,
  next: GowooriRichComponentRequirement,
): void {
  const current = requirements.get(next.component);
  if (!current || (current.priority === 'recommended' && next.priority === 'required')) {
    requirements.set(next.component, next);
  }
}

function isWeakLabelOnlyArtifact(source: string): boolean {
  const visualComponentMatches =
    source.match(/:\s*(chart|spanGrid|map|networkDiagram|banner|image|qrCode|list)\s+at/g) ?? [];
  const labelMatches = source.match(/:\s*label\s+/g) ?? [];
  return visualComponentMatches.length === 0 && labelMatches.length >= 6;
}

function normalizeStrategyPrompt(prompt: string): string {
  return String(prompt || '')
    .trim()
    .toLowerCase();
}

function capitalizeComponent(component: string): string {
  return component.charAt(0).toUpperCase() + component.slice(1);
}
