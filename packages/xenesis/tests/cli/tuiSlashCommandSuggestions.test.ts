import { describe, expect, test } from 'vitest';
import {
  completeTuiSlashCommandSuggestion,
  getTuiSlashCommandSuggestions,
} from '../../src/cli/tui/slashCommandSuggestions.js';

describe('TUI slash command suggestions', () => {
  test('shows common commands when input starts with slash', () => {
    const suggestions = getTuiSlashCommandSuggestions('/');

    expect(suggestions.slice(0, 4).map((item) => item.command)).toEqual(['/help', '/status', '/clear', '/model']);
  });

  test('filters by command prefix and aliases', () => {
    expect(getTuiSlashCommandSuggestions('/a').map((item) => item.command)).toEqual(['/approval']);
    expect(getTuiSlashCommandSuggestions('/mo').map((item) => item.command)).toEqual(['/model']);
    expect(getTuiSlashCommandSuggestions('/quit').map((item) => item.command)).toEqual(['/exit']);
  });

  test('filters additional TUI operator commands', () => {
    expect(getTuiSlashCommandSuggestions('/pro').map((item) => item.command)).toEqual(['/provider']);
    expect(getTuiSlashCommandSuggestions('/works').map((item) => item.command)).toEqual(['/workspace']);
    expect(getTuiSlashCommandSuggestions('/too').map((item) => item.command)).toEqual(['/tools']);
    expect(getTuiSlashCommandSuggestions('/sess').map((item) => item.command)).toEqual(['/session', '/sessions']);
    expect(getTuiSlashCommandSuggestions('/reset').map((item) => item.command)).toEqual(['/reset']);
    expect(getTuiSlashCommandSuggestions('/commands').map((item) => item.command)).toEqual(['/help']);
  });

  test('filters broad TUI slash commands', () => {
    expect(getTuiSlashCommandSuggestions('/mem').map((item) => item.command)).toEqual(['/memory']);
    expect(getTuiSlashCommandSuggestions('/ski').map((item) => item.command)).toEqual(['/skills']);
    expect(getTuiSlashCommandSuggestions('/plug').map((item) => item.command)).toEqual(['/plugins']);
    expect(getTuiSlashCommandSuggestions('/sessions').map((item) => item.command)).toEqual(['/sessions']);
    expect(getTuiSlashCommandSuggestions('/compact').map((item) => item.command)).toEqual(['/compact']);
    expect(getTuiSlashCommandSuggestions('/out').map((item) => item.command)).toEqual(['/output']);
    expect(getTuiSlashCommandSuggestions('/plan').map((item) => item.command)).toEqual(['/plan']);
    expect(getTuiSlashCommandSuggestions('/resume').map((item) => item.command)).toEqual(['/resume']);
    expect(getTuiSlashCommandSuggestions('/work').map((item) => item.command)).toEqual(['/work']);
  });

  test('filters terminal image commands and Korean image descriptions', () => {
    expect(getTuiSlashCommandSuggestions('/im').map((item) => item.command)).toEqual(['/image']);
    expect(getTuiSlashCommandSuggestions('/xcon-i').map((item) => item.command)).toEqual(['/xcon-image']);
    expect(getTuiSlashCommandSuggestions('/이미지').map((item) => item.command)).toEqual(['/image', '/xcon-image']);
  });

  test('filters by description terms including Korean operator words', () => {
    const suggestions = getTuiSlashCommandSuggestions('/승인');

    expect(suggestions.map((item) => item.command)).toContain('/approval');
  });

  test('returns a no-match hint for unknown slash input', () => {
    const suggestions = getTuiSlashCommandSuggestions('/zzzz');

    expect(suggestions).toEqual([
      {
        command: '',
        usage: '',
        description: 'No matching commands. Type /help.',
        completion: '',
      },
    ]);
  });

  test('completion fills argument commands with a trailing space', () => {
    const [approval] = getTuiSlashCommandSuggestions('/a');
    const [status] = getTuiSlashCommandSuggestions('/sta');

    expect(completeTuiSlashCommandSuggestion(approval)).toBe('/approval ');
    expect(completeTuiSlashCommandSuggestion(status)).toBe('/status');
  });

  test('completion fills provider commands with a trailing space', () => {
    const [provider] = getTuiSlashCommandSuggestions('/pro');
    const [workspace] = getTuiSlashCommandSuggestions('/works');

    expect(completeTuiSlashCommandSuggestion(provider)).toBe('/provider ');
    expect(completeTuiSlashCommandSuggestion(workspace)).toBe('/workspace');
  });

  test('completion fills broad commands with expected arguments', () => {
    const [memory] = getTuiSlashCommandSuggestions('/mem');
    const [sessions] = getTuiSlashCommandSuggestions('/sessions');
    const [output] = getTuiSlashCommandSuggestions('/out');
    const [work] = getTuiSlashCommandSuggestions('/work');

    expect(completeTuiSlashCommandSuggestion(memory)).toBe('/memory ');
    expect(completeTuiSlashCommandSuggestion(sessions)).toBe('/sessions list');
    expect(completeTuiSlashCommandSuggestion(output)).toBe('/output ');
    expect(completeTuiSlashCommandSuggestion(work)).toBe('/work ');
  });

  test('suggests provider and approval argument values', () => {
    expect(
      getTuiSlashCommandSuggestions('/provider ')
        .slice(0, 4)
        .map((item) => item.usage),
    ).toEqual(['auto', 'openai', 'mock', 'anthropic']);
    expect(getTuiSlashCommandSuggestions('/provider q').map((item) => item.usage)).toEqual(['qwen']);
    expect(getTuiSlashCommandSuggestions('/approval ').map((item) => item.usage)).toEqual(['safe', 'auto', 'readonly']);

    const [qwen] = getTuiSlashCommandSuggestions('/provider q');
    const [safe] = getTuiSlashCommandSuggestions('/approval ');
    expect(completeTuiSlashCommandSuggestion(qwen)).toBe('/provider qwen');
    expect(completeTuiSlashCommandSuggestion(safe)).toBe('/approval safe');
  });

  test('suggests fixed subcommands and prompt hints', () => {
    expect(getTuiSlashCommandSuggestions('/memory ').map((item) => item.usage)).toEqual(['add', 'list', 'search']);
    expect(getTuiSlashCommandSuggestions('/memory s').map((item) => item.usage)).toEqual(['search']);
    expect(getTuiSlashCommandSuggestions('/skills ').map((item) => item.usage)).toEqual(['list', 'show']);
    expect(getTuiSlashCommandSuggestions('/plugins ').map((item) => item.usage)).toEqual(['list']);
    expect(getTuiSlashCommandSuggestions('/sessions ').map((item) => item.usage)).toEqual(['list']);
    expect(getTuiSlashCommandSuggestions('/output ', 10).map((item) => item.usage)).toEqual([
      'up',
      'down',
      'top',
      'bottom',
      'expand',
      'compact',
      'clear',
      'save',
    ]);
    expect(getTuiSlashCommandSuggestions('/output e').map((item) => item.usage)).toEqual(['expand']);
    expect(getTuiSlashCommandSuggestions('/plan ').map((item) => item.description)).toEqual([
      'Type the planning prompt after this space. 계획 프롬프트 입력',
    ]);
    expect(getTuiSlashCommandSuggestions('/work ').map((item) => item.description)).toEqual([
      'Type the work prompt after this space. 작업 프롬프트 입력',
    ]);
    expect(getTuiSlashCommandSuggestions('/image ').map((item) => item.usage)).toEqual(['recent', 'info', 'clear']);
    expect(getTuiSlashCommandSuggestions('/xcon-image ').map((item) => item.description)).toEqual([
      'Type an XCON file path or inline snippet after this space. XCON 이미지 입력',
    ]);
    expect(getTuiSlashCommandSuggestions('/image --').map((item) => item.usage)).toEqual([
      '--width=80%',
      '--height=auto',
      '--term-id=',
    ]);

    const [memoryAdd] = getTuiSlashCommandSuggestions('/memory ');
    const [memorySearch] = getTuiSlashCommandSuggestions('/memory s');
    const [outputExpand] = getTuiSlashCommandSuggestions('/output e');
    const [sessionsList] = getTuiSlashCommandSuggestions('/sessions ');
    const [imageWidth] = getTuiSlashCommandSuggestions('/image --w');
    expect(completeTuiSlashCommandSuggestion(memoryAdd)).toBe('/memory add ');
    expect(completeTuiSlashCommandSuggestion(memorySearch)).toBe('/memory search ');
    expect(completeTuiSlashCommandSuggestion(outputExpand)).toBe('/output expand');
    expect(completeTuiSlashCommandSuggestion(sessionsList)).toBe('/sessions list');
    expect(completeTuiSlashCommandSuggestion(imageWidth)).toBe('/image --width=80%');
  });

  test('suggests image subcommands and recent or capture image paths', () => {
    const context = {
      imageSources: ['D:\\Workspace\\sample-image.png', 'C:\\Users\\devuser\\.xenis-dev\\captures\\pane_capture_1.png'],
    };

    expect(getTuiSlashCommandSuggestions('/image ', 6, context).map((item) => item.usage)).toEqual([
      'recent',
      'info',
      'clear',
      'D:\\Workspace\\sample-image.png',
      'C:\\Users\\devuser\\.xenis-dev\\captures\\pane_capture_1.png',
    ]);
    expect(getTuiSlashCommandSuggestions('/image r', 5, context).map((item) => item.usage)).toEqual(['recent']);
    expect(getTuiSlashCommandSuggestions('/image cap', 5, context).map((item) => item.usage)).toEqual([
      'C:\\Users\\devuser\\.xenis-dev\\captures\\pane_capture_1.png',
    ]);

    const [recentImage] = getTuiSlashCommandSuggestions('/image sample', 5, context);
    expect(completeTuiSlashCommandSuggestion(recentImage)).toBe('/image D:\\Workspace\\sample-image.png ');
  });

  test('suggests recent sessions for compact and resume arguments', () => {
    const context = { sessionIds: ['session-20260622', 'session-20260621'] };

    expect(getTuiSlashCommandSuggestions('/compact ', 5, context).map((item) => item.usage)).toEqual([
      'session-20260622',
      'session-20260621',
    ]);
    expect(getTuiSlashCommandSuggestions('/resume session-2026062', 5, context).map((item) => item.usage)).toEqual([
      'session-20260622',
      'session-20260621',
    ]);

    const [compact] = getTuiSlashCommandSuggestions('/compact ', 5, context);
    const [resume] = getTuiSlashCommandSuggestions('/resume session-2026062', 5, context);
    expect(completeTuiSlashCommandSuggestion(compact)).toBe('/compact session-20260622');
    expect(completeTuiSlashCommandSuggestion(resume)).toBe('/resume session-20260622 ');
  });

  test('shows a session hint when dynamic session ids are unavailable', () => {
    expect(getTuiSlashCommandSuggestions('/resume ').map((item) => item.description)).toEqual([
      'No recent sessions. Run /sessions list first. 최근 세션 없음',
    ]);
  });
});
