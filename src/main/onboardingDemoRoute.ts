import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  OnboardingDemoRouteOpenRequest,
  OnboardingDemoRouteOpenResult,
  OnboardingDemoRouteOpenTarget,
  OnboardingDemoRouteReadResult,
  OnboardingDemoRouteResult,
  OnboardingDemoRouteSaveRequest,
  OnboardingDemoRouteSaveResult,
  OnboardingDemoRouteScene,
  OnboardingDemoRouteStoryboard,
  OnboardingDemoRouteStoryboardExportResult,
} from '../shared/types';
import { getXenisHomePath } from './xenisHome.mjs';

export const ONBOARDING_DEMO_ROUTE_FILE_NAME = 'cr-onboarding-demo-route.json';
export const ONBOARDING_DEMO_ROUTE_STORYBOARD_FILE_NAME = 'cr-onboarding-demo-route.md';
export const ONBOARDING_DEMO_ROUTE_DEMO_PRESET_FILE_NAME = 'cr-onboarding-demo-route.xcon.md';

type OpenPath = (targetPath: string) => Promise<string>;

const BASIC_DESK_ONBOARDING_DEMO_SCENES = [
  { stepId: 'choose-workspace-folder', title: 'Choose a sample workspace' },
  { stepId: 'configure-ai-provider', title: 'Connect the Agent provider' },
  { stepId: 'connect-external-tools', title: 'Connect external tools' },
  { stepId: 'configure-mcp', title: 'Prepare MCP connections' },
  { stepId: 'open-settings-diagnostics', title: 'Open settings and diagnostics' },
  { stepId: 'save-restore-workspace', title: 'Save and restore the workspace layout' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function normalizeScene(value: unknown, fallbackIndex: number): OnboardingDemoRouteScene | null {
  if (!isRecord(value)) return null;
  const stepId = optionalString(value.stepId);
  if (!stepId) return null;
  return {
    index: optionalNumber(value.index) ?? fallbackIndex,
    stepId,
    title: optionalString(value.title) || stepId,
    caption: optionalString(value.caption),
    passed: optionalBoolean(value.passed),
    screenshotPath: optionalString(value.screenshotPath),
    screenshotFileName: optionalString(value.screenshotFileName),
  };
}

function normalizeStoryboard(value: unknown): OnboardingDemoRouteStoryboard | undefined {
  if (!isRecord(value)) return undefined;
  const scenes = Array.isArray(value.scenes)
    ? value.scenes
        .map((scene, index) => normalizeScene(scene, index))
        .filter((scene): scene is OnboardingDemoRouteScene => Boolean(scene))
    : [];
  return {
    title: optionalString(value.title) || 'Basic Desk onboarding demo route',
    trackId: optionalString(value.trackId) || 'basic-desk',
    sampleWorkspacePath: optionalString(value.sampleWorkspacePath),
    runId: optionalString(value.runId),
    runManifestPath: optionalString(value.runManifestPath),
    previewCapturePath: optionalString(value.previewCapturePath),
    scenes,
  };
}

function normalizeDemoRoute(value: unknown, routePath: string): OnboardingDemoRouteResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      outputPath: routePath,
      error: 'Demo route JSON is not an object.',
    };
  }

  const artifact = asRecord(value.artifact);
  const preview = asRecord(value.preview);
  const storyboardPreview = asRecord(value.storyboardPreview);
  return {
    ok: value.ok === true,
    mode: optionalString(value.mode),
    generatedAt: optionalString(value.generatedAt),
    outputPath: optionalString(value.outputPath) || routePath,
    storyboardPath: optionalString(value.storyboardPath),
    demoLabPresetPath: optionalString(value.demoLabPresetPath),
    artifact: artifact as OnboardingDemoRouteResult['artifact'],
    preview: preview as OnboardingDemoRouteResult['preview'],
    storyboardPreview: storyboardPreview as OnboardingDemoRouteResult['storyboardPreview'],
    storyboard: normalizeStoryboard(value.storyboard),
    sampleResetWarning: optionalString(value.sampleResetWarning),
    error: optionalString(value.error),
  };
}

function normalizeTarget(target: unknown): OnboardingDemoRouteOpenTarget {
  return target === 'run' ||
    target === 'preview' ||
    target === 'scene' ||
    target === 'storyboard' ||
    target === 'demoPreset'
    ? target
    : 'json';
}

function createOnboardingDemoRouteStoryboardFromScenario(
  request: OnboardingDemoRouteSaveRequest,
): OnboardingDemoRouteStoryboard {
  const scenario = request.scenario;
  const artifactStepMap = new Map((scenario.artifact?.steps ?? []).map((step) => [step.stepId, step]));
  const scenarioStepMap = new Map((scenario.steps ?? []).map((step) => [step.stepId, step]));
  const scenes: OnboardingDemoRouteScene[] = BASIC_DESK_ONBOARDING_DEMO_SCENES.map((definition, index) => {
    const artifactStep = artifactStepMap.get(definition.stepId);
    const scenarioStep = scenarioStepMap.get(definition.stepId);
    return {
      index,
      stepId: definition.stepId,
      title: definition.title,
      caption: artifactStep?.caption || scenarioStep?.caption || scenarioStep?.message || artifactStep?.message || '',
      passed: scenarioStep?.passed === true || artifactStep?.passed === true,
      screenshotPath:
        artifactStep?.screenshotPath || scenarioStep?.screenshotPath || scenarioStep?.capture?.filePath || '',
      screenshotFileName: artifactStep?.screenshotFileName || scenarioStep?.screenshotFileName || '',
    };
  });

  return {
    title: 'Basic Desk onboarding demo route',
    trackId: scenario.trackId || 'basic-desk',
    sampleWorkspacePath: scenario.sampleWorkspacePath || scenario.artifact?.sampleWorkspacePath,
    runId: scenario.artifact?.runId || scenario.requestId,
    runManifestPath: scenario.artifact?.manifestPath,
    previewCapturePath: request.preview?.capture?.filePath,
    scenes,
  };
}

function createOnboardingDemoRouteFromScenario(request: OnboardingDemoRouteSaveRequest): OnboardingDemoRouteResult {
  const scenario = request.scenario;
  const storyboard = createOnboardingDemoRouteStoryboardFromScenario(request);
  const routePath = getOnboardingDemoRoutePath();
  return {
    ok: scenario.ok === true && scenario.completed === true,
    mode: request.mode || 'ui-demo',
    generatedAt: new Date().toISOString(),
    outputPath: routePath,
    storyboardPath: getOnboardingDemoRouteStoryboardPath(),
    demoLabPresetPath: getOnboardingDemoRouteDemoPresetPath(),
    artifact: scenario.artifact,
    preview: request.preview
      ? {
          runId: request.preview.runId,
          capture: request.preview.capture,
        }
      : undefined,
    storyboard,
    error: scenario.error,
  };
}

function dirnameOrUndefined(targetPath: string | undefined): string | undefined {
  return targetPath ? path.dirname(targetPath) : undefined;
}

export function getOnboardingDemoRoutePath(): string {
  return getXenisHomePath(['mcp', 'cr-smoke', ONBOARDING_DEMO_ROUTE_FILE_NAME]);
}

export function getOnboardingDemoRouteStoryboardPath(): string {
  return getXenisHomePath(['mcp', 'cr-smoke', ONBOARDING_DEMO_ROUTE_STORYBOARD_FILE_NAME]);
}

export function getOnboardingDemoRouteDemoPresetPath(): string {
  return getXenisHomePath(['mcp', 'cr-smoke', ONBOARDING_DEMO_ROUTE_DEMO_PRESET_FILE_NAME]);
}

export async function readOnboardingDemoRoute(): Promise<OnboardingDemoRouteReadResult> {
  const routePath = getOnboardingDemoRoutePath();
  const exists = fs.existsSync(routePath);
  if (!exists) {
    return {
      ok: false,
      path: routePath,
      exists: false,
    };
  }

  try {
    const text = await fs.promises.readFile(routePath, 'utf8');
    const parsed = JSON.parse(text) as unknown;
    return {
      ok: true,
      path: routePath,
      exists: true,
      route: normalizeDemoRoute(parsed, routePath),
    };
  } catch (error) {
    return {
      ok: false,
      path: routePath,
      exists: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function markdownText(value: string | undefined): string {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .trim();
}

function markdownInline(value: string | undefined): string {
  return markdownText(value).replace(/\|/g, '\\|') || '-';
}

function markdownFileImage(targetPath: string | undefined, alt: string): string {
  if (!targetPath) return '';
  return `<img src="${pathToFileURL(targetPath).href}" alt="${markdownText(alt)}" width="720">`;
}

function demoPresetQuote(value: string | undefined): string {
  return JSON.stringify(markdownText(value));
}

function demoPresetSceneId(scene: OnboardingDemoRouteScene, index: number): string {
  const safe = scene.stepId
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return safe || `scene-${index + 1}`;
}

function demoPresetSceneActions(scene: OnboardingDemoRouteScene, index: number): Array<Record<string, unknown>> {
  return [
    {
      type: 'caption',
      target: 'timeline',
      text: scene.caption || scene.title || scene.stepId,
      duration: 360,
    },
    {
      type: 'focus',
      target: scene.stepId,
      duration: 180,
    },
    {
      type: 'render',
      target: scene.screenshotPath ? 'preview' : 'storyboard',
      duration: 520,
    },
    {
      type: 'callout',
      target: 'storyboard',
      text: `${index + 1}. ${scene.title || scene.stepId}`,
      duration: 320,
    },
  ];
}

export function createOnboardingDemoRouteDemoPresetMarkdown(
  route: OnboardingDemoRouteResult,
  routePath = getOnboardingDemoRoutePath(),
): string {
  const storyboard = route.storyboard;
  const title = markdownText(storyboard?.title) || 'Basic Desk onboarding demo route';
  const scenes = storyboard?.scenes ?? [];
  const lines: string[] = [
    '```xcon-demo',
    'format "xcon-demo-preset/v1"',
    `demo ${demoPresetQuote(title)}`,
    'mode "read-only"',
  ];

  scenes.forEach((scene, index) => {
    const sceneNumber = index + 1;
    lines.push(
      `scene.${sceneNumber}.id ${demoPresetQuote(demoPresetSceneId(scene, index))}`,
      `scene.${sceneNumber}.title ${demoPresetQuote(scene.title || scene.stepId)}`,
      `scene.${sceneNumber}.caption ${demoPresetQuote(scene.caption || '')}`,
      'scene.' + sceneNumber + '.action "render"',
      `scene.${sceneNumber}.actions ${JSON.stringify(demoPresetSceneActions(scene, index))}`,
      'scene.' + sceneNumber + '.duration 1400',
    );
  });

  lines.push(
    '```',
    '',
    `# ${title}`,
    '',
    'This Demo Lab preset was generated from the Basic Desk CR onboarding route.',
    '',
    `- Generated: ${markdownInline(route.generatedAt)}`,
    `- Mode: ${markdownInline(route.mode)}`,
    `- Run ID: ${markdownInline(storyboard?.runId || route.artifact?.runId)}`,
    `- Track: ${markdownInline(String(storyboard?.trackId || route.artifact?.trackId || 'basic-desk'))}`,
    `- Sample workspace: \`${markdownText(storyboard?.sampleWorkspacePath || route.artifact?.sampleWorkspacePath)}\``,
    `- Route JSON: \`${routePath}\``,
    '',
    '## Playback Preview',
    '',
    markdownFileImage(storyboard?.previewCapturePath || route.preview?.capture?.filePath, 'Onboarding route preview') ||
      '_No preview capture._',
    '',
    '## Scenes',
    '',
  );

  for (const scene of scenes) {
    lines.push(
      `### ${scene.index + 1}. ${markdownText(scene.title || scene.stepId)}`,
      '',
      scene.caption || '',
      '',
      markdownFileImage(scene.screenshotPath, scene.title || scene.stepId) || '_No screenshot._',
      '',
    );
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function createOnboardingDemoRouteStoryboardMarkdown(
  route: OnboardingDemoRouteResult,
  routePath = getOnboardingDemoRoutePath(),
): string {
  const storyboard = route.storyboard;
  const title = markdownText(storyboard?.title) || 'Basic Desk onboarding demo route';
  const scenes = storyboard?.scenes ?? [];
  const lines: string[] = [
    `# ${title}`,
    '',
    `- Generated: ${markdownInline(route.generatedAt)}`,
    `- Mode: ${markdownInline(route.mode)}`,
    `- Run ID: ${markdownInline(storyboard?.runId || route.artifact?.runId)}`,
    `- Track: ${markdownInline(String(storyboard?.trackId || route.artifact?.trackId || 'basic-desk'))}`,
    `- Sample workspace: \`${markdownText(storyboard?.sampleWorkspacePath || route.artifact?.sampleWorkspacePath)}\``,
    `- Route JSON: \`${routePath}\``,
    `- Run manifest: \`${markdownText(storyboard?.runManifestPath || route.artifact?.manifestPath)}\``,
    '',
    '## Preview',
    '',
    markdownFileImage(storyboard?.previewCapturePath || route.preview?.capture?.filePath, 'Onboarding route preview') ||
      '_No preview capture._',
    '',
    '## Scene Index',
    '',
    '| # | Step | Status | Caption | Screenshot |',
    '|---:|---|---|---|---|',
    ...scenes.map(
      (scene) =>
        `| ${scene.index + 1} | ${markdownInline(scene.title || scene.stepId)} | ${scene.passed ? 'passed' : 'pending'} | ${markdownInline(scene.caption)} | \`${markdownText(scene.screenshotPath)}\` |`,
    ),
    '',
    '## Scenes',
    '',
  ];

  for (const scene of scenes) {
    lines.push(
      `### ${scene.index + 1}. ${markdownText(scene.title || scene.stepId)}`,
      '',
      `- Step ID: \`${scene.stepId}\``,
      `- Status: ${scene.passed ? 'passed' : 'pending'}`,
      `- Caption: ${markdownText(scene.caption) || '-'}`,
      `- Screenshot: \`${markdownText(scene.screenshotPath)}\``,
      '',
      markdownFileImage(scene.screenshotPath, scene.title || scene.stepId) || '_No screenshot._',
      '',
    );
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export async function exportOnboardingDemoRouteStoryboard(): Promise<OnboardingDemoRouteStoryboardExportResult> {
  const result = await readOnboardingDemoRoute();
  const outputPath = getOnboardingDemoRouteStoryboardPath();
  if (!result.route) {
    return {
      ok: false,
      path: outputPath,
      routePath: result.path,
      sceneCount: 0,
      error: result.error || 'Demo route result has not been generated yet.',
    };
  }

  try {
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(
      outputPath,
      createOnboardingDemoRouteStoryboardMarkdown(result.route, result.path),
      'utf8',
    );
    return {
      ok: true,
      path: outputPath,
      routePath: result.path,
      sceneCount: result.route.storyboard?.scenes.length ?? 0,
    };
  } catch (error) {
    return {
      ok: false,
      path: outputPath,
      routePath: result.path,
      sceneCount: result.route.storyboard?.scenes.length ?? 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function exportOnboardingDemoRouteDemoPreset(): Promise<OnboardingDemoRouteStoryboardExportResult> {
  const result = await readOnboardingDemoRoute();
  const outputPath = getOnboardingDemoRouteDemoPresetPath();
  if (!result.route) {
    return {
      ok: false,
      path: outputPath,
      routePath: result.path,
      sceneCount: 0,
      error: result.error || 'Demo route result has not been generated yet.',
    };
  }

  try {
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(
      outputPath,
      createOnboardingDemoRouteDemoPresetMarkdown(result.route, result.path),
      'utf8',
    );
    return {
      ok: true,
      path: outputPath,
      routePath: result.path,
      sceneCount: result.route.storyboard?.scenes.length ?? 0,
    };
  } catch (error) {
    return {
      ok: false,
      path: outputPath,
      routePath: result.path,
      sceneCount: result.route.storyboard?.scenes.length ?? 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function saveOnboardingDemoRoute(
  request: OnboardingDemoRouteSaveRequest,
): Promise<OnboardingDemoRouteSaveResult> {
  const outputPath = getOnboardingDemoRoutePath();
  const scenario = request?.scenario;
  if (!scenario || !Array.isArray(scenario.steps) || scenario.steps.length === 0) {
    return {
      ok: false,
      path: outputPath,
      sceneCount: 0,
      error: 'Onboarding scenario result is required before generating a Demo Route.',
    };
  }

  const route = createOnboardingDemoRouteFromScenario(request);
  try {
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, `${JSON.stringify(route, null, 2)}\n`, 'utf8');

    const storyboardPath = getOnboardingDemoRouteStoryboardPath();
    const demoLabPresetPath = getOnboardingDemoRouteDemoPresetPath();
    await fs.promises.writeFile(storyboardPath, createOnboardingDemoRouteStoryboardMarkdown(route, outputPath), 'utf8');
    await fs.promises.writeFile(
      demoLabPresetPath,
      createOnboardingDemoRouteDemoPresetMarkdown(route, outputPath),
      'utf8',
    );

    return {
      ok: true,
      path: outputPath,
      route,
      storyboardPath,
      demoLabPresetPath,
      sceneCount: route.storyboard?.scenes.length ?? 0,
    };
  } catch (error) {
    return {
      ok: false,
      path: outputPath,
      route,
      sceneCount: route.storyboard?.scenes.length ?? 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resolveRouteTargetPath(
  routePath: string,
  route: OnboardingDemoRouteResult,
  request: OnboardingDemoRouteOpenRequest,
): string | undefined {
  const target = normalizeTarget(request.target);
  if (target === 'json') return routePath;
  if (target === 'run') {
    return optionalString(route.artifact?.path) || dirnameOrUndefined(route.storyboard?.runManifestPath);
  }
  if (target === 'preview') {
    return optionalString(route.storyboard?.previewCapturePath) || optionalString(route.preview?.capture?.filePath);
  }
  if (target === 'demoPreset') {
    return optionalString(route.demoLabPresetPath);
  }
  const stepId = optionalString(request.stepId);
  const scene =
    route.storyboard?.scenes.find((item) => item.stepId === stepId) ||
    route.storyboard?.scenes.find((item) => item.screenshotPath);
  return optionalString(scene?.screenshotPath);
}

export async function openOnboardingDemoRouteTarget(
  request: OnboardingDemoRouteOpenRequest = {},
  openPath: OpenPath = async () => 'No opener was provided.',
): Promise<OnboardingDemoRouteOpenResult> {
  const target = normalizeTarget(request.target);
  const result = await readOnboardingDemoRoute();
  if (!result.route) {
    return {
      ok: false,
      path: result.path,
      target,
      error: result.error || 'Demo route result has not been generated yet.',
    };
  }

  if (target === 'storyboard') {
    const exported = await exportOnboardingDemoRouteStoryboard();
    if (!exported.ok) {
      return {
        ok: false,
        path: exported.path,
        target,
        error: exported.error || `Demo route target "${target}" is not available.`,
      };
    }
    const error = await openPath(exported.path);
    return {
      ok: !error,
      path: exported.path,
      target,
      error: error || undefined,
    };
  }

  if (target === 'demoPreset') {
    const exported = await exportOnboardingDemoRouteDemoPreset();
    if (!exported.ok) {
      return {
        ok: false,
        path: exported.path,
        target,
        error: exported.error || `Demo route target "${target}" is not available.`,
      };
    }
    const error = await openPath(exported.path);
    return {
      ok: !error,
      path: exported.path,
      target,
      error: error || undefined,
    };
  }

  const targetPath = resolveRouteTargetPath(result.path, result.route, { ...request, target });
  if (!targetPath) {
    return {
      ok: false,
      path: result.path,
      target,
      error: `Demo route target "${target}" is not available.`,
    };
  }

  const error = await openPath(targetPath);
  return {
    ok: !error,
    path: targetPath,
    target,
    error: error || undefined,
  };
}
