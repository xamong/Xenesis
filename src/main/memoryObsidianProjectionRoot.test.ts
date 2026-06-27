import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { resolveExistingRepoRootForObsidianProjection } from './memoryObsidianProjectionRoot';

test('resolves only candidates that already contain the repo-local Obsidian vault', () => {
  const validRoot = path.resolve('E:/repo');
  const result = resolveExistingRepoRootForObsidianProjection(
    [path.resolve('E:/missing'), validRoot],
    (candidate) => candidate === path.join(validRoot, 'docs', 'obsidian', 'Xenesis-desk'),
  );

  assert.equal(result, validRoot);
});

test('fails closed when the repo-local Obsidian vault cannot be found', () => {
  assert.throws(
    () => resolveExistingRepoRootForObsidianProjection([path.resolve('E:/missing')], () => false),
    /repo-local docs[\\/]obsidian[\\/]Xenesis-desk/i,
  );
});
