import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { listPublicDocsSafetyFiles } from './checkDocsPublicSafety.mjs';

test('public docs safety scan excludes the repo-local Obsidian knowledge vault', () => {
  const relativeFiles = listPublicDocsSafetyFiles().map((filePath) =>
    path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
  );

  assert.equal(
    relativeFiles.some((filePath) => filePath.startsWith('docs/obsidian/')),
    false,
  );
});
