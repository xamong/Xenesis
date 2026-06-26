import assert from 'node:assert/strict';
import test from 'node:test';
import type { XenesisRunEvent } from '../../../../shared/types';
import {
  extractAssistantDeltaFromRunEvent,
  extractAssistantTextFromRunEvent,
  summarizeXenesisRunEvent,
  terminalMessageFromRunEventSummary,
} from './xenesisAgentRunEvents';

test('extractAssistantTextFromRunEvent reads assistant_message event content', () => {
  const event: XenesisRunEvent = {
    event: 'assistant_message',
    data: {
      type: 'assistant_message',
      message: {
        role: 'assistant',
        content: '안녕하세요! 무엇을 도와드릴까요?',
      },
    },
  };

  assert.equal(extractAssistantTextFromRunEvent(event), '안녕하세요! 무엇을 도와드릴까요?');
});

test('extractAssistantTextFromRunEvent reads done event content', () => {
  const event: XenesisRunEvent = {
    event: 'done',
    data: {
      type: 'done',
      content: '최종 응답입니다.',
    },
  };

  assert.equal(extractAssistantTextFromRunEvent(event), '최종 응답입니다.');
});

test('extractAssistantTextFromRunEvent reads wrapped assistant message event content', () => {
  const event: XenesisRunEvent = {
    event: 'message',
    data: {
      event: 'assistant_message',
      data: {
        type: 'assistant_message',
        message: {
          role: 'assistant',
          content: '중첩 이벤트 응답입니다.',
        },
      },
    },
  };

  assert.equal(extractAssistantTextFromRunEvent(event), '중첩 이벤트 응답입니다.');
});

test('extractAssistantTextFromRunEvent reads gateway_done result content', () => {
  const event: XenesisRunEvent = {
    event: 'gateway_done',
    data: {
      ok: true,
      output: '',
      events: [
        {
          type: 'assistant_message',
          message: {
            role: 'assistant',
            content: '완료 이벤트의 응답입니다.',
          },
        },
      ],
    },
  };

  assert.equal(extractAssistantTextFromRunEvent(event), '완료 이벤트의 응답입니다.');
});

test('extractAssistantTextFromRunEvent reads gateway_done wrapped result messages', () => {
  const event: XenesisRunEvent = {
    event: 'gateway_done',
    data: {
      event: 'gateway_done',
      data: {
        result: {
          ok: true,
          output: '',
          messages: [
            {
              role: 'assistant',
              content: '중첩 완료 결과의 메시지 응답입니다.',
            },
          ],
        },
      },
    },
  };

  assert.equal(extractAssistantTextFromRunEvent(event), '중첩 완료 결과의 메시지 응답입니다.');
});

test('extractAssistantDeltaFromRunEvent reads nested provider delta text', () => {
  const event: XenesisRunEvent = {
    event: 'message',
    data: {
      event: 'response.output_text.delta',
      data: {
        type: 'response.output_text.delta',
        delta: '실시간 ',
      },
    },
  };

  assert.equal(extractAssistantDeltaFromRunEvent(event), '실시간 ');
  assert.equal(extractAssistantTextFromRunEvent(event), '실시간 ');
});

test('extractAssistantDeltaFromRunEvent reads Anthropic content block deltas', () => {
  const event: XenesisRunEvent = {
    event: 'content_block_delta',
    data: {
      type: 'content_block_delta',
      delta: {
        text: '응답',
      },
    },
  };

  assert.equal(extractAssistantDeltaFromRunEvent(event), '응답');
  assert.equal(extractAssistantTextFromRunEvent(event), '응답');
});

test('extractAssistantDeltaFromRunEvent ignores CLI transport chunks', () => {
  const event: XenesisRunEvent = {
    event: 'response.output_text.delta',
    data: {
      type: 'response.output_text.delta',
      delta: [
        "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); Get-Content -Raw -Encoding UTF8 -LiteralPath 'prompt.md' | codex exec --ignore-user-config --output-last-message last-message.md --skip-git-repo-check --sandbox read-only -",
        'OpenAI Codex v0.139.0',
        'GOWOORI_CLI_OUTPUT_BASE64_BEGIN',
      ].join('\n'),
    },
  };

  assert.equal(extractAssistantDeltaFromRunEvent(event), '');
  assert.equal(extractAssistantTextFromRunEvent(event), '');
});

test('extractAssistantDeltaFromRunEvent ignores internal prompt contract chunks', () => {
  const event: XenesisRunEvent = {
    event: 'response.output_text.delta',
    data: {
      type: 'response.output_text.delta',
      delta: [
        'Return sections in this order:',
        '1. Optional short Markdown heading and summary.',
        '2. Optional ```xcon-chain-fixture block when data binding is needed.',
        'Do a final self-check before responding:',
        'User request: UI로 보여줘.',
        'Generate a new Markdown + XCON/SKETCH artifact.',
      ].join('\n'),
    },
  };

  assert.equal(extractAssistantDeltaFromRunEvent(event), '');
  assert.equal(extractAssistantTextFromRunEvent(event), '');
});

test('summarizeXenesisRunEvent treats provider repair request as progress', () => {
  const event: XenesisRunEvent = {
    event: 'run_state',
    data: {
      type: 'run_state',
      status: 'provider_request',
      summary: 'requesting repair after failed app_readiness',
    },
  };

  const summary = summarizeXenesisRunEvent(event);
  assert.equal(summary.kind, 'provider_progress');
  assert.equal(summary.error, false);

  const message = terminalMessageFromRunEventSummary(summary);
  assert.equal(message, null);
});
