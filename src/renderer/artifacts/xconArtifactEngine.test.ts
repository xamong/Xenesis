import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { AppSettings } from '../../shared/types';
import {
  createXconArtifactDiagnosticDetails,
  createXconArtifactDiagnosticTranscript,
  createXconArtifactProviderPlan,
  prepareXconArtifactResult,
  runXconArtifactAutomaticRepair,
  runXconArtifactProvider,
} from './xconArtifactEngine';

test('XCON artifact engine builds Gowoori-compatible prompt plans for Xenesis', () => {
  const plan = createXconArtifactProviderPlan({
    surface: 'xenesis',
    provider: 'mock',
    mode: 'generate',
    prompt: '이번주 제주도 날씨 알려줘',
  });

  assert.equal(plan.surface, 'xenesis');
  assert.equal(plan.route.intent, 'weather-weekly');
  assert.equal(plan.providerRequest.provider, 'mock');
  assert.match(plan.llmPrompt, /You are generating a Gowoori artifact/);
  assert.match(plan.llmPrompt, /chart,?\s+and spanGrid/i);
  assert.match(plan.llmPrompt, /Every xcon-sketch block begins with a screen declaration/);
  assert.match(plan.llmPrompt, /User request:\n이번주 제주도 날씨 알려줘/);
  assert.doesNotMatch(plan.llmPrompt, /\?\? \?\?/);
});

test('XCON artifact engine routes provider plans from the semantic user prompt instead of prompt-pack examples', () => {
  const fullPromptWithExamples = [
    'The user is making a fresh artifact request inside Xenesis Agent.',
    'Current user request:',
    'Capability Registry 요약을 chart, spanGrid, map 없이 간단히 보여줘.',
    '',
    'Prompt pack examples:',
    'Weather: summary card for short questions; weekly dashboard with chart and spanGrid for detailed or weekly questions.',
    'Use this tool result as the source of truth for the weekly weather dashboard.',
    'The xcon-sketch output must include chart and spanGrid sections derived from this tool result.',
    'User request:',
    '이번주 제주도 날씨 알려줘.',
  ].join('\n');

  const plan = createXconArtifactProviderPlan({
    surface: 'xenesis',
    provider: 'mock',
    mode: 'generate',
    prompt: fullPromptWithExamples,
    semanticPrompt: 'Capability Registry 요약을 chart, spanGrid, map 없이 간단히 보여줘.',
  });

  assert.notEqual(plan.route.intent, 'weather-weekly');
  assert.doesNotMatch(plan.route.description, /weather|날씨|제주|weekly/i);
  assert.doesNotMatch(
    plan.llmPrompt,
    /Agent intent: weather-weekly|Create a detailed weather dashboard|weekly weather dashboard/i,
  );
  assert.match(plan.llmPrompt, /User request:\nThe user is making a fresh artifact request inside Xenesis Agent\./);
});

test('XCON artifact engine prepares renderable artifacts even when validation has warnings', () => {
  const source = [
    '# Demo',
    '',
    '```xcon-sketch',
    'screen "Demo" 360x220',
    '  title: label "Ready" at 20 20 120 24',
    '    color "#111827"',
    '```',
  ].join('\n');

  const result = prepareXconArtifactResult({
    surface: 'xenesis',
    provider: 'mock',
    mode: 'generate',
    prompt: '데모 카드 만들어줘',
    applyLabel: 'Demo Card',
    source,
    summary: 'Demo card ready',
    autoApply: true,
    startedAt: 100,
    completedAt: 200,
  });

  assert.equal(result.surface, 'xenesis');
  assert.equal(result.willApply, true);
  assert.equal(result.actionState.canApply, true);
  assert.equal(result.actionState.canPreview, true);
  assert.match(result.finalSource, /```xcon-sketch/);
});

test('XCON artifact engine exposes detailed diagnostics for Xenesis CR quality checks', () => {
  const source = [
    '# Broken card',
    '',
    '```xcon-sketch',
    'screen "Broken" 360x220 bg #ffffff',
    '  title: label "Missing color" at 20 20 180 24',
    '  aliasLabel: label "$missingAlias" at 20 60 180 24',
    '    color "#111827"',
    '```',
  ].join('\n');

  const result = prepareXconArtifactResult({
    surface: 'xenesis',
    provider: 'mock',
    mode: 'generate',
    prompt: '문제 있는 카드 만들어줘',
    applyLabel: 'Broken Card',
    source,
    summary: 'Broken card',
    autoApply: true,
    startedAt: 100,
    completedAt: 200,
  });

  const details = createXconArtifactDiagnosticDetails(result);
  const transcript = createXconArtifactDiagnosticTranscript(result);

  assert.equal(
    details.some((detail) => detail.severity === 'error'),
    true,
  );
  assert.equal(
    details.some((detail) => detail.source === 'validation'),
    true,
  );
  assert.equal(
    details.some((detail) => /missing an explicit color/i.test(detail.message)),
    true,
  );
  assert.equal(
    details.some((detail) => /missingAlias/i.test(detail.message)),
    true,
  );
  assert.match(transcript, /XCON diagnostics:/);
  assert.match(transcript, /- error \[validation\]:/);
});

test('XCON artifact engine repairs diagnostic-heavy artifacts through the selected provider once', async () => {
  const brokenSource = [
    '# Broken card',
    '',
    '```xcon-sketch',
    'screen "Broken" 360x220 bg #ffffff',
    '  title: label "Missing color" at 20 20 180 24',
    '  aliasLabel: label "$missingAlias" at 20 60 180 24',
    '    color "#111827"',
    '```',
  ].join('\n');
  const repairedSource = [
    '# Fixed card',
    '',
    '```xcon-sketch',
    'screen "Fixed" 360x220 bg #ffffff',
    '  title: label "Fixed" at 20 20 180 24',
    '    color "#111827"',
    '  body: label "Ready for preview" at 20 60 180 24',
    '    color "#374151"',
    '```',
  ].join('\n');
  const resultInput = {
    surface: 'xenesis' as const,
    provider: 'codex' as const,
    mode: 'generate' as const,
    prompt: '문제 없는 카드로 고쳐줘',
    applyLabel: 'Broken Card',
    source: brokenSource,
    summary: 'Broken card',
    autoApply: true,
    startedAt: 100,
    completedAt: 200,
  };
  const initialArtifact = prepareXconArtifactResult(resultInput);
  const repairPrompts: string[] = [];

  const outcome = await runXconArtifactAutomaticRepair({
    initialArtifact,
    resultInput,
    execution: {
      providerSettings: {
        provider: 'codex',
        promptMode: 'stdin',
        commandArgs: '',
        commandOverrides: {},
        timeoutMs: 12345,
        livePreview: true,
        apiBaseUrl: '',
        apiModel: '',
        sportsStandingsEndpoint: '',
      },
      terminalApi: {
        spawn: async () => ({
          id: 'terminal-1',
          kind: 'shell' as const,
          pid: 1001,
          shell: 'powershell' as const,
          command: '',
          cwd: '',
        }),
        write: async () => undefined,
        onData: () => () => undefined,
        onExit: () => () => undefined,
        kill: async () => undefined,
        getSettings: async () => ({}) as AppSettings,
      },
      resolveApiRuntime: async () => {
        throw new Error('API runtime should not be resolved by the injected repair runner');
      },
      runner: async (options) => {
        assert.equal(options.mode, 'repair');
        assert.match(options.prompt, /Automatic Gowoori repair request/);
        assert.match(options.prompt, /missingAlias/);
        return {
          kind: 'artifact',
          provider: options.provider,
          source: repairedSource,
          summary: 'Fixed card',
        };
      },
    },
    onRepairPrompt: (prompt) => repairPrompts.push(prompt),
  });

  assert.equal(outcome.autoRepairAttempted, true);
  assert.equal(outcome.autoRepairSucceeded, true);
  assert.equal(outcome.repairBeforeDiagnosticsCount > outcome.repairAfterDiagnosticsCount, true);
  assert.equal(repairPrompts.length, 1);
  assert.match(outcome.finalArtifact.finalSource, /Fixed card/);
  assert.equal(
    createXconArtifactDiagnosticDetails(outcome.finalArtifact).some((detail) => detail.severity === 'error'),
    false,
  );
});

test('XCON artifact engine repairs from semantic prompt instead of prompt-pack examples', async () => {
  const fullPromptWithWeatherExamples = [
    'The user is making a fresh artifact request inside Xenesis Agent.',
    'Current user request:',
    'Capability Registry 상태를 짧은 요약 카드로 보여줘.',
    '',
    'Prompt pack examples:',
    'Agent intent: weather-weekly',
    'Weather: weekly dashboard with chart and spanGrid for detailed weather questions.',
    'Domain data packet: {"city":"제주","summary":"제주 주간 날씨"}',
    'User request:',
    '이번주 제주도 날씨 알려줘.',
  ].join('\n');
  const brokenSource = [
    '# Broken CR card',
    '',
    '```xcon-sketch',
    'screen "Broken CR" 360x220 bg #ffffff',
    '  title: label "Capability Registry" at 20 20 220 24',
    '  aliasLabel: label "$missingAlias" at 20 60 220 24',
    '    color "#111827"',
    '```',
  ].join('\n');
  const repairedSource = [
    '# Capability Registry',
    '',
    '```xcon-sketch',
    'screen "Capability Registry" 420x240 bg #ffffff',
    '  card: panel at 20 20 380 180',
    '    backgroundColor "#ffffff"',
    '    border',
    '      visible true',
    '      width 1',
    '      color "#dbe4ee"',
    '      radius 8',
    '    title: label "Capability Registry" at 18 18 220 26',
    '      color "#111827"',
    '    body: label "DEV bridge and CR route are ready." at 18 58 300 24',
    '      color "#374151"',
    '```',
  ].join('\n');
  const resultInput = {
    surface: 'xenesis' as const,
    provider: 'codex' as const,
    mode: 'generate' as const,
    prompt: fullPromptWithWeatherExamples,
    semanticPrompt: 'Capability Registry 상태를 짧은 요약 카드로 보여줘.',
    applyLabel: 'Capability Registry',
    source: brokenSource,
    summary: 'Broken CR card',
    autoApply: true,
    startedAt: 100,
    completedAt: 200,
  };
  const initialArtifact = prepareXconArtifactResult(resultInput);
  const repairPrompts: string[] = [];

  await runXconArtifactAutomaticRepair({
    initialArtifact,
    resultInput,
    execution: {
      providerSettings: {
        provider: 'codex',
        promptMode: 'stdin',
        commandArgs: '',
        commandOverrides: {},
        timeoutMs: 12345,
        livePreview: true,
        apiBaseUrl: '',
        apiModel: '',
        sportsStandingsEndpoint: '',
      },
      terminalApi: {
        spawn: async () => ({
          id: 'terminal-1',
          kind: 'shell' as const,
          pid: 1001,
          shell: 'powershell' as const,
          command: '',
          cwd: '',
        }),
        write: async () => undefined,
        onData: () => () => undefined,
        onExit: () => () => undefined,
        kill: async () => undefined,
        getSettings: async () => ({}) as AppSettings,
      },
      resolveApiRuntime: async () => {
        throw new Error('API runtime should not be resolved by the injected repair runner');
      },
      runner: async (options) => {
        assert.equal(options.semanticPrompt, 'Capability Registry 상태를 짧은 요약 카드로 보여줘.');
        repairPrompts.push(options.prompt);
        return {
          kind: 'artifact',
          provider: options.provider,
          source: repairedSource,
          summary: 'Capability Registry',
        };
      },
    },
    onRepairPrompt: (prompt) => repairPrompts.push(prompt),
  });

  assert.equal(repairPrompts.length, 2);
  assert.match(repairPrompts[0], /Original user request:\nCapability Registry 상태를 짧은 요약 카드로 보여줘\./);
  assert.doesNotMatch(repairPrompts[0], /weather-weekly|제주|날씨|weekly weather/i);
});

test('XCON artifact engine does not expose natural prompt auto-routing', () => {
  const source = readFileSync(new URL('./xconArtifactEngine.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /shouldRouteXenesisInputToArtifact/);
  assert.doesNotMatch(source, /STRONG_ARTIFACT_TERMS/);
  assert.doesNotMatch(source, /routeGowooriUserPrompt\(input,\s*'generate'\)/);
});

test('XCON artifact engine executes selected real provider through injected Gowoori runner options', async () => {
  const providerSettings = {
    provider: 'codex',
    promptMode: 'stdin',
    commandArgs: '',
    commandOverrides: {},
    timeoutMs: 12345,
    livePreview: true,
    apiBaseUrl: '',
    apiModel: '',
    sportsStandingsEndpoint: '',
  } as const;
  const terminalApi = {
    spawn: async () => ({
      id: 'terminal-1',
      kind: 'shell' as const,
      pid: 1001,
      shell: 'powershell' as const,
      command: '',
      cwd: '',
    }),
    write: async () => undefined,
    onData: () => () => undefined,
    onExit: () => () => undefined,
    kill: async () => undefined,
    getSettings: async () => ({}) as AppSettings,
  };
  const statusUpdates: string[] = [];
  const chunks: string[] = [];
  let receivedProvider = '';

  const result = await runXconArtifactProvider({
    surface: 'xenesis',
    provider: 'codex',
    mode: 'generate',
    prompt: '차트 대시보드 만들어줘',
    execution: {
      providerSettings,
      terminalApi,
      resolveApiRuntime: async () => {
        throw new Error('API runtime should not be resolved by the injected test runner');
      },
      runner: async (options) => {
        receivedProvider = options.provider;
        options.onStatus?.('Codex CLI running');
        options.onChunk?.('# Generated\n');
        return {
          kind: 'artifact',
          provider: options.provider,
          source: '# Generated\n\n```xcon-sketch\nscreen "Demo" 320x200\n```',
          summary: 'Generated demo',
        };
      },
      onStatus: (status) => statusUpdates.push(status),
      onChunk: (chunk) => chunks.push(chunk),
    },
  });

  assert.equal(receivedProvider, 'codex');
  assert.equal(result.providerResult.kind, 'artifact');
  assert.equal(result.providerResult.provider, 'codex');
  assert.deepEqual(statusUpdates, ['Codex CLI running']);
  assert.deepEqual(chunks, ['# Generated\n']);
});
