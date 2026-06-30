import { PassThrough } from 'node:stream';
import React from 'react';
import { describe, expect, test } from 'vitest';
import { createTuiAppElement, type InkTuiController, runInkTui } from '../../src/cli/tui/inkRenderer.js';
import {
  createTuiState,
  reduceTuiEvent,
  resolveTuiApproval,
  setTuiCommandOutput,
  setTuiCommandOutputExpanded,
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
  stream.columns = 80;
  stream.rows = 24;
  stream.getWindowSize = () => [stream.columns, stream.rows];
  return stream;
}

function createApprovalState() {
  return reduceTuiEvent(
    createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    }),
    {
      type: 'permission_request',
      request: {
        toolCallId: 'call-write',
        approvalId: 'approval-write',
        name: 'write',
        input: { path: 'notes.txt' },
        reason: 'User approval required for modifying tool.',
        riskLevel: 'medium',
        summary: 'write notes.txt',
      },
    },
  );
}

function createControllerHarness(initialState: TuiState) {
  let state = initialState;
  const listeners = new Set<(next: TuiState) => void>();
  const approvals: boolean[] = [];
  const controller: InkTuiController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    submit: async () => undefined,
    cancel: () => undefined,
    resolveApproval(approved) {
      approvals.push(approved);
      state = resolveTuiApproval(state, approved);
      for (const listener of listeners) listener(state);
    },
  };
  return { controller, approvals };
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for test condition.');
}

describe('Ink TUI renderer', () => {
  test('creates a React element for the full-screen TUI app', () => {
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe: () => () => undefined,
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };

    const element = createTuiAppElement({ controller, inputHistory: ['안녕'] });

    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.inputHistory).toEqual(['안녕']);
  });

  test('routes stdin approval y to the controller', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const { controller, approvals } = createControllerHarness(createApprovalState());

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('y');
      await waitFor(() => approvals.length === 1);
      expect(approvals).toEqual([true]);
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('routes stdin approval n to the controller', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const { controller, approvals } = createControllerHarness(createApprovalState());

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('n');
      await waitFor(() => approvals.length === 1);
      expect(approvals).toEqual([false]);
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('completes the top slash command suggestion with tab', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('/a');
      await waitFor(() => output.includes('tui> /a'));
      stdin.write('\t');
      await waitFor(() => output.includes('tui> /approval '));
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('positions the terminal cursor after Korean input for IME composition', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('안');
      await waitFor(() => output.includes('tui> 안'));
      await waitFor(() => output.includes('\u001B[10G\u001B[?25h'));
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('does not clear the whole terminal frame on each typed character', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('안');
      await waitFor(() => output.includes('tui> 안'));
      output = '';

      stdin.write('녕');
      await waitFor(() => output.includes('녕'));
      expect(output).not.toContain('\u001B[2J\u001B[3J\u001B[H');
      expect(countLineEraseSequences(output)).toBeLessThanOrEqual(2);
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('renders structured runtime, state, and session header rows', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = reduceTuiEvent(
      createTuiState({
        provider: 'mock',
        model: 'mock-model',
        approvalMode: 'safe',
        workspace: '/repo',
      }),
      {
        type: 'run_state',
        status: 'started',
        phase: 'executing',
        summary: 'started',
        turns: 2,
      },
    );
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await waitFor(() => output.includes('runtime provider mock | model mock-model | approval safe'));
      await waitFor(() => output.includes('state started | turns 2'));
      await waitFor(() => output.includes('session session none | context 0'));
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('renders contextual detail and examples for the selected slash suggestion', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('/pro');
      await waitFor(() => output.includes('Suggestions 1/1'));
      await waitFor(() => output.includes('Detail: Show or change provider for subsequent prompts.'));
      await waitFor(() => output.includes('Examples: /provider openai | /provider qwen | /provider deepseek'));
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('filters terminal image slash commands and accepts the selected image suggestion', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('/im');
      await waitFor(() => output.includes('Suggestions 1/1'));
      await waitFor(() => output.includes('/image <path-or-url>'));
      await waitFor(() => output.includes('Detail: Show, repeat, inspect, or clear terminal images.'));
      stdin.write('\r');
      await waitFor(() => output.includes('tui> /image '));
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('escape hides suggestions first, then clears the typed slash input', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('/pro');
      await waitFor(() => output.includes('Suggestions 1/1'));
      const beforeFirstEscapeLength = output.length;
      stdin.write('\u001B');
      await waitFor(() => output.length > beforeFirstEscapeLength);
      const afterFirstEscape = output.slice(output.lastIndexOf('tui> /pro'));
      expect(afterFirstEscape).not.toContain('Suggestions 1/1');
      const beforeSecondEscapeLength = output.length;
      stdin.write('\u001B');
      await waitFor(() => output.length > beforeSecondEscapeLength);
      const afterSecondEscape = output.slice(output.lastIndexOf('tui> '));
      expect(afterSecondEscape).not.toContain('tui> /pro');
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('cycles slash argument suggestions with tab and accepts the selected suggestion with enter', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('/approval ');
      await waitFor(() => output.includes('tui> /approval '));
      stdin.write('\t');
      await waitFor(() => output.includes('Suggestions 2/3'));
      stdin.write('\r');
      await waitFor(() => output.includes('tui> /approval auto'));
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('wraps slash suggestions backward with shift-tab and accepts the selected suggestion with enter', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('/');
      await waitFor(() => output.includes('Suggestions 1/5'));
      stdin.write('\u001B[Z');
      await waitFor(() => output.includes('Suggestions 5/5'));
      stdin.write('\r');
      await waitFor(() => output.includes('tui> /provider '));
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('submits an exact slash command when enter would not change the selected completion', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    const submitted: string[] = [];
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async (input) => {
        submitted.push(input);
      },
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      stdin.write('/status');
      await waitFor(() => output.includes('tui> /status'));
      stdin.write('\r');
      await waitFor(() => submitted.length === 1);
      expect(submitted).toEqual(['/status']);
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('scrolls unified scrollback history with page keys', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    for (let index = 0; index < 20; index += 1) {
      state = reduceTuiEvent(state, {
        type: 'user_message',
        message: { role: 'user', content: `message-${index}` },
      });
    }
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await waitFor(() => output.includes('Scrollback 12-20/20'));
      stdin.write('\u001B[5~');
      await waitFor(() => output.includes('Scrollback 3-11/20'));
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('scrolls unified scrollback with page keys even when command output exists', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    for (let index = 0; index < 20; index += 1) {
      state = reduceTuiEvent(state, {
        type: 'user_message',
        message: { role: 'user', content: `message-${index}` },
      });
    }
    state = setTuiCommandOutput(state, {
      command: '/sessions list',
      kind: 'info',
      lines: Array.from({ length: 20 }, (_, index) => `line-${index}`),
    });
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await waitFor(() => output.includes('output> /sessions list (1-5/20)'));
      stdin.write('\u001B[5~');
      await waitFor(() => output.includes('user> message-11'));
      stdin.write('\u001B[F');
      await waitFor(() => output.includes('output> line-4'));
      stdin.write('\u001B[H');
      await waitFor(() => output.includes('user> message-0'));
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('scrolls unified scrollback with mouse wheel escape sequences', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    let state = createTuiState({
      provider: 'mock',
      model: 'mock-model',
      approvalMode: 'safe',
      workspace: '/repo',
    });
    for (let index = 0; index < 20; index += 1) {
      state = reduceTuiEvent(state, {
        type: 'user_message',
        message: { role: 'user', content: `message-${index}` },
      });
    }
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await waitFor(() => output.includes('Scrollback 12-20/20'));
      stdin.write('\u001B[<64;10;10M');
      await waitFor(() => output.includes('Scrollback 3-11/20'));
      stdin.write('\u001B[<65;10;10M');
      await waitFor(() => output.includes('Scrollback 12-20/20'));
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test('renders expanded command output range', async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const state = setTuiCommandOutputExpanded(
      setTuiCommandOutput(
        createTuiState({
          provider: 'mock',
          model: 'mock-model',
          approvalMode: 'safe',
          workspace: '/repo',
        }),
        {
          command: '/compact session-1',
          kind: 'info',
          lines: Array.from({ length: 20 }, (_, index) => `line-${index}`),
        },
      ),
      true,
    );
    const controller: InkTuiController = {
      getState: () => state,
      subscribe(listener) {
        listener(state);
        return () => undefined;
      },
      submit: async () => undefined,
      cancel: () => undefined,
      resolveApproval: () => undefined,
    };
    let output = '';
    stdout.on('data', (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await waitFor(() => output.includes('line-7'));
      expect(output).toContain('1-8/20');
      expect(output).toContain('/compact session-1');
      expect(output).toContain('line-7');
      stdin.write('\u0003');
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });
});

function countLineEraseSequences(output: string) {
  return output.match(/\u001B\[2K/g)?.length ?? 0;
}
