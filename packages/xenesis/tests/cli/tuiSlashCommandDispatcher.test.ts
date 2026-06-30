import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, test, vi } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dispatcherPath = resolve(root, 'src/cli/tui/slashCommandDispatcher.ts');

async function loadDispatcherFactory() {
  expect(existsSync(dispatcherPath)).toBe(true);
  const module = (await import(
    pathToFileURL(dispatcherPath).href
  )) as typeof import('../../src/cli/tui/slashCommandDispatcher.js');
  return module.createTuiSlashCommandDispatcher;
}

async function createDispatcherHarness(
  options: { runtimeHandled?: boolean; outputHandled?: boolean; agentHandled?: boolean } = {},
) {
  const createTuiSlashCommandDispatcher = await loadDispatcherFactory();
  const calls: string[] = [];
  const notify = vi.fn();
  const appendInputHistory = vi.fn(async () => {
    calls.push('history');
  });
  const imageRunner = {
    run: vi.fn(async () => {
      calls.push('image');
    }),
  };
  const outputCommandHandler = vi.fn(async () => {
    calls.push('output');
    return options.outputHandled ?? false;
  });
  const runtimeCommandRouter = {
    handle: vi.fn(async () => {
      calls.push('runtime');
      return options.runtimeHandled ?? false;
    }),
  };
  const agentCommandRouter = {
    handle: vi.fn(async () => {
      calls.push('agent');
      return options.agentHandled ?? false;
    }),
  };
  const dispatcher = createTuiSlashCommandDispatcher({
    runtimeCommandRouter,
    outputCommandHandler,
    imageCommandRunner: imageRunner,
    agentCommandRouter,
    appendInputHistory,
    notify,
  });
  return {
    agentCommandRouter,
    appendInputHistory,
    calls,
    dispatcher,
    imageRunner,
    notify,
    outputCommandHandler,
    runtimeCommandRouter,
  };
}

describe('TUI slash command dispatcher', () => {
  test('routes runtime commands before parsing lower priority slash commands', async () => {
    const harness = await createDispatcherHarness({ runtimeHandled: true, outputHandled: true, agentHandled: true });

    await expect(harness.dispatcher.dispatch('/status')).resolves.toBe(true);

    expect(harness.calls).toEqual(['runtime']);
    expect(harness.outputCommandHandler).not.toHaveBeenCalled();
    expect(harness.imageRunner.run).not.toHaveBeenCalled();
    expect(harness.agentCommandRouter.handle).not.toHaveBeenCalled();
  });

  test('routes output commands before image and agent commands', async () => {
    const harness = await createDispatcherHarness({ outputHandled: true, agentHandled: true });

    await expect(harness.dispatcher.dispatch('/output down')).resolves.toBe(true);

    expect(harness.calls).toEqual(['runtime', 'output']);
    expect(harness.imageRunner.run).not.toHaveBeenCalled();
    expect(harness.agentCommandRouter.handle).not.toHaveBeenCalled();
  });

  test('records image commands in input history before sending them', async () => {
    const harness = await createDispatcherHarness();

    await expect(harness.dispatcher.dispatch('/image recent --width=80%')).resolves.toBe(true);

    expect(harness.calls).toEqual(['runtime', 'history', 'image']);
    expect(harness.appendInputHistory).toHaveBeenCalledWith('/image recent --width=80%');
    expect(harness.imageRunner.run).toHaveBeenCalledWith('/image recent --width=80%', 'image', 'recent --width=80%');
    expect(harness.agentCommandRouter.handle).not.toHaveBeenCalled();
  });

  test('routes remaining slash commands to the agent command router', async () => {
    const harness = await createDispatcherHarness({ agentHandled: true });

    await expect(harness.dispatcher.dispatch('/plan inspect repo')).resolves.toBe(true);

    expect(harness.calls).toEqual(['runtime', 'agent']);
    expect(harness.agentCommandRouter.handle).toHaveBeenCalledWith(
      '/plan inspect repo',
      expect.objectContaining({ name: 'plan', rest: 'inspect repo' }),
    );
  });

  test('returns false for normal prompts and owns unknown slash command notices', async () => {
    const promptHarness = await createDispatcherHarness();
    await expect(promptHarness.dispatcher.dispatch('hello')).resolves.toBe(false);
    expect(promptHarness.calls).toEqual(['runtime']);
    expect(promptHarness.notify).not.toHaveBeenCalled();

    const slashHarness = await createDispatcherHarness();
    await expect(slashHarness.dispatcher.dispatch('/does-not-exist')).resolves.toBe(true);
    expect(slashHarness.calls).toEqual(['runtime', 'agent']);
    expect(slashHarness.notify).toHaveBeenCalledWith(
      'Unknown or unsupported TUI slash command "/does-not-exist". Type /help.',
      'error',
    );
  });
});
