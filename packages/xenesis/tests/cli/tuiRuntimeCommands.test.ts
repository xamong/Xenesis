import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = existsSync(resolve(process.cwd(), 'src/cli/main.ts'))
  ? process.cwd()
  : resolve(process.cwd(), 'packages/xenesis');
const mainSource = readFileSync(resolve(root, 'src/cli/main.ts'), 'utf8');
const commandCatalogSource = readFileSync(resolve(root, 'src/cli/tui/commandCatalog.ts'), 'utf8');
const runtimeControllerSource = readFileSync(resolve(root, 'src/cli/tui/runtimeController.ts'), 'utf8');
const agentCommandRouterSource = readFileSync(resolve(root, 'src/cli/tui/agentCommandRouter.ts'), 'utf8');
const imageCommandsSource = readFileSync(resolve(root, 'src/cli/tui/imageCommands.ts'), 'utf8');
const outputCommandsSource = readFileSync(resolve(root, 'src/cli/tui/outputCommands.ts'), 'utf8');
const runtimeCommandRouterSource = readFileSync(resolve(root, 'src/cli/tui/runtimeCommandRouter.ts'), 'utf8');
const slashCommandDispatcherSource = readFileSync(resolve(root, 'src/cli/tui/slashCommandDispatcher.ts'), 'utf8');

describe('TUI runtime slash commands', () => {
  test('TUI controller handles expanded operator commands', () => {
    expect(runtimeControllerSource).toMatch(/createTuiSlashCommandDispatcher/);
    expect(slashCommandDispatcherSource).toMatch(/runtimeCommandRouter\.handle\(input\)/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/commands['"]/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/quit['"]/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/reset['"]/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/workspace['"]/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/tools['"]/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/session['"]/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/provider['"]/);
    expect(runtimeCommandRouterSource).toMatch(/input\.startsWith\(['"]\/provider ['"]\)/);
    expect(runtimeCommandRouterSource).toMatch(/isProviderName\(provider\)/);
    expect(runtimeCommandRouterSource).toMatch(/parsed\.provider = provider/);
  });

  test('TUI controller routes broad slash commands', () => {
    expect(slashCommandDispatcherSource).toMatch(/parseSlashCommandLine\(input\)/);
    expect(slashCommandDispatcherSource).toMatch(/agentCommandRouter\.handle\(input, command\)/);
    expect(agentCommandRouterSource).toMatch(/capturedTuiSlashCommandNames/);
    expect(agentCommandRouterSource).toMatch(/['"]memory['"]/);
    expect(agentCommandRouterSource).toMatch(/['"]skills['"]/);
    expect(agentCommandRouterSource).toMatch(/['"]plugins['"]/);
    expect(agentCommandRouterSource).toMatch(/['"]sessions['"]/);
    expect(agentCommandRouterSource).toMatch(/['"]compact['"]/);
    expect(runtimeControllerSource).toMatch(/setCapturedCommandOutput/);
    expect(agentCommandRouterSource).toMatch(/command\?\.name === ['"]plan['"] \|\| command\?\.name === ['"]work['"]/);
    expect(agentCommandRouterSource).toMatch(/command\?\.name === ['"]resume['"]/);
    expect(agentCommandRouterSource).toMatch(/eventsToMessages\(/);
    expect(agentCommandRouterSource).toMatch(/readSessionLog\(/);
    expect(agentCommandRouterSource).toMatch(/command:\s*['"]sessions['"]/);
  });

  test('TUI controller routes terminal image slash commands through the Desk bridge', () => {
    expect(slashCommandDispatcherSource).toMatch(
      /command\.name === ['"]image['"] \|\| command\.name === ['"]xcon-image['"]/,
    );
    expect(slashCommandDispatcherSource).toMatch(/imageCommandRunner\.run/);
    expect(imageCommandsSource).toMatch(/createRemoteDeskBridgeFromEnv/);
    expect(imageCommandsSource).toMatch(/createTerminalImageRequest/);
    expect(imageCommandsSource).toMatch(/xd\.terminals\.ui\.clearScreen/);
    expect(imageCommandsSource).toMatch(/recentImageSources/);
    expect(imageCommandsSource).toMatch(/refreshTuiImageSuggestions/);
    expect(mainSource).toMatch(/xd\.terminals\.image\.show/);
    expect(mainSource).toMatch(/xd\.terminals\.image\.showXcon/);
  });

  test('TUI controller handles command output controls', () => {
    expect(slashCommandDispatcherSource).toMatch(/command\.name === ['"]output['"]/);
    expect(slashCommandDispatcherSource).toMatch(/outputCommandHandler\(input\)/);
    expect(outputCommandsSource).toMatch(/scrollTuiCommandOutput/);
    expect(outputCommandsSource).toMatch(/setTuiCommandOutputOffset/);
    expect(outputCommandsSource).toMatch(/setTuiCommandOutputExpanded/);
    expect(outputCommandsSource).toMatch(/clearTuiCommandOutput/);
    expect(outputCommandsSource).toMatch(/setTuiCommandOutputSavedPath/);
    expect(outputCommandsSource).toMatch(/writeFile\(\s*outputPath/);
    expect(outputCommandsSource).toMatch(/xenesis-output-/);
  });

  test('TUI controller refreshes dynamic slash suggestion context', () => {
    expect(runtimeControllerSource).toMatch(/refreshTuiSuggestionContext/);
    expect(runtimeControllerSource).toMatch(/setTuiSuggestionContext/);
    expect(runtimeControllerSource).toMatch(/sessionDir\(\)/);
    expect(runtimeControllerSource).toMatch(/lastSessionId/);
    expect(runtimeControllerSource).toMatch(/sessionIds: \[sessionId/);
  });

  test('TUI controller tracks session and context metadata', () => {
    expect(runtimeControllerSource).toMatch(/setTuiSessionContext/);
    expect(runtimeControllerSource).toMatch(/activeSessionId: chatSessionId/);
    expect(runtimeControllerSource).toMatch(/lastSessionId: sessionId/);
    expect(runtimeControllerSource).toMatch(/historyMessageCount: chatHistoryMessages\.length/);
    expect(agentCommandRouterSource).toMatch(/resumedFromSessionId: sessionId/);
    expect(runtimeCommandRouterSource).toMatch(/context=\$\{state\.sessionContext\.historyMessageCount\}/);
    expect(runtimeCommandRouterSource).toMatch(
      /resumedFrom=\$\{state\.sessionContext\.resumedFromSessionId \?\? ['"]none['"]\}/,
    );
  });

  test('TUI help text includes expanded commands', () => {
    expect(mainSource).toMatch(/createTuiRuntimeController/);
    expect(runtimeCommandRouterSource).toMatch(/getTuiCommandPaletteHelp/);
    expect(commandCatalogSource).toMatch(/\/provider <name>/);
    expect(commandCatalogSource).toMatch(/\/workspace/);
    expect(commandCatalogSource).toMatch(/\/tools/);
    expect(commandCatalogSource).toMatch(/\/session/);
    expect(commandCatalogSource).toMatch(/\/reset/);
    expect(commandCatalogSource).toMatch(/\/memory <add\|list\|search>/);
    expect(commandCatalogSource).toMatch(/\/skills <list\|show>/);
    expect(commandCatalogSource).toMatch(/\/sessions list/);
    expect(commandCatalogSource).toMatch(/\/compact \[session-id\]/);
    expect(commandCatalogSource).toMatch(/\/output <up\|down\|top\|bottom\|expand\|compact\|clear\|save>/);
    expect(commandCatalogSource).toMatch(/\/image <path-or-url>/);
    expect(commandCatalogSource).toMatch(/\/image recent/);
    expect(commandCatalogSource).toMatch(/\/image info/);
    expect(commandCatalogSource).toMatch(/\/image clear/);
    expect(commandCatalogSource).toMatch(/\/xcon-image <file-or-inline>/);
    expect(commandCatalogSource).toMatch(/\/plan <prompt>/);
    expect(commandCatalogSource).toMatch(/\/work <prompt>/);
    expect(commandCatalogSource).toMatch(/\/resume <session-id> \[prompt\]/);
  });
});
