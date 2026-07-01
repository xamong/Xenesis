import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { shouldPersistRendererSettings } from './settingsAutosavePolicy';

test('renderer settings autosave is blocked before load and inside detached windows', () => {
  assert.equal(shouldPersistRendererSettings({ settingsLoaded: false, isDetachedWindow: false }), false);
  assert.equal(shouldPersistRendererSettings({ settingsLoaded: true, isDetachedWindow: true }), false);
  assert.equal(shouldPersistRendererSettings({ settingsLoaded: true, isDetachedWindow: false }), true);
});

test('App uses the autosave policy for global and command settings persistence', () => {
  const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
  const calls =
    appSource.match(
      /shouldPersistRendererSettings\(\{\s*settingsLoaded:\s*settingsLoadedRef\.current,\s*isDetachedWindow,?\s*\}\)/g,
    ) ?? [];
  assert.equal(calls.length, 2);
  assert.match(appSource, /from ['"]\.\/settingsAutosavePolicy['"]/);
});
