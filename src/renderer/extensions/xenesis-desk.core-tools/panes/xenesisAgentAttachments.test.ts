import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildXenesisAttachmentPromptContext,
  classifyXenesisAttachment,
  dedupeXenesisAttachments,
  formatXenesisAttachmentSize,
  toXenesisProviderAttachments,
  type XenesisAgentAttachment,
} from './xenesisAgentAttachments';

test('classifies image attachments by mime type or extension', () => {
  assert.equal(classifyXenesisAttachment({ name: 'diagram.png', type: 'image/png' }), 'image');
  assert.equal(classifyXenesisAttachment({ name: 'capture.WEBP', type: '' }), 'image');
  assert.equal(classifyXenesisAttachment({ name: 'notes.md', type: 'text/markdown' }), 'file');
});

test('formats attachment sizes for compact chips and prompt context', () => {
  assert.equal(formatXenesisAttachmentSize(0), '0 B');
  assert.equal(formatXenesisAttachmentSize(1023), '1023 B');
  assert.equal(formatXenesisAttachmentSize(1536), '1.5 KB');
  assert.equal(formatXenesisAttachmentSize(3 * 1024 * 1024), '3 MB');
});

test('builds a provider-safe prompt context without embedding image data urls', () => {
  const attachments: XenesisAgentAttachment[] = [
    {
      id: 'att-1',
      kind: 'image',
      name: 'screen.png',
      type: 'image/png',
      size: 2400,
      path: 'C:\\tmp\\screen.png',
      dataUrl: 'data:image/png;base64,abc',
    },
    {
      id: 'att-2',
      kind: 'file',
      name: 'notes.md',
      type: 'text/markdown',
      size: 48,
      path: 'C:\\tmp\\notes.md',
      previewText: '# Notes\nUse this context.',
    },
  ];

  const context = buildXenesisAttachmentPromptContext(attachments);

  assert.match(context, /Attached files:/);
  assert.match(context, /\[image\] screen\.png \(image\/png, 2\.3 KB\)/);
  assert.match(context, /path: C:\\tmp\\screen\.png/);
  assert.match(context, /\[file\] notes\.md \(text\/markdown, 48 B\)/);
  assert.match(context, /preview:\n# Notes\nUse this context\./);
  assert.doesNotMatch(context, /data:image\/png/);
});

test('deduplicates attachments by path and stable file metadata', () => {
  const existing: XenesisAgentAttachment[] = [
    { id: 'a', kind: 'file', name: 'same.txt', size: 10, path: 'C:\\tmp\\same.txt', lastModified: 1 },
  ];
  const incoming: XenesisAgentAttachment[] = [
    { id: 'b', kind: 'file', name: 'same.txt', size: 10, path: 'C:\\tmp\\same.txt', lastModified: 1 },
    { id: 'c', kind: 'file', name: 'other.txt', size: 10, lastModified: 1 },
    { id: 'd', kind: 'file', name: 'other.txt', size: 10, lastModified: 1 },
  ];

  const result = dedupeXenesisAttachments(existing, incoming);

  assert.deepEqual(
    result.map((item) => item.id),
    ['a', 'c'],
  );
});

test('converts UI attachments into provider request attachments', () => {
  const attachments: XenesisAgentAttachment[] = [
    {
      id: 'att-image',
      kind: 'image',
      name: 'dashboard.png',
      type: 'image/png',
      size: 2048,
      path: 'C:\\tmp\\dashboard.png',
      dataUrl: 'data:image/png;base64,abc',
    },
    {
      id: 'att-file',
      kind: 'file',
      name: 'brief.md',
      type: 'text/markdown',
      size: 32,
      path: 'C:\\tmp\\brief.md',
      previewText: '# Brief\nUse this data.',
    },
  ];

  assert.deepEqual(toXenesisProviderAttachments(attachments), [
    {
      kind: 'image',
      name: 'dashboard.png',
      mimeType: 'image/png',
      size: 2048,
      path: 'C:\\tmp\\dashboard.png',
      dataUrl: 'data:image/png;base64,abc',
    },
    {
      kind: 'file',
      name: 'brief.md',
      mimeType: 'text/markdown',
      size: 32,
      path: 'C:\\tmp\\brief.md',
      text: '# Brief\nUse this data.',
    },
  ]);
});
