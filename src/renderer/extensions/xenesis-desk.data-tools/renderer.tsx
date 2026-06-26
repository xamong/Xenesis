import React from 'react';
import type { ExtensionInfo, ExtensionTool } from '../../../shared/types';
import type { DockContent, DockContentOptions } from '../../dock/engine';
import type { RendererExtensionContribution, TFunc } from '../types';
import './styles.css';
import MetaManagementPane from './panes/MetaManagementPane';
import QueryAnalyzerPane from './panes/QueryAnalyzerPane';
import { SqliteServerSettingsPane } from './panes/SqliteServerSettingsPane';

const TOOL_IDS = {
  metaManagement: 'xenesis-desk.data-tools.meta-management',
  queryAnalyzer: 'xenesis-desk.data-tools.query-analyzer',
  queryAnalyzerOd: 'xenesis-desk.data-tools.query-analyzer-od',
  sqliteServerSettings: 'xenesis-desk.data-tools.sqlite-server-settings',
} as const satisfies Record<string, ExtensionTool>;

function metaManagementContent(t: TFunc): DockContentOptions {
  return {
    id: `meta-management-${crypto.randomUUID()}`,
    title: t('app.metaManagement'),
    titleKey: 'app.metaManagement',
    state: 'document',
    html: '',
    contentType: 'meta-management',
  };
}

function queryAnalyzerContent(t: TFunc, url?: string): DockContentOptions {
  return {
    id: url ? `query-analyzer-od-${crypto.randomUUID()}` : `query-analyzer-${crypto.randomUUID()}`,
    title: url ? t('app.queryAnalyzerOD') : t('app.queryAnalyzer'),
    titleKey: url ? 'app.queryAnalyzerOD' : 'app.queryAnalyzer',
    state: 'document',
    html: '',
    contentType: 'query-analyzer',
    url,
  };
}

function sqliteServerSettingsContent(t: TFunc): DockContentOptions {
  return {
    id: `sqlite-server-settings-${crypto.randomUUID()}`,
    title: t('settings.developerServerTitle'),
    titleKey: 'settings.developerServerTitle',
    state: 'document',
    html: '',
    contentType: 'sqlite-server-settings',
  };
}

function renderSettingsSections(extension: ExtensionInfo): React.ReactNode | null {
  if (!extension.enabled) return null;
  if (
    extension.id === 'xenesis-desk.data-tools' &&
    extension.commands.some((command) => command.menuLocations.includes('settings'))
  ) {
    return <SqliteServerSettingsPane />;
  }
  return null;
}

const contribution: RendererExtensionContribution = {
  id: 'xenesis-desk.data-tools',

  openTool(tool, context) {
    if (tool === TOOL_IDS.metaManagement) {
      context.engine.addContent(metaManagementContent(context.t));
      context.onStatus(context.t('app.metaManagementOpened'));
      return true;
    }

    if (tool === TOOL_IDS.queryAnalyzer) {
      context.engine.addContent(queryAnalyzerContent(context.t));
      context.onStatus(context.t('app.queryAnalyzerOpened'));
      return true;
    }

    if (tool === TOOL_IDS.queryAnalyzerOd) {
      context.engine.addContent(queryAnalyzerContent(context.t, 'http://127.0.0.1:7456'));
      context.onStatus(context.t('app.queryAnalyzerODOpened'));
      return true;
    }

    if (tool === TOOL_IDS.sqliteServerSettings) {
      context.engine.addContent(sqliteServerSettingsContent(context.t));
      context.onStatus(context.t('settings.developerServerTitle'));
      return true;
    }

    return false;
  },

  renderContent(content: DockContent) {
    if (content.contentType === 'meta-management') {
      return <MetaManagementPane />;
    }
    if (content.contentType === 'query-analyzer') {
      return <QueryAnalyzerPane apiUrl={content.url || undefined} />;
    }
    if (content.contentType === 'sqlite-server-settings') {
      return <SqliteServerSettingsPane />;
    }
    return null;
  },

  getContentIcon(contentType) {
    const icons: Record<string, string> = {
      'meta-management': 'M',
      'query-analyzer': 'Q',
      'sqlite-server-settings': 'S',
    };
    return icons[contentType];
  },

  isViewerContentType(contentType) {
    return (
      contentType === 'meta-management' || contentType === 'query-analyzer' || contentType === 'sqlite-server-settings'
    );
  },

  renderSettingsSections,
};

export default contribution;
