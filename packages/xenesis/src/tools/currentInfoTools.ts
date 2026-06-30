import { z } from 'zod';
import type { Tool } from './types.js';

const weatherInput = z
  .object({
    location: z.string().min(1).nullable().optional(),
    units: z.enum(['metric', 'imperial']).nullable().optional(),
  })
  .strict();

const weatherForecastInput = z
  .object({
    location: z.string().min(1).nullable().optional(),
    scope: z.enum(['local', 'korea_nationwide']).nullable().optional(),
    range: z.enum(['today', 'tomorrow', 'weekend', 'week']).nullable().optional(),
    units: z.enum(['metric', 'imperial']).nullable().optional(),
  })
  .strict();

const newsInput = z
  .object({
    query: z.string().min(1).nullable().optional(),
    region: z.string().min(2).max(8).nullable().optional(),
    language: z.string().min(2).max(8).nullable().optional(),
    freshnessDays: z.number().int().positive().max(90).nullable().optional(),
    maxResults: z.number().int().positive().max(10).nullable().optional(),
  })
  .strict();

const marketInput = z
  .object({
    symbol: z.string().min(1),
    market: z.string().min(1).nullable().optional(),
  })
  .strict();

const sportsInput = z
  .object({
    league: z.enum([
      'nba',
      'nfl',
      'mlb',
      'nhl',
      'epl',
      'fifa_world_cup',
      'fifa_club_world_cup',
      'fifa_world_cup_qualifying',
    ]),
    team: z.string().min(1).nullable().optional(),
    maxEvents: z.number().int().positive().max(20).nullable().optional(),
  })
  .strict();

type WeatherInput = z.infer<typeof weatherInput>;
type WeatherForecastInput = z.infer<typeof weatherForecastInput>;
type NewsInput = z.infer<typeof newsInput>;
type MarketInput = z.infer<typeof marketInput>;
type SportsInput = z.infer<typeof sportsInput>;

interface WeatherData {
  location: string;
  time?: string;
  temperature?: number;
  apparentTemperature?: number;
  humidity?: number;
  precipitation?: number;
  weatherCode?: number;
  windSpeed?: number;
  units: Record<string, string>;
  source: string;
}

interface WeatherForecastDay {
  date: string;
  condition: string;
  max?: number;
  min?: number;
  precipitationProbability?: number;
}

interface WeatherForecastData {
  scope: 'local' | 'korea_nationwide';
  location: string;
  range: string;
  days: WeatherForecastDay[];
  source: string;
}

interface NewsItem {
  title: string;
  link: string;
  pubDate?: string;
  source?: string;
}

interface MarketQuote {
  symbol: string;
  date: string;
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  source: string;
}

interface YahooChartPayload {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        longName?: string;
        currency?: string;
        regularMarketPrice?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        regularMarketTime?: number;
        timezone?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
}

interface SportsEvent {
  name: string;
  date?: string;
  status?: string;
  competitors: Array<{
    name: string;
    abbreviation?: string;
    score?: string;
    homeAway?: string;
  }>;
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function fetchJson<T>(url: string): Promise<{ response: Response; json?: T }> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'xenesis/0.1',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return { response };
  return {
    response,
    json: (await response.json()) as T,
  };
}

async function fetchText(url: string): Promise<{ response: Response; text: string }> {
  const response = await fetch(url, {
    headers: {
      accept: 'text/plain, text/csv, application/rss+xml, application/xml, text/xml',
      'user-agent': 'xenesis/0.1',
    },
    signal: AbortSignal.timeout(15000),
  });
  return {
    response,
    text: await response.text(),
  };
}

function weatherDescription(code: number | undefined) {
  if (code === undefined) return '상태 미확인';
  if (code === 0) return '맑음';
  if (code === 1) return '대체로 맑음';
  if ([2, 3].includes(code)) return '구름 많음';
  if ([45, 48].includes(code)) return '안개';
  if ([51, 53, 55, 56, 57].includes(code)) return '이슬비';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '비';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '눈';
  if ([95, 96, 99].includes(code)) return '뇌우';
  return `날씨 코드 ${code}`;
}

const weatherLocationAliases = new Map<string, string>([
  ['서울', 'Seoul'],
  ['서울시', 'Seoul'],
  ['서울특별시', 'Seoul'],
  ['seoul', 'Seoul'],
  ['부산', 'Busan'],
  ['부산시', 'Busan'],
  ['부산광역시', 'Busan'],
  ['busan', 'Busan'],
  ['인천', 'Incheon'],
  ['인천시', 'Incheon'],
  ['incheon', 'Incheon'],
  ['대구', 'Daegu'],
  ['daegu', 'Daegu'],
  ['대전', 'Daejeon'],
  ['대전시', 'Daejeon'],
  ['대전광역시', 'Daejeon'],
  ['daejeon', 'Daejeon'],
  ['광주', 'Gwangju'],
  ['gwangju', 'Gwangju'],
  ['울산', 'Ulsan'],
  ['ulsan', 'Ulsan'],
  ['세종', 'Sejong'],
  ['sejong', 'Sejong'],
  ['제주', 'Jeju'],
  ['제주시', 'Jeju City'],
  ['jeju', 'Jeju'],
  ['jeju city', 'Jeju City'],
  ['수원', 'Suwon'],
  ['suwon', 'Suwon'],
  ['고양', 'Goyang'],
  ['goyang', 'Goyang'],
  ['용인', 'Yongin'],
  ['yongin', 'Yongin'],
  ['성남', 'Seongnam'],
  ['seongnam', 'Seongnam'],
  ['창원', 'Changwon'],
  ['changwon', 'Changwon'],
  ['청주', 'Cheongju'],
  ['cheongju', 'Cheongju'],
  ['전주', 'Jeonju'],
  ['jeonju', 'Jeonju'],
  ['천안', 'Cheonan'],
  ['cheonan', 'Cheonan'],
  ['포항', 'Pohang'],
  ['pohang', 'Pohang'],
]);

function canonicalWeatherLocation(location: string) {
  const trimmed = location.trim();
  const withoutCountry = trimmed.replace(/\s*,\s*(south korea|republic of korea|korea|대한민국|한국)\s*$/i, '').trim();
  const key = withoutCountry.toLowerCase();
  return weatherLocationAliases.get(withoutCountry) ?? weatherLocationAliases.get(key) ?? withoutCountry;
}

function defaultWeatherLocation(input: WeatherInput, env: NodeJS.ProcessEnv | undefined) {
  return canonicalWeatherLocation(input.location?.trim() || env?.XENESIS_DEFAULT_LOCATION || 'Seoul, South Korea');
}

function unitOption(input: WeatherInput) {
  return input.units === 'imperial' ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '';
}

function forecastUnitOption(input: WeatherForecastInput) {
  return input.units === 'imperial' ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '';
}

function normalizeTemperatureUnit(value: string | undefined) {
  if (!value || value === 'C') return '°C';
  if (value === 'F') return '°F';
  return value;
}

const koreaForecastLocations = [
  { label: '서울', latitude: 37.5665, longitude: 126.978 },
  { label: '대전', latitude: 36.3504, longitude: 127.3845 },
  { label: '부산', latitude: 35.1796, longitude: 129.0756 },
  { label: '광주', latitude: 35.1595, longitude: 126.8526 },
  { label: '제주', latitude: 33.4996, longitude: 126.5312 },
];

function forecastRangeLabel(range: WeatherForecastInput['range']) {
  if (range === 'today') return '오늘';
  if (range === 'tomorrow') return '내일';
  if (range === 'week') return '이번 주';
  return '주말';
}

function forecastDayLimit(range: WeatherForecastInput['range']) {
  if (range === 'today' || range === 'tomorrow') return 1;
  if (range === 'week') return 7;
  return 2;
}

function requestedForecastDays(range: WeatherForecastInput['range']) {
  return range === 'week' ? 7 : 4;
}

function forecastStartIndex(range: WeatherForecastInput['range']) {
  return range === 'tomorrow' ? 1 : 0;
}

async function geocodeLocation(location: string) {
  const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=ko&format=json`;
  const geocode = await fetchJson<{
    results?: Array<{
      name?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    }>;
  }>(geocodeUrl);
  if (!geocode.response.ok) return undefined;
  return geocode.json?.results?.[0];
}

async function fetchForecastDays(
  latitude: number,
  longitude: number,
  input: WeatherForecastInput,
): Promise<{ days: WeatherForecastDay[]; units: Record<string, string> } | undefined> {
  const range = input.range ?? 'weekend';
  const forecastUrl = [
    'https://api.open-meteo.com/v1/forecast',
    `?latitude=${encodeURIComponent(String(latitude))}`,
    `&longitude=${encodeURIComponent(String(longitude))}`,
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    `&forecast_days=${requestedForecastDays(range)}`,
    '&timezone=auto',
    forecastUnitOption(input),
  ].join('');
  const forecast = await fetchJson<{
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
    };
    daily_units?: Record<string, string>;
  }>(forecastUrl);
  if (!forecast.response.ok || !forecast.json?.daily) return undefined;

  const daily = forecast.json.daily;
  const times = daily.time;
  if (!Array.isArray(times)) return undefined;
  const startIndex = forecastStartIndex(range);
  const limit = forecastDayLimit(range);
  const days = times.slice(startIndex, startIndex + limit).map((date, index) => {
    const sourceIndex = startIndex + index;
    return {
      date,
      condition: weatherDescription(daily.weather_code?.[sourceIndex]),
      max: daily.temperature_2m_max?.[sourceIndex],
      min: daily.temperature_2m_min?.[sourceIndex],
      precipitationProbability: daily.precipitation_probability_max?.[sourceIndex],
    };
  });

  return {
    days,
    units: forecast.json.daily_units ?? {},
  };
}

function renderForecastDays(days: WeatherForecastDay[], units: Record<string, string>) {
  const tempUnit = normalizeTemperatureUnit(units.temperature_2m_max);
  const rainUnit = units.precipitation_probability_max ?? '%';
  return days.map((day) =>
    [
      day.date,
      day.condition,
      day.min !== undefined && day.max !== undefined ? `${day.min}${tempUnit}~${day.max}${tempUnit}` : undefined,
      day.precipitationProbability !== undefined ? `강수확률 ${day.precipitationProbability}${rainUnit}` : undefined,
    ]
      .filter(Boolean)
      .join(', '),
  );
}

export const weatherCurrentTool: Tool<WeatherInput, WeatherData> = {
  name: 'weather_current',
  description: 'Get current weather conditions for a location using Open-Meteo.',
  inputSchema: weatherInput,
  openaiInputSchema: weatherInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const location = defaultWeatherLocation(input, context.env);
    const place = await geocodeLocation(location);

    if (!place) {
      return {
        ok: false,
        content: `Weather lookup failed for "${location}" using Open-Meteo.`,
        data: {
          location,
          units: {},
          source: 'Open-Meteo',
        },
      };
    }

    const latitude = place.latitude;
    const longitude = place.longitude;
    if (latitude === undefined || longitude === undefined) {
      return {
        ok: false,
        content: `Weather lookup failed for "${location}" because coordinates were not returned.`,
        data: {
          location,
          units: {},
          source: 'Open-Meteo',
        },
      };
    }

    const forecastUrl = [
      'https://api.open-meteo.com/v1/forecast',
      `?latitude=${encodeURIComponent(String(latitude))}`,
      `&longitude=${encodeURIComponent(String(longitude))}`,
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
      '&timezone=auto',
      unitOption(input),
    ].join('');
    const forecast = await fetchJson<{
      current?: {
        time?: string;
        temperature_2m?: number;
        apparent_temperature?: number;
        relative_humidity_2m?: number;
        precipitation?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      current_units?: Record<string, string>;
    }>(forecastUrl);

    if (!forecast.response.ok || !forecast.json?.current) {
      return {
        ok: false,
        content: `Weather forecast lookup failed for "${location}" using Open-Meteo.`,
        data: {
          location,
          units: {},
          source: 'Open-Meteo',
        },
      };
    }

    const current = forecast.json.current;
    const units = forecast.json.current_units ?? {};
    const resolvedLocation = [place.name, place.country].filter(Boolean).join(', ') || location;
    const temperatureUnit = normalizeTemperatureUnit(units.temperature_2m);
    const apparentUnit = normalizeTemperatureUnit(units.apparent_temperature ?? temperatureUnit);
    const humidityUnit = units.relative_humidity_2m ?? '%';
    const precipitationUnit = units.precipitation ?? '';
    const windUnit = units.wind_speed_10m ?? '';
    const data: WeatherData = {
      location: resolvedLocation,
      time: current.time,
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      precipitation: current.precipitation,
      weatherCode: current.weather_code,
      windSpeed: current.wind_speed_10m,
      units,
      source: 'Open-Meteo',
    };

    return {
      ok: true,
      content: [
        `Weather for ${resolvedLocation}${current.time ? ` at ${current.time}` : ''} (Open-Meteo):`,
        `- Conditions: ${weatherDescription(current.weather_code)}`,
        current.temperature_2m !== undefined ? `- Temperature: ${current.temperature_2m}${temperatureUnit}` : undefined,
        current.apparent_temperature !== undefined
          ? `- Feels like: ${current.apparent_temperature}${apparentUnit}`
          : undefined,
        current.relative_humidity_2m !== undefined
          ? `- Humidity: ${current.relative_humidity_2m}${humidityUnit}`
          : undefined,
        current.precipitation !== undefined
          ? `- Precipitation: ${current.precipitation}${precipitationUnit}`
          : undefined,
        current.wind_speed_10m !== undefined ? `- Wind: ${current.wind_speed_10m}${windUnit}` : undefined,
      ]
        .filter((line): line is string => line !== undefined)
        .join('\n'),
      data,
    };
  },
};

export const weatherForecastTool: Tool<
  WeatherForecastInput,
  WeatherForecastData | { locations: WeatherForecastData[] }
> = {
  name: 'weather_forecast',
  description:
    'Get local or South Korea nationwide weather forecasts for today, tomorrow, weekend, or this week using Open-Meteo.',
  inputSchema: weatherForecastInput,
  openaiInputSchema: weatherForecastInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const range = input.range ?? 'weekend';
    const rangeLabel = forecastRangeLabel(range);
    const scope = input.scope ?? (input.location ? 'local' : 'korea_nationwide');

    if (scope === 'korea_nationwide') {
      const summaries = await Promise.all(
        koreaForecastLocations.map(async (location) => {
          const forecast = await fetchForecastDays(location.latitude, location.longitude, input);
          if (!forecast) return undefined;
          return {
            scope,
            location: location.label,
            range: rangeLabel,
            days: forecast.days,
            source: 'Open-Meteo',
            units: forecast.units,
          };
        }),
      );
      const available = summaries.filter((summary): summary is NonNullable<typeof summary> => summary !== undefined);
      if (available.length === 0) {
        return {
          ok: false,
          content: `전국 ${rangeLabel} 날씨 예보를 Open-Meteo에서 확인하지 못했습니다.`,
          data: { locations: [] },
        };
      }
      return {
        ok: true,
        content: [
          `전국 ${rangeLabel} 날씨 요약 (Open-Meteo):`,
          ...available.map((summary) => {
            const dayText = renderForecastDays(summary.days, summary.units).join(' / ');
            return `- ${summary.location}: ${dayText}`;
          }),
        ].join('\n'),
        data: {
          locations: available.map(({ units: _units, ...summary }) => summary),
        },
      };
    }

    const location = defaultWeatherLocation({ location: input.location, units: input.units }, context.env);
    const place = await geocodeLocation(location);
    if (!place?.latitude || !place.longitude) {
      return {
        ok: false,
        content: `"${location}"의 ${rangeLabel} 날씨 예보를 Open-Meteo에서 확인하지 못했습니다.`,
        data: {
          scope,
          location,
          range: rangeLabel,
          days: [],
          source: 'Open-Meteo',
        },
      };
    }
    const forecast = await fetchForecastDays(place.latitude, place.longitude, input);
    const resolvedLocation = [place.name, place.country].filter(Boolean).join(', ') || location;
    if (!forecast) {
      return {
        ok: false,
        content: `"${resolvedLocation}"의 ${rangeLabel} 날씨 예보를 Open-Meteo에서 확인하지 못했습니다.`,
        data: {
          scope,
          location: resolvedLocation,
          range: rangeLabel,
          days: [],
          source: 'Open-Meteo',
        },
      };
    }

    return {
      ok: true,
      content: [
        `${resolvedLocation} ${rangeLabel} 날씨 예보 (Open-Meteo):`,
        ...renderForecastDays(forecast.days, forecast.units).map((line) => `- ${line}`),
      ].join('\n'),
      data: {
        scope,
        location: resolvedLocation,
        range: rangeLabel,
        days: forecast.days,
        source: 'Open-Meteo',
      },
    };
  },
};

function rssTag(item: string, tagName: string) {
  const match = item.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? decodeXml(match[1]) : undefined;
}

function parseRssItems(xml: string, maxResults: number): NewsItem[] {
  const matches = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  return matches.slice(0, maxResults).map((match) => {
    const item = match[1];
    return {
      title: rssTag(item, 'title') ?? 'Untitled',
      link: rssTag(item, 'link') ?? '',
      pubDate: rssTag(item, 'pubDate'),
      source: rssTag(item, 'source'),
    };
  });
}

function queryTerms(query: string) {
  return query
    .toLowerCase()
    .split(/[\s,./|+_-]+/)
    .map((term) => term.trim())
    .filter(
      (term) => term.length >= 2 && !['the', 'and', 'for', 'with', 'news', 'latest', '오늘', '최신'].includes(term),
    );
}

function newsReferenceDate(env: NodeJS.ProcessEnv | undefined) {
  const raw = env?.XENESIS_CURRENT_DATE;
  const parsed = raw ? new Date(raw) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function isFreshNewsItem(item: NewsItem, referenceDate: Date, freshnessDays: number) {
  if (!item.pubDate) return true;
  const date = new Date(item.pubDate);
  if (Number.isNaN(date.getTime())) return true;
  const maxAgeMs = freshnessDays * 24 * 60 * 60 * 1000;
  return referenceDate.getTime() - date.getTime() <= maxAgeMs;
}

function isRelevantNewsItem(item: NewsItem, terms: string[]) {
  if (terms.length === 0) return true;
  const haystack = `${item.title} ${item.source ?? ''}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

export const newsLatestTool: Tool<NewsInput, { items: NewsItem[]; source: string }> = {
  name: 'news_latest',
  description: 'Get latest news headlines for a query using Google News RSS.',
  inputSchema: newsInput,
  openaiInputSchema: newsInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const query = input.query?.trim() || 'top news';
    const region = (input.region?.trim() || 'KR').toUpperCase();
    const language = (input.language?.trim() || 'ko').toLowerCase();
    const maxResults = input.maxResults ?? 5;
    const freshnessDays = input.freshnessDays ?? 14;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${encodeURIComponent(language)}&gl=${encodeURIComponent(region)}&ceid=${encodeURIComponent(`${region}:${language}`)}`;
    const { response, text } = await fetchText(url);

    if (!response.ok) {
      return {
        ok: false,
        content: `News lookup failed with status ${response.status} for "${query}".`,
        data: { items: [], source: 'Google News RSS' },
      };
    }

    const terms = queryTerms(query);
    const referenceDate = newsReferenceDate(context.env);
    const items = parseRssItems(text, Math.max(maxResults * 3, maxResults))
      .filter((item) => isFreshNewsItem(item, referenceDate, freshnessDays))
      .filter((item) => isRelevantNewsItem(item, terms))
      .slice(0, maxResults);
    if (items.length === 0) {
      return {
        ok: false,
        content: `No recent news headlines found for "${query}" in Google News RSS.`,
        data: { items, source: 'Google News RSS' },
      };
    }

    const sources = [
      ...new Set(items.map((item) => item.source).filter((source): source is string => Boolean(source))),
    ];
    return {
      ok: true,
      content: [
        `Latest news for "${query}" (Google News RSS):`,
        ...items.map((item, index) =>
          [
            `${index + 1}. ${item.title}`,
            item.source ? ` - ${item.source}` : '',
            item.pubDate ? ` (${item.pubDate})` : '',
            item.link ? `\n   ${item.link}` : '',
          ].join(''),
        ),
        `Sources: ${sources.length > 0 ? sources.join(', ') : 'Google News'}`,
      ].join('\n'),
      data: { items, source: 'Google News RSS' },
    };
  },
};

function normalizeMarketSymbol(symbol: string, market: string | null | undefined) {
  const cleanSymbol = symbol
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.^-]/g, '');
  const cleanMarket = market?.trim().toLowerCase();
  if (!cleanMarket || cleanSymbol.includes('.') || cleanSymbol.startsWith('^')) return cleanSymbol;
  return `${cleanSymbol}.${cleanMarket}`;
}

const yahooMarketAliases = new Map<string, string>([
  ['ks11', '^KS11'],
  ['^ks11', '^KS11'],
  ['kospi', '^KS11'],
  ['kospi composite', '^KS11'],
  ['코스피', '^KS11'],
  ['kq11', '^KQ11'],
  ['^kq11', '^KQ11'],
  ['kosdaq', '^KQ11'],
  ['코스닥', '^KQ11'],
]);

function normalizeYahooMarketSymbol(symbol: string, market: string | null | undefined) {
  const raw = symbol.trim();
  const clean = raw
    .toLowerCase()
    .replace(/[^a-z0-9.^\s가-힣-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const alias = yahooMarketAliases.get(clean);
  if (alias) return alias;
  const cleanMarket = market?.trim().toLowerCase();
  if (cleanMarket === 'kr' || cleanMarket === 'korea' || cleanMarket === 'kospi' || cleanMarket === 'kosdaq') {
    const lower = raw.toLowerCase();
    if (lower === 'kospi' || lower === 'ks11') return '^KS11';
    if (lower === 'kosdaq' || lower === 'kq11') return '^KQ11';
  }
  return raw.toUpperCase();
}

function lastFiniteNumber(values: Array<number | null> | undefined) {
  if (!values) return undefined;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function formatMarketNumber(value: number | undefined) {
  return value === undefined ? '' : String(Number(value.toFixed(4)));
}

function yahooTimestamp(value: number | undefined) {
  if (!value) return { date: '', time: '' };
  const iso = new Date(value * 1000).toISOString();
  const [date, timeWithMs] = iso.split('T');
  return {
    date: date ?? '',
    time: timeWithMs?.replace(/\.\d{3}Z$/, 'Z') ?? '',
  };
}

async function fetchYahooMarketQuote(input: MarketInput): Promise<MarketQuote | undefined> {
  const yahooSymbol = normalizeYahooMarketSymbol(input.symbol, input.market);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=5d&interval=1d`;
  const { response, json } = await fetchJson<YahooChartPayload>(url);
  const result = json?.chart?.result?.[0];
  if (!response.ok || !result) return undefined;
  const quote = result.indicators?.quote?.[0];
  const meta = result.meta ?? {};
  const close = lastFiniteNumber(quote?.close) ?? meta.regularMarketPrice;
  if (close === undefined) return undefined;
  const timestamp = yahooTimestamp(meta.regularMarketTime ?? result.timestamp?.at(-1));
  return {
    symbol: meta.longName ? `${meta.longName} (${meta.symbol ?? yahooSymbol})` : (meta.symbol ?? yahooSymbol),
    date: timestamp.date,
    time: timestamp.time,
    open: formatMarketNumber(lastFiniteNumber(quote?.open)),
    high: formatMarketNumber(lastFiniteNumber(quote?.high) ?? meta.regularMarketDayHigh),
    low: formatMarketNumber(lastFiniteNumber(quote?.low) ?? meta.regularMarketDayLow),
    close: formatMarketNumber(close),
    volume: formatMarketNumber(lastFiniteNumber(quote?.volume) ?? meta.regularMarketVolume),
    source: 'Yahoo Finance',
  };
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

export const marketQuoteTool: Tool<MarketInput, MarketQuote> = {
  name: 'market_quote',
  description:
    'Get a current stock, index, fund, market status, 주식, 증시, 코스피, 코스닥, KOSPI, or KOSDAQ quote using Stooq CSV data. Use this before news_latest or web_search for stock-market status questions.',
  inputSchema: marketInput,
  openaiInputSchema: marketInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input) {
    const stooqSymbol = normalizeMarketSymbol(input.symbol, input.market);
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
    const { response, text } = await fetchText(url);
    if (!response.ok) {
      const yahooQuote = await fetchYahooMarketQuote(input);
      if (yahooQuote) {
        return {
          ok: true,
          content: renderMarketQuote(yahooQuote),
          data: yahooQuote,
        };
      }
      return {
        ok: false,
        content: `Market quote lookup failed with status ${response.status} for "${input.symbol}".`,
        data: {
          symbol: input.symbol,
          date: '',
          time: '',
          open: '',
          high: '',
          low: '',
          close: '',
          volume: '',
          source: 'Stooq',
        },
      };
    }

    const lines = text.trim().split(/\r?\n/);
    const values = lines[1] ? splitCsvLine(lines[1]) : [];
    const [symbol, date, time, open, high, low, close, volume] = values;
    if (!symbol || !close || close.toUpperCase() === 'N/D') {
      const yahooQuote = await fetchYahooMarketQuote(input);
      if (yahooQuote) {
        return {
          ok: true,
          content: renderMarketQuote(yahooQuote),
          data: yahooQuote,
        };
      }
      return {
        ok: false,
        content: `No market quote found for "${input.symbol}" in Stooq.`,
        data: {
          symbol: input.symbol,
          date: '',
          time: '',
          open: '',
          high: '',
          low: '',
          close: '',
          volume: '',
          source: 'Stooq',
        },
      };
    }

    const data = {
      symbol,
      date: date ?? '',
      time: time ?? '',
      open: open ?? '',
      high: high ?? '',
      low: low ?? '',
      close,
      volume: volume ?? '',
      source: 'Stooq',
    };
    return {
      ok: true,
      content: renderMarketQuote(data),
      data,
    };
  },
};

function renderMarketQuote(quote: MarketQuote) {
  return [
    `Market quote for ${quote.symbol} (${quote.source}):`,
    `- Close: ${quote.close}`,
    quote.open ? `- Open: ${quote.open}` : undefined,
    quote.high && quote.low ? `- Range: ${quote.low} - ${quote.high}` : undefined,
    quote.volume ? `- Volume: ${quote.volume}` : undefined,
    quote.date || quote.time ? `- Timestamp: ${[quote.date, quote.time].filter(Boolean).join(' ')}` : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

const espnLeaguePaths: Record<SportsInput['league'], { path: string; label: string }> = {
  nba: { path: 'basketball/nba', label: 'NBA' },
  nfl: { path: 'football/nfl', label: 'NFL' },
  mlb: { path: 'baseball/mlb', label: 'MLB' },
  nhl: { path: 'hockey/nhl', label: 'NHL' },
  epl: { path: 'soccer/eng.1', label: 'EPL' },
  fifa_world_cup: { path: 'soccer/fifa.world', label: 'FIFA World Cup' },
  fifa_club_world_cup: { path: 'soccer/fifa.cwc', label: 'FIFA Club World Cup' },
  fifa_world_cup_qualifying: { path: 'soccer/fifa.worldq', label: 'FIFA World Cup Qualifying' },
};

function normalizeTeam(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseSportsEvents(payload: unknown, team: string | null | undefined, maxEvents: number): SportsEvent[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const events = (payload as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];
  const teamKey = team ? normalizeTeam(team) : undefined;

  return events
    .map((event): SportsEvent | undefined => {
      if (typeof event !== 'object' || event === null) return undefined;
      const record = event as Record<string, unknown>;
      const competitions = Array.isArray(record.competitions) ? record.competitions : [];
      const competition = competitions.find((item) => typeof item === 'object' && item !== null) as
        | Record<string, unknown>
        | undefined;
      const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
      const parsedCompetitors = competitors.flatMap((competitor) => {
        if (typeof competitor !== 'object' || competitor === null) return [];
        const competitorRecord = competitor as Record<string, unknown>;
        const teamRecord =
          typeof competitorRecord.team === 'object' && competitorRecord.team !== null
            ? (competitorRecord.team as Record<string, unknown>)
            : {};
        return [
          {
            name: String(teamRecord.displayName ?? teamRecord.name ?? 'Unknown team'),
            abbreviation: typeof teamRecord.abbreviation === 'string' ? teamRecord.abbreviation : undefined,
            score: typeof competitorRecord.score === 'string' ? competitorRecord.score : undefined,
            homeAway: typeof competitorRecord.homeAway === 'string' ? competitorRecord.homeAway : undefined,
          },
        ];
      });

      if (
        teamKey &&
        !parsedCompetitors.some((competitor) => {
          return normalizeTeam(`${competitor.name} ${competitor.abbreviation ?? ''}`).includes(teamKey);
        })
      ) {
        return undefined;
      }

      const status =
        typeof record.status === 'object' && record.status !== null
          ? (record.status as { type?: { shortDetail?: unknown; detail?: unknown } }).type
          : undefined;

      return {
        name: String(record.name ?? record.shortName ?? 'Untitled event'),
        date: typeof record.date === 'string' ? record.date : undefined,
        status:
          typeof status?.shortDetail === 'string'
            ? status.shortDetail
            : typeof status?.detail === 'string'
              ? status.detail
              : undefined,
        competitors: parsedCompetitors,
      };
    })
    .filter((event): event is SportsEvent => event !== undefined)
    .slice(0, maxEvents);
}

export const sportsScoresTool: Tool<SportsInput, { league: string; events: SportsEvent[]; source: string }> = {
  name: 'sports_scores',
  description: 'Get current or recent scores and schedule items for major sports leagues using ESPN scoreboard data.',
  inputSchema: sportsInput,
  openaiInputSchema: sportsInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input) {
    const league = espnLeaguePaths[input.league];
    if (!league) {
      return {
        ok: false,
        content: `Unsupported sports league: ${input.league}. For ambiguous competitions such as 월드컵 or 월드컴, specify FIFA World Cup, FIFA Club World Cup, or a supported league.`,
        data: { league: String(input.league), events: [], source: 'ESPN' },
      };
    }
    const url = `https://site.api.espn.com/apis/site/v2/sports/${league.path}/scoreboard`;
    const { response, json } = await fetchJson<unknown>(url);
    if (!response.ok) {
      return {
        ok: false,
        content: `${league.label} scoreboard lookup failed with status ${response.status}.`,
        data: { league: league.label, events: [], source: 'ESPN' },
      };
    }

    const events = parseSportsEvents(json, input.team, input.maxEvents ?? 10);
    if (events.length === 0) {
      return {
        ok: false,
        content: `No ${league.label} scoreboard events found${input.team ? ` for ${input.team}` : ''} in ESPN data.`,
        data: { league: league.label, events, source: 'ESPN' },
      };
    }

    return {
      ok: true,
      content: [
        `${league.label} scoreboard (ESPN):`,
        ...events.map((event, index) => {
          const teams = event.competitors
            .map((competitor) => `${competitor.name}${competitor.score ? ` ${competitor.score}` : ''}`)
            .join(' vs ');
          return [
            `${index + 1}. ${teams || event.name}`,
            event.status ? ` - ${event.status}` : '',
            event.date ? ` (${event.date})` : '',
          ].join('');
        }),
      ].join('\n'),
      data: { league: league.label, events, source: 'ESPN' },
    };
  },
};
