import { describe, expect, test } from 'vitest';
import {
  getTuiCommandFooter,
  getTuiCommandHelpSummary,
  getTuiCommandPaletteHelp,
  getTuiInteractiveCommandSummary,
  renderTuiCommandHelpLines,
  renderTuiSuggestionDetailLines,
  TUI_COMMAND_CATALOG,
} from '../../src/cli/tui/commandCatalog.js';

describe('TUI command catalog', () => {
  test('provides one shared command list for footer, help, and interactive summaries', () => {
    const commands = TUI_COMMAND_CATALOG.map((command) => command.command);

    expect(commands).toContain('/image');
    expect(commands).toContain('/xcon-image');
    expect(new Set(commands).size).toBe(commands.length);
    expect(getTuiCommandFooter()).toContain('/image');
    expect(getTuiCommandFooter()).toContain('/xcon-image');
    expect(getTuiInteractiveCommandSummary()).toContain('/image');
    expect(getTuiCommandHelpSummary()).toContain('/image <path-or-url>');
  });

  test('documents image subcommands in full TUI help', () => {
    const help = renderTuiCommandHelpLines().join('\n');

    expect(help).toContain('/image <path-or-url>');
    expect(help).toContain('/image recent');
    expect(help).toContain('/image info');
    expect(help).toContain('/image clear');
  });

  test('renders a categorized command palette help for general users', () => {
    const help = getTuiCommandPaletteHelp();

    expect(help).toContain('Xenesis TUI command palette');
    expect(help).toContain('Recommended now');
    expect(help).toContain('Chat & runtime');
    expect(help).toContain('Context & sessions');
    expect(help).toContain('Tools & artifacts');
    expect(help).toContain('Output & images');
    expect(help).toContain('Keyboard');
    expect(help).toContain('/status');
    expect(help).toContain('/provider <name>');
    expect(help).toContain('/resume <session-id> [prompt]');
    expect(help).toContain('/output <up|down|top|bottom|expand|compact|clear|save>');
    expect(help).toContain('Tab/Shift+Tab');
    expect(help).toContain('PageUp/PageDown');
  });

  test('renders contextual detail lines for the selected slash suggestion', () => {
    const provider = TUI_COMMAND_CATALOG.find((command) => command.command === '/provider');
    const detail = renderTuiSuggestionDetailLines(provider).join('\n');

    expect(detail).toContain('Detail: Show or change provider for subsequent prompts.');
    expect(detail).toContain('Examples: /provider openai | /provider qwen | /provider deepseek');
    expect(detail).toContain('Enter accepts: /provider');

    const dynamic = renderTuiSuggestionDetailLines({
      command: '/approval',
      usage: 'auto',
      description: 'Approval mode. 승인 모드',
      completion: '/approval auto',
    }).join('\n');

    expect(dynamic).toContain('Detail: Approval mode.');
    expect(dynamic).toContain('Enter accepts: /approval auto');
  });
});
