import type { AppSettings, ExtensionCommandDescriptor, SecretVaultItem, SecretVaultStatusItem } from './types';

export interface XenisPhase5VisibilityOptions {
  xenisPhase5?: boolean;
}

export const XENIS_PHASE_5_ENV = 'XENIS_PHASE_5';

const TRUE_FLAG_VALUES = new Set(['1', 'true', 'yes', 'on', 'enabled']);

export const XENIS_PHASE_5_XAMONG_CODE_COMMAND_IDS = new Set(['xenesis-desk.core-tools.openXamongCode']);

export const XENIS_PHASE_5_XAMONG_CODE_TOOL_IDS = new Set(['xenesis-desk.core-tools.xamong-code-chat']);

export const XENIS_PHASE_5_XAMONG_CODE_CONTENT_TYPES = new Set(['xamong-chat']);

type LooseFeatureFlags = Partial<AppSettings['featureFlags']> & {
  phase5?: unknown;
  xenisPhase5?: unknown;
  XENIS_PHASE_5?: unknown;
};

type LooseSettings = Partial<Omit<AppSettings, 'featureFlags'>> & {
  featureFlags?: LooseFeatureFlags;
  phase5?: unknown;
  xenisPhase5?: unknown;
};

type XenisPhase5SecretLike = Pick<SecretVaultItem | SecretVaultStatusItem, 'secretId' | 'label'>;

export function parseXenisBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return false;
  return TRUE_FLAG_VALUES.has(value.trim().toLowerCase());
}

export function isXenisPhase5EnabledFromEnv(env: Record<string, string | undefined> = {}): boolean {
  return parseXenisBooleanFlag(env[XENIS_PHASE_5_ENV]);
}

export function isXenisPhase5EnabledFromSettings(settings?: LooseSettings | null): boolean {
  const flags = settings?.featureFlags;
  return (
    parseXenisBooleanFlag(flags?.xenisPhase5) ||
    parseXenisBooleanFlag(flags?.phase5) ||
    parseXenisBooleanFlag(flags?.XENIS_PHASE_5) ||
    parseXenisBooleanFlag(settings?.xenisPhase5) ||
    parseXenisBooleanFlag(settings?.phase5)
  );
}

export function isXenisPhase5Enabled(
  settings?: LooseSettings | null,
  env: Record<string, string | undefined> = {},
): boolean {
  return isXenisPhase5EnabledFromEnv(env) || isXenisPhase5EnabledFromSettings(settings);
}

export function isXenisPhase5Visible(options?: XenisPhase5VisibilityOptions | null): boolean {
  return options?.xenisPhase5 === true;
}

export function isXenisPhase5XamongCodeCommandId(commandId: string): boolean {
  return XENIS_PHASE_5_XAMONG_CODE_COMMAND_IDS.has(commandId);
}

export function isXenisPhase5XamongCodeToolId(toolId: string): boolean {
  return XENIS_PHASE_5_XAMONG_CODE_TOOL_IDS.has(toolId);
}

export function isXenisPhase5XamongCodeContentType(contentType: string): boolean {
  return XENIS_PHASE_5_XAMONG_CODE_CONTENT_TYPES.has(contentType);
}

export function isXenisPhase5XamongCodeSecretItem(item: XenisPhase5SecretLike): boolean {
  const secretId = item.secretId.trim().toLowerCase();
  const label = item.label.trim().toLowerCase();
  return (
    secretId.startsWith('xamong-code:') ||
    secretId.startsWith('xamongcode:') ||
    label.includes('xamongcode') ||
    label.includes('xamong code')
  );
}

export function shouldShowXenisPhase5XamongCode(options?: XenisPhase5VisibilityOptions | null): boolean {
  return isXenisPhase5Visible(options);
}

export function filterXenisPhase5ExtensionCommands<T extends ExtensionCommandDescriptor>(
  commands: T[],
  options?: XenisPhase5VisibilityOptions | null,
): T[] {
  if (shouldShowXenisPhase5XamongCode(options)) {
    return commands;
  }
  return commands.filter((command) => !isXenisPhase5XamongCodeCommandId(command.id));
}

export function filterXenisPhase5SecretVaultItems<T extends XenisPhase5SecretLike>(
  items: T[],
  options?: XenisPhase5VisibilityOptions | null,
): T[] {
  if (shouldShowXenisPhase5XamongCode(options)) {
    return items;
  }
  return items.filter((item) => !isXenisPhase5XamongCodeSecretItem(item));
}

export function canUseXenisPhase5XamongCodeCommand(
  commandId: string,
  options?: XenisPhase5VisibilityOptions | null,
): boolean {
  return shouldShowXenisPhase5XamongCode(options) || !isXenisPhase5XamongCodeCommandId(commandId);
}

export function canUseXenisPhase5XamongCodeTool(
  toolId: string,
  options?: XenisPhase5VisibilityOptions | null,
): boolean {
  return shouldShowXenisPhase5XamongCode(options) || !isXenisPhase5XamongCodeToolId(toolId);
}
