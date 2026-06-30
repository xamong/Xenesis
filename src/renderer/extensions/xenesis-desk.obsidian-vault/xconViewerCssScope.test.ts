import assert from 'node:assert/strict';
import test from 'node:test';
import { scopeXconViewerCssForShadow } from './xconViewerCssScope';

test('scopeXconViewerCssForShadow rewrites global XCON theme selectors for Shadow DOM', () => {
  const css = [
    ':root,[data-xcon-theme="light"] { --accent:#C4622D; }',
    'html[data-theme="dark"],[data-xcon-theme="dark"] { --accent:#7C6AF7; }',
    '.xcon-card { color: var(--accent); }',
  ].join('\n');

  const scoped = scopeXconViewerCssForShadow(css);

  assert.equal(scoped.includes(':root'), false);
  assert.equal(scoped.includes('html[data-theme'), false);
  assert.match(scoped, /:host,:host\(\[data-xcon-theme="light"\]\)/);
  assert.match(scoped, /:host\(\[data-xcon-theme="dark"\]\)/);
  assert.match(scoped, /\.xcon-card \{ color: var\(--accent\); \}/);
});
