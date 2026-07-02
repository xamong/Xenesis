import assert from 'node:assert/strict';
import test from 'node:test';
import type { BrowserSourceResult } from '../../shared/types';
import {
  canEditBrowserSource,
  canSaveBrowserSource,
  createLocalBrowserSourceState,
  getBrowserSourceKindLabel,
  markBrowserSourceStale,
  resolveRemoteBrowserSource,
} from './browserSourceModel';

test('local file source is editable and savable only with a file path', () => {
  const state = createLocalBrowserSourceState({
    text: '<!doctype html><title>Local</title>',
    url: 'file:///D:/demo/index.html',
    kind: 'local-file',
  });

  assert.equal(state.kind, 'local-file');
  assert.equal(state.text.includes('<title>Local</title>'), true);
  assert.equal(canEditBrowserSource(state.kind), true);
  assert.equal(canSaveBrowserSource(state.kind, 'D:/demo/index.html'), true);
  assert.equal(canSaveBrowserSource(state.kind, ''), false);
  assert.equal(getBrowserSourceKindLabel(state.kind), 'Local file');
});

test('dropped file source is editable in memory but not savable', () => {
  const state = createLocalBrowserSourceState({
    text: '<main>Dropped</main>',
    url: 'blob:xenesis-desk-demo',
    kind: 'dropped-file',
  });

  assert.equal(canEditBrowserSource(state.kind), true);
  assert.equal(canSaveBrowserSource(state.kind, 'D:/ignored.html'), false);
  assert.equal(getBrowserSourceKindLabel(state.kind), 'Dropped file');
});

test('remote source resolver prefers response source', async () => {
  const response: BrowserSourceResult = {
    ok: true,
    kind: 'response-source',
    url: 'https://example.test',
    finalUrl: 'https://example.test',
    source: '<html><body>response</body></html>',
    contentType: 'text/html',
    byteCount: 34,
  };

  const state = await resolveRemoteBrowserSource({
    url: 'https://example.test',
    loadResponseSource: async () => response,
    readDomSnapshot: async () => '<html><body>dom</body></html>',
  });

  assert.equal(state.kind, 'response-source');
  assert.equal(state.text, '<html><body>response</body></html>');
  assert.equal(state.url, 'https://example.test');
  assert.equal(state.loading, false);
});

test('remote source resolver falls back to DOM snapshot', async () => {
  const state = await resolveRemoteBrowserSource({
    url: 'https://example.test/app',
    loadResponseSource: async () => ({
      ok: false,
      kind: 'unavailable',
      url: 'https://example.test/app',
      finalUrl: 'https://example.test/app',
      error: 'response unavailable',
    }),
    readDomSnapshot: async () => '<html><body>dom snapshot</body></html>',
  });

  assert.equal(state.kind, 'dom-snapshot');
  assert.equal(state.text, '<html><body>dom snapshot</body></html>');
  assert.equal(getBrowserSourceKindLabel(state.kind), 'DOM snapshot');
});

test('remote source resolver reports unavailable when both strategies fail', async () => {
  const state = await resolveRemoteBrowserSource({
    url: 'https://example.test/private',
    loadResponseSource: async () => ({
      ok: false,
      kind: 'unavailable',
      url: 'https://example.test/private',
      finalUrl: 'https://example.test/private',
      error: 'not html',
    }),
    readDomSnapshot: async () => {
      throw new Error('dom blocked');
    },
  });

  assert.equal(state.kind, 'unavailable');
  assert.equal(state.text, '');
  assert.match(state.error ?? '', /not html/);
  assert.match(state.error ?? '', /dom blocked/);
});

test('navigation marks existing remote source stale', () => {
  const next = markBrowserSourceStale(
    {
      text: '<html>old</html>',
      kind: 'response-source',
      url: 'https://example.test/old',
      loading: false,
    },
    'https://example.test/new',
  );

  assert.equal(next.url, 'https://example.test/new');
  assert.equal(next.stale, true);
  assert.equal(next.text, '<html>old</html>');
});
