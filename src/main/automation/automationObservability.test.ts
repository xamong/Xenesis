import assert from 'node:assert/strict';
import test from 'node:test';

import type { AutomationEvent } from '../../shared/types';
import { AutomationController } from './automationController';
import { createAutomationSemanticObservation } from './automationObservability';

test('maps allowed assistant stream events to terminal semantic observability', () => {
  const observation = createAutomationSemanticObservation({
    id: 'event-1',
    termId: 'term-abc',
    at: '2026-06-22T00:00:00.000Z',
    kind: 'stream',
    streamText: '작업이 완료되었습니다.',
    relay: 'allow',
    relaySource: 'assistant',
    relayText: '작업이 완료되었습니다.',
    relayFilterProfile: 'codex',
  });

  assert.ok(observation);
  assert.equal(observation.descriptor.activity?.source, 'terminal');
  assert.equal(observation.descriptor.activity?.label, 'terminal.output.semantic.assistant');
  assert.match(observation.descriptor.activity?.detail ?? '', /term-abc/);
  assert.equal(observation.descriptor.network?.source, 'terminal');
  assert.equal(observation.descriptor.network?.method, 'POST');
  assert.equal(observation.descriptor.network?.url, 'terminal://automation/term-abc/stream/assistant');
  assert.match(observation.descriptor.network?.requestBody ?? '', /codex/);
  assert.equal(observation.result.ok, true);
});

test('maps user prompt echoes as blocked semantic output without treating them as failures', () => {
  const observation = createAutomationSemanticObservation({
    id: 'event-2',
    termId: 'term-abc',
    at: '2026-06-22T00:00:01.000Z',
    kind: 'user_input',
    input: '이번주 제주도 날씨 어때?',
    relay: 'block',
    relaySource: 'user',
    relayText: '이번주 제주도 날씨 어때?',
    relayFilterProfile: 'codex',
  });

  assert.ok(observation);
  assert.equal(observation.descriptor.activity?.label, 'terminal.output.semantic.user');
  assert.equal(observation.descriptor.network?.url, 'terminal://automation/term-abc/user_input/user');
  assert.equal(observation.result.ok, true);
  assert.equal(observation.result.status, 200);
});

test('automation controller calls the semantic observer for stream events', async () => {
  const observed: AutomationEvent[] = [];
  const notified: AutomationEvent[] = [];
  const controller = new AutomationController({
    termId: 'term-test',
    stage: 1,
    write: () => {},
    notifyStatus: () => {},
    notifyEvent: (event) => notified.push(event),
    observeEvent: (event) => observed.push(event),
    settings: {
      defaultMode: 'stream',
      streamFilterProfile: 'codex',
      defaultStage: 1,
      autoSend: false,
      regexRules: [],
      llmApiKey: '',
      llmModel: '',
      extraDangerPatterns: [],
    },
    fallbackApiKey: '',
    getStreamContext: () => ({ lastCommand: 'codex' }),
  });

  controller.setEnabled(true);
  observed.splice(0, observed.length);
  notified.splice(0, notified.length);

  await controller.onOutput('최종 답변입니다.\r\n');

  assert.equal(notified.length, 1);
  assert.equal(observed.length, 1);
  assert.equal(observed[0].kind, 'stream');
  assert.equal(observed[0].streamText, '최종 답변입니다.');
});
