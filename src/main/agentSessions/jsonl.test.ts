import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readJsonlTail } from './jsonl';

async function withTempDir<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'xd-agent-jsonl-'));
  try {
    return await fn(root);
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
}

test('readJsonlTail returns empty records for a missing file', async () => {
  const result = await readJsonlTail(path.join(os.tmpdir(), 'missing-agent-session.jsonl'));

  assert.deepEqual(result, { records: [], skipped: 0 });
});

test('readJsonlTail parses object records and counts malformed records', async () => {
  await withTempDir(async (root) => {
    const filePath = path.join(root, 'session.jsonl');
    await fs.promises.writeFile(
      filePath,
      [
        JSON.stringify({ id: 'a', role: 'user' }),
        '{bad json}',
        JSON.stringify(['not', 'an', 'object']),
        JSON.stringify({ id: 'b', role: 'assistant' }),
      ].join('\n'),
      'utf8',
    );

    const result = await readJsonlTail(filePath);

    assert.deepEqual(
      result.records.map((record) => record.id),
      ['a', 'b'],
    );
    assert.equal(result.skipped, 2);
  });
});

test('readJsonlTail drops a partial first line when reading a byte tail', async () => {
  await withTempDir(async (root) => {
    const filePath = path.join(root, 'tail.jsonl');
    const secondLine = JSON.stringify({ id: 'b', role: 'user' });
    await fs.promises.writeFile(
      filePath,
      [JSON.stringify({ id: 'a', padding: 'x'.repeat(160) }), secondLine].join('\n'),
      'utf8',
    );

    const result = await readJsonlTail(filePath, Buffer.byteLength(secondLine, 'utf8') + 8);

    assert.deepEqual(
      result.records.map((record) => record.id),
      ['b'],
    );
    assert.equal(result.skipped, 0);
  });
});
