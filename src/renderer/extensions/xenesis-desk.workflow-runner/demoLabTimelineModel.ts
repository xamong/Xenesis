export const DEMO_LAB_TIMELINE_FRAME_MS = 100;

export interface DemoLabTimelineSceneAction {
  type: string;
  target?: string;
  text?: string;
  value?: string | number | boolean | Record<string, unknown>;
  status?: string;
  x?: number;
  y?: number;
  duration?: number;
}

export interface DemoLabTimelineScene {
  id: string;
  title: string;
  caption: string;
  action: string;
  actions?: DemoLabTimelineSceneAction[];
  duration: number;
}

type DemoLabTimelineClipKind = 'scene' | 'action';

export interface DemoLabTimelineClipTag {
  kind: DemoLabTimelineClipKind;
  sceneIndex: number;
  actionIndex: number;
}

export interface DemoLabTimelineTrackTag {
  kind: 'scene-list' | 'action-list';
  sceneIndex: number;
}

export interface DemoLabTimelineClip {
  name: string;
  start: number;
  length: number;
  color: string;
  textColor: string;
  selected: boolean;
  tag: DemoLabTimelineClipTag;
}

export interface DemoLabTimelineTrack {
  name: string;
  clips: DemoLabTimelineClip[];
  height: number;
  trackColor: string;
  tag: DemoLabTimelineTrackTag;
}

export interface DemoLabPomeloTimelineModel {
  tracks: DemoLabTimelineTrack[];
  frameCount: number;
}

interface DemoLabTimelineSceneMetric {
  startFrame: number;
  frameLength: number;
}

function clampDuration(duration: number): number {
  return Math.max(80, Math.round(Number.isFinite(duration) ? duration : 80));
}

export function durationToTimelineFrames(duration: number): number {
  return Math.max(1, Math.round(Math.max(0, Number(duration) || 0) / DEMO_LAB_TIMELINE_FRAME_MS));
}

export function getSceneActionsForTimeline(scene: DemoLabTimelineScene): DemoLabTimelineSceneAction[] {
  if (Array.isArray(scene.actions) && scene.actions.length > 0) {
    return scene.actions;
  }

  const actions: DemoLabTimelineSceneAction[] = [];
  if (scene.caption) {
    actions.push({ type: 'caption', text: scene.caption, duration: Math.min(scene.duration, 240) });
  }
  actions.push({ type: scene.action || 'render', target: scene.id, duration: scene.duration });
  return actions;
}

export function getTimelineActionDuration(
  scene: DemoLabTimelineScene,
  action: DemoLabTimelineSceneAction,
  actionCount: number,
): number {
  return action.duration ?? Math.max(80, Math.round(scene.duration / Math.max(actionCount, 1)));
}

export function getDemoSceneTimelineDuration(scene: DemoLabTimelineScene): number {
  const actions = getSceneActionsForTimeline(scene);
  const actionDuration = actions.reduce(
    (sum, action) => sum + clampDuration(getTimelineActionDuration(scene, action, actions.length)),
    0,
  );
  return Math.max(200, clampDuration(scene.duration || 700), actionDuration);
}

function createClip(
  name: string,
  start: number,
  length: number,
  color: string,
  tag: DemoLabTimelineClipTag,
): DemoLabTimelineClip {
  return {
    name,
    start,
    length,
    color,
    textColor: '#f8fafc',
    selected: false,
    tag,
  };
}

function getSceneMetrics(scenes: DemoLabTimelineScene[]): DemoLabTimelineSceneMetric[] {
  let sceneStartFrame = 0;
  return scenes.map((scene) => {
    const actions = getSceneActionsForTimeline(scene);
    const sceneFrameLength = durationToTimelineFrames(getDemoSceneTimelineDuration(scene));
    const actionFrameLength = actions.reduce(
      (sum, action) => sum + durationToTimelineFrames(getTimelineActionDuration(scene, action, actions.length)),
      0,
    );
    const metric = {
      startFrame: sceneStartFrame,
      frameLength: Math.max(sceneFrameLength, actionFrameLength),
    };
    sceneStartFrame += metric.frameLength;
    return metric;
  });
}

export function getTimelineSceneInsertIndexFromFrame(scenes: DemoLabTimelineScene[], frame: number): number {
  const normalizedFrame = Math.max(0, Number.isFinite(frame) ? frame : 0);
  const metrics = getSceneMetrics(scenes);
  for (let index = 0; index < metrics.length; index += 1) {
    const metric = metrics[index];
    if (normalizedFrame <= metric.startFrame + metric.frameLength / 2) {
      return index;
    }
  }
  return metrics.length;
}

export function getTimelineActionInsertIndexFromFrame(
  scenes: DemoLabTimelineScene[],
  sceneIndex: number,
  frame: number,
): number {
  const scene = scenes[sceneIndex];
  if (!scene) return 0;
  const sceneStartFrame = getSceneMetrics(scenes)[sceneIndex]?.startFrame ?? 0;
  const normalizedFrame = Math.max(0, Number.isFinite(frame) ? frame : 0) - sceneStartFrame;
  const actions = getSceneActionsForTimeline(scene);
  let actionStartFrame = 0;
  for (let index = 0; index < actions.length; index += 1) {
    const actionFrameLength = durationToTimelineFrames(
      getTimelineActionDuration(scene, actions[index], actions.length),
    );
    if (normalizedFrame <= actionStartFrame + actionFrameLength / 2) {
      return index;
    }
    actionStartFrame += actionFrameLength;
  }
  return actions.length;
}

export function createDemoLabPomeloTimelineModel(scenes: DemoLabTimelineScene[]): DemoLabPomeloTimelineModel {
  let sceneStartFrame = 0;
  const sceneTrack: DemoLabTimelineTrack = {
    name: 'Scenes',
    clips: [],
    height: 30,
    trackColor: '#111827',
    tag: { kind: 'scene-list', sceneIndex: -1 },
  };

  const tracks: DemoLabTimelineTrack[] = [sceneTrack];

  scenes.forEach((scene, sceneIndex) => {
    const actions = getSceneActionsForTimeline(scene);
    const sceneFrameLength = durationToTimelineFrames(getDemoSceneTimelineDuration(scene));
    let actionStartFrame = sceneStartFrame;
    const actionTrack: DemoLabTimelineTrack = {
      name: `${sceneIndex + 1}. ${scene.title}`,
      clips: [],
      height: 34,
      trackColor: sceneIndex % 2 === 0 ? '#182234' : '#142033',
      tag: { kind: 'action-list', sceneIndex },
    };

    sceneTrack.clips.push(
      createClip(scene.title, sceneStartFrame, sceneFrameLength, '#0ea5e9', {
        kind: 'scene',
        sceneIndex,
        actionIndex: 0,
      }),
    );

    actions.forEach((action, actionIndex) => {
      const actionFrameLength = durationToTimelineFrames(getTimelineActionDuration(scene, action, actions.length));
      actionTrack.clips.push(
        createClip(action.type, actionStartFrame, actionFrameLength, actionIndex % 2 === 0 ? '#22c55e' : '#8b5cf6', {
          kind: 'action',
          sceneIndex,
          actionIndex,
        }),
      );
      actionStartFrame += actionFrameLength;
    });

    tracks.push(actionTrack);
    sceneStartFrame += Math.max(sceneFrameLength, actionStartFrame - sceneStartFrame);
  });

  return {
    tracks,
    frameCount: Math.max(12, sceneStartFrame + 6),
  };
}
