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

test('saveable document panes use shared editable surfaces', () => {
  const codePane = readFileSync('src/renderer/panes/CodePane.tsx', 'utf8');
  const markdownPane = readFileSync('src/renderer/panes/MarkdownPane.tsx', 'utf8');
  const xconViewerPane = readFileSync('src/renderer/panes/XconViewerPane.tsx', 'utf8');
  const safeFileEditCenterPane = readFileSync(
    'src/renderer/extensions/xenesis-desk.core-tools/panes/SafeFileEditCenterPane.tsx',
    'utf8',
  );

  assert.match(codePane, /createCodeMirrorAdapter/);
  assert.match(codePane, /useEditableSurface/);
  assert.match(codePane, /codeEditSurface\.onContextMenu/);

  assert.match(markdownPane, /createCodeMirrorAdapter/);
  assert.match(markdownPane, /createPreviewAdapter/);
  assert.match(markdownPane, /markdownEditSurface\.onContextMenu/);
  assert.match(markdownPane, /markdownPreviewSurface\.onContextMenu/);

  assert.match(xconViewerPane, /createCodeMirrorAdapter/);
  assert.match(xconViewerPane, /createPreviewAdapter/);
  assert.match(xconViewerPane, /xconSourceSurface\.onContextMenu/);
  assert.match(xconViewerPane, /xconPreviewSurface\.onContextMenu/);

  assert.match(safeFileEditCenterPane, /createNativeTextAdapter/);
  assert.match(safeFileEditCenterPane, /safeFileDraftSurface\.onContextMenu/);
});

test('high-traffic input composers use shared native editable surfaces', () => {
  const workbenchPane = readFileSync(
    'src/renderer/extensions/xenesis-desk.core-tools/panes/XconAgentWorkbenchPane.tsx',
    'utf8',
  );
  const agentPane = readFileSync('src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx', 'utf8');
  const botPane = readFileSync('src/renderer/extensions/xenesis-desk.core-tools/panes/XenisBotPane.tsx', 'utf8');
  const commandCenterPane = readFileSync('src/renderer/panes/CommandCenterPane.tsx', 'utf8');
  const metaQueryPanel = readFileSync(
    'src/renderer/extensions/xenesis-desk.data-tools/panes/MetaManagementQueryPanel.tsx',
    'utf8',
  );

  assert.match(workbenchPane, /createNativeTextAdapter/);
  assert.match(workbenchPane, /workbenchPromptSurface\.onContextMenu/);
  assert.doesNotMatch(workbenchPane, /ComposerContextMenuState/);

  assert.match(agentPane, /createNativeTextAdapter/);
  assert.match(agentPane, /xenesisPromptSurface\.onContextMenu/);

  assert.match(botPane, /createNativeTextAdapter/);
  assert.match(botPane, /xenisBotComposerSurface\.onContextMenu/);

  assert.match(commandCenterPane, /createNativeTextAdapter/);
  assert.match(commandCenterPane, /commandCenterInputSurface\.onContextMenu/);

  assert.match(metaQueryPanel, /createNativeTextAdapter/);
  assert.match(metaQueryPanel, /metaQuerySurface\.onContextMenu/);
});

test('remaining safe native text inputs use a global shared edit surface', () => {
  const appSource = readFileSync('src/renderer/App.tsx', 'utf8');
  const globalSurface = readFileSync('src/renderer/editing/globalNativeEditSurface.tsx', 'utf8');

  assert.match(appSource, /GlobalNativeEditSurface/);
  assert.match(globalSurface, /createNativeTextAdapter/);
  assert.match(globalSurface, /EditContextMenu/);
  assert.match(globalSurface, /resolveEditShortcut/);
  assert.match(globalSurface, /isEligibleGlobalNativeEditElement/);
  assert.match(globalSurface, /SECRET_FIELD_PATTERN/);
  assert.match(globalSurface, /password/);
  assert.match(globalSurface, /api-?key/);
  assert.match(globalSurface, /contenteditable/i);
});
