import assert from 'node:assert/strict';
import test from 'node:test';
import type { MetaRelation } from './metaManagementCmdbAssist';
import {
  buildMetaRelationGraphModel,
  buildMetaRelationGraphSketch,
  metaRelationGraphSizeFromHost,
} from './metaManagementRelationGraph';

const relations: MetaRelation[] = [
  { id: 'parent:1:2', from: 'node:1', to: 'node:2', label: 'parent', kind: 'parent' },
  { id: 'attribute:2:7', from: 'node:2', to: 'attr:7', label: 'CODE', kind: 'attribute' },
  { id: 'instance:2:R1', from: 'node:2', to: 'instance:R1', label: 'ROWID', kind: 'instance' },
];

test('buildMetaRelationGraphModel converts relations into deduplicated network nodes and links', () => {
  const graph = buildMetaRelationGraphModel(relations);

  assert.deepEqual(
    graph.nodes.map((node) => [node.id, node.label, node.group]),
    [
      ['node:1', 'node 1', 'node'],
      ['node:2', 'node 2', 'node'],
      ['attr:7', 'attr 7', 'attr'],
      ['instance:R1', 'instance R1', 'instance'],
    ],
  );
  assert.deepEqual(
    graph.links.map((link) => [link.source, link.target, link.type, link.label]),
    [
      ['node:1', 'node:2', 'parent', 'parent'],
      ['node:2', 'attr:7', 'attribute', 'CODE'],
      ['node:2', 'instance:R1', 'instance', 'ROWID'],
    ],
  );
  assert.equal(graph.truncated, false);
});

test('buildMetaRelationGraphModel limits large relation sets for diagram readability', () => {
  const large = Array.from({ length: 5 }, (_, index) => ({
    id: `template:1:${index}`,
    from: 'node:1',
    to: `node:${index + 2}`,
    label: 'GROUP',
    kind: 'template' as const,
  }));

  const graph = buildMetaRelationGraphModel(large, { maxRelations: 3 });

  assert.equal(graph.links.length, 3);
  assert.equal(graph.truncated, true);
});

test('metaRelationGraphSizeFromHost follows host dimensions with usable fallbacks', () => {
  assert.deepEqual(metaRelationGraphSizeFromHost({ width: 900, height: 420 }), { width: 900, height: 420 });
  assert.deepEqual(metaRelationGraphSizeFromHost({ width: 0, height: 0 }), { width: 720, height: 360 });
  assert.deepEqual(metaRelationGraphSizeFromHost({ width: 240, height: 120 }), { width: 360, height: 240 });
});

test('buildMetaRelationGraphSketch emits a networkDiagram sketch', () => {
  const graph = buildMetaRelationGraphModel(relations);
  const sketch = buildMetaRelationGraphSketch(graph, { width: 900, height: 420 });

  assert.match(sketch, /screen "XMDB Relations" 900x420/);
  assert.match(sketch, /relations: networkDiagram at 0 0 900 420/);
  assert.match(sketch, /showLabels true/);
  assert.match(sketch, /"source":"node:2"/);
});
