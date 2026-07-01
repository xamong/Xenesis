import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

function runWorker(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL('./playwright-worker.mjs', import.meta.url))], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(stderr || stdout || `worker exited ${code}`));
      else resolve(JSON.parse(stdout.trim()));
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

function dataUrl(title, body) {
  return `data:text/html,${encodeURIComponent(`<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`)}`;
}

test('playwright worker supports input-control coordinate and keyboard actions', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'xenesis-input-worker-'));
  try {
    const startUrl = dataUrl(
      'Input Start',
      [
        '<input id="q" style="position:absolute;left:20px;top:20px;width:320px;height:44px" />',
        '<div id="drag" style="position:absolute;left:120px;top:110px;width:80px;height:60px;background:#ccc"></div>',
        '<div style="height:1800px"></div>',
      ].join(''),
    );
    const secondUrl = dataUrl('Second Page', '<h1>second</h1>');
    const result = await runWorker({
      operation: 'run',
      url: startUrl,
      outDir,
      width: 800,
      height: 600,
      actions: [
        { type: 'click', x: 30, y: 35, clickCount: 2 },
        { type: 'type', text: 'xconviewer' },
        { type: 'press', key: 'Enter' },
        { type: 'keyDown', key: 'Shift' },
        { type: 'keyUp', key: 'Shift' },
        { type: 'hotkey', keys: ['Control', 'A'] },
        { type: 'move', x: 160, y: 160 },
        { type: 'mouseDown', x: 160, y: 160 },
        { type: 'mouseUp', x: 180, y: 180 },
        { type: 'dragAndDrop', startX: 200, startY: 200, endX: 600, endY: 240 },
        { type: 'scroll', direction: 'down', magnitudeInPixels: 120 },
        { type: 'navigate', url: secondUrl },
        { type: 'goBack' },
        { type: 'goForward' },
        { type: 'screenshot', fileName: 'input-worker-action' },
      ],
    });

    assert.equal(result.ok, true);
    assert.equal(result.finalUrl, secondUrl);
    assert.equal(result.title, 'Second Page');
    assert.deepEqual(
      result.actions.map((action) => action.type),
      [
        'click',
        'type',
        'press',
        'keyDown',
        'keyUp',
        'hotkey',
        'move',
        'mouseDown',
        'mouseUp',
        'dragAndDrop',
        'scroll',
        'navigate',
        'goBack',
        'goForward',
        'screenshot',
      ],
    );
    assert.deepEqual(result.actions[0].normalized, { x: 30, y: 35 });
    assert.deepEqual(result.actions[0].pixel, { x: 24, y: 21 });
    assert.equal(result.actions[0].clickCount, 2);
    assert.deepEqual(result.actions[9].normalized, {
      start: { x: 200, y: 200 },
      end: { x: 600, y: 240 },
    });
    assert.match(result.screenshotFilePath, /input-worker-action\.png$/);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
