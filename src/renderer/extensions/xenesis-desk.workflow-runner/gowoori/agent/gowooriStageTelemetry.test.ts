import assert from 'node:assert/strict';
import test from 'node:test';
import { activityTimelineStore } from '../../../../observability/activityTimelineStore';
import { networkMonitorStore } from '../../../../observability/networkMonitorStore';
import {
  installRendererProducerObservability,
  uninstallRendererProducerObservability,
} from '../../../../observability/rendererProducerObservability';
import { finishGowooriGeneratedArtifact } from './gowooriGeneratedArtifactFinalizer';
import { observeGowooriStage } from './gowooriStageTelemetry';

const VALID_ARTIFACT = [
  '# Ready',
  '',
  '```xcon-sketch',
  'screen "Ready" 320x180 bg #ffffff',
  '  title: label "Ready" at 20 20 160 28',
  '    color #111111',
  '```',
].join('\n');

test('gowoori stage telemetry records completed stages in renderer observability stores', async () => {
  activityTimelineStore.clear();
  networkMonitorStore.clear();
  const target = new EventTarget() as EventTarget & typeof globalThis;
  installRendererProducerObservability(target);

  const result = await observeGowooriStage(
    {
      target,
      stage: 'generate',
      provider: 'mock',
      mode: 'generate',
      prompt: 'Create a polished weather dashboard with fixture data.',
      detail: { providerKind: 'local' },
    },
    async () => ({ sourceLength: 128, summary: 'Generated artifact' }),
  );

  assert.equal(result.summary, 'Generated artifact');
  const [activity] = activityTimelineStore.getEvents({ source: 'gowoori', limit: 1 });
  assert.equal(activity.label, 'gowoori.generation.generate');
  assert.equal(activity.status, 'completed');
  assert.match(activity.detail ?? '', /"provider":"mock"/);
  assert.match(activity.detail ?? '', /"promptPreview":"Create a polished weather dashboard/);

  const [network] = networkMonitorStore.getEntries({ source: 'gowoori', limit: 1 });
  assert.equal(network.url, 'gowoori://generation/generate');
  assert.equal(network.status, 200);
  assert.match(network.requestBody ?? '', /"mode":"generate"/);
  assert.match(network.responseBody ?? '', /"sourceLength":128/);

  uninstallRendererProducerObservability(target);
});

test('gowoori finalizer emits preflight, finalize, and apply stage telemetry', async () => {
  activityTimelineStore.clear();
  networkMonitorStore.clear();
  const target = new EventTarget() as EventTarget & typeof globalThis;
  installRendererProducerObservability(target);

  await finishGowooriGeneratedArtifact({
    telemetryTarget: target,
    rawSource: VALID_ARTIFACT,
    summary: 'Ready artifact',
    originalPrompt: 'Create a ready status card.',
    applyLabel: 'Test artifact',
    successStatus: 'Generated. Applying to Gowoori.',
    targetMode: 'new',
    allowAutomaticRepair: false,
    qualityProvider: 'mock',
    qualityMode: 'generate',
    autoApply: true,
    prepareArtifactSource: (source) => ({ source, changed: false, renderable: true, diagnostics: [] }),
    recordArtifactDiagnostics: () => undefined,
    runAutomaticRepairAttempt: async () => null,
    applySourceToGowoori: async () => undefined,
    appendQualityLogEntry: () => undefined,
    appendAssistantMessage: () => undefined,
    appendRepairComparison: () => undefined,
    setInspectorTab: () => undefined,
    setIsGenerating: () => undefined,
    setStatus: () => undefined,
    clearAbortController: () => undefined,
    clearLivePreviewTarget: () => undefined,
    createMessageId: () => 'message-1',
  } as Parameters<typeof finishGowooriGeneratedArtifact>[0] & { telemetryTarget: EventTarget });

  const labels = activityTimelineStore
    .getEvents({ source: 'gowoori', limit: 10 })
    .map((event) => event.label)
    .sort();

  assert.deepEqual(labels, ['gowoori.generation.apply', 'gowoori.generation.finalize', 'gowoori.generation.preflight']);

  uninstallRendererProducerObservability(target);
});
