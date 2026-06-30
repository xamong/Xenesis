import type {
  ExternalAppAction,
  ExternalAppActionResult,
  ExternalAppApprovalLevel,
  ExternalAppProfile,
  ExternalAppSettings,
} from '../../shared/externalAppControl';
import {
  classifyExternalAppApproval,
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
      if (!settings.enabled) {
        return failedResult(action.action, 'low', 'External app control is disabled.');
      }

      const profile = resolveProfile(settings.profiles, action);
      const registeredProfile = Boolean(profile);
      const approvalLevel = strongestApprovalLevel(
        classifyExternalAppApproval(action, registeredProfile),
        profile?.approvalLevel,
      );

      if (action.appId && !profile) {
        return failedResult(action.action, approvalLevel, `External app profile not found: ${action.appId}`);
      }
      if (profile && !profile.enabled) {
        return failedResult(action.action, approvalLevel, `External app profile is disabled: ${profile.id}`);
      }
      if (profile && !profile.allowedActions.includes(action.action)) {
        return failedResult(
          action.action,
          approvalLevel,
          `External app action is not allowed for ${profile.id}: ${action.action}`,
        );
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
                  ? await adapter.resize({
                      ...common,
                      x: action.x,
                      y: action.y,
                      width: action.width,
                      height: action.height,
                    })
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
        approvalLevel,
      };
    },
  };
}

function resolveProfile(profiles: ExternalAppProfile[], action: ExternalAppAction): ExternalAppProfile | undefined {
  if (!action.appId) return undefined;
  return profiles.find((profile) => profile.id === action.appId);
}

function strongestApprovalLevel(
  first: ExternalAppApprovalLevel,
  second: ExternalAppApprovalLevel | undefined,
): ExternalAppApprovalLevel {
  const rank: Record<ExternalAppApprovalLevel, number> = { low: 0, medium: 1, high: 2 };
  if (!second) return first;
  return rank[second] > rank[first] ? second : first;
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
