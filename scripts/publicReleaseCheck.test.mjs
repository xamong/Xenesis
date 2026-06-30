import assert from 'node:assert/strict';
import test from 'node:test';

import { listPublicMarkdownFiles } from './publicReleaseCheck.mjs';

test('public release markdown scan excludes the repo-local Obsidian knowledge vault', () => {
  assert.equal(
    listPublicMarkdownFiles().some((filePath) => filePath.startsWith('docs/obsidian/')),
    false,
  );
});
