import type {
  ExternalAppActionResult,
  ExternalAppProfileStatusInfo,
  ExternalAppWindowInfo,
} from '../../shared/externalAppControl';
import {
  type InputActionType,
  type InputControlEnvironment,
  type InputControlTarget,
  inputRunSupportForTarget,
  looksDangerousInputHotkey,
  looksSecretShapedInputText,
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

  for (let index = 0; index < request.actions.length; index += 1) {
    const action = request.actions[index];
    const result = await runAction(index, request.environment, request.target, action, options);
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

  return { ...base, ok: false, error: 'Input action is not supported for this target.' };
}

async function listRegisteredAppProfiles(options: InputControlServiceOptions): Promise<ExternalAppProfileStatusInfo[]> {
  const status = await callExternalApp(options, { action: 'status' });
  return Array.isArray(status.profiles) ? status.profiles : [];
}

async function callExternalApp(
  options: InputControlServiceOptions,
  args: unknown,
): Promise<ExternalAppActionResult> {
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
  const environment = input.environment === 'browser' || input.environment === 'desktop' ? input.environment : 'desktop';
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
