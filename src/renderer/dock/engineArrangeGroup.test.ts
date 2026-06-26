import assert from 'node:assert/strict';
import test from 'node:test';
import { DockEngine } from './engine';

test('arrangePaneGroup grids only the clicked tab group and leaves sibling panes untouched', () => {
  const engine = new DockEngine(() => {});

  engine.addContent({ id: 'term-1', title: 'Terminal 1', state: 'document', html: '' });
  engine.addContent({ id: 'term-2', title: 'Terminal 2', state: 'document', html: '' });
  engine.addContent({ id: 'term-3', title: 'Terminal 3', state: 'document', html: '' });
  engine.addContent({ id: 'term-4', title: 'Terminal 4', state: 'document', html: '' });

  const tabPane = engine.findPaneByContent('term-1');
  assert.ok(tabPane);
  assert.deepEqual(tabPane.contents, ['term-1', 'term-2', 'term-3', 'term-4']);

  engine.addContentWithPlacement(
    { id: 'sample-md', title: 'sample.md', state: 'document', html: '' },
    'bottom',
    tabPane.id,
  );
  const markdownPane = engine.findPaneByContent('sample-md');
  assert.ok(markdownPane);

  engine.addContentWithPlacement(
    { id: 'sample-pdf', title: 'sample.pdf', state: 'document', html: '' },
    'right',
    markdownPane.id,
  );
  const pdfPane = engine.findPaneByContent('sample-pdf');
  assert.ok(pdfPane);

  // Reproduces broad group metadata that can happen after prior group operations.
  // The command still means "the clicked tab group", not every pane with this value.
  tabPane.group = 'shared-document-group';
  markdownPane.group = 'shared-document-group';
  pdfPane.group = 'shared-document-group';

  const result = engine.arrangePaneGroup(tabPane.id, 'grid', 'term-1');

  assert.equal(result, 'Group arranged as a grid.');
  assert.equal(engine.panes.has(markdownPane.id), true);
  assert.equal(engine.panes.has(pdfPane.id), true);
  assert.deepEqual(engine.panes.get(markdownPane.id)?.contents, ['sample-md']);
  assert.deepEqual(engine.panes.get(pdfPane.id)?.contents, ['sample-pdf']);

  const terminalPaneIds = ['term-1', 'term-2', 'term-3', 'term-4'].map((id) => engine.findPaneByContent(id)?.id);
  assert.equal(new Set(terminalPaneIds).size, 4);
});

test('arranged pane groups can be rearranged and merged without touching sibling panes', () => {
  const engine = new DockEngine(() => {});

  engine.addContent({ id: 'term-a', title: 'Terminal A', state: 'document', html: '' });
  engine.addContent({ id: 'term-b', title: 'Terminal B', state: 'document', html: '' });
  engine.addContent({ id: 'term-c', title: 'Terminal C', state: 'document', html: '' });

  const tabPane = engine.findPaneByContent('term-a');
  assert.ok(tabPane);

  engine.addContentWithPlacement(
    { id: 'sample-md', title: 'sample.md', state: 'document', html: '' },
    'bottom',
    tabPane.id,
  );
  const markdownPane = engine.findPaneByContent('sample-md');
  assert.ok(markdownPane);

  assert.equal(engine.arrangePaneGroup(tabPane.id, 'grid', 'term-a'), 'Group arranged as a grid.');
  assert.equal(engine.panes.has(markdownPane.id), true);

  const firstArrangedPane = engine.findPaneByContent('term-a');
  assert.ok(firstArrangedPane);
  assert.equal(engine.arrangePaneGroup(firstArrangedPane.id, 'column', 'term-b'), 'Group arranged vertically.');
  assert.equal(engine.panes.has(markdownPane.id), true);
  assert.deepEqual(engine.panes.get(markdownPane.id)?.contents, ['sample-md']);

  const secondArrangedPane = engine.findPaneByContent('term-b');
  assert.ok(secondArrangedPane);
  assert.equal(engine.mergePaneGroup(secondArrangedPane.id, 'term-c'), 'Group merged into one tab group.');
  assert.equal(engine.panes.has(markdownPane.id), true);
  assert.deepEqual(engine.panes.get(markdownPane.id)?.contents, ['sample-md']);

  const mergedPane = engine.findPaneByContent('term-c');
  assert.ok(mergedPane);
  assert.deepEqual(new Set(mergedPane.contents), new Set(['term-a', 'term-b', 'term-c']));
});

test('setPaneGroupSize adjusts the exact pane group width before grid arrangement', () => {
  const engine = new DockEngine(() => {});

  engine.addContent({ id: 'term-1', title: 'Terminal 1', state: 'document', html: '' });
  engine.addContent({ id: 'term-2', title: 'Terminal 2', state: 'document', html: '' });
  engine.addContent({ id: 'sample-md', title: 'sample.md', state: 'document', html: '' });
  engine.addContent({ id: 'sample-pdf', title: 'sample.pdf', state: 'document', html: '' });
  engine.addContent({ id: 'sample-png', title: 'sample.png', state: 'document', html: '' });
  engine.addContent({ id: 'browser', title: 'Browser', state: 'document', html: '' });

  const tabPane = engine.findPaneByContent('term-1');
  assert.ok(tabPane);

  assert.equal(engine.arrangePaneGroup(tabPane.id, 'grid', 'term-1'), 'Group arranged as a grid.');

  const terminalAnchorPane = engine.findPaneByContent('term-1');
  const terminalSecondPane = engine.findPaneByContent('term-2');
  const markdownPane = engine.findPaneByContent('sample-md');
  assert.ok(terminalAnchorPane);
  assert.ok(terminalSecondPane);
  assert.ok(markdownPane);

  engine.moveContentToPane('term-2', terminalAnchorPane.id);
  const mergedMessage = engine.mergePaneGroup(terminalAnchorPane.id, 'term-1');
  assert.equal(mergedMessage, 'Group merged into one tab group.');

  const terminalGroupPane = engine.findPaneByContent('term-1');
  assert.ok(terminalGroupPane);

  const sizeResult = engine.setPaneGroupSize(terminalGroupPane.id, { widthPercent: 50 });
  assert.equal(sizeResult.ok, true);
  assert.equal(sizeResult.widthPercent, 50);

  engine.computeLayouts();
  const resizedPane = engine.findPaneByContent('term-1');
  assert.ok(resizedPane);
  assert.equal(resizedPane.layout.width, '50%');
  assert.equal(engine.panes.has(markdownPane.id), true);

  assert.equal(engine.arrangePaneGroup(resizedPane.id, 'grid', 'term-1'), 'Group arranged as a grid.');
  assert.equal(engine.panes.has(markdownPane.id), true);
});
