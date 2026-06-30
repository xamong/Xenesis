import { useEffect } from 'react';
import type { ExtensionTool, FsEntry, McpBridgeBotEvent } from '../../../shared/types';
import type { DockContent, DockContentOptions, DockEngine } from '../../dock/engine';
import type { ExtensionToolOpenContext, RendererExtensionContribution, TFunc } from '../types';
import './styles.css';
import { XENESIS_AGENT_COMMAND_EVENT, type XenesisAgentCommandDetail } from '../../utils/xenesisContextSend';
import { ActionInboxPane } from './panes/ActionInboxPane';
import ActivityTimelinePane from './panes/ActivityTimelinePane';
import AgentPerformancePane from './panes/AgentPerformancePane';
import { AiWorkbenchPane } from './panes/AiWorkbenchPane';
import { ArtifactLibraryPane } from './panes/ArtifactLibraryPane';
import AuditLogPane from './panes/AuditLogPane';
import { CapabilityExplorerPane } from './panes/CapabilityExplorerPane';
import { HermesStashOpsPane } from './panes/HermesStashOpsPane';
import { HermesStatusPane } from './panes/HermesStatusPane';
import { HermesTimelinePane } from './panes/HermesTimelinePane';
import { MemoryDashboardPane } from './panes/MemoryDashboardPane';
import NetworkMonitorPane from './panes/NetworkMonitorPane';
import { ProcessViewerPane } from './panes/ProcessViewerPane';
import { RemoteSyncPlannerPane } from './panes/RemoteSyncPlannerPane';
import { RunTaskPanel } from './panes/RunTaskPanel';
import { SafeFileEditCenterPane } from './panes/SafeFileEditCenterPane';
import { TerminalInspectorPane } from './panes/TerminalInspectorPane';
import { XAppPreviewPane } from './panes/XAppPreviewPane';
import { XamongCodeChatPane } from './panes/XamongCodeChatPane';
import { XdBlasterPane } from './panes/XdBlasterPane';
import { XconAgentWorkbenchPane } from './panes/XconAgentWorkbenchPane';
import { XenesisAgentPane } from './panes/XenesisAgentPane';
import { XenisBotPane } from './panes/XenisBotPane';
import { hydrateXenisBotSessions, recordXenisBotEvent } from './xenisBotStore';

const XENESIS_AGENT_CONTENT_ID = 'xenesis-agent-default';

const TOOL_IDS = {
  xamongCodeChat: 'xenesis-desk.core-tools.xamong-code-chat',
  xenisBot: 'xenesis-desk.core-tools.xenesis-bot',
  aiWorkbench: 'xenesis-desk.core-tools.ai-workbench',
  xenesisAgentWorkbench: 'xenesis-desk.core-tools.xenesis-agent-workbench',
  artifactLibrary: 'xenesis-desk.core-tools.artifact-library',
  terminalInspector: 'xenesis-desk.core-tools.terminal-inspector',
  processViewer: 'xenesis-desk.core-tools.process-viewer',
  remoteSyncPlanner: 'xenesis-desk.core-tools.remote-sync-planner',
  runTaskPanel: 'xenesis-desk.core-tools.run-task-panel',
  safeFileEditCenter: 'xenesis-desk.core-tools.safe-file-edit-center',
  xenesisAgent: 'xenesis-desk.core-tools.xenesis-agent',
  hermesStatus: 'xenesis-desk.core-tools.hermes-status',
  hermesActionInbox: 'xenesis-desk.core-tools.hermes-action-inbox',
  capabilityExplorer: 'xenesis-desk.core-tools.capability-explorer',
  hermesTimeline: 'xenesis-desk.core-tools.hermes-timeline',
  hermesStashOps: 'xenesis-desk.core-tools.hermes-stash-ops',
  xappPreview: 'xenesis-desk.core-tools.xapp-preview',
  activityTimeline: 'xenesis-desk.core-tools.activity-timeline',
  networkMonitor: 'xenesis-desk.core-tools.network-monitor',
  xdBlaster: 'xenesis-desk.core-tools.xd-blaster',
  auditLog: 'xenesis-desk.core-tools.audit-log',
  agentPerformance: 'xenesis-desk.core-tools.agent-performance',
  memoryDashboard: 'xenesis-desk.core-tools.memory-dashboard',
} as const satisfies Record<string, ExtensionTool>;

function isXconPath(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/\\/g, '/');
  return [
    '.xcon',
    '.xconj',
    '.xconx',
    '.xcont',
    '.xcons',
    '.xcon.json',
    '.xcon.xml',
    '.xcon.tagless',
    '.xcon.sketch',
    '.sketch',
  ].some((ext) => normalized.endsWith(ext));
}

function isXconEntry(entry: FsEntry): boolean {
  if (entry.isDirectory) return false;
  return isXconPath(entry.path) || isXconPath(entry.name) || isXconPath(`file.${entry.ext}`);
}

function focusExistingContent(engine: DockEngine, contentType: string): boolean {
  for (const [id, content] of engine.contents) {
    if (content.contentType !== contentType) continue;
    if (content.state === 'hidden') {
      engine.restoreHiddenContent(id);
      return true;
    }
    for (const pane of engine.panes.values()) {
      if (!pane.contents.includes(id)) continue;
      if (pane.activeContentId !== id) {
        pane.activeContentId = id;
        engine.notify();
      }
      return true;
    }
  }
  return false;
}

function focusExistingBotContent(engine: DockEngine, sessionId: string): boolean {
  for (const [id, content] of engine.contents) {
    if (content.contentType !== 'xenesis-bot') continue;
    if ((content.botSessionId || 'xenesis-bot') !== sessionId) continue;
    for (const pane of engine.panes.values()) {
      if (!pane.contents.includes(id)) continue;
      if (pane.activeContentId !== id) {
        pane.activeContentId = id;
        engine.notify();
      }
      return true;
    }
  }
  return false;
}

function hasExistingBotContent(engine: DockEngine, sessionId: string): boolean {
  for (const content of engine.contents.values()) {
    if (content.contentType !== 'xenesis-bot') continue;
    if ((content.botSessionId || 'xenesis-bot') === sessionId) return true;
  }
  return false;
}

function xamongCodeChatContent(t: TFunc): DockContentOptions {
  return {
    id: `xamong-chat-${crypto.randomUUID()}`,
    title: t('app.xamongCodeLabel'),
    titleKey: 'app.xamongCodeLabel',
    state: 'document',
    html: '',
    contentType: 'xamong-chat',
  };
}

function xenisBotContent(_t: TFunc, event?: Partial<McpBridgeBotEvent> & { sessionId?: string }): DockContentOptions {
  const sessionId = event?.sessionId || 'xenesis-bot';
  return {
    id: `xenesis-bot-${sessionId}-${crypto.randomUUID()}`,
    title: event?.title || 'Xenesis Bot',
    state: 'document',
    html: '',
    contentType: 'xenesis-bot',
    botSessionId: sessionId,
    botInputUrl: event?.inputUrl,
    botSource: event?.source,
    botChannel: event?.channel,
  };
}

function aiWorkbenchContent(): DockContentOptions {
  return {
    id: `xd-ai-workbench-${crypto.randomUUID()}`,
    title: 'AI Workbench',
    state: 'document',
    html: '',
    contentType: 'xd-ai-workbench',
  };
}

function xenesisAgentWorkbenchContent(): DockContentOptions {
  return {
    id: `xd-xenesis-agent-workbench-${crypto.randomUUID()}`,
    title: 'Xenesis Agent Workbench',
    state: 'document',
    html: '',
    contentType: 'xd-xenesis-agent-workbench',
  };
}

function artifactLibraryContent(): DockContentOptions {
  return {
    id: `xd-artifact-library-${crypto.randomUUID()}`,
    title: 'Artifact Library',
    state: 'document',
    html: '',
    contentType: 'xd-artifact-library',
  };
}

function terminalInspectorContent(): DockContentOptions {
  return {
    id: `xd-terminal-inspector-${crypto.randomUUID()}`,
    title: 'Terminal Inspector',
    state: 'document',
    html: '',
    contentType: 'xd-terminal-inspector',
  };
}

function processViewerContent(): DockContentOptions {
  return {
    id: `xd-process-viewer-${crypto.randomUUID()}`,
    title: 'Process Viewer',
    state: 'document',
    html: '',
    contentType: 'xd-process-viewer',
  };
}

function remoteSyncPlannerContent(): DockContentOptions {
  return {
    id: `xd-remote-sync-planner-${crypto.randomUUID()}`,
    title: 'Remote Sync Planner',
    state: 'document',
    html: '',
    contentType: 'xd-remote-sync-planner',
  };
}

function runTaskPanelContent(): DockContentOptions {
  return {
    id: `xd-run-task-panel-${crypto.randomUUID()}`,
    title: 'Run Task Panel',
    state: 'document',
    html: '',
    contentType: 'xd-run-task-panel',
  };
}

function safeFileEditCenterContent(): DockContentOptions {
  return {
    id: `xd-safe-file-edit-center-${crypto.randomUUID()}`,
    title: 'Safe File Edit Center',
    state: 'document',
    html: '',
    contentType: 'xd-safe-file-edit-center',
  };
}

function xdBlasterContent(): DockContentOptions {
  return {
    id: `xd-blaster-${crypto.randomUUID()}`,
    title: 'XD Blaster',
    state: 'document',
    html: '',
    contentType: 'xd-blaster',
  };
}

function xenesisAgentContent(): DockContentOptions {
  return {
    id: XENESIS_AGENT_CONTENT_ID,
    title: 'Xenesis Agent',
    state: 'right',
    html: '',
    hideOnClose: true,
    contentType: 'xenesis-agent',
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function selectXenesisAgentId(requestedAgentId?: string): string {
  const bridge = window.__xenesisDeskAgentBridge;
  const agents = bridge?.listAgents?.() ?? bridge?.list?.() ?? [];
  const requested = requestedAgentId?.trim();
  if (requested && agents.some((agent) => agent.agentId === requested || agent.id === requested)) {
    return requested;
  }
  const defaultAgentId = `xenis-${XENESIS_AGENT_CONTENT_ID}`;
  return (
    agents.find((agent) => agent.agentId === defaultAgentId || agent.id === defaultAgentId)?.agentId ??
    agents[0]?.agentId ??
    ''
  );
}

async function waitForXenesisAgentId(requestedAgentId?: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const agentId = selectXenesisAgentId(requestedAgentId);
    if (agentId) return agentId;
    await wait(50);
  }
  return '';
}

function hermesStatusContent(): DockContentOptions {
  return {
    id: `hermes-status-${crypto.randomUUID()}`,
    title: 'Hermes Status',
    state: 'document',
    html: '',
    contentType: 'hermes-status',
  };
}

function hermesActionInboxContent(): DockContentOptions {
  return {
    id: `hermes-action-inbox-${crypto.randomUUID()}`,
    title: 'Action Inbox',
    state: 'document',
    html: '',
    contentType: 'hermes-action-inbox',
  };
}

function capabilityExplorerContent(): DockContentOptions {
  return {
    id: `capability-explorer-${crypto.randomUUID()}`,
    title: 'Capability Explorer',
    state: 'document',
    html: '',
    contentType: 'capability-explorer',
  };
}

function hermesTimelineContent(): DockContentOptions {
  return {
    id: `hermes-timeline-${crypto.randomUUID()}`,
    title: 'Hermes Timeline',
    state: 'document',
    html: '',
    contentType: 'hermes-timeline',
  };
}

function hermesStashOpsContent(): DockContentOptions {
  return {
    id: `hermes-stash-ops-${crypto.randomUUID()}`,
    title: 'Hermes Stash Operations',
    state: 'document',
    html: '',
    contentType: 'hermes-stash-ops',
  };
}

function xappPreviewContent(t: TFunc, filePath?: string): DockContentOptions {
  return {
    id: `xapp-preview-${crypto.randomUUID()}`,
    title: t('app.previewLabel'),
    titleKey: 'app.previewLabel',
    state: 'document',
    html: '',
    contentType: 'xapp-preview',
    filePath,
  };
}

async function resolveXappPreviewPath(context: ExtensionToolOpenContext): Promise<string | undefined> {
  const currentBundle = context.getCurrentXappBundlePath();
  if (currentBundle) return currentBundle;

  if (context.explorerSelectedPath && !context.explorerSelectedIsDir && isXconPath(context.explorerSelectedPath)) {
    return context.explorerSelectedPath;
  }

  if (!context.defaultCwd) return undefined;
  try {
    const entries = await context.listDir(context.defaultCwd);
    return entries.find(isXconEntry)?.path;
  } catch {
    return undefined;
  }
}

const contribution: RendererExtensionContribution = {
  id: 'xenesis-desk.core-tools',

  async openTool(tool, context) {
    if (tool === TOOL_IDS.xamongCodeChat) {
      context.openContent(xamongCodeChatContent(context.t), context.requestedPlacement ?? 'tab');
      context.onStatus(context.t('app.xamongCodeChatOpened'));
      return true;
    }

    if (tool === TOOL_IDS.xenisBot) {
      context.openContent(xenisBotContent(context.t), context.requestedPlacement ?? 'tab');
      context.onStatus('Xenesis Bot opened');
      return true;
    }

    if (tool === TOOL_IDS.aiWorkbench) {
      if (!focusExistingContent(context.engine, 'xd-ai-workbench')) {
        context.openContent(aiWorkbenchContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('AI Workbench opened');
      return true;
    }

    if (tool === TOOL_IDS.xenesisAgentWorkbench) {
      if (!focusExistingContent(context.engine, 'xd-xenesis-agent-workbench')) {
        context.openContent(xenesisAgentWorkbenchContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Xenesis Agent Workbench opened');
      return true;
    }

    if (tool === TOOL_IDS.artifactLibrary) {
      if (!focusExistingContent(context.engine, 'xd-artifact-library')) {
        context.openContent(artifactLibraryContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Artifact Library opened');
      return true;
    }

    if (tool === TOOL_IDS.terminalInspector) {
      if (!focusExistingContent(context.engine, 'xd-terminal-inspector')) {
        context.openContent(terminalInspectorContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Terminal Inspector opened');
      return true;
    }

    if (tool === TOOL_IDS.processViewer) {
      if (!focusExistingContent(context.engine, 'xd-process-viewer')) {
        context.openContent(processViewerContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Process Viewer opened');
      return true;
    }

    if (tool === TOOL_IDS.remoteSyncPlanner) {
      if (!focusExistingContent(context.engine, 'xd-remote-sync-planner')) {
        context.openContent(remoteSyncPlannerContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Remote Sync Planner opened');
      return true;
    }

    if (tool === TOOL_IDS.runTaskPanel) {
      if (!focusExistingContent(context.engine, 'xd-run-task-panel')) {
        context.openContent(runTaskPanelContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Run Task Panel opened');
      return true;
    }

    if (tool === TOOL_IDS.safeFileEditCenter) {
      if (!focusExistingContent(context.engine, 'xd-safe-file-edit-center')) {
        context.openContent(safeFileEditCenterContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Safe File Edit Center opened');
      return true;
    }

    if (tool === TOOL_IDS.xenesisAgent) {
      if (!focusExistingContent(context.engine, 'xenesis-agent')) {
        context.openContent(xenesisAgentContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Xenesis Agent opened');
      return true;
    }

    if (tool === TOOL_IDS.hermesStatus) {
      if (!focusExistingContent(context.engine, 'hermes-status')) {
        context.openContent(hermesStatusContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Hermes Status opened');
      return true;
    }

    if (tool === TOOL_IDS.hermesActionInbox) {
      if (!focusExistingContent(context.engine, 'hermes-action-inbox')) {
        context.openContent(hermesActionInboxContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Action Inbox opened');
      return true;
    }

    if (tool === TOOL_IDS.capabilityExplorer) {
      if (!focusExistingContent(context.engine, 'capability-explorer')) {
        context.openContent(capabilityExplorerContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Capability Explorer opened');
      return true;
    }

    if (tool === TOOL_IDS.hermesTimeline) {
      if (!focusExistingContent(context.engine, 'hermes-timeline')) {
        context.openContent(hermesTimelineContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Hermes Timeline opened');
      return true;
    }

    if (tool === TOOL_IDS.hermesStashOps) {
      if (!focusExistingContent(context.engine, 'hermes-stash-ops')) {
        context.openContent(hermesStashOpsContent(), context.requestedPlacement ?? 'tab');
      }
      context.onStatus('Hermes Stash Operations opened');
      return true;
    }

    if (tool === TOOL_IDS.activityTimeline) {
      context.openContent(
        {
          id: `activity-timeline-${crypto.randomUUID()}`,
          title: 'Activity Timeline',
          titleKey: 'app.activityTimeline',
          state: 'document',
          html: '',
          contentType: 'activity-timeline',
        },
        context.requestedPlacement ?? 'tab',
      );
      context.onStatus('Activity Timeline opened');
      return true;
    }

    if (tool === TOOL_IDS.networkMonitor) {
      context.openContent(
        {
          id: `network-monitor-${crypto.randomUUID()}`,
          title: 'Network Monitor',
          titleKey: 'app.networkMonitor',
          state: 'document',
          html: '',
          contentType: 'network-monitor',
        },
        context.requestedPlacement ?? 'tab',
      );
      context.onStatus('Network Monitor opened');
      return true;
    }

    if (tool === TOOL_IDS.xdBlaster) {
      context.openContent(xdBlasterContent(), context.requestedPlacement ?? 'tab');
      context.onStatus('XD Blaster opened');
      return true;
    }

    if (tool === TOOL_IDS.auditLog) {
      context.openContent(
        {
          id: `audit-log-${crypto.randomUUID()}`,
          title: 'Audit Log',
          titleKey: 'app.auditLog',
          state: 'document',
          html: '',
          contentType: 'audit-log',
        },
        context.requestedPlacement ?? 'tab',
      );
      context.onStatus('Audit Log opened');
      return true;
    }

    if (tool === TOOL_IDS.agentPerformance) {
      context.openContent(
        {
          id: `agent-performance-${crypto.randomUUID()}`,
          title: 'Agent Performance',
          titleKey: 'app.agentPerformance',
          state: 'document',
          html: '',
          contentType: 'agent-performance',
        },
        context.requestedPlacement ?? 'tab',
      );
      context.onStatus('Agent Performance opened');
      return true;
    }

    if (tool === TOOL_IDS.memoryDashboard) {
      if (!focusExistingContent(context.engine, 'memory-dashboard')) {
        context.openContent(
          {
            id: `memory-dashboard-${crypto.randomUUID()}`,
            title: 'Memory Dashboard',
            state: 'document',
            html: '',
            contentType: 'memory-dashboard',
          },
          context.requestedPlacement ?? 'tab',
        );
      }
      context.onStatus('Memory Dashboard opened');
      return true;
    }

    if (tool === TOOL_IDS.xappPreview) {
      const filePath = await resolveXappPreviewPath(context);
      context.openContent(xappPreviewContent(context.t, filePath), context.requestedPlacement ?? 'tab');
      context.onStatus(context.t('app.appPreviewOpened'));
      return true;
    }

    return false;
  },

  useEvents(context) {
    useEffect(() => {
      void hydrateXenisBotSessions();
    }, []);

    useEffect(() => {
      const unsubscribe = window.mcpBridgeAPI?.onBotEvent((payload) => {
        recordXenisBotEvent(payload);
        if (hasExistingBotContent(context.engine, payload.sessionId)) return;
        context.engine.addContentWithPlacement(xenisBotContent(context.t, payload), payload.placement);
      });
      return () => unsubscribe?.();
    }, [context.engine, context.t]);

    useEffect(() => {
      const handler = (event: Event) => {
        void (async () => {
          const detail = (event as CustomEvent<XenesisAgentCommandDetail>).detail;
          const text = typeof detail?.text === 'string' ? detail.text.trim() : '';
          if (!text) return;

          if (!focusExistingContent(context.engine, 'xenesis-agent')) {
            context.engine.addContentWithPlacement(xenesisAgentContent(), detail?.placement ?? 'right');
          }

          const agentId = await waitForXenesisAgentId(detail?.agentId);
          const bridge = window.__xenesisDeskAgentBridge;
          if (!agentId || !bridge) {
            context.onStatus('Xenesis Agent is not ready to receive context.');
            return;
          }

          const result = await bridge.submitMessage(agentId, text);
          if (!result.ok) {
            context.onStatus(`Xenesis Agent command failed: ${result.error || 'unknown error'}`);
            return;
          }
          context.onStatus('Xenesis Agent command sent');
        })();
      };
      window.addEventListener(XENESIS_AGENT_COMMAND_EVENT, handler);
      return () => window.removeEventListener(XENESIS_AGENT_COMMAND_EVENT, handler);
    }, [context.engine, context.onStatus]);

    useEffect(() => {
      const handler = (event: Event) => {
        const detail = (event as CustomEvent<{ sessionId?: string; messageId?: string }>).detail;
        const sessionId =
          typeof detail?.sessionId === 'string' && detail.sessionId.trim() ? detail.sessionId.trim() : 'xenesis-bot';
        const messageId = typeof detail?.messageId === 'string' ? detail.messageId.trim() : '';
        if (!messageId) return;

        if (!focusExistingBotContent(context.engine, sessionId)) {
          context.engine.addContent(xenisBotContent(context.t, { sessionId }));
        }
        window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('xenesis-bot-highlight-message', {
              detail: { sessionId, messageId },
            }),
          );
        }, 0);
        context.onStatus('Xenesis Bot message opened');
      };
      window.addEventListener('xenesis-bot-focus-message', handler);
      return () => window.removeEventListener('xenesis-bot-focus-message', handler);
    }, [context.engine, context.onStatus, context.t]);

    useEffect(() => {
      const handler = (event: Event) => {
        const detail = (event as CustomEvent<{ sessionId?: string; text?: string }>).detail;
        const sessionId =
          typeof detail?.sessionId === 'string' && detail.sessionId.trim() ? detail.sessionId.trim() : 'xenesis-bot';
        const text = typeof detail?.text === 'string' ? detail.text.trim() : '';
        if (!text) return;

        if (!focusExistingBotContent(context.engine, sessionId)) {
          context.engine.addContent(xenisBotContent(context.t, { sessionId }));
        }
        window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('xenesis-bot-run-command', {
              detail: { sessionId, text },
            }),
          );
        }, 0);
        context.onStatus('Xenesis Bot command sent');
      };
      window.addEventListener('xenesis-bot-command', handler);
      return () => window.removeEventListener('xenesis-bot-command', handler);
    }, [context.engine, context.onStatus, context.t]);

    useEffect(() => {
      const handler = (event: Event) => {
        const bundlePath = (event as CustomEvent<{ bundlePath?: string }>).detail?.bundlePath;
        if (typeof bundlePath !== 'string' || !bundlePath) return;

        if (focusExistingContent(context.engine, 'xapp-preview')) return;
        context.engine.addContent(xappPreviewContent(context.t, bundlePath));
      };
      window.addEventListener('xapp-bundle-ready', handler);
      return () => window.removeEventListener('xapp-bundle-ready', handler);
    }, [context.engine, context.t]);

    useEffect(() => {
      const handler = (event: Event) => {
        const projectPath = (event as CustomEvent<{ projectPath?: string }>).detail?.projectPath;
        if (typeof projectPath !== 'string' || !projectPath) return;
        context.setDefaultCwd(projectPath);
        context.setExplorerOpen(true);
        context.setExplorerSelectedPath(projectPath);
        context.setExplorerSelectedIsDir(true);
        window.dispatchEvent(new CustomEvent('workspace-changed', { detail: { path: projectPath } }));
        context.onStatus(context.t('app.appFolderRevealed'));
      };
      window.addEventListener('xapp-project-ready', handler);
      return () => window.removeEventListener('xapp-project-ready', handler);
    }, [
      context.onStatus,
      context.setDefaultCwd,
      context.setExplorerOpen,
      context.setExplorerSelectedIsDir,
      context.setExplorerSelectedPath,
      context.t,
    ]);
  },

  renderContent(content: DockContent) {
    if (content.contentType === 'xenesis-bot') {
      return (
        <XenisBotPane
          sessionId={content.botSessionId}
          inputUrl={content.botInputUrl}
          source={content.botSource}
          channel={content.botChannel}
        />
      );
    }
    if (content.contentType === 'xd-ai-workbench') {
      return <AiWorkbenchPane />;
    }
    if (content.contentType === 'xd-xenesis-agent-workbench') {
      return <XconAgentWorkbenchPane />;
    }
    if (content.contentType === 'xd-artifact-library') {
      return <ArtifactLibraryPane />;
    }
    if (content.contentType === 'xd-terminal-inspector') {
      return <TerminalInspectorPane />;
    }
    if (content.contentType === 'xd-process-viewer') {
      return <ProcessViewerPane />;
    }
    if (content.contentType === 'xd-remote-sync-planner') {
      return <RemoteSyncPlannerPane />;
    }
    if (content.contentType === 'xd-run-task-panel') {
      return <RunTaskPanel />;
    }
    if (content.contentType === 'xd-safe-file-edit-center') {
      return <SafeFileEditCenterPane />;
    }
    if (content.contentType === 'xenesis-agent') {
      return <XenesisAgentPane contentId={content.id} />;
    }
    if (content.contentType === 'xapp-preview') {
      return <XAppPreviewPane initialFilePath={content.filePath} />;
    }
    if (content.contentType === 'hermes-status') {
      return <HermesStatusPane />;
    }
    if (content.contentType === 'hermes-action-inbox') {
      return <ActionInboxPane />;
    }
    if (content.contentType === 'capability-explorer') {
      return <CapabilityExplorerPane />;
    }
    if (content.contentType === 'hermes-timeline') {
      return <HermesTimelinePane />;
    }
    if (content.contentType === 'hermes-stash-ops') {
      return <HermesStashOpsPane />;
    }
    if (content.contentType === 'xamong-chat') {
      return <XamongCodeChatPane />;
    }
    if (content.contentType === 'activity-timeline') {
      return <ActivityTimelinePane />;
    }
    if (content.contentType === 'network-monitor') {
      return <NetworkMonitorPane />;
    }
    if (content.contentType === 'xd-blaster') {
      return <XdBlasterPane />;
    }
    if (content.contentType === 'audit-log') {
      return <AuditLogPane />;
    }
    if (content.contentType === 'agent-performance') {
      return <AgentPerformancePane />;
    }
    if (content.contentType === 'memory-dashboard') {
      return <MemoryDashboardPane />;
    }
    return null;
  },

  getContentIcon(contentType) {
    const icons: Record<string, string> = {
      'xamong-chat': 'X',
      'xenesis-bot': 'B',
      'xd-ai-workbench': 'AI',
      'xd-xenesis-agent-workbench': '◇',
      'xd-artifact-library': 'L',
      'xd-terminal-inspector': 'T',
      'xd-process-viewer': 'P',
      'xd-remote-sync-planner': 'S',
      'xd-run-task-panel': 'R',
      'xd-safe-file-edit-center': 'E',
      'xenesis-agent': 'XG',
      'hermes-status': 'H',
      'hermes-action-inbox': 'A',
      'capability-explorer': 'C',
      'hermes-timeline': 'T',
      'hermes-stash-ops': 'S',
      'xapp-preview': 'P',
      'activity-timeline': 'TL',
      'network-monitor': 'N',
      'xd-blaster': 'XB',
      'audit-log': 'AU',
      'agent-performance': 'AP',
      'memory-dashboard': 'MD',
    };
    return icons[contentType];
  },

  isViewerContentType(contentType) {
    return (
      contentType === 'xamong-chat' ||
      contentType === 'xenesis-bot' ||
      contentType === 'xapp-preview' ||
      contentType === 'hermes-status' ||
      contentType === 'xd-ai-workbench' ||
      contentType === 'xd-xenesis-agent-workbench' ||
      contentType === 'xd-artifact-library' ||
      contentType === 'xd-terminal-inspector' ||
      contentType === 'xd-process-viewer' ||
      contentType === 'xd-remote-sync-planner' ||
      contentType === 'xd-run-task-panel' ||
      contentType === 'xd-safe-file-edit-center' ||
      contentType === 'xenesis-agent' ||
      contentType === 'hermes-action-inbox' ||
      contentType === 'capability-explorer' ||
      contentType === 'hermes-timeline' ||
      contentType === 'hermes-stash-ops' ||
      contentType === 'activity-timeline' ||
      contentType === 'network-monitor' ||
      contentType === 'xd-blaster' ||
      contentType === 'audit-log' ||
      contentType === 'agent-performance' ||
      contentType === 'memory-dashboard'
    );
  },
};

export default contribution;
