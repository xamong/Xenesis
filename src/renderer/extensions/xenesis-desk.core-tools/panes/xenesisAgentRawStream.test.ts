import assert from 'node:assert/strict';
import test from 'node:test';
import { appendRawStreamEntryToList, mergeRawStreamEntryToList } from './xenesisAgentRawStream';

test('mergeRawStreamEntryToList coalesces artifact stream chunks into one newest entry', () => {
  let entries = appendRawStreamEntryToList(
    [],
    {
      kind: 'status',
      summary: 'Ready',
    },
    {
      createId: () => 'status-1',
      nowIso: () => '2026-06-19T00:00:00.000Z',
    },
  );

  entries = mergeRawStreamEntryToList(
    entries,
    {
      mergeKey: 'artifact:codex',
      kind: 'artifact_stream',
      summary: 'Codex CLI streaming',
      detailDelta: 'hello ',
      chunkCount: 1,
      bytesReceived: 6,
    },
    {
      createId: () => 'stream-1',
      nowIso: () => '2026-06-19T00:00:01.000Z',
    },
  );

  entries = mergeRawStreamEntryToList(
    entries,
    {
      mergeKey: 'artifact:codex',
      kind: 'artifact_stream',
      summary: 'Codex CLI streaming',
      detailDelta: 'world',
      chunkCount: 2,
      bytesReceived: 11,
    },
    {
      createId: () => 'stream-2',
      nowIso: () => '2026-06-19T00:00:02.000Z',
    },
  );

  assert.equal(entries.length, 2);
  assert.ok(entries[0].id.startsWith('stream-1:artifact:codex'));
  assert.equal(entries[0].kind, 'artifact_stream');
  assert.equal(entries[0].summary, 'Codex CLI streaming · 11 chars received · 2 chunks');
  assert.equal(entries[0].detail, 'hello world');
  assert.equal(entries[1].summary, 'Ready');
});
