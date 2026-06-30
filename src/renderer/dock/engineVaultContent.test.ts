import assert from 'node:assert/strict';
import test from 'node:test';
import { DockEngine } from './engine';
import type { ObsidianVaultContentState } from '../../shared/types';

const vaultState: ObsidianVaultContentState = {
  vaultRootPath: 'D:/Vault',
  selectedNoteId: 'Home.md',
  query: 'api',
  tag: 'runtime',
  issue: 'unresolved',
  graphScope: 'local',
  panelSizes: { sidebar: 310, inspector: 390, graph: 420 },
};

test('DockEngine saves and restores Obsidian vault content state', () => {
  const engine = new DockEngine(() => {});

  engine.addContent({
    id: 'vault-1',
    title: 'Vault: Notes',
    state: 'document',
    html: '',
    contentType: 'obsidian-vault',
    obsidianVault: vaultState,
  });

  const saved = engine.saveLayout(null);
  assert.deepEqual(saved.contents.find((content) => content.id === 'vault-1')?.obsidianVault, vaultState);

  const restored = new DockEngine(() => {});
  restored.restoreLayout(saved);

  assert.deepEqual(restored.contents.get('vault-1')?.obsidianVault, vaultState);
});

test('DockEngine updates Obsidian vault content state without replacing other payload fields', () => {
  const engine = new DockEngine(() => {});

  engine.addContent({
    id: 'vault-1',
    title: 'Vault: Notes',
    state: 'document',
    html: '<p>static</p>',
    contentType: 'obsidian-vault',
    obsidianVault: vaultState,
  });

  const nextState: ObsidianVaultContentState = {
    ...vaultState,
    selectedNoteId: 'Folder/API.md',
    query: 'graph',
    graphScope: 'global',
  };

  engine.updateContentPayload('vault-1', { obsidianVault: nextState });

  assert.equal(engine.contents.get('vault-1')?.html, '<p>static</p>');
  assert.deepEqual(engine.contents.get('vault-1')?.obsidianVault, nextState);
});
