import assert from 'node:assert/strict';
import test from 'node:test';

import { buildXenesisMarkdownSaveDraft, resolveXenesisMarkdownSavePath } from './xenesisAgentMarkdownSave';
import type { XenesisChatMessage } from './xenesisAgentTypes';

function message(id: string, role: XenesisChatMessage['role'], content: string): XenesisChatMessage {
  return {
    id,
    role,
    content,
    at: `2026-06-19T00:00:0${id.replace(/\D/g, '') || '0'}Z`,
  };
}

test('builds a markdown save draft from the recent conversation without xcon fences', () => {
  const messages: XenesisChatMessage[] = [
    message(
      'a2',
      'assistant',
      [
        '## 개발 단계 정리',
        '',
        '1. 요구사항 정의',
        '2. 화면 설계',
        '',
        '```xcon-sketch',
        'screen "demo" 100x100',
        '```',
      ].join('\n'),
    ),
    message('u1', 'user', '개발 단계를 정리해서 markdown 파일로 만들어줘'),
  ];

  const draft = buildXenesisMarkdownSaveDraft({
    messages,
    requestText: '파일로 저장해',
    now: new Date('2026-06-19T08:30:00.000Z'),
  });

  assert.match(draft.content, /# Xenesis Agent Markdown Export/);
  assert.match(draft.content, /개발 단계 정리/);
  assert.match(draft.content, /요구사항 정의/);
  assert.doesNotMatch(draft.content, /```xcon-sketch/);
  assert.equal(draft.fileName, 'xenesis-agent-markdown-20260619-083000.md');
});

test('resolves markdown save path under the active workspace exports folder', () => {
  assert.equal(resolveXenesisMarkdownSavePath('D:\\Work\\Project', 'note.md'), 'D:\\Work\\Project\\exports\\note.md');
});
