import fs from 'node:fs';

export interface JsonlReadResult {
  records: Record<string, unknown>[];
  skipped: number;
}

export async function readJsonlTail(filePath: string, maxBytes = 256 * 1024): Promise<JsonlReadResult> {
  let buffer: Buffer;
  let start = 0;
  try {
    const stat = await fs.promises.stat(filePath);
    start = Math.max(0, stat.size - maxBytes);
    const handle = await fs.promises.open(filePath, 'r');
    try {
      buffer = Buffer.alloc(stat.size - start);
      await handle.read(buffer, 0, buffer.length, start);
    } finally {
      await handle.close();
    }
  } catch {
    return { records: [], skipped: 0 };
  }

  let text = buffer.toString('utf8');
  if (start > 0) {
    const newlineIndex = text.search(/\r?\n/);
    if (newlineIndex < 0) return { records: [], skipped: 0 };
    const newlineLength = text[newlineIndex] === '\r' && text[newlineIndex + 1] === '\n' ? 2 : 1;
    text = text.slice(newlineIndex + newlineLength);
  }

  const records: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        records.push(parsed as Record<string, unknown>);
      } else {
        skipped += 1;
      }
    } catch {
      skipped += 1;
    }
  }
  return { records, skipped };
}
