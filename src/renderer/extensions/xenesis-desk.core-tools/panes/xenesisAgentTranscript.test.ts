import assert from 'node:assert/strict';
import test from 'node:test';
import { extractXenesisChoiceOptions, summarizeXenesisTranscriptActivity } from './xenesisAgentTranscript';

test('extractXenesisChoiceOptions ignores internal prompt contract numbered sections', () => {
  const content = [
    'Return sections in this order:',
    '1. Optional short Markdown heading and summary.',
    '2. Optional ```xcon-chain-fixture block when data binding is needed.',
    '3. Optional ```xcon-chain as alias blocks for derived values.',
    '4. Optional ```xcon-demo block for playback metadata.',
    '5. One or more fenced ```xcon-sketch blocks that each start with screen.',
    '',
    'Do a final self-check before responding:',
    '- At least one ```xcon-sketch block exists.',
    '- Every xcon-sketch block begins with a screen declaration.',
    'User request: UI로 보여줘.',
  ].join('\n');

  assert.deepEqual(extractXenesisChoiceOptions(content), []);
});

test('extractXenesisChoiceOptions ignores CLI transport transcripts', () => {
  const content = [
    'PS C:\\Users\\devuser> [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); Get-Content -Raw -LiteralPath prompt.md | codex exec --skip-git-repo-check --sandbox read-only -',
    'Return sections in this order:',
    '1. Optional short Markdown heading and summary.',
    '2. Optional ```xcon-chain-fixture block when data binding is needed.',
    '3. Optional ```xcon-chain as alias blocks for derived values.',
    '__GOWOORI_CLI_OUTPUT_BASE64_BEGIN__',
  ].join('\n');

  assert.deepEqual(extractXenesisChoiceOptions(content), []);
});

test('extractXenesisChoiceOptions reads explicit numbered choices', () => {
  const content = ['선택할 번호를 입력하세요.', '1. 승인', '2. 거절'].join('\n');

  assert.deepEqual(extractXenesisChoiceOptions(content), [
    { index: 1, label: '승인', input: '1' },
    { index: 2, label: '거절', input: '2' },
  ]);
});

test('extractXenesisChoiceOptions does not turn ordinary numbered answers into buttons', () => {
  const content = ['성경을 잘 읽기 위한 몇 가지 팁입니다.', '1. 목적 정하기', '2. 계획 세우기', '3. 노트하기'].join(
    '\n',
  );

  assert.deepEqual(extractXenesisChoiceOptions(content), []);
});

test('summarizeXenesisTranscriptActivity excludes noisy streaming byte entries', () => {
  const summary = summarizeXenesisTranscriptActivity([
    {
      id: 'stream-1',
      at: '2026-06-21T00:00:00.000Z',
      kind: 'artifact_stream',
      summary: 'Codex CLI streaming',
      detail: 'partial',
    },
    {
      id: 'assistant-1',
      at: '2026-06-21T00:00:01.000Z',
      kind: 'assistant_delta',
      summary: 'Assistant streaming',
      detail: 'partial',
    },
    {
      id: 'result-1',
      at: '2026-06-21T00:00:02.000Z',
      kind: 'result',
      summary: 'Run completed',
    },
  ]);

  assert.equal(summary.totalCount, 1);
  assert.equal(summary.items[0]?.kind, 'result');
});

test('summarizeXenesisTranscriptActivity includes turn ledger status entries', () => {
  const summary = summarizeXenesisTranscriptActivity([
    {
      id: 'turn-1',
      at: '2026-06-28T00:00:00.000Z',
      kind: 'turn_ledger',
      summary: 'Desk approval needed',
      detail: JSON.stringify({ status: 'waiting_for_approval', turnId: 'turn-1' }),
    },
    {
      id: 'turn-2',
      at: '2026-06-28T00:00:01.000Z',
      kind: 'turn_ledger',
      summary: 'Run completed',
      detail: JSON.stringify({ status: 'completed', turnId: 'turn-2' }),
    },
  ]);

  assert.equal(summary.totalCount, 2);
  assert.equal(summary.items[0]?.label, 'Turn');
  assert.equal(summary.items[0]?.status, 'waiting');
  assert.equal(summary.items[1]?.label, 'Turn');
  assert.equal(summary.items[1]?.status, 'ok');
});
