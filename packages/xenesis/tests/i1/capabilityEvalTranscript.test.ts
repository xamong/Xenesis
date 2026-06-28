import { describe, expect, test } from 'vitest';
import {
  extractCapabilityTranscriptTextFromSessionRecords,
  parseCapabilityTranscript,
} from '../../src/evaluation/capabilityEval.js';

describe('capability eval transcript parsing', () => {
  test('counts Codex CLI MCP read wrapper starts as Desk tool calls', () => {
    const transcript = parseCapabilityTranscript(
      [
        'mcp: xenesis_dev/xenesis_desk_active_context started',
        'mcp: xenesis_dev/xenesis_desk_active_context (completed)',
        '현재 선택된 파일은 capability-note.md입니다.',
      ].join('\n'),
    );

    expect(transcript.toolCalls).toEqual(['desk_active_context']);
  });

  test('extracts MCP transcript lines from provider metadata in session records', () => {
    const text = extractCapabilityTranscriptTextFromSessionRecords([
      {
        type: 'assistant_message',
        message: {
          role: 'assistant',
          content: '현재 활성 패널은 Capability Note입니다.',
          providerMetadata: {
            cli: {
              stderr: [
                'OpenAI Codex v0.142.3',
                'mcp: xenesis_dev/xenesis_desk_active_context started',
                'mcp: xenesis_dev/xenesis_desk_active_context (completed)',
                'mcp: xenesis_dev/xenesis_desk_state started',
              ].join('\n'),
            },
          },
        },
      },
    ]);

    expect(text).toBe(
      ['mcp: xenesis_dev/xenesis_desk_active_context started', 'mcp: xenesis_dev/xenesis_desk_state started'].join(
        '\n',
      ),
    );
  });
});
