import type {
  ExternalAppAction,
  ExternalAppActionResult,
  ExternalAppApprovalLevel,
  ExternalAppProfile,
  ExternalAppProfileStatusInfo,
  ExternalAppSettings,
} from '../../shared/externalAppControl';
import {
  externalAppActionDecision,
  normalizeExternalAppAction,
  normalizeExternalAppSettings,
} from '../../shared/externalAppControl';
import type { AppControlAdapter, AppControlFindInput } from './appControlAdapter';
import { createPlatformAppControlAdapter } from './createPlatformAppControlAdapter';

export interface AppControlServiceOptions {
  getSettings?: () => ExternalAppSettings;
  adapter?: AppControlAdapter;
}

export interface AppControlService {
  run(rawAction: unknown): Promise<ExternalAppActionResult>;
}

export function createAppControlService(options: AppControlServiceOptions = {}): AppControlService {
  const adapter = options.adapter ?? createPlatformAppControlAdapter();

  return {
    async run(rawAction) {
      let action: ExternalAppAction;
      try {
        action = normalizeExternalAppAction(rawAction);
      } catch (error) {
        return failedResult('status', 'low', error instanceof Error ? error.message : String(error));
      }

      const settings = normalizeExternalAppSettings(options.getSettings?.());
      if (action.action === 'status' && !hasExternalAppTarget(action)) {
        return profileStatusResult(settings);
      }

      const profile = resolveProfile(settings.profiles, action);
      const decision = externalAppActionDecision(action, profile);

      if (!settings.enabled) {
        return failedResult(action.action, decision.approvalLevel, 'External app control is disabled.');
      }

      if (!decision.allowed) {
        return failedResult(action.action, decision.approvalLevel, decision.reason);
      }

      const result =
        action.action === 'launch'
          ? await runLaunchAction(adapter, action, profile)
          : await runAdapterAction(adapter, action, adapterCommonInput(action, profile), decision.approvalLevel);

      return {
        ...result,
        action: action.action,
        appId: action.appId,
        path: action.path,
        approvalLevel: decision.approvalLevel,
        policy: {
          approval: decision.approval,
          reason: decision.reason,
        },
      };
    },
  };
}

async function runLaunchAction(
  adapter: AppControlAdapter,
  action: ExternalAppAction,
  profile: Pick<ExternalAppProfile, 'bundleId' | 'executable' | 'defaultArgs' | 'defaultCwd'> | undefined,
): Promise<ExternalAppActionResult> {
  const executable = action.path || profile?.executable || '';
  const launchResult = await adapter.launch({
    executable,
    ...(profile?.bundleId ? { bundleId: profile.bundleId } : {}),
    args: action.args ?? profile?.defaultArgs ?? [],
    cwd: action.cwd ?? profile?.defaultCwd ?? '',
  });

  if (!launchResult.ok || !action.placement) return launchResult;

  const resizeResult = await adapter.resize({
    executable,
    ...(profile?.bundleId ? { bundleId: profile.bundleId } : {}),
    processName: action.processName,
    titleContains: action.titleContains,
    windowId: action.windowId ?? launchResult.windows[0]?.windowId,
    ...action.placement,
  });

  if (resizeResult.ok) {
    return {
      ...launchResult,
      windows: resizeResult.windows.length ? resizeResult.windows : launchResult.windows,
      message: 'External app launched and placed.',
    };
  }

  return {
    ...launchResult,
    message: 'External app launched; placement failed.',
    error: resizeResult.error ?? resizeResult.message,
  };
}

async function runAdapterAction(
  adapter: AppControlAdapter,
  action: ExternalAppAction,
  common: AppControlFindInput,
  approvalLevel: ExternalAppApprovalLevel,
): Promise<ExternalAppActionResult> {
  const actionName = action.action;
  switch (actionName) {
    case 'find':
      return adapter.find(common);
    case 'status':
      return adapter.status(common);
    case 'focus':
      return adapter.focus(common);
    case 'resize':
      return adapter.resize({
        ...common,
        x: action.x,
        y: action.y,
        width: action.width,
        height: action.height,
      });
    case 'typeText':
      return adapter.typeText({ ...common, text: action.text ?? '' });
    case 'hotkey':
      return adapter.hotkey({ ...common, keys: action.keys ?? [] });
    case 'click':
      return adapter.click({ ...common, x: action.x ?? 0, y: action.y ?? 0 });
    case 'doubleClick':
      return adapter.doubleClick({ ...common, x: action.x ?? 0, y: action.y ?? 0 });
    case 'tripleClick':
      return adapter.tripleClick({ ...common, x: action.x ?? 0, y: action.y ?? 0 });
    case 'middleClick':
      return adapter.middleClick({ ...common, x: action.x ?? 0, y: action.y ?? 0 });
    case 'rightClick':
      return adapter.rightClick({ ...common, x: action.x ?? 0, y: action.y ?? 0 });
    case 'move':
      return adapter.move({ ...common, x: action.x ?? 0, y: action.y ?? 0 });
    case 'mouseDown':
      return adapter.mouseDown({ ...common, x: action.x ?? 0, y: action.y ?? 0 });
    case 'mouseUp':
      return adapter.mouseUp({ ...common, x: action.x ?? 0, y: action.y ?? 0 });
    case 'dragAndDrop':
      return adapter.dragAndDrop({
        ...common,
        startX: action.startX ?? 0,
        startY: action.startY ?? 0,
        endX: action.endX ?? 0,
        endY: action.endY ?? 0,
      });
    case 'screenshot':
      return adapter.screenshot({
        ...common,
        ...(action.path ? { path: action.path } : {}),
        screenshotPath: action.screenshotPath,
      });
    case 'inspect':
      return adapter.inspect({
        ...common,
        ...(action.path ? { path: action.path } : {}),
        appId: action.appId,
        includeTreePreview: action.includeTreePreview,
      });
    case 'elementFromPoint':
      return adapter.elementFromPoint({
        ...common,
        ...(action.path ? { path: action.path } : {}),
        appId: action.appId,
        x: action.x ?? 0,
        y: action.y ?? 0,
      });
    case 'tree':
      return adapter.tree({
        ...common,
        ...(action.path ? { path: action.path } : {}),
        appId: action.appId,
        depth: action.depth,
        limit: action.limit,
        includeValues: action.includeValues,
        includeFullTree: action.includeFullTree,
      });
    case 'menuExplore':
      return adapter.menuExplore({
        ...common,
        ...(action.path ? { path: action.path } : {}),
        appId: action.appId,
        depth: action.depth,
        limit: action.limit,
        includeValues: action.includeValues,
      });
    case 'highlight':
      return adapter.highlight({
        ...common,
        ...(action.path ? { path: action.path } : {}),
        appId: action.appId,
        elementRef: action.elementRef,
        durationMs: action.durationMs,
      });
    case 'captureElement':
      return adapter.captureElement({
        ...common,
        ...(action.path ? { path: action.path } : {}),
        appId: action.appId,
        elementRef: action.elementRef,
        screenshotPath: action.screenshotPath,
      });
    case 'close':
      return adapter.close({ ...common, mode: action.mode });
    case 'launch':
      return unroutedActionResult(actionName, approvalLevel);
    default:
      return unroutedActionResult(actionName, approvalLevel);
  }
}

function unroutedActionResult(
  action: ExternalAppAction['action'] | string,
  approvalLevel: ExternalAppApprovalLevel,
): ExternalAppActionResult {
  return failedResult(
    action,
    approvalLevel,
    `External app action is not routed: ${String(action)}`,
    'unsupported_action',
  );
}

function adapterCommonInput(
  action: ExternalAppAction,
  profile: Pick<ExternalAppProfile, 'bundleId' | 'executable'> | undefined,
): AppControlFindInput {
  return {
    executable: action.path || profile?.executable || '',
    ...(profile?.bundleId ? { bundleId: profile.bundleId } : {}),
    processName: action.processName,
    titleContains: action.titleContains,
    windowId: action.windowId,
  };
}

function resolveProfile(profiles: ExternalAppProfile[], action: ExternalAppAction): ExternalAppProfile | undefined {
  if (!action.appId) return undefined;
  return profiles.find((profile) => profile.id === action.appId);
}

function hasExternalAppTarget(action: ExternalAppAction): boolean {
  return Boolean(
    action.appId ||
      action.path ||
      action.bundleId ||
      action.processName ||
      action.titleContains ||
      action.windowId ||
      action.elementRef,
  );
}

function profileStatusResult(settings: ExternalAppSettings): ExternalAppActionResult {
  return {
    ok: true,
    action: 'status',
    controlEnabled: settings.enabled,
    approvalLevel: 'low',
    profiles: settings.profiles.map(profileStatusInfo),
    windows: [],
    message: 'External app profile status completed.',
    policy: {
      approval: 'never',
      reason: 'External app profile status readback.',
    },
  };
}

function profileStatusInfo(profile: ExternalAppProfile): ExternalAppProfileStatusInfo {
  return {
    id: profile.id,
    label: profile.label,
    enabled: profile.enabled,
    approvalLevel: profile.approvalLevel,
    allowedActions: [...profile.allowedActions],
  };
}

function failedResult(
  action: ExternalAppAction['action'] | string,
  approvalLevel: ExternalAppApprovalLevel,
  error: string,
  code?: string,
): ExternalAppActionResult {
  return {
    ok: false,
    action: action as ExternalAppAction['action'],
    approvalLevel,
    windows: [],
    message: `External app ${action} failed.`,
    error,
    ...(code ? { code } : {}),
  };
}

export const __appControlServiceTestInternals = {
  runAdapterAction,
};
