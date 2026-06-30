import React from 'react';
import type { ExtensionTool, ObsidianVaultContentState } from '../../../shared/types';
import type { DockContent, DockContentOptions } from '../../dock/engine';
import type { RendererExtensionContribution, TFunc } from '../types';
import { ObsidianVaultPane } from './panes/ObsidianVaultPane';
import { defaultVaultPanelSizes } from './vaultPanelLayout';
import './styles.css';

const TOOL_IDS = {
  viewer: 'xenesis-desk.obsidian-vault.viewer',
} as const satisfies Record<string, ExtensionTool>;

function defaultVaultState(rootPath = ''): ObsidianVaultContentState {
  return {
    vaultRootPath: rootPath,
    selectedNoteId: '',
    query: '',
    tag: '',
    issue: '',
    graphScope: 'local',
    panelSizes: defaultVaultPanelSizes,
  };
}

function obsidianVaultContent(t: TFunc, rootPath = ''): DockContentOptions {
  const displayName = rootPath.split(/[\\/]/).filter(Boolean).pop() || rootPath;
  return {
    id: `obsidian-vault-${crypto.randomUUID()}`,
    title: rootPath ? `Vault: ${displayName}` : t('app.toolsObsidianVault'),
    titleKey: rootPath ? undefined : 'app.toolsObsidianVault',
    state: 'document',
    html: '',
    contentType: 'obsidian-vault',
    obsidianVault: defaultVaultState(rootPath),
  };
}

const contribution: RendererExtensionContribution = {
  id: 'xenesis-desk.obsidian-vault',

  openTool(tool, context) {
    if (tool !== TOOL_IDS.viewer) return false;
    context.openContent(obsidianVaultContent(context.t), context.requestedPlacement || 'tab');
    context.onStatus(context.t('app.obsidianVaultOpened'));
    return true;
  },

  renderContent(content: DockContent, context) {
    if (content.contentType !== 'obsidian-vault') return null;
    return (
      <ObsidianVaultPane
        contentId={content.id}
        engine={context.engine}
        initialState={content.obsidianVault}
        onOpenMarkdown={context.openFileByPath}
      />
    );
  },

  getContentIcon(contentType) {
    if (contentType === 'obsidian-vault') return 'vault';
    return undefined;
  },

  isViewerContentType(contentType) {
    return contentType === 'obsidian-vault';
  },
};

export default contribution;
