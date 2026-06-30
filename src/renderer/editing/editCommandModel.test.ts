import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEditMenuItems,
  createDefaultEditCommandState,
  type EditableSurfaceAdapter,
  resolveEditShortcut,
} from './editCommandModel';
import { createEditCommandRegistry } from './editCommandRegistry';

function adapter(id: string, label = id): EditableSurfaceAdapter & { __calls: string[] } {
  const calls: string[] = [];
  return {
    id,
    label,
    kind: 'textarea',
    getState: () => ({
      undo: true,
      redo: false,
      cut: true,
      copy: true,
      paste: true,
      selectAll: true,
      save: false,
    }),
    run: (command) => {
      calls.push(command);
      return true;
    },
    __calls: calls,
  } as EditableSurfaceAdapter & { __calls: string[] };
}

test('createDefaultEditCommandState disables every command by default', () => {
  assert.deepEqual(createDefaultEditCommandState(), {
    undo: false,
    redo: false,
    cut: false,
    copy: false,
    paste: false,
    selectAll: false,
    save: false,
  });
});

test('resolveEditShortcut maps platform edit shortcuts', () => {
  assert.equal(resolveEditShortcut({ key: 'z', ctrlKey: true }), 'undo');
  assert.equal(resolveEditShortcut({ key: 'Z', metaKey: true, shiftKey: true }), 'redo');
  assert.equal(resolveEditShortcut({ key: 'y', ctrlKey: true }), 'redo');
  assert.equal(resolveEditShortcut({ key: 'x', ctrlKey: true }), 'cut');
  assert.equal(resolveEditShortcut({ key: 'c', metaKey: true }), 'copy');
  assert.equal(resolveEditShortcut({ key: 'v', ctrlKey: true }), 'paste');
  assert.equal(resolveEditShortcut({ key: 'a', ctrlKey: true }), 'selectAll');
  assert.equal(resolveEditShortcut({ key: 's', ctrlKey: true }), 'save');
  assert.equal(resolveEditShortcut({ key: 'Enter', altKey: true }), null);
});

test('buildEditMenuItems always keeps disabled commands visible and only shows save when requested', () => {
  const state = { ...createDefaultEditCommandState(), copy: true, selectAll: true };
  const withoutSave = buildEditMenuItems(state, { includeSave: false, isMac: false });
  assert.deepEqual(
    withoutSave.map((item) => [item.command, item.disabled, item.shortcut]),
    [
      ['undo', true, 'Ctrl+Z'],
      ['redo', true, 'Ctrl+Shift+Z'],
      ['cut', true, 'Ctrl+X'],
      ['copy', false, 'Ctrl+C'],
      ['paste', true, 'Ctrl+V'],
      ['selectAll', false, 'Ctrl+A'],
    ],
  );

  const withSave = buildEditMenuItems({ ...state, save: true }, { includeSave: true, isMac: true });
  assert.equal(withSave.at(-1)?.command, 'save');
  assert.equal(withSave.at(-1)?.shortcut, '⌘S');
  assert.equal(withSave.at(-1)?.disabled, false);
});

test('registry routes commands to the focused adapter and unregisters stale surfaces', async () => {
  const registry = createEditCommandRegistry();
  const first = adapter('first');
  const second = adapter('second');

  registry.register(first);
  registry.register(second);

  assert.equal(registry.getActiveSurface()?.id, 'second');
  assert.equal(await registry.run('copy'), true);
  assert.deepEqual(second.__calls, ['copy']);

  registry.unregister('first');
  assert.equal(registry.getActiveSurface()?.id, 'second');

  registry.unregister('second');
  assert.equal(registry.getActiveSurface(), null);
  assert.equal(await registry.run('copy'), false);
});
