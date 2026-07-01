import type { AppControlAdapter } from './appControlAdapter';
import { createMacosAppControlAdapter } from './macosAppControl';
import { createUnsupportedAppControlAdapter } from './unsupportedAppControl';
import { createWindowsAppControlAdapter } from './windowsAppControl';

export interface CreatePlatformAppControlAdapterOptions {
  platform?: NodeJS.Platform;
  createWindowsAdapter?: () => AppControlAdapter;
  createMacosAdapter?: () => AppControlAdapter;
}

export function createPlatformAppControlAdapter(
  options: CreatePlatformAppControlAdapterOptions = {},
): AppControlAdapter {
  const platform = options.platform ?? process.platform;
  if (platform === 'win32') {
    return (options.createWindowsAdapter ?? createWindowsAppControlAdapter)();
  }
  if (platform === 'darwin') {
    return (options.createMacosAdapter ?? createMacosAppControlAdapter)();
  }
  return createUnsupportedAppControlAdapter({ platform });
}
