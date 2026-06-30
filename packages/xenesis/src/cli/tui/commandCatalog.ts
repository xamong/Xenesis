export interface TuiSlashCommandSuggestion {
  command: string;
  usage: string;
  description: string;
  completion: string;
  aliases?: string[];
  examples?: string[];
}

interface TuiCommandHelpSection {
  title: string;
  commands: string[];
}

export const TUI_COMMAND_CATALOG: TuiSlashCommandSuggestion[] = [
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
    description: 'Show provider, model, approval mode, bridge status, and workspace. 상태 확인',
    completion: '/status',
    examples: ['/status'],
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
    examples: ['/model gpt-4o', '/model deepseek-chat', '/model qwen-plus'],
  },
  {
    command: '/provider',
    usage: '/provider <name>',
    description: 'Show or change provider for subsequent prompts. 프로바이더 변경',
    completion: '/provider ',
    examples: ['/provider openai', '/provider qwen', '/provider deepseek'],
  },
  {
    command: '/approval',
    usage: '/approval <safe|auto|readonly>',
    description: 'Change approval mode for tool calls. 승인 모드 변경',
    completion: '/approval ',
    examples: ['/approval safe', '/approval auto', '/approval readonly'],
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
    examples: ['/sessions list'],
  },
  {
    command: '/parity',
    usage: '/parity',
    description: 'Show the latest Xenesis agent parity report summary. 에이전트 정합성 보고서',
    completion: '/parity',
  },
  {
    command: '/commitments',
    usage: '/commitments',
    description: 'Show commitment reminder state and available actions. 약속/리마인더 상태',
    completion: '/commitments',
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
    examples: ['/output expand', '/output down', '/output save'],
  },
  {
    command: '/image',
    usage: '/image <path-or-url>',
    description: 'Show, repeat, inspect, or clear terminal images. 터미널 이미지 표시',
    completion: '/image ',
    examples: ['/image recent', '/image info', '/image clear'],
  },
  {
    command: '/xcon-image',
    usage: '/xcon-image <file-or-inline>',
    description: 'Render an XCON/SKETCH file or snippet as an inline terminal image. XCON 이미지 표시',
    completion: '/xcon-image ',
  },
  {
    command: '/plan',
    usage: '/plan <prompt>',
    description: 'Run one prompt in plan mode. 계획 모드 실행',
    completion: '/plan ',
    examples: ['/plan inspect this change before editing'],
  },
  {
    command: '/work',
    usage: '/work <prompt>',
    description: 'Run one prompt in work mode. 작업 모드 실행',
    completion: '/work ',
    examples: ['/work implement the approved fix'],
  },
  {
    command: '/resume',
    usage: '/resume <session-id> [prompt]',
    description: 'Continue from a prior session, or restore pending approval context. 이전 세션 이어가기',
    completion: '/resume ',
    examples: ['/resume session-20260622 continue from here', '/resume session-20260622'],
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

export function getTuiCommandFooter() {
  return '/help /status /provider /model /approval /tools /sessions /parity /commitments /output /image /xcon-image /plan /work /resume /exit';
}

export function getTuiInteractiveCommandSummary() {
  return TUI_COMMAND_CATALOG.map((command) => command.usage).join(', ');
}

export function getTuiCommandHelpSummary() {
  return TUI_COMMAND_CATALOG.map((command) => command.usage).join(' ');
}

export function getTuiCommandPaletteHelp() {
  return [
    'Xenesis TUI command palette',
    '',
    'Recommended now',
    `  ${describeCommand('/status')}  Check provider, model, approval, session, and context.`,
    `  ${describeCommand('/provider')}  Change or inspect the active provider.`,
    `  ${describeCommand('/model')}  Change the active model.`,
    `  ${describeCommand('/approval')}  Switch tool approval mode.`,
    `  ${describeCommand('/sessions')}  Find saved sessions before resume or compact.`,
    '',
    ...HELP_SECTIONS.flatMap((section) => [
      section.title,
      ...section.commands.map((command) => `  ${describeCommand(command)}`),
    ]),
    '',
    'Keyboard',
    '  / filters commands by name, usage, alias, English, or Korean text.',
    '  Tab/Shift+Tab moves through suggestions; Enter accepts the selected suggestion.',
    '  PageUp/PageDown scrolls command output; Home/End jumps to top or bottom when input is empty.',
    '  Esc hides suggestions first, then clears the input.',
  ].join('\n');
}

export function renderTuiSuggestionDetailLines(suggestion: TuiSlashCommandSuggestion | undefined) {
  if (!suggestion) return [];
  if (!suggestion.command) return suggestion.description ? [`Detail: ${suggestion.description}`] : [];
  const catalogItem = TUI_COMMAND_CATALOG.find((item) => item.command === suggestion.command);
  const description = stripKoreanDescription(suggestion.description || catalogItem?.description || '');
  const examples = suggestion.examples ?? catalogItem?.examples ?? [];
  const aliases = catalogItem?.aliases ?? suggestion.aliases ?? [];
  const lines = [
    ...(description ? [`Detail: ${description}`] : []),
    ...(examples.length > 0 ? [`Examples: ${examples.join(' | ')}`] : []),
    ...(aliases.length > 0 ? [`Aliases: ${aliases.join(', ')}`] : []),
    ...(suggestion.completion ? [`Enter accepts: ${suggestion.completion.trim()}`] : []),
  ];
  return lines;
}

export function renderTuiCommandHelpLines() {
  return [
    'TUI commands:',
    ...TUI_COMMAND_CATALOG.map((command) => `  ${padUsage(command.usage)} ${command.description.split('. ')[0]}.`),
    '  /image recent                 Show the most recently sent image again.',
    '  /image info                   Show recent and captured image candidates.',
    '  /image clear [--term-id id]   Clear the active or selected Desk terminal image/output area.',
  ];
}

function padUsage(value: string) {
  return value.padEnd(30, ' ');
}

const HELP_SECTIONS: TuiCommandHelpSection[] = [
  {
    title: 'Chat & runtime',
    commands: ['/status', '/provider', '/model', '/approval', '/workspace', '/tools', '/clear', '/reset'],
  },
  {
    title: 'Context & sessions',
    commands: ['/session', '/sessions', '/resume', '/compact', '/memory', '/parity', '/commitments'],
  },
  {
    title: 'Tools & artifacts',
    commands: ['/skills', '/plugins', '/plan', '/work'],
  },
  {
    title: 'Output & images',
    commands: ['/output', '/image', '/xcon-image'],
  },
  {
    title: 'TUI',
    commands: ['/help', '/exit'],
  },
];

function describeCommand(command: string) {
  const catalogItem = TUI_COMMAND_CATALOG.find((item) => item.command === command);
  if (!catalogItem) return command;
  return `${padUsage(catalogItem.usage)} ${catalogItem.description}`;
}

function stripKoreanDescription(description: string) {
  const englishDescription = description.split('. ')[0].trim();
  if (!englishDescription) return '';
  return englishDescription.endsWith('.') ? englishDescription : `${englishDescription}.`;
}
