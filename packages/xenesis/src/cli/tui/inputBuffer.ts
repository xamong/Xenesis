export interface TuiInputBuffer {
  chars: string[];
  cursor: number;
  history: string[];
  historyIndex: number | undefined;
  draftBeforeHistory: string;
}

export type TuiInputAction =
  | { type: "insert"; value: string }
  | { type: "replaceValue"; value: string }
  | { type: "backspace" }
  | { type: "delete" }
  | { type: "clear" }
  | { type: "moveLeft" }
  | { type: "moveRight" }
  | { type: "moveHome" }
  | { type: "moveEnd" }
  | { type: "historyPrevious" }
  | { type: "historyNext" }
  | { type: "submit" };

export interface TuiInputResult {
  state: TuiInputBuffer;
  submitted?: string;
}

export function createTuiInputBuffer(history: string[] = []): TuiInputBuffer {
  return {
    chars: [],
    cursor: 0,
    history: history.filter((entry) => entry.trim()).slice(-100),
    historyIndex: undefined,
    draftBeforeHistory: ""
  };
}

export function renderTuiInputValue(buffer: TuiInputBuffer) {
  return buffer.chars.join("");
}

export function renderTuiInputWithCursor(buffer: TuiInputBuffer) {
  const before = buffer.chars.slice(0, buffer.cursor).join("");
  const at = buffer.chars[buffer.cursor] ?? " ";
  const after = buffer.chars.slice(buffer.cursor + 1).join("");
  return `${before}${at}${after}`;
}

export function getTuiInputCursorCellOffset(buffer: TuiInputBuffer) {
  return measureTerminalCellWidth(buffer.chars.slice(0, buffer.cursor).join(""));
}

/**
 * Measure the terminal cell width of a string, counting full-width (CJK and
 * related) characters as width 2 and zero-width / combining marks as width 0.
 * Used for CJK-aware line wrapping in the unified scrollback view.
 */
export function measureTerminalCellWidth(value: string) {
  let width = 0;
  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    if (isZeroWidthCodePoint(codePoint)) continue;
    width += isFullWidthCodePoint(codePoint) ? 2 : 1;
  }
  return width;
}

function isZeroWidthCodePoint(codePoint: number) {
  return (
    codePoint === 0 ||
    codePoint === 0xfe0e ||
    codePoint === 0xfe0f ||
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  );
}

function isFullWidthCodePoint(codePoint: number) {
  return (
    codePoint >= 0x1100 &&
    (codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6))
  );
}

export function commitTuiInputHistory(buffer: TuiInputBuffer, submitted: string): TuiInputBuffer {
  const value = submitted.trim();
  if (!value) return buffer;
  const history = buffer.history.at(-1) === value
    ? buffer.history
    : [...buffer.history, value].slice(-100);
  return {
    ...buffer,
    history,
    historyIndex: undefined,
    draftBeforeHistory: ""
  };
}

export function reduceTuiInputBuffer(buffer: TuiInputBuffer, action: TuiInputAction): TuiInputBuffer & { submitted?: string } {
  if (action.type === "insert") {
    const inserted = Array.from(action.value);
    const chars = [
      ...buffer.chars.slice(0, buffer.cursor),
      ...inserted,
      ...buffer.chars.slice(buffer.cursor)
    ];
    return {
      ...buffer,
      chars,
      cursor: buffer.cursor + inserted.length,
      historyIndex: undefined
    };
  }

  if (action.type === "replaceValue") {
    return withValue({
      ...buffer,
      historyIndex: undefined,
      draftBeforeHistory: ""
    }, action.value);
  }

  if (action.type === "backspace") {
    if (buffer.cursor <= 0) return buffer;
    return {
      ...buffer,
      chars: [
        ...buffer.chars.slice(0, buffer.cursor - 1),
        ...buffer.chars.slice(buffer.cursor)
      ],
      cursor: buffer.cursor - 1,
      historyIndex: undefined
    };
  }

  if (action.type === "delete") {
    if (buffer.cursor >= buffer.chars.length) return buffer;
    return {
      ...buffer,
      chars: [
        ...buffer.chars.slice(0, buffer.cursor),
        ...buffer.chars.slice(buffer.cursor + 1)
      ],
      historyIndex: undefined
    };
  }

  if (action.type === "clear") {
    return {
      ...buffer,
      chars: [],
      cursor: 0,
      historyIndex: undefined,
      draftBeforeHistory: ""
    };
  }

  if (action.type === "moveLeft") {
    return { ...buffer, cursor: Math.max(0, buffer.cursor - 1) };
  }

  if (action.type === "moveRight") {
    return { ...buffer, cursor: Math.min(buffer.chars.length, buffer.cursor + 1) };
  }

  if (action.type === "moveHome") {
    return { ...buffer, cursor: 0 };
  }

  if (action.type === "moveEnd") {
    return { ...buffer, cursor: buffer.chars.length };
  }

  if (action.type === "historyPrevious") {
    if (buffer.history.length === 0) return buffer;
    const currentIndex = buffer.historyIndex;
    const nextIndex = currentIndex === undefined
      ? buffer.history.length - 1
      : Math.max(0, currentIndex - 1);
    const draftBeforeHistory = currentIndex === undefined ? renderTuiInputValue(buffer) : buffer.draftBeforeHistory;
    return withValue({
      ...buffer,
      historyIndex: nextIndex,
      draftBeforeHistory
    }, buffer.history[nextIndex]);
  }

  if (action.type === "historyNext") {
    if (buffer.historyIndex === undefined) return buffer;
    const nextIndex = buffer.historyIndex + 1;
    if (nextIndex >= buffer.history.length) {
      return withValue({
        ...buffer,
        historyIndex: undefined,
        draftBeforeHistory: ""
      }, buffer.draftBeforeHistory);
    }
    return withValue({
      ...buffer,
      historyIndex: nextIndex
    }, buffer.history[nextIndex]);
  }

  if (action.type === "submit") {
    const submitted = renderTuiInputValue(buffer).trim();
    return {
      ...buffer,
      chars: [],
      cursor: 0,
      historyIndex: undefined,
      draftBeforeHistory: "",
      ...(submitted ? { submitted } : {})
    };
  }

  return buffer;
}

function withValue(buffer: TuiInputBuffer, value: string): TuiInputBuffer {
  const chars = Array.from(value);
  return {
    ...buffer,
    chars,
    cursor: chars.length
  };
}
