import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_META_RELATION_VIEW_MODE,
  META_RELATION_VIEW_MODES,
  resolveMetaRelationViewMode,
} from './metaManagementRelationTabs';

test('relation view mode defaults to Graph and exposes Graph before List', () => {
  assert.equal(DEFAULT_META_RELATION_VIEW_MODE, 'graph');
  assert.deepEqual(
    META_RELATION_VIEW_MODES.map((mode) => [mode.id, mode.label]),
    [
      ['graph', 'Graph'],
      ['list', 'List'],
    ],
  );
});

test('resolveMetaRelationViewMode falls back to Graph for unknown values', () => {
  assert.equal(resolveMetaRelationViewMode('list'), 'list');
  assert.equal(resolveMetaRelationViewMode('graph'), 'graph');
  assert.equal(resolveMetaRelationViewMode('table'), 'graph');
  assert.equal(resolveMetaRelationViewMode(null), 'graph');
});
