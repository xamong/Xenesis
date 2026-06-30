import { providerNames } from '../../config/index.js';
import { TUI_COMMAND_CATALOG, type TuiSlashCommandSuggestion } from './commandCatalog.js';

export type { TuiSlashCommandSuggestion };

export interface TuiSlashCommandSuggestionContext {
  sessionIds?: string[];
  imageSources?: string[];
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

export const TUI_SLASH_COMMAND_SUGGESTIONS: TuiSlashCommandSuggestion[] = TUI_COMMAND_CATALOG;

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
  if (command === 'image') {
    if (prefix.startsWith('--')) {
      return valueSuggestions(
        '/image',
        ['--width=80%', '--height=auto', '--term-id='],
        prefix,
        '/image',
        'Image option. 이미지 옵션',
        false,
        limit,
      );
    }
    return imageSuggestions(prefix, context.imageSources, limit);
  }
  if (command === 'xcon-image') {
    if (prefix.startsWith('--')) {
      return valueSuggestions(
        '/xcon-image',
        ['--width=80%', '--height=auto', '--term-id=', '--theme=dark', '--title='],
        prefix,
        '/xcon-image',
        'XCON image option. XCON 이미지 옵션',
        false,
        limit,
      );
    }
    return [
      {
        command: '/xcon-image',
        usage: '<file-or-inline>',
        description: 'Type an XCON file path or inline snippet after this space. XCON 이미지 입력',
        completion: '/xcon-image ',
      },
    ];
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

function imageSuggestions(prefix: string, imageSources: string[] | undefined, limit: number) {
  const subcommands = ['recent', 'info', 'clear'];
  const query = stripWrappingQuote(prefix);
  const subcommandSuggestions = subcommands
    .filter((value) => value.startsWith(query))
    .map(
      (value): TuiSlashCommandSuggestion => ({
        command: '/image',
        usage: value,
        description: 'Image command. 이미지 명령',
        completion: `/image ${value}${value === 'clear' ? ' ' : ''}`,
      }),
    );
  const sourceSuggestions = (imageSources ?? [])
    .filter((source) => !query || (query.length >= 2 && source.toLowerCase().includes(query)))
    .map(
      (source): TuiSlashCommandSuggestion => ({
        command: '/image',
        usage: source,
        description: 'Recent or captured image. 최근/캡처 이미지',
        completion: `/image ${quoteTuiSuggestionValue(source)} `,
      }),
    );
  const matches = [...subcommandSuggestions, ...sourceSuggestions].slice(0, limit);
  return matches.length > 0 ? matches : [NO_MATCH_SUGGESTION];
}

function stripWrappingQuote(value: string) {
  const trimmed = value.toLowerCase().trim();
  if ((trimmed.startsWith('"') && !trimmed.endsWith('"')) || (trimmed.startsWith("'") && !trimmed.endsWith("'"))) {
    return trimmed.slice(1);
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function quoteTuiSuggestionValue(value: string) {
  if (!/\s/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
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
