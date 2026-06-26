import type { GowooriRequestMode } from './gowooriProviders';

export type GowooriAgentIntent =
  | 'identity'
  | 'greeting'
  | 'weather-now'
  | 'weather-weekly'
  | 'ranking-table'
  | 'workflow'
  | 'dashboard'
  | 'meta-dashboard'
  | 'document'
  | 'artifact-refine'
  | 'artifact-generate';

export interface GowooriAgentRoute {
  intent: GowooriAgentIntent;
  promptPacks: string[];
  contextPolicy: 'fresh' | 'current-artifact' | 'conversation';
  artifactPolicy: 'generate' | 'repair' | 'refine';
  description: string;
}

export function routeGowooriUserPrompt(prompt: string, mode: GowooriRequestMode = 'generate'): GowooriAgentRoute {
  const normalized = normalizeGowooriPrompt(prompt);
  const artifactPolicy = mode === 'repair' ? 'repair' : mode === 'continue' ? 'refine' : 'generate';

  if (isGowooriIdentityPrompt(normalized)) {
    return {
      intent: 'identity',
      promptPacks: ['00-shared-xcon-contract.md', '02-markdown-xcon-document.md', '09-chat-artifact-simulation.md'],
      contextPolicy: 'fresh',
      artifactPolicy,
      description: 'Explain who Gowoori is and render a compact identity/help card.',
    };
  }

  if (isGowooriGreetingPrompt(normalized)) {
    return {
      intent: 'greeting',
      promptPacks: ['00-shared-xcon-contract.md', '09-chat-artifact-simulation.md'],
      contextPolicy: 'fresh',
      artifactPolicy,
      description: 'Return a friendly Gowoori greeting card.',
    };
  }

  if (isGowooriDetailedWeatherPrompt(normalized)) {
    return {
      intent: 'weather-weekly',
      promptPacks: [
        '00-shared-xcon-contract.md',
        '02-markdown-xcon-document.md',
        '13-dashboard-chart-map-network-recipes.md',
        '15-domain-blueprints.md',
      ],
      contextPolicy: 'fresh',
      artifactPolicy,
      description: 'Create a detailed weather dashboard with Markdown summary, chart, and spanGrid forecast.',
    };
  }

  if (isGowooriWeatherPrompt(normalized)) {
    return {
      intent: 'weather-now',
      promptPacks: ['00-shared-xcon-contract.md', '02-markdown-xcon-document.md', '09-chat-artifact-simulation.md'],
      contextPolicy: 'fresh',
      artifactPolicy,
      description: 'Create a focused weather answer with a polished weather card.',
    };
  }

  if (isGowooriRankingTablePrompt(normalized)) {
    return {
      intent: 'ranking-table',
      promptPacks: [
        '00-shared-xcon-contract.md',
        '02-markdown-xcon-document.md',
        '13-dashboard-chart-map-network-recipes.md',
        '15-domain-blueprints.md',
      ],
      contextPolicy: 'fresh',
      artifactPolicy,
      description: 'Create a ranked table or standings dashboard with spanGrid and optional summary cards.',
    };
  }

  if (isGowooriWorkflowPrompt(normalized)) {
    return {
      intent: 'workflow',
      promptPacks: [
        '00-shared-xcon-contract.md',
        '04-xcon-workflow-generation.md',
        '06-monitoring-dashboard-workflow.md',
        '14-family-binding-workflow-recipes.md',
      ],
      contextPolicy: 'conversation',
      artifactPolicy,
      description: 'Create an XCON Workflow or workflow monitoring artifact.',
    };
  }

  if (isGowooriDocumentPrompt(normalized)) {
    return {
      intent: 'document',
      promptPacks: [
        '00-shared-xcon-contract.md',
        '02-markdown-xcon-document.md',
        '07-template-lab-business-document.md',
      ],
      contextPolicy: 'conversation',
      artifactPolicy,
      description: 'Create a Markdown + XCON document artifact.',
    };
  }

  if (isGowooriRefinePrompt(normalized)) {
    return {
      intent: 'artifact-refine',
      promptPacks: ['00-shared-xcon-contract.md', '08-review-and-repair.md'],
      contextPolicy: 'current-artifact',
      artifactPolicy: 'refine',
      description: 'Refine or repair the current selected Gowoori artifact.',
    };
  }

  if (isGowooriMetaDashboardPrompt(normalized)) {
    return {
      intent: 'meta-dashboard',
      promptPacks: [
        '00-shared-xcon-contract.md',
        '01-sketch-ui-generation.md',
        '13-dashboard-chart-map-network-recipes.md',
        '15-domain-blueprints.md',
      ],
      contextPolicy: 'fresh',
      artifactPolicy,
      description: 'Generate a dashboard using MetaManagement data schema as visualization hints.',
    };
  }

  if (isGowooriDashboardPrompt(normalized)) {
    return {
      intent: 'dashboard',
      promptPacks: [
        '00-shared-xcon-contract.md',
        '01-sketch-ui-generation.md',
        '13-dashboard-chart-map-network-recipes.md',
        '15-domain-blueprints.md',
      ],
      contextPolicy: 'conversation',
      artifactPolicy,
      description: 'Create a dashboard or visual UI artifact.',
    };
  }

  return {
    intent: 'artifact-generate',
    promptPacks: ['00-shared-xcon-contract.md', '02-markdown-xcon-document.md', '09-chat-artifact-simulation.md'],
    contextPolicy: 'fresh',
    artifactPolicy,
    description: 'Answer the user with a self-contained Markdown + XCON/SKETCH artifact.',
  };
}

export function createGowooriAgentRoutingLines(route: GowooriAgentRoute): string[] {
  return [
    '',
    'Gowoori agent routing:',
    `- Agent intent: ${route.intent}`,
    `- Artifact policy: ${route.artifactPolicy}`,
    `- Context policy: ${route.contextPolicy}`,
    `- Prompt packs: ${route.promptPacks.join(', ')}`,
    `- Route goal: ${route.description}`,
    '- The original user request is the source of truth. Do not let previous artifacts or repair input override it.',
  ];
}

export function createGowooriAgentRepairLines(prompt: string): string[] {
  const route = routeGowooriUserPrompt(prompt, 'repair');
  return [
    ...createGowooriAgentRoutingLines(route),
    '- Repair rule: if the broken artifact conflicts with the original user request, discard the conflicting artifact domain.',
    '- Repair rule: preserve syntax and useful layout only when it still answers the original request.',
    '- Repair rule: do not preserve weather, city, product, dashboard, or workflow content unless the original request asks for it.',
  ];
}

export function isGowooriWeatherPrompt(normalizedPrompt: string): boolean {
  return /weather|forecast|temperature|humidity|wind|rain|snow|날씨|기온|온도|습도|바람|비|눈|예보/.test(
    normalizedPrompt,
  );
}

export function isGowooriDetailedWeatherPrompt(normalizedPrompt: string): boolean {
  if (!isGowooriWeatherPrompt(normalizedPrompt)) return false;
  return /weekly|week|7\s*day|seven\s*day|forecast|dashboard|chart|grid|table|detailed|detail|report|compare|이번\s*주|이번주|주간|7일|일주일|예보|차트|그래프|그리드|표|테이블|자세|상세|정리|비교|보고/.test(
    normalizedPrompt,
  );
}

export function isGowooriRankingTablePrompt(normalizedPrompt: string): boolean {
  const asksForRanking =
    /standings|ranking|rankings|ranked|leaderboard|league\s*table|scoreboard|순위표|순위|랭킹|리더보드|팀\s*순위|구단\s*순위|전적|승률/.test(
      normalizedPrompt,
    );
  const rankingDomain = /kbo|baseball|league|team|club|프로야구|야구|축구|농구|배구|리그|팀|구단|선수|종목/.test(
    normalizedPrompt,
  );
  const tableIntent = /dashboard|table|grid|chart|report|대시보드|표|테이블|그리드|차트|그래프|정리|보고/.test(
    normalizedPrompt,
  );
  return asksForRanking && (rankingDomain || tableIntent);
}

export function isGowooriGreetingPrompt(normalizedPrompt: string): boolean {
  const compact = normalizedPrompt.trim().replace(/[.!?。！？~\s]+/g, '');
  return ['hi', 'hello', 'hey', '안녕', '안녕하세요', '하이', '헬로'].includes(compact);
}

function normalizeGowooriPrompt(prompt: string): string {
  return String(prompt || '')
    .trim()
    .toLowerCase();
}

function isGowooriIdentityPrompt(normalizedPrompt: string): boolean {
  return /(너|넌|당신|너희|you).{0,12}(누구|뭐|무엇|정체)|who\s+are\s+you|what\s+are\s+you|introduce\s+yourself|자기\s*소개|너에\s*대해|거울이.{0,12}(누구|뭐|무엇|소개)|gowoori.{0,20}(who|what|introduce)/.test(
    normalizedPrompt,
  );
}

function isGowooriWorkflowPrompt(normalizedPrompt: string): boolean {
  return /workflow|work\s*flow|runner|automation|queue|scheduler|monitor|워크플로우|워크플로|자동화|큐|스케줄|스케쥴|모니터링/.test(
    normalizedPrompt,
  );
}

function isGowooriDocumentPrompt(normalizedPrompt: string): boolean {
  return /document|report|invoice|quote|brief|markdown|문서|보고서|리포트|견적|청구|주보|템플릿|마크다운/.test(
    normalizedPrompt,
  );
}

function isGowooriMetaDashboardPrompt(normalizedPrompt: string): boolean {
  return /자산.*현황|인벤토리|서버.*목록|메타.*대시보드|cmdb|코드.*관리.*보여|meta.*dashboard|inventory/i.test(
    normalizedPrompt,
  );
}

function isGowooriDashboardPrompt(normalizedPrompt: string): boolean {
  return /dashboard|chart|grid|table|map|network|ui|screen|대시보드|차트|그래프|그리드|표|테이블|지도|화면|카드/.test(
    normalizedPrompt,
  );
}

function isGowooriRefinePrompt(normalizedPrompt: string): boolean {
  return /(이거|이것|현재|방금|아까|결과|artifact|current).{0,24}(수정|바꿔|고쳐|정리|작게|크게|compact|refine|repair|fix|change|update)/.test(
    normalizedPrompt,
  );
}
