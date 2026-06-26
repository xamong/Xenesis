import { describe, expect, it } from "vitest";
import { measureTerminalCellWidth } from "../../src/cli/tui/inputBuffer.js";
import {
  createScrollbackRows,
  createScrollbackWindow,
  wrapTerminalLine,
  type TuiScrollbackRow
} from "../../src/cli/tui/scrollback.js";
import {
  createTuiState,
  reduceTuiEvent,
  setTuiCommandOutput,
  type TuiRuntimeSummary
} from "../../src/cli/tui/state.js";
import { createTuiViewModel } from "../../src/cli/tui/viewModel.js";

const runtime: TuiRuntimeSummary = {
  provider: "mock",
  model: "mock-model",
  approvalMode: "safe",
  workspace: "D:/repo"
};

describe("wrapTerminalLine (CJK-aware wrapping)", () => {
  it("counts CJK characters as width two when wrapping", () => {
    // Each Hangul syllable is width 2, so a width-4 limit fits exactly 2 chars.
    const wrapped = wrapTerminalLine("가나다라", 4);
    expect(wrapped).toEqual(["가나", "다라"]);
    for (const line of wrapped) {
      expect(measureTerminalCellWidth(line)).toBeLessThanOrEqual(4);
    }
  });

  it("wraps mixed ASCII and CJK by display width", () => {
    const wrapped = wrapTerminalLine("ab가", 3);
    // "ab" is width 2; adding "가" (width 2) would exceed 3, so it wraps.
    expect(wrapped).toEqual(["ab", "가"]);
  });

  it("emits a single wide character on its own row even below its width", () => {
    const wrapped = wrapTerminalLine("가", 1);
    expect(wrapped).toEqual(["가"]);
  });

  it("returns one row for an empty string", () => {
    expect(wrapTerminalLine("", 10)).toEqual([""]);
  });
});

describe("createScrollbackWindow", () => {
  const rows: TuiScrollbackRow[] = Array.from({ length: 10 }, (_, index) => ({
    text: `row-${index}`,
    tone: "normal"
  }));

  it("shows the live tail (latest rows) at offset 0", () => {
    const window = createScrollbackWindow(rows, 3, 0);
    expect(window.rows.map((row) => row.text)).toEqual(["row-7", "row-8", "row-9"]);
    expect(window.range).toBe("8-10/10");
    expect(window.offset).toBe(0);
  });

  it("scrolls back through history as the offset grows", () => {
    const window = createScrollbackWindow(rows, 3, 3);
    expect(window.rows.map((row) => row.text)).toEqual(["row-4", "row-5", "row-6"]);
    expect(window.range).toBe("5-7/10");
    expect(window.offset).toBe(3);
  });

  it("clamps the offset to the maximum so the top stays in view", () => {
    const window = createScrollbackWindow(rows, 3, 999);
    expect(window.rows.map((row) => row.text)).toEqual(["row-0", "row-1", "row-2"]);
    expect(window.range).toBe("1-3/10");
    expect(window.offset).toBe(7);
  });

  it("returns an empty 0/0 window when there are no rows", () => {
    const window = createScrollbackWindow([], 3, 0);
    expect(window.rows).toEqual([]);
    expect(window.range).toBe("0/0");
    expect(window.offset).toBe(0);
  });
});

describe("createScrollbackRows", () => {
  it("includes messages, tools, command output, notices, and approvals with tones", () => {
    let state = createTuiState(runtime);
    state = reduceTuiEvent(state, { type: "user_message", message: { role: "user", content: "hello" } });
    state = reduceTuiEvent(state, { type: "assistant_message", message: { role: "assistant", content: "hi" } });
    state = reduceTuiEvent(state, {
      type: "tool_call",
      toolCall: { id: "call-1", name: "read", input: { path: "README.md" } }
    });
    state = reduceTuiEvent(state, {
      type: "permission_request",
      request: {
        toolCallId: "call-2",
        approvalId: "approval-1",
        name: "write",
        input: { path: "notes.txt" },
        reason: "User approval required.",
        riskLevel: "medium",
        summary: "write notes.txt"
      }
    });

    const rows = createScrollbackRows(state, undefined, 80);
    const texts = rows.map((row) => row.text);
    expect(texts).toContain("user> hello");
    expect(texts).toContain("assistant> hi");
    expect(texts.some((text) => text.startsWith("tool> read"))).toBe(true);
    expect(texts.some((text) => text.startsWith("approval> write"))).toBe(true);
    expect(texts).toContain("approval> Press y to approve, n to deny.");
    expect(rows.find((row) => row.text === "user> hello")?.tone).toBe("user");
  });

  it("renders command output lines into the scrollback", () => {
    const state = setTuiCommandOutput(createTuiState(runtime), {
      command: "/sessions list",
      kind: "info",
      lines: ["line-0", "line-1"]
    });
    const view = createTuiViewModel(state, { width: 80, height: 24 });
    const rows = createScrollbackRows(state, view.commandOutput, 80);
    const texts = rows.map((row) => row.text);
    expect(texts.some((text) => text.startsWith("output> /sessions list"))).toBe(true);
    expect(texts).toContain("output> line-0");
    expect(texts).toContain("output> line-1");
  });

  it("falls back to a prompt placeholder when there is nothing to show", () => {
    const rows = createScrollbackRows(createTuiState(runtime), undefined, 80);
    expect(rows).toEqual([{ text: "Type a prompt below.", tone: "muted" }]);
  });
});

describe("view model scrollback integration", () => {
  it("wraps unified scrollback rows to the available terminal width (CJK-aware)", () => {
    let state = createTuiState(runtime);
    state = reduceTuiEvent(state, {
      type: "assistant_message",
      message: {
        role: "assistant",
        content: "한글과 English words should wrap inside the scrollback instead of clipping into the footer"
      }
    });

    const view = createTuiViewModel(state, { width: 32, height: 18 });

    expect(view.scrollbackRows.length).toBeGreaterThan(1);
    expect(view.totalScrollbackRows).toBeGreaterThanOrEqual(view.scrollbackRows.length);
    for (const row of view.scrollbackRows) {
      // width - 4 (paddingX + border) = 28 cells available.
      expect(measureTerminalCellWidth(row.text)).toBeLessThanOrEqual(28);
    }
  });

  it("exposes the live tail by default and scrolls back via the offset option", () => {
    let state = createTuiState(runtime);
    for (let index = 0; index < 20; index += 1) {
      state = reduceTuiEvent(state, { type: "user_message", message: { role: "user", content: `message-${index}` } });
    }

    const live = createTuiViewModel(state, { width: 72, height: 16 });
    const scrolled = createTuiViewModel(state, { width: 72, height: 16 }, { scrollbackOffset: 3 });

    expect(live.scrollbackOffset).toBe(0);
    expect(live.totalScrollbackRows).toBe(20);
    expect(live.scrollbackRows.at(-1)?.text).toBe("user> message-19");
    expect(scrolled.scrollbackOffset).toBe(3);
    expect(scrolled.scrollbackRows.at(-1)?.text).toBe("user> message-16");
    expect(scrolled.maxScrollbackRows).toBeGreaterThanOrEqual(1);
  });

  it("does not break the existing transcript view model fields", () => {
    let state = createTuiState(runtime);
    state = reduceTuiEvent(state, { type: "user_message", message: { role: "user", content: "still here" } });
    const view = createTuiViewModel(state, { width: 72, height: 16 });
    expect(view.transcriptRows).toEqual([{ role: "user", content: "still here" }]);
    expect(view.statusItems[0]).toBe("provider mock");
    expect(view.footer).toContain("/help");
  });
});
