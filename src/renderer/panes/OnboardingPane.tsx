import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type {
  CapturePaneResult,
  McpBridgeOnboardingDemoModeRunPayload,
  McpBridgeOnboardingDemoModeRunResult,
  McpBridgeOnboardingDemoModeUiSnapshot,
  McpBridgeOnboardingRunPreviewPayload,
  McpBridgeOnboardingRunPreviewResult,
  McpBridgeOnboardingScenarioRunResult,
  OnboardingDemoRouteOpenRequest,
  OnboardingDemoRouteOpenResult,
  OnboardingDemoRouteResult,
  OnboardingDemoRouteSaveResult,
  OnboardingRunArtifact,
  OnboardingSampleWorkspaceStatus,
  OnboardingSettings,
} from '../../shared/types';
import { useI18n } from '../i18n';
import { BASIC_DESK_ONBOARDING_STEPS } from './onboarding/basicDeskSteps';
import {
  completeOnboardingStep,
  createDefaultOnboardingProgress,
  ONBOARDING_VERSION,
  skipOnboardingStep,
} from './onboarding/onboardingState';
import type {
  OnboardingActionDefinition,
  OnboardingActionId,
  OnboardingMode,
  OnboardingProgressState,
  OnboardingStepVerifier,
  OnboardingVerificationSnapshot,
} from './onboarding/onboardingTypes';

export interface OnboardingPaneProps {
  contentId?: string;
  onOpenFolder: () => void;
  onOpenTerminal: () => void;
  onOpenFile: () => void;
  onOpenWorkspace: () => void;
  onOpenKeyboardShortcuts: () => void;
  onOpenExtensions: () => void;
  onOpenDiagnostics: () => void;
  onOpenCommandCenter: () => void;
  onArrangePanes: () => void;
  onSaveWorkspace: () => void;
  onRestoreWorkspace: () => void;
  onUseWorkspacePath: (path: string) => void;
  onVerifyStep: OnboardingStepVerifier;
  onRunScenario: () => Promise<McpBridgeOnboardingScenarioRunResult>;
  onVerifyAll: () => Promise<McpBridgeOnboardingScenarioRunResult>;
  onEnsureVisible?: () => void;
  onDismiss: () => void;
}

const BASIC_DESK_STEP_IDS = new Set(BASIC_DESK_ONBOARDING_STEPS.map((step) => step.id));

function normalizeProgress(settings: OnboardingSettings | undefined): OnboardingProgressState {
  const fallback = createDefaultOnboardingProgress();
  const currentStepId =
    settings?.currentStepId && BASIC_DESK_STEP_IDS.has(settings.currentStepId)
      ? settings.currentStepId
      : fallback.currentStepId;
  return {
    currentTrack: settings?.currentTrack === 'basic-desk' ? settings.currentTrack : fallback.currentTrack,
    currentStepId,
    completedStepIds: Array.isArray(settings?.completedStepIds) ? settings.completedStepIds : [],
    skippedStepIds: Array.isArray(settings?.skippedStepIds) ? settings.skippedStepIds : [],
    verificationResults: settings?.verificationResults ?? {},
    sampleWorkspacePath: typeof settings?.sampleWorkspacePath === 'string' ? settings.sampleWorkspacePath : '',
  };
}

function verificationSnapshot(
  state: OnboardingVerificationSnapshot['state'],
  message: string,
): OnboardingVerificationSnapshot {
  return {
    state,
    checkedAt: Date.now(),
    message,
  };
}

function formatRunArtifactDate(value: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value;
  return new Date(time).toLocaleString();
}

function waitForOnboardingPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function ensureDemoModePaneVisible(requestId: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let timeout: number | undefined;
    let listener: (event: Event) => void = () => undefined;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (typeof timeout === 'number') window.clearTimeout(timeout);
      window.removeEventListener('onboarding-demo-mode-ensure-visible-result', listener);
      resolve();
    };
    listener = (event: Event) => {
      const detail = (event as CustomEvent<{ requestId?: string }>).detail ?? {};
      if (String(detail.requestId || '').trim() !== requestId) return;
      finish();
    };
    timeout = window.setTimeout(finish, 1500);
    window.addEventListener('onboarding-demo-mode-ensure-visible-result', listener);
    window.dispatchEvent(
      new CustomEvent('onboarding-demo-mode-ensure-visible-request', {
        detail: { requestId },
      }),
    );
  });
}

function getActiveOnboardingRoot(fallback: HTMLElement | null): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('.content-view.is-active[data-content-type="onboarding"] .onboarding-pane') ??
    fallback
  );
}

function OnboardingRunScreenshotThumb({
  filePath,
  alt,
  placeholder,
}: {
  filePath?: string;
  alt: string;
  placeholder: string;
}) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSrc('');
    if (!filePath)
      return () => {
        cancelled = true;
      };
    window.captureAPI
      ?.getThumbnail?.(filePath)
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl || '');
      })
      .catch(() => {
        if (!cancelled) setSrc('');
      });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return <div className="onboarding-run-thumb">{src ? <img src={src} alt={alt} /> : <span>{placeholder}</span>}</div>;
}

export function OnboardingPane({
  contentId,
  onOpenFolder,
  onOpenTerminal,
  onOpenFile,
  onOpenWorkspace,
  onOpenKeyboardShortcuts,
  onOpenExtensions,
  onOpenDiagnostics,
  onOpenCommandCenter,
  onArrangePanes,
  onSaveWorkspace,
  onRestoreWorkspace,
  onUseWorkspacePath,
  onVerifyStep,
  onRunScenario,
  onVerifyAll,
  onEnsureVisible,
  onDismiss,
}: OnboardingPaneProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<OnboardingMode>('learn');
  const [onboardingView, setOnboardingView] = useState<'simple' | 'guided'>('simple');
  const [progress, setProgress] = useState<OnboardingProgressState>(() => createDefaultOnboardingProgress());
  const [sampleStatus, setSampleStatus] = useState<OnboardingSampleWorkspaceStatus | null>(null);
  const [busyAction, setBusyAction] = useState<OnboardingActionId | 'dismiss' | 'scenario-run' | 'verify-all' | null>(
    null,
  );
  const [scenarioResults, setScenarioResults] = useState<McpBridgeOnboardingScenarioRunResult['steps']>([]);
  const [scenarioSummary, setScenarioSummary] = useState('');
  const [demoRouteSaveStatus, setDemoRouteSaveStatus] = useState('');
  const [recentRunArtifacts, setRecentRunArtifacts] = useState<OnboardingRunArtifact[]>([]);
  const [selectedRunArtifactId, setSelectedRunArtifactId] = useState('');
  const [demoRouteResult, setDemoRouteResult] = useState<OnboardingDemoRouteResult | null>(null);
  const [demoRoutePath, setDemoRoutePath] = useState('');
  const [demoRouteError, setDemoRouteError] = useState('');
  const rootRef = useRef<HTMLElement | null>(null);
  const runViewerRef = useRef<HTMLElement | null>(null);
  const demoRouteViewerRef = useRef<HTMLElement | null>(null);
  const latestDemoRouteSignatureRef = useRef('');

  const currentStep = useMemo(
    () =>
      BASIC_DESK_ONBOARDING_STEPS.find((step) => step.id === progress.currentStepId) ?? BASIC_DESK_ONBOARDING_STEPS[0],
    [progress.currentStepId],
  );
  const currentStepIndex = BASIC_DESK_ONBOARDING_STEPS.findIndex((step) => step.id === currentStep.id);
  const currentVerification =
    progress.verificationResults[currentStep.id] ?? verificationSnapshot('idle', t('app.onboardingVerifyIdle'));
  const completedCount = progress.completedStepIds.length;
  const progressPercent = Math.round((completedCount / BASIC_DESK_ONBOARDING_STEPS.length) * 100);
  const selectedRunArtifact = useMemo(
    () =>
      recentRunArtifacts.find((artifact) => artifact.runId === selectedRunArtifactId) ?? recentRunArtifacts[0] ?? null,
    [recentRunArtifacts, selectedRunArtifactId],
  );
  const demoRouteStoryboard = demoRouteResult?.storyboard ?? null;
  const demoRouteScenes = demoRouteStoryboard?.scenes ?? [];
  const demoRouteRunId = demoRouteStoryboard?.runId || demoRouteResult?.artifact?.runId || '';
  const scenarioFailureSummary = useMemo(() => {
    const failedStep = scenarioResults.find((step) => !step.passed);
    if (!failedStep) return '';
    const definition = BASIC_DESK_ONBOARDING_STEPS.find((step) => step.id === failedStep.stepId);
    const title = definition ? t(definition.titleKey) : failedStep.stepId;
    return t('app.onboardingScenarioFailedSummary', {
      step: title,
      message: failedStep.error || failedStep.message || t('app.onboardingVerifyUnknownStep'),
    });
  }, [scenarioResults, t]);

  const collectDemoModeUiSnapshot = useCallback(
    (overrides?: {
      scenario?: McpBridgeOnboardingScenarioRunResult;
      demoRouteSave?: OnboardingDemoRouteSaveResult | null;
      playerOpen?: OnboardingDemoRouteOpenResult | null;
    }): McpBridgeOnboardingDemoModeUiSnapshot => {
      const root = getActiveOnboardingRoot(rootRef.current);
      const statusText =
        root?.querySelector<HTMLElement>('.onboarding-demo-route-status')?.innerText.trim() ||
        demoRouteSaveStatus ||
        (overrides?.demoRouteSave?.ok
          ? t('app.onboardingDemoRouteGenerated', { count: overrides.demoRouteSave.sceneCount })
          : '');
      const failureText =
        root?.querySelector<HTMLElement>('.onboarding-scenario-failure')?.innerText.trim() ||
        scenarioFailureSummary ||
        '';
      const routeViewer = root?.querySelector<HTMLElement>('.onboarding-demo-route-viewer') ?? null;
      const runViewer = root?.querySelector<HTMLElement>('.onboarding-run-viewer') ?? null;
      const renderedMode =
        root?.querySelector<HTMLElement>('.onboarding-demo-panel')?.dataset.mode === 'learn' ? 'learn' : 'demo';
      const actionButtons = Array.from(
        root?.querySelectorAll<HTMLButtonElement>('.onboarding-demo-route-actions button') ?? [],
      );
      const storyboardLabel = t('app.onboardingDemoRouteOpenStoryboard');
      const playerLabel = t('app.onboardingDemoRouteOpenPlayer');
      const route = overrides?.demoRouteSave?.route ?? demoRouteResult;
      const scenes = route?.storyboard?.scenes ?? demoRouteScenes;
      const runId =
        route?.storyboard?.runId || route?.artifact?.runId || demoRouteRunId || selectedRunArtifact?.runId || '';
      return {
        mode: renderedMode,
        statusText: statusText || undefined,
        failureText: failureText || undefined,
        scenarioSummary: scenarioSummary || undefined,
        runArtifactCount: recentRunArtifacts.length,
        selectedRunId: selectedRunArtifact?.runId,
        demoRouteRunId: runId || undefined,
        sceneCount: scenes.length,
        routeViewerVisible: Boolean(routeViewer),
        runViewerVisible: Boolean(runViewer),
        storyboardActionVisible:
          Boolean(route) && actionButtons.some((button) => button.textContent?.includes(storyboardLabel)),
        playerActionVisible:
          Boolean(route) && actionButtons.some((button) => button.textContent?.includes(playerLabel)),
      };
    },
    [
      demoRouteResult,
      demoRouteRunId,
      demoRouteSaveStatus,
      demoRouteScenes,
      mode,
      recentRunArtifacts.length,
      scenarioFailureSummary,
      scenarioSummary,
      selectedRunArtifact?.runId,
      t,
    ],
  );

  const captureDemoModeUi = useCallback(async (): Promise<CapturePaneResult | undefined> => {
    if (!window.captureAPI?.capturePane) return undefined;
    await waitForOnboardingPaint();
    const target = getActiveOnboardingRoot(rootRef.current) ?? document.querySelector<HTMLElement>('.onboarding-pane');
    const rect = target?.getBoundingClientRect();
    if (!rect || rect.width < 1 || rect.height < 1) return undefined;
    return window.captureAPI.capturePane({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      title: 'Basic Desk onboarding Demo Mode',
      contentType: 'onboarding-demo-mode',
    });
  }, []);

  const refreshSampleStatus = useCallback(async () => {
    try {
      const status = await window.onboardingAPI.sampleStatus();
      setSampleStatus(status);
    } catch {
      setSampleStatus(null);
    }
  }, []);

  const refreshRunArtifacts = useCallback(async (options?: { selectRunId?: string }) => {
    try {
      const artifacts = await window.onboardingAPI.listRunArtifacts();
      setRecentRunArtifacts(artifacts);
      const requestedRunId = String(options?.selectRunId || '').trim();
      const requestedArtifact = requestedRunId
        ? (artifacts.find((artifact) => artifact.runId === requestedRunId) ?? null)
        : null;
      const fallbackRunId = requestedArtifact?.runId ?? artifacts[0]?.runId ?? '';
      setSelectedRunArtifactId((current) => {
        if (requestedRunId) return fallbackRunId;
        return current && artifacts.some((artifact) => artifact.runId === current) ? current : fallbackRunId;
      });
      return artifacts;
    } catch {
      setRecentRunArtifacts([]);
      setSelectedRunArtifactId('');
      return [];
    }
  }, []);

  const refreshDemoRoute = useCallback(
    async (options?: { ensureVisible?: boolean }) => {
      try {
        const result = await window.onboardingAPI.readDemoRoute();
        const nextRoute = result.route ?? null;
        const nextSignature = nextRoute
          ? `${nextRoute.generatedAt || ''}:${nextRoute.storyboard?.runId || nextRoute.artifact?.runId || ''}`
          : '';
        const routeChanged = Boolean(nextSignature) && latestDemoRouteSignatureRef.current !== nextSignature;
        const activeOnboardingRoot = getActiveOnboardingRoot(rootRef.current);
        const activeRouteUpdate = activeOnboardingRoot === rootRef.current && routeChanged;
        const shouldEnsureVisible =
          options?.ensureVisible === true || activeRouteUpdate || (mode === 'demo' && routeChanged);
        setDemoRoutePath(result.path);
        setDemoRouteResult(nextRoute);
        setDemoRouteError(result.exists ? result.error || nextRoute?.error || '' : '');
        latestDemoRouteSignatureRef.current = nextSignature;
        if (activeRouteUpdate) {
          flushSync(() => setMode('demo'));
        }
        if (shouldEnsureVisible) {
          window.requestAnimationFrame(() => {
            demoRouteViewerRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
          });
        }
      } catch (error) {
        setDemoRouteResult(null);
        setDemoRouteError(error instanceof Error ? error.message : String(error));
      }
    },
    [mode],
  );

  const persistProgress = useCallback(
    async (nextProgress: OnboardingProgressState, options?: { dismissed?: boolean }) => {
      const settings = await window.terminalAPI.getSettings();
      const previous = settings.onboarding;
      const dismissed = options?.dismissed ?? previous?.dismissed === true;
      const onboarding: OnboardingSettings = {
        dismissed,
        dismissedAt: dismissed ? Date.now() : Number.isFinite(previous?.dismissedAt) ? Number(previous.dismissedAt) : 0,
        version: ONBOARDING_VERSION,
        currentTrack: nextProgress.currentTrack,
        currentStepId: nextProgress.currentStepId,
        completedStepIds: nextProgress.completedStepIds,
        skippedStepIds: nextProgress.skippedStepIds,
        verificationResults: nextProgress.verificationResults,
        sampleWorkspacePath: nextProgress.sampleWorkspacePath,
      };
      await window.terminalAPI.saveSettings({ onboarding: onboarding });
      window.dispatchEvent(new CustomEvent('app-settings-changed', { detail: { onboarding } }));
    },
    [],
  );

  const updateProgress = useCallback(
    async (nextProgress: OnboardingProgressState) => {
      setProgress(nextProgress);
      await persistProgress(nextProgress);
    },
    [persistProgress],
  );

  useEffect(() => {
    let cancelled = false;
    window.terminalAPI
      .getSettings()
      .then((settings) => {
        if (cancelled) return;
        setProgress(normalizeProgress(settings.onboarding));
      })
      .catch(() => {
        if (!cancelled) setProgress(createDefaultOnboardingProgress());
      });
    void refreshSampleStatus();
    void refreshRunArtifacts();
    void refreshDemoRoute();
    return () => {
      cancelled = true;
    };
  }, [refreshDemoRoute, refreshRunArtifacts, refreshSampleStatus]);

  useEffect(() => {
    if (typeof window.onboardingAPI.onSampleStatusChanged !== 'function') {
      void refreshSampleStatus();
      return undefined;
    }
    return window.onboardingAPI.onSampleStatusChanged((status) => {
      setSampleStatus(status);
      setProgress((current) => {
        if (status.exists && current.sampleWorkspacePath !== status.path) {
          return { ...current, sampleWorkspacePath: status.path };
        }
        if (!status.exists && current.sampleWorkspacePath) {
          return { ...current, sampleWorkspacePath: '' };
        }
        return current;
      });
      if (status.exists) {
        onUseWorkspacePath(status.path);
      }
    });
  }, [onUseWorkspacePath, refreshSampleStatus]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'hidden') {
        void refreshDemoRoute();
      }
    };
    const intervalId = window.setInterval(() => {
      void refreshDemoRoute();
    }, 4000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshDemoRoute]);

  useEffect(() => {
    const dispatchResult = (result: McpBridgeOnboardingRunPreviewResult) => {
      window.dispatchEvent(new CustomEvent('onboarding-run-preview-result', { detail: result }));
    };
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<Partial<McpBridgeOnboardingRunPreviewPayload>>).detail ?? {};
      const requestId = String(detail.requestId || '').trim();
      if (!requestId) return;
      void (async () => {
        try {
          setOnboardingView('guided');
          setMode('demo');
          const requestedRunId = String(detail.runId || '').trim();
          const artifacts = await refreshRunArtifacts({ selectRunId: requestedRunId || undefined });
          const artifact = requestedRunId
            ? (artifacts.find((item) => item.runId === requestedRunId) ?? null)
            : (artifacts[0] ?? null);
          if (!artifact) {
            dispatchResult({
              requestId,
              ok: false,
              runId: requestedRunId || undefined,
              selected: false,
              error: requestedRunId
                ? `Onboarding run artifact was not found: ${requestedRunId}`
                : 'No onboarding run artifacts are available',
            });
            return;
          }
          setSelectedRunArtifactId(artifact.runId);
          await waitForOnboardingPaint();
          if (detail.ensureVisible !== false) {
            runViewerRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
          }
          await waitForOnboardingPaint();
          dispatchResult({
            requestId,
            ok: true,
            runId: artifact.runId,
            selected: true,
            artifact,
          });
        } catch (error) {
          dispatchResult({
            requestId,
            ok: false,
            runId: String(detail.runId || '').trim() || undefined,
            selected: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    };
    window.addEventListener('onboarding-run-preview-request', listener);
    return () => window.removeEventListener('onboarding-run-preview-request', listener);
  }, [refreshRunArtifacts]);

  const handleDismiss = async () => {
    setBusyAction('dismiss');
    try {
      await persistProgress(progress, { dismissed: true });
    } finally {
      setBusyAction(null);
      onDismiss();
    }
  };

  const prepareSampleWorkspace = async (targetStepId = currentStep.id) => {
    setBusyAction('prepare-sample');
    try {
      const result = await window.onboardingAPI.prepareSampleWorkspace();
      setSampleStatus(result);
      onUseWorkspacePath(result.path);
      const nextProgress = completeOnboardingStep(
        {
          ...progress,
          sampleWorkspacePath: result.path,
        },
        targetStepId,
        verificationSnapshot('passed', t('app.onboardingSampleExists', { path: result.path })),
      );
      await updateProgress(nextProgress);
      await refreshRunArtifacts();
    } catch (error) {
      const nextProgress = {
        ...progress,
        verificationResults: {
          ...progress.verificationResults,
          [targetStepId]: verificationSnapshot('failed', error instanceof Error ? error.message : String(error)),
        },
      };
      await updateProgress(nextProgress);
    } finally {
      setBusyAction(null);
    }
  };

  const resetSampleWorkspace = async () => {
    setBusyAction('prepare-sample');
    try {
      const result = await window.onboardingAPI.resetSampleWorkspace();
      setSampleStatus(result);
      const nextProgress = {
        ...progress,
        sampleWorkspacePath: '',
        verificationResults: {
          ...progress.verificationResults,
          [currentStep.id]: verificationSnapshot('idle', t('app.onboardingVerifyIdle')),
        },
      };
      await updateProgress(nextProgress);
    } finally {
      setBusyAction(null);
    }
  };

  const handleVerify = async () => {
    const sampleWorkspacePath = progress.sampleWorkspacePath || (sampleStatus?.exists ? sampleStatus.path : '');
    setBusyAction('verify');
    try {
      const result = await onVerifyStep(currentStep.id, { sampleWorkspacePath });
      const state = result.passed ? 'passed' : 'failed';
      const snapshot = verificationSnapshot(
        state,
        result.message || (result.passed ? t('app.onboardingVerifyPassed') : t('app.onboardingVerifyWorkspaceMissing')),
      );
      const baseProgress =
        sampleWorkspacePath && sampleWorkspacePath !== progress.sampleWorkspacePath
          ? { ...progress, sampleWorkspacePath }
          : progress;
      const nextProgress = result.passed
        ? completeOnboardingStep(baseProgress, currentStep.id, snapshot)
        : {
            ...baseProgress,
            verificationResults: {
              ...baseProgress.verificationResults,
              [currentStep.id]: snapshot,
            },
          };
      await updateProgress(nextProgress);
    } catch (error) {
      await updateProgress({
        ...progress,
        verificationResults: {
          ...progress.verificationResults,
          [currentStep.id]: verificationSnapshot('failed', error instanceof Error ? error.message : String(error)),
        },
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSkip = async () => {
    if (!currentStep.skipAllowed) return;
    await updateProgress(
      skipOnboardingStep(progress, currentStep.id, verificationSnapshot('skipped', t('app.onboardingVerifySkipped'))),
    );
  };

  const applyScenarioResult = useCallback(
    async (result: McpBridgeOnboardingScenarioRunResult) => {
      setScenarioResults(result.steps);
      const passedCount = result.steps.filter((step) => step.passed).length;
      const totalCount = result.steps[0]?.total ?? BASIC_DESK_ONBOARDING_STEPS.length;
      setScenarioSummary(
        result.error || t('app.onboardingScenarioComplete', { passed: passedCount, total: totalCount }),
      );

      let nextProgress: OnboardingProgressState = {
        ...progress,
        sampleWorkspacePath: result.sampleWorkspacePath || progress.sampleWorkspacePath,
      };
      for (const step of result.steps) {
        const snapshot = verificationSnapshot(
          step.passed ? 'passed' : 'failed',
          step.message ||
            step.error ||
            (step.passed ? t('app.onboardingVerifyPassed') : t('app.onboardingVerifyUnknownStep')),
        );
        nextProgress = step.passed
          ? completeOnboardingStep(nextProgress, step.stepId, snapshot)
          : {
              ...nextProgress,
              currentStepId: step.stepId,
              verificationResults: {
                ...nextProgress.verificationResults,
                [step.stepId]: snapshot,
              },
            };
      }
      if (result.stoppedAtStepId) {
        nextProgress = { ...nextProgress, currentStepId: result.stoppedAtStepId };
      }
      await updateProgress(nextProgress);
      await refreshRunArtifacts({ selectRunId: result.artifact?.runId });
      await refreshDemoRoute();
    },
    [progress, refreshDemoRoute, refreshRunArtifacts, t, updateProgress],
  );

  const handleGenerateDemoRoute = useCallback(
    async (result: McpBridgeOnboardingScenarioRunResult): Promise<OnboardingDemoRouteSaveResult | null> => {
      setDemoRouteSaveStatus(t('app.onboardingDemoRouteSaving'));
      setDemoRouteError('');
      try {
        const saved = await window.onboardingAPI.saveDemoRoute({
          scenario: result,
          mode: 'ui-demo',
        });
        if (!saved.ok) {
          const message = saved.error || t('app.onboardingDemoRouteSaveFailed');
          setDemoRouteSaveStatus(message);
          setDemoRouteError(message);
          return saved;
        }
        setDemoRouteSaveStatus(t('app.onboardingDemoRouteGenerated', { count: saved.sceneCount }));
        setDemoRoutePath(saved.path);
        setDemoRouteResult(saved.route ?? null);
        latestDemoRouteSignatureRef.current = '';
        await refreshDemoRoute({ ensureVisible: true });
        return saved;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDemoRouteSaveStatus(message);
        setDemoRouteError(message);
        return {
          ok: false,
          path: '',
          sceneCount: 0,
          error: message,
        };
      }
    },
    [refreshDemoRoute, t],
  );

  const handleOpenDemoRouteTarget = useCallback(
    async (request?: OnboardingDemoRouteOpenRequest): Promise<OnboardingDemoRouteOpenResult> => {
      const result = await window.onboardingAPI.openDemoRouteTarget(request);
      if (!result.ok) {
        setDemoRouteError(result.error || t('app.onboardingDemoRouteEmpty'));
      }
      return result;
    },
    [t],
  );

  const handleRunDemoModeUiFlow = useCallback(
    async (payload: McpBridgeOnboardingDemoModeRunPayload): Promise<McpBridgeOnboardingDemoModeRunResult> => {
      const requestId = String(payload.requestId || '').trim();
      flushSync(() => {
        setOnboardingView('guided');
        setMode('demo');
      });
      setBusyAction('scenario-run');
      try {
        await waitForOnboardingPaint();
        const result = await onRunScenario();
        await applyScenarioResult(result);
        const demoRouteSave = await handleGenerateDemoRoute(result);
        onEnsureVisible?.();
        await ensureDemoModePaneVisible(requestId);
        flushSync(() => {
          setOnboardingView('guided');
          setMode('demo');
        });
        await waitForOnboardingPaint();
        if (payload.ensureVisible !== false) {
          demoRouteViewerRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
        await waitForOnboardingPaint();
        const capture = payload.capture !== false ? await captureDemoModeUi() : undefined;
        const ui = collectDemoModeUiSnapshot({ scenario: result, demoRouteSave });
        const completed = result.completed === true && demoRouteSave?.ok === true && ui.sceneCount > 0;
        const ok = completed && ui.routeViewerVisible && ui.storyboardActionVisible && ui.playerActionVisible;
        const playerOpen =
          payload.openPlayer === true && demoRouteSave?.ok
            ? await handleOpenDemoRouteTarget({ target: 'demoPreset' })
            : undefined;
        return {
          requestId,
          ok,
          completed,
          scenario: result,
          demoRouteSave: demoRouteSave ?? undefined,
          ui,
          capture,
          playerOpen,
          error: ok ? undefined : demoRouteSave?.error || result.error || 'Onboarding Demo Mode UI verification failed',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDemoRouteError(message);
        return {
          requestId,
          ok: false,
          completed: false,
          error: message,
          ui: collectDemoModeUiSnapshot(),
        };
      } finally {
        setBusyAction(null);
      }
    },
    [
      applyScenarioResult,
      captureDemoModeUi,
      collectDemoModeUiSnapshot,
      handleGenerateDemoRoute,
      handleOpenDemoRouteTarget,
      onEnsureVisible,
      onRunScenario,
    ],
  );

  const handleRunScenario = async () => {
    await handleRunDemoModeUiFlow({
      requestId: `ui-${Date.now()}`,
      ensureVisible: true,
      capture: false,
      openPlayer: false,
    });
  };

  useEffect(() => {
    const dispatchResult = (result: McpBridgeOnboardingDemoModeRunResult) => {
      window.dispatchEvent(new CustomEvent('onboarding-demo-mode-run-result', { detail: result }));
    };
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<Partial<McpBridgeOnboardingDemoModeRunPayload>>).detail ?? {};
      const requestId = String(detail.requestId || '').trim();
      const targetContentId = String((detail as { targetContentId?: unknown }).targetContentId || '').trim();
      if (!requestId) return;
      if (targetContentId && targetContentId !== contentId) return;
      void handleRunDemoModeUiFlow({
        requestId,
        ensureVisible: detail.ensureVisible !== false,
        capture: detail.capture !== false,
        openPlayer: detail.openPlayer === true,
      }).then(dispatchResult);
    };
    window.addEventListener('onboarding-demo-mode-run-request', listener);
    return () => window.removeEventListener('onboarding-demo-mode-run-request', listener);
  }, [contentId, handleRunDemoModeUiFlow]);

  const handleVerifyAll = async () => {
    setBusyAction('verify-all');
    try {
      const result = await onVerifyAll();
      await applyScenarioResult(result);
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenLatestRunArtifact = async () => {
    await window.onboardingAPI.openRunArtifact(selectedRunArtifact?.runId ?? recentRunArtifacts[0]?.runId);
  };

  const handleClearRunArtifacts = async () => {
    await window.onboardingAPI.clearRunArtifacts();
    setSelectedRunArtifactId('');
    await refreshRunArtifacts();
  };

  const handleAction = async (action: OnboardingActionDefinition) => {
    if (action.id === 'prepare-sample') {
      await prepareSampleWorkspace();
      return;
    }
    const actionHandlers: Partial<Record<OnboardingActionId, () => void>> = {
      'choose-folder': onOpenFolder,
      'open-terminal': onOpenTerminal,
      'open-file': onOpenFile,
      'arrange-panes': onArrangePanes,
      'open-command-center': onOpenCommandCenter,
      'open-settings': onOpenWorkspace,
      'open-diagnostics': onOpenDiagnostics,
      'save-workspace': onSaveWorkspace,
      'restore-workspace': onRestoreWorkspace,
    };
    actionHandlers[action.id]?.();
  };

  if (onboardingView === 'simple') {
    return (
      <section ref={rootRef} className="onboarding-pane onboarding-simple-pane">
        <header className="onboarding-header onboarding-simple-hero">
          <div>
            <p className="onboarding-kicker">{t('app.onboardingKicker')}</p>
            <h2>{t('app.onboardingSimpleTitle')}</h2>
            <p>{t('app.onboardingSimpleSubtitle')}</p>
          </div>
          <div className="onboarding-header-actions">
            <button type="button" className="onboarding-open-guided" onClick={() => setOnboardingView('guided')}>
              {t('app.onboardingOpenFullGuide')}
            </button>
            <button
              type="button"
              className="onboarding-dismiss"
              onClick={handleDismiss}
              disabled={busyAction === 'dismiss'}
            >
              {t('app.onboardingDontShowAgain')}
            </button>
          </div>
        </header>

        <div className="onboarding-simple-status">
          <span>{t('app.onboardingTrackBasicDesk')}</span>
          <strong>
            {t('app.onboardingSimpleProgress', {
              completed: completedCount,
              total: BASIC_DESK_ONBOARDING_STEPS.length,
            })}
          </strong>
          <div className="onboarding-progress-bar" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="onboarding-simple-grid">
          <button
            type="button"
            className="onboarding-simple-card is-primary"
            onClick={() => void prepareSampleWorkspace('choose-workspace-folder')}
            disabled={busyAction === 'prepare-sample'}
          >
            <span className="onboarding-action-title">{t('app.onboardingSimplePrimary')}</span>
            <span className="onboarding-action-desc">{t('app.onboardingSimplePrimaryDesc')}</span>
          </button>
          <button type="button" className="onboarding-simple-card" onClick={onOpenTerminal}>
            <span className="onboarding-action-title">{t('app.onboardingSimpleTerminalTitle')}</span>
            <span className="onboarding-action-desc">{t('app.onboardingSimpleTerminalDesc')}</span>
          </button>
          <button type="button" className="onboarding-simple-card" onClick={onOpenFile}>
            <span className="onboarding-action-title">{t('app.onboardingSimpleFileTitle')}</span>
            <span className="onboarding-action-desc">{t('app.onboardingSimpleFileDesc')}</span>
          </button>
          <button type="button" className="onboarding-simple-card" onClick={onOpenCommandCenter}>
            <span className="onboarding-action-title">{t('app.onboardingSimpleCommandTitle')}</span>
            <span className="onboarding-action-desc">{t('app.onboardingSimpleCommandDesc')}</span>
          </button>
        </div>

        <footer className="onboarding-simple-footer">
          <button type="button" onClick={() => setOnboardingView('guided')}>
            {t('app.onboardingOpenFullGuide')}
          </button>
          <span>
            {sampleStatus?.exists
              ? t('app.onboardingSampleExists', { path: sampleStatus.path })
              : t('app.onboardingSimpleHint')}
          </span>
        </footer>
      </section>
    );
  }

  return (
    <section ref={rootRef} className="onboarding-pane onboarding-guided">
      <header className="onboarding-header">
        <div>
          <p className="onboarding-kicker">{t('app.onboardingKicker')}</p>
          <h2>{t('app.onboardingTitle')}</h2>
          <p>{t('app.onboardingSubtitle')}</p>
        </div>
        <div className="onboarding-header-actions">
          <button type="button" className="onboarding-simple-back" onClick={() => setOnboardingView('simple')}>
            {t('app.onboardingBackToSimple')}
          </button>
          <div className="onboarding-mode-toggle" role="tablist" aria-label={t('app.onboardingModeLabel')}>
            <button type="button" className={mode === 'learn' ? 'is-active' : ''} onClick={() => setMode('learn')}>
              {t('app.onboardingLearnMode')}
            </button>
            <button type="button" className={mode === 'demo' ? 'is-active' : ''} onClick={() => setMode('demo')}>
              {t('app.onboardingDemoMode')}
            </button>
          </div>
          <button
            type="button"
            className="onboarding-dismiss"
            onClick={handleDismiss}
            disabled={busyAction === 'dismiss'}
          >
            {t('app.onboardingDontShowAgain')}
          </button>
        </div>
      </header>

      <div className="onboarding-notes">
        <article data-guide="publicEdition">
          <strong>{t('app.onboardingPublicEdition')}</strong>
          <span>{t('app.onboardingPublicEditionDesc')}</span>
        </article>
        <article data-guide="extensionStorage">
          <strong>{t('app.onboardingExtensionStorage')}</strong>
          <span>{t('app.onboardingExtensionStorageDesc')}</span>
        </article>
      </div>

      <div className="onboarding-progress-row">
        <span>{t('app.onboardingTrackBasicDesk')}</span>
        <strong>
          {completedCount}/{BASIC_DESK_ONBOARDING_STEPS.length}
        </strong>
        <div className="onboarding-progress-bar" aria-hidden="true">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="onboarding-guided-layout">
        <nav className="onboarding-track-list" aria-label={t('app.onboardingStepList')}>
          {BASIC_DESK_ONBOARDING_STEPS.map((step, index) => {
            const completed = progress.completedStepIds.includes(step.id);
            const skipped = progress.skippedStepIds.includes(step.id);
            const active = step.id === currentStep.id;
            return (
              <button
                key={step.id}
                type="button"
                className={`${active ? 'is-active' : ''}${completed ? ' is-complete' : ''}${skipped ? ' is-skipped' : ''}`}
                onClick={() => void updateProgress({ ...progress, currentStepId: step.id })}
              >
                <span>{index + 1}</span>
                <strong>{t(step.titleKey)}</strong>
                <small>
                  {completed
                    ? t('app.onboardingDone')
                    : skipped
                      ? t('app.onboardingSkipped')
                      : t('app.onboardingPending')}
                </small>
              </button>
            );
          })}
        </nav>

        <article className="onboarding-step-main">
          <p className="onboarding-step-index">
            {t('app.onboardingStepCounter', {
              current: currentStepIndex + 1,
              total: BASIC_DESK_ONBOARDING_STEPS.length,
            })}
          </p>
          <h3>{t(currentStep.titleKey)}</h3>
          <p>{t(currentStep.descriptionKey)}</p>

          <div className="onboarding-actions">
            {currentStep.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`onboarding-action${action.primary ? ' is-primary' : ''}`}
                onClick={() => void handleAction(action)}
                disabled={busyAction === action.id}
              >
                <span className="onboarding-action-title">{t(action.labelKey)}</span>
                <span className="onboarding-action-desc">{t(action.descriptionKey)}</span>
              </button>
            ))}
          </div>

          {currentStep.id === 'choose-workspace-folder' && (
            <div className="onboarding-sample-status">
              <span>
                {sampleStatus?.exists
                  ? t('app.onboardingSampleExists', { path: sampleStatus.path })
                  : t('app.onboardingSampleMissing')}
              </span>
              <button
                type="button"
                onClick={() => void resetSampleWorkspace()}
                disabled={busyAction === 'prepare-sample'}
              >
                {t('app.onboardingResetSample')}
              </button>
            </div>
          )}

          <div className={`onboarding-verify-result is-${currentVerification.state}`}>
            <strong>{t('app.onboardingVerification')}</strong>
            <span>{currentVerification.message}</span>
          </div>

          <footer className="onboarding-step-footer">
            <button
              type="button"
              className="onboarding-verify-btn"
              onClick={() => void handleVerify()}
              disabled={busyAction === 'verify'}
            >
              {t('app.onboardingVerify')}
            </button>
            <button type="button" onClick={() => void handleSkip()} disabled={!currentStep.skipAllowed}>
              {t('app.onboardingSkipStep')}
            </button>
          </footer>
        </article>

        <aside className="onboarding-demo-panel" data-mode={mode}>
          <strong>{mode === 'demo' ? t('app.onboardingDemoMode') : t('app.onboardingLearnMode')}</strong>
          <p>{t(currentStep.demo.captionKey)}</p>
          <dl>
            <div>
              <dt>{t('app.onboardingHighlightTarget')}</dt>
              <dd>{currentStep.demo.highlightTarget}</dd>
            </div>
            <div>
              <dt>{t('app.onboardingEstimatedTime')}</dt>
              <dd>{t('app.onboardingEstimatedSeconds', { seconds: currentStep.demo.estimatedSeconds })}</dd>
            </div>
          </dl>
          <span>{t(currentStep.demo.nextCueKey)}</span>
          <div className="onboarding-scenario-panel">
            <button
              type="button"
              className="onboarding-scenario-run"
              onClick={() => void handleRunScenario()}
              disabled={busyAction !== null}
            >
              {busyAction === 'scenario-run' ? t('app.onboardingScenarioRunning') : t('app.onboardingRunDemo')}
            </button>
            <button type="button" onClick={() => void handleVerifyAll()} disabled={busyAction !== null}>
              {busyAction === 'verify-all' ? t('app.onboardingScenarioRunning') : t('app.onboardingVerifyAll')}
            </button>
            <small>{scenarioSummary || t('app.onboardingScenarioReady')}</small>
            {demoRouteSaveStatus && <small className="onboarding-demo-route-status">{demoRouteSaveStatus}</small>}
            {scenarioFailureSummary && <small className="onboarding-scenario-failure">{scenarioFailureSummary}</small>}
            <div className="onboarding-run-artifacts">
              <button
                type="button"
                onClick={() => void handleOpenLatestRunArtifact()}
                disabled={recentRunArtifacts.length === 0}
              >
                {t('app.onboardingOpenLatestRun')}
              </button>
              <button type="button" onClick={() => void handleClearRunArtifacts()} disabled={busyAction !== null}>
                {t('app.onboardingClearRuns')}
              </button>
              <span>{t('app.onboardingRunArtifactCount', { count: recentRunArtifacts.length })}</span>
            </div>
            <section ref={runViewerRef} className={`onboarding-run-viewer${selectedRunArtifact ? '' : ' is-empty'}`}>
              {selectedRunArtifact ? (
                <>
                  <header>
                    <div>
                      <strong>{t('app.onboardingRunViewerTitle')}</strong>
                      <span>{formatRunArtifactDate(selectedRunArtifact.createdAt)}</span>
                    </div>
                    <em>
                      {selectedRunArtifact.passedCount}/{selectedRunArtifact.stepCount}
                    </em>
                  </header>
                  <select
                    aria-label={t('app.onboardingRunViewerSelect')}
                    value={selectedRunArtifact.runId}
                    onChange={(event) => setSelectedRunArtifactId(event.currentTarget.value)}
                  >
                    {recentRunArtifacts.map((artifact) => (
                      <option key={artifact.runId} value={artifact.runId}>
                        {formatRunArtifactDate(artifact.createdAt)} - {artifact.passedCount}/{artifact.stepCount}
                      </option>
                    ))}
                  </select>
                  <ol>
                    {selectedRunArtifact.steps.map((step) => {
                      const definition = BASIC_DESK_ONBOARDING_STEPS.find((item) => item.id === step.stepId);
                      return (
                        <li key={`${selectedRunArtifact.runId}-${step.stepId}`} className="onboarding-run-viewer-step">
                          <OnboardingRunScreenshotThumb
                            filePath={step.screenshotPath}
                            alt={definition ? t(definition.titleKey) : step.stepId}
                            placeholder={t('app.onboardingRunViewerNoScreenshot')}
                          />
                          <div>
                            <strong>{definition ? t(definition.titleKey) : step.stepId}</strong>
                            <p>{step.caption || step.message || step.screenshotFileName || step.stepId}</p>
                          </div>
                          <em>{step.passed ? t('app.onboardingDone') : t('app.onboardingPending')}</em>
                        </li>
                      );
                    })}
                  </ol>
                </>
              ) : (
                <span>{t('app.onboardingRunViewerEmpty')}</span>
              )}
            </section>
            <section
              ref={demoRouteViewerRef}
              className={`onboarding-demo-route-viewer${demoRouteResult ? '' : ' is-empty'}`}
            >
              <header>
                <div>
                  <strong>{t('app.onboardingDemoRouteTitle')}</strong>
                  <span>{demoRouteRunId || demoRoutePath || t('app.onboardingDemoRouteEmpty')}</span>
                </div>
                <em>{demoRouteScenes.length}</em>
              </header>
              <div className="onboarding-demo-route-actions">
                <button type="button" onClick={() => void refreshDemoRoute()}>
                  {t('app.onboardingDemoRouteRefresh')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenDemoRouteTarget({ target: 'json' })}
                  disabled={!demoRoutePath}
                >
                  {t('app.onboardingDemoRouteOpenJson')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenDemoRouteTarget({ target: 'run' })}
                  disabled={!demoRouteResult}
                >
                  {t('app.onboardingDemoRouteOpenRun')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenDemoRouteTarget({ target: 'storyboard' })}
                  disabled={!demoRouteResult}
                >
                  {t('app.onboardingDemoRouteOpenStoryboard')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleOpenDemoRouteTarget({ target: 'demoPreset' })}
                  disabled={!demoRouteResult}
                >
                  {t('app.onboardingDemoRouteOpenPlayer')}
                </button>
              </div>
              {demoRouteResult && demoRouteScenes.length > 0 ? (
                <>
                  {demoRouteStoryboard?.previewCapturePath && (
                    <button
                      type="button"
                      className="onboarding-demo-route-preview"
                      onClick={() => void handleOpenDemoRouteTarget({ target: 'preview' })}
                    >
                      <OnboardingRunScreenshotThumb
                        filePath={demoRouteStoryboard.previewCapturePath}
                        alt={demoRouteStoryboard.title}
                        placeholder={t('app.onboardingRunViewerNoScreenshot')}
                      />
                      <span>{t('app.onboardingDemoRouteOpenCapture')}</span>
                    </button>
                  )}
                  <ol>
                    {demoRouteScenes.map((scene) => (
                      <li
                        key={`${demoRouteRunId || 'demo-route'}-${scene.stepId}`}
                        className="onboarding-demo-route-scene"
                      >
                        <OnboardingRunScreenshotThumb
                          filePath={scene.screenshotPath}
                          alt={scene.title}
                          placeholder={t('app.onboardingRunViewerNoScreenshot')}
                        />
                        <div>
                          <strong>{scene.title}</strong>
                          <p>{scene.caption || scene.screenshotFileName || scene.stepId}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleOpenDemoRouteTarget({ target: 'scene', stepId: scene.stepId })}
                          disabled={!scene.screenshotPath}
                        >
                          {t('app.onboardingDemoRouteOpenCapture')}
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <span>{demoRouteError || t('app.onboardingDemoRouteEmpty')}</span>
              )}
            </section>
            {scenarioResults.length > 0 && (
              <ol className="onboarding-scenario-results">
                {scenarioResults.map((step) => (
                  <li key={step.stepId} className={step.passed ? 'is-passed' : 'is-failed'}>
                    <span>{step.index + 1}</span>
                    <strong>
                      {t(
                        `app.${BASIC_DESK_ONBOARDING_STEPS.find((item) => item.id === step.stepId)?.titleKey.replace('app.', '') || 'onboardingVerifyUnknownStep'}`,
                      )}
                    </strong>
                    <em>{step.passed ? t('app.onboardingDone') : t('app.onboardingPending')}</em>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
