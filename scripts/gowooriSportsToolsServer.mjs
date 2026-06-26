import http from 'node:http';
import { fileURLToPath } from 'node:url';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3338;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_ESPN_BASE_URL = 'https://site.web.api.espn.com/apis/v2/sports';
const DEFAULT_KBO_STANDINGS_URL = 'https://www.koreabaseball.com/Record/TeamRank/TeamRank.aspx';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value) {
  return isRecord(value) ? value : {};
}

function normalizeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeRows(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (Array.isArray(row)) {
        return row.reduce((record, cell, index) => {
          record[`col${index + 1}`] = cell;
          return record;
        }, {});
      }
      return isRecord(row) ? row : null;
    })
    .filter((row) => row && Object.keys(row).length > 0);
}

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '');
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    const key = String(entity).toLowerCase();
    if (key.startsWith('#x')) {
      const codePoint = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (key.startsWith('#')) {
      const codePoint = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return Object.hasOwn(named, key) ? named[key] : match;
  });
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value ?? '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function parseHtmlTableCells(rowHtml) {
  return [...String(rowHtml ?? '').matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((cell) => cell !== '');
}

function parseHtmlTables(html) {
  return [...String(html ?? '').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
    .map((tableMatch) =>
      [...tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
        .map((rowMatch) => parseHtmlTableCells(rowMatch[1]))
        .filter((row) => row.length >= 2),
    )
    .filter((rows) => rows.length > 0);
}

function isLikelyStandingsHeader(row) {
  const keys = row.map(normalizeKey);
  return (
    keys.some((key) => key.includes('순위') || key === 'rank') &&
    keys.some((key) => key.includes('팀') || key === 'team') &&
    keys.some((key) => key.includes('경기') || key === 'games' || key === 'gp')
  );
}

function findStandingsTableRows(html) {
  const tables = parseHtmlTables(html);
  return tables.find((rows) => rows.some(isLikelyStandingsHeader)) ?? tables.find((rows) => rows[0]?.length >= 6) ?? [];
}

function mapStandingsHeaderKey(header, index) {
  const key = normalizeKey(header);
  if (key.includes('순위') || key === 'rank') return 'rank';
  if (key.includes('팀명') || key === '팀' || key === 'team') return 'team';
  if (key.includes('승률') || key === 'pct' || key.includes('percent')) return 'pct';
  if (key.includes('게임차') || key === 'gb' || key.includes('gamesbehind')) return 'gamesBehind';
  if (key.includes('최근')) return 'recent';
  if (key.includes('경기') || key === 'games' || key === 'gp') return 'games';
  if (key === '승' || key === 'wins' || key === 'w') return 'wins';
  if (key === '패' || key === 'losses' || key === 'l') return 'losses';
  if (key === '무' || key === 'ties' || key === 't') return 'ties';
  if (key.includes('연속') || key === 'streak' || key === 'strk') return 'streak';
  if (key.includes('홈')) return 'home';
  if (key.includes('방문') || key.includes('원정')) return 'away';
  return `col${index + 1}`;
}

function parseMaybeNumber(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '-' || text === '--') return text;
  const number = Number(text.replace(/,/g, ''));
  return Number.isFinite(number) ? number : text;
}

function normalizeStandingsHtmlRows(html) {
  const tableRows = findStandingsTableRows(html);
  if (!tableRows.length) return [];
  const headerIndex = tableRows.findIndex(isLikelyStandingsHeader);
  const header =
    headerIndex >= 0
      ? tableRows[headerIndex]
      : ['rank', 'team', 'games', 'wins', 'losses', 'ties', 'pct', 'gamesBehind', 'streak'];
  const keys = header.map(mapStandingsHeaderKey);
  const bodyRows = tableRows.slice(headerIndex >= 0 ? headerIndex + 1 : 0);
  return bodyRows
    .map((row, index) => {
      const record = {};
      keys.forEach((key, cellIndex) => {
        const value = row[cellIndex];
        if (value === undefined || value === '') return;
        record[key] = parseMaybeNumber(value);
      });
      if (!record.rank) record.rank = index + 1;
      if (!record.team && row[1]) record.team = row[1];
      return record;
    })
    .filter((row) => normalizeString(row.team) && Object.keys(row).length > 1);
}

function normalizeKboStandingsHtmlPayload(html, request = {}) {
  const rows = normalizeStandingsHtmlRows(html);
  if (!rows.length) {
    throw new Error('KBO standings response did not contain a standings table.');
  }
  return normalizeSportsStandingsPayload(
    {
      source: 'kbo-official',
      title: 'KBO standings',
      league: 'KBO',
      sport: 'baseball',
      rows,
    },
    {
      ...request,
      league: normalizeString(request.league, 'KBO'),
      sport: normalizeString(request.sport, 'baseball'),
    },
  );
}

function findStatValue(stats, names) {
  if (!Array.isArray(stats)) return undefined;
  const wanted = new Set(names.map(normalizeKey));
  for (const stat of stats) {
    if (!isRecord(stat)) continue;
    const statKeys = [stat.name, stat.displayName, stat.shortDisplayName, stat.abbreviation, stat.type].map(
      normalizeKey,
    );
    if (!statKeys.some((key) => wanted.has(key))) continue;
    if (stat.displayValue !== undefined && String(stat.displayValue).trim() !== '') return stat.displayValue;
    if (stat.value !== undefined) return stat.value;
  }
  return undefined;
}

function findStatNumber(stats, names) {
  const value = findStatValue(stats, names);
  if (value === undefined) return undefined;
  const number = Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(number) ? number : undefined;
}

function collectEspnStandingsEntries(value, entries = []) {
  if (!isRecord(value)) return entries;
  const standings = asRecord(value.standings);
  if (Array.isArray(standings.entries)) entries.push(...standings.entries.filter(isRecord));
  if (Array.isArray(value.entries)) entries.push(...value.entries.filter(isRecord));
  const groups = [
    ...(Array.isArray(value.children) ? value.children : []),
    ...(Array.isArray(value.groups) ? value.groups : []),
    ...(Array.isArray(standings.children) ? standings.children : []),
    ...(Array.isArray(standings.groups) ? standings.groups : []),
  ];
  for (const group of groups) collectEspnStandingsEntries(group, entries);
  return entries;
}

function normalizeEspnStandingsRows(payload) {
  const entries = collectEspnStandingsEntries(payload);
  if (!entries.length) return [];
  return entries.map((entry, index) => {
    const team = asRecord(entry.team);
    const stats = Array.isArray(entry.stats) ? entry.stats : [];
    const wins = findStatNumber(stats, ['wins', 'win', 'w']);
    const losses = findStatNumber(stats, ['losses', 'loss', 'l']);
    const ties = findStatNumber(stats, ['ties', 'tie', 't']) ?? 0;
    const games =
      findStatNumber(stats, ['gamesplayed', 'games', 'gp']) ??
      (wins !== undefined && losses !== undefined ? wins + losses + ties : undefined);
    const pct = findStatValue(stats, ['winpercent', 'winpercentage', 'winningpercentage', 'pct', 'percentage']);
    const gamesBehind = findStatValue(stats, ['gamesbehind', 'gb']);
    const streak = findStatValue(stats, ['streak', 'strk']);
    return {
      rank: findStatNumber(stats, ['rank', 'standingrank', 'playoffseed']) ?? index + 1,
      team: normalizeString(
        team.displayName ?? team.name ?? team.shortDisplayName ?? team.location ?? entry.name,
        `Team ${index + 1}`,
      ),
      ...(normalizeString(team.abbreviation) ? { abbreviation: normalizeString(team.abbreviation) } : {}),
      ...(games !== undefined ? { games } : {}),
      ...(wins !== undefined ? { wins } : {}),
      ...(losses !== undefined ? { losses } : {}),
      ...(ties !== undefined ? { ties } : {}),
      ...(pct !== undefined ? { pct } : {}),
      ...(gamesBehind !== undefined ? { gamesBehind } : {}),
      ...(streak !== undefined ? { streak } : {}),
    };
  });
}

function normalizeMatrix(value) {
  if (!Array.isArray(value)) return undefined;
  const matrix = value.filter(Array.isArray).map((row) => row.slice());
  return matrix.length > 0 ? matrix : undefined;
}

function normalizeRecordArray(value) {
  if (!Array.isArray(value)) return undefined;
  const rows = value.filter(isRecord);
  return rows.length > 0 ? rows : undefined;
}

function createGridDataFromRows(rows) {
  if (!rows.length) return undefined;
  const preferred = ['rank', 'team', 'name', 'games', 'wins', 'losses', 'ties', 'pct', 'gamesBehind', 'streak'];
  const keys = preferred.filter((key) => Object.hasOwn(rows[0], key));
  const finalKeys = keys.length > 0 ? keys : Object.keys(rows[0]).slice(0, 8);
  if (!finalKeys.length) return undefined;
  return [finalKeys, ...rows.map((row) => finalKeys.map((key) => row[key]))];
}

function createChartDataFromRows(rows) {
  const topRows = rows.slice(0, 8);
  if (!topRows.length) return undefined;
  return {
    labels: topRows.map((row) => String(row.team ?? row.name ?? row.col2 ?? row.rank ?? '')),
    datasets: [
      {
        label: 'Wins',
        data: topRows.map((row) => Number(row.wins ?? row.win ?? row.score ?? row.value ?? row.col4 ?? 0)),
        backgroundColor: ['#2563eb', '#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'],
      },
    ],
  };
}

function createGeneratedAtKst(date = new Date()) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
  return `${parts.replace(' ', ' ')} KST`;
}

export function normalizeSportsStandingsPayload(payload, request = {}) {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const result = asRecord(root.result);
  const table = asRecord(root.table);
  const standings = asRecord(root.standings);
  const espnRows = normalizeEspnStandingsRows(root);
  const candidates = [
    root.rows,
    root.standings,
    root.teams,
    data.rows,
    data.standings,
    data.teams,
    result.rows,
    result.standings,
    result.teams,
    table.rows,
    standings.rows,
    standings.teams,
  ];
  const directRows = candidates.map(normalizeRows).find((candidate) => candidate.length > 0);
  const rows = directRows ?? espnRows;
  if (!rows.length) {
    throw new Error('Upstream sports standings response did not contain rows.');
  }
  const fallbackSource = directRows ? 'gowoori-sports-tools-proxy' : 'espn';

  const gridData =
    normalizeMatrix(root.gridData) ??
    normalizeMatrix(data.gridData) ??
    normalizeMatrix(result.gridData) ??
    normalizeMatrix(table.gridData) ??
    createGridDataFromRows(rows);
  const chartData =
    (isRecord(root.chartData) ? root.chartData : undefined) ??
    (isRecord(data.chartData) ? data.chartData : undefined) ??
    (isRecord(result.chartData) ? result.chartData : undefined) ??
    (isRecord(table.chartData) ? table.chartData : undefined) ??
    createChartDataFromRows(rows);

  return {
    source: normalizeString(root.source ?? data.source ?? result.source, fallbackSource),
    generatedAtKst: normalizeString(
      root.generatedAtKst ?? data.generatedAtKst ?? result.generatedAtKst,
      createGeneratedAtKst(),
    ),
    title: normalizeString(
      root.title ?? data.title ?? result.title ?? root.name ?? data.name ?? result.name,
      `${request.league ?? 'Sports'} standings`,
    ),
    league: normalizeString(root.league ?? data.league ?? result.league, request.league ?? ''),
    sport: normalizeString(root.sport ?? data.sport ?? result.sport, request.sport ?? ''),
    columns: normalizeRecordArray(root.columns ?? data.columns ?? result.columns ?? table.columns),
    rows,
    ...(gridData ? { gridData } : {}),
    ...(chartData ? { chartData } : {}),
    ...(normalizeString(root.summary ?? data.summary ?? result.summary)
      ? { summary: normalizeString(root.summary ?? data.summary ?? result.summary) }
      : {}),
    ...(normalizeString(root.note ?? data.note ?? result.note)
      ? { note: normalizeString(root.note ?? data.note ?? result.note) }
      : {}),
  };
}

export function buildSportsStandingsUpstreamUrl(upstreamUrl, request = {}) {
  const url = new URL(String(upstreamUrl || '').trim());
  url.searchParams.set('league', normalizeString(request.league, 'KBO'));
  url.searchParams.set('sport', normalizeString(request.sport, 'baseball'));
  url.searchParams.set('intent', normalizeString(request.intent, 'ranking-table'));
  url.searchParams.set('prompt', normalizeString(request.prompt, 'sports standings'));
  return url;
}

function normalizeSportsProvider(value, hasUpstream) {
  const provider = normalizeKey(value);
  if (provider) return provider;
  return hasUpstream ? 'upstream' : '';
}

function isKboRequest(request = {}) {
  const text = normalizeKey(`${request.league ?? ''} ${request.sport ?? ''} ${request.prompt ?? ''}`);
  return (
    text.includes('kbo') || text.includes('한국프로야구') || text.includes('프로야구') || text.includes('koreabaseball')
  );
}

function resolveSportsProvider(provider, request, hasUpstream) {
  if (provider === 'auto') return isKboRequest(request) ? 'kbo' : 'espn';
  if (provider) return provider;
  return hasUpstream ? 'upstream' : '';
}

function inferEspnLeagueKey(league) {
  const key = normalizeKey(league || 'KBO');
  const aliases = {
    kbo: 'kbo',
    koreanbaseballorganization: 'kbo',
    mlb: 'mlb',
    majorleaguebaseball: 'mlb',
    nba: 'nba',
    nfl: 'nfl',
    nhl: 'nhl',
    epl: 'eng.1',
    premierleague: 'eng.1',
  };
  return aliases[key] ?? key;
}

function inferEspnSportKey(sport, league) {
  const sportKey = normalizeKey(sport);
  const leagueKey = inferEspnLeagueKey(league);
  if (sportKey) {
    const sportAliases = {
      baseball: 'baseball',
      basketball: 'basketball',
      football: 'football',
      soccer: 'soccer',
      hockey: 'hockey',
    };
    return sportAliases[sportKey] ?? sportKey;
  }
  if (leagueKey === 'kbo' || leagueKey === 'mlb') return 'baseball';
  if (leagueKey === 'nba') return 'basketball';
  if (leagueKey === 'nfl') return 'football';
  if (leagueKey === 'nhl') return 'hockey';
  return 'baseball';
}

function buildEspnSportsStandingsUrl(request = {}, baseUrl = DEFAULT_ESPN_BASE_URL) {
  const base = normalizeString(baseUrl, DEFAULT_ESPN_BASE_URL).replace(/\/+$/, '');
  const sport = inferEspnSportKey(request.sport, request.league);
  const league = inferEspnLeagueKey(request.league);
  return new URL(`${base}/${encodeURIComponent(sport)}/${encodeURIComponent(league)}/standings`);
}

function buildKboSportsStandingsUrl(baseUrl = DEFAULT_KBO_STANDINGS_URL) {
  return new URL(normalizeString(baseUrl, DEFAULT_KBO_STANDINGS_URL));
}

async function fetchJsonWithTimeout(fetcher, url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchTextWithTimeout(fetcher, url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'GowooriSportsTools/0.1 (+https://xconviewer.dev)',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function writeJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type, accept',
  });
  res.end(body);
}

export function createGowooriSportsToolsServer(options = {}) {
  const fetcher = options.fetcher ?? globalThis.fetch;
  const upstreamUrl = options.upstreamUrl ?? process.env.GOWOORI_SPORTS_STANDINGS_UPSTREAM_URL ?? '';
  const provider = normalizeSportsProvider(
    options.provider ?? process.env.GOWOORI_SPORTS_STANDINGS_PROVIDER,
    Boolean(normalizeString(upstreamUrl)),
  );
  const espnBaseUrl = options.espnBaseUrl ?? process.env.GOWOORI_SPORTS_ESPN_BASE_URL ?? DEFAULT_ESPN_BASE_URL;
  const kboStandingsUrl =
    options.kboStandingsUrl ?? process.env.GOWOORI_SPORTS_KBO_STANDINGS_URL ?? DEFAULT_KBO_STANDINGS_URL;
  const timeoutMs = Number(options.timeoutMs ?? process.env.GOWOORI_SPORTS_STANDINGS_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const supportedProviders = ['upstream', 'auto', 'espn', 'kbo'];

  if (typeof fetcher !== 'function') {
    throw new Error('A fetch implementation is required.');
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${DEFAULT_HOST}:${DEFAULT_PORT}`}`);

    if (req.method === 'OPTIONS') {
      writeJson(res, 204, {});
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      writeJson(res, 200, {
        ok: true,
        service: 'gowoori-sports-tools',
        routes: ['/sports/standings'],
        upstreamConfigured: Boolean(normalizeString(upstreamUrl)),
        provider: provider || 'unconfigured',
        supportedProviders,
      });
      return;
    }

    if (req.method !== 'GET' || url.pathname !== '/sports/standings') {
      writeJson(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    const request = {
      league: normalizeString(url.searchParams.get('league'), 'KBO'),
      sport: normalizeString(url.searchParams.get('sport'), 'baseball'),
      intent: normalizeString(url.searchParams.get('intent'), 'ranking-table'),
      prompt: normalizeString(url.searchParams.get('prompt'), 'sports standings'),
    };

    if (!provider || (provider === 'upstream' && !normalizeString(upstreamUrl))) {
      writeJson(res, 503, {
        ok: false,
        error: 'GOWOORI_SPORTS_STANDINGS_UPSTREAM_URL is not configured.',
        expectedRoute: '/sports/standings?league=KBO&sport=baseball&intent=ranking-table',
        supportedProviders,
      });
      return;
    }

    if (!supportedProviders.includes(provider)) {
      writeJson(res, 400, {
        ok: false,
        error: `Unsupported sports standings provider "${provider}".`,
        supportedProviders,
      });
      return;
    }

    try {
      const resolvedProvider = resolveSportsProvider(provider, request, Boolean(normalizeString(upstreamUrl)));
      const finalTimeoutMs = Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS;
      if (resolvedProvider === 'kbo') {
        const upstream = buildKboSportsStandingsUrl(kboStandingsUrl);
        const payload = await fetchTextWithTimeout(fetcher, upstream, finalTimeoutMs);
        writeJson(res, 200, normalizeKboStandingsHtmlPayload(payload, request));
        return;
      }
      const upstream =
        resolvedProvider === 'espn'
          ? buildEspnSportsStandingsUrl(request, espnBaseUrl)
          : buildSportsStandingsUpstreamUrl(upstreamUrl, request);
      const payload = await fetchJsonWithTimeout(fetcher, upstream, finalTimeoutMs);
      writeJson(res, 200, normalizeSportsStandingsPayload(payload, request));
    } catch (error) {
      writeJson(res, 502, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const host = process.env.GOWOORI_SPORTS_TOOLS_HOST || DEFAULT_HOST;
  const port = Number(process.env.GOWOORI_SPORTS_TOOLS_PORT || DEFAULT_PORT);
  const server = createGowooriSportsToolsServer();
  server.listen(port, host, () => {
    console.log(`Gowoori sports tools server: http://${host}:${port}`);
    console.log(`Sports standings: http://${host}:${port}/sports/standings`);
  });
}
