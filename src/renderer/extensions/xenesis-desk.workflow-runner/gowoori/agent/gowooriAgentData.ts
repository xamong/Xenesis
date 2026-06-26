import type { GowooriAgentRoute } from './gowooriAgent';

export type GowooriAgentDataPacketSource = 'sample' | 'tool';

export interface GowooriAgentDataPacket {
  kind: string;
  source: GowooriAgentDataPacketSource;
  toolName?: string;
  data: Record<string, unknown>;
  instructions?: string[];
}

interface WeatherLocationSeed {
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
}

const WEATHER_LOCATION_SEEDS: WeatherLocationSeed[] = [
  {
    city: '서울',
    region: '서울특별시',
    latitude: 37.5665,
    longitude: 126.978,
    current: {
      temperatureC: 22.9,
      feelsLikeC: 23,
      condition: '맑음, 오후에는 가벼운 바람',
      humidity: 46,
      windMs: 2.8,
    },
  },
  {
    city: '대전',
    region: '대전광역시',
    latitude: 36.3504,
    longitude: 127.3845,
    current: {
      temperatureC: 23.4,
      feelsLikeC: 22.3,
      condition: '초반 선선, 주말부터 더움',
      humidity: 55,
      windMs: 3.2,
    },
  },
  {
    city: '제주',
    region: '제주특별자치도',
    latitude: 33.4996,
    longitude: 126.5312,
    current: {
      temperatureC: 27.4,
      feelsLikeC: 28,
      condition: '구름 조금, 강풍 주의',
      humidity: 60,
      windMs: 5.1,
    },
  },
  {
    city: '부산',
    region: '부산광역시',
    latitude: 35.1796,
    longitude: 129.0756,
    current: {
      temperatureC: 24.1,
      feelsLikeC: 24,
      condition: '흐림, 해안 바람',
      humidity: 58,
      windMs: 4.4,
    },
  },
];

export function createGowooriAgentDataSection(route: GowooriAgentRoute, prompt: string): string[] {
  return createGowooriAgentDataSectionFromPacket(createFallbackGowooriAgentDataPacket(route, prompt));
}

export function createGowooriAgentDataSectionFromPacket(packet: GowooriAgentDataPacket | null | undefined): string[] {
  if (!packet) return [];
  const sourceLine =
    packet.source === 'tool'
      ? `- Data source: tool${packet.toolName ? ` (${packet.toolName})` : ''}.`
      : '- Data source: built-in sample packet.';
  return createDomainDataLines(packet.data, [sourceLine, ...(packet.instructions ?? [])]);
}

export function createFallbackGowooriAgentDataPacket(
  route: GowooriAgentRoute,
  prompt: string,
): GowooriAgentDataPacket | null {
  if (route.intent === 'weather-now') {
    const packet = createWeatherNowPacket(prompt);
    return {
      kind: 'weather-now',
      source: 'sample',
      data: packet,
      instructions: [
        'Use this domain data packet as the source of truth for city, region, temperature, condition, humidity, wind, and recommendations.',
        'If the user requested real-time weather but no live weather API result is attached, clearly describe this as a sample/reference card.',
        'Do not switch to another city and do not reuse any previous weather artifact.',
      ],
    };
  }

  if (route.intent === 'weather-weekly') {
    const packet = createWeatherWeeklyPacket(prompt);
    return {
      kind: 'weather-weekly',
      source: 'sample',
      data: packet,
      instructions: [
        'Use this domain data packet as the source of truth for the weekly weather dashboard.',
        'The xcon-sketch output must include a chart and a spanGrid derived from this daily forecast data.',
        'Do not switch to another city and do not collapse this into a compact single-card weather answer.',
      ],
    };
  }

  if (route.intent === 'ranking-table') {
    return {
      kind: 'ranking-table',
      source: 'sample',
      data: createRankingTableSamplePacket(prompt),
      instructions: [
        'Use this packet as the default ranking or standings data when no live standings tool result is attached.',
        'Render the ranked rows as a spanGrid table, not as raw JSON, markdown code, or a dark code panel.',
        'If this is a live sports request and no live standings API result is attached, state that the values are sample/reference values.',
      ],
    };
  }

  if (route.intent === 'dashboard') {
    return {
      kind: 'dashboard',
      source: 'sample',
      data: createDashboardSamplePacket(prompt),
      instructions: [
        'Use this packet as the default sample data when the user did not provide concrete dashboard metrics.',
        'Prefer chartData, gridData, and status fields from the packet over invented placeholders.',
      ],
    };
  }

  if (route.intent === 'workflow') {
    return {
      kind: 'workflow-monitor',
      source: 'sample',
      data: createWorkflowSamplePacket(prompt),
      instructions: [
        'Use this packet as the default workflow monitoring fixture when the user did not provide concrete runtime state.',
        'Keep workflow actions and monitor state aligned with the packet.',
      ],
    };
  }

  if (route.intent === 'document') {
    return {
      kind: 'business-document',
      source: 'sample',
      data: createDocumentSamplePacket(prompt),
      instructions: [
        'Use this packet as the default business document fixture when the user did not provide concrete values.',
        'Keep Markdown prose, Chain aliases, and SKETCH visual blocks consistent with the packet.',
      ],
    };
  }

  return null;
}

function createWeatherNowPacket(prompt: string): Record<string, unknown> {
  const location = resolveWeatherLocation(prompt);
  return {
    kind: 'weather-now',
    generatedAtKst: '2026-06-10 18:00 KST',
    city: location.city,
    region: location.region,
    latitude: location.latitude,
    longitude: location.longitude,
    weather: {
      ...location.current,
      recommendation: ['얇은 겉옷', '물병', '선글라스'],
      note: '샘플 기준 값입니다. 실시간 API가 연결되면 이 패킷을 API 응답으로 교체하세요.',
    },
  };
}

function createWeatherWeeklyPacket(prompt: string): Record<string, unknown> {
  const location = resolveWeatherLocation(prompt);
  const daily = [
    ['6/10', '수', '구름 조금', 25.3, 14, 51, '작은 우산'],
    ['6/11', '목', '흐림', 25.6, 14, 83, '비 가능성'],
    ['6/12', '금', '맑음', 27.5, 14, 0, '활동 좋음'],
    ['6/13', '토', '더움', 30.5, 14, 4, '수분 보충'],
    ['6/14', '일', '더움', 31.4, 18, 23, '자외선 주의'],
    ['6/15', '월', '더움', 32.6, 18, 20, '오후 더위'],
    ['6/16', '화', '폭염', 33.7, 19, 51, '우산 확인'],
  ].map(([date, day, condition, highC, lowC, rainProbability, note]) => ({
    date,
    day,
    condition,
    highC,
    lowC,
    rainProbability,
    note,
  }));

  return {
    kind: 'weather-weekly',
    generatedAtKst: '2026-06-10 18:00 KST',
    city: location.city,
    region: location.region,
    latitude: location.latitude,
    longitude: location.longitude,
    current: location.current,
    daily,
    chartData: {
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
    },
    gridData: [
      ['날짜', '날씨', '최고/최저', '강수', '메모'],
      ...daily.map((item) => [
        item.date,
        item.condition,
        `${item.highC}/${item.lowC}C`,
        `${item.rainProbability}%`,
        item.note,
      ]),
    ],
    summary: '초반은 비교적 선선하고 주말부터 30C 이상으로 더워집니다. 강수확률이 높은 날은 접이식 우산을 준비하세요.',
  };
}

function createDashboardSamplePacket(prompt: string): Record<string, unknown> {
  return {
    kind: 'dashboard',
    title: prompt.includes('매출') ? '영업 실적 대시보드' : '운영 대시보드',
    metrics: [
      { label: '신규 요청', value: 127, delta: '+12%' },
      { label: '완료율', value: '84.3%', delta: '+4.1%' },
      { label: '위험 항목', value: 6, delta: '-2' },
    ],
    chartData: {
      labels: ['서울', '부산', '대구', '광주'],
      datasets: [
        { label: '성과', data: [132, 98, 84, 76], backgroundColor: ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b'] },
      ],
    },
    gridData: [
      ['담당', '목표', '달성', '상태'],
      ['김민준', '120', '132', '초과'],
      ['이서연', '100', '91', '주의'],
      ['박지훈', '80', '84', '달성'],
    ],
  };
}

function createRankingTableSamplePacket(prompt: string): Record<string, unknown> {
  const isKbo = /kbo|프로야구|야구/i.test(prompt);
  const title = isKbo ? 'KBO 프로야구 순위' : '순위표 대시보드';
  const rows = isKbo
    ? [
        {
          rank: 1,
          team: 'LG 트윈스',
          games: 64,
          wins: 39,
          losses: 23,
          ties: 2,
          pct: '.629',
          gamesBehind: '-',
          streak: '2승',
        },
        {
          rank: 2,
          team: '한화 이글스',
          games: 64,
          wins: 38,
          losses: 24,
          ties: 2,
          pct: '.613',
          gamesBehind: '1.0',
          streak: '1패',
        },
        {
          rank: 3,
          team: '롯데 자이언츠',
          games: 63,
          wins: 35,
          losses: 26,
          ties: 2,
          pct: '.574',
          gamesBehind: '3.5',
          streak: '3승',
        },
        {
          rank: 4,
          team: '삼성 라이온즈',
          games: 65,
          wins: 34,
          losses: 30,
          ties: 1,
          pct: '.531',
          gamesBehind: '6.0',
          streak: '1승',
        },
        {
          rank: 5,
          team: 'SSG 랜더스',
          games: 64,
          wins: 32,
          losses: 30,
          ties: 2,
          pct: '.516',
          gamesBehind: '7.0',
          streak: '2패',
        },
        {
          rank: 6,
          team: 'KIA 타이거즈',
          games: 63,
          wins: 31,
          losses: 31,
          ties: 1,
          pct: '.500',
          gamesBehind: '8.0',
          streak: '1패',
        },
        {
          rank: 7,
          team: '두산 베어스',
          games: 64,
          wins: 29,
          losses: 33,
          ties: 2,
          pct: '.468',
          gamesBehind: '10.0',
          streak: '1승',
        },
        {
          rank: 8,
          team: 'KT 위즈',
          games: 64,
          wins: 28,
          losses: 34,
          ties: 2,
          pct: '.452',
          gamesBehind: '11.0',
          streak: '2승',
        },
        {
          rank: 9,
          team: 'NC 다이노스',
          games: 63,
          wins: 27,
          losses: 35,
          ties: 1,
          pct: '.435',
          gamesBehind: '12.0',
          streak: '3패',
        },
        {
          rank: 10,
          team: '키움 히어로즈',
          games: 64,
          wins: 24,
          losses: 38,
          ties: 2,
          pct: '.387',
          gamesBehind: '15.0',
          streak: '1승',
        },
      ]
    : [
        {
          rank: 1,
          team: 'Alpha Team',
          games: 32,
          wins: 24,
          losses: 8,
          ties: 0,
          pct: '.750',
          gamesBehind: '-',
          streak: '4W',
        },
        {
          rank: 2,
          team: 'Beta Team',
          games: 32,
          wins: 21,
          losses: 10,
          ties: 1,
          pct: '.677',
          gamesBehind: '2.5',
          streak: '1L',
        },
        {
          rank: 3,
          team: 'Gamma Team',
          games: 32,
          wins: 19,
          losses: 12,
          ties: 1,
          pct: '.613',
          gamesBehind: '4.5',
          streak: '2W',
        },
        {
          rank: 4,
          team: 'Delta Team',
          games: 32,
          wins: 17,
          losses: 14,
          ties: 1,
          pct: '.548',
          gamesBehind: '6.5',
          streak: '1W',
        },
        {
          rank: 5,
          team: 'Echo Team',
          games: 32,
          wins: 15,
          losses: 16,
          ties: 1,
          pct: '.484',
          gamesBehind: '8.5',
          streak: '2L',
        },
        {
          rank: 6,
          team: 'Foxtrot Team',
          games: 32,
          wins: 13,
          losses: 18,
          ties: 1,
          pct: '.419',
          gamesBehind: '10.5',
          streak: '1L',
        },
      ];

  const gridData = [
    ['순위', '팀', '경기', '승', '패', '무', '승률', '게임차', '최근'],
    ...rows.map((row) => [
      String(row.rank),
      row.team,
      String(row.games),
      String(row.wins),
      String(row.losses),
      String(row.ties),
      row.pct,
      row.gamesBehind,
      row.streak,
    ]),
  ];

  return {
    kind: 'ranking-table',
    title,
    league: isKbo ? 'KBO' : 'Sample League',
    sport: isKbo ? 'baseball' : 'ranking',
    generatedAtKst: '2026-06-10 18:00 KST',
    note: isKbo
      ? '샘플 기준 순위입니다. 실제 KBO 데이터 API가 연결되면 이 패킷을 최신 순위로 교체하세요.'
      : '샘플 기준 순위입니다. 실제 데이터 도구가 연결되면 이 패킷을 최신 순위로 교체하세요.',
    columns: [
      { id: 'rank', title: '순위', width: 56 },
      { id: 'team', title: '팀', width: 150 },
      { id: 'games', title: '경기', width: 58 },
      { id: 'wins', title: '승', width: 48 },
      { id: 'losses', title: '패', width: 48 },
      { id: 'ties', title: '무', width: 48 },
      { id: 'pct', title: '승률', width: 68 },
      { id: 'gamesBehind', title: '게임차', width: 72 },
      { id: 'streak', title: '최근', width: 70 },
    ],
    rows,
    gridData,
    chartData: {
      labels: rows.slice(0, 5).map((row) => row.team),
      datasets: [
        {
          label: '승수',
          data: rows.slice(0, 5).map((row) => row.wins),
          backgroundColor: ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6'],
        },
      ],
    },
    summary: isKbo
      ? '상위권은 1-3위 격차가 작고, 중위권은 승률 5할 전후로 촘촘하게 붙어 있습니다.'
      : '상위권과 중위권 격차를 표와 차트로 비교할 수 있는 순위표입니다.',
  };
}

function createWorkflowSamplePacket(prompt: string): Record<string, unknown> {
  return {
    kind: 'workflow-monitor',
    title: prompt.includes('배포') ? '배포 워크플로우' : '워크플로우 모니터',
    status: 'running',
    progress: 62,
    queue: [
      { job: 'Collect inputs', state: 'done' },
      { job: 'Run validation', state: 'running' },
      { job: 'Publish artifact', state: 'queued' },
    ],
    scheduler: { intervalMs: 500, iterations: 5 },
  };
}

function createDocumentSamplePacket(prompt: string): Record<string, unknown> {
  return {
    kind: 'business-document',
    title: prompt.includes('견적') ? '견적서' : prompt.includes('주보') ? '주간 안내문' : '업무 보고서',
    author: 'Gowoori',
    metrics: { revenue: 4820000000, growth: 8.4, risk: 'watch' },
    sections: ['요약', '핵심 지표', '세부 표', '다음 액션'],
  };
}

function createDomainDataLines(packet: Record<string, unknown>, instructions: string[]): string[] {
  return [
    '',
    'Domain data packet:',
    ...instructions.map((instruction) => `- ${instruction}`),
    '```json',
    JSON.stringify(packet, null, 2),
    '```',
  ];
}

function resolveWeatherLocation(prompt: string): WeatherLocationSeed {
  const normalized = String(prompt || '');
  return WEATHER_LOCATION_SEEDS.find((location) => normalized.includes(location.city)) ?? WEATHER_LOCATION_SEEDS[0];
}
