import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTerminalCommandInputParts,
  buildTerminalCommandWrites,
  dispatchTerminalCommandInputParts,
  TERMINAL_COMMAND_PART_DELAY_MS,
  TERMINAL_COMMAND_SUBMIT_DELAY_MS,
  TERMINAL_COMMAND_WRITE_CHUNK_BYTES,
} from './terminalWriteModel';

function utf8Bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function assertChunkedCommandWrites(command: string, lineEnding: string): void {
  const writes = buildTerminalCommandWrites(command, lineEnding);
  assert.equal(writes.at(-1), lineEnding);

  const commandWrites = writes.slice(0, -1);
  assert.ok(commandWrites.length > 1, `expected chunked command writes, got ${JSON.stringify(writes)}`);
  assert.equal(commandWrites.join(''), command);
  for (const chunk of commandWrites) {
    assert.ok(
      utf8Bytes(chunk) <= TERMINAL_COMMAND_WRITE_CHUNK_BYTES,
      `chunk exceeds ${TERMINAL_COMMAND_WRITE_CHUNK_BYTES} bytes: ${chunk} (${utf8Bytes(chunk)} bytes)`,
    );
  }
}

test('buildTerminalCommandWrites separates command text from submit control characters', () => {
  assert.deepEqual(buildTerminalCommandWrites('help', '\r'), ['help', '\r']);
  assert.deepEqual(buildTerminalCommandWrites('node -v', '\r\n'), ['node -v', '\r\n']);
});

test('buildTerminalCommandWrites keeps empty submit-only commands explicit', () => {
  assert.deepEqual(buildTerminalCommandWrites('', '\n'), ['\n']);
});

test('buildTerminalCommandWrites splits long prompts into utf8-safe 20 byte chunks before submit', () => {
  assertChunkedCommandWrites('내일_서울_대전_대구_부산_울산_광주_날씨를_요약해줘', '\r');
});

test('buildTerminalCommandWrites chunks spaced Korean prompts instead of writing the body at once', () => {
  assertChunkedCommandWrites('내일 서울 날씨를 요약해줘', '\r');
});

test('buildTerminalCommandWrites handles punctuation boundary prompts consistently', () => {
  assertChunkedCommandWrites('내일_서울_날씨를_요약해줘..', '\r');
  assertChunkedCommandWrites('내일_서울_날씨를_요약해줘...', '\r');
});

test('dispatchTerminalCommandInputParts sends command chunks through terminal input in order', () => {
  const emitted: string[] = [];
  const pasted: string[] = [];
  const scheduled: Array<{ delay: number; run: () => void }> = [];

  dispatchTerminalCommandInputParts(
    [
      { kind: 'input', data: '내일 서울' },
      { kind: 'input', data: ' 날씨' },
      { kind: 'input', data: '\r' },
    ],
    {
      input: (data) => emitted.push(data),
      paste: (data) => pasted.push(data),
      direct: (data) => emitted.push(`direct:${data}`),
      textInput: (data) => emitted.push(`text:${data}`),
      enterKey: () => emitted.push('enter'),
      setTimeout: (run, delay) => {
        scheduled.push({ run, delay });
      },
    },
  );

  assert.deepEqual(emitted, ['내일 서울']);
  assert.deepEqual(
    scheduled.map((item) => item.delay),
    [TERMINAL_COMMAND_PART_DELAY_MS, TERMINAL_COMMAND_PART_DELAY_MS * 2],
  );

  scheduled[0].run();
  scheduled[1].run();
  assert.deepEqual(emitted, ['내일 서울', ' 날씨', '\r']);
  assert.deepEqual(pasted, []);
});

test('buildTerminalCommandInputParts can route spaced prompts through paste before submit', () => {
  assert.deepEqual(buildTerminalCommandInputParts('내일 서울 날씨를 요약해줘', '\r', 'paste'), [
    { kind: 'paste', data: '내일 서울 날씨를 요약해줘' },
    { kind: 'input', data: '\r', delayBeforeMs: TERMINAL_COMMAND_SUBMIT_DELAY_MS },
  ]);
});

test('buildTerminalCommandInputParts can route spaced prompts through DOM text input events before an enter key', () => {
  assert.deepEqual(buildTerminalCommandInputParts('내일 서울 날씨를 요약해줘', '\r', 'event'), [
    { kind: 'textInput', data: '내' },
    { kind: 'textInput', data: '일' },
    { kind: 'textInput', data: ' ' },
    { kind: 'textInput', data: '서' },
    { kind: 'textInput', data: '울' },
    { kind: 'textInput', data: ' ' },
    { kind: 'textInput', data: '날' },
    { kind: 'textInput', data: '씨' },
    { kind: 'textInput', data: '를' },
    { kind: 'textInput', data: ' ' },
    { kind: 'textInput', data: '요' },
    { kind: 'textInput', data: '약' },
    { kind: 'textInput', data: '해' },
    { kind: 'textInput', data: '줘' },
    { kind: 'enterKey', delayBeforeMs: TERMINAL_COMMAND_SUBMIT_DELAY_MS },
  ]);
});

test('buildTerminalCommandInputParts can route commands directly to the PTY in utf8-safe chunks', () => {
  const parts = buildTerminalCommandInputParts('내일 서울 날씨를 요약해줘', '\r', 'direct');
  const lastPart = parts.at(-1);

  assert.equal(lastPart?.kind, 'direct');
  assert.equal(lastPart?.kind === 'direct' ? lastPart.data : undefined, '\r');
  assert.equal(lastPart?.delayBeforeMs, TERMINAL_COMMAND_SUBMIT_DELAY_MS);
  assert.equal(
    parts.map((part) => (part.kind === 'enterKey' ? '' : part.data)).join(''),
    '내일 서울 날씨를 요약해줘\r',
  );
  for (const part of parts.slice(0, -1)) {
    assert.equal(part.kind, 'direct');
    assert.ok(part.kind === 'direct' && utf8Bytes(part.data) <= TERMINAL_COMMAND_WRITE_CHUNK_BYTES);
  }
});

test('dispatchTerminalCommandInputParts gives submit controls a longer processing gap after text', () => {
  const emitted: string[] = [];
  const scheduled: Array<{ delay: number; run: () => void }> = [];

  dispatchTerminalCommandInputParts(
    [
      { kind: 'textInput', data: '내일 서울 날씨를 요약해줘' },
      { kind: 'enterKey', delayBeforeMs: TERMINAL_COMMAND_SUBMIT_DELAY_MS },
    ],
    {
      input: (data) => emitted.push(`input:${data}`),
      paste: (data) => emitted.push(`paste:${data}`),
      direct: (data) => emitted.push(`direct:${data}`),
      textInput: (data) => emitted.push(`text:${data}`),
      enterKey: () => emitted.push('enter'),
      setTimeout: (run, delay) => {
        scheduled.push({ run, delay });
      },
    },
  );

  assert.deepEqual(emitted, ['text:내일 서울 날씨를 요약해줘']);
  assert.deepEqual(
    scheduled.map((item) => item.delay),
    [TERMINAL_COMMAND_SUBMIT_DELAY_MS],
  );
});

test('dispatchTerminalCommandInputParts supports DOM text input, enter key, and direct write parts', () => {
  const emitted: string[] = [];
  const scheduled: Array<{ delay: number; run: () => void }> = [];

  dispatchTerminalCommandInputParts(
    [{ kind: 'textInput', data: '내일 서울 날씨를 요약해줘' }, { kind: 'enterKey' }, { kind: 'direct', data: '\x03' }],
    {
      input: (data) => emitted.push(`input:${data}`),
      paste: (data) => emitted.push(`paste:${data}`),
      direct: (data) => emitted.push(`direct:${data}`),
      textInput: (data) => emitted.push(`text:${data}`),
      enterKey: () => emitted.push('enter'),
      setTimeout: (run, delay) => {
        scheduled.push({ run, delay });
      },
    },
  );

  assert.deepEqual(emitted, ['text:내일 서울 날씨를 요약해줘']);
  assert.deepEqual(
    scheduled.map((item) => item.delay),
    [TERMINAL_COMMAND_PART_DELAY_MS, TERMINAL_COMMAND_PART_DELAY_MS * 2],
  );

  scheduled[0].run();
  scheduled[1].run();

  assert.deepEqual(emitted, ['text:내일 서울 날씨를 요약해줘', 'enter', 'direct:\x03']);
});
