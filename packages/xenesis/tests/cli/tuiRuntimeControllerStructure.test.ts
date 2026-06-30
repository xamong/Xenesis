import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const mainSource = readFileSync(resolve(root, 'src/cli/main.ts'), 'utf8');
const runtimeControllerPath = resolve(root, 'src/cli/tui/runtimeController.ts');
const agentCommandRouterPath = resolve(root, 'src/cli/tui/agentCommandRouter.ts');
const imageCommandsPath = resolve(root, 'src/cli/tui/imageCommands.ts');
const outputCommandsPath = resolve(root, 'src/cli/tui/outputCommands.ts');
const runtimeCommandRouterPath = resolve(root, 'src/cli/tui/runtimeCommandRouter.ts');
const slashCommandDispatcherPath = resolve(root, 'src/cli/tui/slashCommandDispatcher.ts');
const runtimeTypesPath = resolve(root, 'src/cli/tui/runtimeTypes.ts');
const tuiIndexPath = resolve(root, 'src/cli/tui/index.ts');

describe('TUI runtime controller structure', () => {
  test('keeps the interactive TUI controller outside main.ts', () => {
    expect(existsSync(runtimeControllerPath)).toBe(true);
    const runtimeControllerSource = readFileSync(runtimeControllerPath, 'utf8');

    expect(mainSource).toMatch(/createTuiRuntimeController/);
    expect(mainSource).not.toMatch(/const controller: InkTuiController =/);
    expect(mainSource).not.toMatch(/async submit\(input: string\)/);
    expect(runtimeControllerSource).toMatch(/export function createTuiRuntimeController/);
    expect(runtimeControllerSource).toMatch(/const controller: InkTuiController =/);
    expect(runtimeControllerSource).toMatch(/async submit\(input: string\)/);
  });

  test('delegates image and output slash command implementations to focused modules', () => {
    expect(existsSync(imageCommandsPath)).toBe(true);
    expect(existsSync(outputCommandsPath)).toBe(true);

    const runtimeControllerSource = readFileSync(runtimeControllerPath, 'utf8');
    const imageCommandsSource = readFileSync(imageCommandsPath, 'utf8');
    const outputCommandsSource = readFileSync(outputCommandsPath, 'utf8');

    expect(runtimeControllerSource).toMatch(/createTuiImageCommandRunner/);
    expect(runtimeControllerSource).toMatch(/createTuiOutputCommandHandler/);
    expect(runtimeControllerSource).not.toMatch(/const runTuiImageSlashCommand =/);
    expect(runtimeControllerSource).not.toMatch(/const handleOutputCommand = async/);

    expect(imageCommandsSource).toMatch(/export function createTuiImageCommandRunner/);
    expect(imageCommandsSource).toMatch(/createRemoteDeskBridgeFromEnv/);
    expect(imageCommandsSource).toMatch(/refreshTuiImageSuggestions/);
    expect(imageCommandsSource).toMatch(/xd\.terminals\.ui\.clearScreen/);

    expect(outputCommandsSource).toMatch(/export function createTuiOutputCommandHandler/);
    expect(outputCommandsSource).toMatch(/scrollTuiCommandOutput/);
    expect(outputCommandsSource).toMatch(/writeFile\(\s*outputPath/);
    expect(outputCommandsSource).toMatch(/xenesis-output-/);
  });

  test('delegates agent and captured slash command routing to a focused module', () => {
    expect(existsSync(agentCommandRouterPath)).toBe(true);

    const runtimeControllerSource = readFileSync(runtimeControllerPath, 'utf8');
    const agentCommandRouterSource = readFileSync(agentCommandRouterPath, 'utf8');
    const dispatcherSource = existsSync(slashCommandDispatcherPath)
      ? readFileSync(slashCommandDispatcherPath, 'utf8')
      : '';

    expect(runtimeControllerSource).toMatch(/createTuiAgentCommandRouter/);
    expect(dispatcherSource).toMatch(/agentCommandRouter\.handle\(input, command\)/);
    expect(runtimeControllerSource).not.toMatch(/const capturedTuiSlashCommandNames =/);
    expect(runtimeControllerSource).not.toMatch(/const runCapturedTuiSlashCommand =/);
    expect(runtimeControllerSource).not.toMatch(/command\?\.name === ['"]resume['"]/);

    expect(agentCommandRouterSource).toMatch(/export function createTuiAgentCommandRouter/);
    expect(agentCommandRouterSource).toMatch(/capturedTuiSlashCommandNames/);
    expect(agentCommandRouterSource).toMatch(/runCapturedSlashCommand/);
    expect(agentCommandRouterSource).toMatch(/command\?\.name === ['"]plan['"] \|\| command\?\.name === ['"]work['"]/);
    expect(agentCommandRouterSource).toMatch(/command\?\.name === ['"]resume['"]/);
    expect(agentCommandRouterSource).toMatch(/eventsToMessages\(/);
    expect(agentCommandRouterSource).toMatch(/readSessionLog\(/);
    expect(agentCommandRouterSource).toMatch(/resumedFromSessionId: sessionId/);
  });

  test('delegates basic runtime slash commands to a focused module', () => {
    expect(existsSync(runtimeCommandRouterPath)).toBe(true);

    const runtimeControllerSource = readFileSync(runtimeControllerPath, 'utf8');
    const runtimeCommandRouterSource = readFileSync(runtimeCommandRouterPath, 'utf8');
    const dispatcherSource = existsSync(slashCommandDispatcherPath)
      ? readFileSync(slashCommandDispatcherPath, 'utf8')
      : '';

    expect(runtimeControllerSource).toMatch(/createTuiRuntimeCommandRouter/);
    expect(dispatcherSource).toMatch(/runtimeCommandRouter\.handle\(input\)/);
    expect(runtimeControllerSource).not.toMatch(/input === ['"]\/status['"]/);
    expect(runtimeControllerSource).not.toMatch(/input\.startsWith\(['"]\/provider ['"]\)/);
    expect(runtimeControllerSource).not.toMatch(/input\.startsWith\(['"]\/model ['"]\)/);
    expect(runtimeControllerSource).not.toMatch(/input\.startsWith\(['"]\/approval ['"]\)/);
    expect(runtimeControllerSource).not.toMatch(/input === ['"]\/clear['"] \|\| input === ['"]\/reset['"]/);

    expect(runtimeCommandRouterSource).toMatch(/export function createTuiRuntimeCommandRouter/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/status['"]/);
    expect(runtimeCommandRouterSource).toMatch(/input\.startsWith\(['"]\/provider ['"]\)/);
    expect(runtimeCommandRouterSource).toMatch(/input\.startsWith\(['"]\/model ['"]\)/);
    expect(runtimeCommandRouterSource).toMatch(/input\.startsWith\(['"]\/approval ['"]\)/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/tools['"]/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/session['"]/);
    expect(runtimeCommandRouterSource).toMatch(/input === ['"]\/clear['"] \|\| input === ['"]\/reset['"]/);
    expect(runtimeCommandRouterSource).toMatch(/getTuiCommandPaletteHelp/);
  });

  test('centralizes slash command priority and unknown command handling', () => {
    expect(existsSync(slashCommandDispatcherPath)).toBe(true);

    const runtimeControllerSource = readFileSync(runtimeControllerPath, 'utf8');
    const dispatcherSource = readFileSync(slashCommandDispatcherPath, 'utf8');

    expect(runtimeControllerSource).toMatch(/createTuiSlashCommandDispatcher/);
    expect(runtimeControllerSource).toMatch(/tuiSlashCommandDispatcher\.dispatch\(input\)/);
    expect(runtimeControllerSource).not.toMatch(/Unknown or unsupported TUI slash command/);
    expect(runtimeControllerSource).not.toMatch(/command && command\.name === ['"]output['"]/);
    expect(runtimeControllerSource).not.toMatch(
      /command && \(command\.name === ['"]image['"] \|\| command\.name === ['"]xcon-image['"]\)/,
    );

    expect(dispatcherSource).toMatch(/export function createTuiSlashCommandDispatcher/);
    expect(dispatcherSource).toMatch(/runtimeCommandRouter\.handle\(input\)/);
    expect(dispatcherSource).toMatch(/parseSlashCommandLine\(input\)/);
    expect(dispatcherSource).toMatch(/command\.name === ['"]output['"]/);
    expect(dispatcherSource).toMatch(/command\.name === ['"]image['"] \|\| command\.name === ['"]xcon-image['"]/);
    expect(dispatcherSource).toMatch(/agentCommandRouter\.handle\(input, command\)/);
    expect(dispatcherSource).toMatch(/Unknown or unsupported TUI slash command/);
  });

  test('keeps shared TUI runtime contracts in a type-only boundary module', () => {
    expect(existsSync(runtimeTypesPath)).toBe(true);

    const runtimeTypesSource = readFileSync(runtimeTypesPath, 'utf8');
    const runtimeControllerSource = readFileSync(runtimeControllerPath, 'utf8');
    const agentCommandRouterSource = readFileSync(agentCommandRouterPath, 'utf8');
    const imageCommandsSource = readFileSync(imageCommandsPath, 'utf8');

    expect(runtimeTypesSource).toMatch(/export type TuiSessionWriterSetter/);
    expect(runtimeTypesSource).toMatch(/export interface TuiRuntimeIo/);
    expect(runtimeTypesSource).toMatch(/export interface TuiRuntimeParsedArgs/);
    expect(runtimeTypesSource).toMatch(/export interface RunTuiPromptOptions/);
    expect(runtimeTypesSource).toMatch(/export interface TuiTerminalImageRequest/);

    expect(runtimeControllerSource).toMatch(/from ['"]\.\/runtimeTypes\.js['"]/);
    expect(agentCommandRouterSource).toMatch(/from ['"]\.\/runtimeTypes\.js['"]/);
    expect(imageCommandsSource).toMatch(/from ['"]\.\/runtimeTypes\.js['"]/);
    expect(runtimeControllerSource).not.toMatch(/export type TuiSessionWriterSetter =/);
    expect(runtimeControllerSource).not.toMatch(/export interface TuiRuntimeIo/);
    expect(imageCommandsSource).not.toMatch(/export interface TuiTerminalImageRequest/);
  });

  test('exposes TUI public APIs through an index barrel for CLI imports', () => {
    expect(existsSync(tuiIndexPath)).toBe(true);

    const tuiIndexSource = readFileSync(tuiIndexPath, 'utf8');

    expect(tuiIndexSource).toMatch(
      /export \{ createInitialTuiState, renderTuiFrameLines \} from ['"]\.\/runTui\.js['"]/,
    );
    expect(tuiIndexSource).toMatch(/export \{ createTuiRuntimeController \} from ['"]\.\/runtimeController\.js['"]/);
    expect(tuiIndexSource).toMatch(
      /export type \{[\s\S]*CreateTuiRuntimeControllerOptions[\s\S]*\} from ['"]\.\/runtimeController\.js['"]/,
    );
    expect(tuiIndexSource).toMatch(
      /export type \{[\s\S]*TuiRuntimeIo[\s\S]*TuiRuntimeParsedArgs[\s\S]*\} from ['"]\.\/runtimeTypes\.js['"]/,
    );

    expect(mainSource).toMatch(/from ['"]\.\/tui\/index\.js['"]/);
    expect(mainSource).not.toMatch(/from ['"]\.\/tui\/runTui\.js['"]/);
    expect(mainSource).not.toMatch(/from ['"]\.\/tui\/runtimeController\.js['"]/);
  });
});
