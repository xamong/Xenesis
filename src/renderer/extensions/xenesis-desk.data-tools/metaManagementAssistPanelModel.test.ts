import assert from 'node:assert/strict';
import test from 'node:test';
import {
  closeMetaAssistDialog,
  getMetaAssistDialogTitle,
  META_MANAGEMENT_ASSIST_ACTIONS,
  openMetaAssistDialog,
} from './metaManagementAssistPanelModel';

test('meta assist actions are launched as dialogs instead of inline tabs', () => {
  assert.deepEqual(
    META_MANAGEMENT_ASSIST_ACTIONS.map((action) => action.id),
    ['form', 'relations', 'export', 'import', 'activity'],
  );
  assert.equal(
    META_MANAGEMENT_ASSIST_ACTIONS.every((action) => action.surface === 'dialog'),
    true,
  );
});

test('meta assist dialog state opens, switches, and closes by action', () => {
  const opened = openMetaAssistDialog(null, 'form');
  assert.equal(opened, 'form');
  assert.equal(getMetaAssistDialogTitle(opened), 'Form');

  const switched = openMetaAssistDialog(opened, 'activity');
  assert.equal(switched, 'activity');
  assert.equal(getMetaAssistDialogTitle(switched), 'Activity');

  assert.equal(closeMetaAssistDialog(switched), null);
});
