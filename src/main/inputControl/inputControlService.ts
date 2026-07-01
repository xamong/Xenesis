import type {
  ExternalAppActionResult,
  ExternalAppBounds,
  ExternalAppProfileStatusInfo,
  ExternalAppWindowInfo,
} from '../../shared/externalAppControl';
import {
  type InputActionType,
  type InputControlAction,
  type InputControlEnvironment,
  type InputControlTarget,
  inputRunSupportForTarget,
  looksDangerousInputHotkey,
  looksSecretShapedInputText,
  normalizedPointToPixel,
  normalizeInputRunRequest,
  normalizeInputTarget,
  supportedInputActionsForTarget,
} from '../../shared/inputControl';

export interface InputControlCallResult {
  ok: boolean;
  path: string;
  result?: unknown;
  error?: string;
}

export interface InputControlServiceOptions {
  runExternalAppAction?: (args: unknown) => Promise<ExternalAppActionResult> | ExternalAppActionResult;
  wait?: (ms: number) => Promise<void> | void;
}

export interface InputControlService {
  call(path: string, args?: unknown): Promise<InputControlCallResult>;
}

interface InputActionResult {
  index: number;
  type: InputActionType;
  ok: boolean;
  intent?: string;
  adapterPath?: string;
  error?: string;
}

export function createInputControlService(options: InputControlServiceOptions = {}): InputControlService {
  return {
    async call(path, args = {}) {
      try {
        if (path === 'xd.input.targets') return await targets(path, options);
        if (path === 'xd.input.describe') return await describe(path, args, options);
        if (path === 'xd.input.screenshot') return screenshot(path);
        if (path === 'xd.input.run') return await run(path, args, options);
        return { ok: false, path, error: `Unsupported input-control capability path: ${path}` };
      } catch (error) {
        return { ok: false, path, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

async function targets(path: string, options: InputControlServiceOptions): Promise<InputControlCallResult> {
  const profiles = await listRegisteredAppProfiles(options);
  return {
    ok: true,
    path,
    result: {
      targets: profiles.filter((profile) => profile.enabled).map((profile) => appTargetSummary(profile)),
    },
  };
}

async function describe(
  path: string,
  args: unknown,
  options: InputControlServiceOptions,
): Promise<InputControlCallResult> {
  const { environment, target } = normalizeTargetRequest(args);
  if (environment === 'desktop' && target.kind === 'app') {
    const status = await callExternalApp(options, { action: 'status', appId: target.appId });
    return {
      ok: status.ok,
      path,
      result: {
        environment,
        target,
        runSupport: inputRunSupportForTarget(environment, target),
        supportedActions: supportedInputActionsForTarget(environment, target),
        windows: normalizeWindows(status.windows),
      },
      ...(status.error ? { error: status.error } : {}),
    };
  }

  return {
    ok: true,
    path,
    result: {
      environment,
      target,
      runSupport: inputRunSupportForTarget(environment, target),
      supportedActions: supportedInputActionsForTarget(environment, target),
    },
  };
}

function screenshot(path: string): InputControlCallResult {
  return {
    ok: false,
    path,
    result: { unsupported: true },
    error: 'Input screenshot is not available for this target.',
  };
}

async function run(path: string, args: unknown, options: InputControlServiceOptions): Promise<InputControlCallResult> {
  const request = normalizeInputRunRequest(args);
  if (request.environment !== 'desktop' || request.target.kind !== 'app' || !request.target.appId) {
    return {
      ok: false,
      path,
      result: { unsupported: true },
      error: 'Input run is only available for registered desktop app targets in this slice.',
    };
  }

  const profiles = await listRegisteredAppProfiles(options);
  const profile = profiles.find((item) => item.id === request.target.appId && item.enabled);
  if (!profile) {
    return {
      ok: false,
      path,
      error: `Registered app target is not available: ${request.target.appId}`,
    };
  }

  const partialResults: InputActionResult[] = [];
  let failedIndex: number | undefined;
  let error: string | undefined;
  const bounds = request.actions.some(isDesktopPointerInputAction)
    ? await resolveDesktopTargetBounds(options, request.target)
    : undefined;

  if (request.actions.some(isDesktopPointerInputAction) && !bounds) {
    return {
      ok: false,
      path,
      error: 'Desktop pointer input requires target window bounds.',
      result: {
        environment: request.environment,
        target: request.target,
        failedIndex: 0,
        partialResults: [
          {
            index: 0,
            type: request.actions[0]?.type ?? 'click',
            ok: false,
            error: 'Desktop pointer input requires target window bounds.',
          },
        ],
      },
    };
  }

  for (let index = 0; index < request.actions.length; index += 1) {
    const action = request.actions[index];
    const result = await runAction(index, request.environment, request.target, action, options, bounds);
    partialResults.push(result);
    if (!result.ok) {
      failedIndex = index;
      error = result.error;
      if (!request.continueOnError) break;
    }
  }

  const ok = failedIndex === undefined;
  return {
    ok,
    path,
    result: {
      environment: request.environment,
      target: request.target,
      actions: ok ? partialResults : undefined,
      failedIndex,
      partialResults: ok ? undefined : partialResults,
    },
    ...(error ? { error } : {}),
  };
}

async function runAction(
  index: number,
  environment: InputControlEnvironment,
  target: InputControlTarget,
  action: ReturnType<typeof normalizeInputRunRequest>['actions'][number],
  options: InputControlServiceOptions,
  bounds?: ExternalAppBounds,
): Promise<InputActionResult> {
  const base = {
    index,
    type: action.type,
    ...(action.intent ? { intent: action.intent } : {}),
  };

  if (!supportedInputActionsForTarget(environment, target).includes(action.type)) {
    return { ...base, ok: false, error: 'Input action is not supported for this target.' };
  }

  if (action.type === 'type') {
    if (looksSecretShapedInputText(action.text || '')) {
      return { ...base, ok: false, error: 'Input text looks like a secret and was not sent.' };
    }
    const result = await callExternalApp(options, {
      action: 'typeText',
      appId: target.appId,
      ...(target.windowId ? { windowId: target.windowId } : {}),
      text: action.text || '',
    });
    return {
      ...base,
      ok: result.ok,
      adapterPath: 'xd.apps.typeText',
      ...(result.error ? { error: result.error } : {}),
    };
  }

  if (action.type === 'hotkey') {
    if (looksDangerousInputHotkey(action.keys || [])) {
      return { ...base, ok: false, error: 'Input hotkey is blocked by policy.' };
    }
    const result = await callExternalApp(options, {
      action: 'hotkey',
      appId: target.appId,
      ...(target.windowId ? { windowId: target.windowId } : {}),
      keys: action.keys || [],
    });
    return {
      ...base,
      ok: result.ok,
      adapterPath: 'xd.apps.hotkey',
      ...(result.error ? { error: result.error } : {}),
    };
  }

  if (action.type === 'wait') {
    await (options.wait ?? defaultWait)(Math.round((action.seconds ?? 1) * 1000));
    return { ...base, ok: true };
  }

  const externalAction = desktopExternalAppActionForInput(target, action, bounds);
  if (externalAction) {
    const result = await callExternalApp(options, externalAction.args);
    return {
      ...base,
      ok: result.ok,
      adapterPath: `xd.apps.${externalAction.adapterAction}`,
      ...(result.error ? { error: result.error } : {}),
    };
  }

  return { ...base, ok: false, error: 'Input action is not supported for this target.' };
}

async function resolveDesktopTargetBounds(
  options: InputControlServiceOptions,
  target: InputControlTarget,
): Promise<ExternalAppBounds | undefined> {
  const status = await callExternalApp(options, {
    action: 'status',
    appId: target.appId,
    ...(target.windowId ? { windowId: target.windowId } : {}),
  });
  return findTargetWindowBounds(status.windows, target.windowId);
}

function findTargetWindowBounds(
  windows: ExternalAppWindowInfo[] | undefined,
  windowId: string | undefined,
): ExternalAppBounds | undefined {
  if (!Array.isArray(windows)) return undefined;
  const matchingWindow = windowId
    ? windows.find((window) => window.windowId === windowId)
    : (windows.find((window) => window.isForeground && window.bounds) ?? windows.find((window) => window.bounds));
  return matchingWindow?.bounds;
}

function isDesktopPointerInputAction(action: InputControlAction): boolean {
  return [
    'click',
    'double_click',
    'triple_click',
    'middle_click',
    'right_click',
    'move',
    'mouse_down',
    'mouse_up',
    'drag_and_drop',
  ].includes(action.type);
}

function desktopExternalAppActionForInput(
  target: InputControlTarget,
  action: InputControlAction,
  bounds?: ExternalAppBounds,
): { adapterAction: string; args: Record<string, unknown> } | null {
  const targetArgs = {
    appId: target.appId,
    ...(target.windowId ? { windowId: target.windowId } : {}),
  };
  if (action.type === 'click') {
    return { adapterAction: 'click', args: { action: 'click', ...targetArgs, ...pointForAction(action, bounds) } };
  }
  if (action.type === 'double_click') {
    return {
      adapterAction: 'doubleClick',
      args: { action: 'doubleClick', ...targetArgs, ...pointForAction(action, bounds) },
    };
  }
  if (action.type === 'triple_click') {
    return {
      adapterAction: 'tripleClick',
      args: { action: 'tripleClick', ...targetArgs, ...pointForAction(action, bounds) },
    };
  }
  if (action.type === 'middle_click') {
    return {
      adapterAction: 'middleClick',
      args: { action: 'middleClick', ...targetArgs, ...pointForAction(action, bounds) },
    };
  }
  if (action.type === 'right_click') {
    return {
      adapterAction: 'rightClick',
      args: { action: 'rightClick', ...targetArgs, ...pointForAction(action, bounds) },
    };
  }
  if (action.type === 'move') {
    return { adapterAction: 'move', args: { action: 'move', ...targetArgs, ...pointForAction(action, bounds) } };
  }
  if (action.type === 'mouse_down') {
    return {
      adapterAction: 'mouseDown',
      args: { action: 'mouseDown', ...targetArgs, ...pointForAction(action, bounds) },
    };
  }
  if (action.type === 'mouse_up') {
    return { adapterAction: 'mouseUp', args: { action: 'mouseUp', ...targetArgs, ...pointForAction(action, bounds) } };
  }
  if (action.type === 'drag_and_drop') {
    return {
      adapterAction: 'dragAndDrop',
      args: { action: 'dragAndDrop', ...targetArgs, ...dragPointsForAction(action, bounds) },
    };
  }
  if (action.type === 'take_screenshot') {
    return { adapterAction: 'screenshot', args: { action: 'screenshot', ...targetArgs } };
  }
  return null;
}

function pointForAction(action: InputControlAction, bounds: ExternalAppBounds | undefined): { x: number; y: number } {
  const point = { x: action.x ?? 0, y: action.y ?? 0 };
  return bounds ? normalizedPointToPixel(point, bounds) : point;
}

function dragPointsForAction(
  action: InputControlAction,
  bounds: ExternalAppBounds | undefined,
): { startX: number; startY: number; endX: number; endY: number } {
  const start = { x: action.start_x ?? 0, y: action.start_y ?? 0 };
  const end = { x: action.end_x ?? 0, y: action.end_y ?? 0 };
  if (!bounds) return { startX: start.x, startY: start.y, endX: end.x, endY: end.y };
  const normalizedStart = normalizedPointToPixel(start, bounds);
  const normalizedEnd = normalizedPointToPixel(end, bounds);
  return {
    startX: normalizedStart.x,
    startY: normalizedStart.y,
    endX: normalizedEnd.x,
    endY: normalizedEnd.y,
  };
}

async function listRegisteredAppProfiles(options: InputControlServiceOptions): Promise<ExternalAppProfileStatusInfo[]> {
  const status = await callExternalApp(options, { action: 'status' });
  return Array.isArray(status.profiles) ? status.profiles : [];
}

async function callExternalApp(options: InputControlServiceOptions, args: unknown): Promise<ExternalAppActionResult> {
  if (!options.runExternalAppAction) {
    return {
      ok: false,
      action: 'status',
      approvalLevel: 'low',
      windows: [],
      message: 'External app adapter is unavailable.',
      error: 'External app adapter is unavailable.',
    };
  }
  return await options.runExternalAppAction(args);
}

function normalizeTargetRequest(args: unknown): { environment: InputControlEnvironment; target: InputControlTarget } {
  const input = args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
  const environment =
    input.environment === 'browser' || input.environment === 'desktop' ? input.environment : 'desktop';
  return {
    environment,
    target: normalizeInputTarget(input.target),
  };
}

function appTargetSummary(profile: ExternalAppProfileStatusInfo) {
  const target: InputControlTarget = { kind: 'app', appId: profile.id };
  return {
    environment: 'desktop' as const,
    target,
    label: profile.label,
    runSupport: inputRunSupportForTarget('desktop', target),
    supportedActions: supportedInputActionsForTarget('desktop', target),
  };
}

function normalizeWindows(windows: ExternalAppWindowInfo[] | undefined): ExternalAppWindowInfo[] {
  return Array.isArray(windows) ? windows : [];
}

async function defaultWait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
