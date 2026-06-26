import React from 'react';
import type { ExtensionInfo } from '../../shared/types';
import { getRendererExtensionContributions } from './registry';

export function renderExtensionSettingsSections(extension: ExtensionInfo): React.ReactNode {
  if (!extension.enabled) return null;
  return getRendererExtensionContributions().map((contribution) => (
    <React.Fragment key={`${extension.id}-${contribution.id}`}>
      {contribution.renderSettingsSections?.(extension) ?? null}
    </React.Fragment>
  ));
}
