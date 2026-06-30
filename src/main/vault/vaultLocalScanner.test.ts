import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { scanLocalVault } from './vaultLocalScanner';

async function tempVault(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'xenesis-vault-'));
}

test('scanLocalVault reads Markdown files and skips Obsidian internals', async () => {
  const root = await tempVault();
  await fs.mkdir(path.join(root, 'Notes'), { recursive: true });
  await fs.mkdir(path.join(root, '.obsidian'), { recursive: true });
  await fs.writeFile(path.join(root, 'Home.md'), '# Home');
  await fs.writeFile(path.join(root, 'Notes', 'A.markdown'), '# A');
  await fs.writeFile(path.join(root, '.obsidian', 'workspace.json'), '{}');
  await fs.writeFile(path.join(root, 'image.png'), 'png');

  const result = await scanLocalVault({ rootPath: root });

  assert.equal(result.ok, true);
  assert.deepEqual(result.files.map((file) => file.path).sort(), ['Home.md', 'Notes/A.markdown']);
});

test('scanLocalVault reports oversized Markdown files without reading them', async () => {
  const root = await tempVault();
  await fs.writeFile(path.join(root, 'large.md'), '123456789');

  const result = await scanLocalVault({ rootPath: root, maxFileBytes: 4 });

  assert.equal(result.ok, true);
  assert.equal(result.files.length, 0);
  assert.equal(
    result.warnings.some((warning) => warning.path === 'large.md'),
    true,
  );
});

test('scanLocalVault returns a structured failure for missing roots', async () => {
  const result = await scanLocalVault({ rootPath: path.join(os.tmpdir(), 'missing-xenesis-vault-root') });

  assert.equal(result.ok, false);
  assert.equal(result.files.length, 0);
  assert.match(result.error || '', /ENOENT|no such file|cannot find/i);
});
