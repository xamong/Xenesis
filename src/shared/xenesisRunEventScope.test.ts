import assert from 'node:assert/strict';
import test from 'node:test';
import type { XenesisRunEvent } from './types';
import {
  shouldConsumeXenesisRunEvent,
  withXenesisRunEventScope,
  XENESIS_AGENT_RUN_SOURCE,
  XENESIS_AGENT_WORKBENCH_RUN_SOURCE,
} from './xenesisRunEventScope';

test('withXenesisRunEventScope attaches source, session, and run metadata to record payloads', () => {
  const scoped = withXenesisRunEventScope(
    {
      event: 'response.output_text.delta',
      data: {
        type: 'response.output_text.delta',
        delta: 'hello',
      },
    },
    {
      source: XENESIS_AGENT_WORKBENCH_RUN_SOURCE,
      sessionId: 'session-1',
    },
    'run-1',
  );

  assert.equal(scoped.event, 'response.output_text.delta');
  assert.deepEqual(scoped.data, {
    type: 'response.output_text.delta',
    delta: 'hello',
  });
  assert.equal(scoped.source, XENESIS_AGENT_WORKBENCH_RUN_SOURCE);
  assert.equal(scoped.sessionId, 'session-1');
  assert.equal(scoped.runId, 'run-1');
});

test('shouldConsumeXenesisRunEvent accepts matching scoped source and rejects other Agent surfaces', () => {
  const workbenchEvent: XenesisRunEvent = {
    event: 'delta',
    source: XENESIS_AGENT_WORKBENCH_RUN_SOURCE,
    sessionId: 'session-1',
    data: {},
  };
  const agentEvent: XenesisRunEvent = {
    event: 'delta',
    source: XENESIS_AGENT_RUN_SOURCE,
    sessionId: 'session-2',
    data: {},
  };

  assert.equal(shouldConsumeXenesisRunEvent(workbenchEvent, XENESIS_AGENT_WORKBENCH_RUN_SOURCE), true);
  assert.equal(shouldConsumeXenesisRunEvent(agentEvent, XENESIS_AGENT_WORKBENCH_RUN_SOURCE), false);
});

test('shouldConsumeXenesisRunEvent keeps legacy unscoped events visible to the main Agent pane only', () => {
  const unscopedEvent: XenesisRunEvent = {
    event: 'assistant_message',
    data: {
      type: 'assistant_message',
      message: { role: 'assistant', content: 'legacy' },
    },
  };

  assert.equal(shouldConsumeXenesisRunEvent(unscopedEvent, XENESIS_AGENT_RUN_SOURCE, { allowUnscoped: true }), true);
  assert.equal(shouldConsumeXenesisRunEvent(unscopedEvent, XENESIS_AGENT_WORKBENCH_RUN_SOURCE), false);
});
