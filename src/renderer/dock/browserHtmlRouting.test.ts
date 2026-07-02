import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('App local file open preserves HTML source in browser content', () => {
  const source = readFileSync('src/renderer/App.tsx', 'utf8');

  assert.match(source, /result\.ext === 'svg' \|\| result\.ext === 'html' \|\| result\.ext === 'htm'/);
  assert.match(source, /browserSourceKind: 'local-file'/);
  assert.match(source, /fileContent: result\.content/);
  assert.match(source, /filePath: result\.filePath/);
});

test('App dropped HTML preserves in-memory source', () => {
  const source = readFileSync('src/renderer/App.tsx', 'utf8');

  assert.match(source, /browserSourceKind: 'dropped-file'/);
  assert.match(source, /fileContent: content/);
  assert.match(source, /URL\.createObjectURL/);
});

test('DockPaneView passes browser source props into BrowserPane', () => {
  const source = readFileSync('src/renderer/dock/DockPaneView.tsx', 'utf8');

  assert.match(source, /filePath=\{content\.filePath\}/);
  assert.match(source, /fileName=\{content\.fileName\}/);
  assert.match(source, /initialSource=\{content\.fileContent\}/);
  assert.match(source, /sourceKind=\{content\.browserSourceKind\}/);
});
