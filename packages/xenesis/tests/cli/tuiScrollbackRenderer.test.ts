import { PassThrough } from "node:stream";
import { describe, expect, test } from "vitest";
import { type InkTuiController, runInkTui } from "../../src/cli/tui/inkRenderer.js";
import { createTuiState, reduceTuiEvent, type TuiRuntimeSummary, type TuiState } from "../../src/cli/tui/state.js";

const ESC = "\u001B";

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

const runtime: TuiRuntimeSummary = {
  provider: "mock",
  model: "mock-model",
  approvalMode: "safe",
  workspace: "/repo"
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

function createReadOnlyController(state: TuiState): InkTuiController {
  return {
    getState: () => state,
    subscribe(listener) {
      listener(state);
      return () => undefined;
    },
    submit: async () => undefined,
    cancel: () => undefined,
    resolveApproval: () => undefined
  };
}

async function waitFor(predicate: () => boolean, timeoutMs = 2000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for test condition.");
}

// Repeatedly send a key until the predicate holds, so the assertion is robust
// to the exact page/scroll step derived from the terminal height.
async function pressUntil(
  send: () => void,
  predicate: () => boolean,
  { maxPresses = 20, settleMs = 60 }: { maxPresses?: number; settleMs?: number } = {}
) {
  for (let attempt = 0; attempt < maxPresses; attempt += 1) {
    if (predicate()) return;
    send();
    const startedAt = Date.now();
    while (Date.now() - startedAt < settleMs) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  if (!predicate()) throw new Error("Timed out waiting after repeated key presses.");
}

function stateWithMessages(count: number): TuiState {
  let state = createTuiState(runtime);
  for (let index = 0; index < count; index += 1) {
    state = reduceTuiEvent(state, { type: "user_message", message: { role: "user", content: `message-${index}` } });
  }
  return state;
}

describe("Ink TUI scrollback rendering", () => {
  test("renders a unified scrollback panel for state history", async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const controller = createReadOnlyController(stateWithMessages(3));
    let output = "";
    stdout.on("data", (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await waitFor(() => output.includes("Scrollback"));
      await waitFor(() => output.includes("user> message-2"));
      stdin.write("\u0003");
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test("scrolls back through history with PageUp and returns to live with End", async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const controller = createReadOnlyController(stateWithMessages(40));
    let output = "";
    stdout.on("data", (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      // Live tail shows the latest message.
      await waitFor(() => output.includes("user> message-39"));
      // PageUp scrolls back through history (one page at a time) up to the top.
      output = "";
      await pressUntil(
        () => stdin.write(`${ESC}[5~`),
        () => output.includes("user> message-0")
      );
      // While scrolled near the top, the live tail message is out of view.
      expect(output.includes("user> message-39")).toBe(false);
      // End returns to the live tail.
      output = "";
      stdin.write(`${ESC}[F`);
      await waitFor(() => output.includes("user> message-39"));
      stdin.write("\u0003");
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test("Home scrolls to the oldest history and PageDown walks back toward live", async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const controller = createReadOnlyController(stateWithMessages(40));
    let output = "";
    stdout.on("data", (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await waitFor(() => output.includes("user> message-39"));
      // Home jumps straight to the oldest history.
      output = "";
      stdin.write(`${ESC}[H`);
      await waitFor(() => output.includes("user> message-0"));
      // PageDown walks forward one page at a time back toward the live tail.
      output = "";
      await pressUntil(
        () => stdin.write(`${ESC}[6~`),
        () => output.includes("user> message-39")
      );
      stdin.write("\u0003");
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test("scrolls with xterm SGR mouse-wheel escape sequences", async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const controller = createReadOnlyController(stateWithMessages(40));
    let output = "";
    stdout.on("data", (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await waitFor(() => output.includes("user> message-39"));
      // Wheel up (SGR button 64) scrolls back one page per notch up to the top.
      output = "";
      await pressUntil(
        () => stdin.write(`${ESC}[<64;10;10M`),
        () => output.includes("user> message-0")
      );
      // Wheel down (SGR button 65) scrolls forward back to the live tail.
      output = "";
      await pressUntil(
        () => stdin.write(`${ESC}[<65;10;10M`),
        () => output.includes("user> message-39")
      );
      stdin.write("\u0003");
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
  });

  test("enables and disables xterm SGR mouse mode around the session", async () => {
    const stdin = createTestReadStream();
    const stdout = createTestWriteStream();
    const stderr = createTestWriteStream();
    const controller = createReadOnlyController(stateWithMessages(2));
    let output = "";
    stdout.on("data", (chunk) => {
      output += String(chunk);
    });

    const run = runInkTui({ controller }, { stdin, stdout, stderr, patchConsole: false });
    try {
      await waitFor(() => stdin.rawMode);
      await waitFor(() => output.includes(`${ESC}[?1006h`));
      stdin.write("\u0003");
      await run;
    } finally {
      stdin.destroy();
      stdout.destroy();
      stderr.destroy();
    }
    expect(output).toContain(`${ESC}[?1000h`);
    expect(output).toContain(`${ESC}[?1006h`);
  });
});
