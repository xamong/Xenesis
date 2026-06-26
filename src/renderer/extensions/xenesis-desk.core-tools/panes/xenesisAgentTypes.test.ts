import assert from 'node:assert/strict';
import test from 'node:test';
import type { XenesisRunResult } from '../../../../shared/types';
import {
  createXenesisAssistantStreamFilterState,
  extractXenesisAssistantText,
  filterXenesisAssistantStreamDelta,
  resolveXenesisAssistantText,
  sanitizeXenesisAssistantTextCandidate,
} from './xenesisAgentTypes';

test('extractXenesisAssistantText uses doneContent when run output is empty', () => {
  const result = {
    ok: true,
    output: '',
    doneContent: '안녕하세요! 무엇을 도와드릴까요?',
  } as XenesisRunResult & { doneContent: string };

  assert.equal(extractXenesisAssistantText(result), '안녕하세요! 무엇을 도와드릴까요?');
});

test('resolveXenesisAssistantText preserves streamed assistant text when final result has no body', () => {
  const result = {
    ok: true,
    output: '',
  } as XenesisRunResult;

  assert.equal(resolveXenesisAssistantText(result, '스트림으로 받은 응답입니다.'), '스트림으로 받은 응답입니다.');
});

test('extractXenesisAssistantText reads assistant content from SSE data lines', () => {
  const result = {
    ok: true,
    output: [
      'event: assistant_message',
      'data: {"type":"assistant_message","message":{"role":"assistant","content":"안녕하세요! 무엇을 도와드릴까요?"}}',
      '',
      'event: gateway_done',
      'data: {"id":"gateway-run-1","exitCode":0,"errors":""}',
    ].join('\n'),
  } as XenesisRunResult;

  assert.equal(extractXenesisAssistantText(result), '안녕하세요! 무엇을 도와드릴까요?');
});

test('extractXenesisAssistantText reads assistant content from wrapped gateway records', () => {
  const result = {
    ok: true,
    output: JSON.stringify({
      event: 'assistant_message',
      data: {
        type: 'assistant_message',
        message: {
          role: 'assistant',
          content: '감싸진 이벤트 응답입니다.',
        },
      },
    }),
  } as XenesisRunResult;

  assert.equal(extractXenesisAssistantText(result), '감싸진 이벤트 응답입니다.');
});

test('extractXenesisAssistantText reads assistant content from result events when output is empty', () => {
  const result = {
    ok: true,
    output: '',
    events: [
      {
        type: 'assistant_message',
        message: {
          role: 'assistant',
          content: '이벤트 배열 응답입니다.',
        },
      },
    ],
  } as XenesisRunResult;

  assert.equal(extractXenesisAssistantText(result), '이벤트 배열 응답입니다.');
});

test('extractXenesisAssistantText reads doneContent from JSON done record', () => {
  const result = {
    ok: true,
    output: JSON.stringify({
      type: 'done',
      doneContent: 'JSON 완료 레코드 응답입니다.',
    }),
  } as XenesisRunResult;

  assert.equal(extractXenesisAssistantText(result), 'JSON 완료 레코드 응답입니다.');
});

test('extractXenesisAssistantText reads assistant content from result messages fallback', () => {
  const result = {
    ok: true,
    output: '',
    messages: [
      {
        role: 'user',
        content: '안녕',
      },
      {
        role: 'assistant',
        content: '메시지 배열의 최종 응답입니다.',
      },
    ],
  } as XenesisRunResult & { messages: unknown[] };

  assert.equal(extractXenesisAssistantText(result), '메시지 배열의 최종 응답입니다.');
});

test('extractXenesisAssistantText reads assistant content from nested result payload records', () => {
  const result = {
    ok: true,
    output: JSON.stringify({
      type: 'gateway_done',
      payload: {
        result: {
          ok: true,
          output: '',
          messages: [
            {
              role: 'assistant',
              content: [
                {
                  type: 'text',
                  text: 'payload.result 메시지 응답입니다.',
                },
              ],
            },
          ],
        },
      },
    }),
  } as XenesisRunResult;

  assert.equal(extractXenesisAssistantText(result), 'payload.result 메시지 응답입니다.');
});

test('resolveXenesisAssistantText ignores ansi-only output and falls back to done content', () => {
  const result = {
    ok: true,
    output: '\u001b[?25h\u001b[0m',
    doneContent: 'ANSI 출력 뒤의 실제 응답입니다.',
  } as XenesisRunResult & { doneContent: string };

  assert.equal(resolveXenesisAssistantText(result), 'ANSI 출력 뒤의 실제 응답입니다.');
});

test('extractXenesisAssistantText reads top-level content when command output is empty', () => {
  const result = {
    ok: true,
    output: '',
    content: '최상위 content 필드의 응답입니다.',
  } as XenesisRunResult & { content: string };

  assert.equal(extractXenesisAssistantText(result), '최상위 content 필드의 응답입니다.');
});

test('extractXenesisAssistantText reads top-level text when command output is empty', () => {
  const result = {
    ok: true,
    output: '',
    text: '최상위 text 필드의 응답입니다.',
  } as XenesisRunResult & { text: string };

  assert.equal(extractXenesisAssistantText(result), '최상위 text 필드의 응답입니다.');
});

test('resolveXenesisAssistantText decodes marked CLI output instead of showing transport transcript', () => {
  const actualAssistantText = '### Gowoori 응답\n\n```xcon-sketch\nscreen "Hello" 320x180 bg #ffffff\n```';
  const encoded = Buffer.from(actualAssistantText, 'utf8').toString('base64');
  const result = {
    ok: true,
    output: [
      "PS C:\\Users\\devuser> [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); Get-Content -Raw -Encoding UTF8 -LiteralPath 'prompt.md' | codex exec --skip-git-repo-check --sandbox read-only -",
      'OpenAI Codex v0.139.0',
      'GOWOORI_CLI_OUTPUT_BASE64_BEGIN',
      encoded.slice(0, 40),
      encoded.slice(40),
      'GOWOORI_CLI_OUTPUT_BASE64_END',
    ].join('\n'),
  } as XenesisRunResult;

  assert.equal(resolveXenesisAssistantText(result), actualAssistantText);
});

test('resolveXenesisAssistantText ignores CLI transport output and preserves streamed assistant text', () => {
  const result = {
    ok: true,
    output: [
      "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); Get-Content -Raw -Encoding UTF8 -LiteralPath 'prompt.md' | codex exec --ignore-user-config --output-last-message last-message.md --skip-git-repo-check --sandbox read-only -",
      'OpenAI Codex v0.139.0',
      'workdir: C:\\Users\\devuser\\.xenis-dev\\onboarding\\basic-desk',
      'approval: never',
      'sandbox: read-only',
      'session id: 019eb27c-21a0-7f73-a2ef-d3ae5e24f10b',
    ].join('\n'),
  } as XenesisRunResult;

  assert.equal(resolveXenesisAssistantText(result, '실제 스트리밍 응답입니다.'), '실제 스트리밍 응답입니다.');
});

test('sanitizeXenesisAssistantTextCandidate ignores internal XCON generation prompt fragments', () => {
  const promptFragment = [
    'Return sections in this order:',
    '  1. Optional short Markdown heading and summary.',
    '  2. Optional ```xcon-chain-fixture block when data binding is needed.',
    '  3. Optional ```xcon-chain as alias blocks for derived values.',
    '  4. Optional ```xcon-demo block for playback metadata.',
    '  5. One or more fenced ```xcon-sketch blocks that each start with screen.',
    '\u001b[29;120HMarkdown and SKETCH. Do not use {{...}} inside xcon-sketch.',
    'Do a final self-check before responding:',
    '- At least one ```xcon-sketch block exists.',
    '- Every xcon-sketch block begins with a screen declaration.',
    'User request: The user is making a follow-up artifact conversion request inside Xenesis Agent.',
    'Generate a new Markdown + XCON/SKETCH artifact that visualizes the previous assistant answer.',
  ].join('\n');

  assert.equal(sanitizeXenesisAssistantTextCandidate(promptFragment), '');
});

test('resolveXenesisAssistantText does not replace streamed text with internal prompt output', () => {
  const result = {
    ok: true,
    output: [
      'MCP prompt pack excerpts:',
      '## MCP prompt pack: 00-shared-xcon-contract.md',
      'Return sections in this order:',
      '1. Optional short Markdown heading and summary.',
      '2. Optional ```xcon-chain-fixture block when data binding is needed.',
      'Do a final self-check before responding:',
      'User request: UI로 보여줘.',
    ].join('\n'),
  } as XenesisRunResult;

  assert.equal(
    resolveXenesisAssistantText(result, '이미 스트리밍된 정상 응답입니다.'),
    '이미 스트리밍된 정상 응답입니다.',
  );
});

test('filterXenesisAssistantStreamDelta holds fragmented CLI transcript until marked final output', () => {
  const state = createXenesisAssistantStreamFilterState();
  const assistantText = '안녕하세요! 무엇을 도와드릴까요?';
  const encoded = Buffer.from(assistantText, 'utf8').toString('base64');
  const chunks = [
    'PS C:\\Users\\devuser> [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); ',
    "Get-Content -Raw -Encoding UTF8 -LiteralPath 'prompt.md' | codex exec --skip-git-repo-check --sandbox read-only -\n",
    'OpenAI Codex v0.139.0\nworkdir: C:\\Users\\devuser\\.xenis-dev\\onboarding\\basic-desk\n',
    'GOWOORI_CLI_OUTPUT_BASE64_BEGIN\n',
    encoded.slice(0, 24),
    `${encoded.slice(24)}\nGOWOORI_CLI_OUTPUT_BASE64_END\n`,
  ];

  const deltas = chunks.map((chunk) => filterXenesisAssistantStreamDelta(state, chunk).delta).filter(Boolean);

  assert.deepEqual(deltas, [assistantText]);
});

test('filterXenesisAssistantStreamDelta suppresses decorated CLI command fragments before run headers', () => {
  const state = createXenesisAssistantStreamFilterState();
  const first = [
    '\u001b]1337;CurrentDir=C:\\Users\\devuser\\.xenis-dev\\onboarding\\basic-desk\u0007',
    '\u001b[92mOutputEncoding\u001b[38;5;238m=\u001b[0m[System.Text.UTF8Encoding]::new(false);',
    'Get – Content – Raw – EncodingUTF8 – LiteralPath ',
    "'C:\\Users\\devuser\\.xenis-dev\\onboarding\\basic-desk\\.xenis-gowoori-prompts\\gowoori-cli-codex-1.md'|codexexec ",
    '--ignore-user-config --colornever --output-last-message last-message.md --skip-git-repo-check --sandboxread-only -;',
  ].join('');

  const firstResult = filterXenesisAssistantStreamDelta(state, first);
  const secondResult = filterXenesisAssistantStreamDelta(
    state,
    'OpenAI Codex v0.139.0\nworkdir: C:\\Users\\devuser\\.xenis-dev\\onboarding\\basic-desk\n',
  );

  assert.equal(firstResult.delta, '');
  assert.equal(firstResult.suppressed, true);
  assert.equal(secondResult.delta, '');
  assert.equal(secondResult.suppressed, true);
});

test('filterXenesisAssistantStreamDelta suppresses internal prompt fragments before chat rendering', () => {
  const state = createXenesisAssistantStreamFilterState();
  const chunks = [
    'Return sections in this order:\n',
    '1. Optional short Markdown heading and summary.\n',
    '2. Optional ```xcon-chain-fixture block when data binding is needed.\n',
    'Do a final self-check before responding:\n',
    'User request: UI로 보여줘.\n',
  ];

  const deltas = chunks.map((chunk) => filterXenesisAssistantStreamDelta(state, chunk).delta).filter(Boolean);

  assert.deepEqual(deltas, []);
});

test('sanitizeXenesisAssistantTextCandidate ignores automatic repair prompt fragments', () => {
  const promptFragment = [
    '[Automatic Gowoori repair request]',
    'Return a corrected Markdown + XCON/SKETCH artifact.',
    'Original user request: 이번주 날씨 정리해줘.',
    'Validation diagnostics:',
    'error: xcon-sketch block 1 text component "titleLbl" uses low contrast color white on #f0f4f8.',
    'Broken artifact:',
    '```xcon-sketch',
    'screen "Broken" 400x200 bg #f0f4f8',
  ].join('\n');

  assert.equal(sanitizeXenesisAssistantTextCandidate(promptFragment), '');
});

test('filterXenesisAssistantStreamDelta releases normal assistant prose progressively', () => {
  const state = createXenesisAssistantStreamFilterState();
  const first = filterXenesisAssistantStreamDelta(state, '안녕하세요! 무엇을 도와드릴까요?\n').delta;
  const second = filterXenesisAssistantStreamDelta(state, '필요한 내용을 편하게 말씀해 주세요.').delta;

  assert.equal(first, '안녕하세요! 무엇을 도와드릴까요?\n');
  assert.equal(second, '필요한 내용을 편하게 말씀해 주세요.');
});
