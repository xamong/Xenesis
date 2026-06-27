import fs from 'node:fs';
import path from 'node:path';

export function resolveExistingRepoRootForObsidianProjection(
  candidates: readonly string[],
  existsSync: (candidate: string) => boolean = fs.existsSync,
): string {
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (existsSync(path.join(resolved, 'docs', 'obsidian', 'Xenesis-desk'))) return resolved;
  }
  throw new Error('Memory Obsidian projection requires an existing repo-local docs/obsidian/Xenesis-desk vault');
}
