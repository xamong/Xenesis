export interface RendererSettingsAutosaveContext {
  settingsLoaded: boolean;
  isDetachedWindow: boolean;
}

export function shouldPersistRendererSettings({
  settingsLoaded,
  isDetachedWindow,
}: RendererSettingsAutosaveContext): boolean {
  return settingsLoaded && !isDetachedWindow;
}
