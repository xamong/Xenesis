import assert from 'node:assert/strict';
import test from 'node:test';
import { createVaultIndex } from './vaultIndex';
import { graphFromVaultIndex, localGraphForNote } from './vaultGraph';
import type { VaultFileRecord, VaultRef } from './vaultTypes';

const vault: VaultRef = { id: 'local:D:/Vault', source: 'local', rootPath: 'D:/Vault', displayName: 'Vault' };

function file(path: string, content: string): VaultFileRecord {
  return {
    vaultId: vault.id,
    path,
    absolutePath: `D:/Vault/${path}`,
    content,
  };
}

test('localGraphForNote includes selected note and direct neighbors', () => {
  const index = createVaultIndex(vault, [
    file('Home.md', '# Home\n[[A]]'),
    file('A.md', '# A\n[[B]]'),
    file('B.md', '# B'),
  ]);

  const graph = localGraphForNote(index, 'A.md');

  assert.deepEqual(
    graph.nodes.map((node) => node.id).sort(),
    ['A.md', 'B.md', 'Home.md'],
  );
  assert.equal(graph.nodes.find((node) => node.id === 'A.md')?.isRoot, true);
});

test('graphFromVaultIndex respects tag and unresolved filters', () => {
  const index = createVaultIndex(vault, [
    file('Home.md', '# Home\n\n#ops\n[[Missing]]'),
    file('Dev.md', '# Dev\n\n#dev'),
  ]);

  const opsGraph = graphFromVaultIndex(index, { tag: 'ops' });
  assert.deepEqual(
    opsGraph.nodes.filter((node) => !node.id.startsWith('unresolved:')).map((node) => node.id),
    ['Home.md'],
  );

  const unresolvedGraph = graphFromVaultIndex(index, { issue: 'unresolved' });
  assert.equal(unresolvedGraph.nodes.some((node) => node.type === 'unresolved'), true);
});
