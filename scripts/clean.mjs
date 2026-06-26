import fs from 'node:fs/promises';

for (const target of ['out', 'dist', 'release']) {
  await fs.rm(target, { recursive: true, force: true });
}

console.log('Removed out, dist, release.');
