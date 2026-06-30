import { describe, expect, test } from 'vitest';
import {
  buildChannelHelpMessage,
  buildDeskMenuMessage,
  defaultChannelCommandSurface,
  normalizeChannelCommandText,
  telegramBotCommandsFromSurface,
} from '../../src/channels/index.js';

describe('channel command surface', () => {
  test('defines the default channel commands in canonical order', () => {
    expect(defaultChannelCommandSurface.map((item) => item.command)).toEqual([
      '/help',
      '/status',
      '/new',
      '/stop',
      '/desk',
      '/terminals',
      '/agents',
      '/detach',
    ]);
  });

  test('normalizes short Desk aliases and addressed Telegram commands', () => {
    expect(normalizeChannelCommandText('/desk')).toBe('/desk menu');
    expect(normalizeChannelCommandText('/desk menu')).toBe('/desk menu');
    expect(normalizeChannelCommandText('/terminals')).toBe('/desk terminals');
    expect(normalizeChannelCommandText('/agents')).toBe('/desk agents');
    expect(normalizeChannelCommandText('/detach')).toBe('/desk detach');
    expect(normalizeChannelCommandText('/desk terminals')).toBe('/desk terminals');
    expect(normalizeChannelCommandText('/desk@XenesisBot')).toBe('/desk@XenesisBot');
    expect(normalizeChannelCommandText('/desk@XenesisBot terminals')).toBe('/desk@XenesisBot terminals');
    expect(normalizeChannelCommandText('/desk@XenesisBot', { telegramBotUsername: 'XenesisBot' })).toBe('/desk menu');
    expect(normalizeChannelCommandText('/desk@XenesisBot terminals', { telegramBotUsername: 'XenesisBot' })).toBe(
      '/desk terminals',
    );
    expect(normalizeChannelCommandText('/terminals@XenesisBot', { telegramBotUsername: 'XenesisBot' })).toBe(
      '/desk terminals',
    );
    expect(normalizeChannelCommandText('/agents@XenesisBot', { telegramBotUsername: 'XenesisBot' })).toBe(
      '/desk agents',
    );
    expect(normalizeChannelCommandText('/detach@XenesisBot', { telegramBotUsername: 'XenesisBot' })).toBe(
      '/desk detach',
    );
    expect(normalizeChannelCommandText('/stop@OtherBot', { telegramBotUsername: 'XenesisBot' })).toBe('/stop@OtherBot');
    expect(normalizeChannelCommandText('/stop@XenesisBot', { telegramBotUsername: 'XenesisBot' })).toBe('/stop');
    expect(normalizeChannelCommandText('hello world')).toBe('hello world');
  });

  test('builds the Desk menu message with button actions', () => {
    const message = buildDeskMenuMessage();

    expect(message).toEqual({
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
    });
  });

  test('builds channel help text with mobile Desk shortcuts', () => {
    const message = buildChannelHelpMessage();

    expect(message.text).toContain('/terminals - List Desk terminals');
    expect(message.text).toContain('/agents - List Xenesis Agents');
  });

  test('converts the shared surface to Telegram BotCommand payloads', () => {
    expect(telegramBotCommandsFromSurface()).toEqual([
      { command: 'help', description: 'Show available commands' },
      { command: 'status', description: 'Show session info' },
      { command: 'new', description: 'Start a new session' },
      { command: 'stop', description: 'Stop active channel work' },
      { command: 'desk', description: 'Open Desk menu' },
      { command: 'terminals', description: 'List Desk terminals' },
      { command: 'agents', description: 'List Xenesis Agents' },
      { command: 'detach', description: 'Detach current Desk target' },
    ]);
  });
});
