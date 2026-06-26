import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clearGowooriPaneSessionState,
  createDefaultGowooriPaneSessionState,
  readGowooriPaneSessionState,
  writeGowooriPaneSessionState,
} from './gowooriPaneSessionStore';

test('Gowoori pane session state is restored by content id after remount', () => {
  const contentId = 'gowoori-test-content';
  const fallback = createDefaultGowooriPaneSessionState('# Built in', 'Built-in demo preset');

  clearGowooriPaneSessionState(contentId);
  assert.equal(readGowooriPaneSessionState(contentId, fallback).source, '# Built in');

  writeGowooriPaneSessionState(contentId, {
    source: '# Generated artifact\n\n```xcon-sketch\nscreen "Persisted"\n```',
    sourceLabel: 'Generated artifact',
    loadedFilePath: null,
    loadError: null,
    isModified: true,
    mode: 'split',
    zoom: 130,
    selectedPresetId: 'binding-dashboard',
    splitRatio: 0.62,
    playbackDocumentSource: '# streamed preview',
    playbackFixture: { record: { status: 'running' } },
    playbackSnapshot: {
      activeSceneIndex: 2,
      activeActionIndex: 1,
      sceneCount: 4,
      actionCount: 8,
      activeSceneId: 'scene-3',
      activeSceneTitle: 'Scene 3',
      activeActionType: 'cursorMove',
      activeActionTarget: 'chart',
      isPlaying: true,
      typedText: 'typed during playback',
      cursorPosition: { x: 240, y: 180 },
      cursorLabel: 'Chart',
      clickPulseId: 3,
      focusedTarget: 'chart',
      highlightedTarget: 'chart',
      highlightRect: { x: 200, y: 120, width: 180, height: 80 },
      highlightText: 'Chart highlight',
      calloutText: 'Current callout',
      calloutPosition: { x: 360, y: 220 },
      fixtureStatus: 'updated',
      chainStatus: 'ready',
      workflowEventStatus: 'running',
      progress: 0.45,
      elapsedMs: 450,
      durationMs: 1000,
    },
  });

  const restored = readGowooriPaneSessionState(contentId, fallback);
  assert.equal(restored.source.includes('Generated artifact'), true);
  assert.equal(restored.sourceLabel, 'Generated artifact');
  assert.equal(restored.isModified, true);
  assert.equal(restored.mode, 'split');
  assert.equal(restored.zoom, 130);
  assert.equal(restored.selectedPresetId, 'binding-dashboard');
  assert.equal(restored.splitRatio, 0.62);
  assert.equal(restored.playbackDocumentSource, '# streamed preview');
  assert.deepEqual(restored.playbackFixture, { record: { status: 'running' } });
  assert.equal(restored.playbackSnapshot?.activeSceneIndex, 2);
  assert.equal(restored.playbackSnapshot?.activeActionIndex, 1);
  assert.deepEqual(restored.playbackSnapshot?.cursorPosition, { x: 240, y: 180 });
});

test('Gowoori pane session reads are isolated copies', () => {
  const contentId = 'gowoori-copy-content';
  clearGowooriPaneSessionState(contentId);
  writeGowooriPaneSessionState(contentId, {
    ...createDefaultGowooriPaneSessionState('# Original', 'Original label'),
    mode: 'edit',
  });

  const firstRead = readGowooriPaneSessionState(
    contentId,
    createDefaultGowooriPaneSessionState('# fallback', 'fallback'),
  );
  firstRead.source = '# Mutated by caller';
  firstRead.mode = 'preview';

  const secondRead = readGowooriPaneSessionState(
    contentId,
    createDefaultGowooriPaneSessionState('# fallback', 'fallback'),
  );
  assert.equal(secondRead.source, '# Original');
  assert.equal(secondRead.mode, 'edit');
});

test('Gowoori pane session nested playback state is copied on read and write', () => {
  const contentId = 'gowoori-playback-copy-content';
  clearGowooriPaneSessionState(contentId);
  writeGowooriPaneSessionState(contentId, {
    ...createDefaultGowooriPaneSessionState('# Original', 'Original label'),
    playbackFixture: { record: { status: 'running' } },
    playbackSnapshot: {
      activeSceneIndex: 1,
      activeActionIndex: 2,
      sceneCount: 3,
      actionCount: 7,
      activeSceneId: 'scene-2',
      activeSceneTitle: 'Scene 2',
      activeActionType: 'highlight',
      activeActionTarget: 'panel',
      isPlaying: false,
      typedText: '',
      cursorPosition: { x: 120, y: 90 },
      cursorLabel: '',
      clickPulseId: 0,
      focusedTarget: 'panel',
      highlightedTarget: 'panel',
      highlightRect: { x: 100, y: 80, width: 200, height: 90 },
      highlightText: 'Panel',
      calloutText: '',
      calloutPosition: null,
      fixtureStatus: 'idle',
      chainStatus: 'idle',
      workflowEventStatus: 'idle',
      progress: 0.3,
      elapsedMs: 300,
      durationMs: 1000,
    },
  });

  const firstRead = readGowooriPaneSessionState(
    contentId,
    createDefaultGowooriPaneSessionState('# fallback', 'fallback'),
  );
  firstRead.playbackSnapshot!.cursorPosition.x = 999;
  firstRead.playbackSnapshot!.highlightRect!.width = 999;
  (firstRead.playbackFixture!.record as Record<string, unknown>).status = 'mutated';

  const secondRead = readGowooriPaneSessionState(
    contentId,
    createDefaultGowooriPaneSessionState('# fallback', 'fallback'),
  );
  assert.deepEqual(secondRead.playbackSnapshot?.cursorPosition, { x: 120, y: 90 });
  assert.deepEqual(secondRead.playbackSnapshot?.highlightRect, { x: 100, y: 80, width: 200, height: 90 });
  assert.deepEqual(secondRead.playbackFixture, { record: { status: 'running' } });
});
