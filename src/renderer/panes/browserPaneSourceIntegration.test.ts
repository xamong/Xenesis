import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('BrowserPane wires HTML source mode dependencies without losing CR controller', () => {
  const source = readFileSync('src/renderer/panes/BrowserPane.tsx', 'utf8');

  assert.match(source, /@codemirror\/lang-html/);
  assert.match(source, /@uiw\/react-codemirror/);
  assert.match(source, /useSplitter/);
  assert.match(source, /createCodeMirrorAdapter/);
  assert.match(source, /useEditableSurface/);
  assert.match(source, /BrowserViewMode/);
  assert.match(source, /mode === 'source'/);
  assert.match(source, /mode === 'split'/);
  assert.match(source, /readOnly=\{!canEditBrowserSource/);
  assert.match(source, /runBrowserPaneAction/);
  assert.match(source, /browserPaneControllers/);
  assert.match(source, /contentId/);
});

test('BrowserPane toolbar uses icon buttons with accessible labels', () => {
  const source = readFileSync('src/renderer/panes/BrowserPane.tsx', 'utf8');

  assert.match(source, /aria-label=\{t\('browser\.backTitle'\)\}/);
  assert.match(source, /aria-label=\{t\('browser\.forwardTitle'\)\}/);
  assert.match(source, /aria-label=\{isLoading \? t\('browser\.stopTitle'\) : t\('browser\.refreshTitle'\)\}/);
  assert.match(source, /aria-label=\{t\('browser\.sourceModeTitle'\)\}/);
  assert.match(source, /aria-label=\{t\('browser\.splitModeTitle'\)\}/);
});

test('BrowserPane has source and split styles', () => {
  const styles = readFileSync('src/renderer/styles.css', 'utf8');

  assert.match(styles, /\.browser-body\s*{/);
  assert.match(styles, /\.browser-source-panel\s*{/);
  assert.match(styles, /\.browser-preview-panel\s*{/);
  assert.match(styles, /\.browser-source-status\s*{/);
  assert.match(styles, /\.browser-mode-btns\s*{/);
  assert.match(styles, /\.browser-webview-cover\s*{/);
});

test('BrowserPane wires webview context-menu actions', () => {
  const source = readFileSync('src/renderer/panes/BrowserPane.tsx', 'utf8');

  assert.match(source, /useContextMenu/);
  assert.match(source, /ContextMenu/);
  assert.match(source, /addEventListener\('context-menu'/);
  assert.match(source, /linkURL/);
  assert.match(source, /srcURL/);
  assert.match(source, /selectionText/);
  assert.match(source, /openViewSourceInDesk/);
  assert.match(source, /navigator\.clipboard\.writeText/);
});
