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
import { createWindowsAppControlAdapter, type WindowsAppControlAdapter } from './windowsAppControl';

export interface AppControlServiceOptions {
  getSettings: () => ExternalAppSettings;
  adapter?: WindowsAppControlAdapter;
}

export interface AppControlService {
  run(rawAction: unknown): Promise<ExternalAppActionResult>;
}

export function createAppControlService(options: AppControlServiceOptions): AppControlService {
  const adapter = options.adapter ?? createWindowsAppControlAdapter();

  return {
    async run(rawAction) {
      let action: ExternalAppAction;
      try {
        action = normalizeExternalAppAction(rawAction);
      } catch (error) {
        return failedResult('status', 'low', error instanceof Error ? error.message : String(error));
      }

      const settings = normalizeExternalAppSettings(options.getSettings());
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

      const executable = action.path || profile?.executable || '';
      const common = {
        executable,
        processName: action.processName,
        titleContains: action.titleContains,
        windowId: action.windowId,
      };

      const result =
        action.action === 'launch'
          ? await adapter.launch({
              executable,
              args: action.args ?? profile?.defaultArgs ?? [],
              cwd: action.cwd ?? profile?.defaultCwd ?? '',
            })
          : action.action === 'find'
            ? await adapter.find(common)
            : action.action === 'status'
              ? await adapter.status(common)
              : action.action === 'focus'
                ? await adapter.focus(common)
                : action.action === 'resize'
                  ? await adapter.resize({ ...common, x: action.x, y: action.y, width: action.width, height: action.height })
                  : action.action === 'typeText'
                    ? await adapter.typeText({ ...common, text: action.text ?? '' })
                    : action.action === 'hotkey'
                      ? await adapter.hotkey({ ...common, keys: action.keys ?? [] })
                      : await adapter.close({ ...common, mode: action.mode });

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

function resolveProfile(profiles: ExternalAppProfile[], action: ExternalAppAction): ExternalAppProfile | undefined {
  if (!action.appId) return undefined;
  return profiles.find((profile) => profile.id === action.appId);
}

function hasExternalAppTarget(action: ExternalAppAction): boolean {
  return Boolean(action.appId || action.path || action.processName || action.titleContains || action.windowId);
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
  action: ExternalAppAction['action'],
  approvalLevel: ExternalAppApprovalLevel,
  error: string,
): ExternalAppActionResult {
  return {
    ok: false,
    action,
    approvalLevel,
    windows: [],
    message: `External app ${action} failed.`,
    error,
  };
}
