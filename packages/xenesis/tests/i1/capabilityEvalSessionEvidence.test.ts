import { describe, expect, test } from 'vitest';

import { extractAcceptanceEvidenceFromSessionRecords } from '../../scripts/capability-eval.js';

describe('capability eval session acceptance evidence', () => {
  test('extracts Desk tool, CR path, and readback from session records', () => {
    const evidence = extractAcceptanceEvidenceFromSessionRecords([
      {
        type: 'tool_call',
        toolCall: { id: 'tool-1', name: 'desk_active_context', input: {} },
      },
      {
        type: 'tool_result',
        ok: true,
        message: { role: 'tool', toolCallId: 'tool-1', name: 'desk_active_context', content: '{"ok":true}' },
      },
    ]);

    expect(evidence?.toolCalls).toEqual(['desk_active_context']);
    expect(evidence?.capabilityPaths).toEqual(['xd.context.active']);
    expect(evidence?.readbacks).toEqual(['xd.context.active']);
  });

  test('extracts capability path from generic CR caller without inferring readback from mutation calls', () => {
    const evidence = extractAcceptanceEvidenceFromSessionRecords([
      {
        type: 'tool_call',
        toolCall: {
          id: 'tool-1',
          name: 'desk_call_capability',
          input: { path: 'xd.files.applyTextWrite', args: {} },
        },
      },
      {
        type: 'tool_result',
        ok: true,
        message: { role: 'tool', toolCallId: 'tool-1', name: 'desk_call_capability', content: '{"ok":true}' },
      },
    ]);

    expect(evidence?.toolCalls).toEqual(['desk_call_capability']);
    expect(evidence?.capabilityPaths).toEqual(['xd.files.applyTextWrite']);
    expect(evidence?.readbacks).toEqual([]);
  });

  test('extracts approval request ids as approval records', () => {
    const evidence = extractAcceptanceEvidenceFromSessionRecords([
      {
        type: 'permission_request',
        request: { approvalId: 'approval-1', name: 'desk_call_capability' },
      },
    ]);

    expect(evidence?.approvalRecords).toEqual(['approval-1']);
  });

  test('extracts execution-derived provider and process model from assistant metadata', () => {
    const evidence = extractAcceptanceEvidenceFromSessionRecords([
      {
        type: 'assistant_message',
        message: {
          role: 'assistant',
          content: 'ok',
          providerMetadata: {
            cli: {
              provider: 'codex-cli',
              processModel: 'process-per-turn',
            },
          },
        },
      },
    ]);

    expect(evidence?.provider).toBe('codex-cli');
    expect(evidence?.processModel).toBe('process-per-turn');
  });

  test('extracts non-cli provider evidence from assistant metadata namespaces', () => {
    const evidence = extractAcceptanceEvidenceFromSessionRecords([
      {
        type: 'assistant_message',
        message: {
          role: 'assistant',
          content: 'ok',
          providerMetadata: {
            openai: {
              output: [{ role: 'assistant', content: 'ok' }],
            },
          },
        },
      },
    ]);

    expect(evidence?.provider).toBe('openai');
    expect(evidence?.profileSource).toBe('assistant-provider-metadata');
  });
});
