import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Tool, ToolRegistry } from './types.js';

const toolSearchInput = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().positive().max(30).optional(),
  max_results: z.number().int().positive().max(30).optional(),
});

const toolSearchOpenAIInput = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().positive().max(30).nullable(),
  max_results: z.number().int().positive().max(30).nullable(),
});

interface ToolSearchResult {
  rank: number;
  name: string;
  score: number;
  description: string;
  matched: string[];
}

interface ToolSearchData {
  query: string;
  matches?: string[];
  total_deferred_tools?: number;
  pending_mcp_servers?: string[];
  results: ToolSearchResult[];
}

interface DeferredToolSearchData extends ToolSearchData {
  matches: string[];
  total_deferred_tools: number;
  pending_mcp_servers?: string[];
}

export interface ToolSearchOptions {
  pendingMcpServers?: () => string[];
}

const stopWords = new Set(['a', 'an', 'and', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with']);

const toolHints: Record<string, string[]> = {
  read: ['inspect', 'open', 'file', 'content'],
  write: ['create', 'replace', 'file', 'content'],
  edit: ['replace', 'modify', 'change', 'file', 'exact'],
  list: ['directory', 'files', 'folder', 'ls', 'dir'],
  search: ['grep', 'rg', 'text', 'find', 'content'],
  shell: ['command', 'terminal', 'powershell', 'process'],
  todo: ['plan', 'checklist', 'steps', 'progress'],
  ask: ['question', 'clarify', 'user'],
  agent_task: ['durable', 'queued', 'background', 'task', 'retry', 'cancel'],
  web_fetch: ['http', 'url', 'page', 'download'],
  web_search: ['internet', 'web', 'search'],
  code_symbols: ['code', 'symbol', 'class', 'function', 'interface', 'summary'],
  lsp: ['code', 'definition', 'reference', 'references', 'document', 'symbols', 'navigation'],
  glob: ['files', 'pattern', 'discovery', 'find', 'path'],
  tree: ['files', 'directory', 'structure', 'project', 'discovery'],
  file_info: ['metadata', 'size', 'mtime', 'type'],
  diff: ['compare', 'change', 'preview'],
  patch: ['safe', 'apply', 'replacement', 'modify', 'change'],
  diagnostics: ['test', 'typecheck', 'npm', 'script', 'errors'],
  json: ['json', 'pointer', 'config', 'package'],
  server: ['dev', 'process', 'logs', 'start', 'stop'],
  browser: ['browser', 'render', 'client', 'page', 'dom', 'headless', 'playwright', 'screenshot', 'ui'],
  app_e2e_check: [
    'app',
    'e2e',
    'check',
    'browser',
    'render',
    'rendered',
    'ui',
    'quality',
    'undefined',
    'nan',
    'broken',
    'client',
    'page',
    'smoke',
  ],
  context_index: ['index', 'context', 'workspace'],
  context_search: ['context', 'search', 'workspace'],
  artifact_save: ['artifact', 'save', 'result', 'note'],
  artifact_list: ['artifact', 'list', 'results'],
  artifact_read: ['artifact', 'read', 'result'],
  desk_state: ['xd', 'desk', 'state', 'panels', 'terminals', 'open', 'files'],
  desk_active_context: ['xd', 'desk', 'active', 'context', 'pane', 'file', 'selection'],
  desk_browser_list: ['xd', 'desk', 'browser', 'tab', 'tabs', 'pane', 'count', 'url', 'list'],
  desk_explorer_state: ['xd', 'desk', 'explorer', 'file', 'tree', 'root', 'selected', 'path', 'location'],
  desk_capabilities: ['xd', 'desk', 'capability', 'capabilities', 'bridge', 'discover'],
  desk_call_capability: ['xd', 'desk', 'capability', 'call', 'control', 'command', 'approval'],
  desk_open_file: ['xd', 'desk', 'open', 'file', 'pane', 'artifact'],
  desk_terminal_run: ['xd', 'desk', 'terminal', 'run', 'command', 'powershell'],
  desk_terminal_run_and_wait: ['xd', 'desk', 'terminal', 'run', 'wait', 'command', 'output', 'exit', 'powershell'],
  desk_subagent_start: ['xd', 'desk', 'subagent', 'delegate', 'visible', 'terminal', 'codex', 'claude', 'gemini'],
  desk_subagent_list: ['xd', 'desk', 'subagent', 'list', 'terminal', 'sessions'],
  desk_subagent_tail: ['xd', 'desk', 'subagent', 'tail', 'output', 'logs'],
  desk_subagent_stop: ['xd', 'desk', 'subagent', 'stop', 'kill', 'cancel'],
  desk_command_palette: ['xd', 'desk', 'command', 'palette', 'list', 'search'],
  desk_run_command_palette: ['xd', 'desk', 'command', 'palette', 'run', 'open', 'panel'],
  desk_create_xcon_markdown: ['xd', 'desk', 'xcon', 'sketch', 'markdown', 'artifact', 'create'],
  desk_export_xcon_pdf: ['xd', 'desk', 'xcon', 'markdown', 'pdf', 'export'],
  desk_terminal_tail: ['xd', 'desk', 'terminal', 'tail', 'output', 'logs'],
  desk_terminal_stop: ['xd', 'desk', 'terminal', 'stop', 'kill', 'cancel'],
  desk_context_actions: ['xd', 'desk', 'context', 'actions', 'active', 'pane'],
  desk_recent_diagnostics: ['xd', 'desk', 'diagnostics', 'recent', 'logs', 'errors'],
  desk_playwright_snapshot: ['xd', 'desk', 'playwright', 'browser', 'screenshot', 'snapshot'],
  desk_playwright_run: ['xd', 'desk', 'playwright', 'browser', 'actions', 'automation'],
  desk_safe_file_preview: ['xd', 'desk', 'safe', 'file', 'preview', 'diff', 'write'],
  desk_safe_file_apply: ['xd', 'desk', 'safe', 'file', 'apply', 'write', 'backup'],
  tool_search: ['tool', 'discover', 'recommend', 'capability'],
};

const referencePrompt = [
  'Fetches full schema definitions for deferred tools so they can be called.',
  '',
  "Deferred tools appear by name in <available-deferred-tools> messages. Until fetched, only the name is known - there is no parameter schema, so the tool cannot be invoked. This tool takes a query, matches it against the deferred tool list, and returns the matched tools' complete JSONSchema definitions inside a <functions> block. Once a tool's schema appears in that result, it is callable exactly like any tool defined at the top of the prompt.",
  '',
  'Result format: each matched tool appears as one <function>{"description": "...", "name": "...", "parameters": {...}}</function> line inside the <functions> block - the same encoding as the tool list at the top of this prompt.',
  '',
  'Query forms:',
  '- "select:Read,Edit,Grep" - fetch these exact tools by name',
  '- "notebook jupyter" - keyword search, up to max_results best matches',
  '- "+slack send" - require "slack" in the name, rank by remaining terms',
].join('\n');

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_$]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function parseToolName(name: string) {
  if (name.startsWith('mcp__')) {
    const withoutPrefix = name.replace(/^mcp__/u, '').toLowerCase();
    const parts = withoutPrefix
      .split('__')
      .flatMap((part) => part.split('_'))
      .filter(Boolean);
    return {
      parts,
      full: withoutPrefix.replace(/__/gu, ' ').replace(/_/gu, ' '),
      isMcp: true,
    };
  }

  const parts = name
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .replace(/_/gu, ' ')
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
  return {
    parts,
    full: parts.join(' '),
    isMcp: false,
  };
}

function isDeferredTool(tool: Tool) {
  if (tool.alwaysLoad === true) return false;
  if (tool.name === 'tool_search' || tool.name === 'ToolSearch') return false;
  return tool.isMcp === true || tool.shouldDefer === true;
}

function legacyMcpAlias(name: string) {
  if (!name.startsWith('mcp__')) return undefined;
  const withoutPrefix = name.slice('mcp__'.length).toLowerCase();
  const separator = withoutPrefix.indexOf('__');
  if (separator === -1) return `mcp_${withoutPrefix.replace(/__/gu, '_')}`;
  const serverName = withoutPrefix.slice(0, separator);
  const toolName = withoutPrefix.slice(separator + '__'.length).replace(/__/gu, '_');
  return `mcp_${serverName}_${toolName}`;
}

function findToolByName(tools: Tool[], name: string) {
  const normalized = name.toLowerCase();
  return tools.find((tool) => tool.name.toLowerCase() === normalized || legacyMcpAlias(tool.name) === normalized);
}

function termPattern(term: string) {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'u');
}

function termMatchesTool(term: string, tool: Tool) {
  const parsed = parseToolName(tool.name);
  const pattern = termPattern(term);
  const hint = tool.searchHint?.toLowerCase() ?? '';
  const description = tool.description.toLowerCase();
  return (
    parsed.parts.includes(term) ||
    parsed.parts.some((part) => part.includes(term)) ||
    pattern.test(hint) ||
    pattern.test(description)
  );
}

function scoreDeferredTool(terms: string[], tool: Tool) {
  const parsed = parseToolName(tool.name);
  const hint = tool.searchHint?.toLowerCase() ?? '';
  const description = tool.description.toLowerCase();
  let score = 0;

  for (const term of terms) {
    const pattern = termPattern(term);
    if (parsed.parts.includes(term)) {
      score += parsed.isMcp ? 12 : 10;
    } else if (parsed.parts.some((part) => part.includes(term))) {
      score += parsed.isMcp ? 6 : 5;
    }
    if (parsed.full.includes(term)) score += 3;
    if (hint && pattern.test(hint)) score += 4;
    if (pattern.test(description)) score += 2;
  }

  return score;
}

function searchDeferredTools(registry: ToolRegistry, query: string, maxResults: number) {
  const tools = Array.from(registry.values());
  const deferredTools = tools.filter(isDeferredTool);
  const queryLower = query.toLowerCase().trim();
  const exactMatch = findToolByName(deferredTools, queryLower) ?? findToolByName(tools, queryLower);
  if (exactMatch) {
    return {
      matches: [exactMatch.name],
      deferredTools,
    };
  }

  if (
    (queryLower.startsWith('mcp__') && queryLower.length > 5) ||
    (queryLower.startsWith('mcp_') && queryLower.length > 4)
  ) {
    const matches = deferredTools
      .filter((tool) => {
        const toolName = tool.name.toLowerCase();
        return toolName.startsWith(queryLower) || legacyMcpAlias(toolName)?.startsWith(queryLower);
      })
      .slice(0, maxResults)
      .map((tool) => tool.name);
    if (matches.length > 0) {
      return { matches, deferredTools };
    }
  }

  const selectMatch = query.match(/^select:(.+)$/iu);
  if (selectMatch) {
    const requested = selectMatch[1]!
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const matches: string[] = [];
    for (const name of requested) {
      const tool = findToolByName(deferredTools, name) ?? findToolByName(tools, name);
      if (tool && !matches.includes(tool.name)) matches.push(tool.name);
    }
    return { matches, deferredTools };
  }

  const requiredTerms: string[] = [];
  const optionalTerms: string[] = [];
  for (const term of queryLower.split(/\s+/u).filter(Boolean)) {
    if (term.startsWith('+') && term.length > 1) {
      requiredTerms.push(term.slice(1));
    } else {
      optionalTerms.push(term);
    }
  }
  const scoringTerms = requiredTerms.length > 0 ? [...requiredTerms, ...optionalTerms] : optionalTerms;
  const candidateTools =
    requiredTerms.length > 0
      ? deferredTools.filter((tool) => requiredTerms.every((term) => termMatchesTool(term, tool)))
      : deferredTools;
  const matches = candidateTools
    .map((tool) => ({ tool, score: scoreDeferredTool(scoringTerms, tool) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.tool.name.localeCompare(right.tool.name))
    .slice(0, maxResults)
    .map((item) => item.tool.name);

  return {
    matches,
    deferredTools,
  };
}

function isDeferredSearchIntent(query: string) {
  const queryLower = query.toLowerCase().trim();
  if (queryLower.startsWith('mcp__') || queryLower.startsWith('mcp_')) return true;
  if (/^select:/iu.test(queryLower)) return true;
  return queryLower.split(/\s+/u).some((term) => term.startsWith('+') && term.length > 1);
}

function deferredStrongMatchTerms(query: string) {
  const rawTerms = query.toLowerCase().split(/\s+/u).filter(Boolean);
  const terms: string[] = [];
  let skipNext = false;
  for (const term of rawTerms) {
    const normalized = term.replace(/^[+]+/u, '').replace(/[^a-z0-9_$-]/gu, '');
    if (!normalized || stopWords.has(normalized)) continue;
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (normalized === 'without' || normalized === 'avoid' || normalized === 'no') {
      skipNext = true;
      continue;
    }
    terms.push(normalized);
  }
  return terms;
}

function hasStrongDeferredMatch(registry: ToolRegistry, matches: string[], query: string) {
  const terms = deferredStrongMatchTerms(query);
  return matches.some((name) => {
    const tool = registry.get(name);
    return tool ? scoreDeferredTool(terms, tool) >= 4 : false;
  });
}

function fieldTokens(tool: Tool) {
  return tokenize([tool.name, tool.description, ...(toolHints[tool.name] ?? [])].join(' '));
}

function penalizedByQuery(query: string, toolName: string) {
  const normalized = query.toLowerCase();
  return (
    normalized.includes(`without ${toolName}`) ||
    normalized.includes(`avoid ${toolName}`) ||
    normalized.includes(`no ${toolName}`)
  );
}

function scoreTool(query: string, tool: Tool) {
  const queryTokens = tokenize(query);
  const nameTokens = tokenize(tool.name);
  const description = tool.description.toLowerCase();
  const allTokens = fieldTokens(tool);
  const matched: string[] = [];
  let score = 0;

  for (const token of queryTokens) {
    if (tool.name.toLowerCase() === token || nameTokens.includes(token)) {
      score += 5;
      matched.push(token);
      continue;
    }

    if (allTokens.includes(token)) {
      score += 3;
      matched.push(token);
      continue;
    }

    if (description.includes(token)) {
      score += 1;
      matched.push(token);
    }
  }

  if (penalizedByQuery(query, tool.name)) score -= 8;

  return {
    score,
    matched: Array.from(new Set(matched)),
  };
}

function searchTools(registry: ToolRegistry, query: string, maxResults: number): ToolSearchResult[] {
  return Array.from(registry.values())
    .map((tool) => {
      const scored = scoreTool(query, tool);
      return {
        rank: 0,
        name: tool.name,
        score: scored.score,
        description: tool.description,
        matched: scored.matched,
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, maxResults)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

function formatResult(result: ToolSearchResult) {
  const matched = result.matched.length > 0 ? ` matched=${result.matched.join(',')}` : '';
  return `${result.rank}. ${result.name} score=${result.score}${matched} - ${result.description}`;
}

function maxResultsFromInput(input: z.infer<typeof toolSearchInput>, fallback: number) {
  return input.max_results ?? input.maxResults ?? fallback;
}

function toolParameters(tool: Tool) {
  const schema = zodToJsonSchema(tool.openaiInputSchema ?? tool.inputSchema, {
    $refStrategy: 'none',
    target: 'jsonSchema7',
  }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

function functionsBlock(registry: ToolRegistry, matches: string[]) {
  const lines = matches.flatMap((name) => {
    const tool = registry.get(name);
    if (!tool) return [];
    return [
      `<function>${JSON.stringify({
        description: tool.description,
        name: tool.name,
        parameters: toolParameters(tool),
      })}</function>`,
    ];
  });
  return `<functions>\n${lines.join('\n')}\n</functions>`;
}

function noDeferredMatchContent(pendingServers: string[]) {
  if (pendingServers.length === 0) return 'No matching deferred tools found';
  return `No matching deferred tools found. Some MCP servers are still connecting: ${pendingServers.join(', ')}. Their tools will become available shortly - try searching again.`;
}

export function createToolSearchTool(
  registry: ToolRegistry,
  options: ToolSearchOptions = {},
): Tool<z.infer<typeof toolSearchInput>, ToolSearchData> {
  return {
    name: 'tool_search',
    description: referencePrompt,
    inputSchema: toolSearchInput,
    openaiInputSchema: toolSearchOpenAIInput,
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    async run(input) {
      const deferredTools = Array.from(registry.values()).filter(isDeferredTool);
      if (deferredTools.length > 0) {
        const maxResults = maxResultsFromInput(input, 5);
        const search = searchDeferredTools(registry, input.query, maxResults);
        const explicitDeferredSearch = isDeferredSearchIntent(input.query);
        if (explicitDeferredSearch || hasStrongDeferredMatch(registry, search.matches, input.query)) {
          const pendingServers = search.matches.length === 0 ? (options.pendingMcpServers?.() ?? []) : [];
          const data: DeferredToolSearchData = {
            query: input.query,
            matches: search.matches,
            total_deferred_tools: search.deferredTools.length,
            ...(pendingServers.length > 0 ? { pending_mcp_servers: pendingServers } : {}),
            results: [],
          };
          return {
            ok: true,
            content:
              search.matches.length > 0
                ? functionsBlock(registry, search.matches)
                : noDeferredMatchContent(pendingServers),
            data,
          };
        }
      }

      const maxResults = maxResultsFromInput(input, 8);
      const results = searchTools(registry, input.query, maxResults);
      return {
        ok: true,
        content: results.length > 0 ? results.map(formatResult).join('\n') : `No tools matched: ${input.query}`,
        data: {
          query: input.query,
          results,
        },
      };
    },
  };
}
