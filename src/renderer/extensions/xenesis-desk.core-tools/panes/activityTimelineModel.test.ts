import assert from 'node:assert/strict';
import test from 'node:test';

import type { ActivityEvent } from '../../../observability/activityTimelineStore';
import { ACTIVITY_TIMELINE_FRAME_MS, createActivityPomeloTimelineModel } from './activityTimelineModel';

function event(
  input: Partial<ActivityEvent> & Pick<ActivityEvent, 'id' | 'source' | 'label' | 'startedAt'>,
): ActivityEvent {
  return {
    detail: '',
    endedAt: undefined,
    status: 'completed',
    color: '#22c55e',
    ...input,
  };
}

test('creates Pomelo timeline tracks grouped by activity source', () => {
  const startedAt = 1_000;
  const model = createActivityPomeloTimelineModel(
    [
      event({
        id: 'terminal-1',
        source: 'terminal',
        label: 'terminal.output',
        startedAt,
        endedAt: startedAt + ACTIVITY_TIMELINE_FRAME_MS * 2,
        color: '#22c55e',
      }),
      event({
        id: 'xenesis-1',
        source: 'xenesis',
        label: 'xenesis.worker.completed',
        startedAt: startedAt + ACTIVITY_TIMELINE_FRAME_MS,
        endedAt: startedAt + ACTIVITY_TIMELINE_FRAME_MS * 4,
        color: '#a3e635',
      }),
    ],
    { now: startedAt + ACTIVITY_TIMELINE_FRAME_MS * 5 },
  );

  assert.equal(model.startedAt, startedAt);
  assert.deepEqual(
    model.tracks.map((track) => track.name),
    ['Terminal', 'Xenesis'],
  );
  assert.equal(model.tracks[0].clips[0].name, 'terminal.output');
  assert.equal(model.tracks[0].clips[0].start, 0);
  assert.equal(model.tracks[0].clips[0].length, 2);
  assert.equal(model.tracks[0].clips[0].tag.eventId, 'terminal-1');
  assert.equal(model.tracks[1].clips[0].start, 1);
  assert.equal(model.tracks[1].clips[0].length, 3);
  assert.equal(model.frameCount >= 6, true);
});

test('uses the supplied now value for running event duration', () => {
  const startedAt = 2_000;
  const model = createActivityPomeloTimelineModel(
    [
      event({
        id: 'run-1',
        source: 'workflow',
        label: 'workflow.run',
        startedAt,
        endedAt: undefined,
        status: 'running',
        color: '#8b5cf6',
      }),
    ],
    { now: startedAt + ACTIVITY_TIMELINE_FRAME_MS * 3 },
  );

  assert.equal(model.tracks[0].clips[0].length, 3);
  assert.equal(model.tracks[0].clips[0].tag.status, 'running');
  assert.equal(model.summary.running, 1);
});

test('returns an empty model when no events are available', () => {
  const model = createActivityPomeloTimelineModel([], { now: 10_000 });

  assert.deepEqual(model.tracks, []);
  assert.equal(model.frameCount, 12);
  assert.equal(model.summary.total, 0);
});
