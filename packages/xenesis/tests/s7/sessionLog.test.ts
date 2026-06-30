import { appendFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSessionLog } from '../../src/sessions/history.js';
import { JsonlSessionWriter } from '../../src/sessions/JsonlSessionWriter.js';

async function home() {
  return await mkdtemp(join(tmpdir(), 's7-'));
}

describe('envelope seq', () => {
  it('writes a monotonic seq starting at initialSeq', async () => {
    const h = await home();
    const w = new JsonlSessionWriter({ xenesisHome: h, workspaceRoot: h, sessionId: 'sess', initialSeq: 5 });
    await w.write({ type: 'user_message', message: { role: 'user', content: 'a' } } as any);
    await w.write({ type: 'assistant_message', message: { role: 'assistant', content: 'b' } } as any);
    const recs = await readSessionLog(h, 'sess');
    expect((recs[0] as any).seq).toBe(5);
    expect((recs[1] as any).seq).toBe(6);
  });
});

describe('readSessionLog truncation tolerance', () => {
  it('skips a truncated trailing line instead of throwing', async () => {
    const h = await home();
    const dir = resolve(h, 'sessions');
    await mkdir(dir, { recursive: true });
    const path = resolve(dir, 'sess.jsonl');
    await writeFile(
      path,
      JSON.stringify({
        type: 'user_message',
        sessionId: 'sess',
        timestamp: 't',
        message: { role: 'user', content: 'ok' },
      }) + '\n',
      'utf8',
    );
    await appendFile(
      path,
      '{"type":"assistant_message","sessionId":"sess","timestamp":"t","message":{"role":"assist',
      'utf8',
    ); // truncated, no newline
    const recs = await readSessionLog(h, 'sess');
    expect(recs).toHaveLength(1);
    expect(recs[0].type).toBe('user_message');
  });
});
