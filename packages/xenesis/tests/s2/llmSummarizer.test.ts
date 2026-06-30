import { describe, expect, it } from 'vitest';
import {
  buildSummarizationMessages,
  createLlmSummarizer,
  SUMMARIZER_MIN_CONTEXT,
} from '../../src/core/context/compaction/llmSummarizer.js';
import type { AgentMessage } from '../../src/core/messages.js';

const older: AgentMessage[] = [
  { role: 'user', content: 'build a parser' },
  { role: 'assistant', content: 'starting' },
];

describe('buildSummarizationMessages', () => {
  it('uses the first-pass prompt and wraps the conversation when no previous summary', () => {
    const msgs = buildSummarizationMessages(older);
    const text = msgs.map((m) => (m as any).content).join('\n');
    expect(text).toContain('<conversation>');
    expect(text).toContain('Key Decisions');
    expect(text).not.toContain('<previous-summary>');
  });

  it('uses the UPDATE prompt and includes the previous summary when present', () => {
    const msgs = buildSummarizationMessages(older, 'PRIOR SUMMARY');
    const text = msgs.map((m) => (m as any).content).join('\n');
    expect(text).toContain('<previous-summary>');
    expect(text).toContain('PRIOR SUMMARY');
  });
});

describe('createLlmSummarizer', () => {
  it('calls complete with the built messages + maxTokens and returns its text', async () => {
    let seenMax = 0;
    let seenLen = 0;
    const summarize = createLlmSummarizer({
      complete: async (messages, maxTokens) => {
        seenMax = maxTokens;
        seenLen = messages.length;
        return 'LLM SUMMARY';
      },
      maxTokens: 4096,
    });
    const out = await summarize(older);
    expect(out).toBe('LLM SUMMARY');
    expect(seenMax).toBe(4096);
    expect(seenLen).toBeGreaterThan(0);
  });

  it('exports a sane min-context floor', () => {
    expect(SUMMARIZER_MIN_CONTEXT).toBe(64_000);
  });
});
