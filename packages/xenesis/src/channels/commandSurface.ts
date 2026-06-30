import type { ChannelOutgoingMessage } from './types.js';

export type ChannelCommandSurfaceGroup = 'session' | 'desk' | 'terminal' | 'agent' | 'tools';
export type ChannelCommandSurfaceVisibility = 'always' | 'whenAttached' | 'whenAgentAttached';

export interface ChannelCommandSurfaceItem {
  id: string;
  label: string;
  description: string;
  command: string;
  group: ChannelCommandSurfaceGroup;
  visibility?: ChannelCommandSurfaceVisibility;
}

export interface TelegramBotCommand {
  command: string;
  description: string;
}

export interface ChannelCommandNormalizeOptions {
  telegramBotUsername?: string;
}

export const defaultChannelCommandSurface: ChannelCommandSurfaceItem[] = [
  {
    id: 'help',
    label: 'Help',
    description: 'Show available commands',
    command: '/help',
    group: 'session',
  },
  {
    id: 'status',
    label: 'Status',
    description: 'Show session info',
    command: '/status',
    group: 'session',
  },
  {
    id: 'new',
    label: 'New Session',
    description: 'Start a new session',
    command: '/new',
    group: 'session',
  },
  {
    id: 'stop',
    label: 'Stop',
    description: 'Stop active channel work',
    command: '/stop',
    group: 'session',
  },
  {
    id: 'desk',
    label: 'Desk',
    description: 'Open Desk menu',
    command: '/desk',
    group: 'desk',
  },
  {
    id: 'terminals',
    label: 'Terminals',
    description: 'List Desk terminals',
    command: '/terminals',
    group: 'terminal',
  },
  {
    id: 'agents',
    label: 'Agents',
    description: 'List Xenesis Agents',
    command: '/agents',
    group: 'agent',
  },
  {
    id: 'detach',
    label: 'Detach',
    description: 'Detach current Desk target',
    command: '/detach',
    group: 'desk',
    visibility: 'whenAttached',
  },
];

const commandAliases = new Map<string, string>([
  ['/desk', '/desk menu'],
  ['/terminals', '/desk terminals'],
  ['/agents', '/desk agents'],
  ['/detach', '/desk detach'],
]);

export function normalizeChannelCommandText(text: string, options: ChannelCommandNormalizeOptions = {}): string {
  const trimmed = stripTelegramBotMention(text.trim(), options.telegramBotUsername);
  if (!trimmed.startsWith('/')) return text;
  return commandAliases.get(trimmed) ?? trimmed;
}

function stripTelegramBotMention(text: string, telegramBotUsername?: string): string {
  const [commandToken, ...rest] = text.split(/\s+/);
  const mentionIndex = commandToken.indexOf('@');
  if (!commandToken.startsWith('/') || mentionIndex < 0) return text;
  if (!telegramBotUsername) return text;
  const mentionedUsername = commandToken.slice(mentionIndex + 1);
  if (mentionedUsername.toLowerCase() !== telegramBotUsername.toLowerCase()) return text;
  return [commandToken.slice(0, mentionIndex), ...rest].filter(Boolean).join(' ');
}

export function buildDeskMenuMessage(): ChannelOutgoingMessage {
  return {
    text: `Xenesis Desk Menu

1. Terminals
   /desk terminals
2. Agents
   /desk agents
3. Desk status
   /desk status
4. Detach
   /desk detach`,
    actions: [
      { label: 'Terminals', value: '/desk terminals' },
      { label: 'Agents', value: '/desk agents' },
      { label: 'Desk Status', value: '/desk status' },
      { label: 'Detach', value: '/desk detach' },
    ],
  };
}

export function buildChannelHelpMessage(surface = defaultChannelCommandSurface): ChannelOutgoingMessage {
  return {
    text: ['Xenesis channel commands', '', ...surface.map((item) => `${item.command} - ${item.description}`)].join(
      '\n',
    ),
  };
}

export function telegramBotCommandsFromSurface(surface = defaultChannelCommandSurface): TelegramBotCommand[] {
  return surface.map((item) => ({
    command: item.command.replace(/^\//, ''),
    description: item.description,
  }));
}
