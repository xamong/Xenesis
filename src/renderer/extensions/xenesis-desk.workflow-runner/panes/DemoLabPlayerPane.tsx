import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { OpenFileResult } from '../../../../shared/types';
import { hasCompleteMarkdownXconFence, StreamingXconMarkdown } from '../../../markdown/StreamingXconMarkdown';
import {
  getRendererPerformanceTraceDuration,
  getRendererPerformanceTraceNow,
  recordRendererPerformanceTrace,
} from '../../../utils/performanceTrace';
import {
  createDemoActionSnippet,
  createDemoSceneSnippet,
  DEFAULT_AUTHORING_SCENE_SNIPPET,
  DEMO_ACTION_LIBRARY,
  DEMO_SCENE_LIBRARY,
} from '../demoLabLibraries';
import {
  BUILT_IN_DEMO,
  createDemoPresetSource,
  createDemoPreviewMarkdown,
  type DemoScene,
  type DemoSceneAction,
  getSceneActions,
  hasRenderableDemoContent,
  isSupportedDemoFile,
  parseDemoManifest,
  serializeDemoManifest,
  validateDemoManifest,
} from '../demoLabPreset';
import { getDemoSceneTimelineDuration, getTimelineActionDuration } from '../demoLabTimelineModel';
import { useDemoLabPlayback } from '../useDemoLabPlayback';
import {
  createDemoLabPresetLoadState,
  type DemoLabPresetLoadState,
  type DemoLabPresetRegistryItem,
  useDemoLabPresetRegistry,
} from '../useDemoLabPresetRegistry';
import {
  DemoLabPomeloTimeline,
  type DemoLabTimelineDropTarget,
  type DemoLabTimelineInsertDrag,
  type DemoLabTimelineInsertPreview,
} from './DemoLabPomeloTimeline';
import { DemoLabTimelinePanel } from './DemoLabTimelinePanel';

const StableStreamingXconMarkdown = React.memo(StreamingXconMarkdown);

function isFirstFiveMinutePreset(preset: Pick<DemoLabPresetRegistryItem, 'recommendedFor' | 'tags'>): boolean {
  return Boolean(preset.recommendedFor?.includes('first-5-demo') || preset.tags.includes('first-5-demo'));
}

function getFirstFiveMinutePresetLabel(preset: DemoLabPresetRegistryItem): string {
  return isFirstFiveMinutePreset(preset) ? `First 5 min - ${preset.title}` : preset.title;
}

function hasCompleteDemoPreviewXconFence(markdown: string): boolean {
  return hasCompleteMarkdownXconFence(markdown);
}

function useStableDemoPreviewMarkdown(markdown: string, preserveRenderablePreview: boolean): string {
  const lastRenderablePreviewRef = useRef('');

  return useMemo(() => {
    const hasXconPreview = hasCompleteDemoPreviewXconFence(markdown);
    if (hasXconPreview) {
      lastRenderablePreviewRef.current = markdown;
      return markdown;
    }
    if (preserveRenderablePreview && lastRenderablePreviewRef.current) {
      return lastRenderablePreviewRef.current;
    }
    lastRenderablePreviewRef.current = '';
    return markdown;
  }, [markdown, preserveRenderablePreview]);
}

function getDroppedFileExt(fileName: string): string {
  const ext = /\.([^.]+)$/.exec(fileName)?.[1];
  return ext ? ext.toLowerCase() : 'txt';
}

async function createDroppedTextFileResult(file: File): Promise<OpenFileResult> {
  return {
    filePath: file.name,
    fileName: file.name,
    content: await file.text(),
    ext: getDroppedFileExt(file.name),
    contentType: 'markdown',
  };
}

function clampTimelineDuration(duration: number): number {
  return Math.max(80, Math.round(Number.isFinite(duration) ? duration : 80));
}

function cloneTimelineActions(scene: DemoScene): DemoSceneAction[] {
  return getSceneActions(scene).map((action) => ({ ...action }));
}

function cloneTimelineScene(scene: DemoScene, id: string, title: string): DemoScene {
  return {
    ...scene,
    id,
    title,
    actions: cloneTimelineActions(scene),
  };
}

function cloneTimelineSceneList(scenes: DemoScene[]): DemoScene[] {
  return scenes.map((scene) => ({
    ...scene,
    actions: cloneTimelineActions(scene),
  }));
}

function createUniqueSceneId(scenes: DemoScene[], baseId: string): string {
  const normalizedBaseId = baseId.trim() || 'scene';
  const existingIds = new Set(scenes.map((scene) => scene.id));
  if (!existingIds.has(normalizedBaseId)) return normalizedBaseId;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${normalizedBaseId}-${index}`;
    if (!existingIds.has(candidate)) return candidate;
  }
  return `${normalizedBaseId}-${Date.now()}`;
}

function withTimelineActions(scene: DemoScene, actions: DemoSceneAction[]): DemoScene {
  const nextScene = { ...scene, actions };
  return {
    ...nextScene,
    duration: getDemoSceneTimelineDuration(nextScene),
  };
}

function moveTimelineItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex > items.length) {
    return items;
  }
  const normalizedInsertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  if (fromIndex === normalizedInsertIndex) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(Math.max(0, Math.min(normalizedInsertIndex, next.length)), 0, item);
  return next;
}

function getTimelineMoveDestinationIndex(fromIndex: number, toIndex: number, itemCount: number): number {
  const boundedInsertIndex = Math.max(0, Math.min(toIndex, itemCount));
  return Math.max(
    0,
    Math.min(fromIndex < boundedInsertIndex ? boundedInsertIndex - 1 : boundedInsertIndex, itemCount - 1),
  );
}

function createTimelinePresetFileName(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'xcon-demo-preset'}.xcon.md`;
}

type AuthoringDraftSnapshot = {
  source: string;
  sourceLabel: string;
  loadedFilePath: string | null;
  loadError: string | null;
  isTimelineDirty: boolean;
};

type AuthoringTemplateSummary = {
  title: string;
  fileName: string;
  kindLabel: string;
  sceneCount: number;
  actionCount: number;
  durationLabel: string;
  actionTypes: string[];
  capabilities: string[];
};

type AuthoringTemplateStoryboardScene = {
  id: string;
  title: string;
  durationLabel: string;
  actionTypes: string[];
  actions: DemoSceneAction[];
};

type TimelineInsertPlacement = 'before' | 'after';
type TemplateTimelineDrag =
  | {
      kind: 'scene';
      preset: DemoLabPresetRegistryItem;
      sceneIndex: number;
      label: string;
      durationMs: number;
      durationLabel: string;
    }
  | {
      kind: 'action';
      preset: DemoLabPresetRegistryItem;
      sceneIndex: number;
      actionIndex: number;
      label: string;
      durationMs: number;
      durationLabel: string;
    };

const AUTHORING_TEMPLATE_FAVORITES_STORAGE_KEY = 'xcon-viewer.demoLab.authoringTemplateFavorites.v1';
const AUTHORING_TEMPLATE_RECENT_STORAGE_KEY = 'xcon-viewer.demoLab.authoringTemplateRecent.v1';
const AUTHORING_TEMPLATE_LOCAL_STORAGE_KEY = 'xcon-viewer.demoLab.localAuthoringTemplates.v1';

function loadStoredStringList(storageKey: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(storageKey);
    const parsed: unknown = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(String).filter(Boolean))];
  } catch {
    return [];
  }
}

function persistStringList(storageKey: string, values: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...new Set(values.filter(Boolean))]));
  } catch {
    // Ignore localStorage quota or permission failures; the in-session state still works.
  }
}

function createTemplateSlug(title: string): string {
  return (
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'demo-template'
  );
}

function isDemoLabPresetRegistryItem(value: unknown): value is DemoLabPresetRegistryItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<DemoLabPresetRegistryItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.fileName === 'string' &&
    item.kind === 'local' &&
    item.category === 'Local' &&
    typeof item.description === 'string' &&
    Array.isArray(item.tags) &&
    item.tags.every((tag) => typeof tag === 'string') &&
    typeof item.content === 'string'
  );
}

function loadStoredLocalAuthoringTemplates(): DemoLabPresetRegistryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(AUTHORING_TEMPLATE_LOCAL_STORAGE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDemoLabPresetRegistryItem);
  } catch {
    return [];
  }
}

function persistLocalAuthoringTemplates(values: DemoLabPresetRegistryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTHORING_TEMPLATE_LOCAL_STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Ignore localStorage quota or permission failures; the in-session state still works.
  }
}

function formatTemplateDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1).replace(/\.0$/, '')}s`;
}

function createAuthoringTemplateSummary(
  preset:
    | {
        title: string;
        fileName: string;
        kind: string;
        content: string;
      }
    | undefined,
): AuthoringTemplateSummary | null {
  if (!preset) return null;
  const templateManifest = parseDemoManifest(preset.content);
  const actions = templateManifest.scenes.flatMap((scene) => getSceneActions(scene));
  const actionTypes = Array.from(new Set(actions.map((action) => action.type))).sort();
  const capabilities = [
    preset.content.includes('```xcon-sketch') ? 'SKETCH' : null,
    /```xcon-chain(?:\s|$)|```xcon-chain-fixture/.test(preset.content) ? 'Chain' : null,
    actionTypes.some((type) => type.toLowerCase().includes('workflow')) ? 'Workflow' : null,
    actionTypes.includes('fixture') ? 'Fixture' : null,
  ].filter((item): item is string => Boolean(item));

  return {
    title: templateManifest.title || preset.title,
    fileName: preset.fileName,
    kindLabel: preset.kind === 'built-in' ? 'Built-in' : preset.kind === 'local' ? 'Local' : 'Example',
    sceneCount: templateManifest.scenes.length,
    actionCount: actions.length,
    durationLabel: formatTemplateDuration(
      templateManifest.scenes.reduce((total, scene) => total + getDemoSceneTimelineDuration(scene), 0),
    ),
    actionTypes,
    capabilities,
  };
}

function createAuthoringTemplateStoryboard(preset: { content: string }): AuthoringTemplateStoryboardScene[] {
  const templateManifest = parseDemoManifest(preset.content);
  return templateManifest.scenes.slice(0, 4).map((scene, index) => {
    const actions = getSceneActions(scene);
    return {
      id: scene.id || `scene-${index + 1}`,
      title: scene.title || scene.id || `Scene ${index + 1}`,
      durationLabel: formatTemplateDuration(getDemoSceneTimelineDuration(scene)),
      actionTypes: Array.from(new Set(actions.map((action) => action.type))).slice(0, 4),
      actions: actions.slice(0, 4),
    };
  });
}

export function DemoLabPlayerPane() {
  const [source, setSource] = useState(BUILT_IN_DEMO);
  const [sourceLabel, setSourceLabel] = useState('Built-in demo preset');
  const [loadedFilePath, setLoadedFilePath] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isTimelineDirty, setIsTimelineDirty] = useState(false);
  const [isAuthoringSourceEditing, setIsAuthoringSourceEditing] = useState(false);
  const [previousAuthoringDraft, setPreviousAuthoringDraft] = useState<AuthoringDraftSnapshot | null>(null);
  const [authoringTemplateQuery, setAuthoringTemplateQuery] = useState('');
  const [authoringTemplateCategory, setAuthoringTemplateCategory] = useState('All');
  const [favoriteAuthoringTemplateIds, setFavoriteAuthoringTemplateIds] = useState<string[]>(() =>
    loadStoredStringList(AUTHORING_TEMPLATE_FAVORITES_STORAGE_KEY),
  );
  const [recentAuthoringTemplateIds, setRecentAuthoringTemplateIds] = useState<string[]>(() =>
    loadStoredStringList(AUTHORING_TEMPLATE_RECENT_STORAGE_KEY),
  );
  const [localAuthoringTemplates, setLocalAuthoringTemplates] = useState<DemoLabPresetRegistryItem[]>(() =>
    loadStoredLocalAuthoringTemplates(),
  );
  const [timelineInsertPreview, setTimelineInsertPreview] = useState<DemoLabTimelineInsertPreview | null>(null);
  const [templateTimelineDrag, setTemplateTimelineDrag] = useState<TemplateTimelineDrag | null>(null);
  const authoringSourceRef = useRef<HTMLTextAreaElement | null>(null);
  const renderStageRef = useRef<HTMLDivElement | null>(null);
  const [renderOverlayOrigin, setRenderOverlayOrigin] = useState({ x: 0, y: 0 });
  const [undoTimelineScenes, setUndoTimelineScenes] = useState<DemoScene[][]>([]);
  const [redoTimelineScenes, setRedoTimelineScenes] = useState<DemoScene[][]>([]);
  const { presetOptions, selectedPresetId, setSelectedPresetId, loadPreset } = useDemoLabPresetRegistry();
  const manifest = useMemo(() => parseDemoManifest(source), [source]);
  const authoringTemplates = useMemo(
    () => [...presetOptions, ...localAuthoringTemplates],
    [localAuthoringTemplates, presetOptions],
  );
  const selectedAuthoringTemplate = useMemo(
    () => authoringTemplates.find((preset) => preset.id === selectedPresetId) ?? authoringTemplates[0],
    [authoringTemplates, selectedPresetId],
  );
  const selectedAuthoringTemplateSummary = useMemo(
    () => createAuthoringTemplateSummary(selectedAuthoringTemplate),
    [selectedAuthoringTemplate],
  );
  const authoringTemplateCategories = useMemo(
    () => ['All', ...Array.from(new Set(authoringTemplates.map((preset) => preset.category)))],
    [authoringTemplates],
  );
  const filteredAuthoringTemplates = useMemo(() => {
    const query = authoringTemplateQuery.trim().toLowerCase();
    return authoringTemplates.filter((preset) => {
      const categoryMatches = authoringTemplateCategory === 'All' || preset.category === authoringTemplateCategory;
      if (!categoryMatches) return false;
      if (!query) return true;
      return [preset.title, preset.fileName, preset.category, preset.description, ...preset.tags].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [authoringTemplateCategory, authoringTemplateQuery, authoringTemplates]);
  const favoriteAuthoringTemplates = useMemo(
    () =>
      favoriteAuthoringTemplateIds
        .map((presetId) => authoringTemplates.find((preset) => preset.id === presetId))
        .filter((preset): preset is DemoLabPresetRegistryItem => Boolean(preset)),
    [authoringTemplates, favoriteAuthoringTemplateIds],
  );
  const recentAuthoringTemplates = useMemo(
    () =>
      recentAuthoringTemplateIds
        .map((presetId) => authoringTemplates.find((preset) => preset.id === presetId))
        .filter((preset): preset is DemoLabPresetRegistryItem => Boolean(preset)),
    [authoringTemplates, recentAuthoringTemplateIds],
  );
  const [timelineScenes, setTimelineScenes] = useState(manifest.scenes);
  const [editTarget, setEditTarget] = useState({ sceneIndex: 0, actionIndex: 0 });
  const validationDiagnostics = useMemo(
    () =>
      validateDemoManifest({
        ...manifest,
        scenes: timelineScenes,
      }),
    [manifest, timelineScenes],
  );
  const validationErrorCount = validationDiagnostics.filter((diagnostic) => diagnostic.severity === 'error').length;
  const validationWarningCount = validationDiagnostics.filter((diagnostic) => diagnostic.severity === 'warning').length;
  const canonicalDemoSource = useMemo(
    () =>
      serializeDemoManifest({
        ...manifest,
        mode: 'editable',
        scenes: timelineScenes,
      }),
    [manifest, timelineScenes],
  );
  const {
    activeSceneIndex,
    activeActionIndex,
    typedText,
    cursorPosition,
    cursorLabel,
    clickPulseId,
    focusedTarget,
    highlightedTarget,
    highlightRect,
    highlightText,
    calloutText,
    calloutPosition,
    fixtureStatus,
    chainStatus,
    workflowEventStatus,
    actionLog,
    isPlaying,
    activeScene,
    activeAction,
    playbackSnapshot,
    playbackDocumentSource,
    playbackFixture,
    seekSceneAction,
    moveScene,
    playScenes,
    resetPlayback,
  } = useDemoLabPlayback(timelineScenes, { documentSource: source });
  const previewMarkdown = useMemo(
    () => createDemoPreviewMarkdown(playbackDocumentSource ?? source, playbackFixture),
    [playbackDocumentSource, playbackFixture, source],
  );
  const stablePreviewMarkdown = useStableDemoPreviewMarkdown(
    previewMarkdown,
    isPlaying && playbackDocumentSource !== null,
  );
  const previewRenderTraceStartedAt = getRendererPerformanceTraceNow();

  useEffect(() => {
    recordRendererPerformanceTrace({
      scope: 'workflow-runner',
      action: 'demo-preview-rendered',
      durationMs: getRendererPerformanceTraceDuration(previewRenderTraceStartedAt),
      details: {
        pane: 'DemoLabPlayerPane',
        isPlaying,
        activeSceneIndex,
        activeActionIndex,
        sceneCount: timelineScenes.length,
        sourceChars: source.length,
        previewChars: stablePreviewMarkdown.length,
      },
    });
  }, [
    activeActionIndex,
    activeSceneIndex,
    isPlaying,
    previewRenderTraceStartedAt,
    source.length,
    stablePreviewMarkdown.length,
    timelineScenes.length,
  ]);

  const offsetX = (value: number) => renderOverlayOrigin.x + value;
  const offsetY = (value: number) => renderOverlayOrigin.y + value;

  useEffect(() => {
    const stage = renderStageRef.current;
    if (!stage) return undefined;

    let animationFrame = 0;

    const measureOverlayOrigin = () => {
      const stageRect = stage.getBoundingClientRect();
      const xconBlock = stage.querySelector<HTMLElement>('.md-xcon-block');
      if (!xconBlock) {
        setRenderOverlayOrigin((current) => (current.x === 0 && current.y === 0 ? current : { x: 0, y: 0 }));
        return;
      }

      const xconRect = xconBlock.getBoundingClientRect();
      const nextOrigin = {
        x: Math.max(0, Math.round(xconRect.left - stageRect.left + stage.scrollLeft)),
        y: Math.max(0, Math.round(xconRect.top - stageRect.top + stage.scrollTop)),
      };
      setRenderOverlayOrigin((current) =>
        current.x === nextOrigin.x && current.y === nextOrigin.y ? current : nextOrigin,
      );
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measureOverlayOrigin);
    };

    scheduleMeasure();

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasure);
    resizeObserver?.observe(stage);
    const markdownRoot = stage.querySelector<HTMLElement>('.wfr-demo-player__markdown');
    if (markdownRoot) {
      resizeObserver?.observe(markdownRoot);
    }

    const mutationObserver = new MutationObserver(scheduleMeasure);
    mutationObserver.observe(stage, {
      childList: true,
      subtree: true,
    });

    const delayedMeasure = window.setTimeout(scheduleMeasure, 120);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(delayedMeasure);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
    };
  }, [stablePreviewMarkdown]);

  useEffect(() => {
    persistStringList(AUTHORING_TEMPLATE_FAVORITES_STORAGE_KEY, favoriteAuthoringTemplateIds);
  }, [favoriteAuthoringTemplateIds]);

  useEffect(() => {
    persistStringList(AUTHORING_TEMPLATE_RECENT_STORAGE_KEY, recentAuthoringTemplateIds);
  }, [recentAuthoringTemplateIds]);

  useEffect(() => {
    persistLocalAuthoringTemplates(localAuthoringTemplates);
  }, [localAuthoringTemplates]);

  useEffect(() => {
    setTimelineScenes(manifest.scenes);
    setEditTarget({ sceneIndex: 0, actionIndex: 0 });
    setUndoTimelineScenes([]);
    setRedoTimelineScenes([]);
    if (!isAuthoringSourceEditing) {
      setIsTimelineDirty(false);
    }
  }, [manifest.scenes]);

  useEffect(() => {
    setEditTarget((current) => {
      const sceneIndex = Math.max(0, Math.min(current.sceneIndex, timelineScenes.length - 1));
      const actionCount = getSceneActions(
        timelineScenes[sceneIndex] ??
          timelineScenes[0] ?? {
            id: '',
            title: '',
            caption: '',
            action: 'render',
            duration: 700,
          },
      ).length;
      const actionIndex = Math.max(0, Math.min(current.actionIndex, Math.max(0, actionCount - 1)));
      return sceneIndex === current.sceneIndex && actionIndex === current.actionIndex
        ? current
        : { sceneIndex, actionIndex };
    });
  }, [timelineScenes]);

  const selectedEditScene = timelineScenes[editTarget.sceneIndex] ?? timelineScenes[0] ?? null;
  const selectedEditActions = selectedEditScene ? getSceneActions(selectedEditScene) : [];
  const selectedEditAction = selectedEditActions[editTarget.actionIndex] ?? selectedEditActions[0] ?? null;
  const activeInsertDrag: DemoLabTimelineInsertDrag | null = templateTimelineDrag
    ? { kind: templateTimelineDrag.kind }
    : null;

  const selectTimelineSceneAction = (sceneIndex: number, actionIndex = 0) => {
    setEditTarget({ sceneIndex, actionIndex });
    seekSceneAction(sceneIndex, actionIndex);
  };

  const markTimelineDirty = () => {
    setIsTimelineDirty(true);
    setLoadError(null);
  };

  const createCurrentDemoPresetSource = () =>
    createDemoPresetSource(source, {
      ...manifest,
      scenes: timelineScenes,
    });

  const startAuthoringSourceEdit = () => {
    if (isTimelineDirty) {
      setSource(createCurrentDemoPresetSource());
    }
    setIsAuthoringSourceEditing(true);
    setLoadError(null);
  };

  const updateAuthoringSource = (content: string) => {
    setSource(content);
    setIsTimelineDirty(true);
    setLoadError(null);
    resetPlayback();
  };

  const stopAuthoringSourceEdit = () => {
    setIsAuthoringSourceEditing(false);
  };

  const insertAuthoringSnippet = (snippet: string) => {
    const editor = authoringSourceRef.current;
    const selectionStart = editor?.selectionStart ?? source.length;
    const selectionEnd = editor?.selectionEnd ?? selectionStart;
    const before = source.slice(0, selectionStart);
    const after = source.slice(selectionEnd);
    const leadingNewline = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    const trailingNewline = !snippet.endsWith('\n') ? '\n' : '';
    const insertedText = `${leadingNewline}${snippet}${trailingNewline}`;
    const nextSource = `${before}${insertedText}${after}`;
    const nextCursorPosition = before.length + insertedText.length;

    updateAuthoringSource(nextSource);
    window.requestAnimationFrame(() => {
      const nextEditor = authoringSourceRef.current;
      if (!nextEditor) return;
      nextEditor.focus();
      nextEditor.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const getAuthoringTemplateLoadState = (presetId = selectedPresetId): DemoLabPresetLoadState | null => {
    const localPreset = localAuthoringTemplates.find((preset) => preset.id === presetId);
    if (localPreset) {
      setSelectedPresetId(localPreset.id);
      return createDemoLabPresetLoadState(localPreset);
    }
    return loadPreset(presetId);
  };

  const saveCurrentSourceAsLocalTemplate = () => {
    const content = createCurrentDemoPresetSource();
    const templateManifest = parseDemoManifest(content);
    const title = templateManifest.title || manifest.title || 'Untitled demo';
    const slug = createTemplateSlug(title);
    const actions = templateManifest.scenes.flatMap((scene) => getSceneActions(scene));
    const actionTags = Array.from(new Set(actions.map((action) => action.type).filter(Boolean))).slice(0, 4);
    const template: DemoLabPresetRegistryItem = {
      id: `local-${slug}`,
      title: `Local draft: ${title}`,
      fileName: `${slug}.xcon.md`,
      kind: 'local',
      category: 'Local',
      description: 'Saved local authoring template from the current Demo Lab source.',
      tags: ['local', 'draft', ...actionTags],
      content,
    };

    setLocalAuthoringTemplates((current) =>
      [template, ...current.filter((item) => item.id !== template.id)].slice(0, 20),
    );
    setSelectedPresetId(template.id);
    setAuthoringTemplateCategory('Local');
    setAuthoringTemplateQuery('');
    setRecentAuthoringTemplateIds((current) =>
      [template.id, ...current.filter((presetId) => presetId !== template.id)].slice(0, 5),
    );
    setLoadError(`Saved local authoring template: ${template.title}`);
  };

  const deleteLocalAuthoringTemplate = (presetId: string) => {
    const target = localAuthoringTemplates.find((preset) => preset.id === presetId);
    if (!target) return;
    setLocalAuthoringTemplates((current) => current.filter((preset) => preset.id !== presetId));
    setFavoriteAuthoringTemplateIds((current) => current.filter((item) => item !== presetId));
    setRecentAuthoringTemplateIds((current) => current.filter((item) => item !== presetId));
    if (selectedPresetId === presetId) {
      setSelectedPresetId(presetOptions[0]?.id ?? '');
      if (authoringTemplateCategory === 'Local') {
        setAuthoringTemplateCategory('All');
      }
    }
    setLoadError(`Deleted local authoring template: ${target.title}`);
  };

  const markAuthoringTemplateUsed = (presetId: string) => {
    setRecentAuthoringTemplateIds((current) => [presetId, ...current.filter((item) => item !== presetId)].slice(0, 5));
  };

  const clearTimelineInsertPreview = () => setTimelineInsertPreview(null);

  const clearTemplateTimelineDrag = () => {
    setTemplateTimelineDrag(null);
    clearTimelineInsertPreview();
  };

  const createTemplateSceneDrag = (
    preset: DemoLabPresetRegistryItem,
    sceneIndex: number,
  ): TemplateTimelineDrag | null => {
    const templateManifest = parseDemoManifest(preset.content);
    const templateScene = templateManifest.scenes[sceneIndex];
    if (!templateScene) return null;
    const durationMs = getDemoSceneTimelineDuration(templateScene);
    return {
      kind: 'scene',
      preset,
      sceneIndex,
      label: templateScene.title || templateScene.id || `Scene ${sceneIndex + 1}`,
      durationMs,
      durationLabel: formatTemplateDuration(durationMs),
    };
  };

  const createTemplateActionDrag = (
    preset: DemoLabPresetRegistryItem,
    sceneIndex: number,
    actionIndex: number,
  ): TemplateTimelineDrag | null => {
    const templateManifest = parseDemoManifest(preset.content);
    const templateScene = templateManifest.scenes[sceneIndex];
    const templateActions = templateScene ? getSceneActions(templateScene) : [];
    const templateAction = templateActions[actionIndex];
    if (!templateScene || !templateAction) return null;
    const durationMs = getTimelineActionDuration(templateScene, templateAction, templateActions.length);
    return {
      kind: 'action',
      preset,
      sceneIndex,
      actionIndex,
      label: templateAction.type || 'action',
      durationMs,
      durationLabel: formatTemplateDuration(durationMs),
    };
  };

  const startTemplateTimelineDrag = (event: React.DragEvent<HTMLElement>, payload: TemplateTimelineDrag | null) => {
    if (!payload) return;
    setTemplateTimelineDrag(payload);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(
      'application/x-xcon-demo-template',
      JSON.stringify({
        kind: payload.kind,
        presetId: payload.preset.id,
        sceneIndex: payload.sceneIndex,
        actionIndex: payload.kind === 'action' ? payload.actionIndex : undefined,
      }),
    );
  };

  const previewTemplateDropOnTimeline = (target: DemoLabTimelineDropTarget) => {
    if (!templateTimelineDrag) return;
    setTimelineInsertPreview({
      kind: templateTimelineDrag.kind,
      sceneIndex: target.sceneIndex,
      actionIndex: target.actionIndex,
      label: templateTimelineDrag.label,
      positionLabel: target.positionLabel,
      durationMs: templateTimelineDrag.durationMs,
      durationLabel: templateTimelineDrag.durationLabel,
    });
  };

  const insertTemplateSceneAtTimelineIndex = (
    preset: DemoLabPresetRegistryItem,
    sceneIndex: number,
    insertIndex: number,
  ) => {
    const templateManifest = parseDemoManifest(preset.content);
    const templateScene = templateManifest.scenes[sceneIndex];
    if (!templateScene) return;

    let insertedSceneIndex = Math.max(0, Math.min(insertIndex, timelineScenes.length));
    applyTimelineSceneEdit((current) => {
      insertedSceneIndex = Math.max(0, Math.min(insertIndex, current.length));
      const baseId = templateScene.id || createTemplateSlug(templateScene.title || `scene-${sceneIndex + 1}`);
      const nextScene = cloneTimelineScene(
        templateScene,
        createUniqueSceneId(current, baseId),
        templateScene.title || templateScene.id || `Scene ${sceneIndex + 1}`,
      );
      return [...current.slice(0, insertedSceneIndex), nextScene, ...current.slice(insertedSceneIndex)];
    });
    setEditTarget({ sceneIndex: insertedSceneIndex, actionIndex: 0 });
    markAuthoringTemplateUsed(preset.id);
    clearTimelineInsertPreview();
  };

  const insertTemplateActionAtTimelineIndex = (
    preset: DemoLabPresetRegistryItem,
    sceneIndex: number,
    actionIndex: number,
    targetSceneIndex: number,
    insertIndex: number,
  ) => {
    const templateManifest = parseDemoManifest(preset.content);
    const templateScene = templateManifest.scenes[sceneIndex];
    const templateAction = templateScene ? getSceneActions(templateScene)[actionIndex] : null;
    if (!templateAction) return;

    let normalizedSceneIndex = Math.max(0, Math.min(targetSceneIndex, Math.max(0, timelineScenes.length - 1)));
    let insertedActionIndex = Math.max(0, insertIndex);
    applyTimelineSceneEdit((current) => {
      const targetScene = current[normalizedSceneIndex] ?? current[0];
      if (!targetScene) return current;
      normalizedSceneIndex = Math.max(0, Math.min(targetSceneIndex, current.length - 1));
      return current.map((scene, index) =>
        index === normalizedSceneIndex
          ? (() => {
              const actions = getSceneActions(scene);
              insertedActionIndex = Math.max(0, Math.min(insertIndex, actions.length));
              return withTimelineActions(scene, [
                ...actions.slice(0, insertedActionIndex),
                { ...templateAction },
                ...actions.slice(insertedActionIndex),
              ]);
            })()
          : scene,
      );
    });
    setEditTarget({ sceneIndex: normalizedSceneIndex, actionIndex: insertedActionIndex });
    markAuthoringTemplateUsed(preset.id);
    clearTimelineInsertPreview();
  };

  const commitTemplateDropOnTimeline = (target: DemoLabTimelineDropTarget) => {
    if (!templateTimelineDrag) return;
    if (templateTimelineDrag.kind === 'scene') {
      insertTemplateSceneAtTimelineIndex(
        templateTimelineDrag.preset,
        templateTimelineDrag.sceneIndex,
        target.sceneIndex,
      );
    } else {
      insertTemplateActionAtTimelineIndex(
        templateTimelineDrag.preset,
        templateTimelineDrag.sceneIndex,
        templateTimelineDrag.actionIndex,
        target.sceneIndex,
        target.actionIndex ?? 0,
      );
    }
    clearTemplateTimelineDrag();
  };

  const previewTemplateSceneInsert = (
    preset: DemoLabPresetRegistryItem,
    sceneIndex: number,
    placement: TimelineInsertPlacement,
  ) => {
    const templateManifest = parseDemoManifest(preset.content);
    const templateScene = templateManifest.scenes[sceneIndex];
    if (!templateScene) {
      clearTimelineInsertPreview();
      return;
    }
    const selectedSceneIndex =
      timelineScenes.length === 0 ? 0 : Math.max(0, Math.min(editTarget.sceneIndex, timelineScenes.length - 1));
    const insertSceneIndex =
      placement === 'before' ? selectedSceneIndex : Math.min(selectedSceneIndex + 1, timelineScenes.length);
    const durationMs = getDemoSceneTimelineDuration(templateScene);
    setTimelineInsertPreview({
      kind: 'scene',
      sceneIndex: insertSceneIndex,
      label: templateScene.title || templateScene.id || `Scene ${sceneIndex + 1}`,
      positionLabel: `${placement === 'before' ? 'Before' : 'After'} scene ${selectedSceneIndex + 1}`,
      durationMs,
      durationLabel: formatTemplateDuration(durationMs),
    });
  };

  const previewTemplateActionInsert = (
    preset: DemoLabPresetRegistryItem,
    sceneIndex: number,
    actionIndex: number,
    placement: TimelineInsertPlacement,
  ) => {
    const templateManifest = parseDemoManifest(preset.content);
    const templateScene = templateManifest.scenes[sceneIndex];
    const templateAction = templateScene ? getSceneActions(templateScene)[actionIndex] : null;
    if (!templateScene || !templateAction) {
      clearTimelineInsertPreview();
      return;
    }
    const selectedSceneIndex =
      timelineScenes.length === 0 ? 0 : Math.max(0, Math.min(editTarget.sceneIndex, timelineScenes.length - 1));
    const currentActions = getSceneActions(
      timelineScenes[selectedSceneIndex] ??
        timelineScenes[0] ?? {
          id: '',
          title: '',
          caption: '',
          action: 'render',
          duration: 700,
        },
    );
    const selectedActionIndex =
      currentActions.length === 0 ? 0 : Math.max(0, Math.min(editTarget.actionIndex, currentActions.length - 1));
    const insertActionIndex =
      placement === 'before' ? selectedActionIndex : Math.min(selectedActionIndex + 1, currentActions.length);
    const templateActions = getSceneActions(templateScene);
    const durationMs = getTimelineActionDuration(templateScene, templateAction, templateActions.length);
    setTimelineInsertPreview({
      kind: 'action',
      sceneIndex: selectedSceneIndex,
      actionIndex: insertActionIndex,
      label: templateAction.type || 'action',
      positionLabel: `${placement === 'before' ? 'Before' : 'After'} action ${selectedActionIndex + 1}`,
      durationMs,
      durationLabel: formatTemplateDuration(durationMs),
    });
  };

  const insertTemplateSceneIntoTimeline = (
    preset: DemoLabPresetRegistryItem,
    sceneIndex: number,
    placement: TimelineInsertPlacement,
  ) => {
    const selectedSceneIndex =
      timelineScenes.length === 0 ? 0 : Math.max(0, Math.min(editTarget.sceneIndex, timelineScenes.length - 1));
    const insertIndex =
      placement === 'before' ? selectedSceneIndex : Math.min(selectedSceneIndex + 1, timelineScenes.length);
    insertTemplateSceneAtTimelineIndex(preset, sceneIndex, insertIndex);
  };

  const insertTemplateActionIntoCurrentScene = (
    preset: DemoLabPresetRegistryItem,
    sceneIndex: number,
    actionIndex: number,
    placement: TimelineInsertPlacement,
  ) => {
    const targetSceneIndex = Math.max(0, Math.min(editTarget.sceneIndex, Math.max(0, timelineScenes.length - 1)));
    const actions = getSceneActions(
      timelineScenes[targetSceneIndex] ??
        timelineScenes[0] ?? {
          id: '',
          title: '',
          caption: '',
          action: 'render',
          duration: 700,
        },
    );
    const selectedActionIndex =
      actions.length === 0 ? 0 : Math.max(0, Math.min(editTarget.actionIndex, actions.length - 1));
    const insertIndex =
      placement === 'before' ? selectedActionIndex : Math.min(selectedActionIndex + 1, actions.length);
    insertTemplateActionAtTimelineIndex(preset, sceneIndex, actionIndex, targetSceneIndex, insertIndex);
  };

  const replaceAuthoringSourceWithSelectedTemplate = () => {
    const state = getAuthoringTemplateLoadState(selectedPresetId);
    if (!state) {
      setLoadError(`Unknown Demo Lab preset: ${selectedPresetId}`);
      return;
    }
    setPreviousAuthoringDraft({
      source,
      sourceLabel,
      loadedFilePath,
      loadError,
      isTimelineDirty,
    });
    setSource(state.preset.content);
    setSourceLabel(`Draft template: ${state.preset.title}`);
    setLoadedFilePath(null);
    setIsAuthoringSourceEditing(true);
    setIsTimelineDirty(true);
    setUndoTimelineScenes([]);
    setRedoTimelineScenes([]);
    setLoadError(state.loadError);
    markAuthoringTemplateUsed(selectedPresetId);
    resetPlayback();
  };

  const toggleFavoriteAuthoringTemplate = (presetId: string) => {
    setFavoriteAuthoringTemplateIds((current) =>
      current.includes(presetId) ? current.filter((item) => item !== presetId) : [presetId, ...current].slice(0, 8),
    );
  };

  const restorePreviousAuthoringDraft = () => {
    if (!previousAuthoringDraft) return;
    setSource(previousAuthoringDraft.source);
    setSourceLabel(previousAuthoringDraft.sourceLabel);
    setLoadedFilePath(previousAuthoringDraft.loadedFilePath);
    setIsAuthoringSourceEditing(true);
    setIsTimelineDirty(previousAuthoringDraft.isTimelineDirty);
    setUndoTimelineScenes([]);
    setRedoTimelineScenes([]);
    setLoadError(previousAuthoringDraft.loadError);
    setPreviousAuthoringDraft(null);
    resetPlayback();
  };

  const applyTimelineSceneEdit = (updater: (current: DemoScene[]) => DemoScene[]) => {
    setTimelineScenes((current) => {
      const next = updater(current);
      if (next === current) return current;
      setUndoTimelineScenes((history) => [...history.slice(-19), cloneTimelineSceneList(current)]);
      setRedoTimelineScenes([]);
      markTimelineDirty();
      return next;
    });
    resetPlayback();
  };

  const undoTimelineEdit = () => {
    const previous = undoTimelineScenes[undoTimelineScenes.length - 1];
    if (!previous) return;
    setRedoTimelineScenes((history) => [...history.slice(-19), cloneTimelineSceneList(timelineScenes)]);
    setUndoTimelineScenes((history) => history.slice(0, -1));
    setTimelineScenes(cloneTimelineSceneList(previous));
    markTimelineDirty();
    resetPlayback();
  };

  const redoTimelineEdit = () => {
    const next = redoTimelineScenes[redoTimelineScenes.length - 1];
    if (!next) return;
    setUndoTimelineScenes((history) => [...history.slice(-19), cloneTimelineSceneList(timelineScenes)]);
    setRedoTimelineScenes((history) => history.slice(0, -1));
    setTimelineScenes(cloneTimelineSceneList(next));
    markTimelineDirty();
    resetPlayback();
  };

  const updateTimelineActionDuration = (sceneIndex: number, actionIndex: number, duration: number) => {
    const nextDuration = clampTimelineDuration(duration);
    applyTimelineSceneEdit((current) => {
      const scene = current[sceneIndex];
      if (!scene) return current;
      const actions = cloneTimelineActions(scene);
      const action = actions[actionIndex];
      if (!action) return current;
      actions[actionIndex] = { ...action, duration: nextDuration };
      return current.map((item, index) => (index === sceneIndex ? withTimelineActions(item, actions) : item));
    });
  };

  const updateTimelineSceneField = (sceneIndex: number, field: 'title' | 'caption' | 'action', value: string) => {
    applyTimelineSceneEdit((current) => {
      const scene = current[sceneIndex];
      if (!scene) return current;
      return current.map((item, index) => (index === sceneIndex ? { ...item, [field]: value } : item));
    });
  };

  const updateTimelineActionField = (
    sceneIndex: number,
    actionIndex: number,
    field: keyof DemoSceneAction,
    value: string,
  ) => {
    applyTimelineSceneEdit((current) => {
      const scene = current[sceneIndex];
      if (!scene) return current;
      const actions = cloneTimelineActions(scene);
      const action = actions[actionIndex];
      if (!action) return current;
      let nextValue: string | number | undefined = value;
      if (field === 'x' || field === 'y' || field === 'duration') {
        const numericValue = Number(value);
        nextValue = Number.isFinite(numericValue) ? numericValue : undefined;
        if (field === 'duration' && nextValue !== undefined) {
          nextValue = clampTimelineDuration(nextValue);
        }
      } else if (field !== 'type') {
        nextValue = value.trim() ? value : undefined;
      } else if (!value.trim()) {
        nextValue = action.type;
      }
      const nextAction = { ...action, [field]: nextValue };
      if (nextValue === undefined) {
        delete nextAction[field];
      }
      actions[actionIndex] = nextAction;
      return current.map((item, index) => (index === sceneIndex ? withTimelineActions(item, actions) : item));
    });
  };

  const insertTimelineAction = (sceneIndex: number, actionIndex: number, actionTemplate: DemoSceneAction) => {
    const insertIndex = Math.max(0, actionIndex + 1);
    applyTimelineSceneEdit((current) => {
      const scene = current[sceneIndex];
      if (!scene) return current;
      const actions = cloneTimelineActions(scene);
      const nextAction = { ...actionTemplate };
      actions.splice(Math.min(insertIndex, actions.length), 0, nextAction);
      return current.map((item, index) => (index === sceneIndex ? withTimelineActions(item, actions) : item));
    });
    setEditTarget({ sceneIndex, actionIndex: insertIndex });
  };

  const insertTimelineScene = (sceneIndex: number, sceneTemplate: DemoScene) => {
    const insertIndex = Math.max(0, sceneIndex + 1);
    applyTimelineSceneEdit((current) => {
      const nextScene = cloneTimelineScene(
        sceneTemplate,
        createUniqueSceneId(current, sceneTemplate.id),
        sceneTemplate.title,
      );
      const safeInsertIndex = Math.min(insertIndex, current.length);
      return [...current.slice(0, safeInsertIndex), nextScene, ...current.slice(safeInsertIndex)];
    });
    setEditTarget({ sceneIndex: insertIndex, actionIndex: 0 });
  };

  const duplicateTimelineScene = (sceneIndex: number) => {
    applyTimelineSceneEdit((current) => {
      const scene = current[sceneIndex];
      if (!scene) return current;
      const copyNumber = current.filter((item) => item.id.startsWith(`${scene.id}-copy`)).length + 1;
      const copy = cloneTimelineScene(scene, `${scene.id}-copy-${copyNumber}`, `${scene.title} copy ${copyNumber}`);
      return [...current.slice(0, sceneIndex + 1), copy, ...current.slice(sceneIndex + 1)];
    });
  };

  const deleteTimelineScene = (sceneIndex: number) => {
    applyTimelineSceneEdit((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, index) => index !== sceneIndex);
    });
  };

  const moveTimelineScene = (fromSceneIndex: number, toSceneIndex: number) => {
    applyTimelineSceneEdit((current) => moveTimelineItem(current, fromSceneIndex, toSceneIndex));
  };

  const duplicateTimelineAction = (sceneIndex: number, actionIndex: number) => {
    applyTimelineSceneEdit((current) => {
      const scene = current[sceneIndex];
      if (!scene) return current;
      const actions = cloneTimelineActions(scene);
      const action = actions[actionIndex];
      if (!action) return current;
      const nextActions = [...actions.slice(0, actionIndex + 1), { ...action }, ...actions.slice(actionIndex + 1)];
      return current.map((item, index) => (index === sceneIndex ? withTimelineActions(item, nextActions) : item));
    });
  };

  const deleteTimelineAction = (sceneIndex: number, actionIndex: number) => {
    applyTimelineSceneEdit((current) => {
      const scene = current[sceneIndex];
      if (!scene) return current;
      const actions = cloneTimelineActions(scene);
      if (actions.length <= 1 || !actions[actionIndex]) return current;
      const nextActions = actions.filter((_, index) => index !== actionIndex);
      return current.map((item, index) => (index === sceneIndex ? withTimelineActions(item, nextActions) : item));
    });
  };

  const moveTimelineAction = (
    fromSceneIndex: number,
    fromActionIndex: number,
    toSceneIndex: number,
    toActionIndex: number,
  ) => {
    const targetActionIndex = getTimelineMoveDestinationIndex(
      fromActionIndex,
      toActionIndex,
      getSceneActions(
        timelineScenes[toSceneIndex] ??
          timelineScenes[0] ?? {
            id: '',
            title: '',
            caption: '',
            action: 'render',
            duration: 700,
          },
      ).length + (fromSceneIndex === toSceneIndex ? 0 : 1),
    );
    applyTimelineSceneEdit((current) => {
      const fromScene = current[fromSceneIndex];
      const toScene = current[toSceneIndex];
      if (!fromScene || !toScene) return current;

      const fromActions = cloneTimelineActions(fromScene);
      if (!fromActions[fromActionIndex] || (fromSceneIndex !== toSceneIndex && fromActions.length <= 1)) {
        return current;
      }

      if (fromSceneIndex === toSceneIndex) {
        const nextActions = moveTimelineItem(fromActions, fromActionIndex, toActionIndex);
        return nextActions === fromActions
          ? current
          : current.map((scene, index) => (index === fromSceneIndex ? withTimelineActions(scene, nextActions) : scene));
      }

      const [action] = fromActions.splice(fromActionIndex, 1);
      const toActions = cloneTimelineActions(toScene);
      const insertIndex = Math.max(0, Math.min(toActionIndex, toActions.length));
      toActions.splice(insertIndex, 0, action);

      return current.map((scene, index) => {
        if (index === fromSceneIndex) return withTimelineActions(scene, fromActions);
        if (index === toSceneIndex) return withTimelineActions(scene, toActions);
        return scene;
      });
    });
    setEditTarget({ sceneIndex: toSceneIndex, actionIndex: targetActionIndex });
  };

  const commitSavedDemoPreset = (content: string, filePath: string | null, message: string) => {
    setSource(content);
    setSourceLabel(filePath ?? sourceLabel);
    setLoadedFilePath(filePath);
    setIsAuthoringSourceEditing(false);
    setIsTimelineDirty(false);
    setUndoTimelineScenes([]);
    setRedoTimelineScenes([]);
    setPreviousAuthoringDraft(null);
    setLoadError(message);
    resetPlayback();
  };

  const saveTimelinePresetAs = async () => {
    try {
      const content = createCurrentDemoPresetSource();
      const result = await window.fileAPI.saveTextAs({
        defaultName: createTimelinePresetFileName(manifest.title),
        content,
        filters: [
          { name: 'Demo Lab preset', extensions: ['md'] },
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: 'All files', extensions: ['*'] },
        ],
      });
      if (!result.saved) {
        setLoadError('Demo Lab preset save cancelled.');
        return;
      }
      commitSavedDemoPreset(
        content,
        result.path ?? loadedFilePath,
        result.path ? `Saved Demo Lab preset to ${result.path}` : 'Saved Demo Lab preset.',
      );
    } catch (error) {
      setLoadError(`Failed to save Demo Lab preset: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const saveTimelinePreset = async () => {
    if (!loadedFilePath) {
      await saveTimelinePresetAs();
      return;
    }
    try {
      const content = createCurrentDemoPresetSource();
      const result = await window.fileAPI.saveText(loadedFilePath, content);
      if (!result.saved) {
        setLoadError('Demo Lab preset save cancelled.');
        return;
      }
      commitSavedDemoPreset(content, loadedFilePath, `Saved Demo Lab preset to ${loadedFilePath}`);
    } catch (error) {
      setLoadError(`Failed to save Demo Lab preset: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const applyFileResult = (file: OpenFileResult) => {
    if (!isSupportedDemoFile(file)) {
      throw new Error(`Unsupported demo preset file: ${file.fileName || file.filePath}`);
    }
    setSource(file.content);
    setSourceLabel(file.fileName || file.filePath);
    setLoadedFilePath(file.filePath);
    setIsAuthoringSourceEditing(false);
    setIsTimelineDirty(false);
    setUndoTimelineScenes([]);
    setRedoTimelineScenes([]);
    setPreviousAuthoringDraft(null);
    resetPlayback();
    setLoadError(
      hasRenderableDemoContent(file.content)
        ? null
        : 'No xcon-demo or XCON/SKETCH fence was found. Rendering the document as plain Markdown.',
    );
  };

  const applyPresetLoadState = (state: DemoLabPresetLoadState | null, presetId = selectedPresetId) => {
    if (!state) {
      setLoadError(`Unknown Demo Lab preset: ${presetId}`);
      return;
    }
    setSource(state.preset.content);
    setSourceLabel(state.sourceLabel);
    setLoadedFilePath(null);
    setIsAuthoringSourceEditing(false);
    setIsTimelineDirty(false);
    setUndoTimelineScenes([]);
    setRedoTimelineScenes([]);
    setPreviousAuthoringDraft(null);
    resetPlayback();
    setLoadError(state.loadError);
  };

  const loadDemoLabFile = async (filePath?: string) => {
    setIsLoadingFile(true);
    setLoadError(null);
    try {
      const file = filePath ? await window.fileAPI.readFile(filePath) : await window.fileAPI.openFile();
      if (!file) return;
      applyFileResult(file);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingFile(false);
    }
  };

  const loadDroppedDemoLabFile = async (file: File) => {
    setIsLoadingFile(true);
    setLoadError(null);
    try {
      const filePath = window.fileAPI.getPathForFile(file);
      const fileResult = filePath ? await window.fileAPI.readFile(filePath) : null;
      applyFileResult(fileResult ?? (await createDroppedTextFileResult(file)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files.item(0);
    if (!file) {
      setLoadError('Drop a Markdown, XCON/SKETCH, or xcon-demo preset file.');
      return;
    }
    void loadDroppedDemoLabFile(file);
  };

  const useBuiltInDemo = () => {
    applyPresetLoadState(loadPreset('built-in'), 'built-in');
  };

  return (
    <section
      className={`wfr-demo-player${isDragOver ? ' is-drag-over' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={handleDrop}
    >
      {isDragOver && <div className="wfr-demo-player__drop-hint">Drop a demo preset or XCON Markdown file</div>}
      <header className="wfr-demo-player__header">
        <div>
          <p className="wfr-demo-player__eyebrow">Read-only</p>
          <h2>{manifest.title}</h2>
          <p>
            {manifest.format} / {manifest.mode} / {sourceLabel}
            <span className={`wfr-demo-player__dirty-state${isTimelineDirty ? ' is-dirty' : ''}`}>
              {isTimelineDirty ? 'Unsaved changes' : 'Saved'}
            </span>
            {validationDiagnostics.length > 0 && (
              <span className="wfr-demo-player__validation-state">
                {validationErrorCount} error(s), {validationWarningCount} warning(s)
              </span>
            )}
          </p>
        </div>
        <div className="wfr-demo-player__actions">
          <label className="wfr-demo-player__example-picker">
            <span>Example preset</span>
            <select
              value={selectedPresetId}
              onChange={(event) => {
                const nextPresetId = event.target.value;
                setSelectedPresetId(nextPresetId);
                applyPresetLoadState(getAuthoringTemplateLoadState(nextPresetId), nextPresetId);
              }}
            >
              {authoringTemplates.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {getFirstFiveMinutePresetLabel(preset)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void loadDemoLabFile()} disabled={isLoadingFile}>
            {isLoadingFile ? 'Loading...' : 'Open preset'}
          </button>
          <div className="wfr-demo-player__edit-history" aria-label="Timeline edit history">
            <button type="button" onClick={undoTimelineEdit} disabled={undoTimelineScenes.length === 0}>
              Undo edit
            </button>
            <button type="button" onClick={redoTimelineEdit} disabled={redoTimelineScenes.length === 0}>
              Redo edit
            </button>
          </div>
          <button
            type="button"
            onClick={() => void saveTimelinePreset()}
            disabled={!isTimelineDirty && Boolean(loadedFilePath)}
          >
            Save preset
          </button>
          <button type="button" onClick={() => void saveTimelinePresetAs()}>
            Save as preset
          </button>
          <button
            type="button"
            onClick={() => loadedFilePath && void loadDemoLabFile(loadedFilePath)}
            disabled={!loadedFilePath || isLoadingFile}
          >
            Reload
          </button>
          <button type="button" onClick={useBuiltInDemo} disabled={!loadedFilePath && source === BUILT_IN_DEMO}>
            Use built-in
          </button>
          <button type="button" onClick={() => moveScene(-1)} disabled={activeSceneIndex === 0}>
            Prev
          </button>
          <button type="button" className="wfr-demo-player__primary" onClick={playScenes}>
            {isPlaying ? 'Playing...' : 'Play scenes'}
          </button>
          <button type="button" onClick={() => moveScene(1)} disabled={activeSceneIndex >= timelineScenes.length - 1}>
            Next
          </button>
          <button type="button" onClick={resetPlayback}>
            Reset
          </button>
        </div>
      </header>

      <DemoLabPomeloTimeline
        scenes={timelineScenes}
        playbackSnapshot={playbackSnapshot}
        seekSceneAction={selectTimelineSceneAction}
        selectedSceneIndex={editTarget.sceneIndex}
        selectedActionIndex={editTarget.actionIndex}
        insertPreview={timelineInsertPreview}
        activeInsertDrag={activeInsertDrag}
        onPreviewInsertDrop={previewTemplateDropOnTimeline}
        onCommitInsertDrop={commitTemplateDropOnTimeline}
        onClearInsertDropPreview={clearTimelineInsertPreview}
        onMoveScene={moveTimelineScene}
        onMoveAction={moveTimelineAction}
        onUpdateActionDuration={updateTimelineActionDuration}
        onDuplicateScene={duplicateTimelineScene}
        onDeleteScene={deleteTimelineScene}
        onDuplicateAction={duplicateTimelineAction}
        onDeleteAction={deleteTimelineAction}
      />

      <div className="wfr-demo-player__body">
        <DemoLabTimelinePanel
          scenes={timelineScenes}
          playbackSnapshot={playbackSnapshot}
          seekSceneAction={selectTimelineSceneAction}
          onUpdateActionDuration={updateTimelineActionDuration}
          onDuplicateScene={duplicateTimelineScene}
          onDeleteScene={deleteTimelineScene}
          onDuplicateAction={duplicateTimelineAction}
          onDeleteAction={deleteTimelineAction}
          onMoveScene={moveTimelineScene}
          onMoveAction={moveTimelineAction}
        />

        <main className="wfr-demo-player__preview">
          <div className="wfr-demo-player__render-stage" aria-label="Demo render stage" ref={renderStageRef}>
            <StableStreamingXconMarkdown
              content={stablePreviewMarkdown}
              className="wfr-demo-player__markdown"
              deferRendering={isPlaying}
            />
            {highlightRect && (
              <span
                className="wfr-demo-player__rect-highlight"
                data-demo-highlight="true"
                style={{
                  left: `clamp(8px, ${offsetX(highlightRect.x)}px, calc(100% - 28px))`,
                  top: `clamp(8px, ${offsetY(highlightRect.y)}px, calc(100% - 28px))`,
                  width: highlightRect.width,
                  height: highlightRect.height,
                }}
              >
                {highlightText ? <span>{highlightText}</span> : null}
              </span>
            )}
            {calloutText && calloutPosition && (
              <span
                className="wfr-demo-player__floating-callout"
                data-demo-callout="true"
                style={{
                  left: `clamp(8px, ${offsetX(calloutPosition.x)}px, calc(100% - 42px))`,
                  top: `clamp(8px, ${offsetY(calloutPosition.y)}px, calc(100% - 22px))`,
                }}
              >
                {calloutText}
              </span>
            )}
            <span
              className={`wfr-demo-player__cursor${activeAction?.type?.toLowerCase() === 'cursorclick' ? ' is-clicking' : ''}`}
              style={{
                left: `clamp(8px, ${offsetX(cursorPosition.x)}px, calc(100% - 24px))`,
                top: `clamp(8px, ${offsetY(cursorPosition.y)}px, calc(100% - 24px))`,
              }}
            >
              {cursorLabel ? <span>{cursorLabel}</span> : null}
            </span>
            {clickPulseId > 0 && (
              <span
                key={clickPulseId}
                className="wfr-demo-player__click-pulse"
                data-demo-click-pulse="true"
                style={{
                  left: `clamp(8px, ${offsetX(cursorPosition.x)}px, calc(100% - 24px))`,
                  top: `clamp(8px, ${offsetY(cursorPosition.y)}px, calc(100% - 24px))`,
                }}
              />
            )}
          </div>

          <div className="wfr-demo-player__runtime-console" aria-label="Demo playback details">
            <div className="wfr-demo-player__scene-banner">
              <strong>{activeScene?.title}</strong>
              <span>{activeScene?.caption}</span>
            </div>
            <div className="wfr-demo-player__effect-strip">
              <span>
                Action <strong>{activeAction?.type ?? activeScene?.action ?? 'render'}</strong>
              </span>
              <span>
                Focus <strong>{focusedTarget ?? 'none'}</strong>
              </span>
              <span>
                Cursor{' '}
                <strong>
                  {Math.round(cursorPosition.x)}, {Math.round(cursorPosition.y)}
                </strong>
              </span>
              <span>
                Progress <strong>{Math.round(playbackSnapshot.progress * 100)}%</strong>
              </span>
            </div>
            <div className="wfr-demo-player__simulation" aria-label="Scene action playback state">
              <div
                className={`wfr-demo-player__focus-target${focusedTarget === 'source' ? ' is-focused' : ''}${highlightedTarget === 'source' ? ' wfr-demo-player__highlight' : ''}`}
              >
                Source
              </div>
              <div
                className={`wfr-demo-player__focus-target${focusedTarget === 'preview' || focusedTarget === 'artifact' ? ' is-focused' : ''}${highlightedTarget === 'artifact' ? ' wfr-demo-player__highlight' : ''}`}
              >
                Artifact
              </div>
              <div
                className={`wfr-demo-player__focus-target${focusedTarget === 'timeline' || focusedTarget === 'scene-runner' ? ' is-focused' : ''}${highlightedTarget === 'timeline' || highlightedTarget === 'scene-runner' ? ' wfr-demo-player__highlight' : ''}`}
              >
                Timeline
              </div>
              <div className="wfr-demo-player__typed">
                {typedText || activeScene?.caption || 'Waiting for scene action...'}
              </div>
              {calloutText && <div className="wfr-demo-player__callout">{calloutText}</div>}
            </div>
            <div className="wfr-demo-player__runtime-state" aria-label="Runtime binding state">
              <span>
                Fixture <strong>{fixtureStatus}</strong>
              </span>
              <span>
                Chain <strong>{chainStatus}</strong>
              </span>
              <span>
                Workflow event <strong>{workflowEventStatus}</strong>
              </span>
            </div>
            {actionLog.length > 0 && (
              <ul className="wfr-demo-player__event-log" aria-label="Recent demo action events">
                {actionLog.map((eventLabel, index) => (
                  <li key={`${eventLabel}-${index}`}>{eventLabel}</li>
                ))}
              </ul>
            )}
            {loadError && <div className="wfr-demo-player__load-error">{loadError}</div>}
            {validationDiagnostics.length > 0 && (
              <div className="wfr-demo-player__validation-diagnostics" aria-label="Demo preset validation diagnostics">
                <strong>Demo contract diagnostics</strong>
                <ul>
                  {validationDiagnostics.map((diagnostic) => (
                    <li
                      key={`${diagnostic.severity}-${diagnostic.path}-${diagnostic.message}`}
                      className={`is-${diagnostic.severity}`}
                    >
                      <span>{diagnostic.severity}</span>
                      <code>{diagnostic.path}</code>
                      {diagnostic.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </main>

        <aside className="wfr-demo-player__inspector" aria-label="Demo property inspector">
          <div className="wfr-demo-player__inspector-head">
            <strong>Properties</strong>
            <span>
              Scene {editTarget.sceneIndex + 1} / Action {editTarget.actionIndex + 1}
            </span>
          </div>
          {selectedEditScene && (
            <section className="wfr-demo-player__property-section" aria-label="Selected demo scene">
              <h3>Scene</h3>
              <label>
                <span>Title</span>
                <input
                  aria-label="Demo scene title"
                  value={selectedEditScene.title}
                  onChange={(event) => updateTimelineSceneField(editTarget.sceneIndex, 'title', event.target.value)}
                />
              </label>
              <label>
                <span>Caption</span>
                <textarea
                  aria-label="Demo scene caption"
                  value={selectedEditScene.caption}
                  rows={3}
                  onChange={(event) => updateTimelineSceneField(editTarget.sceneIndex, 'caption', event.target.value)}
                />
              </label>
              <label>
                <span>Scene action</span>
                <input
                  aria-label="Demo scene action"
                  value={selectedEditScene.action}
                  onChange={(event) => updateTimelineSceneField(editTarget.sceneIndex, 'action', event.target.value)}
                />
              </label>
            </section>
          )}
          {selectedEditScene && (
            <section className="wfr-demo-player__property-section" aria-label="Demo scene library">
              <h3>Scene Library</h3>
              <p className="wfr-demo-player__property-note">Insert a reusable scene after the selected scene.</p>
              <div className="wfr-demo-player__scene-library">
                {DEMO_SCENE_LIBRARY.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.description}
                    aria-label={`Add ${item.label} scene`}
                    onClick={() => insertTimelineScene(editTarget.sceneIndex, item.scene)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          )}
          {selectedEditScene && (
            <section className="wfr-demo-player__property-section" aria-label="Demo action library">
              <h3>Action Library</h3>
              <p className="wfr-demo-player__property-note">Insert a reusable demo action after the selected action.</p>
              <div className="wfr-demo-player__action-library">
                {DEMO_ACTION_LIBRARY.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    title={item.description}
                    aria-label={`Add ${item.type} action`}
                    onClick={() => insertTimelineAction(editTarget.sceneIndex, editTarget.actionIndex, item.action)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          )}
          {selectedEditAction && (
            <section className="wfr-demo-player__property-section" aria-label="Selected demo action">
              <h3>Action</h3>
              <label>
                <span>Type</span>
                <input
                  aria-label="Demo action type"
                  value={selectedEditAction.type}
                  onChange={(event) =>
                    updateTimelineActionField(editTarget.sceneIndex, editTarget.actionIndex, 'type', event.target.value)
                  }
                />
              </label>
              <label>
                <span>Target</span>
                <input
                  aria-label="Demo action target"
                  value={selectedEditAction.target ?? ''}
                  onChange={(event) =>
                    updateTimelineActionField(
                      editTarget.sceneIndex,
                      editTarget.actionIndex,
                      'target',
                      event.target.value,
                    )
                  }
                />
              </label>
              <label>
                <span>Text</span>
                <textarea
                  aria-label="Demo action text"
                  value={selectedEditAction.text ?? ''}
                  rows={3}
                  onChange={(event) =>
                    updateTimelineActionField(editTarget.sceneIndex, editTarget.actionIndex, 'text', event.target.value)
                  }
                />
              </label>
              <label>
                <span>Status</span>
                <input
                  aria-label="Demo action status"
                  value={selectedEditAction.status ?? ''}
                  onChange={(event) =>
                    updateTimelineActionField(
                      editTarget.sceneIndex,
                      editTarget.actionIndex,
                      'status',
                      event.target.value,
                    )
                  }
                />
              </label>
              <div className="wfr-demo-player__property-grid">
                <label>
                  <span>X</span>
                  <input
                    aria-label="Demo action x"
                    value={selectedEditAction.x ?? ''}
                    inputMode="numeric"
                    onChange={(event) =>
                      updateTimelineActionField(editTarget.sceneIndex, editTarget.actionIndex, 'x', event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Y</span>
                  <input
                    aria-label="Demo action y"
                    value={selectedEditAction.y ?? ''}
                    inputMode="numeric"
                    onChange={(event) =>
                      updateTimelineActionField(editTarget.sceneIndex, editTarget.actionIndex, 'y', event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Duration</span>
                  <input
                    aria-label="Demo action duration"
                    value={selectedEditAction.duration ?? ''}
                    inputMode="numeric"
                    onChange={(event) =>
                      updateTimelineActionField(
                        editTarget.sceneIndex,
                        editTarget.actionIndex,
                        'duration',
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            </section>
          )}
        </aside>

        <aside className="wfr-demo-player__source" aria-label="Demo source">
          <div className="wfr-demo-player__source-head">
            <div>
              <strong>{isAuthoringSourceEditing ? 'Authoring Source' : 'Authoring Preview'}</strong>
              <span>{timelineScenes.length} scene(s)</span>
            </div>
            <div className="wfr-demo-player__source-actions">
              {isAuthoringSourceEditing ? (
                <button type="button" onClick={stopAuthoringSourceEdit}>
                  Preview authoring source
                </button>
              ) : (
                <button type="button" onClick={startAuthoringSourceEdit}>
                  Edit authoring source
                </button>
              )}
            </div>
          </div>
          <p className="wfr-demo-player__source-path">{loadedFilePath ?? sourceLabel}</p>
          {isAuthoringSourceEditing && (
            <>
              <div className="wfr-demo-player__snippet-bar" aria-label="Authoring source snippets">
                <span className="wfr-demo-player__snippet-label">Templates</span>
                <select
                  aria-label="Authoring template preset"
                  value={selectedPresetId}
                  onChange={(event) => setSelectedPresetId(event.target.value)}
                >
                  {authoringTemplates.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {getFirstFiveMinutePresetLabel(preset)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={saveCurrentSourceAsLocalTemplate}
                >
                  Save current source as local template
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={replaceAuthoringSourceWithSelectedTemplate}
                >
                  Replace source with selected template
                </button>
                <button
                  type="button"
                  disabled={!previousAuthoringDraft}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={restorePreviousAuthoringDraft}
                >
                  Restore previous draft
                </button>
                <span className="wfr-demo-player__snippet-label">Scenes</span>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertAuthoringSnippet(DEFAULT_AUTHORING_SCENE_SNIPPET)}
                >
                  Insert scene snippet
                </button>
                {DEMO_SCENE_LIBRARY.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.description}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertAuthoringSnippet(createDemoSceneSnippet(item))}
                  >
                    Insert {item.label} scene preset
                  </button>
                ))}
                <span className="wfr-demo-player__snippet-label">Actions</span>
                {DEMO_ACTION_LIBRARY.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    title={item.description}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertAuthoringSnippet(createDemoActionSnippet(item))}
                  >
                    Insert {item.label} action snippet
                  </button>
                ))}
              </div>
              <section className="wfr-demo-player__template-library" aria-label="Authoring template library">
                <div className="wfr-demo-player__template-library-head">
                  <strong>Template Library</strong>
                  <span>
                    {filteredAuthoringTemplates.length} match{filteredAuthoringTemplates.length === 1 ? '' : 'es'}
                  </span>
                </div>
                <div className="wfr-demo-player__template-library-controls">
                  <label>
                    <span>Search</span>
                    <input
                      aria-label="Search authoring templates"
                      value={authoringTemplateQuery}
                      placeholder="title, tag, action..."
                      onChange={(event) => setAuthoringTemplateQuery(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Category</span>
                    <select
                      aria-label="Authoring template category"
                      value={authoringTemplateCategory}
                      onChange={(event) => setAuthoringTemplateCategory(event.target.value)}
                    >
                      {authoringTemplateCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="wfr-demo-player__template-quick-lists">
                  <div aria-label="Favorite authoring templates">
                    <strong>Favorites</strong>
                    {favoriteAuthoringTemplates.length === 0 ? (
                      <span>No favorites yet</span>
                    ) : (
                      favoriteAuthoringTemplates.map((preset) => (
                        <button key={preset.id} type="button" onClick={() => setSelectedPresetId(preset.id)}>
                          {preset.title}
                        </button>
                      ))
                    )}
                  </div>
                  <div aria-label="Recent authoring templates">
                    <strong>Recent</strong>
                    {recentAuthoringTemplates.length === 0 ? (
                      <span>No recent templates</span>
                    ) : (
                      recentAuthoringTemplates.map((preset) => (
                        <button key={preset.id} type="button" onClick={() => setSelectedPresetId(preset.id)}>
                          {preset.title}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div className="wfr-demo-player__template-card-list">
                  {filteredAuthoringTemplates.length === 0 ? (
                    <p>No templates match the current filters.</p>
                  ) : (
                    filteredAuthoringTemplates.map((preset) => {
                      const isFavorite = favoriteAuthoringTemplateIds.includes(preset.id);
                      const isSelected = preset.id === selectedPresetId;
                      const storyboardScenes = createAuthoringTemplateStoryboard(preset);
                      return (
                        <article
                          key={preset.id}
                          className={`wfr-demo-player__template-card${isSelected ? ' is-selected' : ''}`}
                        >
                          <div>
                            <strong className="wfr-demo-player__template-card-title">
                              {preset.title}
                              {isFirstFiveMinutePreset(preset) && (
                                <span className="wfr-demo-player__template-card-badge">First 5 min</span>
                              )}
                            </strong>
                            <span>
                              {preset.category} / {preset.fileName}
                            </span>
                            <p>{preset.description}</p>
                          </div>
                          <div
                            className="wfr-demo-player__template-storyboard"
                            aria-label={`Storyboard preview for ${preset.title}`}
                          >
                            {storyboardScenes.length === 0 ? (
                              <span>No scenes</span>
                            ) : (
                              storyboardScenes.map((scene, index) => (
                                <div
                                  key={`${scene.id}-${index}`}
                                  className="wfr-demo-player__template-storyboard-scene"
                                >
                                  <span className="wfr-demo-player__template-storyboard-step">{index + 1}</span>
                                  <div>
                                    <strong>{scene.title}</strong>
                                    <span>{scene.durationLabel}</span>
                                    <div className="wfr-demo-player__template-insert-row">
                                      <button
                                        type="button"
                                        draggable
                                        aria-label={`Drag ${scene.title} scene from ${preset.title} template`}
                                        onDragStart={(event) =>
                                          startTemplateTimelineDrag(event, createTemplateSceneDrag(preset, index))
                                        }
                                        onDragEnd={clearTemplateTimelineDrag}
                                      >
                                        Drag
                                      </button>
                                      <button
                                        type="button"
                                        aria-label={`Insert ${scene.title} scene before current scene from ${preset.title} template`}
                                        onMouseEnter={() => previewTemplateSceneInsert(preset, index, 'before')}
                                        onFocus={() => previewTemplateSceneInsert(preset, index, 'before')}
                                        onMouseLeave={clearTimelineInsertPreview}
                                        onBlur={clearTimelineInsertPreview}
                                        onClick={() => insertTemplateSceneIntoTimeline(preset, index, 'before')}
                                      >
                                        Before scene
                                      </button>
                                      <button
                                        type="button"
                                        aria-label={`Insert ${scene.title} scene after current scene from ${preset.title} template`}
                                        onMouseEnter={() => previewTemplateSceneInsert(preset, index, 'after')}
                                        onFocus={() => previewTemplateSceneInsert(preset, index, 'after')}
                                        onMouseLeave={clearTimelineInsertPreview}
                                        onBlur={clearTimelineInsertPreview}
                                        onClick={() => insertTemplateSceneIntoTimeline(preset, index, 'after')}
                                      >
                                        After scene
                                      </button>
                                    </div>
                                    <div>
                                      {scene.actions.length === 0 ? (
                                        <code>none</code>
                                      ) : (
                                        scene.actions.map((action, actionIndex) => (
                                          <span
                                            key={`${action.type}-${actionIndex}`}
                                            className="wfr-demo-player__template-action-insert"
                                          >
                                            <code>{action.type}</code>
                                            <button
                                              type="button"
                                              draggable
                                              aria-label={`Drag ${action.type} action from ${scene.title} scene`}
                                              onDragStart={(event) =>
                                                startTemplateTimelineDrag(
                                                  event,
                                                  createTemplateActionDrag(preset, index, actionIndex),
                                                )
                                              }
                                              onDragEnd={clearTemplateTimelineDrag}
                                            >
                                              D
                                            </button>
                                            <button
                                              type="button"
                                              aria-label={`Insert ${action.type} action before current action from ${scene.title} scene`}
                                              onMouseEnter={() =>
                                                previewTemplateActionInsert(preset, index, actionIndex, 'before')
                                              }
                                              onFocus={() =>
                                                previewTemplateActionInsert(preset, index, actionIndex, 'before')
                                              }
                                              onMouseLeave={clearTimelineInsertPreview}
                                              onBlur={clearTimelineInsertPreview}
                                              onClick={() =>
                                                insertTemplateActionIntoCurrentScene(
                                                  preset,
                                                  index,
                                                  actionIndex,
                                                  'before',
                                                )
                                              }
                                            >
                                              B
                                            </button>
                                            <button
                                              type="button"
                                              aria-label={`Insert ${action.type} action after current action from ${scene.title} scene`}
                                              onMouseEnter={() =>
                                                previewTemplateActionInsert(preset, index, actionIndex, 'after')
                                              }
                                              onFocus={() =>
                                                previewTemplateActionInsert(preset, index, actionIndex, 'after')
                                              }
                                              onMouseLeave={clearTimelineInsertPreview}
                                              onBlur={clearTimelineInsertPreview}
                                              onClick={() =>
                                                insertTemplateActionIntoCurrentScene(
                                                  preset,
                                                  index,
                                                  actionIndex,
                                                  'after',
                                                )
                                              }
                                            >
                                              A
                                            </button>
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="wfr-demo-player__template-card-tags">
                            {preset.tags.slice(0, 4).map((tag) => (
                              <code key={tag}>{tag}</code>
                            ))}
                          </div>
                          <div className="wfr-demo-player__template-card-actions">
                            <button
                              type="button"
                              aria-label={`Select ${preset.title} template`}
                              onClick={() => setSelectedPresetId(preset.id)}
                            >
                              Select
                            </button>
                            <button
                              type="button"
                              aria-label={`${isFavorite ? 'Unfavorite' : 'Favorite'} ${preset.title} template`}
                              onClick={() => toggleFavoriteAuthoringTemplate(preset.id)}
                            >
                              {isFavorite ? 'Pinned' : 'Pin'}
                            </button>
                            {preset.kind === 'local' && (
                              <button
                                type="button"
                                aria-label={`Delete ${preset.title} local template`}
                                onClick={() => deleteLocalAuthoringTemplate(preset.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
              {selectedAuthoringTemplateSummary && (
                <section className="wfr-demo-player__template-details" aria-label="Selected authoring template details">
                  <div className="wfr-demo-player__template-details-head">
                    <div>
                      <strong>{selectedAuthoringTemplateSummary.title}</strong>
                      <span>
                        {selectedAuthoringTemplateSummary.kindLabel} template /{' '}
                        {selectedAuthoringTemplateSummary.fileName}
                      </span>
                    </div>
                    <span>{selectedAuthoringTemplateSummary.durationLabel}</span>
                  </div>
                  <div className="wfr-demo-player__template-metrics">
                    <span>
                      <strong>{selectedAuthoringTemplateSummary.sceneCount}</strong> scenes
                    </span>
                    <span>
                      <strong>{selectedAuthoringTemplateSummary.actionCount}</strong> actions
                    </span>
                    <span>
                      <strong>{selectedAuthoringTemplateSummary.durationLabel}</strong> total
                    </span>
                  </div>
                  <div className="wfr-demo-player__template-chip-row">
                    <span>Actions</span>
                    {(selectedAuthoringTemplateSummary.actionTypes.length > 0
                      ? selectedAuthoringTemplateSummary.actionTypes
                      : ['none']
                    ).map((type) => (
                      <code key={type}>{type}</code>
                    ))}
                  </div>
                  <div className="wfr-demo-player__template-chip-row">
                    <span>Includes</span>
                    {(selectedAuthoringTemplateSummary.capabilities.length > 0
                      ? selectedAuthoringTemplateSummary.capabilities
                      : ['Markdown only']
                    ).map((capability) => (
                      <code key={capability}>{capability}</code>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
          {isAuthoringSourceEditing ? (
            <section className="wfr-demo-player__source-section is-editor" aria-label="Original preset source">
              <div>
                <strong>Preset source</strong>
                <span>live parsed</span>
              </div>
              <textarea
                aria-label="Editable xcon-demo source"
                ref={authoringSourceRef}
                spellCheck={false}
                value={source}
                onChange={(event) => updateAuthoringSource(event.target.value)}
              />
            </section>
          ) : (
            <section className="wfr-demo-player__source-section" aria-label="Original preset source">
              <div>
                <strong>Preset source</strong>
                <span>author input</span>
              </div>
              <pre>{source}</pre>
            </section>
          )}
          <section className="wfr-demo-player__source-section" aria-label="Canonical xcon-demo source">
            <div>
              <strong>Canonical contract</strong>
              <span>scene.N.*</span>
            </div>
            <pre>{canonicalDemoSource}</pre>
          </section>
          <section className="wfr-demo-player__source-section" aria-label="Demo authoring diagnostics">
            <div>
              <strong>Contract diagnostics</strong>
              <span>
                {validationErrorCount} error(s), {validationWarningCount} warning(s)
              </span>
            </div>
            {validationDiagnostics.length === 0 ? (
              <p className="wfr-demo-player__source-ok">No contract diagnostics.</p>
            ) : (
              <ul className="wfr-demo-player__source-diagnostics">
                {validationDiagnostics.map((diagnostic) => (
                  <li
                    key={`${diagnostic.severity}-${diagnostic.path}-${diagnostic.message}`}
                    className={`is-${diagnostic.severity}`}
                  >
                    <span>{diagnostic.severity}</span>
                    <code>{diagnostic.path}</code>
                    {diagnostic.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
