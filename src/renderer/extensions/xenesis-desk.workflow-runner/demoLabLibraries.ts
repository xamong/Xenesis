import type { DemoScene, DemoSceneAction } from './demoLabPreset';

export interface DemoActionLibraryItem {
  type: string;
  label: string;
  description: string;
  action: DemoSceneAction;
}

export interface DemoSceneLibraryItem {
  id: string;
  label: string;
  description: string;
  scene: DemoScene;
}

function quoteAuthoringValue(value: NonNullable<DemoSceneAction['value']>): string {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}

function appendAuthoringProperty(
  lines: string[],
  indent: string,
  name: string,
  value: DemoSceneAction['value'] | undefined,
): void {
  if (value === undefined) return;
  lines.push(`${indent}${name} ${quoteAuthoringValue(value)}`);
}

export function createDemoActionSnippet(item: DemoActionLibraryItem): string {
  const action = item.action;
  const lines = [`    ${action.type}`];
  appendAuthoringProperty(lines, '      ', 'target', action.target);
  appendAuthoringProperty(lines, '      ', 'text', action.text);
  appendAuthoringProperty(lines, '      ', 'path', action.path);
  appendAuthoringProperty(lines, '      ', 'value', action.value);
  appendAuthoringProperty(lines, '      ', 'status', action.status);
  appendAuthoringProperty(lines, '      ', 'label', action.label);
  appendAuthoringProperty(lines, '      ', 'easing', action.easing);
  appendAuthoringProperty(lines, '      ', 'clear', action.clear);
  appendAuthoringProperty(lines, '      ', 'append', action.append);
  appendAuthoringProperty(lines, '      ', 'fadeIn', action.fadeIn);
  appendAuthoringProperty(lines, '      ', 'fadeOut', action.fadeOut);
  appendAuthoringProperty(lines, '      ', 'hold', action.hold);
  appendAuthoringProperty(lines, '      ', 'x', action.x);
  appendAuthoringProperty(lines, '      ', 'y', action.y);
  appendAuthoringProperty(lines, '      ', 'duration', action.duration);
  return lines.join('\n');
}

export function createDemoSceneSnippet(item: DemoSceneLibraryItem): string {
  const scene = item.scene;
  const lines = [
    `scene ${quoteAuthoringValue(scene.title)}`,
    `  id ${quoteAuthoringValue(scene.id)}`,
    `  caption ${quoteAuthoringValue(scene.caption)}`,
    `  action ${quoteAuthoringValue(scene.action)}`,
    `  duration ${scene.duration}`,
    '  actions',
    ...(scene.actions ?? []).map((action) =>
      createDemoActionSnippet({
        type: action.type,
        label: action.type,
        description: '',
        action,
      }),
    ),
  ];
  return lines.join('\n');
}

export const DEFAULT_AUTHORING_SCENE_SNIPPET = [
  'scene "New scene"',
  '  id "new-scene"',
  '  caption "Describe what the viewer should see."',
  '  action "render"',
  '  duration 700',
  '  actions',
  '    render',
  '      target "artifact"',
  '      duration 700',
].join('\n');

export const DEMO_ACTION_LIBRARY: DemoActionLibraryItem[] = [
  {
    type: 'focus',
    label: 'focus',
    description: 'Focus a visible demo target before the next action runs.',
    action: { type: 'focus', target: 'preview', duration: 180 },
  },
  {
    type: 'typeText',
    label: 'typeText',
    description: 'Stream text into the focused source or chat area.',
    action: { type: 'typeText', target: 'source', text: 'Type generated script', duration: 900 },
  },
  {
    type: 'stream',
    label: 'stream',
    description: 'Stream the demo Markdown/SKETCH source into the live artifact preview.',
    action: { type: 'stream', target: 'artifact', text: 'Stream generated document', duration: 1200 },
  },
  {
    type: 'cursorMove',
    label: 'cursorMove',
    description: 'Move the demo cursor to a visible coordinate.',
    action: { type: 'cursorMove', target: 'preview', x: 160, y: 80, duration: 300 },
  },
  {
    type: 'cursorClick',
    label: 'cursorClick',
    description: 'Pulse the cursor at a selected target.',
    action: { type: 'cursorClick', target: 'preview', x: 160, y: 80, duration: 240 },
  },
  {
    type: 'highlight',
    label: 'highlight',
    description: 'Highlight an artifact, timeline, or source region.',
    action: { type: 'highlight', target: 'artifact', text: 'Highlight generated UI', duration: 320 },
  },
  {
    type: 'callout',
    label: 'callout',
    description: 'Show a short explanatory callout.',
    action: { type: 'callout', target: 'artifact', text: 'Generated in place', duration: 420 },
  },
  {
    type: 'fixture',
    label: 'fixture',
    description: 'Mark fixture data as loaded or updated.',
    action: { type: 'fixture', target: 'fixture', status: 'loaded', text: 'Fixture JSON loaded', duration: 260 },
  },
  {
    type: 'setFixture',
    label: 'setFixture',
    description: 'Patch a fixture path during playback and trigger bound UI updates.',
    action: { type: 'setFixture', path: 'record.workflow.status', value: 'Updated', duration: 260 },
  },
  {
    type: 'chain',
    label: 'chain',
    description: 'Mark chain aliases as resolved.',
    action: { type: 'chain', target: 'chain', status: 'bound', text: 'Chain aliases resolved', duration: 260 },
  },
  {
    type: 'workflow',
    label: 'workflow',
    description: 'Replay a workflow step in the scene runner.',
    action: { type: 'workflow', target: 'scene-runner', text: 'Run workflow replay', duration: 500 },
  },
  {
    type: 'workflowEvent',
    label: 'workflowEvent',
    description: 'Apply a workflow event to runtime state.',
    action: {
      type: 'workflowEvent',
      target: 'workflow',
      status: 'completed',
      text: 'Workflow event applied',
      duration: 320,
    },
  },
  {
    type: 'wait',
    label: 'wait',
    description: 'Hold the current scene for operator review.',
    action: { type: 'wait', target: 'runtime', text: 'Hold for review', duration: 300 },
  },
  {
    type: 'render',
    label: 'render',
    description: 'Trigger the artifact render state.',
    action: { type: 'render', target: 'artifact', text: 'Render artifact', duration: 500 },
  },
  {
    type: 'caption',
    label: 'caption',
    description: 'Set a visible scene caption.',
    action: { type: 'caption', text: 'Narrate this scene', duration: 260 },
  },
];

export const DEMO_SCENE_LIBRARY: DemoSceneLibraryItem[] = [
  {
    id: 'llm-stream',
    label: 'LLM stream',
    description: 'Stream generated Markdown, SKETCH, chain, and fixture source into the demo.',
    scene: {
      id: 'llm-stream',
      title: 'LLM stream',
      caption: 'Generate Markdown + XCON/SKETCH in the source stream.',
      action: 'stream',
      actions: [
        { type: 'caption', text: 'Generate Markdown + XCON/SKETCH in the source stream.', duration: 260 },
        { type: 'focus', target: 'source', duration: 180 },
        {
          type: 'typeText',
          target: 'source',
          text: 'Stream Markdown, SKETCH, chain aliases, and fixture updates.',
          duration: 1200,
        },
        { type: 'render', target: 'artifact', duration: 500 },
      ],
      duration: 2140,
    },
  },
  {
    id: 'render-artifact',
    label: 'Render artifact',
    description: 'Reveal the generated artifact and focus the preview surface.',
    scene: {
      id: 'render-artifact',
      title: 'Render artifact',
      caption: 'Render the completed Markdown + XCON/SKETCH artifact.',
      action: 'render',
      actions: [
        { type: 'caption', text: 'Render the completed Markdown + XCON/SKETCH artifact.', duration: 260 },
        { type: 'focus', target: 'preview', duration: 180 },
        { type: 'render', target: 'artifact', text: 'Render artifact', duration: 640 },
        { type: 'highlight', target: 'artifact', text: 'Generated artifact', duration: 360 },
      ],
      duration: 1440,
    },
  },
  {
    id: 'bind-fixture',
    label: 'Bind fixture',
    description: 'Load fixture JSON and resolve chain aliases before replay.',
    scene: {
      id: 'bind-fixture',
      title: 'Bind fixture',
      caption: 'Load fixture data and resolve XCON Chain aliases.',
      action: 'binding',
      actions: [
        { type: 'fixture', target: 'fixture', status: 'loaded', text: 'Fixture JSON loaded', duration: 360 },
        { type: 'chain', target: 'chain', status: 'bound', text: 'Chain aliases resolved', duration: 360 },
        { type: 'render', target: 'artifact', text: 'Update bound document', duration: 520 },
      ],
      duration: 1240,
    },
  },
  {
    id: 'run-workflow',
    label: 'Run workflow',
    description: 'Replay queue, scheduler, and workflow events against the artifact.',
    scene: {
      id: 'run-workflow',
      title: 'Run workflow',
      caption: 'Replay workflow events and synchronize runtime state.',
      action: 'workflow',
      actions: [
        { type: 'workflow', target: 'scene-runner', text: 'Start workflow replay', duration: 500 },
        { type: 'workflowEvent', target: 'workflow', status: 'queued', text: 'Queue event accepted', duration: 320 },
        { type: 'workflowEvent', target: 'workflow', status: 'completed', text: 'Workflow completed', duration: 420 },
      ],
      duration: 1240,
    },
  },
  {
    id: 'compare-before-after',
    label: 'Compare before/after',
    description: 'Show a before/after result with cursor and highlight emphasis.',
    scene: {
      id: 'compare-before-after',
      title: 'Compare before/after',
      caption: 'Compare the initial source with the generated artifact.',
      action: 'compare',
      actions: [
        { type: 'focus', target: 'source', duration: 220 },
        { type: 'cursorMove', target: 'source', x: 96, y: 80, duration: 260 },
        { type: 'focus', target: 'preview', duration: 220 },
        { type: 'highlight', target: 'artifact', text: 'Updated result', duration: 420 },
        { type: 'callout', target: 'artifact', text: 'Before and after are synchronized.', duration: 500 },
      ],
      duration: 1620,
    },
  },
  {
    id: 'closing',
    label: 'Closing',
    description: 'End the demo with a concise completion status.',
    scene: {
      id: 'closing',
      title: 'Closing',
      caption: 'Complete the replay and hold the final generated state.',
      action: 'complete',
      actions: [
        { type: 'caption', text: 'Complete the replay and hold the final generated state.', duration: 260 },
        { type: 'callout', target: 'artifact', text: 'Demo playback complete', duration: 420 },
        { type: 'wait', target: 'runtime', text: 'Hold final state', duration: 520 },
      ],
      duration: 1200,
    },
  },
];
