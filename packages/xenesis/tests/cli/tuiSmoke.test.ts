import { PassThrough } from 'node:stream';
import { describe, expect, test } from 'vitest';
import { parseSlashCommandLine } from '../../src/cli/slashCommands.js';
import { type InkTuiController, runInkTui } from '../../src/cli/tui/inkRenderer.js';
import {
  appendTuiNotice,
  clearTuiCommandOutput,
  createTuiState,
  reduceTuiEvent,
  scrollTuiCommandOutput,
  setTuiCommandOutput,
  setTuiCommandOutputExpanded,
  setTuiCommandOutputSavedPath,
  setTuiSessionContext,
  setTuiSuggestionContext,
  type TuiState,
} from '../../src/cli/tui/state.js';

type TestReadStream = PassThrough &
  NodeJS.ReadStream & {
    isTTY: boolean;
    rawMode: boolean;
    setRawMode(mode: boolean): TestReadStream;
    ref(): TestReadStream;
    unref(): TestReadStream;
  };

type TestWriteStream = PassThrough &
  NodeJS.WriteStream & {
    isTTY: boolean;
    columns: number;
    rows: number;
    getWindowSize(): [number, number];
  };

function createTestReadStream(): TestReadStream {
  const stream = new PassThrough() as TestReadStream;
  stream.isTTY = true;
  stream.rawMode = false;
  stream.setRawMode = (mode: boolean) => {
    stream.rawMode = mode;
    return stream;
  };
  stream.ref = () => stream;
  stream.unref = () => stream;
  return stream;
}

function createTestWriteStream(): TestWriteStream {
  const stream = new PassThrough() as TestWriteStream;
  stream.isTTY = true;
  stream.columns = 100;
  stream.rows = 28;
  stream.getWindowSize = () => [stream.columns, stream.rows];
  return stream;
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for smoke test condition.');
}

function pressEnter(stdin: NodeJS.WritableStream) {
  stdin.write('\r');
}

async function settleInput() {
  await new Promise((resolve) => setTimeout(resolve, 75));
}

async function typeAndSubmit(stdin: NodeJS.WritableStream, value: string, waitUntil?: () => boolean) {
  stdin.write(value);
  if (waitUntil) await waitFor(waitUntil);
  else await new Promise((resolve) => setTimeout(resolve, 10));
  pressEnter(stdin);
  await settleInput();
}

function createSmokeState() {
  return setTuiSessionContext(
    setTuiSuggestionContext(
      setTuiCommandOutput(
        createTuiState({
          provider: 'mock',
          model: 'mock-model',
          approvalMode: 'safe',
          workspace: 'D:/repo',
        }),
        {
          command: '/compact session-20260622',
          kind: 'info',
          lines: Array.from({ length: 24 }, (_, index) => `output-line-${index}`),
        },
      ),
      {
        sessionIds: ['session-20260622', 'session-20260621'],
      },
    ),
    {
      activeSessionId: 'session-smoke',
      historyMessageCount: 0,
    },
  );
}

function createSmokeController(initialState: TuiState) {
  let state = initialState;
  const listeners = new Set<(next: TuiState) => void>();
  const submitted: string[] = [];
  const publish = () => {
    for (const listener of listeners) listener(state);
  };
  const setState = (next: TuiState) => {
    state = next;
    publish();
  };
  const controller: InkTuiController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    submit(input) {
      submitted.push(input);
      const command = parseSlashCommandLine(input);
      if (command?.name === 'output') {
        const action = command.args[0];
        if (action === 'expand') {
          setState(setTuiCommandOutputExpanded(state, true));
          return;
        }
        if (action === 'down') {
          setState(scrollTuiCommandOutput(state, 4));
          return;
        }
        if (action === 'save') {
          setState(
            appendTuiNotice(setTuiCommandOutputSavedPath(state, 'D:/repo/.xenesis/outputs/xenesis-output-smoke.txt'), {
              kind: 'info',
              message: 'Output saved: D:/repo/.xenesis/outputs/xenesis-output-smoke.txt',
            }),
          );
          return;
        }
        if (action === 'clear') {
          setState(
            appendTuiNotice(clearTuiCommandOutput(state), {
              kind: 'info',
              message: 'Output cleared.',
            }),
          );
          return;
        }
      }
      if (command?.name === 'provider') {
        setState({
          ...state,
          runtime: {
            ...state.runtime,
            provider: command.args[0] ?? state.runtime.provider,
          },
        });
        return;
      }
      if (command?.name === 'model') {
        setState({
          ...state,
          runtime: {
            ...state.runtime,
            model: command.args[0] ?? state.runtime.model,
          },
        });
        return;
      }
      if (command?.name === 'approval') {
        const approvalMode =
          command.args[0] === 'readonly' || command.args[0] === 'auto' || command.args[0] === 'safe'
            ? command.args[0]
            : state.runtime.approvalMode;
        setState({
          ...state,
          runtime: {
            ...state.runtime,
            approvalMode,
          },
        });
        return;
      }
      if (command?.name === 'resume') {
        const [sessionId, ...promptParts] = command.args;
        const prompt = promptParts.join(' ');
        const nextState = reduceTuiEvent(
          reduceTuiEvent(state, {
            type: 'user_message',
            message: { role: 'user', content: input },
          }),
          {
            type: 'assistant_message',
            message: { role: 'assistant', content: `resumed ${sessionId}: ${prompt}` },
          },
        );
        setState(
          setTuiSessionContext(nextState, {
            resumedFromSessionId: sessionId,
            historyMessageCount: 4,
          }),
        );
        return;
      }
      const nextState = reduceTuiEvent(
        reduceTuiEvent(state, {
          type: 'user_message',
          message: { role: 'user', content: input },
        }),
        {
          type: 'assistant_message',
          message: { role: 'assistant', content: `echo: ${input}` },
        },
      );
      setState(
        setTuiSessionContext(nextState, {
          historyMessageCount: state.sessionContext.historyMessageCount + 2,
        }),
      );
    },
    cancel: () => undefined,
    resolveApproval: () => undefined,
  };
  return { controller, submitted };
}

describe('Ink TUI smoke', () => {
  test('drives slash completion, output controls, session completion, and Korean input', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const { controller, submitted } = createSmokeController(createSmokeState());
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await waitFor(() => output.includes('session session-smoke'));
      await waitFor(() => output.includes('context 0'));
      stdin.write('/out');
      await waitFor(() => output.includes('Suggestions 1/1'));
      stdin.write('\t');
      await waitFor(() => output.includes('tui> /output '));
      stdin.write('e');
      await waitFor(() => output.includes('tui> /output e'));
      stdin.write('\t');
      await waitFor(() => output.includes('tui> /output expand'));
      pressEnter(stdin);

      await waitFor(() => output.includes('output-line-11'));
      expect(submitted).toContain('/output expand');
      await typeAndSubmit(stdin, '/output down', () => output.includes('tui> /output down'));
      await waitFor(() => output.includes('output-line-15'));
      await typeAndSubmit(stdin, '/output save', () => output.includes('tui> /output save'));
      await waitFor(() => submitted.includes('/output save'));
      await waitFor(() => output.includes('saved D:/repo/.xenesis/outputs/xenesis-output-smoke.txt'));
      await typeAndSubmit(stdin, '/output clear', () => output.includes('tui> /output clear'));
      await waitFor(() => output.includes('Output cleared.'));

      await typeAndSubmit(stdin, '/provider openai', () => output.includes('tui> /provider openai'));
      await waitFor(() => output.includes('provider openai'));
      await typeAndSubmit(stdin, '/model gpt-4o-mini', () => output.includes('tui> /model gpt-4o-mini'));
      await waitFor(() => submitted.includes('/model gpt-4o-mini'));
      await waitFor(() => output.includes('model gpt-4o-mini'));
      await typeAndSubmit(stdin, '/approval readonly', () => output.includes('tui> /approval readonly'));
      await waitFor(() => output.includes('approval readonly'));

      stdin.write('/resume ');
      await waitFor(() => output.includes('Suggestions 1/2') && output.includes('tui> /resume '));
      pressEnter(stdin);
      await settleInput();
      await waitFor(() => output.includes('tui> /resume session-20260622 '));
      stdin.write('계속');
      await waitFor(() => output.includes('tui> /resume session-20260622 계속'));
      pressEnter(stdin);
      await settleInput();
      await waitFor(() => output.includes('assistant> resumed session-20260622: 계속'));
      await waitFor(() => output.includes('resumed session-20260622'));
      await waitFor(() => output.includes('context 4'));
      expect(submitted).toContain('/resume session-20260622 계속');

      await typeAndSubmit(stdin, '안녕', () => output.includes('tui> 안녕'));
      await waitFor(() => output.includes('user> 안녕'));
      await waitFor(() => output.includes('context 6'));
      expect(submitted).toContain('안녕');
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('routes ctrl+c to cancel while submit is busy', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    let cancelCount = 0;
    let resolveSubmit: (() => void) | undefined;
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: 'D:/repo',
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit() {
        return new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        });
      },
      cancel() {
        cancelCount += 1;
      },
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await typeAndSubmit(stdin, 'long running task', () => output.includes('tui> long running task'));
      await waitFor(() => output.includes('running>'));
      stdin.write('\u0003');
      await waitFor(() => cancelCount === 1);
      resolveSubmit?.();
      await settleInput();
      await settleInput();
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });
});
