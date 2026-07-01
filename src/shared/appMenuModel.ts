import {
  canUseXenisPhase5XamongCodeCommand,
  filterXenisPhase5ExtensionCommands,
  isXenisPhase5Visible,
  type XenisPhase5VisibilityOptions,
} from './phase5';
import type { ExtensionCommandDescriptor } from './types';
import { XENESIS_TUI_CAPABILITY_PATH } from './xenesisTui';

export type AppMenuActionId =
  | 'new-terminal'
  | 'open-xenesis-tui'
  | 'new-browser'
  | 'open-file'
  | 'open-command-center'
  | 'open-window-sizer'
  | 'arrange-horizontal'
  | 'arrange-vertical'
  | 'arrange-grid'
  | 'toggle-pane-inspector'
  | 'open-ai-provider-settings'
  | 'open-gateway-control'
  | 'open-bot-channels'
  | 'open-automation-monitor'
  | 'open-automation-settings'
  | 'open-terminal-inspector'
  | 'open-extensions-settings'
  | 'open-developer-settings'
  | 'open-onboarding'
  | 'open-diagnostics'
  | 'open-settings';

export type AppMenuNode = AppMenuGroupNode | AppMenuCommandNode | AppMenuActionNode | AppMenuSeparatorNode;

export interface AppMenuBaseNode {
  id: string;
  label: string;
  labelKey?: string;
  icon?: string;
  phase5Only?: boolean;
}

export interface AppMenuGroupNode extends AppMenuBaseNode {
  kind: 'group';
  children: AppMenuNode[];
  separatorBefore?: boolean;
  dynamicExtensions?: boolean;
  native?: boolean;
  emptyLabel?: string;
  emptyLabelKey?: string;
}

export interface AppMenuCommandNode extends AppMenuBaseNode {
  kind: 'command';
  commandId: string;
  native?: boolean;
}

export interface AppMenuActionNode extends AppMenuBaseNode {
  kind: 'action';
  actionId: AppMenuActionId;
  native?: boolean;
  capabilityPath?: string;
}

export interface AppMenuSeparatorNode {
  kind: 'separator';
  id: string;
}

export interface ResolvedRendererMenuCommand {
  kind: 'command';
  command: ExtensionCommandDescriptor;
  spec: AppMenuCommandNode;
}

export interface ResolvedRendererMenuAction {
  kind: 'action';
  spec: AppMenuActionNode;
}

export type ResolvedRendererMenuItem = ResolvedRendererMenuCommand | ResolvedRendererMenuAction;

export interface ResolvedRendererMenuGroup {
  id: string;
  label: string;
  labelKey?: string;
  icon?: string;
  separatorBefore?: boolean;
  emptyLabel?: string;
  emptyLabelKey?: string;
  items: ResolvedRendererMenuItem[];
}

export interface ResolvedRendererToolsMenu {
  primary: ResolvedRendererMenuItem[];
  groups: ResolvedRendererMenuGroup[];
}

export interface NativeAppMenuItem {
  id: string;
  groupId: string;
  label: string;
  labelKey?: string;
  icon?: string;
  commandId?: string;
  actionId?: AppMenuActionId;
}

export const INTERNAL_MENU_EXTENSION_IDS = new Set([
  'xenesis-desk.core-tools',
  'xenesis-desk.workflow-runner',
  'xenesis-desk.data-tools',
  'xenesis-desk.obsidian-vault',
]);

export const APP_MENU_MODEL: AppMenuGroupNode[] = [
  {
    kind: 'group',
    id: 'primary',
    label: 'Primary',
    labelKey: 'app.menuPrimary',
    native: false,
    children: [
      command(
        'xenesis-agent',
        'Xenesis Agent',
        'xenesis-desk.core-tools.openXenesisAgent',
        'app.toolsXenesisAgent',
        'xenesis-agent',
      ),
      command(
        'capability-explorer',
        'Capability Explorer',
        'xenesis-desk.core-tools.openCapabilityExplorer',
        undefined,
        'capability',
      ),
    ],
  },
  {
    kind: 'group',
    id: 'desk',
    label: 'Desk',
    labelKey: 'app.menuDesk',
    icon: 'desk',
    children: [
      action('new-terminal', 'New Terminal', 'new-terminal', 'app.terminalLabel', 'terminal'),
      action('new-browser', 'New Browser', 'new-browser', 'app.browserLabel', 'browser'),
      action('open-file', 'Open File', 'open-file', 'app.openFileLabel', 'file'),
      action('open-command-center', 'Command Center', 'open-command-center', 'app.menuCommandCenter', 'command-center'),
      separator('desk-layout-separator'),
      action('open-window-sizer', 'Window Size', 'open-window-sizer', 'app.windowSizerLabel', 'window-size'),
      action('arrange-horizontal', 'Arrange Horizontal', 'arrange-horizontal', 'app.alignHorizontalBtn', 'horizontal'),
      action('arrange-vertical', 'Arrange Vertical', 'arrange-vertical', 'app.alignVerticalBtn', 'vertical'),
      action('arrange-grid', 'Arrange Grid', 'arrange-grid', 'app.alignGridBtn', 'grid'),
      action('toggle-pane-inspector', 'Pane Inspect', 'toggle-pane-inspector', 'app.paneInspectLabel', 'inspect'),
    ],
  },
  {
    kind: 'group',
    id: 'xenesis',
    label: 'Xenesis',
    labelKey: 'app.menuXenesis',
    icon: 'xenesis',
    children: [
      command(
        'xenesis-agent',
        'Xenesis Agent',
        'xenesis-desk.core-tools.openXenesisAgent',
        'app.toolsXenesisAgent',
        'xenesis-agent',
      ),
      action('open-xenesis-tui', 'Xenesis TUI', 'open-xenesis-tui', undefined, 'tui', {
        capabilityPath: XENESIS_TUI_CAPABILITY_PATH,
      }),
      action(
        'open-ai-provider-settings',
        'AI Provider Settings',
        'open-ai-provider-settings',
        'settings.category.runModel',
        'ai',
      ),
      action('open-gateway-control', 'Gateway Control', 'open-gateway-control', 'app.menuGatewayControl', 'gateway'),
      command('xenesis-bot', 'Xenesis Bot', 'xenesis-desk.core-tools.openXenisBot', 'app.toolsXenisBot', 'bot'),
      action(
        'open-bot-channels',
        'External Bot Channels',
        'open-bot-channels',
        'app.menuExternalBotChannels',
        'channels',
      ),
      command(
        'xamong-code',
        'XamongCode',
        'xenesis-desk.core-tools.openXamongCode',
        'app.toolsXamongCode',
        'xamong-code',
        {
          phase5Only: true,
        },
      ),
    ],
  },
  {
    kind: 'group',
    id: 'automation',
    label: 'Automation',
    labelKey: 'app.menuAutomation',
    icon: 'automation',
    children: [
      action(
        'open-automation-monitor',
        'Automation Monitor',
        'open-automation-monitor',
        'monitor.topbarTitle',
        'monitor',
      ),
      action(
        'open-automation-settings',
        'Automation Settings',
        'open-automation-settings',
        'settings.category.automation',
        'settings',
      ),
      action('open-command-center', 'Command Center', 'open-command-center', 'app.menuCommandCenter', 'command-center'),
      command(
        'terminal-inspector',
        'Terminal Inspector',
        'xenesis-desk.core-tools.openTerminalInspector',
        undefined,
        'terminal-inspector',
      ),
    ],
  },
  {
    kind: 'group',
    id: 'gowoori',
    label: 'Gowoori',
    labelKey: 'app.toolsMenuGroupGowoori',
    icon: 'gowoori',
    children: [
      command('gowoori', 'Gowoori / geowooli', 'xenesis-desk.workflow-runner.openGowoori', undefined, 'mirror'),
      command(
        'gowoori-chat',
        'GowooriChat',
        'xenesis-desk.workflow-runner.openGowooriChat',
        undefined,
        'message-square',
      ),
      command('workflow-runner', 'Workflow Runner', 'xenesis-desk.workflow-runner.open', undefined, 'workflow'),
      command('alert-rules', 'Alert Rules', 'xenesis-desk.workflow-runner.openAlertRules', undefined, 'zap'),
      command(
        'template-catalog',
        'Template Catalog',
        'xenesis-desk.workflow-runner.openTemplateCatalog',
        undefined,
        'layout',
      ),
      command(
        'artifact-versions',
        'Artifact Versions',
        'xenesis-desk.workflow-runner.openArtifactVersions',
        undefined,
        'git-branch',
      ),
    ],
  },
  {
    kind: 'group',
    id: 'hermes',
    label: 'Hermes',
    labelKey: 'app.toolsMenuGroupHermes',
    icon: 'hermes',
    children: [
      command('hermes-status', 'Hermes Status', 'xenesis-desk.core-tools.openHermesStatus', undefined, 'status'),
      command(
        'hermes-timeline',
        'Hermes Timeline',
        'xenesis-desk.core-tools.openHermesTimeline',
        undefined,
        'timeline',
      ),
    ],
  },
  {
    kind: 'group',
    id: 'tools',
    label: 'Tools',
    labelKey: 'app.toolsMenuGroupTools',
    icon: 'tools',
    children: [
      command('ai-workbench', 'Xenesis Desk AI Workbench', 'xenesis-desk.core-tools.openAiWorkbench', undefined, 'ai'),
      command(
        'xenesis-agent-workbench',
        'Xenesis Agent Workbench',
        'xenesis-desk.core-tools.openXenesisAgentWorkbench',
        undefined,
        'xenesis-agent',
      ),
      command('action-inbox', 'Agent Approvals', 'xenesis-desk.core-tools.openAgentApprovals', undefined, 'inbox'),
      command(
        'artifact-library',
        'Artifact Library',
        'xenesis-desk.core-tools.openArtifactLibrary',
        undefined,
        'library',
      ),
      command('process-viewer', 'Process Viewer', 'xenesis-desk.core-tools.openProcessViewer', undefined, 'process'),
      command(
        'remote-sync-planner',
        'Remote Sync Planner',
        'xenesis-desk.core-tools.openRemoteSyncPlanner',
        undefined,
        'sync',
      ),
      command(
        'safe-file-edit-center',
        'Safe File Edit Center',
        'xenesis-desk.core-tools.openSafeFileEditCenter',
        undefined,
        'edit-safe',
      ),
      command('run-task-panel', 'Run Task Panel', 'xenesis-desk.core-tools.openRunTaskPanel', undefined, 'task'),
      command(
        'activity-timeline',
        'Activity Timeline',
        'xenesis-desk.core-tools.openActivityTimeline',
        undefined,
        'timeline',
      ),
      command('network-monitor', 'Network Monitor', 'xenesis-desk.core-tools.openNetworkMonitor', undefined, 'network'),
      command(
        'stash-operations',
        'Stash Operations',
        'xenesis-desk.core-tools.openStashOperations',
        undefined,
        'stash',
      ),
      command(
        'app-control-lab',
        'App Control Lab',
        'xenesis-desk.core-tools.openAppControlLab',
        undefined,
        'app-control',
      ),
      command(
        'agent-sessions',
        'Agent Sessions',
        'xenesis-desk.core-tools.openAgentSessions',
        undefined,
        'agent-sessions',
      ),
      command('xd-blaster', 'XD Blaster', 'xenesis-desk.core-tools.openXdBlaster', undefined, 'xd-blaster'),
      command('audit-log', 'Audit Log', 'xenesis-desk.core-tools.openAuditLog', undefined, 'audit'),
      command(
        'agent-performance',
        'Agent Performance',
        'xenesis-desk.core-tools.openAgentPerformance',
        undefined,
        'performance',
      ),
      command(
        'obsidian-vault-viewer',
        'Obsidian Vault Viewer',
        'xenesis-desk.obsidian-vault.openViewer',
        'app.toolsObsidianVault',
        'vault',
      ),
    ],
  },
  {
    kind: 'group',
    id: 'extensions',
    label: 'Extensions',
    labelKey: 'app.toolsMenuGroupExtensions',
    icon: 'extension',
    dynamicExtensions: true,
    native: false,
    emptyLabel: 'No extension commands',
    emptyLabelKey: 'app.toolsMenuEmptyExtensions',
    children: [],
  },
  {
    kind: 'group',
    id: 'lab',
    label: 'Lab',
    labelKey: 'app.toolsMenuGroupLab',
    icon: 'lab',
    children: [
      command(
        'meta-management',
        'Matrix / Meta Management',
        'xenesis-desk.data-tools.openMetaManagement',
        'app.toolsMeta',
        'meta',
      ),
      command(
        'demo-lab-editor',
        'Demo Lab Editor',
        'xenesis-desk.workflow-runner.openDemoLabMaker',
        'app.toolsMenuDemoLabEditor',
        'edit',
      ),
      command(
        'demo-lab-player',
        'Demo Lab Player',
        'xenesis-desk.workflow-runner.openDemoLabPlayer',
        undefined,
        'play',
      ),
    ],
  },
  {
    kind: 'group',
    id: 'developer',
    label: 'Developer',
    labelKey: 'app.toolsMenuGroupDeveloper',
    icon: 'developer',
    children: [
      command('preview', 'Preview', 'xenesis-desk.core-tools.openPreview', 'app.toolsPreview', 'preview'),
      command(
        'query-analyzer',
        'Query Analyzer',
        'xenesis-desk.data-tools.openQueryAnalyzer',
        'app.toolsQueryAnalyzer',
        'query',
      ),
      command(
        'query-analyzer-od',
        'Query Analyzer (OD)',
        'xenesis-desk.data-tools.openQueryAnalyzerOD',
        'app.toolsQueryAnalyzerOD',
        'query-od',
      ),
      command(
        'sqlite-server-settings',
        'SQLite Server Settings',
        'xenesis-desk.data-tools.openSqliteServerSettings',
        'settings.developerServerTitle',
        'sqlite',
      ),
    ],
  },
  {
    kind: 'group',
    id: 'help',
    label: 'Help',
    labelKey: 'app.menuHelp',
    icon: 'help',
    children: [
      action('open-onboarding', 'Start Xenesis Desk', 'open-onboarding', 'app.onboardingTitle', 'onboarding'),
      action('open-diagnostics', 'Diagnostics / Logs', 'open-diagnostics', 'app.diagnosticsCenter', 'diagnostics'),
      action('open-settings', 'Settings', 'open-settings', 'app.toolsSettings', 'settings'),
    ],
  },
];

function command(
  id: string,
  label: string,
  commandId: string,
  labelKey?: string,
  icon?: string,
  options: { phase5Only?: boolean } = {},
): AppMenuCommandNode {
  return { kind: 'command', id, label, labelKey, icon, commandId, ...options };
}

function action(
  id: AppMenuActionId,
  label: string,
  actionId: AppMenuActionId,
  labelKey?: string,
  icon?: string,
  options: { capabilityPath?: string } = {},
): AppMenuActionNode {
  return { kind: 'action', id, label, labelKey, icon, actionId, ...options };
}

function separator(id: string): AppMenuSeparatorNode {
  return { kind: 'separator', id };
}

export function collectAppMenuCommandIds(
  model: AppMenuGroupNode[] = APP_MENU_MODEL,
  options: XenisPhase5VisibilityOptions = {},
): string[] {
  const ids: string[] = [];
  walkMenu(
    model,
    (node) => {
      if (node.kind === 'command' && !ids.includes(node.commandId)) {
        ids.push(node.commandId);
      }
    },
    options,
  );
  return ids;
}

export function collectNativeAppMenuItems(
  model: AppMenuGroupNode[] = APP_MENU_MODEL,
  options: XenisPhase5VisibilityOptions = {},
): NativeAppMenuItem[] {
  const items: NativeAppMenuItem[] = [];
  for (const group of model) {
    if (!isMenuNodeVisible(group, options)) {
      continue;
    }
    if (group.native === false || group.dynamicExtensions) {
      continue;
    }
    walkMenu(
      group.children,
      (node) => {
        if (node.kind === 'command' && node.native !== false) {
          items.push({
            id: `${group.id}.${node.id}`,
            groupId: group.id,
            label: node.label,
            labelKey: node.labelKey,
            icon: node.icon,
            commandId: node.commandId,
          });
        }
        if (node.kind === 'action' && node.native !== false) {
          items.push({
            id: `${group.id}.${node.id}`,
            groupId: group.id,
            label: node.label,
            labelKey: node.labelKey,
            icon: node.icon,
            actionId: node.actionId,
          });
        }
      },
      options,
    );
  }
  return items;
}

export function resolveRendererToolsMenu(
  commands: ExtensionCommandDescriptor[],
  options: XenisPhase5VisibilityOptions = {},
): ResolvedRendererToolsMenu {
  const visibleCommands = filterXenisPhase5ExtensionCommands(commands, options);
  const commandById = new Map(visibleCommands.map((commandDescriptor) => [commandDescriptor.id, commandDescriptor]));
  const groupedIds = new Set(collectAppMenuCommandIds(APP_MENU_MODEL, options));
  const primaryGroup = APP_MENU_MODEL.find((group) => group.id === 'primary');
  const primary =
    primaryGroup && isMenuNodeVisible(primaryGroup, options)
      ? resolveRendererItems(primaryGroup, commandById, options)
      : [];
  const extensionCommands = visibleCommands
    .filter((commandDescriptor) => commandDescriptor.menuLocations.includes('tools'))
    .filter((commandDescriptor) => !INTERNAL_MENU_EXTENSION_IDS.has(commandDescriptor.extensionId))
    .filter((commandDescriptor) => !groupedIds.has(commandDescriptor.id));

  const groups = APP_MENU_MODEL.filter((group) => group.id !== 'primary')
    .filter((group) => isMenuNodeVisible(group, options))
    .map((group): ResolvedRendererMenuGroup => {
      const items = group.dynamicExtensions
        ? extensionCommands.map(
            (commandDescriptor): ResolvedRendererMenuCommand => ({
              kind: 'command',
              command: commandDescriptor,
              spec: {
                kind: 'command',
                id: commandDescriptor.id,
                label: commandDescriptor.title,
                labelKey: commandDescriptor.titleKey,
                icon: commandDescriptor.icon,
                commandId: commandDescriptor.id,
              },
            }),
          )
        : resolveRendererItems(group, commandById, options);
      return {
        id: group.id,
        label: group.label,
        labelKey: group.labelKey,
        icon: group.icon,
        separatorBefore: group.separatorBefore,
        emptyLabel: group.emptyLabel,
        emptyLabelKey: group.emptyLabelKey,
        items,
      };
    })
    .filter((group) => group.items.length > 0 || Boolean(group.emptyLabel));

  return { primary, groups };
}

function resolveRendererItems(
  group: AppMenuGroupNode,
  commandById: Map<string, ExtensionCommandDescriptor>,
  options: XenisPhase5VisibilityOptions = {},
): ResolvedRendererMenuItem[] {
  const items: ResolvedRendererMenuItem[] = [];
  for (const child of group.children) {
    if (!isMenuNodeVisible(child, options)) {
      continue;
    }
    if (child.kind === 'command') {
      const commandDescriptor = commandById.get(child.commandId);
      if (commandDescriptor && canUseXenisPhase5XamongCodeCommand(child.commandId, options)) {
        items.push({ kind: 'command', command: commandDescriptor, spec: child });
      }
    } else if (child.kind === 'action') {
      items.push({ kind: 'action', spec: child });
    }
  }
  return items;
}

function isMenuNodeVisible(node: AppMenuNode, options: XenisPhase5VisibilityOptions = {}): boolean {
  return node.kind === 'separator' || node.phase5Only !== true || isXenisPhase5Visible(options);
}

function walkMenu(
  nodes: AppMenuNode[],
  visitor: (node: AppMenuNode) => void,
  options: XenisPhase5VisibilityOptions = {},
): void {
  for (const node of nodes) {
    if (!isMenuNodeVisible(node, options)) {
      continue;
    }
    visitor(node);
    if (node.kind === 'group') {
      walkMenu(node.children, visitor, options);
    }
  }
}
