import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const paneSource = readFileSync(new URL('./SqliteServerSettingsPane.tsx', import.meta.url), 'utf8');

test('SQLite settings pane defaults to the bundled local metadata server', () => {
  assert.match(paneSource, /const DEFAULT_API_URL = 'http:\/\/localhost:3001';/);
});

test('SQLite settings pane keeps server status controls visible outside local-server mode', () => {
  assert.doesNotMatch(paneSource, /if \(!devMode\) \{\s*if \(pollRef\.current\)/);
  assert.doesNotMatch(paneSource, /\{devMode && \(\s*<div className="sp-server-status-row">/);
  assert.match(paneSource, /<div className="sp-server-status-row">/);
});
