import { providerNames } from '../../config/index.js';

export interface TuiSlashCommandSuggestion {
  command: string;
  usage: string;
  description: string;
  completion: string;
  aliases?: string[];
}

export interface TuiSlashCommandSuggestionContext {
  sessionIds?: string[];
}

const NO_MATCH_SUGGESTION: TuiSlashCommandSuggestion = {
  command: '',
  usage: '',
  description: 'No matching commands. Type /help.',
  completion: '',
};

const NO_SESSION_SUGGESTION: TuiSlashCommandSuggestion = {
  command: '',
  usage: '',
  description: 'No recent sessions. Run /sessions list first. 최근 세션 없음',
  completion: '',
};

export const TUI_SLASH_COMMAND_SUGGESTIONS: TuiSlashCommandSuggestion[] = [
  {
    command: '/help',
    usage: '/help',
    description: 'Show TUI commands. 도움말 명령 목록',
    completion: '/help',
    aliases: ['/?', '/commands'],
  },
  {
    command: '/status',
    usage: '/status',
    description: 'Show provider, model, approval mode, and workspace. 상태 확인',
    completion: '/status',
  },
  {
    command: '/clear',
    usage: '/clear',
    description: 'Clear visible transcript and conversation context. 대화 초기화',
    completion: '/clear',
  },
  {
    command: '/model',
    usage: '/model <name>',
    description: 'Change model for subsequent prompts. 모델 변경',
    completion: '/model ',
  },
  {
    command: '/provider',
    usage: '/provider <name>',
    description: 'Show or change provider for subsequent prompts. 프로바이더 변경',
    completion: '/provider ',
  },
  {
    command: '/approval',
    usage: '/approval <safe|auto|readonly>',
    description: 'Change approval mode for tool calls. 승인 모드 변경',
    completion: '/approval ',
  },
  {
    command: '/workspace',
    usage: '/workspace',
    description: 'Show the active workspace. 작업 폴더 확인',
    completion: '/workspace',
  },
  {
    command: '/tools',
    usage: '/tools',
    description: 'List available runtime tools. 도구 목록',
    completion: '/tools',
  },
  {
    command: '/session',
    usage: '/session',
    description: 'Show TUI session id, status, and turns. 세션 상태',
    completion: '/session',
  },
  {
    command: '/memory',
    usage: '/memory <add|list|search>',
    description: 'Save, list, or search workspace memory. 메모리 관리',
    completion: '/memory ',
  },
  {
    command: '/skills',
    usage: '/skills <list|show>',
    description: 'List or show configured skills. 스킬 확인',
    completion: '/skills ',
  },
  {
    command: '/plugins',
    usage: '/plugins list',
    description: 'List configured and installed plugins. 플러그인 확인',
    completion: '/plugins list',
  },
  {
    command: '/sessions',
    usage: '/sessions list',
    description: 'List saved session logs. 세션 목록',
    completion: '/sessions list',
  },
  {
    command: '/compact',
    usage: '/compact [session-id]',
    description: 'Compact the latest or selected session log. 세션 요약',
    completion: '/compact ',
  },
  {
    command: '/output',
    usage: '/output <up|down|top|bottom|expand|compact|clear|save>',
    description: 'Inspect or control the latest command output. 출력 제어',
    completion: '/output ',
  },
  {
    command: '/plan',
    usage: '/plan <prompt>',
    description: 'Run one prompt in plan mode. 계획 모드 실행',
    completion: '/plan ',
  },
  {
    command: '/work',
    usage: '/work <prompt>',
    description: 'Run one prompt in work mode. 작업 모드 실행',
    completion: '/work ',
  },
  {
    command: '/resume',
    usage: '/resume <session-id> <prompt>',
    description: 'Continue from a prior session. 이전 세션 이어가기',
    completion: '/resume ',
  },
  {
    command: '/reset',
    usage: '/reset',
    description: 'Reset visible transcript and conversation context. 대화 초기화',
    completion: '/reset',
  },
  {
    command: '/exit',
    usage: '/exit',
    description: 'Exit the TUI. 종료',
    completion: '/exit',
    aliases: ['/quit'],
  },
];

export function getTuiSlashCommandSuggestions(
  input: string,
  limit = 5,
  context: TuiSlashCommandSuggestionContext = {},
): TuiSlashCommandSuggestion[] {
  const argumentSuggestions = getArgumentSuggestions(input, limit, context);
  if (argumentSuggestions) return argumentSuggestions;

  const query = normalizeSlashQuery(input);
  if (query === undefined) return [];
  if (!query) return TUI_SLASH_COMMAND_SUGGESTIONS.slice(0, limit);

  const scored = TUI_SLASH_COMMAND_SUGGESTIONS.map((suggestion, index) => ({
    suggestion,
    index,
    score: scoreSuggestion(suggestion, query),
  })).filter((entry) => entry.score > 0);
  const exactScore = Math.max(0, ...scored.map((entry) => entry.score).filter((score) => score === 100));
  const bestPrefixScore = Math.max(0, ...scored.map((entry) => entry.score).filter((score) => score >= 80));
  const matches = scored
    .filter((entry) => (exactScore > 0 ? entry.score === 100 : bestPrefixScore > 0 ? entry.score >= 80 : true))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.suggestion);

  return matches.length > 0 ? matches : [NO_MATCH_SUGGESTION];
}

export function completeTuiSlashCommandSuggestion(suggestion: TuiSlashCommandSuggestion | undefined): string {
  return suggestion?.completion ?? '';
}

function normalizeSlashQuery(input: string): string | undefined {
  const trimmedStart = input.trimStart();
  if (!trimmedStart.startsWith('/')) return undefined;
  return trimmedStart.slice(1).trim().toLowerCase();
}

function getArgumentSuggestions(
  input: string,
  limit: number,
  context: TuiSlashCommandSuggestionContext,
): TuiSlashCommandSuggestion[] | undefined {
  const match = /^\s*\/([A-Za-z?_-]+)(\s+)(.*)$/.exec(input);
  if (!match) return undefined;

  const command = match[1]?.toLowerCase() ?? '';
  const argumentPrefix = match[3] ?? '';
  const prefix = argumentPrefix.trimStart().toLowerCase();

  if (command === 'provider') {
    return valueSuggestions('/provider', providerNames, prefix, '/provider', 'Provider. 프로바이더', false, limit);
  }
  if (command === 'approval') {
    return valueSuggestions(
      '/approval',
      ['safe', 'auto', 'readonly'],
      prefix,
      '/approval',
      'Approval mode. 승인 모드',
      false,
      limit,
    );
  }
  if (command === 'memory') {
    return valueSuggestions(
      '/memory',
      ['add', 'list', 'search'],
      prefix,
      '/memory',
      'Memory subcommand. 메모리 하위 명령',
      (value) => value !== 'list',
      limit,
    );
  }
  if (command === 'skills') {
    return valueSuggestions(
      '/skills',
      ['list', 'show'],
      prefix,
      '/skills',
      'Skills subcommand. 스킬 하위 명령',
      (value) => value === 'show',
      limit,
    );
  }
  if (command === 'plugins') {
    return valueSuggestions(
      '/plugins',
      ['list'],
      prefix,
      '/plugins',
      'Plugins subcommand. 플러그인 하위 명령',
      false,
      limit,
    );
  }
  if (command === 'sessions') {
    return valueSuggestions(
      '/sessions',
      ['list'],
      prefix,
      '/sessions',
      'Sessions subcommand. 세션 하위 명령',
      false,
      limit,
    );
  }
  if (command === 'output') {
    return valueSuggestions(
      '/output',
      ['up', 'down', 'top', 'bottom', 'expand', 'compact', 'clear', 'save'],
      prefix,
      '/output',
      'Output control. 출력 제어',
      false,
      limit,
    );
  }
  if (command === 'compact') {
    return sessionSuggestions('/compact', prefix, context.sessionIds, false, limit);
  }
  if (command === 'resume') {
    return sessionSuggestions('/resume', prefix, context.sessionIds, true, limit);
  }
  if (command === 'plan') {
    return [
      {
        command: '/plan',
        usage: '<prompt>',
        description: 'Type the planning prompt after this space. 계획 프롬프트 입력',
        completion: '/plan ',
      },
    ];
  }
  if (command === 'work') {
    return [
      {
        command: '/work',
        usage: '<prompt>',
        description: 'Type the work prompt after this space. 작업 프롬프트 입력',
        completion: '/work ',
      },
    ];
  }

  return undefined;
}

function valueSuggestions(
  command: string,
  values: readonly string[],
  prefix: string,
  completionPrefix: string,
  description: string,
  trailingSpace: boolean | ((value: string) => boolean),
  limit: number,
) {
  const matches = values
    .filter((value) => value.toLowerCase().startsWith(prefix))
    .slice(0, limit)
    .map((value): TuiSlashCommandSuggestion => {
      const shouldTrail = typeof trailingSpace === 'function' ? trailingSpace(value) : trailingSpace;
      return {
        command,
        usage: value,
        description,
        completion: `${completionPrefix} ${value}${shouldTrail ? ' ' : ''}`,
      };
    });
  return matches.length > 0 ? matches : [NO_MATCH_SUGGESTION];
}

function sessionSuggestions(
  command: string,
  prefix: string,
  sessionIds: string[] | undefined,
  trailingSpace: boolean,
  limit: number,
) {
  const matches = (sessionIds ?? [])
    .filter((sessionId) => sessionId.toLowerCase().startsWith(prefix))
    .slice(0, limit)
    .map(
      (sessionId): TuiSlashCommandSuggestion => ({
        command,
        usage: sessionId,
        description: 'Recent session. 최근 세션',
        completion: `${command} ${sessionId}${trailingSpace ? ' ' : ''}`,
      }),
    );
  if (matches.length > 0) return matches;
  return prefix ? [NO_MATCH_SUGGESTION] : [NO_SESSION_SUGGESTION];
}

function scoreSuggestion(suggestion: TuiSlashCommandSuggestion, query: string): number {
  const commandBody = suggestion.command.slice(1).toLowerCase();
  if (commandBody === query) return 100;
  if (commandBody.startsWith(query)) return 90;
  if (suggestion.aliases?.some((alias) => alias.slice(1).toLowerCase() === query)) return 85;
  if (suggestion.aliases?.some((alias) => alias.slice(1).toLowerCase().startsWith(query))) return 80;
  if (query.length >= 2 && suggestion.usage.toLowerCase().includes(query)) return 60;
  if (query.length >= 2 && suggestion.description.toLowerCase().includes(query)) return 40;
  return 0;
}
