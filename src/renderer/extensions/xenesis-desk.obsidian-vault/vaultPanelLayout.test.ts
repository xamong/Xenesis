import assert from 'node:assert/strict';
import test from 'node:test';
import { graphRenderSizeFromHost, normalizeVaultPanelSizes, resizeVaultPanelSizes } from './vaultPanelLayout';

test('normalizeVaultPanelSizes repairs missing and out-of-range persisted sizes', () => {
  assert.deepEqual(normalizeVaultPanelSizes({ sidebar: 120, inspector: 900, graph: 40 }), {
    sidebar: 220,
    inspector: 560,
    graph: 220,
  });

  assert.deepEqual(normalizeVaultPanelSizes(undefined), {
    sidebar: 300,
    inspector: 390,
    graph: 420,
  });
});

test('resizeVaultPanelSizes derives panel sizes from splitter pointer position', () => {
  const current = { sidebar: 300, inspector: 390, graph: 420 };
  const measure = {
    shellRect: { left: 100, right: 1300, width: 1200 },
    mainRect: { top: 60, bottom: 860, height: 800 },
  };

  assert.deepEqual(resizeVaultPanelSizes(current, 'sidebar', { ...measure, clientX: 470, clientY: 0 }), {
    sidebar: 370,
    inspector: 390,
    graph: 420,
  });

  assert.deepEqual(resizeVaultPanelSizes(current, 'inspector', { ...measure, clientX: 850, clientY: 0 }), {
    sidebar: 300,
    inspector: 450,
    graph: 420,
  });

  assert.deepEqual(resizeVaultPanelSizes(current, 'graph', { ...measure, clientX: 0, clientY: 530 }), {
    sidebar: 300,
    inspector: 390,
    graph: 330,
  });
});

test('resizeVaultPanelSizes clamps drag results to usable limits', () => {
  const current = { sidebar: 300, inspector: 390, graph: 420 };
  const measure = {
    shellRect: { left: 100, right: 1300, width: 1200 },
    mainRect: { top: 60, bottom: 860, height: 800 },
  };

  assert.equal(resizeVaultPanelSizes(current, 'sidebar', { ...measure, clientX: 40, clientY: 0 }).sidebar, 220);
  assert.equal(resizeVaultPanelSizes(current, 'inspector', { ...measure, clientX: 500, clientY: 0 }).inspector, 560);
  assert.equal(resizeVaultPanelSizes(current, 'graph', { ...measure, clientX: 0, clientY: 800 }).graph, 220);
});

test('graphRenderSizeFromHost follows the available graph host dimensions', () => {
  assert.deepEqual(graphRenderSizeFromHost({ width: 1040, height: 560 }), { width: 1040, height: 560 });
  assert.deepEqual(graphRenderSizeFromHost({ width: 0, height: 0 }), { width: 720, height: 320 });
  assert.deepEqual(graphRenderSizeFromHost({ width: 240, height: 120 }), { width: 320, height: 220 });
});
