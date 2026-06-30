import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function collectNodeTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectNodeTestFiles(path)));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.test.ts')) continue;
    const source = await readFile(path, 'utf8');
    if (source.includes('from "vitest"') || source.includes("from 'vitest'")) continue;
    files.push(path);
  }
  return files;
}

const roots = ['src', 'scripts'];
const files = (await Promise.all(roots.map((root) => collectNodeTestFiles(root)))).flat();
if (files.length === 0) {
  console.error(`root-test: no node:test files found under ${roots.join(', ')}`);
  process.exit(1);
}

const child = spawn(process.execPath, ['--import', 'tsx', '--test', ...files], {
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`root-test: terminated by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
