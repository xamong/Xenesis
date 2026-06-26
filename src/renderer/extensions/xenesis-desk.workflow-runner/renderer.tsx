import React from 'react';
import type { ExtensionTool } from '../../../shared/types';
import type { DockContent, DockContentOptions } from '../../dock/engine';
import type { RendererExtensionContribution, TFunc } from '../types';
import { GowooriChatPane } from './gowoori/chat';
import { GOWOORI_OPEN_REQUEST_EVENT } from './gowoori/shared/gowooriEvents';
import { GowooriPane } from './gowoori/viewer';
import AlertRulesPane from './panes/AlertRulesPane';
import ArtifactVersionPane from './panes/ArtifactVersionPane';
import { DemoLabPlaybackPane } from './panes/DemoLabPlaybackPane';
import { DemoLabPlayerPane } from './panes/DemoLabPlayerPane';
import TemplateCatalogPane from './panes/TemplateCatalogPane';
import { WorkflowRunnerPane } from './panes/WorkflowRunnerPane';
import './styles.css';

const TOOL_IDS = {
  runner: 'xenesis-desk.workflow-runner.runner',
  demoLabPlayback: 'xenesis-desk.workflow-runner.demo-lab-playback',
  demoLabPlayer: 'xenesis-desk.workflow-runner.demo-lab-player',
  gowoori: 'xenesis-desk.workflow-runner.gowoori',
  gowooriChat: 'xenesis-desk.workflow-runner.gowoori-chat',
  alertRules: 'xenesis-desk.workflow-runner.alert-rules',
  templateCatalog: 'xenesis-desk.workflow-runner.template-catalog',
  artifactVersions: 'xenesis-desk.workflow-runner.artifact-versions',
} as const satisfies Record<string, ExtensionTool>;

function workflowRunnerContent(t: TFunc): DockContentOptions {
  return {
    id: `workflow-runner-${crypto.randomUUID()}`,
    title: 'Workflow Runner',
    titleKey: undefined,
    state: 'document',
    html: '',
    contentType: 'workflow-runner',
  };
}

function demoLabPlayerContent(t: TFunc): DockContentOptions {
  return {
    id: `demo-lab-player-${crypto.randomUUID()}`,
    title: 'Demo Lab Maker',
    titleKey: undefined,
    state: 'document',
    html: '',
    contentType: 'demo-lab-player',
  };
}

function demoLabPlaybackContent(t: TFunc): DockContentOptions {
  return {
    id: `demo-lab-playback-${crypto.randomUUID()}`,
    title: 'Demo Lab Player',
    titleKey: undefined,
    state: 'document',
    html: '',
    contentType: 'demo-lab-playback',
  };
}

function gowooriContent(t: TFunc): DockContentOptions {
  return {
    id: `gowoori-${crypto.randomUUID()}`,
    title: 'Gowoori / 거울이',
    titleKey: undefined,
    state: 'document',
    html: '',
    contentType: 'gowoori',
  };
}

function gowooriChatContent(t: TFunc): DockContentOptions {
  return {
    id: `gowoori-chat-${crypto.randomUUID()}`,
    title: 'GowooriChat',
    titleKey: undefined,
    state: 'document',
    html: '',
    contentType: 'gowoori-chat',
  };
}

const contribution: RendererExtensionContribution = {
  id: 'xenesis-desk.workflow-runner',

  openTool(tool, context) {
    if (tool === TOOL_IDS.runner) {
      context.openContent(workflowRunnerContent(context.t), context.requestedPlacement ?? 'right');
      context.onStatus('Workflow Runner opened.');
      return true;
    }
    if (tool === TOOL_IDS.demoLabPlayer) {
      context.openContent(demoLabPlayerContent(context.t), context.requestedPlacement ?? 'right');
      context.onStatus('Demo Lab Maker opened.');
      return true;
    }
    if (tool === TOOL_IDS.demoLabPlayback) {
      context.openContent(demoLabPlaybackContent(context.t), context.requestedPlacement ?? 'right');
      context.onStatus('Demo Lab Player opened.');
      return true;
    }
    if (tool === TOOL_IDS.gowoori) {
      context.openContent(gowooriContent(context.t), context.requestedPlacement ?? 'tab');
      context.onStatus('Gowoori / 거울이 opened in the document area.');
      return true;
    }
    if (tool === TOOL_IDS.gowooriChat) {
      context.openContent(gowooriChatContent(context.t), context.requestedPlacement ?? 'tab');
      context.onStatus('GowooriChat opened in the document area.');
      return true;
    }
    if (tool === TOOL_IDS.alertRules) {
      context.openContent(
        {
          id: `alert-rules-${crypto.randomUUID()}`,
          title: 'Alert Rules',
          state: 'document',
          html: '',
          contentType: 'alert-rules',
        },
        context.requestedPlacement ?? 'tab',
      );
      context.onStatus('Alert Rules opened.');
      return true;
    }
    if (tool === TOOL_IDS.templateCatalog) {
      context.openContent(
        {
          id: `template-catalog-${crypto.randomUUID()}`,
          title: 'Template Catalog',
          state: 'document',
          html: '',
          contentType: 'template-catalog',
        },
        context.requestedPlacement ?? 'tab',
      );
      context.onStatus('Template Catalog opened.');
      return true;
    }
    if (tool === TOOL_IDS.artifactVersions) {
      context.openContent(
        {
          id: `artifact-versions-${crypto.randomUUID()}`,
          title: 'Artifact Versions',
          state: 'document',
          html: '',
          contentType: 'artifact-versions',
        },
        context.requestedPlacement ?? 'tab',
      );
      context.onStatus('Artifact Versions opened.');
      return true;
    }
    return false;
  },

  useEvents(context) {
    React.useEffect(() => {
      const handleGowooriOpenRequest = () => {
        const targetPaneId = context.engine.artifactPaneId ?? context.engine.findTargetPane('document')?.id ?? null;
        context.engine.addContentWithPlacement(gowooriContent(context.t), 'tab', targetPaneId);
        context.onStatus('Gowoori / 거울이 opened in the artifact or active pane.');
      };
      window.addEventListener(GOWOORI_OPEN_REQUEST_EVENT, handleGowooriOpenRequest);
      return () => window.removeEventListener(GOWOORI_OPEN_REQUEST_EVENT, handleGowooriOpenRequest);
    }, [context.engine, context.onStatus, context.t]);
  },

  renderContent(content: DockContent) {
    if (content.contentType === 'workflow-runner') {
      return <WorkflowRunnerPane />;
    }
    if (content.contentType === 'demo-lab-player') {
      return <DemoLabPlayerPane />;
    }
    if (content.contentType === 'demo-lab-playback') {
      return <DemoLabPlaybackPane content={content} />;
    }
    if (content.contentType === 'gowoori') {
      return <GowooriPane contentId={content.id} />;
    }
    if (content.contentType === 'gowoori-chat') {
      return <GowooriChatPane contentId={content.id} />;
    }
    if (content.contentType === 'alert-rules') {
      return <AlertRulesPane />;
    }
    if (content.contentType === 'template-catalog') {
      return <TemplateCatalogPane />;
    }
    if (content.contentType === 'artifact-versions') {
      return <ArtifactVersionPane />;
    }
    return null;
  },

  getContentIcon(contentType) {
    if (contentType === 'workflow-runner') return 'W';
    if (contentType === 'demo-lab-playback') return '▶';
    if (contentType === 'demo-lab-player') return 'D';
    if (contentType === 'gowoori') return 'K';
    if (contentType === 'gowoori-chat') return 'C';
    if (contentType === 'alert-rules') return '⚡';
    if (contentType === 'template-catalog') return '📋';
    if (contentType === 'artifact-versions') return 'V';
    return undefined;
  },

  isViewerContentType(contentType) {
    return (
      contentType === 'workflow-runner' ||
      contentType === 'demo-lab-player' ||
      contentType === 'demo-lab-playback' ||
      contentType === 'gowoori' ||
      contentType === 'gowoori-chat' ||
      contentType === 'alert-rules' ||
      contentType === 'template-catalog' ||
      contentType === 'artifact-versions'
    );
  },
};

export default contribution;
