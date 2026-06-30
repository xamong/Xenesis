import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('shared edit context menu is portal based and exposes shortcut labels', () => {
  const source = readFileSync('src/renderer/editing/EditContextMenu.tsx', 'utf8');
  const styles = readFileSync('src/renderer/styles.css', 'utf8');

  assert.match(source, /createPortal/);
  assert.match(source, /buildEditMenuItems/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitem"/);
  assert.match(source, /xd-edit-context-menu-shortcut/);
  assert.match(styles, /\.xd-edit-context-menu\s*{/);
  assert.match(styles, /\.xd-edit-context-menu-item\s*{/);
});

test('editable surface hook registers surfaces and handles shortcut commands', () => {
  const source = readFileSync('src/renderer/editing/useEditableSurface.tsx', 'utf8');

  assert.match(source, /editCommandRegistry\.register/);
  assert.match(source, /editCommandRegistry\.activate/);
  assert.match(source, /resolveEditShortcut/);
  assert.match(source, /editCommandRegistry\.getState\(\)\[command\]/);
  assert.match(source, /onContextMenu/);
});

test('Obsidian vault viewer uses shared edit surfaces for search and preview', () => {
  const paneSource = readFileSync(
    'src/renderer/extensions/xenesis-desk.obsidian-vault/panes/ObsidianVaultPane.tsx',
    'utf8',
  );
  const previewSource = readFileSync(
    'src/renderer/extensions/xenesis-desk.obsidian-vault/panes/ObsidianVaultMarkdownPreview.tsx',
    'utf8',
  );

  assert.match(paneSource, /createNativeTextAdapter/);
  assert.match(paneSource, /vaultSearchSurface\.onContextMenu/);
  assert.match(previewSource, /createPreviewAdapter/);
  assert.match(previewSource, /vaultMarkdownPreviewSurface\.onContextMenu/);
});
