export type SettingsCategoryId =
  | 'xenesis-agent'
  | 'run-model'
  | 'remote-terminals'
  | 'remote-files'
  | 'automation'
  | 'external-apps'
  | 'connectors'
  | 'extensions'
  | 'workspace'
  | 'interface'
  | 'info'
  | 'general'
  | 'language'
  | 'appearance'
  | 'keyboard-shortcuts'
  | 'window-sizer'
  | 'secret-vault'
  | 'settings-backup'
  | 'about'
  | 'media'
  | 'mcp'
  | 'notifications'
  | 'pets'
  | 'skills-design';

export interface SettingsCategory {
  id: SettingsCategoryId;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  hiddenInSettingsPane?: boolean;
  naturalWords: readonly string[];
}

export const SETTINGS_CATEGORIES: readonly SettingsCategory[];
export const VISIBLE_SETTINGS_CATEGORIES: readonly SettingsCategory[];
