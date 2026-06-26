import assert from 'node:assert/strict';
import test from 'node:test';

import type { XenesisRunEvent } from '../shared/types';
import { createXenesisRunEventObservation } from './xenesisRunObservability';

test('maps Xenesis task worker events to detailed observability payloads', () => {
  const event: XenesisRunEvent = {
    event: 'task_worker_event',
    data: {
      type: 'task_worker_event',
      phase: 'completed',
      taskId: 'task-123',
      sessionId: 'session-abc',
      status: 'done',
      attempt: 2,
      maxAttempts: 3,
      task: {
        id: 'task-123',
        label: 'Review workspace',
        source: 'schedule',
        handoffId: 'handoff-1',
        handoffTitle: 'Daily review',
        subagent: 'codex',
        parentSessionId: 'parent-1',
      },
    },
  };

  const observation = createXenesisRunEventObservation(event);

  assert.equal(observation.descriptor.activity?.source, 'xenesis');
  assert.equal(observation.descriptor.activity?.label, 'xenesis.worker.completed');
  assert.match(observation.descriptor.activity?.detail ?? '', /task-123/);
  assert.match(observation.descriptor.activity?.detail ?? '', /Review workspace/);
  assert.equal(observation.descriptor.network?.source, 'xenesis');
  assert.equal(observation.descriptor.network?.method, 'POST');
  assert.equal(observation.descriptor.network?.url, 'xenesis://task-worker/completed');
  assert.equal(observation.result.ok, true);
  assert.equal(observation.result.status, 200);
});

test('keeps generic Xenesis run events on the agent source', () => {
  const observation = createXenesisRunEventObservation({
    event: 'status',
    data: { status: 'Ready' },
  });

  assert.equal(observation.descriptor.activity?.source, 'agent');
  assert.equal(observation.descriptor.activity?.label, 'xenesis.event.status');
  assert.equal(observation.descriptor.network, undefined);
  assert.equal(observation.result.ok, true);
});
