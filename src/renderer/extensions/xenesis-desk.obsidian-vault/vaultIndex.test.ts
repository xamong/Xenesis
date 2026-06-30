import assert from 'node:assert/strict';
import test from 'node:test';
import { createVaultIndex } from './vaultIndex';
import type { VaultFileRecord, VaultRef } from './vaultTypes';

const vault: VaultRef = {
  id: 'local:D:/Vault',
  source: 'local',
  rootPath: 'D:/Vault',
  displayName: 'Vault',
};

function file(path: string, content: string): VaultFileRecord {
  return {
    vaultId: vault.id,
    path,
    absolutePath: `D:/Vault/${path}`,
    content,
    sizeBytes: content.length,
    modifiedAt: 100,
  };
}

test('vault index resolves wikilinks by title, path, basename, and alias', () => {
  const index = createVaultIndex(vault, [
    file('Home.md', '# Home\n\nLinks to [[Folder/API Note]] and [[Preview Alias]].'),
    file('Folder/API Note.md', '---\naliases: [Preview Alias]\ntags: [api]\n---\n# API Note\n\n#runtime'),
  ]);

  assert.equal(index.notes.size, 2);
  assert.equal(index.unresolvedLinks.length, 0);
  assert.equal(index.links.length, 2);
  assert.deepEqual(
    index.links.map((link) => [link.source, link.target, link.label]),
    [
      ['Home.md', 'Folder/API Note.md', 'Folder/API Note'],
      ['Home.md', 'Folder/API Note.md', 'Preview Alias'],
    ],
  );
  assert.deepEqual(index.tags.get('api'), ['Folder/API Note.md']);
  assert.deepEqual(index.tags.get('runtime'), ['Folder/API Note.md']);
});

test('vault index reports unresolved links and orphan notes', () => {
  const index = createVaultIndex(vault, [
    file('Home.md', '# Home\n\n[[Missing]]'),
    file('Archive/Orphan.md', '# Orphan'),
  ]);

  assert.deepEqual(
    index.unresolvedLinks.map((link) => link.rawTarget),
    ['Missing'],
  );
  assert.equal(index.orphanNoteIds.has('Archive/Orphan.md'), true);
});

test('vault index extracts Obsidian and Markdown attachments safely', () => {
  const index = createVaultIndex(vault, [
    file('Home.md', '# Home\n\n![[images/a.png]]\n\n![Chart](assets/chart.svg)\n\n[PDF](files/spec.pdf)'),
  ]);
  const note = index.notes.get('Home.md');
  assert.ok(note);
  assert.deepEqual(
    note.attachments.map((item) => [item.kind, item.target, item.resolvedPath]),
    [
      ['embed', 'images/a.png', 'images/a.png'],
      ['image', 'assets/chart.svg', 'assets/chart.svg'],
      ['file', 'files/spec.pdf', 'files/spec.pdf'],
    ],
  );
});

test('vault index diagnoses duplicate aliases', () => {
  const index = createVaultIndex(vault, [
    file('A.md', '---\naliases: [Same]\n---\n# A'),
    file('B.md', '---\naliases: [Same]\n---\n# B'),
    file('Home.md', '[[Same]]'),
  ]);

  assert.equal(index.unresolvedLinks.length, 1);
  assert.equal(index.diagnostics.some((item) => item.code === 'duplicate-alias'), true);
});
